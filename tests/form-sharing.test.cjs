const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createGroup}=require('../form-sharing.js');
function setup(values,selected=['natops','arp','instrument']){
  const entries=['natops','arp','instrument'].map(form=>({id:form,form,decode:v=>v,encode:v=>v}));
  const group=createGroup(entries,{read:id=>values[id]||'',write:(id,value)=>{values[id]=value;},active:e=>selected.includes(e.form)});
  return group;
}
test('fills newly selected forms without changing existing form-specific values',()=>{
  const values={natops:'4.0',arp:'2.0',instrument:''},g=setup(values);
  g.fill();assert.equal(values.instrument,'4.0');assert.equal(values.arp,'2.0');
});
test('edits update inherited values, while a deliberate per-form edit is preserved',()=>{
  const values={natops:'4.0',arp:'',instrument:''},g=setup(values);
  g.fill();values.natops='4.5';g.changed('natops');assert.equal(values.instrument,'4.5');assert.equal(values.arp,'4.5');
  values.instrument='2.0';g.changed('instrument');values.natops='5.0';g.changed('natops');
  assert.equal(values.arp,'5.0');assert.equal(values.instrument,'2.0');
});
test('inactive forms are untouched; clearing a source clears only its inherited fields',()=>{
  const values={natops:'4.0',arp:'',instrument:''},g=setup(values,['natops','instrument']);
  g.fill();assert.equal(values.arp,'');assert.equal(values.instrument,'4.0');
  values.natops='';g.changed('natops');assert.equal(values.instrument,'');
});
test('converts equivalent date representations when copying between forms',()=>{
  const C=require('../instrument-core.js');
  const values={instrument:'2026-07-17',natops:''};
  const g=createGroup([{id:'instrument',decode:v=>v,encode:v=>v},{id:'natops',decode:()=>'',encode:C.displayDate}],{read:id=>values[id],write:(id,v)=>values[id]=v,active:()=>true});
  g.fill();assert.equal(values.natops,'17 JUL 2026');
});
