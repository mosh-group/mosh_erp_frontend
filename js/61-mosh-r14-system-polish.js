/* MOSH ERP R14 — system-wide polish, keyboard UX, HR photos, safe exit, daily log helpers. */
(function(){
'use strict';
if(window.MoshR14Polish)return;
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const visible=el=>!!el&&el.getClientRects().length>0&&!el.hidden;
const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
let bypassExit=false,pendingStaffPhoto=null,savingStaffPhoto=false,editRevision=0;

function dirty(){try{return typeof appIsDirty!=='undefined'&&!!appIsDirty}catch(e){return document.body.dataset.r14Dirty==='1'}}
function setDirty(v=true){try{if(typeof setDirtyState==='function')setDirtyState(v);else document.body.dataset.r14Dirty=v?'1':'0'}catch(e){document.body.dataset.r14Dirty=v?'1':'0'}}
function activeSurface(){return qa('.modal.show,.hr-pro-modal-root:not([hidden]),dialog[open],.auth37-editorback,#mgr28Modal').filter(visible).pop()||qa('#emp47TaskOverlay.show').find(visible)||q('.view.active')||document.body}
function isFilter(el){if(!el)return false;return el.matches('input[type=search],[data-filter],#wd50LogDate,#appListSearch,#salesReportSearch')||/بحث|فلتر|filter/i.test(el.id||'')}
function isEditorControl(el){if(!el||isFilter(el)||el.disabled||el.readOnly||el.closest('[data-chat34-task]')||/^(managerAssignee_|managerTransferDept_|managerTransferAdmin_)/.test(el.id||''))return false;const surface=el.closest('.modal.show,.hr-profile-shell,.hr-pro-modal,.o18-dialog,.auth37-editorbox,.sales-task-card,.service-contract-editor,.quote-editor,.settings-editor');return !!surface&&el.matches('input:not([type=search]),textarea,select,[contenteditable=true]')}

function ensureDialog(){
 let d=q('#r14UnsavedDialog');if(d)return d;
 d=document.createElement('dialog');d.id='r14UnsavedDialog';d.setAttribute('aria-labelledby','r40UnsavedTitle');d.setAttribute('aria-describedby','r40UnsavedDescription');
 d.innerHTML='<div class="r14-confirm-body"><div class="r40-exit-heading"><span class="r40-exit-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6M14 2v6h6M14 2l6 6v4"/><circle cx="18" cy="18" r="4"/><path d="M18 16v2l1 1"/></svg></span><div><h3 id="r40UnsavedTitle">حفظ التعديلات قبل الخروج؟</h3><p id="r40UnsavedDescription">لديك تعديلات لم تُحفظ بعد.</p></div></div></div><footer><button type="button" class="btn" data-r14="save"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m20 6-11 11-5-5"/></svg>حفظ والخروج</button><button type="button" class="btn" data-r14="discard">الخروج دون حفظ</button><button type="button" class="btn" data-r14="cancel" autofocus>متابعة التعديل</button></footer>';
 document.body.appendChild(d);d.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();d.querySelector('[data-r14="save"]')?.click();}else if(e.key==='Escape'){e.preventDefault();d.querySelector('[data-r14="cancel"]')?.click();}});return d;
}
function isSaveAction(button){
 const label=text(button),handler=button.getAttribute('onclick')||'';
 if(button.closest('#r14UnsavedDialog')||button.classList.contains('r35-ui-navigation')||/\b(?:open\w*|goApp|render\w*|toggle\w*)\s*\(/.test(handler)||/\.(?:open|openTasks|reviewTask)\s*\(/.test(handler))return false;
 if(button.classList.contains('save-btn'))return true;
 return /^(حفظ|إنشاء المهمة|إرسال الطلب|تسجيل|تحديث وحفظ)/.test(label)&&!/مسودة/.test(label);
}
function findSaveButton(surface=activeSurface()){
 const taskEditor=q('.mw08-editor',surface);if(dirty()&&taskEditor&&!taskEditor.open)taskEditor.open=true;
 return qa('button',surface).find(b=>visible(b)&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'&&!b.classList.contains('mosh-auth-hidden')&&isSaveAction(b))||null;
}
let activeExitRequest=null;
function requestUnsavedExit(exitAction){
 if(activeExitRequest)return activeExitRequest;
 const sourceSurface=activeSurface(),sourceSave=findSaveButton(sourceSurface),d=ensureDialog();
 let timer=null,deadline=null,closed=false,saving=false,resolveRequest,saveConfirmed=false,saveFailure=null,saveRevision=0,armed=false;
 const promise=new Promise(resolve=>{resolveRequest=resolve;});activeExitRequest=promise;
 let status=q('[data-r36-exit-status]',d);if(!status){status=document.createElement('p');status.dataset.r36ExitStatus='';status.setAttribute('role','status');d.querySelector('.r14-confirm-body').append(status);}status.textContent='';
 const saveButton=d.querySelector('[data-r14="save"]');saveButton.disabled=!sourceSave;
 if(!sourceSave)status.textContent='لا يوجد نموذج قابل للحفظ في هذه النافذة. يمكنك متابعة التعديل أو الخروج دون حفظ.';
 const notify=message=>{status.textContent=message;if(window.MoshUI19?.toast)window.MoshUI19.toast(message);else if(typeof window.toast==='function')window.toast(message);};
 const confirmed=()=>{if(armed&&saving)saveConfirmed=true;};
 const failed=e=>{if(armed&&saving)saveFailure=e.detail||new Error('تعذر الحفظ.');};
 document.addEventListener('mosh:saved',confirmed);document.addEventListener('mosh:save-confirmed',confirmed);document.addEventListener('mosh:save-failed',failed);document.addEventListener('mosh:validation-error',failed);
 const done=value=>{if(closed)return;closed=true;clearTimeout(timer);clearTimeout(deadline);document.removeEventListener('mosh:saved',confirmed);document.removeEventListener('mosh:save-confirmed',confirmed);document.removeEventListener('mosh:save-failed',failed);document.removeEventListener('mosh:validation-error',failed);d.onclick=null;d.oncancel=null;d.onclose=null;try{d.close();}catch(_){}activeExitRequest=null;resolveRequest(value);};
 const leave=()=>{done(true);bypassExit=true;try{exitAction?.();}finally{setTimeout(()=>bypassExit=false,0);}};
 const fail=message=>{setDirty(true);done(false);notify(message);sourceSurface.querySelector?.(':invalid')?.focus?.();};
 d.oncancel=e=>{e.preventDefault();done(false);};d.onclose=()=>done(false);
 d.onclick=async e=>{const b=e.target.closest('[data-r14]');if(!b)return;const action=b.dataset.r14;
  e.preventDefault();e.stopPropagation();
  if(action==='cancel')return done(false);
  if(action==='discard'){
   if(window.MoshApi?.isSaving?.()){status.textContent='طلب الحفظ ما زال قيد التحقق. يمكنك العودة إلى النموذج؛ لم يصل تأكيد من الخادم بعد.';return;}
   if(window.MoshApi?.discardUncommitted&&window.MoshApi.discardUncommitted()===false){status.textContent='تعذر تأكيد العملية السابقة. عُد إلى النموذج وتحقق منها قبل تجاهل التعديلات.';return;}setDirty(false);return leave();
  }
  if(action!=='save'||saving)return;
  const save=sourceSave?.isConnected&&!sourceSave.disabled?sourceSave:findSaveButton(sourceSurface);
  if(!save)return fail('لم يتم الحفظ: لا يوجد زر حفظ متاح لهذا النموذج حسب الصلاحيات الحالية.');
  const form=save.form||save.closest?.('form');
  if(form?.reportValidity&&!form.reportValidity())return fail('لم يتم الحفظ. أكمل الحقول المطلوبة وصحّح القيم المعلّمة، ثم حاول مجدداً.');
  saving=true;saveButton.disabled=true;status.textContent='جارٍ الحفظ…';saveConfirmed=false;saveFailure=null;armed=false;
  // Includes the earlier-request drain; even a stalled earlier operation cannot trap this dialog forever.
  deadline=setTimeout(()=>{if(!closed)fail('تعذر تأكيد الحفظ خلال المهلة المحددة. احتفظنا بالتعديلات في النموذج؛ تحقق من الاتصال ومن نتيجة العملية قبل المحاولة مجدداً.');},90000);
  try{await window.MoshApi?.flush?.();if(closed)return;saveRevision=editRevision;armed=true;save.click();}catch(error){if(!closed)fail(error.message||'لم يتم الحفظ. حاول مجدداً.');return;}
  const started=Date.now();const wait=()=>{if(closed)return;
   if(saveFailure&&!window.MoshApi?.isSaving?.())return fail(saveFailure.message||'لم يتم الحفظ. راجع البيانات وحاول مجدداً.');
   if(saveConfirmed&&!window.MoshApi?.isSaving?.()){
    if(editRevision===saveRevision){setDirty(false);notify('تم الحفظ بنجاح.');return leave();}
    done(false);notify('تم حفظ التعديلات السابقة. لديك تعديلات أحدث في النموذج تحتاج إلى الحفظ.');return;
   }
   if(Date.now()-started>=10000&&!window.MoshApi?.isSaving?.())return fail('لم يتم تأكيد الحفظ. راجع البيانات المطلوبة في النموذج ثم حاول مجدداً.');
   if(Date.now()-started>=10000)status.textContent='جارٍ انتظار تأكيد الحفظ من الخادم…';
   timer=setTimeout(wait,120);
  };timer=setTimeout(wait,120);
 };
 if(!d.open)d.showModal();return promise;
}

function exitCandidate(el){if(!el||el.hasAttribute('data-r34-file-clear'))return false;const t=text(el);if(/^(إغلاق|إلغاء|إلغاء الأمر|رجوع|رجوع للمهام|العودة|×|✕)$/.test(t))return true;return !!el.closest('[data-close-modal],[data-dismiss]');}
function performEscape(){
 const s=activeSurface();
 if(s===document.body)return;
 const taskClose=q('.mw08-chrome>button[aria-label^="إغلاق"]',s);
 const close=visible(taskClose)?taskClose:qa('button',s).filter(visible).find(exitCandidate);
 if(close){bypassExit=true;try{close.click()}finally{setTimeout(()=>bypassExit=false,0)};return;}
 if(s.matches('dialog')){try{s.close()}catch(e){}}
 else if(s.classList.contains('modal'))s.classList.remove('show');
}

document.addEventListener('input',e=>{if(isEditorControl(e.target)){editRevision++;setDirty(true)}},true);
document.addEventListener('change',e=>{if(isEditorControl(e.target)){editRevision++;setDirty(true)}},true);
document.addEventListener('click',e=>{
 if(e.target.closest?.('#r14UnsavedDialog'))return;
 if(bypassExit||!dirty())return;const b=e.target.closest('button,a');if(!b||!visible(b)||!exitCandidate(b))return;
 e.preventDefault();e.stopImmediatePropagation();requestUnsavedExit(()=>b.click());
},true);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
   if(q('#r14UnsavedDialog[open]'))return;
   e.preventDefault();e.stopImmediatePropagation();if(dirty())requestUnsavedExit(performEscape);else performEscape();return;
 }
 if(e.key!=='Enter'||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey)return;
 const t=e.target;if(t?.closest('.task-chat-input'))return; // task chat already sends on Enter
 if(t?.matches('textarea,[contenteditable=true]'))return;
 if(t?.matches('button,a'))return;
 const s=activeSurface();if(s===document.body||isFilter(t))return;
 const save=findSaveButton(s);if(save){e.preventDefault();save.click();}
},true);

/* Task-chat microphone fallback for non-HTTPS origins. Files still use R12's general attachment validation. */
if(typeof window.toggleTaskChatVoice==='function'){
 const oldVoice=window.toggleTaskChatVoice;
 window.toggleTaskChatVoice=function(taskId){
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
     const input=document.getElementById('taskChatAttachment_'+taskId);if(!input)return alert('المرفقات غير متاحة هنا.');
     const old=input.getAttribute('accept');input.setAttribute('accept','audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm');
     const restore=()=>{if(old===null)input.removeAttribute('accept');else input.setAttribute('accept',old);input.removeEventListener('change',restore);};input.addEventListener('change',restore,{once:true});input.click();return;
   }
   return oldVoice.apply(this,arguments);
 };
}

/* Employee photo: selected by HR/admin while creating/editing the employee profile. */
async function imagePreview(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=reject;r.readAsDataURL(file)})}
async function normalizeProfilePhoto(file){
 if(!file||!/^image\//i.test(file.type||''))throw new Error('اختر ملف صورة صالحاً.');
 if((file.size||0)>25*1024*1024)throw new Error('حجم الصورة يتجاوز 25 MB.');
 try{
   const data=await imagePreview(file);const img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error('تعذر قراءة الصورة'));el.src=data;});
   const max=1400,iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1,scale=Math.min(1,max/Math.max(iw,ih));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(iw*scale));canvas.height=Math.max(1,Math.round(ih*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('تعذر تجهيز الصورة');ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));if(!blob)throw new Error('تعذر تحويل الصورة');
   return new File([blob],'profile-'+Date.now()+'.jpg',{type:'image/jpeg',lastModified:Date.now()});
 }catch(e){
   const ext=String(file.name||'').split('.').pop().toLowerCase();if(['jpg','jpeg','png','webp','gif','heic','heif','bmp','tif','tiff'].includes(ext))return file;throw e;
 }
}
function showStaffPhotoPreview(photo) {
 const im=q('#r14StaffPhotoPreview');
 if(im){im.src=photo.preview;im.hidden=false;}
 q('#r14StaffPhotoPlaceholder')?.setAttribute('hidden','');
}
window.r14PickStaffPhoto=async function(input) {
 const chosen=input?.files?.[0];
 if(!chosen)return;
 const photo={input,accountId:String(window.MoshApi?.user?.id||''),file:null,preview:''};
 pendingStaffPhoto=photo;
 try {
  photo.file=await normalizeProfilePhoto(chosen);
  photo.preview=await imagePreview(photo.file);
  if(pendingStaffPhoto!==photo||!input.isConnected)return;
  showStaffPhotoPreview(photo);
  setDirty(true);
 }catch(error){
  if(pendingStaffPhoto!==photo)return;
  pendingStaffPhoto=null;input.value='';
  if(input.isConnected){
   const preview=q('#r14StaffPhotoPreview');if(preview)preview.hidden=true;
   q('#r14StaffPhotoPlaceholder')?.removeAttribute('hidden');
   alert(error?.message||'تعذر تجهيز صورة الموظف.');
  }
 }
};

const avatarLoads=new Map();
async function hydrateOneAvatar(el,key) {
 const accountId=window.MoshApi?.user?.id;
 if(!el||!key||!accountId||el.dataset.r14PhotoHydrated===key)return;
 el.dataset.r14PhotoHydrated=key;
 const cacheKey=accountId+':'+key;
 if(!avatarLoads.has(cacheKey)){
  const download=MoshApi.request('/files/'+encodeURIComponent(key)+'/content',{binary:true});
  avatarLoads.set(cacheKey,download.finally(()=>avatarLoads.delete(cacheKey)));
 }
 const current=()=>el.isConnected&&el.dataset.r14PhotoHydrated===key&&window.MoshApi?.user?.id===accountId;
 try {
  const blob=await avatarLoads.get(cacheKey);
  if(!blob?.size||!current())return;
  const url=URL.createObjectURL(blob), image=document.createElement('img');
  image.className='r14-avatar-img';
  image.alt='';
  image.onload=()=>{URL.revokeObjectURL(url);if(current())el.replaceChildren(image);};
  image.onerror=()=>URL.revokeObjectURL(url);
  image.src=url;
 }catch(error){if(current()&&error.status!==404)console.warn('MOSH employee photo:',error);}
}
window.r14HydrateStaffPhotos=async function(){
 const profiles=Array.isArray(state?.staffProfiles)?state.staffProfiles:[];
 for(const p of profiles){if(!p?.photoKey)continue;qa('[data-r14-staff-id="'+CSS.escape(String(p.id))+'"],[data-r14-staff-name="'+CSS.escape(String(p.name||''))+'"]').forEach(el=>hydrateOneAvatar(el,p.photoKey));}
 const currentId=String(window.MoshApi?.user?.employeeId||'');const cp=profiles.find(p=>String(p.id)===currentId)||profiles.find(p=>String(p.name||'')===String(typeof currentUserDisplayName==='function'?currentUserDisplayName():''));if(cp?.photoKey){const top=q('#topUserAvatar');if(top)hydrateOneAvatar(top,cp.photoKey);qa('.es11-avatar').forEach(x=>hydrateOneAvatar(x,cp.photoKey));}
};
if(typeof window.hrEmployeeFormHtml==='function'){
 const oldForm=window.hrEmployeeFormHtml;
 window.hrEmployeeFormHtml=function(p,identity,status){let html=oldForm.apply(this,arguments);const box=document.createElement('div');box.innerHTML=html;const hero=box.querySelector('.hr-profile-hero');if(hero&&!box.querySelector('#r14StaffPhotoInput')){
   const av=hero.querySelector('.hr-profile-avatar');if(av){av.dataset.r14StaffId=String(p?.id||'');av.id='r14StaffPhotoPlaceholder';}
   const tools=document.createElement('div');tools.className='r14-photo-tools';tools.innerHTML='<label class="btn" for="r14StaffPhotoInput">'+(p?.photoKey?'تغيير صورة الموظف':'إضافة صورة الموظف')+'</label><input id="r14StaffPhotoInput" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onchange="r14PickStaffPhoto(this)"><img id="r14StaffPhotoPreview" class="r14-photo-preview" hidden alt="معاينة الصورة">';
   hero.insertBefore(tools,hero.querySelector('.hr-status')||hero.lastElementChild);
 }
 setTimeout(()=>window.r14HydrateStaffPhotos?.(),0);return box.innerHTML;
 };
}
if(typeof window.saveStaffProfile==='function'){
 const oldSaveStaff=window.saveStaffProfile;
 window.saveStaffProfile=async function(id=''){
  if(savingStaffPhoto)return false;
  const photo=pendingStaffPhoto?.input===q('#r14StaffPhotoInput')?pendingStaffPhoto:null;
  if(!photo)return oldSaveStaff.apply(this,arguments);
  if(!photo.preview){window.MoshUI19?.toast('جارٍ تجهيز صورة الموظف…');return false;}

  savingStaffPhoto=true;
  const photoRevision=editRevision;
  const sameAccount=()=>photo.accountId&&String(window.MoshApi?.user?.id||'')===photo.accountId;
  let uploadedKey='',profileId='';
  try{
   const result=await oldSaveStaff.apply(this,arguments);
   if(result!==true)return result;
   profileId=String(id||hrStaffEditingId||'');
   await MoshApi.flush();
   if(!sameAccount())return false;
   const profile=getStaffProfileById(profileId);
   if(!profile)throw new Error('تعذر تحديد ملف الموظف.');
   const oldKey=profile.photoKey, key='staff_photo_'+crypto.randomUUID();
   const updatedAt=new Date().toISOString();
   await storeAttachmentRecord({key,kind:'staff_photo',scope:'staff_photo',staffId:profileId,
    name:photo.file.name||'profile.jpg',type:photo.file.type||'image/jpeg',size:photo.file.size,blob:photo.file,createdAt:updatedAt});
   uploadedKey=key;
   if(!sameAccount())return false;
   const current=getStaffProfileById(profileId);
   if(!current)throw new Error('تعذر ربط الصورة بملف الموظف.');
   Object.assign(current,{photoKey:key,photoName:photo.file.name||'profile.jpg',photoUpdatedAt:updatedAt});
   await Promise.resolve(save());
   uploadedKey='';
   if(pendingStaffPhoto===photo)pendingStaffPhoto=null;
   if(sameAccount()&&editRevision===photoRevision&&String(hrStaffEditingId||'')===profileId&&q('#r14StaffPhotoInput')){
    setDirty(false);
    renderStaffWorkflowConfig();
   }
   if(sameAccount()&&oldKey&&oldKey!==key)await removeAttachmentRecord(oldKey).catch(()=>{});
   window.r14HydrateStaffPhotos?.();
   return result;
  }catch(error){
   if(sameAccount()){
    if(uploadedKey)await removeAttachmentRecord(uploadedKey).catch(()=>{});
    if(pendingStaffPhoto===photo&&String(hrStaffEditingId||'')===profileId){
     const input=q('#r14StaffPhotoInput');
     if(input){photo.input=input;showStaffPhotoPreview(photo);}
    }
    window.MoshUI19?.toast('تعذر حفظ صورة الموظف. '+(error?.message||'أعد المحاولة.'));
   }
   return false;
  }finally{savingStaffPhoto=false;}
 };
}

/* Add profile-photo markers to the most visible name/avatar areas. */
function markKnownAvatars(){
 const profiles=Array.isArray(state?.staffProfiles)?state.staffProfiles:[];
 qa('.hr-profile-shell').forEach(shell=>{const name=text(q('.hr-profile-hero-main h3',shell));const p=profiles.find(x=>String(x.name||'')===name);const av=q('.hr-profile-avatar',shell);if(p&&av)av.dataset.r14StaffId=String(p.id);});
 qa('.task-chat-side-meta').forEach(meta=>{const name=text(q('.who',meta));const p=profiles.find(x=>String(x.name||'')===name);if(p&&!meta.querySelector('.r14-chat-avatar')){const av=document.createElement('span');av.className='r14-avatar r14-chat-avatar';av.dataset.r14StaffId=String(p.id);av.textContent=(name||'؟').trim().charAt(0);meta.prepend(av);}});
 window.r14HydrateStaffPhotos?.();
}

/* Historical daily log: existing backend already supports arbitrary date; add quick previous/next navigation. */
function enhanceWorkdayLog(){const date=q('#wd50LogDate');if(!date||q('[data-r14-day-prev]'))return;const prev=document.createElement('button'),next=document.createElement('button');prev.type=next.type='button';prev.className=next.className='btn';prev.dataset.r14DayPrev='';next.dataset.r14DayNext='';prev.textContent='اليوم السابق';next.textContent='اليوم التالي';date.parentElement?.after(next,prev);const move=delta=>{const d=new Date((date.value||new Date().toISOString().slice(0,10))+'T12:00:00');d.setDate(d.getDate()+delta);const v=d.toISOString().slice(0,10),today=new Date().toISOString().slice(0,10);if(v>today)return;date.value=v;date.dispatchEvent(new Event('change',{bubbles:true}));};prev.onclick=()=>move(-1);next.onclick=()=>move(1);}

/* Human-friendly chat timestamps: keep exact title, make date/time readable. */
if(typeof window.taskChatSideMetaHtml==='function'){
 window.taskChatSideMetaHtml=function(item){const raw=String(item?.time||'').trim(),m=raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);const name=typeof esc==='function'?esc(item?.by||'-'):(item?.by||'-');if(!m)return '<div class="task-chat-side-meta"><span class="who">'+name+'</span><span class="date">'+raw+'</span></div>';const now=new Date(),iso=m[1]+'-'+m[2]+'-'+m[3],today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');const yesterday=new Date(now);yesterday.setDate(now.getDate()-1);const yi=[yesterday.getFullYear(),String(yesterday.getMonth()+1).padStart(2,'0'),String(yesterday.getDate()).padStart(2,'0')].join('-');const day=iso===today?'اليوم':iso===yi?'أمس':m[3]+'/'+m[2]+'/'+m[1];return '<div class="task-chat-side-meta" title="'+raw+'"><span class="who">'+name+'</span><span class="date">'+day+'</span><span class="clock">'+m[4]+':'+m[5]+'</span></div>';};
}

/* HR-owned handbook and unified comms labels. */
function relocateHandbook(){const nav=q('#instructionsNavLink');if(nav)nav.style.display='none';const dash=q('#instructionsDashboardCard');if(dash)dash.style.display='none';const hrNav=q('#hrProNav');if(hrNav&&!q('#hrHandbookTab',hrNav)){const b=document.createElement('button');b.id='hrHandbookTab';b.type='button';b.textContent='دليل وسياسات الموارد البشرية';b.onclick=()=>{if(typeof goApp==='function')goApp('instructions',b)};const reports=hrNav.querySelector('[data-hr-view="reports"]');hrNav.insertBefore(b,reports||hrNav.lastElementChild);}const title=q('#instructionsApp .hb17-kicker');if(title&&title.textContent!=='MOSH GROUP / HR HANDBOOK')title.textContent='MOSH GROUP / HR HANDBOOK';const h=q('#instructionsApp .hb17-top h1');if(h&&h.textContent!=='دليل وسياسات الموارد البشرية')h.textContent='دليل وسياسات الموارد البشرية';}

/* Wisdom brand must use MOSH gold. */
function fixWisdom(){qa('[class*="wisdom"]',document).forEach(box=>{qa('*',box).forEach(el=>{if(text(el)==='MOSH GROUP')el.style.color='var(--gold,#d4af37)'})})}

/* Shared official paper helper for all modules that choose to print through it. */
window.MoshStationery={
 printCss:'.r14-stationery{position:relative;background:#fff;color:#111;min-height:270mm;padding:24mm 14mm 20mm;box-sizing:border-box}.r14-stationery:before{content:"MOSH GROUP";position:absolute;left:50%;top:48%;transform:translate(-50%,-50%) rotate(-25deg);font:900 50px Arial,sans-serif;letter-spacing:4px;color:rgba(190,150,45,.075);pointer-events:none;white-space:nowrap}.r14-stationery-header{position:absolute;top:7mm;left:14mm;right:14mm;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #c5a44e;padding-bottom:4mm}.r14-stationery-header div{display:grid;gap:2px}.r14-stationery-header b{font-size:18px;color:#a27d22}.r14-stationery-header span,.r14-stationery-footer{font-size:10px;color:#666}.r14-stationery-content{position:relative;z-index:1}.r14-stationery-footer{position:absolute;bottom:6mm;left:14mm;right:14mm;border-top:1px solid #c5a44e;padding-top:3mm;display:flex;justify-content:space-between;gap:10px}@media print{.r14-stationery,.r14-stationery:before,.r14-stationery-header,.r14-stationery-footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}}',
 wrap(content,title='مستند رسمي'){return '<section class="r14-stationery"><header class="r14-stationery-header"><div><b>MOSH GROUP</b><span>'+title+'</span></div><span>'+new Date().toLocaleDateString('ar-SY')+'</span></header><div class="r14-stationery-content">'+content+'</div><footer class="r14-stationery-footer"><span>MOSH GROUP · مستند صادر من MOSH ERP</span><span>نسخة ملونة صالحة للطباعة الملونة، ومتوازنة للأبيض والأسود</span></footer></section>';}
};

function installStationeryWrappers(){
 ['buildSalesReportDocument','buildServiceContractDocument'].forEach(name=>{const fn=window[name];if(typeof fn!=='function'||fn.__r14Stationery)return;const wrapped=function(){const html=fn.apply(this,arguments);return /r14-stationery/.test(String(html))?html:MoshStationery.wrap(html,name==='buildServiceContractDocument'?'عقد':'تقرير');};wrapped.__r14Stationery=true;window[name]=wrapped;});
 if(window.MoshV16&&typeof MoshV16.previewPrint==='function'&&!MoshV16.previewPrint.__r14Stationery){const fn=MoshV16.previewPrint;const wrapped=function(html){return fn.call(this,/r14-stationery/.test(String(html))?html:MoshStationery.wrap(html,'مستند الموارد البشرية'));};wrapped.__r14Stationery=true;MoshV16.previewPrint=wrapped;}
}

/* Observe re-rendered areas because this app replaces large HTML blocks. */
let scheduled=false;const decorate=()=>{scheduled=false;relocateHandbook();fixWisdom();enhanceWorkdayLog();markKnownAvatars();installStationeryWrappers();};
const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(decorate)};
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',schedule);setTimeout(schedule,100);setTimeout(schedule,1000);

window.MoshR14Polish={version:'14.1',requestUnsavedExit,isEditorControl,decorate};
})();
