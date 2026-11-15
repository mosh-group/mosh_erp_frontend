/* MOSH R23 SAFE — appearance only. Does not touch boot, business data or system settings runtime. */
(function(){
 'use strict';
 if(window.MoshTheme21 && window.MoshTheme21.safe23)return;
 const KEY='mosh_theme_r21'; let memory='dark';
 const normalize=v=>v==='light'?'light':'dark';
 function read(){try{return normalize(localStorage.getItem(KEY)||memory)}catch(_){return normalize(memory)}}
 function persist(mode){memory=mode;try{localStorage.setItem(KEY,mode)}catch(_){}}
 function sync(){
  const mode=read();
  const select=document.getElementById('r21ThemeSelect');if(select&&select.value!==mode)select.value=mode;
  const version=document.querySelector('#appLogo .app-version');if(version)version.textContent=window.MOSH_UI_RELEASE||'R31.1';
 }
 function apply(value,{save=true,emit=true}={}){
  const mode=normalize(value);memory=mode;if(save)persist(mode);
  document.documentElement.dataset.moshTheme=mode;
  if(document.body)document.body.dataset.moshTheme=mode;
  document.documentElement.style.colorScheme=mode;
  // Core already has the approved light palette. Recompute inline tokens when switching;
  // changing only the data attribute leaves !important dark tokens on <html>.
  if(typeof window.applyAppearanceSettings==='function'){window.applyAppearanceSettings(typeof state!=='undefined'?(state.systemSettings||{}):{});}
  sync();
  if(emit)document.dispatchEvent(new CustomEvent('mosh:theme-changed',{detail:{mode}}));
  return mode;
 }
 function toggle(){return apply(read()==='light'?'dark':'light')}
 function installSettings(){
  const section=document.getElementById('v25UiSettings');if(!section)return;
  if(document.getElementById('r21ThemeSelect')){sync();return;}
  const grid=section.querySelector('.v25-control-grid');if(!grid)return;
  const label=document.createElement('label');label.className='v25-control r21-theme-setting';
  label.innerHTML='<span>مظهر التطبيق</span><small>الوضع الفاتح يغيّر كامل الواجهة: الخلفيات والنصوص والجداول والنوافذ والحقول.</small><select id="r21ThemeSelect"><option value="dark">داكن</option><option value="light">فاتح</option></select>';
  grid.prepend(label);label.querySelector('select').addEventListener('change',e=>apply(e.target.value));sync();
 }
 function install(){apply(read(),{save:false,emit:false});installSettings();sync()}
 window.MoshTheme21={version:'23-safe',safe23:true,mode:read,apply,toggle,install};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 document.addEventListener('mosh:ui-ready',()=>{install();setTimeout(installSettings,80)});
 document.addEventListener('mosh:refreshed',()=>{apply(read(),{save:false,emit:false});setTimeout(installSettings,80)});
 document.addEventListener('click',e=>{if(e.target.closest?.('#systemSettingsBtn'))setTimeout(installSettings,80)},true);
})();
