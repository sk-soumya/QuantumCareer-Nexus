from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.student_profile import StudentProfile
from app.models.user import User

router = APIRouter(prefix="/placement-officer", tags=["Placement Officer"])


def _is_placement_officer(user: User) -> bool:
    role = getattr(user, "role", "")
    value = getattr(role, "value", role)
    return str(value).upper() in {"PLACEMENT_OFFICER", "PLACEMENTOFFICER", "PLACEMENT OFFICER"}


def _profile_completion(profile) -> int:
    fields = [
        getattr(profile, "cgpa", None), getattr(profile, "skills", None), getattr(profile, "resume_text", None),
        getattr(profile, "phone", None), getattr(profile, "degree", None), getattr(profile, "department", None),
        getattr(profile, "graduation_year", None), getattr(profile, "projects", None), getattr(profile, "experience", None),
        getattr(profile, "certifications", None), getattr(profile, "linkedin", None), getattr(profile, "github", None),
        getattr(profile, "preferred_roles", None), getattr(profile, "preferred_locations", None), getattr(profile, "career_objective", None),
    ]
    filled = sum(1 for value in fields if value not in (None, "", []))
    return round((filled / len(fields)) * 100) if fields else 0


def _skills_count(value) -> int:
    return len([x for x in str(value or "").replace(";", ",").split(",") if x.strip()])


def _user_name(user: User) -> str:
    return (
        getattr(user, "full_name", None)
        or getattr(user, "name", None)
        or getattr(user, "username", None)
        or getattr(user, "email", None)
        or f"Student #{user.id}"
    )


def _row_from_user(user: User, profile=None) -> dict:
    resume_text = getattr(profile, "resume_text", None) if profile else None
    skills = getattr(profile, "skills", None) if profile else None
    return {
        "id": user.id,
        "name": _user_name(user),
        "email": getattr(user, "email", None),
        "is_active": bool(getattr(user, "is_active", True)),
        "cgpa": getattr(profile, "cgpa", None) if profile else None,
        "skills": skills or "",
        "skill_count": _skills_count(skills),
        "has_resume": bool(str(resume_text or "").strip()),
        "resume_chars": len(str(resume_text or "")),
        "profile_completion": _profile_completion(profile) if profile else 0,
        "profile_updated_at": getattr(profile, "updated_at", None).isoformat() if profile and getattr(profile, "updated_at", None) else None,
    }


@router.get("/students")
def list_students(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not _is_placement_officer(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Placement Officer permission required.")

    users = db.scalars(select(User).where(User.role == "STUDENT").order_by(User.id.desc())).all()
    ids = [user.id for user in users]
    profiles = {}
    if ids:
        profile_rows = db.execute(
            select(StudentProfile).where(StudentProfile.student_id.in_(ids))
        ).scalars().all()
        profiles = {profile.student_id: profile for profile in profile_rows}

    rows = [_row_from_user(user, profiles.get(user.id)) for user in users]
    total = len(rows)
    active = sum(1 for row in rows if row["is_active"])
    ai_profiles = sum(1 for row in rows if row["has_resume"])
    ready_profiles = sum(1 for row in rows if row["profile_completion"] >= 67)
    cgpas = [float(row["cgpa"]) for row in rows if row["cgpa"] is not None]

    return {
        "status": "SUCCESS",
        "students": rows,
        "stats": {
            "total_students": total,
            "active_students": active,
            "inactive_students": total - active,
            "ai_profiles": ai_profiles,
            "ready_profiles": ready_profiles,
            "average_cgpa": round(sum(cgpas) / len(cgpas), 2) if cgpas else None,
        },
    }


def _table_names(db: Session) -> list[str]:
    rows = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
    return [str(row[0]) for row in rows]


def _find_table(db: Session, candidates: list[str]) -> str | None:
    names = {name.lower(): name for name in _table_names(db)}
    for candidate in candidates:
        if candidate.lower() in names:
            return names[candidate.lower()]
    return None


def _columns(db: Session, table: str) -> set[str]:
    rows = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=:table"), {"table": table})
    return {str(row[0]) for row in rows}


def _safe_records_for_student(db: Session, table: str | None, student_id: int, limit: int = 50) -> list[dict]:
    if not table:
        return []
    columns = _columns(db, table)
    student_col = next((c for c in ("student_id", "candidate_id", "user_id", "student") if c in columns), None)
    if not student_col:
        return []
    selected = [c for c in ("id", "name", "file_name", "filename", "title", "type", "document_type", "mime_type", "file_url", "url", "download_url", "company_name", "company", "role", "job_title", "status", "application_status", "offer_status", "applied_at", "application_date", "created_at", "updated_at", "uploaded_at") if c in columns]
    if not selected:
        selected = ["*"]
    cols = ", ".join('"'+c.replace('"','""')+'"' for c in selected) if selected != ["*"] else "*"
    sql = text(f'SELECT {cols} FROM "{table.replace(chr(34), chr(34)*2)}" WHERE "{student_col.replace(chr(34), chr(34)*2)}" = :student_id ORDER BY 1 DESC LIMIT :limit')
    result = db.execute(sql, {"student_id": student_id, "limit": limit})
    items = []
    for row in result.mappings().all():
        clean = {}
        for key, value in row.items():
            if hasattr(value, "isoformat"):
                value = value.isoformat()
            clean[key] = value
        items.append(clean)
    return items


def _documents(db: Session, student_id: int) -> list[dict]:
    table = _find_table(db, ["documents", "student_documents", "uploaded_documents"])
    return _safe_records_for_student(db, table, student_id)


def _applications(db: Session, student_id: int) -> list[dict]:
    table = _find_table(db, ["applications", "job_applications", "student_applications"])
    return _safe_records_for_student(db, table, student_id)


def _offers(db: Session, student_id: int) -> list[dict]:
    table = _find_table(db, ["offers", "job_offers", "student_offers"])
    return _safe_records_for_student(db, table, student_id)


def _schedules(db: Session, student_id: int) -> list[dict]:
    table = _find_table(db, ["schedules", "schedule", "interviews", "interview_schedules"])
    return _safe_records_for_student(db, table, student_id)


@router.get("/students/{student_id}")
def get_student_detail(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not _is_placement_officer(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Placement Officer permission required.")

    user = db.scalar(select(User).where(User.id == student_id, User.role == "STUDENT"))
    if not user:
        raise HTTPException(status_code=404, detail="Student not found.")

    profile = db.scalar(select(StudentProfile).where(StudentProfile.student_id == student_id))
    row = _row_from_user(user, profile)

    profile_payload = dict(row)
    if profile:
        profile_payload.update({
            "phone": getattr(profile, "phone", None), "degree": getattr(profile, "degree", None),
            "department": getattr(profile, "department", None), "graduation_year": getattr(profile, "graduation_year", None),
            "projects": getattr(profile, "projects", None), "experience": getattr(profile, "experience", None),
            "certifications": getattr(profile, "certifications", None), "linkedin": getattr(profile, "linkedin", None),
            "github": getattr(profile, "github", None), "preferred_roles": getattr(profile, "preferred_roles", None),
            "preferred_locations": getattr(profile, "preferred_locations", None), "career_objective": getattr(profile, "career_objective", None),
            "resume_text": getattr(profile, "resume_text", None), "profile_photo_url": getattr(profile, "profile_photo_url", None),
            "profile_updated_at": getattr(profile, "updated_at", None).isoformat() if getattr(profile, "updated_at", None) else None,
        })

    skill_count = _skills_count(profile_payload.get("skills"))
    resume_text = str(profile_payload.get("resume_text") or "")
    completion = _profile_completion(profile)
    ai = {
        "summary": profile_payload.get("career_objective") or "Structured profile analysis is available from the stored resume and student profile.",
        "profile_completion": completion,
        "skill_breadth": min(100, skill_count * 10),
        "resume_coverage": 100 if resume_text.strip() else 0,
        "academic_signal": min(100, float(profile_payload["cgpa"]) * 10) if profile_payload.get("cgpa") is not None else 0,
        "note": "AI analysis uses stored profile/resume evidence. Missing fields are shown as missing rather than invented.",
    }

    return {
        "status": "SUCCESS",
        "profile": profile_payload,
        "ai": ai,
        "documents": _documents(db, student_id),
        "applications": _applications(db, student_id),
        "offers": _offers(db, student_id),
        "schedules": _schedules(db, student_id),
    }
@router.get("/students/{student_id}")
def get_student_detail(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_placement_officer(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Placement Officer permission required.",
        )

    student = db.scalar(
        select(User).where(
            User.id == student_id,
            User.role == "STUDENT",
        )
    )

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    profile = db.scalar(
        select(StudentProfile).where(
            StudentProfile.student_id == student_id
        )
    )

    skills_value = getattr(profile, "skills", "") if profile else ""

    skill_list = [
        item.strip()
        for item in str(skills_value or "")
        .replace(";", ",")
        .replace("\n", ",")
        .split(",")
        if item.strip()
    ]

    profile_data = {
        "id": student.id,
        "name": (
            getattr(student, "full_name", None)
            or getattr(student, "name", None)
            or getattr(student, "username", None)
            or getattr(student, "email", None)
            or f"Student #{student.id}"
        ),
        "email": getattr(student, "email", None),
        "is_active": bool(
            getattr(student, "is_active", True)
        ),
        "cgpa": getattr(profile, "cgpa", None) if profile else None,
        "skills": skills_value,
        "skill_list": skill_list,
        "resume_text": (
            getattr(profile, "resume_text", None)
            if profile else None
        ),
        "updated_at": (
            getattr(profile, "updated_at", None).isoformat()
            if profile and getattr(profile, "updated_at", None)
            else None
        ),
    }

    return {
        "status": "SUCCESS",
        "student": profile_data,
    }