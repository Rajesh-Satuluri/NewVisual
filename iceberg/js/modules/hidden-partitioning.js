/* ============================================================
   Hidden Partitioning Module
   8-step animation: Hive partitioning problems → Iceberg
   hidden partitioning → partition transforms (days, bucket,
   truncate, year/month/hour) → partition evolution.
   ============================================================ */

(function () {
  'use strict';

  const D  = () => window.IcebergViz.Data;
  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('hp-styles')) return;
    const s = document.createElement('style');
    s.id = 'hp-styles';
    s.textContent = `
.hp-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.hp-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Left: visualizer ── */
.hp-canvas {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  background: var(--bg-1);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Transform visualizer card */
.hp-viz-card {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color .25s;
}
.hp-viz-card.active { border-color: var(--blue); }

.hp-viz-header {
  padding: 11px 16px;
  border-bottom: 1px solid var(--border-default);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-2);
}

.hp-viz-body {
  padding: 14px 16px;
}

/* Transform flow: input → transform → output */
.hp-transform-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hp-tf-box {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  white-space: nowrap;
}
.hp-tf-box.input  { border-color: var(--blue);   color: var(--blue); }
.hp-tf-box.fn     { border-color: var(--purple);  color: var(--purple); background: rgba(163,113,247,0.08); }
.hp-tf-box.output { border-color: var(--green);  color: var(--green); }
.hp-tf-box.bad    { border-color: var(--red);    color: var(--red); }
.hp-tf-arrow {
  color: var(--text-muted);
  font-size: 16px;
  flex-shrink: 0;
}

/* Partition directory list */
.hp-dir-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.hp-dir-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  border: 1px solid transparent;
  transition: all .25s;
}
.hp-dir-pill.active { background: rgba(63,185,80,0.1);  border-color: var(--green); color: var(--green); }
.hp-dir-pill.pruned { background: rgba(248,81,73,0.08); border-color: rgba(248,81,73,0.3); color: var(--red); opacity: 0.7; }
.hp-dir-pill.neutral { background: var(--bg-3); border-color: var(--border-default); color: var(--text-muted); }

/* Comparison table */
.hp-compare-wrap {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: hidden;
}
.hp-compare-title {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-default);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .06em;
}
.hp-compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
}
.hp-compare-table th {
  padding: 8px 14px;
  background: var(--bg-3);
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-default);
}
.hp-compare-table td {
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  vertical-align: top;
}
.hp-compare-table tr:last-child td { border-bottom: none; }
.hp-compare-table tr:hover td { background: var(--bg-3); }
.hp-bad  { color: var(--red);   }
.hp-good { color: var(--green); }
.hp-col-hive { color: var(--orange); font-weight: 600; }
.hp-col-ice  { color: var(--blue);   font-weight: 600; }

/* Timeline for year/month/hour transforms */
.hp-time-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 8px;
}
.hp-time-card {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: 10px 12px;
  text-align: center;
}
.hp-time-fn { font-family: var(--font-mono); font-size: 11px; color: var(--purple); font-weight: 600; margin-bottom: 5px; }
.hp-time-ex { font-family: var(--font-mono); font-size: 9.5px; color: var(--text-muted); line-height: 1.5; }
.hp-time-note { font-size: 9px; color: var(--text-muted); margin-top: 4px; }

/* ── Right: sidebar ── */
.hp-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.hp-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}
.hp-sidebar-title { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.hp-sidebar-desc  { font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.5; min-height: 36px; }

.hp-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 260px;
}

.hp-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background var(--ease-fast);
  border-left: 3px solid transparent;
  margin-bottom: 1px;
}
.hp-step-item:hover { background: var(--bg-3); }
.hp-step-item.active { background: rgba(74,174,255,0.07); border-left-color: var(--blue); }
.hp-step-item.done { opacity: 0.6; }

.hp-step-badge {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--bg-4); color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background var(--ease-fast), color var(--ease-fast);
}
.hp-step-item.active .hp-step-badge { background: var(--blue); color: #fff; }
.hp-step-item.done   .hp-step-badge { background: var(--green); color: #fff; }

.hp-step-text { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
.hp-step-item.active .hp-step-text { color: var(--text-primary); font-weight: 500; }

.hp-code-panel { flex: 1; overflow-y: auto; padding: 10px; }
.hp-code-panel .code-block { margin: 0; }
`;
    document.head.appendChild(s);
  }

  /* ── Step data ──────────────────────────────────────────── */
  function _getStepsData() {
    const partEvol = D().sql.partitionEvolution;

    return [
      {
        label: 'The Hive Problem',
        description: 'Hive requires users to CREATE separate partition columns (year INT, month INT). These are disconnected from the real date column order_date. Queries using order_date cannot prune partitions.',
        code: `-- Hive-style: user creates explicit partition columns
-- These are SEPARATE from the real data columns!

CREATE TABLE orders_hive (
  order_id    BIGINT,
  customer_id BIGINT,
  order_date  DATE,          -- actual date field
  total_amount DECIMAL(12,2)
)
PARTITIONED BY (
  year  INT,   -- user must maintain this manually
  month INT    -- user must maintain this manually
);

-- Pitfall: user writes WHERE order_date = '2024-11-29'
-- Hive does NOT know year/month from order_date!
-- Result: full scan of all partitions.`,
        lang: 'sql',
        codeTitle: 'Hive DDL — Problematic Partitioning',
      },
      {
        label: 'Why It Fails',
        description: 'The Hive query planner sees order_date filter but the partition columns are year and month. Since there is no mapping from order_date → (year, month), the planner cannot prune any partition. All data is scanned.',
        code: `-- Query that SHOULD prune to 1 day but scans EVERYTHING in Hive:
SELECT SUM(total_amount)
FROM orders_hive
WHERE order_date = '2024-11-29';
-- Hive planner: WHERE clause uses 'order_date'
--               Partition columns: year, month
--               → No partition match found
--               → FULL TABLE SCAN (6 PB)

-- To get Hive pruning you must write:
SELECT SUM(total_amount)
FROM orders_hive
WHERE order_date = '2024-11-29'
  AND year = 2024       -- user must know to add this!
  AND month = 11;       -- user must know to add this!
-- This is error-prone and breaks abstraction.`,
        lang: 'sql',
        codeTitle: 'Hive Partition Pruning Failure',
      },
      {
        label: 'Iceberg Hidden Partitioning',
        description: 'Iceberg PARTITIONED BY (days(order_date)) applies the transform automatically. Users query with WHERE order_date = \'2024-11-29\' and Iceberg computes the partition value behind the scenes.',
        code: `-- Iceberg: the transform is hidden from the user
CREATE TABLE shopkart.prod.orders (
  order_id     BIGINT NOT NULL,
  customer_id  BIGINT NOT NULL,
  order_date   DATE   NOT NULL,
  country_code STRING NOT NULL,
  total_amount DECIMAL(12,2)
)
USING iceberg
PARTITIONED BY (
  days(order_date),   -- Iceberg computes partition key
  country_code        -- identity transform
);

-- User queries naturally:
SELECT SUM(total_amount)
FROM shopkart.prod.orders
WHERE order_date = '2024-11-29';
-- Iceberg internally: days('2024-11-29') = 19691
-- → prunes to partition 19691 only. ✓`,
        lang: 'sql',
        codeTitle: 'Iceberg Hidden Partitioning DDL',
      },
      {
        label: 'Transform: days(order_date)',
        description: 'days(order_date) converts a DATE to the number of days since epoch (1970-01-01). This value is stored in the manifest list partition bounds, enabling exact day-level pruning with no user involvement.',
        code: `-- days() transform: DATE → days since epoch
-- Applied at write time, stored in manifest partition bounds.

-- Example computation:
-- '2024-11-29' → 19691 days since 1970-01-01

-- Partition directory created:
-- data/order_date_day=19691/country_code=BR/

-- Query:
SELECT * FROM orders WHERE order_date = '2024-11-29';
-- Iceberg planner:
--   1. days('2024-11-29') = 19691
--   2. Scan manifest list for partition = 19691
--   3. Skip all other date partitions
--   → 1 partition read (of ~2000)

-- Similar time-based transforms:
--   hours(ts)  → YYYY-MM-DD-HH
--   days(dt)   → YYYY-MM-DD
--   months(dt) → YYYY-MM
--   years(dt)  → YYYY`,
        lang: 'sql',
        codeTitle: 'Transform: days(order_date)',
      },
      {
        label: 'Transform: bucket(16, order_id)',
        description: 'bucket(N, col) applies a hash-based bucketing: hash(col) mod N. This distributes data uniformly across N buckets, preventing data skew and small-files problems for high-cardinality columns.',
        code: `-- bucket(N, col): hash(col) % N → bucket 0 to N-1
-- Useful for: uniform distribution, join optimization

-- Example: bucket(16, order_id)
-- order_id=10000001 → hash(10000001) % 16 = 9
-- order_id=10000002 → hash(10000002) % 16 = 3
-- order_id=10000003 → hash(10000003) % 16 = 9
-- etc.

-- Partition directories:
-- data/order_id_bucket=0/
-- data/order_id_bucket=1/
-- ...
-- data/order_id_bucket=15/

-- DDL usage:
CREATE TABLE orders_bucketed (
  order_id BIGINT, customer_id BIGINT, total_amount DOUBLE
)
USING iceberg
PARTITIONED BY (bucket(16, order_id));

-- Pruning: WHERE order_id = 10000001
-- → bucket = hash(10000001) % 16 = 9
-- → only data/order_id_bucket=9/ is read`,
        lang: 'sql',
        codeTitle: 'Transform: bucket(16, order_id)',
      },
      {
        label: 'Transform: truncate(100, zip_code)',
        description: 'truncate(W, col) for integers: truncates to the nearest lower multiple of W. For strings: truncates to the first W characters. Useful for geographic/categorical locality without full cardinality.',
        code: `-- truncate(W, col) for numeric: floor to multiple of W
-- truncate(100, zip_code):
--   10025 → 10000   (nearest lower multiple of 100)
--   10048 → 10000
--   10099 → 10000
--   10100 → 10100
--   94103 → 94100

-- For strings: truncate(W, str) = str.substring(0, W)
-- truncate(3, customer_segment):
--   'PREMIUM_GOLD'   → 'PRE'
--   'PREMIUM_SILVER' → 'PRE'
--   'BASIC'          → 'BAS'

-- Useful for: geographic locality, moderate pruning
-- Partition dirs: data/zip_code_trunc=10000/

CREATE TABLE orders_zip (
  order_id BIGINT, zip_code INT, amount DOUBLE
)
USING iceberg
PARTITIONED BY (truncate(100, zip_code));

-- Pruning: WHERE zip_code = 10025
-- → truncate(100, 10025) = 10000
-- → reads data/zip_code_trunc=10000/ only`,
        lang: 'sql',
        codeTitle: 'Transform: truncate(100, zip_code)',
      },
      {
        label: 'Transforms: year / month / hour',
        description: 'Time-based transforms allow granular control over partition sizing. year() for annual summaries, month() for monthly batches, days() for daily streaming, hours() for hourly IoT or log data.',
        code: `-- Time-based transforms at different granularities:

-- year(col): groups by calendar year
-- → data/order_date_year=2024/
PARTITIONED BY (year(order_date))
-- Use for: annual reporting tables, low-frequency writes

-- months(col): groups by year-month
-- → data/order_date_month=2024-11/
PARTITIONED BY (months(order_date))
-- Use for: monthly aggregates, moderate-frequency writes

-- days(col): groups by year-month-day
-- → data/order_date_day=2024-11-29/
PARTITIONED BY (days(order_date))
-- Use for: daily ETL batches, streaming (ShopKart uses this)

-- hours(col): groups by year-month-day-hour
-- → data/event_time_hour=2024-11-29-14/
PARTITIONED BY (hours(event_time))
-- Use for: high-frequency streaming, IoT, clickstream

-- Rule of thumb:
-- Partition size ~1 GB is a common sweet spot.
-- Too small → too many files (small-files problem).
-- Too large → coarse pruning, slow queries.`,
        lang: 'sql',
        codeTitle: 'Time-Based Transforms Comparison',
      },
      {
        label: 'Partition Evolution',
        description: 'ShopKart evolved its partition spec from year+month (spec-id=0) to day+country_code (spec-id=1) — with NO data rewrite. Old files stay in the old layout; new files use the new layout. Both are queryable.',
        code: partEvol,
        lang: 'sql',
        codeTitle: 'ALTER TABLE REPLACE/ADD PARTITION FIELD',
      },
    ];
  }

  /* ── Visualizer content per step ────────────────────────── */
  function _buildVizContent(canvas, stepIdx) {
    canvas.innerHTML = '';

    function card(title, bodyHtml) {
      const el = document.createElement('div');
      el.className = 'hp-viz-card active';
      el.innerHTML = `<div class="hp-viz-header">${title}</div><div class="hp-viz-body">${bodyHtml}</div>`;
      return el;
    }

    function tfFlow(items) {
      return `<div class="hp-transform-flow">
        ${items.map((item, i) => {
          if (item.type === 'arrow') return `<div class="hp-tf-arrow">→</div>`;
          return `<div class="hp-tf-box ${item.cls || ''}">${item.label}</div>`;
        }).join('')}
      </div>`;
    }

    function dirPill(label, state) {
      return `<div class="hp-dir-pill ${state}">${state === 'active' ? '✓' : state === 'pruned' ? '✗' : '○'} ${label}</div>`;
    }

    if (stepIdx === 0) {
      canvas.appendChild(card('⚠ Hive-Style Explicit Partitioning', `
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:12px">
          Hive partition columns are <strong style="color:var(--red)">separate</strong> from business columns.
          Users must manually maintain year/month values alongside their data.
        </div>
        ${tfFlow([
          { label: 'PARTITIONED BY', cls: '' },
          { type: 'arrow' },
          { label: 'year INT', cls: 'bad' },
          { label: 'month INT', cls: 'bad' },
        ])}
        <div style="margin-top:12px;font-size:var(--text-xs);color:var(--text-muted)">
          Partition directories on disk:
        </div>
        <div class="hp-dir-list">
          ${dirPill('year=2024/month=11/', 'neutral')}
          ${dirPill('year=2024/month=10/', 'neutral')}
          ${dirPill('year=2024/month=09/', 'neutral')}
          ${dirPill('year=2024/month=08/', 'neutral')}
          ${dirPill('year=2023/month=12/', 'neutral')}
          ${dirPill('year=2023/month=11/', 'neutral')}
        </div>
      `));
      return;
    }

    if (stepIdx === 1) {
      canvas.appendChild(card('🚨 Hive Pruning Failure — Full Scan', `
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:10px">
          Query: <code style="font-family:var(--font-mono);color:var(--blue)">WHERE order_date = '2024-11-29'</code>
        </div>
        ${tfFlow([
          { label: "order_date = '2024-11-29'", cls: 'input' },
          { type: 'arrow' },
          { label: 'Hive Planner', cls: '' },
          { type: 'arrow' },
          { label: 'No partition match', cls: 'bad' },
        ])}
        <div style="margin-top:10px;font-size:var(--text-xs);color:var(--red);font-weight:600">All partitions scanned:</div>
        <div class="hp-dir-list">
          ${dirPill('year=2024/month=11/', 'pruned')}
          ${dirPill('year=2024/month=10/', 'pruned')}
          ${dirPill('year=2024/month=09/', 'pruned')}
          ${dirPill('year=2024/month=08/', 'pruned')}
          ${dirPill('year=2023/month=12/', 'pruned')}
          ${dirPill('year=2023/month=11/', 'pruned')}
        </div>
        <div style="margin-top:10px;font-size:var(--text-xs);color:var(--text-muted)">6 PB read. Iceberg would read 384 MB.</div>
      `));
      return;
    }

    if (stepIdx === 2) {
      canvas.appendChild(card('✓ Iceberg Hidden Partitioning', `
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:10px">
          Query: <code style="font-family:var(--font-mono);color:var(--blue)">WHERE order_date = '2024-11-29'</code>
          — user writes nothing extra.
        </div>
        ${tfFlow([
          { label: "order_date = '2024-11-29'", cls: 'input' },
          { type: 'arrow' },
          { label: 'days(order_date)', cls: 'fn' },
          { type: 'arrow' },
          { label: 'partition = 19691', cls: 'output' },
        ])}
        <div style="margin-top:10px;font-size:var(--text-xs);color:var(--green);font-weight:600">Only matching partition read:</div>
        <div class="hp-dir-list">
          ${dirPill('order_date_day=19691/', 'active')}
          ${dirPill('order_date_day=19690/', 'pruned')}
          ${dirPill('order_date_day=19689/', 'pruned')}
          ${dirPill('order_date_day=19688/', 'pruned')}
          ${dirPill('order_date_day=19657/', 'pruned')}
        </div>
        <div style="margin-top:10px;font-size:var(--text-xs);color:var(--text-muted)">384 MB read. 1,999 partitions skipped.</div>
      `));
      return;
    }

    if (stepIdx === 3) {
      canvas.appendChild(card('🗓 Transform: days(order_date)', `
        ${tfFlow([
          { label: "'2024-11-29'", cls: 'input' },
          { type: 'arrow' },
          { label: 'days(order_date)', cls: 'fn' },
          { type: 'arrow' },
          { label: '19691', cls: 'output' },
        ])}
        <div style="margin-top:12px;font-size:var(--text-xs);color:var(--text-muted)">
          Days since Unix epoch 1970-01-01:
        </div>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
          ${[["'2024-01-01'", '19723'],["'2024-11-29'", '19691'],["'2023-12-31'", '19357']].map(([d, n]) =>
            `<div style="background:var(--bg-3);border:1px solid var(--border-default);border-radius:5px;padding:7px 10px;font-family:var(--font-mono);font-size:9.5px">
              <div style="color:var(--text-muted)">${d}</div>
              <div style="color:var(--green);font-size:12px;font-weight:700;margin-top:3px">→ ${n}</div>
            </div>`
          ).join('')}
        </div>
        <div style="margin-top:12px;font-size:var(--text-xs);color:var(--text-muted)">
          Partition directory: <code style="font-family:var(--font-mono);color:var(--blue)">data/order_date_day=19691/</code>
        </div>
      `));
      return;
    }

    if (stepIdx === 4) {
      canvas.appendChild(card('🪣 Transform: bucket(16, order_id)', `
        ${tfFlow([
          { label: 'order_id = 10000001', cls: 'input' },
          { type: 'arrow' },
          { label: 'hash(10000001) % 16', cls: 'fn' },
          { type: 'arrow' },
          { label: 'bucket = 9', cls: 'output' },
        ])}
        <div style="margin-top:12px;font-size:var(--text-xs);color:var(--text-muted)">16 partition buckets:</div>
        <div class="hp-dir-list" style="margin-top:6px">
          ${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i =>
            dirPill(`bucket=${i}`, i === 9 ? 'active' : 'neutral')
          ).join('')}
        </div>
        <div style="margin-top:12px;font-size:var(--text-xs);color:var(--text-muted)">
          Uniform distribution prevents data skew.
          Query <code style="font-family:var(--font-mono);color:var(--blue)">WHERE order_id = 10000001</code>
          → hash → bucket=9 → 1 of 16 partitions read.
        </div>
      `));
      return;
    }

    if (stepIdx === 5) {
      canvas.appendChild(card('✂ Transform: truncate(100, zip_code)', `
        ${tfFlow([
          { label: 'zip_code = 10025', cls: 'input' },
          { type: 'arrow' },
          { label: 'truncate(100, zip)', cls: 'fn' },
          { type: 'arrow' },
          { label: '10000', cls: 'output' },
        ])}
        <div style="margin-top:12px;font-size:var(--text-xs);color:var(--text-muted)">Integer truncation examples:</div>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${[[10025,10000],[10048,10000],[10099,10000],[10100,10100],[94103,94100],[94199,94100]].map(([v, r]) =>
            `<div style="background:var(--bg-3);border:1px solid var(--border-default);border-radius:5px;padding:6px 10px;font-family:var(--font-mono);font-size:10px;display:flex;justify-content:space-between;align-items:center">
              <span style="color:var(--text-secondary)">${v}</span>
              <span style="color:var(--text-muted)">→</span>
              <span style="color:var(--green);font-weight:700">${r}</span>
            </div>`
          ).join('')}
        </div>
        <div style="margin-top:10px;font-size:var(--text-xs);color:var(--text-muted)">Floor to nearest lower multiple of W. Geographic locality groups nearby zip codes together.</div>
      `));
      return;
    }

    if (stepIdx === 6) {
      canvas.appendChild(card('📅 Time Transforms: year / month / day / hour', `
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:10px">
          Choose granularity based on write frequency and query patterns.
        </div>
        <div class="hp-time-grid">
          <div class="hp-time-card">
            <div class="hp-time-fn">year(col)</div>
            <div class="hp-time-ex">2024-11-29 → 2024<br>2023-06-15 → 2023</div>
            <div class="hp-time-note">Annual reporting</div>
          </div>
          <div class="hp-time-card">
            <div class="hp-time-fn">months(col)</div>
            <div class="hp-time-ex">2024-11-29 → 2024-11<br>2024-06-15 → 2024-06</div>
            <div class="hp-time-note">Monthly batches</div>
          </div>
          <div class="hp-time-card">
            <div class="hp-time-fn">days(col)</div>
            <div class="hp-time-ex">2024-11-29 → 19691<br>2024-11-28 → 19690</div>
            <div class="hp-time-note">Daily streaming ← ShopKart</div>
          </div>
          <div class="hp-time-card">
            <div class="hp-time-fn">hours(col)</div>
            <div class="hp-time-ex">2024-11-29T14:30 → 2024-11-29-14<br>2024-11-29T15:00 → 2024-11-29-15</div>
            <div class="hp-time-note">IoT / clickstream</div>
          </div>
          <div class="hp-time-card">
            <div class="hp-time-fn">bucket(N, col)</div>
            <div class="hp-time-ex">hash(val) % N<br>→ bucket 0..N-1</div>
            <div class="hp-time-note">Uniform distribution</div>
          </div>
          <div class="hp-time-card">
            <div class="hp-time-fn">truncate(W, col)</div>
            <div class="hp-time-ex">floor(val / W) * W<br>→ nearest multiple</div>
            <div class="hp-time-note">Range locality</div>
          </div>
        </div>
      `));
      return;
    }

    // stepIdx === 7: Partition Evolution
    canvas.appendChild(card('🔀 ShopKart Partition Evolution', `
      <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:12px">
        ShopKart evolved from spec-id=0 (year+month) to spec-id=1 (day+country). No data was rewritten.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="background:var(--bg-3);border:1px solid var(--border-default);border-radius:6px;padding:10px 12px">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">spec-id=0 (old)</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--orange)">year(order_date)</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--orange)">month(order_date)</div>
          <div style="font-size:9px;color:var(--text-muted);margin-top:6px">Dirs: order_date_year=2024/</div>
        </div>
        <div style="background:var(--bg-3);border:1px solid var(--border-default);border-radius:6px;padding:10px 12px">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">spec-id=1 (current)</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--green)">days(order_date)</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--green)">identity(country_code)</div>
          <div style="font-size:9px;color:var(--text-muted);margin-top:6px">Dirs: order_date_day=19691/country_code=BR/</div>
        </div>
      </div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);line-height:1.6">
        Files written under spec-id=0 remain in the old directory layout.
        New files use spec-id=1. The Iceberg reader handles both transparently —
        it checks each data file's partition spec and routes accordingly.
        <strong style="color:var(--text-secondary)">Zero data rewrite required.</strong>
      </div>
    `));

    // Also show comparison table below the card
    canvas.appendChild(_buildComparisonTable());
  }

  /* ── Comparison table ───────────────────────────────────── */
  function _buildComparisonTable() {
    const rows = [
      ['Partition columns',          'User-defined extra columns', 'Transform applied to business columns'],
      ['User writes query',          'Must include partition cols', 'Filter on business columns only'],
      ['Partition discovery',        'Full S3 listing (slow)',      'Manifest list statistics (fast)'],
      ['Change partition strategy',  'Full table rewrite required', 'ALTER TABLE … no rewrite'],
      ['Old data after evolution',   'Becomes unreadable/orphaned', 'Transparently readable via old spec'],
      ['Date → partition',           'User writes year=2024, month=11', 'days(\'2024-11-29\') = 19691 auto'],
      ['Metadata scalability',       'O(n) directory listing',      'O(1) manifest list read'],
    ];

    const wrap = document.createElement('div');
    wrap.className = 'hp-compare-wrap';
    wrap.innerHTML = `
      <div class="hp-compare-title">Hive vs Iceberg — Partition Comparison</div>
      <div style="overflow-x:auto">
        <table class="hp-compare-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th class="hp-col-hive">Hive</th>
              <th class="hp-col-ice">Iceberg</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(([f, h, i]) => `
              <tr>
                <td style="font-weight:500;color:var(--text-secondary)">${f}</td>
                <td class="hp-bad">${h}</td>
                <td class="hp-good">${i}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    return wrap;
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'hidden-partitioning',
    title: 'Hidden Partitioning',
    group: 'metadata',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'hp-page page-enter';
      page.innerHTML = `
        <div class="hp-outer">
          <div class="hp-canvas" id="hp-canvas"></div>
          <div class="hp-sidebar">
            <div class="hp-sidebar-header">
              <div class="hp-sidebar-title" id="hp-step-title">Press Play to begin</div>
              <div class="hp-sidebar-desc" id="hp-step-desc">Explore Iceberg hidden partitioning: transforms, Hive comparison, and partition evolution.</div>
            </div>
            <div class="hp-steps-list" id="hp-steps-list"></div>
            <div class="hp-code-panel" id="hp-code-panel"></div>
          </div>
        </div>
      `;

      container.appendChild(page);

      const canvas    = page.querySelector('#hp-canvas');
      const stepsData = _getStepsData();

      // Build animation steps
      const steps = stepsData.map((stepData, i) =>
        IV.AnimationEngine.fnStep(
          stepData.label,
          '',
          (ctx) => { _buildVizContent(canvas, i); },
          (ctx) => { if (i > 0) _buildVizContent(canvas, i - 1); else _buildVizContent(canvas, 0); },
          2800
        )
      );

      const engine = new IV.AnimationEngine({ steps });
      engine.setContext({ canvas });
      this._engine = engine;

      // Initial render
      _buildVizContent(canvas, 0);

      // Sidebar step list
      const list     = page.querySelector('#hp-steps-list');
      const titleEl  = page.querySelector('#hp-step-title');
      const descEl   = page.querySelector('#hp-step-desc');
      const codePanel = page.querySelector('#hp-code-panel');

      list.innerHTML = stepsData.map((s, i) => `
        <div class="hp-step-item" data-step="${i}">
          <div class="hp-step-badge">${i + 1}</div>
          <div class="hp-step-text">${s.label}</div>
        </div>
      `).join('');

      engine.on('stepchange', (idx) => {
        list.querySelectorAll('.hp-step-item').forEach((el, i) => {
          el.classList.toggle('active', i === idx);
          el.classList.toggle('done', i < idx);
        });
        const step = idx >= 0 ? stepsData[idx] : null;
        if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
        if (descEl)  descEl.textContent  = step ? step.description : 'Explore Iceberg hidden partitioning — from Hive comparison to partition evolution.';
        if (codePanel && step) {
          codePanel.innerHTML = '';
          codePanel.appendChild(IV.CodeViewer.create(step.code, step.lang || 'sql', step.codeTitle));
        }
        const active = list.querySelector('.hp-step-item.active');
        if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });

      list.addEventListener('click', (e) => {
        const item = e.target.closest('[data-step]');
        if (item) engine.goto(parseInt(item.dataset.step, 10));
      });

      IV.AnimationControls.register(engine);
    },

    destroy() {
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      IV.AnimationControls.hide();
      document.getElementById('hp-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['hidden-partitioning'] = mod;
})();
