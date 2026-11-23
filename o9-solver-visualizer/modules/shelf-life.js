import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is "shelf life" in the SCS, and how does the solver enforce it when pegging supply to demand?',
    a: 'Shelf life is the number of buckets (days / weeks) a lot of material stays <strong>usable after it is produced or received</strong>. Each lot gets an <strong>expiry = production bucket + shelf life</strong>. The solver is <strong>expiry-aware</strong>: a lot <em>cannot peg to any demand due at or after its expiry</em>, and whatever quantity is left when the lot expires is <strong>written off</strong> (expired, lost supply). To avoid that waste the solver prefers <strong>FEFO</strong> — First-Expiry-First-Out — consuming the lot that expires soonest before newer-but-later-expiring lots. FEFO is <em>not</em> the same as FIFO: a lot received later can still expire first.',
    tip: 'One line: "expiry = made-bucket + shelf life; the solver won’t peg an expired lot and burns soonest-expiry first (FEFO)."' },
  { q: 'What does Minimum Remaining Shelf Life (MRSL) add beyond simply "not expired"? Work a quick example.',
    a: '<strong>MRSL</strong> is a rule at the point of consumption/shipment: any lot used must still have at least <strong>N buckets of life LEFT</strong> when it is consumed — not merely be unexpired. It models customers who reject product that is too close to its expiry date. <strong>Example:</strong> a lot produced in W2 with shelf life 5 expires in <strong>W7</strong>. An order due in <strong>W6</strong> leaves <strong>1 bucket</strong> of remaining life (W7−W6). If the customer requires <strong>MRSL = 2</strong>, that lot is <strong>not eligible</strong> even though it has not expired — 1 &lt; 2. The solver must use a fresher lot or report the demand short. So MRSL shrinks the usable window from the front of expiry inward.',
    tip: 'Not-expired means remaining life &gt; 0. MRSL means remaining life ≥ N. MRSL is strictly tighter.' },
  { q: 'How does shelf life limit build-ahead, and what does "class-based shelf life" mean?',
    a: 'Shelf life <strong>caps how early the solver may pre-build</strong>. Normally when capacity is tight the solver builds ahead and carries inventory to the due date. But a pre-built lot must <strong>survive to the due date</strong> — if it would expire before then (or fall below MRSL at the due bucket), building that early is pointless, so shelf life puts a ceiling on build-ahead. For a far-future order, supply may have to wait until it is close enough that it will still be fresh on arrival. <strong>Class-based shelf life</strong> defines the shelf-life rule at a <strong>class / group level</strong> instead of per item: a whole family of materials shares one shelf-life value, configured once on the class, and every member item inherits it — far less maintenance than per-SKU values.',
    tip: 'Shelf life is a build-ahead ceiling: pre-built stock must still be fresh (and ≥ MRSL) at the due date. Class-based = set it once per family, members inherit.' },
];

// ── Grounded teaching values ─────────────────────────────────────────────────
const HORIZON = 10;        // W1..W10
const MADE = 2;            // lot produced in W2
let SHELF = 5;             // shelf life (buckets) — adjustable
let DUE = 8;               // order due bucket — adjustable
let MRSL = 0;              // minimum remaining shelf life required — adjustable

function expiryOf(made, shelf) { return made + shelf; }           // W7 for 2+5
function remainingAtDue(made, shelf, due) { return made + shelf - due; } // life left when consumed at due
// Eligible iff due is before expiry AND remaining life >= MRSL.
function eligibility(made, shelf, due, mrsl) {
  const exp = expiryOf(made, shelf);
  const rem = remainingAtDue(made, shelf, due);
  if (due >= exp) return { ok: false, reason: 'EXPIRED', exp, rem };
  if (rem < mrsl) return { ok: false, reason: 'BELOW MRSL', exp, rem };
  return { ok: true, reason: 'FRESH', exp, rem };
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Models Supported',
    title: 'Shelf Life & Expiry',
    subtitle: 'Perishable supply can only fill a demand while it is still fresh. Watch a lot’s life drain from the bucket it was made, see the usable window shrink as Minimum Remaining Shelf Life bites, and watch an order flip between pegged and expired as the due date slides past expiry.',
    tabs: [
      { id: 'window', label: '⏳ Expiry Window' },
      { id: 'mrsl',   label: '📏 MRSL & FEFO', content: mrslTab() },
      { id: 'class',  label: '🧬 Class-Based', content: classTab() },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live expiry-window canvas ─────────────────────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-window');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A lot is produced in <b>W${MADE}</b>. Its life drains forward over <b>shelf-life</b> buckets to its <b style="color:#F59E0B">expiry</b>; after that the remainder is <b style="color:#EF4444">written off</b>. Slide the <b>due date</b> and raise <b>MRSL</b> — the order pegs (<b style="color:#10B981">green</b>) only while the lot is still fresh enough when consumed.</div>
      <canvas id="shelf-canvas" width="860" height="330" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="shelf-shelf-dn">Shelf −</button>
        <button class="ctrl-btn" id="shelf-shelf-up">Shelf +</button>
        <button class="ctrl-btn" id="shelf-due-dn">◀ Due</button>
        <button class="ctrl-btn" id="shelf-due-up">Due ▶</button>
        <button class="ctrl-btn" id="shelf-mrsl-dn">MRSL −</button>
        <button class="ctrl-btn" id="shelf-mrsl-up">MRSL +</button>
        <button class="ctrl-btn" id="shelf-reset">↺ Reset</button>
        <span class="ctrl-label" id="shelf-status"></span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The lot is made in <strong>W${MADE}</strong>. With shelf life <strong>5</strong> it expires in <strong>W7</strong> (made + shelf = 2 + 5). The green life-bar is the <strong>usable window</strong>; it turns red at expiry. An order due in <strong>W8</strong> lands <em>after</em> W7, so the lot is already <strong>expired</strong> and the demand is <strong>short</strong> — no amount of on-hand helps once a lot is dead.</p>
      <p>Pull the due date back to <strong>W6</strong> and the lot is unexpired, with <strong>1 bucket</strong> of life left (W7−W6). That is fine at <strong>MRSL 0</strong>, but raise <strong>MRSL to 2</strong> and the lot fails again: the customer demands at least 2 buckets of remaining life and only 1 is left. MRSL eats the usable window from the expiry end, so fresher supply is needed even though nothing has technically expired.</p>
    </div>`;

  const canvas = tab.querySelector('#shelf-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#shelf-status');

  // layout: a timeline W1..W10
  const x0 = 40, x1 = 820, y = 150;
  const colW = (x1 - x0) / HORIZON;
  const cx = (bucket) => x0 + (bucket - 0.5) * colW; // center of bucket column

  let drain = 0;            // 0..1 animated fill of life bar
  let raf = null;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function sync() {
    SHELF = clamp(SHELF, 1, 8);
    DUE = clamp(DUE, MADE + 1, HORIZON);
    MRSL = clamp(MRSL, 0, 6);
    const e = eligibility(MADE, SHELF, DUE, MRSL);
    statusEl.textContent = `made W${MADE} · shelf ${SHELF} → expiry W${e.exp} · due W${DUE} · remaining life ${e.rem} · MRSL ${MRSL} → ${e.ok ? 'PEGGED (fresh)' : e.reason}`;
    drain = 0;
  }

  function draw() {
    if (drain < 1) drain = Math.min(1, drain + 0.04);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const exp = expiryOf(MADE, SHELF);
    const e = eligibility(MADE, SHELF, DUE, MRSL);

    // bucket grid + labels
    ctx.textAlign = 'center';
    for (let b = 1; b <= HORIZON; b++) {
      const bx = x0 + (b - 1) * colW;
      ctx.strokeStyle = '#162032'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, y - 30, colW, 60);
      ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
      ctx.fillText('W' + b, bx + colW / 2, y + 48);
    }

    // life bar: from MADE to expiry, drained left→right, red tail region = MRSL guard
    const barY = y - 18, barH = 36;
    const startX = cx(MADE), endX = cx(exp);
    // full faint track
    drawRoundRect(ctx, startX, barY, endX - startX, barH, 8, '#0d1322', '#1e2a3f');
    // animated usable fill
    const fillW = (endX - startX) * drain;
    const grad = ctx.createLinearGradient(startX, 0, endX, 0);
    grad.addColorStop(0, '#10B981'); grad.addColorStop(0.7, '#84CC16'); grad.addColorStop(1, '#F59E0B');
    ctx.save();
    drawRoundRect(ctx, startX, barY, Math.max(2, fillW), barH, 8, '', '');
    ctx.fillStyle = grad; ctx.beginPath();
    ctx.rect(startX, barY, fillW, barH); ctx.fill();
    ctx.restore();

    // MRSL guard band: the last MRSL buckets before expiry are "too close" to consume
    if (MRSL > 0) {
      const guardStart = cx(exp - MRSL);
      ctx.fillStyle = 'rgba(239,68,68,0.18)';
      ctx.fillRect(guardStart, barY, endX - guardStart, barH);
      ctx.strokeStyle = '#EF4444'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(guardStart, barY - 6); ctx.lineTo(guardStart, barY + barH + 6); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '9px system-ui'; ctx.fillStyle = '#EF4444'; ctx.textAlign = 'center';
      ctx.fillText(`MRSL guard (${MRSL})`, (guardStart + endX) / 2, barY - 10);
    }

    // expiry marker
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(endX, y - 40); ctx.lineTo(endX, y + 30); ctx.stroke();
    ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#F59E0B'; ctx.textAlign = 'center';
    ctx.fillText(`expiry W${exp}`, endX, y - 46);

    // made marker
    ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#10B981';
    ctx.fillText(`made W${MADE}`, startX, y - 46);

    // due-date pin + order box
    const dx = cx(DUE);
    ctx.strokeStyle = e.ok ? '#10B981' : '#EF4444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(dx, y + 30); ctx.lineTo(dx, y + 78); ctx.stroke();
    const boxW = 150, boxH = 54, boxX = clamp(dx - boxW / 2, x0, x1 - boxW), boxY = y + 82;
    drawRoundRect(ctx, boxX, boxY, boxW, boxH, 10, '#111827', e.ok ? '#10B981' : '#EF4444');
    ctx.font = 'bold 12px system-ui'; ctx.fillStyle = e.ok ? '#10B981' : '#EF4444'; ctx.textAlign = 'center';
    ctx.fillText(`Order due W${DUE}`, boxX + boxW / 2, boxY + 22);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#94A3B8';
    ctx.fillText(e.ok ? `FRESH · life left ${e.rem}` : `${e.reason} · life left ${e.rem}`, boxX + boxW / 2, boxY + 40);

    // header line
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Lot life vs. order due date', x0, 50);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(`shelf life ${SHELF} · MRSL ${MRSL}`, x0, 66);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  const on = (id, fn) => tab.querySelector(id).addEventListener('click', () => { fn(); sync(); });
  on('#shelf-shelf-dn', () => SHELF--);
  on('#shelf-shelf-up', () => SHELF++);
  on('#shelf-due-dn',   () => DUE--);
  on('#shelf-due-up',   () => DUE++);
  on('#shelf-mrsl-dn',  () => MRSL--);
  on('#shelf-mrsl-up',  () => MRSL++);
  on('#shelf-reset',    () => { SHELF = 5; DUE = 8; MRSL = 0; });
  sync();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: MRSL & FEFO (static, grounded) ────────────────────────────────────
function mrslTab() {
  const rows = [
    ['W2', '5', 'W7', 'W6', '1', 'MRSL 0 ✓ · MRSL 2 ✗'],
    ['W2', '5', 'W7', 'W8', '−1', 'EXPIRED ✗'],
    ['W3', '5', 'W8', 'W6', '2', 'MRSL 2 ✓'],
    ['W4', '3', 'W7', 'W7', '0', 'EXPIRED ✗ (due = expiry)'],
    ['W1', '8', 'W9', 'W6', '3', 'MRSL 2 ✓ (fresh, lots of life)'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Minimum Remaining Shelf Life (MRSL)</div><div class="section-desc">A lot being unexpired is not always enough. MRSL requires a lot to still have at least N buckets of life <em>left</em> at the moment it is consumed or shipped — modelling customers who reject product too close to its expiry date.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Remaining life = expiry − due</div><div class="info-card-body">For a lot made in bucket <code>m</code> with shelf life <code>s</code>, expiry is <code>m + s</code>. Consumed at a demand due in <code>d</code>, the remaining life is <code>(m + s) − d</code>. It must be <strong>&gt; 0</strong> to be unexpired and <strong>≥ MRSL</strong> to be eligible.</div></div>
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Stricter than "not expired"</div><div class="info-card-body">"Not expired" is remaining life &gt; 0. MRSL is remaining life ≥ N. A lot with 1 bucket left passes the first test and <strong>fails</strong> MRSL 2 — so MRSL shrinks the usable window inward from the expiry end.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">FEFO consumption</div><div class="info-card-body">When several lots qualify, the solver prefers <strong>First-Expiry-First-Out</strong>: consume the soonest-to-expire lot first to minimise write-offs. FEFO ≠ FIFO — a later-received lot can expire first and so be consumed first.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Eligibility worked across cases</div><div class="section-desc">Same arithmetic the canvas runs: expiry = made + shelf; remaining = expiry − due; eligible iff due &lt; expiry and remaining ≥ MRSL.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Produced</th><th>Shelf life</th><th>Expiry</th><th>Due</th><th>Remaining life</th><th>Eligible?</th></tr></thead>
          <tbody>${rows.map(([p, s, e, d, r, ok]) => `<tr><td>${p}</td><td>${s}</td><td style="color:#F59E0B">${e}</td><td>${d}</td><td style="font-weight:700;color:var(--accent)">${r}</td><td>${ok}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Shelf life caps build-ahead</h3>
        <p>When capacity is tight the solver likes to <strong>build ahead</strong> and carry inventory to the due date. Shelf life puts a ceiling on that: a pre-built lot must <strong>survive to the due date with at least MRSL life left</strong>. For a far-future order, building now is wasted if the lot would expire (or drop below MRSL) before the order is due — so the solver must <strong>wait</strong> until production is close enough that the output is still fresh on arrival. Perishability and capacity pull in opposite directions, and shelf life is the referee.</p>
      </div>
    </div>`;
}

// ── Tab 3: class-based shelf life (static, grounded) ─────────────────────────
function classTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Class-based shelf life</div><div class="section-desc">Setting a shelf-life value on every individual item is heavy to maintain. Class-based shelf life defines the rule once on a <strong>class / group</strong> of materials; every member item inherits it.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Define once, inherit everywhere</div><div class="info-card-body">A family of materials that share a perishability profile (e.g. a dairy class, a reagent class) gets <strong>one</strong> shelf-life rule on the class. New items added to the class inherit it automatically — no per-SKU setup.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Item override still possible</div><div class="info-card-body">An individual item can carry its own shelf-life value that <strong>overrides</strong> the class default when it genuinely differs — the class is the fallback, not a hard cap.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Pairs with class-based planning</div><div class="info-card-body">Class-based shelf life is one instance of the broader <strong>class-based</strong> idea — planning attributes defined at a group level rather than per hard-pegged item. See the <em>Class-Based Planning</em> module for the general hinge.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">How shelf life rides on lot-based planning</div><div class="section-desc">Shelf life only means something when supply has identity. It is a property of a <strong>lot</strong>, so it sits on top of lot-based planning.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Needs</th><th>Why</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Lot identity</td><td>Expiry is per lot (made-bucket + shelf life). Without discrete lots there is no production date to expire from.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">FEFO selection</td><td>Shelf-life-aware plans rank eligible lots by soonest expiry, so the right lot is consumed before it spoils.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Expiry write-off</td><td>Quantity left in a lot at its expiry bucket is removed from available supply — a real loss the plan should minimise.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>The planner's levers</h3>
        <p>Three knobs shape a perishable plan: <strong>shelf life</strong> (how long a lot lives), <strong>MRSL</strong> (how much life a customer insists remains at delivery), and the <strong>selection rule</strong> (FEFO to burn soonest-expiry first). Together they decide how early the solver dares build, which lot fills which order, and how much product is written off. Set shelf life and MRSL too tight and demands go short; too loose and expired stock piles up.</p>
      </div>
    </div>`;
}
