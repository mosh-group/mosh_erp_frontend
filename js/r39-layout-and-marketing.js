/* MOSH R40 — preserve existing department workflows; repair Marketing landing and compact headers.
   Presentation layer only: does not change stored records or grant permissions. */
(function(){
 'use strict';
 if(window.MoshR39Layout)return;
 const $=(s,r=document)=>r?.querySelector(s),$$=(s,r=document)=>Array.from(r?.querySelectorAll(s)||[]);
 const DEPARTMENTS={sales:'المبيعات',admin:'الإدارة',hr:'الموارد البشرية',marketing:'التسويق',design:'التصميم',photo:'التصوير',editing:'المونتاج',social:'السوشال ميديا',promotion:'الترويج',purchases:'المشتريات',logistics:'اللوجستيات',accounting:'المحاسبة',it:'تكنولوجيا المعلومات',platform:'MOSH MEDIA'};
 let frame=0,observer=null,installed=false;
 function activeDepartment(){return $('.view.active')?.id.replace(/App$/,'')||'';}
 function compactHeaders(){
  for(const heading of $$('.db9-heading')){
   const board=heading.closest('.db9'),section=board?.dataset?.department;
   const title=$('h2',heading);if(!section||!title||!DEPARTMENTS[section])continue;
   if(!title.dataset.r39Title){title.textContent='قسم '+DEPARTMENTS[section];title.dataset.r39Title='1';}
   $('.db9-eyebrow',heading)?.remove();
   const help=$('details.r38-help',heading),meta=$('.db9-head-actions > small',heading);
   if(meta&&help&&meta.parentElement!==help){meta.classList.add('r39-meta');help.append(meta);}
   heading.classList.add('r39-heading');
  }
  // Readable section title, not two redundant heading blocks.
  for(const root of $$('.design-board-head')){
   if(root.dataset.r39Header)return;
   const title=$('h2',root);if(title){root.dataset.r39Header='1';root.classList.add('r39-simple-head');}
  }
 }
 function compactMarketingNav(){
  const app=$('#marketingApp');if(!app)return;
  app.classList.add('r39-marketing-nav');
  const top=$('#marketingDistributionTab',app);if(top&&top.dataset.r39Named!=='1'){
   for(const node of [...top.childNodes])if(node.nodeType===Node.TEXT_NODE){node.nodeValue='لوحة التحكم ';break;}
   top.dataset.r39Named='1';
  }
 }
 function ensureMarketingDashboard(){
  const app=$('#marketingApp');if(!app?.classList.contains('active'))return;
  if(!window.MoshAuth37?.canModule?.('marketing','view')||!window.MoshAuth37.canModule('marketing','dashboard'))return;
  app.classList.remove('ig28-open');
  $('#marketingExecV33')?.classList.remove('mk33-show');
  const content=$('#marketingAppContent');if(content)content.style.display='block';
  const workspace=$('#marketingTaskWorkspace');
  // A non-empty workspace may still contain the running list or a task detail.
  // Explicit dashboard navigation must redraw the board and reset its view mode.
  if(workspace&&typeof window.renderProductiveDistributionBoard==='function'){
   window.renderProductiveDistributionBoard('marketing');
  }
  compactMarketingNav();
 }
 // Primary Marketing entry means tasks / distribution. Customer list is a separate action in department menu.
 const oldGo=window.goApp;
 if(typeof oldGo==='function')window.goApp=function(app,...args){const result=oldGo.call(this,app,...args);if(app==='marketing')ensureMarketingDashboard();return result;};
 const oldDistribution=window.openProductiveDistributionPage;
 if(typeof oldDistribution==='function')window.openProductiveDistributionPage=function(section,...args){
  const result=oldDistribution.call(this,section,...args);
  if(section==='marketing')ensureMarketingDashboard();return result;
 };
 function render(){frame=0;if(!window.MoshApi?.user)return;compactMarketingNav();compactHeaders();}
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 function start(){if(installed||!$('#appShell'))return;installed=true;compactMarketingNav();observer=new MutationObserver(records=>{
  if(records.some(m=>m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1)))schedule();
 });observer.observe($('#appShell'),{subtree:true,childList:true});
 ['mosh:section-enter','mosh:refreshed','mosh:permissions-applied'].forEach(evt=>document.addEventListener(evt,schedule));
 if(activeDepartment()==='marketing')ensureMarketingDashboard();schedule();
 }
 window.MoshR39Layout={start,render,ensureMarketingDashboard,version:'R40'};
 document.addEventListener('mosh:r19-ready',start,{once:true});if(window.MoshApi?.user)start();
})();
