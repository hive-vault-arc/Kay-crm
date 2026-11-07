import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const jsx=(type,props,key)=>({type,props,key}),runtime={jsx,jsxs:jsx,Fragment:"Fragment"};
function find(node,type){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(child=>find(child,type));return[...(node.type===type||typeof type==="function"&&type(node)?[node]:[]),...find(node.props?.children,type)];}
function text(node){if(node==null||typeof node==="boolean")return"";if(Array.isArray(node))return node.map(text).join("");return typeof node==="object"?text(node.props?.children):String(node);}
function hooks(){
 const slots=[],pending=[],listeners=new Map();let cursor=0;
 return{
  react:{
   useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==="function"?initial():initial;return[slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},
   useRef(initial){const i=cursor++;return slots[i]??={current:initial};},
   useId:()=>"synthetic-search",useTransition:()=>[false,run=>run()],
   useEffect(run,deps){const i=cursor++,prior=slots[i];if(!prior||deps.some((v,n)=>!Object.is(v,prior.deps[n]))){const next={deps,run};pending.push(()=>{prior?.cleanup?.();next.cleanup=run();});slots[i]=next;}},
  },
  window:{addEventListener:(type,callback)=>listeners.set(type,callback),removeEventListener:type=>listeners.delete(type)},
  dispatch:type=>listeners.get(type)?.(),
  render(fn){cursor=0;return fn();},effects(){pending.splice(0).forEach(run=>run());},dispose(){slots.forEach(slot=>slot?.cleanup?.());},
 };
}
const qualification=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":qualification}}),contracts=loadServer("src/features/discovery/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}}),model=loadServer("src/features/discovery/search-model.ts",{modules:{"./contracts":contracts}});
const paths=[],queryPath=(kind,values)=>{const params=new URLSearchParams();for(const[key,value]of Object.entries(values))if(value!==undefined&&value!=="")params.set(key,String(value));return`/api/v1/${kind}?${params}`;};
const icons=Object.fromEntries(["Contact","Contacts","Deal","Development","File","Forward","Property","Search"].map(name=>[name+"Icon","Icon"]));
function common(h,read=()=>({})){return{react:h.react,"react/jsx-runtime":runtime,"next/link":{default:"Link"},"@/components/icons":icons,"@/components/ui/button":{Button:"Button"},"@/components/ui/input":{Input:"Input"},"@/components/ui/label":{Label:"Label"},"@/components/ui/native-select":{NativeSelect:"Select"},"@/components/ui/popover":{Popover:"Popover",PopoverAnchor:"Anchor",PopoverContent:"Popup"},"@/components/ui/tabs":{Tabs:"Tabs",TabsContent:"TabContent",TabsList:"TabList",TabsTrigger:"Tab"},"@/components/ui/sheet":{Sheet:"Sheet",SheetContent:"SheetContent",SheetDescription:"Description",SheetHeader:"Header",SheetTitle:"Title",SheetTrigger:"Trigger"},"@/features/contacts/numbered-pages":{NumberedPages:"Pages"},"@/features/contacts/record-states":{RecordError:"Error"},"@/features/contacts/use-query":{queryPath,useQuery:path=>{paths.push(path);return read(path);}},"@/hooks/use-hydrated":{useHydrated:()=>true},"./contracts":contracts,"./search-model":model,"./search-presentation":{SearchResultLink:"Result",SearchEmpty:"Empty"}};}
const fixture=()=>contracts.searchSchema.parse({items:[{id:randomUUID(),kind:"contact",label:"Synthetic contact",href:`/contacts/${randomUUID()}`},{id:randomUUID(),kind:"document",label:"Synthetic document",href:`/deals/${randomUUID()}`}],total:51,page:1,page_size:20,has_previous:false,has_next:true,counts:{contact:30,document:21}});

test("Search page URLs admit only bounded query/type/page and preserve literal query encoding",()=>{
 const q="  Villa & +212 / <synthetic>  ",href=model.searchPageHref({q,kind:"property",page:3}),url=new URL(href,"https://synthetic.invalid");assert.equal(url.pathname,"/search");assert.equal(url.searchParams.get("q"),q.trim());assert.equal(url.searchParams.get("kind"),"property");assert.equal(url.searchParams.get("page"),"3");assert.ok(!href.includes("<synthetic>"));
 for(const invalid of [{q:"x"},{q:"x".repeat(161)},{q:"ok",role:"administrator"},{q:"ok",scope:"agency"},{q:"ok",kind:"finance"},{q:["ok","another"]},{q:"ok",page:0},{q:"ok",page:1000001},{q:"ok",page_size:100}])assert.equal(contracts.searchPageQuerySchema.safeParse(invalid).success,false);
 assert.equal(model.searchPageHref({q:"x"}),"/search");const auth=loadServer("src/lib/auth/contracts.ts");assert.equal(auth.safeReturnPath("/search"),"/search");for(const path of ["/search?q=private","//synthetic.invalid/search","/search#unsafe","/search/../login"])assert.equal(auth.safeReturnPath(path),"/dashboard");
});

test("Search route authenticates before inspecting params and rejects duplicates/unknown input without reflecting it",async()=>{
 let authenticated=false,inspected=0;const destinations=[];
 const {default:Page}=loadServer("src/app/(workspace)/search/page.tsx",{modules:{"react/jsx-runtime":runtime,"@/components/shared/page-header":{PageHeader:"PageHeader"},"@/features/auth/auth-frame":{AuthUnavailable:"AuthUnavailable"},"@/features/discovery/contracts":contracts,"@/features/discovery/search-model":model,"@/features/discovery/search-workspace":{SearchWorkspace:"Workspace"},"@/lib/auth/server":{requireIdentity:async path=>{destinations.push(path);return{state:authenticated?"authenticated":"unavailable"};}}}});
 const unavailable=await Page({searchParams:{then(){inspected++;throw Error("MUST_NOT_READ");}}});assert.equal(unavailable.type,"AuthUnavailable");assert.equal(inspected,0);authenticated=true;
 let tree=await Page({searchParams:Promise.resolve({q:"  alpha  ",page:"3",kind:"property"})});assert.equal(find(tree,"Workspace")[0].props.initial.q,"alpha");assert.equal(find(tree,"Workspace")[0].props.initial.page,3);
 for(const params of [{q:["alpha","beta"]},{q:"alpha",role:"unexpected-private-value"},{q:"x".repeat(161)},{q:"alpha",page_size:"100"}]){tree=await Page({searchParams:Promise.resolve(params)});const view=find(tree,"Workspace")[0];assert.equal(view.props.initial,undefined);assert.equal(view.props.invalidQuery,true);assert.ok(!JSON.stringify(tree).includes("unexpected-private-value"));}
 assert.ok(destinations.every(path=>path==="/search"));
});

test("Responsive header uses the selected desktop preview and an icon-only phone Sheet",()=>{
 for(const[phone,props,expected]of [[false,{responsive:true},"Desktop"],[true,{responsive:true},"Sheet"],[false,{compact:true},"Sheet"],[false,{sidebar:true},"Sheet"]]){
  const h=hooks(),{SearchTrigger}=loadServer("src/features/discovery/search-trigger.tsx",{modules:{...common(h),"@/hooks/use-phone-layout":{usePhoneLayout:()=>phone},"./search-preview":{DesktopSearch:"Desktop"},"./search-workspace":{SearchWorkspace:"Workspace"}}});
  const tree=h.render(()=>SearchTrigger(props));assert.equal(tree.type,expected);if(phone){const button=find(tree,"Button")[0];assert.equal(button.props.size,"icon");assert.equal(button.props["aria-label"],"Rechercher");assert.equal(find(tree,"Workspace")[0].props.panel,true);}
 }
 const h=hooks();let phone=true;const {SearchTrigger}=loadServer("src/features/discovery/search-trigger.tsx",{modules:{...common(h),"@/hooks/use-phone-layout":{usePhoneLayout:()=>phone},"./search-preview":{DesktopSearch:"Desktop"},"./search-workspace":{SearchWorkspace:"Workspace"}}});const render=()=>h.render(()=>SearchTrigger({responsive:true}));let tree=render();tree.props.onOpenChange(true);tree=render();assert.equal(tree.props.open,true);phone=false;render();tree=render();assert.equal(tree.type,"Desktop");phone=true;render();tree=render();assert.equal(tree.props.open,false);
});

test("Desktop suggestions debounce, remove old queries immediately, bound previews and clear on route changes",async()=>{
 const h=hooks(),frames=[];let pathname="/dashboard",response={value:fixture(),refresh(){}};
 const {DesktopSearch}=loadServer("src/features/discovery/search-preview.tsx",{modules:{...common(h,()=>response),"next/navigation":{usePathname:()=>pathname}},globals:{window:h.window,requestAnimationFrame:fn=>frames.push(fn)}});
 const render=()=>h.render(()=>DesktopSearch());let tree=render();assert.equal(tree.props.open,false);assert.equal(find(tree,"Popup").length,0);let field=find(tree,"Input")[0];field.props.onChange({target:{value:"a"}});tree=render();h.effects();assert.equal(find(tree,"Popup").length,0);
 find(tree,"Input")[0].props.onChange({target:{value:"alpha"}});tree=render();h.effects();assert.equal(find(tree,"Popup").length,1);assert.ok(text(tree).includes("Recherche en cours"));await delay(340);tree=render();
 let preview=find(tree,node=>typeof node.type==="function")[0];paths.length=0;let rows=preview.type(preview.props);assert.equal(paths[0],"/api/v1/search?q=alpha&page=1&page_size=8");assert.ok(text(rows).includes("51 résultat"));
 find(tree,"Input")[0].props.onChange({target:{value:"beta"}});tree=render();h.effects();assert.equal(find(tree,node=>typeof node.type==="function").length,0);assert.ok(!text(tree).includes("Synthetic contact"));
 response={error:{code:"FORBIDDEN"},refresh(){}};await delay(340);tree=render();preview=find(tree,node=>typeof node.type==="function")[0];rows=preview.type(preview.props);assert.equal(rows.type,"Error");assert.equal(find(rows,"Result").length,0);
 h.dispatch("popstate");tree=render();h.effects();assert.equal(find(tree,"Input")[0].props.value,"");assert.equal(find(tree,"Popup").length,0);find(tree,"Input")[0].props.onChange({target:{value:"gamma"}});tree=render();pathname="/contacts";render();tree=render();h.effects();assert.equal(find(tree,"Input")[0].props.value,"");assert.equal(find(tree,"Popup").length,0);h.dispose();
});

test("Suggestion keyboard focus wraps, Enter works after dismissal and Escape does not reopen on focus return",()=>{
 assert.equal(model.searchFocusIndex("ArrowDown",-1,3),0);assert.equal(model.searchFocusIndex("ArrowUp",-1,3),2);assert.equal(model.searchFocusIndex("ArrowDown",2,3),0);assert.equal(model.searchFocusIndex("Home",2,3),0);assert.equal(model.searchFocusIndex("End",0,3),2);assert.equal(model.searchFocusIndex("x",0,3),null);assert.equal(model.searchFocusIndex("ArrowDown",0,0),null);
 const h=hooks(),frames=[];const {DesktopSearch}=loadServer("src/features/discovery/search-preview.tsx",{modules:{...common(h),"next/navigation":{usePathname:()=>"/dashboard"}},globals:{window:h.window,requestAnimationFrame:fn=>frames.push(fn)}});
 const render=()=>h.render(()=>DesktopSearch()),event=key=>({key,preventDefault(){},stopPropagation(){}});let tree=render();find(tree,"Input")[0].props.onChange({target:{value:"alpha"}});tree=render();
 let focused=0,clicked=0;const field=()=>find(tree,"Input")[0];field().props.ref.current={value:"alpha",focus(){focused++;field().props.onFocus();}};
 const popup=find(tree,"Popup")[0];popup.props.onEscapeKeyDown();tree.props.onOpenChange(false);tree=render();assert.equal(find(tree,"Popup").length,0);popup.props.onCloseAutoFocus({preventDefault(){}});tree=render();assert.equal(focused,1);assert.equal(tree.props.open,false);
 field().props.onKeyDown(event("Enter"));tree=render();find(tree,"Link")[0].props.ref.current={click(){clicked++;}};frames.splice(0).forEach(fn=>fn());assert.equal(clicked,1);
 const links=[0,1,2].map(index=>({focus(){focused=index+10;},contains:target=>target===index,click(){clicked++;}}));find(tree,"Popup")[0].props.ref.current={querySelectorAll:()=>links};find(tree,"Popup")[0].props.onKeyDown({...event("ArrowDown"),target:2});assert.equal(focused,10);find(tree,"Popup")[0].props.onKeyDown({...event("Enter"),target:1});assert.equal(clicked,2);h.dispose();
});

function workspace(h,read,{guarded=[],routes=[]}={}){
 return loadServer("src/features/discovery/search-workspace.tsx",{modules:{
  ...common(h,read),"next/navigation":{useRouter:()=>({push:path=>routes.push(path)})},
  "@/components/shared/unsaved-guard":{useUnsavedGuard:()=>({request:run=>guarded.push(run),dialog:null})},
 }}).SearchWorkspace;
}

test("Full results keep scoped totals, native facets and numbered pages behind the unsaved guard",()=>{
 const h=hooks(),guarded=[],routes=[],value=fixture(),View=workspace(h,()=>({value,refresh(){}}),{guarded,routes});paths.length=0;
 let tree=h.render(()=>View({initial:{q:"alpha",page:3}}));const results=find(tree,node=>typeof node.type==="function")[0];let rows=results.type(results.props);assert.equal(paths.at(-1),"/api/v1/search?q=alpha&page=3&page_size=20");assert.equal(find(rows,"Pages")[0].props.total,51);assert.equal(find(rows,"Result").length,2);assert.equal(find(rows,"Tab").length,3);
 rows.props.onValueChange("document");assert.equal(routes.length,0);assert.equal(guarded.length,1);guarded.shift()();assert.equal(routes[0],"/search?q=alpha&kind=document");
 find(rows,"Pages")[0].props.change(2);guarded.shift()();assert.equal(routes[1],"/search?q=alpha&page=2");
 tree=h.render(()=>View({initial:{q:"alpha",page:3}}));find(tree,"Input")[0].props.onChange({target:{value:"x"}});tree=h.render(()=>View({initial:{q:"alpha",page:3}}));find(tree,"form")[0].props.onSubmit({preventDefault(){}});tree=h.render(()=>View({initial:{q:"alpha",page:3}}));assert.ok(find(tree,node=>node.props?.role==="alert").length);assert.equal(guarded.length,0);
});

test("Phone search clears prior results on edits, validates before reads and retains close behavior",()=>{
 const h=hooks(),value=fixture(),View=workspace(h,()=>({value,refresh(){}}));const render=()=>h.render(()=>View({panel:true,close(){}}));let tree=render();assert.equal(find(tree,node=>typeof node.type==="function").length,0);
 find(tree,"Input")[0].props.onChange({target:{value:" alpha "}});tree=render();find(tree,"form")[0].props.onSubmit({preventDefault(){}});tree=render();let child=find(tree,node=>typeof node.type==="function")[0];assert.equal(child.props.query.q,"alpha");let rows=child.type(child.props);assert.equal(find(rows,"Result").length,2);assert.equal(typeof find(rows,"Result")[0].props.close,"function");
 find(tree,"Input")[0].props.onChange({target:{value:"beta"}});tree=render();assert.equal(find(tree,node=>typeof node.type==="function").length,0);
 find(tree,"Select")[0].props.onChange({target:{value:"finance"}});tree=render();find(tree,"form")[0].props.onSubmit({preventDefault(){}});tree=render();assert.ok(find(tree,node=>node.props?.role==="alert").length);assert.equal(find(tree,node=>typeof node.type==="function").length,0);
});

test("Result links retain scoped parent/type destinations without prefetch or public document bytes",()=>{
 const h=hooks(),{SearchResultLink}=loadServer("src/features/discovery/search-presentation.tsx",{modules:common(h)});let closed=0;const item={kind:"document",id:randomUUID(),label:"Synthetic <document>",href:`/deals/${randomUUID()}`};const link=SearchResultLink({item,close:()=>closed++});assert.equal(link.props.href,item.href);assert.equal(link.props.prefetch,false);link.props.onClick();assert.equal(closed,1);
 assert.equal(contracts.searchSchema.safeParse({...fixture(),items:[{...item,href:"https://synthetic.invalid/public.pdf"}]}).success,false);
 const topics=loadServer("src/features/realtime/query-topics.ts");for(const topic of ["contacts","enquiries","deals","inventory","files","identity"])assert.equal(topics.matchesTopics("/api/v1/search?q=alpha",[topic]),true);assert.equal(topics.matchesTopics("/api/v1/search?q=alpha",["finance"]),false);
});
