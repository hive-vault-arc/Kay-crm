import { enquirySchema } from "@/features/contacts/contracts";
import { dealSchema, resultSchema } from "@/features/deals/contracts";
import { convertLeadSchema } from "@/features/deals/qualification-contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { directoryLeadDraft } from "../helpers/directory-fixtures";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ kind: "enquiries", operation: "archive", width: 390, failure: "acknowledgement" }, { kind: "deals", operation: "restore", width: 1440, failure: "result-read" }] as const) {
  // Prepared/typechecked only. No actual app/SQL/native execution is claimed.
  test(`${scenario.kind} ${scenario.operation} keeps its exact confirmation through ${scenario.failure}`, async ({ page }) => {
    test.setTimeout(180_000); const actor = await createActor("manager"), owner = await createActor("agent"), attempts: { body: string | null; key?: string }[] = []; let blockRead = false;
    try {
      await signIn(page, actor);
      const created = await staffCommand(page, "enquiries", directoryLeadDraft("Synthetic lifecycle dossier", `+2126${Date.now().toString().slice(-8)}`, { primaryAgentId: owner.id }));
      if (created.status() !== 200) throw new Error("SYNTHETIC_RECORD_LIFECYCLE_SETUP_FAILED"); const enquiry = enquirySchema.parse(await created.json()); let id = enquiry.id;
      if (scenario.kind === "deals") {
        const converted = await staffCommand(page, `enquiries/${enquiry.id}/convert`, convertLeadSchema.parse({ expected_version: enquiry.version, project: { external_name: "Synthetic lifecycle project" }, initial_budget: "500000", purchase_reasons: ["residence"] }));
        if (converted.status() !== 200) throw new Error("SYNTHETIC_RECORD_LIFECYCLE_CONVERSION_FAILED"); const receipt = resultSchema.parse(await converted.json()); id = receipt.id;
        const archived = await staffCommand(page, `deals/${id}/archive`, { expected_version: receipt.version, reason: "Synthetic initial archive" }); if (archived.status() !== 200) throw new Error("SYNTHETIC_RECORD_LIFECYCLE_ARCHIVE_FAILED");
      }
      const path = `/api/v1/${scenario.kind}/${id}`, opening = await page.request.get(path); if (opening.status() !== 200) throw new Error("SYNTHETIC_RECORD_LIFECYCLE_OPENING_FAILED");
      const initial = scenario.kind === "enquiries" ? enquirySchema.parse(await opening.json()) : dealSchema.parse(await opening.json());
      await page.setViewportSize({ width: scenario.width, height: 900 }); await page.goto(`/${scenario.kind === "enquiries" ? "leads" : "deals"}/${id}`);
      await page.getByRole("button", { name: "Actions", exact: true }).click(); const title = scenario.kind === "enquiries" ? "Archiver le prospect" : "Restaurer l’affaire"; await page.getByRole("button", { name: title, exact: true }).click(); const dialog = page.getByRole("alertdialog", { name: title, exact: true });
      await dialog.getByLabel("Motif obligatoire", { exact: true }).fill("Synthetic retained dossier lifecycle reason");
      await page.route(`**${path}`, async route => { if (route.request().method() === "GET" && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }); return route.fallback(); });
      await page.route(`**${path}/${scenario.operation}`, async route => { if (route.request().method() !== "POST") return route.fallback(); attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] }); const response = await route.fetch(); if (response.status() !== 200) throw new Error("SYNTHETIC_RECORD_LIFECYCLE_COMMAND_FAILED"); if (attempts.length === 1) { if (scenario.failure === "acknowledgement") return route.abort("failed"); blockRead = true; } return route.fulfill({ response }); });
      await dialog.getByRole("button", { name: `Confirmer : ${title.toLowerCase()}`, exact: true }).click(); const retry = dialog.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true }); await expect.poll(() => retry.count()).toBe(1);
      await expect.poll(() => dialog.getByLabel("Motif obligatoire", { exact: true }).isDisabled()).toBe(true); await expect.poll(() => dialog.getByRole("button", { name: "Conserver la fiche", exact: true }).isDisabled()).toBe(true); await page.keyboard.press("Escape"); await expect.poll(() => dialog.count()).toBe(1); blockRead = false; await retry.click(); await expect.poll(() => dialog.count()).toBe(0);
      expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1); if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(path); if (response.status() !== 200) throw new Error("SYNTHETIC_RECORD_LIFECYCLE_RESULT_FAILED"); const current = scenario.kind === "enquiries" ? enquirySchema.parse(await response.json()) : dealSchema.parse(await response.json()); expect(current.id === id && current.version === initial.version + 1 && Boolean(current.archived_at) === (scenario.operation === "archive")).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { try { await clearActorContext(page); } finally { await removeActor(actor); await removeActor(owner); } }
  });
}
