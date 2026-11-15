(function(){
'use strict';
if(window.MoshRequestResults28B)return;
const arr=v=>Array.isArray(v)?v:[];
const clean=v=>String(v==null?'':v).trim();
const same=(a,b)=>clean(a).localeCompare(clean(b),'ar',{sensitivity:'base'})===0;
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>new Date().toISOString();
function profile(){
 try{if(typeof hrProCurrentProfile==='function'){const p=hrProCurrentProfile();if(p)return p;}}catch(e){}
 let n='';try{n=clean(currentUserDisplayName())}catch(e){}
 return arr(state.staffProfiles).find(p=>same(p?.name,n)||same(p?.username,n)||same(p?.email,n))||null;
}
function name(){try{return clean(currentUserDisplayName())}catch(e){return ''}}
function stage(r){try{return clean(hrProRequestStage(r))}catch(e){return r?.status==='pending'?clean(arr(r.route)[Number(r.stageIndex)||0]):''}}
async function saveSafe(){try{await save();return true}catch(e){console.error('v28B save failed',e);return false}}
function isHrActionable(r){
 if(!r||r.status!=='pending'||stage(r)!=='الموارد البشرية')return false;
 const needsManager=arr(r.route).includes('المدير المباشر');
 return !needsManager||!!r.managerDecision;
}
function hrPending(){return arr(state.hrProRequests).filter(isHrActionable)}
function ensureHrBadge(){
 const tab=document.querySelector('#hrProNav [data-hr-view="requests"]');if(!tab)return null;
 let badge=tab.querySelector('.hr28b-badge');if(!badge){badge=document.createElement('span');badge.className='hr28b-badge';badge.hidden=true;tab.appendChild(badge);}
 return {tab,badge};
}
function refreshHrBadge(){
 const x=ensureHrBadge();if(!x)return;const n=hrPending().length;x.badge.textContent=n;x.badge.hidden=!n;x.tab.classList.toggle('hr28b-has-pending',n>0);x.tab.title=n?`${n} طلب بانتظار قرار الموارد البشرية`:'';
}
function currentEmployeeRequests(){
 const p=profile(),n=name();
 return arr(state.hrProRequests).filter(r=>p?String(r.employeeId)===String(p.id):same(r.employeeName,n));
}
function unreadFinal(){
 return currentEmployeeRequests().filter(r=>(r.status==='approved'||r.status==='rejected')&&!r.resultSeenAt&&!r.employeeSeenAt&&!r.finalSeenAt).sort((a,b)=>String(a.completedAt||'').localeCompare(String(b.completedAt||'')));
}
function finalNote(r){
 const h=arr(r.history).slice().reverse().find(x=>clean(x?.note)&&clean(x?.stage)==='الموارد البشرية')||arr(r.history).slice().reverse().find(x=>clean(x?.note));
 return clean(h?.note||'');
}
function requestLabel(r){try{return hrProTypeLabel(r.type)}catch(e){return clean(r.type||'طلب')}}
function resultDate(r){const v=r.completedAt;if(!v)return '';try{return new Intl.DateTimeFormat('ar-SY',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch(e){return clean(v)}}
function ensureEmployeeResultBox(){
 const space=document.getElementById('employeeSpaceV11');if(!space)return null;
 let box=document.getElementById('employeeRequestResult28b');
 if(!box){box=document.createElement('div');box.id='employeeRequestResult28b';box.className='emp-result28b';box.hidden=true;const header=space.querySelector('.es11-header');if(header)header.insertAdjacentElement('afterend',box);else space.prepend(box);}
 const tile=space.querySelector('.es11-tile.es11-green');if(tile&&!tile.querySelector('.emp-result-count28b')){const b=document.createElement('span');b.className='emp-result-count28b';b.hidden=true;tile.appendChild(b);}
 return box;
}
function renderEmployeeResult(){
 const box=ensureEmployeeResultBox();if(!box)return;const unread=unreadFinal();const badge=document.querySelector('#employeeSpaceV11 .emp-result-count28b');if(badge){badge.textContent=unread.length;badge.hidden=!unread.length;}
 if(!unread.length){box.hidden=true;box.innerHTML='';return;}
 const r=unread[unread.length-1],ok=r.status==='approved',note=finalNote(r),more=unread.length>1?` · لديك ${unread.length} نتائج جديدة`:'';
 box.className='emp-result28b'+(ok?'':' rejected');box.hidden=false;
 box.innerHTML=`<div class="emp-result28b-main"><div class="emp-result28b-icon">${ok?'✓':'×'}</div><div class="emp-result28b-copy"><span>نتيجة طلبك${more}</span><b>${esc(requestLabel(r))} — ${ok?'تمت الموافقة النهائية':'لم تتم الموافقة'}</b><small>${esc(resultDate(r))}${note?' · '+esc(note):''}</small></div></div><div class="emp-result28b-actions"><button type="button" onclick="MoshRequestResults28B.openMyRequests()">عرض طلباتي</button><button type="button" class="primary" onclick="MoshRequestResults28B.seen('${esc(r.id)}')">تم الاطلاع</button></div>`;
}
function markFinal(id){
 const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));if(!r||!(r.status==='approved'||r.status==='rejected'))return false;
 renderEmployeeResult();refreshHrBadge();return true;
}
async function seen(id){const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));if(!r)return;const beforeAt=r.resultSeenAt,beforeBy=r.resultSeenBy;r.resultSeenAt=now();r.resultSeenBy=name();if(await saveSafe()){renderEmployeeResult();return;}r.resultSeenAt=beforeAt;r.resultSeenBy=beforeBy;renderEmployeeResult();}
function openMyRequests(){try{openEmployeePortal()}catch(e){};setTimeout(()=>{document.getElementById('employeePortalRequests')?.scrollIntoView({behavior:'smooth',block:'start'});},80)}

const approve=window.hrProApproveRequest;
if(typeof approve==='function')window.hrProApproveRequest=function(id){const result=approve.apply(this,arguments);setTimeout(()=>{markFinal(id);refreshHrBadge();},0);return result;};
const reject=window.hrProRejectRequest;
if(typeof reject==='function')window.hrProRejectRequest=function(id){const result=reject.apply(this,arguments);setTimeout(()=>{markFinal(id);refreshHrBadge();},0);return result;};
const submit=window.hrProSubmitRequest;
if(typeof submit==='function')window.hrProSubmitRequest=function(){const result=submit.apply(this,arguments);setTimeout(()=>{refreshHrBadge();renderEmployeeResult();},0);return result;};

window.MoshRequestResults28B={refresh:function(){refreshHrBadge();renderEmployeeResult();},seen,openMyRequests,markFinal,version:'28B'};
function init(){ensureHrBadge();ensureEmployeeResultBox();refreshHrBadge();renderEmployeeResult();setTimeout(()=>{refreshHrBadge();renderEmployeeResult();},700);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
setInterval(()=>{refreshHrBadge();renderEmployeeResult();},4000);
/* v28E: removed self-triggering DOM observer; explicit actions + 4s refresh are enough. */
})();
