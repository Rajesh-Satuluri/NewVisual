import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const ANALYSIS_STEPS = [
  {
    label: 'Input: AST from Parser',
    desc: 'The semantic analyzer receives the AST with raw string references — "products", "p.name", "i.quantity". No table IDs, no column offsets, no types yet.',
    nodes: [
      { id: 'ast',   label: 'Select AST',    x: 400, y: 50,  color: '#4F46E5', state: 'normal' },
      { id: 'proj',  label: 'Project [strings]', x: 280, y: 130, color: '#475569', state: 'normal' },
      { id: 'join',  label: 'Join (unresolved)', x: 400, y: 130, color: '#475569', state: 'normal' },
      { id: 'where', label: 'Filter [strings]',  x: 520, y: 130, color: '#475569', state: 'normal' },
    ],
    catalog: [],
  },
  {
    label: 'Step 1: Table Resolution',
    desc: 'The analyzer looks up "products" and "inventory" in the system catalog (pg_class / information_schema.tables). It verifies both tables exist and fetches their OIDs (object identifiers).',
    nodes: [
      { id: 'ast',   label: 'Select AST',    x: 400, y: 50,  color: '#4F46E5', state: 'normal' },
      { id: 'proj',  label: 'Project',        x: 280, y: 130, color: '#475569', state: 'normal' },
      { id: 'join',  label: 'Join (resolving)', x: 400, y: 130, color: '#10B981', state: 'active' },
      { id: 'where', label: 'Filter',          x: 520, y: 130, color: '#475569', state: 'normal' },
      { id: 'prod',  label: 'products OID=16421', x: 300, y: 230, color: '#10B981', state: 'found' },
      { id: 'inv',   label: 'inventory OID=16438', x: 500, y: 230, color: '#10B981', state: 'found' },
    ],
    catalog: [
      { col: 'pg_class', val: 'products → OID 16421, 350M rows, ~42 GB' },
      { col: 'pg_class', val: 'inventory → OID 16438, 2.1M rows, ~890 MB' },
    ],
  },
  {
    label: 'Step 2: Column Resolution',
    desc: 'Each column reference (p.name, p.price, i.quantity, p.product_id, i.product_id) is resolved against the table schemas. The analyzer finds each column\'s type and attribute number.',
    nodes: [
      { id: 'ast',   label: 'Select AST',    x: 400, y: 50,  color: '#4F46E5', state: 'normal' },
      { id: 'proj',  label: 'Project (resolving)', x: 280, y: 130, color: '#06B6D4', state: 'active' },
      { id: 'join',  label: 'Join ✓',         x: 400, y: 130, color: '#10B981', state: 'done' },
      { id: 'where', label: 'Filter (resolving)', x: 520, y: 130, color: '#06B6D4', state: 'active' },
      { id: 'c1',    label: 'name: VARCHAR(255) attr#2', x: 160, y: 230, color: '#06B6D4', state: 'found' },
      { id: 'c2',    label: 'price: DECIMAL(10,2) attr#4', x: 340, y: 230, color: '#06B6D4', state: 'found' },
      { id: 'c3',    label: 'quantity: INT attr#3', x: 510, y: 230, color: '#06B6D4', state: 'found' },
    ],
    catalog: [
      { col: 'pg_attribute', val: 'products.name → VARCHAR(255), attnum=2' },
      { col: 'pg_attribute', val: 'products.price → DECIMAL(10,2), attnum=4' },
      { col: 'pg_attribute', val: 'inventory.quantity → INT, attnum=3' },
      { col: 'pg_attribute', val: 'products.product_id → VARCHAR(50) NOT NULL' },
      { col: 'pg_attribute', val: "inventory.product_id → VARCHAR(50) FK→products" },
    ],
  },
  {
    label: 'Step 3: Type Checking',
    desc: "The analyzer checks type compatibility. The JOIN predicate (p.product_id = i.product_id): both VARCHAR(50) ✓. The WHERE predicate (p.product_id = 'B08N5WRWNW'): VARCHAR vs STRING literal ✓. (i.quantity > 0): INT vs INT ✓.",
    nodes: [
      { id: 'ast',   label: 'Select AST',    x: 400, y: 50,  color: '#4F46E5', state: 'normal' },
      { id: 'proj',  label: 'Project ✓',      x: 280, y: 130, color: '#10B981', state: 'done' },
      { id: 'join',  label: 'Join ✓',         x: 400, y: 130, color: '#10B981', state: 'done' },
      { id: 'where', label: 'Filter (type-checking)', x: 520, y: 130, color: '#F59E0B', state: 'active' },
      { id: 't1',    label: "VARCHAR = VARCHAR ✓", x: 430, y: 230, color: '#10B981', state: 'found' },
      { id: 't2',    label: 'INT > INT ✓',     x: 600, y: 230, color: '#10B981', state: 'found' },
    ],
    catalog: [
      { col: 'Type check', val: "p.product_id (VARCHAR) = 'B08N5WRWNW' (STRING) → coerce to VARCHAR ✓" },
      { col: 'Type check', val: 'i.quantity (INT) > 0 (INT literal) → compatible ✓' },
      { col: 'Type check', val: 'p.product_id (VARCHAR) = i.product_id (VARCHAR) → exact match ✓' },
    ],
  },
  {
    label: 'Step 4: Annotated AST — Ready for Optimizer',
    desc: 'Semantic analysis complete. The AST now carries: table OIDs, column attribute numbers, resolved types, index availability, and row count statistics. This is handed to the query planner.',
    nodes: [
      { id: 'ast',   label: 'Annotated AST ✓', x: 400, y: 50,  color: '#4F46E5', state: 'active' },
      { id: 'proj',  label: 'Project ✓ [typed]', x: 280, y: 130, color: '#10B981', state: 'done' },
      { id: 'join',  label: 'Join ✓ [OID+index]', x: 400, y: 130, color: '#10B981', state: 'done' },
      { id: 'where', label: 'Filter ✓ [typed]',  x: 520, y: 130, color: '#10B981', state: 'done' },
      { id: 'stats', label: '📊 Stats: 350M rows\nSelectivity: 1/350M', x: 400, y: 230, color: '#4F46E5', state: 'active' },
    ],
    catalog: [
      { col: 'pg_statistic', val: 'products: n_distinct=-1, reltuples=350M' },
      { col: 'pg_statistic', val: 'inventory: n_distinct=2.1M, reltuples=2.1M' },
      { col: 'pg_index', val: 'idx_products_pkey: products(product_id) UNIQUE B+tree' },
      { col: 'pg_index', val: 'idx_inventory_product_id: inventory(product_id) B+tree' },
    ],
  },
];

function drawAnalysis(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to watch semantic analysis annotate the AST', w / 2, h / 2);
    ctx.textAlign = 'left'; return;
  }
  const step = ANALYSIS_STEPS[stepIdx];
  const nodeMap = {};
  step.nodes.forEach(n => { nodeMap[n.id] = n; });

  // Draw edges (simple tree connections)
  const edges = [['ast','proj'],['ast','join'],['ast','where'],
    ['join','prod'],['join','inv'],['proj','c1'],['proj','c2'],['proj','c3'],
    ['where','t1'],['where','t2'],['join','t1'],['join','t2'],['ast','stats'],
    ['prod','c1'],['inv','c3']];
  edges.forEach(([a, b]) => {
    const na = nodeMap[a], nb = nodeMap[b];
    if (!na || !nb) return;
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(na.x, na.y + 16); ctx.lineTo(nb.x, nb.y - 16); ctx.stroke();
    ctx.setLineDash([]);
  });

  step.nodes.forEach(n => {
    const lines = n.label.split('\n');
    const bw = Math.max(...lines.map(l => l.length)) * 6.2 + 22;
    const bh = lines.length > 1 ? 40 : 28;
    const isActive = n.state === 'active';
    ctx.fillStyle = isActive ? n.color : n.color + (n.state === 'done' ? '33' : '18');
    ctx.strokeStyle = isActive ? n.color : n.color + '88';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(n.x - bw/2, n.y - bh/2, bw, bh, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : '#94A3B8';
    ctx.font = (isActive ? '600' : '400') + ' 10px system-ui';
    ctx.textAlign = 'center';
    lines.forEach((line, i) => ctx.fillText(line, n.x, n.y - (lines.length-1)*7 + i*14 + 4));
    ctx.textAlign = 'left';
  });

  // Catalog entries at bottom
  if (step.catalog.length > 0) {
    const startY = 295;
    ctx.fillStyle = '#1E2D3D';
    ctx.beginPath(); ctx.roundRect(20, startY, w-40, h - startY - 10, 6); ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.roundRect(20, startY, w-40, 20, [6,6,0,0]); ctx.fill();
    ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
    ctx.fillText('System Catalog Lookups:', 30, startY + 14);
    step.catalog.forEach((c, i) => {
      ctx.fillStyle = '#475569'; ctx.fillText(`[${c.col}]`, 30, startY + 30 + i * 16);
      ctx.fillStyle = '#94A3B8'; ctx.fillText(c.val, 130, startY + 30 + i * 16);
    });
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M13',
    title: 'Query Analysis',
    subtitle: 'Semantic analysis: how the DB resolves "products" and "p.name" into table OIDs and typed column references.',
    tabs: [
      { id: 'analysis', label: '🔎 Analysis Steps' },
      { id: 'catalog',  label: '📚 System Catalog' },
      { id: 'iq',       label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const analysisTab = container.querySelector('#tab-analysis');
  analysisTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="400" style="width:100%;max-height:400px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="analysis-explainer">
        <h3>Semantic Analyzer</h3>
        <p>After parsing, names are just strings. Semantic analysis converts them to typed, resolved references
           by consulting the system catalog. Press <strong>Play</strong> to watch each resolution step.</p>
      </div>
    </div>
  `;

  const canvas = analysisTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: ANALYSIS_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawAnalysis(ctx, state.step, 800, 400);
      const el = analysisTab.querySelector('#analysis-explainer');
      if (el && state.step >= 0) { const s = ANALYSIS_STEPS[state.step]; el.innerHTML = `<h3>${s.label}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(analysisTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(analysisTab.querySelector('.canvas-wrap'), engine);
  drawAnalysis(ctx, -1, 800, 400);
  engine.reset();

  container.querySelector('#tab-catalog').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">PostgreSQL System Catalog Tables</div>
        <div class="section-desc">Every semantic analysis lookup hits one of these tables</div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Catalog Table</th><th>What it stores</th><th>Query Analysis Use</th></tr></thead>
          <tbody>
            ${[
              ['pg_class', 'Tables, indexes, sequences — their OIDs and sizes', 'Resolve "products" → OID 16421, reltuples=350M'],
              ['pg_attribute', 'Column definitions: name, type, attnum, NOT NULL', 'Resolve "p.name" → VARCHAR(255) attnum=2'],
              ['pg_type', 'Data type definitions and type coercion rules', 'Check VARCHAR = STRING literal: coerce to VARCHAR'],
              ['pg_index', 'Index definitions: which columns, type (B+tree/hash)', 'Find idx_products_pkey on (product_id) → can use IndexScan'],
              ['pg_statistic', 'Column statistics: n_distinct, MCV, histogram', 'Estimate 1 row for product_id = constant (unique)'],
              ['pg_namespace', 'Schemas (public, pg_catalog, etc.)', 'Resolve unqualified table names to correct schema'],
              ['pg_constraint', 'PK, FK, UNIQUE, CHECK, NOT NULL constraints', 'Verify FK: inventory.product_id → products.product_id'],
            ].map(([t, what, use]) => `<tr><td><code style="color:var(--accent)">${t}</code></td><td>${what}</td><td style="font-size:11px">${use}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="scroll-content" style="padding-top:20px;padding-bottom:0">
        <div class="prose">
          <h3>Why Catalog Lookups Are Fast</h3>
          <p>PostgreSQL keeps pg_class, pg_attribute, and pg_statistic in the shared buffer pool — they are
             accessed on almost every query. A typical query analysis takes &lt;1ms because these catalog
             rows are hot in memory. On a cold start, catalog fetches from disk add latency — this is why
             connection pools are important: they keep warm catalog caches.</p>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the difference between syntax analysis and semantic analysis?',
      a: '<strong>Syntax analysis (parsing)</strong> verifies that the SQL string follows the grammar rules. It produces a parse tree. It has no knowledge of table names, column names, or types — it only checks structure. A query with a valid structure but referencing a non-existent table passes the parser.<br><br><strong>Semantic analysis</strong> checks meaning: do the referenced tables exist? Do the columns belong to those tables? Are the types compatible for comparison? Semantic analysis requires the system catalog. A type mismatch (comparing INT to BOOLEAN without a cast) is a semantic error.',
      tip: 'Syntax: grammar police. Semantics: catalog police. Both run before the optimizer sees the query.',
    },
    {
      q: 'What information does the annotated AST carry that the original AST did not?',
      a: 'The annotated AST adds: (1) <strong>OIDs</strong> — each table reference carries its object ID (faster than string lookup in later phases); (2) <strong>attribute numbers</strong> — each column reference carries its offset within the tuple; (3) <strong>types</strong> — each expression node carries its result type (INT, VARCHAR, DECIMAL); (4) <strong>statistics</strong> — estimated row counts and selectivity estimates for each relation; (5) <strong>index availability</strong> — which indexes exist on join/filter columns. All of this is what the optimizer uses to evaluate plan cost.',
      tip: 'The annotated AST is the interface between the parser and the optimizer — think of it as a "typed IR" (intermediate representation).',
    },
    {
      q: 'How does the analyzer detect an ambiguous column reference?',
      a: 'An ambiguous reference occurs when the same column name exists in multiple tables in the FROM clause and no alias qualifier is given. Example: <code>SELECT product_id FROM products JOIN inventory ON …</code> — both tables have product_id. The analyzer searches all in-scope table schemas for a matching column name; if it finds more than one match without a disambiguating alias, it raises "ERROR: column reference \'product_id\' is ambiguous". The fix is to qualify: <code>p.product_id</code>. This is a semantic error — the parser produced a valid tree but the resolution failed.',
      tip: 'Always qualify column names with table aliases in multi-table queries. The analyzer enforces this even when human readers think the intent is obvious.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
