(function(){
 'use strict';
 window.MOSH_V45_EMPLOYEE_TASKS_UNIFIED=true;
 function sync(){
  try{window.MoshEmployeeTasks41?.reconcile?.();}catch(e){}
  try{
   const u=window.MoshAuth37?.current?.();
   if(!u||window.MoshAuth37?.taskScope?.()!=='mine')return;
   const app=window.MoshAuth37?.departmentApp?.();
   if(app&&document.getElementById(app+'App')?.classList.contains('active'))window.openProductiveRunningTasksPage?.(app);
  }catch(e){}
 }
 setTimeout(sync,120);setTimeout(sync,800);setTimeout(sync,2200);
})();
