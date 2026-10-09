from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.services.notification_service import create_notification
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.application import Application
from app.models.interviewer import Interviewer
from app.models.room import Room
from app.models.schedule import Schedule
from app.models.selection_round import SelectionRound
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.schemas.schedule import (
    ScheduleCreate,
    ScheduleResponse,
)


router = APIRouter(
    prefix="/schedules",
    tags=["Schedules"],
)


# ============================================================
# CREATE SCHEDULE
# ============================================================

@router.post(
    "/",
    response_model=ScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_schedule(
    data: ScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Only placement officers and admins can manually schedule
    # --------------------------------------------------------

    if current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only placement officers and admins can create schedules",
        )

    # --------------------------------------------------------
    # Check selection round
    # --------------------------------------------------------

    selection_round = db.get(
        SelectionRound,
        data.selection_round_id,
    )

    if not selection_round:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selection round not found",
        )

    # --------------------------------------------------------
    # Get application -> student
    # --------------------------------------------------------

    application = db.get(
        Application,
        selection_round.application_id,
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    student_id = application.student_id

    # --------------------------------------------------------
    # Check interviewer
    # --------------------------------------------------------

    interviewer = db.get(
        Interviewer,
        data.interviewer_id,
    )

    if not interviewer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interviewer not found",
        )

    if not interviewer.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interviewer is inactive",
        )

    # --------------------------------------------------------
    # Check room
    # --------------------------------------------------------

    room = db.get(
        Room,
        data.room_id,
    )

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )

    if not room.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room is inactive",
        )

    # --------------------------------------------------------
    # Check time slot
    # --------------------------------------------------------

    time_slot = db.get(
        TimeSlot,
        data.time_slot_id,
    )

    if not time_slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time slot not found",
        )

    if not time_slot.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot is inactive",
        )

    # --------------------------------------------------------
    # CONFLICT 1:
    # Student already scheduled in this same time slot
    # --------------------------------------------------------

    student_conflict = db.scalar(
        select(Schedule).where(
            Schedule.student_id == student_id,
            Schedule.time_slot_id == data.time_slot_id,
            Schedule.status == "SCHEDULED",
        )
    )

    if student_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student already has a schedule in this time slot",
        )

    # --------------------------------------------------------
    # CONFLICT 2:
    # Interviewer already scheduled in this time slot
    # --------------------------------------------------------

    interviewer_conflict = db.scalar(
        select(Schedule).where(
            Schedule.interviewer_id == data.interviewer_id,
            Schedule.time_slot_id == data.time_slot_id,
            Schedule.status == "SCHEDULED",
        )
    )

    if interviewer_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interviewer is already booked in this time slot",
        )

    # --------------------------------------------------------
    # CONFLICT 3:
    # Room already booked in this time slot
    # --------------------------------------------------------

    room_conflict = db.scalar(
        select(Schedule).where(
            Schedule.room_id == data.room_id,
            Schedule.time_slot_id == data.time_slot_id,
            Schedule.status == "SCHEDULED",
        )
    )

    if room_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room is already booked in this time slot",
        )

    # --------------------------------------------------------
    # CONFLICT 4:
    # Same selection round already scheduled
    # --------------------------------------------------------

    round_conflict = db.scalar(
        select(Schedule).where(
            Schedule.selection_round_id == data.selection_round_id,
        )
    )

    if round_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This selection round is already scheduled",
        )

    # --------------------------------------------------------
    # Create schedule
    # --------------------------------------------------------

    schedule = Schedule(
        selection_round_id=data.selection_round_id,
        student_id=student_id,
        interviewer_id=data.interviewer_id,
        room_id=data.room_id,
        time_slot_id=data.time_slot_id,
        status="SCHEDULED",
        notes=data.notes,
    )

    db.add(schedule)

    # --------------------------------------------------------
    # Update selection round
    # --------------------------------------------------------

    selection_round.status = "SCHEDULED"
    selection_round.scheduled_at = datetime.utcnow()

    # --------------------------------------------------------
    # Create student notification
    # --------------------------------------------------------

    create_notification(
        db=db,
        user_id=student_id,
        title="Interview Scheduled",
        message=(
            "Your interview has been scheduled successfully. "
            "Please check your interview schedule."
        ),
        notification_type="INTERVIEW",
    )

    # --------------------------------------------------------
    # Save schedule + round + notification together
    # --------------------------------------------------------

    db.commit()
    db.refresh(schedule)

    return schedule


# ============================================================
# LIST MY SCHEDULES
# ============================================================

@router.get(
    "/my",
    response_model=list[ScheduleResponse],
)
def list_my_schedules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Only students can use this personal endpoint
    # --------------------------------------------------------

    if current_user.role != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can view their personal schedules",
        )

    schedules = db.scalars(
        select(Schedule)
        .where(
            Schedule.student_id == current_user.id
        )
        .order_by(
            Schedule.created_at.desc()
        )
    ).all()

    return schedules


# ============================================================
# LIST ALL SCHEDULES
# ============================================================

@router.get(
    "/",
    response_model=list[ScheduleResponse],
)
def list_schedules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Staff can view all schedules
    # --------------------------------------------------------

    if current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
        "RECRUITER",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view all schedules",
        )

    schedules = db.scalars(
        select(Schedule)
        .order_by(
            Schedule.created_at.desc()
        )
    ).all()

    return schedules


# ============================================================
# GET ONE SCHEDULE
# ============================================================

@router.get(
    "/{schedule_id}",
    response_model=ScheduleResponse,
)
def get_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = db.get(
        Schedule,
        schedule_id,
    )

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found",
        )

    # --------------------------------------------------------
    # Students can only view their own schedule
    # --------------------------------------------------------

    if current_user.role == "STUDENT":
        if schedule.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this schedule",
            )

    # --------------------------------------------------------
    # Staff can view schedules for any student, but not for other staff members
    # --------------------------------------------------------

    elif current_user.role not in {
        "PLACEMENT_OFFICER",
        "ADMIN",
        "RECRUITER",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this schedule",
        )

    return schedule