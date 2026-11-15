/* R36: move the existing social UI into a real department. No business-data migration. */
(function(){'use strict';
 const $=s=>document.querySelector(s);let active=false;
 function cleanup(){document.querySelectorAll('#marketingSocialHubTab').forEach(n=>n.closest('.menu')?.remove());}
 function entry(e){const app=e.detail?.app;if(app==='social'){window.MoshInstagram28?.leave?.();const body=$('#socialAppContent');if(body)body.style.display='block';active=true;}else if(active){window.MoshInstagram28?.leave?.();active=false;}cleanup();}
 document.addEventListener('mosh:section-enter',entry);
 document.addEventListener('mosh:r19-ready',cleanup);document.addEventListener('mosh:permissions-applied',cleanup);
 const prev=window.openProductiveDistributionPage;if(typeof prev==='function')window.openProductiveDistributionPage=function(key){if(key==='social'){window.MoshInstagram28?.leave?.();const c=$('#socialAppContent');if(c)c.style.display='block';}return prev.apply(this,arguments);};
 const run=window.openProductiveRunningTasksPage;if(typeof run==='function')window.openProductiveRunningTasksPage=function(key){if(key==='social')window.MoshInstagram28?.leave?.();return run.apply(this,arguments);};
 cleanup();
})();
