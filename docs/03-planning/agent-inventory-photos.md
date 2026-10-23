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
Hosted candidate `dd10af2` passes969 backend tests and127/129 browser cases;
two broad action/branding checks correctly reject the new development gallery's
ungrouped1px hidden input. A local fieldset/legend now associates the input with
its44px chooser, matching the existing file-upload pattern without changing
the size/contrast assertions. Busy cancellation remains outside any fieldset
disable state. The agent-gallery case also invokes the shared geometry guard at
desktop/mobile widths. This failed run is not release acceptance; fresh final
checks remain mandatory.
Focused confirmation: compiled headed Chrome action-buttons route families,
both photo cases and Riviera branding all pass4/4 in3.9m, with the original
geometry/contrast/touch assertions intact. Lint/typecheck/build and repository-
only documentation validation pass again. A fresh exact-candidate hosted run is
required before production.
Test data must remain synthetic and isolated; do not add sample photos to real
client records. Keep Web Push disabled and existing private Spaces configuration.

The subsequent security gate found newly published `PYSEC-2026-4322` in the
development-only Brotli dependency. Its exact pin and hash lock now use1.2.1;
hash-checked installation, `pip check` and `pip_audit` pass. No unrelated Python
dependency was upgraded. With Khalid's explicit approval, `.nvmrc` also advances
within Node24 from24.13.1 to24.22.1, the vendor security patch. Local validation
uses a SHA256-verified portable runtime, not a replacement global installation.
Sources: [Brotli release](https://github.com/google/brotli/releases/tag/v1.2.1)
and [Node security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
Candidate3eae9b7's hosted run is superseded, not accepted; all required and manual
integration checks must pass on the final dependency-patched candidate.

Candidate04da10c passes required CI,92 frontend units and4 focused compiled
Chrome cases on Node24.22.1. Full integration attempt1 stops backend after375
passes when the existing Windows worker-kill test reports process-not-found;
the unchanged case passes5 consecutive local repeats. No production timeout or
assertion is relaxed. The independent full browser run identifies an obsolete
October2026 UTC+1 expectation: Node's updated tzdata2026e and Python's current
`Africa/Casablanca` both resolve that instant at09:00, not10:00. The display test
now checks the10:00 pre-transition and09:00 post-transition values, following
[IANA's2026c change](https://www.iana.org/time-zones/releases). This changes only
test expectations, not the application's timezone or stored timestamps. The
partially completed hosted run is superseded, not a successful release gate.

Candidateef0b62d passes required CI but the hosted backend encounters a distinct
Windows pseudo-terminal cleanup race in `test_real_hidden_tty[mismatch]`, after
the expected bootstrap result and hidden-input assertion succeed. `close(force)`
tries to signal an already-exiting process. The test now waits at most10seconds
for natural termination and asserts its exact success/error exit code before
closing; failure cleanup remains forced. No bootstrap/product code, credential
logging, deadline for receiving prompts, or database assertion changes. The broad
local backend run was interrupted at67% to validate this correction and is not a
complete pass. Fresh final hosted acceptance remains required.
Focused follow-up passes17/17 bootstrap/interruption tests, Ruff check/format,
frontend lint/typecheck and the compiled headed Chrome display-helper case1/1
on Node24.22.1. No secret-bearing terminal output is preserved.
