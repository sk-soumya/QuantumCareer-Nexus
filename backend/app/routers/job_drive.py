from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.company import Company
from app.models.job_drive import JobDrive
from app.models.user import User
from app.schemas.job_drive import (
    JobDriveCreate,
    JobDriveResponse,
    JobDriveStatusUpdate,
)


router = APIRouter(
    prefix="/job-drives",
    tags=["Job Drives"],
)


# ============================================================
# CREATE JOB DRIVE
# ============================================================

@router.post(
    "/",
    response_model=JobDriveResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job_drive(
    data: JobDriveCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only recruiters, placement officers and admins can create drives
    if current_user.role not in {
        "RECRUITER",
        "PLACEMENT_OFFICER",
        "ADMIN",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create job drives",
        )

    # Check company exists
    company = db.get(Company, data.company_id)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    # Basic CGPA validation
    if data.minimum_cgpa is not None:
        if data.minimum_cgpa < 0 or data.minimum_cgpa > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CGPA must be between 0 and 10",
            )

    job_drive = JobDrive(
        company_id=data.company_id,
        title=data.title,
        description=data.description,
        job_type=data.job_type,
        location=data.location,
        salary_package=data.salary_package,
        minimum_cgpa=data.minimum_cgpa,
        required_skills=data.required_skills,
        application_deadline=data.application_deadline,
        drive_status="OPEN",
        created_by=current_user.id,
    )

    db.add(job_drive)
    db.commit()
    db.refresh(job_drive)

    return job_drive


# ============================================================
# LIST JOB DRIVES
# ============================================================

@router.get(
    "/",
    response_model=list[JobDriveResponse],
)
def list_job_drives(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    drives = db.scalars(
        select(JobDrive)
        .order_by(JobDrive.created_at.desc())
    ).all()

    return drives


# ============================================================
# GET ONE JOB DRIVE
# ============================================================

@router.get(
    "/{job_drive_id}",
    response_model=JobDriveResponse,
)
def get_job_drive(
    job_drive_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job_drive = db.get(JobDrive, job_drive_id)

    if not job_drive:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job drive not found",
        )

    return job_drive


# ============================================================
# UPDATE JOB DRIVE STATUS
# ============================================================

@router.patch(
    "/{job_drive_id}/status",
    response_model=JobDriveResponse,
)
def update_job_drive_status(
    job_drive_id: int,
    data: JobDriveStatusUpdate,
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
            detail="You do not have permission to update job drives",
        )

    job_drive = db.get(JobDrive, job_drive_id)

    if not job_drive:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job drive not found",
        )

    if current_user.role == "RECRUITER" and job_drive.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job drive not found",
        )

    allowed_statuses = {
        "OPEN",
        "CLOSED",
        "PAUSED",
        "CANCELLED",
    }

    if data.drive_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid job drive status",
        )

    job_drive.drive_status = data.drive_status

    db.commit()
    db.refresh(job_drive)

    return job_drive