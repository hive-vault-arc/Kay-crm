"""KAY backend package; application execution requires a pinned project runtime."""

from app.runtime import require_runtime

require_runtime()
