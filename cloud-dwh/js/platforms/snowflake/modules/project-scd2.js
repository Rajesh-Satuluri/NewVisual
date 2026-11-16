/* =====================================================================
   Snowflake · Project — SCD Type 2, End to End
   An interview-grade project rendered by CDWH.ProjectKit.
   Narrative: the Lumen customer dimension must keep history. A source
   change feed delivers new customer states over time; you build an SCD2
   dimension (versioned rows with valid_from / valid_to / is_current),
   answer point-in-time questions, and apply changes incrementally the
   way Snowflake actually does it (hash-detect + expire/insert MERGE,
   driven by Streams + Tasks).
   ===================================================================== */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.snowflake = viz.P.snowflake || {};
  const P = viz.P.snowflake;
  P.Modules = P.Modules || {};

  /* ── Sample data — a customer change feed (single source of truth) ──── */
  const DATASETS = [
    {
      name: 'src_customer_feed', filename: 'customer_feed.csv',
      caption: 'Each row is a new known state of a customer, effective from a date. ' +
        'Ava and Noah change several times; Mia never changes (one version).',
      columns: [
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'effective_date', type: 'TEXT' },
        { name: 'full_name', type: 'TEXT' },
        { name: 'country', type: 'TEXT' },
        { name: 'segment', type: 'TEXT' },
        { name: 'loyalty_tier', type: 'TEXT' },
      ],
      rows: [
        [1, '2024-01-10', 'Ava Chen', 'US', 'consumer', 'bronze'],
        [1, '2024-07-01', 'Ava Chen', 'US', 'consumer', 'silver'],
        [1, '2025-02-15', 'Ava Chen', 'US', 'business', 'gold'],
        [2, '2024-03-05', 'Liam Patel', 'GB', 'consumer', 'bronze'],
        [2, '2025-01-20', 'Liam Patel', 'IE', 'consumer', 'bronze'],
        [3, '2024-02-20', 'Noah Kim', 'US', 'business', 'silver'],
        [3, '2024-11-11', 'Noah Kim', 'US', 'business', 'gold'],
        [3, '2025-06-01', 'Noah Kim', 'US', 'business', 'platinum'],
        [4, '2024-05-15', 'Mia Garcia', 'CA', 'consumer', 'bronze'],
      ],
    },
  ];

  /* Reusable reconstruction CTE (shared by several runnable steps). */
  const SCD2_CTE =
    'WITH scd2 AS (\n' +
    '  SELECT\n' +
    '    ROW_NUMBER() OVER (ORDER BY customer_id, effective_date) AS customer_sk,\n' +
    '    customer_id, full_name, country, segment, loyalty_tier,\n' +
    '    effective_date AS valid_from,\n' +
    "    COALESCE(\n" +
    "      date(LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date), '-1 day'),\n" +
    "      '9999-12-31'\n" +
    '    ) AS valid_to,\n' +
    '    CASE WHEN LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date)\n' +
    '         IS NULL THEN 1 ELSE 0 END AS is_current\n' +
    '  FROM src_customer_feed\n' +
    ')';

  /* ── Architecture / timeline diagram (theme-aware inline SVG) ───────── */
  const DIAGRAM_SVG = [
    '<svg viewBox="0 0 880 320" role="img" aria-label="SCD2 flow: a change feed is hash-compared, the current row is expired and a new version inserted, producing a versioned dimension timeline" class="pk-svg">',
    '<defs><marker id="scdarrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">',
    '<path d="M0,0 L7,3 L0,6 Z" fill="var(--text-muted,#888)"/></marker></defs>',
    '<text x="12" y="22" class="pk-svg-lane">CHANGE FEED</text>',
    '<text x="250" y="22" class="pk-svg-lane">DETECT &amp; APPLY</text>',
    '<text x="560" y="22" class="pk-svg-lane">SCD2 DIMENSION (Ava Chen, customer_id = 1)</text>',
    _box(12, 40, 150, 96, '🔁 New state', 'customer_id=1\nsegment: business\ntier: gold\neffective 2025-02-15'),
    _box(196, 40, 150, 96, '🧮 Hash compare', 'row_hash(tracked cols)\n≠ current? → change\n= current? → skip'),
    _arrow(162, 88, 196, 88),
    _box(196, 160, 150, 70, '✂️ Expire + insert', 'close old row\n(valid_to, is_current=0)\ninsert new version'),
    _arrow(271, 136, 271, 160),
    _arrow(346, 88, 390, 88),
    // timeline bars
    '<text x="390" y="56" class="pk-svg-sub">v1  bronze</text>',
    '<rect x="470" y="46" width="120" height="16" rx="3" class="pk-svg-bar"/>',
    '<text x="596" y="58" class="pk-svg-tiny">2024-01-10 → 2024-06-30 · is_current=0</text>',
    '<text x="390" y="86" class="pk-svg-sub">v2  silver</text>',
    '<rect x="470" y="76" width="120" height="16" rx="3" class="pk-svg-bar"/>',
    '<text x="596" y="88" class="pk-svg-tiny">2024-07-01 → 2025-02-14 · is_current=0</text>',
    '<text x="390" y="116" class="pk-svg-sub">v3  gold</text>',
    '<rect x="470" y="106" width="120" height="16" rx="3" class="pk-svg-bar pk-svg-bar-cur"/>',
    '<text x="596" y="118" class="pk-svg-tiny">2025-02-15 → 9999-12-31 · is_current=1</text>',
    '<text x="470" y="150" class="pk-svg-note">Every version keeps its own surrogate key; facts point at the version that was current at event time.</text>',
    '<text x="196" y="262" class="pk-svg-note">↻ A Stream on the feed + a Task run the MERGE on a schedule — only changed keys are touched.</text>',
    '<text x="196" y="284" class="pk-svg-note pk-svg-note-dim">as-of query: WHERE :as_of BETWEEN valid_from AND valid_to</text>',
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
      '" class="pk-svg-arrow" marker-end="url(#scdarrow)"/>';
  }

  /* ── Build steps ────────────────────────────────────────────────────── */
  const BUILD = [
    {
      title: 'Model the SCD2 dimension table',
      explain: 'An SCD Type 2 dimension keeps a new row for every version of a customer. The surrogate key ' +
        'identifies the version; the business key (customer_id) ties versions together; the validity window ' +
        'and is_current flag say which version applied when.',
      code:
        "CREATE OR REPLACE TABLE lumen.marts.dim_customer (\n" +
        "  customer_sk    NUMBER IDENTITY,      -- version surrogate key\n" +
        "  customer_id    NUMBER,               -- business / natural key\n" +
        "  full_name      STRING,\n" +
        "  country        STRING,\n" +
        "  segment        STRING,\n" +
        "  loyalty_tier   STRING,\n" +
        "  valid_from     DATE,\n" +
        "  valid_to       DATE,                 -- 9999-12-31 while current\n" +
        "  is_current     BOOLEAN,\n" +
        "  row_hash       STRING                -- hash of tracked columns, for change detection\n" +
        ");",
      codeTitle: 'Step 1 — dimension DDL (Snowflake)',
    },
    {
      title: 'Backfill the full history from the change feed',
      explain: 'Before you can apply daily changes, you reconstruct history from the feed. Each customer\'s rows ' +
        'become versions: valid_from is the effective date, valid_to is the day before the next change (or ' +
        '9999-12-31 if none), and the last version is current.',
      code:
        "INSERT INTO lumen.marts.dim_customer\n" +
        "  (customer_id, full_name, country, segment, loyalty_tier, valid_from, valid_to, is_current)\n" +
        "SELECT\n" +
        "  customer_id, full_name, country, segment, loyalty_tier,\n" +
        "  effective_date AS valid_from,\n" +
        "  COALESCE(\n" +
        "    DATEADD(day, -1, LEAD(effective_date) OVER (\n" +
        "      PARTITION BY customer_id ORDER BY effective_date)),\n" +
        "    DATE '9999-12-31'\n" +
        "  ) AS valid_to,\n" +
        "  LEAD(effective_date) OVER (\n" +
        "    PARTITION BY customer_id ORDER BY effective_date) IS NULL AS is_current\n" +
        "FROM lumen.staging.src_customer_feed;",
      codeTitle: 'Step 2 — backfill history',
      dialectNote: 'Snowflake uses DATEADD(day, -1, …) and a real BOOLEAN; the runnable engine (SQLite) uses ' +
        "date(…, '-1 day') and 1/0 for the flag — same logic, same result.",
      run: {
        task: 'Rebuild the full SCD2 dimension from src_customer_feed. Return customer_sk (ROW_NUMBER ordered ' +
          'by customer_id, effective_date), customer_id, full_name, country, segment, loyalty_tier, valid_from ' +
          '(= effective_date), valid_to (day before the next change for that customer, else 9999-12-31), and ' +
          'is_current (1 for the latest version per customer, else 0). Order by customer_sk.',
        ordered: true,
        starter:
          '-- Fill in valid_to and is_current using LEAD(effective_date)\n' +
          'SELECT\n' +
          '  ROW_NUMBER() OVER (ORDER BY customer_id, effective_date) AS customer_sk,\n' +
          '  customer_id, full_name, country, segment, loyalty_tier,\n' +
          '  effective_date AS valid_from,\n' +
          '  /* valid_to */ AS valid_to,\n' +
          '  /* is_current */ AS is_current\n' +
          'FROM src_customer_feed\n' +
          'ORDER BY customer_sk;',
        solution:
          'SELECT\n' +
          '  ROW_NUMBER() OVER (ORDER BY customer_id, effective_date) AS customer_sk,\n' +
          '  customer_id, full_name, country, segment, loyalty_tier,\n' +
          '  effective_date AS valid_from,\n' +
          "  COALESCE(\n" +
          "    date(LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date), '-1 day'),\n" +
          "    '9999-12-31'\n" +
          '  ) AS valid_to,\n' +
          '  CASE WHEN LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date)\n' +
          '       IS NULL THEN 1 ELSE 0 END AS is_current\n' +
          'FROM src_customer_feed\n' +
          'ORDER BY customer_sk;',
        hint: 'valid_to = date(LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date), ' +
          "'-1 day'), defaulted to '9999-12-31'. is_current = 1 when that LEAD is NULL.",
      },
    },
    {
      title: 'Answer a point-in-time (as-of) question',
      explain: 'The whole point of SCD2 is historically-correct answers: "what segment and tier was each ' +
        'customer on 2024-12-31?" You filter to the version whose window contains that date.',
      code:
        "SELECT customer_id, country, segment, loyalty_tier\n" +
        "FROM lumen.marts.dim_customer\n" +
        "WHERE DATE '2024-12-31' BETWEEN valid_from AND valid_to\n" +
        "ORDER BY customer_id;",
      codeTitle: 'Step 3 — as-of query',
      run: {
        task: 'Using the rebuilt dimension, return each customer\'s country, segment and loyalty_tier AS OF ' +
          '2024-12-31 (one row per customer). Columns: customer_id, country, segment, loyalty_tier. Order by customer_id.',
        ordered: true,
        starter:
          SCD2_CTE + '\n' +
          'SELECT customer_id, country, segment, loyalty_tier\n' +
          'FROM scd2\n' +
          "-- keep only the version whose window contains 2024-12-31\n" +
          'ORDER BY customer_id;',
        solution:
          SCD2_CTE + '\n' +
          'SELECT customer_id, country, segment, loyalty_tier\n' +
          'FROM scd2\n' +
          "WHERE '2024-12-31' BETWEEN valid_from AND valid_to\n" +
          'ORDER BY customer_id;',
        hint: "Add WHERE '2024-12-31' BETWEEN valid_from AND valid_to — each customer has exactly one version " +
          'covering that date.',
        note: 'Expected: Ava → consumer/silver, Liam → GB/consumer/bronze, Noah → business/gold, Mia → consumer/bronze.',
      },
    },
    {
      title: 'Detect changes with a row hash',
      explain: 'On each load you only want to version customers whose tracked attributes actually changed. ' +
        'Hashing the tracked columns turns "did anything change?" into a single equality check.',
      code:
        "-- Compare incoming rows to the current version by hash\n" +
        "WITH incoming AS (\n" +
        "  SELECT customer_id, full_name, country, segment, loyalty_tier,\n" +
        "         HASH(country, segment, loyalty_tier) AS row_hash\n" +
        "  FROM lumen.staging.src_customer_feed_today\n" +
        ")\n" +
        "SELECT i.*\n" +
        "FROM incoming i\n" +
        "LEFT JOIN lumen.marts.dim_customer d\n" +
        "  ON d.customer_id = i.customer_id AND d.is_current\n" +
        "WHERE d.customer_id IS NULL        -- brand-new customer\n" +
        "   OR d.row_hash <> i.row_hash;    -- a tracked column changed",
      codeTitle: 'Step 4 — change detection (Snowflake)',
      dialectNote: 'HASH() is a Snowflake built-in; the idea (hash the tracked columns and compare) is what ' +
        'keeps the load from creating no-op versions when nothing meaningful changed.',
    },
    {
      title: 'Apply changes: expire the old version, insert the new one',
      explain: 'This is the step interviewers probe hardest. A single MERGE cannot both expire the current row ' +
        'AND insert a new version for the same key in one pass. The standard pattern stages each change as TWO ' +
        'logical rows — one to MATCH-and-expire, one to INSERT — or runs an UPDATE then an INSERT.',
      code:
        "-- Two-step apply (clear and idempotent)\n" +
        "-- 1) expire the current rows whose attributes changed\n" +
        "UPDATE lumen.marts.dim_customer d\n" +
        "SET valid_to = DATEADD(day, -1, c.effective_date), is_current = FALSE\n" +
        "FROM changed_rows c\n" +
        "WHERE d.customer_id = c.customer_id AND d.is_current;\n\n" +
        "-- 2) insert the new current version\n" +
        "INSERT INTO lumen.marts.dim_customer\n" +
        "  (customer_id, full_name, country, segment, loyalty_tier,\n" +
        "   valid_from, valid_to, is_current, row_hash)\n" +
        "SELECT customer_id, full_name, country, segment, loyalty_tier,\n" +
        "   effective_date, DATE '9999-12-31', TRUE,\n" +
        "   HASH(country, segment, loyalty_tier)\n" +
        "FROM changed_rows;",
      codeTitle: 'Step 5 — expire + insert (Snowflake)',
      dialectNote: 'You can also do this as a single MERGE by UNION-ing two staged rows per change (one with the ' +
        'business key to match+expire, one with a NULL key to force the insert). Either way the rule is: expire ' +
        'and insert are two actions — one MERGE pass matches a target row once.',
    },
    {
      title: 'Automate it with a Stream + Task',
      explain: 'A Stream on the source captures only new/changed rows; a scheduled Task consumes it and runs the ' +
        'expire+insert. Because the stream yields each change once, re-running is safe.',
      code:
        "CREATE OR REPLACE STREAM lumen.staging.feed_stream\n" +
        "  ON TABLE lumen.staging.src_customer_feed;\n\n" +
        "CREATE OR REPLACE TASK lumen.marts.apply_scd2\n" +
        "  WAREHOUSE = lumen_wh\n" +
        "  SCHEDULE = '60 MINUTE'\n" +
        "  WHEN SYSTEM$STREAM_HAS_DATA('lumen.staging.feed_stream')\n" +
        "AS\n" +
        "  CALL lumen.marts.sp_apply_scd2();   -- wraps the change-detect + expire + insert",
      codeTitle: 'Step 6 — orchestration (Snowflake)',
      dialectNote: 'Streams + Tasks are Snowflake-native orchestration — read-only here. The interview point: the ' +
        'stream gives an exactly-once delta, so the SCD2 apply is incremental and idempotent.',
    },
  ];

  /* ── Debug — real SCD2 traps ────────────────────────────────────────── */
  const DEBUG = [
    {
      kind: 'fix',
      title: 'Overlapping validity windows',
      brief: 'This build set valid_to to the NEXT change date itself (inclusive), so on a change date TWO ' +
        'versions satisfy BETWEEN valid_from AND valid_to — an as-of query would return duplicates. Fix the ' +
        'build so windows never overlap (use the day before the next change). Return the full dimension ordered ' +
        'by customer_sk.',
      spec: {
        task: 'Return the full SCD2 dimension (customer_sk, customer_id, full_name, country, segment, ' +
          'loyalty_tier, valid_from, valid_to, is_current) with NON-overlapping windows. Order by customer_sk.',
        ordered: true,
        starter:
          '-- BUG: valid_to = the next effective_date (inclusive) => windows touch/overlap\n' +
          'SELECT\n' +
          '  ROW_NUMBER() OVER (ORDER BY customer_id, effective_date) AS customer_sk,\n' +
          '  customer_id, full_name, country, segment, loyalty_tier,\n' +
          '  effective_date AS valid_from,\n' +
          "  COALESCE(\n" +
          '    LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date),\n' +
          "    '9999-12-31'\n" +
          '  ) AS valid_to,\n' +
          '  CASE WHEN LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date)\n' +
          '       IS NULL THEN 1 ELSE 0 END AS is_current\n' +
          'FROM src_customer_feed\n' +
          'ORDER BY customer_sk;',
        solution:
          'SELECT\n' +
          '  ROW_NUMBER() OVER (ORDER BY customer_id, effective_date) AS customer_sk,\n' +
          '  customer_id, full_name, country, segment, loyalty_tier,\n' +
          '  effective_date AS valid_from,\n' +
          "  COALESCE(\n" +
          "    date(LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date), '-1 day'),\n" +
          "    '9999-12-31'\n" +
          '  ) AS valid_to,\n' +
          '  CASE WHEN LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date)\n' +
          '       IS NULL THEN 1 ELSE 0 END AS is_current\n' +
          'FROM src_customer_feed\n' +
          'ORDER BY customer_sk;',
        hint: "Wrap the LEAD in date(…, '-1 day') so each version ends the day before the next one begins.",
      },
      lesson:
        '<p><strong>Closed vs half-open intervals.</strong> If valid_to equals the next version\'s valid_from, ' +
        'the change date belongs to both versions and <code>BETWEEN valid_from AND valid_to</code> returns two ' +
        'rows. Two safe conventions: end the window the day before the next change (closed interval, what we do ' +
        'here), or store an exclusive valid_to and query with <code>valid_from &lt;= d AND d &lt; valid_to</code> ' +
        '(half-open).</p>' +
        '<p><strong>Interview framing:</strong> "I pick one interval convention and keep it everywhere. I like ' +
        'half-open [valid_from, valid_to) because it never overlaps and needs no date arithmetic; if I use a ' +
        'closed interval I set valid_to to the day before the next change. Then an as-of query returns exactly ' +
        'one version per key."</p>',
    },
    {
      kind: 'fix',
      title: 'Every customer should have exactly one current row',
      brief: 'This build flags is_current by comparing to the GLOBAL latest effective_date, so only the single ' +
        'most-recently-changed customer is marked current and everyone else has zero current rows. Fix it so ' +
        'each customer\'s latest version is current. Return the full dimension ordered by customer_sk.',
      spec: {
        task: 'Return the full SCD2 dimension (same columns as the backfill) where is_current = 1 for exactly ' +
          'one version per customer (their latest). Order by customer_sk.',
        ordered: true,
        starter:
          '-- BUG: is_current compares to the GLOBAL max date, not the per-customer max\n' +
          'SELECT\n' +
          '  ROW_NUMBER() OVER (ORDER BY customer_id, effective_date) AS customer_sk,\n' +
          '  customer_id, full_name, country, segment, loyalty_tier,\n' +
          '  effective_date AS valid_from,\n' +
          "  COALESCE(\n" +
          "    date(LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date), '-1 day'),\n" +
          "    '9999-12-31'\n" +
          '  ) AS valid_to,\n' +
          '  CASE WHEN effective_date = (SELECT MAX(effective_date) FROM src_customer_feed)\n' +
          '       THEN 1 ELSE 0 END AS is_current\n' +
          'FROM src_customer_feed\n' +
          'ORDER BY customer_sk;',
        solution:
          'SELECT\n' +
          '  ROW_NUMBER() OVER (ORDER BY customer_id, effective_date) AS customer_sk,\n' +
          '  customer_id, full_name, country, segment, loyalty_tier,\n' +
          '  effective_date AS valid_from,\n' +
          "  COALESCE(\n" +
          "    date(LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date), '-1 day'),\n" +
          "    '9999-12-31'\n" +
          '  ) AS valid_to,\n' +
          '  CASE WHEN LEAD(effective_date) OVER (PARTITION BY customer_id ORDER BY effective_date)\n' +
          '       IS NULL THEN 1 ELSE 0 END AS is_current\n' +
          'FROM src_customer_feed\n' +
          'ORDER BY customer_sk;',
        hint: '"Current" is per-customer: the version with no later change. Use LEAD(...) IS NULL within each ' +
          'customer partition, not a comparison to the global MAX(effective_date).',
      },
      lesson:
        '<p><strong>Partition scope.</strong> "The current version" is defined per business key, so the test ' +
        'must be per partition. Comparing to a single global <code>MAX(effective_date)</code> marks only one ' +
        'customer current and leaves the rest with none — breaking every "current customers" query.</p>' +
        '<p><strong>Interview framing:</strong> "is_current is a per-key property. I derive it from ' +
        '<code>LEAD(...) OVER (PARTITION BY business_key ...)</code> being NULL, and I add a data test that ' +
        'asserts exactly one is_current row per key — if that ever breaks, the SCD2 apply has a bug."</p>',
    },
    {
      kind: 'investigate',
      title: 'Two "current" rows appear after the nightly SCD2 load',
      scenario: {
        id: 'proj-scd2-twocurrent',
        area: 'project-scd2',
        symptom: 'A dashboard that filters WHERE is_current suddenly shows some customers twice. The nightly ' +
          'SCD2 load "succeeded". Each duplicated customer has two rows with is_current = TRUE and overlapping windows.',
        steps: [
          {
            prompt: 'Two current rows per key — where do you look first?',
            evidence: 'A quick GROUP BY customer_id HAVING COUNT(*) FILTER (is_current) > 1 pinpoints the broken keys.',
            insight: 'Confirm the invariant break (one current row per key) before theorising about causes.',
            choices: [
              { text: 'Query the dimension for customer_ids with more than one is_current row, and inspect their windows.', correct: true,
                why: 'Confirms exactly which keys broke and whether old versions failed to expire — the fastest lead.' },
              { text: 'Tell the BI team to add SELECT DISTINCT and move on.', correct: false,
                why: 'That hides a real data-integrity bug; totals and joins are still wrong underneath.' },
              { text: 'Truncate and fully rebuild the dimension every night from now on.', correct: false,
                why: 'A nightly full rebuild is a costly workaround that abandons incremental loading instead of fixing it.' },
            ],
          },
          {
            prompt: 'The apply logic is a SINGLE MERGE keyed on customer_id that, WHEN MATCHED, inserts the new ' +
              'version, and otherwise does nothing. Old rows are never expired. Why does one MERGE fall short here?',
            evidence: 'A MERGE matches each target row at most once and takes one action per matched row.',
            insight: 'SCD2 needs two actions on the same key — expire the old row AND insert a new one — which one MERGE pass cannot do.',
            choices: [
              { text: 'SCD2 needs two actions for one key (expire the old row AND insert a new version); a single ' +
                  'MERGE pass acts once per matched row, so it can\'t do both.', correct: true,
                why: 'Exactly — that\'s why the old current row is never closed and you end up with two current rows.' },
              { text: 'MERGE is just slower than INSERT; the duplicates are a timeout artifact.', correct: false,
                why: 'This is a logic error, not performance; the duplicates are deterministic, not a timeout.' },
              { text: 'The warehouse was too small, so the UPDATE half was skipped.', correct: false,
                why: 'Warehouse size never silently skips part of a statement; the logic simply never expired old rows.' },
            ],
          },
          {
            prompt: 'What\'s the correct, idempotent fix?',
            evidence: 'The expire and the insert are distinct actions and must both run for a changed key.',
            insight: 'Either run expire then insert as two statements, or stage two rows per change so one MERGE can match-expire and insert.',
            choices: [
              { text: 'Expire matched current rows (UPDATE valid_to + is_current = FALSE) and THEN insert the new ' +
                  'versions — or stage two rows per change so a single MERGE can both match-expire and insert; ' +
                  'drive it from a stream so re-runs are idempotent.', correct: true,
                why: 'Restores exactly one current row per key and makes the load safe to re-run.' },
              { text: 'Add DISTINCT to the MERGE source so only one row per key is inserted.', correct: false,
                why: 'DISTINCT doesn\'t expire the old current row; you\'d still have two current versions.' },
              { text: 'Delete the older version entirely whenever a new one arrives.', correct: false,
                why: 'Deleting history defeats the purpose of SCD2 — you lose the point-in-time record.' },
            ],
          },
        ],
        rootCause: 'SCD2 requires two actions for a changed key — expire the old current row and insert the new ' +
          'version — but the apply used one MERGE that only inserted, so old rows were never expired and two ' +
          'is_current rows accumulated.',
        resolution: 'Split the apply into expire (UPDATE the matched current row: set valid_to and is_current = ' +
          'FALSE) and insert (the new current version); or stage two rows per change so one MERGE can match-expire ' +
          'and insert. Backfill-fix the already-duplicated keys by closing the older of each pair.',
        prevention: 'Add a test asserting exactly one is_current row per business key; drive the apply from a ' +
          'Stream so it processes each change once and re-runs idempotently.',
        interviewAnswer: 'SCD2 is two actions on one key — expire plus insert — and a single MERGE pass acts once ' +
          'per matched row, so the one-MERGE version never closed the old row and left two current rows. I\'d ' +
          'expire matched current rows then insert the new versions (or stage two rows per change for one MERGE), ' +
          'drive it from a stream for idempotency, and add a one-current-row-per-key test so it can\'t regress.',
      },
    },
  ];

  /* ── Interview discussion ───────────────────────────────────────────── */
  const QA = [
    { difficulty: 'easy',
      q: 'What is a slowly changing dimension, and how do Type 1, Type 2 and Type 3 differ?',
      a: 'A dimension whose attributes change over time. Type 1 overwrites the old value (no history). Type 2 ' +
         'keeps history by adding a new versioned row (valid_from/valid_to/is_current), so facts can join to the ' +
         'value that was true at event time. Type 3 keeps a limited history in extra columns (e.g. previous_value), ' +
         'good for one-step "before/after" comparisons. Type 2 is the default when you need full point-in-time truth.' },
    { difficulty: 'medium',
      q: 'Why is a surrogate key essential specifically for SCD Type 2?',
      a: 'Because the same business key (customer_id) now maps to several rows — one per version. The surrogate ' +
         'key uniquely identifies a version, so a fact can point at the exact version that was current when the ' +
         'event happened. Without it you couldn\'t join a fact to the correct historical attributes.' },
    { difficulty: 'medium',
      q: 'What do valid_from, valid_to and is_current represent, and do you really need all three?',
      a: 'valid_from/valid_to bound the interval a version was in effect; is_current flags the open version. ' +
         'is_current is redundant (it equals valid_to = 9999-12-31 or NULL) but it makes "current customers" ' +
         'queries simple and index/prune-friendly, so most designs keep it and assert it stays consistent with ' +
         'the window.' },
    { difficulty: 'medium',
      q: 'How do you write a historically-correct "as of" query?',
      a: 'Filter to the version whose window contains the date: WHERE as_of BETWEEN valid_from AND valid_to (closed ' +
         'interval) or valid_from <= as_of AND as_of < valid_to (half-open). With non-overlapping windows that ' +
         'returns exactly one version per business key. To join a fact to history, join on business key AND the ' +
         'fact\'s event date falling inside the window.' },
    { difficulty: 'medium',
      q: 'How do you decide whether a row actually changed (and avoid creating no-op versions)?',
      a: 'Hash the tracked columns (e.g. HASH/MD5 over the attributes you version) and compare the incoming hash ' +
         'to the current version\'s hash. Create a new version only when the hashes differ or the key is new. This ' +
         'avoids churning versions when untracked columns move or the source resends identical rows.' },
    { difficulty: 'hard',
      q: 'Why can\'t you implement SCD2 with a single MERGE, and what\'s the standard pattern?',
      a: 'A MERGE matches each target row at most once and performs one action for it, but SCD2 needs two actions ' +
         'for a changed key: expire the old current row and insert a new version. The standard fixes are (a) two ' +
         'statements — UPDATE to expire, then INSERT the new version; or (b) stage two rows per change (one with ' +
         'the business key to match-and-expire, one with a null key to force the insert) so a single MERGE can do both.' },
    { difficulty: 'hard',
      q: 'How do you keep the SCD2 load idempotent so reprocessing a batch doesn\'t create duplicates?',
      a: 'Drive it from a Stream (each change consumed once) or key the apply on the row hash so re-applying an ' +
         'already-processed change is a no-op. Guard the insert with a "not already current with this hash" check, ' +
         'and assert one is_current row per key after the load. Then a replay or retry converges to the same state.' },
    { difficulty: 'hard',
      q: 'A change arrives out of order (an older effective_date after a newer one). What breaks and how do you handle it?',
      a: 'A naive "expire current, insert new" would wrongly supersede the newer version. Handle it by rebuilding ' +
         'the affected key\'s timeline from all its changes ordered by effective_date (recomputing valid_from/' +
         'valid_to/is_current), rather than only appending. That\'s why the windowed reconstruction (LEAD over ' +
         'effective_date) is a robust backfill/repair tool, not just an initial load.' },
    { difficulty: 'medium',
      q: 'When would you choose SCD Type 1 (overwrite) instead of Type 2 for an attribute?',
      a: 'When history has no analytical value or a correction should apply retroactively — e.g. fixing a ' +
         'misspelled name, or an attribute nobody slices history by. You can even mix types per column in one ' +
         'dimension (Type 1 for corrections, Type 2 for business-meaningful changes like segment or tier).' },
    { difficulty: 'hard',
      q: 'How do you make SCD2 queries perform well on a large dimension in Snowflake?',
      a: 'Cluster or naturally order the table on the business key (and often valid_from) so as-of predicates ' +
         'prune micro-partitions; keep is_current for cheap "current" filters; avoid functions on valid_from/' +
         'valid_to in predicates so pruning still works; and let Streams+Tasks apply only deltas so the table ' +
         'grows by real changes, not full reloads.' },
  ];

  /* ── Assemble the spec ──────────────────────────────────────────────── */
  const SPEC = {
    id: 'project-scd2',
    eyebrow: '🏗️ Project · End-to-end',
    title: 'Slowly-Changing Dimensions (Type 2), End to End',
    lead: 'Lumen\'s customers change over time — they upgrade loyalty tiers, move countries, switch from consumer ' +
      'to business. The warehouse has to answer "<em>what was true then?</em>", not just "what\'s true now". You\'ll ' +
      'build an <strong>SCD Type 2</strong> customer dimension from a change feed: version every change with a ' +
      'validity window and a current flag, answer point-in-time questions, and apply changes the way Snowflake ' +
      'really does it — hash-detect, expire-and-insert, driven by Streams and Tasks.',
    meta: {
      role: 'Analytics Engineer', difficulty: 'Intermediate–Advanced', duration: '45–60 min',
      skills: ['SCD Type 2', 'Surrogate keys', 'Validity windows', 'LEAD / windowing', 'Change detection (hash)', 'MERGE', 'Streams & Tasks'],
    },
    goals: [
      'Model an SCD2 dimension (surrogate key, business key, valid_from/valid_to, is_current, row_hash)',
      'Backfill full history from a change feed with window functions',
      'Write historically-correct point-in-time (as-of) queries',
      'Detect real changes with a row hash and apply them with expire + insert',
      'Automate the apply with Streams, Tasks and an idempotent MERGE pattern',
      'Fix the classic SCD2 bugs: overlapping windows, wrong current flag, two current rows',
    ],
    diagram: { caption: 'How a change becomes a new version — and the versioned timeline it produces.', svg: DIAGRAM_SVG },
    seedNote: 'One file: a customer change feed. Download it to follow along, or just read the preview — the same ' +
      'rows seed every runnable step, so your SCD2 reconstruction is checked against real results.',
    datasets: DATASETS,
    build: BUILD,
    debug: DEBUG,
    qa: QA,
  };

  P.Modules.projectScd2 = {
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
