# Checkride Paperwork Generator

Static, local-processing form generator for NATOPS, ARP, and instrument checks.
Serve this folder over HTTP; no build step or backend is required.

## Instrument checks

1. Select **Instrument Check** and choose the check-flight date.
2. Import a SHARP **Average Instrument Logbook** `.xlsx`. The page fills available
   personnel information and recent instrument hours and approach counts.
3. Review the figures, enter lifetime totals and evaluation details, then download.
   A single button can mark the standard evaluated items Q; takeoff and additional
   items remain separate selections.

Pilot position, aircraft/simulator and unit commander use dropdowns. Selecting
multiple forms fills equivalent flight dates, durations, expirations and pilot
positions across them. Copied flight details follow changes to their source;
explicit edits on an individual form are preserved. Aircraft and commander are
shared by all selected forms. Written-exam grades remain specific to each exam.
Blocks 23–25 start with the supplied example's examining officer, rank and unit;
changes to these three settings are saved automatically in this browser.

The output fills the **original OPNAV 3710/2 (REV. FEB-2023) Adobe XFA PDF**.
Its original layout, fonts, captions, formatting rules and signature controls
are retained. Open it in **Adobe Acrobat Reader** to display, print and sign it.
Chrome, Safari and Preview may show the original PDF's “Please wait” page.
The generator does not apply signatures or flatten the PDF. All original entry
fields remain available for corrections. The three calculated instrument totals
also allow manual overrides; their original calculations still supply defaults.

Most values go into XFA's datasets packet. Three
examiner/commander fields have `bind match="none"`; these and the page-level
marking fields receive values directly in their existing XFA field definitions.
The source template's saved overrides and example data are removed. Do not call
`pdf-lib.getForm()` on this PDF; it removes the XFA payload.
The only behavior change is `calculate override="ignore"` on the three total
fields. This permits edits under Adobe's [XFA override rules](https://helpx.adobe.com/pdf/aem-forms/6-3/scripting-reference.pdf), while preserving geometry and formatting.

### SHARP calculations

- Rolling six- and twelve-month intervals end on the chosen check-flight date.
  Both the start and end date are included. Month-end dates are clamped to the
  last valid day when subtracting months. The date ranges are displayed for review.
- Precision approaches sum `1/A`, `PAR`, `CCA`, and `ILS`. Non-precision approaches
  sum `2/B`, `ASR`, `ELVA`, `L/MF`, `LOC`, `NDB`, `SCA`, `TACAN`, `VOR`, `VOR/DME`.
- Flight detail rows are counted once. Footer totals and future flights are excluded.
  Multiple flights on the same date are retained. Blank logged metrics mean zero.
- Recent totals include all aircraft frames. Report-only model hours use an exact,
  case-insensitive frame match. Workbook totals never become lifetime totals.
- SHARP often supplies only a first initial. The page does not invent a full first
  name, middle initial, EDIPI, years of experience, or career totals.
- The expiration suggestion follows the example's convention (end of the same
  month in the following year). Review it for the evaluation. Manual edits persist.

All workbook processing, calculations and document generation happen in the
browser. Imported workbooks and applicant data are neither uploaded nor persisted
by the page. Only the three examining-officer preferences are stored locally.
A public repository must contain only the sanitized template and anonymous
test fixtures, not completed personnel forms or the user's source workbook.

## Development

`node --test tests/*.test.cjs`

Tests cover workbook columns, date boundaries, future flights, missing data,
repeated fields, XML escaping, original template preservation, editable totals,
text overflow and sharing between selected forms. Stress cases include 10,000
flight entries across five frames and 30 successive exports with varying grades.
They use the vendored PDF library and need no package installation.

Rebuild the sanitized template only when replacing the official source:

`python scripts/prepare_instrument_template.py /path/to/unsigned-example.pdf`

The preparation script requires `pypdf`. Keep the original source outside the repo.
The original XFA layout bytes are preserved during preparation, and export tests
verify that only inserted values and the three override attributes change the
template packet during filling.

Compare a generated PDF against a supplied completed example:

`python scripts/audit_instrument_pdf.py /path/to/example.pdf /path/to/output.pdf`

This checks field values, repeated occurrences, original layout, editability and
signature controls. It requires `pypdf`; neither PDF is changed. Run it with the
same source values to test export fidelity. Reconciliation between a workbook and
a completed example is a separate comparison; the exporter must not silently
adjust logged figures to fit a reference. Adobe Acrobat Reader remains the final
check for native XFA calculations, date formatting, saving and signing.

`vendor/pdf-lib-1.17.1.min.js` is PDF-Lib 1.17.1, with its MIT license alongside it.
