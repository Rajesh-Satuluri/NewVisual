import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is a "supply code" in the SCS, and what is the default rule for which supply can satisfy which demand?',
    a: 'A <strong>supply code</strong> is a label (an attribute) carried on both <strong>supply</strong> and <strong>demand</strong> that segments one physical material into logically separate pools. By default the rule is <strong>strict matching</strong>: a demand can only be pegged to supply whose supply code <strong>equals</strong> the demand\'s supply code. So the same item, at the same node, in the same bucket can be split into <code>CONTRACT</code>, <code>DEDICATED-A</code> and <code>FREE</code> pools — and a demand tagged <code>DEDICATED-A</code> will <strong>not</strong> consume <code>CONTRACT</code> or <code>FREE</code> supply even though it is physically identical. It is how planners <strong>reserve or ring-fence</strong> inventory and production for a customer, a contract or a channel.',
    tip: 'One line: "a supply code is a compatibility tag; by default demand only pegs to supply with the exact same code — it partitions one material into reserved pools."' },
  { q: 'What does "Mix & Match" change, and can you work a short fallback example?',
    a: '<strong>Mix &amp; Match</strong> relaxes the strict one-to-one match: for a given <em>demand</em> supply code you define a <strong>ranked list</strong> of acceptable <em>supply</em> codes, and the solver tries them <strong>in priority order</strong>. Example — demand <code>D-X</code> (qty 60) is configured as <code>CONTRACT → FREE</code>. Say the node holds <code>CONTRACT = 40</code> and <code>FREE = 50</code>. The solver first takes all <strong>40 from CONTRACT</strong> (the preferred code), then <strong>mixes into FREE for the remaining 20</strong>, leaving <code>FREE = 30</code>. Under <strong>strict</strong> matching the same demand would peg only 40 from CONTRACT and be <strong>20 short</strong> — Mix &amp; Match turns that short into a full fill by allowing the controlled fallback.',
    tip: 'Mix & Match = a ranked list of acceptable codes per demand code. Preferred first, fall back down the list. Without it, a code mismatch is simply a short.' },
  { q: 'How does supply-code eligibility interact with the solver\'s normal priority / FIFO selection?',
    a: 'Supply-code eligibility is a <strong>filter applied first</strong>, before the ordinary selection rules. The solver asks "which supply is this demand <em>allowed</em> to use?" — under strict matching that is the one matching code; under Mix &amp; Match it is the ranked set, considered best-code-first. <strong>Only the code-eligible supply then enters the usual ranking</strong> (priority, FIFO/FEFO, lot selection). So supply codes never <em>re-order</em> priority; they <em>shrink the candidate pool</em> that priority then sorts. A high-priority demand still cannot reach supply whose code it is not eligible for — segmentation beats priority on the <em>eligibility</em> question, and priority decides only among what survives the filter.',
    tip: 'Eligibility filter first (which supply am I allowed to touch), then normal priority/FIFO ranks what passes. Codes narrow the pool; they don\'t reshuffle priority.' },
];

// ── Grounded teaching model: one material node, three coded supply pools ───────
const POOLS = [
  { code: 'CONTRACT',    qty: 40, color: '#38BDF8' },
  { code: 'DEDICATED-A', qty: 30, color: '#A78BFA' },
  { code: 'FREE',        qty: 50, color: '#10B981' },
];
// Two demands. D-A strictly needs DEDICATED-A. D-X prefers CONTRACT, Mix&Match → FREE.
const DEMANDS = [
  { id: 'D-A', qty: 25, pref: ['DEDICATED-A'],       color: '#A78BFA' },
  { id: 'D-X', qty: 60, pref: ['CONTRACT', 'FREE'],  color: '#38BDF8' },
];

// Resolve allocations. mode = 'strict' | 'mix'. Demands planned in listed order.
function allocate(mode) {
  const pool = {}; POOLS.forEach(p => pool[p.code] = p.qty);
  const result = [];
  for (const d of DEMANDS) {
    let need = d.qty;
    const picks = [];
    // In strict mode only the FIRST (preferred) code is eligible; in mix, the whole ranked list.
    const eligible = mode === 'mix' ? d.pref : d.pref.slice(0, 1);
    for (const code of eligible) {
      if (need <= 0) break;
      const avail = pool[code] || 0;
      const take = Math.min(need, avail);
      if (take > 0) { picks.push({ code, take }); pool[code] -= take; need -= take; }
    }
    result.push({ id: d.id, qty: d.qty, picks, short: need });
  }
  return { result, pool };
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Models Supported',
    title: 'Supply Code (+ Mix & Match)',
    subtitle: 'One physical material, split into logically separate pools by a supply-code tag. By default a demand may only touch supply with its matching code. Toggle Mix & Match and watch a demand fall back down a ranked list of acceptable codes instead of going short.',
    tabs: [
      { id: 'codes',    label: '🧮 Code Matching' },
      { id: 'mixmatch', label: '🔀 Mix & Match', content: mixMatchTab() },
      { id: 'concepts', label: '📖 How It Works', content: conceptsTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live supply-code allocation (Strict vs Mix & Match) ────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-codes');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One node holds three coded pools — <b style="color:#38BDF8">CONTRACT 40</b>, <b style="color:#A78BFA">DEDICATED-A 30</b>, <b style="color:#10B981">FREE 50</b>. Two demands plan in order: <b>D-A</b> (25, needs DEDICATED-A) then <b>D-X</b> (60, prefers CONTRACT). Switch <b>Strict</b> vs <b>Mix &amp; Match</b> and Step — watch whether D-X goes short or spills into FREE.</div>
      <canvas id="sc-canvas" width="860" height="360" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="sc-strict">🔒 Strict match</button>
        <button class="ctrl-btn" id="sc-mix">🔀 Mix &amp; Match</button>
        <button class="ctrl-btn" id="sc-step">▶ Step demand</button>
        <button class="ctrl-btn" id="sc-reset">↺ Reset</button>
        <span class="ctrl-label" id="sc-status">Pick a mode, then Step through the demands.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Both demands see the same physical on-hand, but the <strong>supply code</strong> decides what each is <em>allowed</em> to touch. <strong>D-A</strong> needs <code>DEDICATED-A</code>; it takes 25 of the 30 dedicated units and is filled in either mode — the <code>CONTRACT</code> and <code>FREE</code> pools are invisible to it. The interesting one is <strong>D-X</strong>, which wants 60 and prefers <code>CONTRACT</code> (40 available).</p>
      <p>Under <strong>Strict match</strong>, D-X is only eligible for its matching code: it pegs <strong>40 from CONTRACT</strong> and is <strong>20 short</strong> — even though 50 units of FREE are sitting right there, uncommitted. Under <strong>Mix &amp; Match</strong> D-X carries a ranked list <code>CONTRACT → FREE</code>: it still takes the <strong>40 from CONTRACT first</strong>, then <strong>mixes into FREE for the last 20</strong>, finishing fully pegged and leaving <code>FREE = 30</code>. Same inventory, same priority — the only change is whether the fallback code is allowed.</p>
    </div>`;

  const canvas = tab.querySelector('#sc-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#sc-status');

  let mode = 'strict';
  let solved = allocate(mode);
  let shown = 0;   // number of demands revealed
  let pop = 0;

  function setMode(m) {
    mode = m; solved = allocate(mode); shown = 0; pop = 12;
    statusEl.textContent = `${mode === 'mix' ? 'Mix & Match' : 'Strict match'}: Step to plan D-A, then D-X.`;
  }
  function step() {
    if (shown >= DEMANDS.length) return;
    shown++; pop = 12;
    const r = solved.result[shown - 1];
    const got = r.picks.reduce((s, p) => s + p.take, 0);
    const from = r.picks.map(p => `${p.take}×${p.code}`).join(' + ') || 'nothing';
    statusEl.textContent = r.short > 0
      ? `${r.id}: pegged ${got}/${r.qty} from ${from} — SHORT ${r.short}.`
      : `${r.id}: pegged ${got}/${r.qty} from ${from} — filled.`;
  }
  function reset() { shown = 0; pop = 12; statusEl.textContent = `${mode === 'mix' ? 'Mix & Match' : 'Strict match'}: Step to plan D-A, then D-X.`; }

  // layout
  const poolX = 50, poolW = 150, poolGap = 26, poolY = 70, poolH = 120;
  const demX = 620, demW = 190, demH = 96, demGap = 28, demY0 = 60;

  let raf = null;
  function draw() {
    if (pop > 0) pop--;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Coded supply pools · one material node', poolX, 44);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(`mode: ${mode === 'mix' ? 'Mix & Match' : 'Strict match'}`, poolX, 60);

    // remaining per pool (after revealed demands)
    const remain = {}; POOLS.forEach(p => remain[p.code] = p.qty);
    for (let i = 0; i < shown; i++) solved.result[i].picks.forEach(p => remain[p.code] -= p.take);

    POOLS.forEach((p, i) => {
      const x = poolX + i * (poolW + poolGap);
      drawRoundRect(ctx, x, poolY, poolW, poolH, 12, '#111827', p.color + '99');
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui'; ctx.fillStyle = p.color;
      ctx.fillText(p.code, x + poolW / 2, poolY + 26);

      // fill bar for remaining
      const barX = x + 18, barW = poolW - 36, barY = poolY + 44, barH = 40;
      drawRoundRect(ctx, barX, barY, barW, barH, 6, '#0d1322', '#1e2a3f');
      const frac = p.qty > 0 ? Math.max(0, remain[p.code]) / p.qty : 0;
      if (frac > 0) drawRoundRect(ctx, barX, barY, barW * frac, barH, 6, p.color + '44', p.color);
      ctx.font = 'bold 16px system-ui'; ctx.fillStyle = '#E2E8F0';
      ctx.fillText(`${Math.max(0, remain[p.code])} / ${p.qty}`, x + poolW / 2, barY + 27);
      ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B';
      ctx.fillText('remaining', x + poolW / 2, poolY + poolH - 8);
    });

    // demands on the right
    DEMANDS.forEach((d, i) => {
      const y = demY0 + i * (demH + demGap);
      const r = solved.result[i];
      const revealed = i < shown;
      const isLatest = i === shown - 1;
      const grow = isLatest ? (pop / 12) * 3 : 0;
      const bx = demX - grow, by = y - grow, bw = demW + grow * 2, bh = demH + grow * 2;
      const got = revealed ? r.picks.reduce((s, p) => s + p.take, 0) : 0;
      const isShort = revealed && r.short > 0;
      const border = !revealed ? '#1e2a3f' : isShort ? '#EF4444' : '#10B981';
      drawRoundRect(ctx, bx, by, bw, bh, 12, '#111827', border);

      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui'; ctx.fillStyle = revealed ? '#E2E8F0' : '#475569';
      ctx.fillText(`${d.id} · needs ${d.qty}`, bx + bw / 2, by + 24);
      ctx.font = '10px system-ui'; ctx.fillStyle = d.color;
      ctx.fillText(`prefers ${d.pref.join(' → ')}`, bx + bw / 2, by + 42);

      if (revealed) {
        ctx.font = 'bold 22px system-ui';
        ctx.fillStyle = isShort ? '#EF4444' : '#10B981';
        ctx.fillText(`${got} / ${d.qty}`, bx + bw / 2, by + 70);
        ctx.font = 'bold 10px system-ui'; ctx.fillStyle = isShort ? '#EF4444' : '#10B981';
        ctx.fillText(isShort ? `SHORT ${r.short}` : 'filled', bx + bw / 2, by + bh - 8);
      } else {
        ctx.font = '11px system-ui'; ctx.fillStyle = '#334155';
        ctx.fillText('waiting', bx + bw / 2, by + 70);
      }

      // peg lines from each consumed pool to this demand
      if (revealed) {
        r.picks.forEach(pk => {
          const pi = POOLS.findIndex(p => p.code === pk.code);
          const px = poolX + pi * (poolW + poolGap) + poolW;
          const py = poolY + poolH / 2;
          drawArrow(ctx, px, py, bx - 4, by + bh / 2, POOLS[pi].color + 'CC', 1.8);
        });
      }
    });

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#sc-strict').addEventListener('click', () => setMode('strict'));
  tab.querySelector('#sc-mix').addEventListener('click', () => setMode('mix'));
  tab.querySelector('#sc-step').addEventListener('click', step);
  tab.querySelector('#sc-reset').addEventListener('click', reset);
  setMode('strict');

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: Mix & Match (static, grounded) ─────────────────────────────────────
function mixMatchTab() {
  const fallback = [
    ['CONTRACT', 'CONTRACT → FREE', 'Prefer committed contract stock; borrow uncommitted FREE only if contract is short.'],
    ['DEDICATED-A', 'DEDICATED-A', 'No fallback — customer-A stock is ring-fenced; a short stays a short.'],
    ['EXPORT', 'EXPORT → FREE → DOMESTIC', 'Prefer export-cleared stock; then free; then pull from domestic as a last resort.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Mix &amp; Match — a ranked list of acceptable codes</div><div class="section-desc">Strict matching forces one code per demand. Mix &amp; Match lets a demand code accept a <strong>prioritised set</strong> of supply codes, tried best-first, so a controlled fallback replaces an avoidable short.</div></div>

      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Preferred first</div><div class="info-card-body">The solver always exhausts the <strong>top-ranked</strong> eligible code before touching the next. In the demo D-X takes all <strong>40 from CONTRACT</strong> before any FREE.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Then fall back in order</div><div class="info-card-body">Only the shortfall spills to the next code down the list — <strong>20 into FREE</strong>, leaving FREE = 30. The list is walked top-to-bottom until the demand is filled or the list is exhausted.</div></div>
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Empty list ⇒ strict</div><div class="info-card-body">A demand code with no fallback configured behaves exactly like strict matching — it is eligible for its own code only, and any gap is a genuine short (as DEDICATED-A stays here).</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Example ranked-fallback configuration</div><div class="section-desc">Per demand supply code, the ordered list of supply codes the solver may Mix &amp; Match into. Left is tried first.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Demand supply code</th><th>Acceptable supply codes (ranked)</th><th>Effect</th></tr></thead>
          <tbody>${fallback.map(([d, l, e]) => `<tr><td style="font-weight:700;color:var(--accent)">${d}</td><td style="color:var(--text)"><code>${l}</code></td><td>${e}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Strict vs Mix &amp; Match on the same shortfall</h3>
        <p>Take D-X needing <strong>60</strong> with <code>CONTRACT = 40</code> and <code>FREE = 50</code>. <strong>Strict:</strong> eligible for CONTRACT only → pegs 40, <strong>short 20</strong>. <strong>Mix &amp; Match <code>CONTRACT → FREE</code>:</strong> pegs 40 from CONTRACT, then 20 from FREE → <strong>filled</strong>, FREE drops to 30. The planner has traded a hard short for a controlled, auditable borrow — and because FREE is walked only after CONTRACT, committed stock is still protected first.</p>
      </div>
    </div>`;
}

// ── Tab 3: concepts (static, grounded) ────────────────────────────────────────
function conceptsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">What a supply code does</div><div class="section-desc">A supply code is an attribute on both supply and demand. It carves one physical material into logically separate, reserved pools so the solver respects commercial segmentation, not just quantity.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Segment one material</div><div class="info-card-body">Same item, same node, same bucket — but split into pools like <code>CONTRACT</code> / <code>DEDICATED-A</code> / <code>FREE</code>. The split is logical, not physical; the units are identical.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Reserve &amp; ring-fence</div><div class="info-card-body">Supply tagged for a customer, contract or channel is <strong>invisible</strong> to demands that don't carry that code — the way planners protect dedicated stock without physically separating it.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Strict by default</div><div class="info-card-body">With no Mix &amp; Match configured, a demand pegs <strong>only</strong> to supply with the exact same code. A mismatch is a short — the solver will not quietly borrow across codes.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Where it sits in the selection pipeline</div><div class="section-desc">Supply-code eligibility is a filter applied <em>before</em> the ordinary ranking rules.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Step</th><th>What happens</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:700;color:var(--accent)">1 · Eligibility filter</td><td>Keep only supply whose code the demand may use — its own code (strict) or its ranked set (Mix &amp; Match), best-code-first.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">2 · Normal ranking</td><td>Within the surviving pool, apply the usual <strong>priority</strong>, <strong>FIFO / FEFO</strong> and lot-selection rules.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">3 · Peg or short</td><td>Consume the ranked supply; if the eligible pool can't cover the need, the remainder is a short with a code-related reason.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>When to use it — and its cost</h3>
        <p>Reach for supply codes when the business rule is <em>"this stock belongs to that demand"</em>: contracted vs spot, customer-dedicated vs free, export vs domestic, allocated vs uncommitted. The cost is that segmentation can manufacture shorts — a demand can starve beside plenty of the <em>wrong</em>-coded supply. <strong>Mix &amp; Match</strong> is the release valve: it keeps the preference ("use the right pool first") while allowing an ordered, auditable fallback instead of a hard short. Over-segmenting without fallbacks is the classic way to make a plan look infeasible when the material is actually there.</p>
      </div>
    </div>`;
}
