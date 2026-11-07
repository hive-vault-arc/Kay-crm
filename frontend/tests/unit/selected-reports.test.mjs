import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const contracts=loadServer("src/features/reports/contracts.ts");
const model=loadServer("src/features/reports/report-model.ts",{modules:{"./contracts":contracts}});
const plain=value=>JSON.parse(JSON.stringify(value));
const meta={now:"2030-01-07T10:00:00Z",today:"2030-01-07",time_zone:"Africa/Casablanca",start_on:"2030-01-01",end_on:"2030-01-31",scope:"agency"};
const periodKeys=["enquiries","won","lost","cancelled","activities","collections"],point=randomUUID();
const metric=(key,total=1)=>({key,label:`Synthetic ${key}`,total,value:key==="collections"?"9007199254740993.42":String(total),unit:key==="collections"?"MAD":"count",basis:periodKeys.includes(key)?"period":"current",denominator:"none",series:["contacts","won","activities"].includes(key)?[{id:point,label:"Synthetic attributed actor",value:total}]:[]});
const fixture=(scope="agency")=>({...meta,scope,metrics:contracts.metricKey.options.filter(key=>key!=="collections"||scope==="agency").map(key=>metric(key))});
const selection={metric:"contacts",start_on:meta.start_on,end_on:meta.end_on};
const pages={page:1,page_size:10,total:1,has_previous:false,has_next:false};
const row=(extra={})=>{const id=randomUUID();return{id,label:"Synthetic record",kind:"contact",href:`/contacts/${id}`,attribution_label:"Synthetic retained actor",value:"1",...extra};};
const drill=(extra={})=>({...meta,...pages,metric:metric("contacts"),items:[row()],...extra});
const alerts=(extra={})=>{const id=randomUUID();return{now:meta.now,today:meta.today,time_zone:meta.time_zone,scope:meta.scope,...pages,kind:"inactive_deals",threshold_days:14,items:[{id,label:"Synthetic alert",kind:"deal",href:`/deals/${id}`,last_at:"2029-12-01T10:00:00Z",age_days:20}],...extra};};

for(const scope of ["agency","assigned_or_shared"])test(`Selected report groups retain the exact ${scope} catalogue, zero values and decimal money`,()=>{
 const value=model.selectedReportSchema.parse(fixture(scope));assert.equal(value.metrics.length,scope==="agency"?13:12);
 assert.equal(value.metrics.find(item=>item.key==="collections")?.value,scope==="agency"?"9007199254740993.42":undefined);
 const zero=fixture(scope);zero.metrics=zero.metrics.map(item=>metric(item.key,0));assert.ok(model.selectedReportSchema.safeParse(zero).success);
 const keys=model.reportGroups.flatMap(group=>group.keys);assert.equal(new Set(keys).size,13);assert.equal(keys.length,13);
});
test("A partial, duplicated, foreign, financially mis-scoped or incoherent metric projection is rejected",()=>{
 const changes=[value=>value.metrics.pop(),value=>value.metrics[1]=value.metrics[0],value=>value.metrics.push(metric("unknown")),value=>value.scope="assigned_or_shared",value=>value.metrics[0].unit="MAD",value=>value.metrics[0].value="1.00",value=>value.metrics[1].basis="current",value=>value.metrics[0].series[0].value=2,value=>value.metrics[0].series.push(value.metrics[0].series[0]),value=>value.end_on="2032-01-01"];
 for(const change of changes){const value=fixture();change(value);assert.equal(model.selectedReportSchema.safeParse(value).success,false);}
 for(const period of [{start_on:"1899-12-31",end_on:"1900-01-01"},{start_on:"2100-12-31",end_on:"2101-01-01"},{start_on:"2030-02-01",end_on:"2030-01-01"}])assert.equal(model.reportPeriodQuery.safeParse(period).success,false);
});
test("Drills bind the actual metric, period, page, page size, row identity and route kind",()=>{
 assert.ok(model.matchesDrill(contracts.drillSchema.parse(drill()),selection,1));
 const changes=[value=>value.metric=metric("won"),value=>value.start_on="2029-12-01",value=>value.page=2,value=>value.page_size=20,value=>value.has_next=true,value=>value.has_previous=true,value=>value.items=[],value=>value.metric.total=2,value=>value.items[0].kind="receipt",value=>value.items[0].href=`/contacts/${randomUUID()}`,value=>value.items[0].href=`/deals/${randomUUID()}`,value=>value.items[0].href+="?tab=finance"];
 for(const change of changes){const value=drill();change(value);assert.equal(model.matchesDrill(value,selection,1),false);}
 const empty=drill({total:0,page:2,has_previous:true,items:[],metric:metric("contacts",0)});assert.ok(model.matchesDrill(empty,selection,2));
 const duplicate=drill({total:2,metric:metric("contacts",2)});duplicate.items.push(duplicate.items[0]);assert.equal(model.matchesDrill(duplicate,selection,1),false);
});
test("Outcome, activity and offering row IDs remain distinct from their valid target IDs",()=>{
 for(const[key,kind,prefix]of [["won","outcome","deals"],["activities","activity","contacts"],["property_offerings","property","projects/properties"],["development_offerings","development","projects"]]){
  const value=drill({metric:metric(key),items:[row({kind,href:`/${prefix}/${randomUUID()}`})]});assert.ok(model.matchesDrill(value,{...selection,metric:key},1));
 }
 const value=drill({metric:metric("collections"),items:[row({kind:"receipt",value:"9007199254740993.42",href:`/deals/${randomUUID()}?tab=finance`})]});assert.ok(model.matchesDrill(value,{...selection,metric:"collections"},1));value.scope="assigned_or_shared";assert.equal(model.matchesDrill(value,{...selection,metric:"collections"},1),false);
});
test("Alerts bind their category, threshold and kind without applying the report civil period",()=>{
 assert.ok(model.matchesExceptions(contracts.exceptionsSchema.parse(alerts()),"inactive_deals",1));
 for(const change of [value=>value.kind="stale_inventory",value=>value.threshold_days=30,value=>value.items[0].age_days=13,value=>value.items[0].kind="property",value=>value.page_size=20,value=>value.items[0].href=`/projects/${randomUUID()}`]){const value=alerts();change(value);assert.equal(model.matchesExceptions(value,"inactive_deals",1),false);}
});

const jsx=(type,props,key)=>({type,props,key}),runtime={jsx,jsxs:jsx,Fragment:"Fragment"};
function find(node,type){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(child=>find(child,type));return[...(node.type===type?[node]:[]),...find(node.props?.children,type)];}
function text(node){return node==null||typeof node==="boolean"?"":Array.isArray(node)?node.map(text).join(" "):typeof node==="object"?text(node.props?.children):String(node);}
class ApiError extends Error{constructor(code,status){super(code);Object.assign(this,{code,status});}}
class Element{isConnected=true;scrollTop=0;focused=0;focus(){this.focused++;}closest(){return this.scroller??null;}querySelector(){return this.heading??null;}scrollTo({top}){this.scrollTop=top;}}
function harness(){const slots=[],effects=[];let cursor=0;return{react:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==="function"?initial():initial;return[slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useId(){const i=cursor++;return slots[i]??=`report-${i}`;},useMemo(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((value,n)=>!Object.is(value,old.deps[n])))slots[i]={deps,value:fn()};return slots[i].value;},useCallback(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((value,n)=>!Object.is(value,old.deps[n])))slots[i]={deps,value:fn};return slots[i].value;},useEffect(run,deps){const i=cursor++,old=slots[i];if(!old||deps.some((value,n)=>!Object.is(value,old.deps[n]))){const current={deps};slots[i]=current;effects.push(()=>{old?.cleanup?.();current.cleanup=run();});}}},render(run){cursor=0;const value=run();effects.splice(0).forEach(effect=>effect());return value;}};}
const icons=Object.fromEntries(["Contacts","Chart","Development","Finance","Forward","Notification","EmptyFolder","File","Check"].map(name=>[name+"Icon","Icon"]));
const ui={"react/jsx-runtime":runtime,"next/link":{default:"Link"},"next/dynamic":{default:()=>"Chart"},"@/components/icons":icons,"@/components/shared/section-heading":{SectionHeading:"Heading"},"@/components/ui/button":{Button:"Button"},"@/components/ui/input":{Input:"Input"},"@/components/ui/label":{Label:"Label"},"@/components/ui/native-select":{NativeSelect:"Select"},"@/features/contacts/record-states":{RecordError:"Error"},"@/features/contacts/numbered-pages":{NumberedPages:"Pages"},"@/lib/api/client":{ApiError},"@/lib/format":{formatMAD:value=>value+" MAD"},"./contracts":contracts,"./report-model":model};
const queryPath=(kind,values)=>{const params=new URLSearchParams();for(const[key,value]of Object.entries(values))if(value!==undefined&&value!=="")params.set(key,String(value));return`/api/v1/${kind}?${params}`;};
function setup(component,response={value:fixture()}){
 const h=harness(),paths=[],document={activeElement:new Element()};let refreshes=0;
 const navigation=loadServer("src/features/reports/report-navigation.ts",{modules:{react:h.react},globals:{document,HTMLElement:Element}});
 const modules={...ui,react:h.react,"./report-navigation":navigation,"./report-overview":{ReportOverview:"Overview"},"./drill-down":{DrillDown:"Drill"},"./exceptions":{Exceptions:"Alerts"},"@/features/contacts/use-query":{queryPath,useQuery(path,schema){paths.push(path);let result=response;if(response.value){const parsed=schema.safeParse(response.value);result=parsed.success?{value:parsed.data}:{error:new ApiError("DEPENDENCY_UNAVAILABLE",503)};}return{...result,refresh(){refreshes++;}};}}};
 const loaded=loadServer(`src/features/reports/${component}.tsx`,{modules,globals:{document,HTMLElement:Element}});
 return{h,paths,loaded,response,get refreshes(){return refreshes;},render(props={}){return h.render(()=>loaded[component==="report-dashboard"?"ReportDashboard":component==="drill-down"?"DrillDown":"Exceptions"](props));}};
}

test("Overview renders every authorized metric once, with exact money, semantic groups and attribution tools",()=>{
 const {ReportOverview}=loadServer("src/features/reports/report-overview.tsx",{modules:ui}),opened=[],attributions=[];
 const tree=ReportOverview({metrics:fixture().metrics,drill:key=>opened.push(key),attribution:key=>attributions.push(key),alerts(){}});
 const cards=find(tree,"article");assert.equal(cards.length,13);cards.forEach(card=>find(card,"Button")[0].props.onClick());assert.deepEqual(opened,plain(model.reportGroups.flatMap(group=>group.keys)));
 assert.ok(text(cards.find(card=>card.props["data-metric"]==="collections")).includes("9007199254740993.42 MAD"));
 find(tree,"Button").filter(button=>!button.props.action).forEach(button=>button.props.onClick());assert.deepEqual(attributions,["contacts","won","activities"]);
});
test("Selected reports keep draft dates separate, reject invalid input and remove unrelated assignment filters",()=>{
 const state=setup("report-dashboard"),props={initialPeriod:{start_on:meta.start_on,end_on:meta.end_on,assigned_agent_id:randomUUID()}};state.render(props);let tree=state.render(props);
 assert.ok(!state.paths.at(-1).includes("assigned_agent_id"));assert.equal(find(tree,"Overview")[0].props.metrics.length,13);
 find(tree,"Input")[1].props.onChange({target:{value:"2029-01-01"}});tree=state.render(props);find(tree,"form")[0].props.onSubmit({preventDefault(){}});tree=state.render(props);assert.equal(state.refreshes,0);assert.ok(text(tree).includes("Choisissez deux dates"));
 find(tree,"Input")[1].props.onChange({target:{value:"2030-01-15"}});tree=state.render(props);find(tree,"form")[0].props.onSubmit({preventDefault(){}});tree=state.render(props);assert.equal(state.refreshes,1);assert.ok(state.paths.at(-1).includes("end_on=2030-01-15"));assert.equal(find(tree,"Overview").length,0);assert.equal(find(tree,"Error")[0].props.error.code,"DEPENDENCY_UNAVAILABLE");
});
test("Report navigation preserves the attribution panel and exact period when opening and returning from a drill",()=>{
 const state=setup("report-dashboard");state.render();let tree=state.render();find(tree,"Overview")[0].props.attribution("won");tree=state.render();const chart=find(tree,"Chart")[0];assert.equal(chart.props.metric.key,"won");chart.props.open(point);tree=state.render();
 const child=find(tree,"Drill")[0];assert.deepEqual(plain(child.props.selection),{metric:"won",attribution_id:point,start_on:meta.start_on,end_on:meta.end_on});assert.equal(find(tree,"Chart")[0].key,chart.key);child.props.close();tree=state.render();assert.equal(find(tree,"Drill").length,0);assert.equal(find(tree,"Chart")[0].key,chart.key);
});
test("A child current-authority denial hides every private report panel until a fresh overview retry",()=>{
 const state=setup("report-dashboard");state.render();let tree=state.render();find(tree,"Overview")[0].props.alerts();tree=state.render();find(tree,"Alerts")[0].props.onDenied(new ApiError("FORBIDDEN",403));tree=state.render();
 for(const type of ["Overview","Chart","Drill","Alerts"])assert.equal(find(tree,type).length,0);assert.equal(find(tree,"Error")[0].props.error.code,"FORBIDDEN");find(tree,"Error")[0].props.retry();tree=state.render();assert.equal(state.refreshes,1);assert.equal(find(tree,"Overview").length,1);
 state.response.error=new ApiError("NOT_FOUND",404);delete state.response.value;tree=state.render();assert.equal(find(tree,"Overview").length,0);
});
test("Actual drills retain exact finance values, offer target links and numbered-page escape, without a table",()=>{
 const target=randomUUID(),response={value:drill({metric:metric("collections"),items:[row({kind:"receipt",href:`/deals/${target}?tab=finance`,value:"9007199254740993.42"})]})};const state=setup("drill-down",response),props={selection:{...selection,metric:"collections"},close(){}};let tree=state.render(props);
 assert.equal(find(tree,"Link")[0].props.href,`/deals/${target}?tab=finance`);assert.ok(text(tree).includes("9007199254740993.42 MAD"));assert.equal(find(tree,"table").length,0);
 find(tree,"Pages")[0].props.change(2);response.value=drill({total:0,page:2,has_previous:true,items:[],metric:metric("collections",0)});tree=state.render(props);assert.equal(find(tree,"Pages")[0].props.page,2);assert.ok(state.paths.at(-1).includes("page=2"));
});
test("A wrong drill or alert context exposes no prior rows; current denial propagates",()=>{
 const response={value:drill()},state=setup("drill-down",response),denials=[];let tree=state.render({selection,close(){},onDenied:error=>denials.push(error)});assert.equal(find(tree,"Link").length,1);
 response.value={...drill(),start_on:"2029-12-01"};tree=state.render({selection,close(){}});assert.equal(find(tree,"Link").length,0);assert.equal(find(tree,"Error")[0].props.error.code,"DEPENDENCY_UNAVAILABLE");
 response.error=new ApiError("FORBIDDEN",403);delete response.value;state.render({selection,close(){},onDenied:error=>denials.push(error)});assert.equal(denials[0].status,403);
 const wrong=setup("exceptions",{value:alerts({kind:"stale_inventory",threshold_days:30})});tree=wrong.render();assert.equal(find(tree,"Link").length,0);
});
test("Actual alerts use independent current thresholds, tonal links and reset pages when category changes",()=>{
 const response={value:alerts()},state=setup("exceptions",response);let tree=state.render();assert.equal(find(tree,"Link").length,1);assert.equal(find(tree,"table").length,0);assert.ok(!state.paths.at(-1).includes("start_on"));
 find(tree,"Pages")[0].props.change(2);state.render();assert.ok(state.paths.at(-1).includes("page=2"));find(tree,"Select")[0].props.onChange({target:{value:"stale_inventory"}});state.render();assert.ok(state.paths.at(-1).includes("page=1"));assert.ok(state.paths.at(-1).includes("kind=stale_inventory"));
});
test("The actual report navigation restores its connected trigger and scroll position on back",()=>{
 const h=harness(),target=new Element(),scroller=new Element(),root=new Element(),heading=new Element();scroller.scrollTop=380;root.scroller=scroller;root.heading=heading;const document={activeElement:target};
 const {useReportNavigation}=loadServer("src/features/reports/report-navigation.ts",{modules:{react:h.react},globals:{document,HTMLElement:Element}});let view;const render=()=>h.render(()=>view=useReportNavigation());render();view.root.current=root;view.open({kind:"alerts"});render();assert.equal(scroller.scrollTop,0);assert.equal(heading.focused,1);view.back();render();assert.equal(scroller.scrollTop,380);assert.equal(target.focused,1);
 view.open({kind:"attribution",metric:"contacts"});render();target.isConnected=false;view.back();render();assert.equal(target.focused,1);
});


test("A refreshed attribution page preserves navigation and offers an escape when its contributors shrink",()=>{
 const h=harness(),modules={...ui,react:h.react,"@/components/charts/bar-chart":{BarChart:"BarChart"},"@/components/charts/bar":{Bar:"Bar"},"@/components/charts/tooltip/chart-tooltip":{ChartTooltip:"Tooltip"},"@/components/charts/chart-context":{useChartHover(){},useChartStable(){}}};
 const {MetricChart}=loadServer("src/features/reports/metric-chart.tsx",{modules});let value=metric("contacts",11);value.series=Array.from({length:11},(_,index)=>({id:randomUUID(),label:`Synthetic contributor ${index}`,value:1}));
 const render=()=>h.render(()=>MetricChart({metric:value,open(){}}));let tree=render();assert.equal(find(tree,"Bar").length,10);find(tree,"Pages")[0].props.change(2);tree=render();assert.equal(find(tree,"Bar").length,1);
 value={...value,total:1,value:"1",series:value.series.slice(0,1)};tree=render();assert.ok(text(tree).includes("Aucun contributeur sur cette page"));assert.ok(!text(tree).includes("Le total est 0"));assert.equal(find(tree,"Pages")[0].props.page,2);find(tree,"Pages")[0].props.change(1);tree=render();assert.equal(find(tree,"Bar").length,1);
});
