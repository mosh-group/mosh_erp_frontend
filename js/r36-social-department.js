/* R36: move the existing social UI into a real department. No business-data migration. */
(function(){'use strict';
 const $=s=>document.querySelector(s);let active=false;
 function cleanup(){document.querySelectorAll('#marketingSocialHubTab').forEach(n=>n.closest('.menu')?.remove());}
 function entry(e){const app=e.detail?.app;if(app==='social'){window.MoshInstagram28?.leave?.();const body=$('#socialAppContent');if(body)body.style.display='block';active=true;}else if(active){window.MoshInstagram28?.leave?.();active=false;}cleanup();}
 document.addEventListener('mosh:section-enter',entry);
 document.addEventListener('mosh:r19-ready',cleanup);document.addEventListener('mosh:permissions-applied',cleanup);
 const prev=window.openProductiveDistributionPage;if(typeof prev==='function')window.openProductiveDistributionPage=function(key){if(key==='social'){window.MoshInstagram28?.leave?.();const c=$('#socialAppContent');if(c)c.style.display='block';}return prev.apply(this,arguments);};
 const run=window.openProductiveRunningTasksPage;if(typeof run==='function')window.openProductiveRunningTasksPage=function(key){if(key==='social')window.MoshInstagram28?.leave?.();return run.apply(this,arguments);};
 window.openSocialCustomers=function(){
  if(!window.MoshAuth37?.canModule('social','view'))return false;
  if(window.MoshPages?.pending('social'))return openAppWith('social',window.openSocialCustomers);
  window.MoshInstagram28?.leave?.();
  const host=$('#socialTaskWorkspace'), body=$('#socialAppContent');
  body.style.display='block';
  const esc=window.MoshUI19.esc;
  const customers=(state.customers||[]).filter(c=>c&&!c.deletedAt&&c.active!==false);
  const tabs={discovery:'مرحلة اكتشاف العميل',guide:'دليل العميل',plans:'الخطة',notes:'الملاحظات',tasks:'المهمات',interactions:'المتابعة'};
  function list(){
   $('#crumb').textContent='قسم السوشال ميديا / عملاء القسم';
   host.innerHTML='<section class="mk33-panel"><h2>عملاء قسم السوشال ميديا</h2><label>العميل <select class="mk33-select" data-customer><option value="">'+(customers.length?'اختر العميل':'لا يوجد عملاء متاحون')+'</option>'+customers.map((c,i)=>'<option value="'+i+'">'+esc(c.name)+'</option>').join('')+'</select></label></section><div data-summary></div>';
   const select=host.querySelector('[data-customer]'), summary=host.querySelector('[data-summary]');
   select.onchange=()=>{
    const c=customers[select.value];
    if(!c){summary.replaceChildren();return;}
    const tasks=customerTasks(c);
    summary.innerHTML='<section class="mk33-panel"><div class="mk33-client-top"><h2>'+esc(c.name)+'</h2><button type="button" class="mk33-btn" aria-expanded="false" data-details>تفاصيل العميل</button></div>'+
     (window.MoshAuth37.canModule('social','running')?'<h3>المهمات</h3>'+(tasks.length?tasks.map(t=>'<p>'+esc(t.title||'—')+'</p>').join(''):'لا توجد مهام ظاهرة لهذا العميل.'):'')+'</section><div data-profile></div>';
    const button=summary.querySelector('[data-details]'),panel=summary.querySelector('[data-profile]');
    button.onclick=()=>{
     const open=button.getAttribute('aria-expanded')!=='true';
     button.setAttribute('aria-expanded',String(open));
     if(open)show(c,'discovery',panel);else panel.replaceChildren();
    };
   };
  }
  function customerTasks(c){
   if(!window.MoshAuth37.canModule('social','running'))return [];
   return (window.MoshPermissions38?.visibleTasks()||[]).filter(t=>window.MoshAuth37.departmentApp(t.department)==='social'&&(t.customerId?String(t.customerId)===String(c.id):t.customer===c.name));
  }
  function show(c,key,panel){
   const p=c.marketingProfile||{},g=p.guide||{};
   let entries=[];
   if(key==='discovery')entries=(p.discoveryQuestions||[]).map(q=>[typeof q==='string'?q:q.question,q.answer]);
   if(key==='guide')entries=[[ 'شخصية العلامة',g.brandEssence],['نبرة التواصل',g.tone],['الجمهور المستهدف',g.audience],['الرسائل الأساسية',g.keyMessages],['الألوان',g.colors],['الخطوط',g.fonts]].filter(row=>row[1]);
   if(key==='plans')entries=(p.plans||[]).map(x=>[x.title,x.objective]);
   if(key==='notes')entries=(p.notes||[]).map(x=>[x.type,x.text]);
   if(key==='interactions')entries=(p.interactions||[]).map(x=>[x.type,x.summary||x.text]);
   if(key==='tasks')entries=customerTasks(c).map(t=>[t.title,t.assignee]);
   panel.innerHTML='<section class="mk33-client-head"><div class="mk33-stepper" style="display:grid;grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(max-content,1fr);gap:4px;overflow-x:auto">'+Object.entries(tabs).filter(([k])=>k!=='tasks'||window.MoshAuth37.canModule('social','running')).map(([k,label])=>'<button style="padding:4px 8px;min-height:28px;font-size:12px;white-space:nowrap" class="mk33-step '+(key===k?'active':'')+'" data-tab="'+k+'">'+label+'</button>').join('')+'</div></section><section class="mk33-panel"><h3>'+tabs[key]+'</h3>'+ (entries.length?entries.map(([title,value])=>'<article><b>'+esc(title||'')+'</b><p>'+esc(value||'—')+'</p></article>').join(''):'لا توجد بيانات مسجّلة لهذا العميل في هذا التبويب.')+'</section>';
   panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>show(c,b.dataset.tab,panel));
  }
  list();return true;
 };
 cleanup();
})();
