import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { openPhotos } from "../helpers/photos";

const run = promisify(execFile);
const backend = path.resolve("../backend");

test.use({ trace: "off", video: "off", screenshot: "off", hasTouch: true });

for (const [kind, extension, codec, mime, width] of [
  ["property", "mp4", "libx264", "video/mp4", 1280],
  ["development", "MOV", "libx265", "video/quicktime", 390],
] as const) {
  test(`Gallery uploads and plays ${extension} through the private video worker on ${kind}`, async ({ page }, info) => {
    test.skip(process.env.KAY_E2E_VIDEO_SMOKE !== "1", "Requires the isolated video flag and FFmpeg on PATH.");
    test.setTimeout(90_000);
    page.setDefaultTimeout(12_000);
    const filename = `visite-synthetique.${extension}`;
    const sample = info.outputPath(filename);
    await mkdir(path.dirname(sample), { recursive: true });
    await run("ffmpeg", ["-nostdin", "-v", "error", "-f", "lavfi", "-i", "color=size=96x160:rate=24", "-t", "1", "-c:v", codec, "-threads", "1", ...(extension === "MOV" ? ["-tag:v", "hvc1", "-x265-params", "pools=none:log-level=error"] : []), sample], { timeout: 15_000, windowsHide: true });
    const data = { name: filename, mimeType: mime, buffer: await readFile(sample) };
    const actor = await createActor("agent");
    try {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, actor);
      const reference = `SYN-VIDEO-${randomUUID().slice(0, 8)}`;
      const response = await staffCommand(page, kind === "property" ? "properties" : "developments", kind === "property"
        ? { reference, category: "house", marketing_name: "Bien vidéo synthétique", location: null, area_sqm: null }
        : { reference, category: "mixed", name: "Programme vidéo synthétique", location: null, briefing_text: null, developer_contact_id: null, developer_marketing_display: null });
      expect(response.status()).toBe(200);
      const record = await response.json();
      await page.goto(kind === "property" ? `/projects/properties/${record.property_id}` : `/projects/${record.development_id}`);
      const gallery = await openPhotos(page);
      const videoTab = gallery.getByRole("tab", { name: "Vidéos MP4 / MOV", exact: true });
      await expect(videoTab).toBeInViewport();
      await gallery.getByRole("button", { name: "Ajouter une photo", exact: true }).tap();
      await gallery.getByLabel("Photo à ajouter", { exact: true }).setInputFiles(data);
      await expect(gallery.getByRole("alert")).toHaveText("Pour envoyer un MP4 ou un MOV, ouvrez l’onglet Vidéos MP4 / MOV.");
      await videoTab.focus();
      await page.keyboard.press("Enter");
      const picker = gallery.getByLabel("Vidéo à ajouter", { exact: true });
      await expect(picker).toHaveAttribute("accept", ".mp4,.mov,video/mp4,video/quicktime");
      await expect(picker).toBeEnabled();
      await expect(gallery.getByRole("button", { name: "Lire la vidéo", exact: true })).toHaveCount(0);
      await page.screenshot({ path: info.outputPath("gallery-video-picker.png") });
      await picker.setInputFiles(data);
      await gallery.getByRole("tab", { name: "Photos", exact: true }).tap();
      const discard = page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true });
      await discard.getByRole("button", { name: "Continuer la modification", exact: true }).tap();
      await gallery.getByRole("button", { name: "Ajouter la vidéo", exact: true }).tap();
      await expect(gallery.getByText("Vidéo envoyée.", { exact: false })).toBeVisible();
      await run(path.join(backend, ".venv", "Scripts", "python.exe"), ["-m", "app.cli.video_worker", "--once"], {
        cwd: backend, env: { ...process.env, APP_ENVIRONMENT: "test", INVENTORY_VIDEO_ENABLED: "true" }, timeout: 30_000, windowsHide: true,
      });
      await gallery.getByRole("button", { name: "Lire la vidéo", exact: true }).tap({ timeout: 25_000 });
      const media = gallery.locator("video");
      await expect(media).toHaveAttribute("playsinline", "");
      await expect.poll(() => media.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(1);
      const videoSize = await media.evaluate((element: HTMLVideoElement) => [element.videoWidth, element.videoHeight]);
      expect(videoSize).toEqual([96, 160]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await clearActorContext(page); await removeActor(actor); }
  });
}
