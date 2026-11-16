/* Fundamentals · SQL Playground — runnable, in-browser SQL (sql.js) */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.fundamentals = viz.P.fundamentals || {};
  const P = viz.P.fundamentals;
  P.Modules = P.Modules || {};

  // Shared seed: a tiny orders / customers warehouse slice.
  const SEED = [
    'CREATE TABLE customers (customer_id INTEGER, name TEXT, region TEXT);',
    "INSERT INTO customers VALUES",
    " (1,'Acme','West'),(2,'Globex','East'),(3,'Initech','West'),(4,'Umbrella','East');",
    'CREATE TABLE orders (order_id INTEGER, customer_id INTEGER, order_date TEXT, amount REAL, status TEXT);',
    "INSERT INTO orders VALUES",
    " (101,1,'2026-01-03',120.00,'paid'),",
    " (102,1,'2026-01-09',80.00,'paid'),",
    " (103,2,'2026-01-11',200.00,'paid'),",
    " (104,2,'2026-02-02',50.00,'refunded'),",
    " (105,3,'2026-02-05',300.00,'paid'),",
    " (106,1,'2026-02-18',40.00,'paid'),",
    " (107,4,'2026-03-01',90.00,'paid'),",
    " (108,3,'2026-03-07',60.00,'refunded'),",
    // a deliberate duplicate row to dedup:
    " (105,3,'2026-02-05',300.00,'paid');",
  ].join('\n');

  const EXERCISES = [
    {
      title: '1 · Aggregate per customer',
      task: 'Return each customer_id and their total paid amount (status = \'paid\'), ' +
        'as columns customer_id and total_paid. Ignore refunded rows and duplicates don\'t matter here — just sum paid rows.',
      starter: 'SELECT\n  customer_id,\n  SUM(amount) AS total_paid\nFROM orders\n-- add a filter and a GROUP BY\n;',
      solution:
        "SELECT customer_id, SUM(amount) AS total_paid\n" +
        "FROM orders WHERE status='paid'\n" +
        "GROUP BY customer_id;",
      hint: 'Filter with WHERE status = \'paid\', then GROUP BY customer_id and SUM(amount).',
    },
    {
      title: '2 · Deduplicate with ROW_NUMBER()',
      task: 'Order 105 was loaded twice (same values). Return the distinct orders — one row per ' +
        'order_id — keeping all columns (order_id, customer_id, order_date, amount, status). ' +
        'Use a window function, not GROUP BY.',
      starter:
        'SELECT order_id, customer_id, order_date, amount, status\n' +
        'FROM (\n' +
        '  SELECT *,\n' +
        '    ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY order_id) AS rn\n' +
        '  FROM orders\n' +
        ')\n' +
        '-- keep only the first copy\n;',
      solution:
        'SELECT order_id, customer_id, order_date, amount, status FROM (\n' +
        '  SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY order_id) AS rn\n' +
        '  FROM orders\n' +
        ') WHERE rn = 1;',
      note: 'Snowflake lets you write this as `QUALIFY ROW_NUMBER() OVER (...) = 1`. ' +
        'SQLite (this engine) has no QUALIFY, so you wrap the window function in a subquery ' +
        'and filter on it — exactly what QUALIFY compiles to.',
      hint: 'The inner query already numbers duplicates. Add WHERE rn = 1 to the outer query.',
    },
    {
      title: '3 · Running total (window frame)',
      task: 'For customer_id = 1, return order_date and a running total of amount ordered by ' +
        'order_date, as columns order_date and running_total. Row order matters.',
      ordered: true,
      starter:
        'SELECT order_date,\n' +
        '  SUM(amount) OVER (ORDER BY order_date) AS running_total\n' +
        'FROM orders\n' +
        '-- restrict to one customer\n;',
      solution:
        "SELECT order_date,\n" +
        "  SUM(amount) OVER (ORDER BY order_date) AS running_total\n" +
        "FROM orders WHERE customer_id = 1\n" +
        "ORDER BY order_date;",
      hint: 'Add WHERE customer_id = 1 and an outer ORDER BY order_date for deterministic order.',
    },
  ];

  P.Modules.sqlPlayground = {
    render(canvas) {
      const instances = [];
      const root = document.createElement('div');
      root.className = 'sqlp-page';
      root.innerHTML =
        '<div class="mod-eyebrow">🧪 Hands-on</div>' +
        '<h1 class="mod-title">SQL Playground</h1>' +
        '<p class="mod-subtitle fund-lead">Real SQL, executed in your browser — no server, no sign-up. ' +
        'The engine (SQLite compiled to WebAssembly) loads on demand the first time you open ' +
        'this page, then runs entirely offline. Write a query, press <strong>Run</strong>, and ' +
        'your result is diffed against the expected output.</p>' +
        '<div class="sqlp-seednote">Every exercise shares this seed data: a <code>customers</code> ' +
        'table and an <code>orders</code> table (with one deliberately duplicated order, for the ' +
        'dedup exercise).</div>' +
        '<div data-exercises></div>';
      canvas.appendChild(root);

      const host = root.querySelector('[data-exercises]');
      EXERCISES.forEach(function (ex) {
        const spec = Object.assign({ setup: SEED }, ex);
        instances.push(viz.SqlPlayground.mount(host, spec));
      });

      return {
        destroy() { instances.forEach(function (i) { i && i.destroy && i.destroy(); }); },
      };
    },
  };
})();
