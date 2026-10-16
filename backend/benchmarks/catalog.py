"""Safe generated OpenAPI inventory; contains schemas, never configured values/data."""

import hashlib
import json

from app.main import create_app
from app.recovery.private import guard, protect_directory
from app.runtime import BACKEND_ROOT, require_venv


def main() -> None:
    require_venv()
    schema = create_app().openapi()
    encoded = json.dumps(schema, sort_keys=True, separators=(",", ":")).encode()
    root = BACKEND_ROOT / ".local-data/acceptance"
    protect_directory(root)
    target = root / "openapi.json"
    guard(target, root)
    target.write_bytes(encoded)
    rows = [
        {"path": path, "methods": sorted(operations)}
        for path, operations in sorted(schema["paths"].items())
    ]
    print(
        json.dumps(
            {
                "openapi": schema["openapi"],
                "sha256": hashlib.sha256(encoded).hexdigest(),
                "paths": len(rows),
                "operations": sum(len(row["methods"]) for row in rows),
                "catalogue": rows,
            }
        )
    )


if __name__ == "__main__":
    main()
