# Validated medical images — X-ray, CT, MRI, ultrasound, ECG, skin

The film viewer is a reading workstation: the learner commits to a read before the report or
"Show me the finding" is revealed. So the image *is* the test. A wrong, mislabelled, or
fabricated film teaches the wrong thing — validation matters more here than anywhere else.

## Rule 1 — the finding is real

- Any image the learner must interpret (radiograph, CT, MRI, US still or cine, ECG, rash
  where morphology is the clue) is a **real clinical study** from an open collection.
- AI images are allowed only as clearly illustrative extras (equipment, a device-position
  CXR when no licence-clean real one exists), marked `"generated": true`,
  `"license": "AI-generated illustrative asset"`, label ending "(illustrative)", and
  **never** carrying the case's discriminating finding. Existing precedent:
  `cxr_ett_clear_ai`, `equipment_*` — and Kim must approve each one.

## Rule 2 — licence allows a paid app

Accept: **CC0, Public domain, CC BY (any version), CC BY-SA (any version)**.
Reject: anything **NC** (non-commercial) or **ND** (no-derivatives — we crop and transcode),
"all rights reserved", "fair use", unknown. Radiopaedia.org cases are CC BY-NC-SA by default
→ not usable *unless* the same image is on Wikimedia Commons under a compatible licence
(many are: titles like `… (Radiopaedia 12345-67890 Axial 113).jpg`). Credit exactly as the
source asks; keep `page` pointing to the file page.

## Rule 3 — the film matches the patient

Check and write down in the review sheet, per image:

| Check | Example failure |
|---|---|
| Modality & projection | lateral CXR when the case says portable AP |
| Region & laterality | right PTX on a film for a left-sided stab wound (flip only if anatomy allows — never flip a CXR with a visible heart/aortic knob/situs clue or text markers) |
| Age plausibility | adult pelvis with closed physes in a 6-year-old case; neonatal chest in an adult |
| Hardware / incidental | sternotomy wires, pacemaker, hip prosthesis, ECG leads the case doesn't have |
| The finding itself | the "free air" film is actually a Chilaiditi sign |
| Severity | a tiny PTX for a case scripted as tension physiology |
| Burned-in text | patient names, dates, hospital IDs — crop or reject (PHI) |

If no licence-clean study matches, pick the closest real one and adjust the **case text**
(e.g. side of injury) to match the film — not the other way round — or ask Kim.

## Sourcing workflow

1. Search Wikimedia Commons (category pages such as `Category:Pneumothorax X-rays`,
   `Category:Radiopaedia images`, `Category:Ultrasound images`, `Category:ECGpedia`),
   NIH Open-i (filter to CC licences), and journal figure uploads on Commons (open-access
   BMC / Scand J Trauma / Crit Ultrasound J figures and supplementary videos are often CC BY).
2. For each candidate, run:
   ```bash
   python3 "$SKILL_DIR/scripts/commons_lookup.py" "File:Name_on_commons.jpg" \
       --key xr_<finding> --label "Radiograph — <region>, <finding>" --kw "<finding>,<synonym>" \
       --download media/xr_<finding>.jpg
   ```
   It prints the licence, author and a ready manifest entry, and **exits non-zero on NC/ND
   or unknown licences**. (Commons may be blocked from cloud sandboxes; run on Kim's Mac then.)
3. Normalise: max 1600 px long edge, JPEG q≈85 (stills), strip EXIF, crop away PHI and
   rulers that give the answer away (e.g. an annotation arrow on the finding).
4. Read the film yourself and write the expected report text (`diagnosticReports.body`)
   to match **this** image — findings and measurements, no unifying diagnosis; ECG and
   CXR get no read.

## Hotspots — measured, never estimated

```bash
python3 "$SKILL_DIR/scripts/grid_sheet.py" media/xr_<finding>.jpg -o work/cases/<id>/grid_xr_<finding>.png
```

Open the grid sheet (10% lines, labelled), read the centre of the finding, set `r` to
cover it with a small margin, and add to `media-hotspots.json`:

```json
"xr_<finding>": [ { "x": 33, "y": 72, "r": 8, "label": "Lucency under the hemidiaphragm" } ]
```

Annotate only findings that are unambiguously locatable. A ring beside the pathology teaches
the wrong thing — when in doubt, leave it out. Labels describe what to look at, in teaching
language ("follow the posterior vertebral line"), not the diagnosis name alone.
Then re-render the grid **with the hotspot drawn** (`--hotspots`) and look at it before saving.

## Ultrasound cine (motion is the finding)

Use a clip when the sign is dynamic: lung sliding / lung point / absent sliding, pericardial
effusion with RV collapse, global EF, IVC collapsibility, FAST with free fluid, intussusception
target, cardiac standstill. Stills are fine for gallstones, AAA diameter, IUP.

```bash
bash "$SKILL_DIR/scripts/transcode_us_clip.sh" source.ogv media/usv_<key> [crop=w:h:x:y] [start] [duration]
```

Produces `media/usv_<key>.webm` (VP9, no audio, ≤ 6 s loop, ≤ 720 px) and the poster
`media/usv_<key>.jpg`; add the `video_*` fields to the manifest (licence fields are per-video
because the still and clip can come from different sources). Where the loop plays: the results
card and the ultrasound cart's screen in the room; the film viewer keeps the **still** (its hotspots
are drawn on the still), and reduced motion shows the still everywhere — so every clip needs a
matching, hotspotted still that shows the same finding.

## ECGs

Use real 12-leads (ECGpedia/CardioNetworks on Commons are CC BY-SA). Confirm rate, rhythm,
axis and the key finding match the case vitals/rhythm string — the telemetry strip is
synthesised from `rhythm`, and the 12-lead must not contradict it. Check calibration and
paper speed are standard.

## Review sheet line (per asset)

```
- [ ] xr_<finding> | real | CC BY-SA 4.0 | Author | <page URL>
      read: "<one-line read of THIS image>" | matches case: side ✓ age ✓ hardware ✓ PHI ✓
      hotspots: 2 (grid-verified) | Kim review: pending
```
