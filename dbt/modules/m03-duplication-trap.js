import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'A tax calculation rule changes. Describe the blast radius in a system where that logic is duplicated 15 times across different SQL files.',
    a: `<strong>Immediate blast radius:</strong>
    <ul>
      <li>The developer who notices the change must hunt through all 15 files — there's no automated way to find them without grep-ing the codebase.</li>
      <li>High probability of missing 1–3 copies, especially in rarely-run reports or ad-hoc notebooks.</li>
      <li>Each file must be tested independently since there's no shared test suite.</li>
    </ul>
    <strong>Hidden blast radius:</strong>
    <ul>
      <li>Reports that run weekly/monthly won't show the wrong number until they next execute — creating a silent data quality issue that could go unnoticed for weeks.</li>
      <li>Downstream models that consume those reports compound the error.</li>
      <li>Cross-team inconsistency: the Marketing team updates their copy the same day; Finance updates theirs 2 weeks later during their sprint. 2-week window of disagreement on the same metric.</li>
    </ul>
    <strong>With dbt:</strong> The tax calculation is in one model file. One PR, one review, one deploy. All 15 downstream consumers automatically get the updated logic.`,
    tip: 'The "silent inconsistency window" is a key point most candidates miss. The blast radius isn\'t just the files you have to edit — it\'s the time gap between when teams update their copies.',
  },
  {
    q: 'Explain the dbt staging → intermediate → marts layering pattern. Why does this specifically solve the duplication problem?',
    a: `<strong>The three layers:</strong>
    <ol>
      <li><strong>Staging (stg_*):</strong> One model per source table. Light cleaning only: rename columns to snake_case, cast types, standardize NULLs. No business logic. Called by nothing downstream except intermediate models.</li>
      <li><strong>Intermediate (int_*):</strong> Business logic lives here. Joins, calculations, denormalization. An <code>int_order_enriched</code> model joins orders + customers + products once. Every downstream consumer uses <code>ref('int_order_enriched')</code>.</li>
      <li><strong>Marts (fct_*, dim_*):</strong> Final business-facing tables optimized for specific audiences. <code>fct_revenue</code>, <code>dim_customer</code>. These are what dashboards connect to.</li>
    </ol>
    <strong>Why it kills duplication:</strong> The JOIN of orders + customers + products lives in exactly one place: the intermediate layer. All 15 reports that previously each wrote their own JOIN now call <code>ref('int_order_enriched')</code>. When the JOIN needs to change, it changes in one file.`,
    tip: 'Draw the three layers on a whiteboard when explaining this. The visual communication of "staging cleans, intermediate joins, marts serve" lands much better than prose alone.',
  },
  {
    q: 'Customer lifetime value (CLV) is calculated differently by 3 analysts. What is the minimum dbt implementation that guarantees they all use the same formula?',
    a: `<ol>
      <li><strong>Create <code>models/intermediate/int_customer_lifetime_value.sql</code>:</strong> Write the canonical CLV calculation once. Document every assumption in the model's description in <code>schema.yml</code>.</li>
      <li><strong>dbt test:</strong> Add a <code>not_null</code> test on the CLV column and a custom test that asserts CLV is always positive and within a reasonable range (e.g., &gt;0 and &lt;$50,000 for a B2C business).</li>
      <li><strong>dbt docs:</strong> Run <code>dbt docs generate</code>. Every analyst can see the formula, the business definition, and the test coverage in the data catalog.</li>
      <li><strong>Enforce usage:</strong> Add a <code>meta.owner</code> tag and require all new CLV consumers to use <code>ref('int_customer_lifetime_value')</code>. A linting rule (e.g., dbt-project-evaluator) can flag models that reimplement CLV logic inline.</li>
    </ol>`,
    tip: 'Adding dbt-project-evaluator to the answer shows you know the tooling ecosystem beyond just core dbt — which is a differentiator at the senior level.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M03 · Foundation',
    title: 'The Duplication Trap',
    subtitle: 'A single SQL pipeline gets copy-pasted 12 times. When one business rule changes, watch the chaos unfold.',
    tabs: [
      { id: 'visual', label: '🎬 Live Demo' },
      { id: 'detail', label: '📋 The Problem' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  const cv = document.createElement('canvas');
  cv.width = 820; cv.height = 420;
  cv.style.cssText = 'width:100%;max-width:820px';
  wrap.appendChild(cv);

  const ctrl = document.createElement('div');
  ctrl.className = 'canvas-controls';
  ctrl.innerHTML = `
    <button class="ctrl-btn" id="m03-dup">📋 Duplicate</button>
    <button class="ctrl-btn" id="m03-rule">⚠️ Tax Rule Changed!</button>
    <button class="ctrl-btn" id="m03-reset">↺ Reset</button>
    <span class="ctrl-label">First duplicate the SQL, then change a business rule</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  const STEPS = ['Orders', 'Customers', 'Products', 'Discounts', 'Tax Calc', 'Revenue'];
  const STEP_COLORS = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#FF694B'];

  let state;
  function init() {
    state = {
      copies: 1,
      flashTimer: 0,
      flashing: false,
      editIdx: -1,
      editTimer: 0,
      editCount: 0,
      phase: 'normal',
    };
  }
  init();

  ctrl.querySelector('#m03-dup').addEventListener('click', () => {
    if (state.copies < 12 && state.phase === 'normal') state.copies++;
  });
  ctrl.querySelector('#m03-rule').addEventListener('click', () => {
    if (state.phase !== 'editing' && state.copies > 1) {
      state.phase = 'editing';
      state.editIdx = 0;
      state.editCount = 0;
      state.editTimer = 0;
    }
  });
  ctrl.querySelector('#m03-reset').addEventListener('click', init);

  function getBoxLayout(count) {
    if (count === 1) return [{ x: 310, y: 60, scale: 1 }];
    const cols = count <= 4 ? 2 : 4;
    const rows = Math.ceil(count / cols);
    const bw = count <= 4 ? 320 : 170;
    const bh = count <= 4 ? 280 : 150;
    const gx = count <= 4 ? 40 : 20;
    const gy = count <= 4 ? 20 : 10;
    const totalW = cols * bw + (cols - 1) * gx;
    const startX = (W - totalW) / 2;
    const totalH = rows * bh + (rows - 1) * gy;
    const startY = (H - totalH) / 2 - 10;
    const layout = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      layout.push({
        x: startX + col * (bw + gx),
        y: startY + row * (bh + gy),
        w: bw, h: bh,
        scale: count <= 4 ? 1 : 0.6,
      });
    }
    return layout;
  }

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    if (state.phase === 'editing') {
      state.editTimer += dt;
      if (state.editTimer > 0.5) {
        state.editTimer = 0;
        state.editIdx++;
        state.editCount++;
        if (state.editIdx >= state.copies) {
          state.editIdx = -1;
          state.phase = 'done';
        }
      }
    }

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Counter badge
    ctx.fillStyle = state.copies >= 10 ? '#EF4444' : state.copies >= 6 ? '#F59E0B' : '#10B981';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${state.copies} cop${state.copies === 1 ? 'y' : 'ies'} of this pipeline`, W - 14, 22);

    const layout = getBoxLayout(state.copies);
    const scale = layout[0].scale;
    const bw = layout[0].w || 200;
    const bh = layout[0].h || 300;

    layout.forEach((pos, copyIdx) => {
      const isEditing = state.phase === 'editing' && copyIdx === state.editIdx;
      const isDone = state.phase === 'done' || (state.phase === 'editing' && copyIdx < state.editIdx);

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Box shadow/highlight
      if (isEditing) {
        ctx.shadowColor = '#FF694B';
        ctx.shadowBlur = 20;
      }

      rr(ctx, 0, 0, bw, bh, 8,
        isEditing ? '#2A1810' : isDone ? '#0F1A0F' : '#131D2E',
        isEditing ? '#FF694B' : isDone ? '#10B981' : '#1E2D43'
      );
      ctx.shadowBlur = 0;

      // Header
      const label = state.copies === 1 ? 'order_pipeline.sql' : `pipeline_v${copyIdx+1}.sql`;
      ctx.fillStyle = isDone ? '#10B981' : isEditing ? '#FF694B' : '#4B5E78';
      ctx.font = `bold ${Math.round(9 * scale + 2)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('📄  ' + label, 8, 18);

      if (isEditing) {
        ctx.fillStyle = '#FF694B';
        ctx.font = `bold ${Math.round(9 * scale + 2)}px Inter, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('✏ editing...', bw - 8, 18);
      } else if (isDone) {
        ctx.fillStyle = '#10B981';
        ctx.textAlign = 'right';
        ctx.font = `${Math.round(9 * scale + 2)}px Inter, sans-serif`;
        ctx.fillText('✓ updated', bw - 8, 18);
      }

      // Steps
      const stepH = (bh - 30) / STEPS.length;
      STEPS.forEach((step, si) => {
        const sy = 26 + si * stepH;
        const highlight = step === 'Tax Calc' && (isEditing || state.phase === 'done');
        rr(ctx, 6, sy, bw - 12, stepH - 3, 4,
          highlight ? '#3D1A10' : '#0F1626', null);
        const dot = STEP_COLORS[si];
        ctx.beginPath();
        ctx.arc(16, sy + stepH/2 - 1, Math.max(3, 5 * scale), 0, Math.PI * 2);
        ctx.fillStyle = highlight ? '#FF694B' : dot;
        ctx.fill();
        ctx.fillStyle = highlight ? '#FF8068' : '#8895AA';
        ctx.font = `${Math.round(9 * scale + 1)}px Inter, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(step, 28, sy + stepH/2 + 3);
        if (si < STEPS.length - 1) {
          ctx.fillStyle = '#1E2D43';
          ctx.fillRect(bw/2 - 0.5, sy + stepH - 3, 1, 3);
        }
      });

      ctx.restore();
    });

    // Status message
    let msg = '';
    if (state.phase === 'editing') {
      msg = `Editing copy ${state.editIdx + 1} of ${state.copies}… (${state.copies - state.editIdx - 1} remaining)`;
    } else if (state.phase === 'done') {
      msg = `Done! Updated ${state.copies} files. The tax calc is fixed — or is it? Did you miss any?`;
    } else if (state.copies >= 12) {
      msg = '12 copies exist. One tax rule change = 12 files to edit. Every. Single. Time.';
    } else if (state.copies > 1) {
      msg = 'Keep duplicating. Feel the maintenance cost growing.';
    } else {
      msg = 'Start by clicking "Duplicate" to see what happens in the real world.';
    }

    ctx.fillStyle = state.phase === 'done' ? '#F59E0B' : '#4B5E78';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W/2, H - 12);

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The DRY principle — and why data teams ignore it</h3>
      <p>Software engineers have a rule: <strong>Don't Repeat Yourself</strong>. A function that calculates tax belongs in one place. Every caller references the function. When the rule changes, you update one file.</p>
      <p>Data teams routinely violate this rule — not out of carelessness, but because the tools didn't make it easy. Before dbt, sharing SQL logic meant either copy-pasting it (fragile) or creating a database view (hidden dependency nightmare).</p>
    </div>
    <div class="detail-section">
      <h3>The CLV disaster — a real pattern</h3>
      <p>Three analysts each need customer lifetime value. They each write it from scratch:</p>
      <div class="code-block"><span class="cmt">-- Analyst 1: simple average</span>
<span class="kw">SELECT</span> customer_id, <span class="fn">AVG</span>(order_total) * <span class="num">12</span> <span class="kw">AS</span> clv
<span class="kw">FROM</span> raw_orders <span class="kw">GROUP BY</span> 1

<span class="cmt">-- Analyst 2: includes refunds</span>
<span class="kw">SELECT</span> o.customer_id,
  (<span class="fn">SUM</span>(o.total) - <span class="fn">COALESCE</span>(<span class="fn">SUM</span>(r.amount), <span class="num">0</span>)) * <span class="num">12</span> <span class="kw">AS</span> clv
<span class="kw">FROM</span> raw_orders o
<span class="kw">LEFT JOIN</span> raw_refunds r <span class="kw">ON</span> o.id = r.order_id
<span class="kw">GROUP BY</span> <span class="num">1</span>

<span class="cmt">-- Analyst 3: weighted by recency</span>
<span class="kw">SELECT</span> customer_id,
  <span class="fn">SUM</span>(order_total * <span class="fn">POW</span>(<span class="num">0.9</span>, days_since)) * <span class="num">12</span> <span class="kw">AS</span> clv
<span class="kw">FROM</span> raw_orders <span class="kw">GROUP BY</span> <span class="num">1</span></div>
      <p>Three different CLV numbers. Marketing, Product, and ML models trained on different customer values. Everyone is confused about why their results don't match.</p>
    </div>
    <div class="detail-section">
      <h3>Real maintenance cost at scale</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#EF4444">
          <div class="info-card-title">Swiggy</div>
          <div class="info-card-tag" style="color:#EF4444;background:#EF444422">Food Delivery</div>
          <div class="info-card-body">Delivery fee calculation changed when surge pricing launched. Affected 23 SQL files across 6 teams. 4 teams updated their copy the first week. 2 teams ran stale numbers for 3 more weeks.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">Banking</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Risk</div>
          <div class="info-card-body">Interest calculation rule changed per new RBI regulation. Risk team had 18 SQL files. Auditors found 3 files still using the old formula 6 months after the regulatory change.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>What problem did this module show?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">When business logic lives in 12 copies of a SQL file, every rule change is a 12-file audit. One missed copy means wrong data silently reaching production.</p>
    </div>
  `;
}
