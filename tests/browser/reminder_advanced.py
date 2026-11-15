import asyncio,json,pathlib,os,shutil
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[2];checks=[]
def check(name,val,detail=None):
 if not val:raise AssertionError(name+': '+str(detail))
 checks.append(name);print('PASS',len(checks),name,flush=True)
MOCK='''(index)=>{
 const T=parent.__fixture,shared=T.local,own=T.sessions[index]??={};
 function store(x){return {getItem:k=>x[k]??null,setItem:(k,v)=>{x[k]=String(v)},removeItem:k=>delete x[k],key:i=>Object.keys(x)[i],get length(){return Object.keys(x).length}};}
 Object.defineProperty(window,'localStorage',{value:store(shared),configurable:true});Object.defineProperty(window,'sessionStorage',{value:store(own),configurable:true});
 window.MoshApi={serverNow:()=>T.now};
 window.MoshWorkdayModel50={duration:n=>{n=Math.floor(n/1000);return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(v=>String(v).padStart(2,'0')).join(':')}};
 window.MoshWorkdesk50={
 reminderContext:()=>({userId:T.user,employeeId:T.emp,date:'2026-09-27',timeZone:'UTC',now:T.now,online:true,clockConfirmed:true,busy:false,uncertain:false,error:'',currentKind:T.kind,verifiedAt:T.now,snapshot:{employeeId:T.emp,date:'2026-09-27',asOf:T.now,live:true,complete:true,issues:[]},account:{live:true,complete:true,issues:[],windows:[{start:T.gap,end:T.now}],segments:[{kind:T.kind==='ready'?'waste':'task',start:T.gap,end:T.now}]}}),
 loadReport:async()=>true,refresh:async()=>true,openPicker:()=>{T.pick++},
 perform:async kind=>{T.writes.push({kind,at:T.now});T.kind=kind;document.dispatchEvent(new CustomEvent('mosh:workdesk-transition',{detail:{kind}}));return true}
 };
}'''
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path=os.environ.get('MOSH_TEST_CHROMIUM') or shutil.which('chromium'),args=['--no-sandbox']);p=await b.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
  await p.set_content('<iframe id="one"></iframe><iframe id="two"></iframe>')
  await p.evaluate("window.__fixture={now:Date.parse('2026-09-27T09:05:00Z'),gap:Date.parse('2026-09-27T09:00:00Z'),user:'U1',emp:'E1',kind:'ready',local:{},sessions:{},writes:[],pick:0}")
  async def init(frame,index):
   await frame.set_content('<body><button id="elsewhere">عمل آخر</button></body>');await frame.evaluate(MOCK,index)
   for filename in ['57-mosh-reminder-model.js','58-mosh-activity-reminder.js']:await frame.add_script_tag(content=(ROOT/'js'/filename).read_text())
  f1=p.frames[1];f2=p.frames[2];await asyncio.gather(init(f1,1),init(f2,2));await p.wait_for_timeout(300)
  async def opened():return [await f.evaluate('MoshActivityReminder51.isOpen()') for f in [f1,f2]]
  states=await opened();check('Shared-origin storage lease avoids concurrent duplicate reminders',sum(states)==1,states)
  active=f1 if states[0] else f2;await active.evaluate('MoshActivityReminder51.dismiss()');await p.evaluate('__fixture.now+=299000');await asyncio.gather(f1.evaluate('MoshActivityReminder51.tick()'),f2.evaluate('MoshActivityReminder51.tick()'))
  check('Dismissal snoozes both contexts',not any(await opened()))
  # Simulate a reload by replacing the module context while keeping that tab session storage.
  await f1.evaluate('MoshActivityReminder51.destroy()');await init(f1,1);await p.wait_for_timeout(150)
  check('Reload preserves shared snooze until deadline',not any(await opened()))
  await p.evaluate('__fixture.now+=1000');await asyncio.gather(f1.evaluate('MoshActivityReminder51.tick()'),f2.evaluate('MoshActivityReminder51.tick()'));await p.wait_for_timeout(200)
  check('After snooze expires only one context opens',sum(await opened())==1)
  active=f1 if (await opened())[0] else f2
  await active.evaluate('Object.defineProperty(document,"hidden",{value:true,configurable:true});document.dispatchEvent(new Event("visibilitychange"))');await p.wait_for_timeout(120)
  check('Hidden context does not keep a visible reminder',not await active.evaluate('MoshActivityReminder51.isOpen()'))
  await p.evaluate('__fixture.now+=300000');await active.evaluate('MoshActivityReminder51.tick()');check('Elapsed background time does not spawn hidden popups',not await active.evaluate('MoshActivityReminder51.isOpen()'))
  await active.evaluate('Object.defineProperty(document,"hidden",{value:false,configurable:true});document.dispatchEvent(new Event("visibilitychange"))');await p.wait_for_timeout(250)
  check('Return to visible context rechecks condition once',sum(await opened())==1)
  active=f1 if (await opened())[0] else f2
  before=await p.evaluate('__fixture.gap');await active.evaluate('MoshActivityReminder51.choose("task")')
  check('Task-selection path never writes a work state',await p.evaluate('__fixture.writes.length')==0 and await p.evaluate('__fixture.gap')==before)
  await p.evaluate('__fixture.now+=300000');await asyncio.gather(f1.evaluate('MoshActivityReminder51.tick()'),f2.evaluate('MoshActivityReminder51.tick()'));await p.wait_for_timeout(200)
  active=f1 if (await opened())[0] else f2;await active.evaluate('MoshActivityReminder51.choose("no_work")')
  check('Confirmed response emits one change at response time',await p.evaluate('__fixture.writes.length')==1 and await p.evaluate('__fixture.writes[0].at===__fixture.now'))
  check('No response backdates the uncovered period',await p.evaluate('__fixture.gap')==before)
  await f1.evaluate('MoshActivityReminder51.tick()');await f2.evaluate('MoshActivityReminder51.tick()');check('Recorded activity closes reminders in both contexts',not any(await opened()))
  all_events=await active.evaluate('MoshActivityReminder51.events()');check('Reminder and actual response events exist',any(e['type']=='shown' for e in all_events) and any(e['type']=='response_confirmed' for e in all_events))
  await p.evaluate('__fixture.user="U2";__fixture.emp="E2";__fixture.kind="ready";__fixture.gap=__fixture.now;')
  await active.evaluate('MoshActivityReminder51.tick()');check('Switching users clears prior reminder UI',not await active.evaluate('MoshActivityReminder51.isOpen()'))
  check('Different user cannot see prior user session journal',len(await active.evaluate('MoshActivityReminder51.events()'))==0)
  check('Isolated concurrency tests no runtime errors',not errs,errs)
  await b.close()
 (ROOT/'tests/results/r3-advanced-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Two isolated same-origin iframe contexts; mocked shared storage and clock. Native HTTP tests blocked by browser policy.'},ensure_ascii=False,indent=2));print('TOTAL',len(checks))
asyncio.run(main())
