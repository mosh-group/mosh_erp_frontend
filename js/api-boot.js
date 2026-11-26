/* R36: paint an isolated, lightweight login before loading any department scripts.
 * Authentication, CSRF, bootstrap and permissions remain server-authoritative.
 * No app data is read until the session has been authenticated. */
(async function(){'use strict';
 const api=window.MoshApi,entry=document.getElementById('moshEntry36'),form=document.getElementById('entry36Form'),submit=document.getElementById('entry36Submit'),status=document.getElementById('entry36Status'),retry=document.getElementById('entry36Retry');
 document.getElementById('entry36Version')?.remove();
 let running=false,modulesStarted=false,sessionReady=false,accountChosen=false;
 let loginRetryAt=0,loginRetryTimer=0;
 const styles=[...document.querySelectorAll('link[data-r36-deferred-style]')];
 const stylesheetState=new WeakMap();
 for(const link of styles){stylesheetState.set(link,link.sheet?'ready':'loading');link.addEventListener('load',()=>stylesheetState.set(link,'ready'),{once:true});link.addEventListener('error',()=>stylesheetState.set(link,'error'),{once:true});}
 async function loadStyles(){await Promise.all(styles.map(link=>new Promise((resolve,reject)=>{link.media='all';if(link.sheet||stylesheetState.get(link)==='ready')return resolve();if(stylesheetState.get(link)==='error')return reject(new Error('تعذر تحميل تنسيق الواجهة.'));const timer=setTimeout(()=>reject(new Error('تأخر تحميل تنسيق الواجهة.')),20000);link.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});link.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('تعذر تحميل تنسيق الواجهة.'));},{once:true});})));}

 const say=(text,error=false)=>{if(status){status.textContent=text;status.setAttribute('role',error?'alert':'status');}};
 performance.mark('mosh36-login-visible');window.MoshBoot9?.waitForLogin?.();
 async function request(path,options={}){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),20000);try{return await api.request(path,{...options,signal:ac.signal});}finally{clearTimeout(timer);}}

 function showWelcome(accountId) {
  const dialog=document.getElementById('moshWelcome');
  if(!accountId||!dialog)return Promise.resolve();
  const welcomeForm=document.getElementById('moshWelcomeForm');
  const button=document.getElementById('moshWelcomeContinue');
  const message=document.getElementById('moshWelcomeError');
  const signIn=document.getElementById('moshWelcomeSignIn');

  message.hidden=true;button.hidden=false;button.disabled=false;signIn.hidden=true;
  dialog.oncancel=event=>event.preventDefault();
  signIn.onclick=()=>location.reload();
  window.MoshBoot9?.waitForLogin?.();
  dialog.showModal();
  document.getElementById('moshWelcomeHeading').focus();

  return new Promise(resolve=>{
   welcomeForm.onsubmit=async event=>{
    event.preventDefault();
    if(button.disabled||button.hidden)return;
    button.disabled=true;message.hidden=true;
    try {
     const receipt=await request('/auth/welcome',{method:'POST',body:{accountId}});
     if(receipt?.accountId!==accountId||!receipt.welcomeAcknowledgedAt)throw new Error('تعذّر تأكيد الاطلاع. أعد المحاولة.');
     if(api.status?.welcomeAccountId===accountId)api.status.welcomeAccountId=null;
     welcomeForm.onsubmit=null;
     dialog.close();
     resolve();
    } catch(error) {
     message.textContent=error?.message||'تعذّر الاتصال. أعد المحاولة.';
     message.hidden=false;
     if([401,409,419].includes(error?.status)){
      button.hidden=true;signIn.hidden=false;signIn.focus();
     } else button.focus();
    } finally {button.disabled=false;}
   };
  });
 }
 window.MoshWelcome={show:showWelcome};

 async function startWorkspace() {
  await showWelcome(api.status.welcomeAccountId);
  await loadApplication();
 }

 async function loadApplication(){
  if(modulesStarted)return;modulesStarted=true;window.MoshBoot9?.loading?.();if(form)form.hidden=true;if(retry)retry.hidden=true;say('تم التحقق بنجاح. جارٍ تحميل مساحة العمل…');performance.mark('mosh36-startup-attempt');
  const manifestAbort=new AbortController(),manifestTimeout=setTimeout(()=>manifestAbort.abort(),20000);let manifest;
  try{const response=await fetch('api-map.json?v=r40-1',{cache:'no-cache',signal:manifestAbort.signal});if(!response.ok)throw new Error('تعذر تحميل قائمة ملفات التطبيق.');manifest=await response.json();}
  catch(error){throw new Error(error.name==='AbortError'?'تأخر تحميل قائمة ملفات التطبيق. أعد المحاولة.':error.message);}
  finally{clearTimeout(manifestTimeout);}
  if(!manifest.resources||!manifest.settings||!Array.isArray(manifest.scripts)||!manifest.scripts.length)throw new Error('قائمة ملفات التطبيق غير مكتملة.');
  window.MoshUiUpdates?.setManifest(manifest);
  window.MoshPages.configure(manifest);
  api.resources=manifest.resources;api.settingPaths=manifest.settings;
  function set(path,value){const keys=path.split('.');let node=api.initialState;for(const key of keys.slice(0,-1))node=node[key]??={};node[keys.at(-1)]=value;}
  for(const spec of Object.values(api.resources))set(spec.statePath,spec.mode==='map'?{}:[]);
  for(const path of Object.values(api.settingPaths))set(path,{});api.initialState.salesOrders=[];
  async function loadData(){
   if(!api.status.authenticated)return;
   // Data is loaded before modules execute. A failed read can be retried safely
   // after checking the session, without replaying the login POST.
   const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),60000);
   const slow=setTimeout(()=>say('جارٍ تحميل أحدث البيانات… الاتصال يستغرق وقتاً أطول.'),10000);
   try{await api.bootstrap({section:'dashboard',signal:ac.signal});}
   catch(error){modulesStarted=false;if(error.name==='AbortError')error.message='تأخر تحميل بيانات مساحة العمل. اضغط إعادة المحاولة.';throw error;}
   finally{clearTimeout(timeout);clearTimeout(slow);}
  }
  await Promise.all([loadStyles(), loadData(), window.MoshPages.load('dashboard')]);
  let loaded=0;const scripts=['vendor/html2canvas.min.js','vendor/jspdf.umd.min.js',...manifest.scripts];
  let scriptFailure=false;
  await Promise.all(scripts.map(source=>new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=source;script.async=false;let settled=false;
   const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=script.onerror=null;if(error){scriptFailure=true;reject(error);return;}loaded++;if(!scriptFailure)say('جارٍ تجهيز مساحة العمل… '+Math.round(loaded/scripts.length*100)+'٪');resolve();};
   const timer=setTimeout(()=>finish(new Error('تأخر تحميل أحد ملفات الواجهة. اضغط إعادة المحاولة.')),60000);
   script.onload=()=>finish();script.onerror=()=>finish(new Error('تعذر تحميل '+source));document.body.append(script);
  }))); 
  window.MoshPages.installNavigation();
  api.initialize();document.dispatchEvent(new CustomEvent('mosh:r19-ready'));
  if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  await new Promise(resolve=>setTimeout(resolve,0));if(!window.MoshAuth37||!window.MoshWorkdesk50)throw new Error('لم يكتمل تحميل واجهة التطبيق.');
  if(api.user){if(typeof renderDashboard==='function')renderDashboard();window.MoshEmployeeView11?.refresh?.();window.MoshTaskInbox49?.renderHome?.();window.MoshWorkdesk50.render(true);window.MoshHomeNotices52?.render?.();}
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const linkedSection=window.MoshPages.linkedSection();
  if(api.user&&!api.user.mustChange&&linkedSection&&linkedSection!=='dashboard'){
   try{await window.MoshSidebar09.openLinkedSection(linkedSection);}catch(error){api.showError(error);}
  }
  if(entry)entry.remove();window.MoshBoot9?.finish();performance.mark('mosh36-app-ready');window.MoshUiUpdates?.ready();
  const refreshButton=document.getElementById('moshRefreshPage');
  let refreshing=null,replaying=false;
  const announcePageRefresh=()=>document.dispatchEvent(new Event('mosh:page-refreshed'));
  const visible=node=>node&&node.getClientRects().length>0;
  function repaintActivePage(refreshTaskDetail=false){
   if(typeof appIsDirty!=='undefined'&&appIsDirty)return;
   if(Array.from(document.querySelectorAll('dialog[open],.modal.show,.mw08-workspace')).some(visible))return;
   const view=document.querySelector('.view.active');
   if(!view)return;
   const app=view.id.replace(/App$/,'');
   if(app==='tasks'){
    if(api.personalTaskScope()) {
     window.MoshPermissions38?.renderMine('tasks');
     return;
    }
    const taskPage = document.getElementById('allTasksContainer')?.dataset;
    if(taskPage?.taskPageView === 'detail' && refreshTaskDetail) {
     openTaskDetailsFromAll(taskPage.taskPageDetailId, activeTaskViewContext);
    } else if (taskPage?.taskPageView !== 'opening' && taskPage?.taskPageView !== 'detail') renderAllTasks();
    return;
   }
   if(app==='archive'){refreshCurrentArchiveSection();return;}
   if(app==='employeePortal'){renderEmployeePortal();return;}
   if(app==='hr'&&visible(view.querySelector('.h13-metrics'))){window.MoshHR13.go('home');return;}
   if(app==='accounting'&&visible(view.querySelector('#f21Page'))){window.MoshFinance21.render();return;}
   const board=Array.from(view.querySelectorAll('.db9')).find(visible);
   if(board){
    if(view.dataset.taskView==='assign')window.MoshDepartmentDashboard.openAssignment(app);
    else if(productiveTaskViewModes[app]==='running')renderProductiveRunningTasks(app);
    else renderProductiveDistributionBoard(app);
   }
  }
  function refreshPage(){
   if(!api.user)return Promise.resolve(false);
   if(typeof appIsDirty!=='undefined'&&appIsDirty){
    api.showError(new Error('احفظ تعديلاتك قبل تحديث الصفحة.'));
    return Promise.resolve(false);
   }
   if(refreshing)return refreshing;
   refreshButton.disabled=true;
   refreshButton.setAttribute('aria-busy','true');
   refreshing=api.refresh().then(()=>true).catch(error=>{api.showError(error);return false;}).finally(()=>{
    refreshing=null;
    refreshButton.disabled=false;
    refreshButton.removeAttribute('aria-busy');
   });
   return refreshing;
  }
  function refreshVisiblePage(){return refreshPage().then(ok=>{if(ok)repaintActivePage();});}
  let queuedSectionRefresh=false;
  document.addEventListener('mosh:section-enter',async event=>{
   if(window.MoshPages.hasFreshEntry(event.detail.app))return;
   if(refreshing){
    if(queuedSectionRefresh)return;
    queuedSectionRefresh=true;
    await refreshing;
    queuedSectionRefresh=false;
   }
   if(event.detail.app === 'tasks') {
    if(await refreshPage() && document.getElementById('tasksApp')?.classList.contains('active') && api.personalTaskScope()) {
     window.MoshPermissions38?.renderMine('tasks');
    }
   } else await refreshVisiblePage();
  });
  refreshButton.addEventListener('click',async ()=>{
   const view=document.querySelector('.view.active');
   if(!await refreshPage())return;
   announcePageRefresh();
   if(view?.id==='tasksApp'&&view.classList.contains('active')){
    repaintActivePage(true);
    return;
   }
   const localRefresh=Array.from(view?.querySelectorAll('button')||[]).find(button=>
    !button.disabled&&visible(button)&&button.textContent.trim()==='تحديث');
   if(view?.classList.contains('active')&&localRefresh){
    replaying=true;
    try{localRefresh.click();}finally{replaying=false;}
   }else repaintActivePage(true);
  });
  document.addEventListener('click',async event=>{
   const button=event.target.closest?.('button');
   if(!button||button===refreshButton||replaying||!api.user||button.textContent.trim()!=='تحديث')return;
   event.preventDefault();event.stopImmediatePropagation();
   if(!await refreshPage()||!button.isConnected)return;
   replaying=true;
   try{button.click();}finally{replaying=false;}
   announcePageRefresh();
  },true);
  document.addEventListener('mosh:refreshed',()=>{try{if(typeof renderDashboard==='function')renderDashboard();}catch(_){}});
  document.addEventListener('mosh:session-expired',endSession,{once:true});
  watchSession();
 }
 function endSession(event){
  const frozen=event.detail?.reason==='frozen';
  api.user=null;
  document.documentElement.classList.add('mosh-booting');
  document.getElementById('appShell')?.setAttribute('inert','');
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  if(entry&&form&&retry){
   form.hidden=true;
   retry.hidden=false;
   retry.textContent='العودة لتسجيل الدخول';
   document.body.append(entry);
   say(frozen?'تم تجميد حسابك. تواصل مع الموارد البشرية.':'انتهت جلسة الدخول. أعد تسجيل الدخول.',true);
   retry.focus();
  }
  if(!frozen||!entry||!retry)location.reload();
 }
 function watchSession(){
  if(!api.user)return;
  const lifetime=new AbortController();
  const options={signal:lifetime.signal};
  let timer,checking=false;
  function stop(){clearTimeout(timer);lifetime.abort();}
  function schedule(){
   if(!lifetime.signal.aborted&&api.user)timer=setTimeout(check,2000);
  }
  async function check(){
   const account=api.user;
   if(lifetime.signal.aborted||!account||checking)return;
   clearTimeout(timer);
   if(navigator.onLine===false){schedule();return;}
   checking=true;
   try{
    const status=await api.request('/auth/session',{...options,cache:'no-store',timeoutMs:4500});
    if(lifetime.signal.aborted||api.user?.id!==account.id)return;
    if(status?.authenticated===false||
       (status?.authenticated===true&&status.accountId&&status.accountId!==account.id)){
     document.dispatchEvent(new CustomEvent('mosh:session-expired',{detail:{reason:status.frozen?'frozen':'expired'}}));
    }
   }catch(_){
    // A failed connection on its own cannot establish that the session has ended.
   }finally{
    checking=false;
    schedule();
   }
  }
  document.addEventListener('mosh:session-expired',stop,options);
  document.addEventListener('mosh:logout-complete',stop,options);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void check();},options);
  window.addEventListener('focus',check,options);
  window.addEventListener('online',check,options);
  window.addEventListener('pageshow',event=>{if(event.persisted)void check();},options);
  schedule();
 }
 function failed(error){window.MoshBoot9?.waitForLogin?.();say(error?.message||'تعذر الاتصال. أعد المحاولة.',true);if(retry)retry.hidden=false;if(submit)submit.disabled=!sessionReady;}
 function updateLoginRetry(){
  clearTimeout(loginRetryTimer);
  const seconds=Math.ceil((loginRetryAt-Date.now())/1000);
  if(seconds<=0){
   loginRetryAt=0;
   if(submit)submit.disabled=running||!sessionReady;
   say('انتهت مهلة الانتظار. يمكنك تسجيل الدخول الآن.');
   return;
  }
  if(submit)submit.disabled=true;
  if(retry)retry.hidden=true;
  say('تم إيقاف محاولات الدخول مؤقتاً. يمكنك المحاولة بعد '+seconds+' ثانية.');
  loginRetryTimer=setTimeout(updateLoginRetry,Math.min(1000,loginRetryAt-Date.now()));
 }
 async function checkSession(){if(running)return;running=true;sessionReady=false;if(submit)submit.disabled=true;if(retry)retry.hidden=true;say('جارٍ التحقق من الجلسة…');
  try{if(!api)throw new Error('تعذر تحميل الاتصال بالتطبيق.');api.status=await request('/auth/status');sessionReady=true;
   // Section links and UI revision reloads may reuse the authenticated browser session.
   const resume=window.MoshUiUpdates?.resume;
   if(api.status.authenticated&&!accountChosen){
    if(window.MoshPages.linkedSection())accountChosen=true;
    else if(resume){try{const user=await request('/auth/me');accountChosen=String(user.id)===resume.id;}catch(_){accountChosen=false;}}
   }
   // The standard entry page still asks the user to choose an account.
   // Keep the explicit choice only in this page so startup retries remain usable.
   if((api.status.authenticated&&accountChosen)||api.status.setupRequired)await startWorkspace();else{accountChosen=false;api.user=null;if(form)form.hidden=false;window.MoshBoot9?.waitForLogin?.();say('أدخل بيانات الحساب الذي تريد استخدامه للمتابعة.');submit.disabled=false;}
  }catch(error){failed(error);}finally{running=false;}
 }
 if(form)form.addEventListener('submit',async event=>{event.preventDefault();if(running||loginRetryAt>Date.now()||!sessionReady||modulesStarted||!form.reportValidity())return;running=true;submit.disabled=true;say('جارٍ تسجيل الدخول…');
  const username=form.elements.username.value.trim(),password=form.elements.password.value;
  try{
   const {user}=await request('/auth/login',{method:'POST',body:{username,password}});
   form.elements.password.value='';accountChosen=true;
   api.status={...api.status,authenticated:true,welcomeAccountId:user.welcomeAcknowledgedAt?null:user.id};
   await startWorkspace();
  }
  catch(error){
   if(error.status===429&&!accountChosen){
    loginRetryAt=error.retryAt>Date.now()?error.retryAt:Date.now()+60000;
    updateLoginRetry();
   }else failed(error);
   if(error.status===401||error.status===422)form.elements.password.value='';
  }
  finally{running=false;if(!modulesStarted)submit.disabled=!sessionReady||loginRetryAt>Date.now();}
 });
 if(retry)retry.addEventListener('click',()=>{if(modulesStarted){location.reload();return;}void checkSession();});
 await checkSession();
})();
