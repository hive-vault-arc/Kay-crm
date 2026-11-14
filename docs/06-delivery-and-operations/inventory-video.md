# Inventory video rollout

Apply the additive `0050_inventory_videos` migration with video disabled. Build
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

In staging, build `backend/video-scanner.Dockerfile` with `backend/` as its
context. It retains the official ClamAV image's signature updates and sets
`StreamMaxLength` and `MaxFileSize` to 320 MiB, `MaxScanSize` to 400 MiB, and
`AlertExceedsMax` to `yes`. Keep port 3310 private. Verify the scanner rejects an
over-limit stream and accepts a legitimate full-size clip before enabling the
feature for agents. Use synthetic MOV/HEVC and MP4 files,
including a three-minute clip near the limit. Verify interruption and resume,
ready/error status, iPhone Safari inline playback and seeking, expired and
revoked grants, and a restored ready video. Check peak worker memory and CPU,
queue age and ordinary reminder delay while encoding.

Local packaging smoke: both Linux images built. ClamD scanned a 300 MiB
synthetic MOV through the application's streaming scanner and refused a 321 MiB
stream. The non-root worker encoded the synthetic portrait clip with the network
turned off and a 2 CPU / 1 GiB container limit. It produced a 180-second,
45,086,717-byte fast-start H.264 MP4 at 720 × 1280 and used 380 MiB peak memory.
A separate full-size synthetic API run transferred exactly 300,000,000 bytes,
resumed after the first chunk, scanned and encoded the upload, removed staged
parts, served two byte ranges, and rejected playback after session revocation.
A large MOV took longer to scan than the ordinary 20-second file deadline; the
video path now waits up to 135 seconds for the verdict after sending the bytes.
Connection and send timeouts stay at 20 seconds. These checks use a disposable
PostgreSQL database and local storage; DigitalOcean Spaces, shared worker load,
and physical iPhone Safari still require staging verification.

Source parts are private until scanning and encoding complete. The worker
removes the source after successful publication or a terminal failure.
Unfinished uploads expire after 24 hours. The existing recovery manifest
validates stored video outputs and staged parts on supported local backup
targets. For production recovery, confirm that the Spaces backup covers the
environment object prefix and test PostgreSQL and Spaces recovery together.
