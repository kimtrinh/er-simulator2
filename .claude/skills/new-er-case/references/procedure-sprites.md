# Procedure animations (Codex) and sprite sheets

## What exists already (don't rebuild)

The room view already animates: ETT/intubation (`rmIntubate`, `intubation-clinician-v1.webp`),
BVM (`rt-bvm-cutout-v1.webp`), CPR (`cpr-clinician-cutout-v1.webp`), defib charge/clear/shock
(`defib-nurse-*-v3.webp`), pads, pacing (`rmPacerPulse/Arc`), needle decompression, tourniquet,
pelvic binder, chest tube, cricothyrotomy (`room-*-clinician-v1.png` via
`roomProcedureOverlayHTML`), IO, UVC, MTP/transfusion (`rmBloodDrop/Line`), drug bolus
response rings, neonatal resus/rub. New cases should **reuse** these and add only what's
missing (e.g. pericardiocentesis, lateral canthotomy, thoracotomy, REBOA, escharotomy,
nasal packing, LP, central line, joint reduction, perimortem cesarean, Sengstaken/Minnesota
tube, button-battery honey/sucralfate, Foley for priapism aspiration…).

## Current contract (`roomProcedureOverlayHTML(kind, viewKey, zones)` in `index.html`)

- **Room camera only** — "these photographs were generated for the side-on ROOM camera.
  Showing them from the foot or airway camera would put correct hands on impossible anatomy."
- Config per procedure: `{ zone, file, w, aspect, zx, zy, ax, ay, label }`
  - `zone` = `chest | head | abdomen | legs` box from `ROOM_ZONES` (+ `ROOM_SCENE_SHIFT`).
  - `zx, zy` = working point inside the zone (0–1); `ax, ay` = the same anatomical point
    inside the clinician image (0–1) — the rig is anchored on the **needle tip / hands**,
    not the person's bounding box.
  - `w` = width in % of the photo; height derived from `aspect` and the 56:100 photo ratio.
- Wrapper `.rmProcedureRig.rmProcedureRig--<kind>` arrives/fades with `rmProcedureArrive`
  over `--procedure-time` (2.2–3.2 s); the inner image runs a short work loop
  (`rmNeedleWork`, `rmChestTubeWork`… translate/rotate a fraction of a percent).
- Label pill: "ER physician · <procedure>" (emerald, uppercase, tiny).
- Triggered by `startRoomPlacement(kind)` after the order is confirmed; leaves a persistent
  gear flag (`S.gear.tq`, `.binder`, `.mtp`, `.cric`) that `ROOM_LAYERS` uses for the
  after-state picture.

## The upgrade: true sprite animation

A single cut-out wiggled by CSS reads as "a sticker that jiggles". A **sprite strip** shows
the actual motion (needle advancing, syringe drawing back, scalpel stroke, hands pulling the
binder). Keep the same rig/anchor contract — only the inner image changes.

### 1. Keyframes with Gemini

- Start from one approved clinician cut-out (existing `room-*-clinician-v1.png` style, or a
  new one generated against `scenes/room-<base>.jpg` as reference so scale and lighting match).
- Generate 6–12 frames as **edits of that same image** ("same clinician, same pose, same
  lighting and framing; only the hands/instrument move: frame 3 of 8 — needle advanced 1 cm
  further along the same trajectory…"). Keep the camera, crop and canvas identical.
- Background must be transparent (ask for a plain flat #00FF00 background if the model will
  not return alpha, then key it out with `sprite_sheet.py --chroma 00ff00`).
- Clinical accuracy is checked per frame (landmark, angle, sterile technique, PPE, which
  hand). Example landmarks: pericardiocentesis subxiphoid aiming at the left shoulder under
  ultrasound; lateral canthotomy — inferior crus; needle decompression 4th/5th ICS AAL (adult)
  or 2nd ICS MCL in children (ATLS 10); cric through the cricothyroid membrane, scalpel–bougie–tube.

### 2. Assemble

```bash
python3 "$SKILL_DIR/scripts/sprite_sheet.py" work/cases/<id>/raw/pericardio_*.png \
   --name pericardiocentesis --height 512 --fps 8 --chroma 00ff00 \
   --out media/game/sprite-pericardiocentesis-v1.webp --css work/cases/<id>/sprite-pericardiocentesis.css
```

The script trims all frames to one shared bounding box (so the anchor never jumps), lays
them out horizontally, writes a lossless/alpha WebP, and emits CSS:

```css
.rmSprite--pericardiocentesis{background:url(media/game/sprite-pericardiocentesis-v1.webp) 0 0/800% 100% no-repeat;
  animation:rmSprite-pericardiocentesis 1s steps(8,jump-none) var(--sprite-loops,2) both}
@keyframes rmSprite-pericardiocentesis{to{background-position:100% 0}}
@media (prefers-reduced-motion:reduce){.rmSprite--pericardiocentesis{animation:none;background-position:100% 0}}
```

(`steps(N, jump-none)` with `background-position` 0 → 100% holds each of the N frames for an
equal share of the loop and ends on the last one.)
It also prints `aspect` and the frame size for the rig config.

### 3. Hand the rig to Codex

Fill `assets/codex-procedure-brief.md` for each procedure and run Codex non-interactively
from the source repo root:

```bash
codex exec --full-auto "$(cat work/cases/<id>/codex-brief-pericardiocentesis.md)"
```

If the Codex CLI is not installed, implement the brief yourself — same acceptance criteria.
Then review Codex's diff like any PR: it must touch only the procedure config, CSS, the
dispatch that calls `startRoomPlacement`, and tests.

### 4. Verify

- Playwright: open the case offline, issue the order, screenshot at 0 %, 50 % and 100 % of
  `--procedure-time` in the room camera; confirm nothing appears in foot/airway cameras.
- The working point sits on the right anatomy on every patient base the case can use
  (and on `CASE_VISUALS` art, accounting for `ROOM_SCENE_SHIFT`).
- `prefers-reduced-motion`: the final frame shows, no motion.
- File size: ≤ 400 KB per strip (WebP, 512 px high is plenty at the rendered size).
