"""Refuse accidental execution outside this checkout's pinned virtual environment."""

import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def create_server_loop() -> asyncio.AbstractEventLoop:
    """Use socket-based Windows HTTP serving without Proactor reset callbacks."""
    return asyncio.SelectorEventLoop()


def require_venv() -> None:
    """Fail before loading settings or opening a database with the wrong interpreter."""
    if Path(sys.prefix).resolve() != BACKEND_ROOT / ".venv" or sys.version_info[:3] != (3, 14, 3):
        raise RuntimeError("Use backend/.venv/Scripts/python.exe (Python 3.14.3).")
