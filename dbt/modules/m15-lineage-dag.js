import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'A healthcare company wants to know which dashboards would break if they rename a column in their patient staging model. How do you answer this question in dbt?',
    a: `<strong>Immediate answer using dbt's DAG:</strong>
    <ol>
      <li><strong>dbt ls command:</strong> <code>dbt ls --select stg_patients+</code> — the <code>+</code> suffix means "and all downstream models." This returns every model that directly or transitively depends on stg_patients.</li>
      <li><strong>dbt docs / lineage explorer:</strong> In dbt Cloud, open the lineage graph, click stg_patients, expand downstream. You get a visual tree of every model and dashboard affected.</li>
      <li><strong>Column-level lineage:</strong> For column-specific impact, tools like OpenLineage, Atlan, or dbt Cloud's column-level lineage (enterprise) trace which specific columns flow to which downstream metrics. A patient_id rename would only break models that reference patient_id — not all stg_patients dependents.</li>
    </ol>
    <strong>Prevention:</strong>
    <ul>
      <li>Add a dbt source contract on the column name. A CI check fails if the source system renames it before downstream models are updated.</li>
      <li>Use an alias in staging: <code>patient_id AS patient_id</code>. This creates an explicit canonical name; only the staging model breaks on a source rename.</li>
    </ul>`,
    tip: 'The <code>dbt ls --select model+</code> command is the most direct answer to "what would break?" Most candidates describe the visual lineage UI. Knowing the command shows you can automate impact analysis in CI.',
  },
  {
    q: 'What is the difference between model-level and column-level lineage? When do you need column-level?',
    a: `<strong>Model-level lineage:</strong> The DAG showing which models depend on which other models. Available in every dbt project via the manifest.json file. Answers: "If I change stg_orders, which models rerun?"
    <br><br>
    <strong>Column-level lineage:</strong> Tracks which specific columns from upstream models flow into which columns of downstream models. Requires tools beyond base dbt — OpenLineage, Atlan, dbt Cloud Enterprise.
    <br><br>
    <strong>When you need column-level:</strong>
    <ul>
      <li><strong>PII tracking:</strong> "Which dashboards display customer_email?" — GDPR deletion requires finding every output that contains the PII. Model-level lineage can't tell you which columns; column-level can.</li>
      <li><strong>Precise impact analysis:</strong> Renaming <code>order_total</code> to <code>total_amount</code> affects 4 models — but only 2 of them actually reference that column. Column-level lineage identifies the 2; model-level would flag all 4 as "maybe impacted."</li>
      <li><strong>Metric provenance:</strong> "The CFO asks where this number comes from." You need to trace the exact column chain from the dashboard metric back through every intermediate transformation to the raw source table.</li>
    </ul>`,
    tip: 'The GDPR/PII use case is what makes column-level lineage a compliance requirement, not a nice-to-have. In healthcare and finance, not knowing which dashboards display a given PII column is a regulatory risk.',
  },
  {
    q: 'How does dbt\'s manifest.json enable programmatic lineage analysis?',
    a: `<strong>manifest.json</strong> is a JSON artifact dbt generates during <code>dbt compile</code> or <code>dbt run</code>. It contains the complete compiled DAG: every node (model, test, source, snapshot), every edge (dependency), and every node's metadata (config, columns, description).
    <br><br>
    <strong>What you can do with it programmatically:</strong>
    <ul>
      <li><strong>Dependency traversal:</strong> Parse <code>manifest["nodes"]</code> and <code>["parent_map"]</code> to find all nodes downstream of a given model — the same logic <code>dbt ls --select model+</code> uses internally.</li>
      <li><strong>CI impact analysis:</strong> Compare current PR's manifest to production manifest (dbt's state:modified+ uses this). Find all changed models and their transitive dependents — only run and test those.</li>
      <li><strong>Documentation completeness check:</strong> Count models with empty descriptions in manifest["nodes"]. Fail CI if more than 10% of columns are undocumented.</li>
      <li><strong>Custom data catalog:</strong> Export manifest.json to Elasticsearch or a data catalog tool. Makes your dbt docs searchable from other internal tools.</li>
    </ul>
    <strong>Location:</strong> <code>target/manifest.json</code> after any dbt command. In dbt Cloud, stored and versioned automatically per job run.`,
    tip: 'The CI documentation completeness check from manifest.json is a signal of a mature team. "We fail CI if column documentation coverage drops below 90%" is an answer that impresses data platform engineers.',
  },
  {
    q: 'What exactly makes the dbt graph a *DAG*, and what happens if you accidentally create a cycle?',
    a: `<strong>DAG = Directed Acyclic Graph.</strong> Three properties, each earning its letter:
    <ul>
      <li><strong>Directed:</strong> every edge has a direction — <code>A → B</code> means "B depends on A" (B's SQL contains <code>{{ ref('A') }}</code>). Direction is what lets dbt distinguish upstream from downstream.</li>
      <li><strong>Acyclic:</strong> no node can reach itself by following edges. This is what makes a build <em>possible</em> — dbt topologically sorts the graph so every model runs only after its parents.</li>
      <li><strong>Graph:</strong> many-to-many — a model can have several parents and several children.</li>
    </ul>
    <strong>If you create a cycle</strong> — e.g. <code>model_a</code> refs <code>model_b</code> and <code>model_b</code> refs <code>model_a</code> — dbt cannot produce a valid run order (which do you build first?). It fails fast at parse time with <code>Found a cycle: model.project.model_a --&gt; model.project.model_b --&gt; model.project.model_a</code>. It never reaches the warehouse. The fix is to break the cycle: extract the shared logic into a third upstream model both can ref, or collapse the two into one.`,
    tip: 'Say "cycles fail at parse, before any SQL runs." Candidates who think it is a runtime/warehouse error reveal they have never actually hit one.',
  },
  {
    q: 'dbt says it runs independent models "in parallel." What decides the order, and what controls the parallelism?',
    a: `dbt performs a <strong>topological sort</strong> of the DAG: a linear ordering where every node appears after all its parents. Many valid orderings exist, so dbt does not run strictly one-at-a-time — it runs any node whose parents have all finished.
    <br><br>
    <strong>Ordering</strong> is purely graph-driven: <code>stg_orders</code> and <code>stg_customers</code> have no dependency between them, so they are eligible at the same time; <code>fct_orders</code> waits until both finish.
    <br><br>
    <strong>Parallelism</strong> is capped by <code>threads</code> (set in <code>profiles.yml</code> or <code>--threads</code>). With <code>threads: 4</code>, dbt keeps up to 4 eligible nodes executing at once. More threads = more concurrent warehouse queries = faster runs but heavier warehouse load (and cost). The DAG shape also limits it: a long dependency chain can't be parallelized no matter how many threads you have.`,
    tip: 'Two levers: "the DAG decides what *can* run together; threads decides how many *do*." Mentioning that a narrow/deep DAG caps parallelism regardless of threads is a senior-level nuance.',
  },
  {
    q: 'How do ephemeral models and sources appear in the DAG differently from regular models?',
    a: `Both are first-class DAG nodes for <em>ordering and lineage</em>, but neither produces its own warehouse relation:
    <ul>
      <li><strong>Sources</strong> are the DAG's entry points — nodes with no parents. They represent relations dbt did <em>not</em> create (raw loaded tables). <code>source()</code> declares the dependency so freshness, tests, and lineage work, but dbt never builds a source.</li>
      <li><strong>Ephemeral models</strong> (<code>materialized='ephemeral'</code>) are <em>inlined</em> as CTEs into every downstream model that refs them, rather than being built as their own view/table. In the DAG they still sit between their parents and children for ordering, but they create no object you can query directly — and they never appear in <code>dbt run</code>'s executed-node list.</li>
    </ul>
    So the DAG has more nodes than the warehouse has objects: sources (external) and ephemeral models (inlined) are graph-only.`,
    tip: 'The line "the DAG has more nodes than the warehouse has objects" crisply captures why lineage and physical relations are not 1:1 — a distinction interviewers probe.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M15 · Core Features',
    title: 'Lineage & DAG',
    subtitle: 'Click any node. Instantly see everything upstream and downstream. Zero SQL archaeology.',
    tabs: [
      { id: 'visual', label: '🎬 Interactive DAG' },
      { id: 'lab',    label: '🔬 Lab · Wire the DAG' },
      { id: 'detail', label: '📋 How Lineage Works' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildLab(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  const cv = document.createElement('canvas');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = 820 * DPR; cv.height = 420 * DPR;
  cv.style.cssText = 'width:100%;max-width:820px;cursor:pointer';
  wrap.appendChild(cv);

  const ctrl = document.createElement('div');
  ctrl.className = 'canvas-controls';
  ctrl.innerHTML = `
    <button class="ctrl-btn" id="m15-clear">✕ Clear Selection</button>
    <span class="ctrl-label" id="m15-lbl">Click any node to explore its upstream and downstream lineage</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  ctx.scale(DPR, DPR);
  const W = 820, H = 420;

  // Nodes: id, x, y, label, color, layer
  const NODES = [
    { id: 'raw_patients',   x: 65,  y: 100, label: 'raw_patients',   color: '#4B5E78', layer: 0 },
    { id: 'raw_visits',     x: 65,  y: 210, label: 'raw_visits',     color: '#4B5E78', layer: 0 },
    { id: 'raw_diagnoses',  x: 65,  y: 320, label: 'raw_diagnoses',  color: '#4B5E78', layer: 0 },
    { id: 'stg_patients',   x: 235, y: 100, label: 'stg_patients',   color: '#3B82F6', layer: 1 },
    { id: 'stg_visits',     x: 235, y: 210, label: 'stg_visits',     color: '#3B82F6', layer: 1 },
    { id: 'stg_diagnoses',  x: 235, y: 320, label: 'stg_diagnoses',  color: '#3B82F6', layer: 1 },
    { id: 'int_pat_visits', x: 420, y: 155, label: 'int_pat_visits', color: '#8B5CF6', layer: 2 },
    { id: 'int_outcomes',   x: 420, y: 290, label: 'int_outcomes',   color: '#8B5CF6', layer: 2 },
    { id: 'fct_visits',     x: 600, y: 120, label: 'fct_visits',     color: '#10B981', layer: 3 },
    { id: 'fct_outcomes',   x: 600, y: 250, label: 'fct_outcomes',   color: '#10B981', layer: 3 },
    { id: 'fct_patients',   x: 600, y: 360, label: 'fct_patients',   color: '#10B981', layer: 3 },
    { id: 'bi_ops',         x: 762, y: 120, label: 'Ops Dash',       color: '#F59E0B', layer: 4 },
    { id: 'bi_quality',     x: 762, y: 250, label: 'Quality Dash',   color: '#F59E0B', layer: 4 },
    { id: 'bi_patients',    x: 762, y: 360, label: 'Patient Portal', color: '#F59E0B', layer: 4 },
  ];

  const EDGES = [
    ['raw_patients',   'stg_patients'],
    ['raw_visits',     'stg_visits'],
    ['raw_diagnoses',  'stg_diagnoses'],
    ['stg_patients',   'int_pat_visits'],
    ['stg_visits',     'int_pat_visits'],
    ['stg_visits',     'int_outcomes'],
    ['stg_diagnoses',  'int_outcomes'],
    ['stg_patients',   'fct_patients'],
    ['int_pat_visits', 'fct_visits'],
    ['int_pat_visits', 'fct_outcomes'],
    ['int_outcomes',   'fct_outcomes'],
    ['fct_visits',     'bi_ops'],
    ['fct_visits',     'bi_quality'],
    ['fct_outcomes',   'bi_quality'],
    ['fct_patients',   'bi_patients'],
  ];

  // Build adjacency maps
  const downstream = {};
  const upstream = {};
  NODES.forEach(n => { downstream[n.id] = []; upstream[n.id] = []; });
  EDGES.forEach(([a, b]) => { downstream[a].push(b); upstream[b].push(a); });

  function getReachable(id, adj) {
    const visited = new Set();
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      (adj[cur] || []).forEach(n => queue.push(n));
    }
    visited.delete(id);
    return visited;
  }

  let selected = null;
  let upSet = new Set(), downSet = new Set();
  let hovered = null;

  function nodeAt(mx, my) {
    const scaleX = W / cv.getBoundingClientRect().width;
    const scaleY = H / cv.getBoundingClientRect().height;
    const cx = mx * scaleX, cy = my * scaleY;
    return NODES.find(n => Math.hypot(cx - n.x, cy - n.y) < 32) || null;
  }

  cv.addEventListener('click', e => {
    const rect = cv.getBoundingClientRect();
    const n = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (n) {
      if (selected === n.id) { selected = null; upSet.clear(); downSet.clear(); }
      else {
        selected = n.id;
        upSet   = getReachable(n.id, upstream);
        downSet = getReachable(n.id, downstream);
      }
      updateLabel();
    }
  });

  cv.addEventListener('mousemove', e => {
    const rect = cv.getBoundingClientRect();
    const n = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
    hovered = n ? n.id : null;
    cv.style.cursor = n ? 'pointer' : 'default';
  });

  ctrl.querySelector('#m15-clear').addEventListener('click', () => {
    selected = null; upSet.clear(); downSet.clear(); updateLabel();
  });

  function updateLabel() {
    const lbl = container.querySelector('#m15-lbl');
    if (!selected) { lbl.textContent = 'Click any node to explore its upstream and downstream lineage'; return; }
    const n = NODES.find(n => n.id === selected);
    lbl.textContent = `${n.label}  ·  ${upSet.size} upstream  ·  ${downSet.size} downstream`;
  }

  function rr(ctx, x, y, w, h, r, fill, stroke, sw) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw||1.5; ctx.stroke(); }
  }

  let raf = null, lastT = 0;

  function draw(ts) {
    lastT = ts;

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Layer labels
    ['SOURCES', 'STAGING', 'INTERMEDIATE', 'MARTS', 'BI TOOLS'].forEach((lbl, i) => {
      ctx.fillStyle = '#2A3550'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(lbl, [65, 235, 420, 600, 762][i], 20);
    });

    // Edges
    EDGES.forEach(([a, b]) => {
      const na = NODES.find(n => n.id === a);
      const nb = NODES.find(n => n.id === b);

      let col = '#1E2D43';
      if (selected) {
        const isDown = selected === a && downSet.has(b);
        const isUp   = selected === b && upSet.has(a);
        if (nb.id === selected) col = '#3B82F666';      // edge into selected
        else if (na.id === selected) col = '#FF694B88'; // edge out of selected
        else if (downSet.has(a) && downSet.has(b)) col = '#FF694B44'; // downstream path
        else if (upSet.has(a)   && upSet.has(b))   col = '#3B82F644'; // upstream path
        else if ((upSet.has(a) || upSet.has(b)) || (downSet.has(a) || downSet.has(b))) col = '#1E2D43';
        else col = '#1E2D4322';
      }

      ctx.beginPath(); ctx.moveTo(na.x + 54, na.y); ctx.lineTo(nb.x - 54, nb.y);
      ctx.strokeStyle = col; ctx.lineWidth = col === '#1E2D43' ? 1 : 1.5;
      ctx.stroke();

      // Arrow head
      const dx = nb.x - 54 - (na.x + 54), dy = nb.y - na.y;
      const len = Math.hypot(dx, dy);
      if (len > 2) {
        const ux = dx/len, uy = dy/len;
        const ax = nb.x - 54, ay = nb.y;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax-ux*8-uy*4, ay-uy*8+ux*4); ctx.lineTo(ax-ux*8+uy*4, ay-uy*8-ux*4);
        ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      }
    });

    // Nodes
    NODES.forEach(n => {
      let opacity = 1, borderCol = n.color + '88', bgCol = '#131D2E', borderW = 1.5;
      let labelCol = n.color;

      if (selected) {
        if (n.id === selected) {
          bgCol = n.color + '30'; borderCol = n.color; borderW = 2.5; labelCol = n.color;
        } else if (upSet.has(n.id)) {
          bgCol = '#0D1F3C'; borderCol = '#3B82F6'; borderW = 1.8; labelCol = '#3B82F6';
        } else if (downSet.has(n.id)) {
          bgCol = '#1A1008'; borderCol = '#FF694B'; borderW = 1.8; labelCol = '#FF694B';
        } else {
          opacity = 0.25;
        }
      } else if (hovered === n.id) {
        bgCol = n.color + '20'; borderCol = n.color; borderW = 2;
      }

      ctx.save(); ctx.globalAlpha = opacity;
      rr(ctx, n.x-54, n.y-16, 108, 32, 6, bgCol, borderCol, borderW);

      // Label
      ctx.fillStyle = labelCol; ctx.font = 'bold 9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + 4);

      // Role indicator dot
      if (n.id === selected) {
        ctx.beginPath(); ctx.arc(n.x + 46, n.y - 8, 5, 0, Math.PI*2);
        ctx.fillStyle = n.color; ctx.fill();
      }
      ctx.restore();
    });

    // Legend
    if (selected) {
      const lx = 18, ly = H - 52;
      [['#3B82F6', 'Upstream (dependencies)'], ['#FF694B', 'Downstream (impacts)'], [NODES.find(n=>n.id===selected)?.color||'#fff', 'Selected node']].forEach(([col, label], i) => {
        ctx.fillStyle = col; ctx.fillRect(lx, ly + i*16 - 6, 10, 10);
        ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(label, lx + 14, ly + i*16 + 3);
      });
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Lab A · Wire the DAG ──────────────────────────────────────────────────────
// The learner connects models with ref()/source() by choosing each FROM/JOIN
// target. dbt builds its graph from exactly these calls — so as you wire, the
// DAG forms live, and wrong targets, hardcoded tables, missing refs and cycles
// are flagged the same way dbt would flag them at parse time. Pure local
// simulation of graph construction — no SQL is executed.
const LAB_SOURCES = [
  { id: 'src_customers', ref: `source('raw','customers')`, label: 'raw.customers' },
  { id: 'src_orders',    ref: `source('raw','orders')`,    label: 'raw.orders' },
  { id: 'src_payments',  ref: `source('raw','payments')`,  label: 'raw.payments' },
];
// Each model has one or more "slots" — a FROM/JOIN whose target you choose.
const LAB_MODELS = [
  { id: 'stg_customers', kind: 'stg', slots: [{ expect: 'src_customers', clause: 'from' }],
    tpl: 'select id as customer_id, name\nfrom §0§' },
  { id: 'stg_orders', kind: 'stg', slots: [{ expect: 'src_orders', clause: 'from' }],
    tpl: 'select id as order_id, user_id as customer_id, order_date, amount\nfrom §0§' },
  { id: 'stg_payments', kind: 'stg', slots: [{ expect: 'src_payments', clause: 'from' }],
    tpl: 'select order_id, amount as payment_amount\nfrom §0§' },
  { id: 'fct_orders', kind: 'fct', slots: [{ expect: 'stg_orders', clause: 'from' }, { expect: 'stg_payments', clause: 'join' }],
    tpl: 'select o.order_id, o.customer_id, o.amount, p.payment_amount\nfrom §0§ o\nleft join §1§ p on p.order_id = o.order_id' },
  { id: 'dim_customers', kind: 'dim', slots: [{ expect: 'stg_customers', clause: 'from' }, { expect: 'stg_orders', clause: 'join' }],
    tpl: 'select c.customer_id, c.name, count(o.order_id) as orders\nfrom §0§ c\nleft join §1§ o on o.customer_id = c.customer_id\ngroup by 1, 2' },
];
const LAB_KIND_COLOR = { source: '#4B5E78', stg: '#3B82F6', fct: '#FF694B', dim: '#10B981' };
const LAB_LAYER = { source: 0, stg: 1, fct: 2, dim: 2 };
const TOTAL_SLOTS = LAB_MODELS.reduce((s, m) => s + m.slots.length, 0);

function targetLabel(id) {
  if (id === '__hard__') return 'raw.orders (hardcoded)';
  const s = LAB_SOURCES.find(x => x.id === id);
  if (s) return s.ref;
  const m = LAB_MODELS.find(x => x.id === id);
  return m ? `ref('${m.id}')` : '';
}

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  // state: slot key `${modelId}.${i}` → target id ('' = unset)
  const state = {};
  LAB_MODELS.forEach(m => m.slots.forEach((_, i) => { state[`${m.id}.${i}`] = ''; }));

  const optionsFor = (modelId) => {
    const srcOpts = LAB_SOURCES.map(s => `<option value="${s.id}">${s.ref}</option>`).join('');
    const modOpts = LAB_MODELS.filter(m => m.id !== modelId)
      .map(m => `<option value="${m.id}">ref('${m.id}')</option>`).join('');
    return `<option value="">— choose target —</option>
      <optgroup label="Sources (raw tables)">${srcOpts}</optgroup>
      <optgroup label="Models (ref)">${modOpts}</optgroup>
      <option value="__hard__">raw.orders  (hardcoded, no ref)</option>`;
  };

  const modelCard = (m) => {
    // Swap each §i§ placeholder for a guard, escape the SQL, then inject the
    // real <select> markup (so the SQL text can never inject HTML).
    let sql = m.tpl;
    m.slots.forEach((_, i) => { sql = sql.replace(`§${i}§`, `\x01${i}\x01`); });
    let esc = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    m.slots.forEach((_, i) => {
      const sel = `<select class="cf-slot" data-key="${m.id}.${i}" aria-label="choose target">${optionsFor(m.id)}</select>`;
      esc = esc.replace(`\x01${i}\x01`, sel);
    });
    const c = LAB_KIND_COLOR[m.kind];
    return `
      <div class="cf-mcard">
        <div class="cf-mhead"><span class="cf-mdot" style="background:${c}"></span>
          <code>models/${m.kind === 'stg' ? 'staging' : 'marts'}/${m.id}.sql</code></div>
        <pre class="cf-msql">${esc}</pre>
      </div>`;
  };

  tab.innerHTML = `
    <div class="cf-lab">
      <div class="cf-lab-intro">
        <strong>Wire the project.</strong> Each model below has a <code>from</code>/<code>join</code> whose
        target you choose. dbt builds its DAG from exactly these <code>ref()</code> and <code>source()</code>
        calls — so as you pick, the graph on the right forms live. Hardcode a table instead of using
        <code>ref()</code> and watch the model fall out of the lineage.
        <span class="cf-sim">🧪 Local simulation of graph construction — no SQL runs.</span>
      </div>
      <div class="cf-lab-grid">
        <div class="cf-lab-left">${LAB_MODELS.map(modelCard).join('')}</div>
        <div class="cf-lab-right">
          <div class="cf-dag" id="m15lab-dag"></div>
          <div class="cf-readout" id="m15lab-readout"></div>
          <div class="cf-lab-actions">
            <button class="ctrl-btn" id="m15lab-check">✓ Check wiring</button>
            <button class="ctrl-btn" id="m15lab-solve">💡 Solve</button>
            <button class="ctrl-btn" id="m15lab-reset">↺ Reset</button>
          </div>
          <p class="cf-xlink">Want to practise <code>--select</code> graph operators on a finished DAG?
            See <a href="#m20">Module 20 · Selection Lab</a>.</p>
        </div>
      </div>
    </div>`;

  // ── derive + render ─────────────────────────────────────────────────────────
  function edges() {
    // target → model, per set slot that isn't hardcoded
    const es = [];
    LAB_MODELS.forEach(m => m.slots.forEach((_, i) => {
      const v = state[`${m.id}.${i}`];
      if (v && v !== '__hard__') es.push([v, m.id]);
    }));
    return es;
  }
  function hasCycle() {
    const adj = {}; edges().forEach(([a, b]) => { (adj[a] = adj[a] || []).push(b); });
    const WHITE = 0, GREY = 1, BLACK = 2; const color = {};
    const nodes = [...LAB_SOURCES, ...LAB_MODELS].map(n => n.id);
    nodes.forEach(n => color[n] = WHITE);
    let cyc = false;
    const dfs = (u) => {
      color[u] = GREY;
      (adj[u] || []).forEach(v => { if (color[v] === GREY) cyc = true; else if (color[v] === WHITE) dfs(v); });
      color[u] = BLACK;
    };
    nodes.forEach(n => { if (color[n] === WHITE) dfs(n); });
    return cyc;
  }

  function nodePos() {
    const pos = {};
    const byLayer = { 0: [], 1: [], 2: [] };
    [...LAB_SOURCES.map(s => ({ id: s.id, kind: 'source' })), ...LAB_MODELS].forEach(n => byLayer[LAB_LAYER[n.kind]].push(n.id));
    const X = { 0: 72, 1: 262, 2: 452 }, W = 540, H = 320;
    Object.entries(byLayer).forEach(([L, ids]) => {
      const gap = H / (ids.length + 1);
      ids.forEach((id, i) => { pos[id] = { x: X[L], y: Math.round(gap * (i + 1)) }; });
    });
    return { pos, W, H };
  }

  function renderDag(checked) {
    const { pos, W, H } = nodePos();
    const es = edges();
    const nodeOf = id => [...LAB_SOURCES.map(s => ({ id: s.id, kind: 'source', label: s.label })), ...LAB_MODELS.map(m => ({ id: m.id, kind: m.kind, label: m.id }))].find(n => n.id === id);
    const expectSet = new Set();
    LAB_MODELS.forEach(m => m.slots.forEach(s => expectSet.add(`${s.expect}>${m.id}`)));

    const edgeSvg = es.map(([a, b]) => {
      const pa = pos[a], pb = pos[b]; if (!pa || !pb) return '';
      const ok = expectSet.has(`${a}>${b}`);
      const col = checked ? (ok ? '#10B981' : '#F59E0B') : 'var(--text-3)';
      const x1 = pa.x + 60, y1 = pa.y, x2 = pb.x - 60, y2 = pb.y;
      const mx = (x1 + x2) / 2;
      return `<path d="M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none"
        stroke="${col}" stroke-width="2" marker-end="url(#m15lab-arr)" opacity="0.9"/>`;
    }).join('');

    // which models have an unset or hardcoded slot?
    const disconnected = new Set();
    LAB_MODELS.forEach(m => m.slots.forEach((_, i) => {
      const v = state[`${m.id}.${i}`]; if (!v || v === '__hard__') disconnected.add(m.id);
    }));

    const nodeSvg = [...LAB_SOURCES.map(s => s.id), ...LAB_MODELS.map(m => m.id)].map(id => {
      const n = nodeOf(id), p = pos[id], c = LAB_KIND_COLOR[n.kind];
      const warn = checked && disconnected.has(id);
      return `<g>
        <rect x="${p.x - 60}" y="${p.y - 18}" width="120" height="36" rx="7"
          fill="${c}22" stroke="${warn ? '#EF4444' : c}" stroke-width="${warn ? 2.4 : 1.4}"
          ${warn ? 'stroke-dasharray="5 3"' : ''}/>
        <text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-family="JetBrains Mono, monospace"
          font-size="10.5" fill="${warn ? '#EF4444' : c}" font-weight="600">${n.label}</text>
      </g>`;
    }).join('');

    const lbls = ['SOURCES', 'STAGING', 'MARTS'].map((t, i) =>
      `<text x="${[72, 262, 452][i]}" y="14" text-anchor="middle" font-size="9" fill="var(--text-3)" letter-spacing="1">${t}</text>`).join('');

    container.querySelector('#m15lab-dag').innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" role="img" aria-label="Project dependency graph derived from your ref and source choices">
        <defs><marker id="m15lab-arr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0 0 L7 3 L0 6 z" fill="var(--text-3)"/></marker></defs>
        ${lbls}${edgeSvg}${nodeSvg}
      </svg>`;
  }

  function renderReadout(checked) {
    const ro = container.querySelector('#m15lab-readout');
    if (!checked) {
      const set = Object.values(state).filter(v => v).length;
      ro.className = 'cf-readout';
      ro.innerHTML = `<span class="cf-ro-muted">${set} / ${TOTAL_SLOTS} targets chosen — press <strong>Check wiring</strong> when ready.</span>`;
      renderDag(false);
      return;
    }
    let correct = 0, wrong = [], missing = [], hard = [];
    LAB_MODELS.forEach(m => m.slots.forEach((s, i) => {
      const v = state[`${m.id}.${i}`];
      if (!v) missing.push(`${m.id} · ${s.clause}`);
      else if (v === '__hard__') hard.push(m.id);
      else if (v === s.expect) correct++;
      else wrong.push(`${m.id} · ${s.clause} → ${targetLabel(v)} (expected ${targetLabel(s.expect)})`);
    }));
    const cyc = hasCycle();
    const perfect = correct === TOTAL_SLOTS && !cyc;
    const msgs = [];
    if (cyc) msgs.push(`<div class="cf-ro-row err">⛔ <strong>Dependency cycle.</strong> dbt would fail at parse: a model can't (even transitively) ref itself. Break it with a shared upstream model.</div>`);
    missing.forEach(x => msgs.push(`<div class="cf-ro-row err">✕ <strong>Missing ref:</strong> ${x} has no target — this model can't resolve and won't join the graph.</div>`));
    hard.forEach(x => msgs.push(`<div class="cf-ro-row warn">⚠ <strong>Hardcoded table in ${x}.</strong> No <code>ref()</code> → no edge → dbt can't order it or track lineage. It also breaks across dev/prod schemas.</div>`));
    wrong.forEach(x => msgs.push(`<div class="cf-ro-row warn">↯ <strong>Wrong target:</strong> ${x}.</div>`));
    ro.className = `cf-readout ${perfect ? 'ok' : 'bad'}`;
    ro.innerHTML = `
      <div class="cf-ro-head">${perfect ? '✅' : '⚠️'} ${correct} / ${TOTAL_SLOTS} dependencies wired correctly</div>
      ${perfect ? `<div class="cf-ro-row ok">Every <code>ref()</code> resolves and the graph is acyclic. dbt could topologically sort this and build sources → staging → marts.</div>` : msgs.join('')}`;
    renderDag(true);
  }

  // ── events ──────────────────────────────────────────────────────────────────
  tab.addEventListener('change', e => {
    const sel = e.target.closest('.cf-slot'); if (!sel) return;
    state[sel.dataset.key] = sel.value;
    renderReadout(false);
  });
  container.querySelector('#m15lab-check').addEventListener('click', () => renderReadout(true));
  container.querySelector('#m15lab-reset').addEventListener('click', () => {
    Object.keys(state).forEach(k => state[k] = '');
    tab.querySelectorAll('.cf-slot').forEach(s => s.value = '');
    renderReadout(false);
  });
  container.querySelector('#m15lab-solve').addEventListener('click', () => {
    LAB_MODELS.forEach(m => m.slots.forEach((s, i) => { state[`${m.id}.${i}`] = s.expect; }));
    tab.querySelectorAll('.cf-slot').forEach(s => { s.value = state[s.dataset.key]; });
    renderReadout(true);
  });

  renderReadout(false);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>From invisible to explicit dependencies</h3>
      <p>In a pre-dbt world, SQL dependencies are invisible. You only discover them when something breaks. dbt's <code>ref()</code> function makes every dependency explicit, and dbt compiles these into a Directed Acyclic Graph (DAG) stored in <code>target/manifest.json</code>.</p>
      <p>This graph enables three questions that previously required hours of SQL archaeology:</p>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:var(--info)">
          <div class="info-card-title">Impact Analysis</div>
          <div class="info-card-tag" style="color:var(--info);background:color-mix(in srgb, var(--info) 13%, transparent)">Forward</div>
          <div class="info-card-body">"If I change stg_patients, what breaks?" — <code>dbt ls --select stg_patients+</code> returns every downstream model instantly. No Slack messages, no grep, no hoping you found everything.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--accent)">
          <div class="info-card-title">Root Cause</div>
          <div class="info-card-tag" style="color:var(--accent);background:color-mix(in srgb, var(--accent) 13%, transparent)">Backward</div>
          <div class="info-card-body">"This dashboard is wrong — where did the bad data enter?" — follow the DAG upstream from the broken model until you find the node where data diverged from expected.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--success)">
          <div class="info-card-title">Safe Deprecation</div>
          <div class="info-card-tag" style="color:var(--success);background:color-mix(in srgb, var(--success) 13%, transparent)">Cleanup</div>
          <div class="info-card-body">"Can I delete this table?" — check downstream map. If nothing depends on it, safe to drop. Without lineage, every deletion is a gamble.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--purple)">
          <div class="info-card-title">Compliance</div>
          <div class="info-card-tag" style="color:var(--purple);background:color-mix(in srgb, var(--purple) 13%, transparent)">Audit</div>
          <div class="info-card-body">"Where does patient_id flow?" — trace the column from raw source through every transformation to every output. Required for HIPAA, GDPR right-to-be-forgotten requests.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Querying the lineage programmatically</h3>
      <div class="code-block" data-lang="bash"># Find all models downstream of stg_patients
dbt ls --select stg_patients+

# Direct children only — the +N syntax limits the hop count
dbt ls --select stg_patients+1

# Only the changed model and its children (Slim CI)
dbt build --select state:modified+</div>
    </div>
    <div class="detail-section">
      <h3>Under the hood — for when you want the mechanism</h3>
      <details class="cf-det"><summary>How dbt turns <code>ref()</code> calls into a graph</summary>
        <p>During <strong>parse</strong>, dbt reads every <code>.sql</code> file and records each <code>ref()</code> and <code>source()</code> call <em>without executing the SQL</em> — Jinja is rendered enough to capture the dependency, not to run the query. Each call becomes an edge: <code>ref('stg_orders')</code> inside <code>fct_orders</code> creates the edge <code>stg_orders → fct_orders</code>. The result is stored in <code>manifest.json</code> as two lookup maps:</p>
        <ul>
          <li><code>parent_map</code> — for each node, the nodes it depends on (its <code>ref</code>/<code>source</code> targets).</li>
          <li><code>child_map</code> — the inverse: for each node, everything that depends on it.</li>
        </ul>
        <p>Every selector (<code>model+</code>, <code>+model</code>, <code>@model</code>, <code>state:modified+</code>) is just a traversal of these maps. There is no magic — "what breaks if I change X" is a graph walk over <code>child_map</code>.</p>
      </details>
      <details class="cf-det"><summary>Topological order &amp; parallelism (why run order is deterministic but not fixed)</summary>
        <p>dbt <strong>topologically sorts</strong> the DAG — a linear order where every node follows all its parents. Independent nodes (no path between them) have no required order relative to each other, so dbt executes any node whose parents have finished, up to <code>threads</code> at once. That's why two runs can interleave <code>stg_orders</code> and <code>stg_customers</code> differently yet always build <code>fct_orders</code> after both. A long dependency chain can't be parallelized regardless of thread count.</p>
      </details>
      <details class="cf-det"><summary>Cycles, disabled nodes &amp; ephemeral models</summary>
        <ul>
          <li><strong>Cycles</strong> fail at parse (<code>Found a cycle: …</code>) — there is no valid build order. Fix by extracting shared logic into a third upstream model.</li>
          <li><strong>Disabled</strong> resources (<code>enabled: false</code>) are removed from the graph; any <code>ref()</code> to them errors, so disabling a model forces you to deal with its dependents.</li>
          <li><strong>Ephemeral</strong> models are DAG nodes for ordering but are inlined as CTEs into their children — they never become a warehouse object and never show in the run's executed-node list. The graph has more nodes than the warehouse has relations.</li>
        </ul>
      </details>
    </div>
    <div class="detail-section">
      <h3>What problem did lineage solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Dependencies in SQL always existed — they were just invisible. Every schema change was a blind leap, because no one knew what else depended on what. dbt's DAG makes the invisible visible, turning accidental breakage into preventable impact analysis.</p>
    </div>
  `;
}
