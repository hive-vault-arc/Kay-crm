# First-administrator bootstrap and initial credentials

Status: bootstrap unchanged; D37 replaces staff activation/handoff with admin-chosen passwords. Local implementation evidence is recorded separately; real credential delivery/deployment remain human operations.
Date: 2026-10-14  
Confirmed decision: KAY will run a script manually on the deployed server to create the first administrator; there is no public bootstrap endpoint.  
Technical proposals: bootstrap guard, hidden prompt and transaction remain; D37 supersedes the earlier in-person activation policy.
References: [C01 scope](../../core-scope.md), [decisions](../../decisions.md), [security](../04-design/security-and-privacy.md), [data model](../04-design/data-model.md), [API contract](../04-design/api-contracts.md), [acceptance tests](../05-quality/acceptance-tests.md), [release procedure](release-and-recovery.md), and [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Boundary

### DigitalOcean first-user convenience script

The owner's2026-10-16 request adds `backend/create_first_admin.py`, preset to
`itteam@kayrealestate.ma`. It calls the same guarded bootstrap, always creating
the `administrator` role, not a direct SQL insert or an existing-user reset.
The display name is prompted. The password and its confirmation use hidden TTY
input only, never source, command arguments, environment or deployment logs.
Use a fresh private password rather than one previously shared in chat.

After the required schema migrations have been approved/applied, open the API
component's private interactive Console. From `/workspace/backend`, with the
existing private production configuration and verified database TLS, run:

```sh
./.heroku/python/bin/python create_first_admin.py
```

Enter the display name and then the password twice. A terminal that cannot
disable echo is refused. No automatic startup hook runs this script. It creates
the user only on an uninitialized installation; `ALREADY_INITIALIZED`,
`MANUAL_RECOVERY_REQUIRED` and `MIGRATION_REQUIRED` retain their existing meaning.
It does not run or bypass migrations, create a public registration route or
connect to production during automated tests. The original generic
`python -m app.cli.bootstrap_admin` command still prompts for the email too.

The later [production settings support](production-settings-ci.md) permits the
existing managed Python runtime for bootstrap only with explicit production
configuration and verified PostgreSQL TLS. It does not run bootstrap, seed an
administrator or replace the TTY/one-time transaction rules below. Automated
integration/fixture commands must never target that production database.

For approved local SP-03, run and test this same interactive script on the laptop's local API installation through backend/.venv after local migrations. The deployed-host references describe its later operational location, not a deployment prerequisite for the local sprint. Synthetic automated TTY cases use isolated databases; no hardcoded default administrator is added. Real staff handoff approval remains a separate human event.

The first administrator cannot be created by `POST /users`, because that operation already requires an administrator. SP-03 provides the one-time, **server-local** script at `backend/app/cli/bootstrap_admin.py`. From `backend/`, after inspection and `scripts/kay.ps1 -Task migrate`, run `scripts/kay.ps1 -Task bootstrap` (equivalent to `.venv/Scripts/python.exe -m app.cli.bootstrap_admin`) in an interactive terminal. Do not supply a password in the command, environment, file, pipe or chat. The name/email prompts are visible; the two password prompts are hidden. The script fails closed if hidden input is unavailable. Local synthetic verification is recorded in [SP-03 evidence](../03-planning/sprints/sp-03-evidence.md); deployment and actual first-administrator execution remain separate human operations. No public setup route, default account/password, credential migration or startup seed exists.

The intended first administrator runs the script themselves from a trusted interactive shell on the deployed API host/container **after** the database schema and the single KAY agency record exist, but **before** staff access opens. The script uses the deployed backend's configured PostgreSQL connection and the same identity service/Argon2id password hasher as normal sign-in. Access to that shell and database must already be limited to authorized deployment operators. No production access or secret is requested by this document.

## Script contract

1. Require an interactive TTY. Prompt for the intended administrator's display name and normalized sign-in email, then prompt twice for their chosen final password with terminal echo disabled. The password must meet the existing twelve-character minimum. Reject empty/mismatched values. Never accept a password as a CLI argument, environment variable, file, or piped stdin; never print it.
2. In a single PostgreSQL transaction, lock the singleton agency/setup row, then require **zero user records** and no previous bootstrap completion. Create exactly one active `administrator` user and Argon2id credential, with `must_change_password=false` because the intended administrator chose and retained their own final password. Record an audit event with the operator identity, target user ID, deployment version, and time, but no password or hash in log messages. Commit user, credential, and audit together.
3. On success, print only a non-secret confirmation and user ID. A repeat run after commit exits `ALREADY_INITIALIZED` without changing credentials. If users already exist but no active administrator exists, exit `MANUAL_RECOVERY_REQUIRED`; never treat absence of an administrator as permission to create another. If interrupted before commit, no partial account remains; if the success message is lost after commit, the repeat run still makes no change.
4. Disable the bootstrap path in ordinary application deployment/HTTP access. Do not use this script to reset an existing administrator, bypass role checks, or recover a lost password. Any later emergency recovery needs a separately reviewed, audited procedure.

The bootstrap operator and first administrator are the same person, so **no initial secret is delivered** to someone else. The first administrator verifies sign-in with their chosen password through the normal Vercel facade before creating staff accounts. A restore exercise must verify that the completed account and audit event persist and that replay does not create a second administrator.

## Later staff accounts: D37 setup policy

Administrators create named manager, agent or administrator accounts with an initial password they choose (12–1024 characters, not only spaces). The form masks it and offers deliberate reveal before submission. Only an Argon2id hash persists; the API returns safe user metadata, never the password. Accounts are active immediately, with a24-hour initial-password expiry and mandatory password change. There is no activation/handoff confirmation. The administrator privately distributes the chosen credential; KAY does not automatically send email/SMS/chat or copy it elsewhere.

First sign-in permits only own profile, password change and logout. The recipient chooses a different own password, then signs in freshly before CRM access. Expired initial credentials cannot create/continue sessions. Existing staff passwords, flags and sessions are unchanged. Existing legacy pending/disabled accounts remain unchanged until an explicit administrator reset; deleted accounts cannot reset or sign in.

## Required verification before use

Verify unchanged AT-37 bootstrap guards and D37 / AT-01/02/23/38 with synthetic PostgreSQL users: chosen initial/reset password, immediate restricted login, own-password change/fresh login, expiry, admin-current-password reset, role/current-version denial, safe same-key retries and atomic rollback. Deletion must revoke/hide access while preserving CRM attribution and last-final-admin protection. No password may appear in responses, receipts, logs, screenshots or reports. [Current evidence](../03-planning/staff-onboarding-deletion.md).

## Local staff operation

After bootstrap and normal sign-in, an administrator opens Paramètres → Tous les
utilisateurs → Créer un utilisateur. Enter name/email/role and choose the initial
password. Reveal privately only when needed, then distribute it privately.
Successful submission clears the form's secret state; GET cannot retrieve it.
Do not preserve credentials in repository files, screenshots, logs or test reports.

The person signs in immediately, chooses their own password and signs in freshly.
Supprimer l’utilisateur requires confirmation, removes access/list visibility and
retains identity and CRM history. It is not a physical purge. To recover a lost/
expired initial credential or a nondeleted legacy disabled account, choose a
replacement through Réinitialiser le mot de passe and confirm with your own
current administrator password. Use Changer le mot de passe for your own account.

A stale account returns VERSION_CONFLICT; reload before a new action. A last-admin
delete/demotion returns LAST_ADMIN_REQUIRED; retain another active administrator
who has completed their final-password setup before retrying. An expiring
temporary administrator does not satisfy that safeguard. After an uncertain
create/reset response, retry the unchanged intent/key: only safe metadata is
replayed, never a second credential change. Historical secret-issued receipts
retain a safe conflict; use an explicit reset if needed, not a duplicate account.

SP-03 local verification is recorded in its evidence. [SP-04 evidence](../03-planning/sprints/sp-04-evidence.md)
records historical staff test results, not the replacement flow. The current
ledger records D37 tests and local migration approval. Production access,
emergency recovery and automated external delivery remain outside this change.
