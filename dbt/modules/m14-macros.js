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
  {
    q: 'Macros run at compile time, not run time. What does that let them do — and what can they never do?',
    a: `Because Jinja is rendered <em>before</em> any SQL reaches the warehouse, a macro's only job is to <strong>produce SQL text</strong>:
    <ul>
      <li><strong>Can:</strong> branch on static context dbt provides — <code>target.name</code>, <code>adapter.type()</code>, <code>var()</code>, the model's config, a list of columns — and loop to generate SQL. All resolved from project metadata, not data.</li>
      <li><strong>Cannot:</strong> see or react to query <em>results</em>. A macro doesn't know a table's row count, a column's max value, or whether a row exists — those are runtime facts. Anything that needs them must be expressed <em>in</em> the SQL the macro emits (e.g. a subquery), not decided by the macro.</li>
    </ul>
    A practical consequence: a macro has no runtime overhead (the warehouse sees only plain SQL), and "make this behave differently based on the data" is a SQL problem, not a macro problem.`,
    tip: 'The clean line: "macros shape the SQL string from static context; they can\'t read data." It stops the common misconception that a macro can loop over query results.',
  },
  {
    q: 'Walk through how `dbt_utils.generate_surrogate_key` is implemented and why each piece matters.',
    a: `It builds a deterministic hash key across several columns:
    <div style="margin:8px 0;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;font-family:var(--font-mono);font-size:11px;color:var(--text-2)">
    md5(<br>
    &nbsp;&nbsp;coalesce(cast(order_id as varchar), '_null_') || '-' ||<br>
    &nbsp;&nbsp;coalesce(cast(line_number as varchar), '_null_')<br>
    )
    </div>
    <ul>
      <li><strong><code>{% for %}</code> over the field list</strong> — one codebase handles any number of key columns; <code>loop.last</code> places separators only <em>between</em> fields.</li>
      <li><strong><code>cast(... as varchar)</code></strong> — hash inputs must be text so types don't change the key.</li>
      <li><strong><code>coalesce(..., '_null_')</code></strong> — without it, any NULL makes the whole concatenation NULL, so <em>all</em> rows with a null key collide into one hash. The sentinel keeps nulls distinct.</li>
      <li><strong>Separator <code>'-'</code></strong> — prevents <code>('ab','c')</code> and <code>('a','bc')</code> from producing the same concatenation.</li>
    </ul>
    That's four subtle correctness details — exactly why you install dbt_utils instead of hand-writing it.`,
    tip: 'The NULL-coalescing and the separator are the two edge cases interviewers probe. Naming both shows you understand why a "simple" surrogate key macro is easy to get wrong.',
  },
  {
    q: 'How would you make one model emit different SQL on Snowflake vs BigQuery? Is that a good idea?',
    a: `Use a macro that branches on the adapter and <strong>dispatch</strong> to per-warehouse implementations:
    <ul>
      <li>Inline: <code>{% if adapter.type() == 'bigquery' %} … {% else %} … {% endif %}</code> for a small difference.</li>
      <li>Idiomatic: <code>{% macro my_thing() %}{{ return(adapter.dispatch('my_thing')()) }}{% endmacro %}</code> with <code>default__my_thing</code> and <code>bigquery__my_thing</code> implementations — this is exactly how dbt_utils stays cross-warehouse.</li>
    </ul>
    <strong>Is it good?</strong> Only when you genuinely must support multiple warehouses (a package author, or a company mid-migration). For a single-warehouse project it's needless complexity — write the dialect you run on. The judgement signal is: abstract across adapters when you <em>have</em> multiple adapters, not speculatively.</p>`,
    tip: '<code>adapter.dispatch</code> is the senior keyword here — it is the real mechanism behind cross-database packages. Add the caveat "don\'t abstract adapters you don\'t have" to show you weigh complexity.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M14 · Core Features',
    title: 'Macros & Reuse',
    subtitle: 'Write the logic once. Reference it everywhere. Change it once — propagated everywhere.',
    tabs: [
      { id: 'visual', label: '🎬 DRY vs WET' },
      { id: 'lab',    label: '🔬 Lab · Expand a macro' },
      { id: 'detail', label: '📋 How Macros Work' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildLab(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Lab · Expand a macro ──────────────────────────────────────────────────────
// Pick a macro, change its arguments, and see the compiled SQL it renders to.
// Covers arguments & defaults, a {% for %} loop (surrogate key), a computed CASE
// (fiscal quarter), and environment-aware logic (target.name). The expansions
// here match what dbt's Jinja would render — compilation, not execution.
const esc14 = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const splitList = s => s.split(',').map(x => x.trim()).filter(Boolean);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MACROS = {
  cents: {
    name: 'cents_to_dollars',
    args: [{ k: 'col', label: 'column_name', val: 'amount_cents' }, { k: 'scale', label: 'scale', val: '2' }],
    def: `{% macro cents_to_dollars(column_name, scale=2) %}
    ({{ column_name }} / 100)::numeric(16, {{ scale }})
{% endmacro %}`,
    build: (a) => ({
      call: `select
    order_id,
    {{ cents_to_dollars('${a.col}'${a.scale !== '2' ? `, ${a.scale}` : ''}) }} as amount_usd
from {{ ref('stg_orders') }}`,
      compiled: `select
    order_id,
    (${a.col} / 100)::numeric(16, ${a.scale || '2'}) as amount_usd
from "analytics"."stg_orders"`,
      note: 'A plain parameterised expression with a default (<code>scale=2</code>). Change one argument and every call site recompiles — this is the DRY win.',
    }),
  },
  skey: {
    name: 'dbt_utils.generate_surrogate_key',
    args: [{ k: 'fields', label: 'field_list (comma-sep)', val: 'order_id, line_number' }],
    def: `{% macro generate_surrogate_key(field_list) %}
    md5(
        {%- for f in field_list %}
        coalesce(cast({{ f }} as varchar), '_null_')
        {%- if not loop.last %} || '-' || {% endif %}
        {%- endfor %}
    )
{% endmacro %}`,
    build: (a) => {
      const fs = splitList(a.fields);
      const inner = fs.map((f, i) => `        coalesce(cast(${f} as varchar), '_null_')${i < fs.length - 1 ? " || '-' ||" : ''}`).join('\n');
      return {
        call: `select
    {{ dbt_utils.generate_surrogate_key([${fs.map(f => `'${f}'`).join(', ')}]) }} as id,
    *
from {{ ref('stg_order_items') }}`,
        compiled: `select
    md5(\n${inner}\n    ) as id,
    *
from "analytics"."stg_order_items"`,
        note: `The <code>{% for %}</code> loop emits one <code>coalesce(...)</code> per field and a separator between them (<code>loop.last</code> suppresses the trailing one). Add or remove fields above — the loop rewrites the hash. ${fs.length} field(s) tracked.`,
      };
    },
  },
  fiscal: {
    name: 'fiscal_quarter',
    args: [{ k: 'date', label: 'date_col', val: 'order_date' }, { k: 'start', label: 'fy_start_month (1–12)', val: '4' }],
    def: `{% macro fiscal_quarter(date_col, fy_start_month=1) %}
    case
    {%- for q in range(4) %}
        when extract(month from {{ date_col }}) in ({{ quarter_months(fy_start_month, q) }})
            then 'Q{{ q + 1 }}'
    {%- endfor %}
    end
{% endmacro %}`,
    build: (a) => {
      const start = Math.min(12, Math.max(1, parseInt(a.start, 10) || 1));
      const q = [];
      for (let i = 0; i < 4; i++) {
        const months = [0, 1, 2].map(j => ((start - 1 + i * 3 + j) % 12) + 1);
        q.push({ months, label: `Q${i + 1}` });
      }
      const cases = q.map(x => `        when extract(month from ${a.date}) in (${x.months.join(', ')}) then '${x.label}'`).join('\n');
      return {
        call: `select
    order_id,
    {{ fiscal_quarter('${a.date}', ${start}) }} as fiscal_quarter
from {{ ref('stg_orders') }}`,
        compiled: `select
    order_id,
    case
${cases}
    end as fiscal_quarter
from "analytics"."stg_orders"`,
        note: `Fiscal year starts in <strong>${MONTHS[start - 1]}</strong>, so Q1 = ${q[0].months.map(m => MONTHS[m - 1]).join('/')}. The loop computes each quarter's months from one argument — define the fiscal calendar once, reuse it everywhere (Amazon's FY starts in ${MONTHS[0]}; many retailers differ).`,
      };
    },
  },
  envaware: {
    name: 'limit_data_in_dev',
    args: [{ k: 'col', label: 'column_name', val: 'event_at' }, { k: 'days', label: 'dev_days', val: '3' }],
    needsTarget: true,
    def: `{% macro limit_data_in_dev(column_name, dev_days=3) %}
    {% if target.name == 'dev' %}
    where {{ column_name }} >= dateadd('day', -{{ dev_days }}, current_date)
    {% endif %}
{% endmacro %}`,
    build: (a, target) => ({
      call: `select *
from {{ ref('stg_events') }}
{{ limit_data_in_dev('${a.col}', ${a.days}) }}`,
      compiled: target === 'dev'
        ? `select *
from "analytics_dev_alice"."stg_events"
    where ${a.col} >= dateadd('day', -${a.days}, current_date)`
        : `select *
from "analytics"."stg_events"
    -- (target.name = 'prod' → the {% if %} is false, so the macro renders nothing)`,
      note: target === 'dev'
        ? `On the <code>dev</code> target the <code>{% if %}</code> is true, so dev runs scan only the last ${a.days} day(s) — fast, cheap iteration.`
        : `On <code>prod</code> the condition is false and the macro renders <em>empty</em> — prod reads the full table. Same code, environment-aware behaviour via <code>target.name</code>.`,
    }),
  },
};

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  let cur = 'cents', target = 'prod';
  const argState = {};
  Object.entries(MACROS).forEach(([id, m]) => { argState[id] = {}; m.args.forEach(a => argState[id][a.k] = a.val); });

  tab.innerHTML = `
    <div class="cf-lab">
      <div class="cf-lab-intro">
        <strong>See the Jinja render to SQL.</strong> Pick a macro, change its arguments, and watch the
        compiled output rebuild. These are real dbt-style macros — arguments &amp; defaults, a
        <code>{% for %}</code> loop, a computed <code>case</code>, and environment-aware logic.
        <span class="cf-sim">🧪 Compilation only — the Jinja is rendered to SQL; nothing is executed.</span>
      </div>
      <div class="cf-controls">
        <div class="cf-field"><label for="m14-macro">macro</label>
          <select id="m14-macro">${Object.entries(MACROS).map(([id, m]) => `<option value="${id}">${m.name}</option>`).join('')}</select></div>
        <div id="m14-args" style="display:flex;gap:14px;flex-wrap:wrap"></div>
        <div class="cf-field" id="m14-targetwrap" hidden><label for="m14-target">target</label>
          <select id="m14-target"><option value="prod">prod</option><option value="dev">dev</option></select></div>
      </div>
      <div class="cf-pane"><div class="cf-pane-h">macros/${''}<span id="m14-defname"></span>.sql · definition</div>
        <pre id="m14-def"></pre></div>
      <div class="cf-two">
        <div class="cf-pane"><div class="cf-pane-h">Call site · models/…/example.sql</div><pre id="m14-call"></pre></div>
        <div class="cf-pane"><div class="cf-pane-h">Compiled SQL · what dbt renders</div><pre id="m14-compiled"></pre></div>
      </div>
      <div class="cf-readout ok" id="m14-note"></div>
    </div>`;

  function renderArgs() {
    const m = MACROS[cur];
    tab.querySelector('#m14-args').innerHTML = m.args.map(a =>
      `<div class="cf-field"><label for="m14-a-${a.k}">${a.label}</label>
        <input id="m14-a-${a.k}" data-arg="${a.k}" value="${esc14(argState[cur][a.k])}" style="width:150px;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-family:var(--font-mono);font-size:12.5px"></div>`).join('');
    tab.querySelector('#m14-targetwrap').hidden = !m.needsTarget;
  }

  function render() {
    const m = MACROS[cur];
    const out = m.build(argState[cur], target);
    tab.querySelector('#m14-defname').textContent = m.name.replace('dbt_utils.', '');
    tab.querySelector('#m14-def').innerHTML = esc14(m.def);
    tab.querySelector('#m14-call').innerHTML = esc14(out.call);
    tab.querySelector('#m14-compiled').innerHTML = esc14(out.compiled);
    tab.querySelector('#m14-note').innerHTML = `<div class="cf-ro-row ok">${out.note}</div>`;
  }

  tab.querySelector('#m14-macro').addEventListener('change', e => { cur = e.target.value; renderArgs(); render(); });
  tab.querySelector('#m14-args').addEventListener('input', e => {
    const inp = e.target.closest('input[data-arg]'); if (!inp) return;
    argState[cur][inp.dataset.arg] = inp.value; render();
  });
  tab.querySelector('#m14-target').addEventListener('change', e => { target = e.target.value; render(); });

  renderArgs();
  render();
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  const cv = document.createElement('canvas');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = 820 * DPR; cv.height = 420 * DPR;
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
  ctx.scale(DPR, DPR);
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
      <div class="code-block" data-lang="sql">-- macros/fiscal_quarter.sql
-- A macro is a Jinja function that returns SQL text. Write the logic once…
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
        <div class="info-card" style="border-left-color:var(--info)">
          <div class="info-card-title">generate_surrogate_key</div>
          <div class="info-card-tag" style="color:var(--info);background:color-mix(in srgb, var(--info) 13%, transparent)">Key generation</div>
          <div class="info-card-body">Creates a consistent hash-based surrogate key from a list of columns. Handles NULLs correctly — rolling your own version has subtle bugs.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--success)">
          <div class="info-card-title">date_spine</div>
          <div class="info-card-tag" style="color:var(--success);background:color-mix(in srgb, var(--success) 13%, transparent)">Date tables</div>
          <div class="info-card-body">Generates a table with every date between two endpoints. Foundation for filling gaps in time-series data (no-sale days, inactive user days).</div>
        </div>
        <div class="info-card" style="border-left-color:var(--warn)">
          <div class="info-card-title">safe_divide</div>
          <div class="info-card-tag" style="color:var(--warn);background:color-mix(in srgb, var(--warn) 13%, transparent)">Safety</div>
          <div class="info-card-body"><code>{{ dbt_utils.safe_divide('numerator', 'denominator') }}</code> — returns NULL instead of dividing by zero. Eliminates a class of runtime errors from all division in your project.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--purple)">
          <div class="info-card-title">audit_helper</div>
          <div class="info-card-tag" style="color:var(--purple);background:color-mix(in srgb, var(--purple) 13%, transparent)">Refactoring</div>
          <div class="info-card-body">Compare outputs of two model versions row-by-row. Proves a refactor didn't change any numbers before you promote to production.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Going deeper — the mechanism</h3>
      <details class="cf-det"><summary>Compile-time, not run-time (and why that matters)</summary>
        <p>Jinja runs during <strong>compilation</strong>, producing plain SQL text; the warehouse never sees a macro. So a macro has <em>zero runtime cost</em> — <code>cents_to_dollars('x')</code> and typing the expression by hand compile to identical SQL and run identically. It also means a macro can only shape the SQL <em>string</em>; it cannot react to query results (it doesn't know a row count or a value — that's runtime). Expand each macro live in the Lab tab.</p>
      </details>
      <details class="cf-det"><summary>Jinja building blocks: expressions, statements, loops, defaults</summary>
        <ul>
          <li><code>{{ … }}</code> outputs a value; <code>{% … %}</code> is control flow with no output; <code>{# … #}</code> is a stripped comment.</li>
          <li><code>{% for f in field_list %}…{% endfor %}</code> with <code>loop.last</code>/<code>loop.index</code> generates repeated SQL (see the surrogate-key macro).</li>
          <li>Arguments take <strong>defaults</strong> (<code>scale=2</code>) so call sites stay terse.</li>
          <li><code>{%- / -%}</code> trim surrounding whitespace so the rendered SQL stays clean.</li>
        </ul>
      </details>
      <details class="cf-det"><summary>Environment- and adapter-aware logic</summary>
        <p>Macros can branch on context dbt injects: <code>target.name</code> (dev/CI/prod — e.g. sample data only in dev), <code>target.type</code> or <code>adapter.type()</code> (emit Snowflake vs BigQuery syntax from one macro), and <code>var()</code>/<code>env_var()</code> for configuration. This is how one codebase runs correctly across environments and warehouses — see the <code>limit_data_in_dev</code> macro in the Lab with the target toggle.</p>
      </details>
      <details class="cf-det"><summary>When NOT to reach for a macro</summary>
        <p>A macro adds a layer of indirection. If logic is used once, plain SQL is clearer. If it's a generic utility (surrogate keys, date spines, safe divide, pivots), install <code>dbt_utils</code> rather than hand-rolling — it's battle-tested and handles edge cases yours will miss. Build your own only for business-specific logic (your revenue definition, your fiscal calendar) or proprietary rules. Don't turn this into general Jinja metaprogramming: readable SQL beats clever templating.</p>
      </details>
    </div>
    <div class="detail-section">
      <h3>What problem did macros solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Business logic spread across dozens of SQL files meant every rule change required a multi-file hunt-and-replace. Macros enforce DRY — one definition, compiled everywhere — turning multi-file refactors into single-file edits.</p>
    </div>
  `;
}
