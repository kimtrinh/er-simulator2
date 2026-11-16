import { test } from 'node:test';
import assert from 'node:assert/strict';

test('the single-file local edition embeds the current monitor engine', async () => {
  // Plain .mjs build script; imported by path so it needs no type declarations.
  const script: string = '../scripts/sync-local-monitor.mjs';
  const { bundle, embedded } = await import(script);
  assert.equal(
    embedded(),
    await bundle(),
    'components/monitor changed — run `npm run sync:local` to update medisim-er-local.html'
  );
});
