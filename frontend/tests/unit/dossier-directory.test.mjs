import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadServer } from "./load-server.mjs";

const vocabulary=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":vocabulary}});
const inventory=loadServer("src/features/inventory/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}}),requirements=loadServer("src/features/requirements/contracts.ts",{modules:{"@/features/contacts/contracts":contacts,"@/features/inventory/contracts":inventory}});
const qualification=loadServer("src/features/deals/qualification-contracts.ts",{modules:{"@/features/contacts/qualification-contracts":vocabulary}}),deals=loadServer("src/features/deals/contracts.ts",{modules:{"@/features/contacts/contracts":contacts,"@/features/contacts/qualification-contracts":vocabulary,"@/features/inventory/contracts":inventory,"@/features/requirements/contracts":requirements,"./qualification-contracts":qualification}});
const outcomes=loadServer("src/features/inventory/outcome-contracts.ts",{modules:{"@/features/contacts/contracts":contacts,"@/features/requirements/contracts":requirements,"./contracts":inventory}});
const discovery=loadServer("src/features/discovery/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}}),review=loadServer("src/features/discovery/export-review.ts",{modules:{"./contracts":discovery,"@/features/contacts/contracts":contacts,"@/features/contacts/qualification-contracts":vocabulary}});
const jsx=(type,props)=>({type,props}),runtime={jsx,jsxs:jsx,Fragment:"Fragment"};
function find(node,type){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(child=>find(child,type));return[...(node.type===type?[node]:[]),...find(node.props?.children,type)];}
function text(node){if(node==null||typeof node==="boolean")return"";if(Array.isArray(node))return node.map(text).join("");return typeof node==="object"?text(node.props?.children):String(node);}
function hooks(){const slots=[],effects=[];let cursor=0;return{react:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==="function"?initial():initial;return[slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useCallback:fn=>fn,useId:()=>"synthetic-assignee",useEffect(run,deps){const i=cursor++,prior=slots[i];if(!prior||deps.some((value,n)=>!Object.is(value,prior.deps[n]))){const current={deps};slots[i]=current;effects.push(()=>{prior?.cleanup?.();current.cleanup=run();});}}},render(fn){cursor=0;return fn();},flush(){effects.splice(0).forEach(run=>run());},dispose(){slots.forEach(slot=>slot?.cleanup?.());}};}
function imported(path){const source=ts.createSourceFile(path,readFileSync(new URL(`../../${path}`,import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),modules={};for(const statement of source.statements){if(!ts.isImportDeclaration(statement)||statement.importClause?.isTypeOnly)continue;const entry={},clause=statement.importClause;if(clause?.name)entry.default=clause.name.text;for(const binding of clause?.namedBindings?.elements??[])if(!binding.isTypeOnly)entry[binding.propertyName?.text??binding.name.text]=binding.name.text;modules[statement.moduleSpecifier.text]=entry;}return modules;}
const page={items:[],total:0,page:1,page_size:20,has_previous:false,has_next:false};
const dealPage={...page,stage_counts:Object.fromEntries(Object.keys(deals.stageLabels).map(stage=>[stage,0]))};

test("Prepared directory fixture commands satisfy the real facade before any browser command",()=>{
 const{directoryLeadDraft}=loadServer("tests/helpers/directory-fixtures.ts",{modules:{"@/features/contacts/contracts":contacts}}),owner=randomUUID();
 for(const options of [{},{primaryAgentId:owner},{primaryAgentId:owner,assignedAgentId:owner}]){const body=directoryLeadDraft("SYN directory fixture","+212600000099",options);assert.equal(contacts.newEnquirySchema.safeParse(body).success,true);assert.deepEqual(Array.from(body.new_contact.emails),[]);assert.equal(body.new_contact.phones[0].label,"");assert.equal(Object.hasOwn(body,"assigned_agent_id"),Boolean(options.assignedAgentId));}
 assert.throws(()=>directoryLeadDraft("SYN directory fixture","+212600000099",{assignedAgentId:"unassigned"}));
});

test("Queue filtering is explicit, reviewed and cannot become a contact filter or a write assignee",()=>{
 assert.equal(contacts.listQuerySchema.safeParse({assigned_agent_id:"unassigned"}).success,true);
 for(const value of ["none","Non attribué",false,""])assert.equal(contacts.listQuerySchema.safeParse({assigned_agent_id:value}).success,false);
 const reviewed=review.exportReview("enquiries",{assigned_agent_id:"unassigned",q:"synthetic",page:3,page_size:20},7);assert.ok(reviewed);assert.ok(reviewed.labels.includes("Prospects non attribués"));assert.equal(reviewed.body.filters.assigned_agent_id,"unassigned");assert.equal(Object.hasOwn(reviewed.body.filters,"page"),false);assert.equal(review.exportReview("contacts",{assigned_agent_id:"unassigned"},7),undefined);
 const body={new_contact:{name:"Synthétique",type:"person",phones:[{number:"+212600000099",label:"",is_primary:true}],emails:[],roles:["buyer"],country:"MA",languages:["french"]},message:"Synthétique",source:"phone",initial_budget:"500000",assigned_agent_id:"unassigned"};
 assert.equal(contacts.newEnquirySchema.safeParse(body).success,false);assert.equal(contacts.newEnquirySchema.safeParse({...body,assigned_agent_id:undefined}).success,true);
});

test("Deal created/modified ranges remain independent, strict and conjunctive",()=>{
 const values={created_from:"2026-01-02",created_to:"2026-01-02",updated_from:"2026-01-04",updated_to:"2026-01-04"};assert.equal(deals.querySchema.safeParse(values).success,true);
 for(const bad of [{created_to:"2026-01-01"},{updated_to:"2026-01-01"},{created_from:"not a date"},{created_to:"2026-02-30"},{createdAt:"2026-01-01"}])assert.equal(deals.querySchema.safeParse({...values,...bad}).success,false);
});

function facade(kind,body){const calls=[],common={"next/headers":{cookies:async()=>({get:()=>({value:"synthetic"})})},"@/lib/auth/facade":{boundedJson:r=>r.json(),frontendOrigin:()=>"https://synthetic.invalid"},"@/lib/auth/contracts":{SESSION_COOKIE:"session"},"@/lib/api/facade":{upstreamRequest:async(...args)=>{calls.push(args);return{status:200,body};},facadeError:(status,code)=>Response.json({error:{code}},{status})},"@/lib/api/errors":{frenchApiError:code=>code}};
 const modules=kind==="contacts"?{...common,"./contracts":contacts,"./ownership-contracts":{},"./qualification-contracts":vocabulary,"@/features/owners/contracts":{}}:{...common,"./contracts":deals,"./qualification-contracts":qualification,"@/features/inventory/outcome-contracts":outcomes,"@/features/contacts/contracts":contacts};
 const loaded=loadServer(`src/features/${kind}/facade.ts`,{modules});return{calls,relay:loaded[kind==="contacts"?"relayContacts":"relayDeals"]};}
test("Assignee filter metadata relays only its bounded GET path; queue is forwarded only to enquiry reads",async()=>{
 const options={...page,items:[{id:randomUUID(),display_name:"Ancien agent synthétique"}],total:1};const f=facade("contacts",options),response=await f.relay("enquiries/assigned-options",new Request("https://synthetic.invalid/api/v1/enquiries/assigned-options?q=synthetic&page=2"),"synthetic");assert.equal(response.status,200);assert.equal(f.calls[0][2].contactDirectory,false);assert.deepEqual(await response.json(),options);
 for(const query of ["q=a&q=b","archive=all","assigned_agent_id=unassigned","page=0"]){const invalid=facade("contacts",options);assert.equal((await invalid.relay("enquiries/assigned-options",new Request("https://synthetic.invalid/api/v1/enquiries/assigned-options?"+query),"synthetic")).status,422);assert.equal(invalid.calls.length,0);}
 const lead=facade("contacts",{...page,status_counts:Object.fromEntries(Object.keys(contacts.statusLabels).map(status=>[status,0]))});assert.equal((await lead.relay("enquiries",new Request("https://synthetic.invalid/api/v1/enquiries?assigned_agent_id=unassigned"),"synthetic")).status,200);assert.ok(lead.calls[0][0].endsWith("assigned_agent_id=unassigned"));
 const contact=facade("contacts",page);assert.equal((await contact.relay("contacts",new Request("https://synthetic.invalid/api/v1/contacts?assigned_agent_id=unassigned"),"synthetic")).status,422);assert.equal(contact.calls.length,0);
});
test("Deal facade preserves legacy response while forwarding both exact civil ranges and rejecting ambiguous dates",async()=>{
 const f=facade("deals",dealPage),suffix="created_from=2026-01-02&created_to=2026-01-02&updated_from=2026-01-04&updated_to=2026-01-04";const response=await f.relay("deals",new Request("https://synthetic.invalid/api/v1/deals?"+suffix),"synthetic");assert.equal(response.status,200);assert.equal(f.calls[0][0],"/api/v1/deals?"+suffix);assert.deepEqual(await response.json(),dealPage);
 for(const query of ["created_from=2026-02-01&created_to=2026-01-01","created_to=2026-01-01&created_to=2026-01-02","updated_from=2026-02-01&updated_to=2026-01-01","created=2026-01-01"]){const invalid=facade("deals",dealPage);assert.equal((await invalid.relay("deals",new Request("https://synthetic.invalid/api/v1/deals?"+query),"synthetic")).status,422);assert.equal(invalid.calls.length,0);}
});

test("Actual AgentPicker distinguishes assignment, responsible filtering and enquiry filtering without write queue options",()=>{
 for(const purpose of ["assignment","contact-filter","enquiry-filter"]){const h=hooks(),calls=[],changed=[],agent={id:randomUUID(),display_name:"Responsable synthétique"};const{AgentPicker}=loadServer("src/features/contacts/agent-picker.tsx",{modules:{...imported("src/features/contacts/agent-picker.tsx"),react:h.react,"react/jsx-runtime":runtime,"./contracts":contacts,"./use-query":{queryPath:(kind,values)=>{calls.push({kind,values});return"/api/v1/"+kind;},useQuery:()=>({value:{...page,items:[agent],total:1}})}}});
 const view=h.render(()=>AgentPicker({purpose,unassigned:true,optional:true,value:"",change:(...args)=>changed.push(args)}));assert.equal(calls[0].kind,{assignment:"contacts/assignment-options","contact-filter":"contacts/responsible-options","enquiry-filter":"enquiries/assigned-options"}[purpose]);assert.equal(find(view,"option").some(option=>option.props.value==="unassigned"),purpose==="enquiry-filter");if(purpose==="enquiry-filter"){find(view,"NativeSelect")[0].props.onChange({target:{value:"unassigned"}});assert.equal(changed[0][0],"unassigned");}h.dispose();}
});

function directory(kind,role="manager"){
 const path=kind==="leads"?"src/features/contacts/lead-list.tsx":"src/features/deals/deal-list.tsx",h=hooks(),calls=[];let filters;
 const actual=loadServer("src/features/contacts/use-directory-filters.ts",{modules:{react:h.react}});
 const filterModule={useDirectoryFilters:(...args)=>{filters=actual.useDirectoryFilters(...args);return filters;}};
 const queryModule={queryPath:(name,values)=>{calls.push({name,values});return"/api/v1/"+name;},useQuery:()=>({value:kind==="leads"?{...page,status_counts:{}}:dealPage,refresh(){},refreshQuietly(){}})};
 const modules={...imported(path),react:h.react,"react/jsx-runtime":runtime,"./contracts":kind==="leads"?contacts:deals,"@/features/contacts/contracts":contacts,"./qualification-contracts":vocabulary,"@/features/contacts/qualification-contracts":vocabulary,"@/hooks/use-hydrated":{useHydrated:()=>true},"@/hooks/use-phone-layout":{usePhoneLayout:()=>false},"@/components/shared/directory-view-switch":{DirectoryViewSwitch:"ViewSwitch",useDirectoryView:()=>({value:"list"})},"./column-chooser":{ColumnChooser:"Columns",useLeadColumns:()=>({visible:["name"]})},"./columns":{DealColumns:"Columns",useDealColumns:()=>({visible:["name"]})},"./use-directory-filters":filterModule,"@/features/contacts/use-directory-filters":filterModule,"./use-query":queryModule,"@/features/contacts/use-query":queryModule};
 const loaded=loadServer(path,{modules}),Component=loaded[kind==="leads"?"LeadList":"DealList"];
 const render=()=>{const view=h.render(()=>Component({role}));h.flush();return view;};
 const form=()=>find(render(),"FilterResultsLayout")[0].props.filters(()=>{});
 return{render,form,calls,dispose:h.dispose,api:()=>filters,set(id,value){const input=find(form(),"Input").find(node=>node.props.id===id);assert.ok(input,id);input.props.onChange({target:{value}});render();},apply(){find(form(),"form")[0].props.onSubmit({preventDefault(){}});render();}};
}
test("Actual directories use the right scoped agent metadata, and the unassigned applied filter reaches results and export",()=>{
 for(const role of ["manager","agent"]){const lead=directory("leads",role),picker=find(lead.form(),"AgentPicker")[0];assert.equal(picker.props.purpose,"enquiry-filter");assert.equal(picker.props.unassigned,role!=="agent");if(role==="manager"){picker.props.change("unassigned");lead.render();lead.apply();assert.equal(lead.calls.at(-1).values.assigned_agent_id,"unassigned");const header=find(lead.render(),"CrmDirectoryHeader")[0];assert.equal(header.props.actions.props.filters.assigned_agent_id,"unassigned");}lead.dispose();const deal=directory("deals",role);assert.equal(find(deal.form(),"AgentPicker")[0].props.purpose,"contact-filter");deal.dispose();}
});
test("Actual Deal date controls preserve both applied ranges and page during either invalid draft, and reset both",async()=>{
 const state=directory("deals");try{state.set("deal-created-from","2026-01-02");state.set("deal-created-to","2026-01-02");state.set("deal-from","2026-01-04");state.set("deal-to","2026-01-04");state.apply();state.api().setPage(4);state.render();const applied=state.calls.at(-1).values;assert.equal(applied.created_from,"2026-01-02");assert.equal(applied.updated_from,"2026-01-04");assert.equal(applied.page,4);
 for(const id of ["deal-created-from","deal-from"]){state.set(id,"2026-02-01");await delay(390);state.render();assert.deepEqual(state.calls.at(-1).values,applied);assert.ok(text(state.form()).includes("La date de début doit précéder la date de fin."));state.set(id,id==="deal-created-from"?"2026-01-02":"2026-01-04");state.apply();state.api().setPage(4);state.render();}
 state.api().reset();state.render();assert.equal(state.calls.at(-1).values.created_from,"");assert.equal(state.calls.at(-1).values.updated_to,"");assert.equal(state.calls.at(-1).values.page,1);
 }finally{state.dispose();}
});
