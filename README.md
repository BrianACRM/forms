# Checkride Paperwork Generator

Static, local-processing form generator for NATOPS, ARP, and instrument checks.
Serve this folder over HTTP; no build step or backend is required.

## Instrument checks

1. Select **Instrument Check** and choose the check-flight date.
2. Import a SHARP **Average Instrument Logbook** `.xlsx`. The page fills available
   personnel information and recent instrument hours and approach counts.
3. Review aircraft/simulator source classifications and minimum-credit checks.
   A complete career report can fill lifetime totals after coverage is confirmed;
   aircraft pilot/model totals additionally require FPT+CPT or a confirmed Total
   column basis. Enter evaluation details, then download.
   A single button can mark the standard evaluated items Q; takeoff and additional
  items remain separate selections.

Use **Prepare for review** when source records or qualification evidence are
incomplete. An issued/renewed recommendation requires the implemented credit/date
checks and explicit examining/issuing-authority review. The application does not
infer device approval, syllabus completion or examiner designation from a name.

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

- Recent instrument totals follow CNAF M-3710.7 (7 February 2025), §13.2.1:
  the six-/twelve-month anniversary date is excluded. Check-day entries are
  excluded unless individually identified as separate sorties completed before
  the evaluation. Changing the date clears those selections. Later flights
  never count. Month-end lookbacks clamp to the last valid day.
- Precision approaches sum `1/A`, `PAR`, and `ILS`. Non-precision approaches
  sum `2/B`, `ASR`, `ELVA`, `L/MF`, `LOC`, `NDB`, `SCA`, `TACAN`, `VOR`, `VOR/DME`.
  Nonzero `CCA` entries require reviewed classification: Appendix F.6 distinguishes
  approaches by glidepath guidance, which that column alone does not establish.
  The importer reports this limitation instead of assigning precision credit.
- Flight detail rows are counted once. Footer totals and future flights are excluded.
  Multiple flights on the same date are retained. Blank logged metrics mean zero.
- Recent totals include all aircraft frames. Raw report model hours use an exact,
  case-insensitive frame match. Report-only totals include every logged entry
  through the check date; these are distinct from the recent prerequisite totals.
  Limited reports never become lifetime totals. Complete-history import is explicit.
- Frame and Sim Inst do not identify the physical platform. Optional platform,
  exception code, ORG, device/TEC and FPT/CPT metadata are read when present.
  Missing classification remains visible, with per-entry review and pagination.
- Simulator time stays separate from aircraft pilot/model hours. Approved simulator
  credit is capped independently for instrument hours, precision and nonprecision
  requirements; printed logged hours are not halved. Manual credit uses the same caps.
- SHARP often supplies only a first initial. The page does not invent a full first
  name, middle initial, EDIPI, years of experience, or career totals.
- Expiration follows §13.1.2.1, including renewal within 60 days of the current
  expiration. A qualified recommendation checks the written-exam 60-day window,
  same-day prior completion, applicable ordinary/exceptional minimums and special
  rating experience when selected. Nonstandard expiration requires an authority record.

See the [requirement audit, coverage and outstanding source checks](docs/instrument-audit.md).
The requested review of all 400 manual pages is not yet complete.

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

Independently reconcile a standard SHARP export using Python Decimal arithmetic:

`python scripts/audit_sharp_report.py /path/to/report.xlsx YYYY-MM-DD output/audit`

This produces a source-row CSV and period totals. It requires `openpyxl` and does
not establish device approval or complete career coverage. Keep its outputs local.

`vendor/pdf-lib-1.17.1.min.js` is PDF-Lib 1.17.1, with its MIT license alongside it.
