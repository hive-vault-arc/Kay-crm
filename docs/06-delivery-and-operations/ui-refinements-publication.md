# KAY UI refinements publication

2026-10-16. The owner's subsequent request to push to main authorizes publishing
the previously local UI refinements. Earlier no-push statements in the individual
execution records describe their original preparation boundary, not a continuing
publication prohibition. Preserve their historical test results and limitations.

## Included scope

- Pure-black sidebar/mobile navigation, account summary and one real logout
  button in the footer, without the old change-password link.
- Gold creation actions, quieter compact list utilities, and existing directory
  searches/filters in the shared left rail or accessible narrow-screen Sheet.
- Iconsax login labels/actions and smooth field geometry, retaining real auth.
- Borderless enlarged city header without local-service status/retry or audit
  shortcut. The authorized direct audit view and backend health endpoints remain.
- Neutral KPI summary, Bklit current-distribution funnels and existing contributor
  totals as stacked bars, without invented daily metrics or conversion claims.
- Lead/Deal paired icon-labelled facts with desktop columns and mobile reflow.
- Explicit shared semantic Iconsax action buttons across the remaining forms,
  dialogs, tables, navigation and unpictured route families. Existing behavior,
  role checks, fields, API data, French labels, MAD and Casablanca dates remain.

No new backend, API, migration, business rule, dependency lock, permission or
GitHub workflow change is included. The already-published production settings,
public CA and guarded first-admin script remain unchanged.

## Coverage and earlier evidence

The retired detailed reference records once listed the affected surfaces. Current
inventory at this historical publication gate: 284 buttons in 94
files, 275 typed semantic mappings, 5 pre-existing icon buttons, 4 numeric/chart
exceptions and 0 violations. Icons: 43 semantic exports, 28 consumers, 113 sites,
3 chart roots excluded and 0 violations. shadcn/ui, Tailwind and Bklit are retained.

The earlier scoped real-browser results are summarized in
[QA commands](../QA_COMMANDS.md) and [security checks](../SECURITY_CHECK.md).

This publication adds no new visual direction. Existing KAY 1/1/1 dials,
design-system geometry and antislop DURING implementation remain the context;
no unselected AFTER finding is silently applied. Human product/design acceptance
is not inferred from the request to publish or technical checks.

## Publication verification

- Current frontend `npm.cmd run lint`, `npm.cmd run typecheck` and
  `npm.cmd run build`: pass, no reported warnings/errors.
- `npm.cmd run security:check`: runtime vulnerabilities 0. The existing nine-package
  dev-only advisory retains the owner's one narrow exception expiring 2026-11-15;
  this is not a clean full audit or a new exception.
- Compiled headed Chrome representative selection: **7/7 passed in 4.5 minutes**,
  no skipped cases, against the guarded synthetic local stack. This covers real
  logout/revocation and failure recovery, shared action SSR/styles, route-family
  destinations/dialogs, removed dashboard controls with direct audit access,
  populated directory filters, real report distributions and Lead/Deal facts.
  Keyboard, touch, narrow layouts and safe failure states are exercised by the
  selected cases. Fresh desktop/mobile Leads and desktop performance captures
  were opened and visually inspected; screenshots remain ignored local evidence.
- Repository-only documentation validation passes: 22 sprints, 1,151 local links,
  13 Mermaid pairs, 10 JSON examples and 41 acceptance mappings. Staged path/size/
  ignore checks and redacted Gitleaks pass; no secret finding or new exemption.
- Repository/index/secret checks and the exact candidate's real hosted
  `CI required` aggregate must pass before protected-main merge. No force push,
  branch-protection bypass or continue-on-error is permitted.

Actual browser command from `frontend/`, with `KAY_E2E_PRODUCTION=1`:

```powershell
npm.cmd run test:chrome -- tests/e2e/action-buttons.spec.ts tests/e2e/filter-rail.spec.ts tests/e2e/performance-layout.spec.ts tests/e2e/dashboard-header.spec.ts tests/e2e/account-footer.spec.ts tests/e2e/record-facts.spec.ts --grep 'Action buttons:|filter rail: populated|Performance: neutral|Dashboard header: city|account footer: plain|Lead/Deal facts: Iconsax' --reporter=list --max-failures=1
```

The complete manual database/backend/browser release workflow is **not executed,
not passed** for this publication. It remains mandatory on disposable synthetic
targets before real customer data and must never run against production. Local
representative browser checks are not a whole-product/release certification.
No production database, credentials, account creation or real-data operation.
