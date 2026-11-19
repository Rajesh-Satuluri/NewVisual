/* =====================================================================
   Snowflake · Project — E-commerce Dimensional Model
   An interview-grade project rendered by CDWH.ProjectKit.
   Narrative: "Aurora", an online marketplace, needs a Kimball star for
   analytics. You model a conformed date dimension, customer/product
   dimensions, and a line-grain sales fact with additive measures and a
   degenerate dimension, then answer the questions a growth team actually
   asks — category/quarter revenue & margin, month-over-month growth, and
   per-customer RFM.
   ===================================================================== */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.snowflake = viz.P.snowflake || {};
  const P = viz.P.snowflake;
  P.Modules = P.Modules || {};

  /* ── Sample data — staging tables (single source of truth) ──────────── */
  const DATASETS = [
    {
      name: 'stg_customers', filename: 'customers.csv',
      caption: 'Customers with the channel that acquired them (for cohort/attribution analysis).',
      columns: [
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'full_name', type: 'TEXT' },
        { name: 'country', type: 'TEXT' },
        { name: 'signup_date', type: 'TEXT' },
        { name: 'acquisition_channel', type: 'TEXT' },
      ],
      rows: [
        [1, 'Ava Chen', 'US', '2024-01-05', 'paid_search'],
        [2, 'Ben Okafor', 'GB', '2024-02-10', 'organic'],
        [3, 'Chen Wei', 'US', '2024-03-20', 'referral'],
        [4, 'Dara Singh', 'CA', '2024-05-01', 'paid_search'],
        [5, 'Eli Rossi', 'US', '2024-06-15', 'social'],
        [6, 'Fay Nilsson', 'DE', '2024-08-01', 'organic'],
      ],
    },
    {
      name: 'stg_products', filename: 'products.csv',
      caption: 'Catalog with unit_cost and list_price — margin needs the cost.',
      columns: [
        { name: 'product_id', type: 'INTEGER' },
        { name: 'product_name', type: 'TEXT' },
        { name: 'category', type: 'TEXT' },
        { name: 'brand', type: 'TEXT' },
        { name: 'unit_cost', type: 'REAL' },
        { name: 'list_price', type: 'REAL' },
      ],
      rows: [
        [101, 'Wireless Earbuds', 'Electronics', 'Zent', 40.00, 79.00],
        [102, 'Smart Thermostat', 'Home', 'Hearth', 70.00, 129.00],
        [103, 'USB-C Hub', 'Electronics', 'Zent', 18.00, 39.00],
        [104, 'Yoga Mat', 'Sports', 'Flux', 15.00, 45.00],
        [105, 'Desk Lamp', 'Home', 'Hearth', 25.00, 59.00],
        [106, 'Trail Backpack', 'Sports', 'Flux', 45.00, 119.00],
        [107, 'Mechanical Keyboard', 'Electronics', 'Zent', 50.00, 99.00],
        [108, 'Water Bottle', 'Sports', 'Flux', 6.00, 24.00],
        [109, 'Smart Plug', 'Home', 'Hearth', 12.00, 29.00],
        [110, 'Noise-Cancel Headphones', 'Electronics', 'Zent', 90.00, 199.00],
      ],
    },
    {
      name: 'stg_orders', filename: 'orders.csv',
      caption: 'Order headers. order_number is the natural order id (becomes a degenerate dimension on the fact).',
      columns: [
        { name: 'order_id', type: 'INTEGER' },
        { name: 'order_number', type: 'TEXT' },
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'order_date', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'payment_method', type: 'TEXT' },
      ],
      rows: [
        [1, 'AUR-1001', 1, '2024-01-20', 'completed', 'card'],
        [2, 'AUR-1002', 2, '2024-02-15', 'completed', 'paypal'],
        [3, 'AUR-1003', 1, '2024-03-10', 'completed', 'card'],
        [4, 'AUR-1004', 3, '2024-03-28', 'completed', 'card'],
        [5, 'AUR-1005', 2, '2024-04-12', 'completed', 'paypal'],
        [6, 'AUR-1006', 4, '2024-05-18', 'completed', 'card'],
        [7, 'AUR-1007', 1, '2024-06-02', 'cancelled', 'card'],
        [8, 'AUR-1008', 5, '2024-06-25', 'completed', 'wallet'],
        [9, 'AUR-1009', 3, '2024-07-14', 'completed', 'card'],
        [10, 'AUR-1010', 4, '2024-08-09', 'completed', 'paypal'],
        [11, 'AUR-1011', 6, '2024-09-01', 'completed', 'card'],
        [12, 'AUR-1012', 5, '2024-10-20', 'refunded', 'wallet'],
        [13, 'AUR-1013', 1, '2024-11-11', 'completed', 'card'],
        [14, 'AUR-1014', 2, '2024-12-05', 'completed', 'paypal'],
        [15, 'AUR-1015', 3, '2025-01-15', 'completed', 'card'],
        [16, 'AUR-1016', 6, '2025-02-20', 'completed', 'card'],
      ],
    },
    {
      name: 'stg_order_lines', filename: 'order_lines.csv',
      caption: 'Line items — the fact grain. discount is an absolute amount on the line.',
      columns: [
        { name: 'order_id', type: 'INTEGER' },
        { name: 'product_id', type: 'INTEGER' },
        { name: 'quantity', type: 'INTEGER' },
        { name: 'unit_price', type: 'REAL' },
        { name: 'discount', type: 'REAL' },
      ],
      rows: [
        [1, 101, 1, 79.00, 0.00], [1, 103, 2, 39.00, 5.00],
        [2, 102, 1, 129.00, 10.00],
        [3, 104, 1, 45.00, 0.00], [3, 108, 2, 24.00, 0.00],
        [4, 107, 1, 99.00, 0.00],
        [5, 105, 2, 59.00, 0.00], [5, 109, 1, 29.00, 0.00],
        [6, 110, 1, 199.00, 20.00],
        [7, 101, 1, 79.00, 0.00],
        [8, 106, 1, 119.00, 0.00], [8, 104, 1, 45.00, 5.00],
        [9, 103, 1, 39.00, 0.00],
        [10, 102, 1, 129.00, 0.00], [10, 105, 1, 59.00, 0.00],
        [11, 107, 2, 99.00, 10.00], [11, 110, 1, 199.00, 0.00],
        [12, 106, 1, 119.00, 0.00],
        [13, 101, 2, 79.00, 0.00],
        [14, 108, 3, 24.00, 0.00], [14, 109, 1, 29.00, 0.00],
        [15, 110, 1, 199.00, 30.00],
        [16, 104, 2, 45.00, 0.00], [16, 101, 1, 79.00, 0.00],
      ],
    },
  ];

  /* Reusable fact CTE for the analytics/debug steps (completed orders). */
  const FACT_CTE =
    'WITH f AS (\n' +
    '  SELECT\n' +
    '    o.order_id, o.order_number, o.order_date, o.customer_id,\n' +
    '    l.product_id, p.category, p.brand, l.quantity,\n' +
    '    l.quantity * l.unit_price                       AS gross_amount,\n' +
    '    l.discount,\n' +
    '    l.quantity * l.unit_price - l.discount          AS net_amount,\n' +
    '    (l.quantity * l.unit_price - l.discount)\n' +
    '      - l.quantity * p.unit_cost                    AS margin\n' +
    '  FROM stg_order_lines l\n' +
    '  JOIN stg_orders   o ON o.order_id   = l.order_id\n' +
    '  JOIN stg_products p ON p.product_id = l.product_id\n' +
    "  WHERE o.status = 'completed'\n" +
    ')';

  /* ── Star-schema diagram (theme-aware inline SVG) ───────────────────── */
  const DIAGRAM_SVG = [
    '<svg viewBox="0 0 880 360" role="img" aria-label="Star schema: fact_order_line in the centre joined to dim_date, dim_customer and dim_product" class="pk-svg">',
    // connecting lines (behind boxes)
    '<line x1="235" y1="92" x2="360" y2="150" class="pk-svg-arrow"/>',
    '<line x1="645" y1="92" x2="520" y2="150" class="pk-svg-arrow"/>',
    '<line x1="235" y1="268" x2="360" y2="205" class="pk-svg-arrow"/>',
    '<line x1="645" y1="268" x2="520" y2="205" class="pk-svg-arrow"/>',
    // dimensions
    _box(70, 44, 165, 72, '📅 dim_date', 'date_key (smart key)\nyear · quarter · month\nday_name · is_weekend'),
    _box(645, 44, 165, 72, '👤 dim_customer', 'customer_sk\ncountry · signup\nacquisition_channel'),
    _box(70, 252, 165, 80, '📦 dim_product', 'product_sk\ncategory · brand\nunit_cost · list_price'),
    _box(645, 252, 165, 80, '🔖 degenerate dim', 'order_number lives\nON the fact — no\ndimension table'),
    // central fact
    '<rect x="355" y="140" width="170" height="80" rx="12" class="pk-svg-box pk-svg-fact-box"/>',
    '<text x="440" y="166" text-anchor="middle" class="pk-svg-title pk-svg-fact">⭐ fact_order_line</text>',
    '<text x="440" y="186" text-anchor="middle" class="pk-svg-sub">grain: one order line</text>',
    '<text x="440" y="204" text-anchor="middle" class="pk-svg-sub">qty · gross · discount</text>',
    '<text x="440" y="218" text-anchor="middle" class="pk-svg-sub">net · margin (additive)</text>',
    '<text x="440" y="300" text-anchor="middle" class="pk-svg-note">One conformed date dimension serves every fact; additive measures sum cleanly across any dimension.</text>',
    '<text x="440" y="322" text-anchor="middle" class="pk-svg-note pk-svg-note-dim">Analytics = join the fact to the dimensions you want to slice by, then aggregate.</text>',
    '</svg>',
  ].join('');

  function _box(x, y, w, h, title, body) {
    let s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" rx="10" class="pk-svg-box"/>';
    s += '<text x="' + (x + 12) + '" y="' + (y + 22) + '" class="pk-svg-title">' + title + '</text>';
    (body || '').split('\n').forEach(function (line, i) {
      if (!line) return;
      s += '<text x="' + (x + 12) + '" y="' + (y + 40 + i * 15) + '" class="pk-svg-sub">' + line + '</text>';
    });
    return s;
  }

  /* ── Build steps ────────────────────────────────────────────────────── */
  const BUILD = [
    {
      title: 'Model the star: dimensions + a line-grain fact',
      explain: 'A Kimball star puts a narrow fact in the centre and wide, denormalized dimensions around it. ' +
        'order_number rides on the fact as a degenerate dimension (it has no attributes of its own). Measures ' +
        'are additive so they sum correctly across any dimension.',
      code:
        "CREATE OR REPLACE TABLE lumen.marts.dim_date (\n" +
        "  date_key NUMBER PRIMARY KEY,   -- 20240120 (smart key)\n" +
        "  full_date DATE, year NUMBER, quarter NUMBER, month NUMBER,\n" +
        "  month_name STRING, day_name STRING, is_weekend BOOLEAN\n" +
        ");\n\n" +
        "CREATE OR REPLACE TABLE lumen.marts.fact_order_line (\n" +
        "  order_date_key NUMBER REFERENCES lumen.marts.dim_date,\n" +
        "  customer_sk    NUMBER REFERENCES lumen.marts.dim_customer,\n" +
        "  product_sk     NUMBER REFERENCES lumen.marts.dim_product,\n" +
        "  order_number   STRING,          -- degenerate dimension\n" +
        "  quantity       NUMBER,\n" +
        "  gross_amount   NUMBER(12,2),\n" +
        "  discount       NUMBER(12,2),\n" +
        "  net_amount     NUMBER(12,2),    -- additive\n" +
        "  margin         NUMBER(12,2)     -- additive\n" +
        ");",
      codeTitle: 'Step 1 — star DDL (Snowflake)',
    },
    {
      title: 'Build the conformed date dimension',
      explain: 'One date dimension is shared ("conformed") by every fact, so "revenue by quarter" means the same ' +
        'thing everywhere. You derive calendar attributes once, keyed by a smart integer date_key (YYYYMMDD).',
      code:
        "INSERT INTO lumen.marts.dim_date\n" +
        "SELECT DISTINCT\n" +
        "  TO_NUMBER(TO_CHAR(order_date, 'YYYYMMDD')) AS date_key,\n" +
        "  order_date, YEAR(order_date), QUARTER(order_date), MONTH(order_date),\n" +
        "  MONTHNAME(order_date), DAYNAME(order_date),\n" +
        "  DAYOFWEEK(order_date) IN (0, 6) AS is_weekend\n" +
        "FROM lumen.staging.stg_orders;",
      codeTitle: 'Step 2 — dim_date (Snowflake)',
      dialectNote: "Snowflake has YEAR()/QUARTER()/DAYNAME(); the runnable engine (SQLite) uses strftime() and " +
        "integer math for the quarter — same attributes.",
      run: {
        task: 'Build the date dimension from the DISTINCT order dates. Return date_key (the date as a YYYYMMDD ' +
          'integer), full_date, year, quarter (1–4), month (1–12), day_name (Mon…Sun) and is_weekend (1/0). ' +
          'Order by date_key.',
        ordered: true,
        starter:
          'SELECT DISTINCT\n' +
          "  CAST(strftime('%Y%m%d', order_date) AS INTEGER) AS date_key,\n" +
          '  order_date AS full_date,\n' +
          "  CAST(strftime('%Y', order_date) AS INTEGER) AS year,\n" +
          '  /* quarter from month */ AS quarter,\n' +
          "  CAST(strftime('%m', order_date) AS INTEGER) AS month,\n" +
          '  /* day_name from strftime(%w) */ AS day_name,\n' +
          '  /* is_weekend */ AS is_weekend\n' +
          'FROM stg_orders\n' +
          'ORDER BY date_key;',
        solution:
          'SELECT DISTINCT\n' +
          "  CAST(strftime('%Y%m%d', order_date) AS INTEGER) AS date_key,\n" +
          '  order_date AS full_date,\n' +
          "  CAST(strftime('%Y', order_date) AS INTEGER) AS year,\n" +
          "  (CAST(strftime('%m', order_date) AS INTEGER) + 2) / 3 AS quarter,\n" +
          "  CAST(strftime('%m', order_date) AS INTEGER) AS month,\n" +
          "  CASE CAST(strftime('%w', order_date) AS INTEGER)\n" +
          "    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue' WHEN 3 THEN 'Wed'\n" +
          "    WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' ELSE 'Sat' END AS day_name,\n" +
          "  CASE WHEN strftime('%w', order_date) IN ('0', '6') THEN 1 ELSE 0 END AS is_weekend\n" +
          'FROM stg_orders\n' +
          'ORDER BY date_key;',
        hint: "quarter = (month + 2) / 3 with integer division. day_name: map strftime('%w') 0–6 (0 = Sunday). " +
          "is_weekend = 1 when %w is '0' or '6'.",
      },
    },
    {
      title: 'Build the sales fact at line grain',
      explain: 'The fact is one row per order line for completed orders. Join products for unit_cost so you can ' +
        'store both net_amount and margin as additive measures; carry order_number as the degenerate dimension.',
      code:
        "INSERT INTO lumen.marts.fact_order_line\n" +
        "SELECT\n" +
        "  TO_NUMBER(TO_CHAR(o.order_date, 'YYYYMMDD')) AS order_date_key,\n" +
        "  dc.customer_sk, dp.product_sk, o.order_number, l.quantity,\n" +
        "  l.quantity * l.unit_price                      AS gross_amount,\n" +
        "  l.discount,\n" +
        "  l.quantity * l.unit_price - l.discount         AS net_amount,\n" +
        "  (l.quantity * l.unit_price - l.discount)\n" +
        "    - l.quantity * p.unit_cost                   AS margin\n" +
        "FROM lumen.staging.stg_order_lines l\n" +
        "JOIN lumen.staging.stg_orders   o ON o.order_id = l.order_id\n" +
        "JOIN lumen.staging.stg_products p ON p.product_id = l.product_id\n" +
        "JOIN lumen.marts.dim_customer  dc ON dc.customer_id = o.customer_id\n" +
        "JOIN lumen.marts.dim_product   dp ON dp.product_id = l.product_id\n" +
        "WHERE o.status = 'completed';",
      codeTitle: 'Step 3 — fact_order_line (Snowflake)',
      run: {
        task: 'Build the sales fact at line grain for COMPLETED orders. Return order_number, order_date, ' +
          'customer_id, product_id, quantity, gross_amount (qty × unit_price), discount, net_amount ' +
          '(gross − discount) and margin (net − qty × unit_cost). (Order doesn\'t matter.)',
        starter:
          'SELECT\n' +
          '  o.order_number, o.order_date, o.customer_id, l.product_id, l.quantity,\n' +
          '  /* gross_amount */ AS gross_amount,\n' +
          '  l.discount,\n' +
          '  /* net_amount */ AS net_amount,\n' +
          '  /* margin (needs p.unit_cost) */ AS margin\n' +
          'FROM stg_order_lines l\n' +
          'JOIN stg_orders   o ON o.order_id = l.order_id\n' +
          'JOIN stg_products p ON p.product_id = l.product_id\n' +
          "WHERE o.status = 'completed';",
        solution:
          'SELECT\n' +
          '  o.order_number, o.order_date, o.customer_id, l.product_id, l.quantity,\n' +
          '  l.quantity * l.unit_price AS gross_amount,\n' +
          '  l.discount,\n' +
          '  l.quantity * l.unit_price - l.discount AS net_amount,\n' +
          '  (l.quantity * l.unit_price - l.discount) - l.quantity * p.unit_cost AS margin\n' +
          'FROM stg_order_lines l\n' +
          'JOIN stg_orders   o ON o.order_id = l.order_id\n' +
          'JOIN stg_products p ON p.product_id = l.product_id\n' +
          "WHERE o.status = 'completed';",
        hint: 'gross = quantity*unit_price; net = gross − discount; margin = net − quantity*unit_cost (unit_cost ' +
          'comes from stg_products).',
      },
    },
    {
      title: 'Analytics: revenue & margin by category and quarter',
      explain: 'The payoff of the star — slice additive measures by whichever dimension you like. Here: ' +
        'category (from the product dimension) × quarter (from the date dimension).',
      code:
        "SELECT p.category, d.year, d.quarter,\n" +
        "       SUM(f.net_amount) AS net_revenue, SUM(f.margin) AS margin\n" +
        "FROM lumen.marts.fact_order_line f\n" +
        "JOIN lumen.marts.dim_product p ON p.product_sk = f.product_sk\n" +
        "JOIN lumen.marts.dim_date    d ON d.date_key   = f.order_date_key\n" +
        "GROUP BY p.category, d.year, d.quarter\n" +
        "ORDER BY p.category, d.year, d.quarter;",
      codeTitle: 'Step 4 — category × quarter',
      run: {
        task: 'Net revenue and margin by category and quarter (completed orders). Columns: category, quarter ' +
          "(like '2024-Q1'), net_revenue, margin. Order by category, then quarter.",
        ordered: true,
        starter:
          FACT_CTE + '\n' +
          'SELECT category,\n' +
          "  substr(order_date, 1, 4) || '-Q' || ((CAST(substr(order_date, 6, 2) AS INTEGER) + 2) / 3) AS quarter,\n" +
          '  /* SUM net_amount */ AS net_revenue,\n' +
          '  /* SUM margin */ AS margin\n' +
          'FROM f\n' +
          '-- GROUP BY + ORDER BY\n;',
        solution:
          FACT_CTE + '\n' +
          'SELECT category,\n' +
          "  substr(order_date, 1, 4) || '-Q' || ((CAST(substr(order_date, 6, 2) AS INTEGER) + 2) / 3) AS quarter,\n" +
          '  SUM(net_amount) AS net_revenue,\n' +
          '  SUM(margin) AS margin\n' +
          'FROM f\n' +
          'GROUP BY category, quarter\n' +
          'ORDER BY category, quarter;',
        hint: 'GROUP BY category and the quarter expression; SUM(net_amount) and SUM(margin).',
      },
    },
    {
      title: 'Analytics: month-over-month revenue growth',
      explain: 'Period-over-period is a window over an aggregate: first total revenue per month, then LAG the ' +
        'previous month to compute the change. Ordering the window correctly is everything.',
      code:
        "WITH m AS (\n" +
        "  SELECT d.year, d.month, SUM(f.net_amount) AS net_revenue\n" +
        "  FROM lumen.marts.fact_order_line f\n" +
        "  JOIN lumen.marts.dim_date d ON d.date_key = f.order_date_key\n" +
        "  GROUP BY d.year, d.month\n" +
        ")\n" +
        "SELECT year, month, net_revenue,\n" +
        "  LAG(net_revenue) OVER (ORDER BY year, month) AS prev_month,\n" +
        "  net_revenue - LAG(net_revenue) OVER (ORDER BY year, month) AS mom_change\n" +
        "FROM m ORDER BY year, month;",
      codeTitle: 'Step 5 — MoM growth',
      run: {
        task: 'Month-over-month net revenue (completed orders). Columns: order_month (YYYY-MM), net_revenue, ' +
          'prev_month_revenue (previous month via LAG), mom_change (this − previous). Order by order_month.',
        ordered: true,
        starter:
          FACT_CTE + ',\n' +
          'm AS (\n' +
          '  SELECT substr(order_date, 1, 7) AS order_month, SUM(net_amount) AS net_revenue\n' +
          '  FROM f GROUP BY order_month\n' +
          ')\n' +
          'SELECT order_month, net_revenue,\n' +
          '  /* LAG previous month */ AS prev_month_revenue,\n' +
          '  /* change */ AS mom_change\n' +
          'FROM m ORDER BY order_month;',
        solution:
          FACT_CTE + ',\n' +
          'm AS (\n' +
          '  SELECT substr(order_date, 1, 7) AS order_month, SUM(net_amount) AS net_revenue\n' +
          '  FROM f GROUP BY order_month\n' +
          ')\n' +
          'SELECT order_month, net_revenue,\n' +
          '  LAG(net_revenue) OVER (ORDER BY order_month) AS prev_month_revenue,\n' +
          '  net_revenue - LAG(net_revenue) OVER (ORDER BY order_month) AS mom_change\n' +
          'FROM m ORDER BY order_month;',
        hint: 'prev_month_revenue = LAG(net_revenue) OVER (ORDER BY order_month); mom_change subtracts it from ' +
          'the current month.',
        note: 'The first month has no previous month, so prev_month_revenue and mom_change are NULL there.',
      },
    },
    {
      title: 'Analytics: per-customer RFM snapshot',
      explain: 'RFM (Recency, Frequency, Monetary) ranks customers by value. From the fact: each customer\'s last ' +
        'order date, order count (distinct orders — mind the line grain!), and total net revenue.',
      code:
        "SELECT f.customer_sk,\n" +
        "  MAX(d.full_date)             AS last_order_date,\n" +
        "  COUNT(DISTINCT f.order_number) AS order_count,\n" +
        "  SUM(f.net_amount)            AS net_revenue\n" +
        "FROM lumen.marts.fact_order_line f\n" +
        "JOIN lumen.marts.dim_date d ON d.date_key = f.order_date_key\n" +
        "GROUP BY f.customer_sk\n" +
        "ORDER BY net_revenue DESC;",
      codeTitle: 'Step 6 — RFM',
      run: {
        task: 'Per-customer RFM (completed orders). Columns: customer_id, last_order_date (max order_date), ' +
          'order_count (DISTINCT orders), net_revenue (sum). Order by net_revenue descending, then customer_id.',
        ordered: true,
        starter:
          FACT_CTE + '\n' +
          'SELECT customer_id,\n' +
          '  /* recency */ AS last_order_date,\n' +
          '  /* frequency - watch the grain */ AS order_count,\n' +
          '  /* monetary */ AS net_revenue\n' +
          'FROM f\n' +
          '-- GROUP BY + ORDER BY\n;',
        solution:
          FACT_CTE + '\n' +
          'SELECT customer_id,\n' +
          '  MAX(order_date) AS last_order_date,\n' +
          '  COUNT(DISTINCT order_id) AS order_count,\n' +
          '  SUM(net_amount) AS net_revenue\n' +
          'FROM f\n' +
          'GROUP BY customer_id\n' +
          'ORDER BY net_revenue DESC, customer_id;',
        hint: 'last_order_date = MAX(order_date); order_count = COUNT(DISTINCT order_id) (the fact is line grain, ' +
          'so COUNT(*) would over-count); net_revenue = SUM(net_amount).',
      },
    },
  ];

  /* ── Debug — e-commerce modeling traps ──────────────────────────────── */
  const DEBUG = [
    {
      kind: 'fix',
      title: 'Revenue ignores discounts',
      brief: 'This "net revenue by category" sums gross line amounts and forgets the discount, so every ' +
        'discounted category is overstated. Fix it to report true net revenue. Order by category.',
      spec: {
        task: 'Net revenue by category for completed orders, discounts applied. Columns: category, net_revenue. ' +
          'Order by category.',
        ordered: true,
        starter:
          '-- BUG: this is GROSS revenue — the discount is never subtracted\n' +
          'SELECT p.category, SUM(l.quantity * l.unit_price) AS net_revenue\n' +
          'FROM stg_order_lines l\n' +
          'JOIN stg_orders   o ON o.order_id = l.order_id\n' +
          'JOIN stg_products p ON p.product_id = l.product_id\n' +
          "WHERE o.status = 'completed'\n" +
          'GROUP BY p.category\n' +
          'ORDER BY p.category;',
        solution:
          'SELECT p.category, SUM(l.quantity * l.unit_price - l.discount) AS net_revenue\n' +
          'FROM stg_order_lines l\n' +
          'JOIN stg_orders   o ON o.order_id = l.order_id\n' +
          'JOIN stg_products p ON p.product_id = l.product_id\n' +
          "WHERE o.status = 'completed'\n" +
          'GROUP BY p.category\n' +
          'ORDER BY p.category;',
        hint: 'Net revenue subtracts the discount per line: SUM(quantity * unit_price - discount).',
      },
      lesson:
        '<p><strong>Measure definitions matter.</strong> Gross, net and margin are different measures. Reporting ' +
        'gross as "revenue" silently inflates discounted categories and makes margin look better than it is. In a ' +
        'star you store each as its own additive column so nobody re-derives it inconsistently.</p>' +
        '<p><strong>Interview framing:</strong> "I pin down the measure before I write SQL — is this gross, net of ' +
        'discounts, or net of returns? I store additive measures explicitly on the fact (gross, discount, net, ' +
        'margin) so every query sums the same agreed number."</p>',
    },
    {
      kind: 'fix',
      title: 'Month-over-month change is always NULL',
      brief: 'This MoM query partitions the LAG window by month, so each month is alone in its partition and ' +
        'prev_month_revenue is always NULL. Fix the window so it compares each month to the previous one. Order ' +
        'by order_month.',
      spec: {
        task: 'Month-over-month net revenue (completed orders): order_month (YYYY-MM), net_revenue, ' +
          'prev_month_revenue, mom_change. Order by order_month.',
        ordered: true,
        starter:
          '-- BUG: PARTITION BY order_month isolates each month, so LAG sees nothing\n' +
          'WITH m AS (\n' +
          '  SELECT substr(o.order_date, 1, 7) AS order_month,\n' +
          '         SUM(l.quantity * l.unit_price - l.discount) AS net_revenue\n' +
          '  FROM stg_order_lines l\n' +
          '  JOIN stg_orders o ON o.order_id = l.order_id\n' +
          "  WHERE o.status = 'completed'\n" +
          '  GROUP BY order_month\n' +
          ')\n' +
          'SELECT order_month, net_revenue,\n' +
          '  LAG(net_revenue) OVER (PARTITION BY order_month ORDER BY order_month) AS prev_month_revenue,\n' +
          '  net_revenue - LAG(net_revenue) OVER (PARTITION BY order_month ORDER BY order_month) AS mom_change\n' +
          'FROM m ORDER BY order_month;',
        solution:
          'WITH m AS (\n' +
          '  SELECT substr(o.order_date, 1, 7) AS order_month,\n' +
          '         SUM(l.quantity * l.unit_price - l.discount) AS net_revenue\n' +
          '  FROM stg_order_lines l\n' +
          '  JOIN stg_orders o ON o.order_id = l.order_id\n' +
          "  WHERE o.status = 'completed'\n" +
          '  GROUP BY order_month\n' +
          ')\n' +
          'SELECT order_month, net_revenue,\n' +
          '  LAG(net_revenue) OVER (ORDER BY order_month) AS prev_month_revenue,\n' +
          '  net_revenue - LAG(net_revenue) OVER (ORDER BY order_month) AS mom_change\n' +
          'FROM m ORDER BY order_month;',
        hint: 'Drop PARTITION BY order_month — you want one ordered sequence of months, so LAG can reach the ' +
          'previous row.',
      },
      lesson:
        '<p><strong>Window partition vs order.</strong> PARTITION BY splits rows into independent groups; LAG ' +
        'never crosses a partition boundary. Partitioning by the very column you\'re sequencing puts each row ' +
        'alone, so LAG returns NULL. For a single running timeline, use ORDER BY with no PARTITION (or partition ' +
        'by a higher grouping like product, then order by month).</p>' +
        '<p><strong>Interview framing:</strong> "PARTITION BY defines independent windows; ORDER BY sequences ' +
        'within them. For plain month-over-month I order by month with no partition. If I wanted MoM per product, ' +
        'I\'d PARTITION BY product and ORDER BY month."</p>',
    },
    {
      kind: 'investigate',
      title: 'Average order value looks far too low',
      scenario: {
        id: 'proj-ecom-aov',
        area: 'project-ecom-dim',
        symptom: 'A new "Average Order Value" (AOV) tile reads about $55, but finance insists real AOV is closer ' +
          'to $130. The query runs against the line-grain sales fact and "looks fine".',
        steps: [
          {
            prompt: 'AOV is off by more than 2×. Where do you start?',
            evidence: 'AOV is a ratio with a precise definition: total revenue ÷ number of orders.',
            insight: 'Pin the metric definition and the grain it must be computed at before touching SQL.',
            choices: [
              { text: 'Write down the exact definition (total net revenue ÷ distinct orders) and check the grain ' +
                  'of the table the query runs on.', correct: true,
                why: 'A ratio metric is only correct at the right grain; confirming the definition and grain is the fastest route.' },
              { text: 'Assume the fact data is wrong and re-load it.', correct: false,
                why: 'The data is fine; this is a metric-definition/grain error in the query, not a load problem.' },
              { text: 'Multiply the result by 2 so it matches finance.', correct: false,
                why: 'Hard-coding a fudge factor hides the real bug and breaks the moment the data mix changes.' },
            ],
          },
          {
            prompt: 'The query is AVG(net_amount) over fact_order_line. Why does that understate AOV?',
            evidence: 'fact_order_line is one row per order line; an order with three lines contributes three small rows.',
            insight: 'AVG over line rows gives the average LINE value, not the average ORDER value.',
            choices: [
              { text: 'It averages line amounts, not order totals — multi-line orders are split into several small ' +
                  'rows, dragging the average down.', correct: true,
                why: 'Exactly: AVG at line grain answers "average line value", a different (smaller) number than AOV.' },
              { text: 'AVG ignores NULLs, so some orders are dropped.', correct: false,
                why: 'There are no NULL amounts here; the issue is the grain the average is taken at, not NULL handling.' },
              { text: 'net_amount is stored in cents, so it\'s off by a factor.', correct: false,
                why: 'The amounts are in dollars; the discrepancy is grain, not units.' },
            ],
          },
          {
            prompt: 'What\'s the correct AOV?',
            evidence: 'AOV = total net revenue ÷ count of distinct orders, both measured consistently.',
            insight: 'Aggregate to order totals first (or divide total revenue by distinct order count).',
            choices: [
              { text: 'SUM(net_amount) / COUNT(DISTINCT order_number) — total revenue over the number of orders; ' +
                  'or roll lines up to an order total first, then average.', correct: true,
                why: 'Computes the metric at order grain, matching the business definition.' },
              { text: 'AVG(net_amount) but filter to single-line orders only.', correct: false,
                why: 'Throwing away multi-line orders biases AOV and discards most of the revenue.' },
              { text: 'SUM(net_amount) / COUNT(*) over the fact.', correct: false,
                why: 'COUNT(*) counts lines, not orders, so the denominator is still wrong.' },
            ],
          },
        ],
        rootCause: 'AOV was computed as AVG(net_amount) on the line-grain fact, which averages line values. ' +
          'Multi-line orders become several small rows, so the average lands well below the true per-order value.',
        resolution: 'Compute AOV at order grain: SUM(net_amount) / COUNT(DISTINCT order_number), or first ' +
          'aggregate lines to an order total and then AVG those totals.',
        prevention: 'Define ratio metrics with explicit numerator/denominator and the grain they apply to; ' +
          'centralize them (a metrics layer / semantic model) so "AOV" has one definition everywhere.',
        interviewAnswer: 'AOV is total net revenue divided by the number of orders, but the tile used ' +
          'AVG(net_amount) on a line-grain fact, which averages line values and understates it because multi-line ' +
          'orders split into several small rows. The fix is SUM(net_amount) / COUNT(DISTINCT order_number) — ' +
          'compute the ratio at order grain — and I\'d define it once in a metrics layer so it can\'t drift.',
      },
    },
  ];

  /* ── Interview discussion ───────────────────────────────────────────── */
  const QA = [
    { difficulty: 'easy',
      q: 'What is a star schema, and why is it preferred for analytics over a normalized (3NF) model?',
      a: 'A star has a central fact table of measurements surrounded by denormalized dimension tables. It minimizes ' +
         'joins, is intuitive for analysts and BI tools, and makes aggregations fast and predictable. 3NF is ideal ' +
         'for OLTP write integrity but forces many joins and is awkward to query, so warehouses trade some ' +
         'redundancy for query simplicity and speed.' },
    { difficulty: 'medium',
      q: 'What is the grain of a fact table and why decide it first?',
      a: 'The grain is what one fact row represents — here, one order line. Deciding it first fixes which keys are ' +
         'unique, which measures are additive at that grain, and how you must count (distinct orders vs lines). ' +
         'Most fact bugs — fan-out, double counting, wrong averages — come from losing track of the grain.' },
    { difficulty: 'medium',
      q: 'What is a conformed dimension, and why does it matter here?',
      a: 'A dimension shared with identical keys and meaning across multiple facts (e.g. one dim_date, one ' +
         'dim_product). It lets you compare and combine metrics across processes — "sales by month" and "returns ' +
         'by month" line up because both join the same date dimension. Without conformance, each fact invents its ' +
         'own calendar and numbers stop reconciling.' },
    { difficulty: 'medium',
      q: 'What is a degenerate dimension? Give the example in this model.',
      a: 'A dimension attribute that lives on the fact because it has no attributes of its own — typically an ' +
         'operational identifier. Here order_number is degenerate: it identifies the order (useful for counting ' +
         'distinct orders and drill-through) but needs no separate dimension table.' },
    { difficulty: 'hard',
      q: 'Explain additive, semi-additive and non-additive measures with examples.',
      a: 'Additive measures sum across every dimension (net_amount, quantity, margin). Semi-additive measures sum ' +
         'across some dimensions but not time — e.g. an account balance or inventory level, which you average or ' +
         'take period-end over time instead of summing. Non-additive measures can\'t be summed at all (ratios/' +
         'percentages like margin %, unit price); you store the components and compute the ratio at query time.' },
    { difficulty: 'medium',
      q: 'Why build a dedicated date dimension instead of just using the order_date column?',
      a: 'A date dimension precomputes calendar attributes (quarter, month name, day of week, is_weekend, fiscal ' +
         'period, holiday flags) so every query slices time consistently without date functions scattered ' +
         'everywhere. It also supports role-playing (order_date vs ship_date both joining the same dim), fills ' +
         'gaps (dates with no sales still appear), and keeps predicates prunable.' },
    { difficulty: 'hard',
      q: 'What is a role-playing dimension, and how would it appear in this model?',
      a: 'One physical dimension referenced several times in different roles. The single dim_date would play ' +
         '"order date", "ship date" and "return date" — the fact carries three date keys all pointing at dim_date, ' +
         'usually exposed through views or aliases so each role reads clearly in queries.' },
    { difficulty: 'hard',
      q: 'How should cancelled and refunded orders be handled in a sales fact?',
      a: 'Keep the sales fact to revenue-bearing lines (filter to completed) so measures mean what they say. Model ' +
         'cancellations/returns explicitly where the business needs them — a status/returns dimension, or a ' +
         'separate returns fact that nets against sales — rather than mixing non-revenue rows into the sales grain.' },
    { difficulty: 'hard',
      q: 'AOV came out wrong because of grain. How do you prevent metric-definition bugs like that generally?',
      a: 'Define each metric with an explicit numerator, denominator and grain, and compute ratios at the right ' +
         'grain (AOV = net revenue ÷ distinct orders). Centralize definitions in a metrics/semantic layer so ' +
         'everyone uses one formula, and add tests (e.g. AOV within a sane band, one row per key) that catch ' +
         'grain mistakes before dashboards do.' },
    { difficulty: 'medium',
      q: 'When would you snowflake a dimension (normalize it) instead of keeping it flat?',
      a: 'Rarely, and deliberately: when a sub-hierarchy is large, reused across dimensions, or changes ' +
         'independently (e.g. a big product-category hierarchy, or a shared geography). Snowflaking saves storage ' +
         'and eases maintenance but adds joins and complexity, so the default in a Kimball star is a flat, ' +
         'denormalized dimension unless there\'s a concrete reason.' },
  ];

  /* ── Assemble the spec ──────────────────────────────────────────────── */
  const SPEC = {
    id: 'project-ecom-dim',
    eyebrow: '🏗️ Project · End-to-end',
    title: 'E-commerce Dimensional Model',
    lead: '<strong>Aurora</strong> is an online marketplace, and the growth team wants trustworthy answers: which ' +
      'categories earn margin, is revenue growing month over month, who are the most valuable customers? You\'ll ' +
      'design a <strong>Kimball star</strong> — a conformed date dimension, customer and product dimensions, and a ' +
      'line-grain sales fact with additive measures and a degenerate dimension — then write the analytics queries ' +
      'an interviewer will ask you to reason about, and fix the metric bugs that trip people up.',
    meta: {
      role: 'Analytics Engineer', difficulty: 'Intermediate', duration: '45–60 min',
      skills: ['Star schema', 'Conformed dimensions', 'Degenerate dimension', 'Additive measures', 'Date dimension', 'Window functions', 'RFM'],
    },
    goals: [
      'Design a star: dim_date, dim_customer, dim_product + a line-grain fact',
      'Build a conformed date dimension with calendar attributes',
      'Build the sales fact with additive measures (gross, discount, net, margin)',
      'Analyze revenue & margin by category and quarter',
      'Compute month-over-month growth with window functions',
      'Build a per-customer RFM snapshot — and fix discount, window and AOV-grain bugs',
    ],
    diagram: { caption: 'The star you\'re building — one fact, three dimensions, a degenerate dimension on the fact.', svg: DIAGRAM_SVG },
    seedNote: 'Four staging extracts for Aurora. Download them to load into your own account, or just read the ' +
      'previews — the same rows seed every runnable step, so your model and analytics are checked against real output.',
    datasets: DATASETS,
    build: BUILD,
    debug: DEBUG,
    qa: QA,
  };

  P.Modules.projectEcomDim = {
    render(canvas) {
      if (!viz.ProjectKit) {
        canvas.appendChild(Object.assign(document.createElement('p'),
          { textContent: 'Project renderer unavailable.' }));
        return { destroy() {} };
      }
      return viz.ProjectKit.render(canvas, SPEC);
    },
  };
})();
