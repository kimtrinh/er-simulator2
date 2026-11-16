import { classifyRhythm } from './rhythm';
import { CapnoSynth, EcgSynth, PlethSynth, capnoScale, perfusionOf } from './synth';

export { classifyRhythm } from './rhythm';
export { capnoScale } from './synth';

/**
 * Draws the monitor's three sweeping traces — ECG, pleth and capnogram — from
 * one clock, so the pleth pulse follows each QRS and all three stay aligned.
 *
 * Framework-free: the React app wraps it in components/TelemetryWaveform.tsx,
 * and the single-file local edition embeds a bundled copy (npm run sync:local).
 */

export interface MonitorInput {
  hr: number;
  rr: number;
  o2: number;
  bpSystolic: number;
  bpDiastolic: number;
  rhythm: string;
  /** End-tidal CO2 in mmHg; omitted when the engine did not report one. */
  etco2?: number | null;
  /** "obstructive" draws a shark-fin capnogram. */
  capnogram?: string | null;
}

export type ChannelName = 'ecg' | 'pleth' | 'capno';

/** Signal samples per simulated second — fine enough that a QRS keeps its height. */
const SAMPLE_HZ = 240;
/** 25 mm/s on a standard-density display, in CSS px per second. */
const SWEEP_PX = 94.5;
/** The strip always shows at least this many seconds, so narrow screens slow the sweep instead. */
const MIN_SECONDS = 5;
/** Width of the blank bar ahead of the sweep, in CSS px. */
const GAP_PX = 14;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** One sweeping trace on its own canvas. */
class Trace {
  private ctx: CanvasRenderingContext2D | null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private x = 0;
  private y: number | null = null;
  private observer: ResizeObserver | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    public color: string,
    private lineWidth: number
  ) {
    this.ctx = canvas.getContext('2d');
    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(canvas);
    }
  }

  dispose(): void {
    this.observer?.disconnect();
  }

  /** Match the backing store to the displayed size; the trace restarts from the left when it changes. */
  private resize(): void {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = w;
    this.canvas.height = h;
    this.x = 0;
    this.y = null;
  }

  /**
   * Extend the trace by one point per value.
   * @param ys each value as a fraction of strip height, 0 = top.
   */
  draw(ys: number[]): void {
    const { ctx, w, h, dpr } = this;
    if (!ctx || w < 2 || h < 2 || !ys.length) return;
    const cssWidth = w / dpr;
    const step = (Math.min(SWEEP_PX, cssWidth / MIN_SECONDS) * dpr) / SAMPLE_HZ;
    const lw = this.lineWidth * dpr;

    // Wipe the bar ahead of the sweep, wrapping at the right edge.
    const from = (this.x + GAP_PX * dpr) % w;
    const span = ys.length * step + dpr;
    ctx.clearRect(from, 0, span, h);
    if (from + span > w) ctx.clearRect(0, 0, from + span - w, h);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (this.y !== null) ctx.moveTo(this.x, this.y);
    for (const v of ys) {
      this.x += step;
      const py = clamp(v * h, lw, h - lw);
      if (this.x >= w) {
        // Reached the right edge: finish this stroke and start again from the left.
        ctx.stroke();
        this.x -= w;
        ctx.beginPath();
        ctx.moveTo(this.x, py);
      } else if (this.y === null) {
        ctx.moveTo(this.x, py);
      } else {
        ctx.lineTo(this.x, py);
      }
      this.y = py;
    }
    ctx.stroke();
  }
}

export class MonitorEngine {
  private ecg: EcgSynth;
  private pleth = new PlethSynth();
  private capno: CapnoSynth;
  private traces: Partial<Record<ChannelName, Trace>> = {};

  private input: MonitorInput = { hr: 0, rr: 0, o2: 0, bpSystolic: 0, bpDiastolic: 0, rhythm: '' };
  private perfusion = 0;
  private scale = 60;

  private t = 0;
  private sampled = 0;
  private raf = 0;
  private lastFrame = 0;

  /** Called once for each QRS as it is drawn. */
  onBeat: (() => void) | null = null;

  constructor(rand: () => number = Math.random) {
    this.ecg = new EcgSynth(rand);
    this.capno = new CapnoSynth(rand);
  }

  setInput(input: MonitorInput): void {
    this.input = input;
    this.ecg.set(classifyRhythm(input.rhythm), input.hr, input.rr, this.sampled);
    this.capno.set(input.rr, input.etco2, input.capnogram);
    this.perfusion = perfusionOf(input.bpSystolic, input.bpDiastolic, input.o2);
    this.scale = capnoScale(input.etco2);
  }

  /** Point a channel at a canvas (or detach it with null). */
  attach(name: ChannelName, canvas: HTMLCanvasElement | null, color: string, lineWidth = 2): void {
    this.traces[name]?.dispose();
    delete this.traces[name];
    if (canvas) this.traces[name] = new Trace(canvas, color, lineWidth);
  }

  setColor(name: ChannelName, color: string): void {
    const trace = this.traces[name];
    if (trace) trace.color = color;
  }

  start(): void {
    if (this.raf || typeof requestAnimationFrame === 'undefined') return;
    this.lastFrame = 0;
    const frame = (now: number) => {
      // Advance by real elapsed time, so the sweep and the heart rate hold at any refresh rate.
      // A long gap (background tab) resumes where it left off rather than fast-forwarding.
      const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 0;
      this.lastFrame = now;
      this.step(dt);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose(): void {
    this.stop();
    (Object.keys(this.traces) as ChannelName[]).forEach((name) => this.attach(name, null, ''));
  }

  /** Advance simulated time by dt seconds and draw whatever that adds to each trace. */
  step(dt: number): void {
    this.t += dt;
    const n = Math.floor((this.t - this.sampled) * SAMPLE_HZ);
    if (n <= 0) return;

    const ecg: number[] = [];
    const pleth: number[] = [];
    const capno: number[] = [];
    const [base, gain] = this.ecg.layout();

    for (let i = 0; i < n; i++) {
      this.sampled += 1 / SAMPLE_HZ;
      const ts = this.sampled;
      ecg.push(base - gain * this.ecg.sample(ts));
      for (const beat of this.ecg.takeBeats()) {
        this.pleth.addBeat(beat.t, beat.strength, this.ecg.meanRR());
        this.onBeat?.();
      }
      pleth.push(0.84 - 0.62 * this.pleth.sample(ts, this.perfusion, this.input.rr));
      capno.push(capnoY(this.capno.sample(ts), this.scale));
    }

    this.traces.ecg?.draw(ecg);
    this.traces.pleth?.draw(pleth);
    this.traces.capno?.draw(capno);
  }
}

/** Where a CO2 value sits on the capnogram strip, as a fraction of its height from the top. */
export function capnoY(mmHg: number, scale: number): number {
  return 0.86 - 0.72 * (mmHg / scale);
}
