from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class JobDrive(Base):
    __tablename__ = "job_drives"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    job_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="FULL_TIME",
    )

    location: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    salary_package: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    minimum_cgpa: Mapped[float | None] = mapped_column(
        nullable=True,
    )

    required_skills: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    application_deadline: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    drive_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="OPEN",
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )