import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MonitorEngine, capnoScale } from '../components/monitor/engine';
import { classifyRhythm, RhythmSpec } from '../components/monitor/rhythm';
import { CapnoSynth, EcgSynth, PlethSynth, perfusionOf } from '../components/monitor/synth';

/** Seeded so every run draws the same strip. */
const seeded = (seed = 7) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

const BASE = { hr: 80, rr: 16, o2: 97, bpSystolic: 120, bpDiastolic: 80, rhythm: 'Sinus rhythm' };

/** Run the monitor for `seconds` at a given display refresh rate; returns QRS times. */
function beatTimes(input: Partial<typeof BASE>, seconds = 60, fps = 60): number[] {
  const engine = new MonitorEngine(seeded());
  engine.setInput({ ...BASE, ...input });
  const times: number[] = [];
  let t = 0;
  engine.onBeat = () => times.push(t);
  for (let i = 0; i < seconds * fps; i++) {
    t = (i + 1) / fps;
    engine.step(1 / fps);
  }
  return times;
}

const intervals = (ts: number[]) => ts.slice(1).map((t, i) => t - ts[i]);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const cv = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2))) / mean(xs);

test('rhythm text is read by meaning, not exact wording', () => {
  const cases: [string, Partial<RhythmSpec>][] = [
    ['Sinus Rhythm', { kind: 'sinus' }],
    ['NSR', { kind: 'sinus' }],
    ['Sinus Tachycardia', { kind: 'sinus', pulseless: false }],
    ['Atrial Fibrillation', { kind: 'afib' }],
    ['Atrial fibrillation with RVR', { kind: 'afib' }],
    ['A-fib with rapid ventricular response', { kind: 'afib' }],
    ['AF, rate controlled', { kind: 'afib' }],
    ['Atrial flutter 2:1', { kind: 'flutter', ratio: 2 }],
    ['Atrial flutter with 4:1 block', { kind: 'flutter', ratio: 4 }],
    ['Atrial flutter with variable block', { kind: 'flutter', variable: true }],
    ['SVT', { kind: 'svt' }],
    ['Supraventricular tachycardia', { kind: 'svt' }],
    ['Narrow complex tachycardia (AVNRT)', { kind: 'svt' }],
    ['Junctional escape rhythm', { kind: 'junctional' }],
    ['Multifocal atrial tachycardia', { kind: 'mat' }],
    ['First-degree AV block', { kind: 'avb1' }],
    ['Second-degree AV block, Mobitz type I (Wenckebach)', { kind: 'wenckebach' }],
    ['Second-degree AV block Mobitz II', { kind: 'mobitz2' }],
    ['2:1 AV block', { kind: 'mobitz2', ratio: 2 }],
    ['Third-degree AV block', { kind: 'chb' }],
    ['Complete heart block with ventricular escape', { kind: 'chb' }],
    ['3° AV block', { kind: 'chb' }],
    ['Ventricular Tachycardia', { kind: 'vt', pulseless: false }],
    ['Monomorphic V-tach', { kind: 'vt' }],
    ['Wide complex tachycardia', { kind: 'vt' }],
    ['Pulseless VT', { kind: 'vt', pulseless: true }],
    ['Polymorphic VT (torsades de pointes)', { kind: 'torsades' }],
    ['Ventricular Fibrillation', { kind: 'vfib', pulseless: true }],
    ['V-fib', { kind: 'vfib', pulseless: true }],
    ['Fine VF', { kind: 'vfib', fine: true }],
    ['Asystole', { kind: 'asystole', pulseless: true }],
    ['PEA', { kind: 'sinus', pulseless: true }],
    ['Pulseless electrical activity — narrow complex', { kind: 'sinus', pulseless: true }],
    ['Idioventricular rhythm', { kind: 'idioventricular' }],
    ['Agonal rhythm', { kind: 'agonal' }],
    ['Ventricular paced rhythm', { kind: 'paced' }],
    ['Transcutaneous pacing without capture, complete heart block', { kind: 'chb', failedPacing: true }],
    ['Sine wave pattern', { kind: 'sine' }],
    ['Sinus rhythm with ST elevation in II, III, aVF', { kind: 'sinus', st: 'elevation' }],
    ['Sinus tachycardia, inferior STEMI', { kind: 'sinus', st: 'elevation' }],
    ['Sinus tachycardia with ST depression', { kind: 'sinus', st: 'depression' }],
    ['Sinus bradycardia with peaked T waves', { kind: 'sinus', tWave: 'peaked' }],
    ['Sinus tachycardia with wide QRS', { kind: 'sinus', wide: true }],
    ['Sinus rhythm with LBBB', { kind: 'sinus', wide: true }],
    ['Sinus rhythm, prolonged QT', { kind: 'sinus', longQT: true }],
    ['Sinus rhythm with frequent PVCs', { kind: 'sinus', ectopy: 'pvc' }],
    ['Ventricular bigeminy', { kind: 'sinus', ectopy: 'bigeminy' }],
    ['Sinus rhythm with runs of NSVT', { kind: 'sinus', ectopy: 'runs' }],
    ['Sinus tachycardia with electrical alternans', { kind: 'sinus', alternans: true }],
    ['Sinus bradycardia with Osborn waves', { kind: 'sinus', osborn: true }],
  ];
  for (const [text, want] of cases) {
    const got = classifyRhythm(text);
    for (const [key, value] of Object.entries(want)) {
      assert.equal((got as any)[key], value, `"${text}" → ${key}`);
    }
  }
});

test('only the rhythm on the monitor now is drawn', () => {
  const sinus = (text: string) => {
    const got = classifyRhythm(text);
    assert.equal(got.kind, 'sinus', text);
    assert.equal(got.st, 'none', text);
    assert.equal(got.ectopy, 'none', text);
    assert.equal(got.pulseless, false, text);
  };
  sinus('Sinus rhythm (converted from AF)');
  sinus('AF with RVR converted to sinus rhythm');
  sinus('VF → sinus tachycardia');
  sinus('SVT terminated, sinus rhythm');
  sinus('Sinus tachycardia, no ST elevation');
  sinus('Sinus rhythm without ectopy');
  sinus('Sinus rhythm, ST elevation resolved');
  sinus('ROSC — sinus tachycardia');
  sinus('Post-arrest sinus tachycardia');
  sinus('Sinus tachycardia. No ectopy. No ST changes.');

  assert.equal(classifyRhythm('Sinus tachycardia deteriorating into VF').kind, 'vfib');
  assert.equal(classifyRhythm('Sinus rhythm, now with ST elevation').st, 'elevation');
  assert.equal(classifyRhythm('No pulse - VF').kind, 'vfib');
  assert.equal(classifyRhythm('Supraventricular tachycardia').kind, 'svt', 'not VT');
  assert.equal(classifyRhythm('').kind, 'sinus');
  assert.equal(classifyRhythm(undefined).kind, 'sinus');
});

test('the trace runs at the displayed heart rate on any refresh rate', () => {
  for (const hr of [40, 72, 118, 160]) {
    const at60 = beatTimes({ hr }, 60, 60);
    const at120 = beatTimes({ hr }, 60, 120);
    const at144 = beatTimes({ hr }, 60, 144);
    for (const [fps, beats] of [[60, at60], [120, at120], [144, at144]] as const) {
      assert.ok(Math.abs(beats.length - hr) <= 2, `HR ${hr} at ${fps} Hz drew ${beats.length} beats/min`);
    }
  }
});

test('regular rhythms are regular; AF is irregularly irregular at the right mean rate', () => {
  assert.ok(cv(intervals(beatTimes({ hr: 150, rhythm: 'SVT' }))) < 0.03);
  assert.ok(cv(intervals(beatTimes({ hr: 180, rhythm: 'Ventricular tachycardia' }))) < 0.03);

  const af = beatTimes({ hr: 130, rhythm: 'Atrial fibrillation with RVR' }, 120);
  assert.ok(cv(intervals(af)) > 0.15, 'AF should be irregular');
  assert.ok(Math.abs(af.length / 2 - 130) < 12, `AF mean rate ${af.length / 2}`);
});

test('AV block conducts at the reported ventricular rate with dropped beats', () => {
  const w = beatTimes({ hr: 54, rhythm: 'Mobitz I (Wenckebach)' });
  assert.ok(Math.abs(w.length - 54) <= 2, `Wenckebach drew ${w.length}/min`);
  const rr = intervals(w);
  const pauses = rr.filter((x) => x > 1.25 * mean(rr)).length;
  assert.ok(pauses >= 14 && pauses <= 20, `one dropped beat per 3 conducted, got ${pauses} pauses`);

  const chb = beatTimes({ hr: 34, rhythm: 'Complete heart block' });
  assert.ok(Math.abs(chb.length - 34) <= 1);
  assert.ok(cv(intervals(chb)) < 0.03, 'the escape rhythm is regular');
});

test('ectopy keeps the overall rate', () => {
  assert.ok(Math.abs(beatTimes({ hr: 74, rhythm: 'Ventricular bigeminy' }).length - 74) <= 2);
  assert.ok(Math.abs(beatTimes({ hr: 76, rhythm: 'Sinus rhythm with frequent PVCs' }).length - 76) <= 3);
});

test('rhythms without complexes draw no QRS', () => {
  for (const rhythm of ['Ventricular fibrillation', 'Asystole', 'Torsades de pointes', 'Ventricular standstill']) {
    assert.equal(beatTimes({ hr: 0, rhythm }, 20).length, 0, rhythm);
  }
  assert.equal(beatTimes({ hr: 0, rhythm: 'Sinus rhythm' }, 20).length, 0, 'no rate, no complexes');
  // PEA keeps its complexes even if the engine reports no rate.
  assert.ok(beatTimes({ hr: 0, rhythm: 'PEA' }, 20).length > 10);
  assert.ok(beatTimes({ hr: 0, rhythm: 'Pulseless VT' }, 20).length > 40);
});

test('a change of rhythm does not restart or double the trace', () => {
  const engine = new MonitorEngine(seeded());
  engine.setInput({ ...BASE, hr: 60 });
  let beats = 0;
  engine.onBeat = () => beats++;
  // The on-screen HR flickers by a beat or two every second; that must not reset the rhythm.
  for (let s = 0; s < 60; s++) {
    engine.setInput({ ...BASE, hr: 60 + (s % 2) });
    for (let i = 0; i < 60; i++) engine.step(1 / 60);
  }
  assert.ok(Math.abs(beats - 60) <= 2, `drew ${beats} beats in a minute at ~60/min`);
});

/** Sample a pleth alongside an ECG for `seconds`; returns the pleth values. */
function plethTrace(rhythm: string, hr: number, sys: number, dia: number, seconds = 20): number[] {
  const ecg = new EcgSynth(seeded());
  const pleth = new PlethSynth();
  ecg.set(classifyRhythm(rhythm), hr, 16, 0);
  const out: number[] = [];
  for (let i = 0; i < seconds * 240; i++) {
    const t = i / 240;
    ecg.sample(t);
    for (const b of ecg.takeBeats()) pleth.addBeat(b.t, b.strength, ecg.meanRR());
    out.push(pleth.sample(t, perfusionOf(sys, dia, 96), 0));
  }
  return out;
}

const peaks = (xs: number[], threshold: number) =>
  xs.filter((x, i) => i > 0 && i < xs.length - 1 && x > threshold && x >= xs[i - 1] && x > xs[i + 1]).length;

test('pleth pulses with each perfusing beat and is flat without a pulse', () => {
  const sinus = plethTrace('Sinus rhythm', 90, 120, 80);
  assert.ok(Math.max(...sinus) > 0.8);
  assert.ok(Math.abs(peaks(sinus, 0.6) - 30) <= 2, `${peaks(sinus, 0.6)} pulses in 20 s at 90/min`);

  assert.ok(Math.max(...plethTrace('PEA', 70, 120, 80)) < 0.01, 'PEA');
  assert.ok(Math.max(...plethTrace('Ventricular fibrillation', 0, 0, 0)) < 0.01, 'VF');
  assert.ok(Math.max(...plethTrace('Sinus tachycardia', 130, 0, 0)) < 0.01, 'no blood pressure');

  const shocked = plethTrace('Sinus tachycardia', 130, 68, 44);
  assert.ok(Math.max(...shocked) < 0.5 * Math.max(...sinus), 'low pressure damps the pleth');
});

/** Sample a capnogram for `seconds`. */
function capnoTrace(rr: number, etco2: number | undefined, shape?: string, seconds = 60): number[] {
  const capno = new CapnoSynth(seeded());
  capno.set(rr, etco2, shape);
  return Array.from({ length: seconds * 240 }, (_, i) => capno.sample(i / 240));
}

test('capnogram: one wave per breath, peaking at the ETCO2', () => {
  for (const [rr, etco2] of [[8, 62], [16, 38], [30, 22]]) {
    const trace = capnoTrace(rr, etco2);
    const half = etco2 / 2;
    const breaths = trace.filter((v, i) => i > 0 && v >= half && trace[i - 1] < half).length;
    assert.ok(Math.abs(breaths - rr) <= 1, `RR ${rr} drew ${breaths} breaths/min`);
    assert.ok(Math.abs(Math.max(...trace) - etco2) <= etco2 * 0.03, `peak ${Math.max(...trace)} vs ${etco2}`);
    assert.equal(Math.min(...trace), 0, 'returns to zero on inspiration');
  }
});

test('capnogram is flat in apnoea or with nothing to measure', () => {
  assert.equal(Math.max(...capnoTrace(0, 40)), 0);
  assert.equal(Math.max(...capnoTrace(16, 0)), 0);
  assert.equal(Math.max(...capnoTrace(16, undefined)), 0);
});

test('obstructive capnogram has no plateau', () => {
  // Fraction of the expiratory wave spent within 10% of its peak.
  const plateau = (shape: string) => {
    const trace = capnoTrace(14, 40, shape);
    return trace.filter((v) => v > 36).length / trace.filter((v) => v > 2).length;
  };
  assert.ok(plateau('normal') > 0.7, `normal plateau ${plateau('normal')}`);
  assert.ok(plateau('obstructive') < 0.4, `shark fin plateau ${plateau('obstructive')}`);
});

test('capnogram scale widens for hypercapnia', () => {
  assert.equal(capnoScale(38), 60);
  assert.equal(capnoScale(undefined), 60);
  assert.equal(capnoScale(64), 80);
  assert.equal(capnoScale(90), 100);
});
