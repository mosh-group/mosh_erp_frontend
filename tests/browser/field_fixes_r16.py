"""R16 focused regression: chat Enter, HTTP voice fallback, admin transfer identity,
design dashboard compact pilot, and Social Hub independence.
"""
import asyncio, json
from browser_test import Server, launch, ROOT
OUT=ROOT/'tests/results/r16-field-fixes';OUT.mkdir(parents=True,exist_ok=True)

async def main():
 s=Server();s.state['departmentManagers']={'التصميم':'E1'};s.user['taskScope']='department';s.roles[0]['taskScope']='department';s.user['moduleOverrides']={'design':{'status':True,'edit':True},'marketing':{'view':True,'edit':True}}
 s.state['staffProfiles'].append({'id':'E2','name':'مدير تنفيذي','employeeNo':'EMP-00002','department':'الإدارة','active':True,'employmentStatus':'active','jobTitle':'مدير تنفيذي','_version':1})
 pw,browser,context,page,errors=await launch(s);page.set_default_timeout(7000);checks=[]
 def ck(name,ok,detail=None):
  if not ok: raise AssertionError(f'{name}: {detail}')
  checks.append(name);print('PASS',name,flush=True)
 try:
  ck('R16 runtime loaded',await page.evaluate('!!window.MoshR16FieldFixes'))
  # Enter in task chat
  await page.evaluate("goApp('tasks');openTaskDetailsFromAll('T1')")
  await page.wait_for_timeout(80)
  await page.evaluate("""() => {const i=document.getElementById('taskChatInput_T1');i.value='رسالة من Enter';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))}""");await page.wait_for_timeout(120)
  ck('Enter sends task chat',await page.evaluate("state.salesTasks.find(x=>x.id==='T1').workChat.some(x=>x.text==='رسالة من Enter')"))
  paper=await page.evaluate("""() => {const i=document.getElementById('taskChatAttachment_T1');let n=0;i.click=()=>n++;document.querySelector('.task-chat-media-actions .attachment-icon-btn').click();return n}""")
  ck('paperclip opens the real task attachment input',paper==1,paper)
  # HTTP microphone fallback must click the real audio input without pre-alert.
  clicked=await page.evaluate("""() => {const i=document.getElementById('taskChatAttachment_T1');let n=0;i.click=()=>n++;toggleTaskChatVoice('T1');return {n,accept:i.getAttribute('accept')}}""")
  ck('HTTP voice opens audio picker',clicked['n']==1,clicked)
  ck('HTTP voice limits picker to audio',clicked['accept'] and 'audio/' in clicked['accept'],clicked)
  standalone=await page.evaluate("""() => {let i=document.getElementById('standaloneAttachmentInput');let n=0;i.click=()=>n++;toggleStandaloneVoiceRecording();return {n,accept:i.getAttribute('accept')}}""")
  ck('standalone HTTP voice opens audio picker',standalone['n']==1 and 'audio/' in (standalone['accept'] or ''),standalone)
  # Design dashboard pilot
  await page.evaluate("goApp('design');document.getElementById('designApp').classList.remove('auth38-task-only');renderProductiveDistributionBoard('design');MoshR16FieldFixes.decorate()");await page.wait_for_timeout(100)
  visible=await page.locator('.r16-design-dashboard .db9-kpi:not(.r16-hide)').count()
  ck('design dashboard has three primary KPIs',visible==3,visible)
  labels=await page.evaluate("() => {MoshR16FieldFixes.decorate();return [...document.querySelectorAll('.r16-design-dashboard .db9-kpi:not(.r16-hide) span')].map(x=>x.textContent.trim())}")
  ck('design dashboard KPI labels simplified',set(labels)=={'مهام جديدة','قيد التنفيذ','بانتظار المراجعة'},labels)
  # Admin transfer must refresh both assignee and assigneeId (stale ID caused server rejection).
  await page.evaluate("""() => {const t=state.salesTasks.find(x=>x.id==='T1');t.assignee='وليد حداد';t.assigneeId='E1';document.body.insertAdjacentHTML('beforeend','<select id="managerTransferDept_T1"><option selected>الإدارة</option></select><select id="managerTransferAdmin_T1"><option selected>مدير تنفيذي</option></select>');managerTransferTask('T1','allTasksContainer','التصميم')}""")
  await page.evaluate('MoshApi.flush()');await page.wait_for_timeout(80)
  transfer=await page.evaluate("""() => {const t=state.salesTasks.find(x=>x.id==='T1');return {department:t.department,assignee:t.assignee,assigneeId:t.assigneeId}}""")
  ck('admin transfer targets selected executive',transfer=={'department':'الإدارة','assignee':'مدير تنفيذي','assigneeId':'E2'},transfer)
  # Social hub: independent UI exists; it must not mutate task state when opened.
  before=await page.evaluate("JSON.stringify(state.salesTasks)")
  await page.evaluate("goApp('marketing');openMoshSocialHub('C1')");await page.wait_for_timeout(80)
  ck('Social Hub opens for customer',await page.locator('#marketingSocialHubContent .r16-social').count()==1)
  ck('Social Hub has no task workflow action',await page.locator('#marketingSocialHubContent [onclick*="Task"],#marketingSocialHubContent [data-action*="task"]').count()==0)
  after=await page.evaluate("JSON.stringify(state.salesTasks)");ck('opening Social Hub does not mutate tasks',before==after)
  ck('no JavaScript runtime errors',not errors,errors)
  (OUT/'RESULTS.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
 finally:
  await browser.close();await pw.stop()
if __name__=='__main__':asyncio.run(main())
