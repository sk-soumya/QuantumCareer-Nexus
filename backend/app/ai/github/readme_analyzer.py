from dotenv import load_dotenv
from langchain_openrouter import ChatOpenRouter
from pydantic import BaseModel, Field
from typing import List

load_dotenv()


class ReadmeSummary(BaseModel):
    project_title: str
    project_summary: str
    domain: str
    technologies: List[str] = Field(default_factory=list)
    frameworks: List[str] = Field(default_factory=list)
    key_features: List[str] = Field(default_factory=list)
    technical_components: List[str] = Field(default_factory=list)
    deployment: List[str] = Field(default_factory=list)
    datasets: List[str] = Field(default_factory=list)
    models: List[str] = Field(default_factory=list)
    skills_demonstrated: List[str] = Field(default_factory=list)


llm = ChatOpenRouter(
    model="openrouter/free",
    temperature=0.2
)

structured_llm = llm.with_structured_output(ReadmeSummary)


def analyze_readme(readme: str) -> ReadmeSummary:
    prompt = f"""
    You are analyzing a student's GitHub project README for a campus placement
    and employability assessment system.

    Read the COMPLETE README below and extract only information supported by it.

    Identify:
    - Project title
    - What the project does
    - Project domain
    - Technologies used
    - Frameworks/libraries used
    - Important features
    - Important technical components such as ML models, APIs, databases,
    architectures, algorithms, etc.
    - Deployment platforms if explicitly mentioned
    - Technical skills demonstrated by the project

    Do NOT invent information.
    Do NOT assume a technology was used just because it is common for the project.
    If something is not mentioned, return an empty list or a suitable empty value.

    README:
    ----------------
    {readme}
    ----------------
    """

    return structured_llm.invoke(prompt)


if __name__ == "__main__":
    readme = """
    paste your README here
    """

    result = analyze_readme(readme)

    print(result.model_dump_json(indent=2))