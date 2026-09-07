"""Remove example data while preserving the original Adobe form's layout bytes.

Usage: python scripts/prepare_instrument_template.py path/to/example.pdf
Requires pypdf. Never use a completed or signed personnel record as a template.
"""
import hashlib
import sys
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DecodedStreamObject, NameObject

reader=PdfReader(sys.argv[1])
if any(f.get('/FT')=='/Sig' and f.get('/V') for f in (reader.get_fields() or {}).values()):
    raise ValueError('Use an unsigned example template.')
for key in ['/Metadata','/Perms']:
    reader.root_object.pop(key,None)
writer=PdfWriter(clone_from=reader)
xfa=writer.root_object['/AcroForm']['/XFA']
packets={str(xfa[i]):xfa[i+1].get_object().get_data() for i in range(0,len(xfa),2)}
original_layout=packets['template']
clean=ArrayObject()
for i in range(0,len(xfa),2):
    name=str(xfa[i])
    # The saved form packet contains overrides (including examiner names) which
    # take precedence over datasets. Remove it and document-specific metadata.
    if name in ('form','xfdf','xmpmeta','PDFSecurity'):continue
    if name=='datasets':
        stream=DecodedStreamObject()
        stream.set_data(b'<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><xfa:data><form1/></xfa:data></xfa:datasets>')
        clean.extend([xfa[i],writer._add_object(stream)])
    else:clean.extend([xfa[i],xfa[i+1]])
writer.root_object['/AcroForm'][NameObject('/XFA')]=clean
for key in ['/Metadata','/Perms']:
    writer.root_object.pop(key,None)
writer.metadata=None
writer.add_metadata({'/Title':'OPNAV 3710/2 (REV. FEB-2023)'})
writer.compress_identical_objects(remove_identicals=True,remove_orphans=True)
out=Path(__file__).resolve().parents[1]/'templates'/'OPNAV-3710-2-FEB-2023.pdf'
out.parent.mkdir(exist_ok=True)
writer.write(out)
check=PdfReader(out)
saved=check.trailer['/Root']['/AcroForm']['/XFA']
saved_packets={str(saved[i]):saved[i+1].get_object().get_data() for i in range(0,len(saved),2)}
assert saved_packets['template']==original_layout
assert 'form' not in saved_packets and b'<form1/>' in saved_packets['datasets']
print('Preserved original XFA template, SHA-256:',hashlib.sha256(original_layout).hexdigest())
print('Cleared saved field values, overrides, signatures and metadata:',out.name)
