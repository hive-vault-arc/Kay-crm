import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createElement } from "react";
import * as realRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadServer } from "./load-server.mjs";
const jsx=(type,props,key)=>({type,props,key}),runtime={jsx,jsxs:jsx,Fragment:"Fragment"};
const plain=value=>JSON.parse(JSON.stringify(value));
function find(node,type){if(!node||typeof node!=="object")return[];if(Array.isArray(node))return node.flatMap(n=>find(n,type));return[...(node.type===type||typeof type==="function"&&type(node)?[node]:[]),...find(node.props?.children,type)];}
function harness(){let active={state:[],cursor:0};const scopes=new Map([["root",active]]),effects=[];const react={useState(initial){const target=active,i=target.cursor++;if(!(i in target.state))target.state[i]=typeof initial==="function"?initial():initial;return[target.state[i],v=>{target.state[i]=typeof v==="function"?v(target.state[i]):v;}];},useRef(initial){const i=active.cursor++;if(!(i in active.state))active.state[i]={current:initial};return active.state[i];},useId:()=>"synthetic-visit",useEffect:callback=>effects.push(callback)};return{react,effects,render(callback,name="root"){if(!scopes.has(name))scopes.set(name,{state:[],cursor:0});const prior=active;active=scopes.get(name);active.cursor=0;try{return callback();}finally{active=prior;}}};}
class ApiError extends Error{constructor(code,status){super(code);Object.assign(this,{code,status});}}
const vocabulary=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":vocabulary}}),contracts=loadServer("src/features/schedule/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}}),currentRecord=loadServer("src/features/realtime/current-record.ts");
const actor=randomUUID(),at="2026-10-20T09:00:00Z";
const policy=contracts.policySchema.parse({version:3,time_zone:"Africa/Casablanca",company_car_capacity_per_hour:2,working_windows:[{weekday:2,start_local:"09:00",end_local:"18:00"}],lunch_breaks:[{weekday:2,start_local:"12:00",end_local:"13:00"}]});
function visit(patch={}){return contracts.visitSchema.parse({id:randomUUID(),version:8,schedule_version:2,title:"Synthetic visit",contact_id:randomUUID(),origin_contact_id:randomUUID(),organizer_user_id:actor,contact_name:"Synthetic contact",contact_archived:false,type:"company_car",status:"scheduled",start_at:at,end_at:"2026-10-20T10:00:00Z",start_local:"2026-10-20T10:00:00+01:00",end_local:"2026-10-20T11:00:00+01:00",location:"Synthetic location",participant_ids:[actor],participants:[{id:actor,display_name:"Synthetic actor"}],overlap_reason:"Reviewed overlap",outcome:"",policy_version:3,review_code:null,deal_id:randomUUID(),enquiry_id:null,property_id:randomUUID(),updated_by_user_id:actor,created_at:at,updated_at:at,...patch});}
const dialogs={AlertDialog:"Dialog",AlertDialogCancel:"Cancel",AlertDialogContent:"Content",AlertDialogDescription:"Description",AlertDialogTitle:"Title",AlertDialogTrigger:"Trigger"};
function common(h){return{react:h.react,"react/jsx-runtime":runtime,"next/link":{default:"Link"},"@/hooks/use-hydrated":{useHydrated:()=>true},"@/lib/api/client":{ApiError},"@/components/ui/button":{Button:"Button"},"@/components/ui/input":{Input:"Input"},"@/components/ui/label":{Label:"Label"},"@/components/ui/textarea":{Textarea:"Textarea"},"@/components/ui/native-select":{NativeSelect:"Select"},"@/components/ui/checkbox":{Checkbox:"Checkbox"},"@/components/ui/form":{Form:"Form",FormControl:"Control",FormField:"Field",FormItem:"Item",FormLabel:"FieldLabel",FormMessage:"Message"},"@/components/shared/unsaved-guard":{useUnsavedGuard:()=>({dialog:null,request:callback=>callback()})},"@/features/contacts/record-states":{RecordError:"Error"},"./contracts":contracts,"./time":{localLabel:value=>value}};}
function formModule(h,command,read=async()=>preview(),queries){let values;const enquiryId=randomUUID();const state={isSubmitting:false,errors:{}},guarded=[];const form={control:{},formState:state,setFocus(){},handleSubmit:callback=>async event=>{event.preventDefault();state.isSubmitting=true;try{await callback(values);}finally{state.isSubmitting=false;}}};const modules={...common(h),"react-hook-form":{useForm:options=>{values??=structuredClone(options.defaultValues);return form;},useWatch:()=>values},"@hookform/resolvers/zod":{zodResolver:()=>({})},"@/components/shared/dossier-form":loadServer("src/components/shared/dossier-form.tsx",{modules:{react:h.react,"react/jsx-runtime":runtime,"./record-header":{RecordHeader:"Header"}}}),"@/components/shared/unsaved-guard":{useUnsavedGuard:()=>({dialog:null,request:callback=>guarded.push(callback)})},"@/features/contacts/use-query":{queryPath:(resource,values)=>"/api/v1/"+resource+"?"+new URLSearchParams(Object.entries(values).filter(([,v])=>v!==undefined)),useQuery:path=>path.includes("visit-properties")?{value:{items:[],deal_id:null,enquiry_id:enquiryId},refresh(){},refreshQuietly(){}}:queries?queries(path):{value:path.includes("policy")?policy:{items:[{id:actor,display_name:"Synthetic actor"}]},refresh(){}}},"@/components/icons":{ChevronDownIcon:"Chevron"},"@/features/contacts/contracts":contacts,"@/features/deals/contracts":{dealsSchema:{}},"./visit-property-select":{VisitPropertySelect:"Property"},"./visit-slot-preview":{VisitSlotRules:"Rules"},"./local-time-field":{LocalTimeField:"Time"},"@/lib/api/client":{ApiError,apiGet:async path=>path.includes("/deals?")?{items:[]}:path.includes("/enquiries?")?{items:[{id:enquiryId}]}:read(path)},"@/lib/api/command":{apiCommand:command}};const loaded=loadServer("src/features/schedule/visit-form.tsx",{modules,globals:{crypto:{randomUUID},document:{getElementById:()=>null}}});return{...loaded,guarded,setText:patch=>{values={...values,...patch};}};}
function preview(patch={}){return contracts.availabilitySchema.parse({policy_version:3,time_zone:"Africa/Casablanca",type:"company_car",bookable:true,code:null,preview_only:true,company_car_intervals:[],...patch});}
const submit=tree=>find(tree,"form")[0].props.onSubmit({preventDefault(){}});
function fillNew(tree){const [time]=find(tree,"Time");time.props.changeLocal("2026-10-20T10:00");time.props.choose(at);}

for (const supported of [false, true]) test(`Visit notes are ${supported ? "saved with stable retry identity" : "omitted for an older backend"}`, async () => {
 const h=harness(),calls=[];let interrupted=true;
 const controller=formModule(h,async(...args)=>{calls.push(args);if(interrupted)throw new ApiError("DEPENDENCY_UNAVAILABLE",503);return{id:randomUUID(),version:1};},undefined,path=>({value:path.includes("policy")?policy:path.endsWith("calendar/context")?{today:"2026-10-20",time_zone:"Africa/Casablanca",tzdata_version:"synthetic",...(supported?{notes_supported:true}:{})}:{items:[{id:actor,display_name:"Synthetic actor"}]},refresh(){}}));
 const props={actorId:actor,contactId:randomUUID(),contactName:"Synthetic contact",saved(){}};
 const render=()=>h.render(()=>controller.VisitForm(props));let tree=render();
 assert.equal(find(tree,"Field").some(field=>field.props.name==="notes"),supported);
 fillNew(tree,controller);if(supported)controller.setText({notes:"Préparer le dossier\nSeconde ligne"});

 tree=render();submit(tree);await delay(0);assert.equal(calls.length,1);
 assert.equal(calls[0][1].notes,supported?"Préparer le dossier\nSeconde ligne":undefined);
 assert.equal(calls[0][1].overlap_reason,undefined);
 interrupted=false;submit(render());await delay(0);assert.equal(calls[0][3],calls[1][3]);assert.deepEqual(plain(calls[0][1]),plain(calls[1][1]));
});

test("Clearing saved visit notes sends an explicit empty value without changing overlap explanation", async () => {
 const h=harness(),calls=[],value=visit({status:"draft",notes:"Notes sauvegardées"});
 const controller=formModule(h,async(...args)=>{calls.push(args);return{id:value.id,version:9};});
 const props={actorId:actor,contactId:value.contact_id,contactName:value.contact_name,value,saved(){}};
 const render=()=>h.render(()=>controller.VisitForm(props));let tree=render();
 assert.equal(find(tree,"Field").some(field=>field.props.name==="notes"),true);
 controller.setText({notes:""});submit(render());await delay(0);
 assert.equal(calls[0][1].notes,"");assert.equal(calls[0][1].overlap_reason,undefined);assert.equal(calls[0][1].expected_version,8);
});

test("Visit creation sends only resolved instants and explicit context/property, preserving retry identity after an interrupted write",async()=>{
 const h=harness(),calls=[],saved=[];let fail=true;const controller=formModule(h,async(...args)=>{calls.push(args);if(fail)throw new ApiError("DEPENDENCY_UNAVAILABLE",503);return{id:randomUUID(),version:1};});const props={actorId:actor,contactId:randomUUID(),contactName:"Synthetic contact",saved:id=>saved.push(id),cancel(){}};const render=()=>h.render(()=>controller.VisitForm(props));let tree=render();fillNew(tree,controller);const propertyId=randomUUID();find(tree,"Property")[0].props.change(propertyId);tree=render();submit(tree);submit(tree);await delay(0);assert.equal(calls.length,1);assert.equal(calls[0][1].contact_id,props.contactId);assert.equal(calls[0][1].property_id,propertyId);assert.equal(calls[0][1].start_at,at);assert.equal(calls[0][1].overlap_reason,undefined);assert.equal(calls[0][1].status,"confirmed");assert.equal(calls[0][1].participant_ids[0],actor);assert.equal(calls[0][1].start_local,undefined);tree=render();assert.equal(find(tree,"form")[0].props["data-live-dirty"],"true");fail=false;submit(tree);await delay(0);assert.equal(calls[0][3],calls[1][3]);assert.deepEqual(plain(calls[0][1]),plain(calls[1][1]));assert.equal(saved.length,1);assert.equal(find(render(),"form")[0].props["data-live-dirty"],undefined);
});

test("One booking submits once while the authoritative check is pending", async () => {
 const h=harness(),calls=[],reads=[];let finish;
 const controller=formModule(h,async(...args)=>{calls.push(args);return new Promise(resolve=>{finish=resolve;});},async path=>{reads.push(path);throw Error("Unexpected preview");});
 const props={actorId:actor,contactId:randomUUID(),contactName:"Synthetic contact",saved(){}};
 const render=()=>h.render(()=>controller.VisitForm(props));fillNew(render());const tree=render();
 const submitting=submit(tree);submit(tree);
 assert.equal(calls.length,1);assert.equal(reads.length,0);
 assert.equal(find(render(),"form")[0].props["aria-busy"],true);
 finish({id:randomUUID(),version:1});await submitting;
});

test("Rescheduling preserves reviewed fields and versions, requires explicit comparison before retrying a rebase",async()=>{
 const h=harness(),original=visit(),newer={...original,version:11},calls=[];let conflict=true;const controller=formModule(h,async(...args)=>{calls.push(args);if(conflict)throw new ApiError("VERSION_CONFLICT",409);return{id:original.id,version:12};},async path=>path.includes("availability")?preview():newer);let incoming=original;const props={actorId:actor,contactId:original.contact_id,contactName:original.contact_name,saved(){},cancel(){}};const render=()=>h.render(()=>controller.VisitForm({...props,value:incoming}));let tree=render();incoming={...original,version:10,overlap_reason:"Concurrent explanation"};tree=render();submit(tree);await delay(0);assert.equal(calls[0][0],"/api/v1/visits/"+original.id+"/reschedule");assert.equal(calls[0][1].expected_version,8);assert.equal(calls[0][1].overlap_reason,undefined);assert.equal(calls[0][1].property_id,original.property_id);tree=render();submit(tree);await delay(0);assert.equal(calls.length,1);find(tree,"Button").find(n=>n.props.action==="compare").props.onClick();tree=render();tree=render();conflict=false;submit(tree);await delay(0);assert.equal(calls[1][1].expected_version,11);assert.notEqual(calls[1][3],calls[0][3]);
});

test("A terminal/canonical-context conflict cannot be rebased and a comparison read denial removes the old form",async()=>{
 for(const kind of ["terminal","canonical","denied"]){const h=harness(),original=visit(),controller=formModule(h,async()=>{throw new ApiError("VERSION_CONFLICT",409);},async path=>{if(path.includes("availability"))return preview();if(kind==="terminal")return{...original,status:"completed"};if(kind==="canonical")return{...original,contact_id:randomUUID()};throw new ApiError("FORBIDDEN",403);});const render=()=>h.render(()=>controller.VisitForm({actorId:actor,contactId:original.contact_id,contactName:original.contact_name,value:original,saved(){}}));let tree=render();tree=render();submit(tree);await delay(0);tree=render();if(kind!=="denied"){assert.equal(find(tree,"Button").some(n=>n.props.action==="compare"),false);assert.equal(find(tree,"Button").find(n=>n.props.type==="submit").props.disabled,true);}else{assert.equal(find(tree,"form").length,0);assert.equal(find(tree,"Error")[0].props.error.code,"FORBIDDEN");}}
});

function recordModule(h,read,query){return loadServer("src/features/schedule/visit-record.tsx",{modules:{...common(h),"@/components/shared/crm-presentation":{CrmStatusBadge:"Badge"},"@/components/shared/record-actions":{RecordActions:"Actions"},"@/components/shared/record-entry":{RecordEntry:"Entry"},"@/features/contacts/numbered-pages":{NumberedPages:"Pages"},"./visit-route-drawer":{VisitRouteDrawer:"Drawer"},"@/components/ui/alert-dialog":dialogs,"@/features/contacts/use-query":{useQuery:query},"@/features/realtime/current-record":currentRecord,"@/lib/api/client":{ApiError,apiGet:read},"@/lib/api/command":{apiCommand:async()=>{}},"./visit-form":{VisitForm:"Booking"}},globals:{requestAnimationFrame:callback=>callback(),crypto:{randomUUID}}});}

test("Visit notes stay separate from outcome and overlap text in details and original history", () => {
 const h=harness(),original=visit({notes:"Notes actuelles <synthetic>",overlap_reason:"Chevauchement distinct",outcome:"Résultat distinct"});
 const event={id:randomUUID(),version:1,action:"created",actor:{id:actor,display_name:"Synthetic actor"},occurred_at:at,reason:"Motif distinct",snapshot:{status:"scheduled",start_at:at,end_at:original.end_at,notes:"Notes originales"}};
 const loaded=recordModule(h,async()=>original,path=>({value:path.endsWith("/history")?{items:[event]}:original,refresh(){}}));
 const render=()=>h.render(()=>loaded.VisitRecord({id:original.id,actorId:actor}));let tree=render();
 for(const text of [original.notes,original.outcome])assert.ok(find(tree,"p").some(node=>node.props.children===text));
 assert.ok(find(tree,"summary").some(node=>node.props.children==="Notes"));
 find(tree,"details").find(node=>node.props.onToggle).props.onToggle({currentTarget:{open:true}});tree=render();
 const history=find(tree,node=>node.type?.name==="VisitHistory")[0],rows=h.render(()=>history.type(history.props),"history");
 assert.ok(find(rows,"p").some(node=>node.props.children==="Notes originales"));assert.ok(find(rows,"p").some(node=>node.props.children==="Motif distinct"));
 assert.equal(contracts.visitSchema.safeParse({...original,notes:null}).success,false);
 assert.equal(contracts.visitSchema.safeParse({...original,notes:"x".repeat(1001)}).success,false);
});

test("Visit details use one drawer with lazy paged card history, retain it during editing and remove all content on history denial",()=>{
 const h=harness(),original=visit({outcome:"Synthetic result"}),events=Array.from({length:41},(_,index)=>({id:randomUUID(),version:index+1,action:"updated",actor:{id:actor,display_name:"Synthetic actor"},occurred_at:at,reason:"Synthetic reason",snapshot:{status:"scheduled",start_at:at,end_at:original.end_at}}));let denied=false;const calls=[];const loaded=recordModule(h,async()=>original,path=>{calls.push(path);return path.endsWith("/history")?denied?{error:new ApiError("FORBIDDEN",403)}:{value:{items:events}}:{value:original,refresh(){}};});const render=()=>h.render(()=>loaded.VisitRecord({id:original.id,actorId:actor}));let tree=render();assert.equal(find(tree,"Drawer")[0].props.title,original.title);assert.equal(calls.some(path=>path.endsWith("/history")),false);const disclosure=find(tree,"details").find(n=>n.props.onToggle);disclosure.props.onToggle({currentTarget:{open:true}});tree=render();let history=find(tree,n=>n.type?.name==="VisitHistory")[0];const renderHistory=()=>h.render(()=>history.type(history.props),"history");let rows=renderHistory();assert.equal(find(rows,"Entry").length,20);find(rows,"Pages")[0].props.change(3);rows=renderHistory();assert.equal(find(rows,"Entry").length,1);const controls=find(tree,n=>n.type?.name==="VisitControls")[0];controls.props.edit();tree=render();assert.equal(find(tree,"Booking").length,1);history=find(tree,n=>n.type?.name==="VisitHistory")[0];assert.equal(find(renderHistory(),"Pages")[0].props.page,3);denied=true;renderHistory();h.effects.splice(0).forEach(callback=>callback());tree=render();assert.equal(find(tree,"Drawer")[0].props.title,"Visite");assert.equal(find(tree,"Booking").length,0);assert.equal(find(tree,"Badge").length,0);assert.equal(find(tree,"Error")[0].props.error.code,"FORBIDDEN");
});

test("Visit controls keep one reviewed command owner when the live record changes and terminal records expose no commands",()=>{
 const h=harness();let original=visit();const loaded=recordModule(h,async()=>original,()=>({value:original,refresh(){}}));const root=()=>h.render(()=>loaded.VisitRecord({id:original.id,actorId:actor}));let tree=root(),control=find(tree,n=>n.type?.name==="VisitControls")[0];const renderControl=()=>h.render(()=>control.type(control.props),"controls");let controls=renderControl();find(controls,"Button").find(n=>n.props.children==="Saisir le résultat").props.onClick();original={...original,version:19};tree=root();control=find(tree,n=>n.type?.name==="VisitControls")[0];controls=renderControl();const command=find(controls,n=>n.type?.name==="VisitAction");assert.equal(command.length,1);assert.equal(command[0].props.value.version,8);assert.equal(command[0].props.dialogOnly,true);command[0].props.closed();assert.equal(find(renderControl(),n=>n.type?.name==="VisitAction").length,0);original={...original,status:"cancelled"};tree=root();assert.equal(find(tree,n=>n.type?.name==="VisitControls").length,0);
});

test("The visits layout owns the sole calendar and preserves each protected page's exact destination and bounded create context",async()=>{
 const modules={"react/jsx-runtime":runtime,"next/link":{default:"Link"},"@/components/shared/page-header":{PageHeader:"Header"},"@/components/ui/button":{Button:"Button"},"@/features/schedule/visit-calendar":{VisitCalendar:"Calendar"},"@/lib/auth/server":{getIdentity:async()=>({state:"authenticated",profile:{must_change_password:false,user:{id:actor,role:"agent"}}})}};const Layout=loadServer("src/app/(workspace)/visits/layout.tsx",{modules}).default;const tree=await Layout({children:"Route content"});assert.equal(find(tree,"Calendar").length,1);assert.equal(find(tree,"Calendar")[0].props.actorId,actor);assert.equal(find(tree,"Calendar")[0].props.administrator,false);
 const paths=[],identity={state:"authenticated",profile:{user:{id:actor}}};const pageModules={...modules,"@/features/auth/auth-frame":{AuthUnavailable:"Unavailable"},"@/features/schedule/visit-create":{VisitCreate:"Create"},"@/features/schedule/visit-route-drawer":{VisitRouteDrawer:"Drawer"},"@/features/schedule/contracts":contracts,"@/lib/auth/server":{requireIdentity:async path=>{paths.push(path);return identity;}}};const List=loadServer("src/app/(workspace)/visits/page.tsx",{modules:pageModules}).default,Create=loadServer("src/app/(workspace)/visits/new/page.tsx",{modules:pageModules}).default;assert.equal(await List(),null);const contactId=randomUUID(),valid=await Create({searchParams:Promise.resolve({contact_id:contactId,date:"2026-10-20"})});assert.equal(valid.props.contactId,contactId);assert.equal(valid.props.date,"2026-10-20");assert.equal(find(valid,"Calendar").length,0);const invalid=await Create({searchParams:Promise.resolve({date:"2026-02-31",user_id:randomUUID()})});assert.equal(find(invalid,"Create").length,0);assert.equal(find(invalid,"Drawer").length,1);const detailId=randomUUID(),Detail=loadServer("src/app/(workspace)/visits/[id]/page.tsx",{modules:{...pageModules,"next/navigation":{notFound(){throw new Error("NOT_FOUND");}},"@/features/schedule/visit-record":{VisitRecord:"Record"}}}).default;const details=await Detail({params:Promise.resolve({id:detailId})});assert.equal(details.props.id,detailId);assert.equal(find(details,"Calendar").length,0);await assert.rejects(Detail({params:Promise.resolve({id:"invalid"})}),/NOT_FOUND/);assert.deepEqual(paths,["/visits","/visits/new","/visits/new","/visits/"+detailId]);
 const Anonymous=loadServer("src/app/(workspace)/visits/layout.tsx",{modules:{...modules,"@/lib/auth/server":{getIdentity:async()=>({state:"anonymous"})}}}).default;assert.equal(await Anonymous({children:"Protected page"}),"Protected page");const Password=loadServer("src/app/(workspace)/visits/layout.tsx",{modules:{...modules,"@/lib/auth/server":{getIdentity:async()=>({state:"authenticated",profile:{must_change_password:true}})}}}).default;assert.equal(await Password({children:"Password gate"}),"Password gate");
});

test("Closing a routed visit replaces only the in-app route and hands focus to the retained calendar heading",()=>{
 const h=harness(),navigated=[],heading={focus(){}};const {VisitRouteDrawer}=loadServer("src/features/schedule/visit-route-drawer.tsx",{modules:{react:{...h.react,useLayoutEffect:callback=>h.effects.push(callback)},"react/jsx-runtime":runtime,"next/navigation":{useRouter:()=>({replace:(...args)=>navigated.push(args)})},"@/components/shared/record-drawer":{RecordDrawer:"Drawer"}},globals:{HTMLElement:class {},document:{querySelector:()=>({querySelector:()=>heading})}}});let closed=0;const tree=h.render(()=>VisitRouteDrawer({title:"Synthetic visit",description:"Synthetic description",children:close=>({type:"Body",props:{close}})}));assert.equal(tree.props.initialOpen,true);assert.equal(tree.props.hideTrigger,true);assert.equal(navigated.length,0);tree.props.children(()=>closed++).props.close();assert.equal(closed,1);h.effects[0]();tree.props.onClosed();assert.equal(tree.props.fallbackFocus.current,heading);assert.deepEqual(plain(navigated),[["/visits",{scroll:false}]]);
});


test("Visit slot presentation uses the server’s capacity and policy without inventing workday defaults",()=>{
 const {VisitSlotRules}=loadServer("src/features/schedule/visit-slot-preview.tsx",{modules:{"react/jsx-runtime":realRuntime,"@/components/icons":{ChevronDownIcon:()=>createElement("svg")},"@/components/ui/button":{Button:({children,disabled})=>createElement("button",{type:"button",disabled},children)},"@/features/contacts/record-states":{RecordError:()=>createElement("p",{role:"alert"},"Synthetic error")},"@/lib/api/client":{ApiError},"./time":{localLabel:value=>value}}});const html=renderToStaticMarkup(createElement(VisitSlotRules,{policy:{...policy,company_car_capacity_per_hour:11,working_windows:[],lunch_breaks:[]},retry(){}}));assert.equal(html.includes("11 visite(s)"),true);assert.equal(html.includes("non configurées"),true);assert.equal(html.includes("aucune"),true);assert.equal(html.includes("<button"),false);
});

test("Changing the contact or cancelling an edited booking stays behind the shared discard boundary",()=>{
 const h=harness();let changed=0,cancelled=0;const controller=formModule(h,async()=>{});const tree=h.render(()=>controller.VisitForm({actorId:actor,contactId:randomUUID(),contactName:"Synthetic contact",initialDate:"2026-10-20",saved(){},changeContact(){changed++;},cancel(){cancelled++;}}));find(tree,"Button").find(node=>node.props.children==="Changer").props.onClick();find(tree,"Button").find(node=>node.props.action==="cancel").props.onClick();assert.equal(changed,0);assert.equal(cancelled,0);assert.equal(controller.guarded.length,2);controller.guarded[0]();controller.guarded[1]();assert.equal(changed,1);assert.equal(cancelled,1);
});


test("Rescheduling a legacy draft submits directly to the authoritative endpoint", async () => {
 const h=harness(),original=visit({status:"draft"}),calls=[],reads=[];
 const controller=formModule(h,async(...args)=>{calls.push(args);return{id:original.id,version:9};},async path=>{reads.push(path);throw Error("Unexpected preview");});
 const props={actorId:actor,contactId:original.contact_id,contactName:original.contact_name,value:original,saved(){}};
 const tree=h.render(()=>controller.VisitForm(props));
 assert.equal(find(tree,"Button").find(n=>n.props.type==="submit").props.disabled,false);
 await submit(tree);
 assert.equal(calls.length,1);assert.equal(calls[0][1].expected_version,8);
 assert.equal(calls[0][0],"/api/v1/visits/"+original.id+"/reschedule");assert.deepEqual(reads,[]);
});
