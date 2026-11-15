(function(){
 'use strict';
 if(window.__MoshRequestActions28E)return;window.__MoshRequestActions28E=true;
 const arr=v=>Array.isArray(v)?v:[];
 const clean=v=>String(v==null?'':v).trim();
 const same=(a,b)=>clean(a).localeCompare(clean(b),'ar',{sensitivity:'base'})===0;
 const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function profile(){
   try{if(typeof hrProCurrentProfile==='function'){const p=hrProCurrentProfile();if(p)return p}}catch(e){}
   let n='';try{n=clean(currentUserDisplayName())}catch(e){}
   return arr(appState()?.staffProfiles).find(p=>same(p?.name,n)||same(p?.username,n)||same(p?.email,n))||null;
 }
 function currentRequests(){
   const p=profile();let n='';try{n=clean(currentUserDisplayName())}catch(e){}
   return arr(appState()?.hrProRequests).filter(r=>p?String(r.employeeId)===String(p.id):same(r.employeeName,n));
 }
 function unread(){return currentRequests().filter(r=>(r.status==='approved'||r.status==='rejected')&&!r.resultSeenAt&&!r.employeeSeenAt&&!r.finalSeenAt).sort((a,b)=>String(a.completedAt||'').localeCompare(String(b.completedAt||'')))}
 function label(r){try{return hrProTypeLabel(r.type)}catch(e){return clean(r.type||'طلب')}}
 function dt(v){if(!v)return '—';try{return new Intl.DateTimeFormat('ar-SY',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch(e){return clean(v)}}
 function status(r){if(r.status==='approved')return ['تمت الموافقة','rr28e-ok'];if(r.status==='rejected')return ['لم تتم الموافقة','rr28e-no'];return ['قيد المعالجة','rr28e-wait']}
 function manager(r){if(r.managerDecision==='approved')return 'موافقة المدير';if(r.managerDecision==='rejected')return 'عدم موافقة المدير';return arr(r.route).includes('المدير المباشر')?'بانتظار المدير':'—'}
 function saveState(){if(typeof window.save==='function')return window.save();if(typeof save==='function')return save();return Promise.resolve();}
 async function acknowledge(){
   const list=unread(),r=list[list.length-1];if(!r)return true;
   const beforeAt=r.resultSeenAt,beforeBy=r.resultSeenBy;
   r.resultSeenAt=new Date().toISOString();r.resultSeenBy=typeof currentUserDisplayName==='function'?currentUserDisplayName():'';
   try{await saveState()}catch(e){r.resultSeenAt=beforeAt;r.resultSeenBy=beforeBy;console.error(e);alert('تعذر حفظ الاطلاع. حاول مرة ثانية.');return false}
   const box=document.getElementById('employeeRequestResult28b');if(box){box.hidden=true;box.innerHTML=''}
   const badge=document.querySelector('#employeeSpaceV11 .emp-result-count28b');if(badge){const n=Math.max(0,unread().length);badge.textContent=n;badge.hidden=!n}
   try{window.MoshRequestResults28B?.refresh()}catch(e){}
   return true;
 }
 function openRequests(){
   const modal=document.getElementById('requestResults28eModal');if(!modal)return;
   const rows=currentRequests().slice().sort((a,b)=>String(b.createdAt||b.completedAt||'').localeCompare(String(a.createdAt||a.completedAt||'')));
   modal.innerHTML='<div class="rr28e-dialog"><div class="rr28e-head"><h3>طلباتي</h3><button type="button" class="rr28e-close" data-rr28e-close>إغلاق</button></div><div class="rr28e-body">'+(rows.length?'<div class="rr28e-row head"><span>الطلب</span><span>الحالة</span><span>قرار المدير</span><span>التاريخ</span></div>'+rows.map(r=>{const s=status(r);return '<div class="rr28e-row"><div><b>'+esc(label(r))+'</b><div class="rr28e-muted">'+esc(r.id||'')+'</div></div><div class="'+s[1]+'"><b>'+s[0]+'</b></div><div><b>'+esc(manager(r))+'</b></div><div><b>'+esc(dt(r.completedAt||r.createdAt))+'</b></div></div>'}).join(''):'<div class="rr28e-empty">لا توجد طلبات مسجلة على حسابك حالياً.</div>')+'</div></div>';
   modal.classList.add('open');modal.setAttribute('aria-hidden','false');
 }
 function closeRequests(){const modal=document.getElementById('requestResults28eModal');if(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');modal.innerHTML=''}}
 function actionFor(btn){const t=clean(btn?.textContent);if(t.includes('عرض طلباتي'))return 'open';if(t.includes('تم الاطلاع'))return 'seen';return ''}
 function handle(e){
   const btn=e.target?.closest?.('#employeeRequestResult28b .emp-result28b-actions button');if(!btn)return;
   const action=actionFor(btn);if(!action)return;
   e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
   if(action==='open')openRequests();else acknowledge();
 }
 document.addEventListener('pointerdown',handle,true);
 document.addEventListener('click',function(e){
   if(e.target?.closest?.('[data-rr28e-close]')||e.target?.id==='requestResults28eModal'){e.preventDefault();closeRequests();}
 },true);
 window.MoshRequestActions28E={openRequests,acknowledge,closeRequests,version:'28E'};
})();
