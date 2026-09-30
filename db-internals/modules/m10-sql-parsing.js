import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const QUERY = `SELECT p.name, p.price, i.quantity
FROM products p
JOIN inventory i ON p.product_id = i.product_id
WHERE p.product_id = 'B08N5WRWNW'
  AND i.quantity > 0`;

// Tokeniser output
const TOKENS = [
  { type: 'KW',   value: 'SELECT',       color: '#818CF8' },
  { type: 'ID',   value: 'p.name',       color: '#E2E8F0' },
  { type: 'PUNC', value: ',',            color: '#475569' },
  { type: 'ID',   value: 'p.price',      color: '#E2E8F0' },
  { type: 'PUNC', value: ',',            color: '#475569' },
  { type: 'ID',   value: 'i.quantity',   color: '#E2E8F0' },
  { type: 'KW',   value: 'FROM',         color: '#818CF8' },
  { type: 'ID',   value: 'products',     color: '#06B6D4' },
  { type: 'ID',   value: 'p',            color: '#94A3B8' },
  { type: 'KW',   value: 'JOIN',         color: '#818CF8' },
  { type: 'ID',   value: 'inventory',    color: '#06B6D4' },
  { type: 'ID',   value: 'i',            color: '#94A3B8' },
  { type: 'KW',   value: 'ON',           color: '#818CF8' },
  { type: 'ID',   value: 'p.product_id', color: '#E2E8F0' },
  { type: 'OP',   value: '=',            color: '#F59E0B' },
  { type: 'ID',   value: 'i.product_id', color: '#E2E8F0' },
  { type: 'KW',   value: 'WHERE',        color: '#818CF8' },
  { type: 'ID',   value: 'p.product_id', color: '#E2E8F0' },
  { type: 'OP',   value: '=',            color: '#F59E0B' },
  { type: 'STR',  value: "'B08N5WRWNW'", color: '#A5D6FF' },
  { type: 'KW',   value: 'AND',          color: '#818CF8' },
  { type: 'ID',   value: 'i.quantity',   color: '#E2E8F0' },
  { type: 'OP',   value: '>',            color: '#F59E0B' },
  { type: 'NUM',  value: '0',            color: '#79C0FF' },
];

// Lexer phases
const PHASES = [
  { label: 'Input: Raw SQL string', tokens: [], desc: 'A plain text string arrives from the application over the JDBC connection. The parser has no idea what "SELECT" means yet — it\'s just bytes.' },
  { label: 'Phase 1: Whitespace & Case Normalisation', tokens: TOKENS.slice(0,1), desc: 'The lexer strips whitespace, normalises keywords to uppercase (SELECT, FROM, WHERE), and reads character-by-character.' },
  { label: 'Phase 2: Keyword Recognition', tokens: TOKENS.filter(t=>t.type==='KW'), desc: 'Keywords (SELECT, FROM, JOIN, ON, WHERE, AND) are matched against a reserved word table. They get type KW.' },
  { label: 'Phase 3: Identifiers', tokens: TOKENS.filter(t=>['KW','ID'].includes(t.type)), desc: 'Unquoted names (p.name, products, i) become type ID — they reference catalog objects to be resolved in the semantic analysis phase.' },
  { label: 'Phase 4: Operators & Literals', tokens: TOKENS, desc: 'Operators (=, >) get type OP. String literals get STR. Numbers get NUM. The token stream is now complete.' },
];

function drawTokenStream(ctx, phaseIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (phaseIdx < 0) return;

  const tokens = PHASES[phaseIdx].tokens;
  const tokenH = 34, tokenPad = 6;
  let x = 20, y = 80;
  const maxX = w - 20;

  // Title
  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px system-ui';
  ctx.fillText('Token Stream:', 20, 30);

  // Token legend
  [['KW','Keyword','#818CF8'],['ID','Identifier','#E2E8F0'],['OP','Operator','#F59E0B'],['STR','String','#A5D6FF'],['NUM','Number','#79C0FF'],['PUNC','Punct','#475569']].forEach(([ type, label, color], i) => {
    ctx.fillStyle = color + '33';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(20 + i * 100, 45, 90, 20, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '10px system-ui';
    ctx.fillText(`${type}: ${label}`, 26 + i * 100, 59);
  });

  tokens.forEach(tok => {
    ctx.font = '11px monospace';
    const textW = ctx.measureText(tok.value).width + tokenPad * 2;
    if (x + textW > maxX) { x = 20; y += tokenH + 6; }
    if (y > h - 20) return;

    ctx.fillStyle = tok.color + '22';
    ctx.strokeStyle = tok.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, textW, tokenH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = tok.color;
    ctx.font = '11px monospace';
    ctx.fillText(tok.value, x + tokenPad, y + 14);

    ctx.fillStyle = '#475569';
    ctx.font = '9px system-ui';
    ctx.fillText(tok.type, x + tokenPad, y + 27);

    x += textW + 8;
  });

  // Token count
  ctx.fillStyle = '#64748B';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(`${tokens.length} tokens`, w - 20, 30);
  ctx.textAlign = 'left';
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M10',
    title: 'SQL Parsing',
    subtitle: 'From raw SQL text to a structured token stream — the first step when Amazon\'s checkout fires a query.',
    tabs: [
      { id: 'tokenizer', label: '🔤 Tokeniser' },
      { id: 'stages',    label: '📋 Parser Stages' },
      { id: 'iq',        label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Tokeniser Tab ──────────────────────────────────────────────────────────
  const tokTab = container.querySelector('#tab-tokenizer');
  tokTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="scroll-content" style="padding-bottom:0">
      <div class="section-header">
        <div class="section-title">Canonical Query: Product Availability Check</div>
        <div class="section-desc">This query runs on every Prime Day product page load</div>
      </div>
      <div class="code-block">${QUERY.replace(/</g,'&lt;')}</div>
    </div>
    <div class="canvas-wrap" style="margin-top:8px">
      <canvas width="800" height="360" style="width:100%;max-height:360px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="tok-explainer">
        <h3>Lexer / Tokeniser</h3>
        <p>Press <strong>Play</strong> to watch the SQL string broken into tokens.
           Each token has a type (keyword, identifier, operator, literal) and a value.
           The parse tree is built from this token stream in the next phase.</p>
      </div>
    </div>
  `;

  const canvas = tokTab.querySelector('canvas');
  const ctx    = canvas.getContext('2d');
  const W = 800, H = 360;

  const engine = new SimulationEngine({
    initialState: { phase: -1 },
    steps: PHASES.map((p, i) => ({
      label: p.label,
      duration: 2000,
      mutate: s => { s.phase = i; },
    })),
    onRender: (state) => {
      drawTokenStream(ctx, state.phase, W, H);
      const el = tokTab.querySelector('#tok-explainer');
      if (el && state.phase >= 0) {
        const ph = PHASES[state.phase];
        el.innerHTML = `<h3>${ph.label}</h3><p>${ph.desc}</p>`;
      }
    },
  });

  SimulationEngine.renderControls(tokTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tokTab.querySelector('.canvas-wrap'), engine);
  drawTokenStream(ctx, -1, W, H);
  engine.reset();

  // ── Parser Stages Tab ─────────────────────────────────────────────────────
  container.querySelector('#tab-stages').innerHTML = `
    <div class="info-grid">
      ${[
        {
          step:'1', icon:'🔤', title:'Lexical Analysis (Lexer)',
          color:'#4F46E5',
          desc:'Reads the SQL string character by character and produces a flat token stream. Keywords, identifiers, operators, string/number literals.',
          output:'Token stream: [SELECT, p.name, COMMA, p.price, …]',
        },
        {
          step:'2', icon:'🌳', title:'Syntactic Analysis (Parser)',
          color:'#06B6D4',
          desc:'Consumes the token stream and builds a Concrete Syntax Tree (CST) or Parse Tree according to SQL grammar rules (LL/LALR parser).',
          output:'Parse tree: SelectStatement → SelectList + FromClause + WhereClause',
        },
        {
          step:'3', icon:'🧬', title:'Semantic Analysis',
          color:'#10B981',
          desc:'Resolves names against the catalog: does products table exist? Does p.name column exist? Are types compatible for the JOIN condition?',
          output:'Annotated AST with resolved table IDs, column offsets, types',
        },
        {
          step:'4', icon:'⚠️', title:'Error Detection',
          color:'#EF4444',
          desc:'Syntax errors are caught in step 2 (unmatched parentheses, missing FROM). Semantic errors in step 3 (unknown table, type mismatch).',
          output:'ERROR: column "p.nmae" does not exist (typo caught here)',
        },
        {
          step:'5', icon:'📋', title:'Output: Abstract Syntax Tree',
          color:'#F59E0B',
          desc:'The AST is a simplified, semantically-correct tree with resolved references. This is the input to the query planner/optimizer.',
          output:'AST node: Join(products, inventory, on=product_id) with predicates',
        },
      ].map(s => `
        <div class="info-card" style="border-color:${s.color}33">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:32px;height:32px;border-radius:50%;background:${s.color};
                        color:#fff;display:flex;align-items:center;justify-content:center;
                        font-size:14px;font-weight:800;flex-shrink:0">${s.step}</div>
            <div class="info-card-title">${s.icon} ${s.title}</div>
          </div>
          <div class="info-card-body">${s.desc}</div>
          <div style="margin-top:8px;padding:8px;background:var(--bg3);border-radius:6px;font-size:11px">
            <div style="color:var(--text3);margin-bottom:4px">Output:</div>
            <code style="color:${s.color}">${s.output}</code>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // ── Interview Q&A ─────────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the difference between a lexer and a parser?',
      a: 'The <strong>lexer</strong> (tokeniser) performs lexical analysis: scans raw text character-by-character and groups characters into meaningful tokens (keywords, identifiers, operators, literals). It has no concept of grammar. The <strong>parser</strong> performs syntactic analysis: consumes the token stream and verifies it matches the SQL grammar, building a parse tree. A SELECT with valid tokens but wrong order (e.g., SELECT WHERE FROM) passes the lexer but fails the parser.',
      tip: 'Analogy: lexer = breaking a sentence into words; parser = checking that the sentence follows grammar rules.',
    },
    {
      q: 'What happens when a SQL query has a semantic error vs a syntax error?',
      a: '<strong>Syntax error:</strong> Caught by the parser. Example: <code>SELEC * FROM orders</code> — unrecognised keyword. Error: "syntax error at or near \'SELEC\'".<br><br><strong>Semantic error:</strong> Caught during semantic analysis. Example: <code>SELECT nmae FROM products</code> — valid syntax but \'nmae\' column doesn\'t exist. Error: "column \'nmae\' does not exist". The parser succeeded; the catalog lookup failed.',
      tip: 'Know the difference: syntax = grammatical form; semantic = meaning/existence. Both happen before the optimizer.',
    },
    {
      q: 'How does prepared statement parsing differ from ad-hoc query parsing?',
      a: 'A <strong>prepared statement</strong> (PREPARE + EXECUTE in PostgreSQL) parses and plans the SQL once, then reuses the plan for each execution with different parameter values. This saves parsing + planning time (~1–5ms) on every execution. <strong>Ad-hoc queries</strong> are parsed fresh each time. On Prime Day at 2,170 orders/sec, the checkout SELECT is a prepared statement — saving ~5ms × 2,170/sec = ~10 CPU-seconds/sec of parsing work.',
      tip: 'Prepared statements also prevent SQL injection — parameters are never interpolated into the SQL string.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
