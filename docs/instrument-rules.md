# Instrument calculation rules

See the expanded [requirement audit and coverage limits](instrument-audit.md).

Verified against **CNAF M-3710.7, 7 February 2025**, §13.2.1 and Appendix F.6.
The [Navy issuances register](https://www.secnav.navy.mil/doni/manuals-opnav.aspx)
lists that edition as active. [Official Navy Medicine copy](https://www.med.navy.mil/Portals/62/Documents/NMFSC/NMOTC/NAMI/ARWG/Miscellaneous/CNAF%20M_3710_7%20FEB%202025.pdf?ver=2QUgzKUiKkzOeFOiPQNxxA%3D%3D).

## Reporting periods

Section 13.2.1 uses flights after the date six or twelve months before the
evaluation. The anniversary day is excluded. The current evaluation cannot
supply its own prerequisite hours or approaches. On the evaluation date,
only a separate sortie completed before the evaluation is eligible.

For a **17 July 2026** evaluation:

| Period | Included dates by default |
|---|---|
| Six months | 18 January 2026–16 July 2026 |
| Twelve months | 18 July 2025–16 July 2026 |

A qualifying earlier separate sortie on 17 July can be selected by source row.
The workbook supplies dates, but no sortie times or evaluation identifiers;
the app therefore never makes that selection automatically. Previous evaluations
inside the specified reporting period remain eligible. All later entries are
excluded. Boundary, multiple-sortie and future-entry cases are tested.

## Standard rating requirements

Section 13.2.1 sets these ordinary minimums:

| Period | Instrument hours | Precision approaches | Nonprecision approaches |
|---|---:|---:|---:|
| Six months | 6 | 6 | 6 |
| Twelve months | 12 | 12 | 6 |

It also requires 50 lifetime actual/simulated instrument pilot hours and a
successful NATOPS instrument evaluation. Approved Appendix K simulators can
satisfy up to one-half of the minimum instrument-rating requirements. That is a
credit limitation, not an instruction to halve every `Sim Inst` value.

The form generator displays logged figures and separately checks aircraft versus
approved-simulator minimum credit. Missing identifiers remain unclassified.
Career import requires confirmed complete history and a reviewed pilot-time basis.
Simulator approval, exceptions, evaluation syllabus and issuing authority still
require supporting records; computed figures alone do not certify a rating.

## Approach classification

Appendix F.6 defines `1/A` as actual/simulated precision and `2/B` as
actual/simulated nonprecision. Precision approaches provide electronic glidepath
guidance. CCA without such guidance is nonprecision. A bare CCA column does not
settle this distinction, so imports with CCA entries require classified source
entries or reviewed manual totals.

## Scope of verification

The date filters and named approach-code classifications above are implemented
and tested. No claim is made that a successful PDF export certifies compliance
with every requirement of Chapter 13 or the aircraft's NATOPS manual. The PDF's
original fields remain editable for review and correction before signing.
