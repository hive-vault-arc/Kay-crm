import { z } from "zod";

export const columnPreferenceSchema = z
  .object({
    version: z.literal(1),
    list: z.enum(["enquiries", "deals"]),
    visibleColumns: z
      .array(
        z.enum([
          "name",
          "status",
          "responsibleAgent",
          "nextAction",
          "updatedAt",
          "source",
          "receivedAt",
          "message",
          "budget", "rating", "country", "languages", "email", "provenance", "projects",
        ]),
      )
      .max(16)
      .refine(values => new Set(values).size === values.length),
  })
  .strict();
export type ColumnPreference = z.infer<typeof columnPreferenceSchema>;

// Presentation metadata only; never a record projection or permission grant.
export function parseColumnPreference(value: unknown): ColumnPreference | null {
  const result = columnPreferenceSchema.safeParse(value);
  return result.success ? result.data : null;
}
