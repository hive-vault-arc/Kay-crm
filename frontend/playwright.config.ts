import { defineConfig, devices } from "@playwright/test";
import { testPorts } from "./scripts/test-ports.mjs";

// AI error snapshots can expose password values even with traces/screenshots off.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

const externalServer = process.env.PLAYWRIGHT_BASE_URL;
const productionSmoke = process.env.KAY_E2E_PRODUCTION === "1";
const ports = testPorts();
const frontendOrigin = `https://localhost:${ports.frontend}`;
const apiOrigin = `https://localhost:${ports.api}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 60_000, // Multi-actor real-stack cases include CLI fixtures and process restart.
  reporter: [["./scripts/private-reporter.ts"], ["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: externalServer ?? frontendOrigin,
    ignoreHTTPSErrors: true, // Disposable synthetic contexts only; server TLS stays verified.
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
    trace: "off", // Auth traces include secrets/cookies; capture only explicit safe screenshots.
    screenshot: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: externalServer
    ? undefined
    : [{
        command: "node scripts/test-api.mjs",
        url: `${apiOrigin}/api/v1/health/live`,
        ignoreHTTPSErrors: true,
        reuseExistingServer: false,
        timeout: 60_000,
      }, {
        command: productionSmoke ? `npm run start -- --port ${ports.frontend}` : `npm run dev -- --port ${ports.frontend}`,
        url: `${frontendOrigin}/login`,
        ignoreHTTPSErrors: true,
        reuseExistingServer: false,
        timeout: 120_000,
        env: { KAY_UI_CHECKS: productionSmoke ? "0" : "1", NEXT_TELEMETRY_DISABLED: "1", API_BASE_URL: apiOrigin, FRONTEND_ORIGIN: frontendOrigin },
      }],
});
