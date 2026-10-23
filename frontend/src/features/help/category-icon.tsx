import { AlertIcon, ContactIcon, ContactsIcon, PropertyIcon, CalendarIcon, SettingsIcon } from "@/components/icons";
import type { HelpCategory } from "./types";

export const helpCategoryIcons = { start: ContactIcon, crm: ContactsIcon, inventory: PropertyIcon, work: CalendarIcon, manage: SettingsIcon, trouble: AlertIcon } satisfies Record<HelpCategory, typeof AlertIcon>;
