# Agent inventory photographs

Owner request, 2026-10-23: agents must also be able to upload photographs of
standalone properties, physical apartments/units and whole projects.

Previously the shared photo reader existed, but both the upload control and
inventory file-write authorization were manager/administrator-only. Whole
developments only had the generic attachment flow.

## Narrow permission boundary

Authenticated active agents may create `purpose=photo` WebP documents on active
shared properties or developments. All physical property categories use the same
rule. They may obtain upload permits and resume transfers only for photos they
created. They cannot overwrite a colleague's photo, archive inventory photos,
retry another person's scan or upload ordinary project/property attachments.
Manager/administrator file administration remains unchanged. Private Contact,
Lead, Deal and generated-document authorization is not broadened.

Origin, CSRF, session binding, current-session rechecks, one-use transfer permits,
idempotency, byte/MIME validation, ClamAV quarantine and private Spaces storage
remain authoritative. The existing agency transaction lock serializes the ten
active-image slots per parent, including historical image attachments.

Migration `0035_project_photos`, following `0034_proactive_work`, widens only the
existing photo-parent CHECK to admit developments. It does not rewrite, delete,
export or relocate any document. Downgrade is test-only and refuses existing
development photo records.

## Interface

Reuse the Riviera/shadcn/Tailwind photo gallery and Iconsax actions, automatic
WebP conversion/upload, progress, retry and private keyboard-accessible viewer.
Agent upload authority is separate from manager-only gallery administration and
ordinary documents. Whole developments reuse the same gallery and thumbnail
refresh. No new visual language, spacing token, chart or dependency is added.
Design-system-ops governs reuse; frontend-design, Impeccable Operate and uncodixfy
preserve the incumbent surface. Design-taste's marketing workflow is outside
this CRM permission correction. Antislop keeps the owner's AFTER audit timing;
no unrelated aesthetic findings are selected or repaired. Impeccable reported
existing context/sidecar drift; repairing those is outside this change.

## Verification and publication

Local checks: real PostgreSQL/file regression36/36, expanded photo checks9/9,
including both parent kinds, concurrent slot limits, negative permissions,
actual WebP transfer/scan and additive migration preservation/refused downgrade.
`alembic check` reports no upgrade operations. Frontend lint/typecheck/build,
92 unit tests and runtime dependency audit pass. Four compiled headed Chrome
file/photo scenarios pass, including agent project/unit automatic conversion,
mobile viewer, keyboard arrows/Escape, ten slots, interrupted upload recovery,
real scanner failure/recovery and unchanged private-file denial. Captures under
ignored `frontend/output/playwright/property-photos/` are synthetic only.
Impeccable's one mechanical detector returns `[]`; product review remains human.
Desktop confirmation also checks that the shared photo panel does not create
implicit columns in the development's one-column grid; its local wrapper keeps
the header and gallery full-width. The corrected compiled agent project/unit
scenario passes1/1 with a new desktop capture. Ordinary inventory attachment
choosers direct all images to Photos, including developments.
Protected exact-candidate hosted checks and deployment verification are pending.
Test data must remain synthetic and isolated; do not add sample photos to real
client records. Keep Web Push disabled and existing private Spaces configuration.
