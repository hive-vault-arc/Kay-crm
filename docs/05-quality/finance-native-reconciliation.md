# Selected Finance native-review preparation

Date: 2026-10-29. Branch: `codex/redesign`. Source preparation only; the actual
visible-Chrome case and its intended captures have **not run**.

## Source mismatch corrected

The incumbent `frontend/tests/review/finance.chrome.spec.ts` still targeted a
Finance tab, selectable commission button and separate selected-record pane,
explicit refresh/close controls and retired empty/Agent text. The selected
implementation instead uses the supporting Finance drawer, inline full-width
commission/receipt cards and dossier history. Its current command owner also
requires explicit current comparison after a definite conflict and preserves
unknown work until recovery or explicit departure. The older test could neither
reach the current workflow nor establish its intended visual evidence.

No application markup, style, token, motion, glyph, feature, business rule or
backend is changed here. This is migration of the prepared review to the actual
selected controls, not a new visual design or an AFTER audit. Existing shadcn,
Tailwind/Bklit and selected composition remain; no new design skill execution or
rendered acceptance is claimed.

The shared openFinance helper also scopes readiness to this drawer, waits for its
list loading state and accepts the heading's actual optional numeric counter.
An exact bare Commissions name could race or fail once that counter appeared,
including when a recovery test reopened an already populated drawer. The new
pattern still excludes the longer drawer title and unrelated page headings.

| Retained check | Current prepared path |
| --- | --- |
| Optional/empty finance | Current empty copy inside Commissions et encaissements; no Finance tab or table |
| Keyboard entry and invalid-field focus | Existing create trigger, typed form, invalid base and first-field focus |
| Recognition confirmation/escape/return focus | Nested confirmation returns to its actual recognition-form submit, then explicitly confirms |
| Exact amount/history and originals | One inline commission, one original receipt, three dossier revisions with exact MAD; correction yields two linked receipt cards |
| Full-width desktop/phone composition | Stable dossier-scoped commission identity, no tables, card width matches drawer body after purposeful padding |
| Touch/reason validation | Actual receipt form, required-reason description and retained invalid amount |
| Definite over-collection conflict | Disabled fields until explicit current comparison/acceptance; original amount retained |
| Interrupted receipt dispatch | Original100 draft remains disabled and offers same-operation retry; Annuler opens the existing explicit recovery-departure warning |
| Loading and denial | Re-enter the actual drawer under held/denied numbered reads; current denial leaves no private cards or forms |
| Agent denial | Four ordinary affair tabs, no Finance trigger/drawer; private list, key issuance and commission detail return403 |
| Native geometry/accessibility |320/360/390/768/1024/1440 widths,44px controls, overflow, nonempty contrast samples, keyboard/touch/focus and actual200% Chrome zoom |

The geometry routine now prefers a visible nested alertdialog, then the actual
portalled Sheet/dialog, then main. Previously it could measure the inert main
behind Finance. It reports which surface was measured and tests the expected
role for form/confirmation/card views. CSS color normalization and alpha
composition reuse the existing review approach; metadata/badge text is included.
Samples and controls must be nonempty, so an empty measurement cannot pass.
The4.5 contrast threshold is retained. These are CSS-derived observations;
images/gradients/pseudo-elements, compositing and full accessibility still need
actual rendered inspection. Padding is reported, not independently accepted.

## Capture, identity and cleanup boundary

The case disables traces, videos and automatic screenshots. Manual captures
require no password or private-credential field and use only the supervisor's
synthetic post-login actors/dossier. Errors log safe codes, never credential,
cookie/token, raw API body or private-record diagnostics. Existing isolated
fixture/supervisor and detached cleanup are retained. Zoom uses a fresh bounded
test-results profile; its resolved parent and prefix are verified before removal.
Held loading work is released during cleanup.

Fifteen intended manual frames use the new ignored output prefix
`output/playwright/redesign-finance-`: empty-desktop, invalid-desktop,
confirm-desktop, finance-desktop, finance-mobile, narrow-320, form-mobile,
excess-mobile, comparison-mobile, error-mobile, correction-desktop,
loading-desktop, zoom-200, denied-desktop and agent-mobile. None has been created
or inspected by this source-only slice. Incumbent SP-16 and canonical independent
review images are not overwritten.

## Commands and unproved acceptance

Executed from frontend: `npx eslint tests/review/finance.chrome.spec.ts tests/helpers/finance.ts
--max-warnings=0` and `npm run typecheck`, both exit0. A read-only AST/source
review finds one prepared case,15 distinct intended capture names, no retired
selection/refresh/close selectors and zero production-source changes. Repository
and documentation gates are separately recorded in the evidence.

Future required command, **not run**: `npm run test:chrome --
review/finance.chrome.spec.ts --max-failures=1` through the existing isolated
visible supervisor, followed by inspection of every resulting frame. No test
listing/import, browser/CDP/app/HTTP/database/account/service launch, private
configuration, worker/scanner/simulator/transfer access or workaround is used
here. This source edit does not authorize a runtime exception.

Build/history/frontend927/backend572 unit results remain the preceding
checkpoint's evidence for unchanged production boundaries, not fresh results.
No rerun is needed solely for this prepared test edit. Actual SQL/ledger/clock/
concurrency, native/device/focus/zoom/contrast/security/CI/AFTER/product acceptance
and migrations0036/0037 remain pending. Other legacy selectors and exact domain
reconciliation remain part of P0; P8 and the full goal stay open.
[Evidence](../03-planning/design-migration-evidence/finance-native-preparation-2026-10-29.json).
