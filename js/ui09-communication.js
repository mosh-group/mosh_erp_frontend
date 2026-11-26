/* Private, server-backed employee email and chat. No message content in localStorage. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),all=(s,r=document)=>[...r.querySelectorAll(s)],ui=()=>window.MoshUI19,api=()=>window.MoshApi,E=v=>ui().esc(v),owner=()=>String(api()?.user?.id||''),enc=encodeURIComponent;
const labels={inbox:'الوارد',sent:'المرسل',starred:'المميزة',drafts:'المسودات',archive:'الأرشيف',trash:'المحذوفات'};
const stamp=v=>{const d=new Date(v);return isNaN(d)?'':d.toLocaleString('ar-SY',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});};
let current=null,generation=0,pollBusy=false;
const request=(path,options)=>api().request('/communication'+path,options);
function alive(s){return current===s&&owner()===s.owner&&s.dialog.open;}
function error(d,e){const box=$('[data-c09-error]',d);if(box){box.textContent=e.message||String(e);box.hidden=false;}else ui().toast(e.message);window.MoshValidation09?.server(e,d);}
function clearError(d){const b=$('[data-c09-error]',d);if(b){b.textContent='';b.hidden=true;}}
function button(text,action,extra=''){return `<button type="button" class="btn r35-ui-navigation" data-c09="${action}" ${extra}>${text}</button>`;}
function empty(text){return `<p class="c09-empty">${E(text)}</p>`;}
function filesHtml(files=[]){return files.map(f=>button('📎 '+E(f.name),'download',`data-key="${E(f.key)}"`)).join('');}
async function download(key){try{const f=await api().file(key);const url=URL.createObjectURL(f.blob),a=document.createElement('a');a.href=url;a.download=f.name||'attachment';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){ui().toast(e.message);}}
// Bind every pending upload/send to the account and communication session that began it.
function communicationOwner(holder){const identity=owner();if(!identity||(holder.owner!==undefined&&holder.owner!==identity)||(holder.generation!==undefined&&holder.generation!==generation))throw new Error('تغيّر الحساب أو انتهت الجلسة. أعد فتح نافذة التواصل.');holder.owner=identity;holder.generation=generation;}
async function communicationRequest(holder,path,options){communicationOwner(holder);const result=await request(path,options);communicationOwner(holder);return result;}
async function upload(input,holder){communicationOwner(holder);const files=[...(input?.files||[])];if(files.length+(holder.existing?.length||0)>20)throw new Error('الحد الأقصى 20 مرفقاً.');const keys=[...(holder.existing||[])];for(const f of files){communicationOwner(holder);if(!f.size||f.size>25*1024*1024)throw new Error('اختر ملفات غير فارغة، حتى 25 ميغابايت للملف.');const signature=[f.name,f.size,f.lastModified].join('|');let entry=holder.uploads.get(signature);if(!entry){entry={key:'COMM-'+crypto.randomUUID(),done:false};holder.uploads.set(signature,entry);}if(!entry.done){try{await api().upload({key:entry.key,name:f.name,kind:'communication',blob:f});communicationOwner(holder);entry.done=true;}catch(e){communicationOwner(holder);if(e.status!==409)throw e;const meta=await api().request('/files/'+enc(entry.key));communicationOwner(holder);if(meta.name!==f.name||meta.size!==f.size)throw e;entry.done=true;}}keys.push(entry.key);}communicationOwner(holder);return keys;}
async function send(holder,payload,path='/messages'){communicationOwner(holder);const signature=JSON.stringify(payload);if(holder.pending&&holder.pending.signature!==signature)throw new Error('أعد الإرسال بنفس المحتوى للتحقق من المحاولة السابقة أولاً.');if(!holder.pending)holder.pending={signature,requestId:crypto.randomUUID()};try{const r=await communicationRequest(holder,path,{method:'POST',body:{...payload,requestId:holder.pending.requestId}});holder.pending=null;return r;}catch(e){if(e.status&&e.status<500&&![408,429].includes(e.status))holder.pending=null;throw e;}}
function busy(d,on){d.setAttribute('aria-busy',String(on));all('button,input,select,textarea',d).forEach(x=>{if(on){x._c09Disabled=x.disabled;x.disabled=true;}else if('_c09Disabled'in x){x.disabled=x._c09Disabled;delete x._c09Disabled;}});}
function snapshot(d){d._r19Initial=JSON.stringify(all('input:not([type=search]),textarea,select,[contenteditable=true]',d).map(e=>[e.name||e.id,e.type==='checkbox'||e.type==='radio'?e.checked:e.type==='file'?[...(e.files||[])].map(f=>[f.name,f.size]):e.value??e.textContent]));}
function guard(s,fn){if(s.dialog.getAttribute('aria-busy')==='true')return;ui().guard(s.dialog,()=>{s.dialog._r19TrackDirty=true;fn();});}
async function open(kind='mail',oversight=false){if(current?.dialog.open){const previous=current;if(previous.kind===kind&&previous.oversight===oversight)return;guard(previous,()=>{if(current===previous)renderView(kind,oversight);});return;}
 return renderView(kind,oversight);
}
async function renderView(kind,oversight){
 const s={owner:owner(),kind,oversight,folder:'inbox',chat:null,page:1,people:[],folders:[],items:[],selected:null,chatRows:[],chatPage:1,ticket:0,chatHolder:{owner:owner(),generation,uploads:new Map(),existing:[],pending:null}};
 const d=ui().dialog('c09Communication',oversight?'رقابة التواصل — قراءة فقط':kind==='mail'?'البريد الإلكتروني':'الدردشة',`<div class="c09-app"><div class="c09-toolbar">${button('البريد الإلكتروني','mail')}${button('الدردشة','chat')}${!oversight?button(kind==='mail'?'+ رسالة جديدة':'+ محادثة جديدة','new'):''}<input type="search" data-c09-search placeholder="بحث في ${kind==='mail'?'الرسائل':'المحادثات'}" aria-label="بحث"><span data-c09-sync aria-live="polite"></span>${button('↻','refresh','aria-label="تحديث" title="تحديث"')}</div><div data-c09-error class="c09-error" role="alert" hidden></div><div class="c09-layout"><nav class="c09-folders" aria-label="المجلدات"></nav><section class="c09-list" aria-label="قائمة الرسائل"></section><section class="c09-reader" aria-label="محتوى الرسالة">${empty('اختر '+(kind==='mail'?'رسالة لقراءتها.':'موظفاً لبدء المحادثة.'))}</section></div><small class="c09-policy">المراسلات مخصصة للعمل. يمكن الاطلاع عليها بصلاحية رقابة مستقلة، ويُسجّل كل اطلاع رقابي.</small></div>`,{wide:true,dirty:kind==='chat'&&!oversight});
 s.dialog=d;current=s;d.classList.add('c09-dialog');d.dataset.kind=kind;d.dataset.oversight=String(oversight);
 d.onclose=()=>{if(!d.open&&current===s){current=null;generation++;d.querySelector('.c09-app')?.replaceChildren();}};
 d.onclick=e=>{const b=e.target.closest('[data-c09]');if(b&&!b.disabled)handle(s,b).catch(ex=>error(d,ex));};
 let searchTimer; $('[data-c09-search]',d).oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(alive(s)){s.page=1;loadList(s);}},300);};
 try{s.directory=request('/directory');const [directory,folders]=await Promise.all([s.directory,request('/folders')]);if(!alive(s))return;s.people=directory.people;s.canOversee=directory.canOversee;s.folders=folders;renderFolders(s);await loadList(s);}catch(e){if(alive(s))error(d,e);}
}
function folderName(s){return labels[s.folder]||s.folders.find(f=>String(f.id)===s.folder)?.name||'مجلدي';}
function renderFolders(s){if(s.kind==='mail'&&!s.oversight){const heading=$('.r19-dialog-head h2',s.dialog);if(heading)heading.textContent='البريد الإلكتروني — '+folderName(s);}
const nav=$('.c09-folders',s.dialog);nav.innerHTML=s.oversight?'<strong>رقابة مسجلة</strong><p>عرض فقط؛ لا تعديل لمراسلات الموظفين.</p>':s.kind==='mail'?Object.entries(labels).map(([id,label])=>button(E(label),'folder',`data-id="${id}" aria-current="${s.folder===id?'page':'false'}"`)).join('')+'<hr><b>مجلداتي</b>'+s.folders.map(f=>button(E(f.name),'folder',`data-id="${E(f.id)}" aria-current="${s.folder===f.id?'page':'false'}"`)).join('')+button('+ إدارة المجلدات','folders'):button('+ محادثة جديدة','new');if(s.canOversee&&!s.oversight)nav.insertAdjacentHTML('beforeend','<hr>'+button('رقابة التواصل','oversight'));}
async function loadList(s,quiet=false){const ticket=++s.ticket;try{if(!quiet)clearError(s.dialog);let data;if(s.folder==='drafts'&&s.kind==='mail'&&!s.oversight){data={items:await request('/drafts'),page:1,lastPage:1};}else data=await request('/messages?'+new URLSearchParams({kind:s.kind,folder:s.folder,q:$('[data-c09-search]',s.dialog)?.value||'',page:s.page,oversight:s.oversight?'1':'0'}));if(!alive(s)||ticket!==s.ticket)return;s.items=data.items;s.lastPage=data.lastPage;s.page=data.page;renderList(s);const sync=$('[data-c09-sync]',s.dialog);sync.textContent='محدّث '+new Date().toLocaleTimeString('ar-SY',{hour:'2-digit',minute:'2-digit'});if(s.kind==='chat'&&s.chat&&!s.oversight&&quiet)await loadChat(s,false,true);}catch(e){if(alive(s)&&ticket===s.ticket){if(quiet)$('[data-c09-sync]',s.dialog).textContent='الاتصال متوقف مؤقتاً — إعادة المحاولة تلقائياً';else error(s.dialog,e);}}}
function updateMessagePreviews(host){
 for(const preview of host.querySelectorAll('.c09-preview')){
  const more=preview.nextElementSibling;
  more.hidden=more.dataset.truncated!=='true' && preview.scrollWidth<=preview.clientWidth;
 }
}
function renderList(s){const host=$('.c09-list',s.dialog);host.innerHTML=s.items.map(m=>{const draft=s.folder==='drafts'&&!s.oversight;let title=draft?(m.data.subject||'مسودة بدون عنوان'):s.kind==='mail'?(m.subject||'بدون عنوان'):(m.groupId?m.subject:m.sender_id===s.owner?m.recipients[0]?.name:m.sender_name);const text=draft?m.data.body:m.body;return `<button type="button" class="c09-message ${!m.read_at&&!draft&&!m.is_sender?'c09-unread':''}" data-c09="select" data-id="${E(m.id)}" aria-pressed="${s.selected===m.id}"><span class="c09-message-top"><b>${E(title)}</b><small>${E(stamp(m.created_at||m.updated_at))}</small></span><span>${E(draft?'مسودة':m.sender_name)}</span><small class="c09-preview">${E((text||'مرفق').slice(0,110))}</small><span class="c09-read-more" data-truncated="${(text||'').length>110}" hidden>&#1602;&#1585;&#1575;&#1569;&#1577; &#1575;&#1604;&#1605;&#1586;&#1610;&#1583;</span></button>`;}).join('')||empty(s.kind==='mail'&&!s.oversight?'مجلد «'+E(folderName(s))+'» فارغ.':'لا توجد رسائل هنا.');if(!host.previewObserver){
 host.previewObserver=new ResizeObserver(()=>updateMessagePreviews(host));
 host.previewObserver.observe(host);
}
updateMessagePreviews(host);
if(!s.items.length)return;host.insertAdjacentHTML('beforeend',`<div class="c09-pagination">${button('السابق','prev',s.page<=1?'disabled':'')}<span>${s.page} / ${s.lastPage||1}</span>${button('التالي','next',s.page>=s.lastPage?'disabled':'')}</div>`);}
async function select(s,id){const m=s.items.find(m=>m.id===id);if(!m)return;if(s.folder==='drafts'&&!s.oversight){await compose(s,{...m.data,draftId:m.id});return;}if(s.kind==='chat'&&!s.oversight){guard(s,()=>m.groupId?openChat(s,{groupId:m.groupId,title:m.subject}):choosePeer(s,m.sender_id===s.owner?m.recipients[0]?.id:m.sender_id));return;}
 const ticket=(s.readTicket||0)+1;s.readTicket=ticket;s.selected=id;renderList(s);const message=await request('/messages/'+enc(id));if(!alive(s)||s.selected!==id||s.readTicket!==ticket)return;s.message=message;const readOnly=s.oversight||message.readOnly;
 $('.c09-reader',s.dialog).innerHTML=`<div class="c09-mail-head"><h2>${E(message.subject||'محادثة')}</h2><b>${E(message.sender_name)}</b><small>إلى: ${E(message.recipients.map(p=>p.name).join('، '))} · ${E(stamp(message.created_at))}</small>${!readOnly?`<div class="c09-actions">${button('رد','reply')}${button('رد للجميع','reply-all')}${button('تحويل','forward')}${button(message.starred?'★ مميزة':'☆ تمييز','star')}${button('نقل إلى مجلد','move')}${button('أرشفة','archive')}${button(s.folder==='trash'?'استعادة':'حذف','trash')}${button('غير مقروءة','unread')}</div>`:'<small class="c09-policy">قراءة رقابية مسجلة</small>'}</div><div class="c09-mail-body">${E(message.body)}</div><div class="c09-attachments">${filesHtml(message.attachments)}</div>`;
 if(!readOnly){await request('/read',{method:'POST',body:{ids:[id]}});if(!alive(s))return;m.read_at=new Date().toISOString();renderList(s);counts();}
}
function choosePeer(s,id) {
 if(!id)return;
 const person=s.people.find(p=>String(p.id)===String(id));
 return openChat(s,{peer:String(id),title:person?.name||'محادثة الموظف',department:person?.department||''});
}
async function openChat(s,chat) {
 if(!alive(s))return;
 s.chat=chat;s.chatRows=[];s.chatPage=1;s.chatHolder={owner:s.owner,generation,uploads:new Map(),existing:[],pending:null};
 $('.c09-reader',s.dialog).innerHTML=`<div class="c09-chat-head"><b>${E(chat.title)}</b><small>${E(chat.department||(chat.groupId?'محادثة جماعية':''))}</small></div><div class="c09-chat-scroll" tabindex="0" aria-label="رسائل المحادثة"><div class="c09-chat-history"></div></div><button type="button" class="c09-new-messages btn" data-c09="bottom" hidden>رسائل جديدة ↓</button><form class="c09-chat-compose"><label class="sr-only" for="c09ChatText">الرسالة</label><textarea id="c09ChatText" name="message" rows="2" maxlength="20000" placeholder="اكتب رسالة…"></textarea><div class="c09-actions"><label class="btn c09-attach">📎 مرفقات<input type="file" multiple name="chatFiles" aria-label="مرفقات الرسالة"></label><span data-c09-filenames></span><button type="submit" class="btn primary">إرسال</button></div></form>`;
 const f=$('form',s.dialog);f.onsubmit=e=>{e.preventDefault();sendChat(s).catch(ex=>error(s.dialog,ex));};
 $('input[type=file]',f).onchange=e=>$('[data-c09-filenames]',f).textContent=[...e.target.files].map(f=>f.name).join('، ');
 snapshot(s.dialog);s.dialog._r19TrackDirty=true;await loadChat(s,true);
}

function chatMessage(s,m) {
 if(m.groupId===m.id)return `<p class="c09-group-created">${E(m.body)}</p>`;
 const mine=String(m.sender_id)===s.owner;
 const sender=m.groupId&&!mine?'<b class="c09-bubble-sender">'+E(m.sender_name)+'</b>':'';
 return `<article class="c09-bubble ${mine?'mine':''}">${sender}<div>${E(m.body)}</div><div class="c09-attachments">${filesHtml(m.attachments)}</div><small>${E(stamp(m.created_at))}${mine?' · '+(Object.keys(m.readBy||{}).length?'تمت القراءة':'تم الإرسال'):''}</small></article>`;
}
async function loadChat(s,initial=false,quiet=false,older=false){const chat=s.chat,sc=$('.c09-chat-scroll',s.dialog);if(!chat||!sc)return;const page=older?s.chatPage+1:1;try{const scope=chat.groupId?{groupId:chat.groupId}:{peer:chat.peer};const result=await request('/messages?'+new URLSearchParams({kind:'chat',...scope,page}));if(!alive(s)||s.chat!==chat)return;const atBottom=sc.scrollHeight-sc.scrollTop-sc.clientHeight<70,oldHeight=sc.scrollHeight,oldTop=sc.scrollTop;const byId=new Map(s.chatRows.map(m=>[m.id,m]));for(const m of result.items)byId.set(m.id,m);const rows=[...byId.values()].sort((a,b)=>a.id.localeCompare(b.id));const changed=JSON.stringify(rows)!==JSON.stringify(s.chatRows);s.chatRows=rows;if(older)s.chatPage=page;s.chatLastPage=result.lastPage;
 if(changed||initial){$('.c09-chat-history',sc).innerHTML=(s.chatPage<result.lastPage?button('رسائل أقدم','older'):'')+rows.map(m=>chatMessage(s,m)).join('');if(initial||(!older&&atBottom))sc.scrollTop=sc.scrollHeight;else if(older)sc.scrollTop=oldTop+(sc.scrollHeight-oldHeight);else $('[data-c09="bottom"]',s.dialog).hidden=false;}
 if(!document.hidden){const ids=rows.filter(m=>m.sender_id!==s.owner&&!m.read_at).slice(-100).map(m=>m.id);if(ids.length){await request('/read',{method:'POST',body:{ids}});rows.filter(m=>ids.includes(m.id)).forEach(m=>m.read_at=new Date().toISOString());counts();}}
 }catch(e){if(!quiet&&alive(s)&&s.chat===chat)error(s.dialog,e);}}
async function sendChat(s){const chat=s.chat;if(!chat||!alive(s)||s.dialog.getAttribute('aria-busy')==='true')return;const f=$('form',s.dialog),text=$('textarea',f),input=$('input[type=file]',f);if(!text.value.trim()&&!input.files.length){window.MoshValidation09.report([[text,'اكتب رسالة أو أرفق ملفاً.']]);return;}busy(s.dialog,true);clearError(s.dialog);try{const keys=await upload(input,s.chatHolder);const target=chat.groupId?{groupId:chat.groupId}:{recipientIds:[chat.peer]};await send(s.chatHolder,{kind:'chat',...target,body:text.value,attachmentKeys:keys});if(!alive(s)||s.chat!==chat)return;text.value='';input.value='';$('[data-c09-filenames]',f).textContent='';s.chatHolder={owner:s.owner,generation,uploads:new Map(),existing:[],pending:null};snapshot(s.dialog);await loadChat(s,true);await loadList(s,true);const next=s.dialog._r19AfterSave;s.dialog._r19AfterSave=null;next?.();}catch(e){error(s.dialog,e);}finally{if(alive(s))busy(s.dialog,false);}}
async function compose(s,seed={}){const who=owner(),holder={owner:who,generation,uploads:new Map(),existing:seed.attachmentKeys||[],pending:null};const d=ui().dialog('c09Compose','رسالة بريد جديدة',`<form class="c09-compose"><label>إلى <input type="search" data-recipient-search placeholder="ابحث باسم الموظف أو القسم"></label><fieldset class="c09-recipients"><legend>اختر المستلمين</legend>${s.people.map(p=>`<label data-person="${E(p.name+' '+(p.department||''))}"><input type="checkbox" name="recipient" value="${E(p.id)}" ${(seed.recipientIds||[]).includes(p.id)?'checked':''}><span>${E(p.name)} <small>${E(p.department||'')}</small></span></label>`).join('')}</fieldset><label>الموضوع<input name="subject" required maxlength="250" value="${E(seed.subject||'')}"></label><label>الرسالة<textarea name="body" rows="9" maxlength="20000">${E(seed.body||'')}</textarea></label>${holder.existing.length?`<p>${holder.existing.length} مرفق محفوظ مع الرسالة.</p>`:''}<label>المرفقات<input type="file" name="attachments" multiple></label><div data-c09-error class="c09-error" role="alert" hidden></div><footer class="c09-actions"><button type="submit" class="btn primary">إرسال</button>${button('حفظ مسودة','save-draft')}${seed.draftId?button('حذف المسودة','delete-draft'):''}<button type="button" class="btn" data-r19-close="c09Compose">إلغاء</button></footer></form>`,{wide:true,dirty:true});d.classList.add('c09-compose-dialog');const f=$('form',d);$('[data-recipient-search]',d).oninput=e=>all('[data-person]',d).forEach(p=>p.hidden=!p.dataset.person.includes(e.target.value.trim()));
 const payload=async()=>({recipientIds:all('[name=recipient]:checked',d).map(x=>x.value),subject:$('[name=subject]',d).value,body:$('[name=body]',d).value,attachmentKeys:await upload($('[name=attachments]',d),holder),replyTo:seed.replyTo||null});
 f.onsubmit=async e=>{e.preventDefault();if(d.getAttribute('aria-busy')==='true')return;const errors=[];if(!all('[name=recipient]:checked',d).length)errors.push([$('[name=recipient]',d),'اختر مستلماً واحداً على الأقل.']);if(!$('[name=body]',d).value.trim()&&!$('[name=attachments]',d).files.length&&!holder.existing.length)errors.push([$('[name=body]',d),'اكتب رسالة أو أرفق ملفاً.']);if(!window.MoshValidation09.report(errors))return;busy(d,true);clearError(d);try{await send(holder,{kind:'mail',...await payload(),draftId:seed.draftId||null});if(who!==owner())return;ui().close(d.id,true);ui().toast('تم إرسال البريد.');if(alive(s))await loadList(s);counts();}catch(ex){error(d,ex);}finally{if(who===owner())busy(d,false);}};
 $('[data-c09="save-draft"]',d).onclick=async()=>{if(d.getAttribute('aria-busy')==='true')return;busy(d,true);try{await communicationRequest(holder,'/drafts',{method:'POST',body:{...await payload(),id:seed.draftId||null}});if(who!==owner())return;ui().close(d.id,true);ui().toast('تم حفظ المسودة.');if(alive(s))await loadList(s);}catch(ex){error(d,ex);}finally{if(who===owner())busy(d,false);}};
 $('[data-c09="delete-draft"]',d)?.addEventListener('click',async()=>{if(!await MoshConfirm09('حذف هذه المسودة؟'))return;try{await communicationRequest(holder,'/drafts/'+enc(seed.draftId),{method:'DELETE'});if(who!==owner())return;ui().close(d.id,true);if(alive(s))loadList(s);}catch(ex){error(d,ex);}});
}
function personName(person) {
 return `<span class="c09-person-label"><span>${E(person.name)}</span>${person.department?' <small>'+E(person.department)+'</small>':''}</span>`;
}

async function newChat(s) {
 const directory=await s.directory;
 if(!alive(s))return;
 s.people=directory.people;
 const d=ui().dialog('c09People','محادثة جديدة',`
  <div class="c09-new-tools">
   <input type="search" placeholder="ابحث عن موظف" aria-label="البحث عن موظف">
   ${button('إنشاء مجموعة','new-group',s.people.length<2?'disabled':'')}
  </div>
  <div class="c09-people">${s.people.map(p=>button(personName(p),'person',`data-id="${E(p.id)}"`)).join('')||empty('لا يوجد موظفون متاحون.')}</div>`);
 $('input',d).oninput=e=>all('[data-id]',d).forEach(b=>b.hidden=!b.textContent.includes(e.target.value.trim()));
 d.onclick=e=>{
  const action=e.target.closest('[data-c09]');
  if(!action||action.disabled||!alive(s))return;
  ui().close(d.id,true);
  if(action.dataset.c09==='new-group')guard(s,()=>createChatGroup(s));
  else if(action.dataset.id)guard(s,()=>choosePeer(s,action.dataset.id));
 };
}

function createChatGroup(s) {
 if(!alive(s))return;
 const holder={owner:s.owner,generation,pending:null};
 const d=ui().dialog('c09Group','إنشاء مجموعة',`
  <form class="c09-compose">
   <label>اسم المجموعة<input name="name" required maxlength="150"></label>
   <label>البحث عن عضو<input type="search" data-recipient-search placeholder="اسم الموظف أو القسم"></label>
   <fieldset class="c09-recipients"><legend>اختر موظفَين على الأقل</legend>
    ${s.people.map(p=>`<label data-person="${E(p.name+' '+(p.department||''))}"><input type="checkbox" name="recipient" value="${E(p.id)}">${personName(p)}</label>`).join('')}
   </fieldset>
   <div data-c09-error class="c09-error" role="alert" hidden></div>
   <footer class="c09-actions">
    <button type="submit" class="btn primary" disabled>إنشاء المجموعة</button>
    <button type="button" class="btn" data-r19-close="c09Group">إلغاء</button>
    <span data-c09-member-count aria-live="polite">الأعضاء المحددون 0</span>
   </footer>
  </form>`,{dirty:true});
 const form=$('form',d), submit=$('[type=submit]',form);
 const chosen=()=>all('[name=recipient]:checked',form).map(input=>input.value);
 const sync=()=>{
  const count=chosen().length;
  submit.disabled=count<2||count>50;
  $('[data-c09-member-count]',d).textContent='الأعضاء المحددون '+count+(count>50?' (الحد الأقصى 50)':'');
 };
 $('[data-recipient-search]',form).oninput=e=>all('[data-person]',form).forEach(row=>row.hidden=!row.dataset.person.includes(e.target.value.trim()));
 form.onchange=sync;
 form.onsubmit=async e=>{
  e.preventDefault();
  if(!alive(s)||!d.open||submit.disabled||d.getAttribute('aria-busy')==='true'||!form.reportValidity())return;
  const name=form.elements.name.value.trim();
  if(!name){error(d,new Error('اكتب اسم المجموعة.'));return;}
  busy(d,true);clearError(d);
  try{
   const group=await send(holder,{name,recipientIds:chosen()},'/chat-groups');
   if(!alive(s)||!d.open)return;
   ui().close(d.id,true);
   openChat(s,{groupId:group.groupId,title:group.subject});
   void loadList(s);
  }catch(ex){if(alive(s)&&d.open)error(d,ex);}
  finally{if(alive(s)){busy(d,false);sync();}}
 };
}
async function folders(s){const d=ui().dialog('c09Folders','مجلداتي',`<form class="c09-actions"><input name="name" required maxlength="80" placeholder="اسم المجلد" aria-label="اسم المجلد"><button class="btn primary" type="submit">إضافة</button></form><div data-c09-error class="c09-error" role="alert" hidden></div><div class="c09-folder-editor">${s.folders.map(f=>`<div data-folder="${E(f.id)}"><input value="${E(f.name)}" maxlength="80" aria-label="اسم المجلد">${button('حفظ الاسم','rename')}${button('حذف','delete')}</div>`).join('')}</div><p class="c09-policy">حذف المجلد يعيد رسائله إلى الوارد أو المرسل؛ لا يحذف الرسائل.</p>`);async function refresh(){s.folders=await request('/folders');if(!alive(s))return;renderFolders(s);ui().close(d.id,true);folders(s);}
 $('form',d).onsubmit=async e=>{e.preventDefault();try{await request('/folders',{method:'POST',body:{name:$('[name=name]',d).value}});await refresh();}catch(ex){error(d,ex);}};d.onclick=async e=>{const b=e.target.closest('[data-c09]'),row=b?.closest('[data-folder]');if(!row)return;try{if(b.dataset.c09==='delete'){if(!await MoshConfirm09('حذف المجلد مع الاحتفاظ برسائله؟'))return;await request('/folders/'+enc(row.dataset.folder),{method:'DELETE'});if(s.folder===row.dataset.folder)s.folder='inbox';}else await request('/folders/'+enc(row.dataset.folder),{method:'PATCH',body:{name:$('input',row).value}});await refresh();await loadList(s);}catch(ex){error(d,ex);}};}
async function move(s){const d=ui().dialog('c09Move','نقل إلى مجلد',`<div class="c09-people">${button('الوارد / المرسل','move','data-id=""')}${s.folders.map(f=>button(E(f.name),'move',`data-id="${E(f.id)}"`)).join('')}</div>`);d.onclick=async e=>{const b=e.target.closest('[data-id]');if(!b)return;try{await request('/messages/'+enc(s.selected),{method:'PATCH',body:{folderId:b.dataset.id||null}});ui().close(d.id,true);if(alive(s)){s.selected=null;$('.c09-reader',s.dialog).innerHTML=empty('تم نقل الرسالة.');await loadList(s);}}catch(ex){error(d,ex);}};}
async function handle(s,b){const act=b.dataset.c09;if(act==='download')return download(b.dataset.key);if(!alive(s))return;if(act==='mail'||act==='chat')return open(act,s.oversight);if(act==='oversight')return open(s.kind,true);if(act==='refresh')return loadList(s);if(act==='new')return s.kind==='mail'?compose(s):newChat(s);if(act==='folders')return folders(s);if(act==='folder'){s.folder=b.dataset.id;s.page=1;s.selected=null;s.message=null;s.items=[];$('.c09-list',s.dialog).textContent='جارٍ تحميل '+folderName(s)+'…';$('.c09-reader',s.dialog).innerHTML=empty('اختر رسالة لقراءتها.');renderFolders(s);return loadList(s);}if(act==='select')return select(s,b.dataset.id);if(act==='prev'||act==='next'){s.page+=act==='next'?1:-1;return loadList(s);}if(act==='older')return loadChat(s,false,false,true);if(act==='bottom'){const sc=$('.c09-chat-scroll',s.dialog);sc.scrollTop=sc.scrollHeight;b.hidden=true;return;}if(!s.message||s.oversight)return;const m=s.message;
 if(['reply','reply-all','forward'].includes(act)){let ids=act==='forward'?[]:act==='reply-all'?[m.sender_id,...m.recipients.map(p=>p.id)]:[String(m.sender_id)===s.owner?m.recipients[0]?.id:m.sender_id];ids=[...new Set(ids)].filter(x=>x&&x!==s.owner&&s.people.some(p=>p.id===x));return compose(s,{recipientIds:ids,subject:(act==='forward'?'تحويل: ':'رد: ')+m.subject,body:'\n\n—— '+m.sender_name+' · '+stamp(m.created_at)+' ——\n'+m.body,replyTo:act==='forward'?null:m.id,attachmentKeys:act==='forward'?m.attachments.map(f=>f.key):[]});}
 if(act==='move')return move(s);let payload;if(act==='star')payload={starred:!m.starred};if(act==='archive')payload={box:'archive'};if(act==='trash')payload={box:s.folder==='trash'?'inbox':'trash'};if(act==='unread')payload={unread:true};if(payload){await request('/messages/'+enc(m.id),{method:'PATCH',body:payload});if(!alive(s))return;if(act==='star'){m.starred=!m.starred;b.textContent=m.starred?'★ مميزة':'☆ تمييز';}else{s.selected=null;$('.c09-reader',s.dialog).innerHTML=empty('تم تحديث الرسالة.');}await loadList(s);counts();}}
let lastCounts=null,countsBusy=false;
async function counts(){
 const who=owner(),session=generation;if(!who||document.hidden||countsBusy)return;
 countsBusy=true;
 try{
  const n=await request('/counts');if(who!==owner()||session!==generation)return;
  const notices=[];
  for(const kind of ['chat','mail']){
   all('[data-c09-count='+kind+']').forEach(b=>{b.textContent=n[kind]>99?'99+':String(n[kind]||'');b.hidden=!n[kind];});
   if(lastCounts?.who===who&&n[kind]>lastCounts[kind])notices.push(kind==='mail'?'وصلك بريد جديد':'وصلتك رسالة دردشة');
  }
  lastCounts={who,chat:n.chat,mail:n.mail};
  if(!api().isSaving?.()&&typeof state!=='undefined'){
   const local=new Map((state.salesTasks||[]).map(t=>[String(t.id),t]));
   let changed=false;
   for(const ref of n.assignedTasks||[]){
    const old=local.get(ref.id);if(Number(old?._version)>=ref.version)continue;
    const t=await api().request('/tasks/'+enc(ref.id));
    if(owner()!==who||generation!==session)return;
    if(!window.MoshEmployeeTasks41?.isMine(t))continue;
    const newlyAssigned=!old||!window.MoshEmployeeTasks41.isMine(old);
    api().acceptCreatedTask(t,who);changed=true;
    if(newlyAssigned)notices.push('مهمة جديدة: '+t.title);
   }
   if(changed){
    document.dispatchEvent(new CustomEvent('mosh:tasks-refreshed'));
    const view=document.querySelector('.view.active'),key=view?.id.replace(/App$/,'');
    const workspace=typeof getProductiveConfig==='function'&&key?getProductiveConfig(key)?.workspaceId:null;
    const box=workspace&&document.getElementById(workspace);
    if(box?.querySelector('.design-board-head')&&!box.querySelector('.sales-task-card')&&typeof productiveTaskViewModes!=='undefined'&&productiveTaskViewModes[key]==='running'&&!view.contains(document.activeElement))renderProductiveRunningTasks(key);
   }
  }
  if(notices.length)ui().toast(notices.join(' · '));
 }catch(_){}finally{countsBusy=false;}
}
function install(){if(!owner()||!window.MoshAuth37)return;const nav=$('#appSidebar .nav');if(nav&&!$('#c09Nav')){const block=document.createElement('div');block.id='c09Nav';block.innerHTML='<small>التواصل</small>'+button('✉ البريد الإلكتروني <span data-c09-count="mail" hidden></span>','mail')+button('◌ الدردشة <span data-c09-count="chat" hidden></span>','chat');block.onclick=e=>{const b=e.target.closest('[data-c09]');if(b)open(b.dataset.c09);};nav.append(block);}const top=$('.top-actions');if(top&&!$('#c09Shortcut')){const b=document.createElement('button');b.id='c09Shortcut';b.className='btn r35-ui-navigation';b.type='button';b.title='الدردشة';b.setAttribute('aria-label','الدردشة');b.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></svg><span data-c09-count="chat" hidden></span>';b.onclick=()=>open('chat');top.append(b);}counts();}
async function poll(){if(pollBusy||!owner()||document.hidden)return;pollBusy=true;try{await counts();if(current&&alive(current)&&current.dialog.getAttribute('aria-busy')!=='true')await loadList(current,true);}finally{pollBusy=false;}}
setInterval(poll,5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
for(const type of ['mosh:ui-ready','mosh:login-complete'])document.addEventListener(type,install);for(const type of ['mosh:logout-complete','mosh:session-expired'])document.addEventListener(type,()=>{generation++;lastCounts=null;current=null;all('dialog[id^=c09]').forEach(d=>{d._r19AfterSave=null;ui().close(d.id,true);d.replaceChildren();});all('[data-c09-count]').forEach(b=>b.hidden=true);});
window.MoshCommunication09={open};install();
})();
