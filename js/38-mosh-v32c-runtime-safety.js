(function(){
 'use strict';
 const oldWhatsApp=window.sendPreviewWhatsApp;
 if(typeof oldWhatsApp==='function'&&!oldWhatsApp.__v32cSafe){
   const safe=function(){
     try{
       const q=typeof window.getQ==='function'?window.getQ():null;
       if(!q){if(typeof window.alert==='function')window.alert('افتح عرض السعر أو المعاينة أولاً.');return false;}
       return oldWhatsApp.apply(this,arguments);
     }catch(err){
       console.error('MOSH WhatsApp preview:',err);
       if(typeof window.alert==='function')window.alert('تعذر تجهيز رسالة واتساب. افتح عرض السعر ثم حاول مجدداً.');
       return false;
     }
   };
   safe.__v32cSafe=true;window.sendPreviewWhatsApp=safe;
 }
})();
