import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// CST (verbose) vs AST (pruned) — side-by-side animated diff
// For: SELECT p.name FROM products p JOIN inventory i ON p.product_id = i.product_id WHERE p.product_id = 'B08N5WRWNW' AND i.quantity > 0

const CST_NODES = [
  { id: 'root',    label: 'SelectStatement', x: 200, y: 40,  color: '#475569', pruned: false },
  { id: 'sel_kw',  label: "'SELECT'",         x: 60,  y: 110, color: '#475569', pruned: true  },
  { id: 'slist',   label: 'SelectList',       x: 200, y: 110, color: '#475569', pruned: false },
  { id: 'from_kw', label: "'FROM'",           x: 330, y: 110, color: '#475569', pruned: true  },
  { id: 'tref',    label: 'TableRef',         x: 200, y: 190, color: '#475569', pruned: false },
  { id: 'comma',   label: "','",              x: 100, y: 190, color: '#475569', pruned: true  },
  { id: 'col1',    label: 'p.name',           x: 50,  y: 270, color: '#475569', pruned: false },
  { id: 'col2',    label: 'p.price',          x: 155, y: 270, color: '#475569', pruned: false },
  { id: 'join_kw', label: "'JOIN'",           x: 260, y: 190, color: '#475569', pruned: true  },
  { id: 'join',    label: 'JoinExpr',         x: 350, y: 190, color: '#475569', pruned: false },
  { id: 'where_kw',label: "'WHERE'",          x: 330, y: 110, color: '#475569', pruned: true  },
];

const AST_NODES = [
  { id: 'select',  label: 'Select',              x: 600, y: 40,  color: '#4F46E5' },
  { id: 'proj',    label: 'Project\n[name,price,qty]', x: 480, y: 130, color: '#06B6D4' },
  { id: 'filter',  label: 'Filter\n[AND]',        x: 720, y: 130, color: '#EF4444' },
  { id: 'join',    label: 'HashJoin\n[product_id]',x: 600, y: 230, color: '#10B981' },
  { id: 'pred1',   label: "product_id\n='B08N5WRWNW'", x: 650, y: 130, color: '#EF4444' },
  { id: 'pred2',   label: 'quantity\n> 0',        x: 790, y: 130, color: '#EF4444' },
  { id: 'scan_p',  label: 'SeqScan\nproducts',    x: 530, y: 320, color: '#F59E0B' },
  { id: 'scan_i',  label: 'SeqScan\ninventory',   x: 670, y: 320, color: '#F59E0B' },
];

const AST_EDGES = [
  ['select', 'proj'], ['select', 'filter'],
  ['filter', 'pred1'], ['filter', 'pred2'], ['filter', 'join'],
  ['join', 'scan_p'], ['join', 'scan_i'],
];

const DIFF_STEPS = [
  {
    label: 'CST: Full parse tree',
    phase: 'cst',
    highlight: [],
    desc: 'The Concrete Syntax Tree (CST) contains every token from the SQL string — keywords, commas, parentheses, operators. It\'s verbose: 14+ nodes for a 5-clause query.',
  },
  {
    label: 'Pruning: Remove keyword tokens',
    phase: 'prune1',
    highlight: ['sel_kw', 'from_kw', 'join_kw', 'where_kw'],
    desc: 'Keywords (SELECT, FROM, JOIN, WHERE) are syntactic noise. They tell the parser what clause is starting, but carry no semantic information. The AST builder strips them — the tree structure already encodes the meaning.',
  },
  {
    label: 'Pruning: Remove punctuation',
    phase: 'prune2',
    highlight: ['comma'],
    desc: 'Punctuation tokens (commas, parentheses) are grammar separators — they delimit list items but mean nothing semantically. The AST represents the SelectList as a child array, making the comma nodes redundant.',
  },
  {
    label: 'AST: Semantic nodes with resolved refs',
    phase: 'ast',
    highlight: ['select', 'proj', 'join', 'filter'],
    desc: 'The AST replaces grammar rules with semantic operations: Project (column selection), HashJoin (chosen algorithm), Filter (predicate tree). Column names are resolved to catalog offsets. This is what the optimizer receives.',
  },
  {
    label: 'AST: Optimization-ready tree',
    phase: 'ast_full',
    highlight: ['scan_p', 'scan_i'],
    desc: 'Leaf nodes are physical access methods: SeqScan on products and inventory. The optimizer may replace these with IndexScan if a B+ tree index exists on product_id. The AST → logical plan → physical plan pipeline starts here.',
  },
];

function drawCSTSide(ctx, phase, highlight, x0, w, h) {
  const prunePhase1 = ['prune1', 'prune2', 'ast', 'ast_full'].includes(phase);
  const prunePhase2 = ['prune2', 'ast', 'ast_full'].includes(phase);

  const nodes = [
    { id: 'root',  label: 'SelectStmt', x: x0 + 100, y: 50,  parent: null, pruned: false },
    { id: 'sel_kw',label: "'SELECT'",   x: x0 + 20,  y: 120, parent: 'root', pruned: prunePhase1 },
    { id: 'slist', label: 'SelectList', x: x0 + 110, y: 120, parent: 'root', pruned: false },
    { id: 'from_kw',label:"'FROM'",     x: x0 + 195, y: 120, parent: 'root', pruned: prunePhase1 },
    { id: 'col1',  label: 'p.name',     x: x0 + 55,  y: 200, parent: 'slist', pruned: false },
    { id: 'comma', label: "','",        x: x0 + 115, y: 200, parent: 'slist', pruned: prunePhase2 },
    { id: 'col2',  label: 'p.price',   x: x0 + 165, y: 200, parent: 'slist', pruned: false },
    { id: 'tref',  label: 'TableRef',  x: x0 + 100, y: 200, parent: 'root', pruned: false },
    { id: 'tname', label: 'products',  x: x0 + 70,  y: 280, parent: 'tref', pruned: false },
    { id: 'join_kw',label:"'JOIN'",    x: x0 + 165, y: 280, parent: 'tref', pruned: prunePhase1 },
  ];
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  // edges
  nodes.forEach(n => {
    if (!n.parent) return;
    const p = nodeMap[n.parent];
    const hidden = n.pruned || p.pruned;
    ctx.strokeStyle = hidden ? '#1E293B' : '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash(hidden ? [3, 5] : []);
    ctx.globalAlpha = hidden ? 0.2 : 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 14);
    ctx.lineTo(n.x, n.y - 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  });

  nodes.forEach(n => {
    const isHl = highlight.includes(n.id);
    const boxW = n.label.length * 6.5 + 20;
    const boxH = 26;
    ctx.globalAlpha = n.pruned ? 0.18 : 1;
    ctx.fillStyle = isHl ? '#EF4444' : (n.pruned ? '#1E293B' : '#1E2D3D');
    ctx.strokeStyle = isHl ? '#EF4444' : (n.pruned ? '#334155' : '#475569');
    ctx.lineWidth = isHl ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(n.x - boxW / 2, n.y - boxH / 2, boxW, boxH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = n.pruned ? 0.25 : 1;
    ctx.fillStyle = isHl ? '#fff' : '#94A3B8';
    ctx.font = `10px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(n.label, n.x, n.y + 4);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  });
}

function drawASTSide(ctx, phase, highlight, x0) {
  const showFull = ['ast', 'ast_full'].includes(phase);
  const showLeaves = phase === 'ast_full';
  if (!showFull) return;

  const nodes = [
    { id: 'select', label: 'Select',      x: x0 + 120, y: 50  },
    { id: 'proj',   label: 'Project\n[name,price,qty]', x: x0 + 60,  y: 130 },
    { id: 'filter', label: 'Filter [AND]', x: x0 + 185, y: 130 },
    { id: 'join',   label: 'HashJoin\n[product_id]',    x: x0 + 120, y: 230 },
    { id: 'pred1',  label: "id='B08N5WRWNW'",           x: x0 + 240, y: 210 },
    { id: 'pred2',  label: 'qty > 0',                   x: x0 + 305, y: 210 },
  ];
  const leafNodes = [
    { id: 'scan_p', label: 'SeqScan\nproducts',  x: x0 + 75,  y: 320 },
    { id: 'scan_i', label: 'SeqScan\ninventory', x: x0 + 165, y: 320 },
  ];
  const edges = [
    ['select','proj'], ['select','filter'], ['filter','join'],
    ['filter','pred1'], ['filter','pred2'],
    ['join','scan_p'], ['join','scan_i'],
  ];
  const allNodes = [...nodes, ...(showLeaves ? leafNodes : [])];
  const nodeMap = {};
  allNodes.forEach(n => { nodeMap[n.id] = n; });

  edges.forEach(([a, b]) => {
    const na = nodeMap[a], nb = nodeMap[b];
    if (!na || !nb) return;
    ctx.strokeStyle = '#1E3A5F';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(na.x, na.y + 14);
    ctx.lineTo(nb.x, nb.y - 14);
    ctx.stroke();
  });

  allNodes.forEach(n => {
    const isHl = highlight.includes(n.id);
    const isLeaf = leafNodes.some(l => l.id === n.id);
    const col = isLeaf ? '#F59E0B' : '#4F46E5';
    const lines = n.label.split('\n');
    const boxW = Math.max(...lines.map(l => l.length)) * 6.5 + 22;
    const boxH = lines.length > 1 ? 40 : 26;
    ctx.fillStyle = isHl ? col : col + '22';
    ctx.strokeStyle = isHl ? col : col + '66';
    ctx.lineWidth = isHl ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(n.x - boxW / 2, n.y - boxH / 2, boxW, boxH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isHl ? '#fff' : '#94A3B8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    lines.forEach((line, li) => {
      ctx.fillText(line, n.x, n.y - (lines.length - 1) * 7 + li * 14 + 4);
    });
    ctx.textAlign = 'left';
  });
}

function drawDiff(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Press Play to see CST → AST transformation', w / 2, h / 2);
    ctx.textAlign = 'left';
    return;
  }

  const step = DIFF_STEPS[stepIdx];
  const midX = w / 2;

  // Labels
  ctx.fillStyle = '#64748B';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('CST (Concrete Syntax Tree)', midX / 2, 18);
  ctx.fillText('AST (Abstract Syntax Tree)', midX + midX / 2, 18);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(midX, 0);
  ctx.lineTo(midX, h);
  ctx.stroke();
  ctx.setLineDash([]);

  drawCSTSide(ctx, step.phase, step.highlight, 0, midX, h);
  drawASTSide(ctx, step.phase, step.highlight, midX + 10);

  // Arrow →
  if (['ast', 'ast_full'].includes(step.phase)) {
    ctx.fillStyle = '#4F46E5';
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('→', midX, h / 2);
    ctx.textAlign = 'left';
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M12',
    title: 'AST vs Parse Tree',
    subtitle: 'Visualize the pruning: from a verbose CST to the compact Abstract Syntax Tree the optimizer actually uses.',
    tabs: [
      { id: 'diff',  label: '🔄 CST → AST' },
      { id: 'nodes', label: '🧩 AST Node Types' },
      { id: 'iq',    label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Diff Tab ───────────────────────────────────────────────────────────────
  const diffTab = container.querySelector('#tab-diff');
  diffTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="400" style="width:100%;max-height:400px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="ast-explainer">
        <h3>CST → AST Transformation</h3>
        <p>The parse tree (CST) is pruned to produce the AST.
           Keyword tokens and punctuation nodes are stripped.
           Semantic operations (Project, Filter, Join) replace grammar rules.
           Press <strong>Play</strong> to watch the transformation.</p>
      </div>
    </div>
  `;

  const canvas = diffTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const W = 800, H = 400;

  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: DIFF_STEPS.map((s, i) => ({
      label: s.label,
      duration: 2400,
      mutate: state => { state.step = i; },
    })),
    onRender: (state) => {
      drawDiff(ctx, state.step, W, H);
      const el = diffTab.querySelector('#ast-explainer');
      if (el && state.step >= 0) {
        const s = DIFF_STEPS[state.step];
        el.innerHTML = `<h3>${s.label}</h3><p>${s.desc}</p>`;
      }
    },
  });

  SimulationEngine.renderControls(diffTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(diffTab.querySelector('.canvas-wrap'), engine);
  drawDiff(ctx, -1, W, H);
  engine.reset();

  // ── AST Node Types Tab ─────────────────────────────────────────────────────
  container.querySelector('#tab-nodes').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">AST Node Taxonomy</div>
        <div class="section-desc">Every node in the AST carries semantic meaning — no punctuation, no keywords</div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th>Node Type</th>
              <th>SQL Construct</th>
              <th>Children</th>
              <th>Optimizer Action</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['Select', 'Top-level SELECT', 'Project, Filter, Sort', 'Entry point for plan generation'],
              ['Project', 'SELECT column list', 'ColumnRef nodes', 'Push down to reduce width early'],
              ['Filter', 'WHERE predicates', 'Predicate nodes', 'Push below Join to filter early'],
              ['HashJoin / NLJoin', 'JOIN … ON', 'Left table, Right table, Condition', 'Choose algorithm based on table size'],
              ['SeqScan', 'Table access', 'TableRef + column list', 'May become IndexScan if predicate matches index'],
              ['IndexScan', 'Table access via B+tree', 'Index name, Predicate', 'Used when predicate has high selectivity'],
              ['Aggregate', 'GROUP BY + COUNT/SUM', 'GroupBy keys, AggFn nodes', 'Choose hash agg vs sort agg based on order'],
              ['Sort', 'ORDER BY', 'Sort keys, direction', 'May be eliminated if input already ordered'],
            ].map(([type, sql, children, action]) => `
              <tr>
                <td><code style="color:var(--accent)">${type}</code></td>
                <td>${sql}</td>
                <td style="color:var(--text3);font-size:11px">${children}</td>
                <td style="font-size:11px">${action}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="scroll-content" style="padding-top:20px;padding-bottom:0">
        <div class="prose">
          <h3>Why the AST is the Right Input for the Optimizer</h3>
          <p>The optimizer must rewrite the query — push filters down, reorder joins, choose access methods.
             It cannot rewrite a CST without grammar knowledge. The AST exposes only semantic structure:
             "there is a filter with predicate X applied before a join of tables A and B."
             The optimizer can freely swap A and B, push X below the join, or change the join algorithm —
             all are valid rewrites on the AST without touching any SQL string.</p>
        </div>
      </div>
    </div>
  `;

  // ── Interview Q&A ─────────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What does the AST contain that the parse tree does not, and vice versa?',
      a: '<strong>Parse tree (CST) has, AST lacks:</strong> keyword tokens (SELECT, FROM, WHERE), punctuation (commas, parentheses, semicolons), and intermediate grammar rule nodes that carry no semantic information.<br><br><strong>AST has, CST lacks:</strong> resolved column and table references (catalog IDs, not raw strings), type annotations (column A is INT, column B is VARCHAR), and explicit semantic node types (HashJoin, SeqScan) that go beyond the grammar. The AST is smaller, typed, and directly queryable by the optimizer.',
      tip: 'Key phrase: CST = grammar artifact, AST = semantic skeleton. One traces the parse, the other drives the execution.',
    },
    {
      q: 'How does the query optimizer use the AST to generate a plan?',
      a: 'The optimizer takes the AST and applies algebraic rewrite rules to produce a logical plan (equivalent ASTs at lower cost), then picks physical operators to produce a physical plan. Key rewrites: (1) <strong>predicate pushdown</strong> — move Filter nodes below Join nodes; (2) <strong>join reordering</strong> — commutativity allows swapping children of a Join node; (3) <strong>access method selection</strong> — replace SeqScan with IndexScan when an index covers the filter predicate. The cost model evaluates each candidate plan using table statistics (row counts, selectivity).',
      tip: 'The optimizer does not re-parse SQL — it rewrites the AST. This is why EXPLAIN shows a plan tree, not SQL.',
    },
    {
      q: 'What is semantic analysis and what errors does it catch?',
      a: 'Semantic analysis walks the AST and resolves all symbolic references against the system catalog. It catches: <strong>unknown tables</strong> (table "prducts" — typo, does not exist in catalog), <strong>unknown columns</strong> (column "p.nme" — does not exist on products), <strong>type mismatches</strong> (comparing VARCHAR product_id with an INT literal), <strong>ambiguous column references</strong> (column "id" exists in both products and inventory — must qualify with alias). None of these are grammar violations — the CST is valid. They are semantic violations that only catalog lookup can detect.',
      tip: 'Syntax error = parser rejects it. Semantic error = parser accepts it, but the catalog lookup fails.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
