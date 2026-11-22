// Actual manager lookup/approval gate; projected staff fixtures, no HTTP or database.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=fs.readFileSync(path.join(__dirname,'../js/02-mosh-core-runtime-14.js'),'utf8');
const marketing=fs.readFileSync(path.join(__dirname,'../js/40-mosh-marketing-v33-js.js'),'utf8');
function fragment(code,start,end){const a=code.indexOf(start),b=code.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return code.slice(a,b);}
function setup(staff,name='Marketing Manager'){
 const state={staffProfiles:staff,departmentManagers:{'التسويق':'EMP-MANAGER'}};
 const context=vm.createContext({state,window:{MoshApi:{}},clean:v=>String(v||'').trim(),actor:()=>name,hasPermission:()=>false});
 vm.runInContext(fragment(core,'function getStaffProfileById(','function staffStatusLabel('),context);
 vm.runInContext(fragment(core,'function getDepartmentManager(','function getManagedDepartmentsForStaff('),context);
 vm.runInContext(fragment(marketing,'function canApprove(','function profile('),context);
 return {context,state};
}
const directory=[{id:'EMP-MANAGER',name:'Marketing Manager',department:'التسويق',employmentStatus:'active',active:true,isManager:true}];
test('projected directory identifies the assigned Marketing manager and enables plan review',()=>{
 const f=setup(directory);assert.equal(f.context.getDepartmentManager('التسويق').id,'EMP-MANAGER');assert.equal(f.context.canApprove(),true);
});
test('another employee cannot approve the marketing manager plan',()=>{
 const f=setup(directory,'Other Employee');assert.equal(f.context.canApprove(),false);
});
test('missing or inactive manager directory entry never grants approval',()=>{
 assert.equal(setup([]).context.canApprove(),false);assert.equal(setup([{...directory[0],active:false,employmentStatus:'inactive'}]).context.canApprove(),false);
});
