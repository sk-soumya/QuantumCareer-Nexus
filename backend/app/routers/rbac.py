from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.database import get_db
from app.models.student_profile import StudentProfile
from app.models.user import User


router = APIRouter(
    prefix="/rbac",
    tags=["RBAC"],
)


# ============================================================
# STUDENT ONLY
# ============================================================

@router.get("/student-only")
def student_only(
    current_user: User = Depends(
        require_role("STUDENT")
    ),
):
    return {
        "message": "Welcome Student!",
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
    }


# ============================================================
# RECRUITER ONLY
# ============================================================

@router.get("/recruiter-only")
def recruiter_only(
    current_user: User = Depends(
        require_role("RECRUITER")
    ),
):
    return {
        "message": "Welcome Recruiter!",
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
    }


# ============================================================
# PLACEMENT OFFICER ONLY
# ============================================================

@router.get("/placement-officer-only")
def placement_officer_only(
    current_user: User = Depends(
        require_role("PLACEMENT_OFFICER")
    ),
):
    return {
        "message": "Welcome Placement Officer!",
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
    }


# ============================================================
# ADMIN ONLY
# ============================================================

@router.get("/admin-only")
def admin_only(
    current_user: User = Depends(
        require_role("ADMIN")
    ),
):
    return {
        "message": "Welcome Admin!",
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
    }


# ============================================================
# PLACEMENT OFFICER / ADMIN:
# LIST ALL STUDENTS
# ============================================================

@router.get("/students")
def get_students(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only placement officers and admins "
                "can view students"
            ),
        )

    students = db.scalars(
        select(User)
        .where(
            User.role == "STUDENT"
        )
        .order_by(
            User.id.asc()
        )
    ).all()

    response = []

    for student in students:

        profile = db.scalar(
            select(StudentProfile).where(
                StudentProfile.student_id
                == student.id
            )
        )

        response.append(
            {
                "id": student.id,
                "full_name": student.full_name,
                "email": student.email,
                "role": student.role,
                "is_active": student.is_active,
                "created_at": student.created_at,
                "cgpa": (
                    profile.cgpa
                    if profile
                    else None
                ),
                "skills": (
                    profile.skills
                    if profile
                    else None
                ),
                "resume_text": (
                    profile.resume_text
                    if profile
                    else None
                ),
                "profile_completed": (
                    profile is not None
                ),
            }
        )

    return response