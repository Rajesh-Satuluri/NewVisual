/* Snowflake SQL Interview Scenarios — seed bank (sql renderer) */
(function () {
  'use strict';
  const S = [
    {
      id: 'sq-dedup', area: 'sql', category: 'Deduplication', difficulty: 'intermediate',
      title: 'Deduplicate to the latest record per key',
      scenario: 'A customer table has duplicate rows per customer_id from an at-least-once source. Keep only the latest by updated_at, then make the pipeline idempotent.',
      steps: [
        { q: 'Write SQL to keep the latest row per customer_id.',
          run: {
            title: 'Run it — latest row per key',
            task: 'Return one row per customer_id — the latest by updated_at (columns customer_id, name, updated_at).',
            setup: `CREATE TABLE customers (customer_id INTEGER, name TEXT, updated_at TEXT);
INSERT INTO customers VALUES
 (1,'Acme v1','2026-01-01'),(1,'Acme v2','2026-02-01'),
 (2,'Globex','2026-01-15'),
 (3,'Initech v1','2026-01-10'),(3,'Initech v2','2026-03-01'),(3,'Initech v1b','2026-02-01');`,
            starter: `SELECT customer_id, name, updated_at FROM (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) AS rn
  FROM customers
)
-- keep only the newest per customer
;`,
            solution: `SELECT customer_id, name, updated_at FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) AS rn
  FROM customers
) WHERE rn = 1;`,
            hint: 'The window already numbers rows newest-first. Add WHERE rn = 1 outside.',
            note: 'This engine is SQLite — no QUALIFY. The subquery + WHERE rn = 1 is exactly what Snowflake’s QUALIFY ROW_NUMBER() OVER (...) = 1 compiles to.',
          },
          sql: "SELECT *\nFROM customers\nQUALIFY ROW_NUMBER() OVER (\n         PARTITION BY customer_id\n         ORDER BY updated_at DESC\n       ) = 1;",
          a: 'QUALIFY filters on a window function without a subquery — ROW_NUMBER picks the newest row per customer_id. This is the idiomatic Snowflake dedup.' },
        { q: 'How do you apply this idempotently into a target table?',
          sql: "MERGE INTO customers_clean t\nUSING (\n  SELECT * FROM customers\n  QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) = 1\n) s\nON t.customer_id = s.customer_id\nWHEN MATCHED AND s.updated_at > t.updated_at THEN UPDATE SET ...\nWHEN NOT MATCHED THEN INSERT ...;",
          a: 'MERGE keyed on customer_id with an "only if newer" guard converges to the same final state on every run — so retries and duplicate loads are safe (idempotent).' },
        { q: 'How would you process only changed records instead of the whole table?',
          a: 'Put a Stream on the source to expose inserts/updates, and MERGE only the stream\'s change set (via a Task or Dynamic Table). Consuming the stream advances its offset so each run handles only new changes.' },
      ],
    },
    {
      id: 'sq-scd2', area: 'sql', category: 'SCD Type 2', difficulty: 'advanced',
      title: 'Slowly Changing Dimension (Type 2)',
      scenario: 'Maintain full history of dimension changes: when an attribute changes, close the old row and insert a new current row.',
      steps: [
        { q: 'What columns model SCD2, and how do you detect changes?',
          a: 'Add valid_from, valid_to, and is_current. A change is detected when the incoming attribute values differ from the current row for that business key.' },
        { q: 'Write the MERGE to expire changed rows and insert new versions.',
          sql: "MERGE INTO dim_customer t\nUSING staged s\nON t.customer_id = s.customer_id AND t.is_current = TRUE\nWHEN MATCHED AND (t.name, t.tier) <> (s.name, s.tier) THEN\n  UPDATE SET t.valid_to = CURRENT_TIMESTAMP(), t.is_current = FALSE\nWHEN NOT MATCHED THEN\n  INSERT (customer_id, name, tier, valid_from, valid_to, is_current)\n  VALUES (s.customer_id, s.name, s.tier, CURRENT_TIMESTAMP(), NULL, TRUE);",
          a: 'The MATCHED branch closes the old current row; the NOT MATCHED branch inserts brand-new keys. A common pattern runs this in two passes (expire, then insert new versions of changed keys) since a single MERGE can\'t both close and insert for the same key in one statement.' },
        { q: 'Why is a two-step approach often needed?',
          a: 'MERGE acts once per matched target row, so closing the old version and inserting the new version for the same key typically needs a second insert step (e.g., insert new versions for keys whose attributes changed). Streams can drive this incrementally.' },
      ],
    },
    {
      id: 'sq-qualify', area: 'sql', category: 'Window functions', difficulty: 'intermediate',
      title: 'Top-N per group with QUALIFY',
      scenario: 'Return the top 3 highest-value orders per customer.',
      steps: [
        { q: 'Write it using QUALIFY.',
          run: {
            title: 'Run it — top 3 per customer',
            task: 'Return the top 3 highest-amount orders per customer_id (columns customer_id, order_id, amount).',
            setup: `CREATE TABLE orders (customer_id INTEGER, order_id INTEGER, amount REAL);
INSERT INTO orders VALUES
 (1,101,120),(1,102,80),(1,103,200),(1,104,55),
 (2,201,300),(2,202,90),(2,203,310),(2,204,40),(2,205,75);`,
            starter: `SELECT customer_id, order_id, amount FROM (
  SELECT *,
    RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rnk
  FROM orders
)
-- keep the top 3 per customer
;`,
            solution: `SELECT customer_id, order_id, amount FROM (
  SELECT *, RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rnk
  FROM orders
) WHERE rnk <= 3;`,
            hint: 'Filter the outer query on rnk <= 3.',
            note: 'Snowflake: QUALIFY RANK() OVER (...) <= 3. RANK keeps ties (can return >3 at a tie); ROW_NUMBER gives exactly 3.',
          },
          sql: "SELECT customer_id, order_id, amount\nFROM orders\nQUALIFY RANK() OVER (\n          PARTITION BY customer_id\n          ORDER BY amount DESC\n        ) <= 3;",
          a: 'QUALIFY filters on the window result directly — no subquery/CTE needed. RANK vs ROW_NUMBER vs DENSE_RANK changes tie handling (RANK keeps ties, ROW_NUMBER breaks them).' },
        { q: 'How would ties be handled differently?',
          a: 'ROW_NUMBER gives exactly 3 rows even with ties (arbitrary tie-break); RANK may return more than 3 if there are ties at the boundary; DENSE_RANK keeps ranks contiguous. Choose based on business meaning of ties.' },
      ],
    },
    {
      id: 'sq-flatten', area: 'sql', category: 'Semi-structured', difficulty: 'intermediate',
      title: 'Unnest a JSON array with LATERAL FLATTEN',
      scenario: 'An events table has a VARIANT column payload with an items array; you need one row per item.',
      steps: [
        { q: 'Write SQL to explode the items array.',
          sql: "SELECT e.event_id,\n       f.value:sku::string   AS sku,\n       f.value:qty::number   AS qty\nFROM events e,\n     LATERAL FLATTEN(input => e.payload:items) f;",
          a: 'LATERAL FLATTEN turns each array element into a row; f.value holds the element, and :path::type extracts and casts fields. This is the idiomatic way to query nested arrays.' },
        { q: 'The sku filter is slow across billions of rows. How do you improve it?',
          a: 'Filtering on a VARIANT path gives the optimizer little partition metadata to prune with. Promote sku to a typed column (and cluster on it if the table is large and frequently filtered), so pruning and compression work.' },
      ],
    },
    {
      id: 'sq-gaps', area: 'sql', category: 'Window functions', difficulty: 'advanced',
      title: 'Sessionization (gaps and islands)',
      scenario: 'Group user events into sessions where a new session starts after a 30-minute gap.',
      steps: [
        { q: 'How do you detect a new session boundary?',
          run: {
            title: 'Run it — flag session boundaries',
            task: 'Add is_new_session = 1 when the gap from the user’s previous event exceeds 30 minutes (or it is their first event), else 0. Return user_id, event_time, is_new_session.',
            setup: `CREATE TABLE events (user_id INTEGER, event_time TEXT);
INSERT INTO events VALUES
 (1,'2026-01-01 09:00'),(1,'2026-01-01 09:10'),(1,'2026-01-01 10:05'),
 (1,'2026-01-01 10:20'),
 (2,'2026-01-01 08:00'),(2,'2026-01-01 09:00');`,
            starter: `SELECT user_id, event_time,
  CASE WHEN prev IS NULL
         OR (julianday(event_time) - julianday(prev)) * 1440 > 30
       THEN 1 ELSE 0 END AS is_new_session
FROM (
  SELECT user_id, event_time,
    LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS prev
  FROM events
);`,
            solution: `SELECT user_id, event_time,
  CASE WHEN prev IS NULL OR (julianday(event_time) - julianday(prev)) * 1440 > 30
       THEN 1 ELSE 0 END AS is_new_session
FROM (
  SELECT user_id, event_time,
    LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS prev
  FROM events
);`,
            hint: 'LAG gives the previous time; a NULL prev is the first event. Convert the day-fraction difference to minutes with * 1440.',
            note: 'Snowflake: DATEDIFF(’minute’, LAG(...), event_time) > 30. SQLite has no DATEDIFF, so (julianday(a) - julianday(b)) * 1440 gives the gap in minutes.',
          },
          sql: "SELECT user_id, event_time,\n       CASE WHEN DATEDIFF('minute',\n              LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time),\n              event_time) > 30\n            OR LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL\n            THEN 1 ELSE 0 END AS is_new_session\nFROM events;",
          a: 'LAG gives the previous event time per user; a gap over 30 minutes (or the first event) marks a new session boundary.' },
        { q: 'How do you turn boundaries into session ids?',
          sql: "SELECT user_id, event_time,\n       SUM(is_new_session) OVER (\n         PARTITION BY user_id ORDER BY event_time\n         ROWS UNBOUNDED PRECEDING\n       ) AS session_id\nFROM boundaries;",
          a: 'A running SUM of the new-session flag assigns a monotonically increasing session_id per user — the classic gaps-and-islands technique.' },
      ],
    },
    {
      id: 'sq-merge-upsert', area: 'sql', category: 'MERGE', difficulty: 'intermediate',
      title: 'Idempotent upsert from a stream',
      scenario: 'Apply incremental changes captured by a Stream into a target table exactly once.',
      steps: [
        { q: 'Write the MERGE that consumes the stream.',
          sql: "MERGE INTO target t\nUSING my_stream s\nON t.id = s.id\nWHEN MATCHED AND s.METADATA$ACTION = 'DELETE' THEN DELETE\nWHEN MATCHED THEN UPDATE SET t.val = s.val\nWHEN NOT MATCHED AND s.METADATA$ACTION = 'INSERT' THEN INSERT (id, val) VALUES (s.id, s.val);",
          a: 'Streams expose METADATA$ACTION (and METADATA$ISUPDATE) so the MERGE can apply inserts, updates, and deletes. Consuming the stream in a DML statement advances its offset.' },
        { q: 'Why does reading the stream in this MERGE make it incremental?',
          a: 'A stream returns only changes since its last consumed offset. When the MERGE (a DML statement) consumes it, the offset advances, so the next run processes only new changes — keeping the pipeline incremental and idempotent per batch.' },
      ],
    },
    {
      id: 'sq-timetravel', area: 'sql', category: 'Time Travel', difficulty: 'beginner',
      title: 'Recover from an accidental DELETE',
      scenario: 'Someone deleted rows from orders 10 minutes ago. Recover the pre-delete state.',
      steps: [
        { q: 'How do you inspect the table as it was before the delete?',
          sql: "SELECT * FROM orders BEFORE (STATEMENT => '<delete_query_id>');\n-- or\nSELECT * FROM orders AT (OFFSET => -60*15);  -- 15 minutes ago",
          a: 'Time Travel AT/BEFORE lets you query historical state by timestamp, offset, or the statement id of the bad query.' },
        { q: 'How do you restore the data?',
          sql: "CREATE OR REPLACE TABLE orders_restored CLONE orders BEFORE (STATEMENT => '<delete_query_id>');\n-- then swap/merge back, or:\nINSERT INTO orders\nSELECT * FROM orders BEFORE (STATEMENT => '<delete_query_id>')\nWHERE id NOT IN (SELECT id FROM orders);",
          a: 'Clone AT/BEFORE for a full instant recovery, or re-insert just the missing rows. If the table was dropped, UNDROP TABLE restores it. All within the retention window.' },
      ],
    },
    {
      id: 'sq-clone-test', area: 'sql', category: 'Cloning', difficulty: 'beginner',
      title: 'Spin up a test copy with zero-copy clone',
      scenario: 'QA needs a full copy of the analytics database to test a migration.',
      steps: [
        { q: 'How do you create the copy instantly and cheaply?',
          sql: "CREATE DATABASE analytics_qa CLONE analytics;",
          a: 'Zero-copy clone creates a metadata copy sharing the source\'s micro-partitions — instant regardless of size, with storage cost only where QA changes data (copy-on-write).' },
        { q: 'How would you clone the state from last night specifically?',
          sql: "CREATE DATABASE analytics_qa CLONE analytics\n  AT (TIMESTAMP => '2026-09-26 23:00:00'::timestamp);",
          a: 'Combine clone with Time Travel (AT) to reproduce a past point-in-time environment — useful for debugging or reproducing an incident.' },
      ],
    },
    {
      id: 'sq-incremental-agg', area: 'sql', category: 'Incremental', difficulty: 'advanced',
      title: 'Incremental daily aggregate with late data',
      scenario: 'Maintain a daily revenue rollup that self-corrects when late events arrive.',
      steps: [
        { q: 'Why not just append each day\'s total once?',
          a: 'Late events belonging to a past day would be missed. You need to reprocess a rolling window of recent days and upsert, so totals converge to correct as late data lands.' },
        { q: 'Write an idempotent rollup for the last 3 days.',
          sql: "MERGE INTO daily_revenue t\nUSING (\n  SELECT event_date::date AS d, SUM(amount) AS revenue\n  FROM events\n  WHERE event_date >= DATEADD('day', -3, CURRENT_DATE())\n  GROUP BY 1\n) s\nON t.d = s.d\nWHEN MATCHED THEN UPDATE SET t.revenue = s.revenue\nWHEN NOT MATCHED THEN INSERT (d, revenue) VALUES (s.d, s.revenue);",
          a: 'Recomputing the recent window from source and MERGEing by day makes the rollup idempotent and late-data tolerant — each run overwrites those days with the correct current total.' },
      ],
    },
    {
      id: 'sq-pivot', area: 'sql', category: 'Reshaping', difficulty: 'intermediate',
      title: 'Pivot categories into columns',
      scenario: 'Turn per-category sales rows into one row per region with a column per category.',
      steps: [
        { q: 'Write a PIVOT.',
          sql: "SELECT *\nFROM sales\nPIVOT (SUM(amount) FOR category IN ('books','music','film')) AS p\n       (region, books, music, film);",
          a: 'PIVOT aggregates amount per category into columns. For a dynamic category list you\'d generate the IN-list or use a scripting/GENERATE approach, since static PIVOT needs known values.' },
        { q: 'What if categories are not known in advance?',
          a: 'Static PIVOT requires a fixed IN-list. For dynamic pivots, build the column list programmatically (Snowflake scripting / a generated query) or keep it long-format and let the BI tool pivot.' },
      ],
    },
    {
      id: 'sq-cumulative', area: 'sql', category: 'Window functions', difficulty: 'intermediate',
      title: 'Running total and moving average',
      scenario: 'Compute a running revenue total and a 7-day moving average per product.',
      steps: [
        { q: 'Write both window expressions.',
          run: {
            title: 'Run it — running total + moving average',
            task: 'Per product_id ordered by d, return running_total (all rows up to current) and ma_7d (average over the last 7 rows incl. current). Columns: product_id, d, revenue, running_total, ma_7d.',
            setup: `CREATE TABLE daily_product_revenue (product_id INTEGER, d TEXT, revenue REAL);
INSERT INTO daily_product_revenue VALUES
 (1,'2026-01-01',10),(1,'2026-01-02',20),(1,'2026-01-03',30),
 (1,'2026-01-04',40),(1,'2026-01-05',50),(1,'2026-01-06',60),
 (1,'2026-01-07',70),(1,'2026-01-08',80),
 (2,'2026-01-01',5),(2,'2026-01-02',15),(2,'2026-01-03',25);`,
            starter: `SELECT product_id, d, revenue,
  SUM(revenue) OVER (PARTITION BY product_id ORDER BY d
                     ROWS UNBOUNDED PRECEDING) AS running_total,
  AVG(revenue) OVER (PARTITION BY product_id ORDER BY d
                     ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma_7d
FROM daily_product_revenue;`,
            solution: `SELECT product_id, d, revenue,
  SUM(revenue) OVER (PARTITION BY product_id ORDER BY d
                     ROWS UNBOUNDED PRECEDING) AS running_total,
  AVG(revenue) OVER (PARTITION BY product_id ORDER BY d
                     ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma_7d
FROM daily_product_revenue;`,
            hint: 'UNBOUNDED PRECEDING for the running total; a 6-PRECEDING-to-CURRENT frame = 7 rows for the moving average.',
            note: 'The frame clause is the whole skill. ROWS counts physical rows, so missing dates shorten a 7-day window — densify dates or use RANGE for calendar windows. This runs unchanged on Snowflake.',
          },
          sql: "SELECT product_id, d, revenue,\n  SUM(revenue) OVER (PARTITION BY product_id ORDER BY d\n                     ROWS UNBOUNDED PRECEDING) AS running_total,\n  AVG(revenue) OVER (PARTITION BY product_id ORDER BY d\n                     ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma_7d\nFROM daily_product_revenue;",
          a: 'Frame clauses control the window: UNBOUNDED PRECEDING for a running total, a 7-row sliding frame for the moving average. Getting the frame right is the key skill.' },
        { q: 'What is a subtle correctness risk here?',
          a: 'ROWS vs RANGE and gaps in dates. ROWS counts physical rows (so missing days shorten the window); if you need calendar-based windows, densify the dates first or use RANGE with an interval.' },
      ],
    },
    {
      id: 'sq-cdc-current', area: 'sql', category: 'CDC', difficulty: 'advanced',
      title: 'Build a current-state table from a change feed',
      scenario: 'From an append-only change feed (inserts/updates/deletes with event_time), materialize the latest state per key.',
      steps: [
        { q: 'How do you pick the latest change per key, handling out-of-order arrivals?',
          run: {
            title: 'Run it — latest change per key',
            task: 'From the change feed, return the latest row per id by event_time (columns id, op, val, event_time) — even though rows arrived out of order.',
            setup: `CREATE TABLE change_feed (id INTEGER, op TEXT, val TEXT, event_time TEXT);
INSERT INTO change_feed VALUES
 (1,'INSERT','a','2026-01-01 10:00'),
 (1,'UPDATE','b','2026-01-01 12:00'),
 (1,'UPDATE','a2','2026-01-01 11:00'),
 (2,'INSERT','x','2026-01-01 09:00'),
 (2,'DELETE','x','2026-01-01 13:00');`,
            starter: `SELECT id, op, val, event_time FROM (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY event_time DESC) AS rn
  FROM change_feed
)
-- newest event per id wins
;`,
            solution: `SELECT id, op, val, event_time FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY event_time DESC) AS rn
  FROM change_feed
) WHERE rn = 1;`,
            hint: 'Order by event_time DESC (not arrival), then keep rn = 1 per id.',
            note: 'Ordering by event_time makes it order-insensitive. Snowflake: QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY event_time DESC) = 1. Next step: drop ids whose latest op is DELETE.',
          },
          sql: "SELECT *\nFROM change_feed\nQUALIFY ROW_NUMBER() OVER (\n         PARTITION BY id ORDER BY event_time DESC\n       ) = 1;",
          a: 'Ordering by event_time (not arrival) and taking the top row per key makes it order-insensitive: the newest event wins even if it arrived earlier.' },
        { q: 'How do you exclude keys whose latest change is a delete?',
          sql: "SELECT * FROM latest\nWHERE op <> 'DELETE';\n-- applied via MERGE:\n-- WHEN MATCHED AND s.op='DELETE' THEN DELETE\n-- WHEN MATCHED THEN UPDATE ...\n-- WHEN NOT MATCHED AND s.op<>'DELETE' THEN INSERT ...",
          a: 'After selecting the latest change per key, drop keys whose latest op is DELETE (or apply deletes in the MERGE). This yields a correct current-state table from an unordered feed.' },
      ],
    },
  ];
  window.CDWH.ScenarioEngine.register('sql', S);
})();
