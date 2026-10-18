import { type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { testControl } from "./api-process";
import { expect, signIn, clearActorContext, type TestActor } from "./auth";
import { geometry } from "./report-review";

type RestoredFixture = {
  admin: TestActor; agent: TestActor; other: TestActor; active_token: string;
  old_permit: { permit_id: string; token: string; binding: string };
  contact_id: string; deal_id: string; development_id: string; property_id: string;
  document_id: string; post_point_enquiry: string; recovery: { snapshot_at: string; incident_at: string; rpo_seconds: number; restore_seconds: number };
};

export async function restoredJourney(page: Page, baseURL: string, visible = false, prefix = "sp21") {
  const data = await testControl("fixture", { action: "recovery-prepare" }) as RestoredFixture;
  const errors: string[] = [], measurements: unknown[] = [];
  let initialFailure = false;
  let denied = false;
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  page.on("console", msg => { if (msg.type() === "error" && !(denied && msg.text().includes("status of 404"))) errors.push("CONSOLE_ERROR"); });
  async function capture(name: string) {
    if (!visible) return;
    await expect(page.getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
    expect(await page.locator('input[type="password"]').evaluateAll(fields => fields.every(el => !(el as HTMLInputElement).value))).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    const cdp = await page.context().newCDPSession(page);
    try {
      const dom = await page.evaluate(() => ({ width: innerWidth, height: document.documentElement.scrollHeight }));
      const image = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width: dom.width, height: dom.height, scale: 1 } });
      await mkdir("output/playwright", { recursive: true });
      await writeFile(`output/playwright/${prefix}-${name}.png`, Buffer.from(image.data, "base64"));
    } finally { await cdp.detach(); }
  }
  try {
    await testControl("recovery-start");
    await page.context().addCookies([{ name: "__Host-kay_session", value: data.active_token, url: baseURL, secure: true, httpOnly: true, sameSite: "Lax" }]);
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
    await capture("invalidated-login-desktop");
    const old = await page.request.get(`https://localhost:8100/api/v1/transfers/${data.old_permit.permit_id}`, { headers: { Origin: baseURL, "X-File-Permit": data.old_permit.token, "X-File-Session": data.old_permit.binding } });
    expect(old.status()).toBe(403);
    await clearActorContext(page); await signIn(page, data.agent);
    await expect(page.getByRole("heading", { name: "Tableau de bord", exact: true })).toBeVisible();
    await expect(page.getByText("Mes dossiers accessibles", { exact: true })).toBeVisible();
    const dashboard = await page.request.get("/api/v1/reports/dashboard");
    expect(dashboard.status()).toBe(200);
    expect((await dashboard.json()).scope).toBe("assigned_or_shared");
    await capture("dashboard-desktop");
    await page.goto(`/contacts/${data.contact_id}`);
    await expect(page.getByText("Contact : SP05 contact synthétique", { exact: true })).toBeVisible();
    if (visible) {
      for (const width of [320, 360, 390, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 1000 }); measurements.push(await geometry(page)); }
    }
    await capture("contact-desktop");
    await page.getByRole("tab", { name: "Documents", exact: true }).click();
    await expect(page.getByText("Analyse réussie", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Télécharger SP21 preuve synthétique.png", exact: true })).toBeEnabled();
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Télécharger SP21 preuve synthétique.png", exact: true }).click();
    expect((await downloadEvent).suggestedFilename()).toBe("SP21 preuve synthétique.png");
    await capture("files-desktop");
    await page.goto(`/deals/${data.deal_id}`);
    const restoredResponse = await page.request.get(`/api/v1/deals/${data.deal_id}`);
    expect(restoredResponse.status()).toBe(200);
    const restoredDeal = await restoredResponse.json();
    expect(restoredDeal.title).toBe("SP05 contact synthétique · Programme synthétique");
    expect(restoredDeal.initial_budget).toBe("1000000.00 MAD");
    expect(restoredDeal.client_snapshot.languages).toEqual(["french", "darija"]);
    expect(restoredDeal.projects[0].development_id).toBe(data.development_id);
    await expect(page.getByRole("heading", { name: restoredDeal.title, exact: true })).toBeVisible();
    await capture("deal-desktop");
    await page.goto(`/projects/${data.development_id}`);
    await expect(page.getByText("Programme synthétique", { exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Unités", exact: true }).click();
    await expect(page.getByText(/80[.,]00 m²/).first()).toBeVisible();
    await capture("project-desktop");
    await page.goto(`/visits/${(data as RestoredFixture & { visit_id: string }).visit_id}`);
    await expect(page.getByText("Visite synthétique SP14", { exact: true })).toBeVisible();
    await capture("visit-desktop");
    await page.goto("/visits");
    await expect(page.getByRole("heading", { name: "Calendrier des visites", exact: true })).toBeVisible();
    await capture("calendar-desktop");
    await clearActorContext(page); await signIn(page, data.admin);
    expect((await page.request.get(`/api/v1/enquiries/${data.post_point_enquiry}`)).status()).toBe(404);
    await page.goto(`/deals/${data.deal_id}`); await page.getByRole("tab", { name: "Finance", exact: true }).click();
    await expect(page.getByText(/7[\s\u202f]500,00/).first()).toBeVisible();
    await capture("finance-desktop");
    expect(await testControl("fixture", { action: "recovery-run" })).toEqual({ finance_receipts: 1, committed_imports: 1, processed_website: 1, running_jobs: 0 });
    await clearActorContext(page); await signIn(page, data.other);
    expect((await page.request.get(`/api/v1/contacts/${data.contact_id}`)).status()).toBe(404);
    if (visible) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/dashboard"); await expect(page.getByRole("heading", { name: "Tableau de bord", exact: true })).toBeVisible();
      measurements.push(await geometry(page)); await capture("empty-dashboard-mobile");
      denied = true;
      await page.goto(`/contacts/${data.contact_id}`);
      await expect(page.getByRole("alert").filter({ hasText: /introuvable|accessible/ })).toBeVisible();
      await capture("denied-mobile"); denied = false;
      await page.goto("/projects");
      await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click();
      const first = page.locator(`a[href="/projects/${data.development_id}"]`).first();
      await first.focus(); await page.keyboard.press("Enter");
      await expect(page.getByText("Programme synthétique", { exact: true }).first()).toBeVisible();
      await page.goto("/projects");
      await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).tap();
      await page.locator(`a[href="/projects/${data.development_id}"]`).first().tap();
      await expect(page.getByText("Programme synthétique", { exact: true }).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
    const verified = Date.now(), incident = Date.parse(data.recovery.incident_at);
    expect(data.recovery.rpo_seconds).toBeLessThanOrEqual(3600);
    expect((verified - incident) / 1000).toBeLessThanOrEqual(14400);
    console.info("SP21_RESTORED_STACK", JSON.stringify({ rpoSeconds: data.recovery.rpo_seconds, restoreSeconds: data.recovery.restore_seconds, incidentToVerifiedSeconds: (verified - incident) / 1000, measurements, unexpectedErrors: errors }));
  } catch (failure) { initialFailure = true; throw failure; }
  finally {
    try {
      await clearActorContext(page);
      await testControl("recovery-stop");
      await testControl("fixture", { action: "recovery-clear" });
    } catch (cleanupFailure) { if (!initialFailure) throw cleanupFailure; console.warn("RESTORED_STACK_CLEANUP_FAILED"); }
  }
}
