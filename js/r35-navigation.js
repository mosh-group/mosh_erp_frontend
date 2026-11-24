/* MOSH R35 — grouped navigation and task disclosure, retaining the original actions.
 * No alternative API, no business data persistence, no permission grants.
 */
(function(){'use strict';
if(window.MoshGrouped35)return;
const $=(s,p=document)=>p?.querySelector(s),$$=(s,p=document)=>Array.from(p?.querySelectorAll(s)||[]);
const names={hr:'الموارد البشرية',sales:'المبيعات',marketing:'التسويق',social:'السوشال ميديا',it:'تكنولوجيا المعلومات',accounting:'المحاسبة',purchases:'المشتريات',logistics:'الخدمات الإدارية'};
const roots={hr:'#hrProNav',sales:'#m15SalesRail',marketing:'.mk33-rail',it:'#it31Tabs',accounting:'#f21Rail',purchases:'#o18Rail_purchases',logistics:'#o18Rail_logistics'};
const specs={
 hr:[['الموظفون والملفات','♙',/الموظفون$|ملفات الموظفين|التوظيف|شروط عقود/],['الدوام والإجازات','◷',/الدوام|الحضور|ساعات|الميداني/],['التقييم والسياسات','▤',/تقييم|سياسات|الحكمة/],['الطلبات والتقارير','▥',/.*/]],
 sales:[['العروض والعقود','▤',/عروض|عقود|العروض/],['العملاء والخدمات','♙',/العملاء|الخدمات/],['التقارير والإعدادات','▥',/.*/]],
 marketing:[['العملاء والمتابعة','♙',/عملاء التسويق|العملاء|متابعة/],['ملف العميل والخطط','▤',/اكتشاف|دليل|الخطة|ملاحظات/],['مهام التسويق','▥',/.*/]],
 it:[['المعدات والعهد','▣',/المعدات/],['الحسابات والاشتراكات','▤',/حسابات|الاشتراكات/],['مهام القسم ولوحته','✓',/.*/]],
 accounting:[['الحسابات والفواتير','▤',/العملاء|المورد|فواتير|باقات|الفوترة/],['الموظفون والمستحقات','♙',/الموظفين|الرواتب|ساعات|السلف/],['القيود والتقارير المالية','▥',/ميزان|الدخل|المركز|القيود|المراجعة|مطابقة|العامة/],['الإجراءات والإعدادات','⚙',/.*/]],
 purchases:[['الطلبات والموافقات','▤',/طلبات|أوامر/],['الموردون','♙',/المورد/],['التقارير','▥',/.*/]],
 logistics:[['الطلبات والخدمات','▤',/طلبات|الطلبات/],['التنفيذ والمعدات','▣',/جدول|حجوزات/],['التقارير','▥',/.*/]]
};
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
const active=()=>$('.view.active')?.id.replace(/App$/,'')||'';
const owner=()=>String(window.MoshApi?.user?.id||'');
function allowed(e){
 if(!e||!e.isConnected||e.disabled||e.hidden||e.getAttribute('aria-disabled')==='true'||e.classList.contains('mosh-auth-hidden')||e.closest('.mosh-auth-hidden'))return false;
 if(e.style.display==='none'||getComputedStyle(e).display==='none')return false;
 return !!owner();
}
function label(e){const copy=e.cloneNode(true);copy.querySelectorAll('svg,.badge,.m15-count,.hr-count,small').forEach(n=>n.remove());return copy.textContent.trim().replace(/^[▦◉◇☷✎↻✓\s]+/,'').replace(/\s+/g,' ').replace(/\d+$/,'').trim();}
function sources(app){const v=$('#'+app+'App');if(!v)return[];let nodes=$$(roots[app]+' button',v);if(app==='marketing'){if(window.MoshAuth37?.taskScope?.()==='mine')return [];nodes=nodes.filter(n=>n.dataset.mk33View!=='dashboard');const customers=$('#marketingCustomersTab',v);if(customers)nodes.unshift(customers);const social=$('#marketingSocialHubTab',v);if(social)nodes.push(social);}return [...new Set(nodes)].filter(e=>allowed(e)&&label(e));}
function groups(app){let left=sources(app);return (specs[app]||[]).map(([name,icon,re])=>{const rows=left.filter(n=>re.test(label(n)));left=left.filter(n=>!rows.includes(n));return{name,icon,rows};}).filter(g=>g.rows.length);}
let panel,sub,trigger=null,app='',session='',parentRow=null,frame=0,started=false;
function message(t){window.MoshUI19?.toast?.(t);}
function close(focus=false){if(panel)panel.hidden=true;if(sub)sub.hidden=true;if(trigger){trigger.setAttribute('aria-expanded','false');if(focus&&trigger.isConnected)trigger.focus();}trigger=null;parentRow=null;app='';session='';}
function position(el,rect,side=false){el.hidden=false;const r=el.getBoundingClientRect();let left=side?rect.left-r.width-4:rect.right-r.width,top=side?rect.top:rect.bottom+5;
 if(side&&left<8)left=rect.right+4;
 el.style.left=Math.max(8,Math.min(left,innerWidth-r.width-8))+'px';el.style.top=Math.max(8,Math.min(top,innerHeight-r.height-8))+'px';el.style.right='auto';}
function showGroup(g,b,toggle=false){if(!trigger||owner()!==session||active()!==app){close();return;}if(toggle&&parentRow===b&&!sub.hidden){sub.hidden=true;b.setAttribute('aria-expanded','false');parentRow=null;return;}parentRow=b;$$('.pv-menu-group',panel).forEach(n=>n.setAttribute('aria-expanded',String(n===b)));sub.replaceChildren(make('div','pv-menu-caption',g.name));
 if(innerWidth<700){const back=make('button','pv-menu-row r35-ui-navigation','‹ العودة إلى المجموعات');back.type='button';back.onclick=()=>{sub.hidden=true;parentRow?.focus();};sub.append(back);}
 for(const original of g.rows){if(!allowed(original))continue;const text=label(original),leaf=make('button','pv-menu-row pv-menu-leaf',text);leaf.type='button';leaf.setAttribute('role','menuitem');
 const count=$('.badge,.hr-count,.m15-count',original)?.textContent.trim();if(count&&!(app==='sales'&&Number(count)===0))leaf.append(make('span','r35-menu-count',count));
 leaf.onclick=()=>{const section=app,actor=session;if(!trigger||owner()!==actor||active()!==section){close();return;}
 const target=original.isConnected?original:sources(section).find(n=>label(n)===text);close();if(allowed(target)){target.click();schedule();}else message('لم يعد هذا الإجراء متاحاً. افتح القائمة مجدداً.');};sub.append(leaf);}
 position(sub,b.getBoundingClientRect(),true);if(innerWidth<700){sub.style.left='12px';sub.style.top=panel.style.top;}
}
function open(section,b){if(trigger===b&&!panel.hidden){close(true);return;}close();if(!window.MoshAuth37?.canModule(section,'view'))return;const available=groups(section);if(!available.length){message('لا توجد مداخل متاحة لحسابك في هذه الصفحة.');return;}
 trigger=b;app=section;session=owner();b.setAttribute('aria-expanded','true');panel.replaceChildren(make('div','pv-menu-caption','قائمة '+names[section]));
 for(const g of available){const row=make('button','pv-menu-row pv-menu-group r35-ui-navigation');row.type='button';row.setAttribute('role','menuitem');row.setAttribute('aria-haspopup','menu');row.setAttribute('aria-expanded','false');row.append(make('span','pv-menu-icon',g.icon),make('span','pv-menu-itemlabel',g.name),make('span','','‹'));row.onclick=()=>showGroup(g,row,section==='sales');if(section!=='sales')row.onpointerenter=()=>{if(innerWidth>=700&&matchMedia('(hover:hover)').matches)showGroup(g,row);};panel.append(row);}
 position(panel,b.getBoundingClientRect());$('button',panel)?.focus();
}
function install(section){const v=$('#'+section+'App');if(!v||!v.classList.contains('active'))return;let bar=$('#m15Tabs_'+section,v);

 if(!bar)return;
 if(section==='it'&&bar.parentElement!==v)v.prepend(bar);
 if(!sources(section).length){v.classList.remove('pv-grouped');const host=$('.pv-menu-host',bar);if(host)host.hidden=true;return;}
 let host=$('.pv-menu-host',bar);if(!host){host=make('div','pv-menu-host');const b=make('button','pv-menu-trigger r35-ui-navigation');b.type='button';b.dataset.r35Menu=section;b.setAttribute('aria-label','قائمة '+names[section]);b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded','false');b.append(make('span','','قائمة القسم'),make('span','','⌄'));b.onclick=()=>open(section,b);host.append(b);bar.append(host);}
 host.hidden=false;
 const manager=$('.r23-manager-tools',bar)||Array.from(bar.children).find(n=>!n.classList.contains('pv-menu-host')&&n.textContent.includes('أدوات المدير'));
 if(manager&&manager.nextElementSibling!==host)manager.after(host);else if(!manager&&bar.lastElementChild!==host)bar.append(host);
 v.classList.add('pv-grouped');
}
function taskDisclosure(){for(const grid of $$('.sales-task-card>.field-grid')){const card=grid.parentElement;if($('.pv-task-info',card))continue;const nameInput=$('input[id^="taskEditTitle_"]',grid);if(!nameInput)continue;
 const info=make('details','pv-task-info'),summary=make('summary','r35-ui-navigation'),title=make('span','pv-task-title',nameInput.value||'تفاصيل المهمة'),arrow=make('span','pv-task-chevron');
 arrow.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 summary.append(title,arrow);summary.setAttribute('aria-label','فتح أو إغلاق تفاصيل '+nameInput.value);summary.setAttribute('aria-expanded','false');const inside=make('div','pv-task-inner'),notes=make('div','pv-task-notes');info.append(summary,inside);card.prepend(info);card.classList.add('pv-task-card');
 inside.append(grid);nameInput.closest('.field').classList.add('r35-task-name-input');
 // Move existing controls, never clone inputs or replace their event handlers.
 const status=$(':scope>.r19-task-status-panel',card);if(status)inside.prepend(status);
 $$(':scope>.field',card).forEach(f=>notes.append(f));inside.append(notes);
 const guide=$(':scope>.mk29-task-guide',card);if(guide)inside.append(guide);
 const oldTitle=card.previousElementSibling?.querySelector('.mt54-task-name');if(oldTitle)oldTitle.hidden=true;
 nameInput.addEventListener('input',()=>{title.textContent=nameInput.value||'بدون اسم';});info.addEventListener('toggle',()=>summary.setAttribute('aria-expanded',String(info.open)));
 }}
function decorate(){frame=0;if(!owner())return;const section=active();if(roots[section])install(section);taskDisclosure();}
function schedule(){if(!frame)frame=requestAnimationFrame(decorate);}
function start(){if(started||!$('#appShell'))return;started=true;panel=make('div','pv-menu-floating');sub=make('div','pv-menu-floating pv-menu-sub');panel.hidden=sub.hidden=true;panel.setAttribute('role','menu');sub.setAttribute('role','menu');document.body.append(panel,sub);
 document.addEventListener('click',e=>{if(trigger&&!panel.contains(e.target)&&!sub.contains(e.target)&&!trigger.contains(e.target))close();},true);
 window.addEventListener('keydown',e=>{if(!trigger)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!sub.hidden){sub.hidden=true;parentRow?.focus();}else close(true);return;}
 if(e.key==='Tab'){close();return;}const current=sub.contains(document.activeElement)&&!sub.hidden?sub:panel;
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){const rows=$$('button',current).filter(n=>!n.disabled&&n.getClientRects().length);if(!rows.length)return;let i=rows.indexOf(document.activeElement);i=e.key==='Home'?0:e.key==='End'?rows.length-1:(i+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;e.preventDefault();e.stopImmediatePropagation();rows[i].focus();}
 if(e.key==='ArrowLeft'&&document.activeElement?.classList.contains('pv-menu-group')){e.preventDefault();document.activeElement.click();$('button',sub)?.focus();}
 if(e.key==='ArrowRight'&&!sub.hidden){e.preventDefault();sub.hidden=true;parentRow?.focus();}
 },true);
 window.addEventListener('resize',()=>close());window.addEventListener('scroll',e=>{if(trigger&&!panel.contains(e.target)&&!sub.contains(e.target))close();},true);
 for(const event of ['mosh:section-enter','mosh:logout-complete','mosh:session-expired'])document.addEventListener(event,()=>{close();schedule();});
 for(const event of ['mosh:refreshed','mosh:permissions-applied'])document.addEventListener(event,()=>{if(trigger)close();schedule();});
 const observer=new MutationObserver(ms=>{if(ms.some(m=>m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1)))schedule();});observer.observe($('#appShell'),{subtree:true,childList:true});schedule();
}
window.MoshGrouped35={allowed,sources,groups,open,close,schedule,decorate};
document.addEventListener('mosh:r19-ready',start,{once:true});if(window.MoshApi?.user&&window.MoshAuth37)start();
})();
