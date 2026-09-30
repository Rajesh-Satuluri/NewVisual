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
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M15 · Core Features',
    title: 'Lineage & DAG',
    subtitle: 'Click any node. Instantly see everything upstream and downstream. Zero SQL archaeology.',
    tabs: [
      { id: 'visual', label: '🎬 Interactive DAG' },
      { id: 'detail', label: '📋 How Lineage Works' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  const cv = document.createElement('canvas');
  cv.width = 820; cv.height = 420;
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
    const scaleX = cv.width / cv.getBoundingClientRect().width;
    const scaleY = cv.height / cv.getBoundingClientRect().height;
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

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>From invisible to explicit dependencies</h3>
      <p>In a pre-dbt world, SQL dependencies are invisible. You only discover them when something breaks. dbt's <code>ref()</code> function makes every dependency explicit, and dbt compiles these into a Directed Acyclic Graph (DAG) stored in <code>target/manifest.json</code>.</p>
      <p>This graph enables three questions that previously required hours of SQL archaeology:</p>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">Impact Analysis</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">Forward</div>
          <div class="info-card-body">"If I change stg_patients, what breaks?" — <code>dbt ls --select stg_patients+</code> returns every downstream model instantly. No Slack messages, no grep, no hoping you found everything.</div>
        </div>
        <div class="info-card" style="border-left-color:#FF694B">
          <div class="info-card-title">Root Cause</div>
          <div class="info-card-tag" style="color:#FF694B;background:#FF694B22">Backward</div>
          <div class="info-card-body">"This dashboard is wrong — where did the bad data enter?" — follow the DAG upstream from the broken model until you find the node where data diverged from expected.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">Safe Deprecation</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">Cleanup</div>
          <div class="info-card-body">"Can I delete this table?" — check downstream map. If nothing depends on it, safe to drop. Without lineage, every deletion is a gamble.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">Compliance</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Audit</div>
          <div class="info-card-body">"Where does patient_id flow?" — trace the column from raw source through every transformation to every output. Required for HIPAA, GDPR right-to-be-forgotten requests.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Querying the lineage programmatically</h3>
      <div class="code-block">-- Find all models downstream of stg_patients (CLI)
dbt ls --select stg_patients+

-- Find all models directly dependent on stg_patients
dbt ls --select stg_patients+1    -- +1 means one level only

-- Find only the changed model and its children (Slim CI)
dbt build --select state:modified+</div>
    </div>
    <div class="detail-section">
      <h3>What problem did lineage solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Dependencies in SQL always existed — they were just invisible. Every schema change was a blind leap, because no one knew what else depended on what. dbt's DAG makes the invisible visible, turning accidental breakage into preventable impact analysis.</p>
    </div>
  `;
}
