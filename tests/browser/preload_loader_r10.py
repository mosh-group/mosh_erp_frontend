"""R10 loader regression: real frontend resources through a deterministic fake origin.
A delayed auth response recreates the timing that made R9 preload warnings visible.
No production server is contacted.
"""
import asyncio,json,mimetypes,os,pathlib
from collections import Counter
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=pathlib.Path(os.environ.get('MOSH_QA_OUT',ROOT/'tests/results/r10-preload'))
OUT.mkdir(parents=True,exist_ok=True)

async def main():
    manifest=json.loads((ROOT/'api-map.json').read_text())
    html=(ROOT/'index.html').read_text().replace('<head>','<head><base href="http://app.test/">',1)
    requests=Counter(); console=[]; pageerrors=[]
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=os.environ.get('MOSH_TEST_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
        context=await browser.new_context()
        async def static(route):
            u=urlparse(route.request.url); rel=u.path.lstrip('/') or 'index.html'; requests[rel]+=1
            path=(ROOT/rel).resolve()
            if not str(path).startswith(str(ROOT.resolve())) or not path.exists():
                await route.fulfill(status=404,body='not found');return
            await route.fulfill(status=200,content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream',body=path.read_bytes())
        async def api(route):
            # Longer than Chromium's preload warning threshold on purpose.
            await asyncio.sleep(4.2)
            body={'success':True,'data':{'authenticated':False,'setupRequired':False,'csrfToken':'TEST_TOKEN'}}
            await route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(body))
        await context.route('http://app.test/**',static)
        await context.route('http://91.144.16.26:1001/api/**',api)
        page=await context.new_page()
        page.on('console',lambda m:console.append({'type':m.type,'text':m.text}))
        page.on('pageerror',lambda e:pageerrors.append(str(e)))
        await page.set_content(html,wait_until='load',timeout=30000)
        await page.wait_for_timeout(9000)
        warnings=[m for m in console if 'preloaded using link preload' in m['text']]
        preload_count=await page.locator('link[rel="preload"]').count()
        runtime=await page.evaluate('''() => ({
          sources:[...document.querySelectorAll('script[src]')].map(x=>x.getAttribute('src')).filter(x=>x.startsWith('js/') && !x.includes('api-client') && !x.includes('api-boot')),
          asyncValues:[...document.querySelectorAll('script[src]')].filter(x=>x.getAttribute('src')?.startsWith('js/') && !x.getAttribute('src').includes('api-client') && !x.getAttribute('src').includes('api-boot')).map(x=>x.async),
          auth:!!window.MoshAuth37, workdesk:!!window.MoshWorkdesk50, gate:!!document.getElementById('moshAuthGate')
        })''')
        await browser.close()
    expected=manifest['scripts']
    result={
      'warnings':warnings,'pageerrors':pageerrors,'preloadNodes':preload_count,
      'scriptDomOrderMatchesManifest':runtime['sources']==expected,
      'allManifestScriptsAsyncFalse':all(v is False for v in runtime['asyncValues']) and len(runtime['asyncValues'])==len(expected),
      'allManifestScriptsRequestedExactlyOnce':all(requests[s.split('?')[0]]==1 for s in expected),
      'manifestScriptCount':len(expected),'runtimeScriptCount':len(runtime['sources']),
      'runtimeMarkers':{'auth':runtime['auth'],'workdesk':runtime['workdesk'],'loginGate':runtime['gate']},
      'requestCounts':{s.split('?')[0]:requests[s.split('?')[0]] for s in expected},
    }
    (OUT/'RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    assert not warnings, warnings
    assert not pageerrors, pageerrors
    assert preload_count==0, preload_count
    assert result['scriptDomOrderMatchesManifest']
    assert result['allManifestScriptsAsyncFalse']
    assert result['allManifestScriptsRequestedExactlyOnce']
    assert runtime['auth'] and runtime['workdesk'] and runtime['gate']
    print('PASS: 0 preload warnings; 0 preload nodes; all',len(expected),'manifest scripts loaded once in manifest order with async=false; no page errors.')

if __name__=='__main__':asyncio.run(main())
