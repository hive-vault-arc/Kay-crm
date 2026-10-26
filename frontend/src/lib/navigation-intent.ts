export function navigationIntent({ href, current, target, download, modified }: {
  href: string; current: string; target?: string | null; download?: boolean; modified?: boolean;
}): string | null {
  if (modified || download || target && target !== "_self") return null;
  try {
    const next = new URL(href, current), previous = new URL(current);
    if (!["http:", "https:"].includes(next.protocol)) return null;
    if (next.origin === previous.origin && next.pathname === previous.pathname && next.search === previous.search) return null;
    return next.href;
  } catch { return null; }
}
