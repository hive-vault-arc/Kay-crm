# KAY frontend working rules

Read and follow the root `../AGENTS.md`, current sprint and KAY design contracts.
The framework guidance below complements those rules. KAY uses Radix/New York
shadcn/ui, Tailwind 4.3.3, Iconsax and the light Riviera tokens. Current fonts are
self-hosted Fraunces1.000 (titles), Manrope4.505 (UI) and DM Sans4.004 (metadata),
with original OFL notices retained. See `../branding/riviera/README.md`; the
2026-10-18 owner-selected handoff supersedes older system/Satoshi color/type notes.
Use only the typed semantic exports from `@/components/icons`; the official
browser-only loader is not imported. Keep `THIRD_PARTY_NOTICES.md` and the
public Iconsax notice with distributions. After shadcn/Bklit updates, migrate
generated interface icons to this layer before accepting them; never alter
chart geometry or mix in a second icon family. See the Iconsax migration record.
Charts use Bklit when introduced in SP-17. Keep future business states explicit;
authentication is implemented in SP-03 with per-page guards, transient CSRF and
protected cookies. SP-04 adds administrator-only Settings/users, strict versioned
commands; D37 uses admin-chosen initial passwords, immediate restricted login and
confirmed logical deletion instead of activation/handoff/disable. No GET, persistent browser storage,
logs, traces or screenshots may retain temporary plaintext. Test credentials exist only in isolated synthetic fixtures,
never the development database. SP-02's server-only HTTPS facade connects
safe health status to FastAPI/PostgreSQL; never expose its secret or bypass TLS.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
