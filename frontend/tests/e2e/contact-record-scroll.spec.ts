import { randomUUID } from "node:crypto";
import { enquirySchema } from "@/features/contacts/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { directoryLeadDraft } from "../helpers/directory-fixtures";
import { staffCommand } from "../helpers/leads";

test("Contact overview scrolls to the linked records on desktop and mobile", async ({ page }) => {
  const actor = await createActor("agent");
  try {
    await signIn(page, actor);
    const name = `SYN-CONTACT-SCROLL-${randomUUID().slice(0, 8)}`;
    const phone = `+212611${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`;
    const created = await staffCommand(page, "enquiries", directoryLeadDraft(name, phone));
    expect(created.status()).toBe(200);
    const { contact } = enquirySchema.parse(await created.json());

    for (const viewport of [{ width: 1440, height: 800 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/contacts/${contact.id}`);
      const overview = page.getByRole("tabpanel", { name: "Aperçu" });
      const linkedDeals = overview.getByText("Aucune affaire dans cette sélection.", { exact: true });
      await expect(linkedDeals).toBeAttached();
      await expect(linkedDeals).not.toBeInViewport();

      const heading = overview.getByRole("heading", { name: "Coordonnées", exact: true });
      const position = await heading.boundingBox();
      if (!position) throw new Error("CONTACT_OVERVIEW_NOT_VISIBLE");
      await page.mouse.move(position.x + 10, position.y + position.height / 2);
      await page.mouse.wheel(0, 1600);
      await expect(linkedDeals).toBeInViewport();
    }
  } finally {
    await clearActorContext(page);
    await removeActor(actor);
  }
});
