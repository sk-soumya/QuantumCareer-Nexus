# app/ai/github/project_rag.py

from typing import List, Dict
from pathlib import Path
import hashlib
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"), override=False)
load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=False)

import chromadb
from langchain_openrouter import ChatOpenRouter
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel, Field
from typing import List
from app.ai.github.project_analyzer import (
    ProjectAnalysis,
    analyze_project,
)

class ChunkAnalysis(BaseModel):
    summary: str
    technologies: List[str] = Field(default_factory=list)
    components: List[str] = Field(default_factory=list)
    implementation_details: List[str] = Field(default_factory=list)

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

# Size of each code chunk.
CHUNK_SIZE = 6000

# Small overlap so important code is not split completely.
CHUNK_OVERLAP = 500

# Number of chunks returned for a recruiter question.
TOP_K = 5

# Persistent Chroma database location.
CHROMA_PATH = str(Path(__file__).resolve().parent / "chroma_db")


# --------------------------------------------------
# EMBEDDING MODEL
# --------------------------------------------------

_embedding_model = None


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model

# --------------------------------------------------
# PROJECT CHUNK ANALYZER
# --------------------------------------------------

def analyze_project_chunk(
    chunk: str,
    job_context: str
) -> ChunkAnalysis:

    llm = ChatOpenRouter(
        model="openrouter/free",
        temperature=0.2
    )

    structured_llm = llm.with_structured_output(ChunkAnalysis)

    prompt = f"""
    You are analyzing one section of a software project.

    Target job context:
    {job_context}

    Analyze ONLY the evidence present in this project section.

    Project section:
    {chunk}

    Identify:

    1. What this section does
    2. Technologies used
    3. Technical components
    4. Important implementation details

    Do not invent functionality that is not supported by the code.
    Do not assume that a library is used just because it is mentioned indirectly.
    """

    return structured_llm.invoke(prompt)

# --------------------------------------------------
# CHUNK ANALYSIS SUMMARIZER
# --------------------------------------------------

def synthesize_project_analysis(
    chunk_analyses: List[ChunkAnalysis],
    job_context: str
) -> ProjectAnalysis:

    llm = ChatOpenRouter(
        model="openrouter/free",
        temperature=0.2
    )

    structured_llm = llm.with_structured_output(ProjectAnalysis)

    summaries = "\n\n".join(
        f"""
    --- Section {i} ---
    Summary:
    {analysis.summary}

    Technologies:
    {", ".join(analysis.technologies)}

    Components:
    {", ".join(analysis.components)}

    Implementation Details:
    {", ".join(analysis.implementation_details)}
    """
            for i, analysis in enumerate(chunk_analyses, start=1)
        )

    prompt = f"""
        You are generating the final overall analysis of a software project.

        Target job context:
        {job_context}

        The following are analyses of different sections of the same project:

        {summaries}

        Create one coherent overall project analysis.

        Consider:

        - What the project does
        - Overall architecture
        - Technical complexity
        - Technical depth
        - Technologies actually demonstrated
        - Important technical components
        - Implementation evidence
        - Strengths
        - Limitations
        - Relevance to the target job
        - Overall project quality from 0 to 10

        Do not invent functionality.

        Combine the evidence from the sections into one project-level assessment.
        """

    return structured_llm.invoke(prompt)

# --------------------------------------------------
# LARGE PROJECT ANALYZER
# --------------------------------------------------

def analyze_large_project(
    chunks: List[str],
    job_context: str
) -> List[ChunkAnalysis]:

    analyses = []

    for i, chunk in enumerate(chunks, start=1):

        print(f"Analyzing project chunk {i}/{len(chunks)}")

        analysis = analyze_project_chunk(
            chunk,
            job_context
        )

        analyses.append(analysis)

    return analyses

# --------------------------------------------------
# PROJECT ANALYSIS WITH RAG
# --------------------------------------------------

def analyze_project_with_rag(
    project_data: str,
    job_context: str
) -> ProjectAnalysis:

    # Every project goes through chunking
    chunks = chunk_text(project_data)

    if not chunks:
        raise ValueError(
            "No project content available for analysis."
        )

    # Analyze every chunk
    chunk_analyses = analyze_large_project(
        chunks,
        job_context
    )

    # Synthesize all chunk analyses
    return synthesize_project_analysis(
        chunk_analyses,
        job_context
    )
# --------------------------------------------------
# TOKEN ESTIMATION
# --------------------------------------------------

def estimate_tokens(text: str) -> int:
    """
    Roughly estimate token count.

    This is an approximation.
    We use ~4 characters per token as a simple estimate.
    """

    if not text:
        return 0

    return max(1, len(text) // 4)


def estimate_project_tokens(evidence: List[Dict]) -> int:
    """
    Estimate total tokens contained in project files.
    """

    total_text = ""

    for item in evidence:
        total_text += (
            f"\nFILE: {item.get('path', '')}\n"
            f"{item.get('content', '')}\n"
        )

    return estimate_tokens(total_text)

# --------------------------------------------------
# TEXT CHUNKING
# --------------------------------------------------

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Split a file into overlapping text chunks.

    Character-based chunking is used here because
    source code does not always split cleanly by
    paragraphs.
    """

    if not text:
        return []

    if overlap >= chunk_size:
        raise ValueError(
            "overlap must be smaller than chunk_size"
        )

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:

        end = min(
            start + chunk_size,
            text_length,
        )

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        start = end - overlap

    return chunks


# --------------------------------------------------
# CHROMA CLIENT
# --------------------------------------------------

def get_chroma_collection(
    repository: str,
    student_id: int | None = None,
    job_drive_id: int | None = None,
):
    """
    Create or retrieve a Chroma collection
    for a specific repository.
    """

    client = chromadb.PersistentClient(
        path=CHROMA_PATH
    )

    # Chroma collection names must contain
    # only valid characters.
    safe_name = hashlib.sha256(repository.encode("utf-8")).hexdigest()[:20]
    scope = f"job_{job_drive_id}" if job_drive_id is not None else "profile"
    collection_name = (
        f"student_{student_id}_{scope}_project_{safe_name}"
        if student_id is not None
        else f"project_{safe_name}"
    )

    collection = client.get_or_create_collection(
        name=collection_name
    )

    return collection


# --------------------------------------------------
# CREATE PROJECT VECTOR STORE
# --------------------------------------------------

def build_project_vector_store(
    repository: str,
    evidence: List[Dict],
    student_id: int | None = None,
    job_drive_id: int | None = None,
):
    """
    Convert project files into chunks, generate
    embeddings and store them in Chroma.
    """

    collection = get_chroma_collection(repository, student_id, job_drive_id)

    if collection.count():
        filters = [{"student_id": int(student_id)}] if student_id is not None else []
        if job_drive_id is not None:
            filters.append({"job_drive_id": int(job_drive_id)})
        if filters:
            collection.delete(where={"$and": filters} if len(filters) > 1 else filters[0])
        else:
            collection.delete(ids=collection.get().get("ids", []))

    documents = []
    metadatas = []
    ids = []

    for item in evidence:

        file_path = item.get("path", "")
        file_content = item.get("content", "")

        if not file_content.strip():
            continue

        chunks = chunk_text(file_content)

        for index, chunk in enumerate(chunks):

            document = (
                f"FILE: {file_path}\n\n"
                f"{chunk}"
            )

            # Deterministic ID prevents duplicate
            # chunks if the same repository is indexed again.
            chunk_id = hashlib.sha256(
                f"{student_id}:{job_drive_id}:{repository}:{file_path}:{index}".encode(
                    "utf-8"
                )
            ).hexdigest()

            documents.append(document)

            metadata = {
                "repository": repository,
                "file_path": file_path,
                "chunk_index": index,
            }
            if student_id is not None:
                metadata["student_id"] = int(student_id)
            if job_drive_id is not None:
                metadata["job_drive_id"] = int(job_drive_id)
            metadatas.append(metadata)

            ids.append(chunk_id)

    if not documents:
        return collection

    # Generate embeddings.
    embeddings = get_embedding_model().encode(
        documents,
        normalize_embeddings=True,
    ).tolist()

    # Add/update chunks.
    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    print(
        f"Indexed {len(documents)} chunks "
        f"from {repository}"
    )

    return collection


# --------------------------------------------------
# RETRIEVE PROJECT EVIDENCE
# --------------------------------------------------

def retrieve_project_context(
    repository: str,
    question: str,
    top_k: int = TOP_K,
    student_id: int | None = None,
    job_drive_id: int | None = None,
) -> List[Dict]:
    """
    Retrieve the most relevant project chunks
    for a recruiter question.
    """

    collection = get_chroma_collection(repository, student_id, job_drive_id)

    # Check whether the collection contains data.
    if collection.count() == 0:
        return []

    query_embedding = get_embedding_model().encode(
        [question],
        normalize_embeddings=True,
    ).tolist()

    query_args = {
        "query_embeddings": query_embedding,
        "n_results": min(top_k, collection.count()),
    }
    if student_id is not None:
        query_args["where"] = {"student_id": int(student_id)}
        if job_drive_id is not None:
            query_args["where"] = {
                "$and": [
                    {"student_id": int(student_id)},
                    {"job_drive_id": int(job_drive_id)},
                ]
            }

    results = collection.query(
        **query_args,
    )

    retrieved = []

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for document, metadata, distance in zip(
        documents,
        metadatas,
        distances,
    ):

        retrieved.append(
            {
                "content": document,
                "file_path": metadata.get(
                    "file_path"
                ),
                "chunk_index": metadata.get(
                    "chunk_index"
                ),
                "distance": distance,
                "repository": metadata.get("repository"),
            }
        )

    return retrieved


# --------------------------------------------------
# FORMAT RETRIEVED CONTEXT
# --------------------------------------------------

def format_retrieved_context(retrieved_chunks: List[Dict]) -> str:
    """
    Convert retrieved chunks into context that
    can be passed to an LLM.
    """

    if not retrieved_chunks:
        return ""

    context_parts = []

    for index, chunk in enumerate(
        retrieved_chunks,
        start=1,
    ):

        context_parts.append(
            f"""
--- Evidence {index} ---
File: {chunk['file_path']}
Chunk: {chunk['chunk_index']}

{chunk['content']}
"""
        )

    return "\n".join(context_parts)
