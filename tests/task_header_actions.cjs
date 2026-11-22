const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/task-workspace-08.js'),'utf8');
class Element{
 constructor(){this.children=[];this.dataset={};this.attrs={};this.hidden=false;this.disabled=false;this.isConnected=true;this.style={};this.textContent='';this.parentElement=null;this.classes=new Set();this.classList={contains:x=>this.classes.has(x),add:x=>this.classes.add(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};this.listeners={};}
 set className(v){this.classes=new Set(v.split(' '));}get className(){return [...this.classes].join(' ');}
 getAttribute(k){return this.attrs[k]??null;}setAttribute(k,v){this.attrs[k]=String(v);}
 addEventListener(k,f){this.listeners[k]=f;}click(){this.listeners.click?.();}
 append(n){if(n.parentElement)n.remove();this.children.push(n);n.parentElement=this;}
 insertBefore(n,b){if(n===b)return;if(n.parentElement)n.remove();const i=this.children.indexOf(b);this.children.splice(i<0?this.children.length:i,0,n);n.parentElement=this;}
 remove(){if(this.parentElement){const p=this.parentElement;p.children.splice(p.children.indexOf(this),1);this.parentElement=null;}}
 querySelectorAll(){return this.sources||[];}
 closest(s){if(s==='.mw08-workspace')return this.workspace;if(s==='.emp48-workflow')return this.workflow;return null;}
}
function fixture(employeeState='new'){
 const t={id:'TASK/1',department:'التسويق',status:'in_progress',employeeState,assignee:'أحمد'};
 const permissions={view:true,details:true,status:true,approve:true};let mine=true,busy=false,groupOverride='',clicks=[];
 const r={id:t.id,root:new Element(),card:new Element(),execution:new Element(),workflowActions:new Element()};r.card.sources=[];r.execution.sources=[];
 const context={state:{salesTasks:[t]},PRODUCTIVE_DEPARTMENTS:{marketing:{department:'التسويق'}},document:{body:{},createElement:()=>new Element(),querySelectorAll:()=>[],addEventListener(){}},MutationObserver:class{observe(){}},requestAnimationFrame:()=>1};
 context.window={MoshAuth37:{current:()=>({id:'USR/1'}),canModule:(app,k)=>app==='marketing'&&permissions[k]},MoshEmployeeTasks41:{isMine:()=>mine},MoshTaskInbox49:{isBusy:()=>busy},MoshReceiptModel49:{category:()=>groupOverride||({new:'new',received:'active',working:'active',paused:'active',submitted:'review'})[t.employeeState],label:()=>''}};
 vm.createContext(context);vm.runInContext(source.replace('window.MoshTaskWorkspace08={','window.testWorkflow={workflowActions,syncWorkflowActions};window.MoshTaskWorkspace08={'),context);
 const api=context.window.testWorkflow;
 function native(handler,kind,id=t.id,overlay=false){const b=new Element();b.workspace=r.root;b.textContent=handler;b.listeners.click=()=>clicks.push(handler);if(overlay){b.dataset.emp48Action=kind;b.workflow={dataset:{taskId:id}};r.execution.sources.push(b);}else{b.attrs.onclick=handler+'('+JSON.stringify(id)+',"content","التسويق")';r.card.sources.push(b);}return b;}
 return {t,r,permissions,context,api,native,clicks,kinds:()=>Array.from(api.workflowActions(r),x=>x.kind),setMine:v=>mine=v,setBusy:v=>busy=v,setGroup:v=>groupOverride=v};
}
test('shows receive, then start, then finish/pause according to the current task state',()=>{
 const f=fixture();f.native('employeeReceiveTask');f.native('employeeStartTask');f.native('employeeSubmitTask');f.native('employeePauseTask');
 assert.deepEqual(f.kinds(),['receive']);f.t.employeeState='received';assert.deepEqual(f.kinds(),['start']);f.t.employeeState='working';assert.deepEqual(f.kinds(),['finish','pause']);f.t.employeeState='paused';assert.deepEqual(f.kinds(),['start','finish']);
});
test('review actions appear only after submission and retain original approval label',()=>{
 const f=fixture('working');const approval=f.native('managerFinishAndInvoice');approval.textContent='اعتماد وإنهاء للفوترة';f.native('managerReturnTask');assert.deepEqual(f.kinds(),[]);
 f.t.employeeState='submitted';assert.deepEqual(f.kinds(),['approve','return']);assert.equal(f.api.workflowActions(f.r)[0].label,'اعتماد وإنهاء للفوترة');f.permissions.approve=false;assert.deepEqual(f.kinds(),[]);
});
test('execution remains limited to the assignee with view, details and status permission',()=>{
 const f=fixture();f.native('employeeReceiveTask');f.setMine(false);assert.deepEqual(f.kinds(),[]);f.setMine(true);
 for(const key of ['view','details','status']){f.permissions[key]=false;assert.deepEqual(f.kinds(),[]);f.permissions[key]=true;}
});
test('ignores hidden controls, child workspaces and buttons belonging to a different task',()=>{
 const f=fixture();const hidden=f.native('employeeReceiveTask');hidden.parentElement=new Element();hidden.parentElement.hidden=true;
 const child=f.native('employeeReceiveTask');child.workspace=new Element();f.native('employeeReceiveTask',null,'TASK/2');assert.deepEqual(f.kinds(),[]);
});
test('overlay controls keep their delegated handlers and do not duplicate manager controls',()=>{
 const f=fixture();const original=f.native('overlay receive','receive',f.t.id,true);f.native('employeeReceiveTask');assert.deepEqual(f.kinds(),['receive']);f.api.syncWorkflowActions(f.r);f.r.workflowButtons.get('receive').click();assert.deepEqual(f.clicks,['overlay receive']);assert.equal(original.parentElement,null);
});
test('overlay actions cannot execute an unrelated parent task',()=>{
 const f=fixture();f.native('overlay receive','receive','PARENT',true);assert.deepEqual(f.kinds(),[]);
});
test('top proxy re-resolves the source after rerender and blocks stale state or revoked permission',()=>{
 const f=fixture();f.native('employeeReceiveTask');f.api.syncWorkflowActions(f.r);const proxy=f.r.workflowButtons.get('receive');f.r.card.sources=[];const fresh=f.native('employeeReceiveTask');fresh.listeners.click=()=>f.clicks.push('fresh');proxy.click();assert.deepEqual(f.clicks,['fresh']);
 f.permissions.status=false;proxy.click();assert.deepEqual(f.clicks,['fresh']);assert.equal(f.r.workflowButtons.size,0);
 f.permissions.status=true;f.t.employeeState='submitted';proxy.click();assert.deepEqual(f.clicks,['fresh']);
});
test('busy and disabled native controls cannot be triggered from the header',()=>{
 const f=fixture();const b=f.native('employeeReceiveTask');f.setBusy(true);f.api.syncWorkflowActions(f.r);const proxy=f.r.workflowButtons.get('receive');assert.equal(proxy.disabled,true);proxy.click();assert.deepEqual(f.clicks,[]);
 f.setBusy(false);b.disabled=true;proxy.click();assert.deepEqual(f.clicks,[]);b.disabled=false;f.api.syncWorkflowActions(f.r);assert.equal(proxy.disabled,false);proxy.click();assert.deepEqual(f.clicks,['employeeReceiveTask']);
});
test('completed tasks have no top workflow action; returned tasks require receiving again',()=>{
 const f=fixture('paused');f.native('employeeReceiveTask');f.native('employeeStartTask');f.native('employeeSubmitTask');f.setGroup('new');assert.deepEqual(f.kinds(),['receive']);f.t.status='completed';assert.deepEqual(f.kinds(),[]);
});
test('header buttons update in place and disappear when no longer relevant',()=>{
 const f=fixture('working');f.native('employeePauseTask');f.native('employeeSubmitTask');f.api.syncWorkflowActions(f.r);const finish=f.r.workflowButtons.get('finish');assert.equal(f.r.workflowActions.children[0],finish);f.api.syncWorkflowActions(f.r);assert.equal(f.r.workflowButtons.get('finish'),finish);assert.equal(f.r.workflowActions.children.length,2);
 f.t.employeeState='submitted';f.api.syncWorkflowActions(f.r);assert.equal(f.r.workflowActions.hidden,true);assert.equal(f.r.workflowActions.children.length,0);
});

test('actual native approval markup prefixed with return is promoted to the header',()=>{
 const f=fixture('submitted');const b=f.native('managerFinishAndInvoice');b.attrs.onclick='return managerFinishAndInvoice("TASK/1","content","التسويق")';assert.deepEqual(f.kinds(),['approve']);
 b.attrs.onclick='return window.managerFinishAndInvoice("TASK/1","content","التسويق")';assert.deepEqual(f.kinds(),['approve']);
});
