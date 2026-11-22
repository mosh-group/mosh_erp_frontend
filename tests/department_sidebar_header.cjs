// Exercise shared navigation in each department using the existing isolated DOM harness.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let fixture=fs.readFileSync(path.join(__dirname,'marketing_sidebar_header.cjs'),'utf8');
fixture=fixture.replace('context.marketingSidebarRows()',"context.departmentHeaderRows('marketing')").replaceAll('context.refreshMarketingTree(tree)',"context.refreshDepartmentHeaderTree('marketing',tree)");
fixture=fixture.replace('  removeAttribute(key)', '  getAttribute(key) {return this.attrs[key] ?? null;}\n  removeAttribute(key)');
fixture=fixture.replace('order: node.style.order','order: node.style.order, display: node.style.display, visibility: node.style.visibility');
const extras=`
const native=make('div','menu-strip'), nativeMenu=make('div','menu');app.append(native);native.append(nativeMenu);
const report=button('تقرير العمل','native-report');nativeMenu.append(report);
const dropMenu=make('div','menu'), dropTrigger=button('المحاسبة ▾','native-drop-trigger'), drop=make('div','dropdown');drop.id='nativeDrop';drop.hidden=true;dropTrigger.setAttribute('onclick',"toggleDrop('nativeDrop')");
const invoice=button('فواتير العملاء','native-invoices'),billing=button('مهام بانتظار الفوترة','native-billing');drop.append(invoice,billing);dropMenu.append(dropTrigger,drop);native.append(dropMenu);
const hiddenMenu=make('div','menu');hiddenMenu.style.display='none';hiddenMenu.append(button('خيار مخفي','hidden-option'));native.append(hiddenMenu);
const oldTab=button('صفحة قديمة','marketingDistributionTab');native.append(oldTab);
`;
fixture=fixture.replace('const originalHeaderNodes =',extras+'\nconst originalHeaderNodes =');
fixture=fixture.replace("'أدوات المدير', 'قائمة القسم']);","'أدوات المدير', 'قائمة القسم', 'تقرير العمل', 'المحاسبة']);");
fixture=fixture.replace('const toolsGroup = rootMenu',`assert.equal(leaf('خيار مخفي'),undefined);
assert.equal(leaf('صفحة قديمة'),undefined);
assert.equal(leaf('فواتير العملاء')?.textContent,'فواتير العملاء');
rootMenu('المحاسبة').querySelector('summary').click();leaf('فواتير العملاء').click();assert.equal(visits.at(-1),'native-invoices');assert.equal(rootMenu('المحاسبة').open,true);
leaf('تقرير العمل').click();assert.equal(visits.at(-1),'native-report');
app.className='';assert.equal(context.departmentHeaderRows('marketing').length,8,'Inactive department retains its header entries');app.className='active';
const toolsGroup = rootMenu`);
for(const section of ['social','design','photo','editing','promotion','it','logistics','purchases','accounting','platform']){
 const source=fixture.replaceAll('marketing',section);
 const env={require,__dirname,console:{log:()=>{}},Buffer,process};vm.runInNewContext(source,env,{filename:section+'-sidebar.cjs'});console.log('PASS: '+section+' header/sidebar order, original actions, native dropdowns/reports, assignment, permissions and expanded state.');
}
