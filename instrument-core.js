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
    const precision = ['1/a','par','cca','ils'].map(find);
    const nonprecision = ['2/b','asr','elva','l/mf','loc','ndb','sca','tacan','vor','vor/dme'].map(find);
    const flights = [];
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r.some(v => String(v ?? '').trim()) || /^(totals?|page\b|this information system)/i.test(String(r[0] || '').trim())) continue;
      if (norm(r[0]) === 'year') continue;
      const year = number(r[0], `Row ${i+1} year`), month = number(r[1], `Row ${i+1} month`), day = number(r[2], `Row ${i+1} day`);
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      isoDate(date);
      const read = col => number(r[col], `Row ${i+1}, ${header[col]}`, true);
      const count = cols => cols.reduce((sum, col) => {
        const n = read(col); if (!Number.isSafeInteger(n)) throw new Error(`Row ${i+1}: approach counts must be whole numbers.`);
        return sum+n;
      }, 0);
      const frame = String(r[3] || '').trim();
      if (!frame) throw new Error(`Row ${i+1}: aircraft frame is missing.`);
      flights.push({date, frame, total:read(total), actual:read(actual), simulated:read(simulated), precision:count(precision), nonprecision:count(nonprecision)});
    }
    if (!flights.length) throw new Error('No flight entries found in this SHARP report.');
    flights.sort((a,b) => a.date.localeCompare(b.date));
    const title = rows.slice(0,hi).flat().map(String).find(s => /Average Instrument Logbook for/i.test(s)) || '';
    const identity = /Average Instrument Logbook for\s+(.+?),\s*([^,]+),\s*([^,]+)\s*$/i.exec(title);
    return {flights, person:identity ? {lastName:identity[1].trim(), given:identity[2].trim(), rank:identity[3].trim()} : null,
      firstDate:flights[0].date, lastDate:flights[flights.length-1].date};
  }
  function summarize(report, asOf, model) {
    isoDate(asOf);
    const first6 = subtractMonths(asOf,6), first12 = subtractMonths(asOf,12);
    const eligible = report.flights.filter(r => r.date <= asOf);
    const sum = rows => ({count:rows.length, total:round(rows.reduce((s,r)=>s+r.total,0)), actual:round(rows.reduce((s,r)=>s+r.actual,0)), simulated:round(rows.reduce((s,r)=>s+r.simulated,0)), precision:rows.reduce((s,r)=>s+r.precision,0), nonprecision:rows.reduce((s,r)=>s+r.nonprecision,0)});
    const six = sum(eligible.filter(r=>r.date>=first6));
    const twelve = sum(eligible.filter(r=>r.date>=first12));
    const all = sum(eligible);
    const modelRows = eligible.filter(r=>r.frame.toUpperCase()===String(model).trim().toUpperCase());
    return {six,twelve,all,modelHours:sum(modelRows).total,modelCount:modelRows.length,first6,first12,asOf,excluded:report.flights.length-eligible.length};
  }
  function splitRankName(text) {
    const m = /^(CAPT|CDR|LCDR|LTJG|LT|ENS|CWO[2-5])\s+(.+)$/i.exec(String(text).trim());
    return m ? {rank:m[1].toUpperCase(),name:m[2].toUpperCase()} : {rank:'',name:String(text).trim().toUpperCase()};
  }
  return {gradeItems,isoDate,subtractMonths,displayDate,number,round,parseRows,summarize,splitRankName};
});
