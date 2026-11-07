import { randomUUID } from "node:crypto";
import { clearActorContext, expect, signIn, test } from "../helpers/auth";

type ProbeWindow = Window & { __kayExportCancellationProbe?: { original: typeof fetch; started: boolean; aborted: boolean } };
test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared/typechecked frontend fault cases only. List metadata is simulated;
// the permit is held then aborted. No worker, successful permit or CSV bytes.
for (const width of [390, 1440]) test(`Selected export history cancels a pending permit after current list denial at ${width}px`, async ({ page, actor }) => {
  let deny = false, release: (() => void) | undefined, downloads = 0;
  const held = new Promise<void>(resolve => { release = resolve; }), id = randomUUID();
  try {
    await signIn(page, actor); await page.setViewportSize({ width, height: 900 });
    await page.route(/\/api\/v1\/exports\?/, route => route.fulfill({ status: deny ? 403 : 200, contentType: "application/json", body: JSON.stringify(deny ? { error: { code: "FORBIDDEN" } } : { items: [{ id, kind: "enquiries", state: "ready", error_code: null, row_count: 0, size_bytes: 12, created_at: "2026-10-20T10:00:00Z", completed_at: "2026-10-20T10:01:00Z" }], total: 1, page: 1, page_size: 10, has_previous: false, has_next: false }) }));
    await page.route(`**/api/v1/exports/${id}/download-permit`, async route => { await held; await route.abort("failed").catch(() => {}); });
    await page.goto("/leads?view=exports");
    await page.evaluate(() => {
      const host = window as ProbeWindow, probe = { original: window.fetch, started: false, aborted: false }; host.__kayExportCancellationProbe = probe;
      window.fetch = (input, init) => {
        const address = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (new URL(address, location.href).pathname.endsWith("/download-permit")) { probe.started = true; init?.signal?.addEventListener("abort", () => { probe.aborted = true; }, { once: true }); }
        return probe.original.call(window, input, init);
      };
    });
    page.on("download", () => { downloads++; });
    const history = page.getByRole("region", { name: "Historique de mes exports", exact: true });
    await history.getByRole("button", { name: /^Télécharger le CSV / }).click();
    await expect.poll(() => page.evaluate(() => Boolean((window as ProbeWindow).__kayExportCancellationProbe?.started))).toBe(true);
    deny = true; await page.evaluate(() => window.dispatchEvent(new CustomEvent("kay:live-invalidate", { detail: ["exports"] })));
    await expect.poll(() => page.evaluate(() => Boolean((window as ProbeWindow).__kayExportCancellationProbe?.aborted))).toBe(true);
    await expect(history.getByRole("alert")).toBeVisible(); await expect(history.getByRole("button", { name: /^Télécharger le CSV / })).toHaveCount(0);
    release?.(); await expect(history.getByText("CSV téléchargé. Vérifiez son contenu avant de le partager.", { exact: true })).toHaveCount(0); expect(downloads).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally {
    release?.(); if (!page.isClosed()) await page.evaluate(() => { const host = window as ProbeWindow, probe = host.__kayExportCancellationProbe; if (probe) window.fetch = probe.original; delete host.__kayExportCancellationProbe; });
    await clearActorContext(page);
  }
});
