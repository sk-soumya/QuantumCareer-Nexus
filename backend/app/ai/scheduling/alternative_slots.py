from datetime import datetime, timedelta
from typing import List

from app.ai.scheduling.models import PlacementEvent


def suggest_alternative_slots(
    conflicted_event: PlacementEvent,
    existing_events: List[PlacementEvent],
    duration_minutes: int = 60,
    search_hours: int = 6,
) -> List[dict]:

    recommendations = []

    duration = timedelta(minutes=duration_minutes)

    start = conflicted_event.end_time

    for _ in range(search_hours):

        candidate_end = start + duration

        has_conflict = any(
            start < event.end_time
            and candidate_end > event.start_time
            for event in existing_events
            if event.event_id != conflicted_event.event_id
        )

        if not has_conflict:
            recommendations.append({
                "start_time": start,
                "end_time": candidate_end,
                "reason": "No conflict with existing events.",
            })

        start += timedelta(hours=1)

        if len(recommendations) >= 3:
            break

    return recommendations