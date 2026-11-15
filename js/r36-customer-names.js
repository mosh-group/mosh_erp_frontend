/* R36 — customer aliases, no automatic database rewrite. */
(function(){'use strict';
 const norm=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase();
 const names=c=>[c?.nameAr,c?.nameEn,c?.name].map(v=>String(v??'').trim()).filter(Boolean);
 function display(c){const a=String(c?.nameAr??'').trim(),b=String(c?.nameEn??'').trim();return a&&b?(norm(a)===norm(b)?a:a+' — '+b):a||b||String(c?.name??'');}
 const search=c=>[...names(c),c?.legalName,c?.contact,c?.phone,c?.email,c?.city].filter(Boolean).join(' ');
 function find(rows,value){const q=norm(value);if(!q)return null;const exact=rows.filter(c=>norm(c.name)===q);if(exact.length===1)return exact[0];const aliases=rows.filter(c=>names(c).some(n=>norm(n)===q)||norm(display(c))===q);return aliases.length===1?aliases[0]:null;}
 window.MoshCustomerNames36=Object.freeze({norm,display,search,find,names});
})();
