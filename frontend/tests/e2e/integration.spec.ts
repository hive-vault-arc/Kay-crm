import { expect, signedInTest as test } from "../helpers/auth";
import { apiProcess } from "../helpers/api-process";

test("SP-02: real HTTPS facade readiness, API stop/restart, keyboard recovery @integration", async ({ page, request }) => {
  const failures: string[] = [];
  const developmentSockets = { frames: 0, errors: 0 };
  page.on("websocket", socket => {
    const url = new URL(socket.url());
    if (!url.pathname.startsWith("/_next/")) return;
    expect(url.protocol).toBe("wss:");
    socket.on("framereceived", () => { developmentSockets.frames++; });
    socket.on("socketerror", () => { developmentSockets.errors++; });
  });
  const businessRequests: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("request", (outgoing) => {
    if (outgoing.url().includes("/api/")) {
      businessRequests.push(outgoing.url());
      expect(outgoing.headers()["x-kay-facade-secret"] === undefined).toBe(true);
      expect(outgoing.url()).not.toContain(":8100");
    }
  });
  let release!: () => void;
  const pendingRequest = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/health/ready", async (route) => {
    await pendingRequest;
    await route.continue(); // Delay only; the real HTTPS facade/API still supplies the result.
  });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Vérification du service local…", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Vérifier à nouveau" })).toBeDisabled();
  const readinessResponse = page.waitForResponse(outgoing =>
    outgoing.url().endsWith("/api/v1/health/ready") && outgoing.request().method() === "GET",
  );
  release();
  expect((await readinessResponse).status()).toBe(200);
  await expect(page.getByText("Service local disponible", { exact: true })).toBeVisible();
  if (process.env.KAY_E2E_PRODUCTION !== "1") {
    await expect.poll(() => developmentSockets.frames).toBeGreaterThan(0);
    expect(developmentSockets.errors).toBe(0);
  }
  await page.unroute("**/api/v1/health/ready");
  const response = await request.get("/api/v1/health/ready");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ready" });
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  const unknown = await request.get("/api/v1/not-implemented");
  expect(unknown.status()).toBe(404);
  const query = await request.get("/api/v1/health/ready?target=external");
  expect(query.status()).toBe(422);
  try {
    await apiProcess("stop");
    const retry = page.getByRole("button", { name: "Vérifier à nouveau" });
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Service local indisponible", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Connexion au service", exact: true }).getByText("Le service local est indisponible. Vérifiez son démarrage, puis réessayez.", { exact: true })).toBeVisible();
    expect((await request.get("/api/v1/health/ready")).status()).toBe(503);
  } finally {
    await apiProcess("start");
  }
  await expect.poll(async () => (await request.get("/api/v1/health/ready")).status()).toBe(200);
  await page.getByRole("button", { name: "Vérifier à nouveau" }).click();
  await expect(page.getByText("Service local disponible", { exact: true })).toBeVisible();
  for (const width of [320, 360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(businessRequests.length).toBeGreaterThan(0);
  expect(failures).toEqual([]);
});
