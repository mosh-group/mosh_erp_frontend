(function(){
 'use strict';
 window.MOSH_V44_TASK_ASSIGNMENT_FIX=true;
 function refresh(){
   try{window.MoshEmployeeTasks41?.reconcile?.();}catch(e){}
   try{if(window.MoshEmployeeView11&&window.MoshEmployeeTasks41?.showMine)window.MoshEmployeeView11.showMyTasks=window.MoshEmployeeTasks41.showMine;}catch(e){}
   try{
     const u=window.MoshAuth37?.current?.();
     if(!u||window.MoshAuth37?.taskScope?.()!=='mine')return;
     const app=window.MoshAuth37?.departmentApp?.();
     const sec=app&&document.getElementById(app+'App');
     if(sec?.classList.contains('active')&&typeof window.openProductiveRunningTasksPage==='function')window.openProductiveRunningTasksPage(app);
   }catch(e){}
 }
 setTimeout(refresh,100);setTimeout(refresh,700);setTimeout(refresh,1800);
 window.addEventListener('storage',()=>setTimeout(refresh,50));
})();
