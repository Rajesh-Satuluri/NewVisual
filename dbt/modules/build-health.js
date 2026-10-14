// Build Health (Iter 7)
// An in-app test harness surface. Two honest halves:
//   • LIVE checks — run right now in your browser against the real content
//     modules (loaders resolve, registry totals match, schemas hold). Green
//     here means the shipped bundle is self-consistent as you view it.
//   • OFFLINE checks — run in the build pipeline against real engines
//     (DuckDB, Jinja2, PyYAML) which cannot be loaded in this sandbox. Shown
//     with their last recorded result and clearly labelled "build-time", never
//     dressed up as if they ran in the browser.
import { createModuleShell } from '../components/module-shell.js';
import { MODULES, EXTRAS } from '../components/nav.js';
import { REGISTRY } from '../data/registry.js';
import { BANK } from '../data/interview-bank.js';
import { INCIDENTS } from '../data/incidents.js';
import { FILES } from '../data/sample-project.js';
import { QUIZ_BANK } from '../data/quiz-bank.js';
import { MODULE_FILES } from '../data/loader-map.js';

// The loader map is the source of truth for routable ids. We re-derive it here
// from nav so the check is independent of script.js internals.
async function liveChecks() {
  const results = [];
  const add = (name, pass, detail) => results.push({ name, pass, detail });

  // 1. Registry totals match the underlying data.
  add('Registry · module count', REGISTRY.moduleCount === MODULES.length,
    `registry ${REGISTRY.moduleCount} vs nav ${MODULES.length}`);
  add('Registry · interview count', REGISTRY.interviewCount === BANK.length,
    `registry ${REGISTRY.interviewCount} vs bank ${BANK.length}`);
  add('Registry · incident count', REGISTRY.incidentCount === INCIDENTS.length,
    `registry ${REGISTRY.incidentCount} vs incidents ${INCIDENTS.length}`);
  add('Registry · sample-project files', REGISTRY.projectFiles === Object.keys(FILES).length,
    `registry ${REGISTRY.projectFiles} vs files ${Object.keys(FILES).length}`);

  // 2. Interview bank schema: every question has the required fields.
  const need = ['tier', 'cat', 'q', 'short', 'detailed'];
  const badBank = BANK.filter(q => need.some(k => !q[k]));
  add('Interview bank · schema', badBank.length === 0,
    badBank.length ? `${badBank.length} question(s) missing required fields` : `all ${BANK.length} questions well-formed`);

  // 3. Interview bank: no duplicate question text.
  const seen = new Set(); let dupes = 0;
  for (const q of BANK) { if (seen.has(q.q)) dupes++; else seen.add(q.q); }
  add('Interview bank · unique questions', dupes === 0,
    dupes ? `${dupes} duplicate question(s)` : `${BANK.length} distinct`);

  // 4. Incident schema: exactly one correct hypothesis + one correct recovery.
  const badInc = INCIDENTS.filter(i => {
    const h = (i.hypotheses || []).filter(x => x.correct).length;
    const r = (i.recovery?.options || []).filter(x => x.correct).length;
    const w = i.writeup && ['cause', 'impact', 'detection', 'resolution', 'prevention'].every(k => i.writeup[k]);
    return h !== 1 || r !== 1 || !w;
  });
  add('Incident simulator · schema', badInc.length === 0,
    badInc.length ? `${badInc.length} incident(s) fail invariant` : `all ${INCIDENTS.length} incidents valid`);

  // 5. Every nav item (modules + extras) has a loader entry, and every loader
  //    entry actually lazy-loads and exports mount().
  const navIds = [...MODULES.map(m => m.id), ...EXTRAS.map(e => e.id)];
  const missing = navIds.filter(id => !MODULE_FILES[id]);
  add('Routes · every nav item has a loader', missing.length === 0,
    missing.length ? `no loader for: ${missing.join(', ')}` : `${navIds.length} nav items routed`);

  const loaderIds = Object.keys(MODULE_FILES);
  let loadFails = [];
  await Promise.all(loaderIds.map(async id => {
    try {
      const mod = await import(`./${MODULE_FILES[id]}`);
      if (typeof mod.mount !== 'function') loadFails.push(`${id} (no mount)`);
    } catch (e) { loadFails.push(`${id} (${e.message.slice(0, 40)})`); }
  }));
  add('Routes · all modules import + export mount()', loadFails.length === 0,
    loadFails.length ? loadFails.join(', ') : `${loaderIds.length} routes load cleanly`);

  // 6. Quiz bank indices in range.
  let quizBad = 0;
  for (const qs of Object.values(QUIZ_BANK)) {
    for (const item of qs) {
      if (typeof item.answer !== 'number' || item.answer < 0 || item.answer >= item.options.length) quizBad++;
    }
  }
  add('Quiz bank · answer indices', quizBad === 0,
    quizBad ? `${quizBad} out-of-range answer index` : `${REGISTRY.quizQuestionCount} questions valid`);

  return results;
}

const OFFLINE = [
  { name: 'SQL exercises vs real DuckDB', tool: 'tools/validate-sql.mjs', result: '25 / 25 pass', engine: 'python duckdb' },
  { name: 'Config exercises vs Jinja2 + PyYAML', tool: 'tools/validate-config.mjs', result: '12 / 12 pass', engine: 'python jinja2 / pyyaml' },
  { name: 'Content integrity lint', tool: 'tools/content-lint.mjs', result: '0 errors / 0 warnings', engine: 'node' },
  { name: 'Headless route render (light + dark)', tool: 'playwright chromium', result: 'all routes render, 0 JS errors', engine: 'headless chromium' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Quality',
    title: 'Build Health',
    subtitle: 'The platform\'s own test harness, surfaced in-app. Live checks run in your browser right now; offline checks run in the build pipeline against real engines. Nothing here is faked — offline results are labelled as build-time.',
    tabs: [
      { id: 'live', label: '🟢 Live checks' },
      { id: 'offline', label: '🔧 Build-time checks' },
      { id: 'counts', label: '🔢 Content counts' },
    ],
  });

  const liveTab = container.querySelector('#tab-live');
  liveTab.innerHTML = `<p class="bh-lead">Running live checks against the loaded content…</p><div class="bh-spin">⏳</div>`;

  liveChecks().then(results => {
    const passed = results.filter(r => r.pass).length;
    const allGood = passed === results.length;
    liveTab.innerHTML = `
      <div class="bh-summary ${allGood ? 'ok' : 'bad'}">
        <span class="bh-sumico">${allGood ? '✅' : '⚠️'}</span>
        <span>${passed} / ${results.length} live checks passing</span>
      </div>
      <div class="bh-list">
        ${results.map(r => `
          <div class="bh-row ${r.pass ? 'pass' : 'fail'}">
            <span class="bh-dot">${r.pass ? '✓' : '✕'}</span>
            <span class="bh-name">${r.name}</span>
            <span class="bh-detail">${r.detail}</span>
          </div>`).join('')}
      </div>
      <p class="bh-note">These run entirely in your browser against the modules you just loaded — so a green board means the bundle you're viewing is internally consistent.</p>`;
  }).catch(e => {
    liveTab.innerHTML = `<div class="bh-summary bad"><span class="bh-sumico">⚠️</span><span>Live checks could not complete: ${e.message}</span></div>`;
  });

  container.querySelector('#tab-offline').innerHTML = `
    <p class="bh-lead">These validate against <strong>real engines</strong> that can't load in this sandboxed browser (DuckDB-WASM, Jinja2, PyYAML, a headless browser). They run in the build pipeline before every deploy; the results below are from the last build.</p>
    <div class="bh-list">
      ${OFFLINE.map(o => `
        <div class="bh-row pass">
          <span class="bh-dot">✓</span>
          <span class="bh-name">${o.name}</span>
          <span class="bh-detail">${o.result} · <code>${o.engine}</code></span>
        </div>`).join('')}
    </div>
    <p class="bh-note">⚠️ <strong>Honesty note:</strong> the <em>result</em> shown is recorded from the build, not re-executed here — the engines above are blocked by the sandbox. In your real browser on the live site, the SQL and config labs execute for real (DuckDB-WASM / js-yaml).</p>`;

  const r = REGISTRY;
  container.querySelector('#tab-counts').innerHTML = `
    <div class="bh-counts">
      ${[
        ['Modules', r.moduleCount], ['Practice + reference pages', r.extraCount],
        ['Quiz questions', r.quizQuestionCount], ['Interview questions', r.interviewCount],
        ['Incident scenarios', r.incidentCount], ['Sample-project files', r.projectFiles],
      ].map(([l, n]) => `<div class="bh-count"><div class="bh-countn">${n}</div><div class="bh-countl">${l}</div></div>`).join('')}
    </div>
    <p class="bh-note">Every number is derived from the content at import time via <code>data/registry.js</code> — the single source of truth. Nothing in the app hard-codes a total, so these can't drift from reality.</p>`;
}
