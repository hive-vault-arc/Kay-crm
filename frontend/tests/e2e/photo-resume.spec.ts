import path from "node:path";
import { mkdir } from "node:fs/promises";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { createDevelopment } from "../helpers/developments";
import { staffCommand } from "../helpers/leads";
import { choosePhoto, openPhotos } from "../helpers/photos";
import { geometry } from "../helpers/report-review";

test("photo recovery: own agent uploads resume after reload with ten existing photos", async ({ page }) => {
  test.setTimeout(180_000);
  const agent = await createActor("agent");
  const colleague = await createActor("agent");
  const manager = await createActor("manager");
  try {
    await signIn(page, agent);
    const project = await createDevelopment(page);
    const gallery = await openPhotos(page);
    const fixture = path.resolve("tests/fixtures/projects-reference/patio.png");
    await page.route("**/api/v1/files/permits", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }));
    const upload = await choosePhoto(page, fixture);
    await upload.getByRole("button", { name: "Ajouter la photo", exact: true }).click();
    await expect(gallery.getByRole("alert")).toBeVisible();
    const uri = `/api/v1/documents?parent_kind=development&parent_id=${project.id}&purpose=photo&page_size=10`;
    const before = await (await page.request.get(uri)).json();
    expect(before.total).toBe(1);
    expect(before.items[0].versions).toHaveLength(0);
    expect(before.items[0].can_upload).toBe(true);
    for (let index = 1; index < 10; index++) {
      const created = await staffCommand(page, "documents", { parent_kind: "development", parent_id: project.id, purpose: "photo", filename: `attente-${index}.webp`, mime_type: "image/webp", size_bytes: 100 });
      expect(created.status()).toBe(200);
    }
    await page.reload();
    await openPhotos(page);
    await expect(gallery.getByText("10 photos")).toBeVisible();
    await expect(gallery.getByRole("button", { name: "Ajouter une photo", exact: true })).toBeVisible();
    const own = gallery.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "patio.webp", exact: true }) });
    await own.getByRole("button", { name: "Reprendre", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(gallery.getByRole("button", { name: "Parcourir", exact: true })).toBeFocused();
    await expect(gallery.getByRole("button", { name: "Archiver", exact: true })).toHaveCount(0);
    await mkdir("output/playwright/local-bug-sweep", { recursive: true });
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await geometry(page, width === 1440 ? 40 : 44);
      await gallery.getByRole("button", { name: "Parcourir", exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `output/playwright/local-bug-sweep/resume-${width}.png` });
    }
    const resume = gallery.getByRole("form", { name: "Reprendre la photo", exact: true });
    await resume.getByLabel("Image à reprendre", { exact: true }).setInputFiles(fixture);
    await resume.getByRole("button", { name: "Reprendre", exact: true }).click();
    await expect(gallery.getByRole("alert")).toBeVisible();
    const after = await (await page.request.get(uri)).json();
    expect(after.total).toBe(10);
    expect(after.items.some((item: { id: string }) => item.id === before.items[0].id)).toBe(true);
    await clearActorContext(page); await signIn(page, colleague); await page.goto(project.path); await openPhotos(page);
    await expect(gallery.getByText("10 photos")).toBeVisible();
    await expect(gallery.getByRole("button", { name: "Reprendre", exact: true })).toHaveCount(0);
    expect((await (await page.request.get(uri)).json()).items.every((item: { can_upload: boolean }) => item.can_upload === false)).toBe(true);
    await clearActorContext(page); await signIn(page, manager); await page.goto(project.path); await openPhotos(page);
    await expect(gallery.getByRole("button", { name: "Reprendre", exact: true })).toHaveCount(10);
    await expect(gallery.getByRole("button", { name: "Archiver", exact: true })).toHaveCount(10);
  } finally {
    await clearActorContext(page);
    await removeActor(manager); await removeActor(colleague); await removeActor(agent);
  }
});
