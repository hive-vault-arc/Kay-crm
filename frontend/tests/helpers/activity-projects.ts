import { randomUUID } from "node:crypto";
import type { Locator, Page } from "@playwright/test";
import { expect } from "./auth";
import { staffCommand } from "./leads";

export async function activityProjectFixture(page: Page, kind: "developments" | "properties" = "developments") {
  const reference = `SYN-ACT-${randomUUID().slice(0, 8).toUpperCase()}`;
  const name = kind === "developments" ? "Programme synthétique évoqué" : "Bien synthétique évoqué";
  const response = await staffCommand(page, kind, kind === "developments"
    ? { reference, name, category: "mixed", location: null, briefing_text: null, developer_contact_id: null, developer_marketing_display: null }
    : { reference, category: "house", marketing_name: name, location: null, area_sqm: null });
  expect(response.status()).toBe(200);
  const record = await response.json();
  return { id: (kind === "developments" ? record.development_id : record.property_id) as string, name, reference };
}

export async function searchActivityProject(page: Page, form: Locator, query: string, interaction: "keyboard" | "touch" | "click" = "click") {
  const trigger = form.getByRole("button", { name: "Choisir des projets", exact: true });
  await expect(trigger).toBeEnabled();
  if (interaction === "keyboard") { await trigger.focus(); await page.keyboard.press("Enter"); }
  else if (interaction === "touch") await trigger.tap();
  else await trigger.click();
  const picker = page.getByRole("dialog", { name: "Catalogue des projets", exact: true });
  const search = picker.getByRole("searchbox", { name: "Rechercher un projet", exact: true });
  await expect(search).toBeFocused();
  await search.fill(query);
  return picker;
}
