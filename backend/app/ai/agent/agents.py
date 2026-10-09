from app.ai.matching.skill_matcher import match_skills
from app.ai.matching.skill_gap import calculate_skill_gap
from app.ai.matching.job_matcher import match_student_to_job
from app.ai.readiness.project_aggregation import aggregate_project_quality
from app.ai.readiness.readiness_features import extract_readiness_features
from app.ai.readiness.readiness_model import calculate_readiness_score
from app.ai.scheduling.conflict_detector import detect_scheduling_conflicts
from app.ai.scheduling.alternative_slots import suggest_alternative_slots
from app.ai.recommendation.preparation_plan import (
    generate_preparation_plan,
)



def skill_analysis_agent(state):
    student = state["student_profile"]
    job = state["selected_job"]

    skill_result = match_skills(
        student=student,
        job=job,
    )

    skill_gap = calculate_skill_gap(
        skill_result
    )

    return {
        "skill_result": skill_result,
        "skill_gap": skill_gap,
    }


def job_matching_agent(state):
    student = state["student_profile"]
    job = state["selected_job"]

    job_match = match_student_to_job(
        student=student,
        job=job,
    )

    return {
        "job_matches": [job_match],
    }


def readiness_agent(state):
    student = state["student_profile"]
    skill_result = state["skill_result"]
    job_match = state["job_matches"][0]

    project_analyses = state.get(
        "project_analyses",
        [],
    )

    project_quality = aggregate_project_quality(
        project_analyses
    )

    readiness_features = extract_readiness_features(
        student=student,
        skill_result=skill_result,
        fit_score=job_match.suitability_score,
        overall_project_quality=project_quality,
    )

    readiness_result = calculate_readiness_score(
        readiness_features
    )

    return {
        "project_quality": project_quality,
        "readiness_features": readiness_features,
        "readiness_result": readiness_result,
    }


def preparation_agent(state):
    job = state["selected_job"]
    skill_gap = state["skill_gap"]

    preparation_plan = generate_preparation_plan(
        job=job,
        skill_gap=skill_gap,
    )

    return {
        "preparation_plan": preparation_plan,
    }


def scheduling_agent(state):
    placement_events = state.get("placement_events", [])
    student_events = state.get("student_events", [])

    all_events = placement_events + student_events

    conflicts = detect_scheduling_conflicts(all_events)

    recommendations = []

    for conflict in conflicts:

        conflicted_event = next(
            (
                event
                for event in all_events
                if event.event_id == conflict.event_1
            ),
            None,
        )

        if conflicted_event is None:
            continue

        alternative_slots = suggest_alternative_slots(
            conflicted_event=conflicted_event,
            existing_events=all_events,
            duration_minutes=int(
                (
                    conflicted_event.end_time
                    - conflicted_event.start_time
                ).total_seconds() / 60
            ),
        )

        recommendations.append({
            "conflict_type": conflict.conflict_type,
            "message": conflict.message,
            "alternative_slots": alternative_slots,
            "action": "TPO_REVIEW_REQUIRED",
        })

    return {
        "scheduling_conflicts": conflicts,
        "schedule_recommendations": recommendations,
    }


def career_agent(state):
    """
    Career Agent:
    Coordinates student career analysis.
    """

    state = skill_analysis_agent(state)
    state = job_matching_agent({
        **state,
        "skill_result": state["skill_result"],
        "skill_gap": state["skill_gap"],
    })
    state = readiness_agent({
        **state,
        "job_matches": state["job_matches"],
    })
    state = preparation_agent({
        **state,
        "skill_gap": state["skill_gap"],
    })

    return state


def scheduling_agent_controller(state):
    """
    Scheduling Agent:
    Coordinates scheduling conflict analysis
    and alternative-slot recommendations.
    """

    return scheduling_agent(state)