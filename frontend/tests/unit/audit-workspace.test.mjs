import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const jsx=(type,props,key)=>({type,props,key}),runtime={jsx,jsxs:jsx,Fragment:"Fragment"};
function find(node,type){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(child=>find(child,type));return[...(node.type===type?[node]:[]),...find(node.props?.children,type)];}
function text(node){if(node==null||typeof node==="boolean")return"";if(Array.isArray(node))return node.map(text).join("");return typeof node==="object"?text(node.props?.children):String(node);}
const plain=value=>JSON.parse(JSON.stringify(value));
function hooks(){const slots=[],pending=[];let cursor=0;return{
 react:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==="function"?initial():initial;return[slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},useId:()=>"synthetic-audit",useEffect(run,deps){const i=cursor++,old=slots[i];if(!old||deps.some((value,n)=>!Object.is(value,old.deps[n]))){const next={deps};slots[i]=next;pending.push(()=>{old?.cleanup?.();next.cleanup=run();});}}},
 render(fn){cursor=0;return fn();},effects(){pending.splice(0).forEach(run=>run());},
};}
class ApiError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
const qualification=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":qualification}}),contracts=loadServer("src/features/discovery/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}}),ownership=loadServer("src/features/contacts/ownership-contracts.ts",{modules:{"./contracts":contacts}});
const row=()=>({id:randomUUID(),action:"contacts.created",actor_id:randomUUID(),actor_name:"Synthetic audit actor",created_at:"2026-10-20T15:00:00+01:00",target_user_id:null,targets:{contact:randomUUID()}});
const page=items=>({items,total:31,page:1,page_size:25,has_previous:false,has_next:true});
const actors=()=>({...page([{kind:"user",id:randomUUID(),display_name:"Synthetic historical user"}]),page_size:5});
function common(h,read=()=>({})){return{
 react:h.react,"react/jsx-runtime":runtime,"next/link":{default:"Link"},"@/components/ui/button":{Button:"Button"},"@/components/ui/input":{Input:"Input"},"@/components/ui/label":{Label:"Label"},"@/components/ui/native-select":{NativeSelect:"Select"},
 "@/components/ui/popover":{Popover:"Popover",PopoverContent:"Popup",PopoverTrigger:"Trigger"},"@/components/icons":{ClockIcon:"Icon"},"@/components/shared/data-table":{DataTable:"Table"},"@/components/shared/record-entry":{RecordEntry:"Entry"},
 "@/features/contacts/numbered-pages":{NumberedPages:"Pages"},"@/features/contacts/record-states":{RecordError:"Error"},"@/features/contacts/use-query":{queryPath:(kind,values)=>`/api/v1/${kind}?${new URLSearchParams(Object.entries(values).filter(([,value])=>value!==undefined&&value!==""))}`,useQuery:read},"@/hooks/use-hydrated":{useHydrated:()=>true},"@/lib/format":{formatInstant:value=>value},"./contracts":contracts,
};}

test("Audit choices expose only bounded attribution metadata; actual web/unattributed event names fit without invented user IDs",()=>{
 assert.ok(contracts.auditActorsSchema.safeParse(actors()).success);for(const actor of [{id:null,display_name:"System"},{id:randomUUID(),display_name:""},{id:randomUUID(),display_name:"x".repeat(161)},{id:randomUUID(),display_name:"User",email:"private@example.invalid"},{id:randomUUID(),display_name:"User",role:"administrator"}])assert.equal(contracts.auditActorsSchema.safeParse(page([actor])).success,false);
 for(const query of [{q:"x".repeat(161)},{page_size:101},{page:0},{role:"manager"},{family:"security"},{actor_id:randomUUID()}])assert.equal(contracts.auditActorsQuerySchema.safeParse(query).success,false);
 for(const actor_name of ["Auteur non renseigné","Source web : "+"S".repeat(160)])assert.ok(contracts.auditSchema.safeParse(page([{...row(),actor_id:null,actor_name}])).success);
 assert.equal(contracts.auditSchema.safeParse(page([{...row(),actor_name:"x".repeat(174)}])).success,false);assert.equal(contracts.auditSchema.safeParse(page([{...row(),targets:{document:"unsafe"}}])).success,false);assert.equal(contracts.auditQuerySchema.safeParse({actor_id:"unattributed"}).success,false);
});

test("Typed staff/web/unattributed authors have disjoint identities and each narrows the existing event query unambiguously",()=>{
 const id=randomUUID(),user={kind:"user",id,display_name:"Synthetic user"},web={kind:"website",id,display_name:"Source web : "+"S".repeat(160)},unattributed={kind:"unattributed",id:null,display_name:"Auteur non renseigné"};
 assert.ok(contracts.auditActorsSchema.safeParse(page([user,web,unattributed])).success);assert.notEqual(contracts.auditActorKey(user),contracts.auditActorKey(web));assert.equal(contracts.auditActorKey(unattributed),"unattributed");
 for(const actor of [{...user,display_name:"x".repeat(161)},{...web,id:null},{...web,key_digest:"forbidden"},{...unattributed,id},{...unattributed,display_name:"invented"}])assert.equal(contracts.auditActorsSchema.safeParse(page([actor])).success,false);
 for(const query of [{actor_id:id},{website_source_id:id},{unattributed_actor:"true"}])assert.ok(contracts.auditQuerySchema.safeParse(query).success);
 for(const query of [{actor_id:id,website_source_id:id},{actor_id:id,unattributed_actor:"true"},{website_source_id:id,unattributed_actor:"true"},{unattributed_actor:"false"}])assert.equal(contracts.auditQuerySchema.safeParse(query).success,false);
 const s=bodySetup();let view=s.render();find(view,"ActorPicker")[0].props.change(web);view=s.render();assert.ok(s.calls.at(-1).includes("website_source_id="+id));assert.ok(!s.calls.at(-1).includes("actor_id="));assert.equal(find(view,"ActorPicker")[0].props.value,"website:"+id);
 find(view,"ActorPicker")[0].props.change(unattributed);view=s.render();assert.ok(s.calls.at(-1).includes("unattributed_actor=true"));assert.ok(!s.calls.at(-1).includes("website_source_id="));assert.equal(find(view,"ActorPicker")[0].props.value,"unattributed");
 find(view,"ActorPicker")[0].props.change(user);s.render();assert.ok(s.calls.at(-1).includes("actor_id="+id));assert.ok(!s.calls.at(-1).includes("unattributed_actor="));
});

test("The actual audit route retains identity/role checks and passes current role without reading query context while unauthenticated",async()=>{
 let role="manager",authenticated=true,inspected=0;const h=hooks();
 const{default:Page}=loadServer("src/app/(workspace)/[section]/page.tsx",{modules:{
  ...common(h),"next/navigation":{notFound(){throw Error("NOT_FOUND");}},"@/components/shared/page-header":{PageHeader:"Header"},"@/features/discovery/audit-panel":{AuditPanel:"Audit"},"@/features/auth/auth-frame":{AuthUnavailable:"Unavailable"},"@/features/reports/workspace-dashboard":{WorkspaceDashboard:"Dashboard"},
  "@/lib/auth/server":{requireIdentity:async()=>authenticated?{state:"authenticated",profile:{user:{role,display_name:"Synthetic"}}}:{state:"unavailable"}},
 }});
 for(role of ["manager","administrator"]){const view=await Page({params:Promise.resolve({section:"dashboard"}),searchParams:Promise.resolve({view:"audit"})});assert.equal(find(view,"Audit")[0].props.role,role);}
 role="agent";const denied=await Page({params:Promise.resolve({section:"dashboard"}),searchParams:Promise.resolve({view:"audit"})});assert.equal(find(denied,"Audit").length,0);assert.ok(text(denied).includes("Accès non autorisé"));
 authenticated=false;const unavailable=await Page({params:Promise.resolve({section:"dashboard"}),searchParams:{then(){inspected++;throw Error("MUST_NOT_READ");}}});assert.equal(unavailable.type,"Unavailable");assert.equal(inspected,0);
});

test("Audit facade forwards only the current session and bounded paged history choices with no-store; extra fields and injected scope fail closed",async()=>{
 const origin="https://frontend.synthetic.invalid",calls=[];let upstream={status:200,body:actors()};
 const{relayDiscovery}=loadServer("src/features/discovery/facade.ts",{modules:{
  "next/headers":{cookies:async()=>({get:()=>({value:"synthetic-session"})})},"@/lib/auth/facade":{boundedJson:request=>request.json(),frontendOrigin:()=>origin},"@/lib/auth/contracts":{SESSION_COOKIE:"synthetic-cookie"},
  "@/lib/api/facade":{facadeError:(status,code)=>Response.json({error:{code}},{status}),upstreamRequest:async(...args)=>{calls.push(args);return upstream;}},"./contracts":contracts,
 }});
 const result=await relayDiscovery("audit/actors",new Request(origin+"/api/v1/audit/actors?q=%25%5F&page=2&page_size=5"),"id");assert.equal(result.status,200);assert.equal(result.headers.get("cache-control"),"no-store");assert.equal(calls[0][0],"/api/v1/audit/actors?q=%25%5F&page=2&page_size=5");assert.equal(calls[0][2].token,"synthetic-session");assert.equal(calls[0][2].maxResponseBytes,2097152);
 upstream={status:200,body:page([{...row(),actor_id:null,actor_name:"Auteur non renseigné"}])};
 for(const query of ["website_source_id="+randomUUID(),"unattributed_actor=true"]){const current=await relayDiscovery("audit/events",new Request(origin+"/api/v1/audit/events?"+query),"id");assert.equal(current.status,200);assert.equal(calls.at(-1)[0],"/api/v1/audit/events?"+query);}
 const conflictCalls=calls.length;assert.equal((await relayDiscovery("audit/events",new Request(origin+"/api/v1/audit/events?actor_id="+randomUUID()+"&unattributed_actor=true"),"id")).status,422);assert.equal(calls.length,conflictCalls);
 for(const suffix of ["?q=a&q=b","?q=a&role=manager","?family=security","?actor_id="+randomUUID(),"?page_size=101"]){const before=calls.length;assert.equal((await relayDiscovery("audit/actors",new Request(origin+"/api/v1/audit/actors"+suffix),"id")).status,422);assert.equal(calls.length,before);}
 const before=calls.length;assert.equal((await relayDiscovery("audit/actors",new Request(origin+"/api/v1/audit/actors",{method:"POST"}),"id")).status,404);assert.equal(calls.length,before);
 upstream={status:200,body:page([{id:randomUUID(),display_name:"Private upstream name",email:"private@example.invalid"}])};let rejected=await relayDiscovery("audit/actors",new Request(origin+"/api/v1/audit/actors"),"id");assert.equal(rejected.status,503);assert.ok(!(await rejected.text()).includes("Private upstream name"));
 upstream={status:403,body:{error:{code:"FORBIDDEN"},items:actors().items}};rejected=await relayDiscovery("audit/actors",new Request(origin+"/api/v1/audit/actors"),"id");assert.equal(rejected.status,403);assert.ok(!(await rejected.text()).includes("Synthetic historical user"));
});

test("Actor picker is lazy, preserves the selected label and closes only on explicit selection",()=>{
 const h=hooks(),calls=[],chosen=[];const loaded=loadServer("src/features/discovery/audit-actor-picker.tsx",{modules:common(h,path=>{calls.push(path);return{value:actors()};})});
 const value="user:"+randomUUID(),render=()=>h.render(()=>loaded.AuditActorPicker({value,label:"Selected historical actor",change:actor=>chosen.push(actor)}));let view=render();assert.equal(calls.length,0);assert.equal(find(view,loaded.AuditActorOptions).length,0);assert.ok(text(view).includes("Selected historical actor"));
 find(view,"Popover")[0].props.onOpenChange(true);view=render();assert.equal(find(view,"Popup")[0].props["data-draft-managed"],true);const options=find(view,loaded.AuditActorOptions)[0];assert.equal(options.props.value,value);const selected={kind:"user",id:randomUUID(),display_name:"Other actor"};options.props.select(selected);assert.equal(chosen[0],selected);assert.equal(find(render(),"Popover")[0].props.open,false);
});

test("Actor options search/page through complete server totals, clear stale rows on edits/errors and propagate current authority loss",()=>{
 const h=hooks(),calls=[],selection=[],denials=[],query={value:actors(),refresh(){}};
 const{AuditActorOptions}=loadServer("src/features/discovery/audit-actor-picker.tsx",{modules:common(h,path=>{calls.push(path);return query;})});const render=()=>h.render(()=>AuditActorOptions({value:query.value?contracts.auditActorKey(query.value.items[0]):"",select:actor=>selection.push(actor),denied:error=>denials.push(error)}));let view=render();h.effects();assert.ok(calls[0].includes("page_size=5"));const choose=find(view,"Button").find(button=>button.props.action==="contact");assert.equal(choose.props["aria-pressed"],true);choose.props.onClick();assert.equal(selection[0].display_name,"Synthetic historical user");
 find(view,"Button").find(button=>button.props["aria-label"]==="Utilisateurs suivants").props.onClick();render();assert.ok(calls.at(-1).includes("page=2"));find(render(),"Input")[0].props.onChange({target:{value:"literal %_"}});query.value=undefined;view=render();assert.ok(calls.at(-1).includes("page=1"));assert.ok(calls.at(-1).includes("q=literal+%25_"));assert.ok(!text(view).includes("Synthetic historical user"));
 query.error=new ApiError("FORBIDDEN",403);view=render();h.effects();assert.equal(find(view,"li").length,0);assert.equal(denials.at(-1).code,"FORBIDDEN");assert.equal(find(view,"Error")[0].props.error.code,"FORBIDDEN");
});

function bodySetup(){const h=hooks(),calls=[];const query={value:page([row()]),refresh(){query.value=undefined;calls.push("refresh");}};const loaded=loadServer("src/features/discovery/audit-panel.tsx",{modules:{...common(h,path=>{calls.push(path);return query;}),"./audit-actor-picker":{AuditActorPicker:"ActorPicker"},"./audit-presentation":{AuditAction:"AuditAction",AuditTargets:"Targets",auditActionLabel:action=>"Readable "+action}}});return{h,...loaded,query,calls,render:()=>h.render(()=>loaded.AuditBody({role:"manager"}))};}
test("Audit filters apply the selected four-field layout immediately, reset paging and preserve the applied result on invalid dates",()=>{
 const s=bodySetup();let view=s.render();assert.equal(s.AuditPanel({role:"agent"}).type,"p");assert.equal(find(view,"fieldset")[0].props.className.includes("xl:grid-cols-4"),true);assert.equal(find(view,"form")[0].props["data-draft-managed"],true);assert.equal(find(view,"form")[0].props.role,"search");assert.equal(find(view,"Pages")[0].props.total,31);assert.deepEqual(plain(find(view,"Table")[0].props.columns.map(column=>column.header)),["Date","Utilisateur","Action","Objet"]);
 find(view,"Pages")[0].props.change(4);view=s.render();assert.ok(s.calls.at(-1).includes("page=4"));find(view,"Select")[0].props.onChange({target:{value:"deals"}});view=s.render();assert.ok(s.calls.at(-1).includes("family=deals"));assert.ok(s.calls.at(-1).includes("page=1"));
 const id=randomUUID();find(view,"ActorPicker")[0].props.change({kind:"user",id,display_name:"Selected private actor"});view=s.render();assert.ok(s.calls.at(-1).includes("actor_id="+id));find(view,"Input").find(input=>input.props.id==="audit-from").props.onChange({target:{value:"2026-10-20"}});view=s.render();find(view,"Pages")[0].props.change(3);view=s.render();find(view,"Input").find(input=>input.props.id==="audit-to").props.onChange({target:{value:"2026-10-10"}});view=s.render();assert.ok(s.calls.at(-1).includes("page=3"));assert.ok(!s.calls.at(-1).includes("end_on="));assert.ok(text(view).includes("Vérifiez les filtres"));
 find(view,"Input").find(input=>input.props.id==="audit-to").props.onChange({target:{value:"2026-10-23"}});view=s.render();assert.ok(s.calls.at(-1).includes("page=1"));assert.ok(s.calls.at(-1).includes("end_on=2026-10-23"));find(view,"Button").find(button=>button.props.action==="reset").props.onClick();s.render();assert.ok(!s.calls.at(-1).includes("actor_id"));assert.ok(!s.calls.at(-1).includes("family="));
});

test("Read and actor-choice authority failures remove all previous audit names/counts/filters; phone cards retain actor/time/action and exact targets",()=>{
 const s=bodySetup();let view=s.render(),table=find(view,"Table")[0],card=table.props.mobileCard(s.query.value.items[0]);assert.equal(card.type,"Entry");assert.equal(card.props.meta[0].value,"Synthetic audit actor");assert.equal(card.props.meta[1].value.props.dateTime,s.query.value.items[0].created_at);assert.equal(find(card,"Targets")[0].props.row,s.query.value.items[0]);
 find(view,"ActorPicker")[0].props.change({kind:"user",id:randomUUID(),display_name:"Selected private actor"});view=s.render();find(view,"ActorPicker")[0].props.denied(new ApiError("FORBIDDEN",403));view=s.render();assert.equal(find(view,"Table").length,0);assert.equal(find(view,"ActorPicker").length,0);assert.ok(!text(view).includes("Selected private actor"));find(view,"Error")[0].props.retry();view=s.render();assert.equal(find(view,"Table").length,0);assert.ok(text(view).includes("Chargement du journal"));assert.equal(find(view,"ActorPicker")[0].props.label,"");assert.ok(!s.calls.at(-1).includes("actor_id="));
 s.query.value=page([row()]);s.query.error=new ApiError("UNAUTHENTICATED",401);view=s.render();assert.equal(find(view,"Table").length,0);assert.equal(find(view,"form").length,0);
});

test("Audit objects use only typed parent URLs and admin-only staff links, retain exact IDs accessibly and never fabricate an offering route",()=>{
 const inventory=loadServer("src/features/inventory/history-labels.ts");
 const h=hooks(),{AuditTargets,auditActionLabel}=loadServer("src/features/discovery/audit-presentation.tsx",{modules:{...common(h),"@/features/contacts/ownership-contracts":ownership,"@/features/inventory/history-labels":inventory}});
 const event={...row(),target_user_id:randomUUID(),targets:Object.fromEntries(["contact","enquiry","property","development","offering","deal"].map(kind=>[kind,randomUUID()]))};let view=AuditTargets({row:event,role:"manager"});let links=find(view,"Link");assert.equal(links.length,5);assert.ok(links.every(link=>link.props.prefetch===false));assert.ok(!links.some(link=>link.props.href.includes("settings")));assert.ok(!links.some(link=>link.props.href.includes("offerings")));assert.ok(links.every(link=>link.props["aria-label"].includes(link.props.href.split("/").at(-1))));
 view=AuditTargets({row:event,role:"administrator"});links=find(view,"Link");assert.ok(links.some(link=>link.props.href===`/settings/users/${event.target_user_id}/edit`));assert.ok(links.some(link=>link.props.href===`/projects/properties/${event.targets.property}`));assert.ok(links.some(link=>link.props.href===`/projects/${event.targets.development}`));assert.equal(auditActionLabel("visits.created"),ownership.activityLabels["visits.created"]);assert.equal(auditActionLabel("identity.login"),"Connexion");assert.equal(auditActionLabel("unknown.future.action"),"unknown.future.action");
 for(const[action,label]of Object.entries(inventory.inventoryActionLabels))assert.equal(auditActionLabel(action),label);
});
