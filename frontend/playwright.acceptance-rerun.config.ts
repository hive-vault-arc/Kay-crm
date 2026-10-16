import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.acceptance.config";

const focus = /SP22: approved visible focus/;
const mobileStaff = /SP22: approved visible focus|SP04 AT-01\/02\/38:/;
const webkitRemainder = /SP22: approved visible focus|SP04 AT-01\/02\/38:|SP20 AT22\/30:|SP15 AT-17\/23: task creation/;

export default defineConfig({
  ...base,
  testDir: "./tests",
  projects: [
    ...(base.projects ?? []).map(project => ({
      ...project,
      testMatch: /e2e\/(focus|users|intake|work)\.spec\.ts$/,
      grep: project.name === "mobile-webkit-final" ? webkitRemainder : project.name === "mobile-chromium-final" ? mobileStaff : focus,
    })),
    {
      name: "chrome-visible-review",
      testMatch: /review\/(chrome|acceptance.chrome)\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], channel: "chrome", headless: false },
    },
  ],
});
