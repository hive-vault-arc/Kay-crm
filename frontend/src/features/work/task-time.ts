import type { Task } from "./contracts";

export function taskContext(task: Pick<Task, "deal_id" | "enquiry_id" | "contact_id">) {
  if (task.deal_id) return { href: `/deals/${task.deal_id}`, label: "Affaire" };
  if (task.enquiry_id) return { href: `/leads/${task.enquiry_id}`, label: "Prospect" };
  return { href: `/contacts/${task.contact_id}`, label: "Contact" };
}

// The API supplies the clock and Casablanca civil date; never infer either locally.
export function taskDueState(task: Pick<Task, "status" | "due_at" | "due_local">, clock: { now: string; today: string }) {
  if (task.status !== "open") return "";
  if (Date.parse(task.due_at) < Date.parse(clock.now)) return "overdue";
  return task.due_local.slice(0, 10) === clock.today ? "today" : "";
}
