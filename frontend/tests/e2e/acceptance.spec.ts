import { test, expect, signIn, changeActor, createActor, removeActor, clearActorContext } from "../helpers/auth";
import { apiProcess } from "../helpers/api-process";
import { createLead, staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";

test("SP22: persisted contact/deal survives API restart and expired sessions recover safely", async ({ page }, info) => {
  test.setTimeout(120000);
  console.info("SP22_BROWSER", JSON.stringify({ project: info.project.name, version: page.context().browser()?.version(), viewport: page.viewportSize() }));
  const actor = await createActor("agent");
  try {
  await signIn(page, actor);
  const lead = await createLead(page, "SP22 continuité synthétique");
  const enquiry = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
  const response = await staffCommand(page, "deals", dealBody(enquiry.contact.id, "SP22 affaire persistante"));
  expect(response.status()).toBe(200);
  const deal = (await response.json()).id;
  const before = await (await page.request.get(`/api/v1/deals/${deal}`)).json();
  try { await apiProcess("stop"); } finally { await apiProcess("start"); }
  expect(await (await page.request.get(`/api/v1/deals/${deal}`)).json()).toEqual(before);
  await page.goto(`/contacts/${enquiry.contact.id}`);
  await expect(page.getByText("Contact : SP22 continuité synthétique", { exact: true })).toBeVisible();
  await changeActor(actor, "expire");
  for (const route of ["/dashboard", "/leads", "/deals", "/visits", "/projects", "/settings/users"]) {
    await page.goto(route);
    await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
  }
  } finally { await clearActorContext(page); await removeActor(actor); }
});
