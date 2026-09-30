/* ============================================================
   Module: Relationships — v2 (visual upgrade)
   Cardinality types with Crow's Foot ERD — ShopFlow schema.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;
  const SVG = IV.SVG;
  const el = SVG.el, esc = SVG.esc;

  /* ── Entity layout positions ──────────────────────────────── */
  const ENTITIES = {
    Customer:  { x: 30,  y: 40,  color: '#3b82f6', w: 110, h: 48 },
    Order:     { x: 200, y: 40,  color: '#8b5cf6', w: 100, h: 48 },
    OrderItem: { x: 370, y: 40,  color: '#ef4444', w: 110, h: 48 },
    Product:   { x: 370, y: 155, color: '#10b981', w: 110, h: 48 },
    Seller:    { x: 200, y: 155, color: '#f59e0b', w: 100, h: 48 },
    Payment:   { x: 200, y: 270, color: '#a855f7', w: 100, h: 48 },
    Inventory: { x: 370, y: 270, color: '#06b6d4', w: 110, h: 48 },
    Review:    { x: 30,  y: 155, color: '#f97316', w: 110, h: 48 },
  };

  /* ── Relationship steps ───────────────────────────────────── */
  const STEPS = [
    {
      id: 'one-to-many-intro',
      label: 'One-to-Many',
      color: '#3b82f6',
      active: ['Customer', 'Order'],
      rels: [{ from: 'Customer', to: 'Order', type: 'ONE_TO_MANY', label: 'places' }],
      what: 'One row in A can relate to many rows in B, but each B row links back to exactly one A.',
      why: 'Most common relationship. One customer can place many orders; each order belongs to one customer.',
      example: 'customer_id FK in orders → customers.customer_id PK',
      sql: 'SELECT c.name, COUNT(o.order_id) AS orders\nFROM customers c\nJOIN orders o ON o.customer_id = c.customer_id\nGROUP BY c.name;',
    },
    {
      id: 'one-to-one',
      label: 'One-to-One',
      color: '#a855f7',
      active: ['Order', 'Payment'],
      rels: [{ from: 'Order', to: 'Payment', type: 'ONE_TO_ONE', label: 'paid via' }],
      what: 'Each row in A corresponds to exactly one row in B and vice-versa.',
      why: 'Separates concerns — payment details are isolated in their own table, keeping orders lean.',
      example: 'payment_id FK UNIQUE in payments → orders.order_id',
      sql: 'SELECT o.order_id, p.method, p.status\nFROM orders o\nJOIN payments p ON p.order_id = o.order_id\nWHERE o.order_id = 5001;',
    },
    {
      id: 'many-to-many',
      label: 'Many-to-Many',
      color: '#ef4444',
      active: ['Order', 'OrderItem', 'Product'],
      rels: [
        { from: 'Order',   to: 'OrderItem', type: 'ONE_TO_MANY', label: 'contains' },
        { from: 'Product', to: 'OrderItem', type: 'ONE_TO_MANY', label: 'referenced in' },
      ],
      what: 'Many rows in A can relate to many rows in B. Requires a bridge (junction) table.',
      why: 'One order can contain many products; one product can appear in many orders. order_items is the bridge.',
      example: 'order_items(order_id FK, product_id FK) bridges orders ↔ products',
      sql: 'SELECT p.name, SUM(oi.quantity) AS total_sold\nFROM products p\nJOIN order_items oi ON oi.product_id = p.product_id\nGROUP BY p.name\nORDER BY total_sold DESC;',
    },
    {
      id: 'seller-product',
      label: 'Seller → Products',
      color: '#f59e0b',
      active: ['Seller', 'Product'],
      rels: [{ from: 'Seller', to: 'Product', type: 'ONE_TO_MANY', label: 'lists' }],
      what: 'A seller lists many products; each product is owned by exactly one seller.',
      why: 'Enforces product ownership — queries can filter by seller and guarantee no orphan listings.',
      example: 'seller_id FK in products → sellers.seller_id PK',
      sql: 'SELECT s.name, COUNT(p.product_id) AS listings\nFROM sellers s\nJOIN products p ON p.seller_id = s.seller_id\nGROUP BY s.name\nORDER BY listings DESC;',
    },
    {
      id: 'product-inventory',
      label: 'Product ↔ Inventory',
      color: '#06b6d4',
      active: ['Product', 'Inventory'],
      rels: [{ from: 'Product', to: 'Inventory', type: 'ONE_TO_ONE', label: 'tracked in' }],
      what: 'Each product has exactly one inventory record; each inventory record tracks exactly one product.',
      why: 'Isolates volatile stock data from stable product attributes — hot-row updates stay in inventory only.',
      example: 'product_id FK UNIQUE in inventory → products.product_id',
      sql: 'SELECT p.name, i.qty_on_hand, i.reorder_point\nFROM products p\nJOIN inventory i ON i.product_id = p.product_id\nWHERE i.qty_on_hand < i.reorder_point;',
    },
    {
      id: 'full-schema',
      label: 'Full ShopFlow ERD',
      color: '#58a6ff',
      active: ['Customer', 'Order', 'OrderItem', 'Product', 'Seller', 'Payment', 'Inventory', 'Review'],
      rels: [
        { from: 'Customer', to: 'Order',     type: 'ONE_TO_MANY', label: 'places' },
        { from: 'Order',    to: 'OrderItem', type: 'ONE_TO_MANY', label: 'contains' },
        { from: 'Product',  to: 'OrderItem', type: 'ONE_TO_MANY', label: 'ref in' },
        { from: 'Seller',   to: 'Product',   type: 'ONE_TO_MANY', label: 'lists' },
        { from: 'Customer', to: 'Review',    type: 'ONE_TO_MANY', label: 'writes' },
        { from: 'Product',  to: 'Review',    type: 'ONE_TO_MANY', label: 'receives' },
        { from: 'Order',    to: 'Payment',   type: 'ONE_TO_ONE',  label: 'paid via' },
        { from: 'Product',  to: 'Inventory', type: 'ONE_TO_ONE',  label: 'tracked' },
      ],
      what: 'The complete ShopFlow entity-relationship diagram — 8 entities, 8 relationships.',
      why: 'Every foreign key was a deliberate design choice: isolate concerns, enforce integrity, enable fast joins.',
      example: '6 ONE_TO_MANY + 2 ONE_TO_ONE. No unresolved M:N (order_items bridges orders ↔ products).',
      sql: 'SELECT c.name, COUNT(o.order_id) orders, SUM(oi.unit_price*oi.quantity) revenue\nFROM customers c\nJOIN orders o     ON o.customer_id  = c.customer_id\nJOIN order_items oi ON oi.order_id = o.order_id\nGROUP BY c.name\nORDER BY revenue DESC\nLIMIT 5;',
    },
  ];

  /* ── SVG helpers ──────────────────────────────────────────── */
  function _cx(e) { return e.x + e.w / 2; }
  function _cy(e) { return e.y + e.h / 2; }

  function _entityBox(name, active) {
    var e = ENTITIES[name];
    var isActive = active.indexOf(name) >= 0;
    var c = e.color;

    if (isActive) {
      return el('g', {}, [
        /* glow halo */
        el('rect', { x: e.x - 4, y: e.y - 4, width: e.w + 8, height: e.h + 8, rx: 12,
          fill: c + '14', stroke: c + '30', 'stroke-width': 1 }),
        /* main box */
        el('rect', { x: e.x, y: e.y, width: e.w, height: e.h, rx: 8,
          fill: '#0f1a28', stroke: c, 'stroke-width': 2 }),
        /* top accent stripe */
        el('rect', { x: e.x + 2, y: e.y + 2, width: e.w - 4, height: 4, rx: 6, fill: c + '66' }),
        /* entity name */
        el('text', { x: _cx(e), y: e.y + 24,
          'text-anchor': 'middle', fill: c,
          'font-size': 11, 'font-family': 'var(--font-mono,monospace)', 'font-weight': 700 },
          esc(name)),
        /* pk badge */
        el('text', { x: _cx(e), y: e.y + 39,
          'text-anchor': 'middle', fill: c + '99',
          'font-size': 8, 'font-family': 'var(--font-mono,monospace)' },
          esc(name.toLowerCase() + '_id PK')),
      ]);
    }

    return el('g', {}, [
      el('rect', { x: e.x, y: e.y, width: e.w, height: e.h, rx: 8,
        fill: '#0c1420', stroke: '#1c2b3a', 'stroke-width': 1 }),
      el('text', { x: _cx(e), y: e.y + 24,
        'text-anchor': 'middle', fill: '#2d4060',
        'font-size': 11, 'font-family': 'var(--font-mono,monospace)', 'font-weight': 700 },
        esc(name)),
      el('text', { x: _cx(e), y: e.y + 39,
        'text-anchor': 'middle', fill: '#1a2b3d',
        'font-size': 8, 'font-family': 'var(--font-mono,monospace)' },
        esc(name.toLowerCase() + '_id PK')),
    ]);
  }

  /* Crow's Foot: colored per step */
  function _connection(rel, stepColor) {
    var A = ENTITIES[rel.from];
    var B = ENTITIES[rel.to];
    if (!A || !B) return '';

    var ax = _cx(A), ay = _cy(A);
    var bx = _cx(B), by = _cy(B);

    var x1, y1, x2, y2;
    var dx = bx - ax, dy = by - ay;
    if (Math.abs(dx) > Math.abs(dy)) {
      x1 = dx > 0 ? A.x + A.w : A.x;
      y1 = ay;
      x2 = dx > 0 ? B.x : B.x + B.w;
      y2 = by;
    } else {
      x1 = ax;
      y1 = dy > 0 ? A.y + A.h : A.y;
      x2 = bx;
      y2 = dy > 0 ? B.y : B.y + B.h;
    }

    var color = stepColor + 'bb';
    var parts = [];

    var midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    var d = 'M' + x1 + ',' + y1 + ' C' + midX + ',' + y1 + ' ' + midX + ',' + y2 + ' ' + x2 + ',' + y2;
    parts.push(el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.8 }));

    /* ONE side tick */
    var tLen = 6;
    if (Math.abs(dx) > Math.abs(dy)) {
      var dirA = dx > 0 ? 1 : -1;
      parts.push(el('line', { x1: x1 + dirA * 4, y1: y1 - tLen, x2: x1 + dirA * 4, y2: y1 + tLen,
        stroke: color, 'stroke-width': 1.8 }));
    } else {
      var dirA2 = dy > 0 ? 1 : -1;
      parts.push(el('line', { x1: x1 - tLen, y1: y1 + dirA2 * 4, x2: x1 + tLen, y2: y1 + dirA2 * 4,
        stroke: color, 'stroke-width': 1.8 }));
    }

    /* MANY / ONE_TO_ONE end */
    if (rel.type === 'ONE_TO_MANY') {
      if (Math.abs(dx) > Math.abs(dy)) {
        var dirB = dx > 0 ? -1 : 1;
        parts.push(el('line', { x1: x2, y1: y2, x2: x2 + dirB * 8, y2: y2 - 7, stroke: color, 'stroke-width': 1.8 }));
        parts.push(el('line', { x1: x2, y1: y2, x2: x2 + dirB * 8, y2: y2 + 7, stroke: color, 'stroke-width': 1.8 }));
        parts.push(el('line', { x1: x2 + dirB * 8, y1: y2 - tLen, x2: x2 + dirB * 8, y2: y2 + tLen,
          stroke: color, 'stroke-width': 1.8 }));
      } else {
        var dirB2 = dy > 0 ? -1 : 1;
        parts.push(el('line', { x1: x2, y1: y2, x2: x2 - 7, y2: y2 + dirB2 * 8, stroke: color, 'stroke-width': 1.8 }));
        parts.push(el('line', { x1: x2, y1: y2, x2: x2 + 7, y2: y2 + dirB2 * 8, stroke: color, 'stroke-width': 1.8 }));
        parts.push(el('line', { x1: x2 - tLen, y1: y2 + dirB2 * 8, x2: x2 + tLen, y2: y2 + dirB2 * 8,
          stroke: color, 'stroke-width': 1.8 }));
      }
    } else {
      if (Math.abs(dx) > Math.abs(dy)) {
        var dirC = dx > 0 ? -1 : 1;
        parts.push(el('line', { x1: x2 + dirC * 4, y1: y2 - tLen, x2: x2 + dirC * 4, y2: y2 + tLen,
          stroke: color, 'stroke-width': 1.8 }));
      } else {
        var dirC2 = dy > 0 ? -1 : 1;
        parts.push(el('line', { x1: x2 - tLen, y1: y2 + dirC2 * 4, x2: x2 + tLen, y2: y2 + dirC2 * 4,
          stroke: color, 'stroke-width': 1.8 }));
      }
    }

    /* relationship label */
    parts.push(el('text', { x: midX, y: midY - 5, 'text-anchor': 'middle',
      fill: stepColor + 'dd', 'font-size': 8, 'font-family': 'var(--font-mono,monospace)',
      'font-weight': 600 }, esc(rel.label)));

    return el('g', {}, parts);
  }

  function _buildDiagram(si) {
    var step = STEPS[si];
    var sc = step.color;
    var gradId = 'relglow' + si;
    var entityNames = Object.keys(ENTITIES);

    var defs = el('defs', {}, [
      el('radialGradient', { id: gradId, cx: '50%', cy: '50%', r: '65%' }, [
        el('stop', { offset: '0%', 'stop-color': sc, 'stop-opacity': '0.07' }),
        el('stop', { offset: '100%', 'stop-color': sc, 'stop-opacity': '0' }),
      ]),
    ]);

    var connLines = step.rels.map(function (r) { return _connection(r, sc); });
    var boxes = entityNames.map(function (n) { return _entityBox(n, step.active); });

    return el('svg', { viewBox: '0 0 530 340', xmlns: 'http://www.w3.org/2000/svg',
      role: 'img', 'aria-label': step.label + ' relationship diagram' }, [
      defs,
      el('rect', { width: 530, height: 340, fill: '#07090f', rx: 10 }),
      el('rect', { width: 530, height: 340, fill: 'url(#' + gradId + ')', rx: 10 }),
      el('g', {}, connLines),
      el('g', {}, boxes),
    ]);
  }

  /* ── Module scaffold ──────────────────────────────────────── */
  var _engine = null;

  function _buildHTML() {
    var s0 = STEPS[0];
    var pills = STEPS.map(function (s, i) {
      var active = i === 0;
      var sty = active
        ? ' style="background:' + s.color + '18;color:' + s.color + ';border-left-color:' + s.color + ';"'
        : '';
      return '<button class="rel-pill' + (active ? ' active' : '') + '" data-step="' + i + '"' + sty + '>'
        + esc(s.label) + '</button>';
    }).join('');

    return [
'<style>',
'.rel-page { display: grid; grid-template-rows: auto 1fr; height: calc(100vh - 52px - 52px); overflow: hidden; padding: 0; gap: 0; min-height: 0; }',
'.rel-header { padding: 20px 28px 16px; border-bottom: 1px solid var(--border-default); background: var(--bg-2); position: relative; overflow: hidden; flex-shrink: 0; transition: background 0.3s ease; }',
'.rel-tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; border: 1px solid; margin-bottom: 8px; }',
'.rel-title { font-size: 22px; font-weight: 800; background: linear-gradient(135deg, #e6edf3 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 4px; letter-spacing: -0.02em; }',
'.rel-sub { font-size: 13px; color: var(--text-muted); }',
'.rel-body { display: grid; grid-template-columns: 190px 1fr; gap: 0; overflow: hidden; min-height: 0; }',
'.rel-sidebar { border-right: 1px solid var(--border-default); overflow-y: auto; padding: 10px 6px; background: var(--bg-2); }',
'.rel-pill { display: block; width: 100%; text-align: left; margin-bottom: 3px; border-left: 3px solid transparent; padding: 6px 10px 6px 10px; border-radius: 0 6px 6px 0; font-size: 12.5px; color: var(--text-secondary); background: none; cursor: pointer; border-top: none; border-right: none; border-bottom: none; transition: background 0.12s, color 0.12s; }',
'.rel-pill:hover { background: var(--bg-3); color: var(--text-primary); }',
'.rel-main { display: flex; flex-direction: column; overflow: hidden; min-height: 0; }',
'.rel-diagram { flex: 1; min-height: 0; position: relative; overflow: hidden; background: var(--bg-1); }',
'.rel-diagram svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; }',
'.rel-info { border-top: 1px solid var(--border-default); border-left: 3px solid transparent; padding: 10px 20px 12px; background: var(--bg-2); flex: 0 0 auto; max-height: 195px; overflow-y: auto; transition: border-left-color 0.2s ease; }',
'.rel-grid { display: grid; grid-template-columns: auto 1fr; column-gap: 14px; row-gap: 4px; align-items: baseline; }',
'.rel-lbl { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; color: var(--text-muted); white-space: nowrap; padding-top: 1px; }',
'.rel-val { font-size: 12.5px; color: var(--text-secondary); line-height: 1.45; }',
'.rel-eg { font-family: var(--font-mono); color: var(--blue); font-size: 11px; }',
'.rel-sql { font-family: var(--font-mono); color: #4ade80; font-size: 10.5px; white-space: pre; background: #070d14; border: 1px solid #1a2537; border-radius: 6px; padding: 6px 10px; overflow-x: auto; max-height: 72px; overflow-y: auto; }',
'</style>',
'<div class="rel-header">',
'  <div class="rel-tag" style="background:' + s0.color + '1e;color:' + s0.color + ';border-color:' + s0.color + '40;">' + esc(s0.label) + '</div>',
'  <h1 class="rel-title">Relationships</h1>',
'  <p class="rel-sub">How ShopFlow\'s 8 entities connect. Crow\'s Foot notation shows cardinality live on the ERD.</p>',
'</div>',
'<div class="rel-body">',
'  <div class="rel-sidebar">' + pills + '</div>',
'  <div class="rel-main">',
'    <div class="rel-diagram rel-diagram-slot">' + _buildDiagram(0) + '</div>',
'    <div class="rel-info rel-info-panel" style="border-left-color:' + s0.color + ';">',
'      <div class="rel-grid">',
'        <span class="rel-lbl">What</span><span class="rel-val rel-what">' + esc(s0.what) + '</span>',
'        <span class="rel-lbl">Why</span><span class="rel-val rel-why">' + esc(s0.why) + '</span>',
'        <span class="rel-lbl">Example</span><span class="rel-val rel-eg rel-example">' + esc(s0.example) + '</span>',
'        <span class="rel-lbl">SQL</span><span class="rel-val"><pre class="rel-sql rel-sql-slot">' + esc(s0.sql) + '</pre></span>',
'      </div>',
'    </div>',
'  </div>',
'</div>',
    ].join('\n');
  }

  function _updateStep(page, si) {
    var s = STEPS[si];

    /* pills */
    page.querySelectorAll('.rel-pill').forEach(function (elm, i) {
      var isActive = i === si;
      elm.classList.toggle('active', isActive);
      if (isActive) {
        elm.style.background = s.color + '18';
        elm.style.color = s.color;
        elm.style.borderLeftColor = s.color;
      } else {
        elm.style.background = '';
        elm.style.color = '';
        elm.style.borderLeftColor = 'transparent';
      }
    });

    /* header ambient glow */
    var header = page.querySelector('.rel-header');
    if (header) {
      header.style.background = 'radial-gradient(ellipse at 20% 50%, ' + s.color + '0c 0%, #161b22 55%)';
    }

    /* step tag */
    var tag = page.querySelector('.rel-tag');
    if (tag) {
      tag.textContent = s.label;
      tag.style.background = s.color + '1e';
      tag.style.color = s.color;
      tag.style.borderColor = s.color + '40';
    }

    /* diagram */
    var diag = page.querySelector('.rel-diagram-slot');
    if (diag) diag.innerHTML = _buildDiagram(si);

    /* info panel border */
    var info = page.querySelector('.rel-info-panel');
    if (info) info.style.borderLeftColor = s.color;

    var set = function (sel, val) { var n = page.querySelector(sel); if (n) n.textContent = val; };
    set('.rel-what', s.what);
    set('.rel-why', s.why);
    set('.rel-example', s.example);
    set('.rel-sql-slot', s.sql);
  }

  function _render(container) {
    container.innerHTML = '';
    var page = document.createElement('div');
    page.className = 'rel-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map(function (s, i) {
        return {
          label: s.label,
          description: s.what,
          duration: 3000,
          enter: function () { _updateStep(page, i); },
        };
      }),
    });

    page.querySelectorAll('.rel-pill').forEach(function (elm) {
      elm.addEventListener('click', function () {
        _engine.goto(parseInt(elm.dataset.step, 10));
      });
    });

    IV.AnimationControls.register(_engine);
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['relationships'] = {
    id: 'relationships',
    title: 'Relationships',
    group: 'db-design',
    render: _render,
    destroy: function () {
      if (_engine) { _engine.destroy(); _engine = null; }
      window.IcebergViz.AnimationControls.hide();
    },
  };
})();
