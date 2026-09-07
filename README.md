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

The output fills the **original OPNAV 3710/2 (REV. FEB-2023) Adobe XFA PDF**.
Its original layout, fonts, captions, formatting rules and signature controls
are retained. Open it in **Adobe Acrobat Reader** to display, print and sign it.
Chrome, Safari and Preview may show the original PDF's “Please wait” page.
The generator does not apply signatures.

Only field values change. Most values go into XFA's datasets packet. Three
examiner/commander fields have `bind match="none"`; these and the page-level
marking fields receive values directly in their existing XFA field definitions.
The source template's saved overrides and example data are removed. Do not call
`pdf-lib.getForm()` on this PDF; it removes the XFA payload.

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
browser. No imported workbook or personnel data is uploaded or persisted by the
page. A public repository must contain only the sanitized template and anonymous
test fixtures, not completed personnel forms or the user's source workbook.

## Development

`node --test tests/instrument.test.cjs`

Tests cover workbook columns, date boundaries, future flights, missing data,
repeated fields, XML escaping, original template preservation and text overflow.
They use the vendored PDF library and need no package installation.

Rebuild the sanitized template only when replacing the official source:

`python scripts/prepare_instrument_template.py /path/to/unsigned-example.pdf`

The preparation script requires `pypdf`. Keep the original source outside the repo.
The original XFA layout bytes are preserved during preparation, and export tests
verify that only inserted values change the template packet during filling.

`vendor/pdf-lib-1.17.1.min.js` is PDF-Lib 1.17.1, with its MIT license alongside it.
