// Real permission functions with an isolated DOM and API snapshot; no network/database.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/43-mosh-auth-v37-js.js'),'utf8');
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return source.slice(a,b);}
class Element{
 constructor(text='',onclick=''){this.textContent=text;this.attrs=new Map();this.classes=new Set();this.hidden=false;this.values={};this.priorities={};if(onclick)this.attrs.set('onclick',onclick);this.style={getPropertyValue:k=>this.values[k]||'',getPropertyPriority:k=>this.priorities[k]||'',setProperty:(k,v,p)=>{this.values[k]=v;this.priorities[k]=p;},removeProperty:k=>{delete this.values[k];delete this.priorities[k];}};this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k),contains:k=>this.classes.has(k)};}
 hasAttribute(k){return this.attrs.has(k);}getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}removeAttribute(k){this.attrs.delete(k);}
 closest(selector){return selector==='button,a,[role="button"],[onclick]'?this:null;}matches(){return false;}
}
function fixture({tabs=false,sourceCode=source}={}){
 const context=vm.createContext({});
 vm.runInContext(between('const APPS=','const GLOBAL_HELP='),context);
 const apps=vm.runInContext('APPS.map(([app])=>app)',context),actions=vm.runInContext('ACTIONS.map(([action])=>action)',context);
 const modules=Object.fromEntries(apps.map(app=>[app,Object.fromEntries(actions.map(action=>[action,['marketing','tasks'].includes(app)||app==='social'&&['view','approvals','reports'].includes(action)]))]));
 const user={id:'restricted-manager',roleId:'role_manager',department:'التسويق',active:true,moduleOverrides:modules,globalOverrides:{},taskScope:'department'};
 const role={id:'role_manager',scope:'department',scopeActions:Object.fromEntries(actions.map(a=>[a,true])),modules:{},globals:{}};
 const links=Object.fromEntries(apps.map(app=>[app,new Element(app,`goApp('${app}',this)`)])),trees=Object.fromEntries(apps.map(app=>[app,new Element()]));
 const ids=new Map(),controls=new Map(),listeners=new Map(),events=[],toasts=[];
 for(const app of apps){ids.set('#ui09-tree-'+app,trees[app]);if(tabs){ids.set('#'+app+'App',new Element());for(const mode of ['distribution','running','assign'])controls.set('#m15Tabs_'+app+' [data-mode="'+mode+'"]',[new Element(),new Element()]);}}
 const extraLinks=[new Element('لوحة التحكم','goApp( "sales", this)'),new Element('قائمة القسم',"goApp('hr',this)")];
 function select(selector){
  if(selector==='[onclick]')return [...Object.values(links),...extraLinks];
  if(selector==='#appSidebar [onclick]')return Object.values(links);
  if(controls.has(selector))return controls.get(selector);
  const legacy=selector.match(/goApp\('\s*([a-z]+)'/);if(selector.startsWith('[onclick*=')&&legacy)return [...Object.values(links),...extraLinks].filter(el=>el.getAttribute('onclick').includes("goApp('"+legacy[1]+"'"));
  return [];
 }
 Object.assign(context,{activeUser:user,MoshApi:{user,auth:{roles:[role]}},ROOT_ROLE:'app_programmer',state:{staffProfiles:[],departmentManagers:{}},norm:v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' '),clean:v=>String(v??'').trim(),loadDb:()=>context.MoshApi.auth,
  $:selector=>ids.get(selector)||select(selector)[0]||null,$$:select,registerCoreRole(){},updateIdentity(){},currentApp:()=>'',setTimeout(){},safeToast:message=>toasts.push(message),
  document:{addEventListener:(name,fn)=>listeners.set(name,fn),dispatchEvent:event=>{events.push(event.type);listeners.get(event.type)?.(event);}},CustomEvent:class{constructor(type){this.type=type;}}
 });
 vm.runInContext(between('function roleOf(','function taskScopeOf('),context);
 const start=sourceCode.indexOf('function semanticAction('),end=sourceCode.indexOf('function startObserver(',start);
 vm.runInContext(sourceCode.slice(start,end),context);
 if(sourceCode.includes("document.addEventListener('mosh:refreshed',refreshPermissions);"))vm.runInContext("document.addEventListener('mosh:refreshed',refreshPermissions);",context);
 return {context,user,links,trees,controls,extraLinks,events,toasts,refresh(){context.document.dispatchEvent(new context.CustomEvent('mosh:refreshed'));}};
}
test('permission pass completes with missing task tab groups and hides every denied department',()=>{
 const f=fixture();assert.doesNotThrow(()=>f.context.applyPermissions());
 for(const [app,link]of Object.entries(f.links)){assert.equal(link.classList.contains('mosh-auth-hidden'),!['dashboard','tasks','marketing','social'].includes(app),app);if(!['dashboard','tasks','marketing','social'].includes(app))assert.equal(f.trees[app].hidden,true,app+' tree');}
});
test('all task tabs, including multiple matching nodes, obey saved action permissions',()=>{
 const f=fixture({tabs:true});f.context.applyPermissions();
 for(const app of ['marketing','social','hr'])for(const [mode,action]of [['distribution','dashboard'],['running','running'],['assign','assign']])for(const tab of f.controls.get('#m15Tabs_'+app+' [data-mode="'+mode+'"]'))assert.equal(tab.classList.contains('mosh-auth-hidden'),!f.user.moduleOverrides[app][action],app+'/'+mode);
});
test('refresh replaces stale account permissions and closes previously visible department trees',()=>{
 const f=fixture();f.context.activeUser={...f.user,moduleOverrides:{...f.user.moduleOverrides,hr:{view:true}}};f.context.applyPermissions();assert.equal(f.links.hr.classList.contains('mosh-auth-hidden'),false);
 f.refresh();assert.equal(f.links.hr.classList.contains('mosh-auth-hidden'),true);assert.equal(f.trees.hr.hidden,true);assert.ok(f.events.includes('mosh:permissions-applied'));
});
test('navigation target is checked independently of its text and quote style',()=>{
 const f=fixture();f.context.applyPermissions();for(const link of f.extraLinks)assert.equal(link.classList.contains('mosh-auth-hidden'),true);
 const link=f.extraLinks[0];link.classList.add('r35-ui-navigation');let blocked=0;
 f.context.blockUnauthorizedClick({target:link,preventDefault(){blocked++;},stopImmediatePropagation(){blocked++;}});assert.equal(blocked,2);assert.equal(f.toasts.length,1);
});
test('root account retains access and a subsequently denied account cannot reuse its visible links',()=>{
 const f=fixture();const root={id:f.user.id,roleId:'app_programmer',isRoot:true,active:true};f.context.activeUser=root;f.context.MoshApi.user=root;f.context.applyPermissions();for(const link of Object.values(f.links))assert.equal(link.classList.contains('mosh-auth-hidden'),false);
 f.context.MoshApi.user=f.user;f.refresh();assert.equal(f.links.marketing.classList.contains('mosh-auth-hidden'),false);assert.equal(f.links.social.classList.contains('mosh-auth-hidden'),false);assert.equal(f.links.sales.classList.contains('mosh-auth-hidden'),true);
});
test('permission refresh cannot adopt another account identity',()=>{
 const f=fixture();f.context.MoshApi.user={id:'another-account',roleId:'app_programmer',active:true};f.refresh();assert.equal(f.context.activeUser.id,f.user.id);assert.equal(f.context.modulePerm('sales','view'),false);
});
test('regression fixture reproduces the former single-element forEach crash',()=>{
 const old=source.replaceAll("$$('#m15Tabs_'+app+' [data-mode=\"running\"]')","$('#m15Tabs_'+app+' [data-mode=\"running\"]')").replaceAll("$$('#m15Tabs_'+app+' [data-mode=\"assign\"]')","$('#m15Tabs_'+app+' [data-mode=\"assign\"]')");
 assert.notEqual(old,source);const f=fixture({sourceCode:old});assert.throws(()=>f.context.applyPermissions(),/forEach/);
});
