(function(){function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function reports(){return state.executiveReports||[];}
function setActive(btn){var nav=document.getElementById('adminStaticNavV2161');if(!nav)return;nav.querySelectorAll('button').forEach(function(b){b.classList.remove('active')});if(btn)btn.classList.add('active');}
function render(){var host=document.getElementById('adminExecReportsStep2');if(!host)return;var rows=reports();var body=rows.length ? rows.map(function(r){return '<div class="card" style="margin-bottom:10px">'+
'<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">'+
'<div><b>'+esc(r.title||'تقرير تنفيذي')+'</b><div class="muted" style="margin-top:5px">'+esc(r.department||'—')+' · '+esc(r.createdAt||'—')+'</div></div>'+
'<span class="badge">'+esc(r.priority||'للاطلاع')+'</span>'+
'</div>'+
(r.summary?'<div style="margin-top:10px">'+esc(r.summary)+'</div>':'')+
'</div>';}).join(''):'<div class="card" style="padding:28px;text-align:center"><b>لا توجد تقارير تنفيذية حالياً</b><div class="muted" style="margin-top:8px">بالخطوة التالية منربط زر إرسال التقرير بالأقسام.</div></div>';host.innerHTML='<div class="toolbar"><div class="toolbar-left"><h2 style="margin:0">التقارير التنفيذية</h2></div><div class="toolbar-right"><span class="muted">مركز تقارير مدراء الأقسام للمدير التنفيذي</span></div></div>'+body;}
window.openExecReportsStep2=function(btn){var a=document.getElementById('adminAppContent');if(a)a.style.display='none';var w=document.getElementById('adminWorkProofContent');if(w)w.style.display='none';var h=document.getElementById('adminExecReportsStep2');if(h)h.style.display='block';setActive(btn);render();};})();
