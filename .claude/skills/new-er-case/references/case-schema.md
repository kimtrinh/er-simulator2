# Case schema and where each piece lives

Derived from the MediSim ER app (`kimtrinh/medisim-er`, Nov 2026). Always confirm against one
full existing gold case before writing — if a field below disagrees with the live code, the
code wins; update this file.

## Where a case is stored

| What | File / place | Notes |
|---|---|---|
| Gold seed (full) | `cases-gold.json` → `cases[]` on Kim's machine | Loaded instantly, no model call. |
| Public stub | same file in the deploy (`id`, `title`, `patient`, `"_members": true`) | Produced by `tools_split_members.cjs` at build time. |
| Member content | Supabase table `member_cases` | Only signed-in players can read. The 17 `resus-*` cases are free/public (`PUBLIC_CASE_RE`). |
| Offline play | `cases-offline.json` → `packs[<id>]` (`startState`, `responders[]`) | Instant engine; validated by `tools_validate_packs.cjs`. |
| Case art | `CASE_VISUALS`, `PATIENT_PHOTO_STATES`, `ROOM_LAYERS` in `index.html` | Explicit allow-list — never inferred from context. |
| Films / clips | `media/` + `media-manifest.json` | Keyed `<modality>_<finding>`. |
| Hotspots | `media-hotspots.json` | Same key as the manifest. |
| Provenance | `clinical-provenance.json` | Source inventory; review stays pending until Kim signs. |
| Voices | `media/voice/<hash>.m4a` + `voice-clips.json` | Rendered by `tools_render_voices.cjs`, key = cyrb53(voice, speed, text). |
| Intro reel (new) | `scenes/intro/<id>/NN.webp` + `INTRO_REELS[<id>]` | See `ken-burns-intro.md`. |

## Gold seed fields (the `CASE_SYSTEM` contract)

```jsonc
{
  "id": "eb-button-battery",                 // <system-prefix>-<slug>, unique
  "title": "Drooling and refusing to eat",   // chief-complaint style, never the diagnosis
  "patient": { "sex": "male", "age": 2, "ageBand": "child" },   // age: years, or "3 weeks" / "newborn"
  "intro": "…vivid bedside scene with nurse/patient dialogue and the chief complaint…",
  "speech": [                                 // the intro voiced, in order
    { "speaker": "narrator", "text": "…" },   // narrator | patient | nurse | consultant | medic | family
    { "speaker": "nurse",    "text": "…" }
  ],
  "vitals": { "hr": 0, "bpSystolic": 0, "bpDiastolic": 0, "rr": 0, "o2": 0, "temp": 0, "rhythm": "Sinus Tachycardia" },
  "context": "HIDDEN brief: true dx + pathophysiology; comorbidities & home meds that alter the picture; social factors; 2–3 competing dx; can't-miss traps; deterioration trajectory and concrete complications if mismanaged; the expected imaging/lab results.",
  "diagnosis": "Single definitive diagnosis (scored against)",
  "learningPoints": ["4–5 separate short strings"],
  "criticalActions": ["4–6 imperative, time-bound where evidence allows"]
}
```

Rules that the engine and tests enforce:

- `intro` never names the diagnosis or a learning point; presentation is high-acuity and
  undifferentiated (atypical, early, or confounded).
- `ageBand`: child (<13), young (13–35), adult (36–64), senior (65+). The visual base
  (`young-m`, `mid-f`, `older-m`, `elder-f`, `teen-m`, `child`, `infant`, `-2` variants) is
  chosen by `patientBaseFor(patient)` — make sure the age/sex you write picks a base that
  looks right, or supply `CASE_VISUALS`.
- Vitals are borderline/unstable with room to deteriorate and reflect home meds
  (e.g. beta-blocker blunting tachycardia).
- `rhythm` uses the engine's names: "Sinus Rhythm", "Sinus Tachycardia", "Atrial Fibrillation",
  "SVT", "Ventricular Tachycardia", "Ventricular Fibrillation", "Complete Heart Block",
  "Asystole", "Paced", etc. — the telemetry renders from it.
- ECG and CXR reports carry **no read**; US/CT/MRI reads give findings and measurements, not
  the unifying diagnosis.
- In `diagnosticReports`, attach a film with `"image": {"type": "<cxr|xr|ct|us|mri|ekg|derm>", "query": "<manifest kw>"}`;
  `resolveStudyImage` tries curated manifest first (same modality + region), then a reviewed
  normal for the region, then live Commons search. For a new case, **always add a curated
  manifest entry** so the case never depends on live search.

## Offline pack (`cases-offline.json → packs[<id>]`)

```jsonc
{
  "startState": { "padsOn": false },          // optional initial room/gear flags
  "responders": [
    { "intent": "history",    "match": { "any": ["what happened", "hpi", "…"] },
      "speech": [{ "speaker": "family", "text": "…" }] },
    { "intent": "exam",       "match": { "any": ["mouth", "oropharynx", "…"] },
      "physicalExam": [{ "region": "HEENT", "finding": "…" }] },
    { "intent": "assessment", "match": { "any": ["<dx synonyms>"] },
      "speech": [{ "speaker": "nurse", "text": "…" }] }
    // + labs / imaging / treatment / consult / disposition responders
  ]
}
```

Coverage checklist: HPI, PMH/meds/allergies, social, each exam region, every lab or study a
competent player would order (including the discriminating one), every critical action,
each relevant consult, disposition, and at least one red-herring finding. Match phrases
should include abbreviations and lay phrasing. Run `node tools_validate_packs.cjs` after.

## Case art wiring (only when bespoke art is justified)

```js
// index.html
CASE_VISUALS['<id>'] = {
  patient: 'patient-trauma/case-<id>.jpg',      // bedside camera
  room:    'scenes/room-case-<id>.jpg'          // side-on room camera
};
PATIENT_PHOTO_STATES['<id>'] = { room: { ett: 'scenes/room-case-<id>-ett.jpg' } };  // reviewed device states
ROOM_LAYERS['case:<id>'] = [ { on: 'binder', src: 'scenes/layers/case-<id>-binder.png', box: [l, t, w, h] } ];
ROOM_SCENE_SHIFT['case-<id>'] = [dx, dy];  // % offset of the patient vs. the generic room, measured
ROOM_CART_SHIFT['case-<id>']  = [dx, dy];  // only if the crash cart moved in the new photo
```

`box` / shifts are percentages of the photo, **measured** on a grid sheet (`scripts/grid_sheet.py`),
never estimated. Zones (`ROOM_ZONES.head/chest/abdomen/legs`) come from the generic room render —
if the new room photo moves the patient, measure the shift rather than redrawing zones.

## Manifest entry (`media-manifest.json`)

```jsonc
"xr_<finding>": {
  "file": "media/xr_<finding>.jpg",
  "label": "Radiograph — <region>, <finding>",        // what the film viewer shows after commit
  "kw": ["<finding>", "<synonyms>", "<region> <finding>"],
  "credit": "<author>", "license": "CC BY-SA 4.0", "license_url": "https://creativecommons.org/licenses/by-sa/4.0",
  "page": "https://commons.wikimedia.org/wiki/File:…", "source_title": "File:…",
  // optional
  "region": "chest", "normal": true, "generic": true,
  "video": "media/usv_<key>.webm", "video_poster": "media/usv_<key>.jpg",
  "video_credit": "…", "video_license": "…", "video_license_url": "…", "video_page": "…",
  "video_title": "…", "video_note": "Cropped and transcoded for offline playback", "video_kw": ["…"],
  // AI only (never for the finding the learner must read):
  "generated": true, "license": "AI-generated illustrative asset"
}
```

## Provenance (`clinical-provenance.json`)

Add any new organisation to `sourceSets` (`organization`, `title`, `url`, `version`,
`inventoryCheckedAt`, `scope`). Record the case's sources with the date checked. Never set
an approval: `reviewPolicy.approvalRequires` = named qualified clinician + review date +
case-specific reference verification — that is Kim.
