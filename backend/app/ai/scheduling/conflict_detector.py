from typing import List

from app.ai.scheduling.models import PlacementEvent, SchedulingConflict


def detect_scheduling_conflicts(
    events: List[PlacementEvent],
) -> List[SchedulingConflict]:

    conflicts = []

    for i in range(len(events)):
        for j in range(i + 1, len(events)):

            event_1 = events[i]
            event_2 = events[j]

            if (
                event_1.start_time < event_2.end_time
                and event_2.start_time < event_1.end_time
            ):
                conflicts.append(
                    SchedulingConflict(
                        event_1=event_1.event_id,
                        event_2=event_2.event_id,
                        conflict_type="TIME_OVERLAP",
                        message=(
                            f"'{event_1.title}' overlaps with "
                            f"'{event_2.title}'."
                        ),
                    )
                )

    return conflicts