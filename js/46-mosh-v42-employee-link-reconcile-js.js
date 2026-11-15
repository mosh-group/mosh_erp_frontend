(function(){
 'use strict';
 function norm(v){return String(v==null?'':v).trim().toLowerCase().replace(/\s+/g,' ')}
 function arr(v){return Array.isArray(v)?v:[]}
 function reconcile(){
  try{
   const au=window.MoshAuth37?.current?.(); if(!au)return;
   const staff=arr(typeof state!=='undefined'?state.staffProfiles:[]);
   let p=null;
   const ids=[au.employeeId,(typeof currentUser!=='undefined'?currentUser?.employeeId:''),(typeof currentUser!=='undefined'?currentUser?.staffId:'')].filter(Boolean).map(String);
   for(const id of ids){p=staff.find(x=>String(x?.id)===id||String(x?.employeeNo||'')===id);if(p)break;}
   if(!p){const names=[au.name,au.username,(typeof currentUser!=='undefined'?currentUser?.name:''),(typeof currentUser!=='undefined'?currentUser?.username:'')].filter(Boolean).map(norm);for(const n of names){p=staff.find(x=>norm(x?.name)===n||norm(x?.username)===n||norm(x?.email)===n);if(p)break;}}
   if(p&&typeof currentUser!=='undefined'){currentUser.employeeId=String(p.id||'');currentUser.staffId=String(p.id||'');}
   if(window.MoshEmployeeTasks41?.reconcile)window.MoshEmployeeTasks41.reconcile();
  }catch(e){console.warn('v42 employee link reconcile',e)}
 }
 setTimeout(reconcile,50);setTimeout(reconcile,700);
 window.addEventListener('storage',reconcile);
})();
