// Real exit guard and save transport functions, isolated clock/DOM/API; no HTTP/database.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const guard=fs.readFileSync(path.join(__dirname,'../js/61-mosh-r14-system-polish.js'),'utf8');
const client=fs.readFileSync(path.join(__dirname,'../js/api-client.js'),'utf8');
function fixture(){
 let now=0,timerId=0,busy=false,exits=0,clicks=0;const timers=new Map(),listeners=new Map();
 const buttons=Object.fromEntries(['save','cancel','discard'].map(action=>[action,{dataset:{r14:action},disabled:false}]));
 const status={textContent:''},dialog={open:false,querySelector:s=>buttons[s.match(/data-r14="(.*?)"/)?.[1]],showModal(){this.open=true;},close(){this.open=false;}};
 const source={isConnected:true,disabled:false,click(){clicks++;f.onSave?.();}};
 const document={addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn)};
 const context=vm.createContext({appIsDirty:true,editRevision:0,bypassExit:false,activeSurface:()=>({}),findSaveButton:()=>source,ensureDialog:()=>dialog,q:()=>status,
  dirty:()=>context.appIsDirty,setDirty:value=>context.appIsDirty=value,document,Date:{now:()=>now},window:{MoshApi:{isSaving:()=>busy,flush:async()=>{}}},
  setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(guard.slice(guard.indexOf('let activeExitRequest='),guard.indexOf('function exitCandidate(')),context);
 const f={context,dialog,status,buttons,source,onSave:null,get exits(){return exits;},get clicks(){return clicks;},setBusy:value=>busy=value,
  emit:(type,detail)=>{for(const fn of listeners.get(type)||[])fn({type,detail});},start(){this.result=context.requestUnsavedExit(()=>exits++);},
  click:action=>dialog.onclick({target:{closest:()=>buttons[action]},preventDefault(){},stopPropagation(){}}),
  advance(ms){const target=now+ms;for(;;){const next=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].fn();}now=target;}};
 return f;
}
test('server-confirmed save clears stale dirty flag and exits',async()=>{
 const f=fixture();f.onSave=()=>f.emit('mosh:saved',{changes:[{resource:'tasks'}]});f.start();await f.click('save');f.advance(120);
 assert.equal(await f.result,true);assert.equal(f.exits,1);assert.equal(f.context.appIsDirty,false);
});
test('slow active request remains pending beyond ten seconds and never triggers a second save',async()=>{
 const f=fixture();f.onSave=()=>f.setBusy(true);f.start();await f.click('save');f.advance(12000);
 assert.equal(f.exits,0);assert.equal(f.buttons.save.disabled,true);assert.match(f.status.textContent,/انتظار تأكيد/);
 await f.click('save');assert.equal(f.clicks,1);f.setBusy(false);f.emit('mosh:save-confirmed');f.advance(120);assert.equal(await f.result,true);
});
test('failed save shows actual error and preserves edits',async()=>{
 const f=fixture();f.onSave=()=>f.emit('mosh:save-failed',new Error('Specific validation error'));f.start();await f.click('save');f.advance(120);
 assert.equal(f.status.textContent,'Specific validation error');assert.equal(f.context.appIsDirty,true);assert.equal(f.exits,0);assert.equal(f.dialog.open,false);assert.equal(await f.result,false);
});
test('edits made after save starts are retained after successful acknowledgement',async()=>{
 const f=fixture();f.onSave=()=>f.setBusy(true);f.start();await f.click('save');f.context.editRevision++;f.setBusy(false);f.emit('mosh:saved');f.advance(120);
 assert.equal(f.exits,0);assert.equal(f.context.appIsDirty,true);assert.match(f.status.textContent,/تعديلات أحدث/);
});
test('cancelled dialog ignores a late server acknowledgement',async()=>{
 const f=fixture();f.onSave=()=>f.setBusy(true);f.start();await f.click('save');await f.click('cancel');f.setBusy(false);f.emit('mosh:saved');f.advance(15000);
 assert.equal(await f.result,false);assert.equal(f.exits,0);assert.equal(f.context.appIsDirty,true);
});
test('acknowledgement of an earlier request cannot confirm the current editor',async()=>{
 const f=fixture();let resolve;f.context.window.MoshApi.flush=()=>new Promise(r=>resolve=r);f.start();const saving=f.click('save');f.emit('mosh:saved');resolve();await saving;f.advance(120);
 assert.equal(f.exits,0);assert.equal(f.context.appIsDirty,true);f.emit('mosh:save-confirmed');f.advance(120);assert.equal(await f.result,true);
});
test('validation with no acknowledgement closes the confirmation and preserves the editor',async()=>{
 const f=fixture();f.start();await f.click('save');f.advance(11000);assert.equal(f.exits,0);assert.equal(f.context.appIsDirty,true);assert.equal(f.dialog.open,false);assert.equal(await f.result,false);
});
function transport(drain){
 const events=[],context=vm.createContext({api:{user:{id:'account-1'}},ready:true,taskPending:null,pending:null,wanted:null,workdeskUncertain:null,requestWrites:0,copy:x=>JSON.parse(JSON.stringify(x)),state:{customers:[]},lastSavedStateRaw:'',drain,document:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}}});
 vm.runInContext(client.slice(client.indexOf('  api.save = function'),client.indexOf('  // Narrow, server-confirmed task actions.')),context);return {context,events};
}
test('transport confirms a successful no-op save after draining, with no pending request left',async()=>{
 const f=transport(async()=>{});await f.context.api.save();assert.equal(f.events.length,1);assert.equal(f.events[0].type,'mosh:save-confirmed');assert.equal(f.context.api.isSaving(),false);
});
test('transport stays busy until save settles and never confirms a rejected save',async()=>{
 let reject;const f=transport(()=>new Promise((_,r)=>reject=r));const saving=f.context.api.save();await Promise.resolve();assert.equal(f.context.api.isSaving(),true);reject(new Error('Rejected'));await assert.rejects(saving,/Rejected/);assert.equal(f.events.length,0);assert.equal(f.context.api.isSaving(),false);
});
test('transport does not confirm a save under another account',async()=>{
 let resolve;const f=transport(()=>new Promise(r=>resolve=r));const saving=f.context.api.save();await Promise.resolve();f.context.api.user={id:'account-2'};resolve();await saving;assert.equal(f.events.length,0);
});

test('success closes the confirmation and presents the explicit saved result',async()=>{
 const f=fixture();f.onSave=()=>f.emit('mosh:save-confirmed');f.start();await f.click('save');f.advance(120);assert.equal(await f.result,true);assert.equal(f.dialog.open,false);assert.match(f.status.textContent,/تم الحفظ بنجاح/);
});
test('a stalled prior flush cannot keep the confirmation open indefinitely',async()=>{
 const f=fixture();let resolve;f.context.window.MoshApi.flush=()=>new Promise(r=>resolve=r);f.start();const saving=f.click('save');f.advance(90000);assert.equal(await f.result,false);assert.equal(f.dialog.open,false);assert.equal(f.context.appIsDirty,true);assert.match(f.status.textContent,/تعذر تأكيد الحفظ/);resolve();await saving;assert.equal(f.clicks,0);
});
test('a permanently busy request closes with an unconfirmed result and preserves edits',async()=>{
 const f=fixture();f.onSave=()=>f.setBusy(true);f.start();await f.click('save');f.advance(90000);assert.equal(await f.result,false);assert.equal(f.dialog.open,false);assert.equal(f.exits,0);assert.equal(f.context.appIsDirty,true);assert.match(f.status.textContent,/تعذر تأكيد الحفظ/);assert.equal(f.clicks,1);
});
test('native required-field validation returns to the editor without a false save or a hanging dialog',async()=>{
 const f=fixture();f.source.form={reportValidity:()=>false};f.start();await f.click('save');assert.equal(await f.result,false);assert.equal(f.dialog.open,false);assert.equal(f.clicks,0);assert.equal(f.context.appIsDirty,true);assert.match(f.status.textContent,/الحقول المطلوبة/);
});
test('clearing a local dirty flag alone is never reported as a server-confirmed save',async()=>{
 const f=fixture();f.onSave=()=>f.context.appIsDirty=false;f.start();await f.click('save');f.advance(11000);assert.equal(await f.result,false);assert.equal(f.exits,0);assert.doesNotMatch(f.status.textContent,/تم الحفظ بنجاح/);
});
function saveButton(label,handler='',classes=[]){return {textContent:label,disabled:false,hidden:false,getClientRects:()=>[{}],getAttribute:key=>key==='onclick'?handler:null,classList:{contains:key=>classes.includes(key)},closest:()=>null};}
function selectRealSave(buttons){
 const context=vm.createContext({q:()=>null,qa:()=>buttons,dirty:()=>false,text:el=>el.textContent.trim(),visible:el=>!el.hidden});
 vm.runInContext(guard.slice(guard.indexOf('function isSaveAction('),guard.indexOf('let activeExitRequest=')),context);return context.findSaveButton({});
}
test('all department review/navigation buttons are excluded from save-button discovery',()=>{
 for(const department of ['admin','hr','sales','marketing','social','design','photo','editing','promotion','it','logistics','purchases','accounting','warehouses','platform']){
  const nav=saveButton('اعتماد المدير',"MoshManagerApprovals28.open('"+department+"')",['primary']);
  const decision=saveButton('اعتماد وإنهاء للفوترة','return managerFinishAndInvoice("T1")',['primary']);
  const real=saveButton('حفظ التغييرات','saveTaskChanges("T1")',['save-btn']);
  assert.equal(selectRealSave([nav,decision,real]),real,department);assert.equal(selectRealSave([nav,decision]),null,department);
 }
});
test('save-looking navigation labels and disabled or permission-hidden controls cannot be clicked as saves',()=>{
 const nav=saveButton('حفظ الخطة',"openPlans()",['primary']),denied=saveButton('حفظ',['mosh-auth-hidden']);denied.classList.contains=k=>k==='mosh-auth-hidden';
 const disabled=saveButton('حفظ');disabled.disabled=true;const real=saveButton('حفظ بيانات العميل','submitCustomer()');assert.equal(selectRealSave([nav,denied,disabled,real]),real);
});
test('search, filters and assignment selectors no longer mark every department as an unsaved form',()=>{
 const context=vm.createContext({});vm.runInContext(guard.slice(guard.indexOf('function isFilter('),guard.indexOf('function ensureDialog(')),context);
 const field=(id,editor=true,search=false)=>({id,disabled:false,readOnly:false,matches:s=>s.startsWith('input[type=search]')?search:true,closest:s=>s==='[data-chat34-task]'?null:s.includes('.sales-task-card')&&editor?{}:null});
 assert.equal(context.isEditorControl(field('appListSearch',true,true)),false);assert.equal(context.isEditorControl(field('departmentFilter')),false);
 for(const prefix of ['managerAssignee_','managerTransferDept_','managerTransferAdmin_'])assert.equal(context.isEditorControl(field(prefix+'T1')),false);
 assert.equal(context.isEditorControl(field('taskEditDescription_T1')),true);
 const core=fs.readFileSync(path.join(__dirname,'../js/02-mosh-core-runtime-14.js'),'utf8'),start=core.indexOf("document.addEventListener('input',function(e){const el=e.target"),end=core.indexOf("document.addEventListener('focusin'",start);let dirty=0;const handlers={};
 Object.assign(context,{window:{MoshR14Polish:{isEditorControl:context.isEditorControl}},document:{addEventListener:(event,fn)=>handlers[event]=fn},setDirtyState:()=>dirty++});vm.runInContext(core.slice(start,end),context);
 const filter=field('appListSearch',true,true);filter.tagName='INPUT';handlers.input({target:filter});handlers.change({target:filter});assert.equal(dirty,0);
 const edit=field('taskEditTitle_T1');edit.tagName='INPUT';edit.closest=s=>s==='[data-chat34-task]'?null:{};handlers.input({target:edit});assert.equal(dirty,1);
});

test('server field validation closes the confirmation promptly with its actual error',async()=>{
 const f=fixture();f.onSave=()=>f.emit('mosh:validation-error',new Error('العميل مطلوب'));f.start();await f.click('save');f.advance(120);assert.equal(await f.result,false);assert.equal(f.dialog.open,false);assert.equal(f.status.textContent,'العميل مطلوب');assert.equal(f.context.appIsDirty,true);assert.equal(f.exits,0);
});

test('failure restores the unsaved flag if a legacy handler cleared it before the server replied',async()=>{
 const f=fixture();f.onSave=()=>{f.context.appIsDirty=false;f.emit('mosh:save-failed',new Error('Rejected by server'));};f.start();await f.click('save');f.advance(120);assert.equal(await f.result,false);assert.equal(f.context.appIsDirty,true);assert.equal(f.dialog.open,false);assert.equal(f.exits,0);
});
