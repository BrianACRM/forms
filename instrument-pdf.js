(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/pdf-lib-1.17.1.min.js'),require('./instrument-core.js'));
  else root.buildInstrumentPdf=factory(root.PDFLib,root.InstrumentCore);
})(typeof window==='undefined'?this:window,function(P,C){
  'use strict';
  const names={remarks:'Remarks',exam2:'Secondex',applicantName:'Namelfm',rank:'Rank',edipi:'EDIPI',lastEvaluation:'FilDte',
    precision6:'Last6mo',precision12:'Last12mo',actual12:'Last12moa',actual6:'Last6moa',actualAll:'Totalallyearsa',
    nonprecision12:'Last12mo1',nonprecision6:'Last6mo1',simulatedAll:'Totalallyearsb',simulated6:'Last6mob',simulated12:'Last12mob',
    instrumentAll:'Totalallyearsc',instrument6:'Last6moc',instrument12:'Last12moc',totalHours:'Totalpilottime',
    currentRating:'CurRate',issuedRating:'IssRate',exam1:'Firstex',exam3:'Thirdex',examinerName:'Exmoff',examinerRank:'ExOffRank',
    examinerUnit:'Unita',examDate:'Date2',yearsFlying:'Totalyearsflyingexper',buno:'AcftMdl',expiration:'FltDur',flightDuration:'AcftBuno',
    basicOther:'Evaluated',flightExaminerName:'RnkNmeFltExmr',flightExaminerDate:'FltExmnerSigDte',commanderName:'RnkNmeUnitCmdr',
    commanderDate:'UnitCmdrSigDte',flightDate:'DateField1',flightExaminerRank:'TextField1',commanderRank:'TextField2',modelHours:'DecimalField1',
    flightOther:'TextField4',controlledBy:'ContBy',cuiCategory:'CUICat',distribution:'LDC',pointOfContact:'POC'};
  function xml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));}
  const templateValues={Exmoff:'examinerName',RnkNmeFltExmr:'flightExaminerName',RnkNmeUnitCmdr:'commanderName',ContBy:'controlledBy',CUICat:'cuiCategory',LDC:'distribution',POC:'pointOfContact'};
  function fillTemplateValues(source,values){
    // These original fields do not bind to the main data record (match=none
    // or page-level global fields). Supply their values in place, without
    // changing any layout, font, border, caption, binding or signature control.
    return source.replace(/(<field\b[^>]*\bname="(Exmoff|RnkNmeFltExmr|RnkNmeUnitCmdr|ContBy|CUICat|LDC|POC)"[^>]*>)([\s\S]*?)(<\/field\s*>)/g,
      (match,open,name,body,close)=>{
        return open+`<value><text>${xml(values[templateValues[name]])}</text></value>`+body+close;
      });
  }
  function datasets(values,grades,certification){
    let body='';
    const add=(name,value)=>{body+=`<${name}>${xml(value)}</${name}>`;};
    for(const [key,name]of Object.entries(names))add(name,values[key]);
    // Repeated XFA names bind by occurrence, not by the apparent field name.
    // Unit[0] is squadron, Unit[1] crew position, Unit[2] aircraft model.
    for(const key of ['unit','crewPosition','aircraftModel'])add('Unit',values[key]);
    add('Certify',certification ? certification.toUpperCase() : '');
    let i=0;
    for(const [id]of C.gradeItems)for(const result of ['Q','U']){
      add(i===0?'CheckBox1':i===1?'CheckBox2':'CheckBox3',grades[id]===result?'1':'0');i++;
    }
    return `<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><xfa:data><form1>${body}</form1></xfa:data></xfa:datasets>`;
  }
  async function build(template,values,grades,certification){
    const doc=await P.PDFDocument.load(template,{updateMetadata:false});
    const metricDoc=await P.PDFDocument.create(),font=await metricDoc.embedFont(P.StandardFonts.TimesRoman);
    const layout=P.layoutMultilineText(values.remarks||'',{font,fontSize:11,alignment:P.TextAlignment.Left,bounds:{x:0,y:0,width:534,height:143}});
    if(layout.lines.length*layout.lineHeight>143)throw new Error('Remarks are too long for the original form. Shorten them before downloading.');
    // Do not call getForm(): pdf-lib removes XFA when constructing PDFForm.
    const acro=doc.catalog.lookup(P.PDFName.of('AcroForm'),P.PDFDict);
    const xfa=acro.lookup(P.PDFName.of('XFA'),P.PDFArray);
    let found=false;
    for(let i=0;i<xfa.size();i+=2){
      const packet=xfa.lookup(i).decodeText();
      if(packet==='template'){
        const source=new TextDecoder().decode(P.decodePDFRawStream(xfa.lookup(i+1)).decode());
        const filled=fillTemplateValues(source,values);
        xfa.set(i+1,doc.context.register(doc.context.flateStream(new TextEncoder().encode(filled))));
      }
      if(packet==='datasets'){
        xfa.set(i+1,doc.context.register(doc.context.flateStream(new TextEncoder().encode(datasets(values,grades,certification)))));
        found=true;
      }
    }
    if(!found)throw new Error('The original instrument template is missing its data packet.');
    // Field values change; fonts, layout, date/number pictures, calculations
    // and native signature controls remain original.
    return doc.save();
  }
  build.datasets=datasets;build.fieldNames=names;build.fillTemplateValues=fillTemplateValues;
  return build;
});
