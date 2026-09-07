(function () {
  'use strict';
  const C=InstrumentCore;
  const el=id=>document.getElementById(id);
  const value=id=>el(id)?.value.trim() || '';
  const field=(id,label,type='text',extra='')=>`<div class="form-group"><label for="inst_${id}">${label}</label><input id="inst_${id}" type="${type}" ${extra}></div>`;
  const numeric=(id,label)=>field(id,label,'number','min="0" step="0.1"');
  const select=(id,label,options)=>`<div class="form-group"><label for="inst_${id}">${label}</label><select id="inst_${id}">${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div>`;
  const row=html=>`<div class="form-row">${html}</div>`;
  let report=null, appliedDate=null, reportApplied=false, customRemarks=false, importVersion=0,suggestedExpiration='';
  const card=document.createElement('div');
  card.id='cfg_instrument';card.className='form-card';
  card.innerHTML=`<div class="form-card-header"><span>Instrument Check</span><span class="form-badge">OPNAV 3710/2</span></div>
  <div class="form-card-body">
    <p class="instrument-help">Your original OPNAV 3710/2, REV. FEB-2023. Open the downloaded PDF in Adobe Acrobat Reader to review, edit any entry, save, and sign.</p>
    <div class="section-title">Check flight</div>
    ${row(field('flightDate','8. Date of check flight','date')+field('lastEvaluation','4. Date of last evaluation','date'))}
    <label class="instrument-inline"><input type="checkbox" id="inst_initial"> Initial evaluation (no previous evaluation date)</label>
    ${row(select('crewPosition','6. Pilot position',[['','-- Select --'],['AIRCRAFT COMMANDER','Aircraft Commander'],['SECOND PILOT','Second Pilot'],['THIRD PILOT','Third Pilot']])+field('aircraftModel','9. Aircraft model','text','value="E-6B"'))}
    ${row(select('buno','10. Aircraft BUNO / simulator',[]))}
    <p class="instrument-help">Pilot position, aircraft/simulator, flight date, duration, and expiration fill across selected forms. You can edit an individual form’s flight details when they differ.</p>
    ${row(numeric('flightDuration','11. Flight duration (hours)')+field('expiration','12. Expiration date (review suggestion)','date'))}
    <section id="inst_importPanel"><div class="section-title">1. Import SHARP flight history</div>
    <label for="inst_file" class="instrument-file-label">Average Instrument Logbook (.xlsx)</label>
    <input type="file" id="inst_file" accept=".xlsx" aria-describedby="inst_importHelp">
    <p id="inst_importHelp" class="instrument-help">Choose your Average Instrument Logbook export. Processing stays on this device.</p>
    <p id="inst_importStatus" class="instrument-status" role="status" aria-live="polite"></p>
    <div id="inst_report" hidden>
      <p id="inst_identity"></p>
      <button type="button" class="instrument-button" id="inst_useIdentity">Use name and rank from SHARP</button>
      <p id="inst_coverage" class="instrument-help"></p>
      <div id="inst_checkDay" hidden>
        <p class="instrument-help">Flights logged on checkride day are excluded from recent totals. Select only a separate sortie completed before the evaluation.</p>
        <div id="inst_checkDayRows"></div>
      </div>
      <button type="button" class="instrument-button" id="inst_apply">Calculate & fill recent totals</button>
      <button type="button" class="instrument-button" id="inst_clear">Remove imported workbook</button>
      <p id="inst_summary" class="instrument-help"></p>
    </div></section>
    <hr class="divider"><div class="section-title">13. Approach counts</div>
    <p class="instrument-help">Recent totals count flights after the date six or twelve months before the checkride. The checkride itself is excluded; only separate earlier sorties may count on that day. <a href="https://www.med.navy.mil/Portals/62/Documents/NMFSC/NMOTC/NAMI/ARWG/Miscellaneous/CNAF%20M_3710_7%20FEB%202025.pdf?ver=2QUgzKUiKkzOeFOiPQNxxA%3D%3D" target="_blank" rel="noopener">CNAF M-3710.7 §13.2.1</a></p>
    <div class="instrument-table-wrap"><table class="grade-table"><thead><tr><th>Approaches</th><th>Last 6 months</th><th>Last 12 months</th></tr></thead><tbody>
      ${['precision','nonprecision'].map(k=>`<tr><td>${k==='precision'?'Precision':'Non-precision'}</td>${[6,12].map(n=>`<td><input id="inst_${k}${n}" type="number" min="0" step="1" aria-label="${k==='precision'?'Precision':'Non-precision'} approaches, last ${n} months"></td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    <div class="section-title">18. Instrument pilot time</div>
    <div class="instrument-table-wrap"><table class="grade-table"><thead><tr><th>Hours</th><th>Last 12 months</th><th>Last 6 months</th><th>Total all years</th></tr></thead><tbody>
      ${['actual','simulated','instrument'].map(k=>`<tr><td>${{actual:'Actual',simulated:'Simulated',instrument:'Total'}[k]}</td>${[12,6,'All'].map(n=>`<td><input id="inst_${k}${n}" type="number" min="0" step="0.1" ${k==='instrument'?'readonly':''} aria-label="${k} instrument hours, ${n==='All'?'all years':`last ${n} months`}"></td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    <p class="instrument-help">Enter lifetime actual and simulated instrument time from your full logbook. Total pilot time and hours in model use the shared Flight Information fields above.</p>
    ${row(numeric('yearsFlying','Total years flying experience (military & commercial)'))}
    <hr class="divider"><div class="section-title">Rating and written examination</div>
    ${row(field('currentRating','15. Current rating','text','value="STANDARD"')+field('issuedRating','16. Issued rating','text','value="STANDARD"'))}
    <div class="form-row instrument-exam-row">${select('certification','19. Written exam result',[['','-- Select --'],['Satisfactorily','Satisfactory'],['Unsatisfactorily','Unsatisfactory']])+numeric('exam1','20. First exam grade')}</div>
    <details><summary>Second or third written examination</summary>${row(numeric('exam2','21. Second exam grade')+numeric('exam3','22. Third exam grade'))}</details>
    ${row(field('examinerName','23. Examining officer name')+select('examinerRank','24. Examining officer rank',[['','-- Select --'],['ENS','ENS'],['LTJG','LTJG'],['LT','LT'],['LCDR','LCDR'],['CDR','CDR'],['CAPT','CAPT']]))}
    ${row(field('examinerUnit','25. Examining officer unit')+field('examDate','26. Date of exam','date'))}
    <p id="inst_examinerSaved" class="instrument-help" aria-live="polite">Examining officer details are saved automatically on this browser.</p>
    <hr class="divider"><div class="section-title">27–28. Flight evaluation</div>
    <p class="instrument-help">Choose Q or U for each item evaluated. Leave items not evaluated blank.</p>
    <button type="button" class="instrument-button" id="inst_qualify">Mark standard evaluation items Q</button>
    <div class="instrument-grade-columns">${[1,2].map(part=>`<div><h3>${part===1?'Part one: Basic instruments':'Part two: Instrument flight'}</h3>${C.gradeItems.filter(g=>g[2]===part).map(([id,label])=>`<div class="instrument-grade"><label for="inst_grade_${id}">${label}</label><select id="inst_grade_${id}" aria-label="${label} grade"><option value="">—</option><option value="Q">Q</option><option value="U">U</option></select></div>`).join('')}</div>`).join('')}</div>
    <details><summary>Additional evaluated items</summary>${row(field('basicOther','Other basic instruments description')+field('flightOther','Other instrument flight description'))}</details>
    <hr class="divider"><div class="section-title">33. Remarks</div>
    ${row(select('recommendation','Rating recommendation',[['','-- Select --'],['renew','Renew rating'],['issue','Issue rating'],['unqualified','Not qualified']]))}
    <label for="inst_remarks" class="instrument-file-label">Remarks</label><textarea id="inst_remarks" rows="5" maxlength="1200"></textarea>
    <button type="button" class="instrument-button" id="inst_resetRemarks">Use generated remarks</button>
    <hr class="divider"><div class="section-title">Signature dates and document markings</div>
    <p class="instrument-help">Flight examiner and unit commander names come from the shared Signatures section below. Their signatures and the applicant’s signature remain blank for signing.</p>
    ${row(field('flightExaminerDate','31. Flight examiner date','date')+field('commanderDate','36. Unit commander date','date'))}
    ${row(select('commander','34–35. Unit commander',[]))}
    <details><summary>CUI markings</summary>
      ${row(field('controlledBy','Controlled by')+field('cuiCategory','CUI category'))}
      ${row(field('distribution','LDC')+field('pointOfContact','POC'))}
    </details>
  </div>`;
  document.querySelector('#generateBtn').previousElementSibling.before(card);
  // These selectors mirror the existing shared controls, including optgroups.
  el('inst_buno').innerHTML=el('buno').innerHTML;
  el('inst_commander').innerHTML=el('commanderName').innerHTML;
  for(const option of el('inst_buno').options){
    if(option.value==='2F144A-1')option.textContent='OFT-1 / 2F144A-1';
    if(option.value==='2F144A-2')option.textContent='OFT-2 / 2F144A-2';
  }
  const examinerKey='checkride.instrument.examiner.v1';
  const examinerDefaults={examinerName:'R. A. BUCHHOLZ',examinerRank:'LT',examinerUnit:'VQ-7'};
  let examinerPreferences=examinerDefaults;
  try{
    const saved=JSON.parse(localStorage.getItem(examinerKey));
    if(saved&&Object.keys(examinerDefaults).every(key=>typeof saved[key]==='string'))examinerPreferences=saved;
  }catch{}
  for(const key of Object.keys(examinerDefaults)){
    el('inst_'+key).value=examinerPreferences[key];
    el('inst_'+key).addEventListener('input',()=>{
      const settings=Object.fromEntries(Object.keys(examinerDefaults).map(id=>[id,value('inst_'+id)]));
      try{localStorage.setItem(examinerKey,JSON.stringify(settings));el('inst_examinerSaved').textContent='Examining officer details saved on this browser.';}
      catch{el('inst_examinerSaved').textContent='Browser storage is unavailable. Examiner changes apply to this form only.';}
    });
  }
  // Put import and its reporting date before personnel entry, so the user
  // can start with their workbook instead of retyping information it contains.
  const importPanel=el('inst_importPanel');importPanel.className='section';
  el('successBanner').after(importPanel);
  importPanel.prepend(el('inst_flightDate').closest('.form-group'));
  importPanel.prepend(importPanel.querySelector('.section-title'));
  el('inst_flightDate').labels[0].textContent='Check-flight date';
  importPanel.querySelector('.form-group').style.marginBottom='16px';

  function totals() {
    for (const n of [6,12,'All']) {
      const a=value(`inst_actual${n}`),s=value(`inst_simulated${n}`);
      el(`inst_instrument${n}`).value=a!==''&&s!=='' ? C.round(Number(a)+Number(s)).toFixed(1) : '';
    }
  }
  function generatedRemarks() {
    const who=`${value('rank')||'[RANK]'} ${value('lastName')||'[LAST NAME]'}`;
    const model=value('inst_aircraftModel')||'[AIRCRAFT MODEL]';
    const rating=value('inst_issuedRating')||'[RATING]';
    const base=`This flight was conducted in accordance with the NATOPS Instrument Flight Manual, CNAF M-3710.7 series, and the ${model} NATOPS Flight Manual.`;
    const rec=value('inst_recommendation');
    if (!rec) return base;
    if (rec==='unqualified') return `${base} ${who} is not qualified for the requested instrument rating. Document deficiencies and required follow-up here.`;
    return `${base} ${who} executed all evaluated maneuvers and performed all evaluated procedures in a safe, proficient, and professional manner. Under the criteria set forth in CNAF M-3710.7 series and the NATOPS Instrument Flight Manual, ${who} is fully qualified and it is recommended that ${who}'s ${rating} Instrument Rating be ${rec==='renew'?'renewed':'issued'}.`;
  }
  function refresh() {
    totals();
    if (!customRemarks) el('inst_remarks').value=generatedRemarks();
    el('inst_lastEvaluation').disabled=el('inst_initial').checked;
    importPanel.hidden=!el('chk_instrument').checked;
    if (appliedDate && appliedDate!==value('inst_flightDate')) status('Check-flight date changed. Recalculate recent totals for the new date.',true);
  }
  function status(text,error=false) {el('inst_importStatus').textContent=text;el('inst_importStatus').classList.toggle('instrument-error',error);}
  let checkDayDate=null;
  function showCheckDayRows(force=false){
    const date=value('inst_flightDate');
    if(!force&&date===checkDayDate)return;
    checkDayDate=date;
    const rows=report?.flights.filter(r=>r.date===value('inst_flightDate'))||[];
    el('inst_checkDay').hidden=!rows.length;
    el('inst_checkDayRows').replaceChildren();
    for(const r of rows){
      const label=document.createElement('label');label.className='instrument-inline';
      const input=document.createElement('input');input.type='checkbox';input.value=String(r.sourceRow);
      input.addEventListener('change',()=>el('inst_apply').click());
      label.append(input,document.createTextNode(` Earlier separate sortie: row ${r.sourceRow}, ${r.frame}, ${r.total.toFixed(1)} hours (${r.actual.toFixed(1)} actual / ${r.simulated.toFixed(1)} simulated)`));
      el('inst_checkDayRows').append(label);
    }
  }
  card.addEventListener('input',refresh);card.addEventListener('change',refresh);
  el('chk_instrument').addEventListener('change',refresh);
  el('inst_qualify').addEventListener('click',()=>{
    for(const [id]of C.gradeItems)if(!['takeoff','basicOther','flightOther'].includes(id))el('inst_grade_'+id).value='Q';
    refresh();
  });
  el('inst_remarks').addEventListener('input',()=>{customRemarks=true;});
  el('inst_resetRemarks').addEventListener('click',()=>{customRemarks=false;refresh();});
  for (const id of ['rank','lastName']) el(id).addEventListener('input',refresh);
  el('inst_file').addEventListener('change',async()=>{
    const file=el('inst_file').files[0];if(!file)return;
    const version=++importVersion;
    report=null;reportApplied=false;el('inst_report').hidden=true;status('Reading SHARP workbook…');
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose the .xlsx Average Instrument Logbook export.');
      const parsed=await readSharpWorkbook(await file.arrayBuffer());
      if(version!==importVersion)return;
      report=parsed;
      showCheckDayRows(true);
      el('inst_report').hidden=false;
      el('inst_identity').textContent=report.person ? `SHARP record: ${report.person.lastName}, ${report.person.given}, ${report.person.rank}` : 'No aviator name found in this report.';
      el('inst_useIdentity').disabled=!report.person;
      el('inst_coverage').textContent=`${report.flights.length} entries dated ${C.displayDate(report.firstDate)} through ${C.displayDate(report.lastDate)}. Confirm the export covers the full reporting periods; first and last flight dates do not establish report completeness.`;
      el('inst_summary').textContent='';
      status('Workbook loaded. Set the check-flight date, then calculate recent totals.');
      if(report.person&&!value('lastName')){
        el('lastName').value=report.person.lastName.toUpperCase();
        if(!value('rank'))el('rank').value=report.person.rank.toUpperCase();
        if(report.person.given.length>1&&!value('firstName'))el('firstName').value=report.person.given;
        if(report.person.given.length===1)el('firstName').placeholder=`Full first name (SHARP: ${report.person.given}.)`;
        updateEvalueeName();updateAllPreviews();refresh();
      }
      if(value('inst_flightDate'))el('inst_apply').click();
    } catch(e) {if(version===importVersion)status(e.message,true);}
  });
  el('inst_clear').addEventListener('click',()=>{
    ++importVersion;report=null;appliedDate=null;reportApplied=false;el('inst_file').value='';el('inst_report').hidden=true;
    status('Imported workbook removed. Entered values remain available for manual review.');
  });
  el('inst_useIdentity').addEventListener('click',()=>{
    if(!report?.person)return;
    el('lastName').value=report.person.lastName.toUpperCase();el('rank').value=report.person.rank.toUpperCase();
    // SHARP commonly supplies only a first initial. Do not invent a full name or retain another aviator's.
    el('firstName').value=report.person.given.length>1 ? report.person.given : '';
    el('middleInit').value='';el('dodId').value='';
    updateEvalueeName();updateAllPreviews();refresh();
    status('Name and rank applied. Enter the full first name, middle initial (if any), and EDIPI from the personnel record.');
  });
  el('inst_apply').addEventListener('click',()=>{
    if(!report)return;
    try {
      const priorSortieRows=Array.from(el('inst_checkDayRows').querySelectorAll('input:checked'),e=>Number(e.value));
      const s=C.summarize(report,value('inst_flightDate'),value('inst_aircraftModel'),{priorSortieRows});
      if(!s.all.count)throw new Error('There are no report entries on or before this check-flight date.');
      for(const [n,summary] of [[6,s.six],[12,s.twelve]]) for(const key of ['precision','nonprecision','actual','simulated']) el(`inst_${key}${n}`).value=key.includes('precision') ? summary[key] : summary[key].toFixed(1);
      appliedDate=s.asOf;reportApplied=true;totals();
      el('inst_summary').textContent=`6 months: after ${C.displayDate(s.first6)} through ${C.displayDate(s.asOf)} (${s.six.count} entries). 12 months: after ${C.displayDate(s.first12)} through ${C.displayDate(s.asOf)} (${s.twelve.count} entries). ${s.checkDayExcluded} check-day entries and ${s.excluded} later entries excluded from recent totals. Report-only hours, including all entries through the check date: ${s.all.total.toFixed(1)} total; ${s.modelHours.toFixed(1)} in ${value('inst_aircraftModel')}. These are not lifetime totals.`;
      status('Recent totals filled. Review report coverage and values, then enter lifetime figures.');
    }catch(e){status(e.message,true);}
  });
  el('inst_flightDate').addEventListener('change',()=>{
    showCheckDayRows();
    if(report)el('inst_apply').click();
    // Suggest the example's expiration convention; a user's edit always wins.
    const date=value('inst_flightDate');
    if(date&&(!value('inst_expiration')||value('inst_expiration')===suggestedExpiration)){
      const d=C.isoDate(date);const last=new Date(Date.UTC(d.getUTCFullYear()+1,d.getUTCMonth()+1,0));
      suggestedExpiration=last.toISOString().slice(0,10);el('inst_expiration').value=suggestedExpiration;
    }
    refresh();
  });

  function validateInstrument() {
    const errors=[];
    for(const panel of [card,importPanel])panel.querySelectorAll('.invalid').forEach(e=>e.classList.remove('invalid'));
    const error=(id,message)=>{el('inst_'+id)?.classList.add('invalid');errors.push(message);};
    const required=['flightDate','crewPosition','aircraftModel','flightDuration','expiration','currentRating','issuedRating','certification','exam1','examinerName','examinerRank','examinerUnit','examDate','yearsFlying','recommendation','remarks'];
    if(!el('inst_initial').checked)required.push('lastEvaluation');
    for(const id of required) if(!value('inst_'+id))error(id,`Instrument: ${el('inst_'+id).labels?.[0]?.textContent||id}`);
    for(const id of ['flightDate','expiration','examDate','flightExaminerDate','commanderDate',...el('inst_initial').checked?[]:['lastEvaluation']]) {
      if(value('inst_'+id)) try{C.isoDate(value('inst_'+id));}catch{error(id,`Instrument: invalid ${id}`);}
    }
    for(const id of ['precision6','precision12','nonprecision6','nonprecision12','actual6','actual12','actualAll','simulated6','simulated12','simulatedAll','yearsFlying','flightDuration','exam1','exam2','exam3']) {
      if(['exam2','exam3'].includes(id)&&!value('inst_'+id))continue;
      try {const n=C.number(value('inst_'+id),id);if(id.includes('precision')&&!Number.isSafeInteger(n))throw new Error(`${id} must be a whole number.`);}catch(e){error(id,e.message);}
    }
    if(value('inst_flightDate')&&value('inst_expiration')&&value('inst_expiration')<value('inst_flightDate'))error('expiration','Expiration precedes the check flight.');
    if(!el('inst_initial').checked&&value('inst_lastEvaluation')>value('inst_flightDate'))error('lastEvaluation','Last evaluation is after the check flight.');
    for(const key of ['precision','nonprecision','actual','simulated']) if(Number(value(`inst_${key}6`))>Number(value(`inst_${key}12`)))error(key+'6',`${key}: six-month total exceeds twelve-month total.`);
    for(const key of ['actual','simulated']) if(Number(value(`inst_${key}12`))>Number(value(`inst_${key}All`)))error(key+'All',`${key}: lifetime hours are below twelve-month hours.`);
    if(appliedDate&&appliedDate!==value('inst_flightDate'))error('flightDate','Recalculate SHARP totals after changing the check-flight date, or remove the import to use manual totals.');
    if(report&&!reportApplied)errors.push('Calculate recent totals for this imported workbook, or remove the import to use manual values.');
    if(reportApplied&&report?.person&&value('lastName').toUpperCase()!==report.person.lastName.toUpperCase())errors.push('The SHARP aviator does not match the entered last name. Use the matching report or remove the import.');
    const grades=Object.fromEntries(C.gradeItems.map(([id])=>[id,value('inst_grade_'+id)]));
    if(!Object.values(grades).some(Boolean))errors.push('Instrument: select grades for the items evaluated.');
    for(const key of ['basicOther','flightOther'])if(grades[key]&&!value('inst_'+key))error(key,'Describe the other evaluated item.');
    if(['renew','issue'].includes(value('inst_recommendation'))&&(Object.values(grades).includes('U')||value('inst_certification')==='Unsatisfactorily'))error('recommendation','A qualified recommendation conflicts with an unqualified item or unsatisfactory written exam.');
    if(!C.splitRankName(value('evaluatorName')).rank)errors.push('Instrument: include the flight examiner’s rank before their name.');
    const commander=value('commanderName');
    if(commander&&!C.splitRankName(commander).rank)error('commander','Choose the unit commander.');
    if(value('inst_recommendation')==='unqualified'&&!customRemarks)error('remarks','Add the actual deficiencies and follow-up to the remarks.');
    if(value('inst_remarks').length>1200)error('remarks','Shorten remarks to 1,200 characters to fit the original form.');
    for(const id of ['totalHours','modelHours'])try{C.number(value(id),id);}catch(e){errors.push(e.message);el(id).classList.add('invalid');}
    if(!/^\d{10}$/.test(value('dodId')))errors.push('EDIPI must contain exactly 10 digits.');
    return errors;
  }
  async function generateInstrument() {
    const response=await fetch('templates/OPNAV-3710-2-FEB-2023.pdf');
    if(!response.ok)throw new Error('The instrument PDF template could not be loaded.');
    const fields={};
    for(const id of ['crewPosition','aircraftModel','flightDuration','currentRating','issuedRating','exam1','exam2','exam3','examinerName','examinerRank','examinerUnit','yearsFlying','remarks','basicOther','flightOther','controlledBy','cuiCategory','distribution','pointOfContact','precision6','precision12','nonprecision6','nonprecision12','actual6','actual12','actualAll','simulated6','simulated12','simulatedAll','instrument6','instrument12','instrumentAll'])fields[id]=value('inst_'+id);
    for(const id of ['flightDate','expiration','examDate','flightExaminerDate','commanderDate'])fields[id]=value('inst_'+id);
    fields.lastEvaluation=el('inst_initial').checked?'':value('inst_lastEvaluation');
    fields.applicantName=`${value('lastName').toUpperCase()}, ${value('firstName')}${value('middleInit')?', '+value('middleInit').toUpperCase()+'.':''}`;
    const units={'FAIRECONRON SEVEN':'VQ-7','FAIRECONRON THREE':'VQ-3','FAIRECONRON FOUR':'VQ-4','AIRTEVRON TWO ZERO':'VX-20'};
    const positionLabel=el('inst_crewPosition').selectedOptions[0]?.textContent||'';
    fields.crewPosition=`${value('inst_aircraftModel')} ${positionLabel}`.trim();
    const buno=value('buno');
    Object.assign(fields,{rank:value('rank'),edipi:value('dodId'),unit:units[value('squadron')]||value('squadron'),totalHours:value('totalHours'),modelHours:value('modelHours'),buno:/^2F144A-[12]$/.test(buno)?`OFT-${buno.slice(-1)}/${buno}`:buno});
    const evaluator=C.splitRankName(value('evaluatorName')),commander=C.splitRankName(value('commanderName'));
    Object.assign(fields,{flightExaminerName:evaluator.name,flightExaminerRank:evaluator.rank,commanderName:commander.name,commanderRank:commander.rank});
    const grades=Object.fromEntries(C.gradeItems.map(([id])=>[id,value('inst_grade_'+id)]));
    const bytes=await buildInstrumentPdf(await response.arrayBuffer(),fields,grades,value('inst_certification'));
    const filename=`OPNAV_3710-2_${value('lastName').replace(/[^a-z0-9_-]/gi,'_').toUpperCase()}_${value('inst_flightDate')}.pdf`;
    saveAs(new Blob([bytes],{type:'application/pdf'}),filename);
    return filename;
  }
  window.instrumentForm={validate:validateInstrument,generate:generateInstrument,refresh,isSuggestedExpiration:()=>!!suggestedExpiration&&value('inst_expiration')===suggestedExpiration};
  refresh();
})();
