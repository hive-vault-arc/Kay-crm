import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export const cumulative = /SP22:|AT-26\/39: protected|SP04 AT-01\/02\/38:|SP05 AT-03\/23\/39: international|SP06 AT-05:|SP08: mixed hierarchy|SP09 AT-06\/26\/35:|SP10 AT-07\/08\/36:|SP11 AT-12\/39|SP12 AT-09\/33|SP13 AT-12\/13\/14\/34|SP14 AT-16\/40: working policy|SP15 AT-17\/23: task creation|SP16 AT-13\/14\/15\/23|SP17 AT-18\/36\/39|SP18 AT-20\/23|SP19 AT22\/24\/29|SP20 AT22\/30/;

export default defineConfig({
  ...base,
  projects: [
    { name: "chrome-final", use: { ...devices["Desktop Chrome"], channel: "chrome", headless: false }, grepInvert: /live shadcn\/RHF\/Zod\/table/ },
    { name: "edge-final", use: { ...devices["Desktop Edge"], channel: "msedge" }, grep: cumulative },
    { name: "mobile-chromium-final", use: { ...devices["Pixel 7"], browserName: "chromium" }, grep: cumulative },
    { name: "mobile-webkit-final", use: { ...devices["iPhone 13"], browserName: "webkit" }, grep: cumulative },
  ],
});
