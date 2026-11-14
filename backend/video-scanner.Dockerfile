FROM clamav/clamav@sha256:638d90201ee7ee6a82d249a2fc23b132e578673b5f1f2766852b127676ca1ef6

# Preserve the image's private ClamD and signature-update configuration.
RUN sed -i -E '/^[[:space:]]*(StreamMaxLength|MaxFileSize|MaxScanSize|AlertExceedsMax)[[:space:]]/d' /etc/clamav/clamd.conf \
    && printf '\nStreamMaxLength 320M\nMaxFileSize 320M\nMaxScanSize 400M\nAlertExceedsMax yes\n' >> /etc/clamav/clamd.conf
