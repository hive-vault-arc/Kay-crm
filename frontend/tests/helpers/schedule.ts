import type { Page } from "@playwright/test";
import { expect, createActor, signIn, clearActorContext, type TestActor } from "./auth";
import { staffCommand } from "./leads";

export async function scheduleFixture(page: Page, actors: TestActor[]) {
  const admin = await createActor("administrator",false,"SP06 SP14 administration synthétique"); actors.push(admin);
  const agent = await createActor("agent",false,"SP06 SP14 agent synthétique"); actors.push(agent);
  await signIn(page,admin); await configureSchedule(page);
  await clearActorContext(page); await signIn(page,agent);
  const created = await staffCommand(page, "enquiries", {
    new_contact: { name: "SP14 contact synthétique", type: "person", phones: [{ number: "+212600000001", label: "Principal", is_primary: true }], emails: [], roles: ["buyer"], country: "MA", languages: ["french"] },
    message: "Demande synthétique de contrôle", source: "phone", initial_budget: "500000", campaign_source: "facebook",
  });
  expect(created.status()).toBe(200); const lid = (await created.json()).id;
  const lead = await (await page.request.get(`/api/v1/enquiries/${lid}`)).json();
  return { admin, agent, contactId: lead.contact.id as string };
}
export async function configureSchedule(page: Page) {
  await page.goto("/settings/working-hours");
  await page.getByRole("button", { name: "Plages et pauses par jour", exact: true }).click();
  const monday = page.getByRole("dialog", { name: "Plages de travail et pauses", exact: true }).getByRole("region",{name:"Lundi",exact:true});
  await monday.getByRole("button",{name:"Ajouter une plage",exact:true}).click();
  await monday.getByLabel("Début Plages de travail 1 Lundi",{exact:true}).fill("09:00");
  await monday.getByLabel("Fin Plages de travail 1 Lundi",{exact:true}).fill("18:00");
  await monday.getByRole("button",{name:"Ajouter une pause",exact:true}).click();
  await monday.getByLabel("Début Pauses 1 Lundi",{exact:true}).fill("13:00");
  await monday.getByLabel("Fin Pauses 1 Lundi",{exact:true}).fill("14:00");
  await page.getByRole("button",{name:"Prévisualiser l’impact",exact:true}).click();
  await expect(page.getByRole("heading",{name:"0 visite(s) future(s) à revoir",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Enregistrer les horaires",exact:true}).click();
  await expect(page.getByText("Horaires enregistrés. Les visites existantes sont conservées.",{exact:true})).toBeVisible();
}
export async function fillVisit(page: Page, cid: string, kind="company_car", start="2030-01-07T10:30", end="2030-01-07T11:30", title="SP14 visite synthétique") {
  await page.goto(`/visits/new?contact_id=${cid}`);
  const form = page.getByRole("form",{name:"Nouvelle visite",exact:true});
  await expect(form.getByLabel("Titre *",{exact:true})).toBeEnabled();
  const prospect = form.getByLabel("Prospect concerné", { exact: true });
  await expect.poll(() => prospect.locator("option").count()).toBeGreaterThan(1);
  await prospect.selectOption({ index: 1 });
  await form.getByLabel("Titre *",{exact:true}).fill(title);
  await form.getByLabel("Lieu *",{exact:true}).fill("SP14 lieu synthétique uniquement");
  await form.getByLabel("Type de visite",{exact:true}).selectOption(kind);
  await setVisitTimes(page,start,end);
  return form;
}
export async function setVisitTimes(page: Page, start: string, end: string) {
  for (const [label, value] of [["Début", start], ["Fin", end]]) {
    const [day, time] = value.split("T");
    await page.getByLabel(`${label} · Date`, { exact: true }).fill(day);
    await page.getByLabel(`${label} · Heure`, { exact: true }).fill(time);
  }
  await expect(page.getByRole("button",{name:"Vérifier le créneau",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Vérifier le créneau",exact:true}).click();
  await expect(page.locator('[aria-label="Disponibilité du créneau"]')).toBeVisible();
}
export async function saveVisit(page: Page) {
  await page.getByRole("button",{name:"Planifier",exact:true}).click();
  await expect.poll(()=>/^\/visits\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true);
  await expect(page.getByRole("dialog").getByText("Historique de la visite", { exact: true })).toBeVisible();
  return new URL(page.url()).pathname.split("/")[2];
}
export function visitBody(uid:string,cid:string,changes:object={}) {
  return { contact_id:cid,title:"SP14 visite API synthétique",type:"company_car",start_at:"2030-01-07T10:30:00+00:00",end_at:"2030-01-07T11:30:00+00:00",location:"SP14 lieu synthétique",participant_ids:[uid],overlap_reason:"SP14 accompagnement partagé synthétique",deal_id:null,property_id:null,status:"scheduled",...changes };
}
export async function commandVisit(page:Page,uid:string,cid:string,changes:object={}) {
  const result=await staffCommand(page,"visits",visitBody(uid,cid,changes)); expect(result.status()).toBe(200); return (await result.json()).id as string;
}
