import asyncio,base64
from browser_test import Server,launch
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZJwAAAABJRU5ErkJggg==')
async def main():
 s=Server();s.user['moduleOverrides']={'hr':{'view':True,'details':True,'edit':True}}
 pw,browser,context,page,errors=await launch(s);page.set_default_timeout(7000)
 try:
  await page.evaluate("MoshApi.upload=async r=>r.key;MoshApi.removeFile=async()=>{};goApp('hr');openStaffWorkflowConfig();openStaffEmployeeForm('E1')")
  await page.wait_for_timeout(120);inp=page.locator('#r14StaffPhotoInput')
  if await inp.count()!=1: raise AssertionError('photo input missing')
  await inp.set_input_files({'name':'camera.png','mimeType':'image/png','buffer':PNG});await page.wait_for_timeout(150)
  await page.evaluate("saveStaffProfile('E1')");await page.wait_for_timeout(350)
  photo=await page.evaluate("state.staffProfiles.find(x=>x.id==='E1').photoKey||''")
  if not photo.startswith('staff_photo_E1_'): raise AssertionError('photoKey not saved: '+photo)
  if errors: raise AssertionError(errors)
  print('PASS profile photo normalized/uploaded/linked in employee state')
 finally:
  await browser.close();await pw.stop()
if __name__=='__main__':asyncio.run(main())
