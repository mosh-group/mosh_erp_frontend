/* MOSH R39 — one customer form, two entry points. Marketing reuses Sales form and save logic. */
(function(){
 'use strict';
 if(window.MoshMarketingCustomer25)return;
 const $=(s,root=document)=>root?.querySelector(s);
 const canCreate=()=>!!window.MoshAuth37?.can?.('createCustomers');
 let openModal=null,observer=null,observed=null,stashedSales=null;
 function stashSalesForm(){const host=$('#salesDynamic');if(!host?.querySelector('#newCustomerName'))return;const fragment=document.createDocumentFragment();while(host.firstChild)fragment.append(host.firstChild);stashedSales={host,fragment};}
 function restoreSalesForm(){if(!stashedSales)return;const {host,fragment}=stashedSales;stashedSales=null;if(host.isConnected&&!host.firstChild)host.append(fragment);}
 function close(force=false){
  const modal=$('#r39MarketingCustomerModal');if(!modal)return;
  if(!force){const dirty=[...modal.querySelectorAll('input,textarea')].some(e=>e.value.trim()&&!(e.id==='newCustomerCountry'&&e.value==='سوريا'));
   if(dirty&&!confirm('توجد تعديلات على بيانات العميل لم تُحفظ. هل تريد الخروج دون حفظها؟'))return;}
  modal.remove();openModal=null;restoreSalesForm();
 }
 function open(){
  if(!canCreate()){alert('حسابك ما عنده صلاحية إضافة العملاء.');return;}
  if(typeof window.renderNewCustomerForm!=='function'){
   alert('نموذج المبيعات غير متاح. أعد تحميل التطبيق.');return;
  }
  if($('#r39MarketingCustomerModal'))return;
  stashSalesForm();
  const overlay=document.createElement('div');overlay.id='r39MarketingCustomerModal';overlay.className='r39-customer-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','إضافة عميل جديد');
  overlay.innerHTML='<div class="r39-customer-card" dir="rtl"><header class="r39-customer-header"><b>إضافة عميل جديد — النموذج الموحد</b><button type="button" class="btn" data-r39-close aria-label="إغلاق">إغلاق</button></header><div class="r39-customer-form"></div></div>';
  document.body.append(overlay);openModal=overlay;
  window.renderNewCustomerForm($('.r39-customer-form',overlay));
  $('[data-r39-close]',overlay).addEventListener('click',()=>close());
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  overlay.addEventListener('click',e=>{
   const b=e.target.closest?.('.customer-form-actions .btn:not(.primary)');
   if(b){e.preventDefault();e.stopPropagation();close();}
  },true);
 }
 function inject(){
  const root=$('#marketingExecV33'),main=$('#marketingExecContentV33');
  if(!root?.classList.contains('mk33-show')||!main)return;
  const view=window.MoshMarketingV33?.inspect?.().view;
  if(view!=='dashboard')return;
  const actions=$('.mk33-head .mk33-actions',main);
  if(!actions)return;
  let b=$('#r25MarketingAddCustomer',main);
  if(!canCreate()){b?.remove();return;}
  if(!b){b=document.createElement('button');b.id='r25MarketingAddCustomer';b.type='button';b.className='mk33-btn';b.textContent='+ إضافة عميل جديد';b.title='نفس نموذج إضافة العملاء الموجود في قسم المبيعات';b.addEventListener('click',open);actions.prepend(b);}
 }
 function watch(){
  const main=$('#marketingExecContentV33');if(main&&main!==observed){observer?.disconnect();observed=main;observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'))inject();});observer.observe(main,{subtree:true,childList:true});}
  inject();
 }
 window.MoshMarketingCustomer25={open,close,inject,restoreSales:restoreSalesForm,version:'R39'};
 document.addEventListener('mosh:refreshed',watch);
 document.addEventListener('mosh:section-enter',watch);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
