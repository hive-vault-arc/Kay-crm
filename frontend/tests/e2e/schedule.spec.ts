import { test, expect, createActor, removeActor, signIn, clearActorContext, type TestActor } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";
import { commandVisit, fillVisit, saveVisit, scheduleFixture, setVisitTimes, visitBody } from "../helpers/schedule";

test.beforeEach(({page})=>{page.setDefaultTimeout(25_000);page.setDefaultNavigationTimeout(30_000);});

test("SP14 AT-16/40: working policy, all three visit types and reschedule lifecycle",async({page})=>{
  test.setTimeout(240_000);const actors:TestActor[]=[];
  try {
    const {agent,contactId}=await scheduleFixture(page,actors);
    for(const [kind,start,nextStart] of [
      ["company_car","2030-01-07T10:30","2030-01-07T12:00"],
      ["without_company_car","2030-01-07T15:00","2030-01-07T16:00"],
      ["office","2030-01-06T02:00","2030-01-06T03:00"],
    ]) {
      const form = await fillVisit(page,contactId,kind,start);
      if (kind === "company_car") {
        for (const label of [/^Titre/, /^Lieu/, /^Fin ·/, /^Lier l’action à$/, /^Statut initial$/]) {
          await expect(form.getByLabel(label)).toHaveCount(0);
        }
        await expect(form.getByLabel("Bien concerné", { exact: true })).toBeVisible();
        await expect(form.getByLabel("Rechercher un bien ou une unité")).toHaveCount(0);
        await expect(form.getByRole("button", { name: "Vérifier le créneau" })).toHaveCount(0);
        const rules = form.locator("summary").filter({ hasText: "Règles du créneau" });
        await expect(form.getByText(/Au bureau et en réunion/)).toBeHidden();
        await rules.focus();
        await page.keyboard.press("Enter");
        await expect(form.getByText(/Au bureau et en réunion/)).toBeVisible();
        await page.keyboard.press("Enter");
        await expect(form.getByText(/Au bureau et en réunion/)).toBeHidden();
      }
      const vid=await saveVisit(page);
      await page.getByRole("dialog").getByRole("button", { name: "Actions", exact: true }).click();
      await page.getByRole("button", { name: "Replanifier", exact: true }).click();
      await setVisitTimes(page,nextStart);
      await page.getByRole("button",{name:"Enregistrer",exact:true}).click();
      await expect(page.getByText("Visite enregistrée.",{exact:true})).toBeVisible();
      await expect(page.getByRole("button", {name: "Confirmer", exact: true})).toHaveCount(0);
      const record=await(await page.request.get(`/api/v1/visits/${vid}`)).json();
      expect(record.type).toBe(kind);expect(record.status).toBe("confirmed");expect(record.version).toBe(2);expect(record.organizer_user_id).toBe(agent.id);
      expect(record.enquiry_id).toBeTruthy();
      expect(Date.parse(record.end_at) - Date.parse(record.start_at)).toBe(60 * 60 * 1000);
      await expect(page.getByRole("button", {name: "Saisir le résultat", exact: true})).toBeDisabled();
    }
    await page.goto("/visits");await page.getByLabel("Aller à une date",{exact:true}).fill("2030-01-07");
    await expect(page.getByText("2 visite(s) accessible(s) cette semaine.",{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Semaine précédente",exact:true}).click();
    await expect(page.getByText("1 visite(s) accessible(s) cette semaine.",{exact:true})).toBeVisible();
  } finally {await clearActorContext(page);for(const actor of actors)await removeActor(actor);}
});

test("SP14 AT-16/40: direct confirmation across ordinary overlap and hard lunch/capacity rejection",async({page})=>{
  test.setTimeout(180_000);const actors:TestActor[]=[];
  try {
    const {agent,contactId}=await scheduleFixture(page,actors);
    await commandVisit(page,agent.id,contactId,{type:"office"});
    await page.setViewportSize({ width: 390, height: 844 });
    const form = await fillVisit(page,contactId,"without_company_car");
    await expect(form.getByLabel("Explication du chevauchement éventuel", { exact: true })).toHaveCount(0);
    const overlapping = await saveVisit(page);
    expect((await (await page.request.get(`/api/v1/visits/${overlapping}`)).json()).status).toBe("confirmed");
    await fillVisit(page,contactId,"company_car","2030-01-07T12:30");
    await page.getByRole("button", {name:"Planifier", exact:true}).click();
    await expect(page.getByRole("alert").filter({hasText:"pause déjeuner"})).toBeVisible();
    await commandVisit(page,agent.id,contactId);await commandVisit(page,agent.id,contactId);
    const third=await staffCommand(page,"visits",visitBody(agent.id,contactId));expect(third.status()).toBe(409);expect((await third.json()).error.code).toBe("COMPANY_CAR_CAPACITY_FULL");
    await fillVisit(page,contactId); await page.getByRole("button", {name:"Planifier", exact:true}).click();
    await expect(page.getByRole("alert").filter({hasText:"capacité avec véhicule de société est atteinte"})).toBeVisible();
  } finally {await clearActorContext(page);for(const actor of actors)await removeActor(actor);}
});

test("SP14 AT-40/23: policy impact preserved, administrator-only settings and private free busy",async({page})=>{
  test.setTimeout(180_000);const actors:TestActor[]=[];
  try {
    const {admin,agent,contactId}=await scheduleFixture(page,actors);const vid=await commandVisit(page,agent.id,contactId);
    const outsider=await createActor("agent");actors.push(outsider);const manager=await createActor("manager");actors.push(manager);
    await clearActorContext(page);await signIn(page,admin);await page.goto("/settings/working-hours");
    await page.getByRole("button",{name:"Plages et pauses par jour",exact:true}).click();
    const policyDrawer=page.getByRole("dialog",{name:"Plages de travail et pauses",exact:true});
    await policyDrawer.getByRole("region",{name:"Lundi",exact:true}).getByRole("button",{name:"Retirer pauses 1 Lundi",exact:true}).click();
    await policyDrawer.getByRole("region",{name:"Lundi",exact:true}).getByRole("button",{name:"Retirer plages de travail 1 Lundi",exact:true}).click();
    await page.getByRole("button",{name:"Prévisualiser l’impact",exact:true}).click();await expect(page.getByRole("heading",{name:"1 visite(s) future(s) à revoir",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Enregistrer les horaires",exact:true}).click();await expect(page.getByText("Horaires enregistrés. Les visites existantes sont conservées.",{exact:true})).toBeVisible();
    const record=await(await page.request.get(`/api/v1/visits/${vid}`)).json();expect(record.status).toBe("scheduled");expect(record.version).toBe(1);expect(record.review_code).toBe("VISIT_SCHEDULE_NOT_CONFIGURED");
    for(const role of [outsider,manager]){
      await clearActorContext(page);await signIn(page,role);await page.goto("/settings/working-hours");await expect(page.getByRole("heading",{name:"Accès non autorisé",exact:true})).toBeVisible();
      const denial=await staffCommand(page,"visit-schedule/policy/preview",{expected_version:3,company_car_capacity_per_hour:2,working_windows:[],lunch_breaks:[]});expect(denial.status()).toBe(403);
    }
    await clearActorContext(page);await signIn(page,outsider);await page.goto(`/visits/${vid}`);await expect(page.getByRole("alert").filter({hasText:"introuvable"})).toBeVisible();
    await page.goto("/visits");await page.getByLabel("Aller à une date",{exact:true}).fill("2030-01-07");await expect(page.getByText("0 visite(s) accessible(s) cette semaine.",{exact:true})).toBeVisible();
    await page.getByLabel("Données du calendrier",{exact:true}).selectOption("busy");await page.getByLabel("Collègue",{exact:true}).selectOption(agent.id);await expect(page.getByRole("region",{name:"Occupation CRM de la semaine, défilement horizontal",exact:true})).toContainText("Occupé");
    const busy=await(await page.request.get(`/api/v1/calendar/free-busy?start_at=2030-01-07T00%3A00%3A00Z&end_at=2030-01-08T00%3A00%3A00Z&user_id=${agent.id}`)).json();expect(Object.keys(busy.items[0]).sort()).toEqual(["busy","end_at","start_at"]);
  } finally {await clearActorContext(page);for(const actor of actors)await removeActor(actor);}
});

test("SP14 AT-23: interrupted committed booking retains the form and same retry identity",async({page})=>{
  test.setTimeout(180_000);const actors:TestActor[]=[];
  try{
    const {contactId}=await scheduleFixture(page,actors);await fillVisit(page,contactId,"office");let interrupted=false;
    await page.route("**/api/v1/visits",async route=>{if(route.request().method()!=="POST"||interrupted)return route.continue();interrupted=true;const response=await route.fetch();expect(response.status()).toBe(200);await route.abort("connectionfailed");});
    await page.getByRole("button",{name:"Planifier",exact:true}).click();await expect(page.getByRole("alert").filter({hasText:"service local est indisponible"})).toBeVisible();
    await expect(page.getByLabel("Heure",{exact:true})).toHaveValue("10:30");const vid=await saveVisit(page);await page.unroute("**/api/v1/visits");
    const history=await(await page.request.get(`/api/v1/visits/${vid}/history`)).json();expect(history.items).toHaveLength(1);
  }finally{await clearActorContext(page);for(const actor of actors)await removeActor(actor);}
});

test.describe("Simplified booking", () => {
  test.use({ hasTouch: true });
  test("uses the contact’s deal and keeps both disclosures reachable", async ({ page }, info) => {
    test.setTimeout(150_000);
    const agent = await createActor("agent");
    try {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await signIn(page, agent);
      const lead = await createLead(page, "Contact visite synthétique");
      const { contact } = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
      const deal = await staffCommand(page, "deals", dealBody(contact.id));
      expect(deal.status()).toBe(200);
      const { id: dealId } = await deal.json();
      const form = await fillVisit(page, contact.id, "office");
      const rules = form.locator("summary").filter({ hasText: "Règles du créneau" });
      const notes = form.locator("summary").filter({ hasText: "Notes (facultatif)" });
      await rules.scrollIntoViewIfNeeded();
      await page.getByRole("dialog").screenshot({ path: info.outputPath("visit-desktop.png") });

      await page.setViewportSize({ width: 320, height: 800 });
      expect(await form.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await rules.tap();
      await expect(form.getByText(/Au bureau et en réunion/)).toBeVisible();
      await rules.tap();
      await notes.tap();
      await form.getByLabel("Notes", { exact: true }).fill("Préparation synthétique de la visite.");
      await notes.scrollIntoViewIfNeeded();
      await page.getByRole("dialog").screenshot({ path: info.outputPath("visit-mobile.png") });
      const visitId = await saveVisit(page);
      const visit = await (await page.request.get(`/api/v1/visits/${visitId}`)).json();
      expect(visit).toMatchObject({
        type: "office", status: "confirmed", deal_id: dealId, enquiry_id: null,
        notes: "Préparation synthétique de la visite.",
      });
    } finally {
      await clearActorContext(page);
      await removeActor(agent);
    }
  });
});