import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createElement, Fragment } from "react";
import * as react from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadServer } from "./load-server.mjs";

const vocabulary=loadServer("src/features/contacts/qualification-contracts.ts"),contacts=loadServer("src/features/contacts/contracts.ts",{modules:{"./qualification-contracts":vocabulary}});
const schedule=loadServer("src/features/schedule/contracts.ts",{modules:{"@/features/contacts/contracts":contacts}}),users=loadServer("src/features/users/contracts.ts");
const icons={SettingsIcon:"svg",ContactsIcon:"svg",CalendarIcon:"svg",ForwardIcon:"svg"};
const header=loadServer("src/components/shared/page-header.tsx",{modules:{"react/jsx-runtime":runtime}});

test("Selected settings navigation has one current section and preserves concrete Next routes",()=>{
 const {SettingsWorkspace}=loadServer("src/features/users/settings-workspace.tsx",{modules:{react,"react/jsx-runtime":runtime,"next/link":{default:"a"},"@/components/icons":icons,"@/components/ui/button":{Button:({children})=>createElement(Fragment,null,children)},"@/components/shared/page-header":header}});
 const html=renderToStaticMarkup(createElement(SettingsWorkspace,{active:"users",route:"/settings/users"},"Content"));
 assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
 assert.match(html,/href="\/settings\/users" aria-current="page"/);
 for(const path of ["/settings","/settings/users","/settings/working-hours"])assert.ok(html.includes(`href="${path}"`));
 assert.equal((html.match(/<h1/g)||[]).length,1);assert.ok(html.includes('data-route="/settings/users"'));
});

function overview(read){return loadServer("src/features/users/settings-overview.tsx",{modules:{react,"react/jsx-runtime":runtime,"next/link":{default:"a"},"@/components/icons":icons,"@/components/ui/button":{Button:({children})=>createElement(Fragment,null,children)},"@/features/contacts/record-states":{RecordError:({error})=>createElement("p",{role:"alert"},error.code)},"@/features/contacts/use-query":{useQuery:read},"@/features/schedule/contracts":schedule,"./contracts":users}}).SettingsOverview;}
const staff=users.usersSchema.parse({items:Array.from({length:3},(_,index)=>({id:randomUUID(),display_name:`Synthetic colleague ${index}`,email:`synthetic${index}@example.invalid`,role:index===0?"administrator":"agent",state:"active",version:1,must_change_password:false,temporary_expires_at:null,handoff_confirmed_at:null})),total:17,page:1,page_size:3,has_previous:false,has_next:true});
const policy=schedule.policySchema.parse({version:9,time_zone:"Africa/Casablanca",company_car_capacity_per_hour:7,working_windows:[{weekday:1,start_local:"09:00",end_local:"12:00"},{weekday:1,start_local:"14:00",end_local:"18:00"},{weekday:4,start_local:"09:00",end_local:"18:00"}],lunch_breaks:[]});

test("Settings overview uses total accounts and distinct server weekdays without illustrative values",()=>{
 const paths=[];const View=overview(path=>{paths.push(path);return{value:path.includes("/users?")?staff:policy};});const html=renderToStaticMarkup(createElement(View));
 assert.deepEqual(paths,["/api/v1/users?page=1&page_size=3","/api/v1/visit-schedule/policy"]);
 assert.match(html,/<strong>17<\/strong><span>comptes/);assert.match(html,/<strong>2<\/strong><span>jours ouverts/);
 assert.match(html,/7 \/ heure/);assert.ok(html.includes("Africa/Casablanca"));
 assert.equal((html.match(/data-open="true"/g)||[]).length,2);
 for(const user of staff.items)assert.ok(html.includes(user.display_name));
 assert.ok(!html.includes("membres actifs"));
});

test("Settings authority denial hides both summaries; transient failures keep independent recovery",()=>{
 for(const code of ["FORBIDDEN","UNAUTHENTICATED","PASSWORD_CHANGE_REQUIRED","NOT_FOUND"]){
  const View=overview(path=>path.includes("/users?")?{value:staff}:{value:policy,error:{code}});
  const html=renderToStaticMarkup(createElement(View));assert.ok(html.includes(code));assert.ok(!html.includes("Synthetic colleague"));assert.ok(!html.includes("/settings/users"));
 }
 const View=overview(path=>path.includes("/users?")?{value:staff,error:{code:"DEPENDENCY_UNAVAILABLE"}}:{value:policy});
 const html=renderToStaticMarkup(createElement(View));assert.ok(html.includes("DEPENDENCY_UNAVAILABLE"));assert.ok(!html.includes("Synthetic colleague"));assert.ok(html.includes("7 / heure"));
});

test("Settings route wrappers retain exact administrator gates before rendering sections",async()=>{
 for(const [file,path] of [["page.tsx","/settings"],["working-hours/page.tsx","/settings/working-hours"],["users/new/page.tsx","/settings/users/new"]]){
  const destinations=[];let allowed=false;const {default:Page}=loadServer(`src/app/(workspace)/settings/${file}`,{modules:{"react/jsx-runtime":runtime,"@/features/users/access":{adminAccess:async destination=>{destinations.push(destination);return allowed?{actorId:"synthetic-actor",denied:null}:{denied:"DENIED"};}},"@/features/users/settings-workspace":{SettingsWorkspace:"Workspace"},"@/features/users/settings-overview":{SettingsOverview:"Overview"},"@/features/schedule/working-hours":{WorkingHours:"Hours"},"@/features/users/user-form":{UserForm:"UserForm"}}});
  assert.equal(await Page(),"DENIED");allowed=true;const rendered=await Page();if(path.endsWith("/new"))assert.equal(rendered.props.actorId,"synthetic-actor");else assert.equal(rendered.props.route,path);assert.deepEqual(destinations,[path,path]);
 }
});
