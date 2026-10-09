from __future__ import annotations

import os
import re
from typing import Any, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/api/quantum",
    tags=["Quantum AI"],
)

OLLAMA_URL = os.getenv("QUANTUM_OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
OLLAMA_MODEL = os.getenv("QUANTUM_AI_MODEL", "qwen3:1.7b")
OLLAMA_TIMEOUT = float(os.getenv("QUANTUM_AI_TIMEOUT_SECONDS", "4"))


class QuantumRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    page: str = Field(default="", max_length=300)
    role: str = Field(default="STUDENT", max_length=40)
    context: str = Field(default="", max_length=10000)
    locale: str = Field(default="en", max_length=10)


FEATURES = {
    "dashboard": "Your dashboard gives you the current CampusLink status, shortcuts and pending actions.",
    "profile": "My Profile stores your academic, skills, contact and career information used across CampusLink.",
    "resume": "Resume AI analyzes your PDF, while Resume Maker AI turns the verified information into an editable A4 resume.",
    "jobs": "Job Drives contains recruiter-created opportunities, eligibility requirements, deadlines, locations, salary details and application actions.",
    "applications": "Applications tracks the jobs you applied to and their current recruitment status.",
    "interviews": "Interviews/Scheduling shows selection rounds, dates, times, rooms or meeting details and status updates.",
    "offers": "Offers contains recruiter offers, compensation details, status and the actions available to you.",
    "documents": "Documents keeps your uploaded placement documents and related verification material.",
    "notifications": "Notifications keeps important job-drive, application, interview and offer updates in one place.",
    "recommendations": "AI Recommendations ranks opportunities using your skills, resume/profile signals, eligibility and semantic relevance.",
    "placement": "Placement Officer tools manage students, companies, job drives, applications, selection rounds, scheduling and offers.",
}

FEATURE_ROUTES = {
    "profile": "/student/profile",
    "resume": "/student/resume-ai",
    "jobs": "/student/jobs",
    "applications": "/student/applications",
    "interviews": "/student/interviews",
    "offers": "/student/offers",
    "documents": "/student/documents",
    "notifications": "/student/notifications",
    "recommendations": "/student/recommendations",
    "dashboard": "/student",
}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def page_key(page: str) -> str:
    value = (page or "").lower()
    if "recommend" in value:
        return "recommendations"
    if "resume" in value:
        return "resume"
    if "application" in value:
        return "applications"
    if "interview" in value or "schedule" in value:
        return "interviews"
    if "offer" in value:
        return "offers"
    if "document" in value:
        return "documents"
    if "notification" in value:
        return "notifications"
    if "profile" in value:
        return "profile"
    if "job" in value or "drive" in value:
        return "jobs"
    if "placement" in value or "student" in value:
        return "placement" if "placement" in value else "dashboard"
    return "dashboard"


def contains_any(text: str, words: tuple[str, ...]) -> bool:
    return any(word in text for word in words)


def extract_context_value(context: str, labels: tuple[str, ...]) -> Optional[str]:
    lines = [line.strip() for line in context.splitlines() if line.strip()]
    for line in lines:
        lower = line.lower()
        if any(label in lower for label in labels):
            return line[:260]
    return None


def local_answer(req: QuantumRequest) -> Optional[dict[str, Any]]:
    q = clean_text(req.message).lower()
    key = page_key(req.page)

    if contains_any(q, ("how do i apply", "apply for job", "how to apply", "apply job", "application process")):
        return {
            "answer": (
                "Open Job Drives, choose an active drive, check eligibility and the deadline, review the role details, "
                "then use Apply. After submission, monitor Applications for shortlist, selection-round and interview updates."
            ),
            "title": "How to apply",
            "actions": [{"label": "Open Job Drives", "route": "/student/jobs"}, {"label": "View Applications", "route": "/student/applications"}],
            "confidence": 0.98,
        }

    if contains_any(q, ("hiring process", "recruitment process", "selection process", "what happens after applying", "how hiring works")):
        return {
            "answer": (
                "CampusLink hiring flow is: Job Drive published → eligibility check → student application → recruiter shortlist → "
                "selection/interview rounds → scheduled assessment/interview → result/selection → offer → student acceptance. "
                "The exact number of rounds depends on the drive."
            ),
            "title": "CampusLink hiring process",
            "actions": [{"label": "Open Job Drives", "route": "/student/jobs"}, {"label": "Track Applications", "route": "/student/applications"}, {"label": "View Interviews", "route": "/student/interviews"}],
            "confidence": 0.99,
        }

    if contains_any(q, ("summarize offer", "summary of offer", "explain offer", "offer details", "offer letter")):
        company = extract_context_value(req.context, ("company",))
        salary = extract_context_value(req.context, ("salary", "ctc", "compensation", "lpa"))
        deadline = extract_context_value(req.context, ("deadline", "expires", "joining"))
        details = [x for x in (company, salary, deadline) if x]
        if details:
            return {
                "answer": "Offer summary from the current page: " + " · ".join(details) + ". Review the complete offer document before accepting.",
                "title": "Offer summary",
                "actions": [{"label": "Open Offers", "route": "/student/offers"}, {"label": "Open Documents", "route": "/student/documents"}],
                "confidence": 0.96,
            }
        return {
            "answer": "I can summarize an offer from the details currently visible on the page. Open the offer or paste the offer text here, and I will highlight company, role, compensation, location, joining conditions and important dates.",
            "title": "Offer summary",
            "actions": [{"label": "Open Offers", "route": "/student/offers"}],
            "confidence": 0.97,
        }

    if contains_any(q, ("resume", "cv", "resume maker", "resume ai", "improve my resume")):
        return {
            "answer": (
                "CampusLink has two connected resume tools: Resume AI extracts profile signals from your PDF, and Resume Maker AI turns the reviewed data into an editable resume. "
                "Use the agent to draft your summary, skill wording and project/experience bullets, then approve the text before saving."
            ),
            "title": "Resume intelligence",
            "actions": [{"label": "Open Resume AI", "route": "/student/resume-ai"}, {"label": "Open Resume Maker", "route": "/student/resume"}],
            "confidence": 0.99,
        }

    if contains_any(q, ("recommendation", "recommended jobs", "best job", "match score", "why this job")):
        return {
            "answer": (
                "AI Recommendations is designed to explain why a job matches you using skills, semantic relevance, CGPA/eligibility and missing skills. "
                "Treat the score as decision support: always verify the drive's eligibility and deadline before applying."
            ),
            "title": "AI job recommendations",
            "actions": [{"label": "Open Recommendations", "route": "/student/recommendations"}],
            "confidence": 0.98,
        }

    if contains_any(q, ("what is this page", "explain this page", "what can i do here", "guide me", "how does this work")):
        description = FEATURES.get(key, FEATURES["dashboard"])
        route = FEATURE_ROUTES.get(key)
        actions = [{"label": "Open this feature", "route": route}] if route else []
        return {
            "answer": description + " I can also explain the next step, required inputs and what outcome you should expect.",
            "title": f"About {key}",
            "actions": actions,
            "confidence": 0.97,
        }

    if contains_any(q, ("what should i do", "next step", "next action", "what now")):
        key = page_key(req.page)
        next_map = {
            "dashboard": ("Start by completing your profile, then check Job Drives and AI Recommendations.", "/student/jobs"),
            "profile": ("Complete the profile fields that matter for eligibility and matching, then save it.", "/student/profile"),
            "jobs": ("Open a drive, verify eligibility and deadline, then apply. Track the result from Applications.", "/student/jobs"),
            "applications": ("Check any application marked shortlisted, selected or requiring an interview, then open the related interview details.", "/student/applications"),
            "interviews": ("Review the next round date/time and meeting or room details, then prepare against the role requirements.", "/student/interviews"),
            "offers": ("Read the compensation, role, location, joining date and conditions before accepting an offer.", "/student/offers"),
            "resume": ("Review the extracted resume information, improve the weak sections with Resume Maker AI, then export the final version.", "/student/resume"),
            "recommendations": ("Open the top matches, compare missing skills and eligibility, then apply to the strongest eligible drive.", "/student/recommendations"),
        }
        answer, route = next_map.get(key, (FEATURES["dashboard"], "/student"))
        return {"answer": answer, "title": "Recommended next step", "actions": [{"label": "Go there", "route": route}], "confidence": 0.96}

    return None


def llm_answer(req: QuantumRequest) -> Optional[dict[str, Any]]:
    prompt = f"""
You are Quantum AI, the in-app career and placement assistant for CampusLink.
Answer quickly, accurately and practically.

You help with:
- explaining every CampusLink feature and page
- guiding students through job-drive applications
- explaining the hiring/selection process
- explaining resumes, Resume AI and Resume Maker AI
- explaining applications, interviews, scheduling and offers
- summarizing offer information visible in the supplied context
- explaining placement-office workflows when the user is an officer

Accuracy rules:
- Use only the product knowledge and CURRENT PAGE CONTEXT supplied below.
- Never invent a company, salary, deadline, eligibility rule, interview date, offer condition or user record.
- If the current context does not contain a fact, say that you do not have that fact and tell the user where to check it.
- Give concrete next steps and mention the relevant CampusLink page.
- Keep the answer under 180 words.
- Do not mention prompts, models, APIs or internal processing.
- Use simple professional English unless the user uses another language.

CURRENT PAGE: {req.page}
USER ROLE: {req.role}
CURRENT PAGE CONTEXT:
{req.context[:7000]}

USER QUESTION:
{req.message}
"""

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "keep_alive": "10m",
        "options": {"temperature": 0.15, "num_predict": 220},
        "messages": [
            {"role": "system", "content": "You are a concise, fact-grounded CampusLink assistant."},
            {"role": "user", "content": prompt},
        ],
    }

    try:
        with httpx.Client(timeout=OLLAMA_TIMEOUT) as client:
            response = client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            data = response.json()
        content = clean_text((data.get("message") or {}).get("content", ""))
        if not content:
            return None
        return {
            "answer": content,
            "title": "Quantum AI",
            "actions": [],
            "confidence": 0.82,
        }
    except Exception:
        return None


@router.post("/ask")
def quantum_ask(req: QuantumRequest) -> dict[str, Any]:
    fast = local_answer(req)
    if fast:
        return {
            "brand": "Quantum AI",
            "mode": "fast-agent",
            **fast,
        }

    ai = llm_answer(req)
    if ai:
        return {
            "brand": "Quantum AI",
            "mode": "deep-agent",
            **ai,
        }

    return {
        "brand": "Quantum AI",
        "mode": "safe-fallback",
        "title": "Quantum AI",
        "answer": (
            "I can guide you through CampusLink, but I do not have enough verified information for that question from the current page. "
            "Tell me the page or feature you are using, or open the relevant record, and I will guide you step by step."
        ),
        "actions": [],
        "confidence": 0.70,
    }
