from datetime import timedelta
from typing import List

from app.ai.scheduling.models import PlacementEvent
from app.ai.scheduling.schemas import SchedulingRequest

def generate_interview_slots(
    request: SchedulingRequest,
) -> List[PlacementEvent]:

    slots = []

    slot_number = 1

    # Determine how many interviewers can actually
    # conduct interviews simultaneously.
    if request.mode.lower() == "online":

        usable_interviewers = request.number_of_interviewers

    else:

        usable_interviewers = min(
            request.number_of_interviewers,
            request.number_of_rooms,
        )

    for period in request.availability_periods:

        current_time = period.start_time

        slot_duration = timedelta(
            minutes=request.interview_duration_minutes
        )

        while current_time + slot_duration <= period.end_time:

            for interviewer in range(
                1,
                usable_interviewers + 1
            ):

                slot = PlacementEvent(
                    event_id=f"SLOT_{slot_number}",
                    title=f"Interview Slot - Interviewer {interviewer}",
                    start_time=current_time,
                    end_time=current_time + slot_duration,
                    location=(
                        f"Room {interviewer}"
                        if request.mode.lower() == "offline"
                        else None
                    ),
                    interviewer_id=f"INT_{interviewer}",
                )

                slots.append(slot)

                slot_number += 1

            current_time += slot_duration

    return slots

def assign_students_to_slots(
    students: list[str],
    slots: List[PlacementEvent],
) -> tuple[List[PlacementEvent], List[str]]:

    scheduled_events = []
    unscheduled_students = []

    for student in students:

        # No more available slots
        if len(scheduled_events) >= len(slots):
            unscheduled_students.append(student)
            continue

        slot = slots[len(scheduled_events)]

        event = PlacementEvent(
            event_id=f"INTERVIEW_{student}",
            title=f"Interview - {student}",
            start_time=slot.start_time,
            end_time=slot.end_time,
            location=slot.location,
            student_id=student,
            interviewer_id=slot.interviewer_id,
        )

        scheduled_events.append(event)

    return scheduled_events, unscheduled_students


def calculate_capacity(
    request: SchedulingRequest,
) -> int:

    total_capacity = 0

    for period in request.availability_periods:

        total_minutes = int(
            (
                period.end_time - period.start_time
            ).total_seconds() / 60
        )

        number_of_time_slots = (
            total_minutes
            // request.interview_duration_minutes
        )

        if request.mode.lower() == "online":

            period_capacity = (
                number_of_time_slots
                * request.number_of_interviewers
            )

        else:

            usable_interviewers = min(
                request.number_of_interviewers,
                request.number_of_rooms,
            )

            period_capacity = (
                number_of_time_slots
                * usable_interviewers
            )

        total_capacity += period_capacity

    return total_capacity