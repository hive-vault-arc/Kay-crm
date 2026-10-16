import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  forbidOnly: true,
  testDir: "./tests",
  testMatch: ["**/e2e/**/*.spec.ts", "**/review/iconsax.chrome.spec.ts"],
  projects: [{
    name: "ci-chromium",
    use: { ...devices["Desktop Chrome"] },
    grepInvert: /live shadcn\/RHF\/Zod\/table/,
  }],
});
