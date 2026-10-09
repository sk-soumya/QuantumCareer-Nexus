from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.application import Application
from app.models.selection_round import SelectionRound
from app.models.user import User
from app.schemas.selection_round import (
    SelectionRoundCreate,
    SelectionRoundResponse,
    SelectionRoundStatusUpdate,
)


router = APIRouter(
    prefix="/selection-rounds",
    tags=["Selection Rounds"],
)


# ============================================================
# CREATE SELECTION ROUND
# ============================================================

@router.post(
    "/",
    response_model=SelectionRoundResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_selection_round(
    data: SelectionRoundCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Recruiter / Placement Officer / Admin only
    if current_user.role not in {
        "RECRUITER",
        "PLACEMENT_OFFICER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create selection rounds",
        )

    # Check application
    application = db.get(
        Application,
        data.application_id,
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    # A round should normally be created only after shortlisting
    if application.status not in {
        "SHORTLISTED",
        "INTERVIEW",
        "SELECTED",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student must be shortlisted before creating a selection round",
        )

    # Validate round number
    if data.round_number < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Round number must be at least 1",
        )

    allowed_round_types = {
        "ONLINE_TEST",
        "TECHNICAL_INTERVIEW",
        "HR_INTERVIEW",
        "GROUP_DISCUSSION",
        "FINAL_INTERVIEW",
    }

    if data.round_type not in allowed_round_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid round type",
        )

    # Prevent duplicate round number for same application
    existing_round = db.scalar(
        select(SelectionRound).where(
            SelectionRound.application_id == data.application_id,
            SelectionRound.round_number == data.round_number,
        )
    )

    if existing_round:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This round number already exists for the application",
        )

    selection_round = SelectionRound(
        application_id=data.application_id,
        round_number=data.round_number,
        round_type=data.round_type,
        title=data.title,
        description=data.description,
        status="PENDING",
    )

    db.add(selection_round)
    db.commit()
    db.refresh(selection_round)

    return selection_round


# ============================================================
# LIST SELECTION ROUNDS
# ============================================================

@router.get(
    "/",
    response_model=list[SelectionRoundResponse],
)
def list_selection_rounds(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rounds = db.scalars(
        select(SelectionRound)
        .order_by(
            SelectionRound.application_id,
            SelectionRound.round_number,
        )
    ).all()

    return rounds


# ============================================================
# GET ONE SELECTION ROUND
# ============================================================

@router.get(
    "/{round_id}",
    response_model=SelectionRoundResponse,
)
def get_selection_round(
    round_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    selection_round = db.get(
        SelectionRound,
        round_id,
    )

    if not selection_round:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selection round not found",
        )

    return selection_round


# ============================================================
# UPDATE ROUND STATUS / RESULT
# ============================================================

@router.patch(
    "/{round_id}/status",
    response_model=SelectionRoundResponse,
)
def update_selection_round(
    round_id: int,
    data: SelectionRoundStatusUpdate,
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
            detail="You do not have permission to update selection rounds",
        )

    selection_round = db.get(
        SelectionRound,
        round_id,
    )

    if not selection_round:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selection round not found",
        )

    allowed_statuses = {
        "PENDING",
        "SCHEDULED",
        "COMPLETED",
        "CANCELLED",
    }

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid round status",
        )

    allowed_results = {
        None,
        "PASS",
        "FAIL",
        "SELECTED",
        "REJECTED",
    }

    if data.result not in allowed_results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid round result",
        )

    selection_round.status = data.status
    selection_round.result = data.result

    db.commit()
    db.refresh(selection_round)

    return selection_round