(function(){'use strict';const $a={render:window.renderProductiveDistributionBoard,open:window.openProductiveDistributionPage,running:window.openProductiveRunningTasksPage,go:window.goApp};const $b={},$c=new Set(['completed','awaiting_invoice','invoiced','archived_invoiced','archived_no_invoice']);const $d={attention:'بحاجة متابعة',unassigned:'بانتظار التوزيع',overdue:'متأخرة',today:'تسليم اليوم',review:'بانتظار المراجعة',revision:'للتعديل',paused:'متوقفة',nodate:'بلا موعد',assigned:'الموزعة',all:'كل المفتوحة',done:'المنجزة'};const $e={week:'آخر 7 أيام',month:'الشهر الحالي',thirty:'آخر 30 يوم',all:'كل الفترة'};const arr=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[],$f=v=>String(v||'').trim(),num=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;const E=v=>esc(v),cfg=k=>getProductiveConfig(k),$g=d=>Object.keys(PRODUCTIVE_DEPARTMENTS).find(k=>cfg(k).department===d)||'';function ui(k){return $b[k]||($b[k]={scope:'all',employee:'all',period:'month',filter:'all',search:'',page:1});}function $h(v){if(typeof v==='number')return Number.isFinite(v)&&v>0?v:0;const s=String(v||'').trim();if(!s)return 0;const iso=s.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/,'$1T$2');if(!/^\d{4}-\d{2}-\d{2}/.test(iso))return 0;const t=new Date(iso.length===10?iso+'T00:00:00':iso).getTime();return Number.isFinite(t)?t:0;}function due(t){const s=String(t.dueDate||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return 0;return $h(s+'T23:59:59.999');}function $i(t){return $c.has(t.status);}function end(t){return $h(t.closedAt)||$h(t.completedAt)||$h(t.workTiming?.finishedAt);}function $j(t){return t.closedFromDepartment||t.department||'';}function $k(p,now){const d=new Date(now),$l=p==='all'?0:p==='month'?new Date(d.getFullYear(),d.getMonth(),1).getTime():new Date(d.getFullYear(),d.getMonth(),d.getDate()-(p==='week'?6:29)).getTime();return[$l,now];}function $m(v){const d=new Date(v);return[d.getFullYear(),d.getMonth(),d.getDate()].join('-');}function $n(t,now){const d=due(t);return{unassigned:!$f(t.assignee),overdue:!!d&&d<now,today:!!d&&$m(d)===$m(now),review:t.employeeState==='submitted',revision:!!t.returnedForRevision,paused:t.employeeState==='paused',nodate:!d,assigned:!!$f(t.assignee),all:true};}function $o(t,f,now){const x=$n(t,now);return f==='attention'?x.unassigned||x.overdue||x.today||x.review||x.revision||x.paused:x[f]||false;}function $p(a,now){const $q=Object.keys($d).filter(x=>!['attention','done'].includes(x)),r={attention:0};$q.forEach(k=>r[k]=0);a.forEach(t=>{const f=$n(t,now);$q.forEach(k=>{if(f[k])r[k]++;});if(f.unassigned||f.overdue||f.today||f.review||f.revision||f.paused)r.attention++;});return r;}function $r(v){if(!(v>0))return'—';const m=Math.round(v/60000);return m<60?m+' د':Math.floor(m/60)+' س '+m%60+' د';}function $s(k){const v=ui(k),c=cfg(k),now=Date.now(),$t=k==='admin'?(v.scope==='all'?'':v.scope):c.department,all=arr(state.salesTasks).filter(t=>window.MoshEmployeeTasks41?.isMine?.(t)),$u=$k(v.period,now);
 const $v=all.filter(t=>t.status==='in_progress'&&(!$t||t.department===$t));const $w=all.filter(t=>$i(t)&&(!$t||$j(t)===$t));const $x=$w.filter(t=>{const n=end(t);return n&&n>=$u[0]&&n<=$u[1];});const $y=[];const add=(n,p,dep)=>{n=$f(n);if(n&&!$y.some(x=>x.name===n))$y.push({name:n,profile:p,department:dep||p?.department||''});};$v.concat($x).forEach(t=>{if($f(t.assignee))add(t.assignee,getStaffProfileByName(t.assignee),t.department==='المحاسبة'&&$i(t)?$j(t):t.department);});$y.sort((a,b)=>a.name.localeCompare(b.name,'ar'));if(v.employee!=='all'&&!$y.some(p=>p.name===v.employee))v.employee='all';const own=t=>v.employee==='all'||$f(t.assignee)===v.employee,$z=$v.filter(own),$aa=$x.filter(own);const m=$p($z,now),$ab=$aa.filter(t=>num(t.workTiming?.totalMs)>0),sum=$ab.reduce((n,t)=>n+num(t.workTiming.totalMs),0),$ac=$aa.filter(t=>due(t)&&end(t));return{k,v,c,now,department:$t,all,active:$v,completed:$x,people:$y,live:$z,done:$aa,m,timed:$ab,sum,dated:$ac,onTime:$ac.filter(t=>end(t)<=due(t)).length,undated:$w.filter(t=>!end(t)&&own(t)).length};}const $ad=($ae,$af,$ag='',cls='')=>`<button type="button" class="db9-button ${cls}" data-action="${$af}" data-value="${E($ag)}">${$ae}</button>`;function $ah($ai,$aj,$ak,$al){return`<label class="db9-field"><span>${$aj}</span><select data-field="${$ai}" aria-label="${$aj}">${$ak.map(([v,t])=>`<option value="${E(v)}" ${v===$al?'selected':''}>${E(t)}</option>`).join('')}</select></label>`;}function $am(k,$an){const c=cfg(k);if(!c)return;if(k==='hr'){['hrProContent','hrStaffConfigContent','hrStandaloneContent'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});document.querySelectorAll('#hrProNav button').forEach(b=>b.classList.remove('active'));}if(k==='accounting')['accountingPackagesContent','accountingBillingContent','accountingInvoicesContent'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});if(k==='purchases'||k==='logistics'){const e=document.getElementById(k+'RequestsContent');if(e)e.style.display='none';}if(k==='admin'){const e=document.getElementById($an==='running'?'adminTabRunning':'adminTabDistribution');if(e)e.checked=true;}if(k==='design')document.getElementById('designWorkReportTab')?.classList.remove('active');const $ao=document.getElementById(c.contentId);if($ao)$ao.style.display='block';}
function $ap(d){const k=d.k,all=d.all,$aq=[];let $ar='متابعة القسم';const $as=($at,n,$au,$av,val)=>$aq.push(`<div class="db9-special"><span>${$at}</span><strong>${n}</strong><small>${$au}</small>${$ad('فتح ←',$av,val)}</div>`);if(k==='hr'){$ar='شؤون العاملين في الشركة';$as('الموظفون النشطون',arr(state.staffProfiles).filter(isStaffAssignable).length,'من ملفات الموارد البشرية','hr','employees');const $aw=arr(state.hrProRequests).filter(r=>r.status==='pending'&&(typeof hrProRequestStage!=='function'||hrProRequestStage(r)==='الموارد البشرية'));$as('طلبات بانتظار الموارد البشرية',$aw.length,'طلبات موظفين تحتاج إجراء القسم','hr','requests');const $ax=arr(state.hrRecruitmentRequisitions).filter(r=>r.status!=='closed');$as('طلبات توظيف مفتوحة',$ax.length,'عدد الطلبات، وليس عدد المقاعد','hr','recruitment');}else if(k==='accounting'){$ar='متابعة المحاسبة';$as('مهام بانتظار الفوترة',all.filter(t=>!t.parentTaskId&&t.status==='awaiting_invoice').length,'مهام انتهت من الأقسام ولم تُقفل محاسبياً','accounting','billing');const $ay=typeof getAccountingPackageTasks==='function'?getAccountingPackageTasks():[];$as('باقات جاهزة للإغلاق',$ay.filter(t=>accountingPackageStatusInfo(t).key==='ready').length,'اكتملت الخدمات الفرعية','accounting','packages');$as('فواتير العملاء',arr(state.invoices).length,'إجمالي الفواتير المحفوظة؛ ليس رصيد التحصيل','accounting','invoices');}else if(k==='purchases'||k==='logistics'){$ar=k==='purchases'?'متابعة طلبات الشراء':'متابعة الطلبات اللوجستية';const $az=k==='purchases'?'purchase':'logistics',r=arr(state.supportRequests).filter(x=>x.type===$az&&['new','in_progress'].includes(x.status));$as('طلبات مفتوحة',r.length,'طلبات دعم مستقلة عن عدّاد المهام','support',$az);$as('طلبات بلا مسؤول',r.filter(x=>!$f(x.assignedTo)).length,'بانتظار التكليف داخل القسم','support',$az);$as('طلبات تجاوزت الموعد',r.filter(x=>{const t=due({dueDate:x.neededDate});return t&&t<d.now;}).length,'بحسب تاريخ الاحتياج المسجل','support',$az);}else if(k==='sales'){$ar='متابعة المبيعات';const q=arr(state.quotations);$as('عروض أسعار مفتوحة',q.filter(x=>x.status!=='order'&&x.status!=='cancel').length,'العروض غير الموافق عليها وغير الملغاة','sales','quotes');$as('عروض موافق عليها',q.filter(x=>x.status==='order').length,'مستندات المبيعات المعتمدة','sales','orders');$as('عملاء مسجلون',arr(state.customers).length,'من دليل العملاء','sales','customergroup');}else if(k==='admin')return'';else{$ar='نظرة على أعمال القسم';const $ba=new Set(d.active.map(t=>$f(t.customer)).filter(Boolean)),$bb=$p(d.active,d.now);$as('عملاء لديهم مهام مفتوحة',$ba.size,'داخل هذا القسم فقط','deptfilter','all');$as('مهام أعيدت للتعديل',$bb.revision,'الحالات الحالية؛ ليست عدد مرات التعديل','deptfilter','revision');$as('مواعيد غير محددة',$bb.nodate,'تحتاج تحديد موعد للمتابعة الدقيقة','deptfilter','nodate');}return`<section class="db9-panel"><header><h3>${$ar}</h3><span>بيانات القسم الحالية</span></header><div class="db9-special-grid">${$aq.join('')}</div></section>`;}function $bc(d){const pageSize=8,numbered=d.k==='marketing',v=d.v,$bd=v.search.toLowerCase(),$be=v.filter==='done';let $bf=($be?d.done:d.live.filter(t=>$o(t,v.filter,d.now))).filter(t=>!$bd||[t.taskNo,t.number,t.title,t.customer,t.assignee,t.department].join(' ').toLowerCase().includes($bd));const $bg=t=>{const f=$n(t,d.now);return f.overdue?0:f.today?1:f.review?2:f.unassigned?3:f.revision?4:f.paused?5:6;};$bf=$bf.slice().sort((a,b)=>$be?end(b)-end(a):$bg(a)-$bg(b)||(due(a)||Infinity)-(due(b)||Infinity)||String(a.id).localeCompare(String(b.id)));const $bh=Math.max(1,Math.ceil($bf.length/pageSize));v.page=Math.min($bh,Math.max(1,v.page));const start=(v.page-1)*pageSize,$bi=$bf.slice(start,start+pageSize);const $bj=$bi.map((t,index)=>{const f=$n(t,d.now),$bk=$g(t.department),$bl=$be?'منجزة':!$f(t.assignee)?'بانتظار التوزيع':productiveTaskStateLabel(t),$bm=$be?'good':f.overdue?'danger':f.review?'gold':'',$bn=f.overdue?Math.ceil((d.now-due(t))/86400000):0;const $bo=!$be&&!$f(t.assignee)&&$bk?`<div class="db9-assign"><select id="${E('db9-assign-'+d.k+'-'+t.id)}" aria-label="تحديد منفذ ${E(MoshTaskUI.title(t))}">${productiveAssigneeOptions($bk)}</select>${$ad('توزيع','assign',t.id,'gold')}</div>`:$ad($be?'التفاصيل':'فتح المهمة','task',t.id);return`<tr>${numbered?`<td>${(start+index+1).toLocaleString('ar-SY',{numberingSystem:'arab'})}</td>`: ''}<td><div class="mt54-identity">${$ad(E(MoshTaskUI.title(t)),'task',t.id,'link mt54-task-name')}<span class="mt54-client-name">${E(t.customer||'بدون عميل')}</span>${t.parentTaskId?'<small class="mt54-secondary">مهمة فرعية</small>':''}</div></td>${d.k==='admin'?`<td>${E($be?$j(t):t.department)}</td>`:''}<td>${E(t.assignee||'لم تحدد بعد')}</td><td><span class="db9-tag ${$bm}">${E($bl)}</span></td><td><b class="${f.overdue&&!$be?'db9-danger':''}">${E(t.dueDate||'غير محدد')}</b><small>${$be?'إنجاز: '+new Date(end(t)).toLocaleDateString('ar-SY'):f.overdue?'متأخرة '+$bn+' يوم':f.today?'التسليم اليوم':''}</small></td><td>${$bo}</td></tr>`;}).join('');return`<div class="db9-table-wrap"><table class="db9-table"><thead><tr>${numbered?'<th scope="col">تسلسل</th>':''}<th>المهمة / العميل</th>${d.k==='admin'?'<th>القسم</th>':''}<th>الموظف</th><th>الحالة</th><th>الموعد</th><th>الإجراء</th></tr></thead><tbody>${$bj||`<tr><td colspan="${(d.k==='admin'?6:5)+(numbered?1:0)}"><div class="db9-empty">${v.filter==='attention'?'لا توجد مهام مطابقة تحتاج متابعة الآن.':'لا توجد مهام مطابقة لهذا الاختيار.'}<small>الأرقام تعتمد على البيانات المسجلة فقط.</small></div></td></tr>`}</tbody></table></div><footer><span>${$bf.length} مهمة · صفحة ${v.page} من ${$bh}</span><div>${$ad('السابق','page',v.page-1,v.page===1?'muted':'')}${$ad('التالي','page',v.page+1,v.page===$bh?'muted':'')}</div></footer>`;}function $bp(d){let $bq=d.people.filter(p=>d.v.employee==='all'||p.name===d.v.employee).map(p=>{const a=d.active.filter(t=>$f(t.assignee)===p.name);return{...p,a,m:$p(a,d.now),done:d.completed.filter(t=>$f(t.assignee)===p.name).length};}).sort((a,b)=>b.m.overdue-a.m.overdue||b.a.length-a.a.length||a.name.localeCompare(b.name,'ar'));const max=Math.max(1,...$bq.map(p=>p.a.length));return`<section class="db9-panel"><header><div><h3>${d.k==='admin'?'أحمال الموظفين':'أحمال فريق القسم'}</h3><p>عدد المهام المفتوحة، وليس تقييماً للأداء.</p></div><span>${$bq.length} موظف</span></header><div class="db9-team"><table class="db9-table"><thead><tr><th>الموظف</th><th>مفتوحة</th><th>متأخرة</th><th>للمراجعة</th><th>منجزة بالفترة</th><th></th></tr></thead><tbody>${$bq.map(p=>`<tr><td>${$ad(E(p.name),'employee',p.name,'link')}<small>${E(p.department)}${p.profile&&!isStaffAssignable(p.profile)?' · غير متاح لتكليف جديد':''}</small><div class="db9-track"><i style="width:${Math.round(p.a.length/max*100)}%"></i></div></td><td>${p.a.length}</td><td class="${p.m.overdue?'db9-danger':''}">${p.m.overdue}</td><td>${p.m.review}</td><td>${p.done}</td><td>${$ad('عرض المهام','employee',p.name)}</td></tr>`).join('')||'<tr><td colspan="6"><div class="db9-empty">لم يسجل موظفون ضمن هذا القسم بعد.</div></td></tr>'}</tbody></table></div></section>`;}function $br(d){if(d.k!=='admin')return'';const $bs=[...Object.values(PRODUCTIVE_DEPARTMENTS).map(c=>c.department),'المهمات'];return`<section class="db9-panel"><header><div><h3>متابعة الأقسام</h3><p>المفتوح حالياً في كل قسم، بغض النظر عن فلتر الموظف.</p></div></header><div class="db9-departments">${$bs.map(dep=>{const k=$g(dep),a=d.all.filter(t=>t.department===dep&&t.status==='in_progress'),m=$p(a,d.now);return`<button type="button" data-action="scope" data-value="${E(dep)}" class="db9-dept ${d.v.scope===dep?'active':''}"><b>${E(dep)}</b><strong>${a.length}</strong><small><span>${m.unassigned} للتوزيع</span><span class="${m.overdue?'db9-danger':''}">${m.overdue} متأخرة</span></small></button>`;}).join('')}</div></section>`;}function $bt(k){const c=cfg(k),box=c&&document.getElementById(c.workspaceId);if(!box)return;const previousProgramHost=k==='platform'?box.querySelector('[data-platform-programs]'):null;$am(k,'distribution');setProductiveTopTab(k,'distribution');productiveTaskViewModes[k]='distribution';const d=$s(k),v=d.v,$bu=d.department?getDepartmentManager(d.department):null;const $bv=document.getElementById('crumb');if($bv)$bv.innerHTML=`<b>قسم ${E(c.label)}</b> / لوحة التحكم`;const $bw=[['unassigned','بانتظار التوزيع',d.m.unassigned,'لم يحدد لها منفذ','gold'],['assigned','مهام موزعة',d.m.assigned,'مفتوحة عند الموظفين',''],['overdue','مهام متأخرة',d.m.overdue,'تجاوزت موعد التسليم','danger'],['today','تسليم اليوم',d.m.today,'موعدها خلال اليوم',''],['review','بانتظار المراجعة',d.m.review,'قرار مطلوب من المدير','gold'],['done','منجزة خلال الفترة',d.done.length,$e[v.period],'good']];$bw.shift();const $bx='المهام المسندة إليّ';const $by=d.live.length&&!d.people.length?'لا يوجد موظفون مسجلون لهذا النطاق. أضف فريق القسم من الموارد البشرية.':d.department&&!$bu?'مدير القسم غير محدد في ملفات الموارد البشرية.':'';box.innerHTML=`<div class="db9" data-department="${k}" dir="rtl"><div class="db9-heading"><div><span class="db9-eyebrow">${k==='admin'?'متابعة الشركة':'إدارة القسم'}</span><h2>لوحة التحكم <em>/ ${E(c.label)}</em></h2><p>${$bx}</p></div><div class="db9-head-actions">${window.MoshAuth37?.canModule(k,'assign')?$ad('توزيع المهام','assignment'):''}${$ad('تحديث البيانات','refresh')}${$ad(k==='admin'?'مهام الإدارة الجارية':'مهام جارية','running')}${k==='design'?$ad('تقرير العمل','report','design','gold'):''}<small>آخر تحديث ${new Date(d.now).toLocaleTimeString('ar-SY',{hour:'2-digit',minute:'2-digit'})}${$bu?' · مدير القسم: '+E($bu.name):''}</small></div></div>
 ${k==='platform'?'<section class="db9-panel" data-platform-programs hidden></section>':''}
 <div class="db9-controls">${k==='admin'?$ah('scope','نطاق المتابعة',[['all','كل الأقسام'],...Object.values(PRODUCTIVE_DEPARTMENTS).map(c=>[c.department,c.label]),['المهمات','المهمات المركزية']],v.scope):''}${$ah('period','فترة مؤشرات الإنجاز',Object.entries($e),v.period)}<p>الأحمال والتنبيهات: <b>الوضع الحالي</b><br>المنجز والالتزام: <b>الفترة المختارة</b></p></div>
 ${$by?`<div class="db9-notice">${$by}</div>`:''}<div class="db9-kpis">${$bw.map(([f,label,n,sub,tone])=>`<button type="button" class="db9-kpi ${tone} ${v.filter===f?'active':''}" data-action="filter" data-value="${f}"><span>${label}</span><strong data-metric="${f}">${n}</strong><small>${sub} ←</small></button>`).join('')}</div>
 <div class="db9-strip">${$ad('للتعديل <b>'+d.m.revision+'</b>','filter','revision')}${$ad('متوقفة <b>'+d.m.paused+'</b>','filter','paused')}${$ad('بلا موعد <b>'+d.m.nodate+'</b>','filter','nodate')}<span>قد تظهر المهمة بأكثر من مؤشر؛ لا تجمع العدادات.</span></div>
 ${$ap(d)}
 <section class="db9-panel db9-follow"><header><div><h3>أولوية المتابعة</h3><p>الأكثر تأخيراً أولاً، ثم تسليم اليوم والمراجعة والتوزيع.</p></div>${$ad('إظهار كل المفتوحة','filter','all')}</header><div class="db9-controls compact">${$ah('filter','نوع المتابعة',Object.entries($d).filter(([key])=>key!=='unassigned'),v.filter)}<form class="db9-search"><label for="db9-search-${k}">بحث بالمهمة أو العميل</label><div><input id="db9-search-${k}" name="search" value="${E(v.search)}" placeholder="ابحث باسم المهمة أو العميل..." autocomplete="off"><button type="submit" class="db9-button">بحث</button></div></form>${v.employee!=='all'||v.search?$ad('مسح التصفية','clear'):''}</div>${$bc(d)}</section>
 
 <section class="db9-panel"><header><div><h3>نتيجة الفترة <span>· ${$e[v.period]}</span></h3><p>المهام التي انتهت فعلياً في القسم؛ الإرسال للمراجعة ليس إنجازاً نهائياً.</p></div></header><div class="db9-outcomes"><div><span>الإنجاز ضمن الموعد</span><strong>${d.dated.length?Math.round(d.onTime*100/d.dated.length)+'%':'—'}</strong><small>${d.dated.length?d.onTime+' من '+d.dated.length+' مهمة لها موعد':'لا توجد مهام منجزة ذات موعد مسجل'}</small></div><div><span>متوسط وقت العمل المسجل</span><strong>${$r(d.timed.length?d.sum/d.timed.length:0)}</strong><small>${d.timed.length} من ${d.done.length} مهمة لديها وقت مسجل</small></div><div><span>إجمالي وقت العمل المسجل</span><strong>${$r(d.sum)}</strong><small>وقت المهام المنجزة، وليس ساعات حضور الموظف</small></div></div><div class="db9-note">وقت العمل محسوب للمهمة كاملة وقد يشمل مراحل سابقة. الإنجاز منسوب للقسم الذي أغلق المهمة. ${d.undated?d.undated+' مهمة مغلقة بلا تاريخ إنجاز موثوق لم تدخل مؤشرات الفترة.':''}</div></section>
 ${$br(d)}<div class="db9-note">تتحدّث اللوحة عند فتحها أو بعد التوزيع أو بالضغط على «تحديث البيانات». المهام الرئيسية والفرعية تُعدّ سجلات مستقلة. عرض المؤشرات لا يغيّر حالة المهام.</div></div>`;const $bz=box.querySelector('.db9');$bz.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(b&&$bz.contains(b))act(k,b.dataset.action,b.dataset.value);});$bz.addEventListener('change',e=>{const f=e.target.dataset.field;if(!f)return;v[f]=e.target.value;v.page=1;if(f==='scope'){v.employee='all';v.search='';}$bt(k);});$bz.querySelector('.db9-search').addEventListener('submit',e=>{e.preventDefault();v.search=e.target.elements.search.value.trim();v.page=1;$bt(k);});if(k==='platform')mountPlatformPrograms($bz.querySelector('[data-platform-programs]'),previousProgramHost);}function $ca(k,id){const t=arr(state.salesTasks).find(x=>String(x.id)===String(id));if(!t)return;if(k==='admin'&&t.department!=='الإدارة'){const $cb=$g(t.department);if($cb)return openAppWith($cb,()=>openProductiveTaskDetails($cb,t.id,'distribution'));return openAppWith('tasks',()=>openTaskDetailsFromAll(t.id));}const c=cfg(k);activeTaskViewContext={source:'department',containerId:c.workspaceId,department:t.department,productiveKey:k,productiveMode:'distribution'};productiveTaskViewModes[k]='distribution';openTaskDetails(t.id);}function $cc(k,id){const t=arr(state.salesTasks).find(x=>String(x.id)===String(id));if(!t||t.status!=='in_progress'||$f(t.assignee)){$bt(k);return;}const $cd=$f(document.getElementById('db9-assign-'+k+'-'+id)?.value),$ce=getStaffProfileByName($cd),$cf=getDepartmentManager(t.department);if(!$cd){alert('اختر المنفذ أولاً.');return;}if(!$ce||!isStaffAssignable($ce)){alert('هذا الموظف غير متاح لتوزيع مهام جديدة.');return;}const $cg=$cf&&String($cf.id)===String($ce.id);if($ce.department!==t.department&&!$cg){alert('الموظف المختار ليس ضمن قسم المهمة.');return;}if($cg){managerTakeTaskSelf(t.id,cfg(k).workspaceId,t.department);}else{pushAppUndo();if(!assignTaskWorkflow(t,$cd)){appUndoStack.pop();return;}save();}$bt(k);}function act(k,$ch,$ci){if($ch==='assignment')return window.MoshDepartmentDashboard.openAssignment(k);const v=ui(k);if($ch==='deptfilter'){v.employee='all';v.search='';v.filter=$ci;v.page=1;$bt(k);return;}if($ch==='filter'){v.filter=$ci;v.page=1;$bt(k);return;}if($ch==='employee'){v.employee=$ci;v.filter='all';v.page=1;$bt(k);return;}if($ch==='scope'){v.scope=$ci;v.employee='all';v.page=1;$bt(k);return;}if($ch==='page'){v.page=Math.max(1,Number($ci)||1);$bt(k);return;}if($ch==='clear'){v.employee='all';v.search='';v.page=1;$bt(k);return;}if($ch==='refresh'){$bt(k);if(k==='platform')void loadPlatformPrograms(platformProgramsView);return;}if($ch==='task'){$ca(k,$ci);return;}if($ch==='assign'){$cc(k,$ci);return;}if($ch==='running'){window.openProductiveRunningTasksPage(k);return;}if($ch==='report'){window.openDesignWorkReport();return;}if($ch==='hr'){openHRPro($ci);document.getElementById('hrDistributionTab')?.classList.remove('active');return;}if($ch==='accounting'){openAccountingSection($ci);document.getElementById('accountingDistributionTab')?.classList.remove('active');return;}if($ch==='support'){openSupportRequestsPage($ci);document.getElementById(k+'DistributionTab')?.classList.remove('active');return;}if($ch==='sales'){salesList($ci);document.getElementById('salesDistributionTab')?.classList.remove('active');}}function $cj(k){if(document.getElementById(cfg(k)?.appId||k+'App')?.dataset.taskView==='assign'){const result=$a.render(k);window.MoshUI19?.tabState?.(k,'assign');return result;}try{return $bt(k);}catch($ck){console.error('MOSH dashboard:',$ck);const c=cfg(k),box=c&&document.getElementById(c.workspaceId);if(box)box.innerHTML='<div class="db9-notice">تعذّر عرض المهام المسندة إليك.</div>';}}window.renderProductiveDistributionBoard=$cj;window.openProductiveDistributionPage=function(k){const taskRoot=document.getElementById(cfg(k)?.appId||k+'App');if(taskRoot)delete taskRoot.dataset.taskView;$am(k,'distribution');const $cl=$a.open(k);if(k==='platform')void loadPlatformPrograms(platformProgramsView);const $cm=document.getElementById('crumb');if(cfg(k)&&$cm)$cm.innerHTML='<b>قسم '+E(cfg(k).label)+'</b> / لوحة التحكم';return $cl;};window.openProductiveRunningTasksPage=function(k){const taskRoot=document.getElementById(cfg(k)?.appId||k+'App');if(taskRoot)delete taskRoot.dataset.taskView;$am(k,'running');return $a.running(k);};window.goApp=function(app,$cn,$co=true){const $cp=$a.go(app,$cn,$co);if(app==='hr'&&!document.getElementById('hrApp')?.classList.contains('r24-admin-mode'))window.openProductiveDistributionPage(app);return $cp;};
const platformTaskStatuses={
  new:'جديدة',in_progress:'جارية',completed:'منتهية',awaiting_invoice:'بانتظار الفوترة',
  invoiced:'مفوترة',cancelled:'ملغاة',archived_invoiced:'مؤرشفة مع فاتورة',
  archived_no_invoice:'مؤرشفة دون فاتورة',shared_container:'مهام فريق'
};
const platformProgramsPath='/platform/programs';
const platformProgramMaxCount=1000000;
const platformProgramMaxTasks=250;
const programNumber=value=>Number(value||0).toLocaleString('ar-SY');
let platformProgramsView=null;

function platformProgramsHost(){
  return document.querySelector('#platformApp.active .db9[data-department="platform"] [data-platform-programs]');
}

function currentPlatformPrograms(view){
  return !!view&&platformProgramsView===view&&window.MoshApi?.user?.id===view.owner&&platformProgramsHost()===view.host;
}

function closePlatformPrograms(){
  if(!platformProgramsView)return;
  const view=platformProgramsView;
  view.request?.abort();
  view.editor?.request?.abort();
  view.host.replaceChildren();
  platformProgramsView=null;
}

function programMessage(node,message,error=false){
  node.textContent=message;
  node.hidden=!message;
  node.setAttribute('role',error?'alert':'status');
  node.classList.toggle('db9-notice',error);
}

function programTaskStatus(task){
  return platformTaskStatuses[task.status]||'غير محددة';
}

function renderPlatformProgramList(view){
  const list=view.host.querySelector('[data-platform-program-list]');
  const open=new Set(Array.from(list.querySelectorAll('details[open]'),details=>details.closest('[data-platform-program-row]').dataset.platformProgramRow));
  view.host.querySelector('[data-platform-program-create]').hidden=!view.data.canCreate;
  const programs=view.data.programs.slice().sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  if(!programs.length){
    list.innerHTML='<div class="db9-empty">لا توجد برامج مسجّلة بعد.</div>';
    return;
  }
  list.innerHTML=programs.map(program=>{
    const id=E(program.id);
    const tasks=arr(program.tasks);
    const rows=tasks.map(task=>'<tr><td>'+E(task.title||'—')+'</td><td><span class="db9-tag">'+E(programTaskStatus(task))+'</span></td><td>'+E(task.assignee||'غير معيّن')+'</td></tr>').join('');
    const linked=rows
      ? '<div class="db9-table-wrap"><table class="db9-table" aria-label="مهام البرنامج"><thead><tr><th scope="col">المهمة</th><th scope="col">الحالة</th><th scope="col">المكلّف</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      : '<div class="db9-empty">لا توجد مهام مرتبطة بهذا البرنامج.</div>';
    return '<article class="platform-program-row" data-platform-program-row="'+id+'"><details data-platform-program-details'+(open.has(String(program.id))?' open':'')+'>'+
      '<summary><span class="platform-program-name">'+E(program.name)+'</span>'+
      '<span>المشاركون <b data-platform-program-participants>'+programNumber(program.participantCount)+'</b></span>'+
      '<span>الحلقات المكتملة <b data-platform-program-episodes>'+programNumber(program.completedEpisodeCount)+'</b></span>'+
      '<span class="platform-program-task-count">مهام البرنامج <b>'+programNumber(program.taskCount??tasks.length)+'</b></span></summary>'+linked+'</details>'+
      (view.data.canEdit?'<button type="button" class="db9-button" data-platform-program-edit="'+id+'">تعديل</button>':'')+'</article>';
  }).join('');
}

async function loadPlatformPrograms(view){
  if(!currentPlatformPrograms(view)||view.request)return;
  const controller=new AbortController();
  view.request=controller;
  const refresh=view.host.querySelector('[data-platform-program-refresh]');
  const list=view.host.querySelector('[data-platform-program-list]');
  const message=view.host.querySelector('[data-platform-program-message]');
  refresh.disabled=true;
  list.setAttribute('aria-busy','true');
  if(!view.data)list.innerHTML='<div class="db9-empty" role="status">جارٍ تحميل البرامج…</div>';
  programMessage(message,'');
  try{
    const data=await MoshApi.request(platformProgramsPath,{cache:'no-store',signal:controller.signal});
    if(!currentPlatformPrograms(view)||controller.signal.aborted)return;
    if(!Array.isArray(data?.programs))throw new Error('لم تكتمل بيانات البرامج.');
    view.data=data;
    view.host.hidden=false;
    renderPlatformProgramList(view);
  }catch(error){
    if(!currentPlatformPrograms(view)||controller.signal.aborted)return;
    if(error.status===403){
      view.data=null;
      closePlatformProgramEditor(view);
      list.replaceChildren();
      view.host.hidden=true;
      return;
    }
    if(!view.data)list.replaceChildren();
    programMessage(message,error.message||'تعذّر تحميل البرامج. أعد المحاولة.',true);
  }finally{
    if(view.request===controller)view.request=null;
    refresh.disabled=false;
    list.removeAttribute('aria-busy');
  }
}

function closePlatformProgramEditor(view){
  if(!view.editor)return;
  view.editor.request?.abort();
  view.editor=null;
  view.host.querySelector('[data-platform-program-editor]').replaceChildren();
}

function currentPlatformEditor(view,editor){
  return currentPlatformPrograms(view)&&view.editor===editor;
}

function showPlatformTaskOptions(editor){
  const area=editor.form.querySelector('[data-platform-program-task-results]');
  const choices=new Map(editor.options.map(task=>[String(task.id),task]));
  editor.selected.forEach((task,id)=>{if(!choices.has(id))choices.set(id,task);});
  area.innerHTML=choices.size
    ? [...choices].map(([id,task])=>'<label class="platform-program-task-option"><input type="checkbox" value="'+E(id)+'" data-platform-program-task'+(editor.selected.has(id)?' checked':'')+'>'+
      '<span><b>'+E(task.title||'—')+'</b><small>'+E(programTaskStatus(task))+' · '+E(task.assignee||'غير معيّن')+'</small></span></label>').join('')
    : '<div class="db9-empty">لا توجد مهام متاحة ضمن البحث.</div>';
  editor.form.querySelector('[data-platform-program-selected]').textContent=programNumber(editor.selected.size)+' مهمة مختارة';
  editor.form.querySelector('[data-platform-program-task-prev]').disabled=editor.page<=1||editor.busy||!!editor.body;
  editor.form.querySelector('[data-platform-program-task-next]').disabled=!editor.hasMore||editor.busy||!!editor.body;
  if(editor.busy||editor.body)area.querySelectorAll('input').forEach(input=>input.disabled=true);
}

async function loadPlatformTaskOptions(view,editor,page=1,queryText=null){
  if(!currentPlatformEditor(view,editor)||editor.busy||editor.body)return;
  editor.request?.abort();
  const controller=new AbortController();
  editor.request=controller;
  const message=editor.form.querySelector('[data-platform-program-task-message]');
  const area=editor.form.querySelector('[data-platform-program-task-results]');
  const q=queryText??editor.form.elements.namedItem('taskSearch').value.trim();
  programMessage(message,'جارٍ تحميل المهام…');
  area.setAttribute('aria-busy','true');
  try{
    const query=new URLSearchParams({q,page:String(page)});
    const data=await MoshApi.request(platformProgramsPath+'/task-options?'+query,{cache:'no-store',signal:controller.signal});
    if(!currentPlatformEditor(view,editor)||editor.request!==controller)return;
    editor.options=arr(data.tasks);
    editor.query=q;
    editor.page=data.page||1;
    editor.hasMore=!!data.hasMore;
    showPlatformTaskOptions(editor);
    programMessage(message,'');
  }catch(error){
    if(!currentPlatformEditor(view,editor)||editor.request!==controller)return;
    programMessage(message,error.message||'تعذّر تحميل المهام. أعد البحث للمحاولة مجدداً.',true);
  }finally{
    if(editor.request===controller){
      editor.request=null;
      area.removeAttribute('aria-busy');
    }
  }
}

function openPlatformProgramEditor(view,program=null){
  if(!currentPlatformPrograms(view)||view.editor?.busy||view.editor?.body)return;
  closePlatformProgramEditor(view);
  const host=view.host.querySelector('[data-platform-program-editor]');
  host.innerHTML='<form data-platform-program-form class="platform-program-form">'+
    '<h4>'+(program?'تعديل البرنامج':'إضافة برنامج')+'</h4><div class="platform-program-fields">'+
    '<label>اسم البرنامج<input name="name" value="'+E(program?.name||'')+'" required maxlength="160" autocomplete="off"></label>'+
    '<label>عدد المشاركين<input name="participantCount" type="number" min="0" max="'+platformProgramMaxCount+'" step="1" value="'+E(program?.participantCount??0)+'" required></label>'+
    '<label>عدد الحلقات المكتملة<input name="completedEpisodeCount" type="number" min="0" max="'+platformProgramMaxCount+'" step="1" value="'+E(program?.completedEpisodeCount??0)+'" required></label></div>'+
    '<fieldset><legend>ربط مهام القسم</legend><div class="platform-program-actions">'+
      '<input type="search" name="taskSearch" aria-label="بحث في مهام القسم" placeholder="ابحث باسم المهمة…" autocomplete="off">'+
      '<button type="button" class="db9-button" data-platform-program-task-search>بحث</button><small data-platform-program-selected></small></div>'+
    '<p data-platform-program-task-message hidden></p><div class="platform-program-task-results" data-platform-program-task-results></div>'+
    '<div class="platform-program-actions"><button type="button" class="db9-button" data-platform-program-task-prev>السابق</button>'+
    '<button type="button" class="db9-button" data-platform-program-task-next>التالي</button></div></fieldset>'+
    '<p data-platform-program-save-message hidden></p><div class="platform-program-actions">'+
    '<button type="submit" class="db9-button gold" data-platform-program-save>'+(program?'حفظ البرنامج':'إضافة البرنامج')+'</button>'+
    '<button type="button" class="db9-button" data-platform-program-cancel>إلغاء</button></div></form>';
  const form=host.querySelector('form');
  const editor={form,program,selected:new Map(arr(program?.tasks).map(task=>[String(task.id),task])),options:[],query:'',page:1,hasMore:false,request:null,busy:false,body:null};
  view.editor=editor;
  const search=form.elements.namedItem('taskSearch');
  form.querySelector('[data-platform-program-cancel]').onclick=()=>closePlatformProgramEditor(view);
  form.querySelector('[data-platform-program-task-search]').onclick=()=>loadPlatformTaskOptions(view,editor);
  form.querySelector('[data-platform-program-task-prev]').onclick=()=>loadPlatformTaskOptions(view,editor,editor.page-1,editor.query);
  form.querySelector('[data-platform-program-task-next]').onclick=()=>loadPlatformTaskOptions(view,editor,editor.page+1,editor.query);
  search.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();void loadPlatformTaskOptions(view,editor);}
  });
  form.addEventListener('change',event=>{
    const input=event.target;
    if(!input.matches('[data-platform-program-task]'))return;
    if(input.checked){
      if(editor.selected.size>=platformProgramMaxTasks&&!editor.selected.has(input.value)){
        input.checked=false;
        programMessage(form.querySelector('[data-platform-program-task-message]'),'يمكن ربط '+programNumber(platformProgramMaxTasks)+' مهمة كحد أقصى.',true);
        return;
      }
      const task=editor.options.find(item=>String(item.id)===input.value)||editor.selected.get(input.value);
      if(task)editor.selected.set(input.value,task);
    }else editor.selected.delete(input.value);
    form.querySelector('[data-platform-program-selected]').textContent=programNumber(editor.selected.size)+' مهمة مختارة';
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    void savePlatformProgram(view,editor);
  });
  showPlatformTaskOptions(editor);
  form.elements.namedItem('name').focus();
  void loadPlatformTaskOptions(view,editor);
}

function programEditorBusy(editor,busy){
  const {form,body}=editor;
  form.setAttribute('aria-busy',String(busy));
  const save=form.querySelector('[data-platform-program-save]');
  form.querySelectorAll('input,button').forEach(field=>field.disabled=field===save?busy:busy||!!body);
  form.querySelector('[data-platform-program-task-prev]').disabled=busy||!!body||editor.page<=1;
  form.querySelector('[data-platform-program-task-next]').disabled=busy||!!body||!editor.hasMore;
}

async function savePlatformProgram(view,editor){
  if(!currentPlatformEditor(view,editor)||editor.busy)return;
  const {form,program}=editor, message=form.querySelector('[data-platform-program-save-message]');
  if(!editor.body){
    const name=form.elements.namedItem('name').value.trim();
    const participantCount=form.elements.namedItem('participantCount').valueAsNumber;
    const completedEpisodeCount=form.elements.namedItem('completedEpisodeCount').valueAsNumber;
    if(!name||![participantCount,completedEpisodeCount].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=platformProgramMaxCount)){
      programMessage(message,'أدخل اسم البرنامج وعدداً صحيحاً لكل حقل.',true);
      return;
    }
    editor.body={name,participantCount,completedEpisodeCount,taskIds:[...editor.selected.keys()],requestId:'PLATFORM-'+crypto.randomUUID()};
    if(program)editor.body._version=program._version;
  }
  editor.busy=true;
  programEditorBusy(editor,true);
  programMessage(message,'جارٍ حفظ البرنامج…');
  try{
    const path=platformProgramsPath+(program?'/'+encodeURIComponent(program.id):'');
    const saved=await MoshApi.request(path,{method:program?'PUT':'POST',body:editor.body});
    if(!currentPlatformEditor(view,editor))return;
    if(!saved?.id)throw new Error('لم يصل تأكيد حفظ البرنامج.');
    view.request?.abort();
    const programs=view.data.programs.filter(item=>String(item.id)!==String(saved.id));
    programs.push(saved);
    view.data={...view.data,programs};
    closePlatformProgramEditor(view);
    renderPlatformProgramList(view);
    programMessage(view.host.querySelector('[data-platform-program-message]'),'تم حفظ البرنامج.');
  }catch(error){
    if(!currentPlatformEditor(view,editor))return;
    const uncertain=error.network||!Number.isFinite(error.status)||error.status>=500;
    if(!uncertain)editor.body=null;
    programMessage(message,uncertain?'تعذّر تأكيد الحفظ. أعد المحاولة للتحقق من العملية نفسها.':
      error.status===409?'عُدّل البرنامج من جلسة أخرى. ألغِ التعديل وحدّث القائمة قبل المحاولة مجدداً.':error.message||'تعذّر حفظ البرنامج.',true);
    form.querySelector('[data-platform-program-save]').textContent=uncertain?'التحقق وإعادة المحاولة':program?'حفظ البرنامج':'إضافة البرنامج';
  }finally{
    editor.busy=false;
    if(currentPlatformEditor(view,editor))programEditorBusy(editor,false);
  }
}

function mountPlatformPrograms(host,previous=null){
  const owner=window.MoshApi?.user?.id;
  if(!host||host!==platformProgramsHost()||!owner)return;
  if(platformProgramsView?.owner===owner&&(platformProgramsView.host===previous||platformProgramsView.host===host)){
    if(previous&&host!==previous)host.replaceWith(previous);
    return;
  }
  closePlatformPrograms();
  const view={host,owner,data:null,request:null,editor:null};
  platformProgramsView=view;
  host.hidden=false;
  host.innerHTML='<header><h3>البرامج</h3><div class="platform-program-actions">'+
    '<button type="button" class="db9-button gold" data-platform-program-create hidden>إضافة برنامج</button>'+
    '<button type="button" class="db9-button" data-platform-program-refresh title="تحديث البرامج" aria-label="تحديث البرامج"><span aria-hidden="true">↻</span></button></div></header>'+
    '<div class="platform-program-content"><p data-platform-program-message hidden></p>'+
    '<div data-platform-program-editor></div><div data-platform-program-list></div></div>';
  host.onclick=event=>{
    const button=event.target.closest('button');
    if(!button||button.disabled||!currentPlatformPrograms(view))return;
    if(button.hasAttribute('data-platform-program-refresh'))void loadPlatformPrograms(view);
    if(button.hasAttribute('data-platform-program-create')&&view.data?.canCreate)openPlatformProgramEditor(view);
    if(button.hasAttribute('data-platform-program-edit')&&view.data?.canEdit){
      const program=view.data.programs.find(item=>String(item.id)===button.dataset.platformProgramEdit);
      if(program)openPlatformProgramEditor(view,program);
    }
  };
  void loadPlatformPrograms(view);
}

document.addEventListener('mosh:section-enter',event=>{
  if(event.detail?.app==='platform')mountPlatformPrograms(platformProgramsHost());
  else closePlatformPrograms();
});
document.addEventListener('mosh:page-refreshed',()=>loadPlatformPrograms(platformProgramsView));
for(const event of ['mosh:session-expired','mosh:logout-complete']){
  document.addEventListener(event,closePlatformPrograms);
}
document.addEventListener('mosh:permissions-applied',()=>{
  if(platformProgramsView&&window.MoshApi?.user?.id!==platformProgramsView.owner)closePlatformPrograms();
});

function nameDashboardControl(app){
 const config=cfg(app),button=document.getElementById(app+'DistributionTab');
 if(!config||!button)return;
 Array.from(button.childNodes).filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());
 button.prepend(document.createTextNode('لوحة التحكم '));
 button.title='لوحة التحكم لقسم '+config.label;
}
Object.keys(PRODUCTIVE_DEPARTMENTS).forEach(nameDashboardControl);
document.addEventListener('mosh:page-mounted',event=>nameDashboardControl(event.detail.app));
window.MoshDepartmentDashboard={version:'9.1',openDashboard(k){
 if(window.MoshPages?.pending(k))return openAppWith(k,()=>window.MoshDepartmentDashboard.openDashboard(k));
 const c=cfg(k),root=c&&document.getElementById(c.appId);if(!root)return false;
 if(window.MoshAuth37&&!window.MoshAuth37.canModule(k,'dashboard'))return false;
 delete root.dataset.taskView;
 if(k==='admin'&&window.MoshAdministration24)return window.MoshAdministration24.enter();
 if(k==='hr'&&window.MoshHR13)return window.MoshHR13.go('home');
 if(k==='it'&&window.MoshIT31)return window.MoshIT31.open();
 return window.openProductiveDistributionPage(k);
},openAssignment(k){
 if(window.MoshPages?.pending(k))return openAppWith(k,()=>window.MoshDepartmentDashboard.openAssignment(k));
 const c=cfg(k),root=c&&document.getElementById(c.appId);if(!root)return false;
 if(window.MoshAuth37&&!window.MoshAuth37.canModule(k,'assign'))return false;
 if(window.openProductiveDistributionPage(k)===false)return false;
 $am(k,'distribution');root.dataset.taskView='assign';productiveTaskViewModes[k]='distribution';
 if(k==='marketing'){root.classList.remove('ig28-open');document.getElementById('marketingExecV33')?.classList.remove('mk33-show');const legacy=document.getElementById('marketingExecV29');if(legacy){legacy.classList.remove('mk29-show');legacy.style.display='none';}}
 if(k==='it')window.MoshIT31?.openTasks?.('assign');
 if(k==='accounting')window.MoshFinance21?.openTaskView?.('assign');
 $a.render(k);window.MoshUI19?.tabState?.(k,'assign');
 const crumb=document.getElementById('crumb');if(crumb)crumb.innerHTML='<b>قسم '+E(c.label)+'</b> / توزيع المهام';
 return true;
},inspect:k=>{const d=$s(k);return{department:d.department||'all',active:d.live.length,counts:d.m,completed:d.done.length,onTime:d.onTime,dated:d.dated.length,missingCompletionDate:d.undated,people:d.people.map(p=>p.name)};},refresh:$cj};})();
