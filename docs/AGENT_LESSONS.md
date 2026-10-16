# KAY agent lessons

## Managed CA probes and HTTP error resources (2026-10-16)

A script executed by filename has its own directory on sys.path, not necessarily
the subprocess working directory. A managed probe stored under `.github/scripts`
must explicitly resolve the fixed repository backend root before importing app;
keep the pinned runtime guard. HTTPError responses also own resources: close
expected503 responses with their context manager. An exit0 can still emit a
ResourceWarning during deallocation, so inspect outer-probe diagnostics as well
as child-server output and fix the resource leak rather than filtering warnings.
Local emulation of a CA path is not proof of that file in live API/worker
containers. Obtain separate public-only console readbacks without printing env
or connecting to the database.

## Icons in Radix Button links and geometry fallbacks (2026-10-16)

Slottable must be a direct child of Slot when adding a leading icon. Wrapping
the pair in a Fragment clones that Fragment and drops Link styling/attributes.
Test styled anchor output and actual navigation, not just icon path counts;
preserve the original single-child path for buttons without a new action.

Default max-width containment belongs below caller utility styles. A base
`max-w-full` utility can out-rank a custom `max-w-entry` if the class merger
does not recognize that semantic token, unexpectedly widening global search.
Use a low-priority base-layer fallback and assert the existing512px search cap.
Icon danger foreground and destructive button background are separate tokens;
tests must not assume they share the same RGB value. Iconsax's flat manifest
also has duplicate names; select and hash the exact intended category asset.

## Scoped record facts and route announcements (2026-10-16)

Opt-in two-column facts must bypass the legacy `record-stack` single-column
definition-list selector; do not globally restyle unrelated records. Keep link
hit regions44px while top-aligning their text with read-only labels.
Next.js adds a route-announcer `role=alert` outside main. Scope record error
assertions to main so a hidden empty announcer cannot produce a strict-selector
failure. Wait for nested assignment fields before capturing settled admin UI.

## Chart totals and modern CSS contrast (2026-10-16)

Horizontal stacked bars must measure scale(offset+value)-scale(offset), not
scale(value)-scale(offset). Check unequal and zero segments plus contiguous
positions against actual authorized API totals. A decorative funnel silhouette
does not turn snapshot stage counts into a conversion cohort.

Browser color diagnostics must normalize CSS Color4/color-mix through an sRGB
canvas and composite transparency over ancestors before computing luminance.
Parsing the first three numbers of an OKLab or color(srgb) string as0–255 RGB
can report a false contrast failure. Keep the4.5:1 threshold and record actual
rendered colors rather than weakening accessibility checks.

## Retiring development diagnostics without weakening health checks (2026-10-16)

Do not make a shared sign-in helper depend on a development status label. When
removing that widget, wait for the actual authorized dashboard content instead.
Keep readiness status/body/cache/request-ID and stop/restart assertions through
the real HTTPS endpoint. Exercise user-visible failure/retry on the real report
surface, not a hidden or test-only diagnostic widget. No health/API guard needs
to be removed with its presentation.

## Native Chrome zoom captures (2026-10-16)

At actual browser zoom, a Playwright full-page PNG can be clipped or incorrectly
scaled even when DOM viewport/overflow assertions pass. Assert the native zoom
ratio first, settle rendering and use a headed CDP viewport capture with
`fromSurface:false`. Open the final PNG; a passing geometry test alone does not
validate its screenshot. The local login refinement records the corrected rerun.

## Brand assets: make simulator checks independent of laptop state

- A clean CI runner has no local website signing/source configuration. A test
  that starts the simulator must first configure its own synthetic source using
  the existing isolated fixture, wait for real readiness and clean it afterward.
  Do not rely on a previous intake test or a persisted ignored signing file.
- Shared favicon metadata also reaches the separate simulator. Keep advertised
  icon paths within its existing SVG/static allowlist rather than broadening the
  backend proxy. Verify each advertised icon through the actual separate origin.
  See [logo execution and prior failed checks](../branding/kay-logos.md).

## Shell account location: test readiness independently of desktop placement

- Moving logout into a mobile drawer makes the old global visible-logout
  hydration wait invalid while the drawer is closed. Wait for the actual enabled
  header notification control on workspace pages, retaining standalone logout
  readiness on restricted password pages. Verify mobile logout separately by
  opening the drawer, tapping the real button and checking session revocation.
- Preserve authentication/race tests rather than changing their security
  expectations; change only the navigation needed to reach a moved control.

## GitHub CI: prove clean-runner state instead of copying laptop assumptions

- An open ClamD port/PONG did not prove byte scanning. Use the official native
  Windows service lifecycle, explicit config/certificate/temp directories, and
  real clean/rejected readiness before the suite. Keep failed native scan states
  as failures; never substitute a fake clean verdict or disable authorization.
- A clean clone intentionally lacks the private credential note and installed
  user skills. Repository-only documentation checks skip exactly those approved
  external/private targets, not arbitrary missing project links or fake notes.
- Recovery fixture OIDs are stable on one laptop, not a fresh CI cluster. Retain
  the fixed workstation guard; capture/sign fresh CI identities before migrations
  and reject altered, aliased, missing or foreign-workspace proofs before DDL.
- A spawned worker is not a ready worker. Test supervision observes original
  real maintenance admission and awaits its signal; it does not grant admission,
  change the worker loop or replace the business-ready assertion with a sleep.
- Workflow YAML alone does not protect main. Require the actual successful
  aggregate on the promoted SHA, apply server-side protection including admins
  and verify its read-back. Publication is not deployment/product approval.

## Iconsax: verify the delivery format and allow genuinely icon-free screens

- The official Iconsax package is a browser custom element, not assumed React
  named exports; its MIT metadata does not license all SVGs MIT. Verify the
  published archive, actual Free asset identifiers and current asset terms.
  KAY uses selected static paths with provenance/notices, avoiding HTMLElement
  evaluation and JSON asset delivery during SSR.
- A new minimum-icon assertion rejected the restricted password-change screen,
  which intentionally has no icons. Keep the page icon-free; explicitly allow
  zero there, retain positive checks elsewhere and rerun the affected case in
  a fresh invocation. Do not add decorative UI to satisfy a test.

## V3: restart the runner after an assertion correction

- Mistake: a Lead journey created an organisation, but its newly specific title
  assertion named the helper's different contact. Fixing that test while the
  multi-project invocation ran did not replace the suite Playwright had already
  discovered; the next browser repeated the cached assertion.
- Correction: assert the actual created identity and run a fresh affected
  invocation. Preserve the failed result; retain unrelated valid passes only
  while application source stays unchanged. Do not repeatedly rerun a cached
  failing suite or replace an identity assertion with a generic heading check.
- Promote to AGENTS.md: no; this is a concrete verification lifecycle lesson.

## V3: validate real chart geometry, not only the rendered picture

- In the installed Bklit horizontal stacked Bar implementation, a zero-valued
  series after a positive stack offset can produce a negative SVG width. For
  one-color-per-category compositions, omit unrelated series with null rather
  than adding zero series at every category. Assert a known positive bar and
  zero browser console/SVG errors against real scoped data; zero-only fixtures
  do not expose this case.
- Source-preserving UI changes still need current narrow-screen checks. A flex
  search trigger needs its own mobile row, and a numeric link needs a minimum
  target width even when its displayed value is a single zero.
- For UI-only work, capture backend source hashes and compare them after the
  implementation. Inventory all contextual surfaces before treating a shared
  theme change as complete route coverage.
- Freeze frontend source/public assets as well as the compiled build during a
  recovery matrix: the restore compatibility fingerprint includes both. Source
  edits during preparation can invalidate the point and contaminate later
  synthetic fixtures even while Next is serving an unchanged build.
- A long record-name heading needs `min-w-0` on its flex/grid ancestors and
  intrinsic-size-safe wrapping. Closed native disclosure content may retain
  measurable layout boxes in Chrome; explicitly hide collapsed toolbar content
  instead of treating hidden fields as visible touch targets or weakening tests.

## SP-22: final acceptance must expose, not conceal, boundary costs

- Measure the normal application at its declared process/pool configuration.
  Indexed SQL can still queue behind a CPU-bound single API process; verify
  bounded process tuning through the same application factory, not an auth-
  bypassing benchmark app or relaxed latency/SQL limits. Record failed runs.
- Browser hydration is not just a wait-time issue. Assert entered fields survive
  before submit; reuse the existing hydration gate and functional field updates.
  Measure clickable checkbox/radio labels, not only their smaller visual glyphs.
- A source edit changes recovery compatibility. Refresh one final-source restore
  point after the last shipping edit; do not call an older fingerprint current.

- Populated multi-revision upgrades can queue deferred FK events before a later
  ALTER TABLE. Flush constraints at the migration boundary; exercise a populated
  old revision through head, not only fresh empty databases.
- Compare unchanged business columns across schema versions, while separately
  asserting new nullable/defaulted fields. Whole-row JSON is not comparable when
  the additive schema deliberately differs.
- Full-volume fixture loading needs fresh planner statistics and bounded deferred
  validation batches. Keep constraints on and transaction rollback intact; never
  reduce the required volume or count rolled-back insertion statistics as data.
- A Lead-creation fixture must use an agent or explicitly select an active primary
  agent as manager/admin. A wait timeout does not authorize weakening assignment.
- Load samples are selected when a request starts, not when it finishes. Drain
  late requests and reconcile started/completed/sample counts so a slow tail or
  cancellation cannot silently improve p95. Never label emulation as a device.

## SP-21: restore boundaries and trustworthy verification

- Let a custom pg_dump archive create its own public schema; pre-creating it
  causes a genuine pg_restore conflict. Resolve the exact isolated target again
  before DROP SCHEMA IF EXISTS, and allow safe retry after an interrupted restore.
- Business-history guards must still reject generic fixture cleanup on recovery.
  Use an exact live cluster/OID/synthetic-only recovery cleanup, never weaken
  production history immutability merely to make teardown pass.
- Keep private controller branches and their allowlist synchronized. Cleanup
  must preserve the original failure, not replace it with a second exception.
- PowerShell can finish successfully after npm fails. Explicitly capture and
  exit with the actual native command code; read stdout before claiming a pass.
- Browser navigation must select the real inventory tab before expecting its
  rows. Correct the test to observed KAY behavior rather than changing product UI.

## SP-20: claim time follows the lock; capture validity follows opened pixels

- A worker clock captured before waiting for the agency lock can predate newly
  available jobs. Capture claim time after the lock and cover real concurrent
  connections; do not hide the race with sleeps or looser assertions.
- Chrome CDP layoutViewport/contentSize, cssLayoutViewport and screenshot clips
  use different physical/CSS/DIP units at native zoom. A passing no-overflow
  assertion does not validate a screenshot. Convert with the baseline device
  scale, settle resize/layout and open every frame. Repair only the named invalid
  evidence; do not relabel an old-build capture as a new build.
- A character limit does not imply a UTF-8 byte limit. Distinguish HTTP413 size
  recovery from422 field validation and retain editable draft. Test real long
  Unicode input, correction and successful submit.
- Keep fixture credentials consistent with existing SQL constraints and use
  bounded pytest traceback output; SQL failure details can include synthetic
  credential hashes. Never copy those values into evidence.
- No AGENTS.md promotion: existing race/privacy/visual gates own these rules.

## SP-19: a retry key has a lifetime, and every flush needs a valid job state

- Mistake: clearing a running export job's lease before its authorization read
  caused ORM autoflush to violate the lease constraint. A newly dispatched
  job also inherited server time slightly after the claim's captured clock.
- Correction: set dispatch availability explicitly to the claim clock and
  transition state together with lease removal before any query can flush.
  Real PostgreSQL worker/fencing/CLI tests cover the boundary.
- Prevention: a valid final transaction is not enough if an intermediate ORM
  query triggers an invalid flush. Preserve the original mutation key across
  uncertain responses; reset it only after confirmed success so a subsequent
  deliberate identical-filter export can create a fresh snapshot.
- Promote to AGENTS.md: no; the existing invariant/retry test gate already owns it.

Status: active log; scoped repeatable corrections through SP-18 recorded
Date: 2026-10-15  
Confirmed context: the frontend foundation has executable browser checks.
Technical proposal: record only repeatable project mistakes and their prevention checks.  
References: [agent instructions](../AGENTS.md), [harness](HARNESS.md), KV `Agentic Coding/Templates/Mistake Lesson Log Template.md`.

## 2026-10-15: import provenance is readable, not a manual source choice (SP-18)

An interrupted upload may already mount its durable awaiting-upload batch.
Completing a retry with the same batch ID must invalidate/remount the preview,
not rely on changing an unchanged route/key. The headed cancellation/retry
case exposed stale counts; preview-generation remount fixes it. Preserve the
same batch/retry identity and assert the actual updated counts after recovery.

- Mistake: contact detail shared the manual enquiry-source enum, so a real
  csv_import contact could show the page heading but fail its record projection.
- Correction: add the import variant only to contact reads/French labels; keep
  manual creation and enquiry source choices unchanged. Assert the actual
  imported name/source and exercise ordinary contact edits, not only the heading.
- Prevention: when a new entry path preserves provenance, review every consuming
  read schema separately from writable schemas. Generic shell text is not proof
  that the domain record loaded.
- Promote to AGENTS.md: no; existing strict contract and real-state gates cover it.

## 2026-10-15: numeric KPI links still need full touch targets (SP-17)

- Mistake: a shadcn link-variant button containing a single digit measured about
  39.8px wide despite its44px height. Data parity tests could not detect that.
- Correction: use the existing min-w-control role for numeric drill-down links;
  preserve the44px geometry assertion and rerun compiled/headed Chrome.
- Prevention: measure short/zero numeric controls, not just long action labels.
  This is a functional accessibility fix, not an AFTER-only aesthetic change.
- Promote to AGENTS.md: no; the existing44px requirement already covers it.

## 2026-10-14–15: populated migrations and Windows private IPC (SP-06)

- Empty-schema migration success did not prove a populated backfill. PostgreSQL
  refused ALTER NOT NULL while an existing deferred trigger event was pending.
  Check constraints immediately during the backfill, then restore deferral;
  exercise real prior-version rows, original actor/time/origin and retry JSON.
- Raw JSON `:null` inside Alembic text was parsed as a bind parameter. Use typed
  jsonb_build_object expressions instead of SQL text with unescaped bind syntax.
  Failed DDL transactions rolled back; never stamp or reset development to hide it.
- A historical disabled-assignee fixture must commit the original valid enquiry
  before disabling the account in a later transaction. Combining those steps
  correctly fails the original deferred scope constraint at fixture commit;
  it does not exercise the populated upgrade. Keep both active/disabled variants.
- Node writes UTF-8 to the private fixture pipe; Windows Python text stdin was
  not necessarily UTF-8. Decode bounded stdin bytes explicitly. French synthetic
  name assertions caught the mismatch; a clean browser rerun passed4/4.
- Prevention: retain the populated upgrade/downgrade-refusal regression and exact
  non-ASCII actor checks. No credential values or real records enter diagnostics.
- Promote to AGENTS.md: no; existing versioned migration/privacy rules apply.

## 2026-10-14–15: pending reuse and unbroken labels (SP-06 cumulative review)

- Accessible duplicate reuse fetched the existing contact asynchronously but
  allowed submit before it finished. Give reuse its own pending state, disable
  submit and restore focus after the selected identity renders. Hold a real
  GET response in the regression, proving no extra enquiry before release.
- A spaced long contact name did not prove an unbroken staff label fits mobile.
  Test a valid135-character unbroken collaborator name at320/360px; the removal
  button needs a container width bound plus anywhere wrapping, preserving44px
  touch height. The affected workflow passes all five browser targets.
- Promote to AGENTS.md: no; existing recoverable-state/responsive gates apply.

## 2026-10-14: one fixture writer per isolated database (SP-05)

- Mistake: a browser supervisor started while database-writing pytest still ran;
  synthetic cleanup changed a fixture count (2 instead of 1). The exact owned
  browser tree was stopped and both overlapped results were discarded.
- Correction: both runners acquire the same session-level PostgreSQL advisory
  lease before any cleanup/DDL. The supervisor keeps it across API outages and
  stops on lease loss; a second writer refuses without touching fixtures.
- Prevention: run suites serially even with the guard. A real concurrent probe
  refused startup and the clean full backend rerun passed 100/100.
- Promote to AGENTS.md: no new rule; existing serial/isolation rule now enforced.

## 2026-10-14: shared metadata in standalone entry points (SP-05)

- Mistake: adding typed contact/enquiry audit foreign keys while bootstrap loaded
  only identity models left the target table unresolved in standalone CLI tests.
- Correction: one shared ORM registry is loaded by Database initialization for
  CLI and HTTP. The real hidden-TTY suite then passed 14/14; full suite passed.
- Prevention: exercise existing standalone commands after cross-module FKs, not
  only the HTTP application's imports. No create_all or schema stamping workaround.
- Promote to AGENTS.md: no; regression testing already required.

## 2026-10-14: stable form IDs and the actual scrolling element (SP-05)

- Mistake: React Hook Form field-array random keys were used as DOM label IDs,
  causing server/client hydration differences. A focusable table wrapper also
  surrounded a different overflow element, so focus alone did not prove scrolling.
- Correction: use React useId plus index for HTML labels, retain field-array IDs
  only as React keys. Put the accessible region/tab stop on the actual scroller
  and assert ArrowRight changes scrollLeft. Keep shared form-error association
  when adding international-phone help; long picker actions must wrap.
- Prevention: verify actual hydration, error description IDs, keyboard movement
  and long French text, not just source intent or absence of page overflow.
- Promote to AGENTS.md: no; covered by the existing UI accessibility gate.

When a reviewer or test catches a repeatable mistake, append an entry in this form:

```text
Date:
Area and requirement ID:
Mistake or failed assumption:
Root cause:
Correct behavior and fix:
Evidence (test, command, or review):
Prevention check:
Promote to AGENTS.md? Why or why not:
```

Keep credentials, client data, and raw logs out of entries. A one-off task detail belongs in its sprint handoff. Promote a lesson into `AGENTS.md` only when it is stable, high-risk, or has recurred.

## 2026-10-14: responsive navigation hydration and focus (SP-01 / C13)

- Mistake: a visible server-rendered event control could receive input before hydration;
  sheet-close focus could run before the new route heading or after a framework focus update.
- Root cause: DOM visibility does not prove an event handler is ready; development
  and production scheduling differ.
- Correction: keep event-only controls disabled until hydrated. Keyboard tests wait
  for enabled state before focusing. Coordinate destination focus with the actual
  heading's route marker and removal of the modal portal, then focus in the next frame.
- Evidence: the shell and foundation Playwright cases caught both problems; SP-01
  records rerun results for dev and production servers.
- Prevention: test early keyboard/touch input, Escape focus return and route-selection
  focus on both the development server and local production build.
- Promote to AGENTS.md: no, the existing browser/production evidence gates cover this.

## 2026-10-14: live-region hydration and modal hiding (SP-02 / C13)

- Mistake: adding an SSR live region inside a separately hydrated status island
  allowed Radix's modal accessibility hider to alter its descendants before hydration.
- Evidence: WebKit's early-sheet interaction produced a React attribute mismatch.
- Correction: activate the status live region after that island hydrates, leaving
  its initial loading copy/disabled action truthful. Keep modal background hiding.
- Prevention: capture console/page errors in every shell test and exercise early
  navigation in multiple engines. The focused WebKit rerun passed 12/12; full
  matrix results belong to SP-02 evidence, not this lesson.
- Scope of diagnostic filtering: Firefox's exact forced-layout warning names the
  injected `debugger eval code`, not application code. Exclude only that diagnostic;
  all application warnings/errors still fail the shell checks.
- Promote to AGENTS.md: no; existing hydration/browser evidence rules cover it.

## 2026-10-14: version-matched HTTPX test transport (SP-02 / C14)

- Mistake: assuming the current Starlette TestClient retained its old HTTPX adapter.
  Installed Starlette 1.8 deprecates it in favor of another client package, and the
  strict warning gate correctly stopped collection.
- Correction: use the already-approved HTTPX ASGITransport/AsyncClient directly
  and explicitly enter/exit the real application lifespan; no warning suppression
  or extra HTTP client library. Network HTTPS smoke remains a separate real test.
- Prevention: inspect installed framework adapters and test lifespan teardown,
  rather than assuming an in-process client starts/stops resources automatically.
- Evidence: 14 pytest cases passed with real PostgreSQL and 97% runtime coverage.
- Promote to AGENTS.md: no; version-matched references are already required.

## 2026-10-14: authentication diagnostics must not snapshot input (SP-03)

- Mistake: disabling Playwright traces and screenshots did not disable its AI
  failure snapshot or matcher `errorContext`. A failed sign-in assertion captured
  an ephemeral synthetic password in a generated diagnostic. That isolated actor
  was removed; no real credential was used. Do not repeat the value in evidence.
- Correction: set `PLAYWRIGHT_NO_COPY_PROMPT=1`, strip matcher error contexts
  recursively in the automatic privacy fixture, clear password inputs at teardown,
  and use primitive URL polling around credential submission. Normal clean-output
  reruns replace failed generated reports; never preserve credential captures.
- Prevention: no traces, videos, automatic screenshots, cookie storage-state files,
  raw response assertions or input-value snapshots for auth. Explicit screenshots
  show empty fields or post-login synthetic UI only. Failed `fill` operations get
  a fixed safe error, not an input-bearing call log.
- HTML reports also serialize API step titles, including fill values, without a
  trace. The first reporter removes detailed steps before HTML serialization;
  test names, statuses, durations, locations and safe annotations remain. Verify
  this reporter in addition to worker-side snapshot suppression.
- Related correction: wait for hydrated/enabled form controls before typing;
  otherwise React initialization can replace text entered during early hydration.
- Promote to AGENTS.md: yes, this is a demonstrated high-risk credential boundary.

## 2026-10-14: real terminal input and expiry boundaries (SP-03)

- Windows ConPTY keyboard input uses Return (`\r`), not a piped-text CRLF pair.
  The extra LF can be consumed as confirmation by getpass. Tests use actual TTY
  prompts and assert no echo; the CLI refuses non-TTY/fallback echo.
- For synthetic expired sessions, use one captured clock or leave margin inside
  the seven-day database constraint. Two separate `now()` calls exactly seven
  days apart can differ by microseconds and correctly fail the constraint.
- Promote to AGENTS.md: no; focused test/harness guidance.

## 2026-10-14: reset interruption must reach the protected transaction (SP-04)

- Mistake: a before-commit interruption probe inspected pending ORM audit objects
  after an explicit command query had already autoflushed them. It did not fire,
  so the test correctly failed rather than proving reset rollback.
- Correction: raise after the real reset audit flush, within the same database
  transaction. Do not interrupt the earlier independent rate-limit commit instead.
- Prevention: assert the interruption actually raises, then verify the previous
  credential, account version and session still work and no reset effect survived.
- Browser harness correction: wait for password-field cleanup to finish after
  denied login, and explicitly clear the previous actor's cookie when switching
  identities. Do not treat an already-authenticated login redirect as a form defect.
- Promote to AGENTS.md: no; existing real-boundary and secret-safe gates cover it.

## 2026-10-14: interrupted browser runs leave synthetic fixtures (SP-04)

- Mistake: assuming a manually interrupted browser run completed every fixture
  teardown. The next visual list contained disposable actors from the old run,
  which would also change a real pagination test's expected total.
- Correction: the test-only supervisor performs guarded synthetic cleanup before
  starting its API. The existing helper resolves the isolated database identity
  and refuses any non-synthetic account before deleting fixtures. Development is
  never selected or reset; pytest and browser fixtures still must run serially.
- Prevention: verify the pre-run clean baseline and final fixture cleanup, not
  only the test-process port state. Never broaden cleanup to make unknown data fit.
- Promote to AGENTS.md: no; existing isolation rules remain authoritative.

## 2026-10-14: Next 16 client artifacts include nested dev/static (SP-04)

- Mistake: the earlier private chunk scan checked top-level static roots but not
  Next 16's separate dev/static tree. It verified the build, not all dev bundles.
- Correction: scan .next/static, .next/dev/static, .next-e2e/static and
  .next-e2e/dev/static privately. Read the configured secret without printing it;
  emit only a count/result. Correct the historical evidence's coverage wording.
- Prevention: discover actual output paths for the installed framework instead
  of assuming development and build artifacts share a root.
- Promote to AGENTS.md: no; version-matched artifact inspection is already required.

## 2026-10-15: pending aggregate saves and stale success notices (SP-07)

- Mistake: leaving a previous success notice visible during a new owner save
  let a fast test advance before that save completed. The eventual aggregate
  refresh removed the next campaign form. Source edits/live refresh were an
  initial suspicion, disproved by a frozen-source rerun.
- Correction: clear stale success at command start and disable aggregate record
  controls while any mutation is pending. Observe the new completion, not a
  previous notification. Hold a real committed response to test the pending
  boundary and subsequent navigation; do not mock business success.
- Prevention: freeze application source during browser verification. Bound
  navigation/action waits so a detached control yields a useful safe location,
  not only a whole-test timeout. On synthetic actor switches clear that disposable
  context's cookies before sign-in, as the SP-04 lesson already requires.
- Promote to AGENTS.md: no; existing functional-state and evidence gates apply.

## 2026-10-15: PostgreSQL numeric requires an explicit finite guard (SP-07)

- Mistake: positive-only numeric checks reject ordinary zero/negative values but
  PostgreSQL numeric NaN compares greater than ordinary numbers. API decimal-string
  validation alone does not prove the database constraint.
- Correction: confirm the behavior with a read-only real PostgreSQL probe; add a
  follow-on migration excluding NaN in price/area/history, retaining the applied
  migration. Prove invalid-existing-data upgrade rollback and valid populated-data
  preservation, plus direct SQL rejection after upgrade. Repair only the exact
  isolated synthetic probe; never silently repair real records.
- Prevention: test non-finite values at both transport and database boundaries for
  every numeric financial/measurement field. Explicit precision already excludes
  infinity, but not NaN.
- Promote to AGENTS.md: no; existing database-boundary/security review rules apply.

## 2026-10-15: SSR filter inputs must wait for hydration (SP-07)

- Mistake: the new inventory filters were enabled in server-rendered HTML before
  React attached their controlled-input and submit handlers. Fast WebKit navigation
  exposed lost input; the same workflow had passed on the other four browsers.
- Correction: reuse the existing `useHydrated` native-fieldset guard from LeadList.
  Assert both the retained literal punctuation and the actual filtered API result,
  not a possibly stale empty count. Rerun WebKit and affected other-browser cases.
- Prevention: audit readiness when adding SSR interactive forms; do not add sleeps
  to tests to hide an input-loss bug. Preserve native keyboard behavior and layout.
- Promote to AGENTS.md: no; existing reuse and functional-state gates apply.

## 2026-10-15: intentional logout outranks late read expiry (SP-07)

- Mistake: an inventory read still in flight when logout revoked the session
  could return401 and fire the global expiry redirect before logout acknowledged.
  An unchanged isolated test passed; dismissing the failure as timing would have
  hidden the actual response-order race.
- Correction: hold real inventory and committed-logout responses to reproduce
  the wrong return-to navigation. Suppress expiry navigation during intentional
  logout; clear that intent on failure so normal expiry handling resumes. The
  backend still denies every revoked session immediately.
- Prevention: test both response orders when global unauthorized handlers and
  explicit session transitions share the page. Do not merely extend timeouts.
- Promote to AGENTS.md: no; existing race/security and regression gates apply.

## 2026-10-15: detach actor pages before changing test cookies (SP-07)

- Mistake: clearing a synthetic actor's cookies while their page still had live
  reads/SessionMonitor let a legitimate401 redirect abort the next login navigation.
  Cookie clearing alone is not a complete fixture actor switch.
- Correction: reuse `clearActorContext` to navigate that disposable context's pages
  to about:blank before clearing cookies, then sign in the next synthetic actor.
  Both affected manager/administrator assignment cases pass on real Chrome.
- Prevention: do not suppress the product's normal expiry handling or add sleeps
  to accommodate a test-only credential mutation. Detach old observers first.
- Promote to AGENTS.md: no; existing fixture isolation and repeatable-test rules apply.

## 2026-10-15: migration fixtures must match their revision (SP-08)

- Mistake: an older inventory migration test used the current ORM/service after
  downgrading below newly added columns. Its setup would no longer represent the
  schema being tested. An earlier hostile-input assertion also treated a newly
  approved field as unknown.
- Correction: create revision-matched synthetic rows with explicit parameterized
  SQL, then assert preservation after upgrade. Keep unknown-field tests hostile
  by using a genuinely unapproved field; separately test the newly approved path.
- Prevention: audit backward migration fixtures and strict-boundary assertions
  whenever additive fields enter an accepted module. Never weaken constraints or
  reset development to accommodate an outdated fixture.
- Promote to AGENTS.md: no; existing migration/security/contract gates apply.

## 2026-10-15: process start is not service readiness (SP-08)

- Mistake: an outage test retried immediately after its private supervisor spawned
  the API. The child existed but had not yet completed HTTPS/database startup.
- Correction: poll the real same-origin readiness endpoint for200 before the
  recovery submission, preserving the real stop/start and unchanged retry body.
- Prevention: distinguish process acknowledgement from service readiness. Do not
  add sleeps or mock business success; prove that the application can serve again.
- Promote to AGENTS.md: no; the existing real-stack harness already supplies this gate.

SP-14 follow-up: an inherited5s readiness assertion reproduced after process
restart. Guarded direct startup measured4466ms/1718ms; the private supervisor
acknowledged spawn before verified TLS listening, and Windows parent exit could
precede tree-kill completion. It now waits for CA-verified real liveness before
acknowledging start and for the exact owned tree to stop. The original readiness
assertion is unchanged;3 consecutive Chrome recovery repeats pass. A diagnostic
variant that added a direct probe changed timing and is not called unchanged
evidence. Final matrix acceptance remains separately recorded in SP-14 execution.

## 2026-10-15: keep test identifiers and visual evidence bounded (SP-08)

- Mistake: a10,001-character Unicode input became an implicit pytest parameter
  ID, overflowing useful diagnostics. Separately, a visible briefing assertion
  did not ensure the briefing text appeared inside the captured viewport.
- Correction: give hostile/large parameters short explicit ascii/unicode IDs.
  Scroll the specific safe content into view before the native screenshot and
  inspect the resulting pixels, not only a DOM visibility assertion.
- Prevention: data size must not determine diagnostic size. Name the intended
  subject of a capture and verify that the image actually contains it.
- Promote to AGENTS.md: no; existing privacy/evidence rules cover both corrections.

## 2026-10-15: form lifetime must follow the edited record (SP-08)

- Mistake: switching a block/floor/type selection while its RHF editor remained
  mounted changed the target prop but retained the previous record's default
  values. A real Chrome regression reproduced B1 still displayed after B2 was
  selected; saving could otherwise have copied the draft to the wrong target.
- Correction: key each hierarchy editor by its selected record/new mode so
  switching targets starts the correct form lifetime. Exercise blocks, floors,
  types and the transition back to Create on the real UI.
- Prevention: inspect both target identity and form state lifetime in reusable
  editors. A prop change is not a RHF defaultValues reset. Stop source-frozen
  verification before applying a functional fix, then restart affected coverage.
- Promote to AGENTS.md: no; existing record integrity/regression gates apply.

## 2026-10-15: observe rejection before its presentation (SP-08)

- Mistake: the Firefox invalid-apartment case asserted only the eventual French
  error message within the default DOM timeout, with no observation of submission.
- Correction: verify the chosen category, start observing the exact POST before
  clicking, assert the actual422 rejection, then check the message and retained
  draft. The focused case and subsequent Firefox run pass without application
  changes, sleeps, repeated mutation or mocked business responses.
- Prevention: test the real boundary and its presentation separately. Keep a
  failed command recorded; passing an isolated rerun does not accept unrun cases.
- Promote to AGENTS.md: no; the existing real-stack/evidence gate applies.

## 2026-10-15: real antivirus fixtures must prove the intended verdict (SP-09)

- Mistake: putting the harmless antivirus control string into a PDF comment
  was assumed to produce a rejection; real ClamAV correctly did not match that
  container placement. The focused test failed, not the scanner.
- Correction: retain the real scanner and assert its actual verdict. Use a valid
  synthetic Office archive containing the controlled test member; do not replace
  application scanning with fake success/rejection or relax the expected outcome.
- Prevention: establish a controlled payload's verdict with the real engine and
  signature set before relying on it in API/browser tests. Keep the failed run.
- Promote to AGENTS.md: no; real-service verification is already mandatory.

## 2026-10-15: hidden controls still need explicit geometry and lifetime (SP-09)

- Mistake: `sr-only` on the shared full-width Input retained conflicting width
  utilities and caused page overflow at320px. A native picker also displayed the
  host browser's English label despite French page locale.
- Correction: compose a French shadcn chooser with the real clipped one-pixel
  input inside a positioned fieldset; verify actual keyboard picker activation,
  touch, widths and zoom. Key upload state by typed parent identity. Restore
  focus after closing preview, interrupting transfer or archiving a removed row.
- Prevention: inspect computed geometry for visually hidden elements, not just
  visible fields. Wait for the actual dialog to unmount before testing the next
  keyboard action. Background accessibility queries are invalid while modal.
- Promote to AGENTS.md: no; existing responsive/accessibility gates cover it.

## 2026-10-15: direct grants require separate issuing-session proof (SP-09)

- Mistake prevented: a bearer permit tied only to a live database session would
  still let a copied token act as that session until expiry.
- Correction: require the issuing session's transient CSRF proof separately on
  direct transfers, store only its hash and recheck current session/role/scope.
  Another actor's proof plus a copied permit fails; no third-party cookie or
  protected raw-session exposure is introduced.
- Prevention: distinguish a server-side session reference from possession proof
  on a direct cross-origin transfer. Preserve this distinction during extensions.
- Promote to AGENTS.md: no; the existing session-bound permit contract applies.

## 2026-10-15: preserve command status through environment restoration (SP-09)

- Mistake: a post-run Python inspection raised a fixture-counter assertion, but
  the PowerShell wrapper's final environment-restoration assignment returned0.
  Reading the traceback prevented incorrectly accepting that diagnostic.
- Correction: capture `$LASTEXITCODE` immediately after the venv CLI, restore the
  prior task-specific environment in `finally`, then exit with the captured code.
  Clear only verified isolated transient fixtures under the shared lease and
  rerun count-only verification; never reset development to clean a test report.
- Prevention: a wrapper exit0 is insufficient if an inner command failed. Inspect
  actual outputs and propagate status explicitly across cleanup/finally blocks.
- Promote to AGENTS.md: no; existing evidence/isolation rules cover this case.

## 2026-10-15: focus follows committed DOM, not the next frame (SP-10)

- Mistake: after an asynchronous conflicted-edit save, an animation-frame callback
  could run before React mounted the replacement edit trigger. The actual headed
  focus assertion failed even though the save succeeded.
- Correction: a stable callback ref restores focus only when that trigger mounts;
  the final headed workflow verifies save/cancel and removal focus on real DOM.
  Keep the assertion, do not add sleeps or accept body focus.
- Related fixture lesson: after an editor unmounts/recreates a filter component,
  target the exact offering list item rather than an ambiguous repeated button.
  Process-start acknowledgement also needs an actual readiness200 before retry.
- Prevention: synchronize on the observable mount, target identity and service
  readiness required by the action, not an assumed scheduling order.
- Promote to AGENTS.md: no; existing functional/accessibility gates cover this.

## SP-11: name and settle the evidence state

- Mistake: a capture named denied-mobile retained the1024px geometry-probe width;
  detail/form captures raced their child queries, and a list-error capture showed
  a route skeleton rather than the asserted error.
- Correction: reset the actual viewport before each named state, await its exact
  heading/error/content and take native captures only after those conditions.
  Inspect pixels and dimensions, not just a passing automation exit code.
- Prevention: snapshot helpers must not equate “parent mounted” with “all child
  facts loaded”; a missing/wrong-state capture needs recapture before review.
- Promote to AGENTS.md: no; existing honest-evidence/accessibility rules suffice.

## SP-11: distinguish retry acknowledgement from worker lease recovery

- Mistake: the file-recovery browser test assumed a forced worker stop released
  its active job immediately, then allowed only20s for a clean verdict.
- Correction: verify the actual200 or exact FILE_SCAN_IN_PROGRESS409 response,
  retain the90s fencing policy and await the real scanner verdict/download.
- Prevention: derive recovery assertions from the documented lease/backoff;
  do not shorten production fencing or manufacture success to satisfy a test.
- Promote to AGENTS.md: no; existing race/interruption evidence rules cover it.

## SP-11: update the shared navigation smoke when a module becomes real

- Mistake: dedicated deal tests passed while the older shell smoke still
  expected Affaires to show the generic future-feature placeholder.
- Correction: assert the real create action and scoped empty list; rerun all
  shell cases across the five browser targets, not only the dedicated module.
- Prevention: include shared navigation assertions in each feature's affected
  regression set. Future-module expectations must change with implementation.
- Promote to AGENTS.md: no; existing regression-preservation rules suffice.

## SP-12: recreate an in-progress isolated migration before the full regression

- Mistake: the isolated database had an earlier draft of0014 when a later guard
  was added. Downgrade tests correctly exposed the stale applied schema.
- Correction: exercise the final empty downgrade/upgrade and populated probes
  before a clean full rerun; never stamp, reset development or discard history.
- Prevention: once a migration has been applied, do not assume editing its source
  changed the database. Freeze and recreate only the verified synthetic boundary
  before collecting final evidence. Published migrations need a new revision.
- Promote to AGENTS.md: no; isolation and verified-migration rules already apply.

## SP-13: guard committed stock against exit as well as entry

- Mistake: a deferred guard validated entering sold/rented but initially allowed
  raw SQL to replace a committed offering with available while its outcome lived.
- Correction: compare the latest unreversed effect with current state/version/
  terms; only a linked explicit reversal may restore its previous stock facts.
  Direct SQL state/price/period/history negatives now pass in the focused suite.
- Prevention: test both directions of every commitment invariant. Application
  command restrictions do not replace the database's reverse consistency check.
- Promote to AGENTS.md: no; current data-integrity/security rules already apply.

## SP-14: compare actual timezone runtimes before local-time arithmetic

- Mistake risk: installed Python, Node and shared PostgreSQL timezone data gave
  different Casablanca offsets for the same2026 instant. Browser formatting or
  SQL civil arithmetic would silently disagree with the booking validator.
- Correction: inspect actual versions/projections, pin the backend's installed
  tzdata2026.5, and resolve civil input/local projections through that authority.
  UTC half-open hourly intervals keep repeated hours distinct. Real fold/skipped
  time and hourly-boundary booking tests cover the adapter.
- Prevention: verify runtime timezone agreement, including future and DST cases;
  do not update a shared installation or introduce another timezone authority
  silently. Future tzdata upgrades need these boundary regressions.
- Promote to AGENTS.md: no; this is an adapter/runtime lesson, not a new business
  timezone decision. The approved timezone remains Africa/Casablanca.

## SP-13: preserve literal dollars in generated patch replacements

- Mistake: JavaScript string replacement interpreted a dollar/backtick sequence
  in a TypeScript template literal as replacement syntax, corrupting an allowlist.
- Correction: produce the replacement through a function, then apply a reviewed
  patch. Typecheck caught the error before browser verification.
- Prevention: use function replacements for literal source text containing dollar
  sequences and retain lint/typecheck before executing a generated test harness.
- Promote to AGENTS.md: no; this is a local editing-tool lesson, not product policy.

## SP-15: pin a verified civil-boundary fixture, not an assumed offset

- Mistake: a new midnight test assumed Casablanca was UTC+1 on January2030,
  then October2026; the installed pinned timezone data resolves both as UTC+0.
- Correction: inspect the backend authority and use January2026, verified UTC+1,
  for the cross-UTC-date case. Keep other offset/fold/skipped-time regressions.
  Do not change correct application time interpretation to satisfy a bad fixture.
- Prevention: verify each fixed boundary's actual offset, rather than inferring
  it from the city or another date. Product clocks stay backend-authoritative.
- Promote to AGENTS.md: no; the existing timezone/runtime rule already covers it.

## SP-15: release intercepted requests before removing their handler

- Mistake: unroute immediately after releasing a held loading request raced its
  pending route.continue and raised Route is already handled.
- Correction: settle initial data, capture the real pending state, release and
  await the actual response before unregistering. No application assertion or
  error monitoring was disabled.
- Promote to AGENTS.md: no; this is test-harness lifecycle detail.

## SP-15: measure the loaded screen before the next full navigation

- Mistake: the inherited responsive shell loop checked the visit page's heading,
  then navigated again while calendar policy/colleague/civil-time reads were
  pending. WebKit intermittently described the cancelled requests as access-control
  console errors. Safe request-failure diagnostics reproduced Load request cancelled.
- Correction: wait for dashboard reads to settle, the colleague response body,
  the loaded calendar refresh action and rendered policy before each measurement.
  Keep the original console-error assertion, widths and target checks unchanged.
- Prevention: a server-rendered heading is not evidence that an asynchronous
  working screen is ready. Await actual feature state, not arbitrary sleep or
  an exception filter. Record corrected reruns before claiming a pass.
- Promote to AGENTS.md: no; existing test/evidence rules already require it.

## SP-16: name the financial quantity in an event snapshot

- Mistake: a receipt-history event printed its commission snapshot amount directly
  after “Encaissement confirmé”, which could be mistaken for the receipt amount.
- Correction: separate the action/version from “Montant de commission”. Actual
  receipt amounts remain in the linked original/replacement receipt history.
- Prevention: a correct decimal alone is insufficient financial UI evidence;
  label which quantity it represents and assert that wording in the real browser.
- Promote to AGENTS.md: no; this is a concrete application of truthful domain copy.

## Local runtime: separate process health from browser trust and hydration

- Mistake: a simulator form fill could wait180s while Next's development runtime
  had not enabled the form. A decoded scoped-helper filename was rejected, but
  fixing that404 alone did not resolve the remaining development WebSocket errors.
- Correction: verify the exact asset request, narrowly retain the static-proxy
  boundary, and assert enabled form readiness with a bounded timeout. Normal CRM
  secure HMR and compiled signed-intake checks are separate evidence. Revert an
  unsuccessful origin/CORS experiment instead of retaining speculative config.
- Prevention: use compiled mode for the documented complete local workflow until
  a scoped simulator-development integration is independently verified. Never
  report a failed development run as passing because compiled mode passes.
- Windows10054 reset callbacks: use the pinned server's supported loop factory,
  not a deprecated global policy or a blanket exception filter. Keep verified
  HTTPS probes separate from ordinary Chrome's user-controlled root-CA trust.
- Promote to AGENTS.md: no; existing isolation/security/evidence gates suffice.

## Default manual commands need their own verification

- A passing factory-based KAY launcher did not verify the user's conventional
  `uvicorn app.main:app --reload` import target. Export the actual ASGI app and
  test Uvicorn's import without implicit-factory warnings, while retaining the
  explicit factory for existing isolated callers. Verify an actual reload too.
- Uvicorn defaults to HTTP; making the import work does not make an HTTPS-only
  facade compatible. Document/test the standard Uvicorn SSL options rather than
  weakening TLS or telling the user a bare HTTP process serves the whole CRM.
- A listening frontend URL does not establish browser trust. After explicit CA
  approval, validate the exact leaf/authority and read the user store freshly;
  a stale certificate-provider path is not proof that import failed. Use public-
  certificate parsing, not a helper that also expects a matching private key.
- Keep pytest and Playwright fixture writers serial even for focused startup
  checks; the shared lease correctly refused an accidental overlap before any
  fixture write. Rerun only after the owning browser supervisor has exited.
- Renaming a dependency artifact also changes recovery inputs. Inspect code
  archives/compatibility digests, not only install scripts and the detector;
  keep the canonical requirements file in both the archive and its fingerprint.
- Promote to AGENTS.md: no; existing security, real-command and serial-writer
  requirements already cover these corrections.

## Responsive filters: preserve selection and capture focus before publishing

- Moving one form between a desktop rail and modal Sheet unmounts its subtree.
  Keep main drafts and the actual selected agent's display label in the parent;
  an ID alone cannot label a selected option absent from a newly loaded page.
  The label is display metadata, not authority or an API field.
- A separate media listener can run after useSyncExternalStore has removed the
  focused drawer field. Capture its ID before publishing the breakpoint change,
  then focus the corresponding rail control or narrow-screen trigger. The real
  headed resize test first failed and verifies the correction.
- A tall drawer can put an after-buttons validation alert below the viewport.
  Put the existing alert before the actions and assert it is actually in view,
  not merely mounted/visible according to the DOM matcher.
- The shared createLead test helper assumes an agent actor. An administrator
  needs an explicitly selected real assignee; do not relax that business rule to
  repair fixture setup. Await held route handlers with unrouteAll(wait) before
  resizing/navigating; unroute without waiting produced an already-handled race.
- Promote to AGENTS.md: no; these are concrete responsive/test lifecycle cases,
  already covered by the existing preservation and evidence requirements.

## Managed Python startup is distinct from local operator tooling

- A successful buildpack dependency install did not prove runtime compatibility:
  importing app rejected the managed `.heroku/python` prefix before Uvicorn bound
  its service port. A focused regression reproduced the exact supplied failure.
- Separate pinned application-runtime validation from strict local CLI validation.
  Permit only the verified Linux managed prefix and exact Python patch, not an
  arbitrary skip flag or every global interpreter. Keep app.cli's venv boundary.
- Test a real Linux Uvicorn import/lifespan, process liveness and graceful shutdown
  with synthetic unavailable dependencies; retain503 rather than pretending the
  database is ready. Add the Linux probe to the required CI aggregate.
- Interpreter compatibility is not cloud configuration, persistent storage,
  worker, backup or production acceptance. Do not remove those guards to chase
  the next health check. See the published managed-runtime repair record.
- The hotfix's standalone deployment record contains its public evidence; this
  shared lessons file also has unrelated uncommitted UI work and is not included
  in that narrowly scoped publication.
- Promote to AGENTS.md: no; the exception is documented as managed API startup,
  while the local execution rule remains authoritative for local tools.
