from __future__ import annotations

import json
from typing import Any, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/resume", tags=["Resume AI Agent"])

class ResumeAgentRequest(BaseModel):
    field: Literal["all","career_objective","skills","projects","experience","certifications","preferred_roles"]
    text: str = ""
    instruction: str = ""
    style: Literal["ats","concise","impact","targeted"] = "ats"
    profile: dict[str, Any] = Field(default_factory=dict)

class ResumeAgentResponse(BaseModel):
    text: str
    sections: dict[str, str] | None = None

SYSTEM_PROMPT="""You are CampusLink Resume Agent. Rewrite only content supported by the supplied student data. Never invent employers, dates, degrees, grades, metrics, technologies, clients, certifications, awards, job titles, or achievements. Improve clarity, grammar, structure, ATS relevance, and professional tone. Keep factual meaning unchanged. For field=all return JSON with career_objective, skills, projects, experience, certifications, preferred_roles, text. For a single section return JSON with text. Do not use markdown fences."""
STYLE={"ats":"Use ATS-friendly wording and standard headings.","concise":"Be compact and remove repetition.","impact":"Use strong action verbs only when supported by the source; never fabricate metrics.","targeted":"Prioritize the target role and relevant skills while preserving facts."}

def profile_context(profile: dict[str, Any]) -> str:
    keys=["full_name","degree","department","graduation_year","cgpa","skills","projects","experience","certifications","preferred_roles","career_objective"]
    return "\
".join(f"{k}: {profile.get(k,'')}" for k in keys)

@router.post("/agent-edit", response_model=ResumeAgentResponse)
def agent_edit(data: ResumeAgentRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can use the Resume Agent.")
    prompt=f"""Rewrite requested resume content.

Target: {data.field}
Style: {STYLE[data.style]}
Instruction: {data.instruction or 'Improve professionally while preserving all facts.'}

Student profile:
{profile_context(data.profile)}

Current content:
{data.text}

Return valid JSON only. For field=all use exactly career_objective, skills, projects, experience, certifications, preferred_roles, text. Otherwise return exactly text."""
    try:
        response=httpx.post("http://127.0.0.1:11434/api/chat",json={"model":"qwen3:4b","stream":False,"format":"json","messages":[{"role":"system","content":SYSTEM_PROMPT},{"role":"user","content":prompt}],"options":{"temperature":0.2}},timeout=120)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Local Resume Agent unavailable: {exc}") from exc
    if response.status_code!=200:
        raise HTTPException(status_code=503, detail=f"Ollama returned HTTP {response.status_code}.")
    try:
        payload=response.json()
        result=json.loads(payload.get("message",{}).get("content", ""))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Resume Agent returned invalid JSON: {exc}") from exc
    if data.field=="all":
        sections={k:str(result.get(k,"")).strip() for k in ["career_objective","skills","projects","experience","certifications","preferred_roles"]}
        combined=str(result.get("text","")).strip() or "\
\
".join(f"{k.replace('_',' ').title()}\
{v}" for k,v in sections.items() if v)
        return ResumeAgentResponse(text=combined,sections=sections)
    text=str(result.get("text","")).strip()
    if not text:
        raise HTTPException(status_code=502, detail="Resume Agent returned empty text.")
    return ResumeAgentResponse(text=text)
