import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const qualification=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":qualification}}),contracts=loadServer("src/features/discovery/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}});
const parent=randomUUID(),id=randomUUID(),origin="https://frontend.synthetic.invalid";
const hit={kind:"generated_document",id,label:"KAY-01-synthetic.pdf",template_title:"Bon de visite immobilière",href:`/leads/${parent}?tab=documents`};
const fixture=()=>({items:[hit],total:31,page:1,page_size:20,has_previous:false,has_next:true,counts:{generated_document:31},search_version:2});
function facade(response){const calls=[];const loaded=loadServer("src/features/discovery/facade.ts",{modules:{"next/headers":{cookies:async()=>({get:()=>({value:"synthetic-session"})})},"@/lib/auth/facade":{boundedJson:request=>request.json(),frontendOrigin:()=>origin},"@/lib/auth/contracts":{SESSION_COOKIE:"synthetic-cookie"},"@/lib/api/facade":{facadeError:(status,code)=>Response.json({error:{code}},{status}),upstreamRequest:async(...args)=>{calls.push(args);return response;}},"./contracts":contracts}});return{...loaded,calls};}

test("Prepared search requires its explicit wire version, approved parent context and template metadata",()=>{
 assert.ok(contracts.searchSchema.safeParse(fixture()).success);
 for(const body of [{...fixture(),search_version:undefined},{...fixture(),search_version:3},{...fixture(),items:[{...hit,template_title:undefined}]},{...fixture(),items:[{...hit,href:`/projects/${parent}?tab=documents`}]},{...fixture(),items:[{...hit,href:`/leads/${parent}`}]},{...fixture(),items:[{...hit,href:"https://synthetic.invalid/private.pdf"}]},{...fixture(),items:[{...hit,values:{price_mad:"100"}}]}])assert.equal(contracts.searchSchema.safeParse(body).success,false);
 assert.equal(contracts.searchSchema.safeParse({...fixture(),items:[],counts:{generated_document:0},search_version:undefined}).success,false);
 assert.ok(contracts.searchPageQuerySchema.safeParse({q:"visite",kind:"generated_document"}).success);
});

test("Legacy seven-kind responses retain their exact accepted shape without a fabricated PDF capability",()=>{
 const legacy={items:[{kind:"document",id,label:"Synthetic.pdf",href:`/deals/${parent}`}],total:1,page:1,page_size:20,has_previous:false,has_next:false,counts:{document:1}};
 const parsed=contracts.searchSchema.parse(legacy);assert.equal(parsed.search_version,undefined);assert.deepEqual(Object.keys(parsed.items[0]).sort(),["href","id","kind","label"]);
 assert.equal(contracts.searchSchema.safeParse({...legacy,items:[{...legacy.items[0],template_title:"Unexpected"}]}).success,false);
});

test("The search facade opts in through its own bounded server option and retains current-session/no-store transport",async()=>{
 const current=facade({status:200,body:fixture()}),result=await current.relayDiscovery("search",new Request(`${origin}/api/v1/search?q=visite&kind=generated_document`,{headers:{"X-Kay-Search-Version":"99"}}),"synthetic-id");
 assert.equal(result.status,200);assert.equal(result.headers.get("cache-control"),"no-store");assert.equal(current.calls[0][0],"/api/v1/search?q=visite&kind=generated_document");assert.equal(current.calls[0][2].preparedSearch,true);assert.equal(current.calls[0][2].token,"synthetic-session");assert.equal((await result.json()).items[0].template_title,hit.template_title);
 const legacy=facade({status:200,body:{...fixture(),items:[],counts:{},total:0,has_next:false,search_version:undefined}});assert.equal((await legacy.relayDiscovery("search",new Request(`${origin}/api/v1/search?q=none`),"id")).status,200);
});

test("Malformed or unversioned prepared rows fail closed without returning prior labels",async()=>{
 for(const body of [{...fixture(),search_version:undefined},{...fixture(),items:[{...hit,href:`/contacts/${parent}?tab=finance`}]}]){const current=facade({status:200,body});const result=await current.relayDiscovery("search",new Request(`${origin}/api/v1/search?q=visite`),"id");assert.equal(result.status,503);assert.ok(!JSON.stringify(await result.json()).includes(hit.label));}
});

test("Search version cannot be injected through query keys, duplicate params or a write",async()=>{
 for(const suffix of ["?q=visite&search_version=2","?q=visite&q=another","?q=visite&role=manager","?q=visite&kind=finance"]){const current=facade({status:200,body:fixture()});assert.equal((await current.relayDiscovery("search",new Request(origin+"/api/v1/search"+suffix),"id")).status,422);assert.equal(current.calls.length,0);}
 const write=facade({status:200,body:fixture()});assert.equal((await write.relayDiscovery("search",new Request(`${origin}/api/v1/search`,{method:"POST"}),"id")).status,404);assert.equal(write.calls.length,0);
});

test("Prepared rows display the immutable filename and catalogue title and only open the dossier Documents tab",()=>{
 const jsx=(type,props)=>({type,props}),{SearchResultLink}=loadServer("src/features/discovery/search-presentation.tsx",{modules:{"react/jsx-runtime":{jsx,jsxs:jsx},"next/link":{default:"Link"},"@/components/icons":Object.fromEntries(["Contact","Contacts","Deal","Development","File","Forward","Property","Search"].map(name=>[name+"Icon","Icon"]))}});
 const node=SearchResultLink({item:hit});assert.equal(node.props.href,hit.href);assert.equal(node.props.prefetch,false);
 function text(value){return value==null?"":Array.isArray(value)?value.map(text).join(""):typeof value==="object"?text(value.props?.children):String(value);}
 assert.ok(text(node).includes(hit.label));assert.ok(text(node).includes(hit.template_title));assert.ok(text(node).includes("PDF préparé"));assert.ok(!JSON.stringify(node).includes("transfer_url"));
});
