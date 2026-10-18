import { randomBytes, randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { clearActorContext, test, expect, signIn, createActor, removeActor, type TestActor } from "../helpers/auth";
import { testControl, apiProcess } from "../helpers/api-process";

async function privateFill(page: Page, label: string, value: string) {
  try { await page.getByLabel(label, { exact: true }).fill(value); }
  catch { throw new Error("PRIVATE_TEST_INPUT_FAILED"); }
}
async function deniedLogin(page: Page, actor: TestActor) {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeEnabled();
  await privateFill(page, "Adresse e-mail", actor.email);
  await privateFill(page, "Mot de passe", actor.password);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect.poll(async () => await page.getByRole("alert").count()).toBe(1);
  await expect.poll(async () => await page.getByLabel("Mot de passe", { exact: true }).inputValue() === "").toBe(true);
}
async function confirm(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name, exact: true }).click();
}

test("Staff: admin-chosen password, immediate restricted login, own password and deletion", async ({ page, actor, browser, baseURL }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const recipient = await context.newPage();
  let staff: TestActor | undefined;
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("ADMIN_PAGE_ERROR"));
  recipient.on("pageerror", () => errors.push("RECIPIENT_PAGE_ERROR"));
  try {
    await signIn(page, actor); await page.goto("/settings/users/new");
    await expect(page.getByRole("button", { name: "Créer le compte", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Créer le compte", exact: true }).click();
    await expect(page.getByText("Saisissez le nom complet.", { exact: true })).toBeVisible();
    await page.getByLabel("Nom complet", { exact: true }).fill("Personnel synthétique de contrôle");
    const email = `sp03-${randomUUID().replaceAll("-", "")}@example.com`;
    const temporary = randomBytes(24).toString("base64url");
    await privateFill(page, "Adresse e-mail", email);
    await privateFill(page, "Mot de passe initial", temporary);
    await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
    expect(await page.locator("[data-private-credential]").getAttribute("type") === "text").toBe(true);
    await page.getByRole("button", { name: "Masquer le mot de passe", exact: true }).click();
    const pending = page.waitForResponse(r => r.url().endsWith("/api/v1/users") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Créer le compte", exact: true }).click();
    const response = await pending;
    const result = await response.json();
    if (response.status() !== 200 || !result.user?.id || Object.keys(result).join() !== "user" || result.user.state !== "active") throw new Error("SAFE_CREATE_RESPONSE_INVALID");
    staff = { id: result.user.id, email, password: temporary };
    expect(response.headers()["cache-control"]).toBe("no-store");
    await expect(page.getByRole("status").filter({ hasText: "Compte créé et actif" })).toBeVisible();
    expect(await page.locator("[data-private-credential]").count()).toBe(0);
    const detail = await page.request.get(`/api/v1/users/${staff.id}`);
    if ((await detail.text()).includes(temporary)) throw new Error("GET_EXPOSED_INITIAL_PASSWORD");
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    await page.getByRole("link", { name: "Gérer le compte", exact: true }).click();
    await expect(page.getByRole("button", { name: "Supprimer l’utilisateur", exact: true })).toBeVisible();
    expect(await page.getByRole("button", { name: /Confirmer la remise|Désactiver le compte/ }).count()).toBe(0);
    await signIn(recipient, staff);
    expect(new URL(recipient.url()).pathname).toBe("/change-password");
    expect((await recipient.request.get("/api/v1/users")).status()).toBe(403);
    const final = randomBytes(24).toString("base64url");
    await privateFill(recipient, "Mot de passe actuel", temporary);
    await privateFill(recipient, "Nouveau mot de passe", final);
    await privateFill(recipient, "Confirmer le nouveau mot de passe", final);
    await recipient.getByRole("button", { name: "Changer le mot de passe", exact: true }).click();
    await expect.poll(() => recipient.url().endsWith("/login?changed=1")).toBe(true);
    staff.password = final; await signIn(recipient, staff);
    await confirm(page, "Supprimer l’utilisateur");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/settings/users");
    await expect(page.getByRole("table")).toBeVisible();
    expect(await page.getByRole("link", { name: "Personnel synthétique de contrôle", exact: true }).count()).toBe(0);
    expect((await recipient.request.get("/api/v1/auth/me")).status()).toBe(401);
    expect((await page.request.get(`/api/v1/users/${staff.id}`)).status()).toBe(404);
    await clearActorContext(recipient); await deniedLogin(recipient, staff);
    expect(errors).toEqual([]);
  } finally { await context.close(); if (staff) await removeActor(staff); }
});

test("Staff: existing password unchanged, reset requires admin password, expiry and recovery", async ({ page, actor, browser, baseURL }) => {
  test.setTimeout(120_000);
  const target = await createActor("manager");
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const staff = await context.newPage();
  try {
    await signIn(page, actor); await signIn(staff, target);
    await page.goto(`/settings/users/${target.id}/edit`);
    await expect(page.getByLabel("Nom complet", { exact: true })).toBeEnabled();
    expect(await page.getByLabel("Mot de passe initial", { exact: true }).count()).toBe(0);
    expect((await staff.request.get("/api/v1/auth/me")).status()).toBe(200);
    await clearActorContext(staff); await signIn(staff, target);
    let temporary = randomBytes(24).toString("base64url");
    await page.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await privateFill(page, "Nouveau mot de passe initial", temporary);
    await privateFill(page, "Votre mot de passe administrateur", randomBytes(24).toString("base64url"));
    await dialog.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(await page.getByLabel("Votre mot de passe administrateur", { exact: true }).inputValue() === "").toBe(true);
    await privateFill(page, "Votre mot de passe administrateur", actor.password);
    await dialog.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect((await staff.request.get("/api/v1/auth/me")).status()).toBe(401);
    await testControl("fixture", { action: "expire-temporary", id: target.id });
    await clearActorContext(staff); await deniedLogin(staff, { ...target, password: temporary });
    temporary = randomBytes(24).toString("base64url");
    await page.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).click();
    await privateFill(page, "Nouveau mot de passe initial", temporary);
    await privateFill(page, "Votre mot de passe administrateur", actor.password);
    await dialog.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(await page.locator("[data-private-credential]").count()).toBe(0);
    await signIn(staff, { ...target, password: temporary });
    expect(new URL(staff.url()).pathname).toBe("/change-password");
  } finally { await context.close(); await removeActor(target); }
});

test("Staff: direct role denial, copied settings URLs, origin and CSRF", async ({ page, actor }) => {
  await signIn(page, actor);
  const me = await (await page.request.get("/api/v1/auth/me")).json();
  const body = { display_name: "Test synthétique", email: `sp03-${randomUUID().replaceAll("-", "")}@example.com`, role: "agent", temporary_password: randomBytes(24).toString("base64url") };
  const invalidHeaders: Record<string, string>[] = [{ Origin: "https://foreign.example", "X-CSRF-Token": String(me.csrf_token) }, { Origin: new URL(page.url()).origin }];
  for (const headers of invalidHeaders) {
    expect((await page.request.post("/api/v1/users", { headers: { ...headers, "Idempotency-Key": randomUUID() }, data: body })).status()).toBe(403);
    expect((await page.request.delete(`/api/v1/users/${actor.id}`, { headers: { ...headers, "Idempotency-Key": randomUUID() }, data: { expected_version: 1 } })).status()).toBe(403);
  }
  for (const role of ["manager", "agent"]) {
    const nonAdmin = await createActor(role);
    try {
      await clearActorContext(page); await signIn(page, nonAdmin);
      expect((await page.request.get("/api/v1/users")).status()).toBe(403);
      for (const path of ["/settings", "/settings/users", "/settings/users/new", `/settings/users/${actor.id}/edit`]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Accès non autorisé");
        expect(await page.getByRole("button", { name: "Créer le compte", exact: true }).count()).toBe(0);
      }
    } finally { await removeActor(nonAdmin); }
  }
});

test("Staff: real outage/retry, keyboard deletion confirmation and last admin conflict", async ({ page, actor }) => {
  await signIn(page, actor);
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/users?page=1&page_size=50", async route => { await wait; await route.continue(); });
  await page.goto("/settings/users");
  await expect(page.getByRole("status").filter({ hasText: "Chargement des utilisateurs" })).toBeVisible();
  try { await apiProcess("stop"); release(); await expect(page.getByRole("alert")).toBeVisible(); }
  finally { release(); await apiProcess("start"); await page.unroute("**/api/v1/users?page=1&page_size=50"); }
  await expect.poll(async () => (await page.request.get("/api/v1/health/ready")).status()).toBe(200);
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.goto(`/settings/users/${actor.id}/edit`);
  const remove = page.getByRole("button", { name: "Supprimer l’utilisateur", exact: true });
  await expect(remove).toBeEnabled(); await remove.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("alertdialog")).toBeVisible(); await page.keyboard.press("Escape");
  await expect(remove).toBeFocused();
  await confirm(page, "Supprimer l’utilisateur");
  await expect(page.getByRole("alertdialog").getByRole("alert")).toHaveText(/au moins un administrateur/);
});

test("Staff: numbered pagination uses real rows and stable totals", async ({ page, actor }) => {
  const fixture = await testControl("fixture", { action: "bulk", count: 51 }) as { ids: string[] };
  try {
    await signIn(page, actor); await page.goto("/settings/users");
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(50);
    await expect(page.getByRole("button", { name: "Page 1", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Précédent", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Suivant", exact: true }).click();
    await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("button", { name: "Suivant", exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await testControl("fixture", { action: "delete-bulk", ids: fixture.ids }); }
});
