from typing import List, Dict


def aggregate_project_quality(
    project_analyses: List[Dict]
) -> float:
    """
    Calculate an overall project-quality score for readiness.

    Each project's quality is weighted by its relevance to
    the target job.
    """

    if not project_analyses:
        return 0.0

    weighted_quality = 0.0
    total_relevance = 0.0

    for project in project_analyses:

        analysis = project.get("analysis", {})

        quality = analysis.get("project_quality_score")
        relevance = project.get("relevance_score")

        if quality is None or relevance is None:
            continue

        quality = min(
            max(float(quality), 0.0),
            10.0
        )

        relevance = max(
            float(relevance),
            0.0
        )

        weighted_quality += (
            quality * relevance
        )

        total_relevance += relevance

    if total_relevance == 0:
        return 0.0

    overall_quality = (
        weighted_quality /
        total_relevance
    )

    return round(
        overall_quality,
        2
    )