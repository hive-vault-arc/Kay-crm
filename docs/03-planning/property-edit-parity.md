# Property edit form parity

2026-10-23. Owner requests the detailed creation fields and placeholders/options
on « Modifier le bien », with a staged form. Conversation replies are English;
the CRM remains French. Work stays local on `codex/project-card-footer`, alongside
the preceding card refinement. No commit, push, PR, deployment or migration.
The unrelated dirty primary checkout is preserved.

## Implementation boundary

`PropertyListingWizard` now owns standalone creation and property editing. It
prefills identity, address/region/city/district/neighborhood, Maps URL, all
category-specific counts/surfaces/selects, amenities and dependent quantities,
description and holiday facts. Both modes reuse the same labels, options, hints,
controls, icons, navigation and summary. Existing long titles retain the schema's
160-character editing allowance rather than being truncated to the new-ad limit.
Numeric zero (ground floor, for example) remains zero. Unknown legacy values stay
empty and editable; new-listing required fields are not retroactively imposed.

Creation's initial priced draft is not an editable physical-property attribute.
Edit displays all existing prices and explains the separate authorized Offres
workflow; its PATCH never sends `initial_offering`. Simultaneous offers, states,
prices and conditions remain untouched. No permission is widened. Unit editing
retains development, floor and reusable-type references plus the existing lock
on changing placement when campaigns exist. Category-inapplicable values are
excluded from the submitted details by the same creation rules.

The existing expected-version, session/CSRF, idempotent retry and REST APIs remain.
The new full-detail conflict disclosure complements existing comparison, keeping
unsaved input until an explicit retry decision. Cancellation performs no write.
No file transfer, photos, private contact, external provider or production data
is used for this task; all browser fixtures are synthetic.

## Design applicability

Design-system-ops governs the existing full-width form surface, semantic spacing,
responsive step rail and44px targets. Frontend-design, uncodixfy, responsive and
React guidance preserve Riviera, shadcn/Tailwind and Iconsax. Impeccable Operate
inherits the established world (1/1/1); no reinitialization of its existing
metadata drift. Design-taste excludes this dense CRM/multistep form. No chart,
new brand, generated asset or dependency is needed. Antislop remains AFTER;
unrelated findings are not selected by this request.

## Verification

Evidence and any limitations are recorded with the final commands in the
[QA register](../QA_COMMANDS.md). Product/design acceptance remains Khalid's.

Final result:72 focused Python/PostgreSQL tests,92 frontend unit tests and8
compiled visible-Chrome cases pass; lint, TypeScript, build, documentation and
diff checks pass. Browser coverage includes responsive/keyboard/touch/native200%,
legacy-null editing, full rich-detail persistence, Maps rejection, preserved
offers and programme placement, retries, real outage, conflicts and revocation.
Desktop/mobile and corrected native-zoom captures were inspected. No public or
real CRM records were used. The owned local test services were stopped afterward.
The shared wizard remains cohesive below300 lines; edit/create differences are
limited to initialization, persistence and existing offer/requiredness rules,
keeping the actual field groups in one place instead of duplicating them.
