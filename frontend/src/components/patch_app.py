from pathlib import Path
import re
import shutil

COMPONENTS = Path(__file__).resolve().parent
SRC = COMPONENTS.parent
APP = SRC / "App.jsx"
BACKUP = SRC / "App.quantum_backup.jsx"

if not APP.exists():
    raise SystemExit(f"App.jsx not found: {APP}")

text = APP.read_text(encoding="utf-8")
if not BACKUP.exists():
    shutil.copy2(APP, BACKUP)

if 'from "./components/WorkspaceTools"' not in text:
    anchor = 'import QuantumAI from "./components/QuantumAI";'
    if anchor in text:
        text = text.replace(anchor, anchor + '\nimport WorkspaceTools from "./components/WorkspaceTools";', 1)
    else:
        text = 'import WorkspaceTools from "./components/WorkspaceTools";\n' + text

# Remove route-local QuantumAI mounts so the assistant is rendered exactly once globally.
text = re.sub(r'\n\s*<QuantumAI\s*/>\s*', '\n', text)

# Render one global assistant + universal back/dashboard controls under BrowserRouter.
needle = '\n      </Routes>\n'
insert = '\n      </Routes>\n\n      <WorkspaceTools />\n      <QuantumAI />\n'
if '      <WorkspaceTools />' not in text:
    if needle not in text:
        raise SystemExit('Could not find closing </Routes> in App.jsx')
    text = text.replace(needle, insert, 1)

APP.write_text(text, encoding="utf-8")
print("Quantum AI + universal Back/Dashboard navigation linked successfully.")
print(f"Backup: {BACKUP}")
