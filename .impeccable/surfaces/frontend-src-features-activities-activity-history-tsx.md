---
version: 1
slug: "frontend-src-features-activities-activity-history-tsx"
primary_target: "frontend/src/features/activities/activity-history.tsx"
related_targets: ["frontend/src/features/activities/activity-form.tsx","frontend/src/features/contacts/lead-record.tsx","frontend/src/features/deals/deal-record.tsx"]
---

# Scoped Lead/Deal histories

Mode: Operate. KAY staff read original client exchanges and append immutable
notes without mixing Lead origin with the Deal's current activity.

Keep the current Riviera identity and existing record-stack, shadcn DataTable,
NativeSelect, Buttons and semantic Iconsax. ENERGY1/RHYTHM1/MOTION1. Full-width
sections and named table-only horizontal scrolling retain readable note columns
at compact widths. Inline creation focuses the note; cancel returns focus.
Date/author are server captured. Project labels describe an exchange, not stock.

There is one table on a Lead and an independent own/origin pair on a converted
Deal. Origin is read-only here; actual backend authority governs all reads,
counts, replay and creation. No history copying, invented context or external
send. Tables expose every authorized value as text, with numbered filtering,
loading/empty/unavailable/retry and archive states.

Owner supplied example screenshots authorize this functional extension, not
their customer data, brand, stage names or destructive controls. Antislop stays
AFTER. Scope/proposals/actual verification and pending development rollout are
in docs/03-planning/lead-deal-activities.md. Final product review remains Khalid's.
