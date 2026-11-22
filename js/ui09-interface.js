/* UI09: presentation and validation. Existing permissions and save handlers remain authoritative. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),all=(s,r=document)=>[...r.querySelectorAll(s)];
const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
const auth=()=>window.MoshAuth37,toast=t=>window.MoshUI19?.toast(t),uid=()=>crypto.randomUUID();
const eye='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
let seq=0;
window.MoshConfirm09=(message)=>new Promise(resolve=>{const d=document.createElement('dialog');d.className='ui09-confirm';d.dir='rtl';const text=make('p','',message),buttons=make('div','ui09-confirm-actions'),yes=make('button','btn primary','تأكيد'),no=make('button','btn','إلغاء');yes.type=no.type='button';buttons.append(yes,no);d.append(text,buttons);document.body.append(d);let done=false;const finish=value=>{if(done)return;done=true;d.close();d.remove();resolve(value);};yes.onclick=()=>finish(true);no.onclick=()=>finish(false);d.addEventListener('cancel',e=>{e.preventDefault();finish(false);});d.addEventListener('close',()=>finish(false));d.showModal();no.focus();});

function clearField(f){if(!f)return;f.removeAttribute('aria-invalid');f.classList.remove('ui09-invalid');const id=f.dataset.ui09Error;if(id){document.getElementById(id)?.remove();const ids=(f.getAttribute('aria-describedby')||'').split(' ').filter(x=>x!==id);if(ids.length)f.setAttribute('aria-describedby',ids.join(' '));else f.removeAttribute('aria-describedby');delete f.dataset.ui09Error;}}
function mark(f,message){if(!f)return;clearField(f);const e=make('small','ui09-field-error','! '+message);e.id='ui09-error-'+(++seq);e.setAttribute('role','alert');f.classList.add('ui09-invalid');f.setAttribute('aria-invalid','true');f.dataset.ui09Error=e.id;f.setAttribute('aria-describedby',((f.getAttribute('aria-describedby')||'')+' '+e.id).trim());(f.closest('.ui09-password')||f).after(e);}
function reveal(f){if(!f)return;let p=f.parentElement;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}const pane=f.closest('[data-hr-tab-panel],.hr-tab-panel,.hr-profile-pane');if(pane&&typeof switchHrEmployeeTab==='function')switchHrEmployeeTab(pane.dataset.hrTabPanel||pane.dataset.pane||pane.id.replace(/^hrTab_/,''));requestAnimationFrame(()=>{f.scrollIntoView({block:'center',behavior:'smooth'});f.focus({preventScroll:true});});}
function report(entries){entries=entries.filter(([f])=>f);entries.forEach(([f,m])=>mark(f,m));reveal(entries[0]?.[0]);return entries.length===0;}
function nativeMessage(f){const v=f.validity;return v.valueMissing?'هذا الحقل مطلوب.':v.typeMismatch?'أدخل قيمة صحيحة.':v.tooShort?'القيمة أقصر من المطلوب.':v.rangeUnderflow||v.rangeOverflow?'القيمة خارج النطاق المسموح.':v.patternMismatch?'القيمة غير مطابقة للتنسيق المطلوب.':'تحقق من قيمة هذا الحقل.';}
function server(error,root=document,map={}){const entries=[];for(const [k,msg] of Object.entries(error.errors||{})){const key=k.split('.').at(-1),id=map[key]||($('#staffName')?({name:'staffName',department:'staffDepartment',jobTitle:'staffJobTitle',hireDate:'staffHireDate',attendanceMode:'staffAttendanceMode',workdayHours:'staffWorkdayHours',zktecoEnrollmentNumber:'staffZktecoEnrollmentNumber'})[key]:null);let f=id?document.getElementById(id):null;if(!f)f=all('input,select,textarea',root).find(x=>x.name===key||x.id===key);if(f)entries.push([f,Array.isArray(msg)?msg[0]:msg]);}report(entries);return entries.length>0;}
window.MoshValidation09={mark,clear:clearField,report,reveal,server};
document.addEventListener('invalid',e=>{e.preventDefault();mark(e.target,nativeMessage(e.target));if(!document._ui09Invalid){document._ui09Invalid=true;setTimeout(()=>{reveal($('[aria-invalid="true"]'));document._ui09Invalid=false;},0);}},true);
for(const ev of ['input','change'])document.addEventListener(ev,e=>{const f=e.target;if(f.matches?.('.ui09-invalid')&&f.validity?.valid&&(f.type==='checkbox'||f.type==='radio'||f.value.trim()))clearField(f);});
// Forms made by newer modules use native constraints; show all errors together.
document.addEventListener('submit',e=>{const invalid=all('input,select,textarea',e.target).filter(f=>f.willValidate&&!f.validity.valid);if(invalid.length){e.preventDefault();e.stopImmediatePropagation();report(invalid.map(f=>[f,nativeMessage(f)]));}},true);
document.addEventListener('mosh:validation-error',e=>{const root=all('dialog[open],#moshAuthEditor').filter(n=>n.getClientRects().length).at(-1)||$('.view.active')||document;server(e.detail,root,{employeeId:'auth37UStaff',username:'auth37UUsername',password:'auth37UPass'});});

function passwordEyes(){for(const input of all('input[type=password]')){if(input.dataset.ui09Eye||input.readOnly)continue;input.dataset.ui09Eye='1';const wrap=make('span','ui09-password'),b=make('button','ui09-eye');b.type='button';b.innerHTML=eye;b.setAttribute('aria-label','إظهار كلمة السر');b.title='إظهار كلمة السر';b.setAttribute('aria-pressed','false');input.before(wrap);wrap.append(input,b);b.onclick=()=>{const shown=input.type==='password';input.type=shown?'text':'password';b.setAttribute('aria-pressed',String(shown));b.title=shown?'إخفاء كلمة السر':'إظهار كلمة السر';b.setAttribute('aria-label',b.title);};}}
function closeIcons(){for(const b of all('button')){if(b.dataset.ui09Close||!['إغلاق','اغلاق'].includes(b.textContent.trim()))continue;b.dataset.ui09Close='1';b.setAttribute('aria-label','إغلاق');b.title='إغلاق (Esc)';b.textContent='×';b.classList.add('ui09-close');}}
function header(){const svg=path=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';for(const [selector,label,path] of [['.top-actions [onclick*="undoLastEdit"]','التراجع عن آخر خطوة','<path d="M9 5 4 10l5 5M4 10h9a7 7 0 0 1 7 7"/>'],['#systemSettingsBtn','إعدادات النظام','<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>']]){const b=$(selector);if(b&&!b.dataset.ui09Icon){b.dataset.ui09Icon='1';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=svg(path);}}const approval=$('#r34ApprovalsTop');if(approval){approval.classList.add('ui09-approval-icon');approval.setAttribute('aria-label','اعتماداتي'+(Number(approval.dataset.count)>0?'، '+approval.dataset.count+' طلب':''));}
const crumb=$('#crumb');if(crumb){let name=$('#ui09CurrentName');if(!name){name=make('small','ui09-current-name');name.id='ui09CurrentName';crumb.after(name);}const value=auth()?.current()?.name||'';if(name.textContent!==value)name.textContent=value;crumb.parentElement.classList.add('ui09-page-heading');}
 const create=$('.top-actions [onclick*="openStandaloneTaskModal"]');if(create&&!create.dataset.ui09Compact){create.dataset.ui09Compact='1';create.textContent='+ مهمة جديدة';create.title='إنشاء مهمة جديدة';}
 const logout=$('#auth37LogoutBtn');if(logout&&!logout.dataset.ui09Compact){logout.dataset.ui09Compact='1';logout.title='تسجيل الخروج';logout.setAttribute('aria-label','تسجيل الخروج');logout.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 4H4v16h5M9 12h12m-4-4 4 4-4 4"/></svg>';}
 const back=$('#backBtn');if(back&&!back.dataset.ui09Back){back.dataset.ui09Back='1';back.textContent='→';back.title='الصفحة السابقة';back.setAttribute('aria-label',back.title);back.onclick=previous;}
}
// Remember actual navigation actions so returning restores the previous list/subpage.
let trail=[],restoring=false,lastNavigation=null;
function remember(action,key){if(restoring)return;if(lastNavigation?.key!==key){if(lastNavigation)trail.push(lastNavigation);lastNavigation={action,key};}}
const nativeGo=window.goApp;
if(typeof nativeGo==='function')window.goApp=function(app,link,...rest){const result=nativeGo.call(this,app,link,...rest);if(result!==false&&$('#'+app+'App')?.classList.contains('active'))remember(()=>window.goApp(app,null,false),'app:'+app);return result;};
function navigateSafely(action){if(typeof appIsDirty!=='undefined'&&appIsDirty&&window.MoshR14Polish)return MoshR14Polish.requestUnsavedExit(action);return action();}
function previous(bypass=false){if(bypass!==true&&typeof appIsDirty!=='undefined'&&appIsDirty&&window.MoshR14Polish)return MoshR14Polish.requestUnsavedExit(()=>previous(true));const close=$('.mw08-workspace .mw08-chrome [data-ui09-close]');if(close?.getClientRects().length){close.click();return;}const entry=trail.pop();restoring=true;try{if(entry){entry.action();lastNavigation=entry;}else window.goApp('dashboard',null,false);}finally{restoring=false;}}
remember(()=>window.goApp('dashboard',null,false),'app:dashboard');
window.MoshPrevious09=previous;

const departmentIds=new Set(['admin','hr','sales','marketing','social','design','photo','editing','promotion','it','logistics','purchases','accounting','warehouses','platform']);
let expanded='',trees=new Map();
function openDepartmentTaskView(app,action){
 const running=action==='running';
 if(app==='admin')return window.MoshAdministration24.openTasks(running?'running':'assign');
 if(!running)return window.MoshDepartmentDashboard.openAssignment(app);
 const open=running?window.openProductiveRunningTasksPage:window.openProductiveDistributionPage;
 open?.(app);
}
function treeRows(app){
 const rows=[{name:'لوحة القسم',action:'dashboard',run:()=>window.MoshDepartmentDashboard.openDashboard(app)}];
 if(auth()?.canModule(app,'running'))rows.push({name:'المهام الجارية',action:'running',run:()=>openDepartmentTaskView(app,'running')});
 if(auth()?.canModule(app,'assign'))rows.push({name:'توزيع المهام',action:'assign',run:()=>openDepartmentTaskView(app,'assign')});
 const v=$('#'+app+'App'),originals=[...(window.MoshGrouped35?.sources(app)||[]),...all('.menu-strip button,.menu-strip a',v||document).filter(n=>v?.contains(n))];const seen=new Set(rows.map(x=>x.name));for(const n of originals){const name=n.textContent.trim().replace(/\s+/g,' ');if(!name||seen.has(name)||n.classList.contains('mosh-auth-hidden')||n.hidden||n.disabled)continue;seen.add(name);rows.push({name,source:n,run:()=>{let target=n.isConnected?n:[...(window.MoshGrouped35?.sources(app)||[])].find(x=>x.textContent.trim().replace(/\s+/g,' ')===name);const mode=target?.id===app+'DistributionTab'?'dashboard':target?.id===app+'RunningTab'?'running':'';if(mode){if(!auth()?.canModule(app,mode))return false;return mode==='dashboard'?window.MoshDepartmentDashboard.openDashboard(app):openDepartmentTaskView(app,'running');}if(app==='sales'&&target?.closest('#mgr28Tab_sales'))target=$('#mgr32eApproval_sales')||target;if(target&&window.MoshGrouped35?.allowed(target))target.click();else toast('افتح لوحة القسم للوصول لهذا الإجراء.');}});}return rows;}
function salesTreeGroups(){
 const groups=new Map();
 for(const {name,rows} of window.MoshGrouped35?.groups('sales')||[]){
  for(const source of rows)groups.set(source.textContent.trim().replace(/\s+/g,' '),name);
 }
 return groups;
}
function salesMenuLabel(source){
 const copy=source.cloneNode(true);
 all('svg,.badge,.hr-count,.m15-count,.mgr28-badge,small',copy).forEach(n=>n.remove());
 return copy.textContent.trim().replace(/\s+/g,' ')
  .replace(/(اعتماد (?:مدير القسم|المدير(?: القسم)?))\s*[0٠۰]$/,'$1');
}
function setSalesGroupOpen(section,open){
 const opened=section.ui09SalesOpened,key=section.dataset.salesGroup;
 if(opened){if(open)opened.add(key);else for(const entry of [...opened])if(entry===key||entry.startsWith(key+'/'))opened.delete(entry);}
 section.open=open;
 $('summary',section)?.setAttribute('aria-expanded',String(open));
 const body=$('.ui09-sales-group-body',section);if(body)body.hidden=!open;
 if(!open)all('details[open]',section).forEach(child=>setSalesGroupOpen(child,false));
}
function salesDropdownId(source){
 return (source?.getAttribute?.('onclick')||'').match(/toggleDrop\(\s*['"]([^'"]+)['"]/)?.[1]||'';
}
function salesMenuSection(label,key,host,siblings,opened,name){
 const section=make('details','ui09-sales-group'),summary=make('summary','ui09-tree-leaf r35-ui-navigation',label),body=make('div','ui09-sales-group-body');
 section.dataset.salesAccordion=name;section.dataset.salesGroup=key;section.ui09SalesOpened=opened;
 section.append(summary,body);setSalesGroupOpen(section,opened.has(key));
 summary.onclick=e=>{e.preventDefault();const open=!section.open;if(open)for(const sibling of siblings.values())if(sibling!==section)setSalesGroupOpen(sibling,false);setSalesGroupOpen(section,open);};
 section.addEventListener('toggle',()=>{if(!section.isConnected)return;setSalesGroupOpen(section,opened.has(key));});
 host.append(section);return section;
}
function syncSalesMenuState(t){
 const opened=t.salesOpenGroups;if(!opened)return;
 for(const section of all('.ui09-sales-group',t.box))setSalesGroupOpen(section,opened.has(section.dataset.salesGroup));
 for(const button of all('button',t.box))if(button.dataset.salesPage===t.salesCurrentPage)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
}
function restoreSalesMenuPath(t,path,page){
 const opened=t.salesOpenGroups||(t.salesOpenGroups=new Set());opened.clear();path.forEach(key=>opened.add(key));
 t.salesCurrentPage=page;syncSalesMenuState(t);
}
// HR mirrors the existing department bar and its menus in the global sidebar.
// Original controls retain their handlers and remain the permission authority.
function openHRDepartmentDashboard(){const result=window.MoshHR13.go('home');window.MoshUI19?.tabState?.('hr','distribution');return result;}
function hrMenuLabel(source){
 if(!source)return '';
 const copy=source.cloneNode(true);
 all('svg,.badge,.hr-count,.m15-count,.mgr28-badge,small',copy).forEach(n=>n.remove());
 return copy.textContent.trim().replace(/\s+/g,' ').replace(/[⌄▾]\s*$/,'').trim()
  .replace(/^الطلبات والموافقات\s*[0-9٠-٩۰-۹]+$/,'الطلبات والموافقات');
}
function hrMenuAvailable(source){
 const host=source?.closest('.r23-manager-tools');
 return !!window.MoshGrouped35?.allowed(source)&&(!host||window.MoshGrouped35.allowed(host));
}
function hrSourceRow(source,scope,action){
 if(!hrMenuAvailable(source))return null;
 const name=hrMenuLabel(source),id=source.id;
 if(!name)return null;
 return {name,action,count:name==='الطلبات والموافقات'?'':$('.badge,.hr-count,.m15-count,.mgr28-badge',source)?.textContent.trim()||'',run:()=>{
  const target=(id&&document.getElementById(id))||all(scope).find(n=>hrMenuLabel(n)===name);
  if(hrMenuAvailable(target))target.click();else toast('لم يعد هذا الخيار متاحًا لهذا الحساب.');
 }};
}
function hrSidebarRows(){
 const rows=[];
 const add=(selector,action)=>{
  if(!auth()?.canModule('hr',action))return;
  const row=hrSourceRow($(selector),selector,action);
  if(!row)return;
  // The legacy distribution tab opens the task overview. HR's dashboard is
  // its home page, with employee, request and entitlement summaries.
  if(action==='dashboard')row.run=openHRDepartmentDashboard;
  rows.push(row);
 };
 add('#m15Tabs_hr > button[data-mode="distribution"]','dashboard');
 add('#m15Tabs_hr > button[data-mode="running"]','running');
 if(auth()?.canModule('hr','assign'))rows.push({name:'توزيع المهام',action:'assign',run:()=>openDepartmentTaskView('hr','assign')});
 add('#mgr32eApproval_hr','approvals');
 const tools=$('#r23ManagerTools_hr');
 if(window.MoshGrouped35?.allowed(tools)){
  const children=all('.r23-manager-tools-menu button',tools).map(n=>hrSourceRow(n,'#r23ManagerTools_hr .r23-manager-tools-menu button')).filter(Boolean);
  if(children.length)rows.push({name:hrMenuLabel($('.r23-manager-tools-toggle',tools)),children});
 }
 const children=(window.MoshGrouped35?.groups('hr')||[]).map(group=>({name:group.name,
  children:group.rows.map(n=>hrSourceRow(n,'#hrProNav button')).filter(Boolean)
 })).filter(group=>group.children.length);
 if(children.length)rows.push({name:hrMenuLabel($('#m15Tabs_hr .pv-menu-trigger'))||'قائمة القسم',children});
 return rows;
}
function refreshHRTree(t){
 const rows=hrSidebarRows();
 if(!rows.length)return;
 const describe=items=>items.map(row=>[row.name,row.action,row.count,row.children&&describe(row.children)]);
 const signature=JSON.stringify(describe(rows));
 if(signature===t.signature){
  for(const b of all('button',t.box))if(b.dataset.hrPage===t.currentKey)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  return;
 }
 t.signature=signature;
 const opened=new Set(all('details[open]',t.box).map(n=>n.dataset.hrGroup));
 t.box.replaceChildren();
 function render(items,parent,path){
  for(const row of items){
   const key=path+'/'+row.name;
   if(row.children){
    const section=make('details','ui09-hr-group'),summary=make('summary','ui09-tree-leaf r35-ui-navigation',row.name),body=make('div','ui09-hr-group-body');
    section.dataset.hrGroup=key;
    section.setAttribute('name','ui09-hr-menu:'+path);
    section.open=opened.has(key);
    summary.setAttribute('aria-expanded',String(section.open));
    section.addEventListener('toggle',()=>{
     summary.setAttribute('aria-expanded',String(section.open));
     if(section.open)for(const sibling of parent.children)if(sibling!==section&&sibling.tagName==='DETAILS')sibling.open=false;
    });
    section.append(summary,body);parent.append(section);render(row.children,body,key);continue;
   }
   const b=make('button','ui09-tree-leaf r35-ui-navigation');b.type='button';
   b.dataset.hrPage=key;
   b.append(make('span','',row.name));
   if(row.count&&Number(row.count)>0)b.append(make('span','ui09-tree-count',row.count));
   if(t.currentKey===key)b.setAttribute('aria-current','page');
   b.onclick=()=>navigateSafely(()=>{
    if(row.action&&!auth()?.canModule('hr',row.action))return;
    let result;restoring=true;
    try{result=window.goApp('hr',t.link);}finally{restoring=false;}
    if(result===false||!$('#hrApp')?.classList.contains('active'))return;
    row.run();t.currentKey=key;
    all('.ui09-tree-leaf').forEach(n=>n.removeAttribute('aria-current'));
    b.setAttribute('aria-current','page');
    remember(()=>{if(row.action&&!auth()?.canModule('hr',row.action))return;window.goApp('hr',t.link,false);row.run();t.currentKey=key;schedule();},'hr:'+key);
    schedule();
   });
   parent.append(b);
  }
 }
 render(rows,t.box,'hr');
}
// Mirror the department header without moving or replacing its controls.
function departmentHeaderRows(app){
 const bar=$('#m15Tabs_'+app),view=$('#'+app+'App');if(!bar)return treeRows(app).filter(row=>!row.action||auth()?.canModule(app,row.action)).map(row=>({...row,key:row.action||row.name}));
 const sourceRow=(source,scope,action)=>{
  if((action&&!auth()?.canModule(app,action))||!hrMenuAvailable(source))return null;
  const name=hrMenuLabel(source);if(!name)return null;
  const resolve=()=>{const candidates=typeof scope==='function'?scope():all(scope);return (source.id&&document.getElementById(source.id))||candidates.find(node=>hrMenuLabel(node)===name);};
  const available=()=>hrMenuAvailable(resolve());
  return {key:source.id||source.dataset.mode||name,name:name.replace(/^[▦◉◇☷✎↻✓\s]+/,'').trim(),action,
   count:$('.badge,.hr-count,.m15-count,.mgr28-badge',source)?.textContent.trim()||'',available,
   run:()=>{const target=resolve();if(!hrMenuAvailable(target))return false;target.click();}};
 };
 const rows=[],represented=new Set(),header=[...bar.children].sort((a,b)=>Number(getComputedStyle(a).order)-Number(getComputedStyle(b).order));
 const add=row=>{if(row){rows.push(row);represented.add(row.key);}};
 for(const node of header){
  if(node.classList.contains('r23-manager-tools')){
   if(!window.MoshGrouped35?.allowed(node))continue;
   const children=all('.r23-manager-tools-menu button',node).map(source=>sourceRow(source,'#r23ManagerTools_'+app+' .r23-manager-tools-menu button')).filter(Boolean);
   if(children.length)add({key:'manager-tools',name:hrMenuLabel($('.r23-manager-tools-toggle',node)),children});
   continue;
  }
  if(node.classList.contains('pv-menu-host')){
   if(!window.MoshGrouped35?.allowed(node))continue;
   const children=(window.MoshGrouped35?.groups(app)||[]).map(group=>({key:group.name,name:group.name,
    children:group.rows.map(source=>sourceRow(source,()=>window.MoshGrouped35?.sources(app)||[])).filter(Boolean)
   })).filter(group=>group.children.length);
   if(children.length)add({key:'department-menu',name:hrMenuLabel($('.pv-menu-trigger',node)),children});
   continue;
  }
  const source=node.matches('button,a')?node:$(':scope > button,:scope > a',node);if(!source)continue;
  const action=source.dataset.mode==='distribution'?'dashboard':source.dataset.mode==='running'?'running':source.id==='mgr32eApproval_'+app?'approvals':'';
  add(sourceRow(source,'#m15Tabs_'+app+' button,#m15Tabs_'+app+' a',action));
  if(action==='running'&&auth()?.canModule(app,'assign'))add({key:'assign',name:'توزيع المهام',action:'assign',run:()=>openDepartmentTaskView(app,'assign')});
 }
 // Some departments also retain native header links, reports or dropdowns.
 // Inspect ancestors only up to the department, since it may not be active yet.
 const visible=source=>{for(let node=source;node&&node!==view;node=node.parentElement){const style=getComputedStyle(node);if(node.hidden||node.classList.contains('mosh-auth-hidden')||style.display==='none'||style.visibility==='hidden')return false;}return true;};
 for(const source of all('.menu-strip button,.menu-strip a',view)){
  if(!visible(source)||source.closest('.dropdown')||source.closest('.r23-manager-tools')||bar.contains(source)||[app+'DistributionTab',app+'RunningTab','mgr28Tab_'+app].includes(source.id))continue;
  const row=sourceRow(source,()=>all('.menu-strip button,.menu-strip a',view));if(!row||represented.has(row.key))continue;
  const drop=salesDropdownId(source);
  if(drop){row.children=all('button,a',document.getElementById(drop)).map(child=>sourceRow(child,'#'+drop+' button,#'+drop+' a')).filter(Boolean);if(!row.children.length)continue;}
  add(row);
 }
 return rows;
}
function refreshDepartmentHeaderTree(app,t){
 t.box.classList.add('ui09-header-tree');
 const rows=departmentHeaderRows(app),opened=t.headerOpenKeys||(t.headerOpenKeys=new Set());
 function setOpen(section,value){
  const key=section.dataset.headerGroup;
  if(value)opened.add(key);else for(const entry of [...opened])if(entry===key||entry.startsWith(key+'/'))opened.delete(entry);
  section.open=value;$('summary',section)?.setAttribute('aria-expanded',String(value));
  const body=$('.ui09-header-group-body',section);if(body)body.hidden=!value;
  if(!value)all('.ui09-header-group',section).forEach(child=>setOpen(child,false));
 }
 function sync(){
  for(const section of all('.ui09-header-group',t.box))setOpen(section,opened.has(section.dataset.headerGroup));
  for(const button of all('button',t.box))if(button.dataset.headerPage===t.headerCurrentKey)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
 const describe=items=>items.map(row=>[row.key,row.name,row.action,row.count,row.children&&describe(row.children)]);
 const signature=JSON.stringify(describe(rows));if(signature===t.signature){sync();return;}
 t.signature=signature;t.box.replaceChildren();
 function render(items,parent,path,ancestors){
  const siblings=[];
  for(const row of items){
   const key=path+'/'+row.key;
   if(row.children){
    const section=make('details','ui09-header-group'),summary=make('summary','ui09-tree-leaf r35-ui-navigation',row.name),body=make('div','ui09-header-group-body');
    section.dataset.headerGroup=key;section.append(summary,body);setOpen(section,opened.has(key));
    summary.onclick=event=>{event.preventDefault();const value=!section.open;if(value)for(const sibling of siblings)if(sibling!==section)setOpen(sibling,false);setOpen(section,value);};
    section.addEventListener('toggle',()=>{if(section.isConnected)setOpen(section,opened.has(key));});
    siblings.push(section);parent.append(section);render(row.children,body,key,[...ancestors,key]);continue;
   }
   const button=make('button','ui09-tree-leaf r35-ui-navigation');button.type='button';button.dataset.headerPage=key;
   button.append(make('span','',row.name));if(Number(row.count)>0)button.append(make('span','ui09-tree-count',row.count));
   if(t.headerCurrentKey===key)button.setAttribute('aria-current','page');
   const activate=()=>{
    if(!auth()?.canModule(app,'view')||(row.action&&!auth()?.canModule(app,row.action))||(row.available&&!row.available()))return false;
    let result;restoring=true;try{result=window.goApp(app,t.link);}finally{restoring=false;}
    if(result===false||!$('#'+app+'App')?.classList.contains('active'))return false;
    if(row.run()===false)return false;
    opened.clear();ancestors.forEach(entry=>opened.add(entry));t.headerCurrentKey=key;sync();return true;
   };
   button.onclick=()=>navigateSafely(()=>{if(!activate())return;remember(activate,key);schedule();});parent.append(button);
  }
 }
 render(rows,t.box,app,[]);
}
function marketingSidebarRows(){return departmentHeaderRows('marketing');}
function refreshMarketingTree(t){return refreshDepartmentHeaderTree('marketing',t);}

function refreshTree(app){
 const t=trees.get(app);if(!t)return;
 const headerTree=['marketing','social','design','photo','editing','promotion','it','logistics','purchases','accounting','platform'].includes(app);
 const allowed=auth()?.canModule(app,'view');
 t.box.hidden=!allowed||expanded!==app;
 t.link.setAttribute('aria-expanded',String(!t.box.hidden));
 if(t.box.hidden){if(app==='sales')all('.ui09-sales-group',t.box).forEach(section=>setSalesGroupOpen(section,false));if(headerTree)t.headerOpenKeys?.clear();return;}
 if(app==='hr'){refreshHRTree(t);return;}
 if(headerTree){refreshDepartmentHeaderTree(app,t);return;}
 const groups=app==='sales'?salesTreeGroups():null;
 const rows=treeRows(app).filter(row=>!row.action||auth()?.canModule(app,row.action));
 const groupFor=row=>groups&&!row.action?(groups.get(row.name)||'خيارات المبيعات'):'';
 const dropdownRows=new Map(app==='sales'?rows.filter(row=>salesDropdownId(row.source)).map(row=>[salesDropdownId(row.source),row]):[]);
 const dropdownFor=row=>app==='sales'?(salesDropdownId(row.source)||row.source?.closest('.dropdown')?.id||''):'';
 const sig=JSON.stringify(rows.map(row=>[row.name,groupFor(row),dropdownFor(row)]));
 const opened=app==='sales'?(t.salesOpenGroups||(t.salesOpenGroups=new Set(all('details[open]',t.box).map(section=>section.dataset.salesGroup)))):new Set(all('details[open]',t.box).map(section=>section.dataset.salesGroup));
 if(sig===t.signature){if(app==='sales')syncSalesMenuState(t);return;}
 t.signature=sig;
 t.box.replaceChildren();
 const sections=new Map();
 const submenus=new Map(),submenuSiblings=new Map();
 for(const row of rows){
  const label=app==='sales'&&row.source?salesMenuLabel(row.source):app==='hr'&&/^الطلبات والموافقات\s*[0-9٠-٩۰-۹]+$/.test(row.name)
   ?'الطلبات والموافقات':row.name;
  const b=make('button','ui09-tree-leaf r35-ui-navigation',label);
  if(app==='sales'){b.dataset.salesPage=row.source?.id||row.source?.getAttribute?.('onclick')||row.name;if(b.dataset.salesPage===t.salesCurrentPage)b.setAttribute('aria-current','page');}
  if(app==='sales'&&row.source){const badge=$('.badge,.hr-count,.m15-count,.mgr28-badge',row.source),count=badge?.textContent.trim();if(badge&&!badge.hidden&&Number(count)>0)b.append(make('span','ui09-tree-count',count));}
  b.type='button';
  b.onclick=()=>navigateSafely(()=>{
   // Capture stable group keys before routing can replace this button or its parents.
   const salesPath=app==='sales'?all('.ui09-sales-group',t.box).filter(section=>section.contains(b)).map(section=>section.dataset.salesGroup):null;
   let result;restoring=true;
   try{result=window.goApp(app,t.link);}finally{restoring=false;}
   if(result===false||!$('#'+app+'App')?.classList.contains('active'))return;
   row.run();
   remember(()=>{window.goApp(app,t.link,false);row.run();if(salesPath)restoreSalesMenuPath(t,salesPath,b.dataset.salesPage);},app+':'+row.name);
   all('.ui09-tree-leaf').forEach(x=>x.removeAttribute('aria-current'));
   b.setAttribute('aria-current','page');
   if(salesPath)restoreSalesMenuPath(t,salesPath,b.dataset.salesPage);
   schedule();
  });
  const group=groupFor(row);
  if(!group){t.box.append(b);continue;}
  if(!sections.has(group)){
   sections.set(group,salesMenuSection(group,group,t.box,sections,opened,'ui09-sales-menu'));
  }
  let host=$('.ui09-sales-group-body',sections.get(group));
  const dropdown=dropdownFor(row),triggerRow=dropdownRows.get(dropdown);
  if(dropdown&&triggerRow){
   const key=group+'/'+dropdown;
   if(!submenus.has(key)){
    if(!submenuSiblings.has(group))submenuSiblings.set(group,new Map());
    const siblings=submenuSiblings.get(group),title=salesMenuLabel(triggerRow.source).replace(/[▾⌄]\s*$/,'').trim();
    const section=salesMenuSection(title,key,host,siblings,opened,'ui09-sales-submenu:'+group);
    submenus.set(key,section);siblings.set(key,section);
   }
   if(salesDropdownId(row.source))continue;
   host=$('.ui09-sales-group-body',submenus.get(key));
  }
  host.append(b);
 }
}
function sidebar(){for(const link of all('#appSidebar .nav a[onclick]')){const app=link.getAttribute('onclick')?.match(/goApp\(['"]([^'"]+)/)?.[1];if(!departmentIds.has(app)||trees.has(app))continue;const box=make('div','ui09-tree-children');box.id='ui09-tree-'+app;box.hidden=true;link.after(box);link.classList.add('ui09-tree-parent');link.setAttribute('aria-controls',box.id);link.setAttribute('aria-expanded','false');link.onclick=e=>{e.preventDefault();if(!auth()?.canModule(app,'view'))return;expanded=expanded===app?'':app;for(const key of trees.keys())refreshTree(key);};const arrow=make('span','ui09-tree-arrow','‹');arrow.setAttribute('aria-hidden','true');link.append(arrow);trees.set(app,{link,box,signature:''});}if(expanded)refreshTree(expanded);}

async function lifecycle(p,action){const archive=action==='archive';if(!await MoshConfirm09(archive?'أرشفة '+p.name+' وإيقاف حسابه؟ سيبقى تاريخ المهام والدوام والمستندات محفوظاً.':'استعادة '+p.name+' إلى دليل الموظفين بحالة غير نشط؟ تفعيل الملف والحساب يتم بصورة مستقلة.'))return;try{await MoshApi.flush();const result=await MoshApi.request('/hr/employee-lifecycle',{method:'POST',body:{employeeId:String(p.id),action,_version:p._version,requestId:uid()}});MoshApi.acceptServerChanges(result.changes,MoshApi.user.id);if(archive&&MoshApi.auth?.users)MoshApi.auth.users.forEach(u=>{if(String(u.employeeId)===String(p.id))u.active=false;});hrStaffFormOpen=false;hrStaffEditingId='';if(window.MoshHR13)MoshHR13.go('employees');else window.renderStaffWorkflowConfig?.();toast(archive?'تمت الأرشفة وحُفظ التاريخ.':'تمت الاستعادة بحالة غير نشط.');return true;}catch(e){toast(e.message);return false;}}
window.deleteStaffProfile=id=>{const p=state.staffProfiles.find(x=>String(x.id)===String(id));return p?lifecycle(p,'archive'):false;};
window.MoshEmployees09={archive:window.deleteStaffProfile};
async function archived(){try{const items=await MoshApi.request('/hr/archived-employees');const esc=window.MoshUI19.esc;const d=MoshUI19.dialog('ui09Archived','الموظفون المؤرشفون',`<p>التاريخ محفوظ. الاستعادة لا تعيد تفعيل الحساب تلقائياً.</p><div class="ui09-archive-list">${items.map((p,i)=>`<article><b>${esc(p.name)}</b><span>${esc(p.department||'')}</span><button class="btn" data-history="${i}">عرض التاريخ</button>${auth().canModule('hr','delete')?`<button class="btn" data-restore="${i}">استعادة</button>`:''}</article>`).join('')||'<p>لا يوجد موظفون مؤرشفون.</p>'}</div>`);all('[data-history]',d).forEach(b=>b.onclick=()=>MoshR29.openHR(String(items[Number(b.dataset.history)].id)));all('[data-restore]',d).forEach(b=>b.onclick=async()=>{b.disabled=true;if(await lifecycle(items[Number(b.dataset.restore)],'restore')){MoshUI19.close('ui09Archived');await archived();}else b.disabled=false;});}catch(e){toast(e.message);}}
function attendanceControls(){const exempt=$('#staffZktecoExempt');if(!exempt||$('#staffAttendanceMode'))return;const p=typeof hrStaffEditingId!=='undefined'?state.staffProfiles.find(x=>String(x.id)===String(hrStaffEditingId)):null;const box=make('div','field-grid');box.innerHTML='<div class="field"><label for="staffAttendanceMode">نظام الدوام</label><select id="staffAttendanceMode"><option value="fingerprint">بصمة</option><option value="flexible">مرن معفى من البصمة</option><option value="daily">يومي معفى من البصمة</option></select></div><div class="field"><label for="staffWorkdayHours">ساعات يوم العمل</label><input id="staffWorkdayHours" type="number" min="0.1" max="24" step="0.5"></div>';exempt.closest('.field-grid').after(box);const mode=$('#staffAttendanceMode'),hours=$('#staffWorkdayHours');mode.value=p?.attendanceMode||(exempt.value==='1'?'daily':'fingerprint');hours.value=p?.workdayHours||8;mode.onchange=()=>{exempt.value=mode.value==='fingerprint'?'0':'1';};exempt.addEventListener('change',()=>mode.value=exempt.value==='1'?'daily':'fingerprint');}
function archiveControls(){for(const b of all('[onclick*="deleteStaffProfile("]')){if(b.dataset.ui09Archive)continue;b.dataset.ui09Archive='1';b.textContent='أرشفة';b.title='أرشفة الموظف مع حفظ تاريخه';}for(const b of all('[data-m14="employee-remove"]')){b.textContent='أرشفة';b.disabled=!auth()?.canModule('hr','delete');}const host=$('#h13EmployeesBody')||$('#staffWorkflowConfig');if(host&&auth()?.canModule('hr','details')&&!$('#ui09ArchivedButton',host)){const b=make('button','btn r35-ui-navigation','الموظفون المؤرشفون');b.id='ui09ArchivedButton';b.type='button';b.onclick=archived;host.prepend(b);}}
const oldSave=window.saveStaffProfile;if(typeof oldSave==='function')window.saveStaffProfile=async function(...args){const status=$('#staffEmploymentStatus')?.value;const rules=[['staffName','اسم الموظف مطلوب.']];if(status!=='draft')rules.push(['staffDepartment','اختر القسم.']);if(status==='active')rules.push(['staffJobTitle','أدخل المسمى الوظيفي.'],['staffHireDate','حدد تاريخ التعيين.']);const errors=rules.filter(([id])=>document.getElementById(id)&&!document.getElementById(id).value.trim()).map(([id,m])=>[document.getElementById(id),m]);if(status==='active'){const mode=$('#staffAttendanceMode')?.value,number=$('#staffZktecoEnrollmentNumber'),hours=$('#staffWorkdayHours');if(mode==='fingerprint'&&!number?.value.trim())errors.push([number,'أدخل رقم البصمة أو اختر نظام دوام معفى.']);if(mode&&mode!=='fingerprint'&&number?.value.trim())errors.push([number,'امسح رقم البصمة لاستخدام نظام دوام معفى.']);if(mode!=='daily'&&hours&&(!(Number(hours.value)>0)||Number(hours.value)>24))errors.push([hours,'أدخل عدد ساعات أكبر من صفر وحتى 24.']);}if(!report(errors))return false;return oldSave.apply(this,args);};

const oldStandaloneSave=window.saveStandaloneTask;
if(typeof oldStandaloneSave==='function')window.saveStandaloneTask=function(...args){const errors=[],title=$('#standaloneTaskTitle'),customer=$('#standaloneTaskCustomer'),person=$('#standaloneTaskAssignee'),dept=$('#standaloneTaskDepartment')?.value,mode=$('#standaloneTaskAssignmentMode')?.value;
 if(!title?.value.trim())errors.push([title,'اكتب اسم المهمة.']);
 if(!customer?.value.trim())errors.push([customer,'اختر العميل.']);else if(!getCatalogCustomerByName(customer.value))errors.push([customer,'اختر عميلاً مسجلاً من القائمة، أو أضفه أولاً.']);
 if(dept!=='المهمات'&&(dept==='الإدارة'||mode==='direct')){const p=getStaffProfileByName(person?.value||'');if(!p?.id)errors.push([person,'اختر موظفاً مسجلاً في الموارد البشرية.']);else if(!isStaffAssignable(p))errors.push([person,'اختر موظفاً نشطاً.']);}
 if(!report(errors))return false;return oldStandaloneSave.apply(this,args);};
let frame=0;function decorate(){frame=0;if(!auth()?.current())return;passwordEyes();closeIcons();header();sidebar();attendanceControls();archiveControls();}function schedule(){if(!frame)frame=requestAnimationFrame(decorate);}
new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1)))schedule();}).observe(document.body,{childList:true,subtree:true});
for(const ev of ['mosh:ui-ready','mosh:section-enter','mosh:refreshed','mosh:permissions-applied'])document.addEventListener(ev,schedule);
for(const ev of ['mosh:logout-complete','mosh:session-expired'])document.addEventListener(ev,()=>{trail=[];lastNavigation=null;expanded='';for(const t of trees.values()){t.box.hidden=true;t.signature='';}all('.ui09-password input').forEach(f=>f.type='password');});
schedule();
})();
