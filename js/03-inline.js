(function(){function updateDashboardClock(){var now=new Date();var timeEl=document.getElementById('dashboardLiveTime');var dateEl=document.getElementById('dashboardLiveDate');if(timeEl){timeEl.textContent=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).format(now);}
if(dateEl){dateEl.textContent=new Intl.DateTimeFormat('ar-SY',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(now);}
}
updateDashboardClock();setInterval(updateDashboardClock,1000);})();
