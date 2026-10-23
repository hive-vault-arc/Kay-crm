export function currentRecord<T extends { id: string; version: number }>(remote: T | undefined, local: T | undefined, requestedId: string): T | undefined {
  // Related contact/stock projections can change without advancing this record's version.
  return local?.id === requestedId && (!remote || (local.id === remote.id && local.version > remote.version)) ? local : remote;
}
