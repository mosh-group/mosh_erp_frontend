/* MOSH R33 — section entry lifecycle. No business writes or permission overrides. */
(function(){
'use strict';
if(window.MoshNavigation33)return;
let epoch=0,depth=0;
const owner=()=>String(window.MoshApi?.user?.id||'');
const active=()=>document.querySelector('.view.active')?.id.replace(/App$/,'')||'';
const previous=window.goApp;
if(typeof previous==='function')window.goApp=function(app,...args){
 const outer=depth++===0;let result;
 try{result=previous.call(this,app,...args);}finally{depth--;}
 if(outer&&result!==false&&active()===app){
  const detail={app,epoch:++epoch,owner:owner()};
  document.dispatchEvent(new CustomEvent('mosh:section-enter',{detail}));
 }
 return result;
};
for(const name of ['mosh:logout-complete','mosh:session-expired'])document.addEventListener(name,()=>{epoch++;});
window.MoshNavigation33={version:'33',snapshot:()=>({app:active(),epoch,owner:owner()}),
 isCurrent:s=>!!s&&s.epoch===epoch&&s.app===active()&&s.owner===owner()};
})();
