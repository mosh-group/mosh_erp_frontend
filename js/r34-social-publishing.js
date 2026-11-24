/* One composer for independently tracked Facebook and Instagram destinations. */
(function () {
  'use strict';
  const ui = window.Mosh34;
  const {$, $$, E} = ui;
  const platforms = {
    facebook: {label:'فيسبوك', info:'/social/facebook', endpoint:'/social/facebook/posts'},
    instagram: {label:'إنستغرام', info:'/social/instagram', endpoint:'/social/posts'}
  };
  const statuses = {
    pending_manual:'بانتظار النشر اليدوي', manual_published:'تم تسجيل النشر اليدوي',
    draft:'مسودة', pending_approval:'بانتظار الاعتماد', scheduled:'مجدول',
    queued:'بانتظار التنفيذ', publishing:'جارٍ النشر', processing:'قيد المعالجة',
    published:'منشور بتأكيد المنصة', blocked:'متوقف', failed:'تعذّر النشر',
    failed_provider:'رفضت المنصة النشر', uncertain:'نتيجة النشر غير مؤكدة'
  };
  const statusText = post => statuses[post.status] || post.status;

  function destinationFields(platform, info, checked) {
    const {label} = platforms[platform];
    const accounts = (info.accounts || []).filter(account => account.status === 'connected');
    const options = accounts.map(account => [account.id, account.name || account.username || label]);
    return `<section class="r34-card" data-social-destination="${platform}">
      <label style="flex-direction:row;align-items:center"><input type="checkbox" name="platform" value="${platform}" ${checked?'checked':''}>${label}</label>
      <div data-social-destination-options>
        ${ui.select('طريقة النشر',platform+'Method',[...(options.length?[['meta','عبر Meta']]:[]),['manual','يدوي']])}
        ${options.length ? ui.select('الحساب المرتبط',platform+'Account',[['','اختر الحساب'],...options],options.length===1?options[0][0]:'') : '<p class="r34-muted">لا يوجد حساب متصل لهذا العميل.</p>'}
      </div>
    </section>`;
  }

  function syncFields(form) {
    let hasMeta = false;
    for (const item of $$('[data-social-destination]',form)) {
      const checked = $('input[type="checkbox"]',item).checked;
      const panel = $('[data-social-destination-options]',item);
      const method = $('select',panel);
      const account = $$('select',panel)[1];
      panel.hidden = !checked;
      method.disabled = !checked;
      if (account) {
        const showAccount = checked && method.value === 'meta';
        account.disabled = !showAccount;
        account.required = showAccount;
        account.parentElement.hidden = !showAccount;
      }
      hasMeta ||= checked && method.value === 'meta';
    }
    const mode = $('[name="mode"]',form), when = $('[name="scheduledAt"]',form);
    mode.disabled = !hasMeta;
    mode.parentElement.hidden = !hasMeta;
    const schedule = hasMeta && mode.value === 'schedule';
    when.disabled = !schedule;
    when.required = schedule;
    when.parentElement.hidden = !schedule;
  }

  function plan(fd, file, customerId) {
    const selected = fd.getAll('platform');
    if (!selected.length) throw new Error('اختَر منصة واحدة على الأقل.');
    const caption = String(fd.get('caption') || '').trim();
    if (!caption && !file) throw new Error('أضف نصاً أو مرفقاً للمنشور.');
    if (file && !['image/jpeg','image/png','video/mp4'].includes(file.type)) {
      throw new Error('اختر صورة JPEG أو PNG أو فيديو MP4.');
    }
    return selected.map(platform => {
      const method = fd.get(platform+'Method');
      if (method === 'manual') return {platform, endpoint:'/social/manual/posts', body:{customerId,platform,caption}};
      const mode = fd.get('mode'), accountId = fd.get(platform+'Account');
      if (!accountId) throw new Error('اختر الحساب المرتبط للمنصة.');
      let scheduledAt = null;
      if (mode === 'schedule') {
        const when = new Date(String(fd.get('scheduledAt') || ''));
        if (!(when.getTime()>Date.now())) throw new Error('حدّد موعداً مستقبلياً للجدولة.');
        scheduledAt = when.toISOString();
      }
      const instagram = platform === 'instagram', video = file?.type === 'video/mp4';
      if (instagram && (caption.length>2200 || (mode!=='draft'&&!file) ||
          (file && !['image/jpeg','video/mp4'].includes(file.type)) ||
          (file && file.size>(video?25:8)*1024*1024))) {
        throw new Error('إنستغرام يقبل 2200 حرفاً، وصورة JPEG حتى 8 ميغابايت أو فيديو MP4 حتى 25 ميغابايت. طلب النشر يحتاج مرفقاً.');
      }
      const mediaKind = video ? (instagram?'reel':'video') : (file||instagram?'image':'text');
      return {platform,endpoint:platforms[platform].endpoint,body:{customerId,accountId,caption,mediaKind,mode,scheduledAt}};
    });
  }

  async function submit(fd, form, holder, session, customerId) {
    const file = $('[name="media"]',form).files[0];
    const jobs = plan(fd,file,customerId);
    const signature = JSON.stringify(jobs);
    if (holder.signature !== signature || holder.file !== file) {
      if (holder.targets && Object.values(holder.targets).some(result => result.pending)) {
        throw new Error('نتيجة أحد الطلبات غير مؤكدة. أعد نفس الإرسال قبل تعديل الاختيارات.');
      }
      holder.signature = signature;
      if (holder.file !== file) holder.upload = null;
      holder.file = file;
      holder.targets ??= {};
    }
    if (file && !holder.upload?.saved) {
      holder.upload ??= {key:'social/'+ui.uid(),name:file.name,size:file.size,blob:file,type:file.type,kind:'social-media'};
      holder.upload.onProgress = progress => {
        $('[data-social-progress]',form).textContent = 'رفع المرفق '+progress.percent+'٪';
      };
      await window.MoshUpload31.upload(holder.upload);
      ui.guard(session);
      holder.upload.saved = true;
    }
    const feedback = $('[data-social-progress]',form);
    const errors = [];
    for (const job of jobs) {
      const target = holder.targets[job.platform] ??= {};
      if (target.post) continue;
      const label = platforms[job.platform].label;
      feedback.textContent = 'جارٍ حفظ طلب '+label+'…';
      try {
        target.post = await ui.commit(target,job.endpoint,{...job.body,attachmentKey:holder.upload?.key||null},'POST',session);
      } catch (error) {
        ui.guard(session);
        errors.push(label+' — '+error.message);
      }
    }
    const result = jobs.flatMap(job => {
      const post = holder.targets[job.platform].post;
      return post ? [{platform:job.platform,post}] : [];
    });
    feedback.textContent = result.map(({platform,post}) => platforms[platform].label+' — '+statusText(post)).join(' · ');
    if (errors.length) throw new Error(errors.join('\n'));
    return result;
  }

  async function compose(customerId, currentPlatform) {
    if (!customerId) throw new Error('اختر عميلاً أولاً.');
    const session = ui.snapshot();
    const entries = await Promise.all(Object.entries(platforms).map(async ([platform, spec]) =>
      [platform,await ui.request(spec.info+'?customerId='+encodeURIComponent(customerId),{},session)]));
    const options = entries.filter(([,info]) => info.capabilities?.compose);
    if (!options.length) throw new Error('لا تملك صلاحية إنشاء محتوى لهذا العميل.');
    const initial = options.some(([key])=>key===currentPlatform)?currentPlatform:options[0][0];
    const dialog = ui.form('r36SocialComposer','إنشاء منشور',`
      <p>اختَر المنصات وطريقة النشر لكل وحدة. المحتوى اليدوي يُحفظ للمتابعة.</p>
      <div class="r34-grid">${options.map(([platform,info])=>destinationFields(platform,info,platform===initial)).join('')}</div>
      ${ui.area('نص المنشور','caption','','maxlength="60000"')}
      <label>المرفق<input name="media" type="file" accept="image/jpeg,image/png,video/mp4"><small data-social-file-name></small></label>
      <div class="r34-grid">${ui.select('إجراء الحسابات المرتبطة','mode',[['draft','حفظ مسودة'],['publish','طلب النشر الآن'],['schedule','طلب الجدولة']],'draft')}
      ${ui.field('موعد الجدولة','scheduledAt','','datetime-local')}</div>
      <p role="status" data-social-progress></p>`,
      (fd,form,holder,s)=>submit(fd,form,holder,s,customerId),
      results=>{
        ui.dialog('r36SocialResults','حالة المنشور',results.map(({platform,post})=>
          `<p><strong>${E(platforms[platform].label)}</strong> · ${E(statusText(post))}</p>`).join('')+
          (results.some(({post})=>post.status==='pending_manual')?ui.B('فتح قائمة النشر اليدوي','social-manual-results',customerId):''));
        const current = window.MoshSocial34.inspect();
        if (current.platform !== currentPlatform || current.customerId !== customerId) return;
        if (currentPlatform==='facebook')void window.MoshSocial34.refresh();
        else if (currentPlatform==='instagram')void window.MoshInstagram28.refresh(customerId);
      },'حفظ / إرسال');
    const form = $('form',dialog);
    form.addEventListener('change',()=>syncFields(form));
    syncFields(form);
    ui.attachFileClear($('[name="media"]',form),{nameElement:$('[data-social-file-name]',form)});
  }

  async function download(key) {
    const session = ui.snapshot();
    const {blob,name} = await MoshApi.file(key);
    ui.guard(session);
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = name||'attachment';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function manualQueue(customerId) {
    if (!customerId) throw new Error('اختر عميلاً أولاً.');
    const {posts} = await ui.request('/social/manual/posts?customerId='+encodeURIComponent(customerId));
    const dialog = ui.dialog('r36ManualSocial','متابعة النشر اليدوي',posts.map(post=>
      `<article class="r34-card">
        <strong>${E(platforms[post.platform]?.label)}</strong> · ${E(statusText(post))}
        <p style="white-space:pre-wrap">${E(post.caption)}</p>
        ${post.attachmentKey?ui.B('تحميل المرفق','social-manual-file',post.attachmentKey):''}
        ${post.url?`<a href="${E(post.url)}" rel="noopener noreferrer" target="_blank">عرض المنشور</a>`:''}
        ${post.canMark?ui.B('تم النشر','social-manual-mark',post.id,true):''}
      </article>`).join('')||ui.empty('لا توجد منشورات يدوية لهذا العميل.'));
    dialog.onclick=event=>{
      const button = event.target.closest('button[data-r34]');
      if (!button) return;
      if (button.dataset.r34==='social-manual-file') void download(button.dataset.id).catch(error=>ui.error(dialog,error));
      if (button.dataset.r34==='social-manual-mark') {
        const post = posts.find(row=>row.id===button.dataset.id);
        if (!post?.canMark) return;
        ui.form('r36ManualSocialMark','تسجيل النشر اليدوي',
          ui.field('رابط المنشور (اختياري)','url','','url'),
          (fd,form,holder,s)=>ui.commit(holder,'/social/manual/posts/'+encodeURIComponent(post.id)+'/published',
            {_version:post._version,url:fd.get('url')||null},'POST',s),
          ()=>manualQueue(customerId),'تم النشر');
      }
    };
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-r34="social-manual-results"]');
    if (!button) return;
    ui.close('r36SocialResults');
    void manualQueue(button.dataset.id).catch(error=>window.MoshUI19.toast(error.message,true));
  });
  window.MoshSocialPublishing = {compose,manualQueue};
})();
