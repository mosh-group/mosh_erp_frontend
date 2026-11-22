/* MOSH Workdesk R2: pure interval accounting. Never persists browser business data.
   All authoritative times/identities must come from the API. Intervals are [start,end).
   An uncovered gap is waste ONLY where the server certifies history completeness. */
(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.MoshWorkdayModel50=value;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const list=v=>Array.isArray(v)?v:[], str=v=>String(v==null?'':v).trim();
const labels={task:'تنفيذ مهام',break:'استراحة',no_work:'لا يوجد عمل لدي',waste:'وقت مهدور — غير مسجّل',review:'بحاجة إلى مراجعة — سجل غير مكتمل'};
// R5: these are ERP activity timestamps, never durations, IDs or staff birth dates.
// Epoch zero is a missing-start sentinel, not 1970. Read common seconds/ms/ISO
// encodings without replacing the stored source values. Unsupported dates need review.
const MIN_STAMP=Date.UTC(2000,0,1),MAX_STAMP=Date.UTC(2100,0,1),LIVE_LIMIT=24*3600000;
function epoch(v){
 if(v==null||typeof v==='boolean'||(typeof v!=='number'&&typeof v!=='string'&&!(v instanceof Date)))return NaN;
 let n;
 if(v instanceof Date)n=v.getTime();
 else if(typeof v==='number'||/^[+-]?\d+(?:\.\d+)?$/.test(str(v))){
  n=Number(v);if(!Number.isFinite(n)||n<=0)return NaN;
  if(n>=MIN_STAMP/1000&&n<MAX_STAMP/1000)n*=1000;
 }else{
  const s=str(v);if(!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s))return NaN;
  n=Date.parse(s);
 }
 return Number.isFinite(n)&&n>=MIN_STAMP&&n<MAX_STAMP?n:NaN;
}
function elapsed(start,at=Date.now(),maxMs=Infinity){
 const a=epoch(start),b=epoch(at);if(!Number.isFinite(a)||!Number.isFinite(b)||a>b+2000)return NaN;
 const ms=Math.max(0,b-a);return ms<=maxMs?ms:NaN;
}
// R6: a read-only timing adapter; never infer execution from attendance, receipt,
// updatedAt, local click time, or a task's original creation/start date.
function taskTiming(t,at=Date.now()){
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:null;
 const sources=[obj(t?.workTiming),obj(t?.work_timing)].filter(Boolean);
 const starts=[],totals=[],issues=[];
 for(const w of sources){
  for(const k of ['activeStartedAt','active_started_at']){const v=epoch(w[k]);if(Number.isFinite(v))starts.push(v);}
  for(const k of ['activeSession','active_session']){const v=obj(w[k]);if(v&&!v.endAt&&!v.end_at&&!v.endedAt&&!v.ended_at){const a=epoch(v.startAt??v.start_at??v.startedAt??v.started_at);if(Number.isFinite(a))starts.push(a);}}
  for(const [k,scale]of [['totalMs',1],['total_ms',1],['totalSeconds',1000],['total_seconds',1000]]){
   const v=w[k];if(v!=null&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))&&Number(v)>=0)totals.push(Number(v)*scale);
  }
 }
 const unique=values=>values.length&&values.every(v=>Math.abs(v-values[0])<1)?values[0]:NaN;
 const startAt=unique(starts),totalMs=unique(totals);
 if(starts.length&&!Number.isFinite(startAt))issues.push('الخادم أعاد أكثر من وقت بداية مختلف لنفس التنفيذ.');
 if(totals.length&&!Number.isFinite(totalMs))issues.push('الخادم أعاد إجماليات تنفيذ متعارضة.');
 const live=t?.employeeState==='working',liveMs=live?elapsed(startAt,at,LIVE_LIMIT):0;
 if(live&&!Number.isFinite(liveMs)&&!issues.length)issues.push(!Number.isFinite(startAt)?'وقت بداية التنفيذ غير موجود في بيانات المهمة.':startAt>at+2000?'وقت التنفيذ لاحق لوقت الخادم.':'جلسة التنفيذ المفتوحة تجاوزت ٢٤ ساعة.');
 if(!Number.isFinite(totalMs))issues.push('إجمالي وقت التنفيذ السابق غير متاح أو غير صالح.');
 const totalElapsedMs=Number.isFinite(liveMs)&&Number.isFinite(totalMs)&&issues.length===0?totalMs+liveMs:NaN;
 return {startAt,totalMs,liveMs,totalElapsedMs,issues,valid:Number.isFinite(totalElapsedMs)};
}
function duration(ms){
 if(ms==null||ms===''||!Number.isFinite(Number(ms))||Number(ms)<0)return '—';
 const n=Math.floor(Number(ms)/1000);return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(v=>String(v).padStart(2,'0')).join(':');
}
function dateKey(at=Date.now(),zone){try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone||undefined,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));const get=k=>parts.find(p=>p.type===k)?.value;return `${get('year')}-${get('month')}-${get('day')}`;}catch(_){return '';}}
function nextDate(d,amount=1){const m=str(d).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return '';const x=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]+amount));return x.toISOString().slice(0,10);}
function wallTime(date,time,zone){
 const d=str(date).match(/^(\d{4})-(\d{2})-(\d{2})$/),t=str(time).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(!d||!t||+t[1]>23||+t[2]>59||+(t[3]||0)>59)return NaN;
 const y=+d[1],m=+d[2],day=+d[3],h=+t[1],mi=+t[2],s=+(t[3]||0),base=Date.UTC(y,m-1,day,h,mi,s);
 const check=new Date(base);if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==day)return NaN;
 if(!zone)return new Date(y,m-1,day,h,mi,s).getTime();
 try{
  const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  let guess=base;for(let i=0;i<4;i++){const p=fmt.formatToParts(new Date(guess)),v=k=>+p.find(x=>x.type===k).value;const displayed=Date.UTC(v('year'),v('month')-1,v('day'),v('hour'),v('minute'),v('second'));const delta=base-displayed;if(!delta)return guess;guess+=delta;}return NaN;
 }catch(_){return NaN;}
}
function union(intervals){const out=[];for(const r of intervals.filter(r=>Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start).sort((a,b)=>a.start-b.start)){const last=out.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else out.push({start:r.start,end:r.end});}return out;}
function attendanceWindows(records,{date,now=Date.now(),timeZone}={}){
 const start=wallTime(date,'00:00',timeZone),end=wallTime(nextDate(date),'00:00',timeZone),cutoff=Math.min(now,end),rows=[],issues=[];let live=false;
 if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(now))return {windows:[],issues:['تاريخ اليوم أو المنطقة الزمنية غير صالح؛ يحتاج السجل للمراجعة.'],live:false,start:0,end:0};
 for(const r of list(records)){
  if(!r||r.cancelled||r.deletedAt||['cancelled','canceled','deleted','rejected'].includes(str(r.status).toLowerCase()))continue;
  const dt=str(r.date||r.createdAt).slice(0,10);
  if(dt!==date&&dt!==nextDate(date,-1)&&!r.startAt&&!r.inAt)continue;
  let a=epoch(r.inAt||r.startAt),b=epoch(r.outAt||r.endAt);
  const inV=r.inTime||r.checkIn||r.startTime||r.start,outV=r.outTime||r.checkOut||r.endTime||r.end;
  if(!Number.isFinite(a))a=/^\d{1,2}:/.test(str(inV))?wallTime(dt,str(inV),timeZone):epoch(inV);
  if(!Number.isFinite(b)&&outV)b=/^\d{1,2}:/.test(str(outV))?wallTime(dt,str(outV),timeZone):epoch(outV);
  if(!Number.isFinite(a)){if(dt===date)issues.push('بصمة دخول مفقودة أو غير صالحة.');continue;}
  if(a>=end||a>now)continue;
  if(Number.isFinite(b)&&b<a&&/^\d{1,2}:/.test(str(outV)))b=wallTime(nextDate(dt),str(outV),timeZone);
  if(!Number.isFinite(b)){
   if(((str(r.status).toLowerCase()==='open'&&dateKey(a,timeZone)<=date&&date<=dateKey(now,timeZone))||(dt===date&&dateKey(now,timeZone)===date))&&!['closed','completed'].includes(str(r.status).toLowerCase())&&now-a<=20*3600000){b=now;live=true;}
   else{if(a<end&&a>=start-86400000)issues.push('بصمة خروج مفقودة؛ لا يمكن اعتماد مدة هذه الفترة.');continue;}
  }
  if(b===a){if(dt===date)issues.push('وقت الدخول والخروج متساويان؛ راجع البصمة.');continue;}
  if(b<a||b-a>24*3600000){issues.push('فترة حضور غير صالحة وتحتاج مراجعة.');continue;}
  const s=Math.max(start,a),e=Math.min(cutoff,b);if(e>s)rows.push({start:s,end:e});
 }
 const sorted=rows.slice().sort((a,b)=>a.start-b.start);let maxEnd=-Infinity;for(const r of sorted){if(r.start<maxEnd){issues.push('تداخل في سجلات البصمة؛ احتُسب الوقت مرة واحدة فقط.');break;}maxEnd=Math.max(maxEnd,r.end);}
 return {windows:union(rows),issues:[...new Set(issues)],live,start,end:cutoff};
}
function account({attendance=[],activities=[],coverage=[],date,now=Date.now(),timeZone,complete=false,issues:given=[],includeOutsideAttendance=false}={}){
 const a=attendanceWindows(attendance,{date,now,timeZone});const issues=[...a.issues,...given];const totals={task:0,break:0,no_work:0,waste:0,review:0};const byTask=new Map();
 let cov=complete?a.windows:union(list(coverage).map(r=>({start:epoch(r.startAt??r.start),end:epoch(r.endAt??r.end)})));
 const intervals=[],seen=new Set();let invalidHistory=false;
 for(const r of list(activities)){
  if(!r||r.cancelled||r.voided||r.supersededBy)continue;
  const kind=r.kind==='nowork'?'no_work':r.kind;let start=epoch(r.startAt??r.start),end=epoch(r.endAt??r.end);
  if(!Number.isFinite(start)){issues.push('نشاط بتوقيت بداية غير صالح.');invalidHistory=true;continue;}
  // A confirmed open server session keeps ticking between report refreshes.
  if(r.open===true)end=now;
  if(!Number.isFinite(end)||end<start){issues.push('نشاط غير مكتمل أو بتوقيت نهاية غير صالح.');invalidHistory=true;continue;}
  if(!['task','break','no_work'].includes(kind)){issues.push('حالة نشاط غير معروفة تحتاج مراجعة.');intervals.push({...r,kind:'review',start,end:Math.min(end,now)});continue;}
  const key=[r.id||'',kind,r.taskId||'',start,end].join('|');if(seen.has(key))continue;seen.add(key);
  if(end>start)intervals.push({...r,kind,start,end:Math.min(end,now)});
 }
 // Invalid history cannot certify uncovered gaps, even with a mistaken complete flag.
 if(invalidHistory)cov=[];
 const segments=[];
 // R8: daily activity is independent of attendance. These are calculation
 // windows only; a.windows and presenceMs remain the real attendance records.
 const scopeWindows=includeOutsideAttendance?union(a.windows.concat(intervals.map(r=>({start:Math.max(a.start,r.start),end:Math.min(a.end,r.end)})))):a.windows;
 for(const w of scopeWindows){
  const relevant=intervals.filter(r=>r.end>w.start&&r.start<w.end),cv=cov.filter(r=>r.end>w.start&&r.start<w.end);
  const cuts=[...new Set([w.start,w.end,...relevant.flatMap(r=>[Math.max(w.start,r.start),Math.min(w.end,r.end)]),...cv.flatMap(r=>[Math.max(w.start,r.start),Math.min(w.end,r.end)])])].sort((x,y)=>x-y);
  for(let i=1;i<cuts.length;i++){
   const start=cuts[i-1],end=cuts[i],hits=relevant.filter(r=>r.start<end&&r.end>start),keys=new Set(hits.map(r=>r.kind+':'+(r.kind==='task'?str(r.taskId):'')));
   let kind='waste',taskId='',title='';
   if(keys.size>1){kind='review';issues.push('تداخل بين أنشطة مسجلة؛ لم يُحتسب الوقت مرتين.');}
   else if(hits.length){kind=hits[0].kind;taskId=kind==='task'?str(hits[0].taskId):'';title=hits[0].taskTitle||'';}
   else if(!cv.some(r=>r.start<=start&&r.end>=end))kind='review';
   const ms=end-start;totals[kind]+=ms;
   if(kind==='task'){const row=byTask.get(taskId)||{taskId,title:title||'مهمة',durationMs:0};row.durationMs+=ms;byTask.set(taskId,row);}
   const last=segments.at(-1);if(last&&last.end===start&&last.kind===kind&&last.taskId===taskId)last.end=end;else segments.push({start,end,kind,taskId,title});
  }
 }
 if(totals.review>0&&!issues.length)issues.push('سجل النشاط التاريخي غير مكتمل؛ الفترات غير المعروفة ليست وقتاً مهدوراً معتمداً.');
 const presenceMs=a.windows.reduce((s,r)=>s+r.end-r.start,0),taskWindows=union(intervals.filter(r=>r.kind==='task').map(r=>({start:Math.max(a.start,r.start),end:Math.min(a.end,r.end)}))),taskRaw=taskWindows.reduce((s,r)=>s+r.end-r.start,0);
 // Conflicting recorded activities INSIDE attendance are review time, not work outside attendance.
 const taskInside=taskWindows.reduce((sum,r)=>sum+a.windows.reduce((n,w)=>n+Math.max(0,Math.min(r.end,w.end)-Math.max(r.start,w.start)),0),0);
 return {date,timeZone,presenceMs,totals,segments,byTask:[...byTask.values()].sort((x,y)=>y.durationMs-x.durationMs),windows:a.windows,issues:[...new Set(issues)],live:a.live,complete:totals.review===0&&issues.length===0&&a.windows.length>0,outsideTaskMs:Math.max(0,taskRaw-taskInside),generatedAt:now};
}
function dailyAccount(options={}){
 const attendance=account(options),day=account({...options,includeOutsideAttendance:true});
 return {...day,attendanceTotals:attendance.totals,presenceComplete:attendance.complete,
  activityMs:day.totals.task+day.totals.break+day.totals.no_work,accountingScope:'calendar-day'};
}
function ownsSession(session,employee){const id=str(session.workerId||session.employeeId),eid=str(employee?.id);if(id)return !!eid&&id===eid;return !!str(employee?.name)&&str(session.worker||session.employeeName)===str(employee.name);}
function taskIntervals(tasks,employee,now){const out=[];for(const t of list(tasks)){
 for(const s of list(t.workTiming?.sessions)){if(ownsSession(s,employee))out.push({id:'task:'+t.id+':'+(s.id||s.startAt),kind:'task',taskId:String(t.id),taskTitle:t.title,startAt:s.startAt,endAt:s.endAt});}
 const w=t.workTiming||{};if(t.employeeState==='working'&&ownsSession({workerId:w.activeWorkerId,worker:w.activeWorker||t.assignee},employee))out.push({id:'task:'+t.id+':'+w.activeStartedAt,kind:'task',taskId:String(t.id),taskTitle:t.title,startAt:w.activeStartedAt,endAt:now,open:true});
 }return out;}
function plan({kind,taskId,tasks,presence,presenceId,employee,actor,receiptModel,canTask}={}){
 if(!employee?.id||!presenceId)throw new Error('يجب ربط الحساب بملف الموظف قبل تسجيل وقت العمل.');
 const own=list(tasks),target=own.find(t=>str(t.id)===str(taskId)),running=own.filter(t=>t.status==='in_progress'&&t.employeeState==='working'),ops=[];
 const check=t=>{if(!t||!canTask(t))throw new Error('لا تملك صلاحية تنفيذ هذه المهمة أو لم تعد مسندة إليك.');if(t.status!=='in_progress')throw new Error('المهمة ليست متاحة للتنفيذ حالياً.');};
 const patchTask=(t,action,patch,detail='')=>{check(t);ops.push({resource:'tasks',action:'update',id:str(t.id),data:{...patch,workChat:[...list(t.workChat),receiptModel.message(action,t,actor,detail)]}});};
 const patchPresence=(mode,noWork,pausedTaskId='')=>{
  if(presence&&presence.mode===mode&&!!presence.noWork===noWork&&str(presence.pausedTaskId)===pausedTaskId)return;
  ops.push({resource:'work-presence',action:presence?'update':'create',id:presenceId,data:{mode,noWork,pausedTaskId}});
 };
 const stopAll=(reason,except='')=>{for(const t of running)if(str(t.id)!==except)patchTask(t,'pause',{employeeState:'paused'},reason);};
 if(kind==='receive'){
  check(target);if(receiptModel.category(target)!=='new')throw new Error('تم استلام هذه الدورة مسبقاً.');patchTask(target,'receive',target.employeeState==='new'?{employeeState:'received'}:{});
 }else if(kind==='start'){
  check(target);if(receiptModel.category(target)==='new')throw new Error('اضغط «تم استلام المهمة» أولاً.');
  if(receiptModel.category(target)!=='active'||!['received','paused','working'].includes(target.employeeState))throw new Error('المهمة ليست قابلة للبدء.');
  if(target.workTiming?.activity?.pendingIdle)throw new Error('صنّف فترة الخمول من تفاصيل المهمة قبل استئنافها.');
  if(target.employeeState==='working'&&running.length===1&&presence?.mode==='active'&&!presence.noWork)return [];
  stopAll('انتقال إلى مهمة أخرى من لوحة عملي.',str(target.id));
  if(target.employeeState!=='working')patchTask(target,'start',{employeeState:'working'});
  patchPresence('active',false);
 }else if(kind==='repair_timer'){
  check(target);
  if(target.employeeState!=='working'||receiptModel.category(target)!=='active')throw new Error('استئناف التوقيت متاح للمهمة الجاري تنفيذها فقط.');
  if(target.workTiming?.activity?.pendingIdle)throw new Error('صنّف فترة الخمول من تفاصيل المهمة أولاً.');
  // Explicit command only; timestamps/totals are never supplied by the browser.
  stopAll('انتقال إلى جلسة توقيت مصححة.',str(target.id));
  patchTask(target,'start',{employeeState:'working',workTiming:{_command:'repair_missing'}},'استئناف التوقيت بتأكيد الموظف؛ السجل القديم المفقود يبقى للمراجعة.');
  patchPresence('active',false);
 }else if(kind==='pause'){
  check(target);if(target.employeeState!=='working')throw new Error('المهمة ليست قيد التنفيذ.');patchTask(target,'pause',{employeeState:'paused'},'إيقاف مؤقت من لوحة عملي.');
 }else if(kind==='finish'||kind==='submit'){
  check(target);if(receiptModel.category(target)!=='active'||!['working','paused'].includes(target.employeeState)||receiptModel.label(target).includes('بانتظار البدء'))throw new Error('ابدأ تنفيذ المهمة قبل إرسالها للمراجعة.');
  if(target.workTiming?.activity?.pendingIdle)throw new Error('صنّف فترة الخمول من تفاصيل المهمة قبل الإنهاء.');
  patchTask(target,'submit',{employeeState:'submitted',returnedForRevision:false});
 }else if(kind==='work_start'){
  // Resuming the workday is NOT resuming a task and doesn't count as execution.
  patchPresence('active',false);
 }else if(kind==='break'||kind==='no_work'||kind==='work_end'){
  stopAll(kind==='break'?'بدء استراحة.':kind==='no_work'?'تسجيل لا يوجد عمل لدي.':'إنهاء يوم العمل دون إنهاء المهمة.');
  const paused=str(running[0]?.id||presence?.pausedTaskId);
  patchPresence(kind==='break'?'break':kind==='work_end'?'off':'active',kind==='no_work',kind==='work_end'?'':paused);
 }else throw new Error('إجراء غير معروف.');
 return ops;
}
return {version:'workdesk-r8',labels,epoch,elapsed,taskTiming,LIVE_LIMIT,duration,dateKey,nextDate,wallTime,union,attendanceWindows,account,dailyAccount,taskIntervals,ownsSession,plan};
});
