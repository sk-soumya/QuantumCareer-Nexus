from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import MetaData, Table, inspect
from sqlalchemy.orm import Session
from sqlalchemy.sql.sqltypes import Boolean, DateTime, Float, Integer, Numeric, String, Text

from app.core.dependencies import get_current_user
from app.database import Base, get_db
from app.models.student_document import StudentDocument
from app.models.user import User

router = APIRouter(prefix="/student-documents", tags=["Student Documents"])
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "student_documents"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
MAX_FILE_BYTES = 15 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}

OWNER_CANDIDATES = ("student_id", "user_id", "student_user_id", "owner_id", "owner_user_id", "uploaded_by", "uploaded_by_id", "uploader_id", "created_by", "created_by_user_id")
TYPE_CANDIDATES = ("document_type", "doc_type", "category", "type")
TITLE_CANDIDATES = ("title", "display_name", "document_name", "name")
ORIGINAL_CANDIDATES = ("original_filename", "original_file_name", "file_name", "filename", "original_name")
STORED_CANDIDATES = ("stored_filename", "storage_filename", "saved_filename", "disk_filename")
PATH_CANDIDATES = ("file_path", "stored_file_path", "storage_path", "stored_path", "document_path", "path", "storage_location", "storage_key", "file_url", "document_url", "download_url", "url")
MIME_CANDIDATES = ("content_type", "mime_type", "media_type", "file_mime_type")
CREATED_CANDIDATES = ("created_at", "uploaded_at", "uploaded_on", "created", "upload_date")


def _document_table(db: Session) -> Table:
    bind = db.get_bind()
    table_name = str(getattr(StudentDocument, "__tablename__", "student_documents"))
    if not inspect(bind).has_table(table_name):
        Base.metadata.create_all(bind=bind)
    if not inspect(bind).has_table(table_name):
        raise HTTPException(status_code=500, detail=f"Document table '{table_name}' was not created.")

    # Older versions of the vault model used slightly different column names.
    # Add only essential columns that have no equivalent, preserving existing rows.
    current = {column["name"] for column in inspect(bind).get_columns(table_name)}
    needed: list[tuple[str, str, tuple[str, ...]]] = [
        ("student_id", "INTEGER", OWNER_CANDIDATES),
        ("title", "VARCHAR(255)", TITLE_CANDIDATES),
        ("original_filename", "VARCHAR(255)", ORIGINAL_CANDIDATES),
        ("stored_filename", "VARCHAR(255)", STORED_CANDIDATES),
        ("document_type", "VARCHAR(50)", TYPE_CANDIDATES),
        ("content_type", "VARCHAR(150)", MIME_CANDIDATES),
        ("file_path", "TEXT", PATH_CANDIDATES),
        ("created_at", "TIMESTAMP", CREATED_CANDIDATES),
        ("status", "VARCHAR(30)", ("status", "state")),
    ]
    missing = [(name, sql_type) for name, sql_type, aliases in needed if not any(alias in current for alias in aliases)]
    if missing:
        with bind.begin() as connection:
            for name, sql_type in missing:
                try:
                    connection.exec_driver_sql(f'ALTER TABLE "{table_name}" ADD COLUMN "{name}" {sql_type}')
                except Exception:
                    refreshed = {column["name"] for column in inspect(connection).get_columns(table_name)}
                    if name not in refreshed:
                        raise
    return Table(table_name, MetaData(), autoload_with=bind)


def _first_column(table: Table, choices: tuple[str, ...]) -> str | None:
    return next((name for name in choices if name in table.c), None)


def _record(table: Table, row: Any) -> dict[str, Any]:
    record = dict(row)
    # Hide internal disk paths; the download route is the only file access path.
    for name in PATH_CANDIDATES:
        if name in record:
            record[name] = None
    for name in STORED_CANDIDATES:
        if name in record:
            record[name] = None
    if "download_url" in table.c and record.get("id") is not None:
        record["download_url"] = f"/student-documents/{record['id']}/download"
    elif record.get("id") is not None:
        record["download_url"] = f"/student-documents/{record['id']}/download"
    return record


def _required_default(column: Any, user_id: int, default_path: str, original_name: str, title: str, category: str, mime: str) -> Any:
    name = column.name.lower()
    if name in OWNER_CANDIDATES:
        return user_id
    if name in TYPE_CANDIDATES:
        return category
    if name in TITLE_CANDIDATES:
        return title
    if name in ORIGINAL_CANDIDATES:
        return original_name
    if name in STORED_CANDIDATES:
        return Path(default_path).name
    if name in PATH_CANDIDATES:
        return default_path
    if name in MIME_CANDIDATES:
        return mime
    if name in CREATED_CANDIDATES or name.endswith("_at"):
        return datetime.utcnow()
    if "size" in name and isinstance(column.type, Integer):
        return 0
    if isinstance(column.type, (String, Text)):
        return ""
    if isinstance(column.type, (Float, Numeric)):
        return 0.0
    if isinstance(column.type, Integer):
        return 0
    if isinstance(column.type, Boolean):
        return False
    if isinstance(column.type, DateTime):
        return datetime.utcnow()
    return None


def _owned_row(db: Session, table: Table, user_id: int, document_id: int) -> dict[str, Any] | None:
    owner = _first_column(table, OWNER_CANDIDATES)
    if not owner:
        raise HTTPException(status_code=500, detail="The student documents table has no student/user ownership column.")
    id_name = _first_column(table, ("id", "document_id"))
    if not id_name:
        raise HTTPException(status_code=500, detail="The student documents table needs an id column.")
    row = db.execute(table.select().where(table.c[id_name] == document_id, table.c[owner] == user_id)).mappings().first()
    return dict(row) if row else None


@router.get("/my")
def list_my_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    table = _document_table(db)
    owner = _first_column(table, OWNER_CANDIDATES)
    if not owner:
        raise HTTPException(status_code=500, detail="The student documents table has no student/user ownership column.")
    order_column = _first_column(table, ("created_at", "uploaded_at", "id"))
    statement = table.select().where(table.c[owner] == current_user.id)
    if order_column:
        statement = statement.order_by(table.c[order_column].desc())
    rows = db.execute(statement).mappings().all()
    return [_record(table, row) for row in rows]


@router.get("/")
def list_my_documents_root(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_my_documents(db=db, current_user=current_user)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str | None = Form(default=None),
    doc_type: str | None = Form(default=None),
    category: str | None = Form(default=None),
    title: str | None = Form(default=None),
    name: str | None = Form(default=None),
    display_name: str | None = Form(default=None),
    # Ownership always comes from the authenticated account, not form data.
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original_name = Path(file.filename or "document").name
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Upload a PDF or image (JPG, PNG, WEBP).")
    category_value = (document_type or doc_type or category or "OTHER").strip().upper().replace(" ", "_")
    if not category_value:
        category_value = "OTHER"
    display_value = (title or display_name or name or original_name).strip() or original_name
    mime = file.content_type or "application/octet-stream"
    raw = await file.read(MAX_FILE_BYTES + 1)
    if not raw:
        raise HTTPException(status_code=400, detail="The selected file is empty.")
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="The selected document must be smaller than 15 MB.")

    table = _document_table(db)
    owner = _first_column(table, OWNER_CANDIDATES)
    if not owner:
        raise HTTPException(status_code=500, detail="The student documents table has no student/user ownership column.")
    owner_folder = UPLOAD_ROOT / str(current_user.id)
    owner_folder.mkdir(parents=True, exist_ok=True)
    saved_name = f"{uuid4().hex}{extension}"
    saved_path = owner_folder / saved_name
    saved_path.write_bytes(raw)
    path_value = str(saved_path.resolve())

    values: dict[str, Any] = {owner: current_user.id}
    for column_name in table.c.keys():
        lowered = column_name.lower()
        if column_name in values:
            continue
        if column_name in TYPE_CANDIDATES:
            values[column_name] = category_value
        elif column_name in TITLE_CANDIDATES:
            values[column_name] = display_value
        elif column_name in ORIGINAL_CANDIDATES:
            values[column_name] = original_name
        elif column_name in STORED_CANDIDATES:
            values[column_name] = saved_name
        elif column_name in PATH_CANDIDATES:
            values[column_name] = path_value
        elif column_name in MIME_CANDIDATES:
            values[column_name] = mime
        elif "size" in lowered and isinstance(table.c[column_name].type, Integer):
            values[column_name] = len(raw)
        elif column_name in CREATED_CANDIDATES or lowered.endswith("_at"):
            values[column_name] = datetime.utcnow()
        elif lowered in {"status", "state"} and isinstance(table.c[column_name].type, (String, Text)):
            values[column_name] = "ACTIVE"
        elif lowered in {"is_active", "active"}:
            values[column_name] = True

    # Fill simple non-null legacy columns when the model uses alternate field names.
    for column in table.columns:
        if column.name in values or column.primary_key or column.nullable or column.default is not None or column.server_default is not None:
            continue
        values[column.name] = _required_default(column, current_user.id, path_value, original_name, display_value, category_value, mime)

    try:
        result = db.execute(table.insert().values(**values))
        db.commit()
        id_name = _first_column(table, ("id", "document_id"))
        new_id = result.inserted_primary_key[0] if result.inserted_primary_key else None
        if id_name and new_id is not None:
            row = db.execute(table.select().where(table.c[id_name] == new_id)).mappings().first()
        else:
            original_col = _first_column(table, ORIGINAL_CANDIDATES)
            query = table.select().where(table.c[owner] == current_user.id)
            if original_col:
                query = query.where(table.c[original_col] == original_name)
            row = db.execute(query).mappings().first()
        if row is None:
            return {"message": "Document uploaded.", "filename": original_name, "document_type": category_value}
        return _record(table, row)
    except Exception as exc:
        db.rollback()
        saved_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Document could not be saved to the student document table: {exc}") from exc


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    table = _document_table(db)
    row = _owned_row(db, table, current_user.id, document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found for this account.")
    candidates: list[Path] = []
    for path_name in PATH_CANDIDATES:
        if path_name not in table.c or not row.get(path_name):
            continue
        stored_path = Path(str(row[path_name]))
        if stored_path.is_absolute():
            candidates.append(stored_path)
        else:
            candidates.extend([UPLOAD_ROOT / str(current_user.id) / stored_path, UPLOAD_ROOT / stored_path.name])
    for stored_name in STORED_CANDIDATES:
        if stored_name in table.c and row.get(stored_name):
            candidates.extend([UPLOAD_ROOT / str(current_user.id) / str(row[stored_name]), UPLOAD_ROOT / str(row[stored_name])])
    safe_root = UPLOAD_ROOT.resolve()
    file_path = None
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            if resolved.is_file() and safe_root in resolved.parents:
                file_path = resolved
                break
        except OSError:
            continue
    if file_path is None:
        raise HTTPException(status_code=404, detail="The stored document file could not be found.")
    name_column = _first_column(table, ORIGINAL_CANDIDATES + TITLE_CANDIDATES)
    download_name = str(row.get(name_column) or file_path.name) if name_column else file_path.name
    mime_column = _first_column(table, MIME_CANDIDATES)
    media_type = str(row.get(mime_column) or "application/octet-stream") if mime_column else "application/octet-stream"
    return FileResponse(file_path, media_type=media_type, filename=Path(download_name).name)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    table = _document_table(db)
    row = _owned_row(db, table, current_user.id, document_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found for this account.")
    id_column = _first_column(table, ("id", "document_id"))
    owner_column = _first_column(table, OWNER_CANDIDATES)
    candidates: list[Path] = []
    for path_column in PATH_CANDIDATES:
        if path_column in table.c and row.get(path_column):
            candidate = Path(str(row[path_column]))
            candidates.append(candidate)
            if not candidate.is_absolute():
                candidates.append(UPLOAD_ROOT / str(current_user.id) / candidate)
    for stored_column in STORED_CANDIDATES:
        if stored_column in table.c and row.get(stored_column):
            candidates.extend([UPLOAD_ROOT / str(current_user.id) / str(row[stored_column]), UPLOAD_ROOT / str(row[stored_column])])
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            if resolved.is_file() and UPLOAD_ROOT.resolve() in resolved.parents:
                resolved.unlink(missing_ok=True)
                break
        except OSError:
            pass
    db.execute(table.delete().where(table.c[id_column] == document_id, table.c[owner_column] == current_user.id))
    db.commit()
    return None
