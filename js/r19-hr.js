/* MOSH R19: server-backed employee procedures and attendance reports. */
(function () {
  'use strict';

  const DEPARTMENTS = {design:'التصميم',photo:'التصوير',editing:'المونتاج',marketing:'التسويق',social:'السوشال ميديا',sales:'المبيعات',purchases:'المشتريات',promotion:'الترويج',logistics:'اللوجستيات',accounting:'المحاسبة',hr:'الموارد البشرية',admin:'الإدارة',warehouses:'المستودعات العامة',platform:'MOSH MEDIA'};
  const STATUS = {pending_admin:'بانتظار موافقة الإدارة',pending_hr:'بانتظار اعتماد الموارد البشرية',approved:'معتمد نهائياً',rejected:'مرفوض'};
  const TYPE = {deduction:'خصم',penalty:'عقوبة'};
  const ROLE = {manager:'مدير القسم',admin:'الإدارة',hr:'الموارد البشرية',employee:'الموظف'};
  const IDS = ['r19-hr-request','r19-hr-inbox','r19-hr-detail','r19-hr-review','r19-hr-attendance','r19-hr-record','r19-hr-overtime','r19-hr-policy'];
  const EXTENSIONS = new Set('jpg jpeg png webp gif heic heif bmp tif tiff mp4 mov m4v webm avi mkv mpeg mpg 3gp mp3 wav m4a aac ogg flac pdf txt csv rtf doc docx xls xlsx ppt pptx zip rar 7z psd ai eps indd dwg dxf'.split(' '));
  const P = () => window.MoshPreview19;
  const arr = value => Array.isArray(value) ? value.filter(Boolean) : [];
  const str = value => String(value == null ? '' : value);
  const esc = value => str(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const e = esc;
  const user = () => window.MoshApi?.user || P()?.user?.() || {};
  const userId = () => str(user().id || user().userId);
  const employeeId = () => str(user().employeeId || user().employee_id || user().staffId);
  const dep = value => str(value).replace(/^قسم\s+/, '').trim();
  const message = value => P()?.toast?.(value);
  const initialData = () => ({role:'',capabilities:{},employees:[],disciplinary:[],attendance:[],monthly:[],overtime:[],policy:{_version:0,dailyHours:8,makeUpDeficitFirst:true,workdaysByMonth:{}}});
  let cache = initialData(), cacheIdentity = '', initialAttemptIdentity = '', lastLoadedAt = 0;
  let mountPending = false, viewSequence = 0, readSequence = 0, appliedSequence = 0, generation = 0, lastCapabilities = '';
  const reads = new Map();
  const role = () => cacheIdentity === userId() && cache.role ? cache.role : P()?.role?.() || 'employee';
  const capabilities = () => cacheIdentity === userId() ? cache.capabilities || {} : {};
  const people = () => cacheIdentity === userId() ? arr(cache.employees) : [];
  const rows = () => cacheIdentity === userId() ? arr(cache.disciplinary) : [];
  const profile = id => people().find(person => str(person.id) === str(id || employeeId()));
  const canRequest = person => !!capabilities().requestDisciplinary && (!person || person.canRequest === true);
  const canViewProfile = person => !!person && person.canView !== false;
  const canApprove = record => !!record?.canReview && ['admin','hr'].includes(record.decisionStage);
  const myDepartments = () => [...new Set(people().filter(person => person.canRequest === true).map(person => dep(person.department)).filter(Boolean))];
  const timeZone = () => cacheIdentity === userId() && cache.timeZone ? cache.timeZone : window.MOSH_COMPANY_TIME_ZONE || 'Asia/Damascus';
  const today = () => {
    const now = new Date(window.MoshApi?.serverNow?.() || Date.now());
    try {
      const parts = new Intl.DateTimeFormat('en-CA',{timeZone:timeZone(),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
      return ['year','month','day'].map(type => parts.find(part => part.type === type)?.value).join('-');
    } catch (_) { return now.toISOString().slice(0,10); }
  };
  const validMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(str(value));
  const validDate = value => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(str(value)) && Number(value.slice(8)) <= new Date(Number(value.slice(0,4)),Number(value.slice(5,7)),0).getDate();
  const hours = value => { const n = Math.max(0,Math.round(Number(value) || 0)); return Math.floor(n / 60).toString().padStart(2,'0') + ':' + (n % 60).toString().padStart(2,'0'); };
  const uniqueId = prefix => {
    if (window.crypto?.randomUUID) return prefix + window.crypto.randomUUID();
    const bytes = new Uint32Array(4);
    if (window.crypto?.getRandomValues) { window.crypto.getRandomValues(bytes); return prefix + Array.from(bytes,n => n.toString(16).padStart(8,'0')).join(''); }
    return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
  };
  function dateLabel(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString('ar-SY',{timeZone:timeZone(),year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : str(value || '—');
  }
  function money(record) { return record.type === 'deduction' ? Number(record.amount || 0).toLocaleString('ar-SY') + ' ' + e(record.currency || 'SYP') : '—'; }
  function tag(record) { return '<span class="r19-hr-tag '+e(record.status)+'">'+e(STATUS[record.status] || record.status)+'</span>'; }
  function btn(label, action, id, cls) { return '<button type="button" class="btn r19-hr-button '+(cls || '')+'" data-r19-hr-action="'+e(action)+'" data-id="'+e(id || '')+'">'+label+'</button>'; }
  function empty(text) { return '<div class="r19-hr-empty">'+e(text)+'</div>'; }
  function note(text) { return '<p class="r19-hr-note">'+e(text)+'</p>'; }
  function loading() { return '<div class="r19-hr-loading" role="status">جارٍ تحميل البيانات من النظام…</div>'; }
  function setError(element, error) { if (element) { element.textContent = error?.message || str(error) || 'تعذر إتمام العملية.'; element.hidden = false; } }
  function dialogCurrent(dialog, token) { return !!dialog?.open && dialog._r19HRView === token; }
  function createDialog(id, title, html, options) {
    if (!P()?.dialog) { message('انتظر اكتمال تحميل الواجهة.'); return null; }
    const dialog = P().dialog(id,title,'<div class="r19-hr" dir="rtl">'+html+'</div>',Object.assign({wide:true},options || {}));
    dialog._r19HRView = ++viewSequence;
    return dialog;
  }
  function content(dialog, html) { const host = dialog?.querySelector('.r19-hr'); if (host) host.innerHTML = html; }
  function readError(dialog, token, error, retry) {
    if (!dialogCurrent(dialog,token)) return;
    content(dialog,'<div class="r19-hr-error" role="alert">'+e(error?.message || 'تعذر تحميل البيانات.')+'</div><div class="r19-hr-footer"><button type="button" class="btn" data-r19-hr-retry>إعادة المحاولة</button></div>');
    dialog.querySelector('[data-r19-hr-retry]').onclick = retry;
  }
  function resetForIdentity() {
    const identity = userId();
    if (identity === cacheIdentity) return;
    generation++; reads.clear(); cache = initialData(); cacheIdentity = identity; lastCapabilities = ''; lastLoadedAt = 0; initialAttemptIdentity = '';
    IDS.forEach(id => { const dialog = document.getElementById(id); if (dialog?.open) P()?.close?.(id,true); });
  }
  async function apiRequest(path, options) {
    const identity = userId();
    if (!identity || !window.MoshApi?.request) throw new Error('سجّل الدخول لفتح بيانات ملفك الوظيفي.');
    const result = await window.MoshApi.request(path,options);
    if (identity !== userId()) throw new Error('تغير الحساب. افتح الصفحة من الحساب الحالي.');
    return result;
  }
  function publishSnapshot(data, sequence) {
    if (sequence < appliedSequence) return;
    appliedSequence = sequence; cache = data; cacheIdentity = userId(); lastLoadedAt = Date.now();
    const signature = JSON.stringify([data.role,data.capabilities]);
    if (signature !== lastCapabilities) { lastCapabilities = signature; P()?.setCapabilities?.({role:data.role,capabilities:data.capabilities}); }
    scheduleMount();
  }
  async function readSnapshot(options, retry) {
    resetForIdentity();
    const date = validDate(options?.date) ? options.date : today();
    const month = validMonth(options?.month) ? options.month : date.slice(0,7);
    const identity = userId(), epoch = generation, sequence = ++readSequence;
    const key = [identity,epoch,date,month].join('|');
    if (reads.has(key)) return reads.get(key);
    const promise = (async () => {
      const data = await apiRequest('/r19/hr?date='+encodeURIComponent(date)+'&month='+encodeURIComponent(month));
      if (identity !== userId()) throw new Error('تغير الحساب. افتح الصفحة من الحساب الحالي.');
      if (epoch !== generation) {
        if (!retry) return readSnapshot({date,month},true);
        throw new Error('تغيرت البيانات أثناء التحميل. أعد المحاولة.');
      }
      if (!data || !Array.isArray(data.employees) || !Array.isArray(data.disciplinary) || !Array.isArray(data.attendance) || !Array.isArray(data.monthly)) throw new Error('تعذر قراءة استجابة النظام. حدّث الصفحة ثم أعد المحاولة.');
      publishSnapshot(data,sequence);
      return data;
    })();
    reads.set(key,promise);
    try { return await promise; } finally { if (reads.get(key) === promise) reads.delete(key); }
  }
  function changed(kind, record) {
    generation++; reads.clear();
    if (kind === 'disciplinary') cache.disciplinary = [record,...rows().filter(row => str(row.id) !== str(record.id))];
    else if (kind === 'policy') cache.policy = record;
    else if (kind === 'overtime') cache.attendance = [record,...arr(cache.attendance).filter(row => str(row.id) !== str(record.id))];
    document.dispatchEvent(new CustomEvent('mosh:r19-hr-updated',{detail:{kind,id:str(record?.id)}}));
    P()?.emit?.(); scheduleMount();
    try { Promise.resolve(window.MoshAlerts19?.refresh?.()).catch(() => {}); } catch (_) {}
  }
  function busy(dialog, form, active, label) {
    if (active) {
      dialog.setAttribute('aria-busy','true');
      form._r19Disabled = Array.from(dialog.querySelectorAll('input,select,textarea,button')).map(element => [element,element.disabled]);
      form._r19Disabled.forEach(([element]) => { element.disabled = true; });
      const submit = form.querySelector('[type="submit"]');
      if (submit) { form._r19SubmitLabel = submit.textContent; submit.textContent = label || 'جارٍ الحفظ…'; }
    } else {
      dialog.removeAttribute('aria-busy');
      arr(form._r19Disabled).forEach(([element,disabled]) => { element.disabled = disabled; });
      form._r19Disabled = [];
      const submit = form.querySelector('[type="submit"]'); if (submit && form._r19SubmitLabel) submit.textContent = form._r19SubmitLabel;
      form._r19AfterBusy?.();
    }
  }
  function lockRetryFields(form, operation) {
    if (!operation.lockedFields) operation.lockedFields = Array.from(form.querySelectorAll('[name]')).map(element => [element,element.disabled]);
    form.querySelectorAll('[name], [data-r19-file-remove]').forEach(element => { element.disabled = true; });
  }
  function unlockRetryFields(form, operation) {
    arr(operation.lockedFields).forEach(([element,disabled]) => { element.disabled = disabled; });
    operation.lockedFields = null;
    form._r19AfterBusy?.();
  }
  function closeSaved(dialog, next) {
    const afterSave = dialog._r19AfterSave;
    dialog._r19HRCommitted = true;
    P()?.close?.(dialog.id,true);
    if (!afterSave) next?.();
  }
  async function saveForm(dialog, form, errorBox, prepare, path, method, onSuccess) {
    let operation = form._r19Save;
    if (!operation) operation = form._r19Save = {busy:false,uncertain:false,body:null};
    if (operation.busy) return;
    operation.busy = true; errorBox.hidden = true;
    busy(dialog,form,true);
    let sent = false;
    try {
      if (!operation.uncertain) operation.body = Object.assign({},await prepare(),{requestId:uniqueId('R19-HR-REQ-')});
      sent = true;
      const result = await apiRequest(path,{method,body:operation.body});
      if (!result || typeof result !== 'object') throw new Error('لم تصل نتيجة العملية كاملة من النظام.');
      operation.uncertain = false; operation.busy = false;
      busy(dialog,form,false);
      unlockRetryFields(form,operation);
      onSuccess(result);
    } catch (error) {
      operation.busy = false;
      busy(dialog,form,false);
      operation.uncertain = sent && (error?.network === true || !Number.isFinite(error?.status) || error.status >= 500);
      if (operation.uncertain) {
        lockRetryFields(form,operation);
        const submit = form.querySelector('[type="submit"]'); if (submit) submit.textContent = 'التحقق وإعادة المحاولة';
        setError(errorBox,(error?.message || 'تعذر الاتصال بالنظام.')+' لم يصل تأكيد الحفظ. أعد المحاولة للتحقق من العملية نفسها.');
      } else {
        operation.body = null;
        unlockRetryFields(form,operation);
        setError(errorBox,error);
      }
    }
  }

  function requestTable(list) {
    return '<div class="r19-hr-table-wrap"><table class="r19-hr-table"><thead><tr><th>الموظف والقسم</th><th>الطلب والسبب</th><th>المبلغ</th><th>الحالة</th><th></th></tr></thead><tbody>'+list.map(record => '<tr><td><b>'+e(record.employeeName)+'</b><small>'+e(record.department)+'</small></td><td><b>'+e(TYPE[record.type] || record.type)+'</b><small>'+e(record.reason)+'</small></td><td>'+money(record)+'</td><td>'+tag(record)+'</td><td>'+btn('التفاصيل','details',record.id)+'</td></tr>').join('')+'</tbody></table></div>';
  }
  function attachmentHtml(record) {
    return arr(record.attachments).length ? '<div class="r19-hr-file-list">'+record.attachments.map(file => btn(e(file.name || 'مرفق'),'attachment',record.id+'|'+file.key)).join('')+'</div>' : '<span class="r19-hr-muted">لا توجد مرفقات</span>';
  }
  function detailsHtml(record) {
    return '<div class="r19-hr-detail-head"><div><h3>'+e(TYPE[record.type] || record.type)+' · '+e(record.employeeName)+'</h3><p>'+e(record.department)+' · '+e(dateLabel(record.createdAt))+'</p></div>'+tag(record)+'</div>'+
      '<div class="r19-hr-summary"><div><span>مقدّم الطلب</span><b>'+e(record.submittedByName)+'</b></div><div><span>المبلغ والعملة</span><b>'+money(record)+'</b></div></div>'+
      '<section class="r19-hr-section"><h4>السبب</h4><p>'+e(record.reason)+'</p><h4>التفاصيل</h4><p class="r19-hr-pre">'+e(record.details)+'</p><h4>المرفقات</h4>'+attachmentHtml(record)+'</section>'+
      (record.rejectionReason ? '<div class="r19-hr-rejection"><b>سبب الرفض</b><p>'+e(record.rejectionReason)+'</p></div>' : '')+
      '<section class="r19-hr-section"><h4>سجل الإجراء</h4><ol class="r19-hr-timeline">'+arr(record.history).map(entry => '<li><b>'+e(entry.action)+'</b><small>'+e(entry.by)+' · '+e(ROLE[entry.role] || entry.role)+' · '+e(dateLabel(entry.at))+'</small>'+(entry.note ? '<p>'+e(entry.note)+'</p>' : '')+'</li>').join('')+'</ol></section>';
  }

  function validateFile(file) {
    if (!file || !file.name || /[\\/\x00-\x1F\x7F]/.test(file.name) || file.name.length > 250) return 'اسم أحد الملفات غير صالح.';
    if (file.size > 25*1024*1024) return 'الملف «'+file.name+'» يتجاوز 25 ميغابايت.';
    if (/\.(php[0-9]*|phtml|phar|cgi|pl|py|rb|sh|bash|zsh|fish|ps1|vbs|vbe|wsf|wsh|hta|asp|aspx|jsp|exe|com|bat|cmd|msi|msp|scr|dll|jar|js|mjs|cjs|html?|svg)(\.|$)/i.test(file.name) || !EXTENSIONS.has(file.name.split('.').pop().toLowerCase())) return 'نوع الملف «'+file.name+'» غير مسموح كمرفق.';
    return '';
  }
  async function uploadDraft(draft) {
    if (draft.metadata) return draft.metadata;
    const metadata = async () => {
      const result = await apiRequest('/files/'+encodeURIComponent(draft.key));
      if (str(result?.key) !== draft.key || result.name !== draft.file.name || Number(result.size) !== Number(draft.file.size)) throw new Error('تعذر التحقق من المرفق. أزل الملف ثم أضفه من جديد.');
      return result;
    };
    if (draft.attempted) {
      try { draft.metadata = await metadata(); return draft.metadata; }
      catch (error) { if (error.status !== 404) throw error; }
    }
    draft.attempted = true;
    const form = new FormData(); form.append('file',draft.file,draft.file.name); form.append('key',draft.key); form.append('kind','hr-disciplinary');
    try { draft.metadata = await apiRequest('/files',{method:'POST',body:form}); }
    catch (error) {
      if (error.network || error.status === 409 || error.status >= 500) {
        try { draft.metadata = await metadata(); } catch (_) { throw error; }
      } else throw error;
    }
    return draft.metadata;
  }
  async function deleteDraft(draft, owner) {
    if (!draft.attempted || owner !== userId()) return;
    try { await apiRequest('/files/'+encodeURIComponent(draft.key),{method:'DELETE'}); }
    catch (error) { if (![404,409].includes(error.status)) throw error; }
  }

  async function openRequest(department) {
    const existing = document.getElementById('r19-hr-request');
    if (existing?.open && existing.querySelector('form')) { existing.querySelector('input,select,button')?.focus(); return; }
    const dialog = createDialog('r19-hr-request','طلب خصم أو عقوبة',loading()); if (!dialog) return;
    const token = dialog._r19HRView;
    try {
      await readSnapshot(); if (!dialogCurrent(dialog,token)) return;
      if (!canRequest()) { content(dialog,empty('إرسال طلب خصم أو عقوبة متاح لمدير القسم المختص.')); return; }
      const allowed = myDepartments(), target = dep(DEPARTMENTS[department] || department || allowed[0]);
      if (!allowed.length) { content(dialog,empty('لا يوجد موظفون متاحون لإرسال طلب ضمن الأقسام التي تديرها.')); return; }
      if (target && !allowed.includes(target)) { content(dialog,empty('يمكنك إرسال طلب لموظفي الأقسام التي تديرها فقط.')); return; }
      const candidates = people().filter(person => canRequest(person));
      content(dialog,note('يرسل الطلب إلى الإدارة أولاً، ثم إلى الموارد البشرية للاعتماد النهائي.')+
        '<form id="r19HRRequestForm" class="r19-hr-form"><div class="r19-hr-grid"><label>القسم<select name="department" required>'+allowed.map(name => '<option '+(name === target ? 'selected' : '')+'>'+e(name)+'</option>').join('')+'</select></label>'+
        '<label>الموظف<select name="employeeId" required></select></label><label>نوع الطلب<select name="type" required><option value="deduction">خصم</option><option value="penalty">عقوبة</option></select></label>'+
        '<label class="r19-hr-deduction">المبلغ<input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" placeholder="أدخل مبلغ الخصم" required></label><label class="r19-hr-deduction">العملة<select name="currency"><option value="SYP">ليرة سورية — SYP</option><option value="USD">دولار أمريكي — USD</option><option value="AED">درهم إماراتي — AED</option><option value="EUR">يورو — EUR</option></select></label>'+
        '<label class="r19-hr-wide">السبب<input name="reason" maxlength="220" placeholder="اكتب سبب الطلب بوضوح" required></label><label class="r19-hr-wide">التفاصيل والعقوبة المقترحة<textarea name="details" rows="4" maxlength="6000" placeholder="التفاصيل التي تحتاج الإدارة والموارد البشرية للاطلاع عليها" required></textarea></label>'+
        '<label class="r19-hr-wide">المرفقات<input name="attachments" type="file" multiple><small>حتى 5 مرفقات، بحد 25 ميغابايت لكل ملف.</small></label></div><input name="attachmentSelection" type="hidden" value="[]"><div id="r19HRFileList" class="r19-hr-file-list"></div><div id="r19HRRequestError" class="r19-hr-error" role="alert" hidden></div>'+
        '<footer class="r19-hr-footer"><button type="submit" class="btn primary">إرسال إلى الإدارة</button>'+btn('إلغاء','close','r19-hr-request')+'</footer></form>');
      const form = dialog.querySelector('form'), errorBox = dialog.querySelector('#r19HRRequestError');
      const owner = userId(), drafts = [];
      dialog._r19HRCommitted = false;
      const fillEmployees = () => { form.elements.employeeId.innerHTML = '<option value="">اختر الموظف</option>'+candidates.filter(person => dep(person.department) === form.elements.department.value).map(person => '<option value="'+e(person.id)+'">'+e(person.name)+'</option>').join(''); };
      fillEmployees(); form.elements.department.addEventListener('change',fillEmployees);
      form.elements.type.addEventListener('change',() => { const deduction = form.elements.type.value === 'deduction'; form.querySelectorAll('.r19-hr-deduction').forEach(element => { element.hidden = !deduction; }); form.elements.amount.required = deduction; });
      const renderFiles = () => {
        form.elements.attachmentSelection.value = JSON.stringify(drafts.map(draft => draft.key));
        dialog.querySelector('#r19HRFileList').innerHTML = drafts.map(draft => '<span class="r19-hr-file-item"><span>'+e(draft.file.name)+'<small>'+Math.ceil(draft.file.size/1024)+' KB · '+(draft.metadata ? 'تم الرفع' : draft.uploading ? 'جارٍ الرفع…' : draft.error ? e(draft.error) : 'بانتظار الإرسال')+'</small></span><button type="button" class="btn" data-r19-file-remove="'+e(draft.key)+'" aria-label="إزالة '+e(draft.file.name)+'" '+(form._r19Save?.busy || form._r19Save?.uncertain ? 'disabled' : '')+'>×</button></span>').join('');
      };
      form._r19AfterBusy = renderFiles;
      form.elements.attachments.addEventListener('change',() => {
        const files = Array.from(form.elements.attachments.files || []); form.elements.attachments.value = '';
        if (drafts.length + files.length > 5) { setError(errorBox,'يمكن إرفاق 5 ملفات كحد أقصى.'); return; }
        const issue = files.map(validateFile).find(Boolean); if (issue) { setError(errorBox,issue); return; }
        files.forEach(file => drafts.push({file,key:uniqueId('R19-HR-FILE-'),metadata:null,attempted:false,uploading:false,error:''})); errorBox.hidden = true; renderFiles();
      });
      dialog.querySelector('#r19HRFileList').addEventListener('click',async event => {
        const button = event.target.closest('[data-r19-file-remove]'); if (!button || form._r19Save?.busy || form._r19Save?.uncertain) return;
        const draft = drafts.find(item => item.key === button.dataset.r19FileRemove); if (!draft) return;
        button.disabled = true;
        try { await deleteDraft(draft,owner); const index = drafts.indexOf(draft); if (index >= 0) drafts.splice(index,1); renderFiles(); }
        catch (error) { setError(errorBox,error); button.disabled = false; }
      });
      if (dialog._r19HRCleanup) dialog.removeEventListener('close',dialog._r19HRCleanup);
      dialog._r19HRCleanup = () => {
        if (dialog._r19HRCommitted || owner !== userId()) return;
        Promise.allSettled(drafts.map(draft => deleteDraft(draft,owner))).then(results => { if (results.some(result => result.status === 'rejected') && owner === userId()) message('تعذر حذف بعض المرفقات غير المستخدمة بسبب الاتصال.'); });
      };
      dialog.addEventListener('close',dialog._r19HRCleanup);
      trackForm(dialog);
      form.addEventListener('submit',event => {
        event.preventDefault(); event.stopPropagation();
        if (form._r19Save?.busy) return;
        if (!form._r19Save?.uncertain) {
          const person = candidates.find(item => str(item.id) === form.elements.employeeId.value);
          if (!person?.canRequest || dep(person.department) !== form.elements.department.value) { setError(errorBox,'اختر موظفاً متاحاً ضمن القسم.'); return; }
          if (!form.checkValidity()) { form.reportValidity(); return; }
          if (!form.elements.reason.value.trim() || !form.elements.details.value.trim()) { setError(errorBox,'اكتب سبب الطلب وتفاصيله.'); return; }
          const amount = Number(form.elements.amount.value);
          if (form.elements.type.value === 'deduction' && (!Number.isFinite(amount) || amount <= 0)) { setError(errorBox,'أدخل مبلغاً أكبر من صفر.'); return; }
        }
        saveForm(dialog,form,errorBox,async () => {
          for (const draft of drafts) {
            draft.uploading = true; draft.error = ''; renderFiles();
            try { await uploadDraft(draft); } catch (error) { draft.error = error.message || 'تعذر الرفع'; throw error; }
            finally { draft.uploading = false; renderFiles(); }
          }
          const deduction = form.elements.type.value === 'deduction';
          return {employeeId:form.elements.employeeId.value,type:form.elements.type.value,reason:form.elements.reason.value.trim(),details:form.elements.details.value.trim(),amount:deduction ? Number(form.elements.amount.value) : null,currency:deduction ? form.elements.currency.value : '',attachments:drafts.map(draft => ({key:draft.key}))};
        },'/r19/hr/disciplinary','POST',record => {
          changed('disciplinary',record); message('تم إرسال الطلب إلى الإدارة.'); closeSaved(dialog,() => openDetails(record.id));
        });
      });
      form.elements.employeeId.focus();
    } catch (error) { readError(dialog,token,error,() => openRequest(department)); }
  }

  // Initial form state includes attachment selection so Escape can detect draft changes.
  function trackForm(dialog) {
    dialog._r19TrackDirty = true;
    dialog._r19Initial = JSON.stringify(Array.from(dialog.querySelectorAll('input:not([type=search]),textarea,select,[contenteditable=true]')).map(element => [element.name || element.id,element.type === 'checkbox' || element.type === 'radio' ? element.checked : element.type === 'file' ? Array.from(element.files || []).map(file => [file.name,file.size]) : element.value ?? element.textContent]));
  }

  async function openInbox(filter) {
    const dialog = createDialog('r19-hr-inbox','متابعة الطلبات',loading()); if (!dialog) return;
    const token = dialog._r19HRView;
    try {
      const data = await readSnapshot(); if (!dialogCurrent(dialog,token)) return;
      if (data.role === 'employee' && !data.capabilities?.reviewHr && !data.capabilities?.reviewAdministration && !data.capabilities?.requestDisciplinary) { P().close(dialog.id,true); return openMyRecord(); }
      const options = [['all','كل الطلبات'],['pending_admin','بانتظار الإدارة'],['pending_hr','بانتظار الموارد البشرية'],['approved','المعتمدة'],['rejected','المرفوضة'],['archive','الأرشيف']];
      const selected = options.some(option => option[0] === filter) ? filter : 'all';
      content(dialog,note('المسار المعتمد: مدير القسم ← موافقة الإدارة ← اعتماد الموارد البشرية ← إشعار الموظف وحفظ الإجراء في ملفه.')+
        '<div class="r19-hr-toolbar"><label>الحالة<select id="r19HRFilter">'+options.map(([value,title]) => '<option value="'+value+'" '+(value === selected ? 'selected' : '')+'>'+title+'</option>').join('')+'</select></label><label>بحث<input id="r19HRSearch" type="search" placeholder="اسم الموظف أو سبب الطلب"></label>'+(data.capabilities?.requestDisciplinary ? btn('+ طلب جديد','new','','primary') : '')+btn('تحديث','inbox-refresh')+'</div><div id="r19HRList"></div>');
      const render = () => {
        const state = dialog.querySelector('#r19HRFilter').value, query = dialog.querySelector('#r19HRSearch').value.trim();
        const list = arr(data.disciplinary).filter(record => state === 'all' || (state === 'archive' ? ['approved','rejected'].includes(record.status) : record.status === state)).filter(record => !query || [record.employeeName,record.department,record.reason,record.details].join(' ').includes(query));
        dialog.querySelector('#r19HRList').innerHTML = list.length ? requestTable(list) : empty('لا توجد طلبات ضمن هذا الاختيار.');
      };
      dialog.querySelector('#r19HRFilter').addEventListener('change',render); dialog.querySelector('#r19HRSearch').addEventListener('input',render); render();
    } catch (error) { readError(dialog,token,error,() => openInbox(filter)); }
  }

  async function openDetails(id) {
    const dialog = createDialog('r19-hr-detail','تفاصيل طلب الخصم أو العقوبة',loading()); if (!dialog) return;
    const token = dialog._r19HRView;
    try {
      const data = await readSnapshot(); if (!dialogCurrent(dialog,token)) return;
      const record = arr(data.disciplinary).find(item => str(item.id) === str(id));
      if (!record) { content(dialog,empty('هذا الطلب غير متاح لهذا الحساب.')); return; }
      const action = canApprove(record) ? '<footer class="r19-hr-footer">'+btn(record.decisionStage === 'admin' ? 'موافقة وإحالة إلى الموارد البشرية' : 'اعتماد نهائي وإشعار الموظف','approve',record.id,'primary')+btn('رفض مع ذكر السبب','reject',record.id,'danger')+'</footer>' : '';
      content(dialog,detailsHtml(record)+action+note(record.status === 'approved' ? 'تم حفظ الإجراء في الملف والأرشيف وإشعار الموظف المعني.' : record.status === 'rejected' ? 'الطلب مرفوض ومحفوظ مع السبب في السجل والأرشيف.' : 'لا ينفذ الإجراء قبل اكتمال الاعتماد.'));
    } catch (error) { readError(dialog,token,error,() => openDetails(id)); }
  }

  async function openReview(id, decision) {
    const existing = document.getElementById('r19-hr-review');
    if (existing?.open && existing.querySelector('form')) { existing.querySelector('textarea')?.focus(); return; }
    const dialog = createDialog('r19-hr-review','مراجعة طلب الخصم أو العقوبة',loading()); if (!dialog) return;
    const token = dialog._r19HRView;
    try {
      const data = await readSnapshot(); if (!dialogCurrent(dialog,token)) return;
      const record = arr(data.disciplinary).find(item => str(item.id) === str(id));
      if (!canApprove(record)) { content(dialog,empty('اعتماد هذه المرحلة غير متاح لهذا الحساب أو سبق اتخاذ القرار.')); return; }
      const rejecting = decision === 'reject', administrative = record.decisionStage === 'admin';
      content(dialog,note(rejecting ? 'سيحفظ سبب الرفض في الطلب والأرشيف.' : administrative ? 'سينتقل الطلب إلى الموارد البشرية للاعتماد النهائي.' : 'سيحفظ الإجراء في ملف الموظف وأرشيفه، ويرسل إليه إشعار بالتفاصيل كاملة.')+
        '<div class="r19-hr-review-summary"><b>'+e(record.employeeName)+' · '+e(TYPE[record.type])+'</b><p>'+e(record.reason)+'</p>'+(record.type === 'deduction' ? '<strong>'+money(record)+'</strong>' : '')+'</div>'+
        '<form id="r19HRReviewForm" class="r19-hr-form"><label>'+(rejecting ? 'سبب الرفض' : 'ملاحظات الاعتماد (اختياري)')+'<textarea name="note" rows="4" maxlength="4000" '+(rejecting ? 'required' : '')+' placeholder="'+(rejecting ? 'اكتب السبب بوضوح' : 'يمكن إضافة ملاحظة إلى سجل الإجراء')+'"></textarea></label><div id="r19HRReviewError" class="r19-hr-error" hidden role="alert"></div><footer class="r19-hr-footer"><button type="submit" class="btn '+(rejecting ? 'danger' : 'primary')+'">'+(rejecting ? 'تأكيد الرفض' : administrative ? 'موافقة وإحالة إلى HR' : 'اعتماد نهائي')+'</button>'+btn('رجوع','details',id)+'</footer></form>');
      const form = dialog.querySelector('form'), errorBox = dialog.querySelector('#r19HRReviewError'); trackForm(dialog);
      form.addEventListener('submit',event => {
        event.preventDefault(); event.stopPropagation();
        if (!form._r19Save?.uncertain && rejecting && !form.elements.note.value.trim()) { setError(errorBox,'سبب الرفض مطلوب.'); return; }
        saveForm(dialog,form,errorBox,() => ({decision:rejecting ? 'reject' : 'approve',note:form.elements.note.value.trim(),version:record._version}),'/r19/hr/disciplinary/'+encodeURIComponent(record.id)+'/decision','POST',updated => {
          changed('disciplinary',updated); message(rejecting ? 'تم توثيق الرفض وسببه.' : administrative ? 'أحيل الطلب إلى الموارد البشرية.' : 'اعتمد الإجراء وحفظ في ملف الموظف.');
          closeSaved(dialog,() => openDetails(updated.id));
        });
      });
      form.elements.note.focus();
    } catch (error) { readError(dialog,token,error,() => openReview(id,decision)); }
  }

  async function openMyRecord(selectedId) {
    const id = str(selectedId || employeeId());
    const dialog = createDialog('r19-hr-record','الإجراءات الوظيفية والأرشيف',loading()); if (!dialog) return;
    const token = dialog._r19HRView;
    try {
      const data = await readSnapshot(); if (!dialogCurrent(dialog,token)) return;
      const person = arr(data.employees).find(item => str(item.id) === id);
      if (!id || !canViewProfile(person)) { content(dialog,empty(id ? 'هذا الملف غير متاح لهذا الحساب.' : 'لا يوجد ملف موظف مرتبط بهذا الحساب.')); return; }
      const list = arr(data.disciplinary).filter(record => str(record.employeeId) === id);
      content(dialog,'<div class="r19-hr-detail-head"><div><h3>'+e(person.name)+'</h3><p>'+e(person.department)+'</p></div><span class="r19-hr-tag">السجل الوظيفي</span></div>'+note('تظهر تفاصيل كل إجراء ومسار الموافقات والمرفقات ضمن السجل المحفوظ.')+(list.length ? requestTable(list) : empty('لا توجد إجراءات محفوظة متاحة في هذا الملف.')));
    } catch (error) { readError(dialog,token,error,() => openMyRecord(id)); }
  }

  function overtimeStatus(record) {
    if (!record.extra) return 'لا يوجد إضافي';
    if (record.overtimeStatus === 'source_changed') return 'تغير سجل الحضور؛ بانتظار مراجعة المدير';
    if (record.overtimeStatus === 'returned_employee') return 'معاد إلى الموظف';
    if (record.overtimeStatus === 'returned_manager') return 'معاد إلى المدير';
    if (record.overtimeStatus === 'pending_hr') return 'بانتظار اعتماد الموارد البشرية';
    if (record.overtimeStatus === 'finalized' || (record.finalApproved > 0 && record.finalApproved === record.managerApproved)) return record.finalApproved === record.extra ? 'اعتماد نهائي' : 'اعتماد جزئي نهائي';
    return 'بانتظار اعتماد المدير';
  }
  function overtimeClass(record) { return record.overtimeStatus === 'finalized' || (record.finalApproved > 0 && record.finalApproved === record.managerApproved) ? 'approved' : /returned/.test(record.overtimeStatus || '') ? 'rejected' : 'pending_hr'; }
  function reportTabs(active) { return '<div class="r19-hr-report-tabs">'+[['daily','التقرير اليومي'],['monthly','التسوية الشهرية'],...(capabilities().editPolicy ? [['policy','سياسة الدوام']] : [])].map(([key,title]) => btn(title,'attendance-view',key,active === key ? 'active' : '')).join('')+'</div>'; }
  function attendanceTable(list) {
    if (!list.length) return empty('لا توجد سجلات حضور في التاريخ المختار.');
    return '<div class="r19-hr-table-wrap"><table class="r19-hr-table r19-hr-attendance-table"><thead><tr><th>الموظف</th><th>الدخول / الخروج</th><th>التأخير</th><th>أساسي</th><th>زائد فعلي</th><th>موافقة المدير</th><th>معتمد نهائياً من HR</th><th>إجمالي الحضور</th><th>حالة الإضافي</th></tr></thead><tbody>'+list.map(record => '<tr><td><b>'+e(record.name)+'</b><small>'+e(record.department)+'</small></td><td class="r19-hr-clock"><span>'+e(record.inTime || '—')+'</span><small>'+e(record.outTime || '—')+'</small></td><td>'+(record.delay == null ? '—' : e(record.delay)+' دقيقة')+'</td><td class="r19-hr-clock">'+hours(record.basic)+'</td><td class="r19-hr-clock r19-hr-gold">'+hours(record.extra)+'</td><td class="r19-hr-clock">'+hours(record.managerApproved)+'</td><td class="r19-hr-clock">'+hours(record.finalApproved)+'</td><td class="r19-hr-clock"><b>'+hours(record.total)+'</b>'+(!record.complete ? '<small>'+(record.date === today() ? 'سجل قيد الاكتمال' : 'سجل غير مكتمل')+'</small>' : '')+(arr(record.issues).length ? '<small>'+e(record.issues.map(issue => typeof issue === 'string' ? issue : issue.message || '').filter(Boolean).join(' · '))+'</small>' : '')+'</td><td><span class="r19-hr-tag '+overtimeClass(record)+'">'+overtimeStatus(record)+'</span>'+(record.extra > 0 ? '<div class="r19-hr-small-action">'+btn(record.canResubmit ? 'توضيح وإعادة الإرسال' : record.canReviewOvertime ? 'مراجعة الإضافي' : 'التفاصيل','overtime',record.date+'|'+record.id)+'</div>' : '')+'</td></tr>').join('')+'</tbody></table></div>'+note('المدد ساعة:دقيقة. الخام هو الوقت المسجل فوق 8 ساعات؛ موافقة المدير والاعتماد النهائي يعرضان منفصلين. بنهاية الشهر، يعوض المعتمد نهائياً نقص الأساسي أولاً ثم يظهر صافي الإضافي.');
  }
  async function openAttendance(selectedDate) {
    const date = validDate(selectedDate) ? selectedDate : today();
    const title = role() === 'employee' ? 'تقرير حضوري اليومي' : role() === 'manager' ? 'تقرير حضور القسم' : 'تقرير الحضور اليومي';
    const dialog = createDialog('r19-hr-attendance',title,reportTabs('daily')+'<div class="r19-hr-toolbar"><label>اليوم<input id="r19HRAttendanceDate" type="date" value="'+e(date)+'"></label>'+btn('تصدير CSV','csv')+btn('تحديث','attendance-refresh')+'</div>'+note('الأساسي حتى 8 ساعات في اليوم. الساعات التي تزيد عن 8 تحتاج موافقة المدير المباشر ثم اعتماد الموارد البشرية النهائي.')+'<div id="r19HRAttendanceTable"></div>'); if (!dialog) return;
    const token = dialog._r19HRView; let rendering = 0;
    const render = async () => {
      const stamp = ++rendering, selected = dialog.querySelector('#r19HRAttendanceDate').value;
      const target = dialog.querySelector('#r19HRAttendanceTable'), exportButton = dialog.querySelector('[data-r19-hr-action="csv"]');
      dialog._r19HRReport = null; exportButton.disabled = true;
      if (!validDate(selected)) { target.innerHTML = empty('اختر تاريخاً صحيحاً.'); return; }
      target.innerHTML = loading();
      try {
        const data = await readSnapshot({date:selected,month:selected.slice(0,7)});
        if (!dialogCurrent(dialog,token) || stamp !== rendering) return;
        target.innerHTML = attendanceTable(arr(data.attendance)); dialog._r19HRReport = {type:'daily',period:selected,rows:arr(data.attendance)}; exportButton.disabled = false;
        dialog.querySelector('.r19-hr-report-tabs').outerHTML = reportTabs('daily');
      } catch (error) { if (dialogCurrent(dialog,token) && stamp === rendering) target.innerHTML = '<div class="r19-hr-error" role="alert">'+e(error.message)+'</div>'+note('استخدم «تحديث» لإعادة تحميل اليوم المختار.'); }
    };
    dialog._r19HRRefresh = render; dialog.querySelector('#r19HRAttendanceDate').addEventListener('change',render); await render();
  }

  async function openOvertimeReview(value) {
    const parts = str(value).split('|'), date = validDate(parts[0]) ? parts[0] : document.querySelector('#r19HRAttendanceDate')?.value || today(), id = parts.length > 1 ? parts.slice(1).join('|') : parts[0];
    const existing = document.getElementById('r19-hr-overtime'); if (existing?.open && existing.querySelector('form')) { existing.querySelector('select,textarea')?.focus(); return; }
    const dialog = createDialog('r19-hr-overtime','مراجعة الساعات الإضافية',loading()); if (!dialog) return;
    const token = dialog._r19HRView;
    try {
      const data = await readSnapshot({date}); if (!dialogCurrent(dialog,token)) return;
      const record = arr(data.attendance).find(item => str(item.id) === str(id));
      if (!record) { content(dialog,empty('سجل الإضافي غير متاح لهذا الحساب.')); return; }
      const manager = record.decisionStage === 'manager', hr = record.decisionStage === 'hr', resubmit = record.canResubmit === true && record.decisionStage === 'employee';
      const editable = resubmit || (record.canReviewOvertime === true && (manager || hr));
      const summary = '<div class="r19-hr-detail-head"><div><h3>'+e(record.name)+'</h3><p>'+e(record.department)+' · '+e(record.date)+'</p></div><span class="r19-hr-tag '+overtimeClass(record)+'">'+overtimeStatus(record)+'</span></div>'+
        '<div class="r19-hr-overtime-values"><div><span>الزائد الفعلي</span><b>'+hours(record.extra)+'</b></div><div><span>موافقة المدير</span><b>'+hours(record.managerApproved)+'</b></div><div><span>اعتماد HR النهائي</span><b>'+hours(record.finalApproved)+'</b></div></div>'+
        (record.returnedReason ? '<div class="r19-hr-rejection"><b>سبب الإعادة</b><p>'+e(record.returnedReason)+'</p></div>' : '')+
        note(!record.complete ? 'يكتمل سجل الحضور أولاً حتى يمكن مراجعة ساعات الإضافي.' : 'اعتماد الساعات لا ينشئ مبلغاً مالياً أو خصماً من الراتب. يدخل المعتمد نهائياً في تسوية الساعات بنهاية الشهر.');
      const history = arr(record.approvalHistory).length ? '<section class="r19-hr-section"><h4>سجل الموافقات</h4><ol class="r19-hr-timeline">'+record.approvalHistory.map(entry => '<li><b>'+e(entry.action)+'</b><small>'+e(entry.by)+' · '+e(dateLabel(entry.at))+'</small>'+(entry.note ? '<p>'+e(entry.note)+'</p>' : '')+'</li>').join('')+'</ol></section>' : '';
      const choices = resubmit ? '<option value="resubmit">إرسال التوضيح إلى المدير المباشر</option>' : manager ? '<option value="full">اعتماد كامل الساعات الزائدة وإحالة إلى HR</option><option value="partial">اعتماد جزء من الساعات وإحالة إلى HR</option><option value="return">إعادة إلى الموظف مع ذكر السبب</option>' : '<option value="final">اعتماد نهائي للساعات التي وافق عليها المدير</option><option value="return">إعادة إلى المدير مع ذكر السبب</option>';
      const formHtml = editable ? '<form id="r19HROvertimeForm" class="r19-hr-form"><label>القرار<select name="decision">'+choices+'</select></label><div class="r19-hr-partial-hours" hidden><label>ساعات<input name="hours" type="number" min="0" max="48" step="1" value="'+Math.floor(Number(record.extra || 0)/60)+'"></label><label>دقائق<input name="minutes" type="number" min="0" max="59" step="1" value="'+(Number(record.extra || 0)%60)+'"></label></div><label class="r19-hr-top-gap">'+(resubmit ? 'التوضيح للمدير المباشر' : 'الملاحظات / سبب الإعادة')+'<textarea name="note" rows="3" maxlength="3000" '+(resubmit ? 'required' : '')+' placeholder="'+(resubmit ? 'أضف التوضيح المطلوب لإعادة مراجعة الساعات' : 'سبب الإعادة إلزامي عند إعادة الساعات للمراجعة')+'"></textarea></label><div id="r19HROvertimeError" class="r19-hr-error" hidden role="alert"></div><footer class="r19-hr-footer"><button class="btn primary" type="submit">'+(resubmit ? 'إعادة الإرسال إلى المدير' : 'حفظ القرار')+'</button>'+btn('إلغاء','close','r19-hr-overtime')+'</footer></form>' : '';
      content(dialog,summary+formHtml+history); if (!editable) return;
      const form = dialog.querySelector('form'), errorBox = dialog.querySelector('#r19HROvertimeError'); trackForm(dialog);
      form.elements.decision.addEventListener('change',() => { form.querySelector('.r19-hr-partial-hours').hidden = form.elements.decision.value !== 'partial'; form.elements.note.required = ['return','resubmit'].includes(form.elements.decision.value); });
      form.addEventListener('submit',event => {
        event.preventDefault(); event.stopPropagation();
        const decision = form.elements.decision.value, reviewNote = form.elements.note.value.trim();
        const hourValue = Number(form.elements.hours.value), minuteValue = Number(form.elements.minutes.value);
        let approved = decision === 'partial' ? hourValue*60+minuteValue : manager ? Number(record.extra) : Number(record.managerApproved);
        if (!form._r19Save?.uncertain) {
          if (['return','resubmit'].includes(decision) && !reviewNote) { setError(errorBox,decision === 'return' ? 'سبب الإعادة مطلوب.' : 'أضف التوضيح قبل إعادة الإرسال.'); return; }
          if (decision === 'partial' && (!Number.isInteger(hourValue) || hourValue < 0 || !Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 59)) { setError(errorBox,'أدخل الساعات والدقائق بأرقام صحيحة؛ الدقائق من 0 إلى 59.'); return; }
          if (!['return','resubmit'].includes(decision) && (!Number.isInteger(approved) || approved <= 0 || approved > Number(record.extra) || approved < Number(record.finalApproved || 0))) { setError(errorBox,'حدد مدة صحيحة ضمن الساعات الزائدة، ولا تقل عن الساعات المعتمدة نهائياً سابقاً.'); return; }
        }
        saveForm(dialog,form,errorBox,() => ({decision,minutes:['return','resubmit'].includes(decision) ? 0 : approved,note:reviewNote,version:record._version,sourceFingerprint:record.sourceFingerprint}),'/r19/hr/overtime/'+encodeURIComponent(record.id)+'/decision','POST',updated => {
          changed('overtime',updated); message(decision === 'return' ? 'تم توثيق الإعادة وسببها.' : decision === 'resubmit' ? 'أرسل التوضيح إلى المدير المباشر.' : manager ? 'أرسلت الساعات إلى الموارد البشرية لاعتمادها نهائياً.' : 'تم اعتماد الساعات نهائياً من الموارد البشرية.');
          closeSaved(dialog,() => openAttendance(date));
        });
      });
    } catch (error) { readError(dialog,token,error,() => openOvertimeReview(value)); }
  }

  function monthlyTable(data) {
    const duration = value => value == null ? '—' : hours(value);
    return '<div class="r19-hr-table-wrap"><table class="r19-hr-table r19-hr-monthly-table"><thead><tr><th>الموظف / السجلات</th><th>أساسي فعلي</th><th>أساسي مطلوب</th><th>فرق الأساسي</th><th>زائد فعلي</th><th>موافقة المدير</th><th>اعتماد HR النهائي</th><th>يعوّض النقص أولاً</th><th>صافي الإضافي</th><th>حالة التسوية</th></tr></thead><tbody>'+data.map(record => '<tr><td><b>'+e(record.name)+'</b><small>'+e(record.department)+' · '+e(record.recordDays)+' أيام مسجلة</small></td><td class="r19-hr-clock">'+hours(record.basic)+'</td><td class="r19-hr-clock">'+duration(record.required)+'</td><td class="r19-hr-clock">'+duration(record.deficit)+'</td><td class="r19-hr-clock">'+hours(record.raw)+'</td><td class="r19-hr-clock">'+hours(record.managerApproved)+'</td><td class="r19-hr-clock">'+hours(record.finalApproved)+'</td><td class="r19-hr-clock">'+duration(record.compensation)+'</td><td class="r19-hr-clock r19-hr-gold"><b>'+duration(record.netExtra)+'</b>'+(!record.complete ? '<small>تقديري</small>' : '')+'</td><td><span class="r19-hr-tag '+(record.complete ? 'approved' : 'pending_hr')+'">'+(record.required == null ? 'بانتظار تحديد الأساسي المطلوب' : !record.complete ? 'حساب أولي للسجلات المتاحة' : 'الشهر والسجلات مكتملان')+'</span>'+(record.pending ? '<small>'+hours(record.pending)+' من الخام غير معتمد نهائياً</small>' : '')+'</td></tr>').join('')+'</tbody></table></div>';
  }
  async function openMonthly(selectedMonth) {
    const month = validMonth(selectedMonth) ? selectedMonth : today().slice(0,7);
    const dialog = createDialog('r19-hr-attendance','تقرير الساعات والتسوية الشهرية',reportTabs('monthly')+'<div class="r19-hr-toolbar"><label>الشهر<input id="r19HRMonth" type="month" value="'+e(month)+'"></label>'+btn('تصدير CSV','csv')+btn('تحديث','attendance-refresh')+'<span id="r19HRPolicyShortcut"></span></div><div id="r19HRMonthlyReport"></div>'); if (!dialog) return;
    const token = dialog._r19HRView; let rendering = 0;
    const render = async () => {
      const stamp = ++rendering, selected = dialog.querySelector('#r19HRMonth').value, target = dialog.querySelector('#r19HRMonthlyReport'), exportButton = dialog.querySelector('[data-r19-hr-action="csv"]');
      dialog._r19HRReport = null; exportButton.disabled = true;
      if (!validMonth(selected)) { target.innerHTML = empty('اختر شهراً صحيحاً.'); return; }
      target.innerHTML = loading();
      try {
        const data = await readSnapshot({month:selected,date:selected+'-01'}); if (!dialogCurrent(dialog,token) || stamp !== rendering) return;
        const configured = Object.prototype.hasOwnProperty.call(data.policy?.workdaysByMonth || {},selected);
        const policyText = configured ? 'الأساسي المطلوب لهذا الشهر: '+data.policy.workdaysByMonth[selected]+' أيام × 8 ساعات.' : 'لم تحدد الموارد البشرية أيام العمل المطلوبة لهذا الشهر بعد.';
        const list = arr(data.monthly);
        target.innerHTML = note(policyText+' التسوية تتم بنهاية الشهر: يعوض الزائد المعتمد نهائياً نقص الأساسي أولاً، والباقي صافي إضافي.')+
          '<div class="r19-hr-provisional"><b>الحساب حسب سجلات الحضور المتاحة</b><p>فرق الأساسي لا يثبت غياباً أو نقص دوام نهائياً عند قلة السجلات. تحتاج التسوية اكتمال الشهر والسجلات وتحديد الأساسي المطلوب، ولا ينشئ هذا التقرير خصومات أو أجوراً.</p></div>'+(list.length ? monthlyTable(list) : empty('لا توجد سجلات في هذا الشهر.'));
        dialog.querySelector('#r19HRPolicyShortcut').innerHTML = data.capabilities?.editPolicy ? btn('تحديد أيام العمل المطلوبة','policy',selected) : '';
        dialog.querySelector('.r19-hr-report-tabs').outerHTML = reportTabs('monthly');
        dialog._r19HRReport = {type:'monthly',period:selected,rows:list}; exportButton.disabled = false;
      } catch (error) { if (dialogCurrent(dialog,token) && stamp === rendering) target.innerHTML = '<div class="r19-hr-error" role="alert">'+e(error.message)+'</div>'+note('استخدم «تحديث» لإعادة تحميل الشهر المختار.'); }
    };
    dialog._r19HRRefresh = render; dialog.querySelector('#r19HRMonth').addEventListener('change',render); await render();
  }

  async function openAttendancePolicy(selectedMonth) {
    const existing = document.getElementById('r19-hr-policy'); if (existing?.open && existing.querySelector('form')) { existing.querySelector('input')?.focus(); return; }
    const month = validMonth(selectedMonth) ? selectedMonth : today().slice(0,7);
    const dialog = createDialog('r19-hr-policy','سياسة الدوام والتسوية',loading()); if (!dialog) return;
    const token = dialog._r19HRView;
    try {
      const data = await readSnapshot({month,date:month+'-01'}); if (!dialogCurrent(dialog,token)) return;
      if (!data.capabilities?.editPolicy) { content(dialog,empty('تعديل سياسة الدوام متاح للموارد البشرية.')); return; }
      const policy = data.policy, days = policy.workdaysByMonth?.[month];
      content(dialog,reportTabs('policy')+note('الموارد البشرية تحدد أيام العمل المطلوبة لكل شهر. حد اليوم المعتمد 8 ساعات؛ الزائد المعتمد نهائياً يعوض نقص الأساسي أولاً عند التسوية الشهرية.')+
        '<form id="r19HRPolicyForm" class="r19-hr-form"><div class="r19-hr-grid"><label>الشهر<input name="month" type="month" value="'+e(month)+'" required></label><label>أيام العمل المطلوبة للشهر<input name="workdays" type="number" min="0" max="31" step="1" value="'+(days === undefined ? '' : e(days))+'" placeholder="تحددها الموارد البشرية" required></label><label>ساعات اليوم الأساسي<input value="8 ساعات" readonly aria-readonly="true"></label><label>سياسة التسوية<input value="تعويض نقص الأساسي أولاً" readonly aria-readonly="true"></label></div><p class="r19-hr-note r19-hr-top-gap">تدخل أيام العمل الفعلية المطلوبة حسب سياسة الشركة. لا توجد قيمة افتراضية مفترضة لعدد الأيام.</p><div id="r19HRPolicyError" class="r19-hr-error" hidden role="alert"></div><footer class="r19-hr-footer"><button class="btn primary" type="submit">حفظ سياسة الشهر</button>'+btn('إلغاء','close','r19-hr-policy')+'</footer></form>');
      const form = dialog.querySelector('form'), errorBox = dialog.querySelector('#r19HRPolicyError'); trackForm(dialog);
      form.elements.month.addEventListener('change',() => { const value = policy.workdaysByMonth?.[form.elements.month.value]; form.elements.workdays.value = value === undefined ? '' : value; });
      form.addEventListener('submit',event => {
        event.preventDefault(); event.stopPropagation();
        const selected = form.elements.month.value, workdays = Number(form.elements.workdays.value);
        if (!form._r19Save?.uncertain && (!validMonth(selected) || !form.elements.workdays.value.trim() || !Number.isInteger(workdays) || workdays < 0 || workdays > new Date(Number(selected.slice(0,4)),Number(selected.slice(5,7)),0).getDate())) { setError(errorBox,'اختر الشهر وأدخل عدد أيام عمل صحيحاً ضمن أيامه.'); return; }
        saveForm(dialog,form,errorBox,() => ({month:selected,workdays,version:policy._version}),'/r19/hr/policy','PUT',updated => {
          changed('policy',updated); message('حفظت أيام العمل المطلوبة وسياسة التسوية.'); closeSaved(dialog,() => openMonthly(selected));
        });
      });
    } catch (error) { readError(dialog,token,error,() => openAttendancePolicy(month)); }
  }

  function download(filename, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data],{type:mime});
    const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url),30000);
  }
  function exportCsv() {
    const report = document.getElementById('r19-hr-attendance')?._r19HRReport;
    if (!report) { message('انتظر اكتمال تحميل التقرير قبل تصديره.'); return; }
    const cell = value => '"'+str(value).replace(/^(\s*[=+\-@])/u,"'$1").replace(/"/g,'""')+'"';
    const lines = report.type === 'monthly' ? [['الشهر','الموظف','القسم','أيام مسجلة','أساسي فعلي','أساسي مطلوب','فرق الأساسي الحسابي','زائد فعلي','موافقة المدير','معتمد HR نهائياً','تعويض النقص','صافي إضافي','حالة التقرير'],...report.rows.map(record => [report.period,record.name,record.department,record.recordDays,hours(record.basic),record.required == null ? 'غير محدد' : hours(record.required),record.deficit == null ? 'غير محدد' : hours(record.deficit),hours(record.raw),hours(record.managerApproved),hours(record.finalApproved),record.compensation == null ? 'غير محسوب' : hours(record.compensation),record.netExtra == null ? 'غير محسوب' : hours(record.netExtra),record.complete ? 'الشهر والسجلات مكتملان' : 'حساب أولي للسجلات المتاحة'])] : [['اليوم','الموظف','القسم','الدخول','الخروج','التأخير بالدقائق','أساسي ساعة:دقيقة','زائد فعلي','موافقة المدير','اعتماد HR النهائي','الإجمالي ساعة:دقيقة','حالة اعتماد الإضافي'],...report.rows.map(record => [report.period,record.name,record.department,record.inTime,record.outTime,record.delay == null ? 'غير محدد' : record.delay,hours(record.basic),hours(record.extra),hours(record.managerApproved),hours(record.finalApproved),hours(record.total),overtimeStatus(record)])];
    download('MOSH_'+(report.type === 'monthly' ? 'MONTHLY' : 'ATTENDANCE')+'_'+report.period+'.csv','\ufeff'+lines.map(line => line.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  }
  async function openAttachment(value) {
    const separator = str(value).indexOf('|'); if (separator < 0) return;
    const id = value.slice(0,separator), key = value.slice(separator+1);
    const record = rows().find(item => str(item.id) === id), file = arr(record?.attachments).find(item => str(item.key) === key);
    if (!file) { message('المرفق غير متاح لهذا الحساب.'); return; }
    try { const blob = await apiRequest('/files/'+encodeURIComponent(key)+'/content',{binary:true}); download(file.name || 'attachment',blob,file.type || file.mime); }
    catch (error) { message(error.message || 'تعذر تنزيل المرفق.'); }
  }

  const PRESENCE_AWAY = ['left','waiting','off'];
  const PRESENCE_FILTERS = [
    ['all','كل الموظفين'], ['present','مداومون'], ['away','غير موجودين'],
    ['absent','غائبون'], ['late','متأخرون'], ['leave','في إجازة']
  ];
  const PRESENCE_STATUSES = {
    present:['مداوم','approved'], left:['غادر الدوام',''], waiting:['بانتظار الحضور','pending_hr'],
    absent:['غائب','rejected'], leave:['إجازة معتمدة','approved'], off:['يوم راحة',''],
    unscheduled:['جدول الدوام غير محدد',''], review:['بحاجة للمراجعة','pending_hr']
  };
  const PRESENCE_REFRESH_MS = 60000;
  let dailyPresence, presenceRefreshPending = false, presenceOwner = '', presenceFilter = 'all';

  function presenceHost() {
    const content = document.querySelector('#hrApp.active #hrProContent');
    return content?.getClientRects().length ? content.querySelector('[data-hr-daily-presence]') : null;
  }

  function closePresence() {
    if (!dailyPresence) return;
    dailyPresence.controller?.abort();
    clearTimeout(dailyPresence.timer);
    dailyPresence.host.replaceChildren();
    dailyPresence = null;
  }

  function currentPresence(view) {
    return dailyPresence === view && view.identity === str(window.MoshApi?.user?.id) && presenceHost() === view.host;
  }

  function presenceTime(value, formatter) {
    if (!value) return '—';
    if (/^\d{2}:\d{2}(?::\d{2})?$/.test(value)) return value.slice(0,5);
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? formatter.format(date) : '—';
  }

  function presenceTable(rows, formatter, day) {
    if (!rows.length) return empty('لا يوجد موظفون ضمن هذه الحالة.');
    const timeCell = (value,date) => '<td><bdi>'+e(presenceTime(value,formatter))+'</bdi>'+
      (validDate(date) && date !== day ? '<small><bdi>'+e(date)+'</bdi></small>' : '')+'</td>';
    const columns = ['الموظف','القسم','الحالة','بداية الدوام','الدخول','الخروج','التأخير'];
    const list = rows.map(row => {
      const [label,color] = Object.hasOwn(PRESENCE_STATUSES,row.status) ? PRESENCE_STATUSES[row.status] : PRESENCE_STATUSES.review;
      const delay = row.delayMinutes;
      const delayText = Number.isFinite(delay) ? '<span'+(delay > 0 ? ' class="r19-hr-gold"' : '')+'>'+delay.toLocaleString('ar-SY')+' د</span>' : '—';
      const detail = ['waiting','absent','review'].includes(row.status) && row.reason ? '<small>'+e(row.reason)+'</small>' : '';
      return '<tr data-hr-presence-row="'+e(row.employeeId)+'" data-status="'+e(row.status)+'"><td><b>'+e(row.name)+'</b></td><td>'+e(row.department || '—')+'</td><td><span class="r19-hr-tag '+color+'">'+label+'</span>'+detail+'</td>'+
        timeCell(row.scheduledStart)+timeCell(row.inTime,row.inDate)+timeCell(row.outTime,row.outDate)+'<td>'+delayText+'</td></tr>';
    });
    return '<div class="h13-table-wrap"><table class="h13-table" aria-label="حالات دوام الموظفين"><thead><tr>'+
      columns.map(label => '<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+list.join('')+'</tbody></table></div>';
  }

  function showPresenceRows(view) {
    const data = view.data;
    if (!data) return;
    const counts = data.counts;
    const count = key => Number(counts[key]) || 0;
    const all = arr(data.rows);
    const hasAttendance = all.some(row => row.inTime || row.outTime);
    const list = all.filter(row => presenceFilter === 'all' ||
      (presenceFilter === 'late' ? Number(row.delayMinutes) > 0 :
        presenceFilter === 'away' ? PRESENCE_AWAY.includes(row.status) : row.status === presenceFilter));
    const filters = view.host.querySelector('[data-hr-presence-filters]');
    filters.hidden = !all.length;
    filters.querySelectorAll('button').forEach(button => {
      const key = button.dataset.hrPresenceFilter;
      button.setAttribute('aria-pressed',String(key === presenceFilter));
      button.classList.toggle('active',key === presenceFilter);
      const total = key === 'all' ? count('total') : key === 'away' ? PRESENCE_AWAY.reduce((sum,status) => sum + count(status),0) : count(key);
      button.querySelector('[data-hr-presence-count]').textContent = total.toLocaleString('ar-SY');
    });
    const notices = [];
    if (all.length && !hasAttendance) notices.push('لم تُسجّل حركات حضور مؤكدة لليوم حتى الآن.');
    if (count('unscheduled')) notices.push('احتساب الغياب والتأخير يتطلّب جدول دوام محدداً للموظف.');
    view.host.querySelector('[data-hr-presence-notes]').innerHTML = notices.length ? note(notices.join(' ')) : '';
    view.host.querySelector('[data-hr-presence-results]').innerHTML = all.length ? presenceTable(list,view.clock,data.date) : empty('لا يوجد موظفون ضمن لوحة الحضور.');
  }

  async function loadDailyPresence(view) {
    if (!view.disclosure.open || !currentPresence(view) || view.controller) return;
    clearTimeout(view.timer);
    const results = view.host.querySelector('[data-hr-presence-results]');
    const refresh = view.host.querySelector('[data-hr-presence-refresh]');
    const stamp = view.host.querySelector('[data-hr-presence-updated]');
    const controller = new AbortController();
    view.controller = controller;
    refresh.disabled = true;
    results.setAttribute('aria-busy','true');
    if (!view.data) results.innerHTML = loading();
    try {
      const data = await apiRequest('/r19/hr/presence',{cache:'no-store',signal:controller.signal});
      if (!currentPresence(view)) return;
      if (!Array.isArray(data?.rows) || !data.counts || !validDate(data.date)) throw new Error('لم تكتمل بيانات الحضور.');
      view.data = data;
      view.loadedAt = Date.now();
      const zone = data.timeZone || timeZone();
      const formatterOptions = {hour:'2-digit',minute:'2-digit',hourCycle:'h23'};
      view.clock = new Intl.DateTimeFormat('ar-SY',{...formatterOptions,timeZone:zone});
      const calendar = new Intl.DateTimeFormat('ar-SY',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});
      const day = calendar.format(new Date(data.date+'T12:00:00Z'));
      stamp.textContent = day + (data.asOf ? ' · آخر تحديث '+presenceTime(data.asOf,view.clock) : '');
      view.host.hidden = false;
      showPresenceRows(view);
      if (view.disclosure.open) {
        view.timer = setTimeout(() => {
          if (document.visibilityState === 'visible') void loadDailyPresence(view);
        },PRESENCE_REFRESH_MS);
      }
    } catch (error) {
      if (!currentPresence(view)) return;
      view.data = null;
      view.host.querySelector('[data-hr-presence-filters]').hidden = true;
      view.host.querySelector('[data-hr-presence-notes]').replaceChildren();
      stamp.textContent = '';
      if (error.status === 403) {
        view.host.hidden = true;
        results.replaceChildren();
        return;
      }
      results.innerHTML = '<div role="alert" class="r19-hr-error">تعذّر تحميل حالة الدوام. اضغط على زر التحديث لإعادة المحاولة.</div>';
    } finally {
      view.controller = null;
      if (currentPresence(view)) {
        refresh.disabled = false;
        results.removeAttribute('aria-busy');
      }
    }
  }

  function mountDailyPresence(force = false) {
    const host = presenceHost();
    const identity = str(window.MoshApi?.user?.id);
    if (!host || !identity) { closePresence(); return; }
    if (dailyPresence?.host === host && dailyPresence.identity === identity) {
      if (force) void loadDailyPresence(dailyPresence);
      return;
    }
    const expanded = dailyPresence?.identity === identity && dailyPresence.disclosure.open;
    closePresence();
    if (presenceOwner !== identity) { presenceOwner = identity; presenceFilter = 'all'; }
    const filters = PRESENCE_FILTERS.map(([key,label]) =>
      '<button type="button" class="btn r19-hr-button" data-hr-presence-filter="'+key+'" aria-pressed="false">'+label+' <b data-hr-presence-count></b></button>'
    ).join('');
    host.innerHTML = '<details data-hr-presence-disclosure><summary style="cursor:pointer"><strong>حالة دوام الموظفين اليوم</strong></summary>'+
      '<header style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-block:12px">'+
      '<small class="r19-hr-muted" data-hr-presence-updated></small>'+
      '<button type="button" class="h13-btn" aria-label="تحديث حالة الدوام" title="تحديث حالة الدوام" data-hr-presence-refresh><span aria-hidden="true">↻</span></button></header>'+
      '<div data-hr-presence-notes></div><div class="r19-hr-report-tabs" aria-label="حالات الدوام" role="group" data-hr-presence-filters hidden>'+filters+'</div>'+
      '<div data-hr-presence-results></div></details>';
    const disclosure = host.querySelector('[data-hr-presence-disclosure]');
    const view = {host,identity,disclosure,data:null,controller:null,timer:null,loadedAt:0};
    dailyPresence = view;
    host.hidden = false;
    disclosure.addEventListener('toggle',() => {
      if (disclosure.open) void loadDailyPresence(view);
      else clearTimeout(view.timer);
    });
    host.querySelector('[data-hr-presence-refresh]').onclick = () => loadDailyPresence(view);
    host.querySelector('[data-hr-presence-filters]').onclick = event => {
      const button = event.target.closest('[data-hr-presence-filter]');
      if (!button || !currentPresence(view)) return;
      presenceFilter = button.dataset.hrPresenceFilter;
      showPresenceRows(view);
    };
    if (expanded) disclosure.open = true;
  }

  function navButton(parent,id,label,action,requestDepartment,show,rail) {
    if (!parent) return;
    let container = document.getElementById(id), button;
    if (!container) {
      container = document.createElement(rail ? 'button' : 'div'); container.id = id; container.className = rail ? 'r19-hr-rail-action' : 'menu r19-hr-nav-slot';
      if (rail) { container.type = 'button'; button = container; } else { button = document.createElement('button'); button.type = 'button'; button.className = 'design-menu-btn'; container.append(button); }
      button.dataset.r19HrAction = action; button.dataset.id = requestDepartment || ''; parent.append(container);
    }
    button = rail ? container : container.querySelector('button'); if (button.textContent !== label) button.textContent = label;
    // Avoid retriggering department navigation observers when visibility is unchanged.
    if (container.hidden !== !show) container.hidden = !show;
    const display = show ? '' : 'none';
    if (container.style.display !== display) container.style.display = display;
  }
  function mount() {
    mountDailyPresence(presenceRefreshPending);
    presenceRefreshPending = false;
    if (!P()?.dialog) return;
    resetForIdentity();
    const identity = userId();
    if (identity && initialAttemptIdentity !== identity) { initialAttemptIdentity = identity; readSnapshot().catch(() => {}); }
    const departments = myDepartments(), caps = capabilities();
    Object.entries(DEPARTMENTS).forEach(([key,name]) => {
      const menu = document.getElementById(key+'App')?.querySelector('.menu-strip'); if (!menu) return;
      const visible = caps.requestDisciplinary === true && departments.includes(name);
      navButton(menu,'r19HRNew-'+key,'طلب خصم أو عقوبة','new',name,visible,false);
      navButton(menu,'r19HRTrack-'+key,'متابعة الطلبات','inbox','',visible,false);
      navButton(menu,'r19HRAtt-'+key,'تقرير حضور القسم','attendance','',visible,false);
    });
    const count = status => rows().filter(record => record.status === status && record.canReview).length;
    const hr = document.getElementById('hrProNav');
    navButton(hr,'r19HRInbox','طلبات الخصم والعقوبات'+(count('pending_hr') ? ' · '+count('pending_hr') : ''),'inbox','',!!(caps.reviewHr || caps.reviewAdministration),true);
    navButton(hr,'r19HRAttendance','تقرير الحضور اليومي','attendance','',!!(caps.reviewHr || caps.reviewAdministration),true);
    const admin = document.querySelector('#adminApp .admin-pure-nav');
    navButton(admin,'r19AdminHRInbox','خصومات وعقوبات'+(count('pending_admin') ? ' · '+count('pending_admin') : ''),'inbox','',!!caps.reviewAdministration,true);
    const actions = document.querySelector('#hrApp .hr-v209-profile-actions');
    if (actions && !actions.querySelector('[data-r19-hr-action="profile"]')) { const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.dataset.r19HrAction = 'profile'; button.textContent = 'الإجراءات الوظيفية والأرشيف'; actions.append(button); }
    document.querySelectorAll('[data-r19-my-record]').forEach(element => { if (!element.dataset.r19HrAction) element.dataset.r19HrAction = 'record'; });
  }
  function guarded(dialog, next) {
    if (dialog?.open && dialog.getAttribute('aria-busy') === 'true') return;
    if (dialog?.open && P()?.guard) P().guard(dialog,() => { P().close(dialog.id,true); next(); }); else next();
  }
  document.addEventListener('click',event => {
    const button = event.target.closest?.('[data-r19-hr-action]'); if (!button || button.disabled) return;
    event.preventDefault(); event.stopPropagation(); const id = button.dataset.id || '';
    switch (button.dataset.r19HrAction) {
      case 'new': openRequest(id); break;
      case 'inbox': openInbox(); break;
      case 'inbox-refresh': openInbox(document.querySelector('#r19HRFilter')?.value); break;
      case 'details': guarded(document.getElementById('r19-hr-review'),() => openDetails(id)); break;
      case 'approve': openReview(id,'approve'); break;
      case 'reject': openReview(id,'reject'); break;
      case 'attendance': openAttendance(); break;
      case 'attendance-refresh': document.getElementById('r19-hr-attendance')?._r19HRRefresh?.(); break;
      case 'record': openMyRecord(); break;
      case 'profile': {
        const host = button.closest('[data-employee-id],[data-staff-id]');
        const selected = host?.dataset.employeeId || host?.dataset.staffId;
        if (selected) openMyRecord(selected);
        else {
          const name = document.querySelector('#hrApp .hr-v209-profile-person h2')?.textContent?.trim();
          const matches = people().filter(person => person.name === name);
          if (matches.length === 1) openMyRecord(matches[0].id); else message('حدد ملف الموظف لعرض الإجراءات المحفوظة.');
        }
        break;
      }
      case 'csv': exportCsv(); break;
      case 'overtime': openOvertimeReview(id); break;
      case 'policy': openAttendancePolicy(id); break;
      case 'attendance-view': guarded(document.getElementById('r19-hr-policy'),() => { if (id === 'monthly') openMonthly(); else if (id === 'policy') openAttendancePolicy(); else openAttendance(); }); break;
      case 'attachment': openAttachment(id); break;
      case 'close': P()?.close?.(id); break;
    }
  },true);
  function scheduleMount() { if (mountPending) return; mountPending = true; requestAnimationFrame(() => { mountPending = false; mount(); }); }
  document.addEventListener('mosh:page-mounted',mount);
  window.addEventListener('mosh:r19-change',scheduleMount);
  document.addEventListener('mosh:r19-change',scheduleMount);
  document.addEventListener('mosh:section-enter',scheduleMount);
  document.addEventListener('mosh:permissions-applied',scheduleMount);
  document.addEventListener('visibilitychange',() => {
    const view = dailyPresence;
    if (view?.data && document.visibilityState === 'visible' && Date.now()-view.loadedAt >= PRESENCE_REFRESH_MS) void loadDailyPresence(view);
  });
  for (const type of ['mosh:session-expired','mosh:logout-complete']) {
    document.addEventListener(type,() => { closePresence(); presenceOwner = ''; presenceFilter = 'all'; });
  }
  document.addEventListener('mosh:refreshed',() => { presenceRefreshPending = true; initialAttemptIdentity = ''; generation++; reads.clear(); scheduleMount(); });
  document.addEventListener('mosh:session-expired',() => { generation++; reads.clear(); cache = initialData(); initialAttemptIdentity = userId(); IDS.forEach(id => { if (document.getElementById(id)?.open) P()?.close?.(id,true); }); scheduleMount(); });
  window.addEventListener('focus',() => { if (userId() && Date.now()-lastLoadedAt > 60000) readSnapshot().catch(() => {}); });
  const observer = new MutationObserver(records => { if (records.some(record => record.addedNodes.length || record.removedNodes.length)) scheduleMount(); });
  if (document.body) observer.observe(document.body,{childList:true,subtree:true});
  window.MoshHR19 = {openRequest,openInbox,openAttendance,openMonthly,openAttendancePolicy,openMyRecord,openDetails,mount,refresh:readSnapshot};
  mount();
})();
