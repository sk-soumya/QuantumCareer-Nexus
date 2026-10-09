from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP = ROOT / "app"
ROUTER = APP / "routers" / "resume_agent.py"
MAIN = APP / "main.py"

if not ROUTER.exists():
    raise SystemExit("Missing app/routers/resume_agent.py")
if not MAIN.exists():
    raise SystemExit("Missing app/main.py")

text = MAIN.read_text(encoding="utf-8")
imp = "from app.routers.resume_agent import router as resume_agent_router"
inc = "app.include_router(resume_agent_router)"

if imp not in text:
    lines = text.splitlines()
    positions = [i for i, line in enumerate(lines) if line.startswith("from app.routers")]
    insert_at = positions[-1] + 1 if positions else 0
    lines.insert(insert_at, imp)
    text = "\n".join(lines) + "\n"

if inc not in text:
    lines = text.splitlines()
    positions = [i for i, line in enumerate(lines) if "app.include_router" in line]
    if not positions:
        raise SystemExit("No app.include_router(...) found in app/main.py")
    lines.insert(positions[-1] + 1, inc)
    text = "\n".join(lines) + "\n"

MAIN.write_text(text, encoding="utf-8")
print("Resume Agent router installed.")
print("Next: python -m compileall app")
