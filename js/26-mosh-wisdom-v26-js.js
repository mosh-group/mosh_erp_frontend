(function(){
  'use strict';
  const KEY='mosh_hr_wisdom_v26';
  const VERSION=3;
  const DEFAULT_WISDOMS=["رتّب أولوياتك، افتح مهامك، وخلي يومك أوضح من أول دقيقة.","خلّص المهمة الأهم قبل ما تفتح عشر مهام جديدة.","الوضوح قبل السرعة؛ لما تعرف المطلوب، التنفيذ يصير أخف.","إذا ما في موعد واضح، المهمة بتضل فكرة أكثر مما هي التزام.","كل متابعة بلا نتيجة محددة بتصير ضجيج.","اكتب المطلوب بجملة واحدة قبل ما تبدأ التنفيذ.","الشغل المرتّب بيختصر وقت التوضيح ووقت التصحيح.","لا تأجّل قراراً يحتاج دقيقتين ويعطّل فريقاً كاملاً.","المهمة التي بلا مسؤول واضح غالباً بلا نهاية واضحة.","قبل أن تسلّم، راجع النتيجة كأنك أنت العميل.","اجتماع بلا قرار أو خطوة تالية هو وقت مؤجّل.","إذا تعثّرت، حدّد العائق بدل ما تعيد نفس المحاولة.","الجودة تبدأ من فهم المطلوب قبل بدء الشغل.","خلّي الملاحظات على الشغل، مو على الأشخاص.","المهام الكبيرة تنجز بخطوات صغيرة وواضحة.","لا تخلّي الرسالة المهمة تضيع بين التفاصيل الأقل أهمية.","كل يوم ناجح يبدأ بثلاث أولويات واضحة.","التوثيق اليوم يوفّر نقاشاً طويلاً بكرا.","السرعة مفيدة فقط عندما يكون الاتجاه صحيحاً.","إذا تغيّر المطلوب، حدّث المهمة قبل ما تكمل التنفيذ.","المسؤولية الواضحة نصف الإنجاز.","راجع ما أُنجز قبل ما تضيف شغل جديد.","القرار الجيد يحتاج معلومة واضحة أكثر مما يحتاج كلاماً كثيراً.","خلّي نهاية كل مهمة نتيجة قابلة للتسليم والقياس.","لا تنتظر الكمال لتبدأ؛ ابدأ صح وطوّر أثناء الطريق.","سؤال واحد صح أفضل من ثلاث محاولات غلط.","الوقت اللي بتوفّره بالتنظيم بيرجعلك إنجاز.","اهتم بالتفاصيل، بس لا تخليها توقف الصورة الكبيرة.","إذا المهمة مشتركة، اتفقوا أولاً مين يعمل شو ومتى.","أحسن متابعة هي اللي بتسكر الموضوع، مو اللي بتزيد رسائل.","ابدأ بالأصعب قبل ما يستهلك السهل طاقة يومك."];
  const $=s=>document.querySelector(s);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowIso=()=>new Date().toISOString();
  let ui={page:1,search:'',editId:'',pendingDelete:'',message:''};
  let renderTimer=0,searchTimer=0;
  const bannerParagraph=()=>document.querySelector('.dashboard-mood-panel .dashboard-mood-copy p');
  const originalWisdom=()=>String(bannerParagraph()?.textContent||'رتّب أولوياتك، افتح مهامك، وخلي يومك أوضح من أول دقيقة.').trim();

  function defaultItems(){
    const stamp=Date.now();
    return DEFAULT_WISDOMS.map((text,i)=>({id:'W-DEFAULT-'+(i+1)+'-'+stamp,text,enabled:true,createdAt:nowIso(),updatedAt:nowIso()}));
  }
  function makeDefault(){
    return {version:VERSION,mode:'daily',hours:6,anchor:Date.now(),offset:0,legacyStateMigrated:false,items:defaultItems()};
  }
  function normalize(raw){
    const d=raw&&typeof raw==='object'?raw:makeDefault();
    d.version=VERSION;
    d.mode=d.mode==='hours'?'hours':'daily';
    d.hours=Math.max(1,Math.min(168,Number(d.hours)||6));
    d.anchor=Number(d.anchor)||Date.now();
    d.offset=Number.isFinite(Number(d.offset))?Number(d.offset):0;
    const seen=new Set();
    d.items=(Array.isArray(d.items)?d.items:[]).filter(Boolean).map((x,i)=>({
      id:String(x.id||('W-'+Date.now()+'-'+i)),
      text:String(x.text||'').trim(),
      enabled:x.enabled!==false,
      createdAt:x.createdAt||nowIso(),
      updatedAt:x.updatedAt||x.createdAt||nowIso()
    })).filter(x=>{
      if(!x.text)return false;
      const k=x.text.toLocaleLowerCase('ar');
      if(seen.has(k))return false;
      seen.add(k);
      return true;
    });
    /* One old/fresh wisdom cannot rotate. Preserve it, then seed the rest.
       Existing real libraries (2+ distinct entries) are left untouched. */
    
    
    return d;
  }
  function legacyStateItems(){
    try{
      const legacy=(typeof state!=='undefined'&&state&&state.dailyWisdom16)?state.dailyWisdom16:null;
      const rows=Array.isArray(legacy?.items)?legacy.items:[];
      return rows.filter(x=>x&&!x.deletedAt&&String(x.text||'').trim()).map((x,i)=>({id:String(x.id||('W-LEGACY-'+Date.now()+'-'+i)),text:String(x.text||'').trim(),enabled:x.active!==false,createdAt:x.createdAt||nowIso(),updatedAt:x.updatedAt||x.createdAt||nowIso()}));
    }catch(e){return [];}
  }
  function load(){return normalize({...state.wisdomSettings,items:state.wisdom?.items||[],legacyStateMigrated:true});}
  async function save(data){const d=normalize(data);state.wisdom={items:d.items};state.wisdomSettings={mode:d.mode,hours:d.hours,anchor:d.anchor,offset:d.offset,order:d.items.map(x=>x.id)};await MoshApi.save();return true;}
  function activeItems(data=load()){return data.items.filter(x=>x.enabled&&x.text);}
  function localDayNumber(d=new Date()){return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);}
  function selection(data=load(),at=Date.now()){
    const items=activeItems(data);
    if(!items.length)return {item:null,index:-1,nextAt:0};
    let slot=0,nextAt=0;
    if(data.mode==='hours'){
      const ms=Math.max(1,data.hours)*3600000;
      const anchor=Number(data.anchor)||at;
      slot=Math.max(0,Math.floor((at-anchor)/ms));
      nextAt=anchor+(slot+1)*ms;
      if(nextAt<=at)nextAt=at+ms;
    }else{
      const d=new Date(at);slot=localDayNumber(d);
      const n=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,0,0,0,0);nextAt=n.getTime();
    }
    const idx=((slot+(Number(data.offset)||0))%items.length+items.length)%items.length;
    return {item:items[idx],index:idx,nextAt};
  }
  function applyBanner(){
    const p=bannerParagraph();if(!p)return;
    const title=document.querySelector('.dashboard-mood-panel .dashboard-mood-copy h3');
    if(title&&title.textContent!=='حكمة اليوم')title.textContent='حكمة اليوم';
    const s=selection();
    p.textContent=s.item?s.item.text:'';
  }
  function dateTime(ts){if(!ts)return '—';try{return new Intl.DateTimeFormat('ar-SY',{dateStyle:'medium',timeStyle:'short'}).format(new Date(ts));}catch(e){return new Date(ts).toLocaleString();}}
  function queueRender(delay=0){clearTimeout(renderTimer);renderTimer=setTimeout(()=>{renderTimer=0;render();},delay);}
  function notify(text,tone='ok'){ui.message=text;queueRender();setTimeout(()=>{if(ui.message===text){ui.message='';queueRender();}},2400);}

  function hideWisdom(){
    const host=document.getElementById('hrWisdomContent');if(host)host.style.display='none';
    const btn=document.getElementById('hrWisdomTab');if(btn)btn.classList.remove('active');
  }
  function showWisdom(){
    ['hrProContent','hrAppContent','hrStaffConfigContent','hrStandaloneContent'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
    const host=document.getElementById('hrWisdomContent');if(host)host.style.display='block';
    document.querySelectorAll('#hrProNav button').forEach(b=>b.classList.remove('active'));
    document.getElementById('hrWisdomTab')?.classList.add('active');
    const crumb=document.getElementById('crumb');if(crumb)crumb.innerHTML='<b>قسم الموارد البشرية</b> / الحكمة اليومية';
    render();
  }
  function ensureUI(){
    const hr=document.getElementById('hrApp'),nav=document.getElementById('hrProNav');if(!hr||!nav)return;
    if(!document.getElementById('hrWisdomTab')){
      const b=document.createElement('button');
      b.id='hrWisdomTab';b.type='button';b.dataset.hrView='wisdom';
      b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5c0 2.4-1.8 4.4-4 4.4S8 11.4 8 9V4Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 17h4M12 13.4V17M6 6H4v2a4 4 0 0 0 4 4M18 6h2v2a4 4 0 0 1-4 4M8 20h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>الحكمة اليومية</span>';
      b.onclick=showWisdom;
      const reports=nav.querySelector('[data-hr-view="reports"]');
      if(reports)nav.insertBefore(b,reports);else nav.appendChild(b);
    }
    if(!document.getElementById('hrWisdomContent')){
      const host=document.createElement('div');host.id='hrWisdomContent';host.style.display='none';hr.appendChild(host);
    }
    nav.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.id!=='hrWisdomTab')hideWisdom();});
    document.addEventListener('click',e=>{const x=e.target.closest('[onclick*="goApp("]');if(x)hideWisdom();},true);
  }

  function scheduleBlock(data){
    const s=selection(data);const n=activeItems(data).length;
    return `<section class="w26-card w26-schedule"><div class="w26-card-head"><div><span class="w26-eyebrow">إدارة الظهور</span><h3>متى تتغيّر الحكمة؟</h3><p>الاختيار يغيّر النص فقط داخل بانر «حكمة اليوم» بدون أي تغيير بالشكل.</p></div><button type="button" class="btn" onclick="MoshWisdom26.nextNow()">تغيير الآن</button></div>
      <div class="w26-settings">
        <label><span>نمط التغيير</span><select id="w26Mode" onchange="MoshWisdom26.changeMode(this.value)"><option value="daily" ${data.mode==='daily'?'selected':''}>حكمة جديدة كل يوم</option><option value="hours" ${data.mode==='hours'?'selected':''}>حكمة جديدة كل عدد ساعات</option></select></label>
        <label id="w26HoursWrap" ${data.mode==='hours'?'':'hidden'}><span>كل كم ساعة؟</span><input id="w26Hours" type="number" min="1" max="168" step="1" value="${data.hours}" onchange="MoshWisdom26.changeHours(this.value)"></label>
        <div class="w26-stat"><span>الحكم المفعّلة</span><b>${n}</b></div>
        <div class="w26-stat"><span>التغيير القادم</span><b>${esc(dateTime(s.nextAt))}</b></div>
      </div>
      <div class="w26-current"><span>الحكمة الظاهرة الآن</span><strong>${esc(s.item?.text||originalWisdom())}</strong></div>
    </section>`;
  }
  function addBlock(){
    return `<section class="w26-card"><div class="w26-card-head"><div><span class="w26-eyebrow">إضافة الحكم</span><h3>أضف حكمة أو مئات الحكم دفعة واحدة</h3><p>لإضافة 300 حكمة بسرعة: الصق كل حكمة بسطر مستقل في مربع الإضافة الجماعية.</p></div></div>
      <div class="w26-add-grid">
        <div><label class="w26-label">حكمة واحدة</label><textarea id="w26Single" rows="4" placeholder="اكتب الحكمة هنا..."></textarea><button type="button" class="btn primary" onclick="MoshWisdom26.addOne()">+ إضافة الحكمة</button></div>
        <div><label class="w26-label">إضافة جماعية — حكمة بكل سطر</label><textarea id="w26Bulk" rows="4" placeholder="الحكمة الأولى&#10;الحكمة الثانية&#10;الحكمة الثالثة..."></textarea><button type="button" class="btn" onclick="MoshWisdom26.addBulk()">إضافة جميع الأسطر</button></div>
      </div>
    </section>`;
  }
  function listBlock(data){
    const q=ui.search.trim().toLowerCase();
    const rows=data.items.map((x,i)=>({...x,_i:i})).filter(x=>!q||x.text.toLowerCase().includes(q));
    const per=20,pages=Math.max(1,Math.ceil(rows.length/per));ui.page=Math.max(1,Math.min(pages,ui.page));
    const part=rows.slice((ui.page-1)*per,ui.page*per);
    const body=part.map(x=>{
      const del=ui.pendingDelete===x.id;
      const edit=ui.editId===x.id;
      return `<div class="w26-row ${x.enabled?'':'is-off'}" data-id="${esc(x.id)}">
        <div class="w26-order"><button type="button" title="للأعلى" onclick="MoshWisdom26.move('${esc(x.id)}',-1)">↑</button><button type="button" title="للأسفل" onclick="MoshWisdom26.move('${esc(x.id)}',1)">↓</button><span>${x._i+1}</span></div>
        <div class="w26-text">${edit?`<textarea id="w26EditText" rows="3">${esc(x.text)}</textarea>`:`<b>${esc(x.text)}</b>`}<small>${x.enabled?'مفعّلة وتدخل في التدوير':'موقوفة — لا تظهر في التطبيق'}</small></div>
        <div class="w26-row-actions">
          ${edit?`<button type="button" class="btn primary" onclick="MoshWisdom26.saveEdit('${esc(x.id)}')">حفظ</button><button type="button" class="btn" onclick="MoshWisdom26.cancelEdit()">إلغاء</button>`:`<button type="button" class="btn" onclick="MoshWisdom26.startEdit('${esc(x.id)}')">تعديل</button><button type="button" class="btn" onclick="MoshWisdom26.toggle('${esc(x.id)}')">${x.enabled?'إيقاف':'تفعيل'}</button>`}
          ${del?`<button type="button" class="btn danger" onclick="MoshWisdom26.confirmDelete('${esc(x.id)}')">تأكيد الحذف</button><button type="button" class="btn" onclick="MoshWisdom26.cancelDelete()">تراجع</button>`:`<button type="button" class="btn" onclick="MoshWisdom26.askDelete('${esc(x.id)}')">حذف</button>`}
        </div>
      </div>`;
    }).join('')||'<div class="w26-empty">لا توجد حكم مطابقة للبحث.</div>';
    return `<section class="w26-card"><div class="w26-card-head"><div><span class="w26-eyebrow">مكتبة الحكم</span><h3>${data.items.length} حكمة مسجلة</h3><p>يمكنك ترتيبها أو تعديلها أو إيقاف أي حكمة بدون حذفها.</p></div><div class="w26-search"><input type="search" value="${esc(ui.search)}" placeholder="بحث داخل الحكم..." oninput="MoshWisdom26.search(this.value)"></div></div>
      <div class="w26-list">${body}</div>
      <div class="w26-pager"><span>${rows.length} نتيجة · صفحة ${ui.page} من ${pages}</span><div><button class="btn" ${ui.page<=1?'disabled':''} onclick="MoshWisdom26.page(-1)">السابق</button><button class="btn" ${ui.page>=pages?'disabled':''} onclick="MoshWisdom26.page(1)">التالي</button></div></div>
    </section>`;
  }
  function render(){
    const host=document.getElementById('hrWisdomContent');if(!host||host.style.display==='none')return;
    const data=load();
    host.innerHTML=`<div class="w26" dir="rtl"><div class="w26-hero"><div><span class="w26-eyebrow">الموارد البشرية · التواصل الداخلي</span><h2>إدارة الحكمة اليومية</h2><p>مكتبة مركزية للحِكم التي تظهر في الصفحة الرئيسية. تستطيع إضافة عدد كبير منها وتحديد وقت التغيير التلقائي.</p></div><div class="w26-hero-count"><b>${activeItems(data).length}</b><span>حكمة مفعّلة</span></div></div>${ui.message?`<div class="w26-toast ${ui.message.includes('تعذر')?'bad':''}">${esc(ui.message)}</div>`:''}${scheduleBlock(data)}${addBlock()}${listBlock(data)}</div>`;
  }

  async function update(mutator,msg){const d=load();mutator(d);try{await save(d);applyBanner();if(msg)notify(msg);else queueRender();return true;}catch(error){notify(error?.message||'تعذر الحفظ.','bad');return false;}}
  async function addItems(lines){
    const vals=lines.map(x=>String(x||'').trim()).filter(Boolean);if(!vals.length)return 0;
    let added=0;await update(d=>{const seen=new Set(d.items.map(x=>x.text.toLowerCase()));vals.forEach(t=>{const k=t.toLowerCase();if(seen.has(k))return;d.items.push({id:'W-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),text:t,enabled:true,createdAt:nowIso(),updatedAt:nowIso()});seen.add(k);added++;});},'');return added;
  }

  window.MoshWisdom26={
    open:showWisdom,
    refresh:function(){applyBanner();render();},
    syncBanner:applyBanner,
    changeMode:async function(v){await update(d=>{d.mode=v==='hours'?'hours':'daily';d.anchor=Date.now();},'تم تحديث نمط تغيير الحكمة.');},
    changeHours:async function(v){const n=Math.max(1,Math.min(168,Number(v)||6));await update(d=>{d.hours=n;d.anchor=Date.now();},'تم حفظ فترة التغيير.');},
    nextNow:async function(){const d=load();if(activeItems(d).length<2){notify('فعّل حكمتين على الأقل حتى يعمل التبديل.','bad');return false;}const before=selection(d).item?.id||'';d.offset=(Number(d.offset)||0)+1;try{await save(d);}catch(error){notify(error?.message||'تعذر الحفظ.','bad');return false;}const after=selection(d).item?.id||'';applyBanner();notify(after&&after!==before?'تم تغيير الحكمة الظاهرة الآن.':'تعذر الانتقال إلى حكمة مختلفة.','bad');return after!==before;},
    addOne:async function(){const e=document.getElementById('w26Single'),t=String(e?.value||'').trim();if(!t)return notify('اكتب الحكمة أولاً.','bad');const n=await addItems([t]);if(e)e.value='';notify(n?'تمت إضافة الحكمة.':'هذه الحكمة موجودة مسبقًا.');},
    addBulk:async function(){const e=document.getElementById('w26Bulk'),lines=String(e?.value||'').split(/\r?\n/);const n=await addItems(lines);if(e)e.value='';notify(n?`تمت إضافة ${n} حكمة.`:'لم تتم إضافة حكم جديدة.');},
    search:function(v){ui.search=String(v||'');ui.page=1;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{render();const e=document.querySelector('.w26-search input');if(e){e.focus();try{e.setSelectionRange(e.value.length,e.value.length);}catch(_){}}},120);},
    page:function(d){ui.page+=Number(d)||0;render();},
    startEdit:function(id){ui.editId=id;ui.pendingDelete='';render();setTimeout(()=>document.getElementById('w26EditText')?.focus(),0);},
    cancelEdit:function(){ui.editId='';render();},
    saveEdit:async function(id){const t=String(document.getElementById('w26EditText')?.value||'').trim();if(!t)return notify('لا يمكن حفظ حكمة فارغة.','bad');if(await update(d=>{const x=d.items.find(x=>x.id===id);if(x){x.text=t;x.updatedAt=nowIso();}},'تم تعديل الحكمة.'))ui.editId='';},
    toggle:async function(id){await update(d=>{const x=d.items.find(x=>x.id===id);if(x)x.enabled=!x.enabled;},'تم تحديث حالة الحكمة.');},
    move:async function(id,dir){await update(d=>{const i=d.items.findIndex(x=>x.id===id),j=i+(Number(dir)||0);if(i>=0&&j>=0&&j<d.items.length){const [x]=d.items.splice(i,1);d.items.splice(j,0,x);}},'تم تحديث ترتيب الحكم.');},
    askDelete:function(id){ui.pendingDelete=id;ui.editId='';render();},
    cancelDelete:function(){ui.pendingDelete='';render();},
    confirmDelete:async function(id){if(await update(d=>{d.items=d.items.filter(x=>x.id!==id);},'تم حذف الحكمة.'))ui.pendingDelete='';},
    inspect:function(){const d=load(),s=selection(d);return {version:d.version,mode:d.mode,offset:d.offset,total:d.items.length,active:activeItems(d).length,current:s.item?{id:s.item.id,text:s.item.text}:null,nextAt:s.nextAt};}
  };

  // Keep the existing banner markup/style untouched: only its paragraph text changes.
  try{localStorage.removeItem('mosh_wisdom_runtime_v32b');}catch(e){}
  ensureUI();applyBanner();
  document.addEventListener('mosh:page-mounted',event=>{if(event.detail.app==='hr')ensureUI();});
  setInterval(applyBanner,60000);
  window.addEventListener('storage',e=>{if(e.key===KEY){applyBanner();render();}});
  const oldOpenHR=window.openHRPro;if(typeof oldOpenHR==='function')window.openHRPro=function(){hideWisdom();return oldOpenHR.apply(this,arguments);};
  const oldDist=window.openProductiveDistributionPage;if(typeof oldDist==='function')window.openProductiveDistributionPage=function(k){if(k==='hr')hideWisdom();return oldDist.apply(this,arguments);};
  const oldRun=window.openProductiveRunningTasksPage;if(typeof oldRun==='function')window.openProductiveRunningTasksPage=function(k){if(k==='hr')hideWisdom();return oldRun.apply(this,arguments);};
})();
