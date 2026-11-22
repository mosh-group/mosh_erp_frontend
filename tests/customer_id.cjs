// Production ID generator with real crypto; no browser, network or database.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../js/02-mosh-core-runtime-14.js'),'utf8');
const start=source.indexOf('function nextCustomerId('),end=source.indexOf('function renderNewCustomerForm(',start);
assert.ok(start>=0&&end>start);
function session(customers){const context=vm.createContext({state:{customers},crypto:crypto.webcrypto});vm.runInContext(source.slice(start,end),context);return context;}
test('empty permission-filtered customer list cannot reuse a legacy database ID',()=>{
 const page=session([]);const existing=new Set(['CUST/00001','CUST/00665']);
 for(let i=0;i<1000;i++){const id=page.nextCustomerId();assert.equal(existing.has(id),false);assert.match(id,/^CUST\/[0-9a-f-]{36}$/);existing.add(id);}
 assert.equal(page.state.customers.length,0);
});
test('concurrent sessions with identical snapshots generate different IDs',()=>{
 const a=session([{id:'CUST/00665'}]),b=session([{id:'CUST/00665'}]),seen=new Set();
 for(let i=0;i<1000;i++)for(const page of [a,b]){const id=page.nextCustomerId();assert.equal(seen.has(id),false);seen.add(id);}
 assert.equal(a.state.customers[0].id,'CUST/00665');assert.equal(b.state.customers[0].id,'CUST/00665');
});
test('existing ULID and sequential IDs remain unchanged',()=>{
 const rows=[{id:'01M4R9FF2T10CAJ98E16R2H664',name:'Existing A'},{id:'CUST/00001',name:'Existing B'}],before=JSON.stringify(rows);
 const page=session(rows);page.nextCustomerId();assert.equal(JSON.stringify(rows),before);
});
