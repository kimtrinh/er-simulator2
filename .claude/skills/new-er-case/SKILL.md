---
name: new-er-case
description: Build a new MediSim ER case end-to-end from a clinical idea — current-evidence research, an undifferentiated gold-case seed, Gemini-generated patient/room art, Codex-built procedure animations and sprite sheets, validated and licensed radiology (X-ray, CT, ultrasound stills and cine clips) with grid-verified hotspots, and a Ken Burns cinematic intro. Use whenever Kim says "new case", "make a case about…", "I have a case idea", "/new-er-case <topic>", or asks to add a case to MediSim / ER Simulator.
argument-hint: "<case idea, e.g. 'pediatric button battery ingestion'> [--level student|resident|attending]"
---

# New ER case — the MediSim house pipeline

Every new case ships with the same seven parts. Do them in this order; each later part
depends on facts fixed by the earlier ones (age band, sex, visible injuries, devices, the
true diagnosis). Skip a part only when Kim says so, and say which you skipped in the report.

| # | Part | Output | Reference |
|---|------|--------|-----------|
| 1 | **Evidence sweep** | dated source list + key thresholds/doses | `references/evidence-protocol.md` |
| 2 | **Case seed** | gold-case JSON (intro, speech, vitals, hidden context, dx, critical actions, learning points) + offline responders | `references/case-schema.md` |
| 3 | **Validated medical images** | real, licence-clean films / US clips, manifest entries, hotspots | `references/medical-imaging.md` |
| 4 | **Gemini patient & room art** | paired bed + room images (and device states) for this exact patient | `references/gemini-art.md` |
| 5 | **Procedure animations (Codex) + sprite sheets** | clinician sprite strip(s) + CSS/JS rig for each time-critical procedure | `references/procedure-sprites.md` |
| 6 | **Ken Burns intro** | 3–5 cinematic stills with slow pan/zoom under the voiced intro | `references/ken-burns-intro.md` |
| 7 | **Verify, provenance, PR** | tests pass, screenshots, provenance record, draft PR | below |

**Paths:** `scripts/`, `references/` and `assets/` are relative to this skill's folder — either
`.claude/skills/new-er-case/` in er-simulator2 or `~/.claude/skills/new-er-case/` when installed
globally. Resolve it once (`SKILL_DIR`) and call scripts as `python3 "$SKILL_DIR/scripts/…"`.
Scripts need Python 3 + Pillow (+ numpy for chroma keying) and ffmpeg for video.

Before starting, read `references/lessons-learned.md` — it is Kim's accumulated feedback on
earlier cases, and repeating one of those mistakes is the fastest way to have a case rejected.

## 0. Locate the target repo and an exemplar

1. The case data lives in the **MediSim ER** app (`kimtrinh/medisim-er`, deployed as a static
   site; source with `docs/`, `tests/` and `tools_*.py` lives in Kim's private working copy).
   Look for it in this order: the current working directory, `../medisim-er`,
   `~/Projects/medisim-er`. You need `cases-gold.json`, `media-manifest.json`,
   `media-hotspots.json`, `clinical-provenance.json`, `index.html` (`CASE_VISUALS`,
   `PATIENT_PHOTO_STATES`, `ROOM_LAYERS`, `roomProcedureOverlayHTML`).
   If none is present, stop and ask Kim where the source checkout is — do not invent a layout.
2. Open **one existing gold case of the same system** in full (e.g. `cv-*` for a cardiac idea,
   `eb-*` for an EB Medicine–grounded one, `resus-atls-*` for trauma) and mirror its exact
   field names and nesting. The public deploy only carries stubs (`"_members": true`); the
   full seed is in the private source. Never guess a field name the engine reads.
3. Pick the **case id**: `<system>-<short-slug>` using the existing prefixes (`cv`, `resp`,
   `neuro`, `gi`, `gu`, `endo`, `metab`, `tox`, `env`, `ob`, `heme`, `onc`, `id`, `peds`,
   `eb`, `resus-atls`, `resus-pals`, `colitis`, `core`). Check it is unused.
4. Create a working folder `work/cases/<case-id>/` for drafts, prompts, raw generations and
   the review sheet, and make sure `work/` is in the repo's `.gitignore` — the app deploys as a
   static site, so anything committed is public. Only reviewed, final files are copied into
   `media/`, `scenes/`, `patient/`, `patient-trauma/`, `media/game/`.

## 1. Evidence sweep (always — the case must reflect *today's* evidence)

Follow `references/evidence-protocol.md`. In short: run parallel web searches (extended
mode for guidelines and anything from the last 24 months), prefer society guidelines and
EB Medicine / ACEP / AHA / ATLS-ACS / AAP / IDSA / SCCM / ACOG / AAN / EAST / ESC sources,
then EMCrit / LITFL / ALiEM / EM Cases / REBEL EM for practice nuance. Record every source
with organisation, title, year, URL and the specific number it supports (threshold, dose,
time target, decision rule). Flag any recommendation that changed in the last 2 years — that
change should usually become a learning point or a trap. Write `work/cases/<id>/evidence.md`.

## 2. Case seed

Write the seed to the schema in `references/case-schema.md`, following the house case
philosophy that `CASE_SYSTEM` enforces in `index.html`:

- **Undifferentiated presentation** — the intro reads like 4–6 conditions; it never names,
  frames or foreshadows the diagnosis; no family member volunteers the right theory.
- **Hidden `context`** packs: true dx + pathophysiology, comorbidities and home meds that
  change the picture, social factors, 2–3 competing diagnoses, can't-miss traps, and the
  deterioration trajectory if mismanaged.
- **4–6 `criticalActions`** (ABEM oral-board style, imperative, time-bound where evidence
  gives a target) and **4–5 `learningPoints`**, each traceable to a source in `evidence.md`.
- **Concrete age** (number of years, or "3 weeks"/"newborn"), sex, ageBand — doses depend on it.
- **`speech`** voices the intro as ordered turns (`narrator|patient|nurse|consultant|medic|family`).
- Training-level variants if Kim asked (`--level`): see `data/trainingLevels.ts` in
  er-simulator2 for how student / resident / attending change the pitch.
- Add offline **responders** (intent + match phrases + speech/physicalExam/labs) so the case
  plays without a model call; cover history, each exam region, each key lab/imaging order,
  each critical action, consults, and disposition.

Show Kim the one-paragraph case summary + critical actions before spending image budget.

## 3. Validated medical images (X-ray, CT, MRI, ultrasound, ECG, derm)

Follow `references/medical-imaging.md`. The non-negotiables:

- **Diagnostic images the learner must read are real studies**, never AI-generated. Source
  from Wikimedia Commons (incl. Radiopaedia/ECGpedia/OpenI uploads there), NIH/NLM Open-i,
  or other openly licensed collections. `scripts/commons_lookup.py` fetches the licence and
  credit and drafts the manifest entry.
- **Licence must allow commercial use and modification** (the app is sold): CC0, public
  domain, CC BY, CC BY-SA. **Reject any NC or ND** licence — including Radiopaedia's own
  site default (CC BY-NC-SA) unless the specific file on Commons is relicensed.
- **Validate the finding**: modality, region, laterality, age plausibility and the finding
  itself must match the case. Write a one-line read per image in the review sheet.
- **Hotspots from a grid, never by eye**: run `scripts/grid_sheet.py <image>`, read
  coordinates off the 10% grid, add `{x,y,r,label}` to `media-hotspots.json` only for
  findings that are unambiguously locatable.
- **Ultrasound cine** where motion is the finding (lung sliding/point, tamponade, EF, IVC,
  FAST): `scripts/transcode_us_clip.sh` → `media/usv_<key>.webm` + poster `.jpg`, with the
  `video_*` manifest fields.
- **ECGs and CXRs carry no written read** in the engine — the player interprets them.
- Every entry is marked `"review": "pending"` in the review sheet until Kim signs off.

## 4. Gemini patient & room art

Follow `references/gemini-art.md` and generate with `scripts/gemini_image.py` (needs
`GEMINI_API_KEY`; model from `GEMINI_IMAGE_MODEL`, default `gemini-3-pro-image`).

- Decide first whether the case **needs** bespoke art. The generic age-band patients
  (`young-m`, `older-f`, `infant`, …) are correct for most medical cases. Bespoke art
  (`CASE_VISUALS[<id>]`) is for visible pathology or injury that is *part of the exam*.
- Visible art must never leak the diagnosis or put a finding on a distractor case.
- Bed (`patient-trauma/case-<id>.jpg`) and room (`scenes/room-case-<id>.jpg`) images are a
  **pair**: same face, age, sex, body habitus, injuries. Generate the room shot first, then
  derive the bed shot by reference-image editing.
- Device states (ETT, pads, collar, chest tube) are **edits of the original photo** with only
  the device copied in, so anatomy stays where `ROOM_SCENE_SHIFT` measured it.
- Use the style bible in `gemini-art.md` (photoreal, ED resus bay, cool clinical light,
  no text, no logos, no identifiable real person) and save every prompt next to the output.

## 5. Procedure animations (Codex) + sprite sheets

Follow `references/procedure-sprites.md`. For each time-critical procedure in the critical
actions that the room does not already animate (existing: needle, tourniquet, binder,
chestTube, cric, ETT, pads/defib, CPR, BVM, IO, UVC, MTP, pacing, neonatal resus):

1. Generate 6–12 keyframes with Gemini from one reference clinician cut-out (consistent
   hands, gloves, scrubs, transparent background, side-on ROOM camera only).
2. Assemble a horizontal strip with `scripts/sprite_sheet.py` → `media/game/sprite-<proc>-v1.webp`
   plus the generated CSS (`steps(N)` animation, `prefers-reduced-motion` fallback).
3. Hand the rig to **Codex** using `assets/codex-procedure-brief.md` (filled in) — run
   `codex exec --full-auto "$(cat work/cases/<id>/codex-brief.md)"` if the Codex CLI is
   installed; otherwise implement the same brief yourself. The rig follows the existing
   `roomProcedureOverlayHTML` contract: anchored on the anatomical working point
   (`zx/zy` in the zone, `ax/ay` in the sprite), room view only, label pill, timed removal.
4. Review the result in the browser (Playwright screenshot of start / mid / end frames).

## 6. Ken Burns intro

Follow `references/ken-burns-intro.md`; drop-in implementation in `assets/ken-burns-intro.js`
and `assets/ken-burns-intro.css`, demo in `assets/ken-burns-demo.html`.

- 3–5 Gemini stills that tell the arrival **without revealing the diagnosis**: e.g. exterior
  (ambulance bay / waiting room / home), the hand-off, the patient's face or hands, the bay.
- Each still gets a pan/zoom (scale 1.0→1.12–1.18 over 6–9 s, focal point chosen per shot),
  1.2 s crossfade, timed to the `speech` turns; skip button, tap-to-skip, and a static
  crossfade for `prefers-reduced-motion`.
- Stills live in `scenes/intro/<case-id>/01.webp …`, declared in `INTRO_REELS[<case-id>]`.

## 7. Verify, record provenance, ship

1. Run the repo's own checks (`npm test` / `node --test tests/` / the smoke script) — new
   seeds are "mechanically validated by the repository test suite".
2. Play the case end-to-end offline in the browser (Playwright): intro reel, each view,
   each procedure animation, each study in the film viewer with "Show me the finding".
   Save screenshots to `work/cases/<id>/qa/`.
3. Add the case's sources to `clinical-provenance.json` (`sourceSets` + a case entry with
   `inventoryCheckedAt`) and leave clinician review **pending** — only Kim can approve it.
4. Fill `work/cases/<id>/review-sheet.md` (template: `assets/review-sheet-template.md`):
   every image/video with licence, credit, read, hotspot check; every AI asset with prompt
   and "illustrative" flag; every dose with its source.
5. Commit on a feature branch, push, open a **draft** PR summarising: case, evidence used,
   assets added (real vs generated), what still needs Kim's clinical sign-off.

## Report back to Kim

End with a short ER-style handoff: case id + one-line stem, true dx, critical actions,
the 3–5 sources that drove the numbers, assets added (counts by type, real vs AI), anything
skipped or unresolved (e.g. "no licence-clean US clip of X found — used still"), and the PR link.
