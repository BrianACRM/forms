# Instrument-rule audit — 7 September 2026

Governing edition: **CNAF M-3710.7, 7 February 2025**.
[Active-edition register](https://www.secnav.navy.mil/doni/manuals-opnav.aspx).
[Official manual](https://www.med.navy.mil/Portals/62/Documents/NMFSC/NMOTC/NAMI/ARWG/Miscellaneous/CNAF%20M_3710_7%20FEB%202025.pdf?ver=2QUgzKUiKkzOeFOiPQNxxA%3D%3D).

## Coverage

Read the complete indexed text of Chapter 13 (printed pages 13-1 through 13-6),
the relevant Glossary definitions, 10-4, 10-5, 10-9, 10-10, 11-19, Appendix F.6,
and the E-6B entries in K.3 (K-2). The official viewer confirms 400 PDF pages.
Direct file downloads were rejected; a complete local copy has not been obtained.
**The requested review of every line of all 400 pages is not complete.** Current
referenced aircraft/NATOPS Instrument Flight Manual provisions also remain open.

## Traceability

| Provision | Software behavior and source evidence needed |
|---|---|
| Glossary: pilot and individual flight time | Use FPT+CPT; SCT is separate. Generic Total requires explicit pilot-time confirmation. |
| Glossary: instrument time | Preserve actual/simulated conditions separately from physical platform. Both pilots may log actual in multipiloted aircraft; only the manipulating pilot logs simulated. Confirm pilot-record applicability. |
| 10.3.1.1 | Read explicit platform, simulator exception T, ORG ZEZ, device and TEC metadata when present. Missing metadata stays unknown; conflicts require correction. |
| 10.3.1.2; K.3 | E-6B 2F144A-1/-2 and VECE identify simulators. Approval, model-manager authorization and pilot-station use require review, even with an identified device. |
| 10.3.3: instrument entries | Flag approaches without instrument time, instrument above total/pilot hours, and actual time assigned to a simulator. Never silently relabel. |
| 10.3.3: approach credit | Record review covers principal active control, the actual-condition student-instructor exception, and completed final segments counted once. Coupled codes are excluded. Aggregate columns cannot prove these flight circumstances. |
| 10.3.3; F.6: classification | Sum classified precision/nonprecision codes. LPV DA <=300 ft AGL is precision; higher-DA LPV and LNAV/VNAV are nonprecision. Generic LPV/GPS/RNAV and CCA require classification. |
| 11.6 | Keep simulator sessions separate from aircraft career pilot time. Chapter 11 annual proficiency and flight-pay determinations are outside this instrument form. |
| 13.1.1 | Duty status and return-to-flying applicability need records; rank and name do not establish them. |
| 13.1.2.1 | Renewal within 60 days before current expiration retains its month; otherwise use evaluation month. Both suggestions expire 12 months after that month's last day. |
| 13.1.2.2 | Qualified written exam must be within 60 days before evaluation. Same-day completion requires confirmation that it preceded the flight. Ground syllabus, numerical grading criteria and evaluator designation require current supporting records/manuals. |
| 13.1.2.3 | A nonstandard expiration requires an authority/record entry and examiner review. Deployment conditions, extension limits, refresher requirements and letter filing are not automatically certified. |
| 13.1.2.4; 13.1.3 | Issuing authority and board/examiner designation are reviewed; dropdown names do not establish authorization. |
| 13.2.1(1) | Check 50 career instrument hours with no more than 25 approved simulator hours credited. A sufficient actual-hour lower bound can establish the aircraft contribution. |
| 13.2.1(3–5) | Exclude anniversary dates and current evaluation; allow selected earlier separate sorties that day. Never include future flights. Previous evaluations can count within applicable periods. |
| 13.2.1(3–6) | Six-month minima: hours/precision/nonprecision 6/6/6, simulator caps 3/3/3. Twelve-month minima 12/12/6, caps 6/6/3. Preserve logged totals separately. |
| 13.2.1(7–9) | Explicit CNATRA initial-standard or expired-rating return basis requires a supporting record. Return provisions retain six-month checks, without ordinary twelve-month/career checks. |
| 13.2.2 | Special: 5 years, 2,000 qualifying pilot hours, 100 military actual hours. Reduced 3-year/1,500-hour path requires authority; military actual minimum remains. Certificates/source qualifications require review. |
| 13.2.3 | Qualified recommendations require passing implemented checks and authority review. U/unsatisfactory conflicts and unresolved imported credit prevent qualification recommendations; Prepare for review remains available. |
| 13.3 | Fill the original OPNAV 3710/2 XFA. Current NAVAIR 00-80T-112 form instructions and grading syllabus still require complete-source review. |
| 13.4 | Recent instrument totals span models. Aircraft hours in model remain separate; neither hours nor checkride model establish NATOPS model qualification. |
| 13.5 | Applicable GPS ground/flight syllabus completion is an examiner review item, not inferred from SHARP totals. |

## Data and export behavior

Source entries retain actual Excel row numbers, including omitted blank rows.
Review is paginated at 50 rows. A model label alone never classifies a session.
Unknown, approved, unverified and ineligible simulator contributions stay distinct.

Career import requires explicit complete-history confirmation. Aircraft pilot/model
totals also need classification and FPT+CPT or confirmation of the Total column's
meaning. Source/cutoff changes invalidate corresponding imported career values.
Manual source portions use the same simulator caps; removing a workbook does not
bypass those checks. The current evaluation is excluded from imported career totals.

The PDF retains its original layout and editable fields. It contains logged figures,
not artificially reduced simulator hours. An arithmetic check does not establish
training, designation, authorization or issuance. Qualified recommendations require
the reviewing/issuing authority's explicit review; draft review output is supported.

## Evidence and remaining work

Tests cover platform ambiguity/conflicts, pilot/SCT separation, individual simulator
caps, insufficient aircraft contributions, manual credit, dates, early renewal,
special-rating thresholds, approach classification, 10,000 entries and 30 PDF exports.
Browser checks exercise real XLSX parsing, classification, career fill, date rejection,
original PDF output and combined NATOPS/ARP/instrument exports.

`scripts/audit_sharp_report.py` supplies an independent Python Decimal reconciliation
and row-by-row CSV. Actual personnel workbooks, comparison PDFs and resulting audit
files stay outside version control.

Still open: all remaining manual pages; current NAVAIR 00-80T-112 and E-6B syllabus;
complete Appendix K coverage/local authorizations; actual platform and pilot/approach
source records; automated extension-condition validation; native Acrobat save/reopen
and signing; workbook/example numerical reconciliation. Keep the PR in draft.
