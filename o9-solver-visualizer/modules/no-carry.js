import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What does the "No Inventory Hold" (no-carry) flag do to a material node, and state the rule precisely.',
    a: 'No-carry marks a material node that <strong>cannot hold inventory across buckets</strong>. The rule is exact: <strong>ending on-hand (EOH) must be zero in every bucket</strong>. Whatever arrives or is produced at the node in a bucket must be <strong>consumed or pushed onward in that same bucket</strong> — nothing can be stored for a later bucket. A normal node lets EOH carry forward (inventory bridges one bucket to the next); a no-carry node forbids that bridge, so there is never any stock sitting at the node at bucket end.',
    tip: 'One line: "No-carry ⇒ EOH = 0 every bucket; produce-and-consume (or push) within the same bucket, no storing for later."' },
  { q: 'What is "push behaviour", and why can the solver not build-ahead <em>into</em> a no-carry node?',
    a: 'Build-ahead works by producing early and <strong>parking the surplus as inventory</strong> until the demand bucket. Since a no-carry node must end every bucket at zero on-hand, there is nowhere to park that surplus — so the solver cannot build-ahead <em>at</em> the node. Instead supply is <strong>pushed through</strong>: anything produced must immediately flow to the next consuming operation or downstream node <strong>within the same bucket</strong>. The node behaves like a <strong>cross-dock / pass-through</strong>, not a warehouse. If build-ahead is needed to cover a future shortage, the carried stock must live <strong>downstream</strong>, at a node that <em>can</em> hold inventory.',
    tip: 'Push = produce and move on in the same bucket. Build-ahead can only happen at a node that can carry — so it moves downstream of the no-carry node.' },
  { q: 'Give a scenario where turning on no-carry forces the solver into a short/late plan or a downstream carry.',
    a: 'Suppose W5 demand is 60 but W5 capacity at the node is only 40. With a <strong>normal</strong> node the solver build-aheads: it produces 20 extra in W3 and carries it as EOH into W5, so the full 60 is met just-in-time. Turn on <strong>no-carry</strong> and that carried 20 is illegal — EOH must be 0 in W3 and W4. The solver now has only two moves: (a) <strong>build-late</strong> — make the extra 20 in W6 and deliver the W5 demand late; or (b) <strong>push the carry downstream</strong> — build the 20 ahead at a downstream node that <em>can</em> hold it, if one exists on the path. It can no longer absorb the W5 crunch at the no-carry node itself.',
    tip: 'No-carry removes inventory as a time-shifting tool at that node, so a capacity crunch becomes build-late or a downstream carry.' },
];

// ── Grounded teaching scenario: a node over W1..W7 ────────────────────────────
// W5 has a capacity crunch: demand 60 but node capacity 40. Normal mode builds
// 20 ahead in W3 and carries EOH into W5. No-carry forbids the carry.
const WEEKS = 7;
const CAP = 40;                 // per-bucket node capacity
const DEMAND = [0, 0, 0, 0, 60, 0, 0];   // W5 needs 60

// Normal plan: produce 40 in W5 (JIT, at cap) + 20 built-ahead in W3, carried W3→W5.
const NORMAL = {
  prod:    [0, 0, 20, 0, 40, 0, 0],      // W3 build-ahead of 20, W5 at cap 40
  consume: [0, 0, 0, 0, 60, 0, 0],
  eoh:     [0, 0, 20, 20, 0, 0, 0],      // 20 carried across W3→W4→consumed W5
  carry:   { from: 2, to: 4, qty: 20 },  // indices (W3→W5)
  lateShort: 0,
};
// No-carry plan: EOH pinned to 0 every bucket. Can only make 40 in W5 (cap).
// The extra 20 must go late (W6) — EOH still 0 everywhere at this node.
const NOCARRY = {
  prod:    [0, 0, 0, 0, 40, 20, 0],      // W5 at cap, remaining 20 build-late W6
  consume: [0, 0, 0, 0, 40, 20, 0],      // pushed out same bucket it is made
  eoh:     [0, 0, 0, 0, 0, 0, 0],        // zero every bucket — the rule
  carry:   null,
  lateShort: 20,                          // 20 of the W5 demand delivered late (W6)
};

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Models Supported',
    title: 'No Inventory Hold (No-Carry)',
    subtitle: 'A flag that forbids a node from holding stock across buckets: ending on-hand must be zero every bucket. Watch build-ahead collapse when the node can no longer park inventory — and the W5 crunch turn into a late delivery.',
    tabs: [
      { id: 'carry',    label: '🚫 Carry vs No-Carry' },
      { id: 'push',     label: '➡️ Push Behaviour', content: pushTab() },
      { id: 'concepts', label: '📖 How It Works', content: conceptsTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live carry vs no-carry canvas ──────────────────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-carry');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One node across <b>W1–W7</b>. <b>W5</b> needs <b>${DEMAND[4]}</b> but the node can only make <b style="color:#F59E0B">${CAP}/bucket</b>. Toggle the <b>No-Carry</b> flag and watch the <b style="color:#38BDF8">carried-inventory bar</b> that bridged W3→W5 disappear — forcing the leftover <b>20</b> to go <b style="color:#EF4444">late</b> in W6. Ending on-hand (<b>EOH</b>) is pinned to <b>0</b> every bucket.</div>
      <canvas id="noc-canvas" width="860" height="360" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="noc-normal">✅ Normal node (can carry)</button>
        <button class="ctrl-btn" id="noc-nocarry">🚫 No-Carry (EOH = 0)</button>
        <button class="ctrl-btn" id="noc-reset">↺ Reset</button>
        <span class="ctrl-label" id="noc-status">Normal node: the solver build-aheads 20 in W3 and carries it to W5.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>W5 demand is <strong>${DEMAND[4]}</strong>, but the node's per-bucket capacity is only <strong>${CAP}</strong>. With a <strong>normal node</strong> the solver has inventory as a time-shifting tool: it produces <strong>20 extra in W3</strong>, carries it as ending on-hand across W3→W4 (the blue carry bar), and consumes it in W5 alongside the 40 made that week — the full 60 arrives <strong>just-in-time</strong>, nothing late.</p>
      <p>Turn on <strong>No-Carry</strong> and the rule bites: <strong>EOH must be 0 in every bucket</strong>. The 20 built in W3 has nowhere to sit — the blue carry bar vanishes. The node can still only make <strong>${CAP}</strong> in W5, so the remaining <strong>20</strong> is produced in <strong>W6 and delivered late</strong>. No-carry removed inventory as a tool at this node, so the W5 capacity crunch it used to absorb now becomes a <strong>late delivery of 20</strong> (or, if a downstream node can hold stock, the carry moves there instead).</p>
    </div>`;

  const canvas = tab.querySelector('#noc-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#noc-status');

  let mode = 'normal';               // 'normal' | 'nocarry'
  let t = 0;                         // transition progress 0..1
  let target = 0;                    // target for t (0 normal, 1 nocarry)

  function setMode(m) {
    mode = m;
    target = m === 'nocarry' ? 1 : 0;
    statusEl.textContent = m === 'nocarry'
      ? `No-Carry: EOH forced to 0 — the W3 build-ahead is illegal, so 20 of the W5 demand goes late in W6.`
      : `Normal node: the solver build-aheads 20 in W3 and carries it to W5.`;
  }
  function reset() { setMode('normal'); }

  const padL = 46, padR = 20, padT = 56, padB = 96;
  const plotW = canvas.width - padL - padR;
  const plotH = canvas.height - padT - padB;
  const colW = plotW / WEEKS;
  const maxVal = 60;
  const yFor = (v) => padT + plotH - (v / maxVal) * plotH;

  let raf = null;
  function draw() {
    t += (target - t) * 0.12;
    const blend = (a, b) => a + (b - a) * t;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // title + capacity line
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Node plan · production, consumption & ending on-hand per bucket', padL, 30);

    // capacity dashed line
    ctx.strokeStyle = '#F59E0B66'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, yFor(CAP)); ctx.lineTo(padL + plotW, yFor(CAP)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#F59E0B'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`capacity ${CAP}/bucket`, padL + 4, yFor(CAP) - 5);

    // baseline
    ctx.strokeStyle = '#1e2a3f'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();

    // carry bar (blue) — spans W3→W5, fades out as t→1
    const carry = NORMAL.carry;
    if (carry && t < 0.98) {
      const alpha = Math.round((1 - t) * 180).toString(16).padStart(2, '0');
      const x0 = padL + carry.from * colW + colW * 0.18;
      const x1 = padL + carry.to * colW + colW * 0.82;
      const yTop = yFor(carry.qty);
      const yBase = padT + plotH;
      drawRoundRect(ctx, x0, yTop, x1 - x0, yBase - yTop, 6, '#38BDF8' + Math.round((1 - t) * 40).toString(16).padStart(2, '0'), '#38BDF8' + alpha);
      ctx.fillStyle = '#38BDF8' + alpha; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`carried ${carry.qty} (W3→W5)`, (x0 + x1) / 2, yTop - 6);
    }

    for (let w = 0; w < WEEKS; w++) {
      const cx = padL + w * colW + colW / 2;
      const bw = colW * 0.26;

      // production bar (interpolate normal↔nocarry)
      const prod = blend(NORMAL.prod[w], NOCARRY.prod[w]);
      if (prod > 0.5) {
        const lateHere = NOCARRY.prod[w] > 0 && NORMAL.prod[w] === 0; // W6 late build appears
        const col = lateHere ? '#EF4444' : '#10B981';
        const h = (prod / maxVal) * plotH;
        drawRoundRect(ctx, cx - bw - 3, padT + plotH - h, bw, h, 4, col + '55', col);
        ctx.fillStyle = col; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(Math.round(prod), cx - bw / 2 - 3, padT + plotH - h - 5);
      }

      // EOH bar (interpolate) — collapses to 0 under no-carry
      const eoh = blend(NORMAL.eoh[w], NOCARRY.eoh[w]);
      if (eoh > 0.5) {
        const h = (eoh / maxVal) * plotH;
        drawRoundRect(ctx, cx + 3, padT + plotH - h, bw, h, 4, '#6366F155', '#6366F1');
        ctx.fillStyle = '#A5B4FC'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(Math.round(eoh), cx + 3 + bw / 2, padT + plotH - h - 5);
      }

      // demand marker (diamond) at W5
      if (DEMAND[w] > 0) {
        const dy = yFor(DEMAND[w]);
        ctx.fillStyle = '#F8717155';
        ctx.strokeStyle = '#F87171'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, dy - 7); ctx.lineTo(cx + 7, dy); ctx.lineTo(cx, dy + 7); ctx.lineTo(cx - 7, dy);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#F87171'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`demand ${DEMAND[w]}`, cx, dy - 12);
      }

      // week label
      ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('W' + (w + 1), cx, padT + plotH + 16);
    }

    // EOH=0 banner under no-carry
    if (t > 0.5) {
      const a = Math.round((t - 0.5) * 2 * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = '#EF4444' + a; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('⛔ No-Carry: EOH = 0 every bucket — nothing may be held', padL, padT + plotH + 38);
      ctx.fillStyle = '#F87171' + a;
      ctx.fillText(`→ 20 of the W5 demand is built in W6 and delivered LATE`, padL, padT + plotH + 54);
    } else {
      const a = Math.round((1 - t * 2 < 0 ? 0 : 1 - t * 2) * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = '#38BDF8' + a; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('✅ Normal node: inventory bridges buckets — 20 built in W3, carried to W5, JIT', padL, padT + plotH + 38);
    }

    // legend
    ctx.textAlign = 'left'; ctx.font = '10px system-ui';
    ctx.fillStyle = '#10B981'; ctx.fillText('■ production', padL + 470, padT + plotH + 38);
    ctx.fillStyle = '#6366F1'; ctx.fillText('■ EOH (held)', padL + 560, padT + plotH + 38);
    ctx.fillStyle = '#EF4444'; ctx.fillText('■ late build', padL + 650, padT + plotH + 38);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#noc-normal').addEventListener('click', () => setMode('normal'));
  tab.querySelector('#noc-nocarry').addEventListener('click', () => setMode('nocarry'));
  tab.querySelector('#noc-reset').addEventListener('click', reset);
  setMode('normal');

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: push behaviour (static, grounded) ──────────────────────────────────
function pushTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Push behaviour — the node is a pass-through, not a warehouse</div><div class="section-desc">Because a no-carry node must end every bucket at zero on-hand, supply cannot stop there. Whatever is made or received is <strong>pushed onward in the same bucket</strong> to the next consuming operation or downstream node.</div></div>

      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Produce-and-move, same bucket</div><div class="info-card-body">Material arriving or produced at the node in bucket W<sub>t</sub> must be <strong>consumed or shipped onward within W<sub>t</sub></strong>. There is no "sit here until next week" — the node cannot bridge buckets.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Build-ahead moves downstream</div><div class="info-card-body">The solver can still build-ahead to beat a future crunch — but the <strong>carried stock must live at a node that can hold it</strong>, downstream of the no-carry node, never at the no-carry node itself.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Synchronise or go late</div><div class="info-card-body">Production must be <strong>synchronised exactly to consumption</strong> at the node. When capacity can't match demand in the due bucket and no carry is allowed, the only remaining move is <strong>build-late</strong> (or a downstream carry).</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">What no-carry models</div><div class="section-desc">Real stages where product genuinely cannot be stored between buckets.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Real stage</th><th>Why it can't hold inventory</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Cross-dock / flow-through DC</td><td>By design, inbound is sorted straight to outbound; the dock is not a storage location.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Mixing / blending point</td><td>A merge node that combines flows and passes them on; it holds nothing of its own.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Molten / hot intermediate</td><td>The material physically cannot be parked between stages (it sets, cools, or degrades).</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Continuous-flow stage</td><td>A process step with no buffer tank — output must feed the next step immediately.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Where the carry goes instead</h3>
        <p>In the canvas, the 20 units that a normal node would have carried at itself could instead be carried <strong>downstream</strong> — at a finished-goods DC that <em>can</em> hold inventory. The no-carry node still produces exactly to what it pushes each bucket (EOH 0), but the <em>finished</em> stock waits at the next node. Build-ahead doesn't disappear; it <strong>relocates</strong> to the first node on the path that is allowed to hold inventory.</p>
      </div>
    </div>`;
}

// ── Tab 3: concepts (static, grounded) ────────────────────────────────────────
function conceptsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The flag and the rule it enforces</div><div class="section-desc">No Inventory Hold is a modelling choice on a material node. It removes inventory as a tool at that node.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">EOH = 0, every bucket</div><div class="info-card-body">The one invariant: ending on-hand at the node is pinned to <strong>zero</strong> in every bucket. Inflow must equal outflow each bucket — the node never carries a balance forward.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">No bucket-to-bucket bridge</div><div class="info-card-body">A normal node uses EOH to <strong>bridge</strong> one bucket to the next — that bridge is exactly what build-ahead rides on. No-carry removes the bridge, so supply can't be time-shifted <em>via inventory</em> at the node.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">A constraint, not an output</div><div class="info-card-body">No-carry doesn't change <em>what</em> the node makes — it restricts <em>when</em>. The solver must find a plan where the node is always balanced, or push the imbalance (late supply, or a downstream carry) elsewhere.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Normal node vs no-carry node</div><div class="section-desc">The same crunch, two behaviours.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th></th><th>Normal node</th><th>No-Carry node</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">EOH across buckets</td><td>May carry forward</td><td style="color:#F87171;font-weight:700">Forced to 0</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Build-ahead at the node</td><td>Yes — park surplus as inventory</td><td style="color:#F87171;font-weight:700">No — nowhere to park</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">W5 crunch (demand 60, cap 40)</td><td>Build 20 in W3, carry → JIT, 0 late</td><td style="color:#F87171;font-weight:700">Make 40 in W5, 20 build-late W6</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Role</td><td>Warehouse — stores between buckets</td><td>Cross-dock — pushes through same bucket</td></tr>
          </tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Interaction with capacity</h3>
        <p>No-carry and finite capacity compound each other. Inventory is normally the solver's escape valve for a capacity shortfall — build early, hold, consume on time. Strip inventory away with no-carry and the escape valve is gone: a bucket whose capacity can't meet its demand has only <strong>build-late</strong> or <strong>push the carry to a downstream holding node</strong> left. That is why a no-carry node sitting just upstream of a tight-capacity operation is one of the harder patterns for the solver to keep on time.</p>
      </div>
    </div>`;
}
