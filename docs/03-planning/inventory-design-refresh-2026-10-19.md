# Inventory form and record design refresh — 2026-10-19

Status: scoped local UI implementation and technical checks complete; Khalid's product/design review pending. No backend, database, production, push or PR change.

## Record details and stationary shell follow-up (owner request, 2026-10-19)

The marked property screenshot identified sparse labels and a sidebar moving with
the document. Current property/programme details now share icon-labelled tabs
and facts, and the shared attachment heading has an Iconsax marker. Existing
Riviera selection/information tones give those real groups hierarchy without
adding decorative red dots, sample data, or empty filler cards. Terrain and
commercial records no longer show an irrelevant room count. The compact paired
detail composition from the earlier pass remains; it already replaces the
screenshot's broad unused right side. A later `.sidebar { position: relative }`
rule had cancelled the shell's sticky class. The rail is sticky again, with a
stacking layer so its edge toggle stays pointer-accessible over page headers.

The final synthetic headed Chrome design journey passes 1/1; the complete shell
suite passes 7/7, including scroll isolation on Dashboard, Leads, Deals and
Projects, collapse, short-height drawer, keyboard, touch and responsive routes.
Inventory/development headed reviews pass 2/2 at 320–1440px and actual 200%
zoom. Frontend typecheck, lint, 72/72 units and production build pass; the
final Impeccable detector returns `[]`. First broad rerun retained a toggle
pointer timeout, fixed by rail stacking; another retry exposed a test-only
pre-hydration screenshot warning, fixed by waiting for the hydrated control.
See [AFTER039](../../anti-slop/audit-039-2026-10-19.md). Only local synthetic
test data was used; no schema, API, permission or production state changed.

## Creation wizard follow-up (owner request, 2026-10-19)

The owner clarified that **creation**, unlike editing, must not show all fields
at once. `/projects/new`, `/projects/properties/new` and creation of a physical
unit within a programme now use three explicit steps: identity/type, relevant
characteristics or context, then review/submit. `Précédent` retains entered
values; advancing checks only the visible step. Semantic Iconsax marks progress
and the next/back/cancel actions stay together. Compact mobile step labels avoid
crowding; desktop keeps the full labels. The prior paired live-preview design
described below remains historical evidence of the first pass, not the current
creation layout. Direct edit forms were intentionally left unchanged.

The physical category controls only fields the database/API actually persist:
reference, category, optional commercial name/location/surface and residential
room count. Terrain/local commercial do not ask for rooms, floor or bathrooms.
Programme creation is a separate form with reference, name, category, optional
location/briefing and optional scoped promoter; apartment **units** within a
programme additionally require existing block, floor and reusable type. The
Mubawab pasted field list helped identify the domain differences, but prices,
photos, detailed amenities, contact details and campaign terms remain their
existing later workflows; unsupported fields were not fabricated or silently
dropped. The summary never copies a private contact name.

The two owner-supplied CRM UX Markdown reports informed progressive disclosure,
short steps and preserving draft state. They were treated as design references,
not as authority over KAY's schema, permissions or French copy. Tests and visual
evidence for this follow-up are recorded below after the final run.

Design read: an operational French CRM form for the KAY team in its approved
Riviera editorial language, ENERGY 1 / RHYTHM 2 / MOTION 1. Ivory and charcoal
keep long-form reading calm; honey marks only the current step and decisive
creation action. Fraunces distinguishes page and section hierarchy, while
Manrope keeps controls legible. The step rail gives place and progress without
adding decoration; property, location and verification icons convey each task.
One visible field group reduces cognitive load. Purposeful gaps separate steps,
fields and actions; the confirmation summary uses two columns only when it has
real entered facts. No decorative motion was added to a high-frequency form.

An early combined Chrome run exposed an intermittent premature POST: during the
second `Suivant` click, React could reconcile that same button into the final
submit control before the browser's default click action. Both wizards now
prevent the Next click default. A review assertion requires an idle, enabled
Create control before any final submission. Earlier failing runs are not counted
as a passing aggregate gate.

Final-source verification: `frontend/` typecheck, lint (0 icon/button guard
violations), 72/72 unit tests and production build pass. Headed real-stack Chrome
`npm.cmd run test:chrome -- tests/e2e/inventory.spec.ts tests/e2e/developments.spec.ts tests/review/inventory-design.chrome.spec.ts --workers=1 --max-failures=1`
passes 14/14 in 5.4 minutes on the guarded isolated database. The review adds
a separate synthetic keyboard/promoter disclosure-selection-dissociation/cancel
case after that aggregate; the complete dedicated review then passes 3/3 in
headed Chrome. The added case does not alter source UI.
`backend/.venv/Scripts/python.exe -m pytest tests/test_inventory.py
tests/test_developments.py -q --tb=short --maxfail=2` passes 30/30. Desktop
1440px and mobile 360/320px post-login synthetic captures were opened; no
horizontal overflow, colliding steps, premature save, or private contact name
in the final summary. Final scoped layout detector returns `[]`. No production
data, migrations or remote publication were used.

## Scope and reference

Routes: `/projects/new`, `/projects/properties/new`, `/projects/{id}`, `/projects/properties/{id}` and their edit forms. The user-supplied screenshots identify a narrow standalone-property form, sparse record overview and oversized empty offer sections. The two supplied CRM UX Markdown reports are design references, not new business rules. Current Riviera/Iconsax, the design system and the later owner-supplied Projects reference govern this work; the former nine-image reference is retired under D41. The later D39 `/projects` directory remains unchanged.

Design read: primary path is entering physical facts, checking the live draft, then saving. Record reading order is identity → tabs → facts/current offers → protected files/lifecycle. At `xl`, forms pair a wider work card with a narrower draft summary; details pair inventory facts and files, and offer kinds sit side by side. Narrow screens preserve one DOM/focus column. The preview repeats only shared form fields and never copies a protected contact name. Empty campaigns remain explicit, not invented. The approved ivory/honey/charcoal palette and Fraunces/Manrope/DM Sans roles remain unchanged.

Spatial sketch: desktop `sidebar | [fields 1.7fr][draft 1fr]` and `sidebar | identity + four facts / tabs / [record facts][files]`; mobile `header / fields / draft` and `identity / tabs / facts / files`. Existing named tokens supply `#FAF8F4` canvas, `#FFFDF8` surface, `#272727` ink, `#D8AA45` creation, and `#121512` navigation. Fraunces remains for page/section headings, Manrope for forms and actions, DM Sans for metadata. The rejected generic alternative was to fill the old blank half-screen with decorative cards or fake metrics; this operational UI instead mirrors only values the user entered and keeps actions adjacent to their real records.

## Implemented

- Removed the form-only `max-w-reading` cap for property and programme create/edit; grouped form actions and added a live, semantic draft preview. Existing labels, validation, data contracts and submission flow remain.
- Property detail now gives reference/marketing name, category and location a compact identity header with working edit action; overview uses two purposeful columns for facts/current offers and protected attachments. Programme detail keeps the same header/tab family, gives its four real summary facts a full-width row and pairs facts with attachments.
- Sale/rental cards are compact and paired on wide screens. Their existing availability, permission, confirmation and outcome flows are unchanged. Mobile stacks without horizontal page overflow.

## Actual verification

`frontend/`: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test:unit` (72/72) and final `npm.cmd run build` exit 0. Layout detector exits 0 with `[]`. The isolated real-stack headed Chrome programme journey passes 1/1. An earlier combined attempt passes 6 then fails an old heading assertion after the redesign; restoring the marketing name as a semantic heading makes that exact focused case pass 1/1. The earlier programme test also found that agents must retain shared-fact editing; the exact case passes after restoring the visible link. A clean final combined run of `tests/e2e/inventory.spec.ts tests/e2e/developments.spec.ts` passes 12/12 in 5.1 minutes. Two existing headed inventory/development reviews pass 2/2, including 320–1440 widths, touch, keyboard, loading/error and actual 200% zoom. The dedicated [design browser case](../../frontend/tests/review/inventory-design.chrome.spec.ts) passes 1/1 on final source: both desktop form columns, live preview, create → detail → empty offers, mobile detail/tabs/forms and no page overflow. Its final synthetic post-login captures are ignored under `frontend/output/playwright/inventory-design/`; desktop and mobile frames were opened and compared with the user images. No browser error or hydration warning remained in the final run. One preliminary screenshot taken before form hydration produced a caret-style hydration warning; the test now waits for the enabled hydrated submit control before capture.

The earlier failed attempts remain in the record; the clean 12-case run is the final-source result. This is scoped UI evidence, not full-product certification or human visual acceptance. No raw client data or credentials appear in the captures. See [AFTER034](../../anti-slop/audit-034-2026-10-19.md) and [security check](../SECURITY_CHECK.md).

Skills: `frontend-design` established the restrained two-column task path; `impeccable` provided operate/layout and final mechanical review; `uncodixfy` kept the KAY-specific hierarchy instead of generic card decoration. Mandatory `design-system-ops`, responsive standards and the antislop core were applied. `design-taste-frontend` was read and excluded because these are dense CRM forms/records, not a marketing page. shadcn controls, Tailwind layout and semantic Iconsax were reused; Bklit is not relevant because no chart changed.
