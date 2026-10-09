from __future__ import annotations

import re
from urllib.parse import urlparse

import httpx


GITHUB_API = "https://api.github.com"


def parse_github_url(github_url: str) -> tuple[str, str]:
    github_url = github_url.strip()

    parsed = urlparse(github_url)

    if parsed.hostname not in {
        "github.com",
        "www.github.com",
    }:
        raise ValueError("Only GitHub repository URLs are supported.")

    parts = [
        part
        for part in parsed.path.split("/")
        if part
    ]

    if len(parts) < 2:
        raise ValueError("Invalid GitHub repository URL.")

    owner = parts[0]
    repo = re.sub(
        r"\.git$",
        "",
        parts[1],
    )

    return owner, repo


async def github_get(
    client: httpx.AsyncClient,
    endpoint: str,
):
    response = await client.get(
        f"{GITHUB_API}{endpoint}",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "CampusLink",
        },
        timeout=15,
    )

    response.raise_for_status()

    return response.json()


async def read_repository(
    github_url: str,
) -> dict:

    owner, repo = parse_github_url(
        github_url
    )

    async with httpx.AsyncClient() as client:

        repository = await github_get(
            client,
            f"/repos/{owner}/{repo}",
        )

        languages = await github_get(
            client,
            f"/repos/{owner}/{repo}/languages",
        )

        commits = await github_get(
            client,
            f"/repos/{owner}/{repo}/commits?per_page=30",
        )

        contents = await github_get(
            client,
            f"/repos/{owner}/{repo}/contents",
        )

    filenames = []

    for item in contents:
        if isinstance(item, dict):
            name = item.get("name")

            if name:
                filenames.append(
                    str(name)
                )

    lower_names = {
        name.lower()
        for name in filenames
    }

    has_readme = any(
        name.startswith("readme")
        for name in lower_names
    )

    has_tests = any(
        "test" in name
        or "spec" in name
        for name in lower_names
    )

    has_ci = (
        ".github" in lower_names
        or "dockerfile" in lower_names
        or "docker-compose.yml" in lower_names
        or "docker-compose.yaml" in lower_names
    )

    project_score = 0

    # README
    if has_readme:
        project_score += 15

    # Commits
    commit_count = len(commits)

    if commit_count >= 25:
        project_score += 25
    elif commit_count >= 15:
        project_score += 20
    elif commit_count >= 8:
        project_score += 15
    elif commit_count >= 3:
        project_score += 10
    elif commit_count >= 1:
        project_score += 5

    # Technology breadth
    language_count = len(languages)

    if language_count >= 4:
        project_score += 20
    elif language_count >= 3:
        project_score += 15
    elif language_count >= 2:
        project_score += 10
    elif language_count >= 1:
        project_score += 5

    # Testing
    if has_tests:
        project_score += 15

    # Engineering practices
    if has_ci:
        project_score += 10

    # Project description
    if repository.get("description"):
        project_score += 5

    project_score = min(
        project_score,
        100,
    )

    project_data = {
        "repository": repository.get(
            "full_name"
        ),
        "name": repository.get(
            "name"
        ),
        "description": repository.get(
            "description"
        ),
        "url": repository.get(
            "html_url"
        ),
        "stars": repository.get(
            "stargazers_count",
            0,
        ),
        "forks": repository.get(
            "forks_count",
            0,
        ),
        "open_issues": repository.get(
            "open_issues_count",
            0,
        ),
        "default_branch": repository.get(
            "default_branch"
        ),
        "languages": list(
            languages.keys()
        ),
        "commit_count": commit_count,
        "files": filenames,
        "has_readme": has_readme,
        "has_tests": has_tests,
        "has_ci": has_ci,
        "project_score": project_score,
    }

    return project_data