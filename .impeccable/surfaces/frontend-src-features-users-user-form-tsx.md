# Staff accounts

Primary target: `frontend/src/features/users/user-form.tsx`.
Related: user-actions.tsx, user-list.tsx and password-field.tsx in the same module.
Mode: Operate. Preserve KAY Riviera, existing shadcn controls, semantic Iconsax,
form reading width, spacing tokens and mobile single-column layout.

Owner request: administrator chooses/reveals an initial password; immediate
restricted login leads to the agent choosing a different password. No activation
or handoff button. Delete removes access/list visibility, not authored CRM history.
Existing staff credentials are not changed. No automatic credential messaging.

Acceptance: labeled show/hide control, no secret in responses/storage/evidence,
clear confirmation and recovery, safe retry, keyboard/mobile/zoom and denied states.
Antislop remains AFTER; no unrelated aesthetic changes.
