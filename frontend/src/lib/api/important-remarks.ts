import { z } from "zod";

export const importantRemarksSchema = z.string().trim()
  .refine(value => [...value].length <= 1000, "Limitez les remarques à 1 000 caractères.")
  .transform(value => value || null)
  .nullable().optional();
