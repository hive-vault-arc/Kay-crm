# Try Number Three

Date: 2026-10-15  
Status: complete set of nine static screen proposals for Khalid's review

All nine screen counterparts from Actual are present. This completes the requested picture set, not an expansion to every route or state of the CRM.

| Screen | Picture | Treatment |
|---|---|---|
| Login | [Open](01-login.png) | Existing Try Three picture retained unchanged: approved villa/fading background and discreet support/security/privacy footer. |
| Dashboard | [Open](02-dashboard.png) | Approved Try Two picture copied unchanged, including the city header, colored KPIs and two multicolored pipelines. |
| Leads / Deals list pattern | [Open](03-leads-and-deals-list.png) | New compact Leads example; the entire Tous / Nouveaux / À relancer / Qualifiés shortcut row is removed. |
| Create / Edit Lead pattern | [Open](04-create-or-edit-lead.png) | Existing Try Three picture retained unchanged: white/beige section backgrounds and small colored icons. |
| Lead Details | [Open](05-lead-details.png) | Existing Try Three picture retained unchanged: thin colored status navigation and vertically stacked information. |
| Visits calendar | [Open](06-visits-calendar.png) | Approved Try Two picture copied unchanged. |
| Projects | [Open](07-projects.png) | Existing Try Three correction retained unchanged: compact category/filter toolbar, right-aligned pagination and neutral white cards. |
| Project Details / Units | [Open](08-project-details.png) | New compact refinement of the approved layout: smaller thumbnail, shallow summary strip and tighter spacing. |
| All Users | [Open](09-all-users.png) | New compact refinement: combined heading metadata and denser table spacing; existing colors retained. |

The list/form filenames represent the shared visual patterns from the original nine source screenshots; their rendered examples are Leads, not additional invented Deals screens. Lead creation and deal creation remain separate actions.

## Final-pass decisions

All Users keeps the existing role/status colors, account records, activity dates, actions, filters and pagination. The oversized heading region and separate metadata row are consolidated; table spacing is tighter. Density changes serve account scanning without introducing new cards, statistics or permission behavior.

Project Details keeps its Units tab, hierarchy, filters, six sample units, types, offering prices and whole-programme review notice. The thumbnail and summary strip use less height, and the table starts higher. Types remain reusable templates rather than transactable inventory. The monthly rental remains 7 500 MAD and its twelve-month equivalent 90 000 MAD.

The Leads list goes directly from its title to search/filter controls and then the table. The removed shortcut row is not replaced by another chip or KPI row. The ordinary Statut filter and colored status column remain, as do the eight sample records, column controls and pagination. This does not remove or alter the separate Lead Details status selector.

No dedicated Leads-list screenshot was present in the inspiration folder when checked. The table in [the available lead-detail reference](<C:/Users/khali/Desktop/Fixing the UI/inspiration/lead or deal detail 2.png>) informed its flat, aligned table treatment only; KAY's identity and existing list data were preserved. This historical desktop reference is not required by the portable approved-v3 implementation guide.

The image-generation and design-system-ops skills guided targeted raster edits and shared spacing/control geometry. KAY's existing ivory, white, charcoal, beige and restrained gold foundation remains intact. No global tokens, original branding files or CRM source code were edited.

## Earlier Try Three decisions retained

Login keeps the approved villa scene, fading ivory overlay, unboxed KAY logo and form composition. Its small footer reads Contacter le support, Sécurité du CRM and Confidentialité. These are proposed information/action labels, not certification, an audited security claim or an invented support address.

Create Lead retains its arrangement and synthetic content. The broad blue Contact and purple La demande heading surfaces are neutral white/beige; the small icons remain colored. The contact-mode selection is restrained neutral/gold, and the broad teal help surface is neutralized while its small teal icon remains.

Lead Details stacks Contact, La demande, Recherche principale, Prochaine action and Activité récente in one main column, with labels above values. There is no right-hand contact panel or two-up facts grid. Its taller full-page composition keeps text readable. Thin colored lines and labels replace the earlier large status chevrons; illustrative labels do not redefine backend states or bypass Create Deal.

Projects retains the correction that superseded the earlier rainbow-card treatment: Programmes / Biens indépendants shares a compact search/filter toolbar; the summary count is integrated into the heading; pagination is at bottom right. Six card bodies, category labels, count text and prices are neutral, while natural photos retain their colors.

## Generation, files and verification

The built-in image-generation tool produced three new density refinements in this final pass. Dashboard and Calendar are byte-for-byte copies from Try Two; the four existing Try Three pictures were not regenerated or changed.

Prompts and provenance:

- [Initial three-screen prompts](generation-prompts.json).
- [Earlier Projects correction prompt](projects-prompt.txt).
- [Final three-screen prompts](final-pass-prompts.json).
- [Manifest: dimensions, SHA-256 hashes and source preservation](manifest.json).

All nine pictures were visually inspected and all PNGs decode. The five added destination files match their source hashes. All nine Try Two pictures and the four pre-existing Try Three pictures match their pre-task SHA-256 hashes. Actual, inspiration, Try One, the source design-system bundle and the CRM code were not edited.

Native dimensions, without resizing or upscaling:

| Pictures | Dimensions |
|---|---|
| Login, Dashboard, Leads list, Calendar, Projects, Units, All Users | 1586 × 992 pixels |
| Create Lead | 1502 × 1047 pixels |
| Lead Details, taller full-page desktop composition | 1045 × 1505 pixels |

These are non-interactive concepts with synthetic data. Image generation cannot guarantee pixel-identical preservation in the three edited images. Exact copy, contrast, responsive layouts, keyboard behavior, support/privacy destinations, chart geometry and application behavior require implementation-time verification. No application tests or separate anti-slop audit were run.
