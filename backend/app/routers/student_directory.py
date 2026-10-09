from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.application import Application
from app.models.student_profile import StudentProfile
from app.models.user import User

router = APIRouter(
    prefix="/students",
    tags=["Placement Students"],
)


def _skill_list(value: str | None) -> list[str]:
    return [
        item.strip()
        for item in (value or "").replace(";", ",").split(",")
        if item.strip()
    ]


def _profile_strength(profile: StudentProfile | None) -> int:
    if not profile:
        return 0

    checks = [
        bool(profile.phone),
        bool(profile.degree),
        bool(profile.department),
        profile.graduation_year is not None,
        profile.cgpa is not None,
        bool(profile.skills),
        bool(profile.projects),
        bool(profile.experience),
        bool(profile.certifications),
        bool(profile.linkedin or profile.github),
        bool(profile.preferred_roles),
        bool(profile.career_objective),
        bool(profile.resume_text),
        bool(profile.profile_photo_url),
    ]
    return round(sum(checks) / len(checks) * 100)


@router.get("/")
def list_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"PLACEMENT_OFFICER", "ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only placement officers and admins can view the student directory.",
        )

    rows = db.execute(
        select(User, StudentProfile)
        .outerjoin(
            StudentProfile,
            StudentProfile.student_id == User.id,
        )
        .where(User.role == "STUDENT")
        .order_by(User.full_name.asc()),
    ).all()

    student_ids = [user.id for user, _profile in rows]

    application_rows = []
    if student_ids:
        application_rows = db.execute(
            select(
                Application.student_id,
                Application.status,
            ).where(Application.student_id.in_(student_ids))
        ).all()

    applications_by_student: dict[int, list[str]] = defaultdict(list)
    for student_id, application_status in application_rows:
        applications_by_student[int(student_id)].append(
            str(application_status or "APPLIED").upper()
        )

    students = []

    for user, profile in rows:
        statuses = applications_by_student.get(user.id, [])
        normalized_statuses = set(statuses)

        if normalized_statuses & {"ACCEPTED", "OFFERED", "SELECTED"}:
            placement_stage = "PLACED / OFFER"
        elif "INTERVIEW" in normalized_statuses:
            placement_stage = "INTERVIEW"
        elif "SHORTLISTED" in normalized_statuses:
            placement_stage = "SHORTLISTED"
        elif "APPLIED" in normalized_statuses:
            placement_stage = "APPLIED"
        else:
            placement_stage = "PROFILE READY"

        profile_strength = _profile_strength(profile)
        skills = _skill_list(profile.skills if profile else None)

        students.append(
            {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "is_active": bool(user.is_active),
                "created_at": user.created_at,
                "updated_at": profile.updated_at if profile else None,
                "phone": profile.phone if profile else None,
                "degree": profile.degree if profile else None,
                "department": profile.department if profile else None,
                "graduation_year": profile.graduation_year if profile else None,
                "cgpa": profile.cgpa if profile else None,
                "skills": skills,
                "skill_count": len(skills),
                "projects": profile.projects if profile else None,
                "experience": profile.experience if profile else None,
                "certifications": profile.certifications if profile else None,
                "linkedin": profile.linkedin if profile else None,
                "github": profile.github if profile else None,
                "preferred_roles": profile.preferred_roles if profile else None,
                "preferred_locations": profile.preferred_locations if profile else None,
                "career_objective": profile.career_objective if profile else None,
                "has_resume": bool(profile.resume_text) if profile else False,
                "has_photo": bool(profile.profile_photo_url) if profile else False,
                "profile_strength": profile_strength,
                "application_count": len(statuses),
                "application_statuses": statuses,
                "placement_stage": placement_stage,
            }
        )

    return students
