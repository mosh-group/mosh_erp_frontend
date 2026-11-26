/* MOSH Task Inbox R19 with server-confirmed return attachments.
 * Files upload through the authenticated application API;
 * the return event, attachment records and chat messages commit together.
 */
(function () {
  'use strict';
  const model=window.MoshReceiptModel49;
  const list=v=>Array.isArray(v)?v:[], text=v=>String(v==null?'':v).trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=id=>document.getElementById(id);
  const depMap={'الإدارة':'admin','الموارد البشرية':'hr','المبيعات':'sales','التسويق':'marketing','السوشال ميديا':'social','السوشل ميديا':'social','قسم السوشال ميديا':'social','التصميم':'design','التصوير':'photo','المونتاج':'editing','الترويج':'promotion','اللوجستيات':'logistics','المشتريات':'purchases','المحاسبة':'accounting','المستودعات العامة':'warehouses','المستودعات':'warehouses','MOSH MEDIA':'platform'};
  const busy=new Set(), errors=new Map();
  let homeTab='',homeOwner='',homeQuery='';
  let cardSignature='',listSignature='',listTab='all',listQuery='',listPage=1,previousFocus=null,refreshBusy=false,lastRefresh=0,refreshError='';
  let tracking={owner:'',rows:[],loading:false,error:''};
  let receiptNoticeOwner='';
  const user=()=>window.MoshAuth37?.current?.()||null;
  function canTrackMarketing(){
    const account=user(),auth=window.MoshAuth37;
    if(!account?.employeeId||!auth?.canModule?.('marketing','view'))return false;
    const manager=typeof getDepartmentManager==='function'?getDepartmentManager('التسويق'):null;
    return auth.departmentApp?.(account.department)==='marketing'||String(manager?.id||'')===String(account.employeeId);
  }
  const task=id=>list(state.salesTasks).find(t=>String(t.id)===String(id))||null;
  const app=t=>depMap[text(t?.sharedDepartment||t?.department)]||window.MoshAuth37?.departmentApp?.()||'';
  const mine=t=>!!t&&!!user()&&!!window.MoshEmployeeTasks41?.isMine?.(t);
  const allowed=(t,action)=>!!user()&&!!app(t)&&!!window.MoshAuth37?.canModule?.(app(t),action);
  function myRows(){return list(state.salesTasks).filter(t=>mine(t)&&['new','active','review'].includes(model.category(t)));}
  function groups(){return model.group(myRows());}
  function fmtDate(value){if(!value)return '—';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('ar-SY',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):text(value);}
  function setStatusError(id,value){if(value)errors.set(String(id),value);else errors.delete(String(id));}
  function finishMessage(t){
    if(t?.department==='المهمات'&&t.employeeState==='finished')return 'تم إنهاء المهمة وإرسالها إلى المهمات للمتابعة.';
    if(t?.status==='awaiting_invoice')return 'تم إنهاء المهمة. بانتظار الفوترة.';
    if(t?.employeeState==='finished'&&t.status==='in_progress')return 'تم إنهاء المهمة في القسم الحالي.';
    if(t?.employeeState==='finished'||t?.status==='completed')return 'تم إنهاء المهمة.';
    if(t?.employeeState==='submitted')return t.reviewManager
      ? `تم إرسال المهمة إلى ${t.reviewManager} للاعتماد.`
      : 'تم إرسال المهمة لمراجعة مدير القسم.';
    return '';
  }
  function cyclePanel(t){
    const evs=model.events(t),cycle=model.currentCycle(t),reason=model.reason(t);
    const returned=t.returnedForRevision?'<div class="mr49-return-note"><b>↩ مُعادة من المدير'+(model.category(t)==='new'?' — يلزم استلامها مجدداً':'')+'</b><p>'+esc(reason||'تعديلات مطلوبة. راجع ملاحظات المدير في سجل المهمة.')+'</p></div>':'';
    const labels={return:'إعادة من المدير',receive:'تم استلام المهمة',start:'بدء التنفيذ',pause:'إيقاف مؤقت',submit:'إرسال للمراجعة'};
    const rows=evs.map(e=>'<li><div><b>'+labels[e.kind]+'</b><span>'+esc(e.message.by||'')+'</span></div><time>'+esc(fmtDate(e.message.time))+'</time>'+(e.kind==='return'?'<p>'+esc(text(e.message.text).split('المطلوب تعديله:').slice(1).join('المطلوب تعديله:').trim())+'</p>':'')+'</li>').join('');
    return returned+'<div class="mr49-cycle-hint">دورة الاستلام '+cycle.number+' · الاستلام لا يبدأ مؤقّت التنفيذ.</div>'+(evs.length?'<details class="mr49-history"><summary>سجل الاستلام والتعديلات ('+evs.length+')</summary><ol>'+rows+'</ol><small>الأوقات والأسماء المعروضة هي القيم المحفوظة التي أعادها الخادم. السجل السابق للمهمة محفوظ أيضاً.</small></details>':'');
  }
  function actionHtml(t){
    const id=String(t.id), group=model.category(t), st=text(t.employeeState)||'new';
    let html='';
    if(!mine(t)) html='<p class="emp48-note warn">تنفيذ المهمة متاح للموظف المسندة إليه فقط.</p>';
    else if(!allowed(t,'status'))html='<p class="emp48-note warn">صلاحية تغيير الحالة غير مفعّلة لهذا الحساب.</p>';
    else if(t.status!=='in_progress')html='<p class="emp48-note">المهمة ليست متاحة للتنفيذ حالياً.</p>';
    else if(busy.has(id)) html='<p class="emp48-note" role="status">جارٍ الحفظ على الخادم…</p>';
    else if(group==='new')html='<button type="button" class="emp48-btn primary" data-emp48-action="receive">✓ تم استلام المهمة</button>';
    else if(group==='review')html='<p class="emp48-wait">أرسلت المهمة للمراجعة؛ ليست ضمن مهامك الجارية. إذا أُعيدت لك ستظهر في «مهام جديدة».</p>';
    else if(group==='active') {
      if(st==='working')html='<button type="button" class="emp48-btn pause" data-emp48-action="pause">إيقاف مؤقت</button><button type="button" class="emp48-btn finish" data-emp48-action="finish">إنهاء المهمة</button>';
      else {
        const first=model.label(t).includes('بانتظار البدء');
        html='<button type="button" class="emp48-btn primary" data-emp48-action="start">'+(first?'بدء المهمة':'استئناف المهمة')+'</button>';
        if(st==='paused'&&!first)html+='<button type="button" class="emp48-btn finish" data-emp48-action="finish">إنهاء المهمة</button>';
      }
    } else html='<p class="emp48-note">انتهت مرحلة تنفيذ هذه المهمة.</p>';
    const error=errors.get(id);
    return (error?'<div class="mr49-error" role="alert">'+esc(error)+'</div>':'')+html;
  }
  function validateOwn(t){
    if(!mine(t)||!allowed(t,'view')||!allowed(t,'details')||!allowed(t,'status'))throw new Error('لا تملك صلاحية تنفيذ هذه المهمة.');
    if(t.status!=='in_progress')throw new Error('حالة المهمة تغيّرت؛ حدّث قائمة المهام.');
  }
  async function perform(kind,id){
    id=String(id);if(busy.has(id))return false;
    const t=task(id);if(!t)return false;
    const sourceDepartment=t.department;
    const action=kind==='finish'?'submit':kind;
    let detail='';
    let saved;
    try{
      validateOwn(t);
      if(action==='submit'&&!confirm('تأكيد إنهاء تنفيذ المهمة؟'))return false;
      if(action==='pause'){const answer=prompt('سبب الإيقاف المؤقت (اختياري):','');if(answer===null)return false;detail=text(answer);}
      busy.add(id);setStatusError(id,'');window.MoshTaskWorkspace08?.schedule();window.MoshEmployeeTaskWorkflow48?.render?.(true);
      saved=await MoshApi.commitTask(id, fresh=>{
        validateOwn(fresh);
        const category=model.category(fresh),st=text(fresh.employeeState)||'new',patch={};
        if(action==='receive'){
          if(category!=='new')throw new Error('تم استلام هذه الدورة مسبقاً.');
          // First delivery changes state. A return uses its persisted receipt event,
          // without an unsupported paused -> received server transition.
          if(st==='new')patch.employeeState='received';
        }else if(action==='start'){
          if(category==='new')throw new Error('اضغط «تم استلام المهمة» قبل بدء التنفيذ.');
          if(category!=='active'||!['received','paused'].includes(st))throw new Error('المهمة ليست بانتظار البدء.');
          if(fresh.workTiming?.activity?.pendingIdle)throw new Error('صنّف فترة الخمول من تفاصيل المهمة أولاً.');
          patch.employeeState='working';
        }else if(action==='pause'){
          if(category!=='active'||st!=='working')throw new Error('المهمة ليست قيد التنفيذ.');
          patch.employeeState='paused';
        }else if(action==='submit'){
          if(category!=='active'||!['working','paused'].includes(st))throw new Error('ابدأ تنفيذ المهمة قبل إرسالها للمراجعة.');
          if(model.label(fresh).includes('بانتظار البدء'))throw new Error('هذه الدورة مستلمة ولم يبدأ تنفيذها بعد.');
          patch.employeeState='submitted';patch.returnedForRevision=false;
          patch.reviewManager=typeof getDirectManagerName==='function'?getDirectManagerName(fresh.assignee,fresh.department):'';
        }else throw new Error('إجراء غير معروف.');
        patch.workChat=[...list(fresh.workChat),model.message(action,fresh,user()?.name||user()?.username,detail)];
        return patch;
      });
      if(action==='submit')window.MoshUI19?.toast?.(finishMessage(saved)||'تم حفظ إجراء المهمة.');
      return true;
    }catch(error){
      setStatusError(id,error.status===409?'تغيّرت المهمة على الخادم. أغلقها وحدّث المهام قبل المحاولة مجدداً.':error.message||'تعذر حفظ الإجراء. لم يتم تأكيد أي تغيير.');
      return false;
    }finally{
      busy.delete(id);window.MoshTaskWorkspace08?.schedule();cardSignature='';listSignature='';renderHome();renderList();
      const overlay=window.MoshEmployeeTaskOverlay47;
      if(String(overlay?.current?.()?.id||'')===id){
        if(saved&&action==='submit'&&(saved.department!==sourceDepartment||saved.status!=='in_progress'))overlay.close();
        else {overlay.open(id);setTimeout(()=>window.MoshEmployeeTaskWorkflow48?.render?.(true),0);}
      }
    }
  }
  function canReturn(t){return !!t&&!!user()&&allowed(t,'approve')&&allowed(t,'view')&&t.status==='in_progress'&&t.employeeState==='submitted'&&!!text(t.assignee);}
  const RETURN_FILE_LIMIT=5; // Existing count limit; size validation is shared with task attachments.
  let returnFiles=[],returnDraftId='',returnOwner='',returnCommitted=false,returnAttempt=null;
  const returnUid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  const returnFileFingerprint=f=>[f.name,f.size,f.lastModified||0].join('|');
  function returnFileIssue(file){
    if(!file||!file.name)return 'الملف غير صالح.';
    if((Number(file.size)||0)<=0)return 'الملف فارغ.';
    if(typeof validateTaskAttachmentFile!=='function')return 'تعذر التحقق من نوع المرفق.';
    return validateTaskAttachmentFile(file);
  }
  function returnSnapshot(d){
    return JSON.stringify(Array.from(d.querySelectorAll('input:not([type=search]),textarea,select,[contenteditable=true]')).map(el=>[el.name||el.id,el.type==='checkbox'||el.type==='radio'?el.checked:el.type==='file'?Array.from(el.files||[]).map(f=>[f.name,f.size]):el.value??el.textContent]));
  }
  function returnError(message){const box=$('mr49ReturnError');if(box){box.textContent=message||'';box.hidden=!message;}}
  function returnProgress(message){const box=$('mr49ReturnProgress');if(box){box.textContent=message||'';box.hidden=!message;}}
  function fileSize(bytes){return typeof formatAttachmentSize==='function'?formatAttachmentSize(bytes):(Number(bytes)/1024/1024).toFixed(1)+' MB';}
  function renderReturnFiles(){
    const d=$('mr49ReturnDialog'),box=$('mr49ReturnFileList');if(!d||!box)return;
    const locked=busy.has(d.dataset.taskId)||!!returnAttempt?.uncertain,t=task(d.dataset.taskId),canAttach=!!t&&allowed(t,'attachments');
    box.innerHTML=returnFiles.length?returnFiles.map(entry=>'<li><div><b>'+esc(entry.file.name)+'</b><small>'+esc(fileSize(entry.file.size))+' · '+(entry.uploadedKey?'جاهز للإرسال مع الإعادة':entry.uploading?'جارٍ رفع الملف…':'بانتظار الإرسال')+'</small></div><button type="button" data-mr49-return-remove="'+esc(entry.id)+'" '+(locked?'disabled':'')+' aria-label="إزالة '+esc(entry.file.name)+'">إزالة</button></li>').join(''):'<li class="mr49-return-files-empty">لا توجد مرفقات محددة.</li>';
    const marker=$('mr49ReturnFileState');if(marker)marker.value=JSON.stringify(returnFiles.map(entry=>[entry.id,entry.file.name,entry.file.size]));
    const count=$('mr49ReturnFileCount');if(count)count.textContent=returnFiles.length+' / '+RETURN_FILE_LIMIT;
    const pick=$('mr49ReturnFilePick');if(pick)pick.disabled=locked||!canAttach||returnFiles.length>=RETURN_FILE_LIMIT;
    const input=$('mr49ReturnFiles');if(input)input.disabled=locked||!canAttach;
    const note=$('mr49ReturnFilePermission');if(note)note.hidden=canAttach;
  }
  function addReturnFiles(files){
    const d=$('mr49ReturnDialog'),t=task(d?.dataset.taskId);
    if(!d?.open||busy.has(d.dataset.taskId)||returnAttempt?.uncertain)return false;
    if(!canReturn(t)||String(user()?.id||'')!==returnOwner||!allowed(t,'attachments')){returnError('لا تملك صلاحية إضافة مرفقات إلى إعادة هذه المهمة.');return false;}
    const seen=new Set(returnFiles.map(entry=>returnFileFingerprint(entry.file)));
    const selected=Array.from(files||[]).filter(file=>{const k=returnFileFingerprint(file);if(seen.has(k))return false;seen.add(k);return true;});
    if(returnFiles.length+selected.length>RETURN_FILE_LIMIT){returnError('يمكن إرفاق 5 ملفات كحد أقصى مع الإعادة. لديك '+returnFiles.length+' مرفقات محددة.');return false;}
    const errors=selected.map(file=>{const issue=returnFileIssue(file);return issue?(file.name||'مرفق')+': '+issue:'';}).filter(Boolean);
    if(errors.length){returnError(errors.join('\n'));return false;}
    selected.forEach(file=>returnFiles.push({id:returnUid(),file,uploadedKey:'',uploadKey:'',uploadAttempted:false,uploading:false}));
    returnError('');renderReturnFiles();return true;
  }
  function releaseReturnFiles(entries){
    // Remove only binaries uploaded for this unsent draft. The file endpoint
    // protects binaries referenced by a confirmed task record.
    if(returnCommitted)return;
    const cleanupOwner=returnOwner;
    const referenced=key=>list(state.salesTasks).some(t=>list(t.attachments).some(a=>a.key===key)||list(t.workChat).some(m=>m.attachmentKey===key));
    for(const entry of entries){
      // A lost task acknowledgement may already have linked these files. Keep
      // them until the same return event is resolved, even if the dialog closes.
      if(returnAttempt?.uncertain&&returnAttempt.selected.includes(entry))continue;
      const key=entry.uploadedKey||entry.uploadKey;
      if(!entry.uploadAttempted||!key||returnOwner!==String(user()?.id||'')||referenced(key)||!window.MoshApi?.request)continue;
      // DELETE refuses linked files; do not queue a future linked-file removal.
      Promise.resolve().then(async()=>{
        if(cleanupOwner!==String(user()?.id||''))return;
        if(!entry.uploadedKey){
          const saved=await MoshApi.request('/files/'+encodeURIComponent(key));
          if(!saved||String(saved.key)!==key||saved.name!==entry.file.name||Number(saved.size)!==Number(entry.file.size))return;
        }
        if(cleanupOwner!==String(user()?.id||''))return;
        await MoshApi.request('/files/'+encodeURIComponent(key),{method:'DELETE'});
      }).catch(()=>{});
    }
  }
  function closeReturn(){
    const d=$('mr49ReturnDialog');if(!d||busy.has(d.dataset.taskId))return;
    if(window.MoshPreview19?.close){MoshPreview19.close(d.id);return;}
    const dirty=text($('mr49ReturnReason')?.value)||returnFiles.length;
    if(dirty&&!confirm('الخروج دون إرسال سبب الإعادة والمرفقات المحددة؟'))return;
    d.close();
  }
  function setReturnBusy(locked){
    const d=$('mr49ReturnDialog');if(!d)return;
    d.setAttribute('aria-busy',String(locked));
    $('mr49ReturnSave').disabled=locked;$('mr49ReturnReason').disabled=locked||!!returnAttempt?.uncertain;
    d.querySelectorAll('[data-mr49-return-close]').forEach(button=>{button.disabled=locked;});
    if(!locked)$('mr49ReturnSave').textContent=returnAttempt?.uncertain?'التحقق وإعادة المحاولة':'إعادة للموظف';
    renderReturnFiles();
  }
  function ensureReturn(){
    let d=$('mr49ReturnDialog');if(d)return d;
    d=document.createElement('dialog');d.id='mr49ReturnDialog';d.className='mr49-dialog';d.dir='rtl';
    d.innerHTML='<form id="mr49ReturnForm"><header><div><small>مراجعة مدير القسم</small><h3>إعادة المهمة للموظف</h3></div><button type="button" data-mr49-return-close aria-label="إغلاق">×</button></header><div class="mr49-dialog-content"><p id="mr49ReturnMeta"></p><label for="mr49ReturnReason">ما المطلوب تعديله؟ <b>*</b></label><textarea id="mr49ReturnReason" rows="5" required maxlength="2000" placeholder="اكتب التعديلات المطلوبة بوضوح…"></textarea><section class="mr49-return-files"><div class="mr49-return-files-head"><div><b>مرفقات الإعادة</b><span id="mr49ReturnFileCount">0 / 5</span></div><button type="button" id="mr49ReturnFilePick">+ إضافة مرفقات</button></div><p class="mr49-return-files-help">صور، فيديو، صوت، مستندات وملفات تصميم · حتى 5 ملفات. لا سقف 25 ميغابايت؛ السعة الفعلية بحسب الخادم.</p><input id="mr49ReturnFiles" type="file" multiple hidden><input id="mr49ReturnFileState" type="hidden" value="[]"><ul id="mr49ReturnFileList"></ul><p id="mr49ReturnFilePermission" class="mr49-help" hidden>صلاحية إضافة المرفقات غير مفعّلة لهذا الحساب.</p></section><p class="mr49-help">سترجع إلى «مهام جديدة»، وعلى الموظف تأكيد استلامها مجدداً. ستظهر المرفقات مع سبب الإعادة في محادثة المهمة، ويبقى سجل التنفيذ السابق محفوظاً.</p><p id="mr49ReturnProgress" class="mr49-return-progress" role="status" aria-live="polite" hidden></p><p id="mr49ReturnError" class="mr49-error" role="alert" hidden></p></div><footer><button type="button" data-mr49-return-close>إلغاء</button><button class="mr49-primary" type="submit" id="mr49ReturnSave">إعادة للموظف</button></footer></form>';
    document.body.appendChild(d);
    d.querySelector('form').addEventListener('submit',saveReturn);
    $('mr49ReturnFilePick').addEventListener('click',()=>{if(!busy.has(d.dataset.taskId)&&!returnAttempt?.uncertain)$('mr49ReturnFiles').click();});
    $('mr49ReturnFiles').addEventListener('change',e=>{addReturnFiles(e.target.files);e.target.value='';});
    $('mr49ReturnFileList').addEventListener('click',e=>{
      const button=e.target.closest('[data-mr49-return-remove]');if(!button||busy.has(d.dataset.taskId)||returnAttempt?.uncertain)return;
      e.preventDefault();const entry=returnFiles.find(x=>x.id===button.dataset.mr49ReturnRemove);if(!entry)return;
      returnFiles=returnFiles.filter(x=>x!==entry);releaseReturnFiles([entry]);renderReturnFiles();returnError('');
    });
    d.addEventListener('cancel',e=>{e.preventDefault();if(!busy.has(d.dataset.taskId))closeReturn();});
    d.addEventListener('close',()=>{
      if(d.open)return; // A queued close event must not erase a newly opened draft.
      if(returnAttempt?.uncertain&&returnOwner===String(user()?.id||'')){
        // Keep the immutable draft in memory. The next return action resumes
        // verification before allowing a different return to be prepared.
        d._r19TrackDirty=false;return;
      }
      if(!returnCommitted)releaseReturnFiles(returnFiles);
      returnFiles=[];returnOwner='';returnDraftId='';returnCommitted=false;returnAttempt=null;d._r19TrackDirty=false;
      $('mr49ReturnFiles').value='';renderReturnFiles();
    });
    return d;
  }
  function requestReturn(id,containerId,department){
    if(returnAttempt?.uncertain){
      if(returnOwner===String(user()?.id||'')){
        const pending=ensureReturn();$('mr49ReturnReason').value=returnAttempt.reason;
        pending._r19TrackDirty=true;setReturnBusy(false);
        returnError('لم يصل تأكيد الإعادة السابقة. تحقق من نتيجتها قبل تجهيز إعادة أخرى. السبب والمرفقات محفوظة في هذا النموذج.');
        if(!pending.open)pending.showModal();$('mr49ReturnSave').focus();return true;
      }
      // Never expose a previous account's pending draft to another identity.
      returnFiles=[];returnDraftId='';returnOwner='';returnCommitted=false;returnAttempt=null;
      const previous=$('mr49ReturnDialog');if(previous?.open){previous._r19TrackDirty=false;previous._r19AfterSave=null;previous.close();}
    }
    const t=task(id);if(!canReturn(t)){if(typeof toast==='function')toast('هذه المهمة ليست بانتظار مراجعتك أو لا تملك صلاحية اعتمادها.',true);return false;}
    const d=ensureReturn();
    if(d.open&&String(d.dataset.taskId)===String(id)){$('mr49ReturnReason').focus();return true;}
    if(d.open&&busy.has(d.dataset.taskId))return false;
    const show=()=>{
      if(returnFiles.length)releaseReturnFiles(returnFiles);
      returnFiles=[];returnDraftId=returnUid();returnOwner=String(user()?.id||'');returnCommitted=false;returnAttempt=null;
      d.dataset.taskId=String(id);d.dataset.container=containerId||'';d.dataset.department=department||t.department||'';
      $('mr49ReturnMeta').textContent=(t.title||'مهمة')+' · '+(t.customer||'')+' · الموظف: '+t.assignee;
      $('mr49ReturnReason').value='';$('mr49ReturnFiles').value='';returnError('');returnProgress('');setReturnBusy(false);
      d._r19TrackDirty=true;d._r19Initial=returnSnapshot(d);
      if(!d.open)d.showModal();$('mr49ReturnReason').focus();
    };
    if(d.open&&window.MoshPreview19?.guard)MoshPreview19.guard(d,show);else show();return true;
  }
  function returnTarget(t){
    const cycle=model.currentCycle(t);
    return JSON.stringify([String(t?.id||''),text(t?.assignee),text(t?.assigneeId),text(t?.department),text(t?.sharedDepartment),String(cycle.key||''),Number(cycle.number||0)]);
  }
  function sameReturnIdentity(attempt){return returnAttempt===attempt&&returnDraftId===attempt.draft&&returnOwner===attempt.owner&&String(user()?.id||'')===attempt.owner;}
  function matchingReturn(t,attempt){
    if(!t||!attempt.message)return 'absent';
    const events=list(t.workChat).filter(message=>String(message.id)===attempt.message.id);
    if(!events.length)return 'absent';
    if(events.length!==1)return 'conflict';
    const found=events[0],keys=value=>list(value).map(String).sort().join('\n');
    // Server timestamps/other task state may have advanced since this return.
    // The stable event and its original body/attachment keys identify the action.
    return text(found.text)===text(attempt.message.text)&&keys(found.attachmentKeys)===keys(attempt.message.attachmentKeys)?'confirmed':'conflict';
  }
  async function verifyReturn(attempt){
    if(!sameReturnIdentity(attempt))throw new Error('تغير حساب المراجعة. افتح المهمة من الحساب المختص.');
    let fresh=null,detailsVerified=false;
    try{
      if(typeof MoshApi.refreshTaskDetails==='function'){
        fresh=await MoshApi.refreshTaskDetails(attempt.id);
        detailsVerified=!!fresh&&typeof fresh==='object'&&String(fresh.id)===attempt.id;
      }
    }catch(error){
      if([401,403,404,419].includes(error?.status))throw error;
      // The existing timing-only refresh rejects a changed task version. Read
      // that version directly, then reconcile through the safe task refresh.
    }
    if(!detailsVerified)fresh=await MoshApi.request('/tasks/'+encodeURIComponent(attempt.id));
    if(!sameReturnIdentity(attempt))throw new Error('تغير حساب المراجعة. افتح المهمة من الحساب المختص.');
    if(!fresh||String(fresh.id)!==attempt.id||!Number.isFinite(Number(fresh._version)))throw new Error('تعذر التحقق من آخر بيانات المهمة. أعد المحاولة.');
    const outcome=matchingReturn(fresh,attempt);
    if(outcome==='conflict')throw Object.assign(new Error('وجد النظام حدث الإعادة نفسه ببيانات مختلفة. راجع سجل المهمة قبل المتابعة.'),{returnConflict:true});
    let synced=detailsVerified&&Number(task(attempt.id)?._version)===Number(fresh._version);
    if(outcome==='confirmed')synced=synced&&matchingReturn(task(attempt.id),attempt)==='confirmed';
    if(!synced&&typeof MoshApi.hydrateTaskFamily==='function'){
      try{synced=await MoshApi.hydrateTaskFamily(attempt.id)===true;}catch(error){if(outcome!=='confirmed')throw error;}
    }
    if(!sameReturnIdentity(attempt))throw new Error('تغير حساب المراجعة. افتح المهمة من الحساب المختص.');
    if(outcome==='confirmed')return {confirmed:true,task:fresh,synced};
    if(!synced)throw new Error('تعذر تحديث المهمة بأمان. احفظ تعديلات المهام المفتوحة ثم تحقق من الإعادة مجدداً.');
    return {confirmed:false,task:task(attempt.id)||fresh,synced:true};
  }
  async function uploadReturnFile(entry,attempt){
    if(entry.uploadedKey)return entry.uploadedKey;
    if(!entry.uploadKey)entry.uploadKey='task_'+attempt.id+'_return_'+attempt.draft+'_'+entry.id;
    if(!entry.createdAt)entry.createdAt=new Date().toISOString();
    const metadata=async()=>{
      const saved=await MoshApi.request('/files/'+encodeURIComponent(entry.uploadKey));
      if(!sameReturnIdentity(attempt))throw new Error('تغير حساب المراجعة أثناء رفع المرفق.');
      if(!saved||String(saved.key)!==entry.uploadKey||saved.name!==entry.file.name||Number(saved.size)!==Number(entry.file.size))throw new Error('تعذر التحقق من بيانات المرفق. أزل الملف ثم أضفه من جديد.');
      entry.uploadedKey=entry.uploadKey;return entry.uploadedKey;
    };
    if(entry.uploadAttempted){
      try{return await metadata();}catch(error){if(error.status!==404)throw error;}
    }
    entry.uploadAttempted=true;
    try{
      const uploaded=await MoshApi.upload({key:entry.uploadKey,taskId:attempt.id,name:entry.file.name,type:entry.file.type||'application/octet-stream',size:entry.file.size,blob:entry.file,createdAt:entry.createdAt});
      if(!sameReturnIdentity(attempt))throw new Error('تغير حساب المراجعة أثناء رفع المرفق.');
      if(typeof uploaded!=='string'||uploaded!==entry.uploadKey)throw new Error('لم يؤكد النظام حفظ المرفق.');
      entry.uploadedKey=uploaded;return uploaded;
    }catch(error){
      if(error.network||error.status===409||error.status>=500||!Number.isFinite(error.status)){
        try{return await metadata();}catch(verifyError){
          // A metadata mismatch must never link an unrelated binary. A failed
          // lookup preserves the same upload key for the next explicit retry.
          if(!verifyError.status&&!verifyError.network)throw verifyError;
        }
      }
      throw error;
    }
  }
  function finishReturn(attempt,synced=true){
    const d=$('mr49ReturnDialog');if(!sameReturnIdentity(attempt)||!d)return false;
    attempt.confirmed=true;attempt.uncertain=false;returnCommitted=true;d._r19TrackDirty=false;
    const container=d.dataset.container,department=d.dataset.department,afterSave=d._r19AfterSave;
    returnProgress('');
    if(window.MoshPreview19?.close)MoshPreview19.close(d.id,true);else d.close();
    const current=task(attempt.id);
    if(!afterSave&&synced&&current&&container&&$(container)&&typeof openDepartmentTaskDetails==='function')openDepartmentTaskDetails(current.id,container,department);
    if(typeof toast==='function')toast(!synced?'تم تأكيد الإعادة وحفظ مرفقاتها. حدّث قائمة المهام لإظهار آخر حالة محفوظة.':current&&model.category(current)!=='new'?'تم التحقق من الإعادة المحفوظة. الحالة الحالية للمهمة: '+model.label(current)+'.':'أُعيدت المهمة'+(attempt.selected.length?' مع '+attempt.selected.length+' مرفقات':'')+' إلى المهام الجديدة، بانتظار استلام الموظف.');
    return true;
  }
  async function saveReturn(e){
    e.preventDefault();const d=$('mr49ReturnDialog');if(!d?.open)return false;
    const id=String(d.dataset.taskId),who=String(user()?.id||'');if(busy.has(id))return false;
    if(who!==returnOwner){returnError('حساب المراجعة تغيّر. افتح المهمة من الحساب المختص.');return false;}
    let attempt=returnAttempt?.uncertain?returnAttempt:null;
    if(!attempt){
      const reason=text($('mr49ReturnReason').value),current=task(id);
      if(!reason||reason.length>2000){$('mr49ReturnReason').setCustomValidity(!reason?'اكتب سبب الإعادة والتعديلات المطلوبة.':'سبب الإعادة يجب ألا يتجاوز 2000 حرف.');$('mr49ReturnReason').reportValidity();return false;}
      $('mr49ReturnReason').setCustomValidity('');
      if(!canReturn(current)){returnError('حالة المهمة أو حساب المراجعة تغيّر. حدّث المهمة قبل الإعادة.');return false;}
      if(returnFiles.length&&!allowed(current,'attachments')){returnError('لا تملك صلاحية رفع المرفقات لهذه المهمة.');return false;}
      if(returnFiles.length>RETURN_FILE_LIMIT){returnError('يمكن إرفاق 5 ملفات كحد أقصى.');return false;}
      const issues=returnFiles.map(entry=>{const issue=returnFileIssue(entry.file);return issue?entry.file.name+': '+issue:'';}).filter(Boolean);
      if(issues.length){returnError(issues.join('\n'));return false;}
      attempt={id,owner:who,draft:returnDraftId,reason,selected:returnFiles.slice(),target:returnTarget(current),message:null,sent:false,uncertain:false,confirmed:false};
      returnAttempt=attempt;
    }
    const selected=attempt.selected;
    busy.add(id);returnError('');returnProgress('');setReturnBusy(true);
    try{
      if(attempt.uncertain){
        $('mr49ReturnSave').textContent='جارٍ التحقق من الإعادة…';returnProgress('التحقق من نتيجة الإعادة السابقة على الخادم…');
        const verification=await verifyReturn(attempt);
        if(verification.confirmed)return finishReturn(attempt,verification.synced);
        if(!canReturn(verification.task)||returnTarget(verification.task)!==attempt.target){
          attempt.uncertain=false;
          throw Object.assign(new Error('لم توجد هذه الإعادة في السجل، لكن حالة المهمة أو الموظف أو دورة الاستلام تغيّرت. راجع المهمة قبل المتابعة.'),{returnVerifiedAbsent:true});
        }
        // Keep the same reason, event and files when a previous response was
        // lost. Optimistic version checks also prevent two concurrent returns.
      }
      for(let i=0;i<selected.length;i++){
        const entry=selected[i];if(entry.uploadedKey)continue;
        if(!sameReturnIdentity(attempt)||!canReturn(task(id))||returnTarget(task(id))!==attempt.target||!allowed(task(id),'attachments'))throw new Error('تغيّرت صلاحيات الإعادة أثناء تجهيز المرفقات.');
        entry.uploading=true;renderReturnFiles();$('mr49ReturnSave').textContent='جارٍ رفع المرفقات…';returnProgress('رفع المرفق '+(i+1)+' من '+selected.length+': '+entry.file.name);
        try{await uploadReturnFile(entry,attempt);}
        catch(error){throw Object.assign(new Error('تعذر رفع «'+entry.file.name+'»: '+(error?.message||'أعد المحاولة.')),{status:error.status,network:error.network,returnUploadFailure:true});}
        finally{entry.uploading=false;renderReturnFiles();}
      }
      $('mr49ReturnSave').textContent='جارٍ إعادة المهمة…';returnProgress(selected.length?'جارٍ إرسال الإعادة مع '+selected.length+' مرفقات…':'جارٍ إرسال الإعادة…');
      const saved=await MoshApi.commitTask(id,t=>{
        if(!sameReturnIdentity(attempt))throw new Error('حساب المراجعة تغيّر. افتح المهمة من الحساب المختص.');
        if(attempt.message&&matchingReturn(t,attempt)!=='absent')throw Object.assign(new Error('جارٍ التحقق من حدث الإعادة المحفوظ.'),{returnNeedsVerification:true});
        if(!canReturn(t)||returnTarget(t)!==attempt.target)throw new Error('حالة المهمة أو الموظف أو دورة الاستلام تغيّرت؛ حدّث القائمة.');
        if(selected.length&&!allowed(t,'attachments'))throw new Error('لم تعد تملك صلاحية إضافة المرفقات لهذه المهمة.');
        const by=user()?.name||user()?.username;
        if(!attempt.message){
          attempt.message=model.message('return',t,by,attempt.reason,()=>attempt.draft);
          if(selected.length){attempt.message.attachmentKeys=selected.map(entry=>entry.uploadedKey);attempt.message.text+='\nمرفقات الإعادة: '+selected.map(entry=>entry.file.name).join('، ');}
        }
        const returnMessage={...attempt.message,...(attempt.message.attachmentKeys?{attachmentKeys:[...attempt.message.attachmentKeys]}:{})},media=[],attachments=[];
        selected.forEach((entry,i)=>{
          if(!entry.uploadedKey)throw new Error('لم يكتمل رفع كل المرفقات. لم تُرسل الإعادة.');
          const file=entry.file,type=file.type||'application/octet-stream',key=entry.uploadedKey;
          attachments.push({key,name:file.name,type,size:file.size,createdAt:entry.createdAt,returnMessageId:returnMessage.id});
          media.push({id:'MEDIA/RETURN/'+attempt.draft+'/'+i,kind:'media',attachmentKey:key,mediaType:type,name:file.name,size:file.size,by,time:returnMessage.time,createdAt:entry.createdAt,previewDataUrl:'',returnMessageId:returnMessage.id});
        });
        attempt.sent=true;
        return {employeeState:'paused',returnedForRevision:true,reviewManager:'',workChat:[...list(t.workChat),returnMessage,...media],...(attachments.length?{attachments:[...list(t.attachments),...attachments]}:{})};
      });
      if(matchingReturn(saved,attempt)!=='confirmed'){
        const verification=await verifyReturn(attempt);
        if(!verification.confirmed)throw new Error('لم يصل تأكيد الإعادة من الخادم. تحقق من نتيجتها قبل المتابعة.');
        return finishReturn(attempt,verification.synced);
      }
      return finishReturn(attempt,true);
    }catch(error){
      if(attempt.confirmed){if(typeof toast==='function')toast('تمت إعادة المهمة وحفظ مرفقاتها. أعد فتح المهمة لتحديث العرض.');return true;}
      if(!sameReturnIdentity(attempt)){returnError('تغير حساب المراجعة. لم يتم تأكيد نتيجة الإعادة لهذا الحساب.');return false;}
      const definitive=Number.isFinite(error.status)&&error.status>=400&&error.status<500&&error.status!==409;
      const needsVerification=!error.returnUploadFailure&&!error.returnVerifiedAbsent&&(error.returnNeedsVerification||error.status===409||(attempt.sent&&!definitive));
      if(needsVerification){
        attempt.uncertain=true;
        try{
          returnProgress('التحقق من النتيجة قبل السماح بإعادة المحاولة…');
          const verification=await verifyReturn(attempt);
          if(verification.confirmed)return finishReturn(attempt,verification.synced);
          if(error.status===409)attempt.uncertain=false;
        }catch(verificationError){
          returnError((verificationError.message||'تعذر التحقق من نتيجة الإعادة.')+' السبب والمرفقات محفوظة دون تغيير. اضغط «التحقق وإعادة المحاولة» عند عودة الاتصال.');
          return false;
        }
      }else if(definitive||error.returnVerifiedAbsent||!attempt.sent)attempt.uncertain=false;
      returnError((error.status===409?'تغيّرت المهمة على الخادم وتم تحديث بياناتها. راجع السبب والمرفقات قبل المحاولة مجدداً.':error.message||'تعذر إرسال الإعادة.')+(attempt.uncertain?' لم يصل تأكيد الحفظ. السبب والمرفقات محفوظة دون تغيير؛ ستتحقق المحاولة التالية من العملية نفسها.':' لم يتم تأكيد الإعادة. المرفقات المحددة ما زالت في هذا النموذج.'));
      return false;
    }finally{
      busy.delete(id);returnProgress('');setReturnBusy(false);renderHome();renderList();
    }
  }
  function openTask(id){
    const t=task(id);if(!mine(t)||!allowed(t,'details')||!allowed(t,'view')){if(typeof toast==='function')toast('فتح تفاصيل هذه المهمة غير مسموح لهذا الحساب.',true);return false;}
    if($('mr49ListDialog')?.open)$('mr49ListDialog').close();
    return window.MoshEmployeeTaskOverlay47?.open?.(t.id)||false;
  }
  function taskRow(t){
    const returned=model.category(t)==='new'&&t.returnedForRevision;
    const disabled=!allowed(t,'view')||!allowed(t,'details');
    return '<div class="mr49-task-row'+(returned?' mr49-returned':'')+'"><div class="mr49-task-copy">'+(returned?'<span class="mr49-return-badge">↩ مُعادة من المدير</span>':'')+'<b>'+esc(t.title||'مهمة بلا عنوان')+'</b><small class="wd53-task-client">'+esc(t.customer||'لم يُحدَّد عميل')+'</small>'+(t.dueDate?'<small class="wd53-task-due">الموعد: '+esc(t.dueDate)+'</small>':'')+''+(returned&&model.reason(t)?'<p>'+esc(model.reason(t))+'</p>':'')+'</div><div class="mr49-task-actions"><button type="button" data-mr49-open="'+esc(t.id)+'" '+(disabled?'disabled title="لا توجد صلاحية فتح التفاصيل"':'aria-label="فتح '+esc(t.title||'المهمة')+'"')+'>فتح ←</button>'+(model.category(t)!=='review'?'<button type="button" data-wd50-select="'+esc(t.id)+'" '+(disabled?'disabled':'')+'>لوحة عملي</button>':'')+'</div></div>';
  }
  function renderHome(){
    const account=user();
    if(!account){receiptNoticeOwner='';return;}
    const g=groups(),uid=String(account.id);
    if(receiptNoticeOwner&&receiptNoticeOwner!==uid)receiptNoticeOwner='';
    if(!receiptNoticeOwner&&window.MoshUI19?.toast){
      const pending=g.new.filter(task=>allowed(task,'view')&&allowed(task,'details'));
      if(pending.length){
        receiptNoticeOwner=uid;
        window.MoshUI19.toast(pending.length===1
          ?'عندك مهمة بانتظار الاستلام: '+(pending[0].title||'مهمة بلا عنوان')
          :'عندك '+pending.length+' مهام بانتظار الاستلام.');
      }
    }
    const card=document.querySelector('.es11-card.es11-task');if(!card)return;
    if(homeOwner!==uid){homeOwner=uid;homeTab='';homeQuery='';cardSignature='';}
    if(!homeTab)homeTab=g.new.length?'new':g.active.length?'active':'review';
    if(!card.querySelector('#mr49Inbox')){
      card.classList.add('mr49-home-card','wd51-inbox');
      card.innerHTML='<div id="mr49Inbox" dir="rtl"><div class="es11-card-head"><h3>مهامي</h3><span id="wd07TaskCount" class="wd07-inbox-count"></span></div><div id="wd51HomeTabs" class="wd51-home-tabs" role="group" aria-label="تصنيف مهامي"></div><label class="wd51-home-search"><span class="wd51-sr-only">البحث في مهامي</span><input id="wd51HomeSearch" type="search" autocomplete="off" placeholder="ابحث باسم المهمة أو العميل…"></label><div id="wd51HomeRows" class="wd51-home-rows"></div><div class="mr49-home-footer"><button type="button" id="wd51HomeAll" class="mr49-all" data-mr49-list="all">عرض جميع مهامي ←</button></div><p id="wd51HomeError" class="mr49-error" role="status" hidden></p></div>';
      $('wd51HomeSearch').addEventListener('input',e=>{homeQuery=e.target.value;renderHome();});
    }
    const all=[...g.new,...g.active,...g.review],selectedId=window.MoshWorkdesk50?.selectedTaskId?.()||'';
    const sig=JSON.stringify([uid,homeTab,homeQuery,selectedId,all.map(t=>[t.id,t._version,t.title,t.customer,t.taskNo,t.employeeState,t.returnedForRevision,model.reason(t),allowed(t,'details')]),refreshError]);
    if(sig===cardSignature)return;cardSignature=sig;
    $('wd51HomeTabs').innerHTML=[['new','جديدة',g.new.length,'mr49NewCount'],['active','جارية',g.active.length,'mr49ActiveCount'],['review','بانتظار المراجعة',g.review.length,'wd51ReviewCount']].map(([k,label,n,id])=>'<button type="button" data-wd51-home-tab="'+k+'" aria-pressed="'+(homeTab===k)+'" class="'+(homeTab===k?'active ':'')+(k==='new'&&n?'has-new':'')+'"><span>'+label+'</span><b id="'+id+'">'+n+'</b></button>').join('');
    const q=text(homeQuery).toLocaleLowerCase('ar');
    const rows=g[homeTab].filter(t=>!q||[t.title,t.customer,t.taskNo,t.number].some(v=>text(v).toLocaleLowerCase('ar').includes(q)));
    $('wd51HomeRows').innerHTML=rows.slice(0,1).map(t=>{
      const disabled=!allowed(t,'view')||!allowed(t,'details'),returned=t.returnedForRevision&&model.category(t)==='new';
      const isSelected=homeTab!=='review'&&String(t.id)===selectedId;
      return '<article class="wd51-home-task" data-task-id="'+esc(t.id)+'" data-selected="'+isSelected+'"><div><button type="button" class="wd51-task-title" data-mr49-open="'+esc(t.id)+'" '+(disabled?'disabled':'')+'>'+esc(t.title||'مهمة بلا عنوان')+'</button><small class="wd53-task-client">'+esc(t.customer||'لم يُحدَّد عميل')+'</small></div><div class="wd06-row-footer"><span class="wd51-task-tag '+(returned?'returned':'')+'">'+esc(returned?'↩ مُعادة من المدير':model.label(t))+'</span><button type="button" class="wd51-task-pick" '+(homeTab==='review'?'data-mr49-open':'data-wd50-select')+'="'+esc(t.id)+'" '+(homeTab==='review'?'':'aria-pressed="'+isSelected+'" ')+(disabled?'disabled':'')+'>'+(homeTab==='review'?'التفاصيل ←':isSelected?'محدّدة حالياً':'اختيار المهمة ←')+'</button></div></article>';
    }).join('')||'<div class="wd51-home-empty">'+(q?'لا توجد مهام مطابقة للبحث.':homeTab==='new'?'لا توجد مهام جديدة بانتظار الاستلام.':homeTab==='active'?'لا توجد مهام جارية حالياً.':'لا توجد مهام بانتظار المراجعة.')+'</div>';
    if(rows.length>4)$('wd51HomeRows').insertAdjacentHTML('beforeend','<button type="button" class="mr49-more" data-mr49-list="'+homeTab+'">عرض '+(rows.length-4)+' مهام أخرى ←</button>');
    $('wd51HomeAll').textContent='عرض جميع مهامي ('+all.length+') ←';
    $('wd07TaskCount').textContent=all.length===1?'مهمة واحدة':'المجموع: '+all.length;
    $('wd51HomeError').hidden=!refreshError;$('wd51HomeError').textContent=refreshError;
  }
  window.addEventListener('click',e=>{const b=e.target.closest?.('[data-wd51-home-tab]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();homeTab=b.dataset.wd51HomeTab;renderHome();},true);
  function ensureList(){
    let d=$('mr49ListDialog');if(d)return d;
    d=document.createElement('dialog');d.id='mr49ListDialog';d.className='mr49-dialog mr49-list-dialog';d.dir='rtl';
    d.innerHTML='<header><div><small>مساحة الموظف</small><h3>مهامي</h3></div><button type="button" data-mr49-list-close aria-label="إغلاق">×</button></header><div class="mr49-dialog-content"><div id="mr49ListTabs" class="mr49-tabs"></div><label class="mr49-search"><span>البحث في مهامي</span><input id="mr49ListSearch" type="search" placeholder="اسم المهمة أو العميل…" autocomplete="off"></label><div id="mr49ListRows"></div></div><footer><span id="mr49ListPage"></span><button type="button" data-mr49-page="-1">السابق</button><button type="button" data-mr49-page="1">التالي</button><button type="button" data-mr49-list-close>إغلاق</button></footer>';
    document.body.appendChild(d);$('mr49ListSearch').addEventListener('input',e=>{listQuery=e.target.value;listPage=1;renderList();});
    d.addEventListener('close',()=>{listSignature='';previousFocus?.focus?.();});return d;
  }
  function showList(kind='all',page=1){
    const d=ensureList();previousFocus=document.activeElement;listTab=['all','new','active','review','tracking'].includes(kind)?kind:'all';listPage=Math.max(1,Number(page)||1);listQuery='';$('mr49ListSearch').value='';listSignature='';renderList(true);if(!d.open)d.showModal();$('mr49ListSearch').focus();if(listTab==='tracking')loadTracking();return true;
  }
  async function loadTracking(){
    if(!canTrackMarketing())return;
    const owner=String(user().id);
    if(tracking.owner===owner&&tracking.loading)return;
    const pending={owner,rows:tracking.owner===owner?tracking.rows:[],loading:true,error:''};
    tracking=pending;renderList();
    try{
      const result=await MoshApi.request('/marketing/task-tracking');
      if(String(user()?.id)===owner)pending.rows=list(result.tasks);
    }catch(_){
      pending.error='تعذر تحديث متابعة المهام. جرّب مرة ثانية.';
    }finally{
      pending.loading=false;
      if(tracking===pending&&String(user()?.id)===owner)renderList();
    }
  }
  function renderTrackingRows(rows,numberFrom){
    const labels={awaiting_invoice:'بانتظار الفوترة',completed:'منتهية',invoiced:'تمت الفوترة',archived_invoiced:'تمت الفوترة',archived_no_invoice:'مؤرشفة',cancelled:'ملغاة'};
    const feedback=tracking.loading?'جارٍ تحديث متابعة المهام…':tracking.error;
    const cards=rows.map((t,index)=>{
      const label=labels[t.status]||(t.employeeState==='finished'?'منتهية في القسم الحالي':model.label(t));
      const number=(numberFrom+index).toLocaleString('ar-SY',{numberingSystem:'arab'})+'. ';
      return '<article class="mr49-list-item"><div class="mr49-task-copy"><b>'+number+esc(t.title||'مهمة بلا عنوان')+'</b><small>القسم الحالي: '+esc(t.department||'غير محدد')+' · '+esc(label)+'</small></div></article>';
    }).join('');
    return (feedback?'<p role="status">'+esc(feedback)+'</p>':'')+(cards||(!feedback?'<p class="mr49-list-empty">لا توجد مهام تسويق مطابقة.</p>':''));
  }
  function renderList(force=false){
    const d=$('mr49ListDialog');if(!d||(!d.open&&!force))return;
    const g=groups(),all=[...g.new,...g.active,...g.review];
    const allowTracking=canTrackMarketing();
    if(listTab==='tracking'&&!allowTracking)listTab='all';
    const trackingTab=listTab==='tracking',trackingRows=tracking.owner===String(user()?.id)?tracking.rows:[];
    let rows=trackingTab?trackingRows:listTab==='all'?all:g[listTab];
    const q=text(listQuery).toLocaleLowerCase('ar');
    if(q)rows=rows.filter(t=>[t.title,t.customer,t.taskNo,t.number,trackingTab?t.department:''].some(v=>text(v).toLocaleLowerCase('ar').includes(q)));
    const pages=Math.max(1,Math.ceil(rows.length/20));listPage=Math.min(pages,Math.max(1,listPage));
    const signature=JSON.stringify([listTab,listQuery,listPage,allowTracking,trackingTab?[tracking.owner,tracking.loading,tracking.error,trackingRows]:all.map(t=>[t.id,t._version,t.employeeState,t.returnedForRevision,t.title,t.workChat?.at(-1)?.id])]);
    if(!force&&signature===listSignature)return;listSignature=signature;
    const tabs=[['new','مهام جديدة',g.new.length],['active','مهام جارية',g.active.length],['review','بانتظار المراجعة',g.review.length],['all','الكل',all.length]];
    if(allowTracking)tabs.push(['tracking','متابعة مهام التسويق',null]);
    $('mr49ListTabs').innerHTML=tabs.map(([k,label,n])=>'<button type="button" data-mr49-tab="'+k+'" aria-pressed="'+String(listTab===k)+'" class="'+(listTab===k?'active':'')+'">'+label+(n===null?'':' <b>'+n+'</b>')+'</button>').join('')
      +(trackingTab?'<button type="button" data-mr49-track-refresh '+(tracking.loading?'disabled':'')+'>تحديث المتابعة</button>':'');
    const visibleRows=rows.slice((listPage-1)*20,listPage*20);
    $('mr49ListRows').innerHTML=trackingTab?renderTrackingRows(visibleRows,(listPage-1)*20+1):visibleRows.map(t=>'<article class="mr49-list-item">'+taskRow(t)+'<small class="mr49-list-state">'+esc(t.sharedDepartment||t.department)+' · '+esc(model.label(t))+'</small></article>').join('')||'<p class="mr49-list-empty">لا توجد مهام ضمن هذا العرض.</p>';
    $('mr49ListPage').textContent=rows.length+' مهمة · صفحة '+listPage+' من '+pages;
    d.querySelector('[data-mr49-page="-1"]').disabled=listPage<=1;d.querySelector('[data-mr49-page="1"]').disabled=listPage>=pages;
  }
  async function refreshTasks(manual=false){
    if(refreshBusy||!user()||document.hidden||busy.size||window.MoshApi?.isSaving?.())return false;
    if(!manual && (Date.now()-lastRefresh<28000||!$('dashboardApp')?.classList.contains('active')||$('emp47TaskOverlay')?.classList.contains('show')||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')))return false;
    refreshBusy=true;
    try{const done=await MoshApi.refreshDashboardTasks();if(done){lastRefresh=Date.now();refreshError='';}else if(manual)refreshError='احفظ التعديلات المفتوحة قبل تحديث المهام.';return done;}
    catch(error){refreshError='تعذر تحديث المهام من الخادم. البيانات المعروضة هي آخر بيانات محمّلة.';return false;}
    finally{refreshBusy=false;renderHome();renderList();}
  }
  window.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-mr49-open],[data-mr49-list],[data-mr49-refresh],[data-mr49-track-refresh],[data-mr49-list-close],[data-mr49-tab],[data-mr49-page],[data-mr49-return-close]');
    if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();
    if(b.hasAttribute('data-mr49-open'))openTask(b.dataset.mr49Open);
    else if(b.hasAttribute('data-mr49-list'))showList(b.dataset.mr49List);
    else if(b.hasAttribute('data-mr49-refresh'))refreshTasks(true);
    else if(b.hasAttribute('data-mr49-list-close'))$('mr49ListDialog')?.close();
    else if(b.hasAttribute('data-mr49-return-close'))closeReturn();
    else if(b.hasAttribute('data-mr49-track-refresh'))loadTracking();
    else if(b.hasAttribute('data-mr49-tab')){listTab=b.dataset.mr49Tab;listPage=1;listSignature='';if(listTab==='tracking')loadTracking();else renderList();}
    else if(b.hasAttribute('data-mr49-page')){listPage+=Number(b.dataset.mr49Page);renderList();}
  },true);
  document.addEventListener('input',e=>{if(e.target.id==='mr49ReturnReason')e.target.setCustomValidity('');});
  ['mosh:saved','mosh:refreshed','mosh:tasks-refreshed'].forEach(name=>document.addEventListener(name,()=>{if(name==='mosh:refreshed')refreshError='';renderHome();renderList();window.MoshEmployeeTaskWorkflow48?.render?.(true);}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshTasks(false);});
  function installDepartmentFollowUp(){
    const followUpPanel=$('marketingFollowUpPanel'),tasksView=$('tasksApp');
    if(!followUpPanel||!tasksView||followUpPanel.dataset.bound)return;
    const toggle=$('marketingFollowUpToggle'),panel=$('marketingFollowUpList');
    followUpPanel.dataset.bound='1';
    let requestNumber=0;
    const box=followUpPanel.querySelector('[data-follow-up-rows]'),pageKey='marketing_follow_up';
    let loadedRows=null;
    function renderFollowUpTable(){
      if(panel.hidden||!loadedRows)return;
      const activeSearch=box.querySelector('.app-list-search')===document.activeElement;
      const page=filterAndPageAppList(pageKey,loadedRows,t=>[t.title,t.customer,t.department,t.assignee].join(' '));
      const statuses={awaiting_invoice:'بانتظار الفوترة',invoiced:'تمت الفوترة',completed:'منتهية',archived_invoiced:'مؤرشفة بعد الفوترة',archived_no_invoice:'مؤرشفة دون فوترة',cancelled:'ملغاة'};
      const lines=page.items.map((t,i)=>{
        const status=statuses[t.status]||(t.employeeState==='finished'&&t.department==='المهمات'?'بانتظار المتابعة':model.label(t));
        return '<tr>'+[(page.start+i+1).toLocaleString('ar-SY',{numberingSystem:'arab'}),t.title,t.customer,t.department,t.assignee,status].map(value=>'<td>'+esc(value||'—')+'</td>').join('')+'</tr>';
      });
      box.innerHTML='<div style="overflow-x:auto"><table class="list-table" aria-label="مهام المتابعة"><thead><tr>'+
        ['تسلسل','عنوان المهمة','العميل','القسم الحالي','الموظف','الحالة'].map(label=>'<th scope="col">'+label+'</th>').join('')+
        '</tr></thead><tbody>'+(lines.join('')||'<tr><td colspan="6">لا توجد مهام مطابقة.</td></tr>')+'</tbody></table></div>'+
        appListPagerHtml(pageKey,page,{placeholder:'بحث بالمهمة أو العميل أو القسم أو الموظف'});
      if(activeSearch)box.querySelector('.app-list-search')?.focus({preventScroll:true});
    }
    document.addEventListener('mosh:page-follow-up',renderFollowUpTable);
    async function showDepartmentFollowUp(){
      const request=++requestNumber,actor=user();
      const manager=typeof getDepartmentManager==='function'&&getDepartmentManager('التسويق');
      const visible=tasksView.classList.contains('active')&&canTrackMarketing()&&String(manager?.id)===String(actor?.employeeId);
      followUpPanel.hidden=!visible;
      if(!visible)toggle.setAttribute('aria-expanded','false');
      panel.hidden=!visible||toggle.getAttribute('aria-expanded')!=='true';
      if(panel.hidden){loadedRows=null;box.replaceChildren();return;}
      box.textContent='جارٍ تحميل المهام…';
      try{
        const response=await MoshApi.request('/marketing/task-tracking?followUp=1');
        if(request!==requestNumber||actor.id!==user()?.id)return;
        loadedRows=list(response.tasks);
        renderFollowUpTable();
      }catch(_){if(request===requestNumber)box.textContent='تعذّر تحميل مهام المتابعة.';}
    }
    toggle.addEventListener('click',()=>{
      toggle.setAttribute('aria-expanded',String(toggle.getAttribute('aria-expanded')!=='true'));
      showDepartmentFollowUp();
    });
    new MutationObserver(showDepartmentFollowUp).observe(tasksView,{attributes:true,attributeFilter:['class']});
    for(const event of ['mosh:saved','mosh:refreshed','mosh:permissions-applied','mosh:logout-complete'])document.addEventListener(event,showDepartmentFollowUp);
    showDepartmentFollowUp();
  }
  document.addEventListener('mosh:page-mounted',event=>{
    if(event.detail.app==='tasks')installDepartmentFollowUp();
  });
  installDepartmentFollowUp();
  window.addEventListener('focus',()=>refreshTasks(false));
  window.MoshTaskInbox49={version:'task-inbox-r1',model,renderHome,showList,renderList,openTask,perform,requestReturn,actionHtml,cyclePanel,finishMessage,canTrackMarketing,isBusy:id=>busy.has(String(id)),error:id=>errors.get(String(id))||'',refreshTasks};
  renderHome();
  setInterval(()=>{renderHome();renderList();},1500);
  setInterval(()=>refreshTasks(false),30000);
})();
