from fastapi.middleware.cors import CORSMiddleware
from app.ai.member4_router import router as member4_ai_router
from fastapi import FastAPI
from app.routers.resume_builder import router as resume_builder_router
from app.models.student_profile import StudentProfile
from app.database import Base, engine
from fastapi.middleware.cors import CORSMiddleware
# =========================================================== SO WE HAVE TO DO THE PROGRAMMING I N THE MAIN.PY FILE OF THE BACKEND FOLDER AND WE HAVE TO IMPORT ALL THE MODELS AND ROUTERS OF THE APPLICATION SO THAT THEY ARE REGISTERED WITH SQLALCHEMY AND FASTAPI RESPECTIVELY
# MODELS ITS REQUIRED TO IMPORT ALL MODELS HERE SO THAT THEY ARE REGISTERED WITH SQLALCHEMY
# ============================================================
from app.routers.student_profile import router as student_profile_router
from app.models.application import Application
from app.models.company import Company
from app.models.document import Document
from app.models.interviewer import Interviewer
from app.models.job_drive import JobDrive
from app.models.offer import Offer
from app.models.room import Room
from app.models.schedule import Schedule
from app.models.selection_round import SelectionRound
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.models.notification import Notification
from app.routers.notification import router as notification_router

# ============================================================
# ROUTERS FILE WHICH CONTAINS ALL THE ROUTES FOR THE APPLICATION
# ============================================================
from app.routers.resume_profile import router as resume_profile_router
from app.routers.application import router as application_router
from app.routers.auth import router as auth_router
from app.routers.company import router as company_router
from app.routers.document import router as document_router
from app.routers.interviewer import router as interviewer_router
from app.routers.job_drive import router as job_drive_router
from app.routers.offer import router as offer_router
from app.routers.rbac import router as rbac_router
from app.routers.room import router as room_router
from app.routers.schedule import router as schedule_router
from app.routers.scheduler import router as scheduler_router
from app.routers.selection_round import router as selection_round_router
from app.routers.time_slot import router as time_slot_router
from app.routers.ai_recommendations import router as ai_recommendations_router
from app.routers.resume import router as resume_router
from app.routers.resume_agent import router as resume_agent_router
app = FastAPI(
    title="CAMPUSLINK",
    description=(
        "AI-Powered Campus-to-Corporate Placement "
        "Management & Analytics Platform"
    ),
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE IT MEAN THE DATABASE TABLES WILL BE CREATED IF NOT EXISTS
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# ROUTERS ITS MEANS THE ROUTES OF THE APPLICATION WILL BE REGISTERED WITH FASTAPI
# ============================================================

app.include_router(member4_ai_router)
app.include_router(resume_profile_router)
app.include_router(auth_router)
app.include_router(rbac_router)
app.include_router(company_router)
app.include_router(job_drive_router)
app.include_router(application_router)
app.include_router(selection_round_router)
app.include_router(interviewer_router)
app.include_router(room_router)
app.include_router(time_slot_router)
app.include_router(schedule_router)
app.include_router(scheduler_router)
app.include_router(offer_router)
app.include_router(document_router)
app.include_router(notification_router)
app.include_router(student_profile_router)
app.include_router(ai_recommendations_router)
app.include_router(resume_router)
app.include_router(resume_builder_router)
app.include_router(resume_agent_router)

# ============================================================
# ROOT ITS MEANS THE ROOT ROUTE OF THE APPLICATION
# ============================================================

@app.get("/")
def root():
    return {
        "application": "CAMPUSLINK",
        "module": "Placement Workflow & Scheduling",
        "status": "running",
    }


# ============================================================
# HEALTH IT MEANS THE HEALTH CHECK ROUTE OF THE APPLICATION
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }