import { apiCommand } from "@/lib/api/command";
import { ticketSchema } from "./contracts";

let pending: ReturnType<typeof load> | undefined;
function load(key: string) {
  return apiCommand("/api/v1/realtime/tickets", {}, ticketSchema, key);
}

export function requestTicket(key: string) {
  // Strict Mode remounts share the same pending proof instead of abandoning tickets.
  if (!pending) pending = load(key).finally(() => { pending = undefined; });
  return pending;
}
