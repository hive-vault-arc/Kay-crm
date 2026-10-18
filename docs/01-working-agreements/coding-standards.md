# KAY coding standards

Status: active working rules; SP-01/SP-02 foundations exist, business modules pending  
Date: 2026-10-14  
Confirmed context: KAY's stack, including mandatory shadcn/ui components, Tailwind CSS styling, and Bklit UI charts, plus permissions, workflows, money, time zone, and API contracts are documented elsewhere.  
Technical proposals: maintainability thresholds and verification practices below.  
References: [repository structure](repository-structure.md), [architecture](../04-design/architecture.md), [API contracts](../04-design/api-contracts.md), [data model](../04-design/data-model.md), [styling](../04-design/styling.md), [Python quality guide](../reference/python/code-quality-for-kay.md), [QA commands](../QA_COMMANDS.md), KV `Knowledge/Engineering/App Development Standards.md` and `Agentic Coding/Harness/Project Agent Operating Playbook.md`.

## General rules

- Implement the smallest complete workflow for the current requirement. Keep routes and pages thin; put business decisions in named services or domain functions. Avoid speculative abstractions and unrelated refactors.
- Use meaningful names and explicit input/output contracts. Prefer one source of truth for each rule. Server-side validation and authorization are never replaced by frontend checks.
- Reuse existing components, helpers, and patterns before adding a dependency. A new dependency needs a concrete use, maintenance/security review, and a pinned version in the future app lockfile.
- Write a test for a rule or bug at the boundary where it can fail. Keep synthetic fixtures. Update the linked requirement, model, API, and acceptance evidence when behavior changes.
- Never store secrets or real client data in tracked source, fixtures, docs, screenshots, browser storage, or logs. Use safe errors and request/job IDs for diagnostics. The user-authorized local database credentials note is excluded by the root .gitignore; it may supply ignored runtime configuration only, not tracked examples or evidence.

## File and function size

The KV playbook proposes 300 lines per normal source file and 50 lines per function. Adopt these as review triggers, not a reason to split cohesive code mechanically:

| Threshold | Required response |
|---|---|
| Source file above 300 lines | Review responsibilities and extract a real module/component if two concerns have grown together. Record a brief reason if it stays whole. |
| Source file above 500 lines | Treat as active architecture debt; split before adding more behavior unless the file is generated or a documented framework exception. |
| Function above 50 lines | Review branches, side effects, and names. Split when the resulting functions express useful steps; do not create meaningless one-line wrappers. |

Generated code, migrations, snapshots, fixtures, and reference documentation are exempt from these size targets, but still need review for correctness. File size alone is not a quality metric; low cohesion, mixed responsibilities, hidden side effects, and untestable branches are the actual warning signs.

## Frontend: Next.js, TypeScript, Tailwind, shadcn/ui, Bklit

- Read the three installed skills in the [mandatory UI skill rules](../03-planning/ui-skill-rules.md) before UI work. Apply system-first layout and explicit surface applicability; antislop remains an AFTER audit, with numbered audit-only fixes selected by Khalid. Skill defaults do not replace KAY's binding stack or design direction.
- These are binding stack choices, not interchangeable examples: use shadcn/ui for all standard UI components, Tailwind CSS as the styling system, and Bklit UI for every chart. No alternative component kit, CSS framework, or chart library may be added without a new KAY decision.
- Keep route files focused on data/loading boundaries and composition. Put contacts, inventory, deals, visits, and other workflows in feature modules. Use typed API client functions; avoid raw `fetch` scattered across components.
- Reuse shadcn/ui `components/ui` primitives and `components/shared` patterns when they mean the same thing. Custom KAY-specific components are allowed when shadcn/ui has no suitable control or the domain needs composition; reuse its primitives where applicable and document why a new standard-looking control was necessary. Domain-specific controls stay in their feature. Do not modify a shared component for one screen in a way that silently changes others; add an explicit variant or local composition.
- Separate server data, form state, and transient UI state. Use `useEffect` for external synchronization, not values derivable during render. Keep conditional class names complete for Tailwind's scanner.
- Follow the [Tailwind guide](../04-design/styling.md): use its utilities for ordinary styling; custom CSS is a narrow, explained exception, not a second styling system. Use the approved local roadmap's light semantic-token mapping; final real-use brand/font review is separate. Do not adopt a demo palette as a brand decision.
- Layout density: do not add arbitrary full-page max-width caps or oversized outer padding that leave conspicuous unused viewport bands. Use the available shell width; constrain reading/forms only when it improves legibility. Keep deliberate component spacing, safe areas, dialog clearance and 44px touch targets. See the owner-requested compact-space rule in [DESIGN.md](../../DESIGN.md).
- Render loading, empty, filtered-empty, error, unauthorized, forbidden, stale, and success states where applicable. A failed dashboard chart should not blank a working navigation or sibling metric.
- French labels, long names, MAD values, international phones, keyboard and touch input, 200% zoom, mobile widths, and reduced motion are part of feature QA. The backend remains authoritative when a UI button is hidden or disabled.
- Use Bklit UI for every chart, and create charts only for approved KPI questions. Compose or extend Bklit if needed; if it cannot meet a real requirement, stop for a KAY decision instead of switching libraries. Show an accessible value/table alongside charts, and compare plotted values with the authorized API response.

## Backend: FastAPI, PostgreSQL, workers

- Keep FastAPI handlers focused on request/response translation. Services own workflow transactions; domain rules own invariants; repositories own persistence details. Workers call the same domain/application rules under explicit authority.
- Use separate create/update/response schemas. Validate untrusted CSV, form, and file input at the boundary and domain layer. Return the agreed safe API error shape.
- Use `Decimal` and PostgreSQL `numeric` for money, aware UTC instants for storage, and `Africa/Casablanca` for business calendar interpretation. Preserve original monthly/annual rental terms. Never use binary floats for financial rules.
- Enforce identity, role, collaboration, record scope, version checks, reservations, uniqueness, and balances on the backend. Use database constraints and short transactions where an invariant can race. Test concurrent and retry paths with PostgreSQL.
- Treat a reusable `unit_type` as a template, never a stock item. Keep the physical `property`/unit and whole `development` offering targets distinct. Validate block/floor/type membership in the same development and lock the development before overlapping reservation/close transitions; do not calculate project availability by summing unprotected client-side rows.
- Make imports, file transitions, notifications, and other retryable side effects idempotent. Outbox work must be bounded, observable, and safe after a crash or replay.
- Review each Alembic migration for existing data, locks, compatibility, and recovery. A schema change needs a migration and test evidence, not an ORM model edit alone.
- Backend runtime is Python 3.14.3 in backend/.venv. Every launch/install/worker/migration/test/utility uses its explicit interpreter or executable; Python subprocesses use sys.executable. Use Ruff and mypy with the declared locked packages; see the [approved local roadmap](../03-planning/local-roadmap.md) and [Python guide](../reference/python/code-quality-for-kay.md).

## Definition of done

Acceptance criteria pass for permitted, forbidden, invalid, concurrent, and interrupted cases that apply. For UI work, review component provenance (shadcn/ui or a justified KAY-specific composition), Tailwind use and any custom-CSS exception, and Bklit provenance for every chart. Run the actual [QA commands](../QA_COMMANDS.md), inspect visual behavior if UI changed, complete the [security check](../SECURITY_CHECK.md) if triggered, and update docs/traceability. If no app exists or a check cannot run, report it as **not run**. Do not convert a documented proposal into a test result.
