from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.placement_reminder_agent import (
    placement_overview,
    run_reminder_agent,
)

router = APIRouter(
    prefix="/placement-automation",
    tags=["Placement Automation"],
)


def _staff(current_user: User):
    if current_user.role not in {"PLACEMENT_OFFICER", "ADMIN"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only placement officers and admins can use placement automation.",
        )
    return current_user


@router.get("/overview")
def get_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _staff(current_user)
    return placement_overview(db)


@router.post("/run-reminder-agent")
def run_agent(
    dry_run: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _staff(current_user)
    return run_reminder_agent(db, dry_run=dry_run)


@router.get("/health")
def health(current_user: User = Depends(get_current_user)):
    _staff(current_user)
    return {
        "status": "ready",
        "agent": "CampusLink Placement Reminder Agent",
        "mode": "rule_engine_with_optional_local_ai",
        "message": "Automatic profile, application and selection reminders are enabled by the backend scheduler when configured.",
    }
