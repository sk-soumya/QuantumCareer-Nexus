from functools import lru_cache

from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """
    Load the Sentence-BERT model once and reuse it.
    """

    return SentenceTransformer(MODEL_NAME)


def generate_embedding(
    text: str,
) -> list[float]:
    """
    Convert text into a normalized semantic embedding.
    """

    if not text or not text.strip():
        return []

    model = get_embedding_model()

    embedding = model.encode(
        text.strip(),
        normalize_embeddings=True,
    )

    return embedding.tolist()


def calculate_semantic_similarity(
    candidate_text: str,
    job_description: str,
) -> float:
    """
    Calculate semantic similarity between a candidate
    profile/resume and a job description.

    Returns a percentage from 0 to 100.
    """

    if not candidate_text.strip():
        return 0.0

    if not job_description.strip():
        return 0.0

    model = get_embedding_model()

    embeddings = model.encode(
        [
            candidate_text.strip(),
            job_description.strip(),
        ],
        normalize_embeddings=True,
    )

    similarity = float(
        embeddings[0] @ embeddings[1]
    )

    # Convert cosine-like similarity from [-1, 1]
    # into a readable percentage.
    percentage = (
        (similarity + 1.0) / 2.0
    ) * 100.0

    return round(
        max(0.0, min(100.0, percentage)),
        2,
    )