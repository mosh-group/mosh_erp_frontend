/* R34 shared presentation/command helpers. No business data stored in browser storage. */
(function(){'use strict';
window.MOSH_R34_RELEASE='R34';
const $=(q,p=document)=>p.querySelector(q),$$=(q,p=document)=>Array.from(p.querySelectorAll(q));
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const owner=()=>String(window.MoshApi?.user?.id||''),uid=()=> 'r34-'+(crypto.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
let epoch=0;const dialogs=new Set();
const snapshot=()=>({owner:owner(),epoch}),guard=s=>{if(!s?.owner||s.owner!==owner()||s.epoch!==epoch)throw new Error('تغير حساب الدخول؛ افتح النافذة من حسابك الحالي.');};
async function request(path,options={},s=snapshot()){guard(s);const result=await window.MoshApi.request(path,options);guard(s);return result;}
async function commit(holder,path,body,method='POST',s=snapshot()){
 const signature=JSON.stringify([path,body,method]);if(holder.pending&&holder.pending.signature!==signature)throw new Error('نتيجة الإرسال السابق غير مؤكدة. أعد نفس الإرسال أو حدّث السجل قبل تغييره.');
 holder.pending??={signature,body:{...body,requestId:uid()}};
 try{const result=await request(path,{method,body:holder.pending.body},s);holder.pending=null;return result;}
 catch(e){if(e.status&&e.status<500&&![408,429].includes(e.status))holder.pending=null;throw e;}
}
function dialog(id,title,html,dirty=false){const d=window.MoshUI19.dialog(id,title,`<div class="r34">${html}</div>`,{wide:true,dirty});d.classList.add('r34-dialog');dialogs.add(id);return d;}
function close(id){window.MoshUI19.close(id,true);dialogs.delete(id);}
function error(node,e){if(!node)return;let el=$('[data-r34-error]',node);if(!el){el=document.createElement('div');el.dataset.r34Error='';el.className='r34-error';$('.r34',node)?.prepend(el);}el.textContent=e?.message||String(e);el.setAttribute('role','alert');}
function busy(node,on){if(!node)return;node.setAttribute('aria-busy',String(on));$$('button,input,textarea,select',node).forEach(el=>{if(on){if(el._r34Disabled===undefined)el._r34Disabled=el.disabled;el.disabled=true;}else if(el._r34Disabled!==undefined){el.disabled=el._r34Disabled;delete el._r34Disabled;}});}
const B=(title,action,id='',primary=false)=>`<button type="button" class="r34-btn${primary?' primary':''}" data-r34="${E(action)}" data-id="${E(id)}">${E(title)}</button>`;
const note=t=>`<div class="r34-note">${E(t)}</div>`,empty=t=>`<div class="r34-empty">${E(t)}</div>`;
const field=(label,name,value='',type='text',attrs='')=>`<label>${E(label)}<input name="${E(name)}" type="${type}" value="${E(value)}" ${attrs}></label>`;
const area=(label,name,value='',attrs='')=>`<label class="r34-full">${E(label)}<textarea name="${E(name)}" rows="3" ${attrs}>${E(value)}</textarea></label>`;
const opts=(rows,v)=>rows.map(([id,name])=>`<option value="${E(id)}"${String(id)===String(v)?' selected':''}>${E(name)}</option>`).join('');
const select=(label,name,rows,v='',attrs='')=>`<label>${E(label)}<select name="${E(name)}" ${attrs}>${opts(rows,v)}</select></label>`;
const stamp=v=>{try{return new Date(v).toLocaleString('ar-SY',{dateStyle:'short',timeStyle:'short'});}catch(_){return String(v||'');}};
const size=v=>{let n=Number(v)||0,i=0;while(n>=1024&&i<4){n/=1024;i++;}return new Intl.NumberFormat('ar-SY',{maximumFractionDigits:1}).format(n)+' '+['بايت','ك.ب','م.ب','غ.ب','ت.ب'][i];};
function form(id,title,html,submit,after,button='حفظ'){
 const s=snapshot(),h={};const d=dialog(id,title,`<form data-r34-form>${html}<div data-r34-error class="r34-error"></div><footer class="r34-actions"><button type="submit" class="r34-btn primary">${E(button)}</button>${B('إلغاء','close',id)}</footer></form>`,true);
 const f=$('form',d);f.addEventListener('submit',async ev=>{ev.preventDefault();if(d.getAttribute('aria-busy')==='true'||!f.reportValidity())return;const submitted=new FormData(f);busy(d,true);try{guard(s);const result=await submit(submitted,f,h,s);guard(s);busy(d,false);close(id);if(after)await after(result);window.MoshUI19.toast('تم الحفظ على الخادم.');}catch(e){busy(d,false);error(d,e);}});return d;
}
function accept(resource,doc,s=snapshot()){guard(s);if(!doc?.id)throw new Error('استجابة الحفظ غير مكتملة.');const stateNow=()=>{try{return state;}catch(_){return{};}};
 const map={'tasks':'salesTasks','customers':'customers','hr-requests':'hrProRequests','hr-approvals':'hrApprovals'};
 const local=stateNow()[map[resource]]?.find(x=>String(x.id)===String(doc.id));if(Number(local?._version||0)>Number(doc._version||0))return;
 window.MoshApi.acceptServerChanges?.([{resource,id:String(doc.id),data:doc}],s.owner);
}
function clear(){epoch++;for(const id of dialogs)window.MoshUI19?.close(id,true);dialogs.clear();}
for(const event of ['mosh:logout-complete','mosh:session-expired'])document.addEventListener(event,clear);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-r34="close"]');if(b){e.preventDefault();close(b.dataset.id);}});
window.Mosh34={$, $$,E,owner,uid,snapshot,guard,request,commit,dialog,close,error,busy,B,note,empty,field,area,opts,select,form,stamp,size,accept};
})();
