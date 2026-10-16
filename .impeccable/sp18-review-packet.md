# SP-18 independent finish review packet

Project root: C:/Users/khali/Desktop/HVA/03 - PROJECTS/CUSTOM PROJECTS/Kayrealestate.
Original request: implement docs/03-planning/sprints/18-atomic-contact-import.md,
every task/exit criterion, necessary-only tests quickly. Confirmed answer:
“Yes, follow the sprint within the existing KAY interface.” The confirmed
workflow is M/A import within Leads: fixed contact CSV, row errors/skips,
per-row or explicit fallback agent, then deliberate atomic batch approval.

Read the shipped impeccable_finish_reviewer role definition provided in the
spawn prompt. Write only .impeccable/sp18-finish-review.md. No application edits,
browser, DB, commands that launch services, tests or other documentation writes.
Use source and the supplied safe screenshots. Product acceptance is Khalid's.

## Authority and artifact

Existing KAY Operate extension, not a redesign. Read DESIGN.md,
docs/04-design/design-system.md, .impeccable/sp18-direction.md, and the registered
.impeccable/surfaces/frontend-src-features-imports-import-panel-tsx.md.
Artifact: frontend/src/features/imports/{import-panel,batch-review,import-rows}.tsx
and Leads integration. Supporting contracts/client/facade and ordinary contact
read source labels are in those feature modules and features/contacts.
Direction: exact row eligibility before one whole-batch commit; established
ivory field/dark rail/gold selection, flat numbered rows, existing shadcn/Tailwind
geometry, French statuses, one protected confirmation. Dials1/1/1.
Craft floor: C:/Users/khali/.codex/skills/impeccable/reference/craft-floor.md.
PRODUCT.md and .impeccable/design.json are inherited missing metadata, not
permission to repair them or replace DESIGN.md. No approved comp, QUALITY BAR,
concept seed, build-state/spec/diff, native-platform reference or shipping raster:
N/A for a narrow code-led incumbent extension. No chart, new font/palette/CSS kit.

## Required screenshots, all opened and validated by main

All12 originals under frontend/output/playwright/:
sp18-empty-desktop.png, sp18-invalid-desktop.png, sp18-preview-desktop.png,
sp18-confirmation-desktop.png, sp18-preview-mobile.png, sp18-narrow-320.png,
sp18-loading-desktop.png, sp18-error-mobile.png, sp18-denied-mobile.png,
sp18-committed-desktop.png, sp18-agent-mobile.png, sp18-zoom-200.png.
Also required canonical .impeccable/review/desktop.png and mobile.png: exact
copies of preview-desktop/mobile. Full-page captures start at top; dialog,
error/denied and200% are viewport captures at their relevant visible state.
No blank/black/incorrect-state capture found. Every path is required, not optional.
The test names/data are explicitly synthetic, no credentials or actual records.
Capture dimensions/digests are appended below, not shipping-asset provenance.

Main inspected first6 originals in first batched round; final12+2 canonical in
second round. An additional executable retry test failed before new visual
inspection and found a real stale-preview defect, corrected functionally. No
third aesthetic hunt or unauthorized AFTER-only fix. Detector ran exactly once
after final source edit, all changed UI/API targets, exit0/[] in sp18-detector.json.

## Actual technical evidence, not an instruction to assume ship

Build KDcVSGWqFB2pc9tcjQcfF;410 app/migration files SHA256
0C3FADAFE00C22194998B60806B4833F6AB47EC90685CB14325EA82244E3FCF3.
Lint/typecheck/build exit0.61 focused backend cases pass110.43s,0 skipped;
stronger final16 pass42.05s, final HTTP/migration3 pass23.02s (overlapping).
Real separate-session phone race,501-row/chunk precommit rollback/postcommit
loss/retry, role/agent/phone/hash rechecks, retained immutable report covered.
Compiled browser4/4 pass1.3m before final refresh-only correction; final affected
2-case import rerun underway, result follows in execution. No full CRM rerun.
Latest headed test1/1 passes30.1s (42.5s including startup), Chrome155.0.8059.79.
Wrong file extension, held raw-transfer cancellation/same-file retry, mixed CSV,
corrected file, fallback/row assignment including explicit clear, confirmation
Enter/Escape/cancel/return focus, record-value disclosure, refresh/error/403/retry,
committed reload and actual agent denial exercised.320/360/390/768/1024/1440
geometry passes: no horizontal overflow, visible controls≥44px. Actual Chrome
zoom DPR2→4,width1427→713; measured final minimum text contrast5.814:1.
Expected exact import GET network abort and403 separated; unexpected console/
page errors0. Nonfatal Windows Proactor10054 teardown callback retained in ledger.

Functional defects corrected before this packet: uncertain approval no longer
claims “nothing created”; imported contact read permits csv_import provenance
without broadening manual creation; cleared row assignment shows empty; after
cancel/same-batch upload retry, remount review with new preview generation so
old awaiting-upload/zero-count data cannot remain visible. No known open material
issue is asserted by main; assess independently. Aesthetic-only findings require
Khalid's numbered selection before changes, unlike required functional/a11y fixes.

Return the role's full five contract sections and disposition. Do not infer
human acceptance, five-browser/full-product/load/device acceptance from evidence.

Final affected compiled import rerun completed2/2 passes59.1s,0 skipped on the
same build/fingerprint. Development migration/check and guarded test cleanup
pass; final scanner4roots/285JS/0matches, report2JSON/0detailed arrays; no running
project services/ports. These technical facts do not replace your UI disposition.

## Capture manifest

| File | Pixels | SHA256 |
|---|---|---|
| sp18-agent-mobile.png | 780×1688 | E3D498D8349C167EDC49A8288A3BE64152DCF9F50A0400C0B58D9A383DD9260D |
| sp18-committed-desktop.png | 2880×3446 | 49674170F8A3A45FD06444C3D8CA79DE0902060676123A54EB523BD6DE57FF92 |
| sp18-confirmation-desktop.png | 2880×2000 | 44D83584D65C5FD07810537825EBE63E7B80E07A2623F4DDDB46EDDB58081949 |
| sp18-denied-mobile.png | 780×1688 | A2B6BBBCDDA9D60CE97044EF46C92C876848741A91AFA30A16F581AD596F3892 |
| sp18-empty-desktop.png | 2880×2000 | 6761FCF5716BCAC74BE279FAFF8D8FE0AF9285BD77DCF7DC7D8830FCD89522B5 |
| sp18-error-mobile.png | 780×1688 | 0F9F421DB7205B0D54098773F7CEB13FFE081F7C052D1369274E90727BC6E1AF |
| sp18-invalid-desktop.png | 2880×4326 | 96D351C7DA432529C44CA12F98C97C5F35B25C0CD12BE6ED8C55391D404B26E5 |
| sp18-loading-desktop.png | 2880×2000 | 10AF34E164750ADD4CF2F666FE15505C62F4A9180473D690EAC1A948349B47CA |
| sp18-narrow-320.png | 640×5490 | BF0B52C26AA99463A1E66C7A5C04D1AF4E8DD33B5A0AA155719A631D1F4CF7E7 |
| sp18-preview-desktop.png | 2880×4198 | 8753CC47257B0F7DD6949BF814D7B326FBE2183BCD61148FD2FDD8253A9E6AAA |
| sp18-preview-mobile.png | 780×5162 | 5402E24865ECD7CC39FB5F3E05932462D0373238B86D78FF2D119CFA13A661B5 |
| sp18-zoom-200.png | 2854×1702 | BA37B8484878ACA9BA0BE531B91F01B45CAE245C3C2D230258D45A909F1EEBDF |
| desktop.png | 2880×4198 | 8753CC47257B0F7DD6949BF814D7B326FBE2183BCD61148FD2FDD8253A9E6AAA |
| mobile.png | 780×5162 | 5402E24865ECD7CC39FB5F3E05932462D0373238B86D78FF2D119CFA13A661B5 |
