const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../js/30-mosh-manager-approvals-v28-js.js'),'utf8');
function setup(key='marketing',department='التسويق'){
 const task={id:'TASK/1',title:'إعداد النصوص',customer:'الياسمين',department,status:'in_progress',employeeState:'submitted',assignmentMode:'direct',assignee:'الموظف'};
 const perms={view:true,details:true,approve:true};let actor='المدير',subs=[],events=[],nodes=new Map(),nativeCount=0;
 const native={id:'managerFinishBtn_TASK/1',hidden:false,disabled:false,style:{},classList:{contains:()=>false},closest:()=>null,click:()=>{nativeCount++;}};
 const card={querySelector:()=>native},title={id:'taskEditTitle_TASK/1',closest:()=>card};
 const box={querySelectorAll:()=>[native,title]};nodes.set('workspace',box);
 const context={state:{salesTasks:[task],staffProfiles:[],hrProRequests:[],departmentManagers:{}},getProductiveConfig:()=>({workspaceId:'workspace'}),getCurrentRole:()=>null,currentUserDisplayName:()=>actor,getDepartmentManager:()=>({id:'M',name:'المدير'}),getSubTasks:()=>subs,goApp:key=>events.push('go:'+key),document:{readyState:'loading',documentElement:{},body:{appendChild:n=>nodes.set(n.id,n)},querySelectorAll:()=>[],querySelector:()=>null,getElementById:id=>nodes.get(id)||null,createElement:()=>({classList:{add(){}},addEventListener(){},remove(){nodes.delete(this.id);}}),addEventListener(){}},setTimeout(){},setInterval(){},clearTimeout(){},MutationObserver:class{observe(){}},console};
 context.window={MoshAuth37:{current:()=>({id:'U'}),canModule:(app,action)=>app===key&&perms[action]},MoshTaskUI:{title:t=>t.title},openProductiveRunningTasksPage:key=>events.push('running:'+key),openProductiveTaskDetails:(key,id,mode)=>events.push('details:'+id)};context.MoshTaskUI=context.window.MoshTaskUI;
 vm.createContext(context);vm.runInContext(code,context);return {task,perms,context,native,nodes,events,api:context.window.MoshManagerApprovals28,setActor:v=>actor=v,setSubs:v=>subs=v,count:()=>nativeCount};
}
test('manager queue displays task decisions at the beginning of the task card',()=>{
 const f=setup();f.api.open('marketing');const html=f.nodes.get('mgr28Modal').innerHTML;assert.match(html,/mgr28-task-review-item/);assert.match(html,/اعتماد وإنهاء للفوترة/);assert.match(html,/مراجعة تفاصيل المهمة/);assert.match(html,/إعادة للتعديل/);assert.ok(html.indexOf('mgr28-task-review-actions')<html.indexOf('إعداد النصوص'));assert.doesNotMatch(html,/فتح مهام جارية/);
});
test('approval opens the exact selected task and delegates to its native confirmation button',()=>{
 const f=setup();assert.equal(f.api.reviewTask('marketing',f.task.id,'approve'),true);assert.deepEqual(f.events,['go:marketing','running:marketing','details:TASK/1']);assert.equal(f.count(),1);assert.equal(f.task.employeeState,'submitted');assert.equal(f.task.status,'in_progress');
});
test('details opens the task without approving it',()=>{const f=setup();assert.equal(f.api.reviewTask('marketing',f.task.id),true);assert.equal(f.count(),0);});
test('stale or transferred tasks cannot be approved from a stale queue card',()=>{
 const f=setup();f.task.status='completed';assert.equal(f.api.reviewTask('marketing',f.task.id,'approve'),false);f.task.status='in_progress';f.task.department='التصميم';assert.equal(f.api.reviewTask('marketing',f.task.id,'approve'),false);assert.equal(f.count(),0);assert.deepEqual(f.events,[]);
});
test('non-manager and revoked action permission cannot trigger approval',()=>{
 const f=setup();f.setActor('موظف آخر');assert.equal(f.api.reviewTask('marketing',f.task.id,'approve'),false);f.setActor('المدير');
 for(const key of ['view','details','approve']){f.perms[key]=false;assert.equal(f.api.reviewTask('marketing',f.task.id,'approve'),false);f.perms[key]=true;}assert.equal(f.count(),0);
});
test('self-execution tasks retain approval but do not gain a new return action',()=>{
 const f=setup();f.task.assignmentMode='manager_self';f.api.open('marketing');const html=f.nodes.get('mgr28Modal').innerHTML;assert.match(html,/اعتماد وإنهاء للفوترة/);assert.doesNotMatch(html,/إعادة للتعديل/);assert.equal(f.api.reviewTask('marketing',f.task.id,'return'),false);
});
test('package parent cannot gain direct invoice approval through the queue',()=>{
 const f=setup();f.setSubs([{id:'child1'},{id:'child2'}]);f.api.open('marketing');assert.doesNotMatch(f.nodes.get('mgr28Modal').innerHTML,/اعتماد وإنهاء للفوترة/);
});
test('disabled or permission-hidden native decisions are never clicked',()=>{
 const f=setup();f.native.disabled=true;assert.equal(f.api.reviewTask('marketing',f.task.id,'approve'),false);f.native.disabled=false;f.native.style.display='none';assert.equal(f.api.reviewTask('marketing',f.task.id,'approve'),false);assert.equal(f.count(),0);
});
test('pending manager status before submission only offers task details',()=>{
 const f=setup();f.task.employeeState='working';f.task.managerApprovalStatus='pending';f.api.open('marketing');const html=f.nodes.get('mgr28Modal').innerHTML;assert.match(html,/مراجعة تفاصيل المهمة/);assert.doesNotMatch(html,/اعتماد وإنهاء للفوترة/);assert.equal(f.api.reviewTask('marketing',f.task.id,'approve'),false);
});

// Match the real sidebar department inventory, including the dynamically installed warehouse shell.
const sidebar=fs.readFileSync(path.join(__dirname,'../js/ui09-interface.js'),'utf8');
const departmentKeys=vm.runInNewContext(sidebar.match(/const departmentIds=new Set\((\[[^;]+?\])\)/)[1]);
function registry(file){
 const text=fs.readFileSync(path.join(__dirname,'../js/'+file),'utf8');
 const start=text.indexOf('const DEPTS='),end=text.indexOf('];',start)+2;
 return vm.runInNewContext(text.slice(start,end)+';DEPTS');
}
const managerDepartments=registry('30-mosh-manager-approvals-v28-js.js');
test('every existing sidebar department has a manager queue and a header approval entry',()=>{
 const inlineDepartments=registry('39-mosh-v32e-manager-inline-js.js');
 assert.deepEqual(Array.from(managerDepartments,d=>d.key).sort(),Array.from(departmentKeys).sort());
 assert.deepEqual(Array.from(inlineDepartments,d=>d.key).sort(),Array.from(departmentKeys).sort());
});
for(const {key,label} of managerDepartments){
 test(key+': top review actions route only the selected department task through its native approval',()=>{
  const f=setup(key,label);f.api.open(key);let html=f.nodes.get('mgr28Modal')?.innerHTML||'';
  assert.match(html,/mgr28-task-review-actions/);assert.match(html,/اعتماد وإنهاء للفوترة/);assert.match(html,/مراجعة تفاصيل المهمة/);assert.match(html,/إعادة للتعديل/);
  assert.ok(html.indexOf('mgr28-task-review-actions')<html.indexOf(f.task.title));
  assert.equal(f.api.reviewTask(key,f.task.id,'approve'),true);
  assert.deepEqual(f.events,['go:'+key,'running:'+key,'details:'+f.task.id]);assert.equal(f.count(),1);
  assert.equal(f.task.status,'in_progress');assert.equal(f.task.employeeState,'submitted');
  f.perms.approve=false;f.api.open(key);html=f.nodes.get('mgr28Modal').innerHTML;
  assert.doesNotMatch(html,/اعتماد وإنهاء للفوترة|إعادة للتعديل/);assert.equal(f.api.reviewTask(key,f.task.id,'approve'),false);assert.equal(f.count(),1);
  f.perms.approve=true;f.setActor('موظف آخر');assert.equal(f.api.reviewTask(key,f.task.id,'approve'),false);
  f.setActor('المدير');f.task.department=label==='التسويق'?'التصميم':'التسويق';assert.equal(f.api.reviewTask(key,f.task.id,'approve'),false);assert.equal(f.count(),1);
 });
}
