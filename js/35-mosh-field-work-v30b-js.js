(function(){
'use strict';
if(window.MoshFieldWorkV30B)return;
var VERSION='30B';
var selectedActivity='';
var selectedTemplateId='';

var STARTER_TEMPLATES=[
 {id:'tpl_photographer',label:'مصور',active:true,statuses:['بالشركة','بالطريق','بموقع تصوير'],activities:['تجهيز معدات','معاينة موقع','بدء تصوير','إنهاء تصوير','نقل / تسليم مواد','رفع / نسخ مواد التصوير']},
 {id:'tpl_promoter',label:'مروّج',active:true,statuses:['بالشركة','بالطريق','بنقطة ترويج / بيع'],activities:['بدء جولة','زيارة نقطة','عرض / تجربة منتج','توزيع مواد','متابعة نقطة','إنهاء جولة']},
 {id:'tpl_presenter',label:'مقدم',active:true,statuses:['بالشركة','بالطريق','بالموقع / الاستوديو'],activities:['تحضير','بروفة','تقديم / تصوير','تسجيل صوتي','اجتماع / تنسيق','إنهاء جلسة']},
 {id:'tpl_driver',label:'سائق',active:true,statuses:['بالشركة','بالطريق','بمهمة توصيل'],activities:['استلام طلب توصيل','انطلاق','وصول / تسليم','استلام مواد','عودة للشركة','وقود / صيانة']},
 {id:'tpl_warehouse',label:'أمين مستودع',active:true,statuses:['بالمستودع','استلام / تسليم خارجي','بالإدارة / المكتب'],activities:['استلام مواد','تسليم مواد','جرد','ترتيب مستودع','نقل عهدة','تجهيز طلب']}
];
var OLD_ROLE_MAP={photographer:'tpl_photographer',promoter:'tpl_promoter',presenter:'tpl_presenter',driver:'tpl_driver',warehouse:'tpl_warehouse'};

function arr(v){return Array.isArray(v)?v:[]}
function clean(v){return String(v==null?'':v).trim()}
function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function now(){return new Date().toISOString()}
function uid(prefix){return (prefix||'fw')+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function dayKey(v){var d=v?new Date(v):new Date();if(isNaN(d.getTime()))d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function timeText(v){if(!v)return '—';try{return new Date(v).toLocaleTimeString('ar-SY',{hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function fieldMode(v){v=clean(v);return v==='ميداني'||v==='مختلط'}
function makeItems(list,prefix){return arr(list).map(function(label,i){return {id:uid(prefix),label:clean(label),active:true,order:i+1}})}
function normalizeTemplate(t){
 if(!t||typeof t!=='object')t={};
 if(!t.id)t.id=uid('tpl');if(!t.label)t.label='قالب بدون اسم';if(t.active!==false)t.active=true;
 t.statuses=arr(t.statuses).map(function(x,i){if(typeof x==='string')x={id:uid('st'),label:x,active:true,order:i+1};if(!x.id)x.id=uid('st');if(x.active!==false)x.active=true;if(!x.order)x.order=i+1;return x});
 t.activities=arr(t.activities).map(function(x,i){if(typeof x==='string')x={id:uid('ac'),label:x,active:true,order:i+1};if(!x.id)x.id=uid('ac');if(x.active!==false)x.active=true;if(!x.order)x.order=i+1;return x});
 return t
}
function settings(){
 try{
  if(!state.fieldWorkSettingsV30B||typeof state.fieldWorkSettingsV30B!=='object')state.fieldWorkSettingsV30B={version:VERSION,initialized:false,templates:[]};
  var s=state.fieldWorkSettingsV30B;
  if(!s.initialized){s.templates=STARTER_TEMPLATES.map(function(t){return normalizeTemplate({id:t.id,label:t.label,active:true,statuses:makeItems(t.statuses,'st'),activities:makeItems(t.activities,'ac'),createdAt:now(),updatedAt:now()})});s.initialized=true;s.version=VERSION;saveSafe()}
  s.templates=arr(s.templates).map(normalizeTemplate);return s
 }catch(e){
  window.__fieldWorkSettingsV30B=window.__fieldWorkSettingsV30B||{version:VERSION,initialized:true,templates:STARTER_TEMPLATES.map(function(t){return normalizeTemplate({id:t.id,label:t.label,active:true,statuses:makeItems(t.statuses,'st'),activities:makeItems(t.activities,'ac')})})};return window.__fieldWorkSettingsV30B
 }
}
function templates(){return settings().templates}
function templateById(id){id=clean(id);return templates().find(function(t){return clean(t.id)===id})||null}
function activeTemplates(){return templates().filter(function(t){return t.active!==false})}
function activeItems(list){return arr(list).filter(function(x){return x&&x.active!==false&&clean(x.label)}).sort(function(a,b){return (Number(a.order)||0)-(Number(b.order)||0)})}
function saveSafe(){try{if(typeof save==='function')save();return true}catch(e){console.error('field work save',e);return false}}
function profile(){
 try{if(typeof hrProCurrentProfile==='function'){var p=hrProCurrentProfile();if(p)return p}}catch(e){}
 var n='';try{n=clean(currentUserDisplayName())}catch(e){}
 try{return arr(state.staffProfiles).find(function(p){return [p.name,p.username,p.email,p.systemUsername].some(function(x){return clean(x).toLowerCase()===n.toLowerCase()})})||null}catch(e){return null}
}
function actor(){var p=profile();if(p&&clean(p.name))return clean(p.name);try{return clean(currentUserDisplayName())||'موظف'}catch(e){return 'موظف'}}
function actorKey(p){p=p||profile();return clean(p&&p.id)||clean(p&&p.username)||clean(p&&p.systemUsername)||clean(p&&p.name)||actor()}
function employeeTemplate(p){if(!p||!fieldMode(p.workMode))return null;var t=templateById(p.fieldTemplateId);return t&&t.active!==false?t:null}
function eligible(p){return !!(p&&p.active!==false&&employeeTemplate(p))}

function migrate(){
 var changed=false,s=settings();
 try{
  arr(state.staffProfiles).forEach(function(p){if(!clean(p.fieldTemplateId)&&OLD_ROLE_MAP[clean(p.fieldRole)]){p.fieldTemplateId=OLD_ROLE_MAP[clean(p.fieldRole)];changed=true}});
  if(!state.fieldWorkV30B||typeof state.fieldWorkV30B!=='object'){
   var old=state.fieldWorkV30A&&typeof state.fieldWorkV30A==='object'?state.fieldWorkV30A:null;
   state.fieldWorkV30B={version:VERSION,employees:old&&old.employees?old.employees:{}};changed=true
  }
  if(!state.fieldWorkV30B.employees||typeof state.fieldWorkV30B.employees!=='object')state.fieldWorkV30B.employees={};
  Object.keys(state.fieldWorkV30B.employees).forEach(function(k){var r=state.fieldWorkV30B.employees[k];if(r&&r.fieldRole&&!r.fieldTemplateId&&OLD_ROLE_MAP[r.fieldRole]){r.fieldTemplateId=OLD_ROLE_MAP[r.fieldRole];changed=true}})
 }catch(e){console.error('field work migrate',e)}
 if(changed)saveSafe();return s
}
function data(){try{if(!state.fieldWorkV30B||typeof state.fieldWorkV30B!=='object')state.fieldWorkV30B={version:VERSION,employees:{}};if(!state.fieldWorkV30B.employees)state.fieldWorkV30B.employees={};return state.fieldWorkV30B}catch(e){window.__fieldWorkV30B=window.__fieldWorkV30B||{version:VERSION,employees:{}};return window.__fieldWorkV30B}}
function recFor(p,key){
 key=key||actorKey(p);var d=data(),r=d.employees[key];
 if(!r)r=d.employees[key]={employeeId:clean(p&&p.id),name:clean(p&&p.name)||actor(),department:clean(p&&p.department),fieldTemplateId:clean(p&&p.fieldTemplateId),currentStatus:'',statusAt:'',workState:'not_started',shiftStartAt:'',endedAt:'',activities:[]};
 if(!Array.isArray(r.activities))r.activities=[];r.name=clean(p&&p.name)||r.name||actor();r.department=clean(p&&p.department)||r.department||'';r.fieldTemplateId=clean(p&&p.fieldTemplateId)||r.fieldTemplateId||'';if(p&&clean(p.id))r.employeeId=clean(p.id);return r
}
function todayActivities(r){var k=dayKey();return arr(r&&r.activities).filter(function(a){return dayKey(a.at)===k}).sort(function(a,b){return String(a.at).localeCompare(String(b.at))})}
function currentTask(){var t=document.getElementById('es11TaskTitle');if(!t)return '';var s=clean(t.textContent);if(!s||s.indexOf('لا يوجد')>-1)return '';return s}
function addEvent(label,note,kind){var p=profile(),tpl=employeeTemplate(p);if(!tpl)return null;var r=recFor(p),ev={id:uid('FW'),at:now(),label:clean(label),note:clean(note),kind:kind||'activity',status:r.currentStatus||'',task:currentTask(),by:actor(),fieldTemplateId:tpl.id,fieldTemplateLabel:tpl.label};r.activities.push(ev);if(r.activities.length>500)r.activities=r.activities.slice(-500);saveSafe();renderEmployee();return ev}
function isWorkActive(){var end=document.getElementById('workProofEnd');if(!end)return false;return end.disabled===false}
function breakCurrent(){var b=document.getElementById('workProofBreak');return !!(b&&b.parentElement&&b.parentElement.getAttribute('data-current')==='true')}
function noWorkCurrent(){var b=document.getElementById('workProofNoWork');return !!(b&&b.parentElement&&b.parentElement.getAttribute('data-current')==='true')}
function statusLabel(tpl,id){var x=arr(tpl&&tpl.statuses).find(function(a){return a.id===id});return x?clean(x.label):''}
function effectiveState(r,tpl){if(r.workState==='ended')return {key:'ended',label:'انتهى الدوام'};if(breakCurrent()||r.workState==='break')return {key:'break',label:'استراحة'};if(noWorkCurrent()||r.workState==='no_work')return {key:'break',label:'لا يوجد عمل حالياً'};if(isWorkActive()||r.workState==='working')return {key:'working',label:statusLabel(tpl,r.currentStatus)||'حدد وضعك الآن'};return {key:'ended',label:'لم يبدأ العمل بعد'}}
function setStatus(id){var p=profile(),tpl=employeeTemplate(p),item=tpl&&activeItems(tpl.statuses).find(function(x){return x.id===id});if(!item)return;var r=recFor(p);if(!(isWorkActive()||r.workState==='working'))return;r.currentStatus=id;r.statusAt=now();r.workState='working';addEvent('تغيير الحالة: '+item.label,'','status');renderEmployee()}
function ensureEmployeeCard(){var space=document.getElementById('employeeSpaceV11');if(!space)return null;var old=document.getElementById('fieldWorkCardV30A');if(old)old.remove();var card=document.getElementById('fieldWorkCardV30B');if(!card){card=document.createElement('section');card.id='fieldWorkCardV30B';card.hidden=true;var grid=space.querySelector('.es11-main-grid');if(grid)grid.insertAdjacentElement('afterend',card);else space.appendChild(card)}return card}
function renderEmployee(){
 var card=ensureEmployeeCard();if(!card)return;var p=profile(),tpl=employeeTemplate(p);if(!tpl){card.hidden=true;card.innerHTML='';return}
 card.hidden=false;var r=recFor(p),st=effectiveState(r,tpl),active=(isWorkActive()||r.workState==='working')&&!breakCurrent()&&!noWorkCurrent()&&r.workState!=='ended',acts=todayActivities(r).slice(-5).reverse(),task=currentTask(),statuses=activeItems(tpl.statuses),activities=activeItems(tpl.activities);
 card.innerHTML='<div class="fw30-head"><div><h3>العمل الميداني — '+esc(tpl.label)+'</h3><p>اختار وضعك الحالي وسجل مراحل العمل المهمة فقط. الخيارات محددة من الموارد البشرية.</p></div><span class="fw30-role">'+esc(tpl.label)+' · '+esc(p.workMode)+'</span></div><div class="fw30-grid"><div class="fw30-box"><span class="fw30-label">وضعك الآن</span><div class="fw30-current '+esc(st.key)+'"><i></i><b>'+esc(st.label)+'</b><small>'+(r.statusAt?esc(timeText(r.statusAt)):'')+'</small></div>'+
 (statuses.length?'<div class="fw30-statuses">'+statuses.map(function(x){return '<button type="button" class="fw30-status-btn '+(r.currentStatus===x.id&&active?'active':'')+'" data-fw30-status="'+esc(x.id)+'" '+(active?'':'disabled')+'>'+esc(x.label)+'</button>'}).join('')+'</div>':'<div class="fw30-empty">الموارد البشرية لم تضف حالات لهذا القالب بعد.</div>')+'<div class="fw30-hint">'+(active?'غيّر الحالة فقط عند انتقال فعلي.':'ابدأ العمل أولاً، وبعدها حدّد وضعك الحالي.')+'</div></div><div class="fw30-box"><span class="fw30-label">تسجيل العمل</span><div class="fw30-actions"><button type="button" class="fw30-action primary" id="fw30QuickB" '+(active&&activities.length?'':'disabled')+'>+ تسجيل مرحلة / نشاط</button><button type="button" class="fw30-action" id="fw30RefreshB">تحديث</button></div><div class="fw30-task">المهمة الحالية: <b>'+esc(task||'لا توجد مهمة مرتبطة الآن')+'</b></div><div class="fw30-timeline"><h4>آخر نشاطات اليوم</h4>'+(acts.length?acts.map(function(a){return '<div class="fw30-event"><time>'+esc(timeText(a.at))+'</time><div><b>'+esc(a.label)+'</b>'+(a.note?'<small>'+esc(a.note)+'</small>':'')+(a.task?'<small>المهمة: '+esc(a.task)+'</small>':'')+'</div></div>'}).join(''):'<div class="fw30-empty">ما سجلت نشاط اليوم بعد.</div>')+'</div></div></div>';
 card.querySelectorAll('[data-fw30-status]').forEach(function(b){b.addEventListener('click',function(){setStatus(b.getAttribute('data-fw30-status'))})});var q=card.querySelector('#fw30QuickB');if(q)q.addEventListener('click',openQuick);var rf=card.querySelector('#fw30RefreshB');if(rf)rf.addEventListener('click',renderEmployee)
}
function ensureQuick(){var old=document.getElementById('fieldQuickModalV30A');if(old)old.remove();var ov=document.getElementById('fieldQuickModalV30B');if(ov)return ov;ov=document.createElement('div');ov.id='fieldQuickModalV30B';ov.className='fw30-overlay';ov.hidden=true;document.body.appendChild(ov);ov.addEventListener('click',function(e){if(e.target===ov)closeQuick()});return ov}
function openQuick(){var p=profile(),tpl=employeeTemplate(p),items=tpl?activeItems(tpl.activities):[];if(!tpl||!items.length||!(isWorkActive()||recFor(p).workState==='working'))return;selectedActivity='';var ov=ensureQuick();ov.innerHTML='<div class="fw30-dialog"><h3>تسجيل مرحلة / نشاط — '+esc(tpl.label)+'</h3><p>اختار اللي عملته. الملاحظة اختيارية إلا إذا في معلومة مهمة.</p><div class="fw30-types">'+items.map(function(x){return '<button type="button" class="fw30-type" data-fw30-type="'+esc(x.id)+'">'+esc(x.label)+'</button>'}).join('')+'</div><textarea id="fw30NoteB" placeholder="ملاحظة قصيرة (اختياري)..."></textarea><div class="fw30-dialog-actions"><button type="button" class="fw30-action" id="fw30CancelB">إلغاء</button><button type="button" class="fw30-action primary" id="fw30SaveB">حفظ النشاط</button></div></div>';ov.querySelectorAll('[data-fw30-type]').forEach(function(b){b.addEventListener('click',function(){selectedActivity=b.getAttribute('data-fw30-type');ov.querySelectorAll('[data-fw30-type]').forEach(function(x){x.classList.toggle('active',x===b)})})});ov.querySelector('#fw30CancelB').addEventListener('click',closeQuick);ov.querySelector('#fw30SaveB').addEventListener('click',saveQuick);ov.hidden=false}
function closeQuick(){var ov=document.getElementById('fieldQuickModalV30B');if(ov)ov.hidden=true}
function saveQuick(){var p=profile(),tpl=employeeTemplate(p),item=tpl&&activeItems(tpl.activities).find(function(x){return x.id===selectedActivity});if(!item){alert('اختار المرحلة أو النشاط أولاً.');return}var ov=ensureQuick(),note=clean(ov.querySelector('#fw30NoteB')?ov.querySelector('#fw30NoteB').value:'');addEvent(item.label,note,'activity');closeQuick()}
function syncWork(trigger){var p=profile();if(!eligible(p))return;var r=recFor(p);if(trigger==='workProofStart'){var first=dayKey(r.shiftStartAt)!==dayKey();r.workState='working';r.endedAt='';if(first){r.shiftStartAt=now();r.currentStatus='';r.statusAt='';addEvent('بدء العمل','','system')}else addEvent('استئناف العمل','','system')}else if(trigger==='workProofBreak'){r.workState='break';addEvent('بدء استراحة','','system')}else if(trigger==='workProofNoWork'){r.workState='no_work';addEvent('لا يوجد عمل لدي','','system')}else if(trigger==='workProofEnd'){r.workState='ended';r.endedAt=now();addEvent('إنهاء العمل','','system')}saveSafe();renderEmployee()}

/* HR: dynamic template editor */
function assignedToTemplate(id){try{return arr(state.staffProfiles).filter(function(p){return clean(p.fieldTemplateId)===clean(id)})}catch(e){return []}}
function ensureHrUI(){
 var hr=document.getElementById('hrApp'),nav=document.getElementById('hrProNav');if(!hr||!nav)return;
 var oldTab=document.getElementById('hrFieldWorkTabV30A');if(oldTab)oldTab.remove();
 if(!document.getElementById('hrFieldWorkTabV30B')){var b=document.createElement('button');b.id='hrFieldWorkTabV30B';b.type='button';b.textContent='إعدادات العمل الميداني';b.onclick=showHrSettings;var reports=nav.querySelector('[data-hr-view="reports"]');if(reports)nav.insertBefore(b,reports);else nav.appendChild(b)}
 if(!document.getElementById('hrFieldWorkContentV30B')){var host=document.createElement('div');host.id='hrFieldWorkContentV30B';host.style.display='none';hr.appendChild(host)}
 if(!nav.dataset.fieldWorkBound){nav.dataset.fieldWorkBound='1';nav.addEventListener('click',function(e){var b=e.target.closest('button');if(b&&b.id!=='hrFieldWorkTabV30B')hideHrSettings()})}
}
function hideHrSettings(){var h=document.getElementById('hrFieldWorkContentV30B');if(h)h.style.display='none';var b=document.getElementById('hrFieldWorkTabV30B');if(b)b.classList.remove('active')}
function showHrSettings(){ensureHrUI();['hrProContent','hrAppContent','hrStaffConfigContent','hrStandaloneContent','hrWisdomContent'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='none'});var h=document.getElementById('hrFieldWorkContentV30B');if(h)h.style.display='block';document.querySelectorAll('#hrProNav button').forEach(function(b){b.classList.remove('active')});var btn=document.getElementById('hrFieldWorkTabV30B');if(btn)btn.classList.add('active');var crumb=document.getElementById('crumb');if(crumb)crumb.innerHTML='<b>قسم الموارد البشرية</b> / إعدادات العمل الميداني';if(!selectedTemplateId&&templates()[0])selectedTemplateId=templates()[0].id;renderHrSettings()}
function renderHrSettings(){
 var host=document.getElementById('hrFieldWorkContentV30B');if(!host||host.style.display==='none')return;var ts=templates();if(selectedTemplateId&&!templateById(selectedTemplateId))selectedTemplateId=ts[0]?ts[0].id:'';var t=templateById(selectedTemplateId);
 host.innerHTML='<div class="fwset-shell"><div class="fwset-top"><div><h2>إعدادات العمل الميداني</h2><p>الموارد البشرية تنشئ أنواع العمل وتحدد الحالات ومراحل النشاط. ما في أي وظيفة أو مرحلة ثابتة داخل النظام.</p></div><span class="fw30-role">'+ts.length+' قوالب</span></div><div class="fwset-layout"><aside class="fwset-side"><div class="fwset-side-head"><b>قوالب العمل</b><small style="color:#7f898e">تظهر في ملف الموظف</small></div><div class="fwset-add"><input id="fwsetNewTemplateName" placeholder="مثال: مندوب إنتاج"><button type="button" class="fw30-action primary" id="fwsetAddTemplate">+ إضافة</button></div><div class="fwset-list">'+(ts.length?ts.map(function(x){var n=assignedToTemplate(x.id).length;return '<button type="button" class="fwset-tpl '+(x.id===selectedTemplateId?'active':'')+'" data-template="'+esc(x.id)+'"><b>'+esc(x.label)+'</b><small>'+(x.active===false?'معطل · ':'')+n+' موظف مرتبط</small></button>'}).join(''):'<div class="fw30-empty">ما في قوالب بعد. أضف أول نوع عمل.</div>')+'</div><div class="fwset-note">القوالب الموجودة أول مرة هي أمثلة قابلة للتعديل أو الحذف. بعد ذلك كل شيء تحت تحكم الموارد البشرية.</div></aside><main class="fwset-main">'+(t?templateEditor(t):'<div class="fw30-empty">اختار قالب أو أضف قالب جديد.</div>')+'</main></div></div>';
 bindHrSettings(host,t)
}
function templateEditor(t){var assigned=assignedToTemplate(t.id),names=assigned.map(function(p){return clean(p.name)}).filter(Boolean);return '<div class="fwset-main-head"><div><h3>'+esc(t.label)+'</h3><p>أي تعديل هون ينعكس مباشرة على الموظفين المرتبطين بالقالب.</p></div><button type="button" class="fw30-action danger" id="fwsetDeleteTemplate">حذف القالب</button></div><div class="fwset-fields"><div class="fwset-field"><label>اسم نوع العمل</label><input class="fwset-input" id="fwsetTemplateLabel" value="'+esc(t.label)+'" placeholder="اسم نوع العمل"></div><div class="fwset-field"><label>حالة القالب</label><label class="fwset-toggle"><input type="checkbox" id="fwsetTemplateActive" '+(t.active!==false?'checked':'')+'> مفعل للموظفين</label></div></div>'+itemsEditor('statuses','الحالات الحالية','شو ممكن يكون وضع الموظف الآن، مثل: بالشركة / بالطريق / بالموقع.',t.statuses)+itemsEditor('activities','مراحل / أنشطة العمل','الأزرار التي يرفع منها الموظف ما عمله، مثل: انطلاق / استلام / تسليم / عودة.',t.activities)+'<div class="fwset-assigned"><b>الموظفون المرتبطون بالقالب: '+assigned.length+'</b><p>'+(names.length?esc(names.join(' · ')):'لا يوجد موظفون مرتبطون حالياً.')+'</p></div>'}
function itemsEditor(kind,title,desc,list){var items=arr(list).sort(function(a,b){return (Number(a.order)||0)-(Number(b.order)||0)});return '<section class="fwset-section"><div class="fwset-section-head"><div><h4>'+esc(title)+'</h4><p>'+esc(desc)+'</p></div><span class="fw30-role">'+items.length+'</span></div><div class="fwset-rows">'+(items.length?items.map(function(x,i){return '<div class="fwset-row '+(x.active===false?'inactive':'')+'" data-kind="'+kind+'" data-item="'+esc(x.id)+'"><input class="fwset-input" data-item-label value="'+esc(x.label)+'" placeholder="اسم الخيار"><label class="fwset-check"><input type="checkbox" data-item-active '+(x.active!==false?'checked':'')+'> مفعّل</label><button type="button" data-move="up" title="رفع">↑</button><button type="button" data-move="down" title="تنزيل">↓</button><button type="button" data-delete-item title="حذف">×</button></div>'}).join(''):'<div class="fw30-empty">ما في خيارات بعد.</div>')+'</div><div class="fwset-new-item"><input class="fwset-input" id="fwsetNew_'+kind+'" placeholder="أضف خيار جديد"><button type="button" class="fw30-action" data-add-item="'+kind+'">+ إضافة</button></div></section>'}
function bindHrSettings(host,t){
 var add=host.querySelector('#fwsetAddTemplate');if(add)add.addEventListener('click',function(){var input=host.querySelector('#fwsetNewTemplateName'),name=clean(input&&input.value);if(!name){if(input)input.focus();return}var nt=normalizeTemplate({id:uid('tpl'),label:name,active:true,statuses:[],activities:[],createdAt:now(),updatedAt:now()});settings().templates.push(nt);selectedTemplateId=nt.id;saveSafe();renderHrSettings();patchStaffForm()});
 host.querySelectorAll('[data-template]').forEach(function(b){b.addEventListener('click',function(){selectedTemplateId=b.getAttribute('data-template');renderHrSettings()})});if(!t)return;
 var label=host.querySelector('#fwsetTemplateLabel');if(label)label.addEventListener('change',function(){var v=clean(label.value);if(!v){label.value=t.label;return}t.label=v;t.updatedAt=now();saveSafe();renderHrSettings();patchStaffForm();renderEmployee()});
 var act=host.querySelector('#fwsetTemplateActive');if(act)act.addEventListener('change',function(){t.active=!!act.checked;t.updatedAt=now();saveSafe();renderHrSettings();patchStaffForm();renderEmployee()});
 var del=host.querySelector('#fwsetDeleteTemplate');if(del)del.addEventListener('click',function(){var a=assignedToTemplate(t.id);if(a.length){alert('لا يمكن حذف القالب لأنه مرتبط بـ '+a.length+' موظف. غيّر قالبهم أولاً أو عطّل القالب.');return}if(!confirm('حذف قالب «'+t.label+'»؟'))return;settings().templates=settings().templates.filter(function(x){return x.id!==t.id});selectedTemplateId=settings().templates[0]?settings().templates[0].id:'';saveSafe();renderHrSettings();patchStaffForm()});
 host.querySelectorAll('[data-add-item]').forEach(function(b){b.addEventListener('click',function(){var kind=b.getAttribute('data-add-item'),inp=host.querySelector('#fwsetNew_'+kind),name=clean(inp&&inp.value);if(!name){if(inp)inp.focus();return}var list=kind==='statuses'?t.statuses:t.activities;list.push({id:uid(kind==='statuses'?'st':'ac'),label:name,active:true,order:list.length+1});t.updatedAt=now();saveSafe();renderHrSettings();renderEmployee()})});
 host.querySelectorAll('.fwset-row').forEach(function(row){var kind=row.getAttribute('data-kind'),id=row.getAttribute('data-item'),list=kind==='statuses'?t.statuses:t.activities,item=list.find(function(x){return x.id===id});if(!item)return;var inp=row.querySelector('[data-item-label]');if(inp)inp.addEventListener('change',function(){var v=clean(inp.value);if(v)item.label=v;else inp.value=item.label;t.updatedAt=now();saveSafe();renderHrSettings();renderEmployee()});var ch=row.querySelector('[data-item-active]');if(ch)ch.addEventListener('change',function(){item.active=!!ch.checked;t.updatedAt=now();saveSafe();renderHrSettings();renderEmployee()});row.querySelectorAll('[data-move]').forEach(function(btn){btn.addEventListener('click',function(){var ordered=list.slice().sort(function(a,b){return (Number(a.order)||0)-(Number(b.order)||0)}),idx=ordered.findIndex(function(x){return x.id===id}),dir=btn.getAttribute('data-move')==='up'?-1:1,to=idx+dir;if(idx<0||to<0||to>=ordered.length)return;var tmp=ordered[idx];ordered[idx]=ordered[to];ordered[to]=tmp;ordered.forEach(function(x,i){x.order=i+1});t.updatedAt=now();saveSafe();renderHrSettings();renderEmployee()})});var rm=row.querySelector('[data-delete-item]');if(rm)rm.addEventListener('click',function(){if(!confirm('حذف الخيار «'+item.label+'»؟'))return;if(kind==='statuses')t.statuses=t.statuses.filter(function(x){return x.id!==id});else t.activities=t.activities.filter(function(x){return x.id!==id});t.updatedAt=now();saveSafe();renderHrSettings();renderEmployee()})})
}

/* HR employee profile: template assignment */
function templateOptions(current){var list=templates().filter(function(t){return t.active!==false||t.id===current});return '<option value="">— اختر قالب العمل الميداني —</option>'+list.map(function(t){return '<option value="'+esc(t.id)+'">'+esc(t.label)+(t.active===false?' — معطل':'')+'</option>'}).join('')}
function editingProfile(){var p=null;try{if(typeof getStaffProfileById==='function'&&typeof hrStaffEditingId!=='undefined'&&hrStaffEditingId)p=getStaffProfileById(hrStaffEditingId)}catch(e){}return p}
function patchStaffForm(){
 var mode=document.getElementById('staffWorkMode');if(!mode)return;['ميداني','مختلط'].forEach(function(v){if(!Array.prototype.some.call(mode.options,function(o){return o.value===v})){var op=document.createElement('option');op.value=v;op.textContent=v;mode.appendChild(op)}});
 var old=document.getElementById('staffFieldRoleWrap');if(old)old.remove();var wrap=document.getElementById('staffFieldTemplateWrap'),p=editingProfile(),savedCurrent=clean(p&&p.fieldTemplateId);
 if(!wrap){wrap=document.createElement('div');wrap.id='staffFieldTemplateWrap';wrap.className='field';wrap.innerHTML='<label>قالب العمل الميداني</label><select id="staffFieldTemplateId"></select><small id="staffFieldTemplateHelp">الموارد البشرية تتحكم بالقوالب والحالات ومراحل العمل من «إعدادات العمل الميداني».</small>';var parent=mode.closest('.field');if(parent&&parent.parentNode)parent.insertAdjacentElement('afterend',wrap)}
 var sel=wrap.querySelector('#staffFieldTemplateId');if(sel){
  var keep=clean(sel.value)||savedCurrent,signature=templates().map(function(t){return t.id+'|'+t.label+'|'+(t.active===false?'0':'1')}).join(';;')+'|'+savedCurrent;
  if(sel.dataset.templateSignature!==signature){sel.innerHTML=templateOptions(savedCurrent);sel.dataset.templateSignature=signature;if(keep&&Array.prototype.some.call(sel.options,function(o){return o.value===keep}))sel.value=keep;else sel.value=savedCurrent}
 }
 function update(){var show=fieldMode(mode.value);wrap.hidden=!show;if(sel)sel.disabled=!show}
 if(!mode.dataset.fieldWorkV30BBound){mode.dataset.fieldWorkV30BBound='1';mode.addEventListener('change',update)}
 update()
}
function wrapStaffSave(){
 if(window.__fieldWorkSaveWrappedV30B)return;var old=null;try{old=window.saveStaffProfile||saveStaffProfile}catch(e){};if(typeof old!=='function')return;window.__fieldWorkSaveWrappedV30B=true;
 var wrapped=function(editId){var mode=document.getElementById('staffWorkMode'),sel=document.getElementById('staffFieldTemplateId'),modeVal=clean(mode&&mode.value),tplId=clean(sel&&sel.value),tpl=templateById(tplId);if(fieldMode(modeVal)&&(!tpl||tpl.active===false)){alert('اختار قالب عمل ميداني مفعّل للموظف.');if(sel)sel.focus();return false}var capturedName=clean(document.getElementById('staffName')&&document.getElementById('staffName').value),capturedId='';try{capturedId=clean(typeof hrStaffEditingId!=='undefined'?hrStaffEditingId:'')||clean(editId)}catch(e){}var result=old.apply(this,arguments);setTimeout(function(){try{var p=null;if(capturedId&&typeof getStaffProfileById==='function')p=getStaffProfileById(capturedId);if(!p&&typeof state!=='undefined'&&Array.isArray(state.staffProfiles))p=state.staffProfiles.find(function(x){return clean(x.name)===capturedName})||null;if(p){p.fieldTemplateId=fieldMode(p.workMode||modeVal)?tplId:'';saveSafe();patchStaffForm();renderEmployee();if(document.getElementById('hrFieldWorkContentV30B')&&document.getElementById('hrFieldWorkContentV30B').style.display!=='none')renderHrSettings()}}catch(e){console.error('field template save',e)}},80);return result};window.saveStaffProfile=wrapped;try{saveStaffProfile=wrapped}catch(e){}
}
function removeOldPhotoTeam(){['photoTeamBtnV30','photoTeamBtnV30A','photoTeamModalV30','photoTeamModalV30A'].forEach(function(id){var e=document.getElementById(id);if(e){if(e.parentElement&&e.parentElement.classList&&e.parentElement.classList.contains('menu'))e.parentElement.remove();else e.remove()}})}
function init(){migrate();removeOldPhotoTeam();ensureHrUI();wrapStaffSave();patchStaffForm();ensureEmployeeCard();renderEmployee();document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('#workProofStart,#workProofBreak,#workProofNoWork,#workProofEnd'):null;if(!b)return;var id=b.id;setTimeout(function(){syncWork(id)},120)},true);var target=document.getElementById('staffWorkflowConfig');if(target)new MutationObserver(function(){patchStaffForm();wrapStaffSave()}).observe(target,{childList:true,subtree:true});setInterval(function(){renderEmployee();patchStaffForm();ensureHrUI();removeOldPhotoTeam()},5000)}
window.MoshFieldWorkV30B={render:renderEmployee,setStatus:setStatus,openQuick:openQuick,showSettings:showHrSettings,refreshSettings:renderHrSettings,templates:templates,version:VERSION};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
