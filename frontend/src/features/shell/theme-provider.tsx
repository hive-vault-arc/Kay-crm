"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { parseThemePreference, resolveThemePreference, themePreferenceCookie, type ThemePreference } from "@/lib/theme-preference";

export type { ThemePreference } from "@/lib/theme-preference";
const ThemeContext = createContext<{ preference: ThemePreference; setPreference: (value: ThemePreference) => void }>({ preference: "system", setPreference() {} });
export const useWorkspaceTheme = () => useContext(ThemeContext);
export function ThemeProvider({ initialPreference, children }: { initialPreference: ThemePreference; children: ReactNode }) {
  const [preference, setState] = useState(initialPreference);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = resolveThemePreference(preference, media.matches) === "dark";
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);
  function setPreference(value: ThemePreference) {
    setState(parseThemePreference(value));
    // Non-sensitive appearance preference only; authorization never reads this cookie.
    document.cookie = themePreferenceCookie(value, location.protocol === "https:");
  }
  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}
