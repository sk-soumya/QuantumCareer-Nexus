from pathlib import Path
from uuid import uuid4
import re

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
)

from pypdf import PdfReader


router = APIRouter(
    prefix="/resume",
    tags=["Resume AI"],
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

UPLOAD_DIR = (
    BASE_DIR
    / "uploads"
    / "resumes"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# FILE VALIDATION
# ============================================================

MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
}

ALLOWED_EXTENSIONS = {
    ".pdf",
}


# ============================================================
# SKILL ONTOLOGY
# ============================================================
#
# This list is NOT the only source of skills.
#
# We also extract arbitrary skills from explicit sections such
# as:
#
#   Skills
#   Technical Skills
#   Core Competencies
#   Expertise
#   Professional Skills
#
# That is what allows CAMPUSLINK to understand skills that are
# not contained in this list.
# ============================================================

KNOWN_SKILLS = [
    # Programming
    "Python",
    "Java",
    "C",
    "C++",
    "C#",
    "Go",
    "Rust",
    "Kotlin",
    "Swift",
    "PHP",
    "Ruby",
    "R",

    # Web
    "JavaScript",
    "TypeScript",
    "HTML",
    "CSS",
    "React",
    "React.js",
    "Angular",
    "Vue",
    "Vue.js",
    "Next.js",
    "Nuxt.js",

    # Backend
    "FastAPI",
    "Django",
    "Flask",
    "Spring",
    "Spring Boot",
    "Node.js",
    "Express",
    "Express.js",
    ".NET",
    "ASP.NET",

    # Databases
    "SQL",
    "PostgreSQL",
    "MySQL",
    "Oracle",
    "SQLite",
    "MongoDB",
    "Redis",
    "Cassandra",
    "DynamoDB",

    # Data / AI
    "Machine Learning",
    "Deep Learning",
    "Artificial Intelligence",
    "NLP",
    "Natural Language Processing",
    "Data Science",
    "Data Analysis",
    "Computer Vision",
    "TensorFlow",
    "PyTorch",
    "Scikit-learn",
    "Pandas",
    "NumPy",
    "Matplotlib",
    "Seaborn",
    "OpenCV",
    "Hugging Face",
    "Transformers",
    "Sentence Transformers",
    "FAISS",
    "SHAP",

    # DevOps / Cloud
    "Git",
    "GitHub",
    "GitLab",
    "Docker",
    "Kubernetes",
    "Jenkins",
    "CI/CD",
    "AWS",
    "Azure",
    "GCP",
    "Google Cloud",
    "Terraform",
    "Ansible",
    "Linux",

    # Engineering / tools
    "REST API",
    "GraphQL",
    "Microservices",
    "Postman",
    "Swagger",
    "Jira",
    "Agile",
    "Scrum",

    # Mobile
    "Android",
    "Android Development",
    "Flutter",
    "React Native",
    "iOS Development",

    # Testing
    "Unit Testing",
    "Integration Testing",
    "Selenium",
    "PyTest",
    "Jest",
    "Cypress",

    # Design / productivity
    "Figma",
    "Adobe Photoshop",
    "Adobe Illustrator",
    "Microsoft Excel",
    "Microsoft Word",
    "Power BI",
    "Tableau",
]


# ============================================================
# SECTION HEADINGS
# ============================================================

SKILL_HEADINGS = {
    "skill",
    "skills",
    "technical skill",
    "technical skills",
    "key skill",
    "key skills",
    "core skill",
    "core skills",
    "professional skill",
    "professional skills",
    "soft skill",
    "soft skills",
    "competencies",
    "core competencies",
    "expertise",
    "areas of expertise",
    "technologies",
    "technology",
    "tools",
    "technical expertise",
    "professional competencies",
    "key competencies",
    "strengths",
}

PROGRAMMING_HEADINGS = {
    "programming",
    "programming languages",
    "technical languages",
    "coding languages",
    "languages programming",
}

LANGUAGE_HEADINGS = {
    "language",
    "languages",
    "languages known",
    "spoken languages",
    "languages spoken",
}

STOP_HEADINGS = {
    "education",
    "academic",
    "academics",
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "projects",
    "project",
    "certifications",
    "certification",
    "achievements",
    "awards",
    "internships",
    "internship",
    "objective",
    "career objective",
    "summary",
    "profile",
    "about me",
    "personal details",
    "contact",
    "contact details",
    "hobbies",
    "interests",
    "declaration",
    "references",
}


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(
    text: str,
) -> str:
    """
    Normalize extracted PDF text while preserving useful
    technical characters.
    """

    if not text:
        return ""

    text = text.replace(
        "\r",
        "\n",
    )

    text = text.replace(
        "\t",
        " ",
    )

    text = text.replace(
        "–",
        "-",
    )

    text = text.replace(
        "—",
        "-",
    )

    text = re.sub(
        r"[ ]{2,}",
        " ",
        text,
    )

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    return text.strip()


# ============================================================
# PDF EXTRACTION
# ============================================================

def extract_pdf_text(
    file_bytes: bytes,
) -> str:
    """
    Extract selectable text from a PDF.
    """

    try:
        from io import BytesIO

        reader = PdfReader(
            BytesIO(file_bytes)
        )

        pages = []

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                pages.append(
                    page_text
                )

        return normalize_text(
            "\n".join(pages)
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to read PDF file",
        ) from exc


# ============================================================
# HEADING NORMALIZATION
# ============================================================

def normalize_heading(
    line: str,
) -> str:
    """
    Normalize a section heading.
    """

    cleaned = line.strip().lower()

    cleaned = re.sub(
        r"[^a-z0-9+#.&/\-\s]",
        " ",
        cleaned,
    )

    cleaned = re.sub(
        r"\s+",
        " ",
        cleaned,
    )

    return cleaned.strip()


# ============================================================
# SECTION IDENTIFICATION
# ============================================================

def identify_section(
    line: str,
) -> tuple[str | None, str]:
    """
    Identify whether a line begins a known resume section.

    Returns:
        (section_type, inline_content)

    Example:

        "SKILLS: Python, SQL, React"

    becomes:

        ("skills", "Python, SQL, React")
    """

    cleaned = line.strip()

    if not cleaned:
        return None, ""

    # --------------------------------------------------------
    # Inline heading:
    #
    # Skills: Python, SQL
    # Technical Skills - Python, SQL
    # --------------------------------------------------------

    match = re.match(
        r"^\s*([A-Za-z][A-Za-z\s&/\-]{1,60})\s*[:\-]\s*(.*)$",
        cleaned,
    )

    if match:
        heading = normalize_heading(
            match.group(1)
        )

        content = match.group(2).strip()

        if heading in SKILL_HEADINGS:
            return "skills", content

        if heading in PROGRAMMING_HEADINGS:
            return "programming", content

        if heading in LANGUAGE_HEADINGS:
            return "languages", content

        if heading in STOP_HEADINGS:
            return "stop", content

    # --------------------------------------------------------
    # Plain heading
    # --------------------------------------------------------

    heading = normalize_heading(
        cleaned
    )

    if heading in SKILL_HEADINGS:
        return "skills", ""

    if heading in PROGRAMMING_HEADINGS:
        return "programming", ""

    if heading in LANGUAGE_HEADINGS:
        return "languages", ""

    if heading in STOP_HEADINGS:
        return "stop", ""

    # --------------------------------------------------------
    # More flexible heading detection.
    #
    # Examples:
    #
    # TECHNICAL SKILLS
    # CORE COMPETENCIES
    # AREAS OF EXPERTISE
    # PROFESSIONAL SKILLS
    # --------------------------------------------------------

    if (
        "skill" in heading
        or "competenc" in heading
        or "expertise" in heading
    ):
        if len(cleaned.split()) <= 8:
            return "skills", ""

    if (
        "programming language" in heading
        or "coding language" in heading
    ):
        return "programming", ""

    return None, ""


# ============================================================
# BULLET CLEANING
# ============================================================

def clean_bullet(
    line: str,
) -> tuple[str, bool]:
    """
    Remove common PDF bullet characters.

    Returns:
        cleaned_line, was_bullet
    """

    stripped = line.strip()

    bullet_pattern = (
        r"^(?:"
        r"[•●▪◦■□◆◇]"
        r"|[-*]"
        r"|(?:\u25A0)"
        r")\s*"
    )

    if re.match(
        bullet_pattern,
        stripped,
    ):
        return (
            re.sub(
                bullet_pattern,
                "",
                stripped,
            ).strip(),
            True,
        )

    return stripped, False


# ============================================================
# EXTRACT SKILL SECTION
# ============================================================
def is_personal_information_line(
    line: str,
) -> bool:
    """
    Detect contact/personal-information lines that should
    immediately terminate a skills section.
    """

    normalized = line.strip().lower()

    patterns = [
        r"^\s*at\s*[:\-]?",
        r"^\s*address\s*[:\-]?",
        r"^\s*permanent\s+address\s*[:\-]?",
        r"^\s*present\s+address\s*[:\-]?",
        r"^\s*pin\s*[:\-]?",
        r"^\s*pincode\s*[:\-]?",
        r"^\s*postal\s+code\s*[:\-]?",
        r"^\s*phone\s*[:\-]?",
        r"^\s*mobile\s*[:\-]?",
        r"^\s*contact\s*[:\-]?",
        r"^\s*email\s*[:\-]?",
        r"^\s*e-mail\s*[:\-]?",
        r"^\s*gmail\s*[:\-]?",
        r"^\s*nationality\s*[:\-]?",
        r"^\s*gender\s*[:\-]?",
        r"^\s*date\s+of\s+birth\s*[:\-]?",
        r"^\s*dob\s*[:\-]?",
        r"^\s*marital\s+status\s*[:\-]?",
        r"^\s*place\s*[:\-]?",
        r"^\s*declaration\s*[:\-]?",
        r"^\s*signature\s*[:\-]?",
    ]

    return any(
        re.search(
            pattern,
            normalized,
            flags=re.IGNORECASE,
        )
        for pattern in patterns
    )
def extract_skill_section(
    text: str,
) -> tuple[list[str], list[str], list[str]]:
    """
    Extract:

        professional/technical skills
        programming skills
        spoken languages

    from explicit resume sections.
    """

    lines = text.splitlines()

    current_section = None

    skill_entries = []
    programming_entries = []
    language_entries = []

    for raw_line in lines:

        line = raw_line.strip()

        if not line:
            continue

        # ----------------------------------------------------
        # PERSONAL / CONTACT INFORMATION
        #
        # If we are inside a skills section and encounter:
        #
        # At:
        # Address:
        # Phone:
        # Email:
        # PIN:
        #
        # then the skills section is finished.
        # ----------------------------------------------------

        if (
            current_section in {
                "skills",
                "programming",
            }
            and is_personal_information_line(
                line
            )
        ):
            current_section = None
            continue

        # ----------------------------------------------------
        # Detect section heading
        # ----------------------------------------------------

        section_type, inline_content = identify_section(
            line
        )

        if section_type:

            if section_type == "stop":
                current_section = None
                continue

            current_section = section_type

            if inline_content:

                if section_type == "skills":
                    skill_entries.append(
                        inline_content
                    )

                elif section_type == "programming":
                    programming_entries.append(
                        inline_content
                    )

                elif section_type == "languages":
                    language_entries.append(
                        inline_content
                    )

            continue

        # ----------------------------------------------------
        # Ignore everything outside supported sections
        # ----------------------------------------------------

        if current_section is None:
            continue

        # ----------------------------------------------------
        # Clean bullets
        # ----------------------------------------------------

        cleaned, was_bullet = clean_bullet(
            line
        )

        if not cleaned:
            continue

        # Decorative lines
        if not re.search(
            r"[A-Za-z0-9]",
            cleaned,
        ):
            continue

        # Contact information
        if "@" in cleaned:
            continue

        if re.search(
            r"\b\d{10}\b",
            cleaned,
        ):
            continue

        if len(cleaned) > 180:
            continue

        # ----------------------------------------------------
        # Select destination
        # ----------------------------------------------------

        if current_section == "skills":
            target = skill_entries

        elif current_section == "programming":
            target = programming_entries

        else:
            target = language_entries

        # ----------------------------------------------------
        # Bullet-based resume
        # ----------------------------------------------------

        if was_bullet:
            target.append(
                cleaned
            )
            continue

        # ----------------------------------------------------
        # Comma / semicolon / pipe separated skills
        # ----------------------------------------------------

        pieces = re.split(
            r"[;,|]",
            cleaned,
        )

        pieces = [
            piece.strip()
            for piece in pieces
            if piece.strip()
        ]

        if (
            len(pieces) > 1
            and all(
                len(piece.split()) <= 12
                for piece in pieces
            )
        ):
            target.extend(
                pieces
            )

        else:
            target.append(
                cleaned
            )

    return (
        clean_entries(skill_entries),
        clean_entries(programming_entries),
        clean_entries(language_entries),
    )
    """
    Extract:

        professional/technical skills
        programming skills
        spoken languages

    from explicit resume sections.
    """

    lines = text.splitlines()

    current_section = None

    skill_entries = []
    programming_entries = []
    language_entries = []

    for raw_line in lines:

        line = raw_line.strip()

        if not line:
            continue

        section_type, inline_content = identify_section(
            line
        )

        # ----------------------------------------------------
        # Section changed
        # ----------------------------------------------------

        if section_type:
            if section_type == "stop":
                current_section = None
                continue

            current_section = section_type

            if inline_content:
                target = (
                    skill_entries
                    if section_type == "skills"
                    else programming_entries
                    if section_type == "programming"
                    else language_entries
                )

                target.append(
                    inline_content
                )

            continue

        if current_section is None:
            continue

        cleaned, was_bullet = clean_bullet(
            line
        )

        if not cleaned:
            continue

        # Ignore decorative separator rows.
        if not re.search(
            r"[A-Za-z0-9]",
            cleaned,
        ):
            continue

        # Ignore obvious contact information.
        if "@" in cleaned:
            continue

        if re.search(
            r"\b\d{10}\b",
            cleaned,
        ):
            continue

        if len(cleaned) > 180:
            continue

        # ----------------------------------------------------
        # Preserve bullet phrases.
        #
        # Example:
        # "Rigging and Material Handling"
        #
        # must stay together.
        # ----------------------------------------------------

        target = (
            skill_entries
            if current_section == "skills"
            else programming_entries
            if current_section == "programming"
            else language_entries
        )

        if was_bullet:
            target.append(
                cleaned
            )
            continue

        # ----------------------------------------------------
        # Non-bullet skill lists:
        #
        # Python, SQL, React
        # Python; SQL; React
        # ----------------------------------------------------

        pieces = re.split(
            r"[;,|]",
            cleaned,
        )

        pieces = [
            piece.strip()
            for piece in pieces
            if piece.strip()
        ]

        if (
            len(pieces) > 1
            and all(
                len(piece.split()) <= 8
                for piece in pieces
            )
        ):
            target.extend(
                pieces
            )
        else:
            target.append(
                cleaned
            )

    return (
        clean_entries(skill_entries),
        clean_entries(programming_entries),
        clean_entries(language_entries),
    )


# ============================================================
# CLEAN ENTRIES
# ============================================================

def clean_entries(
    entries: list[str],
) -> list[str]:
    """
    Remove duplicates and obvious junk from explicit
    skill-section entries.
    """

    results = []
    seen = set()

    for entry in entries:

        entry = re.sub(
            r"\s+",
            " ",
            entry,
        ).strip()

        if not entry:
            continue

        if len(entry) < 2:
            continue

        if len(entry) > 180:
            continue

        # Ignore pure numeric/date content.
        if re.fullmatch(
            r"[\d\s./:-]+",
            entry,
        ):
            continue

        key = entry.lower()

        if key in seen:
            continue

        seen.add(key)

        results.append(
            entry
        )

    return results


# ============================================================
# CONTEXT-AWARE KNOWN SKILL MATCHING
# ============================================================

def contains_known_skill(
    text: str,
    skill: str,
) -> bool:
    """
    Detect a known skill safely.

    Special handling exists for ambiguous short tokens such
    as C and Go.
    """

    normalized = text.lower()
    normalized_skill = skill.lower()

    # --------------------------------------------------------
    # C
    # --------------------------------------------------------

    if normalized_skill == "c":

        patterns = [
            r"\bc\s+programming\b",
            r"\bc\s+language\b",
            r"\bprogramming\s+in\s+c\b",
            r"\bprogramming\s+with\s+c\b",
            r"\busing\s+c\b",
            r"\bdeveloped\s+in\s+c\b",
            r"\bexperience\s+in\s+c\b",
            r"\bwritten\s+in\s+c\b",
            r"\bcode\s+in\s+c\b",
        ]

        return any(
            re.search(
                pattern,
                normalized,
                flags=re.IGNORECASE,
            )
            for pattern in patterns
        )

    # --------------------------------------------------------
    # Go
    # --------------------------------------------------------

    if normalized_skill == "go":

        patterns = [
            r"\bgo\s+programming\b",
            r"\bgo\s+language\b",
            r"\bprogramming\s+in\s+go\b",
            r"\bprogramming\s+with\s+go\b",
            r"\bgolang\b",
        ]

        return any(
            re.search(
                pattern,
                normalized,
                flags=re.IGNORECASE,
            )
            for pattern in patterns
        )

    # --------------------------------------------------------
    # R
    # --------------------------------------------------------

    if normalized_skill == "r":

        patterns = [
            r"\br\s+programming\b",
            r"\br\s+language\b",
            r"\bprogramming\s+in\s+r\b",
            r"\bprogramming\s+with\s+r\b",
            r"\br\s+statistics\b",
        ]

        return any(
            re.search(
                pattern,
                normalized,
                flags=re.IGNORECASE,
            )
            for pattern in patterns
        )

    # --------------------------------------------------------
    # C++
    # --------------------------------------------------------

    if normalized_skill == "c++":
        return bool(
            re.search(
                r"(?<![a-z0-9])c\+\+(?![a-z0-9])",
                normalized,
                flags=re.IGNORECASE,
            )
        )

    # --------------------------------------------------------
    # C#
    # --------------------------------------------------------

    if normalized_skill == "c#":
        return bool(
            re.search(
                r"(?<![a-z0-9])c#(?![a-z0-9])",
                normalized,
                flags=re.IGNORECASE,
            )
        )

    # --------------------------------------------------------
    # Normal multi-character skill
    # --------------------------------------------------------

    pattern = (
        rf"(?<![a-z0-9])"
        rf"{re.escape(normalized_skill)}"
        rf"(?![a-z0-9])"
    )

    return bool(
        re.search(
            pattern,
            normalized,
            flags=re.IGNORECASE,
        )
    )


def extract_known_skills(
    text: str,
) -> list[str]:
    """
    Detect known technical skills anywhere in the resume.
    """

    results = []

    for skill in KNOWN_SKILLS:

        if contains_known_skill(
            text,
            skill,
        ):
            results.append(
                skill
            )

    return results


# ============================================================
# CANONICALIZATION
# ============================================================

SKILL_ALIASES = {
    "react.js": "React",
    "react js": "React",
    "node js": "Node.js",
    "nodejs": "Node.js",
    "express js": "Express.js",
    "expressjs": "Express.js",
    "next js": "Next.js",
    "nextjs": "Next.js",
    "vue js": "Vue.js",
    "vuejs": "Vue.js",
    "machine-learning": "Machine Learning",
    "deep-learning": "Deep Learning",
    "artificial intelligence": "Artificial Intelligence",
    "natural language processing": "NLP",
    "scikit learn": "Scikit-learn",
    "scikit learn library": "Scikit-learn",
    "postgres": "PostgreSQL",
    "ms excel": "Microsoft Excel",
    "excel": "Microsoft Excel",
    "powerbi": "Power BI",
    "power-bi": "Power BI",
}


def canonicalize_skill(
    skill: str,
) -> str:
    """
    Normalize aliases while preserving human-readable
    unknown/professional skills.
    """

    cleaned = re.sub(
        r"\s+",
        " ",
        skill,
    ).strip()

    alias = SKILL_ALIASES.get(
        cleaned.lower()
    )

    if alias:
        return alias

    return cleaned


# ============================================================
# COMPLETE SKILL EXTRACTION
# ============================================================

def extract_skills(
    text: str,
) -> dict:
    """
    Hybrid resume skill extraction.

    Spoken languages are kept separate from skills.
    """

    (
        explicit_skills,
        explicit_programming,
        languages,
    ) = extract_skill_section(
        text
    )

    known_skills = extract_known_skills(
        text
    )

    technical_skills = []
    professional_skills = []
    programming_skills = []

    # --------------------------------------------------------
    # Explicit skills
    # --------------------------------------------------------

    for skill in explicit_skills:

        canonical = canonicalize_skill(
            skill
        )

        if any(
            canonical.lower()
            == known.lower()
            for known in KNOWN_SKILLS
        ):
            technical_skills.append(
                canonical
            )
        else:
            professional_skills.append(
                canonical
            )

    # --------------------------------------------------------
    # Explicit programming skills
    # --------------------------------------------------------

    for skill in explicit_programming:

        programming_skills.append(
            canonicalize_skill(
                skill
            )
        )

    # --------------------------------------------------------
    # Known technical skills anywhere
    # --------------------------------------------------------

    for skill in known_skills:

        technical_skills.append(
            canonicalize_skill(
                skill
            )
        )

    # --------------------------------------------------------
    # Clean duplicates
    # --------------------------------------------------------

    technical_skills = clean_entries(
        technical_skills
    )

    professional_skills = clean_entries(
        professional_skills
    )

    programming_skills = clean_entries(
        programming_skills
    )

    languages = clean_entries(
        [
            canonicalize_skill(
                language
            )
            for language in languages
        ]
    )

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # Languages are NOT included in all_skills.
    #
    # This prevents:
    #
    # Odia, Hindi, English
    #
    # from appearing under:
    #
    # "Detected Skills"
    # --------------------------------------------------------

    all_skills = clean_entries(
        technical_skills
        + programming_skills
        + professional_skills
    )

    return {
        "technical_skills": technical_skills,
        "professional_skills": professional_skills,
        "programming_skills": programming_skills,
        "languages": languages,
        "all_skills": all_skills,
    }
    """
    Hybrid skill extraction.

    Returns:
        technical_skills
        professional_skills
        programming_skills
        languages
        all_skills
    """

    (
        explicit_skills,
        explicit_programming,
        languages,
    ) = extract_skill_section(
        text
    )

    known_skills = extract_known_skills(
        text
    )

    technical_skills = []

    professional_skills = []

    programming_skills = []

    # --------------------------------------------------------
    # Explicit entries from Skills section
    # --------------------------------------------------------

    for skill in explicit_skills:

        canonical = canonicalize_skill(
            skill
        )

        # Known technical skill?
        if any(
            canonical.lower()
            == known.lower()
            for known in KNOWN_SKILLS
        ):
            technical_skills.append(
                canonical
            )
        else:
            professional_skills.append(
                canonical
            )

    # --------------------------------------------------------
    # Explicit programming section
    # --------------------------------------------------------

    for skill in explicit_programming:

        canonical = canonicalize_skill(
            skill
        )

        programming_skills.append(
            canonical
        )

    # --------------------------------------------------------
    # Known skills from entire resume
    # --------------------------------------------------------

    for skill in known_skills:

        canonical = canonicalize_skill(
            skill
        )

        technical_skills.append(
            canonical
        )

    # --------------------------------------------------------
    # Deduplicate
    # --------------------------------------------------------

    technical_skills = clean_entries(
        technical_skills
    )

    professional_skills = clean_entries(
        professional_skills
    )

    programming_skills = clean_entries(
        programming_skills
    )

    languages = clean_entries(
        [
            canonicalize_skill(
                language
            )
            for language in languages
        ]
    )

    # --------------------------------------------------------
    # Combined list
    # --------------------------------------------------------

    all_skills = clean_entries(
        technical_skills
        + programming_skills
        + professional_skills
        + languages
    )

    return {
        "technical_skills": technical_skills,
        "professional_skills": professional_skills,
        "programming_skills": programming_skills,
        "languages": languages,
        "all_skills": all_skills,
    }


# ============================================================
# CGPA EXTRACTION
# ============================================================

def extract_cgpa(
    text: str,
) -> float | None:
    """
    Extract an explicitly labelled CGPA/GPA.

    Examples supported:

        CGPA: 8.2
        CGPA - 8.2
        CGPA 8.2/10
        GPA: 8.2
        GPA 8.2/10
        8.2 CGPA
    """

    if not text:
        return None

    patterns = [
        r"\bc\.?\s*g\.?\s*p\.?\s*a\.?\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:/10)?\b",
        r"\bg\.?\s*p\.?\s*a\.?\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:/10)?\b",
        r"\b(\d{1,2}(?:\.\d{1,2})?)\s*(?:/10)?\s*c\.?\s*g\.?\s*p\.?\s*a\.?\b",
        r"\b(\d{1,2}(?:\.\d{1,2})?)\s*(?:/10)?\s*g\.?\s*p\.?\s*a\.?\b",
    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        for value in matches:

            try:
                cgpa = float(value)

            except ValueError:
                continue

            if 0.0 <= cgpa <= 10.0:
                return round(
                    cgpa,
                    2,
                )

    return None


# ============================================================
# RESUME QUALITY
# ============================================================

def calculate_resume_quality(
    extracted_text: str,
    skills: dict,
) -> dict:
    """
    Provide a simple quality diagnostic.

    This does NOT invent data.
    """

    text_length = len(
        extracted_text.strip()
    )

    all_skills = skills[
        "all_skills"
    ]

    if text_length < 100:
        quality = "LOW"

    elif text_length < 500:
        quality = "MEDIUM"

    else:
        quality = "GOOD"

    return {
        "quality": quality,
        "text_characters": text_length,
        "skill_count": len(
            all_skills
        ),
        "needs_ocr": (
            text_length < 100
        ),
    }


# ============================================================
# SUGGESTIONS
# ============================================================

def generate_suggestions(
    text: str,
    skills: dict,
) -> list[str]:

    normalized_text = (
        text.lower()
        if text
        else ""
    )

    all_skills = skills[
        "all_skills"
    ]

    suggestions = []

    if len(all_skills) < 3:
        suggestions.append(
            "Add more relevant technical or professional skills."
        )

    if "project" not in normalized_text:
        suggestions.append(
            "Add a Projects section to your resume."
        )

    if "experience" not in normalized_text:
        suggestions.append(
            "Add internship or work experience if available."
        )

    if "github" not in normalized_text:
        suggestions.append(
            "Add your GitHub profile."
        )

    if "linkedin" not in normalized_text:
        suggestions.append(
            "Add your LinkedIn profile."
        )

    if not suggestions:
        suggestions.append(
            "Resume contains useful information. "
            "Consider adding measurable achievements."
        )

    return suggestions


# ============================================================
# FILE INPUT
# ============================================================

async def read_pdf_upload(
    file: UploadFile,
) -> tuple[str, bytes]:

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is required",
        )

    original_filename = Path(
        file.filename
    ).name

    extension = Path(
        original_filename
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed",
        )

    if (
        file.content_type
        and file.content_type
        not in ALLOWED_CONTENT_TYPES
    ):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty",
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                "Resume file is too large. "
                "Maximum size is 5 MB"
            ),
        )

    return (
        original_filename,
        contents,
    )


# ============================================================
# SAVE RESUME
# ============================================================

def save_resume_file(
    original_filename: str,
    contents: bytes,
) -> Path:

    extension = Path(
        original_filename
    ).suffix.lower()

    stored_filename = (
        f"{uuid4().hex}{extension}"
    )

    file_path = (
        UPLOAD_DIR
        / stored_filename
    )

    try:
        file_path.write_bytes(
            contents
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to save resume file",
        ) from exc

    return file_path


# ============================================================
# UPLOAD
# ============================================================

@router.post(
    "/upload",
)
async def upload_resume(
    file: UploadFile = File(...),
):

    (
        original_filename,
        contents,
    ) = await read_pdf_upload(
        file
    )

    file_path = save_resume_file(
        original_filename,
        contents
    )

    extracted_text = extract_pdf_text(
        contents
    )

    return {
        "filename": original_filename,
        "message": "Resume uploaded successfully",
        "extracted_text": extracted_text,
        "stored_filename": file_path.name,
    }


# ============================================================
# ANALYZE
# ============================================================

@router.post(
    "/analyze",
)
async def analyze_resume(
    file: UploadFile = File(...),
):

    (
        original_filename,
        contents,
    ) = await read_pdf_upload(
        file
    )

    save_resume_file(
        original_filename,
        contents
    )

    extracted_text = extract_pdf_text(
        contents
    )

    if not extracted_text:

        raise HTTPException(
            status_code=400,
            detail=(
                "No readable text was found "
                "in the PDF. This may be a scanned "
                "image-only PDF. OCR support is "
                "required for this document."
            ),
        )

    skills = extract_skills(
        extracted_text
    )

    detected_cgpa = extract_cgpa(
        extracted_text
    )

    suggestions = generate_suggestions(
        extracted_text,
        skills
    )

    quality = calculate_resume_quality(
        extracted_text,
        skills
    )

    return {
        "filename": original_filename,
        "message": "Resume analyzed successfully",

        "skills": skills["all_skills"],

        "technical_skills": (
            skills["technical_skills"]
        ),

        "professional_skills": (
            skills["professional_skills"]
        ),

        "programming_skills": (
            skills["programming_skills"]
        ),

        "languages": (
            skills["languages"]
        ),

        "skill_count": len(
            skills["all_skills"]
        ),

        "cgpa": detected_cgpa,

        "resume_quality": quality,

        "suggestions": suggestions,

        "extracted_text": extracted_text,
    }