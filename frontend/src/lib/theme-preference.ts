export type ThemePreference = "light" | "dark" | "system";
export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolveThemePreference(preference: ThemePreference, darkSystem: boolean): "light" | "dark" {
  return preference === "dark" || preference === "system" && darkSystem ? "dark" : "light";
}
export function themePreferenceCookie(value: unknown, secure: boolean): string {
  return `kay-ui-theme=${parseThemePreference(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}
