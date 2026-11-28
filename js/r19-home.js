/* Home simplification: same R18 shell and views, fewer duplicate entry points. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  const OWNER_TASK_DIALOG = 'r19OwnerEmployeeTasks';
  const taskStates = {new:'بانتظار الاستلام',received:'بانتظار البدء',working:'قيد التنفيذ',paused:'متوقفة مؤقتاً'};
  const preview = () => window.MoshPreview19;
  const escape = value => preview().esc(String(value ?? ''));
  let ownerTaskView = null;

  function dashboardOwner() {
    const user = window.MoshApi?.user;
    return user?.id && user.isRoot === true && user.active !== false && !user.mustChange && $('dashboardApp')?.classList.contains('active') ? user : null;
  }

  function currentOwnerTaskView(view) {
    return ownerTaskView === view && view.dialog.open && dashboardOwner()?.id === view.owner;
  }

  function clearOwnerTaskView() {
    if (!ownerTaskView) return;
    const view = ownerTaskView;
    ownerTaskView = null;
    view.read?.abort();
    view.hydrate?.abort();
    preview()?.close?.(OWNER_TASK_DIALOG,true);
    view.dialog.replaceChildren();
    view.dialog.removeAttribute('aria-busy');
  }

  function ownerTaskNotice(view,text,alert=false) {
    const message = view.dialog.querySelector('[data-owner-task-message]');
    message.textContent = text;
    message.hidden = !text;
    message.classList.toggle('r19-hr-error',alert);
    message.setAttribute('role',alert ? 'alert' : 'status');
  }

  function mountOwnerTools(home) {
    const header = home.querySelector('.es11-header');
    const previous = $('r19OwnerDashboardTools');
    if (!dashboardOwner() || !header) {
      previous?.remove();
      clearOwnerTaskView();
      return;
    }
    if (previous) return;
    const tools = document.createElement('section');
    tools.id = 'r19OwnerDashboardTools';
    tools.className = 'es11-card';
    tools.setAttribute('aria-labelledby','r19OwnerDashboardToolsTitle');
    tools.style.marginBlockEnd = '16px';
    tools.innerHTML = '<div class="es11-card-head"><h3 id="r19OwnerDashboardToolsTitle">أدوات الحساب الأساسي</h3></div>'+
      '<div class="r19-hr-report-tabs" style="padding-bottom:0;margin-bottom:0;border-bottom:0">'+
      '<button type="button" id="auth37DashboardPasswordReset" class="btn">إعادة تعيين كلمة السر</button>'+
      '<button type="button" id="ownerEmployeeTasks" class="btn">مهام الموظفين</button></div>';
    tools.querySelector('#auth37DashboardPasswordReset').onclick = () => {
      if (dashboardOwner()) window.MoshAuth37?.openPasswordReset?.();
    };
    tools.querySelector('#ownerEmployeeTasks').onclick = openOwnerEmployeeTasks;
    header.after(tools);
  }

  function taskEligible(task,employeeId) {
    return task?.status === 'in_progress' && Object.hasOwn(taskStates,task.employeeState ?? 'new') &&
      String(task.assigneeId || '') === employeeId && !!employeeId && !task.deletedAt &&
      !task.sharedDistributionRoot && !task.sharedTeamContainer && task.sharedNodeType !== 'team' &&
      Number.isSafeInteger(Number(task._version)) && Number(task._version) >= 1;
  }

  function paintOwnerTasks(view) {
    const results = view.dialog.querySelector('[data-owner-task-results]');
    const people = view.dialog.querySelector('[data-owner-task-employee]');
    const selectionFrozen = !!view.attempt || !!view.committed;
    people.disabled = selectionFrozen || people.options.length <= 1;
    const retry = view.dialog.querySelector('[data-owner-task-open-retry]');
    retry.hidden = !view.committed;
    if (view.committed) {
      results.replaceChildren();
      return;
    }
    if (view.attempt) return;
    const listed = view.rows.map(task => '<tr><td><b>'+escape(task.title||'مهمة بلا عنوان')+'</b></td><td>'+escape(task.department||'—')+
      '</td><td>'+escape(taskStates[task.employeeState ?? 'new'])+'</td>'+
      '<td><button type="button" class="btn" data-owner-task-takeover="'+escape(task.id)+'">تولّي المهمة</button></td></tr>').join('');
    results.innerHTML = (listed ? '<div class="r19-hr-table-wrap"><table class="r19-hr-table"><thead><tr>'+
      '<th scope="col">المهمة</th><th scope="col">القسم</th><th scope="col">الحالة</th><th scope="col">الإجراء</th></tr></thead><tbody>'+listed+'</tbody></table></div>'
      : '<div class="r19-hr-empty">'+(view.employee ? 'لا توجد مهام متاحة للتولّي في هذه الصفحة.' : 'اختر الموظف لعرض المهام المكلف بها.')+'</div>')+
      (view.lastPage > 1 ? '<div class="r19-hr-footer"><button type="button" class="btn" data-owner-task-page="'+(view.page-1)+'"'+(view.page<=1?' disabled':'')+'>السابق</button>'+
      '<span>صفحة '+view.page+' من '+view.lastPage+'</span><button type="button" class="btn" data-owner-task-page="'+(view.page+1)+'"'+(view.page>=view.lastPage?' disabled':'')+'>التالي</button></div>' : '');
  }

  async function loadOwnerTasks(view,page=1) {
    if (!currentOwnerTaskView(view) || view.attempt || view.committed) return;
    view.read?.abort();
    const list = view.dialog.querySelector('[data-owner-task-results]');
    const employeeId = view.employee;
    view.rows = [];
    view.lastPage = 1;
    ownerTaskNotice(view,'');
    if (!employeeId) { view.read = null; paintOwnerTasks(view); return; }
    const controller = new AbortController();
    view.read = controller;
    list.innerHTML = '<div class="r19-hr-loading" role="status">جارٍ تحميل مهام الموظف…</div>';
    try {
      const query = new URLSearchParams({'filter[assigneeId]':employeeId,'filter[status]':'in_progress',perPage:'20',page:String(page)});
      const response = await MoshApi.request('/tasks?'+query,{envelope:true,cache:'no-store',signal:controller.signal});
      if (!currentOwnerTaskView(view) || view.read !== controller || view.employee !== employeeId) return;
      if (!Array.isArray(response?.data)) throw new Error('لم تكتمل بيانات المهام.');
      view.rows = response.data.filter(task => taskEligible(task,employeeId));
      view.page = Number(response.meta?.page) || page;
      view.lastPage = Number(response.meta?.lastPage) || 1;
      paintOwnerTasks(view);
    } catch (error) {
      if (!currentOwnerTaskView(view) || view.read !== controller || view.employee !== employeeId) return;
      list.innerHTML = '<button type="button" class="btn" data-owner-task-page="'+page+'">إعادة تحميل المهام</button>';
      ownerTaskNotice(view,error.message || 'تعذّر تحميل المهام.',true);
    } finally {
      if (view.read === controller) view.read = null;
    }
  }

  function ownerTakeoverBusy(view,busy) {
    if (busy) view.dialog.setAttribute('aria-busy','true');
    else view.dialog.removeAttribute('aria-busy');
    view.dialog.querySelectorAll('button,select').forEach(control => {
      if (busy) control.disabled = true;
      else if (!control.matches('[data-owner-task-page]')) control.disabled = false;
    });
    if (!busy && (view.attempt || view.committed)) view.dialog.querySelector('[data-owner-task-employee]').disabled = true;
  }

  async function openTakenTask(view) {
    if (!currentOwnerTaskView(view) || !view.committed || view.hydrate) return;
    const controller = new AbortController();
    view.hydrate = controller;
    ownerTakeoverBusy(view,true);
    ownerTaskNotice(view,'جارٍ فتح واجهة التنفيذ…');
    try {
      const loaded = await MoshApi.hydrateTaskFamily(view.committed,{signal:controller.signal});
      if (!currentOwnerTaskView(view)) return;
      if (!loaded || !window.MoshTaskInbox49?.openTask?.(view.committed)) throw new Error('تعذّر فتح المهمة.');
      clearOwnerTaskView();
    } catch (_) {
      if (currentOwnerTaskView(view)) {
        ownerTaskNotice(view,'تم حفظ طلب تولّي المهمة. أعد فتحها من هنا أو حدّث «مهامي».',true);
        paintOwnerTasks(view);
      }
    } finally {
      view.hydrate = null;
      if (currentOwnerTaskView(view)) ownerTakeoverBusy(view,false);
    }
  }

  async function takeOwnerTask(view,taskId) {
    if (!currentOwnerTaskView(view) || view.writing || view.committed) return;
    const account = dashboardOwner();
    const employeeId = String(account.employeeId || '');
    if (!employeeId) { ownerTaskNotice(view,'اربط حسابك بملف موظف نشط أولاً.',true); return; }
    if (!view.attempt) {
      const task = view.rows.find(row => String(row.id) === taskId);
      if (!taskEligible(task,view.employee) || String(task.assigneeId) === employeeId) return;
      if (!window.confirm('تأكيد تولّي «'+(task.title || 'المهمة')+'» بحسابك؟ سيبقى قسم المهمة كما هو.')) return;
      if (!currentOwnerTaskView(view)) return;
      view.attempt = {taskId:String(task.id),_version:Number(task._version),requestId:'OWNER-TASK-'+crypto.randomUUID()};
    }
    view.writing = true;
    ownerTakeoverBusy(view,true);
    ownerTaskNotice(view,'جارٍ إسناد المهمة لحسابك…');
    try {
      const result = await MoshApi.request('/r24/admin/tasks/takeover',{method:'POST',body:view.attempt});
      if (!currentOwnerTaskView(view)) return;
      view.committed = view.attempt.taskId;
      view.attempt = null;
      paintOwnerTasks(view);
      if (String(result?.id) !== view.committed || String(result?.assigneeId) !== employeeId) {
        ownerTaskNotice(view,'تمت معالجة الطلب. حدّث عرض المهمة للتحقق من المكلّف الحالي.',true);
        return;
      }
      await openTakenTask(view);
    } catch (error) {
      if (!currentOwnerTaskView(view)) return;
      const uncertain = error.network || !Number.isFinite(error.status) || error.status >= 500;
      if (uncertain) {
        view.dialog.querySelector('[data-owner-task-results]').innerHTML =
          '<button type="button" class="btn" data-owner-task-retry>التحقق وإعادة المحاولة</button>';
        ownerTaskNotice(view,'تعذّر تأكيد الحفظ. أعد المحاولة للتحقق من الطلب نفسه.',true);
      } else {
        view.attempt = null;
        if (error.status === 409) {
          view.rows = [];
          view.dialog.querySelector('[data-owner-task-results]').innerHTML =
            '<button type="button" class="btn" data-owner-task-page="'+view.page+'">تحديث مهام الموظف</button>';
          ownerTaskNotice(view,error.message || 'تغيّرت المهمة. حدّث المهام قبل المحاولة من جديد.',true);
        } else {
          paintOwnerTasks(view);
          ownerTaskNotice(view,error.message || 'تعذّر تولّي المهمة.',true);
        }
      }
    } finally {
      view.writing = false;
      if (currentOwnerTaskView(view)) ownerTakeoverBusy(view,false);
    }
  }

  function openOwnerEmployeeTasks() {
    const account = dashboardOwner(), ui = preview();
    if (!account || !ui?.dialog || ownerTaskView?.dialog.open) return;
    const ownEmployeeId = String(account.employeeId || '');
    const people = (typeof state !== 'undefined' && Array.isArray(state.staffProfiles) ? state.staffProfiles : [])
      .filter(person => person?.id && person.name && !person.archivedAt && String(person.id) !== ownEmployeeId)
      .sort((a,b) => a.name.localeCompare(b.name,'ar'));
    const options = people.map(person => '<option value="'+escape(person.id)+'">'+escape([person.name,person.department,person.employeeNo].filter(Boolean).join(' · '))+'</option>').join('');
    const dialog = ui.dialog(OWNER_TASK_DIALOG,'مهام الموظفين',
      '<div class="r19-hr"><div class="r19-hr-toolbar"><label>الموظف<select data-owner-task-employee'+(!people.length?' disabled':'')+'>'+
      '<option value="">'+(people.length?'اختر الموظف':'لا يوجد موظفون للاختيار')+'</option>'+options+'</select></label></div>'+
      '<p data-owner-task-message hidden></p><div data-owner-task-results></div>'+
      '<button type="button" class="btn primary" data-owner-task-open-retry hidden>فتح المهمة</button></div>',{wide:true});
    const view = {dialog,owner:account.id,employee:'',page:1,lastPage:1,rows:[],read:null,hydrate:null,attempt:null,committed:'',writing:false};
    ownerTaskView = view;
    dialog.addEventListener('close',() => { if (ownerTaskView === view) clearOwnerTaskView(); },{once:true});
    const select = dialog.querySelector('[data-owner-task-employee]');
    select.addEventListener('change',() => {
      view.employee = select.value;
      void loadOwnerTasks(view);
    });
    dialog.onclick = event => {
      if (!currentOwnerTaskView(view)) return;
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.hasAttribute('data-owner-task-page')) void loadOwnerTasks(view,Number(button.dataset.ownerTaskPage));
      if (button.hasAttribute('data-owner-task-takeover')) void takeOwnerTask(view,button.dataset.ownerTaskTakeover);
      if (button.hasAttribute('data-owner-task-retry')) void takeOwnerTask(view,view.attempt?.taskId);
      if (button.hasAttribute('data-owner-task-open-retry')) void openTakenTask(view);
    };
    paintOwnerTasks(view);
    select.focus();
  }

  function mount() {
    document.documentElement.classList.add('mosh-review19');
    const home = $('employeeSpaceV11');
    if (!home) { clearOwnerTaskView(); return; }
    mountOwnerTools(home);
    const profile = home.querySelector('.es11-person');
    if (profile && !$('r19MyFile')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'r19MyFile'; b.className = 'r19-my-file';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 3H5v18h14V8Z"/><path d="M14 3v6h5M8 13h8m-8 4h5"/></svg><span>ملفي الوظيفي</span><span aria-hidden="true">←</span>';
      b.onclick = () => { window.openEmployeePortal?.(); decoratePortal(); };
      profile.appendChild(b);
    }
    const departments = $('dashboardDepartments'); if (departments && !departments.hidden) departments.hidden = true;
    decoratePortal();
  }
  function decoratePortal() {
    const portal = $('employeePortalApp'); if (!portal) return;
    const h = portal.querySelector('.employee-portal-head h2');
    if (h && h.textContent !== 'ملفي الوظيفي') h.textContent = 'ملفي الوظيفي';
    if (portal.classList.contains('active')) {
      const crumb = $('crumb'); const text = '<b>اللوحة الرئيسية</b> / ملفي الوظيفي';
      if (crumb && crumb.innerHTML !== text) crumb.innerHTML = text;
    }
    const services = portal.querySelector('.employee-portal-services');
    if (services && !$('r19MyAttendance')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'r19MyAttendance';
      b.innerHTML = '<b>سجل الدوام</b><small>الحضور والتأخير والأساسي والإضافي</small>'; b.onclick = () => window.MoshHR19?.openAttendance?.(); services.appendChild(b);
    }
    if (services && !$('r19MyDecisions')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'r19MyDecisions';
      b.innerHTML = '<b>الإجراءات الوظيفية</b><small>قراراتك المعتمدة مع التفاصيل</small>'; b.setAttribute('data-r19-my-record', ''); services.appendChild(b);
    }
  }
  if (typeof window.openEmployeePortal === 'function') {
    const open = window.openEmployeePortal;
    window.openEmployeePortal = function () {
      const result = open.apply(this, arguments);
      const decorate = value => { if (value !== false) decoratePortal(); return value; };
      return typeof result?.then === 'function' ? result.then(decorate) : decorate(result);
    };
  }
  let scheduled = false;
  const schedule = () => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; mount(); }); };
  const host = $('appShell'); if (host) new MutationObserver(schedule).observe(host, { subtree: true, childList: true });
  for (const event of ['mosh:r19-change','mosh:ui-ready','mosh:refreshed','mosh:permissions-applied','mosh:section-enter']) {
    document.addEventListener(event,schedule);
  }
  for (const event of ['mosh:session-expired','mosh:logout-complete']) {
    document.addEventListener(event,() => { $('r19OwnerDashboardTools')?.remove(); clearOwnerTaskView(); });
  }
  mount();
  window.MoshHome19 = { mount, decoratePortal };
})();
