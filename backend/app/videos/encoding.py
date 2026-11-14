"""Constrained decoding and re-encoding of scanned QuickTime and MP4 files."""

import json
import math
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

from app.identity.security import IdentityError
from app.videos.service import MAX_DURATION, MAX_OUTPUT


def executable(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise IdentityError("VIDEO_ENCODER_UNAVAILABLE", 503)
    return str(Path(path).resolve())


def codec_environment() -> dict[str, str]:
    # The media subprocess has no use for database, session, or bucket credentials.
    return {
        name: os.environ[name]
        for name in ("SystemRoot", "WINDIR", "TEMP", "TMP", "TMPDIR")
        if name in os.environ
    }


def probe(source: Path) -> dict[str, Any]:
    try:
        result = subprocess.run(  # noqa: S603 - fixed binary, flags and private spool paths
            [
                executable("ffprobe"),
                "-max_alloc",
                "134217728",
                "-v",
                "error",
                "-protocol_whitelist",
                "file",
                "-f",
                "mov",
                "-show_entries",
                "format=duration:stream=codec_type,codec_name,width,height",
                "-of",
                "json",
                str(source),
            ],
            check=True,
            cwd=source.parent,
            env=codec_environment(),
            capture_output=True,
            timeout=30,
        )
        return dict(json.loads(result.stdout))
    except subprocess.CalledProcessError, ValueError:
        raise IdentityError("VIDEO_FORMAT_UNSUPPORTED", 422) from None
    except OSError, subprocess.TimeoutExpired:
        raise IdentityError("VIDEO_ENCODER_UNAVAILABLE", 503) from None


def duration(info: dict[str, Any]) -> float:
    try:
        value = float(info["format"]["duration"])
        if math.isfinite(value) and value > 0:
            return value
    except KeyError, ValueError, TypeError:
        pass
    raise IdentityError("VIDEO_FORMAT_UNSUPPORTED", 422)


def encode(source: Path, target: Path) -> int:
    info = probe(source)
    seconds = duration(info)
    if seconds > MAX_DURATION:
        raise IdentityError("VIDEO_TOO_LONG", 422)
    tracks = [stream for stream in info.get("streams", []) if stream.get("codec_type") == "video"]
    if (
        len(tracks) != 1
        or not 2 <= tracks[0].get("width", 0) <= 4096
        or not 2 <= tracks[0].get("height", 0) <= 4096
    ):
        raise IdentityError("VIDEO_FORMAT_UNSUPPORTED", 422)
    scale = (
        "scale=w='if(gte(iw,ih),min(iw,1280),min(iw,720))':"
        "h='if(gte(iw,ih),min(ih,720),min(ih,1280))':"
        "force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30"
    )
    try:
        subprocess.run(  # noqa: S603 - fixed binary, flags and private spool paths
            [
                executable("ffmpeg"),
                "-max_alloc",
                "134217728",
                "-nostdin",
                "-v",
                "error",
                "-protocol_whitelist",
                "file",
                "-f",
                "mov",
                "-threads",
                "2",
                "-i",
                str(source),
                "-filter_threads",
                "1",
                "-map",
                "0:v:0",
                "-map",
                "0:a:0?",
                "-map_metadata",
                "-1",
                "-map_metadata:s",
                "-1",
                "-map_chapters",
                "-1",
                "-vf",
                scale,
                "-c:v",
                "libx264",
                "-threads",
                "2",
                "-preset",
                "fast",
                "-pix_fmt",
                "yuv420p",
                "-crf",
                "24",
                "-maxrate",
                "1900k",
                "-bufsize",
                "1900k",
                "-c:a",
                "aac",
                "-b:a",
                "96k",
                "-ac",
                "2",
                "-t",
                str(MAX_DURATION),
                "-movflags",
                "+faststart",
                "-f",
                "mp4",
                str(target),
            ],
            check=True,
            cwd=source.parent,
            env=codec_environment(),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=480,
        )
        if not 0 < target.stat().st_size <= MAX_OUTPUT:
            raise IdentityError("VIDEO_OUTPUT_TOO_LARGE", 422)
    except subprocess.CalledProcessError:
        raise IdentityError("VIDEO_PROCESSING_FAILED", 422) from None
    except OSError, subprocess.TimeoutExpired:
        raise IdentityError("VIDEO_ENCODER_UNAVAILABLE", 503) from None
    if abs(duration(probe(target)) - seconds) > 0.5:
        raise IdentityError("VIDEO_PROCESSING_FAILED", 422)
    return math.ceil(seconds)
