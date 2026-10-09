from typing import List
import hashlib

import chromadb
from sentence_transformers import SentenceTransformer

from app.ai.schemas.learning_resource import LearningResource
from app.ai.recommendation.resource_chunker import chunk_learning_resource

CHROMA_PATH = "app/ai/recommendation/chroma_db"
_embedding_model = None


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def get_resource_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_or_create_collection(name="learning_resources")


def add_learning_resources(resources: List[LearningResource]):
    collection = get_resource_collection()
    documents, metadatas, ids = [], [], []

    for resource in resources:
        chunks = chunk_learning_resource(resource)
        resource_id = hashlib.sha256(
            resource.source.strip().lower().encode()
        ).hexdigest()

        for chunk in chunks:
            chunk_id = f"{resource_id}_{chunk['chunk_id']}"
            documents.append(chunk["content"])
            metadatas.append(
                {
                    "resource_id": resource_id,
                    "chunk_id": chunk["chunk_id"],
                    "skill": resource.skill.strip().lower(),
                    "title": chunk["title"],
                    "resource_type": chunk["resource_type"],
                    "source": chunk["source"],
                }
            )
            ids.append(chunk_id)

    if not documents:
        return collection

    embeddings = _get_embedding_model().encode(
        documents,
        normalize_embeddings=True,
    ).tolist()

    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    return collection


def retrieve_learning_resources(
    skill: str,
    top_k: int = 3,
):
    collection = get_resource_collection()

    query_embedding = _get_embedding_model().encode(
        [skill],
        normalize_embeddings=True,
    ).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=max(top_k * 5, top_k),
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    target_skill = skill.strip().lower()

    filtered_results = []
    for document, metadata, distance in zip(
        documents,
        metadatas,
        distances,
    ):
        if metadata.get("skill", "").lower() != target_skill:
            continue

        filtered_results.append(
            {
                "resource_id": metadata.get("resource_id"),
                "chunk_id": metadata.get("chunk_id"),
                "title": metadata.get("title"),
                "skill": metadata.get("skill"),
                "resource_type": metadata.get("resource_type"),
                "source": metadata.get("source"),
                "content": document,
                "distance": distance,
            }
        )
        if len(filtered_results) >= top_k:
            break

    return filtered_results


def has_sufficient_context(
    skill: str,
    top_k: int = 3,
    distance_threshold: float = 1.0,
    minimum_resources: int = 2,
) -> bool:
    resources = retrieve_learning_resources(skill=skill, top_k=top_k)
    relevant = [
        item for item in resources
        if item["distance"] <= distance_threshold
    ]
    if len(relevant) >= minimum_resources:
        return True
    return bool(relevant) and relevant[0]["distance"] <= 0.75


def reset_learning_resources():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    try:
        client.delete_collection(name="learning_resources")
    except Exception:
        pass
    return client.get_or_create_collection(name="learning_resources")
