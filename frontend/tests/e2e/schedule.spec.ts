import { test, expect, createActor, removeActor, signIn, clearActorContext, type TestActor } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { commandVisit, fillVisit, saveVisit, scheduleFixture, setVisitTimes, visitBody } from "../helpers/schedule";

test.beforeEach(({page})=>{page.setDefaultTimeout(25_000);page.setDefaultNavigationTimeout(30_000);});

test("SP14 AT-16/40: working policy, all three visit types and reschedule lifecycle",async({page})=>{
  test.setTimeout(240_000);const actors:TestActor[]=[];
  try {
    const {agent,contactId}=await scheduleFixture(page,actors);
    for(const [kind,start,end,nextStart,nextEnd] of [
      ["company_car","2030-01-07T10:30","2030-01-07T11:30","2030-01-07T12:00","2030-01-07T13:00"],
      ["without_company_car","2030-01-07T15:00","2030-01-07T16:00","2030-01-07T16:00","2030-01-07T17:00"],
      ["office","2030-01-06T02:00","2030-01-06T03:00","2030-01-06T03:00","2030-01-06T04:00"],
    ]) {
      await fillVisit(page,contactId,kind,start,end);const vid=await saveVisit(page);
      await page.getByRole("button",{name:"Modifier ou replanifier la visite",exact:true}).click();
      await setVisitTimes(page,nextStart,nextEnd);
      await page.getByRole("button",{name:"Replanifier la visite",exact:true}).click();
      await expect(page.getByText("Visite enregistrée. Son historique et son auteur sont conservés.",{exact:true})).toBeVisible();
      await page.getByRole("button",{name:"Confirmer la visite",exact:true}).click();
      await page.getByRole("alertdialog").getByRole("button",{name:"Confirmer la visite",exact:true}).click();
      await expect(page.getByRole("alertdialog")).not.toBeVisible();
      const record=await(await page.request.get(`/api/v1/visits/${vid}`)).json();
      expect(record.type).toBe(kind);expect(record.status).toBe("confirmed");expect(record.version).toBe(3);expect(record.organizer_user_id).toBe(agent.id);
      await page.getByRole("button",{name:"Terminer la visite",exact:true}).click();
      await page.getByRole("alertdialog").getByLabel("Résultat de la visite (obligatoire)",{exact:true}).fill("SP14 visite effectuée, résultat synthétique");
      await page.getByRole("alertdialog").getByRole("button",{name:"Terminer la visite",exact:true}).click();
      await expect(page.getByRole("alertdialog")).not.toBeVisible();
      await expect(page.getByText("Visite conservée en lecture seule. Une nouvelle visite garde sa propre identité.",{exact:true})).toBeVisible();
    }
    await page.goto("/visits");await page.getByLabel("Semaine contenant le",{exact:true}).fill("2030-01-07");
    await expect(page.getByText("2 visite(s) accessible(s) cette semaine.",{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Semaine précédente",exact:true}).click();
    await expect(page.getByText("1 visite(s) accessible(s) cette semaine.",{exact:true})).toBeVisible();
  } finally {await clearActorContext(page);for(const actor of actors)await removeActor(actor);}
});

test("SP14 AT-16/40: explained overlap versus hard lunch and capacity rejection",async({page})=>{
  test.setTimeout(180_000);const actors:TestActor[]=[];
  try {
    const {agent,contactId}=await scheduleFixture(page,actors);
    await commandVisit(page,agent.id,contactId,{type:"office"});
    await fillVisit(page,contactId,"without_company_car");
    await page.getByRole("button",{name:"Enregistrer la visite",exact:true}).click();
    await expect(page.getByRole("alert").filter({hasText:"Un participant a déjà un rendez-vous"})).toBeVisible();
    await page.getByLabel("Explication du chevauchement éventuel",{exact:true}).fill("SP14 accompagnement partagé, chevauchement délibéré");await saveVisit(page);
    await fillVisit(page,contactId,"company_car","2030-01-07T12:30","2030-01-07T13:30");
    await expect(page.getByRole("region",{name:"Disponibilité du créneau",exact:true})).toContainText("pause déjeuner");
    await page.getByLabel("Explication du chevauchement éventuel",{exact:true}).fill("Ne contourne pas la pause");
    await page.getByRole("button",{name:"Enregistrer la visite",exact:true}).click();
    await expect(page.getByRole("alert").filter({hasText:"pause déjeuner"})).toBeVisible();
    await commandVisit(page,agent.id,contactId);await commandVisit(page,agent.id,contactId);
    const third=await staffCommand(page,"visits",visitBody(agent.id,contactId));expect(third.status()).toBe(409);expect((await third.json()).error.code).toBe("COMPANY_CAR_CAPACITY_FULL");
    await fillVisit(page,contactId);await expect(page.getByRole("region",{name:"Disponibilité du créneau",exact:true})).toContainText("capacité avec véhicule de société est atteinte");
  } finally {await clearActorContext(page);for(const actor of actors)await removeActor(actor);}
});

test("SP14 AT-40/23: policy impact preserved, administrator-only settings and private free busy",async({page})=>{
  test.setTimeout(180_000);const actors:TestActor[]=[];
  try {
    const {admin,agent,contactId}=await scheduleFixture(page,actors);const vid=await commandVisit(page,agent.id,contactId);
    const outsider=await createActor("agent");actors.push(outsider);const manager=await createActor("manager");actors.push(manager);
    await clearActorContext(page);await signIn(page,admin);await page.goto("/settings/working-hours");
    await page.getByRole("region",{name:"Lundi",exact:true}).getByRole("button",{name:"Retirer pause déjeuner 1 Lundi",exact:true}).click();
    await page.getByRole("region",{name:"Lundi",exact:true}).getByRole("button",{name:"Retirer plage de travail 1 Lundi",exact:true}).click();
    await page.getByRole("button",{name:"Prévisualiser l’impact",exact:true}).click();await expect(page.getByRole("heading",{name:"1 visite(s) future(s) à revoir",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Enregistrer les horaires",exact:true}).click();await expect(page.getByText("Horaires enregistrés. Les visites existantes sont conservées.",{exact:true})).toBeVisible();
    const record=await(await page.request.get(`/api/v1/visits/${vid}`)).json();expect(record.status).toBe("scheduled");expect(record.version).toBe(1);expect(record.review_code).toBe("VISIT_SCHEDULE_NOT_CONFIGURED");
    for(const role of [outsider,manager]){
      await clearActorContext(page);await signIn(page,role);await page.goto("/settings/working-hours");await expect(page.getByRole("heading",{name:"Accès non autorisé",exact:true})).toBeVisible();
      const denial=await staffCommand(page,"visit-schedule/policy/preview",{expected_version:3,company_car_capacity_per_hour:2,working_windows:[],lunch_breaks:[]});expect(denial.status()).toBe(403);
    }
    await clearActorContext(page);await signIn(page,outsider);await page.goto(`/visits/${vid}`);await expect(page.getByRole("alert").filter({hasText:"introuvable"})).toBeVisible();
    await page.goto("/visits");await page.getByLabel("Semaine contenant le",{exact:true}).fill("2030-01-07");await expect(page.getByText("0 visite(s) accessible(s) cette semaine.",{exact:true})).toBeVisible();
    await page.getByLabel("Afficher",{exact:true}).selectOption("busy");await page.getByLabel("Collègue",{exact:true}).selectOption(agent.id);await expect(page.getByRole("region",{name:"Disponibilités CRM du collègue",exact:true})).toContainText("Occupé :");
    const busy=await(await page.request.get(`/api/v1/calendar/free-busy?start_at=2030-01-07T00%3A00%3A00Z&end_at=2030-01-08T00%3A00%3A00Z&user_id=${agent.id}`)).json();expect(Object.keys(busy.items[0]).sort()).toEqual(["busy","end_at","start_at"]);
  } finally {await clearActorContext(page);for(const actor of actors)await removeActor(actor);}
});

test("SP14 AT-23: interrupted committed booking retains draft and same retry identity",async({page})=>{
  test.setTimeout(180_000);const actors:TestActor[]=[];
  try{
    const {contactId}=await scheduleFixture(page,actors);await fillVisit(page,contactId,"office");let interrupted=false;
    await page.route("**/api/v1/visits",async route=>{if(route.request().method()!=="POST"||interrupted)return route.continue();interrupted=true;const response=await route.fetch();expect(response.status()).toBe(200);await route.abort("connectionfailed");});
    await page.getByRole("button",{name:"Enregistrer la visite",exact:true}).click();await expect(page.getByRole("alert").filter({hasText:"service local est indisponible"})).toBeVisible();
    await expect(page.getByLabel("Titre de la visite",{exact:true})).toHaveValue("SP14 visite synthétique");const vid=await saveVisit(page);await page.unroute("**/api/v1/visits");
    const history=await(await page.request.get(`/api/v1/visits/${vid}/history`)).json();expect(history.items).toHaveLength(1);
  }finally{await clearActorContext(page);for(const actor of actors)await removeActor(actor);}
});
