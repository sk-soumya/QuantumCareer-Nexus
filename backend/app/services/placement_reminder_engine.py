from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.inspection import inspect as sa_inspect
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.notification import Notification
from app.models.student_profile import StudentProfile
from app.models.user import User


PROFILE_WEIGHTS = {
    "phone": 8,
    "degree": 10,
    "department": 8,
    "graduation_year": 8,
    "cgpa": 8,
    "skills": 14,
    "projects": 12,
    "experience": 8,
    "certifications": 5,
    "linkedin": 5,
    "github": 5,
    "career_objective": 5,
    "resume_text": 4,
    "profile_photo_url": 3,
}

PROFILE_TITLE = "Complete your CampusLink profile"
SELECTION_TITLE = "Placement application update"


def _value_present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def profile_completeness(profile: StudentProfile | None) -> tuple[int, list[str]]:
    if profile is None:
        return 0, list(PROFILE_WEIGHTS)

    total = sum(PROFILE_WEIGHTS.values())
    score = 0
    missing: list[str] = []

    for field, weight in PROFILE_WEIGHTS.items():
        value = getattr(profile, field, None)
        if _value_present(value):
            score += weight
        else:
            missing.append(field)

    percentage = round((score / total) * 100) if total else 0
    return percentage, missing


def _notification_fields() -> set[str]:
    return {column.name for column in sa_inspect(Notification).columns}


def _build_notification_kwargs(
    *,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "PLACEMENT",
) -> dict[str, Any]:
    fields = _notification_fields()
    kwargs: dict[str, Any] = {}

    candidates = {
        "user_id": user_id,
        "student_id": user_id,
        "title": title,
        "subject": title,
        "message": message,
        "body": message,
        "notification_type": notification_type,
        "type": notification_type,
        "is_read": False,
        "read": False,
    }

    for key, value in candidates.items():
        if key in fields and key not in kwargs:
            kwargs[key] = value

    return kwargs


def _notification_exists_recently(
    db: Session,
    *,
    user_id: int,
    title: str,
    hours: int = 24,
) -> bool:
    fields = _notification_fields()

    user_field = None
    for candidate in ("user_id", "student_id"):
        if candidate in fields:
            user_field = getattr(Notification, candidate)
            break

    if user_field is None or not hasattr(Notification, "title"):
        return False

    cutoff = datetime.utcnow() - timedelta(hours=hours)

    conditions = [
        user_field == user_id,
        Notification.title == title,
    ]

    created_field = None
    for candidate in ("created_at", "created_on", "timestamp"):
        if candidate in fields:
            created_field = getattr(Notification, candidate)
            break

    if created_field is not None:
        conditions.append(created_field >= cutoff)

    notification = db.scalar(
        select(Notification).where(*conditions).limit(1)
    )
    return notification is not None


def _create_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    message: str,
    force: bool = False,
) -> bool:
    if not force and _notification_exists_recently(
        db,
        user_id=user_id,
        title=title,
    ):
        return False

    kwargs = _build_notification_kwargs(
        user_id=user_id,
        title=title,
        message=message,
    )

    if not kwargs:
        return False

    try:
        db.add(Notification(**kwargs))
        return True
    except TypeError:
        # Do not break the entire reminder run when a project's notification
        # schema has a slightly different optional field set.
        return False


def _application_status(application: Application) -> str:
    value = getattr(application, "status", "")
    return str(getattr(value, "value", value) or "").upper()


def _application_student_id(application: Application) -> int | None:
    for candidate in ("student_id", "user_id"):
        value = getattr(application, candidate, None)
        if value is not None:
            try:
                return int(value)
            except (TypeError, ValueError):
                return None
    return None


def generate_student_reminders(
    db: Session,
    *,
    notify_selected: bool = True,
    notify_rejected: bool = True,
    notify_incomplete_profile: bool = True,
) -> dict[str, Any]:
    """Create fast, duplicate-safe placement reminders.

    This is intentionally deterministic and lightweight. It does not block on
    an LLM: the priority model uses profile completeness + application state so
    the placement officer's automation remains responsive.
    """
    students = db.scalars(
        select(User).where(User.role == "STUDENT")
    ).all()

    profiles = {
        profile.student_id: profile
        for profile in db.scalars(select(StudentProfile)).all()
    }

    applications = db.scalars(select(Application)).all()

    created = 0
    incomplete_profiles = 0
    selected = 0
    not_selected = 0
    skipped_duplicates = 0

    for student in students:
        profile = profiles.get(student.id)
        completeness, missing = profile_completeness(profile)

        if notify_incomplete_profile and completeness < 85:
            incomplete_profiles += 1
            readable = ", ".join(
                item.replace("_", " ") for item in missing[:5]
            )
            more = "" if len(missing) <= 5 else " and more"
            message = (
                f"Your CampusLink profile is {completeness}% complete. "
                f"Please finish: {readable}{more}. "
                "A complete profile improves placement matching and recruiter visibility."
            )

            if _create_notification(
                db,
                user_id=student.id,
                title=PROFILE_TITLE,
                message=message,
            ):
                created += 1
            else:
                skipped_duplicates += 1

    for application in applications:
        student_id = _application_student_id(application)
        if student_id is None:
            continue

        status = _application_status(application)
        application_id = getattr(application, "id", "")

        if notify_selected and status in {
            "SELECTED",
            "SHORTLISTED",
            "OFFERED",
            "HIRED",
        }:
            selected += 1
            message = (
                f"Your placement application #{application_id} has been marked "
                f"{status.title()}. Open CampusLink to review the next step."
            )
            title = "Congratulations — placement update"

            if _create_notification(
                db,
                user_id=student_id,
                title=title,
                message=message,
            ):
                created += 1
            else:
                skipped_duplicates += 1

        elif notify_rejected and status in {
            "REJECTED",
            "NOT_SELECTED",
            "NOT SELECTED",
            "DECLINED",
        }:
            not_selected += 1
            message = (
                f"Your placement application #{application_id} has been marked "
                f"{status.replace('_', ' ').title()}. Review your profile and "
                "continue applying to suitable drives on CampusLink."
            )
            title = "Placement application update"

            if _create_notification(
                db,
                user_id=student_id,
                title=title,
                message=message,
            ):
                created += 1
            else:
                skipped_duplicates += 1

    db.commit()

    return {
        "students_scanned": len(students),
        "incomplete_profiles": incomplete_profiles,
        "selected_updates": selected,
        "not_selected_updates": not_selected,
        "notifications_created": created,
        "duplicate_notifications_skipped": skipped_duplicates,
        "ran_at": datetime.utcnow().isoformat(),
    }
