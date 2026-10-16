import { relayDiscovery } from "@/features/discovery/facade";
import { randomUUID } from "node:crypto";
import { facadeError, relayHealth } from "@/lib/api/facade";
import { relayAuth } from "@/lib/auth/facade";
import { relayUsers } from "@/features/users/facade";
import { relayContacts } from "@/features/contacts/facade";
import { relayInventory } from "@/features/inventory/facade";
import { relayFiles } from "@/features/files/facade";
import { relayRequirements } from "@/features/requirements/facade";
import { relayDeals } from "@/features/deals/facade";
import { relaySchedule } from "@/features/schedule/facade";
import { relayWork } from "@/features/work/facade";
import { relayFinance } from "@/features/finance/facade";
import { relayReports } from "@/features/reports/facade";
import { relayImports } from "@/features/imports/facade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Extend deliberately when later slices introduce authenticated API contracts.
const healthPaths = new Set(["health/live", "health/ready"]);

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return relayRequirements(path.join("/"), request, randomUUID());
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const requestId = randomUUID();
  const { path } = await context.params;
  const key = path.join("/");
  if (/^(search|exports|audit)(\/|$)/.test(key)) return relayDiscovery(key, request, requestId);
  if (/^imports(\/|$)/.test(key)) return relayImports(key, request, requestId);
  if (/^reports(\/|$)/.test(key)) return relayReports(key, request, requestId);
  if (/^commissions(\/|$)/.test(key) || /^deals\/[^/]+\/commissions$/.test(key)) return relayFinance(key, request, requestId);
  if (/^(tasks|notifications|work)(\/|$)/.test(key) || key === "visits/follow-up") return relayWork(key, request, requestId);
  if (/^(visits|visit-schedule|calendar)(\/|$)/.test(key)) return relaySchedule(key, request, requestId);
  if (/^(deals|customer-offers)(\/|$)/.test(key)) return relayDeals(key, request, requestId);
  if (/^requirements(\/|$)/.test(key)) return relayRequirements(key, request, requestId);
  if (/^(documents|files)(\/|$)/.test(key)) return relayFiles(key, request, requestId);
  if (/^(properties|offerings|developments|blocks|floors|unit-types)(\/|$)/.test(key)) return relayInventory(key, request, requestId);
  if (/^(contacts|enquiries)(\/|$)/.test(key)) return relayContacts(key, request, requestId);
  if (key === "users" || key.startsWith("users/")) return relayUsers(key, request, requestId);
  if (new URL(request.url).search) return facadeError(422, "VALIDATION_ERROR", requestId);
  if (key === "auth/me") return relayAuth(key, request, requestId);
  if (!healthPaths.has(key)) return facadeError(404, "NOT_FOUND", requestId);
  return relayHealth(`/api/v1/${key}`, requestId);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const requestId = randomUUID();
  const { path } = await context.params;
  const key = path.join("/");
  if (/^(search|exports|audit)(\/|$)/.test(key)) return relayDiscovery(key, request, requestId);
  if (/^imports(\/|$)/.test(key)) return relayImports(key, request, requestId);
  if (/^commissions(\/|$)/.test(key) || /^deals\/[^/]+\/commissions$/.test(key)) return relayFinance(key, request, requestId);
  if (/^(tasks|notifications|work)(\/|$)/.test(key)) return relayWork(key, request, requestId);
  if (/^(visits|visit-schedule|calendar)(\/|$)/.test(key)) return relaySchedule(key, request, requestId);
  if (/^(deals|customer-offers)(\/|$)/.test(key)) return relayDeals(key, request, requestId);
  if (/^requirements(\/|$)/.test(key)) return relayRequirements(key, request, requestId);
  if (/^(documents|files)(\/|$)/.test(key)) return relayFiles(key, request, requestId);
  if (/^(properties|offerings|developments|blocks|floors|unit-types)(\/|$)/.test(key)) return relayInventory(key, request, requestId);
  if (/^(contacts|enquiries)(\/|$)/.test(key)) return relayContacts(key, request, requestId);
  if (key === "users" || key.startsWith("users/")) return relayUsers(key, request, requestId);
  if (!["auth/login", "auth/logout", "auth/change-password"].includes(key))
    return facadeError(404, "NOT_FOUND", requestId);
  if (new URL(request.url).search) return facadeError(422, "VALIDATION_ERROR", requestId);
  return relayAuth(key, request, requestId);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (/^tasks(\/|$)/.test(path.join("/"))) return relayWork(path.join("/"), request, randomUUID());
  if (/^visits(\/|$)/.test(path.join("/"))) return relaySchedule(path.join("/"), request, randomUUID());
  if (/^(deals|customer-offers)(\/|$)/.test(path.join("/"))) return relayDeals(path.join("/"), request, randomUUID());
  if (/^requirements(\/|$)/.test(path.join("/"))) return relayRequirements(path.join("/"), request, randomUUID());
  if (/^(properties|offerings|developments|blocks|floors|unit-types)(\/|$)/.test(path.join("/"))) return relayInventory(path.join("/"), request, randomUUID());
  if (/^(contacts|enquiries)(\/|$)/.test(path.join("/"))) return relayContacts(path.join("/"), request, randomUUID());
  return relayUsers(path.join("/"), request, randomUUID());
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.join("/") === "visit-schedule/policy") return relaySchedule(path.join("/"), request, randomUUID());
  if (/^(properties|offerings|developments|blocks|floors|unit-types)(\/|$)/.test(path.join("/"))) return relayInventory(path.join("/"), request, randomUUID());
  return relayContacts(path.join("/"), request, randomUUID());
}
