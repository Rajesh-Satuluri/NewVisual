import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'What is a dbt macro, and how does Jinja templating enable it?',
    a: `A dbt macro is a reusable block of SQL logic defined with Jinja templating. When dbt compiles your project, it renders Jinja into plain SQL before executing.
    <br><br>
    <strong>The key Jinja constructs:</strong>
    <ul>
      <li><code>{{ }}</code> — expressions that output values: <code>{{ ref('stg_orders') }}</code></li>
      <li><code>{% %}</code> — statements (logic, no output): <code>{% if is_incremental() %}</code></li>
      <li><code>{# #}</code> — comments stripped at compile time</li>
    </ul>
    <strong>A macro:</strong>
    <div style="margin:6px 0;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-2)">
    {% macro cents_to_dollars(column_name) %}<br>
    &nbsp;&nbsp;({{ column_name }} / 100.0)::DECIMAL(10,2)<br>
    {% endmacro %}<br><br>
    -- Usage in a model:<br>
    SELECT {{ cents_to_dollars('order_total_cents') }} AS order_total
    </div>
    <strong>Compiles to:</strong>
    <div style="margin:6px 0;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-2)">
    SELECT (order_total_cents / 100.0)::DECIMAL(10,2) AS order_total
    </div>`,
    tip: 'The "Jinja renders at compile time, not runtime" distinction is important. The warehouse never sees Jinja — it only sees plain SQL. This means macros have no runtime overhead.',
  },
  {
    q: 'You have a fiscal quarter calculation used across 15 models. How do you refactor it with macros, and what are the benefits?',
    a: `<strong>Before (15 models with copied code):</strong>
    <div style="margin:6px 0;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-2)">
    -- In every model:<br>
    CASE<br>
    &nbsp;&nbsp;WHEN EXTRACT(MONTH FROM transaction_date) IN (4,5,6) THEN 'Q1'<br>
    &nbsp;&nbsp;WHEN EXTRACT(MONTH FROM transaction_date) IN (7,8,9) THEN 'Q2'<br>
    &nbsp;&nbsp;WHEN EXTRACT(MONTH FROM transaction_date) IN (10,11,12) THEN 'Q3'<br>
    &nbsp;&nbsp;ELSE 'Q4'<br>
    END AS fiscal_quarter
    </div>
    <strong>After (one macro, 15 simple references):</strong>
    <div style="margin:6px 0;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-2)">
    -- macros/fiscal_quarter.sql<br>
    {% macro fiscal_quarter(date_col) %}<br>
    CASE<br>
    &nbsp;&nbsp;WHEN EXTRACT(MONTH FROM {{ date_col }}) IN (4,5,6) THEN 'Q1'<br>
    &nbsp;&nbsp;-- ...<br>
    END<br>
    {% endmacro %}<br><br>
    -- In every model:<br>
    {{ fiscal_quarter('transaction_date') }} AS fiscal_quarter
    </div>
    <strong>Benefits:</strong>
    <ul>
      <li>Single source of truth for fiscal year logic — change it once, affects all 15 models on next compile.</li>
      <li>Testable: you can test the macro's output in isolation.</li>
      <li>Self-documenting: the macro name tells you what it does; the SQL tells you how.</li>
    </ul>`,
    tip: 'The fiscal quarter example is perfect because it\'s a real pain point in banking and retail. Fiscal years are company-specific (Amazon starts in Q1 = October), so hardcoding month ranges in 15 models is a maintenance disaster.',
  },
  {
    q: 'What is the difference between dbt macros and dbt packages? When would you build vs install?',
    a: `<strong>Macros</strong> are reusable Jinja functions within your dbt project. They live in the <code>macros/</code> directory and are available to all models in your project.
    <br><br>
    <strong>Packages</strong> are external dbt projects you install as dependencies. They can contain models, macros, tests, seeds, and snapshots. Configured in <code>packages.yml</code> and installed with <code>dbt deps</code>.
    <br><br>
    <strong>Build your own macros when:</strong>
    <ul>
      <li>The logic is specific to your business domain (fiscal year, custom revenue definition).</li>
      <li>You need to keep logic proprietary.</li>
      <li>The functionality is simple enough that a package would be overkill.</li>
    </ul>
    <strong>Install a package when:</strong>
    <ul>
      <li><strong>dbt_utils:</strong> date_spine, surrogate_key, safe_divide — generic utilities that would take days to build correctly.</li>
      <li><strong>dbt_expectations:</strong> Great Expectations-style tests for dbt — 40+ additional test types.</li>
      <li><strong>dbt_audit_helper:</strong> Compare two model versions to validate a refactoring didn't change outputs.</li>
      <li><strong>Fivetran/Airbyte packages:</strong> Pre-built staging models for Salesforce, Stripe, HubSpot sources.</li>
    </ul>
    <strong>Rule:</strong> Never hand-build what dbt_utils already does correctly. It's maintained by hundreds of contributors; your custom surrogate_key implementation probably has edge cases.`,
    tip: 'Mentioning dbt_audit_helper shows production maturity. It\'s specifically for "I want to refactor this model but need to prove the numbers don\'t change." Most candidates have never heard of it.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M14 · Core Features',
    title: 'Macros & Reuse',
    subtitle: 'Write the logic once. Reference it everywhere. Change it once — propagated everywhere.',
    tabs: [
      { id: 'visual', label: '🎬 DRY vs WET' },
      { id: 'detail', label: '📋 How Macros Work' },
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
    <button class="ctrl-btn" id="m14-edit">✏ Change Fiscal Year Rule</button>
    <button class="ctrl-btn" id="m14-reset">↺ Reset</button>
    <span class="ctrl-label">See how a single logic change propagates differently with and without macros</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  // Left side: WITHOUT macros (5 SQL boxes, all duplicate code)
  // Right side: WITH macros (1 macro box + 5 model boxes pointing to it)
  const MODEL_NAMES = ['fct_revenue', 'dim_orders', 'int_quarterly', 'rpt_finance', 'fct_tax'];
  const BAD_SQL = "CASE WHEN MONTH IN (4,5,6) THEN 'Q1'…";
  const GOOD_SQL = "{{ fiscal_quarter('tx_date') }}";
  const MACRO_SQL = "{% macro fiscal_quarter(col) %}…{% endmacro %}";

  let state = {
    editAnim: 0,    // 0→1 when "change" button is clicked
    editDone: false,
    highlightIdx: -1,  // for left side: which box is being "edited" sequentially
    editTimer: 0,
  };

  ctrl.querySelector('#m14-edit').addEventListener('click', () => {
    if (!state.editDone) { state.editAnim = 1.0; state.highlightIdx = 0; state.editTimer = 0; }
  });
  ctrl.querySelector('#m14-reset').addEventListener('click', () => {
    state = { editAnim: 0, editDone: false, highlightIdx: -1, editTimer: 0 };
  });

  function rr(ctx, x, y, w, h, r, fill, stroke, sw) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw||1.5; ctx.stroke(); }
  }

  function arw(ctx, x1, y1, x2, y2, col) {
    const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy);
    if (len < 2) return;
    const ux = dx/len, uy = dy/len;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2-ux*7, y2-uy*7);
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2-ux*8-uy*4, y2-uy*8+ux*4); ctx.lineTo(x2-ux*8+uy*4, y2-uy*8-ux*4);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    // Animate left side: highlight each duplicate box in sequence (0.5s each)
    if (state.highlightIdx >= 0 && state.highlightIdx < MODEL_NAMES.length) {
      state.editTimer += dt;
      if (state.editTimer > 0.45) {
        state.editTimer = 0;
        state.highlightIdx++;
        if (state.highlightIdx >= MODEL_NAMES.length) {
          state.highlightIdx = -1;
          state.editDone = true;
        }
      }
    }

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Divider
    ctx.strokeStyle = '#1E2D43'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(W/2, 30); ctx.lineTo(W/2, H - 30); ctx.stroke();
    ctx.setLineDash([]);

    // ── LEFT: WITHOUT MACROS ─────────────────────────────────────
    const lx = 14;
    ctx.fillStyle = state.editDone ? '#EF4444' : '#4B5E78';
    ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('WITHOUT MACROS · 5 files with copied code', lx + 185, 20);

    MODEL_NAMES.forEach((name, i) => {
      const bx = lx, by = 32 + i * 74;
      const isHighlighted = state.highlightIdx === i;
      const wasEdited = state.editDone || (state.highlightIdx > i && state.highlightIdx >= 0);
      const col = isHighlighted ? '#F59E0B' : wasEdited ? '#EF444488' : '#3B82F688';
      const bg  = isHighlighted ? '#2A1A00' : wasEdited ? '#1A0A0A' : '#0D1F3C';

      rr(ctx, bx, by, 380, 62, 6, bg, col);

      if (isHighlighted) {
        // Pulsing attention
        ctx.save(); ctx.globalAlpha = 0.3 + Math.sin(state.editTimer * 20) * 0.3;
        rr(ctx, bx-2, by-2, 384, 66, 7, null, '#F59E0B', 3);
        ctx.restore();
      }

      ctx.fillStyle = isHighlighted ? '#F59E0B' : wasEdited ? '#EF4444' : '#3B82F6';
      ctx.font = 'bold 9px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(isHighlighted ? `✏ Editing: ${name}` : wasEdited ? `✗  ${name} (needs update)` : name, bx + 10, by + 16);

      ctx.fillStyle = '#4B5E78'; ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(BAD_SQL, bx + 10, by + 30);

      if (isHighlighted || wasEdited) {
        ctx.fillStyle = isHighlighted ? '#F59E0B88' : '#EF444488';
        ctx.font = '8px Inter, sans-serif';
        ctx.fillText(isHighlighted ? '← editing here now' : '← same change needed here too', bx + 10, by + 46);
      }
    });

    if (state.editDone) {
      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`5 files edited · 5 PR reviews · 5 chances for inconsistency`, lx + 190, H - 16);
    }

    // ── RIGHT: WITH MACROS ───────────────────────────────────────
    const rx = W/2 + 10;
    ctx.fillStyle = state.editDone ? '#10B981' : '#4B5E78';
    ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('WITH MACROS · 1 macro · 5 references', rx + 185, 20);

    // Macro box (top, centered)
    const macroY = 32;
    const macroHighlight = state.editDone;
    rr(ctx, rx + 90, macroY, 200, 50, 6,
      macroHighlight ? '#0A2A0A' : '#12102A',
      macroHighlight ? '#10B981' : '#8B5CF6', macroHighlight ? 2 : 1.5);
    ctx.fillStyle = macroHighlight ? '#10B981' : '#8B5CF6';
    ctx.font = 'bold 9px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(macroHighlight ? '✓  fiscal_quarter.sql' : 'fiscal_quarter.sql', rx + 100, macroY + 18);
    ctx.fillStyle = '#4B5E78'; ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(macroHighlight ? 'Updated once ✓' : MACRO_SQL, rx + 100, macroY + 33);

    // Model boxes pointing to macro
    MODEL_NAMES.forEach((name, i) => {
      const bx = rx, by = 100 + i * 62;
      rr(ctx, bx, by, 200, 46, 6,
        state.editDone ? '#0A1F1A' : '#0D1F3C',
        state.editDone ? '#10B98188' : '#3B82F688');
      ctx.fillStyle = state.editDone ? '#10B981' : '#3B82F6';
      ctx.font = 'bold 9px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(state.editDone ? `✓  ${name}` : name, bx + 10, by + 16);
      ctx.fillStyle = '#4B5E78'; ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(GOOD_SQL, bx + 10, by + 30);

      // Arrow to macro
      arw(ctx, bx + 200, by + 22, rx + 190, macroY + 25,
        state.editDone ? '#10B98155' : '#8B5CF644');
    });

    if (state.editDone) {
      ctx.fillStyle = '#10B981'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('1 file edited · 1 PR review · 0 chance of inconsistency', rx + 190, H - 16);
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The WET vs DRY problem in SQL</h3>
      <p>WET = "Write Everything Twice." In a typical analytics project, the same business logic appears in dozens of models: fiscal quarter calculations, currency conversions, customer tier logic, revenue recognition rules. Each copy is a future maintenance liability — a bug fix or business rule change requires hunting down every copy.</p>
      <p>dbt macros solve this with Jinja templating: define the logic once as a macro function, reference it everywhere. When the rule changes, update one file.</p>
    </div>
    <div class="detail-section">
      <h3>Building a macro</h3>
      <div class="code-block">-- macros/fiscal_quarter.sql
{% macro fiscal_quarter(date_col) %}
  CASE
    WHEN EXTRACT(MONTH FROM {{ date_col }}) IN (4, 5, 6)  THEN 'FY-Q1'
    WHEN EXTRACT(MONTH FROM {{ date_col }}) IN (7, 8, 9)  THEN 'FY-Q2'
    WHEN EXTRACT(MONTH FROM {{ date_col }}) IN (10,11,12) THEN 'FY-Q3'
    ELSE 'FY-Q4'
  END
{% endmacro %}

-- In any model:
SELECT
    {{ fiscal_quarter('transaction_date') }} AS fiscal_quarter,
    SUM(revenue) AS total_revenue
FROM {{ ref('stg_transactions') }}
GROUP BY 1</div>
    </div>
    <div class="detail-section">
      <h3>The dbt_utils package: macros you don't need to build</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">generate_surrogate_key</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">Key generation</div>
          <div class="info-card-body">Creates a consistent hash-based surrogate key from a list of columns. Handles NULLs correctly — rolling your own version has subtle bugs.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">date_spine</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">Date tables</div>
          <div class="info-card-body">Generates a table with every date between two endpoints. Foundation for filling gaps in time-series data (no-sale days, inactive user days).</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">safe_divide</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Safety</div>
          <div class="info-card-body"><code>{{ dbt_utils.safe_divide('numerator', 'denominator') }}</code> — returns NULL instead of dividing by zero. Eliminates a class of runtime errors from all division in your project.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">audit_helper</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Refactoring</div>
          <div class="info-card-body">Compare outputs of two model versions row-by-row. Proves a refactor didn't change any numbers before you promote to production.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>What problem did macros solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Business logic spread across dozens of SQL files meant every rule change required a multi-file hunt-and-replace. Macros enforce DRY — one definition, compiled everywhere — turning multi-file refactors into single-file edits.</p>
    </div>
  `;
}
