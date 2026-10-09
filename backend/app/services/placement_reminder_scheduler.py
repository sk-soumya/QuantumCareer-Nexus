from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.notification import Notification
from app.models.student_profile import StudentProfile
from app.models.user import User


def _columns(model) -> set[str]:
    return {
        column.name
        for column in model.__table__.columns
    }


def _make_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "PLACEMENT_REMINDER",
) -> bool:
    """
    Create a notification using only columns that actually exist
    in the current Notification model.

    This makes the reminder engine compatible with your existing
    CampusLink schema without forcing a database redesign.
    """
    available = _columns(Notification)

    values: dict[str, Any] = {}

    if "user_id" in available:
        values["user_id"] = user_id

    if "title" in available:
        values["title"] = title

    if "message" in available:
        values["message"] = message

    if "type" in available:
        values["type"] = notification_type
    elif "notification_type" in available:
        values["notification_type"] = notification_type

    if "is_read" in available:
        values["is_read"] = False

    if "read" in available:
        values["read"] = False

    if "created_at" in available:
        values["created_at"] = datetime.utcnow()

    notification = Notification(**values)
    db.add(notification)
    return True


def _profile_is_incomplete(profile: StudentProfile | None) -> bool:
    if profile is None:
        return True

    important_fields = [
        getattr(profile, "cgpa", None),
        getattr(profile, "skills", None),
        getattr(profile, "degree", None),
        getattr(profile, "department", None),
        getattr(profile, "graduation_year", None),
    ]

    missing = sum(
        1
        for value in important_fields
        if value is None or str(value).strip() == ""
    )

    # 2+ important fields missing => reminder
    return missing >= 2


def _application_status(application) -> str:
    return str(
        getattr(application, "status", "")
        or ""
    ).upper()


def _already_recently_notified(
    db: Session,
    student_id: int,
    title: str,
) -> bool:
    """
    Avoid notification spam.

    Uses the Notification table only when it contains the expected
    columns. Otherwise it safely returns False.
    """
    available = _columns(Notification)

    if "user_id" not in available or "title" not in available:
        return False

    created_column = None

    if "created_at" in available:
        created_column = Notification.created_at

    stmt = select(Notification).where(
        Notification.user_id == student_id,
        Notification.title == title,
    )

    if created_column is not None:
        stmt = stmt.where(
            created_column >= datetime.utcnow() - timedelta(days=1)
        )

    return db.scalar(stmt) is not None


def generate_student_reminders(
    db: Session,
    *,
    commit: bool = True,
) -> dict:
    """
    Intelligent automatic placement reminder engine.

    It checks:
    - incomplete student profiles
    - shortlisted students
    - selected students
    - students with pending application actions

    This is intentionally rule/scoring based rather than calling the LLM
    every few minutes. That keeps CampusLink fast and reliable.
    """

    created = 0
    skipped = 0
    details: list[dict[str, Any]] = []

    students = db.scalars(
        select(User).where(
            User.role == "STUDENT"
        )
    ).all()

    for student in students:

        profile = db.scalar(
            select(StudentProfile).where(
                StudentProfile.student_id == student.id
            )
        )

        # ---------------------------------------------------------
        # 1. PROFILE COMPLETION REMINDER
        # ---------------------------------------------------------
        if _profile_is_incomplete(profile):
            title = "Complete your CampusLink profile"

            if _already_recently_notified(
                db,
                student.id,
                title,
            ):
                skipped += 1
            else:
                message = (
                    "Your placement profile is incomplete. "
                    "Complete your education, CGPA, skills and profile "
                    "details before applying to placement drives."
                )

                _make_notification(
                    db,
                    user_id=student.id,
                    title=title,
                    message=message,
                    notification_type="PROFILE_REMINDER",
                )

                created += 1

                details.append(
                    {
                        "student_id": student.id,
                        "type": "PROFILE_REMINDER",
                        "priority": "HIGH",
                    }
                )

        # ---------------------------------------------------------
        # 2. APPLICATION / SELECTION REMINDERS
        # ---------------------------------------------------------
        applications = db.scalars(
            select(Application).where(
                Application.student_id == student.id
            )
        ).all()

        for application in applications:
            status = _application_status(application)

            if status in {
                "SHORTLISTED",
                "SELECTED",
                "OFFERED",
                "OFFER",
            }:
                title = (
                    "Placement selection update"
                    if status == "SHORTLISTED"
                    else "Congratulations — placement update"
                )

                if _already_recently_notified(
                    db,
                    student.id,
                    title,
                ):
                    skipped += 1
                    continue

                if status == "SHORTLISTED":
                    message = (
                        "You have been shortlisted for a placement opportunity. "
                        "Check your application and prepare for the next round."
                    )
                else:
                    message = (
                        "Your placement status has been updated. "
                        "Open your Applications / Offers section for the next steps."
                    )

                _make_notification(
                    db,
                    user_id=student.id,
                    title=title,
                    message=message,
                    notification_type="PLACEMENT_STATUS",
                )

                created += 1

                details.append(
                    {
                        "student_id": student.id,
                        "type": "PLACEMENT_STATUS",
                        "status": status,
                        "priority": "HIGH",
                    }
                )

            elif status in {
                "APPLIED",
                "PENDING",
                "SUBMITTED",
            }:
                title = "Check your pending placement application"

                if _already_recently_notified(
                    db,
                    student.id,
                    title,
                ):
                    skipped += 1
                    continue

                message = (
                    "You have a pending placement application. "
                    "Review your application status and make sure your "
                    "profile and documents are complete."
                )

                _make_notification(
                    db,
                    user_id=student.id,
                    title=title,
                    message=message,
                    notification_type="APPLICATION_REMINDER",
                )

                created += 1

                details.append(
                    {
                        "student_id": student.id,
                        "type": "APPLICATION_REMINDER",
                        "priority": "MEDIUM",
                    }
                )

    if commit:
        db.commit()

    return {
        "created": created,
        "skipped": skipped,
        "generated_at": datetime.utcnow().isoformat(),
        "details": details,
    }