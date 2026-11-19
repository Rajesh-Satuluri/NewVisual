/* =====================================================================
   Snowflake · Project — Build a Data Warehouse from Raw Files
   A full, interview-grade end-to-end project rendered by CDWH.ProjectKit.
   Narrative: you are the first data engineer at "Lumen", a DTC retailer.
   Raw daily extracts land in cloud storage; you build RAW → STAGING → MARTS
   (a star schema) and serve a revenue mart, then automate it incrementally.
   ===================================================================== */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.snowflake = viz.P.snowflake || {};
  const P = viz.P.snowflake;
  P.Modules = P.Modules || {};

  /* ── Sample data — the single source of truth (previews, CSVs, seed) ── */
  const DATASETS = [
    {
      name: 'stg_customers', filename: 'customers.csv',
      caption: 'Who bought — one row per customer. Note Sara Lind has never ordered.',
      columns: [
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'full_name', type: 'TEXT' },
        { name: 'email', type: 'TEXT' },
        { name: 'country', type: 'TEXT' },
        { name: 'signup_date', type: 'TEXT' },
        { name: 'segment', type: 'TEXT' },
      ],
      rows: [
        [1, 'Ava Chen', 'ava.chen@example.com', 'US', '2025-01-12', 'consumer'],
        [2, 'Liam Patel', 'liam.patel@example.com', 'GB', '2025-02-03', 'consumer'],
        [3, 'Noah Kim', 'noah.kim@example.com', 'US', '2025-02-20', 'business'],
        [4, 'Mia Garcia', 'mia.garcia@example.com', 'CA', '2025-03-15', 'consumer'],
        [5, 'Ethan Novak', 'ethan.novak@example.com', 'US', '2025-04-01', 'business'],
        [6, 'Zoe Muller', 'zoe.muller@example.com', 'DE', '2025-05-10', 'consumer'],
        [7, 'Omar Haddad', 'omar.haddad@example.com', 'AE', '2025-06-22', 'business'],
        [8, 'Sara Lind', 'sara.lind@example.com', 'SE', '2025-07-05', 'consumer'],
      ],
    },
    {
      name: 'stg_products', filename: 'products.csv',
      caption: 'The catalog. Water Bottle (110) has never been ordered.',
      columns: [
        { name: 'product_id', type: 'INTEGER' },
        { name: 'product_name', type: 'TEXT' },
        { name: 'category', type: 'TEXT' },
        { name: 'list_price', type: 'REAL' },
      ],
      rows: [
        [101, 'Wireless Earbuds', 'Electronics', 79.00],
        [102, 'Smart Thermostat', 'Home', 129.00],
        [103, 'USB-C Hub', 'Electronics', 39.00],
        [104, 'Down Jacket', 'Apparel', 189.00],
        [105, 'Yoga Mat', 'Outdoors', 45.00],
        [106, 'Desk Lamp', 'Home', 59.00],
        [107, 'Trail Backpack', 'Outdoors', 119.00],
        [108, 'Running Shoes', 'Apparel', 139.00],
        [109, 'Mechanical Keyboard', 'Electronics', 99.00],
        [110, 'Water Bottle', 'Outdoors', 24.00],
      ],
    },
    {
      name: 'stg_orders', filename: 'orders.csv',
      caption: 'Order headers. status is one of completed / cancelled / refunded; shipping_fee is charged once per order.',
      columns: [
        { name: 'order_id', type: 'INTEGER' },
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'order_ts', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'channel', type: 'TEXT' },
        { name: 'shipping_fee', type: 'REAL' },
      ],
      rows: [
        [5001, 1, '2025-03-02 10:14:00', 'completed', 'web', 5.00],
        [5002, 1, '2025-03-20 18:02:00', 'completed', 'mobile', 0.00],
        [5003, 2, '2025-04-05 09:41:00', 'completed', 'web', 7.50],
        [5004, 3, '2025-04-18 14:55:00', 'completed', 'store', 0.00],
        [5005, 3, '2025-05-02 11:30:00', 'cancelled', 'web', 5.00],
        [5006, 4, '2025-05-15 20:12:00', 'completed', 'mobile', 5.00],
        [5007, 2, '2025-06-01 08:05:00', 'refunded', 'web', 7.50],
        [5008, 5, '2025-06-10 13:22:00', 'completed', 'web', 0.00],
        [5009, 6, '2025-06-25 17:48:00', 'completed', 'mobile', 9.00],
        [5010, 1, '2025-07-03 12:00:00', 'completed', 'web', 5.00],
        [5011, 7, '2025-07-19 16:30:00', 'completed', 'store', 0.00],
        [5012, 4, '2025-08-02 19:15:00', 'completed', 'mobile', 5.00],
        [5013, 3, '2025-08-14 10:40:00', 'completed', 'web', 0.00],
        [5014, 6, '2025-09-01 15:05:00', 'completed', 'web', 9.00],
      ],
    },
    {
      name: 'stg_order_items', filename: 'order_items.csv',
      caption: 'Line items — the many side. unit_price is captured at sale time (it can differ from list_price).',
      columns: [
        { name: 'order_id', type: 'INTEGER' },
        { name: 'product_id', type: 'INTEGER' },
        { name: 'quantity', type: 'INTEGER' },
        { name: 'unit_price', type: 'REAL' },
      ],
      rows: [
        [5001, 101, 1, 79.00], [5001, 103, 2, 39.00],
        [5002, 105, 1, 45.00],
        [5003, 102, 1, 129.00], [5003, 106, 1, 59.00],
        [5004, 109, 3, 99.00], [5004, 103, 3, 39.00],
        [5005, 104, 1, 189.00],
        [5006, 108, 1, 139.00], [5006, 105, 2, 45.00],
        [5007, 107, 1, 119.00],
        [5008, 101, 1, 79.00],
        [5009, 104, 1, 189.00], [5009, 108, 1, 139.00],
        [5010, 103, 1, 39.00],
        [5011, 109, 2, 99.00], [5011, 102, 1, 129.00], [5011, 106, 2, 59.00],
        [5012, 105, 1, 45.00],
        [5013, 107, 1, 119.00], [5013, 105, 1, 45.00],
        [5014, 101, 2, 79.00],
      ],
    },
  ];

  /* ── Architecture diagram (theme-aware inline SVG) ──────────────────── */
  const DIAGRAM_SVG = [
    '<svg viewBox="0 0 880 300" role="img" aria-label="Pipeline: raw files land in a stage, load into RAW, transform to STAGING, model into a MARTS star schema, serve BI" class="pk-svg">',
    '<defs><marker id="pkarrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">',
    '<path d="M0,0 L7,3 L0,6 Z" fill="var(--text-muted,#888)"/></marker></defs>',
    // lane labels
    '<text x="12" y="24" class="pk-svg-lane">INGEST</text>',
    '<text x="330" y="24" class="pk-svg-lane">TRANSFORM (ELT)</text>',
    '<text x="690" y="24" class="pk-svg-lane">SERVE</text>',
    // node helper boxes
    _box(12, 44, 150, 70, '📄 Raw files', 'customers / products\norders / items (CSV)'),
    _box(12, 150, 150, 64, '☁️ External stage', '@lumen_stage\n(S3 / Azure / GCS)'),
    _arrow(87, 114, 87, 150),
    _box(196, 92, 150, 78, '🗄️ RAW', 'COPY INTO\nraw.orders, raw.customers…\n(landed as-is)'),
    _arrow(162, 131, 196, 131),
    _box(380, 92, 160, 78, '🧹 STAGING', 'typed + cleaned\nstg_orders, stg_items…\ndedup, cast, trim'),
    _arrow(346, 131, 380, 131),
    // MARTS star
    _box(574, 44, 190, 150, '⭐ MARTS (star)', ''),
    '<text x="669" y="92" text-anchor="middle" class="pk-svg-star">dim_customer</text>',
    '<text x="669" y="120" text-anchor="middle" class="pk-svg-star pk-svg-fact">fact_sales</text>',
    '<text x="669" y="148" text-anchor="middle" class="pk-svg-star">dim_product</text>',
    '<text x="669" y="176" text-anchor="middle" class="pk-svg-star">+ rev_by_category</text>',
    _arrow(540, 131, 574, 131),
    _box(800, 92, 70, 78, '📊 BI', 'dashboards\n& analysts'),
    _arrow(764, 131, 800, 131),
    // automation note
    '<text x="440" y="230" text-anchor="middle" class="pk-svg-note">↻ Streams on RAW + Tasks run MERGE incrementally — no full reloads</text>',
    '<text x="440" y="252" text-anchor="middle" class="pk-svg-note pk-svg-note-dim">Warehouse auto-suspends between runs → you pay only for seconds of compute</text>',
    '</svg>',
  ].join('');

  function _box(x, y, w, h, title, body) {
    let s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" rx="10" class="pk-svg-box"/>';
    s += '<text x="' + (x + 12) + '" y="' + (y + 24) + '" class="pk-svg-title">' + title + '</text>';
    (body || '').split('\n').forEach(function (line, i) {
      if (!line) return;
      s += '<text x="' + (x + 12) + '" y="' + (y + 44 + i * 16) + '" class="pk-svg-sub">' + line + '</text>';
    });
    return s;
  }
  function _arrow(x1, y1, x2, y2) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" class="pk-svg-arrow" marker-end="url(#pkarrow)"/>';
  }

  /* ── Build steps ────────────────────────────────────────────────────── */
  const BUILD = [
    {
      title: 'Provision the warehouse, database and schemas',
      explain: 'Separate RAW (landing), STAGING (typed/clean) and MARTS (star schema) into their own schemas. ' +
        'A small warehouse that auto-suspends keeps cost near zero between loads.',
      code:
        "-- One-time setup\n" +
        "CREATE WAREHOUSE IF NOT EXISTS lumen_wh\n" +
        "  WAREHOUSE_SIZE = 'XSMALL'\n" +
        "  AUTO_SUSPEND = 60          -- seconds idle before it parks\n" +
        "  AUTO_RESUME = TRUE\n" +
        "  INITIALLY_SUSPENDED = TRUE;\n\n" +
        "CREATE DATABASE IF NOT EXISTS lumen;\n" +
        "CREATE SCHEMA IF NOT EXISTS lumen.raw;      -- land files as-is\n" +
        "CREATE SCHEMA IF NOT EXISTS lumen.staging;  -- typed + cleaned\n" +
        "CREATE SCHEMA IF NOT EXISTS lumen.marts;    -- star schema for BI",
      codeTitle: 'Step 1 — provisioning (Snowflake)',
    },
    {
      title: 'Land the raw files with an external stage + COPY INTO',
      explain: 'Point a stage at cloud storage, declare a file format once, then bulk-load. ' +
        'Landing raw first (ELT) means you can replay transformations without re-downloading source files.',
      code:
        "CREATE OR REPLACE FILE FORMAT lumen.raw.csv_ff\n" +
        "  TYPE = CSV SKIP_HEADER = 1 FIELD_OPTIONALLY_ENCLOSED_BY = '\"'\n" +
        "  NULL_IF = ('', 'NULL') DATE_FORMAT = 'AUTO' TIMESTAMP_FORMAT = 'AUTO';\n\n" +
        "CREATE OR REPLACE STAGE lumen.raw.lumen_stage\n" +
        "  URL = 's3://lumen-exports/daily/'\n" +
        "  FILE_FORMAT = lumen.raw.csv_ff;\n\n" +
        "COPY INTO lumen.raw.orders\n" +
        "  FROM @lumen.raw.lumen_stage/orders/\n" +
        "  ON_ERROR = 'ABORT_STATEMENT';   -- fail loudly; don't silently skip rows\n" +
        "-- repeat for customers, products, order_items",
      codeTitle: 'Step 2 — landing (Snowflake)',
      dialectNote: 'Stages and COPY INTO are Snowflake-native and can\'t run in the in-browser engine — ' +
        'so Steps 1–2 are read-only. From Step 3 on, the staging tables above are already seeded for you, ' +
        'and your SQL runs for real.',
    },
    {
      title: 'Build dim_customer with a surrogate key',
      explain: 'A dimension gets a stable, meaningless surrogate key (customer_sk) so facts don\'t depend on ' +
        'the source system\'s natural key. Include every customer — even Sara Lind, who has never ordered.',
      code:
        "CREATE OR REPLACE TABLE lumen.marts.dim_customer AS\n" +
        "SELECT\n" +
        "  ROW_NUMBER() OVER (ORDER BY customer_id) AS customer_sk,\n" +
        "  customer_id,                 -- natural / business key\n" +
        "  full_name, country, segment\n" +
        "FROM lumen.staging.stg_customers;",
      codeTitle: 'Step 3 — dim_customer',
      run: {
        task: 'Build the customer dimension. Return customer_sk, customer_id, full_name, country, segment — ' +
          'with customer_sk as a surrogate key numbered 1, 2, 3… ordered by customer_id. Include ALL customers.',
        starter:
          'SELECT\n' +
          '  /* surrogate key here */ AS customer_sk,\n' +
          '  customer_id, full_name, country, segment\n' +
          'FROM stg_customers;',
        solution:
          'SELECT\n' +
          '  ROW_NUMBER() OVER (ORDER BY customer_id) AS customer_sk,\n' +
          '  customer_id, full_name, country, segment\n' +
          'FROM stg_customers;',
        hint: 'ROW_NUMBER() OVER (ORDER BY customer_id) generates 1..N in a stable order.',
      },
    },
    {
      title: 'Build fact_sales at line-item grain',
      explain: 'Decide the grain first: one row per order line. Join items (the many side) to orders for the ' +
        'header attributes, keep only completed orders, and store an additive measure (line_revenue).',
      code:
        "CREATE OR REPLACE TABLE lumen.marts.fact_sales AS\n" +
        "SELECT\n" +
        "  i.order_id, o.order_ts::DATE AS order_date, o.customer_id,\n" +
        "  i.product_id, i.quantity, i.unit_price,\n" +
        "  i.quantity * i.unit_price AS line_revenue\n" +
        "FROM lumen.staging.stg_order_items i\n" +
        "JOIN lumen.staging.stg_orders o ON o.order_id = i.order_id\n" +
        "WHERE o.status = 'completed';",
      codeTitle: 'Step 4 — fact_sales',
      dialectNote: 'Snowflake casts with o.order_ts::DATE; the browser engine (SQLite) has no :: cast, ' +
        'so the runnable version uses substr(order_ts, 1, 10) to take the date part — same result.',
      run: {
        task: 'Build the sales fact at order-line grain for COMPLETED orders only. Columns: order_id, ' +
          'order_date (the date part of order_ts), customer_id, product_id, quantity, unit_price, ' +
          'line_revenue (quantity × unit_price). Exclude cancelled and refunded orders.',
        starter:
          'SELECT\n' +
          '  i.order_id,\n' +
          '  substr(o.order_ts, 1, 10) AS order_date,\n' +
          '  o.customer_id, i.product_id, i.quantity, i.unit_price,\n' +
          '  /* additive measure */ AS line_revenue\n' +
          'FROM stg_order_items i\n' +
          'JOIN stg_orders o ON o.order_id = i.order_id\n' +
          "-- filter to completed orders\n;",
        solution:
          "SELECT\n" +
          "  i.order_id, substr(o.order_ts, 1, 10) AS order_date, o.customer_id,\n" +
          "  i.product_id, i.quantity, i.unit_price,\n" +
          "  i.quantity * i.unit_price AS line_revenue\n" +
          "FROM stg_order_items i\n" +
          "JOIN stg_orders o ON o.order_id = i.order_id\n" +
          "WHERE o.status = 'completed';",
        hint: 'line_revenue = i.quantity * i.unit_price. Add WHERE o.status = \'completed\'.',
      },
    },
    {
      title: 'Serve a revenue mart: monthly revenue by category',
      explain: 'The classic star-schema query — join the fact to a dimension and aggregate. This is the ' +
        'table a BI tool or analyst would actually read.',
      code:
        "CREATE OR REPLACE TABLE lumen.marts.rev_by_category AS\n" +
        "SELECT\n" +
        "  p.category,\n" +
        "  TO_CHAR(o.order_ts, 'YYYY-MM') AS order_month,\n" +
        "  SUM(i.quantity * i.unit_price) AS revenue\n" +
        "FROM lumen.staging.stg_order_items i\n" +
        "JOIN lumen.staging.stg_orders o ON o.order_id = i.order_id\n" +
        "JOIN lumen.staging.stg_products p ON p.product_id = i.product_id\n" +
        "WHERE o.status = 'completed'\n" +
        "GROUP BY p.category, TO_CHAR(o.order_ts, 'YYYY-MM')\n" +
        "ORDER BY p.category, order_month;",
      codeTitle: 'Step 5 — revenue mart',
      run: {
        task: 'Monthly revenue by product category for completed orders. Columns: category, order_month ' +
          '(YYYY-MM), revenue (sum of quantity × unit_price). Order by category, then order_month.',
        ordered: true,
        starter:
          'SELECT\n' +
          '  p.category,\n' +
          '  substr(o.order_ts, 1, 7) AS order_month,\n' +
          '  /* aggregate measure */ AS revenue\n' +
          'FROM stg_order_items i\n' +
          'JOIN stg_orders o ON o.order_id = i.order_id\n' +
          'JOIN stg_products p ON p.product_id = i.product_id\n' +
          "WHERE o.status = 'completed'\n" +
          '-- GROUP BY + ORDER BY\n;',
        solution:
          "SELECT\n" +
          "  p.category,\n" +
          "  substr(o.order_ts, 1, 7) AS order_month,\n" +
          "  SUM(i.quantity * i.unit_price) AS revenue\n" +
          "FROM stg_order_items i\n" +
          "JOIN stg_orders o ON o.order_id = i.order_id\n" +
          "JOIN stg_products p ON p.product_id = i.product_id\n" +
          "WHERE o.status = 'completed'\n" +
          "GROUP BY p.category, substr(o.order_ts, 1, 7)\n" +
          "ORDER BY p.category, order_month;",
        hint: 'GROUP BY category and the YYYY-MM month string; SUM(quantity * unit_price); then ORDER BY both.',
        note: 'Snowflake would format the month with TO_CHAR(order_ts, \'YYYY-MM\'); SQLite uses substr(order_ts, 1, 7).',
      },
    },
    {
      title: 'Automate it: incremental loads with Streams + Tasks',
      explain: 'Full reloads don\'t scale. A STREAM tracks new/changed rows on the raw table; a scheduled TASK ' +
        'consumes the stream and MERGEs only the delta into the fact — idempotently.',
      code:
        "-- Track changes landing in raw.order_items\n" +
        "CREATE OR REPLACE STREAM lumen.raw.items_stream\n" +
        "  ON TABLE lumen.raw.order_items;\n\n" +
        "-- Every 15 min, merge just the delta into the fact\n" +
        "CREATE OR REPLACE TASK lumen.marts.load_fact_sales\n" +
        "  WAREHOUSE = lumen_wh\n" +
        "  SCHEDULE = '15 MINUTE'\n" +
        "  WHEN SYSTEM$STREAM_HAS_DATA('lumen.raw.items_stream')\n" +
        "AS\n" +
        "  MERGE INTO lumen.marts.fact_sales f\n" +
        "  USING (\n" +
        "    SELECT s.order_id, o.order_ts::DATE AS order_date, o.customer_id,\n" +
        "           s.product_id, s.quantity, s.unit_price,\n" +
        "           s.quantity * s.unit_price AS line_revenue\n" +
        "    FROM lumen.raw.items_stream s\n" +
        "    JOIN lumen.raw.orders o ON o.order_id = s.order_id\n" +
        "    WHERE o.status = 'completed'\n" +
        "  ) d\n" +
        "  ON f.order_id = d.order_id AND f.product_id = d.product_id\n" +
        "  WHEN MATCHED THEN UPDATE SET quantity = d.quantity,\n" +
        "       unit_price = d.unit_price, line_revenue = d.line_revenue\n" +
        "  WHEN NOT MATCHED THEN INSERT VALUES (d.order_id, d.order_date,\n" +
        "       d.customer_id, d.product_id, d.quantity, d.unit_price, d.line_revenue);",
      codeTitle: 'Step 6 — incremental (Snowflake)',
      dialectNote: 'Streams, Tasks and MERGE are Snowflake-native orchestration — read-only here. The key idea ' +
        'to be able to explain: the stream gives you an idempotent delta, so re-running the task never ' +
        'double-counts.',
    },
  ];

  /* ── Debug the pipeline — real bugs / interviewer traps ─────────────── */
  const DEBUG = [
    {
      kind: 'fix',
      title: 'Orders-by-channel is wildly inflated',
      brief: 'A teammate\'s "orders by channel" numbers look about 50% too high. Their query joins ' +
        'stg_order_items to count orders. Fix it so each completed order is counted exactly once.',
      spec: {
        task: 'Return each channel and the number of DISTINCT completed orders as `orders`.',
        starter:
          "-- BUG: joining the many-side (items) multiplies the count\n" +
          "SELECT o.channel, COUNT(*) AS orders\n" +
          "FROM stg_orders o\n" +
          "JOIN stg_order_items i ON i.order_id = o.order_id\n" +
          "WHERE o.status = 'completed'\n" +
          "GROUP BY o.channel;",
        solution:
          "SELECT o.channel, COUNT(DISTINCT o.order_id) AS orders\n" +
          "FROM stg_orders o\n" +
          "JOIN stg_order_items i ON i.order_id = o.order_id\n" +
          "WHERE o.status = 'completed'\n" +
          "GROUP BY o.channel;",
        hint: 'After a one-to-many join, COUNT(*) counts item rows, not orders. Count DISTINCT order_id — ' +
          'or don\'t join items at all for an order-level count.',
      },
      lesson:
        '<p><strong>Fan-out.</strong> Joining <code>orders</code> (one) to <code>order_items</code> (many) ' +
        'multiplies each order row by its number of lines. <code>COUNT(*)</code> then counts lines, not orders. ' +
        'The fix is <code>COUNT(DISTINCT order_id)</code>, or simply not joining the item table when you only ' +
        'need an order-level metric.</p>' +
        '<p><strong>Interview framing:</strong> "Any time I aggregate across a join, I first ask: what is the ' +
        'grain of each table, and did the join change it? A header metric computed after joining the line table ' +
        'is a classic fan-out bug — I count distinct at the header grain, or pre-aggregate the lines to the ' +
        'header grain before joining."</p>',
    },
    {
      kind: 'fix',
      title: 'Net revenue double-charges shipping',
      brief: 'Finance wants net revenue by channel = item revenue + shipping. This query adds shipping_fee ' +
        'inside the item join, so an order with 3 lines is charged shipping 3×. Fix it so shipping is added ' +
        'once per order. (Order the result by channel.)',
      spec: {
        task: 'Return channel and net_revenue = (sum of line revenue) + (sum of shipping, once per order), ' +
          'for completed orders. Order by channel.',
        ordered: true,
        starter:
          "-- BUG: shipping_fee is added once PER LINE because of the item join\n" +
          "SELECT o.channel,\n" +
          "       SUM(i.quantity * i.unit_price + o.shipping_fee) AS net_revenue\n" +
          "FROM stg_orders o\n" +
          "JOIN stg_order_items i ON i.order_id = o.order_id\n" +
          "WHERE o.status = 'completed'\n" +
          "GROUP BY o.channel\n" +
          "ORDER BY o.channel;",
        solution:
          "WITH items AS (\n" +
          "  SELECT o.channel, SUM(i.quantity * i.unit_price) AS item_rev\n" +
          "  FROM stg_orders o\n" +
          "  JOIN stg_order_items i ON i.order_id = o.order_id\n" +
          "  WHERE o.status = 'completed'\n" +
          "  GROUP BY o.channel\n" +
          "),\n" +
          "ship AS (\n" +
          "  SELECT channel, SUM(shipping_fee) AS ship_rev\n" +
          "  FROM stg_orders\n" +
          "  WHERE status = 'completed'\n" +
          "  GROUP BY channel\n" +
          ")\n" +
          "SELECT items.channel, items.item_rev + ship.ship_rev AS net_revenue\n" +
          "FROM items JOIN ship ON ship.channel = items.channel\n" +
          "ORDER BY items.channel;",
        hint: 'Aggregate the two measures at their own grain first: item revenue from the item join, and ' +
          'shipping from the orders table alone, then add them per channel.',
      },
      lesson:
        '<p><strong>Mixed-grain measures.</strong> <code>shipping_fee</code> lives at order grain, but the ' +
        'item join is at line grain. Summing an order-level value across joined lines multiplies it by the ' +
        'line count. The robust pattern is to aggregate each measure at its native grain — here with two CTEs — ' +
        'then combine.</p>' +
        '<p><strong>Interview framing:</strong> "An order-level fee should never be summed through a line-level ' +
        'join. I compute item revenue and shipping separately at their own grains and join the aggregates. In ' +
        'a star schema I\'d usually keep shipping as an order-grain fact (or an allocated measure), not repeat ' +
        'it on every line."</p>',
    },
    {
      kind: 'investigate',
      title: 'COPY INTO "succeeded" but revenue is too low',
      scenario: {
        id: 'proj-copy-rowloss',
        area: 'project-dw-raw',
        symptom: 'The nightly COPY INTO reported success, the task is green — but analysts say yesterday\'s ' +
          'revenue is noticeably low. The source file had 1,205 order rows; raw.orders only has 1,180.',
        steps: [
          {
            prompt: 'Twenty-five rows are missing and nobody got an error. Where do you look first?',
            evidence: 'COPY INTO returns per-file load stats, and COPY_HISTORY / the load metadata retain them.',
            insight: 'Diagnose before you act — the load stats tell you immediately whether rows were rejected.',
            choices: [
              { text: 'Query COPY_HISTORY (or the COPY result) for ROWS_LOADED and ERRORS_SEEN on that file.', correct: true,
                why: 'The load stats show exactly how many rows loaded vs. were rejected — the fastest path to the cause.' },
              { text: 'Re-run the whole pipeline from scratch and hope it resolves.', correct: false,
                why: 'Blind re-runs can double-load or hide the real cause; you still won\'t know why rows went missing.' },
              { text: 'Scale the warehouse up — it\'s probably a resource problem.', correct: false,
                why: 'Missing rows are a data/parse problem, not a compute one. More compute changes nothing.' },
            ],
          },
          {
            prompt: 'COPY_HISTORY shows STATUS = "Loaded", ROWS_LOADED = 1,180, ERRORS_SEEN = 25, and the ' +
              'load ran with ON_ERROR = CONTINUE. What does that mean?',
            evidence: 'ON_ERROR = CONTINUE loads the good rows and skips the bad ones, still reporting overall success.',
            insight: 'A "successful" load can silently drop rows when ON_ERROR = CONTINUE masks parse failures.',
            choices: [
              { text: '25 rows failed to parse and were silently skipped; the load still reported success.', correct: true,
                why: 'Exactly — CONTINUE skips rejected rows and the statement still succeeds, so monitoring looked green.' },
              { text: 'Snowflake removed 25 duplicate rows automatically.', correct: false,
                why: 'COPY INTO does not dedupe; ERRORS_SEEN counts rejected rows, not duplicates.' },
              { text: 'ERRORS_SEEN is informational only; nothing was actually skipped.', correct: false,
                why: 'ERRORS_SEEN with ON_ERROR = CONTINUE means those rows were rejected and not loaded.' },
            ],
          },
          {
            prompt: 'The rejected rows have order_ts like "2025/09/01 10:14" (slashes), while the file format ' +
              'expects a dash format. What\'s the right fix?',
            evidence: 'The rejects are a schema/format drift, not random corruption — they can be reloaded once parsed correctly.',
            insight: 'Fix the format and reload the delta; don\'t leave CONTINUE silently discarding real data.',
            choices: [
              { text: 'Correct the file format / cast (e.g. explicit TIMESTAMP_FORMAT), reload the rejected rows, ' +
                  'and alert when ERRORS_SEEN > 0 so drift fails loudly next time.', correct: true,
                why: 'Fixes the root cause, recovers the lost revenue, and prevents a silent recurrence.' },
              { text: 'Switch ON_ERROR = ABORT_STATEMENT permanently so loads never skip rows.', correct: false,
                why: 'ABORT is safer than silent skips, but on its own it just fails nightly loads on the first bad row — ' +
                  'you still must fix the format and handle rejects.' },
              { text: 'Lower-case all the column names and retry.', correct: false,
                why: 'Column casing has nothing to do with a date-format parse failure.' },
            ],
          },
        ],
        rootCause: 'ON_ERROR = CONTINUE combined with a timestamp-format drift (slashes vs dashes) silently ' +
          'rejected 25 rows. The load reported success, so monitoring never flagged it.',
        resolution: 'Correct the file format / add an explicit TIMESTAMP_FORMAT (or cast with TRY_TO_TIMESTAMP), ' +
          'then reload just the rejected rows. Because COPY tracks load metadata per file, a corrected reload is idempotent.',
        prevention: 'Treat ERRORS_SEEN > 0 as a pipeline failure in orchestration; validate new files with ' +
          'VALIDATION_MODE before loading; add a row-count reconciliation (source vs raw) as a test.',
        interviewAnswer: 'I\'d pull the load metadata first — COPY_HISTORY showed ROWS_LOADED 1,180 with ' +
          'ERRORS_SEEN 25 under ON_ERROR = CONTINUE, which silently skips bad rows while still reporting success. ' +
          'The rejects were a timestamp-format drift. I\'d fix the file format, reload the delta idempotently, and ' +
          'make ERRORS_SEEN > 0 fail the load so format drift never hides again.',
      },
    },
  ];

  /* ── Interview discussion ───────────────────────────────────────────── */
  const QA = [
    { difficulty: 'medium',
      q: 'Why land raw files into a RAW schema first (ELT) instead of transforming them during the load (ETL)?',
      a: 'Landing raw first decouples ingestion from transformation. You keep an immutable, auditable copy of ' +
         'exactly what the source sent, so you can replay or fix transformations without re-pulling source data. ' +
         'It also lets cheap, elastic warehouse compute do the heavy transforms (the "T" in ELT) in SQL, and ' +
         'makes schema drift visible at a single boundary (RAW) rather than scattered through load scripts.' },
    { difficulty: 'medium',
      q: 'What is the grain of fact_sales, and why do you nail that down before writing any SQL?',
      a: 'The grain is one row per order line (order_id + product_id). Declaring the grain first tells you which ' +
         'keys are unique, which measures are additive at that grain (quantity, line_revenue), and which values ' +
         'are NOT (an order-level shipping fee). Most fact-table bugs — fan-out, double counting — come from ' +
         'mixing grains, so the grain is the contract everything else is checked against.' },
    { difficulty: 'hard',
      q: 'Why give dimensions a surrogate key (customer_sk) instead of just using the natural customer_id?',
      a: 'A surrogate key is a stable, system-generated integer that insulates the warehouse from the source. It ' +
         'lets you handle SCD Type 2 history (the same customer_id can have several versioned rows, each with its ' +
         'own sk), survive source-key changes or re-keying, integrate multiple source systems that may reuse ids, ' +
         'and keep fact joins on compact integers. You still keep customer_id as the business key for lookups.' },
    { difficulty: 'hard',
      q: 'How do you make the COPY INTO load idempotent so a re-run never double-loads?',
      a: 'COPY INTO tracks load metadata per file for ~64 days and skips files it has already loaded unless you ' +
         'set FORCE = TRUE — so re-running the same COPY is naturally idempotent. For ongoing deltas, drive loads ' +
         'from a Stream (which yields each change exactly once until consumed) and MERGE on the business key, so ' +
         'reprocessing updates in place rather than inserting duplicates.' },
    { difficulty: 'hard',
      q: 'A colleague computed order totals by joining the item table and the numbers were inflated. What happened, and how do you prevent it generally?',
      a: 'Fan-out: joining the one-side (orders) to the many-side (items) multiplies header rows by the line ' +
         'count, so any aggregate of order-level values (or COUNT(*)) is inflated. Prevent it by aggregating each ' +
         'measure at its native grain before combining — pre-aggregate lines to the order grain, or use ' +
         'COUNT(DISTINCT) / separate CTEs — and by being explicit about the grain of every table in a join.' },
    { difficulty: 'medium',
      q: 'Where do you filter out cancelled and refunded orders, and why not just zero out their measures?',
      a: 'Filter status at the point you build the fact (WHERE status = \'completed\'), so the fact only contains ' +
         'revenue-bearing lines. Zeroing measures leaves phantom rows that inflate counts and complicate every ' +
         'downstream query. If the business later needs cancellations, model them explicitly — e.g. an order-status ' +
         'dimension or a separate fact — rather than smuggling them into fact_sales.' },
    { difficulty: 'hard',
      q: 'The pipeline currently full-reloads. How would you make it incremental?',
      a: 'Put a Stream on the raw tables to capture only new/changed rows, and a scheduled Task (gated on ' +
         'SYSTEM$STREAM_HAS_DATA) that MERGEs the delta into the fact on the business key. The Stream gives an ' +
         'exactly-once delta so the MERGE is idempotent; the Task auto-runs the small warehouse which then ' +
         'auto-suspends. For very large tables you can also prune by a high-water-mark load timestamp.' },
    { difficulty: 'hard',
      q: 'An order_item arrives for a product that isn\'t in dim_product yet (a late-arriving dimension). What do you do?',
      a: 'Don\'t drop the fact row. Point it at an "unknown"/inferred member (e.g. surrogate key -1) so the sale is ' +
         'still counted, then backfill the real dimension attributes when the product record arrives and re-point ' +
         'the key. This keeps facts complete and avoids silent revenue loss while preserving referential integrity.' },
    { difficulty: 'medium',
      q: 'Why model the serving layer as a star schema instead of keeping the normalized source shape?',
      a: 'A star (central fact + denormalized dimensions) minimizes joins for analytical queries, is intuitive for ' +
         'BI tools and analysts, and makes aggregations fast and predictable. Fully normalized 3NF is great for ' +
         'OLTP write integrity but forces many joins and is hard to query. The dimensional model trades some ' +
         'redundancy for query simplicity and performance — the right trade for a warehouse.' },
    { difficulty: 'hard',
      q: 'How would you test and monitor this pipeline so a bad load is caught before analysts see it?',
      a: 'Reconcile row counts (source file vs RAW vs fact) and fail on mismatch; treat COPY ERRORS_SEEN > 0 as a ' +
         'failure; validate new files with VALIDATION_MODE in CI; add not-null/uniqueness tests on keys and ' +
         'referential checks (every fact product_id exists in dim_product); and assert measure sanity (no negative ' +
         'revenue, totals within expected bounds). Alert on task failures and freshness lag.' },
  ];

  /* ── Assemble the project spec ──────────────────────────────────────── */
  const SPEC = {
    id: 'project-dw-raw',
    eyebrow: '🏗️ Project · End-to-end',
    title: 'Build a Snowflake Data Warehouse from Raw Files',
    lead: 'You\'re the first data engineer at <strong>Lumen</strong>, a direct-to-consumer retailer. Daily CSV ' +
      'extracts land in cloud storage. Your job: turn them into a trustworthy star schema that finance and ' +
      'analysts can query — ingest the raw files, model dimensions and a sales fact, serve a revenue mart, and ' +
      'automate it incrementally. Along the way you\'ll fix the exact bugs interviewers love to probe.',
    meta: {
      role: 'Data Engineer', difficulty: 'Intermediate', duration: '45–60 min',
      skills: ['ELT', 'COPY INTO', 'Star schema', 'Surrogate keys', 'Window functions', 'Streams & Tasks', 'MERGE'],
    },
    goals: [
      'Provision a cost-controlled warehouse and a RAW → STAGING → MARTS layout',
      'Land raw files with an external stage, file format and COPY INTO',
      'Model <code>dim_customer</code>, <code>dim_product</code> and a line-grain <code>fact_sales</code>',
      'Serve a monthly <code>revenue-by-category</code> mart from the star',
      'Automate incremental loads with Streams, Tasks and MERGE',
      'Diagnose and fix fan-out, mixed-grain and silent-COPY-failure bugs',
    ],
    diagram: { caption: 'The shape you\'re building — a layered ELT pipeline feeding a star schema.', svg: DIAGRAM_SVG },
    seedNote: 'Four raw extracts. Download them to load into your own Snowflake account, or just read the ' +
      'previews — the very same rows are loaded into the in-browser engine, so every runnable step below ' +
      'checks your SQL against real results.',
    datasets: DATASETS,
    build: BUILD,
    debug: DEBUG,
    qa: QA,
  };

  P.Modules.projectDwRaw = {
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
