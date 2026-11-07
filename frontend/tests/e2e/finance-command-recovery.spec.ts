import { commissionSchema, commissionsSchema, newCommissionSchema, resultSchema } from "@/features/finance/contracts";
import { clearActorContext, expect, removeActor, test, type TestActor } from "../helpers/auth";
import { fillCommission, fillReceipt, financeFixture, openFinance } from "../helpers/finance";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ kind: "create", width: 390, failure: "acknowledgement" }, { kind: "receipt", width: 1440, failure: "result-read" }] as const) {
  // Prepared/typechecked only. Actual isolated/native/ledger acceptance remains pending.
  test(`Finance ${scenario.kind} retains its confirmed facts through ${scenario.failure}`, async ({ page }) => {
    test.setTimeout(180_000); const actors: TestActor[] = [], attempts: { body: string | null; key?: string }[] = []; let blockRead = false;
    try {
      await page.setViewportSize({ width: scenario.width, height: 900 }); const data = await financeFixture(page, actors); let commissionId: string | undefined;
      if (scenario.kind === "receipt") {
        const parent = await page.request.get(`/api/v1/deals/${data.dealId}`); if (parent.status() !== 200) throw new Error("SYNTHETIC_FINANCE_PARENT_FAILED"); const version = (await parent.json()).version;
        const created = await staffCommand(page, `deals/${data.dealId}/commissions`, newCommissionSchema.parse({ expected_deal_version: version, kind: "fixed", base_mad: "1000000", amount_mad: "10000", rate_percent: null, due_on: null })); if (created.status() !== 200) throw new Error("SYNTHETIC_FINANCE_SETUP_FAILED"); const receipt = resultSchema.parse(await created.json()); commissionId = receipt.id;
        const recognized = await staffCommand(page, `commissions/${commissionId}/recognize`, { expected_version: receipt.version }); if (recognized.status() !== 200) throw new Error("SYNTHETIC_FINANCE_RECOGNITION_FAILED"); await openFinance(page, data.dealId);
      }
      const form = scenario.kind === "create" ? await fillCommission(page) : await fillReceipt(page), commandPath = scenario.kind === "create" ? `/api/v1/deals/${data.dealId}/commissions` : `/api/v1/commissions/${commissionId}/receipts`;
      if (commissionId) await page.route(`**/api/v1/commissions/${commissionId}`, async route => { if (route.request().method() === "GET" && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }); return route.fallback(); });
      await page.route(`**${commandPath}`, async route => { if (route.request().method() !== "POST") return route.fallback(); attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] }); const response = await route.fetch(); if (response.status() !== 200) throw new Error("SYNTHETIC_FINANCE_COMMAND_FAILED"); if (attempts.length === 1) { if (scenario.failure === "acknowledgement") return route.abort("failed"); blockRead = true; } return route.fulfill({ response }); });
      await form.getByRole("button", { name: scenario.kind === "create" ? "Enregistrer la commission prévue" : "Vérifier l’encaissement", exact: true }).click();
      if (scenario.kind === "receipt") await page.getByRole("alertdialog", { name: "Confirmer l’encaissement", exact: true }).getByRole("button", { name: "Confirmer l’encaissement", exact: true }).click();
      const retry = form.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser l’opération enregistrée", exact: true }); await expect.poll(() => retry.count()).toBe(1);
      const field = form.getByLabel(scenario.kind === "create" ? "Base explicite (MAD)" : "Montant encaissé (MAD)", { exact: true }); await expect.poll(() => field.isDisabled()).toBe(true);
      await form.getByRole("button", { name: "Annuler", exact: true }).click(); const leaving = page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true }); await expect.poll(() => leaving.count()).toBe(1); await leaving.getByRole("button", { name: "Continuer la modification", exact: true }).click(); await expect.poll(() => form.count()).toBe(1);
      blockRead = false; await retry.click(); await expect.poll(() => form.count()).toBe(0); expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1); if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(`/api/v1/deals/${data.dealId}/commissions?page=1&page_size=20`); if (response.status() !== 200) throw new Error("SYNTHETIC_FINANCE_RESULT_FAILED"); const current = commissionsSchema.parse(await response.json()); expect(current.total === 1 && current.items.length === 1).toBe(true); const item = commissionSchema.parse(current.items[0]); expect(item.deal_id === data.dealId && item.version === (scenario.kind === "create" ? 1 : 3)).toBe(true); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); for (const actor of actors.reverse()) await removeActor(actor); }
  });
}
