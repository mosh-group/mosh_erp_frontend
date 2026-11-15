(function(){'use strict';
 function label(a){var n=a&&a.querySelector('.nav-label');return n?String(n.textContent||'').trim():'';}
 function appKey(a){var m=(a&&a.getAttribute('onclick')||'').match(/goApp\(\s*['"]([^'"]+)['"]/);return m?m[1]:({"منصة MOSH MEDIA":"platform","المستودعات العامة":"warehouses","الأرشيف العام":"archive","تعليمات إدارية عامة":"instructions"})[label(a)]||'';}
 function nextAnchor(el){var n=el&&el.nextElementSibling;while(n&&n.tagName!=='A')n=n.nextElementSibling;return n;}
 function apply(){
  var nav=document.querySelector('.sidebar .nav')||document.querySelector('aside .nav');if(!nav)return;
  var anchors=Array.from(nav.querySelectorAll(':scope > a'));
  anchors.forEach(function(a){if(label(a)==='منصة MOSH GROUP'){var l=a.querySelector('.nav-label');if(l)l.textContent='منصة MOSH MEDIA';a.title='منصة MOSH MEDIA';}});
  anchors=Array.from(nav.querySelectorAll(':scope > a'));
  var wanted=['promotion','it','logistics','purchases','accounting','platform','warehouses','archive','instructions'];
  var map=new Map(anchors.map(function(a){return [appKey(a),a]}));
  var cursor=map.get(wanted[0]);if(!cursor)return;
  for(var i=1;i<wanted.length;i++){
   var a=map.get(wanted[i]);if(!a)continue;
   if(nextAnchor(cursor)!==a)cursor.after(a);
   cursor=a;
  }
 }
 function boot(){var nav=document.querySelector('.sidebar .nav')||document.querySelector('aside .nav');if(!nav)return;apply();new MutationObserver(function(){apply()}).observe(nav,{childList:true,subtree:true});setTimeout(apply,250);setTimeout(apply,1000);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
