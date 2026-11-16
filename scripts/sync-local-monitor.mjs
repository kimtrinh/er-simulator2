// Embeds the monitor waveform engine (components/monitor) into the single-file
// local edition, so both editions draw the same traces from the same source.
//
// Run after changing anything in components/monitor:   npm run sync:local
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const HTML = fileURLToPath(new URL('medisim-er-local.html', root));
const ENTRY = fileURLToPath(new URL('components/monitor/engine.ts', root));

const START = '// <monitor-engine> generated from components/monitor by `npm run sync:local` — edit the source, not this block';
const END = '// </monitor-engine>';

/** The engine as one script that defines a global `MediSimMonitor`. */
export async function bundle() {
  const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    format: 'iife',
    globalName: 'MediSimMonitor',
    target: 'es2019',
    minify: true,
    write: false,
    legalComments: 'none',
  });
  return result.outputFiles[0].text.trim();
}

/** The block currently embedded in the local edition (without its markers). */
export function embedded(html = readFileSync(HTML, 'utf8')) {
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a === -1 || b === -1) throw new Error('monitor-engine markers not found in medisim-er-local.html');
  return html.slice(a + START.length, b).trim();
}

export async function sync() {
  const html = readFileSync(HTML, 'utf8');
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a === -1 || b === -1) throw new Error('monitor-engine markers not found in medisim-er-local.html');
  const next = `${html.slice(0, a)}${START}\n${await bundle()}\n${html.slice(b)}`;
  if (next !== html) writeFileSync(HTML, next);
  return next !== html;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changed = await sync();
  console.log(changed ? 'medisim-er-local.html updated.' : 'medisim-er-local.html already up to date.');
}
