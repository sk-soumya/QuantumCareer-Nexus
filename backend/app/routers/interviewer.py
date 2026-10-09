from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.company import Company
from app.models.interviewer import Interviewer
from app.models.user import User
from app.schemas.interviewer import (
    InterviewerCreate,
    InterviewerResponse,
)


router = APIRouter(
    prefix="/interviewers",
    tags=["Interviewers"],
)


# ============================================================
# CREATE INTERVIEWER
# ============================================================

@router.post(
    "/",
    response_model=InterviewerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interviewer(
    data: InterviewerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {
        "RECRUITER",
        "PLACEMENT_OFFICER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create interviewers",
        )

    company = db.get(
        Company,
        data.company_id,
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    existing_interviewer = db.scalar(
        select(Interviewer).where(
            Interviewer.email == data.email
        )
    )

    if existing_interviewer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An interviewer with this email already exists",
        )

    interviewer = Interviewer(
        company_id=data.company_id,
        name=data.name,
        email=data.email,
        is_active=True,
    )

    db.add(interviewer)
    db.commit()
    db.refresh(interviewer)

    return interviewer


# ============================================================
# LIST INTERVIEWERS
# ============================================================

@router.get(
    "/",
    response_model=list[InterviewerResponse],
)
def list_interviewers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interviewers = db.scalars(
        select(Interviewer)
        .order_by(Interviewer.name)
    ).all()

    return interviewers


# ============================================================
# GET ONE INTERVIEWER
# ============================================================

@router.get(
    "/{interviewer_id}",
    response_model=InterviewerResponse,
)
def get_interviewer(
    interviewer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interviewer = db.get(
        Interviewer,
        interviewer_id,
    )

    if not interviewer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interviewer not found",
        )

    return interviewer