import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { searchPageQuerySchema } from "@/features/discovery/contracts";
import { SearchWorkspace } from "@/features/discovery/search-workspace";
import { searchPageHref } from "@/features/discovery/search-model";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Recherche" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const identity = await requireIdentity("/search");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/search" />;
  const params = await searchParams, parsed = searchPageQuerySchema.safeParse(params);
  const initial = parsed.success ? parsed.data : undefined;
  const invalid = Object.keys(params).length > 0 && !parsed.success;
  return <><PageHeader title="Recherche" description="Retrouvez vos fiches, biens et documents accessibles." route="/search" /><SearchWorkspace key={initial ? searchPageHref(initial) : invalid ? "invalid" : "empty"} initial={initial} invalidQuery={invalid} /></>;
}
