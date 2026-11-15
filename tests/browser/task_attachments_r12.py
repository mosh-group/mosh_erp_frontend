import asyncio,json,mimetypes,os,pathlib
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[2]
async def main():
    html=(ROOT/'index.html').read_text().replace('<head>','<head><base href="http://app.test/">',1)
    pageerrors=[]
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=os.environ.get('MOSH_TEST_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
        context=await browser.new_context()
        async def static(route):
            u=urlparse(route.request.url); rel=u.path.lstrip('/') or 'index.html'; path=(ROOT/rel).resolve()
            if not str(path).startswith(str(ROOT.resolve())) or not path.exists():
                await route.fulfill(status=404,body='not found');return
            await route.fulfill(status=200,content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream',body=path.read_bytes())
        async def api(route):
            body={'success':True,'data':{'authenticated':False,'setupRequired':False,'csrfToken':'TEST'}}
            await route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(body))
        await context.route('http://app.test/**',static)
        await context.route('http://91.144.16.26:1001/api/**',api)
        page=await context.new_page();page.on('pageerror',lambda e:pageerrors.append(str(e)))
        await page.set_content(html,wait_until='load',timeout=30000);await page.wait_for_timeout(1200)
        result=await page.evaluate('''() => {
          const input=document.getElementById('standaloneAttachmentInput');
          const button=document.querySelector('button[title="إضافة مرفق"][onclick*="standaloneAttachmentInput"]');
          const test=(name,type,size=100)=>validateTaskAttachmentFile(new File(['x'],name,{type}));
          const chat=taskRunningChatHtml({id:123,workChat:[]});
          return {
            genericInput:!!input, noAccept:input?.getAttribute('accept')===null, multiple:!!input?.multiple, button:!!button,
            jpg:test('a.jpg','image/jpeg'), png:test('a.png','image/png'), mov:test('a.mov','video/quicktime'), mp4:test('a.mp4','video/mp4'),
            pdf:test('a.pdf','application/pdf'), docx:test('a.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
            zip:test('a.zip','application/zip'), psd:test('a.psd','image/vnd.adobe.photoshop'), dwg:test('a.dwg','application/octet-stream'),
            html:test('a.html','text/html'), tooBig:validateTaskAttachmentFile({name:'a.mp4',size:26*1024*1024}),
            chatGeneric:chat.includes('taskChatAttachment_123'), chatOld:chat.includes('taskChatImage_123')||chat.includes('taskChatVideo_123'),
            previewKinds:{jpg:attachmentKind('image/jpeg'),mov:attachmentKind('video/quicktime'),psd:attachmentKind('image/vnd.adobe.photoshop'),doc:attachmentKind('application/pdf')}
          };
        }''')
        await browser.close()
    assert not pageerrors, pageerrors
    assert result['genericInput'] and result['noAccept'] and result['multiple'] and result['button'], result
    for k in ['jpg','png','mov','mp4','pdf','docx','zip','psd','dwg']: assert result[k]=='', (k,result[k])
    assert result['html']!='' and '25 MB' in result['tooBig'], result
    assert result['chatGeneric'] and not result['chatOld'], result
    assert result['previewKinds']=={'jpg':'image','mov':'video','psd':'file','doc':'file'}, result
    print('PASS: generic task attachment picker; common image/video/document/archive/design formats accepted; unsafe HTML and >25MB rejected; chat uses one attachment input; no page errors.')
if __name__=='__main__': asyncio.run(main())
