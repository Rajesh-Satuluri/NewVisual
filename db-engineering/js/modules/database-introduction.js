/* ============================================================
   Module: Why Databases Exist
   Animated journey: Excel → CSV → Multiple CSVs → Database
   Business narrative: ShopFlow, the 50M-customer e-commerce co.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Steps ────────────────────────────────────────────────────── */
  const STEPS = [
    {
      label: 'ShopFlow Day 1',
      desc: 'Founder opens Excel. Types 1,000 products by hand.',
      insight: 'One file. One user. No problems... yet.',
      tag: 'The Beginning',
    },
    {
      label: 'Excel Fails',
      desc: 'ShopFlow reaches 50,000 products. Duplicates everywhere. Searching takes 30 seconds.',
      insight: 'Problem: O(n) search, no relationships, single user, no integrity.',
      tag: 'Problem 1',
    },
    {
      label: 'CSV Files',
      desc: 'Export to CSV for "portability". Now products.csv, orders.csv, customers.csv exist.',
      insight: 'Problem: No joins. Referential integrity is manual. Corruption on crash.',
      tag: 'Problem 2',
    },
    {
      label: 'Concurrent Access',
      desc: '5 employees try to update the CSV at the same time. Two saves overwrite each other.',
      insight: 'Problem: No locking. Last-write-wins. Data is silently destroyed.',
      tag: 'Problem 3',
    },
    {
      label: 'No Data Integrity',
      desc: 'Typos go in. "price" column gets "FREE". Order references a deleted product.',
      insight: 'Problem: No constraints. No foreign keys. Garbage in, garbage out.',
      tag: 'Problem 4',
    },
    {
      label: 'Enter: The Database',
      desc: 'ShopFlow migrates to PostgreSQL. Structured storage. ACID guarantees. Indexes.',
      insight: 'Solution: Transactions, constraints, indexes, concurrent safe reads/writes.',
      tag: 'Solution',
    },
    {
      label: 'SQL: The Language',
      desc: 'Declarative queries. The optimizer figures out HOW - you say WHAT.',
      insight: "SELECT * FROM orders WHERE customer_id = 42 AND status = 'shipped'",
      tag: 'SQL Power',
    },
    {
      label: 'ShopFlow Today',
      desc: '50M customers. 5M orders/day. Sub-10ms queries. 99.99% uptime. All on PostgreSQL.',
      insight: 'This is what you will learn to build in this course.',
      tag: 'The Result',
    },
  ];

  /* ── Module registration ──────────────────────────────────────── */
  let _engine = null;

  function _render(container) {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'di-page page-enter';
    page.innerHTML = _buildHTML();
    container.appendChild(page);

    _engine = new IV.AnimationEngine({
      steps: STEPS.map(function(s, i) {
        return {
          label: s.label,
          description: s.desc,
          duration: 2400,
          enter: function(ctx) { _updateStep(page, i); },
        };
      }),
    });

    page.querySelectorAll('.di-pill').forEach(function(el) {
      el.addEventListener('click', function() { _engine.goto(parseInt(el.dataset.step, 10)); });
    });

    IV.AnimationControls.register(_engine);
  }

  /* ── Step update ─────────────────────────────────────────── */
  function _updateStep(page, si) {
    const s = STEPS[si];

    // Pills
    page.querySelectorAll('.di-pill').forEach(function(el, i) {
      el.classList.toggle('active', i === si);
    });

    // Diagram
    const diagramArea = page.querySelector('.di-diagram');
    if (diagramArea) {
      diagramArea.innerHTML = _buildDiagram(si);
    }

    // Info panel
    const tagEl = page.querySelector('.di-tag');
    const descEl = page.querySelector('.di-desc');
    const insightEl = page.querySelector('.di-insight');
    if (tagEl) tagEl.textContent = s.tag;
    if (descEl) descEl.textContent = s.desc;
    if (insightEl) insightEl.textContent = s.insight;

    // Tag color
    const tagColors = ['#3b82f6','#ef4444','#f59e0b','#ef4444','#ef4444','#10b981','#a855f7','#06b6d4'];
    if (tagEl) {
      tagEl.style.background = (tagColors[si] || '#3b82f6') + '18';
      tagEl.style.color = tagColors[si] || '#3b82f6';
      tagEl.style.borderColor = (tagColors[si] || '#3b82f6') + '30';
    }
  }

  /* ── Diagrams ─────────────────────────────────────────────── */
  function _buildDiagram(si) {
    var diagrams = [
      _svgExcel(),
      _svgExcelFails(),
      _svgCsvFiles(),
      _svgConcurrency(),
      _svgNoIntegrity(),
      _svgDatabase(),
      _svgSQL(),
      _svgShopFlowToday(),
    ];
    return diagrams[si] || diagrams[0];
  }

  function _svgExcel() {
    var rows = [
      ['1001','Blue T-Shirt','19.99','42'],
      ['1002','Red Sneakers','89.99','7'],
      ['1003','Blue T-Shirt','19.99','38'],
      ['1004','Laptop Stand','34.99','15'],
      ['1005','Blue T-Shirt','21.99','12'],
    ];
    var rowSvg = rows.map(function(r, i) {
      var y = 80 + i * 26;
      var bg = i % 2 === 0 ? '#1a2235' : '#1e2a3a';
      var dup = r[1] === 'Blue T-Shirt';
      return '<rect x="60" y="' + y + '" width="360" height="26" fill="' + bg + '"/>'
        + '<text x="90" y="' + (y+17) + '" fill="#94a3b8" font-size="10" font-family="system-ui">' + r[0] + '</text>'
        + '<text x="195" y="' + (y+17) + '" fill="' + (dup ? '#ef4444' : '#e2e8f0') + '" font-size="10" font-family="system-ui">' + r[1] + (dup ? ' ⚠' : '') + '</text>'
        + '<text x="300" y="' + (y+17) + '" fill="' + (dup ? '#f59e0b' : '#94a3b8') + '" font-size="10" font-family="system-ui">$' + r[2] + '</text>'
        + '<text x="380" y="' + (y+17) + '" fill="#94a3b8" font-size="10" font-family="system-ui">' + r[3] + '</text>';
    }).join('');
    return '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Excel spreadsheet">'
      + '<rect width="480" height="300" fill="#0f172a" rx="8"/>'
      + '<rect x="60" y="30" width="360" height="240" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1"/>'
      + '<rect x="60" y="30" width="360" height="28" rx="6" fill="#273344" stroke="#334155" stroke-width="1"/>'
      + '<text x="240" y="50" fill="#94a3b8" font-size="11" text-anchor="middle" font-family="system-ui">products.xlsx</text>'
      + '<rect x="60" y="58" width="360" height="22" fill="#1d3a2a" stroke="#16a34a30" stroke-width="1"/>'
      + '<text x="90" y="74" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">product_id</text>'
      + '<text x="195" y="74" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">name</text>'
      + '<text x="300" y="74" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">price</text>'
      + '<text x="380" y="74" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">stock</text>'
      + rowSvg
      + '<rect x="170" y="268" width="140" height="20" rx="4" fill="#ef444418" stroke="#ef444440"/>'
      + '<text x="240" y="282" fill="#ef4444" font-size="10" text-anchor="middle" font-family="system-ui">3 duplicate products!</text>'
      + '</svg>';
  }

  function _svgExcelFails() {
    var problems = [
      ['#ef4444','O(n) Search','Must scan ALL 50K rows for every search. Takes 30 seconds.'],
      ['#f59e0b','Duplicates','No UNIQUE constraint. Same product entered 3 times by mistake.'],
      ['#f97316','No Joins','Customer orders reference product IDs manually. No FK enforcement.'],
      ['#a855f7','Single User','Only one person can edit the file at a time. No concurrent access.'],
      ['#ef4444','No History','Overwrite the file = data is gone forever. No audit trail.'],
    ];
    var probSvg = problems.map(function(p, i) {
      var y = 88 + i * 42;
      return '<rect x="40" y="' + y + '" width="400" height="36" rx="6" fill="' + p[0] + '08" stroke="' + p[0] + '25"/>'
        + '<circle cx="62" cy="' + (y+18) + '" r="7" fill="' + p[0] + '20"/>'
        + '<text x="62" y="' + (y+22) + '" fill="' + p[0] + '" font-size="11" text-anchor="middle" font-family="system-ui" font-weight="700">!</text>'
        + '<text x="78" y="' + (y+14) + '" fill="' + p[0] + '" font-size="11" font-family="system-ui" font-weight="600">' + p[1] + '</text>'
        + '<text x="78" y="' + (y+27) + '" fill="#94a3b8" font-size="10" font-family="system-ui">' + p[2] + '</text>';
    }).join('');
    return '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="480" height="300" fill="#0f172a" rx="8"/>'
      + '<text x="240" y="38" fill="#f87171" font-size="14" text-anchor="middle" font-family="system-ui" font-weight="700">50,000 products. Searching...</text>'
      + '<rect x="40" y="52" width="400" height="16" rx="3" fill="#1e293b" stroke="#334155"/>'
      + '<rect x="40" y="52" width="340" height="16" rx="3" fill="#ef444415" stroke="#ef444430"/>'
      + probSvg
      + '</svg>';
  }

  function _svgCsvFiles() {
    var files = [
      { x: 40, label: 'products.csv', color: '#3b82f6', rows: ['id,name,price', '1001,T-Shirt,19.99', '1002,Sneakers,89.99', '...50K rows'] },
      { x: 180, label: 'orders.csv', color: '#10b981', rows: ['id,customer_id,prod', '5001,101,1001', '5002,102,1001', '...500K rows'] },
      { x: 320, label: 'customers.csv', color: '#f59e0b', rows: ['id,name,email', '101,Alice,a@x.com', '102,Bob,b@x.com', '...10K rows'] },
    ];
    var filesSvg = files.map(function(f) {
      var rowsSvg = f.rows.map(function(r, ri) {
        return '<text x="' + (f.x+8) + '" y="' + (85 + ri * 18) + '" fill="#64748b" font-size="9" font-family="monospace">' + r + '</text>';
      }).join('');
      return '<rect x="' + f.x + '" y="48" width="120" height="140" rx="6" fill="#1e293b" stroke="' + f.color + '40"/>'
        + '<rect x="' + f.x + '" y="48" width="120" height="24" rx="6" fill="' + f.color + '15"/>'
        + '<text x="' + (f.x+60) + '" y="64" fill="' + f.color + '" font-size="10" text-anchor="middle" font-family="system-ui" font-weight="600">' + f.label + '</text>'
        + rowsSvg;
    }).join('');
    return '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="480" height="300" fill="#0f172a" rx="8"/>'
      + '<text x="240" y="32" fill="#94a3b8" font-size="12" text-anchor="middle" font-family="system-ui">CSV files — data is now scattered</text>'
      + filesSvg
      + '<path d="M160 118 L180 118" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 3"/>'
      + '<path d="M300 118 L320 118" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 3"/>'
      + '<text x="170" y="113" fill="#ef4444" font-size="9" font-family="system-ui">?</text>'
      + '<text x="310" y="113" fill="#ef4444" font-size="9" font-family="system-ui">?</text>'
      + '<rect x="40" y="204" width="400" height="30" rx="6" fill="#ef444410" stroke="#ef444430"/>'
      + '<text x="240" y="224" fill="#ef4444" font-size="11" text-anchor="middle" font-family="system-ui">No joins. Broken references. Manual reconciliation every night.</text>'
      + '<rect x="40" y="244" width="400" height="30" rx="6" fill="#f59e0b10" stroke="#f59e0b30"/>'
      + '<text x="240" y="264" fill="#f59e0b" font-size="11" text-anchor="middle" font-family="system-ui">CSV crash = corrupt file. Delete a customer = orphan orders.</text>'
      + '</svg>';
  }

  function _svgConcurrency() {
    return '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="480" height="300" fill="#0f172a" rx="8"/>'
      + '<text x="240" y="28" fill="#f87171" font-size="13" text-anchor="middle" font-family="system-ui" font-weight="700">Two employees save simultaneously</text>'
      + '<rect x="30" y="44" width="130" height="80" rx="8" fill="#1e293b" stroke="#3b82f640"/>'
      + '<text x="95" y="62" fill="#3b82f6" font-size="11" text-anchor="middle" font-family="system-ui" font-weight="600">Employee A</text>'
      + '<text x="95" y="78" fill="#64748b" font-size="10" text-anchor="middle" font-family="system-ui">Reads stock: 42</text>'
      + '<text x="95" y="93" fill="#64748b" font-size="10" text-anchor="middle" font-family="system-ui">Sells 5 units</text>'
      + '<text x="95" y="108" fill="#3b82f6" font-size="10" text-anchor="middle" font-family="system-ui">Saves: stock = 37</text>'
      + '<rect x="320" y="44" width="130" height="80" rx="8" fill="#1e293b" stroke="#10b98140"/>'
      + '<text x="385" y="62" fill="#10b981" font-size="11" text-anchor="middle" font-family="system-ui" font-weight="600">Employee B</text>'
      + '<text x="385" y="78" fill="#64748b" font-size="10" text-anchor="middle" font-family="system-ui">Reads stock: 42</text>'
      + '<text x="385" y="93" fill="#64748b" font-size="10" text-anchor="middle" font-family="system-ui">Sells 10 units</text>'
      + '<text x="385" y="108" fill="#10b981" font-size="10" text-anchor="middle" font-family="system-ui">Saves: stock = 32</text>'
      + '<rect x="185" y="54" width="110" height="60" rx="6" fill="#1a2235" stroke="#ef444440"/>'
      + '<text x="240" y="78" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="system-ui">products.csv</text>'
      + '<text x="240" y="96" fill="#e2e8f0" font-size="13" text-anchor="middle" font-family="system-ui" font-weight="700">stock = 42</text>'
      + '<rect x="160" y="150" width="160" height="60" rx="8" fill="#ef444415" stroke="#ef4444"/>'
      + '<text x="240" y="173" fill="#ef4444" font-size="12" text-anchor="middle" font-family="system-ui" font-weight="700">RESULT: stock = 32</text>'
      + '<text x="240" y="192" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="system-ui">Should be 27 (42 - 5 - 10)</text>'
      + '<text x="240" y="206" fill="#f59e0b" font-size="10" text-anchor="middle" font-family="system-ui">15 units oversold!</text>'
      + '<rect x="100" y="228" width="280" height="42" rx="6" fill="#ef444408" stroke="#ef444420"/>'
      + '<text x="240" y="248" fill="#ef4444" font-size="11" text-anchor="middle" font-family="system-ui" font-weight="600">Lost-Update Problem</text>'
      + '<text x="240" y="264" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="system-ui">Without locking, concurrent writes destroy data silently</text>'
      + '</svg>';
  }

  function _svgNoIntegrity() {
    var badRows = [
      { oid:'5001', cid:'101',  pid:'1001', price:'19.99', ok: true },
      { oid:'5002', cid:'9999', pid:'1001', price:'19.99', ok: false, err: 'customer 9999 deleted!' },
      { oid:'5003', cid:'102',  pid:'FREE', price:'FREE',  ok: false, err: 'typo in product_id and price!' },
      { oid:'5004', cid:'101',  pid:'-1',   price:'-50',   ok: false, err: 'negative values allowed' },
      { oid:'5005', cid:'',     pid:'1002', price:'89.99', ok: false, err: 'null customer_id!' },
    ];
    var rowsSvg = badRows.map(function(r, i) {
      var y = 66 + i * 30;
      var bg = r.ok ? '#1a2235' : '#ef444408';
      var strokeAttr = r.ok ? '' : ' stroke="#ef444440" stroke-width="1"';
      return '<rect x="30" y="' + y + '" width="420" height="26" rx="3" fill="' + bg + '"' + strokeAttr + '/>'
        + '<text x="70" y="' + (y+17) + '" fill="' + (r.ok ? '#94a3b8' : '#ef4444') + '" font-size="10" font-family="system-ui">' + r.oid + '</text>'
        + '<text x="160" y="' + (y+17) + '" fill="' + (r.cid === '' || r.cid === '9999' ? '#ef4444' : '#94a3b8') + '" font-size="10" font-family="system-ui">' + (r.cid || 'NULL') + '</text>'
        + '<text x="260" y="' + (y+17) + '" fill="' + (r.pid === 'FREE' || r.pid === '-1' ? '#f59e0b' : '#94a3b8') + '" font-size="10" font-family="system-ui">' + r.pid + '</text>'
        + '<text x="360" y="' + (y+17) + '" fill="' + (r.price === 'FREE' || r.price === '-50' ? '#f59e0b' : '#94a3b8') + '" font-size="10" font-family="system-ui">' + r.price + '</text>'
        + (r.err ? '<text x="34" y="' + (y+25) + '" fill="#ef444470" font-size="8" font-family="system-ui">' + r.err + '</text>' : '');
    }).join('');
    return '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="480" height="300" fill="#0f172a" rx="8"/>'
      + '<text x="240" y="28" fill="#f87171" font-size="13" text-anchor="middle" font-family="system-ui" font-weight="700">No constraints = garbage data</text>'
      + '<rect x="30" y="44" width="420" height="22" rx="3" fill="#1d3a2a" stroke="#16a34a20"/>'
      + '<text x="70" y="59" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">order_id</text>'
      + '<text x="160" y="59" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">customer_id</text>'
      + '<text x="260" y="59" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">product_id</text>'
      + '<text x="360" y="59" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">price</text>'
      + rowsSvg
      + '<rect x="30" y="222" width="420" height="56" rx="6" fill="#1e293b" stroke="#334155"/>'
      + '<text x="240" y="240" fill="#f59e0b" font-size="11" text-anchor="middle" font-family="system-ui" font-weight="600">Missing constraints: NOT NULL, FOREIGN KEY, CHECK (price &gt; 0)</text>'
      + '<text x="240" y="257" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="system-ui">Any value can be inserted. No referential integrity. Data rot.</text>'
      + '<text x="240" y="272" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="system-ui">You only discover errors months later during an audit.</text>'
      + '</svg>';
  }

  function _svgDatabase() {
    var props = [
      { angle: -100, label: 'ACID',        sub: 'Transactions',   color: '#10b981' },
      { angle: -50,  label: 'Indexes',     sub: 'O(log n)',       color: '#3b82f6' },
      { angle: 0,    label: 'Constraints', sub: 'FK, PK, CHECK',  color: '#f59e0b' },
      { angle: 50,   label: 'Concurrency', sub: 'MVCC Locking',   color: '#a855f7' },
      { angle: 100,  label: 'Recovery',    sub: 'WAL + Backup',   color: '#06b6d4' },
    ];
    var propsSvg = props.map(function(prop) {
      var rad = (prop.angle * Math.PI) / 180;
      var r = 118;
      var lx = 240 + r * Math.sin(rad);
      var ly = 130 + r * -Math.cos(rad);
      var lx2 = 240 + 76 * Math.sin(rad);
      var ly2 = 130 + 76 * -Math.cos(rad);
      return '<line x1="' + lx2.toFixed(1) + '" y1="' + ly2.toFixed(1) + '" x2="' + lx.toFixed(1) + '" y2="' + ly.toFixed(1) + '" stroke="' + prop.color + '" stroke-width="1" stroke-dasharray="4 3"/>'
        + '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="22" fill="' + prop.color + '15" stroke="' + prop.color + '40"/>'
        + '<text x="' + lx.toFixed(1) + '" y="' + (ly - 4).toFixed(1) + '" fill="' + prop.color + '" font-size="9" text-anchor="middle" font-family="system-ui" font-weight="700">' + prop.label + '</text>'
        + '<text x="' + lx.toFixed(1) + '" y="' + (ly + 8).toFixed(1) + '" fill="' + prop.color + '90" font-size="8" text-anchor="middle" font-family="system-ui">' + prop.sub + '</text>';
    }).join('');
    return '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="di-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#0a1628"/></linearGradient></defs>'
      + '<rect width="480" height="300" fill="url(#di-bg)" rx="8"/>'
      + '<text x="240" y="28" fill="#4ade80" font-size="13" text-anchor="middle" font-family="system-ui" font-weight="700">PostgreSQL: All problems solved</text>'
      + '<ellipse cx="240" cy="90" rx="70" ry="18" fill="#1e40af" stroke="#3b82f6" stroke-width="1.5"/>'
      + '<rect x="170" y="90" width="140" height="80" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.5"/>'
      + '<ellipse cx="240" cy="170" rx="70" ry="18" fill="#1d4ed8" stroke="#3b82f6" stroke-width="1.5"/>'
      + '<text x="240" y="136" fill="#93c5fd" font-size="12" text-anchor="middle" font-family="system-ui" font-weight="700">PostgreSQL</text>'
      + propsSvg
      + '<rect x="100" y="256" width="280" height="28" rx="6" fill="#10b98118" stroke="#10b98140"/>'
      + '<text x="240" y="274" fill="#4ade80" font-size="11" text-anchor="middle" font-family="system-ui" font-weight="600">ShopFlow: from 1K to 500M products. Same database engine.</text>'
      + '</svg>';
  }

  function _svgSQL() {
    return '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="480" height="300" fill="#0f172a" rx="8"/>'
      + '<text x="240" y="26" fill="#a78bfa" font-size="13" text-anchor="middle" font-family="system-ui" font-weight="700">SQL: You say WHAT, the engine figures out HOW</text>'
      + '<rect x="30" y="40" width="420" height="100" rx="8" fill="#1e293b" stroke="#6366f140"/>'
      + '<text x="46" y="62" fill="#94a3b8" font-size="10" font-family="monospace">-- Find all shipped orders for VIP customers today</text>'
      + '<text x="46" y="80" fill="#a78bfa" font-size="11" font-family="monospace" font-weight="600">SELECT</text>'
      + '<text x="112" y="80" fill="#e2e8f0" font-size="11" font-family="monospace"> o.order_id, c.name, SUM(i.price) AS total</text>'
      + '<text x="46" y="97" fill="#a78bfa" font-size="11" font-family="monospace" font-weight="600">FROM</text>'
      + '<text x="96" y="97" fill="#e2e8f0" font-size="11" font-family="monospace"> orders o</text>'
      + '<text x="46" y="114" fill="#a78bfa" font-size="11" font-family="monospace" font-weight="600">JOIN</text>'
      + '<text x="92" y="114" fill="#e2e8f0" font-size="11" font-family="monospace"> customers c ON o.customer_id = c.id</text>'
      + '<text x="46" y="131" fill="#a78bfa" font-size="11" font-family="monospace" font-weight="600">WHERE</text>'
      + '<text x="102" y="131" fill="#e2e8f0" font-size="11" font-family="monospace"> c.tier = \'VIP\' AND o.status = \'shipped\'</text>'
      + '<path d="M240 150 L240 168" stroke="#6366f1" stroke-width="2"/>'
      + '<rect x="160" y="168" width="160" height="36" rx="8" fill="#312e8120" stroke="#6366f140"/>'
      + '<text x="240" y="191" fill="#a78bfa" font-size="11" text-anchor="middle" font-family="system-ui" font-weight="600">Query Optimizer</text>'
      + '<path d="M240 204 L240 222" stroke="#6366f1" stroke-width="2"/>'
      + '<rect x="30" y="222" width="420" height="60" rx="6" fill="#1e293b" stroke="#6366f130"/>'
      + '<rect x="30" y="222" width="420" height="20" rx="3" fill="#1d3a2a"/>'
      + '<text x="90" y="237" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">order_id</text>'
      + '<text x="210" y="237" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">name</text>'
      + '<text x="350" y="237" fill="#4ade80" font-size="10" font-family="system-ui" font-weight="600">total</text>'
      + '<text x="90" y="256" fill="#94a3b8" font-size="10" font-family="system-ui">5001</text>'
      + '<text x="210" y="256" fill="#e2e8f0" font-size="10" font-family="system-ui">Alice Chen</text>'
      + '<text x="350" y="256" fill="#10b981" font-size="10" font-family="system-ui">$1,247.83</text>'
      + '<text x="90" y="272" fill="#94a3b8" font-size="10" font-family="system-ui">5043</text>'
      + '<text x="210" y="272" fill="#e2e8f0" font-size="10" font-family="system-ui">Bob Kumar</text>'
      + '<text x="350" y="272" fill="#10b981" font-size="10" font-family="system-ui">$892.50</text>'
      + '<text x="420" y="290" fill="#64748b" font-size="9" font-family="monospace" text-anchor="end">8.3 ms</text>'
      + '</svg>';
  }

  function _svgShopFlowToday() {
    var timeline = [
      { x: 42,  year: '2018', l1: 'Excel',      l2: '1K rows',   color: '#64748b', r: 14 },
      { x: 116, year: '2019', l1: 'CSV',        l2: '100K rows', color: '#f59e0b', r: 16 },
      { x: 195, year: '2020', l1: 'SQLite',     l2: '10M rows',  color: '#f97316', r: 18 },
      { x: 280, year: '2022', l1: 'PostgreSQL', l2: '500M rows', color: '#3b82f6', r: 22 },
      { x: 370, year: '2024', l1: 'Lakehouse',  l2: '50B rows',  color: '#06b6d4', r: 27 },
    ];
    var timelineSvg = timeline.map(function(t) {
      return '<circle cx="' + t.x + '" cy="130" r="' + t.r + '" fill="' + t.color + '18" stroke="' + t.color + '" stroke-width="1.5"/>'
        + '<text x="' + t.x + '" y="127" fill="' + t.color + '" font-size="8" text-anchor="middle" font-family="system-ui" font-weight="700">' + t.l1 + '</text>'
        + '<text x="' + t.x + '" y="138" fill="' + t.color + '90" font-size="7" text-anchor="middle" font-family="system-ui">' + t.l2 + '</text>'
        + '<text x="' + t.x + '" y="165" fill="#64748b" font-size="9" text-anchor="middle" font-family="system-ui">' + t.year + '</text>';
    }).join('');
    var stats = [
      { x: 62,  val: '50M',    lbl: 'Customers' },
      { x: 182, val: '5M/day', lbl: 'Orders' },
      { x: 298, val: '<10ms',  lbl: 'Query time' },
      { x: 408, val: '99.99%', lbl: 'Uptime' },
    ];
    var statsSvg = stats.map(function(s) {
      return '<rect x="' + (s.x-44) + '" y="192" width="88" height="56" rx="8" fill="#1e293b" stroke="#334155"/>'
        + '<text x="' + s.x + '" y="217" fill="#e2e8f0" font-size="14" text-anchor="middle" font-family="system-ui" font-weight="800">' + s.val + '</text>'
        + '<text x="' + s.x + '" y="234" fill="#64748b" font-size="10" text-anchor="middle" font-family="system-ui">' + s.lbl + '</text>';
    }).join('');
    return '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="480" height="300" fill="#0f172a" rx="8"/>'
      + '<text x="240" y="26" fill="#06b6d4" font-size="13" text-anchor="middle" font-family="system-ui" font-weight="700">ShopFlow: From Excel to 50M Customers</text>'
      + '<path d="M42 130 L370 130" stroke="#334155" stroke-width="1" stroke-dasharray="4 3"/>'
      + timelineSvg
      + statsSvg
      + '<rect x="110" y="262" width="260" height="26" rx="6" fill="#06b6d418" stroke="#06b6d440"/>'
      + '<text x="240" y="279" fill="#06b6d4" font-size="11" text-anchor="middle" font-family="system-ui" font-weight="600">This is what you will learn to build in this course.</text>'
      + '</svg>';
  }

  /* ── HTML scaffold ────────────────────────────────────────────── */
  function _buildHTML() {
    var pillsHTML = STEPS.map(function(s, i) {
      return '<button class="di-pill step-pill' + (i === 0 ? ' active' : '') + '" data-step="' + i + '">' + s.label + '</button>';
    }).join('');

    return '<style>\n.di-page {\n  display: grid;\n  grid-template-rows: auto 1fr;\n  height: calc(100vh - 52px - 52px);\n  overflow: hidden;\n}\n.di-header {\n  padding: 20px 28px 16px;\n  border-bottom: 1px solid var(--border-default);\n  background: var(--bg-2);\n  flex-shrink: 0;\n}\n.di-tag {\n  display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .07em;\n  text-transform: uppercase; padding: 3px 10px; border-radius: 9999px;\n  border: 1px solid; margin-bottom: 8px;\n}\n.di-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }\n.di-sub { font-size: 13px; color: var(--text-muted); }\n.di-body {\n  display: grid;\n  grid-template-columns: 220px 1fr;\n  gap: 0;\n  overflow: hidden;\n}\n.di-sidebar {\n  border-right: 1px solid var(--border-default);\n  overflow-y: auto;\n  padding: 12px 8px;\n  background: var(--bg-2);\n}\n.di-sidebar .step-pill { display: block; width: 100%; text-align: left; margin-bottom: 4px; }\n.di-sidebar .step-pill.active {\n  background: var(--blue-subtle); color: var(--blue); border-color: rgba(88,166,255,.25);\n}\n.di-main {\n  display: flex; flex-direction: column; overflow: hidden;\n}\n.di-diagram {\n  flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center;\n  padding: 12px;\n  background: var(--bg-1);\n}\n.di-diagram svg { max-width: 100%; max-height: 100%; border-radius: 8px; }\n.di-info {\n  border-top: 1px solid var(--border-default);\n  padding: 14px 20px;\n  background: var(--bg-2);\n  flex-shrink: 0;\n}\n.di-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 6px; }\n.di-insight {\n  font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);\n  background: var(--bg-3); border-radius: 6px; padding: 8px 12px;\n}\n</style>\n\n<div class="di-header">\n  <div class="di-tag" style="background:#3b82f618;color:#3b82f6;border-color:#3b82f630;">The Beginning</div>\n  <h1 class="di-title">Why Databases Exist</h1>\n  <p class="di-sub">Follow ShopFlow from a single Excel file to 50M customers — and understand every problem that forced us to use a database.</p>\n</div>\n\n<div class="di-body">\n  <div class="di-sidebar">\n    <div class="step-pills" style="flex-direction:column;">' + pillsHTML + '</div>\n  </div>\n  <div class="di-main">\n    <div class="di-diagram">' + _buildDiagram(0) + '</div>\n    <div class="di-info">\n      <div class="di-desc">' + STEPS[0].desc + '</div>\n      <div class="di-insight">' + STEPS[0].insight + '</div>\n    </div>\n  </div>\n</div>';
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['database-introduction'] = {
    id: 'database-introduction',
    title: 'Why Databases Exist',
    group: 'get-started',
    render: _render,
    destroy: function() {
      if (_engine) { _engine.destroy(); _engine = null; }
      window.IcebergViz.AnimationControls.hide();
    },
  };
})();
