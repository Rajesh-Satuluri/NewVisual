/* ============================================================
   Module: Keys
   Interactive tour of the 9 key types, highlighted live on two
   ShopFlow tables — customers and order_items.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;
  const SVG = IV.SVG;
  const el = SVG.el, esc = SVG.esc;

  /* ── Sample tables ────────────────────────────────────────── */
  const CUSTOMERS = {
    title: 'customers',
    accent: '#3b82f6',
    x: 10, y: 14,
    cols: [
      { name: 'customer_id', w: 96 },
      { name: 'email',       w: 150 },
      { name: 'phone',       w: 104 },
      { name: 'name',        w: 96 },
      { name: 'tier',        w: 54 },
    ],
    rows: [
      ['1001', 'alice@shop.com', '555-0101', 'Alice Chen', 'GOLD'],
      ['1002', 'bob@shop.com',   '555-0102', 'Bob Kumar',  'SILVER'],
      ['1003', 'cara@shop.com',  '555-0103', 'Cara Diaz',  'GOLD'],
    ],
  };

  const ORDER_ITEMS = {
    title: 'order_items',
    accent: '#8b5cf6',
    x: 10, y: 182,
    cols: [
      { name: 'order_id',   w: 104 },
      { name: 'product_id', w: 116 },
      { name: 'quantity',   w: 96 },
      { name: 'unit_price', w: 104 },
    ],
    rows: [
      ['5001', '7001', '2', '19.99'],
      ['5001', '7002', '1', '89.99'],
      ['5002', '7001', '3', '19.99'],
    ],
  };

  /* ── Key types ────────────────────────────────────────────── */
  const KEY_TYPES = [
    {
      id: 'primary', label: 'Primary Key', color: '#3b82f6',
      hl: { customers: [0] },
      what: 'The one candidate key chosen to uniquely identify every row in a table.',
      why: 'Enforces entity integrity — implicitly NOT NULL + UNIQUE. Every table should have exactly one.',
      example: 'PRIMARY KEY (customer_id)',
      trade: 'Referenced everywhere as a foreign key, so changing it later is painful.',
    },
    {
      id: 'candidate', label: 'Candidate Key', color: '#06b6d4',
      hl: { customers: [0, 1, 2] },
      what: 'Any minimal column set that could serve as the primary key — each uniquely identifies a row.',
      why: 'The primary key is picked from among the candidates; the rest stay uniqueness-enforced.',
      example: 'candidates: {customer_id}, {email}, {phone}',
      trade: 'More candidates means more uniqueness constraints to maintain.',
    },
    {
      id: 'composite', label: 'Composite Key', color: '#a855f7',
      hl: { order_items: [0, 1] },
      what: 'A key made of two or more columns because no single column is unique on its own.',
      why: 'order_items repeats each order_id and each product_id — only the pair is unique.',
      example: 'PRIMARY KEY (order_id, product_id)',
      trade: 'Wider keys → larger indexes and more foreign-key columns downstream.',
    },
    {
      id: 'foreign', label: 'Foreign Key', color: '#f59e0b',
      hl: { order_items: [0, 1] },
      what: 'A column that references the primary key of another table.',
      why: 'Enforces referential integrity — you cannot reference an order or product that does not exist.',
      example: 'order_id → orders,  product_id → products',
      trade: 'Constraint checks add write cost and dictate insert/delete ordering.',
    },
    {
      id: 'alternate', label: 'Alternate Key', color: '#10b981',
      hl: { customers: [1, 2] },
      what: 'A candidate key that was NOT chosen as the primary key.',
      why: 'Still uniquely identifies rows, so it is enforced with a UNIQUE index.',
      example: 'email and phone (customer_id won the PK slot)',
      trade: 'Each alternate key is an extra unique index to keep in sync.',
    },
    {
      id: 'super', label: 'Super Key', color: '#ef4444',
      hl: { customers: [0, 3] },
      what: 'Any set of columns that is unique — a candidate key plus zero or more extra columns.',
      why: 'Candidate keys are simply the *minimal* super keys; this formalises what "unique" means.',
      example: '{customer_id, name} is unique but not minimal',
      trade: 'Non-minimal super keys waste space — mostly a teaching concept, rarely declared.',
    },
    {
      id: 'surrogate', label: 'Surrogate Key', color: '#3b82f6',
      hl: { customers: [0] },
      what: 'A system-generated key with no business meaning (SERIAL / identity / UUID).',
      why: 'Compact and stable — it never changes even when the business data around it does.',
      example: 'customer_id SERIAL PRIMARY KEY',
      trade: 'Meaningless on its own — you must join to get human-readable attributes.',
    },
    {
      id: 'natural', label: 'Natural Key', color: '#e3b341',
      hl: { customers: [1] },
      what: 'A key drawn from real-world data that already uniquely identifies a row.',
      why: 'No extra column needed and it carries meaning for humans and integrations.',
      example: 'email as the identifier for a customer',
      trade: 'Real-world values change (people switch email) and can be large or sensitive.',
    },
    {
      id: 'unique', label: 'Unique Key', color: '#2dd4bf',
      hl: { customers: [1, 2] },
      what: 'A constraint guaranteeing no duplicate values in a column (most engines allow one NULL).',
      why: 'Enforces business uniqueness on columns that are not the primary key.',
      example: 'UNIQUE (email),  UNIQUE (phone)',
      trade: 'Every unique index adds cost to inserts and updates.',
    },
  ];

  /* ── Table renderer (v2) ──────────────────────────────────── */
  const TITLE_H = 22, HEAD_H = 24, ROW_H = 26;

  function _renderTable(cfg, hl, hlColor) {
    const totalW = cfg.cols.reduce((s, c) => s + c.w, 0);
    const colLeft = [];
    let cx = cfg.x;
    cfg.cols.forEach(c => { colLeft.push(cx); cx += c.w; });

    const gridY = cfg.y + TITLE_H + 4;
    const bodyH = HEAD_H + cfg.rows.length * ROW_H;
    const parts = [];

    // Title bar + accent strip
    parts.push(el('rect', { x: cfg.x, y: cfg.y, width: totalW, height: TITLE_H, rx: 6,
      fill: cfg.accent + '2a', stroke: cfg.accent + '55' }));
    parts.push(el('rect', { x: cfg.x + 1, y: cfg.y + 1, width: totalW - 2, height: 3, rx: 5,
      fill: cfg.accent + '70' }));
    parts.push(el('text', { x: cfg.x + 10, y: cfg.y + 15, fill: cfg.accent,
      'font-size': 11, 'font-family': 'var(--font-mono, monospace)', 'font-weight': 700 }, esc(cfg.title)));

    // Table outline — deeper dark
    parts.push(el('rect', { x: cfg.x, y: gridY, width: totalW, height: bodyH, rx: 6,
      fill: '#0c1420', stroke: '#1c2b3a' }));

    // Highlight overlays (behind text)
    (hl || []).forEach(ci => {
      parts.push(el('rect', { x: colLeft[ci], y: gridY, width: cfg.cols[ci].w, height: bodyH, rx: 4,
        fill: hlColor + '28', stroke: hlColor, 'stroke-width': 1.5 }));
    });

    // Header text
    cfg.cols.forEach((c, i) => {
      const on = (hl || []).indexOf(i) >= 0;
      parts.push(el('text', { x: colLeft[i] + 8, y: gridY + 16,
        fill: on ? hlColor : '#374151', 'font-size': 10,
        'font-family': 'var(--font-mono, monospace)', 'font-weight': 700 }, esc(c.name)));
    });
    parts.push(el('line', { x1: cfg.x, y1: gridY + HEAD_H, x2: cfg.x + totalW, y2: gridY + HEAD_H,
      stroke: '#1c2b3a' }));

    // Rows
    cfg.rows.forEach((row, r) => {
      const ry = gridY + HEAD_H + r * ROW_H;
      if (r % 2 === 1) {
        parts.push(el('rect', { x: cfg.x, y: ry, width: totalW, height: ROW_H, fill: '#101e2e55' }));
      }
      row.forEach((val, i) => {
        const on = (hl || []).indexOf(i) >= 0;
        parts.push(el('text', { x: colLeft[i] + 8, y: ry + 17,
          fill: on ? '#e2e8f0' : '#4b5563', 'font-size': 10,
          'font-family': 'var(--font-mono, monospace)' }, esc(val)));
      });
    });

    return el('g', {}, parts);
  }

  function _buildDiagram(si) {
    const kt = KEY_TYPES[si];
    const color = kt.color;
    const gradId = 'keysglow' + si;
    const defs = el('defs', {}, [
      el('radialGradient', { id: gradId, cx: '50%', cy: '50%', r: '65%' }, [
        el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.08' }),
        el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }),
      ]),
    ]);
    return el('svg', { viewBox: '0 0 520 340', xmlns: 'http://www.w3.org/2000/svg',
      role: 'img', 'aria-label': kt.label + ' highlighted on the schema' }, [
      defs,
      el('rect', { width: 520, height: 340, fill: '#07090f', rx: 10 }),
      el('rect', { width: 520, height: 340, fill: 'url(#' + gradId + ')', rx: 10 }),
      _renderTable(CUSTOMERS, kt.hl.customers, color),
      _renderTable(ORDER_ITEMS, kt.hl.order_items, color),
    ]);
  }

  /* ── Module scaffold ──────────────────────────────────────── */
  let _engine = null;

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'keys-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: KEY_TYPES.map((k, i) => ({
        label: k.label,
        description: k.what,
        duration: 2600,
        enter() { _updateStep(page, i); },
      })),
    });

    page.querySelectorAll('.keys-pill').forEach(elm => {
      elm.addEventListener('click', () => _engine.goto(parseInt(elm.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  function _updateStep(page, si) {
    const kt = KEY_TYPES[si];

    /* pills */
    page.querySelectorAll('.keys-pill').forEach((elm, i) => {
      const isActive = i === si;
      elm.classList.toggle('active', isActive);
      if (isActive) {
        elm.style.background = kt.color + '18';
        elm.style.color = kt.color;
        elm.style.borderLeftColor = kt.color;
      } else {
        elm.style.background = '';
        elm.style.color = '';
        elm.style.borderLeftColor = 'transparent';
      }
    });

    /* header ambient glow */
    const header = page.querySelector('.keys-header');
    if (header) {
      header.style.background = 'radial-gradient(ellipse at 20% 50%, ' + kt.color + '0c 0%, #161b22 55%)';
    }

    const diagram = page.querySelector('.keys-diagram');
    if (diagram) diagram.innerHTML = _buildDiagram(si);

    const tag = page.querySelector('.keys-tag');
    if (tag) {
      tag.textContent = kt.label;
      tag.style.background = kt.color + '1e';
      tag.style.color = kt.color;
      tag.style.borderColor = kt.color + '40';
    }

    /* info border */
    const info = page.querySelector('.keys-info-panel');
    if (info) info.style.borderLeftColor = kt.color;

    const set = (sel, val) => { const n = page.querySelector(sel); if (n) n.textContent = val; };
    set('.keys-what', kt.what);
    set('.keys-why', kt.why);
    set('.keys-eg', kt.example);
    set('.keys-trade', kt.trade);
  }

  function _buildHTML() {
    const k0 = KEY_TYPES[0];
    const pills = KEY_TYPES.map((k, i) => {
      const active = i === 0;
      const sty = active
        ? ' style="background:' + k.color + '18;color:' + k.color + ';border-left-color:' + k.color + ';"'
        : '';
      return '<button class="keys-pill' + (active ? ' active' : '') + '" data-step="' + i + '"' + sty + '>'
        + esc(k.label) + '</button>';
    }).join('');

    return [
'<style>',
'.keys-page { display: grid; grid-template-rows: auto 1fr; height: calc(100vh - 52px - 52px); overflow: hidden; padding: 0; gap: 0; min-height: 0; }',
'.keys-header { padding: 20px 28px 16px; border-bottom: 1px solid var(--border-default); background: var(--bg-2); position: relative; overflow: hidden; flex-shrink: 0; transition: background 0.3s ease; }',
'.keys-tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; border: 1px solid; margin-bottom: 8px; }',
'.keys-title { font-size: 22px; font-weight: 800; background: linear-gradient(135deg, #e6edf3 0%, #06b6d4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 4px; letter-spacing: -0.02em; }',
'.keys-sub { font-size: 13px; color: var(--text-muted); }',
'.keys-body { display: grid; grid-template-columns: 220px 1fr; gap: 0; overflow: hidden; min-height: 0; }',
'.keys-sidebar { border-right: 1px solid var(--border-default); overflow-y: auto; padding: 10px 6px; background: var(--bg-2); }',
'.keys-pill { display: block; width: 100%; text-align: left; margin-bottom: 3px; border-left: 3px solid transparent; padding: 6px 10px; border-radius: 0 6px 6px 0; font-size: 12.5px; color: var(--text-secondary); background: none; cursor: pointer; border-top: none; border-right: none; border-bottom: none; transition: background 0.12s, color 0.12s; }',
'.keys-pill:hover { background: var(--bg-3); color: var(--text-primary); }',
'.keys-main { display: flex; flex-direction: column; overflow: hidden; min-height: 0; }',
'.keys-diagram { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 12px; background: var(--bg-1); }',
'.keys-diagram svg { max-width: 100%; max-height: 100%; border-radius: 8px; }',
'.keys-info { border-top: 1px solid var(--border-default); border-left: 3px solid transparent; padding: 12px 20px 14px; background: var(--bg-2); flex-shrink: 0; transition: border-left-color 0.2s ease; }',
'.keys-grid { display: grid; grid-template-columns: auto 1fr; column-gap: 14px; row-gap: 4px; align-items: baseline; }',
'.keys-lbl { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; color: var(--text-muted); white-space: nowrap; padding-top: 1px; }',
'.keys-val { font-size: 12.5px; color: var(--text-secondary); line-height: 1.45; }',
'.keys-eg { font-family: var(--font-mono); color: var(--blue); font-size: 11px; }',
'</style>',
'<div class="keys-header">',
'  <div class="keys-tag" style="background:' + k0.color + '1e;color:' + k0.color + ';border-color:' + k0.color + '40;">' + esc(k0.label) + '</div>',
'  <h1 class="keys-title">Keys</h1>',
'  <p class="keys-sub">Nine ways to identify a row. Step through each key type and watch it light up on ShopFlow\'s <code>customers</code> and <code>order_items</code> tables.</p>',
'</div>',
'<div class="keys-body">',
'  <div class="keys-sidebar">' + pills + '</div>',
'  <div class="keys-main">',
'    <div class="keys-diagram">' + _buildDiagram(0) + '</div>',
'    <div class="keys-info keys-info-panel" style="border-left-color:' + k0.color + ';">',
'      <div class="keys-grid">',
'        <span class="keys-lbl">What</span><span class="keys-val keys-what">' + esc(k0.what) + '</span>',
'        <span class="keys-lbl">Why</span><span class="keys-val keys-why">' + esc(k0.why) + '</span>',
'        <span class="keys-lbl">Example</span><span class="keys-val keys-eg">' + esc(k0.example) + '</span>',
'        <span class="keys-lbl">Trade-off</span><span class="keys-val keys-trade">' + esc(k0.trade) + '</span>',
'      </div>',
'    </div>',
'  </div>',
'</div>',
    ].join('\n');
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['keys'] = {
    id: 'keys',
    title: 'Keys',
    group: 'db-design',
    render: _render,
    destroy() {
      if (_engine) { _engine.destroy(); _engine = null; }
      window.IcebergViz.AnimationControls.hide();
    },
  };
})();
