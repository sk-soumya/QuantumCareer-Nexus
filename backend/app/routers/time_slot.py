from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.schemas.time_slot import (
    TimeSlotCreate,
    TimeSlotResponse,
)


router = APIRouter(
    prefix="/time-slots",
    tags=["Time Slots"],
)


# ============================================================
# CREATE TIME SLOT
# ============================================================

@router.post(
    "/",
    response_model=TimeSlotResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_time_slot(
    data: TimeSlotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only placement officers and admins can create time slots",
        )

    existing_slot = db.scalar(
        select(TimeSlot).where(
            TimeSlot.slot_date == data.slot_date,
            TimeSlot.start_time == data.start_time,
            TimeSlot.end_time == data.end_time,
        )
    )

    if existing_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This time slot already exists",
        )

    time_slot = TimeSlot(
        slot_date=data.slot_date,
        start_time=data.start_time,
        end_time=data.end_time,
        is_active=True,
    )

    db.add(time_slot)
    db.commit()
    db.refresh(time_slot)

    return time_slot


# ============================================================
# LIST TIME SLOTS
# ============================================================

@router.get(
    "/",
    response_model=list[TimeSlotResponse],
)
def list_time_slots(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slots = db.scalars(
        select(TimeSlot).order_by(
            TimeSlot.slot_date,
            TimeSlot.start_time,
        )
    ).all()

    return slots


# ============================================================
# GET ONE TIME SLOT
# ============================================================

@router.get(
    "/{slot_id}",
    response_model=TimeSlotResponse,
)
def get_time_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slot = db.get(
        TimeSlot,
        slot_id,
    )

    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time slot not found",
        )

    return slot