from langgraph.graph import END, StateGraph

from app.ai.agent.agents import (
    career_agent,
    scheduling_agent_controller,
)
from app.ai.agent.state import CampusLinkState


def analytics_agent(state):
    """Create deterministic placement analytics from the agent state."""
    from app.ai.analytics.placement_analytics import (
        calculate_placement_analytics,
    )

    job_matches = state.get("job_matches", [])
    readiness_result = state.get("readiness_result")
    skill_gap = state.get("skill_gap")

    analytics = calculate_placement_analytics(
        job_matches=[
            job.model_dump() if hasattr(job, "model_dump") else job
            for job in job_matches
        ],
        readiness_result=readiness_result,
        skill_gap=skill_gap,
    )

    return {"analytics": analytics}


def build_agentic_workflow():
    """Build the complete Member 4 career -> scheduling -> analytics flow.

    The original graph advertised a parallel branch but could invoke analytics
    before scheduling completed. This version uses a deterministic sequence so
    analytics always sees scheduling results.
    """
    workflow = StateGraph(CampusLinkState)

    workflow.add_node("career_agent", career_agent)
    workflow.add_node("scheduling_agent", scheduling_agent_controller)
    workflow.add_node("analytics", analytics_agent)

    workflow.set_entry_point("career_agent")
    workflow.add_edge("career_agent", "scheduling_agent")
    workflow.add_edge("scheduling_agent", "analytics")
    workflow.add_edge("analytics", END)

    return workflow.compile()
