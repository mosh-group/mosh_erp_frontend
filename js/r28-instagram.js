/* MOSH R28 — official Instagram outbox. Server records, permissions and status are authoritative.
 * Existing customer socialHub records remain read-only history, never proof of publication. */
(function () {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api = () => window.MoshApi;
  const ui = () => window.MoshUI19;
  const uid = () => crypto.randomUUID();
  const owner = () => String(api()?.user?.id || '');
  const customers = () => (typeof state !== 'undefined' && Array.isArray(state.customers) ? state.customers : []).filter(c => !c.deletedAt);
  const labels = {draft:'مسودة',pending_approval:'بانتظار الاعتماد',scheduled:'مجدول',queued:'بانتظار التنفيذ',preparing:'تجهيز الوسائط',processing:'يعالج Instagram الوسائط',publishing:'جارٍ النشر',reconciling:'جارٍ التحقق من النشر',published:'منشور بتأكيد Instagram',rejected:'معاد للتعديل',rejected_final:'مرفوض نهائياً',failed:'تعذر التنفيذ',blocked:'متوقف',uncertain:'النتيجة غير مؤكدة',cancelled:'أُلغي طلب النشر'};
  const accountLabels = {connected:'متصل رسمياً',expired:'انتهى الاتصال',disconnected:'مفصول',revoked:'أُلغي التفويض',deleted:'حُذفت بيانات الربط'};
  const workable = ['queued','scheduled','preparing','processing','publishing','reconciling'];
  const editable = ['draft','rejected','failed','blocked','cancelled'];
  const cancellable = ['draft','rejected','pending_approval','scheduled','queued','failed','blocked'];
  const filters = {all:'الكل',draft:'المسودات',pending_approval:'للاعتماد',scheduled:'قائمة النشر',published:'المنشور',attention:'يحتاج متابعة'};
  let selected = '', model = null, generation = 0, filter = 'all', loading = false;
  const host = () => $('#marketingSocialHubContent');
  const cap = key => !!model?.capabilities?.[key];
  const notice = (message, bad = false) => ui()?.toast ? ui().toast(message, bad) : api()?.showError(new Error(message));
  const stamp = value => { if (!value) return '—'; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString('ar', {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'; };
  const badge = status => `<span class="ig28-badge ig28-${E(status)}">${E(labels[status] || status)}</span>`;
  const button = (text, action, id = '', primary = false, disabled = false) => `<button type="button" class="ig28-btn${primary?' primary':''}" data-ig28="${E(action)}" data-id="${E(id)}"${disabled?' disabled':''}>${E(text)}</button>`;
  const dialog = (id, title, html, dirty = false) => {
    const d = ui().dialog(id,title,`<div class="ig28 ig28-form">${html}</div>`,{wide:true,dirty});
    d.classList.add('ig28-dialog'); return d;
  };
  const errorBox = () => '<p class="ig28-error" data-ig28-error role="alert" hidden></p>';
  function errorIn(d, e) { const box = $('[data-ig28-error]',d); if (box) {box.hidden=false;box.textContent=e?.message||String(e);} else notice(e?.message||String(e),true); }
  function busy(d, value) {
    d.setAttribute('aria-busy',String(value));
    d.querySelectorAll('button,input,select,textarea').forEach(el => { if (value) {el.dataset.ig28WasDisabled=el.disabled?'1':'0';el.disabled=true;} else if ('ig28WasDisabled' in el.dataset) {el.disabled=el.dataset.ig28WasDisabled==='1';delete el.dataset.ig28WasDisabled;} });
  }
  async function retry(path, options) {
    // A repeated HTTP request carries the same server-side idempotency key.
    try {return await api().request(path,options);} catch (e) {if (!e.network) throw e;return api().request(path,options);}
  }
  function sameUser(who) { if (owner()!==who) throw new Error('تغير الحساب أثناء العملية؛ أعد فتح القسم.'); }
  function shell() {
    const app = $('#socialApp'); if (!app) return null;
    app.classList.add('ig28-open');
    let h = host(); if (!h) {h=document.createElement('div');h.id='marketingSocialHubContent';app.append(h);}
    const normal = $('#socialAppContent'); if (normal) normal.style.display='none';
    h.style.display='block'; const crumb=$('#crumb');if(crumb)crumb.innerHTML='<b>قسم السوشال ميديا</b> / إدارة السوشال ميديا';return h;
  }
  function leave() {
    ++generation;loading=false;
    $('#socialApp')?.classList.remove('ig28-open');
    if (host()) host().style.display='none';
  }
  // Preserve the existing marketing navigation: social content is one separate view.
  document.addEventListener('click', e => {
    const target=e.target.closest?.('#socialApp .menu-strip button,#socialApp .menu-strip a');
    if(target&&!target.closest('#socialHubTab'))leave();
  },true);
  for(const name of ['openDashboard','openView','openCustomer','openRunning']) {
    const module=window.MoshMarketingV33, original=module?.[name];
    if(typeof original==='function')module[name]=function(){leave();return original.apply(this,arguments);};
  }
  async function load(customerId = selected) {
    const h=host(); if (!h) return;
    selected=String(customerId || customers()[0]?.id || '');
    const ticket=++generation, who=owner(); loading=true; model=null;render();
    if (!selected) {loading=false;render();return;}
    try {
      const result=await api().request('/social/instagram?'+new URLSearchParams({customerId:selected}));
      if (ticket!==generation || owner()!==who) return;
      model=result;loading=false;render();
    } catch (e) {
      if (ticket!==generation || owner()!==who) return;
      loading=false;model={error:e.message};render();
    }
  }
  function legacyHtml() {
    const c=customers().find(x=>String(x.id)===selected),old=c?.marketingProfile?.socialHub;
    const accounts=Array.isArray(old?.accounts)?old.accounts:[],posts=Array.isArray(old?.posts)?old.posts:[];
    if (!accounts.length&&!posts.length) return '';
    return `<details class="ig28-panel ig28-legacy"><summary>السجل السابق — ${accounts.length} تعريف حساب و${posts.length} سجل محتوى</summary><p class="ig28-muted">هذه بيانات النسخة السابقة محفوظة كما هي للرجوع إليها. حالاتها ليست إثبات اتصال أو نشر لدى Instagram، ولا تُنفّذ كجدولة تلقائية.</p><div class="ig28-legacy-list">${accounts.map(a=>`<article><strong>${E(a.pageName||a.handle||'تعريف حساب')}</strong><span>${E(a.platform||'')} · تعريف سابق غير موثّق</span></article>`).join('')}${posts.slice().reverse().map(p=>`<article><strong>${E(p.text||p.attachmentName||'محتوى سابق')}</strong><span>${E(stamp(p.createdAt))} · ${E(p.status||'')} في السجل القديم</span>${p.attachmentKey?button('فتح المرفق السابق','file',p.attachmentKey):''}</article>`).join('')}</div></details>`;
  }
  function postHtml(p) {
    const a=(model.accounts||[]).find(x=>x.id===p.accountId);
    const creator=String(p.createdById)===owner(), ownSubmission=String(p.submittedById||p.createdById)===owner();
    let actions=button('التفاصيل','details',p.id);
    if (cap('compose')&&editable.includes(p.status)) actions+=button('تعديل المحتوى','edit',p.id);
    if (p.status==='pending_approval'&&cap('approve')&&(!ownSubmission||cap('configure'))) actions+=button('اعتماد','approve',p.id,true)+button('إعادة للتعديل','return',p.id)+button('رفض نهائي','reject',p.id);
    if (workable.includes(p.status)&&p.status!=='scheduled') actions+=button('تحقق من الحالة','check',p.id);
    if (cancellable.includes(p.status)&&(creator||cap('approve'))) actions+=button('إلغاء طلب النشر','cancel',p.id);
    if (p.status==='published'&&p.mediaId&&cap('insights')) actions+=button('إحصائيات المنشور','post-insights',p.id);
    return `<article class="ig28-post"><div class="ig28-post-top"><span class="ig28-kind">${p.mediaKind==='reel'?'ريلز · MP4':'صورة · JPEG'} · <bdi>${a?.username?'@'+E(a.username):'لم يُحدّد حساب'}</bdi></span>${badge(p.status)}</div><p class="ig28-caption">${E(p.caption||'محتوى بدون نص مرفق')}</p><div class="ig28-post-meta"><span>${E(p.createdBy||'')} · ${E(stamp(p.createdAt))}</span>${p.scheduledAt?`<span>موعد النشر: ${E(stamp(p.scheduledAt))}</span>`:''}${p.publishedAt?`<span>تأكيد النشر: ${E(stamp(p.publishedAt))}</span>`:''}</div>${p.lastError?`<p class="ig28-inline-warning">${E(p.lastError)}</p>`:''}<footer class="ig28-actions">${actions}</footer></article>`;
  }
  function render() {
    const h=host(); if (!h) return;
    const list=customers(),c=list.find(x=>String(x.id)===selected);
    const head=`${window.MoshSocial34?.bar('instagram',selected)||''}<header class="ig28-head"><div><span class="ig28-eyebrow">MOSH / SOCIAL MEDIA</span><h2>إدارة السوشال ميديا</h2><p>حسابات العملاء، المحتوى والاعتماد — النشر مستقل عن المهام.</p></div><label>العميل<select id="ig28Customer" aria-label="العميل">${list.map(x=>`<option value="${E(x.id)}"${String(x.id)===selected?' selected':''}>${E(MoshCustomerNames36.display(x))}</option>`).join('')}</select></label><div class="ig28-actions">${button('لوحة السوشال ميديا','back')}${button('تحديث الاتصال','refresh')}${cap('configure')?button('إعدادات Instagram','config'):''}</div></header>`;
    if (!list.length) {h.innerHTML='<div class="ig28"><section class="ig28-panel ig28-empty">أضف عميلاً من دليل العملاء أولاً.</section></div>';return;}
    if (loading) {h.innerHTML=`<div class="ig28">${head}<section class="ig28-panel ig28-empty" role="status"><span class="ig28-spinner"></span> جارٍ تحميل بيانات العميل من الخادم…</section></div>`;return;}
    if (model?.error) {h.innerHTML=`<div class="ig28">${head}<div class="ig28-error" role="alert">${E(model.error)}</div></div>`;return;}
    if (!model) return;
    const posts=model.posts||[],accounts=model.accounts||[],config=model.configuration||{};
    const counts=[['حسابات متصلة',accounts.filter(a=>a.status==='connected').length],['مسودات',posts.filter(p=>p.status==='draft').length],['بانتظار الاعتماد',posts.filter(p=>p.status==='pending_approval').length],['بقائمة النشر',posts.filter(p=>workable.includes(p.status)).length]];
    const rows=posts.filter(p=>filter==='all'||filter==='scheduled'&&workable.includes(p.status)||filter==='attention'&&['rejected','rejected_final','failed','blocked','uncertain'].includes(p.status)||p.status===filter);
    h.innerHTML=`<div class="ig28">${head}<div class="ig28-service"><span class="${config.configured?'ig28-ok':''}">${config.configured?'✓ إعداد الربط موجود':'إعداد تطبيق Meta غير مكتمل'}</span><span class="${config.scheduler?.active?'ig28-ok':''}">${config.scheduler?.active?'✓ عامل الجدولة نشط':'عامل الجدولة غير مشغّل'}${config.scheduler?.lastRunAt?' · آخر اتصال '+E(stamp(config.scheduler.lastRunAt)):''}</span></div><div class="ig28-kpis">${counts.map(([title,n])=>`<article><span>${E(title)}</span><strong>${n}</strong></article>`).join('')}</div>
    <section class="ig28-panel"><header class="ig28-section-head"><div><h3>حسابات ${E(c?.name||'العميل')}</h3><p>الاتصال الرسمي يظهر فقط بعد موافقة Instagram.</p></div>${cap('connect')?button('ربط Instagram رسمي','connect','',true):''}</header><div class="ig28-accounts">${accounts.map(a=>`<article class="ig28-account"><div class="ig28-account-icon" aria-hidden="true">IG</div><div class="ig28-account-name"><strong><bdi>${a.username?'@'+E(a.username):'حساب غير متصل'}</bdi></strong><span class="${a.status==='connected'?'ig28-ok':''}">${E(accountLabels[a.status]||a.status)}</span><small>${a.expiresAt?'صلاحية الاتصال حتى '+E(stamp(a.expiresAt)):''}</small></div><div class="ig28-actions">${cap('insights')&&a.status==='connected'?button('الإحصائيات','insights',a.id):''}${cap('connect')&&a.status==='connected'?button('فصل الربط','disconnect',a.id):''}</div></article>`).join('')||'<div class="ig28-empty">لا يوجد حساب Instagram متصل لهذا العميل بعد. تعريف اسم المستخدم وحده لا يكفي للربط.</div>'}</div></section>
    <section class="ig28-panel"><header class="ig28-section-head"><div><h3>المحتوى والنشر</h3><p>النشر المباشر: ${cap('direct')?'مسموح':'يحتاج اعتماداً'} · الجدولة المباشرة: ${cap('schedule')?'مسموحة':'تحتاج اعتماداً'}. المسودة لا تنشر تلقائياً.</p></div>${cap('compose')?button('+ إنشاء محتوى','compose','',true):''}</header><nav class="ig28-filters" aria-label="تصفية المحتوى">${Object.entries(filters).map(([key,title])=>`<button type="button" data-ig28="filter" data-id="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${E(title)}</button>`).join('')}</nav><div class="ig28-posts">${rows.map(postHtml).join('')||'<div class="ig28-empty">لا يوجد محتوى ضمن هذا العرض.</div>'}</div></section>${legacyHtml()}<p class="ig28-footnote">الصورة والريلز في هذا الإصدار. لا يُغيّر النشر حالة أي مهمة، ولا يُنشئ قيداً محاسبياً تلقائياً.</p></div>`;
  }
  function compose(existing = null) {
    if (!cap('compose')) return;
    const who=owner(), customerId=selected, accounts=model.accounts||[], requestId=uid();
    const initial={...(existing||{})}; let fileKey=initial.attachmentKey||'', uploadedFile=null, pendingPayload=null;
    const when=initial.scheduledAt?new Date(new Date(initial.scheduledAt).getTime()-new Date(initial.scheduledAt).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
    const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'توقيت جهازك';
    const d=dialog('ig28Compose',existing?'تعديل المحتوى':'إنشاء محتوى Instagram',`<p class="ig28-muted">${E(customers().find(c=>String(c.id)===customerId)?.name||'')} · النشر الفوري والجدولة صلاحيتان مستقلتان؛ يُحال الإجراء للاعتماد عندما لا تملك صلاحيته المباشرة.</p><div class="ig28-grid"><label>حساب Instagram<select id="ig28Account"><option value="">يُحدّد قبل النشر</option>${accounts.map(a=>`<option value="${E(a.id)}"${a.id===initial.accountId?' selected':''}>@${E(a.username||'')} — ${E(accountLabels[a.status]||a.status)}</option>`).join('')}</select></label><label>نوع المحتوى<select id="ig28Kind"><option value="image"${initial.mediaKind!=='reel'?' selected':''}>صورة واحدة — JPEG</option><option value="reel"${initial.mediaKind==='reel'?' selected':''}>ريلز — MP4</option></select></label></div><label>نص المنشور<textarea id="ig28Caption" rows="5" maxlength="2200" placeholder="اكتب النص المرافق للمحتوى…">${E(initial.caption||'')}</textarea><small id="ig28Chars">${(initial.caption||'').length} / 2200</small></label><label class="ig28-upload">الصورة أو الفيديو<input type="file" id="ig28File" accept="image/jpeg,video/mp4"><span id="ig28FileLabel">${E(initial.attachmentName||'لم يُرفق ملف بعد')}</span><small>JPEG حتى 8 ميغابايت بنسبة من 4:5 إلى 1.91:1، أو MP4 حتى 25 ميغابايت. قبول الفيديو النهائي يعتمد على معالجة Instagram.</small></label><label>موعد الجدولة<input id="ig28When" type="datetime-local" value="${E(when)}"><small>الموعد بحسب ${E(zone)}، ويُحفظ بتوقيت موحّد على السيرفر. تحتاج الجدولة عاملاً نشطاً.</small></label>${errorBox()}<footer class="ig28-actions"><button type="button" class="ig28-btn primary" data-save-mode="draft">حفظ مسودة</button><button type="button" class="ig28-btn" data-save-mode="schedule">${cap('schedule')?'اعتماد الجدولة':'إرسال الجدولة للاعتماد'}</button><button type="button" class="ig28-btn" data-save-mode="publish">${cap('direct')?'نشر الآن':'إرسال للنشر والاعتماد'}</button><button type="button" class="ig28-btn" data-r19-close="ig28Compose">إلغاء</button></footer>`,true);
    $('#ig28Caption',d).addEventListener('input',e=>{$('#ig28Chars',d).textContent=e.target.value.length+' / 2200';});
    $('#ig28File',d).addEventListener('change',e=>{$('#ig28FileLabel',d).textContent=e.target.files?.[0]?.name||initial.attachmentName||'لم يُرفق ملف بعد';});
    async function save(mode) {
      if (d.getAttribute('aria-busy')==='true') return;
      busy(d,true);
      try {
        sameUser(who);const file=$('#ig28File',d).files?.[0],kind=$('#ig28Kind',d).value;
        if (file&&uploadedFile!==file) {
          const isJpeg=/\.jpe?g$/i.test(file.name)&&(!file.type||file.type==='image/jpeg');
          const isMp4=/\.mp4$/i.test(file.name)&&(!file.type||file.type==='video/mp4');
          if ((kind==='image'&&!isJpeg)||(kind==='reel'&&!isMp4)) throw new Error('اختر نوع الملف المطابق للمحتوى: JPEG للصورة أو MP4 للريلز.');
          if (file.size>(kind==='image'?8:25)*1024*1024) throw new Error('حجم الملف يتجاوز الحد المسموح.');
        }
        const accountId=$('#ig28Account',d).value,rawWhen=$('#ig28When',d).value;
        if (mode!=='draft'&&!accounts.some(a=>a.id===accountId&&a.status==='connected')) throw new Error('اختر حساباً متصلاً رسمياً قبل طلب النشر.');
        if (mode!=='draft'&&!file&&!fileKey) throw new Error('أرفق صورة أو فيديو؛ لا يمكن نشر النص منفرداً.');
        if (mode==='schedule'&&(!rawWhen||!Number.isFinite(new Date(rawWhen).getTime())||new Date(rawWhen).getTime()<=Date.now())) throw new Error('حدد موعداً مستقبلياً للجدولة.');
        if (file&&uploadedFile!==file) {
          // Upload only once per chosen File. The server verifies content MIME, ownership and image ratio.
          const key='IG28-'+uid();fileKey=await api().upload({key,kind:'instagram',name:file.name,type:file.type,size:file.size,blob:file});uploadedFile=file;
        }
        sameUser(who);
        const payload={customerId,accountId,caption:$('#ig28Caption',d).value,mediaKind:kind,attachmentKey:fileKey,mode,scheduledAt:mode==='schedule'?new Date(rawWhen).toISOString():null,_version:initial._version||0};
        const encoded=JSON.stringify(payload);
        if (!pendingPayload || pendingPayload.encoded!==encoded) pendingPayload={encoded,body:{...payload,requestId:pendingPayload?uid():requestId}};
        const saved=await retry('/social/posts'+(existing?'/'+encodeURIComponent(existing.id):''),{method:existing?'PATCH':'POST',body:pendingPayload.body});
        sameUser(who);busy(d,false);ui().close('ig28Compose',true);
        notice(labels[saved.status]||'حُفظ المحتوى على الخادم.');if(selected===customerId)await load(customerId);
      } catch(e) {busy(d,false);errorIn(d,e);}
    }
    d.querySelectorAll('[data-save-mode]').forEach(b=>b.addEventListener('click',()=>save(b.dataset.saveMode)));
    d._r19Save=()=>save('draft');
  }
  async function configure() {
    if (!cap('configure')) return;
    const who=owner(),c=await api().request('/social/instagram/configuration');sameUser(who);
    const base=new URL(window.API_BASE_URL,location.href).origin;
    const d=dialog('ig28Config','إعداد ربط Instagram الرسمي',`<p class="ig28-muted">تُحفظ مفاتيح التطبيق على الخادم. لا تدخل كلمة سر حساب Instagram هنا. املأ البيانات من تطبيق Meta الخاص بموش، ولا تشارك السر مع الموظفين.</p><label>Instagram App ID<input id="ig28AppId" dir="ltr" inputmode="numeric" autocomplete="off" value="${E(c.appId||'')}"></label><label>Instagram App Secret<input id="ig28Secret" dir="ltr" type="password" autocomplete="new-password" placeholder="${c.hasSecret?'محفوظ — اتركه فارغاً للاحتفاظ به':'أدخل سر التطبيق'}"></label><label>عنوان رجوع التفويض — HTTPS<input id="ig28Redirect" dir="ltr" type="url" value="${E(c.redirectUri||base+'/api/social/instagram/callback')}"></label><label>عنوان الخادم العام للوسائط — HTTPS<input id="ig28Base" dir="ltr" type="url" value="${E(c.publicBaseUrl||base)}"></label><label>إصدار Graph API<input id="ig28Version" dir="ltr" value="${E(c.graphVersion||'v26.0')}"></label><div class="ig28-inline-warning">يلزم حساب احترافي وتفويض الصلاحيات المطلوبة في Meta. عنوان الرجوع والوسائط يجب أن يكونا قابلين للوصول عبر HTTPS. عامل الجدولة منفصل عن تشغيل الواجهة.</div><p class="ig28-muted" dir="ltr">instagram_business_basic<br>instagram_business_content_publish<br>instagram_business_manage_insights</p>${errorBox()}<footer class="ig28-actions">${button('حفظ إعدادات الربط','save-config','',true)}<button type="button" class="ig28-btn" data-r19-close="ig28Config">إلغاء</button></footer>`,true);
    let previous=null;
    const save=async()=>{
      if(d.getAttribute('aria-busy')==='true')return;busy(d,true);
      try {
        sameUser(who);const payload={appId:$('#ig28AppId',d).value.trim(),appSecret:$('#ig28Secret',d).value,redirectUri:$('#ig28Redirect',d).value.trim(),publicBaseUrl:$('#ig28Base',d).value.trim().replace(/\/$/,''),graphVersion:$('#ig28Version',d).value.trim(),_version:c._version||0};
        const encoded=JSON.stringify(payload);if(!previous||previous.encoded!==encoded)previous={encoded,body:{...payload,requestId:uid()}};
        await retry('/social/instagram/configuration',{method:'PUT',body:previous.body});sameUser(who);$('#ig28Secret',d).value='';previous=null;busy(d,false);ui().close('ig28Config',true);notice('حُفظ إعداد التطبيق. الخطوة التالية تفويض حساب العميل.');await load();
      } catch(e){busy(d,false);errorIn(d,e);}
    };
    $('[data-ig28="save-config"]',d).onclick=save;d._r19Save=save;
    d.addEventListener('close',()=>{$('#ig28Secret',d).value='';previous=null;},{once:true});
  }
  async function connect() {
    if (!cap('connect')) return;
    if (!model.configuration?.configured) {notice('أكمل إعداد تطبيق Meta من الحساب الأساسي أولاً.',true);return;}
    // Open synchronously during the user's gesture so popup blockers do not break OAuth.
    const popup=window.open('about:blank','moshInstagramLogin','popup,width=680,height=760');
    if (!popup) {notice('اسمح بالنافذة المنبثقة لهذا الموقع لفتح تفويض Instagram.',true);return;}
    popup.document.title='تفويض Instagram';popup.document.body.textContent='جارٍ فتح نافذة التفويض الرسمية…';
    const who=owner(),customerId=selected;
    try {
      const data=await api().request('/social/instagram/connect',{method:'POST',body:{customerId}});sameUser(who);
      const url=new URL(data.authorizationUrl);
      if(url.protocol!=='https:'||url.hostname!=='www.instagram.com'||url.pathname!=='/oauth/authorize')throw new Error('عنوان تفويض غير صالح.');
      popup.location.href=url.href;
      notice('أكمل التفويض في نافذة Instagram، ثم أغلقها وحدّث الاتصال.');
      let attempts=0;const poll=setInterval(()=>{if(popup.closed||++attempts>600){clearInterval(poll);if(popup.closed&&owner()===who&&selected===customerId)load(customerId);}},1000);
    } catch(e){popup.close();notice(e.message,true);}
  }
  function decision(id, action) {
    const p=model?.posts?.find(x=>x.id===id);if(!p)return;
    const who=owner(),customerId=selected,requestId=uid();
    const titles={approve:'اعتماد المحتوى للنشر',return:'إعادة المحتوى للتعديل',reject:'رفض المحتوى نهائياً',cancel:'إلغاء طلب النشر'};
    const d=dialog('ig28Decision',titles[action],`<p class="ig28-caption">${E(p.caption||p.attachmentName||'محتوى بدون نص')}</p><p class="ig28-muted">${action==='approve'?(p.mode==='schedule'?'سيُنشر في الموعد المعتمد: '+E(stamp(p.scheduledAt)):'سيبدأ إرسال المحتوى إلى Instagram بعد الاعتماد.'):action==='cancel'?'يُلغي هذا طلب النشر داخل موش فقط. لا يحذف منشوراً من Instagram ولا يغيّر أي مهمة.':'اكتب الملاحظات التي يحتاجها محرر المحتوى.'}</p>${['reject','return'].includes(action)?'<label>سبب القرار<textarea id="ig28Note" maxlength="2000" rows="3"></textarea></label>':''}${errorBox()}<footer class="ig28-actions">${button(titles[action],'confirm-decision','',true)}<button type="button" class="ig28-btn" data-r19-close="ig28Decision">رجوع</button></footer>`);
    const save=async()=>{
      if(d.getAttribute('aria-busy')==='true')return;busy(d,true);
      try {sameUser(who);const note=$('#ig28Note',d)?.value.trim()||'';if(['reject','return'].includes(action)&&!note)throw new Error('اكتب سبب القرار.');const result=await retry('/social/posts/'+encodeURIComponent(id)+'/decision',{method:'POST',body:{action,note,_version:p._version,requestId}});sameUser(who);busy(d,false);ui().close('ig28Decision',true);notice(labels[result.status]||'تم الحفظ.');if(selected===customerId)await load(customerId);}catch(e){busy(d,false);errorIn(d,e);}
    };$('[data-ig28="confirm-decision"]',d).onclick=save;
  }
  function disconnect(id) {
    const account=model?.accounts?.find(x=>x.id===id);if(!account||!cap('connect'))return;
    const who=owner(),customerId=selected,requestId=uid();
    const d=dialog('ig28Disconnect','فصل اتصال Instagram',`<p>فصل الحساب <bdi>@${E(account.username)}</bdi> عن موش؟</p><p class="ig28-muted">تُحذف صلاحية الوصول المحفوظة في موش. تتوقف الطلبات التي تحتاج هذا الاتصال. لا نحذف المحتوى المنشور من Instagram.</p>${errorBox()}<footer class="ig28-actions">${button('فصل الاتصال','confirm-disconnect','',true)}<button type="button" class="ig28-btn" data-r19-close="ig28Disconnect">رجوع</button></footer>`);
    $('[data-ig28="confirm-disconnect"]',d).onclick=async()=>{busy(d,true);try{sameUser(who);await retry('/social/accounts/'+encodeURIComponent(id)+'/disconnect',{method:'POST',body:{_version:account._version,requestId}});sameUser(who);busy(d,false);ui().close('ig28Disconnect',true);notice('فُصل الاتصال.');if(selected===customerId)await load(customerId);}catch(e){busy(d,false);errorIn(d,e);}};
  }
  async function insights(id, postId='') {
    if(!cap('insights'))return;
    const who=owner(),d=dialog('ig28Insights',postId?'إحصائيات المنشور':'إحصائيات Instagram',`<label>الفترة<select id="ig28InsightDays"><option value="7">آخر 7 أيام</option><option value="30">آخر 30 يوماً</option></select></label><div id="ig28Metrics" role="status"></div>${errorBox()}`);
    let ticket=0;
    const fetchMetrics=async()=>{
      const n=++ticket,target=$('#ig28Metrics',d);target.innerHTML='<p class="ig28-empty"><span class="ig28-spinner"></span> جارٍ قراءة الإحصائيات من Instagram…</p>';
      try {const result=await api().request('/social/accounts/'+encodeURIComponent(id)+'/insights?'+new URLSearchParams({days:$('#ig28InsightDays',d).value,...(postId?{postId}:{})}));sameUser(who);if(n!==ticket)return;
        const names={views:'المشاهدات',reach:'الوصول',saved:'الحفظ',total_interactions:'التفاعلات'};
        target.innerHTML=`<div class="ig28-kpis">${Object.entries(names).filter(([key])=>key in result.metrics||key in result.unavailable).map(([key,title])=>`<article><span>${E(title)}</span><strong>${key in result.metrics?E(Number(result.metrics[key]).toLocaleString('ar')):'—'}</strong>${result.unavailable[key]?`<small>${E(result.unavailable[key])}</small>`:''}</article>`).join('')}</div><p class="ig28-muted">آخر قراءة: ${E(stamp(result.fetchedAt))}. علامة «—» تعني أن البيانات غير متاحة، وليست صفراً.${postId?' إحصائيات المنشور بحسب مدة القياس التي يعيدها Instagram.':''}</p>`;
      } catch(e){if(n===ticket){target.innerHTML='';errorIn(d,e);}}
    };$('#ig28InsightDays',d).onchange=fetchMetrics;if(postId)$('#ig28InsightDays',d).disabled=true;await fetchMetrics();
  }
  async function file(key) {
    const who=owner(),result=await api().file(key);sameUser(who);
    const url=URL.createObjectURL(result.blob);const a=document.createElement('a');a.href=url;a.download=result.name||'attachment';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function details(id) {
    const p=model?.posts?.find(x=>x.id===id);if(!p)return;
    dialog('ig28Details','تفاصيل المحتوى',`${badge(p.status)}<p class="ig28-caption">${E(p.caption||'بدون نص')}</p><p>${E(p.attachmentName||'بدون ملف')} ${p.attachmentKey?button('فتح المرفق','file',p.attachmentKey):''}</p>${p.mediaId?`<p class="ig28-muted">معرّف منشور Instagram: <bdi>${E(p.mediaId)}</bdi></p>`:''}${p.lastError?`<p class="ig28-inline-warning">${E(p.lastError)}</p>`:''}<h3>سجل الإجراءات</h3><div class="ig28-legacy-list">${(p.history||[]).map(x=>`<article><strong>${E(labels[x.action]||({approve:'اعتماد',return:'إعادة للتعديل',reject:'إعادة للتعديل (سجل سابق)',reject_final:'رفض نهائي',cancel:'إلغاء طلب النشر'}[x.action])||x.action)}</strong><span>${E(x.by||'')} · ${E(stamp(x.at))}</span>${x.note?`<p>${E(x.note)}</p>`:''}</article>`).join('')}</div>`);
  }
  window.openMoshSocialHub=function(customerId='') {if(!window.MoshAuth37?.canModule('social','view'))return notice('لا تملك صلاحية دخول قسم السوشال ميديا.',true);if(!$('#socialApp')?.classList.contains('active'))window.goApp('social');shell();load(customerId||selected);};
  if(window.MoshR16FieldFixes)window.MoshR16FieldFixes.openSocialHub=window.openMoshSocialHub;
  document.addEventListener('change',e=>{if(e.target.id==='ig28Customer')load(e.target.value);});
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-ig28]');if(!b||b.disabled)return;
    const action=b.dataset.ig28,id=b.dataset.id;
    if(['save-config','confirm-decision','confirm-disconnect'].includes(action))return;
    try {
      if(action==='back'){leave();window.MoshMarketingV33?.openDashboard();}
      else if(action==='refresh')await load();
      else if(action==='filter'){filter=id in filters?id:'all';render();}
      else if(action==='compose')compose();
      else if(action==='edit')compose(model?.posts?.find(x=>x.id===id));
      else if(action==='config')await configure();
      else if(action==='connect')await connect();
      else if(action==='disconnect')disconnect(id);
      else if(['approve','reject','return','cancel'].includes(action))decision(id,action);
      else if(action==='details')details(id);
      else if(action==='file')await file(id);
      else if(action==='insights')await insights(id);
      else if(action==='post-insights'){const p=model?.posts?.find(x=>x.id===id);if(p)await insights(p.accountId,p.id);}
      else if(action==='check'){const who=owner(),customerId=selected;b.disabled=true;const result=await api().request('/social/posts/'+encodeURIComponent(id)+'/check',{method:'POST',body:{}});sameUser(who);notice(labels[result.status]||'قُرئت الحالة.');if(selected===customerId)await load(customerId);}
    }catch(err){notice(err.message,true);b.disabled=false;}
  });
  function clearSession() {
    generation++;model=null;selected='';leave();if(host())host().innerHTML='';
    document.querySelectorAll('.ig28-dialog').forEach(d=>{if(d.open)ui().close(d.id,true);d.innerHTML='';d.remove();});
  }
  ['mosh:session-expired','mosh:logout-complete'].forEach(event=>document.addEventListener(event,clearSession));
  document.addEventListener('mosh:section-enter',()=>leave());
  window.MoshInstagram28={version:'34-compatible',refresh:load,leave,open:window.openMoshSocialHub};
})();
