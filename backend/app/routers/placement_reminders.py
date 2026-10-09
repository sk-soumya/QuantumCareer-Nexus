from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.placement_reminder_engine import (
    generate_student_reminders,
)


router = APIRouter(
    prefix="/placement-reminders",
    tags=["Placement AI Reminders"],
)


@router.post("/run")
def run_reminder_engine(
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
            status_code=403,
            detail=(
                "Only placement officers "
                "and admins can run the "
                "placement reminder engine."
            ),
        )

    return generate_student_reminders(db)