from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.interviewer import Interviewer
from app.models.job_drive import JobDrive
from app.models.room import Room
from app.models.schedule import Schedule
from app.models.selection_round import SelectionRound
from app.models.time_slot import TimeSlot


def is_student_available(
    db: Session,
    student_id: int,
    time_slot_id: int,
) -> bool:
    existing_schedule = db.scalar(
        select(Schedule).where(
            Schedule.student_id == student_id,
            Schedule.time_slot_id == time_slot_id,
            Schedule.status == "SCHEDULED",
        )
    )

    return existing_schedule is None


def is_interviewer_available(
    db: Session,
    interviewer_id: int,
    time_slot_id: int,
) -> bool:
    existing_schedule = db.scalar(
        select(Schedule).where(
            Schedule.interviewer_id == interviewer_id,
            Schedule.time_slot_id == time_slot_id,
            Schedule.status == "SCHEDULED",
        )
    )

    return existing_schedule is None


def is_room_available(
    db: Session,
    room_id: int,
    time_slot_id: int,
) -> bool:
    existing_schedule = db.scalar(
        select(Schedule).where(
            Schedule.room_id == room_id,
            Schedule.time_slot_id == time_slot_id,
            Schedule.status == "SCHEDULED",
        )
    )

    return existing_schedule is None


def find_available_assignment(
    db: Session,
    selection_round: SelectionRound,
):
    # --------------------------------------------------------
    # Get the application
    # --------------------------------------------------------

    application = db.get(
        Application,
        selection_round.application_id,
    )

    if not application:
        return None

    student_id = application.student_id

    # --------------------------------------------------------
    # Get the job drive
    # --------------------------------------------------------

    job_drive = db.get(
        JobDrive,
        application.job_drive_id,
    )

    if not job_drive:
        return None

    # --------------------------------------------------------
    # Get the company for this job drive
    # --------------------------------------------------------

    company_id = job_drive.company_id

    # --------------------------------------------------------
    # Get active time slots
    # --------------------------------------------------------

    time_slots = db.scalars(
        select(TimeSlot)
        .where(TimeSlot.is_active.is_(True))
        .order_by(
            TimeSlot.slot_date,
            TimeSlot.start_time,
        )
    ).all()

    # --------------------------------------------------------
    # Get only active interviewers from this company
    # --------------------------------------------------------

    interviewers = db.scalars(
        select(Interviewer)
        .where(
            Interviewer.is_active.is_(True),
            Interviewer.company_id == company_id,
        )
        .order_by(Interviewer.id)
    ).all()

    # --------------------------------------------------------
    # Get active rooms
    # --------------------------------------------------------

    rooms = db.scalars(
        select(Room)
        .where(Room.is_active.is_(True))
        .order_by(Room.id)
    ).all()

    # --------------------------------------------------------
    # Try every combination
    # --------------------------------------------------------

    for time_slot in time_slots:

        if not is_student_available(
            db,
            student_id,
            time_slot.id,
        ):
            continue

        for interviewer in interviewers:

            if not is_interviewer_available(
                db,
                interviewer.id,
                time_slot.id,
            ):
                continue

            for room in rooms:

                if not is_room_available(
                    db,
                    room.id,
                    time_slot.id,
                ):
                    continue

                # We found a valid combination
                return {
                    "student_id": student_id,
                    "interviewer_id": interviewer.id,
                    "room_id": room.id,
                    "time_slot_id": time_slot.id,
                }

    return None