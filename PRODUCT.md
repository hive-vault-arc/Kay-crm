# KAY product context

Status: index of existing approved contracts, not a new product specification.
Updated: 2026-10-16 for the Approved V3 UI implementation.

KAY is an existing one-team real-estate CRM with a French web interface, MAD
amounts and backend-authoritative Africa/Casablanca dates. Product scope,
authority and behavior are established elsewhere; this file does not duplicate
or replace them.

## Binding sources

- [Project index](README.md), [approved scope](core-scope.md) and
  [confirmed decisions](decisions.md).
- [Permissions](permissions.md), [workflows](workflows.md),
  [business rules](docs/02-requirements/business-rules.md) and
  [acceptance scenarios](docs/05-quality/acceptance-tests.md).
- [Architecture](docs/04-design/architecture.md),
  [data model](docs/04-design/data-model.md) and
  [API contracts](docs/04-design/api-contracts.md).
- [Working rules](AGENTS.md), [engineering rules](docs/01-working-agreements/coding-standards.md),
  [verification harness](docs/HARNESS.md) and [security gate](docs/SECURITY_CHECK.md).

The current user request and explicit decisions take precedence. C01–C14 and
the documented promotion of development hierarchy into C04 remain the approved
core; other future options are not authorized by this pointer.

## Current visual authority

[Approved V3](docs/04-design/ui-reference/approved-v3/README.md) supplies nine
selected compositions and the extension rules for every existing surface.
[DESIGN.md](DESIGN.md) is the existing visual entry point. The current task
authorizes a UI-only implementation with working actions and real scoped API
data, not new backend behavior, deployment, a new product workshop, a new font
license or mockup-only features. Its explicit antislop timing is DURING;
separate AFTER-only audit findings still require user selection.

Implementation coverage and actual results are recorded in the
[route/surface checklist](docs/04-design/ui-reference/approved-v3/coverage.md)
and [execution ledger](docs/04-design/ui-reference/approved-v3/execution.md).
These are technical evidence, not Khalid's final product acceptance.
