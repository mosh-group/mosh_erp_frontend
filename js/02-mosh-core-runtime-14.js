const STORAGE='mosh_erp_sales_deep_v1';const ROLE_DEFINITIONS={app_programmer:{id:'app_programmer',name:'صانع التطبيق',permissions:{systemCustomization:true,manageUsers:true,managePermissions:true,viewAllTasks:true,editCoreTaskData:true,deleteTasks:true,viewArchive:true
}
},system_supervisor:{id:'system_supervisor',name:'مشرف السيستم',permissions:{viewAllTasks:true,monitorAllTasks:true,editCoreTaskData:false,deleteTasks:false,viewArchive:false
}
}
};const currentUser=Object.assign({id:"",username:"",name:"",company:"Mosh Group",roleId:""},MoshApi.user||{});function getCurrentRole(){return ROLE_DEFINITIONS[currentUser.roleId]||null;}
function hasPermission(permission){try{if(window.MoshAuth37?.can)return !!window.MoshAuth37.can(permission);}catch(e){}const role=getCurrentRole();return !!(role && role.permissions && role.permissions[permission]);}
function currentUserDisplayName(){return currentUser.name||currentUser.username||'مستخدم';}
function currentUserInitial(){const name=currentUserDisplayName().trim();return name ? name.charAt(0):'م';}
let state=JSON.parse(JSON.stringify(MoshApi.initialState));
if(!Array.isArray(state.salesTasks))state.salesTasks=[];if(!Array.isArray(state.supportRequests))state.supportRequests=[];if(!Array.isArray(state.staffProfiles))state.staffProfiles=[];
const _managerByDepartment={};(state.staffProfiles||[]).forEach(p=>{if(p && p.isManager && p.department && p.active!==false)_managerByDepartment[p.department]=String(p.name||'').trim();});(state.staffProfiles||[]).forEach(p=>{if(!p)return;if(typeof p.directManager!=='string'){const legacy=Array.isArray(p.approvalChain)&&p.approvalChain.length?String(p.approvalChain[0]||'').trim():'';p.directManager=p.isManager?'':(legacy||_managerByDepartment[p.department]||'');}
if('approvalChain' in p)delete p.approvalChain;});(state.staffProfiles||[]).forEach((p,index)=>{if(!p)return;const numericId=String(p.id||'').match(/(\d+)$/)?.[1]||String(index+1);if(!p.employeeNo)p.employeeNo='EMP-'+String(numericId).padStart(5,'0');if(typeof p.jobTitle!=='string')p.jobTitle='';if(typeof p.phone!=='string')p.phone='';if(typeof p.email!=='string')p.email='';if(typeof p.hireDate!=='string')p.hireDate='';if(typeof p.employmentType!=='string')p.employmentType='دوام كامل';if(typeof p.notes!=='string')p.notes='';if(typeof p.active!=='boolean')p.active=true;});(state.staffProfiles||[]).forEach(p=>{if(!p)return;if(!['draft','active','inactive','resigned'].includes(p.employmentStatus)){p.employmentStatus=p.active===false?'inactive':'active';}
p.active=p.employmentStatus==='active';if(typeof p.resignationDate!=='string')p.resignationDate='';if(typeof p.resignationReason!=='string')p.resignationReason='';if(!Array.isArray(p.statusHistory))p.statusHistory=[];if(!Array.isArray(p.resignationHistory))p.resignationHistory=[];if(!Array.isArray(p.documents))p.documents=[];if(!Array.isArray(p.leaveRecords))p.leaveRecords=[];if(!Array.isArray(p.attendanceRecords))p.attendanceRecords=[];if(!Array.isArray(p.delayRecords))p.delayRecords=[];if(!Array.isArray(p.disciplinaryRecords))p.disciplinaryRecords=[];if(!Array.isArray(p.rewardRecords))p.rewardRecords=[];if(!Array.isArray(p.evaluationRecords))p.evaluationRecords=[];if(!Array.isArray(p.payrollRecords))p.payrollRecords=[];});if(!state.departmentManagers || typeof state.departmentManagers!=='object' || Array.isArray(state.departmentManagers)){state.departmentManagers={};}
(state.staffProfiles||[]).forEach(p=>{if(!window.MoshApi&&p&&p.id&&p.department&&p.isManager&&p.active!==false&&!state.departmentManagers[p.department]){state.departmentManagers[p.department]=String(p.id);}
});(state.supportRequests||[]).forEach(r=>{if(!r)return;if(!['purchase','logistics'].includes(r.type))r.type='purchase';if(!r.destinationDepartment)r.destinationDepartment=r.type==='purchase'?'المشتريات':'اللوجستيات';if(!['new','in_progress','completed','cancelled'].includes(r.status))r.status='new';if(!Array.isArray(r.history))r.history=[];if(!Array.isArray(r.attachments))r.attachments=[];if(typeof r.assignedTo!=='string')r.assignedTo='';if(typeof r.responseNote!=='string')r.responseNote='';});(state.salesTasks||[]).forEach(t=>{if(!Array.isArray(t.workChat))t.workChat=[];if(!t.assignmentMode)t.assignmentMode=t.assignee?'direct':'manager';if(!t.employeeState){if(t.status==='completed'||t.status==='awaiting_invoice'||t.status==='invoiced')t.employeeState='finished';else t.employeeState='new';}
if(t.employeeState==='approved')t.employeeState='submitted';if(typeof t.reviewManager!=='string')t.reviewManager='';if(typeof t.returnedForRevision!=='boolean')t.returnedForRevision=false;if((!t.workTiming || typeof t.workTiming!=='object' || Array.isArray(t.workTiming))&&(!t.work_timing||typeof t.work_timing!=='object'||Array.isArray(t.work_timing))){t.workTiming={totalMs:0,activeStartedAt:0,activeWorker:'',receivedAt:0,finishedAt:0,sessions:[]};}
if(!Array.isArray(t.workTiming.sessions))t.workTiming.sessions=[];if(!Number.isFinite(Number(t.workTiming.totalMs)))t.workTiming.totalMs=0;if(t.workTiming.activeStartedAt===undefined)t.workTiming.activeStartedAt=0;if(typeof t.workTiming.activeWorker!=='string')t.workTiming.activeWorker='';if(t.workTiming.receivedAt===undefined)t.workTiming.receivedAt=0;if(t.workTiming.finishedAt===undefined)t.workTiming.finishedAt=0;if('approvalRoute' in t)delete t.approvalRoute;if('approvalIndex' in t)delete t.approvalIndex;if('reviewState' in t)delete t.reviewState;if('managerFinalPending' in t)delete t.managerFinalPending;});const SYSTEM_APPEARANCE_DEFAULTS={fontFamily:'arial',headingSize:26,bodySize:16,smallSize:14,headingColor:'#f5f1e8',textColor:'#f5f1e8',mutedColor:'#b8b1a6',bgColor:'#090909',sidebarColor:'#101012',panelColor:'#121315',panel2Color:'#17181b',fieldColor:'#0d0f12',borderColor:'#2f3339',accentColor:'#d7ad45',accentColor2:'#f2cf77'
};const SYSTEM_APPEARANCE_LIGHT={headingColor:'#26241f',textColor:'#2d2a25',mutedColor:'#746f66',bgColor:'#f4f2ed',sidebarColor:'#fbfaf7',panelColor:'#ffffff',panel2Color:'#f0ede6',fieldColor:'#fbfaf7',borderColor:'#d8d1c5'};
function moshAppearanceTheme(){return document.documentElement?.dataset?.moshTheme==='light'?'light':'dark';}
function effectiveAppearancePalette(s){return moshAppearanceTheme()==='light'?{...s,...SYSTEM_APPEARANCE_LIGHT,accentColor:s.accentColor||SYSTEM_APPEARANCE_DEFAULTS.accentColor,accentColor2:s.accentColor2||SYSTEM_APPEARANCE_DEFAULTS.accentColor2}:s;}
if(!state.systemSettings || typeof state.systemSettings!=='object'){state.systemSettings={appName:'MOSH ERP',companyName:'Mosh Group',...SYSTEM_APPEARANCE_DEFAULTS};}
if(!state.systemSettings.appName)state.systemSettings.appName='MOSH ERP';if(!state.systemSettings.companyName)state.systemSettings.companyName='Mosh Group';Object.entries(SYSTEM_APPEARANCE_DEFAULTS).forEach(([key,value])=>{if(state.systemSettings[key]===undefined || state.systemSettings[key]===null || state.systemSettings[key]==='')state.systemSettings[key]=value;});if(!Array.isArray(state.customers))state.customers=[];
let customersCatalog=state.customers;if(!Array.isArray(state.services)){state.services=[];}
let servicesCatalog=state.services;if(!Array.isArray(state.salespeople)){const existingNames=[...new Set((state.quotations||[]).map(q=>String(q.salesperson||'').trim()).filter(Boolean))];state.salespeople=existingNames.map((name,index)=>({id:'SP/'+String(index+1).padStart(5,'0'),name,phone:'',email:'',jobTitle:'مندوب مبيعات',salesTeam:'',active:true,notes:'',createdAt:'',createdBy:''
}));}
if(!Array.isArray(state.salesTeamsCfg)){const existingTeams=[...new Set((state.quotations||[]).map(q=>String(q.salesTeam||'').trim()).filter(Boolean))];state.salesTeamsCfg=existingTeams.map((name,index)=>({id:'TEAM/'+String(index+1).padStart(5,'0'),name,leader:'',members:[],active:true,notes:'',createdAt:'',createdBy:''
}));}
if(!Array.isArray(state.quoteTemplates)){const existingTemplates=[...new Set((state.quotations||[]).map(q=>String(q.template||'').trim()).filter(Boolean))];state.quoteTemplates=existingTemplates.map((name,index)=>({id:'QTPL/'+String(index+1).padStart(5,'0'),name,style:'official',validityDays:'',defaultNotes:'',isDefault:index===0,active:true,createdAt:'',createdBy:''
}));}
(state.quoteTemplates||[]).forEach((t,index)=>{if(!t.style)t.style='official';if(typeof t.isDefault!=='boolean')t.isDefault=index===0;});
if(!Array.isArray(state.serviceContracts))state.serviceContracts=[];let lastSavedStateRaw=JSON.stringify(state);function findCustomer(name){return MoshCustomerNames36.find(customersCatalog,name)||{name:name||'',contact:'',phone:'',whatsapp:'',email:'',billingAddress:'',paymentTerms:''
};}
function customerInfoText(info){if(!info)return '';return[`اسم العميل: ${MoshCustomerNames36.display(info)}`,`المسؤول: ${info.contact||''}`,`الهاتف: ${info.phone||''}`,`واتساب: ${info.whatsapp||''}`,`البريد: ${info.email||''}`,`عنوان الفوترة: ${info.billingAddress||''}`
].join('\n');}
function customerOptions(selected){return customersCatalog.map(c=>`<option value="${esc(c.name)}" ${c.name===selected?'selected':''}>${esc(MoshCustomerNames36.display(c))}</option>`).join('');}
function normalizeCustomerName(value){return String(value||'').trim().toLocaleLowerCase();}
function getCatalogCustomerByName(value){const key=normalizeCustomerName(value);if(!key)return null;return MoshCustomerNames36.find(customersCatalog,value);}
function renderStandaloneCustomerChoices(){const list=document.getElementById('standaloneCustomersList');if(!list)return;list.innerHTML=customersCatalog
.map(c=>`<option value="${esc(MoshCustomerNames36.display(c))}" label="${esc(MoshCustomerNames36.display(c))}"></option>`)
.join('');}
function validateTaskCustomerInput(input){if(!input)return null;const value=input.value.trim();if(!value){window.MoshValidation09?.report([[input,'اختر العميل.']]);return null;}
const customer=getCatalogCustomerByName(value);if(!customer){window.MoshValidation09?.report([[input,'اختر عميلاً مسجلاً من القائمة، أو أضفه أولاً.']]);return null;}
input.value=customer.name;return customer;}
function todayStr(){return new Date().toISOString().slice(0,10);}
function activityTimestamp(){const d=new Date();const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;}
let currentQuoteId=null;let workingQuote=null;let unsavedNewQuoteId=null;let appUndoStack=[];let appIsDirty=false;function setDirtyState(isDirty=true){appIsDirty=!!isDirty;document.querySelectorAll('.save-btn').forEach(btn=>{btn.classList.toggle('dirty',appIsDirty);});}
function refreshSaveButtons(){document.querySelectorAll('.save-btn').forEach(btn=>{btn.classList.toggle('dirty',appIsDirty);});}
const SIDEBAR_PREF_KEY='mosh_erp_sidebar_collapsed_v7d';function setSidebarCollapsed(collapsed){const app=document.getElementById('appShell');const btn=document.getElementById('sidebarToggleBtn');if(!app)return;app.classList.toggle('sidebar-collapsed',!!collapsed);if(btn){btn.textContent=collapsed?'›':'‹';btn.title=collapsed?'فتح القائمة الجانبية':'طي القائمة الجانبية';btn.setAttribute('aria-label',btn.title);}
try{localStorage.setItem(SIDEBAR_PREF_KEY,collapsed?'1':'0');}catch(e){}
}
function toggleSidebar(){const app=document.getElementById('appShell');if(!app)return;setSidebarCollapsed(!app.classList.contains('sidebar-collapsed'));}
function initSidebarState(){let collapsed=false;try{collapsed=localStorage.getItem(SIDEBAR_PREF_KEY)==='1';}catch(e){}
setSidebarCollapsed(collapsed);}
let currentSalesMode='quotes';let navHistory=[];function pushHistory(entry){navHistory.push(entry);document.getElementById('backBtn').style.display = 'inline-block';}
function goMainMenu(){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));const dashboard = document.getElementById('dashboardApp');if(dashboard)dashboard.classList.add('active');document.querySelectorAll('.nav a').forEach(a=>a.classList.remove('active'));const navLinks = document.querySelectorAll('.nav a');if(navLinks.length)navLinks[0].classList.add('active');document.getElementById('crumb').innerHTML='<b>اللوحة الرئيسية</b>';}
function applyCurrentUserUI(){const role=getCurrentRole();const displayName=currentUserDisplayName();const company=state.systemSettings?.companyName || currentUser.company || 'Mosh Group';const userName=document.getElementById('dashboardUserName');const accountName=document.getElementById('dashboardAccountName');const companyName=document.getElementById('dashboardCompanyName');const accountCompany=document.getElementById('dashboardAccountCompany');const accountRole=document.getElementById('dashboardAccountRole');const topAvatar=document.getElementById('topUserAvatar');const dashboardPhoto=document.getElementById('dashboardPhoto');const settingsBtn=document.getElementById('systemSettingsBtn');const archiveNavLink=document.getElementById('archiveNavLink');const archiveDashboardCard=document.getElementById('archiveDashboardCard');if(userName)userName.textContent=displayName;if(accountName)accountName.textContent=displayName;if(companyName)companyName.textContent=company;if(accountCompany)accountCompany.textContent=company;if(accountRole)accountRole.textContent=role?role.name:'مستخدم';if(topAvatar)topAvatar.textContent=currentUserInitial();if(dashboardPhoto && !dashboardPhoto.querySelector('img'))dashboardPhoto.textContent=currentUserInitial();if(settingsBtn){settingsBtn.style.display=(hasPermission('systemCustomization')||hasPermission('appearanceSettings'))?'inline-flex':'none';}
if(archiveNavLink){archiveNavLink.style.display=hasPermission('viewArchive')?'flex':'none';}
if(archiveDashboardCard){archiveDashboardCard.style.display=hasPermission('viewArchive')?'block':'none';}
}
function renderAppLogo(appName){const logo=document.getElementById('appLogo');if(!logo)return;const parts=String(appName||'MOSH ERP').trim().split(/\s+/);if(parts.length>1){const last=parts.pop();logo.innerHTML=`${esc(parts.join(' '))} <span>${esc(last)}</span><small class="app-version">${esc(window.MOSH_UI_RELEASE||'R31.1')}</small>`;}else{logo.innerHTML=`${esc(appName||'MOSH ERP')}<small class="app-version">${esc(window.MOSH_UI_RELEASE||'R31.1')}</small>`;}
}
function normalizeSystemAppearance(source={}){const d=SYSTEM_APPEARANCE_DEFAULTS;const clamp=(v,min,max,fallback)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};const validColor=(v,fallback)=>/^#[0-9a-fA-F]{6}$/.test(String(v||''))?String(v):fallback;const fontKeys=['arial','tahoma','system'];const fontFamily=fontKeys.includes(String(source.fontFamily||''))?String(source.fontFamily):d.fontFamily;return{fontFamily,headingSize:clamp(source.headingSize,20,38,d.headingSize),bodySize:clamp(source.bodySize,13,22,d.bodySize),smallSize:clamp(source.smallSize,11,18,d.smallSize),headingColor:validColor(source.headingColor,d.headingColor),textColor:validColor(source.textColor,d.textColor),mutedColor:validColor(source.mutedColor,d.mutedColor),bgColor:validColor(source.bgColor,d.bgColor),sidebarColor:validColor(source.sidebarColor,d.sidebarColor),panelColor:validColor(source.panelColor,d.panelColor),panel2Color:validColor(source.panel2Color,d.panel2Color),fieldColor:validColor(source.fieldColor,d.fieldColor),borderColor:validColor(source.borderColor,d.borderColor),accentColor:validColor(source.accentColor,d.accentColor),accentColor2:validColor(source.accentColor2,d.accentColor2)
};}
function applyAppearanceSettings(source={}){const normalized=normalizeSystemAppearance(source),s=effectiveAppearancePalette(normalized);const root=document.documentElement;const fontMap={arial:'Arial, Helvetica, sans-serif',tahoma:'Tahoma, Arial, Helvetica, sans-serif',system:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
};root.style.colorScheme=moshAppearanceTheme()==='light'?'light':'dark';root.style.setProperty('--ui-font-family',fontMap[normalized.fontFamily]||fontMap.arial);root.style.setProperty('--ui-heading-size',normalized.headingSize+'px');root.style.setProperty('--ui-body-size',normalized.bodySize+'px');root.style.setProperty('--ui-small-size',normalized.smallSize+'px');root.style.setProperty('--ui-heading',s.headingColor);root.style.setProperty('--ui-text',s.textColor);root.style.setProperty('--ui-muted',s.mutedColor);root.style.setProperty('--ui-bg',s.bgColor);root.style.setProperty('--ui-sidebar',s.sidebarColor);root.style.setProperty('--ui-panel',s.panelColor);root.style.setProperty('--ui-panel2',s.panel2Color);root.style.setProperty('--ui-field',s.fieldColor);root.style.setProperty('--ui-border',s.borderColor);root.style.setProperty('--gold',s.accentColor,'important');root.style.setProperty('--gold2',s.accentColor2,'important');root.style.setProperty('--bg',s.bgColor,'important');root.style.setProperty('--sidebar',s.sidebarColor,'important');root.style.setProperty('--panel',s.panelColor,'important');root.style.setProperty('--panel2',s.panel2Color,'important');root.style.setProperty('--field',s.fieldColor,'important');root.style.setProperty('--line',s.borderColor,'important');root.style.setProperty('--text',s.textColor,'important');root.style.setProperty('--muted',s.mutedColor,'important');updateAppearancePreview(normalized);}
function applySystemSettings(){const s=state.systemSettings||{};applyAppearanceSettings(s);renderAppLogo(s.appName||'MOSH ERP');document.title=(s.appName||'MOSH ERP')+' — '+(window.MOSH_UI_RELEASE||'R31.1');currentUser.company=s.companyName||currentUser.company||'Mosh Group';applyCurrentUserUI();}
function setSettingInputValue(id,value){const el=document.getElementById(id);if(el)el.value=value;}
function populateAppearanceForm(source={}){const s=normalizeSystemAppearance(source);setSettingInputValue('systemSettingFontFamily',s.fontFamily);setSettingInputValue('systemSettingHeadingSize',s.headingSize);setSettingInputValue('systemSettingBodySize',s.bodySize);setSettingInputValue('systemSettingSmallSize',s.smallSize);setSettingInputValue('systemSettingHeadingColor',s.headingColor);setSettingInputValue('systemSettingTextColor',s.textColor);setSettingInputValue('systemSettingMutedColor',s.mutedColor);setSettingInputValue('systemSettingBgColor',s.bgColor);setSettingInputValue('systemSettingSidebarColor',s.sidebarColor);setSettingInputValue('systemSettingPanelColor',s.panelColor);setSettingInputValue('systemSettingPanel2Color',s.panel2Color);setSettingInputValue('systemSettingFieldColor',s.fieldColor);setSettingInputValue('systemSettingBorderColor',s.borderColor);setSettingInputValue('systemSettingAccentColor',s.accentColor);setSettingInputValue('systemSettingAccentColor2',s.accentColor2);updateAppearanceSizeOutputs(s);updateAppearancePreview(s);}
function readAppearanceForm(){const val=id=>document.getElementById(id)?.value;return normalizeSystemAppearance({fontFamily:val('systemSettingFontFamily'),headingSize:val('systemSettingHeadingSize'),bodySize:val('systemSettingBodySize'),smallSize:val('systemSettingSmallSize'),headingColor:val('systemSettingHeadingColor'),textColor:val('systemSettingTextColor'),mutedColor:val('systemSettingMutedColor'),bgColor:val('systemSettingBgColor'),sidebarColor:val('systemSettingSidebarColor'),panelColor:val('systemSettingPanelColor'),panel2Color:val('systemSettingPanel2Color'),fieldColor:val('systemSettingFieldColor'),borderColor:val('systemSettingBorderColor'),accentColor:val('systemSettingAccentColor'),accentColor2:val('systemSettingAccentColor2')
});}
function updateAppearanceSizeOutputs(s=readAppearanceForm()){const pairs=[['systemSettingHeadingSizeValue',s.headingSize],['systemSettingBodySizeValue',s.bodySize],['systemSettingSmallSizeValue',s.smallSize]
];pairs.forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v+'px';});}
function updateAppearancePreview(s=readAppearanceForm()){const preview=document.getElementById('systemAppearancePreview');if(!preview)return;const p=effectiveAppearancePalette(s);const previewFontMap={arial:'Arial, Helvetica, sans-serif',tahoma:'Tahoma, Arial, Helvetica, sans-serif',system:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
};preview.style.setProperty('--preview-font-family',previewFontMap[s.fontFamily]||previewFontMap.arial);preview.style.setProperty('--preview-heading-size',s.headingSize+'px');preview.style.setProperty('--preview-body-size',s.bodySize+'px');preview.style.setProperty('--preview-small-size',s.smallSize+'px');preview.style.setProperty('--preview-heading',p.headingColor);preview.style.setProperty('--preview-text',p.textColor);preview.style.setProperty('--preview-muted',p.mutedColor);preview.style.setProperty('--preview-bg',p.panelColor);preview.style.setProperty('--preview-border',p.borderColor);preview.style.setProperty('--preview-accent',p.accentColor);}
function previewSystemSettingsFromForm(){const s=readAppearanceForm();updateAppearanceSizeOutputs(s);applyAppearanceSettings(s);}
function bindSystemAppearanceControls(){const modal=document.getElementById('systemSettingsModal');if(!modal || modal.dataset.appearanceBound==='1')return;modal.dataset.appearanceBound='1';const ids=['systemSettingFontFamily','systemSettingHeadingSize','systemSettingBodySize','systemSettingSmallSize','systemSettingHeadingColor','systemSettingTextColor','systemSettingMutedColor','systemSettingBgColor','systemSettingSidebarColor','systemSettingPanelColor','systemSettingPanel2Color','systemSettingFieldColor','systemSettingBorderColor','systemSettingAccentColor','systemSettingAccentColor2'
];ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('input',previewSystemSettingsFromForm);el.addEventListener('change',previewSystemSettingsFromForm);});}
function openSystemSettings(){const full=hasPermission('systemCustomization'),appearance=full||hasPermission('appearanceSettings'),accounts=hasPermission('manageUsers')||hasPermission('managePermissions');if(!appearance&&!accounts)return;const s=state.systemSettings||{},modal=document.getElementById('systemSettingsModal');document.getElementById('systemSettingAppName').value=s.appName||'MOSH ERP';document.getElementById('systemSettingCompanyName').value=s.companyName||currentUser.company||'Mosh Group';populateAppearanceForm(s);bindSystemAppearanceControls();const role=getCurrentRole(),account=document.getElementById('settingsCurrentAccount');if(account)account.textContent=currentUserDisplayName()+' — '+(role?role.name:'مستخدم');if(modal){modal.dataset.settingsMode=full?'full':appearance?'appearance':'accounts';const identity=document.getElementById('systemSettingAppName')?.closest('.settings-section'),font=document.getElementById('systemSettingFontFamily')?.closest('.settings-section'),textColors=document.getElementById('systemSettingHeadingColor')?.closest('.settings-section'),uiColors=document.getElementById('systemSettingBgColor')?.closest('.settings-section'),hr=modal.querySelector('.hr-policy-settings-section'),ui=modal.querySelector('#v25UiSettings'),auth=modal.querySelector('#auth37SettingsPanel'),preview=document.getElementById('systemAppearancePreview'),actions=modal.querySelector('.settings-actions');if(identity)identity.hidden=!full;if(font)font.hidden=!appearance;if(textColors)textColors.hidden=!appearance;if(uiColors)uiColors.hidden=!appearance;if(hr)hr.hidden=!full;if(ui)ui.hidden=!appearance;if(auth)auth.hidden=!accounts;if(preview)preview.hidden=!appearance;if(actions)actions.hidden=!appearance;const title=modal.querySelector('.system-settings-head h3'),sub=modal.querySelector('.system-settings-head .muted');if(title)title.textContent=full?'إعدادات النظام':appearance?'ضبط المظهر والقراءة':'الحسابات والصلاحيات';if(sub)sub.textContent=full?'إعدادات النظام والمظهر بحسب صلاحيات الحساب':appearance?'الخط، أحجام الكتابة، الألوان وراحة الواجهة فقط — لا توجد صلاحية لإدارة الحسابات.':'إدارة الحسابات والصلاحيات فقط — إعدادات المظهر والنظام غير متاحة لهذا الحساب.';modal.classList.add('show');}}
function closeSystemSettings(keepPreview=false){const modal=document.getElementById('systemSettingsModal');if(modal)modal.classList.remove('show');if(!keepPreview)applySystemSettings();}
function resetSystemTypographyDefaults(){setSettingInputValue('systemSettingFontFamily',SYSTEM_APPEARANCE_DEFAULTS.fontFamily);setSettingInputValue('systemSettingHeadingSize',SYSTEM_APPEARANCE_DEFAULTS.headingSize);setSettingInputValue('systemSettingBodySize',SYSTEM_APPEARANCE_DEFAULTS.bodySize);setSettingInputValue('systemSettingSmallSize',SYSTEM_APPEARANCE_DEFAULTS.smallSize);previewSystemSettingsFromForm();}
function resetSystemAppearanceDefaults(){populateAppearanceForm(SYSTEM_APPEARANCE_DEFAULTS);previewSystemSettingsFromForm();}
function saveSystemSettings(){const full=hasPermission('systemCustomization'),appearanceAllowed=full||hasPermission('appearanceSettings');if(!appearanceAllowed)return;const appearance=readAppearanceForm();pushAppUndo();if(full){const appName=document.getElementById('systemSettingAppName').value.trim(),companyName=document.getElementById('systemSettingCompanyName').value.trim();if(!appName){alert('اكتب اسم النظام.');return;}if(!companyName){alert('اكتب اسم الشركة.');return;}state.systemSettings={...(state.systemSettings||{}),appName,companyName,...appearance};}else state.systemSettings={...(state.systemSettings||{}),...appearance};save();applySystemSettings();closeSystemSettings(true);}
const ARCHIVE_DB_NAME='mosh_erp_archive_v1';const ARCHIVE_DB_VERSION=1;const ARCHIVE_STORE='entries';const ARCHIVE_AREA_LABELS={quotations:'عروض الأسعار',salesOrders:'أوامر المبيعات',invoices:'الفواتير',salesTasks:'المهمات',systemSettings:'إعدادات النظام',customers:'العملاء',services:'الخدمات',salespeople:'مندوبي المبيعات',salesTeamsCfg:'فرق المبيعات',quoteTemplates:'خيارات قوالب عرض السعر',serviceContracts:'عقود بيع خدمات موش غروب'
};function openArchiveDB(){throw new Error("الأرشيف محفوظ على الخادم.");}
function getArchiveAppLabel(){const active=document.querySelector('.view.active');const id=active?active.id:'dashboardApp';const labels={dashboardApp:'اللوحة الرئيسية',salesApp:'قسم المبيعات',tasksApp:'المهمات',designApp:'قسم التصميم',photoApp:'قسم التصوير',editingApp:'قسم المونتاج',marketingApp:'قسم التسويق',purchasesApp:'قسم المشتريات',promotionApp:'قسم الترويج',logisticsApp:'قسم اللوجستيات',accountingApp:'قسم المحاسبة',adminApp:'قسم الإدارة',hrApp:'قسم الموارد البشرية',instructionsApp:'تعليمات إدارية عامة',platformApp:'منصة MOSH GROUP',archiveApp:'الأرشيف العام'
};return labels[id]||'النظام';}
function getChangedArchiveAreas(beforeState,afterState){const keys=new Set([...Object.keys(beforeState||{}),...Object.keys(afterState||{})
]);return[...keys].filter(key=>{try{return JSON.stringify(beforeState?.[key])!==JSON.stringify(afterState?.[key]);}catch(e){return true;}
});}
function getArchiveChangeType(beforeState,afterState,changedAreas){if(changedAreas.length!==1)return 'تعديل';const key=changedAreas[0];const beforeValue=beforeState?.[key];const afterValue=afterState?.[key];if(Array.isArray(beforeValue)&& Array.isArray(afterValue)){if(afterValue.length>beforeValue.length)return 'إنشاء';if(afterValue.length<beforeValue.length)return 'حذف';}
return 'تعديل';}
function archiveAreaText(areas){if(!areas || !areas.length)return 'بيانات النظام';return areas.map(k=>ARCHIVE_AREA_LABELS[k]||k).join('، ');}
const ARCHIVE_FIELD_LABELS={id:'المعرّف',number:'الرقم',taskNo:'رقم المهمة',title:'اسم المهمة',customer:'العميل',department:'القسم',assignee:'المسؤول',dueDate:'الموعد',description:'تفاصيل المهمة',notes:'ملاحظات',status:'الحالة',origin:'منشأ المهمة',createdBy:'أنشأها',updatedAt:'آخر تعديل',updatedBy:'عدّلها',createdAt:'تاريخ الإنشاء',salesOrderNo:'مرجع أمر المبيعات',salesOrderId:'أمر المبيعات',parentTaskNo:'رقم المهمة الأساسية',parentTaskTitle:'المهمة الأساسية',salesperson:'مسؤول المبيعات',salesTeam:'فريق المبيعات',company:'الشركة',expiration:'تاريخ الانتهاء',paymentTerms:'شروط الدفع',deliveryDate:'تاريخ التسليم',invoiceAddress:'عنوان الفاتورة',deliveryAddress:'عنوان التسليم',pricelist:'قائمة الأسعار',template:'القالب',customerReference:'مرجع العميل',sourceDocument:'المستند المصدر',type:'نوع العميل',legalName:'الاسم القانوني',industry:'مجال العمل',contact:'الشخص المسؤول',jobTitle:'المسمى الوظيفي',alternatePhone:'هاتف إضافي',whatsapp:'واتساب',email:'البريد الإلكتروني',website:'الموقع الإلكتروني',country:'الدولة',city:'المدينة',address:'العنوان',billingAddress:'عنوان الفوترة',deliveryAddress:'عنوان التسليم',taxNumber:'الرقم الضريبي',commercialRegister:'السجل التجاري',currency:'العملة',source:'مصدر العميل',preferredContact:'طريقة التواصل المفضلة',secondaryContacts:'أشخاص التواصل الإضافيين',active:'الحالة',serviceCode:'كود الخدمة',category:'تصنيف الخدمة',leader:'قائد الفريق',members:'أعضاء الفريق',validityDays:'مدة صلاحية العرض الافتراضية',defaultNotes:'ملاحظات وشروط افتراضية',salePrice:'سعر البيع',cost:'التكلفة',taxRate:'الضريبة',unit:'وحدة البيع',durationValue:'مدة التنفيذ',durationUnit:'وحدة المدة',responsibleDepartment:'القسم المسؤول',serviceDescription:'وصف الخدمة',appName:'اسم النظام',companyName:'اسم الشركة',accentColor:'اللون الرئيسي',accentColor2:'اللون الثانوي',lines:'بنود العرض',optional:'البنود الاختيارية',attachments:'المرفقات',history:'سجل النشاط',quoteBuilder:'تنسيق العرض'
};const ARCHIVE_STATUS_LABELS={draft:'مسودة',sent:'مرسل',order:'عرض سعر موافق',cancelled:'ملغي',canceled:'ملغي',in_progress:'قيد التنفيذ',completed:'مكتملة',awaiting_invoice:'بانتظار الفوترة',invoiced:'تمت الفوترة'
};function archiveFieldLabel(key){return ARCHIVE_FIELD_LABELS[key]||key;}
function archiveValue(value,key=''){if(value===null || value===undefined || value==='')return '—';if(key==='status'){return ARCHIVE_STATUS_LABELS[value]||String(value);}
if(typeof value==='boolean')return value?'نعم':'لا';if(Array.isArray(value)){if(key==='attachments')return value.length?`${value.length} مرفق`:'لا يوجد';if(key==='history')return value.length?`${value.length} حركة`:'لا يوجد';if(key==='lines')return value.length?`${value.length} بند`:'لا يوجد';if(key==='optional')return value.length?`${value.length} بند اختياري`:'لا يوجد';return value.length?`${value.length} عنصر`:'لا يوجد';}
if(typeof value==='object'){return 'تم تعديل التفاصيل';}
return String(value);}
function archiveRecordKey(record,index){if(!record || typeof record!=='object')return `idx:${index}`;if(record.id!==undefined && record.id!==null)return `id:${record.id}`;if(record.taskNo)return `task:${record.taskNo}`;if(record.number)return `number:${record.number}`;return `idx:${index}`;}
function archiveRecordTitle(record,areaKey){if(!record || typeof record!=='object')return ARCHIVE_AREA_LABELS[areaKey]||areaKey;if(areaKey==='salesTasks')return MoshTaskUI.title(record);
if(areaKey==='quotations'){const no=record.number||'';const title=record.title||'عرض سعر';return no ? `${no} — ${title}`:title;}
if(areaKey==='salesOrders'){const no=record.number||record.salesOrderNo||'';const customer=record.customer||'عرض سعر موافق';return no ? `${no} — ${customer}`:customer;}
if(areaKey==='invoices'){const no=record.number||'';const customer=record.customer||'فاتورة';return no ? `${no} — ${customer}`:customer;}
return record.title||record.name||record.number||ARCHIVE_AREA_LABELS[areaKey]||areaKey;}
function archiveImportantFields(record,areaKey){const fieldSets={salesTasks:['title','customer','department','assignee','dueDate','status','origin','salesOrderNo','createdBy','description','notes','attachments'],quotations:['number','title','customer','status','expiration','paymentTerms','salesperson','company','notes','lines','optional'],salesOrders:['number','customer','status','salesperson','company','deliveryDate','paymentTerms'],invoices:['number','customer','status','salesOrderNo','createdAt'],customers:['id','type','name','legalName','industry','contact','jobTitle','phone','alternatePhone','whatsapp','email','website','country','city','address','billingAddress','deliveryAddress','taxNumber','commercialRegister','paymentTerms','currency','salesperson','source','preferredContact','secondaryContacts','notes','active','createdAt','createdBy','updatedAt','updatedBy'],services:['id','serviceCode','name','category','active','serviceDescription','createdAt','createdBy','updatedAt','updatedBy'],salespeople:['id','name','jobTitle','phone','email','salesTeam','active','notes','createdAt','createdBy'],salesTeamsCfg:['id','name','leader','members','active','notes','createdAt','createdBy'],quoteTemplates:['id','name','style','validityDays','defaultNotes','isDefault','active','createdAt','createdBy'],serviceContracts:['id','contractNumber','contractTitle','customer','status','startDate','endDate','autoRenew','renewalPeriod','noticeDays','currency','billingCycle','paymentDueDays','taxRate','lines','scopeText','moshObligations','clientObligations','confidentiality','intellectualProperty','termination','forceMajeure','disputes','additionalTerms','clientSignatory','clientSignatoryTitle','moshSignatory','moshSignatoryTitle','createdAt','createdBy','updatedAt','updatedBy'],systemSettings:['appName','companyName','accentColor','accentColor2']
};return fieldSets[areaKey]||Object.keys(record||{}).slice(0,14);}
function archiveFieldChanges(beforeRecord,afterRecord,areaKey,mode='modify'){const keys=new Set([...archiveImportantFields(beforeRecord||{},areaKey),...archiveImportantFields(afterRecord||{},areaKey)
]);const changes=[];keys.forEach(key=>{const beforeValue=beforeRecord?.[key];const afterValue=afterRecord?.[key];let changed=false;try{changed=JSON.stringify(beforeValue)!==JSON.stringify(afterValue);}catch(e){changed=beforeValue!==afterValue;}
if(mode==='modify' && !changed)return;const oldText=archiveValue(beforeValue,key);const newText=archiveValue(afterValue,key);if(mode==='create' && newText==='—')return;if(mode==='delete' && oldText==='—')return;changes.push({field:archiveFieldLabel(key),before:mode==='create'?'—':oldText,after:mode==='delete'?'—':newText
});});return changes;}
function buildArchiveHumanChanges(entry){const result=[];const beforeState=entry.beforeState||{};const afterState=entry.afterState||{};const areas=entry.changedAreas||getChangedArchiveAreas(beforeState,afterState);areas.forEach(areaKey=>{const beforeValue=beforeState?.[areaKey];const afterValue=afterState?.[areaKey];if(Array.isArray(beforeValue)&& Array.isArray(afterValue)){const beforeMap=new Map(beforeValue.map((r,i)=>[archiveRecordKey(r,i),r]));const afterMap=new Map(afterValue.map((r,i)=>[archiveRecordKey(r,i),r]));const keys=new Set([...beforeMap.keys(),...afterMap.keys()]);keys.forEach(key=>{const beforeRecord=beforeMap.get(key);const afterRecord=afterMap.get(key);if(!beforeRecord && afterRecord){result.push({area:ARCHIVE_AREA_LABELS[areaKey]||areaKey,action:'إنشاء',title:archiveRecordTitle(afterRecord,areaKey),rows:archiveFieldChanges(null,afterRecord,areaKey,'create')
});return;}
if(beforeRecord && !afterRecord){result.push({area:ARCHIVE_AREA_LABELS[areaKey]||areaKey,action:'حذف',title:archiveRecordTitle(beforeRecord,areaKey),rows:archiveFieldChanges(beforeRecord,null,areaKey,'delete')
});return;}
let changed=false;try{changed=JSON.stringify(beforeRecord)!==JSON.stringify(afterRecord);}catch(e){changed=true;}
if(changed){const rows=archiveFieldChanges(beforeRecord,afterRecord,areaKey,'modify');if(rows.length){result.push({area:ARCHIVE_AREA_LABELS[areaKey]||areaKey,action:'تعديل',title:archiveRecordTitle(afterRecord||beforeRecord,areaKey),rows
});}
}
});return;}
if(beforeValue && afterValue &&
typeof beforeValue==='object' &&
typeof afterValue==='object' &&
!Array.isArray(beforeValue)&&
!Array.isArray(afterValue)
){const rows=archiveFieldChanges(beforeValue,afterValue,areaKey,'modify');if(rows.length){result.push({area:ARCHIVE_AREA_LABELS[areaKey]||areaKey,action:'تعديل',title:ARCHIVE_AREA_LABELS[areaKey]||areaKey,rows
});}
return;}
result.push({area:ARCHIVE_AREA_LABELS[areaKey]||areaKey,action:'تعديل',title:ARCHIVE_AREA_LABELS[areaKey]||areaKey,rows:[{field:ARCHIVE_AREA_LABELS[areaKey]||areaKey,before:archiveValue(beforeValue,areaKey),after:archiveValue(afterValue,areaKey)
}]
});});return result;}
function archiveEntryHeadline(entry){const changes=buildArchiveHumanChanges(entry);if(!changes.length){return `${entry.changeType||'تعديل'} — ${entry.changedAreasText||archiveAreaText(entry.changedAreas)}`;}
if(changes.length===1){return `${changes[0].action} — ${changes[0].title}`;}
const actions=[...new Set(changes.map(c=>c.action))];const actionText=actions.length===1?actions[0]:'عدة تغييرات';return `${actionText} — ${changes.length} سجلات`;}
function renderArchiveHumanDetails(entry){const changes=buildArchiveHumanChanges(entry);if(!changes.length){return '<div class="panel"><div class="muted">لا توجد تفاصيل إضافية لهذا التعديل.</div></div>';}
return changes.map(change=>`
  <div class="archive-change-card">
   <div class="archive-change-head">
    <div>
     <div class="archive-change-title">${esc(change.title)}</div>
     <div class="muted" style="font-size:12px;margin-top:4px">${esc(change.area)}</div>
    </div>
    <span class="archive-change-badge">${esc(change.action)}</span>
   </div>

   ${change.rows.length?`
   <table class="archive-change-table">
    <thead>
     <tr>
      <th>الحقل</th>
      <th>قبل</th>
      <th>بعد</th>
     </tr>
    </thead>
    <tbody>
     ${change.rows.map(row=>`
      <tr>
       <td>${esc(row.field)}</td>
       <td class="${row.before==='—'?'archive-empty-value':'archive-old-value'}">${esc(row.before)}</td>
       <td class="${row.after==='—'?'archive-empty-value':'archive-new-value'}">${esc(row.after)}</td>
      </tr>
     `).join('')}
    </tbody>
   </table>`:'<div class="archive-detail-note">تم تسجيل التغيير، ولا توجد حقول إضافية لعرضها.</div>'}
  </div>
 `).join('');}
async function writeArchiveEntry(){ /* The API appends authoritative audit events. */ }
function archiveStateChange(){}
async function getArchiveEntryCount(){const r=await MoshApi.request("/audit-events?perPage=1",{envelope:true});return r.meta.total;}
async function getArchiveEntriesPage(offset=0,limit=50){const r=await MoshApi.request("/audit-events?page="+(Math.floor(offset/limit)+1)+"&perPage="+limit);return r.map(MoshApi.archiveEntry);}
function formatArchiveDate(value){if(!value)return '—';const d=new Date(value);if(Number.isNaN(d.getTime()))return value;const p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;}
async function renderArchive(){if(!hasPermission('viewArchive')){alert('ليس لديك صلاحية لعرض الأرشيف العام.');return}
const rows=document.getElementById('archiveRows'),empty=document.getElementById('archiveEmpty');if(!rows||!empty)return;const key='archive',st=getAppListState(key);rows.innerHTML='<tr><td colspan="6" class="muted">جارٍ تحميل الصفحة...</td></tr>';empty.style.display='none';const total=await getArchiveEntryCount(),totalPages=Math.max(1,Math.ceil(total/st.pageSize));if(st.page>totalPages)st.page=totalPages;const offset=(st.page-1)*st.pageSize;const[entries,latestEntries]=await Promise.all([getArchiveEntriesPage(offset,st.pageSize),getArchiveEntriesPage(0,1)]);const result={items:entries,total,rawTotal:total,page:st.page,pageSize:st.pageSize,totalPages,start:offset,end:Math.min(offset+entries.length,total)};const count=document.getElementById('archiveTotalCount'),latest=document.getElementById('archiveLatestTime'),user=document.getElementById('archiveCurrentUser');if(count)count.textContent=total.toLocaleString('en-US');if(latest)latest.textContent=latestEntries.length?formatArchiveDate(latestEntries[0].timestamp):'—';if(user)user.textContent=currentUserDisplayName();if(!total){rows.innerHTML='';empty.style.display='block';const oldPager=document.getElementById('archivePagerHost');if(oldPager)oldPager.remove();return}
empty.style.display='none';rows.innerHTML=entries.map(entry=>`<tr><td>${esc(formatArchiveDate(entry.timestamp))}</td><td><b>${esc(entry.userName||entry.username||'—')}</b><div class="muted" style="font-size:11px">${esc(entry.roleName||'')}</div></td><td>${esc(entry.app||'النظام')}</td><td>${esc((buildArchiveHumanChanges(entry)[0]||{}).action||entry.changeType||'تعديل')}</td><td>${esc(archiveEntryHeadline(entry))}</td><td><button class="btn" onclick="openArchiveDetails('${esc(entry.id)}')">عرض</button></td></tr>`).join('');let pager=document.getElementById('archivePagerHost');if(!pager){pager=document.createElement('div');pager.id='archivePagerHost';rows.closest('.panel')?.appendChild(pager)}if(pager)pager.innerHTML=appListPagerHtml(key,result,{search:false});}
let archiveBillingFilter='all';function archivedTaskList(filter=archiveBillingFilter){const all=(state.salesTasks||[]).filter(t=>
!t.parentTaskId&&['archived_invoiced','archived_no_invoice'].includes(t.status)
).slice().sort((a,b)=>String(b.archivedAt||'').localeCompare(String(a.archivedAt||'')));if(filter==='invoiced')return all.filter(t=>t.status==='archived_invoiced');if(filter==='no_invoice')return all.filter(t=>t.status==='archived_no_invoice');return all;}
function archiveBillingStatusLabel(task){return task?.status==='archived_no_invoice'?'غير بحاجة للفوترة':'مفوترة';}
function setArchiveBillingFilter(value){archiveBillingFilter=['all','invoiced','no_invoice'].includes(value)?value:'all';resetAppListPage('archive_tasks');renderArchivedTasks();}
function openArchiveSection(mode='tasks'){if(mode==='invoiced'){archiveBillingFilter='invoiced';mode='tasks'}
if(mode==='no_invoice'){archiveBillingFilter='no_invoice';mode='tasks'}
archiveTaskSection=mode==='audit'?'audit':'tasks';const audit=document.getElementById('archiveAuditContent');const tasks=document.getElementById('archiveTaskListsContent');if(audit)audit.style.display=archiveTaskSection==='audit'?'block':'none';if(tasks)tasks.style.display=archiveTaskSection==='tasks'?'block':'none';document.getElementById('archiveTabAudit')?.classList.toggle('active',archiveTaskSection==='audit');document.getElementById('archiveTabTasks')?.classList.toggle('active',archiveTaskSection==='tasks');if(archiveTaskSection==='audit'){document.getElementById('crumb').innerHTML='<b>الأرشيف العام</b> / سجل التعديلات';renderArchive();}else{document.getElementById('crumb').innerHTML='<b>الأرشيف العام</b> / أرشيف المهمات';renderArchivedTasks();}
}
function refreshCurrentArchiveSection(){if(archiveTaskSection==='audit')renderArchive();else renderArchivedTasks();}
function archiveRestoreDepartmentOptions(task){const preferred=String(task?.closedFromDepartment||task?.department||'');const options=['المهمات',...salesTaskDepartments];return options.map(d=>
`<option value="${esc(d)}" ${String(d)===preferred?'selected':''}>${d==='المهمات'?'قسم المهمات':esc(departmentDisplayName(d)||d)}</option>`
).join('');}
function restoreArchivedTask(id,selectId){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(id)&&!t.parentTaskId);if(!task||!['archived_invoiced','archived_no_invoice'].includes(task.status))return;const select=document.getElementById(selectId);const department=String(select?.value||'').trim();if(!department){alert('اختر القسم الذي تريد استعادة المهمة إليه.');return;}
pushAppUndo();const previousArchiveStatus=task.status;const previousArchiveLabel=previousArchiveStatus==='archived_invoiced'
?'المهام المنتهية المفوترة'
:'مهام غير بحاجة للفوترة';task.status='in_progress';task.employeeState='new';task.department=department;task.assignee='';task.assigneeId='';task.assignmentMode='manager';task.reviewManager='';task.returnedForRevision=false;task.restoredAt=activityTimestamp();task.restoredBy=currentUserDisplayName();task.restoredFromArchiveStatus=previousArchiveStatus;task.restoredToDepartment=department;task.archivedAt='';task.archivedBy='';task.archiveBillingType='';task.finalizedAccountingAt='';task.finalizedAccountingBy='';task.closedAt='';task.closedBy='';task.noInvoiceAt='';task.invoicedAt='';task.history=Array.isArray(task.history)?task.history:[];task.history.push({text:department==='المهمات'
?'تمت استعادة المهمة من الأرشيف وإعادتها إلى قسم «المهمات».'
:`تمت استعادة المهمة من الأرشيف وإرسالها إلى ${departmentDisplayName(department)||department} لإعادة العمل عليها.`,time:task.restoredAt,by:currentUserDisplayName()
});save();renderArchivedTasks();}
function renderArchivedTasks(){const box=document.getElementById('archiveTaskListsWorkspace');if(!box)return;const full=(state.salesTasks||[]).filter(t=>!t.parentTaskId&&['archived_invoiced','archived_no_invoice'].includes(t.status));const list=archivedTaskList();const result=filterAndPageAppList('archive_tasks',list,t=>[t.taskNo,t.number,t.title,t.customer,t.salesOrderNo,t.closedFromDepartment,t.archivedBy,t.archivedAt,archiveBillingStatusLabel(t)].join(' ')
);const invoicedCount=full.filter(t=>t.status==='archived_invoiced').length;const noInvoiceCount=full.filter(t=>t.status==='archived_no_invoice').length;box.innerHTML=`<div class="archive-finished-hero">
  <div><h2>أرشيف المهمات</h2><p>كل المهام المغلقة في قائمة واحدة، مع فلترة حسب حالة الفوترة.</p></div>
  <div class="archive-finished-count"><b>${full.length}</b><span>مهمة</span></div>
 </div>

 <div class="archive-unified-filter">
  <div>
   <label>حالة الفوترة</label>
   <select onchange="setArchiveBillingFilter(this.value)">
    <option value="all" ${archiveBillingFilter==='all'?'selected':''}>الكل (${full.length})</option>
    <option value="invoiced" ${archiveBillingFilter==='invoiced'?'selected':''}>مفوترة (${invoicedCount})</option>
    <option value="no_invoice" ${archiveBillingFilter==='no_invoice'?'selected':''}>غير بحاجة للفوترة (${noInvoiceCount})</option>
   </select>
  </div>
 </div>

 <div class="panel">
  ${result.total?`<table class="list-table archive-finished-table">
   <thead><tr><th class="mt54-reference" hidden aria-hidden="true">رقم المهمة</th><th>المهمة</th><th>العميل</th><th>مرجع أمر المبيعات</th><th>القسم الأخير</th><th>حالة الفوترة</th><th>تاريخ الإغلاق</th><th>أغلقها</th><th>استعادة المهمة</th></tr></thead>
   <tbody>${result.items.map(t=>`<tr class="data" onclick="openBillingTaskPreview(${MoshTaskUI.arg(t.id)})" title="اضغط لعرض المهمة">
    <td class="mt54-reference" hidden aria-hidden="true"><b>${esc(t.taskNo||t.number||'')}</b></td>
    <td class="mt54-task-name">${esc(t.title||'')}</td>
    <td class="mt54-client-name">${esc(t.customer||'—')}</td>
    <td>${esc(t.salesOrderNo||'—')}</td>
    <td>${esc(t.closedFromDepartment||t.department||'—')}</td>
    <td><span class="workflow-status ${t.status==='archived_invoiced'?'done':'review'}">${esc(archiveBillingStatusLabel(t))}</span></td>
    <td>${esc(t.archivedAt||'—')}</td>
    <td>${esc(t.archivedBy||'—')}</td>
    <td class="archive-restore-cell" onclick="event.stopPropagation()">
     <div class="archive-restore-control">
      <select id="archiveRestoreDept_${t.id}" title="القسم الذي ستعود إليه المهمة">
       ${archiveRestoreDepartmentOptions(t)}
      </select>
      <button type="button" class="btn archive-restore-btn" onclick="restoreArchivedTask(${MoshTaskUI.arg(t.id)},'archiveRestoreDept_${MoshTaskUI.arg(t.id)}')">استعادة المهمة</button>
     </div>
    </td>
   </tr>`).join('')}</tbody>
  </table>`:`<div class="archive-finished-empty"><div class="icon">✓</div><h3>لا يوجد مهام مطابقة</h3><p>غيّر فلتر حالة الفوترة أو ارجع إلى «الكل».</p></div>`}
  ${appListPagerHtml('archive_tasks',result,{placeholder:'بحث باسم المهمة، العميل أو أمر المبيعات...'})}
 </div>`;}
async function getArchiveEntryById(id){return MoshApi.archiveEntry(await MoshApi.request("/audit-events/"+encodeURIComponent(id)));}
async function openArchiveDetails(id){if(!hasPermission('viewArchive'))return;const entry=await getArchiveEntryById(id);if(!entry){alert('تعذر العثور على هذه النسخة المؤرشفة.');return;}
const meta=document.getElementById('archiveDetailsMeta');const summary=document.getElementById('archiveDetailsSummary');const details=document.getElementById('archiveHumanDetails');if(meta){meta.textContent=
`${formatArchiveDate(entry.timestamp)} • ${entry.userName||entry.username||'—'} • ${entry.app||'النظام'}`;}
if(summary){summary.textContent=archiveEntryHeadline(entry);}
if(details){details.innerHTML=renderArchiveHumanDetails(entry);}
document.getElementById('archiveDetailsModal').classList.add('show');}
function closeArchiveDetails(){const modal=document.getElementById('archiveDetailsModal');if(modal)modal.classList.remove('show');}
function save(){return MoshApi.save();}
function money(n){return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function quoteTotals(q){let subtotal=0,tax=0,cost=0;q.lines.filter(x=>x.type==='product').forEach(l=>{const base=Number(l.qty||0)*Number(l.price||0)*(1-Number(l.discount||0)/100);subtotal+=base;tax+=base*Number(l.tax||0)/100;cost+=Number(l.qty||0)*Number(l.cost||0)
});return{subtotal,tax,total:subtotal+tax,margin:subtotal-cost,marginPct:subtotal?((subtotal-cost)/subtotal*100):0};}
const MENU_FIRST_DEPARTMENT_APPS=new Set(['sales','admin','hr','marketing','social','design','photo','editing','promotion','logistics','purchases','accounting','platform'
]);const PRODUCTIVE_DEPARTMENTS={social:{app:'social',appId:'socialApp',contentId:'socialAppContent',workspaceId:'socialTaskWorkspace',department:'السوشال ميديا',label:'السوشال ميديا'},it:{app:'it',appId:'itApp',contentId:'itAppContent',workspaceId:'itTaskList',department:'تكنولوجيا المعلومات',label:'تكنولوجيا المعلومات'},admin:{app:'admin',appId:'adminApp',contentId:'adminProductiveWorkspace',workspaceId:'adminProductiveWorkspace',department:'الإدارة',label:'الإدارة'},sales:{app:'sales',appId:'salesApp',contentId:'salesDynamic',workspaceId:'salesDynamic',department:'المبيعات',label:'المبيعات'},hr:{app:'hr',appId:'hrApp',contentId:'hrAppContent',workspaceId:'hrAppTasks',department:'الموارد البشرية',label:'الموارد البشرية'},design:{app:'design',appId:'designApp',contentId:'designAppContent',workspaceId:'designTaskWorkspace',department:'التصميم',label:'التصميم'},marketing:{app:'marketing',appId:'marketingApp',contentId:'marketingAppContent',workspaceId:'marketingTaskWorkspace',department:'التسويق',label:'التسويق'},photo:{app:'photo',appId:'photoApp',contentId:'photoAppContent',workspaceId:'photoTaskWorkspace',department:'التصوير',label:'التصوير'},editing:{app:'editing',appId:'editingApp',contentId:'editingAppContent',workspaceId:'editingTaskWorkspace',department:'المونتاج',label:'المونتاج'},promotion:{app:'promotion',appId:'promotionApp',contentId:'promotionAppContent',workspaceId:'promotionTaskWorkspace',department:'الترويج',label:'الترويج'},logistics:{app:'logistics',appId:'logisticsApp',contentId:'logisticsAppContent',workspaceId:'logisticsAppTasks',department:'اللوجستيات',label:'اللوجستيات'},purchases:{app:'purchases',appId:'purchasesApp',contentId:'purchasesAppContent',workspaceId:'purchasesAppContent',department:'المشتريات',label:'المشتريات'},accounting:{app:'accounting',appId:'accountingApp',contentId:'accountingTasksContent',workspaceId:'accountingDepartmentTasks',department:'المحاسبة',label:'المحاسبة'},platform:{app:'platform',appId:'platformApp',contentId:'platformAppContent',workspaceId:'platformTaskWorkspace',department:'MOSH MEDIA',label:'MOSH MEDIA'}
};function resetDepartmentLanding(app){document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('show'));if(app==='sales'){const host=document.getElementById('salesDynamic');if(host)host.innerHTML='';currentSalesMode='';return;}
if(app==='accounting'){['accountingTasksContent','accountingPackagesContent','accountingBillingContent','accountingInvoicesContent'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});return;}
const content=document.getElementById(app+'AppContent');if(content)content.style.display='none';if(app==='purchases')document.getElementById('purchasesRequestsContent')?.style &&(document.getElementById('purchasesRequestsContent').style.display='none');if(app==='logistics')document.getElementById('logisticsRequestsContent')?.style &&(document.getElementById('logisticsRequestsContent').style.display='none');if(app==='hr'){const staff=document.getElementById('hrStaffConfigContent');if(staff)staff.style.display='none';}
}
function openDepartmentTasksPage(appId,department,containerId){const content=document.getElementById(appId+'Content');if(content)content.style.display='block';if(appId==='purchasesApp'){const r=document.getElementById('purchasesRequestsContent');if(r)r.style.display='none'}
if(appId==='logisticsApp'){const r=document.getElementById('logisticsRequestsContent');if(r)r.style.display='none'}
if(appId==='hrApp'){const staff=document.getElementById('hrStaffConfigContent');if(staff)staff.style.display='none';}
document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('show'));const labels={adminApp:'قسم الإدارة',hrApp:'قسم الموارد البشرية',marketingApp:'قسم التسويق',socialApp:'قسم السوشال ميديا',designApp:'قسم التصميم',photoApp:'قسم التصوير',editingApp:'قسم المونتاج',promotionApp:'قسم الترويج',logisticsApp:'قسم اللوجستيات',purchasesApp:'قسم المشتريات'
};document.getElementById('crumb').innerHTML=`<b>${esc(labels[appId]||department)}</b> / مهام القسم`;renderDepartmentTasks(department,containerId);}
function openAccountingSection(mode){['accountingTasksContent','accountingPackagesContent','accountingBillingContent','accountingInvoicesContent'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('show'));if(mode==='tasks'){const el=document.getElementById('accountingTasksContent');if(el)el.style.display='block';document.getElementById('crumb').innerHTML='<b>قسم المحاسبة</b> / مهام القسم';renderDepartmentTasks('المحاسبة','accountingDepartmentTasks');return;}
if(mode==='packages'){const el=document.getElementById('accountingPackagesContent');if(el)el.style.display='block';document.getElementById('crumb').innerHTML='<b>قسم المحاسبة</b> / قائمة الباقات';renderAccountingPackages();return;}
if(mode==='billing'){const el=document.getElementById('accountingBillingContent');if(el)el.style.display='block';document.getElementById('crumb').innerHTML='<b>قسم المحاسبة</b> / مهام بانتظار الفوترة';renderBillingTasks();return;}
if(mode==='invoices'){const el=document.getElementById('accountingInvoicesContent');if(el)el.style.display='block';document.getElementById('crumb').innerHTML='<b>قسم المحاسبة</b> / فواتير العملاء';renderInvoices();}
}
function goApp(app,link,addHistory=true){if(app==='archive' && !hasPermission('viewArchive')){alert('ليس لديك صلاحية لعرض الأرشيف العام.');return;}
if(addHistory){const active=document.querySelector('.view.active');if(active){const id=active.id;if(id==='dashboardApp')pushHistory({type:'app',app:'dashboard'});else if(id==='salesApp')pushHistory({type:'quotes'});else if(id==='tasksApp')pushHistory({type:'app',app:'tasks'});else if(id==='adminApp')pushHistory({type:'app',app:'admin'});else if(id==='hrApp')pushHistory({type:'app',app:'hr'});else if(id==='designApp')pushHistory({type:'app',app:'design'});else if(id==='photoApp')pushHistory({type:'app',app:'photo'});else if(id==='editingApp')pushHistory({type:'app',app:'editing'});else if(id==='marketingApp')pushHistory({type:'app',app:'marketing'});else if(id==='socialApp')pushHistory({type:'app',app:'social'});else if(id==='purchasesApp')pushHistory({type:'app',app:'purchases'});else if(id==='promotionApp')pushHistory({type:'app',app:'promotion'});else if(id==='logisticsApp')pushHistory({type:'app',app:'logistics'});else if(id==='accountingApp')pushHistory({type:'app',app:'accounting'});else if(id==='instructionsApp')pushHistory({type:'app',app:'instructions'});else if(id==='platformApp')pushHistory({type:'app',app:'platform'});else if(id==='archiveApp')pushHistory({type:'app',app:'archive'});}
}
document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(app+'App').classList.add('active');document.querySelectorAll('.nav a').forEach(a=>a.classList.remove('active'));if(link)link.classList.add('active');document.getElementById('crumb').innerHTML='<b>'+({it:'قسم تكنولوجيا المعلومات',dashboard:'اللوحة الرئيسية',tasks:'المهمات',admin:'قسم الإدارة',hr:'قسم الموارد البشرية',sales:'قسم المبيعات',marketing:'قسم التسويق',social:'قسم السوشال ميديا',design:'قسم التصميم',photo:'قسم التصوير',editing:'قسم المونتاج',promotion:'قسم الترويج',logistics:'قسم اللوجستيات',purchases:'قسم المشتريات',accounting:'قسم المحاسبة',instructions:'تعليمات إدارية عامة',platform:'منصة MOSH GROUP',archive:'الأرشيف العام'}[app])+'</b>';if(MENU_FIRST_DEPARTMENT_APPS.has(app))resetDepartmentLanding(app);if(PRODUCTIVE_DEPARTMENTS[app]&&app!=='admin'&&app!=='it')openProductiveDistributionPage(app);if(app==='tasks')renderAllTasks();if(app==='archive'){archiveTaskSection='tasks';openArchiveSection('tasks')}
}
function toggleDrop(id){document.querySelectorAll('.dropdown').forEach(d=>{if(d.id!==id)d.classList.remove('show')});document.getElementById(id).classList.toggle('show');}
document.addEventListener('click',e=>{if(!e.target.closest('.menu'))document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('show'))});const salesReportState={reportType:'customer',lockedType:'',query:'',dateFrom:'',dateTo:'',status:'',customer:'',salesperson:'',service:'',salesTeam:'',quoteNumber:'',generalSearch:'',totalMin:'',totalMax:'',groupBy:''
};function reportQuoteDate(q){const raw=q.createdAt||q.deliveryDate||q.expiration||'';if(!raw)return '';const s=String(raw);if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const d=new Date(raw);if(Number.isNaN(d.getTime()))return '';const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
function reportQuoteStatus(q){if(q.status==='order')return 'approved';if(q.status==='cancel')return 'cancelled';return 'open';}
function reportStatusLabel(status){return{approved:'عرض سعر موافق',cancelled:'عرض سعر ملغي',open:'عرض سعر'
}[status]||status||'—';}
function reportQuoteServices(q){const values=[];(q.lines||[]).filter(l=>l.type==='product').forEach(l=>{const product=String(l.product||'').trim();const desc=String(l.description||'').trim();if(product && !values.includes(product))values.push(product);else if(!product && desc && !values.includes(desc))values.push(desc);});return values;}
function getReportCandidates(type){let values=[];if(type==='customer'){values=(state.quotations||[]).map(q=>String(q.customer||'').trim());}else if(type==='salesperson'){values=(state.quotations||[]).map(q=>String(q.salesperson||'').trim());(state.salespeople||[]).filter(p=>p.active!==false).forEach(p=>values.push(String(p.name||'').trim()));}else if(type==='service'){(state.services||[]).forEach(s=>{const n=String(s.name||'').trim();if(n)values.push(n);});(state.quotations||[]).forEach(q=>values.push(...reportQuoteServices(q)));}
return[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));}
function getReportSalesTeams(){return[...new Set((state.quotations||[]).map(q=>String(q.salesTeam||'').trim()).filter(Boolean))]
.sort((a,b)=>a.localeCompare(b,'ar'));}
function generalReportDatalistOptions(values){return values.map(v=>`<option value="${esc(v)}"></option>`).join('');}
function reportTypeLabel(type){return{general:'تقرير مبيعات مخصص',customer:'العميل',salesperson:'مندوب المبيعات',service:'الخدمة'
}[type]||'البحث';}
function reportTypeTitle(type){return{general:'تقرير مبيعات معيّن',customer:'تقرير مبيعات حسب العميل',salesperson:'تقرير مبيعات حسب مندوب المبيعات',service:'تقرير مبيعات حسب الخدمة'
}[type]||'تقرير المبيعات';}
function setSmartReportType(type){salesReportState.reportType=type||salesReportState.lockedType||'customer';salesReportState.lockedType=salesReportState.reportType;salesReportState.query='';renderSalesReport(salesReportState.reportType,true);}
function setSmartReportQuery(value){salesReportState.query=String(value||'').trim();resetAppListPage('report_specific');renderSalesReport(salesReportState.reportType,true);}
function setSmartReportFilter(key,value){salesReportState[key]=String(value||'');resetAppListPage('report_specific');renderSalesReport(salesReportState.reportType,true);}
function resetSmartReport(){salesReportState.query='';salesReportState.dateFrom='';salesReportState.dateTo='';salesReportState.status='';salesReportState.reportType=salesReportState.lockedType||salesReportState.reportType||'customer';renderSalesReport(salesReportState.reportType,true);}
function setGeneralReportFilter(key,value){salesReportState[key]=String(value||'');resetAppListPage('report_general');}
function applyGeneralSalesReport(){salesReportState.reportType='general';salesReportState.lockedType='general';renderGeneralSalesReport(true);}
function setGeneralReportGroup(value){salesReportState.groupBy=String(value||'');renderGeneralSalesReport(true);}
function resetGeneralSalesReport(){Object.assign(salesReportState,{reportType:'general',lockedType:'general',query:'',dateFrom:'',dateTo:'',status:'',customer:'',salesperson:'',service:'',salesTeam:'',quoteNumber:'',generalSearch:'',totalMin:'',totalMax:'',groupBy:''
});renderGeneralSalesReport(true);}
function reportMatchesQuery(q){const query=String(salesReportState.query||'').trim().toLocaleLowerCase();if(!query)return true;if(salesReportState.reportType==='customer'){return String(q.customer||'').toLocaleLowerCase().includes(query);}
if(salesReportState.reportType==='salesperson'){return String(q.salesperson||'').toLocaleLowerCase().includes(query);}
if(salesReportState.reportType==='service'){return reportQuoteServices(q).some(v=>String(v).toLocaleLowerCase().includes(query));}
return true;}
function generalReportSearchText(q){return[q.number,q.title,q.customer,q.salesperson,q.salesTeam,reportStatusLabel(reportQuoteStatus(q)),reportServicesText(q),quoteTotals(q).total
].join(' ').toLocaleLowerCase();}
function filterSalesReportRows(){return(state.quotations||[]).filter(q=>{if(salesReportState.reportType!=='general' && !reportMatchesQuery(q))return false;const d=reportQuoteDate(q);if(salesReportState.dateFrom &&(!d || d<salesReportState.dateFrom))return false;if(salesReportState.dateTo &&(!d || d>salesReportState.dateTo))return false;if(salesReportState.status && reportQuoteStatus(q)!==salesReportState.status)return false;if(salesReportState.reportType==='general'){const eq=(a,b)=>String(a||'').trim().toLocaleLowerCase()===String(b||'').trim().toLocaleLowerCase();const includes=(a,b)=>String(a||'').trim().toLocaleLowerCase().includes(String(b||'').trim().toLocaleLowerCase());if(salesReportState.customer && !includes(q.customer,salesReportState.customer))return false;if(salesReportState.salesperson && !includes(q.salesperson,salesReportState.salesperson))return false;if(salesReportState.salesTeam && !includes(q.salesTeam,salesReportState.salesTeam))return false;if(salesReportState.quoteNumber && !includes(q.number,salesReportState.quoteNumber))return false;if(salesReportState.service && !reportQuoteServices(q).some(v=>includes(v,salesReportState.service)))return false;const total=Number(quoteTotals(q).total||0);if(salesReportState.totalMin!=='' && total<Number(salesReportState.totalMin||0))return false;if(salesReportState.totalMax!=='' && total>Number(salesReportState.totalMax||0))return false;const general=String(salesReportState.generalSearch||'').trim().toLocaleLowerCase();if(general && !generalReportSearchText(q).includes(general))return false;}
return true;});}
function salesReportMetrics(rows){const all=rows||[];const approved=all.filter(q=>reportQuoteStatus(q)==='approved');const cancelled=all.filter(q=>reportQuoteStatus(q)==='cancelled');const open=all.filter(q=>reportQuoteStatus(q)==='open');const approvedValue=approved.reduce((sum,q)=>sum+Number(quoteTotals(q).total||0),0);const totalValue=all.reduce((sum,q)=>sum+Number(quoteTotals(q).total||0),0);const average=approved.length?approvedValue/approved.length:0;const decided=approved.length+cancelled.length;const approvalRate=decided?(approved.length/decided*100):0;return{totalCount:all.length,approvedCount:approved.length,cancelledCount:cancelled.length,openCount:open.length,approvedValue,totalValue,average,approvalRate
};}
function renderSmartReportMetrics(rows){const m=salesReportMetrics(rows);return `
  <div class="sales-report-metrics">
   <div class="sales-report-metric">
    <div class="label">إجمالي عروض السعر</div>
    <div class="value">${m.totalCount}</div>
    <div class="sub">${m.openCount} عرض قيد المتابعة</div>
   </div>
   <div class="sales-report-metric">
    <div class="label">العروض الموافق عليها</div>
    <div class="value">${m.approvedCount}</div>
    <div class="sub">نسبة الموافقة ${m.approvalRate.toFixed(1)}%</div>
   </div>
   <div class="sales-report-metric">
    <div class="label">قيمة المبيعات المعتمدة</div>
    <div class="value">${money(m.approvedValue)}</div>
    <div class="sub">متوسط الصفقة ${money(m.average)}</div>
   </div>
   <div class="sales-report-metric">
    <div class="label">العروض الملغية</div>
    <div class="value">${m.cancelledCount}</div>
    <div class="sub">إجمالي قيمة العروض ${money(m.totalValue)}</div>
   </div>
  </div>`;}
function reportServicesText(q){const arr=reportQuoteServices(q);return arr.length?arr.join('، '):'—';}
function renderSmartReportRows(rows,pageKey='report_specific'){const result=filterAndPageAppList(pageKey,rows,q=>[q.number,q.customer,q.salesperson,reportServicesText(q),reportStatusLabel(reportQuoteStatus(q)),quoteTotals(q).total].join(' '));if(!result.total)return '<div class="sales-report-empty">لا يوجد نتائج مطابقة.</div>'+appListPagerHtml(pageKey,result,{placeholder:'بحث ضمن نتائج التقرير...'});const pageRows=result.items;return `<table class="list-table"><thead><tr><th>الرقم</th><th>التاريخ</th><th>العميل</th><th>مندوب المبيعات</th><th>الخدمات</th><th>الحالة</th><th>الإجمالي</th></tr></thead><tbody>${pageRows.map(q=>`<tr class="data" onclick="openQuote('${esc(q.id)}')"><td>${esc(q.number||'—')}</td><td>${esc(reportQuoteDate(q)||'—')}</td><td>${esc(q.customer||'—')}</td><td>${esc(q.salesperson||'—')}</td><td>${esc(reportServicesText(q))}</td><td>${esc(reportStatusLabel(reportQuoteStatus(q)))}</td><td>${money(quoteTotals(q).total)}</td></tr>`).join('')}</tbody></table>${appListPagerHtml(pageKey,result,{placeholder:'بحث ضمن نتائج التقرير...'})}`}
function generalReportCriteriaSummary(){const parts=[];if(salesReportState.customer)parts.push(`العميل: ${salesReportState.customer}`);if(salesReportState.salesperson)parts.push(`المندوب: ${salesReportState.salesperson}`);if(salesReportState.service)parts.push(`الخدمة: ${salesReportState.service}`);if(salesReportState.salesTeam)parts.push(`فريق المبيعات: ${salesReportState.salesTeam}`);if(salesReportState.status)parts.push(`الحالة: ${reportStatusLabel(salesReportState.status)}`);if(salesReportState.quoteNumber)parts.push(`رقم العرض: ${salesReportState.quoteNumber}`);if(salesReportState.totalMin!=='')parts.push(`الإجمالي من: ${salesReportState.totalMin}`);if(salesReportState.totalMax!=='')parts.push(`الإجمالي إلى: ${salesReportState.totalMax}`);if(salesReportState.generalSearch)parts.push(`بحث عام: ${salesReportState.generalSearch}`);return parts.length?parts.join(' | '):'جميع المبيعات';}
function generalReportGroupLabel(groupBy){return{customer:'العميل',salesperson:'مندوب المبيعات',service:'الخدمة',status:'الحالة',salesTeam:'فريق المبيعات',month:'الشهر'
}[groupBy]||'بدون تجميع';}
function generalReportGroupKey(q){const groupBy=salesReportState.groupBy;if(groupBy==='customer')return q.customer||'بدون عميل';if(groupBy==='salesperson')return q.salesperson||'بدون مندوب';if(groupBy==='service'){const services=reportQuoteServices(q);if(!services.length)return 'بدون خدمة';return services.length===1?services[0]:'عدة خدمات';}
if(groupBy==='status')return reportStatusLabel(reportQuoteStatus(q));if(groupBy==='salesTeam')return q.salesTeam||'بدون فريق';if(groupBy==='month'){const d=reportQuoteDate(q);return d?d.slice(0,7):'تاريخ غير محدد';}
return '';}
function renderGeneralReportRows(rows){const result=filterAndPageAppList('report_general',rows,q=>[q.number,q.customer,q.salesperson,q.salesTeam,reportServicesText(q),reportStatusLabel(reportQuoteStatus(q)),quoteTotals(q).total].join(' '));if(!result.total)return '<div class="sales-report-empty">لا يوجد نتائج مطابقة.</div>'+appListPagerHtml('report_general',result,{placeholder:'بحث ضمن نتائج التقرير...'});const pageRows=result.items;if(!salesReportState.groupBy)return renderSmartReportRowsUnpaged(pageRows)+appListPagerHtml('report_general',result,{placeholder:'بحث ضمن نتائج التقرير...'});const groups=new Map();pageRows.forEach(q=>{const key=generalReportGroupKey(q);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q)});const grouped=[...groups.entries()].map(([key,list])=>{const m=salesReportMetrics(list);return `<div class="sales-report-group"><div class="sales-report-group-head"><b>${esc(key)}</b><div class="sales-report-group-summary"><span>${list.length} عرض بهذه الصفحة</span><span>${m.approvedCount} موافق</span><span>مبيعات ${money(m.approvedValue)}</span></div></div>${renderSmartReportRowsUnpaged(list)}</div>`}).join('');return grouped+appListPagerHtml('report_general',result,{placeholder:'بحث ضمن نتائج التقرير...'})}
function renderSmartReportRowsUnpaged(rows){if(!rows.length)return '<div class="sales-report-empty">لا يوجد نتائج مطابقة.</div>';return `<table class="list-table"><thead><tr><th>الرقم</th><th>التاريخ</th><th>العميل</th><th>مندوب المبيعات</th><th>الخدمات</th><th>الحالة</th><th>الإجمالي</th></tr></thead><tbody>${rows.map(q=>`<tr class="data" onclick="openQuote('${esc(q.id)}')"><td>${esc(q.number||'—')}</td><td>${esc(reportQuoteDate(q)||'—')}</td><td>${esc(q.customer||'—')}</td><td>${esc(q.salesperson||'—')}</td><td>${esc(reportServicesText(q))}</td><td>${esc(reportStatusLabel(reportQuoteStatus(q)))}</td><td>${money(quoteTotals(q).total)}</td></tr>`).join('')}</tbody></table>`}
function buildGeneralReportPrintableRows(rows){if(!salesReportState.groupBy){return `
   <table>
    <thead><tr><th>رقم العرض</th><th>التاريخ</th><th>العميل</th><th>مندوب المبيعات</th><th>الخدمات</th><th>الحالة</th><th>الإجمالي</th></tr></thead>
    <tbody>
     ${rows.length?rows.map(q=>`<tr>
      <td>${esc(q.number||'—')}</td>
      <td>${esc(reportQuoteDate(q)||'—')}</td>
      <td>${esc(q.customer||'—')}</td>
      <td>${esc(q.salesperson||'—')}</td>
      <td>${esc(reportServicesText(q))}</td>
      <td>${esc(reportStatusLabel(reportQuoteStatus(q)))}</td>
      <td>${money(quoteTotals(q).total)}</td>
     </tr>`).join(''):`<tr><td colspan="7" style="text-align:center;padding:28px">لا يوجد نتائج مطابقة</td></tr>`}
    </tbody>
   </table>`;}
const groups=new Map();rows.forEach(q=>{const key=generalReportGroupKey(q);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q);});return[...groups.entries()].map(([key,list])=>`
  <div style="margin-top:20px;font-weight:900;font-size:14px">${esc(generalReportGroupLabel(salesReportState.groupBy))}: ${esc(key)}</div>
  <table>
   <thead><tr><th>رقم العرض</th><th>التاريخ</th><th>العميل</th><th>مندوب المبيعات</th><th>الخدمات</th><th>الحالة</th><th>الإجمالي</th></tr></thead>
   <tbody>${list.map(q=>`<tr>
    <td>${esc(q.number||'—')}</td>
    <td>${esc(reportQuoteDate(q)||'—')}</td>
    <td>${esc(q.customer||'—')}</td>
    <td>${esc(q.salesperson||'—')}</td>
    <td>${esc(reportServicesText(q))}</td>
    <td>${esc(reportStatusLabel(reportQuoteStatus(q)))}</td>
    <td>${money(quoteTotals(q).total)}</td>
   </tr>`).join('')}</tbody>
  </table>
 `).join('');}
function reportSelectedEntityLabel(){if(salesReportState.reportType==='general')return generalReportCriteriaSummary();const q=String(salesReportState.query||'').trim();return q || `كل ${reportTypeLabel(salesReportState.reportType)}`;}
function reportPeriodLabel(){if(salesReportState.dateFrom && salesReportState.dateTo){return `من ${salesReportState.dateFrom} إلى ${salesReportState.dateTo}`;}
if(salesReportState.dateFrom)return `من ${salesReportState.dateFrom}`;if(salesReportState.dateTo)return `حتى ${salesReportState.dateTo}`;return 'كامل الفترة';}
function buildSalesReportDocument(rows){const m=salesReportMetrics(rows);const generated=new Date().toLocaleString('ar');const company=state.systemSettings?.companyName||'MOSH GROUP';return `
  <div class="report-paper">
   <div class="report-paper-head">
    <div>
     <div class="report-paper-brand">${esc(company)}</div>
     <div class="report-paper-title">${esc(reportTypeTitle(salesReportState.reportType))}</div>
    </div>
    <div class="report-paper-meta">
     <div>تاريخ الإصدار: ${esc(generated)}</div>
     <div>إعداد: ${esc(currentUserDisplayName())}</div>
    </div>
   </div>

   <div class="report-paper-info">
    <div><div class="k">نوع التقرير</div><div class="v">${esc(reportTypeLabel(salesReportState.reportType))}</div></div>
    <div><div class="k">${salesReportState.reportType==='general'?'المعايير المختارة':'الاسم / البحث'}</div><div class="v">${esc(reportSelectedEntityLabel())}</div></div>
    <div><div class="k">الفترة</div><div class="v">${esc(reportPeriodLabel())}</div></div>
   </div>

   <div class="report-paper-kpis">
    <div class="report-paper-kpi"><div class="k">إجمالي العروض</div><div class="v">${m.totalCount}</div></div>
    <div class="report-paper-kpi"><div class="k">العروض الموافقة</div><div class="v">${m.approvedCount}</div></div>
    <div class="report-paper-kpi"><div class="k">قيمة المبيعات المعتمدة</div><div class="v">${money(m.approvedValue)}</div></div>
    <div class="report-paper-kpi"><div class="k">نسبة الموافقة</div><div class="v">${m.approvalRate.toFixed(1)}%</div></div>
   </div>

   ${salesReportState.reportType==='general'?buildGeneralReportPrintableRows(rows):`
   <table>
    <thead>
     <tr>
      <th>رقم العرض</th>
      <th>التاريخ</th>
      <th>العميل</th>
      <th>مندوب المبيعات</th>
      <th>الخدمات</th>
      <th>الحالة</th>
      <th>الإجمالي</th>
     </tr>
    </thead>
    <tbody>
     ${rows.length?rows.map(q=>`
      <tr>
       <td>${esc(q.number||'—')}</td>
       <td>${esc(reportQuoteDate(q)||'—')}</td>
       <td>${esc(q.customer||'—')}</td>
       <td>${esc(q.salesperson||'—')}</td>
       <td>${esc(reportServicesText(q))}</td>
       <td>${esc(reportStatusLabel(reportQuoteStatus(q)))}</td>
       <td>${money(quoteTotals(q).total)}</td>
      </tr>
     `).join(''):`<tr><td colspan="7" style="text-align:center;padding:28px">لا يوجد نتائج مطابقة</td></tr>`}
    </tbody>
   </table>`}

   <div class="report-paper-foot">
    تقرير صادر من MOSH ERP - v185
   </div>
  </div>`;}
function openSalesReportPreview(){const rows=filterSalesReportRows();const previewRows=rows.slice(0,500);const body=document.getElementById('salesReportPreviewBody');if(body)body.innerHTML=(rows.length>500?`<div class="panel" style="margin-bottom:10px"><b>ملاحظة:</b> المعاينة تعرض أول 500 سجل فقط من ${rows.length} لتبقى سريعة. ملف الطباعة/PDF يشمل كل النتائج المطابقة.</div>`:'')+buildSalesReportDocument(previewRows);document.getElementById('salesReportPreviewModal').classList.add('show');}
function closeSalesReportPreview(){document.getElementById('salesReportPreviewModal')?.classList.remove('show');}
function printableSalesReportHtml(rows){const body=buildSalesReportDocument(rows);return `<!doctype html>
 <html lang="ar" dir="rtl">
 <head>
  <meta charset="utf-8">
  <title>${esc(reportTypeTitle(salesReportState.reportType))}</title>
  <style>
   *{box-sizing:border-box}
   body{font-family:Arial,Tahoma,sans-serif;margin:0;padding:24px;background:#fff;color:#191919;direction:rtl}
   .report-paper{background:#fff;color:#191919;padding:12px;direction:rtl}
   .report-paper-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:18px;border-bottom:2px solid #222}
   .report-paper-brand{font-weight:900;font-size:23px}
   .report-paper-title{font-weight:900;font-size:21px;margin-top:5px}
   .report-paper-meta{font-size:12px;color:#555;line-height:1.8;text-align:left}
   .report-paper-info{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}
   .report-paper-info>div,.report-paper-kpi{border:1px solid #ddd;border-radius:8px;padding:10px 12px}
   .report-paper-info .k,.report-paper-kpi .k{font-size:11px;color:#777;margin-bottom:5px}
   .report-paper-info .v{font-size:14px;font-weight:800}
   .report-paper-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}
   .report-paper-kpi .v{font-size:18px;font-weight:900;margin-top:5px}
   table{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}
   th,td{border:1px solid #ccc;padding:7px 8px;text-align:right;vertical-align:top}
   th{background:#f1f1f1;font-weight:800}
   .report-paper-foot{margin-top:24px;padding-top:12px;border-top:1px solid #ddd;color:#777;font-size:9px;text-align:center}
   @page{size:A4 landscape;margin:10mm}
   @media print{body{padding:0}}
  </style>
 </head>
 <body>${body}
</body>
 </html>`;}
function printSalesReportPdf(){const rows=filterSalesReportRows();const win=window.open('','_blank');if(!win){alert('المتصفح منع فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم جرّب مرة ثانية.');return;}
win.document.open();win.document.write(printableSalesReportHtml(rows));win.document.close();win.focus();setTimeout(()=>win.print(),350);}
function renderGeneralSalesReport(preserveFilters=false){const host=document.getElementById('salesDynamic');if(!host)return;currentSalesMode='salesreport';if(!preserveFilters){Object.assign(salesReportState,{reportType:'general',lockedType:'general',query:'',dateFrom:'',dateTo:'',status:'',customer:'',salesperson:'',service:'',salesTeam:'',quoteNumber:'',generalSearch:'',totalMin:'',totalMax:'',groupBy:''
});}else{salesReportState.reportType='general';salesReportState.lockedType='general';}
const customers=getReportCandidates('customer');const salespeople=getReportCandidates('salesperson');const services=getReportCandidates('service');const teams=getReportSalesTeams();const rows=filterSalesReportRows();document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / إعداد التقارير / إعداد تقرير مبيعات معيّن';host.innerHTML=`
  <div class="toolbar">
   <div class="toolbar-left">
    <h2 style="margin:0">إعداد تقرير مبيعات معيّن</h2>
    <span class="muted">حدد أي مجموعة معايير تريدها ثم أنشئ التقرير</span>
   </div>
   <div class="toolbar-right">
    <button class="btn" onclick="openSalesReportPreview()">معاينة التقرير</button>
    <button class="btn primary" onclick="printSalesReportPdf()">تحويل إلى PDF</button>
   </div>
  </div>

  <div class="panel" style="margin-bottom:14px">
   <div class="sales-report-filters">
    <div class="field">
     <label>بحث عام</label>
     <input value="${esc(salesReportState.generalSearch)}" placeholder="اسم، رقم عرض، عنوان، خدمة..." oninput="setGeneralReportFilter('generalSearch',this.value)">
    </div>

    <div class="field">
     <label>رقم عرض السعر</label>
     <input value="${esc(salesReportState.quoteNumber)}" placeholder="مثال: S00001" oninput="setGeneralReportFilter('quoteNumber',this.value)">
    </div>

    <div class="field">
     <label>العميل</label>
     <input list="generalReportCustomers" value="${esc(salesReportState.customer)}" placeholder="كل العملاء" oninput="setGeneralReportFilter('customer',this.value)">
     <datalist id="generalReportCustomers">${generalReportDatalistOptions(customers)}</datalist>
    </div>

    <div class="field">
     <label>مندوب المبيعات</label>
     <input list="generalReportSalespeople" value="${esc(salesReportState.salesperson)}" placeholder="كل المندوبين" oninput="setGeneralReportFilter('salesperson',this.value)">
     <datalist id="generalReportSalespeople">${generalReportDatalistOptions(salespeople)}</datalist>
    </div>

    <div class="field">
     <label>الخدمة</label>
     <input list="generalReportServices" value="${esc(salesReportState.service)}" placeholder="كل الخدمات" oninput="setGeneralReportFilter('service',this.value)">
     <datalist id="generalReportServices">${generalReportDatalistOptions(services)}</datalist>
    </div>

    <div class="field">
     <label>فريق المبيعات</label>
     <input list="generalReportTeams" value="${esc(salesReportState.salesTeam)}" placeholder="كل الفرق" oninput="setGeneralReportFilter('salesTeam',this.value)">
     <datalist id="generalReportTeams">${generalReportDatalistOptions(teams)}</datalist>
    </div>

    <div class="field">
     <label>الحالة</label>
     <select onchange="setGeneralReportFilter('status',this.value)">
      <option value="">كل الحالات</option>
      <option value="open" ${salesReportState.status==='open'?'selected':''}>عرض سعر</option>
      <option value="approved" ${salesReportState.status==='approved'?'selected':''}>عرض سعر موافق</option>
      <option value="cancelled" ${salesReportState.status==='cancelled'?'selected':''}>عرض سعر ملغي</option>
     </select>
    </div>

    <div class="field">
     <label>من تاريخ</label>
     <input type="date" value="${esc(salesReportState.dateFrom)}" onchange="setGeneralReportFilter('dateFrom',this.value)">
    </div>

    <div class="field">
     <label>إلى تاريخ</label>
     <input type="date" value="${esc(salesReportState.dateTo)}" onchange="setGeneralReportFilter('dateTo',this.value)">
    </div>

    <div class="field">
     <label>الإجمالي من</label>
     <input type="number" min="0" step="0.01" value="${esc(salesReportState.totalMin)}" placeholder="0" oninput="setGeneralReportFilter('totalMin',this.value)">
    </div>

    <div class="field">
     <label>الإجمالي إلى</label>
     <input type="number" min="0" step="0.01" value="${esc(salesReportState.totalMax)}" placeholder="بدون حد" oninput="setGeneralReportFilter('totalMax',this.value)">
    </div>

    <div class="field">
     <label>تجميع حسب</label>
     <select onchange="setGeneralReportFilter('groupBy',this.value)">
      <option value="" ${!salesReportState.groupBy?'selected':''}>بدون تجميع</option>
      <option value="customer" ${salesReportState.groupBy==='customer'?'selected':''}>العميل</option>
      <option value="salesperson" ${salesReportState.groupBy==='salesperson'?'selected':''}>مندوب المبيعات</option>
      <option value="service" ${salesReportState.groupBy==='service'?'selected':''}>الخدمة</option>
      <option value="status" ${salesReportState.groupBy==='status'?'selected':''}>الحالة</option>
      <option value="salesTeam" ${salesReportState.groupBy==='salesTeam'?'selected':''}>فريق المبيعات</option>
      <option value="month" ${salesReportState.groupBy==='month'?'selected':''}>الشهر</option>
     </select>
    </div>
   </div>

   <div class="sales-report-actions" style="margin-top:14px">
    <button class="btn primary" onclick="applyGeneralSalesReport()">إنشاء التقرير</button>
    <button class="btn" onclick="resetGeneralSalesReport()">مسح المعايير</button>
    <span class="muted">يمكنك استخدام معيار واحد أو عدة معايير معًا.</span>
   </div>
  </div>

  ${renderSmartReportMetrics(rows)}

  <div class="panel">
   <div class="toolbar" style="padding:10px 12px;margin:0">
    <div class="toolbar-left">
     <h3 style="margin:0">نتائج التقرير</h3>
     <span class="muted">${rows.length} نتيجة</span>
    </div>
    <div class="toolbar-right">
     ${salesReportState.groupBy?`<span class="muted">مجمّع حسب: ${esc(generalReportGroupLabel(salesReportState.groupBy))}</span>`:''}
    </div>
   </div>
   ${renderGeneralReportRows(rows)}
  </div>`;}
function renderSalesReport(defaultType='customer',preserveType=false){const host=document.getElementById('salesDynamic');if(!host)return;currentSalesMode='salesreport';if(!preserveType){salesReportState.customer='';salesReportState.salesperson='';salesReportState.service='';salesReportState.salesTeam='';salesReportState.quoteNumber='';salesReportState.generalSearch='';salesReportState.totalMin='';salesReportState.totalMax='';salesReportState.groupBy='';if(defaultType==='salesperson'||defaultType==='service'||defaultType==='customer'){salesReportState.reportType=defaultType;salesReportState.lockedType=defaultType;}else{salesReportState.reportType='customer';salesReportState.lockedType='customer';}
salesReportState.query='';}
const candidates=getReportCandidates(salesReportState.reportType);const rows=filterSalesReportRows();const listId='smartReportCandidates';document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / إعداد التقارير';const placeholder={customer:'اكتب اسم العميل...',salesperson:'اكتب اسم مندوب المبيعات...',service:'اكتب اسم الخدمة...'
}[salesReportState.reportType];const fixedTitle={customer:'تقرير مبيعات حسب العميل',salesperson:'تقرير مبيعات حسب مندوب المبيعات',service:'تقرير مبيعات حسب الخدمة'
}[salesReportState.reportType];host.innerHTML=`
  <div class="toolbar">
   <div class="toolbar-left">
    <h2 style="margin:0">${esc(fixedTitle)}</h2>
    <span class="muted">اكتب الاسم لعرض التقرير مباشرة</span>
   </div>
   <div class="toolbar-right">
    <button class="btn" onclick="openSalesReportPreview()">معاينة التقرير</button>
    <button class="btn primary" onclick="printSalesReportPdf()">تحويل إلى PDF</button>
   </div>
  </div>

  <div class="panel" style="margin-bottom:14px">
   <div class="smart-report-search" style="grid-template-columns:minmax(320px,1fr) auto">
    <div class="field">
     <label>${esc(reportTypeLabel(salesReportState.reportType))}</label>
     <input list="${listId}" value="${esc(salesReportState.query)}" placeholder="${esc(placeholder)}" oninput="setSmartReportQuery(this.value)" autocomplete="off">
     <datalist id="${listId}">
      ${candidates.map(v=>`<option value="${esc(v)}"></option>`).join('')}
     </datalist>
    </div>

    <div class="smart-report-actions">
     <button class="btn" onclick="resetSmartReport()">مسح</button>
    </div>
   </div>

   <div class="smart-report-hint">
    اكتب جزءًا من الاسم أو اختر الاسم الكامل من الاقتراحات. التقرير يتحدث مباشرة أثناء الكتابة.
   </div>

   <div class="smart-report-secondary">
    <div class="field">
     <label>من تاريخ</label>
     <input type="date" value="${esc(salesReportState.dateFrom)}" onchange="setSmartReportFilter('dateFrom',this.value)">
    </div>
    <div class="field">
     <label>إلى تاريخ</label>
     <input type="date" value="${esc(salesReportState.dateTo)}" onchange="setSmartReportFilter('dateTo',this.value)">
    </div>
    <div class="field">
     <label>الحالة</label>
     <select onchange="setSmartReportFilter('status',this.value)">
      <option value="">كل الحالات</option>
      <option value="open" ${salesReportState.status==='open'?'selected':''}>عرض سعر</option>
      <option value="approved" ${salesReportState.status==='approved'?'selected':''}>عرض سعر موافق</option>
      <option value="cancelled" ${salesReportState.status==='cancelled'?'selected':''}>عرض سعر ملغي</option>
     </select>
    </div>
   </div>
  </div>

  ${renderSmartReportMetrics(rows)}

  <div class="panel">
   <div class="toolbar" style="padding:10px 12px;margin:0">
    <div class="toolbar-left">
     <h3 style="margin:0">${esc(fixedTitle)}</h3>
     <span class="muted">${rows.length} نتيجة</span>
    </div>
   </div>
   ${renderSmartReportRows(rows,'report_specific')}
  </div>`;}
const APP_LIST_DEFAULT_PAGE_SIZE=10;const APP_LIST_PAGE_SIZES=[10,20,30];const appListStates={};const appListSearchTimers={};function getAppListState(key){if(!appListStates[key])appListStates[key]={page:1,pageSize:APP_LIST_DEFAULT_PAGE_SIZE,search:''};return appListStates[key]}
function resetAppListPage(key){getAppListState(key).page=1}
function filterAndPageAppList(key,items,textFn=null){const st=getAppListState(key),source=Array.isArray(items)?items:[],query=String(st.search||'').trim().toLocaleLowerCase();let filtered=source;if(query&&typeof textFn==='function')filtered=source.filter(item=>String(textFn(item)||'').toLocaleLowerCase().includes(query));const total=filtered.length,totalPages=Math.max(1,Math.ceil(total/st.pageSize));if(st.page>totalPages)st.page=totalPages;if(st.page<1)st.page=1;const start=(st.page-1)*st.pageSize,end=Math.min(start+st.pageSize,total);return{items:filtered.slice(start,end),filtered,total,rawTotal:source.length,page:st.page,pageSize:st.pageSize,totalPages,start,end}}
function setAppListPage(key,page){getAppListState(key).page=Math.max(1,Number(page)||1);refreshPagedAppView(key)}
function setAppListPageSize(key,size){const st=getAppListState(key),parsed=Number(size)||APP_LIST_DEFAULT_PAGE_SIZE;st.pageSize=APP_LIST_PAGE_SIZES.includes(parsed)?parsed:APP_LIST_DEFAULT_PAGE_SIZE;st.page=1;refreshPagedAppView(key)}
function queueAppListSearch(key,value){const st=getAppListState(key);st.search=String(value||'');st.page=1;clearTimeout(appListSearchTimers[key]);appListSearchTimers[key]=setTimeout(()=>refreshPagedAppView(key),220)}
function clearAppListSearch(key){const st=getAppListState(key);st.search='';st.page=1;refreshPagedAppView(key)}
function appListPagerHtml(key,result,{search=true,placeholder='بحث...'}={}){const st=getAppListState(key),first=result.total?result.start+1:0,last=result.end;return `<div class="app-list-performance-bar"><div class="app-list-performance-left">${search?`<input class="app-list-search" value="${esc(st.search||'')}" placeholder="${esc(placeholder)}" oninput="queueAppListSearch('${esc(key)}',this.value)">${st.search?`<button class="btn" onclick="clearAppListSearch('${esc(key)}')">مسح البحث</button>`:''}`:''}<span class="app-page-info">عرض ${first}-${last} من ${result.total}${result.rawTotal!==result.total?` (من أصل ${result.rawTotal})`:''}</span></div><div class="app-list-performance-right"><span class="performance-note">عدد السجلات بالصفحة</span><select class="app-page-size" onchange="setAppListPageSize('${esc(key)}',this.value)">${APP_LIST_PAGE_SIZES.map(n=>`<option value="${n}" ${st.pageSize===n?'selected':''}>${n}</option>`).join('')}</select><div class="app-pager"><button class="btn" ${result.page<=1?'disabled':''} onclick="setAppListPage('${esc(key)}',1)">الأولى</button><button class="btn" ${result.page<=1?'disabled':''} onclick="setAppListPage('${esc(key)}',${Math.max(1,result.page-1)})">السابق</button><span class="app-pager-page">صفحة ${result.page} / ${result.totalPages}</span><button class="btn" ${result.page>=result.totalPages?'disabled':''} onclick="setAppListPage('${esc(key)}',${Math.min(result.totalPages,result.page+1)})">التالي</button><button class="btn" ${result.page>=result.totalPages?'disabled':''} onclick="setAppListPage('${esc(key)}',${result.totalPages})">الأخيرة</button></div></div></div>`}
function refreshPagedAppView(key){if(key==='purchase_requests')return renderSupportRequestsPage('purchase');if(key==='logistics_requests')return renderSupportRequestsPage('logistics');if(key==='hr_staff')return renderStaffWorkflowConfig();if(key.startsWith('prod_')){const m=key.match(/^prod_([^_]+)_(distribution|running)$/);if(m){return m[2]==='running'?renderProductiveRunningTasks(m[1]):renderProductiveDistributionBoard(m[1])}}if(key==='quotes')return renderQuotationList(false);if(key==='orders')return renderOrdersList(false);if(key==='cancelledquotes')return renderCancelledQuotesList(false);if(key==='customers')return salesList('customergroup');if(key==='editcustomers')return renderEditCustomerList();if(key==='services')return renderServiceList();if(key==='editservices')return renderEditServiceList();if(key==='servicecontracts')return renderServiceContracts();if(key==='alltasks')return renderAllTasks();if(key==='billingtasks')return renderBillingTasks();if(key==='invoices')return renderInvoices();if(key==='archive_tasks')return renderArchivedTasks();if(key==='archive')return renderArchive();if(key==='report_general')return renderGeneralSalesReport(true);if(key==='report_specific')return renderSalesReport(salesReportState.reportType,true);if(key.startsWith('dept|')){const parts=key.split('|'),containerId=parts[1]||'',department=decodeURIComponent(parts.slice(2).join('|')||'');return renderDepartmentTasks(department,containerId)}}
function salesList(type){if(['newcustomer','editcustomer'].includes(type)&&!hasPermission(type==='newcustomer'?'createCustomers':'editCustomers')){alert('حسابك لا يملك صلاحية '+(type==='newcustomer'?'إضافة':'تعديل')+' العملاء.');return;}document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('show'));currentSalesMode=type;if(type==='quotes'){renderQuotationList();return}
if(type==='orders'){renderOrdersList();return}
if(type==='cancelledquotes'){renderCancelledQuotesList();return}
const names={teams:'فرق المبيعات',customers:'العملاء',customergroup:'قائمة العملاء',newcustomer:'إضافة عميل جديد',editcustomer:'تعديل معلومات عميل',newservice:'إضافة خدمة',editservice:'تعديل خدمة',servicelist:'قائمة الخدمات',salesreport:'إعداد تقرير مبيعات معيّن',customerreport:'تقرير حسب العملاء',salespeople:'تقرير حسب مندوبي المبيعات',productsreport:'تقرير حسب الخدمات',newsalesperson:'إضافة مندوب مبيعات',quotetemplates:'خيارات قوالب عرض السعر',servicecontracts:'عقد بيع خدمات موش غروب',salesteamscfg:'فرق المبيعات'};document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / '+names[type];const isCustomerTool=type==='newcustomer'||type==='editcustomer'||type==='newservice'||type==='editservice'||type==='servicelist';if(type==='newsalesperson'){renderNewSalespersonForm();return;}
if(type==='quotetemplates'){renderQuoteTemplatesConfig();return;}
if(type==='servicecontracts'){renderServiceContracts();return;}
if(type==='salesteamscfg'){renderSalesTeamsConfig();return;}
if(type==='newcustomer'){renderNewCustomerForm();return;}
if(type==='editcustomer'){renderEditCustomerList();return;}
if(type==='newservice'){renderNewServiceForm();return;}
if(type==='editservice'){renderEditServiceList();return;}
if(type==='servicelist'){renderServiceList();return;}
if(type==='salesreport'){renderGeneralSalesReport();return;}
if(type==='customerreport'){renderSalesReport('customer');return;}
if(type==='salespeople'){renderSalesReport('salesperson');return;}
if(type==='productsreport'){renderSalesReport('service');return;}
if(type==='customergroup'){const allCustomers=(customersCatalog||[]).filter(c=>c.active!==false),result=filterAndPageAppList('customers',allCustomers,c=>[c.name,c.legalName,c.contact,c.phone,c.whatsapp,c.email,c.city,c.salesperson,c.source].join(' ')),customers=result.items;document.getElementById('salesDynamic').innerHTML=`<div class="panel"><div class="toolbar" style="padding:12px;margin:0"><div class="toolbar-left"><h3 style="margin:0">قائمة العملاء</h3><button type="button" class="btn" onclick="MoshR29.openCustomers('archived')">عملاء سابقون</button><span class="muted">${result.total} عميل</span></div></div>${customers.length?`<table class="list-table"><thead><tr><th>تسلسل</th><th>اسم العميل</th></tr></thead><tbody>${customers.map((c,i)=>`<tr onclick="renderCustomerDetails('${esc(c.id||'')}')" style="cursor:pointer"><td>${result.start+i+1}</td><td><div class="customer-list-name">${esc(MoshCustomerNames36.display(c)||'—')}</div></td></tr>`).join('')}</tbody></table>`:`<div class="empty">لا يوجد عملاء مطابقين.</div>`}${appListPagerHtml('customers',result,{placeholder:'بحث باسم العميل أو جهة التواصل...'})}</div>`;return;}
document.getElementById('salesDynamic').innerHTML=`
 <div class="panel">
  <div class="toolbar" style="padding:12px;margin:0">
   <div class="toolbar-left">
    ${isCustomerTool?'':`<button class="btn primary">+ جديد</button>`}
    <h3 style="margin:0">${names[type]}</h3>
   </div>
  </div>
  <div class="empty">${'القسم مُدرج في الهيكل التنظيمي. ستُستكمل تفاصيله في المرحلة المخصصة له.'}</div>
 </div>`;}
function nextConfigId(list,prefix){let max=0;(list||[]).forEach(item=>{const m=String(item.id||'').match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1])||0);});return prefix+'/'+String(max+1).padStart(5,'0');}
function activeSalespeople(){return(state.salespeople||[]).filter(p=>p.active!==false);}
function activeSalesTeams(){return(state.salesTeamsCfg||[]).filter(t=>t.active!==false);}
function quoteTemplateStyleLabel(style){return{official:'رسمي',compact:'مختصر',detailed:'تفصيلي'}[style]||'رسمي';}
function defaultQuoteTemplate(){return activeQuoteTemplates().find(t=>t.isDefault)||activeQuoteTemplates()[0]||null;}
function getQuoteTemplateOption(name){return(state.quoteTemplates||[]).find(t=>t.name===name)||defaultQuoteTemplate();}
function quoteTemplateSelectOptions(selected){return `<option value="">بدون قالب</option>`+activeQuoteTemplates().map(t=>`<option value="${esc(t.name)}" ${String(selected||'')===String(t.name)?'selected':''}>${esc(t.name)} — ${esc(quoteTemplateStyleLabel(t.style))}${t.isDefault?' ★':''}</option>`).join('');}
function activeQuoteTemplates(){return(state.quoteTemplates||[]).filter(t=>t.active!==false);}
function salespersonDatalistOptions(){return activeSalespeople().map(p=>`<option value="${esc(p.name||'')}"></option>`).join('');}
function salesTeamDatalistOptions(){return activeSalesTeams().map(t=>`<option value="${esc(t.name||'')}"></option>`).join('');}
function quoteTemplateDatalistOptions(){return activeQuoteTemplates().map(t=>`<option value="${esc(t.name||'')}"></option>`).join('');}
function renderNewSalespersonForm(){const host=document.getElementById('salesDynamic');if(!host)return;document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / التهيئة / إضافة مندوب مبيعات';const teams=activeSalesTeams();host.innerHTML=`
  <div class="toolbar">
   <div class="toolbar-left">
    <h2 style="margin:0">إضافة مندوب مبيعات</h2>
    <span class="muted">تعريف المندوب لاستخدامه بعروض الأسعار والتقارير</span>
   </div>
  </div>

  <div class="panel">
   <div class="customer-form-section" style="margin-top:0">
    <h4>بيانات المندوب</h4>
    <div class="customer-form-grid">
     <div class="field">
      <label>اسم المندوب <span class="customer-required">*</span></label>
      <input id="cfgSalespersonName" placeholder="الاسم الكامل">
     </div>
     <div class="field">
      <label>المسمى الوظيفي</label>
      <input id="cfgSalespersonJobTitle" value="مندوب مبيعات">
     </div>
     <div class="field">
      <label>رقم الهاتف</label>
      <input id="cfgSalespersonPhone" placeholder="+963 ...">
     </div>
     <div class="field">
      <label>البريد الإلكتروني</label>
      <input id="cfgSalespersonEmail" type="email" placeholder="name@moshgroup.com">
     </div>
     <div class="field">
      <label>فريق المبيعات</label>
      <select id="cfgSalespersonTeam">
       <option value="">بدون تحديد</option>
       ${teams.map(t=>`<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('')}
      </select>
     </div>
     <div class="field">
      <label>الحالة</label>
      <select id="cfgSalespersonActive">
       <option value="1">نشط</option>
       <option value="0">غير نشط</option>
      </select>
     </div>
     <div class="field" style="grid-column:1/-1">
      <label>ملاحظات داخلية</label>
      <textarea id="cfgSalespersonNotes" rows="4"></textarea>
     </div>
    </div>
   </div>
   <div class="customer-form-actions">
    <button class="btn primary" onclick="saveSalespersonConfig()">حفظ المندوب</button>
    <button class="btn" onclick="renderNewSalespersonForm()">تفريغ الحقول</button>
   </div>
  </div>

  <div class="panel" style="margin-top:14px">
   <div class="toolbar" style="padding:12px;margin:0">
    <div class="toolbar-left">
     <h3 style="margin:0">المندوبون الموجودون</h3>
     <span class="muted">${(state.salespeople||[]).length} مندوب</span>
    </div>
   </div>
   ${(state.salespeople||[]).length?`
   <table class="list-table">
    <thead><tr><th>الاسم</th><th>المسمى</th><th>الفريق</th><th>الهاتف</th><th>الحالة</th><th></th></tr></thead>
    <tbody>${(state.salespeople||[]).map(p=>`
     <tr>
      <td><b>${esc(p.name||'—')}</b></td>
      <td>${esc(p.jobTitle||'—')}</td>
      <td>${esc(p.salesTeam||'—')}</td>
      <td>${esc(p.phone||'—')}</td>
      <td>${p.active===false?'غير نشط':'نشط'}</td><td><button class="btn danger" onclick="deleteSalespersonConfig('${esc(p.id)}')">حذف</button></td>
     </tr>`).join('')}</tbody>
   </table>`:`<div class="empty">لا يوجد مندوبون مضافون حتى الآن.</div>`}
  </div>`;document.getElementById('cfgSalespersonName')?.focus();}
function saveSalespersonConfig(){const get=id=>document.getElementById(id);const name=(get('cfgSalespersonName')?.value||'').trim();const email=(get('cfgSalespersonEmail')?.value||'').trim();if(!name){alert('اسم مندوب المبيعات إجباري.');get('cfgSalespersonName')?.focus();return;}
const duplicate=(state.salespeople||[]).find(p=>String(p.name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase());if(duplicate){alert('هذا المندوب موجود مسبقًا.');return;}
if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert('البريد الإلكتروني غير صحيح.');get('cfgSalespersonEmail')?.focus();return;}
const salesperson={id:nextConfigId(state.salespeople,'SP'),name,jobTitle:(get('cfgSalespersonJobTitle')?.value||'').trim()||'مندوب مبيعات',phone:(get('cfgSalespersonPhone')?.value||'').trim(),email,salesTeam:get('cfgSalespersonTeam')?.value||'',active:get('cfgSalespersonActive')?.value!=='0',notes:(get('cfgSalespersonNotes')?.value||'').trim(),createdAt:new Date().toISOString(),createdBy:currentUserDisplayName()
};pushAppUndo();state.salespeople.push(salesperson);if(salesperson.salesTeam){const team=(state.salesTeamsCfg||[]).find(t=>t.name===salesperson.salesTeam);if(team){if(!Array.isArray(team.members))team.members=[];if(!team.members.includes(salesperson.name))team.members.push(salesperson.name);}
}
save();renderNewSalespersonForm();}
async function deleteSalespersonConfig(id){const person=(state.salespeople||[]).find(p=>String(p.id)===String(id));if(!person||!confirm('حذف مندوب المبيعات؟'))return;pushAppUndo();state.salespeople=state.salespeople.filter(p=>String(p.id)!==String(id));(state.salesTeamsCfg||[]).forEach(t=>{t.members=(t.members||[]).filter(n=>n!==person.name);if(t.leader===person.name)t.leader='';});try{await save();}catch(_){return;}renderNewSalespersonForm();}
function renderQuoteTemplatesConfig(){const host=document.getElementById('salesDynamic');if(!host)return;const templates=state.quoteTemplates||[];document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / التهيئة / خيارات قوالب عرض السعر';host.innerHTML=`
  <div class="toolbar">
   <div class="toolbar-left">
    <h2 style="margin:0">خيارات قوالب عرض السعر</h2>
    <span class="muted">خيارات جاهزة تظهر داخل عرض السعر ويمكن تحديد قالب افتراضي</span>
   </div>
  </div>

  <div class="panel">
   <div class="customer-form-section" style="margin-top:0">
    <h4>إضافة خيار قالب</h4>
    <div class="customer-form-grid">
     <div class="field"><label>اسم الخيار <span class="customer-required">*</span></label><input id="cfgTemplateName" placeholder="مثال: عرض رسمي للشركات"></div>
     <div class="field"><label>شكل القالب</label><select id="cfgTemplateStyle"><option value="official">رسمي</option><option value="compact">مختصر</option><option value="detailed">تفصيلي</option></select></div>
     <div class="field"><label>مدة الصلاحية الافتراضية</label><input id="cfgTemplateValidity" type="number" min="0" step="1" placeholder="عدد الأيام"></div>
     <div class="field"><label>الحالة</label><select id="cfgTemplateActive"><option value="1">نشط</option><option value="0">غير نشط</option></select></div>
     <div class="field"><label>القالب الافتراضي</label><select id="cfgTemplateDefault"><option value="0">لا</option><option value="1">نعم</option></select></div>
     <div class="field" style="grid-column:1/-1"><label>نص ختامي افتراضي</label><textarea id="cfgTemplateNotes" rows="4"></textarea></div>
    </div>
   </div>
   <div class="customer-form-actions"><button class="btn primary" onclick="saveQuoteTemplateConfig()">حفظ خيار القالب</button></div>
  </div>

  <div class="panel" style="margin-top:14px">
   <div class="toolbar" style="padding:12px;margin:0"><div class="toolbar-left"><h3 style="margin:0">الخيارات الموجودة</h3><span class="muted">${templates.length} خيار</span></div></div>
   <div class="quote-template-cards" style="padding:12px">
    ${templates.map(t=>`
     <div class="quote-template-card ${t.isDefault?'default':''}">
      <h4>${esc(t.name||'—')}</h4>
      <div style="margin-bottom:10px">
       <span class="quote-template-badge">${esc(quoteTemplateStyleLabel(t.style))}</span>
       ${t.isDefault?'<span class="quote-template-badge gold">افتراضي</span>':''}
       <span class="quote-template-badge">${t.active===false?'غير نشط':'نشط'}</span>
      </div>
      <div class="muted" style="font-size:12px">${t.validityDays?`صلاحية: ${esc(t.validityDays)} يوم`:''}</div>
      <div style="display:flex;gap:7px;margin-top:12px;flex-wrap:wrap">
       ${!t.isDefault&&t.active!==false?`<button class="btn" onclick="setDefaultQuoteTemplate('${esc(t.id)}')">تعيين افتراضي</button>`:''}
       <button class="btn" onclick="toggleQuoteTemplateActive('${esc(t.id)}')">${t.active===false?'تفعيل':'إيقاف'}</button>
       <button class="btn danger" onclick="deleteQuoteTemplateConfig('${esc(t.id)}')">حذف</button>
      </div>
     </div>`).join('')}
   </div>
  </div>`;}
function saveQuoteTemplateConfig(){const get=id=>document.getElementById(id);const name=(get('cfgTemplateName')?.value||'').trim();if(!name){alert('اسم خيار القالب إجباري.');return}
if((state.quoteTemplates||[]).some(t=>String(t.name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase())){alert('يوجد خيار قالب بهذا الاسم مسبقًا.');return;}
const makeDefault=get('cfgTemplateDefault')?.value==='1';pushAppUndo();if(makeDefault)(state.quoteTemplates||[]).forEach(t=>t.isDefault=false);state.quoteTemplates.push({id:nextConfigId(state.quoteTemplates,'QTPL'),name,style:get('cfgTemplateStyle')?.value||'official',validityDays:(get('cfgTemplateValidity')?.value||'').trim(),defaultNotes:(get('cfgTemplateNotes')?.value||'').trim(),isDefault:makeDefault,active:get('cfgTemplateActive')?.value!=='0',createdAt:new Date().toISOString(),createdBy:currentUserDisplayName()
});if(!(state.quoteTemplates||[]).some(t=>t.isDefault&&t.active!==false)){const first=(state.quoteTemplates||[]).find(t=>t.active!==false);if(first)first.isDefault=true;}
save();renderQuoteTemplatesConfig();}
async function deleteQuoteTemplateConfig(id){const t=(state.quoteTemplates||[]).find(x=>String(x.id)===String(id));if(!t||!confirm('حذف خيار قالب عرض السعر؟'))return;pushAppUndo();state.quoteTemplates=state.quoteTemplates.filter(x=>String(x.id)!==String(id));if(t.isDefault){const first=state.quoteTemplates.find(x=>x.active!==false);if(first)first.isDefault=true;}try{await save();}catch(_){return;}renderQuoteTemplatesConfig();}
function setDefaultQuoteTemplate(id){const t=(state.quoteTemplates||[]).find(x=>String(x.id)===String(id));if(!t||t.active===false)return;pushAppUndo();(state.quoteTemplates||[]).forEach(x=>x.isDefault=String(x.id)===String(id));save();renderQuoteTemplatesConfig();}
function toggleQuoteTemplateActive(id){const t=(state.quoteTemplates||[]).find(x=>String(x.id)===String(id));if(!t)return;pushAppUndo();t.active=t.active===false;if(t.active===false&&t.isDefault){t.isDefault=false;const first=(state.quoteTemplates||[]).find(x=>x.active!==false&&String(x.id)!==String(id));if(first)first.isDefault=true;}
save();renderQuoteTemplatesConfig();}
function renderSalesTeamsConfig(){const host=document.getElementById('salesDynamic');if(!host)return;document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / التهيئة / فرق المبيعات';const people=activeSalespeople();host.innerHTML=`
  <div class="toolbar">
   <div class="toolbar-left">
    <h2 style="margin:0">فرق المبيعات</h2>
    <span class="muted">إنشاء فريق وتحديد قائده وأعضائه</span>
   </div>
  </div>

  <div class="panel">
   <div class="customer-form-section" style="margin-top:0">
    <h4>إضافة فريق مبيعات</h4>
    <div class="customer-form-grid">
     <div class="field">
      <label>اسم الفريق <span class="customer-required">*</span></label>
      <input id="cfgTeamName" placeholder="مثال: فريق الشركات">
     </div>
     <div class="field">
      <label>قائد الفريق</label>
      <select id="cfgTeamLeader">
       <option value="">بدون تحديد</option>
       ${people.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}
      </select>
     </div>
     <div class="field">
      <label>الحالة</label>
      <select id="cfgTeamActive"><option value="1">نشط</option><option value="0">غير نشط</option></select>
     </div>
     <div class="field" style="grid-column:1/-1">
      <label>أعضاء الفريق</label>
      <select id="cfgTeamMembers" multiple size="${Math.max(4,Math.min(8,people.length||4))}">
       ${people.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}
      </select>
      <div class="muted" style="font-size:11px;margin-top:5px">يمكن اختيار أكثر من مندوب.</div>
     </div>
     <div class="field" style="grid-column:1/-1">
      <label>ملاحظات داخلية</label>
      <textarea id="cfgTeamNotes" rows="4"></textarea>
     </div>
    </div>
   </div>
   <div class="customer-form-actions"><button class="btn primary" onclick="saveSalesTeamConfig()">حفظ الفريق</button></div>
  </div>

  <div class="panel" style="margin-top:14px">
   <div class="toolbar" style="padding:12px;margin:0">
    <div class="toolbar-left"><h3 style="margin:0">الفرق الموجودة</h3><span class="muted">${(state.salesTeamsCfg||[]).length} فريق</span></div>
   </div>
   ${(state.salesTeamsCfg||[]).length?`
   <table class="list-table">
    <thead><tr><th>اسم الفريق</th><th>قائد الفريق</th><th>عدد الأعضاء</th><th>الحالة</th><th></th></tr></thead>
    <tbody>${(state.salesTeamsCfg||[]).map(t=>`
     <tr><td><b>${esc(t.name||'—')}</b></td><td>${esc(t.leader||'—')}</td><td>${Array.isArray(t.members)?t.members.length:0}</td><td>${t.active===false?'غير نشط':'نشط'}</td><td><button class="btn danger" onclick="deleteSalesTeamConfig('${esc(t.id)}')">حذف</button></td></tr>
    `).join('')}</tbody>
   </table>`:`<div class="empty">لا يوجد فرق مبيعات مضافة حتى الآن.</div>`}
  </div>`;document.getElementById('cfgTeamName')?.focus();}
function saveSalesTeamConfig(){const get=id=>document.getElementById(id);const name=(get('cfgTeamName')?.value||'').trim();if(!name){alert('اسم فريق المبيعات إجباري.');get('cfgTeamName')?.focus();return;}
const duplicate=(state.salesTeamsCfg||[]).find(t=>String(t.name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase());if(duplicate){alert('يوجد فريق مبيعات بهذا الاسم مسبقًا.');return;}
const members=[...(get('cfgTeamMembers')?.selectedOptions||[])].map(o=>o.value);const leader=get('cfgTeamLeader')?.value||'';if(leader && !members.includes(leader))members.unshift(leader);const team={id:nextConfigId(state.salesTeamsCfg,'TEAM'),name,leader,members,active:get('cfgTeamActive')?.value!=='0',notes:(get('cfgTeamNotes')?.value||'').trim(),createdAt:new Date().toISOString(),createdBy:currentUserDisplayName()
};pushAppUndo();state.salesTeamsCfg.push(team);(state.salespeople||[]).forEach(p=>{if(members.includes(p.name))p.salesTeam=name;});save();renderSalesTeamsConfig();}
async function deleteSalesTeamConfig(id){const team=(state.salesTeamsCfg||[]).find(t=>String(t.id)===String(id));if(!team||!confirm('حذف فريق المبيعات؟'))return;pushAppUndo();state.salesTeamsCfg=state.salesTeamsCfg.filter(t=>String(t.id)!==String(id));(state.salespeople||[]).forEach(p=>{if(p.salesTeam===team.name)p.salesTeam='';});try{await save();}catch(_){return;}renderSalesTeamsConfig();}
let workingServiceContract=null;let currentServiceContractId=null;function nextServiceContractNumber(){let max=0;(state.serviceContracts||[]).forEach(c=>{const m=String(c.contractNumber||c.id||'').match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1])||0);});return 'MSC/'+String(max+1).padStart(5,'0');}
function blankServiceContract(){const n=nextServiceContractNumber();return{id:n,contractNumber:n,contractTitle:'عقد بيع خدمات MOSH GROUP',customer:'',customerRepresentative:'',customerRepresentativeTitle:'',moshRepresentative:currentUserDisplayName(),status:'draft',startDate:'',endDate:'',autoRenew:false,renewalPeriod:'سنة',noticeDays:'30',currency:'USD',billingCycle:'شهري',paymentDueDays:'30',taxRate:0,lines:[],scopeText:'يحدد هذا العقد نطاق الخدمات التي تقدمها MOSH GROUP للعميل وفق الخدمات والمخرجات المعتمدة والمبينة في هذا العقد.',moshObligations:'تلتزم MOSH GROUP بتنفيذ الخدمات المتفق عليها بمهنية وضمن النطاق والمدة المحددين، وإبلاغ العميل بأي مستجدات جوهرية تؤثر على التنفيذ.',clientObligations:'يلتزم العميل بتوفير المعلومات والاعتمادات والموافقات اللازمة للتنفيذ في الوقت المناسب، وسداد المستحقات وفق الآلية المتفق عليها.',confidentiality:'يلتزم الطرفان بالمحافظة على سرية المعلومات والملفات والبيانات غير المتاحة للعامة التي يتم تبادلها بسبب هذا العقد.',intellectualProperty:'تحدد حقوق استخدام وتسليم الأعمال والمخرجات وفق ما هو متفق عليه لكل خدمة، ولا تنتقل حقوق غير منصوص عليها صراحة إلا بموافقة مكتوبة.',termination:'يجوز إنهاء العقد وفق إشعار خطي متفق عليه، مع تسوية قيمة الأعمال والخدمات المنفذة والمستحقات حتى تاريخ الإنهاء.',forceMajeure:'لا يعد أي طرف مسؤولاً عن التأخير الناتج مباشرة عن ظروف قاهرة خارجة عن السيطرة المعقولة، على أن يتم إشعار الطرف الآخر عند وقوعها.',disputes:'يسعى الطرفان أولاً إلى تسوية أي خلاف ودياً، وفي حال تعذر ذلك يتم الرجوع إلى الجهة المختصة وفق ما يتم اعتماده في النسخة النهائية من العقد.',additionalTerms:'',clientSignatory:'',clientSignatoryTitle:'',moshSignatory:currentUserDisplayName(),moshSignatoryTitle:'',createdAt:'',createdBy:'',updatedAt:'',updatedBy:''
};}
function contractStatusLabel(s){return{draft:'مسودة',active:'ساري',expired:'منتهي',cancelled:'ملغي'}[s]||s||'—'}
function contractSubtotal(c){return(c.lines||[]).reduce((sum,l)=>sum+(Number(l.qty)||0)*(Number(l.price)||0),0)}
function contractTax(c){return contractSubtotal(c)*(Number(c.taxRate)||0)/100}
function contractTotal(c){return contractSubtotal(c)+contractTax(c)}
function contractSearchText(c){return[c.contractNumber,c.contractTitle,c.customer,c.customerRepresentative,c.moshRepresentative,contractStatusLabel(c.status),c.startDate,c.endDate,...(c.lines||[]).flatMap(l=>[l.service,l.description])].join(' ')}
function contractsExpiringSoon(){const now=new Date(),max=new Date(now.getTime()+30*86400000);return(state.serviceContracts||[]).filter(c=>{if(c.status!=='active'||!c.endDate)return false;const d=new Date(c.endDate+'T12:00:00');return !Number.isNaN(d.getTime())&&d>=now&&d<=max;}).length;}
function renderServiceContracts(){const host=document.getElementById('salesDynamic');if(!host)return;workingServiceContract=null;currentServiceContractId=null;const all=state.serviceContracts||[],result=filterAndPageAppList('servicecontracts',all,contractSearchText),rows=result.items;const active=all.filter(c=>c.status==='active').length,drafts=all.filter(c=>c.status==='draft').length;document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / التهيئة / عقد بيع خدمات موش غروب';host.innerHTML=`
  <div class="toolbar"><div class="toolbar-left"><button class="btn primary" onclick="newServiceContract()">+ إنشاء عقد جديد</button><h2 style="margin:0">عقد بيع خدمات موش غروب</h2></div></div>
  <div class="contract-kpis">
   <div class="contract-kpi"><div class="k">إجمالي العقود</div><div class="v">${all.length}</div></div>
   <div class="contract-kpi"><div class="k">العقود السارية</div><div class="v">${active}</div></div>
   <div class="contract-kpi"><div class="k">المسودات</div><div class="v">${drafts}</div></div>
   <div class="contract-kpi"><div class="k">تنتهي خلال 30 يوم</div><div class="v">${contractsExpiringSoon()}</div></div>
  </div>
  <div class="panel">
   <div class="toolbar" style="padding:10px 12px;margin:0"><div class="toolbar-left"><h3 style="margin:0">قائمة العقود</h3></div></div>
   ${rows.length?`<table class="list-table"><thead><tr><th>رقم العقد</th><th>العميل</th><th>عنوان العقد</th><th>البداية</th><th>النهاية</th><th>القيمة</th><th>الحالة</th></tr></thead>
   <tbody>${rows.map(c=>`<tr class="data" onclick="openServiceContract('${esc(c.id)}')"><td><b>${esc(c.contractNumber)}</b></td><td>${esc(c.customer||'—')}</td><td>${esc(c.contractTitle||'—')}</td><td>${esc(c.startDate||'—')}</td><td>${esc(c.endDate||'—')}</td><td>${money(contractTotal(c))} ${esc(c.currency||'')}</td><td><span class="contract-status ${esc(c.status)}">${esc(contractStatusLabel(c.status))}</span></td></tr>`).join('')}</tbody></table>`:'<div class="empty">لا يوجد عقود مطابقة.</div>'}
   ${appListPagerHtml('servicecontracts',result,{placeholder:'بحث برقم العقد، العميل، الخدمة...'})}
  </div>`;}
function newServiceContract(){currentServiceContractId=null;workingServiceContract=blankServiceContract();renderServiceContractForm()}
function openServiceContract(id){const c=(state.serviceContracts||[]).find(x=>String(x.id)===String(id));if(!c)return;currentServiceContractId=c.id;workingServiceContract=JSON.parse(JSON.stringify(c));renderServiceContractForm();}
function contractCustomerOptions(selected){return `<option value="">اختر العميل</option>`+(state.customers||[]).filter(c=>c.active!==false).map(c=>`<option value="${esc(c.name)}" ${String(selected||'')===String(c.name)?'selected':''}>${esc(MoshCustomerNames36.display(c))}</option>`).join('');}
function contractServiceOptions(selected){return `<option value="">اختر الخدمة</option>`+(state.services||[]).filter(s=>s.active!==false).map(s=>`<option value="${esc(s.name)}" ${String(selected||'')===String(s.name)?'selected':''}>${esc(s.name)}</option>`).join('');}
function contractLinesHtml(c){return(c.lines||[]).map((l,i)=>`<tr>
  <td><select onchange="updateContractLine(${i},'service',this.value)">${contractServiceOptions(l.service)}</select></td>
  <td><input value="${esc(l.description||'')}" onchange="updateContractLine(${i},'description',this.value)"></td>
  <td><input type="number" min="0" step="1" value="${Number(l.qty)||1}" onchange="updateContractLine(${i},'qty',this.value)"></td>
  <td><input type="number" min="0" step="0.01" value="${Number(l.price)||0}" onchange="updateContractLine(${i},'price',this.value)"></td>
  <td><b>${money((Number(l.qty)||0)*(Number(l.price)||0))}</b></td>
  <td><button class="btn red" onclick="removeContractLine(${i})">حذف</button></td>
 </tr>`).join('');}
function contractClauseField(key,title,value){return `<div class="contract-clause"><h5>${esc(title)}</h5><textarea rows="4" style="width:100%" onchange="updateServiceContractField('${esc(key)}',this.value)">${esc(value||'')}</textarea></div>`;}
function renderServiceContractForm(){const host=document.getElementById('salesDynamic');if(!host||!workingServiceContract)return;const c=workingServiceContract;document.getElementById('crumb').innerHTML=`<b>قسم المبيعات</b> / عقد بيع خدمات موش غروب / ${esc(c.contractNumber)}`;host.innerHTML=`
  <div class="form-card">
   <div class="actionbar">
    <button class="btn save-btn" onclick="saveServiceContract()">حفظ العقد</button>
    <button class="btn" onclick="openServiceContractPreview()">معاينة</button>
    <button class="btn" onclick="printServiceContractPdf()">PDF / طباعة</button>
    <button class="btn" style="margin-inline-start:auto" onclick="renderServiceContracts()">رجوع للقائمة</button>
   </div>
   <div class="form-head"><div class="doc-title"><div><div class="muted">عقد بيع خدمات MOSH GROUP</div><h2>${esc(c.contractNumber)}</h2></div><span class="contract-status ${esc(c.status)}">${esc(contractStatusLabel(c.status))}</span></div></div>
   <div class="form-body">
    <div class="customer-form-section"><h4>بيانات العقد</h4><div class="customer-form-grid three">
     <div class="field"><label>رقم العقد</label><input value="${esc(c.contractNumber)}" readonly></div>
     <div class="field"><label>عنوان العقد *</label><input value="${esc(c.contractTitle)}" onchange="updateServiceContractField('contractTitle',this.value)"></div>
     <div class="field"><label>الحالة</label><select onchange="updateServiceContractField('status',this.value)"><option value="draft" ${c.status==='draft'?'selected':''}>مسودة</option><option value="active" ${c.status==='active'?'selected':''}>ساري</option><option value="expired" ${c.status==='expired'?'selected':''}>منتهي</option><option value="cancelled" ${c.status==='cancelled'?'selected':''}>ملغي</option></select></div>
     <div class="field"><label>العميل *</label><select onchange="handleServiceContractCustomer(this.value)">${contractCustomerOptions(c.customer)}</select></div>
     <div class="field"><label>ممثل العميل</label><input value="${esc(c.customerRepresentative)}" onchange="updateServiceContractField('customerRepresentative',this.value)"></div>
     <div class="field"><label>صفته</label><input value="${esc(c.customerRepresentativeTitle)}" onchange="updateServiceContractField('customerRepresentativeTitle',this.value)"></div>
     <div class="field"><label>ممثل MOSH GROUP</label><input list="contractSalespeople" value="${esc(c.moshRepresentative)}" onchange="updateServiceContractField('moshRepresentative',this.value)"><datalist id="contractSalespeople">${salespersonDatalistOptions()}</datalist></div>
    </div></div>

    <div class="customer-form-section"><h4>مدة العقد والتجديد</h4><div class="customer-form-grid three">
     <div class="field"><label>تاريخ البداية</label><input type="date" value="${esc(c.startDate)}" onchange="updateServiceContractField('startDate',this.value)"></div>
     <div class="field"><label>تاريخ النهاية</label><input type="date" value="${esc(c.endDate)}" onchange="updateServiceContractField('endDate',this.value)"></div>
     <div class="field"><label>تجديد تلقائي</label><select onchange="updateServiceContractField('autoRenew',this.value==='1')"><option value="0" ${!c.autoRenew?'selected':''}>لا</option><option value="1" ${c.autoRenew?'selected':''}>نعم</option></select></div>
     <div class="field"><label>مدة التجديد</label><select onchange="updateServiceContractField('renewalPeriod',this.value)">${['شهر','3 أشهر','6 أشهر','سنة'].map(v=>`<option ${c.renewalPeriod===v?'selected':''}>${v}</option>`).join('')}</select></div>
     <div class="field"><label>إشعار عدم التجديد قبل</label><input type="number" min="0" value="${esc(c.noticeDays)}" onchange="updateServiceContractField('noticeDays',this.value)"></div>
    </div></div>

    <div class="customer-form-section"><h4>الخدمات والقيمة</h4>
     <table class="lines"><thead><tr><th>الخدمة</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع</th><th></th></tr></thead><tbody>${contractLinesHtml(c)}</tbody></table>
     <div class="line-actions"><button class="link-btn" onclick="addContractLine()">+ إضافة خدمة للعقد</button></div>
     <div class="customer-form-grid three" style="margin-top:14px">
      <div class="field"><label>العملة</label><select onchange="updateServiceContractField('currency',this.value)">${['USD','SYP','AED','SAR','EUR'].map(v=>`<option ${c.currency===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>دورية الفوترة</label><select onchange="updateServiceContractField('billingCycle',this.value)">${['دفعة واحدة','شهري','ربع سنوي','نصف سنوي','سنوي','حسب مراحل التنفيذ'].map(v=>`<option ${c.billingCycle===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>مهلة السداد بالأيام</label><input type="number" min="0" value="${esc(c.paymentDueDays)}" onchange="updateServiceContractField('paymentDueDays',this.value)"></div>
      <div class="field"><label>الضريبة %</label><input type="number" min="0" step="0.01" value="${Number(c.taxRate)||0}" onchange="updateServiceContractField('taxRate',this.value)"></div>
     </div>
     <div class="totals"><div class="totalbox"><div class="totalrow"><span>قبل الضريبة</span><b>${money(contractSubtotal(c))}</b></div><div class="totalrow"><span>الضريبة</span><b>${money(contractTax(c))}</b></div><div class="totalrow big"><span>قيمة العقد</span><b>${money(contractTotal(c))} ${esc(c.currency)}</b></div></div></div>
    </div>

    <div class="customer-form-section"><h4>بنود العقد</h4><div style="display:grid;gap:12px">
     ${contractClauseField('scopeText','1. نطاق العقد',c.scopeText)}
     ${contractClauseField('moshObligations','2. التزامات MOSH GROUP',c.moshObligations)}
     ${contractClauseField('clientObligations','3. التزامات العميل',c.clientObligations)}
     ${contractClauseField('confidentiality','4. السرية',c.confidentiality)}
     ${contractClauseField('intellectualProperty','5. الملكية الفكرية',c.intellectualProperty)}
     ${contractClauseField('termination','6. إنهاء العقد',c.termination)}
     ${contractClauseField('forceMajeure','7. القوة القاهرة',c.forceMajeure)}
     ${contractClauseField('disputes','8. تسوية النزاعات',c.disputes)}
     ${contractClauseField('additionalTerms','9. أحكام إضافية',c.additionalTerms)}
    </div></div>

    <div class="customer-form-section"><h4>التوقيع والاعتماد</h4><div class="customer-form-grid">
     <div class="field"><label>المفوض عن العميل</label><input value="${esc(c.clientSignatory)}" onchange="updateServiceContractField('clientSignatory',this.value)"></div>
     <div class="field"><label>صفته</label><input value="${esc(c.clientSignatoryTitle)}" onchange="updateServiceContractField('clientSignatoryTitle',this.value)"></div>
     <div class="field"><label>المفوض عن MOSH GROUP</label><input value="${esc(c.moshSignatory)}" onchange="updateServiceContractField('moshSignatory',this.value)"></div>
     <div class="field"><label>صفته</label><input value="${esc(c.moshSignatoryTitle)}" onchange="updateServiceContractField('moshSignatoryTitle',this.value)"></div>
    </div></div>
   </div>
  </div>`;}
function updateServiceContractField(k,v){if(workingServiceContract)workingServiceContract[k]=v}
function handleServiceContractCustomer(name){if(!workingServiceContract)return;workingServiceContract.customer=name;const c=(state.customers||[]).find(x=>x.name===name);if(c){if(!workingServiceContract.customerRepresentative)workingServiceContract.customerRepresentative=c.contact||'';if(!workingServiceContract.customerRepresentativeTitle)workingServiceContract.customerRepresentativeTitle=c.jobTitle||''}
renderServiceContractForm();}
function addContractLine(){if(!workingServiceContract)return;workingServiceContract.lines.push({service:'',description:'',qty:1,price:0});renderServiceContractForm()}
function updateContractLine(i,k,v){if(!workingServiceContract?.lines?.[i])return;if(k==='qty'||k==='price')v=Number(v)||0;workingServiceContract.lines[i][k]=v;if(k==='service'){const s=(state.services||[]).find(x=>x.name===v);if(s&&!workingServiceContract.lines[i].description)workingServiceContract.lines[i].description=s.serviceDescription||'';}
renderServiceContractForm();}
function removeContractLine(i){if(!workingServiceContract)return;workingServiceContract.lines.splice(i,1);renderServiceContractForm()}
function validateServiceContract(c){if(!String(c.contractTitle||'').trim()){alert('عنوان العقد إجباري.');return false}
if(!String(c.customer||'').trim()){alert('اختر العميل.');return false}
if(c.startDate&&c.endDate&&c.endDate<c.startDate){alert('تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية.');return false}
if(c.status==='active'&&!(c.lines||[]).length){alert('العقد الساري يجب أن يحتوي على خدمة واحدة على الأقل.');return false}
return true;}
function saveServiceContract(){if(!workingServiceContract||!validateServiceContract(workingServiceContract))return;pushAppUndo();const now=new Date().toISOString(),idx=(state.serviceContracts||[]).findIndex(c=>String(c.id)===String(workingServiceContract.id));if(idx>=0){workingServiceContract.updatedAt=now;workingServiceContract.updatedBy=currentUserDisplayName();state.serviceContracts[idx]=JSON.parse(JSON.stringify(workingServiceContract))}
else{workingServiceContract.createdAt=now;workingServiceContract.createdBy=currentUserDisplayName();state.serviceContracts.push(JSON.parse(JSON.stringify(workingServiceContract)))}
save();alert('تم حفظ العقد.');openServiceContract(workingServiceContract.id);}
function contractDocumentClause(title,text){return String(text||'').trim()?`<div class="clause-title">${esc(title)}</div><div>${esc(text).replace(/\n/g,'<br>')}</div>`:''}
function buildServiceContractDocument(c){return `<div class="contract-paper">
  <div class="contract-head"><div><h1 style="margin:0">MOSH GROUP</h1><h2 style="margin:6px 0 0">عقد بيع خدمات</h2></div><div style="text-align:left"><b>${esc(c.contractNumber)}</b><br>${esc(contractStatusLabel(c.status))}</div></div>
  <div class="meta"><div><div class="k">الطرف الأول</div><div class="v">MOSH GROUP</div></div><div><div class="k">الطرف الثاني</div><div class="v">${esc(c.customer||'—')}</div></div><div><div class="k">عنوان العقد</div><div class="v">${esc(c.contractTitle||'—')}</div></div><div><div class="k">البداية</div><div class="v">${esc(c.startDate||'—')}</div></div><div><div class="k">النهاية</div><div class="v">${esc(c.endDate||'—')}</div></div><div><div class="k">التجديد</div><div class="v">${c.autoRenew?`تلقائي - ${esc(c.renewalPeriod)}`:'غير تلقائي'}</div></div></div>
  <p>تم الاتفاق بين <b>MOSH GROUP</b> وبين <b>${esc(c.customer||'العميل')}</b> على تقديم الخدمات المبينة أدناه وفق بنود هذا العقد.</p>
  <table><thead><tr><th>الخدمة</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع</th></tr></thead><tbody>${(c.lines||[]).length?(c.lines||[]).map(l=>`<tr><td>${esc(l.service||'—')}</td><td>${esc(l.description||'—')}</td><td>${Number(l.qty)||0}</td><td>${money(Number(l.price)||0)}</td><td>${money((Number(l.qty)||0)*(Number(l.price)||0))}</td></tr>`).join(''):'<tr><td colspan="5">لا توجد خدمات</td></tr>'}</tbody></table>
  <div style="text-align:left;font-weight:900">الإجمالي قبل الضريبة: ${money(contractSubtotal(c))} ${esc(c.currency)}<br>الضريبة: ${money(contractTax(c))} ${esc(c.currency)}<br>قيمة العقد: ${money(contractTotal(c))} ${esc(c.currency)}</div>
  <p><b>آلية الفوترة:</b> ${esc(c.billingCycle)} — مهلة السداد ${esc(c.paymentDueDays)} يوم.</p>
  ${contractDocumentClause('1. نطاق العقد',c.scopeText)}
  ${contractDocumentClause('2. التزامات MOSH GROUP',c.moshObligations)}
  ${contractDocumentClause('3. التزامات العميل',c.clientObligations)}
  ${contractDocumentClause('4. السرية',c.confidentiality)}
  ${contractDocumentClause('5. الملكية الفكرية',c.intellectualProperty)}
  ${contractDocumentClause('6. إنهاء العقد',c.termination)}
  ${contractDocumentClause('7. القوة القاهرة',c.forceMajeure)}
  ${contractDocumentClause('8. تسوية النزاعات',c.disputes)}
  ${contractDocumentClause('9. أحكام إضافية',c.additionalTerms)}
  <div class="signatures"><div class="signature-box"><b>عن العميل</b><br>الاسم: ${esc(c.clientSignatory||c.customerRepresentative||'')}<br>الصفة: ${esc(c.clientSignatoryTitle||c.customerRepresentativeTitle||'')}<br><br>التوقيع: __________________</div><div class="signature-box"><b>عن MOSH GROUP</b><br>الاسم: ${esc(c.moshSignatory||c.moshRepresentative||'')}<br>الصفة: ${esc(c.moshSignatoryTitle||'')}<br><br>التوقيع: __________________</div></div>
 </div>`;}
function openServiceContractPreview(){if(!workingServiceContract)return;document.getElementById('serviceContractPreviewBody').innerHTML=buildServiceContractDocument(workingServiceContract);document.getElementById('serviceContractPreviewModal').classList.add('show')}
function closeServiceContractPreview(){document.getElementById('serviceContractPreviewModal')?.classList.remove('show')}
function printServiceContractPdf(){if(!workingServiceContract){alert('افتح عقداً أولاً.');return}
const body=buildServiceContractDocument(workingServiceContract),w=window.open('','_blank');if(!w){alert('المتصفح منع نافذة الطباعة.');return}
w.document.open();w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(workingServiceContract.contractNumber)} - عقد MOSH GROUP</title><style>*{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;padding:20px;direction:rtl;color:#181818}.contract-paper{line-height:1.85}.contract-head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:16px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.meta>div{border:1px solid #ddd;padding:8px}.k{font-size:10px;color:#777}.v{font-weight:800}table{width:100%;border-collapse:collapse;margin:18px 0;font-size:11px}th,td{border:1px solid #ccc;padding:7px;text-align:right}th{background:#f1f1f1}.clause-title{font-weight:900;margin-top:16px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:45px}.signature-box{border-top:1px solid #999;padding-top:10px}@page{size:A4;margin:12mm}
/* MOSH ERP v168 — Department Manager / Employee Workflow */
.workflow-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin-bottom:12px}
.workflow-kpi{border:1px solid var(--line);background:var(--panel);border-radius:12px;padding:12px;cursor:pointer;min-width:0}
.workflow-kpi:hover,.workflow-kpi.active{border-color:var(--gold)}
.workflow-kpi.active{outline:1px solid var(--gold)}
.workflow-kpi .n{font-size:22px;font-weight:900;margin-top:5px}
.workflow-manager-strip{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--line);border-radius:12px;margin-bottom:12px;background:rgba(214,177,62,.05)}
.workflow-status{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:999px;padding:4px 9px;font-size:11px;font-weight:800;white-space:nowrap}
.workflow-status.new{border-color:#7f8c8d}.workflow-status.working{border-color:#d6b13e}.workflow-status.review{border-color:#b785ff}.workflow-status.done{border-color:#58b368}.workflow-status.returned{border-color:#e67e6c}
.workflow-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.workflow-card{border:1px solid var(--line);border-radius:12px;padding:14px;margin-top:12px;background:var(--panel)}
.approval-route{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:8px}
.approval-step{border:1px solid var(--line);border-radius:999px;padding:5px 9px;font-size:11px}
.approval-step.done{border-color:#58b368;opacity:.8}.approval-step.current{border-color:var(--gold);font-weight:900}.approval-arrow{opacity:.5}
.staff-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:10px}
.staff-card{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--panel)}.staff-card.manager{border-color:var(--gold)}
.staff-route{font-size:12px;line-height:1.8;margin-top:7px}
.employee-buckets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
.employee-bucket{border:1px solid var(--line);border-radius:12px;padding:10px;min-width:0}.employee-bucket h4{margin:0 0 8px}
@media(max-width:900px){.employee-buckets{grid-template-columns:1fr}}


/* =========================================================
   MOSH ERP v168 — Sidebar toggle must always really open/close
   ========================================================= */
@media(max-width:1220px){
 #appShell:not(.sidebar-collapsed){
  grid-template-columns:clamp(190px,22vw,240px) minmax(0,1fr)!important;
 }
 #appShell:not(.sidebar-collapsed) .sidebar{
  width:auto!important;
  padding-left:12px!important;
  padding-right:12px!important;
 }
 #appShell:not(.sidebar-collapsed) .sidebar-head{
  justify-content:space-between!important;
 }
 #appShell:not(.sidebar-collapsed) .sidebar-head .logo{
  display:block!important;
 }
 #appShell:not(.sidebar-collapsed) .app-name{
  display:block!important;
 }
 #appShell:not(.sidebar-collapsed) .nav a{
  justify-content:flex-start!important;
  padding:10px 11px!important;
  gap:9px!important;
 }
 #appShell:not(.sidebar-collapsed) .nav a .nav-label{
  display:inline!important;
 }
 #appShell:not(.sidebar-collapsed) .nav a .nav-icon{
  width:24px!important;
  min-width:24px!important;
  font-size:18px!important;
 }
 #appShell:not(.sidebar-collapsed) .sidebar-toggle{
  transform:none!important;
 }

 #appShell.sidebar-collapsed{
  grid-template-columns:72px minmax(0,1fr)!important;
 }
 #appShell.sidebar-collapsed .sidebar{
  width:auto!important;
  padding-left:9px!important;
  padding-right:9px!important;
 }
 #appShell.sidebar-collapsed .sidebar-head{
  justify-content:center!important;
 }
 #appShell.sidebar-collapsed .sidebar-head .logo,
 #appShell.sidebar-collapsed .app-name,
 #appShell.sidebar-collapsed .nav a .nav-label{
  display:none!important;
 }
 #appShell.sidebar-collapsed .nav a{
  justify-content:center!important;
  padding:11px 8px!important;
  gap:0!important;
 }
 #appShell.sidebar-collapsed .nav a .nav-icon{
  width:28px!important;
  min-width:28px!important;
 }
 #appShell.sidebar-collapsed .sidebar-toggle{
  transform:rotate(180deg)!important;
 }
}

@media(max-width:720px){
 #appShell:not(.sidebar-collapsed){
  grid-template-columns:min(220px,48vw) minmax(0,1fr)!important;
 }
 #appShell:not(.sidebar-collapsed) .sidebar{
  display:block!important;
  width:auto!important;
  padding:8px!important;
 }
 #appShell.sidebar-collapsed{
  grid-template-columns:58px minmax(0,1fr)!important;
 }
 #appShell.sidebar-collapsed .sidebar{
  display:block!important;
  width:auto!important;
  padding:8px 5px!important;
 }
}


/* =========================================================
   MOSH ERP v168 — Running task conversation
   ========================================================= */
.task-running-chat{
 margin-top:12px;
 border:1px solid var(--line);
 border-radius:20px;
 background:#111114;
 overflow:hidden;
}
.task-running-thread{
 min-height:390px;
 max-height:58vh;
 overflow-y:auto;
 overflow-x:hidden;
 padding:18px;
 display:flex;
 flex-direction:column;
 gap:11px;
 background:#0d0d10;
 scroll-behavior:smooth;
}
.task-running-empty{
 margin:auto;
 text-align:center;
 opacity:.45;
 font-size:13px;
 line-height:1.8;
}
.task-chat-row{
 display:flex;
 width:100%;
}
.task-chat-row.mine{justify-content:flex-end}
.task-chat-row.other{justify-content:flex-start}
.task-chat-stack{
 display:flex;
 flex-direction:column;
 gap:4px;
 max-width:min(72%,720px);
}
.task-chat-row.mine .task-chat-stack{align-items:flex-end}
.task-chat-row.other .task-chat-stack{align-items:flex-start}
.task-chat-bubble{
 width:fit-content;
 max-width:100%;
 padding:10px 13px;
 border:1px solid rgba(255,255,255,.09);
 border-radius:17px;
 background:#18181c;
 font-size:13px;
 line-height:1.7;
 white-space:pre-wrap;
 overflow-wrap:anywhere;
}
.task-chat-row.mine .task-chat-bubble{
 background:rgba(214,177,62,.10);
 border-color:rgba(214,177,62,.28);
}
.task-chat-meta{
 display:flex;
 gap:5px;
 align-items:center;
 flex-wrap:wrap;
 padding:0 4px;
 font-size:9px;
 color:rgba(255,255,255,.45);
}
.task-chat-meta b{
 font-size:9px;
 font-weight:800;
 color:rgba(255,255,255,.62);
}
.task-chat-media-bubble{
 padding:7px;
 max-width:min(100%,440px);
}
.task-chat-media{
 min-width:220px;
 min-height:76px;
 display:flex;
 align-items:center;
 justify-content:center;
 overflow:hidden;
 border-radius:13px;
 background:#09090b;
}
.task-chat-media img{
 display:block;
 max-width:100%;
 max-height:300px;
 object-fit:contain;
 border-radius:13px;
}
.task-chat-media video{
 display:block;
 width:100%;
 max-height:320px;
 border-radius:13px;
 background:#000;
}
.task-chat-media audio{
 width:300px;
 max-width:100%;
}
.task-chat-media-loading{
 padding:18px;
 font-size:10px;
 opacity:.48;
}
.task-chat-file-name{
 margin-top:6px;
 padding:0 3px;
 font-size:9px;
 opacity:.58;
 overflow:hidden;
 white-space:nowrap;
 text-overflow:ellipsis;
}
.task-chat-composer{
 display:grid;
 grid-template-columns:auto minmax(0,1fr) auto;
 align-items:end;
 gap:9px;
 padding:13px 15px;
 border-top:1px solid rgba(255,255,255,.08);
 background:#121216;
}
.task-chat-media-actions{
 display:flex;
 gap:6px;
 align-items:center;
}
.task-chat-media-actions .attachment-icon-btn{
 width:40px;
 height:40px;
 min-width:40px;
 border-radius:12px;
}
.task-chat-input{
 min-height:46px;
 max-height:120px;
 resize:none;
 width:100%;
 border:1px solid var(--line);
 border-radius:14px;
 background:#0d0d10;
 color:var(--text);
 padding:11px 13px;
 font:inherit;
 font-size:12px;
 line-height:1.65;
 box-sizing:border-box;
 outline:none;
}
.task-chat-input:focus{border-color:rgba(214,177,62,.5)}
.task-chat-send{
 height:46px;
 min-height:46px;
 padding-inline:18px;
 border-radius:14px;
}
@media(max-width:760px){
 .task-running-thread{min-height:330px;padding:13px}
 .task-chat-stack{max-width:90%}
 .task-chat-composer{grid-template-columns:1fr auto}
 .task-chat-media-actions{grid-column:1 / -1}
 .task-chat-media{min-width:160px}
}


/* =========================================================
   MOSH ERP v168 — reliable media chat + side timestamp + folded activities
   ========================================================= */
.task-chat-line{
 display:flex;
 align-items:flex-end;
 gap:8px;
 width:100%;
}
.task-chat-row.mine .task-chat-line{
 justify-content:flex-end;
 flex-direction:row;
}
.task-chat-row.other .task-chat-line{
 justify-content:flex-start;
 flex-direction:row-reverse;
}
.task-chat-side-meta{
 flex:0 0 auto;
 display:flex;
 flex-direction:column;
 gap:1px;
 align-items:center;
 justify-content:flex-end;
 padding-bottom:4px;
 color:rgba(255,255,255,.34);
 font-size:8px;
 line-height:1.25;
 white-space:nowrap;
}
.task-chat-side-meta .who{
 font-size:8px;
 color:rgba(255,255,255,.44);
 font-weight:700;
 max-width:90px;
 overflow:hidden;
 text-overflow:ellipsis;
}
.task-chat-side-meta .clock{font-size:8px}
.task-chat-side-meta .date{font-size:7px;opacity:.82}

.task-chat-upload-state{
 border:1px dashed rgba(214,177,62,.35);
 background:rgba(214,177,62,.045);
 border-radius:13px;
 padding:14px;
 font-size:10px;
 opacity:.72;
}

.task-activities{
 margin-top:14px;
 border:1px solid var(--line);
 border-radius:13px;
 background:var(--panel);
 overflow:hidden;
}
.task-activities > summary{
 list-style:none;
 cursor:pointer;
 display:flex;
 align-items:center;
 justify-content:space-between;
 gap:10px;
 padding:11px 13px;
 font-weight:850;
 user-select:none;
}
.task-activities > summary::-webkit-details-marker{display:none}
.task-activities > summary::after{
 content:'فتح ▼';
 font-size:10px;
 opacity:.55;
}
.task-activities[open] > summary::after{
 content:'إغلاق ▲';
}
.task-activities-body{
 padding:0 10px 10px;
 border-top:1px solid var(--line);
}
.task-activities-count{
 font-size:10px;
 opacity:.5;
 font-weight:600;
 margin-inline-start:5px;
}


/* =========================================================
   MOSH ERP v168 — polished chat + manager controls + robust images
   ========================================================= */
.task-chat-line{
 display:flex!important;
 align-items:flex-end!important;
 gap:5px!important;
 width:100%!important;
 direction:ltr!important;
}
.task-chat-side-meta{
 flex:0 0 44px!important;
 width:44px!important;
 display:flex!important;
 flex-direction:column!important;
 gap:0!important;
 align-items:center!important;
 justify-content:flex-end!important;
 padding-bottom:2px!important;
 color:rgba(255,255,255,.18)!important;
 font-size:6px!important;
 line-height:1.05!important;
 white-space:nowrap!important;
 user-select:none!important;
}
.task-chat-side-meta .who{
 max-width:44px!important;
 overflow:hidden!important;
 text-overflow:ellipsis!important;
 font-size:5.5px!important;
 color:rgba(255,255,255,.21)!important;
 font-weight:700!important;
}
.task-chat-side-meta .clock{
 font-size:6.5px!important;
 color:rgba(255,255,255,.27)!important;
}
.task-chat-side-meta .date{
 font-size:5px!important;
 color:rgba(255,255,255,.14)!important;
}
.task-chat-bubble{direction:rtl!important}
.task-chat-row.mine .task-chat-line{justify-content:flex-end!important}
.task-chat-row.other .task-chat-line{justify-content:flex-start!important}

.task-manager-controls{
 border:1px solid rgba(255,255,255,.08);
 border-radius:14px;
 background:#111216;
 padding:10px;
 margin:8px 0 10px;
 display:grid;
 gap:8px;
}
.task-manager-summary{
 display:flex;
 align-items:center;
 gap:6px;
 flex-wrap:wrap;
}
.task-manager-chip{
 display:inline-flex;
 align-items:center;
 gap:4px;
 min-height:26px;
 padding:4px 8px;
 border:1px solid rgba(255,255,255,.08);
 border-radius:999px;
 background:#0e0f12;
 font-size:9px;
 color:rgba(255,255,255,.65);
}
.task-manager-chip b{color:var(--text);font-size:9px}
.task-manager-row{
 display:flex;
 align-items:end;
 gap:7px;
 flex-wrap:wrap;
}
.task-manager-field{
 flex:1 1 210px;
 min-width:180px;
}
.task-manager-field label{
 display:block;
 font-size:9px;
 opacity:.5;
 margin:0 3px 4px;
}
.task-manager-field input,
.task-manager-field select{
 width:100%;
 height:38px;
 border:1px solid var(--line);
 border-radius:9px;
 background:#0d0e11;
 color:var(--text);
 padding:7px 9px;
 box-sizing:border-box;
}
.task-manager-controls .btn{
 min-height:38px;
 padding:7px 11px;
 font-size:10px;
}
.task-manager-danger{border-color:rgba(225,92,92,.35)!important}

@media(max-width:700px){
 .task-chat-side-meta{flex-basis:36px!important;width:36px!important}
 .task-manager-field{flex-basis:100%}
}

</style>
<style id="v211-employee-daily-hub-css">
#dashboardApp .dashboard-user{padding:30px 34px!important;min-height:0!important}
.employee-daily-hub{width:100%;min-width:0}
.employee-daily-identity{font-size:16px;font-weight:800;color:var(--ui-text,var(--text));margin-top:2px}
.employee-daily-manager{font-size:13px;color:var(--ui-muted,var(--muted));margin-top:5px}
.employee-daily-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:15px}
.employee-announcement-btn{position:relative;display:inline-flex!important;align-items:center;gap:8px!important;background:var(--ui-panel2,var(--panel2))!important;border:1px solid var(--ui-border,var(--line))!important;color:var(--ui-text,var(--text))!important}
.employee-announcement-btn svg{width:19px;height:19px;flex:0 0 19px}
.employee-announcement-btn.has-unread{border-color:rgba(215,173,69,.75)!important;color:#f5d56f!important;background:rgba(215,173,69,.10)!important;box-shadow:0 0 0 1px rgba(215,173,69,.08) inset,0 0 24px rgba(215,173,69,.10)!important;animation:employeeNoticePulse 1.8s ease-in-out infinite}
.employee-announcement-btn.has-urgent{border-color:rgba(239,96,96,.72)!important;color:#ff9a9a!important;background:rgba(190,45,45,.11)!important}
.employee-announcement-count{display:inline-flex;align-items:center;justify-content:center;min-width:21px;height:21px;padding:0 6px;border-radius:999px;background:currentColor;color:#111;font-size:11px;font-weight:900}
@keyframes employeeNoticePulse{0%,100%{transform:translateY(0);filter:brightness(1)}50%{transform:translateY(-1px);filter:brightness(1.12)}}
.employee-daily-stats{grid-template-columns:repeat(4,minmax(150px,1fr))!important;margin-top:16px!important}
.employee-daily-stat{min-height:94px!important;display:flex;flex-direction:column;justify-content:center}
.employee-daily-stat>div:last-of-type{font-size:17px!important;font-weight:900!important;line-height:1.4}
.employee-daily-stat small{display:block;margin-top:6px;color:var(--ui-muted,var(--muted));font-size:12px;line-height:1.5}
.employee-daily-context{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.employee-context-card{border:1px solid var(--ui-border,var(--line));border-radius:14px;background:var(--ui-field,#0d0f12);padding:12px 14px;text-align:right;color:var(--ui-text,var(--text));font:inherit;min-width:0}
button.employee-context-card{cursor:pointer}.employee-context-card.action{border-color:rgba(215,173,69,.32);background:rgba(215,173,69,.045)}
.employee-context-label{display:block;font-size:11px;font-weight:900;color:var(--gold2);margin-bottom:5px}
.employee-context-card b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.employee-context-card small{display:block;color:var(--ui-muted,var(--muted));font-size:11px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.employee-announcements-list{display:grid;gap:9px}.employee-announcement-item{border:1px solid var(--ui-border,var(--line));border-radius:14px;background:var(--ui-field,#0d0f12);padding:13px}.employee-announcement-item.alert{border-inline-start:3px solid #db6666}.employee-announcement-item.action{border-inline-start:3px solid var(--gold)}.employee-announcement-type{font-size:11px;color:var(--gold2);font-weight:900}.employee-announcement-item h4{margin:4px 0 6px;font-size:16px}.employee-announcement-item p{margin:0;color:var(--ui-muted,var(--muted));line-height:1.75;font-size:13px}.employee-announcement-meta{margin-top:8px;font-size:11px;color:var(--ui-muted,var(--muted));display:flex;gap:8px;flex-wrap:wrap}
.hr-communications-box{margin-top:12px}.hr-communications-mini{display:grid;gap:6px}.hr-communications-mini-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--ui-border,var(--line))}.hr-communications-mini-row:last-child{border-bottom:0}.hr-communications-mini-row small{display:block;color:var(--ui-muted,var(--muted));margin-top:3px}
@media(max-width:950px){.employee-daily-stats{grid-template-columns:repeat(2,minmax(150px,1fr))!important}}
@media(max-width:650px){.employee-daily-stats,.employee-daily-context{grid-template-columns:1fr!important}.employee-daily-actions{align-items:stretch}.employee-daily-actions .btn{width:100%;justify-content:center}}
</style>
</head><body>${body}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300);}
function customerDetailValue(value){if(value===null || value===undefined || value==='')return '—';return String(value);}
function renderCustomerDetails(customerId){const customer=(state.customers||[]).find(c=>String(c.id)===String(customerId));if(!customer){alert('تعذر العثور على العميل.');salesList('customergroup');return;}
const host=document.getElementById('salesDynamic');if(!host)return;document.getElementById('crumb').innerHTML=
`<b>قسم المبيعات</b> / قائمة العملاء / ${esc(customer.name||customer.id||'')}`;const secondary=customer.secondaryContacts||[];host.innerHTML=`
  <div class="panel">
   <div class="toolbar" style="padding:12px;margin:0">
    <div class="toolbar-left">
     <button class="btn" onclick="salesList('customergroup')">رجوع</button>
     <div>
      <h3 style="margin:0">${esc(customer.name||'—')}</h3>
      <div class="muted" style="margin-top:4px">${esc(customer.id||'')}</div>
     </div>
    </div>
   </div>

   <div class="customer-form-section">
    <h4>البيانات الأساسية</h4>
    <div class="customer-form-grid">
     <div><div class="muted">نوع العميل</div><b>${customer.type==='person'?'فرد':'شركة / مؤسسة'}</b></div>
     <div><div class="muted">الاسم القانوني</div><b>${esc(customerDetailValue(customer.legalName))}</b></div>
     <div><div class="muted">مجال العمل</div><b>${esc(customerDetailValue(customer.industry))}</b></div>
     <div><div class="muted">الموقع الإلكتروني</div><b>${esc(customerDetailValue(customer.website))}</b></div>
     <div><div class="muted">الحالة</div><b>${customer.active===false?'غير نشط':'نشط'}</b></div>
    </div>
   </div>

   <div class="customer-form-section">
    <h4>بيانات التواصل</h4>
    <div class="customer-form-grid three">
     <div><div class="muted">الشخص المسؤول الأساسي</div><b>${esc(customerDetailValue(customer.contact))}</b></div>
     <div><div class="muted">المسمى الوظيفي</div><b>${esc(customerDetailValue(customer.jobTitle))}</b></div>
     <div><div class="muted">الهاتف الرئيسي</div><b>${esc(customerDetailValue(customer.phone))}</b></div>
     <div><div class="muted">هاتف إضافي</div><b>${esc(customerDetailValue(customer.alternatePhone))}</b></div>
     <div><div class="muted">واتساب</div><b>${esc(customerDetailValue(customer.whatsapp))}</b></div>
     <div><div class="muted">البريد الإلكتروني</div><b>${esc(customerDetailValue(customer.email))}</b></div>
     <div><div class="muted">طريقة التواصل المفضلة</div><b>${esc(customerDetailValue(customer.preferredContact))}</b></div>
    </div>

    ${secondary.length?`
    <div class="secondary-contacts-wrap">
     ${secondary.map((c,i)=>`
      <div class="secondary-contact-card">
       <div class="secondary-contact-head"><b>شخص تواصل إضافي ${i+1}</b></div>
       <div class="customer-form-grid three">
        <div><div class="muted">الاسم</div><b>${esc(customerDetailValue(c.name))}</b></div>
        <div><div class="muted">المسمى الوظيفي</div><b>${esc(customerDetailValue(c.jobTitle))}</b></div>
        <div><div class="muted">الهاتف</div><b>${esc(customerDetailValue(c.phone))}</b></div>
        <div><div class="muted">واتساب</div><b>${esc(customerDetailValue(c.whatsapp))}</b></div>
        <div><div class="muted">البريد الإلكتروني</div><b>${esc(customerDetailValue(c.email))}</b></div>
       </div>
      </div>
     `).join('')}
    </div>`:''}
   </div>

   <div class="customer-form-section">
    <h4>العناوين</h4>
    <div class="customer-form-grid">
     <div><div class="muted">الدولة</div><b>${esc(customerDetailValue(customer.country))}</b></div>
     <div><div class="muted">المدينة</div><b>${esc(customerDetailValue(customer.city))}</b></div>
     <div><div class="muted">العنوان الرئيسي</div><b>${esc(customerDetailValue(customer.address))}</b></div>
     <div><div class="muted">عنوان الفوترة</div><b>${esc(customerDetailValue(customer.billingAddress))}</b></div>
     <div><div class="muted">عنوان التسليم</div><b>${esc(customerDetailValue(customer.deliveryAddress))}</b></div>
    </div>
   </div>

   <div class="customer-form-section">
    <h4>الفوترة والبيانات القانونية</h4>
    <div class="customer-form-grid three">
     <div><div class="muted">الرقم الضريبي</div><b>${esc(customerDetailValue(customer.taxNumber))}</b></div>
     <div><div class="muted">السجل التجاري</div><b>${esc(customerDetailValue(customer.commercialRegister))}</b></div>
     <div><div class="muted">شروط السداد</div><b>${esc(customerDetailValue(customer.paymentTerms))}</b></div>
     <div><div class="muted">العملة الافتراضية</div><b>${esc(customerDetailValue(customer.currency))}</b></div>
    </div>
   </div>

   <div class="customer-form-section">
    <h4>بيانات المبيعات الداخلية</h4>
    <div class="customer-form-grid">
     <div><div class="muted">مسؤول المبيعات</div><b>${esc(customerDetailValue(customer.salesperson))}</b></div>
     <div><div class="muted">مصدر العميل</div><b>${esc(customerDetailValue(customer.source))}</b></div>
     <div style="grid-column:1/-1"><div class="muted">ملاحظات داخلية</div><b>${esc(customerDetailValue(customer.notes))}</b></div>
    </div>
   </div>
  </div>`;}
function renderEditCustomerList(){if(!hasPermission('editCustomers'))return;const host=document.getElementById('salesDynamic');if(!host)return;const allCustomers=(state.customers||[]).filter(c=>c.active!==false),result=filterAndPageAppList('editcustomers',allCustomers,c=>MoshCustomerNames36.search(c)),customers=result.items;document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / تعديل معلومات عميل';host.innerHTML=`<div class="panel"><div class="toolbar" style="padding:12px;margin:0"><div class="toolbar-left"><h3 style="margin:0">تعديل معلومات عميل</h3><span class="muted">${result.total} عميل</span></div></div>${customers.length?`<table class="list-table"><thead><tr><th>تسلسل</th><th>اسم العميل</th></tr></thead><tbody>${customers.map((c,i)=>`<tr onclick="renderEditCustomerForm('${esc(c.id||'')}')" style="cursor:pointer"><td>${result.start+i+1}</td><td><div class="customer-list-name">${esc(MoshCustomerNames36.display(c)||'—')}</div></td></tr>`).join('')}</tbody></table>`:`<div class="empty">لا يوجد عملاء مطابقين.</div>`}${appListPagerHtml('editcustomers',result,{placeholder:'بحث باسم العميل...'})}</div>`}
function setCustomerFormValue(id,value){const el=document.getElementById(id);if(!el)return;el.value=value===undefined||value===null?'':String(value);}
function renderEditCustomerForm(customerId){if(!hasPermission('editCustomers'))return;const customer=(state.customers||[]).find(c=>String(c.id)===String(customerId));if(!customer){alert('تعذر العثور على العميل.');renderEditCustomerList();return;}
renderNewCustomerForm();document.getElementById('crumb').innerHTML=
`<b>قسم المبيعات</b> / تعديل معلومات عميل / ${esc(customer.name||customer.id||'')}`;const host=document.getElementById('salesDynamic');if(!host)return;const heading=host.querySelector('.toolbar h3');if(heading)heading.textContent='تعديل معلومات عميل';const sub=host.querySelector('.toolbar .muted');if(sub)sub.textContent=`${customer.id||''} — ${customer.name||''}`;const primary=host.querySelector('.customer-form-actions .btn.primary');if(primary){primary.textContent='حفظ التعديلات';primary.setAttribute('onclick',`saveEditedCustomer('${String(customer.id||'').replace(/'/g,"\\'")}')`);}
const cancel=host.querySelector('.customer-form-actions .btn:not(.primary)');if(cancel){cancel.textContent='إلغاء الأمر';cancel.setAttribute('onclick',"salesList('editcustomer')");}
const customerActions=host.querySelector('.customer-form-actions');if(customerActions)customerActions.insertAdjacentHTML('beforeend',`<button class="btn danger" onclick="deleteCustomerConfig('${String(customer.id||'').replace(/'/g,"\\'")}')">حذف العميل</button>`);
setCustomerFormValue('newCustomerType',customer.type||'company');setCustomerFormValue('newCustomerName',customer.nameAr||customer.name||'');setCustomerFormValue('newCustomerNameEn',customer.nameEn||'');setCustomerFormValue('newCustomerLegalName',customer.legalName||customer.name||'');setCustomerFormValue('newCustomerIndustry',customer.industry||'');setCustomerFormValue('newCustomerWebsite',customer.website||'');setCustomerFormValue('newCustomerActive',customer.active===false?'0':'1');setCustomerFormValue('newCustomerContact',customer.contact||'');setCustomerFormValue('newCustomerJobTitle',customer.jobTitle||'');setCustomerFormValue('newCustomerPhone',customer.phone||'');setCustomerFormValue('newCustomerAlternatePhone',customer.alternatePhone||'');setCustomerFormValue('newCustomerWhatsapp',customer.whatsapp||'');setCustomerFormValue('newCustomerEmail',customer.email||'');setCustomerFormValue('newCustomerPreferredContact',customer.preferredContact||'واتساب');setCustomerFormValue('newCustomerCountry',customer.country||'');setCustomerFormValue('newCustomerCity',customer.city||'');setCustomerFormValue('newCustomerAddress',customer.address||'');setCustomerFormValue('newCustomerBillingAddress',customer.billingAddress||'');setCustomerFormValue('newCustomerDeliveryAddress',customer.deliveryAddress||'');setCustomerFormValue('newCustomerTaxNumber',customer.taxNumber||'');setCustomerFormValue('newCustomerCommercialRegister',customer.commercialRegister||'');setCustomerFormValue('newCustomerPaymentTerms',customer.paymentTerms||'');setCustomerFormValue('newCustomerCurrency',customer.currency||'USD');setCustomerFormValue('newCustomerSalesperson',customer.salesperson||'');setCustomerFormValue('newCustomerSource',customer.source||'');setCustomerFormValue('newCustomerNotes',customer.notes||'');newCustomerSecondaryContactCounter=0;const contactsHost=document.getElementById('secondaryCustomerContacts');if(contactsHost)contactsHost.innerHTML='';(customer.secondaryContacts||[]).forEach(contact=>addSecondaryCustomerContact(contact));}
function updateCustomerNameReferences(){ /* Laravel maintains customer references atomically. */ }
async function saveEditedCustomer(customerId){if(!hasPermission('editCustomers')){alert('لا تملك صلاحية تعديل العميل.');return;}const customer=(state.customers||[]).find(c=>String(c.id)===String(customerId));if(!customer){alert('تعذر العثور على العميل.');return;}
const get=id=>document.getElementById(id);const nameAr=(get('newCustomerName')?.value||'').trim(),nameEn=(get('newCustomerNameEn')?.value||'').trim(),name=nameAr||nameEn;if(!name){alert('أدخل اسم العميل بالعربية أو الإنكليزية.');get('newCustomerName')?.focus();return;}
const duplicate=(state.customers||[]).find(c=>
String(c.id)!==String(customerId)&&
normalizeCustomerName(c.name)===normalizeCustomerName(name)
);if(duplicate){alert('يوجد عميل آخر بهذا الاسم.');get('newCustomerName')?.focus();get('newCustomerName')?.select();return;}
const email=(get('newCustomerEmail')?.value||'').trim();if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert('البريد الإلكتروني غير صحيح.');get('newCustomerEmail')?.focus();return;}
const secondaryContacts=collectSecondaryCustomerContacts();if(secondaryContacts===null)return;const address=(get('newCustomerAddress')?.value||'').trim();const billingAddress=(get('newCustomerBillingAddress')?.value||'').trim()||address;const deliveryAddress=(get('newCustomerDeliveryAddress')?.value||'').trim()||address;const oldName=customer.name;pushAppUndo();Object.assign(customer,{type:get('newCustomerType')?.value||'company',name,nameAr,nameEn,legalName:(get('newCustomerLegalName')?.value||'').trim()||name,industry:(get('newCustomerIndustry')?.value||'').trim(),contact:(get('newCustomerContact')?.value||'').trim(),jobTitle:(get('newCustomerJobTitle')?.value||'').trim(),phone:(get('newCustomerPhone')?.value||'').trim(),alternatePhone:(get('newCustomerAlternatePhone')?.value||'').trim(),whatsapp:(get('newCustomerWhatsapp')?.value||'').trim(),email,website:(get('newCustomerWebsite')?.value||'').trim(),country:(get('newCustomerCountry')?.value||'').trim(),city:(get('newCustomerCity')?.value||'').trim(),address,billingAddress,deliveryAddress,taxNumber:(get('newCustomerTaxNumber')?.value||'').trim(),commercialRegister:(get('newCustomerCommercialRegister')?.value||'').trim(),paymentTerms:get('newCustomerPaymentTerms')?.value||'',currency:get('newCustomerCurrency')?.value||'USD',salesperson:(get('newCustomerSalesperson')?.value||'').trim(),source:get('newCustomerSource')?.value||'',preferredContact:get('newCustomerPreferredContact')?.value||'واتساب',notes:(get('newCustomerNotes')?.value||'').trim(),active:get('newCustomerActive')?.value!=='0',secondaryContacts,updatedAt:new Date().toISOString(),updatedBy:currentUserDisplayName()
});updateCustomerNameReferences(oldName,name);customersCatalog=state.customers;try{await save();}catch(_){return;}salesList('editcustomer');}
async function deleteCustomerConfig(customerId){if(!hasPermission('editCustomers')){alert('لا تملك صلاحية حذف العميل.');return;}const customer=(state.customers||[]).find(c=>String(c.id)===String(customerId));if(!customer||!confirm('حذف العميل؟'))return;pushAppUndo();state.customers=state.customers.filter(c=>String(c.id)!==String(customerId));customersCatalog=state.customers;try{await save();}catch(_){return;}salesList('editcustomer');}
function nextServiceId(){let max=0;(state.services||[]).forEach(s=>{const m=String(s.id||'').match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1])||0);});return 'SRV/'+String(max+1).padStart(5,'0');}
function findServiceByName(name){const key=String(name||'').trim().toLocaleLowerCase();if(!key)return null;return(state.services||[]).find(s=>String(s.name||'').trim().toLocaleLowerCase()===key)||null;}
function renderServiceList(){const host=document.getElementById('salesDynamic');if(!host)return;const allServices=state.services||[],result=filterAndPageAppList('services',allServices,s=>[s.serviceCode,s.name,s.category,s.serviceDescription,s.active===false?'غير نشطة':'نشطة'].join(' ')),services=result.items;document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / قائمة الخدمات';host.innerHTML=`<div class="panel"><div class="toolbar" style="padding:12px;margin:0"><div class="toolbar-left"><h3 style="margin:0">قائمة الخدمات</h3><span class="muted">${result.total} خدمة</span></div></div>${services.length?`<table class="list-table"><thead><tr><th>اسم الخدمة</th></tr></thead><tbody>${services.map(s=>`<tr onclick="renderServiceDetails('${esc(s.id||'')}')" style="cursor:pointer"><td><div class="service-list-name">${esc(s.name||'—')}</div></td></tr>`).join('')}</tbody></table>`:`<div class="empty">لا يوجد خدمات مطابقة.</div>`}${appListPagerHtml('services',result,{placeholder:'بحث باسم الخدمة أو التصنيف...'})}</div>`}
function renderEditServiceList(){const host=document.getElementById('salesDynamic');if(!host)return;const allServices=state.services||[],result=filterAndPageAppList('editservices',allServices,s=>[s.serviceCode,s.name,s.category,s.serviceDescription].join(' ')),services=result.items;document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / تعديل خدمة';host.innerHTML=`<div class="panel"><div class="toolbar" style="padding:12px;margin:0"><div class="toolbar-left"><h3 style="margin:0">تعديل خدمة</h3><span class="muted">${result.total} خدمة</span></div></div>${services.length?`<table class="list-table"><thead><tr><th>اسم الخدمة</th></tr></thead><tbody>${services.map(s=>`<tr onclick="renderEditServiceForm('${esc(s.id||'')}')" style="cursor:pointer"><td><div class="service-list-name">${esc(s.name||'—')}</div></td></tr>`).join('')}</tbody></table>`:`<div class="empty">لا يوجد خدمات مطابقة.</div>`}${appListPagerHtml('editservices',result,{placeholder:'بحث باسم الخدمة...'})}</div>`}
function serviceDetailValue(value,suffix=''){if(value===null || value===undefined || value==='')return '—';return String(value)+(suffix||'');}
function renderServiceDetails(serviceId){const service=(state.services||[]).find(s=>String(s.id)===String(serviceId));if(!service){alert('تعذر العثور على الخدمة.');renderServiceList();return;}
const host=document.getElementById('salesDynamic');if(!host)return;document.getElementById('crumb').innerHTML=
`<b>قسم المبيعات</b> / قائمة الخدمات / ${esc(service.name||service.id||'')}`;host.innerHTML=`
  <div class="panel">
   <div class="toolbar" style="padding:12px;margin:0">
    <div class="toolbar-left">
     <button class="btn" onclick="salesList('servicelist')">رجوع</button>
     <div>
      <h3 style="margin:0">${esc(service.name||'—')}</h3>
      <div class="muted" style="margin-top:4px">${esc(service.serviceCode||service.id||'')}</div>
     </div>
    </div>
   </div>

   <div class="customer-form-section">
    <h4>بيانات الخدمة</h4>
    <div class="customer-form-grid three">
     <div><div class="service-detail-label">رقم / كود الخدمة</div><span class="service-detail-value">${esc(serviceDetailValue(service.serviceCode||service.id))}</span></div>
     <div><div class="service-detail-label">اسم الخدمة</div><span class="service-detail-value">${esc(serviceDetailValue(service.name))}</span></div>
     <div><div class="service-detail-label">تصنيف الخدمة</div><span class="service-detail-value">${esc(serviceDetailValue(service.category))}</span></div>
     <div><div class="service-detail-label">حالة الخدمة</div><span class="service-detail-value">${service.active===false?'غير نشطة':'نشطة'}</span></div>
     <div style="grid-column:1/-1"><div class="service-detail-label">وصف الخدمة</div><span class="service-detail-value">${esc(serviceDetailValue(service.serviceDescription))}</span></div>
    </div>
   </div>
  </div>`;}
function renderNewServiceForm(){const host=document.getElementById('salesDynamic');if(!host)return;document.getElementById('crumb').innerHTML='<b>قسم المبيعات</b> / إضافة خدمة';const autoCode=nextServiceId();host.innerHTML=`
  <div class="panel">
   <div class="toolbar" style="padding:12px;margin:0">
    <div class="toolbar-left">
     <h3 style="margin:0">إضافة خدمة</h3>
     <span class="muted">بطاقة خدمة</span>
    </div>
   </div>

   <div class="customer-form-section">
    <h4>بيانات الخدمة</h4>
    <div class="customer-form-grid">
     <div class="field">
      <label>رقم / كود الخدمة</label>
      <input id="serviceCode" value="${esc(autoCode)}" readonly style="opacity:.78;cursor:not-allowed">
     </div>
     <div class="field">
      <label>اسم الخدمة <span class="customer-required">*</span></label>
      <input id="serviceName" placeholder="مثال: إدارة منصات التواصل الاجتماعي">
     </div>
     <div class="field">
      <label>تصنيف الخدمة</label>
      <input id="serviceCategory" placeholder="تصميم، تصوير، تسويق، طباعة...">
     </div>
     <div class="field">
      <label>حالة الخدمة</label>
      <select id="serviceActive">
       <option value="1">نشطة</option>
       <option value="0">غير نشطة</option>
      </select>
     </div>
     <div class="field" style="grid-column:1/-1">
      <label>وصف الخدمة</label>
      <textarea id="serviceDescription" rows="5" placeholder="وصف واضح لما تتضمنه الخدمة"></textarea>
     </div>
    </div>

    <div class="muted" style="margin-top:12px;line-height:1.7">
     السعر لا يُحفظ ضمن الخدمة. يتم تحديد السعر وتعديله داخل كل عرض سعر حسب الحالة.
    </div>
   </div>

   <div class="customer-form-actions">
    <button class="btn primary" onclick="saveNewService()">حفظ الخدمة</button>
    <button class="btn" onclick="salesList('servicelist')">إلغاء الأمر</button>
   </div>
  </div>`;document.getElementById('serviceName')?.focus();}
function readServiceForm(){const get=id=>document.getElementById(id);return{name:(get('serviceName')?.value||'').trim(),category:(get('serviceCategory')?.value||'').trim(),serviceDescription:(get('serviceDescription')?.value||'').trim(),active:get('serviceActive')?.value!=='0'
};}
function validateServiceForm(data,excludeId=null){if(!data.name){alert('اسم الخدمة إجباري.');document.getElementById('serviceName')?.focus();return false;}
const duplicateName=(state.services||[]).find(s=>
String(s.id)!==String(excludeId||'')&&
String(s.name||'').trim().toLocaleLowerCase()===data.name.toLocaleLowerCase()
);if(duplicateName){alert('يوجد خدمة بهذا الاسم مسبقًا.');document.getElementById('serviceName')?.focus();return false;}
return true;}
async function saveNewService(){const data=readServiceForm();if(!validateServiceForm(data))return;const code=nextServiceId();const service={id:code,serviceCode:code,...data,createdAt:new Date().toISOString(),createdBy:currentUserDisplayName()
};pushAppUndo();state.services.push(service);servicesCatalog=state.services;try{await save();}catch(_){return;}salesList('servicelist');}
function setServiceFormValue(id,value){const el=document.getElementById(id);if(!el)return;el.value=value===undefined||value===null?'':String(value);}
function renderEditServiceForm(serviceId){const service=(state.services||[]).find(s=>String(s.id)===String(serviceId));if(!service){alert('تعذر العثور على الخدمة.');renderEditServiceList();return;}
renderNewServiceForm();document.getElementById('crumb').innerHTML=
`<b>قسم المبيعات</b> / تعديل خدمة / ${esc(service.name||service.id||'')}`;const host=document.getElementById('salesDynamic');const heading=host?.querySelector('.toolbar h3');if(heading)heading.textContent='تعديل خدمة';const sub=host?.querySelector('.toolbar .muted');if(sub)sub.textContent=`${service.serviceCode||service.id||''} — ${service.name||''}`;const primary=host?.querySelector('.customer-form-actions .btn.primary');if(primary){primary.textContent='حفظ التعديلات';primary.setAttribute('onclick',`saveEditedService('${String(service.id||'').replace(/'/g,"\\'")}')`);}
const cancel=host?.querySelector('.customer-form-actions .btn:not(.primary)');if(cancel){cancel.textContent='إلغاء الأمر';cancel.setAttribute('onclick',"salesList('editservice')");}
const serviceActions=host?.querySelector('.customer-form-actions');if(serviceActions)serviceActions.insertAdjacentHTML('beforeend',`<button class="btn danger" onclick="deleteServiceConfig('${String(service.id||'').replace(/'/g,"\\'")}')">حذف الخدمة</button>`);
setServiceFormValue('serviceCode',service.serviceCode||service.id||'');setServiceFormValue('serviceName',service.name||'');setServiceFormValue('serviceCategory',service.category||'');setServiceFormValue('serviceDescription',service.serviceDescription||'');setServiceFormValue('serviceActive',service.active===false?'0':'1');}
async function saveEditedService(serviceId){const service=(state.services||[]).find(s=>String(s.id)===String(serviceId));if(!service){alert('تعذر العثور على الخدمة.');return;}
const data=readServiceForm();if(!validateServiceForm(data,serviceId))return;pushAppUndo();const preservedCode=service.serviceCode||service.id||serviceId;['salePrice','cost','currency','taxRate','unit','durationValue','durationUnit','responsibleDepartment','notes']
.forEach(key=>delete service[key]);Object.assign(service,data,{serviceCode:preservedCode,updatedAt:new Date().toISOString(),updatedBy:currentUserDisplayName()
});servicesCatalog=state.services;try{await save();}catch(_){return;}salesList('editservice');}
async function deleteServiceConfig(serviceId){const service=(state.services||[]).find(s=>String(s.id)===String(serviceId));if(!service||!confirm('حذف الخدمة؟'))return;pushAppUndo();state.services=state.services.filter(s=>String(s.id)!==String(serviceId));servicesCatalog=state.services;try{await save();}catch(_){return;}salesList('editservice');}
function nextCustomerId(){return 'CUST/'+crypto.randomUUID();}
function renderNewCustomerForm(hostOverride){const host=hostOverride||document.getElementById('salesDynamic');if(!host)return;newCustomerSecondaryContactCounter=0;host.innerHTML=`
  <div class="panel">
   <div class="toolbar" style="padding:12px;margin:0">
    <div class="toolbar-left">
     <h3 style="margin:0">إضافة عميل جديد</h3>
     <span class="muted">بطاقة عميل كاملة</span>
    </div>
   </div>

   <div class="customer-form-section">
    <h4>البيانات الأساسية</h4>
    <div class="customer-form-grid">
     <div class="field">
      <label>نوع العميل <span class="customer-required">*</span></label>
      <select id="newCustomerType">
       <option value="company">شركة / مؤسسة</option>
       <option value="person">فرد</option>
      </select>
     </div>
     <div class="field">
      <label>اسم العميل / عربي <span class="customer-required">*</span></label>
      <input id="newCustomerName" placeholder="الاسم الذي سيظهر في النظام">
     </div>
<div class="field"><label>اسم العميل / إنكليزي</label><input id="newCustomerNameEn" dir="ltr" maxlength="500" placeholder="English name"></div>
     <div class="field">
      <label>الاسم القانوني</label>
      <input id="newCustomerLegalName" placeholder="الاسم المسجل رسميًا">
     </div>
     <div class="field">
      <label>مجال العمل</label>
      <input id="newCustomerIndustry" placeholder="مثال: أغذية، عقارات، تجارة...">
     </div>
     <div class="field">
      <label>الموقع الإلكتروني</label>
      <input id="newCustomerWebsite" placeholder="www.example.com">
     </div>
     <div class="field">
      <label>حالة العميل</label>
      <select id="newCustomerActive">
       <option value="1">نشط</option>
       <option value="0">غير نشط</option>
      </select>
     </div>
    </div>
   </div>

   <div class="customer-form-section">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
     <h4 style="margin:0">بيانات التواصل</h4>
     <button type="button" class="btn" onclick="addSecondaryCustomerContact()">+ إضافة شخص تواصل آخر</button>
    </div>

    <div class="customer-form-grid three" style="margin-top:14px">
     <div class="field">
      <label>الشخص المسؤول الأساسي</label>
      <input id="newCustomerContact" placeholder="مثال: المدير العام">
     </div>
     <div class="field">
      <label>المسمى الوظيفي</label>
      <input id="newCustomerJobTitle" placeholder="مدير عام، مدير مشتريات، مدير تسويق...">
     </div>
     <div class="field">
      <label>الهاتف الرئيسي</label>
      <input id="newCustomerPhone" placeholder="+963 ...">
     </div>
     <div class="field">
      <label>هاتف إضافي</label>
      <input id="newCustomerAlternatePhone" placeholder="+963 ...">
     </div>
     <div class="field">
      <label>واتساب</label>
      <input id="newCustomerWhatsapp" placeholder="+963 ...">
     </div>
     <div class="field">
      <label>البريد الإلكتروني</label>
      <input id="newCustomerEmail" type="email" placeholder="name@company.com">
     </div>
     <div class="field">
      <label>طريقة التواصل المفضلة</label>
      <select id="newCustomerPreferredContact">
       <option value="واتساب">واتساب</option>
       <option value="هاتف">هاتف</option>
       <option value="بريد إلكتروني">بريد إلكتروني</option>
      </select>
     </div>
    </div>

    <div id="secondaryCustomerContacts" class="secondary-contacts-wrap"></div>
   </div>

   <div class="customer-form-section">
    <h4>العناوين</h4>
    <div class="customer-form-grid">
     <div class="field">
      <label>الدولة</label>
      <input id="newCustomerCountry" value="سوريا">
     </div>
     <div class="field">
      <label>المدينة</label>
      <input id="newCustomerCity">
     </div>
     <div class="field" style="grid-column:1/-1">
      <label>العنوان الرئيسي</label>
      <input id="newCustomerAddress">
     </div>
     <div class="field" style="grid-column:1/-1">
      <label>عنوان الفوترة</label>
      <input id="newCustomerBillingAddress" placeholder="إذا تركته فارغًا يعتمد العنوان الرئيسي">
     </div>
     <div class="field" style="grid-column:1/-1">
      <label>عنوان التسليم</label>
      <input id="newCustomerDeliveryAddress" placeholder="إذا تركته فارغًا يعتمد العنوان الرئيسي">
     </div>
    </div>
   </div>

   <div class="customer-form-section">
    <h4>الفوترة والبيانات القانونية</h4>
    <div class="customer-form-grid three">
     <div class="field">
      <label>الرقم الضريبي</label>
      <input id="newCustomerTaxNumber">
     </div>
     <div class="field">
      <label>السجل التجاري</label>
      <input id="newCustomerCommercialRegister">
     </div>
     <div class="field">
      <label>شروط السداد</label>
      <select id="newCustomerPaymentTerms">
       <option value="">بدون تحديد</option>
       <option value="نقداً">نقداً</option>
       <option value="7 أيام">7 أيام</option>
       <option value="15 يوم">15 يوم</option>
       <option value="30 يوم">30 يوم</option>
       <option value="45 يوم">45 يوم</option>
       <option value="60 يوم">60 يوم</option>
      </select>
     </div>
     <div class="field">
      <label>العملة الافتراضية</label>
      <select id="newCustomerCurrency">
       <option value="USD">USD</option>
       <option value="SYP">SYP</option>
       <option value="AED">AED</option>
       <option value="SAR">SAR</option>
       <option value="EUR">EUR</option>
      </select>
     </div>
    </div>
   </div>

   <div class="customer-form-section">
    <h4>بيانات المبيعات الداخلية</h4>
    <div class="customer-form-grid">
     <div class="field">
      <label>مسؤول المبيعات</label>
      <input id="newCustomerSalesperson" list="customerSalespeopleList" placeholder="الموظف المسؤول عن العميل"><datalist id="customerSalespeopleList">${salespersonDatalistOptions()}</datalist>
     </div>
     <div class="field">
      <label>مصدر العميل</label>
      <select id="newCustomerSource">
       <option value="">بدون تحديد</option>
       <option value="عميل سابق">عميل سابق</option>
       <option value="توصية">توصية</option>
       <option value="اتصال مباشر">اتصال مباشر</option>
       <option value="معرض">معرض</option>
       <option value="سوشال ميديا">سوشال ميديا</option>
       <option value="موقع إلكتروني">موقع إلكتروني</option>
       <option value="أخرى">أخرى</option>
      </select>
     </div>
     <div class="field" style="grid-column:1/-1">
      <label>ملاحظات داخلية</label>
      <textarea id="newCustomerNotes" rows="4" placeholder="أي معلومات مهمة عن العميل أو طريقة التعامل معه"></textarea>
     </div>
    </div>
   </div>

   <div class="customer-form-actions">
    <button class="btn primary" onclick="saveNewCustomer()">حفظ العميل</button>
    <button class="btn" onclick="salesList('customergroup')">إلغاء الأمر</button>
   </div>
  </div>`;const nameEl=document.getElementById('newCustomerName');if(nameEl)nameEl.focus();}
let newCustomerSecondaryContactCounter=0;function addSecondaryCustomerContact(prefill=null){const host=document.getElementById('secondaryCustomerContacts');if(!host)return;const id=++newCustomerSecondaryContactCounter;const data=prefill||{};const card=document.createElement('div');card.className='secondary-contact-card';card.dataset.contactId=String(id);card.innerHTML=`
  <div class="secondary-contact-head">
   <b>شخص تواصل إضافي</b>
   <button type="button" class="secondary-contact-remove" onclick="removeSecondaryCustomerContact(${id})">حذف</button>
  </div>
  <div class="customer-form-grid three">
   <div class="field">
    <label>الاسم</label>
    <input data-secondary-field="name" value="${esc(data.name||'')}" placeholder="اسم الشخص">
   </div>
   <div class="field">
    <label>المسمى الوظيفي</label>
    <input data-secondary-field="jobTitle" value="${esc(data.jobTitle||'')}" placeholder="مدير عام، مدير مشتريات، مدير تسويق...">
   </div>
   <div class="field">
    <label>الهاتف</label>
    <input data-secondary-field="phone" value="${esc(data.phone||'')}" placeholder="+963 ...">
   </div>
   <div class="field">
    <label>واتساب</label>
    <input data-secondary-field="whatsapp" value="${esc(data.whatsapp||'')}" placeholder="+963 ...">
   </div>
   <div class="field">
    <label>البريد الإلكتروني</label>
    <input data-secondary-field="email" type="email" value="${esc(data.email||'')}" placeholder="name@company.com">
   </div>
  </div>
 `;host.appendChild(card);}
function removeSecondaryCustomerContact(id){const host=document.getElementById('secondaryCustomerContacts');if(!host)return;const card=host.querySelector(`.secondary-contact-card[data-contact-id="${id}"]`);if(card)card.remove();}
function collectSecondaryCustomerContacts(){const host=document.getElementById('secondaryCustomerContacts');if(!host)return[];const contacts=[];const cards=[...host.querySelectorAll('.secondary-contact-card')];for(const card of cards){const getField=name=>card.querySelector(`[data-secondary-field="${name}"]`);const contact={name:(getField('name')?.value||'').trim(),jobTitle:(getField('jobTitle')?.value||'').trim(),phone:(getField('phone')?.value||'').trim(),whatsapp:(getField('whatsapp')?.value||'').trim(),email:(getField('email')?.value||'').trim()
};const hasAny=Object.values(contact).some(Boolean);if(!hasAny)continue;if(!contact.name){alert('اكتب اسم شخص التواصل الإضافي أو احذف البطاقة الفارغة.');getField('name')?.focus();return null;}
if(contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)){alert('البريد الإلكتروني لشخص التواصل الإضافي غير صحيح.');getField('email')?.focus();return null;}
contacts.push(contact);}
return contacts;}
async function saveNewCustomer(){if(!hasPermission('createCustomers')){alert('لا تملك صلاحية إضافة عميل.');return;}const get=id=>document.getElementById(id);const nameAr=(get('newCustomerName')?.value||'').trim(),nameEn=(get('newCustomerNameEn')?.value||'').trim(),name=nameAr||nameEn;if(!name){alert('أدخل اسم العميل بالعربية أو الإنكليزية.');get('newCustomerName')?.focus();return;}
if(getCatalogCustomerByName(name)){alert('يوجد عميل بهذا الاسم مسبقًا. استخدم تعديل معلومات عميل.');get('newCustomerName')?.focus();get('newCustomerName')?.select();return;}
const email=(get('newCustomerEmail')?.value||'').trim();if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert('البريد الإلكتروني غير صحيح.');get('newCustomerEmail')?.focus();return;}
const address=(get('newCustomerAddress')?.value||'').trim();const billingAddress=(get('newCustomerBillingAddress')?.value||'').trim()||address;const deliveryAddress=(get('newCustomerDeliveryAddress')?.value||'').trim()||address;const secondaryContacts=collectSecondaryCustomerContacts();if(secondaryContacts===null)return;const customer={id:nextCustomerId(),type:get('newCustomerType')?.value||'company',name,nameAr,nameEn,legalName:(get('newCustomerLegalName')?.value||'').trim()||name,industry:(get('newCustomerIndustry')?.value||'').trim(),contact:(get('newCustomerContact')?.value||'').trim(),jobTitle:(get('newCustomerJobTitle')?.value||'').trim(),phone:(get('newCustomerPhone')?.value||'').trim(),alternatePhone:(get('newCustomerAlternatePhone')?.value||'').trim(),whatsapp:(get('newCustomerWhatsapp')?.value||'').trim(),email,website:(get('newCustomerWebsite')?.value||'').trim(),country:(get('newCustomerCountry')?.value||'').trim(),city:(get('newCustomerCity')?.value||'').trim(),address,billingAddress,deliveryAddress,taxNumber:(get('newCustomerTaxNumber')?.value||'').trim(),commercialRegister:(get('newCustomerCommercialRegister')?.value||'').trim(),paymentTerms:get('newCustomerPaymentTerms')?.value||'',currency:get('newCustomerCurrency')?.value||'USD',salesperson:(get('newCustomerSalesperson')?.value||'').trim(),source:get('newCustomerSource')?.value||'',preferredContact:get('newCustomerPreferredContact')?.value||'واتساب',notes:(get('newCustomerNotes')?.value||'').trim(),active:get('newCustomerActive')?.value!=='0',createdAt:new Date().toISOString(),createdBy:currentUserDisplayName(),secondaryContacts
};pushAppUndo();state.customers.push(customer);customersCatalog=state.customers;try{await save();}catch(_){return;}const marketingModal=document.getElementById('r39MarketingCustomerModal');if(marketingModal){marketingModal.remove();window.MoshMarketingCustomer25?.restoreSales?.();window.MoshMarketingV33?.openDashboard?.();}else salesList('customergroup');}
function renderSalesHome(){currentQuoteId=null;document.getElementById('crumb').innerHTML='<b style="cursor:pointer" onclick="renderSalesHome()">قسم المبيعات</b>';document.getElementById('salesDynamic').innerHTML=`
    <div class="panel">
      <div class="toolbar" style="padding:14px;margin:0">
        <div class="toolbar-left"><h2 style="margin:0">قسم المبيعات</h2></div>
      </div>
      <div class="empty">اختر من القوائم العلوية.</div>
    </div>`;}
function renderQuotationList(addHistory=true){workingQuote=null;if(addHistory&&currentQuoteId!==null)pushHistory({type:'quote',id:currentQuoteId});currentQuoteId=null;currentSalesMode='quotes';const allQuotes=state.quotations.filter(q=>q.status!=='order'&&q.status!=='cancel'),result=filterAndPageAppList('quotes',allQuotes,q=>[q.number,q.title,q.customer,q.salesperson,q.salesTeam,q.status,quoteTotals(q).total].join(' ')),quotes=result.items;document.getElementById('crumb').innerHTML='<b style="cursor:pointer" onclick="renderSalesHome()">قسم المبيعات</b> / عروض الأسعار';document.getElementById('salesDynamic').innerHTML=`<div class="toolbar"><div class="toolbar-left"><button class="btn primary" onclick="newQuote()">+ جديد</button><h2 style="margin:0">عروض الأسعار</h2></div><div class="toolbar-right"><button class="btn">⚙ الفلاتر</button><button class="btn">تجميع حسب</button><button class="btn">☷ قائمة</button><button class="btn">▦ كانبان</button></div></div><div class="panel"><table class="list-table"><thead><tr><th>الرقم</th><th>العنوان</th><th>تاريخ الإنشاء</th><th>العميل</th><th>مندوب المبيعات</th><th>فريق المبيعات</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>${quotes.map(q=>{let t=quoteTotals(q);return `<tr class="data" onclick="openQuote('${esc(q.id)}')"><td>${q.number}</td><td>${esc(q.title||'-')}</td><td>${esc(reportQuoteDate(q)||'—')}</td><td>${esc(q.customer)}</td><td>${esc(q.salesperson)}</td><td>${esc(q.salesTeam)}</td><td>${money(t.total)}</td><td><span class="status ${q.status}">${q.status==='draft'?'عرض سعر':q.status==='sent'?'عرض سعر مرسل':q.status==='order'?'عرض سعر موافق':'عرض سعر ملغي'}</span></td></tr>`}).join('')}</tbody></table>${result.total?'':'<div class="empty">لا يوجد عروض أسعار مطابقة.</div>'}${appListPagerHtml('quotes',result,{placeholder:'بحث بالرقم، العميل، المندوب...'})}</div>`}
function renderOrdersList(addHistory=true){workingQuote=null;currentSalesMode='orders';if(addHistory&&currentQuoteId!==null)pushHistory({type:'quote',id:currentQuoteId});currentQuoteId=null;const allOrders=state.quotations.filter(q=>q.status==='order'),result=filterAndPageAppList('orders',allOrders,q=>[q.number,q.title,q.customer,q.salesperson,q.salesTeam,q.invoiceCreated?'تمت الفوترة':'بانتظار الفوترة',quoteTotals(q).total].join(' ')),orders=result.items;document.getElementById('crumb').innerHTML='<b style="cursor:pointer" onclick="renderSalesHome()">قسم المبيعات</b> / عرض سعر موافق';document.getElementById('salesDynamic').innerHTML=`<div class="toolbar"><div class="toolbar-left"><h2 style="margin:0">عرض سعر موافق</h2></div><div class="toolbar-right"><button class="btn">الفلاتر</button><button class="btn">تجميع حسب</button></div></div><div class="panel"><table class="list-table"><thead><tr><th>الرقم</th><th>العنوان</th><th>العميل</th><th>تاريخ الطلب</th><th>مندوب المبيعات</th><th>الإجمالي</th><th>حالة الفاتورة</th></tr></thead><tbody>${orders.map(q=>{let t=quoteTotals(q);return `<tr class="data" onclick="openQuote('${esc(q.id)}')"><td>${q.number}</td><td>${esc(q.title||'-')}</td><td>${esc(q.customer)}</td><td>${esc(reportQuoteDate(q)||'—')}</td><td>${esc(q.salesperson)}</td><td>${money(t.total)}</td><td><span class="status ${q.invoiceCreated?'order':'draft'}">${q.invoiceCreated?'تمت الفوترة':'بانتظار الفوترة'}</span></td></tr>`}).join('')}</tbody></table>${result.total?'':'<div class="empty">لا يوجد عروض سعر موافقة مطابقة.</div>'}${appListPagerHtml('orders',result,{placeholder:'بحث بالعميل، الرقم، المندوب...'})}</div>`}
function renderCancelledQuotesList(addHistory=true){workingQuote=null;currentSalesMode='cancelledquotes';if(addHistory&&currentQuoteId!==null)pushHistory({type:'quote',id:currentQuoteId});currentQuoteId=null;const allCancelled=state.quotations.filter(q=>q.status==='cancel'),result=filterAndPageAppList('cancelledquotes',allCancelled,q=>[q.number,q.title,q.customer,q.salesperson,q.salesTeam,quoteTotals(q).total].join(' ')),cancelled=result.items;document.getElementById('crumb').innerHTML='<b style="cursor:pointer" onclick="renderSalesHome()">قسم المبيعات</b> / عرض سعر ملغي';document.getElementById('salesDynamic').innerHTML=`<div class="toolbar"><div class="toolbar-left"><h2 style="margin:0">عرض سعر ملغي</h2></div><div class="toolbar-right"><button class="btn">الفلاتر</button><button class="btn">تجميع حسب</button></div></div><div class="panel"><table class="list-table"><thead><tr><th>الرقم</th><th>العنوان</th><th>تاريخ الإنشاء</th><th>العميل</th><th>مندوب المبيعات</th><th>فريق المبيعات</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>${cancelled.map(q=>{let t=quoteTotals(q);return `<tr class="data" onclick="openQuote('${esc(q.id)}')"><td>${q.number}</td><td>${esc(q.title||'-')}</td><td>${esc(reportQuoteDate(q)||'—')}</td><td>${esc(q.customer)}</td><td>${esc(q.salesperson)}</td><td>${esc(q.salesTeam)}</td><td>${money(t.total)}</td><td><span class="status cancel">ملغي</span></td></tr>`}).join('')}</tbody></table>${result.total?'':'<div class="empty">لا يوجد عروض سعر ملغية مطابقة.</div>'}${appListPagerHtml('cancelledquotes',result,{placeholder:'بحث بالعميل، الرقم، المندوب...'})}</div>`}
function newQuote(){pushAppUndo();const id='QUOTE/'+crypto.randomUUID(),nextNumber=(state.quotations||[]).reduce((max,q)=>Math.max(max,Number(String(q.number||'').match(/(\d+)$/)?.[1])||0),0)+1;state.quotations.push({id,number:'S'+String(nextNumber).padStart(5,'0'),title:'',status:'draft',customer:'',invoiceAddress:'',deliveryAddress:'',createdAt:new Date().toISOString(),template:(defaultQuoteTemplate()?.name||''),expiration:'',pricelist:'القائمة العامة',paymentTerms:'',salesperson:'محمد',salesTeam:'المبيعات',company:'Mosh Group',onlineSignature:false,onlinePayment:false,prepayment:0,deliveryDate:'',fiscalPosition:'',customerReference:'',sourceDocument:'',campaign:'',medium:'',source:'',lines:[],optional:[],notes:'',quoteBuilder:{headers:[],footers:[]},quoteFollowup:'',salesFollowup:'',followupNotes:[],chatter:[]
});unsavedNewQuoteId=id;openQuote(id);}
function openQuote(id,addHistory=true,preserveDraft=false){if(addHistory){if(currentSalesMode==='orders')pushHistory({type:'orders'});else pushHistory({type:'quotes'});}
currentQuoteId=id;const savedQ=state.quotations.find(x=>String(x.id)===String(id));if(!savedQ)return;if(!preserveDraft || !workingQuote || String(workingQuote.id)!==String(id)){workingQuote=JSON.parse(JSON.stringify(savedQ));setDirtyState(false);}
const q=workingQuote;if(!q.customerInfo)q.customerInfo=findCustomer(q.customer);if(!Array.isArray(q.followupNotes))q.followupNotes=[];document.getElementById('crumb').innerHTML=`<b style="cursor:pointer" onclick="renderSalesHome()">قسم المبيعات</b> / ${q.status==='order'?'عرض سعر موافق':q.status==='cancel'?'عرض سعر ملغي':'عروض الأسعار'} / ${q.number}`;let totals=quoteTotals(q);const statusText=q.status==='draft'?'عرض سعر':q.status==='sent'?'عرض سعر مرسل':q.status==='order'?'عرض سعر موافق':'عرض سعر ملغي';document.getElementById('salesDynamic').innerHTML=`
 <div class="form-shell">
  <div class="form-main">
   <div class="form-card">
    <div class="actionbar">
      <button class="btn save-btn" onclick="saveQuoteForm()">حفظ</button>

      ${q.status!=='cancel'?`<button class="btn red" onclick="cancelQuote()">إلغاء الأمر</button>`:''}
      <button class="btn red" style="margin-inline-start:auto" onclick="deleteQuote()">حذف</button>
      
      <button class="btn" onclick="previewQuote()">معاينة</button>
      ${q.status==='order'&&currentSalesMode==='orders'&&!getSalesTaskForOrder(q.id)?`<button class="btn primary" onclick="openSalesTaskModal()">إنشاء مهمة مبيعات</button>`:''}
      
      
    </div>
    <div class="form-head">
      <div class="doc-title">
       <div><div class="muted">${statusText}</div><h2>${q.number}</h2></div>
       <div class="statebar">
        <button class="state ${q.status!=='order'&&q.status!=='cancel'?'active':''}" style="cursor:pointer;font-family:inherit" onclick="setDocumentStage('quote')">عرض سعر</button>
        <button class="state ${q.status==='order'?'active':''}" style="cursor:pointer;font-family:inherit" onclick="setDocumentStage('order')">موافق</button>
        ${String(unsavedNewQuoteId)===String(q.id)?'':`<button class="state ${q.status==='cancel'?'active':''}" style="cursor:pointer;font-family:inherit" onclick="setDocumentStage('cancel')">ملغي</button>`}
       </div>
       ${q.status==='order' && getOrderBillingStatus(q.id)?`<div style="margin-top:8px"><span class="task-badge ${getOrderBillingStatus(q.id)==='تمت الفوترة'?'done':'wait'}">${getOrderBillingStatus(q.id)}</span></div>`:''}
      </div>
    </div>
    <div class="form-body">
      <div class="field-grid">
       <div class="field" style="grid-column:1 / -1"><label>عنوان عرض السعر</label><input id="fQuoteTitle" value="${esc(q.title||'')}" onfocus="pushQuoteUndo()" oninput="updateWorkingField('title',this.value)"></div>
       <div class="field"><label>العميل</label>
         <select id="fCustomer" onchange="handleCustomerChange(this.value)">
           <option value="">اختر العميل</option>
           ${customerOptions(q.customer)}
         </select>
       </div>
       <div class="field"><label>${q.status==='order'?'تاريخ التثبيت':'تاريخ عرض السعر'}</label><input id="fDocDate" class="mosh-date" type="text" placeholder="YYYY-MM-DD" value="${q.deliveryDate||''}" onfocus="pushQuoteUndo();this.type='date';this.showPicker&&this.showPicker()" onchange="updateWorkingField('deliveryDate',this.value)" onblur="if(!this.value)this.type='text'"></div>
       <div class="field" style="grid-column:1 / -1"><label>معلومات العميل</label><div id="fCustomerInfo" class="customer-info-box">${esc(customerInfoText(q.customerInfo || findCustomer(q.customer))).replace(/\n/g,'<br>')}</div></div>
       <div class="field"><label>تاريخ التسليم</label><input id="fExpiration" class="mosh-date" type="text" placeholder="YYYY-MM-DD" value="${q.expiration||''}" onfocus="pushQuoteUndo();this.type='date';this.showPicker&&this.showPicker()" onchange="updateWorkingField('expiration',this.value)" onblur="if(!this.value)this.type='text'"></div>
       <div class="field"><label>شروط السداد</label><input id="fPaymentTerms" value="${esc(q.paymentTerms)}" onfocus="pushQuoteUndo()" oninput="updateWorkingField('paymentTerms',this.value)"></div>
      </div>

      <div class="tabs">
       <button class="tab active" onclick="switchTab('orderLines',this)">بنود الطلب</button>
       <button class="tab" onclick="switchTab('optionalProducts',this)">الخدمات الاختيارية</button>
       <button class="tab" onclick="switchTab('otherInfo',this)">معلومات أخرى</button>
       <button class="tab" onclick="switchTab('quoteBuilder',this)">منشئ PDF</button>
      </div>

      <div id="orderLines" class="tabpage active">
       <table class="lines">
        <thead><tr><th>الخدمة</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>خصم %</th><th>ضريبة %</th><th>التكلفة</th><th>المجموع</th><th></th></tr></thead>
        <tbody id="lineRows">${renderLines(q)}</tbody>
       </table>
       <div class="line-actions">
        <button class="link-btn" onclick="addProductLine()">+ إضافة خدمة</button>
        
        <button class="link-btn" onclick="addNoteLine()">+ إضافة ملاحظة</button>
        <button class="link-btn" title="السعر يُحدد داخل عرض السعر ولا يؤخذ من بطاقة الخدمة">كتالوج الخدمات</button>
       </div>
       <div class="totals">
        <div class="totalbox">
         <div class="totalrow"><span>الإجمالي قبل الضريبة</span><b id="subtotal">${money(totals.subtotal)}</b></div>
         <div class="totalrow"><span>الضرائب</span><b id="taxTotal">${money(totals.tax)}</b></div>
         <div class="totalrow big"><span>الإجمالي</span><b id="grandTotal">${money(totals.total)}</b></div>
         <div class="totalrow"><span>الهامش</span><b id="marginTotal">${money(totals.margin)} (${totals.marginPct.toFixed(1)}%)</b></div>
        </div>
       </div>
       <div class="field" style="grid-template-columns:1fr;margin-top:18px"><label>ملاحظات وشروط</label><textarea id="fNotes" rows="4" onfocus="pushQuoteUndo()" oninput="updateWorkingField('notes',this.value)">${esc(q.notes)}</textarea></div>

      </div>

      <div id="optionalProducts" class="tabpage">
       <table class="lines"><thead><tr><th>الخدمة الاختيارية</th><th>الكمية</th><th>سعر الوحدة</th></tr></thead>
       <tbody>${q.optional.map((o,i)=>`<tr><td><input value="${esc(o.product)}" onchange="updOptional(${i},'product',this.value)"></td><td><input type="number" value="${o.qty}" onchange="updOptional(${i},'qty',this.value)"></td><td><input type="number" value="${o.price}" onchange="updOptional(${i},'price',this.value)"></td></tr>`).join('')}</tbody></table>
       <div class="line-actions"><button class="link-btn" onclick="addOptional()">+ إضافة خدمة اختياري</button></div>
      </div>

      <div id="otherInfo" class="tabpage">
       <div class="info-grid">
        <div class="info-box"><h4>المبيعات</h4>
         <div class="field"><label>مندوب المبيعات</label>
          <input id="fSalesperson" list="quoteSalespeopleList" value="${esc(q.salesperson)}" onfocus="pushQuoteUndo()" oninput="updateWorkingField('salesperson',this.value)">
          <datalist id="quoteSalespeopleList">${salespersonDatalistOptions()}</datalist>
         </div>
         <div class="field" style="margin-top:8px"><label>فريق المبيعات</label>
          <input id="fSalesTeam" list="quoteSalesTeamsList" value="${esc(q.salesTeam)}" onfocus="pushQuoteUndo()" oninput="updateWorkingField('salesTeam',this.value)">
          <datalist id="quoteSalesTeamsList">${salesTeamDatalistOptions()}</datalist>
         </div>
         <div class="field" style="margin-top:8px"><label>خيار قالب عرض السعر</label>
          <select id="fQuoteTemplate" onfocus="pushQuoteUndo()" onchange="applyQuoteTemplate(this.value)">
           ${quoteTemplateSelectOptions(q.template||'')}
          </select>
         </div>
         <div class="field" style="margin-top:8px"><label>الشركة</label><input id="fCompany" value="${esc(q.company)}" onfocus="pushQuoteUndo()" oninput="updateWorkingField('company',this.value)"></div>
         <div style="margin-top:10px"><label><input id="fSignature" type="checkbox" ${q.onlineSignature?'checked':''} onchange="pushQuoteUndo();updateWorkingField('onlineSignature',this.checked)"> توقيع إلكتروني</label></div>
         <div style="margin-top:8px"><label><input id="fPayment" type="checkbox" ${q.onlinePayment?'checked':''} onchange="pushQuoteUndo();updateWorkingField('onlinePayment',this.checked)"> دفع إلكتروني</label></div>
        </div>
       </div>
      </div>

      <div id="quoteBuilder" class="tabpage">
       <div class="builder-box"><b>رؤوس PDF</b><p class="muted">اختيار أغلفة أو صفحات افتتاحية تُدمج مع عرض السعر.</p><button class="btn" onclick="toggleBuilder('header')">+ إضافة رأس PDF</button></div>
       <div class="builder-box"><b>تذييلات PDF</b><p class="muted">الشروط العامة أو صفحات ختامية تُدمج بعد تفاصيل العرض.</p><button class="btn" onclick="toggleBuilder('footer')">+ إضافة تذييل PDF</button></div>
       <div class="muted">المحدد حاليًا: ${(q.quoteBuilder.headers||[]).join('، ')||'لا شيء'} / ${(q.quoteBuilder.footers||[]).join('، ')||'لا شيء'}</div>
      </div>
    </div>
   </div>
  </div>

  <div>
   <section class="notes-panel">
    <div class="notes-head"><span>الملاحظات</span><button class="btn" onclick="addFollowupNote()">تسجيل ملاحظة</button></div>
    <div class="notes-body">
     ${(q.followupNotes||[]).map((n,i)=>`<div class="followup-note">
       <div class="followup-note-head">
         <span>ملاحظة ${i+1}</span>
         <button class="followup-note-delete" onclick="deleteFollowupNote(${i})" title="حذف">×</button>
       </div>
       <textarea placeholder="اكتب الملاحظة هنا..." onfocus="pushQuoteUndo()" oninput="updateFollowupNote(${i},this.value)">${esc(n.text||'')}</textarea>
     </div>`).join('')}
    </div>
   </section>

   <section class="activities-panel" id="activitiesPanel">
    <div class="activity-head">
     <span>النشاطات</span>
     <button class="activity-toggle" onclick="toggleActivities()">فتح ▼</button>
    </div>
    <div class="activity-body">
     <div class="chatter-tools"><button class="btn">جدولة نشاط</button></div>
     ${(q.chatter||[]).slice().reverse().map(m=>`<div class="message"><div class="meta">${esc(m.who)} • ${esc(m.time)}</div>${esc(m.text)}</div>`).join('')}
    </div>
   </section>
  </div>
 </div>`;refreshSaveButtons();}
function renderLines(q){return q.lines.map((l,i)=>{if(l.type==='section')return `<tr><td colspan="8"><input style="font-weight:800;color:var(--gold2)" value="${esc(l.description)}" onchange="updateLine(${i},'description',this.value)"></td><td><button class="btn" onclick="delLine(${i})">×</button></td></tr>`;if(l.type==='note')return `<tr><td colspan="8"><input style="font-style:italic" value="${esc(l.description)}" onchange="updateLine(${i},'description',this.value)"></td><td><button class="btn" onclick="delLine(${i})">×</button></td></tr>`;const sub=Number(l.qty||0)*Number(l.price||0)*(1-Number(l.discount||0)/100)*(1+Number(l.tax||0)/100);return `<tr>
   <td><input value="${esc(l.product)}" onchange="updateLine(${i},'product',this.value)"></td>
   <td><input value="${esc(l.description)}" onchange="updateLine(${i},'description',this.value)"></td>
   <td><input type="number" value="${l.qty===''?'':l.qty}" onchange="updateLine(${i},'qty',this.value)"></td>
   <td><input type="number" value="${l.price}" onchange="updateLine(${i},'price',this.value)"></td>
   <td><input type="number" value="${l.discount}" onchange="updateLine(${i},'discount',this.value)"></td>
   <td><input type="number" value="${l.tax}" onchange="updateLine(${i},'tax',this.value)"></td>
   <td><input type="number" value="${l.cost}" onchange="updateLine(${i},'cost',this.value)"></td>
   <td>${money(sub)}</td><td><button class="btn" onclick="delLine(${i})">×</button></td>
  </tr>`;}).join('');}
function switchTab(id,btn){document.querySelectorAll('.tabpage').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active')}
function addProductLine(){setDirtyState(true);const q=getQ();pushQuoteUndo();q.lines.push({type:'product',product:'',description:'',qty:'',price:0,discount:0,tax:0,cost:0});openQuote(q.id,false,true)}
function addSectionLine(){const q=getQ();q.lines.push({type:'section',description:'قسم جديد'});openQuote(q.id,false,true)}
function addNoteLine(){setDirtyState(true);const q=getQ();pushQuoteUndo();q.lines.push({type:'note',description:''});openQuote(q.id,false,true)}
function delLine(i){setDirtyState(true);const q=getQ();pushQuoteUndo();q.lines.splice(i,1);openQuote(q.id,false,true)}
function updateLine(i,k,v){setDirtyState(true);const q=getQ();pushQuoteUndo();q.lines[i][k]=['qty','price','discount','tax','cost'].includes(k)?(v===''?'':Number(v)):v;openQuote(q.id,false,true)
}
function addOptional(){setDirtyState(true);const q=getQ();pushQuoteUndo();q.optional.push({product:'',qty:'',price:0});openQuote(q.id,false,true)}
function updOptional(i,k,v){setDirtyState(true);const q=getQ();pushQuoteUndo();q.optional[i][k]=['qty','price'].includes(k)?(v===''?'':Number(v)):v}
function pushAppUndo(){const activeView=document.querySelector('.view.active');appUndoStack.push({state:JSON.parse(JSON.stringify(state)),workingQuote:workingQuote?JSON.parse(JSON.stringify(workingQuote)):null,currentQuoteId:currentQuoteId,unsavedNewQuoteId:unsavedNewQuoteId,currentSalesMode:currentSalesMode,activeView:activeView?activeView.id:'dashboardApp',crumb:document.getElementById('crumb')?document.getElementById('crumb').innerHTML:''
});if(appUndoStack.length>100)appUndoStack.shift();}
function pushQuoteUndo(){pushAppUndo();}
async function undoLastEdit(){if(!appUndoStack.length)return;const snap=appUndoStack[appUndoStack.length-1];appUndoStack.pop();setDirtyState(true);workingQuote=snap.workingQuote?JSON.parse(JSON.stringify(snap.workingQuote)):null;currentQuoteId=snap.currentQuoteId;unsavedNewQuoteId=snap.unsavedNewQuoteId;currentSalesMode=snap.currentSalesMode||'quotes';document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));const target=document.getElementById(snap.activeView)||document.getElementById('dashboardApp');if(target)target.classList.add('active');if(currentQuoteId!==null){const sales=document.getElementById('salesApp');if(sales){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));sales.classList.add('active');}
openQuote(currentQuoteId,false,true);return;}
if(snap.activeView==='accountingApp'){renderInvoices();}else if(snap.activeView==='adminApp'){renderDepartmentTasks('الإدارة','adminAppTasks');}else if(snap.activeView==='tasksApp'){renderAllTasks();}else if(snap.activeView==='hrApp'){refreshProductiveView('hr');}else if(snap.activeView==='designApp'){refreshProductiveView('design');}else if(snap.activeView==='photoApp'){refreshProductiveView('photo');}else if(snap.activeView==='editingApp'){refreshProductiveView('editing');}else if(snap.activeView==='marketingApp'){refreshProductiveView('marketing');}else if(snap.activeView==='purchasesApp'){renderDepartmentTasks('المشتريات','purchasesAppTasks');}else if(snap.activeView==='promotionApp'){refreshProductiveView('promotion');}else if(snap.activeView==='logisticsApp'){renderDepartmentTasks('اللوجستيات','logisticsAppTasks');}else if(snap.activeView==='salesApp'){if(currentSalesMode==='orders')renderOrdersList(false);else if(currentSalesMode==='cancelledquotes')renderCancelledQuotesList(false);else if(currentSalesMode==='quotes')renderQuotationList(false);else renderSalesHome();}else if(snap.activeView==='dashboardApp'){goMainMenu();}else if(snap.crumb && document.getElementById('crumb')){document.getElementById('crumb').innerHTML=snap.crumb;}
}
function applyQuoteTemplate(templateName){if(!workingQuote)return;const template=(state.quoteTemplates||[]).find(t=>t.active!==false && t.name===templateName);updateWorkingField('template',templateName);if(!template)return;if(template.defaultNotes && !String(workingQuote.notes||'').trim()){workingQuote.notes=template.defaultNotes;const notes=document.getElementById('fNotes');if(notes)notes.value=template.defaultNotes;}
if(template.validityDays && !String(workingQuote.expiration||'').trim()){const days=Number(template.validityDays)||0;if(days>0){const base=workingQuote.deliveryDate?new Date(workingQuote.deliveryDate+'T12:00:00'):new Date();base.setDate(base.getDate()+days);const p=n=>String(n).padStart(2,'0');workingQuote.expiration=`${base.getFullYear()}-${p(base.getMonth()+1)}-${p(base.getDate())}`;const expiration=document.getElementById('fExpiration');if(expiration)expiration.value=workingQuote.expiration;}
}
markQuoteDirty();}
function updateWorkingField(key,value){const q=getQ();if(!q)return;q[key]=value;setDirtyState(true);}
function getQ(){return workingQuote}
function getSavedQ(){return state.quotations.find(x=>String(x.id)===String(currentQuoteId))}
function appendFollowupLog(q,text,target){if(!q)return;const key = target ||(q.status==='order' ? 'salesFollowup':'quoteFollowup');q[key]= q[key]|| '';q[key]+=(q[key]? '\n':'')+ '• ' + text;}
function syncQuoteFormToWorking(){const q=getQ();if(!q)return null;const map={title:'fQuoteTitle',customer:'fCustomer',expiration:'fExpiration',deliveryDate:'fDocDate',paymentTerms:'fPaymentTerms',notes:'fNotes',salesperson:'fSalesperson',salesTeam:'fSalesTeam',company:'fCompany'
};Object.entries(map).forEach(([k,id])=>{const el=document.getElementById(id);if(el)q[k]=el.value});q.customerInfo=findCustomer(q.customer);if(!q.paymentTerms && q.customerInfo && q.customerInfo.paymentTerms)q.paymentTerms=q.customerInfo.paymentTerms;const sig=document.getElementById('fSignature'),pay=document.getElementById('fPayment');if(sig)q.onlineSignature=sig.checked;if(pay)q.onlinePayment=pay.checked;return q;}
async function saveQuoteForm(){const q=syncQuoteFormToWorking();if(!q)return;const savedBefore=getSavedQ();if(!savedBefore)return;pushAppUndo();const oldStatus=savedBefore.status;const newStatus=q.status;q.chatter=q.chatter||[];if(oldStatus!==newStatus){if(newStatus==='cancel'){q.chatter.push({who:currentUserDisplayName(),text:'تم نقل عرض السعر إلى قائمة عرض سعر ملغي.',time:activityTimestamp()});appendFollowupLog(q,'تم إلغاء عرض السعر.','quoteFollowup');}else if(newStatus==='order'){if(!q.deliveryDate)q.deliveryDate=todayStr();q.chatter.push({who:currentUserDisplayName(),text:'تم اعتماد عرض السعر ونقله إلى قائمة عرض سعر موافق.',time:activityTimestamp()});appendFollowupLog(q,'تم اعتماد عرض السعر ونقله إلى قائمة عرض سعر موافق.','quoteFollowup');}else if(newStatus==='draft'){q.chatter.push({who:currentUserDisplayName(),text:'تم إعادة المستند إلى حالة عرض سعر.',time:activityTimestamp()});appendFollowupLog(q,'تم إعادة المستند إلى حالة عرض سعر.','quoteFollowup');}
}else{q.chatter.push({who:currentUserDisplayName(),text:'تم حفظ التعديلات.',time:activityTimestamp()});appendFollowupLog(q,'تم حفظ تعديلات على المستند.');}
const idx=state.quotations.findIndex(x=>String(x.id)===String(q.id));if(idx<0)return;state.quotations[idx]=JSON.parse(JSON.stringify(q));try{await save();}catch(_){return;}if(String(unsavedNewQuoteId)===String(q.id))unsavedNewQuoteId=null;setDirtyState(false);workingQuote=null;currentQuoteId=null;if(newStatus==='cancel')renderCancelledQuotesList(false);else if(newStatus==='order')renderOrdersList(false);else renderQuotationList(false);}
function handleCustomerChange(name){const q=getQ();if(q){pushQuoteUndo();setDirtyState(true);q.customer=name;q.customerInfo=findCustomer(name);if(q.customerInfo && q.customerInfo.paymentTerms)q.paymentTerms=q.customerInfo.paymentTerms;}
const info = findCustomer(name);const infoBox = document.getElementById('fCustomerInfo');const pay = document.getElementById('fPaymentTerms');if(infoBox)infoBox.innerHTML = esc(customerInfoText(info)).replace(/\n/g,'<br>');if(pay)pay.value = info.paymentTerms || '';}
function openEmail(){const q=getSavedQ();document.getElementById('emailTo').value='';document.getElementById('emailSubject').value=`عرض سعر ${q.number} من MOSH GROUP`;document.getElementById('emailBody').value=`مرحباً،\nمرفق عرض السعر ${q.number} للاطلاع والموافقة.\nمع التحية`;document.getElementById('emailModal').classList.add('show')
}
async function markSent(){const q=getSavedQ();if(!q)return;try{await MoshApi.flush();const result=await MoshApi.request('/quotations/'+encodeURIComponent(q.id)+'/email',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:{to:document.getElementById('emailTo').value,subject:document.getElementById('emailSubject').value,body:document.getElementById('emailBody').value}});Object.assign(q,result.quotation);await MoshApi.refresh();closeModal('emailModal');workingQuote=null;openQuote(q.id,false);}catch(error){MoshApi.showError(error);}}
function setDocumentStage(stage){const q=getQ();if(!q)return;const nextStatus=
stage==='cancel' ? 'cancel':stage==='order' ? 'order':'draft';if(q.status===nextStatus)return;pushQuoteUndo();q.status=nextStatus;if(nextStatus==='order' && !q.deliveryDate){q.deliveryDate=todayStr();}
setDirtyState(true);openQuote(q.id,false,true);}
function confirmQuote(){setDocumentStage('order');}
function cancelQuote(){setDirtyState(false);const id=currentQuoteId;if(id!==null && unsavedNewQuoteId!==null && String(id)===String(unsavedNewQuoteId))pushAppUndo();if(id!==null && unsavedNewQuoteId!==null && String(id)===String(unsavedNewQuoteId)){state.quotations=state.quotations.filter(x=>String(x.id)!==String(id));unsavedNewQuoteId=null;}
workingQuote=null;currentQuoteId=null;renderQuotationList(false);}
function deleteQuote(){const id=currentQuoteId;pushAppUndo();if(id===null)return;const idx=state.quotations.findIndex(x=>String(x.id)===String(id));if(idx===-1)return;state.quotations.splice(idx,1);if(unsavedNewQuoteId!==null && String(unsavedNewQuoteId)===String(id))unsavedNewQuoteId=null;workingQuote=null;currentQuoteId=null;save();renderQuotationList(false);}
async function duplicateQuote(){pushAppUndo();const q=getSavedQ(),id='QUOTE/'+crypto.randomUUID(),nextNumber=(state.quotations||[]).reduce((max,x)=>Math.max(max,Number(String(x.number||'').match(/(\d+)$/)?.[1])||0),0)+1;const n=JSON.parse(JSON.stringify(q));n.id=id;n.number='S'+String(nextNumber).padStart(5,'0');n.status='draft';n.invoiceCreated=false;n.chatter=[{who:'النظام',text:'تم إنشاء نسخة من '+q.number,time:activityTimestamp()}];state.quotations.push(n);await save();workingQuote=null;openQuote(id,false)
}
const departmentTaskFilters={};const supportRequestFilters={purchase:{status:'open',assignee:'all'},logistics:{status:'open',assignee:'all'}};let supportRequestDraft={taskId:null,type:'purchase',files:[]};const productiveTaskViewModes={admin:'distribution',sales:'distribution',hr:'distribution',design:'distribution',marketing:'distribution',photo:'distribution',editing:'distribution',promotion:'distribution'};const productiveRunningFilters={admin:{employee:'all',status:'all'},sales:{employee:'all',status:'all'},hr:{employee:'all',status:'all'},design:{employee:'all',status:'all'},marketing:{employee:'all',status:'all'},photo:{employee:'all',status:'all'},editing:{employee:'all',status:'all'},promotion:{employee:'all',status:'all'}
};const hrStaffFilters={department:'all',status:'active',role:'all'};let hrStaffFormOpen=false;let hrStaffEditingId='';function normalizeStaffName(v){return String(v||'').trim()}
function getStaffProfileByName(name){const n=normalizeStaffName(name);return n?(state.staffProfiles||[]).find(p=>normalizeStaffName(p.name)===n)||null:null;}
function getStaffProfileById(id){const key=String(id||'');return key?(state.staffProfiles||[]).find(p=>String(p.id)===key)||null:null;}
function staffEmploymentStatus(profile){if(!profile)return 'inactive';if(['draft','active','inactive','resigned'].includes(profile.employmentStatus))return profile.employmentStatus;return profile.active===false?'inactive':'active';}
function isStaffAssignable(profile){return !!profile && staffEmploymentStatus(profile)==='active';}
function staffStatusLabel(profile){return{draft:'مسودة',active:'نشط',inactive:'غير نشط',resigned:'مستقيل'
}[staffEmploymentStatus(profile)]||'غير نشط';}
function getDepartmentStaff(department){return(state.staffProfiles||[])
.filter(p=>isStaffAssignable(p)&&p.department===department)
.slice()
.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'));}
function getDepartmentManager(department){
 if(!department)return null;
 const managerId=String(state.departmentManagers?.[department]||'');
 const mapped=managerId?getStaffProfileById(managerId):null;
 // A render is a read, never an instruction to delete or invent assignments.
 if(mapped&&isStaffAssignable(mapped))return mapped;
 if(window.MoshApi)return null;
 return (state.staffProfiles||[]).find(p=>isStaffAssignable(p)&&p.department===department&&p.isManager)||null;
}
function getManagedDepartmentsForStaff(profileOrId){const profile=typeof profileOrId==='object'?profileOrId:getStaffProfileById(profileOrId);if(!profile)return[];const id=String(profile.id||'');return Object.entries(state.departmentManagers||{}).filter(([,managerId])=>String(managerId)===id).map(([department])=>department);}
function staffManagesDepartment(profileOrId,department){const profile=typeof profileOrId==='object'?profileOrId:getStaffProfileById(profileOrId);return !!profile&&!!department&&String((state.departmentManagers||{})[department]||'')===String(profile.id||'');}
function staffManagesAnyDepartment(profileOrId){return getManagedDepartmentsForStaff(profileOrId).length>0;}
function refreshLegacyManagerFlags(){(state.staffProfiles||[]).forEach(p=>{p.isManager=isStaffAssignable(p)&&staffManagesAnyDepartment(p);});}
function getDirectManagerName(employeeName,department){return normalizeStaffName(getDepartmentManager(department)?.name);}
function resetTaskReviewWorkflow(t){t.reviewManager='';t.returnedForRevision=false;if('approvalRoute' in t)delete t.approvalRoute;if('approvalIndex' in t)delete t.approvalIndex;if('reviewState' in t)delete t.reviewState;if('managerFinalPending' in t)delete t.managerFinalPending;}
function resetTaskApprovalWorkflow(t){resetTaskReviewWorkflow(t)}
function ensureTaskWorkTiming(t){if(!t)return null;if(!t.workTiming || typeof t.workTiming!=='object' || Array.isArray(t.workTiming)){t.workTiming={totalMs:0,activeStartedAt:0,activeWorker:'',receivedAt:0,finishedAt:0,sessions:[]};}
const w=t.workTiming&&typeof t.workTiming==='object'&&!Array.isArray(t.workTiming)?t.workTiming:t.work_timing;if(!Array.isArray(w.sessions))w.sessions=[];if(w.totalMs!=null&&w.totalMs!==''&&Number.isFinite(Number(w.totalMs))&&Number(w.totalMs)>=0)w.totalMs=Number(w.totalMs);if(w.activeStartedAt===undefined)w.activeStartedAt=0;w.activeWorker=String(w.activeWorker||'');if(w.receivedAt===undefined)w.receivedAt=0;if(w.finishedAt===undefined)w.finishedAt=0;if(!w.activity || typeof w.activity!=='object' || Array.isArray(w.activity))w.activity={};const a=w.activity;a.lastActivityAt=Number(a.lastActivityAt)||0;a.warningAt=Number(a.warningAt)||0;a.idleMs=Number(a.idleMs)||0;a.awayWorkMs=Number(a.awayWorkMs)||0;a.manualPauseCount=Number(a.manualPauseCount)||0;a.autoIdleCount=Number(a.autoIdleCount)||0;a.returnCount=Number(a.returnCount)||0;if(!Array.isArray(a.pauseLog))a.pauseLog=[];if(!a.pendingIdle || typeof a.pendingIdle!=='object' || Array.isArray(a.pendingIdle))a.pendingIdle=null;return w;}
function taskActualWorkMs(t,now=window.MoshApi?.serverNow?.()||Date.now()){return t?MoshWorkdayModel50.taskTiming(t,now).totalElapsedMs:0;}
function formatTaskWorkDuration(ms){if(ms==null||ms===''||!Number.isFinite(Number(ms))||Number(ms)<0)return '—';const total=Math.max(0,Math.floor(Number(ms)/1000));const h=Math.floor(total/3600);const m=Math.floor((total%3600)/60);const s=total%60;return[h,m,s].map(v=>String(v).padStart(2,'0')).join(':');}
function startTaskWorkSession(t,worker,now=Date.now()){const w=ensureTaskWorkTiming(t);if(!w||w.activeStartedAt)return false;w.activeStartedAt=Number(now);w.activeWorker=normalizeStaffName(worker||t.assignee||currentUserDisplayName());w.activity.lastActivityAt=Number(now);w.activity.warningAt=0;return true;}
function closeTaskWorkSession(t,reason='paused',now=Date.now()){const w=ensureTaskWorkTiming(t);if(!w||!w.activeStartedAt)return 0;const end=Number(now);const duration=MoshWorkdayModel50.elapsed(w.activeStartedAt,end,MoshWorkdayModel50.LIVE_LIMIT);if(!Number.isFinite(duration))return 0;const worker=w.activeWorker||normalizeStaffName(t.assignee||'');const workerProfile=getStaffProfileByName(worker);w.sessions.push({startAt:w.activeStartedAt,endAt:end,durationMs:duration,worker,workerId:workerProfile?.id||'',reason
});w.totalMs+=duration;w.activeStartedAt=0;w.activeWorker='';return duration;}
function taskEmployeeWorkTotals(t,now=window.MoshApi?.serverNow?.()||Date.now()){const w=ensureTaskWorkTiming(t);if(!w)return[];const totals=new Map();const resolveIdentity=(name,id)=>{const rawName=normalizeStaffName(name||'');let profile=null;if(id)profile=getStaffProfileById(String(id));if(!profile&&rawName)profile=getStaffProfileByName(rawName);const employeeId=profile?.id||id||'';const employeeName=normalizeStaffName(profile?.name||rawName||'')||'غير محدد';const key=profile?.id?`id:${String(profile.id)}`:`name:${employeeName.toLowerCase()}`;return{key,employeeId,employeeName};};const add=(name,id,ms)=>{const ident=resolveIdentity(name,id);const current=totals.get(ident.key)||{employeeId:ident.employeeId,employeeName:ident.employeeName,workedMs:0,sessionCount:0};if(!current.employeeId&&ident.employeeId)current.employeeId=ident.employeeId;if(current.employeeName==='غير محدد'&&ident.employeeName!=='غير محدد')current.employeeName=ident.employeeName;current.workedMs+=Math.max(0,Number(ms)||0);current.sessionCount+=1;totals.set(ident.key,current);};(w.sessions||[]).forEach(session=>add(session.worker,session.workerId,session.durationMs));if(t.employeeState==='working'){const live=MoshWorkdayModel50.elapsed(w.activeStartedAt,now,MoshWorkdayModel50.LIVE_LIMIT);if(Number.isFinite(live)){const worker=w.activeWorker||normalizeStaffName(t.assignee||'');const profile=getStaffProfileByName(worker);add(worker,w.activeWorkerId||profile?.id||'',live);}}
return Array.from(totals.values()).sort((a,b)=>b.workedMs-a.workedMs);}
function taskEmployeeCostBasis(t,now=Date.now()){return taskEmployeeWorkTotals(t,now).map(row=>({employeeId:row.employeeId,employeeName:row.employeeName,workedMs:row.workedMs,workedHours:row.workedMs/3600000,sessionCount:row.sessionCount
}));}
function taskEmployeeTimeBreakdownHtml(t){const rows=taskEmployeeWorkTotals(t);if(!rows.length)return '';return rows.map(row=>`<span class="task-manager-chip">${esc(row.employeeName)} <b>${formatTaskWorkDuration(row.workedMs)}</b></span>`).join('');}
function taskWorkTimingSummaryHtml(t){return `<span class="task-manager-chip">وقت العمل الفعلي <b data-task-work-time="${esc(t.id)}">${formatTaskWorkDuration(taskActualWorkMs(t))}</b></span>${taskEmployeeTimeBreakdownHtml(t)}`;}
function refreshVisibleTaskWorkTimers(){document.querySelectorAll('[data-task-work-time]').forEach(el=>{const id=el.getAttribute('data-task-work-time');const task=(state.salesTasks||[]).find(t=>String(t.id)===String(id));if(task)el.textContent=formatTaskWorkDuration(taskActualWorkMs(task));});document.querySelectorAll('[data-task-employee-time]').forEach(el=>{const taskId=el.getAttribute('data-task-employee-time');const employeeId=String(el.getAttribute('data-employee-id')||'');const employeeName=normalizeStaffName(el.getAttribute('data-employee-name')||'');const task=(state.salesTasks||[]).find(t=>String(t.id)===String(taskId));if(!task)return;const rows=taskEmployeeWorkTotals(task);const row=rows.find(r=>employeeId&&String(r.employeeId||'')===employeeId)
||rows.find(r=>normalizeStaffName(r.employeeName||'')===employeeName);if(row)el.textContent=formatTaskWorkDuration(row.workedMs);});}
const TASK_IDLE_WARNING_MS=5*60*1000;const TASK_IDLE_AUTO_PAUSE_MS=10*60*1000;let lastTaskActivitySignalAt=0;function taskActivityStats(t){const w=ensureTaskWorkTiming(t);const a=w?.activity||{};return{idleMs:Number(a.idleMs)||0,awayWorkMs:Number(a.awayWorkMs)||0,manualPauseCount:Number(a.manualPauseCount)||0,autoIdleCount:Number(a.autoIdleCount)||0,returnCount:Number(a.returnCount)||0,pendingIdle:a.pendingIdle||null
};}
function taskActivitySummaryHtml(t){const w=ensureTaskWorkTiming(t);const a=taskActivityStats(t);const pending=a.pendingIdle?'<span class="workflow-status returned">خمول غير مصنّف</span>':'';const warning=(w?.activity?.warningAt&&w.activeStartedAt)?'<span class="workflow-status review">تنبيه: لا يوجد نشاط منذ أكثر من 5 دقائق</span>':'';return `<span class="task-manager-chip">توقف يدوي <b>${a.manualPauseCount}</b></span>
  <span class="task-manager-chip">خمول تلقائي <b>${a.autoIdleCount}</b></span>
  <span class="task-manager-chip">مرات الرجوع <b>${a.returnCount}</b></span>
  <span class="task-manager-chip">وقت خمول <b>${formatTaskWorkDuration(a.idleMs)}</b></span>
  <span class="task-manager-chip">عمل خارج الكمبيوتر <b>${formatTaskWorkDuration(a.awayWorkMs)}</b></span>${warning}${pending}`;}
function registerTaskUserActivity(now=Date.now()){if(Number(now)-lastTaskActivitySignalAt<1500)return;lastTaskActivitySignalAt=Number(now);(state.salesTasks||[]).forEach(t=>{const w=ensureTaskWorkTiming(t);if(!w?.activeStartedAt || t.employeeState!=='working')return;w.activity.lastActivityAt=Number(now);w.activity.warningAt=0;});}
function taskIdleCheck(now=Date.now()){let changed=false;(state.salesTasks||[]).forEach(t=>{const w=ensureTaskWorkTiming(t);if(!w?.activeStartedAt || t.employeeState!=='working')return;const a=w.activity;const last=MoshWorkdayModel50.epoch(a.lastActivityAt)||MoshWorkdayModel50.epoch(w.activeStartedAt)||Number(now);const idleFor=Math.max(0,Number(now)-last);if(idleFor>=TASK_IDLE_WARNING_MS && !a.warningAt){a.warningAt=Number(now);changed=true;}
if(idleFor<TASK_IDLE_AUTO_PAUSE_MS)return;const cutoff=last+TASK_IDLE_AUTO_PAUSE_MS;closeTaskWorkSession(t,'auto_idle',cutoff);t.employeeState='paused';a.autoIdleCount+=1;a.pendingIdle={fromAt:cutoff,detectedAt:Number(now),employeeName:normalizeStaffName(t.assignee||'')};t.history=t.history||[];t.history.push({text:`تم إيقاف الوقت تلقائياً بعد 10 دقائق بدون نشاط على الكمبيوتر للموظف ${t.assignee||''}.`,time:activityTimestamp(),by:'النظام'
});changed=true;});if(changed){save();refreshVisibleTaskWorkTimers();}
}
function resolveTaskIdleReturn(id,containerId,department,workedAway){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id));if(!t)return;const w=ensureTaskWorkTiming(t);const a=w.activity;const pending=a.pendingIdle;if(!pending)return;pushAppUndo();const now=Date.now();const idleDuration=Math.max(0,now-Number(pending.fromAt||now));if(workedAway){const reason=(prompt('اكتب سبب العمل بعيداً عن الكمبيوتر (مثال: اتصال عميل، اجتماع، تصوير):','عمل خارج الكمبيوتر')||'عمل خارج الكمبيوتر').trim();const worker=normalizeStaffName(t.assignee||pending.employeeName||'');const workerProfile=getStaffProfileByName(worker);w.sessions.push({startAt:Number(pending.fromAt)||now,endAt:now,durationMs:idleDuration,worker,workerId:workerProfile?.id||'',reason:'away_work',note:reason
});w.totalMs+=idleDuration;a.awayWorkMs+=idleDuration;t.history=t.history||[];t.history.push({text:`سجّل ${worker} ${formatTaskWorkDuration(idleDuration)} كعمل بعيد عن الكمبيوتر — ${reason}.`,time:activityTimestamp(),by:worker});}else{a.idleMs+=idleDuration;t.history=t.history||[];t.history.push({text:`تم اعتماد ${formatTaskWorkDuration(idleDuration)} كوقت خمول غير محتسب ضمن العمل.`,time:activityTimestamp(),by:t.assignee||currentUserDisplayName()});}
a.pendingIdle=null;a.returnCount+=1;a.lastActivityAt=now;a.warningAt=0;t.employeeState='working';startTaskWorkSession(t,t.assignee,now);save();openDepartmentTaskDetails(t.id,containerId,department);}
function taskIdleReturnControlsHtml(t,containerId,department){const a=ensureTaskWorkTiming(t)?.activity;if(!a?.pendingIdle)return '';return `<div class="task-manager-section">
  <div class="task-manager-section-title">رجوع بعد خمول</div>
  <div class="task-manager-row actions-only">
   <button type="button" class="btn primary" onclick="resolveTaskIdleReturn(${MoshTaskUI.arg(t.id)},'${containerId}','${department}',false)">رجعت للعمل</button>
   <button type="button" class="btn" onclick="resolveTaskIdleReturn(${MoshTaskUI.arg(t.id)},'${containerId}','${department}',true)">كنت أعمل بعيداً عن الكمبيوتر</button>
   <span class="workflow-status returned">الوقت متوقف تلقائياً حتى تصنّف فترة الغياب</span>
  </div>
 </div>`;}
['mousemove','keydown','click','scroll','touchstart'].forEach(evt=>{document.addEventListener(evt,()=>registerTaskUserActivity(),{passive:true});});setInterval(taskIdleCheck,30000);function workflowEmployeeLabel(t){if(window.MoshReceiptModel49&&(t?.returnedForRevision||['new','received'].includes(t?.employeeState)))return MoshReceiptModel49.label(t);if(!t)return '-';if(t.status==='awaiting_invoice')return 'بانتظار الفوترة';if(t.status==='invoiced'||t.status==='archived_invoiced')return 'تمت الفوترة';if(t.status==='archived_no_invoice')return 'غير بحاجة للفوترة';if(t.department==='المهمات'&&!t.assignee)return 'ضمن المهمات';if(!t.assignee)return 'مهمة جديدة — بانتظار توزيع المدير';if(t.employeeState==='received')return 'تم استلام المهمة';if(t.employeeState==='working')return t.returnedForRevision?'جارٍ العمل — تعديل':'جارٍ العمل';if(t.employeeState==='paused')return t.returnedForRevision?'متوقفة مؤقتاً — للتعديل':'إيقاف مؤقت';if(t.employeeState==='submitted'){return t.assignmentMode==='manager_self'
? 'منتهية — بانتظار قرار المدير'
:'منتهية — عند المدير للمراجعة';}
if(t.employeeState==='finished')return 'مهمة منتهية';return 'بانتظار استلام المهمة';}
function workflowStatusClass(t){if(!t||!t.assignee)return 'new';if(t.employeeState==='received')return 'new';if(t.employeeState==='working')return t.returnedForRevision?'returned':'working';if(t.employeeState==='paused')return t.returnedForRevision?'returned':'review';if(t.employeeState==='submitted')return 'review';if(t.employeeState==='finished')return 'done';return 'new';}
function r37AssignableProfile(employeeName,department,field=null){
 const invalid=message=>{const el=typeof field==='string'?document.getElementById(field):field;if(el&&window.MoshValidation09)MoshValidation09.report([[el,message]]);else window.MoshUI19?.toast(message);return null;};
 const name=normalizeStaffName(employeeName);
 if(!name)return invalid('اختر الموظف المنفذ.');
 const profile=getStaffProfileByName(name);
 if(!profile||!profile.id){return invalid('اختر موظفاً مسجلاً في الموارد البشرية وله معرّف صحيح.');}
 if(!isStaffAssignable(profile)){return invalid('لا يمكن إسناد المهمة إلى موظف غير نشط.');}
 const manager=getDepartmentManager(department);
 if(profile.department!==department&&String(manager?.id||'')!==String(profile.id)){
  return invalid('الموظف المختار ليس ضمن قسم '+departmentDisplayName(department)+'.');
 }
 return profile;
}
function assignTaskWorkflow(t,employeeName){
 const profile=r37AssignableProfile(employeeName,t.department);if(!profile)return false;
 const name=normalizeStaffName(profile.name),old=t.assignee||'';
 if(old&&(old!==name||String(t.assigneeId||'')!==String(profile.id)))closeTaskWorkSession(t,'reassigned');
 t.assignee=name;t.assigneeId=String(profile.id);t.assignmentMode='manager_assigned';t.employeeState='new';resetTaskReviewWorkflow(t);
 t.history=t.history||[];t.history.push({text:old&&old!==name?`تم تغيير منفذ المهمة من ${old} إلى ${name}.`:`وزّع مدير القسم المهمة على ${name}.`,time:activityTimestamp(),by:currentUserDisplayName()});
 return true;
}
function managerTakeTaskSelf(id,containerId,department){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id));if(!t||t.status!=='in_progress')return;const manager=getDepartmentManager(t.department);if(!manager){alert('حدد مدير القسم أولاً من الموارد البشرية.');return;}
pushAppUndo();closeTaskWorkSession(t,'reassigned_to_manager');t.assignee=normalizeStaffName(manager.name);t.assigneeId=String(manager.id);t.assignmentMode='manager_self';t.employeeState='new';resetTaskReviewWorkflow(t);t.history=t.history||[];t.history.push({text:`اختار مدير القسم ${manager.name} تنفيذ المهمة بنفسه.`,time:activityTimestamp(),by:currentUserDisplayName()
});save();openDepartmentTaskDetails(t.id,containerId,department);}
function employeeReceiveTask(id,containerId,department){
 if(!window.MoshTaskInbox49)return Promise.resolve(false);
 return window.MoshTaskInbox49.perform('receive',id).then(ok=>{
  if(ok&&containerId&&document.getElementById(containerId)&&!document.getElementById('emp47TaskOverlay')?.classList.contains('show'))openDepartmentTaskDetails(id,containerId,department);
  return ok;
 });
}
function employeeStartTask(id,containerId,department){
 if(!window.MoshTaskInbox49)return Promise.resolve(false);
 return window.MoshTaskInbox49.perform('start',id).then(ok=>{
  if(ok&&containerId&&document.getElementById(containerId)&&!document.getElementById('emp47TaskOverlay')?.classList.contains('show'))openDepartmentTaskDetails(id,containerId,department);
  return ok;
 });
}
function employeePauseTask(id,containerId,department){
 if(!window.MoshTaskInbox49)return Promise.resolve(false);
 return window.MoshTaskInbox49.perform('pause',id).then(ok=>{
  if(ok&&containerId&&document.getElementById(containerId)&&!document.getElementById('emp47TaskOverlay')?.classList.contains('show'))openDepartmentTaskDetails(id,containerId,department);
  return ok;
 });
}
function employeeSubmitTask(id,containerId,department){
 if(!window.MoshTaskInbox49)return Promise.resolve(false);
 return window.MoshTaskInbox49.perform('finish',id).then(ok=>{
  if(ok&&containerId&&document.getElementById(containerId)&&!document.getElementById('emp47TaskOverlay')?.classList.contains('show'))openDepartmentTaskDetails(id,containerId,department);
  return ok;
 });
}
function managerReturnTask(id,containerId,department){
 return window.MoshTaskInbox49?.requestReturn(id,containerId,department)||false;
}
function managerAssignTask(id,containerId,department){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id));if(!t||t.status!=='in_progress')return;const selected=normalizeStaffName(document.getElementById('managerAssignee_'+id)?.value);if(!selected){alert('اختر الموظف أو مدير القسم الذي سيعمل على المهمة.');return;}
const profile=getStaffProfileByName(selected);const manager=getDepartmentManager(t.department);if(!profile){alert('الاسم المختار غير موجود ضمن موظفي القسم. أضفه أولاً من قسم الموارد البشرية.');return;}
if(!isStaffAssignable(profile)){alert('هذا الموظف غير نشط أو مستقيل ولا يمكن توزيع مهام جديدة عليه.');return;}
const isDepartmentManager=!!manager && String(manager.id)===String(profile.id);if(profile.department!==t.department && !isDepartmentManager){alert('الموظف المختار تابع لقسم '+departmentDisplayName(profile.department)+' وليس ضمن قسم '+departmentDisplayName(t.department)+'.');return;}
pushAppUndo();if(isDepartmentManager){const old=t.assignee||'';if(old&&(old!==selected||String(t.assigneeId||'')!==String(profile.id)))closeTaskWorkSession(t,'reassigned_to_manager');t.assignee=selected;t.assigneeId=String(profile.id);t.assignmentMode='manager_self';t.employeeState='new';resetTaskReviewWorkflow(t);t.history=t.history||[];t.history.push({text:old&&old!==selected
?`تم تغيير منفذ المهمة من ${old} إلى مدير القسم ${selected}.`
:`تم توزيع المهمة على مدير القسم ${selected} للتنفيذ.`,time:activityTimestamp(),by:currentUserDisplayName()
});}else{if(!assignTaskWorkflow(t,selected)){appUndoStack.pop();return;}
}
save();const productiveKey=getProductiveContext(containerId,department);if(productiveKey&&productiveTaskViewModes[productiveKey]==='distribution'){openProductiveRunningTasksPage(productiveKey);}else{openDepartmentTaskDetails(t.id,containerId,department);}
}
function refreshManagerTransferTarget(id){const dep=document.getElementById('managerTransferDept_'+id)?.value||'';const wrap=document.getElementById('managerTransferAdminWrap_'+id),sel=document.getElementById('managerTransferAdmin_'+id);if(!wrap)return;wrap.style.display=dep==='الإدارة'?'grid':'none';if(dep==='الإدارة'&&sel){const people=getDepartmentStaff('الإدارة').filter(isStaffAssignable);sel.innerHTML='<option value="">— اختر المسؤول الإداري —</option>'+people.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}${p.jobTitle?` · ${esc(p.jobTitle)}`:''}</option>`).join('');}}
function managerTransferTask(id,containerId,oldDepartment){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id));if(!t||t.status!=='in_progress')return;const next=document.getElementById('managerTransferDept_'+id)?.value||'';if(!next||next===t.department){alert('اختر قسم مختلف للتحويل.');return;}const adminTarget=next==='الإدارة'?normalizeStaffName(document.getElementById('managerTransferAdmin_'+id)?.value):'';if(next==='الإدارة'&&!adminTarget){alert('اختر المدير أو المسؤول الإداري الذي ستوجّه إليه المهمة.');return;}
pushAppUndo();const prev=t.department;closeTaskWorkSession(t,'transferred');t.department=next;const adminProfile=next==='الإدارة'?getStaffProfileByName(adminTarget):null;t.assignee=next==='الإدارة'?adminTarget:'';t.assigneeId=next==='الإدارة'?(adminProfile?.id||''):'';t.assignmentMode=next==='الإدارة'?'direct':'manager';t.employeeState='new';resetTaskReviewWorkflow(t);t.reviewManager=next==='الإدارة'?'':t.reviewManager;t.history=t.history||[];const newManager=next==='الإدارة'?null:getDepartmentManager(next);t.history.push({text:`نُقلت نفس المهمة بكامل بياناتها ومرفقاتها من ${prev} إلى ${next}${next==='الإدارة'?` وتوجيهها مباشرة إلى ${adminTarget}`:newManager?` وأصبحت بعهدة مدير القسم ${newManager.name}`:''}.`,time:activityTimestamp(),by:currentUserDisplayName()
});save();if(containerId==='allTasksContainer'){activeTaskViewContext={source:'all',containerId:'allTasksContainer',department:''};openTaskDetails(t.id);}else if(refreshProductiveDepartmentAfterAction(containerId,oldDepartment)){}else{renderDepartmentTasks(oldDepartment,containerId);}
}
let pendingManagerFinishAction=null;function showManagerFinishMessage(title,text,meta='',canConfirm=false){const modal=document.getElementById('managerFinishConfirmModal');const titleEl=document.getElementById('managerFinishConfirmTitle');const textEl=document.getElementById('managerFinishConfirmText');const metaEl=document.getElementById('managerFinishConfirmMeta');const action=document.getElementById('managerFinishConfirmAction');const icon=document.getElementById('managerFinishConfirmIcon');if(!modal)return;if(titleEl)titleEl.textContent=title||'اعتماد وإنهاء للفوترة';if(textEl)textEl.textContent=text||'';if(metaEl){metaEl.textContent=meta||'';metaEl.style.display=meta?'block':'none';}
if(action)action.style.display=canConfirm?'inline-flex':'none';if(icon)icon.textContent=canConfirm?'✓':'!';modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
function closeManagerFinishConfirm(){const modal=document.getElementById('managerFinishConfirmModal');modal?.classList.remove('show');modal?.setAttribute('aria-hidden','true');pendingManagerFinishAction=null;}
function managerFinishAndInvoice(id,containerId,department){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id));if(!t){showManagerFinishMessage('تعذر تنفيذ الإجراء','لم أجد المهمة المطلوبة. أعد فتح المهمة وحاول مرة ثانية.');return false;}
if(t.status!=='in_progress'){showManagerFinishMessage('المهمة ليست قيد التنفيذ',`الحالة الحالية للمهمة هي: ${t.status||'غير محددة'}. لا يمكن إرسالها للفوترة مرة ثانية.`);return false;}
const subs=!t.parentTaskId?getSubTasks(t.id):[];const isPackage=subs.length>=2;const incomplete=subs.filter(st=>!isPackageSubTaskDone(st));if(isPackage&&incomplete.length){showManagerFinishMessage('الباقة غير مكتملة بعد',`لا يمكن إنهاء الباقة قبل اكتمال كل الخدمات الفرعية. المتبقي حالياً ${incomplete.length} من أصل ${subs.length}.`,incomplete.slice(0,5).map(st=>st.title||'خدمة فرعية').join(' · ')
);return false;}
if(isPackage){showManagerFinishMessage('إغلاق الباقة من المحاسبة','بعد اكتمال الخدمات ترجع المهمة الرئيسية إلى «المهمات»، وتبقى الباقة في «قائمة الباقات» بالمحاسبة. المحاسبة وحدها ترسلها إلى مهام بانتظار الفوترة.',`${MoshTaskUI.title(t)}`,false
);return false;}
pendingManagerFinishAction={id:String(t.id),containerId:String(containerId||''),department:String(department||t.department||'')
};const packageText=subs.length
?`هذه باقة تحتوي على ${subs.length} خدمات فرعية مكتملة. سيتم اعتماد الباقة الرئيسية وتحويلها للمحاسبة بانتظار الفوترة، وتبقى الخدمات الفرعية ضمن سجل الباقة.`
:'سيتم اعتماد المهمة وإنهاؤها من القسم الحالي وتحويل نفس المهمة إلى المحاسبة بانتظار الفوترة.';showManagerFinishMessage('اعتماد وإنهاء للفوترة',packageText,`${MoshTaskUI.title(t)} · ${t.customer||'بدون عميل'}`,true
);return false;}
function confirmManagerFinishAndInvoice(){const pending=pendingManagerFinishAction;if(!pending)return;const t=(state.salesTasks||[]).find(x=>String(x.id)===String(pending.id));if(!t||t.status!=='in_progress'){closeManagerFinishConfirm();return;}
const containerId=pending.containerId;const department=pending.department||t.department;pushAppUndo();closeTaskWorkSession(t,'manager_final_approval');t.status='awaiting_invoice';t.employeeState='finished';t.closedFromDepartment=t.department;t.department='المحاسبة';t.closedAt=activityTimestamp();t.closedBy=currentUserDisplayName();t.reviewManager='';t.returnedForRevision=false;t.history=t.history||[];t.history.push({text:getSubTasks(t.id).length
?'اعتمد مدير القسم الباقة بعد اكتمال خدماتها الفرعية، وتم تحويل المهمة الرئيسية إلى المحاسبة بانتظار الفوترة.'
:'اعتمد مدير القسم المهمة وأنهاها نهائيًا، وتم تحويل نفس المهمة إلى المحاسبة بانتظار الفوترة.',time:t.closedAt,by:currentUserDisplayName()
});save();closeManagerFinishConfirm();if(typeof renderBillingTasks==='function')renderBillingTasks();if(typeof renderAccountingPackages==='function')renderAccountingPackages();if(containerId==='allTasksContainer'){activeTaskViewContext={source:'all',containerId:'allTasksContainer',department:''};renderAllTasks();}else if(refreshProductiveDepartmentAfterAction(containerId,department)){}else if(containerId&&document.getElementById(containerId)){renderDepartmentTasks(department,containerId);}
}
function setDepartmentTaskFilter(department,containerId,filter){departmentTaskFilters[containerId]=filter||'all';renderDepartmentTasks(department,containerId);}
function departmentTaskBucket(t){if(t.employeeState==='submitted')return 'review';if(['received','working','paused'].includes(t.employeeState))return 'working';return 'new';}
function refreshStandaloneAssignmentUI(){const department=document.getElementById('standaloneTaskDepartment')?.value||'';const modeEl=document.getElementById('standaloneTaskAssignmentMode');const modeField=document.getElementById('standaloneAssignmentModeField');const field=document.getElementById('standaloneAssigneeField');const input=document.getElementById('standaloneTaskAssignee');const list=document.getElementById('standaloneStaffList');const administration=department==='الإدارة';const mode=modeEl?.value||'direct';if(modeField)modeField.style.display='grid';if(field)field.style.display=mode==='direct'?'grid':'none';window.MoshSharedDistribution32?.createDistributionUI(department,mode);if(mode!=='direct'&&input)input.value='';if(field){const label=field.querySelector('label');if(label)label.textContent=administration?'المسؤول الإداري':'الموظف المنفذ';}if(input)input.placeholder=administration?'اختر المدير أو المسؤول الإداري':'اختر موظف من القسم';if(input){const previous=input.value;const key=Object.keys(PRODUCTIVE_DEPARTMENTS).find(k=>PRODUCTIVE_DEPARTMENTS[k].department===department);const people=key?getProductiveAssignablePeople(key):getDepartmentStaff(department);input.innerHTML='<option value="">اختر المنفّذ</option>'+people.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');if([...input.options].some(option=>option.value===previous))input.value=previous;}}
function refreshSubTaskAssignmentUI(){const department=document.getElementById('subTaskDepartment')?.value||'';const mode=document.getElementById('subTaskAssignmentMode')?.value||'manager';const field=document.getElementById('subTaskAssigneeField');const input=document.getElementById('subTaskAssignee');const list=document.getElementById('subTaskStaffList');if(field)field.style.display=mode==='direct'?'grid':'none';if(mode!=='direct'&&input)input.value='';if(list)list.innerHTML=getDepartmentStaff(department).map(p=>`<option value="${esc(p.name)}"></option>`).join('');}
function nextStaffIdentity(){let max=0;(state.staffProfiles||[]).forEach(p=>{[p.id,p.employeeNo].forEach(v=>{const m=String(v||'').match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1])||0);});});const n=max+1;return{id:'EMP/'+String(n).padStart(5,'0'),employeeNo:'EMP-'+String(n).padStart(5,'0')
};}
function getStaffOpenTasks(profile){if(!profile)return[];const name=normalizeStaffName(profile.name);return(state.salesTasks||[]).filter(t=>
t.status==='in_progress' &&
normalizeStaffName(t.assignee)===name
);}
function getStaffTaskStats(profile){const tasks=getStaffOpenTasks(profile);return{total:tasks.length,new:tasks.filter(t=>(t.employeeState||'new')==='new').length,working:tasks.filter(t=>['received','working','paused'].includes(t.employeeState)).length,review:tasks.filter(t=>t.employeeState==='submitted').length
};}
function syncStaffHierarchyForDepartment(department){if(!department)return;const manager=getDepartmentManager(department);const managerName=normalizeStaffName(manager?.name);(state.staffProfiles||[]).forEach(p=>{if(p.department!==department)return;if(manager&&String(p.id)===String(manager.id))p.directManager='';else p.directManager=managerName||'';});(state.salesTasks||[]).forEach(t=>{if(t.department===department &&
t.status==='in_progress' &&
t.employeeState==='submitted' &&
t.assignmentMode!=='manager_self'
){t.reviewManager=managerName||'';}
});refreshLegacyManagerFlags();}
function syncAllStaffHierarchy(){const departments=new Set([...Object.keys(state.departmentManagers||{}),...(state.staffProfiles||[]).map(p=>p.department).filter(Boolean)
]);departments.forEach(syncStaffHierarchyForDepartment);refreshLegacyManagerFlags();}
function departmentManagerCandidates(){return(state.staffProfiles||[])
.filter(isStaffAssignable)
.slice()
.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'));}
function assignDepartmentManagerFromHR(department){const select=document.getElementById('hrDeptManager_'+department);if(!select)return;const selectedId=String(select.value||'');const selected=getStaffProfileById(selectedId);if(selected&&!isStaffAssignable(selected)){alert('لا يمكن تعيين موظف غير نشط أو مستقيل كمدير قسم.');return;}
const current=getDepartmentManager(department);if(String(current?.id||'')===String(selected?.id||'')){alert(selected?'هذا الموظف هو مدير القسم حالياً.':'القسم بدون مدير حالياً.');return;}
let message='';if(selected){message=`تعيين ${selected.name} مديراً لقسم ${departmentDisplayName(department)}؟`;if(current)message+=`\n\nسيتم استبدال المدير الحالي ${current.name} في هذا القسم فقط.`;const already=getManagedDepartmentsForStaff(selected)
.filter(d=>d!==department)
.map(departmentDisplayName);if(already.length){message+=`\n\n${selected.name} يدير أيضاً: ${already.join('، ')} وسيبقى مديراً عليها.`;}
}else{message=`إلغاء مدير قسم ${departmentDisplayName(department)}؟`;}
if(!confirm(message))return;pushAppUndo();state.departmentManagers=state.departmentManagers||{};if(selected){state.departmentManagers[department]=String(selected.id);selected.updatedAt=activityTimestamp();selected.updatedBy=currentUserDisplayName();}else{delete state.departmentManagers[department];}
syncStaffHierarchyForDepartment(department);save();renderStaffWorkflowConfig();}
function hrDepartmentManagersHtml(){const candidates=departmentManagerCandidates();return `<div class="panel hr-manager-panel">
  <div class="hr-manager-panel-head">
   <div>
    <h3>إدارة مدراء الأقسام</h3>
    <div class="muted">
     لكل قسم مدير واحد، ونفس الموظف النشط يمكنه إدارة أكثر من قسم. غير النشط والمستقيل لا يظهران ضمن خيارات الإدارة.
    </div>
   </div>
  </div>

  <div class="hr-manager-table-wrap">
   <table class="list-table hr-manager-table">
    <thead>
     <tr><th>القسم</th><th>المدير الحالي</th><th>اختيار المدير</th><th></th></tr>
    </thead>
    <tbody>
     ${salesTaskDepartments.filter(department=>department!=='الإدارة').map(department=>{const manager=getDepartmentManager(department);return `<tr>
       <td><b>${esc(departmentDisplayName(department))}</b></td>
       <td>
        <span class="hr-manager-current ${manager?'set':''}">
         ${manager?esc(manager.name):'غير محدد'}
        </span>
       </td>
       <td>
        <select id="hrDeptManager_${department}">
         <option value="">بدون مدير</option>
         ${candidates.map(p=>`<option value="${esc(p.id)}" ${String(manager?.id||'')===String(p.id)?'selected':''}>${esc(p.name)} · ${esc(departmentDisplayName(p.department||''))}${p.jobTitle?` · ${esc(p.jobTitle)}`:''}</option>`).join('')}
        </select>
       </td>
       <td><button type="button" class="btn" onclick="assignDepartmentManagerFromHR('${department}')">حفظ المدير</button></td>
      </tr>`;}).join('')}
    </tbody>
   </table>
  </div>
 </div>`;}
function setHrStaffFilter(type,value){if(type==='department')hrStaffFilters.department=value||'all';if(type==='status')hrStaffFilters.status=value||'active';if(type==='role')hrStaffFilters.role=value||'all';resetAppListPage('hr_staff');renderStaffWorkflowConfig();}
function openStaffEmployeeForm(id=''){hrStaffFormOpen=true;hrStaffEditingId=String(id||'');renderStaffWorkflowConfig();setTimeout(()=>{document.getElementById('staffName')?.focus();refreshStaffManagerPreview();toggleStaffStatusFields(false);},0);}
function closeStaffEmployeeForm(){hrStaffFormOpen=false;hrStaffEditingId='';renderStaffWorkflowConfig();}
function refreshStaffManagerPreview(){const dept=document.getElementById('staffDepartment')?.value||'';const box=document.getElementById('staffManagerPreview');if(!box)return;const manager=getDepartmentManager(dept);const editing=getStaffProfileById(hrStaffEditingId);const managed=editing?getManagedDepartmentsForStaff(editing):[];box.innerHTML=`
  ${manager
?`المدير المباشر حسب القسم الأساسي: <b>${esc(manager.name)}</b>`
:'<b>لا يوجد مدير معين لهذا القسم الأساسي حالياً.</b>'}
  ${managed.length
?`<div style="margin-top:5px">يدير حالياً: <b>${managed.map(departmentDisplayName).map(esc).join('، ')}</b></div>`
:''}`;}
function toggleStaffStatusFields(setDefault=true){const status=document.getElementById('staffEmploymentStatus')?.value||'active';const block=document.getElementById('staffResignationFields');if(block)block.style.display=status==='resigned'?'grid':'none';if(status==='resigned'&&setDefault){const date=document.getElementById('staffResignationDate');if(date&&!date.value){const d=new Date();const p=n=>String(n).padStart(2,'0');date.value=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
}
}
function openStaffWorkflowConfig(){const tasks=document.getElementById('hrAppContent');const staff=document.getElementById('hrStaffConfigContent');if(tasks)tasks.style.display='none';if(staff)staff.style.display='block';document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('show'));document.getElementById('crumb').innerHTML='<b>قسم الموارد البشرية</b> / إدارة الموظفين';hrStaffFormOpen=false;hrStaffEditingId='';renderStaffWorkflowConfig();}
function hrStaffStatusTabsHtml(all){const counts={active:all.filter(p=>staffEmploymentStatus(p)==='active').length,inactive:all.filter(p=>staffEmploymentStatus(p)==='inactive').length,resigned:all.filter(p=>staffEmploymentStatus(p)==='resigned').length,all:all.length
};const activeTab=hrStaffFilters.status||'active';return `<div class="hr-status-tabs">
  <button type="button" class="${activeTab==='active'?'active':''}" onclick="setHrStaffFilter('status','active')">النشطون <span>${counts.active}</span></button>
  <button type="button" class="${activeTab==='inactive'?'active':''}" onclick="setHrStaffFilter('status','inactive')">غير النشطين <span>${counts.inactive}</span></button>
  <button type="button" class="${activeTab==='resigned'?'active':''}" onclick="setHrStaffFilter('status','resigned')">المستقيلون <span>${counts.resigned}</span></button>
  <button type="button" class="${activeTab==='all'?'active':''}" onclick="setHrStaffFilter('status','all')">الكل <span>${counts.all}</span></button>
 </div>`;}
function staffDocumentCategoryOptions(selected=''){const categories=['شهادة علمية','شهادة خبرة','سيرة ذاتية CV','هوية / جواز سفر','عقد عمل','مستند إداري','أخرى'];return categories.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');}
async function addStaffDocuments(profileId,files){const profile=getStaffProfileById(profileId);const arr=Array.from(files||[]);if(!profile||!arr.length)return;const category=document.getElementById('staffDocumentCategory')?.value||'أخرى';const expiryDate=document.getElementById('staffDocumentExpiry')?.value||'';profile.documents=Array.isArray(profile.documents)?profile.documents:[];pushAppUndo();let added=0;const failed=[];for(let i=0;i<arr.length;i++){const file=arr[i];const key='staffdoc_'+profile.id+'_'+Date.now()+'_'+i+'_'+Math.random().toString(36).slice(2);try{await storeAttachmentRecord({key,scope:'staff_document',staffId:String(profile.id),name:file.name||'مستند',type:file.type||'application/octet-stream',size:file.size||0,blob:file,createdAt:new Date().toISOString()
});profile.documents.push({id:'DOC/'+Date.now()+'/'+i+'/'+Math.random().toString(36).slice(2,7),key,category,name:file.name||'مستند',type:file.type||'application/octet-stream',size:file.size||0,expiryDate,uploadedAt:activityTimestamp(),uploadedBy:currentUserDisplayName()
});added++;}catch(e){console.error('MOSH HR document upload failed',e);failed.push(file.name||'مستند');}
}
if(added){save();hrStaffFormOpen=true;hrStaffEditingId=String(profile.id);renderStaffWorkflowConfig();}
if(failed.length){alert('تعذر رفع: '+failed.join('، '));}
}
async function removeAttachmentRecord(key){return MoshApi.removeFile(key);}
async function deleteStaffDocument(profileId,documentId){const profile=getStaffProfileById(profileId);if(!profile)return;const doc=(profile.documents||[]).find(d=>String(d.id)===String(documentId));if(!doc)return;if(!confirm(`حذف المستند «${doc.name}» من ملف الموظف؟`))return;pushAppUndo();profile.documents=(profile.documents||[]).filter(d=>String(d.id)!==String(documentId));save();await removeAttachmentRecord(doc.key);hrStaffFormOpen=true;hrStaffEditingId=String(profile.id);renderStaffWorkflowConfig();}
async function openStaffDocument(key,name='',download=false){try{const rec=await getAttachmentRecord(key);if(!rec||!rec.blob){alert('الملف غير متاح.');return;}
const url=URL.createObjectURL(rec.blob);const a=document.createElement('a');a.href=url;if(download){a.download=name||rec.name||'document';}else{a.target='_blank';a.rel='noopener';}
document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){alert('تعذر فتح المستند.');}
}
function staffDocumentsHtml(profile){if(!profile){return `<div class="hr-document-empty">احفظ ملف الموظف أولاً، وبعدها يمكنك رفع الشهادات والعقود وباقي المستندات.</div>`;}
const docs=Array.isArray(profile.documents)?profile.documents:[];return `<div class="hr-documents-section">
  <div class="hr-documents-head">
   <div>
    <b>وثائق الموظف</b>
    <div class="muted">شهادات، CV، هوية أو جواز، عقد، وأي مستند إداري آخر.</div>
   </div>
   <span class="hr-doc-count">${docs.length} ملف</span>
  </div>

  <div class="hr-document-upload">
   <div>
    <label>نوع المستند</label>
    <select id="staffDocumentCategory">${staffDocumentCategoryOptions()}</select>
   </div>
   <div>
    <label>تاريخ انتهاء (اختياري)</label>
    <input id="staffDocumentExpiry" type="date">
   </div>
   <div class="hr-document-upload-button">
    <label>رفع ملف / ملفات</label>
    <button type="button" class="btn" onclick="document.getElementById('staffDocumentInput').click()">+ إضافة مستند</button>
    <input id="staffDocumentInput" type="file" multiple hidden onchange="addStaffDocuments('${profile.id}',this.files);this.value=''">
   </div>
  </div>

  ${docs.length?`<div class="hr-document-list">
   ${docs.slice().reverse().map(doc=>`<div class="hr-document-row">
    <div class="hr-document-icon">📄</div>
    <div class="hr-document-main">
     <b>${esc(doc.name||'مستند')}</b>
     <div class="muted">${esc(doc.category||'أخرى')} · ${formatAttachmentSize(doc.size||0)} · ${esc(doc.uploadedAt||'')}</div>
     ${doc.expiryDate?`<div class="hr-doc-expiry">انتهاء: ${esc(doc.expiryDate)}</div>`:''}
    </div>
    <div class="hr-document-actions">
     <button type="button" class="btn" onclick="openStaffDocument('${esc(doc.key)}','${esc(doc.name||'')}',false)">فتح</button>
     <button type="button" class="btn" onclick="openStaffDocument('${esc(doc.key)}','${esc(doc.name||'')}',true)">تحميل</button>
     <button type="button" class="btn hr-staff-delete" onclick="deleteStaffDocument('${profile.id}','${doc.id}')">حذف</button>
    </div>
   </div>`).join('')}
  </div>`:'<div class="hr-document-empty">لا يوجد مستندات مرفوعة لهذا الموظف بعد.</div>'}
 </div>`;}
function renderStaffWorkflowConfig(){const box=document.getElementById('staffWorkflowConfig');if(!box)return;syncAllStaffHierarchy();const all=(state.staffProfiles||[]).slice();const department=hrStaffFilters.department||'all';const status=hrStaffFilters.status||'active';const role=hrStaffFilters.role||'all';const filtered=all.filter(p=>{const manages=staffManagesAnyDepartment(p);const pStatus=staffEmploymentStatus(p);if(department!=='all'&&p.department!==department)return false;if(status!=='all'&&pStatus!==status)return false;if(role==='manager'&&!manages)return false;if(role==='employee'&&manages)return false;return true;});const result=filterAndPageAppList('hr_staff',filtered,p=>[p.employeeNo,p.name,p.jobTitle,p.department,p.phone,p.email,staffStatusLabel(p),getManagedDepartmentsForStaff(p).map(departmentDisplayName).join(' '),p.directManager,p.employmentType,...(p.documents||[]).map(d=>`${d.category||''} ${d.name||''}`)
].join(' '));const activeCount=all.filter(p=>staffEmploymentStatus(p)==='active').length;const inactiveCount=all.filter(p=>staffEmploymentStatus(p)==='inactive').length;const resignedCount=all.filter(p=>staffEmploymentStatus(p)==='resigned').length;const uniqueManagers=all.filter(p=>isStaffAssignable(p)&&staffManagesAnyDepartment(p)).length;const staffedDepartments=[...new Set(all.filter(isStaffAssignable).map(p=>p.department).filter(Boolean))];const unmanaged=staffedDepartments.filter(d=>!getDepartmentManager(d));const editing=getStaffProfileById(hrStaffEditingId);const newIdentity=nextStaffIdentity();const editingStatus=editing?staffEmploymentStatus(editing):'active';const form=hrStaffFormOpen?`
  <div class="panel hr-employee-form">
   <div class="toolbar" style="padding:0;margin-bottom:10px">
    <div>
     <h3 style="margin:0">${editing?'تعديل ملف الموظف':'إضافة موظف جديد'}</h3>
     <div class="muted" style="margin-top:4px">${editing?esc(editing.employeeNo||editing.id):esc(newIdentity.employeeNo)}</div>
    </div>
    <button type="button" class="btn" onclick="closeStaffEmployeeForm()">إغلاق</button>
   </div>

   <div class="hr-form-section-title">معلومات الموظف</div>
   <div class="field-grid">
    <div class="field"><label>رقم الموظف</label><input value="${esc(editing?.employeeNo||newIdentity.employeeNo)}" readonly></div>
    <div class="field"><label>اسم الموظف *</label><input id="staffName" value="${esc(editing?.name||'')}" autocomplete="off" placeholder="الاسم الكامل"></div>
    <div class="field"><label>القسم الأساسي *</label><select id="staffDepartment" onchange="refreshStaffManagerPreview()">${salesTaskDepartments.map(d=>`<option value="${d}" ${(editing?.department||salesTaskDepartments[0])===d?'selected':''}>${departmentDisplayName(d)}</option>`).join('')}</select></div>
    <div class="field"><label>المسمى الوظيفي</label><input id="staffJobTitle" value="${esc(editing?.jobTitle||'')}" placeholder="مثال: مصمم غرافيك"></div>
    <div class="field"><label>نوع التوظيف</label><select id="staffEmploymentType">${['دوام كامل','دوام جزئي','متعاون'].map(v=>`<option value="${v}" ${(editing?.employmentType||'دوام كامل')===v?'selected':''}>${v}</option>`).join('')}</select></div>
    <div class="field"><label>تاريخ المباشرة</label><input id="staffHireDate" type="date" value="${esc(editing?.hireDate||'')}"></div>
    <div class="field">
     <label>حالة الموظف *</label>
     <select id="staffEmploymentStatus" onchange="toggleStaffStatusFields()">
      <option value="active" ${editingStatus==='active'?'selected':''}>نشط</option>
      <option value="inactive" ${editingStatus==='inactive'?'selected':''}>غير نشط</option>
      <option value="resigned" ${editingStatus==='resigned'?'selected':''}>مستقيل</option>
     </select>
    </div>
   </div>

   <div id="staffResignationFields" class="field-grid hr-resignation-fields" style="display:${editingStatus==='resigned'?'grid':'none'}">
    <div class="field">
     <label>تاريخ الاستقالة *</label>
     <input id="staffResignationDate" type="date" value="${esc(editing?.resignationDate||'')}">
    </div>
    <div class="field">
     <label>سبب الاستقالة *</label>
     <input id="staffResignationReason" value="${esc(editing?.resignationReason||'')}" placeholder="سبب الاستقالة">
    </div>
   </div>

   <div class="hr-form-section-title" style="margin-top:12px">الإدارة والتواصل</div>
   <div class="field-grid">
    <div class="field"><label>الهيكل الإداري</label><div id="staffManagerPreview" class="hr-manager-preview"></div></div>
    <div class="field"><label>رقم الهاتف</label><input id="staffPhone" value="${esc(editing?.phone||'')}" placeholder="+963 ..."></div>
    <div class="field"><label>البريد الإلكتروني</label><input id="staffEmail" type="email" value="${esc(editing?.email||'')}" placeholder="name@company.com"></div>
   </div>

   <div class="hr-form-section-title" style="margin-top:12px">الحضور بالبصمة — ZKTeco</div>
   <div class="field-grid">
    <div class="field"><label>رقم التسجيل في جهاز البصمة</label><input id="staffZktecoEnrollmentNumber" value="${esc(editing?.zktecoEnrollmentNumber||'')}" inputmode="numeric" autocomplete="off" placeholder="مثال: 82"></div>
    <div class="field"><label>استثناء من البصمة</label><select id="staffZktecoExempt"><option value="0" ${editing?.zktecoExempt?'':'selected'}>لا</option><option value="1" ${editing?.zktecoExempt?'selected':''}>نعم</option></select></div>
   </div>
   <div class="hr-form-note">يُستخدم رقم التسجيل لربط هذا الموظف بمعرّف الجهاز. لا تُحفظ صور أو قوالب البصمة داخل MOSH.</div>

   <div class="field" style="grid-template-columns:1fr;margin-top:10px">
    <label>ملاحظات الموارد البشرية</label>
    <textarea id="staffNotes" rows="3" placeholder="ملاحظات داخلية اختيارية">${esc(editing?.notes||'')}</textarea>
   </div>

   ${staffDocumentsHtml(editing)}

   <div class="workflow-actions" style="margin-top:12px">
    <button type="button" class="btn primary" onclick="saveStaffProfile('${editing?.id||''}')">${editing?'حفظ ملف الموظف':'إضافة الموظف'}</button>
    <button type="button" class="btn" onclick="closeStaffEmployeeForm()">إلغاء</button>
   </div>

   <div class="hr-form-note">
    الموظف غير النشط أو المستقيل لا يظهر في قوائم توزيع المهام أو تعيين مدراء الأقسام، لكن ملفه ووثائقه وسجله تبقى محفوظة.
   </div>
  </div>`:'';box.innerHTML=`
  <div class="hr-staff-head">
   <div>
    <h2>الموظفون</h2>
    <div class="muted">ملفات الموظفين، الحالات الوظيفية، الوثائق، والهيكل الإداري.</div>
   </div>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" onclick="window.MoshZktecoAdmin?.open()">ZKTeco</button><button type="button" class="btn primary" onclick="openStaffEmployeeForm()">+ إضافة موظف</button></div>
  </div>

  ${hrStaffStatusTabsHtml(all)}

  <div class="hr-staff-summary">
   <div class="hr-staff-summary-card"><div class="label">نشط</div><div class="value">${activeCount}</div></div>
   <div class="hr-staff-summary-card"><div class="label">غير نشط</div><div class="value">${inactiveCount}</div></div>
   <div class="hr-staff-summary-card"><div class="label">مستقيل</div><div class="value">${resignedCount}</div></div>
   <div class="hr-staff-summary-card"><div class="label">مدراء أقسام نشطون</div><div class="value">${uniqueManagers}</div></div>
  </div>

  ${unmanaged.length?`<div class="hr-unmanaged-note">أقسام فيها موظفون نشطون بدون مدير: ${unmanaged.map(departmentDisplayName).map(esc).join(' · ')}</div>`:''}

  ${hrDepartmentManagersHtml()}
  ${form}

  <div class="panel">
   <div class="hr-staff-filterbar">
    <div>
     <label>القسم الأساسي</label>
     <select onchange="setHrStaffFilter('department',this.value)">
      <option value="all">كل الأقسام</option>
      ${salesTaskDepartments.map(d=>`<option value="${d}" ${department===d?'selected':''}>${departmentDisplayName(d)}</option>`).join('')}
     </select>
    </div>
    <div>
     <label>الدور الإداري</label>
     <select onchange="setHrStaffFilter('role',this.value)">
      <option value="all" ${role==='all'?'selected':''}>الكل</option>
      <option value="manager" ${role==='manager'?'selected':''}>يدير قسم / أقسام</option>
      <option value="employee" ${role==='employee'?'selected':''}>لا يدير أقساماً</option>
     </select>
    </div>
   </div>

   <div class="hr-staff-table-wrap">
    ${result.total?`<table class="list-table hr-staff-table">
     <thead>
      <tr>
       <th>رقم الموظف</th>
       <th>الموظف</th>
       <th>القسم الأساسي</th>
       <th>يدير</th>
       <th>الحالة</th>
       <th>الوثائق</th>
       <th>المهام الجارية</th>
       <th>إجراءات</th>
      </tr>
     </thead>
     <tbody>
      ${result.items.map(p=>{const stats=getStaffTaskStats(p);const managed=getManagedDepartmentsForStaff(p);const pStatus=staffEmploymentStatus(p);const docs=(p.documents||[]).length;return `<tr>
        <td>${esc(p.employeeNo||p.id||'-')}</td>
        <td>
         <div class="employee-name">${esc(p.name||'-')}${managed.length?`<span class="hr-manager-badge">مدير ${managed.length>1?managed.length+' أقسام':'قسم'}</span>`:''}</div>
         <div class="employee-sub">${esc(p.jobTitle||'بدون مسمى وظيفي')}${p.phone?` · ${esc(p.phone)}`:''}</div>
        </td>
        <td>${esc(departmentDisplayName(p.department||''))}<div class="employee-sub">${esc(p.employmentType||'دوام كامل')}</div></td>
        <td>${managed.length?managed.map(d=>`<span class="hr-manager-badge">${esc(departmentDisplayName(d))}</span>`).join(' '):'<span class="muted">—</span>'}</td>
        <td>
         <span class="hr-status ${pStatus}">${esc(staffStatusLabel(p))}</span>
         ${pStatus==='resigned'&&p.resignationDate?`<div class="employee-sub">${esc(p.resignationDate)}</div>`:''}
        </td>
        <td><b>${docs}</b><div class="employee-sub">مستند</div></td>
        <td><b>${stats.total}</b><div class="employee-sub">جديد ${stats.new} · عمل ${stats.working} · مراجعة ${stats.review}</div></td>
        <td>
         <div class="hr-staff-actions">
          <button type="button" class="btn" onclick="openStaffEmployeeForm('${p.id}')">فتح الملف</button>
          <button type="button" class="btn" onclick="previewEmployeeTasks('${p.id}')">المهام</button>
          <button type="button" class="btn hr-staff-delete" onclick="deleteStaffProfile('${p.id}')">حذف</button>
         </div>
        </td>
       </tr>`;}).join('')}
     </tbody>
    </table>`:'<div class="empty">لا يوجد موظفون ضمن هذه القائمة.</div>'}
   </div>

   ${appListPagerHtml('hr_staff',result,{placeholder:'بحث بالاسم، المسمى، رقم الموظف أو الوثائق...'})}
  </div>

  <div id="employeeTaskPreview"></div>`;if(hrStaffFormOpen){setTimeout(()=>{refreshStaffManagerPreview();toggleStaffStatusFields(false);},0);}
}
function saveStaffProfile(editId=''){const existing=getStaffProfileById(editId);const name=normalizeStaffName(document.getElementById('staffName')?.value);const department=document.getElementById('staffDepartment')?.value||'';const jobTitle=String(document.getElementById('staffJobTitle')?.value||'').trim();const employmentType=document.getElementById('staffEmploymentType')?.value||'دوام كامل';const hireDate=document.getElementById('staffHireDate')?.value||'';const employmentStatus=document.getElementById('staffEmploymentStatus')?.value||'active';const phone=String(document.getElementById('staffPhone')?.value||'').trim();const email=String(document.getElementById('staffEmail')?.value||'').trim();const notes=String(document.getElementById('staffNotes')?.value||'').trim();const zktecoEnrollmentNumber=String(document.getElementById('staffZktecoEnrollmentNumber')?.value||'').trim();const zktecoExempt=document.getElementById('staffZktecoExempt')?.value==='1';const resignationDate=document.getElementById('staffResignationDate')?.value||'';const resignationReason=String(document.getElementById('staffResignationReason')?.value||'').trim();if(!name){alert('اسم الموظف إجباري.');document.getElementById('staffName')?.focus();return;}
if(!department&&employmentStatus!=='draft'){alert('اختر القسم الأساسي.');return;}
if(!['draft','active','inactive','resigned'].includes(employmentStatus)){alert('حالة الموظف غير صحيحة.');return;}
if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert('البريد الإلكتروني غير صحيح.');document.getElementById('staffEmail')?.focus();return;}
if(employmentStatus==='resigned'){if(!resignationDate){alert('حدد تاريخ الاستقالة.');return;}
if(!resignationReason){alert('اكتب سبب الاستقالة.');return;}
}
const duplicate=(state.staffProfiles||[]).find(p=>normalizeStaffName(p.name)===name&&String(p.id)!==String(editId)
);if(duplicate){alert('يوجد موظف آخر بنفس الاسم.');return;}
const previousStatus=existing?staffEmploymentStatus(existing):'';const managedBefore=existing?getManagedDepartmentsForStaff(existing):[];const openTasks=existing?getStaffOpenTasks(existing):[];if(existing &&
previousStatus==='active' &&
employmentStatus!=='active' &&
(managedBefore.length||openTasks.length)
){let message=`تحويل ${existing.name} إلى «${employmentStatus==='resigned'?'مستقيل':'غير نشط'}»؟`;if(managedBefore.length){message+=`\n\nسيتم إلغاء إدارته للأقسام: ${managedBefore.map(departmentDisplayName).join('، ')}.`;}
if(openTasks.length){message+=`\n\nلديه ${openTasks.length} مهمة جارية. ستبقى محفوظة باسمه، لكنه لن يظهر في أي توزيع جديد.`;}
if(!confirm(message))return;}
const oldName=normalizeStaffName(existing?.name);const oldDepartment=existing?.department||'';pushAppUndo();let savedProfile=existing;if(existing){Object.assign(existing,{name,department,jobTitle,employmentType,hireDate,employmentStatus,active:employmentStatus==='active',phone,email,notes,zktecoEnrollmentNumber,zktecoExempt,resignationDate:employmentStatus==='resigned'?resignationDate:(existing.resignationDate||''),resignationReason:employmentStatus==='resigned'?resignationReason:(existing.resignationReason||''),updatedAt:activityTimestamp(),updatedBy:currentUserDisplayName()
});}else{const identity=nextStaffIdentity();savedProfile={id:identity.id,employeeNo:identity.employeeNo,name,department,jobTitle,employmentType,hireDate,employmentStatus,active:employmentStatus==='active',phone,email,notes,zktecoEnrollmentNumber,zktecoExempt,resignationDate:employmentStatus==='resigned'?resignationDate:'',resignationReason:employmentStatus==='resigned'?resignationReason:'',directManager:'',isManager:false,documents:[],statusHistory:[],resignationHistory:[],leaveRecords:[],attendanceRecords:[],delayRecords:[],disciplinaryRecords:[],rewardRecords:[],evaluationRecords:[],payrollRecords:[],createdAt:activityTimestamp(),createdBy:currentUserDisplayName()
};state.staffProfiles.push(savedProfile);}
if(document.getElementById('staffAttendanceMode')){savedProfile.attendanceMode=document.getElementById('staffAttendanceMode').value;savedProfile.workdayHours=Number(document.getElementById('staffWorkdayHours').value)||null;savedProfile.zktecoExempt=savedProfile.attendanceMode!=='fingerprint';}
savedProfile.statusHistory=Array.isArray(savedProfile.statusHistory)?savedProfile.statusHistory:[];savedProfile.resignationHistory=Array.isArray(savedProfile.resignationHistory)?savedProfile.resignationHistory:[];if(previousStatus!==employmentStatus){savedProfile.statusHistory.push({from:previousStatus||'new',to:employmentStatus,time:activityTimestamp(),by:currentUserDisplayName()
});}
if(employmentStatus==='resigned' &&
(previousStatus!=='resigned' ||
savedProfile.resignationHistory.length===0
)
){savedProfile.resignationHistory.push({date:resignationDate,reason:resignationReason,time:activityTimestamp(),by:currentUserDisplayName()
});}
if(oldName&&oldName!==name){(state.salesTasks||[]).forEach(t=>{if(normalizeStaffName(t.assignee)===oldName)t.assignee=name;if(normalizeStaffName(t.reviewManager)===oldName)t.reviewManager=name;});(state.staffProfiles||[]).forEach(p=>{if(normalizeStaffName(p.directManager)===oldName)p.directManager=name;});}
if(employmentStatus!=='active'){Object.entries(state.departmentManagers||{}).forEach(([dept,managerId])=>{if(String(managerId)===String(savedProfile.id)){delete state.departmentManagers[dept];}
});}
if(oldDepartment&&oldDepartment!==department){syncStaffHierarchyForDepartment(oldDepartment);}
syncStaffHierarchyForDepartment(department);getManagedDepartmentsForStaff(savedProfile).forEach(syncStaffHierarchyForDepartment);refreshLegacyManagerFlags();save();hrStaffFormOpen=true;hrStaffEditingId=String(savedProfile.id);resetAppListPage('hr_staff');renderStaffWorkflowConfig();return true;}
function deleteStaffProfile(id){if(window.MoshEmployees09)return window.MoshEmployees09.archive(id);window.MoshUI19?.toast('تعذر تحميل الأرشفة. حدّث الصفحة وأعد المحاولة.');return false;}
function previewEmployeeTasks(id){const p=getStaffProfileById(id);const box=document.getElementById('employeeTaskPreview');if(!p||!box)return;const tasks=(state.salesTasks||[]).filter(t=>normalizeStaffName(t.assignee)===normalizeStaffName(p.name)
);const newer=tasks.filter(t=>t.status==='in_progress'&&(t.employeeState||'new')==='new');const working=tasks.filter(t=>t.status==='in_progress'&&['received','working','paused'].includes(t.employeeState));const review=tasks.filter(t=>t.status==='in_progress'&&t.employeeState==='submitted');const finished=tasks.filter(t=>t.status!=='in_progress'||t.employeeState==='finished');const managed=getManagedDepartmentsForStaff(p);const list=arr=>arr.length
?arr.map(t=>`<div class="message" style="cursor:pointer" onclick="goApp('tasks',null);setTimeout(()=>openTaskDetails(${MoshTaskUI.arg(t.id)}),0)">
    <b class="mt54-task-name">${esc(t.title)}</b>
    <div class="muted">${MoshTaskUI.clientHtml(t)} · ${esc(departmentDisplayName(t.department||''))}</div>
   </div>`).join('')
:'<div class="muted">لا يوجد.</div>';box.innerHTML=`
  <div class="panel" style="margin-top:12px">
   <div class="toolbar" style="padding:0;margin-bottom:8px">
    <div>
     <b>${esc(p.name)} — ${esc(p.employeeNo||p.id)}</b>
     <div class="muted">
      ${esc(staffStatusLabel(p))} · ${esc(p.jobTitle||'بدون مسمى وظيفي')} · ${esc(departmentDisplayName(p.department||''))}
      ${managed.length?` · يدير: ${managed.map(departmentDisplayName).map(esc).join('، ')}`:''}
     </div>
    </div>
    <button type="button" class="btn" onclick="document.getElementById('employeeTaskPreview').innerHTML=''">إغلاق</button>
   </div>

   <div class="employee-buckets" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="employee-bucket"><h4>جديدة (${newer.length})</h4>${list(newer)}</div>
    <div class="employee-bucket"><h4>قيد العمل (${working.length})</h4>${list(working)}</div>
    <div class="employee-bucket"><h4>عند المدير (${review.length})</h4>${list(review)}</div>
    <div class="employee-bucket"><h4>منتهية (${finished.length})</h4>${list(finished)}</div>
   </div>
  </div>`;}
const salesTaskDepartments=['تكنولوجيا المعلومات','التصميم','التصوير','المونتاج','التسويق','السوشال ميديا','المشتريات','الترويج','اللوجستيات','المبيعات','الموارد البشرية','الإدارة','المحاسبة'];function departmentDisplayName(name){if(name==='اللوجستيات'||name==='قسم اللوجستيات')return 'قسم الخدمات الإدارية';return name ?(String(name).startsWith('قسم ')?String(name):'قسم '+String(name)):'-';}
const ATTACHMENTS_DB_NAME='mosh_erp_task_attachments_v1';const ATTACHMENTS_STORE='attachments';let standalonePendingAttachments=[];let standaloneMediaRecorder=null;let standaloneVoiceChunks=[];let standaloneVoiceStream=null;let standaloneVoiceTimerInterval=null;let standaloneVoiceStartedAt=0;let standaloneVoiceMode=null;let standaloneSaveBusy=false;let standaloneTaskSourceOrderId=null;function openAttachmentsDB(){throw new Error("المرفقات محفوظة على الخادم.");}
async function storeAttachmentRecord(record){return MoshApi.upload(record);}
async function getAttachmentRecord(key){return MoshApi.file(key);}
const TASK_INLINE_IMAGE_MIMES=new Set(['image/jpeg','image/png','image/webp','image/gif','image/bmp']);const TASK_INLINE_VIDEO_MIMES=new Set(['video/mp4','video/webm','video/quicktime']);function attachmentKind(type=''){const mime=String(type||'').toLowerCase().split(';')[0].trim();if(TASK_INLINE_IMAGE_MIMES.has(mime))return 'image';if(TASK_INLINE_VIDEO_MIMES.has(mime))return 'video';if(mime.startsWith('audio/'))return 'audio';return 'file';}
function attachmentIcon(type=''){const kind=attachmentKind(type);return kind==='image'?'📷':kind==='video'?'🎥':kind==='audio'?'🎙️':'📎';}
function formatAttachmentSize(bytes){const n=Number(bytes)||0;if(n<1024)return n+' B';if(n<1024*1024)return(n/1024).toFixed(1)+' KB';return(n/(1024*1024)).toFixed(1)+' MB';}
// R36: no application-level size cap for task attachments. Valid byte counts only.
const TASK_ATTACHMENT_MAX_BYTES=Number.MAX_SAFE_INTEGER;
const TASK_ATTACHMENT_EXTENSIONS=new Set(['jpg','jpeg','png','webp','gif','heic','heif','bmp','tif','tiff','mp4','mov','m4v','webm','avi','mkv','mpeg','mpg','3gp','mp3','wav','m4a','aac','ogg','flac','pdf','txt','csv','rtf','doc','docx','xls','xlsx','ppt','pptx','zip','rar','7z','psd','ai','eps','indd','dwg','dxf']);
function taskAttachmentExtension(name=''){const value=String(name||'').trim();const i=value.lastIndexOf('.');return i>=0?value.slice(i+1).toLowerCase():'';}
function validateTaskAttachmentFile(file){if(!file||!file.name)return 'الملف غير صالح.';if((Number(file.size)||0)<=0)return 'الملف فارغ.';if(!Number.isSafeInteger(Number(file.size))||Number(file.size)>TASK_ATTACHMENT_MAX_BYTES)return 'حجم الملف غير قابل للمعالجة بأمان.';const ext=taskAttachmentExtension(file.name);if(!TASK_ATTACHMENT_EXTENSIONS.has(ext))return 'نوع الملف غير مدعوم كمرفق.';return '';}
function addStandaloneAttachments(files){const arr=Array.from(files||[]);const rejected=[];let added=0;arr.forEach(file=>{const issue=validateTaskAttachmentFile(file);if(issue){rejected.push((file.name||'مرفق')+': '+issue);return;}const type=file.type||'application/octet-stream';const isAudio=type.startsWith('audio/');standalonePendingAttachments.push({tempId:'tmp_'+Date.now()+'_'+Math.random().toString(36).slice(2),name:isAudio ?('تسجيل صوتي - '+(file.name||'voice')):(file.name||'مرفق'),type,size:file.size||0,blob:file
});added++;});const input=document.getElementById('standaloneAttachmentInput');if(input)input.value='';if(added)setDirtyState(true);renderStandaloneAttachments();if(rejected.length)alert('تعذر إضافة بعض المرفقات:\n'+rejected.join('\n'));}
function removeStandaloneAttachment(tempId){standalonePendingAttachments=standalonePendingAttachments.filter(a=>a.tempId!==tempId);setDirtyState(true);renderStandaloneAttachments();}
function renderStandaloneAttachments(){const box=document.getElementById('standaloneAttachmentsList');if(!box)return;if(!standalonePendingAttachments.length){box.innerHTML='<div class="muted">لا يوجد مرفقات.</div>';return;}
box.innerHTML=standalonePendingAttachments.map(a=>{const isAudio=(a.type||'').startsWith('audio/');const audioPreview=isAudio && a.blob
? `<audio controls preload="metadata" src="${URL.createObjectURL(a.blob)}" style="width:min(320px,100%);margin-top:7px"></audio>`
:'';return `<div class="task-attachment-item">
   <div class="file-info" style="align-items:flex-start">
    <span>${attachmentIcon(a.type)}</span>
    <div style="min-width:0">
     <div class="file-name">${esc(a.name)}</div>
     <div class="muted">${formatAttachmentSize(a.size)}</div>
     ${audioPreview}
    </div>
   </div>
   <button type="button" class="btn" onclick="removeStandaloneAttachment('${a.tempId}')">حذف</button>
  </div>`;}).join('');}
function formatVoiceTimer(ms){const total=Math.max(0,Math.floor(ms/1000));const mm=String(Math.floor(total/60)).padStart(2,'0');const ss=String(total%60).padStart(2,'0');return mm+':'+ss;}
function updateVoiceButtonUI(recording){const btn=document.getElementById('standaloneVoiceBtn');const svg=document.getElementById('standaloneVoiceSvg');const timer=document.getElementById('standaloneVoiceTimer');if(!btn)return;if(recording){btn.classList.add('voice-recording');btn.title='إيقاف التسجيل';btn.setAttribute('aria-label','إيقاف التسجيل');if(svg){svg.innerHTML='<rect x="7" y="7" width="10" height="10" rx="2"></rect>';}
if(timer){timer.classList.add('show');timer.textContent='00:00';}
}else{btn.classList.remove('voice-recording');btn.title='تسجيل صوت';btn.setAttribute('aria-label','تسجيل صوت');if(svg){svg.innerHTML='<rect x="9" y="3.5" width="6" height="11" rx="3"></rect><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0"></path><path d="M12 17v3.5"></path><path d="M9 20.5h6"></path>';}
if(timer){timer.classList.remove('show');timer.textContent='00:00';}
}
}
function stopVoiceTimer(){if(standaloneVoiceTimerInterval){clearInterval(standaloneVoiceTimerInterval);standaloneVoiceTimerInterval=null;}
}
function stopStandaloneVoiceStream(){stopVoiceTimer();if(standaloneVoiceStream){standaloneVoiceStream.getTracks().forEach(track=>{try{track.stop();}catch(e){}
});standaloneVoiceStream=null;}
updateVoiceButtonUI(false);}
function getVoiceMimeType(){const candidates=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'
];if(typeof MediaRecorder==='undefined')return '';if(typeof MediaRecorder.isTypeSupported!=='function')return '';return candidates.find(t=>MediaRecorder.isTypeSupported(t))||'';}
function showMicRequirement(){const isFile=location.protocol==='file:';if(isFile){alert('حتى يشتغل تسجيل المايكروفون مباشرة، افتح MOSH ERP من ملف START_MOSH.command المرفق، وليس بفتح ملف HTML مباشرة.');}else{alert('المتصفح لم يسمح بالوصول للمايكروفون. فعّل صلاحية Microphone لهذا الموقع ثم جرّب مرة ثانية.');}
}
function addRecordedVoiceBlob(blob,mimeType){if(!blob || !blob.size){alert('التسجيل طلع فارغ. جرّب مرة ثانية.');return;}
const ext=mimeType.includes('mp4')?'m4a':mimeType.includes('ogg')?'ogg':'webm';standalonePendingAttachments.push({tempId:'voice_'+Date.now()+'_'+Math.random().toString(36).slice(2),name:'تسجيل صوتي '+new Date().toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'})+'.'+ext,type:mimeType || 'audio/webm',size:blob.size,blob
});setDirtyState(true);renderStandaloneAttachments();}
async function toggleStandaloneVoiceRecording(){if(standaloneVoiceMode==='recording' && standaloneMediaRecorder){try{if(standaloneMediaRecorder.state==='recording'){standaloneMediaRecorder.stop();}
}catch(e){standaloneVoiceMode=null;standaloneMediaRecorder=null;standaloneVoiceChunks=[];stopStandaloneVoiceStream();}
return;}
if(!window.isSecureContext || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia!=='function'){showMicRequirement();return;}
if(typeof MediaRecorder==='undefined'){alert('المتصفح الحالي لا يدعم التسجيل الصوتي المباشر. افتح النظام على أحدث Chrome أو Safari.');return;}
try{standaloneVoiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true
},video:false
});standaloneVoiceChunks=[];const mimeType=getVoiceMimeType();const options=mimeType?{mimeType}:{};const recorder=new MediaRecorder(standaloneVoiceStream,options);standaloneMediaRecorder=recorder;standaloneVoiceMode='recording';recorder.ondataavailable=e=>{if(e.data && e.data.size>0){standaloneVoiceChunks.push(e.data);}
};recorder.onerror=()=>{standaloneVoiceMode=null;standaloneMediaRecorder=null;standaloneVoiceChunks=[];stopStandaloneVoiceStream();alert('صار خطأ أثناء تسجيل الصوت. تأكد من صلاحية المايكروفون وجرّب مرة ثانية.');};recorder.onstop=()=>{const finalMime=recorder.mimeType || mimeType || 'audio/webm';const blob=new Blob(standaloneVoiceChunks,{type:finalMime});standaloneVoiceMode=null;standaloneMediaRecorder=null;standaloneVoiceChunks=[];stopStandaloneVoiceStream();addRecordedVoiceBlob(blob,finalMime);};recorder.start(250);standaloneVoiceStartedAt=Date.now();updateVoiceButtonUI(true);standaloneVoiceTimerInterval=setInterval(()=>{const timer=document.getElementById('standaloneVoiceTimer');if(timer){timer.textContent=formatVoiceTimer(Date.now()-standaloneVoiceStartedAt);}
},250);}catch(err){standaloneVoiceMode=null;standaloneMediaRecorder=null;standaloneVoiceChunks=[];stopStandaloneVoiceStream();if(err &&(err.name==='NotAllowedError' || err.name==='PermissionDeniedError')){alert('اضغط سماح للمايكروفون. إذا كنت رفضت الصلاحية سابقاً، فعّل Microphone من إعدادات الموقع ثم جرّب مرة ثانية.');}else if(err && err.name==='NotFoundError'){alert('ما لقيت مايكروفون على الجهاز.');}else if(err && err.name==='NotReadableError'){alert('المايكروفون مستخدم من برنامج آخر. سكّر البرنامج الذي يستخدمه وجرّب مرة ثانية.');}else{showMicRequirement();}
}
}
async function persistStandaloneAttachments(taskId){const metadata=[];const pending=standalonePendingAttachments.slice();for(let i=0;i<pending.length;i++){const a=pending[i];const key='task_'+taskId+'_'+Date.now()+'_'+i+'_'+Math.random().toString(36).slice(2);await storeAttachmentRecord({key,taskId:String(taskId),name:a.name,type:a.type,size:a.size,blob:a.blob,createdAt:new Date().toISOString()
});metadata.push({key,name:a.name,type:a.type,size:a.size});}
return metadata;}
function taskAttachmentsSection(task,prefix){const list=Array.isArray(task.attachments)?task.attachments:[];if(!list.length)return '';return `
  <div class="task-attachments-box">
   <div class="task-attachments-title">مرفقات المهمة</div>
   <div id="${prefix}_${task.id}" class="task-attachment-preview">
    <div class="muted">جارٍ تحميل المرفقات...</div>
   </div>
  </div>`;}
async function hydrateTaskAttachments(taskId,containerId){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(taskId));const box=document.getElementById(containerId);if(!task || !box)return;const list=Array.isArray(task.attachments)?task.attachments:[];if(!list.length){box.innerHTML='<div class="muted">لا يوجد مرفقات.</div>';return;}
const cards=[];for(const meta of list){try{const rec=await getAttachmentRecord(meta.key);if(!rec || !rec.blob)continue;const url=URL.createObjectURL(rec.blob);const kind=attachmentKind(meta.type||rec.type||'');let preview='';if(kind==='image')preview=`<img src="${url}" alt="${esc(meta.name||'صورة')}">`;else if(kind==='video')preview=`<video controls preload="metadata" src="${url}"></video>`;else if(kind==='audio')preview=`<audio controls preload="metadata" src="${url}"></audio>`;else preview=`<a class="btn" href="${url}" target="_blank">فتح المرفق</a>`;cards.push(`<div class="attachment-card">
    ${preview}
    <div style="margin-top:8px">${attachmentIcon(meta.type)} ${esc(meta.name||'مرفق')}</div>
    <div class="muted">${formatAttachmentSize(meta.size)}</div>
   </div>`);}catch(e){cards.push(`<div class="attachment-card"><div class="muted">تعذر تحميل ${esc(meta.name||'المرفق')}</div></div>`);}
}
box.innerHTML=cards.length?cards.join(''):'<div class="muted">لا يوجد مرفقات متاحة.</div>';}
function getNextTaskId(){const ids=(state.salesTasks||[])
.map(t=>Number(t.id))
.filter(n=>Number.isFinite(n)&& n>0);return ids.length ? Math.max(...ids)+1:1;}
function refreshTaskViewAfterCreate(task){if(task?.department==='المهمات'){goApp('tasks',null);renderAllTasks();return;}
const active=document.querySelector('.view.active');if(!active)return;if(active.id==='tasksApp'){renderAllTasks();return;}
const productive=Object.entries(PRODUCTIVE_DEPARTMENTS)
.find(([,cfg])=>cfg.appId===active.id);if(productive && task.department===productive[1].department){refreshProductiveView(productive[0]);return;}
const departmentViews={adminApp:['الإدارة','adminAppTasks'],hrApp:['الموارد البشرية','hrAppTasks'],accountingApp:['المحاسبة','accountingDepartmentTasks'],purchasesApp:['المشتريات','purchasesAppTasks'],logisticsApp:['اللوجستيات','logisticsAppTasks']
};const info=departmentViews[active.id];if(info && task.department===info[0]){renderDepartmentTasks(info[0],info[1]);}
}
function openStandaloneTaskModal(sourceOrderId=null){setDirtyState(false);standaloneTaskSourceOrderId=sourceOrderId!==null?sourceOrderId:null;standalonePendingAttachments=[];standaloneVoiceChunks=[];stopVoiceTimer();if(standaloneMediaRecorder && standaloneMediaRecorder.state==='recording'){standaloneMediaRecorder.onstop=null;try{standaloneMediaRecorder.stop();}catch(e){}
}
standaloneMediaRecorder=null;standaloneVoiceMode=null;standaloneVoiceChunks=[];stopStandaloneVoiceStream();renderStandaloneCustomerChoices();const sourceOrder=standaloneTaskSourceOrderId!==null
?(state.quotations||[]).find(q=>String(q.id)===String(standaloneTaskSourceOrderId)&& q.status==='order')
:null;const titleEl=document.getElementById('standaloneTaskModalTitle');const createBtn=document.getElementById('standaloneTaskCreateBtn');const customerEl=document.getElementById('standaloneTaskCustomer');if(titleEl)titleEl.textContent=sourceOrder?'إنشاء مهمة مبيعات':'إنشاء مهمة جديدة';if(createBtn)createBtn.textContent='إنشاء المهمة';document.getElementById('standaloneTaskTitle').value='';const creatorEl=document.getElementById('standaloneTaskCreator');if(creatorEl)creatorEl.value=currentUserDisplayName();customerEl.value=sourceOrder?(sourceOrder.customer||''):'';customerEl.readOnly=!!sourceOrder;customerEl.title=sourceOrder?'العميل مرتبط بأمر المبيعات الحالي':'';document.getElementById('standaloneTaskDepartment').value='المهمات';document.getElementById('standaloneTaskAssignmentMode').value='direct';document.getElementById('standaloneTaskAssignee').value='';refreshStandaloneAssignmentUI();document.getElementById('standaloneTaskDueDate').value='';document.getElementById('standaloneTaskDescription').value='';document.getElementById('standaloneTaskNotes').value='';renderStandaloneAttachments();const micNote=document.getElementById('micLocalNote');if(micNote)micNote.style.display=(location.protocol==='file:'?'block':'none');document.getElementById('standaloneTaskModal').classList.add('show');refreshSaveButtons();}
function cancelStandaloneTask(){setDirtyState(false);if(standaloneMediaRecorder && standaloneMediaRecorder.state==='recording'){standaloneMediaRecorder.onstop=null;try{standaloneMediaRecorder.stop();}catch(e){}
}
standaloneMediaRecorder=null;standaloneVoiceChunks=[];standaloneVoiceMode=null;stopVoiceTimer();stopStandaloneVoiceStream();standalonePendingAttachments=[];standaloneTaskSourceOrderId=null;const customerEl=document.getElementById('standaloneTaskCustomer');if(customerEl){customerEl.readOnly=false;customerEl.title='';}
const titleEl=document.getElementById('standaloneTaskModalTitle');if(titleEl)titleEl.textContent='إنشاء مهمة جديدة';closeModal('standaloneTaskModal');}
async function saveStandaloneTask(){if(window.MoshDeadline34&&!window.MoshDeadline34.ready('standaloneTaskDueDate'))return;if(standaloneSaveBusy)return;if(!Array.isArray(state.salesTasks))state.salesTasks=[];if(standaloneVoiceMode==='recording'){alert('أوقف تسجيل الفويس أولاً، وبعدها أنشئ المهمة.');return;}
const titleEl=document.getElementById('standaloneTaskTitle');const title=titleEl ? titleEl.value.trim():'';if(!title){window.MoshValidation09?.report([[titleEl,'اكتب اسم المهمة أولاً.']]);return;}
const customerInput=document.getElementById('standaloneTaskCustomer');const sourceOrder=standaloneTaskSourceOrderId!==null
?(state.quotations||[]).find(q=>String(q.id)===String(standaloneTaskSourceOrderId)&& q.status==='order')
:null;if(standaloneTaskSourceOrderId!==null && !sourceOrder){alert('تعذر العثور على أمر المبيعات المرتبط بهذه المهمة.');return;}
if(sourceOrder && getSalesTaskForOrder(sourceOrder.id)){alert('يوجد بالفعل مهمة مبيعات مرتبطة بأمر المبيعات هذا.');return;}
const selectedCustomer=validateTaskCustomerInput(customerInput);if(!selectedCustomer)return;standaloneSaveBusy=true;const department=document.getElementById('standaloneTaskDepartment').value;const isCentralTasksDepartment=department==='المهمات';const isAdministration=department==='الإدارة';const assignmentMode=document.getElementById('standaloneTaskAssignmentMode')?.value||'direct';const sharedMode=['team','departments'].includes(assignmentMode);const selected=window.MoshSharedDistribution32?.creationSelection()||[];if(sharedMode&&selected.length<2){standaloneSaveBusy=false;alert(assignmentMode==='team'?'اختر موظفين على الأقل.':'اختر قسمين على الأقل.');return;}const directAssignee=normalizeStaffName(document.getElementById('standaloneTaskAssignee')?.value);if(assignmentMode==='direct'&&!directAssignee){standaloneSaveBusy=false;window.MoshValidation09?.report([[document.getElementById('standaloneTaskAssignee'),isAdministration?'اختر المدير أو المسؤول الإداري الذي ستوجّه إليه المهمة.':'اختر الموظف المنفذ أو أرسل المهمة لمدير القسم.']]);return}
const directProfile=assignmentMode==='direct'?r37AssignableProfile(directAssignee,department,document.querySelector('#standaloneTaskModal [id*=Assignee]')):null;if(assignmentMode==='direct'&&!directProfile){standaloneSaveBusy=false;return}
const id=getNextTaskId();const taskNo='TASK/'+String(id).padStart(5,'0');let attachmentMetadata=[];try{attachmentMetadata=await persistStandaloneAttachments(id);}catch(err){standaloneSaveBusy=false;alert('تعذر حفظ المرفقات. جرّب مرة ثانية.');return;}
pushAppUndo();const newTask={id,number:taskNo,taskNo,salesOrderId:sourceOrder?sourceOrder.id:null,salesOrderNo:sourceOrder?(sourceOrder.number||''):'',origin:sourceOrder?'عرض سعر موافق':'مهمة مباشرة',createdBy:currentUserDisplayName(),customer:sourceOrder?(sourceOrder.customer||selectedCustomer.name):selectedCustomer.name,title,description:document.getElementById('standaloneTaskDescription').value,department,assignee:assignmentMode==='direct'?directAssignee:'',assigneeId:assignmentMode==='direct'?String(directProfile.id):'',assignmentMode,employeeState:'new',reviewManager:assignmentMode==='direct'&&department!=='الإدارة'?getDirectManagerName(directAssignee,department):'',returnedForRevision:false,dueDate:document.getElementById('standaloneTaskDueDate').value,dueRule:window.MoshDeadline34?.ruleFor('standaloneTaskDueDate')||null,notes:document.getElementById('standaloneTaskNotes').value,attachments:attachmentMetadata,status:'in_progress',createdAt:activityTimestamp(),history:[{text:isCentralTasksDepartment
?(sourceOrder?'تم إنشاء مهمة المبيعات وربطها بأمر المبيعات '+(sourceOrder.number||''):'تم إنشاء مهمة جديدة')+' وإضافتها إلى قسم المهمات.'
:(sourceOrder?'تم إنشاء مهمة المبيعات وربطها بأمر المبيعات '+(sourceOrder.number||''):'تم إنشاء مهمة جديدة')+' وتحويلها إلى قسم '+department+(assignmentMode==='direct'?` وتعيينها مباشرة إلى ${directAssignee}`:' لتوزيعها من مدير القسم'),time:activityTimestamp(),by:currentUserDisplayName()
}]
};
// Persist this task through its dedicated resource endpoint. Using the legacy global save()
// here can make unrelated invalid records (for example finance data) block task creation.
let savedTask;
try{
  const createOwner=String(MoshApi.user?.id||'');
  const payload={...newTask};
  delete payload.id; delete payload.number; delete payload.taskNo; delete payload.createdAt; delete payload.createdBy; delete payload.history;
  if(sharedMode){savedTask=await MoshSharedDistribution32.createDistributed(payload,assignmentMode,selected,createOwner);}else{
  savedTask=await MoshApi.request('/tasks',{method:'POST',headers:{'Idempotency-Key':(typeof moshRandomUUID==='function'?moshRandomUUID():(globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function'?globalThis.crypto.randomUUID():String(Date.now())+'-'+Math.random()))},body:payload});
  // R9: register the confirmed record in the server baseline as well as the UI.
  savedTask=MoshApi.acceptCreatedTask(savedTask,createOwner);}
  Object.assign(newTask,savedTask);
}catch(error){
  standaloneSaveBusy=false;
  if(typeof MoshApi?.showError==='function')MoshApi.showError(error);else alert(error?.message||'تعذر إنشاء المهمة.');
  return;
}
standaloneSaveBusy=false;setDirtyState(false);standalonePendingAttachments=[];stopStandaloneVoiceStream();const createdFromOrder=!!sourceOrder;const sourceOrderId=sourceOrder?sourceOrder.id:null;standaloneTaskSourceOrderId=null;const customerEl=document.getElementById('standaloneTaskCustomer');if(customerEl){customerEl.readOnly=false;customerEl.title='';}
const modalTitle=document.getElementById('standaloneTaskModalTitle');if(modalTitle)modalTitle.textContent='إنشاء مهمة جديدة';closeModal('standaloneTaskModal');if(createdFromOrder){workingQuote=null;openQuote(sourceOrderId,false);}else{refreshTaskViewAfterCreate(newTask);}
}
let currentParentTaskId=null;function openSubTaskModal(parentId){const parent=(state.salesTasks||[]).find(t=>t.id===parentId && !t.parentTaskId);if(!parent)return;currentParentTaskId=parentId;setDirtyState(false);document.getElementById('subTaskTitle').value='';document.getElementById('subTaskDepartment').value=parent.department||'التصميم';document.getElementById('subTaskAssignmentMode').value='manager';document.getElementById('subTaskAssignee').value='';refreshSubTaskAssignmentUI();document.getElementById('subTaskDueDate').value='';document.getElementById('subTaskDescription').value='';document.getElementById('subTaskNotes').value='';document.getElementById('subTaskModal').classList.add('show');refreshSaveButtons();}
function cancelSubTask(){setDirtyState(false);currentParentTaskId=null;closeModal('subTaskModal');}
function saveSubTask(){if(window.MoshDeadline34&&!window.MoshDeadline34.ready('subTaskDueDate'))return;const parent=(state.salesTasks||[]).find(t=>t.id===currentParentTaskId && !t.parentTaskId);if(!parent)return;const title=document.getElementById('subTaskTitle').value.trim();if(!title){window.MoshValidation09?.report([[document.getElementById('subTaskTitle'),'اكتب اسم المهمة أولاً.']]);return;}const id=getNextTaskId();const taskNo='TASK/'+String(id).padStart(5,'0');const subAssignmentMode=document.getElementById('subTaskAssignmentMode')?.value||'manager';const subDepartment=document.getElementById('subTaskDepartment').value;const subAssignee=normalizeStaffName(document.getElementById('subTaskAssignee')?.value);if(subAssignmentMode==='direct'&&!subAssignee){window.MoshValidation09?.report([[document.getElementById('subTaskAssignee'),'اختر الموظف المنفذ أو أرسل المهمة لمدير القسم.']]);return}
const subProfile=subAssignmentMode==='direct'?r37AssignableProfile(subAssignee,subDepartment,document.getElementById('subTaskAssignee')):null;if(subAssignmentMode==='direct'&&!subProfile)return;pushAppUndo();
state.salesTasks.push({id,number:taskNo,taskNo,parentTaskId:parent.id,parentTaskNo:parent.taskNo||parent.number,parentTaskTitle:parent.title,salesOrderId:parent.salesOrderId||null,salesOrderNo:parent.salesOrderNo||'',origin:parent.origin||(parent.salesOrderId?'أمر مبيعات':'مهمة مباشرة'),createdBy:currentUserDisplayName(),customer:parent.customer||'',title,description:document.getElementById('subTaskDescription').value,department:subDepartment,assignee:subAssignmentMode==='direct'?subAssignee:'',assigneeId:subAssignmentMode==='direct'?String(subProfile.id):'',assignmentMode:subAssignmentMode,employeeState:'new',reviewManager:subAssignmentMode==='direct'?getDirectManagerName(subAssignee,subDepartment):'',returnedForRevision:false,dueDate:document.getElementById('subTaskDueDate').value,dueRule:window.MoshDeadline34?.ruleFor('subTaskDueDate')||null,notes:document.getElementById('subTaskNotes').value,status:'in_progress',createdAt:activityTimestamp(),history:[{text:'تم إنشاء مهمة فرعية ضمن '+(parent.taskNo||parent.number)+' وتحويلها إلى قسم '+document.getElementById('subTaskDepartment').value,time:activityTimestamp(),by:currentUserDisplayName()
}]
});parent.history=parent.history||[];parent.history.push({text:'تمت إضافة مهمة فرعية: '+title+' ('+taskNo+')',time:activityTimestamp(),by:currentUserDisplayName()});save();setDirtyState(false);closeModal('subTaskModal');currentParentTaskId=null;openTaskDetails(parent.id);}
function getSubTasks(parentId){return(state.salesTasks||[]).filter(t=>String(t.parentTaskId)===String(parentId));}
function isPackageSubTaskDone(task){if(!task||!task.parentTaskId)return false;return task.status==='completed'
|| task.status==='awaiting_invoice'
|| task.status==='invoiced'
|| task.employeeState==='finished';}
function normalizeLegacyPackageSubTasks(){let changed=false;(state.salesTasks||[]).forEach(task=>{if(!task.parentTaskId)return;if(task.status==='awaiting_invoice'){task.status='completed';task.employeeState='finished';if(task.closedFromDepartment){task.department=task.closedFromDepartment;}
task.reviewManager='';task.returnedForRevision=false;task.history=Array.isArray(task.history)?task.history:[];if(!task.history.some(h=>String(h.text||'').includes('تصحيح حالة الخدمة الفرعية ضمن الباقة'))){task.history.push({text:'تم تصحيح حالة الخدمة الفرعية ضمن الباقة إلى «منتهية» بدل إرسالها منفردة إلى الفوترة.',time:activityTimestamp(),by:'النظام'
});}
changed=true;}
});if(changed)save();return changed;}
function moveParentToAccountingIfReady(parentId){const parent=(state.salesTasks||[]).find(t=>String(t.id)===String(parentId)&&!t.parentTaskId);if(!parent||parent.status!=='in_progress')return false;const subs=getSubTasks(parentId);if(!subs.length||!subs.every(isPackageSubTaskDone))return false;if(parent.packageReadyForAccounting&&parent.department==='المهمات')return false;closeTaskWorkSession(parent,'package_services_completed');const previousDepartment=parent.department||'';parent.packageReadyForAccounting=true;parent.packageReadyAt=activityTimestamp();parent.packagePreviousDepartment=previousDepartment;parent.department='المهمات';parent.assignee='';parent.assignmentMode='manager';parent.employeeState='new';parent.reviewManager='';parent.returnedForRevision=false;parent.history=parent.history||[];parent.history.push({text:'اكتملت جميع المهام الفرعية. عادت المهمة الرئيسية إلى قسم «المهمات»، وبقيت الباقة ظاهرة في «قائمة الباقات» بالمحاسبة بانتظار الإنهاء والإرسال للفوترة.',time:parent.packageReadyAt,by:currentUserDisplayName()
});return true;}
function getSubTaskProgress(parentId){const subs=getSubTasks(parentId);return{total:subs.length,done:subs.filter(isPackageSubTaskDone).length
};}
function getSalesTaskForOrder(orderId){return(state.salesTasks||[]).find(t=>!t.parentTaskId && String(t.salesOrderId)===String(orderId));}
function openSalesTaskModal(){const q=getSavedQ();if(!q || q.status!=='order' || currentSalesMode!=='orders')return;if(getSalesTaskForOrder(q.id))return;openStandaloneTaskModal(q.id);}
function cancelSalesTaskModal(){setDirtyState(false);closeModal('salesTaskModal');}
function saveSalesTask(){if(window.MoshDeadline34&&!window.MoshDeadline34.ready('taskDueDate'))return;const q=getSavedQ();if(!q || q.status!=='order')return;if(getSalesTaskForOrder(q.id))return;const title=document.getElementById('taskTitle').value.trim();if(!title)return;pushAppUndo();const id=state.salesTasks.length?Math.max(...state.salesTasks.map(t=>t.id))+1:1;state.salesTasks.push({id,number:'TASK/'+String(id).padStart(5,'0'),taskNo:'TASK/'+String(id).padStart(5,'0'),salesOrderId:q.id,salesOrderNo:q.number,origin:'أمر مبيعات',createdBy:currentUserDisplayName(),customer:q.customer,title,description:document.getElementById('taskDescription').value,department:document.getElementById('taskDepartment').value,assignee:document.getElementById('taskAssignee').value,dueDate:document.getElementById('taskDueDate').value,dueRule:window.MoshDeadline34?.ruleFor('taskDueDate')||null,notes:document.getElementById('taskNotes').value,status:'in_progress',createdAt:activityTimestamp(),history:[{text:'تم إنشاء مهمة المبيعات وتحويلها إلى قسم '+document.getElementById('taskDepartment').value,time:activityTimestamp(),by:currentUserDisplayName()}]
});save();setDirtyState(false);closeModal('salesTaskModal');workingQuote=null;openQuote(q.id,false);}
function productiveTaskStateKey(t){if(!t)return 'new';if(t.employeeState==='submitted')return 'review';if(t.returnedForRevision)return 'revision';if(['received','working','paused'].includes(t.employeeState))return 'working';return 'new';}
function productiveTaskStateLabel(t){if(t?.employeeState==='received')return 'تم استلام المهمة';if(t?.employeeState==='paused')return t.returnedForRevision?'متوقفة مؤقتاً — للتعديل':'إيقاف مؤقت';const key=productiveTaskStateKey(t);return{new:'بانتظار الاستلام',working:'جارٍ العمل',revision:'للتعديل',review:'بانتظار مراجعة المدير'
}[key]||'بانتظار الاستلام';}
function getProductiveConfig(key){return PRODUCTIVE_DEPARTMENTS[key]||null;}
function getProductiveAssignablePeople(key){const cfg=getProductiveConfig(key);if(!cfg)return[];const manager=getDepartmentManager(cfg.department);const people=[];if(manager&&isStaffAssignable(manager)){people.push({name:normalizeStaffName(manager.name),isManager:true,profile:manager});}
getDepartmentStaff(cfg.department)
.filter(p=>!manager||String(p.id)!==String(manager.id))
.forEach(p=>{const name=normalizeStaffName(p.name);if(name&&!people.some(x=>x.name===name))people.push({name,isManager:false,profile:p});});return people;}
function getProductiveTeamPeople(key){const cfg=getProductiveConfig(key);if(!cfg)return[];const people=getProductiveAssignablePeople(key).map(x=>({...x}));(state.salesTasks||[])
.filter(t=>t.department===cfg.department&&t.status==='in_progress'&&normalizeStaffName(t.assignee))
.forEach(t=>{const name=normalizeStaffName(t.assignee);if(!people.some(x=>x.name===name)){const profile=getStaffProfileByName(name);const manager=getDepartmentManager(cfg.department);people.push({name,isManager:!!(profile&&manager&&String(profile.id)===String(manager.id)),profile,historical:true
});}
});return people;}
function productiveAssigneeOptions(key,selected=''){const current=normalizeStaffName(selected);return['<option value="">اختر المنفذ</option>']
.concat(getProductiveAssignablePeople(key).map(p=>`<option value="${esc(p.name)}" ${p.name===current?'selected':''}>${esc(p.name)}${p.isManager?' — مدير القسم':''}</option>`))
.join('');}
function productiveTeamReportHtml(key,tasks){const cfg=getProductiveConfig(key);const people=getProductiveTeamPeople(key);if(!cfg)return '';if(!people.length){return `<div class="panel" style="margin-bottom:12px"><div class="empty">لا يوجد فريق ${esc(cfg.label)} معرف بعد. أضف الموظفين ومدير القسم من الموارد البشرية.</div></div>`;}
return `<div class="design-team-report">
  ${people.map(p=>{const own=tasks.filter(t=>normalizeStaffName(t.assignee)===p.name);const working=own.filter(t=>['working','revision'].includes(productiveTaskStateKey(t))).length;const review=own.filter(t=>productiveTaskStateKey(t)==='review').length;const fresh=own.filter(t=>productiveTaskStateKey(t)==='new').length;const inactive=p.profile&&!isStaffAssignable(p.profile);return `<div class="design-team-card">
    <div class="name">${esc(p.name)} ${p.isManager?'<span class="manager-tag">مدير القسم</span>':''}${inactive?'<span class="manager-tag" style="opacity:.55">غير متاح للتوزيع</span>':''}</div>
    <div class="load">
     <span>المتبقي <b>${own.length}</b></span>
     <span>جديد <b>${fresh}</b></span>
     <span>قيد العمل <b>${working}</b></span>
     <span>مراجعة <b>${review}</b></span>
    </div>
   </div>`;}).join('')}
 </div>`;}
function setProductiveTopTab(key,mode){const cfg=getProductiveConfig(key);if(!cfg)return;const distribution=document.getElementById(key+'DistributionTab');const running=document.getElementById(key+'RunningTab');distribution?.classList.toggle('active',mode==='distribution');running?.classList.toggle('active',mode==='running');const needCount=(state.salesTasks||[]).filter(t=>
t.department===cfg.department&&t.status==='in_progress'&&!normalizeStaffName(t.assignee)
).length;const badge=document.getElementById(key+'DistributionBadge');if(badge)badge.textContent=needCount?String(needCount):'';}
function openProductiveDistributionPage(key){const cfg=getProductiveConfig(key);if(!cfg)return;if(key==='hr'){['hrProContent','hrStaffConfigContent','hrStandaloneContent'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none'});document.querySelectorAll('#hrProNav button').forEach(b=>b.classList.remove('active'));}
productiveTaskViewModes[key]='distribution';const content=document.getElementById(cfg.contentId);if(content)content.style.display='block';document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('show'));setProductiveTopTab(key,'distribution');document.getElementById('crumb').innerHTML=`<b>قسم ${esc(cfg.label)}</b> / القائمة الرئيسية لقسم ${esc(cfg.label)}`;renderProductiveDistributionBoard(key);}
function openProductiveRunningTasksPage(key){const cfg=getProductiveConfig(key);if(!cfg)return;if(key==='hr'){['hrProContent','hrStaffConfigContent','hrStandaloneContent'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none'});document.querySelectorAll('#hrProNav button').forEach(b=>b.classList.remove('active'));}
productiveTaskViewModes[key]='running';const content=document.getElementById(cfg.contentId);if(content)content.style.display='block';document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('show'));setProductiveTopTab(key,'running');document.getElementById('crumb').innerHTML=`<b>قسم ${esc(cfg.label)}</b> / مهام جارية`;renderProductiveRunningTasks(key);}
function refreshProductiveView(key){const cfg=getProductiveConfig(key);if(cfg&&document.getElementById(cfg.appId)?.dataset.taskView==='assign')return window.MoshDepartmentDashboard.openAssignment(key);if(productiveTaskViewModes[key]==='running')openProductiveRunningTasksPage(key);else openProductiveDistributionPage(key);}
function assignProductiveTaskFromBoard(key,taskId){const cfg=getProductiveConfig(key);if(!cfg)return;const t=(state.salesTasks||[]).find(x=>String(x.id)===String(taskId));if(!t||t.status!=='in_progress'||t.department!==cfg.department)return;const selected=normalizeStaffName(document.getElementById(key+'Assign_'+taskId)?.value);if(!selected){alert('اختر المنفذ أولاً.');return;}
const profile=getStaffProfileByName(selected);const manager=getDepartmentManager(cfg.department);if(!profile){alert(`الاسم المختار غير موجود ضمن موظفي قسم ${cfg.label}.`);return;}
if(!isStaffAssignable(profile)){alert('هذا الموظف غير نشط أو مستقيل ولا يمكن توزيع مهام جديدة عليه.');return;}
const isManager=!!manager&&String(manager.id)===String(profile.id);if(profile.department!==cfg.department&&!isManager){alert(`الموظف المختار ليس ضمن قسم ${cfg.label}.`);return;}
pushAppUndo();if(isManager){const previous=t.assignee||'';if(previous&&(previous!==selected||String(t.assigneeId||'')!==String(profile.id)))closeTaskWorkSession(t,'reassigned_to_manager');t.assignee=selected;t.assigneeId=String(profile.id);t.assignmentMode='manager_self';t.employeeState='new';resetTaskReviewWorkflow(t);t.history=t.history||[];t.history.push({text:`تم توزيع المهمة على مدير قسم ${cfg.label} ${selected} للتنفيذ.`,time:activityTimestamp(),by:currentUserDisplayName()
});}else{if(!assignTaskWorkflow(t,selected)){appUndoStack.pop();return;}
}
save();renderProductiveDistributionBoard(key);}
function departmentAssignmentButtons(key,t){
 if(!window.MoshAuth37?.canModule(key,'assign')||!window.MoshSharedDistribution32||
    t.status!=='in_progress'||t.assigneeId||normalizeStaffName(t.assignee)||t.employeeState==='finished'||
    t.sharedDistributionRoot||t.sharedTeamContainer||(t.sharedDistributionChild&&t.sharedNodeType!=='department'))return '';
 const id=MoshTaskUI.arg(t.id);
 const team=`<button type="button" class="btn" onclick="event.stopPropagation();MoshSharedDistribution32.openTeam(${id})">أكثر من موظف</button>`;
 return t.sharedDistributionChild?team:team+` <button type="button" class="btn" onclick="event.stopPropagation();MoshSharedDistribution32.openDepartments(${id})">أكثر من قسم</button>`;
}
function renderProductiveDistributionBoard(key){const cfg=getProductiveConfig(key);if(!cfg)return;const box=document.getElementById(cfg.workspaceId);if(!box)return;setProductiveTopTab(key,'distribution');const all=(state.salesTasks||[]).filter(t=>t.department===cfg.department&&t.status==='in_progress');const needs=all.filter(t=>!normalizeStaffName(t.assignee));const assigned=all.filter(t=>normalizeStaffName(t.assignee));const working=assigned.filter(t=>['working','revision'].includes(productiveTaskStateKey(t))).length;const review=assigned.filter(t=>productiveTaskStateKey(t)==='review').length;const pageKey=`prod_${key}_distribution`;const result=filterAndPageAppList(pageKey,needs,t=>[t.taskNo,t.number,t.title,t.customer,t.dueDate,t.origin
].join(' '));const manager=getDepartmentManager(cfg.department);box.innerHTML=`
  <div class="design-board-head">
   <div>
    <h2>توزيع مهام قسم ${esc(cfg.label)}</h2>
    <div class="muted">المهام التي لم يتم تحديد منفذ لها بعد. بعد التوزيع تنتقل تلقائياً إلى «مهام جارية».</div>
   </div>
   <div class="task-manager-chip">مدير القسم <b>${esc(manager?.name||'غير محدد')}</b></div>
  </div>

  <details class="r38-task-insights"><summary aria-label="فتح ملخص المهام وتوزيعها">ملخص المهام وتوزيعها <span class="r38-chevron" aria-hidden="true">⌄</span></summary><div class="r38-insights-body"><div class="design-report-grid">
   <div class="design-report-card attention"><div class="label">بحاجة توزيع</div><div class="value">${needs.length}</div></div>
   <div class="design-report-card"><div class="label">مهام جارية موزعة</div><div class="value">${assigned.length}</div></div>
   <div class="design-report-card"><div class="label">قيد العمل / التعديل</div><div class="value">${working}</div></div>
   <div class="design-report-card"><div class="label">بانتظار مراجعة المدير</div><div class="value">${review}</div></div>
  </div>

  ${productiveTeamReportHtml(key,all)}</div></details>

  <div class="panel design-distribution-table">
   <div class="toolbar" style="padding:0 0 10px;margin:0">
    <div class="toolbar-left"><h3 style="margin:0">مهام بحاجة توزيع</h3><span class="muted">${needs.length} مهمة</span></div>
   </div>

   ${result.total?`<table class="list-table">
    <thead><tr><th class="mt54-reference" hidden aria-hidden="true">رقم المهمة</th><th>المهمة</th><th>العميل</th><th>الموعد</th><th>توزيع على</th><th></th></tr></thead>
    <tbody>
     ${result.items.map(t=>`<tr>
      <td class="mt54-reference" hidden aria-hidden="true"><button class="link-btn" onclick="openProductiveTaskDetails('${key}',${MoshTaskUI.arg(t.id)},'distribution')">${esc(t.taskNo||t.number)}</button></td>
      <td class="mt54-task-name">${esc(t.title||'-')}</td>
      <td class="mt54-client-name">${esc(t.customer||'-')}</td>
      <td>${esc(t.dueDate||'-')}</td>
      <td><select id="${key}Assign_${t.id}">${productiveAssigneeOptions(key)}</select></td>
      <td><button type="button" class="btn primary" onclick="assignProductiveTaskFromBoard('${key}',${MoshTaskUI.arg(t.id)})">توزيع</button>
       ${departmentAssignmentButtons(key,t)}
      </td>
     </tr>`).join('')}
    </tbody>
   </table>`:`<div class="empty">ممتاز — لا يوجد حالياً مهام ${esc(cfg.label)} بحاجة توزيع.</div>`}

   ${appListPagerHtml(pageKey,result,{placeholder:'بحث ضمن المهام التي بحاجة توزيع...'})}
  </div>`;}
function setProductiveRunningFilter(key,type,value){const f=productiveRunningFilters[key]||(productiveRunningFilters[key]={employee:'all',status:'all'});if(type==='employee')f.employee=value||'all';if(type==='status')f.status=value||'all';resetAppListPage(`prod_${key}_running`);renderProductiveRunningTasks(key);}
function canViewUnassignedMarketingTasks(){
 const auth=window.MoshAuth37,u=window.MoshApi?.user;
 if(!u||!auth?.canModule?.('marketing','view'))return false;
 const manager=getDepartmentManager('التسويق');
 return !!(u.isRoot||auth.isRoot?.()||auth.canModule?.('marketing','approve')||auth.canModule?.('marketing','assign')||(manager&&String(u.employeeId||'')===String(manager.id)));
}
function renderProductiveRunningTasks(key){const cfg=getProductiveConfig(key);if(!cfg)return;const box=document.getElementById(cfg.workspaceId);if(!box)return;setProductiveTopTab(key,'running');const includeUnassigned=key==='marketing'&&canViewUnassignedMarketingTasks();const all=(state.salesTasks||[]).filter(t=>
t.department===cfg.department&&t.status==='in_progress'&&(normalizeStaffName(t.assignee)||includeUnassigned)
);const filters=productiveRunningFilters[key]||(productiveRunningFilters[key]={employee:'all',status:'all'});const employee=filters.employee||'all';const status=filters.status||'all';const selected=all.filter(t=>{if(employee!=='all'&&normalizeStaffName(t.assignee)!==employee)return false;if(status!=='all'&&(status==='unassigned'?!!normalizeStaffName(t.assignee):productiveTaskStateKey(t)!==status))return false;return true;});const pageKey=`prod_${key}_running`;const result=filterAndPageAppList(pageKey,selected,t=>[t.taskNo,t.number,t.title,t.customer,t.assignee,t.dueDate,productiveTaskStateLabel(t),t.parentTaskTitle
].join(' '));const people=getProductiveTeamPeople(key);const counts={all:all.length,new:all.filter(t=>normalizeStaffName(t.assignee)&&productiveTaskStateKey(t)==='new').length,working:all.filter(t=>productiveTaskStateKey(t)==='working'&&normalizeStaffName(t.assignee)).length,revision:all.filter(t=>productiveTaskStateKey(t)==='revision'&&normalizeStaffName(t.assignee)).length,review:all.filter(t=>productiveTaskStateKey(t)==='review'&&normalizeStaffName(t.assignee)).length
};box.innerHTML=`
  <div class="design-board-head">
   <div>
    <h2>مهام ${esc(cfg.label)} الجارية</h2>
    <div class="muted">${includeUnassigned?'تظهر المهام الموزعة وغير الموزعة للمخوّلين بالتوزيع، مع متابعة العمل حسب الحالة.':'تظهر المهام الموزعة حسب حالة المهمة وحمل كل موظف.'}</div>
   </div>
  </div>

  <details class="r38-task-insights"><summary aria-label="فتح ملخص المهام وتوزيعها">ملخص المهام وتوزيعها <span class="r38-chevron" aria-hidden="true">⌄</span></summary><div class="r38-insights-body"><div class="design-report-grid">
   <div class="design-report-card"><div class="label">${includeUnassigned?'إجمالي مهام القسم':'إجمالي المهام الموزعة'}</div><div class="value">${counts.all}</div></div>
   <div class="design-report-card"><div class="label">بانتظار البدء</div><div class="value">${counts.new}</div></div>
   <div class="design-report-card"><div class="label">قيد العمل / التعديل</div><div class="value">${counts.working+counts.revision}</div></div>
   <div class="design-report-card"><div class="label">بانتظار مراجعة المدير</div><div class="value">${counts.review}</div></div>
  </div>

  ${productiveTeamReportHtml(key,all)}</div></details>

  <div class="panel">
   <div class="design-running-filter">
    <div class="filter-field">
     <label>الموظف</label>
     <select onchange="setProductiveRunningFilter('${key}','employee',this.value)">
      <option value="all">كل فريق ${esc(cfg.label)}</option>
      ${people.map(p=>`<option value="${esc(p.name)}" ${employee===p.name?'selected':''}>${esc(p.name)}${p.isManager?' — مدير القسم':''}</option>`).join('')}
     </select>
    </div>
    <div class="filter-field">
     <label>حالة المهمة</label>
     <select onchange="setProductiveRunningFilter('${key}','status',this.value)">
      <option value="all" ${status==='all'?'selected':''}>كل الحالات</option>
      ${includeUnassigned?`<option value="unassigned" ${status==='unassigned'?'selected':''}>بانتظار التوزيع</option>`:''}
      <option value="new" ${status==='new'?'selected':''}>بانتظار البدء</option>
      <option value="working" ${status==='working'?'selected':''}>قيد العمل</option>
      <option value="revision" ${status==='revision'?'selected':''}>قيد التعديل</option>
      <option value="review" ${status==='review'?'selected':''}>بانتظار مراجعة المدير</option>
     </select>
    </div>
   </div>

   ${result.total?`<table class="list-table">
    <thead><tr><th class="mt54-reference" hidden aria-hidden="true">رقم المهمة</th><th>المهمة</th><th>العميل</th><th>الموظف</th><th>الحالة</th><th>الموعد</th></tr></thead>
    <tbody>
     ${result.items.map(t=>`<tr class="data" onclick="openProductiveTaskDetails('${key}',${MoshTaskUI.arg(t.id)},'running')">
      <td class="mt54-reference" hidden aria-hidden="true">${esc(t.taskNo||t.number)}</td>
      <td class="mt54-task-name">${esc(t.title||'-')}${t.parentTaskId?` <span class="muted">— ${esc(t.parentTaskTitle||'-')}</span>`:''}</td>
      <td class="mt54-client-name">${esc(t.customer||'-')}</td>
      <td>${esc(t.assignee||'غير موزعة')}</td>
      <td><span class="workflow-status ${workflowStatusClass(t)}"><span class="design-state-dot ${productiveTaskStateKey(t)}"></span>${esc(!normalizeStaffName(t.assignee)?'بانتظار التوزيع':productiveTaskStateLabel(t))}</span></td>
      <td>${esc(t.dueDate||'-')}</td>
     </tr>`).join('')}
    </tbody>
   </table>`:`<div class="empty">لا يوجد مهام مطابقة لهذه الفلترة.</div>`}

   ${appListPagerHtml(pageKey,result,{placeholder:'بحث بالمهمة أو العميل أو الموظف...'})}
  </div>`;}
function openProductiveTaskDetails(key,id,mode){const cfg=getProductiveConfig(key);if(!cfg)return;productiveTaskViewModes[key]=mode==='running'?'running':'distribution';activeTaskViewContext={source:'department',containerId:cfg.workspaceId,department:cfg.department,productiveKey:key,productiveMode:productiveTaskViewModes[key]
};openTaskDetails(id);}
function getProductiveContext(containerId,department=''){return Object.entries(PRODUCTIVE_DEPARTMENTS).find(([,cfg])=>
cfg.workspaceId===containerId &&(!department||cfg.department===department)
)?.[0]||'';}
function refreshProductiveDepartmentAfterAction(containerId,department){const key=getProductiveContext(containerId,department);if(!key)return false;refreshProductiveView(key);return true;}
function openDesignDistributionPage(){return openProductiveDistributionPage('design')}
function openDesignRunningTasksPage(){return openProductiveRunningTasksPage('design')}
function renderDesignDistributionBoard(){return renderProductiveDistributionBoard('design')}
function renderDesignRunningTasks(){return renderProductiveRunningTasks('design')}
function openDesignTaskDetails(id,mode){return openProductiveTaskDetails('design',id,mode||productiveTaskViewModes.design)}
function renderDepartmentTasks(department,containerId){const box=document.getElementById(containerId);if(!box)return;const activeTasks=(state.salesTasks||[]).filter(t=>t.department===department&&t.status==='in_progress');const counts={all:activeTasks.length,new:activeTasks.filter(t=>departmentTaskBucket(t)==='new').length,working:activeTasks.filter(t=>departmentTaskBucket(t)==='working').length,review:activeTasks.filter(t=>departmentTaskBucket(t)==='review').length
};const filter=departmentTaskFilters[containerId]||'all';const filtered=filter==='all'?activeTasks:activeTasks.filter(t=>departmentTaskBucket(t)===filter);const key='dept|'+containerId+'|'+encodeURIComponent(department);const result=filterAndPageAppList(key,filtered,t=>[t.taskNo,t.number,t.title,t.customer,t.assignee,t.parentTaskTitle,workflowEmployeeLabel(t),t.reviewManager
].join(' '));const manager=getDepartmentManager(department);const kpi=(id,label,count)=>`<div class="workflow-kpi ${filter===id?'active':''}" onclick="setDepartmentTaskFilter('${department}','${containerId}','${id}')"><div class="muted">${label}</div><div class="n">${count}</div></div>`;box.innerHTML=`
  <div class="workflow-manager-strip">
   <div><b>مدير ${esc(departmentDisplayName(department))} والمسؤول عن اللوحة:</b> ${manager?`<span style="color:var(--gold);font-weight:900">${esc(manager.name)}</span>`:'<span class="muted">غير محدد بعد من الموارد البشرية</span>'}</div>
   <div class="muted">هو المسؤول عن توزيع المهمة أو تنفيذها بنفسه أو إعادتها للتعديل أو ترحيلها أو إنهائها.</div>
  </div>

  <div class="workflow-kpis">
   ${kpi('all','كل المهام',counts.all)}
   ${kpi('new','مهمة جديدة',counts.new)}
   ${kpi('working','قيد العمل',counts.working)}
   ${kpi('review','للتعديل أو للترحيل',counts.review)}
  </div>

  <div class="panel">
   ${result.total?`<table class="list-table">
    <thead>
     <tr><th class="mt54-reference" hidden aria-hidden="true">رقم المهمة</th><th>عنوان المهمة</th><th>العميل</th><th>المسؤول عنها</th><th>الحالة</th><th>المدير المباشر</th></tr>
    </thead>
    <tbody>
     ${result.items.map(t=>`<tr class="data" onclick="openDepartmentTaskDetails(${MoshTaskUI.arg(t.id)},'${containerId}','${department}')">
      <td class="mt54-reference" hidden aria-hidden="true">${esc(t.taskNo||t.number)}</td>
      <td class="mt54-task-name">${esc(t.title)}${t.parentTaskId?` <span class="muted">— ${esc(t.parentTaskTitle||'-')}</span>`:''}</td>
      <td class="mt54-client-name">${esc(t.customer||'-')}</td>
      <td>${esc(t.assignee||manager?.name||'مدير القسم')}</td>
      <td><span class="workflow-status ${workflowStatusClass(t)}">${esc(workflowEmployeeLabel(t))}</span></td>
      <td>${esc(t.reviewManager||(!t.assignee?manager?.name:getDirectManagerName(t.assignee,t.department))||'-')}</td>
     </tr>`).join('')}
    </tbody>
   </table>`:'<div class="empty">لا يوجد مهام ضمن هذا التصنيف.</div>'}
   ${appListPagerHtml(key,result,{placeholder:'بحث ضمن مهام القسم...'})}
  </div>`;}
function openDepartmentTaskDetails(id,containerId,department){const productiveKey=getProductiveContext(containerId,department);if(productiveKey){openProductiveTaskDetails(productiveKey,id,productiveTaskViewModes[productiveKey]);return;}
activeTaskViewContext={source:containerId==='allTasksContainer'?'all':'department',containerId:containerId||'allTasksContainer',department:department||''
};openTaskDetails(id);}
function updateManagerTaskMeta(id,containerId,department){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id));if(!t||t.status!=='in_progress')return;const due=document.getElementById('managerDueDate_'+id)?.value||'';if(window.MoshDeadline34&&!window.MoshDeadline34.ready('managerDueDate_'+id))return;const dueRule=window.MoshDeadline34?.ruleFor('managerDueDate_'+id,t)||null;if(due===t.dueDate&&JSON.stringify(dueRule)===JSON.stringify(t.dueRule||null))return;pushAppUndo();t.dueDate=due;t.dueRule=dueRule;t.history=t.history||[];t.history.push({text:'تم تعديل موعد المهمة.',time:activityTimestamp(),by:currentUserDisplayName()});save();}
function transferDepartmentTask(id,containerId,oldDepartment){return managerTransferTask(id,containerId,oldDepartment)}
function finishDepartmentTask(id,containerId,department){return managerFinishAndInvoice(id,containerId,department)}
let activeTaskViewContext={source:'all',containerId:'allTasksContainer',department:''};function openTaskDetailsFromAll(id){activeTaskViewContext={source:'all',containerId:'allTasksContainer',department:''};openTaskDetails(id);}
function fullTaskBackAction(){const ctx=activeTaskViewContext||{};if(ctx.returnTo==='adminTasks')return 'MoshR29.returnToAdminTasks()';if(ctx.source==='workproof'){return 'openWorkProofAdmin()';}
if(ctx.source==='accountingPackages'){return `goApp('accounting',null);setTimeout(()=>openAccountingSection('packages'),0)`;}
if(ctx.source==='department'&&ctx.productiveKey){return ctx.productiveMode==='running'
?`openProductiveRunningTasksPage('${String(ctx.productiveKey).replace(/'/g,"\\'")}')`
:`openProductiveDistributionPage('${String(ctx.productiveKey).replace(/'/g,"\\'")}')`;}
if(ctx.source==='department'&&ctx.containerId&&ctx.department){return `renderDepartmentTasks('${String(ctx.department).replace(/'/g,"\\'")}','${String(ctx.containerId).replace(/'/g,"\\'")}')`;}
return 'renderAllTasks()';}
function formatTaskChatTime(value){const raw=String(value||'').trim();const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);if(!m)return{time:'',date:raw};return{time:`${m[4]}:${m[5]}`,date:`${m[3]}/${m[2]}`};}
function taskChatSideMetaHtml(item){const stamp=formatTaskChatTime(item.time||'');return `<div class="task-chat-side-meta" title="${esc(item.by||'-')} · ${esc(item.time||'')}">
  <span class="who">${esc(item.by||'-')}</span>
  ${stamp.time?`<span class="clock">${esc(stamp.time)}</span>`:''}
  ${stamp.date?`<span class="date">${esc(stamp.date)}</span>`:''}
 </div>`;}
function taskChatItemHtml(item,me){const mine=normalizeStaffName(item.by)===normalizeStaffName(me);const isMedia=item.kind==='media'||!!item.attachmentKey;const sideMeta=taskChatSideMetaHtml(item);const withSides=(body)=>mine?`${sideMeta}${body}`:`${body}${sideMeta}`;if(!isMedia){return `<div class="task-chat-row ${mine?'mine':'other'}">
   <div class="task-chat-line">
    ${withSides(`<div class="task-chat-bubble">${esc(item.text||'')}</div>`)}
   </div>
  </div>`;}
const type=String(item.mediaType||'').toLowerCase();const kind=attachmentKind(type);const preview=(kind==='image'&&item.previewDataUrl)
?`<img class="task-chat-thumb" src="${esc(item.previewDataUrl)}" alt="${esc(item.name||'صورة')}" loading="eager" onclick="openTaskChatImage(this.src,this.alt)">`
:'<div class="task-chat-media-loading">جارٍ تحميل المرفق...</div>';const body=`<div class="task-chat-bubble task-chat-media-bubble">
   <div class="task-chat-media"
        data-task-chat-media-key="${esc(item.attachmentKey||'')}"
        data-task-chat-media-kind="${kind}"
        data-task-chat-media-name="${esc(item.name||'مرفق')}"
        data-task-chat-has-preview="${item.previewDataUrl?'1':'0'}">
    ${preview}
   </div>
   <div class="task-chat-file-name">${esc(item.name||'مرفق')}</div>
  </div>`;return `<div class="task-chat-row ${mine?'mine':'other'}">
  <div class="task-chat-line">${withSides(body)}</div>
 </div>`;}
function taskRunningChatHtml(t){const messages=Array.isArray(t.workChat)?t.workChat:[];const me=currentUserDisplayName();return `<div class="task-running-chat">
  <div class="task-running-thread" id="taskChatThread_${t.id}">
   ${messages.length
?messages.map(m=>taskChatItemHtml(m,me)).join('')
:'<div class="task-running-empty">ابدأ المحادثة على المهمة.</div>'}
  </div>

  <div class="task-chat-composer">
   <div class="task-chat-media-actions">
    <button type="button" class="attachment-icon-btn" title="إضافة مرفق" aria-label="إضافة مرفق" onclick="document.getElementById(${MoshTaskUI.arg('taskChatAttachment_'+t.id)}).click()">
     <svg viewBox="0 0 24 24" aria-hidden="true" class="attach-svg">
      <path d="M8.5 12.8l6.1-6.1a3.2 3.2 0 0 1 4.5 4.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8-8"></path>
     </svg>
    </button>
    <button type="button" class="attachment-icon-btn voice-icon-btn" id="taskChatVoiceBtn_${t.id}" title="تسجيل صوت" onclick="toggleTaskChatVoice(${MoshTaskUI.arg(t.id)})">
     <svg viewBox="0 0 24 24" aria-hidden="true" class="attach-svg" id="taskChatVoiceSvg_${t.id}">
      <rect x="9" y="3.5" width="6" height="11" rx="3"></rect>
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0"></path>
      <path d="M12 17v3.5"></path>
      <path d="M9 20.5h6"></path>
     </svg>
    </button>
    <input id="taskChatAttachment_${t.id}" type="file" multiple hidden onchange="addTaskChatMedia(${MoshTaskUI.arg(t.id)},this.files);this.value=''">
   </div>

   <textarea class="task-chat-input" id="taskChatInput_${t.id}" placeholder="اكتب رسالة..." onkeydown="taskChatKeydown(event,${MoshTaskUI.arg(t.id)})"></textarea>
   <button type="button" class="btn primary task-chat-send" onclick="sendTaskChatMessage(${MoshTaskUI.arg(t.id)})">إرسال</button>
  </div>
 </div>`;}
function taskChatKeydown(event,taskId){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendTaskChatMessage(taskId);}
}
function sendTaskChatMessage(taskId){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(taskId));const input=document.getElementById('taskChatInput_'+taskId);if(!task||!input)return;const text=String(input.value||'').trim();if(!text)return;pushAppUndo();task.workChat=Array.isArray(task.workChat)?task.workChat:[];task.workChat.push({id:'MSG/'+Date.now()+'/'+Math.random().toString(36).slice(2,7),kind:'text',text,by:currentUserDisplayName(),time:activityTimestamp()
});save();refreshTaskChatView(taskId);}
function refreshTaskChatView(taskId){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(taskId));if(!task)return;if(task.parentTaskId)openSubTaskDetails(task.id,task.parentTaskId);else openTaskDetails(task.id);}
function fileAsDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('تعذر قراءة الصورة'));reader.readAsDataURL(file);});}
async function makeTaskImagePreview(file){if(!file||attachmentKind(file.type||'')!=='image')return '';try{const raw=await fileAsDataUrl(file);const img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error('تعذر فتح الصورة'));el.src=raw;});const max=260;const iw=img.naturalWidth||img.width||1;const ih=img.naturalHeight||img.height||1;const scale=Math.min(1,max/Math.max(iw,ih));const w=Math.max(1,Math.round(iw*scale));const h=Math.max(1,Math.round(ih*scale));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)return raw.length<900000?raw:'';ctx.drawImage(img,0,0,w,h);return canvas.toDataURL('image/jpeg',.56);}catch(e){try{if((file.size||0)<=700000)return await fileAsDataUrl(file);}catch(_e){}
return '';}
}
async function addTaskChatMedia(taskId,files){if(!window.MoshUpload31){alert('لم يكتمل تحميل خدمة المرفقات. حدّث الصفحة.');return;}return window.MoshUpload31.addTaskFiles(taskId,files);}
let taskChatRecorder=null;let taskChatVoiceChunks=[];let taskChatVoiceStream=null;let taskChatVoiceTaskId=null;async function toggleTaskChatVoice(taskId){if(taskChatRecorder&&taskChatVoiceTaskId===taskId&&taskChatRecorder.state==='recording'){taskChatRecorder.stop();return;}
if(taskChatRecorder&&taskChatRecorder.state==='recording'){alert('هناك تسجيل صوتي آخر قيد التشغيل.');return;}
if(!window.isSecureContext||!navigator.mediaDevices||typeof navigator.mediaDevices.getUserMedia!=='function'){showMicRequirement();return;}
try{taskChatVoiceStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});taskChatVoiceChunks=[];taskChatVoiceTaskId=taskId;const mime=getVoiceMimeType();taskChatRecorder=new MediaRecorder(taskChatVoiceStream,mime?{mimeType:mime}:{});taskChatRecorder.ondataavailable=e=>{if(e.data&&e.data.size)taskChatVoiceChunks.push(e.data);};taskChatRecorder.onstop=async()=>{const currentId=taskChatVoiceTaskId;const finalMime=taskChatRecorder.mimeType||mime||'audio/webm';const blob=new Blob(taskChatVoiceChunks,{type:finalMime});if(taskChatVoiceStream)taskChatVoiceStream.getTracks().forEach(tr=>tr.stop());taskChatVoiceStream=null;taskChatRecorder=null;taskChatVoiceChunks=[];taskChatVoiceTaskId=null;await saveTaskChatVoice(currentId,blob,finalMime);};taskChatRecorder.start(250);const btn=document.getElementById('taskChatVoiceBtn_'+taskId);if(btn)btn.classList.add('voice-recording');}catch(e){taskChatRecorder=null;taskChatVoiceChunks=[];taskChatVoiceTaskId=null;if(taskChatVoiceStream)taskChatVoiceStream.getTracks().forEach(tr=>tr.stop());taskChatVoiceStream=null;alert('تعذر تشغيل المايكروفون.');}
}
async function saveTaskChatVoice(taskId,blob,mimeType){if(!blob?.size)return;const ext=mimeType.includes('mp4')?'m4a':mimeType.includes('ogg')?'ogg':'webm';return addTaskChatMedia(taskId,[new File([blob],'تسجيل صوتي.'+ext,{type:mimeType})]);}
async function hydrateTaskChatMedia(){const nodes=Array.from(document.querySelectorAll('[data-task-chat-media-key]'));for(const box of nodes){if(box.dataset.hydrated==='1')continue;if(box.getAttribute('data-task-chat-has-preview')==='1'&&box.querySelector('img')){box.dataset.hydrated='1';continue;}
const key=box.getAttribute('data-task-chat-media-key')||'';const kind=box.getAttribute('data-task-chat-media-kind')||'file';const name=box.getAttribute('data-task-chat-media-name')||'مرفق';if(!key)continue;try{const rec=await getAttachmentRecord(key);if(!rec||!rec.blob){box.innerHTML='<div class="task-chat-media-loading">المرفق غير متاح.</div>';box.dataset.hydrated='1';continue;}
const url=URL.createObjectURL(rec.blob);if(kind==='image')box.innerHTML=`<img class="task-chat-thumb" src="${url}" alt="${esc(name)}" loading="eager" onclick="openTaskChatImage(this.src,this.alt)">`;else if(kind==='video')box.innerHTML=`<video controls preload="metadata" src="${url}"></video>`;else if(kind==='audio')box.innerHTML=`<audio controls preload="metadata" src="${url}"></audio>`;else box.innerHTML=`<a class="btn" href="${url}" target="_blank">فتح المرفق</a>`;box.dataset.hydrated='1';}catch(e){console.error('MOSH task media hydrate failed',e);box.innerHTML='<div class="task-chat-media-loading">تعذر تحميل المرفق.</div>';box.dataset.hydrated='1';}
}
}
function ensureTaskImageLightbox(){let box=document.getElementById('taskImageLightbox');if(box)return box;box=document.createElement('div');box.id='taskImageLightbox';box.className='task-image-lightbox';box.innerHTML='<button type="button" class="task-image-lightbox-close" aria-label="إغلاق">×</button><img alt="">';box.addEventListener('click',e=>{if(e.target===box||e.target.classList.contains('task-image-lightbox-close'))closeTaskChatImage();});document.body.appendChild(box);return box;}
function openTaskChatImage(src,name='صورة'){const box=ensureTaskImageLightbox();const img=box.querySelector('img');img.src=src||'';img.alt=name||'صورة';box.classList.add('show');}
function closeTaskChatImage(){document.getElementById('taskImageLightbox')?.classList.remove('show');}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTaskChatImage()});function managerFinishPackageSubTask(id,parentId,containerId,department){const task=(state.salesTasks||[]).find(x=>String(x.id)===String(id)&&String(x.parentTaskId)===String(parentId));if(!task||task.status!=='in_progress')return false;pushAppUndo();closeTaskWorkSession(task,'subtask_completed');task.status='completed';task.employeeState='finished';task.reviewManager='';task.returnedForRevision=false;task.completedAt=activityTimestamp();task.completedBy=currentUserDisplayName();task.history=Array.isArray(task.history)?task.history:[];task.history.push({text:'اعتمد مدير القسم انتهاء الخدمة الفرعية ضمن الباقة.',time:task.completedAt,by:currentUserDisplayName()
});moveParentToAccountingIfReady(parentId);save();if(refreshProductiveDepartmentAfterAction(containerId,department)){return true;}
if(containerId&&document.getElementById(containerId)){renderDepartmentTasks(department,containerId);}
return true;}
function taskManagerStatusBannerHtml(t){const labels={new:'بانتظار الاستلام',received:'تم استلام المهمة',working:'المهمة قيد العمل',paused:'المهمة متوقفة مؤقتاً',submitted:'بانتظار مراجعة المدير',finished:'منتهية'};const hints={new:'بانتظار الموظف لبدء دورة التنفيذ',received:'تم الاستلام ويمكن بدء احتساب الوقت',working:'الوقت الفعلي قيد الاحتساب الآن',paused:'يمكن المتابعة أو إنهاء المهمة',submitted:'تم إنهاء التنفيذ وإرسالها للمراجعة',finished:'انتهت دورة التنفيذ'};const st=t.employeeState||'new';const icon=st==='working'?'▶':st==='paused'?'Ⅱ':st==='submitted'?'✓':'◷';return `<div class="time-status-banner"><div class="time-status-icon">${icon}</div><div><b>${esc(labels[st]||workflowEmployeeLabel(t))}</b><span>${esc(hints[st]||'متابعة حالة تنفيذ المهمة')}</span></div></div>`;}
function taskManagerEmployeeCardsHtml(t){const rows=taskEmployeeWorkTotals(t);if(!rows.length)return `<div class="empty" style="padding:14px">لم يبدأ تسجيل وقت لأي موظف بعد.</div>`;const assignee=normalizeStaffName(t.assignee||'');return `<div class="time-employee-grid">${rows.map(row=>{const name=normalizeStaffName(row.employeeName||'')||'غير محدد';const current=name===assignee;const active=current&&t.employeeState==='working';const stateText=active?'يعمل الآن':current&&t.employeeState==='paused'?'متوقف مؤقتاً':current&&t.employeeState==='submitted'?'بانتظار المراجعة':'سجل محفوظ';const initial=(name.trim().charAt(0)||'م').toUpperCase();return `<div class="time-employee-card ${current?'active':''}"><div class="time-employee-top"><div class="time-employee-name"><div class="time-employee-avatar">${esc(initial)}</div><b>${esc(name)}</b></div><span class="time-employee-state ${active?'active':''}">${stateText}</span></div><div class="time-employee-stats"><div class="time-employee-stat"><div class="label">إجمالي وقت الموظف</div><div class="value" data-task-employee-time="${esc(t.id)}" data-employee-id="${esc(row.employeeId||'')}" data-employee-name="${esc(name)}">${formatTaskWorkDuration(row.workedMs)}</div></div><div class="time-employee-stat"><div class="label">عدد جلسات العمل</div><div class="value">${row.sessionCount}</div></div></div></div>`;}).join('')}</div>`;}
function taskManagerControlsHtml(t,containerId){const department=t.department||'';const manager=getDepartmentManager(department);const staff=getDepartmentStaff(department);const isManagerSelf=t.assignmentMode==='manager_self';const waitingManager=t.employeeState==='submitted';const currentAssignee=normalizeStaffName(t.assignee||'');const people=[];if(manager&&manager.active!==false){people.push({name:normalizeStaffName(manager.name),isManager:true
});}
staff
.filter(p=>p.active!==false&&(!manager||String(p.id)!==String(manager.id)))
.forEach(p=>{const n=normalizeStaffName(p.name);if(n&&!people.some(x=>x.name===n))people.push({name:n,isManager:false});});if(currentAssignee&&!people.some(x=>x.name===currentAssignee)){const p=getStaffProfileByName(currentAssignee);people.unshift({name:currentAssignee,isManager:!!(p&&manager&&String(p.id)===String(manager.id))});}
const employeeOptions=['<option value="">اختر المنفذ</option>']
.concat(people.map(p=>`<option value="${esc(p.name)}" ${p.name===currentAssignee?'selected':''}>${esc(p.name)}${p.isManager?' — مدير القسم':''}</option>`))
.join('');let execution='';if(t.assignee&&(window.MoshReceiptModel49?MoshReceiptModel49.category(t)==='new':t.employeeState==='new')){execution=`<div class="task-manager-section">
   <div class="task-manager-section-title">التنفيذ</div>
   <div class="task-manager-row actions-only">
    <button type="button" class="btn primary" onclick="employeeReceiveTask(${esc(JSON.stringify(String(t.id)))},'${containerId}','${department}')">تم استلام المهمة</button>
   </div>
  </div>`;}else if(t.assignee&&t.employeeState==='received'){execution=`<div class="task-manager-section">
   <div class="task-manager-section-title">التنفيذ</div>
   <div class="task-manager-row actions-only">
    <button type="button" class="btn primary" onclick="employeeStartTask(${esc(JSON.stringify(String(t.id)))},'${containerId}','${department}')">جارٍ العمل</button>
   </div>
  </div>`;}else if(t.assignee&&t.employeeState==='working'){execution=`<div class="task-manager-section">
   <div class="task-manager-section-title">التنفيذ</div>
   <div class="task-manager-row actions-only">
    <button type="button" class="btn" onclick="employeePauseTask(${esc(JSON.stringify(String(t.id)))},'${containerId}','${department}')">إيقاف مؤقت</button>
    <button type="button" class="btn primary" onclick="employeeSubmitTask(${esc(JSON.stringify(String(t.id)))},'${containerId}','${department}')">منتهية</button>
    ${t.returnedForRevision?'<span class="workflow-status returned">مُعادة للتعديل</span>':''}
   </div>
  </div>`;}else if(t.assignee&&t.employeeState==='paused'){execution=`<div class="task-manager-section">
   <div class="task-manager-section-title">التنفيذ</div>
   <div class="task-manager-row actions-only">
    <button type="button" class="btn primary" onclick="employeeStartTask(${esc(JSON.stringify(String(t.id)))},'${containerId}','${department}')">جارٍ العمل</button>
    <button type="button" class="btn" onclick="employeeSubmitTask(${esc(JSON.stringify(String(t.id)))},'${containerId}','${department}')">منتهية</button>
    ${t.returnedForRevision?'<span class="workflow-status returned">مُعادة للتعديل</span>':''}
   </div>
  </div>`;}else if(waitingManager){execution=`<div class="task-manager-section">
   <div class="task-manager-section-title">مراجعة المدير</div>
   <div class="task-manager-row actions-only">
    ${!isManagerSelf?`<button type="button" class="btn" onclick="managerReturnTask(${esc(JSON.stringify(String(t.id)))},'${containerId}','${department}')">إعادة للموظف للتعديل</button>`:''}
    <span class="workflow-status review">${isManagerSelf?'جاهزة للترحيل أو الاعتماد':'للتعديل أو للترحيل'}</span>
   </div>
  </div>`;}
const isPackageParent=!t.parentTaskId&&getSubTasks(t.id).length>=2;const decision=`<div class="task-manager-section">
  <div class="task-manager-section-title">${department==='الإدارة'?'قرار المسؤول الإداري':'قرار مدير القسم'}</div>
  <div class="task-manager-row">
   <div class="task-manager-field">
    <label>القسم التالي</label>
    <select id="managerTransferDept_${t.id}" onchange="refreshManagerTransferTarget(${MoshTaskUI.arg(t.id)})">
     ${salesTaskDepartments
.filter(d=>d!==department)
.map(d=>`<option value="${d}">${departmentDisplayName(d)}</option>`)
.join('')}
    </select>
   </div>
   <div class="task-manager-field" id="managerTransferAdminWrap_${t.id}" style="display:none">
    <label>المسؤول الإداري</label><select id="managerTransferAdmin_${t.id}"><option value="">— اختر المسؤول الإداري —</option></select>
   </div>
   <button type="button" class="btn" onclick="managerTransferTask(${esc(JSON.stringify(String(t.id)))},'${containerId}','${department}')">ترحيل لقسم آخر</button>
   ${t.parentTaskId
?`<button type="button" id="managerFinishBtn_${t.id}" class="btn primary manager-finish-btn" onclick="return managerFinishPackageSubTask(${MoshTaskUI.arg(t.id)},${t.parentTaskId},'${containerId}','${department}')">اعتماد وإنهاء الخدمة الفرعية</button>`
:isPackageParent
?`<span class="workflow-status review">إغلاق الباقة وإرسالها للفوترة يتم من المحاسبة</span>`
:`<button type="button" id="managerFinishBtn_${t.id}" class="btn primary manager-finish-btn" onclick="return managerFinishAndInvoice(${MoshTaskUI.arg(t.id)},'${containerId}','${department}')">اعتماد وإنهاء للفوترة</button>`}
  </div>
 </div>`;const idleReturnControls=taskIdleReturnControlsHtml(t,containerId,department);const activity=taskActivityStats(t);const employeeRows=taskEmployeeWorkTotals(t);return `<div class="task-manager-controls time-dashboard">
  <div class="time-head"><div><div class="time-head-title">إدارة وتنفيذ المهمة</div><div class="time-head-sub">متابعة الوقت، توزيع العمل، وحالة التنفيذ بشكل واضح</div></div>${taskManagerStatusBannerHtml(t)}</div>
  <details class="r371-task-time-details">
   <summary>حسابات ووقت المهمة <span aria-hidden="true">⌄</span></summary>
   <div class="time-overview">
   <div class="time-meta-row"><span class="time-meta-pill">${department==='الإدارة'?'المسؤول الإداري':'مدير القسم'} <b>${esc(department==='الإدارة'?(t.assignee||'غير محدد'):(manager?.name||'غير محدد'))}</b></span><span class="time-meta-pill">المسؤول الحالي <b>${esc(t.assignee||'غير موزعة')}</b></span><span class="time-meta-pill">الحالة <b>${esc(workflowEmployeeLabel(t))}</b></span></div>
   <div class="time-metrics">
    <div class="time-metric primary"><div class="label">وقت العمل الفعلي</div><div class="value" data-task-work-time="${esc(t.id)}">${formatTaskWorkDuration(taskActualWorkMs(t))}</div></div>
    <div class="time-metric warn"><div class="label">وقت الخمول</div><div class="value">${formatTaskWorkDuration(activity.idleMs)}</div></div>
    <div class="time-metric"><div class="label">عمل خارج الكمبيوتر</div><div class="value">${formatTaskWorkDuration(activity.awayWorkMs)}</div></div>
    <div class="time-metric"><div class="label">الموظفون الذين عملوا</div><div class="value">${employeeRows.length}</div></div>
    <div class="time-metric"><div class="label">مرات التوقف اليدوي</div><div class="value">${activity.manualPauseCount}</div></div>
    <div class="time-metric"><div class="label">الخمول التلقائي</div><div class="value">${activity.autoIdleCount}</div></div>
    <div class="time-metric"><div class="label">مرات الرجوع</div><div class="value">${activity.returnCount}</div></div>
   </div>
  </div>
  <div class="time-employees"><div class="time-section-head"><div><b>توزيع وقت المهمة على الموظفين</b><div><span>وقت كل موظف محفوظ بشكل مستقل داخل نفس المهمة</span></div></div></div>${taskManagerEmployeeCardsHtml(t)}</div>
  </details>
  <div class="time-assignment-block"><div class="time-section-head"><div><b>توزيع المهمة</b><div><span>حدد الموظف المسؤول الحالي عن التنفيذ</span></div></div></div><div class="task-manager-row" style="grid-template-columns:minmax(220px,1fr) auto"><div class="task-manager-field"><label>الموظف المنفذ</label><select id="managerAssignee_${t.id}">${employeeOptions}</select></div><button type="button" class="btn" onclick="managerAssignTask(${esc(JSON.stringify(String(t.id)))},'${containerId}','${department}')">توزيع</button></div></div>
  ${idleReturnControls}
  ${execution}
  ${decision}
 </div>`;}
function supportRequestTypeLabel(type){return type==='logistics'?'طلب لوجستي':'طلب شراء'}
function supportRequestDestination(type){return type==='logistics'?'اللوجستيات':'المشتريات'}
function supportRequestPriorityLabel(v){return{normal:'عادي',high:'مهم',urgent:'عاجل'}[v]||'عادي'}
function supportRequestStatusLabel(r){return{new:'طلب جديد',in_progress:'قيد التنفيذ',completed:r?.type==='purchase'?'تم الشراء / التأمين':'تم التنفيذ',cancelled:'ملغي / متعذر'}[r?.status]||'طلب جديد'}
function getSupportRequestById(id){return(state.supportRequests||[]).find(r=>String(r.id)===String(id))||null}
function getNextSupportRequestNumber(type){const p=type==='logistics'?'LOG':'PUR',nums=(state.supportRequests||[]).filter(r=>r.type===type).map(r=>Number(String(r.requestNo||'').match(/(\d+)$/)?.[1]||0)).filter(Number.isFinite);return p+'-'+String((nums.length?Math.max(...nums):0)+1).padStart(5,'0')}
function taskSupportRequests(taskId){return(state.supportRequests||[]).filter(r=>String(r.taskId)===String(taskId)).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))}
function supportRequestSummary(r){return r?.type==='purchase'?(r.item||'طلب شراء'):(r.logisticsType||'طلب لوجستي')}
function refreshSupportRequestBadges(){const c={purchase:0,logistics:0};(state.supportRequests||[]).forEach(r=>{if(['new','in_progress'].includes(r.status))c[r.type]=(c[r.type]||0)+1});const p=document.getElementById('purchaseRequestsBadge'),l=document.getElementById('logisticsRequestsBadge');if(p)p.textContent=c.purchase?String(c.purchase):'';if(l)l.textContent=c.logistics?String(c.logistics):''}
function taskSupportRequestsHtml(t){const rs=taskSupportRequests(t.id);return `<div class="task-support-panel"><div class="task-support-head"><b>طلبات لإتمام المهمة</b><div class="task-support-actions"><button type="button" class="btn purchase" onclick="openSupportRequestModal(${MoshTaskUI.arg(t.id)},'purchase')">+ طلب شراء</button><button type="button" class="btn logistics" onclick="openSupportRequestModal(${MoshTaskUI.arg(t.id)},'logistics')">+ طلب لوجستي</button></div></div>${rs.length?`<div class="task-support-list">${rs.map(r=>`<div class="task-support-card"><div><div class="task-support-card-title"><span class="support-type-badge ${r.type}">${supportRequestTypeLabel(r.type)}</span><span>${esc(r.requestNo||'')}</span><span>${esc(supportRequestSummary(r))}</span></div><div class="muted">إلى ${esc(r.destinationDepartment)} · ${esc(supportRequestPriorityLabel(r.priority))} · ${esc(r.neededDate||'بدون تاريخ')}${r.assignedTo?` · المسؤول: ${esc(r.assignedTo)}`:''}</div></div><div style="display:flex;align-items:center;gap:6px"><span class="support-status ${r.status}">${esc(supportRequestStatusLabel(r))}</span><button type="button" class="btn" onclick="openSupportRequestDetails('${r.id}',false)">فتح</button></div></div>`).join('')}</div>`:'<div class="muted" style="font-size:8px">لا توجد طلبات شراء أو خدمات لوجستية مرتبطة بهذه المهمة حالياً.</div>'}</div>`}
function openSupportRequestModal(taskId,type){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(taskId));if(!task)return;supportRequestDraft={taskId:String(taskId),type:type==='logistics'?'logistics':'purchase',files:[]};const isPurchase=supportRequestDraft.type==='purchase',modal=document.getElementById('supportRequestModal'),body=document.getElementById('supportRequestFormBody');document.getElementById('supportRequestModalTitle').textContent=isPurchase?'طلب شراء لإتمام المهمة':'طلب لوجستي لإتمام المهمة';document.getElementById('supportRequestTaskMeta').textContent=`${MoshTaskUI.title(task)} · من قسم ${departmentDisplayName(task.department)||task.department}`;body.innerHTML=`<div class="support-request-source"><b>المهمة يبقى في قسمه الحالي.</b> هذا الطلب فقط يُرسل إلى قسم ${isPurchase?'المشتريات':'اللوجستيات'} ويبقى مرتبطاً بالمهمة.</div><div class="support-form-grid">${isPurchase?`<div class="field"><label>المادة / الخدمة المطلوبة *</label><input id="supportReqItem" placeholder="مثال: طباعة بروشورات، هارد ديسك..."></div><div class="field"><label>الكمية *</label><input id="supportReqQty" value="1"></div><div class="field full"><label>المواصفات والتفاصيل *</label><textarea id="supportReqDetails" rows="4"></textarea></div><div class="field"><label>ميزانية تقديرية</label><input id="supportReqBudget" placeholder="اختياري"></div>`:`<div class="field"><label>نوع الطلب اللوجستي *</label><select id="supportReqLogisticsType"><option>سائق فقط</option><option>سائق + سيارة</option><option>عامل تحميل / تنزيل</option><option>عدة عمال تحميل / تنزيل</option><option>سيارة / فان / شاحنة</option><option>مندوب / توصيل مستندات أو طرد</option><option>استلام / تسليم</option><option>نقل معدات أو عهدة</option><option>تجهيز موقع / قاعة</option><option>مهمة لوجستية خاصة</option></select></div><div class="field"><label>الموقع / المكان</label><input id="supportReqLocation"></div><div class="field full"><label>تفاصيل الطلب *</label><textarea id="supportReqDetails" rows="4"></textarea></div>`}<div class="field"><label>مطلوب بتاريخ</label><input id="supportReqNeededDate" type="date"></div>${!isPurchase?`<div class="field"><label>الوقت المطلوب</label><input id="supportReqNeededTime" type="time"></div>`:''}<div class="field"><label>الأولوية</label><select id="supportReqPriority"><option value="normal">عادي</option><option value="high">مهم</option><option value="urgent">عاجل</option></select></div><div class="field full"><label>ملاحظة إضافية</label><input id="supportReqNote"></div><div class="field full"><label>مرفقات</label><button type="button" class="btn" onclick="document.getElementById('supportReqFiles').click()">اختيار مرفق</button><input id="supportReqFiles" type="file" multiple hidden onchange="captureSupportRequestFiles(this.files)"><div id="supportReqFilesPreview" class="support-file-preview"></div></div></div>`;modal?.classList.add('show')}
function captureSupportRequestFiles(files){supportRequestDraft.files=Array.from(files||[]);const box=document.getElementById('supportReqFilesPreview');if(box)box.innerHTML=supportRequestDraft.files.map(f=>`<span class="support-file-chip">${esc(f.name)} · ${formatAttachmentSize(f.size||0)}</span>`).join('')}
function closeSupportRequestModal(){document.getElementById('supportRequestModal')?.classList.remove('show');supportRequestDraft={taskId:null,type:'purchase',files:[]}}
async function createSupportRequest(){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(supportRequestDraft.taskId));if(!task)return;const type=supportRequestDraft.type==='logistics'?'logistics':'purchase',details=String(document.getElementById('supportReqDetails')?.value||'').trim(),priority=document.getElementById('supportReqPriority')?.value||'normal',neededDate=document.getElementById('supportReqNeededDate')?.value||'',note=String(document.getElementById('supportReqNote')?.value||'').trim();if(!details){alert('اكتب تفاصيل الطلب.');return}let item='',quantity='',estimatedBudget='',logisticsType='',location='',neededTime='';if(type==='purchase'){item=String(document.getElementById('supportReqItem')?.value||'').trim();quantity=String(document.getElementById('supportReqQty')?.value||'').trim();estimatedBudget=String(document.getElementById('supportReqBudget')?.value||'').trim();if(!item){alert('اكتب المادة أو الخدمة المطلوبة.');return}if(!quantity){alert('حدد الكمية.');return}}else{logisticsType=document.getElementById('supportReqLogisticsType')?.value||'أخرى';location=String(document.getElementById('supportReqLocation')?.value||'').trim();neededTime=document.getElementById('supportReqNeededTime')?.value||''}pushAppUndo();const request={id:'SUP/'+Date.now()+'/'+Math.random().toString(36).slice(2,8),requestNo:getNextSupportRequestNumber(type),type,taskId:String(task.id),taskNo:task.taskNo||task.number||'',taskTitle:task.title||'',customer:task.customer||'',sourceDepartment:task.department||'',destinationDepartment:supportRequestDestination(type),item,quantity,details,estimatedBudget,logisticsType,location,neededDate,neededTime,priority,note,status:'new',assignedTo:'',responseNote:'',supplier:'',actualCost:'',purchaseReference:'',attachments:[],history:[],createdAt:activityTimestamp(),createdBy:currentUserDisplayName()};state.supportRequests.push(request);for(let i=0;i<(supportRequestDraft.files||[]).length;i++){const f=supportRequestDraft.files[i],key='support_'+Date.now()+'_'+i+'_'+Math.random().toString(36).slice(2);try{await storeAttachmentRecord({key,scope:'support_request',requestId:String(request.id),name:f.name||'مرفق',type:f.type||'application/octet-stream',size:f.size||0,blob:f,createdAt:new Date().toISOString()});request.attachments.push({key,name:f.name||'مرفق',type:f.type||'application/octet-stream',size:f.size||0})}catch(e){console.error(e)}}task.history=Array.isArray(task.history)?task.history:[];task.history.push({text:`تم إرسال ${supportRequestTypeLabel(type)} ${request.requestNo} إلى قسم ${request.destinationDepartment}.`,time:activityTimestamp(),by:currentUserDisplayName()});task.workChat=Array.isArray(task.workChat)?task.workChat:[];task.workChat.push({id:'SYS/'+Date.now(),kind:'text',text:`${type==='purchase'?'🛒':'🚚'} تم إرسال ${supportRequestTypeLabel(type)} ${request.requestNo}: ${supportRequestSummary(request)}`,by:currentUserDisplayName(),time:activityTimestamp(),system:true});save();closeSupportRequestModal();refreshSupportRequestBadges();openTaskDetails(task.id)}
function supportRequestAssigneeOptions(r){const dep=r.destinationDepartment,manager=getDepartmentManager(dep),people=[];if(manager&&isStaffAssignable(manager))people.push(manager);getDepartmentStaff(dep).forEach(p=>{if(!people.some(x=>String(x.id)===String(p.id)))people.push(p)});return['<option value="">غير موزع</option>'].concat(people.map(p=>`<option value="${esc(p.name)}" ${normalizeStaffName(p.name)===normalizeStaffName(r.assignedTo)?'selected':''}>${esc(p.name)}${manager&&String(manager.id)===String(p.id)?' — مدير القسم':''}</option>`)).join('')}
async function openSupportRequestAttachment(key,name='مرفق'){try{const rec=await getAttachmentRecord(key);if(!rec||!rec.blob){alert('المرفق غير متاح.');return}const url=URL.createObjectURL(rec.blob),a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){alert('تعذر فتح المرفق.')}}
function supportAttachmentsHtml(r){const a=Array.isArray(r.attachments)?r.attachments:[];return a.length?`<div class="support-attachments">${a.map(x=>`<button type="button" class="btn" onclick="openSupportRequestAttachment('${esc(x.key)}','${esc(x.name||'مرفق')}')">${esc(x.name||'مرفق')}</button>`).join('')}</div>`:'<span class="muted">لا يوجد مرفقات.</span>'}
function openSupportRequestDetails(id,manage=false){const r=getSupportRequestById(id);if(!r)return;const isPurchase=r.type==='purchase',modal=document.getElementById('supportRequestDetailsModal'),body=document.getElementById('supportRequestDetailsBody');document.getElementById('supportRequestDetailsTitle').textContent=`${supportRequestTypeLabel(r.type)} ${r.requestNo||''}`;document.getElementById('supportRequestDetailsMeta').textContent=`المهمة ${MoshTaskUI.relatedTitle(r)} · من ${departmentDisplayName(r.sourceDepartment)||r.sourceDepartment}`;body.innerHTML=`<div class="support-detail-grid"><div class="support-detail-item"><div class="label">الحالة</div><div class="value"><span class="support-status ${r.status}">${esc(supportRequestStatusLabel(r))}</span></div></div><div class="support-detail-item"><div class="label">الأولوية</div><div class="value">${esc(supportRequestPriorityLabel(r.priority))}</div></div>${isPurchase?`<div class="support-detail-item"><div class="label">المادة / الخدمة</div><div class="value">${esc(r.item||'-')}</div></div><div class="support-detail-item"><div class="label">الكمية</div><div class="value">${esc(r.quantity||'-')}</div></div>`:`<div class="support-detail-item"><div class="label">نوع الطلب</div><div class="value">${esc(r.logisticsType||'-')}</div></div><div class="support-detail-item"><div class="label">الموقع</div><div class="value">${esc(r.location||'-')}</div></div>`}<div class="support-detail-item"><div class="label">مطلوب بتاريخ</div><div class="value">${esc(r.neededDate||'-')}${r.neededTime?` · ${esc(r.neededTime)}`:''}</div></div><div class="support-detail-item full"><div class="label">التفاصيل</div><div class="value">${esc(r.details||'-')}</div></div><div class="support-detail-item full"><div class="label">المرفقات</div><div class="value">${supportAttachmentsHtml(r)}</div></div>${r.responseNote?`<div class="support-detail-item full"><div class="label">رد القسم المستلم</div><div class="value">${esc(r.responseNote)}</div></div>`:''}</div><div style="margin-top:10px"><button type="button" class="btn" onclick="openSourceTaskFromSupport('${r.id}')">فتح المهمة الأصلي</button></div>${manage?`<div class="support-manage-box"><h3 style="margin:0 0 8px">تنفيذ الطلب</h3><div class="support-manage-grid"><div class="field"><label>المسؤول</label><select id="supportManageAssignee">${supportRequestAssigneeOptions(r)}</select></div><div class="field"><label>الحالة</label><select id="supportManageStatus"><option value="new" ${r.status==='new'?'selected':''}>طلب جديد</option><option value="in_progress" ${r.status==='in_progress'?'selected':''}>قيد التنفيذ</option><option value="completed" ${r.status==='completed'?'selected':''}>${isPurchase?'تم الشراء / التأمين':'تم التنفيذ'}</option><option value="cancelled" ${r.status==='cancelled'?'selected':''}>ملغي / متعذر</option></select></div>${isPurchase?`<div class="field"><label>المورد</label><input id="supportManageSupplier" value="${esc(r.supplier||'')}"></div><div class="field"><label>التكلفة الفعلية</label><input id="supportManageActualCost" value="${esc(r.actualCost||'')}"></div><div class="field"><label>مرجع الشراء / الفاتورة</label><input id="supportManageReference" value="${esc(r.purchaseReference||'')}"></div>`:''}<div class="field full"><label>ملاحظة القسم المستلم</label><textarea id="supportManageNote" rows="3">${esc(r.responseNote||'')}</textarea></div></div><div class="modal-actions" style="padding:10px 0 0;margin:0"><button type="button" class="btn primary" onclick="saveSupportRequestManagement('${r.id}')">حفظ تحديث الطلب</button></div></div>`:''}`;modal?.classList.add('show')}
function closeSupportRequestDetails(){document.getElementById('supportRequestDetailsModal')?.classList.remove('show')}
function saveSupportRequestManagement(id){const r=getSupportRequestById(id);if(!r)return;const oldStatus=r.status,oldAssignee=normalizeStaffName(r.assignedTo);r.status=document.getElementById('supportManageStatus')?.value||r.status;r.assignedTo=normalizeStaffName(document.getElementById('supportManageAssignee')?.value);r.responseNote=String(document.getElementById('supportManageNote')?.value||'').trim();if(r.type==='purchase'){r.supplier=String(document.getElementById('supportManageSupplier')?.value||'').trim();r.actualCost=String(document.getElementById('supportManageActualCost')?.value||'').trim();r.purchaseReference=String(document.getElementById('supportManageReference')?.value||'').trim()}r.updatedAt=activityTimestamp();r.updatedBy=currentUserDisplayName();const task=(state.salesTasks||[]).find(t=>String(t.id)===String(r.taskId));if(task&&(oldStatus!==r.status||oldAssignee!==r.assignedTo)){task.history=Array.isArray(task.history)?task.history:[];task.history.push({text:`تحديث ${supportRequestTypeLabel(r.type)} ${r.requestNo}: ${supportRequestStatusLabel(r)}${r.assignedTo?` — ${r.assignedTo}`:''}.`,time:activityTimestamp(),by:currentUserDisplayName()});task.workChat=Array.isArray(task.workChat)?task.workChat:[];task.workChat.push({id:'SYS/'+Date.now(),kind:'text',text:`${r.type==='purchase'?'🛒':'🚚'} ${r.requestNo}: ${supportRequestStatusLabel(r)}${r.responseNote?` — ${r.responseNote}`:''}`,by:currentUserDisplayName(),time:activityTimestamp(),system:true})}save();refreshSupportRequestBadges();openSupportRequestDetails(r.id,true);renderSupportRequestsPage(r.type)}
function openSourceTaskFromSupport(id){const r=getSupportRequestById(id);if(!r)return;closeSupportRequestDetails();goApp('tasks',null);setTimeout(()=>openTaskDetails(Number(r.taskId)||r.taskId),0)}
function supportRequestFilterStatus(type,value){supportRequestFilters[type].status=value||'open';resetAppListPage(type==='purchase'?'purchase_requests':'logistics_requests');renderSupportRequestsPage(type)}
function supportRequestFilterAssignee(type,value){supportRequestFilters[type].assignee=value||'all';resetAppListPage(type==='purchase'?'purchase_requests':'logistics_requests');renderSupportRequestsPage(type)}
function openSupportRequestsPage(type){const p=type==='purchase',app=document.getElementById(p?'purchasesAppContent':'logisticsAppContent'),req=document.getElementById(p?'purchasesRequestsContent':'logisticsRequestsContent');if(app)app.style.display='none';if(req)req.style.display='block';document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('show'));document.getElementById('crumb').innerHTML=`<b>${p?'قسم المشتريات':'قسم اللوجستيات'}</b> / ${p?'طلبات الشراء':'الطلبات اللوجستية'}`;renderSupportRequestsPage(type)}
function renderSupportRequestsPage(type){const p=type==='purchase',box=document.getElementById(p?'purchasesRequestsWorkspace':'logisticsRequestsWorkspace');if(!box)return;const all=(state.supportRequests||[]).filter(r=>r.type===type).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))),f=supportRequestFilters[type]||{status:'open',assignee:'all'},filtered=all.filter(r=>{if(f.status==='open'&&!['new','in_progress'].includes(r.status))return false;if(!['open','all'].includes(f.status)&&r.status!==f.status)return false;if(f.assignee!=='all'&&normalizeStaffName(r.assignedTo)!==f.assignee)return false;return true}),key=p?'purchase_requests':'logistics_requests',result=filterAndPageAppList(key,filtered,r=>[r.requestNo,r.taskNo,r.taskTitle,r.customer,r.sourceDepartment,supportRequestSummary(r),r.assignedTo,r.status,r.neededDate].join(' ')),dep=p?'المشتريات':'اللوجستيات',manager=getDepartmentManager(dep),people=[];if(manager&&isStaffAssignable(manager))people.push(manager);getDepartmentStaff(dep).forEach(x=>{if(!people.some(y=>String(y.id)===String(x.id)))people.push(x)});const c={new:all.filter(r=>r.status==='new').length,progress:all.filter(r=>r.status==='in_progress').length,completed:all.filter(r=>r.status==='completed').length,cancelled:all.filter(r=>r.status==='cancelled').length};box.innerHTML=`<div class="support-inbox-head"><div><h2>${p?'طلبات الشراء':'الطلبات اللوجستية'}</h2><div class="muted">طلبات مساندة من المهام. المهمة الأصلي لا ينتقل من قسمه.</div></div><span class="task-manager-chip">مدير القسم <b>${esc(manager?.name||'غير محدد')}</b></span></div><div class="support-summary-grid"><div class="support-summary-card"><div class="label">طلبات جديدة</div><div class="value">${c.new}</div></div><div class="support-summary-card"><div class="label">قيد التنفيذ</div><div class="value">${c.progress}</div></div><div class="support-summary-card"><div class="label">${p?'تم الشراء / التأمين':'تم التنفيذ'}</div><div class="value">${c.completed}</div></div><div class="support-summary-card"><div class="label">ملغي / متعذر</div><div class="value">${c.cancelled}</div></div></div><div class="panel"><div class="support-inbox-filters"><div><label>الحالة</label><select onchange="supportRequestFilterStatus('${type}',this.value)"><option value="open" ${f.status==='open'?'selected':''}>الطلبات المفتوحة</option><option value="new" ${f.status==='new'?'selected':''}>طلب جديد</option><option value="in_progress" ${f.status==='in_progress'?'selected':''}>قيد التنفيذ</option><option value="completed" ${f.status==='completed'?'selected':''}>${p?'تم الشراء / التأمين':'تم التنفيذ'}</option><option value="cancelled" ${f.status==='cancelled'?'selected':''}>ملغي / متعذر</option><option value="all" ${f.status==='all'?'selected':''}>كل الطلبات</option></select></div><div><label>المسؤول</label><select onchange="supportRequestFilterAssignee('${type}',this.value)"><option value="all">كل المسؤولين</option><option value="" ${f.assignee===''?'selected':''}>غير موزع</option>${people.map(x=>`<option value="${esc(x.name)}" ${f.assignee===normalizeStaffName(x.name)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div></div>${result.total?`<table class="list-table"><thead><tr><th>رقم الطلب</th><th>المهمة</th><th>القسم الطالب</th><th>الطلب</th><th>المطلوب</th><th>المسؤول</th><th>الحالة</th></tr></thead><tbody>${result.items.map(r=>`<tr class="data" onclick="openSupportRequestDetails('${r.id}',true)"><td><b>${esc(r.requestNo||'')}</b></td><td>${MoshTaskUI.nameHtml({title:MoshTaskUI.relatedTitle(r)})}</td><td>${esc(departmentDisplayName(r.sourceDepartment)||r.sourceDepartment||'-')}</td><td>${esc(supportRequestSummary(r))}<div class="muted">${esc(supportRequestPriorityLabel(r.priority))}</div></td><td>${esc(r.neededDate||'-')}</td><td>${esc(r.assignedTo||'غير موزع')}</td><td><span class="support-status ${r.status}">${esc(supportRequestStatusLabel(r))}</span></td></tr>`).join('')}</tbody></table>`:'<div class="empty">لا يوجد طلبات مطابقة.</div>'}${appListPagerHtml(key,result,{placeholder:'بحث برقم الطلب، المهمة أو محتوى الطلب...'})}</div>`;refreshSupportRequestBadges()}
function taskWorkflowPanelHtml(t,containerId){if(!t||t.status!=='in_progress')return '';const isDepartment=activeTaskViewContext?.source==='department';return `<div class="panel" style="margin-top:16px">
  ${isDepartment?taskManagerControlsHtml(t,containerId):''}
  ${isDepartment?taskSupportRequestsHtml(t):''}
  ${taskRunningChatHtml(t)}
 </div>`;}
function renderAllTasks(){activeTaskViewContext={source:'all',containerId:'allTasksContainer',department:''};const box=document.getElementById('allTasksContainer');if(!box)return;const allTasks=(state.salesTasks||[]).filter(t=>!t.parentTaskId&&!['archived_invoiced','archived_no_invoice'].includes(t.status));const result=filterAndPageAppList('alltasks',allTasks,t=>[t.taskNo,t.number,t.title,t.customer,t.department,t.assignee,t.status,t.origin,workflowEmployeeLabel(t)].join(' '));box.innerHTML=`<div class="panel">${result.total?`<table class="list-table"><thead><tr><th class="mt54-reference" hidden aria-hidden="true">رقم المهمة</th><th>عنوان المهمة</th><th>العميل</th><th>القسم الحالي</th><th>الموظف</th><th>الحالة</th></tr></thead><tbody>${result.items.map(t=>`<tr class="data" onclick="openTaskDetailsFromAll(${MoshTaskUI.arg(t.id)})"><td class="mt54-reference" hidden aria-hidden="true">${esc(t.taskNo||t.number)}</td><td class="mt54-task-name">${esc(t.title)}</td><td class="mt54-client-name">${esc(t.customer||'-')}</td><td>${esc(departmentDisplayName(t.department)||'-')}</td><td>${esc(t.assignee||'-')}</td><td>${t.status==='awaiting_invoice'?'<span class="workflow-status review">بانتظار الفوترة</span>':t.status==='invoiced'?'<span class="workflow-status done">تمت الفوترة</span>':`<span class="workflow-status ${workflowStatusClass(t)}">${esc(workflowEmployeeLabel(t))}</span>`}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">لا يوجد مهام مطابقة.</div>'}${appListPagerHtml('alltasks',result,{placeholder:'بحث بالمهمة، العميل، القسم، الموظف...'})}</div>`;}
function openTaskDetails(id){setDirtyState(false);const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id));if(!t)return;const ctx=activeTaskViewContext||{source:'all',containerId:'allTasksContainer',department:''};const containerId=ctx.containerId||'allTasksContainer';const box=document.getElementById(containerId);if(!box)return;const backAction=fullTaskBackAction();const isWorkProofView=ctx.source==='workproof';const isDepartmentView=ctx.source==='department'||isWorkProofView;const departmentLocked=isDepartmentView?'disabled':'';const assigneeLocked=isDepartmentView?'readonly':'';const basicReadonly=isDepartmentView?'readonly':'';box.innerHTML=`
  <div class="toolbar">
   <div class="toolbar-left">
    <button type="button" class="btn" onclick="${backAction}">${ctx.returnTo==='adminTasks'?'رجوع لمهام الإدارة':ctx.source==='workproof'?'رجوع لمتابعة العمل':ctx.source==='accountingPackages'?'رجوع لقائمة الباقات':ctx.source==='department'?'رجوع لمهام القسم':'رجوع للمهمات'}</button>
    ${isWorkProofView?'':`<button type="button" class="btn save-btn" onclick="saveTaskChanges(${MoshTaskUI.arg(t.id)},'${containerId}','${ctx.source==='department'?'department':'all'}')">حفظ</button>`}
    ${isWorkProofView?'':`<button type="button" class="btn cancel-edit-btn" onclick="${backAction}">إلغاء الأمر</button>`}
    ${ctx.source==='all'?`<button type="button" class="btn delete-task-btn" onclick="deleteMainTask(${MoshTaskUI.arg(t.id)})">حذف المهمة</button>`:''}
    <h2 style="margin:0" class="mt54-task-name">${esc(t.title)}${t.parentTaskId?` <span class="muted">— ${esc(t.parentTaskTitle||'-')}</span>`:''}</h2>
   </div>
  </div>

  <div class="sales-task-card">

   <div class="field-grid">
    <div class="field"><label>اسم المهمة</label><input id="taskEditTitle_${t.id}" value="${esc(t.title||'')}" ${basicReadonly}></div>
    <div class="field mt54-reference" hidden aria-hidden="true"><label>رقم المهمة</label><input id="taskEditTaskNo_${t.id}" value="${esc(t.taskNo||t.number||'')}" ${basicReadonly}></div>
    <div class="field">
     <label>العميل</label>
     <input id="taskEditCustomer_${t.id}" list="taskCustomersList_${t.id}" autocomplete="off" value="${esc(t.customer||'')}" ${basicReadonly}>
     <datalist id="taskCustomersList_${t.id}">${customersCatalog.map(c=>`<option value="${esc(MoshCustomerNames36.display(c))}" label="${esc(MoshCustomerNames36.display(c))}"></option>`).join('')}</datalist>
    </div>
    <div class="field"><label>مرجع أمر المبيعات</label><input id="taskEditSalesOrderNo_${t.id}" value="${esc(t.salesOrderNo||'')}" ${basicReadonly}></div>
    <div class="field"><label>منشأ المهمة</label><input id="taskEditOrigin_${t.id}" value="${esc(t.origin||(t.salesOrderId?'أمر مبيعات':'مهمة مباشرة'))}" ${basicReadonly}></div>
    <div class="field"><label>أنشأها</label><input value="${esc(t.createdBy||'محمد')}" readonly></div>
    <div class="field">
     <label>القسم الحالي</label>
     <select id="taskEditDepartment_${t.id}" ${departmentLocked}>
      ${t.department==='المهمات'?'<option value="المهمات" selected>قسم المهمات</option>':''}${salesTaskDepartments.map(d=>`<option value="${d}" ${d===t.department?'selected':''}>${departmentDisplayName(d)}</option>`).join('')}
     </select>
    </div>
    <div class="field"><label>المسؤول</label><input id="taskEditAssignee_${t.id}" value="${esc(t.assignee||'')}" ${assigneeLocked}></div>
    <div class="field"><label>الموعد</label><input id="taskEditDueDate_${t.id}" type="date" value="${esc(t.dueDate||'')}" ${basicReadonly}></div>
   </div>

   <div class="field" style="grid-template-columns:1fr;margin-top:12px">
    <label>تفاصيل المهمة بشكل كامل</label>
    <textarea id="taskEditDescription_${t.id}" rows="5" ${basicReadonly}>${esc(t.description||'')}</textarea>
   </div>

   <div class="field" style="grid-template-columns:1fr;margin-top:12px">
    <label>ملاحظات يجب الاطلاع عليها قبل تنفيذ المهمة</label>
    <textarea id="taskEditNotes_${t.id}" rows="4" ${basicReadonly}>${esc(t.notes||'')}</textarea>
   </div>

   ${taskWorkflowPanelHtml(t,containerId)}

   ${isDepartmentView?'':taskAttachmentsSection(t,'taskAttachmentsAll')}

   ${!t.parentTaskId?`
   <div class="panel" style="margin-top:16px">
    <div class="toolbar" style="padding:0 0 12px 0;margin:0">
     <div class="toolbar-left"><h3 style="margin:0">المهام الفرعية</h3></div>
     ${isWorkProofView?'':`<button type="button" class="btn primary" onclick="openSubTaskModal(${MoshTaskUI.arg(t.id)})">+ إضافة مهمة فرعية</button>`}
    </div>

    ${getSubTasks(t.id).length?`
     <table class="list-table">
      <thead><tr><th class="mt54-reference" hidden aria-hidden="true">رقم المهمة</th><th>عنوان المهمة</th><th>القسم</th><th>المسؤول</th><th>الحالة</th></tr></thead>
      <tbody>
       ${getSubTasks(t.id).map(st=>`<tr class="data" onclick="openSubTaskDetails(${MoshTaskUI.arg(st.id)},${MoshTaskUI.arg(t.id)})">
        <td class="mt54-reference" hidden aria-hidden="true">${esc(st.taskNo||st.number)}</td>
        <td class="mt54-task-name">${esc(st.title)}${st.parentTaskTitle?` <span class="muted">— ${esc(st.parentTaskTitle)}</span>`:''}</td>
        <td>${esc(st.department||'-')}</td>
        <td>${esc(st.assignee||'-')}</td>
        <td>${esc(workflowEmployeeLabel(st))}</td>
       </tr>`).join('')}
      </tbody>
     </table>`:'<div class="empty">لا يوجد مهام فرعية حتى الآن.</div>'}
   </div>`:''}

   ${!t.parentTaskId&&getSubTasks(t.id).length?`
    <div class="panel" style="margin-top:14px">
     <b>تقدم الباقة:</b> ${getSubTaskProgress(t.id).done} من ${getSubTaskProgress(t.id).total} خدمات منتهية
     <div class="muted" style="margin-top:6px">
      ${getSubTaskProgress(t.id).done<getSubTaskProgress(t.id).total
?'عند اكتمال المهام الفرعية، ترجع المهمة الرئيسية لمدير القسم ليقرر ترحيلها أو إنهاءها.'
:'جميع المهام الفرعية مكتملة.'}
     </div>
    </div>`:''}

   <details class="task-activities">
    <summary>النشاطات <span class="task-activities-count">${(t.history||[]).length}</span></summary>
    <div class="task-activities-body">
     ${(t.history||[]).slice().reverse().map(h=>`<div class="message">
      <div class="meta">${esc(h.time)}${h.by?` · ${esc(h.by)}`:''}</div>
      ${esc(MoshTaskUI.historyText(h.text))}
     </div>`).join('')|| '<div class="muted" style="padding:10px">لا يوجد نشاطات.</div>'}
    </div>
   </details>

  </div>`;refreshSaveButtons();if(!isDepartmentView && Array.isArray(t.attachments)&&t.attachments.length){hydrateTaskAttachments(t.id,'taskAttachmentsAll_'+t.id);}
if(isDepartmentView){setTimeout(async()=>{await hydrateTaskChatMedia();const thread=document.getElementById('taskChatThread_'+t.id);if(thread)thread.scrollTop=thread.scrollHeight;},40);}
}
function openSubTaskDetails(id,parentId){setDirtyState(false);const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id) && String(x.parentTaskId)===String(parentId));const parent=(state.salesTasks||[]).find(x=>String(x.id)===String(parentId));const containerId=activeTaskViewContext?.containerId||'allTasksContainer';const box=document.getElementById(containerId);if(!t||!parent||!box)return;box.innerHTML=`
  <div class="toolbar">
   <div class="toolbar-left">
    <button class="btn" onclick="openTaskDetails(${MoshTaskUI.arg(parent.id)})">رجوع للمهمة الرئيسية</button>
    <button class="btn save-btn" onclick="saveSubTaskChanges(${MoshTaskUI.arg(t.id)},${MoshTaskUI.arg(parent.id)})">حفظ</button>
    <button class="btn cancel-edit-btn" onclick="cancelTaskChanges(${MoshTaskUI.arg(t.id)},'allTasksContainer','subtask',${MoshTaskUI.arg(parent.id)})">إلغاء الأمر</button>
    <button type="button" class="btn delete-task-btn" onclick="deleteSubTask(${MoshTaskUI.arg(t.id)},${MoshTaskUI.arg(parent.id)})">حذف المهمة الفرعية</button>
    <h2 style="margin:0" class="mt54-task-name">${esc(t.title)}</h2>
   </div>
  </div>

  <div class="sales-task-card">
   <div class="panel" style="margin-bottom:14px">
    <div class="muted">تابعة للمهمة الرئيسية: <b class="mt54-task-name">${esc(MoshTaskUI.title(parent))}</b></div>
   </div>

   <div class="field-grid">
    <div class="field"><label>اسم المهمة</label><input id="taskEditTitle_${t.id}" value="${esc(t.title||'')}"></div>
    <div class="field mt54-reference" hidden aria-hidden="true"><label>رقم المهمة</label><input id="taskEditTaskNo_${t.id}" value="${esc(t.taskNo||t.number||'')}"></div>
    <div class="field"><label>العميل</label><input id="taskEditCustomer_${t.id}" list="taskCustomersList_${t.id}" autocomplete="off" value="${esc(t.customer||'')}"><datalist id="taskCustomersList_${t.id}">${customersCatalog.map(c=>`<option value="${esc(MoshCustomerNames36.display(c))}" label="${esc(MoshCustomerNames36.display(c))}"></option>`).join('')}</datalist></div>
    <div class="field"><label>مرجع أمر المبيعات</label><input id="taskEditSalesOrderNo_${t.id}" value="${esc(t.salesOrderNo||'')}"></div>
    <div class="field"><label>منشأ المهمة</label><input id="taskEditOrigin_${t.id}" value="${esc(t.origin||(t.salesOrderId?'أمر مبيعات':'مهمة مباشرة'))}"></div>
    <div class="field"><label>أنشأها</label><input value="${esc(t.createdBy||'محمد')}" readonly></div>
    <div class="field"><label>القسم الحالي</label>
      <select id="taskEditDepartment_${t.id}">
       ${t.department==='المهمات'?'<option value="المهمات" selected>قسم المهمات</option>':''}${salesTaskDepartments.map(d=>`<option value="${d}" ${d===t.department?'selected':''}>${departmentDisplayName(d)}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>المسؤول</label><input id="taskEditAssignee_${t.id}" value="${esc(t.assignee||'')}"></div>
    <div class="field"><label>الموعد</label><input id="taskEditDueDate_${t.id}" type="date" value="${esc(t.dueDate||'')}"></div>
   </div>

   <div class="field" style="grid-template-columns:1fr;margin-top:12px"><label>تفاصيل المهمة بشكل كامل</label><textarea id="taskEditDescription_${t.id}" rows="5">${esc(t.description||'')}</textarea></div>
   <div class="field" style="grid-template-columns:1fr;margin-top:12px"><label>ملاحظات يجب الاطلاع عليها قبل تنفيذ المهمة</label><textarea id="taskEditNotes_${t.id}" rows="4">${esc(t.notes||'')}</textarea></div>

   ${t.status==='in_progress'?`<div style="margin-top:14px"><button class="btn primary" onclick="finishSubTask(${MoshTaskUI.arg(t.id)},${MoshTaskUI.arg(parent.id)})">إنهاء المهمة الفرعية</button></div>`:''}

   <details class="task-activities">
    <summary>النشاطات <span class="task-activities-count">${(t.history||[]).length}</span></summary>
    <div class="task-activities-body">
     ${(t.history||[]).slice().reverse().map(h=>`<div class="message"><div class="meta">${esc(h.time)}</div>${esc(MoshTaskUI.historyText(h.text))}</div>`).join('')|| '<div class="muted" style="padding:10px">لا يوجد نشاطات.</div>'}
    </div>
   </details>
  </div>`;refreshSaveButtons();}
function saveSubTaskChanges(id,parentId){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id) && String(x.parentTaskId)===String(parentId));if(!t)return;const title=document.getElementById('taskEditTitle_'+id);const taskNo=document.getElementById('taskEditTaskNo_'+id);const customer=document.getElementById('taskEditCustomer_'+id);const salesOrderNo=document.getElementById('taskEditSalesOrderNo_'+id);const origin=document.getElementById('taskEditOrigin_'+id);const department=document.getElementById('taskEditDepartment_'+id);const assignee=document.getElementById('taskEditAssignee_'+id);const dueDate=document.getElementById('taskEditDueDate_'+id);const description=document.getElementById('taskEditDescription_'+id);const notes=document.getElementById('taskEditNotes_'+id);if(!department)return;const oldDepartment=t.department;const newDepartment=department.value;const nextAssignee=assignee?normalizeStaffName(assignee.value):normalizeStaffName(t.assignee);const staffChanged=nextAssignee!==normalizeStaffName(t.assignee)||newDepartment!==oldDepartment;const nextProfile=nextAssignee?getStaffProfileByName(nextAssignee):null;if(nextAssignee&&staffChanged&&!r37AssignableProfile(nextAssignee,newDepartment,assignee))return;pushAppUndo();if(title)t.title=title.value.trim()|| t.title;if(taskNo){t.taskNo=taskNo.value.trim()|| t.taskNo || t.number;t.number=t.taskNo;}
if(customer){const catalogCustomer=getCatalogCustomerByName(customer.value);if(!catalogCustomer){alert('العميل غير موجود ضمن قائمة العملاء. اختر عميل موجود من القائمة.');customer.focus();return;}
t.customer=catalogCustomer.name;}
if(salesOrderNo)t.salesOrderNo=salesOrderNo.value.trim();if(origin)t.origin=origin.value.trim();if(staffChanged&&t.assignee)closeTaskWorkSession(t,'reassigned_from_subtask_editor');t.department=newDepartment;t.assignee=nextAssignee;t.assigneeId=nextAssignee?(nextProfile?.id?String(nextProfile.id):String(t.assigneeId||'')):'';if(staffChanged){t.employeeState='new';t.assignmentMode=nextAssignee?'manager_assigned':'manager';resetTaskReviewWorkflow(t);}t.dueDate=dueDate?dueDate.value:'';t.description=description?description.value:'';t.notes=notes?notes.value:'';t.history=t.history||[];if(oldDepartment!==newDepartment){t.history.push({text:`تم حفظ المهمة الفرعية وتحويلها من ${oldDepartment} إلى ${newDepartment}`,time:activityTimestamp(),by:currentUserDisplayName()
});}else{t.history.push({text:'تم حفظ تعديلات المهمة الفرعية.',time:activityTimestamp(),by:currentUserDisplayName()
});}
save();setDirtyState(false);openSubTaskDetails(id,parentId);}
function finishSubTask(id,parentId){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id)&& String(x.parentTaskId)===String(parentId));if(!t || t.status!=='in_progress')return;pushAppUndo();closeTaskWorkSession(t,'subtask_completed');t.status='completed';t.employeeState='finished';t.reviewManager='';t.returnedForRevision=false;t.completedAt=activityTimestamp();t.completedBy=currentUserDisplayName();t.history=t.history||[];t.history.push({text:'تم إنهاء المهمة الفرعية.',time:t.completedAt,by:currentUserDisplayName()});moveParentToAccountingIfReady(parentId);save();openTaskDetails(parentId);}
let pendingTaskDelete=null;function deleteMainTask(id){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id)&& !x.parentTaskId);if(!t)return;const subs=getSubTasks(id);pendingTaskDelete={type:'main',id:String(id)};const text=document.getElementById('deleteTaskConfirmText');if(text){text.innerHTML=`هل أنت متأكد من حذف المهمة <b class="mt54-task-name">${esc(t.title)}</b>؟
   ${subs.length?`<div style="margin-top:8px">سيتم أيضًا حذف <b>${subs.length}</b> مهمة فرعية مرتبطة بها.</div>`:''}`;}
const modal=document.getElementById('deleteTaskConfirmModal');if(modal)modal.classList.add('show');}
function deleteSubTask(id,parentId){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id)&& String(x.parentTaskId)===String(parentId));if(!t)return;pendingTaskDelete={type:'sub',id:String(id),parentId:String(parentId)};const text=document.getElementById('deleteTaskConfirmText');if(text){text.innerHTML=`هل أنت متأكد من حذف المهمة الفرعية <b class="mt54-task-name">${esc(t.title)}</b>؟`;}
const modal=document.getElementById('deleteTaskConfirmModal');if(modal)modal.classList.add('show');}
function closeDeleteTaskConfirm(){pendingTaskDelete=null;const modal=document.getElementById('deleteTaskConfirmModal');if(modal)modal.classList.remove('show');}
function confirmTaskDelete(){if(!pendingTaskDelete)return;const request={...pendingTaskDelete};const tasks=state.salesTasks||[];pushAppUndo();if(request.type==='main'){for(let i=tasks.length-1;i>=0;i--){const row=tasks[i];if(String(row.id)===request.id || String(row.parentTaskId)===request.id){tasks.splice(i,1);}
}
state.salesTasks=tasks;save();setDirtyState(false);closeDeleteTaskConfirm();renderAllTasks();return;}
if(request.type==='sub'){const parent=tasks.find(x=>String(x.id)===request.parentId && !x.parentTaskId);const idx=tasks.findIndex(x=>String(x.id)===request.id && String(x.parentTaskId)===request.parentId);if(idx!==-1){const removed=tasks[idx];tasks.splice(idx,1);if(parent){parent.history=parent.history||[];parent.history.push({text:`تم حذف المهمة الفرعية: ${removed.title} (${removed.taskNo||removed.number})`,time:activityTimestamp()
});}
}
state.salesTasks=tasks;save();setDirtyState(false);closeDeleteTaskConfirm();if(parent){openTaskDetails(parent.id);}else{renderAllTasks();}
}
}
window.deleteMainTask=deleteMainTask;window.deleteSubTask=deleteSubTask;window.confirmTaskDelete=confirmTaskDelete;window.closeDeleteTaskConfirm=closeDeleteTaskConfirm;function cancelTaskChanges(id,containerId,source,department){setDirtyState(false);if(source==='department'){renderDepartmentTasks(department||activeTaskViewContext?.department||'',containerId);}else if(source==='project'){openProjectDepartment(department);}else if(source==='subtask'){openTaskDetails(department);}else{renderAllTasks();}
}
function saveTaskChanges(id,containerId,source,parentId){if(window.MoshDeadline34&&!window.MoshDeadline34.ready('taskEditDueDate_'+id))return;const t=(state.salesTasks||[]).find(x=>x.id===id);if(!t)return;const department=document.getElementById('taskEditDepartment_'+id);const assignee=document.getElementById('taskEditAssignee_'+id);const dueDate=document.getElementById('taskEditDueDate_'+id);const notes=document.getElementById('taskEditNotes_'+id);if(!department)return;const oldDepartment=t.department;const newDepartment=department.value;const nextAssignee=assignee?normalizeStaffName(assignee.value):normalizeStaffName(t.assignee);const staffChanged=nextAssignee!==normalizeStaffName(t.assignee)||newDepartment!==oldDepartment;const nextProfile=nextAssignee?getStaffProfileByName(nextAssignee):null;if(nextAssignee&&staffChanged&&!r37AssignableProfile(nextAssignee,newDepartment,assignee))return;pushAppUndo();if(source==='all' || source==='subtask' || source==='department'){const title=document.getElementById('taskEditTitle_'+id);const taskNo=document.getElementById('taskEditTaskNo_'+id);const customer=document.getElementById('taskEditCustomer_'+id);const salesOrderNo=document.getElementById('taskEditSalesOrderNo_'+id);const origin=document.getElementById('taskEditOrigin_'+id);const description=document.getElementById('taskEditDescription_'+id);if(title){const oldTitle=t.title;t.title=title.value.trim()|| t.title;if(!t.parentTaskId && oldTitle!==t.title){(state.salesTasks||[]).forEach(st=>{if(String(st.parentTaskId)===String(t.id)){st.parentTaskTitle=t.title;}
});}
}
if(taskNo){t.taskNo=taskNo.value.trim()|| t.taskNo || t.number;t.number=t.taskNo;}
if(customer){const catalogCustomer=getCatalogCustomerByName(customer.value);if(!catalogCustomer){alert('العميل غير موجود ضمن قائمة العملاء. اختر عميل موجود من القائمة.');customer.focus();return;}
t.customer=catalogCustomer.name;}
if(salesOrderNo)t.salesOrderNo=salesOrderNo.value.trim();if(origin)t.origin=origin.value.trim();if(description)t.description=description.value;}
const oldAssignee=t.assignee||'';if(oldAssignee&&staffChanged)closeTaskWorkSession(t,'reassigned_from_task_editor');t.assignee=nextAssignee;t.assigneeId=nextAssignee?(nextProfile?.id?String(nextProfile.id):String(t.assigneeId||'')):'';t.dueDate=dueDate?dueDate.value:'';t.dueRule=window.MoshDeadline34?.ruleFor('taskEditDueDate_'+id,t)||null;t.notes=notes?notes.value:'';t.department=newDepartment;if(staffChanged){t.employeeState='new';t.assignmentMode=nextAssignee?'manager_assigned':'manager';resetTaskReviewWorkflow(t);}
t.history=t.history||[];if(oldDepartment!==newDepartment){t.history.push({text:`تم حفظ المهمة وتحويلها من ${oldDepartment} إلى ${newDepartment}`,time:activityTimestamp()});}else{t.history.push({text:'تم حفظ تعديلات المهمة.',time:activityTimestamp(),by:currentUserDisplayName()});}
save();setDirtyState(false);if(source==='department'){activeTaskViewContext={source:'department',containerId,department:t.department};openTaskDetails(id);}else if(source==='project'){openProjectDepartment(newDepartment);}else if(source==='subtask'){openSubTaskDetails(id,parentId);}else{openTaskDetails(id);}
}
function transferAllTask(id){const t=state.salesTasks.find(x=>x.id===id);if(!t || t.status!=='in_progress')return;const sel=document.getElementById('allTaskDept_'+id);if(!sel)return;const next=sel.value;if(next===t.department)return;pushAppUndo();const prev=t.department;closeTaskWorkSession(t,'transferred');t.department=next;t.assignee='';t.assigneeId='';t.assignmentMode='manager';t.employeeState='new';resetTaskReviewWorkflow(t);t.history=t.history||[];t.history.push({text:`تم تحويل المهمة من ${prev} إلى ${next}`,time:activityTimestamp()});save();renderAllTasks();}
function finishAllTask(id){const t=state.salesTasks.find(x=>x.id===id);if(!t||t.status!=='in_progress'||t.parentTaskId)return;if(getSubTasks(t.id).length>=2){alert('هذه باقة. إنهاء الباقة وإرسالها للفوترة يتم من «قائمة الباقات» في قسم المحاسبة.');return;}
if(!confirm('إنهاء المهمة نهائيًا من جميع الأقسام وتحويلها للفوترة؟'))return;pushAppUndo();t.status='awaiting_invoice';t.employeeState='finished';t.reviewManager='';t.returnedForRevision=false;t.closedFromDepartment=t.department;t.department='المحاسبة';t.closedAt=activityTimestamp();t.closedBy=currentUserDisplayName();t.history=t.history||[];t.history.push({text:'تم إنهاء المهمة نهائيًا وتحويلها إلى المحاسبة بانتظار الفوترة.',time:t.closedAt,by:currentUserDisplayName()});save();renderAllTasks();}
function renderSalesTasks(){const box=document.getElementById('salesTasksContainer');if(!box)return;const tasks=(state.salesTasks||[]).filter(t=>!t.parentTaskId&&!['archived_invoiced','archived_no_invoice'].includes(t.status));box.innerHTML=tasks.length?tasks.map(t=>`
  <div class="sales-task-card">
   <div class="task-head">
    <div>
      <b class="mt54-task-name">${esc(t.title)}</b>
      ${MoshTaskUI.clientHtml(t)}
      <div class="muted">مرجع أمر المبيعات: ${esc(t.salesOrderNo||'-')}</div>
    </div>
    <span class="task-badge ${t.status==='invoiced'?'done':t.status==='awaiting_invoice'?'wait':''}">
     ${t.status==='invoiced'?'تمت الفوترة':t.status==='awaiting_invoice'?'بانتظار الفوترة':workflowEmployeeLabel(t)}
    </span>
   </div>
   <div>${esc(t.description||'')}</div>
   <div class="task-meta">
    <div>القسم الحالي: <b>${esc(t.department||'')}</b></div>
    <div>المسؤول: <b>${esc(t.assignee||'-')}</b></div>
    <div>الموعد: <b>${esc(t.dueDate||'-')}</b></div>
   </div>
   ${t.notes?`<div class="muted" style="margin-bottom:10px">ملاحظات: ${esc(t.notes)}</div>`:''}
   ${t.status==='in_progress'?`<div class="sales-task-actions">
     <select id="taskDept_${t.id}">${salesTaskDepartments.map(d=>`<option value="${d}" ${d===t.department?'selected':''}>${departmentDisplayName(d)}</option>`).join('')}</select>
     <button class="btn" onclick="transferSalesTask(${MoshTaskUI.arg(t.id)})">تحويل للقسم</button>
     <button class="btn primary" onclick="finishSalesTask(${MoshTaskUI.arg(t.id)})">إنهاء المهمة وتحويلها للفوترة</button>
   </div>`:''}
   <div style="margin-top:10px">${(t.history||[]).slice().reverse().map(h=>`<div class="message"><div class="meta">${esc(h.time)}</div>${esc(MoshTaskUI.historyText(h.text))}</div>`).join('')}</div>
  </div>`).join(''):'<div class="empty">لا يوجد مهام حتى الآن.</div>';}
function transferSalesTask(id){const t=state.salesTasks.find(x=>x.id===id);if(!t || t.status!=='in_progress')return;const sel=document.getElementById('taskDept_'+id);if(!sel)return;const next=sel.value;if(next===t.department)return;pushAppUndo();const prev=t.department;closeTaskWorkSession(t,'transferred');t.department=next;t.assignee='';t.assigneeId='';t.assignmentMode='manager';t.employeeState='new';resetTaskReviewWorkflow(t);t.history=t.history||[];t.history.push({text:`تم تحويل المهمة من ${prev} إلى ${next}`,time:activityTimestamp()});save();renderSalesTasks();}
function finishSalesTask(id){const t=state.salesTasks.find(x=>x.id===id);if(!t||t.status!=='in_progress')return;if(getSubTasks(t.id).length>=2){alert('هذه باقة. إنهاء الباقة وإرسالها للفوترة يتم من «قائمة الباقات» في قسم المحاسبة.');return;}
if(!confirm('إنهاء المهمة نهائيًا وتحويلها للفوترة؟'))return;pushAppUndo();t.status='awaiting_invoice';t.employeeState='finished';t.reviewManager='';t.returnedForRevision=false;t.closedFromDepartment=t.department;t.department='المحاسبة';t.closedAt=activityTimestamp();t.closedBy=currentUserDisplayName();t.history=t.history||[];t.history.push({text:'تم إنهاء المهمة نهائيًا وتحويلها إلى المحاسبة بانتظار الفوترة.',time:t.closedAt,by:currentUserDisplayName()});save();renderSalesTasks();}
let pendingBillingFinalizeAction=null;let archiveTaskSection='tasks';function normalizeLegacyBillingArchiveTasks(){let changed=false;(state.salesTasks||[]).forEach(t=>{if(t.parentTaskId)return;if(t.status==='invoiced'){t.status='archived_invoiced';t.archiveBillingType='invoiced';t.archivedAt=t.archivedAt||t.invoicedAt||activityTimestamp();t.archivedBy=t.archivedBy||t.closedBy||'النظام';t.history=Array.isArray(t.history)?t.history:[];if(!t.history.some(h=>String(h.text||'').includes('نُقلت المهمة المفوترة إلى أرشيف المهام المنتهية'))){t.history.push({text:'نُقلت المهمة المفوترة إلى أرشيف المهام المنتهية المفوترة.',time:t.archivedAt,by:'النظام'});}
changed=true;}
});if(changed)save();return changed;}
function requestBillingFinalize(id,type){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id)&&!x.parentTaskId);if(!t||t.status!=='awaiting_invoice')return;const mode=type==='no_invoice'?'no_invoice':'invoiced';pendingBillingFinalizeAction={id:String(t.id),type:mode};const modal=document.getElementById('billingFinalizeModal');const title=document.getElementById('billingFinalizeTitle');const text=document.getElementById('billingFinalizeText');const meta=document.getElementById('billingFinalizeMeta');const action=document.getElementById('billingFinalizeAction');if(title)title.textContent=mode==='invoiced'?'تأكيد اكتمال الفوترة':'تأكيد عدم الحاجة للفوترة';if(text)text.textContent=mode==='invoiced'
?'بعد التأكيد ستخرج المهمة من «مهام بانتظار الفوترة» وتنتقل إلى الأرشيف ضمن «المهام المنتهية المفوترة».'
:'بعد التأكيد ستخرج المهمة من «مهام بانتظار الفوترة» وتنتقل إلى الأرشيف ضمن «مهام غير بحاجة للفوترة».';if(meta)meta.textContent=`${MoshTaskUI.title(t)} · ${t.customer||'بدون عميل'}`;if(action){action.textContent=mode==='invoiced'?'تأكيد تمت الفوترة':'تأكيد غير بحاجة للفوترة';action.classList.toggle('no-invoice',mode==='no_invoice');}
modal?.classList.add('show');modal?.setAttribute('aria-hidden','false');}
function closeBillingFinalizeModal(){document.getElementById('billingFinalizeModal')?.classList.remove('show');document.getElementById('billingFinalizeModal')?.setAttribute('aria-hidden','true');pendingBillingFinalizeAction=null;}
function confirmBillingFinalize(){const pending=pendingBillingFinalizeAction;if(!pending)return;const t=(state.salesTasks||[]).find(x=>String(x.id)===String(pending.id)&&!x.parentTaskId);if(!t||t.status!=='awaiting_invoice'){closeBillingFinalizeModal();renderBillingTasks();return;}
pushAppUndo();const now=activityTimestamp();const invoiced=pending.type==='invoiced';t.status=invoiced?'archived_invoiced':'archived_no_invoice';t.archiveBillingType=invoiced?'invoiced':'no_invoice';t.archivedAt=now;t.archivedBy=currentUserDisplayName();t.finalizedAccountingAt=now;t.finalizedAccountingBy=currentUserDisplayName();if(invoiced)t.invoicedAt=now;else t.noInvoiceAt=now;t.history=Array.isArray(t.history)?t.history:[];t.history.push({text:invoiced
?'أكدت المحاسبة اكتمال الفوترة، وتم نقل المهمة إلى أرشيف «المهام المنتهية المفوترة».'
:'أكدت المحاسبة أن المهمة غير بحاجة للفوترة، وتم نقلها إلى أرشيف «مهام غير بحاجة للفوترة».',time:now,by:currentUserDisplayName()
});save();closeBillingFinalizeModal();closeBillingTaskPreview();renderBillingTasks();}
function markTaskInvoiced(id){requestBillingFinalize(id,'invoiced')}
function markTaskNoInvoice(id){requestBillingFinalize(id,'no_invoice')}
function taskPreviewStatusLabel(t){if(t.status==='awaiting_invoice')return 'بانتظار الفوترة';if(t.status==='archived_invoiced'||t.status==='invoiced')return 'تمت الفوترة';if(t.status==='archived_no_invoice')return 'غير بحاجة للفوترة';return workflowEmployeeLabel(t);}
function billingTaskPreviewSubtasksHtml(t){const subs=getSubTasks(t.id);if(!subs.length)return '<div class="billing-preview-empty">لا يوجد خدمات أو مهام فرعية ضمن هذه المهمة.</div>';return `<div class="billing-preview-subtasks">
  ${subs.map((s,index)=>`<div class="billing-preview-subtask">
   <span class="billing-preview-subtask-index">${index+1}</span>
   <div>
    <b class="mt54-task-name">${esc(s.title||'خدمة فرعية')}</b>
    <span>${esc(departmentDisplayName(s.department)||s.department||'—')} · ${esc(s.assignee||'غير موزعة')}</span>
   </div>
   <span class="billing-preview-chip">${esc(accountingSubTaskStatusLabel(s))}</span>
  </div>`).join('')}
 </div>`;}
function openBillingTaskPreview(id){const t=(state.salesTasks||[]).find(x=>String(x.id)===String(id)&&!x.parentTaskId);if(!t)return;const body=document.getElementById('billingTaskPreviewBody');const title=document.getElementById('billingTaskPreviewTitle');const meta=document.getElementById('billingTaskPreviewMeta');if(title)title.textContent=`${MoshTaskUI.title(t)}`;if(meta)meta.textContent=`${t.customer||'بدون عميل'} · ${taskPreviewStatusLabel(t)}`;if(body){body.innerHTML=`
   <div class="billing-preview-grid">
    
    <div class="billing-preview-field"><span>العميل</span><b>${esc(t.customer||'—')}</b></div>
    <div class="billing-preview-field"><span>مرجع أمر المبيعات</span><b>${esc(t.salesOrderNo||'—')}</b></div>
    <div class="billing-preview-field"><span>القسم الأخير</span><b>${esc(t.closedFromDepartment||t.department||'—')}</b></div>
    <div class="billing-preview-field"><span>المسؤول</span><b>${esc(t.assignee||'—')}</b></div>
    <div class="billing-preview-field"><span>الحالة</span><b>${esc(taskPreviewStatusLabel(t))}</b></div>
   </div>
   <div class="billing-preview-section"><h4>تفاصيل المهمة</h4><div class="billing-preview-text">${esc(t.description||'لا يوجد تفاصيل.')}</div></div>
   ${t.notes?`<div class="billing-preview-section"><h4>ملاحظات</h4><div class="billing-preview-text">${esc(t.notes)}</div></div>`:''}
   <div class="billing-preview-section"><h4>الخدمات / المهام الفرعية</h4>${billingTaskPreviewSubtasksHtml(t)}</div>
   <div class="billing-preview-section"><h4>آخر النشاطات</h4><div class="billing-preview-history">
    ${(t.history||[]).slice().reverse().slice(0,12).map(h=>`<div><span>${esc(h.time||'')}</span><b>${esc(MoshTaskUI.historyText(h.text||''))}</b></div>`).join('')||'<div class="billing-preview-empty">لا يوجد نشاطات.</div>'}
   </div></div>
   ${t.status==='awaiting_invoice'?`<div class="billing-preview-actions">
    <button type="button" class="btn primary" onclick="requestBillingFinalize(${MoshTaskUI.arg(t.id)},'invoiced')">تمت الفوترة</button>
    <button type="button" class="btn billing-no-invoice" onclick="requestBillingFinalize(${MoshTaskUI.arg(t.id)},'no_invoice')">غير بحاجة للفوترة</button>
   </div>`:''}
  `;}
document.getElementById('billingTaskPreviewModal')?.classList.add('show');}
function closeBillingTaskPreview(){document.getElementById('billingTaskPreviewModal')?.classList.remove('show');}
function renderBillingTasks(){const rows=document.getElementById('billingTaskRows'),empty=document.getElementById('billingTaskEmpty');if(!rows||!empty)return;normalizeLegacyBillingArchiveTasks();const allTasks=(state.salesTasks||[]).filter(t=>!t.parentTaskId&&t.status==='awaiting_invoice');const result=filterAndPageAppList('billingtasks',allTasks,t=>[t.taskNo,t.number,t.title,t.customer,t.salesOrderNo,t.closedFromDepartment,t.department,t.status
].join(' '));const tasks=result.items;rows.innerHTML=tasks.map(t=>`<tr class="data billing-task-row" onclick="openBillingTaskPreview(${MoshTaskUI.arg(t.id)})" title="اضغط لعرض تفاصيل المهمة">
  <td class="mt54-reference" hidden aria-hidden="true"><b>${esc(t.taskNo||t.number)}</b></td>
  <td class="mt54-task-name">${esc(t.title)}</td>
  <td class="mt54-client-name">${esc(t.customer||'—')}</td>
  <td>${esc(t.salesOrderNo||'-')}</td>
  <td>${esc(t.closedFromDepartment||t.department||'')}</td>
  <td><span class="status draft">بانتظار الفوترة</span></td>
  <td><div class="billing-row-actions">
   <button type="button" class="btn primary" onclick="event.stopPropagation();requestBillingFinalize(${MoshTaskUI.arg(t.id)},'invoiced')">تمت الفوترة</button>
   <button type="button" class="btn billing-no-invoice" onclick="event.stopPropagation();requestBillingFinalize(${MoshTaskUI.arg(t.id)},'no_invoice')">غير بحاجة للفوترة</button>
  </div></td>
 </tr>`).join('');empty.style.display=result.total?'none':'block';let host=document.getElementById('billingTasksPagerHost');if(!host){host=document.createElement('div');host.id='billingTasksPagerHost';rows.closest('.panel')?.appendChild(host)}
if(host)host.innerHTML=appListPagerHtml('billingtasks',result,{placeholder:'بحث في مهام بانتظار الفوترة...'});}
function getOrderBillingStatus(orderId){const tasks=(state.salesTasks||[]).filter(t=>!t.parentTaskId&&String(t.salesOrderId)===String(orderId));if(!tasks.length)return '';if(tasks.some(t=>t.status==='awaiting_invoice'))return 'بانتظار الفوترة';if(tasks.every(t=>['archived_invoiced','invoiced'].includes(t.status)))return 'تمت الفوترة';if(tasks.every(t=>t.status==='archived_no_invoice'))return 'غير بحاجة للفوترة';if(tasks.every(t=>['archived_invoiced','archived_no_invoice','invoiced'].includes(t.status)))return 'مغلقة محاسبيًا';return 'مهمة مبيعات قيد التنفيذ';}
function createInvoice(){pushAppUndo();const q=getSavedQ();if(!q||q.invoiceCreated)return;const t=quoteTotals(q);const id=state.invoices.length+1;state.invoices.push({id,number:'INV/'+String(id).padStart(5,'0'),customer:q.customer,source:q.number,total:t.total,status:'مسودة'});q.invoiceCreated=true;q.chatter.push({who:'النظام',text:'تم إنشاء فاتورة عميل مسودة من أمر المبيعات.',time:activityTimestamp()});appendFollowupLog(q,'تم إنشاء فاتورة عميل مسودة من أمر المبيعات.','salesFollowup');save();workingQuote=null;openQuote(q.id,false)
}
function renderInvoices(){renderDepartmentTasks('المحاسبة','accountingDepartmentTasks');renderBillingTasks();const rows=document.getElementById('invoiceRows'),empty=document.getElementById('invoiceEmpty'),allInvoices=state.invoices||[],result=filterAndPageAppList('invoices',allInvoices,i=>[i.number,i.customer,i.source,i.status,i.total].join(' ')),invoices=result.items;rows.innerHTML=invoices.map(i=>`<tr><td>${i.number}</td><td>${esc(i.customer)}</td><td>${i.source}</td><td>${money(i.total)}</td><td><span class="status draft">${i.status}</span></td></tr>`).join('');empty.style.display=result.total?'none':'block';let host=document.getElementById('invoicePagerHost');if(!host){host=document.createElement('div');host.id='invoicePagerHost';rows.closest('.panel')?.appendChild(host)}if(host)host.innerHTML=appListPagerHtml('invoices',result,{placeholder:'بحث بالفاتورة أو العميل...'});document.getElementById('invCount').innerText=allInvoices.length;document.getElementById('arTotal').innerText=money(allInvoices.reduce((a,b)=>a+b.total,0))}
let accountingPackageStatusFilter='all';function getAccountingPackageTasks(){return(state.salesTasks||[]).filter(task=>{if(task.parentTaskId)return false;if(getSubTasks(task.id).length<2)return false;return task.status!=='awaiting_invoice'
&& task.status!=='invoiced'
&& task.status!=='completed'
&& task.status!=='archived_invoiced'
&& task.status!=='archived_no_invoice';});}
function accountingPackageStatusInfo(task){const subs=getSubTasks(task.id);const ready=subs.length>0&&subs.every(isPackageSubTaskDone);return ready
?{key:'ready',label:'جاهزة للإرسال للفوترة',css:'billing'}
:{key:'progress',label:'قيد التنفيذ',css:'progress'};}
function accountingSubTaskStatusLabel(task){if(isPackageSubTaskDone(task))return 'منتهية';if(task.status==='awaiting_invoice')return 'بانتظار الفوترة';if(task.status==='invoiced')return 'تمت الفوترة';if(task.employeeState==='submitted')return 'بانتظار المدير';if(task.employeeState==='received')return 'تم الاستلام';if(task.employeeState==='paused')return task.returnedForRevision?'متوقفة — للتعديل':'إيقاف مؤقت';if(task.employeeState==='working')return 'جارٍ العمل';if(task.assignee)return 'بانتظار الاستلام';return 'بحاجة للتوزيع';}
function accountingTogglePackageServices(id){const el=document.getElementById('accountingPackageServices_'+id);const btn=document.getElementById('accountingPackageToggle_'+id);if(!el)return;const open=el.classList.toggle('open');if(btn)btn.textContent=open?'إخفاء الخدمات':'عرض الخدمات';}
function accountingOpenPackageTask(id){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(id)&&!t.parentTaskId);if(!task){alert('تعذر العثور على الباقة.');return;}
goApp('tasks',null);setTimeout(()=>{activeTaskViewContext={source:'accountingPackages',containerId:'allTasksContainer',department:''};openTaskDetails(task.id);},0);}
function accountingSendPackageToBilling(id){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(id)&&!t.parentTaskId);if(!task){alert('تعذر العثور على الباقة.');return;}
if(task.status==='invoiced'){alert('هذه الباقة تمت فوترتها مسبقاً.');return;}
if(task.status==='awaiting_invoice'){alert('هذه الباقة موجودة أصلاً ضمن مهام بانتظار الفوترة.');return;}
const subs=getSubTasks(task.id);if(!subs.length){alert('هذه المهمة لا تحتوي خدمات فرعية، لذلك لا تُعامل كباقة.');return;}
const incomplete=subs.filter(st=>!isPackageSubTaskDone(st));if(incomplete.length){const names=incomplete.slice(0,5).map(st=>st.title||'خدمة فرعية').join('، ');alert(`لا يمكن إنهاء الباقة وإرسالها للفوترة قبل اكتمال كل الخدمات الفرعية.\nالمتبقي: ${incomplete.length} من ${subs.length}${names?`\n${names}`:''}`);return;}
pendingPackageBillingId=String(task.id);showPackageBillingConfirm(task);}
let pendingPackageBillingId='';function showPackageBillingConfirm(task){const modal=document.getElementById('packageBillingConfirmModal');if(!modal)return;const title=document.getElementById('packageBillingConfirmTitle');const text=document.getElementById('packageBillingConfirmText');const meta=document.getElementById('packageBillingConfirmMeta');if(title)title.textContent='إنهاء الباقة وإرسالها للفوترة';if(text)text.textContent='سيتم إنهاء الباقة الرئيسية وإرسالها إلى «مهام بانتظار الفوترة». الخدمات الفرعية تبقى محفوظة داخل الباقة كخدمات منتهية.';if(meta)meta.textContent=`${MoshTaskUI.title(task)} · ${getSubTasks(task.id).length} خدمات`;modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
function closePackageBillingConfirm(){const modal=document.getElementById('packageBillingConfirmModal');modal?.classList.remove('show');modal?.setAttribute('aria-hidden','true');pendingPackageBillingId='';}
function confirmPackageBillingSend(){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(pendingPackageBillingId)&&!t.parentTaskId);if(!task){closePackageBillingConfirm();return;}
normalizeLegacyPackageSubTasks();const subs=getSubTasks(task.id);const incomplete=subs.filter(st=>!isPackageSubTaskDone(st));if(incomplete.length){closePackageBillingConfirm();alert(`لا يمكن إرسال الباقة للفوترة. ما زال هناك ${incomplete.length} خدمة غير منتهية.`);renderAccountingPackages();return;}
pushAppUndo();task.packageReadyForAccounting=false;task.status='awaiting_invoice';task.employeeState='finished';task.closedFromDepartment=task.closedFromDepartment||task.department||'المحاسبة';task.department='المحاسبة';task.closedAt=activityTimestamp();task.closedBy=currentUserDisplayName();task.reviewManager='';task.returnedForRevision=false;task.history=Array.isArray(task.history)?task.history:[];task.history.push({text:'تم إنهاء الباقة من قائمة الباقات في قسم المحاسبة وإرسال المهمة الرئيسية إلى مهام بانتظار الفوترة.',time:task.closedAt,by:currentUserDisplayName()
});save();closePackageBillingConfirm();if(typeof renderAccountingPackages==='function')renderAccountingPackages();if(typeof renderBillingTasks==='function')renderBillingTasks();openAccountingSection('billing');}
function accountingPackageCardHtml(task){const subs=getSubTasks(task.id);const done=subs.filter(isPackageSubTaskDone).length;const pct=subs.length?Math.round(done/subs.length*100):0;const status=accountingPackageStatusInfo(task);const departments=[...new Set(subs.map(s=>departmentDisplayName(s.department)||s.department).filter(Boolean))];return `<div class="accounting-package-card">
  <div class="accounting-package-card-head">
   <div class="accounting-package-main">
    <div class="accounting-package-topline">
     
     <span class="accounting-package-title">${esc(task.title||'باقة بدون اسم')}</span>
    </div>

    <div class="accounting-package-meta">
     <span>👤 العميل: ${esc(task.customer||'—')}</span>
     <span>🧾 أمر المبيعات: ${esc(task.salesOrderNo||'—')}</span>
     <span>🧩 الخدمات الفرعية: ${subs.length}</span>
     <span>🏢 الأقسام: ${esc(departments.join('، ')||'—')}</span>
    </div>

    <div class="accounting-package-progress">
     <div class="accounting-package-progress-head">
      <span>تقدم الباقة</span>
      <b>${done} من ${subs.length}</b>
      <span>(${pct}%)</span>
      ${pct===100?'<span class="accounting-package-complete-chip">كل الخدمات منتهية</span>':''}
     </div>
     <div class="accounting-package-progress-track">
      <div class="accounting-package-progress-bar" style="width:${pct}%"></div>
     </div>
    </div>
   </div>

   <div class="accounting-package-side">
    <span class="accounting-package-status ${status.css}">${status.label}</span>
   </div>
  </div>

  <div class="accounting-package-actions">
   <button type="button" class="btn" id="accountingPackageToggle_${task.id}" onclick="accountingTogglePackageServices(${MoshTaskUI.arg(task.id)})">عرض الخدمات</button>
   <button type="button" class="btn" onclick="accountingOpenPackageTask(${MoshTaskUI.arg(task.id)})">فتح الباقة</button>
   ${task.status==='awaiting_invoice'
?`<button type="button" class="btn package-billing-done">تم إرسالها لمهام بانتظار الفوترة</button>`
:task.status==='invoiced'
?`<button type="button" class="btn package-billing-done">تمت الفوترة</button>`
:`<button type="button" class="btn package-send-billing" onclick="accountingSendPackageToBilling(${MoshTaskUI.arg(task.id)})">إنهاء وإرسال لمهام بانتظار الفوترة</button>`}
  </div>

  <div class="accounting-package-services" id="accountingPackageServices_${task.id}">
   <div class="accounting-package-services-title"><b>الخدمات / المهام الفرعية داخل الباقة</b><span class="muted">${subs.length} خدمات</span></div>
   ${subs.map((sub,index)=>`
    <div class="accounting-package-service">
     <div class="accounting-package-service-index">${index+1}</div>
     <div class="accounting-package-service-main">
      <b class="mt54-task-name">${esc(sub.title||'خدمة فرعية')}</b>
      <span>${esc(departmentDisplayName(sub.department)||sub.department||'—')} · ${esc(sub.assignee||'غير موزعة')}</span>
     </div>
     <span class="accounting-package-service-status ${isPackageSubTaskDone(sub)?'done':''}">${esc(accountingSubTaskStatusLabel(sub))}</span>
    </div>`).join('')}
  </div>
 </div>`;}
function renderAccountingPackages(){const box=document.getElementById('accountingPackagesWorkspace');if(!box)return;normalizeLegacyPackageSubTasks();const all=getAccountingPackageTasks();const counts={progress:all.filter(t=>accountingPackageStatusInfo(t).key==='progress').length,ready:all.filter(t=>accountingPackageStatusInfo(t).key==='ready').length,remainingServices:all.reduce((sum,t)=>{const subs=getSubTasks(t.id);return sum+subs.filter(st=>!isPackageSubTaskDone(st)).length;},0)
};if(!['all','progress','ready'].includes(accountingPackageStatusFilter)){accountingPackageStatusFilter='all';}
const filtered=accountingPackageStatusFilter==='all'
?all
:all.filter(t=>accountingPackageStatusInfo(t).key===accountingPackageStatusFilter);const result=filterAndPageAppList('accountingpackages',filtered,t=>{const subs=getSubTasks(t.id);return[t.taskNo,t.number,t.title,t.customer,t.salesOrderNo,t.status,...subs.flatMap(s=>[s.taskNo,s.title,s.department,s.assignee,s.status])
].join(' ');}
);box.innerHTML=`<div class="accounting-packages-page">
  <div class="accounting-packages-hero">
   <div class="accounting-packages-icon">🧩</div>
   <div class="accounting-packages-title">
    <h2>قائمة الباقات</h2>
    <p>هذه قائمة الباقات قبل الفوترة فقط. بعد اكتمال الخدمات والضغط على «إنهاء وإرسال»، تنتقل المهمة الرئيسية بالكامل إلى «مهام بانتظار الفوترة» وتختفي من قائمة الباقات.</p>
   </div>
  </div>

  <div class="accounting-packages-kpis">
   <div class="accounting-packages-kpi"><div class="label">الباقات الموجودة بالقائمة</div><div class="value">${all.length}</div><div class="sub">باقات لم تُرسل إلى الفوترة بعد</div></div>
   <div class="accounting-packages-kpi"><div class="label">جاهزة للإرسال</div><div class="value">${counts.ready}</div><div class="sub">كل خدماتها الفرعية منتهية ويمكن تحويلها للفوترة</div></div>
   <div class="accounting-packages-kpi"><div class="label">قيد التنفيذ</div><div class="value">${counts.progress}</div><div class="sub">يوجد ضمنها خدمات لم تنتهِ بعد</div></div>
   <div class="accounting-packages-kpi"><div class="label">خدمات فرعية متبقية</div><div class="value">${counts.remainingServices}</div><div class="sub">إجمالي الخدمات غير المنتهية ضمن الباقات الحالية</div></div>
  </div>

  <div class="accounting-packages-toolbar">
   <select onchange="accountingPackageStatusFilter=this.value;renderAccountingPackages()">
    <option value="all" ${accountingPackageStatusFilter==='all'?'selected':''}>كل الباقات الحالية</option>
    <option value="ready" ${accountingPackageStatusFilter==='ready'?'selected':''}>جاهزة للإرسال للفوترة</option>
    <option value="progress" ${accountingPackageStatusFilter==='progress'?'selected':''}>قيد التنفيذ</option>
   </select>
   <span class="muted" style="margin-inline-start:auto;font-size:10px">المعروض: ${result.total} من ${all.length}</span>
  </div>

  ${result.total
?`<div class="accounting-package-list">${result.items.map(accountingPackageCardHtml).join('')}</div>
     <div id="accountingPackagesPagerHost">${appListPagerHtml('accountingpackages',result,{placeholder:'بحث برقم الباقة، العميل، أمر المبيعات أو الخدمة الفرعية...'})}</div>`
:`<div class="accounting-package-empty">
      <div class="icon">🧩</div>
      <h3>${all.length?'لا يوجد باقات مطابقة لهذه الحالة':'لا يوجد باقات حتى الآن'}</h3>
      <p>${all.length?'غيّر فلتر الحالة أو استخدم البحث لعرض الباقات الأخرى.':'أي باقة لم تُرسل للفوترة بعد ستظهر هنا. الباقة التي يتم إنهاؤها تنتقل إلى «مهام بانتظار الفوترة» ولا تبقى في هذه القائمة.'}</p>
     </div>`}
 </div>`;}
const _v175RenderInvoices=renderInvoices;renderInvoices=function(){_v175RenderInvoices();if(document.getElementById('accountingPackagesContent')?.style.display==='block'){renderAccountingPackages();}
};function saveQuotePdf(){const q=getSavedQ(),t=quoteTotals(q);const holder=document.createElement('div');holder.style.position='fixed';holder.style.left='-99999px';holder.style.top='0';holder.style.width='794px';holder.style.background='#fff';holder.style.color='#222';holder.style.padding='42px';holder.style.fontFamily='Arial, sans-serif';holder.style.direction='rtl';holder.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start">
      <div>
        <div style="font-size:30px;font-weight:900">MOSH GROUP</div>
        <div style="color:#666;margin-top:4px">عرض سعر ${q.number}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${esc(q.customer)}</div>
        <div style="color:#666">${esc(q.invoiceAddress||'')}</div>
      </div>
    </div>

    <div style="margin:28px 0 18px;border-top:1px solid #ddd;padding-top:18px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div><b>تاريخ الانتهاء</b><br>${q.expiration||'-'}</div>
      <div><b>شروط السداد</b><br>${esc(q.paymentTerms||'-')}</div>
      <div><b>تاريخ التسليم</b><br>${q.deliveryDate||'-'}</div>
    </div>

    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="border-bottom:1px solid #ccc;padding:10px;text-align:right">الخدمة</th>
          <th style="border-bottom:1px solid #ccc;padding:10px;text-align:right">الوصف</th>
          <th style="border-bottom:1px solid #ccc;padding:10px;text-align:right">الكمية</th>
          <th style="border-bottom:1px solid #ccc;padding:10px;text-align:right">سعر الوحدة</th>
          <th style="border-bottom:1px solid #ccc;padding:10px;text-align:right">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${q.lines.filter(l=>l.type==='product').map(l=>`
          <tr>
            <td style="border-bottom:1px solid #eee;padding:10px">${esc(l.product)}</td>
            <td style="border-bottom:1px solid #eee;padding:10px">${esc(l.description)}</td>
            <td style="border-bottom:1px solid #eee;padding:10px">${l.qty}</td>
            <td style="border-bottom:1px solid #eee;padding:10px">${money(l.price)}</td>
            <td style="border-bottom:1px solid #eee;padding:10px">${money(l.qty*l.price*(1-l.discount/100)*(1+l.tax/100))}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div style="margin-top:28px;text-align:left;font-size:22px;font-weight:800">الإجمالي: ${money(t.total)}</div>
    <div style="margin-top:38px;line-height:1.8">${esc(q.notes||'').replace(/\n/g,'<br>')}</div>
  `;document.body.appendChild(holder);if(typeof html2canvas==='undefined' || !window.jspdf){holder.remove();alert('تعذر تحميل أداة إنشاء PDF. تأكد أن الإنترنت متصل ثم جرّب مرة ثانية.');return;}
html2canvas(holder,{scale:2,backgroundColor:'#ffffff'}).then(canvas=>{const imgData=canvas.toDataURL('image/jpeg',0.95);const{jsPDF}=window.jspdf;const pdf=new jsPDF('p','mm','a4');const pageW=210;const pageH=297;const margin=10;const imgW=pageW-margin*2;const imgH=canvas.height*imgW/canvas.width;let y=margin;let remaining=imgH;pdf.addImage(imgData,'JPEG',margin,y,imgW,imgH);remaining-=pageH-margin*2;while(remaining>0){pdf.addPage();y=margin-(imgH-remaining);pdf.addImage(imgData,'JPEG',margin,y,imgW,imgH);remaining-=pageH-margin*2;}
pdf.save(`${q.number}-${(q.customer||'quotation').replace(/[\\/:*?"<>|]/g,'-')}.pdf`);holder.remove();}).catch(err=>{holder.remove();alert('صار خطأ أثناء إنشاء PDF.');console.error(err);});}
function previewQuote(){const q=syncQuoteFormToWorking();if(!q)return;const t=quoteTotals(q),template=getQuoteTemplateOption(q.template),style=template?.style||'official',compact=style==='compact',detailed=style==='detailed';document.getElementById('previewContent').innerHTML=`<div class="preview-paper">
 <div style="display:flex;justify-content:space-between"><div><h1>MOSH GROUP</h1><div>${q.status==='order'?'عرض سعر موافق':q.status==='cancel'?'عرض سعر ملغي':'عرض سعر'} ${q.number}</div><div style="color:#777;font-size:12px">${esc(template?.name||'')}</div></div><div><b>${esc(q.customer)}</b><br>${detailed?esc(customerInfoText(q.customerInfo||findCustomer(q.customer))).replace(/\n/g,'<br>'):esc((q.customerInfo&&q.customerInfo.billingAddress)||'')}</div></div>
 <hr style="margin:25px 0;border:0;border-top:1px solid #ddd">
 ${compact?'':`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px"><div><b>تاريخ العرض</b><br>${esc(q.deliveryDate||'—')}</div><div><b>تاريخ التسليم</b><br>${esc(q.expiration||'—')}</div><div><b>المندوب</b><br>${esc(q.salesperson||'—')}</div></div>`}
 <table><thead><tr><th>الخدمة</th>${compact?'':'<th>الوصف</th>'}<th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>
 ${(()=>{let lastService='';return q.lines.map(l=>{const colspan=compact?4:5;if(l.type==='note')return `<tr><td colspan="${colspan}"><div style="background:#f6f1e4;padding:8px">${esc(l.description)}</div></td></tr>`;if(l.type==='section')return `<tr><td colspan="${colspan}" style="font-weight:700">${esc(l.description)}</td></tr>`;lastService=l.product||lastService;return `<tr><td>${esc(l.product)}</td>${compact?'':`<td>${esc(l.description)}</td>`}<td>${l.qty}</td><td>${money(l.price)}</td><td>${money(l.qty*l.price*(1-l.discount/100)*(1+l.tax/100))}</td></tr>`}).join('')})()}
 </tbody></table>
 <div style="margin-top:25px;text-align:left"><h2>الإجمالي: ${money(t.total)}</h2></div>
 ${q.notes?`<div style="margin-top:30px">${esc(q.notes).replace(/\n/g,'<br>')}</div>`:''}
 </div>`;document.getElementById('previewModal').classList.add('show')
}
async function savePreviewPdf(){const q=getQ();const preview=document.querySelector('#previewContent .preview-paper');if(!preview){alert('افتح المعاينة أولاً.');return;}
try{const width = 900;const clone = preview.cloneNode(true);clone.style.width =(width-80)+ 'px';clone.style.minHeight = '0';clone.style.padding = '40px';clone.style.margin = '0';clone.style.background = '#ffffff';clone.style.color = '#222222';clone.style.fontFamily = 'Arial, sans-serif';clone.style.direction = 'rtl';const wrapper = document.createElement('div');wrapper.setAttribute('xmlns','http://www.w3.org/1999/xhtml');wrapper.style.width = width + 'px';wrapper.style.background = '#ffffff';wrapper.appendChild(clone);wrapper.style.position='fixed';wrapper.style.left='-99999px';wrapper.style.top='0';document.body.appendChild(wrapper);const height = Math.max(wrapper.scrollHeight + 20,700);const serialized = new XMLSerializer().serializeToString(wrapper);wrapper.remove();const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          ${serialized}
        </foreignObject>
      </svg>`;const svgBlob = new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const svgUrl = URL.createObjectURL(svgBlob);const img = new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=svgUrl;});const scale = 1.7;const canvas = document.createElement('canvas');canvas.width = Math.round(width*scale);canvas.height = Math.round(height*scale);const ctx = canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.scale(scale,scale);ctx.drawImage(img,0,0,width,height);URL.revokeObjectURL(svgUrl);const jpegDataUrl = canvas.toDataURL('image/jpeg',0.92);const jpegBytes = dataUrlToUint8Array(jpegDataUrl);const pdfBlob = makePdfFromJpeg(jpegBytes,canvas.width,canvas.height);const url = URL.createObjectURL(pdfBlob);const a=document.createElement('a');a.href=url;const safeClient=(q.customer||'عرض-سعر').replace(/[\\/:*?"<>|]/g,'-');a.download=`${q.number}-${safeClient}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}catch(err){console.error(err);alert('تعذّر إنشاء ملف PDF في هذا المتصفح. جرّب إصداراً حديثاً من Chrome أو Safari.');}
}
function dataUrlToUint8Array(dataUrl){const base64=dataUrl.split(',')[1];const binary=atob(base64);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
function makePdfFromJpeg(jpegBytes,imgW,imgH){const encoder=new TextEncoder();const parts=[];const offsets=[0];let length=0;function pushText(txt){const b=encoder.encode(txt);parts.push(b);length+=b.length;}
function pushBytes(b){parts.push(b);length+=b.length;}
function obj(n,bodyStart,streamBytes=null,bodyEnd=''){offsets[n]=length;pushText(`${n} 0 obj\n${bodyStart}`);if(streamBytes){pushText(`\nstream\n`);pushBytes(streamBytes);pushText(`\nendstream`);}
pushText(`${bodyEnd}\nendobj\n`);}
const pageW=595.28,pageH=841.89;const margin=28;const maxW=pageW-margin*2,maxH=pageH-margin*2;const ratio=Math.min(maxW/imgW,maxH/imgH);const drawW=imgW*ratio,drawH=imgH*ratio;const x=(pageW-drawW)/2,y=(pageH-drawH)/2;pushText('%PDF-1.3\n%\xE2\xE3\xCF\xD3\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);const content=`q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ`;const contentBytes=encoder.encode(content);obj(4,`<< /Length ${contentBytes.length} >>`,contentBytes);offsets[5]=length;pushText(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);pushBytes(jpegBytes);pushText('\nendstream\nendobj\n');const xrefStart=length;pushText('xref\n0 6\n');pushText('0000000000 65535 f \n');for(let i=1;i<=5;i++){pushText(String(offsets[i]).padStart(10,'0')+' 00000 n \n');}
pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);return new Blob(parts,{type:'application/pdf'});}
function sendPreviewWhatsApp(){saveQuoteForm();const q=getQ();const t=quoteTotals(q);const msg =
`مرحباً،
مرفق لكم عرض السعر ${q.number} من MOSH GROUP.

العميل: ${q.customer || '-'}
الإجمالي: ${money(t.total)}

يرجى مراجعة عرض السعر والتواصل معنا لأي استفسار.`;const url='https://wa.me/?text='+encodeURIComponent(msg);window.open(url,'_blank');}
function closeModal(id){document.getElementById(id).classList.remove('show')}
function toggleActivities(){const panel=document.getElementById('activitiesPanel');if(!panel)return;panel.classList.toggle('open');const btn=panel.querySelector('.activity-toggle');if(btn)btn.textContent=panel.classList.contains('open')?'طي ▲':'فتح ▼';}
function addFollowupNote(){setDirtyState(true);const q=getQ();if(!q)return;pushQuoteUndo();q.followupNotes=q.followupNotes||[];document.querySelectorAll('.followup-note textarea').forEach((el,i)=>{if(q.followupNotes[i])q.followupNotes[i].text=el.value;});q.followupNotes.push({text:'',time:activityTimestamp(),by:currentUserDisplayName()});openQuote(q.id,false,true);setTimeout(()=>{const notes=document.querySelectorAll('.followup-note textarea');if(notes.length)notes[notes.length-1].focus();},0);}
function deleteFollowupNote(i){setDirtyState(true);const q=getQ();if(!q)return;pushQuoteUndo();q.followupNotes=q.followupNotes||[];q.followupNotes.splice(i,1);openQuote(q.id,false,true);}
function updateFollowupNote(i,value){setDirtyState(true);const q=getQ();if(!q)return;q.followupNotes=q.followupNotes||[];if(q.followupNotes[i])q.followupNotes[i].text=value;}
function quickNote(){pushAppUndo();const q=getQ(),el=document.getElementById('quickNoteInput');if(!el||!el.value.trim())return;q.chatter.push({who:currentUserDisplayName(),text:el.value.trim(),time:activityTimestamp()});save();openQuote(q.id,false)}
function toggleBuilder(type){pushAppUndo();const q=getQ();if(type==='header')q.quoteBuilder.headers.push('غلاف إضافي');else q.quoteBuilder.footers.push('تذييل إضافي');save();openQuote(q.id,false)}
renderQuotationList();document.addEventListener('input',function(e){const el=e.target;if(!el || !['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.closest('[data-chat34-task]'))return;if(window.MoshR14Polish?.isEditorControl&&!window.MoshR14Polish.isEditorControl(el))return;if(el.closest('.modal')|| el.closest('.view'))setDirtyState(true);});document.addEventListener('change',function(e){const el=e.target;if(!el || !['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.closest('[data-chat34-task]'))return;if(window.MoshR14Polish?.isEditorControl&&!window.MoshR14Polish.isEditorControl(el))return;if(el.closest('.modal')|| el.closest('.view'))setDirtyState(true);});document.addEventListener('focusin',function(e){const el=e.target;if(!el || !['INPUT','TEXTAREA','SELECT'].includes(el.tagName))return;if(el.dataset.undoCaptured==='1')return;if((el.getAttribute('onfocus')||'').includes('pushQuoteUndo')){el.dataset.undoCaptured='1';return;}
pushAppUndo();el.dataset.undoCaptured='1';});document.addEventListener('focusout',function(e){const el=e.target;if(el && el.dataset)delete el.dataset.undoCaptured;});state.hrSettings=state.hrSettings&&typeof state.hrSettings==='object'?state.hrSettings:{annualLeaveDays:14,sickLeaveDays:14,annualAccrualDaily:true,warningValidityDays:365,documentAlertDays:[60,30,7],performanceWeights:{timeliness:40,speed:30,quality:30}
};if(!Array.isArray(state.hrApprovals))state.hrApprovals=[];const HR_NATIONALITIES=['سوري','فلسطيني','مصري','لبناني','أردني','عراقي','سعودي','إماراتي','قطري','كويتي','بحريني','عماني','يمني','مغربي','جزائري','تونسي','ليبي','سوداني','أخرى'];const HR_WORK_MODES=['مكتبي','أونلاين / عن بُعد','فريلانس / مستقل','هجين'];const HR_CONTRACT_TYPES=['دائم','مؤقت','مشروع','مستقل / فريلانس','تدريب'];const HR_END_REASONS=['','استقالة','إنهاء عقد من الشركة','انتهاء مدة العقد','عدم اجتياز فترة التجربة','اتفاق متبادل','تقاعد','أخرى'];const HR_LEAVE_TYPES=['سنوية','مرضية','بدون راتب','طارئة','زواج','وفاة','أمومة / أبوة','مهمة عمل','أخرى'];const HR_DISCIPLINARY_LEVELS=[{value:'notice',label:'لفت نظر',rank:1},{value:'warning1',label:'إنذار أول',rank:2},{value:'warning2',label:'إنذار ثاني',rank:3},{value:'warning3',label:'إنذار ثالث',rank:4},{value:'termination_notice',label:'إخطار طرد / إنهاء خدمة',rank:5}
];function hrTodayIso(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
function hrParseDate(value){if(!value)return null;const d=new Date(String(value).slice(0,10)+'T12:00:00');return Number.isNaN(d.getTime())?null:d;}
function hrIsoDate(date){if(!date||Number.isNaN(date.getTime()))return '';const p=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`;}
function hrAddDays(value,days){const d=hrParseDate(value);if(!d)return '';d.setDate(d.getDate()+Number(days||0));return hrIsoDate(d);}
function hrDaysBetween(a,b,inclusive=false){const da=hrParseDate(a),db=hrParseDate(b);if(!da||!db)return 0;const days=Math.floor((db-da)/86400000);return Math.max(0,days+(inclusive?1:0));}
function hrRound(value,digits=2){const p=10**digits;return Math.round((Number(value)||0)*p)/p;}
function hrValue(id){return String(document.getElementById(id)?.value||'').trim()}
function hrChecked(id){return !!document.getElementById(id)?.checked}
function hrSelected(value,expected){return String(value||'')===String(expected)?'selected':''}
function hrCheckedAttr(value){return value?'checked':''}
function hrMonthKey(value){const d=hrParseDate(value);if(!d)return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function hrFormatHours(value){return hrRound(value,2).toFixed(2)}
function hrProfileInitial(profile){const name=String(profile?.name||'م').trim();return esc(name.charAt(0)||'م');}
function hrEnsureProfileSchema(p){if(!p)return p;const defaults={fatherName:'',motherName:'',nationalId:'',nationality:'سوري',birthDate:'',birthPlace:'',gender:'',maritalStatus:'',identifyingMarks:'',personalEmail:'',hasHealthCondition:false,healthDetails:'',emergencyPhone:'',emergencyContactName:'',emergencyRelation:'',address:'',city:'',country:'سوريا',company:'Mosh Group',branch:'دمشق',workMode:'مكتبي',contractType:'دائم',contractEndDate:'',probationMonths:3,probationEndDate:'',serviceEndReasonType:'',lastWorkDay:'',hasRelatives:false,relativesDetails:'',corporateEmail:'',extension:'',systemUsername:'',issuedAssets:'',educationDegree:'',educationUniversity:'',educationSpecialization:'',graduationYear:'',drivingLicenseType:'',drivingLicenseNumber:'',drivingLicenseExpiry:'',passportNumber:'',residenceNumber:'',plannedTimeCoefficient:8,auditTrail:[],offboarding:{assetsReturned:false,accountsClosed:false,filesHandedOver:false,leaveSettled:false,exitInterview:false,hrApproved:false,executiveApproved:false
}
};Object.entries(defaults).forEach(([key,val])=>{if(p[key]===undefined || p[key]===null){p[key]=Array.isArray(val)?[]:(typeof val==='object'&&val!==null?JSON.parse(JSON.stringify(val)):val);}
});['leaveRecords','attendanceRecords','delayRecords','disciplinaryRecords','rewardRecords','evaluationRecords','payrollRecords','documents','statusHistory','resignationHistory','auditTrail'].forEach(key=>{if(!Array.isArray(p[key]))p[key]=[];});if(p.hireDate && !p.probationEndDate && Number(p.probationMonths)>0){const d=hrParseDate(p.hireDate);if(d){d.setMonth(d.getMonth()+Number(p.probationMonths||0));p.probationEndDate=hrIsoDate(d);}
}
return p;}
(state.staffProfiles||[]).forEach(hrEnsureProfileSchema);function hrGetCurrentLeaveCycle(profile){const hire=hrParseDate(profile?.hireDate),today=hrParseDate(hrTodayIso());if(!hire||!today)return{start:'',end:'',elapsed:0};let start=new Date(today.getFullYear(),hire.getMonth(),hire.getDate(),12);if(start>today)start.setFullYear(start.getFullYear()-1);const end=new Date(start);end.setFullYear(end.getFullYear()+1);end.setDate(end.getDate()-1);return{start:hrIsoDate(start),end:hrIsoDate(end),elapsed:Math.min(365,hrDaysBetween(hrIsoDate(start),hrTodayIso(),true))};}
function hrLeaveDays(record){if(Number(record?.days)>0)return Number(record.days);return hrDaysBetween(record?.startDate,record?.endDate,true);}
function hrLeaveBalance(profile,type='annual'){if(type==='annual'&&window.MoshR29Model)return MoshR29Model.leave(profile,Number(hrTodayIso().slice(0,4)),state.hrSettings||{},state.hrProRequests||[]);hrEnsureProfileSchema(profile);const cycle=hrGetCurrentLeaveCycle(profile);const records=(profile.leaveRecords||[]).filter(r=>{if(!r.startDate)return false;const d=hrParseDate(r.startDate),s=hrParseDate(cycle.start),e=hrParseDate(cycle.end);return d&&s&&e&&d>=s&&d<=e;});const annual=Number(state.hrSettings.annualLeaveDays||14);const sick=Number(state.hrSettings.sickLeaveDays||14);const entitlement=type==='sick'?sick:annual;const accrued=type==='annual'&&state.hrSettings.annualAccrualDaily!==false
?Math.min(entitlement,cycle.elapsed*(entitlement/365))
:entitlement;const matchType=type==='sick'?'مرضية':'سنوية';const relevant=records.filter(r=>r.type===matchType);const used=relevant.filter(r=>r.status==='approved').reduce((s,r)=>s+hrLeaveDays(r),0);const pending=relevant.filter(r=>r.status==='pending').reduce((s,r)=>s+hrLeaveDays(r),0);const available=Math.max(0,accrued-used-pending);return{entitlement:hrRound(entitlement),accrued:hrRound(accrued),used:hrRound(used),pending:hrRound(pending),available:hrRound(available),future:hrRound(Math.max(0,entitlement-accrued)),cycle
};}
function hrRefreshDisciplinary(profile){hrEnsureProfileSchema(profile);const today=hrParseDate(hrTodayIso());(profile.disciplinaryRecords||[]).forEach(r=>{if(!r.expiresAt && r.issueDate)r.expiresAt=hrAddDays(r.issueDate,Number(state.hrSettings.warningValidityDays||365));const exp=hrParseDate(r.expiresAt);if(r.status==='active'&&exp&&today&&exp<today)r.status='expired';});}
(state.staffProfiles||[]).forEach(hrRefreshDisciplinary);function hrDisciplinaryLabel(level){return HR_DISCIPLINARY_LEVELS.find(x=>x.value===level)?.label||level||'إجراء';}
function hrActiveWarnings(profile){hrRefreshDisciplinary(profile);return(profile.disciplinaryRecords||[]).filter(r=>r.status==='active');}
function hrApprovalTypeLabel(type){return{personal_change:'تعديل بيانات شخصية / وثائق',termination:'إنهاء خدمة',disciplinary:'إجراء وظيفي',leave_override:'تجاوز رصيد إجازة',reward:'مكافأة وظيفية'
}[type]||type||'طلب';}
function hrApprovalFlow(type,payload={}){if(type==='personal_change')return['مسؤول الموارد البشرية'];if(type==='termination')return['مسؤول الموارد البشرية','المدير التنفيذي / الإدارة العليا'];if(type==='leave_override')return['المدير المباشر','مسؤول الموارد البشرية'];if(type==='reward')return['مسؤول الموارد البشرية','المدير التنفيذي / الإدارة العليا'];if(type==='disciplinary'){const rank=HR_DISCIPLINARY_LEVELS.find(x=>x.value===payload.level)?.rank||1;return rank>=4
?['مسؤول الموارد البشرية','المدير التنفيذي / الإدارة العليا']
:['مسؤول الموارد البشرية'];}
return['مسؤول الموارد البشرية'];}
function hrCreateApproval(type,profile,sourceId,title,payload={}){const approval={id:'HRA/'+Date.now()+'/'+Math.random().toString(36).slice(2,7),type,employeeId:String(profile?.id||''),employeeName:profile?.name||'',sourceId:String(sourceId||''),title:title||hrApprovalTypeLabel(type),payload:payload||{},levels:hrApprovalFlow(type,payload),currentLevel:0,status:'pending',createdAt:activityTimestamp(),createdBy:currentUserDisplayName(),history:[{action:'created',by:currentUserDisplayName(),time:activityTimestamp(),note:'تم إنشاء الطلب.'}]
};state.hrApprovals.push(approval);return approval;}
function hrFindApproval(id){return(state.hrApprovals||[]).find(a=>String(a.id)===String(id))||null}
function hrApplyApprovalToSource(){ /* Applied by Laravel. */ }
function hrAdvanceApproval(id,decision){const a=hrFindApproval(id);if(!a||a.status!=='pending')return;const note=prompt(decision==='approve'?'ملاحظة الاعتماد (اختياري):':'سبب الرفض (اختياري):','');if(note===null)return;if(decision==='reject'){a.status='rejected';a.completedAt=activityTimestamp();a.history.push({action:'rejected',by:currentUserDisplayName(),time:activityTimestamp(),note});hrApplyApprovalToSource(a,false);}else{a.history.push({action:'approved_level',level:a.levels[a.currentLevel]||'',by:currentUserDisplayName(),time:activityTimestamp(),note});if(a.currentLevel>=a.levels.length-1){a.status='approved';a.completedAt=activityTimestamp();hrApplyApprovalToSource(a,true);}else{a.currentLevel++;}
}
save();renderStaffWorkflowConfig();}
function hrBuildAlerts(all){const today=hrParseDate(hrTodayIso());if(!today)return[];const alerts=[];(all||[]).forEach(p=>{hrEnsureProfileSchema(p);hrRefreshDisciplinary(p);if(p.birthDate){const b=hrParseDate(p.birthDate);if(b&&b.getDate()===today.getDate()&&b.getMonth()===today.getMonth()){alerts.push({icon:'🎂',level:'warn',title:`عيد ميلاد ${p.name}`,text:'تنبيه للموارد البشرية والمدير المباشر اليوم.',employeeId:p.id});}
}
if(p.hireDate){const h=hrParseDate(p.hireDate);if(h&&h.getDate()===today.getDate()&&h.getMonth()===today.getMonth()){const years=today.getFullYear()-h.getFullYear();if(years>=1)alerts.push({icon:'🏅',level:'warn',title:`${p.name} أتم ${years} ${years===1?'سنة':'سنوات'} في الشركة`,text:'مناسب لمراجعة الأداء أو العقد.',employeeId:p.id});}
}
if(window.MoshR29Model&&window.MoshR29?.isHr()){for(const event of MoshR29Model.probation(p,hrTodayIso()))alerts.push({icon:'⏳',level:'urgent',title:(event.stage==='end'?'انتهاء تجربة ':'قبل انتهاء التجربة بسبعة أيام: ')+p.name,text:'تاريخ التنبيه '+event.dueDate+' — نهاية التجربة '+event.endDate,employeeId:p.id,r29Stage:event.stage});}
if(p.contractEndDate){const days=hrDaysBetween(hrTodayIso(),p.contractEndDate);const end=hrParseDate(p.contractEndDate);if(end&&end>=today&&days<=60)alerts.push({icon:'📄',level:days<=14?'urgent':'warn',title:`قرب انتهاء عقد ${p.name}`,text:`تاريخ الانتهاء ${p.contractEndDate} — متبقي ${days} يوم.`,employeeId:p.id});}
(p.documents||[]).forEach(doc=>{if(!doc.expiryDate)return;const exp=hrParseDate(doc.expiryDate);if(!exp||exp<today)return;const days=hrDaysBetween(hrTodayIso(),doc.expiryDate);if((state.hrSettings.documentAlertDays||[60,30,7]).some(limit=>days<=Number(limit))){alerts.push({icon:'🪪',level:days<=7?'urgent':'warn',title:`وثيقة ${p.name} قاربت على الانتهاء`,text:`${doc.category||doc.name||'وثيقة'} — ${doc.expiryDate} (${days} يوم).`,employeeId:p.id});}
});(p.disciplinaryRecords||[]).forEach(r=>{if(r.status!=='active'||!r.expiresAt)return;const exp=hrParseDate(r.expiresAt);if(!exp||exp<today)return;const days=hrDaysBetween(hrTodayIso(),r.expiresAt);if(days<=30)alerts.push({icon:'⚠️',level:'warn',title:`إنذار ${p.name} يقترب من الانقضاء`,text:`${hrDisciplinaryLabel(r.level)} ينتهي في ${r.expiresAt}.`,employeeId:p.id});});});return alerts;}
function hrOverviewSummaryHtml(all){const alerts=hrBuildAlerts(all);const approvals=(state.hrApprovals||[]).filter(a=>a.status==='pending');const expiringDocs=alerts.filter(a=>a.icon==='🪪').length;const birthdays=alerts.filter(a=>a.icon==='🎂').length;const annualAvailable=(all||[]).filter(isStaffAssignable).reduce((s,p)=>s+hrLeaveBalance(p,'annual').available,0);return `
 <div class="hr-v170-overview">
  <div class="hr-v170-kpi"><div class="k">موافقات معلقة</div><div class="v">${approvals.length}</div><div class="s">إجازات تجاوز، مكافآت، عقوبات وغيرها</div></div>
  <div class="hr-v170-kpi"><div class="k">تنبيهات HR الآن</div><div class="v">${alerts.length}</div><div class="s">ميلاد، عقود، وثائق، تجربة وإنذارات</div></div>
  <div class="hr-v170-kpi"><div class="k">وثائق قاربت على الانتهاء</div><div class="v">${expiringDocs}</div><div class="s">وفق 60 / 30 / 7 أيام</div></div>
  <div class="hr-v170-kpi"><div class="k">رصيد سنوي متاح للفريق</div><div class="v">${hrRound(annualAvailable,1)}</div><div class="s">${birthdays?`وفيه ${birthdays} عيد ميلاد اليوم`:'الرصيد المكتسب والمتاح حالياً'}</div></div>
 </div>
 <div class="hr-v170-dashboard-grid">
  <div id="hrAlertsPanel" class="hr-v170-card">
   <div class="hr-v170-card-head"><b>التنبيهات والاستحقاقات</b><span class="muted">${alerts.length}</span></div>
   <div class="hr-v170-card-body">
    ${alerts.length?alerts.slice(0,12).map(a=>`
     <div class="hr-alert-item">
      <div class="hr-alert-icon">${a.icon}</div>
      <div class="hr-alert-main"><b>${esc(a.title)}</b><span>${esc(a.text)}</span></div>
      <span class="hr-alert-level ${a.level||''}">${a.level==='urgent'?'قريب جداً':'تنبيه'}</span>
     </div>`).join(''):'<div class="empty" style="padding:16px">لا يوجد تنبيهات مستحقة حالياً. هنا ستظهر أعياد الميلاد، ذكرى التوظيف، قرب انتهاء العقد أو فترة التجربة أو الوثائق أو الإنذارات.</div>'}
   </div>
  </div>
  <div id="hrApprovalsPanel" class="hr-v170-card">
   <div class="hr-v170-card-head"><b>الموافقات المعلقة</b><span class="muted">${approvals.length}</span></div>
   <div class="hr-v170-card-body">
    ${approvals.length?approvals.slice(0,10).map(a=>`
     <div class="hr-approval-row">
      <div class="hr-approval-top"><b>${esc(a.employeeName||'')} · ${esc(a.title||hrApprovalTypeLabel(a.type))}</b><span class="hr-approval-stage">${esc(a.levels?.[a.currentLevel]||'مراجعة')}</span></div>
      <div class="hr-approval-meta">${esc(hrApprovalTypeLabel(a.type))} · أنشئ بواسطة ${esc(a.createdBy||'')} · ${esc(a.createdAt||'')}</div>
      <div class="hr-approval-actions">
       <button type="button" class="btn" onclick="hrAdvanceApproval('${a.id}','approve')">اعتماد المستوى الحالي</button>
       <button type="button" class="btn hr-staff-delete" onclick="hrAdvanceApproval('${a.id}','reject')">رفض</button>
      </div>
     </div>`).join(''):'<div class="empty" style="padding:16px">لا يوجد طلبات موافقة معلقة حالياً. هنا ستظهر طلبات تجاوز رصيد الإجازة، المكافآت، الإنذارات، وإنهاء الخدمة عندما تحتاج مراجعة أو اعتماد.</div>'}
   </div>
  </div>
 </div>`;}
function hrToggleConditionalFields(){const health=document.getElementById('staffHasHealthCondition')?.value==='yes';const healthBox=document.getElementById('staffHealthDetailsWrap');if(healthBox)healthBox.style.display=health?'grid':'none';const relatives=document.getElementById('staffHasRelatives')?.value==='yes';const relativesBox=document.getElementById('staffRelativesDetailsWrap');if(relativesBox)relativesBox.style.display=relatives?'grid':'none';const status=document.getElementById('staffEmploymentStatus')?.value||'active';const endBox=document.getElementById('staffResignationFields');if(endBox)endBox.style.display=status==='resigned'?'grid':'none';}
const _hrV169ToggleStaffStatusFields=toggleStaffStatusFields;toggleStaffStatusFields=function(setDefault=true){_hrV169ToggleStaffStatusFields(setDefault);hrToggleConditionalFields();};function switchHrEmployeeTab(tab){document.querySelectorAll('.hr-profile-tab').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));document.querySelectorAll('.hr-profile-pane').forEach(el=>el.classList.toggle('active',el.dataset.pane===tab));}
staffDocumentCategoryOptions=function(selected=''){const categories=['صورة شخصية','الهوية الوطنية - وجه أول','الهوية الوطنية - وجه ثاني','سيرة ذاتية CV','الشهادة العلمية / شهادة التخرج','شهادة قيادة','جواز سفر','إقامة / تصريح عمل','عقد عمل','شهادة خبرة','مستند إداري','أخرى'];return categories.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');};addStaffDocuments=async function(profileId,files){const profile=getStaffProfileById(profileId);const arr=Array.from(files||[]);if(!profile||!arr.length)return;hrEnsureProfileSchema(profile);const category=document.getElementById('staffDocumentCategory')?.value||'أخرى';const title=hrValue('staffDocumentTitle');const documentNumber=hrValue('staffDocumentNumber');const issueDate=hrValue('staffDocumentIssue');const expiryDate=hrValue('staffDocumentExpiry');profile.documents=Array.isArray(profile.documents)?profile.documents:[];pushAppUndo();let added=0;const failed=[];for(let i=0;i<arr.length;i++){const file=arr[i];const key='staffdoc_'+profile.id+'_'+Date.now()+'_'+i+'_'+Math.random().toString(36).slice(2);try{await storeAttachmentRecord({key,scope:'staff_document',staffId:String(profile.id),name:file.name||'مستند',type:file.type||'application/octet-stream',size:file.size||0,blob:file,createdAt:new Date().toISOString()
});profile.documents.push({id:'DOC/'+Date.now()+'/'+i+'/'+Math.random().toString(36).slice(2,7),key,category,title,documentNumber,issueDate,name:file.name||'مستند',type:file.type||'application/octet-stream',size:file.size||0,expiryDate,uploadedAt:activityTimestamp(),uploadedBy:currentUserDisplayName()
});profile.auditTrail.push({time:activityTimestamp(),by:currentUserDisplayName(),text:`تم رفع مستند: ${category}${title?' — '+title:''}.`});added++;}catch(e){console.error('MOSH HR document upload failed',e);failed.push(file.name||'مستند')}
}
if(added){save();hrStaffFormOpen=true;hrStaffEditingId=String(profile.id);renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('documents'),0)}
if(failed.length)alert('تعذر رفع: '+failed.join('، '));};staffDocumentsHtml=function(profile){if(!profile)return `<div class="hr-document-empty">احفظ ملف الموظف أولاً، وبعدها يمكنك رفع الهوية، CV، الشهادة العلمية وباقي الوثائق.</div>`;hrEnsureProfileSchema(profile);const docs=Array.isArray(profile.documents)?profile.documents:[];return `<div class="hr-profile-section">
  <div class="hr-profile-section-title">رفع وإدارة الوثائق</div>
  <div class="hr-doc-meta">
   <div class="field"><label>نوع المستند</label><select id="staffDocumentCategory">${staffDocumentCategoryOptions()}</select></div>
   <div class="field"><label>عنوان / وصف</label><input id="staffDocumentTitle" placeholder="مثلاً: بكالوريوس إدارة أعمال"></div>
   <div class="field"><label>رقم الوثيقة</label><input id="staffDocumentNumber" placeholder="اختياري"></div>
   <div class="field"><label>تاريخ الإصدار</label><input id="staffDocumentIssue" type="date"></div>
   <div class="field"><label>تاريخ الانتهاء</label><input id="staffDocumentExpiry" type="date"></div>
   <div class="field" style="align-self:end"><button type="button" class="btn" onclick="document.getElementById('staffDocumentInput').click()">+ رفع ملف / ملفات</button><input id="staffDocumentInput" type="file" accept="image/*,.pdf,.doc,.docx" multiple hidden onchange="addStaffDocuments('${profile.id}',this.files);this.value=''"></div>
  </div>
  ${docs.length?`<div class="hr-document-list">${docs.slice().reverse().map(doc=>`<div class="hr-document-row">
   <div class="hr-document-icon">${String(doc.type||'').startsWith('image/')?'🖼️':'📄'}</div>
   <div class="hr-document-main">
    <b>${esc(doc.title||doc.name||'مستند')}</b>
    <div class="muted">${esc(doc.category||'أخرى')}${doc.documentNumber?` · رقم ${esc(doc.documentNumber)}`:''} · ${formatAttachmentSize(doc.size||0)}</div>
    <div class="muted">${doc.issueDate?`إصدار: ${esc(doc.issueDate)} · `:''}${doc.expiryDate?`انتهاء: ${esc(doc.expiryDate)}`:'بدون تاريخ انتهاء'}</div>
   </div>
   <div class="hr-document-actions">
    <button type="button" class="btn" onclick="openStaffDocument('${esc(doc.key)}','${esc(doc.name||'')}',false)">فتح</button>
    <button type="button" class="btn" onclick="openStaffDocument('${esc(doc.key)}','${esc(doc.name||'')}',true)">تحميل</button>
    <button type="button" class="btn hr-staff-delete" onclick="deleteStaffDocument('${profile.id}','${doc.id}')">حذف</button>
   </div>
  </div>`).join('')}</div>`:'<div class="hr-document-empty">لا يوجد مستندات مرفوعة لهذا الموظف بعد.</div>'}
 </div>`;};function hrLeaveStatusLabel(status){return{approved:'معتمدة',pending:'بانتظار الموافقة',rejected:'مرفوضة',cancelled:'ملغاة'}[status]||status;}
function hrAddLeaveRecord(profileId){const p=getStaffProfileById(profileId);if(!p)return;hrEnsureProfileSchema(p);const type=hrValue('hrLeaveType')||'سنوية';const startDate=hrValue('hrLeaveStart'),endDate=hrValue('hrLeaveEnd');const note=hrValue('hrLeaveNote');if(!startDate||!endDate){alert('حدد تاريخ بداية ونهاية الإجازة.');return}
if(hrParseDate(endDate)<hrParseDate(startDate)){alert('تاريخ النهاية يجب أن يكون بعد البداية.');return}
const days=hrDaysBetween(startDate,endDate,true);const annual=hrLeaveBalance(p,'annual');const needsOverride=type==='سنوية'&&days>annual.available;const requestOverride=hrChecked('hrLeaveOverride');if(needsOverride&&!requestOverride){alert(`الرصيد السنوي المتاح حتى اليوم ${annual.available} يوم فقط. فعّل «طلب تجاوز رصيد» لإرسال الطلب عبر سلم الموافقات.`);return;}
pushAppUndo();const rec={id:'LEAVE/'+Date.now()+'/'+Math.random().toString(36).slice(2,7),type,startDate,endDate,days,note,status:needsOverride?'pending':'approved',overrideRequested:needsOverride,createdAt:activityTimestamp(),createdBy:currentUserDisplayName()
};p.leaveRecords.push(rec);if(needsOverride){const approval=hrCreateApproval('leave_override',p,rec.id,`تجاوز رصيد إجازة — ${days} يوم`,{days,type,startDate,endDate});rec.approvalId=approval.id;}
p.auditTrail.push({time:activityTimestamp(),by:currentUserDisplayName(),text:`تم تسجيل طلب إجازة ${type} لمدة ${days} يوم.`});save();renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('leave'),0);}
function hrDeleteLeaveRecord(profileId,id){const p=getStaffProfileById(profileId);if(!p)return;if(!confirm('حذف سجل الإجازة؟'))return;pushAppUndo();p.leaveRecords=(p.leaveRecords||[]).filter(r=>String(r.id)!==String(id));state.hrApprovals=(state.hrApprovals||[]).filter(a=>String(a.sourceId)!==String(id));save();renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('leave'),0);}
function hrLeavePaneHtml(profile){if(!profile)return '<div class="empty">احفظ ملف الموظف أولاً لتفعيل الإجازات.</div>';const annual=hrLeaveBalance(profile,'annual'),sick=hrLeaveBalance(profile,'sick');const records=(profile.leaveRecords||[]).slice().reverse();return `
 <div class="hr-profile-section">
  <div class="hr-profile-section-title">رصيد الإجازات التراكمي</div>
  <div class="hr-leave-accrual-note">السنوية: ${state.hrSettings.annualLeaveDays||14} يوم/سنة، وتُكتسب يومياً بمعدل ${(Number(state.hrSettings.annualLeaveDays||14)/365).toFixed(5)} يوم لكل يوم خدمة. المعروض هو المكتسب حتى تاريخ اليوم فقط.</div>
  <div class="hr-balance-row">
   <div class="hr-balance-box"><div class="k">المكتسب السنوي</div><div class="v">${annual.accrued}</div></div>
   <div class="hr-balance-box"><div class="k">المستخدم</div><div class="v">${annual.used}</div></div>
   <div class="hr-balance-box"><div class="k">قيد الموافقة</div><div class="v">${annual.pending}</div></div>
   <div class="hr-balance-box"><div class="k">المتاح الآن</div><div class="v">${annual.available}</div></div>
   <div class="hr-balance-box"><div class="k">غير المكتسب بعد</div><div class="v">${annual.future}</div></div>
  </div>
  <div class="muted">الدورة الحالية: ${esc(annual.cycle.start||'—')} → ${esc(annual.cycle.end||'—')} · المرضية السنوية المتاحة: ${sick.available} من ${sick.entitlement}</div>
 </div>
 <div class="hr-subform">
  <b>إضافة / طلب إجازة</b>
  <div class="field-grid" style="margin-top:8px">
   <div class="field"><label>النوع</label><select id="hrLeaveType">${HR_LEAVE_TYPES.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
   <div class="field"><label>من</label><input id="hrLeaveStart" type="date"></div>
   <div class="field"><label>إلى</label><input id="hrLeaveEnd" type="date"></div>
   <div class="field"><label>ملاحظة</label><input id="hrLeaveNote" placeholder="اختياري"></div>
  </div>
  <label class="hr-check" style="margin-top:8px"><input id="hrLeaveOverride" type="checkbox"> طلب تجاوز الرصيد المكتسب إذا كانت المدة أكبر من المتاح</label>
  <div style="margin-top:8px"><button type="button" class="btn" onclick="hrAddLeaveRecord('${profile.id}')">تسجيل الطلب</button></div>
 </div>
 <div class="hr-profile-section">
  <div class="hr-profile-section-title">سجل الإجازات</div>
  ${records.length?`<div class="hr-data-table-wrap"><table class="hr-data-table"><thead><tr><th>النوع</th><th>الفترة</th><th>الأيام</th><th>الحالة</th><th></th></tr></thead><tbody>${records.map(r=>`<tr>
   <td>${esc(r.type)}</td><td>${esc(r.startDate)} → ${esc(r.endDate)}</td><td>${hrLeaveDays(r)}</td>
   <td><span class="hr-record-status ${r.status}">${esc(hrLeaveStatusLabel(r.status))}</span>${r.overrideRequested?'<div class="muted">تجاوز رصيد</div>':''}</td>
   <td><button type="button" class="btn hr-staff-delete" onclick="hrDeleteLeaveRecord('${profile.id}','${r.id}')">حذف</button></td>
  </tr>`).join('')}</tbody></table></div>`:'<div class="empty">لا يوجد إجازات مسجلة.</div>'}
 </div>`;}
function hrCalculateAttendanceHours(start,end,breakMinutes){if(!start||!end)return 0;const a=start.split(':').map(Number),b=end.split(':').map(Number);if(a.length<2||b.length<2)return 0;let mins=(b[0]*60+b[1])-(a[0]*60+a[1]);if(mins<0)mins+=1440;mins=Math.max(0,mins-Number(breakMinutes||0));return mins/60;}
function hrAddAttendance(profileId){const p=getStaffProfileById(profileId);if(!p)return;hrEnsureProfileSchema(p);const date=hrValue('hrAttendanceDate'),start=hrValue('hrAttendanceStart'),end=hrValue('hrAttendanceEnd');const breakMinutes=Number(hrValue('hrAttendanceBreak')||0),note=hrValue('hrAttendanceNote');if(!date||!start||!end){alert('أدخل التاريخ ووقت البداية والنهاية.');return}
const hours=hrCalculateAttendanceHours(start,end,breakMinutes);pushAppUndo();p.attendanceRecords.push({id:'ATT/'+Date.now(),date,start,end,breakMinutes,hours:hrRound(hours,2),note,createdAt:activityTimestamp(),createdBy:currentUserDisplayName()});save();renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('attendance'),0);}
function hrDeleteAttendance(profileId,id){const p=getStaffProfileById(profileId);if(!p)return;pushAppUndo();p.attendanceRecords=(p.attendanceRecords||[]).filter(r=>String(r.id)!==String(id));save();renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('attendance'),0);}
function hrMonthlyAttendance(profile,monthKey=hrTodayIso().slice(0,7)){const records=(profile?.attendanceRecords||[]).filter(r=>String(r.date||'').startsWith(monthKey));const hours=records.reduce((s,r)=>s+Number(r.hours||hrCalculateAttendanceHours(r.start,r.end,r.breakMinutes)),0);return{records,hours:hrRound(hours,2)};}
function hrAttendancePaneHtml(profile){if(!profile)return '<div class="empty">احفظ ملف الموظف أولاً لتفعيل الحضور.</div>';const month=hrTodayIso().slice(0,7),summary=hrMonthlyAttendance(profile,month);const records=(profile.attendanceRecords||[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,40);return `
 <div class="hr-mini-grid">
  <div class="hr-mini-stat"><div class="k">ساعات العمل الفعلية هذا الشهر</div><div class="v">${hrFormatHours(summary.hours)}</div></div>
  <div class="hr-mini-stat"><div class="k">أيام مسجلة</div><div class="v">${summary.records.length}</div></div>
  <div class="hr-mini-stat"><div class="k">متوسط الساعات/يوم</div><div class="v">${summary.records.length?hrFormatHours(summary.hours/summary.records.length):'0.00'}</div></div>
  <div class="hr-mini-stat"><div class="k">الشهر</div><div class="v" style="font-size:13px">${month}</div></div>
 </div>
 <div class="hr-subform">
  <b>تسجيل دوام فعلي</b>
  <div class="field-grid" style="margin-top:8px">
   <div class="field"><label>التاريخ</label><input id="hrAttendanceDate" type="date" value="${hrTodayIso()}"></div>
   <div class="field"><label>بداية العمل</label><input id="hrAttendanceStart" type="time" value="09:00"></div>
   <div class="field"><label>نهاية العمل</label><input id="hrAttendanceEnd" type="time" value="17:00"></div>
   <div class="field"><label>استراحة بالدقائق</label><input id="hrAttendanceBreak" type="number" min="0" value="0"></div>
   <div class="field"><label>ملاحظة</label><input id="hrAttendanceNote"></div>
  </div>
  <div style="margin-top:8px"><button type="button" class="btn" onclick="hrAddAttendance('${profile.id}')">إضافة سجل الدوام</button></div>
 </div>
 ${records.length?`<div class="hr-data-table-wrap"><table class="hr-data-table"><thead><tr><th>التاريخ</th><th>من</th><th>إلى</th><th>الساعات</th><th>ملاحظة</th><th></th></tr></thead><tbody>${records.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.start)}</td><td>${esc(r.end)}</td><td>${hrFormatHours(r.hours)}</td><td>${esc(r.note||'—')}</td><td><button class="btn hr-staff-delete" onclick="hrDeleteAttendance('${profile.id}','${r.id}')">حذف</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">لا يوجد سجلات حضور بعد.</div>'}`;}
function hrTaskCompletedDate(task){return String(task.closedAt||task.invoicedAt||task.completedAt||'').slice(0,10);}
function hrTaskHadRevision(task){return !!task.returnedForRevision ||(task.history||[]).some(h=>/تعديل|أعاد|revision/i.test(String(h.text||'')));}
function hrPerformanceMetrics(profile,monthKey=hrTodayIso().slice(0,7)){const name=normalizeStaffName(profile?.name);const completed=(state.salesTasks||[]).filter(t=>{if(normalizeStaffName(t.assignee)!==name)return false;const d=hrTaskCompletedDate(t);return d&&d.startsWith(monthKey)&&['awaiting_invoice','invoiced','completed'].includes(t.status);});const attendance=hrMonthlyAttendance(profile,monthKey);const actualHours=attendance.hours;const coefficient=Math.max(.1,Number(profile?.plannedTimeCoefficient||8));const speed=completed.length&&actualHours>0?Math.min(150,(completed.length/actualHours)*coefficient*100):0;const onTime=completed.filter(t=>{const done=hrParseDate(hrTaskCompletedDate(t)),due=hrParseDate(t.dueDate);return !due ||(done&&done<=due);}).length;const timeliness=completed.length?onTime/completed.length*100:0;const firstPass=completed.filter(t=>!hrTaskHadRevision(t)).length;const quality=completed.length?firstPass/completed.length*100:0;const w=state.hrSettings.performanceWeights||{timeliness:40,speed:30,quality:30};const score=(timeliness*(Number(w.timeliness||40)/100))+(Math.min(100,speed)*(Number(w.speed||30)/100))+(quality*(Number(w.quality||30)/100));return{completed:completed.length,actualHours,coefficient,speed:hrRound(speed,1),timeliness:hrRound(timeliness,1),quality:hrRound(quality,1),score:hrRound(score,1)};}
function hrLastMonths(count=6){const out=[],d=new Date();d.setDate(1);for(let i=count-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);out.push({key:`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`,label:x.toLocaleDateString('ar',{month:'short'})});}
return out;}
function hrSavePerformanceCoefficient(profileId){const p=getStaffProfileById(profileId);if(!p)return;const n=Number(hrValue('hrPlannedTimeCoefficient'));if(!(n>0)){alert('أدخل معامل زمن مخطط أكبر من صفر.');return}
p.plannedTimeCoefficient=n;p.auditTrail.push({time:activityTimestamp(),by:currentUserDisplayName(),text:`تم تعديل معامل الزمن المخطط إلى ${n} ساعة معيارية لكل مهمة.`});save();renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('performance'),0);}
function hrPerformancePaneHtml(profile){if(!profile)return '<div class="empty">احفظ ملف الموظف أولاً لعرض الأداء.</div>';const current=hrPerformanceMetrics(profile);const months=hrLastMonths(6).map(m=>({...m,metrics:hrPerformanceMetrics(profile,m.key)}));return `
 <div class="hr-mini-grid">
  <div class="hr-mini-stat"><div class="k">معدل الأداء</div><div class="v">${current.score}%</div></div>
  <div class="hr-mini-stat"><div class="k">الالتزام بالمواعيد</div><div class="v">${current.timeliness}%</div></div>
  <div class="hr-mini-stat"><div class="k">جودة الإنجاز من أول مرة</div><div class="v">${current.quality}%</div></div>
  <div class="hr-mini-stat"><div class="k">سرعة الإنجاز</div><div class="v">${current.speed}%</div></div>
 </div>
 <div class="hr-performance-formula">Speed = Completed Tasks / Actual Work Hours × Planned Time Coefficient × 100</div>
 <div class="muted">التقييم المركب: 40% التزام بالمواعيد + 30% سرعة + 30% جودة. معامل الزمن المخطط قابل للضبط حسب طبيعة الوظيفة.</div>
 <div class="hr-subform">
  <div class="field-grid">
   <div class="field"><label>معامل الزمن المخطط (ساعات معيارية/مهمة)</label><input id="hrPlannedTimeCoefficient" type="number" min="0.1" step="0.1" value="${esc(profile.plannedTimeCoefficient||8)}"></div>
   <div class="field" style="align-self:end"><button type="button" class="btn" onclick="hrSavePerformanceCoefficient('${profile.id}')">حفظ المعامل</button></div>
  </div>
 </div>
 <div class="hr-profile-section-title">اتجاه الأداء — آخر 6 أشهر</div>
 <div class="hr-chart">${months.map(m=>{const h=Math.max(3,Math.min(100,m.metrics.score));return `<div class="hr-chart-col"><div class="hr-chart-bar-wrap"><div class="hr-chart-bar" style="height:${h}%"></div></div><div class="hr-chart-score">${m.metrics.score}%</div><div class="hr-chart-label">${esc(m.label)}</div></div>`;}).join('')}</div>
 <div class="muted" style="margin-top:8px">الشهر الحالي: ${current.completed} مهام منجزة · ${hrFormatHours(current.actualHours)} ساعة فعلية مسجلة.</div>`;}
function hrAddDisciplinary(profileId){const p=getStaffProfileById(profileId);if(!p)return;hrEnsureProfileSchema(p);const level=hrValue('hrDisciplinaryLevel'),reason=hrValue('hrDisciplinaryReason');const incidentDate=hrValue('hrDisciplinaryIncident'),issueDate=hrValue('hrDisciplinaryIssue')||hrTodayIso();const employeeResponse=hrValue('hrDisciplinaryEmployeeResponse');if(!level||!reason){alert('اختر نوع الإجراء واكتب السبب.');return}
const active=hrActiveWarnings(p);const rank=HR_DISCIPLINARY_LEVELS.find(x=>x.value===level)?.rank||1;if(rank>1&&active.length===0){if(!confirm('لا يوجد إنذار نشط سابق حالياً. هل تريد متابعة إنشاء هذا المستوى يدوياً؟'))return;}
pushAppUndo();const rec={id:'DISC/'+Date.now()+'/'+Math.random().toString(36).slice(2,7),level,reason,incidentDate,issueDate,employeeResponse,expiresAt:hrAddDays(issueDate,Number(state.hrSettings.warningValidityDays||365)),status:'pending',createdAt:activityTimestamp(),createdBy:currentUserDisplayName()
};p.disciplinaryRecords.push(rec);const approval=hrCreateApproval('disciplinary',p,rec.id,`${hrDisciplinaryLabel(level)} — ${reason}`,{level});rec.approvalId=approval.id;p.auditTrail.push({time:activityTimestamp(),by:currentUserDisplayName(),text:`تم إنشاء طلب ${hrDisciplinaryLabel(level)}.`});save();renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('disciplinary'),0);}
function hrDeleteDisciplinary(profileId,id){const p=getStaffProfileById(profileId);if(!p)return;if(!confirm('حذف سجل الإجراء الوظيفي؟'))return;pushAppUndo();p.disciplinaryRecords=(p.disciplinaryRecords||[]).filter(r=>String(r.id)!==String(id));state.hrApprovals=(state.hrApprovals||[]).filter(a=>String(a.sourceId)!==String(id));save();renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('disciplinary'),0);}
function hrDisciplinaryPaneHtml(profile){if(!profile)return '<div class="empty">احفظ ملف الموظف أولاً.</div>';hrRefreshDisciplinary(profile);const records=(profile.disciplinaryRecords||[]).slice().reverse();const active=hrActiveWarnings(profile);return `
 <div class="hr-mini-grid">
  <div class="hr-mini-stat"><div class="k">إنذارات نشطة تدخل بالتراكم</div><div class="v">${active.length}</div></div>
  <div class="hr-mini-stat"><div class="k">آخر مستوى نشط</div><div class="v" style="font-size:12px">${active.length?esc(hrDisciplinaryLabel(active[active.length-1].level)):'لا يوجد'}</div></div>
  <div class="hr-mini-stat"><div class="k">مدة الصلاحية</div><div class="v">365</div><div class="k">يوم</div></div>
  <div class="hr-mini-stat"><div class="k">إجمالي السجل</div><div class="v">${records.length}</div></div>
 </div>
 <div class="hr-subform">
  <b>إنشاء إجراء وظيفي</b>
  <div class="field-grid" style="margin-top:8px">
   <div class="field"><label>المستوى</label><select id="hrDisciplinaryLevel">${HR_DISCIPLINARY_LEVELS.map(x=>`<option value="${x.value}">${x.rank}. ${x.label}</option>`).join('')}</select></div>
   <div class="field"><label>تاريخ الواقعة</label><input id="hrDisciplinaryIncident" type="date" value="${hrTodayIso()}"></div>
   <div class="field"><label>تاريخ الإصدار</label><input id="hrDisciplinaryIssue" type="date" value="${hrTodayIso()}"></div>
   <div class="field"><label>السبب *</label><input id="hrDisciplinaryReason"></div>
   <div class="field"><label>رد الموظف</label><input id="hrDisciplinaryEmployeeResponse"></div>
  </div>
  <div style="margin-top:8px"><button type="button" class="btn" onclick="hrAddDisciplinary('${profile.id}')">إرسال عبر سلم الموافقات</button></div>
 </div>
 ${records.length?`<div class="hr-data-table-wrap"><table class="hr-data-table"><thead><tr><th>الإجراء</th><th>السبب</th><th>الإصدار</th><th>الانتهاء</th><th>الحالة</th><th></th></tr></thead><tbody>${records.map(r=>`<tr>
  <td><b>${esc(hrDisciplinaryLabel(r.level))}</b></td><td>${esc(r.reason)}</td><td>${esc(r.issueDate||'')}</td><td>${esc(r.expiresAt||'')}</td>
  <td><span class="hr-record-status ${r.status}">${r.status==='active'?'نشط':r.status==='expired'?'منتهي / أرشيف':r.status==='pending'?'بانتظار الموافقة':'مرفوض'}</span></td>
  <td><button class="btn hr-staff-delete" onclick="hrDeleteDisciplinary('${profile.id}','${r.id}')">حذف</button></td>
 </tr>`).join('')}</tbody></table></div>`:'<div class="empty">لا يوجد عقوبات أو إنذارات.</div>'}`;}
function hrAddReward(profileId){const p=getStaffProfileById(profileId);if(!p)return;hrEnsureProfileSchema(p);const rewardType=hrValue('hrRewardType')||'مكافأة مالية',achievement=hrValue('hrRewardAchievement');const amount=hrValue('hrRewardAmount'),currency=hrValue('hrRewardCurrency')||'USD';if(!achievement){alert('اكتب الإنجاز أو سبب المكافأة.');return}
pushAppUndo();const rec={id:'REWARD/'+Date.now()+'/'+Math.random().toString(36).slice(2,7),rewardType,achievement,amount,currency,status:'pending',paymentStatus:'pending',requestedAt:activityTimestamp(),requestedBy:currentUserDisplayName()
};p.rewardRecords.push(rec);const approval=hrCreateApproval('reward',p,rec.id,`${rewardType} — ${achievement}`,{amount,currency});rec.approvalId=approval.id;p.auditTrail.push({time:activityTimestamp(),by:currentUserDisplayName(),text:`تم إنشاء طلب مكافأة: ${achievement}.`});save();renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('rewards'),0);}
function hrMarkRewardPaid(profileId,id){const p=getStaffProfileById(profileId);if(!p)return;const r=(p.rewardRecords||[]).find(x=>String(x.id)===String(id));if(!r||r.status!=='approved')return;r.paymentStatus='paid';r.paidAt=activityTimestamp();r.paidBy=currentUserDisplayName();save();renderStaffWorkflowConfig();setTimeout(()=>switchHrEmployeeTab('rewards'),0);}
function hrRewardsPaneHtml(profile){if(!profile)return '<div class="empty">احفظ ملف الموظف أولاً.</div>';const records=(profile.rewardRecords||[]).slice().reverse();return `
 <div class="hr-subform">
  <b>طلب مكافأة وظيفية</b>
  <div class="field-grid" style="margin-top:8px">
   <div class="field"><label>نوع المكافأة</label><select id="hrRewardType"><option>مكافأة مالية</option><option>مكافأة تقديرية</option><option>حافز أداء</option><option>أخرى</option></select></div>
   <div class="field"><label>القيمة</label><input id="hrRewardAmount" type="number" min="0" step="0.01"></div>
   <div class="field"><label>العملة</label><select id="hrRewardCurrency"><option>USD</option><option>SYP</option><option>AED</option></select></div>
   <div class="field"><label>الإنجاز / سبب المكافأة *</label><input id="hrRewardAchievement"></div>
  </div>
  <div style="margin-top:8px"><button type="button" class="btn" onclick="hrAddReward('${profile.id}')">إرسال للمراجعة والاعتماد</button></div>
 </div>
 ${records.length?`<div class="hr-data-table-wrap"><table class="hr-data-table"><thead><tr><th>النوع</th><th>الإنجاز</th><th>القيمة</th><th>الحالة</th><th>الصرف</th></tr></thead><tbody>${records.map(r=>`<tr>
  <td>${esc(r.rewardType)}</td><td>${esc(r.achievement)}</td><td>${esc(r.amount||'—')} ${esc(r.currency||'')}</td>
  <td><span class="hr-record-status ${r.status}">${r.status==='approved'?'معتمدة':r.status==='pending'?'بانتظار الموافقة':'مرفوضة'}</span></td>
  <td>${r.paymentStatus==='paid'?'<span class="hr-record-status approved">مصروفة</span>':r.status==='approved'?`<button class="btn" onclick="hrMarkRewardPaid('${profile.id}','${r.id}')">تأكيد الصرف</button>`:'—'}</td>
 </tr>`).join('')}</tbody></table></div>`:'<div class="empty">لا يوجد مكافآت مسجلة.</div>'}`;}
function hrTimelineItems(profile){if(!profile)return[];const items=[];if(profile.hireDate)items.push({date:profile.hireDate,title:'بدء العمل',text:`بدأ العمل في ${departmentDisplayName(profile.department||'')}`});(profile.statusHistory||[]).forEach(x=>items.push({date:String(x.time||'').slice(0,10),title:'تغيير الحالة الوظيفية',text:`${x.from||''} → ${x.to||''} · ${x.by||''}`}));(profile.leaveRecords||[]).forEach(x=>items.push({date:x.startDate,title:`إجازة ${x.type}`,text:`${x.startDate} → ${x.endDate} · ${hrLeaveStatusLabel(x.status)}`}));(profile.disciplinaryRecords||[]).forEach(x=>items.push({date:x.issueDate,title:hrDisciplinaryLabel(x.level),text:`${x.reason||''} · ${x.status||''}`}));(profile.rewardRecords||[]).forEach(x=>items.push({date:String(x.requestedAt||'').slice(0,10),title:'مكافأة وظيفية',text:`${x.achievement||''} · ${x.status||''}`}));(profile.documents||[]).forEach(x=>items.push({date:String(x.uploadedAt||'').slice(0,10),title:'رفع وثيقة',text:`${x.category||''} · ${x.title||x.name||''}`}));(profile.auditTrail||[]).forEach(x=>items.push({date:String(x.time||'').slice(0,10),title:'تعديل ملف الموظف',text:x.text||''}));return items.filter(x=>x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,80);}
function hrTimelinePaneHtml(profile){if(!profile)return '<div class="empty">احفظ ملف الموظف أولاً.</div>';const items=hrTimelineItems(profile);return items.length?`<div class="hr-timeline">${items.map(x=>`<div class="hr-timeline-item"><b>${esc(x.title)}</b><span>${esc(x.date)} · ${esc(x.text||'')}</span></div>`).join('')}</div>`:'<div class="empty">لا يوجد أحداث في السجل الوظيفي بعد.</div>';}
function hrOverviewPaneHtml(profile){if(!profile)return `<div class="hr-sensitive-note">أدخل البيانات الأساسية واحفظ الموظف أولاً. بعد الحفظ ستظهر الإجازات والحضور والأداء والمكافآت والإنذارات والسجل الوظيفي.</div>`;hrEnsureProfileSchema(profile);hrRefreshDisciplinary(profile);const annual=hrLeaveBalance(profile,'annual'),perf=hrPerformanceMetrics(profile);const attendance=hrMonthlyAttendance(profile);const managed=getManagedDepartmentsForStaff(profile);return `
 <div class="hr-mini-grid">
  <div class="hr-mini-stat"><div class="k">القسم الأساسي</div><div class="v" style="font-size:12px">${esc(departmentDisplayName(profile.department||''))}</div></div>
  <div class="hr-mini-stat"><div class="k">المدير المباشر</div><div class="v" style="font-size:12px">${esc(profile.directManager||'غير محدد')}</div></div>
  <div class="hr-mini-stat"><div class="k">رصيد إجازة متاح</div><div class="v">${annual.available}</div></div>
  <div class="hr-mini-stat"><div class="k">معدل الأداء الحالي</div><div class="v">${perf.score}%</div></div>
  <div class="hr-mini-stat"><div class="k">ساعات الشهر الفعلية</div><div class="v">${hrFormatHours(attendance.hours)}</div></div>
  <div class="hr-mini-stat"><div class="k">إنذارات نشطة</div><div class="v">${hrActiveWarnings(profile).length}</div></div>
  <div class="hr-mini-stat"><div class="k">مكافآت معتمدة</div><div class="v">${(profile.rewardRecords||[]).filter(r=>r.status==='approved').length}</div></div>
  <div class="hr-mini-stat"><div class="k">يدير أقساماً</div><div class="v">${managed.length}</div></div>
 </div>
 <div class="hr-sensitive-note" style="margin-top:10px">البيانات الصحية، الهوية والمستندات الرسمية مصنفة كبيانات HR حساسة ويجب تقييدها بصلاحيات الموارد البشرية عند ربط حسابات المستخدمين الفعلية.</div>`;}
function hrEmployeeFormHtml(editing,newIdentity,editingStatus){if(editing)hrEnsureProfileSchema(editing);const p=editing||{};const identity=editing?.employeeNo||newIdentity.employeeNo;const name=editing?.name||'موظف جديد';const statusLabel=editing?staffStatusLabel(editing):'جديد';const statusClass=editingStatus||'active';const tabs=[['overview','نظرة عامة'],['personal','البيانات الشخصية'],['employment','البيانات الوظيفية'],['documents','الوثائق'],['leave','الإجازات'],['attendance','الحضور'],['performance','المهام والأداء'],['rewards','المكافآت'],['disciplinary','الإنذارات والعقوبات'],['timeline','السجل الوظيفي']
];return `<div class="hr-profile-shell">
  <div class="hr-profile-hero">
   <div class="hr-profile-avatar">${hrProfileInitial(editing)}</div>
   <div class="hr-profile-hero-main">
    <h3>${esc(name)}</h3>
    <div class="meta">${esc(identity)} · ${esc(editing?.jobTitle||'بدون مسمى وظيفي')} · ${esc(departmentDisplayName(editing?.department||''))}</div>
   </div>
   <span class="hr-status ${statusClass}">${esc(statusLabel)}</span>
   <button type="button" class="btn" onclick="closeStaffEmployeeForm()">إغلاق</button>
  </div>
  <div class="hr-profile-tabs">${tabs.map(([key,label],i)=>`<button type="button" class="hr-profile-tab ${i===0?'active':''}" data-tab="${key}" onclick="switchHrEmployeeTab('${key}')">${label}</button>`).join('')}</div>

  <div class="hr-profile-pane active" data-pane="overview">${hrOverviewPaneHtml(editing)}</div>

  <div class="hr-profile-pane" data-pane="personal">
   <div class="hr-sensitive-note">الرقم الوطني، الحالة الصحية والوثائق الرسمية بيانات حساسة. الواجهة جاهزة لتقييدها بصلاحيات HR عند تفعيل نظام الحسابات الكامل.</div>
   <div class="hr-profile-section">
    <div class="hr-profile-section-title">الهوية والبيانات الشخصية</div>
    <div class="field-grid">
     <div class="field"><label>رقم الموظف</label><input value="${esc(identity)}" readonly></div>
     <div class="field"><label>اسم الموظف الكامل *</label><input id="staffName" value="${esc(p.name||'')}" autocomplete="off"></div>
     <div class="field"><label>اسم الأب</label><input id="staffFatherName" value="${esc(p.fatherName||'')}"></div>
     <div class="field"><label>اسم الأم</label><input id="staffMotherName" value="${esc(p.motherName||'')}"></div>
     <div class="field"><label>الرقم الوطني / رقم الهوية</label><input id="staffNationalId" value="${esc(p.nationalId||'')}"></div>
     <div class="field"><label>الجنسية</label><select id="staffNationality">${HR_NATIONALITIES.map(v=>`<option value="${v}" ${hrSelected(p.nationality||'سوري',v)}>${v}</option>`).join('')}</select></div>
     <div class="field"><label>تاريخ الميلاد</label><input id="staffBirthDate" type="date" value="${esc(p.birthDate||'')}"></div>
     <div class="field"><label>مكان الميلاد</label><input id="staffBirthPlace" value="${esc(p.birthPlace||'')}"></div>
     <div class="field"><label>الجنس</label><select id="staffGender"><option value="">غير محدد</option><option ${hrSelected(p.gender,'ذكر')}>ذكر</option><option ${hrSelected(p.gender,'أنثى')}>أنثى</option></select></div>
     <div class="field"><label>الحالة الاجتماعية</label><select id="staffMaritalStatus"><option value="">غير محدد</option>${['أعزب','متزوج','مطلق','أرمل'].map(v=>`<option value="${v}" ${hrSelected(p.maritalStatus,v)}>${v}</option>`).join('')}</select></div>
     <div class="field"><label>العلامات المميزة</label><input id="staffIdentifyingMarks" value="${esc(p.identifyingMarks||'')}" placeholder="شامة بارزة، وشم..."></div>
     <div class="field"><label>الإيميل الشخصي</label><input id="staffPersonalEmail" type="email" value="${esc(p.personalEmail||'')}"></div>
     <div class="field"><label>هل يوجد وضع صحي يؤثر على العمل؟</label><select id="staffHasHealthCondition" onchange="hrToggleConditionalFields()"><option value="no" ${!p.hasHealthCondition?'selected':''}>لا</option><option value="yes" ${p.hasHealthCondition?'selected':''}>نعم</option></select></div>
    </div>
    <div id="staffHealthDetailsWrap" class="field-grid" style="display:${p.hasHealthCondition?'grid':'none'};margin-top:8px">
     <div class="field" style="grid-column:1/-1"><label>الحالة الصحية / الاحتياج المرتبط بالعمل</label><textarea id="staffHealthDetails" rows="3">${esc(p.healthDetails||'')}</textarea></div>
    </div>
   </div>
   <div class="hr-profile-section">
    <div class="hr-profile-section-title">التواصل والسكن والطوارئ</div>
    <div class="field-grid">
     <div class="field"><label>رقم الموبايل الأساسي</label><input id="staffPhone" value="${esc(p.phone||'')}"></div>
     <div class="field"><label>رقم هاتف احتياطي / طوارئ</label><input id="staffEmergencyPhone" value="${esc(p.emergencyPhone||'')}"></div>
     <div class="field"><label>اسم شخص للطوارئ</label><input id="staffEmergencyContactName" value="${esc(p.emergencyContactName||'')}"></div>
     <div class="field"><label>صلة القرابة</label><input id="staffEmergencyRelation" value="${esc(p.emergencyRelation||'')}"></div>
     <div class="field"><label>المدينة / المحافظة</label><input id="staffCity" value="${esc(p.city||'')}"></div>
     <div class="field"><label>بلد الإقامة</label><input id="staffCountry" value="${esc(p.country||'سوريا')}"></div>
     <div class="field" style="grid-column:1/-1"><label>عنوان السكن التفصيلي</label><input id="staffAddress" value="${esc(p.address||'')}"></div>
    </div>
   </div>
  </div>

  <div class="hr-profile-pane" data-pane="employment">
   <div class="hr-profile-section">
    <div class="hr-profile-section-title">التوظيف والتعاقد</div>
    <div class="field-grid">
     <div class="field"><label>الشركة</label><input id="staffCompany" value="${esc(p.company||'Mosh Group')}"></div>
     <div class="field"><label>الفرع / موقع العمل</label><input id="staffBranch" value="${esc(p.branch||'دمشق')}"></div>
     <div class="field"><label>القسم الأساسي *</label><select id="staffDepartment" onchange="refreshStaffManagerPreview()">${salesTaskDepartments.map(d=>`<option value="${d}" ${(p.department||salesTaskDepartments[0])===d?'selected':''}>${departmentDisplayName(d)}</option>`).join('')}</select></div>
     <div class="field"><label>المسمى الوظيفي</label><input id="staffJobTitle" value="${esc(p.jobTitle||'')}"></div>
     <div class="field"><label>نوع التوظيف الحالي</label><select id="staffEmploymentType">${['دوام كامل','دوام جزئي','متعاون'].map(v=>`<option value="${v}" ${(p.employmentType||'دوام كامل')===v?'selected':''}>${v}</option>`).join('')}</select></div>
     <div class="field"><label>طبيعة العمل</label><select id="staffWorkMode">${HR_WORK_MODES.map(v=>`<option value="${v}" ${hrSelected(p.workMode||'مكتبي',v)}>${v}</option>`).join('')}</select></div>
     <div class="field"><label>نوع العقد</label><select id="staffContractType">${HR_CONTRACT_TYPES.map(v=>`<option value="${v}" ${hrSelected(p.contractType||'دائم',v)}>${v}</option>`).join('')}</select></div>
     <div class="field"><label>تاريخ بدء العمل</label><input id="staffHireDate" type="date" value="${esc(p.hireDate||'')}"></div>
     <div class="field"><label>مدة التجربة (شهر)</label><input id="staffProbationMonths" type="number" min="0" value="${esc(p.probationMonths??3)}"></div>
     <div class="field"><label>نهاية التجربة</label><input id="staffProbationEndDate" type="date" value="${esc(p.probationEndDate||'')}"></div>
     <div class="field"><label>تاريخ انتهاء العقد</label><input id="staffContractEndDate" type="date" value="${esc(p.contractEndDate||'')}"></div>
     <div class="field"><label>حالة الموظف *</label><select id="staffEmploymentStatus" onchange="toggleStaffStatusFields()"><option value="active" ${editingStatus==='active'?'selected':''}>نشط</option><option value="inactive" ${editingStatus==='inactive'?'selected':''}>غير نشط</option><option value="resigned" ${editingStatus==='resigned'?'selected':''}>مستقيل / منتهي الخدمة</option></select></div>
     <div class="field"><label>الهيكل الإداري</label><div id="staffManagerPreview" class="hr-manager-preview"></div></div>
     <div class="field"><label>وجود أقارب في العمل</label><select id="staffHasRelatives" onchange="hrToggleConditionalFields()"><option value="no" ${!p.hasRelatives?'selected':''}>لا</option><option value="yes" ${p.hasRelatives?'selected':''}>نعم</option></select></div>
    </div>
    <div id="staffRelativesDetailsWrap" class="field-grid" style="display:${p.hasRelatives?'grid':'none'};margin-top:8px"><div class="field" style="grid-column:1/-1"><label>أسماء الأقارب وصلة القرابة</label><textarea id="staffRelativesDetails" rows="2">${esc(p.relativesDetails||'')}</textarea></div></div>
   </div>

   <div id="staffResignationFields" class="hr-profile-section" style="display:${editingStatus==='resigned'?'block':'none'}">
    <div class="hr-profile-section-title">إنهاء الخدمة / الخروج من الشركة</div>
    <div class="field-grid">
     <div class="field"><label>تاريخ انتهاء العمل / آخر يوم *</label><input id="staffResignationDate" type="date" value="${esc(p.resignationDate||p.lastWorkDay||'')}"></div>
     <div class="field"><label>سبب انتهاء الخدمة *</label><select id="staffServiceEndReasonType">${HR_END_REASONS.map(v=>`<option value="${v}" ${hrSelected(p.serviceEndReasonType||'',v)}>${v||'اختر السبب'}</option>`).join('')}</select></div>
     <div class="field"><label>تفاصيل السبب</label><input id="staffResignationReason" value="${esc(p.resignationReason||'')}"></div>
     <div class="field"><label>آخر يوم عمل</label><input id="staffLastWorkDay" type="date" value="${esc(p.lastWorkDay||p.resignationDate||'')}"></div>
    </div>
    <div class="hr-offboarding-grid" style="margin-top:8px">
     <label class="hr-check"><input id="offAssetsReturned" type="checkbox" ${hrCheckedAttr(p.offboarding?.assetsReturned)}> إعادة الأجهزة والعهدة</label>
     <label class="hr-check"><input id="offAccountsClosed" type="checkbox" ${hrCheckedAttr(p.offboarding?.accountsClosed)}> إغلاق الحسابات والصلاحيات</label>
     <label class="hr-check"><input id="offFilesHandedOver" type="checkbox" ${hrCheckedAttr(p.offboarding?.filesHandedOver)}> تسليم الملفات والمسؤوليات</label>
     <label class="hr-check"><input id="offLeaveSettled" type="checkbox" ${hrCheckedAttr(p.offboarding?.leaveSettled)}> تسوية الإجازات والمستحقات</label>
     <label class="hr-check"><input id="offExitInterview" type="checkbox" ${hrCheckedAttr(p.offboarding?.exitInterview)}> مقابلة خروج</label>
     <label class="hr-check"><input id="offHrApproved" type="checkbox" ${hrCheckedAttr(p.offboarding?.hrApproved)}> اعتماد HR</label>
     <label class="hr-check"><input id="offExecutiveApproved" type="checkbox" ${hrCheckedAttr(p.offboarding?.executiveApproved)}> اعتماد الإدارة العليا</label>
    </div>
   </div>

   <div class="hr-profile-section">
    <div class="hr-profile-section-title">الحسابات والعهدة الداخلية</div>
    <div class="field-grid">
     <div class="field"><label>إيميل الشركة</label><input id="staffEmail" type="email" value="${esc(p.email||p.corporateEmail||'')}"></div>
     <div class="field"><label>التحويلة</label><input id="staffExtension" value="${esc(p.extension||'')}"></div>
     <div class="field"><label>اسم المستخدم بالنظام</label><input id="staffSystemUsername" value="${esc(p.systemUsername||'')}"></div>
     <div class="field"><label>الأجهزة / العهدة المسلمة</label><input id="staffIssuedAssets" value="${esc(p.issuedAssets||'')}" placeholder="Laptop, Mobile, SIM, Access Card..."></div>
    </div>
   </div>

   <div class="hr-profile-section">
    <div class="hr-profile-section-title">المؤهل ورخصة القيادة</div>
    <div class="field-grid">
     <div class="field"><label>الشهادة العلمية / الدرجة</label><input id="staffEducationDegree" value="${esc(p.educationDegree||'')}"></div>
     <div class="field"><label>الجامعة / المعهد</label><input id="staffEducationUniversity" value="${esc(p.educationUniversity||'')}"></div>
     <div class="field"><label>الاختصاص</label><input id="staffEducationSpecialization" value="${esc(p.educationSpecialization||'')}"></div>
     <div class="field"><label>سنة التخرج</label><input id="staffGraduationYear" value="${esc(p.graduationYear||'')}"></div>
     <div class="field"><label>نوع شهادة القيادة</label><select id="staffDrivingLicenseType"><option value="">لا يوجد / غير محدد</option>${['خصوصي','عمومي','دراجة نارية','شاحنات / ثقيل','دولي','أخرى'].map(v=>`<option value="${v}" ${hrSelected(p.drivingLicenseType,v)}>${v}</option>`).join('')}</select></div>
     <div class="field"><label>رقم شهادة القيادة</label><input id="staffDrivingLicenseNumber" value="${esc(p.drivingLicenseNumber||'')}"></div>
     <div class="field"><label>انتهاء شهادة القيادة</label><input id="staffDrivingLicenseExpiry" type="date" value="${esc(p.drivingLicenseExpiry||'')}"></div>
    </div>
   </div>

      <div class="hr-profile-section">
    <div class="hr-profile-section-title">الحضور بالبصمة — ZKTeco</div>

    <div class="field-grid">
     <div class="field">
      <label>رقم التسجيل في جهاز البصمة</label>
      <input
       id="staffZktecoEnrollmentNumber"
       value="${esc(p.zktecoEnrollmentNumber||'')}"
       inputmode="numeric"
       autocomplete="off"
       placeholder="مثال: 82">
     </div>

     <div class="field">
      <label>استثناء من البصمة</label>
      <select id="staffZktecoExempt">
       <option value="0" ${p.zktecoExempt?'':'selected'}>لا</option>
       <option value="1" ${p.zktecoExempt?'selected':''}>نعم</option>
      </select>
     </div>
    </div>

    <div class="muted" style="margin-top:8px">
     يُستخدم رقم التسجيل لربط الموظف بجهاز الحضور.
     لا تحفظ MOSH صور أو قوالب البصمة.
    </div>
   </div>

   <div class="field"><label>ملاحظات الموارد البشرية</label><textarea id="staffNotes" rows="3">${esc(p.notes||'')}</textarea></div>
  </div>

  <div class="hr-profile-pane" data-pane="documents">${staffDocumentsHtml(editing)}</div>
  <div class="hr-profile-pane" data-pane="leave">${hrLeavePaneHtml(editing)}</div>
  <div class="hr-profile-pane" data-pane="attendance">${hrAttendancePaneHtml(editing)}</div>
  <div class="hr-profile-pane" data-pane="performance">${hrPerformancePaneHtml(editing)}</div>
  <div class="hr-profile-pane" data-pane="rewards">${hrRewardsPaneHtml(editing)}</div>
  <div class="hr-profile-pane" data-pane="disciplinary">${hrDisciplinaryPaneHtml(editing)}</div>
  <div class="hr-profile-pane" data-pane="timeline">${hrTimelinePaneHtml(editing)}</div>

  <div class="hr-form-savebar">
   <button type="button" class="btn primary" onclick="saveStaffProfile('${editing?.id||''}')">${editing?'حفظ ملف الموظف':'إضافة الموظف'}</button>
   <button type="button" class="btn" onclick="closeStaffEmployeeForm()">إلغاء</button>
  </div>
 </div>`;}
const _hrV170OriginalRenderStaffWorkflowConfig=renderStaffWorkflowConfig;renderStaffWorkflowConfig=function(){const box=document.getElementById('staffWorkflowConfig');if(!box)return;_hrV170OriginalRenderStaffWorkflowConfig();const all=(state.staffProfiles||[]).slice();const head=box.querySelector('.hr-staff-head');if(head && !box.querySelector('.hr-v170-overview')){head.insertAdjacentHTML('afterend',hrOverviewSummaryHtml(all));}
if(hrStaffFormOpen){const oldForm=box.querySelector('.hr-employee-form');if(oldForm){const editing=getStaffProfileById(hrStaffEditingId);const newIdentity=nextStaffIdentity();const editingStatus=editing?staffEmploymentStatus(editing):'active';const wrap=document.createElement('div');wrap.innerHTML=hrEmployeeFormHtml(editing,newIdentity,editingStatus);oldForm.replaceWith(wrap.firstElementChild);setTimeout(()=>{refreshStaffManagerPreview();hrToggleConditionalFields()},0);}
}
};function hrProfileSnapshot(p){if(!p)return{};const keys=['name','fatherName','motherName','nationalId','nationality','birthDate','personalEmail','phone','emergencyPhone','address','department','jobTitle','employmentType','workMode','contractType','hireDate','contractEndDate','employmentStatus','resignationDate','serviceEndReasonType','email'];const o={};keys.forEach(k=>o[k]=p[k]);return o;}
function hrAuditChanges(profile,before){const after=hrProfileSnapshot(profile),changes=[];const labels={name:'الاسم',fatherName:'اسم الأب',motherName:'اسم الأم',nationalId:'الرقم الوطني',nationality:'الجنسية',birthDate:'تاريخ الميلاد',personalEmail:'الإيميل الشخصي',phone:'الموبايل',emergencyPhone:'هاتف الطوارئ',address:'العنوان',department:'القسم',jobTitle:'المسمى',employmentType:'نوع التوظيف',workMode:'طبيعة العمل',contractType:'نوع العقد',hireDate:'بدء العمل',contractEndDate:'انتهاء العقد',employmentStatus:'الحالة',resignationDate:'انتهاء الخدمة',serviceEndReasonType:'سبب انتهاء الخدمة',email:'إيميل الشركة'};Object.keys(after).forEach(k=>{if(String(before?.[k]??'')!==String(after[k]??''))changes.push(labels[k]||k)});if(changes.length)profile.auditTrail.push({time:activityTimestamp(),by:currentUserDisplayName(),text:`تم تعديل: ${changes.join('، ')}.`});}
const _hrV170OriginalSaveStaffProfile=saveStaffProfile;saveStaffProfile=function(editId=''){const original=getStaffProfileById(editId);const before=hrProfileSnapshot(original);const extra={fatherName:hrValue('staffFatherName'),motherName:hrValue('staffMotherName'),nationalId:hrValue('staffNationalId'),nationality:hrValue('staffNationality')||'سوري',birthDate:hrValue('staffBirthDate'),birthPlace:hrValue('staffBirthPlace'),gender:hrValue('staffGender'),maritalStatus:hrValue('staffMaritalStatus'),identifyingMarks:hrValue('staffIdentifyingMarks'),personalEmail:hrValue('staffPersonalEmail'),hasHealthCondition:hrValue('staffHasHealthCondition')==='yes',healthDetails:hrValue('staffHealthDetails'),emergencyPhone:hrValue('staffEmergencyPhone'),emergencyContactName:hrValue('staffEmergencyContactName'),emergencyRelation:hrValue('staffEmergencyRelation'),address:hrValue('staffAddress'),city:hrValue('staffCity'),country:hrValue('staffCountry')||'سوريا',company:hrValue('staffCompany')||'Mosh Group',branch:hrValue('staffBranch')||'دمشق',workMode:hrValue('staffWorkMode')||'مكتبي',contractType:hrValue('staffContractType')||'دائم',probationMonths:Number(hrValue('staffProbationMonths')||0),probationEndDate:hrValue('staffProbationEndDate'),contractEndDate:hrValue('staffContractEndDate'),serviceEndReasonType:hrValue('staffServiceEndReasonType'),lastWorkDay:hrValue('staffLastWorkDay'),hasRelatives:hrValue('staffHasRelatives')==='yes',relativesDetails:hrValue('staffRelativesDetails'),corporateEmail:hrValue('staffEmail'),extension:hrValue('staffExtension'),systemUsername:hrValue('staffSystemUsername'),issuedAssets:hrValue('staffIssuedAssets'),educationDegree:hrValue('staffEducationDegree'),educationUniversity:hrValue('staffEducationUniversity'),educationSpecialization:hrValue('staffEducationSpecialization'),graduationYear:hrValue('staffGraduationYear'),drivingLicenseType:hrValue('staffDrivingLicenseType'),drivingLicenseNumber:hrValue('staffDrivingLicenseNumber'),drivingLicenseExpiry:hrValue('staffDrivingLicenseExpiry'),offboarding:{assetsReturned:hrChecked('offAssetsReturned'),accountsClosed:hrChecked('offAccountsClosed'),filesHandedOver:hrChecked('offFilesHandedOver'),leaveSettled:hrChecked('offLeaveSettled'),exitInterview:hrChecked('offExitInterview'),hrApproved:hrChecked('offHrApproved'),executiveApproved:hrChecked('offExecutiveApproved')
}
};if(extra.personalEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extra.personalEmail)){alert('الإيميل الشخصي غير صحيح.');document.getElementById('staffPersonalEmail')?.focus();return;}
const status=hrValue('staffEmploymentStatus');if(status==='resigned'&&!extra.serviceEndReasonType&&!hrValue('staffResignationReason')){alert('اختر سبب انتهاء الخدمة أو اكتب تفاصيل السبب.');switchHrEmployeeTab('employment');return;}
if(_hrV170OriginalSaveStaffProfile(editId)!==true)return false;const saved=getStaffProfileById(hrStaffEditingId);if(!saved)return;hrEnsureProfileSchema(saved);Object.assign(saved,extra);if(extra.corporateEmail)saved.email=extra.corporateEmail;if(!saved.probationEndDate && saved.hireDate && Number(saved.probationMonths)>0){const d=hrParseDate(saved.hireDate);if(d){d.setMonth(d.getMonth()+Number(saved.probationMonths));saved.probationEndDate=hrIsoDate(d)}
}
hrAuditChanges(saved,before);save();renderStaffWorkflowConfig();};const _hrV170OpenStaffEmployeeForm=openStaffEmployeeForm;openStaffEmployeeForm=function(id=''){_hrV170OpenStaffEmployeeForm(id);setTimeout(()=>switchHrEmployeeTab('overview'),0);};function hrRequestTermination(profileId){const p=getStaffProfileById(profileId);if(!p)return;const lastWorkDay=prompt('آخر يوم عمل (YYYY-MM-DD):',p.lastWorkDay||p.resignationDate||hrTodayIso());if(!lastWorkDay)return;const reason=prompt('سبب إنهاء الخدمة:','إنهاء عقد من الشركة');if(!reason)return;pushAppUndo();hrCreateApproval('termination',p,'TERM/'+Date.now(),`طلب إنهاء خدمة — ${reason}`,{lastWorkDay,reason});p.auditTrail.push({time:activityTimestamp(),by:currentUserDisplayName(),text:'تم إنشاء طلب إنهاء خدمة عبر سلم الموافقات.'});save();renderStaffWorkflowConfig();}
const _hrV170SwitchHrEmployeeTab=switchHrEmployeeTab;switchHrEmployeeTab=function(tab){_hrV170SwitchHrEmployeeTab(tab);if(tab==='employment'&&hrStaffEditingId){const pane=document.querySelector('.hr-profile-pane[data-pane="employment"]');if(pane&&!pane.querySelector('.hr-request-termination')){pane.insertAdjacentHTML('beforeend',`<div class="hr-subform hr-request-termination"><b>سلم موافقات إنهاء الخدمة</b><div class="muted" style="margin:5px 0 8px">مدير القسم / HR → مسؤول HR → المدير التنفيذي / الإدارة العليا.</div><button type="button" class="btn" onclick="hrRequestTermination('${hrStaffEditingId}')">إنشاء طلب إنهاء خدمة</button></div>`);}
}
};save();let hrV171ActiveEmployeeTab='overview';function hrV171PlaceEmployeeForm({scroll=false}={}){const box=document.getElementById('staffWorkflowConfig');if(!box||!hrStaffFormOpen)return;const shell=box.querySelector('.hr-profile-shell');const head=box.querySelector('.hr-staff-head');if(shell&&head){head.insertAdjacentElement('afterend',shell);switchHrEmployeeTab(hrV171ActiveEmployeeTab||'overview');if(scroll)setTimeout(()=>shell.scrollIntoView({behavior:'smooth',block:'start'}),20);}
}
const _hrV171RenderStaffWorkflowConfig=renderStaffWorkflowConfig;renderStaffWorkflowConfig=function(){_hrV171RenderStaffWorkflowConfig();hrV171PlaceEmployeeForm();};openStaffEmployeeForm=function(id=''){const isEdit=!!String(id||'');hrStaffFormOpen=true;hrStaffEditingId=String(id||'');hrV171ActiveEmployeeTab=isEdit?'overview':'personal';renderStaffWorkflowConfig();setTimeout(()=>{hrV171PlaceEmployeeForm({scroll:true});refreshStaffManagerPreview();toggleStaffStatusFields(false);if(!isEdit)document.getElementById('staffName')?.focus();},30);};closeStaffEmployeeForm=function(){hrStaffFormOpen=false;hrStaffEditingId='';hrV171ActiveEmployeeTab='overview';renderStaffWorkflowConfig();};const _hrV171SwitchHrEmployeeTab=switchHrEmployeeTab;switchHrEmployeeTab=function(tab){hrV171ActiveEmployeeTab=tab||'overview';_hrV171SwitchHrEmployeeTab(tab);};let hrV172ManagersOpen=false;function hrV172ApplyHrLayout(){const box=document.getElementById('staffWorkflowConfig');if(!box)return;box.classList.toggle('hr-form-mode',!!hrStaffFormOpen);const panel=box.querySelector('.hr-manager-panel');if(panel){panel.classList.toggle('hr-managers-open',!!hrV172ManagersOpen);const head=panel.querySelector('.hr-manager-panel-head');if(head && !head.querySelector('.hr-manager-toggle')){const btn=document.createElement('button');btn.type='button';btn.className='hr-manager-toggle';btn.textContent=hrV172ManagersOpen?'إخفاء الإعدادات':'إدارة المدراء';btn.onclick=()=>{hrV172ManagersOpen=!hrV172ManagersOpen;panel.classList.toggle('hr-managers-open',hrV172ManagersOpen);btn.textContent=hrV172ManagersOpen?'إخفاء الإعدادات':'إدارة المدراء';};head.appendChild(btn);}
}
}
const _hrV172RenderStaffWorkflowConfig=renderStaffWorkflowConfig;renderStaffWorkflowConfig=function(){_hrV172RenderStaffWorkflowConfig();hrV172ApplyHrLayout();};const _hrV172OpenStaffWorkflowConfig=openStaffWorkflowConfig;openStaffWorkflowConfig=function(){_hrV172OpenStaffWorkflowConfig();hrV172ManagersOpen=false;hrV172ApplyHrLayout();};const _hrV172OpenStaffEmployeeForm=openStaffEmployeeForm;openStaffEmployeeForm=function(id=''){_hrV172OpenStaffEmployeeForm(id);setTimeout(hrV172ApplyHrLayout,20);};const _hrV172CloseStaffEmployeeForm=closeStaffEmployeeForm;closeStaffEmployeeForm=function(){_hrV172CloseStaffEmployeeForm();setTimeout(hrV172ApplyHrLayout,20);};function moshV172EnhanceTruncationTitles(){document.querySelectorAll('.nav-label,.employee-name,.employee-sub,.task-chat-file-name').forEach(el=>{if(!el.title && String(el.textContent||'').trim())el.title=String(el.textContent||'').trim();});}
setTimeout(moshV172EnhanceTruncationTitles,0);function hrPendingApprovalCount(){return(state.hrApprovals||[]).filter(a=>a.status==='pending').length;}
function hrCurrentAlertCount(){return hrBuildAlerts((state.staffProfiles||[]).slice()).length;}
function hrUpdateMenuCounts(){const approvalBtn=document.getElementById('hrApprovalsMenuBtn');const alertsBtn=document.getElementById('hrAlertsMenuBtn');const approvals=hrPendingApprovalCount();const alerts=hrCurrentAlertCount();if(approvalBtn){approvalBtn.innerHTML=`الموافقات المعلقة <span class="hr-menu-count">${approvals}</span>`;}
if(alertsBtn){alertsBtn.innerHTML=`تنبيهات HR والاستحقاقات <span class="hr-menu-count">${alerts}</span>`;}
}
function hrClearForcedPanels(){document.querySelectorAll('.hr-v170-card.hr-force-visible').forEach(el=>el.classList.remove('hr-force-visible'));document.querySelectorAll('.hr-v170-dashboard-grid.hr-force-visible').forEach(el=>el.classList.remove('hr-force-visible'));}
function hrOpenHrPanel(kind){openStaffWorkflowConfig();setTimeout(()=>{hrClearForcedPanels();hrUpdateMenuCounts();const id=kind==='approvals'?'hrApprovalsPanel':'hrAlertsPanel';const panel=document.getElementById(id);if(!panel)return;const grid=panel.closest('.hr-v170-dashboard-grid');if(grid)grid.classList.add('hr-force-visible');panel.classList.add('hr-force-visible');panel.scrollIntoView({behavior:'smooth',block:'start'});},80);}
const _hrV173RenderStaffWorkflowConfig=renderStaffWorkflowConfig;renderStaffWorkflowConfig=function(){_hrV173RenderStaffWorkflowConfig();hrUpdateMenuCounts();};setTimeout(hrUpdateMenuCounts,0);let hrStandaloneMode='';let hrStandaloneQuery='';let hrStandaloneFilter='all';function hrShowOnlyStandalone(){const task=document.getElementById('hrAppContent');const staff=document.getElementById('hrStaffConfigContent');const stand=document.getElementById('hrStandaloneContent');if(task)task.style.display='none';if(staff)staff.style.display='none';if(stand)stand.style.display='block';}
function hrHideStandalone(){const stand=document.getElementById('hrStandaloneContent');if(stand){stand.style.display='none';stand.innerHTML=''}
hrStandaloneMode='';}
function hrBackToStaff(){hrHideStandalone();openStaffWorkflowConfig();}
function hrInitial(name){const s=String(name||'م').trim();return esc(s.charAt(0)||'م');}
function hrApprovalKindIcon(type){return{personal_change:'✎',termination:'⛔',disciplinary:'⚠',leave_override:'☂',reward:'★'
}[type]||'✓';}
function hrApprovalTypeFilterOptions(){return[['all','كل الأنواع'],['leave_override','تجاوز رصيد إجازة'],['reward','مكافآت'],['disciplinary','إنذارات وعقوبات'],['termination','إنهاء خدمة'],['personal_change','بيانات ووثائق']
];}
function hrApprovalPayloadText(a){const p=a?.payload||{};if(a.type==='leave_override'){return `المدة المطلوبة: ${p.days||'—'} يوم${p.startDate?` · من ${p.startDate}`:''}${p.endDate?` إلى ${p.endDate}`:''}`;}
if(a.type==='reward'){return `القيمة: ${p.amount||'—'} ${p.currency||''}`;}
if(a.type==='disciplinary'){return `المستوى المطلوب: ${hrDisciplinaryLabel(p.level)}`;}
if(a.type==='termination'){return `آخر يوم عمل: ${p.lastWorkDay||'—'}${p.reason?` · السبب: ${p.reason}`:''}`;}
return '';}
function hrApprovalFlowHtml(a){const levels=Array.isArray(a.levels)?a.levels:[];if(!levels.length)return '';return `<div class="hr-approval-flow">${levels.map((level,index)=>{const cls=index<a.currentLevel?'done':index===a.currentLevel?'current':'';const mark=index<a.currentLevel?'✓':index===a.currentLevel?'●':'○';const step=`<span class="hr-flow-step ${cls}">${mark} ${esc(level)}</span>`;return index<levels.length-1?step+'<span class="hr-flow-arrow">←</span>':step;}).join('')}</div>`;}
function hrApprovalCardHtml(a){const detail=hrApprovalPayloadText(a);return `<div class="hr-approval-card-v174">
  <div class="hr-approval-card-main">
   <div class="hr-employee-avatar-sm">${hrInitial(a.employeeName)}</div>
   <div class="hr-approval-card-content">
    <div class="hr-approval-card-title">
     <b>${esc(a.employeeName||'موظف')}</b>
     <span class="hr-approval-type-chip">${hrApprovalKindIcon(a.type)} ${esc(hrApprovalTypeLabel(a.type))}</span>
    </div>
    <div class="hr-approval-card-meta">
     <span>📌 ${esc(a.title||hrApprovalTypeLabel(a.type))}</span>
     <span>👤 مقدم الطلب: ${esc(a.createdBy||'—')}</span>
     <span>🕒 ${esc(a.createdAt||'—')}</span>
    </div>
    ${detail?`<div class="hr-approval-detail-note">${esc(detail)}</div>`:''}
    ${hrApprovalFlowHtml(a)}
   </div>
   <div class="hr-approval-card-side">
    <div class="hr-current-stage">بانتظار<br><b>${esc(a.levels?.[a.currentLevel]||'المراجعة')}</b></div>
   </div>
  </div>
  <div class="hr-approval-card-actions">
   <button type="button" class="btn" onclick="hrAdvanceApproval('${a.id}','approve');hrRenderStandalonePage()">اعتماد المستوى الحالي</button>
   <button type="button" class="btn hr-staff-delete" onclick="hrAdvanceApproval('${a.id}','reject');hrRenderStandalonePage()">رفض الطلب</button>
   <button type="button" class="btn" onclick="openStaffEmployeeForm('${a.employeeId}');hrHideStandalone()">فتح ملف الموظف</button>
  </div>
 </div>`;}
function hrApprovalsStandaloneHtml(){const approvals=(state.hrApprovals||[]).filter(a=>a.status==='pending');const q=normalizeStaffName(hrStandaloneQuery);const filtered=approvals.filter(a=>{if(hrStandaloneFilter!=='all'&&a.type!==hrStandaloneFilter)return false;if(!q)return true;return normalizeStaffName(`${a.employeeName||''} ${a.title||''} ${hrApprovalTypeLabel(a.type)} ${a.createdBy||''}`).includes(q);});const byType=(type)=>approvals.filter(a=>a.type===type).length;return `<div class="hr-standalone-page">
  <div class="hr-standalone-hero">
   <div class="hr-standalone-icon">✓</div>
   <div class="hr-standalone-title">
    <h2>الموافقات المعلقة</h2>
    <p>مركز اعتماد إجراءات الموارد البشرية. كل طلب يظهر مع الموظف، نوع الإجراء، المرحلة الحالية، مسار الاعتماد، وتفاصيل تساعدك على اتخاذ القرار بدون الدخول بين شاشات أخرى.</p>
   </div>
   <div class="hr-standalone-actions">
    <button type="button" class="btn" onclick="hrBackToStaff()">ملفات الموظفين</button>
    <button type="button" class="btn" onclick="hrRenderStandalonePage()">تحديث</button>
   </div>
  </div>

  <div class="hr-standalone-kpis">
   <div class="hr-standalone-kpi"><div class="label">إجمالي بانتظار الاعتماد</div><div class="value">${approvals.length}</div><div class="sub">كل الطلبات التي تحتاج قراراً حالياً</div></div>
   <div class="hr-standalone-kpi"><div class="label">إجازات تجاوز الرصيد</div><div class="value">${byType('leave_override')}</div><div class="sub">موظف → مدير مباشر → HR</div></div>
   <div class="hr-standalone-kpi"><div class="label">إجراءات وظيفية</div><div class="value">${byType('disciplinary')+byType('termination')}</div><div class="sub">إنذارات وإنهاء خدمة</div></div>
   <div class="hr-standalone-kpi"><div class="label">مكافآت</div><div class="value">${byType('reward')}</div><div class="sub">مراجعة HR ثم الإدارة العليا</div></div>
  </div>

  <div class="hr-workbar">
   <input class="search" value="${esc(hrStandaloneQuery)}" placeholder="بحث باسم الموظف أو نوع الطلب..." oninput="hrStandaloneQuery=this.value;hrRenderStandalonePage()">
   <select onchange="hrStandaloneFilter=this.value;hrRenderStandalonePage()">${hrApprovalTypeFilterOptions().map(([v,l])=>`<option value="${v}" ${v===hrStandaloneFilter?'selected':''}>${l}</option>`).join('')}</select>
   <span class="hr-workbar-note">المعروض: ${filtered.length} من ${approvals.length}</span>
  </div>

  ${filtered.length
?`<div class="hr-standalone-section-label">طلبات تحتاج قرارك</div><div class="hr-standalone-list">${filtered.map(hrApprovalCardHtml).join('')}</div>`
:`<div class="hr-empty-pro">
       <div class="icon">✓</div>
       <h3>${approvals.length?'لا يوجد نتائج مطابقة للفلترة':'لا يوجد موافقات معلقة الآن'}</h3>
       <p>${approvals.length?'غيّر البحث أو نوع الإجراء لتظهر الطلبات الأخرى.':'عندما يطلب موظف تجاوز رصيد إجازة، أو يرفع مدير طلب مكافأة أو إنذار أو إنهاء خدمة، سيظهر الطلب هنا مباشرة مع كامل مسار الموافقة.'}</p>
       <div class="examples"><span class="example">تجاوز رصيد إجازة</span><span class="example">مكافأة وظيفية</span><span class="example">إنذار ثالث</span><span class="example">إنهاء خدمة</span></div>
      </div>`}
 </div>`;}
function hrAlertType(a){if(a.icon==='🎂')return 'birthday';if(a.icon==='🏅')return 'anniversary';if(a.icon==='⏳')return 'probation';if(a.icon==='📄')return 'contract';if(a.icon==='🪪')return 'document';if(a.icon==='⚠️')return 'warning';return 'other';}
function hrAlertTypeLabel(a){return{birthday:'عيد ميلاد',anniversary:'ذكرى التوظيف',probation:'فترة تجربة',contract:'عقد',document:'وثيقة',warning:'إنذار'
}[hrAlertType(a)]||'تنبيه HR';}
function hrAlertFilterOptions(){return[['all','كل التنبيهات'],['urgent','العاجلة والقريبة'],['birthday','أعياد الميلاد'],['anniversary','ذكرى التوظيف'],['probation','فترة التجربة'],['contract','العقود'],['document','الوثائق'],['warning','الإنذارات']
];}
function hrAlertDaysText(a){const match=String(a.text||'').match(/(?:متبقي\s+)?(\d+)\s+يوم|[(](\d+)\s+يوم[)]/);const days=Number(match?.[1]||match?.[2]);if(Number.isFinite(days)&&days>=0)return{n:days,label:days===0?'اليوم':'يوم متبقي'};if(hrAlertType(a)==='birthday')return{n:'اليوم',label:'عيد الميلاد'};if(hrAlertType(a)==='anniversary')return{n:'اليوم',label:'ذكرى سنوية'};return{n:'•',label:'استحقاق'};}
function hrAlertCardHtml(a){const employee=getStaffProfileById(a.employeeId);const due=hrAlertDaysText(a);const urgent=a.level==='urgent';const type=hrAlertType(a);return `<div class="hr-alert-card-v174 ${urgent?'urgent':(type==='birthday'||type==='anniversary')?'today':''}">
  <div class="hr-alert-card-main">
   <div class="hr-alert-icon-v174">${a.icon||'🔔'}</div>
   <div class="hr-alert-card-content">
    <div class="hr-alert-card-title">
     <b>${esc(a.title)}</b>
     <span class="hr-alert-type-chip">${esc(hrAlertTypeLabel(a))}</span>
    </div>
    <div class="hr-alert-card-meta">
     ${employee?`<span>👤 ${esc(employee.name||'')}</span>`:''}
     ${employee?.department?`<span>🏢 ${esc(departmentDisplayName(employee.department))}</span>`:''}
     <span>ℹ ${esc(a.text||'')}</span>
    </div>
   </div>
   <div class="hr-alert-when">
    <div class="hr-alert-days ${urgent?'urgent':''}">${due.n}</div>
    <div class="hr-alert-days-label">${due.label}</div>
    <span class="hr-alert-severity ${urgent?'urgent':'warn'}">${urgent?'يتطلب انتباه قريب':'تنبيه HR'}</span>
   </div>
  </div>
  ${employee?`<div class="hr-approval-card-actions"><button type="button" class="btn" onclick="openStaffEmployeeForm('${employee.id}');hrHideStandalone()">فتح ملف الموظف</button></div>`:''}
 </div>`;}
function hrAlertsStandaloneHtml(){const alerts=hrBuildAlerts((state.staffProfiles||[]).slice());const q=normalizeStaffName(hrStandaloneQuery);const filtered=alerts.filter(a=>{const type=hrAlertType(a);if(hrStandaloneFilter==='urgent'&&a.level!=='urgent')return false;if(!['all','urgent'].includes(hrStandaloneFilter)&&type!==hrStandaloneFilter)return false;if(!q)return true;const employee=getStaffProfileById(a.employeeId);return normalizeStaffName(`${a.title||''} ${a.text||''} ${employee?.name||''} ${hrAlertTypeLabel(a)}`).includes(q);});const urgent=alerts.filter(a=>a.level==='urgent').length;const birthdays=alerts.filter(a=>hrAlertType(a)==='birthday').length;const docs=alerts.filter(a=>hrAlertType(a)==='document').length;const contracts=alerts.filter(a=>['contract','probation'].includes(hrAlertType(a))).length;const urgentItems=filtered.filter(a=>a.level==='urgent');const normalItems=filtered.filter(a=>a.level!=='urgent');return `<div class="hr-standalone-page">
  <div class="hr-standalone-hero">
   <div class="hr-standalone-icon">🔔</div>
   <div class="hr-standalone-title">
    <h2>تنبيهات HR والاستحقاقات</h2>
    <p>مركز المتابعة الاستباقية للموظفين. يعرض ما يحتاج انتباه الموارد البشرية الآن: أعياد الميلاد، ذكرى التوظيف، نهاية التجربة أو العقد، الوثائق التي قاربت على الانتهاء، والإنذارات التي ستنقضي صلاحيتها.</p>
   </div>
   <div class="hr-standalone-actions">
    <button type="button" class="btn" onclick="hrBackToStaff()">ملفات الموظفين</button>
    <button type="button" class="btn" onclick="hrRenderStandalonePage()">تحديث</button>
   </div>
  </div>

  <div class="hr-standalone-kpis">
   <div class="hr-standalone-kpi"><div class="label">إجمالي التنبيهات الحالية</div><div class="value">${alerts.length}</div><div class="sub">ضمن قواعد التنبيه المفعلة حالياً</div></div>
   <div class="hr-standalone-kpi"><div class="label">قريب جداً / عاجل</div><div class="value">${urgent}</div><div class="sub">تنبيهات تحتاج متابعة قريبة</div></div>
   <div class="hr-standalone-kpi"><div class="label">وثائق قاربت على الانتهاء</div><div class="value">${docs}</div><div class="sub">60 / 30 / 7 أيام حسب القرب</div></div>
   <div class="hr-standalone-kpi"><div class="label">عقود وتجربة</div><div class="value">${contracts}</div><div class="sub">${birthdays?`واليوم ${birthdays} عيد ميلاد`:'متابعة التعاقد وفترة التجربة'}</div></div>
  </div>

  <div class="hr-workbar">
   <input class="search" value="${esc(hrStandaloneQuery)}" placeholder="بحث باسم الموظف أو نوع التنبيه..." oninput="hrStandaloneQuery=this.value;hrRenderStandalonePage()">
   <select onchange="hrStandaloneFilter=this.value;hrRenderStandalonePage()">${hrAlertFilterOptions().map(([v,l])=>`<option value="${v}" ${v===hrStandaloneFilter?'selected':''}>${l}</option>`).join('')}</select>
   <span class="hr-workbar-note">المعروض: ${filtered.length} من ${alerts.length}</span>
  </div>

  ${filtered.length
?`${urgentItems.length?`<div class="hr-standalone-section-label">بحاجة لانتباه قريب</div><div class="hr-standalone-list">${urgentItems.map(hrAlertCardHtml).join('')}</div>`:''}
      ${normalItems.length?`<div class="hr-standalone-section-label">تنبيهات واستحقاقات</div><div class="hr-standalone-list">${normalItems.map(hrAlertCardHtml).join('')}</div>`:''}`
:`<div class="hr-empty-pro">
      <div class="icon">🔔</div>
      <h3>${alerts.length?'لا يوجد نتائج مطابقة للفلترة':'لا يوجد تنبيهات مستحقة حالياً'}</h3>
      <p>${alerts.length?'غيّر البحث أو نوع التنبيه لعرض باقي الاستحقاقات.':'هذا يعني أن النظام لا يرى حالياً عيد ميلاد أو ذكرى توظيف أو عقداً/تجربة/وثيقة/إنذاراً ضمن نافذة التنبيه. عندما يقترب أي استحقاق سيظهر هنا تلقائياً.'}</p>
      <div class="examples"><span class="example">عيد ميلاد</span><span class="example">ذكرى توظيف</span><span class="example">انتهاء عقد</span><span class="example">انتهاء وثيقة</span><span class="example">انقضاء إنذار</span></div>
     </div>`}
 </div>`;}
function hrRenderStandalonePage(){const box=document.getElementById('hrStandaloneContent');if(!box)return;box.innerHTML=hrStandaloneMode==='approvals'
?hrApprovalsStandaloneHtml()
:hrAlertsStandaloneHtml();hrUpdateMenuCounts();}
hrOpenHrPanel=function(kind){hrStandaloneMode=kind==='approvals'?'approvals':'alerts';hrStandaloneQuery='';hrStandaloneFilter='all';hrShowOnlyStandalone();hrRenderStandalonePage();document.getElementById('hrStandaloneContent')?.scrollIntoView({behavior:'smooth',block:'start'});};const _hrV174OpenStaffWorkflowConfig=openStaffWorkflowConfig;openStaffWorkflowConfig=function(){hrHideStandalone();return _hrV174OpenStaffWorkflowConfig();};const _hrV174OpenDepartmentTasksPage=openDepartmentTasksPage;openDepartmentTasksPage=function(app,title,containerId){if(app==='hrApp')hrHideStandalone();return _hrV174OpenDepartmentTasksPage(app,title,containerId);};let moshAiCurrentTaskId=null;let moshAiBooted=false;function moshAiNorm(v){return String(v||'').trim().replace(/\s+/g,' ').toLowerCase();}
function moshAiGetProfile(){const name=moshAiNorm(currentUserDisplayName());return(state.staffProfiles||[]).find(p=>moshAiNorm(p.name)===name)||null;}
function moshAiManagedDepartments(profile){if(!profile||!profile.id)return[];return Object.entries(state.departmentManagers||{})
.filter(([,managerId])=>String(managerId)===String(profile.id))
.map(([department])=>department);}
function moshAiCanSeeAllTasks(){return hasPermission('viewAllTasks')|| currentUser.roleId==='app_programmer';}
function moshAiVisibleTasks(){const all=(state.salesTasks||[]).filter(t=>!t.parentTaskId);if(moshAiCanSeeAllTasks())return all;const profile=moshAiGetProfile();const userName=moshAiNorm(profile?.name||currentUserDisplayName());const managed=moshAiManagedDepartments(profile);return all.filter(t=>{const assigned=moshAiNorm(t.assignee)===userName;const created=moshAiNorm(t.createdBy)===userName;const managerScope=managed.includes(t.department);return assigned||created||managerScope;});}
function moshAiGetCurrentTask(){if(moshAiCurrentTaskId!==null){const found=(state.salesTasks||[]).find(t=>String(t.id)===String(moshAiCurrentTaskId));if(found)return found;}
const edit=document.querySelector('[id^="taskEditTitle_"]');if(edit){const id=String(edit.id).replace('taskEditTitle_','');const found=(state.salesTasks||[]).find(t=>String(t.id)===id);if(found)return found;}
return null;}
function moshAiActiveViewName(){const currentTask=moshAiGetCurrentTask();if(currentTask)return `${MoshTaskUI.title(currentTask)}`;const active=document.querySelector('.view.active');if(!active)return 'النظام';const map={dashboardApp:'اللوحة الرئيسية',tasksApp:'المهمات',adminApp:'قسم الإدارة',hrApp:'الموارد البشرية',salesApp:'قسم المبيعات',marketingApp:'قسم التسويق',socialApp:'قسم السوشال ميديا',designApp:'قسم التصميم',photoApp:'قسم التصوير',editingApp:'قسم المونتاج',promotionApp:'قسم الترويج',logisticsApp:'قسم اللوجستيات',purchasesApp:'قسم المشتريات',accountingApp:'قسم المحاسبة',platformApp:'منصة MOSH GROUP',instructionsApp:'تعليمات إدارية عامة',archiveApp:'الأرشيف العام'
};return map[active.id]||'النظام';}
function moshAiRefreshContext(){const chip=document.getElementById('moshAiContextChip');const userLine=document.getElementById('moshAiUserLine');if(chip)chip.textContent=moshAiActiveViewName();if(userLine){const profile=moshAiGetProfile();const managed=moshAiManagedDepartments(profile);const role=getCurrentRole();const scope=moshAiCanSeeAllTasks()
? 'رؤية إدارية كاملة'
:managed.length
? `مدير ${managed.map(departmentDisplayName).join('، ')}`
:profile?.department
? departmentDisplayName(profile.department)
:role?.name||'حساب موظف';userLine.textContent=`${currentUserDisplayName()} · ${scope}`;}
}
function moshAiOpen(){const panel=document.getElementById('moshAiPanel');if(!panel)return;panel.classList.add('open');moshAiRefreshContext();if(!moshAiBooted){moshAiBooted=true;moshAiAddAssistant(moshAiWelcomeText());}
setTimeout(()=>document.getElementById('moshAiInput')?.focus(),80);}
function moshAiClose(){document.getElementById('moshAiPanel')?.classList.remove('open');}
function moshAiToggle(){const panel=document.getElementById('moshAiPanel');if(!panel)return;panel.classList.contains('open')?moshAiClose():moshAiOpen();}
function moshAiEscapeText(value){return String(value??'').replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));}
function moshAiAddMessage(text,type='assistant',html=false){const box=document.getElementById('moshAiMessages');if(!box)return;const row=document.createElement('div');row.className=`mosh-ai-message ${type}`;const bubble=document.createElement('div');bubble.className='mosh-ai-bubble';if(html)bubble.innerHTML=text;else bubble.textContent=text;row.appendChild(bubble);box.appendChild(row);box.scrollTop=box.scrollHeight;}
function moshAiAddAssistant(text,html=false){moshAiAddMessage(text,'assistant',html)}
function moshAiAddUser(text){moshAiAddMessage(text,'user',false)}
function moshAiWelcomeText(){const tasks=moshAiVisibleTasks();const open=tasks.filter(t=>t.status==='in_progress').length;const profile=moshAiGetProfile();const managed=moshAiManagedDepartments(profile);let scope='';if(moshAiCanSeeAllTasks())scope='يمكنني الاطلاع على سياق العمل المتاح لحسابك على مستوى النظام.';else if(managed.length)scope=`يمكنني الاطلاع على مهامك ومهام الأقسام التي تديرها: ${managed.map(departmentDisplayName).join('، ')}.`;else scope='يمكنني الاطلاع على المهام المرتبطة بحسابك فقط.';return `أهلاً ${currentUserDisplayName()} 👋\nأنا سكرتيرك التنفيذي داخل MOSH ERP.\n${scope}\nلديك حالياً ${open} مهمة مفتوحة ضمن نطاقك.\n\nجرّب أن تسألني: «ما مهامي اليوم؟» أو «رتّب أولوياتي».`;}
function moshAiTodayIso(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function moshAiDateValue(v){if(!v)return null;const d=new Date(String(v).slice(0,10)+'T12:00:00');return Number.isNaN(d.getTime())?null:d;}
function moshAiIsOverdue(t){if(!t.dueDate || !['in_progress'].includes(t.status))return false;const due=moshAiDateValue(t.dueDate);if(!due)return false;const today=moshAiDateValue(moshAiTodayIso());return due<today;}
function moshAiTaskStateLabel(t){if(t.status==='awaiting_invoice')return 'بانتظار الفوترة';if(t.status==='invoiced')return 'تمت الفوترة';if(t.employeeState==='submitted')return 'بانتظار مراجعة المدير';if(t.employeeState==='received')return 'تم استلام المهمة';if(t.employeeState==='paused')return t.returnedForRevision?'متوقفة مؤقتاً — للتعديل':'إيقاف مؤقت';if(t.employeeState==='working')return 'جارٍ العمل';if(t.assignee)return 'بانتظار الاستلام';return 'بحاجة للتوزيع';}
function moshAiTaskLine(t){const due=t.dueDate?` · ${t.dueDate}`:'';const dept=t.department?` · ${departmentDisplayName(t.department)}`:'';return `• ${MoshTaskUI.title(t)}${dept}${due} — ${moshAiTaskStateLabel(t)}`;}
function moshAiDailySummary(){const tasks=moshAiVisibleTasks();const open=tasks.filter(t=>t.status==='in_progress');const overdue=open.filter(moshAiIsOverdue);const review=open.filter(t=>t.employeeState==='submitted');const revision=open.filter(t=>t.employeeState==='revision');const unassigned=open.filter(t=>!String(t.assignee||'').trim());const support=(state.supportRequests||[]).filter(r=>['new','in_progress'].includes(r.status));const candidates=[...overdue,...revision,...review,...unassigned,...open]
.filter((t,i,a)=>a.findIndex(x=>String(x.id)===String(t.id))===i)
.slice(0,5);return `<b>ملخصك التنفيذي الآن</b>
<br>• المهام المفتوحة ضمن صلاحياتك: <b>${open.length}</b>
<br>• المتأخرة: <b>${overdue.length}</b>
<br>• بانتظار مراجعة مدير: <b>${review.length}</b>
<br>• مُعادة للتعديل: <b>${revision.length}</b>
<br>• غير موزعة: <b>${unassigned.length}</b>
${moshAiCanSeeAllTasks()?`<br>• طلبات شراء/لوجستيات المفتوحة بالنظام: <b>${support.length}</b>`:''}
${candidates.length?`<br><br><b>أقترح البدء بهذه المهام:</b><br>${candidates.map(t=>moshAiEscapeText(moshAiTaskLine(t))).join('<br>')}`:'<br><br>لا توجد مهام مفتوحة حالياً ضمن نطاق صلاحياتك.'}`;}
function moshAiPrioritySummary(){const tasks=moshAiVisibleTasks().filter(t=>t.status==='in_progress');const today=moshAiDateValue(moshAiTodayIso());const score=t=>{let s=0;if(moshAiIsOverdue(t))s+=100;if(t.employeeState==='revision')s+=70;if(t.employeeState==='submitted')s+=55;if(!String(t.assignee||'').trim())s+=45;const due=moshAiDateValue(t.dueDate);if(due&&today){const days=Math.round((due-today)/86400000);if(days>=0&&days<=2)s+=35-days*5;}
if(t.priority==='urgent')s+=50;if(t.priority==='high')s+=25;return s;};const sorted=tasks.slice().sort((a,b)=>score(b)-score(a)).slice(0,6);if(!sorted.length)return 'لا توجد مهام مفتوحة حالياً ضمن نطاق صلاحياتك.';return `<b>ترتيب الأولويات المقترح</b><br>${sorted.map((t,i)=>`${i+1}. ${moshAiEscapeText(moshAiTaskLine(t))}`).join('<br>')}`;}
function moshAiOverdueSummary(){const overdue=moshAiVisibleTasks().filter(moshAiIsOverdue)
.sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')));if(!overdue.length)return 'لا توجد لديك مهام متأخرة ضمن نطاق صلاحياتك حالياً.';return `<b>المهام المتأخرة (${overdue.length})</b><br>${overdue.slice(0,10).map(t=>moshAiEscapeText(moshAiTaskLine(t))).join('<br>')}`;}
function moshAiBillingSummary(){const tasks=moshAiVisibleTasks().filter(t=>t.status==='awaiting_invoice');if(!tasks.length)return 'لا توجد مهام بانتظار الفوترة ضمن نطاق صلاحياتك حالياً.';return `<b>بانتظار الفوترة (${tasks.length})</b><br>${tasks.slice(0,10).map(t=>moshAiEscapeText(moshAiTaskLine(t))).join('<br>')}`;}
function moshAiTaskSummary(){const t=moshAiGetCurrentTask();if(!t)return 'لا توجد مهمة مفتوحة حالياً. افتح مهمة ثم اطلب «لخّص المهمة الحالية».';const chat=Array.isArray(t.workChat)?t.workChat:[];const hist=Array.isArray(t.history)?t.history:[];const sub=(state.salesTasks||[]).filter(x=>String(x.parentTaskId)===String(t.id));const requests=(state.supportRequests||[]).filter(r=>String(r.taskId)===String(t.id));const lastChat=chat.slice(-2).map(x=>x.text||'').filter(Boolean);return `<b>${moshAiEscapeText(MoshTaskUI.title(t))}</b>
<br>العميل: ${moshAiEscapeText(t.customer||'—')}
<br>القسم: ${moshAiEscapeText(departmentDisplayName(t.department)||t.department||'—')}
<br>المسؤول: ${moshAiEscapeText(t.assignee||'غير موزع')}
<br>الحالة: ${moshAiEscapeText(moshAiTaskStateLabel(t))}
<br>الموعد: ${moshAiEscapeText(t.dueDate||'غير محدد')}
${t.description?`<br><br><b>المطلوب:</b> ${moshAiEscapeText(t.description)}`:''}
<br><br>مهام فرعية: <b>${sub.length}</b> · طلبات مساندة: <b>${requests.length}</b> · أحداث بالسجل: <b>${hist.length}</b>
${lastChat.length?`<br><br><b>آخر ما ورد في المحادثة:</b><br>${lastChat.map(x=>'• '+moshAiEscapeText(x)).join('<br>')}`:''}
<div class="mosh-ai-action-row">
 <button class="mosh-ai-inline-action" onclick="moshAiOpenTaskFromAssistant('${String(t.id)}')">فتح المهمة</button>
 <button class="mosh-ai-inline-action" onclick="moshAiPurchaseForCurrent()">طلب شراء</button>
 <button class="mosh-ai-inline-action" onclick="moshAiLogisticsForCurrent()">طلب لوجستي</button>
</div>`;}
function moshAiTeamSummary(){const profile=moshAiGetProfile();let departments=moshAiManagedDepartments(profile);if(moshAiCanSeeAllTasks()){departments=[...new Set((state.salesTasks||[]).map(t=>t.department).filter(Boolean))];}
if(!departments.length)return 'لا يرتبط حسابك الحالي بفريق إداري مباشر وفق إعدادات مديري الأقسام. يمكنني عرض حالة مهامك الشخصية بدلاً من ذلك.';const tasks=moshAiVisibleTasks().filter(t=>t.status==='in_progress'&&departments.includes(t.department));const byPerson={};tasks.forEach(t=>{const who=String(t.assignee||'غير موزع').trim()||'غير موزع';byPerson[who]=byPerson[who]||{total:0,working:0,review:0,revision:0};byPerson[who].total++;if(t.employeeState==='working')byPerson[who].working++;if(t.employeeState==='submitted')byPerson[who].review++;if(t.employeeState==='revision')byPerson[who].revision++;});const rows=Object.entries(byPerson).sort((a,b)=>b[1].total-a[1].total).slice(0,10);if(!rows.length)return 'لا توجد مهام جارية للفريق ضمن نطاق صلاحياتك حالياً.';return `<b>وضع الفريق</b><br>${rows.map(([name,s])=>`• ${moshAiEscapeText(name)}: <b>${s.total}</b> مهمة · عمل ${s.working} · مراجعة ${s.review} · تعديل ${s.revision}`).join('<br>')}`;}
function moshAiOpenTaskFromAssistant(id){const task=(state.salesTasks||[]).find(t=>String(t.id)===String(id));if(!task)return;moshAiCurrentTaskId=String(id);goApp('tasks',null);activeTaskViewContext={source:'all',containerId:'allTasksContainer',department:''};openTaskDetails(task.id);moshAiRefreshContext();}
function moshAiPurchaseForCurrent(){const t=moshAiGetCurrentTask();if(!t){moshAiAddAssistant('افتح مهمة أولاً لربط طلب الشراء بها.');return}
openSupportRequestModal(t.id,'purchase');}
function moshAiLogisticsForCurrent(){const t=moshAiGetCurrentTask();if(!t){moshAiAddAssistant('افتح مهمة أولاً لربط الطلب اللوجستي بها.');return}
openSupportRequestModal(t.id,'logistics');}
function moshAiGenerateLocalReply(prompt){const q=moshAiNorm(prompt);if(/(شو عندي|اليوم|daily|today|ملخص يومي)/.test(q))return{text:moshAiDailySummary(),html:true};if(/(اولويات|أولويات|رتب|priority)/.test(q))return{text:moshAiPrioritySummary(),html:true};if(/(متأخر|متاخر|overdue)/.test(q))return{text:moshAiOverdueSummary(),html:true};if(/(لخص|ملخص المهمة|summary|المهمة الحالية)/.test(q))return{text:moshAiTaskSummary(),html:true};if(/(فريق|ضغط|team|مين عليه)/.test(q))return{text:moshAiTeamSummary(),html:true};if(/(فوتر|فوترة|محاسب|invoice)/.test(q))return{text:moshAiBillingSummary(),html:true};if(/(انشئ|أنشئ|اعمل|افتح).*(مهمة جديدة|تاسك جديد|تاسك|مهمة)/.test(q)){setTimeout(()=>openStandaloneTaskModal(),180);return{text:'تم فتح نموذج إنشاء مهمة جديدة. أدخل التفاصيل للمتابعة ضمن سير العمل المعتمد.',html:false};}
if(/(طلب شراء|شراء)/.test(q)){const t=moshAiGetCurrentTask();if(!t)return{text:'افتح المهمة المطلوبة أولاً، ثم اطلب «إنشاء طلب شراء» لربطه بها.',html:false};setTimeout(()=>moshAiPurchaseForCurrent(),180);return{text:`سأفتح طلب شراء مرتبطاً بالمهمة ${MoshTaskUI.title(t)} مع إبقاء المهمة في قسمها الحالي.`,html:false};}
if(/(لوجست|سائق|سيارة|توصيل)/.test(q)){const t=moshAiGetCurrentTask();if(!t)return{text:'افتح المهمة أولاً لتحديد المهمة التي سيُربط بها الطلب اللوجستي.',html:false};setTimeout(()=>moshAiLogisticsForCurrent(),180);return{text:`سأفتح طلباً لوجستياً مرتبطاً بالمهمة ${MoshTaskUI.title(t)}.`,html:false};}
return{text:`أعمل حالياً ضمن نسخة العرض المحلية، ويمكنني التعامل مع بيانات MOSH وسير العمل في التطبيق. تتطلب المحادثة المفتوحة بالذكاء الاصطناعي خادماً خلفياً آمناً.\n\nجرّب: «ما مهامي اليوم؟»، «رتّب أولوياتي»، «ما المهام المتأخرة؟»، «لخّص المهمة الحالية»، «ما حالة الفريق؟»، أو «افتح مهمة جديدة».`,html:false
};}
function moshAiAsk(text){moshAiOpen();const input=document.getElementById('moshAiInput');if(input)input.value=text;moshAiSend();}
function moshAiSend(){const input=document.getElementById('moshAiInput');const text=String(input?.value||'').trim();if(!text)return;moshAiAddUser(text);input.value='';const typing=document.createElement('div');typing.className='mosh-ai-message assistant';typing.id='moshAiTyping';typing.innerHTML='<div class="mosh-ai-bubble" style="color:#777">جارٍ مراجعة بياناتك…</div>';document.getElementById('moshAiMessages')?.appendChild(typing);const reply=moshAiGenerateLocalReply(text);setTimeout(()=>{document.getElementById('moshAiTyping')?.remove();moshAiAddAssistant(reply.text,!!reply.html);},260);}
function moshAiInputKey(event){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();moshAiSend();}
}
const _moshAiOriginalGoApp=goApp;goApp=function(app,link,addHistory=true){moshAiCurrentTaskId=null;const result=_moshAiOriginalGoApp(app,link,addHistory);moshAiRefreshContext();return result;};const _moshAiOriginalOpenTaskDetails=openTaskDetails;openTaskDetails=function(id){moshAiCurrentTaskId=String(id);const result=_moshAiOriginalOpenTaskDetails(id);moshAiRefreshContext();return result;};applySystemSettings();applyCurrentUserUI();initSidebarState();normalizeLegacyPackageSubTasks();normalizeLegacyBillingArchiveTasks();goMainMenu();setInterval(refreshVisibleTaskWorkTimers,1000);
