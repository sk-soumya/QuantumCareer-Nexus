import json
import os
import urllib.error
import urllib.request

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.student_profile import StudentProfile
from app.core.dependencies import get_current_user
from app.schemas.resume_builder import (
    ResumeGenerateRequest,
    ResumeGeneratedResponse,
)

router = APIRouter(prefix="/resume", tags=["Resume Builder"])


OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://127.0.0.1:11434",
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen3:4b",
)


def _call_ollama(
    profile_data: dict,
) -> ResumeGeneratedResponse:
    """
    Send the student's profile to the local Ollama model and
    force the model to return the exact resume JSON structure.
    """

    output_schema = ResumeGeneratedResponse.model_json_schema()

    prompt = f"""
You are the AI Resume Builder inside a college placement platform.

Your task is to transform the student's supplied information into a
professional, ATS-friendly resume.

STRICT RULES:
1. NEVER invent facts.
2. NEVER invent an employer, internship, project, certification,
   degree, college, achievement, technology, job title, or skill.
3. Only use information explicitly provided in the student profile.
4. You may rewrite wording to make it clearer and more professional.
5. You may organize information into suitable resume sections.
6. Do not add fake numbers, fake metrics, fake dates, or fake accomplishments.
7. If information is missing, use an empty string or empty array.
8. Keep the language professional and concise.
9. Skills must only come from the supplied skills.
10. Projects must only come from the supplied projects.
11. Experience must only come from the supplied experience.
12. Certifications must only come from the supplied certifications.
13. Create an ATS-friendly professional summary from the available facts.
14. Create a concise headline based only on the supplied profile.
15. Return ONLY valid JSON matching the provided schema.

Student profile:

{json.dumps(profile_data, ensure_ascii=False, indent=2)}
""".strip()

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a careful resume-writing assistant. "
                    "Never fabricate student information."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "stream": False,
        "format": output_schema,
        "options": {
            "temperature": 0.2,
        },
    }

    request = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            raw_response = response.read().decode("utf-8")

    except urllib.error.HTTPError as exc:
        try:
            error_body = exc.read().decode("utf-8")
        except Exception:
            error_body = ""

        raise HTTPException(
            status_code=503,
            detail=(
                f"Ollama returned an error "
                f"({exc.code}). {error_body[:500]}"
            ),
        )

    except urllib.error.URLError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Could not connect to Ollama at "
                f"{OLLAMA_BASE_URL}. "
                "Make sure Ollama is running and qwen3:4b is installed."
            ),
        )

    except TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="The local AI model took too long to generate the resume.",
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected Ollama error: {str(exc)}",
        )

    try:
        response_data = json.loads(raw_response)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Ollama returned invalid JSON.",
        )

    message = response_data.get("message", {})
    content = message.get("content", "")

    if not content:
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an empty response.",
        )

    # Usually Ollama returns pure JSON because structured output
    # is enabled. This small fallback handles accidental markdown fences.
    content = content.strip()

    if content.startswith("```"):
        lines = content.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        content = "\n".join(lines).strip()

        if content.lower().startswith("json"):
            content = content[4:].lstrip()

    try:
        generated_data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="AI generated content could not be parsed as JSON.",
        )

    try:
        return ResumeGeneratedResponse.model_validate(generated_data)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI output did not match the resume schema: {str(exc)}",
        )


@router.post(
    "/generate",
    response_model=ResumeGeneratedResponse,
)
def generate_resume(
    request_data: ResumeGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate an ATS-friendly resume using the student's local Qwen model.
    """

    if current_user.role.upper() != "STUDENT":
        raise HTTPException(
            status_code=403,
            detail="Only student accounts can generate resumes.",
        )

    profile = (
        db.query(StudentProfile)
        .filter(StudentProfile.student_id == current_user.id)
        .first()
    )

    profile_data = {
        "full_name": current_user.full_name or request_data.full_name,
        "email": current_user.email or request_data.email,
        "phone": request_data.phone,
        "degree": request_data.degree,
        "department": request_data.department,
        "graduation_year": request_data.graduation_year,
        "cgpa": request_data.cgpa,
        "skills": request_data.skills,
        "projects": request_data.projects,
        "experience": request_data.experience,
        "certifications": request_data.certifications,
        "linkedin": request_data.linkedin,
        "github": request_data.github,
        "preferred_roles": request_data.preferred_roles,
        "career_objective": request_data.career_objective,
    }

    # Prefer values already saved in the student's database profile.
    # The request still acts as a fallback so the Resume Studio can
    # generate from freshly edited information before saving.
    if profile is not None:
        profile_data.update(
            {
                "phone": profile.phone or profile_data["phone"],
                "degree": profile.degree or profile_data["degree"],
                "department": (
                    profile.department
                    or profile_data["department"]
                ),
                "graduation_year": (
                    profile.graduation_year
                    if profile.graduation_year is not None
                    else profile_data["graduation_year"]
                ),
                "cgpa": (
                    profile.cgpa
                    if profile.cgpa is not None
                    else profile_data["cgpa"]
                ),
                "skills": profile.skills or profile_data["skills"],
                "projects": profile.projects or profile_data["projects"],
                "experience": (
                    profile.experience
                    or profile_data["experience"]
                ),
                "certifications": (
                    profile.certifications
                    or profile_data["certifications"]
                ),
                "linkedin": (
                    profile.linkedin
                    or profile_data["linkedin"]
                ),
                "github": profile.github or profile_data["github"],
                "preferred_roles": (
                    profile.preferred_roles
                    or profile_data["preferred_roles"]
                ),
                "career_objective": (
                    profile.career_objective
                    or profile_data["career_objective"]
                ),
            }
        )

    return _call_ollama(profile_data)