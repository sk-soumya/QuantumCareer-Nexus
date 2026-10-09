from pathlib import Path

import faiss
import numpy as np

from app.ai.embeddings import generate_embedding


# ============================================================
# VECTOR STORE CONFIGURATION
# ============================================================

VECTOR_DIMENSION = 384

BASE_DIR = Path(__file__).resolve().parents[2]
VECTOR_DIR = BASE_DIR / "data" / "vectors"

VECTOR_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

INDEX_PATH = VECTOR_DIR / "students.index"
METADATA_PATH = VECTOR_DIR / "students.npy"


# ============================================================
# CREATE EMPTY INDEX
# ============================================================

def create_index() -> faiss.Index:
    """
    Create a FAISS inner-product index.

    Our Sentence-BERT embeddings are normalized, so
    inner product behaves like cosine similarity.
    """

    return faiss.IndexFlatIP(
        VECTOR_DIMENSION
    )


# ============================================================
# LOAD EXISTING INDEX
# ============================================================

def load_index() -> faiss.Index:
    """
    Load the persisted student vector index.

    If no index exists yet, create a new empty index.
    """

    if INDEX_PATH.exists():
        return faiss.read_index(
            str(INDEX_PATH)
        )

    return create_index()


# ============================================================
# SAVE INDEX
# ============================================================

def save_index(index: faiss.Index) -> None:
    """
    Persist the FAISS index to disk.
    """

    faiss.write_index(
        index,
        str(INDEX_PATH),
    )


# ============================================================
# LOAD METADATA
# ============================================================

def load_metadata() -> list[int]:
    """
    Load student IDs corresponding to the vectors
    stored in the FAISS index.
    """

    if not METADATA_PATH.exists():
        return []

    data = np.load(
        METADATA_PATH,
        allow_pickle=False,
    )

    return [
        int(student_id)
        for student_id in data.tolist()
    ]


# ============================================================
# SAVE METADATA
# ============================================================

def save_metadata(
    student_ids: list[int],
) -> None:
    """
    Persist student IDs in the same order as FAISS vectors.
    """

    np.save(
        METADATA_PATH,
        np.asarray(
            student_ids,
            dtype=np.int64,
        ),
    )


# ============================================================
# ADD STUDENT VECTOR
# ============================================================

def add_student(
    student_id: int,
    profile_text: str,
) -> None:
    """
    Add one student's semantic profile to the FAISS index.

    The student's ID is stored separately as metadata.
    """

    embedding = generate_embedding(
        profile_text
    )

    if not embedding:
        raise ValueError(
            "Student profile text cannot be empty"
        )

    vector = np.asarray(
        [embedding],
        dtype=np.float32,
    )

    index = load_index()
    student_ids = load_metadata()

    # Prevent duplicate student vectors.
    if student_id in student_ids:
        return

    index.add(vector)

    student_ids.append(
        student_id
    )

    save_index(index)
    save_metadata(student_ids)


# ============================================================
# SEARCH STUDENTS
# ============================================================

def search_students(
    job_description: str,
    top_k: int = 10,
) -> list[dict]:
    """
    Find students whose semantic profiles are closest
    to the supplied job description.

    Returns student IDs and semantic similarity scores.
    """

    if not job_description.strip():
        return []

    index = load_index()
    student_ids = load_metadata()

    if index.ntotal == 0:
        return []

    top_k = max(
        1,
        min(
            top_k,
            index.ntotal,
        ),
    )

    query_embedding = generate_embedding(
        job_description
    )

    if not query_embedding:
        return []

    query_vector = np.asarray(
        [query_embedding],
        dtype=np.float32,
    )

    scores, indices = index.search(
        query_vector,
        top_k,
    )

    results = []

    for score, index_position in zip(
        scores[0],
        indices[0],
    ):
        if index_position < 0:
            continue

        if index_position >= len(student_ids):
            continue

        # Sentence-BERT vectors are normalized.
        # Inner-product score is therefore cosine similarity.
        similarity_percentage = (
            max(
                0.0,
                min(
                    1.0,
                    float(score),
                ),
            )
            * 100.0
        )

        results.append(
            {
                "student_id": student_ids[
                    index_position
                ],
                "semantic_score": round(
                    similarity_percentage,
                    2,
                ),
            }
        )

    return results