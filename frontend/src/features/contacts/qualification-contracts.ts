import { z } from "zod";

export const campaignLabels = {
  broker: "Courtier", bureau_de_vente: "Bureau de vente", mubawab: "Mubawab",
  google_my_business: "Google My Business", snapchat: "Snapchat", tiktok: "TikTok",
  youtube: "YouTube", cold_call: "Prospection téléphonique", employee_referral: "Recommandation interne",
  external_referral: "Recommandation externe", facebook: "Facebook", google_advertisement: "Publicité Google",
  instagram: "Instagram", instagram_ads: "Publicité Instagram", landing_campaign_form: "Formulaire de campagne",
  partner: "Partenaire", web_form: "Formulaire du site", whatsapp_kay: "WhatsApp KAY",
  whatsapp_web_button: "Bouton WhatsApp du site", unknown: "Non renseignée",
} as const;
export const campaignSchema = z.enum(Object.keys(campaignLabels) as [keyof typeof campaignLabels, ...(keyof typeof campaignLabels)[]]);
export const ratingLabels = { cold: "Froid", warm: "Tiède", hot: "Chaud" } as const;
export const ratingSchema = z.enum(["cold", "warm", "hot"]);
export const languageLabels: Record<string, string> = { french: "Français", arabic: "Arabe", darija: "Darija", tamazight: "Tamazight", english: "Anglais", spanish: "Espagnol", dutch: "Néerlandais", german: "Allemand", italian: "Italien", russian: "Russe", chinese: "Chinois", japanese: "Japonais", korean: "Coréen", portuguese: "Portugais", turkish: "Turc", hindi: "Hindi", urdu: "Ourdou", bengali: "Bengali", persian: "Persan", malayalam: "Malayalam", tamil: "Tamoul", thai: "Thaï", vietnamese: "Vietnamien", swedish: "Suédois", danish: "Danois", norwegian: "Norvégien", other: "Autre" };
export const purchaseReasonLabels = {
  investment: "Investissement", residence: "Résidence principale", vacation_home: "Résidence secondaire",
  rental_income: "Revenus locatifs", business: "Usage professionnel", family_expansion: "Agrandissement familial",
  relocation: "Déménagement", other: "Autre",
} as const;
export const purchaseReasonSchema = z.enum(Object.keys(purchaseReasonLabels) as [keyof typeof purchaseReasonLabels, ...(keyof typeof purchaseReasonLabels)[]]);
export const profileFields = {
  country: z.string().regex(/^(?:[A-Z]{2})?$/), nationality: z.string().regex(/^(?:[A-Z]{2})?$/),
  languages: z.array(z.string().trim().min(1).max(60)).max(30),
};
const option = z.object({ value: z.string().min(1).max(160), label: z.string().min(1).max(160) }).strict();
export const qualificationMetadataSchema = z.object({
  countries: z.array(z.object({ code: z.string().regex(/^[A-Z]{2}$/), calling_code: z.string().regex(/^\+[1-9][0-9]{0,2}$/) }).strict()).max(300),
  languages: z.array(option).max(100), campaign_sources: z.array(option).max(30),
  budget_bands: z.array(option).max(20), purchase_reasons: z.array(option).max(20),
}).strict();
export type QualificationMetadata = z.infer<typeof qualificationMetadataSchema>;
