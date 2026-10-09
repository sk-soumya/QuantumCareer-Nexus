import numpy as np
import shap


SKILL_WEIGHT = 0.50
SEMANTIC_WEIGHT = 0.40
CGPA_WEIGHT = 0.10


def _matching_function(features: np.ndarray) -> np.ndarray:
    """
    Explain the same scoring formula used by the
    CAMPUSLINK matching engine.

    Feature order:
        0 = skill score
        1 = semantic score
        2 = cgpa score
        3 = eligibility flag
    """

    results = []

    for row in features:
        skill_score = float(row[0])
        semantic_score = float(row[1])
        cgpa_score = float(row[2])
        eligible = float(row[3])

        score = (
            skill_score * SKILL_WEIGHT
            + semantic_score * SEMANTIC_WEIGHT
            + cgpa_score * CGPA_WEIGHT
        )

        # Hard eligibility rule:
        # ineligible candidates receive zero recommendation score.
        if eligible < 0.5:
            score = 0.0

        results.append(score)

    return np.asarray(
        results,
        dtype=float,
    )


def explain_match(
    skill_score: float,
    semantic_score: float,
    cgpa_score: float,
    is_eligible: bool,
) -> dict:
    """
    Generate SHAP explanations for one candidate match.

    Returns the contribution of each matching feature.
    """

    background = np.asarray(
        [
            [0.0, 0.0, 0.0, 0.0],
            [50.0, 50.0, 50.0, 1.0],
            [100.0, 100.0, 100.0, 1.0],
        ],
        dtype=float,
    )

    candidate = np.asarray(
        [
            [
                float(skill_score),
                float(semantic_score),
                float(cgpa_score),
                1.0 if is_eligible else 0.0,
            ]
        ],
        dtype=float,
    )

    explainer = shap.Explainer(
        _matching_function,
        background,
    )

    shap_values = explainer(
        candidate,
    )

    values = shap_values.values[0]

    feature_names = [
        "skill_score",
        "semantic_score",
        "cgpa_score",
        "eligibility",
    ]

    contributions = {}

    for name, value in zip(
        feature_names,
        values,
    ):
        contributions[name] = round(
            float(value),
            4,
        )

    base_value = float(
        np.asarray(
            shap_values.base_values[0]
        ).reshape(-1)[0]
    )

    model_output = float(
        _matching_function(candidate)[0]
    )

    return {
        "base_value": round(
            base_value,
            4,
        ),
        "model_output": round(
            model_output,
            4,
        ),
        "feature_contributions": contributions,
    }