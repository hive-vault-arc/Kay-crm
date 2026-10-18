import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const model = loadServer("src/features/schedule/calendar-model.ts");
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const contracts = loadServer("src/features/schedule/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const period = { start_at: "2026-10-19T00:00:00Z", end_at: "2026-10-26T00:00:00Z" };

test("calendar dates use civil UTC arithmetic, Monday weeks and complete month rows", () => {
  assert.equal(model.weekStart("2026-10-18"), "2026-10-12");
  assert.equal(model.weekStart("2026-10-19"), "2026-10-19");
  assert.equal(model.calendarDay("2028-02-28", 1), "2028-02-29");
  assert.equal(model.monthShift("2026-01-31", 1), "2026-02-01");
  for (const [month, count] of [["2026-10-19", 5], ["2026-08-01", 6], ["2027-02-01", 4]]) {
    const weeks = model.monthWeeks(month);
    assert.equal(weeks.length, count);
    assert.ok(weeks.every(week => week.length === 7 && model.weekStart(week[0]) === week[0]));
  }
});

function visit(id, start, end) { return { id, start_local: `2026-10-19T${start}:00+01:00`, end_local: `2026-10-19T${end}:00+01:00` }; }
test("calendar overlap lanes are per connected group and preserve minimum hit targets", () => {
  const result = model.dayEvents([visit("a", "10:00", "11:00"), visit("b", "10:30", "11:30"), visit("c", "14:00", "15:00")], "2026-10-19", 41.25);
  assert.deepEqual(JSON.parse(JSON.stringify(result.map(row => [row.visit.id, row.lane, row.lanes]))), [["a", 0, 2], ["b", 1, 2], ["c", 0, 1]]);
  assert.deepEqual(Array.from(model.dayEvents([visit("a", "10:00", "10:05"), visit("b", "10:10", "10:15")], "2026-10-19", 41.25), row => row.lanes), [2, 2]);
  const overnight = { ...visit("d", "23:00", "00:00"), end_local: "2026-10-20T00:00:00+01:00" };
  assert.equal(model.occursOn(overnight, "2026-10-19"), true);
  assert.equal(model.occursOn(overnight, "2026-10-20"), false);
});

test("calendar selection and URLs retain explicit empty selections without touching free/busy", () => {
  for (const patch of [{ types: "office,office" }, { types: "driver" }, { statuses: "active" }, { statuses: "confirmed," }, { types: " office" }])
    assert.equal(contracts.visitsQuerySchema.safeParse({ ...period, ...patch }).success, false);
  assert.equal(contracts.visitsQuerySchema.safeParse({ ...period, types: "", statuses: "scheduled,confirmed" }).success, true);
  assert.equal(contracts.calendarQuerySchema.safeParse({ ...period, types: "office" }).success, false);
  const url = new URL(model.visitListPath(period, 2, [], ["confirmed"]), "https://synthetic.invalid");
  assert.equal(url.searchParams.has("types"), true);
  assert.equal(url.searchParams.get("types"), "");
  assert.equal(url.searchParams.get("page"), "2");
});

function facade(response) {
  const calls = [], origin = "https://calendar.synthetic.invalid";
  const { relaySchedule: relay } = loadServer("src/features/schedule/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return response; } },
    "./contracts": contracts,
  } });
  return { relay, calls, origin };
}
const emptyPage = { items: [], total: 0, page: 1, page_size: 50, has_previous: false, has_next: false,
  type_counts: { office: 0, company_car: 0, without_company_car: 0 },
  status_counts: { draft: 0, scheduled: 0, confirmed: 0, completed: 0, cancelled: 0 }, unfiltered_total: 0,
};
test("calendar facade forwards exact filters/current session and requires complete authoritative facets", async () => {
  const { relay, calls, origin } = facade({ status: 200, body: emptyPage });
  const path = model.visitListPath(period, 1, [], ["confirmed"]);
  const result = await relay("visits", new Request(origin + path), "synthetic-request");
  assert.equal(result.status, 200);
  assert.equal(calls[0][0], path);
  assert.equal(calls[0][2].token, "synthetic-session");
  assert.equal(result.headers.get("cache-control"), "no-store");
  const { relay: bad } = facade({ status: 200, body: { items: [], total: 0 } });
  assert.equal((await bad("visits", new Request(origin + path), "synthetic-request")).status, 503);
});
test("calendar facade rejects duplicate/unknown filters and all private-type free/busy queries before upstream", async () => {
  const { relay, calls, origin } = facade({ status: 200, body: emptyPage });
  for (const suffix of ["&types=office&types=company_car", "&types=driver", "&statuses=active", "&secret=1"])
    assert.equal((await relay("visits", new Request(`${origin}/api/v1/visits?start_at=${period.start_at}&end_at=${period.end_at}${suffix}`), "request")).status, 422);
  assert.equal((await relay("calendar/free-busy", new Request(`${origin}/api/v1/calendar/free-busy?start_at=${period.start_at}&end_at=${period.end_at}&types=office`), "request")).status, 422);
  assert.equal(calls.length, 0);
});
