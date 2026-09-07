/* CNAF M-3710.7, 7 February 2025. Logged values and requirement credit are separate. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./instrument-core.js'));
  else root.InstrumentRules=factory(root.InstrumentCore);
})(typeof window==='undefined'?this:window,function(C){
  'use strict';
  const edition='CNAF M-3710.7, 7 February 2025';
  const source='https://www.med.navy.mil/Portals/62/Documents/NMFSC/NMOTC/NAMI/ARWG/Miscellaneous/CNAF%20M_3710_7%20FEB%202025.pdf?ver=2QUgzKUiKkzOeFOiPQNxxA%3D%3D';
  const kinds=['aircraft','approvedSimulator','simulator','unapprovedSimulator','unknown'];
  const daysBetween=(a,b)=>(C.isoDate(b)-C.isoDate(a))/86400000;
  function expiration(flightDate,currentExpiration='',renewal=false){
    C.isoDate(flightDate);
    const early=!!(renewal&&currentExpiration&&daysBetween(flightDate,currentExpiration)>=0&&daysBetween(flightDate,currentExpiration)<=60);
    const base=C.isoDate(early?currentExpiration:flightDate);
    return {date:new Date(Date.UTC(base.getUTCFullYear()+1,base.getUTCMonth()+1,0)).toISOString().slice(0,10),earlyRenewal:early,needsCurrentExpiration:renewal&&!currentExpiration,reference:'13.1.2.1'};
  }
  function exam(flightDate,examDate,sameDayBeforeFlight=false){
    if(!flightDate||!examDate)return {status:'review',message:'Enter the qualified written-exam date and evaluation date.',reference:'13.1.2.2'};
    const age=daysBetween(examDate,flightDate);
    return {status:age<0||age>60?'fail':age===0&&!sameDayBeforeFlight?'review':'pass',days:age,message:age<0?'Written exam occurs after the evaluation.':age>60?'Qualified written exam is more than 60 days before the evaluation.':age===0&&!sameDayBeforeFlight?'Confirm the written exam was qualified before the evaluation began.':'Qualified written-exam date is within the 60-day window.',reference:'13.1.2.2'};
  }
  const approach=C.approach;
  function classification(flight,review={}){
    if(review.kind!==undefined){
      if(!kinds.includes(review.kind))throw new Error(`Row ${flight.sourceRow}: invalid aircraft/simulator classification.`);
      if(flight.platform==='simulator'&&review.kind==='aircraft')throw new Error(`Row ${flight.sourceRow}: simulator source identifiers conflict with aircraft classification. Correct the source record.`);
      if(flight.platform==='aircraft'&&['simulator','approvedSimulator','unapprovedSimulator'].includes(review.kind))throw new Error(`Row ${flight.sourceRow}: aircraft source identifiers conflict with simulator classification. Correct the source record.`);
      return review.kind;
    }
    if(flight.platform==='aircraft')return 'aircraft';
    if(flight.platform==='simulator'){
      // Only this application's E-6B devices have been checked against Appendix K.3.
      // Listing alone does not establish pilot-station use or model-manager authorization.
      return 'simulator';
    }
    return 'unknown';
  }
  function sum(rows,pilotTotalsConfirmed){
    const result={count:rows.length,total:0,pilotTime:0,missingPilotTime:0,actual:0,simulated:0,instrument:0,precision:0,nonprecision:0};
    for(const r of rows){
      for(const key of ['total','actual','simulated','precision','nonprecision'])result[key]+=r[key];
      const pilot=r.pilotTime??(pilotTotalsConfirmed?r.total:null);
      if(pilot===null)result.missingPilotTime++;else result.pilotTime+=pilot;
    }
    for(const key of ['total','pilotTime','actual','simulated'])result[key]=C.round(result[key]);
    result.instrument=C.round(result.actual+result.simulated);
    return result;
  }
  function credit(aircraft,simulator,unknown,required,recordsConfirmed){
    const allowed=Math.min(simulator,required/2),credited=C.round(aircraft+allowed);
    return {required,aircraft,simulator,simulatorAllowed:allowed,credited,unknown,status:!recordsConfirmed?'review':credited>=required?'pass':unknown>0?'review':'below',shortfall:C.round(Math.max(0,required-credited))};
  }
  function manualCredit({logged,actual=0,aircraft,approvedSimulator,required}){
    const a=aircraft===''||aircraft===undefined?actual:C.number(aircraft,'Aircraft portion');
    const s=approvedSimulator===''||approvedSimulator===undefined?0:C.number(approvedSimulator,'Approved simulator portion');
    if(a<actual||C.round(a+s)>logged)throw new Error('Aircraft and simulator portions conflict with the logged total or actual instrument hours.');
    return credit(a,s,C.round(logged-a-s),required,true);
  }
  function audit(report,asOf,model,{reviews={},priorSortieRows=[],pilotTotalsConfirmed=false,recordsConfirmed=false}={}){
    C.isoDate(asOf);
    const earlier=new Set(priorSortieRows),issues=[];
    const records=report.flights.map(r=>({...r,kind:classification(r,reviews[r.sourceRow])}));
    const before=records.filter(r=>r.date<asOf||(r.date===asOf&&earlier.has(r.sourceRow)));
    for(const r of before){
      const device=String(reviews[r.sourceRow]?.device||r.metadata?.device||r.metadata?.tec||'').trim();
      if((/^2F144A-[12]$/i.test(device)||device.toUpperCase()==='VECE')&&r.frame.toUpperCase()!=='E-6B')issues.push(`Row ${r.sourceRow}: E-6B simulator identifier conflicts with the reported frame.`);
      if(r.kind==='approvedSimulator'&&!String(reviews[r.sourceRow]?.device||r.metadata?.device||r.metadata?.tec||'').trim())issues.push(`Row ${r.sourceRow}: enter the simulator device or approval record for the approved-simulator classification.`);
      if(['approvedSimulator','simulator','unapprovedSimulator'].includes(r.kind)&&r.actual>0)issues.push(`Row ${r.sourceRow}: a simulator session contains actual instrument time. Correct the source; actual time is not relabeled as simulated.`);
      if(C.round(r.actual+r.simulated)>r.total)issues.push(`Row ${r.sourceRow}: instrument hours exceed total logged hours.`);
      if(r.pilotTime!==null&&r.pilotTime!==undefined&&r.pilotTime>r.total)issues.push(`Row ${r.sourceRow}: FPT plus CPT exceeds total logged hours.`);
      if(r.pilotTime!==null&&r.pilotTime!==undefined&&C.round(r.actual+r.simulated)>r.pilotTime)issues.push(`Row ${r.sourceRow}: instrument hours exceed pilot time.`);
      if((r.precision||r.nonprecision)&&!r.actual&&!r.simulated)issues.push(`Row ${r.sourceRow}: approaches are logged without instrument time (10.3.3).`);
    }
    function period(rows,months){
      const groups=Object.fromEntries(kinds.map(kind=>[kind,sum(rows.filter(r=>r.kind===kind),pilotTotalsConfirmed)]));
      const pending=sum(rows.filter(r=>['unknown','simulator'].includes(r.kind)),pilotTotalsConfirmed);
      const required=months===6?{instrument:6,precision:6,nonprecision:6}:months===12?{instrument:12,precision:12,nonprecision:6}:{instrument:50};
      const checks=Object.fromEntries(Object.entries(required).map(([key,n])=>[key,credit(groups.aircraft[key],key==='instrument'?groups.approvedSimulator.simulated:groups.approvedSimulator[key],pending[key],n,recordsConfirmed&&!issues.length)]));
      return {groups,logged:sum(rows,pilotTotalsConfirmed),checks};
    }
    const career=period(before,0);
    const aircraft=before.filter(r=>r.kind==='aircraft');
    const aircraftAll=sum(aircraft,pilotTotalsConfirmed),aircraftModel=sum(aircraft.filter(r=>r.frame.trim().toUpperCase()===String(model).trim().toUpperCase()),pilotTotalsConfirmed);
    return {edition,asOf,issues,records,six:period(before.filter(r=>r.date>C.subtractMonths(asOf,6)),6),twelve:period(before.filter(r=>r.date>C.subtractMonths(asOf,12)),12),career,aircraftAll,aircraftModel,unknownCount:career.groups.unknown.count,checkDayExcluded:records.filter(r=>r.date===asOf&&!earlier.has(r.sourceRow)).length,futureExcluded:records.filter(r=>r.date>asOf).length};
  }
  function special({years,pilotHours,militaryActual,reduced=false,authority=''}){
    const limits={years:reduced?3:5,pilotHours:reduced?1500:2000,militaryActual:100};
    const data={years,pilotHours,militaryActual};
    const checks=Object.entries(limits).map(([key,required])=>({key,required,status:data[key]===''||data[key]===undefined?'review':Number(data[key])>=required?'pass':'below'}));
    if(reduced&&!authority.trim())checks.push({key:'delegated issuing authority',status:'review'});
    return checks;
  }
  return {edition,source,kinds,daysBetween,expiration,exam,approach,classification,credit,manualCredit,audit,special};
});
