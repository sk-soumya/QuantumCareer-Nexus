from typing import Dict

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from app.ai.schemas.student_profile import StudentProfile
from app.ai.schemas.job import JobProfile

_embedding_model = None


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def _clean(values):
    return [
        str(value).strip()
        for value in values
        if str(value).strip()
    ]


def match_skill_group(student_skills, job_skills, threshold):
    student_skills = _clean(student_skills)
    job_skills = _clean(job_skills)

    if not job_skills:
        return [], [], {}

    if not student_skills:
        return [], job_skills, {skill: 0.0 for skill in job_skills}

    model = _get_embedding_model()
    student_embeddings = model.encode(
        student_skills,
        normalize_embeddings=True,
    )
    job_embeddings = model.encode(
        job_skills,
        normalize_embeddings=True,
    )

    similarity_matrix = cosine_similarity(
        job_embeddings,
        student_embeddings,
    )

    matched, missing, scores = [], [], {}
    for index, job_skill in enumerate(job_skills):
        best_score = float(similarity_matrix[index].max())
        scores[job_skill] = round(best_score, 3)
        if best_score >= threshold:
            matched.append(job_skill)
        else:
            missing.append(job_skill)

    return matched, missing, scores


def match_skills(
    student: StudentProfile,
    job: JobProfile,
    threshold: float = 0.65,
) -> Dict:
    required_matched, required_missing, required_scores = match_skill_group(
        student.skills,
        job.required_skills,
        threshold,
    )
    preferred_matched, preferred_missing, preferred_scores = match_skill_group(
        student.skills,
        job.preferred_skills,
        threshold,
    )

    return {
        "required_matched": required_matched,
        "required_missing": required_missing,
        "preferred_matched": preferred_matched,
        "preferred_missing": preferred_missing,
        "required_scores": required_scores,
        "preferred_scores": preferred_scores,
    }
