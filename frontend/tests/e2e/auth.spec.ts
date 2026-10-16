import { randomBytes } from "node:crypto";
import { test, expect, signIn, createActor, removeActor, changeActor } from "../helpers/auth";
import { apiProcess } from "../helpers/api-process";

test("AT-26/39: protected redirect, safe return, cookie, refresh, logout and replay", async ({ page, actor, browserName }, info) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login\?return_to=%2Fprojects$/);
  const loginResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/login") && response.request().method() === "POST");
  await signIn(page, actor, "/projects");
  const header = (await (await loginResponse).allHeaders())["set-cookie"] ?? "";
  // Discard the value before any assertion/reporting.
  const flags = header.includes(";") ? header.slice(header.indexOf(";") + 1).toLowerCase() : "";
  for (const flag of ["secure", "httponly", "samesite=lax", "path=/"]) expect(flags).toContain(flag);
  expect(flags.includes("domain=")).toBe(false);
  await expect(page).toHaveURL(/\/projects$/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projets");
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "__Host-kay_session");
  expect(Boolean(session)).toBe(true);
  if (!session) throw new Error("SESSION_COOKIE_MISSING");
  const attributes = { secure: session.secure, httpOnly: session.httpOnly, sameSite: session.sameSite,
    path: session.path, domain: session.domain, maximumDays: (session.expires - Date.now() / 1000) / 86400 };
  const nativeWindowsWebkit = browserName === "webkit" && process.platform === "win32";
  if (nativeWindowsWebkit) info.annotations.push({ type: "platform limitation", description:
    "Native Windows WebKit reports SameSite=None even for Lax; exact Set-Cookie=Lax verified. Upstream tests/library/browsercontext-cookies.spec.ts marks this reporting case expected-failure. Actual Safari remains unverified." });
  expect({ secure: attributes.secure, httpOnly: attributes.httpOnly, sameSite: attributes.sameSite,
    path: attributes.path, domain: attributes.domain }).toEqual({ secure: true, httpOnly: true,
    sameSite: nativeWindowsWebkit ? "None" : "Lax", path: "/", domain: "localhost" });
  expect(attributes.maximumDays).toBeGreaterThan(0);
  expect(attributes.maximumDays).toBeLessThanOrEqual(7);
  expect(await page.evaluate(() => ({ cookieVisible: document.cookie.includes("kay_session"), local: localStorage.length, session: sessionStorage.length })))
    .toEqual({ cookieVisible: false, local: 0, session: 0 });
  const profile = await page.request.get("/api/v1/auth/me");
  expect(profile.status()).toBe(200);
  expect((await profile.json()).session_token === undefined).toBe(true);
  const denied = await page.request.post("/api/v1/auth/logout", { headers: { Origin: new URL(page.url()).origin }, data: {} });
  expect(denied.status()).toBe(403);
  await page.getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?signed_out=1$/);
  expect((await page.context().cookies()).some((cookie) => cookie.name === "__Host-kay_session")).toBe(false);
  const replay = await page.request.get("/api/v1/auth/me", { headers: { Cookie: `__Host-kay_session=${session.value}` } });
  expect(replay.status()).toBe(401);
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login\?return_to=/);
  await page.goto("/login?return_to=https%3A%2F%2Fforeign.example%2Fprivate");
  await signIn(page, actor, "//foreign.example/private");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("AT-23/39: keyboard form validation, generic invalid feedback and safe retry", async ({ page, actor }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page.getByText("Saisissez une adresse e-mail valide.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Adresse e-mail", { exact: true })).toBeFocused();
  await page.getByLabel("Adresse e-mail", { exact: true }).fill(actor.email);
  try { await page.getByLabel("Mot de passe", { exact: true }).fill(randomBytes(24).toString("base64url")); }
  catch { throw new Error("SYNTHETIC_PASSWORD_INPUT_FAILED"); }
  let release!: () => void;
  const submission = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/auth/login", async (route) => {
    await submission;
    await route.continue(); // Delay only; no fake auth response or credential capture.
  });
  try {
    await page.getByRole("button", { name: "Se connecter", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Connexion en cours…", exact: true })).toBeDisabled();
    await expect(page.getByLabel("Adresse e-mail", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Mot de passe", { exact: true })).toBeDisabled();
  } finally { release(); }
  await expect(page.getByRole("alert").filter({ hasText: "Adresse e-mail ou mot de passe incorrect." })).toBeVisible();
  await page.unroute("**/api/v1/auth/login");
  expect(await page.getByLabel("Mot de passe", { exact: true }).inputValue() === "").toBe(true);
  expect(await page.getByLabel("Adresse e-mail", { exact: true }).inputValue() === actor.email).toBe(true);
  await signIn(page, actor);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("AT-02/39: current role, expiration and revocation reject later navigation", async ({ page }) => {
  for (const action of ["role", "expire", "revoke"] as const) {
    const actor = await createActor();
    try {
      await signIn(page, actor);
      await changeActor(actor, action);
      await page.goto("/deals");
      await expect(page).toHaveURL(/\/login\?return_to=/);
      expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
    } finally { await removeActor(actor); }
  }
});

test("AT-39: agent/manager Settings denial, scoped empty dashboard, shared Projects", async ({ page }) => {
  for (const role of ["agent", "manager"]) {
    const actor = await createActor(role);
    try {
      await signIn(page, actor);
      await expect(page.getByText(role === "agent"
        ? "Le travail affiché concerne uniquement vos dossiers attribués ou partagés."
        : "Le travail affiché respecte vos droits sur les dossiers de l’équipe.")).toBeVisible();
      await expect(page.getByText("Paramètres", { exact: true })).toHaveCount(0);
      await page.goto("/settings");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Accès non autorisé");
      await page.goto("/projects");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projets");
      await page.getByRole("button", { name: "Se déconnecter", exact: true }).click();
      await expect.poll(() => page.url().includes("/login?signed_out=1")).toBe(true);
    } finally { await removeActor(actor); }
  }
});

test("AT-37/38 scoped: restricted change, validation and required fresh login", async ({ page }) => {
  const actor = await createActor("agent", true);
  const replacement = randomBytes(24).toString("base64url");
  try {
    await signIn(page, actor);
    await expect(page).toHaveURL(/\/change-password$/);
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/change-password$/);
    await page.getByRole("button", { name: "Changer le mot de passe", exact: true }).click();
    await expect(page.getByText("Choisissez au moins 12 caractères.", { exact: true })).toBeVisible();
    try {
      await page.getByLabel("Mot de passe actuel", { exact: true }).fill(actor.password);
      await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(replacement);
      await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill(replacement);
    } catch { throw new Error("SYNTHETIC_PASSWORD_CHANGE_INPUT_FAILED"); }
    await page.getByRole("button", { name: "Changer le mot de passe", exact: true }).click();
    await expect(page).toHaveURL(/\/login\?changed=1$/);
    await expect(page.getByRole("status")).toContainText("Mot de passe modifié.");
    await signIn(page, { ...actor, password: replacement });
    await expect(page).toHaveURL(/\/dashboard$/);
  } finally { await removeActor(actor); }
});

test("AT-26: login Origin, exact route/body allowlists and request throttling", async ({ page, actor }) => {
  await page.goto("/login");
  const origin = new URL(page.url()).origin;
  const candidate = randomBytes(24).toString("base64url");
  expect((await page.request.post("/api/v1/auth/login", { headers: { Origin: "https://foreign.example" }, data: { email: actor.email, password: candidate } })).status()).toBe(403);
  expect((await page.request.post("/api/v1/auth/bootstrap", { data: {} })).status()).toBe(404);
  expect((await page.request.post("/api/v1/auth/login", { headers: { Origin: origin }, data: { email: actor.email, password: candidate, role: "administrator" } })).status()).toBe(422);
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await page.request.post("/api/v1/auth/login", { headers: { Origin: origin }, data: { email: actor.email, password: candidate } });
    expect(response.status()).toBe(401);
  }
  const limited = await page.request.post("/api/v1/auth/login", { headers: { Origin: origin }, data: { email: actor.email, password: candidate } });
  expect(limited.status()).toBe(429);
  expect((await limited.json()).error.code).toBe("RATE_LIMITED");
});

test("AT-23/26: real auth outage preserves cookie, denies private UI and recovers", async ({ page, actor }) => {
  await signIn(page, actor);
  try {
    await apiProcess("stop");
    await page.reload();
    await expect(page.getByText("Connexion au service indisponible", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toHaveCount(0);
    expect((await page.context().cookies()).some((cookie) => cookie.name === "__Host-kay_session")).toBe(true);
  } finally { await apiProcess("start"); }
  await expect.poll(async () => (await page.request.get("/api/v1/health/ready")).status()).toBe(200);
  await page.getByRole("link", { name: "Réessayer", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tableau de bord");
  await page.getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await expect.poll(() => page.url().includes("/login?signed_out=1")).toBe(true);
  try {
    await apiProcess("stop");
    await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeEnabled();
    try {
      await page.getByLabel("Adresse e-mail", { exact: true }).fill(actor.email);
      await page.getByLabel("Mot de passe", { exact: true }).fill(actor.password);
    } catch { throw new Error("SYNTHETIC_LOGIN_INPUT_FAILED"); }
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();
    await expect(page.getByText("Le service local est indisponible. Vérifiez son démarrage, puis réessayez.", { exact: true })).toBeVisible();
    expect(await page.getByLabel("Mot de passe", { exact: true }).inputValue() === "").toBe(true);
  } finally { await apiProcess("start"); }
  await expect.poll(async () => (await page.request.get("/api/v1/health/ready")).status()).toBe(200);
  await signIn(page, actor);
});
