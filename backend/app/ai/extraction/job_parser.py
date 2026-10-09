from app.ai.local_llm import invoke_structured
from app.ai.schemas.job import JobProfile


def extract_jobrole(job_description: str) -> JobProfile:
    """Extract a structured job profile using local Qwen."""
    if not job_description.strip():
        raise ValueError("Job description cannot be empty.")

    prompt = f"""
You are CampusLink's job-description extraction engine.

Extract ONLY requirements explicitly stated in the job description.
Never invent requirements or eligibility rules.

Rules:
- Required skills go to required_skills.
- Preferred/nice-to-have/optional skills go to preferred_skills.
- Extract minimum CGPA, maximum backlogs, graduation year and branches
  only when explicitly stated.
- Never convert vague phrases such as "related branches" into a branch.
- Preserve required/preferred experience accurately.
- Extract required certifications only when stated.
- Extract location and employment type only when stated.
- Preserve the provided job description.
- Missing information must stay empty/null.

Job description:
----------------
{job_description}
----------------

Return only the JobProfile JSON.
"""
    return invoke_structured(JobProfile, prompt, temperature=0.1)
