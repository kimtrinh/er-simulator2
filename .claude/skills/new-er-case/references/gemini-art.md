# Gemini patient, room and scene art

Kim's case art is generated with Google Gemini (the room device states were made as Gemini
edits of the original room photo — see `tools_room_state.py` in the source repo). Use
`scripts/gemini_image.py`, which calls the Gemini API `generateContent` endpoint with
`responseModalities: ["IMAGE"]` and optional reference images.

```bash
export GEMINI_API_KEY=…                       # never commit it
export GEMINI_IMAGE_MODEL=gemini-3-pro-image  # or gemini-3.1-flash-image / gemini-nano-banana-2.1 for drafts
python3 "$SKILL_DIR/scripts/gemini_image.py" --style \
  --prompt-file work/cases/<id>/prompts/room.txt \
  --ref scenes/room-young-m.jpg \
  --aspect 16:9 --size 2K \
  --out work/cases/<id>/raw/room-v1.png
```

Model names change — if the call 404s, check the current list in the Gemini API image-
generation docs (Context7: `/websites/ai_google_dev_gemini-api`) and update the default.

## Decide what the case needs

| Situation | Art |
|---|---|
| Medical case, nothing visible that the exam depends on | **No new art.** Generic age-band base (`patientBaseFor`) is correct. |
| Visible finding the exam depends on (rash, jaundice, wound, deformity, burns, angioedema) | Check `patient-trauma/<base>-<finding>.jpg` first (petechial, morbilliform, urticaria, zoster, cellulitis, jaundice, ascites, burns, GSW, stab, seatbelt sign, flank bruising, leg deformity, eye injury, nosebleed, hematemesis, pregnant, postpartum…). Generate only if missing. |
| Trauma or high-value resus case with a specific injury pattern | Bespoke **pair** → `CASE_VISUALS[<id>]`. |
| A procedure the team performs | Room-only **layer** (`ROOM_LAYERS`) or a procedure sprite (see `procedure-sprites.md`). |
| Intro reel | 3–5 cinematic stills (see `ken-burns-intro.md`). |

## Style bible (prepend to every prompt — `--style` does it for you)

```
Photorealistic documentary photograph inside a modern US emergency department resuscitation
bay. Cool clinical LED lighting with a slight teal cast, shallow depth of field, 35mm lens,
natural skin texture, realistic medical equipment and monitors with no readable text.
Staff wear navy or ceil-blue scrubs, nitrile gloves, no badges with names. No text, captions,
watermarks or logos anywhere. The patient is a fictional person, not a real or famous individual.
Clinically accurate anatomy and device placement.
```

Camera conventions — they are calibrated, so match them:

- **ROOM**: side-on, head of bed to the RIGHT of frame, monitor
  upper left, crash cart/defib right of centre, airway cart far right, IV pole behind the
  head, ultrasound on the left wall. Use the generic `scenes/room-<base>.jpg` as a reference
  image so the layout (and therefore `ROOM_ZONES`) holds; measure `ROOM_SCENE_SHIFT` after.
- **BED** (`patient/…`, `patient-trauma/…`): bedside, three-quarter view from the foot-left.
- **FOOT / AIRWAY**: only the generic base renders exist; do not generate case versions unless
  Kim asks (procedure photos must never be shown from these cameras).

## Consistency recipe (pairs and states)

1. Generate the **room** shot first with the generic room as reference: "Same room, same
   camera and framing as the reference. Replace the patient with: <age> <sex>, <habitus>,
   <visible injuries exactly: side, size, dressing>…".
2. Derive the **bed** shot with the room shot as reference: "Same person, same injuries and
   clothing, bedside camera…".
3. **Device states** (ETT + vent circuit, pads, c-collar, chest tube, binder): edit the room
   photo — "Change only X; keep everything else pixel-identical" — then copy *only the device
   region* back into the original (the `tools_room_state.py` approach) so the face and chest
   stay where the zones were measured. For `ROOM_LAYERS`, cut the device as a transparent PNG
   with a measured `box`.
4. Compare pairs side by side (age, sex, skin tone, hair, injuries, dressings, lines) before
   accepting. Regenerate rather than accept a mismatch.

## Hard rules

- The picture must not give the diagnosis away or show a finding the case hides behind exam
  (e.g. no visible ascites for a case where the trap is missing ascites on exam).
- Age matters: a toddler case showing an adult teaches the wrong size of every device and dose.
- **No photoreal minors.** Gemini will not draw a real child, and the app uses the `child` /
  `infant` bases and manikin overlays for pediatric patients. For pediatric cases generate only
  adults (parents, staff), objects and rooms.
- Clinically correct devices: ETT taped at the lip with a vent circuit (not an O₂ mask over
  a tube), pads anterolateral or anteroposterior, chest tube 4th–5th ICS mid/anterior
  axillary line, pelvic binder at the greater trochanters (not the iliac crests), tourniquet
  2–3 inches proximal to the wound.
- No PHI-like text, real brand names, or real people.
- Save the exact prompt next to every output (`prompts/<name>.txt`) and the chosen seed/model
  in the review sheet. Mark every generated file `ai-v1`, `-v2`… in its name.
- Export final JPEGs at the size of the image they replace (room/bed images match the generic
  renders' dimensions) so all percentage coordinates remain valid.
