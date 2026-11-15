/* MOSH v17 - read-only handbook. No business state, permissions or storage changes. */
(function(){
 'use strict';
 const root=document.getElementById('handbook17'); if(!root)return;
 const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/\s+/g,' ').trim();
 const topics=qa('[data-hb-topic]'),search=q('#hb17Search'),index=q('#hb17Index');
 const searchable=topics.map(t=>({id:t.dataset.hbTopic,title:t.dataset.title,pages:t.dataset.pages,code:t.dataset.code,text:t.textContent,keys:t.dataset.keywords,blocks:Array.from(t.querySelectorAll('.hb17-block')).map(d=>({id:d.id,title:d.querySelector('summary').textContent,text:d.textContent,body:d.querySelector('.hb17-block-body').textContent}))}));
 let current='overview',lastQuery='',pending=null;
 const bar=document.querySelector('.topbar');function offset(){const n=(bar?.getBoundingClientRect().height||90)+18;root.style.setProperty('--hb17-offset',n+'px');}offset();if(bar&&typeof ResizeObserver!=='undefined')new ResizeObserver(offset).observe(bar);
 const printRoot=document.createElement('div');printRoot.id='hb17PrintRoot';printRoot.setAttribute('aria-hidden','true');document.body.append(printRoot);
 function selected(view){qa('[data-hb-go]').forEach(b=>{if(b.classList.contains('hb17-nav')){if(b.dataset.hbGo===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}});}
 function clearHighlights(){qa('mark[data-hb-mark]').forEach(m=>m.replaceWith(document.createTextNode(m.textContent)));}
 function highlight(el,term){if(!term||term.length<2)return;const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){if(node.parentElement?.closest('button,script,style'))continue;const s=node.textContent,pos=s.toLowerCase().indexOf(term.toLowerCase());if(pos<0)continue;const m=document.createElement('mark');m.dataset.hbMark='1';m.textContent=s.slice(pos,pos+term.length);const tail=node.splitText(pos);tail.splitText(term.length);tail.replaceWith(m);}}
 function show(view,blockId='',fromSearch=false,scroll=true){
  offset();
  if(view!=='overview'&&view!=='notes'&&!topics.some(t=>t.dataset.hbTopic===view))view='overview';
  if(!fromSearch){search.value='';lastQuery='';q('#hb17Clear').hidden=true;}
  clearTimeout(pending);clearHighlights();qa('[data-hb-screen]').forEach(s=>s.hidden=true);
  const panel=q('[data-hb-screen="'+view+'"]');if(!panel)return;
  panel.hidden=false;current=view;selected(view);q('#hb17SearchStatus').textContent='';
  if(blockId){const block=panel.querySelector('#'+blockId);if(block)block.open=true;}
  if(fromSearch)highlight(panel,lastQuery);
  if(innerWidth<=850)index.open=false;
  const heading=panel.querySelector('h2');if(scroll){heading?.focus({preventScroll:true});(blockId?panel.querySelector('#'+blockId):q('.hb17-layout'))?.scrollIntoView({block:'start',behavior:'auto'});}
 }
 function doSearch(){
  const term=search.value.trim();q('#hb17Clear').hidden=!term;lastQuery=term;clearHighlights();
  if(!term){show(current==='search'?'overview':current,'',false,false);return;}
  const words=normalize(term).split(' ').filter(Boolean),results=[];
  for(const t of searchable){
   const head=normalize(t.title+' '+t.code),matches=[];
   for(const b of t.blocks){const body=normalize(b.text),hay=head+' '+body;if(words.every(w=>hay.includes(w)))matches.push({t,b,score:words.filter(w=>body.includes(w)).length});}
   if(!matches.length&&words.every(w=>normalize(head+' '+t.keys+' '+t.text).includes(w)))matches.push({t,b:t.blocks[0],score:0});
   results.push(...matches);
  }
  results.sort((a,b)=>b.score-a.score);
  qa('[data-hb-screen]').forEach(s=>s.hidden=true);const screen=q('[data-hb-screen="search"]');screen.hidden=false;selected('');
  q('#hb17SearchStatus').textContent=results.length?results.length+' نتيجة في الدليل':'لا توجد نتائج';
  q('#hb17ResultsTitle').textContent=results.length?'نتائج البحث ('+results.length+')':'لم نجد هذا النص';
  q('#hb17Results').innerHTML=results.length?results.map(({t,b})=>{let start=0;const raw=b.body.replace(/\s+/g,' ').trim(),pos=normalize(raw).indexOf(words[0]);if(pos>90)start=Math.max(0,pos-50);const excerpt=(start?'… ':'')+raw.slice(start,start+220)+(start+220<raw.length?' …':'');return '<button type="button" class="hb17-result" data-hb-result="'+esc(t.id)+'" data-hb-block="'+esc(b.id)+'"><b>'+esc(t.title)+' — '+esc(b.title)+'</b><p>'+esc(excerpt)+'</p><small>'+esc(t.code)+' · المصدر ص '+esc(t.pages)+' · فتح التفاصيل</small></button>';}).join(''):'<div class="hb17-empty">جرّب كلمة أقصر مثل: إجازة، شورت، سلفة، بصمة، بدل طعام.<br>البحث يشمل عناوين السياسات ومحتواها، وليس بيانات الموظفين.</div>';
 }
 function printTopic(t){return '<article class="hb17-print-topic"><div class="hb17-print-source">MOSH GROUP · تعليمات إدارية عامة · المصدر: MoshGroup HandBook.pdf · ص '+esc(t.dataset.pages)+'</div><h2>'+esc(t.dataset.title)+' — '+esc(t.dataset.code)+'</h2><p>'+esc(t.querySelector('.hb17-lead')?.textContent||'')+'</p>'+Array.from(t.querySelectorAll('.hb17-block')).map(d=>'<section><h3>'+esc(d.querySelector('summary').textContent)+'</h3>'+d.querySelector('.hb17-block-body').innerHTML+'</section>').join('')+'</article>';}
 function cleanup(){document.body.classList.remove('hb17-printing');printRoot.innerHTML='';printRoot.setAttribute('aria-hidden','true');}
 function preparePrint(all=false){clearHighlights();cleanup();const chosen=all||current==='overview'||current==='notes'?topics:topics.filter(t=>t.dataset.hbTopic===current);printRoot.innerHTML=chosen.map(printTopic).join('');printRoot.removeAttribute('aria-hidden');document.body.classList.add('hb17-printing');}
 root.addEventListener('input',e=>{if(e.target!==search)return;clearTimeout(pending);pending=setTimeout(doSearch,120);});
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!root.contains(b)||b.disabled)return;
  if(b.hasAttribute('data-hb-go')){e.preventDefault();show(b.dataset.hbGo);}
  else if(b.hasAttribute('data-hb-result')){e.preventDefault();show(b.dataset.hbResult,b.dataset.hbBlock,true);}
  else if(b.hasAttribute('data-hb-clear')){show('overview','',false,false);search.focus();}
  else if(b.hasAttribute('data-hb-expand')){const screen=q('[data-hb-screen]:not([hidden])');screen?.querySelectorAll('.hb17-block').forEach(d=>d.open=b.dataset.hbExpand==='all');}
  else if(b.hasAttribute('data-hb-print')){preparePrint(b.dataset.hbPrint==='all');setTimeout(()=>{try{window.print();}catch(err){cleanup();q('#hb17SearchStatus').textContent='تعذرت الطباعة. افتح الملف بمتصفح كامل وحاول مجدداً.';}},80);}
 });
 window.addEventListener('afterprint',cleanup);
 const media=window.matchMedia('(max-width:850px)');function indexSize(){index.open=!media.matches;}media.addEventListener('change',indexSize);indexSize();
 window.MoshHandbook17={version:'17.0',show,search:doSearch,preparePrint,cleanupPrint:cleanup};
 show('overview','',false,false);
})();
