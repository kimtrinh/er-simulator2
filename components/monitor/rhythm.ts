/**
 * Turns the engine's free-text rhythm ("AF with RVR", "Sinus tach, peaked T waves",
 * "VF → sinus rhythm") into something the monitor can draw.
 *
 * The engine writes the rhythm as prose, so this matches on meaning rather than
 * exact strings, and reads only the rhythm on the monitor now — not what it was
 * before ("converted from AF") or what is absent ("no ST elevation").
 */

export type RhythmKind =
  | 'sinus'
  | 'afib'
  | 'flutter'
  | 'svt'
  | 'junctional'
  | 'mat'
  | 'avb1'
  | 'wenckebach'
  | 'mobitz2'
  | 'chb'
  | 'idioventricular'
  | 'agonal'
  | 'paced'
  | 'sine'
  | 'vt'
  | 'torsades'
  | 'vfib'
  | 'standstill'
  | 'asystole';

export type Ectopy = 'none' | 'pac' | 'pvc' | 'bigeminy' | 'trigeminy' | 'runs';

export interface RhythmSpec {
  kind: RhythmKind;
  /** No cardiac output whatever the ECG shows (PEA, pulseless VT, VF, asystole). */
  pulseless: boolean;
  wide: boolean;
  st: 'none' | 'elevation' | 'depression';
  tWave: 'normal' | 'peaked' | 'inverted';
  longQT: boolean;
  ectopy: Ectopy;
  /** Beat-to-beat QRS amplitude alternation (tamponade). */
  alternans: boolean;
  lowVoltage: boolean;
  /** J (Osborn) waves of hypothermia. */
  osborn: boolean;
  /** Pre-excitation: short PR with a delta wave. */
  delta: boolean;
  uWave: boolean;
  /** Fine rather than coarse VF. */
  fine: boolean;
  /** Marked respiratory variation in rate (sinus arrhythmia). */
  respVar: boolean;
  /** Flutter with variable block. */
  variable: boolean;
  /** Flutter waves (or P waves, in 2:1 block) per QRS; 0 = work it out from the rate. */
  ratio: number;
  /** Pacer spikes that fail to capture, drawn over the underlying rhythm. */
  failedPacing: boolean;
}

/** Text after the last "converted to" / "→" / "now" is the rhythm on the monitor. */
const TRANSITION =
  /^.*(?:→|[-=]+>|\b(?:converted|converts|converting|cardioverted|reverted|reverts|returned|returns|return|back|degenerat\w+|deteriorat\w+|progress\w+|evolv\w+|chang\w+) (?:in)?to\b|\bback in\b|\bnow\b)/;

/** From one of these to the end of its clause describes something that is not there. */
const NEGATED =
  /\b(?:no|not|without|negative for|absence of|absent|ruled out|r\/o|previously|formerly|prior|from|history of|hx of|h\/o|s\/p|status post|was in|free of|non-?specific|rather than|instead of|versus|vs)\b.*$/;

/** A clause containing one of these describes something that has gone. */
const GONE = /\b(?:resolved|resolution|terminated|abolished|aborted|suppressed|no longer)\b/;

const PULSELESS =
  /\bpea\b|\bpvt\b|\bemd\b|pulseless|electromechanical dissociation|\bno (?:palpable |detectable |central |femoral |carotid )?pulses?\b|without (?:a )?pulse|absent pulses?|loss of pulses?|cardiac arrest|\bin arrest\b/;

export function classifyRhythm(raw: string | null | undefined): RhythmSpec {
  let s = ` ${String(raw ?? '').toLowerCase()} `
    .replace(/[‐‑]/g, '-')
    .replace(/\s-+\s|[‒-―:]/g, ' , ')
    .replace(/°/g, ' degree ')
    .replace(/\bv[.\s-]*(fib|tach)/g, 'v$1')
    .replace(/\ba[.\s-]*(fib|flutter)/g, 'a$1')
    .replace(/\s+/g, ' ');

  // Pulse state and pacing capture are read before negated phrases ("no pulse") are dropped.
  const rosc =
    /\brosc\b|return of spontaneous circulation/.test(s) &&
    !/\b(?:no|without|not|failed)\b[^,;.]*(?:\brosc\b|return of spontaneous)/.test(s);
  let pulseless = !rosc && PULSELESS.test(s.replace(/post-?\s?(?:cardiac-?\s?)?arrest/g, ' '));
  const noCapture =
    /fail\w* (?:to|of) capture|no capture|non-?capture|loss of capture|without capture|not capturing/.test(s);
  const runs = /\bnsvt\b|non-?sustained|\bruns? of\b|salvos?/.test(s);

  s = s
    .replace(TRANSITION, ' ')
    .split(/[,;.()[\]]/)
    .map((clause) => (GONE.test(clause) ? '' : clause.replace(NEGATED, '')))
    .join(' , ')
    .replace(/\s+/g, ' ')
    .replace(/supra-?\s?ventricular/g, 'supravent')
    .replace(/idio-?\s?ventricular/g, 'idiovent');

  const t = (re: RegExp) => re.test(s);
  const pacing = t(/\bpaced\b|pacing|pacemaker|\bpacer\b/);

  let kind: RhythmKind = 'sinus';
  if (t(/ventricular standstill|p-?\s?wave asystole/)) kind = 'standstill';
  else if (t(/asystol|flat-?\s?line/)) kind = 'asystole';
  else if (t(/ventricular fib|\bvfib|\bvf\b/)) kind = 'vfib';
  else if (t(/torsade|polymorphic/)) kind = 'torsades';
  else if (t(/sine-?\s?wave|sinusoidal/)) kind = 'sine';
  else if (!runs && t(/ventricular tach|\bvtach|\bvt\b|\bpvt\b|wide-?\s?complex tach|\bwct\b|ventricular flutter/)) kind = 'vt';
  else if (t(/agonal/)) kind = 'agonal';
  else if (pacing && !noCapture) kind = 'paced';
  else if (t(/complete (?:heart|av|atrioventricular) block|third-?\s?degree|3(?:rd)?-?\s?degree|\bchb\b|(?:av|atrioventricular) dissociation/)) kind = 'chb';
  else if (t(/flutter|\bafl\b/)) kind = 'flutter';
  else if (t(/mobitz (?:ii|2)\b|type (?:ii|2)\b|\b2 , 1\b|high-?\s?grade/)) kind = 'mobitz2';
  else if (t(/wenckebach|mobitz|second-?\s?degree|2(?:nd)?-?\s?degree|type (?:i|1)\b/)) kind = 'wenckebach';
  else if (t(/idiovent|ventricular escape|\baivr\b|ventricular rhythm/)) kind = 'idioventricular';
  else if (t(/atrial fib|\bafib|\baf\b|fibrillation/)) kind = 'afib';
  else if (t(/multifocal atrial|\bmat\b|wandering/)) kind = 'mat';
  else if (t(/\bsvt\b|supravent|\bavnrt\b|\bavrt\b|\bpsvt\b|atrial tach|narrow-?\s?complex tach|re-?entr/)) kind = 'svt';
  else if (t(/junctional/)) kind = 'junctional';
  else if (t(/first-?\s?degree|1(?:st)?-?\s?degree|prolonged pr|pr prolong|long pr/)) kind = 'avb1';

  if (kind === 'asystole' || kind === 'vfib' || kind === 'standstill') pulseless = true;

  // "2:1" / "4:1" became "2 , 1" when colons were turned into clause breaks.
  const ratioMatch = s.match(/\b([2-6]) , 1\b/);

  let ectopy: Ectopy = 'none';
  if (t(/bigemin/)) ectopy = 'bigeminy';
  else if (t(/trigemin/)) ectopy = 'trigeminy';
  else if (runs) ectopy = 'runs';
  else if (t(/\bpacs?\b|\bapcs?\b|premature atrial|atrial ectop/)) ectopy = 'pac';
  else if (t(/\bpvcs?\b|\bvpcs?\b|\bvpbs?\b|premature ventricular|ventricular premature|ectop|couplet/)) ectopy = 'pvc';

  return {
    kind,
    pulseless,
    wide: t(/wide|broad|bundle branch|\b[lr]?bbb\b|qrs (?:widening|prolong)|widened qrs|aberran|\btca\b|tricyclic|sodium channel|intraventricular|\bivcd\b/),
    st: t(/st-?\s?(?:segment )?elev|\bstemi\b|\bste\b|tombston|elevated st|injury (?:pattern|current)/)
      ? 'elevation'
      : t(/st-?\s?(?:segment )?depress|depressed st|\bstd\b|isch(?:a)?emic (?:st|change)|strain pattern/)
        ? 'depression'
        : 'none',
    tWave: t(/peaked t|tall t|tented t|hyperacute t|hyperkal/)
      ? 'peaked'
      : t(/t-?\s?wave inver|inverted t|t inversion|\btwi\b|wellens|flipped t/)
        ? 'inverted'
        : 'normal',
    longQT: t(/long qt|prolonged qt|qtc? prolong|qtc? (?:of )?[5-9]\d\d/),
    ectopy,
    alternans: t(/alternans/),
    lowVoltage: t(/low-?\s?voltage/),
    osborn: t(/osborn|\bj-?\s?waves?\b/),
    delta: t(/delta wave|\bwpw\b|pre-?\s?excit|wolff/),
    uWave: t(/\bu-?\s?waves?\b|hypokal/),
    fine: t(/\bfine\b/),
    respVar: t(/sinus arrhythmia/),
    variable: t(/variable/),
    ratio: ratioMatch ? Number(ratioMatch[1]) : 0,
    failedPacing: pacing && noCapture,
  };
}
