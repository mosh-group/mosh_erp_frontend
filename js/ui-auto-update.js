/* Detect published UI revisions; never reload over a draft or an active save. */
(function(){'use strict';
 if(window.MoshUiUpdates)return;
 const storageKey='mosh-ui-update-resume',pollMs=30000,idleMs=2500;
 const edits=new Set(),original=new WeakMap();
 let started=false,checking=false,reloading=false,pending=false,manifestBase='',lastActivity=Date.now(),notice=null;
 const pageUrl=new URL(location.href);pageUrl.searchParams.delete('mosh_update');
 function assets(doc){return JSON.stringify(Array.from(doc.querySelectorAll('link[rel="stylesheet"][href],script[src]')).map(el=>el.getAttribute(el.tagName==='SCRIPT'?'src':'href')));}
 let assetsBase='';
 function manifestSignature(value){if(!value||!Array.isArray(value.scripts)||!value.scripts.length||!value.resources||!value.settings)throw new Error('Invalid UI manifest');return JSON.stringify(value);}
 function consumeResume(){
  try{const raw=sessionStorage.getItem(storageKey);sessionStorage.removeItem(storageKey);if(!raw)return null;const item=JSON.parse(raw),url=new URL(location.href),age=Date.now()-item.at;
   if(!item.id||age<0||age>120000||item.path!==url.pathname||item.nonce!==url.searchParams.get('mosh_update'))return null;
   url.searchParams.delete('mosh_update');history.replaceState(history.state,'',url.href);return item;
  }catch(_){return null;}
 }
 const resume=consumeResume();
 function value(el){return el.type==='checkbox'||el.type==='radio'?el.checked:el.value??el.textContent;}
 function isEditable(el){return !!el?.matches?.('input:not([type=search]):not([type=hidden]),textarea,select,[contenteditable="true"]')&&!el.disabled&&!el.readOnly&&(!!el.closest('form')||window.MoshR14Polish?.isEditorControl?.(el));}
 document.addEventListener('focusin',event=>{if(isEditable(event.target)&&!original.has(event.target))original.set(event.target,value(event.target));},true);
 function activity(event){lastActivity=Date.now();const el=event.target;if(!isEditable(el)||!['input','change'].includes(event.type))return;if(!original.has(el))original.set(el,el.type==='checkbox'||el.type==='radio'?el.defaultChecked:el.defaultValue??'');if(value(el)===original.get(el))edits.delete(el);else edits.add(el);}
 for(const name of ['input','change','keydown','pointerdown'])document.addEventListener(name,activity,true);
 function blocked(){
  if(window.MoshApi?.isSaving?.())return true;
  try{if(typeof appIsDirty!=='undefined'&&appIsDirty)return true;}catch(_){}
  if(document.body?.dataset.r14Dirty==='1')return true;
  const visible=el=>!el.hidden&&el.getClientRects().length>0;
  if(Array.from(document.querySelectorAll('[aria-busy="true"],dialog[open],.modal.show,.hr-pro-modal-root:not([hidden]),.auth37-editorback,#mgr28Modal')).some(visible))return true;
  if(Array.from(document.querySelectorAll('input[type="file"]')).some(el=>el.files?.length))return true;
  for(const el of edits){if(!el.isConnected||value(el)===original.get(el)){edits.delete(el);continue;}if(visible(el))return true;}
  return Date.now()-lastActivity<idleMs;
 }
 function showPending(){if(notice||!document.body)return;notice=document.createElement('div');notice.id='moshUiUpdateNotice';notice.setAttribute('role','status');notice.dir='rtl';notice.style.cssText='position:fixed;bottom:18px;left:18px;z-index:2147483000;max-width:min(420px,90vw);padding:12px 16px;border:1px solid #cba637;border-radius:10px;background:#191b1d;color:#f7e8bb;font:14px/1.7 sans-serif;box-shadow:0 4px 20px #0005;pointer-events:none';notice.textContent='يتوفر تحديث للواجهة. سيُطبّق تلقائيًا بعد حفظ عملك وإغلاق النافذة.';document.body.appendChild(notice);}
 function apply(){
  if(!started||!pending||reloading||document.visibilityState==='hidden'||navigator.onLine===false)return;
  if(blocked()){showPending();return;}
  const url=new URL(pageUrl.href),nonce=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);url.searchParams.set('mosh_update',nonce);
  try{sessionStorage.setItem(storageKey,JSON.stringify({id:String(window.MoshApi?.user?.id||''),at:Date.now(),path:url.pathname,nonce}));}catch(_){}
  reloading=true;location.replace(url.href);
 }
 async function check(){
  if(!started||checking||reloading||document.visibilityState==='hidden'||navigator.onLine===false)return;
  checking=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   const indexUrl=new URL(pageUrl.href);indexUrl.hash='';indexUrl.searchParams.set('mosh_check',Date.now());
   const mapUrl=new URL('api-map.json',pageUrl);mapUrl.searchParams.set('mosh_check',Date.now());
   const responses=await Promise.all([fetch(indexUrl.href,{cache:'no-store',credentials:'same-origin',signal:controller.signal}),fetch(mapUrl.href,{cache:'no-store',credentials:'same-origin',signal:controller.signal})]);
   if(responses.some(response=>!response.ok))return;
   const [html,manifest]=await Promise.all([responses[0].text(),responses[1].json()]);
   const doc=new DOMParser().parseFromString(html,'text/html');
   if(!doc.querySelector('script[src*="api-boot.js"]')||!doc.querySelector('script[src*="api-client.js"]'))return;
   const nextManifest=manifestSignature(manifest);
   pending=assets(doc)!==assetsBase||nextManifest!==manifestBase;
   if(!pending){notice?.remove();notice=null;}else apply();
  }catch(_){/* A disconnected or incomplete deployment cannot trigger a reload. */}
  finally{clearTimeout(timer);checking=false;}
 }
 window.MoshUiUpdates={resume,setManifest(manifest){if(!assetsBase)assetsBase=assets(document);manifestBase=manifestSignature(manifest);},ready(){if(started||!manifestBase)return;started=true;setTimeout(check,1000);setInterval(check,pollMs);setInterval(apply,2000);},check};
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')void check();});
 window.addEventListener('online',()=>void check());
 for(const event of ['mosh:logout-complete','mosh:session-expired'])document.addEventListener(event,()=>{started=false;pending=false;try{sessionStorage.removeItem(storageKey);}catch(_){}notice?.remove();notice=null;});
})();
