from typing import List
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from langchain_openrouter import ChatOpenRouter
from pathlib import Path

load_dotenv(Path(__file__).with_name(".env"), override=False)
load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=False)

class ProjectAnalysis(BaseModel):
    project_title: str

    technical_complexity: str
    technical_depth: str

    technologies_verified: List[str] = Field(default_factory=list)
    technical_components_verified: List[str] = Field(default_factory=list)

    architecture_summary: str

    implementation_evidence: List[str] = Field(default_factory=list)

    strengths: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)

    job_relevance: str

    project_quality_score: float = Field(
    ge=0,
    le=10
    )

llm = ChatOpenRouter(
    model="openrouter/free",
    temperature=0.2
)

structured_llm = llm.with_structured_output(ProjectAnalysis)


def analyze_project(
    project_data: str,
    job_context: str
) -> ProjectAnalysis:

    prompt = f"""
    You are analyzing a student's GitHub project for a campus placement
    assessment system.

    Analyze ONLY the evidence provided below.

    Evaluate:
    - technical complexity
    - technical depth
    - technologies actually demonstrated
    - technical components
    - architecture
    - implementation evidence
    - strengths
    - limitations
    - relevance to the target job

    Do not assume that a technology is used merely because it appears
    in the README. Prefer actual repository/code evidence.

    Do not invent information.

    TARGET JOB:
    ----------------
    {job_context}
    ----------------

    PROJECT EVIDENCE:
    ----------------
    {project_data}
    ----------------

    Return a structured project analysis.
    """

    return structured_llm.invoke(prompt)
