import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const json = value => JSON.parse(JSON.stringify(value));
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type)];
}
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory } });
const qualification = loadServer("src/features/deals/qualification-contracts.ts", { modules: { "@/features/contacts/qualification-contracts": vocabulary } });
const deals = loadServer("src/features/deals/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/contacts/qualification-contracts": vocabulary, "@/features/inventory/contracts": inventory, "@/features/requirements/contracts": requirements, "./qualification-contracts": qualification } });
class ApiError extends Error { constructor(code, status, details) { super(code); Object.assign(this, { code, status, details }); } }
const at="2026-10-20T12:00:00Z";
const metadata={ countries: [{ code:"MA", calling_code:"+212" }], languages: [{ value:"french", label:"Français" }], campaign_sources: [{value:"broker", label:"Courtier"}], purchase_reasons:[{value:"residence", label:"Résidence"}], budget_bands:[] };
function contact() { return contacts.contactSchema.parse({ id:randomUUID(), name:"Synthetic contact", type:"person", primary_phone:"+212600000000", primary_email:"synthetic@example.invalid", primary_agent:{id:randomUUID(),display_name:"Synthetic agent"}, version:17, archived_at:null, country:"MA", nationality:"", languages:["french"], calling_code:"+212", phones:[{number:"+212600000000",label:"Mobile",is_primary:true},{number:"+212600000001",label:"Bureau",is_primary:false}], emails:[{email:"synthetic@example.invalid",label:"Bureau",is_primary:true}], roles:["buyer"], source:"manual", source_submission_id:null, created_by_user_id:null, created_at:at, updated_at:at, collaborators:[] }); }
function summary(client) { return contacts.contactSummarySchema.parse(Object.fromEntries(Object.keys(contacts.contactSummarySchema.shape).map(key=>[key,client[key]]))); }
function enquiry(client) { return contacts.enquirySchema.parse({ id:randomUUID(), version:7, contact:summary(client), source:"manual", source_submission_id:null, assigned_agent:null, received_at:at, updated_at:at, created_by_user_id:null, status:"in_progress", origin_contact_id:client.id, initial_budget:"1400000", campaign_source:"broker", rating:"cold", converted_deal_id:null, converted_at:null, archived_at:null, message:"Synthetic message" }); }
function deal(client) { return deals.dealSchema.parse({ id:randomUUID(),version:7,title:"Synthetic deal",stage:"new",contact:summary(client),origin_contact_id:client.id,enquiry_id:null,requirement_id:null,offering:null,next_action:"Synthetic action",stock_review_required:false,archived_at:null,primary_agent_at_close_id:null,active_reservation:null,reservation_conflict:null,customer_offer_count:0,created_by_user_id:randomUUID(),updated_by_user_id:randomUUID(),created_at:at,updated_at:at,initial_budget:"1400000",campaign_source:"broker",rating:"cold",purchase_reasons:["residence"],client_snapshot:{},notes:"Synthetic note",payment_method:"mortgage",number_of_rooms:0,projects:[{position:1,name:"Synthetic project",development_id:null,property_id:null,external_name:"Synthetic project"}] }); }
function clientFields(client) { return Object.fromEntries(["name","type","phones","emails","roles","country","nationality","languages"].map(key=>[key,client[key]])); }
function harness() {
  let cursor=0,formCursor=0; const state=[],forms=[],guarded=[],navigated=[];
  function useState(initial) { const index=cursor++; if (!(index in state)) state[index]=typeof initial==="function"?initial():initial; return [state[index],value=>{state[index]=typeof value==="function"?value(state[index]):value;}]; }
  const react={useState,useEffect(){},useRef(initial){const index=cursor++;if(!(index in state))state[index]={current:initial};return state[index];}};
  const hookForms={useForm({defaultValues}) { const index=formCursor++;if(!forms[index]) {let values=json(defaultValues);forms[index]={control:{index},formState:{errors:{},isSubmitting:false},getValues:key=>key?values[key]:values,reset:next=>{values=json(next);},setError(){},setFocus(){},setValue:(key,value)=>{values[key]=value;},trigger:async()=>true,handleSubmit:callback=>async event=>{event.preventDefault();await callback(values);}};}return forms[index];},useWatch({control,name}){const value=forms[control.index].getValues();return Array.isArray(name)?name.map(key=>value[key]):value;}};
  const draft=loadServer("src/components/shared/dossier-form.tsx",{modules:{react,"react/jsx-runtime":runtime,"./record-header":{RecordHeader:"RecordHeader"}}});
  const modules={react,"react/jsx-runtime":runtime,"react-hook-form":hookForms,"@hookform/resolvers/zod":{zodResolver(){}},"next/link":{default:"Link"},"next/navigation":{useRouter:()=>({push:path=>navigated.push(path)})},"@/components/shared/dossier-form":{...draft,DossierFormHeader:"Header"},"@/components/shared/record-workspace":{RecordSection:"Section"},"@/components/shared/record-header":{RecordHeader:"RecordHeader"},"@/components/shared/unsaved-guard":{useUnsavedGuard:()=>({request:callback=>guarded.push(callback),dialog:null})},"@/hooks/use-hydrated":{useHydrated:()=>true},"@/lib/api/client":{ApiError}};
  for(const [path,name] of [["button","Button"],["form","Form"],["label","Label"],["native-select","Select"],["textarea","Textarea"],["input","Input"],["checkbox","Checkbox"]])modules["@/components/ui/"+path]={[name]:name};
  modules["@/components/ui/native-select"]={NativeSelect:"Select"};
  modules["@/components/ui/form"]={Form:"Form",FormField:"FormField",FormItem:"FormItem",FormLabel:"FormLabel",FormControl:"Control",FormMessage:"Message"};
  return {forms,guarded,navigated,modules,render(callback){cursor=0;formCursor=0;let node=callback();while(typeof node.type==="function"){cursor=0;formCursor=0;node=node.type(node.props);}return node;}};
}
function leadModule(h, command, read=async()=>contact(), profile) {
  const local={"./contracts":contacts,"./contact-fields":{ContactFields:"ContactFields",blankContact:clientFields(contact())},"./agent-picker":{AgentPicker:"Agent"},"./contact-selector":{ContactSelector:"ContactSelector"},"./qualification-contracts":vocabulary,"./record-states":{RecordError:"Error",CommandError:"CommandError"},"./use-query":{useQuery:path=>({value:path.includes("metadata")?metadata:profile,refresh(){}})},"./lead-qualification-fields":{LeadQualificationFields:"Qualification",blankQualification:{initial_budget:"",campaign_source:"unknown",rating:"cold",status:"new"}}};
  return {modules:{...h.modules,...local,"@/lib/api/client":{ApiError,apiGet:read},"@/lib/api/command":{apiCommand:command}},globals:{crypto:{randomUUID}}};
}
function dealModule(h,command,profile,read=async()=>profile) {
  const modules={...h.modules,"./contracts":deals,"./qualification-contracts":qualification,"./context-picker":{OfferingPicker:"Offering",RequirementPicker:"Requirement"},"./project-picker":{ProjectPicker:"Project"},"@/lib/api/client":{ApiError,apiGet:read},"@/lib/api/command":{apiCommand:command}};
  for(const [name,exports] of [["contracts",contacts],["qualification-contracts",vocabulary],["contact-fields",{ContactFields:"ContactFields",blankContact:clientFields(contact())}],["contact-selector",{ContactSelector:"ContactSelector"}],["agent-picker",{AgentPicker:"Agent"}],["qualification-inputs",{BudgetInput:"Budget"}],["record-states",{RecordError:"Error",CommandError:"CommandError"}],["use-query",{useQuery:path=>({value:path.includes("metadata")?metadata:profile,refresh(){}})}]])modules["@/features/contacts/"+name]=exports;
  return {modules,globals:{crypto:{randomUUID}}};
}
const submit=tree=>find(tree,"form")[0].props.onSubmit({preventDefault(){}});

test("Dossier draft tracks actual values and accepts only the reviewed successful/reloaded baseline",()=>{
  const h=harness(),draft=loadServer("src/components/shared/dossier-form.tsx",{modules:{react:h.modules.react,"react/jsx-runtime":runtime,"./record-header":{RecordHeader:"RecordHeader"}}});
  let value={name:"Original",phones:[{number:"+212600000000",is_primary:true}]};
  const render=()=>h.render(()=>({type:"State",props:draft.useDossierDraft(value)})).props;
  assert.equal(render().dirty,false);value={...value,name:"Draft"};assert.equal(render().dirty,true);
  render().accept({name:"Reloaded",phones:value.phones});assert.equal(render().dirty,true);
  value={...value,name:"Reloaded"};assert.equal(render().dirty,false);
  value={...value,name:"Saved"};render().accept();assert.equal(render().dirty,false);
});

test("Lead create renders one sheet with header actions, scoped reuse and a same-key retry",async()=>{
  const h=harness(),calls=[],client=contact(),result=enquiry(client);let interrupted=true;
  const loaded=loadServer("src/features/contacts/lead-create.tsx",leadModule(h,async(...args)=>{calls.push(args);if(interrupted)throw new ApiError("DEPENDENCY_UNAVAILABLE",503);return result;}));
  const render=()=>h.render(()=>loaded.LeadCreate({role:"manager"}));let tree=render();
  assert.equal(find(tree,"fieldset").filter(n=>n.props.className?.includes("kay-form-sheet")).length,1);
  assert.deepEqual(find(tree,"Section").map(n=>n.props.title),["Contact","Qualification du prospect","Responsabilité"]);
  assert.equal(find(tree,"Button").filter(n=>n.props.type==="submit").length,1);
  find(tree,"Agent")[0].props.change(client.primary_agent.id);
  find(tree,"Qualification")[0].props.change({initial_budget:"1400000"});
  tree=render();submit(tree);await delay(0);assert.equal(calls.length,1);assert.equal(calls[0][1].new_contact.primary_agent_id,client.primary_agent.id);assert.equal(calls[0][1].source,"manual");
  tree=render();assert.equal(find(tree,"form")[0].props["data-live-dirty"],"true");
  submit(tree);await delay(0);assert.equal(calls.length,2);assert.equal(calls[0][3],calls[1][3]);assert.deepEqual(json(calls[0][1]),json(calls[1][1]));
  interrupted=false;tree=render();submit(tree);await delay(0);assert.deepEqual(h.navigated,["/leads/"+result.id]);assert.equal(find(render(),"form")[0].props["data-live-dirty"],undefined);
});

test("Lead create validation lock refuses a concurrent submit and releases after invalid input",async()=>{
  const h=harness(),calls=[];const loaded=loadServer("src/features/contacts/lead-create.tsx",leadModule(h,async(...args)=>{calls.push(args);}));
  const render=()=>h.render(()=>loaded.LeadCreate({role:"agent"}));let tree=render(),release;
  h.forms[0].trigger=()=>new Promise(resolve=>{release=resolve;});
  submit(tree);submit(tree);assert.equal(typeof release,"function");release(false);await delay(0);assert.equal(calls.length,0);
  h.forms[0].trigger=async()=>true;find(tree,"Qualification")[0].props.change({initial_budget:"1400000"});tree=render();submit(tree);await delay(0);assert.equal(calls.length,1);
});

test("Lead create uses only the explicitly chosen existing contact and retains guarded cancel",async()=>{
  const h=harness(),client=contact(),calls=[];const loaded=loadServer("src/features/contacts/lead-create.tsx",leadModule(h,async(...args)=>{calls.push(args);throw new ApiError("DEPENDENCY_UNAVAILABLE",503);}));
  const render=()=>h.render(()=>loaded.LeadCreate({role:"manager"}));let tree=render();find(tree,"Select").find(n=>n.props.id==="contact-mode").props.onChange({target:{value:"existing"}});tree=render();find(tree,"ContactSelector")[0].props.choose(summary(client));find(tree,"Qualification")[0].props.change({initial_budget:"1400000"});tree=render();
  find(tree,"Button").find(n=>n.props.action==="cancel").props.onClick();assert.equal(h.guarded.length,1);assert.equal(h.navigated.length,0);
  submit(tree);await delay(0);assert.equal(calls[0][1].contact_id,client.id);assert.equal(calls[0][1].new_contact,undefined);assert.equal(calls[0][1].assigned_agent_id,client.primary_agent.id);
});

test("Lead edit atomically retains contact collections, reloads both versions and clears only successful drafts",async()=>{
  const h=harness(),client=contact(),value=enquiry(client),calls=[];let fresh={...value,version:9,message:"Reloaded message"},freshClient={...client,version:19};
  const loaded=loadServer("src/features/contacts/lead-editor.tsx",leadModule(h,async(...args)=>{calls.push(args);return {...fresh,message:args[1].message,contact:summary(freshClient)};},async path=>path.includes("enquiries")?fresh:freshClient,client));
  const render=()=>h.render(()=>loaded.LeadEditor({enquiry:value}));let tree=render();h.forms[0].setValue("name","Draft contact");h.forms[1].setValue("message","Draft request");tree=render();assert.equal(find(tree,"form")[0].props["data-live-dirty"],"true");submit(tree);await delay(0);
  assert.equal(calls[0][1].expected_version,7);assert.equal(calls[0][1].contact_fields.expected_version,17);assert.deepEqual(json(calls[0][1].contact_fields.phones),json(client.phones));assert.deepEqual(json(calls[0][1].contact_fields.emails),json(client.emails));
  tree=render();assert.equal(find(tree,"form")[0].props["data-live-dirty"],undefined);h.forms[1].setValue("message","Second draft");tree=render();submit(tree);await delay(0);assert.equal(calls[1][1].expected_version,9);assert.equal(calls[1][1].contact_fields,undefined);
});

test("Deal edit keeps exact qualification, zero, linked context and version while rejecting duplicate submits",async()=>{
  const h=harness(),client=contact(),value=deal(client),calls=[];let finish;const loaded=loadServer("src/features/deals/deal-form.tsx",dealModule(h,async(...args)=>{calls.push(args);return new Promise(resolve=>{finish=resolve;});},client));
  const render=()=>h.render(()=>loaded.DealForm({value,contact:value.contact,saved:async()=>{},cancel(){}}));let tree=render();
  assert.deepEqual(find(tree,"Section").map(n=>n.props.title),["Contact","Projet et budget","Qualification de l’affaire"]);
  find(tree,"Textarea").find(n=>n.props.id==="deal-notes").props.onChange({target:{value:"Draft note"}});h.forms[0].setValue("name","Draft contact");tree=render();submit(tree);submit(tree);await delay(0);assert.equal(calls.length,1);
  assert.equal(calls[0][0],"/api/v1/deals/"+value.id);assert.equal(calls[0][4],"PATCH");assert.equal(calls[0][1].number_of_rooms,0);assert.equal(calls[0][1].expected_version,7);assert.equal(calls[0][1].contact_fields.expected_version,17);assert.equal(calls[0][1].notes,"Draft note");assert.equal(calls[0][1].next_action,value.next_action);assert.equal(calls[0][1].stage,undefined);assert.deepEqual(json(calls[0][1].projects),[{external_name:"Synthetic project"}]);
  finish({id:value.id,version:8});await delay(0);assert.equal(find(render(),"form")[0].props["data-live-dirty"],undefined);
});

test("Manual deal preserves existing-contact reuse, ordinary initial stage and complete same-key retry",async()=>{
  const h=harness(),client=contact(),calls=[];const loaded=loadServer("src/features/deals/deal-form.tsx",dealModule(h,async(...args)=>{calls.push(args);throw new ApiError("DEPENDENCY_UNAVAILABLE",503);},client));
  const render=()=>h.render(()=>loaded.DealForm({contact:summary(client),role:"manager",saved:async()=>{}}));let tree=render();find(tree,"Budget")[0].props.onChange("1400000");find(tree,"Project")[0].props.choose({choice:{external_name:"Synthetic project"},label:"Synthetic project"});find(tree,"Checkbox")[0].props.onCheckedChange(true);find(tree,"Select").find(n=>n.props.id==="initial-stage").props.onChange({target:{value:"visit"}});tree=render();submit(tree);await delay(0);assert.equal(calls.length,1);
  assert.equal(calls[0][1].contact_id,client.id);assert.equal(calls[0][1].new_contact,undefined);assert.equal(calls[0][1].stage,"visit");assert.deepEqual(json(calls[0][1].purchase_reasons),["residence"]);tree=render();submit(tree);await delay(0);assert.equal(calls[0][3],calls[1][3]);assert.deepEqual(json(calls[0][1]),json(calls[1][1]));
});


test("Deal conflict retains the draft until an explicit complete version reload",async()=>{
  const h=harness(),client=contact(),value=deal(client),calls=[];const fresh={...value,version:11,notes:"Reloaded note"},freshClient={...client,version:21,name:"Reloaded contact"};let conflict=true;
  const loaded=loadServer("src/features/deals/deal-form.tsx",dealModule(h,async(...args)=>{calls.push(args);if(conflict)throw new ApiError("DEAL_VERSION_CONFLICT",409);return {id:value.id,version:12};},client,async path=>path.includes("deals")?fresh:freshClient));
  const render=()=>h.render(()=>loaded.DealForm({value,contact:value.contact,saved:async()=>{}}));let tree=render();find(tree,"Textarea").find(n=>n.props.id==="deal-notes").props.onChange({target:{value:"Unsaved note"}});tree=render();submit(tree);await delay(0);tree=render();
  assert.equal(find(tree,"Textarea").find(n=>n.props.id==="deal-notes").props.value,"Unsaved note");assert.equal(find(tree,"form")[0].props["data-live-dirty"],"true");assert.equal(find(tree,"Button").find(n=>n.props.type==="submit").props.disabled,true);
  find(tree,"Button").find(n=>n.props.action==="refresh").props.onClick();await delay(0);tree=render();assert.equal(find(tree,"Textarea").find(n=>n.props.id==="deal-notes").props.value,"Reloaded note");assert.equal(h.forms[0].getValues("name"),"Reloaded contact");assert.equal(find(tree,"form")[0].props["data-live-dirty"],undefined);
  conflict=false;find(tree,"Textarea").find(n=>n.props.id==="deal-notes").props.onChange({target:{value:"Reviewed change"}});tree=render();submit(tree);await delay(0);assert.equal(calls[1][1].expected_version,11);assert.equal(calls[1][1].contact_fields,undefined);
});

test("Full contact editor preserves collections, version and retry identity; only success clears its managed draft",async()=>{
  const h=harness(),client=contact(),calls=[];let interrupted=true,saved=0;
  const options=leadModule(h,async(...args)=>{calls.push(args);if(interrupted)throw new ApiError("DEPENDENCY_UNAVAILABLE",503);return {...client,version:18};},async()=>client,client);
  const loaded=loadServer("src/features/contacts/contact-editor.tsx",options);
  const render=()=>h.render(()=>loaded.ContactEditor({contact:client,saved:()=>saved++,cancel(){}}));let tree=render();assert.equal(find(tree,"ContactFields")[0].props.workspace,true);h.forms[0].setValue("name","Draft name");tree=render();submit(tree);await delay(0);tree=render();assert.equal(find(tree,"form")[0].props["data-live-dirty"],"true");interrupted=false;submit(tree);await delay(0);assert.equal(saved,1);assert.equal(calls[0][3],calls[1][3]);assert.equal(calls[1][1].expected_version,17);assert.deepEqual(json(calls[1][1].phones),json(client.phones));assert.deepEqual(json(calls[1][1].emails),json(client.emails));assert.equal(find(render(),"form")[0].props["data-live-dirty"],undefined);
});


test("Navigation leaves managed picker input clean and blocks page links for an in-flight command even without a draft",()=>{
  const h=harness(),effects=[],events={},windowEvents={};let busy=false;
  class Element { closest(selector) { return selector==="a[href]"?link:selector==="[data-filter-panel]"?null:form; } }
  class HTMLElement extends Element { focus(){} }
  const form={dataset:{},hasAttribute:name=>name==="data-draft-managed",querySelector:()=>null};
  const link={href:"https://crm.synthetic.invalid/leads",target:"",hasAttribute:()=>false};
  const document={activeElement:new HTMLElement(),addEventListener:(name,callback)=>{events[name]=callback;},removeEventListener(){},querySelector:selector=>selector.includes("aria-busy")?(busy?{}:null):form.dataset.liveDirty==="true"?form:null,querySelectorAll:()=>form.dataset.liveDirty==="true"?[form]:[]};
  const modules={...h.modules,react:{...h.modules.react,useCallback:callback=>callback,useEffect:callback=>effects.push(callback)},"./navigation-intent":{},"@/lib/navigation-intent":loadServer("src/lib/navigation-intent.ts")};
  modules["@/lib/discard-draft-action"]=loadServer("src/lib/discard-draft-action.ts");
  modules["@/lib/history-draft-guard"]=loadServer("src/lib/history-draft-guard.ts");
  for(const name of ["AlertDialog","AlertDialogCancel","AlertDialogContent","AlertDialogDescription","AlertDialogTitle"])modules["@/components/ui/alert-dialog"]={...modules["@/components/ui/alert-dialog"],[name]:name};
  const loaded=loadServer("src/components/shared/unsaved-guard.tsx",{modules,globals:{document,Element,HTMLElement,location:{href:"https://crm.synthetic.invalid/deals/new",origin:"https://crm.synthetic.invalid"},window:{addEventListener:(name,callback)=>{windowEvents[name]=callback;},removeEventListener(){},dispatchEvent(){}},Event:class Event{}}});
  const render=()=>h.render(()=>loaded.WorkspaceNavigationGuard());render();effects.shift()();
  events.input({target:new Element()});assert.equal(form.dataset.liveDirty,undefined);
  let prevented=0;const click=()=>events.click({target:new Element(),button:0,preventDefault:()=>prevented++,stopPropagation(){}});
  busy=true;click();assert.equal(prevented,1);assert.equal(h.navigated.length,0);
  busy=false;click();assert.equal(prevented,1);assert.equal(h.navigated.length,0);
  form.dataset.liveDirty="true";click();assert.equal(prevented,2);assert.equal(h.navigated.length,0);
  const dialog=render();find(dialog,"Button").find(n=>n.props.action==="forward").props.onClick();assert.deepEqual(h.navigated,["/leads"]);assert.equal(form.dataset.liveDirty,undefined);
});
