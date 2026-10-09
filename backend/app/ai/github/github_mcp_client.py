from __future__ import annotations

import json
import os
import shutil
from contextlib import AsyncExitStack, asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

GITHUB_ENV_FILE = Path(__file__).resolve().with_name(".env")


def get_github_token() -> str:
    load_dotenv(GITHUB_ENV_FILE, override=False)
    token = os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("GITHUB_PERSONAL_ACCESS_TOKEN is not configured for GitHub MCP.")
    return token


def extract_github_username(github_url: str) -> str:
    parsed = urlparse(github_url.strip())
    if parsed.scheme not in {"https", "http"} or parsed.hostname not in {"github.com", "www.github.com"}:
        raise ValueError("Use a GitHub profile URL to analyze this student's repositories.")
    username = parsed.path.strip("/").split("/")[0]
    if not username or username.lower() in {"topics", "settings", "explore", "orgs", "features", "marketplace", "login"}:
        raise ValueError("GitHub profile username not found.")
    return username


@asynccontextmanager
async def connect_to_github():
    try:
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client
    except ImportError as exc:
        raise RuntimeError("GitHub MCP support requires the 'mcp' package.") from exc

    env = os.environ.copy()
    env["GITHUB_PERSONAL_ACCESS_TOKEN"] = get_github_token()
    env["GITHUB_READ_ONLY"] = "1"
    env["GITHUB_TOOLSETS"] = "repos"
    docker = shutil.which("docker.exe") or shutil.which("docker") or "docker.exe"
    server_params = StdioServerParameters(
        command=docker,
        args=["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN",
              "-e", "GITHUB_READ_ONLY", "-e", "GITHUB_TOOLSETS",
              "ghcr.io/github/github-mcp-server"],
        env=env,
    )
    async with AsyncExitStack() as stack:
        read, write = await stack.enter_async_context(stdio_client(server_params))
        session = await stack.enter_async_context(ClientSession(read, write))
        await session.initialize()
        yield session


def _tool_text(result) -> str:
    for item in getattr(result, "content", []) or []:
        resource = getattr(item, "resource", None)
        resource_text = getattr(resource, "text", None) if resource else None
        if resource_text:
            return str(resource_text)
        text = getattr(item, "text", None)
        if text:
            return str(text)
    return ""


def parse_repository_result(result) -> list[dict]:
    if getattr(result, "is_error", False):
        raise RuntimeError(_tool_text(result) or "GitHub repository search failed.")
    raw = _tool_text(result)
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    items = data.get("items", []) if isinstance(data, dict) else []
    return [{
        "name": repo.get("name", ""),
        "full_name": repo.get("full_name", ""),
        "description": repo.get("description", ""),
        "url": repo.get("html_url", ""),
        "language": repo.get("language", ""),
        "default_branch": repo.get("default_branch", ""),
        "private": repo.get("private", False),
        "fork": repo.get("fork", False),
        "archived": repo.get("archived", False),
        "stars": repo.get("stargazers_count", 0),
        "updated_at": repo.get("updated_at"),
    } for repo in items if isinstance(repo, dict)]


async def search_student_repositories(session, username: str) -> list[dict]:
    """Page through the GitHub MCP repository search results for one account."""
    repositories, seen = [], set()
    # GitHub repository search supports at most 1,000 results for one query.
    for page in range(1, 11):
        result = await session.call_tool("search_repositories", {
            "query": f"user:{username}", "page": page, "perPage": 100,
            "minimal_output": False,
        })
        current = parse_repository_result(result)
        for repo in current:
            full_name = str(repo.get("full_name") or "")
            if not full_name.lower().startswith(username.lower() + "/"):
                continue
            if full_name.lower() not in seen:
                seen.add(full_name.lower())
                repositories.append(repo)
        if len(current) < 100:
            break
    return repositories


async def get_repository_readme(session, owner: str, repo: str, ref: str | None = None) -> str:
    arguments = {"owner": owner, "repo": repo, "path": "README.md"}
    if ref:
        arguments["ref"] = ref
    result = await session.call_tool("get_file_contents", arguments)
    if getattr(result, "is_error", False):
        return ""
    return _tool_text(result)


async def collect_project_evidence(
    session,
    owner: str,
    repo: str,
    ref: str | None = None,
    *,
    max_files: int = 80,
    max_total_chars: int = 120_000,
    max_file_chars: int = 30_000,
) -> dict:
    """Read bounded source/config evidence while excluding generated and secret files."""
    evidence: list[dict[str, str]] = []
    visited_directories = 0
    total_chars = 0
    truncated = False
    extensions = (".py", ".js", ".ts", ".java", ".cpp", ".c", ".go", ".rs",
                  ".ipynb", ".sql", ".html", ".css", ".json", ".yaml", ".yml", ".md")
    important_files = {"readme.md", "readme.txt", "requirements.txt", "pyproject.toml",
                       "package.json", "dockerfile", "docker-compose.yml",
                       "docker-compose.yaml", ".env.example"}
    ignored_dirs = {".git", "__pycache__", "node_modules", "venv", ".venv", "env",
                    ".env", "migrations", "static", "media", "dist", "build", "coverage"}
    secret_names = {"id_rsa", "id_ed25519", "credentials.json", "secrets.json"}

    async def collect_directory(path: str = "/") -> None:
        nonlocal visited_directories, total_chars, truncated
        if len(evidence) >= max_files or total_chars >= max_total_chars:
            truncated = True
            return
        visited_directories += 1
        if visited_directories > 300:
            truncated = True
            return
        args = {"owner": owner, "repo": repo, "path": path}
        if ref:
            args["ref"] = ref
        result = await session.call_tool("get_file_contents", args)
        if getattr(result, "is_error", False):
            return
        try:
            entries = json.loads(_tool_text(result))
        except json.JSONDecodeError:
            return
        if not isinstance(entries, list):
            return

        for entry in entries:
            if not isinstance(entry, dict):
                continue
            entry_type = entry.get("type")
            entry_path = str(entry.get("path") or "")
            if not entry_path:
                continue
            if entry_type == "dir":
                if entry_path.lower().split("/")[-1] not in ignored_dirs:
                    await collect_directory(entry_path)
                continue
            if entry_type != "file" or entry.get("size", 0) == 0:
                continue
            parts = entry_path.lower().split("/")
            filename = parts[-1]
            if any(part in ignored_dirs for part in parts):
                continue
            if (filename.startswith(".env") and filename != ".env.example") or filename in secret_names:
                continue
            if filename not in important_files and not entry_path.lower().endswith(extensions):
                continue
            if entry.get("size", 0) > max_file_chars * 4:
                continue
            if len(evidence) >= max_files or total_chars >= max_total_chars:
                truncated = True
                return
            file_args = {"owner": owner, "repo": repo, "path": entry_path}
            if ref:
                file_args["ref"] = ref
            file_result = await session.call_tool("get_file_contents", file_args)
            if getattr(file_result, "is_error", False):
                continue
            content = _tool_text(file_result)
            if not content or content.startswith("successfully downloaded text file"):
                continue
            remaining = max_total_chars - total_chars
            bounded = content[:min(max_file_chars, remaining)]
            truncated = truncated or len(bounded) < len(content)
            if bounded.strip():
                evidence.append({"path": entry_path, "content": bounded})
                total_chars += len(bounded)

    await collect_directory("/")
    return {
        "repository": f"{owner}/{repo}",
        "files": [item["path"] for item in evidence],
        "evidence": evidence,
        "truncated": truncated,
    }
