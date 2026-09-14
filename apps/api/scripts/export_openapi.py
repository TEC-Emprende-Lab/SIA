import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parents[1]))

from app.main import app

output = Path(__file__).parents[3] / "packages" / "contracts" / "openapi.json"
output.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
