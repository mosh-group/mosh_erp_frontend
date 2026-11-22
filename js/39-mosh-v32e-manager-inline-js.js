(function(){
 'use strict';
 if(window.MoshManagerInline32E)return;
 const DEPTS=[
  {key:'it',label:'تكنولوجيا المعلومات'},
  {key:'sales',label:'المبيعات'},
  {key:'admin',label:'الإدارة'},
  {key:'hr',label:'الموارد البشرية'},
  {key:'design',label:'التصميم'},
  {key:'photo',label:'التصوير'},
  {key:'editing',label:'المونتاج'},
  {key:'marketing',label:'التسويق'},
 {key:'social',label:'السوشال ميديا'},
  {key:'purchases',label:'المشتريات'},
  {key:'promotion',label:'الترويج'},
  {key:'logistics',label:'اللوجستيات'},
  {key:'warehouses',label:'المستودعات العامة'},
  {key:'accounting',label:'المحاسبة'},
  {key:'platform',label:'MOSH MEDIA'}
 ];
 let timer=0,lock=false;
 function legacyBadge(key){return document.querySelector('#mgr28Tab_'+key+' .mgr28-badge')}
 function countFor(d){
  try{
   const legacy=legacyBadge(d.key);
   if(legacy&&!legacy.hidden){const n=Number((legacy.textContent||'').trim());if(Number.isFinite(n))return n;}
   if(window.MoshManagerApprovals28?.countFor)return Number(MoshManagerApprovals28.countFor(d.label))||0;
  }catch(e){}
  return 0;
 }
 function makeButton(d){
  const b=document.createElement('button');
  b.type='button';b.id='mgr32eApproval_'+d.key;b.className='mgr32e-approval-proxy';
  b.innerHTML='<span>اعتماد المدير</span><span class="mgr28-badge" hidden>0</span>';
  b.setAttribute('aria-label','اعتماد المدير');
  b.addEventListener('click',function(e){e.preventDefault();try{MoshManagerApprovals28.open(d.key)}catch(err){console.error('Manager approval open failed',d.key,err)}});
  return b;
 }
 function hideLegacy(d){
  const old=document.getElementById('mgr28Tab_'+d.key);
  if(!old)return;
  old.style.setProperty('display','none','important');
  const wrap=old.parentElement;if(wrap?.classList?.contains('menu'))wrap.style.setProperty('display','none','important');
 }
 function syncOne(d){
  hideLegacy(d);
  const tabs=document.getElementById('m15Tabs_'+d.key);if(!tabs)return false;
  let b=document.getElementById('mgr32eApproval_'+d.key);if(!b)b=makeButton(d);
  const sectionLabel=tabs.querySelector(':scope > span');
  if(b.parentElement!==tabs)tabs.insertBefore(b,sectionLabel||null);
  else if(sectionLabel&&b.nextElementSibling!==sectionLabel)tabs.insertBefore(b,sectionLabel);
  return true;
 }
 function syncBadges(){
  DEPTS.forEach(d=>{
   const b=document.getElementById('mgr32eApproval_'+d.key);if(!b)return;
   const badge=b.querySelector('.mgr28-badge'),n=countFor(d);
   if(badge){if(badge.textContent!==String(n))badge.textContent=String(n);badge.hidden=!n;}
   b.classList.toggle('has-pending',n>0);
  });
 }
 function install(){
  if(lock)return;lock=true;
  try{DEPTS.forEach(syncOne);syncBadges();}finally{lock=false;}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(install,70)}
 window.MoshManagerInline32E={install,syncBadges,departments:DEPTS.map(x=>x.key),version:'32E'};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{install();setTimeout(install,250);setTimeout(install,1200);},{once:true});
 else {install();setTimeout(install,250);setTimeout(install,1200);}
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
 setInterval(syncBadges,1500);
})();
