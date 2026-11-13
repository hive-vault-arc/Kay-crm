import { AuthUnavailable } from "@/features/auth/auth-frame";
import { TasksDirectory } from "@/features/work/tasks-directory";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Tâches" };

export default async function Page() {
  const identity = await requireIdentity("/tasks");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/tasks" />;
  const { id, role } = identity.profile.user;
  return <TasksDirectory key={`${id}:${role}`} actorId={id} />;
}
