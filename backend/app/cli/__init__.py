"""Server-local tools. They are never exposed as HTTP routes."""

from app.runtime import require_operator_runtime

require_operator_runtime()
