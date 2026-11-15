/* R35 branding. Authoritative saved configuration; authenticated reads, permission-checked writes. */
(function(){'use strict';
if(window.MoshBranding35)return;
const $=(q,r=document)=>r?.querySelector(q);let value=null,readJob=null,controller=null,epoch=0,openSeq=0;
const actor=()=>String(window.MoshApi?.user?.id||'');
const canEdit=()=>!!(window.MoshAuth37?.can('systemCustomization')||window.MoshAuth37?.can('appearanceSettings'));
function draw(){const logo=$('#appLogo');if(!logo)return;
 if(value?.mode==='image'&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value.image||'')){
  if(logo.dataset.r35Image===value.image)return;logo.replaceChildren();logo.classList.add('r35-image-logo');logo.dataset.r35Image=value.image;
  const img=document.createElement('img');img.src=value.image;img.alt=(()=>{try{return state.systemSettings?.companyName||'MOSH GROUP';}catch(_){return 'MOSH GROUP';}})();
  const version=document.createElement('small');version.className='app-version';version.textContent=window.MOSH_UI_RELEASE||'R35';logo.append(img,version);
 }else {const old=logo.classList.contains('r35-image-logo');logo.classList.remove('r35-image-logo');delete logo.dataset.r35Image;if(old&&typeof originalRender==='function'){try{originalRender(state.systemSettings?.appName||'MOSH ERP');}catch(_){originalRender('MOSH ERP');}}}
}
const originalRender=window.renderAppLogo;
if(typeof originalRender==='function')window.renderAppLogo=function(...args){originalRender.apply(this,args);const logo=$('#appLogo');if(logo)delete logo.dataset.r35Image;draw();};
async function load(force=false){if(!actor())return;if(readJob&&!force)return readJob;
 if(force){controller?.abort();epoch++;}const turn=epoch,user=actor();controller=new AbortController();
 const job=window.MoshApi.request('/ui/branding',{signal:controller.signal}).then(v=>{if(turn===epoch&&user===actor()){value=v;draw();}return v;});readJob=job;
 try{return await job;}finally{if(readJob===job)readJob=null;}
}
function install(){const settings=$('#systemSettingsModal');if(!settings)return;let box=$('#r35BrandSettings',settings);
 if(!box){box=document.createElement('div');box.className='settings-section';box.id='r35BrandSettings';const text=document.createElement('b');text.textContent='هوية النظام والشعار';const p=document.createElement('p');p.className='muted';p.textContent='اسم مكتوب أو صورة شعار الشركة، مع إبقاء رقم الإصدار منفصلاً.';const button=document.createElement('button');button.type='button';button.className='btn r35-ui-navigation';button.textContent='تغيير الشعار';button.onclick=open;box.append(text,p,button);(settings.querySelector('.system-settings-head')||settings.firstElementChild)?.after(box);}
 box.hidden=!canEdit();
}
async function open(){if(!canEdit())return;const user=actor(),sequence=++openSeq;
 try{const saved=await load(true);if(user!==actor()||sequence!==openSeq||!saved)return;
 const U=window.Mosh34,d=U.dialog('r35Branding','هوية النظام والشعار',`<form id="r35BrandForm"><div class="r35-brand-grid"><label>طريقة العرض<select name="mode"><option value="text">اسم النظام كتابة</option><option value="image">صورة شعار الشركة</option></select></label><label>اختيار صورة الشعار<input type="file" accept="image/png,image/jpeg,image/webp" name="logo"></label><div class="r35-brand-preview"></div><div class="r35-brand-note">PNG أو JPEG أو WebP حتى 2 ميغابايت وأبعاد 4096 بكسل. الشعار لا يُقصّ ولا يُمدّد، ولا يتغير على أجهزة الموظفين قبل الحفظ.</div><div class="r35-brand-error" role="alert"></div></div><footer class="r35-brand-actions"><button type="submit" class="btn primary">حفظ الشعار</button><button type="button" class="btn" data-brand-remove>حذف الصورة والرجوع للنص</button><button type="button" class="btn" data-brand-close>إلغاء</button></footer></form>`,true);d.classList.add('r35-brand-dialog');
 const form=$('#r35BrandForm',d),select=$('[name=mode]',form),input=$('[name=logo]',form),error=$('.r35-brand-error',form),target=$('.r35-brand-preview',form);let image=saved.image||null,remove=false,busy=false,selection=0;
 select.value=saved.mode;
 const paint=()=>{target.replaceChildren();if(select.value==='image'&&image){const img=document.createElement('img');img.src=image;img.alt='معاينة الشعار';target.append(img);}else target.textContent=(()=>{try{return state.systemSettings?.appName||'MOSH ERP';}catch(_){return 'MOSH ERP';}})();};paint();
 select.onchange=paint;$('[data-brand-close]',form).onclick=()=>{if(!busy)U.close('r35Branding');};$('[data-brand-remove]',form).onclick=()=>{selection++;image=null;remove=true;select.value='text';input.value='';paint();};
 input.onchange=()=>{const file=input.files?.[0],serial=++selection;if(!file)return;error.textContent='';if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2097152){error.textContent='اختر PNG أو JPEG أو WebP لا يتجاوز 2 ميغابايت.';input.value='';return;}
 const reader=new FileReader();reader.onload=()=>{if(serial!==selection||!d.isConnected||user!==actor())return;image=String(reader.result);remove=false;select.value='image';paint();};reader.onerror=()=>{error.textContent='تعذرت قراءة الصورة.';};reader.readAsDataURL(file);};
 form.onsubmit=async ev=>{ev.preventDefault();if(busy||!form.reportValidity())return;error.textContent='';if(user!==actor()){error.textContent='تغير حساب الدخول؛ أعد فتح النافذة.';return;}if(select.value==='image'&&!image){error.textContent='اختر صورة شعار أولاً.';return;}
 const body={mode:select.value,image:remove?null:(image===saved.image?null:image),remove,_version:saved._version};busy=true;U.busy(d,true);
 try{const updated=await window.MoshApi.request('/ui/branding',{method:'PUT',body});if(user!==actor())return;controller?.abort();epoch++;readJob=null;value=updated;draw();U.busy(d,false);U.close('r35Branding');window.MoshUI19.toast('تم حفظ الشعار على الخادم.');}
 catch(e){U.busy(d,false);error.textContent=e.message||'تعذر حفظ الشعار.';}finally{busy=false;}
 };
 }catch(e){window.MoshApi?.showError?.(e);}
}
function clear(){epoch++;openSeq++;controller?.abort();readJob=null;value=null;draw();window.Mosh34?.close?.('r35Branding');}
function start(){install();load().catch(()=>{});}
for(const e of ['mosh:logout-complete','mosh:session-expired'])document.addEventListener(e,clear);
document.addEventListener('mosh:r19-ready',start,{once:true});document.addEventListener('mosh:refreshed',()=>{install();load(true).catch(()=>{});});
document.addEventListener('click',e=>{if(e.target.closest('#systemSettingsBtn'))install();},true);
window.MoshBranding35={open,load,draw};if(window.MoshApi?.user&&window.MoshAuth37)start();
})();
