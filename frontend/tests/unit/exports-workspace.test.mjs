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
function hooks(){const slots=[],effects=[];let cursor=0;return{react:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==="function"?initial():initial;return[slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useId:()=>"synthetic-export",useEffect(run,deps){const i=cursor++,prior=slots[i];if(!prior||deps.some((value,n)=>!Object.is(value,prior.deps[n]))){const current={deps};slots[i]=current;effects.push(()=>{prior?.cleanup?.();current.cleanup=run();});}}},render(fn){cursor=0;return fn();},effects(){effects.splice(0).forEach(run=>run());},dispose(){slots.forEach(slot=>slot?.cleanup?.());}};}
class ApiError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
const vocabulary=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":vocabulary}}),contracts=loadServer("src/features/discovery/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}});
const reviewModel=loadServer("src/features/discovery/export-review.ts",{modules:{"./contracts":contracts,"@/features/contacts/contracts":contacts,"@/features/contacts/qualification-contracts":vocabulary}});
const job=(state="ready")=>contracts.exportSchema.parse({id:randomUUID(),kind:"enquiries",state,error_code:null,row_count:state==="ready"?0:null,size_bytes:state==="ready"?1024:null,created_at:"2026-10-20T15:00:00+01:00",completed_at:state==="ready"?"2026-10-20T15:01:00+01:00":null});
function common(h){return{react:h.react,"react/jsx-runtime":runtime,"next/link":{default:"Link"},"@/components/ui/button":{Button:"Button"},"@/components/ui/checkbox":{Checkbox:"Checkbox"},"@/components/ui/label":{Label:"Label"},"@/components/ui/sheet":{Sheet:"Sheet",SheetContent:"SheetContent",SheetHeader:"Header",SheetTitle:"Title",SheetDescription:"Description"},"@/hooks/use-hydrated":{useHydrated:()=>true},"@/features/contacts/record-states":{RecordError:"Error"},"@/lib/api/client":{ApiError},"./contracts":contracts};}
function actionSetup(command=async()=>job("queued")){
 const h=hooks(),calls=[],busy=[],focus=[];let props={kind:"enquiries",filters:{q:"original",status:"new",page:8,page_size:20},total:7,renderActions:actions=>jsx("Toolbar",{children:jsx("TransientPopover",{children:actions})})};
 const{ExportAction,ExportTrigger}=loadServer("src/features/discovery/export-action.tsx",{globals:{crypto:{randomUUID}},modules:{...common(h),"@/components/shared/dossier-form":{useDossierDraft:(_,pending)=>busy.push(pending)},"@/components/shared/crm-presentation":{useDirectoryMenuFocus:()=>()=>focus.push("menu")},"@/lib/api/command":{apiCommand:async(...args)=>{calls.push(args);return command(...args);}},"./export-review":reviewModel}});
 const render=()=>h.render(()=>ExportAction(props));
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

test("Cancel/reopen retains an interrupted identical request key; only a completed request starts a new export identity",async()=>{
 let fail=true;const s=actionSetup(async()=>{if(fail)throw new ApiError("DEPENDENCY_UNAVAILABLE",503);return job("queued");});s.open();s.confirm();s.submit();await delay(0);find(s.render(),"Sheet")[0].props.onOpenChange(false);s.open();s.confirm();fail=false;s.submit();await delay(0);assert.equal(s.calls[0][3],s.calls[1][3]);s.open();s.confirm();s.submit();await delay(0);assert.notEqual(s.calls[1][3],s.calls[2][3]);
});

test("Invalid filters make no export request and current authority failure removes the reviewed private count/filter summary",async()=>{
 const s=actionSetup(async()=>{throw new ApiError("FORBIDDEN",403);});s.change({filters:{unexpected:"private input"}});s.open();assert.equal(find(s.render(),"Sheet")[0].props.open,false);assert.equal(s.calls.length,0);s.change({filters:{q:"private query"}});s.open();s.confirm();s.submit();await delay(0);const view=s.render();assert.equal(find(view,"Sheet")[0].props.open,false);assert.equal(find(view,"form").length,0);assert.ok(!text(view).includes("private query"));assert.equal(find(view,"Error")[0].props.error.code,"FORBIDDEN");
});

function childModules(path){const source=ts.createSourceFile(path,readFileSync(new URL(`../../${path}`,import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),modules={};for(const statement of source.statements){if(!ts.isImportDeclaration(statement)||statement.importClause?.isTypeOnly)continue;const entry={},clause=statement.importClause;if(clause?.name)entry.default=clause.name.text;for(const binding of clause?.namedBindings?.elements??[])if(!binding.isTypeOnly)entry[binding.propertyName?.text??binding.name.text]=binding.name.text;modules[statement.moduleSpecifier.text]=entry;}return modules;}
test("The actual Contacts toolbar hoists export ownership above its Popover and never grants an agent the action",()=>{
 const path="src/features/contacts/contact-directory.tsx",h=hooks();
 const{ContactDirectory}=loadServer(path,{modules:{
  ...childModules(path),...common(h),
  "./use-query":{queryPath:()=>"/api/v1/contacts",useQuery:()=>({value:{items:[],total:52}})},
 }});
 let view=h.render(()=>ContactDirectory({role:"manager"}));const action=find(view,"CrmDirectoryHeader")[0].props.actions;assert.equal(action.type,"ExportAction");assert.equal(typeof action.props.renderActions,"function");assert.equal(find(action.props.renderActions("export controls"),"ExportAction").length,0);view=h.render(()=>ContactDirectory({role:"agent"}));assert.equal(find(view,"CrmDirectoryHeader")[0].props.actions.type,"CrmDirectoryToolbar");
});

test("The real Lead toolbar owns the same surviving export review",()=>{
 const path="src/features/contacts/lead-list.tsx",h=hooks();h.react.useCallback=fn=>fn;
 const{LeadList}=loadServer(path,{modules:{
  ...childModules(path),...common(h),
  "@/hooks/use-phone-layout":{usePhoneLayout:()=>false},
  "@/components/shared/directory-view-switch":{DirectoryViewSwitch:"Switch",useDirectoryView:()=>({value:"list"})},
  "./column-chooser":{ColumnChooser:"Columns",useLeadColumns:()=>({visible:["name"]})},
  "./use-directory-filters":{useDirectoryFilters:()=>({draft:{q:"synthetic"},filters:{q:"synthetic"},page:1,activeCount:1})},
  "./use-query":{queryPath:()=>"/api/v1/enquiries",useQuery:()=>({value:{items:[],total:31,page:1,page_size:20}})},
 }});
 const view=h.render(()=>LeadList({role:"manager"})),action=find(view,"CrmDirectoryHeader")[0].props.actions;assert.equal(action.type,"ExportAction");assert.equal(action.props.total,31);const toolbar=action.props.renderActions("export controls");assert.equal(toolbar.type,"CrmDirectoryToolbar");assert.equal(find(toolbar,"ExportAction").length,0);
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
