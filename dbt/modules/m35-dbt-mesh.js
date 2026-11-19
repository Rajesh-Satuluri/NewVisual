// M35 · dbt Mesh — cross-project refs, access & contracts
// Big dbt estates split into many projects (one team, one project) that still
// share models. dbt Mesh is how: a downstream project does ref('project','model')
// to a model another project marked access: public. The DAG below lets you flip
// one model's access level and watch cross-project refs resolve — or break.
//
// Nothing is executed; the compile result (resolve vs. error) is DERIVED from the
// access rule you pick, and the error text mirrors what dbt parse actually emits.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Three projects, one shared platform ──────────────────────────────────────
const PROJECT_COLOR = { platform: '#3B82F6', finance: '#10B981', marketing: '#A855F7' };
const PROJECTS = [
  { id: 'platform',  label: 'platform',  desc: 'the shared data platform — owns the governed core models' },
  { id: 'finance',   label: 'finance',   desc: 'consumes platform models to build finance marts' },
  { id: 'marketing', label: 'marketing', desc: 'consumes platform models to build marketing marts' },
];

// positions are top-left of a 160×44 box on a 660×290 canvas.
const NODES = {
  stg_orders:    { label: 'stg_orders',       project: 'platform',  x: 40,  y: 44,  access: null,     toggle: false },
  fct_orders:    { label: 'fct_orders',        project: 'platform',  x: 40,  y: 128, access: 'public', toggle: true  },
  dim_customers: { label: 'dim_customers',     project: 'platform',  x: 40,  y: 212, access: 'public', toggle: false },
  fct_revenue:   { label: 'fct_revenue',       project: 'finance',   x: 440, y: 60,  access: null,     toggle: false },
  campaign_roi:  { label: 'fct_campaign_roi',  project: 'marketing', x: 440, y: 200, access: null,     toggle: false },
};
// [from, to, crossProject]
const EDGES = [
  ['stg_orders',   'fct_orders',  false],
  ['fct_orders',   'fct_revenue', true],
  ['fct_orders',   'campaign_roi', true],
  ['dim_customers','campaign_roi', true],
];

// group bounding boxes (drawn behind the nodes)
const GROUPS = [
  { project: 'platform',  x: 26,  y: 26,  w: 188, h: 258 },
  { project: 'finance',   x: 426, y: 42,  w: 208, h: 72  },
  { project: 'marketing', x: 426, y: 182, w: 208, h: 72  },
];

const ACCESS = [
  { id: 'public',    label: 'public',    desc: 'Referenceable from <strong>any</strong> project. The only level that allows a cross-project <code>ref</code>.' },
  { id: 'protected', label: 'protected', desc: 'Referenceable only from <strong>within the same project</strong> (the default). Cross-project refs are rejected at parse time.' },
  { id: 'private',   label: 'private',   desc: 'Referenceable only from the <strong>same group</strong>. The tightest boundary — not even other models in the same project (outside the group) can ref it.' },
];

// A cross-project edge resolves only when the producing model is public. For the
// toggle node (fct_orders) the live value comes from the picker; other producers
// (dim_customers) use their fixed access, so their edge is always fine.
const crossOk = (fromId, access) => {
  const n = NODES[fromId];
  const live = n.toggle ? access : n.access;
  return live === 'public';
};

const esc2 = esc;
const consumersOf = id => EDGES.filter(e => e[0] === id && e[2]).map(e => e[1]);

function compileError(fromId, toId, access) {
  const fromProj = NODES[fromId].project, toProj = NODES[toId].project;
  return `Parsing Error
  Node model.${toProj}.${toId} attempted to reference
  node model.${fromProj}.${fromId}, which is not allowed because
  the referenced node is not accessible (access: ${access}).

  Only models with access: public can be referenced across projects.`;
}

const IQ = [
  {
    q: 'What is dbt Mesh, and what problem does it solve?',
    a: `dbt Mesh is the pattern of splitting one giant dbt project into <strong>multiple projects</strong> — typically one per team or domain — that still share models through governed interfaces. As a monolith grows past a few hundred models, every team waits on one CI run, one release, one <code>dbt_project.yml</code>, and ownership blurs. Mesh lets each team own, test, and deploy its <strong>own</strong> project on its own cadence, while a downstream project consumes an upstream one via a <strong>cross-project <code>ref</code></strong> — <code>ref('platform', 'fct_orders')</code> — but only for models the upstream team deliberately exposed as <code>access: public</code>.`,
    tip: 'Frame it as "domain ownership with governed seams": many projects, explicit public interfaces, independent deploys — not one shared monolith.',
  },
  {
    q: 'Explain the three access levels. Which one allows a cross-project ref?',
    a: `<ul>
      <li><code>public</code> — referenceable from <strong>any</strong> project. This is the <strong>only</strong> level that permits a cross-project <code>ref</code>. It is a deliberate commitment: you are promising stability to downstream teams.</li>
      <li><code>protected</code> — the <strong>default</strong>. Referenceable only within the <em>same</em> project. Another project that tries to <code>ref</code> it fails at parse time.</li>
      <li><code>private</code> — referenceable only within the <strong>same group</strong>. The tightest scope; used for intermediate models you never want anyone — even your own project, outside the group — to depend on.</li>
    </ul>
    So only <code>public</code> crosses a project boundary.`,
    tip: 'Say "protected is the default, public is opt-in" — it shows you know models are private-by-default across projects, which is the safe design.',
  },
  {
    q: 'Why do you need contracts and model versions once you go public?',
    a: `A <code>public</code> model is an <strong>API</strong> other teams build on, so it needs the guarantees of an API. A <strong>contract</strong> (<code>contract: { enforced: true }</code>) pins the model's column names, data types, and constraints — if a change would break the declared shape, the build fails <em>before</em> it ships, instead of silently breaking every downstream project. <strong>Versions</strong> let you evolve that contract without a flag day: publish <code>fct_orders</code> <code>v2</code> alongside <code>v1</code>, set a <code>deprecation_date</code> on <code>v1</code>, and let consumers migrate with <code>ref('platform', 'fct_orders', v=2)</code> on their own schedule.`,
    tip: 'The senior point: public = a promise; contracts enforce the promise, versions let you change it without breaking consumers overnight.',
  },
  {
    q: 'A model is private. A model in the same project refs it and dbt errors. Why?',
    a: `<code>private</code> is scoped to the <strong>group</strong>, not the project. A model's group is set via its <code>group:</code> config (groups are declared under <code>groups:</code> with an owner). If the referencing model is in a <em>different</em> group — even inside the same project — the <code>ref</code> is rejected. Fix it by either moving the consumer into the same group, or widening the producer to <code>protected</code> (same project) or <code>public</code> (any project). It is a reminder that access is about <strong>groups and projects</strong>, not folders.`,
    tip: 'Most people think private = "this project only". The precise answer is "this group only" — that distinction is the trap in the question.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M35 · Modern dbt',
    title: 'dbt Mesh — Multi-Project Lineage',
    subtitle: 'Many projects, one governed graph. Flip a model’s access level and watch cross-project refs resolve — or break at parse time.',
    tabs: [
      { id: 'mesh',  label: '🕸️ Mesh DAG' },
      { id: 'mech',  label: '📋 Mesh mechanics' },
      { id: 'iq',    label: '🎯 Interview Q&A' },
    ],
  });

  buildMesh(container);
  buildMech(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function nodeSvg(id, access) {
  const n = NODES[id];
  const c = PROJECT_COLOR[n.project];
  const isToggle = n.toggle;
  const acc = isToggle ? access : n.access;
  return `
    <g class="dag-node" data-node="${id}" style="cursor:${isToggle ? 'pointer' : 'default'}">
      <rect x="${n.x}" y="${n.y}" width="160" height="44" rx="8"
            fill="${c}1f" stroke="${c}" stroke-width="${isToggle ? 2.5 : 1.4}"
            ${isToggle ? 'stroke-dasharray="0"' : ''}/>
      <text x="${n.x + 80}" y="${n.y + 20}" text-anchor="middle"
            font-family="JetBrains Mono, monospace" font-size="11.5"
            fill="${c}" font-weight="700">${n.label}</text>
      ${acc ? `<text x="${n.x + 80}" y="${n.y + 35}" text-anchor="middle"
            font-family="Inter, sans-serif" font-size="9"
            fill="var(--text-3)">access: ${acc}</text>` : ''}
      ${isToggle ? `<circle cx="${n.x + 150}" cy="${n.y + 10}" r="3.5" fill="var(--warn)"/>` : ''}
    </g>`;
}

function edgeSvg([a, b, cross], access) {
  const A = NODES[a], B = NODES[b];
  const x1 = A.x + 160, y1 = A.y + 22, x2 = B.x, y2 = B.y + 22;
  const broken = cross && !crossOk(a, access);
  const mx = (x1 + x2) / 2;
  const color = broken ? '#EF4444' : (cross ? 'var(--accent)' : 'var(--border)');
  return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"
    fill="none" stroke="${color}" stroke-width="${broken ? 2.6 : (cross ? 2.4 : 1.4)}"
    stroke-dasharray="${broken ? '8 5' : '0'}" opacity="${broken ? 1 : (cross ? 0.9 : 0.5)}"
    marker-end="url(#m35arrow${broken ? 'X' : ''})"/>`;
}

function groupSvg(g) {
  const c = PROJECT_COLOR[g.project];
  return `
    <rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12"
          fill="${c}0d" stroke="${c}" stroke-width="1" stroke-dasharray="4 4" opacity="0.55"/>
    <text x="${g.x + 10}" y="${g.y + 16}" font-family="Inter, sans-serif" font-size="11"
          font-weight="700" fill="${c}">📦 ${g.project}</text>`;
}

function buildMesh(container) {
  const tab = container.querySelector('#tab-mesh');
  let access = 'public';

  tab.innerHTML = `
    <p class="lab-intro">Three projects share one graph. <code>finance</code> and <code>marketing</code> each do a
      <strong>cross-project <code>ref</code></strong> into <code>platform</code>. Flip the access level of
      <strong><code>fct_orders</code></strong> (the model with the ● marker) and watch its cross-project edges
      resolve or break. <code>dim_customers</code> stays <code>public</code>, so its edge never breaks.</p>

    <div class="mesh-legend">
      ${PROJECTS.map(p => `<span class="mesh-leg"><span class="mesh-dot" style="background:${PROJECT_COLOR[p.id]}"></span>${p.label}</span>`).join('')}
    </div>

    <div class="sl-pickgroup">
      <div class="sl-pick-label"><code>fct_orders</code> access level</div>
      <div class="lab-picker" id="m35-access">
        ${ACCESS.map((a, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-acc="${a.id}">${a.label}</button>`).join('')}
      </div>
    </div>

    <div class="dag-wrap">
      <svg id="m35-svg" viewBox="0 0 660 290" width="100%" style="max-width:660px">
        <defs>
          <marker id="m35arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>
          <marker id="m35arrowX" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#EF4444"/></marker>
        </defs>
      </svg>
    </div>

    <div class="dag-readout" id="m35-readout"></div>
  `;

  const svg = tab.querySelector('#m35-svg');
  const readout = tab.querySelector('#m35-readout');
  const defsHtml = svg.innerHTML;

  function render() {
    svg.innerHTML = defsHtml
      + GROUPS.map(groupSvg).join('')
      + EDGES.map(e => edgeSvg(e, access)).join('')
      + Object.keys(NODES).map(id => nodeSvg(id, access)).join('');

    const consumers = consumersOf('fct_orders');
    const ok = access === 'public';
    const accDef = ACCESS.find(a => a.id === access);

    const rows = consumers.map(c => {
      const good = crossOk('fct_orders', access);
      return good
        ? `<div class="mesh-res mesh-ok">✓ <code>model.${NODES[c].project}.${c}</code> resolves <code>ref('platform','fct_orders')</code></div>`
        : `<div class="mesh-res mesh-err">✗ <code>model.${NODES[c].project}.${c}</code> — parse error</div>`;
    }).join('');

    readout.innerHTML = `
      <div class="dag-ro-head">
        <span class="dag-ro-sel">fct_orders · access: ${access}</span>
        <span class="dag-ro-count" style="color:${ok ? 'var(--accent)' : '#EF4444'}">
          ${ok ? consumers.length + ' cross-project ref(s) OK' : consumers.length + ' cross-project ref(s) BROKEN'}</span>
      </div>
      <div class="dag-ro-desc">${accDef.desc}</div>
      <div class="mesh-reslist">${rows}</div>
      ${ok ? '' : `
        <div class="sl-step" style="margin-top:10px"><span class="sl-step-n" style="background:#EF4444">!</span>
          What <code>dbt parse</code> emits <span class="sl-illus">illustrative — mirrors real dbt output</span></div>
        <div class="code-block" data-lang="bash">${esc2(compileError('fct_orders', consumers[0], access))}</div>`}
    `;
    injectCodeEnhancements(readout);
  }

  tab.querySelector('#m35-access').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip'); if (!chip) return;
    access = chip.dataset.acc;
    tab.querySelectorAll('#m35-access .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render();
  });
  // clicking the toggle node cycles the access level too
  svg.addEventListener('click', e => {
    const g = e.target.closest('[data-node]');
    if (!g || g.dataset.node !== 'fct_orders') return;
    const order = ACCESS.map(a => a.id);
    access = order[(order.indexOf(access) + 1) % order.length];
    tab.querySelectorAll('#m35-access .lab-chip').forEach(c => c.classList.toggle('active', c.dataset.acc === access));
    render();
  });

  render();
}

const CROSS_REF_YAML = `# platform/models/marts/fct_orders.yml
models:
  - name: fct_orders
    access: public              # ← the opt-in that allows cross-project refs
    config:
      contract:
        enforced: true          # pin the shape downstream teams depend on
    columns:
      - name: order_id
        data_type: integer
        constraints:
          - type: not_null
      - name: order_total
        data_type: numeric`;

const CROSS_REF_SQL = `-- finance/models/marts/fct_revenue.sql
-- a cross-project ref: ref('<project>', '<model>')
select
    order_id,
    sum(order_total) as revenue
from {{ ref('platform', 'fct_orders') }}
group by 1`;

const VERSION_YAML = `# platform exposes a versioned public interface
models:
  - name: fct_orders
    latest_version: 2
    access: public
    config:
      contract: { enforced: true }
    versions:
      - v: 1
        deprecation_date: 2026-03-01   # consumers get a warning + a deadline
      - v: 2                            # new shape lives alongside v1

# a downstream project pins a version:
#   {{ ref('platform', 'fct_orders', v=1) }}`;

const DEPENDS_YML = `# finance/dependencies.yml — declare the upstream project
projects:
  - name: platform`;

function buildMech(container) {
  container.querySelector('#tab-mech').innerHTML = `
    <div class="detail-section">
      <h3>How a cross-project ref is wired</h3>
      <div class="pipe" style="margin-bottom:16px">
        <div class="pipe-stage"><div class="pipe-ic">📦</div><div class="pipe-name">platform</div><div class="pipe-sub">marks fct_orders access: public</div></div>
        <div class="pipe-stage"><div class="pipe-ic">📄</div><div class="pipe-name">dependencies.yml</div><div class="pipe-sub">finance declares platform</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🔗</div><div class="pipe-name">ref('platform','fct_orders')</div><div class="pipe-sub">two-arg cross ref</div></div>
        <div class="pipe-stage"><div class="pipe-ic">✅</div><div class="pipe-name">resolved</div><div class="pipe-sub">via the public manifest</div></div>
      </div>
      <p>The downstream project declares the upstream in <code>dependencies.yml</code>, then uses the
        <strong>two-argument <code>ref</code></strong>: project first, model second. dbt resolves it through the
        upstream project's <strong>public manifest</strong> — so you never copy SQL or re-model shared tables.</p>
      <div class="code-block" data-lang="yaml">${esc(DEPENDS_YML)}</div>
      <div class="code-block" data-lang="sql">${esc(CROSS_REF_SQL)}</div>
    </div>

    <div class="detail-section">
      <h3>Access levels — the project boundary</h3>
      <div class="cheat-grid">
        <div class="cheat-card"><div class="cheat-head">🔓 Who can ref it</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">public</div><div class="cheat-v">any project (cross-project)</div></div>
          <div class="cheat-row"><div class="cheat-k">protected <em>(default)</em></div><div class="cheat-v">same project only</div></div>
          <div class="cheat-row"><div class="cheat-k">private</div><div class="cheat-v">same group only</div></div>
        </div></div>
        <div class="cheat-card"><div class="cheat-head">🧰 The governance toolkit</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Expose a model</div><div class="cheat-v">access: public</div></div>
          <div class="cheat-row"><div class="cheat-k">Pin its shape</div><div class="cheat-v">contract: { enforced: true }</div></div>
          <div class="cheat-row"><div class="cheat-k">Evolve safely</div><div class="cheat-v">versions + deprecation_date</div></div>
          <div class="cheat-row"><div class="cheat-k">Own a domain</div><div class="cheat-v">groups: with an owner</div></div>
        </div></div>
      </div>
    </div>

    <div class="detail-section">
      <h3>A public model is an API — give it a contract</h3>
      <p>The moment another team refs your model, its shape is a promise. A <strong>contract</strong> makes dbt
        fail the build if a change would break the declared columns, types, or constraints — before it ships.</p>
      <div class="code-block" data-lang="yaml">${esc(CROSS_REF_YAML)}</div>
    </div>

    <div class="detail-section">
      <h3>Versions — change the contract without a flag day</h3>
      <p>Publish a new version beside the old one, set a <code>deprecation_date</code>, and let each consumer
        migrate on its own schedule by pinning <code>v=</code> in its <code>ref</code>.</p>
      <div class="code-block" data-lang="yaml">${esc(VERSION_YAML)}</div>
    </div>

    <div class="detail-section">
      <p style="padding:12px 14px;background:var(--surface-2);border-left:3px solid var(--accent);border-radius:8px;font-size:14px;margin:0">
        <strong>🧠 First principles —</strong> a cross-project <code>ref</code> is still just graph resolution —
        dbt reads the upstream project's <strong>manifest</strong> and links the node, exactly like a normal
        <code>ref</code>, except an <code>access</code> gate sits in front. Mesh adds no new runtime; it adds
        <strong>governance</strong> (access), <strong>guarantees</strong> (contracts), and <strong>evolution</strong>
        (versions) so many teams can share one graph without stepping on each other.
        Available in dbt Core 1.6+ (access, contracts, versions, cross-project refs via a shared manifest;
        dbt Cloud adds discovery across projects). <a href="#m15" style="color:var(--accent);font-weight:600">See the single-project DAG →</a>
      </p>
    </div>
  `;
}
