# Selected public intake form and property reference

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual simulator/SQL/native/product review pending.
[SP-20](website-intake-local.md) remains authoritative.

## Fields and selected surface

The frozen `src/data-operations.js` supplies the public Demande web card and its
receipt/status flow. The real signed contract additionally accepts a property
reference. The selected card, branding, spacing, existing shadcn controls and
single primary submit remain; the missing optional reference is added alongside
the existing fields. The real optional-message rule prevails over the prototype's
illustrative required-message check.

| Input or action | Meaning and existing authority |
| --- | --- |
| Nom complet | Required;160 characters; server normalization/validation |
| Téléphone international | Required;48-character input, authoritative international normalization |
| E-mail | Optional;254-character input and server normalization |
| Référence du bien | Optional;100-character input; opaque user-supplied text, no inventory lookup or stock claim |
| Votre demande | Optional; reference suffix and message share the existing4000-codepoint server bound |
| Envoyer / same-send retry | Exact original bytes/submission identity/time while outcome is unknown |
| Receipt / Actualiser le suivi | Only opaque UUID and queued/processed/failed state; refresh never sends another enquiry |
| Nouvelle demande | Explicitly available only after processed state; no restart for queued/failed work |

The reference is appended by the existing backend `enquiry_message()` text
formatter. It does not resolve a property UUID, expose shared/private inventory,
create a link, reserve an offer or alter assignment. Source/signing configuration
remains server-owned. No staff role, owner, assignee or source selector is added.

## Bounds, privacy and original request ownership

Local preparation explicitly whitelists the five public input fields and public
submission metadata. Blank optional e-mail/reference use null. It checks the
reference length, combined normalized text budget and exact8192-byte UTF-8 body
cap before dispatch. The existing server parser and normalization remain
authoritative. Input values and raw serialized bytes are preserved; the text
budget does not truncate an existing message when a reference is added. The
helper explains the available message budget, and local rejection keeps the
draft editable, sends nothing and focuses the existing error feedback.

The existing forbidden text-control check now includes the reference as well as
name/message, closing a validation gap before the new field reaches processing.
Normal Unicode and ordinary multiline/tab message text retain existing behavior.
This is a narrow validation correction, not a new business workflow or authority
rule. Existing payloads without a reference remain valid; no migration or stored
receipt update is needed.

After any uncertain acknowledgement, the already-prepared body is reused without
rebuilding its fields, reference, submission identity or timestamp. Disposing the
form aborts transport and clears transient request/receipt references; stale
send/edit/refresh/restart handlers and late replies cannot restart work. The
client also rejects non-allowlisted paths and already-aborted requests before
fetch. It retains cookies-omitted/no-store/no-referrer relative POSTs, strict
receipt-only projection, foreign-receipt refresh rejection and no browser storage.
No public input or error echoes protected CRM identity or routing information.

## Verification boundary

558 connection-forbidden backend units pass/720 integration tests deselected,
including11 added property-reference/text-boundary cases. Ruff check/format2
paths and backend-cwd mypy220 sources pass.621 frontend units pass, including9
added preparation/body-cap/control/retry/disposal/transport cases; the registered
intake suite also checks the new optional label, native input bound, helper and
receipt-only state. Lint/types/build/history and static Frontend Taste checks are
recorded in the QA register, not treated as rendered acceptance.

Three cases in `frontend/tests/e2e/intake-reference.spec.ts` are prepared and
typechecked, not run. They use an isolated configured source and stopped worker
to test property-reference lost-response replay, combined text rejection and
UTF-8 byte rejection followed by corrected sends. No contact processing is
started. Traces/video/screenshots are disabled, request comparisons use safe
booleans, and isolated cleanup detaches the public actor context. Older broad
intake helpers/selectors still need their remaining reconciliation.

No actual app/browser/HTTP/DB/account/config/signing-key access or workaround,
simulator/service/worker startup, executed migration, SQL/native/device/CI/AFTER/
product acceptance or main promotion is claimed. Remaining detail/old-selector
coverage continues in the
[coverage map](../03-planning/design-migration-coverage-2026-10-28.md).
