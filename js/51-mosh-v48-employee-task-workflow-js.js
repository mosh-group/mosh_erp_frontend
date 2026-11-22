/* Existing employee overlay: one execution panel, backed by the receipt inbox. */
(function(){
'use strict';
if(window.MoshEmployeeTaskWorkflow48)return;
let rendering=false,lastSignature='',queued=0;
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(force=false){
 if(rendering)return false;
 const api=window.MoshTaskInbox49,o=document.getElementById('emp47TaskOverlay'),stage=document.getElementById('emp47TaskStage');
 if(!api||!o?.classList.contains('show')||!stage)return false;
 const info=window.MoshEmployeeTaskOverlay47?.current?.(),t=(state.salesTasks||[]).find(x=>String(x.id)===String(info?.id));if(!t)return false;
 // A child can be inspected inside the parent's overlay. Never execute the parent from that screen.
 const displayed=stage.querySelector('[id^="taskEditTitle_"]')?.id.slice('taskEditTitle_'.length);
 if(displayed!==String(t.id)){stage.querySelector('.emp48-workflow')?.remove();lastSignature='';return false;}
 const signature=JSON.stringify([t.id,t._version,t.status,t.employeeState,t.returnedForRevision,t.assignee,t.workTiming?.activeStartedAt,t.workChat?.at(-1)?.id,api.isBusy(t.id),api.error(t.id),window.MoshAuth37?.canModule?.(info.app,'status')]);
 if(!force&&signature===lastSignature&&stage.querySelector('.emp48-workflow'))return true;
 rendering=true;
 try{
  const timeMissing=t.employeeState==='working'&&!MoshWorkdayModel50.taskTiming(t,window.MoshApi?.serverNow?.()||Date.now()).valid;
  const old=stage.querySelector('.emp48-workflow'),expanded=old?.querySelector('.mr49-history')?.open;
  const box=document.createElement('section');box.className='emp48-workflow';box.dataset.taskId=String(t.id);
  box.innerHTML='<div class="emp48-workflow-head"><div class="emp48-workflow-title"><b>تنفيذ المهمة</b><small>استلم المهمة أولاً، ثم ابدأ التنفيذ عندما تصبح جاهزاً.</small></div><span class="emp48-state">'+esc(api.model.label(t))+'</span></div><div class="emp48-actions">'+api.actionHtml(t)+'</div>'+(timeMissing?'<p class="wd53-overlay-time-warning" role="status">توقيت المهمة بحاجة إلى مراجعة من الخادم؛ لم نغيّر أوقات التنفيذ السابقة.</p>':'')+api.cyclePanel(t);
  if(old)old.replaceWith(box);else{const note=stage.querySelector('.emp47-readonly-note');if(note)note.after(box);else stage.prepend(box);}
  if(expanded&&box.querySelector('.mr49-history'))box.querySelector('.mr49-history').open=true;
  lastSignature=signature;
 }finally{rendering=false;}
 return true;
}
function act(kind){const id=window.MoshEmployeeTaskOverlay47?.current?.()?.id,displayed=document.querySelector('#emp47TaskStage [id^="taskEditTitle_"]')?.id.slice('taskEditTitle_'.length);return id&&String(id)===displayed?window.MoshTaskInbox49?.perform?.(kind,id):Promise.resolve(false);}
function refresh(){lastSignature='';return render(true);}
// Capture just these buttons; permission and ownership are checked again at commit time.
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-emp48-action]');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();act(b.dataset.emp48Action);},true);
const observer=new MutationObserver(()=>{if(rendering)return;clearTimeout(queued);queued=setTimeout(()=>render(false),40);});
observer.observe(document.body,{childList:true,subtree:true});
setInterval(()=>render(false),700);
window.MoshEmployeeTaskWorkflow48={version:'49.0',render,act,refresh};
})();
