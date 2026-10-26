"use client";

import { MoonIcon, SunIcon, MonitorIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useHydrated } from "@/hooks/use-hydrated";
import { useWorkspaceTheme, type ThemePreference } from "./theme-provider";
import { useSyncExternalStore } from "react";
import { resolveThemePreference } from "@/lib/theme-preference";

const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
const subscribe = (changed: () => void) => { const media = matchMedia("(prefers-color-scheme: dark)"); media.addEventListener("change", changed); return () => media.removeEventListener("change", changed); };

export function ThemeControl() {
  const { preference, setPreference } = useWorkspaceTheme(), hydrated = useHydrated();
  const dark = resolveThemePreference(preference, useSyncExternalStore(subscribe, systemDark, () => false)) === "dark";
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={!hydrated} aria-label="Apparence" title="Apparence">{dark ? <MoonIcon size={20} aria-hidden="true" /> : <SunIcon size={20} aria-hidden="true" />}</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Apparence</DropdownMenuLabel><DropdownMenuRadioGroup value={preference} onValueChange={value => { if (["light", "dark", "system"].includes(value)) setPreference(value as ThemePreference); }}><DropdownMenuRadioItem value="light"><SunIcon size={16} aria-hidden="true" />Clair</DropdownMenuRadioItem><DropdownMenuRadioItem value="dark"><MoonIcon size={16} aria-hidden="true" />Sombre</DropdownMenuRadioItem><DropdownMenuRadioItem value="system"><MonitorIcon size={16} aria-hidden="true" />Système</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>;
}
