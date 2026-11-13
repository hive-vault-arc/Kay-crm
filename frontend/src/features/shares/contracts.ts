import { z } from "zod";

export type ShareKind = "property" | "development";
export const shareToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const pricePeriod = z.enum(["sale", "month", "year", "week", "day", "night"]);

const approvedInputs = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000),
  neighbourhood: z.string().trim().max(100),
  price_mad: z.string().regex(/^(?:[1-9][0-9]{0,15}(?:\.[0-9]{1,2})?|0\.(?:[1-9][0-9]?|0[1-9]))$/).nullable(),
  price_period: pricePeriod.nullable(),
}).strict();

const facts = approvedInputs.extend({
  kind: z.enum(["property", "development"]),
  category: z.enum(["apartment", "villa", "house", "land", "commercial", "riad", "room", "office", "farm", "mixed"]),
  area_sqm: z.string().regex(/^[0-9]+(\.[0-9]+)?$/).nullable(),
  rooms: z.number().int().positive().nullable(),
}).strict();

const snapshot = facts.extend({ photos: z.array(z.uuid()) }).strict();
const sharePhoto = z.object({
  id: z.uuid(), version: z.number().int().positive(), filename: z.string().max(180), version_id: z.uuid(),
}).strict();
export type SharePhoto = z.infer<typeof sharePhoto>;
const shareDraft = approvedInputs.pick({ title: true, description: true, neighbourhood: true }).extend({
  photos: z.array(sharePhoto),
}).strict();
export const publicListing = facts.extend({
  photos: z.array(z.number().int().min(0)),
}).strict();
export type ListingFacts = z.infer<typeof facts>;

export const listingShareState = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }).strict(),
  z.object({
    enabled: z.literal(true), can_approve: z.boolean(), active: z.boolean(),
    target_version: z.number().int().positive(), version: z.number().int().nonnegative(),
    snapshot: snapshot.nullable(),
    draft: shareDraft.optional(),
    links: z.array(z.object({ id: z.uuid(), expires_at: z.iso.datetime({ offset: true }) }).strict()).max(50),
  }).strict(),
]);
export type EnabledShare = Extract<z.infer<typeof listingShareState>, { enabled: true }>;

export const approveListing = approvedInputs.extend({
  photos: z.array(z.uuid()),
  target_version: z.number().int().positive(),
  expected_version: z.number().int().nonnegative(),
}).strict().refine(value => (value.price_mad === null) === (value.price_period === null));
export type Approval = z.infer<typeof approveListing>;
export const expectedShare = z.object({ expected_version: z.number().int().positive() }).strict();
export const shareSaved = z.object({ saved: z.literal(true) }).strict();
export const issuedShare = z.object({ token: shareToken, expires_at: z.iso.datetime({ offset: true }) }).strict();
