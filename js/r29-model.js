/* MOSH R29 — deterministic view calculations; writes and time authority remain on the server. */
(function(root){'use strict';
const DAY=86400000,round=n=>Math.round((n+Number.EPSILON)*100)/100;
const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const days=(a,b)=>valid(a)&&valid(b)?Math.max(0,Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/DAY)+1):0;
function leave(p,year,policy={},requests=[]){
 year=Number(year);if(!(year>=1900&&year<=2199))throw new Error('سنة إجازات غير صالحة.');
 const start=year+'-01-01',end=year+'-12-31',entitlement=Number(p.annualLeaveDays??policy.annualLeaveDays??14),prior=p.leaveUsedBeforeSystemByYear?.[year]||{};
 let recordedUsed=0,pending=0;const records=[...(p.leaveRecords||[])],seen=new Set();
 for(const req of requests||[]){if(String(req.employeeId)!==String(p.id)||!['annual_leave','hourly_leave'].includes(req.type)||!['pending','requested','awaiting_approval'].includes(req.status))continue;
 const v=req.payload||req.data||req;if(records.some(r=>String(r.requestId||r.sourceRequestId||r.id)===String(req.id)))continue;
 records.push({...v,startDate:v.startDate||v.date,endDate:v.endDate||v.startDate||v.date,id:'request:'+req.id,status:'pending',type:req.type});}
 for(const r of records){if(!r||r.id&&seen.has(String(r.id)))continue;if(r.id)seen.add(String(r.id));const hourly=['ساعية','hourly','hourly_leave'].includes(r.type);
 if(!['سنوية','annual','annual_leave'].includes(r.type)&&!(hourly&&r.deductAnnual))continue;if(!['approved','pending','requested'].includes(r.status))continue;
 const a=r.startDate||'',b=r.endDate||a;if(!valid(a)||!valid(b)||b<a)continue;const first=a>start?a:start,last=b<end?b:end;if(last<first)continue;
 let amount=Number(r.days)>0?Number(r.days):days(a,b);if(hourly)amount=Number(r.hours||0)/Math.max(1,Number(r.workdayHours||p.workdayHours||8));amount*=days(first,last)/days(a,b);
 if(r.status==='approved')recordedUsed+=amount;else pending+=amount;}
 const usedBefore=Number(prior.days||0),used=recordedUsed+usedBefore,available=Math.max(0,entitlement-used-pending);
 return {year,entitlement,accrued:entitlement,usedBefore:round(usedBefore),used:round(used),recordedUsed:round(recordedUsed),pending:round(pending),available:round(available),future:0,opening:0,carryForward:0,start,end,cycle:{start,end},mode:'calendar',months:12,monthly:round(entitlement/12),valid:true,legacyOpeningBalanceNotApplied:Number(p.leaveOpeningBalance||0),previousUseIsAdditional:true};
}
function probation(p,today){if(!valid(p.probationEndDate)||!valid(today)||p.active===false||(p.employmentStatus||'active')!=='active')return[];const end=p.probationEndDate,before=new Date(Date.parse(end+'T00:00:00Z')-7*DAY).toISOString().slice(0,10);
 return [['before7',before],['end',end]].filter(([,d])=>today>=d).map(([stage,dueDate])=>({employeeId:p.id,name:p.name,stage,dueDate,endDate:end}));}
function urgent(t){if(t&&Object.prototype.hasOwnProperty.call(t,'isUrgent'))return !!t.isUrgent;if(t&&Object.prototype.hasOwnProperty.call(t,'urgent'))return !!t.urgent;return t?.priority==='urgent';}
function sortUrgent(rows){return rows.map((r,i)=>({r,i})).sort((a,b)=>Number(urgent(b.r))-Number(urgent(a.r))||a.i-b.i).map(x=>x.r);}
function score(labels,scores){if(labels.length!==5||scores.length!==5||new Set(labels.map(x=>x.trim())).size!==5||labels.some(x=>!x.trim())||scores.some(x=>x===''||!Number.isFinite(Number(x))||Number(x)<0||Number(x)>100))throw new Error('خمسة معايير مختلفة وخمس علامات من 0 إلى 100.');return round(scores.reduce((s,x)=>s+Number(x),0)/5);}
root.MoshR29Model={leave,probation,sortUrgent,urgent,score,days,valid};if(typeof module!=='undefined'&&module.exports)module.exports=root.MoshR29Model;
})(typeof window!=='undefined'?window:globalThis);
