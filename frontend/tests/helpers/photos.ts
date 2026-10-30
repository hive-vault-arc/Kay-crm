import type { Locator, Page } from "@playwright/test";
import { expect } from "./auth";

export async function openPhotos(page: Page) {
  await page.getByRole("button", { name: "Galerie", exact: true }).click();
  const gallery = page.getByRole("dialog", { name: "Photos du dossier", exact: true });
  await expect(gallery.getByRole("form", { name: "Galerie du dossier", exact: true })).toBeVisible(); return gallery;
}
export async function choosePhoto(page: Page, file: Parameters<Locator["setInputFiles"]>[0]) {
  const gallery = page.getByRole("dialog", { name: "Photos du dossier", exact: true });
  await gallery.getByRole("button", { name: "Ajouter une photo", exact: true }).click();
  const form = gallery.getByRole("form", { name: "Ajouter une photo", exact: true });
  await form.getByLabel("Photo à ajouter", { exact: true }).setInputFiles(file);
  await expect(form.getByRole("button", { name: "Ajouter la photo", exact: true })).toBeEnabled(); return form;
}
export async function uploadPhoto(page: Page, file: Parameters<Locator["setInputFiles"]>[0]) {
  const form = await choosePhoto(page, file);
  await form.getByRole("button", { name: "Ajouter la photo", exact: true }).click(); await expect(form).not.toBeVisible();
  await expect(page.getByRole("dialog", { name: "Photos du dossier", exact: true }).getByText("Photo envoyée. Elle sera visible après l’analyse antivirus.", { exact: true })).toBeVisible();
}
export async function closePhotos(page: Page) {
  const gallery = page.getByRole("dialog", { name: "Photos du dossier", exact: true });
  await gallery.getByRole("button", { name: "Fermer : Photos du dossier", exact: true }).click(); await expect(gallery).not.toBeVisible();
}
