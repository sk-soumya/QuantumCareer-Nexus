from typing import List, Dict

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from app.ai.schemas.job import JobProfile


_model = None


def _embedding_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def create_job_text(job: JobProfile) -> str:
    return f"""
    Role:
    {job.role}

    Description:
    {job.description}

    Required Skills:
    {", ".join(job.required_skills)}

    Preferred Skills:
    {", ".join(job.preferred_skills)}

    Eligible Branches:
    {", ".join(job.eligible_branches)}

    Required Experience:
    {job.required_experience or ""}

    Preferred Experience:
    {job.preferred_experience or ""}
    """


def create_repository_text(repository: Dict) -> str:
    summary = repository.get("readme_summary", {})

    technologies = summary.get("technologies", [])
    frameworks = summary.get("frameworks", [])
    skills = summary.get("skills_demonstrated", [])
    features = summary.get("key_features", [])
    components = summary.get("technical_components", [])

    return f"""
    Repository:
    {repository.get("name", "")}

    README:
    {str(repository.get("readme", ""))[:12000]}

    Description:
    {repository.get("description", "")}

    Programming Language:
    {repository.get("language", "")}

    Project Summary:
    {summary.get("project_summary", "")}

    Domain:
    {summary.get("domain", "")}

    Technologies:
    {", ".join(technologies)}

    Frameworks:
    {", ".join(frameworks)}

    Skills Demonstrated:
    {", ".join(skills)}

    Key Features:
    {", ".join(features)}

    Technical Components:
    {", ".join(components)}
    """


def calculate_relevance_score(
    job_text: str,
    repository: Dict
) -> float:

    repository_text = create_repository_text(repository)

    model = _embedding_model()
    job_embedding = model.encode(
        [job_text],
        normalize_embeddings=True
    )

    repository_embedding = model.encode(
        [repository_text],
        normalize_embeddings=True
    )

    score = cosine_similarity(
        job_embedding,
        repository_embedding
    )[0][0]

    return round(float(score), 3)


def rank_repositories(
    job: JobProfile,
    repositories: List[Dict],
    top_k: int = 5
) -> List[Dict]:

    if not repositories:
        return []

    job_text = create_job_text(job)

    ranked = []

    for repository in repositories:

        relevance_score = calculate_relevance_score(
            job_text,
            repository
        )

        ranked.append({
            **repository,
            "relevance_score": relevance_score
        })

    ranked.sort(
        key=lambda repo: repo["relevance_score"],
        reverse=True
    )

    return ranked[:top_k]


def rank_repositories_for_job_context(
    job_context: str,
    repositories: List[Dict],
    top_k: int = 5,
) -> List[Dict]:
    """Rank public repository metadata and README text against a job description."""
    if not repositories:
        return []
    model = _embedding_model()
    job_embedding = model.encode([job_context], normalize_embeddings=True)
    repo_texts = [create_repository_text(repo) for repo in repositories]
    repo_embeddings = model.encode(repo_texts, normalize_embeddings=True)
    ranked = []
    for repository, embedding in zip(repositories, repo_embeddings):
        score = float((job_embedding[0] @ embedding).item())
        ranked.append({**repository, "relevance_score": round(score, 3)})
    ranked.sort(key=lambda item: item["relevance_score"], reverse=True)
    return ranked[:top_k]
