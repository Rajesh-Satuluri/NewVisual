/* ============================================================
   verify.mjs — headless verification sweep.

   For each theme × viewport, navigates to EVERY screen and asserts:
     • no pageerror, no console.error (known external noise ignored)
     • each screen renders non-trivial content
     • no horizontal overflow (scrollWidth <= clientWidth)
   Screens are discovered from the live nav so the list never drifts.

   Usage: node scripts/verify.mjs
   Requires: npm install (playwright), Chromium at PLAYWRIGHT_BROWSERS_PATH.
   ============================================================ */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Prefer the environment's pre-installed Chromium (its build may differ from
// the one Playwright expects). Falls back to Playwright's bundled browser.
function resolveChromium() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  return undefined;
}
const EXEC = resolveChromium();

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

// Console noise we don't care about (blocked external CDNs, favicon 404 before it exists).
const IGNORE = [
  /favicon/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /manifest/i,
];

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(req.url.split('?')[0]);
        if (p === '/' || p === '') p = '/index.html';
        const file = join(ROOT, p);
        if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404); res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const VIEWPORTS = [
  { name: 'desktop',          width: 1440, height: 900 },
  { name: 'tablet-landscape', width: 1080, height: 810 },
  { name: 'tablet-portrait',  width: 810,  height: 1080 },
];
const THEMES = ['dark', 'light'];

async function main() {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
  const failures = [];
  let checks = 0;

  // Suppress the first-run tour so it never interferes with checks.
  async function mkPage(opts) {
    const p = await browser.newPage(opts || {});
    await p.addInitScript(() => { try { localStorage.setItem('iv-tour-done','1'); localStorage.setItem('tv-iceberg-tour-done','1'); localStorage.setItem('tv-delta-tour-done','1'); localStorage.setItem('tv-migrated','1'); localStorage.setItem('tv-format','iceberg'); } catch (e) {} });
    return p;
  }

  // Discover screens across EVERY registered format (incl. hidden ones).
  const disco = await mkPage();
  await disco.goto(base + '/#home', { waitUntil: 'networkidle' });
  const screens = await disco.evaluate(() => {
    const TV = window.TableViz;
    return Object.keys(TV.formats).flatMap(fid =>
      (TV.formats[fid].navGroups || []).flatMap(g =>
        g.items.filter(it => it.available !== false).map(it => ({ format: fid, id: it.id }))));
  });
  await disco.close();
  const byFmt = screens.reduce((a, s) => (a[s.format] = (a[s.format] || 0) + 1, a), {});
  console.log(`Discovered ${screens.length} screens across ${Object.keys(byFmt).length} formats: ` +
    Object.entries(byFmt).map(([f, n]) => `${f}:${n}`).join(', ') + '\n');

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const page = await mkPage({ viewport: { width: vp.width, height: vp.height } });
      const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

      for (const sc of screens) {
        const id = sc.format + '/' + sc.id;
        errors.length = 0;
        await page.goto(`${base}/#${id}`, { waitUntil: 'networkidle' });
        await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
        await page.waitForTimeout(120);

        const r = await page.evaluate(() => {
          const c = document.getElementById('module-container');
          const de = document.documentElement;
          return {
            text: (c?.innerText || '').trim().length,
            overflowDoc: de.scrollWidth - de.clientWidth,
            overflowMod: c ? c.scrollWidth - c.clientWidth : 0,
          };
        });

        const ctx = `[${theme}/${vp.name}] #${id}`;
        checks++;
        if (errors.length) failures.push(`${ctx} — ${errors.join(' | ')}`);
        if (r.text < 20) failures.push(`${ctx} — empty/near-empty content (${r.text} chars)`);
        if (r.overflowDoc > 2) failures.push(`${ctx} — document h-overflow ${r.overflowDoc}px`);
        if (r.overflowMod > 2) failures.push(`${ctx} — module h-overflow ${r.overflowMod}px`);
      }
      await page.close();
    }
  }

  // ── Drawer behavior at tablet width ──────────────────────────
  {
    const page = await mkPage({ viewport: { width: 810, height: 1080 } });
    await page.goto(base + '/#home', { waitUntil: 'networkidle' });
    const togVisible = await page.isVisible('#nav-toggle');
    if (!togVisible) failures.push('[drawer] hamburger not visible at 810px');
    await page.click('#nav-toggle');
    await page.waitForTimeout(200);
    let open = await page.evaluate(() => document.getElementById('sidebar').classList.contains('drawer-open')
      && document.getElementById('nav-backdrop').classList.contains('visible'));
    if (!open) failures.push('[drawer] did not open on hamburger click');
    await page.click('#nav-backdrop', { position: { x: 700, y: 500 } });
    await page.waitForTimeout(200);
    const closed = await page.evaluate(() => !document.getElementById('sidebar').classList.contains('drawer-open'));
    if (!closed) failures.push('[drawer] backdrop click did not close drawer');
    checks += 3;
    await page.close();
  }

  // Hamburger is now a universal control: visible on desktop, where it
  // collapses / expands the persistent sidebar (drawer only at ≤1024).
  {
    const page = await mkPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/#home', { waitUntil: 'networkidle' });
    if (!(await page.isVisible('#nav-toggle'))) failures.push('[nav] hamburger not visible on desktop');
    const before = await page.evaluate(() => document.getElementById('sidebar').classList.contains('collapsed'));
    await page.click('#nav-toggle');
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => document.getElementById('sidebar').classList.contains('collapsed'));
    if (before === after) failures.push('[nav] desktop hamburger did not toggle sidebar collapse');
    // It must NOT open the off-canvas drawer on desktop.
    if (await page.evaluate(() => document.getElementById('sidebar').classList.contains('drawer-open'))) {
      failures.push('[nav] desktop hamburger wrongly opened the drawer');
    }
    checks += 3;
    await page.close();
  }

  // ── Event bus + deep links + resume ──────────────────────────
  {
    const page = await mkPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/#home', { waitUntil: 'networkidle' });

    // Event bus fires on navigation.
    const busId = await page.evaluate(() => new Promise(res => {
      document.addEventListener('app:navigate', e => res(e.detail.id), { once: true });
      location.hash = '#architecture';
      setTimeout(() => res('(none)'), 1000);
    }));
    if (busId !== 'architecture') failures.push(`[bus] app:navigate detail was "${busId}", expected "architecture"`);

    // Find an animated screen and deep-link to a step.
    let deepOk = false;
    for (const id of ['insert', 'read-path', 'write-path', 'create-table', 'architecture']) {
      await page.goto(`${base}/#${id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);
      const total = await page.evaluate(() => (window.IcebergViz.AnimationControls._engine || {}).totalSteps || 0);
      if (total > 2) {
        await page.goto(`${base}/#${id}/2`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(250);
        const cur = await page.evaluate(() => (window.IcebergViz.AnimationControls._engine || {}).currentStep);
        if (cur === 2) deepOk = true;
        else failures.push(`[deep-link] #${id}/2 → currentStep ${cur}, expected 2`);
        break;
      }
    }
    if (!deepOk) failures.push('[deep-link] could not verify step seek on any animated screen');

    // Resume: last screen restored when hash is empty.
    await page.evaluate(() => { try { localStorage.setItem('tv-iceberg-last-screen', 'quiz'); } catch (e) {} });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const resumed = await page.evaluate(() => location.hash);
    if (resumed !== '#iceberg/quiz') failures.push(`[resume] expected #iceberg/quiz, got "${resumed}"`);

    checks += 3;
    await page.close();
  }

  // ── UX power features (palette, pager, progress) ─────────────
  {
    const page = await mkPage({ viewport: { width: 1440, height: 900 } });
    const ferr = [];
    page.on('pageerror', e => ferr.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') ferr.push(m.text()); });
    await page.goto(base + '/#home', { waitUntil: 'networkidle' });

    // Command palette: Ctrl+K opens, typing filters, Enter navigates.
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(150);
    if (!(await page.isVisible('.cp-backdrop.is-open'))) failures.push('[palette] did not open on Ctrl+K');
    await page.type('#cp-input', 'time trav');
    await page.waitForTimeout(120);
    const top = await page.evaluate(() => document.querySelector('.cp-item .cp-title')?.textContent || '');
    if (!/time travel/i.test(top)) failures.push(`[palette] fuzzy "time trav" top result was "${top}"`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    if (await page.evaluate(() => location.hash) !== '#iceberg/time-travel') failures.push('[palette] Enter did not navigate to selection');

    // Progress: meter exists and marks the current screen visited.
    const prog = await page.evaluate(() => {
      const m = document.getElementById('iv-progress');
      const done = document.querySelectorAll('a.nav-item.nav-done').length;
      return { hasMeter: !!m, done };
    });
    if (!prog.hasMeter) failures.push('[progress] sidebar meter missing');
    if (prog.done < 1) failures.push('[progress] no nav items marked visited');

    if (ferr.length) failures.push('[features] console/page errors: ' + ferr.join(' | '));
    checks += 4;
    await page.close();
  }

  // ── Test Yourself modal + Study Deck ─────────────────────────
  {
    const page = await mkPage({ viewport: { width: 1440, height: 900 } });

    // On an animation screen with a bank: button shows, modal opens,
    // grades — and NOTHING is injected into the module (no layout break).
    await page.goto(base + '/#insert', { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const injected = await page.evaluate(() =>
      !!document.querySelector('#module-container .iv-ty, #module-container .iv-pager'));
    if (injected) failures.push('[modules] quiz was injected into an animation module (must not be)');
    if (!(await page.isVisible('#quiz-toggle'))) failures.push('[quiz] topbar button not shown on a screen with a bank');
    await page.click('#quiz-toggle');
    await page.waitForTimeout(150);
    if (!(await page.isVisible('.ty-modal.is-open'))) failures.push('[quiz] modal did not open');
    const opts = await page.evaluate(() => document.querySelectorAll('.ty-modal .iv-ty__opt').length);
    if (opts < 2) failures.push('[quiz] modal rendered no options');
    await page.click('.ty-modal .iv-ty__q .iv-ty__opt');
    await page.waitForTimeout(120);
    const graded = await page.evaluate(() => {
      const q = document.querySelector('.ty-modal .iv-ty__q');
      return !!q.querySelector('.iv-ty__opt.is-correct') && !q.querySelector('.iv-ty__exp').hidden;
    });
    if (!graded) failures.push('[quiz] grading did not reveal correct answer/explanation');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    if (await page.isVisible('.ty-modal.is-open')) failures.push('[quiz] Escape did not close the modal');

    // On a screen without a bank the button is hidden.
    await page.goto(base + '/#engine-integrations', { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    if (await page.isVisible('#quiz-toggle')) failures.push('[quiz] button visible on a screen with no bank (#engine-integrations)');

    // Study Deck: filters narrow the result set.
    await page.goto(base + '/#study', { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const total = await page.evaluate(() => document.querySelectorAll('.study-card').length);
    if (total < 5) failures.push(`[study] expected many cards, got ${total}`);
    await page.selectOption('#study-diff', 'advanced');
    await page.waitForTimeout(120);
    const adv = await page.evaluate(() => document.querySelectorAll('.study-card').length);
    if (!(adv > 0 && adv < total)) failures.push(`[study] difficulty filter ineffective (${adv} of ${total})`);
    checks += 8;
    await page.close();
  }

  // ── Navigation polish (collapse + persistence + collapse-all) ─
  {
    const page = await mkPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/#home', { waitUntil: 'networkidle' });

    // Toggle first group collapsed; header aria-expanded reflects it.
    await page.locator('.nav-group').first().locator('.nav-group-header').click();
    await page.waitForTimeout(120);
    let st = await page.evaluate(() => {
      const g = document.querySelector('div.nav-group');
      return { collapsed: g.classList.contains('collapsed'), aria: g.querySelector('.nav-group-header').getAttribute('aria-expanded') };
    });
    if (!st.collapsed || st.aria !== 'false') failures.push('[nav] group did not collapse / aria wrong');

    // Persist across reload.
    await page.goto(base + '/#home', { waitUntil: 'networkidle' });
    await page.waitForTimeout(120);
    const persisted = await page.evaluate(() => document.querySelector('div.nav-group').classList.contains('collapsed'));
    if (!persisted) failures.push('[nav] collapsed state not persisted across reload');

    // Collapse-all then expand-all.
    await page.click('#nav-collapse-all');
    await page.waitForTimeout(120);
    const allCollapsed = await page.evaluate(() =>
      [...document.querySelectorAll('.nav-group')].every(g => g.classList.contains('collapsed')));
    await page.click('#nav-collapse-all');
    await page.waitForTimeout(120);
    const allOpen = await page.evaluate(() =>
      [...document.querySelectorAll('.nav-group')].every(g => !g.classList.contains('collapsed')));
    if (!allCollapsed) failures.push('[nav] collapse-all did not collapse every group');
    if (!allOpen) failures.push('[nav] expand-all did not expand every group');

    checks += 4;
    await page.close();
  }

  // ── Accessibility spot-check: icon-only controls have names ──
  {
    const page = await mkPage({ viewport: { width: 810, height: 1080 } });
    await page.goto(base + '/#architecture', { waitUntil: 'networkidle' });
    const unnamed = await page.evaluate(() => {
      const sels = ['.btn-icon', '.anim-btn', '#nav-toggle', '.sidebar-toggle-btn'];
      const bad = [];
      document.querySelectorAll(sels.join(',')).forEach(b => {
        const name = (b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || '').trim();
        if (!name) bad.push(b.className || b.id);
      });
      return bad;
    });
    if (unnamed.length) failures.push('[a11y] icon controls without accessible name: ' + unnamed.join(', '));
    checks++;
    await page.close();
  }

  await browser.close();
  server.close();

  console.log(`Ran ${checks} screen-checks across ${THEMES.length} themes × ${VIEWPORTS.length} viewports.`);
  if (failures.length) {
    console.error(`\n✗ ${failures.length} issue(s):`);
    for (const f of failures) console.error('  • ' + f);
    process.exit(1);
  }
  console.log('✓ All checks passed — no errors, no overflow, all screens render.');
}

main().catch(e => { console.error(e); process.exit(1); });
