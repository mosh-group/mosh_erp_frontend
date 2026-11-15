/* MOSH R22 — complete dark/light theme switch. The selected mode is a device
 * preference only; it never changes business records or user permissions. */
(function(){
 'use strict';
 if(window.MoshTheme22)return;
 const KEY='mosh_theme_r22';
 let memory='dark';
 function normalize(value){return value==='light'?'light':'dark'}
 function read(){try{return normalize(localStorage.getItem(KEY)||localStorage.getItem('mosh_theme_r21')||memory)}catch(_){return normalize(memory)}}
 function persist(mode){memory=mode;try{localStorage.setItem(KEY,mode)}catch(_){}}
 function sync(){
  const mode=read(), light=mode==='light';
  const button=document.getElementById('r22ThemeToggle');
  if(button){button.dataset.mode=mode;button.setAttribute('aria-pressed',String(light));button.title=light?'التحويل إلى الوضع الداكن':'التحويل إلى الوضع الفاتح';button.setAttribute('aria-label',button.title);button.innerHTML='<span aria-hidden="true">'+(light?'☾':'☀')+'</span><span class="r22-theme-label">'+(light?'داكن':'فاتح')+'</span>';}
  const select=document.getElementById('r22ThemeSelect');if(select&&select.value!==mode)select.value=mode;
 }
 function apply(value,{save=true,emit=true}={}){
  const mode=normalize(value);memory=mode;if(save)persist(mode);
  document.documentElement.dataset.moshTheme=mode;
  if(document.body)document.body.dataset.moshTheme=mode;
  document.documentElement.style.colorScheme=mode;
  try{if(typeof window.applySystemSettings==='function')window.applySystemSettings();else if(typeof window.applyAppearanceSettings==='function')window.applyAppearanceSettings(window.state?.systemSettings||{});}catch(error){console.warn('MOSH theme apply:',error)}
  sync();
  if(emit)document.dispatchEvent(new CustomEvent('mosh:theme-changed',{detail:{mode}}));
  return mode;
 }
 function toggle(){return apply(read()==='light'?'dark':'light')}
 function installTopbar(){
  const top=document.querySelector('.top-actions');if(!top||document.getElementById('r22ThemeToggle'))return;
  const button=document.createElement('button');button.type='button';button.id='r22ThemeToggle';button.className='btn ghost r22-theme-toggle';button.addEventListener('click',toggle);
  const anchor=document.getElementById('systemSettingsBtn')||top.querySelector('[title*="التعاميم"]')||top.firstElementChild;
  top.insertBefore(button,anchor||null);sync();
 }
 function installSettings(){
  const section=document.getElementById('v25UiSettings');if(!section)return;
  const note=section.querySelector('.v25-ui-note');if(note){const b=note.querySelector('b'),small=note.querySelector('small');if(b)b.textContent='هوية MOSH — داكن أو فاتح';if(small)small.textContent='اختيار المظهر يغيّر كامل الواجهة مع الحفاظ على الذهبي وهوية MOSH.';}
  if(document.getElementById('r22ThemeSelect'))return;
  const grid=section.querySelector('.v25-control-grid');if(!grid)return;
  const label=document.createElement('label');label.className='v25-control r22-theme-setting';
  label.innerHTML='<span>مظهر التطبيق</span><small>يحوّل كل الواجهة بين الوضع الداكن والفاتح، بما فيها النصوص والجداول والنوافذ والحقول.</small><select id="r22ThemeSelect"><option value="dark">داكن</option><option value="light">فاتح</option></select>';
  grid.prepend(label);label.querySelector('select').addEventListener('change',event=>apply(event.target.value));sync();
 }
 function install(){installTopbar();installSettings();apply(read(),{save:false,emit:false})}
 window.MoshTheme22={version:'22.0',mode:read,apply,toggle,install};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 ['mosh:ui-ready','mosh:refreshed'].forEach(type=>document.addEventListener(type,()=>{installTopbar();installSettings();apply(read(),{save:false,emit:false})}));
 new MutationObserver(()=>{installSettings();}).observe(document.documentElement,{childList:true,subtree:true});
})();
