"""Operator-only backup/recovery; no public endpoint, raw tool output or credentials."""

import argparse
import json
import time
from uuid import UUID

from app.runtime import require_venv


def main() -> None:
    require_venv()
    from app.recovery.maintenance import resume
    from app.recovery.private import RecoveryError
    from app.recovery.service import create, extract_code, restore, tick
    from app.recovery.store import Store
    from app.settings import load_settings

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "operation", choices=["create", "restore", "status", "schedule", "resume", "extract-code"]
    )
    parser.add_argument("--point", type=UUID)
    parser.add_argument("--replace-recovery", action="store_true")
    parser.add_argument("--watch", action="store_true")
    args = parser.parse_args()
    settings = load_settings()
    try:
        while True:
            result: object
            if args.operation == "create":
                result = create(settings)
            elif args.operation in {"restore", "extract-code"}:
                if not args.point:
                    raise RecoveryError("BACKUP_POINT_REQUIRED")
                result = (
                    extract_code(settings, args.point)
                    if args.operation == "extract-code"
                    else restore(settings, args.point, replace_recovery=args.replace_recovery)
                )
            elif args.operation == "status":
                result = Store(settings).status()
            elif args.operation == "resume":
                resume(settings)
                result = {"maintenance_resumed": True}
            else:
                try:
                    result = tick(settings)
                except Exception:
                    if not args.watch:
                        raise
                    result = {"backup_attempt_failed": True}
            print(json.dumps(result), flush=True)
            if args.operation != "schedule" or not args.watch:
                break
            time.sleep(30)
    except KeyboardInterrupt:
        pass
    except RecoveryError as failure:
        raise SystemExit(str(failure)) from None
    except Exception:
        raise SystemExit(
            "LOCAL_RECOVERY_FAILED: inspect protected point and local configuration."
        ) from None


if __name__ == "__main__":
    main()
