# Redesign dependency remediation — 2026-10-30

The failed dependency gate is fixed. The unused shadcn4.22.1 authoring CLI and its
orphan dependency tree are removed. The reviewed shadcn component source,
Radix/Tailwind/Bklit, Next16.4.2, React, registry configuration and selected UI
remain. The latest CLI4.23.0 still declares deepmerge; the
[advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) lists no patched
deepmerge version. No package downgrade, override, new dependency or expanded
exception was used. Source component maintenance is documented instead of
executing an unpatched generator.

| Check after cleanup | Result |
| --- | --- |
| Frontend unit/facade/TLS suite | 994 passed,0 failed,0 skipped |
| Full frontend lint | Passed;0 icon/button violations |
| TypeScript | Passed |
| Next production build | Passed |
| Compiled history check | Passed |
| Production/full dependency security gate | 0/0 vulnerabilities,0 exceptions used |
| Application source/public assets | All548 tracked files unchanged |
| Required runtime graph | All180 required package entries unchanged |
| Retained lockfile packages | All575 versions/resolved URLs/integrities unchanged |

The220 removed lockfile entries belonged to development/optional tooling. The
first conservative graph check treated devOptional validators as required and
reported5 removed optional validators; the corrected proof checks the required
graph separately and every retained package version/integrity. This initial
check failure is retained in evidence, not represented as a passed run.

The existing573 connection-forbidden backend unit result is retained; backend
source did not change. The723 deselected cases, actual PostgreSQL/native/private
file/AV/PDF/CI/AFTER/product verification remain unrun. The exact remote main was
fetched and matches the local main; it is an ancestor of this branch. No remote
redesign branch was returned by the read-only lookup, and no push/merge/deploy
was performed. This checkpoint does **not** establish merge readiness.

The broader requested [source design review](../05-quality/redesign-source-review-2026-10-30.md)
records supported layout choices, corrected stale frontend guidance and actual
coverage limits. [Test/graph evidence](design-migration-evidence/unused-cli-removal-2026-10-30.json).
