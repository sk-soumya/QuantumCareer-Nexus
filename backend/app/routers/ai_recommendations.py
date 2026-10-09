from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.explainability import explain_match
from app.ai.recommendations import (
    get_ranked_candidates_for_job,
    get_ranked_jobs_for_student,
)
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.job_drive import JobDrive
from app.models.user import User


router = APIRouter(
    prefix="/ai",
    tags=["AI Recommendations"],
)


# ============================================================
# STUDENT AI JOB RECOMMENDATIONS
# ============================================================

@router.get(
    "/recommendations/my",
)
def get_my_ai_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Student-only endpoint
    # --------------------------------------------------------

    if current_user.role != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only students can view their "
                "personal AI recommendations"
            ),
        )

    # --------------------------------------------------------
    # Run student recommendation engine
    # --------------------------------------------------------

    try:
        ranked_jobs = get_ranked_jobs_for_student(
            db=db,
            student_id=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # Add SHAP explanations
    # --------------------------------------------------------

    response = []

    for job in ranked_jobs:

        explanation = explain_match(
            skill_score=job["skill_score"],
            semantic_score=job["semantic_score"],
            cgpa_score=job["cgpa_score"],
            is_eligible=job["is_eligible"],
        )

        response.append(
            {
                **job,
                "explanation": explanation,
            }
        )

    # --------------------------------------------------------
    # Return recommendations
    # --------------------------------------------------------

    return {
        "student_id": current_user.id,
        "student_name": current_user.full_name,
        "recommendation_count": len(response),
        "recommendations": response,
    }


# ============================================================
# GET AI-RANKED CANDIDATES FOR A JOB DRIVE
# ============================================================

@router.get(
    "/recommendations/{job_drive_id}",
)
def get_ai_recommendations(
    job_drive_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Permission check
    # --------------------------------------------------------

    if current_user.role not in {
        "RECRUITER",
        "PLACEMENT_OFFICER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only recruiters, placement officers "
                "and admins can view AI recommendations"
            ),
        )

    # --------------------------------------------------------
    # Check job drive
    # --------------------------------------------------------

    job_drive = db.get(
        JobDrive,
        job_drive_id,
    )

    if not job_drive or job_drive.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job drive not found",
        )

    # --------------------------------------------------------
    # Run recommendation engine
    # --------------------------------------------------------

    try:
        ranked_candidates = (
            get_ranked_candidates_for_job(
                db=db,
                job_drive_id=job_drive_id,
            )
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # Add student names + SHAP explanation
    # --------------------------------------------------------

    response = []

    for candidate in ranked_candidates:

        student = db.scalar(
            select(User).where(
                User.id == candidate["student_id"]
            )
        )

        explanation = explain_match(
            skill_score=candidate["skill_score"],
            semantic_score=candidate["semantic_score"],
            cgpa_score=candidate["cgpa_score"],
            is_eligible=candidate["is_eligible"],
        )

        response.append(
            {
                **candidate,
                "student_name": (
                    student.full_name
                    if student
                    else None
                ),
                "explanation": explanation,
            }
        )

    # --------------------------------------------------------
    # Return complete AI response
    # --------------------------------------------------------

    return {
        "job_drive_id": job_drive.id,
        "job_title": job_drive.title,
        "candidate_count": len(response),
        "recommendations": response,
    }