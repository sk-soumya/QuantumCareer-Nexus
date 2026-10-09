from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/ai/quantum",
    tags=["Quantum AI"],
)


class QuantumChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    page: str = Field(default="CampusLink")
    path: str = Field(default="/")
    role: str = Field(default="STUDENT")
    context: Dict[str, Any] = Field(default_factory=dict)
    conversation: List[Dict[str, str]] = Field(default_factory=list, max_length=12)


class QuantumAction(BaseModel):
    label: str
    path: Optional[str] = None
    reason: Optional[str] = None


def _norm(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _role(role: str) -> str:
    value = _norm(role).upper()
    if value in {"STUDENT", "RECRUITER", "PLACEMENT_OFFICER", "ADMIN"}:
        return value
    return "STUDENT"


def _money(value: Any) -> str:
    return _norm(value) or "Not stated"


def _extract_line(text: str, patterns: List[str]) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, re.I | re.M)
        if match and match.group(1):
            return _norm(match.group(1))[:220]
    return "Not clearly stated"


def summarize_offer(text: str) -> str:
    text = str(text or "").strip()
    if not text:
        return (
            "Paste the offer letter text here and I’ll turn it into a quick decision summary: "
            "role, CTC/salary, fixed vs variable pay, location, joining date, probation, "
            "bond/service clause, notice period, deadlines and points to verify."
        )

    role = _extract_line(text, [
        r"(?:designation|role|position|job title)\s*[:\-]\s*([^\n]+)",
    ])
    salary = _extract_line(text, [
        r"(?:ctc|salary|compensation|package|pay)\s*[:\-]?\s*([^\n]+)",
        r"((?:₹|rs\.?|inr)\s*[\d,.]+\s*(?:lpa|lakhs?|lakh|per annum)?)",
        r"(\d+(?:\.\d+)?\s*(?:lpa|lakhs?|lakh|per annum))",
    ])
    location = _extract_line(text, [
        r"(?:location|work location|posting|base location)\s*[:\-]\s*([^\n]+)",
    ])
    joining = _extract_line(text, [
        r"(?:joining date|date of joining|join on)\s*[:\-]\s*([^\n]+)",
    ])
    probation = _extract_line(text, [
        r"(?:probation)\s*[:\-]?\s*([^\n]+)",
    ])
    bond = _extract_line(text, [
        r"(?:bond|service agreement|minimum service|service commitment)\s*[:\-]?\s*([^\n]+)",
    ])
    notice = _extract_line(text, [
        r"(?:notice period)\s*[:\-]?\s*([^\n]+)",
    ])
    deadline = _extract_line(text, [
        r"(?:acceptance deadline|respond by|offer valid until|deadline)\s*[:\-]\s*([^\n]+)",
    ])

    return "\n".join([
        "Offer summary",
        f"• Role: {role}",
        f"• CTC / salary: {salary}",
        f"• Location: {location}",
        f"• Joining date: {joining}",
        f"• Probation: {probation}",
        f"• Bond / service commitment: {bond}",
        f"• Notice period: {notice}",
        f"• Acceptance deadline: {deadline}",
        "",
        "Verify in the original document: fixed vs variable compensation, deductions, "
        "probation terms, bond/penalty language, work location, joining conditions and response deadline.",
        "Quantum AI only summarized the text provided; it does not make the acceptance decision for you.",
    ])


def _page_help(page: str, role: str) -> str:
    key = _norm(page).lower()
    if "student" in key and "dashboard" in key:
        return "Student Dashboard is your placement command center: Profile → Resume AI → Resume Maker AI → Job Drives → Applications → Interviews → Offers → Documents → AI Recommendations."
    if "job drive" in key or "job drives" in key:
        return "Job Drives is where you inspect recruiter-created opportunities. Check eligibility, minimum CGPA, required skills, location, job type, salary, deadline and selection stages before applying."
    if "application" in key:
        return "Applications tracks where each submitted application is in the hiring pipeline. Look for submitted, shortlisted, assessment, interview, selected or offer-related status and take the next action shown."
    if "interview" in key or "selection" in key:
        return "This page helps you understand the current selection stage, schedule and next checkpoint. Prepare around the drive requirements, your projects and the skills the recruiter requested."
    if "offer" in key:
        return "Offers is where you review issued offers. Check role, salary/CTC, location, joining date, conditions and acceptance deadline before responding."
    if "resume maker" in key:
        return "Resume Maker AI turns your verified profile into an editable resume. Type directly into the sections, use concise drafting help, choose a template, preview the A4 page and save/export after review."
    if "resume" in key:
        return "Resume AI extracts profile signals from your PDF, highlights strengths and gaps, then hands the verified data to Resume Maker AI for editing and export."
    if "profile" in key:
        return "My Profile is the source of truth for recruiter visibility and matching. Complete education, CGPA, skills, projects, experience, links and preferences."
    if "recommend" in key:
        return "AI Recommendations ranks opportunities using the available profile and job signals. Compare eligibility, skill coverage, semantic fit, location and deadline rather than relying on one score."
    if "document" in key:
        return "Documents keeps placement files organized so required documents are ready when a recruiter or drive needs them."
    if "recruiter" in key:
        return "Recruiter workspace: company profile → job drives → applications → AI candidate review → interviews → offers."
    if "placement" in key:
        return "Placement Officer workspace: monitor students, participating companies, job drives, applications, selection rounds, schedules, offers and placement outcomes."
    if "admin" in key:
        return "Admin workspace manages platform users, roles, recruiters, placement officers, companies, drives, applications, scheduling, offers, documents, notifications and audit activity."
    return f"You are currently on {page}. Quantum AI can explain this feature, guide the next action, or take you to the most relevant CampusLink page."


def _drive_context_answer(page_data: Dict[str, Any]) -> str:
    title = _norm(page_data.get("title") or page_data.get("job_title") or "This job drive")
    company = _norm(page_data.get("company") or page_data.get("company_name") or "Unknown company")
    location = _norm(page_data.get("location")) or "Not stated"
    job_type = _norm(page_data.get("job_type")) or "Not stated"
    salary = _money(page_data.get("salary"))
    min_cgpa = _norm(page_data.get("minimum_cgpa") or page_data.get("min_cgpa")) or "Not stated"
    deadline = _norm(page_data.get("application_deadline") or page_data.get("deadline")) or "Not stated"
    skills = page_data.get("required_skills") or page_data.get("skills") or []
    if isinstance(skills, str):
        skills_text = skills
    else:
        skills_text = ", ".join(str(x) for x in skills) if skills else "Not stated"
    stages = page_data.get("selection_stages") or page_data.get("stages") or []
    stages_text = " → ".join(str(x) for x in stages) if stages else "Not stated"
    return "\n".join([
        f"{title} · {company}",
        f"Location: {location}",
        f"Job type: {job_type}",
        f"Salary: {salary}",
        f"Minimum CGPA: {min_cgpa}",
        f"Deadline: {deadline}",
        f"Required skills: {skills_text}",
        f"Selection stages: {stages_text}",
        "",
        "What to do: verify eligibility first, then compare your profile against the required skills and deadline before applying.",
    ])


def agent_reply(req: QuantumChatRequest) -> Dict[str, Any]:
    role = _role(req.role)
    message = _norm(req.message)
    q = message.lower()
    page = _norm(req.page) or "CampusLink"
    context = req.context if isinstance(req.context, dict) else {}
    page_data = context.get("page_data") if isinstance(context.get("page_data"), dict) else {}
    actions: List[QuantumAction] = []

    def add_action(label: str, path: Optional[str], reason: str):
        actions.append(QuantumAction(label=label, path=path, reason=reason))

    if page_data and ("drive" in q or "job" in q or "should i apply" in q or "eligible" in q):
        answer = _drive_context_answer(page_data)
        if role == "STUDENT":
            add_action("Open Job Drives", "/student/jobs", "Review or apply to opportunities")
            add_action("Open Applications", "/student/applications", "Track submitted applications")
        return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "drive-explain", "reply": answer, "actions": [a.model_dump() for a in actions]}

    if "offer" in q or "ctc" in q or "salary" in q or "joining" in q:
        answer = summarize_offer(message if len(message) > 120 or "offer" in q else "")
        add_action("Open Offers", "/student/offers" if role == "STUDENT" else "/placement/offers", "Review offer records")
        return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "offer", "reply": answer, "actions": [a.model_dump() for a in actions]}

    if "apply" in q or "application" in q or "how do i apply" in q:
        if role == "STUDENT":
            answer = "To apply: open Job Drives → select the drive → verify CGPA, skills, location, salary and deadline → review required documents → Apply → confirm submission. Then track the application from Applications."
            add_action("Open Job Drives", "/student/jobs", "Find and inspect the drive")
            add_action("Open Applications", "/student/applications", "Track application status")
        else:
            answer = "Applications is the hiring pipeline workspace for recruiters and placement officers. Review candidate progress, shortlisting, selection rounds and offer movement from the current workflow."
            add_action("Open Applications", "/recruiter/applications" if role == "RECRUITER" else "/placement/applications", "Review application pipeline")
        return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "apply", "reply": answer, "actions": [a.model_dump() for a in actions]}

    if "hiring process" in q or "selection process" in q or "recruitment process" in q or "what happens after apply" in q:
        answer = (
            "Student flow: Job Drive → Eligibility Check → Application → Shortlisting → Assessment / Selection Round → Interview → Offer → Acceptance. "
            "The exact stages come from the recruiter’s drive."
            if role == "STUDENT" else
            "Recruiter flow: Company → Job Drive → Eligibility & Stages → Applications → Shortlisting → Selection Rounds → Interviews → Offers. "
            "Placement officers monitor and coordinate the same pipeline across participating employers."
        )
        add_action("Open Job Drives", "/student/jobs" if role == "STUDENT" else ("/recruiter/jobs" if role == "RECRUITER" else "/placement/jobs"), "Inspect active hiring stages")
        return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "process", "reply": answer, "actions": [a.model_dump() for a in actions]}

    if "resume" in q or "cv" in q:
        answer = "Use Resume AI to analyze the PDF, review strength and gaps, then open Resume Maker AI. Quantum AI can help shorten your summary, polish skills and write concise project or experience bullets from facts already in your profile."
        add_action("Open Resume AI", "/student/resume-ai" if role == "STUDENT" else "/recruiter/ai-candidates", "Work on resume or candidate intelligence")
        if role == "STUDENT":
            add_action("Open Resume Maker", "/student/resume", "Edit and build the final A4 resume")
        return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "resume", "reply": answer, "actions": [a.model_dump() for a in actions]}

    if "feature" in q or "how does this work" in q or "explain this page" in q or "what is this" in q:
        answer = _page_help(page, role)
        return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "feature", "reply": answer, "actions": [a.model_dump() for a in actions]}

    if "what should i do next" in q or "next step" in q or "what do i do here" in q:
        answer = _page_help(page, role)
        if role == "STUDENT":
            if "job" in page.lower():
                add_action("Open Applications", "/student/applications", "Track progress after applying")
            elif "application" in page.lower():
                add_action("Open Interviews", "/student/interviews", "Check the next selection stage")
            elif "interview" in page.lower():
                add_action("Open Offers", "/student/offers", "Review an offer if selected")
            elif "resume" in page.lower():
                add_action("Open Resume Maker", "/student/resume", "Build the final resume")
            else:
                add_action("Open Job Drives", "/student/jobs", "Find your next placement opportunity")
        return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "next", "reply": answer, "actions": [a.model_dump() for a in actions]}

    if "recommend" in q or "best job" in q or "which job" in q or "match" in q:
        answer = "Open AI Recommendations and compare eligibility, skill coverage, semantic fit, location and deadline. Use the ranking to prioritize attention, but treat eligibility as a gate."
        add_action("Open AI Recommendations", "/student/recommendations" if role == "STUDENT" else "/recruiter/ai-candidates", "Review AI-ranked opportunities or candidates")
        return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "recommendations", "reply": answer, "actions": [a.model_dump() for a in actions]}

    if "interview" in q:
        answer = "Check the interview stage, date, time and company information. Prepare around the job description, your strongest projects, core skills and concise STAR stories for problem-solving and teamwork."
        add_action("Open Interviews", "/student/interviews" if role == "STUDENT" else ("/recruiter/interviews" if role == "RECRUITER" else "/placement/scheduling"), "Review interview and schedule details")
        return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "interview", "reply": answer, "actions": [a.model_dump() for a in actions]}

    answer = _page_help(page, role) + " Ask me ‘what should I do next?’, ‘how do I apply?’, ‘explain the hiring process’, ‘summarize this offer’, or ‘improve my resume’."
    return {"success": True, "assistant": "Quantum AI", "mode": "fast-agent", "intent": "general", "reply": answer, "actions": [a.model_dump() for a in actions]}


@router.post("/chat")
def quantum_chat(request: QuantumChatRequest) -> Dict[str, Any]:
    return agent_reply(request)


@router.get("/health")
def quantum_health() -> Dict[str, Any]:
    return {
        "success": True,
        "assistant": "Quantum AI",
        "status": "ready",
        "mode": "fast-agent",
        "llm_required": False,
    }
