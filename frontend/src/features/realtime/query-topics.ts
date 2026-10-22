const groups: Record<string, string[]> = {
  contacts: ["contacts", "enquiries", "requirements", "tasks", "visits", "deals"],
  enquiries: ["contacts", "deals", "tasks", "visits"],
  deals: ["deals", "contacts", "inventory", "finance", "tasks", "visits", "files"],
  properties: ["inventory", "files"], developments: ["inventory", "files"],
  offerings: ["inventory"], blocks: ["inventory"], floors: ["inventory"], "unit-types": ["inventory"],
  visits: ["visits", "tasks", "contacts", "inventory"], calendar: ["visits"],
  "visit-schedule": ["visits"], tasks: ["tasks", "contacts", "visits"],
  notifications: ["notifications", "tasks", "visits", "files", "contacts"],
  reports: ["reports"], commissions: ["finance"], documents: ["files"], files: ["files"],
  imports: ["imports"], exports: ["exports"], work: ["tasks", "visits", "contacts"],
  users: ["identity"], requirements: ["requirements", "inventory"], search: ["contacts", "deals", "inventory"],
  "customer-offers": ["deals", "inventory"],
  "generated-documents": ["files", "contacts", "deals", "inventory"],
  audit: ["contacts", "deals", "inventory", "visits", "tasks", "files", "finance", "imports", "exports", "identity"],
};
export function matchesTopics(path: string, topics: string[]) {
  const domain = path.replace(/^\/api\/v1\//, "").split(/[/?]/)[0];
  return topics.includes("identity") || topics.some(topic => (groups[domain] ?? []).includes(topic));
}
