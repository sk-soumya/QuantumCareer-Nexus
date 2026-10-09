from typing import List
from urllib.parse import urlparse

from app.ai.schemas.learning_resource import LearningResource

# Free, API-key-free fallback catalogue. External search can still be enabled
# by setting TAVILY_API_KEY and installing tavily-python.
FREE_RESOURCE_CATALOG = {
    "python": (
        "Python documentation",
        "https://docs.python.org/3/",
    ),
    "fastapi": (
        "FastAPI documentation",
        "https://fastapi.tiangolo.com/",
    ),
    "sql": (
        "PostgreSQL documentation",
        "https://www.postgresql.org/docs/",
    ),
    "postgresql": (
        "PostgreSQL documentation",
        "https://www.postgresql.org/docs/",
    ),
    "git": (
        "Git documentation",
        "https://git-scm.com/doc",
    ),
    "javascript": (
        "MDN JavaScript guide",
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    ),
    "react": (
        "React documentation",
        "https://react.dev/learn",
    ),
    "docker": (
        "Docker documentation",
        "https://docs.docker.com/get-started/",
    ),
    "aws": (
        "AWS getting started resources",
        "https://aws.amazon.com/getting-started/",
    ),
}


def is_quality_learning_resource(result: dict, skill: str) -> bool:
    title = (result.get("title") or "").lower()
    content = (result.get("content") or "").lower()
    url = (result.get("url") or "").lower()

    if not title or not content or not url:
        return False

    domain = urlparse(url).netloc.lower().removeprefix("www.")
    official = (
        domain.endswith(".org")
        or domain.endswith(".dev")
        or domain.startswith("docs.")
        or domain.startswith("developer.")
    )
    learning = any(
        word in title or word in content[:1200]
        for word in (
            "tutorial", "documentation", "guide", "learn",
            "getting started", "reference", "course",
            "fundamentals", "basics",
        )
    )
    relevant = any(
        word in title or word in content[:2000]
        for word in skill.lower().split()
        if len(word) > 2
    )
    return relevant and (official or learning)


def filter_learning_results(results: List[dict], skill: str) -> List[dict]:
    return [
        result
        for result in results
        if is_quality_learning_resource(result, skill)
    ]


def _offline_resources(skill: str, top_k: int) -> List[dict]:
    key = skill.strip().lower()
    selected = []

    for catalog_key, (title, url) in FREE_RESOURCE_CATALOG.items():
        if catalog_key in key or key in catalog_key:
            selected.append(
                {
                    "title": title,
                    "skill": skill,
                    "resource_type": "official_documentation",
                    "content": (
                        f"Official learning resource for {skill}: {title}. "
                        f"Use the linked documentation for fundamentals, "
                        f"reference material and guided practice."
                    ),
                    "source": url,
                    "topics": [skill],
                }
            )
            if len(selected) >= top_k:
                break

    if not selected:
        selected.append(
            {
                "title": f"{skill} official learning search",
                "skill": skill,
                "resource_type": "official_documentation",
                "content": (
                    f"Use the official documentation for {skill}. "
                    "Prefer first-party guides, tutorials and references."
                ),
                "source": (
                    "https://www.google.com/search?q="
                    f"{skill.replace(' ', '+')}+official+documentation"
                ),
                "topics": [skill],
            }
        )

    return selected


def search_external_learning_resources(
    skill: str,
    top_k: int = 5,
) -> List[dict]:
    try:
        from dotenv import load_dotenv
        load_dotenv()
        import os
        from tavily import TavilyClient

        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            return _offline_resources(skill, top_k)

        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=f"{skill} official documentation tutorial",
            search_depth="basic",
            max_results=top_k,
            include_answer=False,
        )
        filtered = filter_learning_results(
            response.get("results", []),
            skill,
        )
        return filtered or _offline_resources(skill, top_k)
    except Exception:
        return _offline_resources(skill, top_k)


def convert_search_results_to_resources(
    skill: str,
    results: List[dict],
) -> List[LearningResource]:
    resources = []

    for result in results:
        title = result.get("title")
        content = result.get("content")
        url = result.get("url")
        if not title or not content or not url:
            continue

        resources.append(
            LearningResource(
                title=title,
                skill=skill,
                resource_type="web_resource",
                content=content,
                source=url,
                topics=[skill],
            )
        )

    return resources
