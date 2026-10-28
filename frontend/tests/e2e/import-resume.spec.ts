import { clearActorContext, expect, signIn, test } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { batchPageSchema } from "../../src/features/imports/contracts";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared isolated-stack cases. Preview only: no contact approval or worker.
for (const state of ["awaiting_upload", "uploading"] as const) {
  test(`Reopen and resume the existing ${state} CSV batch without creating a replacement`, async ({ page, actor }) => {
    const filename = "resume-synthetic.csv";
    const csv = Buffer.from("name,primary_phone,other_phones,primary_email,other_emails,roles,agent_email,notes\nSynthetic resume contact,+212600000001,,,,buyer,,Synthetic preview only\n");
    const created: string[] = [];
    try {
      await signIn(page, actor);
      const response = await staffCommand(page, "imports", { filename, size_bytes: csv.length });
      if (response.status() !== 200) throw new Error("SYNTHETIC_IMPORT_CREATE_FAILED");
      const initial: unknown = await response.json();
      if (!initial || typeof initial !== "object" || !("id" in initial) || typeof initial.id !== "string") throw new Error("SYNTHETIC_IMPORT_CREATE_INVALID");
      const id = initial.id;
      if (state === "uploading") {
        const permit = await staffCommand(page, `imports/${id}/upload-permit`, {});
        if (permit.status() !== 200) throw new Error("SYNTHETIC_IMPORT_PERMIT_FAILED");
      }
      await page.goto(`/leads?view=import&batch=${id}`);
      page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/v1/imports") created.push("unexpected-metadata-create"); });
      const resume = page.getByRole("button", { name: "Reprendre le transfert", exact: true });
      await expect.poll(() => resume.isEnabled()).toBe(true);
      await resume.click();
      await expect.poll(() => page.locator("#import-csv").isEnabled()).toBe(true);
      await page.locator("#import-csv").setInputFiles({ name: filename, mimeType: "text/csv", buffer: csv });
      await page.getByRole("button", { name: "Envoyer et prévisualiser", exact: true }).click();
      await expect.poll(async () => {
        const result = await page.request.get(`/api/v1/imports/${id}`);
        if (result.status() !== 200) return false;
        const parsed = batchPageSchema.safeParse(await result.json());
        return parsed.success && parsed.data.id === id && parsed.data.state === "previewed" && parsed.data.filename === filename && parsed.data.size_bytes === csv.length && parsed.data.result === null;
      }).toBe(true);
      expect(created.length).toBe(0);
      expect(new URL(page.url()).searchParams.get("batch")).toBe(id);
      // No fallback is selected: preview reports an invalid agent; it cannot import contacts.
      await expect.poll(() => page.getByRole("button", { name: "Approuver l’import", exact: true }).isDisabled()).toBe(true);
    } finally { await clearActorContext(page); }
  });
}

test("An unknown new-batch acknowledgement recovers its original file through the previous batch review lock",async({page,actor})=>{
  const filename="replacement-synthetic.csv",csv=Buffer.from("name,primary_phone,other_phones,primary_email,other_emails,roles,agent_email,notes\nSynthetic replacement contact,+212600000001,,,,buyer,,Synthetic preview only\n"),attempts:{key?:string;body:string|null;id:string}[]=[];
  try{
    await signIn(page,actor);
    const initial=await staffCommand(page,"imports",{filename:"original-synthetic.csv",size_bytes:csv.length});
    if(initial.status()!==200)throw new Error("SYNTHETIC_IMPORT_CREATE_FAILED");
    const original:unknown=await initial.json();if(!original||typeof original!=="object"||!("id" in original)||typeof original.id!=="string")throw new Error("SYNTHETIC_IMPORT_CREATE_INVALID");
    await page.goto(`/leads?view=import&batch=${original.id}`);
    await page.locator("summary").filter({hasText:"Envoyer un fichier corrigé"}).click();
    await page.locator("#import-csv").setInputFiles({name:filename,mimeType:"text/csv",buffer:csv});
    await page.route("**/api/v1/imports",async route=>{
      if(route.request().method()!=="POST")return route.continue();const result=await route.fetch();if(result.status()!==200)throw new Error("SYNTHETIC_IMPORT_CREATE_FAILED");
      const body:unknown=await result.json();if(!body||typeof body!=="object"||!("id" in body)||typeof body.id!=="string")throw new Error("SYNTHETIC_IMPORT_CREATE_INVALID");
      attempts.push({key:route.request().headers()["idempotency-key"],body:route.request().postData(),id:body.id});if(attempts.length===1)return route.abort("failed");return route.fulfill({response:result});
    });
    await page.getByRole("button",{name:"Envoyer et prévisualiser",exact:true}).click();
    const retry=page.getByRole("button",{name:"Réessayer le même fichier",exact:true});await expect.poll(()=>retry.isVisible()).toBe(true);await expect.poll(()=>page.locator("#import-csv").isDisabled()).toBe(true);
    await retry.click();await expect.poll(async()=>{if(attempts.length!==2)return false;const response=await page.request.get(`/api/v1/imports/${attempts[1].id}`);if(response.status()!==200)return false;const value=batchPageSchema.safeParse(await response.json());return value.success&&value.data.state==="previewed"&&value.data.result===null;}).toBe(true);
    expect(Boolean(attempts[0].key)&&attempts[0].key===attempts[1].key&&attempts[0].body===attempts[1].body&&attempts[0].id===attempts[1].id&&attempts[0].id!==original.id).toBe(true);
    const retained=await page.request.get(`/api/v1/imports/${original.id}`);if(retained.status()!==200)throw new Error("SYNTHETIC_IMPORT_ORIGINAL_UNAVAILABLE");const value=batchPageSchema.safeParse(await retained.json());expect(value.success&&value.data.state==="awaiting_upload"&&value.data.result===null).toBe(true);
  }finally{attempts.length=0;await clearActorContext(page);}
});
