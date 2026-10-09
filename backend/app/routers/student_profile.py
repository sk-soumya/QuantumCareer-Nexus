from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import MetaData, Table, inspect, text
from sqlalchemy.orm import Session
from sqlalchemy.sql.sqltypes import Boolean, DateTime, Float, Integer, Numeric, String, Text

from app.core.dependencies import get_current_user
from app.database import Base, get_db
from app.models.student_profile import StudentProfile
from app.models.user import User

router = APIRouter(prefix="/student-profile", tags=["Student Profile"])

PROFILE_FIELD_TYPES: dict[str, str] = {
    "phone": "VARCHAR(80)",
    "degree": "VARCHAR(180)",
    "department": "VARCHAR(180)",
    "graduation_year": "INTEGER",
    "cgpa": "FLOAT",
    "skills": "TEXT",
    "projects": "TEXT",
    "experience": "TEXT",
    "certifications": "TEXT",
    "linkedin": "TEXT",
    "github": "TEXT",
    "preferred_roles": "TEXT",
    "preferred_locations": "TEXT",
    "career_objective": "TEXT",
    "resume_text": "TEXT",
    "profile_photo_url": "TEXT",
    "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
}
PROFILE_FIELD_NAMES = tuple(name for name in PROFILE_FIELD_TYPES if name not in {"created_at", "updated_at"})
PROFILE_PHOTO_DIR = Path(__file__).resolve().parents[2] / "uploads" / "profile_photos"
PROFILE_PHOTO_DIR.mkdir(parents=True, exist_ok=True)
MAX_PHOTO_BYTES = 5 * 1024 * 1024


def _table_name() -> str:
    return str(getattr(StudentProfile, "__tablename__", "student_profiles"))


def _ensure_profile_schema(db: Session) -> None:
    """Add missing profile fields to existing installs without deleting existing data."""
    bind = db.get_bind()
    table_name = _table_name()
    if not inspect(bind).has_table(table_name):
        # StudentProfile is already imported into Base metadata by main.py.
        Base.metadata.create_all(bind=bind)
    inspector = inspect(bind)
    if not inspector.has_table(table_name):
        raise HTTPException(status_code=500, detail=f"Profile table '{table_name}' was not created.")
    existing = {column["name"] for column in inspector.get_columns(table_name)}
    missing = [(name, sql_type) for name, sql_type in PROFILE_FIELD_TYPES.items() if name not in existing]
    if not missing:
        return
    # Column names and SQL types come only from the fixed map above.
    with bind.begin() as connection:
        for name, sql_type in missing:
            try:
                connection.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{name}" {sql_type}'))
            except Exception:
                # Another request/process may have added the same column between inspection and ALTER.
                current = {column["name"] for column in inspect(connection).get_columns(table_name)}
                if name not in current:
                    raise


def _profile_table(db: Session) -> tuple[Table, str]:
    _ensure_profile_schema(db)
    table = Table(_table_name(), MetaData(), autoload_with=db.get_bind())
    owner_name = next((name for name in ("student_id", "user_id", "student_user_id") if name in table.c), None)
    if not owner_name:
        raise HTTPException(status_code=500, detail="The student profile table needs a student_id or user_id column.")
    return table, owner_name


def _as_row(db: Session, table: Table, owner_name: str, user_id: int) -> dict[str, Any] | None:
    row = db.execute(table.select().where(table.c[owner_name] == user_id)).mappings().first()
    return dict(row) if row is not None else None


def _blank_profile(user_id: int, table: Table, owner_name: str) -> dict[str, Any]:
    result: dict[str, Any] = {name: None for name in PROFILE_FIELD_NAMES}
    result[owner_name] = user_id
    if "id" in table.c:
        result["id"] = None
    return result


def _default_for_required_column(column: Any, user_id: int) -> Any:
    name = column.name.lower()
    if name in {"student_id", "user_id", "student_user_id", "uploaded_by", "owner_id", "created_by"}:
        return user_id
    if "created_at" in name or "updated_at" in name or name.endswith("_at"):
        return datetime.utcnow()
    if isinstance(column.type, (String, Text)):
        return ""
    if isinstance(column.type, (Float, Numeric)):
        return 0.0
    if isinstance(column.type, Integer):
        return 0
    if isinstance(column.type, Boolean):
        return False
    return None


def _upsert_profile(db: Session, user_id: int, incoming: dict[str, Any]) -> dict[str, Any]:
    table, owner_name = _profile_table(db)
    clean: dict[str, Any] = {}
    for name in PROFILE_FIELD_NAMES:
        if name in incoming and name in table.c:
            value = incoming[name]
            if isinstance(value, str):
                value = value.strip() or None
            clean[name] = value
    if "updated_at" in table.c:
        clean["updated_at"] = datetime.utcnow()

    current = _as_row(db, table, owner_name, user_id)
    if current:
        if clean:
            db.execute(table.update().where(table.c[owner_name] == user_id).values(**clean))
    else:
        values: dict[str, Any] = {owner_name: user_id, **clean}
        if "created_at" in table.c:
            values.setdefault("created_at", datetime.utcnow())
        if "updated_at" in table.c:
            values.setdefault("updated_at", datetime.utcnow())
        # Respect required legacy columns when an install has additional non-null fields.
        for column in table.columns:
            if column.name in values or column.primary_key or column.nullable or column.default is not None or column.server_default is not None:
                continue
            values[column.name] = _default_for_required_column(column, user_id)
        values = {key: value for key, value in values.items() if key in table.c}
        db.execute(table.insert().values(**values))
    db.commit()
    return _as_row(db, table, owner_name, user_id) or _blank_profile(user_id, table, owner_name)


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    table, owner_name = _profile_table(db)
    row = _as_row(db, table, owner_name, current_user.id)
    return row if row is not None else _blank_profile(current_user.id, table, owner_name)


@router.get("/student/{student_id}")
def get_student_profile_for_recruiter(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a student's profile to authorized hiring staff, including the saved GitHub URL."""
    if current_user.role not in {"RECRUITER", "PLACEMENT_OFFICER", "ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters, placement officers, and admins can view applicant profiles.",
        )
    student = db.get(User, student_id)
    if student is None or str(getattr(student, "role", "")).upper() != "STUDENT":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    table, owner_name = _profile_table(db)
    row = _as_row(db, table, owner_name, student_id)
    profile = row if row is not None else _blank_profile(student_id, table, owner_name)
    # Expose one stable owner key and account name for recruiter-side mapping.
    profile["student_id"] = student_id
    profile["user_id"] = student_id
    profile["full_name"] = getattr(student, "full_name", None)
    return profile


@router.put("/me")
def upsert_my_profile(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Profile data must be a JSON object.")
    allowed = {name: payload[name] for name in PROFILE_FIELD_NAMES if name in payload}
    if "cgpa" in allowed and allowed["cgpa"] not in (None, ""):
        try:
            cgpa = float(allowed["cgpa"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="cgpa must be a number from 0 to 10.")
        if not 0 <= cgpa <= 10:
            raise HTTPException(status_code=422, detail="cgpa must be between 0 and 10.")
        allowed["cgpa"] = cgpa
    elif "cgpa" in allowed:
        allowed["cgpa"] = None
    if "graduation_year" in allowed and allowed["graduation_year"] not in (None, ""):
        try:
            year = int(allowed["graduation_year"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="graduation_year must be a valid year.")
        if not 2000 <= year <= 2100:
            raise HTTPException(status_code=422, detail="graduation_year must be between 2000 and 2100.")
        allowed["graduation_year"] = year
    elif "graduation_year" in allowed:
        allowed["graduation_year"] = None
    return _upsert_profile(db, current_user.id, allowed)


@router.post("/photo", status_code=status.HTTP_201_CREATED)
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = file.filename or "profile-photo"
    extension = Path(filename).suffix.lower()
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    if extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Choose a JPG, PNG or WEBP image.")
    if file.content_type and not file.content_type.lower().startswith("image/"):
        raise HTTPException(status_code=400, detail="The selected file is not an image.")
    raw = await file.read(MAX_PHOTO_BYTES + 1)
    if not raw:
        raise HTTPException(status_code=400, detail="The selected photo is empty.")
    if len(raw) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="Profile photo must be smaller than 5 MB.")
    saved_name = f"{current_user.id}_{uuid4().hex}{extension}"
    saved_path = PROFILE_PHOTO_DIR / saved_name
    saved_path.write_bytes(raw)
    photo_url = f"/student-profile/photo/{saved_name}"
    try:
        _upsert_profile(db, current_user.id, {"profile_photo_url": photo_url})
    except Exception:
        saved_path.unlink(missing_ok=True)
        raise
    return {"profile_photo_url": photo_url, "url": photo_url}


@router.get("/photo/{filename}")
def get_profile_photo(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    del current_user
    safe_name = Path(filename).name
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid photo filename.")
    path = PROFILE_PHOTO_DIR / safe_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Profile photo not found.")
    return FileResponse(path)
