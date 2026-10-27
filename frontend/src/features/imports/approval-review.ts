import { approveSchema, countsSchema, type Batch } from "./contracts";

export function approvalReview(batch: Batch) {
  const counts = countsSchema.safeParse(batch.counts);
  const body = approveSchema.safeParse({ preview_hash: batch.preview_hash, fallback_agent_id: batch.fallback_agent_id });
  if (batch.state !== "previewed" || !batch.file_hash || !counts.success || counts.data.invalid !== 0 || !body.success) return undefined;
  return { batchId: batch.id, filename: batch.filename, version: batch.version, fileHash: batch.file_hash, counts: { ...counts.data }, body: body.data };
}
export type ApprovalReview = NonNullable<ReturnType<typeof approvalReview>>;
export function sameApprovalReview(review: ApprovalReview, batch?: Batch) {
  const current = batch && approvalReview(batch);
  return Boolean(current && review.batchId === current.batchId && review.version === current.version && review.fileHash === current.fileHash
    && review.body.preview_hash === current.body.preview_hash && review.body.fallback_agent_id === current.body.fallback_agent_id
    && Object.entries(review.counts).every(([key, value]) => value === current.counts[key as keyof typeof current.counts]));
}
