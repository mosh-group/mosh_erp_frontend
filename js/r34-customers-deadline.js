(function(){'use strict';
const U=window.Mosh34,{E,$,$$,B}=U;
const stateNow=()=>{try{return state;}catch(_){return{};}},customer=id=>(stateNow().customers||[]).find(c=>String(c.id)===String(id));
function canArchive(){return !!(window.MoshApi?.user?.isRoot||window.MoshAuth37?.can?.('editCustomers'));}
function actions(c){return canArchive()?`<button type="button" class="mk33-btn" data-archive34="${E(c.id)}">${c.active===false?'إعادة تفعيل العميل':'أرشفة العميل'}</button>`:'';}
async function archive(id){const c=customer(id);if(!c||!canArchive())return;const arch=c.active!==false;
 U.form('r34ArchiveCustomer',arch?'أرشفة العميل':'إعادة تفعيل العميل',U.note(c.name+' — يبقى نفس الملف والمعرّف وكل المحادثات والمرفقات والمهام والفواتير. لا تُغلق المهام تلقائياً.')+U.area('سبب الإجراء','reason','','required minlength="3" maxlength="2000"'),async(fd,f,h,s)=>{
  if(!h.pending){await window.MoshApi.flush?.();U.guard(s);const current=await U.request('/customers/'+encodeURIComponent(id),{},s);
  if((current.active!==false)!==arch)throw new Error('تغيرت حالة العميل؛ حدّث القائمة قبل التنفيذ.');h.archiveBody={_version:current._version,archive:arch,reason:fd.get('reason')};}
  const doc=await U.commit(h,'/r29/customers/'+encodeURIComponent(id)+'/archive',h.archiveBody,'POST',s);U.accept('customers',doc,s);return doc;
 },()=>{window.MoshMarketingV33?.openDashboard();},arch?'أرشفة دون حذف':'إعادة تفعيل نفس الملف');
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-archive34]');if(!b)return;e.preventDefault();e.stopPropagation();void archive(b.dataset.archive34);},true);
window.MoshCustomer34={actions,archive};
const rules=new Map(),controls=new WeakMap();
function supported(input){return input&&input.type==='date'&&(['standaloneTaskDueDate','subTaskDueDate','taskDueDate'].includes(input.id)||input.id.startsWith('managerDueDate_')||input.id.startsWith('taskEditDueDate_'));}
function reset(id){rules.delete(id);const input=document.getElementById(id),c=input&&controls.get(input);if(c){c.ticket++;c.select.value='manual';c.custom.hidden=true;c.label.textContent='التاريخ اليدوي يبقى متاحاً. المدة بالأيام تستثني الجمعة فقط.';input.readOnly=false;}}
function ready(id){const r=rules.get(id);if(!r)return true;if(r.pending||r.error){alert(r.error||'جارٍ حساب الموعد من الخادم؛ أعد الحفظ بعد ظهور تاريخ التسليم.');return false;}return true;}
function ruleFor(id,prior=null){const r=rules.get(id);if(r)return !r.pending&&!r.error?r.rule:null;const input=document.getElementById(id);return prior&&input&&input.value===(prior.dueDate||'')?(prior.dueRule||null):null;}
async function choose(input,c){const mode=c.select.value,ticket=++c.ticket;if(mode==='manual'){reset(input.id);return;}c.custom.hidden=mode!=='custom';input.readOnly=true;let days=mode==='custom'?Number(c.custom.value):Number(mode);const monthly=mode==='month';
 if(!monthly&&(!Number.isInteger(days)||days<1||days>3660)){rules.set(input.id,{error:'حدد عدد أيام عمل صحيحاً من 1 إلى 3660.'});c.label.textContent=rules.get(input.id).error;return;}
 const s=U.snapshot();rules.set(input.id,{pending:true});c.label.textContent='جارٍ حساب الموعد وفق تاريخ الخادم…';
 try{const x=await U.request('/r34/deadline?mode='+(monthly?'calendar_month':'workdays')+(monthly?'':'&days='+days),{},s);if(c.ticket!==ticket||!input.isConnected)return;
 const rule={mode:x.mode,days:x.days,baseDate:x.baseDate};rules.set(input.id,{rule,pending:false});input.value=x.dueDate;
 c.label.textContent='التسليم: '+x.dueDate+' · '+(monthly?x.monthMeaning:days+' أيام عمل، الجمعة مستثناة')+' · يُثبت عند الحفظ';input.dispatchEvent(new Event('input',{bubbles:true}));
 }catch(e){if(c.ticket===ticket){rules.set(input.id,{error:e.message});c.label.textContent=e.message;}}
}
function mountDates(){for(const input of $$('input[type=date]')){if(!supported(input)||controls.has(input))continue;rules.delete(input.id);
 const wrap=document.createElement('div');wrap.className='r34-deadline';wrap.innerHTML=`<select aria-label="طريقة موعد التسليم"><option value="manual">تاريخ محدد</option><option value="1">بعد يوم عمل</option><option value="2">بعد يومي عمل</option><option value="5">بعد ٥ أيام عمل</option><option value="10">بعد ١٠ أيام عمل</option><option value="15">بعد ١٥ يوم عمل</option><option value="month">شهر تقويمي (تجنب الجمعة)</option><option value="custom">عدد أيام عمل مخصص</option></select><input type="number" min="1" max="3660" value="3" aria-label="عدد أيام العمل" hidden style="max-width:130px"><small role="status">التاريخ اليدوي يبقى متاحاً. المدة بالأيام تستثني الجمعة فقط.</small>`;
 const anchor=input.id==='standaloneTaskDueDate'?(input.closest('.m14-date')||input):input;
 anchor.insertAdjacentElement('afterend',wrap);const c={select:$('select',wrap),custom:$('input',wrap),label:$('small',wrap),ticket:0};controls.set(input,c);
 if(input.id==='standaloneTaskDueDate'){
  c.select.id='standaloneTaskDeadlineMode';
  const heading=document.createElement('label');heading.className='r40-deadline-mode-label';heading.htmlFor=c.select.id;heading.textContent='طريقة التحديد';wrap.prepend(heading);
  c.custom.id='standaloneTaskDeadlineDays';const daysLabel=document.createElement('label');daysLabel.className='r40-deadline-days-label';daysLabel.htmlFor=c.custom.id;daysLabel.textContent='عدد أيام العمل';c.custom.before(daysLabel);
 }
 c.select.addEventListener('change',()=>choose(input,c));c.custom.addEventListener('change',()=>choose(input,c));
 input.addEventListener('change',()=>{if(c.select.value==='manual')rules.delete(input.id);});
}}
for(const [fn,id]of[['openStandaloneTaskModal','standaloneTaskDueDate'],['openSubTaskModal','subTaskDueDate']]){const prev=window[fn];if(typeof prev==='function')window[fn]=function(...args){reset(id);const r=prev.apply(this,args);mountDates();return r;};}
let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;mountDates();});}}).observe(document.body,{childList:true,subtree:true});
for(const event of ['mosh:logout-complete','mosh:session-expired'])document.addEventListener(event,()=>{for(const id of rules.keys())reset(id);rules.clear();});
window.MoshDeadline34={ruleFor,ready,reset,mount:mountDates};mountDates();
})();
