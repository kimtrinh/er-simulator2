import { ExtractedImage } from '../types';

/**
 * Built-in reference imaging.
 *
 * Generated cases have no pictures of their own, and an uploaded record usually
 * carries only one or two (often just the FAST). These are real, openly licensed
 * films the bedside can show when the player orders the matching study — but only
 * once the patient actually has what the film shows (a chest tube, an ETT, a
 * pelvic binder), so the picture never runs ahead of the resuscitation.
 *
 * Files live in public/imaging/. An entry whose file is missing is simply never
 * offered, so a film can be added later by dropping the file in under its name
 * (see public/imaging/README.md) without touching the code.
 */

export interface ReferenceStudy {
  id: string;
  label: string;
  /** What the film shows. The engine's report for that study must agree with it. */
  findings: string;
  /** Path under public/. */
  file: string;
  credit: string;
  /** The order that brings this film up. */
  study: RegExp;
  /** Everything that must already have been done for this film to be realistic. */
  requires?: RegExp[];
  /** Anything that, once done, makes this film the wrong one. */
  excludes?: RegExp[];
}

const CHEST_XRAY = /\bcxr\b|chest\s*(x-?ray|film|radiograph)|x-?ray\s+(of\s+the\s+)?chest/i;
const PELVIS_XRAY = /pelvi(s|c)\s*(x-?ray|film|radiograph)|x-?ray\s+(of\s+the\s+)?pelvis|\bap\s+pelvis\b/i;
const ECHO = /\becho(cardiogram|cardiography)?\b|cardiac\s+(ultrasound|pocus|views?)|ultrasound\s+of\s+the\s+heart/i;

const CHEST_TUBE_PLACED = /chest\s+tube|tube\s+thoracostomy|chest\s+drain|intercostal\s+drain|pigtail/i;
const INTUBATED = /intubat|\brsi\b|endotracheal|\bett\b|rapid\s+sequence/i;
const BINDER_ON = /pelvic\s+binder|\bbinder\b|sheet(ing)?\s+(the\s+)?pelvis|t-?pod/i;

export const REFERENCE_STUDIES: ReferenceStudy[] = [
  {
    id: 'ref-cxr-ett-chest-tube',
    label: 'Portable CXR — ETT and right chest tube in place',
    findings:
      'Portable AP semi-erect chest film. Endotracheal tube in satisfactory position above the carina; nasogastric tube passing below the diaphragm. ' +
      'Right-sided small-bore chest drain projecting over the right lower zone. Small residual bilateral pneumothoraces and pneumomediastinum. ' +
      'Bilateral patchy airspace opacities (contusion / aspiration pattern). No tension, no large residual hemothorax.',
    file: '/imaging/cxr-ett-chest-tube.jpg',
    credit: 'Case courtesy of Dr Muhammad Imran Khan, Radiopaedia.org, rID 75526 (CC BY-NC-SA 3.0)',
    study: CHEST_XRAY,
    requires: [CHEST_TUBE_PLACED, INTUBATED],
  },
  {
    id: 'ref-cxr-chest-tube',
    label: 'Portable CXR — chest tube in place',
    findings:
      'Portable AP chest film. Chest tube in place with its tip directed toward the apex; the lung is re-expanded with no residual pneumothorax and only a small residual hemothorax. No endotracheal tube.',
    file: '/imaging/cxr-chest-tube.jpg',
    credit: '',
    study: CHEST_XRAY,
    requires: [CHEST_TUBE_PLACED],
    excludes: [INTUBATED],
  },
  {
    id: 'ref-pelvis-binder',
    label: 'AP pelvis X-ray — pelvic binder on',
    findings:
      'AP pelvis with a pelvic binder in place at the level of the greater trochanters. Disrupted pelvic ring with pubic symphysis diastasis and sacroiliac joint widening, partly reduced by the binder.',
    file: '/imaging/pelvis-xray-binder.jpg',
    credit: '',
    study: PELVIS_XRAY,
    requires: [BINDER_ON],
  },
  {
    id: 'ref-echo',
    label: 'Bedside echo — subxiphoid view',
    findings:
      'Subxiphoid four-chamber view: no pericardial effusion; small, hyperdynamic left ventricle with near-complete systolic cavity obliteration consistent with hypovolemia.',
    file: '/imaging/echo-subxiphoid.jpg',
    credit: '',
    study: ECHO,
  },
];

/** True when the case is trauma, so the reference films belong in it. */
export const isTraumaCase = (text: string) =>
  /trauma|motor\s+vehicle|\bmvc\b|\bmva\b|collision|crash|pedestrian|struck\s+by|fall\s+from|fell\s+from|gunshot|\bgsw\b|stab|assault|polytrauma|ejected|rollover|motorcycle/i.test(
    text || ''
  );

let available: Promise<ReferenceStudy[]> | null = null;

/** Reference studies whose image file is actually being served. Checked once per page load. */
export const availableReferenceStudies = (): Promise<ReferenceStudy[]> => {
  if (!available) {
    available = Promise.all(
      REFERENCE_STUDIES.map(async (s) => {
        try {
          const res = await fetch(s.file, { method: 'HEAD' });
          // The dev server answers a missing file with the SPA page, so check the type too.
          return res.ok && (res.headers.get('content-type') || '').startsWith('image/') ? s : null;
        } catch {
          return null;
        }
      })
    ).then((list) => list.filter((s): s is ReferenceStudy => !!s));
  }
  return available;
};

export const referenceVisual = (s: ReferenceStudy): ExtractedImage => ({
  id: s.id,
  label: s.label,
  data: s.file,
  findings: s.findings,
  credit: s.credit,
  reference: true,
});

/* ------------------------------------------------------------------ */
/* Which picture belongs to which order                               */
/* ------------------------------------------------------------------ */

const KINDS: [string, RegExp][] = [
  ['xray', /x-?ray|radiograph|\bcxr\b|\bfilms?\b|\bkub\b/i],
  ['fast', /\b(e-?)?fast\b|focused\s+assessment/i],
  ['echo', ECHO],
  ['us', /ultrasound|sonograph|\bpocus\b|\bdoppler\b|\bduplex\b/i],
  ['ct', /\bct\b|\bcta\b|computed\s+tomography|pan-?scan/i],
  ['ekg', /\bekg\b|\becg\b|electrocardiogram|12-?\s?lead|rhythm\s+strip/i],
  ['mri', /\bmri\b/i],
];

const REGIONS: [string, RegExp][] = [
  ['chest', /chest|\bcxr\b|thora|lung/i],
  ['pelvis', /pelvi/i],
  ['abdomen', /abdom|\bkub\b|\bruq\b/i],
  ['head', /head|brain|skull/i],
  ['spine', /spine|cervical|c-spine/i],
  ['extremity', /extremit|femur|tibia|humerus|wrist|ankle|knee|hip\b|shoulder|forearm|hand\b|foot\b/i],
];

const tags = (table: [string, RegExp][], text: string) =>
  new Set(table.filter(([, re]) => re.test(text)).map(([k]) => k));

/** Modalities named in an order. Any focused or cardiac study is also an ultrasound. */
const orderKinds = (text: string) => {
  const k = tags(KINDS, text);
  if (k.has('fast') || k.has('echo')) k.add('us');
  return k;
};

/** Modalities a picture's label claims. A FAST still is not an echo, and vice versa. */
const labelKinds = (text: string) => {
  const k = tags(KINDS, text);
  if (k.has('fast') || k.has('echo')) k.delete('us');
  return k;
};

const overlaps = (a: Set<string>, b: Set<string>) => [...a].some((x) => b.has(x));

/**
 * Can this picture be shown for this order? A picture whose label names a
 * modality (or a body region) only answers an order for that modality (and
 * region): a FAST still never comes up for a chest X-ray.
 */
export function visualMatchesOrder(label: string, order: string): boolean {
  const lk = labelKinds(label);
  if (lk.size && !overlaps(lk, orderKinds(order))) return false;
  // A FAST or an echo is one study across several windows; its kind is enough.
  if (lk.has('fast') || lk.has('echo')) return true;
  const lr = tags(REGIONS, label);
  const or = tags(REGIONS, order);
  if (lr.size && or.size && !overlaps(lr, or)) return false;
  return true;
}

/**
 * The pictures that may go with this action: the case's own visuals that match
 * the order, plus any reference film the order asks for whose prerequisites are
 * already in the chart (`history` is everything ordered or said so far).
 */
export function eligibleVisuals(visuals: ExtractedImage[], action: string, history: string): ExtractedImage[] {
  const done = `${history}\n${action}`;
  return visuals.filter((v) => {
    if (!v.reference) return visualMatchesOrder(v.label, action);
    const s = REFERENCE_STUDIES.find((r) => r.id === v.id);
    if (!s || !s.study.test(action)) return false;
    if (s.requires && !s.requires.every((re) => re.test(done))) return false;
    if (s.excludes && s.excludes.some((re) => re.test(done))) return false;
    return true;
  });
}
