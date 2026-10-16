import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { DevelopmentRecord } from "@/features/inventory/development-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Programme immobilier" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const route = `/projects/${id}`;
  const identity = await requireIdentity(route);
  if (identity.state !== "authenticated") return <AuthUnavailable path={route} />;
  const typeId = z.uuid().safeParse(query.unit_type_id);
  const blockId = z.uuid().safeParse(query.block_id); const floorId = z.uuid().safeParse(query.floor_id);
  return <DevelopmentRecord id={id} role={identity.profile.user.role} initialTab={typeof query.tab === "string" ? query.tab : undefined} blockId={blockId.success ? blockId.data : undefined} floorId={floorId.success ? floorId.data : undefined} unitTypeId={typeId.success ? typeId.data : undefined} />;
}
