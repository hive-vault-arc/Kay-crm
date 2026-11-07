import { createHash } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect } from "./auth";
import { testControl } from "./api-process";

export async function syntheticFile(kind: "clean" | "clean-document" | "rejected" = "clean", name?: string) {
  const result = await testControl("fixture", { action: "file-bytes", kind }) as { base64: string };
  return { name: name ?? (kind === "clean" ? "SP09 image synthétique.png" : kind === "clean-document" ? "SP09 document synthétique.docx" : "SP09 test antivirus.docx"), mimeType: kind === "clean" ? "image/png" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from(result.base64, "base64") };
}
export async function uploadFile(page: Page, file: Awaited<ReturnType<typeof syntheticFile>>) {
  const uploader = await chooseDocument(page, file);
  await uploader.getByRole("button", { name: "Envoyer le fichier", exact: true }).click();
  await expect(uploader).not.toBeVisible();
  const panel = page.getByRole("region", { name: "Pièces jointes", exact: true });
  await expect(panel.getByText("Transfert terminé. Le fichier reste en quarantaine jusqu’au résultat de l’analyse.", { exact: true })).toBeVisible();
  return panel.getByRole("listitem").filter({ has: page.getByRole("heading", { name: file.name, exact: true }) });
}
export async function openDocuments(page: Page, home: "contact" | "inventory") {
  await page.getByRole("button", { name: home === "contact" ? "Voir les documents" : "Documents", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: home === "contact" ? "Documents du contact" : "Documents", exact: true });
  await expect(drawer).toBeVisible();
  const panel = drawer.getByRole("region", { name: "Pièces jointes", exact: true });
  await expect(panel).toBeVisible(); return panel;
}
export async function chooseDocument(page: Page, file: Awaited<ReturnType<typeof syntheticFile>>) {
  await page.getByRole("region", { name: "Pièces jointes", exact: true }).getByRole("button", { name: "Ajouter un document", exact: true }).click();
  const uploader = page.getByRole("dialog", { name: "Ajouter un document", exact: true });
  await expect(uploader).toBeVisible();
  const input = uploader.getByLabel("Fichier", { exact: true }); await expect(input).toBeEnabled(); await input.setInputFiles(file);
  return uploader;
}
export async function downloadFile(page: Page, name: string, bytes: Buffer) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: `Télécharger ${name}`, exact: true }).click();
  const download = await event;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(createHash("sha256").update(Buffer.concat(chunks)).digest("hex")).toBe(createHash("sha256").update(bytes).digest("hex"));
}
