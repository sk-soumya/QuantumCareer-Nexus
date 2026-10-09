from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class GitHubProjectScan(Base):
    __tablename__ = "github_project_scans"
    __table_args__ = (
        UniqueConstraint("student_id", "month_key", name="uq_github_scan_student_month"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    job_drive_id: Mapped[int | None] = mapped_column(ForeignKey("job_drives.id"), nullable=True, index=True)
    month_key: Mapped[str] = mapped_column(String(7), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="QUEUED")
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    repositories: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
