/* ============================================================
   verify-animations.mjs — drive every animated screen through
   its full step sequence and assert the animation engine behaves.

   Per animated screen it checks:
     • an engine is registered with steps
     • Next advances currentStep each click, no errors in enter()
     • the sequence reaches the final step (canGoNext = false)
     • Reset returns to the idle state (-1)
     • Play auto-advances (timer-driven), then Pause holds
     • the step label + counter update
     • no pageerror / console.error throughout

   Usage: node scripts/verify-animations.mjs
   ============================================================ */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXEC = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(p => existsSync(p));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

function startServer() {
  return new Promise(resolve => {
    const s = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
        const f = join(ROOT, p); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
        res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(await readFile(f));
      } catch { res.writeHead(404); res.end('nf'); }
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

const engineState = () => {
  const e = window.IcebergViz.AnimationControls && window.IcebergViz.AnimationControls._engine;
  if (!e) return null;
  return { total: e.totalSteps, cur: e.currentStep, state: e.state, canNext: e.canGoNext };
};

async function main() {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => { try { localStorage.setItem('iv-tour-done','1'); localStorage.setItem('tv-iceberg-tour-done','1'); localStorage.setItem('tv-migrated','1'); } catch (e) {} });

  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(base + '/#home', { waitUntil: 'networkidle' });
  const screens = await page.evaluate(() => {
    const TV = window.TableViz;
    return Object.keys(TV.formats).flatMap(fid =>
      (TV.formats[fid].navGroups || []).flatMap(g =>
        g.items.filter(it => it.available !== false).map(it => fid + '/' + it.id)));
  });

  const animated = [], noAnim = [], failures = [];

  for (const id of screens) {
    errors.length = 0;
    await page.goto(`${base}/#${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    const st0 = await page.evaluate(engineState);
    if (!st0 || st0.total === 0) { noAnim.push(id); continue; }
    animated.push(id);
    const total = st0.total;

    // 1) Step forward through the entire sequence via the Next button.
    let ok = true, prev = st0.cur;
    for (let i = 0; i < total; i++) {
      const disabled = await page.getAttribute('#anim-btn-next', 'disabled');
      if (disabled !== null && i < total - 1) { failures.push(`#${id}: Next disabled early at step ${i}`); ok = false; break; }
      await page.click('#anim-btn-next').catch(() => {});
      await page.waitForTimeout(40);
      const st = await page.evaluate(engineState);
      if (st.cur <= prev) { failures.push(`#${id}: step did not advance (${prev}→${st.cur})`); ok = false; break; }
      prev = st.cur;
    }
    const stEnd = await page.evaluate(engineState);
    if (ok && stEnd.cur !== total - 1) failures.push(`#${id}: ended at step ${stEnd.cur}, expected ${total - 1}`);
    if (ok && stEnd.canNext) failures.push(`#${id}: still canGoNext at the end`);

    // 2) Step label + counter reflect progress.
    const label = (await page.textContent('#anim-step-label').catch(() => '') || '').trim();
    const counter = (await page.textContent('#anim-step-counter').catch(() => '') || '').trim();
    if (!label || /press play/i.test(label)) failures.push(`#${id}: step label not updated ("${label}")`);
    if (!/\/\s*\d+/.test(counter)) failures.push(`#${id}: counter not updated ("${counter}")`);

    // 3) Reset returns to idle.
    await page.click('#anim-btn-reset').catch(() => {});
    await page.waitForTimeout(60);
    const stReset = await page.evaluate(engineState);
    if (stReset.cur !== -1) failures.push(`#${id}: Reset did not return to -1 (got ${stReset.cur})`);

    // 4) Play auto-advances (speed up so the timer fires quickly), then Pause holds.
    await page.evaluate(() => window.IcebergViz.AnimationControls._engine.setSpeed(8));
    await page.click('#anim-btn-play').catch(() => {});
    await page.waitForTimeout(1300);
    const stPlay = await page.evaluate(engineState);
    if (stPlay.cur < 0) failures.push(`#${id}: Play did not auto-advance`);
    await page.click('#anim-btn-play').catch(() => {}); // pause
    await page.waitForTimeout(120);
    const stPause = await page.evaluate(engineState);
    await page.waitForTimeout(300);
    const stHold = await page.evaluate(engineState);
    if (stPause.state === 'playing') failures.push(`#${id}: Pause did not stop playback`);
    if (stHold.cur !== stPause.cur && stPause.state !== 'complete') failures.push(`#${id}: advanced while paused (${stPause.cur}→${stHold.cur})`);

    if (errors.length) failures.push(`#${id}: errors during animation — ${errors.join(' | ')}`);
    const flagged = failures.some(f => f.startsWith(`#${id}:`));
    console.log(`  ${flagged ? '✗' : '✓'} ${id.padEnd(22)} ${total} steps`);
  }

  await browser.close();
  server.close();

  console.log(`\nAnimated screens: ${animated.length} | Static screens: ${noAnim.length}`);
  console.log(`Static: ${noAnim.join(', ')}`);
  if (failures.length) {
    console.error(`\n✗ ${failures.length} animation issue(s):`);
    for (const f of failures) console.error('  • ' + f);
    process.exit(1);
  }
  console.log('\n✓ All animated screens step, play, pause, and reset correctly — no errors.');
}

main().catch(e => { console.error(e); process.exit(1); });
