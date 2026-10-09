from app.ai.local_llm import invoke_structured
from app.ai.recommendation.resource_pipeline import get_learning_resources
from app.ai.schemas.job import JobProfile
from app.ai.schemas.preparation_plan import PreparationPlan


def generate_preparation_plan(
    job: JobProfile,
    skill_gap: dict,
) -> PreparationPlan:
    required_gaps = skill_gap.get("required_skill_gaps", [])
    preferred_gaps = skill_gap.get("preferred_skill_gaps", [])
    all_gaps = required_gaps + preferred_gaps

    resource_context = []
    for skill in all_gaps:
        for resource in get_learning_resources(skill=skill, top_k=3):
            resource_context.append(
                {
                    "skill": skill,
                    "title": resource.get("title"),
                    "source": resource.get("source"),
                    "content": resource.get("content"),
                }
            )

    resource_text = "\n\n".join(
        f"Skill: {item['skill']}\n"
        f"Title: {item['title']}\n"
        f"Source: {item['source']}\n"
        f"Content: {item['content']}"
        for item in resource_context
    )

    prompt = f"""
Create a practical placement preparation plan for a college student.

Job:
Company: {job.company}
Role: {job.role}
Description: {job.description}
Required skills: {job.required_skills}
Preferred skills: {job.preferred_skills}

Required skill gaps:
{required_gaps}

Preferred skill gaps:
{preferred_gaps}

Retrieved learning resources:
{resource_text}

Rules:
- Prioritize missing required skills.
- Do not claim preferred skills are mandatory.
- Do not invent company or hiring-process facts.
- Recommend specific topics and practical projects.
- Keep the plan achievable.
- Use retrieved resources when useful.
- Return only PreparationPlan JSON.
"""
    return invoke_structured(PreparationPlan, prompt, temperature=0.2)
