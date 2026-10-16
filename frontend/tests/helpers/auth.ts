import { test as base, expect, type Page, type TestInfoError } from "@playwright/test";
import { testControl } from "./api-process";

export type TestActor = { id: string; email: string; password: string };
export async function createActor(role = "administrator", restricted = false, display_name?: string) {
  return await testControl("fixture", { action: "create", role, restricted, display_name }) as TestActor;
}
export async function removeActor(actor: TestActor) {
  await testControl("fixture", { action: "delete", id: actor.id });
}
export async function changeActor(actor: TestActor, action: "revoke" | "expire" | "role") {
  await testControl("fixture", { action, id: actor.id });
}

export async function clearActorContext(page: Page) {
  // Detach monitors/reads before changing credentials outside the application's UI.
  await Promise.all(page.context().pages().map(current => current.goto("about:blank")));
  await page.context().clearCookies();
}

export async function signIn(page: Page, actor: TestActor, returnTo?: string) {
  const path = returnTo ? `/login?return_to=${encodeURIComponent(returnTo)}` : "/login";
  const origin = page.url().startsWith("https:") ? new URL(page.url()).origin : undefined;
  await page.goto(origin ? new URL(path, origin).href : path);
  await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeEnabled();
  try {
    await page.getByLabel("Adresse e-mail", { exact: true }).fill(actor.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(actor.password);
  } catch { throw new Error("SYNTHETIC_LOGIN_INPUT_FAILED"); }
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  // Poll a primitive: page matchers can attach secret-bearing input snapshots.
  await expect.poll(() => /\/(dashboard|leads|deals|visits|projects|change-password)$/.test(page.url())).toBe(true);
  await page.waitForLoadState("load");
  await expect(page.getByRole("button", { name: "Se déconnecter", exact: true })).toBeEnabled();
  if (new URL(page.url()).pathname === "/dashboard")
    await expect(page.getByText("Service local disponible", { exact: true })).toBeVisible();
}

export function removeInputSnapshots(errors: readonly TestInfoError[]) {
  for (const error of errors) {
    delete error.errorContext;
    if (error.cause) removeInputSnapshots([error.cause]);
  }
}

export const test = base.extend<{ actor: TestActor; privacy: void }>({
  privacy: [async ({ page }, run, info) => {
    try { await run(); } finally {
      // Matcher snapshots are separate from PLAYWRIGHT_NO_COPY_PROMPT's AI snapshot.
      removeInputSnapshots(info.errors);
      if (!page.isClosed()) await page.locator('input[type="password"], [data-private-credential]').evaluateAll((fields) => {
        for (const field of fields) (field as HTMLInputElement).value = "";
      }).catch(() => {});
    }
  }, { auto: true }],
  actor: async ({}, run) => {
    const actor = await createActor();
    try { await run(actor); } finally { await removeActor(actor); }
  },
});
export const signedInTest = test.extend<{ signedIn: void }>({
  signedIn: [async ({ page, actor }, run) => { await signIn(page, actor); await run(); }, { auto: true }],
});
export { expect };
