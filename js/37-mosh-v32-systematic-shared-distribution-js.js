(function(){
'use strict';
if(window.MoshSharedDistribution32)return;
var VERSION='32.0';
var BASE_GET_SUBTASKS=window.getSubTasks;
var BASE_WORKFLOW_LABEL=window.workflowEmployeeLabel;
var BASE_WORKFLOW_CLASS=window.workflowStatusClass;
var BASE_TASK_WORKFLOW_PANEL=window.taskWorkflowPanelHtml;
var BASE_TASK_MANAGER_CONTROLS=window.taskManagerControlsHtml;
var BASE_MANAGER_FINISH_SUB=window.managerFinishPackageSubTask;
var BASE_MANAGER_TRANSFER=window.managerTransferTask;
var BASE_RENDER_BOARD=window.renderProductiveDistributionBoard;
var BASE_OPEN_TASK_DETAILS=window.openTaskDetails;
var BASE_SAVE_TASK_CHANGES=window.saveTaskChanges;
var BASE_DELETE_MAIN=window.deleteMainTask;

function arr(v){return Array.isArray(v)?v:[]}
function clean(v){return String(v==null?'':v).trim()}
function esc2(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function nowText(){try{return activityTimestamp()}catch(e){return new Date().toISOString()}}
function currentName(){try{return clean(currentUserDisplayName())}catch(e){return 'النظام'}}
function list(){try{return arr(state&&state.salesTasks)}catch(e){return []}}
function task(id){return list().find(function(t){return String(t.id)===String(id)})||null}
function isRoot(t){return !!(t&&t.sharedDistributionRoot)}
function isShared(t){return !!(t&&t.sharedDistributionChild)}
function nodeType(t){return clean(t&&t.sharedNodeType)}
function rootIdOf(t){if(!t)return '';if(isRoot(t))return String(t.id);if(t.sharedRootTaskId)return String(t.sharedRootTaskId);var p=task(t.parentTaskId);if(p&&p.sharedRootTaskId)return String(p.sharedRootTaskId);if(p&&isRoot(p))return String(p.id);return ''}
function rootOf(t){var id=rootIdOf(t);return id?task(id):null}
function deptOfUnit(u){return clean(u&&u.sharedDepartment)||clean(u&&u.department)}
function deptUnits(rootId){return list().filter(function(x){return isShared(x)&&nodeType(x)==='department'&&String(x.parentTaskId)===String(rootId)})}
function members(unitId){return list().filter(function(x){return isShared(x)&&nodeType(x)==='member'&&String(x.parentTaskId)===String(unitId)})}
function isDone(t){return !!t&&['completed','awaiting_invoice','invoiced','archived_invoiced','archived_no_invoice'].includes(t.status)}
function allDepartments(){try{return arr(salesTaskDepartments).slice()}catch(e){return ['التصميم','التصوير','المونتاج','التسويق','السوشال ميديا','المشتريات','الترويج','اللوجستيات','المبيعات','الموارد البشرية','الإدارة','المحاسبة']}}
function displayDepartment(dep){try{return departmentDisplayName(dep)}catch(e){return dep?'قسم '+dep:'-'}}
function staffFor(dep){var out=[];try{var m=getDepartmentManager(dep);if(m&&m.active!==false&&isStaffAssignable(m))out.push(m)}catch(e){}
 try{arr(getDepartmentStaff(dep)).forEach(function(p){if(p&&p.active!==false&&isStaffAssignable(p)&&!out.some(function(x){return String(x.id)===String(p.id)}))out.push(p)})}catch(e){}
 return out;
}
function saveSafe(){try{save();return true}catch(e){console.error('MOSH v32 save failed',e);alert('تعذر حفظ التوزيع.');return false}}
function pushUndo(){try{pushAppUndo()}catch(e){}}

// Shared-distribution children are NOT package services. Keep the existing package system untouched.
if(typeof BASE_GET_SUBTASKS==='function'){
 window.getSubTasks=function(parentId){return BASE_GET_SUBTASKS(parentId).filter(function(t){return !t.sharedDistributionChild})};
}

function createChild(parent,dep,type,assignee,extra){
 var id=getNextTaskId(),no='TASK/'+String(id).padStart(5,'0');
 var r=rootOf(parent)||parent;
 var obj={
  id:id,number:no,taskNo:no,parentTaskId:parent.id,parentTaskNo:parent.taskNo||parent.number||'',parentTaskTitle:parent.title||'',
  salesOrderId:r.salesOrderId||null,salesOrderNo:r.salesOrderNo||'',origin:r.origin||(r.salesOrderId?'أمر مبيعات':'مهمة مباشرة'),createdBy:currentName(),
  customer:r.customer||'',customerId:r.customerId||'',title:r.title||'مهمة مشتركة',description:r.description||'',department:dep,assignee:clean(assignee),
  assigneeId:assignee?String(staffFor(dep).find(p=>clean(p.name)===clean(assignee))?.id||''):'',
  assignmentMode:assignee?'manager_assigned':'manager',employeeState:'new',reviewManager:'',returnedForRevision:false,dueDate:r.dueDate||'',notes:r.notes||'',
  status:'in_progress',createdAt:nowText(),history:[],sharedDistributionChild:true,sharedNodeType:type,sharedRootTaskId:r.id,sharedDepartment:dep,sharedVersion:VERSION
 };
 if(assignee){try{obj.reviewManager=getDirectManagerName(assignee,dep)||''}catch(e){}}
 if(extra)Object.keys(extra).forEach(function(k){obj[k]=extra[k]});
 obj.history.push({text:type==='department'?'تم إنشاء جزء تنفيذ للقسم ضمن مهمة مشتركة.':'تم تكليف الموظف ضمن فريق مهمة مشتركة.',time:obj.createdAt,by:currentName()});
 state.salesTasks.push(obj);return obj;
}
function makeRoot(t,mode,leadDep){
 if(isRoot(t))return t;
 var dep=clean(t.department);
 t.sharedDistributionRoot=true;t.sharedDistributionMode=mode;t.sharedDistributionVersion=VERSION;t.sharedOriginalDepartment=dep;t.sharedLeadDepartment=leadDep||dep;t.sharedCreatedAt=nowText();t.sharedCreatedBy=currentName();t.sharedReady=false;
 t.sharedPreviousDepartment=dep;t.department='المهمات';t.assignee='';t.assignmentMode='shared';t.employeeState='new';t.reviewManager='';t.returnedForRevision=false;
 t.history=arr(t.history);t.history.push({text:mode==='departments'?'تم تحويل المهمة إلى مهمة مشتركة بين عدة أقسام.':'تم تحويل المهمة إلى مهمة مشتركة بين عدة موظفين.',time:nowText(),by:currentName()});
 return t;
}
function createDepartmentUnit(root,dep){
 return createChild(root,dep,'department','',{sharedTeamContainer:false,sharedDepartment:dep});
}
function addDepartments(root,deps){
 var existing=deptUnits(root.id).map(deptOfUnit);var add=deps.filter(function(d){return !existing.includes(d)});if(!add.length)return;
 pushUndo();add.forEach(function(dep){createDepartmentUnit(root,dep)});root.sharedReady=false;root.history=arr(root.history);root.history.push({text:'تمت إضافة '+add.map(displayDepartment).join('، ')+' إلى المهمة المشتركة دون تغيير الأقسام الموزعة سابقاً.',time:nowText(),by:currentName()});syncStatuses(false);saveSafe();refreshBoards();openRoot(root.id);
}
function syncStatuses(doSave){
 var changed=false;
 list().filter(function(x){return isShared(x)&&nodeType(x)==='department'&&x.sharedTeamContainer}).forEach(function(unit){
  var ms=members(unit.id);var done=ms.length>0&&ms.every(isDone);
  if(done&&!isDone(unit)){unit.status='completed';unit.employeeState='finished';unit.completedAt=unit.completedAt||nowText();unit.completedBy=unit.completedBy||'النظام';changed=true}
  if(!done&&isDone(unit)){unit.status='shared_container';unit.employeeState='new';delete unit.completedAt;delete unit.completedBy;changed=true}
 });
 list().filter(isRoot).forEach(function(root){var us=deptUnits(root.id);var ready=us.length>0&&us.every(isDone);if(!!root.sharedReady!==ready){root.sharedReady=ready;root.sharedReadyAt=ready?nowText():'';changed=true}});
 if(changed&&doSave!==false)saveSafe();return changed;
}

function unitStatus(u){
 if(u.sharedTeamContainer){var ms=members(u.id),d=ms.filter(isDone).length;return {label:d+'/'+ms.length+' أفراد منتهين',tone:d===ms.length&&ms.length?'done':d?'work':'wait',done:d,total:ms.length}}
 if(isDone(u))return {label:'مكتمل',tone:'done',done:1,total:1};
 if(!clean(u.assignee))return {label:'بانتظار توزيع مدير القسم',tone:'wait',done:0,total:1};
 var label='قيد التنفيذ';try{label=BASE_WORKFLOW_LABEL?BASE_WORKFLOW_LABEL(u):workflowEmployeeLabel(u)}catch(e){}
 return {label:label,tone:u.employeeState==='submitted'?'review':'work',done:0,total:1};
}
function rootProgress(root){var us=deptUnits(root.id),done=us.filter(isDone).length;return {total:us.length,done:done,ready:us.length>0&&done===us.length}}

function sharedPanelHtml(t,containerId){
 if(isRoot(t)){
  var us=deptUnits(t.id),pr=rootProgress(t);var available=allDepartments().filter(function(d){return !us.some(function(u){return deptOfUnit(u)===d})});
  return '<div class="sd32-root-panel">'+
   '<div class="sd32-root-head"><div><span class="sd32-kicker">مهمة مشتركة</span><h3>توزيع الأقسام والفريق</h3><p>المهمة الرئيسية واحدة، وكل قسم يدير موظفيه بشكل مستقل.</p></div><div class="sd32-root-actions">'+
   (available.length?'<button type="button" class="btn primary" onclick="MoshSharedDistribution32.openAddDepartments(\''+esc2(t.id)+'\')">+ إضافة قسم</button>':'')+
   '</div></div>'+
   '<div class="sd32-summary"><span>الأقسام <b>'+us.length+'</b></span><span>المكتمل <b>'+pr.done+' / '+pr.total+'</b></span><span class="'+(pr.ready?'ready':'')+'">'+(pr.ready?'جاهزة للاعتماد النهائي':'قيد التنفيذ')+'</span></div>'+
   '<div class="sd32-groups">'+us.map(function(u){var st=unitStatus(u),dep=deptOfUnit(u),ms=u.sharedTeamContainer?members(u.id):[];return '<div class="sd32-group '+st.tone+'"><div class="sd32-group-top"><div><b>'+esc2(displayDepartment(dep))+'</b><small>'+(dep===t.sharedLeadDepartment?'القسم المسؤول الرئيسي':'قسم مشارك')+'</small></div><span>'+esc2(st.label)+'</span></div>'+
     (u.sharedTeamContainer?'<div class="sd32-members">'+ms.map(function(m){return '<span class="'+(isDone(m)?'done':'')+'">'+(m.sharedLead?'★ ':'')+esc2(m.assignee||'غير محدد')+' · '+esc2(isDone(m)?'منتهٍ':(m.employeeState==='submitted'?'بانتظار المراجعة':'قيد التنفيذ'))+'</span>'}).join('')+'</div>':'<div class="sd32-unit-meta">'+(u.assignee?'المسؤول: <b>'+esc2(u.assignee)+'</b>':'سيظهر عند مدير القسم ليختار موظفاً واحداً أو أكثر من موظف')+'</div>')+
    '</div>'}).join('')+'</div>'+
   '<div class="sd32-note">إذا احتجت قسم جديد بعد بدء التنفيذ، استخدم «+ إضافة قسم». ينضاف كجزء جديد بانتظار مديره، وما بيتغير أي توزيع سابق.</div></div>';
 }
 if(isShared(t)){
  var r=rootOf(t);if(!r)return '';
  var dep=clean(t.sharedDepartment)||clean(t.department);return '<div class="sd32-child-context"><div><span>جزء من مهمة مشتركة</span><b class="mt54-task-name">'+esc2(MoshTaskUI.title(r))+'</b><small>'+esc2(displayDepartment(dep))+(nodeType(t)==='member'?' · عضو ضمن فريق':'')+'</small></div><button type="button" class="btn" onclick="MoshSharedDistribution32.openRoot(\''+esc2(r.id)+'\')">فتح المهمة الرئيسية</button></div>';
 }
 return '';
}

if(typeof BASE_TASK_WORKFLOW_PANEL==='function'){
 window.taskWorkflowPanelHtml=function(t,containerId){return sharedPanelHtml(t,containerId)+BASE_TASK_WORKFLOW_PANEL(t,containerId)};
}
if(typeof BASE_WORKFLOW_LABEL==='function'){
 window.workflowEmployeeLabel=function(t){if(isRoot(t))return t.sharedReady?'مهمة مشتركة — جاهزة للاعتماد':'مهمة مشتركة — قيد التنفيذ';if(isShared(t)&&t.sharedTeamContainer)return unitStatus(t).label;return BASE_WORKFLOW_LABEL(t)};
}
if(typeof BASE_WORKFLOW_CLASS==='function'){
 window.workflowStatusClass=function(t){if(isRoot(t))return t.sharedReady?'review':'working';return BASE_WORKFLOW_CLASS(t)};
}
if(typeof BASE_MANAGER_TRANSFER==='function'){
 window.managerTransferTask=function(id,containerId,department){var t=task(id);if(isShared(t)){alert('هذا جزء من مهمة مشتركة. لإضافة قسم جديد افتح المهمة الرئيسية واستخدم «+ إضافة قسم».');return false}return BASE_MANAGER_TRANSFER.apply(this,arguments)};
}
if(typeof BASE_MANAGER_FINISH_SUB==='function'){
 window.managerFinishPackageSubTask=async function(id,parentId,containerId,department){var shared=isShared(task(id));var result=await BASE_MANAGER_FINISH_SUB.apply(this,arguments);if(result&&shared){syncStatuses(true);refreshBoards()}return result};
}
if(typeof BASE_TASK_MANAGER_CONTROLS==='function'){
 window.taskManagerControlsHtml=function(t,containerId){var h=BASE_TASK_MANAGER_CONTROLS(t,containerId);if(!isShared(t))return h;
  h=h.replace('اعتماد وإنهاء الخدمة الفرعية','اعتماد وإنهاء الدور');
  h=h.replace(/<div class="task-manager-field">\s*<label>القسم التالي<\/label>[\s\S]*?<\/div>\s*<button type="button" class="btn" onclick="managerTransferTask\([\s\S]*?<\/button>/,'<span class="workflow-status review">هذا الجزء مرتبط بالمهمة المشتركة. إضافة قسم جديد تتم من المهمة الرئيسية.</span>');
  return h;
 };
}

function ensureModal(){
 if(document.getElementById('sd32Modal'))return;
 var m=document.createElement('div');m.id='sd32Modal';m.className='sd32-modal';m.innerHTML='<div class="sd32-dialog" dir="rtl"><div class="sd32-dialog-head"><div><span id="sd32ModalKicker">التوزيع</span><h3 id="sd32ModalTitle">توزيع المهمة</h3></div><button type="button" class="sd32-x" onclick="MoshSharedDistribution32.closeModal()">×</button></div><div id="sd32ModalBody" class="sd32-dialog-body"></div><div class="sd32-dialog-actions"><button type="button" class="btn" onclick="MoshSharedDistribution32.closeModal()">إلغاء</button><button type="button" class="btn primary" id="sd32SaveBtn">حفظ التوزيع</button></div></div>';
 document.body.appendChild(m);m.addEventListener('click',function(e){if(e.target===m)closeModal()});
}
var modalState=null;
function closeModal(){var m=document.getElementById('sd32Modal');if(m)m.classList.remove('show');modalState=null}
function teamCard(p){var n=clean(p.name);return '<label class="sd32-choice"><input type="checkbox" data-sd32-person="'+esc2(p.id)+'"><span><b>'+esc2(n)+'</b><small>'+esc2(p.department||'')+'</small></span><label class="sd32-lead"><input type="radio" name="sd32Lead" value="'+esc2(p.id)+'" disabled> مسؤول رئيسي</label></label>'}
function openTeamModal(id){
 var t=task(id);if(!t||t.status!=='in_progress')return;var dep=isShared(t)?deptOfUnit(t):clean(t.department);var people=staffFor(dep);if(people.length<2){alert('لا يوجد موظفان متاحان على الأقل ضمن '+displayDepartment(dep)+'.');return}
 ensureModal();modalState={type:'team',taskId:String(id),department:dep};document.getElementById('sd32ModalKicker').textContent=displayDepartment(dep);document.getElementById('sd32ModalTitle').textContent='توزيع على أكثر من موظف';
 document.getElementById('sd32ModalBody').innerHTML='<p class="sd32-help">اختر موظفين أو أكثر، وحدد واحداً منهم كمسؤول رئيسي. كل موظف سيظهر عنده دوره بشكل مستقل ضمن نفس المهمة.</p><div class="sd32-choices">'+people.map(teamCard).join('')+'</div>';
 var body=document.getElementById('sd32ModalBody');body.querySelectorAll('[data-sd32-person]').forEach(function(ch){ch.addEventListener('change',function(){var radio=ch.closest('.sd32-choice').querySelector('input[type=radio]');radio.disabled=!ch.checked;if(!ch.checked&&radio.checked)radio.checked=false})});
 document.getElementById('sd32SaveBtn').onclick=saveTeamModal;document.getElementById('sd32Modal').classList.add('show');
}
async function saveTeamModal(){
 if(!modalState||modalState.type!=='team')return;var t=task(modalState.taskId);if(!t)return;var checks=Array.from(document.querySelectorAll('#sd32ModalBody [data-sd32-person]:checked'));var names=checks.map(function(x){return x.getAttribute('data-sd32-person')});if(names.length<2){alert('اختر موظفين اثنين على الأقل.');return}
 var lead=document.querySelector('#sd32ModalBody input[name=sd32Lead]:checked');
 await distributeFromBoard(t,'team',names,lead?.value||names[0]);
}
function deptChoice(dep,selected,withLead){return '<label class="sd32-choice dep"><input type="checkbox" data-sd32-dep="'+esc2(dep)+'" '+(selected?'checked':'')+'><span><b>'+esc2(displayDepartment(dep))+'</b><small>يوصل الجزء لمدير القسم للتوزيع</small></span>'+(withLead?'<label class="sd32-lead"><input type="radio" name="sd32LeadDep" value="'+esc2(dep)+'" '+(selected?'':'disabled')+'> القسم الرئيسي</label>':'')+'</label>'}
function openDepartmentsModal(id,mode){
 var t=task(id);if(!t)return;var add=mode==='add';var root=add?(isRoot(t)?t:rootOf(t)):null;if(add&&!root)return;var existing=add?deptUnits(root.id).map(deptOfUnit):[];var deps=allDepartments().filter(function(d){return !existing.includes(d)});if(!deps.length){alert('كل الأقسام مضافة مسبقاً.');return}
 var current=clean((root||t).sharedOriginalDepartment||t.department);ensureModal();modalState={type:add?'addDepartments':'departments',taskId:String((root||t).id)};document.getElementById('sd32ModalKicker').textContent=add?'توسيع التوزيع':'مهمة مشتركة';document.getElementById('sd32ModalTitle').textContent=add?'إضافة قسم للمهمة':'توزيع على أكثر من قسم';
 document.getElementById('sd32ModalBody').innerHTML='<p class="sd32-help">'+(add?'القسم الجديد ينضاف بانتظار مديره، والتوزيع الموجود حالياً يبقى كما هو بدون أي تغيير.':'اختر قسمين أو أكثر. كل قسم سيستلم جزءاً من نفس المهمة، ومدير كل قسم يقرر موظفاً واحداً أو فريقاً.')+'</p><div class="sd32-choices">'+deps.map(function(d){return deptChoice(d,!add&&d===current,!add)}).join('')+'</div>';
 if(!add){var body=document.getElementById('sd32ModalBody');body.querySelectorAll('[data-sd32-dep]').forEach(function(ch){ch.addEventListener('change',function(){var radio=ch.closest('.sd32-choice').querySelector('input[type=radio]');radio.disabled=!ch.checked;if(!ch.checked&&radio.checked)radio.checked=false})});var cr=body.querySelector('input[name=sd32LeadDep][value="'+CSS.escape(current)+'"]');if(cr&&!cr.disabled)cr.checked=true}
 document.getElementById('sd32SaveBtn').onclick=saveDepartmentsModal;document.getElementById('sd32Modal').classList.add('show');
}
async function saveDepartmentsModal(){
 if(!modalState)return;var selected=Array.from(document.querySelectorAll('#sd32ModalBody [data-sd32-dep]:checked')).map(function(x){return x.getAttribute('data-sd32-dep')});
 if(modalState.type==='departments'){
  if(selected.length<2){alert('اختر قسمين على الأقل.');return}var t=task(modalState.taskId);if(!t)return;var lead=document.querySelector('#sd32ModalBody input[name=sd32LeadDep]:checked');await distributeFromBoard(t,'departments',selected,lead?.value||selected[0]);return;
 }
 if(modalState.type==='addDepartments'){
  if(!selected.length){alert('اختر قسماً واحداً على الأقل.');return}var root=task(modalState.taskId);closeModal();if(root)addDepartments(root,selected);
 }
}
function openRoot(id){var r=task(id);if(!r)return;try{goApp('tasks',null)}catch(e){}setTimeout(function(){try{activeTaskViewContext={source:'all',containerId:'allTasksContainer',department:''};openTaskDetails(r.id)}catch(e){console.error(e)}},40)}


// Protect the shared root from accidental department reassignment and delete the whole shared tree safely.
if(typeof BASE_OPEN_TASK_DETAILS==='function'){
 window.openTaskDetails=function(id){var r=BASE_OPEN_TASK_DETAILS.apply(this,arguments);var t=task(id);if(isRoot(t)){setTimeout(function(){var d=document.getElementById('taskEditDepartment_'+id),a=document.getElementById('taskEditAssignee_'+id);if(d){d.value='المهمات';d.disabled=true;d.title='القسم يتحدد من أجزاء المهمة المشتركة';}if(a){a.value='موزعة مشتركة';a.readOnly=true;}},0)}return r};
}
if(typeof BASE_SAVE_TASK_CHANGES==='function'){
 window.saveTaskChanges=function(id){var t=task(id),dep=isRoot(t)?'المهمات':'';var r=BASE_SAVE_TASK_CHANGES.apply(this,arguments);if(t&&isRoot(t)&&t.department!==dep){t.department=dep;t.assignee='';saveSafe()}return r};
}
function sharedDescendantIds(rootId){var ids=new Set([String(rootId)]),changed=true;while(changed){changed=false;list().forEach(function(x){if(x.parentTaskId!=null&&ids.has(String(x.parentTaskId))&&!ids.has(String(x.id))){ids.add(String(x.id));changed=true}})}return ids}
if(typeof BASE_DELETE_MAIN==='function'){
 window.deleteMainTask=function(id){var t=task(id);if(!isRoot(t))return BASE_DELETE_MAIN.apply(this,arguments);if(!confirm('حذف المهمة المشتركة سيحذف كل أجزاء الأقسام وأدوار الموظفين التابعة لها. هل تريد المتابعة؟'))return;pushUndo();var ids=sharedDescendantIds(id);for(var i=state.salesTasks.length-1;i>=0;i--){if(ids.has(String(state.salesTasks[i].id)))state.salesTasks.splice(i,1)}saveSafe();try{renderAllTasks()}catch(e){} };
}

function enhanceBoard(){
 document.querySelectorAll('.db9').forEach(function(board){
  board.querySelectorAll('.db9-table tbody tr').forEach(function(row){
   var taskBtn=row.querySelector('button[data-action="task"][data-value]');if(!taskBtn)return;var t=task(taskBtn.dataset.value);if(!t)return;
   if(isRoot(t)){
    var cells=row.children;if(cells.length>=5){var assigneeCell=cells.length===6?cells[2]:cells[1],statusCell=cells.length===6?cells[3]:cells[2];if(assigneeCell)assigneeCell.innerHTML='<span class="sd32-inline">عدة أقسام / فريق</span>';if(statusCell)statusCell.innerHTML='<span class="db9-tag gold">'+esc2(t.sharedReady?'جاهزة للاعتماد':'مهمة مشتركة')+'</span>'}return;
   }
   var assign=row.querySelector('.db9-assign');if(!assign||assign.dataset.sd32Ready==='1')return;
   var oldSelect=assign.querySelector('select'),oldButton=assign.querySelector('button[data-action="assign"]');if(!oldSelect||!oldButton)return;
   var unit=isShared(t)&&nodeType(t)==='department';
   var bar=document.createElement('div');bar.className='sd32-modebar';bar.innerHTML='<button type="button" class="active" data-sd32-mode="single">موظف واحد</button><button type="button" data-sd32-mode="team">أكثر من موظف</button>'+(unit?'':'<button type="button" data-sd32-mode="departments">أكثر من قسم</button>');
   var single=document.createElement('div');single.className='sd32-single';oldSelect.parentNode.insertBefore(single,oldSelect);single.appendChild(oldSelect);single.appendChild(oldButton);assign.insertBefore(bar,single);
   var hint=document.createElement('small');hint.className='sd32-hint';hint.textContent=unit?'اختر منفذاً واحداً أو فريقاً لهذا القسم.':'حدد طريقة التوزيع أولاً.';assign.appendChild(hint);
   bar.addEventListener('click',function(e){var b=e.target.closest('[data-sd32-mode]');if(!b)return;bar.querySelectorAll('button').forEach(function(x){x.classList.toggle('active',x===b)});var mode=b.dataset.sd32Mode;if(mode==='single'){single.style.display='grid';hint.textContent='اختر الموظف ثم اضغط توزيع.';return}single.style.display='none';if(mode==='team'){hint.textContent='اختر أعضاء الفريق والمسؤول الرئيسي.';openTeamModal(t.id)}else{hint.textContent='اختر الأقسام المشاركة.';openDepartmentsModal(t.id,'create')}});
   assign.dataset.sd32Ready='1';
  });
 });
}
function refreshMarketingTaskList(){
 var cfg=getProductiveConfig('marketing'),view=document.getElementById(cfg.appId),box=document.getElementById(cfg.workspaceId);
 if(view?.classList.contains('active')&&productiveTaskViewModes.marketing==='running'&&box?.querySelector('.design-running-filter')){
  renderProductiveRunningTasks('marketing');
 }
}
function refreshBoards(){syncStatuses(false);setTimeout(function(){try{if(window.MoshDepartmentDashboard&&MoshDepartmentDashboard.refresh){document.querySelectorAll('.db9[data-department]').forEach(function(b){MoshDepartmentDashboard.refresh(b.dataset.department)})}refreshMarketingTaskList()}catch(e){}setTimeout(enhanceBoard,30)},20)}
if(typeof BASE_RENDER_BOARD==='function'){
 window.renderProductiveDistributionBoard=function(k){var r=BASE_RENDER_BOARD.apply(this,arguments);setTimeout(enhanceBoard,10);return r};
}
var obsTimer=0;new MutationObserver(function(){clearTimeout(obsTimer);obsTimer=setTimeout(enhanceBoard,25)}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(function(){if(syncStatuses(true))setTimeout(enhanceBoard,20)},4000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){ensureModal();syncStatuses(true);setTimeout(enhanceBoard,400)},{once:true});else{ensureModal();syncStatuses(true);setTimeout(enhanceBoard,200)}

let createDraft=null;
function createDistributionUI(dep,mode){
 const bar=document.getElementById('createDistributionModes'),box=document.getElementById('createDistributionChoices');
 if(!bar||!box)return;
 if(createDraft&&(createDraft.dep!==dep||createDraft.mode!==mode))createDraft=null;
 box.textContent=createDraft?createDraft.labels.join('، '):'';
 for(const button of bar.querySelectorAll('button')){
  const target=button.dataset.mode;
  button.classList.toggle('active',target===mode);
  button.setAttribute('aria-pressed',String(target===mode));
  button.onclick=()=>{
   if(target==='direct'){document.getElementById('standaloneTaskAssignmentMode').value=target;refreshStandaloneAssignmentUI();return;}
   const team=target==='team',choices=team?staffFor(dep).map(p=>[String(p.id),p.name]):allDepartments().map(d=>[d,displayDepartment(d)]);
   if(choices.length<2){alert(team?'لا يوجد موظفان متاحان ضمن القسم.':'لا يوجد قسمان متاحان.');return;}
   ensureModal();
   const modal=document.getElementById('sd32Modal'),body=document.getElementById('sd32ModalBody');
   document.getElementById('sd32ModalKicker').textContent=displayDepartment(dep);
   document.getElementById('sd32ModalTitle').textContent=team?'توزيع على أكثر من موظف':'توزيع على أكثر من قسم';
   const previous=createDraft?.mode===target?createDraft.ids:[];
   body.innerHTML='<p class="sd32-help">'+(team?'اختر موظفين أو أكثر، وحدد واحداً منهم كمسؤول رئيسي. كل موظف سيظهر عنده دوره بشكل مستقل ضمن نفس المهمة.':'اختر قسمين أو أكثر وحدّد القسم الرئيسي.')+'</p><div class="sd32-choices">'+choices.map(([id,label],i)=>{
    const checked=previous.includes(id);
    return '<div class="sd32-choice"><input type="checkbox" id="createMember'+i+'" '+(checked?'checked':'')+'><label for="createMember'+i+'"><b>'+esc2(label)+'</b><small>'+esc2(team?dep:'')+'</small></label><label class="sd32-lead"><input type="radio" name="createLead" '+(checked?'':'disabled')+' '+(previous[0]===id?'checked':'')+'>'+(team?'مسؤول رئيسي':'القسم الرئيسي')+'</label></div>';
   }).join('')+'</div>';
   const rows=Array.from(body.querySelectorAll('.sd32-choice'));
   rows.forEach(row=>{const [check,lead]=row.querySelectorAll('input');check.onchange=()=>{lead.disabled=!check.checked;if(!check.checked)lead.checked=false;};});
   document.getElementById('sd32SaveBtn').onclick=()=>{
    const selected=choices.filter((_,i)=>rows[i].querySelector('input').checked);
    const lead=choices.find((_,i)=>rows[i].querySelector('input[type=radio]').checked);
    if(selected.length<2||!lead){alert(team?'اختر موظفين على الأقل وحدّد المسؤول الرئيسي.':'اختر قسمين على الأقل وحدّد القسم الرئيسي.');return;}
    createDraft={dep,mode:target,ids:[lead[0],...selected.filter(x=>x!==lead).map(x=>x[0])],labels:selected.map(x=>x[1])};
    document.getElementById('standaloneTaskAssignmentMode').value=target;closeModal();refreshStandaloneAssignmentUI();
   };
   modal.classList.add('show');
  };
 }
}
async function distributeFromBoard(t,mode,selected,lead){
 const saveButton=document.getElementById('sd32SaveBtn');
 if(saveButton.disabled)return;
 saveButton.disabled=true;
 try{
  const ordered=[lead,...selected.filter(value=>value!==lead)];
  const payload={department:t.department,status:'in_progress',employeeState:'new'};
  for(const field of ['title','customer','customerId','description','dueDate','dueRule','notes','origin','salesOrderId','salesOrderNo']){
   if(t[field]!=null)payload[field]=t[field];
  }
  await createDistributed(payload,mode,ordered,String(MoshApi.user.id),t);
  closeModal();refreshBoards();
 }catch(error){alert(error.message||'تعذر حفظ توزيع المهمة.');}
 finally{saveButton.disabled=false;}
}
async function createDistributed(payload,mode,selected,owner,existing=null){
 const dep=payload.department,team=mode==='team',people=selected.map(id=>staffFor(dep).find(p=>String(p.id)===id)).filter(Boolean);
 if((team?people.length:selected.length)<2)throw new Error(team?'اختر موظفين على الأقل.':'اختر قسمين على الأقل.');
 const existingUnit=existing&&isShared(existing)&&nodeType(existing)==='department';
 const root=existingUnit?{id:existing.sharedRootTaskId,title:existing.parentTaskTitle}:existing?{...existing,history:[...(existing.history||[])]}:{...payload,id:crypto.randomUUID()};
 if(!existingUnit)makeRoot(root,mode,team?dep:selected[0]);
 const rows=existingUnit?[]:[root];
 for(const department of team?[dep]:selected){
  const unit={...payload,id:crypto.randomUUID(),attachments:[],parentTaskId:root.id,parentTaskTitle:root.title,sharedDistributionChild:true,sharedRootTaskId:root.id,sharedDepartment:department,sharedNodeType:'department',sharedTeamContainer:team,department:team?'المهمات':department,status:team?'shared_container':'in_progress',assignmentMode:team?'shared_team':'manager',assignee:'',assigneeId:''};
  if(existingUnit)unit.id=existing.id;
  if(team)unit.sharedTeamLead=people[0].name;
  rows.push(unit);
  if(team)for(const [i,p] of people.entries())rows.push({...payload,id:crypto.randomUUID(),attachments:[],parentTaskId:unit.id,parentTaskTitle:root.title,sharedDistributionChild:true,sharedRootTaskId:root.id,sharedDepartment:dep,sharedNodeType:'member',sharedLead:i===0,assignee:p.name,assigneeId:String(p.id),assignmentMode:'manager_assigned'});
 }
 const operations=rows.map(data=>{
  if(!existing||data.id!==existing.id)return {resource:'tasks',action:'create',id:data.id,data};
  const changes={};
  for(const field of Object.keys(data)){
   if(!['id','attachments','workChat','parentTaskTitle'].includes(field)&&JSON.stringify(data[field])!==JSON.stringify(existing[field]))changes[field]=data[field];
  }
  return {resource:'tasks',action:'update',id:existing.id,version:existing._version,data:changes};
 });
 const options={method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:{operations}};
 let result;try{result=await MoshApi.request('/transactions',options);}catch(e){if(!e.network)throw e;result=await MoshApi.request('/transactions',options);}
 for(const change of result.changes)if(change.resource==='tasks'&&change.data)MoshApi.acceptCreatedTask(change.data,owner);
 if(existing&&!result.changes.some(change=>String(change.id)===String(existing.id)&&change.data))await MoshApi.refreshTasks();
 refreshMarketingTaskList();
 return root;
}
window.MoshSharedDistribution32={createDistributionUI,createDistributed,creationSelection:()=>createDraft?.ids.slice()||[],version:VERSION,openTeam:openTeamModal,openDepartments:function(id){openDepartmentsModal(id,'create')},openAddDepartments:function(id){openDepartmentsModal(id,'add')},closeModal:closeModal,openRoot:openRoot,sync:function(){syncStatuses(true);enhanceBoard()},inspect:function(id){var r=task(id);if(!r)return null;return {root:isRoot(r),mode:r.sharedDistributionMode,ready:r.sharedReady,departments:deptUnits(r.id).map(function(u){return {department:deptOfUnit(u),status:unitStatus(u),assignee:u.assignee,team:members(u.id).map(function(m){return {name:m.assignee,status:m.status,state:m.employeeState}})}})}}};
})();
