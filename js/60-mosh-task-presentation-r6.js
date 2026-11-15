/* R6 presentation only. IDs stay in state and handler attributes, not human labels. */
(function(){'use strict';
 const text=v=>String(v==null?'':v).trim(),esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const title=t=>text(t?.title||t?.name)||'مهمة بدون عنوان';
 const client=t=>text(t?.customer||t?.customerName)||'بدون عميل محدد';
 const all=()=>{try{return Array.isArray(state.salesTasks)?state.salesTasks:[]}catch(_){return []}};
 const relatedTitle=r=>title(all().find(t=>String(t.id)===String(r?.taskId))||{title:r?.taskTitle||'بدون مهمة مرتبطة'});
 function historyText(value){let s=text(value);const refs=[];for(const t of all())for(const v of [t.taskNo,t.number,typeof t.id==='string'&&t.id.length>=12?t.id:null]){const k=text(v);if(k.length>=6)refs.push([k,title(t)]);}refs.sort((a,b)=>b[0].length-a[0].length);for(const [k,label]of refs){s=s.split('#'+k).join(label);s=s.split(k).join(label);}return s;}
 window.MoshTaskUI={title,client,label:t=>[title(t),text(t?.customer)].filter(Boolean).join(' — '),relatedTitle,
  nameHtml:t=>'<span class="mt54-task-name">'+esc(title(t))+'</span>',
  clientHtml:t=>'<span class="mt54-client-name">'+esc(client(t))+'</span>',
  identityHtml:t=>'<div class="mt54-identity"><b class="mt54-task-name">'+esc(title(t))+'</b><span class="mt54-client-name">'+esc(client(t))+'</span></div>',
  historyText,arg:v=>esc(JSON.stringify(v)),version:'R6'};
})();
