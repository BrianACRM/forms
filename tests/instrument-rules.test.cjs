const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../instrument-core.js');
const R=require('../instrument-rules.js');
const header=['Year','Month','Day','Frame','Total','Act Inst','Sim Inst','1/A','PAR','CCA','ILS','2/B','ASR','ELVA','L/MF','LOC','NDB','SCA','TACAN','VOR','VOR/DME'];

test('a SHARP frame and simulated instrument column do not identify an aircraft flight',()=>{
  const report=C.parseRows([header,[2026,7,1,'E-6B',4,0,2,6,0,0,0,6]]);
  assert.equal(report.flights[0].platform,'unknown');
  assert.equal(report.flights[0].pilotTime,null,'TOTAL is not silently treated as FPT+CPT');
});

const flight=(sourceRow,kind,actual,simulated,precision,nonprecision,date='2026-07-01',frame='E-6B')=>({sourceRow,date,frame,total:actual+simulated+1,actual,simulated,precision,nonprecision,platform:kind,pilotTime:null,metadata:kind==='simulator'?{device:'2F144A-2'}:{}});
test('aircraft simulated instrument time counts fully; approved devices are capped independently for each minimum',()=>{
  const report={flights:[flight(1,'aircraft',1,2,3,3),flight(2,'simulator',0,20,30,30)]};
  const a=R.audit(report,'2026-07-17','E-6B',{reviews:{2:{kind:'approvedSimulator'}},recordsConfirmed:true});
  assert.equal(a.six.logged.instrument,23,'logged values are never halved');
  assert.deepEqual([a.six.checks.instrument.aircraft,a.six.checks.instrument.simulatorAllowed,a.six.checks.instrument.credited],[3,3,6]);
  assert.equal(a.six.checks.instrument.status,'pass');
  assert.equal(a.twelve.checks.instrument.simulatorAllowed,6);
  assert.equal(a.twelve.checks.instrument.status,'below');
  assert.equal(a.six.checks.precision.simulatorAllowed,3);
  assert.equal(a.twelve.checks.precision.simulatorAllowed,6);
  assert.equal(a.twelve.checks.nonprecision.simulatorAllowed,3);
  assert.equal(a.career.checks.instrument.simulatorAllowed,20);
});
test('abundant simulator time and approaches cannot replace the aircraft half',()=>{
  const report={flights:[flight(1,'aircraft',2.9,0,2,2),flight(2,'simulator',0,100,100,100)]};
  const a=R.audit(report,'2026-07-17','E-6B',{reviews:{2:{kind:'approvedSimulator'}},recordsConfirmed:true});
  for(const key of ['instrument','precision','nonprecision'])assert.equal(a.six.checks[key].status,'below');
  assert.equal(a.career.checks.instrument.simulatorAllowed,25);
});
test('unknown platforms and unverified simulators never silently become approved aircraft credit',()=>{
  const report={flights:[flight(1,'unknown',0,10,10,10),flight(2,'simulator',0,10,10,10)]};
  const a=R.audit(report,'2026-07-17','E-6B',{recordsConfirmed:true});
  assert.equal(a.six.checks.instrument.credited,0);
  assert.equal(a.six.checks.instrument.unknown,20);
  assert.equal(a.six.checks.instrument.status,'review');
  assert.equal(a.aircraftAll.total,0);
  const denied=R.audit(report,'2026-07-17','E-6B',{reviews:{1:{kind:'unapprovedSimulator'},2:{kind:'unapprovedSimulator'}},recordsConfirmed:true});
  assert.equal(denied.six.checks.instrument.status,'below');
});
test('pilot totals use FPT plus CPT and exclude simulators, unknown events, checkride and future flights',()=>{
  const report={flights:[{...flight(1,'aircraft',1,0,1,1),total:8,pilotTime:5},{...flight(2,'aircraft',1,0,1,1,'2026-06-01','T-6B'),total:3,pilotTime:2},flight(3,'simulator',0,4,1,1),flight(4,'unknown',0,3,1,1),flight(5,'aircraft',1,0,1,1,'2026-07-17'),flight(6,'aircraft',1,0,1,1,'2026-07-18')]};
  const a=R.audit(report,'2026-07-17','e-6b');
  assert.equal(a.aircraftAll.pilotTime,7);assert.equal(a.aircraftModel.pilotTime,5);
  assert.equal(a.checkDayExcluded,1);assert.equal(a.futureExcluded,1);
  assert.equal(a.career.logged.count,4);
  const b=R.audit(report,'2026-07-17','E-6B',{priorSortieRows:[5,6]});
  assert.equal(b.career.logged.count,5);assert.equal(b.aircraftAll.missingPilotTime,1);
});
test('explicit metadata identifies simulator sessions, while device approval requires review',()=>{
  for(const [column,value] of [['Exception Code','T'],['ORG','ZEZ'],['Device ID','2F144A-2'],['TEC','VECE']]){
    const row=[2026,7,1,'E-6B',4,0,2,1,0,0,0,1];while(row.length<header.length)row.push(0);
    row.push(value,2,1);
    const parsed=C.parseRows([[...header,column,'FPT','CPT'],row]);
    assert.equal(parsed.flights[0].platform,'simulator');assert.equal(parsed.flights[0].pilotTime,3);
    assert.equal(R.classification(parsed.flights[0]),'simulator');
  }
});
test('conflicting platform evidence and invalid reviews are rejected',()=>{
  const row=[2026,7,1,'E-6B',4,0,2,1,0,0,0,1];while(row.length<header.length)row.push(0);
  assert.throws(()=>C.parseRows([[...header,'Platform','Exception Code'],[...row,'aircraft','T']]),/conflict/);
  assert.throws(()=>R.classification(flight(1,'unknown',0,1,1,1),{kind:'guess'}),/invalid/);
  assert.throws(()=>C.parseRows([header,[2026,7,1,'E-6B',4,0,.05]]),/tenths/);
});
test('simulator actual time and impossible log relationships require correction without relabeling',()=>{
  const f=flight(1,'simulator',1,1,1,1);
  const a=R.audit({flights:[f]},'2026-07-17','E-6B',{reviews:{1:{kind:'approvedSimulator'}},recordsConfirmed:true});
  assert.match(a.issues.join(' '),/actual instrument time/);assert.equal(a.six.logged.actual,1);
  assert.equal(a.six.checks.instrument.status,'review');
  const b=R.audit({flights:[{...flight(1,'aircraft',2,0,1,1),total:1,pilotTime:3},flight(2,'aircraft',0,0,1,1)]},'2026-07-17','E-6B');
  assert.equal(b.issues.length,3);
});
test('qualified exam must be within 60 days and completed before the evaluation',()=>{
  assert.equal(R.exam('2026-07-17','2026-05-18').status,'pass');
  assert.equal(R.exam('2026-07-17','2026-05-17').status,'fail');
  assert.equal(R.exam('2026-07-17','2026-07-18').status,'fail');
  assert.equal(R.exam('2026-07-17','2026-07-17').status,'review');
  assert.equal(R.exam('2026-07-17','2026-07-17',true).status,'pass');
});
test('renewal expiration preserves the existing expiration month only within its 60-day window',()=>{
  assert.equal(R.expiration('2026-07-17','2026-08-31',true).date,'2027-08-31');
  assert.equal(R.expiration('2026-07-02','2026-08-31',true).earlyRenewal,true);
  assert.equal(R.expiration('2026-07-01','2026-08-31',true).date,'2027-07-31');
  assert.equal(R.expiration('2026-08-31','2026-08-31',true).date,'2027-08-31');
  assert.equal(R.expiration('2026-09-01','2026-08-31',true).date,'2027-09-30');
  assert.equal(R.expiration('2024-02-29','',false).date,'2025-02-28');
  assert.equal(R.expiration('2026-07-17','',true).needsCurrentExpiration,true);
});
test('approach classification follows control, completion, LPV DA and coupled-approach rules',()=>{
  assert.equal(R.approach({type:'LPV',decisionAltitude:300}),'precision');
  assert.equal(R.approach({type:'LPV',decisionAltitude:301}),'nonprecision');
  assert.equal(R.approach({type:'LPV'}),'unknown');
  assert.equal(R.approach({type:'LNAV/VNAV'}),'nonprecision');
  assert.equal(R.approach({type:'CCA'}),'unknown');
  assert.equal(R.approach({type:'CCA',glidepath:false}),'nonprecision');
  assert.equal(R.approach({type:'ILS',coupled:true}),'excluded');
  assert.equal(R.approach({type:'PAR',completed:false}),'excluded');
  assert.equal(R.approach({type:'PAR',atControls:false}),'excluded');
  assert.equal(R.approach({type:'PAR',atControls:false,studentInstructorActual:true}),'precision');
});
test('special rating checks distinguish military actual time and authorized reduced minimums',()=>{
  assert.ok(R.special({years:5,pilotHours:2000,militaryActual:100}).every(x=>x.status==='pass'));
  assert.equal(R.special({years:5,pilotHours:2000,militaryActual:99})[2].status,'below');
  assert.equal(R.special({years:3,pilotHours:1500,militaryActual:100,reduced:true}).at(-1).status,'review');
  assert.ok(R.special({years:3,pilotHours:1500,militaryActual:100,reduced:true,authority:'Authorized issuing authority'}).every(x=>x.status==='pass'));
});
test('manual figures cannot bypass simulator caps or invent an aircraft approach breakdown',()=>{
  assert.equal(R.manualCredit({logged:60,actual:0,aircraft:0,approvedSimulator:60,required:50}).status,'below');
  assert.equal(R.manualCredit({logged:100,actual:60,required:50}).status,'pass');
  assert.equal(R.manualCredit({logged:20,required:6}).status,'review');
  assert.equal(R.manualCredit({logged:20,aircraft:3,approvedSimulator:3,required:6}).status,'pass');
  assert.throws(()=>R.manualCredit({logged:10,actual:5,aircraft:4,required:6}),/conflict/);
  assert.throws(()=>R.manualCredit({logged:10,aircraft:8,approvedSimulator:3,required:6}),/conflict/);
});
test('SHARP optional approach columns use LPV classification and exclude coupled codes',()=>{
  const row=[2026,7,1,'E-6B',4,1,2,0,0,0,0,0];while(row.length<header.length)row.push(0);
  const columns=['LPV DA <= 300 FT AGL','LPV DA > 300 FT AGL','LNAV/VNAV','3/C'];
  const r=C.parseRows([[...header,...columns],[...row,1,2,3,4]]).flights[0];
  assert.equal(r.precision,1);assert.equal(r.nonprecision,5);assert.equal(r.excludedApproaches,4);
  assert.throws(()=>C.parseRows([[...header,'LPV'],[...row,1]]),/decision altitude/);
});
test('unknown event classification does not falsely certify a large mixed-model history',()=>{
  const flights=Array.from({length:10000},(_,i)=>flight(i+1,'unknown',0,.1,1,1,'2026-01-18',['E-6B','T-6B','T-44C','P-8A','B-737'][i%5]));
  const r=R.audit({flights},'2026-07-17','E-6B',{recordsConfirmed:true});
  assert.equal(r.unknownCount,10000);assert.equal(r.six.logged.simulated,1000);
  assert.equal(r.six.checks.instrument.status,'review');assert.equal(r.aircraftModel.pilotTime,0);
});
