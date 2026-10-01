// M33 · Real-World Production Lab  — the flagship capstone.
// One e-commerce project, threaded from business requirement to BI dashboard,
// so a learner can SEE exactly where dbt fits in a production data platform.
// Reuses the shared kit: module shell + tabs, renderExplain cards, clickable
// SVG DAG (as in m20), stepper, code blocks. Cross-links into the deep-dive
// modules instead of re-teaching them.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { renderExplain } from '../components/explain.js';
import {
  BUSINESS, CONCERNS, ARCH_NODES, ARCH_EDGES, DBT_SCOPE, BOUNDARIES,
  SOURCES, RAW_ORDERS_SAMPLE, PROJECT_TREE, DAG_NODES, DAG_EDGES, DAG_KIND_COLOR,
  STAGES, GRAIN_EXERCISE, RUN_SUMMARY, MATERIALIZATIONS, SCHEDULE, DASHBOARD,
  RUN_STEPS, INCIDENTS, DECISIONS, INTERVIEW, ZERO_TO_PROD,
} from '../data/ecommerce-project.js';

let runTimer = null;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const codeBlock = (lang, title, text) => `
  <div class="prod-code">
    ${title ? `<div class="prod-code-title">${esc(title)}</div>` : ''}
    <div class="code-block" data-lang="${lang}">${esc(text)}</div>
  </div>`;

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M33 · Real-World Production Lab',
    title: 'Real-World Production',
    subtitle: 'Follow a production data pipeline from raw source to business dashboard — and see exactly where dbt fits.',
    tabs: [
      { id: 'pipeline', label: '🏗️ Pipeline' },
      { id: 'run',      label: '▶️ Run Production Day' },
      { id: 'incidents',label: '🚨 Incidents' },
      { id: 'decisions',label: '🧭 Decisions' },
      { id: 'flow',     label: '🔎 Data Flow' },
      { id: 'iq',       label: '🎯 Interview' },
    ],
  });

  buildPipeline(container);
  buildRun(container);
  buildIncidents(container);
  buildDecisions(container);
  buildFlow(container);
  buildInterview(container);

  // Clean up the playback timer when navigating away.
  return () => { if (runTimer) { clearInterval(runTimer); runTimer = null; } };
}

// ── Pipeline tab: architecture diagram + scope panel + 14-stage rail ─────────
function buildPipeline(container) {
  const tab = container.querySelector('#tab-pipeline');
  tab.innerHTML = `
    <p class="lab-intro">One e-commerce company. The business wants a <strong>daily revenue dashboard</strong>.
    Below is the whole platform — click any box to jump to that stage, then walk the pipeline rail from the
    business question all the way to the dashboard. Colour = <em>concern</em>, so the ingestion / storage /
    transformation / consumption boundaries are obvious.</p>

    <div class="prod-arch-wrap">
      ${archSvg()}
      <div class="prod-arch-legend">
        ${Object.values(CONCERNS).map(c => `<span class="prod-leg"><span class="prod-leg-dot" style="background:${c.color}"></span>${c.label}</span>`).join('')}
        <span class="prod-leg"><span class="prod-leg-dot prod-leg-orch"></span>Orchestration — Airflow (wraps the schedule)</span>
      </div>
    </div>

    <div class="prod-body">
      <div class="prod-rail" id="prod-rail">
        ${STAGES.map((s, i) => `
          <button class="prod-stage${i === 0 ? ' active' : ''}" data-stage="${s.id}">
            <span class="prod-stage-n">${i + 1}</span>
            <span class="prod-stage-ic">${s.icon}</span>
            <span class="prod-stage-tx"><span class="prod-stage-name">${s.name}</span><span class="prod-stage-sub">${s.sub}</span></span>
          </button>`).join('')}
      </div>
      <div class="prod-stage-content" id="prod-stage-content"></div>
    </div>

    ${scopePanel()}
  `;

  const rail = tab.querySelector('#prod-rail');
  const content = tab.querySelector('#prod-stage-content');

  const show = (id) => {
    const i = STAGES.findIndex(s => s.id === id);
    if (i < 0) return;
    rail.querySelectorAll('.prod-stage').forEach(b => b.classList.toggle('active', b.dataset.stage === id));
    content.innerHTML = renderStage(STAGES[i], i);
    // enhance any code blocks just rendered
    import('../components/module-shell.js').then(m => m.injectCodeEnhancements(content));
    bindStageInteractions(content);
    content.scrollIntoView({ block: 'nearest' });
  };

  rail.addEventListener('click', e => {
    const b = e.target.closest('.prod-stage');
    if (b) show(b.dataset.stage);
  });

  // Architecture node → jump to the mapped stage.
  tab.querySelector('#prod-arch-svg').addEventListener('click', e => {
    const g = e.target.closest('[data-stage]');
    if (g) show(g.dataset.stage);
  });

  // "Go deeper" cross-links + in-stage nav.
  content.addEventListener('click', e => {
    const link = e.target.closest('[data-goto]');
    if (link) { location.hash = link.dataset.goto; return; }
    const nav = e.target.closest('[data-stage-nav]');
    if (nav) show(nav.dataset.stageNav);
  });

  show(STAGES[0].id);
}

// ── Stage renderer ───────────────────────────────────────────────────────────
function renderStage(s, i) {
  const prev = STAGES[i - 1], next = STAGES[i + 1];
  const code = (s.code || []).map(c => codeBlock(c.lang, c.title, c.text)).join('');
  return `
    <div class="prod-stage-head">
      <span class="prod-stage-meta"><span class="prod-k">Owner</span> ${s.owner}</span>
      <span class="prod-stage-meta"><span class="prod-k">Tech</span> ${s.tech}</span>
      ${s.deeper ? `<button class="prod-deeper" data-goto="${s.deeper.id}">${s.deeper.label}</button>` : ''}
    </div>
    ${renderExplain(s.explain)}
    ${code}
    ${renderExtra(s.extra)}
    <div class="prod-stage-pager">
      ${prev ? `<button class="btn btn-ghost" data-stage-nav="${prev.id}">← ${prev.name}</button>` : '<span></span>'}
      ${next ? `<button class="btn btn-secondary" data-stage-nav="${next.id}">${next.name} →</button>` : '<span></span>'}
    </div>`;
}

// ── Extras (stage-specific interactive / tabular content) ────────────────────
function renderExtra(kind) {
  switch (kind) {
    case 'target-shape': return targetShape();
    case 'source-schemas': return sourceSchemas();
    case 'boundaries': return boundariesTable();
    case 'raw-sample': return rawSample();
    case 'project-tree': return projectTree();
    case 'marts-dag': return dagSvg();
    case 'grain-exercise': return grainExercise();
    case 'test-run': return testRun();
    case 'materialization-table': return materializationTable();
    case 'schedule': return scheduleStrip();
    case 'monitoring': return monitoringPanel();
    case 'dashboard': return dashboardPanel();
    default: return '';
  }
}

function targetShape() {
  const layers = ['raw.orders', 'stg_orders (clean)', 'dim_customer / dim_product', 'fct_orders (order grain)', 'fct_daily_revenue (mart)', 'BI dashboard'];
  return `
    <div class="detail-section"><h3>What the business asked</h3>
      <p>"${BUSINESS.ask}"</p>
      <div class="prod-pills">${BUSINESS.dashboards.map(d => `<span class="prod-pill">${d}</span>`).join('')}</div>
      <h3 style="margin-top:18px">The layers that answer it</h3>
      <div class="prod-flow">${layers.map((l, i) => `<span class="prod-flow-node">${l}</span>${i < layers.length - 1 ? '<span class="prod-flow-arr">↓</span>' : ''}`).join('')}</div>
      <p style="margin-top:10px;color:var(--text-3)">Each layer has one job. We design these <em>before</em> writing SQL.</p>
    </div>`;
}

function sourceSchemas() {
  return `<div class="detail-section"><h3>Source schemas</h3>
    <div class="info-grid">
      ${SOURCES.map(s => `
        <div class="info-card">
          <div class="info-card-title">${s.name}<span class="info-card-tag">${s.origin}</span></div>
          <div class="info-card-body"><div class="prod-cols">${s.cols.map(c => `<span class="prod-col">${c}</span>`).join('')}</div></div>
        </div>`).join('')}
    </div></div>`;
}

function boundariesTable() {
  return `<div class="detail-section"><h3>Four roles people blur in interviews</h3>
    <div class="compare-table-wrap"><table class="compare-table">
      <thead><tr><th>Role</th><th>Technology</th><th>Its job</th></tr></thead>
      <tbody>${BOUNDARIES.map(b => `<tr><td><strong>${b.role}</strong></td><td class="code-inline">${b.tech}</td><td>${b.job}</td></tr>`).join('')}</tbody>
    </table></div></div>`;
}

function rawSample() {
  const { cols, rows, problems } = RAW_ORDERS_SAMPLE;
  return `<div class="detail-section"><h3>raw.orders — intentionally messy</h3>
    <div class="compare-table-wrap"><table class="compare-table">
      <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(v => `<td class="code-inline">${v}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <ul class="prod-ul">${problems.map(p => `<li>⚠️ ${p}</li>`).join('')}</ul>
    <p style="color:var(--text-3)">Staging cleans all of this — raw stays faithful to the source.</p></div>`;
}

function projectTree() {
  return `<div class="detail-section"><h3>dbt project structure</h3>
    <div class="prod-tree">
      ${PROJECT_TREE.map(n => {
        const depth = (n.path.match(/\//g) || []).length - (n.kind === 'dir' ? 1 : 0);
        const indent = Math.max(0, depth);
        const name = n.path.replace(/\/$/, '').split('/').pop() + (n.kind === 'dir' ? '/' : '');
        const icon = n.kind === 'dir' ? '📁' : n.kind === 'yml' ? '⚙️' : '📄';
        const jump = n.stage ? ` data-stage-nav="${n.stage}"` : '';
        return `<div class="prod-tree-row${n.stage ? ' link' : ''}" style="padding-left:${indent * 16 + 4}px"${jump}>
          <span class="prod-tree-ic">${icon}</span><span class="prod-tree-name">${name}</span>
          ${n.note ? `<span class="prod-tree-note">${n.note}</span>` : ''}</div>`;
      }).join('')}
    </div></div>`;
}

function grainExercise() {
  const { question, options, fix } = GRAIN_EXERCISE;
  return `<div class="detail-section prod-grain"><h3>Interview exercise: what happens to the grain?</h3>
    <p class="prod-grain-q">${question}</p>
    <div class="prod-choices" data-grain>
      ${options.map(o => `<button class="prod-choice" data-correct="${o.correct}" data-why="${esc(o.why)}">${o.label}</button>`).join('')}
    </div>
    <div class="prod-grain-reveal" hidden></div>
    <div class="prod-grain-fix" hidden><strong>Fix:</strong> ${fix}</div></div>`;
}

function testRun() {
  const steps = [
    ['unique(order_id)', 'pass'], ['not_null(customer_id)', 'pass'],
    ['relationships(customer_id → dim_customer)', 'fail'], ['accepted_values(order_status)', 'pass'],
  ];
  return `<div class="detail-section"><h3>Test execution (simulated)</h3>
    <div class="prod-tests">${steps.map(([t, st]) => `
      <div class="prod-test ${st}"><span class="prod-test-name">${t}</span><span class="prod-test-badge ${st}">${st.toUpperCase()}</span></div>`).join('')}</div>
    <p style="margin-top:10px">The <code>relationships</code> failure means an <code>order</code> references a <code>customer_id</code> not present in <code>dim_customer</code> — an orphaned record. In production this <strong>halts the build</strong> so the bad join never reaches the dashboard.</p></div>`;
}

function materializationTable() {
  return `<div class="detail-section"><h3>Materialization per model — a decision, not a default</h3>
    <div class="compare-table-wrap"><table class="compare-table">
      <thead><tr><th>Model</th><th>Materialization</th><th>Why</th></tr></thead>
      <tbody>${MATERIALIZATIONS.map(m => `<tr><td class="code-inline">${m.model}</td><td><span class="prod-pill">${m.mat}</span></td><td>${m.why}</td></tr>`).join('')}</tbody>
    </table></div></div>`;
}

function scheduleStrip() {
  return `<div class="detail-section"><h3>A production day (Airflow schedule)</h3>
    <div class="prod-sched">${SCHEDULE.map(s => `
      <div class="prod-sched-row"><span class="prod-sched-time">${s.time}</span>
        <span class="prod-sched-label">${s.label}</span><span class="prod-sched-who">${s.who}</span></div>`).join('')}</div>
    <p style="margin-top:10px">Airflow owns the <em>when</em> and the cross-system ordering (wait for ingestion → dbt build → tests → BI refresh). dbt owns the <em>model</em> ordering inside its own build.</p></div>`;
}

function monitoringPanel() {
  const r = RUN_SUMMARY;
  const stat = (k, v, cls) => `<div class="prod-mon-stat ${cls || ''}"><div class="prod-mon-v">${v}</div><div class="prod-mon-k">${k}</div></div>`;
  return `<div class="detail-section"><h3>dbt run summary <span class="prod-sim">simulated</span></h3>
    <div class="prod-mon-grid">
      ${stat('Models', `${r.models.pass}/${r.models.total}`, r.models.fail ? 'warn' : 'ok')}
      ${stat('Models failed', r.models.fail, r.models.fail ? 'bad' : 'ok')}
      ${stat('Tests', `${r.tests.pass}/${r.tests.total}`, r.tests.fail ? 'warn' : 'ok')}
      ${stat('Tests failed', r.tests.fail, r.tests.fail ? 'bad' : 'ok')}
    </div>
    <h3 style="margin-top:16px">Source freshness</h3>
    <div class="prod-fresh">${r.freshness.map(f => `<span class="prod-fresh-chip ${f.status}">${f.source} · ${f.status.toUpperCase()}</span>`).join('')}</div>
    <h3 style="margin-top:16px">Failures to investigate</h3>
    <div class="prod-fails">${r.failures.map(f => `<div class="prod-fail-row"><span class="prod-fail-node">${f.node}</span><span class="prod-fail-msg">${f.msg}</span></div>`).join('')}</div></div>`;
}

function dashboardPanel() {
  const d = DASHBOARD;
  return `<div class="detail-section"><h3>The business dashboard <span class="prod-sim">simulated</span></h3>
    <div class="prod-kpis">${d.kpis.map(k => `
      <div class="prod-kpi" data-model="${k.model}" title="Source: ${k.model}">
        <div class="prod-kpi-v">${k.value}</div><div class="prod-kpi-l">${k.label}</div>
        <div class="prod-kpi-s">${k.sub}</div><div class="prod-kpi-src">↩ ${k.model}</div></div>`).join('')}</div>
    <div class="prod-pills" style="margin-top:14px">${d.charts.map(c => `<span class="prod-pill">📈 ${c}</span>`).join('')}</div>
    <h3 style="margin-top:18px">Every KPI traces back to a model</h3>
    <div class="prod-flow">${d.lineage.map((l, i) => `<span class="prod-flow-node">${l}</span>${i < d.lineage.length - 1 ? '<span class="prod-flow-arr">↑</span>' : ''}`).join('')}</div>
    <p style="color:var(--text-3);margin-top:8px">${d.note}</p></div>`;
}

// ── Architecture SVG ─────────────────────────────────────────────────────────
function archSvg() {
  const W = 150, H = 44;
  const box = (id) => {
    const n = ARCH_NODES[id];
    const w = n.w || W, h = n.h || H;
    const c = CONCERNS[n.concern].color;
    const clickable = n.stage ? ` data-stage="${n.stage}" style="cursor:pointer"` : '';
    return `<g${clickable}>
      <rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="8" fill="${c}22" stroke="${c}" stroke-width="1.6"/>
      <text x="${n.x + w / 2}" y="${n.y + h / 2 + 4}" text-anchor="middle" font-family="Inter,sans-serif"
        font-size="${id === 'dbt' ? 12 : 11.5}" font-weight="${id === 'dbt' ? 800 : 600}" fill="${c}">${n.label}</text>
    </g>`;
  };
  const edge = ([a, b]) => {
    const A = ARCH_NODES[a], B = ARCH_NODES[b];
    const aw = A.w || W, ah = A.h || H, bw = B.w || W;
    const x1 = A.x + aw / 2, y1 = A.y + ah, x2 = B.x + bw / 2, y2 = B.y;
    return `<path d="M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}"
      fill="none" stroke="var(--border)" stroke-width="1.4" marker-end="url(#archarr)"/>`;
  };
  return `
    <svg id="prod-arch-svg" viewBox="0 0 620 590" width="100%" style="max-width:620px;margin:0 auto;display:block">
      <defs><marker id="archarr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="var(--text-3)"/></marker></defs>
      <rect x="130" y="238" width="360" height="296" rx="12" fill="none" stroke="var(--warn)" stroke-width="1.3"
        stroke-dasharray="6 5" opacity="0.5"/>
      <text x="486" y="252" text-anchor="end" font-size="9.5" fill="var(--warn)" font-family="Inter">Airflow orchestrates this window</text>
      ${ARCH_EDGES.map(edge).join('')}
      ${Object.keys(ARCH_NODES).map(box).join('')}
    </svg>`;
}

// ── Project DAG SVG (reused in marts stage, Run playback, Data Flow) ─────────
// `activeMode`: when a highlight set is supplied, non-highlighted nodes dim;
// when empty, all nodes show at full strength.
function renderDag(svgId, markerId, hi, { dimOthers = false } = {}) {
  const on = (id) => (dimOthers ? hi.has(id) : (hi.size === 0 || hi.has(id)));
  const W = 150, H = 40;
  const node = (id) => {
    const n = DAG_NODES[id];
    const c = DAG_KIND_COLOR[n.kind];
    const lit = on(id);
    return `<g class="dag-node" data-dag="${id}" style="cursor:pointer">
      <rect x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="7"
        fill="${lit ? c + '26' : 'var(--surface)'}" stroke="${lit ? c : 'var(--border)'}" stroke-width="${lit ? 2.2 : 1.1}" opacity="${lit ? 1 : 0.35}"/>
      <text x="${n.x + W / 2}" y="${n.y + H / 2 + 4}" text-anchor="middle" font-family="JetBrains Mono,monospace"
        font-size="10.5" fill="${lit ? c : 'var(--text-3)'}" font-weight="${lit ? 700 : 400}">${n.label}</text></g>`;
  };
  const edge = ([a, b]) => {
    const A = DAG_NODES[a], B = DAG_NODES[b];
    const x1 = A.x + W, y1 = A.y + H / 2, x2 = B.x, y2 = B.y + H / 2;
    const lit = on(a) && on(b);
    const mx = (x1 + x2) / 2;
    return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none"
      stroke="${lit ? 'var(--accent)' : 'var(--border)'}" stroke-width="${lit ? 2 : 1.1}" opacity="${lit ? 0.9 : 0.3}" marker-end="url(#${markerId})"/>`;
  };
  return `<svg id="${svgId}" viewBox="0 0 790 350" width="100%" style="max-width:790px">
      <defs><marker id="${markerId}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="var(--text-3)"/></marker></defs>
      ${DAG_EDGES.map(edge).join('')}${Object.keys(DAG_NODES).map(node).join('')}
    </svg>`;
}

function dagSvg() {
  return `<div class="detail-section"><h3>The project DAG</h3>
    <div class="dag-wrap">${renderDag('prod-dag-svg', 'dagarr', new Set())}</div>
    <p style="color:var(--text-3)">sources → staging → intermediate → dims & facts → the mart the dashboard reads.</p></div>`;
}

// ── dbt scope side panel (permanent on Pipeline) ─────────────────────────────
function scopePanel() {
  return `
    <div class="dbt-scope-panel">
      <div class="dbt-scope-col dbt-scope-does">
        <div class="dbt-scope-h">✅ dbt DOES</div>
        <ul>${DBT_SCOPE.does.map(x => `<li>${x}</li>`).join('')}</ul>
      </div>
      <div class="dbt-scope-col dbt-scope-doesnt">
        <div class="dbt-scope-h">⛔ dbt DOES NOT</div>
        <ul>${DBT_SCOPE.doesnt.map(x => `<li>${x}</li>`).join('')}</ul>
      </div>
    </div>`;
}

// ── Run Production Day — animated pipeline ───────────────────────────────────
function buildRun(container) {
  const tab = container.querySelector('#tab-run');
  tab.innerHTML = `
    <p class="lab-intro">Press <strong>Run Production Day</strong> to watch the nightly pipeline execute from 01:00 to 03:15 —
    ingestion, freshness, parse, the dbt DAG building layer by layer, tests, artifacts, then the BI refresh.
    The graph lights up as each layer lands. This is a simulation of the sequence, not a live warehouse.</p>
    <div class="prod-run-ctrl">
      <button class="btn btn-primary" id="run-play">▶ Run Production Day</button>
      <button class="btn btn-ghost" id="run-step">Step ▸</button>
      <button class="btn btn-ghost" id="run-reset">↻ Reset</button>
      <span class="prod-run-clock" id="run-clock">—:—</span>
    </div>
    <div class="prod-run-body">
      <div class="prod-run-timeline" id="run-timeline">
        ${RUN_STEPS.map((s, i) => `
          <div class="prod-run-row" data-i="${i}">
            <span class="prod-run-time">${s.time}</span>
            <span class="prod-run-dot"></span>
            <span class="prod-run-tx"><span class="prod-run-label">${s.label}</span>
              <span class="prod-run-who">${s.who}</span></span>
            <span class="prod-run-status" aria-hidden="true"></span>
          </div>`).join('')}
      </div>
      <div class="prod-run-stage">
        <div class="dag-wrap" id="run-dag">${renderDag('run-dag-svg', 'runarr', new Set(), { dimOthers: true })}</div>
        <div class="prod-run-detail" id="run-detail">Idle — press ▶ to start the 01:00 run.</div>
      </div>
    </div>`;

  const rows = [...tab.querySelectorAll('.prod-run-row')];
  const clock = tab.querySelector('#run-clock');
  const detail = tab.querySelector('#run-detail');
  const dagWrap = tab.querySelector('#run-dag');
  let cursor = -1;
  const built = new Set();

  const paint = () => {
    dagWrap.innerHTML = renderDag('run-dag-svg', 'runarr', new Set(built), { dimOthers: true });
  };
  const applyStep = (i) => {
    const s = RUN_STEPS[i];
    rows.forEach((r, idx) => {
      r.classList.toggle('done', idx < i);
      r.classList.toggle('current', idx === i);
      r.querySelector('.prod-run-status').textContent = idx <= i ? '✓' : '';
    });
    s.nodes.forEach(n => built.add(n));
    clock.textContent = s.time;
    detail.innerHTML = `<span class="prod-run-detail-t">${s.time} · ${s.label}</span>${s.detail}`;
    paint();
  };
  const step = () => {
    if (cursor >= RUN_STEPS.length - 1) return false;
    cursor += 1; applyStep(cursor); return true;
  };
  const reset = () => {
    if (runTimer) { clearInterval(runTimer); runTimer = null; }
    cursor = -1; built.clear();
    rows.forEach(r => { r.classList.remove('done', 'current'); r.querySelector('.prod-run-status').textContent = ''; });
    clock.textContent = '—:—';
    detail.textContent = 'Idle — press ▶ to start the 01:00 run.';
    tab.querySelector('#run-play').textContent = '▶ Run Production Day';
    paint();
  };
  const play = () => {
    if (runTimer) { clearInterval(runTimer); runTimer = null; tab.querySelector('#run-play').textContent = '▶ Resume'; return; }
    if (cursor >= RUN_STEPS.length - 1) reset();
    tab.querySelector('#run-play').textContent = '⏸ Pause';
    runTimer = setInterval(() => {
      if (!step()) {
        clearInterval(runTimer); runTimer = null;
        tab.querySelector('#run-play').textContent = '✓ Day complete';
        detail.innerHTML += ' <strong style="color:var(--success)">— run green, dashboards fresh.</strong>';
      }
    }, 900);
  };

  tab.querySelector('#run-play').addEventListener('click', play);
  tab.querySelector('#run-step').addEventListener('click', () => { if (runTimer) { clearInterval(runTimer); runTimer = null; tab.querySelector('#run-play').textContent = '▶ Resume'; } step(); });
  tab.querySelector('#run-reset').addEventListener('click', reset);
}

// ── Incidents — guided investigations ────────────────────────────────────────
function buildIncidents(container) {
  const tab = container.querySelector('#tab-incidents');
  tab.innerHTML = `
    <p class="lab-intro">Three real production incidents on this exact pipeline. For each: read the symptom, walk the lineage,
    pick the root cause, then see the full root-cause / impact / detection / resolution / prevention writeup. Diagnose before you reveal.</p>
    <div class="lab-picker" id="inc-picker">
      ${INCIDENTS.map((inc, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-inc="${inc.id}">${inc.icon} ${inc.title}</button>`).join('')}
    </div>
    <div id="inc-body"></div>`;

  const body = tab.querySelector('#inc-body');
  const show = (id) => {
    const inc = INCIDENTS.find(x => x.id === id);
    body.innerHTML = renderIncident(inc);
    import('../components/module-shell.js').then(m => m.injectCodeEnhancements(body));
    bindIncident(body, inc);
  };
  tab.querySelector('#inc-picker').addEventListener('click', e => {
    const c = e.target.closest('.lab-chip');
    if (!c) return;
    tab.querySelectorAll('#inc-picker .lab-chip').forEach(x => x.classList.toggle('active', x === c));
    show(c.dataset.inc);
  });
  body.addEventListener('click', e => {
    const link = e.target.closest('[data-goto]');
    if (link) location.hash = link.dataset.goto;
  });
  show(INCIDENTS[0].id);
}

function renderIncident(inc) {
  const sevCls = inc.severity.toLowerCase();
  return `
    <div class="prod-inc">
      <div class="prod-inc-head">
        <span class="prod-inc-sev ${sevCls}">${inc.severity}</span>
        <span class="prod-inc-paged">🔔 ${inc.paged}</span>
        ${inc.deeper ? `<button class="prod-deeper" data-goto="${inc.deeper.id}">${inc.deeper.label}</button>` : ''}
      </div>
      <h3 class="prod-inc-title">${inc.icon} ${inc.title}</h3>
      <div class="prod-inc-symptom"><span class="prod-inc-k">Symptom</span>${inc.symptom}</div>

      <h4 class="prod-inc-h">1 · Walk the lineage</h4>
      <p class="prod-inc-note">Click each node to see what you'd check there — top (dashboard) down to the source.</p>
      <div class="prod-inc-trace">
        ${inc.trace.map((t, i) => `
          <button class="prod-inc-node" data-ti="${i}">
            <span class="prod-inc-node-name">${t.node}</span>
            <span class="prod-inc-node-arr">▾</span>
          </button>
          <div class="prod-inc-check" data-ci="${i}" hidden>${t.check}</div>`).join('')}
      </div>

      <h4 class="prod-inc-h">2 · What is the root cause?</h4>
      <div class="prod-choices" data-inc-hyp>
        ${inc.hypotheses.map(h => `<button class="prod-choice" data-correct="${h.correct}" data-why="${esc(h.why)}">${h.label}</button>`).join('')}
      </div>
      <div class="prod-grain-reveal" data-inc-reveal hidden></div>

      <div class="prod-inc-resolved" data-inc-writeup hidden>
        <h4 class="prod-inc-h">3 · The writeup</h4>
        <div class="prod-inc-root">🎯 <strong>Root cause:</strong> ${inc.root}</div>
        ${inc.fixCode ? `<div class="prod-code"><div class="prod-code-title">The fix</div><div class="code-block" data-lang="sql">${esc(inc.fixCode)}</div></div>` : ''}
        <div class="prod-inc-grid">
          ${[['Root cause', inc.writeup.cause], ['Impact', inc.writeup.impact], ['Detection', inc.writeup.detection], ['Resolution', inc.writeup.resolution], ['Prevention', inc.writeup.prevention]]
            .map(([k, v]) => `<div class="prod-inc-cell"><div class="prod-inc-cell-k">${k}</div><div class="prod-inc-cell-v">${v}</div></div>`).join('')}
        </div>
      </div>
    </div>`;
}

function bindIncident(body, inc) {
  // Lineage node toggles.
  body.querySelectorAll('.prod-inc-node').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = btn.dataset.ti;
      const check = body.querySelector(`.prod-inc-check[data-ci="${i}"]`);
      const open = check.hidden;
      check.hidden = !open;
      btn.classList.toggle('open', open);
    });
  });
  // Hypothesis selection → reveal + writeup on correct.
  const hyp = body.querySelector('[data-inc-hyp]');
  const reveal = body.querySelector('[data-inc-reveal]');
  const writeup = body.querySelector('[data-inc-writeup]');
  hyp.addEventListener('click', e => {
    const b = e.target.closest('.prod-choice');
    if (!b) return;
    hyp.querySelectorAll('.prod-choice').forEach(c => c.classList.remove('chosen'));
    b.classList.add('chosen');
    const ok = b.dataset.correct === 'true';
    reveal.hidden = false;
    reveal.className = `prod-grain-reveal ${ok ? 'ok' : 'bad'}`;
    reveal.innerHTML = `<strong>${ok ? '✅ Correct.' : '❌ Not the root cause.'}</strong> ${b.dataset.why}`;
    if (ok) {
      writeup.hidden = false;
      import('../components/module-shell.js').then(m => m.injectCodeEnhancements(writeup));
    }
  });
}

// ── Decisions — architecture decision points ─────────────────────────────────
function buildDecisions(container) {
  const tab = container.querySelector('#tab-decisions');
  tab.innerHTML = `
    <p class="lab-intro">Real design calls on this project. Pick an answer, then see <strong>why</strong>, the
    <strong>production consideration</strong>, a sensible <strong>alternative</strong>, and the <strong>interview answer</strong>.
    There is usually a best choice, not an only choice — the reasoning is the point.</p>
    <div class="prod-dec-list">
      ${DECISIONS.map((d, i) => `
        <div class="prod-dec" data-dec="${d.id}">
          <div class="prod-dec-q"><span class="prod-dec-n">Decision ${i + 1}</span>${d.q}</div>
          <div class="prod-dec-opts">
            ${d.options.map(o => `<button class="prod-dec-opt" data-correct="${!!o.correct}" data-id="${o.id}">${o.label}</button>`).join('')}
          </div>
          <div class="prod-dec-reveal" hidden></div>
        </div>`).join('')}
    </div>`;

  tab.addEventListener('click', e => {
    const opt = e.target.closest('.prod-dec-opt');
    if (opt) {
      const card = opt.closest('.prod-dec');
      const d = DECISIONS.find(x => x.id === card.dataset.dec);
      card.querySelectorAll('.prod-dec-opt').forEach(o => {
        o.classList.remove('chosen', 'is-correct');
        if (o.dataset.correct === 'true') o.classList.add('is-correct');
      });
      opt.classList.add('chosen');
      const ok = opt.dataset.correct === 'true';
      const rev = card.querySelector('.prod-dec-reveal');
      rev.hidden = false;
      rev.innerHTML = `
        <div class="prod-dec-verdict ${ok ? 'ok' : 'bad'}">${ok ? '✅ Recommended choice.' : '↪ Workable, but not the best call here.'}</div>
        <div class="prod-dec-grid">
          <div class="prod-inc-cell"><div class="prod-inc-cell-k">Why</div><div class="prod-inc-cell-v">${d.why}</div></div>
          <div class="prod-inc-cell"><div class="prod-inc-cell-k">Production consideration</div><div class="prod-inc-cell-v">${d.prod}</div></div>
          <div class="prod-inc-cell"><div class="prod-inc-cell-k">Alternative</div><div class="prod-inc-cell-v">${d.alt}</div></div>
          <div class="prod-inc-cell prod-dec-iv"><div class="prod-inc-cell-k">Interview answer</div><div class="prod-inc-cell-v">${d.interview}</div></div>
        </div>`;
      return;
    }
    const link = e.target.closest('[data-goto]');
    if (link) location.hash = link.dataset.goto;
  });
}

// ── Data Flow — trace one order end to end ───────────────────────────────────
function buildFlow(container) {
  const tab = container.querySelector('#tab-flow');
  // The lineage path a single order travels (DAG node ids), with a label per hop.
  const PATH = [
    { node: 'src_orders', label: 'Orders app → raw.orders', note: 'The order is written by the app and ingested into the RAW schema as-is.' },
    { node: 'stg_orders', label: 'stg_orders', note: 'Cleaned & recast: country standardized, status lower-cased, types fixed.' },
    { node: 'int_orders', label: 'int_orders_enriched', note: 'Joined to customer, product and payment — one enriched row for this order.' },
    { node: 'fct_orders', label: 'fct_orders', note: 'Merged into the order-grain fact (incremental, unique_key order_id).' },
    { node: 'fct_daily_revenue', label: 'fct_daily_revenue', note: 'Aggregated into its day × country × category × channel bucket.' },
    { node: 'dashboard', label: 'BI dashboard', note: 'Its revenue contributes to the tile the business sees at 9am.' },
  ];
  tab.innerHTML = `
    <p class="lab-intro">Lineage made tangible. Trace a single order — <strong>order_id 10001</strong> — from the moment it is
    placed to the dashboard tile it feeds. Step through the hops; the DAG highlights the exact path the row travels.</p>
    <div class="prod-run-ctrl">
      <button class="btn btn-primary" id="flow-step">Trace next hop ▸</button>
      <button class="btn btn-ghost" id="flow-all">Show full path</button>
      <button class="btn btn-ghost" id="flow-reset">↻ Reset</button>
      <span class="prod-flow-id">order_id = 10001</span>
    </div>
    <div class="prod-run-body">
      <div class="prod-flow-steps" id="flow-steps">
        ${PATH.map((p, i) => `
          <div class="prod-flow-step" data-i="${i}">
            <span class="prod-flow-step-n">${i + 1}</span>
            <span class="prod-flow-step-tx"><span class="prod-flow-step-l">${p.label}</span>
              <span class="prod-flow-step-note">${p.note}</span></span>
          </div>`).join('')}
      </div>
      <div class="prod-run-stage">
        <div class="dag-wrap" id="flow-dag">${renderDag('flow-dag-svg', 'flowarr', new Set(), { dimOthers: true })}</div>
      </div>
    </div>`;

  const steps = [...tab.querySelectorAll('.prod-flow-step')];
  const dagWrap = tab.querySelector('#flow-dag');
  let cursor = -1;
  const lit = new Set();
  const paint = () => { dagWrap.innerHTML = renderDag('flow-dag-svg', 'flowarr', new Set(lit), { dimOthers: true }); };
  const applyTo = (i) => {
    lit.clear();
    for (let k = 0; k <= i; k++) lit.add(PATH[k].node);
    steps.forEach((s, idx) => s.classList.toggle('on', idx <= i));
    cursor = i; paint();
  };
  tab.querySelector('#flow-step').addEventListener('click', () => { if (cursor < PATH.length - 1) applyTo(cursor + 1); });
  tab.querySelector('#flow-all').addEventListener('click', () => applyTo(PATH.length - 1));
  tab.querySelector('#flow-reset').addEventListener('click', () => { cursor = -1; lit.clear(); steps.forEach(s => s.classList.remove('on')); paint(); });
  // Click a step to jump to it.
  tab.querySelector('#flow-steps').addEventListener('click', e => {
    const s = e.target.closest('.prod-flow-step');
    if (s) applyTo(Number(s.dataset.i));
  });
}

// ── Interview — 15 project-specific Q&A + the zero-to-production summary ──────
function buildInterview(container) {
  const tab = container.querySelector('#tab-iq');
  const IQ = INTERVIEW.map(x => ({
    q: x.q,
    a: `<div class="prod-iv-expected"><span class="prod-iv-k">Expected</span>${x.expected}</div>
        <div class="prod-iv-row"><span class="prod-iv-k">In depth</span>${x.detailed}</div>
        <div class="prod-iv-row"><span class="prod-iv-k">Follow-up</span>${x.followup}</div>
        <div class="prod-iv-row prod-iv-senior"><span class="prod-iv-k">Senior angle</span>${x.senior}</div>`,
  }));
  tab.innerHTML = `
    <p class="lab-intro">Fifteen questions grounded in <em>this</em> project — the exact answers you would give after walking the
    pipeline. Each has the expected one-liner, the in-depth answer, a follow-up, and the senior-level angle.</p>
    ${createIQSection(IQ)}
    ${zeroToProd()}`;
  // IQ accordion is wired by the module-shell initIQ() in script.js after mount.
}

function zeroToProd() {
  return `
    <div class="detail-section prod-ztp">
      <h3>🏁 From zero to production — the whole journey on one screen</h3>
      <p>Every stage, who owns it, what tech, what can fail, how it is monitored. This is the answer to
      "walk me through how dbt is used in production from data generated to business dashboard."</p>
      <div class="compare-table-wrap"><table class="compare-table">
        <thead><tr><th>Stage</th><th>Who owns it</th><th>Tech</th><th>What can fail</th><th>How it's monitored</th></tr></thead>
        <tbody>${ZERO_TO_PROD.map((r, i) => `
          <tr><td><span class="prod-ztp-n">${i + 1}</span><strong>${r.stage}</strong></td>
            <td>${r.who}</td><td class="code-inline">${r.tech}</td>
            <td>${r.fails}</td><td>${r.monitor}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="prod-ztp-foot">BUSINESS REQUIREMENT → SOURCES → INGESTION → RAW → dbt SOURCES → STAGING → INTERMEDIATE → MARTS → TESTS → ORCHESTRATION → CI/CD → PRODUCTION → MONITORING → BI → <strong>BUSINESS DECISION</strong></div>
    </div>`;
}

// ── Stage interactions (grain exercise + dashboard KPI hover already CSS) ─────
function bindStageInteractions(content) {
  const grain = content.querySelector('[data-grain]');
  if (grain) {
    const reveal = content.querySelector('.prod-grain-reveal');
    const fix = content.querySelector('.prod-grain-fix');
    grain.addEventListener('click', e => {
      const b = e.target.closest('.prod-choice');
      if (!b) return;
      grain.querySelectorAll('.prod-choice').forEach(c => c.classList.remove('chosen'));
      b.classList.add('chosen');
      const ok = b.dataset.correct === 'true';
      reveal.hidden = false; fix.hidden = false;
      reveal.className = `prod-grain-reveal ${ok ? 'ok' : 'bad'}`;
      reveal.innerHTML = `<strong>${ok ? '✅ Correct.' : '❌ Not quite.'}</strong> ${b.dataset.why}`;
    });
  }
}
