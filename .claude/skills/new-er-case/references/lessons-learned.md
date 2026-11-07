# Lessons learned from Kim's earlier cases

Harvested from Kim's dated feedback recorded in the MediSim ER source (Sept–Oct 2026).
Add to this list whenever Kim rejects or corrects something in a new case.

## Art and scenes

- **Age must look right.** "A toddler case showing a grown man in the bed taught the wrong
  size for every dose and every device in the room." Children and infants have their own scenes.
- **Gemini will not draw a real minor.** Pediatric patients use the existing `child` / `infant`
  bases and the manikin overlays (`patient-overlays/manikin`). Don't try to generate a
  photoreal child; in intro reels for pediatric cases, show the parent's hands, the car seat,
  the toy, the doorway — not the child's face.
- **Diverse faces, chosen by the case** (2026-09-16, "more diverse graphics"): `idealBaseFor()`
  picks among two young-adult faces, middle-aged, older, elder, teen from the case's words
  and exact age; one case always shows the same person. Write the seed's age/description so
  the right face is chosen.
- **Best perspective; always start in ROOM view** (2026-09-14/15).
- **Paired bed and room images** — switching views must never change the patient's apparent
  age, sex or visible injuries.
- **Don't guess which case gets bespoke art.** `CASE_VISUALS` is an explicit list: guessing
  from context could leak the diagnosis or put a wound on a distractor case.
- **Device photos are edits of the original** with only the device copied in, so the mouth
  and chest stay where the zones were measured (room ETT states, 2026-09-28: "the intubated
  pt is crucial … the main room view is more important").
- **Overlays sized to anatomy.** The cric picture was removed — "way too big, it doesn't make
  sense" (2026-09-28); the Codex cric *animation* stayed.
- **Arrest look**: the VF man "looks burnt or like a ghost" (2026-10-04) — reverted to his
  original photo. Pallor/cyanosis edits must be subtle; compare against the original.
- **BVM on the face** (2026-09-25, "Bvm not on the face"): in the side view the face looks at
  the ceiling, so nose and mouth are the TOP edge of the head. Check every airway device
  against this.

## Images and studies

- **Ultrasound should move** (2026-09-16, "Consider adding GIFs for ultrasound"): loops play
  in the results card and on the cart's screen in the room; the film viewer keeps the still
  because its hotspots are drawn on the still. Reduced motion keeps the still everywhere.
  So every cine entry needs a matching still + hotspots.
- **Hotspots from a 10% grid**, not estimated — "a ring beside the pathology teaches the wrong thing."
- **A normal study of a region with a reviewed normal film never goes to live search**, which
  "cannot tell 'normal pelvis' from a pelvis with a hip replacement in it." Give every new
  case curated films, normals included, so it never depends on live search.
- **ECG and CXR have no written read** — the learner interprets them.

## Case behaviour

- **Validated first, said plainly** (2026-09-16, "Separate experimental cases in a separate
  section"): only cases graded end to end and hand-checked by Kim are "validated". A new case
  ships as *experimental* until Kim signs it off — say so in the PR.
- Physiology should respond like real life ("When I give adenosine there should be a brief
  sinus pause", 2026-09-29): script the expected drug responses in the hidden context.
- Order wording: "when I order a neuro exam, it understands neuro consult instead"
  (2026-09-18) — offline responder `match` phrases must keep exam vs consult apart.
- Medication sequencing per current guidance, e.g. "it is not recommended to give
  medication back to …" (2026-09-25) — the team holds an order that contradicts the
  algorithm rather than silently doing it.
- Members-only: non-resuscitation cases publish as stubs; full content goes to Supabase
  `member_cases` (2026-09-29, "only let ppl who sign in have access").
