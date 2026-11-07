import type { Locator, Page } from "@playwright/test";
import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createDevelopment } from "../helpers/developments";
import { createLead, staffCommand } from "../helpers/leads";
import { downloadFile, openDocuments, syntheticFile } from "../helpers/files";
import { testControl } from "../helpers/api-process";
import { openPhotos } from "../helpers/photos";
import { geometry } from "../helpers/report-review";

async function openBatch(gallery: Locator) {
  await gallery.getByRole("button", { name: "Ajouter une photo", exact: true }).tap();
  return gallery.getByRole("form", { name: "Ajouter une photo", exact: true });
}

async function selectBatch(form: Locator, files: Parameters<Locator["setInputFiles"]>[0]) {
  await form.getByLabel("Photo à ajouter", { exact: true }).setInputFiles(files);
}

async function sendBatch(form: Locator) {
  await form.getByRole("button", { name: "Ajouter les photos", exact: true }).tap();
}

function viewerFor(page: Page) {
  return page.getByRole("dialog", { name: "Photos du dossier", exact: true }).filter({ has: page.getByRole("button", { name: "Fermer la photo", exact: true }) });
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
const source = (name: string) => path.resolve("tests/fixtures/iphone-photos", name);
const png = () => readFile(path.resolve("tests/fixtures/projects-reference/patio.png"));

test("iPhone photos: real HEIC/HEIF batch converts privately under a CSP without eval", async ({ page }) => {
  test.setTimeout(180_000);
  const actor = await createActor("agent");
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  try {
    await page.addInitScript(() => {
      const nativeBitmap = window.createImageBitmap.bind(window);
      window.createImageBitmap = ((image: ImageBitmapSource) => image instanceof File && /\.hei[cf]$/i.test(image.name) ? Promise.reject(new Error("SYNTHETIC_NATIVE_HEIF_UNAVAILABLE")) : nativeBitmap(image)) as typeof createImageBitmap;
      const NativeImage = window.Image;
      window.Image = function () {
        const image = new NativeImage();
        Object.defineProperty(image, "src", { get: () => "", set: (value: string) => { if (value) queueMicrotask(() => image.dispatchEvent(new Event("error"))); } });
        return image;
      } as unknown as typeof Image;
      const nativeBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) { nativeBlob.call(this, callback, type === "image/webp" ? "image/png" : type, quality); };
    });
    await signIn(page, actor); await testControl("worker-start");
    await createDevelopment(page);
    const decoder = await page.request.get("/heic/decoder-worker.js");
    expect(decoder.headers()["content-security-policy"]).toBe("default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'self'");
    const encoder = await page.request.get("/webp/encoder-worker.js");
    expect(encoder.headers()["content-security-policy"]).toBe("default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'");
    const gallery = await openPhotos(page);
    const writes: { filename: string; mime_type: string }[] = [];
    const types: string[] = [];
    page.on("request", request => {
      if (new URL(request.url()).pathname === "/api/v1/documents" && request.method() === "POST") writes.push(request.postDataJSON());
      if (request.method() === "PUT" && request.url().includes("/transfers/")) types.push(request.headers()["content-type"]);
    });
    const form = await openBatch(gallery);
    const chooser = page.waitForEvent("filechooser");
    await form.getByRole("button", { name: "Parcourir", exact: true }).tap();
    const picker = await chooser;
    expect(picker.isMultiple()).toBe(true);
    await picker.setFiles([
      { name: "IMG_0001.HEIC", mimeType: "image/heic", buffer: await readFile(source("synthetic-grid.heic")) },
      { name: "principal.heif", mimeType: "", buffer: await readFile(source("synthetic-primary.heif")) },
      { name: "patio.png", mimeType: "image/png", buffer: await png() },
    ]);
    await sendBatch(form);
    await expect(gallery.getByText("3 / 10 photos", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(gallery.getByText("Analyse réussie", { exact: true })).toHaveCount(3, { timeout: 60_000 });
    expect(writes.map(item => item.filename)).toEqual(["IMG_0001.webp", "principal.webp", "patio.webp"]);
    expect(writes.every(item => item.mime_type === "image/webp")).toBe(true);
    expect(types).toEqual(["image/webp", "image/webp", "image/webp"]);
    const primary = gallery.getByRole("button", { name: "Ouvrir la photo principal.webp", exact: true });
    await expect(primary.locator("img")).toHaveJSProperty("naturalWidth", 96);
    const pixel = await primary.locator("img").evaluate(image => {
      const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
      const context = canvas.getContext("2d")!; context.drawImage(image as HTMLImageElement, 0, 0, 1, 1);
      return { width: (image as HTMLImageElement).naturalWidth, height: (image as HTMLImageElement).naturalHeight, rgb: [...context.getImageData(0, 0, 1, 1).data] };
    });
    expect(pixel.width).toBe(96); expect(pixel.height).toBe(64); expect(pixel.rgb[2]).toBeGreaterThan(pixel.rgb[0] + 60);
    for (const width of [1440, 390, 320]) { await page.setViewportSize({ width, height: 900 }); await geometry(page); }
    await page.setViewportSize({ width: 390, height: 844 });
    await primary.tap();
    await expect(viewerFor(page).getByRole("img", { name: "Photo du dossier : principal.webp" })).toBeVisible();
    await mkdir("output/playwright/iphone-photos", { recursive: true });
    await page.screenshot({ path: "output/playwright/iphone-photos/heif-viewer.png" });
    expect(errors).toEqual([]);
  } finally { await testControl("worker-stop"); await clearActorContext(page); await removeActor(actor); }
});

test("iPhone photos: batch retry keeps successes and handles a lost acknowledgement at ten slots", async ({ page }) => {
  test.setTimeout(180_000);
  const actor = await createActor("manager");
  try {
    await signIn(page, actor); await testControl("worker-start");
    const project = await createDevelopment(page);
    for (let index = 0; index < 8; index++) expect((await staffCommand(page, "documents", { parent_kind: "development", parent_id: project.id, purpose: "photo", filename: `reserve-${index}.webp`, mime_type: "image/webp", size_bytes: 100 })).status()).toBe(200);
    await page.reload();
    const gallery = await openPhotos(page);
    await expect(gallery.getByText("8 / 10 photos", { exact: true })).toBeVisible();
    const image = await png();
    const payload = (name: string) => ({ name, mimeType: "image/png", buffer: image });
    const form = await openBatch(gallery);
    await selectBatch(form, [payload("one.png"), payload("two.png"), payload("three.png")]);
    await expect(gallery.getByRole("alert")).toContainText("places disponibles");
    expect((await (await page.request.get(`/api/v1/documents?parent_kind=development&parent_id=${project.id}&purpose=photo`)).json()).total).toBe(8);
    let puts = 0;
    page.on("request", request => { if (request.method() === "PUT" && request.url().includes("/transfers/")) puts++; });
    await page.evaluate(() => {
      const open = XMLHttpRequest.prototype.open;
      let transfers = 0;
      XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
        const result = Reflect.apply(open, this, [method, url, ...rest]);
        if (method === "PUT" && String(url).includes("/transfers/") && ++transfers === 2) this.addEventListener("load", event => {
          if (this.status !== 200) return;
          event.stopImmediatePropagation(); this.dispatchEvent(new Event("error"));
        }, { once: true });
        return result;
      } as typeof open;
    });
    await selectBatch(form, [payload("one.png"), payload("two.png")]);
    await sendBatch(form);
    await expect(gallery.getByRole("alert")).toBeVisible();
    await expect(form.getByText(/1 \/ 2 photos envoyées/)).toBeVisible();
    await gallery.getByRole("button", { name: "Réessayer", exact: true }).tap();
    await expect(gallery.getByText(/2 photos envoyées/)).toBeVisible();
    await expect(gallery.getByText("Analyse réussie", { exact: true })).toHaveCount(2, { timeout: 60_000 });
    expect(puts).toBe(2);
    const result = await (await page.request.get(`/api/v1/documents?parent_kind=development&parent_id=${project.id}&purpose=photo`)).json();
    expect(result.total).toBe(10);
    expect(result.items.filter((item: { versions: unknown[] }) => item.versions.length).every((item: { versions: unknown[] }) => item.versions.length === 1)).toBe(true);
    await geometry(page);
  } finally { await testControl("worker-stop"); await clearActorContext(page); await removeActor(actor); }
});

test("iPhone photos: cancelled conversion keeps the remaining selection for retry", async ({ page }) => {
  test.setTimeout(120_000);
  const actor = await createActor("agent");
  try {
    await signIn(page, actor); await testControl("worker-start");
    await createDevelopment(page);
    await page.evaluate(() => {
      const bitmap = window.createImageBitmap.bind(window);
      let first = true;
      window.createImageBitmap = ((image: ImageBitmapSource) => {
        if (!first) return bitmap(image);
        first = false;
        return new Promise<ImageBitmap>(resolve => { Object.assign(window, { releaseSyntheticPhoto: () => bitmap(image).then(resolve) }); });
      }) as typeof createImageBitmap;
    });
    const gallery = await openPhotos(page);
    const form = await openBatch(gallery);
    await selectBatch(form, [{ name: "one.png", mimeType: "image/png", buffer: await png() }, { name: "two.png", mimeType: "image/png", buffer: await png() }]);
    await sendBatch(form);
    await gallery.getByRole("button", { name: "Interrompre", exact: true }).tap();
    await expect(gallery.getByRole("alert")).toBeVisible();
    await expect(form.getByText("2 fichiers sélectionnés", { exact: true })).toBeVisible();
    await page.evaluate(() => (window as unknown as { releaseSyntheticPhoto: () => void }).releaseSyntheticPhoto());
    await gallery.getByRole("button", { name: "Réessayer", exact: true }).tap();
    await expect(gallery.getByText("2 / 10 photos", { exact: true })).toBeVisible();
    await expect(gallery.getByText("Analyse réussie", { exact: true })).toHaveCount(2, { timeout: 60_000 });
  } finally { await testControl("worker-stop"); await clearActorContext(page); await removeActor(actor); }
});

test("iPhone photos: private contact attachments accept HEIC batches and preserve DOCX bytes", async ({ page }) => {
  test.setTimeout(180_000);
  const actor = await createActor("agent");
  const outsider = await createActor("agent");
  try {
    await signIn(page, actor); await testControl("worker-start");
    const lead = await createLead(page, "Photos privées synthétiques");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact;
    await page.goto(`/contacts/${contact.id}`);
    const panel = await openDocuments(page, "contact");
    await panel.getByRole("button", { name: "Ajouter un document", exact: true }).tap();
    const docx = await syntheticFile("clean-document");
    const input = page.getByRole("dialog", { name: "Ajouter un document", exact: true }).getByLabel("Fichier", { exact: true });
    await expect(input).toHaveAttribute("multiple", "");
    await input.setInputFiles([{ name: "prive.HEIC", mimeType: "", buffer: await readFile(source("synthetic-grid.heic")) }, docx]);
    await page.getByRole("button", { name: "Envoyer les fichiers", exact: true }).tap();
    await expect(page.getByText("Analyse réussie", { exact: true })).toHaveCount(2, { timeout: 60_000 });
    await downloadFile(page, docx.name, docx.buffer);
    await expect(panel.getByText("prive.webp", { exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, outsider);
    expect((await page.request.get(`/api/v1/documents?parent_kind=contact&parent_id=${contact.id}`)).status()).toBe(404);
  } finally { await testControl("worker-stop"); await clearActorContext(page); await removeActor(outsider); await removeActor(actor); }
});

test("iPhone photos: a full ten-photo agent batch fits the existing permit budget", async ({ page }) => {
  test.setTimeout(180_000);
  const actor = await createActor("agent");
  let permits = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/v1/files/permits") permits++; });
  try {
    await signIn(page, actor); await testControl("worker-start");
    const project = await createDevelopment(page);
    const gallery = await openPhotos(page);
    const buffer = await png();
    const form = await openBatch(gallery);
    await selectBatch(form, Array.from({ length: 10 }, (_, index) => ({ name: `piece-${index + 1}.png`, mimeType: "image/png", buffer })));
    await sendBatch(form);
    await expect(gallery.getByText("10 / 10 photos", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(gallery.getByText(/10 photos envoyées/)).toBeVisible();
    await expect(gallery.getByText("Analyse réussie", { exact: true })).toHaveCount(10, { timeout: 60_000 });
    await expect(gallery.getByRole("button", { name: /^Ouvrir la photo/ })).toHaveCount(10);
    await expect(gallery.getByRole("alert")).toHaveCount(0);
    // Let the separate cover-thumbnail refresh finish before measuring navigation.
    await page.waitForLoadState("networkidle");
    const beforeViewing = permits;
    const buttons = gallery.getByRole("button", { name: /^Ouvrir la photo/ });
    const names = await buttons.evaluateAll(items => items.map(item => item.getAttribute("aria-label")!.replace("Ouvrir la photo ", "")));
    await buttons.first().tap();
    const viewer = viewerFor(page);
    for (let index = 0; index < names.length; index++) {
      if (index) await viewer.getByRole("button", { name: "Suivante", exact: true }).tap();
      await expect(viewer.getByRole("img", { name: `Photo du dossier : ${names[index]}`, exact: true })).toBeVisible();
    }
    expect(permits).toBe(beforeViewing);
    await viewer.getByRole("button", { name: "Fermer la photo", exact: true }).tap();
    const documents = await (await page.request.get(`/api/v1/documents?parent_kind=development&parent_id=${project.id}&purpose=photo`)).json();
    expect(documents.total).toBe(10);
    expect(documents.items.every((item: { versions: unknown[] }) => item.versions.length === 1)).toBe(true);
    await gallery.scrollIntoViewIfNeeded();
    await mkdir("output/playwright/iphone-photos", { recursive: true });
    await page.screenshot({ path: "output/playwright/iphone-photos/full-batch.png" });
    await geometry(page);
  } finally { await testControl("worker-stop"); await clearActorContext(page); await removeActor(actor); }
});
