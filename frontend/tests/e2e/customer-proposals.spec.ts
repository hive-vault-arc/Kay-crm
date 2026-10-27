import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";

// Prepared for the isolated supervisor; no native/app execution is claimed here.
for (const width of [1440, 390]) test(`Selected Projects proposals preserve independent stock and guarded drafts at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  const actor = await createActor("agent"), suffix = randomUUID().slice(0, 8), digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  try {
    await signIn(page, actor); await page.setViewportSize({ width, height: 900 });
    const contactReply = await staffCommand(page, "contacts", { name: `Client proposition synthétique ${suffix}`, type: "person", phones: [{ number: `+212612${digits}`, label: "Principal", is_primary: true }], emails: [], roles: ["buyer"], country: "MA", nationality: "", languages: ["french"] }); expect(contactReply.status()).toBe(200); const contact = await contactReply.json();
    const dealReply = await staffCommand(page, "deals", dealBody(contact.id, `Projet proposition synthétique ${suffix}`)); expect(dealReply.status()).toBe(200); const { id } = await dealReply.json();
    await page.goto(`/deals/${id}?tab=projects`);
    const tabs = page.getByRole("tablist", { name: "Rubriques de l’affaire", exact: true }); await expect(tabs.getByRole("tab")).toHaveCount(4); await expect(tabs.getByRole("tab", { name: "Projets", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("form", { name: "Nouvelle proposition client", exact: true })).toHaveCount(0); await page.getByRole("button", { name: "Nouvelle proposition", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Nouvelle proposition", exact: true }), form = dialog.getByRole("form", { name: "Nouvelle proposition client", exact: true });
    await expect(dialog.getByRole("form")).toHaveCount(1); await expect(dialog.getByRole("table")).toHaveCount(0);
    await form.getByLabel("Montant proposé (MAD)", { exact: true }).fill("11999,99"); await form.getByLabel("Période du prix proposé", { exact: true }).selectOption("month"); await form.getByLabel("Statut de la proposition", { exact: true }).selectOption("accepted"); await form.getByLabel("Échéance (facultative)", { exact: true }).fill("2026-11-12"); await form.getByLabel("Conditions proposées", { exact: true }).fill("Conditions synthétiques de proposition. ".repeat(12));
    await form.getByRole("button", { name: "Annuler", exact: true }).click(); const discard = page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true }); await expect(discard).toBeVisible(); await discard.getByRole("button", { name: "Continuer la modification", exact: true }).click(); await expect(form.getByLabel("Montant proposé (MAD)", { exact: true })).toHaveValue("11999,99");
    await form.getByRole("button", { name: "Enregistrer la proposition", exact: true }).click(); await expect(dialog).toHaveCount(0);
    const current = await (await page.request.get(`/api/v1/deals/${id}`)).json(), proposals = await (await page.request.get(`/api/v1/deals/${id}/customer-offers`)).json(), proposal = proposals.items[0];
    expect(proposals.total).toBe(1); expect(proposal).toMatchObject({ amount_mad: "11999.99", annual_amount_mad: "143999.88", status: "accepted", price_period: "month", expires_on: "2026-11-12" }); expect(current.stage).toBe("new"); expect(current.offering).toBeNull(); expect(current.active_reservation).toBeNull();
    if (width === 390) await expect(page.getByRole("table")).toHaveCount(0); else await expect(page.getByRole("table", { name: "Propositions client", exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: /^Modifier la proposition du/ }).click();
    const edit = page.getByRole("dialog", { name: "Modifier la proposition", exact: true }); await edit.getByLabel("Montant proposé (MAD)", { exact: true }).fill("12000.50"); await edit.getByLabel("Conditions proposées", { exact: true }).fill("Conditions synthétiques revues");
    const competing = await staffCommand(page, `customer-offers/${proposal.id}`, { amount_mad: "11000.25", currency: "MAD", price_period: "month", conditions: "Conditions concurrentes synthétiques", expires_on: "2026-11-12", status: "accepted", expected_version: proposal.version, expected_deal_version: current.version }, "PATCH"); expect(competing.status()).toBe(200);
    await edit.getByRole("button", { name: "Enregistrer la proposition", exact: true }).click(); await edit.getByRole("button", { name: "Comparer la proposition actuelle", exact: true }).click(); await expect(edit.getByLabel("Montant proposé (MAD)", { exact: true })).toHaveValue("12000.50");
    await edit.getByRole("button", { name: "Conserver ma saisie sur cette version", exact: true }).click(); await edit.getByRole("button", { name: "Enregistrer la proposition", exact: true }).click(); await expect(edit).toHaveCount(0);
    const final = await (await page.request.get(`/api/v1/deals/${id}/customer-offers`)).json(); expect(final.total).toBe(1); expect(final.items[0]).toMatchObject({ id: proposal.id, amount_mad: "12000.50", annual_amount_mad: "144006.00", price_period: "month", status: "accepted", conditions: "Conditions synthétiques revues" });
    const finalDeal = await (await page.request.get(`/api/v1/deals/${id}`)).json(); expect(finalDeal.stage).toBe("new"); expect(finalDeal.active_reservation).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await clearActorContext(page); await removeActor(actor); }
});
