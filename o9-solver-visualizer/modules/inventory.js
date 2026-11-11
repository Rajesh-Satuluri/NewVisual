import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is the Inventory measure group in SCS, and what do its two measures represent?',
    a: 'SCS needs the <strong>starting state and prior commitments</strong> of the network, held in a measure group called <code>Inventory</code> with two numeric measures. <strong>Beginning on Hand (BOH)</strong> stores the inventory at the <strong>current time bucket</strong> — the stock already sitting on a material node at plan current. <strong>Expected Receipts (ER)</strong> stores inventory accruals expected in buckets <em>other than</em> the first — i.e. production orders on the shop floor, distribution orders in transit, and purchase orders on suppliers. ER names only the <strong>material node and the bucket</strong> the quantity becomes available in; it does <em>not</em> record the source it came from.',
    tip: 'One line: "Inventory group = BOH (stock now) + ER (committed inflows: PO/DO/production orders arriving later)."' },
  { q: 'In which buckets does the solver read BOH versus ER, and why does the difference cause "phantom" shortages?',
    a: 'SCS reads <strong>BOH only in the plan current time bucket</strong> and <strong>ignores BOH on every other bucket</strong>. It reads <strong>ER for all time buckets, including plan current</strong>. BOH in non-current buckets is not an input at all — it is a <em>computation</em> derived from the supply coming in and the demand going out of the material node. So on-hand keyed into a future (or past) bucket is silently dropped, which is a classic cause of a demand looking short even though "there is stock in the system" — the stock was not at plan current.',
    tip: 'BOH = current bucket only (everything else is computed); ER = all buckets. Mis-dated on-hand → ignored → phantom shortage.' },
  { q: 'How does the solver consume existing inventory before producing new supply, and what happens to anything it does not use?',
    a: 'While planning a demand, SCS <strong>sums the BOH and ER available in that bucket</strong> and uses that total to fulfil the demand first — existing on-hand and expected receipts are netted against demand <em>before</em> any new production is requested. Only the residual shortfall drives new supply. Nothing is wasted: <strong>unused BOH carries forward</strong> to the next bucket until it is exhausted, and <strong>unused ER carries forward</strong> to subsequent buckets until it is consumed by demand. That carry-forward is exactly what produces the computed on-hand (end-on-hand) seen in later buckets.',
    tip: 'Netting order: existing BOH + ER first, new supply only for the gap; leftovers roll forward until used up.' },
];

// ── Worked inventory profile: one material node across 8 buckets ─────────────
// BOH is an input only at the first (plan current) bucket; ER can arrive in any
// bucket. Everything else (carry-in / EOH) is computed by netting.
const BUCKETS = [
  { w: 'W01', bohInput: 150, er: 0,  demand: 50, current: true },
  { w: 'W02', bohInput: 0,   er: 40, demand: 60 },
  { w: 'W03', bohInput: 0,   er: 0,  demand: 70 },
  { w: 'W04', bohInput: 0,   er: 50, demand: 40 },
  { w: 'W05', bohInput: 0,   er: 0,  demand: 60 },
  { w: 'W06', bohInput: 0,   er: 30, demand: 50 },
  { w: 'W07', bohInput: 0,   er: 0,  demand: 40 },
  { w: 'W08', bohInput: 0,   er: 0,  demand: 30 },
];

// Net existing supply against demand, carrying surplus forward; shortfall → new supply.
function computeProfile() {
  const out = [];
  let carry = 0;
  BUCKETS.forEach((b, i) => {
    const carryIn = carry;                 // computed on-hand rolled in from prior bucket
    const boh = i === 0 ? b.bohInput : 0;   // BOH read ONLY at plan current (first bucket)
    const avail = carryIn + boh + b.er;     // existing supply the solver sees this bucket
    const consumed = Math.min(avail, b.demand);
    const newSupply = b.demand - consumed;  // shortfall → request new production
    const eoh = avail - consumed;           // end-on-hand, carried forward
    out.push({ ...b, idx: i, carryIn, boh, avail, consumed, newSupply, eoh });
    carry = eoh;
  });
  return out;
}

const C = {
  bg: '#0A0E1A', boh: '#6366F1', carry: '#38BDF8', er: '#A78BFA',
  eoh: '#10B981', demand: '#F59E0B', shortage: '#EF4444', slate: '#64748B',
};

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Solver Inputs',
    title: 'Inventory — BOH, Receipts & Netting',
    subtitle: 'The solver needs the network’s starting state and prior commitments: Beginning-On-Hand at plan current plus Expected Receipts across the horizon. Watch it net demand against existing on-hand and receipts — carrying surplus forward — before it ever requests new supply.',
    tabs: [
      { id: 'profile', label: '📊 Inventory Profile' },
      { id: 'inputs',  label: '📥 BOH vs Expected Receipts', content: inputsTab() },
      { id: 'netting', label: '🔄 Netting & EOH Buckets', content: nettingTab() },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });
  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildCanvas(container) {
  const tab = container.querySelector('#tab-profile');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One material node across <b>8 buckets</b>. <b style="color:${C.boh}">BOH</b> seeds the first (plan current) bucket, <b style="color:${C.er}">ER</b> arrives in later buckets, <b style="color:${C.carry}">carried on-hand</b> rolls in from the prior bucket. Each bucket nets <b style="color:${C.demand}">demand</b> against that existing supply first; the <b style="color:${C.eoh}">green line</b> is end-on-hand carried forward, and <b style="color:${C.shortage}">red</b> is the shortfall that forces new supply. Press <b>Run</b> to step bucket by bucket.</div>
      <canvas id="inv-canvas" width="820" height="300" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="inv-run">▶ Run profile</button>
        <button class="ctrl-btn" id="inv-step">⏭ Step bucket</button>
        <button class="ctrl-btn" id="inv-reset">↺ Reset</button>
        <span class="ctrl-label" id="inv-status">Press Run to net the profile bucket by bucket.</span>
      </div>
      <div id="inv-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>At each bucket the solver first totals the <strong>existing supply</strong> it can see — <strong>BOH</strong> (read <em>only</em> at the first, plan-current bucket), any <strong>Expected Receipts</strong> arriving that bucket, and the <strong>on-hand carried forward</strong> from the previous bucket. It consumes that against the bucket’s demand <em>before</em> asking for anything new. Whatever is left over becomes the <strong>end-on-hand (EOH)</strong> — the green line — and rolls into the next bucket until it is exhausted. BOH surplus and unused ER both carry this way.</p>
      <p>When existing supply runs out (watch W05 onward), demand can no longer be met from inventory, so the gap turns <strong>red</strong>: this is the residual shortfall that triggers a request for <em>new</em> production. The whole point of reading inventory first is that the solver never builds what it already has — it only plans new supply for the part existing BOH and receipts cannot cover.</p>
    </div>`;

  const canvas = tab.querySelector('#inv-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const profile = computeProfile();
  const maxVal = 160;

  // plot geometry
  const x0 = 54, plotRight = 804;
  const plotW = plotRight - x0;
  const perCol = plotW / BUCKETS.length;
  const yTop = 44, yBase = 240, plotH = yBase - yTop;
  const h = (v) => (v / maxVal) * plotH;
  const colCx = (i) => x0 + i * perCol + perCol / 2;

  let revealed = 0;          // number of buckets netted so far
  let running = false;
  let nextStepAt = 0;
  const stepMs = 750;

  function statusFor(n) {
    const st = tab.querySelector('#inv-status');
    if (n === 0) { st.textContent = 'Press Run to net the profile bucket by bucket.'; return; }
    const p = profile[n - 1];
    const srcBits = [];
    if (p.boh) srcBits.push(`BOH ${p.boh}`);
    if (p.carryIn) srcBits.push(`carried ${p.carryIn}`);
    if (p.er) srcBits.push(`ER ${p.er}`);
    const src = srcBits.length ? srcBits.join(' + ') + ` = ${p.avail} on hand` : 'no existing supply';
    if (p.newSupply > 0)
      st.textContent = `${p.w}: ${src}; demand ${p.demand} → consumed ${p.consumed}, NEW SUPPLY ${p.newSupply}, EOH ${p.eoh}.`;
    else
      st.textContent = `${p.w}: ${src}; demand ${p.demand} met from inventory, EOH ${p.eoh} carried forward.`;
  }

  function renderLedger(n) {
    const head = `<div class="info-card" style="border-left:3px solid ${C.slate}"><div class="info-card-title">Inventory profile · one material node</div><div class="info-card-body">BOH is read only at <b>W01</b> (plan current); ER is read in every bucket. Existing supply is netted first, surplus carried as EOH.</div></div>`;
    const cards = profile.slice(0, n).map(p => {
      const col = p.newSupply > 0 ? C.shortage : C.eoh;
      const tag = p.newSupply > 0 ? `✗ new supply ${p.newSupply}` : '✓ from inventory';
      const srcBits = [];
      if (p.boh) srcBits.push(`BOH ${p.boh}`);
      if (p.carryIn) srcBits.push(`carried-in ${p.carryIn}`);
      if (p.er) srcBits.push(`ER ${p.er}`);
      const src = srcBits.length ? srcBits.join(' + ') : 'none';
      return `<div class="info-card" style="border-left:3px solid ${col}"><div class="info-card-title">${p.w} <span class="pill" style="background:${col}22;color:${col}">${tag}</span></div><div class="info-card-body">Existing: ${src} = <b>${p.avail}</b>. Demand ${p.demand} → consumed ${p.consumed} from inventory${p.newSupply > 0 ? `, shortfall <b style="color:${C.shortage}">${p.newSupply}</b> needs new supply` : ''}. <b style="color:${C.eoh}">EOH ${p.eoh}</b> carried forward.</div></div>`;
    });
    tab.querySelector('#inv-ledger').innerHTML = head + cards.join('');
  }

  function advance() {
    if (revealed >= BUCKETS.length) return false;
    revealed++;
    statusFor(revealed);
    renderLedger(revealed);
    return true;
  }
  function run() {
    if (revealed >= BUCKETS.length) reset();
    running = true;
    nextStepAt = performance.now();
  }
  function step() { running = false; advance(); }
  function reset() { running = false; revealed = 0; statusFor(0); renderLedger(0); }

  function drawBar(i, p, active) {
    const cx = colCx(i);
    const barW = Math.min(50, perCol - 14);
    const bx = cx - barW / 2;
    let y = yBase;
    // existing supply stack (from base up): BOH / carried-in, then ER
    const base = p.boh + p.carryIn;
    if (base > 0) {
      const bh = h(base);
      const col = p.boh > 0 ? C.boh : C.carry;
      drawRoundRect(ctx, bx, y - bh, barW, bh, 4, col + 'cc', col);
      y -= bh;
    }
    if (p.er > 0) {
      const eh = h(p.er);
      drawRoundRect(ctx, bx, y - eh, barW, eh, 4, C.er + 'cc', C.er);
      y -= eh;
    }
    const barTopY = yBase - h(p.avail);
    // consumed overlay: amber from top of available bar down to EOH level
    if (p.consumed > 0) {
      const eohY = yBase - h(p.eoh);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = C.demand;
      ctx.fillRect(bx + 1, barTopY, barW - 2, eohY - barTopY);
      ctx.restore();
    }
    // new supply requested: red segment above the available bar
    if (p.newSupply > 0) {
      const sh = h(p.newSupply);
      ctx.save();
      ctx.setLineDash([3, 3]);
      drawRoundRect(ctx, bx, barTopY - sh, barW, sh, 4, C.shortage + '33', C.shortage);
      ctx.restore();
      ctx.fillStyle = C.shortage; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('+' + p.newSupply, cx, barTopY - sh - 4);
    }
    // demand tick label under bucket
    ctx.fillStyle = C.demand; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('dmd ' + p.demand, cx, yBase + 26);
    // active highlight
    if (active) {
      ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      ctx.strokeRect(bx - 3, barTopY - 3, barW + 6, yBase - barTopY + 6); ctx.setLineDash([]);
    }
  }

  let raf = null;
  function draw(ts) {
    if (running && ts >= nextStepAt) {
      if (advance()) nextStepAt = ts + stepMs; else running = false;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // y gridlines + axis labels
    ctx.textAlign = 'right'; ctx.font = '8px system-ui';
    for (let v = 0; v <= maxVal; v += 40) {
      const gy = yBase - h(v);
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(plotRight, gy); ctx.stroke();
      ctx.fillStyle = '#3a4452'; ctx.fillText(String(v), x0 - 6, gy + 3);
    }
    ctx.save(); ctx.translate(14, (yTop + yBase) / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillStyle = C.slate; ctx.font = '9px system-ui';
    ctx.fillText('units on material node', 0, 0); ctx.restore();

    // bucket labels + plan-current marker
    BUCKETS.forEach((b, i) => {
      const cx = colCx(i);
      ctx.textAlign = 'center'; ctx.font = (b.current ? 'bold ' : '') + '9px system-ui';
      ctx.fillStyle = b.current ? C.boh : '#94A3B8';
      ctx.fillText(b.w, cx, yBase + 14);
      if (b.current) { ctx.fillStyle = C.boh; ctx.font = '7px system-ui'; ctx.fillText('plan current', cx, yBase + 36); }
    });

    // bars for revealed buckets
    for (let i = 0; i < revealed; i++) drawBar(i, profile[i], running && i === revealed - 1);

    // EOH running line over revealed buckets
    if (revealed > 0) {
      ctx.beginPath();
      for (let i = 0; i < revealed; i++) {
        const x = colCx(i), y = yBase - h(profile[i].eoh);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = C.eoh; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < revealed; i++) {
        const x = colCx(i), y = yBase - h(profile[i].eoh);
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = C.eoh; ctx.fill();
      }
    }

    // legend
    ctx.textAlign = 'left'; ctx.font = '9px system-ui';
    const leg = [['BOH', C.boh], ['carried on-hand', C.carry], ['ER', C.er], ['consumed', C.demand], ['EOH line', C.eoh], ['new supply', C.shortage]];
    let lx = x0;
    leg.forEach(([t, c]) => { ctx.fillStyle = c; ctx.fillRect(lx, 20, 9, 9); ctx.fillStyle = '#94A3B8'; ctx.fillText(t, lx + 13, 28); lx += ctx.measureText(t).width + 34; });

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#inv-run').addEventListener('click', run);
  tab.querySelector('#inv-step').addEventListener('click', step);
  tab.querySelector('#inv-reset').addEventListener('click', reset);
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function inputsTab() {
  const rows = [
    ['Beginning on Hand (BOH)', 'The inventory starting condition — stock available at <strong>plan current</strong> on the material node.', 'Read <strong>only in the plan current bucket</strong>; BOH on all other buckets is ignored (it is a computed value there).', 'Unused BOH <strong>carries forward</strong> to the next bucket until exhausted.', '<code>BOH Measure Name</code>'],
    ['Expected Receipts (ER)', 'Prior commitments arriving later — production orders, distribution orders in transit, purchase orders on suppliers.', 'Read for <strong>all time buckets, including plan current</strong>. Names only the material node + bucket, not the source.', 'Unused ER <strong>carries forward</strong> to subsequent buckets until consumed by demand.', '<code>Expected Receipt Measure Name</code>'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The two Inventory measures</div><div class="section-desc">SCS needs the starting state and prior commitments of the network. Both live in a measure group called <code>Inventory</code>, both numeric, both at granularity <code>Material Node × Time × Lot × Version</code>.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Measure</th><th>What it represents</th><th>Which buckets SCS reads</th><th>Carry-forward</th><th>SCS config</th></tr></thead>
          <tbody>${rows.map(([m, r, b, c, cfg]) => `<tr><td style="font-weight:600;color:var(--text)">${m}</td><td>${r}</td><td style="color:var(--text2)">${b}</td><td style="color:var(--text2)">${c}</td><td>${cfg}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">BOH = stock "now"</div><div class="info-card-body">BOH signifies the quantity of stock available at the specific material node <strong>on the plan current time bucket</strong>. SCS reads BOH only there and <strong>ignores BOH on all other buckets</strong> — so on-hand dated to a non-current bucket does nothing.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">ER = committed inflows</div><div class="info-card-body">Expected Receipts are the in-flight commitments: shop-floor production orders, in-transit distribution orders, and supplier purchase orders. ER specifies <strong>which material node and which bucket</strong> the quantity becomes available in — but <strong>not the source</strong> it comes from.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">BOH in later buckets is computed</div><div class="info-card-body">BOH in buckets other than plan current is not an input — it is a <strong>computation</strong> based on the supply coming in and the demand going out of the material node. That computed on-hand is what you watch roll across the profile.</div></div>
      </div>
    </div>`;
}

function nettingTab() {
  const prof = computeProfile();
  const body = prof.map(p => {
    const inStr = p.boh ? `BOH ${p.boh}` : (p.carryIn ? `carry ${p.carryIn}` : '0');
    const col = p.newSupply > 0 ? 'var(--text)' : 'var(--green)';
    return `<tr>
      <td style="font-weight:600;color:var(--text)">${p.w}${p.current ? ' <span style="color:#6366F1;font-weight:400">(current)</span>' : ''}</td>
      <td>${inStr}</td>
      <td>${p.er || '–'}</td>
      <td style="font-weight:600">${p.avail}</td>
      <td style="color:#F59E0B">${p.demand}</td>
      <td>${p.consumed}</td>
      <td style="color:${p.newSupply > 0 ? '#EF4444' : 'var(--text2)'}">${p.newSupply || '–'}</td>
      <td style="font-weight:700;color:${col}">${p.eoh}</td>
    </tr>`;
  }).join('');
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Net existing supply first, then produce the gap</div><div class="section-desc">While planning a demand, SCS sums the BOH and ER available in that bucket and uses that total to fulfil the demand — existing on-hand and receipts are consumed <strong>before</strong> any new supply is requested.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">1 · Look for existing supply</div><div class="info-card-body">For each bucket the solver totals the existing supply it can see: <strong>BOH</strong> (plan current only), <strong>ER</strong> in that bucket, and <strong>on-hand carried forward</strong> from earlier. This is the inventory it tries to use first.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">2 · Consume against demand</div><div class="info-card-body">Demand is met from that existing total. Only the <strong>residual shortfall</strong> — what BOH and receipts cannot cover — becomes a request for <strong>new production</strong>. The solver never rebuilds stock it already holds.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">3 · Carry the surplus (EOH)</div><div class="info-card-body">Unused BOH carries forward until exhausted; unused ER carries forward until consumed by demand. The leftover at the end of a bucket is the computed on-hand — <strong>end-on-hand (EOH)</strong> — that rolls into the next bucket.</div></div>
      </div>
      <div class="section-header" style="margin-top:22px"><div class="section-title">The inventory profile: BOH → … → EOH per bucket</div><div class="section-desc">The same material node across 8 buckets. On-hand enters, ER arrives, demand consumes, and the end-on-hand carries forward — each bucket’s EOH is the next bucket’s carry-in.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Bucket</th><th>On-hand in</th><th>ER</th><th>Existing avail</th><th>Demand</th><th>Consumed</th><th>New supply</th><th>EOH → next</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <div class="canvas-explainer"><h3>Reading the profile</h3>
        <p>Through <strong>W01–W04</strong> the BOH of 150 plus the ER inflows (40 in W02, 50 in W04) stay ahead of demand, so every demand is met from inventory and a shrinking surplus carries forward as EOH. From <strong>W05</strong> the carried on-hand runs out: demand 60 against only 20 available leaves a shortfall of 40 that must come from <strong>new supply</strong>, and EOH falls to zero. Because BOH is read only at plan current, none of the drawdown in later buckets can be topped up by re-entering on-hand there — only ER or new production can.</p>
      </div>
    </div>`;
}
