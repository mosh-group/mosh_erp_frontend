(function(){'use strict';
 const KEY='mosh_erp_ui_controls_v25';
 const OLD_THEME='mosh_erp_visual_theme_v24';
 const DEF={density:'normal',table:'normal',menu:'normal',radius:12,shadows:'soft',motion:'normal',inner:'normal',gold:'normal'};
 function load(){return Object.assign({},DEF,state.uiControls||{});}
 function save(v){state.uiControls=v;return MoshApi.save();}
 let S=load();
 function valid(v,arr,d){return arr.includes(v)?v:d}
 function normalize(){S.density=valid(S.density,['compact','normal','relaxed'],'normal');S.table=valid(S.table,['compact','normal','relaxed'],'normal');S.menu=valid(S.menu,['compact','normal','relaxed'],'normal');S.shadows=valid(S.shadows,['none','soft','medium'],'soft');S.motion=valid(S.motion,['normal','reduced'],'normal');S.inner=valid(S.inner,['quiet','normal','strong'],'normal');S.gold=valid(S.gold,['calm','normal','clear'],'normal');S.radius=Math.max(7,Math.min(18,Number(S.radius)||12));}
 function apply(){normalize();const b=document.body;if(!b)return;/* R21: theme mode is handled separately and must not be removed here. */
   b.dataset.moshUiDensity=S.density;b.dataset.moshTableDensity=S.table;b.dataset.moshMenuSize=S.menu;b.dataset.moshShadows=S.shadows;b.dataset.moshMotion=S.motion;b.dataset.moshInnerNav=S.inner;b.dataset.moshGold=S.gold;b.style.setProperty('--v25-radius',S.radius+'px');sync();}
 function q(id){return document.getElementById(id)}
 function sync(){const map={v25Density:'density',v25Table:'table',v25Menu:'menu',v25Shadows:'shadows',v25Motion:'motion',v25Inner:'inner',v25Gold:'gold'};Object.entries(map).forEach(([id,k])=>{const e=q(id);if(e&&e.value!==String(S[k]))e.value=S[k]});const r=q('v25Radius');if(r)r.value=S.radius;const o=q('v25RadiusValue');if(o)o.textContent=S.radius+'px';}
 function update(k,v){S[k]=k==='radius'?Number(v):v;save(S);apply()}
 window.setMoshUiControlV25=update;
 window.resetMoshUiControlsV25=function(){S=Object.assign({},DEF);save(S);apply()};
 function control(label,desc,id,options,key){return '<label class="v25-control"><span>'+label+'</span><small>'+desc+'</small><select id="'+id+'" onchange="setMoshUiControlV25(\''+key+'\',this.value)">'+options.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('')+'</select></label>'}
 function installSettings(){const modal=q('systemSettingsModal');if(!modal||q('v25UiSettings'))return;const anchor=modal.querySelector('.settings-account-panel');if(!anchor)return;const sec=document.createElement('div');sec.className='settings-section v25-ui-settings';sec.id='v25UiSettings';sec.innerHTML='<div class="settings-section-title"><div><b>تنظيم وراحة الواجهة</b><div class="muted">كل الخيارات هنا شكلية فقط، وتُحفظ ضمن إعدادات النظام بحسب صلاحية الحساب.</div></div></div><div class="v25-ui-note"><div><b>هوية MOSH</b><small>الوضع الداكن والفاتح مدعومان؛ هذه الخيارات تضبط الكثافة والتباعد داخل أي وضع.</small></div><i class="v25-ui-dot" aria-hidden="true"></i></div><div class="v25-control-grid">'
    +control('كثافة الواجهة','المسافات داخل البطاقات والنوافذ.','v25Density',[['compact','مدمجة'],['normal','متوازنة'],['relaxed','مريحة وواسعة']],'density')
    +control('كثافة الجداول','ارتفاع صفوف الجداول وقابلية القراءة.','v25Table',[['compact','صفوف مدمجة'],['normal','عادية'],['relaxed','صفوف واسعة']],'table')
    +control('حجم القوائم','ارتفاع عناصر قائمة الشركة وقائمة القسم.','v25Menu',[['compact','صغيرة'],['normal','متوازنة'],['relaxed','كبيرة']],'menu')
    +control('الظلال','عمق البطاقات والنوافذ بدون تغيير الألوان.','v25Shadows',[['none','بدون ظلال'],['soft','خفيفة'],['medium','أوضح']],'shadows')
    +control('الحركة','تقليل الانتقالات للحركة الأخف أو الأجهزة الأبطأ.','v25Motion',[['normal','طبيعية'],['reduced','مخففة']],'motion')
    +control('تمييز قائمة القسم','مدى فصل القائمة الداخلية عن قائمة أقسام الشركة.','v25Inner',[['quiet','هادئ'],['normal','متوازن'],['strong','واضح أكثر']],'inner')
    +control('درجة الذهبي','كلها ضمن هوية MOSH؛ يتغير فقط مستوى البروز.','v25Gold',[['calm','ذهبي هادئ'],['normal','الذهبي الأساسي'],['clear','ذهبي أوضح']],'gold')
    +'<label class="v25-control"><span>استدارة البطاقات</span><small>تحكم بشكل الزوايا من رسمي أكثر إلى ناعم أكثر.</small><div class="v25-range-row"><input id="v25Radius" type="range" min="7" max="18" step="1" oninput="setMoshUiControlV25(\'radius\',this.value)"><output id="v25RadiusValue">12px</output></div></label>'
    +'</div><div class="v25-reset-row"><button type="button" class="btn" onclick="resetMoshUiControlsV25()">إرجاع خيارات الواجهة</button></div>';anchor.after(sec);sync();}
 function addInnerIdentity(){const rails=['#hrProNav','#m15SalesRail','#m16AdminRail','.o18-rail','.f21-rail','.admin-pure-nav'];rails.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.setAttribute('data-v24-inner-nav','1')))}
 function init(){apply();installSettings();addInnerIdentity();setTimeout(()=>{installSettings();addInnerIdentity()},500)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 document.addEventListener('mosh:refreshed',()=>{S=load();apply();installSettings();});
 new MutationObserver(()=>{installSettings();addInnerIdentity();}).observe(document.body,{childList:true,subtree:true});
})();
