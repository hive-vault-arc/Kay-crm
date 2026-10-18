import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testDir: "./tests",
  testMatch: ["**/e2e/**/*.spec.ts", "**/review/**/*.spec.ts"],
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", headless: false } }],
});
