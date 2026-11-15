(function(){
'use strict';
if(window.MoshFieldAdminSyncV30C)return;
var VERSION='30C';
var busy=false;
function arr(v){return Array.isArray(v)?v:[]}
function clean(v){return String(v==null?'':v).trim()}
function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm(v){return clean(v).toLocaleLowerCase('ar').replace(/[\s\u0640]+/g,' ').trim()}
function dayKey(v){var d=v?new Date(v):new Date();if(isNaN(d.getTime()))d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function timeText(v){if(!v)return '—';try{return new Date(v).toLocaleTimeString('ar-SY',{hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function profiles(){try{return arr(state.staffProfiles)}catch(e){return []}}
function settings(){try{return state.fieldWorkSettingsV30B||{templates:[]}}catch(e){return {templates:[]}}}
function fieldData(){try{return state.fieldWorkV30B&&state.fieldWorkV30B.employees?state.fieldWorkV30B.employees:{}}catch(e){return {}}}
function template(id){return arr(settings().templates).find(function(t){return clean(t&&t.id)===clean(id)})||null}
function itemLabel(list,id){var x=arr(list).find(function(a){return clean(a&&a.id)===clean(id)});return clean(x&&x.label)}
function fieldMode(p){var m=clean(p&&p.workMode);return m==='ميداني'||m==='مختلط'}
function recForProfile(p){
 var data=fieldData(),keys=[p&&p.id,p&&p.username,p&&p.systemUsername,p&&p.name].map(clean).filter(Boolean);
 for(var i=0;i<keys.length;i++){if(data[keys[i]])return data[keys[i]]}
 var vals=Object.keys(data).map(function(k){return data[k]}),pn=norm(p&&p.name),pid=clean(p&&p.id);
 return vals.find(function(r){return (pid&&clean(r&&r.employeeId)===pid)||(pn&&norm(r&&r.name)===pn)})||null
}
function todayActs(r){return arr(r&&r.activities).filter(function(a){return dayKey(a&&a.at)===dayKey()}).sort(function(a,b){return String(a&&a.at||'').localeCompare(String(b&&b.at||''))})}
function latestAct(r){var a=todayActs(r);return a.length?a[a.length-1]:null}
function meaningfulAct(r){var a=todayActs(r).filter(function(x){var k=clean(x&&x.kind),l=clean(x&&x.label);return k==='activity'||(l&&l.indexOf('تغيير الحالة:')!==0&&l!=='بدء العمل'&&l!=='استئناف العمل'&&l!=='بدء استراحة'&&l!=='إنهاء العمل'&&l!=='لا يوجد عمل لدي')});return a.length?a[a.length-1]:latestAct(r)}
function signal(p){
 if(!p||p.active===false||!fieldMode(p)||!clean(p.fieldTemplateId))return null;
 var r=recForProfile(p);if(!r)return null;var t=template(p.fieldTemplateId||r.fieldTemplateId),stateKey=clean(r.workState),last=latestAct(r),work=meaningfulAct(r);
 var status=itemLabel(t&&t.statuses,r.currentStatus),tplLabel=clean(t&&t.label)||'عمل ميداني';
 var latestAt=clean((last&&last.at)||r.statusAt||r.shiftStartAt||r.endedAt),detail=status||clean(work&&work.label)||'عمل ميداني';
 var category=stateKey==='working'?'working':stateKey==='break'?'break':stateKey==='no_work'?'no_work':stateKey==='ended'?'off':'';
 return {record:r,template:t,templateLabel:tplLabel,status:status,activity:clean(work&&work.label),task:clean((work&&work.task)||''),note:clean(work&&work.note),latestAt:latestAt,category:category,detail:detail}
}
function findProfileFromRow(row){
 var tds=row&&row.querySelectorAll?row.querySelectorAll('td'):[];if(!tds.length)return null;var txt=norm(tds[0].textContent);
 if(!txt)return null;var ps=profiles();
 var exact=ps.find(function(p){var n=norm(p&&p.name);return n&&txt.indexOf(n)>-1});if(exact)return exact;
 return ps.find(function(p){var n=norm(p&&p.name);if(!n)return false;var parts=n.split(' ').filter(Boolean);return parts.length&&parts.every(function(x){return txt.indexOf(x)>-1})})||null
}
function patchRow(row,p,s){
 var td=row.querySelectorAll('td');if(td.length<3)return;
 if(s.category==='working'){
  row.dataset.fw30cCategory='working';
  if(td[1])td[1].innerHTML='<span class="fw30c-field-badge">عمل ميداني</span>';
  if(td[2]){
   var main=s.status||s.activity||'عمل ميداني',sub=[];
   if(s.activity&&s.activity!==main)sub.push('آخر نشاط: '+s.activity);
   if(s.task)sub.push('المهمة: '+s.task);
   if(s.note)sub.push(s.note);
   td[2].innerHTML='<div class="fw30c-field-current"><b>'+esc(main)+'</b>'+(sub.length?'<small>'+esc(sub.join(' · '))+'</small>':'')+'</div>';
  }
  if(td[3]&&s.record.shiftStartAt)td[3].textContent=timeText(s.record.shiftStartAt)+' بدء العمل';
  if(td[4]&&s.latestAt)td[4].textContent='منذ الآن · '+timeText(s.latestAt);
 }else if(s.category==='break'){
  row.dataset.fw30cCategory='break';
  if(td[1])td[1].innerHTML='<span class="fw30c-field-badge" style="color:#d7c990;border-color:#655d3c;background:#262418">استراحة</span>';
  if(td[2])td[2].innerHTML='<div class="fw30c-field-current"><b>'+(s.status?esc(s.status):'عمل ميداني')+'</b><small>آخر نشاط: '+esc(s.activity||'بدء استراحة')+'</small></div>';
 }else if(s.category==='no_work'){
  row.dataset.fw30cCategory='no_work';
  if(td[1])td[1].textContent='لا يوجد عمل لديهم';
 }else if(s.category==='off'){
  row.dataset.fw30cCategory='off';
 }
}
function classifyRow(row){
 var forced=row.dataset.fw30cCategory;if(forced)return forced;
 var td=row.querySelectorAll('td'),txt=norm((td[1]&&td[1].textContent)||row.textContent);
 if(txt.indexOf('استراحة')>-1)return 'break';
 if(txt.indexOf('لا يوجد عمل')>-1)return 'no_work';
 if(txt.indexOf('خامل')>-1)return 'idle';
 if(txt.indexOf('بدون مهمة')>-1)return 'no_task';
 if(txt.indexOf('خارج العمل')>-1||txt.indexOf('لم يبدأ')>-1||txt.indexOf('انتهى')>-1)return 'off';
 if(txt.indexOf('يعمل')>-1||txt.indexOf('عمل ميداني')>-1)return 'working';
 return ''
}
function setKpi(root,label,count){
 var nodes=Array.prototype.slice.call(root.querySelectorAll('div,section,article'));
 var cands=nodes.filter(function(el){var tx=norm(el.textContent);return tx.indexOf(norm(label))>-1&&el.querySelectorAll('div,span,b,strong').length>0});
 cands.sort(function(a,b){return clean(a.textContent).length-clean(b.textContent).length});
 for(var i=0;i<cands.length;i++){
  var leaves=Array.prototype.slice.call(cands[i].querySelectorAll('b,strong,span,div')).filter(function(x){return /^\s*\d+\s*$/.test(x.textContent||'')&&x.children.length===0});
  if(leaves.length){leaves[0].textContent=String(count);return true}
 }
 return false
}
function patch(){
 if(busy)return;var root=document.getElementById('adminWorkProofContent');if(!root||root.style.display==='none'||root.hidden)return;busy=true;
 try{
  var rows=Array.prototype.slice.call(root.querySelectorAll('table tbody tr'));
  rows.forEach(function(row){var p=findProfileFromRow(row);if(!p)return;var s=signal(p);if(s)patchRow(row,p,s)});
  var counts={working:0,no_task:0,no_work:0,idle:0,break:0,off:0};
  rows.forEach(function(r){var k=classifyRow(r);if(counts.hasOwnProperty(k))counts[k]++});
  setKpi(root,'يعملون الآن',counts.working);
  setKpi(root,'بدون مهمة نشطة',counts.no_task);
  setKpi(root,'لا يوجد عمل لديهم',counts.no_work);
  setKpi(root,'خاملون',counts.idle);
  setKpi(root,'استراحة',counts.break);
  setKpi(root,'خارج العمل',counts.off);
 }catch(e){console.error('field/admin sync',e)}finally{busy=false}
}
function wrapOpen(){
 var fn=window.openWorkProofAdmin;if(typeof fn!=='function'||fn.__fw30c)return;
 var wrapped=function(){var r=fn.apply(this,arguments);setTimeout(patch,40);setTimeout(patch,180);setTimeout(patch,600);return r};wrapped.__fw30c=true;window.openWorkProofAdmin=wrapped;try{openWorkProofAdmin=wrapped}catch(e){}
}
function init(){wrapOpen();setTimeout(patch,500);setInterval(function(){wrapOpen();patch()},1200)}
window.MoshFieldAdminSyncV30C={refresh:patch,signal:signal,version:VERSION};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
