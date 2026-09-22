# MediSim ER — Clinical AI Terminal

A high-fidelity emergency-room training simulator that runs as a self-contained website. Generate evidence-based clinical cases from any medical topic (or upload real records), then play the treating physician: take a history, order labs and imaging, run a physical exam, give treatments, and watch the patient's vitals respond in real time on a live monitor. When the case ends you get a scored debrief with critical-event analysis and learning points.

The clinical engine runs on **Gemini** (free tier) or **Claude** (Anthropic API) — set whichever key you have. The key stays on the server and is never exposed to the browser.

## Features

- **Two ways to start a case** — type a medical topic ("Diabetic Ketoacidosis") or upload clinical records (PDF / images).
- **Live vitals monitor** — animated ECG waveform, HR / BP / RR / O₂ / temp with physiologic drift, and a stable → critical trend engine.
- **Three training levels** — pick Medical Student, Resident, or Attending before the case. The level changes how the case is written (classic vs. undifferentiated), how much the team gives away at the bedside (the nurse prompts you vs. consultants pushing back), whether critical actions are suggested up front, and how strictly the debrief is marked.
- **Four-tab workspace** — Sim Room, Orders, Diagnosis, and Chart sit under the always-visible monitor, so you can jump from order entry back to the bedside in one click.
- **Clickable order catalogue** — every bedside action is an order you can search and click, including the time-critical ones: pelvic binder, arterial tourniquet, wound packing, needle decompression, massive transfusion, TXA, REBOA, thoracotomy, cricothyrotomy. Batch them into a signed order set or fire one STAT. The engine also names the critical actions this particular patient needs and surfaces them as suggestions.
- **A real differential** — carry several working diagnoses at once, rank them leading / considering / ruled out, revise them as data returns, and document them to the chart. The debrief grades the breadth, ranking, and timing of your differential, not just the final answer.
- **Patient chart** — a running Orders & Meds Given log (filterable by meds, labs, imaging, procedures, critical) alongside physical-exam findings, imaging reports, and labs.
- **Any order, typed or dictated** — write or speak orders in your own words ("give rocephin 2 grams and get cultures"). The engine works out the real orders, even ones not in the catalogue, and files them in the chart under standard names; dangerously incomplete orders get a clarifying question from the nurse.
- **Tutor** — press **Hint** when you're stuck: each press gets more specific (a Socratic nudge → what to focus on → the explicit next step with doses), with the teaching behind it and a warning about what's coming. Type a question first to ask the tutor directly. Coaching is private — the bedside team never sees it.
- **Voice narration** — read clinical updates aloud via the browser's built-in speech synthesis (no extra services).
- **Scored debrief** — when the case ends, a dedicated review reads the whole case (every order with its time, your differential, hints used) and returns an action-by-action review (done / late / missed / unnecessary / harmful), a 0–100 performance breakdown, differential review against the true diagnosis, critical events, missed opportunities, "next time" habits, and CME learning points.
- **Learning Log** — past cases are saved locally in your browser; download any case as a report.

## Run locally

**Prerequisites:** Node.js 18+ and one API key — either a free [Gemini API key](https://aistudio.google.com/apikey) or an [Anthropic API key](https://console.anthropic.com/).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your env file and add your key:
   ```bash
   cp .env.example .env.local
   # edit .env.local and set GEMINI_API_KEY=AIza... (free) or ANTHROPIC_API_KEY=sk-ant-...
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

The server serves the built client and exposes the simulation API. Deploy it to any Node host (Render, Railway, Fly.io, a VM, etc.) and set `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` (and optionally `AI_PROVIDER`, `PORT`) in the host's environment. The header shows which engine is running, and turns red if no key is set. Because the key lives only on the server, it is never shipped to the browser.

## How it works

```
Browser (React + Vite)
  └─ POST /api/sim/topic | /pdf | /progress | /tutor | /grade
       └─ Express server (server.ts)
            └─ server/simEngine.ts — prompts + JSON schemas
                 └─ server/llm.ts — Gemini or Claude, picked from the server environment
```

- `server/simEngine.ts` — builds the prompts and JSON schemas for case setup, each bedside turn (including interpreting free-text orders), the tutor, and the full-case grading.
- `server/llm.ts` — the one place that calls a model: Claude with structured outputs, or Gemini in JSON mode.
- `services/geminiService.ts` — the browser's thin client for those endpoints.
- `data/orderCatalog.ts` — the bedside order catalogue: every clickable order, which ones count as critical actions, and the matching used to file free-text orders into the chart.
- `data/trainingLevels.ts` — the three training levels and the prompt fragments that pitch the case, the bedside, and the marking at each.
- History is stored in `localStorage`; there is no external database or sign-in.
- `medisim-er-local.html` is a standalone single-file edition that runs against your own model in LM Studio / Ollama, or with your own Gemini / Claude key pasted into its settings. It mirrors the same workspace, order catalogue, differential, tutor, and grading.

## Notes

- No secrets are committed. Provide `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` at runtime via `.env.local` (git-ignored) or your host's environment.
- Educational simulation only — not for real clinical decision-making.
