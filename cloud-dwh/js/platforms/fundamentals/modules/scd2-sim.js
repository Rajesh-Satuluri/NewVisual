/* Fundamentals · Modeling & Design track — SCD Type 2 interactive
   simulator. A custom (non-FundKit) module: change a customer's city in
   the staging feed, run the SCD-2 load, and watch the dimension version
   rows (expire the old, insert the new) in real time.
   Registered directly under viz.P.fundamentals.Modules.fundScd2Sim. */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.fundamentals = viz.P.fundamentals || {};
  const B = (viz.P.fundamentals.Modules = viz.P.fundamentals.Modules || {});

  const HIGH = DATE(9999, 12, 31);

  function DATE(y, m, d) { return new Date(Date.UTC(y, m - 1, d)); }
  function fmt(dt) {
    if (dt.getUTCFullYear() >= 9999) return '9999-12-31';
    return dt.toISOString().slice(0, 10);
  }
  function addDays(dt, n) { const x = new Date(dt); x.setUTCDate(x.getUTCDate() + n); return x; }
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  const CITIES = ['Austin', 'Seattle', 'Denver', 'Boston', 'Miami', 'Chicago'];

  B.fundScd2Sim = {
    render(canvas) {
      canvas.innerHTML = '';

      // ── State ──────────────────────────────────────────────
      let nextSk = 1;
      let today = DATE(2024, 1, 1);
      const customers = [
        { id: 'C001', name: 'Ada Lovelace' },
        { id: 'C002', name: 'Alan Turing' },
        { id: 'C003', name: 'Grace Hopper' },
      ];
      // staging = the latest source feed (editable)
      const staging = { C001: 'Austin', C002: 'Seattle', C003: 'Denver' };
      // the Type-2 dimension
      let dim = [];
      const log = [];

      function seed() {
        nextSk = 1; dim = [];
        today = DATE(2024, 1, 1);
        customers.forEach(c => {
          dim.push({ sk: nextSk++, id: c.id, name: c.name, city: staging[c.id], from: today, to: HIGH, current: true });
        });
        log.length = 0;
        log.push({ t: 'seed', msg: 'Seeded ' + dim.length + ' initial current rows (valid_from ' + fmt(today) + ').' });
      }

      // ── SCD-2 load: expire changed current rows, insert new versions ──
      function runLoad() {
        today = addDays(today, 90); // advance a simulated quarter
        let expired = 0, inserted = 0, unchanged = 0, added = 0;
        customers.forEach(c => {
          const srcCity = staging[c.id];
          const cur = dim.find(r => r.id === c.id && r.current);
          if (!cur) {
            // brand-new customer
            dim.push({ sk: nextSk++, id: c.id, name: c.name, city: srcCity, from: today, to: HIGH, current: true, isNew: true });
            added++; inserted++;
            return;
          }
          if (cur.city === srcCity) { unchanged++; return; }
          // Step 1: expire the current row
          cur.current = false;
          cur.to = addDays(today, -1);
          cur.justExpired = true;
          expired++;
          // Step 2: insert a new current version
          dim.push({ sk: nextSk++, id: c.id, name: c.name, city: srcCity, from: today, to: HIGH, current: true, isNew: true });
          inserted++;
        });
        const parts = [];
        if (expired) parts.push('expired ' + expired + ' row' + (expired > 1 ? 's' : ''));
        if (inserted) parts.push('inserted ' + inserted + ' new version' + (inserted > 1 ? 's' : ''));
        if (unchanged) parts.push(unchanged + ' unchanged (skipped)');
        log.unshift({ t: 'load', msg: 'Load @ ' + fmt(today) + ': ' + (parts.length ? parts.join(', ') + '.' : 'nothing to do.') });
        draw();
      }

      function changeRandom() {
        const c = customers[Math.floor(Math.random() * customers.length)];
        const cur = dim.find(r => r.id === c.id && r.current);
        let pick = cur ? cur.city : CITIES[0];
        let guard = 0;
        while (pick === (cur && cur.city) && guard++ < 10) pick = CITIES[Math.floor(Math.random() * CITIES.length)];
        staging[c.id] = pick;
        draw();
      }

      // ── Render ─────────────────────────────────────────────
      const page = document.createElement('div');
      page.className = 'mod-page fund-page';
      page.innerHTML =
        '<div class="mod-header">' +
        '<div class="mod-eyebrow">🏗️ Modeling &amp; Design · Interactive</div>' +
        '<h1 class="mod-title">SCD Type 2 — watch the history build</h1>' +
        '<p class="mod-subtitle fund-lead">Change a customer’s city in the incoming <strong>staging feed</strong>, then run the <strong>SCD-2 load</strong>. The current row is <em>expired</em> (valid_to set, flag off) and a <em>new version</em> is inserted with a fresh surrogate key — so the full history is preserved.</p>' +
        '</div>';
      canvas.appendChild(page);

      const wrap = document.createElement('div');
      wrap.className = 'fund-block';
      wrap.innerHTML =
        '<div class="fund-block-title">🎮 Staging feed (edit the source)</div>' +
        '<div id="scd-staging" class="scd-staging"></div>' +
        '<div class="scd-actions" style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;">' +
        '<button class="btn btn-primary" id="scd-run">▶ Run SCD-2 load</button>' +
        '<button class="btn btn-ghost" id="scd-rand">🎲 Random change</button>' +
        '<button class="btn btn-ghost" id="scd-reset">↺ Reset</button>' +
        '</div>' +
        '<div class="fund-block-title" style="margin-top:8px;">🗂️ dim_customer (Type 2)</div>' +
        '<div class="scd-table-wrap" data-noswipe style="overflow-x:auto;"><table class="scd-table" id="scd-table"></table></div>' +
        '<div class="fund-block-title" style="margin-top:14px;">📜 Load log</div>' +
        '<ul id="scd-log" class="scd-log" style="list-style:none;padding:0;margin:0;font-family:var(--font-mono);font-size:var(--text-sm);"></ul>';
      page.appendChild(wrap);

      // takeaway
      const take = document.createElement('div');
      take.className = 'cmp-takeaway';
      take.innerHTML = '<span class="cmp-takeaway__icon">💡</span><span class="cmp-takeaway__txt"><b>Bottom line —</b> each change closes the old row and opens a new one, so a fact dated in the past still joins to the city that was true <i>then</i>. One business key, many versions, exactly one current.</span>';
      page.appendChild(take);

      const stagingEl = wrap.querySelector('#scd-staging');
      const tableEl = wrap.querySelector('#scd-table');
      const logEl = wrap.querySelector('#scd-log');

      function drawStaging() {
        stagingEl.innerHTML = customers.map(c => {
          const opts = CITIES.map(ct => '<option value="' + ct + '"' + (staging[c.id] === ct ? ' selected' : '') + '>' + ct + '</option>').join('');
          return '<div class="scd-src-row" style="display:flex;align-items:center;gap:10px;margin:6px 0;">' +
            '<code>' + esc(c.id) + '</code><span style="min-width:120px;">' + esc(c.name) + '</span>' +
            '<span class="text-muted">city →</span>' +
            '<select data-cust="' + c.id + '" class="scd-city">' + opts + '</select></div>';
        }).join('');
        stagingEl.querySelectorAll('select.scd-city').forEach(sel => {
          sel.addEventListener('change', e => { staging[e.target.dataset.cust] = e.target.value; draw(); });
        });
      }

      function drawTable() {
        const rows = dim.slice().sort((a, b) => a.id.localeCompare(b.id) || a.sk - b.sk);
        const head = '<thead><tr>' +
          ['sk', 'customer_id', 'name', 'city', 'valid_from', 'valid_to', 'is_current']
            .map(h => '<th style="text-align:left;padding:6px 10px;border-bottom:1px solid var(--border-default);">' + h + '</th>').join('') +
          '</tr></thead>';
        const body = '<tbody>' + rows.map(r => {
          const bg = r.current ? 'background:var(--green-subtle);' : 'opacity:0.6;';
          const flash = r.isNew ? 'box-shadow:inset 3px 0 0 var(--green);' : (r.justExpired ? 'box-shadow:inset 3px 0 0 var(--red);' : '');
          const cityStyle = r.current ? '' : 'text-decoration:line-through;';
          return '<tr style="' + bg + flash + '">' +
            '<td style="padding:6px 10px;">' + r.sk + '</td>' +
            '<td style="padding:6px 10px;"><code>' + esc(r.id) + '</code></td>' +
            '<td style="padding:6px 10px;">' + esc(r.name) + '</td>' +
            '<td style="padding:6px 10px;' + cityStyle + '">' + esc(r.city) + '</td>' +
            '<td style="padding:6px 10px;">' + fmt(r.from) + '</td>' +
            '<td style="padding:6px 10px;">' + fmt(r.to) + '</td>' +
            '<td style="padding:6px 10px;">' + (r.current ? '<b style="color:var(--green);">TRUE</b>' : 'false') + '</td>' +
            '</tr>';
        }).join('') + '</tbody>';
        tableEl.innerHTML = head + body;
        // clear one-shot flash flags after paint
        dim.forEach(r => { r.isNew = false; r.justExpired = false; });
      }

      function drawLog() {
        logEl.innerHTML = log.map(e =>
          '<li style="padding:4px 0;border-bottom:1px solid var(--border-subtle);">' +
          (e.t === 'load' ? '▶ ' : '• ') + esc(e.msg) + '</li>').join('');
      }

      function draw() { drawStaging(); drawTable(); drawLog(); }

      wrap.querySelector('#scd-run').addEventListener('click', runLoad);
      wrap.querySelector('#scd-rand').addEventListener('click', changeRandom);
      wrap.querySelector('#scd-reset').addEventListener('click', () => { seed(); draw(); });

      seed();
      draw();

      return { destroy() { /* listeners live on canvas children, cleared on navigate */ } };
    },
  };
})();
