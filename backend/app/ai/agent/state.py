from typing import Any, Dict, List, Optional, TypedDict


class CampusLinkState(TypedDict, total=False):
    # Input
    resume_text: str
    job_profiles: List[Any]

    # Extracted student information
    student_profile: Any

    # Job analysis
    selected_job: Any
    job_matches: List[Any]

    # Skill analysis
    skill_result: Dict[str, Any]
    skill_gap: Dict[str, Any]

    # GitHub / project analysis
    project_analyses: List[Dict[str, Any]]
    project_quality: float

    # Readiness
    readiness_features: Dict[str, Any]
    readiness_result: Dict[str, Any]

    # Recommendations
    preparation_plan: Any

    # Scheduling
    placement_events: List[Any]
    student_events: List[Any]
    scheduling_conflicts: List[Any]
    reschedule_requests: List[Dict[str, Any]]
    schedule_recommendations: List[Dict[str, Any]]
    
    # Analytics
    analytics: Dict[str, Any]

    # Workflow control
    errors: List[str]