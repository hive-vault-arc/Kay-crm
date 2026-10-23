# KAY help centre

Owner request,2026-10-23: inspect AkarFlow's Help implementation as a reference,
then provide detailed French agent documentation inside KAY, with Aide directly
above the signed-in identity at the bottom of the sidebar. Local work only;
no commit, push, PR or deployment. The existing local card/form refinements and
unrelated primary-checkout changes remain intact. AkarFlow is read-only here.

## Scope and content

The reference's searchable categories, practical articles and related guides are
adapted to KAY's actual UI and business rules, not AkarFlow's contact/listing/deal
model, support service or brand. No cross-project business data is used.

`/help` offers local accent/case-insensitive keyword and full-content search,
category filters with matching counts and an empty-state reset. `/help/{slug}`
has a stable article URL, numbered action steps, explanations/cautions, native
section anchors, contextual internal links and role-filtered related reading.
The search is not a business-edit form and does not mark live records dirty.
No question text is sent to a provider or persisted in browser storage.

There are31 original KAY guides:28 available to agents,30 to managers and31 to
administrators. Categories cover first use/privacy, prospects/deals/history,
properties/forms/Maps/prices/photos/owners/programmes, visits/tasks/notifications/
documents, management and troubleshooting. Import/export and attribution guides
are M/A-only; account administration is administrator-only. The current inbox-only
notification choice is explicit: no VAPID, SMTP, email or closed-CRM system alert
setup is required or promised. Generated PDFs are described as internal
preparations, not validated or signed contracts.

Content lives in typed static feature modules. When a field, workflow, label,
permission or limit changes, update its guide alongside the implementation and
keep the catalog/link/search checks passing. Source checks include current
permissions, task/reminder and scheduling contracts/commands, lead/deal forms and
histories, project-link commands, inventory creation/edit/pricing/owner/photo
components and generated-document contracts. Older screen-map entries do not
override the latest implemented property wizard or agent photo-upload grant.

## Security and boundaries

Both page routes require the current revocable identity and the normal mandatory
password-change gate. The server filters the catalog before passing it to the
client and rejects an unknown or role-ineligible article with notFound. Search
cannot reveal an omitted administrative article. Next's streamed notFound may
send HTTP200; the missing-page UI and noindex metadata are the relevant rendered
checks, alongside absence of article content/actions. This does not grant any
access to the actual administrator APIs.

Login returns add only `/help` and a bounded lowercase single-segment guide path;
external, encoded, traversal and query-bearing targets remain rejected. Plain
React strings, rather than HTML/Markdown injection, render the guides. Static
instructions contain no client examples, records, credentials or support sender.
Action links navigate to existing routes; ordinary record/API authorization
remains authoritative. No new backend endpoint, database entity, migration,
dependency, credential delivery or production operation is introduced.

## Design and responsive behaviour

Design-system-ops and the installed UI skills preserve Riviera, semantic tokens,
shadcn controls and existing Iconsax information/category/action assets. The
dense authenticated help workspace is outside design-taste's marketing workflow.
Impeccable Operate reuses the current world and its inherited metadata boundary;
antislop remains AFTER. No chart, new theme, raster or decorative animation.

The directory uses a desktop category rail and readable topic lists; mobile uses
a labeled category selector. Articles use a reading measure only on prose, with
a useful contents/action rail, not a capped page frame. Footer Aide supports
expanded/collapsed states and active styling. Mobile navigation closes and
focuses the new heading after a Help selection.

The extra44px footer action exposes a real fit failure at720px height. The
existing short-desktop drawer switch moves from42rem to44rem, with compact
short-window spacing/footer padding and a smaller brand; targets are not
shrunk and the desktop rail is not made scrollable. Existing shell regression
cases are updated to verify both sides of that content-driven boundary.

## Isolated verification ports

AkarFlow was already listening on8100/3100 during this task. Its processes were
identified read-only and left running. KAY's guarded browser harness now accepts
four validated, distinct high loopback ports through `KAY_E2E_API_PORT`,
`KAY_E2E_FRONTEND_PORT`, `KAY_E2E_CONTROL_PORT` and `KAY_E2E_SIMULATOR_PORT`.
Defaults remain8100/3100/8101/8102. This task uses8110/3110/8111/8112 with the
existing owned55439 synthetic PostgreSQL cluster and test-only lease. Hostnames,
TLS/CA checks, exact frontend Origin, fixture guards and the exclusive DB lease
are unchanged. Bad, privileged, malformed and duplicate ports are rejected.

Verification commands, actual results and remaining limits are recorded in the
[QA register](../QA_COMMANDS.md). This is local technical evidence, not product
approval or a production/full-product acceptance claim.

Final local results:99 unit tests,19 authentication tests,12 visible Chrome
Help/shell checks and the production build pass. The corrected mobile capture
check also passes separately (1/1). Desktop/article/mobile/native200% captures
are inspected. Documentation validation passes1214 links and `git diff --check`
passes. Owned synthetic PostgreSQL/ClamAV services are stopped after verification;
the unrelated AkarFlow application is left untouched. No migration or push.
