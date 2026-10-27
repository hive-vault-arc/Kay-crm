import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadServer } from "./load-server.mjs";

const jsx=(type,props,key)=>({type,props,key}),runtime={jsx,jsxs:jsx,Fragment:"Fragment"};
function find(node,type){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(child=>find(child,type));return[...(node.type===type?[node]:[]),...find(node.props?.children,type)];}
function text(node){if(node==null||typeof node==="boolean")return"";if(Array.isArray(node))return node.map(text).join("");return typeof node==="object"?text(node.props?.children):String(node);}
function hooks(){const state=[],effects=[];let cursor=0;return{react:{useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==="function"?initial():initial;return[state[i],next=>{state[i]=typeof next==="function"?next(state[i]):next;}];},useRef(initial){const i=cursor++;return state[i]??={current:initial};},useEffect(run,deps){const i=cursor++,old=state[i];if(!old||deps.some((value,n)=>!Object.is(value,old.deps[n]))){const current={deps};state[i]=current;effects.push(()=>{old?.cleanup?.();current.cleanup=run();});}}},render(fn){cursor=0;return fn();},effects(){effects.splice(0).forEach(run=>run());},dispose(){state.forEach(slot=>slot?.cleanup?.());}};}
class ApiError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
const contracts=loadServer("src/features/generated/contracts.ts"),id=randomUUID(),contactId=randomUUID();
const item=()=>({id:randomUUID(),template_code:"01",filename:"KAY-01-synthetic.pdf",actor:{id:randomUUID(),display_name:"Synthetic original creator"},size_bytes:1024,version:7,version_id:randomUUID(),created_at:"2026-10-20T15:00:00+01:00"});
function setup({permit=async()=>({token:"synthetic"}),bytes=async()=>({})}={}){
 const h=hooks(),calls=[],clicked=[],revoked=[],timers=[];
 const context={value:{can_generate:true,defaults:{},templates:[{code:"01",title:"Modèle synthétique"}]},refresh(){context.value=undefined;calls.push("context-refresh");}};
 const history={value:{items:[item()],total:41,page:1,page_size:20,has_next:true,has_previous:false},refresh(){history.value=undefined;calls.push("history-refresh");},refreshQuietly(){calls.push("history-quiet");}};
 const loaded=loadServer("src/features/generated/prepared-documents.tsx",{globals:{AbortController,document:{body:{append(){}},createElement(){return{click(){clicked.push(this.download);},remove(){}};}},URL:{createObjectURL:()=>"blob:synthetic",revokeObjectURL:url=>revoked.push(url)},setTimeout:run=>{timers.push(run);}},modules:{react:h.react,"react/jsx-runtime":runtime,"next/link":{default:"Link"},"@/components/icons":{FileIcon:"Icon"},"@/components/shared/data-table":{DataTable:"DataTable"},"@/components/shared/record-workspace":{RecordSection:"Section"},"@/components/shared/file-picker":{fileSizeLabel:value=>`${value} octets`},"@/components/ui/button":{Button:"Button"},"@/features/contacts/numbered-pages":{NumberedPages:"Pages"},"@/features/contacts/record-states":{RecordError:"Error"},"@/features/contacts/use-query":{useQuery(path,schema){calls.push({path,schema});return path.includes("/context?")?context:history;}},"@/features/files/transfers":{requestFilePermit:async body=>{calls.push(body);return permit(body);},downloadBytes:async proof=>{calls.push("bytes");return bytes(proof);}},"@/hooks/use-hydrated":{useHydrated:()=>true},"@/lib/api/client":{ApiError},"@/lib/format":{formatInstant:value=>value},"./contracts":contracts}});
 const render=()=>h.render(()=>loaded.usePreparedDocuments({parentKind:"enquiry",id}));
 return{h,...loaded,context,history,calls,clicked,revoked,timers,render};
}

test("Lead and Deal routes accept the Documents tab after identity, reject arrays/unknown values, and retain Finance/task context",async()=>{
 for(const kind of ["leads","deals"]){let authenticated=true,queries=0;const name=kind==="leads"?"LeadRecord":"DealRecord";
  const{default:Page}=loadServer(`src/app/(workspace)/${kind}/[id]/page.tsx`,{modules:{
   "react/jsx-runtime":runtime,
   "next/navigation":{notFound(){throw Error("NOT_FOUND");}},
   "@/features/auth/auth-frame":{AuthUnavailable:"Unavailable"},
   [`@/features/${kind==="leads"?"contacts/lead-record":"deals/deal-record"}`]:{[name]:"Record"},
   "@/lib/auth/server":{requireIdentity:async()=>authenticated?{state:"authenticated",profile:{user:{role:"agent",id:contactId}}}:{state:"unavailable"}},
  }});
  const view=await Page({params:Promise.resolve({id}),searchParams:Promise.resolve({tab:"documents"})});assert.equal(view.props.initialTab,"documents");
  for(const tab of [["documents","finance"],"unexpected-private-value"]){const rejected=await Page({params:Promise.resolve({id}),searchParams:Promise.resolve({tab,task:[id,id]})});assert.equal(rejected.props.initialTab,undefined);assert.equal(rejected.props.initialTask,undefined);assert.ok(!JSON.stringify(rejected).includes("unexpected-private-value"));}
  if(kind==="deals"){const finance=await Page({params:Promise.resolve({id}),searchParams:Promise.resolve({tab:"finance",task:contactId})});assert.equal(finance.props.initialTab,"finance");assert.equal(finance.props.initialTask,contactId);}
  authenticated=false;const unavailable=await Page({params:Promise.resolve({id}),searchParams:{then(){queries++;throw Error("MUST_NOT_READ");}}});assert.equal(unavailable.type,"Unavailable");assert.equal(queries,0);
 }
});

// Stub unrelated child components, then execute both real record compositions and shared lazy tabs.
function childModules(path){const source=ts.createSourceFile(path,readFileSync(new URL(`../../${path}`,import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),modules={};for(const statement of source.statements){if(!ts.isImportDeclaration(statement)||statement.importClause?.isTypeOnly)continue;const entry={},clause=statement.importClause;if(clause?.name)entry.default=clause.name.text;for(const binding of clause?.namedBindings?.elements??[])if(!binding.isTypeOnly)entry[binding.propertyName?.text??binding.name.text]=binding.name.text;modules[statement.moduleSpecifier.text]=entry;}return modules;}
test("Both real dossier compositions initially mount Documents with separate attachment and exact enquiry/deal PDF parents",()=>{
 for(const kind of ["lead","deal"]){const h=hooks(),path=kind==="lead"?"src/features/contacts/lead-record.tsx":"src/features/deals/deal-workspace.tsx",record={id,version:2,contact:{id:contactId,name:"Synthetic contact"},rating:"cold",purchase_reasons:[],projects:[]};const modules={...childModules(path),react:h.react,"react/jsx-runtime":runtime,"@/features/realtime/current-record":{currentRecord:value=>value},"./use-query":{useQuery:()=>({value:record})},"@/lib/format":{formatInstant:value=>value},"@/components/shared/unsaved-guard":{useUnsavedGuard:()=>({request(){}})}};
  const loaded=loadServer(path,{modules}),tree=h.render(()=>kind==="lead"?loaded.LeadRecord({id,initialTab:"documents"}):loaded.DealWorkspace({deal:record,role:"agent",initialTab:"documents"}));const workspace=find(tree,"RecordWorkspace")[0];assert.equal(workspace.props.initialTab,"documents");
  const th=hooks(),{RecordWorkspace}=loadServer("src/components/shared/record-workspace.tsx",{modules:{react:th.react,"react/jsx-runtime":runtime,"@/components/ui/tabs":{Tabs:"Tabs",TabsList:"List",TabsTrigger:"Tab",TabsContent:"Panel"},"@/hooks/use-hydrated":{useHydrated:()=>true}}});const panel=find(th.render(()=>RecordWorkspace(workspace.props)),"Panel");assert.equal(panel.length,1);assert.equal(panel[0].props.value,"documents");
  assert.equal(find(panel,"FilePanel")[0].props.parentId,kind==="lead"?contactId:id);const pdf=find(panel,"PreparedDocuments")[0];assert.equal(pdf.props.parentKind,kind==="lead"?"enquiry":"deal");assert.equal(pdf.props.id,id);
 }
});

test("Prepared history reads both current scoped projections, preserves numbered pages and uses one fresh exact-version permit per click",async()=>{
 let release;const s=setup({permit:()=>new Promise(resolve=>{release=resolve;})}),documents=s.render();s.h.effects();const original=s.history.value.items[0];const first=documents.download(original),second=documents.download(original);assert.equal(s.calls.filter(call=>call.action==="download").length,1);release({token:"synthetic-proof"});await Promise.all([first,second]);
 assert.deepEqual(JSON.parse(JSON.stringify(s.calls.find(call=>call.action==="download"))),{action:"download",document_id:original.id,expected_version:7,version_id:original.version_id});assert.deepEqual(s.clicked,[original.filename]);s.timers[0]();assert.deepEqual(s.revoked,["blob:synthetic"]);
 let view=s.PreparedDocumentHistory({documents:s.render(),prepareHref:`/leads/${id}/documents`});assert.equal(view.props.count,41);const pages=find(view,"Pages")[0];assert.equal(pages.props.size,20);pages.props.change(3);s.render();assert.ok(s.calls.some(call=>call.path===`/api/v1/generated-documents?parent_kind=enquiry&parent_id=${id}&page=3&include_actor=true`));
 assert.equal(s.calls[0].schema,contracts.generatedContextSchema);assert.equal(s.calls[1].schema,contracts.generatedHistoryWithActorsSchema);
});

test("Current denial after a download request clears both cached projections before retry and renders no prior filenames",async()=>{
 const s=setup({permit:async()=>{throw new ApiError("NOT_FOUND",404);}}),documents=s.render(),filename=s.history.value.items[0].filename;s.h.effects();await documents.download(s.history.value.items[0]);assert.ok(s.calls.includes("context-refresh"));assert.ok(s.calls.includes("history-refresh"));s.context.error=new ApiError("NOT_FOUND",404);const view=s.PreparedDocumentHistory({documents:s.render()});assert.equal(find(view,"li").length,0);assert.ok(!text(view).includes(filename));assert.equal(find(view,"Error")[0].props.error.code,"NOT_FOUND");assert.equal(s.clicked.length,0);
});

test("Unmount before permit or byte completion prevents a surprise file download",async()=>{
 for(const stage of ["permit","bytes"]){let release,entered;const started=new Promise(resolve=>{entered=resolve;}),deferred=()=>new Promise(resolve=>{release=resolve;entered();}),s=setup(stage==="permit"?{permit:deferred}:{bytes:deferred}),documents=s.render();s.h.effects();const task=documents.download(s.history.value.items[0]);await started;s.h.dispose();release({});await task;assert.equal(s.clicked.length,0);if(stage==="permit")assert.equal(s.calls.includes("bytes"),false);}
});

test("History displays real names/titles/sizes with labelled icon actions; archive/empty/error/loading never invent data or grants",()=>{
 const s=setup(),documents=s.render();s.h.effects();let view=s.PreparedDocumentHistory({documents,prepareHref:`/leads/${id}/documents`});const row=find(view,"li")[0];assert.ok(text(row).includes("Modèle synthétique"));assert.ok(text(row).includes(s.history.value.items[0].filename));assert.ok(text(row).includes("1024 octets"));assert.ok(text(row).includes("Synthetic original creator"));assert.equal(find(row,"Button")[0].props.size,"icon");assert.ok(find(row,"Button")[0].props["aria-label"].includes(s.history.value.items[0].filename));assert.equal(view.props.action.props.children.props.prefetch,false);
 s.context.value.can_generate=false;view=s.PreparedDocumentHistory({documents:s.render(),prepareHref:`/leads/${id}/documents`});assert.equal(view.props.action,undefined);assert.equal(find(view,"li").length,1);
 s.history.value={...s.history.value,items:[],total:0,has_next:false};view=s.PreparedDocumentHistory({documents:s.render()});assert.equal(find(view,"Pages").length,0);assert.ok(text(view).includes("Aucun PDF préparé"));
 s.history.error=new ApiError("FORBIDDEN",403);view=s.PreparedDocumentHistory({documents:s.render()});assert.equal(find(view,"li").length,0);assert.equal(view.props.count,undefined);
 s.history.error=undefined;s.history.value=undefined;view=s.PreparedDocumentHistory({documents:s.render()});assert.ok(text(view).includes("Chargement des PDF"));assert.equal(find(view,"li").length,0);
});

test("Standalone history composes the selected four columns from real creator/byte metadata and retains an empty-page escape",()=>{
 const s=setup(),documents=s.render();s.h.effects();const view=s.PreparedDocumentHistory({documents,presentation:"table"}),table=find(view,"DataTable")[0],row={original:s.history.value.items[0]};
 assert.deepEqual(Array.from(table.props.columns,column=>column.header),["Document","Créé le","Auteur","Fichier"]);assert.equal(table.props.columns[2].cell({row}),"Synthetic original creator");assert.equal(table.props.getRowId(row.original),row.original.id);
 const file=table.props.columns[3].cell({row});assert.ok(text(file).includes("1024 octets"));assert.equal(find(file,"Button")[0].props["aria-label"],`Télécharger ${row.original.filename}`);
 documents.setPage(3);s.history.value={...s.history.value,items:[],total:0,has_next:false,has_previous:false};const empty=s.PreparedDocumentHistory({documents:s.render(),presentation:"table"});assert.equal(find(empty,"Pages")[0].props.page,3);
});

test("A stale page row or current authority error cannot initiate a private permit",async()=>{
 const s=setup(),documents=s.render(),original=s.history.value.items[0];s.h.effects();
 await documents.download({...original,version_id:randomUUID()});s.history.error=new ApiError("FORBIDDEN",403);await documents.download(original);assert.equal(s.calls.filter(call=>call.action==="download").length,0);assert.equal(s.clicked.length,0);
});

test("A current denied projection aborts an outstanding file transfer before a late completion can download",async()=>{
 let release;const s=setup({permit:()=>new Promise(resolve=>{release=resolve;})}),documents=s.render();s.h.effects();const request=documents.download(s.history.value.items[0]);s.context.error=new ApiError("NOT_FOUND",404);s.render();s.h.effects();release({});await request;assert.equal(s.clicked.length,0);assert.equal(s.calls.includes("bytes"),false);
});
