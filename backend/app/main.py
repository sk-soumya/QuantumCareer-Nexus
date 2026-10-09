from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

# ============================================================
# MODELS
# ============================================================

from app.models.application import Application
from app.models.company import Company
from app.models.document import Document
from app.models.github_project_scan import GitHubProjectScan
from app.models.interviewer import Interviewer
from app.models.job_drive import JobDrive
from app.models.notification import Notification
from app.models.offer import Offer
from app.models.room import Room
from app.models.schedule import Schedule
from app.models.selection_round import SelectionRound
from app.models.student_document import StudentDocument
from app.models.student_profile import StudentProfile
from app.models.time_slot import TimeSlot
from app.models.user import User

# ============================================================
# ROUTERS
# ============================================================

from app.ai.member4_router import router as member4_ai_router
from app.ai.quantum_router import router as quantum_ai_router

from app.routers.ai_recommendations import (
    router as ai_recommendations_router,
)
from app.routers.application import router as application_router
from app.routers.auth import router as auth_router
from app.routers.company import router as company_router
from app.routers.document import router as document_router
from app.routers.interviewer import router as interviewer_router
from app.routers.job_drive import router as job_drive_router
from app.routers.notification import router as notification_router
from app.routers.offer import router as offer_router
from app.routers.placement_officer import (
    router as placement_officer_router,
)
from app.routers.rbac import router as rbac_router
from app.routers.resume import router as resume_router
from app.routers.resume_agent import (
    router as resume_agent_router,
)
from app.routers.resume_builder import (
    router as resume_builder_router,
)
from app.routers.resume_profile import (
    router as resume_profile_router,
)
from app.routers.room import router as room_router
from app.routers.schedule import router as schedule_router
from app.routers.scheduler import router as scheduler_router
from app.routers.selection_round import (
    router as selection_round_router,
)
from app.routers.student_directory import (
    router as student_directory_router,
)
from app.routers.student_documents import (
    router as student_documents_router,
)
from app.routers.student_profile import (
    router as student_profile_router,
)
from app.routers.time_slot import router as time_slot_router

# ============================================================
# OPTIONAL PLACEMENT REMINDER ROUTER
# ============================================================

placement_reminders_router = None

try:
    from app.routers.placement_reminders import (
        router as _placement_reminders_router,
    )

    placement_reminders_router = _placement_reminders_router

except ModuleNotFoundError as exc:
    if "placement_reminder_engine" in str(exc):
        print(
            "WARNING: placement reminder router disabled because "
            "app.services.placement_reminder_engine is missing."
        )
    else:
        raise

# ============================================================
# OPTIONAL REMINDER LOOP
# ============================================================

try:
    from app.services.reminder_scheduler import reminder_loop

except Exception as exc:
    reminder_loop = None

    print(
        "WARNING: reminder scheduler unavailable:",
        exc,
    )

# ============================================================
# LIFESPAN
# IMPORTANT: ONLY ONE lifespan function
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = None

    if reminder_loop is not None:
        try:
            task = asyncio.create_task(
                reminder_loop(),
                name="campuslink-reminder-loop",
            )

            print(
                "CampusLink automatic reminder scheduler started."
            )

        except Exception as exc:
            print(
                "WARNING: Could not start reminder scheduler:",
                exc,
            )

            task = None

    else:
        print(
            "WARNING: Automatic reminder scheduler is not running."
        )

    try:
        yield

    finally:
        if task is not None:
            task.cancel()

            try:
                await task

            except asyncio.CancelledError:
                pass

            except Exception as exc:
                print(
                    "WARNING: Reminder scheduler shutdown error:",
                    exc,
                )

        print(
            "CampusLink background services stopped."
        )

# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="CAMPUSLINK",
    description=(
        "AI-Powered Campus-to-Corporate Placement "
        "Management & Analytics Platform"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ============================================================
# CORS
# Allows localhost / 127.0.0.1 on ANY Vite port
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(
    bind=engine
)

# ============================================================
# ROUTER REGISTRATION
# ============================================================

# Placement / notification infrastructure
if placement_reminders_router is not None:
    app.include_router(
        placement_reminders_router
    )

app.include_router(
    notification_router
)

# Placement officer
app.include_router(
    placement_officer_router
)

# Student directory / documents
app.include_router(
    student_directory_router
)

app.include_router(
    student_documents_router
)

# AI
app.include_router(
    member4_ai_router
)

app.include_router(
    quantum_ai_router
)

app.include_router(
    ai_recommendations_router
)

# Authentication / RBAC
app.include_router(
    auth_router
)

app.include_router(
    rbac_router
)

# Student profile / resume
app.include_router(
    student_profile_router
)

app.include_router(
    resume_profile_router
)

app.include_router(
    resume_router
)

app.include_router(
    resume_builder_router
)

app.include_router(
    resume_agent_router
)

# Placement workflow
app.include_router(
    company_router
)

app.include_router(
    job_drive_router
)

app.include_router(
    application_router
)

app.include_router(
    selection_round_router
)

app.include_router(
    interviewer_router
)

app.include_router(
    room_router
)

app.include_router(
    time_slot_router
)

app.include_router(
    schedule_router
)

app.include_router(
    scheduler_router
)

app.include_router(
    offer_router
)

app.include_router(
    document_router
)

# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "application": "CAMPUSLINK",
        "module": "Placement Workflow & Scheduling",
        "status": "running",
    }

# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "CAMPUSLINK",
    }

# ============================================================
# AI / SYSTEM STATUS
# ============================================================

@app.get("/system/status")
def system_status():
    return {
        "application": "CAMPUSLINK",
        "backend": "online",
        "member4_ai": True,
        "notification_router": True,
        "placement_reminder_router": (
            placement_reminders_router is not None
        ),
        "reminder_scheduler": (
            reminder_loop is not None
        ),
    }