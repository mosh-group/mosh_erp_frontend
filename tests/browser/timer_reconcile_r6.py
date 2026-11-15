"""Detail-response reconciliation: real frontend, simulated serializers only."""
import asyncio,json,pathlib,copy
from browser_test import Server,launch
ROOT=pathlib.Path(__file__).resolve().parents[2]
checks=[]
def ok(name,value,detail=None):
 if not value:raise AssertionError(name+': '+str(detail))
 checks.append(name);print('PASS',name,flush=True)
class SerializerServer(Server):
 def __init__(self,detail_valid=True):
  super().__init__();self.detail_valid=detail_valid;self.details=0;self.state['staffProfiles'][0]['attendanceRecords']=[]
 async def route(self,route):
  parent=self;req=route.request
  if req.method=='GET' and '/api/tasks/T2' in req.url:self.details+=1
  class Proxy:
   request=req
   async def fulfill(self,**kwargs):
    try:b=json.loads(kwargs.get('body','{}'))
    except Exception:b={}
    if b.get('success') and '/api/transactions' in req.url:
     for change in b.get('data',{}).get('changes',[]):
      if change.get('resource')=='tasks' and change.get('data',{}).get('employeeState')=='working':
       change['data'].pop('workTiming',None)
    if b.get('success') and '/api/tasks/T2' in req.url and not parent.detail_valid:
     b['data']['workTiming']['activeStartedAt']=0
    if b:kwargs['body']=json.dumps(b,ensure_ascii=False)
    return await route.fulfill(**kwargs)
   async def abort(self):return await route.abort()
   async def continue_(self):return await route.continue_()
  await super().route(Proxy())
async def run(valid):
 s=SerializerServer(valid);h=await launch(s);p=h[3]
 try:
  await p.evaluate("MoshWorkdesk50.select('T2')")
  await p.locator('[data-wd50-action="start"]').click();await p.wait_for_function('!MoshWorkdesk50.isBusy()')
  ok('Detail fetched once after incomplete committed timer '+str(valid),s.details==1,s.details)
  ok('No repeated state-change write '+str(valid),len(s.ops)==1,s.ops)
  value=await p.locator('#wd50StatusTimer').inner_text()
  if valid:
   ok('Detail start repairs real timer from server',value!='—',value)
   ok('Committed start equals detail value',await p.evaluate("state.salesTasks.find(t=>t.id==='T2').workTiming.activeStartedAt")==s.t('T2')['workTiming']['activeStartedAt'])
  else:
   ok('Missing detail start is not fabricated',value=='—',value)
   text=await p.locator('#wd50Panel').inner_text()
   ok('Missing response says state saved but timing absent','الخادم لم يُرجع توقيت' in text,text)
  ok('No attendance writes '+str(valid),s.state['staffProfiles'][0]['attendanceRecords']==[])
  ok('No runtime errors '+str(valid),not h[4],h[4])
 finally:await h[1].close();await h[0].stop()
async def main():
 await run(True);await run(False)
 (ROOT/'tests/results/r6-reconcile.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Mocked API serializers; production backend untested'},ensure_ascii=False,indent=2))
 print('TOTAL',len(checks))
if __name__=='__main__':asyncio.run(main())
