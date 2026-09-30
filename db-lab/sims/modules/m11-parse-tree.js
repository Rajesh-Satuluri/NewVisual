import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Parse tree for: SELECT p.name, p.price FROM products p JOIN inventory i ON p.product_id = i.product_id WHERE p.product_id = 'B08N5WRWNW'
const TREE_NODES = [
  { id: 'root',    label: 'SelectStatement', x: 400, y: 40,  color: '#4F46E5', parent: null },
  { id: 'slist',   label: 'SelectList',      x: 160, y: 110, color: '#06B6D4', parent: 'root' },
  { id: 'from',    label: 'FromClause',      x: 400, y: 110, color: '#10B981', parent: 'root' },
  { id: 'where',   label: 'WhereClause',     x: 640, y: 110, color: '#EF4444', parent: 'root' },
  { id: 'col1',    label: 'p.name',          x: 60,  y: 190, color: '#94A3B8', parent: 'slist' },
  { id: 'col2',    label: 'p.price',         x: 170, y: 190, color: '#94A3B8', parent: 'slist' },
  { id: 'col3',    label: 'i.quantity',      x: 280, y: 190, color: '#94A3B8', parent: 'slist' },
  { id: 'join',    label: 'JoinExpr',        x: 400, y: 190, color: '#10B981', parent: 'from' },
  { id: 'prod',    label: 'products p',      x: 330, y: 270, color: '#06B6D4', parent: 'join' },
  { id: 'inv',     label: 'inventory i',     x: 460, y: 270, color: '#06B6D4', parent: 'join' },
  { id: 'oncond',  label: 'ON p.product_id\n= i.product_id', x: 395, y: 350, color: '#94A3B8', parent: 'join' },
  { id: 'and',     label: 'AND',             x: 640, y: 190, color: '#EF4444', parent: 'where' },
  { id: 'pred1',   label: "p.product_id\n= 'B08N5WRWNW'", x: 570, y: 270, color: '#94A3B8', parent: 'and' },
  { id: 'pred2',   label: 'i.quantity\n> 0', x: 710, y: 270, color: '#94A3B8', parent: 'and' },
];

// Reveal order: root first, then level by level
const REVEAL_ORDER = [
  ['root'],
  ['slist', 'from', 'where'],
  ['col1', 'col2', 'col3', 'join', 'and'],
  ['prod', 'inv', 'pred1', 'pred2'],
  ['oncond'],
];

const STEPS = [
  { label: 'Root: SelectStatement', revealUpto: 0, highlight: 'root',   desc: 'The parser\'s top-level rule is SelectStatement — the grammar entry point. Every SQL SELECT produces this root node.' },
  { label: 'Clauses: SelectList, FROM, WHERE', revealUpto: 1, highlight: 'slist', desc: 'Three child nodes: SelectList (the column list), FromClause (tables), WhereClause (filter predicates). These map directly to the SQL keyword clauses.' },
  { label: 'Column & Join nodes', revealUpto: 2, highlight: 'join',  desc: 'SelectList expands into three column references. FromClause contains a JoinExpr node. WhereClause contains an AND node joining two predicates.' },
  { label: 'Table references & predicates', revealUpto: 3, highlight: 'prod',  desc: 'JoinExpr identifies the two tables: products (alias p) and inventory (alias i). The AND node splits into two separate comparison predicates.' },
  { label: 'ON condition — complete tree', revealUpto: 4, highlight: 'oncond', desc: 'The ON clause of the JOIN becomes a leaf node. The parse tree is complete — every SQL token maps to exactly one node. This is fed into the semantic analyzer.' },
];

function getVisibleNodes(revealUpto) {
  const visible = new Set();
  for (let i = 0; i <= revealUpto; i++) {
    REVEAL_ORDER[i].forEach(id => visible.add(id));
  }
  return visible;
}

function drawParseTree(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Press Play to build the Parse Tree step by step', w / 2, h / 2);
    ctx.textAlign = 'left';
    return;
  }

  const step = STEPS[stepIdx];
  const visible = getVisibleNodes(step.revealUpto);
  const nodeMap = {};
  TREE_NODES.forEach(n => { nodeMap[n.id] = n; });

  // Draw edges first
  TREE_NODES.forEach(n => {
    if (!n.parent || !visible.has(n.id) || !visible.has(n.parent)) return;
    const p = nodeMap[n.parent];
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 18);
    ctx.lineTo(n.x, n.y - 18);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Draw nodes
  TREE_NODES.forEach(n => {
    if (!visible.has(n.id)) return;
    const isActive = n.id === step.highlight;
    const lines = n.label.split('\n');
    const boxW = Math.max(...lines.map(l => l.length)) * 6.8 + 24;
    const boxH = lines.length > 1 ? 44 : 30;

    ctx.fillStyle = isActive ? n.color : n.color + '22';
    ctx.strokeStyle = isActive ? n.color : n.color + '88';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(n.x - boxW / 2, n.y - boxH / 2, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isActive ? '#fff' : '#CBD5E1';
    ctx.font = `${isActive ? 600 : 400} 10px monospace`;
    ctx.textAlign = 'center';
    lines.forEach((line, li) => {
      const lineY = n.y - (lines.length - 1) * 7 + li * 14;
      ctx.fillText(line, n.x, lineY + 4);
    });
    ctx.textAlign = 'left';
  });
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M11',
    title: 'Parse Tree (CST)',
    subtitle: 'How the parser transforms a token stream into a Concrete Syntax Tree — every grammar rule becomes a node.',
    tabs: [
      { id: 'tree',     label: '🌲 Parse Tree' },
      { id: 'grammar',  label: '📐 Grammar Rules' },
      { id: 'iq',       label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Parse Tree Tab ─────────────────────────────────────────────────────────
  const treeTab = container.querySelector('#tab-tree');
  treeTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="420" style="width:100%;max-height:420px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="tree-explainer">
        <h3>Concrete Syntax Tree (CST)</h3>
        <p>The parser consumes the token stream and applies grammar rules to produce a tree.
           Each internal node is a grammar rule; each leaf is a terminal token.
           Press <strong>Play</strong> to build the tree level by level.</p>
      </div>
    </div>
  `;

  const canvas = treeTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const W = 800, H = 420;

  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: STEPS.map((s, i) => ({
      label: s.label,
      duration: 2200,
      mutate: state => { state.step = i; },
    })),
    onRender: (state) => {
      drawParseTree(ctx, state.step, W, H);
      const el = treeTab.querySelector('#tree-explainer');
      if (el && state.step >= 0) {
        const s = STEPS[state.step];
        el.innerHTML = `<h3>${s.label}</h3><p>${s.desc}</p>`;
      }
    },
  });

  SimulationEngine.renderControls(treeTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(treeTab.querySelector('.canvas-wrap'), engine);
  drawParseTree(ctx, -1, W, H);
  engine.reset();

  // ── Grammar Rules Tab ──────────────────────────────────────────────────────
  container.querySelector('#tab-grammar').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">SQL Grammar (Simplified BNF)</div>
        <div class="section-desc">Grammar rules define what the parser expects — every rule becomes a node in the parse tree</div>
      </div>
      <div class="code-block">
<span class="cmt">-- Simplified grammar for our canonical query:</span>
SelectStatement  ::= <span class="kw">SELECT</span> SelectList <span class="kw">FROM</span> TableRef [JoinClause] [WhereClause]
SelectList       ::= ColumnRef (<span class="str">,</span> ColumnRef)*
ColumnRef        ::= [alias <span class="str">.</span>] column_name
TableRef         ::= table_name [alias]
JoinClause       ::= <span class="kw">JOIN</span> TableRef <span class="kw">ON</span> Predicate
WhereClause      ::= <span class="kw">WHERE</span> Predicate [<span class="kw">AND</span> Predicate]*
Predicate        ::= ColumnRef Operator Literal
Operator         ::= <span class="str">=</span> | <span class="str">&gt;</span> | <span class="str">&lt;</span> | <span class="str">&gt;=</span> | <span class="str">&lt;=</span>
Literal          ::= StringLiteral | NumericLiteral
      </div>

      <div class="info-grid" style="padding-top:20px">
        ${[
          { title: 'LL(1) vs LALR', color: '#4F46E5', desc: 'Most SQL parsers use LALR(1) — Look-Ahead Left-to-right Rightmost derivation. It processes the token stream left-to-right and builds the tree bottom-up. PostgreSQL uses a Bison-generated LALR(1) parser. LL parsers (top-down) are simpler but cannot handle left-recursive grammars.' },
          { title: 'Grammar Conflict', color: '#EF4444', desc: 'Ambiguous grammar rules cause parser conflicts. Example: "AS" — is it an alias keyword or a column named "AS"? SQL resolves this with reserved words and context-sensitive rules in the grammar.' },
          { title: 'Error Recovery', color: '#F59E0B', desc: 'A good parser recovers from errors to report multiple mistakes in one pass. PostgreSQL uses panic mode recovery — skip tokens until a synchronisation point (semicolon, keyword) and continue parsing.' },
          { title: 'CST vs AST', color: '#10B981', desc: 'The CST includes every grammar artifact — parentheses, commas, keyword tokens. The AST (Abstract Syntax Tree) prunes these, keeping only semantically meaningful nodes. The optimizer works on the AST, not the CST.' },
        ].map(c => `
          <div class="info-card" style="border-color:${c.color}33">
            <div class="info-card-title" style="color:${c.color};margin-bottom:8px">${c.title}</div>
            <div class="info-card-body">${c.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // ── Interview Q&A ─────────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the difference between a parse tree (CST) and an AST?',
      a: 'A <strong>Concrete Syntax Tree (CST)</strong> contains every syntactic artifact: parentheses, commas, keyword tokens, each as a tree node. An <strong>Abstract Syntax Tree (AST)</strong> prunes syntactically redundant nodes and keeps only semantically meaningful structure. Example: <code>SELECT (a + b)</code> — the CST has nodes for the outer parentheses and the comma in the SELECT list; the AST keeps only the Add node with children a and b. The AST is simpler, more compact, and easier for the optimizer to traverse and rewrite.',
      tip: 'CST = grammar trace (includes punctuation); AST = semantic skeleton (only what matters for execution).',
    },
    {
      q: 'How does a parser handle operator precedence in SQL expressions?',
      a: 'Operator precedence is baked into the grammar hierarchy. Multiplication binds tighter than addition, which binds tighter than comparison, which binds tighter than AND/OR. The grammar defines separate rules for each precedence level: <code>expr → add_expr ((\'+\'|\'–\') add_expr)*</code>, <code>add_expr → mul_expr (…)</code>, etc. The deeper the rule in the grammar, the higher the precedence. This is why <code>a + b * c</code> parses as <code>a + (b * c)</code> — mul_expr is deeper than add_expr.',
      tip: 'You do not need to remember grammar rules — just know that precedence is encoded in the grammar hierarchy, not explicit priority numbers.',
    },
    {
      q: 'What grammar class does SQL use, and why does it matter for performance?',
      a: 'SQL parsers typically use <strong>LALR(1)</strong> grammars (PostgreSQL uses Bison, which generates LALR(1) parsers). LALR(1) parsers run in O(n) time where n is the number of tokens — a 50-token query takes the same amount of parsing time whether the table has 100 rows or 100 billion. Parsing is never the bottleneck (1–5ms); query planning (10–100ms) and execution dominate. This is why prepared statements save parse time but the plan cache matters far more than the parse cache.',
      tip: 'LALR(1) = linear time = parsing is never your query bottleneck. If a query is slow, look at the plan, not the parser.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
