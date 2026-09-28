# Airway Lab — 3D Video-Laryngoscope Intubation Simulator (Plan)

A hands-on 3D intubation trainer inside MediSim ER. The player opens the mouth, inserts a hyperangulated video laryngoscope (GlideScope-style), gets a view of the glottis on the device's screen, and passes a styletted endotracheal tube with their own fingers (phone) or keyboard + mouse (Mac). It should look like a Blender render, not a cartoon, and it should reward good VL technique and punish the usual VL failure modes.

> Status: **plan only** — nothing here is implemented yet. Open questions are at the end.

---

## 1. Goals and non-goals

**Goals**
- Photoreal-ish 3D scene: patient head/neck with an anatomically faithful upper airway, a hyperangulated video laryngoscope, and an ETT with a rigid 60° stylet.
- Direct manipulation: two-finger "scissor" to open the mouth, one finger to drive the tube, orbit/zoom the scene like a 3D asset viewer.
- Same experience on Mac with arrows + mouse (and trackpad).
- A **live laryngoscope camera view** — a second camera at the blade tip rendered onto the device's monitor and into a HUD inset. You "look at the screen" just like the real thing.
- Teach real technique, not just "drag tube to target":
  - midline blade insertion, no tongue sweep; tip in the vallecula;
  - **don't over-insert** — a smaller glottic view in the upper half of the screen makes the tube easier to pass;
  - watch the tube go in *in the mouth* until it's behind the tongue (avoids palatal/tonsillar-pillar injury), then look at the screen;
  - the classic hang-up on the right arytenoid / anterior tracheal wall, fixed by **popping the stylet back 5–8 cm while advancing** and/or **rotating the tube clockwise**;
  - depth at the teeth (~21 cm female / ~23 cm male), cuff just past the cords;
  - confirmation with a sustained ETCO₂ waveform.
- A physiologic clock: SpO₂ falls during apnea with a realistic plateau-then-cliff curve, driven by the case's patient.
- Plug into the existing ER sim: ordering **Rapid Sequence Intubation** can launch the Airway Lab, and the result feeds the case and the debrief.

**Non-goals (v1)**
- True finite-element soft-tissue physics. We fake deformation with rigs + morph targets driven by instrument position.
- Direct laryngoscopy (Mac/Miller), bougie, and surgical airway — good v2 candidates (see §10).
- The single-file `medisim-er-local.html` edition. 3D assets and three.js don't fit that format well; revisit later.

---

## 2. What the player does (procedure flow)

The simulator is a small state machine. Each phase changes which controls are live and what the coach says.

| # | Phase | Player action | Success condition / failure modes |
|---|-------|---------------|-----------------------------------|
| 0 | **Prep** | Pick ETT size (7.0–8.0), check cuff, confirm stylet at 60°, preoxygenate (choose NRB / BVM / HFNC), position (sniffing / ramped) | Choices set the safe-apnea time. Skipping preox shortens it a lot. |
| 1 | **Open mouth** | Scissor technique: two fingers spread (phone) / hold ↑ (Mac) | Jaw opens to the patient's max inter-incisor gap (limited in trismus scenarios). |
| 2 | **Insert blade** | Drive the blade in midline, follow the tongue curve | Tip reaches vallecula. Over-insertion → blade under the epiglottis / into the esophageal inlet, view is huge and close. Levering against upper incisors → **dental trauma** event. |
| 3 | **Optimize view** | Lift/tilt the blade; pull back slightly | Glottis in upper half of the screen, ~⅓–½ screen width. Cormack-Lehane / POGO % computed live. |
| 4 | **Insert tube** | Tube enters from the right corner of the mouth; watch the mouth (external view) until the tip is behind the tongue | Tip passing blindly on the screen too early → soft-palate injury event. |
| 5 | **Pass the cords** | Steer tip to the glottis on the screen, advance | Tip contacts right arytenoid or anterior tracheal rings → **hang-up**. Fix: pop stylet (withdraw while advancing), rotate clockwise 90°, or back the blade out a little. Tip posterior → **esophageal**. |
| 6 | **Seat & secure** | Remove stylet, set depth, inflate cuff (syringe) | Depth too deep → right mainstem (unilateral chest rise/breath sounds). Too shallow → cuff at cords, leak. |
| 7 | **Confirm** | Attach ETCO₂, bag, auscultate | Sustained capnography waveform ≥5 breaths = confirmed. Flat line = esophageal; must recognize and pull. |

Global clock: SpO₂ from the preox plateau drifts, then falls steeply; HR slows below ~70%. If SpO₂ crosses a threshold the nurse calls it and the player may abort, bag, and reattempt (attempt count is scored).

---

## 3. Controls

### 3.1 Phone / tablet (touch, landscape recommended)

The real procedure is two-handed — left hand on the scope, right hand on the tube — so the screen is split the same way. Your two-finger mouth-opening gesture maps directly onto the real **scissor technique** (thumb on lower teeth, index on upper teeth).

```
 ┌───────────────────────────────────────────────────────────────┐
 │  [VL screen inset — tap to swap with main view]    SpO₂ 97  ⏱ │
 │                                                               │
 │   LEFT HAND ZONE                    │   RIGHT HAND ZONE       │
 │   (scope / mouth)                   │   (tube)                │
 │                                     │                         │
 │   2-finger spread = open mouth      │   1-finger drag up/down │
 │   1-finger drag  = blade in/out     │     = advance/withdraw  │
 │   1-finger arc   = lift / tilt      │   drag left/right       │
 │                                     │     = steer tip         │
 │                                     │   2-finger twist        │
 │                                     │     = rotate tube       │
 │   [ Look / Orbit ]  [ Cutaway ]     │   [Pop stylet] [Cuff]   │
 └───────────────────────────────────────────────────────────────┘
```

- **Open mouth (Phase 1):** two-finger spread on the lips. The gap follows the finger distance up to the patient's anatomical limit. Once the blade is in, the blade holds the mouth and the fingers are free.
- **Blade (left zone):** one finger drag = insert/withdraw along the blade curve; drag in an arc = lift/tilt (rotation about the handle). A hold keeps the current position — letting go does *not* snap the blade out (lets you use the right hand alone).
- **Tube (right zone):** one finger drag up = advance, down = withdraw; sideways = steer the tip; **two-finger twist** = rotate the tube around its long axis. "Pop stylet" is a hold button: while held, advancing the tube also withdraws the stylet.
- **Look / Orbit mode:** toggled by a button (or a three-finger drag). In this mode one finger orbits, pinch zooms, two-finger drag pans — like a 3D model viewer. Kept as a separate mode so it never fights the procedure gestures.
- **View:** tap the inset to swap between the external view and the laryngoscope screen; **Cutaway** shows a sagittal section so you can see the tube path (student level only by default).
- Haptics via `navigator.vibrate` where supported (Android) on tissue contact / hang-up / "pop" of passing the cords. iOS Safari has no web vibration API; fall back to audio + visual cues.
- iOS pitfalls to design around: page pinch-zoom and edge-swipe-back. Use `touch-action: none` on the canvas, cancel `gesturestart`, and encourage "Add to Home Screen" for full screen.

### 3.2 Mac (keyboard + mouse / trackpad)

| Input | Action |
|-------|--------|
| **↑ / ↓** (hold) | Open / close the mouth (scissor) |
| **1 / 2** or **Tab** | Select active instrument: blade ↔ tube |
| **Left-drag** | Manipulate the active instrument: vertical = advance/withdraw, horizontal = steer (tube) or tilt (blade) |
| **Scroll wheel** | Fine advance/withdraw of the active instrument |
| **Q / E** | Rotate tube counter-clockwise / clockwise |
| **W / S** | Blade lift / relax |
| **Hold Space** | Pop stylet (withdraw while advancing) |
| **C** | Inflate cuff (hold to fill; release to stop) |
| **Right-drag** or **⌥ + drag** | Orbit camera (⌥ variant for trackpads) |
| **Pinch / ⌘ + scroll** | Zoom |
| **V** | Swap external view ↔ laryngoscope screen |
| **X** | Toggle cutaway |
| **R** | Abort attempt, bag, reattempt |

All bindings live in one config object so they're easy to change and to show in an on-screen legend.

---

## 4. Visual target: "looks like a Blender asset"

### 4.1 Assets (authored in Blender, shipped as glTF 2.0 `.glb`)

| Asset | Contents | Budget (desktop / mobile LOD) |
|-------|----------|-------------------------------|
| `patient_head.glb` | Head, neck, face skin, teeth, tongue, hard/soft palate, uvula, tonsillar pillars, epiglottis, vallecula, aryepiglottic folds, arytenoids, vocal cords, trachea (first rings, carina for depth), esophageal inlet. Separate inner airway mesh for the camera view. | ~120k / ~50k tris |
| `videolaryngoscope.glb` | Hyperangulated blade + handle + camera window + LED; small bedside monitor. **Generic design, no manufacturer branding.** | ~15k / ~8k |
| `ett.glb` | Tube (7.0–8.0 as scale), printed cm markings, radiopaque line, Murphy eye, cuff (morph target: deflated→inflated), pilot balloon + line, 15 mm connector, rigid 60° stylet | ~12k / ~6k |
| `props.glb` (later) | Syringe, BVM, ETCO₂ detector, suction (Yankauer) | small |

**Rig and data contract (the most important thing to agree with the artist):**
- Bones: `jaw` (mouth opening), tongue chain, `epiglottis`, head/neck (for positioning / c-collar).
- Morph targets (shape keys): `tongue_displaced`, `epiglottis_lift`, `cords_abducted`, `cuff_inflate`, and scenario variants (`angioedema_swelling`, `anterior_larynx`, …).
- Empties as landmarks (exported as glTF nodes): `LM_upper_incisors`, `LM_lower_incisors`, `LM_R_mouth_corner`, `LM_vallecula`, `LM_epiglottis_tip`, `LM_glottis_center`, `LM_R_arytenoid`, `LM_L_arytenoid`, `LM_esophagus_inlet`, `LM_carina`, and `CAM_blade` (the VL camera pose on the blade).
- Airway centerline curve (mouth → carina) exported as a sampled node chain — used for tube "follow-the-leader" after the stylet is popped.
- A baked collision field (see §5.3) with per-voxel tissue labels.

**Sourcing options** (decision needed):
1. **Commission** a medical 3D artist to build the head/airway in Blender to the contract above — best quality and fit, highest cost.
2. **License** an existing medical head/airway model (CGTrader / TurboSquid / Sketchfab) and have it rigged to the contract — faster; check the license allows use in a web app and modification.
3. **Derive from open anatomy** (e.g. Z-Anatomy / BodyParts3D, CC BY-SA) — free, but needs heavy retopology and texturing, and the share-alike license applies to the derived model.

ETT, stylet, and blade are simple hard-surface models and can be built in-house quickly in any of these options.

### 4.2 Materials and lighting

- PBR everywhere (`MeshPhysicalMaterial`).
- **Mucosa:** wet look via `clearcoat` + low roughness, `sheen`, and a lightweight subsurface-scattering approximation (wrapped diffuse + thickness map) — full transmission is too slow on phones. Normal + roughness detail maps for rugae/vessels.
- **Skin:** SSS approximation, pore normal map, subtle specular.
- **ETT:** clear PVC via `transmission` + `ior ≈ 1.5`, printed markings as an alpha decal texture, blue radiopaque stripe, cuff with `thickness`.
- **Teeth:** enamel with slight translucency.
- **Lighting:** HDRI environment of a resus bay for the external view (tone mapping: AgX to match Blender, or ACES); baked AO/lightmaps from Blender for the head. Inside the airway the **only light is the blade's LED** — a spotlight parented to `CAM_blade` — which is what makes the VL view look real.
- **VL camera feed look:** slight barrel distortion, vignette, mild noise, auto-exposure; scenario effects like **lens fogging** (if the blade isn't warmed/anti-fogged), and **blood/vomit** occluding the lens (SALAD suction scenario, v2).
- **Post-processing (desktop):** SSAO, subtle bloom on wet highlights, depth of field in the external view. Mobile: reduced set.

### 4.3 Quality tiers

Auto-detect on load (GPU tier + a quick frame-time probe), user-overridable:
- **High** (Mac / recent iPhone & iPad): full post, 2K textures, shadows, full-res VL render target.
- **Medium:** no SSAO/DoF, 1K textures, half-res VL target.
- **Low:** baked lighting only, no post. Target ≥ 30 fps on a 3-year-old mid-range phone.

---

## 5. Technical architecture

### 5.1 Stack (fits the existing React + Vite + TypeScript app)

- **three.js** via **@react-three/fiber** (R3F) and **@react-three/drei** (GLTF loading, environment, camera controls, render-to-texture helpers).
- **@react-three/postprocessing** for the post stack.
- **@use-gesture/react** for multi-touch (pinch, twist, drag, multi-pointer) — handles the tricky pointer-event bookkeeping on iOS/Android and works with R3F.
- **gltf-transform** CLI in the asset pipeline: Meshopt/Draco geometry compression, **KTX2** (Basis) textures, resize for mobile tiers.
- The whole Airway Lab is **lazy-loaded** (`React.lazy` + dynamic `import()`), so the ER sim's initial bundle doesn't pay for three.js or the models.
- Assets served from `public/models/` (Vite copies as-is; the Express server already serves the built client).

### 5.2 Separation: simulation vs. rendering

Keep the procedure logic in plain TypeScript with no three.js/React dependency so it's deterministic and unit-testable:

```
airway/
  sim/
    procedureMachine.ts   phases, transitions, events (hang-up, esophageal, dental trauma…)
    instruments.ts        blade + tube pose from inputs (depth, lift, steer, roll, stylet position)
    tubeKinematics.ts     rigid styletted tube → flexible follow-the-leader after stylet pop
    collision.ts          queries against the labeled distance field / landmark volumes
    oxygenation.ts        safe-apnea / SpO₂ desaturation + HR response
    scoring.ts            metrics → result summary
    scenarios.ts          normal, obese, c-spine, trismus, anterior larynx, angioedema, SALAD…
  input/
    bindings.ts           Mac key/mouse map
    useTouchControls.ts   phone zones + gestures (@use-gesture)
    useDesktopControls.ts
    → both emit the same normalized InputState { mouthOpen, bladeDepth, bladeLift, tubeDepth, tubeSteer, tubeRoll, stylet, cuff }
  render/
    AirwayScene.tsx       R3F canvas, lights, environment, quality tier
    PatientModel.tsx      drives jaw bone + morph targets from sim state
    Laryngoscope.tsx      blade pose + VL camera + LED; renders feed to a render target
    EndotrachealTube.tsx  tube/stylet/cuff meshes from tubeKinematics
    CameraFeed.tsx        VL screen texture + HUD inset + lens effects
    Cutaway.tsx           clipping plane + stencil cap for sagittal section
  ui/
    AirwayLab.tsx         entry component (lazy-loaded), scenario picker, HUD, coach messages
    MiniMonitor.tsx       reuses components/VitalsMonitor + TelemetryWaveform; adds ETCO₂ waveform
    AirwayDebrief.tsx     per-attempt metrics and replay
```

Frame loop: `input → sim.step(dt, input) → render reads sim state`. The sim runs at a fixed timestep; render interpolates.

### 5.3 Tube and tissue model (fake it well)

- **Styletted tube = rigid body.** With the stylet fully in, the whole tube is rigid with the 60° preformed curve. The hand controls a reduced set of degrees of freedom: insertion depth along the entry path, steer (small pitch/yaw), and roll about the long axis. This is exactly why real VL tube passage is hard — you can see the target but you can't bend the tube to it.
- **Stylet popped = flexible tip.** The part of the tube distal to the stylet tip becomes a chain that relaxes toward straight and, once past the cords, follows the airway centerline ("follow-the-leader"). This makes the pop-and-advance maneuver work naturally.
- **Rendering the tube:** a skinned mesh on a ~20-bone chain (or `TubeGeometry` regenerated along the curve on low tier).
- **Collision:** start with **landmark volumes** (spheres/capsules around arytenoids, epiglottis, incisors, anterior tracheal wall, esophageal inlet) — enough for the greybox. Upgrade to a **baked signed-distance field** of the airway lumen (e.g. 64³–96³, ~1 MB, exported from Blender via a small Python script) with a tissue-label channel, so any contact reports *what* was hit ("tip caught on the right arytenoid"). Contacts resist motion and raise events; forcing through raises tissue-trauma events.
- **Soft tissue:** morph weights driven by instrument state — blade depth → `tongue_displaced`; blade tip in the vallecula + lift → `epiglottis_lift`; jaw bone from mouth opening; cords still after paralysis (RSI), gently moving if not paralyzed (awake scenario, v2).
- **Views scored live:** percentage of glottic opening (POGO) = fraction of glottis-landmark sample points visible and unoccluded from `CAM_blade` (cheap raycasts), plus where the glottis sits on screen and how big it is — this drives "back the blade out" coaching.

### 5.4 Oxygenation model

Simple, tunable, and physiologically shaped:
- Pre-attempt O₂ reserve set by preox method/duration, FRC (obesity, pregnancy), shunt, and O₂ consumption (sepsis, fever, children).
- SpO₂ holds near baseline during the safe-apnea window, then follows a steep oxyhemoglobin-dissociation-shaped fall. Apneic oxygenation (nasal cannula at 15 L during the attempt) extends the window.
- HR response (bradycardia at low SpO₂), audible pulse-ox pitch drop (reuse `services/audioEffectsService.ts` patterns).
- In-case mode seeds this from the live case vitals.

---

## 6. Integration with the ER simulator

1. **Standalone "Airway Lab"** — a button on the start screen opens a scenario picker (normal, obese, c-spine in-line stabilization, limited mouth opening, anterior larynx, angioedema, blood/vomit). Practice without an API key.
2. **In-case** — when the player orders **Rapid Sequence Intubation** (`data/orderCatalog.ts`), the nurse asks whether they want to perform it themselves. "Yes" opens the Airway Lab as a full-screen overlay seeded with the case patient (current SpO₂/HR, body habitus and airway features from the case). "No" keeps today's behavior.
3. **Result back into the case** — on finish, an `IntubationAttemptResult` (new type in `types.ts`) is filed as the order's result and a chart entry, e.g. *"Intubated with 7.5 ETT via hyperangulated VL, first pass, 38 s, 23 cm at teeth, lowest SpO₂ 91%, ETCO₂ waveform confirmed."* The bedside engine sees it on the next turn (so a failed or esophageal intubation has consequences), and the case record sent to `/api/sim/grade` includes it so the debrief grades the airway.
4. **Training levels** (`data/trainingLevels.ts`):
   - *Medical Student* — guided: cutaway on, ghost tube path, step prompts, generous apnea time.
   - *Resident* — hints on request only, realistic apnea time.
   - *Attending* — no guides, difficult-airway features more likely, time pressure, the nurse only calls sats.

### Scoring (per attempt and overall)

First-pass success · attempts · time to intubation (blade in → ETCO₂) · lowest SpO₂ / time below 90% · best POGO / C-L grade achieved · esophageal intubation recognized (and how fast) · mainstem · tube depth · dental / palatal / arytenoid trauma events · hang-up handled correctly (stylet pop / rotation vs. forcing) · confirmation performed.

---

## 7. Milestones

| Milestone | Scope | Exit criteria |
|-----------|-------|---------------|
| **M0 — Tech spike** (~1 wk) | Lazy-loaded R3F canvas, placeholder primitives, both control schemes emitting `InputState`, blade camera rendering to a texture + HUD inset | Runs at ≥ 30 fps on a real iPhone and a Mac; gestures don't trigger page zoom/back-swipe |
| **M1 — Greybox procedure** (~2 wks) | Full phase machine, rigid tube + stylet pop, landmark-volume collision, oxygenation model, scoring, coach messages, blockout anatomy | A complete intubation (and the common failures) is playable end-to-end with ugly geometry; sim modules unit-tested |
| **M2 — Assets** (2–6 wks, depends on sourcing) | Blender head/airway, VL, ETT to the data contract; rig + morphs; export pipeline with gltf-transform | Assets load with named landmarks/bones/morphs; size ≤ ~8 MB (mobile tier ≤ ~4 MB) |
| **M3 — Realism pass** (~2 wks) | Materials (wet mucosa, SSS approximation, PVC tube), LED-lit VL view, lens effects, HDRI, post stack, quality tiers, cutaway, SDF collision | Side-by-side with a real VL video clip looks convincing; perf targets hold per tier |
| **M4 — ER integration** (~1 wk) | Start-screen entry, RSI order hook, result → case/chart/grader, training-level behaviors, debrief section | An in-case RSI performed in the Airway Lab changes the case and shows up in the debrief |
| **M5 — Scenarios & polish** (~2 wks) | Difficult-airway scenarios, audio (cuff syringe, capnography, pulse-ox tone), haptics, attempt replay, onboarding tutorial, control legend | Clinician playtest (you + 2–3 colleagues) signs off on fidelity |

---

## 8. Testing

- **Unit tests** for `airway/sim/*` (phase transitions, hang-up detection, stylet pop, depth/mainstem, oxygenation curve shape). The repo has no test runner today; add **Vitest** (already Vite-native) for these modules.
- **Type check** with the existing `npm run lint` (`tsc --noEmit`).
- **Playwright smoke test** (Chromium is available in CI/containers): load the Airway Lab, wait for assets, drive a scripted intubation through `InputState`, screenshot the external and VL views to catch rendering regressions.
- **Device testing**: iPhone (Safari), Android (Chrome), iPad, Mac (Safari + Chrome, mouse and trackpad).
- **Clinical review**: an ED physician checks anatomy, technique cues, failure modes, and scoring before each milestone ships.

---

## 9. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Realistic anatomy assets are the long pole (cost/time/licensing) | Decide sourcing early (§4.1); build M1 on blockout geometry so logic work isn't blocked; lock the data contract first. |
| Multi-touch conflicts (three simultaneous touches, iOS gestures) | Split-screen zones, separate Look/Orbit mode, `touch-action: none`, landscape prompt, home-screen install. Early device testing in M0. |
| Phone performance with wet/SSS materials and a second render pass | Quality tiers, cheap SSS approximation, half-res VL target, KTX2 textures, LODs. |
| "Feels like a game, not like intubating" | Anchor mechanics to real VL failure modes (rigid stylet, hang-up, over-insertion); clinician playtests every milestone. |
| Trademark: "GlideScope" is a Verathon trademark | Model a **generic hyperangulated video laryngoscope** with no branding; use the brand name only descriptively, if at all. |
| Scope creep (DL, bougie, cric, pediatrics) | Keep them in §10 until v1 ships. |
| Bundle size impact on the ER sim | Lazy-load the whole feature; assets fetched only when opened; show a loading progress bar. |

---

## 10. Future ideas (v2+)

- Direct laryngoscopy with Macintosh/Miller blades (and the head-lift/BURP external laryngeal manipulation gesture).
- Bougie-assisted intubation; tube exchange over bougie.
- Suction-assisted laryngoscopy (SALAD) with dynamic blood/vomit fluid.
- Awake intubation (topicalized, cords moving), pediatric airways (size-scaled anatomy).
- Scalpel-bougie-tube cricothyrotomy continuing from a failed airway.
- WebXR (Vision Pro / Quest) hand-tracking mode — the input layer's `InputState` abstraction makes this a new input adapter, not a rewrite.
- Replays and leaderboards for residency programs.

---

## 11. Open questions

1. **Asset sourcing:** commission, license, or open-anatomy derived (§4.1)? This sets the budget and the M2 timeline.
2. **Scope of v1:** hyperangulated VL only (this plan), or also standard-geometry (Mac-blade) VL/DL?
3. **Entry points:** standalone Airway Lab only first, or ship the in-case RSI hook in v1?
4. **Primary device:** phone-first (design controls and perf around it) or equal priority with Mac?
5. **Scenarios for v1:** which difficult-airway features matter most for your learners?
