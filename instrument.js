(function () {
  'use strict';
  const C=InstrumentCore,R=InstrumentRules;
  const el=id=>document.getElementById(id);
  const value=id=>el(id)?.value.trim() || '';
  const field=(id,label,type='text',extra='')=>`<div class="form-group"><label for="inst_${id}">${label}</label><input id="inst_${id}" type="${type}" ${extra}></div>`;
  const numeric=(id,label)=>field(id,label,'number','min="0" step="0.1"');
  const select=(id,label,options)=>`<div class="form-group"><label for="inst_${id}">${label}</label><select id="inst_${id}">${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div>`;
  const row=html=>`<div class="form-row">${html}</div>`;
  let report=null, appliedDate=null, reportApplied=false, customRemarks=false, importVersion=0,suggestedExpiration='',reviews={},auditResult=null,reviewPage=0,importSnapshot={},careerSnapshot={};
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
    ${row(field('currentExpiration','Existing instrument rating expiration (for renewal)','date'))}
    <p id="inst_expirationHelp" class="instrument-help">Renewals within 60 days of the existing expiration retain that expiration month. §13.1.2.1.</p>
    <details><summary>Authorized extension or other expiration adjustment</summary>${field('expirationAuthority','Authority and supporting extension record')}</details>
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
      <details id="inst_sourceReview"><summary>Review aircraft and simulator entries</summary>
        <p class="instrument-help">Frame identifies the model, not whether it was an aircraft or simulator. Use the flight record to classify entries. Approved simulator credit requires Appendix K approval, applicable model-manager authorization, and pilot-station use.</p>
        ${row(select('reviewFrame','Filter aircraft model',[['','All models']])+select('reviewKind','Apply classification to filtered entries',[['','Choose classification'],['aircraft','Aircraft'],['simulator','Simulator — approval not verified'],['approvedSimulator','Approved simulator — pilot station confirmed'],['unapprovedSimulator','Simulator — not eligible'],['unknown','Unclassified']]))}
        ${field('reviewDevice','Simulator device / approval record (when applicable)')}
        <button type="button" class="instrument-button" id="inst_classify">Apply to filtered entries</button>
        <div class="instrument-table-wrap"><table class="grade-table"><thead><tr><th>Date / row</th><th>Model</th><th>Logged hours<br>Actual / simulated</th><th>Approaches<br>Precision / nonprecision</th><th>Source classification</th><th>Device / approval record</th></tr></thead><tbody id="inst_sourceRows"></tbody></table></div>
        <button type="button" class="instrument-button" id="inst_previousRows">Previous 50</button><span id="inst_rowPage"></span><button type="button" class="instrument-button" id="inst_nextRows">Next 50</button>
      </details>
      <label class="instrument-inline"><input type="checkbox" id="inst_recordsConfirmed"> Confirm these are pilot instrument hours and eligible final approaches from the flight record.</label>
      <details><summary>What qualifies for instrument and approach credit?</summary><p class="instrument-help">Actual instrument time may be logged by both pilots in a multipiloted aircraft; simulated instrument time is logged by the pilot manipulating the controls. Approach credit requires principal active control, with the actual-condition student-instructor exception in §10.3.3. Count the final approach completed to landing or missed approach once. Coupled approaches do not satisfy instrument-rating approach minimums. LPV is precision only at DA 300 feet AGL or less; LNAV/VNAV and higher-DA LPV are nonprecision. §10.3.3, Appendix F.6 and Glossary.</p></details>
      <div id="inst_creditSummary" class="instrument-help" aria-live="polite"></div>
      <details><summary>Import career totals from a complete report</summary>
        <label class="instrument-inline"><input type="checkbox" id="inst_careerComplete"> This report includes the complete career history through the evaluation, across all aircraft and earlier civilian flying.</label>
        <label class="instrument-inline"><input type="checkbox" id="inst_pilotTotalsConfirmed"> The report's Total column is first-pilot plus copilot time, excluding special crew time.</label>
        <button type="button" class="instrument-button" id="inst_fillCareer">Fill available career totals</button>
        <p class="instrument-help">Lifetime instrument hours use reviewed pilot entries. Aircraft pilot totals also require aircraft/simulator classification and FPT+CPT, or confirmation of the Total column's meaning. The evaluation itself and later entries are excluded.</p>
      </details>
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
    <p class="instrument-help">Actual and simulated are instrument conditions; simulated conditions can occur in an airplane. These are logged hours. Simulator qualification credit is checked separately. Enter lifetime figures from your complete pilot logbook, or use the career import above.</p>
    ${row(numeric('yearsFlying','Total years flying experience (military & commercial)'))}
    <details id="inst_manualCredit"><summary>Verify minimum credit from manual logbook totals</summary>
      <p class="instrument-help">For a qualified recommendation without an imported history, identify the aircraft and approved-simulator portions needed to establish the minimums. Actual instrument hours already supply a lower bound for aircraft instrument time. Leave extra simulator credit blank when the aircraft portion alone meets the minimum.</p>
      ${[6,12].map(n=>`<h3>Last ${n} months</h3>${['instrument','precision','nonprecision'].map(key=>row(numeric(`manualAircraft_${key}${n}`,`${key}: aircraft portion`)+numeric(`manualSimulator_${key}${n}`,`${key}: approved simulator portion`))).join('')}`).join('')}
      <h3>Career instrument credit</h3>${row(numeric('manualAircraft_instrumentAll','Aircraft instrument hours (defaults to lifetime actual)')+numeric('manualSimulator_instrumentAll','Approved simulator instrument hours'))}
    </details>
    <hr class="divider"><div class="section-title">Rating and written examination</div>
    ${row(field('currentRating','15. Current rating','text','value="STANDARD"')+field('issuedRating','16. Issued rating','text','value="STANDARD"'))}
    ${select('ratingBasis','Instrument-rating requirement basis',[['standard','Ordinary standard requirements'],['returning','Expired rating: return under §13.1.1.2 / §13.2.1(8)'],['combat','Expired rating: qualifying sustained combat return, §13.2.1(9)'],['cnatra','CNATRA initial syllabus, §13.2.1(7)']])}
    <div id="inst_exceptionDetails" hidden>${field('exceptionRecord','Record supporting the selected exception')}</div>
    <details id="inst_specialDetails" hidden><summary>Special-rating experience and issuing authority</summary>
      ${row(numeric('specialPilotHours','Qualifying military / certificated civil pilot hours')+numeric('militaryActual','Military actual instrument pilot hours'))}
      <label class="instrument-inline"><input type="checkbox" id="inst_specialReduced"> Reduced experience minimums authorized under §13.2.2(4)</label>
      ${field('specialAuthority','Issuing authority / reduction authorization')}
    </details>
    <div class="form-row instrument-exam-row">${select('certification','19. Written exam result',[['','-- Select --'],['Satisfactorily','Satisfactory'],['Unsatisfactorily','Unsatisfactory']])+numeric('exam1','20. First exam grade')}</div>
    <details><summary>Second or third written examination</summary>${row(numeric('exam2','21. Second exam grade')+numeric('exam3','22. Third exam grade'))}</details>
    ${row(field('examinerName','23. Examining officer name')+select('examinerRank','24. Examining officer rank',[['','-- Select --'],['ENS','ENS'],['LTJG','LTJG'],['LT','LT'],['LCDR','LCDR'],['CDR','CDR'],['CAPT','CAPT']]))}
    ${row(field('examinerUnit','25. Examining officer unit')+field('examDate','26. Date of exam','date'))}
    <label class="instrument-inline" id="inst_sameDayExamLabel" hidden><input type="checkbox" id="inst_sameDayExam"> Written examination was Qualified before the evaluation began.</label>
    <p id="inst_examWindow" class="instrument-help" aria-live="polite"></p>
    <p id="inst_examinerSaved" class="instrument-help" aria-live="polite">Examining officer details are saved automatically on this browser.</p>
    <hr class="divider"><div class="section-title">27–28. Flight evaluation</div>
    <p class="instrument-help">Choose Q or U for each item evaluated. Leave items not evaluated blank.</p>
    <button type="button" class="instrument-button" id="inst_qualify">Mark listed evaluation items Q</button>
    <div class="instrument-grade-columns">${[1,2].map(part=>`<div><h3>${part===1?'Part one: Basic instruments':'Part two: Instrument flight'}</h3>${C.gradeItems.filter(g=>g[2]===part).map(([id,label])=>`<div class="instrument-grade"><label for="inst_grade_${id}">${label}</label><select id="inst_grade_${id}" aria-label="${label} grade"><option value="">—</option><option value="Q">Q</option><option value="U">U</option></select></div>`).join('')}</div>`).join('')}</div>
    <details><summary>Additional evaluated items</summary>${row(field('basicOther','Other basic instruments description')+field('flightOther','Other instrument flight description'))}</details>
    <hr class="divider"><div class="section-title">33. Remarks</div>
    ${row(select('recommendation','Rating recommendation',[['','-- Select --'],['review','Prepare for review'],['renew','Renew rating'],['issue','Issue rating'],['unqualified','Not qualified']]))}
    <label for="inst_remarks" class="instrument-file-label">Remarks</label><textarea id="inst_remarks" rows="5" maxlength="1200"></textarea>
    <button type="button" class="instrument-button" id="inst_resetRemarks">Use generated remarks</button>
    <label class="instrument-inline"><input type="checkbox" id="inst_requirementReview"> Examining/issuing authority has reviewed Chapter 13 requirements, source records, the applicable evaluation syllabus, simulator authorization, and any documented exceptions.</label>
    <p class="instrument-help">Required before an issued/renewed recommendation. SHARP totals alone cannot establish examiner designation, ground training, aircraft qualification, syllabus completion, or issuing authority. §§13.1–13.5.</p>
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
    if (rec==='review') return `${base} Recorded information is submitted for examiner review. No instrument-rating qualification recommendation is made pending verification of the source records and applicable requirements.`;
    if (rec==='unqualified') return `${base} ${who} is not qualified for the requested instrument rating. Document deficiencies and required follow-up here.`;
    return `${base} ${who} executed all evaluated maneuvers and performed all evaluated procedures in a safe, proficient, and professional manner. Under the criteria set forth in CNAF M-3710.7 series and the NATOPS Instrument Flight Manual, ${who} is fully qualified and it is recommended that ${who}'s ${rating} Instrument Rating be ${rec==='renew'?'renewed':'issued'}.`;
  }
  function refresh() {
    totals();
    if (!customRemarks) el('inst_remarks').value=generatedRemarks();
    el('inst_lastEvaluation').disabled=el('inst_initial').checked;
    el('inst_exceptionDetails').hidden=value('inst_ratingBasis')==='standard';
    el('inst_specialDetails').hidden=value('inst_issuedRating').toUpperCase()!=='SPECIAL';
    el('inst_manualCredit').hidden=!!report;
    const sameDay=!!value('inst_examDate')&&value('inst_examDate')===value('inst_flightDate');
    el('inst_sameDayExamLabel').hidden=!sameDay;
    try{el('inst_examWindow').textContent=R.exam(value('inst_flightDate'),value('inst_examDate'),el('inst_sameDayExam').checked).message;}catch{el('inst_examWindow').textContent='Enter valid examination and flight dates.';}
    importPanel.hidden=!el('chk_instrument').checked;
    if (appliedDate && appliedDate!==value('inst_flightDate')) status('Check-flight date changed. Recalculate recent totals for the new date.',true);
  }
  function status(text,error=false) {el('inst_importStatus').textContent=text;el('inst_importStatus').classList.toggle('instrument-error',error);}
  let checkDayDate=null;
  const kindLabels={aircraft:'Aircraft',approvedSimulator:'Approved simulator',simulator:'Simulator — approval unverified',unapprovedSimulator:'Simulator — not eligible',unknown:'Unclassified'};
  function clearImportedCareer(){
    for(const [id,v] of Object.entries(careerSnapshot))if(value(id)===v)el(id).value='';
    careerSnapshot={};totals();
  }
  function clearImportedPilotHours(){
    for(const id of ['totalHours','modelHours']){if(careerSnapshot[id]!==undefined&&value(id)===careerSnapshot[id])el(id).value='';delete careerSnapshot[id];}
  }
  function priorRows(){return Array.from(el('inst_checkDayRows').querySelectorAll('input:checked'),e=>Number(e.value));}
  function updateAudit(){
    if(!report||!value('inst_flightDate')){auditResult=null;el('inst_creditSummary').replaceChildren();return;}
    try{
      auditResult=R.audit(report,value('inst_flightDate'),value('inst_aircraftModel'),{reviews,priorSortieRows:priorRows(),recordsConfirmed:el('inst_recordsConfirmed').checked,pilotTotalsConfirmed:el('inst_pilotTotalsConfirmed').checked});
      const box=el('inst_creditSummary');box.replaceChildren();
      const note=document.createElement('p');note.textContent=`${auditResult.unknownCount} entries before the evaluation have no aircraft/simulator classification. Logged hours remain unchanged; the checks below cap approved simulator credit separately. §13.2.1.`;box.append(note);
      const table=document.createElement('table');table.className='grade-table';
      table.innerHTML='<thead><tr><th>Minimum checked</th><th>Last 6 months</th><th>Last 12 months</th></tr></thead>';
      const body=document.createElement('tbody');
      for(const [key,label] of [['instrument','Instrument hours'],['precision','Precision approaches'],['nonprecision','Nonprecision approaches']]){
        const tr=document.createElement('tr'),heading=document.createElement('th');heading.textContent=label;tr.append(heading);
        for(const period of ['six','twelve']){
          const x=auditResult[period].checks[key],td=document.createElement('td');
          td.textContent=`${x.credited} / ${x.required} — ${x.status==='pass'?'minimum met':x.status==='below'?'below minimum in this report':'review needed'} (${x.aircraft} aircraft + ${x.simulatorAllowed} simulator credit)`;
          tr.append(td);
        }body.append(tr);
      }table.append(body);const wrap=document.createElement('div');wrap.className='instrument-table-wrap';wrap.append(table);box.append(wrap);
      const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Aircraft and simulator breakdown';detail.append(summary);
      for(const period of ['six','twelve'])for(const kind of R.kinds){const s=auditResult[period].groups[kind];if(!s.count)continue;const p=document.createElement('p');p.textContent=`${period==='six'?'6':'12'} months — ${kindLabels[kind]}: ${s.actual.toFixed(1)} actual + ${s.simulated.toFixed(1)} simulated instrument hours; ${s.precision} precision / ${s.nonprecision} nonprecision approaches (${s.count} entries).`;detail.append(p);}box.append(detail);
      if(auditResult.issues.length){const p=document.createElement('p');p.className='instrument-error';p.textContent=`Source records need review: ${auditResult.issues.slice(0,5).join(' ')}${auditResult.issues.length>5?` Plus ${auditResult.issues.length-5} more issues.`:''}`;box.append(p);}
    }catch(e){auditResult=null;el('inst_creditSummary').textContent=e.message;}
  }
  function showSourceRows(){
    const rows=report?.flights.filter(r=>!value('inst_reviewFrame')||r.frame===value('inst_reviewFrame'))||[];
    reviewPage=Math.min(reviewPage,Math.max(0,Math.ceil(rows.length/50)-1));
    const body=el('inst_sourceRows');body.replaceChildren();
    for(const r of rows.slice(reviewPage*50,(reviewPage+1)*50)){
      const tr=document.createElement('tr');
      for(const text of [`${C.displayDate(r.date)} / ${r.sourceRow}`,r.frame,`${r.total.toFixed(1)} total; ${r.actual.toFixed(1)} / ${r.simulated.toFixed(1)}`,`${r.precision} / ${r.nonprecision}`]){const td=document.createElement('td');td.textContent=text;tr.append(td);}
      const td=document.createElement('td'),choice=document.createElement('select');choice.setAttribute('aria-label',`Aircraft or simulator, row ${r.sourceRow}`);
      for(const kind of R.kinds){const option=document.createElement('option');option.value=kind;option.textContent=kindLabels[kind];choice.append(option);}choice.value=R.classification(r,reviews[r.sourceRow]);td.append(choice);tr.append(td);
      const deviceCell=document.createElement('td'),device=document.createElement('input');device.type='text';device.setAttribute('aria-label',`Device or approval record, row ${r.sourceRow}`);device.value=reviews[r.sourceRow]?.device||r.metadata?.device||r.metadata?.tec||'';deviceCell.append(device);tr.append(deviceCell);
      choice.addEventListener('change',()=>{try{R.classification(r,{kind:choice.value});clearImportedPilotHours();reviews[r.sourceRow]={kind:choice.value,device:device.value.trim()};el('inst_requirementReview').checked=false;updateAudit();}catch(e){status(e.message,true);showSourceRows();}});
      device.addEventListener('input',()=>{reviews[r.sourceRow]={kind:choice.value,device:device.value.trim()};el('inst_requirementReview').checked=false;updateAudit();});body.append(tr);
    }
    el('inst_rowPage').textContent=rows.length?` ${reviewPage*50+1}–${Math.min(rows.length,(reviewPage+1)*50)} of ${rows.length} `:' No entries ';
    el('inst_previousRows').disabled=reviewPage===0;el('inst_nextRows').disabled=(reviewPage+1)*50>=rows.length;
  }
  function updateExpiration(){
    if(!value('inst_flightDate'))return;
    try{
      const s=R.expiration(value('inst_flightDate'),value('inst_currentExpiration'),value('inst_recommendation')==='renew'||(!el('inst_initial').checked&&value('inst_recommendation')!=='issue'));
      if(!value('inst_expiration')||value('inst_expiration')===suggestedExpiration)el('inst_expiration').value=s.date;
      suggestedExpiration=s.date;
      el('inst_expirationHelp').textContent=s.needsCurrentExpiration?'Enter the existing rating expiration to verify the 60-day early-renewal rule. The provisional suggestion uses the evaluation month. §13.1.2.1.':`${s.earlyRenewal?'Early renewal: existing expiration month retained.':'Expiration uses the evaluation month.'} Suggested expiration: ${C.displayDate(s.date)}. §13.1.2.1.`;
    }catch(e){el('inst_expirationHelp').textContent=e.message;}
  }
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
      input.addEventListener('change',()=>{clearImportedCareer();el('inst_apply').click();});
      label.append(input,document.createTextNode(` Earlier separate sortie: row ${r.sourceRow}, ${r.frame}, ${r.total.toFixed(1)} hours (${r.actual.toFixed(1)} actual / ${r.simulated.toFixed(1)} simulated)`));
      el('inst_checkDayRows').append(label);
    }
  }
  function changed(e){if(e.target.id!=='inst_requirementReview')el('inst_requirementReview').checked=false;refresh();}
  card.addEventListener('input',changed);card.addEventListener('change',changed);
  el('chk_instrument').addEventListener('change',refresh);
  el('inst_reviewFrame').addEventListener('change',()=>{reviewPage=0;showSourceRows();});
  el('inst_previousRows').addEventListener('click',()=>{reviewPage--;showSourceRows();});
  el('inst_nextRows').addEventListener('click',()=>{reviewPage++;showSourceRows();});
  el('inst_classify').addEventListener('click',()=>{
    if(!report||!value('inst_reviewKind'))return;
    try{
      const rows=report.flights.filter(r=>!value('inst_reviewFrame')||r.frame===value('inst_reviewFrame'));
      for(const r of rows)R.classification(r,{kind:value('inst_reviewKind')});
      clearImportedPilotHours();
      for(const r of rows)reviews[r.sourceRow]={kind:value('inst_reviewKind'),device:value('inst_reviewDevice')||r.metadata?.device||r.metadata?.tec||''};
      el('inst_requirementReview').checked=false;showSourceRows();updateAudit();status(`Applied source classification to ${rows.length} entries. Review the result against the flight record.`);
    }catch(e){status(e.message,true);}
  });
  for(const id of ['recordsConfirmed','pilotTotalsConfirmed','careerComplete'])el('inst_'+id).addEventListener('change',()=>{if(id==='pilotTotalsConfirmed')clearImportedPilotHours();else clearImportedCareer();el('inst_requirementReview').checked=false;updateAudit();});
  el('inst_fillCareer').addEventListener('click',()=>{
    updateAudit();
    if(!auditResult)return;
    if(!el('inst_careerComplete').checked||!el('inst_recordsConfirmed').checked){status('Confirm complete career coverage and pilot instrument/approach records before using career totals.',true);return;}
    if(auditResult.issues.length){status('Resolve the source-record issues before importing career totals.',true);return;}
    el('inst_actualAll').value=auditResult.career.logged.actual.toFixed(1);el('inst_simulatedAll').value=auditResult.career.logged.simulated.toFixed(1);
    careerSnapshot={inst_actualAll:value('inst_actualAll'),inst_simulatedAll:value('inst_simulatedAll')};
    const aircraftReady=!auditResult.unknownCount&&!auditResult.aircraftAll.missingPilotTime;
    if(aircraftReady){el('totalHours').value=auditResult.aircraftAll.pilotTime.toFixed(1);el('modelHours').value=auditResult.aircraftModel.pilotTime.toFixed(1);Object.assign(careerSnapshot,{totalHours:value('totalHours'),modelHours:value('modelHours')});}
    totals();updateAllPreviews();el('inst_requirementReview').checked=false;
    status(aircraftReady?'Career instrument totals, aircraft pilot hours, and aircraft hours in model filled. Simulator sessions are separate from aircraft pilot hours.':'Career instrument totals filled. Aircraft pilot/model totals still require source classification and FPT+CPT or a confirmed Total-column basis.',!aircraftReady);
  });
  for(const id of ['currentExpiration','recommendation','initial'])el('inst_'+id).addEventListener('change',updateExpiration);
  for(const id of ['examDate','flightDate'])el('inst_'+id).addEventListener('change',()=>{el('inst_sameDayExam').checked=false;el('inst_requirementReview').checked=false;refresh();});
  el('inst_aircraftModel').addEventListener('change',()=>{if(careerSnapshot.modelHours!==undefined&&value('modelHours')===careerSnapshot.modelHours)el('modelHours').value='';delete careerSnapshot.modelHours;updateAudit();});
  el('inst_qualify').addEventListener('click',()=>{
    for(const [id]of C.gradeItems)if(!['takeoff','basicOther','flightOther'].includes(id))el('inst_grade_'+id).value='Q';
    refresh();
  });
  el('inst_remarks').addEventListener('input',()=>{customRemarks=true;});
  el('inst_resetRemarks').addEventListener('click',()=>{customRemarks=false;refresh();});
  for (const id of ['rank','lastName']) el(id).addEventListener('input',refresh);
  for(const id of ['lastName','firstName','middleInit','rank','dodId','totalHours','modelHours','buno','squadron','evaluatorName','commanderName'])for(const event of ['input','change'])el(id).addEventListener(event,()=>{el('inst_requirementReview').checked=false;});
  el('inst_file').addEventListener('change',async()=>{
    const file=el('inst_file').files[0];if(!file)return;
    const version=++importVersion;
    el('successBanner').classList.remove('show');
    clearImportedCareer();
    report=null;reportApplied=false;reviews={};auditResult=null;reviewPage=0;importSnapshot={};
    for(const id of ['recordsConfirmed','careerComplete','pilotTotalsConfirmed','requirementReview'])el('inst_'+id).checked=false;
    el('inst_report').hidden=true;status('Reading SHARP workbook…');
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose the .xlsx Average Instrument Logbook export.');
      const parsed=await readSharpWorkbook(await file.arrayBuffer());
      if(version!==importVersion)return;
      report=parsed;
      el('inst_reviewFrame').replaceChildren();
      for(const frame of ['',...new Set(report.flights.map(r=>r.frame))]){const o=document.createElement('option');o.value=frame;o.textContent=frame||'All models';el('inst_reviewFrame').append(o);}
      showSourceRows();
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
    reviews={};auditResult=null;importSnapshot={};el('inst_requirementReview').checked=false;
    status('Imported workbook removed. Entered values remain available for manual review.');
  });
  el('inst_useIdentity').addEventListener('click',()=>{
    if(!report?.person)return;
    const sameLast=value('lastName').toUpperCase()===report.person.lastName.toUpperCase();
    const sameGiven=report.person.given.length===1?value('firstName').slice(0,1).toUpperCase()===report.person.given.toUpperCase():value('firstName').toUpperCase()===report.person.given.toUpperCase();
    if(!sameLast||!sameGiven)for(const id of ['totalHours','modelHours','inst_actualAll','inst_simulatedAll','inst_yearsFlying'])el(id).value='';
    el('lastName').value=report.person.lastName.toUpperCase();el('rank').value=report.person.rank.toUpperCase();
    // SHARP commonly supplies only a first initial. Do not invent a full name or retain another aviator's.
    el('firstName').value=report.person.given.length>1 ? report.person.given : '';
    el('middleInit').value='';el('dodId').value='';
    el('inst_requirementReview').checked=false;
    updateEvalueeName();updateAllPreviews();refresh();
    status('Name and rank applied. Enter the full first name, middle initial (if any), and EDIPI from the personnel record.');
  });
  el('inst_apply').addEventListener('click',()=>{
    if(!report)return;
    try {
      const priorSortieRows=priorRows();
      const s=C.summarize(report,value('inst_flightDate'),value('inst_aircraftModel'),{priorSortieRows});
      if(!s.all.count)throw new Error('There are no report entries on or before this check-flight date.');
      for(const [n,summary] of [[6,s.six],[12,s.twelve]]) for(const key of ['precision','nonprecision','actual','simulated']) el(`inst_${key}${n}`).value=key.includes('precision') ? summary[key] : summary[key].toFixed(1);
      importSnapshot=Object.fromEntries([6,12].flatMap(n=>['precision','nonprecision','actual','simulated'].map(key=>[`inst_${key}${n}`,value(`inst_${key}${n}`)])));
      appliedDate=s.asOf;reportApplied=true;totals();
      updateAudit();el('inst_requirementReview').checked=false;
      el('inst_summary').textContent=`6 months: after ${C.displayDate(s.first6)} through ${C.displayDate(s.asOf)} (${s.six.count} entries). 12 months: after ${C.displayDate(s.first12)} through ${C.displayDate(s.asOf)} (${s.twelve.count} entries). ${s.checkDayExcluded} check-day entries and ${s.excluded} later entries excluded. Raw report Total-column sum through the check date: ${s.all.total.toFixed(1)}; ${s.modelHours.toFixed(1)} for rows labeled ${value('inst_aircraftModel')}. These sums may contain simulator or special crew time and are not aircraft career pilot hours.`;
      status('Logged recent totals filled. Review aircraft/simulator classification and requirement credit below.');
    }catch(e){status(e.message,true);}
  });
  el('inst_flightDate').addEventListener('change',()=>{
    if(appliedDate&&appliedDate!==value('inst_flightDate')){clearImportedCareer();el('inst_careerComplete').checked=false;}
    showCheckDayRows();
    if(report)el('inst_apply').click();
    updateExpiration();
    refresh();
  });

  function validateInstrument() {
    const errors=[];
    for(const panel of [card,importPanel])panel.querySelectorAll('.invalid').forEach(e=>e.classList.remove('invalid'));
    const error=(id,message)=>{el('inst_'+id)?.classList.add('invalid');errors.push(message);};
    const required=['flightDate','crewPosition','aircraftModel','flightDuration','expiration','currentRating','issuedRating','certification','exam1','examinerName','examinerRank','examinerUnit','examDate','yearsFlying','recommendation','remarks'];
    if(!el('inst_initial').checked)required.push('lastEvaluation');
    for(const id of required) if(!value('inst_'+id))error(id,`Instrument: ${el('inst_'+id).labels?.[0]?.textContent||id}`);
    for(const id of ['flightDate','expiration','currentExpiration','examDate','flightExaminerDate','commanderDate',...el('inst_initial').checked?[]:['lastEvaluation']]) {
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
    if(reportApplied&&report?.person&&value('firstName')){
      const given=report.person.given.toUpperCase(),entered=value('firstName').toUpperCase();
      if(given.length===1?entered[0]!==given:entered!==given)errors.push('The SHARP first name/initial does not match the entered aviator. Use the matching report or remove the import.');
    }
    if(reportApplied&&Object.entries(importSnapshot).some(([id,v])=>value(id)!==v))errors.push('Recent values differ from the imported calculation. Recalculate, or remove the import to use reviewed manual totals.');
    const grades=Object.fromEntries(C.gradeItems.map(([id])=>[id,value('inst_grade_'+id)]));
    if(!Object.values(grades).some(Boolean))errors.push('Instrument: select grades for the items evaluated.');
    for(const key of ['basicOther','flightOther'])if(grades[key]&&!value('inst_'+key))error(key,'Describe the other evaluated item.');
    if(['renew','issue'].includes(value('inst_recommendation'))&&(Object.values(grades).includes('U')||value('inst_certification')==='Unsatisfactorily'))error('recommendation','A qualified recommendation conflicts with an unqualified item or unsatisfactory written exam.');
    const qualified=['renew','issue'].includes(value('inst_recommendation'));
    if(qualified){
      if(!el('inst_requirementReview').checked)error('requirementReview','An examining/issuing authority must review the requirements before a qualified recommendation. Choose Prepare for review to export without a qualification recommendation.');
      if(!['STANDARD','SPECIAL'].includes(value('inst_issuedRating').toUpperCase()))error('issuedRating','Choose STANDARD or SPECIAL for a qualified instrument-rating recommendation.');
      try{const x=R.exam(value('inst_flightDate'),value('inst_examDate'),el('inst_sameDayExam').checked);if(x.status!=='pass')error('examDate',x.message);}catch{}
      if(value('inst_recommendation')==='renew'&&!value('inst_currentExpiration'))error('currentExpiration','Enter the existing rating expiration to verify the early-renewal rule.');
      try{const x=R.expiration(value('inst_flightDate'),value('inst_currentExpiration'),value('inst_recommendation')==='renew');if(value('inst_expiration')!==x.date&&!value('inst_expirationAuthority'))error('expirationAuthority',`Standard expiration is ${C.displayDate(x.date)}. Document the authorized extension or adjustment for a different date.`);}catch{}
      const basis=value('inst_ratingBasis');
      if(basis!=='standard'&&!value('inst_exceptionRecord'))error('exceptionRecord','Identify the record establishing the selected Chapter 13 exception.');
      if(basis==='cnatra'&&(!el('inst_initial').checked||value('inst_recommendation')!=='issue'))error('ratingBasis','The CNATRA syllabus provision is for initial issuance.');
      if(basis==='cnatra'&&value('inst_issuedRating').toUpperCase()!=='STANDARD')error('issuedRating','The CNATRA initial-syllabus provision issues a standard rating.');
      if(['returning','combat'].includes(basis)&&(value('inst_recommendation')!=='renew'||el('inst_initial').checked||!value('inst_currentExpiration')||value('inst_currentExpiration')>=value('inst_flightDate')))error('ratingBasis','This provision applies to renewal of an expired rating. Verify the prior expiration and supporting return-to-flight record.');
      const periods=basis==='cnatra'?[]:basis==='standard'?[6,12]:[6];
      for(const n of periods){
        for(const [key,min] of [['instrument',n],['precision',n],['nonprecision',6]])if(Number(value(`inst_${key}${n}`))<min)error(`${key}${n}`,`${n}-month ${key} total is below the §13.2.1 minimum of ${min}.`);
      }
      if(basis==='standard'&&Number(value('inst_instrumentAll'))<50)error('instrumentAll','Lifetime instrument pilot time is below the 50-hour standard-rating minimum.');
      if(report&&periods.length){
        updateAudit();
        if(!auditResult||auditResult.issues.length)errors.push('Resolve source-record issues before a qualified recommendation, or export Prepare for review.');
        else for(const n of periods)for(const [key,x] of Object.entries(auditResult[n===6?'six':'twelve'].checks))if(x.status!=='pass')errors.push(`${n}-month ${key} credit is ${x.status==='below'?'below the required minimum':'not verified'}. Review aircraft/simulator records; Prepare for review remains available.`);
        if(auditResult&&basis==='standard'&&Number(value('inst_actualAll'))<50&&(!el('inst_careerComplete').checked||auditResult.career.checks.instrument.status!=='pass'))error('actualAll','Verify the career aircraft/simulator split and the 50-hour requirement before a qualified recommendation.');
      }
      if(!report){
        const checks=periods.flatMap(n=>[['instrument',n,n],['precision',n,n],['nonprecision',n,6]]);
        if(basis==='standard')checks.push(['instrument','All',50]);
        for(const [key,n,required] of checks)try{
          const a=value(`inst_manualAircraft_${key}${n}`),s=value(`inst_manualSimulator_${key}${n}`);
          if(key!=='instrument'&&[a,s].some(v=>v!==''&&!Number.isSafeInteger(C.number(v,key))))throw new Error('Approach portions must be whole numbers.');
          const x=R.manualCredit({logged:Number(value(`inst_${key}${n}`)),actual:key==='instrument'?Number(value(`inst_actual${n}`)):0,aircraft:a,approvedSimulator:s,required});
          if(x.status!=='pass')throw new Error(`${n==='All'?'Career':n+'-month'} ${key} credit is not established. Enter the aircraft / approved simulator portions under manual minimum-credit review, or choose Prepare for review.`);
        }catch(e){errors.push(e.message);}
      }
      if(value('inst_issuedRating').toUpperCase()==='SPECIAL'){
        for(const id of ['specialPilotHours','militaryActual'])try{C.number(value('inst_'+id),id);}catch(e){error(id,e.message);}
        for(const check of R.special({years:value('inst_yearsFlying'),pilotHours:value('inst_specialPilotHours'),militaryActual:value('inst_militaryActual'),reduced:el('inst_specialReduced').checked,authority:value('inst_specialAuthority')}))if(check.status!=='pass')errors.push(`Special rating: ${check.key} requires ${check.required??'documented delegated authority'} under §13.2.2.`);
        if(Number(value('inst_specialPilotHours'))>Number(value('totalHours')))error('specialPilotHours','Qualifying special-rating pilot hours exceed total pilot time.');
        if(Number(value('inst_militaryActual'))>Number(value('inst_actualAll')))error('militaryActual','Military actual instrument time exceeds total actual instrument time.');
      }
    }
    if(!C.splitRankName(value('evaluatorName')).rank)errors.push('Instrument: include the flight examiner’s rank before their name.');
    const commander=value('commanderName');
    if(commander&&!C.splitRankName(commander).rank)error('commander','Choose the unit commander.');
    if(value('inst_recommendation')==='unqualified'&&!customRemarks)error('remarks','Add the actual deficiencies and follow-up to the remarks.');
    if(value('inst_remarks').length>1200)error('remarks','Shorten remarks to 1,200 characters to fit the original form.');
    for(const id of ['totalHours','modelHours'])try{C.number(value(id),id);}catch(e){errors.push(e.message);el(id).classList.add('invalid');}
    if(Number(value('modelHours'))>Number(value('totalHours')))errors.push('Aircraft hours in model exceed total aircraft pilot hours.');
    if(Number(value('inst_actualAll'))>Number(value('totalHours')))error('actualAll','Actual instrument pilot hours exceed total aircraft pilot hours.');
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
