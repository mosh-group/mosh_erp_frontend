/* R3 reminder policy: five *continuous* minutes of verified uncovered attendance.
   Does not inspect mouse/keyboard idle, mutate attendance, or reclassify old time. */
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.MoshActivityReminderModel51=m;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const DELAY=5*60*1000,MAX_AGE=90*1000;
 function evaluate(c){
  const no=reason=>({eligible:false,due:false,reason});
  if(!c||!c.userId||!c.employeeId)return no('identity');
  const n=Number(c.now),w=c.snapshot,d=c.account;
  if(!Number.isFinite(n))return no('clock');
  if(c.online===false)return no('offline');
  if(c.clockConfirmed!==true)return no('clock');
  if(c.busy||c.uncertain||c.error)return no('saving_or_error');
  if(['task','break','no_work'].includes(c.currentKind))return no('activity');
  if(!w||!d||w.date!==c.date||String(w.employeeId)!==String(c.employeeId))return no('snapshot');
  if(w.complete!==true||d.complete!==true||(w.issues||[]).length||(d.issues||[]).length)return no('incomplete');
  if(w.live!==true||d.live!==true)return no('outside_attendance');
  if(!Number.isFinite(c.verifiedAt)||n-c.verifiedAt>MAX_AGE||n<c.verifiedAt-2000)return no('stale');
  const asOf=typeof w.asOf==='number'?w.asOf:Date.parse(w.asOf);
  if(!Number.isFinite(asOf)||n-asOf>MAX_AGE||n<asOf-2000)return no('stale');
  const last=(d.segments||[]).at(-1),window=(d.windows||[]).at(-1);
  if(!last||!window||last.kind!=='waste'||last.end<n-2000||window.end<n-2000||last.start<window.start||last.start>n)return no('not_unrecorded');
  const elapsed=Math.max(0,n-last.start);
  return {eligible:true,due:elapsed>=DELAY,gapStart:last.start,elapsed,now:n,date:c.date,key:[c.userId,c.employeeId,c.date,last.start].join('|')};
 }
 function due(e,s){return !!e?.eligible&&e.due&&e.now>=Math.max(e.gapStart+DELAY,Number(s?.nextAt)||0);}
 function postpone(e,now){return {key:e.key,gapStart:e.gapStart,nextAt:now+DELAY,updatedAt:now};}
 return {version:'workdesk-r3',DELAY,MAX_AGE,evaluate,due,postpone};
});
