import type { StaffRole } from "@/features/contacts/contracts";

export type HelpCategory = "start" | "crm" | "inventory" | "work" | "manage" | "trouble";
export type HelpArticle = {
  slug: string;
  category: HelpCategory;
  title: string;
  summary: string;
  keywords: string[];
  roles?: StaffRole[];
  sections: { title: string; steps?: string[]; paragraphs?: string[]; note?: string }[];
  related: string[];
  action?: { label: string; href: string };
};
