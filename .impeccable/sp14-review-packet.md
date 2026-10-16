# SP-14 finish review input

Root: C:/Users/khali/Desktop/HVA/03 - PROJECTS/CUSTOM PROJECTS/Kayrealestate

Original request: implement docs/03-planning/sprints/14-visit-calendar-working-times.md
following every task, acceptance and exit criterion. Khalid confirmed:
"Yes, follow the sprint within the existing KAY interface."

Read your shipped role definition:
C:/Users/khali/.codex/skills/impeccable/agents/impeccable_finish_reviewer.toml.
The builder did not read it. Review, do not implement. Save your five-section
result to .impeccable/sp14-finish-review.md. Use a fresh context, not the builder's
conversation. Neither your review nor technical gates imply human approval.

## Direction and scope

Read .impeccable/sp14-direction.md and the registered surface brief
.impeccable/surfaces/frontend-src-features-schedule-visit-calendar-tsx.md.
Operate mode: incumbent French KAY calendar/agenda, booking/detail and working
policy extension, not a new visual world. Authority is DESIGN.md,
docs/04-design/design-system.md, branding/kay-ui-tokens.json,
frontend/src/app/globals.css and the existing shadcn primitives. No new theme,
token, font, kit, chart, custom CSS, shipping raster or npm dependency.
Calendar is an operational KAY composition, not a chart; Bklit is N/A.
Pre-existing PRODUCT.md/.impeccable/design.json absences are drift to report,
not repair unasked or falsely pass as complete generic persistence.

This is a precisely specified existing CRM extension. Comp, concept seed,
QUALITY BAR and new-world asset workflows are N/A, not silently omitted.
Craft floor: C:/Users/khali/.codex/skills/impeccable/reference/craft-floor.md.
No design hook. The one detector returned[] across19 changed source targets:
.impeccable/sp14-detector.json. Do not run another detector.
AFTER audit will be anti-slop/audit-014-2026-10-15.md; read its actual status.
Earlier optional aesthetic findings remain unselected. Audit-only fixes require
Khalid's selection; functional/accessibility failures remain technical defects.

Primary implementation: frontend/src/features/schedule/ (nine files),
frontend/src/app/(workspace)/visits/ and settings/working-hours/page.tsx.
Related changed sources: settings/page.tsx, contacts/ownership-contracts.ts,
ownership-impact.tsx and numbered-pages.tsx, API facade dispatch and safe errors.
Concrete rules/wire/limits: docs/04-design/visit-scheduling-local.md.

Both off-site types require configured work windows and no lunch. Office
bypasses those gates and car capacity. Only active company-car visits consume
each touched half-open hourly interval, agency-wide initial cap2. Drafts hold
nothing. Ordinary participant overlap requires a separate explanation, never
a hard-limit override. Current contact authority is server-enforced; participant
membership grants no private detail access. Busy mode transmits intervals only.
Policy preview binds the proposed version/current future visits before save;
existing visits are flagged for review, never automatically moved/cancelled.
Casablanca civil input and displayed offsets come from backend tzdata because
installed Node/shared PostgreSQL data disagree. Repeated hours require a choice;
nonexistent hours fail. Confirmation/result/cancellation are explicit; history,
origin and original actors persist. Retained errors/retry identity and current
version comparison preserve the form. No SP-15 reminders/fleet/production scope.

## Required native capture matrix

Every path below is under frontend/output/playwright/ with prefix `sp14-`.
Inspect every required file and validate its claimed state, not just its name.
Full-page images start at document top; readable state viewports supplement them.
All are native CDP Chrome pixels, not edited or generated imagery.

- empty-desktop.png: document-top1440 empty unconfigured calendar.
- settings-empty-desktop.png: document-top1440, capacity2/no invented hours.
- settings-desktop.png: document-top1440 saved Monday09-18/lunch13-14.
- settings-mobile.png: document-top390 administrator settings; all fields remain usable.
- create-desktop.png: document-top1440 real create form and two touched car hours.
- loading-desktop.png: deliberately held real availability request, disabled pending controls.
- confirm-desktop.png: explicit confirmation, initial title focus.
- hard-lunch-desktop.png: non-overridable lunch failure distinct from ordinary overlap.
- overlap-desktop.png: actual reason-required participant overlap, retained form.
- invalid-desktop.png: required cancellation reason associated with textarea.
- calendar-desktop.png: document-top1440 seven-day composition, active/cancelled facts.
- calendar-mobile.png: document-top390 chronological agenda, same scoped facts.
- detail-mobile.png: document-top390 current visit and original history.
- error-mobile.png: actual interrupted reschedule, retained draft/retry guidance.
- conflict-mobile.png: actual concurrent version409, retained draft and deliberate comparison/retry.
- narrow-320.png: actual320 record first viewport; long labels wrap, editing below fold.
- dst-mobile.png: explicit repeated-hour choice and nonexistent-hour error.
- impact-desktop.png: affected future visit preview, preserve-not-cancel statement.
- settings-denied-mobile.png: administrator-only Settings denial.
- private-denied-mobile.png: copied private visit safely unavailable to outsider.
- busy-mobile.png: colleague CRM busy intervals, no private visit details.
- zoom-200.png: actual200% record first viewport, editing form below fold.
- zoom-form-200.png: readable scrolled actual200% date/time form controls.

Canonical .impeccable/review/desktop.png and mobile.png are exact byte copies of
calendar-desktop/calendar-mobile. Native capture dimensions include browser DPR;
actual measured viewports, not PNG filenames, identify390/320/1440/200% states.
Tall settings/details intentionally scroll vertically. No horizontal page/dialog
overflow is allowed. No browser/service launch or private configuration read is
needed from you.

## Evidence and honest boundaries

Read docs/03-planning/sprints/sp-14-execution.md for final results and retained
attempts. The initial full backend348/348/94% baseline precedes one lifecycle
correction; expanded affected31/31 passes on current backend. The final clean
full rerun is a separate technical gate, not a UI reviewer task. Real races,
current-role-after-lock, strict transport/SQL/migration/retry negatives pass.
Development0016 is additive, OID/catalogue unchanged, no seed/reset or drift.

The first valid headed workflow1/1 passes44.9s test/59.4s total;20 original native
captures were opened in one main batch. Geometry: settings contrast5.814:1,
calendar6.113:1, dialog6.484:1, control targets≥44px, dialog padding24px,
six widths320–1440/actual200% have0 horizontal overflow. Real Chrome DPR2→4,
innerWidth1427→713. Unexpected page/console errors0; deliberate exact-endpoint
overlap409/network abort/private404 are recorded separately. Keyboard Enter,
Tab, Escape, trigger return/terminal heading focus and exact-agent native touch
pass. The initial hidden-checkbox geometry and wrong-first-colleague harness
failures are retained, not mislabelled as application passes. The actual37.63px
numbered page target now uses existing min-w-control. No aesthetic-only fix.

FINAL EVIDENCE ADDENDUM: final headed1/1 passes48.3s test/1.1m total,0 skipped.
All23 current captures were opened in the second/final main batch, including
administrator settings320/390/768 geometry, actual version409 draft comparison
and explicit retry, busy refresh and the readable scrolled200% form. No UI source
change was needed after the first valid batch; the one detector remains valid.
Both canonical hashes still match. AFTER014 has0 new aesthetic findings.
Build0leBHja-rs4ZKz21C7tSq,291 source fingerprints
6BCEB5FB6BA0B2096C41C463CBE0739A8480C854346D7FE3AD9F08A4400CC77E.
The first matrix stopped14 pass/1 inherited contact-history restart readiness
failure/50 unrun. The unchanged focused Chrome case reproduced the5s readiness
failure. Investigation and a clean final matrix/full backend remain separate
technical gates, not falsely accepted by your UI verdict.

Do not read .env, private notes, runtime-control files or record data. Do not
modify application/world/design files. Your only write boundary is
.impeccable/sp14-finish-review.md. Return the role's five sections and your own
disposition at the evidence's actual scope.

Post-review technical addendum: the inherited test-supervisor lifecycle was fixed
without changing UI/application source or the original readiness assertion.
The original case passes three consecutive repeats; the clean compiled matrix
passes 65/65 across all five targets. Broader compiled Chrome passes 14/14 and
final full backend passes 349/349, 94% coverage, zero skips. Final database drift,
privacy, guarded cleanup and project shutdown pass. The execution ledger records
commands, retained attempts and risks. This adds technical evidence; it does not
expand the UI reviewer's verdict or imply human product approval.
