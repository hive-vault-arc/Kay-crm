# SP-20 F1 functional correction: named re-review

Follow-up to initial fix in .impeccable/sp20-finish-review.md.
Only website-form.tsx's existing validation-error assignment changed: 413 now
says the request is too large and directs shortening the message; draft is
preserved/unlocked. 422 keeps original field-validation guidance.
No geometry/tokens/style/other UI changed. No detector rerun or new polish hunt.

New production build pFQv5uidqUuJVIgkip1ty passed after correction.
Full lint passed before this single-line fix; targeted ESLint on final form/new
test passed, final typecheck/build passed. Final client scan4 roots/285JS,
0 configured facade secret and0 configured signing key occurrences.
Real compiled headed Chrome case:
KAY_E2E_PRODUCTION=1 npm run test:chrome -- tests/review/intake-body.chrome.spec.ts --max-failures=1
Final1/1 passed24.5s(37.8total),0 skipped. Real 3,000-character three-byte Unicode
message exceeds8,192bytes, simulator returns actual413 (not route.fulfill).
Checks accurate alert, editable preserved fields, no receipt, then shortening
and real submit202/queued followed by actual worker/processed. Unexpected errors0,
only expected413 console is narrowly excluded. Main opened/validated all3 new
original PNGs; every path REQUIRED for named re-review:
- frontend/output/playwright/sp20-body-corrected-mobile.png (390x844, SHA256 d8b569af320f7712dca80ec614ec9fa49c94b541de67a064d860973767276862)
- frontend/output/playwright/sp20-body-error-desktop.png (2880x2000, SHA256 5cd704cd1391559b592f47c0af913ef1183a569753fd64dc3f206ec33d96bcd8)
- frontend/output/playwright/sp20-body-error-mobile.png (780x1712, SHA256 8e1610d3f0e3f39dd023391742bc5a45f120ef04dbc40b6a96898b3184c7b078)

Mobile error evidence repair: first Playwright frame375x856 clipped a390px DOM.
The first CDP replacement still used375px cssLayoutViewport, excluding classic
scrollbar width. Final same-path capture uses settled innerWidth390 and document
height856:780x1712 physical pixels, complete right border and padding.
No product/UI/style changed. Main reopened all3 final frames and validated them.
Repeated native runs passed; invalid image evidence was not accepted as valid.

Original14+2 captures remain valid for unchanged states; original source build was
oocAcInU26JIyYc52pW0O. Do not relabel old screenshots as new-build captures.
Review only this named correction, preserve initial finding in history and update
your same review file with final complete five sections/disposition.

