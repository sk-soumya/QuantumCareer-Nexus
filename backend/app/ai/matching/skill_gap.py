from typing import Dict, List


def calculate_skill_gap(
    skill_result: Dict
) -> Dict:

    required_missing: List[str] = skill_result.get(
        "required_missing",
        []
    )

    preferred_missing: List[str] = skill_result.get(
        "preferred_missing",
        []
    )

    required_matched: List[str] = skill_result.get(
        "required_matched",
        []
    )

    preferred_matched: List[str] = skill_result.get(
        "preferred_matched",
        []
    )

    return {
        "required_skill_gaps": required_missing,
        "preferred_skill_gaps": preferred_missing,
        "required_skills_strength": required_matched,
        "preferred_skills_strength": preferred_matched,
        "total_skill_gaps": (
            len(required_missing)
            + len(preferred_missing)
        ),
    }