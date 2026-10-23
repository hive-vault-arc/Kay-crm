import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";
import { generateKeyPairSync } from "node:crypto";

// Ephemeral test-only keys stay in child environments, never in reports or fixtures.
const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const publicJwk = pair.publicKey.export({ format: "jwk" });
process.env.VAPID_PRIVATE_KEY = pair.privateKey.export({ format: "der", type: "pkcs8" }).toString("base64url");
process.env.VAPID_PUBLIC_KEY = Buffer.concat([
  Buffer.from([4]), Buffer.from(publicJwk.x!, "base64url"), Buffer.from(publicJwk.y!, "base64url"),
]).toString("base64url");
process.env.VAPID_SUBJECT = "mailto:synthetic@example.com";
process.env.WEB_PUSH_ENABLED = "true";

export default defineConfig({
  ...base,
  testDir: "./tests/realtime",
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", headless: false } }],
  webServer: Array.isArray(base.webServer) ? base.webServer.map(server => ({
    ...server, env: { ...server.env, REALTIME_ENABLED: "true", NEXT_PUBLIC_KAY_REALTIME_RELEASED: "1" },
  })) : base.webServer,
});
