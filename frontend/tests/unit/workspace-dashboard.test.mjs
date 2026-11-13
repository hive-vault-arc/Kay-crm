import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const jsx=(type,props,key)=>({type,props,key}),runtime={jsx,jsxs:jsx,Fragment:"Fragment"};
function find(node,type){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(child=>find(child,type));return[...(node.type===type||typeof type==="function"&&type(node)?[node]:[]),...find(node.props?.children,type)];}
function text(node){if(node==null||typeof node==="boolean")return"";if(Array.isArray(node))return node.map(text).join("");return typeof node==="object"?text(node.props?.children):String(node);}
function hooks(){const states=[];let index=0;return{react:{useState(initial){const i=index++;if(!(i in states))states[i]=typeof initial==="function"?initial():initial;return[states[i],value=>{states[i]=typeof value==="function"?value(states[i]):value;}];},useRef(initial){const i=index++;return states[i]??=( {current:initial} );},useId:()=>"synthetic-workspace"},render(fn){index=0;return fn();}};}
const reports=loadServer("src/features/reports/contracts.ts"),contracts=loadServer("src/features/reports/workspace-contracts.ts",{modules:{"./contracts":reports}});
const qualification=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":qualification}}),inventory=loadServer("src/features/inventory/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}}),format=loadServer("src/lib/format/index.ts");
const pages={total:0,page:1,page_size:20,has_previous:false,has_next:false};
const fixture=()=>contracts.workspaceSchema.parse({now:"2030-01-02T10:00:00Z",today:"2030-01-02",time_zone:"Africa/Casablanca",start_on:"2030-01-01",end_on:"2030-01-31",scope:"assigned_or_shared",assigned_agent_id:null,previous_period:{start_on:"2029-12-01",end_on:"2029-12-31"},kpis:{enquiries:{total:91,previous_total:0},active_deals:{total:17},upcoming_visits:{total:2},follow_ups:{total:7,previous_total:3}},pipeline:{new:1,visit:2,negotiation:3,documents:5,reserved:6},outcomes:{won:2,lost:1,cancelled:0},visits:{total:2,items:[]},follow_ups:{total:7,items:[]},inventory:{total:12,items:[]},tasks:{total:6,overdue_total:1,items:[]},team:{total:8,items:[]}});
const icons=Object.fromEntries(["Calendar","Chart","Check","Clock","Deal","Enquiry","Notification","More","Forward","Task","Development","Location","Contact","Contacts"].map(name=>[name+"Icon","Icon"]));
const paths=[];
const queryPath=(kind,values)=>{const params=new URLSearchParams();for(const[key,value]of Object.entries(values))if(value!==undefined&&value!=="")params.set(key,String(value));return`/api/v1/${kind}?${params}`;};
function common(h,read){return{react:h.react,"react/jsx-runtime":runtime,"next/link":{default:"Link"},"next/image":{default:"Image"},"next/dynamic":{default:()=>"Lazy"},"@/components/icons":icons,"@/components/ui/button":{Button:"Button"},"@/components/ui/badge":{Badge:"Badge"},"@/components/ui/input":{Input:"Input"},"@/components/ui/label":{Label:"Label"},"@/components/ui/popover":{Popover:"Popover",PopoverContent:"Content",PopoverTrigger:"Trigger"},"@/components/shared/record-drawer":{RecordDrawer:"Drawer"},"@/components/shared/crm-presentation":{ContactAvatar:"Avatar",CrmStatusBadge:"Status"},"@/features/contacts/numbered-pages":{NumberedPages:"Pages"},"@/features/contacts/record-states":{RecordError:"Error"},"@/features/contacts/use-query":{queryPath,useQuery:(path)=>{paths.push(path);return read(path);}},"@/hooks/use-hydrated":{useHydrated:()=>true},"./workspace-contracts":contracts};}
function dashboard(h,read){return loadServer("src/features/reports/workspace-dashboard.tsx",{modules:{...common(h,read),"@/components/ui/dropdown-menu":{DropdownMenu:"Menu",DropdownMenuContent:"MenuContent",DropdownMenuItem:"MenuItem",DropdownMenuTrigger:"MenuTrigger"},"@/components/ui/skeleton":{Skeleton:"Skeleton"},"@/features/work/work-dashboard":{DashboardTasks:"Tasks",VisitFollowUp:"VisitFollowUp"},"./workspace-agent-picker":{WorkspaceAgentPicker:"Agents"},"./workspace-kpis":{WorkspaceKpis:"Kpis"},"./workspace-pipeline":{WorkspacePipeline:"Pipeline"},"./workspace-previews":{WorkspaceProperties:"Properties",WorkspaceVisits:"Visits",WorkspaceFollowUps:"FollowUps",WorkspaceTasks:"TasksPreview",WorkspaceTeam:"Team"},"./workspace-records":{WorkspaceRecords:"Records"}},globals:{document:{activeElement:{id:"synthetic-trigger"}}}}).WorkspaceDashboard;}

test("Dashboard applies an unassigned civil period, rejects invalid dates, resets and removes denied projections",()=>{
 const h=hooks(),value=fixture();let response={value,refresh:()=>{}};paths.length=0;
 const View=dashboard(h,()=>response),render=()=>h.render(()=>View({displayName:"Synthetic Person",role:"agent"}));render();let tree=render();
 assert.equal(find(tree,"Kpis")[0].props.value.kpis.enquiries.total,91);assert.equal(find(tree,"Team")[0].props.audit,false);
 const submit=()=>find(tree,"form")[0].props.onSubmit({preventDefault(){}});
 submit();tree=render();assert.ok(paths.at(-1).includes("start_on=2030-01-01&end_on=2030-01-31"));assert.ok(!paths.at(-1).includes("assigned_agent_id"));
 find(tree,"Input")[1].props.onChange({target:{value:"2029-01-01"}});tree=render();submit();tree=render();assert.ok(find(tree,node=>node.props?.role==="alert").length);assert.ok(!paths.at(-1).includes("end_on=2029"));
 find(tree,"Kpis")[0].props.open("enquiries");tree=render();assert.equal(find(tree,"Records")[0].props.selection.period.start_on,"2030-01-01");
 response={error:{code:"FORBIDDEN"},refresh:()=>{}};tree=render();for(const component of ["Kpis","Pipeline","Properties","Visits","FollowUps","TasksPreview","Team","Records"])assert.equal(find(tree,component).length,0);assert.equal(find(tree,"Error")[0].props.error.code,"FORBIDDEN");
});

test("Dashboard distinguishes draft team choice from applied query and freezes selected outcome context",()=>{
 const h=hooks(),value=fixture(),agent=randomUUID();paths.length=0;const View=dashboard(h,()=>({value,refresh(){}}));const render=()=>h.render(()=>View({displayName:"Synthetic Person",role:"manager"}));render();let tree=render();
 find(tree,"Agents")[0].props.change(agent,"Synthetic responsible");tree=render();assert.ok(!paths.at(-1).includes(agent));
 find(tree,"form")[0].props.onSubmit({preventDefault(){}});tree=render();assert.ok(paths.at(-1).includes(`assigned_agent_id=${agent}`));
 value.assigned_agent_id=agent;tree=render();find(tree,"Pipeline")[0].props.outcome("won");tree=render();const selected=find(tree,"Records")[0].props.selection;assert.equal(selected.kind,"outcome");assert.equal(selected.outcome,"won");assert.equal(selected.period.assigned_agent_id,agent);assert.equal(find(tree,"Team")[0].props.audit,true);
 const reset=find(tree,"Button").find(node=>text(node)==="Réinitialiser");reset.props.onClick();tree=render();assert.equal(paths.at(-1),"/api/v1/reports/workspace?");assert.equal(find(tree,"Records").length,0);
});

test("Exact four KPI totals, zero-denominator comparisons and clicks use complete server totals",()=>{
 const h=hooks(),kpis=loadServer("src/features/reports/workspace-kpis.tsx",{modules:{...common(h,()=>({})),react:{...h.react,useLayoutEffect(){}}, "motion/mini":{}}}),opened=[];
 assert.equal(kpis.countComparison(9,0).label,"+9");assert.equal(kpis.countComparison(0,0).label,"0");assert.equal(kpis.countComparison(1,null).label,"Sans comparaison");assert.equal(kpis.countComparison(5,10).label,"-50 %");
 const tree=kpis.WorkspaceKpis({value:fixture(),open:metric=>opened.push(metric)}),cards=find(tree,"article");assert.equal(cards.length,4);
 cards.forEach(card=>find(card,"Button")[0].props.onClick());assert.deepEqual(opened,["enquiries","active_deals","upcoming_visits","follow_ups"]);
 assert.ok(text(cards[0]).includes("91"));assert.ok(text(cards[2]).includes("2"));assert.ok(!text(cards[2]).includes("%"));
});

test("Pipeline keeps five zero-capable stages, authoritative colors and separate closing outcomes",()=>{
 const h=hooks(),v=fixture(),labels={new:"Nouvelle",visit:"Visite",negotiation:"Négociation",documents:"Documents",reserved:"Réservée",won:"Gagnée",lost:"Perdue",cancelled:"Annulée"};
 const {WorkspacePipeline}=loadServer("src/features/reports/workspace-pipeline.tsx",{modules:{...common(h,()=>({})),"@/features/deals/contracts":{stageLabels:labels}}}),stages=[],outcomes=[];
 const tree=h.render(()=>WorkspacePipeline({value:v,stage:key=>stages.push(key),outcome:key=>outcomes.push(key)}));
 const buttons=find(tree,"Button");buttons.slice(0,5).forEach(button=>button.props.onClick());buttons.slice(5).forEach(button=>button.props.onClick());assert.deepEqual(stages,["new","visit","negotiation","documents","reserved"]);assert.deepEqual(outcomes,["won","lost","cancelled"]);
 const chart=find(tree,"Lazy")[0];assert.equal(chart.props.series.reduce((sum,row)=>sum+row.value,0),17);assert.ok(chart.props.series[3].color.includes("converted"));assert.ok(chart.props.series[4].color.includes("pending"));
 v.pipeline={new:0,visit:0,negotiation:0,documents:0,reserved:0};v.kpis.active_deals.total=0;const empty=h.render(()=>WorkspacePipeline({value:v,stage(){},outcome(){}}));assert.equal(find(empty,"Button").length,8);
});

test("Compact catalogue, visit and task previews preserve exact routes, civil time and contextual links",()=>{
 const h=hooks(),v=fixture(),same=randomUUID(),task=randomUUID(),contact=randomUUID(),dueState=loadServer("src/features/work/task-time.ts");
 const previews=loadServer("src/features/reports/workspace-previews.tsx",{modules:{...common(h,()=>({})),"@/features/files/inventory-thumbnail":{InventoryThumbnail:"PrivatePhoto"},"@/features/schedule/time":{localLabel:value=>value},"@/features/work/task-time":dueState,"@/lib/format":format,"@/features/inventory/contracts":inventory}});
 const property={id:same,reference:"SYN-1",label:"Synthetic catalogue",category:"apartment",location:null,deal_count:8,campaigns:[{id:randomUUID(),kind:"sale",state:"reserved",price_mad:"9007199254740993.42",price_period:null}]};
 v.inventory.items=[{...property,kind:"property"},{...property,kind:"development"}];let tree=previews.WorkspaceProperties({value:v.inventory});const links=find(tree,"Link");assert.ok(links.some(link=>link.props.href===`/projects/properties/${same}`));assert.ok(links.some(link=>link.props.href===`/projects/${same}`));assert.equal(find(tree,"PrivatePhoto").length,2);assert.ok(text(tree).replace(/\s/g,"").includes("9007199254740993,42MAD"));assert.ok(text(tree).includes("2 sur 12"));
 const civil=previews.visitDate("2030-01-02T00:15:00+01:00");assert.equal(civil.day,"02");assert.equal(civil.time,"00:15");assert.equal(civil.weekday,"mer.");assert.ok(civil.month.length>0);
 const href=`/leads/${contact}?task=${task}`;v.tasks.items=[{id:task,title:"Synthetic task",owner_name:"Synthetic owner",due_at:"2030-01-02T09:00:00Z",due_local:"2030-01-02T10:00:00+01:00",href}];tree=previews.WorkspaceTasks({value:v.tasks,clock:v,action:null});assert.equal(find(tree,"Link")[0].props.href,href);assert.ok(text(tree).includes("En retard"));assert.ok(text(tree).includes("6tâche"));
});

test("Reports open as the selected supporting drawer with a civil period and no legacy page",()=>{
 const h=hooks(),value=fixture();const View=dashboard(h,()=>({value,refresh(){}}));const render=()=>h.render(()=>View({displayName:"Synthetic Person",role:"manager"}));render();let tree=render();
 find(tree,"MenuItem").find(node=>text(node)==="Indicateurs CRM").props.onSelect();tree=render();
 const drawer=find(tree,"Drawer")[0];assert.equal(drawer.props.label,"Rapports détaillés");
 const reports=find(drawer,"Lazy")[0];assert.ok(reports);assert.equal(reports.props.initialPeriod.start_on,value.start_on);assert.equal(reports.props.supporting,undefined);
});

test("Headline, stage and closing drawers use their proper scoped rowsets without passing portfolio filters to outcomes",()=>{
 const h=hooks(),agent=randomUUID(),period={start_on:"2030-01-01",end_on:"2030-01-31",assigned_agent_id:agent};
 const {WorkspaceRecords}=loadServer("src/features/reports/workspace-records.tsx",{modules:{...common(h,()=>({value:{...pages,items:[]},refresh(){}})),"@/features/deals/contracts":{dealsSchema:{},stageLabels:{won:"Gagnée",visit:"Visite"}},"./drill-down":{DrillDown:"DrillDown"},"./workspace-kpis":{workspaceLabels:{enquiries:"Demandes reçues"}}}});
 for(const selection of [{kind:"metric",metric:"enquiries"},{kind:"stage",stage:"visit"},{kind:"outcome",outcome:"won"}]){
  const tree=WorkspaceRecords({selection:{...selection,period},close(){},returnFocus:{current:null}}),child=tree.props.children(()=>{});
  if(selection.kind==="outcome"){assert.equal(child.type,"DrillDown");assert.equal(child.props.selection.attribution_id,agent);assert.ok(!("assigned_agent_id"in child.props.selection));}
  else{h.render(()=>child.type(child.props));const path=paths.at(-1);assert.ok(path.includes(`assigned_agent_id=${agent}`));assert.ok(path.includes("page=1&page_size=20"));if(selection.kind==="stage"){assert.ok(path.startsWith("/api/v1/deals?stage=visit"));assert.ok(!path.includes("start_on"));}else assert.ok(path.startsWith("/api/v1/reports/workspace/records?start_on=2030-01-01"));}
 }
});

test("The complete work drawer retains an explicit Lead, Deal or legacy Contact task destination",()=>{
 const h=hooks(),lead=randomUUID(),deal=randomUUID(),contact=randomUUID();
 const items=[{id:randomUUID(),enquiry_id:lead,deal_id:null,contact_id:contact},{id:randomUUID(),enquiry_id:null,deal_id:deal,contact_id:contact},{id:randomUUID(),enquiry_id:null,deal_id:null,contact_id:contact}];
 const {DashboardTasks}=loadServer("src/features/work/work-dashboard.tsx",{modules:{...common(h,()=>({value:{...pages,total:3,items},refresh(){}})),"@/components/ui/native-select":{NativeSelect:"Select"},"@/features/schedule/time":{localLabel:value=>value},"./task-presentation":{TaskListCard:"TaskCard"},"./task-time":loadServer("src/features/work/task-time.ts"),"./contracts":{bucketLabels:{today:"Aujourd’hui"},tasksSchema:{},followUpSchema:{}}}});
 const tree=h.render(()=>DashboardTasks()),cards=find(tree,"TaskCard");assert.equal(cards.length,3);assert.equal(cards[0].props.href,`/leads/${lead}?task=${items[0].id}`);assert.equal(cards[1].props.href,`/deals/${deal}?task=${items[1].id}`);assert.equal(cards[2].props.href,`/contacts/${contact}?task=${items[2].id}`);
});
