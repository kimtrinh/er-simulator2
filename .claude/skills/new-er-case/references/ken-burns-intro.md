# Ken Burns intro reel

A 20–40 s cinematic opening that plays under the voiced intro (`speech`) before the bedside
appears: slow push-ins and pans across 3–5 stills, crossfading on each speaker turn. It sets
the scene and mood; it must never reveal the diagnosis.

## Shot list (pick 3–5)

| Beat | Example still | Motion |
|---|---|---|
| Establishing | ambulance bay at night, rain on the doors / a quiet kitchen / a trailhead | slow push-in toward the doors |
| Arrival | medics wheeling the stretcher through the doors, motion blur | pan left→right following the stretcher |
| The person | close on the patient's face, hands, or what they are holding — the human detail | very slow push-in on the eyes/hands |
| A clue in plain sight (optional) | a pill organiser on the counter, a lawn chair beside the grill | push-in, but the clue is only incidental in frame |
| The bay | the resus room waiting, monitor glowing, team gloving up | pull-out to wide, then hand off to the live room view |

Write the shots from the `intro`/`speech` text; an incidental clue is fine if the intro already
contains it, but nothing the learner hasn't been told. No faces of staff in sharp focus, no
text, no logos, no real places. Pediatric cases: no child's face (Gemini will not draw a real
minor) — show a parent's hands, the car seat, a toy, the doorway.

## Generating stills

Use `scripts/gemini_image.py` with the style bible from `gemini-art.md`, **16:9 at 2K**
(the reel crops as it zooms, so generate larger than the stage). For the "person" shot, pass
the case's bed/room image (or the generic base) as a reference so the face matches the patient
the learner is about to meet. Export WebP q≈82, ≤ 350 KB each, to
`scenes/intro/<case-id>/01.webp … 05.webp`.

## Wiring

Drop-in files: `assets/ken-burns-intro.js` + `assets/ken-burns-intro.css`
(working demo: `assets/ken-burns-demo.html`). Declare the reel next to `CASE_VISUALS`:

```js
INTRO_REELS['<case-id>'] = {
  shots: [
    { src: 'scenes/intro/<id>/01.webp', from: [0.50, 0.55, 1.00], to: [0.46, 0.50, 1.14], speech: [0] },
    { src: 'scenes/intro/<id>/02.webp', from: [0.30, 0.50, 1.08], to: [0.62, 0.50, 1.08], speech: [1, 2] },
    { src: 'scenes/intro/<id>/03.webp', from: [0.50, 0.40, 1.04], to: [0.52, 0.36, 1.18], speech: [3] }
  ]
};
```

`from` / `to` = `[focusX, focusY, scale]` (focus as 0–1 of the image). `speech` lists the
`speech[]` turn indexes that play over that shot; the shot holds until those turns finish
(or `minMs`, default 6000). Call it from the case start path just before `narrate(...)`:

```js
const reel = INTRO_REELS[S.goldId];
if (reel) await playKenBurnsIntro(reel, { stage: roomEl, onTurn: i => speakTurn(seed.speech[i]) });
```

`playKenBurnsIntro` resolves when the reel ends or is skipped, so the existing narration/room
start continues unchanged. It handles: image preload (falls back to skipping a shot that fails),
skip button + Esc + tap, `prefers-reduced-motion` (no pan/zoom, short crossfades only),
pausing when the tab is hidden, and a letterboxed 16:9 stage that also works in portrait.

## Motion rules (what makes it look like Ken Burns, not a slideshow)

- Scale range 1.00 → 1.12–1.20; never zoom out past 1.0 (edges show).
- Duration 6–9 s per shot; ease `cubic-bezier(.25,.1,.25,1)` or linear for pans.
- Crossfade 1.0–1.4 s with both images moving during the overlap.
- Alternate direction between consecutive shots (in → pan → in → out) so it breathes.
- Focus points sit on the subject's eyes/hands/door, so the push-in lands on something.
- Subtle vignette + slight film grain (CSS) are optional; keep the text track (who is
  speaking) in a lower-third captions bar for accessibility.
- Total reel ≤ 40 s; first frame within 300 ms (preload shot 1 only, lazy-load the rest).
