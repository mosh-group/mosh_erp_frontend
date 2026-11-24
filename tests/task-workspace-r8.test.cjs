const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/02-mosh-core-runtime-14.js'),'utf8');
const open=source.slice(source.indexOf('function openSubTaskDetails('),source.indexOf('function saveSubTaskChanges('));
function render(taskId,parentId,argumentId,argumentParent){
 let workspace,hidden=false,refreshed=false;
 const box={innerHTML:'parent view',before(node){workspace=node;node.nextElementSibling=this;},classList:{add(){hidden=true;},remove(){hidden=false;}}};
 const child={id:taskId,parentTaskId:parentId,title:'فرعية',status:'in_progress',history:[]};
 const parent={id:parentId,title:'رئيسية'};
 const context={state:{salesTasks:[parent,child]},activeTaskViewContext:{containerId:'review'},document:{
  getElementById:id=>id==='review'?box:workspace,
  createElement:tag=>({tag,innerHTML:'',setAttribute(){},remove(){workspace=null;}})
 },setDirtyState(){},refreshSaveButtons(){refreshed=true;},esc:v=>String(v??''),MoshTaskUI:{arg:JSON.stringify,title:t=>t.title,historyText:v=>v},customersCatalog:[],salesTaskDepartments:[]};
 vm.createContext(context);vm.runInContext(open,context);context.openSubTaskDetails(argumentId,argumentParent);
 const out={html:workspace?.innerHTML||'',refreshed,tag:workspace?.tag,parentHidden:hidden,parentHtml:box.innerHTML};
 context.closeSubTaskWorkspace();
 return {...out,parentRestored:!hidden&&!workspace};
}
test('subtask remains openable after server serializes numeric IDs as strings',()=>{
 const out=render('7','3',7,3);assert.match(out.html,/taskEditTitle_7/);assert.match(out.html,/رئيسية/);assert.equal(out.refreshed,true);
});
test('subtask remains openable with numeric local IDs and string navigation arguments',()=>{
 assert.match(render(7,3,'7','3').html,/taskEditTitle_7/);
});
test('a child cannot be opened through an unrelated parent',()=>{
 assert.equal(render('7','3','7','9').html,'');
});
test('subtask uses a separate workspace and restores its parent on close',()=>{
 const out=render('7','3','7','3');
 assert.equal(out.tag,'section');
 assert.equal(out.parentHtml,'parent view');
 assert.equal(out.parentHidden,true);
 assert.equal(out.parentRestored,true);
});
test('string task identifiers continue to work',()=>{
 assert.match(render('SUB/7','TASK/3','SUB/7','TASK/3').html,/taskEditTitle_SUB\/7/);
});
test('the approval button passes an opaque parent task ID to the handler',()=>{
 const markup=source.match(/\x60<button type="button" id="managerFinishBtn_[^\r\n]+managerFinishPackageSubTask[^\r\n]+\x60/)[0];
 const calls=[];
 const context={t:{id:'SUB/7',parentTaskId:'01M83MYFZC4WF5FV5NTJMP9F0V'},containerId:'marketingTaskWorkspace',department:'التسويق',
  MoshTaskUI:{arg:value=>JSON.stringify(value).replaceAll('"','&quot;')},
  managerFinishPackageSubTask:(...args)=>calls.push(args)};
 vm.createContext(context);
 const html=vm.runInContext(markup,context);
 const handler=html.match(/onclick="([^"]+)"/)[1].replaceAll('&quot;','"');
 vm.runInContext('(function(){'+handler+'})()',context);
 assert.deepEqual(calls,[['SUB/7','01M83MYFZC4WF5FV5NTJMP9F0V','marketingTaskWorkspace','التسويق']]);
});
test('inspecting a child inside an employee overlay never runs a parent execution action',async()=>{
 let removed=false,calls=[];
 const stage={querySelector:s=>s.includes('taskEditTitle')?{id:'taskEditTitle_CHILD'}:{remove(){removed=true;}}};
 const context={state:{salesTasks:[{id:'PARENT'}]},document:{body:{},getElementById:id=>id==='emp47TaskStage'?stage:{classList:{contains:()=>true}},querySelector:()=>({id:'taskEditTitle_CHILD'}),addEventListener(){}},MutationObserver:class{observe(){}},setInterval(){},setTimeout(){},clearTimeout(){}};
 context.window={MoshTaskInbox49:{perform:async(kind,id)=>calls.push([kind,id])},MoshEmployeeTaskOverlay47:{current:()=>({id:'PARENT'})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/51-mosh-v48-employee-task-workflow-js.js'),'utf8'),context);
 assert.equal(context.window.MoshEmployeeTaskWorkflow48.render(),false);assert.equal(removed,true);
 await context.window.MoshEmployeeTaskWorkflow48.act('finish');assert.deepEqual(calls,[]);
 context.document.querySelector=()=>({id:'taskEditTitle_PARENT'});
 await context.window.MoshEmployeeTaskWorkflow48.act('pause');assert.deepEqual(calls,[['pause','PARENT']]);
});
