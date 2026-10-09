from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.application import Application
from app.models.job_drive import JobDrive
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
)
from app.services.notification_service import create_notification
from app.services.github_project_service import queue_github_scan_after_application

router = APIRouter(
    prefix="/applications",
    tags=["Applications"],
)


# ============================================================
# STUDENT: APPLY FOR A JOB DRIVE
# ============================================================

@router.post(
    "/",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def apply_for_job(
    data: ApplicationCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only students can apply
    if current_user.role != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can apply for jobs",
        )

    # Check whether job drive exists
    job_drive = db.get(JobDrive, data.job_drive_id)

    if not job_drive:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job drive not found",
        )

    # Check whether drive is open
    if job_drive.drive_status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job drive is not open for applications",
        )

    # Check duplicate application
    existing_application = db.scalar(
        select(Application).where(
            Application.student_id == current_user.id,
            Application.job_drive_id == data.job_drive_id,
        )
    )

    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied to this job drive",
        )

    application = Application(
        student_id=current_user.id,
        job_drive_id=data.job_drive_id,
        status="APPLIED",
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    try:
        queue_github_scan_after_application(
            background_tasks,
            db,
            student_id=current_user.id,
            job_drive_id=job_drive.id,
        )
    except Exception:
        db.rollback()

    return application


# ============================================================
# STUDENT: VIEW OWN APPLICATIONS
# ============================================================

@router.get(
    "/my",
    response_model=list[ApplicationResponse],
)
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    applications = db.scalars(
        select(Application)
        .where(
            Application.student_id == current_user.id
        )
        .order_by(Application.applied_at.desc())
    ).all()

    return applications


# ============================================================
# RECRUITER / PLACEMENT OFFICER: VIEW ALL APPLICATIONS
# ============================================================

@router.get(
    "/",
    response_model=list[ApplicationResponse],
)
def get_all_applications(
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
            detail="You do not have permission to view all applications",
        )

    applications_query = (
        select(Application)
        .join(JobDrive, Application.job_drive_id == JobDrive.id)
        .where(JobDrive.created_by == current_user.id)
    )

    applications = db.scalars(
        applications_query.order_by(Application.applied_at.desc())
    ).all()

    return applications


# ============================================================
# RECRUITER / PLACEMENT OFFICER / ADMIN:
# UPDATE APPLICATION STATUS
# ============================================================

@router.patch(
    "/{application_id}/status",
    response_model=ApplicationResponse,
)
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
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
            detail="You do not have permission to update applications",
        )

    application = db.get(
        Application,
        application_id,
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    job_drive = db.get(JobDrive, application.job_drive_id)
    if not job_drive or job_drive.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    allowed_statuses = {
        "APPLIED",
        "SHORTLISTED",
        "REJECTED",
        "INTERVIEW",
        "SELECTED",
        "OFFERED",
        "ACCEPTED",
        "WITHDRAWN",
    }

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid application status",
        )

    previous_status = application.status
    application.status = data.status

    # ============================================================
    # NOTIFICATION: APPLICATION SHORTLISTED
    # ============================================================

    if (
        data.status == "SHORTLISTED"
        and previous_status != "SHORTLISTED"
    ):
        create_notification(
            db=db,
            user_id=application.student_id,
            title="Application Shortlisted",
            message=(
                f"Your application #{application.id} "
                "has been shortlisted."
            ),
            notification_type="APPLICATION",
        )

    # ============================================================
    # NOTIFICATION: APPLICATION REJECTED
    # ============================================================

    elif (
        data.status == "REJECTED"
        and previous_status != "REJECTED"
    ):
        create_notification(
            db=db,
            user_id=application.student_id,
            title="Application Rejected",
            message=(
                f"Your application #{application.id} "
                "has been rejected."
            ),
            notification_type="APPLICATION",
        )

    db.commit()
    db.refresh(application)

    return application