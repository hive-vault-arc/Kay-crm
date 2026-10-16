import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testDir: "./tests",
  testMatch: /review\/(chrome|acceptance.chrome)\.spec\.ts/,
  projects: [{ name: "chrome-visible-final", use: { ...devices["Desktop Chrome"], channel: "chrome", headless: false } }],
});
