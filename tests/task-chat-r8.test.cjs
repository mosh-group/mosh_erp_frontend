const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function conversation(commit){
 const handlers={},calls=[],accepted=[],record={id:'T/8',status:'in_progress',workChat:[],history:[]};
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const U={E,B:()=>'',owner:()=> 'OWNER',snapshot:()=> 'OWNER',guard(){},$:()=>null,$$:()=>[],empty:v=>v,note:v=>v,stamp:v=>v,size:v=>v,busy(){},request:async()=>({task:record}),accept:(resource,data)=>accepted.push([resource,data]),commit:async(d,url,payload,method)=>{calls.push({url,payload,method});return commit?commit(d,payload):record;}};
 const context={state:{salesTasks:[record]},document:{body:{},addEventListener(type,fn){(handlers[type]??=[]).push(fn);},getElementById:()=>null},MutationObserver:class{observe(){}},requestAnimationFrame(){},window:{Mosh34:U,MoshApi:{flush:async()=>{}},addEventListener(){}},Blob};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/r34-chat.js'),'utf8'),context);
 return {api:context.window.MoshChat34,record,calls,accepted,write(text){const target={value:text,closest:()=>({dataset:{chat34Task:record.id}}),matches:()=>true};for(const fn of handlers.input||[])fn({target});}};
}
test('chat rejection keeps the draft and never presents a saved message',async()=>{
 const c=conversation(async()=>{throw Error('رفض الخادم');});c.write('بيان العمل');await c.api.send(c.record.id);
 assert.match(c.api.html(c.record),/بيان العمل/);assert.match(c.api.html(c.record),/رفض الخادم/);assert.equal(c.accepted.length,0);assert.equal(c.api.inspect(c.record.id).busy,false);
});
test('successful send uses the original task endpoint and clears only the confirmed draft',async()=>{
 const c=conversation();c.write('بيان العمل');await c.api.send(c.record.id);
 assert.equal(c.calls.length,1);assert.equal(c.calls[0].url,'/r34/chat/send');assert.equal(c.calls[0].method,'POST');assert.equal(c.calls[0].payload.taskId,'T/8');assert.equal(c.calls[0].payload.text,'بيان العمل');assert.equal(c.accepted[0][1],c.record);
 assert.doesNotMatch(c.api.html(c.record),/>بيان العمل<\/textarea>/);
});
test('repeated clicks during an outstanding request do not duplicate the send',async()=>{
 let finish;const c=conversation(()=>new Promise(resolve=>finish=resolve));c.write('مرة واحدة');const first=c.api.send(c.record.id);await Promise.resolve();await Promise.resolve();await c.api.send(c.record.id);assert.equal(c.calls.length,1);finish(c.record);await first;
});
test('archived conversations stay read only and keep edit/delete audit text escaped',()=>{
 const c=conversation();c.record.status='archived_invoiced';c.record.workChat=[{id:'M',byId:'OWNER',text:'<script>unsafe</script>',revisions:[{text:'النص السابق',replacedBy:'المعدل',replacedAt:'2026-11-09'}],deletedAt:'2026-11-09',deletedBy:'الحاذف'}];
 const html=c.api.html(c.record);assert.doesNotMatch(html,/data-chat34="send"|data-chat34="delete"|<script>/);assert.match(html,/<s>النص السابق<\/s>/);assert.match(html,/الحاذف/);assert.match(html,/&lt;script&gt;/);
});
