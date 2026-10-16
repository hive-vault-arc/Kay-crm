"""Server-local tools. They are never exposed as HTTP routes."""

from app.runtime import require_venv

require_venv()
