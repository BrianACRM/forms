/* Share equivalent inputs while retaining explicit per-form edits. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else api.mount(root);
})(typeof window==='undefined'?this:window,function(){
  'use strict';
  function createGroup(entries,{read,write,active,automatic=()=>false}){
    const inherited=new Map();
    function copy(source,target){
      const canonical=source.decode(read(source.id));
      if(!canonical){
        const prior=inherited.get(target.id);
        if(!read(source.id)&&prior?.source===source.id&&prior.value===read(target.id)){
          inherited.delete(target.id);write(target.id,'');
        }
        return;
      }
      const next=target.encode(canonical);
      if(next===null)return;
      const current=read(target.id),prior=inherited.get(target.id);
      if(current&&!(prior&&prior.source===source.id&&prior.value===current)&&!automatic(target.id))return;
      if(current!==next){inherited.set(target.id,{source:source.id,value:next});write(target.id,next);}
    }
    function changed(id){
      inherited.delete(id);
      const source=entries.find(e=>e.id===id);
      if(!source||!active(source))return;
      for(const target of entries)if(target!==source&&active(target))copy(source,target);
    }
    function fill(){
      for(const source of entries)if(active(source)&&read(source.id)){
        for(const target of entries)if(target!==source&&active(target))copy(source,target);
      }
    }
    return {changed,fill};
  }
  function mount(w){
    const d=w.document,C=w.InstrumentCore,el=id=>d.getElementById(id);
    const read=id=>el(id).value.trim();
    const writing=new Set();
    function write(id,value){
      writing.add(id);
      try{el(id).value=value;el(id).dispatchEvent(new Event('change',{bubbles:true}));}
      finally{writing.delete(id);}
    }
    // BUNO and commander already have a single value used by every exporter.
    // Show convenient copies inside Instrument Check without separate state.
    for(const [shared,mirror]of [['buno','inst_buno'],['commanderName','inst_commander']]){
      el(mirror).value=read(shared);
      el(shared).addEventListener('change',()=>{if(!writing.has(shared))write(mirror,read(shared));});
      el(mirror).addEventListener('change',()=>{if(!writing.has(mirror))write(shared,read(mirror));});
    }
    const identity=x=>x;
    const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    function date(value){
      if(!value)return '';
      let iso=value;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)){
        const m=/^(\d{1,2}) ([A-Z]{3}) (\d{4})$/.exec(w.formatDate(value));
        if(!m||!months.includes(m[2]))return '';
        iso=`${m[3]}-${String(months.indexOf(m[2])+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
      }
      try{C.isoDate(iso);return iso;}catch{return '';}
    }
    const entry=(id,form,decode=identity,encode=identity)=>({id,form,decode,encode});
    const dates=(legacy,instrument)=>[
      entry('natops_'+legacy,'natops',date,C.displayDate),
      entry('arp_'+legacy,'arp',date,C.displayDate),
      entry('inst_'+instrument,'instrument',date)
    ];
    const pilots=['AIRCRAFT COMMANDER','SECOND PILOT','THIRD PILOT'];
    const pilot=v=>pilots.includes(v)?v:'';
    const groups=[
      dates('flightDate','flightDate'),dates('expires','expiration'),
      ['natops','arp','instrument'].map(form=>entry((form==='instrument'?'inst':form)+'_flightDuration',form)),
      [entry('natops_position','natops',pilot),entry('inst_crewPosition','instrument',pilot)]
    ];
    const connectors=groups.map(entries=>{
      const group=createGroup(entries,{read,write,active:e=>el('chk_'+e.form).checked,
        automatic:id=>id==='inst_expiration'&&w.instrumentForm.isSuggestedExpiration()});
      for(const {id}of entries)for(const event of ['input','change']){
        el(id).addEventListener(event,()=>{if(!writing.has(id))group.changed(id);});
      }
      return group;
    });
    for(const form of ['natops','arp','instrument'])el('chk_'+form).addEventListener('change',()=>connectors.forEach(g=>g.fill()));
    connectors.forEach(g=>g.fill());
  }
  return {createGroup,mount};
});
