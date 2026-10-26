export type DirectoryKind = "leads" | "deals";
export type DirectoryView = "list" | "kanban";
export function readDirectoryView(kind: DirectoryKind, cookie: string): DirectoryView {
  const matches = cookie.split(";").map(part => part.trim()).filter(part => part.startsWith(`kay-${kind}-view=`));
  return matches.length === 1 && matches[0] === `kay-${kind}-view=kanban` ? "kanban" : "list";
}
export function directoryViewCookie(kind: DirectoryKind, value: unknown, secure: boolean) {
  const view = value === "kanban" ? "kanban" : "list";
  return `kay-${kind}-view=${view}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}
