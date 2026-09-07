/* Read XLSX locally with the JSZip already used by the DOCX exporter. */
(function () {
  'use strict';
  const nodes = (parent, name) => Array.from(parent.getElementsByTagNameNS('*', name));
  function xml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (nodes(doc, 'parsererror').length) throw new Error('The Excel file contains invalid XML.');
    return doc;
  }
  function partPath(base, target) {
    const parts = target.startsWith('/') ? [] : base.split('/').slice(0,-1);
    for (const part of target.split('/')) {
      if (part === '..') parts.pop();
      else if (part && part !== '.') parts.push(part);
    }
    return parts.join('/');
  }
  window.readSharpWorkbook = async function (bytes) {
    if (bytes.byteLength > 20*1024*1024) throw new Error('Choose a SHARP workbook smaller than 20 MB.');
    let zip;
    try { zip = await JSZip.loadAsync(bytes); } catch { throw new Error('This file is not a readable .xlsx workbook.'); }
    async function read(path) {
      const file = zip.file(path);
      if (!file) throw new Error('The workbook is missing '+path+'.');
      const content = await file.async('string');
      if (content.length > 30*1024*1024) throw new Error('The workbook is too large. Export a smaller SHARP report.');
      return xml(content);
    }
    const wb = await read('xl/workbook.xml');
    const rels = nodes(await read('xl/_rels/workbook.xml.rels'), 'Relationship');
    const stringsRel = rels.find(r => r.getAttribute('Type').endsWith('/sharedStrings'));
    const strings = stringsRel ? nodes(await read(partPath('xl/workbook.xml',stringsRel.getAttribute('Target'))),'si').map(si => nodes(si,'t').map(t=>t.textContent).join('')) : [];
    const matches = [];
    for (const sheet of nodes(wb,'sheet')) {
      const id = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
      const rel = rels.find(r=>r.getAttribute('Id')===id);
      if (!rel || rel.getAttribute('TargetMode')==='External') continue;
      const doc = await read(partPath('xl/workbook.xml',rel.getAttribute('Target')));
      const sheetRows=[];
      for(const row of nodes(doc,'row')){
        const rowNumber=Number(row.getAttribute('r'));
        if(!Number.isSafeInteger(rowNumber)||rowNumber<1||rowNumber>100000||sheetRows[rowNumber-1])throw new Error('Invalid or duplicate Excel row number.');
        const cells = [];
        for (const cell of nodes(row,'c')) {
          const ref = cell.getAttribute('r');
          const letters = /^[A-Z]+/.exec(ref || '');
          if (!letters) throw new Error('Invalid Excel cell reference.');
          let index=0;
          for (const ch of letters[0]) index=index*26+ch.charCodeAt(0)-64;
          const type=cell.getAttribute('t');
          const v=nodes(cell,'v')[0]?.textContent;
          if (type==='e') throw new Error(`Excel error in ${sheet.getAttribute('name')}!${ref}.`);
          if (nodes(cell,'f').length && v===undefined) throw new Error(`Recalculate and save the workbook in Excel. ${ref} has no saved formula result.`);
          cells[index-1]=type==='s' ? strings[Number(v)] : type==='inlineStr' ? nodes(cell,'t').map(t=>t.textContent).join('') : v ?? '';
        }
        sheetRows[rowNumber-1]=Array.from({length:cells.length},(_,i)=>cells[i] ?? '');
      }
      const rows=Array.from({length:sheetRows.length},(_,i)=>sheetRows[i]||[]);
      if (rows.some(r=>String(r[0]).toLowerCase()==='year' && String(r[3]).toLowerCase()==='frame')) {
        matches.push({...InstrumentCore.parseRows(rows),sheetName:sheet.getAttribute('name')});
      }
    }
    if (matches.length!==1) throw new Error(matches.length ? 'This workbook contains multiple logbooks. Export one aviator per file.' : 'No SHARP Average Instrument Logbook found in this workbook.');
    return matches[0];
  };
})();
