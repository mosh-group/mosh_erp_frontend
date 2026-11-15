/* MOSH R24 purchasing: explicit controlled purchase creation and approver inbox.
 * No demo fixtures, localStorage, global state mutation or changed app bootstrap.
 * Backward-compatible when no active R24 purchase categories are configured.
 */
(() => {
 'use strict';
 if (window.MoshPurchasing24) return;
 const $ = id => document.getElementById(id);
 const html = x => String(x == null ? '' : x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const id = () => 'R24-'+Date.now()+'-'+Math.random().toString(36).slice(2,13);
 const api = (p,o) => window.MoshApi.request('/r24/purchasing'+p,o);
 const myself = () => String(window.MoshApi?.user?.id||'');
 const user = () => window.MoshApi?.user||{};
 const canCreate = () => !!(user().isRoot||user().effectivePermissions?.modules?.purchases?.create);
 let modalData = null; let toolbarCheckedAt = 0, toolbarCheckedUser = "", toolbarEligible=false, toolbarAssigned=0, toolbarPending=false;
 function notice(message,bad=false){
  if(bad) window.MoshApi?.showError?.(new Error(message));
  else if(typeof window.toast==='function') window.toast(message);
  else if(typeof window.note==='function') window.note(message);
 }
 function mount(){if($('r24PurchaseShade'))return;
  const host=document.createElement('div');host.id='r24PurchaseShade';host.dir='rtl';host.hidden=true;
  host.innerHTML='<section class="r24p-dialog" role="dialog" aria-modal="true" aria-labelledby="r24p-title"><header class="r24p-header"><h2 id="r24p-title"></h2><button type="button" data-r24p="close" aria-label="إغلاق">×</button></header><div id="r24p-content"></div></section>';
  document.body.append(host);
  host.addEventListener('click',event=>{const btn=event.target.closest('[data-r24p]');if(!btn)return;
   event.preventDefault();const action=btn.dataset.r24p;
   if(action==='close')close();else if(action==='add-line')addLine();
   else if(action==='decision')void decide(btn.dataset.action);
   else if(action==='remove-line')btn.closest('[data-r24p-line]')?.remove();
   else if(action==='resubmit')void resubmit(btn.dataset.action);
   else if(action==='mine')void queue();
  });
  host.addEventListener('submit',event=>{const form=event.target.closest('form[data-r24p-form]');if(!form)return;event.preventDefault();void submitCreate(form)});
 }
 function show(title,content){mount();$('r24p-title').textContent=title;$('r24p-content').innerHTML=content;
   $('r24PurchaseShade').hidden=false;$('r24PurchaseShade').querySelector('input:not([type="hidden"]),select,textarea')?.focus();}
 function close(){if(modalData?.busy)return;$('r24PurchaseShade').hidden=true;modalData=null;}
 function field(label,markup){return `<label class="r24p-label"><span>${label}</span>${markup}</label>`}
 function line(){return `<div class="r24p-line" data-r24p-line>${field('المادة أو الخدمة','<input name="lineName" required maxlength="500" placeholder="اسم المادة أو الخدمة">')}${field('الكمية','<input name="lineQty" type="number" min="0.0001" step="any" value="1" required>')}${field('الوحدة','<input name="lineUnit" value="قطعة" maxlength="80" required>')}${field('النوع','<select name="lineKind"><option value="goods">مواد</option><option value="service">خدمة</option></select>')}<button type="button" class="r24p-remove" aria-label="حذف البند" data-r24p="remove-line">حذف</button></div>`}
 function addLine(){$('r24pLines')?.insertAdjacentHTML('beforeend',line());}
 async function open(source={}){
  if(!$('r24PurchaseShade'))mount();
  if(!canCreate()){notice('صلاحية إنشاء طلب شراء غير مفعّلة لحسابك.',true);return;}
  let response;try{response=await api('/categories')}catch(err){notice(err.message||'تعذر تحميل أنواع الشراء.',true);return;}
  const categories=(response?.items||[]).filter(x=>x.active);
  if(!categories.length){
   // Zero categories means R24 rules are not activated yet; legacy behavior remains.
   if(window.MoshOps18?.requestEditor)window.MoshOps18.requestEditor('purchase',source.taskId||'','',source.parentLogId||'',true);
   else notice('لم تُفعّل أنواع الشراء بعد.',true);
   return;
  }
  if(source.parentLogId){notice('ربط طلب الشراء بالمهمة اللوجستية يحتاج اعتماد الربط قبل التنفيذ. افتح طلباً مستقلاً حالياً.',true);return;}
  modalData={busy:false,source};
  show('طلب شراء جديد',`<form id="r24pCreate" data-r24p-form="create" class="r24p-form">
   <p class="r24p-hint">يمر الطلب بتسلسل اعتماد عروض الأسعار، وبعد التسعير بتسلسل اعتماد الشراء حسب نوعه.</p>
   ${field('نوع الشراء',`<select name="categoryId" required>${categories.map(c=>`<option value="${html(c.id)}">${html(c.name)}</option>`).join('')}</select>`)}
   ${field('عنوان الطلب','<input name="title" maxlength="200" required placeholder="عنوان واضح">')}
   ${field('سبب الحاجة والتفاصيل','<textarea name="details" maxlength="10000" rows="3" required></textarea>')}
   ${field('الموعد المطلوب (اختياري)','<input name="neededDate" type="date">')}
   <section class="r24p-lines"><div class="r24p-line-head"><b>بنود الشراء</b><button type="button" data-r24p="add-line">+ إضافة بند</button></div><div id="r24pLines">${line()}</div></section>
   <footer class="r24p-footer"><button type="submit" class="r24p-main">إرسال الطلب</button><button type="button" data-r24p="close">إلغاء</button></footer>
  </form>`);
 }
 async function submitCreate(form){if(!modalData||modalData.busy)return;
  const entries=[...form.querySelectorAll('[data-r24p-line]')].map(row=>({
   name:row.querySelector('[name=lineName]').value.trim(),qty:Number(row.querySelector('[name=lineQty]').value),
   unit:row.querySelector('[name=lineUnit]').value.trim(),kind:row.querySelector('[name=lineKind]').value}));
  if(!entries.length){notice('أضف بند شراء واحداً على الأقل.',true);return;}
  const fields=new FormData(form);
  const payload={categoryId:fields.get('categoryId'),title:String(fields.get('title')).trim(),
   details:String(fields.get('details')).trim(),neededDate:fields.get('neededDate')||null,
   taskId:modalData.source.taskId||'',lines:entries,requestId:id()};
  modalData.busy=true;form.querySelector('button[type="submit"]').disabled=true;
  try{const result=await api('/requests',{method:'POST',body:payload});modalData.busy=false;
   const code=result.requestNo||result.id||'';
   show('تم إرسال طلب الشراء',`<div class="r24p-hint"><b>تم تسجيل الطلب ${html(code)}</b><p>بانتظار أول موافقة في تسلسل اعتماد عروض الأسعار. بعد إتمامها، قسم المشتريات بيتابع تسعير المواد.</p><button type="button" data-r24p="mine">عرض طلباتي وموافقاتي</button><button type="button" data-r24p="close">إغلاق</button></div>`);
   try{await window.MoshApi?.refresh?.()}catch(_){/* the server request is already saved; don't claim it failed */}
  }catch(err){modalData.busy=false;form.querySelector('button[type="submit"]').disabled=false;notice(err.message||'تعذر حفظ الطلب.',true)}
 }
 const stages={quotation_pending:'بانتظار اعتماد طلب عروض أسعار',pricing:'قسم المشتريات يجمع عروض الأسعار',purchase_pending:'بانتظار اعتماد الشراء',approved:'معتمد للشراء',returned:'معاد للتعديل',rejected:'مرفوض'};
 let queued=[];
 async function queue(){const expected=myself();if(!expected)return;try{const d=await api('/queue');if(myself()!==expected)return;queued=d.items||[];const mine=expected;
   const items=queued; // filtered by the authenticated server; never widen records locally
   const records=items.map(x=>{
    const isApprover=x.approverId===mine && ['quotation_pending','purchase_pending'].includes(x.stage);
    return `<article class="r24p-item"><div><b>${html(x.title||'طلب شراء')}</b><small>${html(x.policyName)} · ${html(stages[x.stage]||x.stage)}</small><small>رقم الطلب: ${html(x.requestNo||x.id)}</small></div>${isApprover?`<button type="button" data-r24p="decision" data-action="${html(x.id)}">مراجعة واعتماد</button>`:''}${x.stage==='returned' && (canCreate()||x.ownerId===mine)?`<button type="button" data-r24p="resubmit" data-action="${html(x.id)}">إعادة تقديم الطلب</button>`:''}</article>`;
   });modalData={busy:false};show('طلبات وموافقات الشراء',records.join('')||'<p class="r24p-hint">ما في طلبات أو موافقات حالياً.</p>');
  }catch(err){notice(err.message||'تعذر قراءة الطلبات.',true)} }
 async function resubmit(requestId){const x=queued.find(x=>x.id===requestId);if(!x)return;
  if(!window.confirm('إعادة تقديم الطلب بعد تعديل بياناته؟ سيبدأ تسلسل الاعتمادات من المرحلة الأولى.'))return;
  try{await api('/requests/'+encodeURIComponent(requestId)+'/resubmit',{method:'POST',body:{version:x._version,requestId:id()}});await queue()}
  catch(err){notice(err.message||'تعذرت إعادة تقديم الطلب.',true)}
 }
 async function decide(requestId){const x=queued.find(x=>x.id===requestId);if(!x)return;
  const isFinal=x.stage==='purchase_pending' && x.requiresQuoteSelection;
  const chooser=isFinal?field('العرض المعتمد',`<select id="r24pQuoteId" required><option value="">اختر عرض المورد</option>${(x.quotes||[]).map(q=>`<option value="${html(q.id)}">${html(q.supplierName||q.supplierId)} · ${html(q.reference||q.id)}</option>`).join('')}</select>`):'';
  modalData={busy:false,approval:x};show('مراجعة طلب الشراء',`<div class="r24p-hint"><b>${html(x.title)}</b><p>${html(stages[x.stage]||x.stage)} · ${html(x.policyName)}</p><p>السبب والتفاصيل: ${html(x.details||'—')}</p>${(x.lines||[]).map(l=>`<div>${html(l.name)} × ${html(l.qty)} ${html(l.unit)}</div>`).join('')}</div>
   ${chooser}${field('ملاحظة الاعتماد أو سبب الإعادة / الرفض','<textarea id="r24pNote" rows="3"></textarea>')}
   <div class="r24p-footer"><button type="button" data-r24p="send-decision" data-choice="approve" class="r24p-main">موافقة</button><button type="button" data-r24p="send-decision" data-choice="return">إعادة للتعديل</button><button type="button" data-r24p="send-decision" data-choice="reject">رفض نهائي</button></div>`);
  $('r24p-content').addEventListener('click',async e=>{
   const b=e.target.closest('[data-r24p="send-decision"]');if(!b||modalData?.busy)return;
   const choice=b.dataset.choice,version=modalData.approval._version,notes=$('r24pNote')?.value||'';
   if(choice!=='approve'&&notes.trim().length<3){notice('اكتب سبب الإعادة أو الرفض.',true);return;}
   const quoteId=$('r24pQuoteId')?.value||null;
   if(choice==='approve'&&isFinal&&!quoteId){notice('اختر عرض المورد المعتمد.',true);return;}
   modalData.busy=true;b.disabled=true;
   try{await api('/requests/'+encodeURIComponent(requestId)+'/decision',{method:'POST',body:{action:choice,version,note:notes,quoteId,requestId:id()}});modalData.busy=false;await queue()}
   catch(err){modalData.busy=false;b.disabled=false;notice(err.message||'تعذر حفظ القرار.',true)}
  },{once:false});
 }
 // The old purchase action is intercepted by MoshOps18 only for *new* requests,
 // and the existing interface remains intact for historical requests/receipts.
 const inboxIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8m-8 4h5"/></svg>';
 function inboxState(){return {visible:!!myself()&&toolbarCheckedUser===myself()&&toolbarEligible,label:toolbarAssigned?`طلبات واعتمادات الشراء (${toolbarAssigned})`:'طلبات واعتمادات الشراء'};}
 function renderEntries(){
  const status=inboxState();
  const targets=[['o18Rail_purchases','r24PurchasingInbox','rail'],['o18Rail_logistics','r30PurchasingInbox_logistics','rail'],['employeePortalRequests','r30PurchasingInbox_own','portal'],['r24ToolsMenu','r30PurchasingInbox_admin','menu']];
  for(const [parentId,buttonId,kind]of targets){
   const parent=$(parentId);let button=$(buttonId);
   if(button&&button.parentElement!==parent){button.remove();button=null;}
   if(!parent||!status.visible){button?.remove();continue;}
   if(!button){button=document.createElement('button');button.type='button';button.id=buttonId;button.dataset.r30PurchaseInbox='';button.className='r30-section-entry r30-purchase-entry'+(kind==='portal'?' r29-btn':'');button.innerHTML=(kind==='menu'?'':inboxIcon)+'<span></span>';
    const before=kind==='rail'?parent.querySelector('[data-o18="nav"][data-value$="|orders"], [data-o18="nav"][data-value$="|schedule"]'):kind==='portal'?parent.firstChild:null;
    parent.insertBefore(button,before);
   }
   const label=button.querySelector('span');if(label.textContent!==status.label)label.textContent=status.label;
   if(button.title!==status.label)button.title=status.label;
  }
 }
 function toolbar(){
  const expected=myself();if(!expected){cleanupNavigation();return false;}
  const u=user(),privileged=!!(u.isRoot||u.effectivePermissions?.modules?.purchases?.approve||u.effectivePermissions?.modules?.purchases?.create||u.effectivePermissions?.modules?.admin?.approve);
  if(toolbarCheckedUser!==expected){toolbarCheckedUser=expected;toolbarCheckedAt=0;toolbarEligible=privileged;toolbarAssigned=0;toolbarPending=false;}
  renderEntries();const now=Date.now();
  if(!toolbarPending&&now-toolbarCheckedAt>45000){
   toolbarCheckedAt=now;toolbarPending=true;
   api('/queue').then(result=>{
    if(toolbarCheckedUser!==expected||myself()!==expected)return;
    const rows=result?.items||[];
    toolbarAssigned=rows.filter(row=>row.approverId===expected&&['quotation_pending','purchase_pending'].includes(row.stage)).length;
    const mine=rows.some(row=>row.ownerId===expected||row.ownerId===String(u.employeeId||''));
    toolbarEligible=!!(privileged||toolbarAssigned||mine);renderEntries();
    document.dispatchEvent(new CustomEvent('mosh:r30-inbox-ready'));
   }).catch(()=>{if(toolbarCheckedUser===expected&&myself()===expected){toolbarEligible=privileged;renderEntries();}})
    .finally(()=>{if(toolbarCheckedUser===expected)toolbarPending=false;});
  }
  return true;
 }
 function cleanupNavigation(){toolbarCheckedAt=0;toolbarCheckedUser='';toolbarEligible=false;toolbarAssigned=0;toolbarPending=false;modalData=null;queued=[];
  if($('r24PurchaseShade'))$('r24PurchaseShade').hidden=true;
  document.querySelectorAll('[data-r30-purchase-inbox],#r24PurchasingInbox').forEach(e=>e.remove());
 }
 function init(){mount();toolbar();
  document.addEventListener('click',event=>{const b=event.target.closest?.('[data-r30-purchase-inbox]');if(!b)return;event.preventDefault();if(inboxState().visible)void queue();});
  ['mosh:ui-ready','mosh:refreshed','mosh:r19-change'].forEach(e=>document.addEventListener(e,toolbar));
  ['mosh:session-expired','mosh:logout-complete'].forEach(e=>document.addEventListener(e,cleanupNavigation));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.MoshPurchasing24={open,openQueue:queue,sync:toolbar,inboxState,version:'r30-integrated-navigation'};
})();
