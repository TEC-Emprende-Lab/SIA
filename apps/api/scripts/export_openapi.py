import argparse
import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parents[1]))

from app.main import app

output = Path(__file__).parents[3] / "packages" / "contracts" / "openapi.json"
parser = argparse.ArgumentParser(description="Export or check the current API contract")
parser.add_argument(
    "--check", action="store_true", help="Compare with the working tree, not Git HEAD"
)
args = parser.parse_args()
schema = json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n"
if args.check:
    if not output.exists() or output.read_text(encoding="utf-8") != schema:
        raise SystemExit("OpenAPI is stale; run scripts/export_openapi.py")
    print("OpenAPI matches the current application")
else:
    output.write_text(schema, encoding="utf-8")
