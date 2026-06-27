# MediSim ER — Clinical AI Terminal

A high-fidelity emergency-room training simulator that runs as a self-contained website. Generate evidence-based clinical cases from any medical topic (or upload real records), then play the treating physician: take a history, order labs and imaging, run a physical exam, give treatments, and watch the patient's vitals respond in real time on a live monitor. When the case ends you get a scored debrief with critical-event analysis and learning points.

The clinical engine is powered by **Claude** (Anthropic API). The API key stays on the server and is never exposed to the browser.

## Features

- **Two ways to start a case** — type a medical topic ("Diabetic Ketoacidosis") or upload clinical records (PDF / images).
- **Live vitals monitor** — animated ECG waveform, HR / BP / RR / O₂ / temp with physiologic drift, and a stable → critical trend engine.
- **Clinical workspace** — labs, imaging reports, and physical-exam findings collect in a side chart as you order them.
- **Voice narration** — read clinical updates aloud via the browser's built-in speech synthesis (no extra services).
- **Scored debrief** — outcome, 0–100 performance breakdown, critical events, missed opportunities, and CME learning points.
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

- `server/claudeServer.ts` — builds the prompts and calls Claude with structured outputs so every response is valid JSON (case setup, vitals, labs, imaging, debrief).
- `services/geminiService.ts` — the browser's thin client for those endpoints.
- History is stored in `localStorage`; there is no external database or sign-in.

## Notes

- No secrets are committed. Provide `ANTHROPIC_API_KEY` at runtime via `.env.local` (git-ignored) or your host's environment.
- Educational simulation only — not for real clinical decision-making.
