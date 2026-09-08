# MediSim ER — Clinical AI Terminal

A high-fidelity emergency-room training simulator that runs as a self-contained website. Generate evidence-based clinical cases from any medical topic (or upload real records), then play the treating physician: take a history, order labs and imaging, run a physical exam, give treatments, and watch the patient's vitals respond in real time on a live monitor. When the case ends you get a scored debrief with critical-event analysis and learning points.

The clinical engine is powered by **Claude** (Anthropic API), and the bedside patient imagery by **Gemini**. Both API keys stay on the server and are never exposed to the browser.

## Features

- **Two ways to start a case** — type a medical topic ("Diabetic Ketoacidosis") or upload clinical records (PDF / images).
- **Bedside patient view** — every case renders a photo of *this* patient with *this* pathology. A 37-year-old trauma patient shows the bleeding lower extremity and the head injury, not a stock elderly portrait. The image re-renders when the patient's visible appearance changes — a tourniquet goes on, the patient gets intubated, the bleeding stops.
- **Live vitals monitor** — animated ECG waveform, HR / BP / RR / O₂ / temp with physiologic drift, and a stable → critical trend engine.
- **Clinical workspace** — labs, imaging reports, and physical-exam findings collect in a side chart as you order them.
- **Voice narration** — read clinical updates aloud via the browser's built-in speech synthesis (no extra services).
- **Scored debrief** — outcome, 0–100 performance breakdown, critical events, missed opportunities, and CME learning points.
- **Learning Log** — past cases are saved locally in your browser; download any case as a report.

## Run locally

**Prerequisites:** Node.js 18+ and an [Anthropic API key](https://console.anthropic.com/). A [Gemini API key](https://aistudio.google.com/apikey) is optional and enables the bedside patient imagery.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your env file and add your key:
   ```bash
   cp .env.example .env.local
   # edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
   # optionally set GEMINI_API_KEY=... to turn on patient imagery
   ```
3. Start the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Build & deploy

```bash
npm run build      # bundles the client (dist/) and the server (dist/server.cjs)
NODE_ENV=production node dist/server.cjs
```

The server serves the built client and exposes the simulation API. Deploy it to any Node host (Render, Railway, Fly.io, a VM, etc.) and set `ANTHROPIC_API_KEY` (and optionally `GEMINI_API_KEY` and `PORT`) in the host's environment. Because the keys live only on the server, they are never shipped to the browser.

## How it works

```
Browser (React + Vite)
  └─ POST /api/sim/topic | /api/sim/pdf | /api/sim/progress | /api/sim/patient-image
       └─ Express server (server.ts)
            ├─ Claude (server/claudeServer.ts) — structured JSON case + turn-by-turn simulation
            └─ Gemini (server/imageServer.ts) — the bedside photo of the patient
```

- `server/claudeServer.ts` — builds the prompts and calls Claude with structured outputs so every response is valid JSON (case setup, vitals, labs, imaging, debrief).
- `server/imageServer.ts` — turns a case's patient description into a bedside image.
- `services/geminiService.ts` — the browser's thin client for those endpoints.
- History is stored in `localStorage`; there is no external database or sign-in.

### How the patient imagery works

The picture is generated from the case, not picked from a library, so it can't
drift away from the scenario:

1. When Claude writes the case it also writes a **patient visual brief** — the
   patient's real age and sex, their build and position, the findings you can
   see from the doorway (bleeding and where, deformity, rash, pallor, work of
   breathing), and the lines and devices already on them.
2. `server/imageServer.ts` turns that brief into a prompt and calls Gemini's
   image model. Age and sex are pinned hard in the prompt, because image models
   otherwise drift toward a generic older patient — the exact failure this
   feature exists to fix.
3. During play, whenever the patient's **visible** appearance materially changes
   (tourniquet applied, intubated, chest tube in, cyanosis clearing), the engine
   returns an updated brief and the bedside view re-renders to match. Ordering a
   lab or asking a history question changes nothing visible, and renders nothing.

The findings the image is *supposed* to show are listed as chips beneath it in
the Clinical Workspace, so a wrong render is obvious at a glance — hit
**Re-render** to try again.

If a photographic render is declined, the server retries once in a textbook
illustration style (marked *Illustrated* under the image) rather than showing
you nothing. If `GEMINI_API_KEY` is unset, the bedside panel explains that
imagery is off and the rest of the simulator runs unchanged.

## Notes

- No secrets are committed. Provide `ANTHROPIC_API_KEY` (and `GEMINI_API_KEY`, if you want imagery) at runtime via `.env.local` (git-ignored) or your host's environment.
- Generated patient images are synthetic depictions of fictional patients for training. They are not photographs of real people and are not diagnostic material.
- `medisim-er-local.html`, the standalone local-model edition, has no server and so has no patient imagery.
- Educational simulation only — not for real clinical decision-making.
