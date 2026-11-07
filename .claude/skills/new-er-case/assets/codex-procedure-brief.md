# Codex brief — room procedure animation: <PROCEDURE>

<!-- Fill every <…>. Run from the MediSim ER source root:
     codex exec --full-auto "$(cat work/cases/<case-id>/codex-brief-<kind>.md)" -->

## Goal
Add a sprite-based room animation for **<procedure, e.g. ultrasound-guided pericardiocentesis>**
(kind `<kind>`) to MediSim ER, used by case `<case-id>` and available to any case that orders it.

## Inputs (already in the repo)
- Sprite strip: `media/game/sprite-<kind>-v1.webp` — <N> frames, each <fw>×<fh> px, horizontal.
- CSS from `sprite_sheet.py`: `work/cases/<case-id>/sprite-<kind>.css` (class `.rmSprite--<kind>`,
  keyframes `rmSprite-<kind>`, reduced-motion fallback).
- Working point in a frame (needle tip / hands): `ax=<0–1>`, `ay=<0–1>` (measured on a grid sheet).
- Target zone: `<chest|head|abdomen|legs>`; working point in the zone `zx=<0–1>`, `zy=<0–1>`.
- Width on the photo: `w=<% of photo width>`; label: `"ER physician · <procedure>"`.
- Order(s) that trigger it: `<order catalogue labels / intents, e.g. "Pericardiocentesis">`.
- Persistent after-state (optional): gear flag `S.gear.<flag>` + `ROOM_LAYERS` picture `<path>`.

## Do
1. In `index.html`, add `<kind>` to the `cfg` table in `roomProcedureOverlayHTML` with the values
   above. Render the sprite as `<div class="rmSprite rmSprite--<kind>"></div>` inside the existing
   `.rmProcedureRig` wrapper instead of a static `<img>` when the config has `sprite:true`.
2. Paste the CSS next to the other `rmProcedureRig--*` rules. Set `--procedure-time` so the rig
   stays visible for the full sprite loop(s) plus the arrive/leave fade.
3. Add `<kind>` to the allow-list in `startRoomPlacement` and to the order dispatch that already
   calls it for needle/tourniquet/binder/chestTube/cric, so the confirmed order plays it once.
   If an after-state flag is given, set it the same way `leaves` does for the others.
4. Room camera only — return '' for foot/airway views, exactly like the existing procedures.
5. Tests: extend the existing room/procedure tests (see `tests/`) to assert the rig renders in
   the room view for `<kind>`, not in foot/airway, and that reduced motion shows the last frame.

## Don't
- Don't change existing procedures, zones, `ROOM_SCENE_SHIFT`, or any case data.
- Don't add libraries. Don't inline the image as base64.
- Don't anchor on the bounding box — anchor on (`ax`,`ay`) ↔ (`zx`,`zy`).

## Acceptance
- Ordering <procedure> in case `<case-id>` shows the clinician arriving at the <zone>, the
  instrument motion across all <N> frames, the label pill, then a clean exit; total ≈ <seconds> s.
- Working point lands on <landmark, e.g. the subxiphoid window> on every base the case can
  use (<bases>) including `CASE_VISUALS['<case-id>']` art with its `ROOM_SCENE_SHIFT`.
- Repo test suite passes. Report the diff summary and screenshots at 0 / 50 / 100 %.
