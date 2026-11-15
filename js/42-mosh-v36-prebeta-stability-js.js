(function(){
 'use strict';
 if(window.MoshPreBeta36)return;
 const VERSION='36.0';
 const prevGo=window.goApp;
 const prevDist=window.openProductiveDistributionPage;
 const prevRun=window.openProductiveRunningTasksPage;
 function marketingTabs(mode){
  try{
   const tabs=document.getElementById('m15Tabs_marketing');
   if(tabs){
    const d=tabs.querySelector('button[data-mode="distribution"]');
    const r=tabs.querySelector('button[data-mode="running"]');
    if(d)d.classList.toggle('active',mode==='distribution');
    if(r)r.classList.toggle('active',mode==='running');
   }
   document.getElementById('marketingDistributionTab')?.classList.toggle('active',mode==='distribution');
   document.getElementById('marketingRunningTab')?.classList.toggle('active',mode==='running');
  }catch(e){console.warn('v36 marketing tab sync',e)}
 }
 function openMarketingDashboard(){
  let result;
  try{
   // The primary Marketing dashboard is the task distribution board, not the customer file.
   // The client/customer dashboard remains a separate menu action in this release.
   if(typeof prevDist==='function') result=prevDist.call(window,'marketing');
  }catch(e){console.error('Marketing dashboard open failed',e);throw e}
  marketingTabs('distribution');
  try{window.MoshManagerInline32E?.install?.()}catch(e){}
  return result;
 }
 function syncManagerTabs(){
  try{window.MoshManagerInline32E?.install?.();window.MoshManagerInline32E?.syncBadges?.()}catch(e){console.warn('v36 manager tab sync',e)}
 }
 if(typeof prevDist==='function')window.openProductiveDistributionPage=function(key){
  if(key==='marketing')return openMarketingDashboard();
  const r=prevDist.apply(this,arguments);syncManagerTabs();return r;
 };
 if(typeof prevRun==='function')window.openProductiveRunningTasksPage=function(key){
  const r=prevRun.apply(this,arguments);
  if(key==='marketing')marketingTabs('running');
  syncManagerTabs();return r;
 };
 if(typeof prevGo==='function')window.goApp=function(app,link,addHistory=true){
  const r=prevGo.apply(this,arguments);
  // The core route opens the current Marketing dashboard once.
  // Do not re-enter it here and discard the view that was just prepared.
  syncManagerTabs();
  // Some departmental shells (especially warehouses) are created during navigation.
  // Run one immediate post-layout sync so the third "Manager Approval" action never waits for the observer timer.
  setTimeout(syncManagerTabs,0);
  return r;
 };
 // Keep internal Marketing task shortcuts visually in sync with the same top bar.
 try{
  if(window.MoshMarketingV33&&typeof MoshMarketingV33.openRunning==='function'&&!MoshMarketingV33.openRunning.__v36){
   const old=MoshMarketingV33.openRunning.bind(MoshMarketingV33);
   const f=function(){const r=old(...arguments);marketingTabs('running');syncManagerTabs();return r};f.__v36=true;MoshMarketingV33.openRunning=f;
  }
 }catch(e){}
 document.addEventListener('click',function(e){
  if(e.target.closest('#m15Tabs_marketing button[data-mode="distribution"]'))setTimeout(()=>marketingTabs('distribution'),0);
  else if(e.target.closest('#m15Tabs_marketing button[data-mode="running"]'))setTimeout(()=>marketingTabs('running'),0);
 },true);
 function health(){
  const m=document.getElementById('marketingExecV33');
  return {version:VERSION,marketingDashboardReady:!!(window.MoshMarketingV33&&m),marketingDashboardVisible:!!m?.classList.contains('mk33-show'),marketingTabActive:!!document.querySelector('#m15Tabs_marketing button[data-mode="distribution"].active'),managerTabs:(window.MoshManagerInline32E?.departments||[]).filter(k=>document.getElementById('mgr32eApproval_'+k)).length};
 }
 window.MoshPreBeta36={version:VERSION,openMarketingDashboard,syncManagerTabs,health};
 syncManagerTabs();
 if(document.getElementById('marketingApp')?.classList.contains('active'))openMarketingDashboard();
})();
