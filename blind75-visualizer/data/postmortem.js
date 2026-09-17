/*
 * postmortem.js — data for the "Interview Postmortem" tab.
 *
 * Rosetta compares SYNTAX across dialects. Postmortem is the layer above it:
 * how to DISSECT an interview question. Each entry is a reusable *pattern* (not a
 * single problem) that unites the SQL and PySpark question banks — how to spot it
 * from the interviewer's words, the approach to say out loud, the SQL-vs-PySpark
 * shape side by side, and the do's / don'ts that separate a hire from a no-hire.
 *
 * PILOT: one fully-authored pattern (sessionization) so the format can be
 * reviewed before the rest are written. Schema per pattern:
 *   { id, title, group, difficulty,
 *     aka:      [string],            // other phrasings the same pattern hides behind
 *     tells:    [string],            // how to recognize it (the interviewer's words)
 *     keyIdea:  string,             // the one-sentence mental model
 *     approach: [string],            // the ordered plan you narrate
 *     code:     { sql, spark },      // the same shape in both stacks, side by side
 *     cost:     string,             // one line on shuffle / complexity / risk
 *     dos:      [string],
 *     donts:    [string],
 *     followUps:[ { q, a } ] }       // the pile-on questions + a one-line answer
 *
 * Loaded before js/postmortem.js.
 */
window.POSTMORTEM = {
  // Canonical group order for the category filter. Only groups that actually have
  // a pattern show a chip, so the pilot renders just "Time-Series & Sessionization".
  groups: [
    "Windowing & Ordering",
    "Aggregation & Grouping",
    "Joins & Matching",
    "Ranking & Deduplication",
    "Time-Series & Sessionization",
    "Gaps, Islands & Streaks",
    "Reshaping & Pivots",
    "Data Quality & Nulls"
  ],

  patterns: [
    {
      id: "sessionization",
      title: "Sessionization — cut an event stream into sessions",
      group: "Time-Series & Sessionization",
      difficulty: "Hard",
      aka: [
        "“new session after 30 minutes of inactivity”",
        "gap-based sessions",
        "assign a session id per user",
        "clickstream / activity sessions"
      ],
      tells: [
        "The data is one row per <b>event</b> (a <code>user_id</code> + a <code>timestamp</code>) and they want it grouped into <b>sessions</b>.",
        "Any threshold phrased as <b>inactivity</b>: “a new session starts after 30 minutes with no activity”.",
        "Follow-on asks about <b>sessions per user</b>, <b>session duration</b>, or <b>events per session</b> — all of which need a session id first."
      ],
      keyIdea:
        "A session boundary is just “the gap to the previous event is too big.” Flag those boundaries with a 0/1, then a <b>running sum</b> of that flag over the same ordered window turns the boundaries into a stable session number.",
      approach: [
        "Order each user's events by time: one window <code>partitionBy(user).orderBy(time)</code> does the whole job.",
        "Look back one row with <code>LAG(time)</code> to get the previous event's timestamp (it is <b>null</b> on the user's first event).",
        "Compute the gap in seconds and mark a <b>new-session flag = 1</b> when the previous time is null <i>or</i> the gap &gt; 1800s, else 0.",
        "Running-<code>SUM</code> that flag over the <b>same</b> ordered window → a session id that increments 1, 1, 2, 2, … per user.",
        "Only now group by <code>(user, session_id)</code> for whatever they actually asked (count, duration, first/last event)."
      ],
      code: {
        sql:
          "-- one window does everything; flag boundaries, then running-sum them\n" +
          "WITH flagged AS (\n" +
          "  SELECT user_id, event_type, event_time,\n" +
          "         CASE\n" +
          "           WHEN LAG(event_time) OVER w IS NULL              -- first event\n" +
          "             THEN 1\n" +
          "           WHEN event_time                                  -- gap > 30 min\n" +
          "                > LAG(event_time) OVER w + INTERVAL '30' MINUTE\n" +
          "             THEN 1\n" +
          "           ELSE 0\n" +
          "         END AS is_new_session\n" +
          "  FROM events\n" +
          "  WINDOW w AS (PARTITION BY user_id ORDER BY event_time)\n" +
          ")\n" +
          "SELECT user_id, event_type, event_time,\n" +
          "       SUM(is_new_session) OVER (\n" +
          "         PARTITION BY user_id ORDER BY event_time\n" +
          "         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n" +
          "       ) AS session_id\n" +
          "FROM flagged;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w = (Window\n" +
          "     .partitionBy('user_id')          # one user's events together\n" +
          "     .orderBy('event_time'))          # in chronological order\n" +
          "\n" +
          "prev_ts  = F.lag('event_time').over(w)                 # null on first event\n" +
          "gap_secs = F.col('event_time').cast('long') - prev_ts.cast('long')\n" +
          "\n" +
          "sessions = (events\n" +
          "    .withColumn('is_new_session',\n" +
          "        F.when(prev_ts.isNull() | (gap_secs > 1800), 1) # first OR gap > 1800s\n" +
          "         .otherwise(0))\n" +
          "    .withColumn('session_id',\n" +
          "        F.sum('is_new_session').over(w)))               # running sum -> 1,1,2,2\n" +
          "sessions.show()"
      },
      cost:
        "One <b>wide</b> shuffle: hash by <code>user_id</code>, sort by <code>event_time</code>, then a single sequential pass. The <code>lag</code> and the running <code>sum</code> reuse the <b>same</b> window spec, so there is no second exchange. The only real risk is <b>skew</b> — one hyper-active user becomes a giant partition sorted on a single core.",
      dos: [
        "State the window out loud first: <i>“per user, ordered by time.”</i>",
        "Handle the first event explicitly — <code>LAG</code> is null there, so force it to start session 1.",
        "Pin the unit: 30 minutes is <b>1800 seconds</b>; cast timestamps to epoch (or use an <code>INTERVAL</code>) before comparing.",
        "Use the <b>same</b> ordered window for the numbering sum so its frame is <code>UNBOUNDED PRECEDING → CURRENT ROW</code>.",
        "Add a deterministic tie-breaker to <code>ORDER BY</code> (e.g. an event id) when timestamps can collide."
      ],
      donts: [
        "Don't self-join the table to find each “previous” event — it's O(n²) and signals you don't know window functions.",
        "Don't drop <code>PARTITION BY user_id</code> — a global order interleaves different users' events.",
        "Don't <code>collect()</code> to the driver and loop in Python to walk events — it defeats Spark and won't scale.",
        "Don't total an <b>unordered</b> sum — without <code>ORDER BY</code> it sums the whole partition and every row gets the same number.",
        "Don't assume the input arrives sorted — order it explicitly."
      ],
      followUps: [
        { q: "“Now count the sessions per user.”",
          a: "Group by user and take <code>MAX(session_id)</code> (it equals the count because the running sum steps by exactly 1 per session); <code>COUNT(DISTINCT session_id)</code> is the safe general form." },
        { q: "“Average session length?”",
          a: "Per <code>(user, session_id)</code> take <code>MAX(time) - MIN(time)</code>, then average those durations." },
        { q: "“What if the gap threshold is a parameter?”",
          a: "Keep 1800 in a variable, not a literal, and pass it in — shows you separate the pattern from the constant." },
        { q: "“How does this scale to billions of events?”",
          a: "It's one shuffle by user; the bottleneck is a skewed power-user partition. Mention salting or a secondary key if a single user is enormous." }
      ]
    },

    // ============================================ Windowing & Ordering ========
    {
      id: "running-total",
      title: "Running / cumulative total",
      group: "Windowing & Ordering",
      difficulty: "Medium",
      aka: [
        "'running total'", "'cumulative sum'", "'balance over time'", "'to-date revenue'"
      ],
      tells: [
        "They want a total that <b>grows row by row</b> in a time/order sequence, not one number per group.",
        "Words like <b>running</b>, <b>cumulative</b>, <b>to-date</b>, or <b>累计</b> alongside an ordering column.",
        "Output keeps every input row (a column is <i>added</i>) rather than collapsing to one row per key — that's the tell it's a window, not a <code>GROUP BY</code>."
      ],
      keyIdea:
        "A running total is an <b>ordered</b> window <code>SUM</code> whose frame is <code>UNBOUNDED PRECEDING → CURRENT ROW</code>. Partition by the entity, order by time, and the sum accumulates down the partition.",
      approach: [
        "Decide the partition (per customer? global?) and the order column (date/timestamp).",
        "Build the window <code>partitionBy(entity).orderBy(time)</code>.",
        "Apply <code>SUM(amount)</code> over it — an <b>ordered</b> aggregate defaults to the cumulative frame.",
        "State the frame explicitly (<code>ROWS UNBOUNDED PRECEDING → CURRENT ROW</code>) so a reviewer sees you know it."
      ],
      code: {
        sql:
          "SELECT customer_id, order_date, amount,\n" +
          "       SUM(amount) OVER (\n" +
          "         PARTITION BY customer_id ORDER BY order_date\n" +
          "         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n" +
          "       ) AS running_total\n" +
          "FROM orders;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w = (Window.partitionBy('customer_id')\n" +
          "           .orderBy('order_date')\n" +
          "           .rowsBetween(Window.unboundedPreceding, Window.currentRow))\n" +
          "\n" +
          "running = orders.withColumn('running_total', F.sum('amount').over(w))\n" +
          "running.show()"
      },
      cost:
        "One <b>wide</b> shuffle (hash by the partition key, sort by the order key), then a single pass. No <code>ORDER BY</code> on the window turns it into a whole-partition total — a silent correctness bug, not an error.",
      dos: [
        "Order the window — the cumulative behavior comes entirely from <code>ORDER BY</code>.",
        "Say the frame out loud: <code>UNBOUNDED PRECEDING</code> to <code>CURRENT ROW</code>.",
        "Add a tie-breaker to the order when the sort column can repeat, so the accumulation is deterministic."
      ],
      donts: [
        "Don't use <code>GROUP BY</code> — that collapses rows; a running total must keep every row.",
        "Don't leave the window unordered — you'll get the grand total on every row.",
        "Don't self-join 'all earlier rows' to sum them — O(n²) versus one ordered pass."
      ],
      followUps: [
        { q: "'Make it a running average instead.'",
          a: "Same window, swap <code>SUM</code> for <code>AVG</code> — the frame does the accumulating." },
        { q: "'Reset it each month.'",
          a: "Add the period to the partition: <code>partitionBy(customer_id, month)</code>." },
        { q: "'Only count the last 3 orders.'",
          a: "Bound the frame: <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code>." }
      ]
    },

    {
      id: "lag-lead-delta",
      title: "Period-over-period delta & % change (lag / lead)",
      group: "Windowing & Ordering",
      difficulty: "Medium",
      aka: [
        "'compared to the previous ...'", "'month-over-month'", "'day-over-day'", "'growth vs last period'"
      ],
      tells: [
        "A comparison of each row to the <b>previous</b> (or next) row in an ordered sequence.",
        "Phrases: <b>MoM</b> / <b>YoY</b>, <b>change since last</b>, <b>difference from prior</b>, <b>% growth</b>.",
        "The answer needs <i>two rows at once</i> — current and neighbor — which is exactly what <code>LAG</code>/<code>LEAD</code> give."
      ],
      keyIdea:
        "<code>LAG(x)</code> pulls the previous row's value into the current row over an ordered window; subtract for a delta, divide by the previous value for a percent change. The <b>first</b> row per partition has a null neighbor.",
      approach: [
        "Window <code>partitionBy(entity).orderBy(period)</code>.",
        "Previous value: <code>LAG(metric)</code> over that window.",
        "Delta = current − previous; % change = 100 × delta / previous.",
        "Guard the divide: previous is null on the first row and could be zero."
      ],
      code: {
        sql:
          "SELECT customer_id, order_date, amount,\n" +
          "       amount - LAG(amount) OVER w AS delta,\n" +
          "       ROUND(100.0 * (amount - LAG(amount) OVER w)\n" +
          "             / NULLIF(LAG(amount) OVER w, 0), 2) AS pct_change\n" +
          "FROM orders\n" +
          "WINDOW w AS (PARTITION BY customer_id ORDER BY order_date);",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w    = Window.partitionBy('customer_id').orderBy('order_date')\n" +
          "prev = F.lag('amount').over(w)                     # null on the first row\n" +
          "\n" +
          "out = (orders\n" +
          "    .withColumn('delta', F.col('amount') - prev)\n" +
          "    .withColumn('pct_change',\n" +
          "        F.round(100 * (F.col('amount') - prev)\n" +
          "                / F.when(prev == 0, None).otherwise(prev), 2)))\n" +
          "out.show()"
      },
      cost:
        "One ordered window = one <b>wide</b> shuffle + sort, then a single pass. <code>LAG</code>/<code>LEAD</code> are cheap look-backs within the sorted partition; reusing the same window spec for delta and % change shares the shuffle.",
      dos: [
        "Handle the first row — its <code>LAG</code> is null, so delta/pct are legitimately null.",
        "Protect the division with <code>NULLIF(prev, 0)</code> (SQL) / a <code>when(prev==0)</code> guard (PySpark).",
        "Use <code>LAG(x, 12)</code> for year-over-year on monthly data — the offset is an argument."
      ],
      donts: [
        "Don't self-join the table to itself on <code>date = date - 1</code> — brittle with gaps and O(n²).",
        "Don't forget <code>PARTITION BY</code> — without it you compare across unrelated entities.",
        "Don't divide by a raw previous value — a zero prior period yields div-by-zero or infinity."
      ],
      followUps: [
        { q: "'Year-over-year instead of month-over-month.'",
          a: "Offset the lag: <code>LAG(metric, 12)</code> on monthly rows." },
        { q: "'What if some months are missing?'",
          a: "<code>LAG</code> compares adjacent <i>rows</i>, not calendar periods — densify the calendar (a date spine) first if true gaps matter." },
        { q: "'Compare to the next period too.'",
          a: "Use <code>LEAD</code> with the same window." }
      ]
    },

    {
      id: "rolling-window",
      title: "Rolling / moving window (N-day average)",
      group: "Windowing & Ordering",
      difficulty: "Hard",
      aka: [
        "'7-day moving average'", "'trailing 30 days'", "'rolling count'", "'smoothed trend'"
      ],
      tells: [
        "A metric over a <b>sliding</b> window of the last N rows or last N <b>days</b>.",
        "Words: <b>moving average</b>, <b>rolling</b>, <b>trailing</b>, <b>window of 7/30</b>.",
        "The subtle fork: 'last 7 <b>rows</b>' (record count) vs 'last 7 <b>days</b>' (calendar span, gaps included)."
      ],
      keyIdea:
        "It's a window aggregate with a <b>bounded frame</b>. <code>ROWS BETWEEN 6 PRECEDING AND CURRENT ROW</code> counts records; <code>RANGE</code> over an epoch/day value counts calendar distance — pick the one the question means.",
      approach: [
        "Clarify rows vs calendar days — they differ whenever dates are missing or duplicated.",
        "Order the window by the time column.",
        "ROWS frame for a fixed record count; RANGE frame (over a numeric/epoch order key) for a true time span.",
        "Aggregate (<code>AVG</code>/<code>SUM</code>/<code>COUNT</code>) over that bounded frame."
      ],
      code: {
        sql:
          "-- last 7 RECORDS (rows frame)\n" +
          "SELECT store_id, sale_date, sales,\n" +
          "       AVG(sales) OVER (\n" +
          "         PARTITION BY store_id ORDER BY sale_date\n" +
          "         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\n" +
          "       ) AS ma_7row\n" +
          "FROM daily_sales;\n" +
          "\n" +
          "-- last 7 CALENDAR DAYS (range frame, dialect-dependent interval)\n" +
          "-- ... ORDER BY sale_date RANGE BETWEEN INTERVAL '6' DAY PRECEDING AND CURRENT ROW",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "# 7 ROWS: the last 7 records regardless of gaps\n" +
          "w_rows = (Window.partitionBy('store_id').orderBy('sale_date')\n" +
          "          .rowsBetween(-6, 0))\n" +
          "ma_rows = daily_sales.withColumn('ma_7row', F.avg('sales').over(w_rows))\n" +
          "\n" +
          "# 7 CALENDAR DAYS: rangeBetween over epoch-seconds\n" +
          "day = 86400\n" +
          "w_time = (Window.partitionBy('store_id')\n" +
          "          .orderBy(F.col('sale_date').cast('timestamp').cast('long'))\n" +
          "          .rangeBetween(-6 * day, 0))\n" +
          "ma_time = daily_sales.withColumn('ma_7d', F.avg('sales').over(w_time))"
      },
      cost:
        "Still one shuffle + sort per window. A <code>RANGE</code> frame needs a <b>numeric</b> order key (cast the date to epoch), which trips people up. Bounded frames are otherwise as cheap as the cumulative one.",
      dos: [
        "Pin down rows vs days before writing anything — it changes the answer.",
        "For a calendar window, order by an epoch/numeric column so <code>RANGE</code> works.",
        "Mention edge behavior: early rows average fewer than N values (a partial window)."
      ],
      donts: [
        "Don't use a <code>ROWS</code> frame when the data has missing dates but they asked for calendar days.",
        "Don't <code>rangeBetween</code> on a raw date/timestamp column in Spark — cast to long first.",
        "Don't recompute with a correlated subquery per row — that's the O(n²) trap a window frame exists to kill."
      ],
      followUps: [
        { q: "'Center the window instead of trailing.'",
          a: "Make the frame symmetric: <code>ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING</code>." },
        { q: "'Only emit once the window is full.'",
          a: "Null out rows where the count over the frame is < N (compute <code>COUNT</code> over the same frame and filter)." },
        { q: "'Rolling distinct users, not a sum.'",
          a: "Distinct is not a windowable aggregate — pre-aggregate to daily distinct, then roll, or use approx structures." }
      ]
    },

    {
      id: "share-of-total",
      title: "Share of total (percent of whole)",
      group: "Windowing & Ordering",
      difficulty: "Medium",
      aka: [
        "'percent of total'", "'contribution to revenue'", "'% of grand total'", "'weight within group'"
      ],
      tells: [
        "Each row's value expressed as a <b>fraction of an aggregate</b> — the whole, or its group.",
        "Words: <b>share</b>, <b>percent of total</b>, <b>contribution</b>, <b>proportion</b>.",
        "You need both the detail row <i>and</i> a total on the same line — a window sum as the denominator."
      ],
      keyIdea:
        "Put the total in a <b>window</b> so it rides alongside each row: <code>value / SUM(value) OVER ()</code> for the grand total, or <code>OVER (PARTITION BY group)</code> for a within-group share — no self-join, no subquery.",
      approach: [
        "Identify the denominator: grand total (empty <code>OVER ()</code>) or per-group (<code>PARTITION BY group</code>).",
        "Compute the windowed total with no <code>ORDER BY</code> (you want the whole partition, not a running sum).",
        "Divide the row value by it; multiply by 100 and round for a percentage.",
        "Guard against a zero/empty denominator."
      ],
      code: {
        sql:
          "SELECT region, category, revenue,\n" +
          "       ROUND(100.0 * revenue / SUM(revenue) OVER (), 2)              AS pct_of_total,\n" +
          "       ROUND(100.0 * revenue / SUM(revenue) OVER (PARTITION BY region), 2) AS pct_of_region\n" +
          "FROM category_revenue;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w_all    = Window.partitionBy()            # whole DataFrame -> grand total\n" +
          "w_region = Window.partitionBy('region')    # per-region total\n" +
          "\n" +
          "out = (cat_rev\n" +
          "    .withColumn('pct_of_total',\n" +
          "        F.round(100 * F.col('revenue') / F.sum('revenue').over(w_all), 2))\n" +
          "    .withColumn('pct_of_region',\n" +
          "        F.round(100 * F.col('revenue') / F.sum('revenue').over(w_region), 2)))\n" +
          "out.show()"
      },
      cost:
        "An empty <code>OVER ()</code> forces <b>all rows to one partition</b> — a full-data collect that can be a bottleneck on huge inputs; a partitioned share shuffles by group and is fine. No sort is needed (no ordering).",
      dos: [
        "Use an <b>unordered</b> window — ordering would make it a running total, not a total.",
        "Cast to a decimal / multiply by 100.0 so you don't get integer-truncated percentages.",
        "For a whole-table total at scale, consider a broadcast of the single aggregate instead of <code>OVER ()</code>."
      ],
      donts: [
        "Don't add <code>ORDER BY</code> to the denominator window — classic bug that yields a cumulative share.",
        "Don't compute the total in a separate query and cross-join it if a window will do.",
        "Don't ignore the empty/zero-total case — it divides by zero."
      ],
      followUps: [
        { q: "'Rank categories by their share.'",
          a: "Wrap it: order by the share and add <code>RANK()</code>, or just sort descending." },
        { q: "'Cumulative share (Pareto / 80-20).'",
          a: "Combine both frames: a running <code>SUM</code> ordered by value divided by the total <code>SUM OVER ()</code>." },
        { q: "'Why is OVER () slow here?'",
          a: "It collapses every row into one partition; at scale prefer computing the scalar total once and broadcasting it." }
      ]
    },

    // ============================================ Aggregation & Grouping =====
    {
      id: "groupby-having",
      title: "Group aggregate + filter on the aggregate (HAVING)",
      group: "Aggregation & Grouping",
      difficulty: "Easy",
      aka: [
        "'customers with more than 5 orders'", "'groups whose total exceeds ...'", "'only keep buckets where ...'"
      ],
      tells: [
        "One row per group with a computed metric, then <b>keep only the groups</b> that pass a threshold.",
        "The filter is on an <b>aggregate</b> (count/sum/avg), not a raw column.",
        "Words: <b>more than N</b>, <b>at least</b>, <b>whose total/average is ...</b>."
      ],
      keyIdea:
        "<code>WHERE</code> filters rows <b>before</b> grouping; <code>HAVING</code> filters groups <b>after</b>. In PySpark there is no <code>HAVING</code> — you <code>groupBy().agg()</code> then <code>.filter()</code> on the aggregated column.",
      approach: [
        "Push any row-level filters into <code>WHERE</code> first (shrinks the shuffle).",
        "<code>GROUP BY</code> the key and compute the aggregate.",
        "Filter on the aggregate with <code>HAVING</code> (SQL) or a post-agg <code>.filter()</code> (PySpark)."
      ],
      code: {
        sql:
          "SELECT customer_id, COUNT(*) AS orders\n" +
          "FROM orders\n" +
          "GROUP BY customer_id\n" +
          "HAVING COUNT(*) > 5;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "\n" +
          "out = (orders\n" +
          "    .groupBy('customer_id')\n" +
          "    .agg(F.count('*').alias('orders'))\n" +
          "    .filter(F.col('orders') > 5))      # HAVING == filter AFTER the aggregate\n" +
          "out.show()"
      },
      cost:
        "One shuffle for the group-by. Row filters belong in <code>WHERE</code>/pre-agg <code>filter</code> so less data is shuffled; the aggregate filter is applied on the already-small grouped result.",
      dos: [
        "Know the split: <code>WHERE</code> = before grouping, <code>HAVING</code> = after.",
        "Filter raw rows early to shrink the shuffle, then filter aggregates late.",
        "Alias the aggregate so the post-filter reads cleanly."
      ],
      donts: [
        "Don't put an aggregate in <code>WHERE</code> — it isn't computed yet (a syntax error).",
        "Don't filter raw rows in <code>HAVING</code> when <code>WHERE</code> would do it cheaper.",
        "Don't assume PySpark has <code>HAVING</code> — it's just <code>.filter()</code> after <code>.agg()</code>."
      ],
      followUps: [
        { q: "'Also require total spend over 10k.'",
          a: "Add another aggregate and combine conditions: <code>HAVING COUNT(*) > 5 AND SUM(amount) > 10000</code>." },
        { q: "'Why not WHERE COUNT(*) > 5?'",
          a: "The count doesn't exist until after grouping — that's precisely why <code>HAVING</code> exists." }
      ]
    },

    {
      id: "conditional-aggregation",
      title: "Conditional aggregation (SUM/AVG of a CASE)",
      group: "Aggregation & Grouping",
      difficulty: "Medium",
      aka: [
        "'count of X and Y per group in one query'", "'shipped vs cancelled totals'", "'pivot by hand'"
      ],
      tells: [
        "Several metrics per group that each apply to a <b>different subset</b> of rows.",
        "'How many shipped AND how much cancelled per customer' — multiple filters, one output row per group.",
        "A small, known set of categories you want as <b>columns</b> (a manual pivot)."
      ],
      keyIdea:
        "Fold the filter <b>into</b> the aggregate: <code>SUM(CASE WHEN cond THEN 1 ELSE 0 END)</code> counts a subset, <code>AVG(CASE WHEN cond THEN x END)</code> averages one (nulls are skipped by <code>AVG</code>). All metrics compute in a <b>single</b> group-by pass.",
      approach: [
        "List the per-subset metrics you need.",
        "Wrap each in a <code>CASE WHEN</code> / <code>F.when</code> inside the aggregate.",
        "Use <code>ELSE 0</code> for counts/sums; leave <code>ELSE</code> null for averages so they're ignored.",
        "Group once — every conditional metric shares the same shuffle."
      ],
      code: {
        sql:
          "SELECT customer_id,\n" +
          "       SUM(CASE WHEN status = 'shipped'   THEN 1 ELSE 0 END)      AS shipped,\n" +
          "       SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END) AS cancelled_amt,\n" +
          "       AVG(CASE WHEN status = 'shipped'   THEN amount END)        AS avg_shipped_amt\n" +
          "FROM orders\n" +
          "GROUP BY customer_id;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "\n" +
          "out = orders.groupBy('customer_id').agg(\n" +
          "    F.sum(F.when(F.col('status') == 'shipped', 1).otherwise(0)).alias('shipped'),\n" +
          "    F.sum(F.when(F.col('status') == 'cancelled', F.col('amount')).otherwise(0)).alias('cancelled_amt'),\n" +
          "    F.avg(F.when(F.col('status') == 'shipped', F.col('amount'))).alias('avg_shipped_amt'))  # null skipped\n" +
          "out.show()"
      },
      cost:
        "One shuffle for the whole set of metrics — far cheaper than joining several filtered aggregates together. This is also the engine behind a <code>PIVOT</code> when the column set is fixed.",
      dos: [
        "Use <code>ELSE 0</code> for counts/sums and no <code>ELSE</code> for averages (so nulls drop out).",
        "Prefer this over multiple filtered sub-aggregates joined back — one pass beats many.",
        "Name each metric clearly; the column list is the spec."
      ],
      donts: [
        "Don't run N separate filtered queries and join them — that's N shuffles for one answer.",
        "Don't put <code>ELSE 0</code> inside an <code>AVG</code> — the zeros drag the mean down; leave them null.",
        "Don't hand-pivot an <b>open-ended</b> category set — use a real dynamic pivot instead."
      ],
      followUps: [
        { q: "'Turn these into a real pivot.'",
          a: "SQL <code>PIVOT</code> / Spark <code>groupBy(k).pivot('status').agg(...)</code> — same idea, engine writes the CASEs." },
        { q: "'Add a ratio of shipped to total.'",
          a: "Divide the shipped count by <code>COUNT(*)</code> in the same select." }
      ]
    },

    {
      id: "percentiles-median",
      title: "Median & percentiles per group",
      group: "Aggregation & Grouping",
      difficulty: "Hard",
      aka: [
        "'median order value'", "'p90 / p95 latency'", "'quartiles'", "'typical (not average) value'"
      ],
      tells: [
        "They ask for the <b>middle</b> or a <b>tail</b> value — median, p90, p95, quartiles — not the mean.",
        "Often about latency or skewed money data where <b>average lies</b>.",
        "A hint about scale forces the exact-vs-approximate decision."
      ],
      keyIdea:
        "Percentiles need order statistics. SQL uses <code>PERCENTILE_CONT/DISC(p) WITHIN GROUP (ORDER BY x)</code>. Spark's <code>percentile_approx</code> is a cheap one-pass estimate with a bounded error; exact <code>percentile</code> needs a full sort.",
      approach: [
        "Confirm which percentile(s) and whether exact is required.",
        "Group by the key.",
        "Exact: <code>PERCENTILE_CONT</code> (SQL) / <code>percentile</code> (Spark). Approximate at scale: <code>percentile_approx</code> with an accuracy arg.",
        "Return several percentiles in one call by passing an array."
      ],
      code: {
        sql:
          "SELECT group_id,\n" +
          "       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) AS median,\n" +
          "       PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY amount) AS p90\n" +
          "FROM t\n" +
          "GROUP BY group_id;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "\n" +
          "# approximate: one pass, bounded error (last arg = accuracy)\n" +
          "approx = (t.groupBy('group_id')\n" +
          "    .agg(F.expr('percentile_approx(amount, array(0.5, 0.9), 10000)').alias('pcts')))\n" +
          "\n" +
          "# exact: full sort per group (Spark 3.4+ has percentile as an aggregate)\n" +
          "exact = (t.groupBy('group_id')\n" +
          "    .agg(F.expr('percentile(amount, 0.5)').alias('median')))"
      },
      cost:
        "Exact percentiles <b>sort each group</b> — memory-heavy and shuffle-heavy at scale. <code>percentile_approx</code> keeps a bounded sketch and runs in one pass; the accuracy arg trades memory for precision.",
      dos: [
        "Say why median/p95 beats the mean on skewed or latency data.",
        "Default to <code>percentile_approx</code> at scale and state the error you accept.",
        "Fetch multiple percentiles in one call via an array — don't scan per percentile."
      ],
      donts: [
        "Don't fake median with <code>AVG</code> — they're different on skew.",
        "Don't compute exact percentiles on billions of rows without warning about the sort cost.",
        "Don't call <code>percentile_approx</code> once per percentile — pass them together."
      ],
      followUps: [
        { q: "'Quartiles and IQR.'",
          a: "Get p25 and p75, then IQR = p75 − p25; flag outliers beyond 1.5×IQR fences." },
        { q: "'How accurate is percentile_approx?'",
          a: "Error is ~1/accuracy; raise the accuracy arg for tighter estimates at more memory." },
        { q: "'Median with an even count?'",
          a: "<code>PERCENTILE_CONT</code> interpolates between the two middles; <code>PERCENTILE_DISC</code> returns an actual value." }
      ]
    },

    {
      id: "distinct-counting",
      title: "count(*) vs count(col) vs countDistinct",
      group: "Aggregation & Grouping",
      difficulty: "Medium",
      aka: [
        "'how many unique customers'", "'number of non-null values'", "'total rows'", "'cardinality'"
      ],
      tells: [
        "A counting question where <b>nulls</b> or <b>duplicates</b> change the answer.",
        "'Unique' / 'distinct' → dedup; 'how many have a value' → non-null count; 'how many rows' → all rows.",
        "At scale, 'roughly how many uniques' invites an approximate answer."
      ],
      keyIdea:
        "<code>COUNT(*)</code> counts <b>rows</b> (nulls included); <code>COUNT(col)</code> skips nulls; <code>COUNT(DISTINCT col)</code> dedups (a shuffle). <code>approx_count_distinct</code> (HyperLogLog) is near-free at scale for a bounded-error uniques.",
      approach: [
        "Decide: rows, non-null values, or distinct values?",
        "Map to the right function — don't reach for <code>DISTINCT</code> reflexively.",
        "At large scale, offer <code>approx_count_distinct</code> and state the tradeoff.",
        "Remember distinct counts are heavier than plain counts (they dedup)."
      ],
      code: {
        sql:
          "SELECT\n" +
          "  COUNT(*)                    AS rows_total,      -- every row, nulls included\n" +
          "  COUNT(amount)               AS amount_present,  -- non-null amounts only\n" +
          "  COUNT(DISTINCT customer_id) AS unique_customers -- dedup (a shuffle)\n" +
          "FROM orders;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "\n" +
          "out = orders.agg(\n" +
          "    F.count('*').alias('rows_total'),                            # includes nulls\n" +
          "    F.count('amount').alias('amount_present'),                   # skips nulls\n" +
          "    F.countDistinct('customer_id').alias('unique_customers'),    # exact, shuffles\n" +
          "    F.approx_count_distinct('customer_id').alias('approx_uniques'))  # HLL, cheap\n" +
          "out.show()"
      },
      cost:
        "<code>COUNT(*)</code>/<code>COUNT(col)</code> are cheap partial aggregates. <code>COUNT(DISTINCT)</code> must dedup — a shuffle that grows with cardinality. <code>approx_count_distinct</code> keeps a small HLL sketch, so it's near-constant memory.",
      dos: [
        "Match the function to the question — rows vs non-null vs distinct are three different numbers.",
        "Use <code>approx_count_distinct</code> for dashboards / huge cardinality where a small error is fine.",
        "Say out loud that distinct counts shuffle and cost more."
      ],
      donts: [
        "Don't use <code>COUNT(DISTINCT)</code> when a plain <code>COUNT</code> answers the question.",
        "Don't forget <code>COUNT(col)</code> silently drops nulls — that can be the bug or the intent.",
        "Don't quote <code>approx_count_distinct</code> as exact — it carries a small, bounded error."
      ],
      followUps: [
        { q: "'Distinct customers per month.'",
          a: "Group by month, then <code>COUNT(DISTINCT customer_id)</code> — note the per-group dedup cost." },
        { q: "'Count where a condition holds.'",
          a: "<code>COUNT(CASE WHEN cond THEN 1 END)</code> — nulls in the else are skipped." },
        { q: "'How does HLL stay cheap?'",
          a: "It hashes values into a fixed-size sketch and estimates cardinality — memory is independent of the number of uniques." }
      ]
    }
  ]
};
