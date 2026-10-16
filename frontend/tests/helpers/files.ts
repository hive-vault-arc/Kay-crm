import { createHash } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect } from "./auth";
import { testControl } from "./api-process";

export async function syntheticFile(kind: "clean" | "rejected" = "clean", name?: string) {
  const result = await testControl("fixture", { action: "file-bytes", kind }) as { base64: string };
  return { name: name ?? (kind === "clean" ? "SP09 image synthétique.png" : "SP09 test antivirus.docx"), mimeType: kind === "clean" ? "image/png" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from(result.base64, "base64") };
}
export async function uploadFile(page: Page, file: Awaited<ReturnType<typeof syntheticFile>>) {
  await expect(page.getByLabel("Fichier à ajouter", { exact: true })).toBeEnabled();
  await page.getByLabel("Fichier à ajouter", { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "Envoyer le fichier", exact: true }).click();
  await expect(page.getByText("Transfert terminé. Le fichier reste en quarantaine jusqu’au résultat de l’analyse.", { exact: true })).toBeVisible();
  return page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: file.name, exact: true }) });
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
