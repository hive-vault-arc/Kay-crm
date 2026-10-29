import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadServer } from "./load-server.mjs";

const jsx=(type,props,key)=>({type,props,key}),runtime={jsx,jsxs:jsx,Fragment:"Fragment"};
function find(node,type){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(child=>find(child,type));return[...(node.type===type?[node]:[]),...find(node.props?.children,type)];}
function text(node){if(node==null||typeof node==="boolean")return"";if(Array.isArray(node))return node.map(text).join("");return typeof node==="object"?text(node.props?.children):String(node);}
const plain=value=>JSON.parse(JSON.stringify(value));
function hooks(){const slots=[],effects=[];let cursor=0;return{react:{useCallback:fn=>fn,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==="function"?initial():initial;return[slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useId:()=>"synthetic-export",useEffect(run,deps){const i=cursor++,prior=slots[i];if(!prior||deps.some((value,n)=>!Object.is(value,prior.deps[n]))){const current={deps};slots[i]=current;effects.push(()=>{prior?.cleanup?.();current.cleanup=run();});}}},render(fn){cursor=0;let value=fn();while(typeof value?.type==="function")value=value.type(value.props);return value;},effects(){effects.splice(0).forEach(run=>run());},dispose(){slots.forEach(slot=>slot?.cleanup?.());}};}
class ApiError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
const vocabulary=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":vocabulary}}),contracts=loadServer("src/features/discovery/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}});
const reviewModel=loadServer("src/features/discovery/export-review.ts",{modules:{"./contracts":contracts,"@/features/contacts/contracts":contacts,"@/features/contacts/qualification-contracts":vocabulary}});
const job=(state="ready")=>contracts.exportSchema.parse({id:randomUUID(),kind:"enquiries",state,error_code:null,row_count:state==="ready"?0:null,size_bytes:state==="ready"?1024:null,created_at:"2026-10-20T15:00:00+01:00",completed_at:state==="ready"?"2026-10-20T15:01:00+01:00":null});
function common(h){return{react:h.react,"react/jsx-runtime":runtime,"next/link":{default:"Link"},"@/components/ui/button":{Button:"Button"},"@/components/ui/checkbox":{Checkbox:"Checkbox"},"@/components/ui/label":{Label:"Label"},"@/components/ui/sheet":{Sheet:"Sheet",SheetContent:"SheetContent",SheetHeader:"Header",SheetTitle:"Title",SheetDescription:"Description"},"@/hooks/use-hydrated":{useHydrated:()=>true},"@/features/contacts/record-states":{RecordError:"Error"},"@/lib/api/client":{ApiError},"./contracts":contracts};}
function actionSetup(command=async()=>job("queued")){
 const h=hooks(),calls=[],busy=[],focus=[];let props={kind:"enquiries",filters:{q:"original",status:"new",page:8,page_size:20},total:7,renderActions:actions=>jsx("Toolbar",{children:jsx("TransientPopover",{children:actions})})};
 const request=loadServer("src/features/discovery/use-export-request.ts",{globals:{AbortController,structuredClone,crypto:{randomUUID}},modules:{...common(h),"./export-command":{createExportJob:async(body,key,binding,signal,dispatched)=>{dispatched();const args=["/api/v1/exports",body,contracts.exportSchema,key,"POST",undefined,signal];calls.push(args);return command(...args);}}}});
 const{ExportAction,ExportTrigger}=loadServer("src/features/discovery/export-action.tsx",{globals:{crypto:{randomUUID}},modules:{...common(h),"@/components/shared/dossier-form":{useDossierDraft:(_,pending)=>busy.push(pending)},"@/components/shared/crm-presentation":{useDirectoryMenuFocus:()=>()=>focus.push("menu")},"./use-export-request":request,"./export-review":reviewModel}});
 const render=()=>{const tree=h.render(()=>ExportAction(props));h.effects();return tree;};
 return{h,calls,busy,focus,render,change:next=>{props={...props,...next};},open(){const node=find(render(),ExportTrigger)[0];ExportTrigger(node.props).props.onClick();},confirm(){find(render(),"Checkbox")[0].props.onCheckedChange(true);},submit(){find(render(),"form")[0].props.onSubmit({preventDefault(){}});}};
}

test("Export review validates exact full-result filters, drops pagination/empty values and owns a stable immutable copy",()=>{
 const filters={q:"  synthetic  ",status:"new",country:"MA",language:"french",record_archive:"archived",page:9,page_size:20,rating:"",source:undefined};const review=reviewModel.exportReview("enquiries",filters,0);assert.deepEqual(plain(review.body),{kind:"enquiries",filters:{q:"synthetic",status:"new",record_archive:"archived",country:"MA",language:"french"}});filters.q="mutated";assert.equal(review.body.filters.q,"synthetic");assert.equal(review.total,0);assert.ok(review.labels.some(label=>label.includes("Maroc")));assert.ok(review.labels.includes("Prospects : Archivés"));
 assert.equal(review.fingerprint,reviewModel.exportReview("enquiries",{language:"french",country:"MA",status:"new",record_archive:"archived",q:"synthetic"},24).fingerprint);
 for(const [kind,filter,count] of [["contacts",{status:"new"},1],["enquiries",{role:"administrator"},1],["enquiries",{received_from:"2026-10-20",received_to:"2026-10-01"},1],["enquiries",{},-1],["enquiries",{},NaN]])assert.equal(reviewModel.exportReview(kind,filter,count),undefined);
 for(const body of [{kind:"contacts",filters:{source:"manual"}},{kind:"contacts",filters:{sort:"-received_at"}},{kind:"enquiries",filters:{page:2}},{kind:"enquiries",filters:{page_size:20}}])assert.equal(contracts.newExportSchema.safeParse(body).success,false);
});

test("Export confirmation lives outside transient utilities and freezes reviewed body/count through refresh, duplicate click and same-key retry",async()=>{
 let fail=true,release;const s=actionSetup(()=>new Promise((resolve,reject)=>{release=()=>fail?reject(new ApiError("DEPENDENCY_UNAVAILABLE",503)):resolve(job("queued"));}));s.open();let view=s.render();assert.equal(find(find(view,"Toolbar")[0],"Sheet").length,0);assert.equal(find(view,"Sheet").length,1);s.submit();assert.equal(s.calls.length,0);s.confirm();s.change({kind:"contacts",filters:{q:"new filters"},total:999});view=s.render();assert.ok(text(view).includes("7 prospects"));assert.ok(!text(view).includes("999"));s.submit();s.submit();view=s.render();assert.equal(s.calls.length,1);assert.equal(find(view,"form")[0].props["aria-busy"],true);find(view,"Sheet")[0].props.onOpenChange(false);assert.equal(find(s.render(),"Sheet")[0].props.open,true);let prevented=false;find(view,"SheetContent")[0].props.onEscapeKeyDown({preventDefault(){prevented=true;}});assert.equal(prevented,true);
 release();await delay(0);assert.equal(find(s.render(),"Sheet")[0].props.open,true);fail=false;s.submit();release();await delay(0);assert.equal(s.calls.length,2);assert.equal(s.calls[0][3],s.calls[1][3]);assert.deepEqual(plain(s.calls[1][1]),{kind:"enquiries",filters:{q:"original",status:"new"}});assert.equal(find(s.render(),"Sheet")[0].props.open,false);assert.ok(text(s.render()).includes("Export demandé"));
 view=s.render();find(view,"SheetContent")[0].props.onCloseAutoFocus({preventDefault(){}});assert.deepEqual(s.focus,["menu"]);
});

test("An interrupted export blocks dismissal/replacement; only a completed request starts a new identity",async()=>{
 let fail=true;const s=actionSetup(async()=>{if(fail)throw new ApiError("DEPENDENCY_UNAVAILABLE",503);return job("queued");});s.open();s.confirm();s.submit();await delay(0);find(s.render(),"Sheet")[0].props.onOpenChange(false);s.change({kind:"contacts",filters:{q:"replacement"},total:100});s.open();s.confirm();assert.equal(find(s.render(),"Sheet")[0].props.open,true);assert.ok(text(s.render()).includes("7 prospects"));assert.equal(find(s.render(),"Checkbox")[0].props.disabled,true);assert.equal(find(s.render(),"form")[0].props["aria-busy"],true);fail=false;s.submit();await delay(0);assert.equal(s.calls[0][3],s.calls[1][3]);s.change({kind:"enquiries"});s.open();s.confirm();s.submit();await delay(0);assert.notEqual(s.calls[1][3],s.calls[2][3]);
});

test("Invalid filters make no export request and current authority failure removes the reviewed private count/filter summary",async()=>{
 const s=actionSetup(async()=>{throw new ApiError("FORBIDDEN",403);});s.change({filters:{unexpected:"private input"}});s.open();assert.equal(find(s.render(),"Sheet")[0].props.open,false);assert.equal(s.calls.length,0);s.change({filters:{q:"private query"}});s.open();s.confirm();s.submit();await delay(0);const view=s.render();assert.equal(find(view,"Sheet")[0].props.open,false);assert.equal(find(view,"form").length,0);assert.ok(!text(view).includes("private query"));assert.equal(find(view,"Error")[0].props.error.code,"FORBIDDEN");
});

function childModules(path){const source=ts.createSourceFile(path,readFileSync(new URL(`../../${path}`,import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),modules={};for(const statement of source.statements){if(!ts.isImportDeclaration(statement)||statement.importClause?.isTypeOnly)continue;const entry={},clause=statement.importClause;if(clause?.name)entry.default=clause.name.text;for(const binding of clause?.namedBindings?.elements??[])if(!binding.isTypeOnly)entry[binding.propertyName?.text??binding.name.text]=binding.name.text;modules[statement.moduleSpecifier.text]=entry;}return modules;}
test("The actual Contacts toolbar hoists export ownership above its Popover and never grants an agent the action",()=>{
 const path="src/features/contacts/contact-directory.tsx",h=hooks();
 const{ContactDirectory}=loadServer(path,{modules:{
  ...childModules(path),"@/features/discovery/use-lifecycle-projection":loadServer("src/features/discovery/use-lifecycle-projection.ts",{modules:{react:h.react}}),...common(h),
  "./use-directory-filters":{useDirectoryFilters:()=>({draft:{q:""},filters:{q:""},page:1,activeCount:0})},
  "./use-query":{queryPath:()=>"/api/v1/contacts",useQuery:()=>({value:{items:[],total:52}})},
 }});
 let view=h.render(()=>ContactDirectory({role:"manager"}));const action=find(view,"CrmDirectoryHeader")[0].props.actions;assert.equal(action.type,"ExportAction");assert.equal(typeof action.props.renderActions,"function");assert.equal(find(action.props.renderActions("export controls"),"ExportAction").length,0);view=h.render(()=>ContactDirectory({role:"agent"}));assert.equal(find(view,"CrmDirectoryHeader")[0].props.actions.type,"CrmDirectoryToolbar");
});

test("The real Lead toolbar owns the same surviving export review",()=>{
 const path="src/features/contacts/lead-list.tsx",h=hooks();h.react.useCallback=fn=>fn;
 const{LeadList}=loadServer(path,{modules:{
  ...childModules(path),"@/features/discovery/use-lifecycle-projection":loadServer("src/features/discovery/use-lifecycle-projection.ts",{modules:{react:h.react}}),...common(h),
  "@/hooks/use-phone-layout":{usePhoneLayout:()=>false},
  "@/components/shared/directory-view-switch":{DirectoryViewSwitch:"Switch",useDirectoryView:()=>({value:"list"})},
  "./column-chooser":{ColumnChooser:"Columns",useLeadColumns:()=>({visible:["name"]})},
  "./use-directory-filters":{useDirectoryFilters:()=>({draft:{q:"synthetic"},filters:{q:"synthetic"},page:1,activeCount:1})},
  "./use-query":{queryPath:()=>"/api/v1/enquiries",useQuery:()=>({value:{items:[],total:31,page:1,page_size:20}})},
 }});
 const view=h.render(()=>LeadList({role:"manager"})),action=find(view,"CrmDirectoryHeader")[0].props.actions;assert.equal(action.type,"ExportAction");assert.equal(action.props.total,31);const toolbar=action.props.renderActions("export controls");assert.equal(toolbar.type,"CrmDirectoryToolbar");assert.equal(find(toolbar,"ExportAction").length,0);
});

test("Directory and contextual prospect export owners stay mounted while their query loads or fails",()=>{
 for(const [path,name,contextual] of [["src/features/contacts/contact-directory.tsx","ContactDirectory",false],["src/features/contacts/lead-list.tsx","LeadList",false],["src/features/contacts/lead-list.tsx","LeadList",true]]){
  const h=hooks();let value={items:[],total:31,page:1,page_size:20},error;
  const loaded=loadServer(path,{modules:{...childModules(path),"@/features/discovery/use-lifecycle-projection":loadServer("src/features/discovery/use-lifecycle-projection.ts",{modules:{react:h.react}}),...common(h),"@/hooks/use-phone-layout":{usePhoneLayout:()=>false},"@/components/shared/directory-view-switch":{DirectoryViewSwitch:"Switch",useDirectoryView:()=>({value:"list"})},"./column-chooser":{ColumnChooser:"Columns",useLeadColumns:()=>({visible:["name"]})},"./use-directory-filters":{useDirectoryFilters:()=>({draft:{q:""},filters:{q:""},page:1,activeCount:0})},"./use-query":{queryPath:()=>"/api/v1/contacts",useQuery:()=>({value,error})}}});
  const render=()=>h.render(()=>loaded[name]({role:"manager",...(contextual?{contactId:randomUUID()}:{} )}));const owner=tree=>contextual?find(tree,"ExportAction")[0]:find(tree,"CrmDirectoryHeader")[0].props.actions;
  let tree=render();assert.equal(owner(tree).type,"ExportAction");assert.equal(owner(tree).props.available,true);
  value=undefined;tree=render();assert.equal(owner(tree).type,"ExportAction");assert.equal(owner(tree).props.available,false);assert.equal(owner(tree).props.total,0);
  error=new ApiError("FORBIDDEN",403);tree=render();assert.equal(owner(tree).type,"ExportAction");assert.equal(owner(tree).props.scopeError,error);if(contextual)assert.equal(find(tree,"ExportAction").length,1);
 }
});

test("Contact overview retains one prospect export owner through scoped dossier read failure",()=>{
 const path="src/features/contacts/contact-dossiers.tsx",h=hooks();let value={items:[],total:7,page:1,page_size:20},error;
 const loaded=loadServer(path,{modules:{...childModules(path),"@/features/discovery/use-lifecycle-projection":loadServer("src/features/discovery/use-lifecycle-projection.ts",{modules:{react:h.react}}),...common(h),"./use-query":{queryPath:kind=>`/api/v1/${kind}`,useQuery:()=>({value,error})}}});const contact={id:randomUUID(),version:1,archived_at:null};const render=()=>h.render(()=>loaded.ContactDossiers({contact,role:"manager"}));let tree=render();assert.equal(find(tree,"ExportAction").length,1);assert.equal(find(tree,"ExportAction")[0].props.available,true);value=undefined;error=new ApiError("DEPENDENCY_UNAVAILABLE",503);tree=render();assert.equal(find(tree,"ExportAction").length,1);assert.equal(find(tree,"ExportAction")[0].props.available,false);assert.equal(find(tree,"ExportAction")[0].props.scopeError,error);
});

test("The actual menu exposes an event-time focus callback for its surviving trigger",()=>{
 const h=hooks();h.react.createContext=()=>"FocusProvider";h.react.useCallback=fn=>fn;h.react.useContext=()=>undefined;
 const{CrmDirectoryToolbar}=loadServer("src/components/shared/crm-presentation.tsx",{modules:{
  ...common(h),
  "@/components/icons":Object.fromEntries(["Calendar","Email","Phone","More"].map(name=>[name+"Icon","Icon"])),
  "@/components/ui/popover":{Popover:"Popover",PopoverContent:"Popup",PopoverTrigger:"Trigger"},
  "./section-heading":{SectionHeading:"Heading"},"./record-header":{RecordHeader:"RecordHeader"},
 }});
 const view=h.render(()=>CrmDirectoryToolbar({primary:"new",children:"tools"}));let focused=0;find(view,"Button")[0].props.ref.current={focus(){focused++;}};find(view,"FocusProvider")[0].props.value();assert.equal(focused,1);
});

function listSetup(download=async()=>{}){
 const h=hooks(),calls=[],timers=[],cleared=[],doc={visibilityState:"visible"};let hydrated=true;
 const result={value:{items:["queued","ready","failed","denied"].map(job),total:34,page:1,page_size:10},refresh(){calls.push("refresh");result.value=undefined;},refreshQuietly(){calls.push("quiet");}};
 const loaded=loadServer("src/features/discovery/exports-panel.tsx",{globals:{AbortController,document:doc,setInterval(run,ms){timers.push({run,ms});return timers.length;},clearInterval:id=>cleared.push(id)},modules:{...common(h),"@/components/icons":Object.fromEntries(["Clock","Completed","Close","File"].map(name=>[name+"Icon","Icon"])),"@/components/shared/data-table":{DataTable:"Table"},"@/components/shared/crm-presentation":{CrmStatusBadge:"Badge"},"@/components/shared/record-entry":{RecordEntry:"Entry"},"@/components/shared/file-picker":{fileSizeLabel:size=>`${size} octets`},"@/features/contacts/numbered-pages":{NumberedPages:"Pages"},"@/features/contacts/use-query":{queryPath:(kind,values)=>{calls.push({kind,values});return"/api/v1/exports";},useQuery:()=>result},"@/hooks/use-hydrated":{useHydrated:()=>hydrated},"@/lib/format":{formatInstant:value=>value},"./client":{downloadExport:async(...args)=>{calls.push({download:args});return download(...args);}}}});
 return{h,...loaded,calls,result,timers,cleared,doc,render:()=>h.render(()=>loaded.ExportList()),hydrated:value=>{hydrated=value;}};
}
test("Export jobs retain the source four desktop columns, complete server totals and concise phone/drawer cards with ready-only actions",()=>{
 const s=listSetup();let view=s.render();assert.equal(s.ExportsPanel({role:"agent"}).type,"p");const table=find(view,"Table")[0];assert.deepEqual(plain(table.props.columns.map(column=>column.header)),["Date","Contenu","État","Fichier"]);assert.equal(find(view,"Pages")[0].props.total,34);assert.equal(find(view,"Pages")[0].props.size,10);find(view,"Pages")[0].props.change(3);s.render();assert.ok(s.calls.some(call=>call.values?.page===3));
 for(const row of s.result.value.items){const card=table.props.mobileCard(row),badge=s.ExportStatus({state:row.state});assert.equal(card.type,"Entry");assert.equal(card.props.meta.length,2);assert.ok(text(badge).length);assert.equal(card.props.actions.type,row.state==="ready"?"Button":"span");if(row.state==="ready"){assert.ok(text(card).includes("0 ligne(s)"));assert.ok(text(card).includes("1024 octets"));assert.ok(card.props.actions.props["aria-label"].includes("Prospects filtrés"));}}
 s.hydrated(false);view=s.render();const ready=s.result.value.items.find(row=>row.state==="ready");assert.equal(find(view,"Table")[0].props.mobileCard(ready).props.actions.props.disabled,true);
 s.result.value.items=[];view=s.render();assert.ok(find(view,"Table")[0].props.emptyLabel.includes("Aucun export"));s.result.error=new ApiError("FORBIDDEN",403);view=s.render();assert.equal(find(view,"Table").length,0);assert.equal(find(view,"Error")[0].props.error.code,"FORBIDDEN");
});

test("Export downloads synchronously lock duplicates, clear obsolete jobs after denial and abort on unmount",async()=>{
 let reject;const s=listSetup(()=>new Promise((_,no)=>{reject=no;}));let view=s.render();s.h.effects();const ready=s.result.value.items.find(row=>row.state==="ready"),button=find(view,"Table")[0].props.mobileCard(ready).props.actions;button.props.onClick();button.props.onClick();assert.equal(s.calls.filter(call=>call.download).length,1);reject(new ApiError("FORBIDDEN",403));await delay(0);view=s.render();assert.ok(s.calls.includes("refresh"));assert.equal(find(view,"Table").length,0);find(view,"Error")[0].props.retry();assert.equal(s.calls.filter(call=>call.download).length,1);
 let resolve;const active=listSetup(()=>new Promise(yes=>{resolve=yes;}));view=active.render();active.h.effects();find(view,"Table")[0].props.mobileCard(active.result.value.items[1]).props.actions.props.onClick();const signal=active.calls.find(call=>call.download).download[1];active.h.dispose();assert.equal(signal.aborted,true);resolve();await delay(0);assert.ok(!text(active.render()).includes("CSV téléchargé"));
});

test("Only queued visible jobs poll, and the interval is released after completion or unmount",()=>{
 const s=listSetup();s.render();s.h.effects();assert.equal(s.timers.length,1);assert.equal(s.timers[0].ms,5000);s.timers[0].run();assert.ok(s.calls.includes("quiet"));s.calls.length=0;s.doc.visibilityState="hidden";s.timers[0].run();assert.equal(s.calls.length,0);s.result.value.items=[job("ready")];s.render();s.h.effects();assert.deepEqual(s.cleared,[1]);s.h.dispose();
});

function clientSetup({response,permitId,permitFailure,blob}={}){
 const id=randomUUID(),calls=[],clicked=[],revoked=[],timers=[];
 const loaded=loadServer("src/features/discovery/client.ts",{globals:{AbortSignal,fetch:async(...args)=>{calls.push({fetch:args});return response??{ok:true,headers:new Headers({"Content-Type":"text/csv; charset=utf-8","Content-Length":"8"}),blob:async()=>blob?blob():new Blob(["safe,csv"])};},URL:{createObjectURL:()=>"blob:csv-synthetic",revokeObjectURL:url=>revoked.push(url)},document:{createElement:()=>({click(){clicked.push(this.download);}})},setTimeout:run=>timers.push(run)},modules:{"@/lib/api/client":{ApiError,apiGet:async(path,schema,signal,options)=>{calls.push({path,schema,signal,options});if(path.endsWith("/auth/me"))return{csrf_token:"synthetic-binding"};if(permitFailure)throw permitFailure;return{export_id:permitId??id,token:"synthetic-proof",transfer_url:`https://api.synthetic.invalid/api/v1/transfers/exports/${id}`};}},"@/lib/auth/contracts":{meSchema:"Me"},"./contracts":contracts,"@/features/files/transfers":{transferError:(_,status)=>new ApiError("FORBIDDEN",status)}}});return{...loaded,id,calls,clicked,revoked,timers};
}
test("The real export client requests fresh current identity/CSRF and exact-job private permits without cookies or storage",async()=>{
 const s=clientSetup(),controller=new AbortController();await s.downloadExport(s.id,controller.signal);await s.downloadExport(s.id,controller.signal);assert.equal(s.calls.filter(call=>call.path?.endsWith("download-permit")).length,2);const permit=s.calls.find(call=>call.path?.endsWith("download-permit"));assert.equal(permit.path,`/api/v1/exports/${s.id}/download-permit`);assert.equal(permit.options.csrf,"synthetic-binding");assert.equal(permit.signal,controller.signal);const options=s.calls.find(call=>call.fetch).fetch[1];assert.equal(options.credentials,"omit");assert.equal(options.cache,"no-store");assert.equal(options.headers["X-File-Permit"],"synthetic-proof");assert.equal(options.headers["X-File-Session"],"synthetic-binding");assert.equal(s.clicked.length,2);s.timers.forEach(run=>run());assert.equal(s.revoked.length,2);
});

test("Wrong-job permits, forbidden/invalid/oversized CSVs and cancellation before delivery expose no download",async()=>{
 for(const overrides of [{permitId:randomUUID()},{permitFailure:new ApiError("FORBIDDEN",403)},{response:{ok:false,status:403,json:async()=>({})}},{response:{ok:true,headers:new Headers({"Content-Type":"text/html"})}},{response:{ok:true,headers:new Headers({"Content-Type":"text/csv","Content-Length":"20971521"})}},{blob:async()=>({size:20971521})}]){const s=clientSetup(overrides);await assert.rejects(s.downloadExport(s.id),ApiError);assert.equal(s.clicked.length,0);}
 let release,entered;const started=new Promise(resolve=>{entered=resolve;}),s=clientSetup({blob:()=>new Promise(resolve=>{release=resolve;entered();})}),controller=new AbortController(),download=s.downloadExport(s.id,controller.signal);await started;controller.abort();release(new Blob(["safe"]));await assert.rejects(download,error=>error.code==="FILE_TRANSFER_INTERRUPTED");assert.equal(s.clicked.length,0);
});

test("The export facade admits only bounded whole-filter commands and matching private transfer targets",async()=>{
 const id=randomUUID(),origin="https://frontend.synthetic.invalid",calls=[];let upstream={status:200,body:job("queued")};
 const{relayDiscovery}=loadServer("src/features/discovery/facade.ts",{env:{API_BASE_URL:"https://api.synthetic.invalid"},modules:{"next/headers":{cookies:async()=>({get:()=>({value:"synthetic-session"})})},"@/lib/auth/facade":{frontendOrigin:()=>origin,boundedJson:request=>request.json()},"@/lib/auth/contracts":{SESSION_COOKIE:"synthetic-cookie"},"@/lib/api/facade":{facadeError:(status,code)=>Response.json({error:{code}},{status}),upstreamRequest:async(...args)=>{calls.push(args);return upstream;}},"./contracts":contracts}});
 const request=(body,headers={},suffix="")=>new Request(`${origin}/api/v1/exports${suffix}`,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json","Idempotency-Key":id,"X-CSRF-Token":"synthetic-csrf",...headers},body:JSON.stringify(body)});
 assert.equal((await relayDiscovery("exports",request({kind:"enquiries",filters:{q:"synthetic"}}),"id")).status,200);assert.equal(calls[0][2].token,"synthetic-session");assert.equal(calls[0][2].csrf,"synthetic-csrf");assert.equal(calls[0][2].idempotencyKey,id);
 for(const req of [request({kind:"contacts",filters:{status:"new"}}),request({kind:"enquiries",filters:{page:3}}),request({kind:"enquiries",filters:{role:"administrator"}}),request({kind:"enquiries",filters:{}},{Origin:"https://foreign.synthetic.invalid"})]){const before=calls.length;assert.notEqual((await relayDiscovery("exports",req,"id")).status,200);assert.equal(calls.length,before);}
 upstream={status:200,body:{token:"s".repeat(32),expires_at:"2026-10-20T15:00:00+01:00",export_id:id,transfer_url:`https://foreign.synthetic.invalid/api/v1/transfers/exports/${id}`}};assert.equal((await relayDiscovery(`exports/${id}/download-permit`,request({}, {}, `/${id}/download-permit`),"id")).status,503);
});

function requestSetup(command=async()=>job("queued")) {
 const h=hooks(),calls=[],completed=[],denied=[];let options={completed:value=>completed.push(value.id),denied:()=>denied.push(true)};
 const loaded=loadServer("src/features/discovery/use-export-request.ts",{modules:{...common(h),"./export-command":{createExportJob:async(...args)=>{calls.push(args);return command(...args);}}},globals:{AbortController,structuredClone,crypto:{randomUUID}}});
 return{h,calls,completed,denied,change:patch=>{options={...options,...patch};},render(){const value=h.render(()=>loaded.useExportRequest(options));h.effects();return value;}};
}
const originalReview=()=>reviewModel.exportReview("enquiries",{q:"original"},7);

test("Export preflight failure is editable; a dispatched unknown outcome pins the original request through later preflight failure",async()=>{
 let mode="preflight";const s=requestSetup(async(body,key,binding,signal,dispatched)=>{if(mode==="preflight")throw new ApiError("DEPENDENCY_UNAVAILABLE",503);dispatched();if(mode==="unknown")throw new ApiError("DEPENDENCY_UNAVAILABLE",503);return job("queued");});
 await s.render().submit(originalReview());let current=s.render();assert.equal(current.uncertain,false);assert.equal(current.locked(),false);
 mode="unknown";await current.submit(originalReview());current=s.render();assert.equal(current.uncertain,true);assert.equal(current.clear(),false);assert.equal(await current.submit(reviewModel.exportReview("contacts",{q:"replacement"},99)),false);
 mode="preflight";await current.retry();assert.equal(s.render().uncertain,true);mode="success";assert.equal(await s.render().retry(),true);
 assert.equal(s.calls.length,4);assert.notEqual(s.calls[0][1],s.calls[1][1]);assert.equal(s.calls[1][1],s.calls[2][1]);assert.equal(s.calls[2][1],s.calls[3][1]);assert.deepEqual(plain(s.calls[3][0]),{kind:"enquiries",filters:{q:"original"}});assert.equal(s.completed.length,1);
});

test("Acknowledged export completion retries its saved result without another job command",async()=>{
 let completions=0;const s=requestSetup(async(body,key,binding,signal,dispatched)=>{dispatched();return job("queued");});s.change({completed:()=>{if(++completions===1)throw new ApiError("DEPENDENCY_UNAVAILABLE",503);}});
 await s.render().submit(originalReview());let current=s.render();assert.equal(current.uncertain,true);assert.equal(current.acknowledged,true);assert.equal(await current.retry(),true);current=s.render();assert.equal(current.uncertain,false);assert.equal(completions,2);assert.equal(s.calls.length,1);
});

test("Disposed export owner aborts transport and prevents late completion or stale-handler resubmission",async()=>{
 let release;const s=requestSetup(async(body,key,binding,signal,dispatched)=>{dispatched();return new Promise(resolve=>{release=resolve;});});const stale=s.render();const pending=stale.submit(originalReview());s.h.dispose();assert.equal(s.calls[0][3].aborted,true);release(job("queued"));assert.equal(await pending,false);assert.equal(s.completed.length,0);assert.equal(await stale.submit(originalReview()),false);assert.equal(s.calls.length,1);
});

test("Foreign-kind export acknowledgements stay unresolved and never complete the selected request",async()=>{
 let wrong=true;const s=requestSetup(async(body,key,binding,signal,dispatched)=>{dispatched();return{...job("queued"),kind:wrong?"contacts":"enquiries"};});await s.render().submit(originalReview());let current=s.render();assert.equal(current.error.code,"INVALID_RESPONSE");assert.equal(current.uncertain,true);assert.equal(s.completed.length,0);wrong=false;assert.equal(await current.retry(),true);assert.equal(s.calls[0][1],s.calls[1][1]);
});

test("Scope revocation aborts an export, masks its review and prevents reopening with stale private counts",async()=>{
 let release;const s=actionSetup(()=>new Promise(resolve=>{release=resolve;}));s.open();s.confirm();s.submit();s.change({scopeError:new ApiError("FORBIDDEN",403),available:false});let tree=s.render();assert.equal(find(tree,"Sheet")[0].props.open,false);assert.equal(find(tree,"form").length,0);assert.ok(!text(tree).includes("7 prospects"));assert.equal(s.calls[0][6].aborted,true);release(job("queued"));await delay(0);s.open();tree=s.render();assert.equal(find(tree,"Sheet")[0].props.open,false);assert.equal(s.calls.length,1);assert.equal(find(tree,"Error")[0].props.error.code,"FORBIDDEN");
});

test("Uncertain export disables dismissal, outside interaction, history navigation and checkbox edits",async()=>{
 const s=actionSetup(async()=>{throw new ApiError("DEPENDENCY_UNAVAILABLE",503);});s.open();s.confirm();s.submit();await delay(0);const tree=s.render();let prevented=0;const event={preventDefault(){prevented++;}};find(tree,"SheetContent")[0].props.onEscapeKeyDown(event);find(tree,"SheetContent")[0].props.onInteractOutside(event);find(tree,"Link")[0].props.onClick(event);find(tree,"Checkbox")[0].props.onCheckedChange(false);find(tree,"Sheet")[0].props.onOpenChange(false);assert.equal(prevented,3);assert.equal(find(s.render(),"Checkbox")[0].props.checked,true);assert.equal(find(s.render(),"Sheet")[0].props.open,true);assert.equal(find(s.render(),"SheetContent")[0].props.showCloseButton,false);assert.equal(s.busy.at(-1),true);
});

test("A transient parent read failure preserves the original unresolved export rather than permitting a replacement",async()=>{
 let fail=true;const s=actionSetup(async()=>{if(fail)throw new ApiError("DEPENDENCY_UNAVAILABLE",503);return job("queued");});s.open();s.confirm();s.submit();await delay(0);s.change({available:false,scopeError:new ApiError("DEPENDENCY_UNAVAILABLE",503),total:0,filters:{q:"new parent filters"}});let tree=s.render();assert.equal(find(tree,"Sheet")[0].props.open,true);assert.ok(text(tree).includes("7 prospects"));fail=false;s.submit();await delay(0);tree=s.render();assert.equal(find(tree,"Sheet")[0].props.open,false);assert.equal(s.calls[0][3],s.calls[1][3]);assert.deepEqual(plain(s.calls[1][1].filters),{q:"original",status:"new"});
});

function createSetup() {
 const calls=[],controller=new AbortController(),binding={},actor=randomUUID();let profile={user:{id:actor,role:"manager"},must_change_password:false,csrf_token:"synthetic-csrf"},returned=job("queued"),dispatched=0;
 const loaded=loadServer("src/features/discovery/export-command.ts",{modules:{"@/lib/api/client":{ApiError,apiGet:async(...args)=>{calls.push(args);return args[0]==="/api/v1/auth/me"?profile:returned;}},"@/lib/auth/contracts":{meSchema:"Me"},"./contracts":contracts}});
 return{calls,controller,binding,actor,profile:patch=>{profile={...profile,...patch};},result:value=>{returned=value;},dispatches:()=>dispatched,send:()=>loaded.createExportJob(originalReview().body,"synthetic-key",binding,controller.signal,()=>{dispatched++;})};
}

test("Export creation binds replay to the same current M/A actor and forwards fresh proof and cancellation",async()=>{
 const s=createSetup();await s.send();assert.equal(s.binding.actorId,s.actor);assert.equal(s.dispatches(),1);assert.equal(s.calls.at(-1)[2],s.controller.signal);assert.equal(s.calls.at(-1)[3].csrf,"synthetic-csrf");assert.equal(s.calls.at(-1)[3].key,"synthetic-key");
 s.profile({user:{id:randomUUID(),role:"administrator"}});await assert.rejects(s.send(),failure=>failure.code==="FORBIDDEN");assert.equal(s.dispatches(),1);
});

test("Agent, restricted-password and aborted export preflights never dispatch a job",async()=>{
 for(const patch of [{user:{id:randomUUID(),role:"agent"}},{must_change_password:true}]){const s=createSetup();s.profile(patch);await assert.rejects(s.send(),ApiError);assert.equal(s.dispatches(),0);assert.equal(s.calls.length,1);}
 const s=createSetup();s.controller.abort();await assert.rejects(s.send(),failure=>failure.name==="AbortError");assert.equal(s.dispatches(),0);assert.equal(s.calls.length,1);
});

test("Export transport rejects a success for a different requested kind",async()=>{
 const s=createSetup();s.result({...job("queued"),kind:"contacts"});await assert.rejects(s.send(),failure=>failure.code==="INVALID_RESPONSE");assert.equal(s.dispatches(),1);
});

test("Export facade rejects foreign detail/permit identities and a create response for a different kind",async()=>{
 const id=randomUUID(),foreign=randomUUID(),origin="https://frontend.synthetic.invalid";
 const scenarios=[{path:"exports",method:"POST",body:{kind:"contacts",filters:{}},reply:job("queued")},{path:`exports/${id}`,method:"GET",reply:{...job(),id:foreign}},{path:`exports/${id}/download-permit`,method:"POST",body:{},reply:{export_id:foreign,token:"s".repeat(32),expires_at:"2026-10-20T15:00:00+01:00",transfer_url:`https://api.synthetic.invalid/api/v1/transfers/exports/${id}`}}];
 for(const scenario of scenarios){const{relayDiscovery}=loadServer("src/features/discovery/facade.ts",{env:{API_BASE_URL:"https://api.synthetic.invalid"},modules:{"next/headers":{cookies:async()=>({get:()=>({value:"synthetic-session"})})},"@/lib/auth/facade":{frontendOrigin:()=>origin,boundedJson:request=>request.json()},"@/lib/auth/contracts":{SESSION_COOKIE:"synthetic-cookie"},"@/lib/api/facade":{facadeError:(status,code)=>Response.json({error:{code}},{status}),upstreamRequest:async()=>({status:200,body:scenario.reply})},"./contracts":contracts}});const response=await relayDiscovery(scenario.path,new Request(`${origin}/api/v1/${scenario.path}`,{method:scenario.method,headers:{Origin:origin,"Idempotency-Key":id,"Content-Type":"application/json"},body:scenario.body?JSON.stringify(scenario.body):undefined}),"request");assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:{code:"DEPENDENCY_UNAVAILABLE"}});}
});
