from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAIN = ROOT / "app" / "main.py"

IMPORT_LINE = "from app.routers.placement_reminders import router as placement_reminders_router"
INCLUDE_LINE = "app.include_router(placement_reminders_router)"

if not MAIN.exists():
    raise SystemExit("Run this script from the CampusLink backend root.")

text = MAIN.read_text(encoding="utf-8")

if IMPORT_LINE not in text:
    lines = text.splitlines()
    positions = [i for i, line in enumerate(lines) if line.startswith("from app.routers")]
    at = positions[-1] + 1 if positions else 0
    lines.insert(at, IMPORT_LINE)
    text = "\n".join(lines) + "\n"

if INCLUDE_LINE not in text:
    lines = text.splitlines()
    positions = [i for i, line in enumerate(lines) if "app.include_router" in line]
    if not positions:
        raise SystemExit("Could not find app.include_router(...) in app/main.py")
    lines.insert(positions[-1] + 1, INCLUDE_LINE)
    text = "\n".join(lines) + "\n"

MAIN.write_text(text, encoding="utf-8")
print("Placement reminder router installed.")
