function toggleDashboardEmployeeServices(){var panel=document.getElementById('employeeSelfService');if(!panel)return;var isHidden=(panel.style.display==='none' || getComputedStyle(panel).display==='none');panel.style.display=isHidden?'block':'none';if(isHidden){try{if(typeof hrProUpdateEmployeeServiceStatus==='function')hrProUpdateEmployeeServiceStatus();}catch(e){}
setTimeout(function(){try{panel.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}},30);}
}
