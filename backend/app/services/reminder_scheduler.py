from __future__ import annotations

import asyncio
import logging
import os

from app.services.placement_reminder_engine import generate_student_reminders

logger = logging.getLogger("campuslink.reminders")


def _interval_seconds() -> int:
    try:
        return max(60, int(os.getenv("REMINDER_INTERVAL_SECONDS", "900")))
    except ValueError:
        return 900


async def reminder_loop() -> None:
    """Run automatic student placement/profile reminders in the background."""
    interval = _interval_seconds()

    # Initial pass after startup; failures must never prevent FastAPI startup.
    try:
        generate_student_reminders()
    except Exception:
        logger.exception("Initial placement reminder pass failed")

    while True:
        await asyncio.sleep(interval)
        try:
            created = generate_student_reminders()
            logger.info("Placement reminder pass created %s notifications", len(created))
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Placement reminder pass failed")
