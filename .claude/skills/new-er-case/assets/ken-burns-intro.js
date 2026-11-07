/* Ken Burns intro reel for MediSim ER cases — drop-in, no dependencies.
 *
 *   const done = playKenBurnsIntro(reel, { stage, speech, onTurn, minShotMs, fadeMs });
 *   await done;   // resolves 'ended' or 'skipped'
 *
 * reel   = { shots: [{ src, from:[fx,fy,scale], to:[fx,fy,scale], speech:[turnIdx…], ms? }] }
 *          fx/fy = focus point 0–1 of the image; scale >= 1 (1.12–1.20 recommended).
 * stage  = element to cover (default document.body). The reel is a fixed overlay on top of it.
 * speech = the case's speech[] ({speaker,text}) — shown as lower-third captions.
 * onTurn = async (turnIndex) => {…}  speaks one turn (e.g. the app's narrate/voice clip) and
 *          resolves when it finishes. A shot lasts max(minShotMs, its turns' playback).
 *          Without onTurn, a shot lasts `ms` (default minShotMs).
 *
 * Accessibility: skip button (also Esc / Enter / tap), captions, prefers-reduced-motion → no
 * pan/zoom and short fades. Pauses its clock while the tab is hidden.
 */
(function (global) {
  'use strict';
  const REDUCED = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEAKER = { narrator: '', patient: 'Patient', nurse: 'Nurse', consultant: 'Consultant', medic: 'Medic', family: 'Family' };

  function preload(src) {
    return new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im));
      im.onerror = () => res(null);
      im.src = src;
    });
  }
  // transform that puts focus point (fx,fy) at the centre of the frame at the given scale,
  // clamped so an edge of the image never shows.
  function kbTransform([fx, fy, s]) {
    s = Math.max(1, s || 1);
    const max = (s - 1) / 2;                       // max shift as a fraction of the frame
    const tx = Math.max(-max, Math.min(max, (0.5 - fx) * s));
    const ty = Math.max(-max, Math.min(max, (0.5 - fy) * s));
    return `translate3d(${(tx * 100).toFixed(2)}%, ${(ty * 100).toFixed(2)}%, 0) scale(${s})`;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function playKenBurnsIntro(reel, opts = {}) {
    const shots = (reel && reel.shots || []).filter(s => s && s.src);
    if (!shots.length) return Promise.resolve('ended');
    const reduced = REDUCED();
    const fadeMs = reduced ? 400 : (opts.fadeMs || 1200);
    const minShotMs = opts.minShotMs || 6000;
    const speech = opts.speech || [];
    const stage = opts.stage || document.body;

    const root = document.createElement('div');
    root.className = 'kbIntro' + (reduced ? ' kbIntro--reduced' : '');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Case introduction');
    root.innerHTML =
      '<div class="kbStage"></div><div class="kbVignette" aria-hidden="true"></div>' +
      '<div class="kbCaption" aria-live="polite"></div>' +
      '<button type="button" class="kbSkip">Skip intro ›</button>';
    const stageEl = root.querySelector('.kbStage');
    const cap = root.querySelector('.kbCaption');
    const skipBtn = root.querySelector('.kbSkip');
    (stage === document.body ? document.body : stage).appendChild(root);
    if (getComputedStyle(root.parentElement).position === 'static' && stage !== document.body) {
      root.parentElement.style.position = 'relative';
    }

    let skipped = false, finish;
    const done = new Promise(r => (finish = r));
    const skip = () => { if (!skipped) { skipped = true; teardown('skipped'); } };
    const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); skip(); } };
    skipBtn.addEventListener('click', e => { e.stopPropagation(); skip(); });
    root.addEventListener('click', skip);
    document.addEventListener('keydown', onKey);
    setTimeout(() => skipBtn.focus({ preventScroll: true }), 50);

    function teardown(why) {
      document.removeEventListener('keydown', onKey);
      root.classList.add('kbIntro--out');
      setTimeout(() => root.remove(), 600);
      finish(why);
    }
    // wait that pauses while the tab is hidden, and stops early on skip
    async function hold(ms) {
      let left = ms;
      while (left > 0 && !skipped) {
        const step = Math.min(100, left);
        await sleep(step);
        if (!document.hidden) left -= step;
      }
    }
    function caption(i) {
      const t = speech[i];
      if (!t) { cap.textContent = ''; cap.classList.remove('on'); return; }
      const who = SPEAKER[t.speaker] || '';
      cap.innerHTML = (who ? `<b>${who}</b> ` : '') + String(t.text).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      cap.classList.add('on');
    }

    (async () => {
      const loaded = [preload(shots[0].src)];          // shot 1 first, the rest lazily
      for (let i = 1; i < shots.length; i++) loaded.push(null);
      let prev = null;
      for (let i = 0; i < shots.length && !skipped; i++) {
        if (i + 1 < shots.length && !loaded[i + 1]) loaded[i + 1] = preload(shots[i + 1].src);
        const img = await loaded[i];
        if (!img || skipped) continue;                  // a missing still is skipped, not fatal
        const s = shots[i];
        const el = document.createElement('div');
        el.className = 'kbShot';
        el.style.backgroundImage = `url("${img.src}")`;
        const turns = (s.speech || []).filter(n => Number.isInteger(n));
        const playMs = Math.max(minShotMs, s.ms || 0);
        el.style.transform = reduced ? 'none' : kbTransform(s.from || [0.5, 0.5, 1]);
        el.style.transition = `opacity ${fadeMs}ms ease`;
        stageEl.appendChild(el);
        void el.offsetWidth;                            // commit the start state
        el.style.opacity = '1';
        if (!reduced) {
          // the move spans the whole time the shot is visible, including both crossfades
          el.style.transition = `opacity ${fadeMs}ms ease, transform ${playMs + fadeMs * 2}ms cubic-bezier(.25,.1,.25,1)`;
          el.style.transform = kbTransform(s.to || [0.5, 0.5, 1.15]);
        }
        if (prev) { const p = prev; p.style.opacity = '0'; setTimeout(() => p.remove(), fadeMs + 50); }
        prev = el;

        const started = performance.now();
        if (opts.onTurn && turns.length) {
          for (const t of turns) {
            if (skipped) break;
            caption(t);
            try { await Promise.race([opts.onTurn(t), new Promise(r => { const iv = setInterval(() => { if (skipped) { clearInterval(iv); r(); } }, 100); })]); } catch (_) {}
          }
          const elapsed = performance.now() - started;
          if (elapsed < playMs) await hold(playMs - elapsed);
        } else {
          if (turns.length) caption(turns[0]);
          await hold(playMs);
        }
      }
      if (!skipped) { caption(-1); await hold(fadeMs); teardown('ended'); }
    })();
    return done;
  }

  global.playKenBurnsIntro = playKenBurnsIntro;
  global.INTRO_REELS = global.INTRO_REELS || {};
})(typeof window !== 'undefined' ? window : globalThis);
