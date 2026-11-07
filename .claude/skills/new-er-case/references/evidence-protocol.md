# Evidence sweep protocol

Goal: every threshold, dose, time target, decision rule and disposition in the case traces to
a current source, and anything that changed recently is surfaced as a teaching point.

## 1. Frame the question (2 minutes)

Write down: the true diagnosis, the 2–3 competing diagnoses, the population (age band,
pregnancy, comorbidity), and the decisions the learner must make (recognise → test →
treat → procedure → consult → dispose). Each decision becomes a search target.

## 2. Search — in parallel, in one turn

Use `WebSearch` with `mode: "extended"` for guidelines and anything published in the last
24 months; `standard` for well-settled facts. Run these together:

1. `<dx> guideline <current year>` and `<dx> guideline update` — society guidelines.
2. `<dx> emergency department management EB Medicine` (Emergency Medicine Practice /
   Pediatric EM Practice — Kim's gold seeds are often grounded in a specific EB Medicine issue).
3. `ACEP clinical policy <dx or symptom>`.
4. `<dx> randomized trial <last two years>` / `<key treatment> meta-analysis`.
5. `<dx> EMCrit OR LITFL OR "EM Cases" OR ALiEM OR "REBEL EM"` — practice nuance and pitfalls.
6. Drug dosing: `<drug> dose <indication> <population>` against a label/formulary source
   (FDA label, Lexicomp/BNF summaries, Pediatric dosing references).
7. If imaging matters: `ACR Appropriateness Criteria <presentation>` and POCUS sources.

Society sources the repo already inventories (`clinical-provenance.json → sourceSets`):
ACEP clinical policies, AHA/ASA guidelines (incl. 2025 CPR & ECC, 2026 acute ischemic
stroke), AAP CPGs, CDC infection guidance, ACS TQP trauma best practices, Endocrine Society,
and others — reuse the existing key when a source is already there.

Source hierarchy when they conflict: current society guideline > high-quality RCT /
meta-analysis newer than the guideline (flag as "evidence ahead of guideline") >
EB Medicine / ACEP policy > FOAMed. Never cite FOAMed alone for a dose.

## 3. Read, don't skim

Open the primary pages (use the `web-fetch` agent when you have no fetch tool). Extract the
exact numbers: e.g. "TXA 1 g IV over 10 min within 3 h of injury (CRASH-2)", "honey 10 mL
q10 min ×6 before arrival for button battery ≤12 h (NCPC)". Note the publication year.

## 4. Write `work/cases/<id>/evidence.md`

```markdown
# <case id> — evidence (checked YYYY-MM-DD)

| # | Claim used in the case | Source (org, title, year) | URL | Where used |
|---|---|---|---|---|
| 1 | <threshold/dose/target> | <…> | <…> | criticalActions[2], context |

## Recent changes worth teaching
- <what changed, when, old vs new practice> → learningPoints[3]

## Deliberate traps grounded in evidence
- <e.g. normal initial troponin does not exclude …>

## Open questions for Kim
- <where sources disagree or local practice may differ>
```

Every `criticalAction` and `learningPoint` must cite a row number. If a needed number has
no source you could verify, say so in "Open questions" rather than inventing one.

## 5. Hand-off into the case

- Recent practice changes → a learning point and, where possible, a trap the old habit falls into.
- Validated decision rules (HEART, PERC/Wells, PECARN, NEXUS/Canadian C-spine, Ottawa,
  CURB-65, NIHSS, qSOFA…) → design the case so applying or skipping the rule visibly matters.
- Time targets → time-bound critical actions ("within 10 minutes").
- Add new organisations to `clinical-provenance.json`.
