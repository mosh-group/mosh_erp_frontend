// Real entry script in an isolated DOM/API fixture: no browser, HTTP or database.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/api-boot.js'),'utf8');
function element(){return {hidden:false,disabled:false,handlers:{},attributes:{},addEventListener(type,fn){this.handlers[type]=fn;},setAttribute(k,v){this.attributes[k]=v;},remove(){this.removed=true;}};}
async function page(options={}){
 const calls=[],counts={manifest:0,bootstrap:0,initialized:0,finished:0},form=element(),submit=element(),status=element(),retry=element(),entry=element();
 form.elements={username:{value:''},password:{value:''}};form.reportValidity=()=>true;
 const elements={moshEntry36:entry,entry36Form:form,entry36Submit:submit,entry36Status:status,entry36Retry:retry};
 let authenticated=options.authenticated??true,selected='previous-account',failBootstrap=!!options.failBootstrap,failStatus=!!options.failStatus;
 const api={initialState:{},user:{id:selected},request:async(route,request={})=>{
  calls.push({route,method:request.method||'GET',body:request.body});
  if(route==='/auth/status'){
   if(failStatus){failStatus=false;throw new Error('status unavailable');}
   return {authenticated,setupRequired:!!options.setupRequired};
  }
  if(route==='/auth/me')return {id:selected};
  if(route==='/auth/login'){
   if(request.body.password==='incorrect')throw Object.assign(new Error('invalid credentials'),{status:401});
   authenticated=true;selected=request.body.username;return {user:{id:selected}};
  }
  throw new Error('Unexpected API route: '+route);
 },bootstrap:async()=>{
  counts.bootstrap++;
  if(failBootstrap){failBootstrap=false;throw new Error('bootstrap unavailable');}
  api.user={id:selected};
 },initialize:()=>counts.initialized++,showError:()=>{}};
 const window={MoshUiUpdates:options.resume?{resume:options.resume,setManifest(){},ready(){}}:undefined,MoshApi:api,MoshBoot9:{waitForLogin(){},loading(){},finish(){counts.finished++;}},MoshAuth37:{},MoshWorkdesk50:{render(){}}};
 const document={getElementById:id=>elements[id]||null,querySelectorAll:()=>[],createElement:()=>element(),body:{append(script){queueMicrotask(()=>script.onload());}},readyState:'complete',addEventListener(){},dispatchEvent(){}};
 const context=vm.createContext({window,document,performance:{mark(){}},AbortController,setTimeout,clearTimeout,queueMicrotask,requestAnimationFrame:fn=>queueMicrotask(fn),CustomEvent:class{},location:{reload(){throw new Error('Unexpected reload');}},fetch:async()=>{counts.manifest++;return {ok:true,json:async()=>({resources:{},settings:{},scripts:['fixture-module.js']})};}});
 await vm.runInContext(source,context);
 return {api,form,submit,status,retry,entry,calls,counts,login:async(username,password)=>{
  form.elements.username.value=username;form.elements.password.value=password;
  await form.handlers.submit({preventDefault(){}});
 },retryStartup:async()=>{
  retry.handlers.click();
  for(let n=0;n<100&&!counts.finished&&retry.hidden;n++)await new Promise(resolve=>setTimeout(resolve,2));
 }};
}
test('saved server session shows account entry without loading business data',async()=>{
 const p=await page();assert.equal(p.form.hidden,false);assert.equal(p.submit.disabled,false);assert.equal(p.api.user,null);
 assert.equal(p.counts.manifest,0);assert.equal(p.counts.bootstrap,0);assert.equal(p.counts.finished,0);
 assert.deepEqual(p.calls.map(c=>c.route),['/auth/status']);
});
test('only the credentials explicitly submitted choose the workspace account',async()=>{
 const p=await page();await p.login('  another-user  ','chosen-password');
 assert.equal(p.calls[1].route,'/auth/login');assert.equal(p.calls[1].method,'POST');
 assert.equal(p.calls[1].body.username,'another-user');assert.equal(p.calls[1].body.password,'chosen-password');
 assert.equal(p.api.user.id,'another-user');assert.equal(p.counts.bootstrap,1);assert.equal(p.counts.finished,1);assert.equal(p.form.elements.password.value,'');
});
test('rejected credentials never fall back to the previous authenticated account',async()=>{
 const p=await page();await p.login('another-user','incorrect');
 assert.equal(p.counts.bootstrap,0);assert.equal(p.counts.manifest,0);assert.equal(p.counts.finished,0);
 assert.equal(p.form.hidden,false);assert.equal(p.submit.disabled,false);assert.equal(p.form.elements.password.value,'');assert.equal(p.status.attributes.role,'alert');
 await p.login('another-user','correct');assert.equal(p.api.user.id,'another-user');assert.equal(p.counts.finished,1);
});
test('a new visit requires an explicit account choice again',async()=>{
 const first=await page();await first.login('another-user','correct');assert.equal(first.counts.finished,1);
 const next=await page({authenticated:true});assert.equal(next.form.hidden,false);assert.equal(next.counts.bootstrap,0);assert.equal(next.counts.finished,0);
});
test('startup data retry preserves the explicit choice within the same visit',async()=>{
 const p=await page({failBootstrap:true});await p.login('another-user','correct');assert.equal(p.retry.hidden,false);assert.equal(p.counts.finished,0);
 await p.retryStartup();assert.equal(p.counts.bootstrap,2);assert.equal(p.counts.finished,1);assert.equal(p.api.user.id,'another-user');
 assert.equal(p.calls.filter(c=>c.route==='/auth/login').length,1);
});
test('status connection retry still requires explicit login',async()=>{
 const p=await page({failStatus:true});assert.equal(p.submit.disabled,true);assert.equal(p.retry.hidden,false);
 await p.retryStartup();assert.equal(p.submit.disabled,false);assert.equal(p.form.hidden,false);assert.equal(p.counts.bootstrap,0);assert.equal(p.counts.manifest,0);
});
test('unauthenticated entry and initial installation keep their existing flows',async()=>{
 const loggedOut=await page({authenticated:false});assert.equal(loggedOut.form.hidden,false);assert.equal(loggedOut.counts.manifest,0);
 const setup=await page({authenticated:false,setupRequired:true});assert.equal(setup.counts.initialized,1);assert.equal(setup.counts.finished,1);assert.equal(setup.counts.bootstrap,0);
});

test('a revision reload resumes only the same authenticated server account',async()=>{
 const p=await page({resume:{id:'previous-account'}});assert.equal(p.counts.finished,1);assert.equal(p.api.user.id,'previous-account');assert.ok(p.calls.some(c=>c.route==='/auth/me'));assert.equal(p.calls.some(c=>c.route==='/auth/login'),false);
});
test('a revision marker cannot select a different or logged-out account',async()=>{
 for(const opts of [{resume:{id:'another-account'}},{authenticated:false,resume:{id:'previous-account'}}]){const p=await page(opts);assert.equal(p.counts.bootstrap,0);assert.equal(p.counts.finished,0);assert.equal(p.form.hidden,false);}
});
