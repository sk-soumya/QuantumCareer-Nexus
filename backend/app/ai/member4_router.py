"""FastAPI surface for the Member 4 AI package.

Core endpoints are local/free:
- resume extraction with PDF/OCR + Qwen
- job parsing with Qwen
- semantic skill matching
- job recommendations
- readiness
- skill-gap preparation
- agentic career analysis
- scheduling/conflict detection
- placement analytics
- GitHub README/project analysis

GitHub MCP and external search remain optional integrations.
"""
from __future__ import annotations

import os
import re
import tempfile
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.ai.extraction.job_parser import extract_jobrole
from app.ai.schemas.job import JobProfile
from app.ai.schemas.job_match import JobMatchResult
from app.ai.schemas.resume_loader import load_resume
from app.ai.schemas.student_profile import StudentProfile, extract_resume
from app.ai.scheduling.models import PlacementEvent
from app.ai.scheduling.schemas import SchedulingRequest

try:
    from app.core.dependencies import get_current_user
    from app.database import get_db
    from app.models.user import User
    ROUTER_DEPENDENCIES = [Depends(get_current_user)]
except ImportError:
    User = object
    get_db = None
    # Keeps the package importable before it is merged into the full CampusLink
    # backend. The production integration script runs inside the real backend,
    # where app.core.dependencies is available.
    ROUTER_DEPENDENCIES = []

router = APIRouter(
    prefix="/ai/member4",
    tags=["Member 4 AI"],
    dependencies=ROUTER_DEPENDENCIES,
)


class JobParseRequest(BaseModel):
    job_description: str = Field(min_length=1)


class MatchRequest(BaseModel):
    student: StudentProfile
    job: JobProfile
    project_analysis: dict | None = None


class RecommendationRequest(BaseModel):
    student: StudentProfile
    jobs: List[JobProfile]


class ReadinessRequest(BaseModel):
    student: StudentProfile
    job: JobProfile
    project_analyses: List[dict] = Field(default_factory=list)


class PreparationRequest(BaseModel):
    job: JobProfile
    skill_gap: dict


class CareerAnalysisRequest(BaseModel):
    student: StudentProfile
    job: JobProfile
    project_analyses: List[dict] = Field(default_factory=list)
    placement_events: List[PlacementEvent] = Field(default_factory=list)
    student_events: List[PlacementEvent] = Field(default_factory=list)


class ConflictsRequest(BaseModel):
    events: List[PlacementEvent]


class AlternativesRequest(BaseModel):
    conflicted_event: PlacementEvent
    existing_events: List[PlacementEvent]
    duration_minutes: int = 60
    search_hours: int = 6


class AnalyticsRequest(BaseModel):
    job_matches: List[dict]
    readiness_result: dict | None = None
    skill_gap: dict | None = None


class ProjectAnalyzeRequest(BaseModel):
    project_data: str = Field(min_length=1)
    job_context: str = ""


class ProjectQNARequest(BaseModel):
    repository: str
    question: str
    evidence: List[dict] = Field(default_factory=list)
    job_context: str = ""


class RecruiterProjectAnalysisRequest(BaseModel):
    github_url: str = Field(min_length=1)
    job_context: str = ""


class RecruiterProjectQNARequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


def _owned_application(application_id: int, current_user: User, db):
    from app.models.application import Application
    from app.models.job_drive import JobDrive

    application = db.get(Application, application_id)
    drive = db.get(JobDrive, application.job_drive_id) if application else None
    if not application or not drive:
        raise HTTPException(status_code=404, detail="Application not found.")
    if current_user.role != "RECRUITER" or drive.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot access this application.")
    return application, drive

def _resume_suggestions(profile: StudentProfile) -> list[str]:
    suggestions: list[str] = []
    latest = profile.education[-1] if profile.education else None
    if not profile.skills:
        suggestions.append("Add your technical and professional skills.")
    elif len(profile.skills) < 4:
        suggestions.append("Add a few more relevant skills to improve recruiter visibility.")
    if latest is None:
        suggestions.append("Add your latest education details and CGPA when available.")
    if not profile.projects:
        suggestions.append("Add at least one strong project with technologies used.")
    if not profile.experience:
        suggestions.append("Add internship or work experience when available.")
    if not profile.certifications and not profile.achievements:
        suggestions.append("Add relevant certifications or achievements.")
    return suggestions


# Skills are listed only when their complete names appear in extracted resume text.
# The catalogue covers multiple engineering branches so electrical resumes are not
# forced through a software-only skill list.
SKILL_ALIASES: list[tuple[str, tuple[str, ...]]] = [
    ("AutoCAD Electrical", ("autocad electrical",)), ("Power Systems", ("power systems",)),
    ("Power Electronics", ("power electronics",)), ("Electrical Wiring", ("electrical wiring",)),
    ("Circuit Analysis", ("circuit analysis",)), ("Electrical Machines", ("electrical machines",)),
    ("Electrical Design", ("electrical design",)), ("Electrical Testing", ("electrical testing",)),
    ("Control Systems", ("control systems",)), ("Protection Relays", ("protection relays", "protective relays")),
    ("Relay Coordination", ("relay coordination",)), ("Switchgear", ("switchgear",)),
    ("Substation", ("substation", "substations")), ("High Voltage", ("high voltage",)),
    ("Transformers", ("transformer", "transformers")), ("Circuit Breakers", ("circuit breaker", "circuit breakers")),
    ("Power Generation", ("power generation",)), ("Power Transmission", ("power transmission",)),
    ("Power Distribution", ("power distribution",)), ("Renewable Energy", ("renewable energy",)),
    ("Solar PV", ("solar pv", "solar photovoltaic")), ("Battery Management System", ("battery management system", "battery management systems")),
    ("PCB Design", ("pcb design", "printed circuit board design")), ("PLC Programming", ("plc programming", "programmable logic controller")),
    ("PLC", ("plc",)), ("SCADA", ("scada",)), ("ETAP", ("etap",)), ("EPLAN", ("eplan",)),
    ("MATLAB", ("matlab",)), ("Simulink", ("simulink",)), ("Proteus", ("proteus",)),
    ("Multisim", ("multisim",)), ("LTspice", ("ltspice",)), ("PSpice", ("pspice",)),
    ("Embedded C", ("embedded c",)), ("Microcontrollers", ("microcontroller", "microcontrollers")),
    ("Arduino", ("arduino",)), ("ESP32", ("esp32",)), ("Raspberry Pi", ("raspberry pi",)),
    ("Digital Electronics", ("digital electronics",)), ("Analog Electronics", ("analog electronics",)),
    ("Verilog", ("verilog",)), ("VHDL", ("vhdl",)), ("VLSI", ("vlsi",)),
    ("Instrumentation", ("instrumentation",)), ("Industrial Automation", ("industrial automation",)),
    ("Sensors", ("sensors", "sensor interfacing")), ("IoT", ("iot", "internet of things")),
    ("Embedded Systems", ("embedded systems",)), ("Electrical Maintenance", ("electrical maintenance",)),
    ("Earthing", ("earthing",)), ("Grounding", ("grounding",)), ("Motor Control", ("motor control",)),
    ("Power Factor Correction", ("power factor correction",)), ("Electric Motors", ("electric motors", "induction motors")),
    ("Generators", ("generators", "generator testing")),
    ("SolidWorks", ("solidworks",)), ("AutoCAD", ("autocad",)), ("Fusion 360", ("fusion 360",)),
    ("CATIA", ("catia",)), ("Creo", ("creo",)), ("ANSYS Fluent", ("ansys fluent",)),
    ("ANSYS Mechanical", ("ansys mechanical",)), ("Computational Fluid Dynamics", ("computational fluid dynamics",)),
    ("CFD", ("cfd",)), ("Finite Element Analysis", ("finite element analysis",)), ("FEA", ("fea",)),
    ("Thermodynamics", ("thermodynamics",)), ("Heat Transfer", ("heat transfer",)), ("Fluid Mechanics", ("fluid mechanics",)),
    ("Machine Design", ("machine design",)), ("CNC Machining", ("cnc machining",)), ("GD&T", ("gd&t",)),
    ("3D Printing", ("3d printing",)), ("Manufacturing Processes", ("manufacturing processes",)),
    ("Casting", ("casting",)), ("Welding", ("welding",)), ("Sheet Metal", ("sheet metal",)),
    ("HVAC", ("hvac",)), ("Refrigeration", ("refrigeration",)), ("Automotive Systems", ("automotive systems",)),
    ("AutoCAD Civil 3D", ("autocad civil 3d",)), ("Revit", ("revit",)), ("STAAD.Pro", ("staad pro", "staad.pro")),
    ("ETABS", ("etabs",)), ("Primavera P6", ("primavera p6",)), ("Quantity Surveying", ("quantity surveying",)),
    ("GIS", ("gis", "geographic information system")), ("Structural Analysis", ("structural analysis",)),
    ("Surveying", ("surveying",)), ("BIM", ("bim", "building information modeling", "building information modelling")),
    ("Construction Management", ("construction management",)),
    ("Python", ("python",)), ("Java", ("java",)), ("C++", ("c++",)), ("C#", ("c#",)),
    ("JavaScript", ("javascript",)), ("TypeScript", ("typescript",)), ("React", ("react",)),
    ("Next.js", ("next.js",)), ("Node.js", ("node.js",)), ("Express", ("express.js", "express")),
    ("SQL", ("sql",)), ("MySQL", ("mysql",)), ("PostgreSQL", ("postgresql",)), ("MongoDB", ("mongodb",)),
    ("Redis", ("redis",)), ("Git", ("git",)), ("GitHub", ("github",)), ("Docker", ("docker",)),
    ("Kubernetes", ("kubernetes",)), ("AWS", ("aws",)), ("Azure", ("azure",)), ("GCP", ("gcp",)),
    ("HTML", ("html",)), ("CSS", ("css",)), ("Tailwind", ("tailwind",)), ("FastAPI", ("fastapi",)),
    ("Django", ("django",)), ("Flask", ("flask",)), ("Spring", ("spring framework", "spring boot")),
    ("Kotlin", ("kotlin",)), ("Flutter", ("flutter",)), ("TensorFlow", ("tensorflow",)),
    ("PyTorch", ("pytorch",)), ("Machine Learning", ("machine learning",)), ("Deep Learning", ("deep learning",)),
    ("NLP", ("nlp", "natural language processing")), ("Computer Vision", ("computer vision",)),
    ("REST API", ("rest api", "rest apis")), ("GraphQL", ("graphql",)), ("Figma", ("figma",)),
    ("Power BI", ("power bi",)), ("Tableau", ("tableau",)), ("Excel", ("excel", "microsoft excel", "ms excel")),
    ("Pandas", ("pandas",)), ("NumPy", ("numpy",)), ("Scikit-learn", ("scikit-learn", "scikit learn")),
    ("Linux", ("linux",)), ("Cybersecurity", ("cybersecurity",)), ("Networking", ("networking",)),
    ("API Testing", ("api testing",)), ("Selenium", ("selenium",)), ("Postman", ("postman",)),
    ("Firebase", ("firebase",)), ("Android Development", ("android development",)), ("LabVIEW", ("labview",)),
    ("Microsoft Office", ("microsoft office",)), ("Technical Documentation", ("technical documentation",)),
]


def _contains_skill(text: str, phrase: str) -> bool:
    lower = str(text or "").lower()
    escaped = re.escape(phrase.lower())
    # Non-alphanumeric boundaries avoid false hits like "java" in "javascript"
    # and "c" inside "electrical". A single C is not catalogued at all.
    return bool(re.search(rf"(?<![a-z0-9]){escaped}(?![a-z0-9])", lower, re.I))


def _extract_skills(resume_text: str) -> list[str]:
    text = str(resume_text or "")
    found: list[str] = []
    for canonical, aliases in SKILL_ALIASES:
        if any(_contains_skill(text, alias) for alias in aliases):
            if canonical.lower() not in {skill.lower() for skill in found}:
                found.append(canonical)
    return found


def _fallback_profile(resume_text: str) -> StudentProfile:
    """Return useful structured data even when Ollama/Qwen is unavailable."""
    text = resume_text.strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    email_match = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.I)
    phone_match = re.search(r"(?:\+?\d[\d\s().-]{8,}\d)", text)
    github_match = re.search(r"https?://(?:www\.)?github\.com/[A-Za-z0-9_.-]+/?", text, re.I)
    cgpa_match = re.search(r"(?:CGPA|C\.G\.P\.A|GPA)\s*[:=\-]?\s*(\d(?:\.\d{1,2})?)", text, re.I)
    grad_match = re.search(r"\b(20\d{2})\b", text)

    name = ""
    for line in lines[:8]:
        if email_match and email_match.group(0) in line:
            continue
        if re.search(r"resume|curriculum vitae|cv\b", line, re.I):
            continue
        if 1 < len(line.split()) <= 6 and not re.search(r"[:@|/\\]", line):
            name = line
            break
    name = name or (email_match.group(0).split("@")[0] if email_match else "Student")

    skills = _extract_skills(text)

    degree_line = next(
        (line for line in lines if re.search(r"\b(B\.?Tech|B\.?E|BSc|BCA|MCA|M\.?Tech|M\.?E|MBA|BBA|Bachelor|Master)\b", line, re.I)),
        "",
    )
    education = []
    if degree_line or cgpa_match or grad_match:
        education.append({
            "degree": degree_line[:180],
            "institution": "",
            "branch": "",
            "graduation_year": int(grad_match.group(1)) if grad_match else None,
            "cgpa": float(cgpa_match.group(1)) if cgpa_match else None,
            "backlogs": None,
        })

    return StudentProfile(
        name=name,
        email=email_match.group(0) if email_match else "",
        phone=phone_match.group(0).strip() if phone_match else None,
        github_url=github_match.group(0) if github_match else None,
        education=education,
        skills=skills,
        projects=[],
        experience=[],
        certifications=[],
        achievements=[],
    )


@router.get("/health")
def member4_health():
    return {
        "status": "ready",
        "llm": os.getenv("OLLAMA_MODEL", "qwen3:4b"),
        "mode": "local_free",
    }


@router.post("/resume/extract")
async def extract_resume_endpoint(file: UploadFile = File(...)):
    """FAST resume extraction: local PDF text + deterministic profile parsing.

    Deliberately avoids Ollama/Qwen on this endpoint so the UI does not hang
    waiting for a local LLM.
    """
    filename = file.filename or "resume.pdf"
    suffix = os.path.splitext(filename)[1].lower()

    if suffix not in {".pdf"}:
        raise HTTPException(
            status_code=400,
            detail="For fast Resume Intelligence, upload a PDF resume.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Resume file must be under 10 MB.")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        temp_path = tmp.name

    try:
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise HTTPException(
                status_code=500,
                detail="pypdf is missing. Run: python -m pip install pypdf",
            ) from exc

        reader = PdfReader(temp_path)
        pages = []
        for page in reader.pages:
            try:
                pages.append(page.extract_text() or "")
            except Exception:
                pages.append("")

        resume_text = "\n\n".join(x.strip() for x in pages if x.strip()).strip()
        if not resume_text:
            raise HTTPException(
                status_code=422,
                detail="This PDF has no readable text. Please upload a text-based PDF resume.",
            )

        profile = _fallback_profile(resume_text)
        verified_skills = _extract_skills(resume_text)
        # Skill names returned by this endpoint are always supported by text found
        # in the exact uploaded resume; we never supplement them from old profile data.
        result = profile.model_dump()
        result["skills"] = verified_skills
        result["extracted_text"] = resume_text
        result["analysis_mode"] = "fast_local"
        result["skill_source"] = "verified_against_extracted_text"
        result["suggestions"] = _resume_suggestions(profile)
        result["warning"] = "Fast local PDF extraction is active. Skill names are verified against the extracted resume text."
        if not verified_skills:
            result["warning"] += " No skills from the supported catalogue were found; no old profile skills were substituted. Review the extracted text or upload a readable text-based PDF."
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Resume extraction failed: {exc}") from exc
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


@router.post("/jobs/parse", response_model=JobProfile)
def parse_job(request: JobParseRequest):
    return extract_jobrole(request.job_description)


@router.post("/match", response_model=JobMatchResult)
def match_job(request: MatchRequest):
    from app.ai.matching.job_matcher import match_student_to_job
    return match_student_to_job(
        request.student,
        request.job,
        request.project_analysis,
    )


@router.post("/recommendations", response_model=list[JobMatchResult])
def recommend_jobs(request: RecommendationRequest):
    from app.ai.matching.job_matcher_pipeline import match_student_to_jobs
    return match_student_to_jobs(
        request.student,
        request.jobs,
    )


@router.post("/readiness")
def readiness(request: ReadinessRequest):
    from app.ai.readiness.readiness_workflow import run_readiness_workflow
    return run_readiness_workflow(
        student=request.student,
        job=request.job,
        project_analyses=request.project_analyses,
    )


@router.post("/preparation")
def preparation(request: PreparationRequest):
    from app.ai.recommendation.preparation_plan import generate_preparation_plan
    result = generate_preparation_plan(
        job=request.job,
        skill_gap=request.skill_gap,
    )
    return result.model_dump()


@router.post("/career-analysis")
def career_analysis(request: CareerAnalysisRequest):
    try:
        from app.ai.agent.agentic_workflow import build_agentic_workflow
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="LangGraph is not installed. Run pip install -r requirements.txt.",
        ) from exc

    workflow = build_agentic_workflow()
    state = workflow.invoke(
        {
            "student_profile": request.student,
            "selected_job": request.job,
            "project_analyses": request.project_analyses,
            "placement_events": request.placement_events,
            "student_events": request.student_events,
            "errors": [],
        }
    )

    return {
        key: (
            value.model_dump()
            if hasattr(value, "model_dump")
            else [
                item.model_dump()
                if hasattr(item, "model_dump")
                else item
                for item in value
            ]
            if isinstance(value, list)
            else value
        )
        for key, value in state.items()
    }


@router.post("/scheduling/plan")
def scheduling_plan(request: SchedulingRequest):
    from app.ai.scheduling.scheduler import (
        assign_students_to_slots,
        calculate_capacity,
        generate_interview_slots,
    )
    slots = generate_interview_slots(request)
    scheduled, unscheduled = assign_students_to_slots(
        request.shortlisted_students,
        slots,
    )
    return {
        "capacity": calculate_capacity(request),
        "available_slots": [slot.model_dump() for slot in slots],
        "scheduled": [event.model_dump() for event in scheduled],
        "unscheduled_students": unscheduled,
    }


@router.post("/scheduling/conflicts")
def scheduling_conflicts(request: ConflictsRequest):
    from app.ai.scheduling.conflict_detector import detect_scheduling_conflicts
    conflicts = detect_scheduling_conflicts(request.events)
    return {
        "conflicts": [conflict.model_dump() for conflict in conflicts],
        "count": len(conflicts),
    }


@router.post("/scheduling/alternatives")
def scheduling_alternatives(request: AlternativesRequest):
    from app.ai.scheduling.alternative_slots import suggest_alternative_slots
    return {
        "alternatives": suggest_alternative_slots(
            conflicted_event=request.conflicted_event,
            existing_events=request.existing_events,
            duration_minutes=request.duration_minutes,
            search_hours=request.search_hours,
        )
    }


@router.post("/analytics")
def analytics(request: AnalyticsRequest):
    from app.ai.analytics.placement_analytics import calculate_placement_analytics
    return calculate_placement_analytics(
        job_matches=request.job_matches,
        readiness_result=request.readiness_result,
        skill_gap=request.skill_gap,
    )


@router.post("/github/readme")
def github_readme(readme: str):
    raise HTTPException(status_code=410, detail="GitHub analysis runs automatically after a student applies.")


@router.post("/github/project")
def github_project(request: ProjectAnalyzeRequest):
    raise HTTPException(status_code=410, detail="GitHub project analysis runs automatically after a student applies.")


@router.post("/github/qna")
def github_qna(request: ProjectQNARequest):
    raise HTTPException(status_code=410, detail="Use the recruiter application Project Q&A endpoint for student-scoped evidence.")


@router.post("/recruiter/project-analysis")
async def recruiter_project_analysis(
    request: RecruiterProjectAnalysisRequest,
    current_user: User = Depends(get_current_user),
):
    raise HTTPException(status_code=410, detail="Project analysis is triggered automatically after a student applies and is limited to one scan per student each month.")


@router.get("/recruiter/applications/{application_id}/github-analysis")
def recruiter_application_github_analysis(
    application_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    from sqlalchemy import select
    from app.models.github_project_scan import GitHubProjectScan
    try:
        application, drive = _owned_application(application_id, current_user, db)
        scan = db.scalar(
            select(GitHubProjectScan)
            .where(GitHubProjectScan.student_id == application.student_id)
            .order_by(GitHubProjectScan.requested_at.desc())
        )
        retry_failed_scan = scan is not None and scan.status == "FAILED"
        if scan is None or scan.status == "NO_GITHUB_URL" or retry_failed_scan:
            # Existing applications predate the automatic application hook, or
            # their GitHub URL was added after the application was submitted.
            from app.services.github_project_service import queue_github_scan_after_application
            queue_github_scan_after_application(
                background_tasks,
                db,
                student_id=application.student_id,
                job_drive_id=drive.id,
            )
            scan = db.scalar(
                select(GitHubProjectScan)
                .where(GitHubProjectScan.student_id == application.student_id)
                .order_by(GitHubProjectScan.requested_at.desc())
            )
        if scan is None:
            return {"status": "NOT_STARTED", "repositories": [], "month_key": None}
        return {
            "status": scan.status,
            "month_key": scan.month_key,
            "requested_at": scan.requested_at.isoformat() if scan.requested_at else None,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
            "error_code": scan.error_code,
            "repositories": scan.repositories or [],
            "scanned_for_job_drive_id": scan.job_drive_id,
            "current_job_drive_id": drive.id,
        }
    finally:
        db.close()


@router.get("/recruiter/applications/{application_id}/student-profile")
def recruiter_application_student_profile(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    from sqlalchemy import select
    from app.models.student_profile import StudentProfile
    try:
        application, _ = _owned_application(application_id, current_user, db)
        student = db.get(User, application.student_id)
        profile = db.scalar(
            select(StudentProfile).where(StudentProfile.student_id == application.student_id)
        )
        fields = (
            "phone", "degree", "department", "graduation_year", "cgpa", "skills",
            "projects", "experience", "certifications", "linkedin", "github",
            "preferred_roles", "preferred_locations", "career_objective",
            "resume_text", "profile_photo_url", "updated_at",
        )
        result = {
            "student_id": application.student_id,
            "full_name": student.full_name if student else None,
            "email": student.email if student else None,
        }
        result.update({name: getattr(profile, name, None) if profile else None for name in fields})
        if result["updated_at"]:
            result["updated_at"] = result["updated_at"].isoformat()
        return result
    finally:
        db.close()


@router.post("/recruiter/applications/{application_id}/project-qna")
def recruiter_application_project_qna(
    application_id: int,
    request: RecruiterProjectQNARequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    from sqlalchemy import select
    from app.models.company import Company
    from app.models.github_project_scan import GitHubProjectScan
    try:
        application, drive = _owned_application(application_id, current_user, db)
        scan = db.scalar(
            select(GitHubProjectScan)
            .where(
                GitHubProjectScan.student_id == application.student_id,
                GitHubProjectScan.status == "COMPLETED",
            )
            .order_by(GitHubProjectScan.requested_at.desc())
        )
        if not scan or not scan.repositories:
            raise HTTPException(status_code=409, detail="This student's monthly GitHub project scan is not complete yet.")
        company = db.get(Company, drive.company_id)
        job_context = "\n\n".join(part for part in [
            f"Role: {drive.title}", f"Company: {company.name}" if company else "",
            f"Required skills: {drive.required_skills or ''}", f"Job description: {drive.description or ''}",
        ] if part)
        from app.ai.github.project_qna import answer_student_projects_question
        answer = answer_student_projects_question(
            student_id=application.student_id,
            question=request.question,
            projects=[{"repository": item.get("repository"), "evidence": []} for item in scan.repositories],
            job_context=job_context,
            job_drive_id=None,
        )
        return answer.model_dump()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Project Q&A is temporarily unavailable.") from exc
    finally:
        db.close()


@router.post("/skill-gap")
def skill_gap(request: MatchRequest):
    from app.ai.matching.skill_matcher import match_skills
    from app.ai.matching.skill_gap import calculate_skill_gap

    result = match_skills(request.student, request.job)
    return calculate_skill_gap(result)
