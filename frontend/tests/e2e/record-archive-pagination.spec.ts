import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";

test("Lead/Deal directories fetch 50 per selected page, scroll internally, and archive with restoration", async ({ page }) => {
  test.setTimeout(240_000);
  const owner = await createActor("agent", false, "SP06 agent synthétique pagination");
  try {
    await signIn(page, owner);
    const lead = await createLead(page, "Contact synthétique pagination");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id as string;
    const firstDeal = await staffCommand(page, "deals", dealBody(contact, "Affaire synthétique pagination"));
    expect(firstDeal.status()).toBe(200);
    const deal = (await firstDeal.json()).id as string;
    for (let index = 0; index < 50; index++) {
      const enquiry = await staffCommand(page, "enquiries", {
        contact_id: contact, message: `Demande synthétique ${index}`, source: "manual",
        initial_budget: "500000", campaign_source: "facebook", rating: "cold", status: "new",
      });
      expect(enquiry.status()).toBe(200);
      const createdDeal = await staffCommand(page, "deals", dealBody(contact, `Projet synthétique ${index}`));
      expect(createdDeal.status()).toBe(200);
    }
    for (const [route, endpoint, name] of [
      ["/leads", "enquiries", "Tableau des Leads, défilement vertical et horizontal"],
      ["/deals", "deals", "Tableau des affaires, défilement vertical et horizontal"],
    ]) {
      const requests: URL[] = [];
      const track = (request: { url(): string }) => {
        const url = new URL(request.url());
        if (url.pathname === `/api/v1/${endpoint}`) requests.push(url);
      };
      page.on("request", track);
      await page.setViewportSize({ width: 1440, height: 800 });
      await page.goto(route);
      await expect(page.getByRole("status").filter({ hasText: /^51 (demandes|affaires)$/ })).toBeVisible();
      const region = page.getByRole("region", { name, exact: true });
      await expect(region.locator("tbody tr")).toHaveCount(50);
      const bounds = await region.evaluate(element => {
        const container = element as HTMLElement;
        return { height: container.clientHeight, scrollHeight: container.scrollHeight, overflowY: getComputedStyle(container).overflowY };
      });
      expect(bounds.scrollHeight).toBeGreaterThan(bounds.height);
      expect(bounds.overflowY).toBe("auto");
      const layout = await page.evaluate(() => {
        const rect = (selector: string) => {
          const node = document.querySelector(selector);
          if (!node) return null;
          const box = node.getBoundingClientRect();
          return { top: Math.round(box.top), bottom: Math.round(box.bottom), height: Math.round(box.height) };
        };
        return { overflow: document.scrollingElement!.scrollHeight - innerHeight, rail: rect(".filter-rail"), table: rect(".crm-directory-scroll"), results: rect("[data-list-results]"), pagination: rect(".crm-directory-pagination"), main: rect("main") };
      });
      expect(layout.overflow, JSON.stringify(layout)).toBeLessThanOrEqual(2);
      await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
      const artifacts = path.resolve("output/playwright/record-archive-pagination");
      await mkdir(artifacts, { recursive: true });
      await page.screenshot({ path: path.join(artifacts, `${endpoint}-1440.png`) });
      expect(requests.some(url => url.searchParams.get("page") === "2")).toBe(false);
      expect(requests.some(url => url.searchParams.get("page_size") === "50")).toBe(true);
      await page.getByRole("button", { name: "Page 2", exact: true }).click();
      await expect(region.locator("tbody tr")).toHaveCount(1);
      expect(requests.some(url => url.searchParams.get("page") === "2" && url.searchParams.get("page_size") === "50")).toBe(true);
      await page.getByRole("button", { name: "Page 1", exact: true }).click();
      await expect(region.locator("tbody tr")).toHaveCount(50);
      await page.setViewportSize({ width: 375, height: 812 });
      const mobile = await region.evaluate(element => {
        const table = element as HTMLElement;
        return {
          pageOverflowX: document.scrollingElement!.scrollWidth - innerWidth,
          tableOverflowX: table.scrollWidth - table.clientWidth,
          tableOverflowY: table.scrollHeight - table.clientHeight,
        };
      });
      expect(mobile.pageOverflowX).toBeLessThanOrEqual(2);
      expect(mobile.tableOverflowX).toBeGreaterThan(0);
      expect(mobile.tableOverflowY).toBeGreaterThan(0);
      await page.screenshot({ path: path.join(artifacts, `${endpoint}-375.png`) });
      page.off("request", track);
    }
    for (const [route, id, noun] of [["leads", lead, "prospect"], ["deals", deal, "affaire"]]) {
      await page.goto(`/${route}/${id}`);
      await page.getByRole("button", { name: "Archiver", exact: true }).click();
      const dialog = page.getByRole("alertdialog", { name: `Archiver ce${noun === "affaire" ? "tte" : ""} ${noun} ?` });
      await dialog.getByRole("button", { name: "Confirmer : archiver", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: new RegExp(`${noun} archivé`, "i") }).first()).toBeVisible();
      const archived = await page.request.get(`/api/v1/${route === "leads" ? "enquiries" : "deals"}/${id}`);
      expect((await archived.json()).archived_at).toBeTruthy();
      await page.getByRole("button", { name: "Restaurer", exact: true }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Confirmer : restaurer", exact: true }).click();
      await expect(page.getByRole("button", { name: "Archiver", exact: true })).toBeVisible();
    }
  } finally {
    await clearActorContext(page);
    await removeActor(owner);
  }
});

test("dashboard and directories show accessible reduced-motion loading placeholders", async ({ page, actor }) => {
  await signIn(page, actor);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [route, api, label] of [
    ["/dashboard", "reports/dashboard", "Chargement des indicateurs"],
    ["/leads", "enquiries", "Chargement des Leads…"],
    ["/deals", "deals", "Chargement des affaires…"],
  ]) {
    const pending = Promise.withResolvers<void>();
    const inFlight = new Set<Promise<void>>();
    const delayed = route === "/dashboard"
      ? [api, "tasks", "notifications", "visits/follow-up"] : [api];
    for (const endpoint of delayed) {
      await page.route(`**/api/v1/${endpoint}?**`, async handler => {
        const completion = pending.promise.then(() => handler.continue());
        inFlight.add(completion);
        try { await completion; } finally { inFlight.delete(completion); }
      });
    }
    try {
      await page.goto(route);
      const skeleton = page.locator(`[aria-busy="true"][aria-label="${label}"]`).last();
      await expect(skeleton).toBeVisible();
      await expect(skeleton.locator('[data-slot="skeleton"]').first()).toHaveCSS("animation-name", "none");
      if (route === "/dashboard") {
        for (const label of ["Chargement du travail…", "Chargement des notifications…", "Chargement du suivi des visites…"]) {
          await expect(page.locator(`[aria-busy="true"][aria-label="${label}"]`).last()).toBeVisible();
        }
      }
    } finally {
      pending.resolve();
      await expect(page.locator(`[aria-busy="true"][aria-label="${label}"]`)).toHaveCount(0);
      await expect.poll(() => inFlight.size).toBe(0);
      for (const endpoint of delayed) await page.unroute(`**/api/v1/${endpoint}?**`);
    }
  }
});
