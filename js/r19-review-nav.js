/* MOSH R23 SAFE — manager tools without moving original controls or observing the whole DOM. */
(function(){
 'use strict';
 if(window.MoshReviewNav23)return;
 const DEPTS=['it','sales','admin','hr','design','photo','editing','marketing','social','purchases','promotion','logistics','warehouses','accounting'];
 const $=id=>document.getElementById(id); let queued=false;
 const P=()=>window.MoshUI19||window.MoshPreview19;
 function managerContext(){const r=P()?.role?.();return r==='manager'||r==='admin'}
 function sourceButton(node){return node?.matches?.('button')?node:node?.querySelector?.('button')||null}
 function execSource(k){
  const view=$(k+'App');if(!view)return null;
  return Array.from(view.querySelectorAll('.menu-strip button[onclick]')).find(b=>{
   const c=b.getAttribute('onclick')||'';return c.includes("openDeptExecReportStep3('"+k+"'")||c.includes('openDeptExecReportStep3("'+k+'"');
  })||null;
 }
 function specs(k){
  const out=[];
  if(k==='design')out.push(['تقرير العمل',sourceButton($('designWorkReportTab'))]);
  out.push(['طلب خصم أو عقوبة',sourceButton($('r19HRNew-'+k))]);
  out.push(['متابعة الطلبات',sourceButton($('r19HRTrack-'+k))]);
  out.push(['تقرير حضور القسم',sourceButton($('r19HRAtt-'+k))]);
  out.push(['إرسال تقرير للمدير التنفيذي',execSource(k)]);
  if(window.MoshR29&&managerContext())out.push(['تقييمات وملفات فريقي',null,()=>window.MoshR29.openHR()]);
  if(window.MoshPurchasing24?.inboxState?.().visible)out.push([window.MoshPurchasing24.inboxState().label,null,()=>window.MoshPurchasing24.openQueue()]);
  return out.filter(([,s,action])=>!!s||!!action);
 }
 function ensureHost(k,bar){
  let host=$('r23ManagerTools_'+k);if(host)return host;
  host=document.createElement('div');host.id='r23ManagerTools_'+k;host.className='r23-manager-tools';
  host.innerHTML='<button type="button" class="r23-manager-tools-toggle" aria-haspopup="menu" aria-expanded="false">أدوات المدير <span aria-hidden="true">⌄</span></button><div class="r23-manager-tools-menu" role="menu" hidden></div>';
  const label=bar.querySelector(':scope > span');bar.insertBefore(host,label||null);
  host.querySelector('.r23-manager-tools-toggle').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const m=host.querySelector('.r23-manager-tools-menu'),open=m.hidden;closeAll(host);m.hidden=!open;host.querySelector('.r23-manager-tools-toggle').setAttribute('aria-expanded',String(open));});
  return host;
 }
 function closeAll(except){document.querySelectorAll('.r23-manager-tools').forEach(h=>{if(h===except)return;const m=h.querySelector('.r23-manager-tools-menu');if(m)m.hidden=true;h.querySelector('.r23-manager-tools-toggle')?.setAttribute('aria-expanded','false')})}
 function hideOriginal(src){const wrap=src?.closest?.('.r19-hr-nav-slot,.menu')||src;if(wrap)wrap.classList.add('r23-manager-source-hidden')}
 function syncOne(k){
  const bar=$('m15Tabs_'+k),view=$(k+'App');if(!bar||!view)return;
  const host=ensureHost(k,bar),menu=host.querySelector('.r23-manager-tools-menu'),list=specs(k);
  list.forEach(([,s])=>hideOriginal(s));
  menu.replaceChildren();
  list.forEach(([label,src,action])=>{const b=document.createElement('button');b.type='button';b.className='r23-manager-tool';b.role='menuitem';b.textContent=label;b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();menu.hidden=true;host.querySelector('.r23-manager-tools-toggle').setAttribute('aria-expanded','false');setTimeout(()=>action?action():src.click(),0)});menu.append(b)});
  const primary=[bar.querySelector(':scope > button[data-mode="distribution"]'),bar.querySelector(':scope > button[data-mode="running"]'),$('mgr32eApproval_'+k),host];
  primary.forEach((n,i)=>{if(n){n.classList.add('r23-manager-primary-item');n.style.order=String(i+1)}});const label=bar.querySelector(':scope > span');if(label)label.style.order='99';
  host.hidden=!managerContext()||!list.length;
  if(host.hidden){menu.hidden=true;host.querySelector('.r23-manager-tools-toggle').setAttribute('aria-expanded','false')}
 }
 function sync(){DEPTS.forEach(syncOne)}
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
 document.addEventListener('click',e=>{if(!e.target.closest?.('.r23-manager-tools'))closeAll();setTimeout(schedule,0)},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
 ['mosh:ui-ready','mosh:refreshed','mosh:r19-change','mosh:r30-inbox-ready'].forEach(t=>document.addEventListener(t,schedule));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{schedule();setTimeout(sync,300);setTimeout(sync,1200)},{once:true});else{schedule();setTimeout(sync,300);setTimeout(sync,1200)}
 window.MoshReviewNav23={version:'23-safe',sync,inspect(k='design'){const h=$('r23ManagerTools_'+k);return{hidden:h?.hidden??true,tools:Array.from(h?.querySelectorAll('.r23-manager-tool')||[]).map(x=>x.textContent.trim())}}};
 window.MoshReviewNav21=window.MoshReviewNav23;
})();
