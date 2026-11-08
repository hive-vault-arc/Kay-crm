import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadServer } from "./load-server.mjs";

const qualification=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":qualification}});
const discovery=loadServer("src/features/discovery/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}});
const review=loadServer("src/features/discovery/export-review.ts",{modules:{"./contracts":discovery,"@/features/contacts/contracts":contacts,"@/features/contacts/qualification-contracts":qualification}});
const dto=()=>({id:randomUUID(),name:"Contact synthétique",type:"person",primary_agent:{id:randomUUID(),display_name:"Responsable synthétique"},primary_phone:"+212600000099",primary_email:null,version:1,archived_at:null,country:"MA",nationality:"",languages:["fr"],calling_code:"+212"});
const page=(items=[],extended=false)=>({items,total:items.length,page:1,page_size:20,has_next:false,has_previous:false,...extended?{directory_supported:true}:{}});
const jsx=(type,props)=>({type,props}),runtime={jsx,jsxs:jsx,Fragment:"Fragment"};
function find(node,type){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(child=>find(child,type));return[...(node.type===type?[node]:[]),...find(node.props?.children,type)];}

test("Contact directory accepts exact legacy or coherent extended pages and never invented partial counts",()=>{
 const row=dto(),extended={...row,dossier_counts:{enquiries:2,deals:0}};
 for(const body of [page([row]),page([extended],true),page([],true)])assert.equal(contacts.contactsSchema.safeParse(body).success,true);
 for(const body of [page([extended]),page([row],true),page([extended,row],true),page([{...extended,dossier_counts:{enquiries:-1,deals:0}}],true),page([{...extended,dossier_counts:{enquiries:1,deals:0,private:1}}],true)])assert.equal(contacts.contactsSchema.safeParse(body).success,false);
 assert.equal(contacts.contactSummarySchema.safeParse(extended).success,false);
});

test("Contact filters and export review preserve exact responsibility/dossiers/role/dates/sort with no pagination",()=>{
 const values={primary_agent_id:randomUUID(),linked:"none",role:"owner",created_from:"2026-10-01",created_to:"2026-10-28",country:"MA",language:"fr",sort:"-created_at",page:4,page_size:20};
 const result=review.exportReview("contacts",values,21);assert.ok(result);assert.equal(result.body.filters.primary_agent_id,values.primary_agent_id);assert.equal(result.body.filters.linked,"none");assert.equal(result.body.filters.role,"owner");assert.equal(result.body.filters.sort,"-created_at");assert.equal(Object.hasOwn(result.body.filters,"page"),false);assert.equal(Object.hasOwn(result.body.filters,"page_size"),false);
 assert.ok(result.labels.some(label=>label.includes("non archivés")));assert.ok(result.labels.includes("Rôle : Propriétaire"));assert.ok(result.labels.includes("Contacts créés jusqu’au 2026-10-28"));assert.notEqual(result.fingerprint,review.exportReview("contacts",{...values,linked:"deals"},21).fingerprint);
 assert.equal(review.exportReview("contacts",{created_from:"2026-10-28",created_to:"2026-10-01"},21),undefined);
 for(const values of [{linked:"none"},{role:"owner"},{primary_agent_id:randomUUID()},{created_from:"2026-10-01"},{sort:"-created_at"}])assert.equal(review.exportReview("enquiries",values,21),undefined);
 for(const values of [{status:"new"},{source:"phone"},{rating:"hot"},{sort:"-received_at"}])assert.equal(review.exportReview("contacts",values,21),undefined);
});

function facade(body){const calls=[];const{relayContacts}=loadServer("src/features/contacts/facade.ts",{modules:{"next/headers":{cookies:async()=>({get:()=>({value:"synthetic"})})},"@/lib/auth/facade":{boundedJson:r=>r.json(),frontendOrigin:()=>"https://synthetic.invalid"},"@/lib/auth/contracts":{SESSION_COOKIE:"session"},"@/lib/api/facade":{upstreamRequest:async(...args)=>{calls.push(args);return{status:200,body};},facadeError:(status,code)=>Response.json({error:{code}},{status})},"@/lib/api/errors":{frenchApiError:code=>code},"./contracts":contacts,"./ownership-contracts":{},"./qualification-contracts":qualification,"@/features/owners/contracts":{}}});return{calls,relay:relayContacts};}
test("Contacts facade opts in only its list, preserves old shapes and rejects copied, duplicate and invalid queries",async()=>{
 for(const body of [page([dto()]),page([{...dto(),dossier_counts:{enquiries:1,deals:1}}],true)]){const f=facade(body),response=await f.relay("contacts",new Request("https://synthetic.invalid/api/v1/contacts?linked=deals&sort=-created_at"),"synthetic");assert.equal(response.status,200);assert.equal(f.calls[0][2].contactDirectory,true);assert.deepEqual(await response.json(),body);}
 for(const query of ["linked=wrong","linked=none&linked=deals","directory_supported=true","created_from=2026-10-28&created_to=2026-10-01","status=new"]){const f=facade(page());assert.equal((await f.relay("contacts",new Request("https://synthetic.invalid/api/v1/contacts?"+query),"synthetic")).status,422);assert.equal(f.calls.length,0);}
 for(const key of ["enquiries","contacts/assignment-options","contacts/responsible-options"]){const f=facade(page());assert.equal((await f.relay(key,new Request("https://synthetic.invalid/api/v1/"+key+"?linked=none"),"synthetic")).status,422);assert.equal(f.calls.length,0);}
 const f=facade(page([dto()],true));assert.equal((await f.relay("contacts",new Request("https://synthetic.invalid/api/v1/contacts"),"synthetic")).status,503);
 const options=facade({items:[dto().primary_agent],page:1,page_size:50,total:1,has_next:false,has_previous:false});assert.equal((await options.relay("contacts/responsible-options",new Request("https://synthetic.invalid/api/v1/contacts/responsible-options"),"synthetic")).status,200);assert.equal(options.calls[0][2].contactDirectory,false);
});

function imported(path){const source=ts.createSourceFile(path,readFileSync(new URL(`../../${path}`,import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),modules={};for(const statement of source.statements){if(!ts.isImportDeclaration(statement)||statement.importClause?.isTypeOnly)continue;const entry={},clause=statement.importClause;if(clause?.name)entry.default=clause.name.text;for(const binding of clause?.namedBindings?.elements??[])if(!binding.isTypeOnly)entry[binding.propertyName?.text??binding.name.text]=binding.name.text;modules[statement.moduleSpecifier.text]=entry;}return modules;}
function directory(body,error){const calls=[];let draft,applied,reset=0;const path="src/features/contacts/contact-directory.tsx",modules={...imported(path),react:{useState:value=>[value,()=>{}]},"react/jsx-runtime":runtime,"./contracts":contacts,"./qualification-contracts":qualification,"./qualification-inputs":{countryLabel:code=>code},"@/hooks/use-hydrated":{useHydrated:()=>true},"./use-directory-filters":{useDirectoryFilters:defaults=>{draft??={...defaults};applied??={...defaults};return{draft,filters:applied,page:1,setDraft:next=>{draft=next;},apply:close=>{applied={...draft};close();},reset:()=>{draft=applied={...defaults};reset++;},activeCount:Object.entries(applied).filter(([key,value])=>value!==defaults[key]).length};}},"./use-query":{queryPath:(kind,values)=>{calls.push({kind,values});return"/api/v1/contacts";},useQuery:()=>({value:body,error,refresh(){}})}};const{ContactDirectory}=loadServer(path,{modules});return{calls,render:role=>ContactDirectory({role}),resetCount:()=>reset};}
test("Actual Contacts rail owns complete filters, applied export, scoped counts and compact cards",()=>{
 const state=directory(page([{...dto(),dossier_counts:{enquiries:2,deals:1}}],true)),view=state.render("manager");let layout=find(view,"FilterResultsLayout")[0],form=layout.props.filters(()=>{});
 const controls=[...find(form,"Input"),...find(form,"NativeSelect")];for(const id of ["contact-linked","contact-role","contact-created-from","contact-created-to","contact-language","contact-country","contact-sort"]){if(id==="contact-country"){assert.equal(find(form,"DirectoryCountryFilter")[0].props.id,id);continue;}assert.ok(controls.some(control=>control.props.id===id),id);}
 assert.equal(find(form,"AgentPicker")[0].props.purpose,"contact-filter");assert.equal(find(form,"AgentPicker")[0].props.optional,true);
 controls.find(control=>control.props.id==="contact-linked").props.onChange({target:{value:"deals"}});state.render("manager");layout=find(state.render("manager"),"FilterResultsLayout")[0];form=layout.props.filters(()=>{});find(form,"form")[0].props.onSubmit({preventDefault(){}});
 const updated=state.render("manager"),action=find(updated,"CrmDirectoryHeader")[0].props.actions;assert.equal(action.props.filters.linked,"deals");assert.equal(state.calls.at(-1).values.linked,"deals");const toolbar=action.props.renderActions(null);assert.ok(find(toolbar,"Link").some(link=>link.props.href==="/leads?view=import"));const table=find(updated,"DataTable")[0];assert.ok(table.props.columns.some(column=>column.id==="enquiries"));const card=table.props.mobileCard(table.props.rows[0]);assert.equal(card.type,"DirectoryRecordCard");assert.equal(card.props.details.length,3);layout.props.reset();assert.equal(state.resetCount(),1);
});
test("Legacy Contacts exposes no invented count columns; agents get no archive/import/export; denial masks old results",()=>{
 const state=directory(page([dto()])),view=state.render("agent"),layout=find(view,"FilterResultsLayout")[0],form=layout.props.filters(()=>{});assert.equal(find(view,"DataTable")[0].props.columns.some(column=>column.id==="enquiries"),false);assert.equal(find(form,"NativeSelect").some(control=>control.props.id==="directory-archive"),false);assert.ok(find(form,"fieldset").some(field=>field.props.disabled===true));const toolbar=find(view,"CrmDirectoryHeader")[0].props.actions;assert.equal(toolbar.type,"CrmDirectoryToolbar");assert.equal(find(toolbar,"Link").some(link=>link.props.href==="/leads?view=import"),false);
 const denied=directory(page([dto()]),{status:403,code:"FORBIDDEN"}).render("manager");assert.equal(find(denied,"DataTable").length,0);assert.equal(find(denied,"CrmDirectoryHeader")[0].props.count,undefined);const exportOwner=find(denied,"CrmDirectoryHeader")[0].props.actions;assert.equal(exportOwner.type,"ExportAction");assert.equal(exportOwner.props.available,false);assert.equal(exportOwner.props.scopeError.code,"FORBIDDEN");
});
