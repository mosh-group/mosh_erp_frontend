// Production transport with a controlled clock and fetch; no HTTP/database.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const client=fs.readFileSync(path.join(__dirname,'../js/api-client.js'),'utf8');
const requestCode=client.slice(client.indexOf('  api.request = async function'),client.indexOf('  api.serverNow ='));
async function ticks(){for(let i=0;i<16;i++)await Promise.resolve();}
function transport(fetcher){
 let now=0,seq=0;const timers=new Map(),events=[],calls=[];
 const context=vm.createContext({api:{transactions:[],showError(){}},requestWrites:0,csrf:'token',Headers,FormData,AbortController,Date,publicAuthPath:()=>false,retryDeadline:()=>0,
  window:{API_BASE_URL:'http://test.invalid/api'},document:{documentElement:{dataset:{}},dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
  setTimeout:(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),
  fetch:async(url,options)=>{calls.push({url,options});return fetcher(url,options,calls.length);}});
 vm.runInContext(requestCode,context);
 return {context,events,calls,timers,advance(ms){now+=ms;for(const [id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}},request:(path,options)=>context.api.request(path,options)};
}
function stalled(signal){return new Promise((_,reject)=>{const stop=()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}));if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});});}
function response(data,status=200){return {ok:status<400,status,headers:{get:()=>null},json:async()=>data};}
test('a stalled read settles on its timeout and cleans up the timer',async()=>{
 const f=transport((url,options)=>stalled(options.signal)),pending=f.request('/tasks');f.advance(30000);await assert.rejects(pending,e=>e.name==='AbortError'&&e.network&&e.aborted);assert.equal(f.timers.size,0);assert.equal(f.context.requestWrites,0);
});
test('a stalled write never reports success and releases its pending-write state',async()=>{
 const f=transport((url,options)=>stalled(options.signal));const pending=f.request('/transactions',{method:'POST',body:{operations:[]}});assert.equal(f.context.requestWrites,1);f.advance(30000);await assert.rejects(pending,e=>e.network&&e.message.includes('تعذر تأكيد الحفظ'));assert.equal(f.context.requestWrites,0);assert.equal(f.events.length,0);
});
test('timeout also covers a response body that never finishes arriving',async()=>{
 const f=transport(async(url,options)=>({ok:true,status:200,headers:{get:()=>null},json:()=>stalled(options.signal)}));const pending=f.request('/transactions',{method:'POST',body:{operations:[]}});await ticks();f.advance(30000);await assert.rejects(pending,e=>e.network&&e.message.includes('تعذر تأكيد الحفظ'));assert.equal(f.context.requestWrites,0);assert.equal(f.timers.size,0);
});
test('a caller abort signal is preserved and internal timers are removed',async()=>{
 const external=new AbortController(),f=transport((url,options)=>stalled(options.signal));const pending=f.request('/tasks',{signal:external.signal,timeoutMs:5000});external.abort();await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(f.timers.size,0);assert.equal('timeoutMs' in f.calls[0].options,false);
});
test('successful and rejected responses settle cleanly with the exact validation error',async()=>{
 const good=transport(async()=>response({success:true,data:{id:'confirmed'}}));assert.equal((await good.request('/tasks',{method:'POST',body:{title:'Task'}})).id,'confirmed');assert.equal(good.timers.size,0);assert.equal(good.context.requestWrites,0);
 const bad=transport(async()=>response({success:false,errors:{title:['Required title']}},422));await assert.rejects(bad.request('/tasks',{method:'POST',body:{}}),e=>e.status===422&&e.message==='Required title');assert.equal(bad.timers.size,0);assert.equal(bad.context.requestWrites,0);assert.equal(bad.events[0].type,'mosh:validation-error');
});
test('bootstrap and file uploads retain their longer bounded timeout',async()=>{
 for(const [path,options]of [['/bootstrap',{}],['/files',{method:'POST',body:new FormData()}]]){const f=transport((url,opts)=>stalled(opts.signal));const pending=f.request(path,options);assert.equal([...f.timers.values()][0].at,60000);f.advance(60000);await assert.rejects(pending,e=>e.name==='AbortError');}
});
test('lost transaction response retries the same idempotency key exactly once',async()=>{
 const keys=[],f=transport((url,options,attempt)=>{keys.push(options.headers.get('Idempotency-Key'));return attempt===1?stalled(options.signal):response({success:true,data:{transactionId:'TX1',changes:[]}});});
 Object.assign(f.context,{wanted:{customers:[{id:'C1',name:'Changed'}]},baseline:{customers:[{id:'C1',name:'Old'}]},state:{customers:[{id:'C1',name:'Changed'}]},pendingFileRemovals:new Set(),crypto:{randomUUID:()=> 'same-transaction-key'},copy:v=>JSON.parse(JSON.stringify(v)),operations:()=>[{resource:'customers',action:'update',id:'C1',version:1,data:{name:'Changed'}}],mergeChange(){},lastSavedStateRaw:'',customersCatalog:[],servicesCatalog:[]});
 vm.runInContext(client.slice(client.indexOf('  async function drain()'),client.indexOf('  api.save = function')),f.context);const pending=f.context.drain();await ticks();assert.equal(f.calls.length,1);f.advance(30000);await ticks();await pending;assert.deepEqual(keys,['same-transaction-key','same-transaction-key']);assert.equal(new Set(keys).size,1);assert.equal(f.context.api.transactions.length,1);assert.equal(f.context.requestWrites,0);assert.equal(f.events.filter(e=>e.type==='mosh:saved').length,1);
});

test('binary body reads remain bounded until the full download finishes',async()=>{
 const f=transport(async(url,options)=>({ok:true,status:200,headers:{get:()=>null},blob:()=>stalled(options.signal)}));const pending=f.request('/files/file/download',{binary:true});await ticks();assert.equal(f.timers.size,1);f.advance(30000);await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(f.timers.size,0);
});
