from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.company import Company
from app.models.github_project_scan import GitHubProjectScan
from app.models.job_drive import JobDrive
from app.models.student_profile import StudentProfile

logger = logging.getLogger(__name__)
MAX_REPOSITORIES_TO_INDEX = 5
REPOSITORIES_TO_README_RANK = 25
MAX_SOURCE_FILES = 80
MAX_SOURCE_CHARS = 120_000
MAX_FILE_CHARS = 30_000


def queue_github_scan_after_application(background_tasks, db: Session, student_id: int, job_drive_id: int) -> None:
    """Queue one student scan per UTC calendar month, and only from an application."""
    month_key = datetime.utcnow().strftime("%Y-%m")
    profile = db.scalar(select(StudentProfile).where(StudentProfile.student_id == student_id))
    scan = db.scalar(
        select(GitHubProjectScan)
        .where(GitHubProjectScan.student_id == student_id, GitHubProjectScan.month_key == month_key)
        .with_for_update()
    )

    retry_failed_scan = scan is not None and scan.status == "FAILED"
    if scan and scan.status != "NO_GITHUB_URL" and not retry_failed_scan:
        return

    if not profile or not (profile.github or "").strip():
        if scan is None:
            scan = GitHubProjectScan(
                student_id=student_id,
                job_drive_id=job_drive_id,
                month_key=month_key,
                status="NO_GITHUB_URL",
                error_code="GITHUB_PROFILE_MISSING",
                repositories=[],
            )
            db.add(scan)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
        return

    if scan is None:
        scan = GitHubProjectScan(
            student_id=student_id,
            job_drive_id=job_drive_id,
            month_key=month_key,
            status="QUEUED",
            repositories=[],
        )
        db.add(scan)
    else:
        scan.job_drive_id = job_drive_id
        scan.status = "QUEUED"
        scan.error_code = None
        scan.repositories = []
        scan.requested_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(scan)
    except IntegrityError:
        db.rollback()
        return

    background_tasks.add_task(run_github_project_scan, scan.id)


def _job_context(db: Session, job_drive: JobDrive) -> str:
    company = db.get(Company, job_drive.company_id)
    return "\n\n".join(part for part in [
        f"Role: {job_drive.title}",
        f"Company: {company.name}" if company else "",
        f"Job type: {job_drive.job_type or ''}",
        f"Location: {job_drive.location or ''}",
        f"Required skills: {job_drive.required_skills or ''}",
        f"Job description: {job_drive.description or ''}",
    ] if part)


def run_github_project_scan(scan_id: int) -> None:
    """Background worker. It is deliberately not exposed as a manual API action."""
    db = SessionLocal()
    try:
        scan = db.get(GitHubProjectScan, scan_id)
        if not scan or scan.status != "QUEUED":
            return
        scan.status = "RUNNING"
        scan.started_at = datetime.utcnow()
        student_id = scan.student_id
        job_drive_id = scan.job_drive_id
        db.commit()

        profile = db.scalar(select(StudentProfile).where(StudentProfile.student_id == student_id))
        job_drive = db.get(JobDrive, job_drive_id) if job_drive_id else None
        if not profile or not (profile.github or "").strip() or not job_drive:
            raise ValueError("SCAN_INPUT_UNAVAILABLE")
        github_profile_url = profile.github.strip()
        job_context = _job_context(db, job_drive)
    except Exception:
        logger.exception("Could not prepare GitHub project scan %s", scan_id)
        _finish_scan(scan_id, "FAILED", "SCAN_INPUT_UNAVAILABLE")
        return
    finally:
        db.close()

    try:
        repositories = asyncio.run(
            _scan_and_index_repositories(student_id, github_profile_url, job_context)
        )
        _finish_scan(scan_id, "COMPLETED", None, repositories)
    except Exception as exc:
        logger.exception("GitHub project scan %s failed", scan_id)
        _finish_scan(scan_id, "FAILED", type(exc).__name__[:80])


def _finish_scan(scan_id: int, status: str, error_code: str | None, repositories: list[dict[str, Any]] | None = None) -> None:
    db = SessionLocal()
    try:
        scan = db.get(GitHubProjectScan, scan_id)
        if not scan:
            return
        scan.status = status
        scan.error_code = error_code
        scan.repositories = repositories or []
        scan.completed_at = datetime.utcnow()
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Could not save GitHub project scan result %s", scan_id)
    finally:
        db.close()


async def _scan_and_index_repositories(student_id: int, github_profile_url: str, job_context: str) -> list[dict[str, Any]]:
    from app.ai.github.github_mcp_client import (
        collect_project_evidence,
        connect_to_github,
        extract_github_username,
        get_repository_readme,
        search_student_repositories,
    )
    from app.ai.github.repo_ranker import rank_repositories_for_job_context
    from app.ai.github.project_rag import (
        build_project_vector_store,
        format_retrieved_context,
        retrieve_project_context,
    )
    from app.ai.github.project_analyzer import analyze_project

    username = extract_github_username(github_profile_url)
    async with connect_to_github() as session:
        all_repositories = await search_student_repositories(session, username)
        if not all_repositories:
            return []

        preliminary = rank_repositories_for_job_context(
            job_context, all_repositories, top_k=REPOSITORIES_TO_README_RANK
        )
        for repository in preliminary:
            full_name = repository.get("full_name", "")
            if "/" not in full_name:
                continue
            owner, name = full_name.split("/", 1)
            repository["readme"] = (await get_repository_readme(
                session, owner, name, repository.get("default_branch")
            ))[:20_000]

        selected = rank_repositories_for_job_context(
            job_context, preliminary, top_k=MAX_REPOSITORIES_TO_INDEX
        )
        indexed: list[dict[str, Any]] = []
        for repository in selected:
            full_name = repository.get("full_name", "")
            if "/" not in full_name:
                continue
            owner, name = full_name.split("/", 1)
            collected = await collect_project_evidence(
                session,
                owner,
                name,
                repository.get("default_branch"),
                max_files=MAX_SOURCE_FILES,
                max_total_chars=MAX_SOURCE_CHARS,
                max_file_chars=MAX_FILE_CHARS,
            )
            evidence = collected.get("evidence", [])
            if not evidence:
                continue

            await asyncio.to_thread(
                build_project_vector_store,
                full_name,
                evidence,
                student_id,
                None,
            )
            relevant_chunks = await asyncio.to_thread(
                retrieve_project_context,
                full_name,
                job_context,
                8,
                student_id,
                None,
            )
            project_evidence = format_retrieved_context(relevant_chunks)
            analysis = await asyncio.to_thread(analyze_project, project_evidence, job_context)
            indexed.append({
                "repository": full_name,
                "url": repository.get("url") or f"https://github.com/{full_name}",
                "description": repository.get("description") or "",
                "language": repository.get("language") or "",
                "relevance_score": float(repository.get("relevance_score", 0.0)),
                "files_indexed": len(evidence),
                "analysis": analysis.model_dump(),
            })
        return indexed
