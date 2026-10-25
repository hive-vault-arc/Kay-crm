# Local CRM bug sweep, 2026-10-24

## Scope and safeguards

Review the integrated CRM frontend/backend and correct confirmed defects only.
Use the existing clean managed checkout on `codex/local-bug-sweep`, based on
integrated main09a9702. Preserve the original checkout's unrelated dirty work.
No push, PR, merge, deployment, production access or development-data cleanup.

Review shared query/live-update paths, contact scope, owners/project links,
inventory creation/editing, files/generated documents and scheduled work.
Static checks and synthetic workflow tests support this review; they do not
prove that every application path is bug-free.

## Confirmed corrections and acceptance

1. Selecting Chambre from the default sale form switches to rental but leaves
   `period` empty. Set a valid monthly default when the category forces rental.
   Preserve the chosen period when the market does not change. Verify creation
   without touching the period selector and inspect the persisted priced draft.
2. Lead PDF generation checks the Lead archive flag but misses the parent
   contact's archive flag for managers/administrators. Reuse the active writable
   contact guard before generation, including receipt replay and the final
   commit check. Deny new/replayed generation on archived contacts, retain
   authorized reads of existing history and documents, and rerun normal PDF flows.
3. Interrupted photo metadata with no version has no Resume action; agents also
   lack Resume for their own photos because that control shares the manager-only
   archive flag. Add a minimal response-only `can_upload` capability for photos,
   computed from current identity without exposing creator IDs. Keep archive/scan
   controls manager-only and recheck upload permits on the backend. Cover reload,
   ten occupied slots, owner/colleague/manager differences and keyboard focus.
4. Fresh dependency audits reject fast-uri3.1.8 and development-tool dependencies.
   Update fast-uri to3.1.9, shadcn tooling4.21.5 to4.22.1 (registry0.2.0),
   body-parser2.4.0 and undici7.30.1. Deduplicate nested Zod onto existing4.6.7;
   retain compatible qs6.16.1/systeminformation5.33.16 tooling resolutions.
   No generated components, Next.js, React or Node pins change. Retain registry
   integrity checks and audit policy, without new exceptions.
   [Maintainer advisory](https://github.com/fastify/fast-uri/security/advisories/GHSA-w74x-v6f9-j3xg).

These corrections restore existing contracts, not new business rules. No schema
or framework changes. Dependency updates stay within compatible runtime/tooling
versions. Backend authorization remains authoritative.

The capability is optional for older backends, with agents failing closed when
it is absent. Metadata emits the addition only for the fixed server-side
`X-Kay-Photo-Capabilities: 1` opt-in; older facades receive their original strict
shape. Compatibility tests cover both deployment orders. No deployment is
performed in this task.

## UI and skills

React guidance informs the functional category-state update. Design-system-ops,
frontend-design, uncodixfy and Impeccable's hardening/craft guidance preserve
Riviera and existing shadcn controls. No typography, colors, geometry or assets
are redesigned. Dense CRM/multistep forms are outside design-taste's marketing
workflow. Antislop remains AFTER; no unrelated aesthetic finding is selected.

## Verification boundary

Use the exclusive synthetic-database lease, serial database/browser writers and
the explicit backend venv. This run starts the owned test PostgreSQL cluster
on127.0.0.1:5544, because its former55439 listener could not bind after restart.
Browser isolation uses8110/3110/8111/8112. Shared database/system services and
other projects are not changed. Scanner-dependent verification requires a real
healthy ClamAV service, never a fake verdict. Actual results and environment
limitations belong in [QA commands](../QA_COMMANDS.md).

## Scanner follow-up

The owner confirmed Docker was not running and requested completion of the
remaining upload checks without any push. Reuse the pinned worktree Compose
project `kay-realtime-tests`, preserving its signature volume and loopback3310.
Require Docker health and an actual ClamD VERSION response before running all
file/photo/generated-document backend cases without scanner exclusions, followed
serially by compiled visible Chrome upload/viewer/recovery cases. Use only
synthetic clean/rejected fixtures and the isolated database lease. Fix confirmed
failures rather than weakening quarantine, permission or antivirus checks;
record exact results and stop temporary test services afterward. No migration,
production access or publication is authorized by this follow-up.

## Publication follow-up (2026-10-25)

The owner now requests verification, push and merge to main. This supersedes the
earlier local-only publication restriction, without authorizing unrelated dirty
checkout changes. The candidate remains based on integrated main09a9702 with no
schema migration. Run source/index/secret checks, publish this scoped branch and
PR, and require real automatic CI plus the exact-candidate synthetic backend/
browser integration workflow before merging. Do not bypass failed checks or
claim local tests as a hosted result. No production data or configuration needs
changing for these corrections.

The first hosted runtime audit rejects newly reported pypdf6.21.1 advisories.
Use reviewed patch6.21.2 and regenerate both hash locks with the project venv.
The full dev audit additionally requires compatible filelock4.2.1 and
setuptools84.1.0. Do not bypass the failure or count the cancelled superseded
integration run; repeat local PDF checks and hosted gates on the corrected head.
