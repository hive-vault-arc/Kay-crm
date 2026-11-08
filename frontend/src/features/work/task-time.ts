import type { Task } from "./contracts";

// The API supplies the clock and Casablanca civil date; never infer either locally.
export function taskDueState(task: Pick<Task, "status" | "due_at" | "due_local">, clock: { now: string; today: string }) {
  if (task.status !== "open") return "";
  if (Date.parse(task.due_at) < Date.parse(clock.now)) return "overdue";
  return task.due_local.slice(0, 10) === clock.today ? "today" : "";
}
