import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const legacy=loadServer("src/features/reports/contracts.ts");
const contracts=loadServer("src/features/reports/workspace-contracts.ts",{modules:{"./contracts":legacy}});
const topics=loadServer("src/features/realtime/query-topics.ts");
const zero={total:0,items:[]};
function fixture(patch={}){return{now:"2030-01-07T10:00:00Z",today:"2030-01-07",time_zone:"Africa/Casablanca",start_on:"2030-01-01",end_on:"2030-01-31",scope:"agency",assigned_agent_id:null,previous_period:{start_on:"2029-12-01",end_on:"2029-12-31"},kpis:{enquiries:{total:0,previous_total:0},active_deals:{total:0},upcoming_visits:{total:0},follow_ups:{total:0,previous_total:0}},pipeline:{new:0,visit:0,negotiation:0,documents:0,reserved:0},outcomes:{won:0,lost:0,cancelled:0},visits:zero,follow_ups:zero,inventory:zero,tasks:{...zero,overdue_total:0},team:zero,...patch};}
const pages={total:0,page:1,page_size:20,has_previous:false,has_next:false,items:[]};
function facade(response){const calls=[],origin="https://workspace.synthetic.invalid";const loaded=loadServer("src/features/reports/facade.ts",{modules:{"next/headers":{cookies:async()=>({get:()=>({value:"synthetic-session"})})},"@/lib/auth/contracts":{SESSION_COOKIE:"synthetic-cookie"},"@/lib/api/facade":{facadeError:(status,code)=>Response.json({error:{code}},{status}),upstreamRequest:async(...args)=>{calls.push(args);return response;}},"./contracts":legacy,"./workspace-contracts":contracts}});return{...loaded,calls,origin};}

test("Selected dashboard queries admit only bounded dates, authorized intersections and numbered records",()=>{
 assert.ok(contracts.workspaceQuery.safeParse({start_on:"2030-01-01",end_on:"2030-01-31",assigned_agent_id:randomUUID()}).success);
 for(const value of [{role:"administrator"},{scope:"agency"},{now:"2030-01-01T00:00:00Z"},{start_on:"1899-12-31",end_on:"1900-01-01"},{start_on:"2030-01-02",end_on:"2030-01-01"},{start_on:"2030-01-01"}])assert.equal(contracts.workspaceQuery.safeParse(value).success,false);
 for(const value of [{metric:"collections"},{metric:"contacts"},{metric:"follow_ups",page_size:101},{metric:"follow_ups",page:0}])assert.equal(contracts.workspaceRecordsQuery.safeParse(value).success,false);
 assert.equal(contracts.workspaceAgentsQuery.safeParse({q:"x".repeat(161)}).success,false);
});

test("Dashboard projection preserves exact campaign amounts and rejects partial or inconsistent previews",()=>{
 const target={id:randomUUID(),kind:"property",reference:"SYN-1",label:"Synthetic property",category:"apartment",location:null,deal_count:2,campaigns:[{id:randomUUID(),kind:"sale",state:"available",price_mad:"9007199254740993.42",price_period:null}]};
 const parsed=contracts.workspaceSchema.parse(fixture({inventory:{total:12,items:[target]}}));assert.equal(parsed.inventory.items[0].campaigns[0].price_mad,"9007199254740993.42");assert.equal(parsed.inventory.total,12);
 for(const body of [fixture({pipeline:{new:4,visit:0,negotiation:0,documents:0,reserved:0}}),fixture({visits:{total:1,items:[]}}),fixture({tasks:{total:1,overdue_total:2,items:[]}}),fixture({team:{total:0,items:[{id:randomUUID(),display_name:"Synthetic",enquiries:0,deals:0}]}}),fixture({previous_period:null}),fixture({owner_phone:"forbidden"})])assert.equal(contracts.workspaceSchema.safeParse(body).success,false);
 const boundary=fixture({previous_period:null,kpis:{enquiries:{total:0,previous_total:null},active_deals:{total:0},upcoming_visits:{total:0},follow_ups:{total:0,previous_total:null}}});assert.ok(contracts.workspaceSchema.safeParse(boundary).success);
});

test("Workspace facade forwards current identity and exact bounded paths with no-store responses",async()=>{
 const base=fixture(),{relayReports,calls,origin}=facade({status:200,body:base});const result=await relayReports("reports/workspace",new Request(`${origin}/api/v1/reports/workspace?start_on=2030-01-01&end_on=2030-01-31`),"synthetic-request");
 assert.equal(result.status,200);assert.equal(calls[0][2].token,"synthetic-session");assert.equal(calls[0][0],"/api/v1/reports/workspace?start_on=2030-01-01&end_on=2030-01-31");assert.equal(result.headers.get("cache-control"),"no-store");
 const recordBody={...base,...pages,metric:"upcoming_visits"};for(const key of ["kpis","pipeline","outcomes","previous_period","visits","follow_ups","inventory","tasks","team"])delete recordBody[key];
 const records=facade({status:200,body:recordBody});assert.equal((await records.relayReports("reports/workspace/records",new Request(`${origin}/api/v1/reports/workspace/records?metric=upcoming_visits&page=2&page_size=20`),"request")).status,200);
 const agents=facade({status:200,body:pages});assert.equal((await agents.relayReports("reports/workspace/agents",new Request(`${origin}/api/v1/reports/workspace/agents?q=Synthetic&page=1&page_size=20`),"request")).status,200);
});

test("Workspace facade denies copied scope/finance, duplicate queries and writes before any upstream call",async()=>{
 const {relayReports,calls,origin}=facade({status:200,body:fixture()});
 for(const [key,suffix] of [["reports/workspace","?role=administrator"],["reports/workspace","?assigned_agent_id="+randomUUID()+"&assigned_agent_id="+randomUUID()],["reports/workspace/records","?metric=collections"],["reports/workspace/records","?metric=enquiries&page_size=101"],["reports/workspace/agents","?owner_directory=true"]])assert.equal((await relayReports(key,new Request(origin+"/api/v1/"+key+suffix),"request")).status,422);
 assert.equal((await relayReports("reports/workspace",new Request(origin+"/api/v1/reports/workspace",{method:"POST"}),"request")).status,404);assert.equal(calls.length,0);
});

test("Malformed upstream counts, foreign record URLs and unknown errors expose no partial private projection",async()=>{
 const bad=facade({status:200,body:fixture({visits:{total:7,items:[]}})});assert.equal((await bad.relayReports("reports/workspace",new Request(bad.origin+"/api/v1/reports/workspace"),"request")).status,503);
 const error=facade({status:500,body:{error:{code:"INTERNAL_SQL",detail:"synthetic-private-detail"}}});const result=await error.relayReports("reports/workspace",new Request(error.origin+"/api/v1/reports/workspace"),"request");assert.equal(result.status,503);assert.deepEqual(await result.json(),{error:{code:"DEPENDENCY_UNAVAILABLE"}});
 const body={...fixture(),...pages,metric:"enquiries",items:[{id:randomUUID(),label:"Synthetic",kind:"enquiry",href:"https://foreign.invalid",attribution_label:null}]};for(const key of ["kpis","pipeline","outcomes","previous_period","visits","follow_ups","inventory","tasks","team"])delete body[key];assert.equal(contracts.workspaceRecordsSchema.safeParse(body).success,false);
});

test("Legacy reports remain available and workspace invalidation includes visit/task/stock changes only on its own paths",async()=>{
 const {kpis,pipeline,outcomes,previous_period,visits,follow_ups,inventory,tasks,team,assigned_agent_id,...base}=fixture();assert.ok(kpis&&pipeline&&outcomes&&previous_period&&visits&&follow_ups&&inventory&&tasks&&team&&assigned_agent_id===null);
 const {relayReports,origin}=facade({status:200,body:{...base,metrics:[]}});assert.equal((await relayReports("reports/dashboard",new Request(origin+"/api/v1/reports/dashboard"),"request")).status,200);
 for(const topic of ["reports","contacts","enquiries","deals","inventory","tasks","visits","identity"])assert.ok(topics.matchesTopics("/api/v1/reports/workspace?start_on=2030-01-01",[topic]));
 assert.equal(topics.matchesTopics("/api/v1/reports/dashboard",["visits"]),false);assert.equal(topics.matchesTopics("/api/v1/reports/workspace-other",["tasks"]),false);
});
