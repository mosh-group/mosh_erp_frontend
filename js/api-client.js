// UUID fallback for authenticated HTTP intranets; random IDs are not access credentials.
if(globalThis.crypto && typeof globalThis.crypto.randomUUID!=='function' && typeof globalThis.crypto.getRandomValues==='function'){
 globalThis.crypto.randomUUID=function(){const b=new Uint8Array(16);globalThis.crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0'));return h.slice(0,4).join('')+'-'+h.slice(4,6).join('')+'-'+h.slice(6,8).join('')+'-'+h.slice(8,10).join('')+'-'+h.slice(10).join('');};
}
/* Laravel transport for the existing Vanilla interface. No business records are kept in browser storage. */
(function () {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const get = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
  const set = (object, path, value) => {
    const keys = path.split('.'); let target = object;
    for (const key of keys.slice(0, -1)) target = target[key] ??= {};
    target[keys.at(-1)] = value;
  };
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let csrf = '', baseline = null, wanted = null, scheduled = false, pending = null, ready = false;
  let taskPending = null, workdeskUncertain = null;
  const pendingFileRemovals = new Set();
  const api = window.MoshApi = {initialState: {}, auth: {version: 2, users: [], roles: [], security: {minLength: 8}, audit: []}, resources: {}, settingPaths: {}, settings: {}, transactions: [], status: null, retryUntil: 0};
  const publicAuthPath = path => ['/auth/status', '/auth/login', '/auth/setup'].includes(path.split('?')[0]);
  const retryDeadline = response => {
    const value = response.headers.get('Retry-After');
    if (!value) return 0;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Date.now() + Math.max(0, seconds) * 1000;
    const date = Date.parse(value);
    return Number.isFinite(date) ? Math.max(Date.now(), date) : 0;
  };
  api.request = async function (path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    const method = options.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD') headers.set('X-CSRF-TOKEN', csrf);
    let body = options.body;
    if (body !== undefined && !(body instanceof FormData)) { headers.set('Content-Type', 'application/json'); body = JSON.stringify(body); }
    let response;
    try { response = await fetch(window.API_BASE_URL.replace(/\/$/, '') + path, {...options, method, headers, body, credentials: 'include'}); }
    catch (cause) { if(cause?.name==='AbortError')throw Object.assign(new Error('انتهت مهلة الاتصال؛ أعد المحاولة.'),{name:'AbortError',network:true,aborted:true}); throw Object.assign(new Error('تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.'), {network: true}); }
    const serverDate=Date.parse(response.headers.get('Date')||'');
    if(Number.isFinite(serverDate)) { api.serverOffset=serverDate-Date.now(); api.serverClockConfirmed=true; }
    if (options.binary && response.ok) return response.blob();
    let result; try { result = await response.json(); } catch (cause) {
      if(cause?.name==='AbortError')throw Object.assign(new Error('انتهت مهلة الاتصال؛ أعد المحاولة.'),{name:'AbortError',network:true,aborted:true});
      if(response.ok)throw Object.assign(new Error('لم يكتمل استلام رد الخادم. أعد المحاولة.'),{network:true});
      result = {};
    }
    if (!response.ok || result.success === false) {
      const details = Object.values(result.errors || {}).flat().join('\n');
      const retryAt = response.status === 429 ? retryDeadline(response) : 0;
      if (retryAt) api.retryUntil = Math.max(api.retryUntil, retryAt);
      const error = Object.assign(new Error(details || result.message || 'تعذر إتمام الطلب.'), {status: response.status, errors: result.errors, retryAt, retryAfter: retryAt ? Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)) : 0});
      if(error.errors&&method!=='GET'&&method!=='HEAD')document.dispatchEvent(new CustomEvent('mosh:validation-error',{detail:error}));
      if (response.status === 429 && error.retryAfter) error.message += '\nأعد المحاولة بعد ' + error.retryAfter + ' ثانية.';
      if (response.status === 401 && !publicAuthPath(path)) {
        document.dispatchEvent(new CustomEvent('mosh:session-expired'));
      }
      if (response.status === 419) {
        error.message = 'انتهت صلاحية الجلسة. حدّث الصفحة وسجّل الدخول من جديد.';
        document.dispatchEvent(new CustomEvent('mosh:session-expired'));
      }
      throw error;
    }
    if (result.data?.csrfToken) csrf = result.data.csrfToken;
    return options.envelope ? result : result.data;
  };
  api.serverNow = () => Date.now() + (Number(api.serverOffset)||0);
  api.showError = error => {
    console.error('MOSH API:', error);
    const message = error?.message || String(error);
    if (typeof window.toast === 'function') window.toast(message, true); else window.alert(message);
  };
  api.bootstrap = async function (options = {}) {
    const data = await api.request('/bootstrap', {...options, cache:'no-store'});
    data.state.departmentManagers = Object.assign({}, data.state.departmentManagers || {});
    if (data.settings?.['department-managers']) data.settings['department-managers'].value = Object.assign({}, data.settings['department-managers'].value || {});
    api.initialState = data.state; api.resources = data.resources; api.settingPaths = data.settingPaths; api.settings = data.settings;
    api.auth = {version: 2, users: data.users, roles: data.roles, security: data.security, audit: api.auth.audit || []};
    api.user = data.user; return data;
  };
  api.initialize = function () {
    baseline = copy(state); ready = true; wanted = null;
    customersCatalog = state.customers; servicesCatalog = state.services;
    lastSavedStateRaw = JSON.stringify(state);
  };
  function rows(snapshot, spec) {
    const value = get(snapshot, spec.statePath);
    return spec.mode === 'map' ? Object.entries(value || {}).map(([id, row]) => ({...row, id})) : (Array.isArray(value) ? value : []);
  }
  function transportRow(resource, row) {
    const value = copy(row);
    if (resource === 'quotations') delete value.customerInfo;
    if (resource === 'employees') delete value.leaveAccrualCycle;
    if (resource === 'hr-requests') {
      delete value.employeeResultReady; delete value.employeeResultSeen;
      delete value.employeeResultAt; delete value.employeeResultStatus;
      delete value.employeeResultBy; delete value.employeeResultNote;
      delete value.employeeResultSeenAt;
    }
    return value;
  }
  function operations(before, after) {
    const ops = [];
    for (const [resource, spec] of Object.entries(api.resources)) {
      const old = new Map(rows(before, spec).map(row => [String(row.id), transportRow(resource, row)]));
      const current = rows(after, spec).map(row => transportRow(resource, row));
      for (const row of current) {
        if (row.id === undefined || row.id === null || row.id === '') throw new Error('سجل بلا معرّف: ' + resource);
        const previous = old.get(String(row.id)); old.delete(String(row.id));
        if (!previous) {
          // Automatic journals are derived from invoices and payments on the server.
          if (resource === 'journal-entries' && !row.manual) continue;
          ops.push({resource, action: 'create', id: row.id, data: row});
        } else {
          const data = {};
          for (const key of new Set([...Object.keys(previous), ...Object.keys(row)])) {
            if (['_version','updatedAt','updatedBy','createdAt','createdBy'].includes(key)) continue;
            if(resource==='employees'&&!Object.prototype.hasOwnProperty.call(row,key))continue; // Omission in a partial employee projection is not an instruction to erase a field.
            if (!equal(previous[key], row[key])) data[key] = row[key] === undefined ? null : row[key];
          }
          if (Object.keys(data).length) ops.push({resource, action: 'update', id: row.id, version: previous._version, data});
        }
      }
      if(resource==='employees'&&old.size){const error=new Error('توقّف الحفظ لحماية بيانات الموظفين: اختفت سجلات من نسخة الواجهة. لم يُرسل أي حذف. حدّث البيانات أو استخدم إيقاف النشاط بدلاً من حذف الملف.');error.code='EMPLOYEE_DATA_GUARD';throw error;}
      for (const row of old.values()) ops.push({resource, action: 'delete', id: row.id, version: row._version});
    }
    for (const [key, path] of Object.entries(api.settingPaths)) {
      const a = get(before, path), b = get(after, path);
      if (!equal(a, b)) ops.push({resource: 'settings/' + key, action: 'update', id: key, version: api.settings[key]?._version, data: b || {}});
    }
    return ops;
  }
  function mergeChange(snapshot, change, submitted) {
    if (change.resource.startsWith('settings/')) {
      const key = change.resource.slice(9), path = api.settingPaths[key];
      if(key==='department-managers')change={...change,data:{...change.data,value:Object.assign({},change.data.value||{})}};
      api.settings[key] = copy(change.data);
      if (path && (!submitted || equal(get(snapshot, path), get(submitted, path)))) set(snapshot, path, copy(change.data.value));
      return;
    }
    const spec = api.resources[change.resource]; if (!spec) return;
    const id = String(change.id), target = get(snapshot, spec.statePath);
    const existing = spec.mode === 'map' ? target?.[id] : target?.find(row => String(row.id) === id);
    const sent = submitted && rows(submitted, spec).find(row => String(row.id) === id);
    if (change.data === null) {
      if (spec.mode === 'map') delete target[id]; else if (existing) target.splice(target.indexOf(existing), 1);
      return;
    }
    let value = copy(change.data);
    if (existing && sent) {
      // Retain an edit entered while an earlier request was in flight.
      for (const key of Object.keys(existing)) if (key !== '_version' && !equal(existing[key], sent[key])) value[key] = existing[key];
    }
    if (spec.mode === 'map') target[id] = value;
    else if (existing) Object.assign(existing, value);
    else target.push(value);
  }
  async function drain() {
    while (wanted) {
      const sent = wanted; wanted = null;
      let ops;
      try{ops=operations(baseline,sent);}catch(error){wanted=null;state=copy(baseline);customersCatalog=state.customers;servicesCatalog=state.services;lastSavedStateRaw=JSON.stringify(state);document.dispatchEvent(new CustomEvent('mosh:save-failed',{detail:error}));api.showError(error);throw error;}
      if(!ops.length)continue;
      const key = crypto.randomUUID();
      document.documentElement.dataset.moshSaving = '1';
      let result;
      try {
        // Keep the same key for a lost-response retry, preventing duplicate financial effects.
        try { result = await api.request('/transactions', {method:'POST', headers:{'Idempotency-Key':key}, body:{operations:ops}}); }
        catch (error) { if (!error.network) throw error; result = await api.request('/transactions', {method:'POST', headers:{'Idempotency-Key':key}, body:{operations:ops}}); }
        baseline = copy(sent);
        for (const change of result.changes) {
          mergeChange(baseline, change);
          mergeChange(state, change, sent);
          if (wanted) mergeChange(wanted, change, sent);
        }
        api.transactions.push(result.transactionId);
        for (const key of pendingFileRemovals) {
          try {await api.request('/files/'+encodeURIComponent(key),{method:'DELETE'});pendingFileRemovals.delete(key);}
          catch (error) {if([403,404].includes(error.status))pendingFileRemovals.delete(key);else if(error.status!==409)console.warn(error.message);}
        }
        lastSavedStateRaw = JSON.stringify(state);
        document.dispatchEvent(new CustomEvent('mosh:saved', {detail:result}));
        // A committed mutation stays successful even if this non-authoritative refresh fails.
        if (ops.some(op => ['invoices','financial-documents','cash-accounts','payments','journal-entries'].includes(op.resource))) {
          try {
            const journal = await api.listAll('journal-entries');
            baseline.finance22.journal = copy(journal); state.finance22.journal = copy(journal);
            if (wanted) wanted.finance22.journal = copy(journal);
          } catch (refreshError) {
            console.warn('Saved successfully; journal refresh will be retried on the next refresh.', refreshError);
            document.dispatchEvent(new CustomEvent('mosh:refresh-failed', {detail:refreshError}));
          }
        }
      } catch (error) {
        wanted = null; state = copy(baseline); customersCatalog = state.customers; servicesCatalog = state.services;
        lastSavedStateRaw = JSON.stringify(state);
        document.dispatchEvent(new CustomEvent('mosh:save-failed', {detail:error}));
        api.showError(error); throw error;
      } finally { delete document.documentElement.dataset.moshSaving; }
    }
  }
  api.save = function () {
    // A status action commits first; don't send an older task version concurrently.
    if (taskPending) return taskPending.catch(() => {}).then(() => api.save());
    if (!ready || !api.user) return Promise.resolve();
    if(workdeskUncertain){const e=new Error('تحقق من حفظ عملية لوحة عملي السابقة قبل الحفظ.');api.showError(e);return Promise.reject(e);}
    wanted = copy(state);
    lastSavedStateRaw = JSON.stringify(state);
    if (!pending) {
      pending = Promise.resolve().then(drain).finally(() => { pending = null; });
      // Legacy event handlers may not await; the failure is still shown and the cache is rolled back.
      pending.catch(() => {});
    }
    return pending;
  };
  api.flush = async () => { while (pending || taskPending) await Promise.all([pending, taskPending].filter(Boolean)); };
  // Narrow, server-confirmed task actions. Existing unrelated records/drafts stay intact.
  api.commitTask = function (id, buildPatch) {
    const predecessor = taskPending || Promise.resolve();
    const saving = pending || Promise.resolve();
    const run = predecessor.catch(() => {}).then(() => saving).then(async () => {
      if (!ready || !api.user) throw new Error('سجّل الدخول أولاً.');
      if(workdeskUncertain)throw new Error('تحقق من حفظ عملية لوحة عملي السابقة أولاً.');
      const original = baseline.salesTasks?.find(row => String(row.id) === String(id));
      const current = state.salesTasks?.find(row => String(row.id) === String(id));
      if (!original || !current) throw new Error('المهمة لم تعد متاحة لهذا الحساب.');
      if (typeof buildPatch !== 'function') throw new Error('إجراء المهمة غير صالح.');
      const taskOwner=String(api.user.id);
      const before = copy(state), data = buildPatch(copy(current));
      if (!data) return current;
      const key = crypto.randomUUID();
      const options = {method:'PATCH',headers:{'Idempotency-Key':key},body:{...data,_version:original._version}};
      let saved;
      try { saved = await api.request('/tasks/'+encodeURIComponent(id), options); }
      catch (error) {
        // Retrying uses exactly the same key and payload, never repeats the business event.
        if (!error.network) throw error;
        if(String(api.user?.id||'')!==taskOwner)throw new Error('تغيّر حساب الدخول أثناء الحفظ.');
        saved = await api.request('/tasks/'+encodeURIComponent(id), options);
      }
      if(String(api.user?.id||'')!==taskOwner) throw new Error('تغيّر حساب الدخول أثناء الحفظ.');
      if(!saved||String(saved.id)!==String(id)||!Number.isFinite(Number(saved._version)))throw new Error('لم يؤكد الخادم حفظ المهمة. حدّثها للتحقق.');
      const change = {resource:'tasks',id:String(id),data:saved};
      mergeChange(baseline, change);
      mergeChange(state, change, before);
      if (wanted) mergeChange(wanted, change, before);
      lastSavedStateRaw = JSON.stringify(state);
      document.dispatchEvent(new CustomEvent('mosh:saved',{detail:{changes:[change],taskAction:true}}));
      return saved;
    });
    taskPending = run;
    run.finally(() => { if (taskPending === run) taskPending = null; }).catch(() => {});
    return run;
  };
  // R9: a dedicated POST /tasks must update BOTH projections. Updating only
  // state makes a newly created task invisible to the guarded receipt/save path.
  // Accept only a confirmed server document; never flush unrelated editor drafts.
  // Server-first customer creation: update both projections without refreshing away unsaved editors.
  api.acceptCreatedCustomer = function(saved, ownerId) {
    if (!ready || !api.user || String(api.user.id) !== String(ownerId))
      throw new Error('تغيّر حساب الدخول أثناء حفظ العميل.');
    if (!saved || !saved.id || !Number.isInteger(Number(saved._version)) || Number(saved._version) < 1)
      throw new Error('العميل حُفظ لكن الرد غير مكتمل؛ حدّث قائمة العملاء قبل إعادة المحاولة.');
    const change = {resource:'customers', id:String(saved.id), data:copy(saved)};
    // Replaying a confirmed response must never create a second customer locally.
    const existing = baseline?.customers?.find(c=>String(c.id)===String(saved.id));
    if (existing && Number(existing._version) >= Number(saved._version)) return copy(existing);
    mergeChange(baseline,change);
    mergeChange(state,change);
    if(wanted) mergeChange(wanted,change);
    customersCatalog=state.customers;
    lastSavedStateRaw=JSON.stringify(state);
    document.dispatchEvent(new CustomEvent('mosh:customer-created',{detail:{id:String(saved.id)}}));
    return saved;
  };
  api.acceptCreatedTask = function (saved, ownerId) {
    if (!ready || !api.user || String(api.user.id) !== String(ownerId)) {
      throw new Error('تغيّر حساب الدخول أثناء إنشاء المهمة. افتح قائمة المهام بالحساب الصحيح.');
    }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved) ||
        saved.id == null || String(saved.id).trim() === '' ||
        !Number.isInteger(Number(saved._version)) || Number(saved._version) < 1) {
      throw new Error('رد إنشاء المهمة غير مكتمل. حدّث قائمة المهام قبل محاولة إنشائها مجدداً.');
    }
    const prior = baseline.salesTasks?.find(row => String(row.id) === String(saved.id));
    // A parallel refresh may already have a later server version. Do not regress it.
    if (prior && Number(prior._version) >= Number(saved._version)) return copy(prior);
    const before = copy(baseline), change = {resource:'tasks', id:String(saved.id), data:copy(saved)};
    mergeChange(baseline, change);
    mergeChange(state, change, before);
    if (wanted) mergeChange(wanted, change, before);
    lastSavedStateRaw = JSON.stringify(state);
    document.dispatchEvent(new CustomEvent('mosh:saved', {detail:{changes:[change],taskCreated:true}}));
    return copy(saved);
  };
  // Workdesk R2: one confirmed transaction for task pause/start + work presence.
  // No optimistic mutation, no complete-state write, no writes to elapsed totals.
  api.workdeskUncertain = () => !!workdeskUncertain;
  function workdeskApply(result, before) {
    if (!result || !Array.isArray(result.changes)) throw Object.assign(new Error('رد الحفظ غير مكتمل. تحقّق من العملية قبل المتابعة.'), {network:true});
    for (const change of result.changes) {
      mergeChange(baseline,change); mergeChange(state,change,before);
      if(wanted)mergeChange(wanted,change,before);
    }
    lastSavedStateRaw=JSON.stringify(state);
    document.dispatchEvent(new CustomEvent('mosh:saved',{detail:{...result,workdeskAction:true}}));
    return result;
  }
  async function sendWorkdesk(command) {
    let result;
    const options={method:'POST',headers:{'Idempotency-Key':command.key},body:{operations:command.operations}};
    try { result=await api.request('/transactions',options); }
    catch(error){if(!error.network&&!(error.status>=500))throw error;result=await api.request('/transactions',options);}
    // A malformed successful response is ambiguous too; never pretend a rollback.
    if(!result || !Array.isArray(result.changes) || command.operations.some(op=>!result.changes.some(ch=>ch.resource===op.resource&&String(ch.id)===String(op.id)&&ch.data&&Number.isFinite(Number(ch.data._version))))) {
      throw Object.assign(new Error('الخادم لم يُرجع كل السجلات المؤكدة للعملية. يجب التحقق قبل أي تغيير جديد.'),{network:true});
    }
    workdeskUncertain=null;
    return workdeskApply(result,command.before);
  }
  api.commitWorkdesk = function(build) {
    const predecessor=taskPending||Promise.resolve(),saving=pending||Promise.resolve();
    const run=predecessor.catch(()=>{}).then(()=>saving).then(async()=>{
      if(!ready||!api.user)throw new Error('سجّل الدخول أولاً.');
      if(workdeskUncertain)throw new Error('نتيجة العملية السابقة غير مؤكدة. اضغط «التحقق من الحفظ» أولاً.');
      const before=copy(state),operations=build(copy(state));
      if(!Array.isArray(operations))throw new Error('عملية غير صالحة.');
      if(!operations.length)return {changes:[]};
      const guarded=['status','employeeState','assignee','assigneeId','workChat','returnedForRevision'];
      for(const op of operations){
        if(!['tasks','work-presence'].includes(op.resource))throw new Error('مورد غير صالح للوحة العمل.');
        const spec=api.resources[op.resource];if(!spec)throw new Error('الخادم لا يدعم مورد '+op.resource);
        const old=rows(baseline,spec).find(r=>String(r.id)===String(op.id));
        const cur=rows(state,spec).find(r=>String(r.id)===String(op.id));
        if(op.action==='update'){
          if(!old||!cur)throw new Error('السجل غير متاح. حدّث البيانات.');
          const fields=op.resource==='tasks'?guarded:['mode','noWork','pausedTaskId'];
          if(fields.some(k=>!equal(old[k],cur[k])))throw new Error('توجد تعديلات غير محفوظة على المهمة أو حالة العمل. احفظها أو ألغها أولاً.');
          op.version=old._version;
        }else if(op.action==='create'){
          if(old)throw new Error('سجل العمل موجود؛ حدّث البيانات.');
        }else throw new Error('إجراء غير مسموح.');
      }
      const command={key:crypto.randomUUID(),operations:copy(operations),before};
      document.documentElement.dataset.moshSaving='1';
      try{return await sendWorkdesk(command);}
      catch(error){if(error.network||error.status>=500)workdeskUncertain=command;throw error;}
      finally{delete document.documentElement.dataset.moshSaving;}
    });
    taskPending=run;run.finally(()=>{if(taskPending===run)taskPending=null;}).catch(()=>{});return run;
  };
  api.resolveWorkdesk = function(){
    if(!workdeskUncertain)return Promise.resolve(null);
    const predecessor=taskPending||Promise.resolve();
    const run=predecessor.catch(()=>{}).then(async()=>{
      const command=workdeskUncertain;if(!command)return null;
      try{return await sendWorkdesk(command);}
      catch(error){if(error.status>=400&&error.status<500)workdeskUncertain=null;throw error;}
    });
    taskPending=run;run.finally(()=>{if(taskPending===run)taskPending=null;}).catch(()=>{});return run;
  };
  api.isSaving = () => !!(pending || taskPending);
  api.discardUncommitted = function(){
    if(!ready||pending||taskPending||workdeskUncertain)return false;
    wanted=null;state=copy(baseline);api.initialize();
    if(typeof setDirtyState==='function')setDirtyState(false);
    document.dispatchEvent(new CustomEvent('mosh:local-discarded'));return true;
  };
  let tasksRead36=null,tasksReadSequence36=0;
  api.refreshTasks = function () {
    if (!ready || !api.user || pending || taskPending) return Promise.resolve(false);
    const who=String(api.user.id),before=copy(state.salesTasks||[]);
    if(!equal(before,baseline.salesTasks||[]))return Promise.resolve(false);
    if(tasksRead36?.who===who)return tasksRead36.promise;
    const seq=++tasksReadSequence36;
    const promise=(async()=>{const next=await api.listAll('tasks');
      if(!Array.isArray(next))throw new Error('استجابة قائمة المهام غير صالحة.');
      if(seq!==tasksReadSequence36||String(api.user?.id||'')!==who||pending||taskPending||!equal(before,state.salesTasks||[]))return false;
      state.salesTasks=copy(next);baseline.salesTasks=copy(next);lastSavedStateRaw=JSON.stringify(state);
      document.dispatchEvent(new CustomEvent('mosh:tasks-refreshed'));return true;
    })().finally(()=>{if(tasksRead36?.seq===seq)tasksRead36=null;});
    tasksRead36={who,seq,promise};return promise;
  };
  // R6: read a committed task's server-owned timing, never overwrite unsaved form edits.
  api.refreshTaskDetails = async function(id) {
    if (!ready || !api.user || pending || taskPending) return false;
    const original=baseline.salesTasks?.find(t=>String(t.id)===String(id));
    const current=state.salesTasks?.find(t=>String(t.id)===String(id));
    const guarded=['_version','status','employeeState','assignee','assigneeId'];
    if(!original||!current||guarded.some(k=>!equal(original[k],current[k])))return false;
    const before=copy(current),who=String(api.user.id);
    const saved=await api.request('/tasks/'+encodeURIComponent(id));
    if(!saved||String(saved.id)!==String(id)||!Number.isFinite(Number(saved._version))||guarded.some(k=>!equal(saved[k],original[k])))throw new Error('تغيّرت المهمة أو كانت استجابة التفاصيل ناقصة. حدّث البيانات قبل متابعة التنفيذ.');
    if(String(api.user?.id)!==who||pending||taskPending||!equal(before,state.salesTasks?.find(t=>String(t.id)===String(id))))return false;
    // Aliases may differ by API serializer. Replace only the timing projection at
    // the SAME confirmed version; title/client/other edited fields stay untouched.
    for(const target of [original,current]){
      delete target.workTiming;delete target.work_timing;
      if(Object.prototype.hasOwnProperty.call(saved,'workTiming'))target.workTiming=copy(saved.workTiming);
      if(Object.prototype.hasOwnProperty.call(saved,'work_timing'))target.work_timing=copy(saved.work_timing);
    }
    lastSavedStateRaw=JSON.stringify(state);
    document.dispatchEvent(new CustomEvent('mosh:tasks-refreshed'));
    return saved;
  };
  // R4: a recipient read receipt is a narrow, server-confirmed action.
  // It does not use the all-record save, write employee files, or grant HR editing rights.
  let noticePending = null;
  api.refreshAnnouncements = async function () {
    if (!ready || !api.user || pending || taskPending || noticePending) return false;
    const who = String(api.user.id), before = copy(state.hrAnnouncements || []);
    if (!equal(before, baseline.hrAnnouncements || [])) return false;
    const next = await api.listAll('announcements', {scope:'mine'});
    if (!Array.isArray(next)) throw new Error('استجابة سجل التنبيهات غير صالحة.');
    if (String(api.user?.id || '') !== who || pending || taskPending || noticePending || !equal(before, state.hrAnnouncements || [])) return false;
    state.hrAnnouncements = copy(next); baseline.hrAnnouncements = copy(next);
    lastSavedStateRaw = JSON.stringify(state);
    document.dispatchEvent(new CustomEvent('mosh:announcements-refreshed'));
    return true;
  };
  api.acknowledgeAnnouncement = function (id, employeeId) {
    if (noticePending) return noticePending;
    const who = String(api.user?.id || '');
    const run = (async () => {
      await api.flush();
      if (!ready || !who || String(api.user?.id || '') !== who) throw new Error('سجّل الدخول أولاً.');
      if (!employeeId || String(api.user.employeeId || '') !== String(employeeId)) throw new Error('لا يمكن تأكيد الاطلاع بدون ربط الحساب بموظف صحيح.');
      const original = baseline.hrAnnouncements?.find(x => String(x.id) === String(id));
      if (!original || !Number.isFinite(Number(original._version))) throw new Error('حدّث سجل التنبيهات قبل تأكيد الاطلاع.');
      const receipt = row => Array.isArray(row?.readBy) && row.readBy.map(String).includes(String(employeeId)) || !!row?.readAtBy?.[employeeId];
      if (receipt(original)) return copy(original);
      const before = copy(state);
      const options = {method:'PATCH', headers:{'Idempotency-Key':crypto.randomUUID()}, body:{_version:original._version, readBy:[...new Set([...(original.readBy || []).map(String), String(employeeId)])]}};
      const valid = row => row && String(row.id) === String(id) && Number.isFinite(Number(row._version)) && receipt(row);
      const apply = saved => {
        if (String(api.user?.id || '') !== who || String(api.user?.employeeId || '') !== String(employeeId)) throw new Error('تغيّر الحساب أو الموظف المرتبط أثناء الحفظ؛ افتح السجل بالحساب الحالي.');
        const change = {resource:'announcements', id:String(id), data:saved};
        mergeChange(baseline, change); mergeChange(state, change, before);
        if (wanted) mergeChange(wanted, change, before);
        lastSavedStateRaw = JSON.stringify(state);
        document.dispatchEvent(new CustomEvent('mosh:announcement-read', {detail:{id:String(id)}}));
        return saved;
      };
      let saved;
      try {
        try { saved = await api.request('/announcements/' + encodeURIComponent(id), options); }
        catch (error) { if (!error.network) throw error; saved = await api.request('/announcements/' + encodeURIComponent(id), options); }
      } catch (error) {
        // A lost response may have committed. Verify, but never manufacture a receipt.
        if (error.network || error.status === 409) {
          try {
            const current = await api.request('/announcements/' + encodeURIComponent(id));
            if (valid(current)) return apply(current);
          } catch (_) {}
        }
        throw error;
      }
      if (!valid(saved)) throw new Error('لم يؤكد الخادم تسجيل الاطلاع. حدّث السجل وتحقق قبل إعادة المحاولة.');
      return apply(saved);
    })();
    noticePending = run;
    run.finally(() => { if (noticePending === run) noticePending = null; }).catch(() => {});
    return run;
  };
  api.listAll = async function (resource, params = {}) {
    const rows = []; let page = 1, last = 1;
    do { const q = new URLSearchParams({...params, page, perPage:100}); const response = await api.request('/' + resource + '?' + q, {envelope:true}); rows.push(...response.data);last = response.meta.lastPage; page++; } while (page <= last);
    return rows;
  };
  // Confirmed server projections update both baselines, without flushing another editor.
  api.acceptServerChanges = function (changes, ownerId) {
    if (!ready || !api.user || String(api.user.id) !== String(ownerId)) throw new Error('تغيّر حساب الدخول؛ حدّث البيانات.');
    for (const change of changes) {
      if (change.resource === 'settings/department-managers') change.data.value = Object.assign({}, change.data.value || {});
      mergeChange(baseline, change); mergeChange(state, change);
      if (wanted) mergeChange(wanted, change);
    }
    lastSavedStateRaw = JSON.stringify(state);
    document.dispatchEvent(new CustomEvent('mosh:saved', {detail:{changes, serverConfirmed:true}}));
    return changes;
  };
  api.refresh = async function () {
    await api.flush();
    if(workdeskUncertain)await api.resolveWorkdesk();
    const next = await api.bootstrap(); state = copy(next.state); api.initialize();
    document.dispatchEvent(new CustomEvent('mosh:refreshed'));
    return next;
  };
  api.saveAccounts = async function (desired) {
    const previous = copy(api.auth);
    for (const kind of ['roles','users']) {
      const old = new Map(previous[kind].map(row => [row.id, row]));
      for (const row of desired[kind]) {
        const prior = old.get(row.id);old.delete(row.id);
        if (equal(prior, row)) continue;
        const omitted = new Set(['_version','createdAt','createdBy','updatedAt','updatedBy','isRoot','protected']);
        if (kind === 'users') ['globalOverrides','moduleOverrides','password'].forEach(key => omitted.add(key));
        let saved;
        if (!prior) {
          const payload = Object.fromEntries(Object.entries(row).filter(([key]) => !omitted.has(key)));
          if (kind === 'users' && row.password) payload.password = row.password;
          saved = await api.request('/' + kind, {method:'POST', body:payload});
        } else {
          const payload = {_version: prior._version};
          for (const [key, value] of Object.entries(row)) if (!omitted.has(key) && !equal(prior[key], value)) payload[key] = value;
          saved = prior;
          if (Object.keys(payload).length > 1) saved = await api.request('/' + kind + '/' + encodeURIComponent(row.id), {method:'PATCH', body:payload});
        }
        if (kind === 'users' && prior && row.password) {
          saved = await api.request('/users/' + encodeURIComponent(row.id) + '/password', {method:'POST', body:{password:row.password,password_confirmation:row.password,_version:saved._version}});
        }
        if (kind === 'users' && (!equal(prior?.globalOverrides || {},row.globalOverrides || {}) || !equal(prior?.moduleOverrides || {},row.moduleOverrides || {}))) {
          saved = await api.request('/users/' + encodeURIComponent(saved.id) + '/permissions', {method:'PUT', body:{_version:saved._version,globalOverrides:row.globalOverrides||{},moduleOverrides:row.moduleOverrides||{}}});
        }
        Object.assign(row,saved); delete row.password;
      }
      for (const row of old.values()) await api.request('/' + kind + '/' + encodeURIComponent(row.id), {method:'DELETE', body:{_version:row._version}});
    }
    if (!equal(previous.security,desired.security)) {
      const security = {};
      for (const [key, value] of Object.entries(desired.security)) if (!equal(previous.security[key], value)) security[key] = value;
      desired.security = await api.request('/auth/security', {method:'PATCH',body:security});
    }
    api.auth = copy(desired);
    if (api.user) api.user = api.auth.users.find(user => user.id === api.user.id) || api.user;
    return api.auth;
  };
  api.upload = async function (record) {
    const form = new FormData();form.append('file',record.blob,record.name || 'attachment');form.append('key',record.key);form.append('kind',record.kind || 'file');
    const result = await api.request('/files',{method:'POST',body:form});return result.key;
  };
  api.file = async function (key) {
    const path='/files/'+encodeURIComponent(key); const meta=await api.request(path);const blob=await api.request(path+'/content',{binary:true});return {...meta,blob};
  };
  api.removeFile = async key => {
    if (!key) return;
    // Existing editors remove a binary before saving its attachment-list change.
    // Defer that delete until the record update has actually committed.
    const referenced = value => value && typeof value==='object' && Object.entries(value).some(([field,v]) => (['key','storageKey','fileKey','attachmentKey'].includes(field)&&v===key)||referenced(v));
    if (referenced(baseline)) {pendingFileRemovals.add(key);return;}
    try {await api.request('/files/'+encodeURIComponent(key),{method:'DELETE'});}
    catch (error) {if(error.status===409)pendingFileRemovals.add(key);else throw error;}
  };
  api.undo = async function () {
    await api.flush();const id=api.transactions.at(-1);if (!id) return;
    const response=await api.request('/transactions/'+encodeURIComponent(id)+'/undo',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:{}});
    for(const change of response.changes){mergeChange(state,change);mergeChange(baseline,change);}api.transactions.pop();
    document.dispatchEvent(new CustomEvent('mosh:refreshed'));
  };
  window.addEventListener('beforeunload',event=>{if(pending || taskPending || workdeskUncertain){event.preventDefault();event.returnValue='';}});
})();
// Convert append-only audit entries to the original archive renderer's input shape.
MoshApi.archiveEntry = function (entry) {
  const area=entry.changedAreas?.[0]||entry.resource||'systemSettings';
  return {...entry,timestamp:entry.at,userName:entry.user,username:entry.user,
    beforeState:{[area]:entry.before&&Object.keys(entry.before).length?[entry.before]:[]},
    afterState:{[area]:entry.after&&Object.keys(entry.after).length?[entry.after]:[]}};
};
