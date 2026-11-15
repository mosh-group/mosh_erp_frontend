/* R36: paint an isolated, lightweight login before loading any department scripts.
 * Authentication, CSRF, bootstrap and permissions remain server-authoritative.
 * No app data is read until the session has been authenticated. */
(async function(){'use strict';
 const api=window.MoshApi,entry=document.getElementById('moshEntry36'),form=document.getElementById('entry36Form'),submit=document.getElementById('entry36Submit'),status=document.getElementById('entry36Status'),retry=document.getElementById('entry36Retry');
 let running=false,modulesStarted=false,sessionReady=false;
 const styles=[...document.querySelectorAll('link[data-r36-deferred-style]')];
 const stylesheetState=new WeakMap();
 for(const link of styles){stylesheetState.set(link,link.sheet?'ready':'loading');link.addEventListener('load',()=>stylesheetState.set(link,'ready'),{once:true});link.addEventListener('error',()=>stylesheetState.set(link,'error'),{once:true});}
 async function loadStyles(){await Promise.all(styles.map(link=>new Promise((resolve,reject)=>{link.media='all';if(link.sheet||stylesheetState.get(link)==='ready')return resolve();if(stylesheetState.get(link)==='error')return reject(new Error('تعذر تحميل تنسيق الواجهة.'));const timer=setTimeout(()=>reject(new Error('تأخر تحميل تنسيق الواجهة.')),20000);link.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});link.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('تعذر تحميل تنسيق الواجهة.'));},{once:true});})));}

 const say=(text,error=false)=>{if(status){status.textContent=text;status.setAttribute('role',error?'alert':'status');}};
 performance.mark('mosh36-login-visible');window.MoshBoot9?.waitForLogin?.();
 async function request(path,options={}){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),20000);try{return await api.request(path,{...options,signal:ac.signal});}finally{clearTimeout(timer);}}
 async function loadApplication(){
  if(modulesStarted)return;modulesStarted=true;window.MoshBoot9?.loading?.();if(form)form.hidden=true;if(retry)retry.hidden=true;say('تم التحقق. جارٍ تجهيز مساحة العمل…');performance.mark('mosh36-startup-attempt');
  const manifestAbort=new AbortController(),manifestTimeout=setTimeout(()=>manifestAbort.abort(),20000);let manifest;
  try{const response=await fetch('api-map.json?v=r40-1',{cache:'no-cache',signal:manifestAbort.signal});if(!response.ok)throw new Error('تعذر تحميل قائمة ملفات التطبيق.');manifest=await response.json();}
  catch(error){throw new Error(error.name==='AbortError'?'تأخر تحميل قائمة ملفات التطبيق. أعد المحاولة.':error.message);}
  finally{clearTimeout(manifestTimeout);}
  if(!manifest.resources||!manifest.settings||!Array.isArray(manifest.scripts)||!manifest.scripts.length)throw new Error('قائمة ملفات التطبيق غير مكتملة.');
  api.resources=manifest.resources;api.settingPaths=manifest.settings;
  function set(path,value){const keys=path.split('.');let node=api.initialState;for(const key of keys.slice(0,-1))node=node[key]??={};node[keys.at(-1)]=value;}
  for(const spec of Object.values(api.resources))set(spec.statePath,spec.mode==='map'?{}:[]);
  for(const path of Object.values(api.settingPaths))set(path,{});api.initialState.salesOrders=[];
  await loadStyles();
  if(api.status.authenticated){
   // Data is loaded before modules execute. A failed read can be retried safely
   // after checking the session, without replaying the login POST.
   const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),60000);
   const slow=setTimeout(()=>say('جارٍ تحميل أحدث البيانات… الاتصال يستغرق وقتاً أطول.'),10000);
   try{await api.bootstrap({signal:ac.signal});}
   catch(error){modulesStarted=false;if(error.name==='AbortError')error.message='تأخر تحميل بيانات مساحة العمل. اضغط إعادة المحاولة.';throw error;}
   finally{clearTimeout(timeout);clearTimeout(slow);}
  }
  let loaded=0;const scripts=['vendor/html2canvas.min.js','vendor/jspdf.umd.min.js',...manifest.scripts];
  let scriptFailure=false;
  await Promise.all(scripts.map(source=>new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=source;script.async=false;let settled=false;
   const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=script.onerror=null;if(error){scriptFailure=true;reject(error);return;}loaded++;if(!scriptFailure)say('جارٍ تجهيز مساحة العمل… '+Math.round(loaded/scripts.length*100)+'٪');resolve();};
   const timer=setTimeout(()=>finish(new Error('تأخر تحميل أحد ملفات الواجهة. اضغط إعادة المحاولة.')),60000);
   script.onload=()=>finish();script.onerror=()=>finish(new Error('تعذر تحميل '+source));document.body.append(script);
  }))); 
  api.initialize();document.dispatchEvent(new CustomEvent('mosh:r19-ready'));
  if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  await new Promise(resolve=>setTimeout(resolve,0));if(!window.MoshAuth37||!window.MoshWorkdesk50)throw new Error('لم يكتمل تحميل واجهة التطبيق.');
  if(api.user){if(typeof renderDashboard==='function')renderDashboard();window.MoshEmployeeView11?.refresh?.();window.MoshTaskInbox49?.renderHome?.();window.MoshWorkdesk50.render(true);window.MoshHomeNotices52?.render?.();}
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(entry)entry.remove();window.MoshBoot9?.finish();performance.mark('mosh36-app-ready');
  let replaying=false,refreshing=false;
  document.addEventListener('click',async event=>{const button=event.target.closest?.('button');if(!button||replaying||!api.user||button.textContent.trim()!=='تحديث')return;event.preventDefault();event.stopImmediatePropagation();if(refreshing)return;refreshing=true;try{await api.refresh();replaying=true;button.click();}catch(error){api.showError(error);}finally{replaying=false;refreshing=false;}},true);
  document.addEventListener('mosh:refreshed',()=>{try{if(typeof renderDashboard==='function')renderDashboard();}catch(_){}});
  document.addEventListener('mosh:session-expired',()=>{api.user=null;api.showError(new Error('انتهت جلسة الدخول. أعد تسجيل الدخول.'));location.reload();},{once:true});
 }
 function failed(error){window.MoshBoot9?.waitForLogin?.();say(error?.message||'تعذر الاتصال. أعد المحاولة.',true);if(retry)retry.hidden=false;if(submit)submit.disabled=!sessionReady;}
 async function checkSession(){if(running)return;running=true;sessionReady=false;if(submit)submit.disabled=true;if(retry)retry.hidden=true;say('جارٍ التحقق من الجلسة…');
  try{if(!api)throw new Error('تعذر تحميل الاتصال بالتطبيق.');api.status=await request('/auth/status');sessionReady=true;
   if(api.status.authenticated||api.status.setupRequired)await loadApplication();else{if(form)form.hidden=false;window.MoshBoot9?.waitForLogin?.();say('أدخل بيانات حسابك للمتابعة.');submit.disabled=false;}
  }catch(error){failed(error);}finally{running=false;}
 }
 if(form)form.addEventListener('submit',async event=>{event.preventDefault();if(running||!sessionReady||modulesStarted||!form.reportValidity())return;running=true;submit.disabled=true;say('جارٍ تسجيل الدخول…');
  const username=form.elements.username.value.trim(),password=form.elements.password.value;
  try{await request('/auth/login',{method:'POST',body:{username,password}});form.elements.password.value='';api.status={...api.status,authenticated:true};await loadApplication();}
  catch(error){failed(error);if(error.status===401||error.status===422)form.elements.password.value='';}
  finally{running=false;if(!modulesStarted)submit.disabled=!sessionReady;}
 });
 if(retry)retry.addEventListener('click',()=>{if(modulesStarted){location.reload();return;}void checkSession();});
 await checkSession();
})();
