# First-administrator bootstrap and initial credentials

Status: SP-03 bootstrap/auth and SP-04 local staff administration implemented; actual administrator/handoff and deployment remain human operations
Date: 2026-10-14  
Confirmed decision: KAY will run a script manually on the deployed server to create the first administrator; there is no public bootstrap endpoint.  
Technical proposals: the one-time guard, hidden prompt, transaction, audit, and in-person staff handoff below resolve Q-04 at the design level.  
References: [C01 scope](../../core-scope.md), [decisions](../../decisions.md), [security](../04-design/security-and-privacy.md), [data model](../04-design/data-model.md), [API contract](../04-design/api-contracts.md), [acceptance tests](../05-quality/acceptance-tests.md), [release procedure](release-and-recovery.md), and [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Boundary

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

## Later staff accounts: Q-04 delivery policy

Administrators create later named `manager`, `agent`, or administrator accounts in the authenticated UI. The backend generates a cryptographically random temporary password with at least 128 bits of entropy, stores only its Argon2id hash, sets `must_change_password=true`, and expires the temporary credential after a proposed 24 hours. The new account starts as `pending_handoff`, so the temporary password alone cannot sign in yet. The plaintext is shown **once** to the creating administrator in a `Cache-Control: no-store` response; it is never retrievable later, emailed, logged, exported, or stored in browser persistence. If that display is lost or the credential expires, the administrator uses the existing reset operation after entering their own current password; the previous temporary credential and target sessions are invalidated.

For the initial release, the administrator hands the temporary credential **in person** to the named staff member after confirming their identity, without sending it by email, SMS, chat, or a document. The administrator then confirms the handoff through a dedicated action, which records only the recipient, actor, and time—not the secret—and activates the account. If an in-person handoff is impossible, the account stays `pending_handoff` until KAY approves a separate secure remote-delivery procedure; there is no implicit fallback channel. On first sign-in with a temporary credential, the backend permits only `GET /auth/me`, `POST /auth/change-password`, and logout. A successful password change clears the flag, revokes temporary sessions, and requires a new sign-in before CRM access. An expired temporary credential cannot create or continue a session.

## Required verification before use

Implement and test AT-37/38 with synthetic users and real PostgreSQL transactions: empty database succeeds once; concurrent or repeated scripts create exactly one administrator; non-TTY/weak/mismatched input fails; interruption leaves no partial user; existing users or a lost-admin state cannot be bootstrapped over; no password appears in process arguments, logs, output, audit, or fixtures. Verify the staff handoff's one-time response, `pending_handoff` denial, activation audit, 24-hour expiry, restricted first session, forced change, session revocation, and reset path. Record the real script command, environment, and successful evidence in [QA commands](../QA_COMMANDS.md) only when code exists.

## Local staff operation

After bootstrap and normal sign-in, an administrator opens Paramètres → Tous les
utilisateurs → Créer un utilisateur. Enter the named person's name/email/role;
there is no administrator-chosen initial staff password. Reveal the one-time
display privately only when needed. Do not copy it into a document, screenshot,
chat, clipboard automation or test report. Closing, changing windows or navigating
clears the app's transient display; GET cannot retrieve it.

Open the account and select Confirmer la remise only after an actual verified
in-person delivery. That person signs in, changes the temporary password, then
signs in freshly. Désactiver le compte revokes access but retains attribution.
To recover lost/expired credentials or reactivate a disabled account, use
Réinitialiser le mot de passe with your own current administrator password, then
repeat the handoff. Use Changer le mot de passe for your own account.

A stale account returns VERSION_CONFLICT; reload before a new action. A last-admin
disable/demotion returns LAST_ADMIN_REQUIRED; retain another active administrator
who has completed their final-password setup before retrying. An expiring
temporary administrator does not satisfy that safeguard. A lost create/reset
response cannot replay plaintext: locate the existing account by email and reset
with a new action, rather than create a duplicate or improvise remote delivery.

SP-03 local verification is recorded in its evidence. [SP-04 evidence](../03-planning/sprints/sp-04-evidence.md)
records actual staff test results/status. Synthetic handoff confirmation never
stands in for Khalid's real staff identity/delivery sign-off. Production access,
emergency recovery and remote delivery remain outside these local sprints.
