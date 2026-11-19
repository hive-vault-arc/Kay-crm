# Inventory deletion verification — 2026-11-19

Scope: D54, biens and programmes only. Existing unrelated workstation edits,
deleted reference assets and private configuration are excluded from publication.

## Executed local checks

- Explicit backend `.venv/Scripts/python.exe`: Ruff and `mypy app` pass.
- Real isolated PostgreSQL: the initial inventory/development/permissions selection
  passes 58 tests; the requirements/deals/migration selection passes 52 tests;
  the deletion/work/project-link/photo/report selection passes 43 tests.
- Final deletion selection passes 9 tests after ordinary linked-deal and parent
  programme invalidation was added. It covers physical root/hierarchy removal,
  retained completed deals, released reservations, task/visit/shortlist reads,
  forbidden new links, agent denial, strict HTTP/CSRF/key checks, concurrent retry,
  rollback, resurrection denial, single-unit removal preserving its programme
  and siblings, and durable private-storage cleanup.
- Test migration down to 0053, back to head and `alembic check` pass. Development
  `alembic upgrade head` and `alembic check` pass with no metadata drift.
- Frontend `npm.cmd run test:unit`: 997 pass, 0 fail. `npm.cmd run lint` and
  `npm.cmd run typecheck` pass.
- Visible isolated Chrome, ports 3112/8112/8113/8114:
  `npm.cmd run test:chrome -- tests/e2e/inventory-lifecycle-recovery.spec.ts --max-failures=1 --reporter=list`
  passes both 390px property and 1440px programme journeys. Each creates a current
  offer, deletes through the actual dialog, loses its first acknowledgement,
  checks initial focus on Cancel, Escape dismissal, focus return and Enter
  reopening, then disabled cancellation and Escape protection, replays the original key,
  returns to Projects and verifies a 404 for the deleted root. No horizontal
  viewport overflow was observed. The ordinary 3100/8100 servers were untouched.

The baseline Next.js runtime failed the existing dependency gate. The official
[16.4.5 release](https://github.com/vercel/next.js/releases/tag/v16.4.5) fixes the
reported cache advisories. Next and its matching ESLint configuration were pinned
to 16.4.5 with a regenerated lock. The final dependency gate reports zero runtime
or full-tree vulnerabilities and no exceptions. Browser tests and the frontend
checks above were rerun on that patch.

## UI skills and review boundary

CRM UX and design-system-ops apply: the existing Actions placement, shared Button
and shadcn AlertDialog provide the control, spacing, touch size, modal clearance
and destructive styling. React best practices apply to command cancellation,
identity binding and unmount handling. Design-taste-frontend's broad visual
direction is outside this narrowly scoped existing-control replacement. The
owner's antislop AFTER choice remains in effect; no audit-only redesign or human
product acceptance is inferred from automated checks.

The security review is recorded in `docs/SECURITY_CHECK.md`. Full hosted CI and
full release integration must succeed on the PR head before merge. Production
schema must reach 0054 before the new API and ordinary worker deploy. No real
production property is deleted to test this change.
