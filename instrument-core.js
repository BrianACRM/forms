/* Pure SHARP parsing and instrument calculations; shared by the app and tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.InstrumentCore = api;
})(typeof window === 'undefined' ? this : window, function () {
  'use strict';
  const gradeItems = [
    ['takeoff', 'Instrument takeoff (optional)', 1],
    ['turns', 'Climbing, descending, and constant rate turns', 1],
    ['steepTurns', 'Steep turns', 1],
    ['unusualAttitudes', 'Recovery from unusual attitudes', 1],
    ['positioning', 'VOR/TACAN/RNAV positioning', 1],
    ['partialPanel', 'Partial panel airwork', 1],
    ['basicOther', 'Other basic instruments', 1],
    ['planning', 'Flight planning', 2],
    ['clearance', 'Clearance compliance', 2],
    ['approaches', 'Instrument approaches', 2],
    ['equipment', 'Communications and navigation equipment', 2],
    ['emergencies', 'Emergency procedures', 2],
    ['voice', 'Voice procedures', 2],
    ['flightOther', 'Other instrument flight', 2]
  ];
  function isoDate(value) {
    const s = String(value || '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw new Error('Enter a valid date.');
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.toISOString().slice(0, 10) !== s) throw new Error('Enter a valid date.');
    return d;
  }
  function subtractMonths(value, months) {
    const d = isoDate(value), day = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - months);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
    return d.toISOString().slice(0, 10);
  }
  function displayDate(value) {
    if (!value) return '';
    if (value === 'INITIAL') return value;
    const d = isoDate(value);
    return `${String(d.getUTCDate()).padStart(2, '0')} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  function number(value, label, blankIsZero = false) {
    if ((value === '' || value === null || value === undefined) && blankIsZero) return 0;
    if (!/^\d+(?:\.\d+)?$/.test(String(value).trim())) throw new Error(`${label} must be a nonnegative number.`);
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`${label} is too large.`);
    return n;
  }
  const round = n => Math.round((n + Number.EPSILON) * 10) / 10;
  function approach({type,decisionAltitude=null,glidepath=null,coupled=false,completed=true,atControls=true,studentInstructorActual=false}){
    if(coupled||!completed||(!atControls&&!studentInstructorActual))return 'excluded';
    const t=String(type||'').trim().toUpperCase();
    if(['1','A','1/A','ILS','PAR','ALS'].includes(t))return 'precision';
    if(['2','B','2/B','ASR','ELVA','L/MF','LOC','NDB','SCA','TACAN','VOR','VOR/DME','LNAV','LNAV/VNAV'].includes(t))return 'nonprecision';
    if(['3','4','C','3/C','AUTO','COUPLED'].includes(t))return 'excluded';
    if(t==='LPV')return decisionAltitude===null||decisionAltitude===''||!Number.isFinite(Number(decisionAltitude))||Number(decisionAltitude)<0?'unknown':Number(decisionAltitude)<=300?'precision':'nonprecision';
    if(t==='CCA')return glidepath===true?'precision':glidepath===false?'nonprecision':'unknown';
    return 'unknown';
  }
  function parseRows(rows) {
    const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    const hi = rows.findIndex(r => norm(r[0]) === 'year' && norm(r[1]) === 'month' && norm(r[2]) === 'day' && norm(r[3]) === 'frame');
    if (hi < 0) throw new Error('This is not a SHARP Average Instrument Logbook. Export that report as .xlsx and try again.');
    const header = rows[hi].map(norm);
    const find = name => {
      const i = header.indexOf(name);
      if (i < 0) throw new Error(`SHARP column missing: ${name.toUpperCase()}.`);
      return i;
    };
    const total = find('total'), actual = find('act inst'), simulated = find('sim inst');
    const optional = (...names) => names.map(n=>header.indexOf(n)).find(i=>i>=0) ?? -1;
    const metaColumns={platform:optional('platform','event type'),device:optional('simulator id','device id','buno','buno/ser'),exception:optional('exception code','exc code'),organization:optional('org','organization code'),tec:optional('tec','type equipment code')};
    const fpt=optional('fpt','first pilot time'),cpt=optional('cpt','copilot time');
    const precision = ['1/a','par','ils'].map(find),cca=find('cca');
    const nonprecision = ['2/b','asr','elva','l/mf','loc','ndb','sca','tacan','vor','vor/dme'].map(find);
    const extraApproaches=header.flatMap((name,col)=>{
      if(['als','lnav','lnav/vnav','lpv','gps','rnav','3','4','c','3/c','auto','coupled'].includes(name))return [{col,type:approach({type:name})}];
      if(name==='lpv da <= 300 ft agl')return [{col,type:approach({type:'LPV',decisionAltitude:300})}];
      if(name==='lpv da > 300 ft agl')return [{col,type:approach({type:'LPV',decisionAltitude:301})}];
      return [];
    });
    const flights = [];
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r.some(v => String(v ?? '').trim()) || /^(totals?|page\b|this information system)/i.test(String(r[0] || '').trim())) continue;
      if (norm(r[0]) === 'year') continue;
      const year = number(r[0], `Row ${i+1} year`), month = number(r[1], `Row ${i+1} month`), day = number(r[2], `Row ${i+1} day`);
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      isoDate(date);
      const read = col => number(r[col], `Row ${i+1}, ${header[col]}`, true);
      for(const col of [total,actual,simulated,fpt,cpt].filter(col=>col>=0))if(round(read(col))!==read(col))throw new Error(`Row ${i+1}: SHARP hours must be logged in tenths (§10.3.3).`);
      const count = cols => cols.reduce((sum, col) => {
        const n = read(col); if (!Number.isSafeInteger(n)) throw new Error(`Row ${i+1}: approach counts must be whole numbers.`);
        return sum+n;
      }, 0);
      const frame = String(r[3] || '').trim();
      if (!frame) throw new Error(`Row ${i+1}: aircraft frame is missing.`);
      if(read(cca))throw new Error(`Row ${i+1}: CCA does not identify whether glidepath guidance was provided. Use classified approach entries or enter reviewed totals manually.`);
      const metadata=Object.fromEntries(Object.entries(metaColumns).map(([key,col])=>[key,col>=0?String(r[col]??'').trim():'']));
      const platformLabel=norm(metadata.platform);
      const simulatorEvidence=platformLabel==='simulator'||metadata.exception.toUpperCase()==='T'||metadata.organization.toUpperCase()==='ZEZ'||/^2F144A-[12]$/i.test(metadata.device)||metadata.tec.toUpperCase()==='VECE';
      if(platformLabel==='aircraft'&&simulatorEvidence)throw new Error(`Row ${i+1}: aircraft and simulator identifiers conflict. Correct the source record.`);
      if((/^2F144A-[12]$/i.test(metadata.device)||metadata.tec.toUpperCase()==='VECE')&&frame.toUpperCase()!=='E-6B')throw new Error(`Row ${i+1}: E-6B simulator identifier conflicts with the reported frame.`);
      const platform=simulatorEvidence?'simulator':platformLabel==='aircraft'?'aircraft':'unknown';
      const pilotTime=fpt>=0&&cpt>=0?round(read(fpt)+read(cpt)):null;
      const approaches={precision:count(precision),nonprecision:count(nonprecision),excludedApproaches:0};
      for(const {col,type} of extraApproaches){
        const n=count([col]);if(!n)continue;
        if(type==='unknown')throw new Error(`Row ${i+1}: ${header[col].toUpperCase()} requires approach classification, including LPV decision altitude where applicable (§10.3.3).`);
        approaches[type==='excluded'?'excludedApproaches':type]+=n;
      }
      flights.push({sourceRow:i+1,date,frame,total:read(total),actual:read(actual),simulated:read(simulated),...approaches,platform,pilotTime,metadata});
    }
    if (!flights.length) throw new Error('No flight entries found in this SHARP report.');
    flights.sort((a,b) => a.date.localeCompare(b.date));
    const title = rows.slice(0,hi).flat().map(String).find(s => /Average Instrument Logbook for/i.test(s)) || '';
    const identity = /Average Instrument Logbook for\s+(.+?),\s*([^,]+),\s*([^,]+)\s*$/i.exec(title);
    return {flights, person:identity ? {lastName:identity[1].trim(), given:identity[2].trim(), rank:identity[3].trim()} : null,
      firstDate:flights[0].date, lastDate:flights[flights.length-1].date};
  }
  function summarize(report, asOf, model, {priorSortieRows=[]}={}) {
    isoDate(asOf);
    const first6 = subtractMonths(asOf,6), first12 = subtractMonths(asOf,12);
    const eligible = report.flights.filter(r => r.date <= asOf);
    const earlierSorties=new Set(priorSortieRows);
    // CNAF M-3710.7 (7 Feb 2025), 13.2.1: after the anniversary date;
    // check-day credit must come from a separate sortie before evaluation.
    const recentEligible=eligible.filter(r=>r.date<asOf||earlierSorties.has(r.sourceRow));
    const sum = rows => ({count:rows.length, total:round(rows.reduce((s,r)=>s+r.total,0)), actual:round(rows.reduce((s,r)=>s+r.actual,0)), simulated:round(rows.reduce((s,r)=>s+r.simulated,0)), precision:rows.reduce((s,r)=>s+r.precision,0), nonprecision:rows.reduce((s,r)=>s+r.nonprecision,0)});
    const six = sum(recentEligible.filter(r=>r.date>first6));
    const twelve = sum(recentEligible.filter(r=>r.date>first12));
    const all = sum(eligible);
    const modelRows = eligible.filter(r=>r.frame.toUpperCase()===String(model).trim().toUpperCase());
    return {six,twelve,all,modelHours:sum(modelRows).total,modelCount:modelRows.length,first6,first12,asOf,excluded:report.flights.length-eligible.length,checkDayExcluded:eligible.length-recentEligible.length};
  }
  function splitRankName(text) {
    const m = /^(CAPT|CDR|LCDR|LTJG|LT|ENS|CWO[2-5])\s+(.+)$/i.exec(String(text).trim());
    return m ? {rank:m[1].toUpperCase(),name:m[2].toUpperCase()} : {rank:'',name:String(text).trim().toUpperCase()};
  }
  return {gradeItems,isoDate,subtractMonths,displayDate,number,round,approach,parseRows,summarize,splitRankName};
});
