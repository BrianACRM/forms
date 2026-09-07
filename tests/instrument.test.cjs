const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('../instrument-core.js');
const P=require('../vendor/pdf-lib-1.17.1.min.js');
const build=require('../instrument-pdf.js');
const header=['Year','Month','Day','Frame','Total','Act Inst','Sim Inst','1/A','PAR','CCA','ILS','2/B','ASR','ELVA','L/MF','LOC','NDB','SCA','TACAN','VOR','VOR/DME'];
const row=(y,m,d,frame,total,actual,sim,...counts)=>[y,m,d,frame,total,actual,sim,...counts];

test('SHARP columns are summed without totals-row duplication or dropping TACAN',()=>{
  const r=C.parseRows([['Average Instrument Logbook for EXAMPLE, A, LT'],header,row(2026,7,17,'E-6B',4,1,.5,1,2,3,4,1,2,3,4,5,6,7,8,9,10),['TOTALS','','','',999,999]]);
  assert.equal(r.flights.length,1);assert.equal(r.flights[0].precision,10);assert.equal(r.flights[0].nonprecision,55);
  assert.deepEqual(r.person,{lastName:'EXAMPLE',given:'A',rank:'LT'});
});
test('inclusive date windows, future exclusion, multiple flights per day and model hours',()=>{
  const r=C.parseRows([header,row(2025,7,16,'E-6B',1,1,0),row(2025,7,17,'E-6B',2,1,0),row(2026,1,16,'B-737',3,1,0),row(2026,1,17,'E-6B',4,1,0),row(2026,7,17,'E-6B',5,1,.3),row(2026,7,17,'E-6B',1,0,.3),row(2026,7,18,'E-6B',100,50,5)]);
  const s=C.summarize(r,'2026-07-17','E-6B');
  assert.equal(s.six.count,3);assert.equal(s.twelve.count,5);assert.equal(s.excluded,1);
  assert.equal(s.six.simulated,.6);assert.equal(s.modelHours,13);assert.equal(s.all.total,16);
});
test('calendar lookbacks clamp month ends and reject invalid dates',()=>{
  assert.equal(C.subtractMonths('2026-08-31',6),'2026-02-28');
  assert.equal(C.subtractMonths('2024-08-31',6),'2024-02-29');
  assert.equal(C.displayDate('2026-07-17'),'17 JUL 2026');
  assert.throws(()=>C.isoDate('2026-02-30'));assert.throws(()=>C.isoDate('7/17/26'));
});
test('rejects missing report columns, invalid flight rows and fractional approaches',()=>{
  assert.throws(()=>C.parseRows([['Not a logbook']]),/SHARP/);
  assert.throws(()=>C.parseRows([header.filter(h=>h!=='TACAN')]),/TACAN/);
  assert.throws(()=>C.parseRows([header,row(2026,2,30,'E-6B',1,0,0)]),/valid date/);
  assert.throws(()=>C.parseRows([header,row(2026,2,1,'E-6B',1,0,0,.5)]),/whole numbers/);
  assert.throws(()=>C.parseRows([header,row(2026,2,1,'E-6B','bad',0,0)]),/nonnegative/);
});
test('blank logged metrics mean zero; lifetime totals are not inferred',()=>{
  const s=C.summarize(C.parseRows([header,row(2026,7,17,'E-6B',4,'','')]),'2026-07-17','E-6B');
  assert.equal(s.six.actual,0);assert.equal(s.six.simulated,0);
  assert.equal(s.actualAll,undefined);assert.equal(s.totalHours,undefined);
});
const values={applicantName:'EXAMPLE, Alex, B.',rank:'LT',edipi:'0000000000',unit:'VQ-4',crewPosition:'E-6B Aircraft Commander',aircraftModel:'E-6B',buno:'2F144A-2',lastEvaluation:'25 JUL 2025',flightDate:'17 JUL 2026',flightDuration:'4.0',expiration:'31 JUL 2027',modelHours:'600.2',totalHours:'791.8',precision6:'14',precision12:'44',nonprecision6:'16',nonprecision12:'48',actual12:'136.3',actual6:'46.7',actualAll:'254.6',simulated12:'30.5',simulated6:'9.4',simulatedAll:'57.3',instrument12:'166.8',instrument6:'56.1',instrumentAll:'311.9',yearsFlying:'5',currentRating:'STANDARD',issuedRating:'STANDARD',exam1:'4.0',exam2:'',exam3:'',examinerName:'A. EXAMINER',examinerRank:'LT',examinerUnit:'VQ-7',examDate:'15 JUL 2026',flightExaminerName:'A. EXAMINER',flightExaminerRank:'LT',flightExaminerDate:'17 JUL 2026',commanderName:'A. COMMANDER',commanderRank:'CDR',commanderDate:'17 JUL 2026',remarks:"This flight was conducted in accordance with the NATOPS Instrument Flight Manual, CNAF M-3710.7 series, and the E-6B NATOPS Flight Manual. LT EXAMPLE executed all evaluated maneuvers and performed all evaluated procedures in a safe, proficient, and professional manner. Under the criteria set forth in CNAF M-3710.7 series and the NATOPS Instrument Flight Manual, LT EXAMPLE is fully qualified and it is recommended that LT EXAMPLE's STANDARD Instrument Rating be renewed.",basicOther:'',flightOther:'',controlledBy:'EXAMPLE OFFICE',cuiCategory:'PRVCY',distribution:'',pointOfContact:'EXAMPLE OFFICE'};
function packets(doc) {
  const xfa=doc.catalog.lookup(P.PDFName.of('AcroForm'),P.PDFDict).lookup(P.PDFName.of('XFA'),P.PDFArray);
  const result={};for(let i=0;i<xfa.size();i+=2)result[xfa.lookup(i).decodeText()]=new TextDecoder().decode(P.decodePDFRawStream(xfa.lookup(i+1)).decode());
  return result;
}
for(const key of ['lastEvaluation','flightDate','expiration','examDate','flightExaminerDate','commanderDate']){
  const [day,month,year]=values[key].split(' ');values[key]=`${year}-${String(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(month)+1).padStart(2,'0')}-${day}`;
}
test('Original PDF preserves every layout byte and allows calculated totals to be corrected',async()=>{
  const grades=Object.fromEntries(C.gradeItems.map(([id])=>[id,['takeoff','basicOther','flightOther'].includes(id)?'':'Q']));
  const template=fs.readFileSync('templates/OPNAV-3710-2-FEB-2023.pdf');
  const base=packets(await P.PDFDocument.load(template));
  assert.ok(base.datasets.includes('<form1/>'));assert.equal(base.form,undefined);
  const bytes=await build(template,values,grades,'Satisfactorily');
  const d=await P.PDFDocument.load(bytes),filled=packets(d);
  assert.equal((filled.template.match(/<calculate override="ignore"\s*>/g)||[]).length,3);
  const withoutValues=filled.template.replace(/(<field\b[^>]*\bname="(?:Exmoff|RnkNmeFltExmr|RnkNmeUnitCmdr|ContBy|CUICat|LDC|POC)"[^>]*>)<value><text>[\s\S]*?<\/text><\/value>/g,'$1').replace(/<calculate override="ignore"(\s*)>/g,'<calculate$1>');
  assert.equal(withoutValues,base.template,'Geometry, fonts, captions, format rules and signature controls unchanged');
  for(const packet of Object.keys(base).filter(k=>!['template','datasets'].includes(k)))assert.equal(filled[packet],base[packet],packet);
  for(const [key,name]of Object.entries(build.fieldNames))assert.ok(filled.datasets.includes(`<${name}>${String(values[key]||'').replace(/&/g,'&amp;').replace(/'/g,'&apos;')}</${name}>`),key);
  assert.ok(filled.datasets.includes('<Unit>VQ-4</Unit><Unit>E-6B Aircraft Commander</Unit><Unit>E-6B</Unit>'));
  assert.equal((filled.datasets.match(/<CheckBox3>/g)||[]).length,26);
  assert.ok(filled.datasets.includes('<CheckBox1>0</CheckBox1><CheckBox2>0</CheckBox2><CheckBox3>1</CheckBox3><CheckBox3>0</CheckBox3>'));
  assert.ok(filled.template.includes('<value><text>A. EXAMINER</text></value>'));
  assert.ok(filled.template.includes('<value><text>A. COMMANDER</text></value>'));
  assert.equal(filled.form,undefined);
  assert.equal((filled.template.match(/<signature\b/g)||[]).length,3);
  assert.ok(!/SignatureOfApp|SignatureFltExmer|SignatureUnitCmdr/.test(filled.datasets));
  fs.mkdirSync('tmp/pdfs',{recursive:true});fs.writeFileSync('tmp/pdfs/instrument-original-test.pdf',bytes);fs.writeFileSync('tmp/pdfs/expected-original.json',JSON.stringify(values));
});
test('XFA values are XML escaped, including values in unbound fields',()=>{
  assert.ok(build.datasets({remarks:'A & B < C'}, {}, '').includes('<Remarks>A &amp; B &lt; C</Remarks>'));
  assert.equal(build.fillTemplateValues('<field name="Exmoff"><caption/></field>',{examinerName:'A & B'}),'<field name="Exmoff"><value><text>A &amp; B</text></value><caption/></field>');
});
test('rejects overflowing remarks instead of clipping the original PDF',async()=>{
  await assert.rejects(build(fs.readFileSync('templates/OPNAV-3710-2-FEB-2023.pdf'),{remarks:'Long remarks. '.repeat(150)},{},''),/too long/);
});
test('rejects names that would be clipped by the original printed field',async()=>{
  await assert.rejects(build(fs.readFileSync('templates/OPNAV-3710-2-FEB-2023.pdf'),{...values,applicantName:'LONGNAME '.repeat(20)},{},''),/Applicant name is too long/);
});

test('large multi-aircraft history retains all rows and exact tenth-hour totals',()=>{
  const frames=['E-6B','FRAME-B','FRAME-C','FRAME-D','FRAME-E'];
  const detail=[];let tenths=0,modelTenths=0;
  for(let i=0;i<10000;i++){
    const d=new Date(Date.UTC(1999,0,1+i)),hours=(i%99)+1;
    detail.push(row(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),frames[i%5],hours/10,.1,.2,1));
    tenths+=hours;if(i%5===0)modelTenths+=hours;
  }
  const result=C.summarize(C.parseRows([header,...detail]),'2026-07-17','e-6b');
  assert.equal(result.all.count,10000);assert.equal(result.all.total,tenths/10);
  assert.equal(result.modelCount,2000);assert.equal(result.modelHours,modelTenths/10);
  assert.equal(result.all.actual,1000);assert.equal(result.all.simulated,2000);assert.equal(result.all.precision,10000);
});

test('successive PDF exports keep grades, zero values and records isolated',async()=>{
  const template=fs.readFileSync('templates/OPNAV-3710-2-FEB-2023.pdf');
  const cases=['','Q','U'];
  for(let n=0;n<30;n++){
    const grades=Object.fromEntries(C.gradeItems.map(([id],i)=>[id,cases[(n+i)%3]]));
    const v={...values,applicantName:`EXAMPLE ${n}, Alex`,precision6:String(n),actual6:'0',simulated6:'0',instrument6:'0',examinerName:`A. EXAMINER ${n}`};
    const result=packets(await P.PDFDocument.load(await build(template,v,grades,n%2?'Satisfactorily':'Unsatisfactorily')));
    assert.ok(result.datasets.includes(`<Namelfm>EXAMPLE ${n}, Alex</Namelfm>`));
    assert.ok(result.datasets.includes('<Last6moa>0</Last6moa>'));
    assert.ok(result.template.includes(`<value><text>A. EXAMINER ${n}</text></value>`));
    const actual=[...result.datasets.matchAll(/<CheckBox[123]>([01])<\/CheckBox[123]>/g)].map(m=>m[1]);
    const expected=C.gradeItems.flatMap(([id])=>[grades[id]==='Q'?'1':'0',grades[id]==='U'?'1':'0']);
    assert.deepEqual(actual,expected);
    assert.ok(result.datasets.includes(`<Certify>${n%2?'SATISFACTORILY':'UNSATISFACTORILY'}</Certify>`));
  }
});
