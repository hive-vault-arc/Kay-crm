import { searchPageQuerySchema, type SearchPageQuery } from "./contracts";

export function searchPageHref(query: SearchPageQuery) {
  const parsed = searchPageQuerySchema.safeParse(query);
  if (!parsed.success) return "/search";
  const params = new URLSearchParams({ q: parsed.data.q });
  if (parsed.data.kind) params.set("kind", parsed.data.kind);
  if (parsed.data.page && parsed.data.page > 1) params.set("page", String(parsed.data.page));
  return `/search?${params.toString().replace(/\+/g, "%20")}`;
}

export function searchFocusIndex(key: string, current: number, length: number): number | null {
  if (!length) return null;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  if (key === "ArrowDown") return current < 0 ? 0 : (current + 1) % length;
  if (key === "ArrowUp") return current < 0 ? length - 1 : (current - 1 + length) % length;
  return null;
}
