# Inventory video rollout

Apply the additive `0039_inventory_videos` migration with video disabled. Build
`backend/video-worker.Dockerfile` with the backend directory as its build
context. Run the image as a separate DigitalOcean worker using the existing
private Spaces, PostgreSQL and ClamAV settings. The existing worker continues to
handle reminders, notifications and photo scans.

Both the API and video worker read `INVENTORY_VIDEO_ENABLED` (default false).
Production video also requires `STORAGE_BACKEND=spaces`. The client sends
one 8 MiB part at a time to the API origin. The API uses the bucket's private
origin and environment prefix. Disable access logging that records query
strings for the video playback route. Playback URLs contain a ten-minute grant
and must not be copied into logs, analytics or screenshots.

In staging, configure ClamD's `StreamMaxLength`, `MaxFileSize` and
`MaxScanSize` above 300 MB and enable `AlertExceedsMax`. Verify the scanner
rejects an over-limit sample and accepts a legitimate full-size clip before
enabling the feature for agents. Use synthetic MOV/HEVC and MP4 files,
including a three-minute clip near the limit. Verify interruption and resume,
ready/error status, iPhone Safari inline playback and seeking, expired and
revoked grants, and a restored ready video. Check peak worker memory and CPU,
queue age and ordinary reminder delay while encoding.

Source parts are private until scanning and encoding complete. The worker
removes the source after successful publication or a terminal failure.
Unfinished uploads expire after 24 hours. The existing recovery manifest
validates stored video outputs and staged parts on supported local backup
targets. For production recovery, confirm that the Spaces backup covers the
environment object prefix and test PostgreSQL and Spaces recovery together.
