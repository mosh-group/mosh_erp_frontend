(function(){
'use strict';
if(window.MoshRequestRouting28C)return;
const arr=v=>Array.isArray(v)?v:[];
const clean=v=>String(v==null?'':v).trim();
const same=(a,b)=>clean(a).localeCompare(clean(b),'ar',{sensitivity:'base'})===0;
function currentNames(){const out=[];try{out.push(currentUserDisplayName())}catch(e){}try{out.push(currentUser?.username,currentUser?.email)}catch(e){}return out.map(clean).filter(Boolean);}
function robustProfile(){
 try{const old=window.__moshOldHrProfile28C;if(typeof old==='function'){const p=old();if(p)return p;}}catch(e){}
 const names=currentNames();return arr(state.staffProfiles).find(p=>p&&names.some(n=>same(p.name,n)||same(p.username,n)||same(p.email,n)))||null;
}
if(typeof window.hrProCurrentProfile==='function'&&!window.__moshOldHrProfile28C){window.__moshOldHrProfile28C=window.hrProCurrentProfile;window.hrProCurrentProfile=robustProfile;}
function profileForRequest(r){
 let p=null;if(clean(r?.employeeId))p=arr(state.staffProfiles).find(x=>String(x?.id)===String(r.employeeId))||null;
 if(!p&&clean(r?.employeeName))p=arr(state.staffProfiles).find(x=>same(x?.name,r.employeeName)||same(x?.username,r.employeeName)||same(x?.email,r.employeeName))||null;
 return p;
}
function deptManager(dept){try{return typeof getDepartmentManager==='function'?getDepartmentManager(dept):null}catch(e){return null}}
function requestCfg(type){try{return typeof HR_PRO_REQUESTS==='object'?HR_PRO_REQUESTS[type]:null}catch(e){return null}}
function repairOne(r){
 if(!r||typeof r!=='object')return false;let changed=false;const p=profileForRequest(r);
 if(p){
   if(!clean(r.employeeId)&&p.id!=null){r.employeeId=String(p.id);changed=true;}
   if((!clean(r.employeeName)||same(r.employeeName,p.username)||same(r.employeeName,p.email))&&clean(p.name)){r.employeeName=p.name;changed=true;}
   if(!clean(r.department)&&clean(p.department)){r.department=p.department;changed=true;}
   if(!clean(r.manager)){const dm=clean(p.directManager)?p.directManager:clean(deptManager(p.department)?.name);if(dm){r.manager=dm;changed=true;}}
 }
 const cfg=requestCfg(r.type),cfgRoute=arr(cfg?.route);r.route=arr(r.route);
 if(r.status==='pending'&&cfgRoute.includes('المدير المباشر')&&!r.route.includes('المدير المباشر')&&(Number(r.stageIndex)||0)===0&&!r.managerDecision){r.route=[...cfgRoute];changed=true;}
 if(r.status==='pending'&&r.route.includes('المدير المباشر')&&!clean(r.manager)){
   const dm=clean(p?.directManager)||clean(deptManager(r.department)?.name);if(dm){r.manager=dm;changed=true;}
 }
 if(r.route.includes('المدير المباشر')){
   if(r.managerDecision==null){r.managerDecision='';changed=true;}if(r.managerDecisionBy==null){r.managerDecisionBy='';changed=true;}if(r.managerDecisionAt==null){r.managerDecisionAt='';changed=true;}if(r.managerNote==null){r.managerNote='';changed=true;}
 }
 return changed;
}
function repairAll(doSave=true){let changed=false;arr(state.hrProRequests).forEach(r=>{if(repairOne(r))changed=true;});if(changed&&doSave){try{save()}catch(e){console.error('Request routing repair save failed',e);}}try{MoshManagerApprovals28?.refresh()}catch(e){}try{MoshRequestResults28B?.refresh()}catch(e){}return changed;}
const previousSubmit=window.hrProSubmitRequest;
if(typeof previousSubmit==='function')window.hrProSubmitRequest=function(){const result=previousSubmit.apply(this,arguments);setTimeout(()=>repairAll(true),0);return result;};
window.MoshRequestRouting28C={repair:()=>repairAll(true),version:'28C'};
function init(){repairAll(true);setTimeout(()=>repairAll(true),600);setTimeout(()=>repairAll(true),1800);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
setInterval(()=>repairAll(true),5000);
})();
