from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.candidate_match import match_candidate_to_job
from app.models.application import Application
from app.models.job_drive import JobDrive
from app.models.student_profile import StudentProfile


def get_ranked_candidates_for_job(
    db: Session,
    job_drive_id: int,
) -> list[dict]:
    """
    Rank all applicants for one CAMPUSLINK JobDrive.

    Data sources:
        JobDrive
        Application
        StudentProfile

    Returns candidates ordered from strongest to weakest match.
    """

    # --------------------------------------------------------
    # Get job drive
    # --------------------------------------------------------

    job_drive = db.get(
        JobDrive,
        job_drive_id,
    )

    if not job_drive:
        raise ValueError(
            f"Job drive {job_drive_id} not found"
        )

    # --------------------------------------------------------
    # Get all applications for this job drive
    # --------------------------------------------------------

    applications = db.scalars(
        select(Application).where(
            Application.job_drive_id == job_drive_id
        )
    ).all()

    ranked_candidates = []

    # --------------------------------------------------------
    # Match every applicant
    # --------------------------------------------------------

    for application in applications:

        profile = db.scalar(
            select(StudentProfile).where(
                StudentProfile.student_id
                == application.student_id
            )
        )

        # Skip applicants who don't have an AI profile yet.
        if not profile:
            continue

        result = match_candidate_to_job(
            candidate_text=profile.resume_text or "",
            candidate_skills=profile.skills or "",
            candidate_cgpa=profile.cgpa,
            job_title=job_drive.title,
            job_description=job_drive.description or "",
            required_skills=job_drive.required_skills or "",
            minimum_cgpa=job_drive.minimum_cgpa,
        )

        ranked_candidates.append(
            {
                "rank": 0,
                "student_id": application.student_id,
                "application_id": application.id,
                "application_status": application.status,
                "job_drive_id": job_drive.id,
                **result,
            }
        )

    # --------------------------------------------------------
    # Sort:
    # 1. Eligible candidates first
    # 2. Highest overall score first
    # --------------------------------------------------------

    ranked_candidates.sort(
        key=lambda candidate: (
            candidate["is_eligible"],
            candidate["overall_score"],
        ),
        reverse=True,
    )

    # --------------------------------------------------------
    # Assign final ranking numbers
    # --------------------------------------------------------

    for rank, candidate in enumerate(
        ranked_candidates,
        start=1,
    ):
        candidate["rank"] = rank

    return ranked_candidates


def get_ranked_jobs_for_student(
    db: Session,
    student_id: int,
) -> list[dict]:
    """
    Rank all OPEN JobDrives for one student.

    The student's StudentProfile is matched against every
    currently OPEN job drive.

    Returns jobs ordered from strongest to weakest match.
    """

    # --------------------------------------------------------
    # Load student AI profile
    # --------------------------------------------------------

    profile = db.scalar(
        select(StudentProfile).where(
            StudentProfile.student_id == student_id
        )
    )

    if not profile:
        raise ValueError(
            "Student profile not found. "
            "Please complete your profile before using AI recommendations."
        )

    # --------------------------------------------------------
    # Load OPEN job drives
    # --------------------------------------------------------

    job_drives = db.scalars(
        select(JobDrive)
        .where(
            JobDrive.drive_status == "OPEN"
        )
        .order_by(
            JobDrive.created_at.desc()
        )
    ).all()

    # --------------------------------------------------------
    # Load student's existing applications
    # --------------------------------------------------------

    applications = db.scalars(
        select(Application).where(
            Application.student_id == student_id
        )
    ).all()

    application_map = {
        application.job_drive_id: application
        for application in applications
    }

    ranked_jobs = []

    # --------------------------------------------------------
    # Match student against every OPEN job
    # --------------------------------------------------------

    for job_drive in job_drives:

        result = match_candidate_to_job(
            candidate_text=profile.resume_text or "",
            candidate_skills=profile.skills or "",
            candidate_cgpa=profile.cgpa,
            job_title=job_drive.title,
            job_description=job_drive.description or "",
            required_skills=job_drive.required_skills or "",
            minimum_cgpa=job_drive.minimum_cgpa,
        )

        application = application_map.get(
            job_drive.id
        )

        ranked_jobs.append(
            {
                "rank": 0,
                "job_drive_id": job_drive.id,
                "job_title": job_drive.title,
                "description": job_drive.description,
                "job_type": job_drive.job_type,
                "location": job_drive.location,
                "salary_package": job_drive.salary_package,
                "minimum_cgpa": job_drive.minimum_cgpa,
                "required_skills": job_drive.required_skills,
                "application_deadline": job_drive.application_deadline,
                "drive_status": job_drive.drive_status,
                "application_id": (
                    application.id
                    if application
                    else None
                ),
                "application_status": (
                    application.status
                    if application
                    else None
                ),
                "already_applied": (
                    application is not None
                ),
                **result,
            }
        )

    # --------------------------------------------------------
    # Sort:
    # 1. Eligible jobs first
    # 2. Highest overall score first
    # --------------------------------------------------------

    ranked_jobs.sort(
        key=lambda job: (
            job["is_eligible"],
            job["overall_score"],
        ),
        reverse=True,
    )

    # --------------------------------------------------------
    # Assign recommendation rank
    # --------------------------------------------------------

    for rank, job in enumerate(
        ranked_jobs,
        start=1,
    ):
        job["rank"] = rank

    return ranked_jobs