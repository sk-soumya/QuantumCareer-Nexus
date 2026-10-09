from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.application import Application
from app.models.document import Document
from app.models.offer import Offer
from app.models.user import User
from app.schemas.document import DocumentResponse


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


BASE_DIR = Path(__file__).resolve().parent.parent.parent

UPLOAD_DIR = BASE_DIR / "uploads" / "documents"

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


ALLOWED_DOCUMENT_TYPES = {
    "RESUME",
    "AADHAAR",
    "PAN",
    "MARKSHEET",
    "CERTIFICATE",
    "OFFER_LETTER",
    "OTHER",
}


ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    offer_id: int = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid document type",
        )

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPEG and PNG files are allowed",
        )

    offer = db.get(Offer, offer_id)

    if not offer:
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

    application = db.get(
        Application,
        offer.application_id,
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    if current_user.role == "STUDENT":
        if application.student_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to upload for this offer",
            )

    elif current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
        "RECRUITER",
    }:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to upload documents",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is required",
        )

    original_filename = Path(file.filename).name

    extension = Path(original_filename).suffix.lower()

    allowed_extensions = {
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png",
    }

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Invalid file extension",
        )

    stored_filename = f"{uuid4().hex}{extension}"

    file_path = UPLOAD_DIR / stored_filename

    try:
        with file_path.open("wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                buffer.write(chunk)

    except Exception as exc:
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded file",
        ) from exc

    document = Document(
        offer_id=offer_id,
        uploaded_by=current_user.id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        document_type=document_type,
        content_type=file.content_type,
        file_path=str(file_path),
        status="ACTIVE",
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


@router.get(
    "/my",
    response_model=list[DocumentResponse],
)
def get_my_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "STUDENT":
        documents = db.scalars(
            select(Document)
            .join(
                Offer,
                Offer.id == Document.offer_id,
            )
            .join(
                Application,
                Application.id == Offer.application_id,
            )
            .where(
                Application.student_id == current_user.id
            )
            .order_by(Document.id.desc())
        ).all()

        return documents

    if current_user.role in {
        "PLACEMENT_OFFICER",
        "ADMIN",
        "RECRUITER",
    }:
        documents = db.scalars(
            select(Document)
            .order_by(Document.id.desc())
        ).all()

        return documents

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to view documents",
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.get(
        Document,
        document_id,
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    offer = db.get(
        Offer,
        document.offer_id,
    )

    if not offer:
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

    application = db.get(
        Application,
        offer.application_id,
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    if current_user.role == "STUDENT":
        if application.student_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to view this document",
            )

    elif current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
        "RECRUITER",
    }:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this document",
        )

    return document


@router.get(
    "/{document_id}/download",
)
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.get(
        Document,
        document_id,
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    offer = db.get(
        Offer,
        document.offer_id,
    )

    if not offer:
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

    application = db.get(
        Application,
        offer.application_id,
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    if current_user.role == "STUDENT":
        if application.student_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to download this document",
            )

    elif current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
        "RECRUITER",
    }:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to download this document",
        )

    file_path = Path(document.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Stored file not found",
        )

    return FileResponse(
        path=file_path,
        media_type=document.content_type,
        filename=document.original_filename,
    )