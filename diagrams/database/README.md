# KAY CRM database pictures

Status: generated and visually reviewed documentation artifact; full CRM schema remains partly proposed  
Date: 2026-10-14  
Confirmed styling: Khalid approved KAY ivory, charcoal and gold for these diagrams.  
Source of truth: [data model](../../docs/04-design/data-model.md), [business rules](../../docs/02-requirements/business-rules.md), [identity ORM](../../backend/app/identity/models.py), [contact ORM](../../backend/app/contacts/models.py) and [KAY tokens](../../branding/kay-ui-tokens.json).

## Pictures and editable sources

| Model | High-resolution picture | Editable vector |
|---|---|---|
| MCD, conceptual business entities and cardinalities | [PNG, 5376 × 8192](kay-mcd.png) | [SVG](kay-mcd.svg) |
| MLD, relational tables and selected keys | [PNG, 5376 × 14400](kay-mld.png) | [SVG](kay-mld.svg) |

[Combined standalone HTML](kay-data-models.html) contains both inline SVGs and navigation between them. All diagram content and CSS is local; its only external resources are the skill's Google Fonts stylesheet/fonts. PNG pictures work offline. Standalone SVGs have local font fallbacks.

The full-resolution pictures are atlases. Zoom into a domain, or use the individual pictures below. The diagram-design complexity limit is respected per domain: at most eight entities and twelve associations. Domain splitting prevents an unreadable 50-table network.

## MCD domain pictures

- [Contacts and commercial relationships](details/mcd-01.png)
- [Development hierarchy and reusable types](details/mcd-02.png)
- [Deals, holds and optional finance](details/mcd-03.png)
- [Requirements, matching and activity](details/mcd-04.png)
- [Visits and administrator-controlled schedule](details/mcd-05.png)
- [Protected documents and scoped file access](details/mcd-06.png)
- [Import and website-form intake](details/mcd-07.png)

## MLD domain pictures

- [Identity and access](details/mld-01.png)
- [Contact identity and responsibility](details/mld-02.png)
- [Developments and physical inventory](details/mld-03.png)
- [Legal owners and sale/rental offerings](details/mld-04.png)
- [Requirements and shortlists](details/mld-05.png)
- [Deals, reservations and outcomes](details/mld-06.png)
- [Visit calendar and dynamic working times](details/mld-07.png)
- [Activity, tasks and durable background work](details/mld-08.png)
- [Private documents and temporary file access](details/mld-09.png)
- [Optional commissions and collection ledger](details/mld-10.png)
- [Atomic import, website intake and retry safety](details/mld-11.png)

## Meaning and scope

MCD cardinalities use Merise participation at each entity end: 1..1 required single, 0..1 optional single, 1..N one or more, 0..N zero or more. For example, Contact 0..N / Enquiry 1..1 means that a contact may have many enquiries and each enquiry belongs to one contact. Business associations such as collaboration, ownership and shortlisting become link tables in the MLD.

MLD field prefixes are # for primary key and → for foreign key; ? marks nullable. The right column gives a type or referenced table/column. Lines show principal parent/child associations, not an exhaustive list of every foreign key. Reference boxes repeat the same table across domains, not duplicate tables.

The MLD includes every table in the documented dictionary plus the implemented login_rate_bucket and user_command_receipt: **50 distinct tables**. At source inspection, 14 tables were present in the reviewed identity/contact ORM and migrations; 36 are proposed. Existing tables have solid borders; proposals have longer dashes; cross-domain references have shorter dashes. Table existence does not mean every related workflow is implemented. This artifact is not live database introspection.

Selected fields and keys for unimplemented tables are visualization proposals derived from the contracts, not approved executable DDL. Grouped labels such as start_at / end_at abbreviate separate fields. Some typed task/visit/timeline/resource context links are summarized; their exact columns belong in reviewed migrations. No speculative outbox-to-job foreign key is asserted. Composite keys, join tables and rate buckets are exceptions to the common business-column convention.

Critical guards remain explicit: offering target XOR, typed document parent XOR, active phone uniqueness, one active reservation without automatic expiry, project/unit overlap locks, dynamic visit policy, exact MAD decimals, optional commission, linked corrections, atomic import, retry deduplication and immutable authorship. The full textual contract remains authoritative; a picture does not replace it.

## Verification performed

- Playwright CLI 0.1.22 rendered the standalone artifact in an isolated Chrome context at device scale 2.
- All 18 domain views were checked for clipped entity text, insufficient field-column gaps, label/node collisions, label/label collisions and relationship segments crossing unrelated nodes: **zero remaining issues**.
- Geist, Geist Mono and Instrument Serif were loaded successfully. Full atlases and representative inventory, scheduling and finance detail exports were visually inspected.
- Both SVGs parse as XML and exactly match the inline sources in HTML.
- Every documented dictionary table is represented; every explicit FK target resolves in the 50-table inventory.
- Both complete PNG dimensions and all 18 individual domain PNGs were verified.
- The skill taste gate passes: clean ivory paper, no shadows, two focal entities across each atlas, masked labels drawn after lines, cardinalities, bottom legends, 4 px geometry and bounded domain complexity.

These are diagram checks, not application tests. No database connection, migration, seed, credential read, schema mutation or application-code change was performed.

## Source and rendering files

[model-spec.json](model-spec.json) records the selected content, sources and scope. The SVG/HTML files are the editable visual sources. Styling follows the KAY-specific Custom tokens section added to the diagram-design skill's style guide after Khalid's explicit palette approval; other projects retain their own skin.

For the same local workspace, the preview helper serves only this generated HTML at 127.0.0.1:43873. Start it from the project root:

```powershell
node diagrams/database/preview.cjs
npx --yes --package @playwright/cli@0.1.22 playwright-cli -s=kay-database-diagrams open http://127.0.0.1:43873/ --browser chrome --config diagrams/database/playwright.config.json
npx --yes --package @playwright/cli@0.1.22 playwright-cli -s=kay-database-diagrams run-code --filename diagrams/database/render-checks.cjs
npx --yes --package @playwright/cli@0.1.22 playwright-cli -s=kay-database-diagrams close
```

Stop the preview helper when finished. The export paths in render-checks.cjs are scoped to this laptop's KAY folder; adapt them deliberately if moving the artifact. Rendering requires no CRM server, account, database or Python environment.
