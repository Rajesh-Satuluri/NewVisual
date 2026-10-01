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
} from '../data/ecommerce-project.js';

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
  buildPlaceholder(container, 'run',      '▶️ Run Production Day', 'An animated 01:00→03:15 production run lands in the next wave.');
  buildPlaceholder(container, 'incidents','🚨 Incidents', 'Three interactive production incidents land in the next wave.');
  buildPlaceholder(container, 'decisions','🧭 Decisions', 'Architecture decision points land in the next wave.');
  buildPlaceholder(container, 'flow',     '🔎 Data Flow', 'Trace a single order end-to-end — lands in the next wave.');
  buildPlaceholder(container, 'iq',       '🎯 Interview', 'Fifteen project-specific interview questions land in the next wave.');
}

function buildPlaceholder(container, id, title, msg) {
  const tab = container.querySelector(`#tab-${id}`);
  if (tab) tab.innerHTML = `<div class="detail-section"><h3>${title}</h3><p>${msg}</p></div>`;
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

// ── Project DAG SVG (reused in the marts stage + Data Flow) ──────────────────
function dagSvg(highlight) {
  const hi = highlight || new Set();
  const W = 150, H = 40;
  const node = (id) => {
    const n = DAG_NODES[id];
    const c = DAG_KIND_COLOR[n.kind];
    const on = hi.size === 0 || hi.has(id);
    return `<g class="dag-node" data-dag="${id}" style="cursor:pointer">
      <rect x="${n.x}" y="${n.y}" width="${W}" height="${H}" rx="7"
        fill="${on ? c + '26' : 'var(--surface)'}" stroke="${on ? c : 'var(--border)'}" stroke-width="${on ? 2.2 : 1.1}" opacity="${on ? 1 : 0.4}"/>
      <text x="${n.x + W / 2}" y="${n.y + H / 2 + 4}" text-anchor="middle" font-family="JetBrains Mono,monospace"
        font-size="10.5" fill="${on ? c : 'var(--text-3)'}" font-weight="${on ? 700 : 400}">${n.label}</text></g>`;
  };
  const edge = ([a, b]) => {
    const A = DAG_NODES[a], B = DAG_NODES[b];
    const x1 = A.x + W, y1 = A.y + H / 2, x2 = B.x, y2 = B.y + H / 2;
    const on = hi.size === 0 || (hi.has(a) && hi.has(b));
    const mx = (x1 + x2) / 2;
    return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none"
      stroke="${on ? 'var(--accent)' : 'var(--border)'}" stroke-width="${on ? 2 : 1.1}" opacity="${on ? 0.9 : 0.35}" marker-end="url(#dagarr)"/>`;
  };
  return `<div class="detail-section"><h3>The project DAG</h3>
    <div class="dag-wrap"><svg id="prod-dag-svg" viewBox="0 0 790 350" width="100%" style="max-width:790px">
      <defs><marker id="dagarr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="var(--text-3)"/></marker></defs>
      ${DAG_EDGES.map(edge).join('')}${Object.keys(DAG_NODES).map(node).join('')}
    </svg></div>
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
