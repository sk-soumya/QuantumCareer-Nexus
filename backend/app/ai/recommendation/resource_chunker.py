from typing import List

from app.ai.schemas.learning_resource import LearningResource


CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def chunk_learning_resource(
    resource: LearningResource,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[dict]:
    """
    Split a learning resource into overlapping chunks
    while preserving its metadata.
    """

    text = resource.content.strip()

    if not text:
        return []

    if chunk_overlap >= chunk_size:
        raise ValueError(
            "chunk_overlap must be smaller than chunk_size."
        )

    chunks = []

    start = 0
    chunk_index = 0

    while start < len(text):

        end = start + chunk_size

        chunk_text = text[start:end].strip()

        if chunk_text:
            chunks.append({
                "chunk_id": chunk_index,
                "title": resource.title,
                "skill": resource.skill,
                "resource_type": resource.resource_type,
                "source": resource.source,
                "content": chunk_text,
            })

            chunk_index += 1

        if end >= len(text):
            break

        start = end - chunk_overlap

    return chunks