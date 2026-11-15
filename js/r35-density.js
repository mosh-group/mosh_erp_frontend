/* R35 base density adapter. Original inputs/actions are retained. */
(function(){
'use strict';
window.MOSH_UI_RELEASE='R40';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let frame=0,mode='after';
function countRows(){
 const rows=$$('#h13EmployeeRows tbody tr');
 const label=$('#hrProContent .mv-list-count');
 if(label){const count=String(rows.filter(r=>r.querySelector('[data-h13="profile"]')&&!r.hidden&&r.style.display!=='none').length);const n=$('strong',label);if(n.textContent!==count)n.textContent=count;}
}
function enhanceHR(){
 const root=$('#hrProContent');if(!root||!root.closest('.view.active'))return;
 const head=$('.h13-page-head',root);
 if(head){
  const add=$('[data-h13="new-employee"]',head),zk=$('#moshZktecoAdminButton');
  if(add&&!$('.mv-page-actions',head)){
   const box=document.createElement('div');box.className='mv-page-actions';
   head.append(box);box.append(add);if(zk)box.append(zk);
  }else if(zk&&zk.closest('[data-h13="new-employee"]'))$('.mv-page-actions',head)?.append(zk);
 }
 const fold=$('#h13EmployeesBody>.c19-filters');
 if(fold&&mode==='after'&&!fold.open)fold.open=true;
 const filters=$('#h13EmployeesBody .h13-filters');
 if(filters&&!$('.mv-list-count',filters)){
  const count=document.createElement('div');count.className='mv-list-count';
  count.innerHTML='<strong>0</strong><span>موظف في القائمة</span>';filters.append(count);
 }
 const table=$('#h13EmployeeRows table');
 if(table){
  const tr=$('thead tr',table);if(tr&&!$('.mv-serial',tr)){const th=document.createElement('th');th.className='mv-serial';th.textContent='م';th.scope='col';tr.prepend(th);}
  $$('tbody tr',table).filter(row=>row.querySelector('[data-h13="profile"]')).forEach((row,i)=>{
   if(!$('.mv-serial',row)){const td=document.createElement('td');td.className='mv-serial';row.prepend(td);}
   const n=$('.mv-serial',row);if(n.textContent!==String(i+1))n.textContent=String(i+1);
   const person=row.cells[1];if(person&&!$('.mv-person',person)){
    const b=$('b',person),small=$('small',person);
    if(b&&small){const group=document.createElement('div');group.className='mv-person';group.append(b,small);person.append(group);}
   }
  });
  const actions=$('thead th:last-child',table);if(actions&&!actions.textContent.trim())actions.textContent='الإجراءات';
 }
 countRows();
}
function enhanceTask(){
 const info=document.querySelector('.pv-task-info');if(!info)return;
 const grid=info.querySelector('.field-grid'), inner=info.querySelector('.pv-task-inner');
 if(!grid||!inner||grid.querySelector('.mv-task-priority'))return;
 const priority=inner.querySelector(':scope>.r19-task-status-panel');
 if(priority){
  const field=document.createElement('div');field.className='field mv-task-priority';
  const label=document.createElement('label');label.textContent='الأولوية';
  field.append(label,priority);grid.append(field);
 }
}
function decorate(){
 frame=0;enhanceHR();enhanceTask();
 const app=$('#appShell');
 if(app){const collapsed=app.classList.contains('sidebar-collapsed')||document.body.classList.contains('sidebar-collapsed');app.classList.toggle('mv-sidebar-collapsed',collapsed);}
 $$('#o18QuickNew button').forEach(b=>{if(!b.title){b.title=b.textContent.trim();b.setAttribute('aria-label',b.title);}});
}
function schedule(){if(!frame)frame=requestAnimationFrame(decorate);}

function start(){
 if(window.MoshDensity35)return;
 document.documentElement.classList.add('mosh-meta');
 const toolbar=document.querySelector('#appShell .topbar');
 if(toolbar&&!toolbar.querySelector('.mv-mobile-nav')){const nav=document.createElement('button');nav.type='button';nav.className='btn mv-mobile-nav r35-ui-navigation';nav.textContent='☰ الأقسام';nav.setAttribute('aria-expanded','false');nav.onclick=()=>{const open=document.documentElement.classList.toggle('mv-mobile-sidebar');nav.setAttribute('aria-expanded',String(open));};toolbar.prepend(nav);
 document.addEventListener('click',e=>{if(e.target.closest('#appSidebar .nav a')){document.documentElement.classList.remove('mv-mobile-sidebar');nav.setAttribute('aria-expanded','false');}},true);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.documentElement.classList.contains('mv-mobile-sidebar')){document.documentElement.classList.remove('mv-mobile-sidebar');nav.setAttribute('aria-expanded','false');}});
 }
 const app=$('#appShell');if(!app)return;
 const observer=new MutationObserver(list=>{if(list.some(m=>m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1)))schedule();});
 observer.observe(app,{childList:true,subtree:true});
 document.addEventListener('mosh:section-enter',schedule);document.addEventListener('mosh:refreshed',schedule);
 document.addEventListener('input',schedule,true);document.addEventListener('change',schedule,true);
 window.MoshDensity35={decorate,schedule};schedule();
}
document.addEventListener('mosh:r19-ready',start,{once:true});
if(window.MoshApi?.user&&window.MoshAuth37)start();
})();
