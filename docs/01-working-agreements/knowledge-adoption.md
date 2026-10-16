# KV knowledge adopted for KAY

Status: source-to-project adoption map; KV vault unchanged  
Date: 2026-10-14  
Confirmed context: the KAY product scope, architecture, API, and privacy decisions in this repository take precedence over general notes.  
Technical proposal: keep the distilled working rules in KAY rather than mirror the entire personal knowledge vault.  
References: [project decisions](../../decisions.md), [architecture](../04-design/architecture.md), [coding standards](coding-standards.md), [harness](../HARNESS.md), source vault `C:\Users\khali\Desktop\KV\Knowledge` and `C:\Users\khali\Desktop\KV\Agentic Coding`.

The source vault contains 20 Engineering notes, two Design notes, three AI notes, and a separate 24-file Agentic Coding pack. This register records what KAY needs from them. The new KAY rules are self-contained, while source names allow a future reviewer to trace the reasoning. KV files were read, not edited or copied. Obsidian links and other-project examples in the vault are not KAY requirements.

## Design and engineering notes

| KV source note | KAY use | Project destination or boundary |
|---|---|---|
| `Knowledge/Design/UI UX Best Practices.md` | Adopt: predictable navigation, grouped fields, clear actions, mobile plan, touch targets, real UI states. | [Coding standards](coding-standards.md), [acceptance tests](../05-quality/acceptance-tests.md). |
| `Knowledge/Design/Design Inspiration.md` | Research source only. A tool list or inspiration image does not approve KAY's palette, typography, or layout. | [Styling guide](../04-design/styling.md); brand decision still open. |
| `Knowledge/Engineering/App Development Standards.md` | Adopt: vertical workflow scope, thin routes, backend authority, states, QA, release gates. | [Coding standards](coding-standards.md), [harness](../HARNESS.md), [QA commands](../QA_COMMANDS.md). |
| `Knowledge/Engineering/API and Network Architecture.md` | Adopt: explicit contract, bounded requests, retries, authorization and diagnostics. | [API contract](../04-design/api-contracts.md), [architecture](../04-design/architecture.md). |
| `Knowledge/Engineering/Database and Storage Systems.md` | Adopt: PostgreSQL constraints, transactions, indexes, concurrency, private object metadata, restore testing. | [Data model](../04-design/data-model.md), [security check](../SECURITY_CHECK.md). |
| `Knowledge/Engineering/Software Architecture Patterns.md` | Adopt: boundaries and ADR-style trade-offs, applied to one modular monolith. | [Architecture](../04-design/architecture.md), [repository structure](repository-structure.md). |
| `Knowledge/Engineering/Security Best Practices.md` | Adopt: role/object checks, CSRF, private storage, safe logs, negative tests, supply-chain review. | [Security contract](../04-design/security-and-privacy.md), [security check](../SECURITY_CHECK.md). |
| `Knowledge/Engineering/Cloud DevOps and Delivery.md` | Adopt: separated environments, intentional migrations, release evidence, backup and restore exercises. | [Release and recovery](../06-delivery-and-operations/release-and-recovery.md), [QA commands](../QA_COMMANDS.md). |
| `Knowledge/Engineering/Distributed Systems and Reliability.md` | Selective: timeouts, idempotency, failure isolation, RPO/RTO. Do not import multi-region architecture by default. | [Architecture](../04-design/architecture.md), [release and recovery](../06-delivery-and-operations/release-and-recovery.md). |
| `Knowledge/Engineering/Messaging and Event-Driven Systems.md` | Selective: outbox, retries, deduplication, dead-job visibility. No Kafka requirement. | [Architecture](../04-design/architecture.md), [coding standards](coding-standards.md). |
| `Knowledge/Engineering/Caching Performance and Observability.md` | Selective: latency budget, p95, traces, cache freshness. Add a cache only after measurement and privacy review. | [Architecture](../04-design/architecture.md), [QA commands](../QA_COMMANDS.md). |
| `Knowledge/Engineering/Responsive SaaS CRM UI Patterns.md` | Adopt the CRM workflow ideas, not ExtJS. Mobile field actions differ from desktop review/bulk work. | [Coding standards](coding-standards.md), [repository structure](repository-structure.md). |
| `Knowledge/Engineering/System Design & Scaling.md` | Selective: idempotency, indexing, capacity checks, and measured scaling. Its million-user, Kubernetes, trading, and streaming examples are not an MVP blueprint. | [Architecture](../04-design/architecture.md), [release benchmark](../06-delivery-and-operations/release-and-recovery.md). |
| `Knowledge/Engineering/Web Dev & SEO.md` | Selective: accessibility, privacy notices, page performance. SEO/crawlability applies to a future public KAY site, not private CRM pages. | [Coding standards](coding-standards.md), [security/privacy](../04-design/security-and-privacy.md). |
| `Knowledge/Engineering/Payments and Fintech Systems.md` | Selective: exact amounts and financial audit reasoning. KAY core records commissions but does not process card payments. | [Data model](../04-design/data-model.md), [business rules](../02-requirements/business-rules.md). |
| `Knowledge/Engineering/Data Platforms.md` | Defer a warehouse/lakehouse. PostgreSQL aggregates serve the initial KPI contracts until evidence requires more. | [Architecture](../04-design/architecture.md). |
| `Knowledge/Engineering/Low Latency C++ and Trading Systems.md` | Out of scope for the KAY CRM. | No project rule. |
| `Knowledge/Engineering/ByteByteGo System Design Source Catalog.md` | Reference catalogue, not a build requirement. | No copy in project. |
| `Knowledge/Engineering/Software Engineering Resource Map.md` | Learning catalogue, not a build requirement. | No copy in project. |
| `Knowledge/Engineering/System Design Knowledge Map.md` | Navigation and review method only. | No separate project file. |
| `Knowledge/Engineering/System Design Interview Playbook.md` | Borrow clarification/trade-off questions for reviews; not an implementation checklist. | [Harness](../HARNESS.md). |
| `Knowledge/Engineering/System Design Case Studies.md` | Background examples only; avoid transplanting another product's architecture. | No copy in project. |

## AI knowledge and coding-agent harness

| KV source | KAY use | Project destination or boundary |
|---|---|---|
| `Knowledge/AI/AI Agents.md` | Its context, tool scope, evaluation, and prompt-injection ideas apply if KAY later approves an AI product feature. They do not add AI to C01-C14. | Deferred. [Harness](../HARNESS.md) governs coding agents, not a product AI feature. |
| `Knowledge/AI/Private Local RAG System.md` | No RAG feature or local model is in the core. | Deferred. |
| `Knowledge/AI/AGI Transition.md` | Strategic background, not an implementation contract. | Not imported. |
| `Agentic Coding/README.md`, `Harness/Harness Overview.md`, `Harness/H.V.A Harness v1.md`, `Harness/Project Agent Loop.md`, `Harness/Project Agent Operating Playbook.md` | Adopt the read, define, edit, verify, fix, handoff loop; evidence and stop rules. | [AGENTS.md](../../AGENTS.md), [HARNESS.md](../HARNESS.md). |
| `Agentic Coding/Project Setup/Repo Setup Checklist.md`, `Project AGENTS.md Generation Guide.md`, `Project AGENTS.md Template.md` | Adopt a compact project-local instruction file with real read-first paths and commands. Avoid duplicating the whole vault playbook. | [AGENTS.md](../../AGENTS.md), [repository structure](repository-structure.md), [QA commands](../QA_COMMANDS.md). |
| `Agentic Coding/Templates/` task, acceptance, QA, security, UI, approval, lesson, handoff, scorecard templates | Adapt the useful fields; keep only KAY-specific gates. Do not create a template file for every possible role. | [Planning guide](../03-planning/README.md), [SECURITY_CHECK.md](../SECURITY_CHECK.md), [AGENT_LESSONS.md](../AGENT_LESSONS.md). |
| `Agentic Coding/Harness/Workflow Pack.md`, `Project Setup/Workflow Pack Manifest.md`, `Prompts/Colleague Prompt Pack.md`, `Vibe Coding Workflow.md` | Reference for onboarding and sprint framing; no separate KAY prompt pack needed. | [Harness](../HARNESS.md), [planning](../03-planning/README.md). |
| The Codex plugins and skills note and `Agentic Coding/Claude AI Setup.md` | Tool-specific personal setup; do not turn it into required KAY dependencies. | Not imported. |

## Conflict resolution: KAY wins

- KV often recommends cursor pagination; KAY confirmed numbered pagination with Previous/Next. Keep the [API contract](../04-design/api-contracts.md).
- KV describes JWT revocation and provider identity linking. KAY chose manually created accounts and revocable seven-day PostgreSQL sessions, without MFA, SMTP, or email verification in the core.
- KV's general private-file example uses storage presigned URLs. KAY's confirmed route uses temporary permits and FastAPI-mediated transfer to private Spaces for 20 MB files.
- KV discusses multi-tenant SaaS, Kafka, Redis, Kubernetes, payment processors, and AI product agents. KAY's core is one team, PostgreSQL jobs/outbox, commission records, and no product AI feature.
- KV's generic examples may use other currencies or time zones. KAY uses MAD and `Africa/Casablanca`.

If a future source note suggests a better choice, record an explicit proposal with affected requirements, model, API, security, tests, and rollout path in the [decision register](../../decisions.md). Until approved, it remains research, not a hidden change to KAY's contract.
