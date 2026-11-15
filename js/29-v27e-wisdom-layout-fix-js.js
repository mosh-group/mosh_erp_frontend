(function(){
 'use strict';
 function placeWisdom(){
   const nav=document.getElementById('hrProNav');
   const tab=document.getElementById('hrWisdomTab');
   const comm=document.getElementById('hrCommunicationsTab');
   const host=document.getElementById('hrWisdomContent');
   const main=document.getElementById('hrProContent');
   if(nav&&tab&&comm&&tab.previousElementSibling!==comm){comm.insertAdjacentElement('afterend',tab);}
   if(host&&main&&host.parentElement!==main.parentElement){main.insertAdjacentElement('afterend',host);}
 }
 function run(){placeWisdom();setTimeout(placeWisdom,120);setTimeout(placeWisdom,600);setTimeout(placeWisdom,1400);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 const hr=document.getElementById('hrApp');
 if(hr){let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(placeWisdom,40)}).observe(hr,{childList:true,subtree:true});}
 document.addEventListener('click',e=>{if(e.target.closest('#hrWisdomTab'))setTimeout(placeWisdom,0)},true);
})();
