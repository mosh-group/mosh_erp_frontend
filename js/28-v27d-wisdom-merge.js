(function(){
 'use strict';
 const NEWKEY='mosh_hr_wisdom_v26';
 function txt(v){return String(v==null?'':v).trim()}
 function uniq(a){const s=new Set();return a.filter(x=>{x=txt(x);if(!x||s.has(x))return false;s.add(x);return true})}
 function extract(v,out){
   if(typeof v==='string'){const t=txt(v);if(t.length>=6&&t.length<=700)out.push(t);return}
   if(Array.isArray(v)){v.forEach(x=>extract(x,out));return}
   if(v&&typeof v==='object'){
     ['text','quote','wisdom','title','message'].forEach(k=>{if(typeof v[k]==='string')extract(v[k],out)});
     ['items','quotes','wisdoms','list','data'].forEach(k=>{if(v[k]!=null)extract(v[k],out)});
   }
 }
 function collectWisdomContainers(v,out,depth){
   depth=depth||0;if(depth>8||v==null)return;
   if(Array.isArray(v)){v.forEach(x=>collectWisdomContainers(x,out,depth+1));return}
   if(typeof v!=='object')return;
   Object.keys(v).forEach(k=>{
     const val=v[k];
     if(/wisdom|quote|حكم/i.test(k))extract(val,out);
     else if(val&&typeof val==='object'&&depth<5)collectWisdomContainers(val,out,depth+1);
   });
 }
 function migrate(){ /* Legacy demo wisdom is replaced by Laravel records. */ }
 function dedupeMenu(){
   const nav=document.getElementById('hrProNav');if(!nav)return;
   const wisdomButtons=[...nav.querySelectorAll('button')].filter(b=>/حكمة|الحكمة/.test(txt(b.textContent)));
   let keep=document.getElementById('hrWisdomTab')||wisdomButtons[wisdomButtons.length-1];
   wisdomButtons.forEach(b=>{if(b!==keep)b.remove()});
   if(keep){keep.id='hrWisdomTab';keep.title='إدارة الحكمة اليومية';}
 }
 function run(){migrate();dedupeMenu();setTimeout(dedupeMenu,150);setTimeout(dedupeMenu,900);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 const obs=new MutationObserver(()=>dedupeMenu());
 setTimeout(()=>{const nav=document.getElementById('hrProNav');if(nav)obs.observe(nav,{childList:true,subtree:false})},1000);
})();
