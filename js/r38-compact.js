/* MOSH R38 — additive UI-only enhancement. Does not persist or mutate business records. */
(function(){'use strict';
if(window.MoshCompact38)return;
const $=(s,r=document)=>r?.querySelector(s),$$=(s,r=document)=>Array.from(r?.querySelectorAll(s)||[]);
let frame=0,started=false;
function compactHeaders(){
 for(const head of $$('.design-board-head')){
  if(head.dataset.r38Help)continue;const text=$('.muted',head),title=$('h2',head);if(!text||!title)continue;
  const details=document.createElement('details');details.className='r38-help';details.innerHTML='<summary aria-label="عرض شرح الصفحة" title="عرض شرح الصفحة">ⓘ مساعدة</summary>';
  details.append(text);head.dataset.r38Help='1';title.insertAdjacentElement('afterend',details);
 }
 // Remove redundant explanation from overview, but leave filters and action buttons untouched.
 $$('.db9-note').forEach(note=>{if(note.dataset.r38Help)return;const d=document.createElement('details');d.className='r38-help';const summary=document.createElement('summary');summary.textContent='ⓘ شرح اللوحة';note.parentNode.insertBefore(d,note);d.append(summary,note);note.dataset.r38Help='1'});
}
const statsState=new Map();
function compactDepartmentStats(){
 for(const board of $$('.db9')){
  if(board.dataset.r38Stats==='1')continue;
  const kpi=$('.db9-kpis',board),strip=$('.db9-strip',board);
  if(!kpi||!strip)continue;
  const key=board.dataset.department||'department';
  const details=document.createElement('details');details.className='r38-task-insights r38-db9-insights';
  details.innerHTML='<summary>ملخص مؤشرات المهام وأحمال الفريق <span class="r38-chevron" aria-hidden="true">⌄</span></summary><div class="r38-insights-body"></div>';
  details.open=statsState.get(key)===true;
  details.addEventListener('toggle',()=>statsState.set(key,details.open));
  const body=$('.r38-insights-body',details);
  kpi.parentNode.insertBefore(details,kpi);body.append(kpi,strip);
  const team=$('.db9-team',board)?.closest('.db9-panel');if(team)body.append(team);
  board.dataset.r38Stats='1';
 }
 for(const heading of $$('.db9-heading')){
  if(heading.dataset.r38Help)continue;
  const intro=$('p',heading),title=$('h2',heading);
  if(!intro||!title)continue;
  const details=document.createElement('details');details.className='r38-help';
  const summary=document.createElement('summary');summary.textContent='ⓘ مساعدة';
  details.append(summary,intro);title.insertAdjacentElement('afterend',details);
  heading.dataset.r38Help='1';
 }
}
function compactActions(){
 for(const b of $$('[data-r24="refresh"],.db9 [data-action="refresh"]')){if(b.dataset.r38Compact)return;b.dataset.r38Compact='1';b.title='تحديث البيانات';b.setAttribute('aria-label','تحديث البيانات');b.textContent='↻';b.classList.add('r38-refresh');}
 const tools=$('#r23ManagerTools_design .r23-manager-tools-menu'),report=$('#designWorkReportTab');
 // Existing manager tools already includes "تقرير العمل". Do not duplicate or reroute its action.
 if(tools&&report&&tools.textContent.includes('تقرير العمل'))report.closest('.menu')?.classList.add('r23-manager-source-hidden');
}
function compactTaskModal(){
 const modal=$('#standaloneTaskModal');if(!modal)return;
 const notes=$('.r38-optional-notes',modal),textarea=$('#standaloneTaskNotes',modal);
 if(notes&&textarea&&!notes.dataset.r38Bound){notes.dataset.r38Bound='1';textarea.addEventListener('input',()=>{if(textarea.value.trim())notes.open=true});}
 // Retain the existing deadline component and the original audio/file controls.
}
function decorate(){frame=0;if(!window.MoshApi?.user)return;compactHeaders();compactDepartmentStats();compactActions();compactTaskModal();}
function schedule(){if(!frame)frame=requestAnimationFrame(decorate);}
function start(){if(started||!$('#appShell'))return;started=true;const observer=new MutationObserver(ms=>{if(ms.some(m=>m.type==='childList'&&Array.from(m.addedNodes).some(n=>n.nodeType===1)))schedule();});observer.observe($('#appShell'),{childList:true,subtree:true});for(const type of ['mosh:refreshed','mosh:section-enter','mosh:permissions-applied'])document.addEventListener(type,schedule);schedule();}
window.MoshCompact38={start,decorate,schedule};document.addEventListener('mosh:r19-ready',start,{once:true});if(window.MoshApi?.user)start();
})();
