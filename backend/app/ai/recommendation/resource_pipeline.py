from typing import List

from app.ai.recommendation.resource_rag import (
    add_learning_resources,
    has_sufficient_context,
    retrieve_learning_resources,
)
from app.ai.recommendation.resource_search import (
    convert_search_results_to_resources,
    search_external_learning_resources,
)


def get_learning_resources(
    skill: str,
    top_k: int = 5,
) -> List[dict]:
    if has_sufficient_context(skill=skill, top_k=top_k):
        return retrieve_learning_resources(
            skill=skill,
            top_k=top_k,
        )

    # Free fallback is built into resource_search when no Tavily key exists.
    search_results = search_external_learning_resources(
        skill=skill,
        top_k=top_k,
    )

    resources = convert_search_results_to_resources(
        skill=skill,
        results=search_results,
    )

    if resources:
        add_learning_resources(resources)

    stored = retrieve_learning_resources(
        skill=skill,
        top_k=top_k,
    )

    # In case embeddings/storage are unavailable, return the external
    # resource metadata instead of failing the whole preparation workflow.
    if stored:
        return stored

    return [
        {
            "title": resource.title,
            "skill": resource.skill,
            "resource_type": resource.resource_type,
            "content": resource.content,
            "source": resource.source,
            "topics": resource.topics,
        }
        for resource in resources
    ]
