# Inventory video rollout

Apply the additive `0050_inventory_videos` migration with video disabled. Build
`backend/video-worker.Dockerfile` with the backend directory as its build
context. Run the image as a separate DigitalOcean worker using the existing
private Spaces and PostgreSQL settings. The existing worker continues to
handle reminders, notifications and private file verification.

Both the API and video worker read `INVENTORY_VIDEO_ENABLED` (default false).
Production video also requires `STORAGE_BACKEND=spaces`. The client sends
one 8 MiB part at a time to the API origin. The API uses the bucket's private
origin and environment prefix. Disable access logging that records query
strings for the video playback route. Playback URLs contain a ten-minute grant
and must not be copied into logs, analytics or screenshots.

## Local Windows use

The inventory gallery has a **Vidéos MP4 / MOV** tab for properties and
programmes. Its file picker includes QuickTime MOV from iPhone and MP4.
After applying `0050_inventory_videos`, set `INVENTORY_VIDEO_ENABLED=true`
in the ignored `backend/.env` and load it on the next local API startup.
From `backend/`, run `./.venv/Scripts/python.exe -m app.cli.video_worker`
in a shell whose `PATH` includes both `ffmpeg.exe` and `ffprobe.exe`.
The video worker checks for both executables before claiming uploads.

## Release verification

Verify resumable upload and inline playback with synthetic MP4/H.264 and iPhone
MOV/HEVC, including a clip near the 300 MB limit. The worker verifies source
part integrity and encodes to H.264 MP4 with FFmpeg. Check seeking, expired and
revoked grants, queue age and regular reminder delivery during encoding.

Source parts stay private until encoding succeeds. The worker
removes the source after successful publication or a terminal failure.
Unfinished uploads expire after 24 hours. The existing recovery manifest
validates stored video outputs and staged parts on supported local backup
targets. For production recovery, confirm that the Spaces backup covers the
environment object prefix and test PostgreSQL and Spaces recovery together.
