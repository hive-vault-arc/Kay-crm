# Independent-property listing fields — local implementation boundary

Owner source: `Guide_Mubawab_Champs_Obligatoires_Facultatifs.pdf`, supplied on
2026-10-22. This is a KAY CRM data-entry form inspired by the guide, **not** an
integration with Mubawab and not automatic publication. The owner confirmed all
nine property categories and holiday rental, a distinct holiday campaign slot,
MAD-only prices and protected contact phone numbers. The last two KAY rules
supersede the guide's EUR/USD and public-phone publication fields.

An independent property now has five short creation steps: property/initial
draft price, location, category-specific facts, amenities/description, review.
The form requires reference, positive MAD price, region, city, positive area,
and residential or holiday-specific counts when applicable. Land and farm omit
building floors/rooms/bathrooms; a room omits room and bedroom counts. Menus,
radio options and checkboxes expose the guide's bounded choices. Optional
Google Maps links are HTTPS and allowlisted to Google Maps hosts; the overview
opens the exact supplied link in a new tab. No third-party request is sent while
editing.

Migration `0031_property_listing_details` adds bounded JSONB property details,
extends independent-property categories and adds a third `holiday` offering kind
with day/week/month periods. Legacy rows receive `{}` and retain their existing
prices, sessions, files and history. An agent may create the first priced **draft**
offering atomically with the property, but later availability, owner and campaign
commands retain manager/administrator authority. Normal rental and holiday
rental can coexist; neither is annualized from a day/week price. Holiday-stay
dates, reservation overlaps, client deals/outcomes, payment, and Mubawab
publishing are not introduced by this slice. The deal link and outcome commands
reject holiday offerings until a dated-booking contract exists.

The guide's photo requirement applies to publication, not creation of a CRM
draft. KAY's separate private, scanned WebP photo flow remains capped at ten
per property after creation. The property and initial offer still use the
existing idempotency receipt, audit and version controls. Development, its unit
types and whole-development offerings retain their approved five categories and
sale/ordinary rental modes; new categories are independent only.

Design read: Operate for KAY's French-speaking agents in the existing Riviera
visual language, ENERGY 1 / RHYTHM 1 / MOTION 1. The five-step layout follows
the order in which an agent identifies, locates and describes a property; the
existing gold action and progress accent identifies the next task without
adding another palette. Existing shadcn controls and the KAY semantic Iconsax
layer carry the choices, with category-specific fields rather than a single
overwhelming grid. No new illustration, font, theme or navigation pattern was
introduced. Design-system-ops supplied the responsive system geometry;
Impeccable's Operate guidance and frontend-design/uncodixfy kept the current
brand and form hierarchy. The design-taste-frontend marketing workflow does
not apply to this operational multi-step CRM form. Antislop remains AFTER per
Khalid's choice; see [AFTER042](../../anti-slop/audit-042-2026-10-22.md).

Technical verification uses only the synthetic isolated database. Migration
0031 is at head and `alembic check` reports no missing operations; 79 focused
PostgreSQL cases, 291 pure backend cases, 76 frontend unit cases, static checks,
and the production-mode Next.js build pass. Headed Chrome verifies creation of
a holiday riad, exact Maps link, priced draft, and a 320 px land form without
overflow. PostgreSQL tests verify that standard and holiday rental slots
coexist and that holiday offers cannot link to undated deals. Existing inventory Chrome
journeys pass 7/7; the revised desktop/mobile creation review and dynamic
land/commercial review pass individually. The combined review run hit an
intermittent 180-second timeout; its first case passed alone on rerun. Product
and external-publisher approval remain Khalid's decision. Development and
production databases have not been migrated by this work.
