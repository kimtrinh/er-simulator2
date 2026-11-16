import type { RhythmSpec } from './rhythm';
import { classifyRhythm } from './rhythm';

/**
 * Signal generators for the bedside monitor: ECG (lead II), pleth and capnogram.
 *
 * Everything runs on simulated time in seconds, never on frame counts, so a
 * trace is the same rate on a 60 Hz laptop and a 120 Hz tablet. Callers sample
 * with non-decreasing t.
 */

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** One deflection: a Gaussian with separate rise and fall widths. Times in seconds from QRS onset. */
interface Comp {
  mu: number;
  sl: number;
  sr: number;
  a: number;
}

const comp = (mu: number, sl: number, a: number, sr: number = sl): Comp => ({ mu, sl, sr, a });

interface Beat {
  t: number;
  comps: Comp[];
  from: number;
  to: number;
}

/** A QRS that has just been drawn — drives the pleth pulse and the monitor beep. */
export interface QrsEvent {
  t: number;
  /** Stroke volume relative to a normal beat: 0 pulseless, <1 premature or ventricular. */
  strength: number;
}

const beatOf = (t: number, comps: Comp[]): Beat => ({
  t,
  comps,
  from: Math.min(...comps.map((c) => c.mu - 3.5 * c.sl)),
  to: Math.max(...comps.map((c) => c.mu + 3.5 * c.sr)),
});

const P_WAVE = (at: number, a = 0.13) => comp(at, 0.02, a);

/** Rhythms with no discrete complexes: drawn as a continuous signal. */
const CONTINUOUS = new Set(['vfib', 'torsades', 'asystole']);
/** Rhythms where premature beats are layered on top of the base rhythm. */
const TAKES_ECTOPY = new Set(['sinus', 'avb1', 'afib', 'junctional']);

export class EcgSynth {
  private spec: RhythmSpec = classifyRhythm('');
  private specKey = '';
  private hr = 0;
  private respRate = 0;

  private beats: Beat[] = [];
  private qrs: QrsEvent[] = [];
  private spikes: number[] = [];
  private fired: QrsEvent[] = [];

  private vNext = 0;
  private aNext = 0;
  private spikeNext = 0;
  private idx = 0;
  private lastQrs = -10;
  private sinceEctopic = 0;
  private ectopicDue = 6;

  private lastT = 0;
  private osc = [0, 0, 0, 0];
  private noise = 0;

  constructor(private rand: () => number = Math.random) {}

  /** Update what the monitor should show. Beats already drawn are kept; the change applies from `now`. */
  set(spec: RhythmSpec, hr: number, respRate: number, now: number): void {
    this.hr = Number.isFinite(hr) ? hr : 0;
    this.respRate = Number.isFinite(respRate) ? respRate : 0;
    const key = JSON.stringify(spec);
    if (key === this.specKey) return;
    this.specKey = key;
    this.spec = spec;
    // Drop anything scheduled but not yet reached, and restart the pacemakers.
    this.beats = this.beats.filter((b) => b.t <= now);
    this.qrs = this.qrs.filter((q) => q.t <= now);
    this.spikes = this.spikes.filter((x) => x <= now);
    this.vNext = now + 0.3;
    this.aNext = now + 0.1;
    this.spikeNext = now + 0.2;
    this.idx = 0;
    this.sinceEctopic = 0;
  }

  /** QRS complexes drawn since the last call. */
  takeBeats(): QrsEvent[] {
    const out = this.fired;
    this.fired = [];
    return out;
  }

  /** Vertical placement: [baseline as a fraction of strip height, gain]. */
  layout(): [number, number] {
    const k = this.spec.kind;
    return k === 'vfib' || k === 'torsades' || k === 'sine' ? [0.52, 0.4] : [0.66, 0.46];
  }

  /** Mean RR interval in seconds, for scaling the pleth pulse. */
  meanRR(): number {
    const r = this.rate();
    return r > 0 ? 60 / r : 1;
  }

  /**
   * Ventricular rate to draw. Uses the engine's HR; if that is 0 but the rhythm
   * implies electrical activity (PEA, pulseless VT), falls back to a typical rate.
   */
  private rate(): number {
    if (this.hr > 0) return clamp(this.hr, 8, 320);
    switch (this.spec.kind) {
      case 'vt':
      case 'svt':
        return 180;
      case 'paced':
        return 70;
      case 'sine':
        return 45;
      case 'chb':
      case 'idioventricular':
        return 35;
      case 'agonal':
        return 18;
      default:
        return this.spec.pulseless ? 60 : 0;
    }
  }

  private strength(t: number, rr: number, base = 1): number {
    if (this.spec.pulseless) return 0;
    // A beat that comes early has had less time to fill (filling is complete by about 0.75 s);
    // one that follows a pause is a little stronger.
    const gap = t - this.lastQrs;
    const filling = clamp((gap / Math.min(rr, 0.75) - 0.35) / 0.65, 0.15, 1);
    return base * filling * (gap > 1.4 * rr ? 1.12 : 1);
  }

  private pushQrs(t: number, comps: Comp[], rr: number, base = 1): void {
    this.beats.push(beatOf(t, comps));
    this.qrs.push({ t, strength: this.strength(t, rr, base) });
    this.lastQrs = t;
  }

  /** A supraventricular complex: optional P wave, QRS, ST segment and T wave. `pr` null = no P wave. */
  private supra(pr: number | null, rr: number, amp: number, pAmp = 0.13): Comp[] {
    const s = this.spec;
    const c: Comp[] = [];
    const wide = s.wide || s.delta;
    if (pr !== null) c.push(P_WAVE(-pr + 0.045, pAmp));

    let qrsEnd: number;
    if (wide) {
      if (s.delta) c.push(comp(0.01, 0.02, 0.24 * amp, 0.014));
      c.push(comp(0.052, 0.018, 0.92 * amp, 0.026));
      c.push(comp(0.115, 0.02, -0.32 * amp, 0.024));
      qrsEnd = 0.15;
    } else {
      c.push(comp(0.014, 0.006, -0.08 * amp));
      c.push(comp(0.036, 0.0095, amp));
      c.push(comp(0.058, 0.0085, (s.st === 'elevation' ? -0.05 : -0.2) * amp));
      qrsEnd = 0.085;
    }

    // Repolarisation shortens with rate (Bazett), from the mean rate rather than each RR.
    const qt = clamp((s.longQT ? 0.58 : 0.4) * Math.sqrt(rr), qrsEnd + 0.12, 0.66);
    const k = qt / 0.4;
    const tPeak = qrsEnd + (qt - qrsEnd) * 0.62;

    if (s.osborn) c.push(comp(qrsEnd + 0.008, 0.012, 0.3 * amp, 0.018));
    if (s.st === 'elevation') c.push(comp(qrsEnd + 0.03, 0.018, 0.3, (tPeak - qrsEnd) * 0.9));
    if (s.st === 'depression') c.push(comp(qrsEnd + 0.05, 0.025, -0.16, (tPeak - qrsEnd) * 0.6));

    if (s.tWave === 'peaked') c.push(comp(tPeak, 0.03 * k, 0.75, 0.027 * k));
    else if (s.tWave === 'inverted') c.push(comp(tPeak, 0.045 * k, -0.24));
    else if (s.kind === 'flutter') c.push(comp(tPeak, 0.05 * k, 0.07));
    else if (wide) c.push(comp(tPeak, 0.062 * k, -0.2, 0.045 * k));
    else {
      const a = s.st === 'elevation' ? 0.38 : s.st === 'depression' ? 0.12 : s.uWave ? 0.1 : 0.26;
      c.push(comp(tPeak, 0.062 * k, a, 0.036 * k));
    }
    if (s.uWave) c.push(comp(qt + 0.08, 0.036, 0.1));
    return c;
  }

  /** A ventricular complex: broad QRS with a discordant T wave, no P wave. `f` stretches it in time. */
  private ventricular(f: number, amp: number, offset = 0): Comp[] {
    return [
      comp(offset + 0.075 * f, 0.032 * f, 1.05 * amp, 0.04 * f),
      comp(offset + 0.27 * f, 0.07 * f, -0.5 * amp, 0.065 * f),
    ];
  }

  private schedule(until: number): void {
    const s = this.spec;
    const k = s.kind;

    if (s.failedPacing) {
      while (this.spikeNext < until) {
        this.spikes.push(this.spikeNext);
        this.spikeNext += 60 / 70;
      }
    }
    if (CONTINUOUS.has(k)) return;

    if (k === 'standstill') {
      while (this.aNext < until) {
        this.beats.push(beatOf(this.aNext, [P_WAVE(0.045)]));
        this.aNext += 60 / 72;
      }
      return;
    }

    const rate = this.rate();
    if (!rate) return;
    const rr = 60 / rate;

    if (k === 'wenckebach' || k === 'mobitz2') {
      // Atrial-driven: P waves march at a fixed rate and the last one in each cycle is not conducted.
      const n = k === 'wenckebach' ? 4 : s.ratio === 2 ? 2 : 3;
      const atrial = (rr * (n - 1)) / n;
      const pr = [0.2, 0.3, 0.36];
      while (this.aNext < until) {
        const i = this.idx % n;
        this.beats.push(beatOf(this.aNext, [P_WAVE(0.045)]));
        if (i < n - 1) {
          const delay = k === 'wenckebach' ? pr[i] : 0.18;
          this.pushQrs(this.aNext + delay, this.supra(null, rr, 1), rr);
        }
        this.idx++;
        this.aNext += atrial;
      }
      return;
    }

    if (k === 'chb') {
      // Atria and ventricles fire independently; P waves march through the escape rhythm.
      const atrial = 60 / clamp(rate * 2.2, 70, 105);
      while (this.aNext < until) {
        this.beats.push(beatOf(this.aNext, [P_WAVE(0.045)]));
        this.aNext += atrial;
      }
      const ventricularEscape = s.wide || rate < 42;
      while (this.vNext < until) {
        this.pushQrs(this.vNext, ventricularEscape ? this.ventricular(1.1, 0.9) : this.supra(null, rr, 1), rr);
        this.vNext += rr;
      }
      return;
    }

    while (this.vNext < until) this.vNext = this.emit(this.vNext, rate, rr);
  }

  /** Draw the beat at `t` and return when the next one is due. */
  private emit(t: number, rate: number, rr: number): number {
    const s = this.spec;
    const k = s.kind;
    let amp = s.lowVoltage ? 0.45 : 1;
    if (s.alternans && this.idx % 2) amp *= 0.55;
    this.idx++;
    let interval = rr;

    switch (k) {
      case 'vt': {
        this.pushQrs(t, this.ventricular(clamp(rr / 0.46, 0.5, 1), amp), rr, 0.4);
        break;
      }
      case 'idioventricular':
        this.pushQrs(t, this.ventricular(1.15, 0.9 * amp), rr, 0.7);
        break;
      case 'agonal':
        this.pushQrs(t, this.ventricular(1.6, 0.5 * amp), rr, 0.3);
        interval = rr * (0.7 + 0.6 * this.rand());
        break;
      case 'paced':
        this.spikes.push(t);
        this.pushQrs(t, this.ventricular(1, 0.9 * amp, 0.012), rr, 0.9);
        break;
      case 'sine':
        // Two broad opposite humps half a cycle apart sum to a near-sinusoid.
        this.pushQrs(t, [comp(0.25 * rr, 0.11 * rr, 0.62), comp(0.75 * rr, 0.11 * rr, -0.62)], rr, 0.5);
        break;
      case 'afib':
        this.pushQrs(t, this.supra(null, rr, amp), rr);
        interval = Math.max(0.24, rr * (0.6 + 0.8 * this.rand()));
        break;
      case 'flutter':
        this.pushQrs(t, this.supra(null, rr, amp), rr);
        // Variable block: 2, 3 or 4 flutter waves (at 300/min) between beats.
        if (s.variable) interval = (2 + Math.floor(this.rand() * 3)) * 0.2;
        break;
      case 'mat': {
        // At least three P-wave shapes with their own PR intervals, irregularly irregular.
        const m = Math.floor(this.rand() * 3);
        this.pushQrs(t, this.supra([0.15, 0.11, 0.19][m], rr, amp, [0.13, -0.09, 0.07][m]), rr);
        interval = rr * (0.72 + 0.56 * this.rand());
        break;
      }
      case 'svt':
        // Retrograde P wave buried at the end of the QRS.
        this.pushQrs(t, [...this.supra(null, rr, amp), comp(0.092, 0.014, -0.07)], rr);
        break;
      case 'junctional':
        this.pushQrs(t, this.supra(null, rr, amp), rr);
        break;
      default: {
        // Sinus rhythm, with or without first-degree block.
        const pr = k === 'avb1' ? 0.3 : s.delta ? 0.09 : clamp(0.16 - (rate - 60) * 0.0004, 0.11, 0.2);
        this.pushQrs(t, this.supra(pr, rr, amp), rr);
        const breath = this.respRate > 0 ? 60 / this.respRate : 4;
        interval = rr * (1 + (s.respVar ? 0.14 : 0.02) * Math.sin((TAU * t) / breath));
      }
    }

    if (s.ectopy === 'none' || !TAKES_ECTOPY.has(k)) return t + interval;

    this.sinceEctopic++;
    const due = s.ectopy === 'bigeminy' ? 1 : s.ectopy === 'trigeminy' ? 2 : this.ectopicDue;
    if (this.sinceEctopic < due) return t + interval;
    this.sinceEctopic = 0;
    this.ectopicDue = 4 + Math.floor(this.rand() * 6);

    if (s.ectopy === 'pac') {
      // Early atrial beat with a different P wave; the sinus node resets from it.
      const early = t + 0.66 * interval;
      this.pushQrs(early, this.supra(0.13, rr, amp, -0.08), rr);
      return early + interval;
    }
    if (s.ectopy === 'runs') {
      // A short salvo of ventricular beats, then the base rhythm resumes.
      let at = t + 0.6 * interval;
      const count = 3 + Math.floor(this.rand() * 3);
      for (let i = 0; i < count; i++, at += 0.34) this.pushQrs(at, this.ventricular(0.72, 1.1), 0.34, 0.4);
      return at + interval * 0.9;
    }
    // PVC with a full compensatory pause.
    this.pushQrs(t + 0.62 * interval, this.ventricular(0.9, 1.15), rr, 0.5);
    return t + 2 * interval;
  }

  /** Flutter waves per QRS, chosen so the atrial rate lands near 300/min. */
  private flutterRatio(rate: number): number {
    return this.spec.ratio || clamp(Math.round(300 / rate), 1, 6);
  }

  sample(t: number): number {
    const dt = Math.max(0, t - this.lastT);
    this.lastT = t;
    this.schedule(t + 0.8);

    const s = this.spec;
    const k = s.kind;
    let y = 0;

    for (const b of this.beats) {
      const d = t - b.t;
      if (d < b.from || d > b.to) continue;
      for (const c of b.comps) {
        const x = d - c.mu;
        const w = x < 0 ? c.sl : c.sr;
        y += c.a * Math.exp((-x * x) / (2 * w * w));
      }
    }
    if (this.beats.length > 24) this.beats = this.beats.filter((b) => b.t + b.to >= t);

    while (this.qrs.length && this.qrs[0].t <= t) this.fired.push(this.qrs.shift()!);

    // Pacer spike: one sample wide, like the marker a monitor draws.
    while (this.spikes.length && this.spikes[0] <= t) {
      this.spikes.shift();
      y += 0.9;
    }

    const o = this.osc;
    if (k === 'vfib') {
      o[0] += dt * (4.6 + 0.9 * Math.sin(TAU * 0.13 * t));
      o[1] += dt * (6.8 + 1.1 * Math.sin(TAU * 0.09 * t + 1));
      o[2] += dt * (3.1 + 0.6 * Math.sin(TAU * 0.21 * t + 2));
      const envelope = 0.6 + 0.4 * Math.sin(TAU * 0.17 * t) * Math.sin(TAU * 0.07 * t + 1);
      y += (s.fine ? 0.1 : 0.42) * envelope * (Math.sin(TAU * o[0]) + 0.6 * Math.sin(TAU * o[1]) + 0.35 * Math.sin(TAU * o[2]));
    } else if (k === 'torsades') {
      // Amplitude waxes and wanes and the polarity flips: the axis twists about the baseline.
      o[0] += (dt * (this.hr > 150 ? this.hr : 230)) / 60;
      y += Math.sin(TAU * o[0]) * (0.86 * Math.sin((TAU * t) / 3.8) + 0.1);
    } else if (k === 'afib') {
      o[0] += dt * (6.1 + 0.8 * Math.sin(TAU * 0.23 * t));
      o[1] += dt * 8.3;
      y += (0.6 + 0.4 * Math.sin(TAU * 0.31 * t)) * (0.035 * Math.sin(TAU * o[0]) + 0.022 * Math.sin(TAU * o[1]));
    } else if (k === 'flutter') {
      const rate = this.rate();
      if (rate) {
        o[0] += (dt * (s.variable ? 300 : rate * this.flutterRatio(rate))) / 60;
        const x = o[0] - Math.floor(o[0]);
        // Sawtooth: slow downslope, sharp upstroke.
        y += 0.2 * (x < 0.82 ? 0.5 - x / 0.82 : (x - 0.82) / 0.18 - 0.5);
      }
    }

    // Baseline wander and a little muscle artefact, low-passed so the line stays clean.
    this.noise += (this.rand() - 0.5 - this.noise) * 0.35;
    y += 0.022 * Math.sin(TAU * 0.19 * t) + 0.02 * this.noise;
    return y;
  }
}

/** Pulse-oximeter waveform: one pulse per perfusing beat, a little after its QRS. */
export class PlethSynth {
  private pulses: { t: number; a: number; g: number }[] = [];

  /** Pulse transit time to the finger. */
  static readonly DELAY = 0.2;

  addBeat(tQrs: number, strength: number, meanRR: number): void {
    if (strength <= 0) return;
    this.pulses.push({ t: tQrs + PlethSynth.DELAY, a: strength, g: clamp(meanRR / 0.8, 0.55, 1.1) });
    if (this.pulses.length > 12) this.pulses.shift();
  }

  /**
   * @param perfusion 0..1 — how much of each pulse reaches the probe (0 = flat trace).
   * @param respRate breaths/min, for the small respiratory swing in the baseline.
   */
  sample(t: number, perfusion: number, respRate: number): number {
    let y = 0;
    for (const p of this.pulses) {
      const x = (t - p.t) / p.g;
      if (x < -0.1 || x > 1.1) continue;
      const u = x - 0.13;
      const systolic = Math.exp((-u * u) / (2 * (u < 0 ? 0.05 * 0.05 : 0.085 * 0.085)));
      const v = x - 0.38;
      const dicrotic = 0.36 * Math.exp((-v * v) / (2 * 0.07 * 0.07));
      y += p.a * (systolic + dicrotic);
    }
    const swing = respRate > 0 ? 0.04 * Math.sin((TAU * t * respRate) / 60) : 0;
    return perfusion * (y + swing);
  }
}

/** How strongly the pleth pulses, from the blood pressure the monitor is showing. */
export function perfusionOf(bpSystolic: number, bpDiastolic: number, o2: number): number {
  if (!(bpSystolic > 0) || !(o2 > 0)) return 0;
  const pressure = clamp((bpSystolic - 40) / 60, 0, 1);
  const pulsePressure = clamp((bpSystolic - bpDiastolic) / 40, 0.35, 1.1);
  return pressure * pulsePressure;
}

/** Top of the capnogram's vertical scale in mmHg; widens for marked hypercapnia. */
export function capnoScale(etco2: number | null | undefined): number {
  const e = Number(etco2);
  return e > 75 ? 100 : e > 55 ? 80 : 60;
}

/** Capnogram: one square-ish (or shark-fin) wave per breath, peaking at the ETCO2. */
export class CapnoSynth {
  private rr = 0;
  private etco2 = 0;
  private obstructive = false;
  private breath: { t: number; len: number; e: number; obstructive: boolean } | null = null;
  private next = 0;

  constructor(private rand: () => number = Math.random) {}

  set(respRate: number, etco2: number | null | undefined, shape?: string | null): void {
    this.rr = Number.isFinite(respRate) ? respRate : 0;
    const e = Number(etco2);
    this.etco2 = Number.isFinite(e) ? e : 0;
    this.obstructive = /obstruct|shark|bronchosp/i.test(String(shape ?? ''));
  }

  /** CO2 at the sampling port in mmHg. */
  sample(t: number): number {
    if (!(this.rr > 0) || !(this.etco2 > 0)) {
      // Apnoea, or nothing to measure: the next breath starts fresh when breathing returns.
      this.next = t + 0.4;
      const b = this.breath;
      if (!b || t - b.t > b.len) this.breath = null;
      if (!this.breath) return 0;
    } else if (t >= this.next) {
      const start = t - this.next > 2 ? t : this.next;
      const len = (60 / this.rr) * (0.96 + 0.08 * this.rand());
      this.breath = { t: start, len, e: this.etco2 * (0.98 + 0.04 * this.rand()), obstructive: this.obstructive };
      this.next = start + len;
    }
    const b = this.breath;
    if (!b) return 0;

    // Expiration: upstroke, alveolar plateau, then the fall as inspiration starts.
    let rise = clamp(0.1 * b.len, 0.12, 0.35);
    let plateau = clamp(0.5 * b.len, 0.45, 3.2);
    let fall = clamp(0.07 * b.len, 0.1, 0.25);
    const fit = Math.min(1, (0.8 * b.len) / (rise + plateau + fall));
    rise *= fit;
    plateau *= fit;
    fall *= fit;

    const x = t - b.t;
    const smooth = (u: number) => u * u * (3 - 2 * u);
    if (x < 0) return 0;
    if (x < rise + plateau) {
      if (b.obstructive) {
        // Slow, uneven alveolar emptying: no plateau, still climbing at end-expiration.
        const u = x / (rise + plateau);
        return (b.e * (1 - Math.exp(-2.2 * u))) / (1 - Math.exp(-2.2));
      }
      if (x < rise) return b.e * 0.9 * smooth(x / rise);
      return b.e * (0.9 + (0.1 * (x - rise)) / plateau);
    }
    if (x < rise + plateau + fall) return b.e * (1 - smooth((x - rise - plateau) / fall));
    return 0;
  }
}
