import { DashboardIcon, DealIcon, DevelopmentIcon, CalendarIcon, ContactsIcon, HelpIcon } from "@/components/icons";
import type { HelpCategory } from "./types";

export const helpCategoryIcons = { start: DashboardIcon, crm: DealIcon, inventory: DevelopmentIcon, work: CalendarIcon, manage: ContactsIcon, trouble: HelpIcon } satisfies Record<HelpCategory, typeof HelpIcon>;
