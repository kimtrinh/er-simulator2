# MediSim ER — Clinical AI Terminal

A high-fidelity emergency-room training simulator that runs as a self-contained website. Generate evidence-based clinical cases from any medical topic (or upload real records), then play the treating physician: take a history, order labs and imaging, run a physical exam, give treatments, and watch the patient's vitals respond in real time on a live monitor. When the case ends you get a scored debrief with critical-event analysis and learning points.

The clinical engine is powered by **Claude** (Anthropic API). The API key stays on the server and is never exposed to the browser.

## Features

- **Two ways to start a case** — type a medical topic ("Diabetic Ketoacidosis") or upload clinical records (PDF / images).
- **Live vitals monitor** — animated ECG waveform, HR / BP / RR / O₂ / temp with physiologic drift, and a stable → critical trend engine.
- **Four-tab workspace** — Sim Room, Orders, Diagnosis, and Chart sit under the always-visible monitor, so you can jump from order entry back to the bedside in one click.
- **Clickable order catalogue** — every bedside action is an order you can search and click, including the time-critical ones: pelvic binder, arterial tourniquet, wound packing, needle decompression, massive transfusion, TXA, REBOA, thoracotomy, cricothyrotomy. Batch them into a signed order set or fire one STAT. The engine also names the critical actions this particular patient needs and surfaces them as suggestions.
- **A real differential** — carry several working diagnoses at once, rank them leading / considering / ruled out, revise them as data returns, and document them to the chart. The debrief grades the breadth, ranking, and timing of your differential, not just the final answer.
- **Patient chart** — a running Orders & Meds Given log (filterable by meds, labs, imaging, procedures, critical) alongside physical-exam findings, imaging reports, and labs.
- **Voice narration** — read clinical updates aloud via the browser's built-in speech synthesis (no extra services).
- **Scored debrief** — outcome, 0–100 performance breakdown, differential review against the true diagnosis, critical events, missed opportunities, and CME learning points.
- **Learning Log** — past cases are saved locally in your browser; download any case as a report.

## Run locally

**Prerequisites:** Node.js 18+ and an [Anthropic API key](https://console.anthropic.com/).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your env file and add your key:
   ```bash
   cp .env.example .env.local
   # edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
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

The server serves the built client and exposes the simulation API. Deploy it to any Node host (Render, Railway, Fly.io, a VM, etc.) and set `ANTHROPIC_API_KEY` (and optionally `PORT`) in the host's environment. Because the key lives only on the server, it is never shipped to the browser.

## How it works

```
Browser (React + Vite)
  └─ POST /api/sim/topic | /api/sim/pdf | /api/sim/progress
       └─ Express server (server.ts)
            └─ Claude (server/claudeServer.ts) — structured JSON case + turn-by-turn simulation
```

- `server/claudeServer.ts` — builds the prompts and calls Claude with structured outputs so every response is valid JSON (case setup, critical actions, vitals, labs, imaging, debrief).
- `services/geminiService.ts` — the browser's thin client for those endpoints.
- `data/orderCatalog.ts` — the bedside order catalogue: every clickable order, which ones count as critical actions, and the matching used to file free-text orders into the chart.
- History is stored in `localStorage`; there is no external database or sign-in.
- `medisim-er-local.html` is a standalone single-file edition that runs against your own model in LM Studio / Ollama. It mirrors the same workspace, order catalogue, and differential.

## Notes

- No secrets are committed. Provide `ANTHROPIC_API_KEY` at runtime via `.env.local` (git-ignored) or your host's environment.
- Educational simulation only — not for real clinical decision-making.
