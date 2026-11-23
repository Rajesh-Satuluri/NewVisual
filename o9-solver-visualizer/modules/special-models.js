import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is campaign / batch planning, and what makes the solver group production into campaigns instead of making exactly what each bucket needs?',
    a: 'A <strong>campaign</strong> is a continuous run of like products grouped together so that an expensive <strong>changeover</strong> (clean-down, re-tooling, colour/grade switch) is paid once and amortised over a large quantity. The lever is the <strong>changeover cost / time</strong> plus a <strong>minimum campaign length or batch size</strong>: switching products mid-run is penalised, so the solver prefers to run all of one product (e.g. all white paint) before switching to the next (black). The trade-off is inventory — a campaign builds ahead of demand and carries the surplus — versus the setup it avoids. Without campaign rules the solver would make exactly each bucket\'s need and incur a changeover every switch.',
    tip: 'Campaign = amortise changeover over a long run. The knobs are changeover cost/time and minimum campaign/batch size; the cost is carried inventory.' },
  { q: 'Soft quarantine vs a hard inventory block — what is the difference, and why would you model a receipt as soft-quarantined?',
    a: 'A <strong>quarantine hold</strong> marks received material as <strong>not yet available to peg</strong> — e.g. it is awaiting QC/inspection. A <strong>hard</strong> block means the solver can never touch it until a release event lands. A <strong>soft</strong> quarantine is <em>relaxable</em>: the solver may use the held stock <strong>late or conditionally</strong> (treating the inspection as expeditable) rather than treating it as absent. You model it soft when the hold is a process delay that can be pulled in under pressure — so the plan can show "this demand is only served if QC is expedited" instead of forcing an unnecessary short or late when usable material is physically on site.',
    tip: 'Hard = untouchable until released. Soft = usable late/conditionally, i.e. the hold can be expedited. Soft avoids a false short when stock is really there.' },
  { q: 'How do shipping holidays / non-working calendars change the solver\'s lead-time offset, and what is the planning effect?',
    a: 'Lead-time offset steps <strong>backward from the due date over working days only</strong>. A <strong>shipping holiday</strong> (public holiday, weekend, plant shutdown) is a non-working bucket on the relevant resource or transport calendar, so the offset <strong>skips over it</strong> — the start / order date is pushed <em>earlier</em> than a naive calendar-day count would suggest, because the holiday buckets do not count as transit or production days. Shipping holidays additionally <strong>block transport</strong> in those buckets, so a movement cannot be planned to occur on a holiday. The effect: start dates move earlier and the plan respects when work and shipping can actually happen.',
    tip: 'Offset counts working days; holidays are skipped, pushing starts earlier. Shipping holidays also forbid movement on those buckets.' },
];

// ── Six special cases. Each draws a small, distinct schematic. ────────────────
const CASES = [
  { id: 'altres',   label: '🔀 Alt-Resource Consolidation', accent: '#6366F1' },
  { id: 'campaign', label: '🏭 Campaign / Batch',           accent: '#F59E0B' },
  { id: 'psp',      label: '🥇 Priority Supply (PSP)',       accent: '#10B981' },
  { id: 'quar',     label: '🧪 Soft Quarantine',            accent: '#38BDF8' },
  { id: 'holiday',  label: '📅 Shipping Holidays',          accent: '#A78BFA' },
  { id: 'subst',    label: '🔁 Transition & Substitution',  accent: '#EC4899' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Models Supported',
    title: 'Special Cases',
    subtitle: 'Six smaller modelling capabilities that layer onto the core solver — each a flag or rule on a node, resource, edge or calendar. Click through the gallery to see what each one does, then read the reference and how they compose with everything taught earlier.',
    tabs: [
      { id: 'gallery',  label: '✨ Case Gallery' },
      { id: 'cases',    label: '📖 The Six Cases', content: casesTab() },
      { id: 'config',   label: '🧩 How They Fit', content: configTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the live gallery canvas ────────────────────────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-gallery');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Pick a case. Each schematic is a <b>minimal, real</b> picture of one capability — the same core solver, with one extra rule switched on. Prose for the selected case appears below the canvas.</div>
      <canvas id="spec-canvas" width="860" height="320" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls" id="spec-controls">
        ${CASES.map(c => `<button class="ctrl-btn" data-case="${c.id}">${c.label}</button>`).join('')}
      </div>
      <div class="canvas-caption" id="spec-status" style="margin-top:6px"></div>
    </div>
    <div class="canvas-explainer" id="spec-explain"></div>`;

  const canvas = tab.querySelector('#spec-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#spec-status');
  const explainEl = tab.querySelector('#spec-explain');

  let active = 'altres';
  let t = 0; // animation phase 0..1 looping

  const EXPLAIN = {
    altres: {
      status: 'Alternate-Resource Consolidation — work pooled onto one resource before an alternate is opened.',
      html: `<h3>What you're watching</h3>
        <p>An operation can run on <strong>LINE_A</strong> (primary) or <strong>LINE_B</strong> (alternate). A naive plan might split a 90-unit need 45/45 and incur two setups. With <strong>consolidation</strong> the solver <strong>fills LINE_A first</strong> (to its capacity, here 60) and only spills the remaining 30 onto LINE_B — fewer resources touched, fewer changeovers, less fragmentation. The alternate is opened only when the primary is genuinely full, respecting resource priority / cost.</p>`,
    },
    campaign: {
      status: 'Campaign / Batch — like products grouped into one continuous run to amortise changeovers.',
      html: `<h3>What you're watching</h3>
        <p>Top row: production <strong>fragmented</strong> — W-A-W-B-W-A — a costly <strong>changeover</strong> (orange gap) every switch. Bottom row: the same products run as <strong>campaigns</strong> — all <span style="color:#38BDF8">white</span> together, then all <span style="color:#F59E0B">amber</span> — so the changeover is paid once and spread over a long run. The levers are <strong>changeover cost/time</strong> and a <strong>minimum campaign length / batch size</strong>; the price of grouping is inventory carried ahead of demand.</p>`,
    },
    psp: {
      status: 'Priority-based Supply Planning — scarce supply allocated to the highest-priority demand first.',
      html: `<h3>What you're watching</h3>
        <p>One scarce supply of <strong>70</strong> feeds two demands: <strong>D1 (priority 1, needs 60)</strong> and <strong>D2 (priority 2, needs 50)</strong>. Priority-based supply planning honours <strong>demand priority strictly</strong>: D1 is filled completely (60) first, and only the remaining <strong>10</strong> flows to D2, which goes short by 40. Supply is phased through the network to the most important demand rather than split evenly — the shortage lands on the lower-priority order by design.</p>`,
    },
    quar: {
      status: 'Soft Quarantine — a QC hold that is relaxable, so the solver may use the stock late/conditionally.',
      html: `<h3>What you're watching</h3>
        <p>A receipt of <strong>50</strong> lands in a <strong>quarantine hold</strong> (awaiting QC) and is <em>not</em> immediately peggable. A <strong>hard</strong> block would leave a demand short while usable stock sits on site. A <strong>soft</strong> quarantine is <strong>relaxable</strong> — watch the held block <strong>release</strong> and flow to the waiting demand once the hold is (conditionally/late) lifted. The plan can then say "served only if QC is expedited" instead of forcing a false short.</p>`,
    },
    holiday: {
      status: 'Shipping Holidays — the lead-time offset steps over non-working buckets, pushing starts earlier.',
      html: `<h3>What you're watching</h3>
        <p>An order is due in <strong>W7</strong> with a <strong>3-working-day lead time</strong>. <strong>W5</strong> is a <span style="color:#A78BFA">holiday</span> (greyed). The offset counts <em>working days only</em>, so stepping back 3 working days from W7 skips the holiday and lands the start in <strong>W3</strong>, not W4 — the holiday <strong>pushes the start earlier</strong>. Shipping holidays also <strong>block transport</strong> on those buckets, so no movement can be planned across a holiday.</p>`,
    },
    subst: {
      status: 'Transition & Substitution — use-up/phase-out an old item, or fill a short with an approved alternate.',
      html: `<h3>What you're watching</h3>
        <p>Two related behaviours. <strong>Transition</strong>: item <strong>OLD</strong> phases out into <strong>NEW</strong> on an effectivity date — the solver <strong>uses up OLD first</strong>, then switches to NEW. <strong>Substitution</strong>: when the <strong>primary</strong> item is short, demand reroutes to an approved <strong>substitute</strong> (per a substitution rule/ratio and priority). The arrow shows the demand that the primary can't cover being picked up by the substitute instead of going short.</p>`,
    },
  };

  function setCase(id) {
    active = id; t = 0;
    const e = EXPLAIN[id];
    statusEl.textContent = e.status;
    explainEl.innerHTML = e.html;
    tab.querySelectorAll('[data-case]').forEach(b => b.classList.toggle('active', b.dataset.case === id));
  }

  // ── per-case draw helpers ───────────────────────────────────────────────────
  function box(x, y, w, h, fill, stroke, label, val, sub, lblColor) {
    drawRoundRect(ctx, x, y, w, h, 10, fill, stroke);
    ctx.textAlign = 'center';
    if (label) { ctx.font = 'bold 12px system-ui'; ctx.fillStyle = lblColor || '#CBD5E1'; ctx.fillText(label, x + w / 2, y + 22); }
    if (val != null) { ctx.font = 'bold 24px system-ui'; ctx.fillStyle = '#E2E8F0'; ctx.fillText(String(val), x + w / 2, y + h / 2 + 16); }
    if (sub) { ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B'; ctx.fillText(sub, x + w / 2, y + h - 10); }
  }

  function drawAltres() {
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Need 90 units · consolidate onto the primary first', 40, 40);
    box(60, 90, 150, 110, '#111827', '#6366F1', 'LINE_A (primary)', null, 'cap 60');
    box(650, 90, 150, 110, '#111827', '#334155', 'LINE_B (alt)', null, 'cap 60');
    // fill bars
    const fillA = Math.min(1, t * 2);          // fills first
    const fillB = Math.max(0, Math.min(1, (t - 0.5) * 2));
    drawRoundRect(ctx, 72, 150, 126 * fillA, 36, 6, '#6366F155', '#6366F1');
    ctx.textAlign = 'center'; ctx.font = 'bold 15px system-ui'; ctx.fillStyle = '#E2E8F0';
    ctx.fillText(`${Math.round(60 * fillA)} / 60`, 135, 176);
    drawRoundRect(ctx, 662, 150, 126 * fillB, 36, 6, '#38BDF855', '#38BDF8');
    ctx.fillText(`${Math.round(30 * fillB)} / 60`, 725, 176);
    // flow
    drawArrow(ctx, 430, 120, 60 + 150, 145, '#6366F1AA', 2);
    if (t > 0.5) drawArrow(ctx, 430, 120, 650, 145, '#38BDF8AA', 2);
    box(360, 90, 140, 60, '#0d1322', '#475569', 'Demand', 90, null);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B'; ctx.textAlign = 'center';
    ctx.fillText(t > 0.5 ? 'Primary full → 30 spills to alt (1 extra setup)' : 'Fill primary first…', 430, 250);
  }

  function drawCampaign() {
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Fragmented (6 changeovers)  vs  Campaigned (1 changeover)', 40, 40);
    const seqFrag = ['w', 'c', 'w', 'c', 'w', 'c'];
    const seqCamp = ['w', 'w', 'w', 'c', 'c', 'c'];
    const col = { w: '#38BDF8', c: '#F59E0B' };
    const cw = 110, gap = 14, x0 = 60;
    seqFrag.forEach((p, i) => {
      const x = x0 + i * (cw + gap);
      drawRoundRect(ctx, x, 80, cw, 50, 8, col[p] + '33', col[p]);
      if (i > 0 && seqFrag[i] !== seqFrag[i - 1]) { ctx.fillStyle = '#EF4444'; ctx.fillRect(x - gap, 80, gap, 50); }
    });
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui'; ctx.fillText('red = changeover', x0, 150);
    seqCamp.forEach((p, i) => {
      const x = x0 + i * (cw + gap);
      drawRoundRect(ctx, x, 190, cw, 50, 8, col[p] + '33', col[p]);
      if (i > 0 && seqCamp[i] !== seqCamp[i - 1]) { ctx.fillStyle = '#EF4444'; ctx.fillRect(x - gap, 190, gap, 50); }
    });
    // animated "amortise" sweep on campaign row
    const sx = x0 + (t * ((cw + gap) * 6));
    ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, 185); ctx.lineTo(sx, 245); ctx.stroke();
    ctx.fillStyle = '#10B981'; ctx.font = '10px system-ui'; ctx.fillText('one setup amortised over the whole run', x0, 268);
  }

  function drawPsp() {
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Scarce supply 70 → priority order wins', 40, 40);
    box(360, 70, 140, 70, '#111827', '#10B981', 'Supply', 70, 'scarce');
    box(60, 180, 150, 90, '#111827', '#10B981', 'D1 · priority 1', null, 'needs 60');
    box(650, 180, 150, 90, '#111827', '#334155', 'D2 · priority 2', null, 'needs 50');
    const f1 = Math.min(1, t * 2);
    const f2 = Math.max(0, Math.min(1, (t - 0.5) * 2));
    drawRoundRect(ctx, 72, 232, 126 * f1, 28, 6, '#10B98155', '#10B981');
    ctx.textAlign = 'center'; ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#E2E8F0';
    ctx.fillText(`${Math.round(60 * f1)} / 60`, 135, 252);
    drawRoundRect(ctx, 662, 232, 126 * f2 * (10 / 50), 28, 6, '#EF444455', '#EF4444');
    ctx.fillText(`${Math.round(10 * f2)} / 50`, 725, 252);
    drawArrow(ctx, 410, 140, 150, 200, '#10B981AA', 2.4);
    if (t > 0.5) drawArrow(ctx, 450, 140, 700, 200, '#64748BAA', 1.6);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(t > 0.5 ? 'D1 filled → only 10 left for D2 (short 40)' : 'Fill priority-1 first…', 430, 300);
  }

  function drawQuar() {
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Receipt 50 held for QC · soft hold can release', 40, 40);
    const released = t > 0.55;
    box(80, 110, 170, 110, released ? '#0d2a1f' : '#2a1f0d', released ? '#10B981' : '#38BDF8',
      released ? 'RELEASED' : 'QUARANTINE', 50, released ? 'now peggable' : 'awaiting QC');
    box(620, 110, 170, 110, '#111827', '#475569', 'Demand', 50, released ? 'served (late)' : 'waiting');
    if (released) {
      const fx = 250 + (t - 0.55) / 0.45 * 370;
      drawArrow(ctx, 250, 165, Math.min(fx, 620), 165, '#10B981CC', 2.4);
      ctx.fillStyle = '#10B981';
    } else {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(250, 165); ctx.lineTo(620, 165); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#EF4444';
    }
    ctx.textAlign = 'center'; ctx.font = '11px system-ui';
    ctx.fillText(released ? 'soft quarantine relaxed → used conditionally/late' : 'hard block would leave demand short', 435, 260);
  }

  function drawHoliday() {
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Due W7, lead 3 working days · W5 is a holiday', 40, 40);
    const N = 7, cw = 96, gap = 10, x0 = 50, y = 120, h = 70;
    const holiday = 5, due = 7, start = 3;
    for (let i = 1; i <= N; i++) {
      const x = x0 + (i - 1) * (cw + gap);
      const isHol = i === holiday;
      const isDue = i === due;
      const isStart = i === start;
      drawRoundRect(ctx, x, y, cw, h, 8,
        isHol ? '#1e2030' : '#111827',
        isDue ? '#10B981' : isStart ? '#F59E0B' : isHol ? '#A78BFA' : '#334155');
      ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui';
      ctx.fillStyle = isHol ? '#A78BFA' : '#CBD5E1'; ctx.fillText('W' + i, x + cw / 2, y + 26);
      ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B';
      ctx.fillText(isDue ? 'DUE' : isStart ? 'START' : isHol ? 'HOLIDAY' : 'work day', x + cw / 2, y + 48);
    }
    // animated offset arrow stepping back over working days, skipping W5
    const xOf = (i) => x0 + (i - 1) * (cw + gap) + cw / 2;
    const steps = [7, 6, 4, 3]; // skip 5
    const prog = Math.min(steps.length - 1, Math.floor(t * (steps.length - 1) + 0.0001));
    for (let s = 0; s < prog; s++) {
      drawArrow(ctx, xOf(steps[s]), y - 8, xOf(steps[s + 1]), y - 8, '#F59E0BCC', 2);
    }
    ctx.textAlign = 'center'; ctx.font = '11px system-ui'; ctx.fillStyle = '#A78BFA';
    ctx.fillText('offset counts working days only → skips W5 → start lands in W3 (not W4)', 430, 245);
  }

  function drawSubst() {
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Transition: use up OLD → switch to NEW   ·   Substitution: short PRIMARY → ALT', 40, 36);
    // transition row
    box(60, 70, 150, 64, '#111827', '#64748B', 'OLD (phase-out)', null, 'use up first');
    box(300, 70, 150, 64, '#111827', '#EC4899', 'NEW', null, 'after effectivity');
    const tx = 210 + t * 90;
    drawArrow(ctx, 210, 102, Math.min(tx, 300), 102, '#EC4899CC', 2);
    // substitution row
    box(60, 180, 150, 80, '#111827', '#475569', 'PRIMARY', 30, 'short — needs 60');
    box(620, 180, 150, 80, '#111827', '#10B981', 'SUBSTITUTE', null, 'fills the gap');
    box(330, 190, 140, 60, '#0d1322', '#334155', 'Demand 60', null, null);
    drawArrow(ctx, 210, 215, 330, 215, '#475569AA', 1.6);
    if (t > 0.4) { const sx = 470 + (t - 0.4) / 0.6 * 150; drawArrow(ctx, 470, 220, Math.min(sx, 620), 220, '#10B981CC', 2.2); }
    ctx.textAlign = 'center'; ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText('primary covers 30 of 60 → remaining 30 routes to the approved substitute', 430, 295);
  }

  const DRAW = { altres: drawAltres, campaign: drawCampaign, psp: drawPsp, quar: drawQuar, holiday: drawHoliday, subst: drawSubst };

  let raf = null;
  function draw() {
    t += 0.006; if (t > 1) t = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    (DRAW[active] || drawAltres)();
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelectorAll('[data-case]').forEach(b => b.addEventListener('click', () => setCase(b.dataset.case)));
  setCase('altres');

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: the six cases (static reference) ───────────────────────────────────
function casesTab() {
  const rows = [
    ['Alternate-Resource Consolidation', 'When an operation has alternate resources, the solver fills one resource before opening an alternate — consolidating split production to cut setups and fragmentation, by resource priority / cost.', 'Work can run on several interchangeable lines/machines and you want fewer, fuller runs.'],
    ['Campaign / Batch', 'Groups like products into a continuous run (a campaign) so an expensive changeover is paid once. A minimum campaign length / batch size and a changeover cost/time drive the grouping.', 'Changeovers are costly (clean-downs, colour/grade switches) and inventory to carry a campaign is cheaper than switching often.'],
    ['Priority-based Supply Planning (PSP)', 'A supply-allocation pass that honours demand priority strictly: scarce supply is phased to the highest-priority demand first, across the network, rather than split evenly.', 'Supply is constrained and service to the most important demand must be protected.'],
    ['Soft Quarantine', 'Received material placed on a QC/inspection hold is not peggable. A soft hold is relaxable — the solver may use it late or conditionally — unlike a hard block that is untouchable until released.', 'Inspection holds that can realistically be expedited; you don\'t want a false short while usable stock is on site.'],
    ['Shipping Holidays / Calendars', 'Non-working buckets (holidays, weekends, shutdowns) on a resource/transport calendar. Lead-time offset counts working days only, skipping holidays and pushing starts earlier; transport is blocked on those buckets.', 'Plants and lanes have real non-working days that must shape start/ship dates.'],
    ['Transition & Substitution', 'Transition phases an old item out into a new one on effectivity dates (use up old first). Substitution lets an approved alternate item fill a demand the primary can\'t, per a substitution rule/ratio and priority.', 'Product changeovers / NPI roll-overs, or approved alternates that protect service when the primary is short.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Six special capabilities</div><div class="section-desc">Each is a modelling option switched on where it is needed — none changes the core order-by-order heuristic, they add one rule to it.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Capability</th><th>What it does</th><th>When to use</th></tr></thead>
          <tbody>${rows.map(([n, d, w]) => `<tr><td style="font-weight:600;color:var(--text)">${n}</td><td>${d}</td><td style="color:var(--text2)">${w}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:20px">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Consolidation vs splitting</div><div class="info-card-body">Alternate resources let the solver <em>spread</em> work; consolidation makes it prefer to <strong>pack one resource before opening the next</strong>, trading flexibility for fewer setups.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Campaign ↔ inventory</div><div class="info-card-body">A longer minimum campaign avoids changeovers but <strong>builds ahead of demand</strong> and carries the surplus. The knobs are changeover cost/time and minimum campaign/batch size.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Soft ≠ ignored</div><div class="info-card-body">A soft quarantine still <strong>delays</strong> availability — it just lets the solver reach for the held stock under pressure instead of pretending it isn\'t there.</div></div>
      </div>
    </div>`;
}

// ── Tab 3: how they fit (static) ──────────────────────────────────────────────
function configTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">How these compose with the core solver</div><div class="section-desc">Everything here sits on top of the order-by-order heuristic, lead-time offset, capacity, lot sizing, yield and pegging you have already seen. Each special case is a flag or rule attached to the relevant object.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Capability</th><th>Lives on…</th><th>Composes with</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Alt-resource consolidation</td><td>A resource / alternate-resource set</td><td>Capacity, sourcing priority</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Campaign / batch</td><td>A resource + changeover rule</td><td>Lot sizing, capacity, build-ahead</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">PSP (priority supply)</td><td>The supply-allocation pass</td><td>Demand priority / sorting, fair-share</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Soft quarantine</td><td>A material node / receipt</td><td>On-hand, pegging, lead time</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Shipping holidays</td><td>A resource / transport calendar</td><td>Lead-time offset, movement planning</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Transition & substitution</td><td>Item effectivity + substitution rule</td><td>BOM, sourcing, priority</td></tr>
          </tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>The through-line</h3>
        <p>None of these is a different solver. The order-by-order heuristic still plans each demand to completion in priority order; these rules only change <strong>what counts as eligible supply</strong> (soft quarantine, substitution, supply codes), <strong>which resource or bucket a flow may land on</strong> (alt-resource consolidation, campaign, shipping holidays), or <strong>how shortage is distributed</strong> (PSP). That is why they combine freely — a campaign-planned item can still be lot-sized, yield-grossed, shelf-life-limited and priority-allocated at the same time.</p>
      </div>

      <div class="info-grid" style="margin-top:16px">
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Calendars touch everything</div><div class="info-card-body">Working-day calendars and shipping holidays feed the <strong>lead-time offset</strong> that every production and movement edge uses, so a holiday quietly reshapes start dates across the whole network.</div></div>
        <div class="info-card" style="border-left:3px solid #EC4899"><div class="info-card-title">Transition needs effectivity</div><div class="info-card-body">Product transition relies on <strong>effectivity dates</strong> on the item / BOM so the solver knows when OLD stops and NEW starts — substitution instead fires on-demand when the primary falls short.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Model only what matters</div><div class="info-card-body">Each capability adds model size and runtime. Switch one on where the real supply chain needs it; leave it off where the simpler core already gives the right plan.</div></div>
      </div>
    </div>`;
}
