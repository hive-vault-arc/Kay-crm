const missing = "Non renseigné";
export const businessTimeZone = "Africa/Casablanca";

export function formatMAD(amount: string | null): string {
  if (amount === null) return missing;
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) throw new TypeError("INVALID_MONEY");
  const integer = new Intl.NumberFormat("fr-FR").format(BigInt(match[2]));
  return `${match[1]}${integer},${(match[3] ?? "").padEnd(2, "0")} MAD`;
}

export function formatBusinessDate(value: string | null): string {
  if (value === null) return missing;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("INVALID_DATE");
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new TypeError("INVALID_DATE");
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function formatInstant(value: string | null): string {
  if (value === null) return missing;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value))
    throw new TypeError("INVALID_INSTANT");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("INVALID_INSTANT");
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: businessTimeZone,
  }).format(date);
}

// Country-aware phone validation/normalization belongs to the SP-05 backend.
export function formatPhone(canonical: string | null): string {
  return canonical ?? missing;
}
