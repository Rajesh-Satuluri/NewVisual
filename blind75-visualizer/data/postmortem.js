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
    },

    // ============================================ Joins & Matching ===========
    {
      id: "anti-join",
      title: "Anti-join — rows with no match (and the NOT IN trap)",
      group: "Joins & Matching",
      difficulty: "Medium",
      aka: [
        "'customers who never ordered'", "'find the missing ones'", "'exists in A but not B'"
      ],
      tells: [
        "You want rows from one side that have <b>no matching row</b> on the other.",
        "Words: <b>never</b>, <b>no</b>, <b>missing</b>, <b>without a corresponding</b>.",
        "A naive candidate is <code>NOT IN (subquery)</code> — which is a <b>trap</b> when the subquery can return nulls."
      ],
      keyIdea:
        "Use a <b>left anti-join</b> (<code>NOT EXISTS</code> in SQL, <code>how='left_anti'</code> in PySpark): keep left rows with no partner. Prefer it over <code>NOT IN</code>, which returns <b>zero rows</b> the moment the subquery contains a single null.",
      approach: [
        "Identify which side you keep and the join key.",
        "<code>NOT EXISTS</code> (SQL) or <code>join(..., how='left_anti')</code> (PySpark).",
        "If a key can be null, decide intent — anti-join drops nulls sensibly; <code>NOT IN</code> breaks.",
        "Return only the surviving left columns (anti-join brings nothing from the right)."
      ],
      code: {
        sql:
          "-- customers who never placed an order (null-safe)\n" +
          "SELECT c.customer_id, c.name\n" +
          "FROM customers c\n" +
          "WHERE NOT EXISTS (\n" +
          "  SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id\n" +
          ");",
        spark:
          "from pyspark.sql import functions as F\n" +
          "\n" +
          "# keep customers with NO matching order\n" +
          "no_orders = customers.join(orders, on='customer_id', how='left_anti')\n" +
          "no_orders.show()"
      },
      cost:
        "A left anti-join is one shuffle by the key (sort-merge or hash), like any join. <code>NOT EXISTS</code> optimizes to the same anti-join. <code>NOT IN</code> can degrade to a slow correlated form <b>and</b> is semantically wrong with nulls.",
      dos: [
        "Reach for <code>NOT EXISTS</code> / <code>left_anti</code> by default.",
        "Say out loud why <code>NOT IN</code> + a null = zero rows (three-valued logic).",
        "Broadcast the small side if one side is tiny (see the broadcast pattern)."
      ],
      donts: [
        "Don't use <code>NOT IN (subquery)</code> when the subquery column is nullable.",
        "Don't emulate anti-join with a left join + <code>IS NULL</code> filter unless the key is guaranteed non-null on the right.",
        "Don't select right-side columns — an anti-join yields none."
      ],
      followUps: [
        { q: "'Now the orphan orders (order with no customer).'",
          a: "Flip the sides: <code>orders.join(customers, ..., 'left_anti')</code>." },
        { q: "'Why did NOT IN return nothing?'",
          a: "A null in the IN-list makes every <code>NOT IN</code> comparison unknown, so no row qualifies — the classic null trap." },
        { q: "'Count matched vs unmatched together.'",
          a: "Left join once and branch on the right key being null." }
      ]
    },

    {
      id: "self-join",
      title: "Self-join — compare rows within one table",
      group: "Joins & Matching",
      difficulty: "Medium",
      aka: [
        "'earn more than their manager'", "'pairs in the same group'", "'employee and their manager'"
      ],
      tells: [
        "Two rows of the <b>same</b> table need to be compared or paired.",
        "Hierarchies (employee → manager), or pairings (two products bought together).",
        "The answer references the table twice with different roles."
      ],
      keyIdea:
        "Join the table to <b>itself</b> with two aliases, one per role. Hierarchy joins on <code>child.manager_id = parent.emp_id</code>; pair-generation joins on a shared key with <code>a.id &lt; b.id</code> to avoid self-pairs and duplicates.",
      approach: [
        "Alias the table twice (e.g. <code>e</code> and <code>m</code>).",
        "Write the join condition that expresses the relationship (manager link, or shared key).",
        "For unordered pairs, add <code>a.id &lt; b.id</code> to drop self-matches and mirror duplicates.",
        "Select and rename columns from each alias so the output is unambiguous."
      ],
      code: {
        sql:
          "-- employees who earn more than their manager\n" +
          "SELECT e.name AS employee, m.name AS manager\n" +
          "FROM employees e\n" +
          "JOIN employees m ON e.manager_id = m.emp_id\n" +
          "WHERE e.salary > m.salary;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "\n" +
          "e = employees.alias('e')\n" +
          "m = employees.alias('m')\n" +
          "out = (e.join(m, F.col('e.manager_id') == F.col('m.emp_id'))\n" +
          "        .where(F.col('e.salary') > F.col('m.salary'))\n" +
          "        .select(F.col('e.name').alias('employee'),\n" +
          "                F.col('m.name').alias('manager')))\n" +
          "out.show()"
      },
      cost:
        "A self-join is still a join — one shuffle by the join key. Pair generation on a big shared key can <b>explode</b> quadratically (all pairs within a group); keep groups small or bound them.",
      dos: [
        "Alias both sides and qualify every column — ambiguity is the #1 self-join bug.",
        "Use <code>a.id &lt; b.id</code> for unordered pairs (no self-match, no mirror duplicate).",
        "Watch group size for pair generation — it's O(k²) per group."
      ],
      donts: [
        "Don't leave columns unqualified — <code>name</code> is ambiguous across aliases.",
        "Don't use <code>&lt;&gt;</code> instead of <code>&lt;</code> for pairs — that keeps both (a,b) and (b,a).",
        "Don't self-join to walk a deep hierarchy — that needs a recursive CTE / iterative join, not one self-join."
      ],
      followUps: [
        { q: "'Skip-level manager (manager's manager).'",
          a: "Join the table three times, or a recursive CTE for arbitrary depth." },
        { q: "'Count direct reports per manager.'",
          a: "Group the child side by <code>manager_id</code> and count." },
        { q: "'All same-department pairs.'",
          a: "Self-join on <code>department_id</code> with <code>a.emp_id &lt; b.emp_id</code>." }
      ]
    },

    {
      id: "broadcast-skew-join",
      title: "Broadcast join & skew (big × small, hot keys)",
      group: "Joins & Matching",
      difficulty: "Hard",
      aka: [
        "'join a huge fact with a small dimension'", "'the join is slow / one task hangs'", "'skewed key'"
      ],
      tells: [
        "A large fact joined to a <b>small</b> lookup/dimension — you can avoid shuffling the big side.",
        "A join where <b>one task runs forever</b> while the rest finish — classic key skew.",
        "PySpark-flavored performance question about join strategy."
      ],
      keyIdea:
        "If one side fits in memory, <b>broadcast</b> it: Spark ships the small table to every executor and does a map-side join — no shuffle of the big fact. When a single key is <b>hot</b>, <b>salt</b> it: split the hot key into N buckets so its rows spread across tasks.",
      approach: [
        "Is one side small (≤ ~10s of MB)? Broadcast it and skip the big-side shuffle.",
        "Otherwise it's a normal shuffle (sort-merge) join.",
        "If one task lags, suspect skew — confirm with the key distribution.",
        "Salt the hot key (random bucket on the big side, replicate the small side across buckets), join on key+salt."
      ],
      code: {
        sql:
          "-- optimizer hint to broadcast the small dimension (engine-specific)\n" +
          "SELECT /*+ BROADCAST(d) */ f.order_id, f.amount, d.name\n" +
          "FROM fact f\n" +
          "JOIN dim d ON f.dim_id = d.dim_id;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.functions import broadcast\n" +
          "\n" +
          "# small side broadcast -> no shuffle of the big fact\n" +
          "out = fact.join(broadcast(dim), on='dim_id', how='inner')\n" +
          "\n" +
          "# skewed key? salt it: spread the hot key across N buckets\n" +
          "N = 16\n" +
          "f2 = fact.withColumn('salt', (F.rand() * N).cast('int'))\n" +
          "d2 = dim.withColumn('salt', F.explode(F.array([F.lit(i) for i in range(N)])))\n" +
          "out2 = f2.join(d2, on=['dim_id', 'salt'])"
      },
      cost:
        "Broadcast trades a shuffle for replicating the small table to every executor — great until it's too big and blows executor memory. Salting turns one giant skewed partition into N smaller ones at the cost of N× replicating the small side. Modern Spark's AQE can do some of this automatically.",
      dos: [
        "Broadcast only when the small side truly fits — name a rough size threshold.",
        "Diagnose skew from task duration / key counts before salting.",
        "Mention AQE (adaptive skew join / auto-broadcast) as the modern default."
      ],
      donts: [
        "Don't broadcast a table that isn't small — you'll OOM the executors.",
        "Don't salt blindly — it adds overhead; only skewed keys need it.",
        "Don't forget to add the salt column to <b>both</b> sides of the join key."
      ],
      followUps: [
        { q: "'How do you know it broadcast?'",
          a: "<code>explain()</code> shows <code>BroadcastHashJoin</code> vs <code>SortMergeJoin</code>." },
        { q: "'What if the small side grows past the threshold?'",
          a: "It falls back to a shuffle join; raise the threshold only if memory allows, else redesign." },
        { q: "'Only one key is skewed — must I salt all?'",
          a: "No — isolate the hot key(s), salt just those, union with the un-salted remainder." }
      ]
    },

    {
      id: "as-of-join",
      title: "As-of / point-in-time join",
      group: "Joins & Matching",
      difficulty: "Hard",
      aka: [
        "'the price in effect at trade time'", "'latest value as of'", "'point-in-time correct'", "'temporal join'"
      ],
      tells: [
        "Attach, to each event, the <b>most recent prior</b> value from another time-series (not an exact-time match).",
        "Finance (price/quote as of a trade), config/rules in effect at an event, SCD lookups.",
        "Exact-key equality won't work — you need <b>≤ time, take the last</b>."
      ],
      keyIdea:
        "An as-of join matches on key and <b>nearest earlier timestamp</b>. The scalable idiom: union both streams, order by time per key, and <b>forward-fill</b> the last known value (<code>last(ignorenulls=True)</code> over an ordered window) — avoiding an O(n²) range join.",
      approach: [
        "Align schemas so trades and reference rows can be unioned.",
        "Window <code>partitionBy(key).orderBy(ts)</code>, cumulative frame.",
        "Forward-fill the reference value with <code>last(value, ignorenulls=True)</code>.",
        "Keep only the event rows — each now carries the value in effect."
      ],
      code: {
        sql:
          "-- price in effect at each trade time (lateral 'take latest earlier')\n" +
          "SELECT t.trade_id, t.ts, p.price\n" +
          "FROM trades t\n" +
          "JOIN LATERAL (\n" +
          "  SELECT price FROM prices p\n" +
          "  WHERE p.symbol = t.symbol AND p.ts <= t.ts\n" +
          "  ORDER BY p.ts DESC\n" +
          "  LIMIT 1\n" +
          ") p ON true;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w = (Window.partitionBy('symbol').orderBy('ts')\n" +
          "     .rowsBetween(Window.unboundedPreceding, Window.currentRow))\n" +
          "\n" +
          "merged = (trades.withColumn('price', F.lit(None).cast('double'))\n" +
          "    .unionByName(prices.withColumn('trade_id', F.lit(None)), allowMissingColumns=True)\n" +
          "    .withColumn('price', F.last('price', ignorenulls=True).over(w)))  # carry forward\n" +
          "\n" +
          "asof = merged.where(F.col('trade_id').isNotNull())"
      },
      cost:
        "The forward-fill approach is <b>one</b> shuffle + sort per key, then a linear pass — scales. A literal range join (<code>p.ts &lt;= t.ts</code> then pick latest) is a <b>range join</b> that can blow up to O(n²) per key; avoid it on large data.",
      dos: [
        "Prefer union + forward-fill over a range join at scale.",
        "State the tie rule when timestamps collide (a secondary sort key).",
        "Confirm it's <b>≤</b> (as-of) not future-peeking <b>&lt;</b>/exact — look-ahead leakage is a real bug in ML features."
      ],
      donts: [
        "Don't equi-join on timestamp — exact matches rarely exist.",
        "Don't use a naive <code>ts &lt;= ts</code> range join on billions of rows.",
        "Don't accidentally attach a <b>future</b> value — point-in-time means only past is allowed."
      ],
      followUps: [
        { q: "'Within a max staleness (e.g. price no older than 1 min).'",
          a: "After the forward-fill, null out rows whose carried timestamp is too old." },
        { q: "'Why not a subquery per row?'",
          a: "That's a correlated per-row lookup — O(n) queries; the windowed forward-fill does it in one pass." },
        { q: "'This is SCD Type 2 — same thing?'",
          a: "Yes: join facts to the dimension version whose validity interval covers the event time." }
      ]
    },

    // ============================================ Ranking & Deduplication ====
    {
      id: "top-n-per-group",
      title: "Top-N per group (and Nth-highest)",
      group: "Ranking & Deduplication",
      difficulty: "Medium",
      aka: [
        "'top 3 per department'", "'highest-paid in each group'", "'second-highest salary'", "'best per category'"
      ],
      tells: [
        "A ranking <b>within</b> each group, then keep the top few (or exactly the Nth).",
        "Words: <b>top N</b>, <b>highest/lowest per</b>, <b>Nth highest</b>, <b>best in each</b>.",
        "A plain <code>MAX</code> won't do — you need positions 1..N, and ties matter."
      ],
      keyIdea:
        "Number rows within each group with a window rank, then filter. Pick the ranker by tie policy: <code>ROW_NUMBER</code> (arbitrary unique 1..n), <code>RANK</code> (ties share, gaps after), <code>DENSE_RANK</code> (ties share, no gaps) — 'top 3 distinct salaries' means <code>DENSE_RANK &lt;= 3</code>.",
      approach: [
        "Window <code>partitionBy(group).orderBy(metric DESC)</code>.",
        "Choose the ranking function by how ties should behave.",
        "Compute the rank, then filter <code>rank &lt;= N</code> (or <code>= N</code> for the Nth).",
        "Add a tie-breaker to the order if you need deterministic <code>ROW_NUMBER</code>."
      ],
      code: {
        sql:
          "-- top 3 highest-paid per department (distinct salary tiers)\n" +
          "SELECT * FROM (\n" +
          "  SELECT e.*,\n" +
          "         DENSE_RANK() OVER (\n" +
          "           PARTITION BY department_id ORDER BY salary DESC\n" +
          "         ) AS rnk\n" +
          "  FROM employees e\n" +
          ") t\n" +
          "WHERE rnk <= 3;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w = Window.partitionBy('department_id').orderBy(F.col('salary').desc())\n" +
          "\n" +
          "top3 = (employees\n" +
          "    .withColumn('rnk', F.dense_rank().over(w))\n" +
          "    .where(F.col('rnk') <= 3))\n" +
          "top3.show()"
      },
      cost:
        "One windowed shuffle + sort per group. Cheaper than a correlated 'count how many are bigger' subquery. Skew hits if one group is enormous.",
      dos: [
        "Match the ranker to the tie rule — say why row_number vs rank vs dense_rank.",
        "Use <code>DENSE_RANK() = N</code> for 'Nth-highest distinct value'.",
        "Add a deterministic tie-breaker for reproducible <code>ROW_NUMBER</code>."
      ],
      donts: [
        "Don't use <code>ROW_NUMBER</code> when ties should tie — it picks an arbitrary winner.",
        "Don't self-join / correlate to count 'how many are greater' — O(n²).",
        "Don't forget the outer filter — the window alone ranks but keeps all rows."
      ],
      followUps: [
        { q: "'Exactly the 2nd highest salary.'",
          a: "<code>DENSE_RANK() = 2</code> (distinct tiers) — handles duplicate top salaries correctly." },
        { q: "'Only one row even if the top ties.'",
          a: "Use <code>ROW_NUMBER = 1</code> with a tie-breaker." },
        { q: "'Top 10% instead of top N.'",
          a: "Use <code>NTILE(10) = 1</code> or <code>PERCENT_RANK</code>." }
      ]
    },

    {
      id: "dedup-latest",
      title: "Deduplicate — keep the latest / most-complete row",
      group: "Ranking & Deduplication",
      difficulty: "Medium",
      aka: [
        "'keep the most recent record per key'", "'remove duplicates'", "'latest state per id'", "'CDC to current'"
      ],
      tells: [
        "Multiple rows per key (updates, CDC, replays) and you want <b>one</b> — the newest, or the best.",
        "Words: <b>latest</b>, <b>most recent</b>, <b>current</b>, <b>dedupe keeping ...</b>.",
        "'Keeping the latest' or 'the most complete' — the tie/selection rule is the crux."
      ],
      keyIdea:
        "<code>ROW_NUMBER</code> over <code>partitionBy(key).orderBy(recency DESC)</code>, keep <code>rn = 1</code>. It's <b>deterministic</b> (you choose which row survives); <code>dropDuplicates</code> keeps an <b>arbitrary</b> row. For 'most complete', order by the null-count ascending.",
      approach: [
        "Define 'winner': latest timestamp? highest version? fewest nulls?",
        "Window <code>partitionBy(key).orderBy(that rule)</code>.",
        "<code>ROW_NUMBER</code>, filter <code>= 1</code>, drop the helper column.",
        "Add a tie-breaker so the survivor is deterministic."
      ],
      code: {
        sql:
          "-- keep the latest row per customer\n" +
          "SELECT * FROM (\n" +
          "  SELECT c.*,\n" +
          "         ROW_NUMBER() OVER (\n" +
          "           PARTITION BY customer_id ORDER BY updated_at DESC\n" +
          "         ) AS rn\n" +
          "  FROM customer_events c\n" +
          ") t\n" +
          "WHERE rn = 1;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w = Window.partitionBy('customer_id').orderBy(F.col('updated_at').desc())\n" +
          "\n" +
          "latest = (events\n" +
          "    .withColumn('rn', F.row_number().over(w))\n" +
          "    .where(F.col('rn') == 1)\n" +
          "    .drop('rn'))\n" +
          "latest.show()"
      },
      cost:
        "One windowed shuffle + sort by key. Same order as <code>dropDuplicates</code> but with control over the survivor. Skew if one key has a huge history.",
      dos: [
        "Prefer <code>ROW_NUMBER = 1</code> when <i>which</i> duplicate survives matters.",
        "For 'most complete', order by <code>(count of null columns)</code> ascending.",
        "Add a deterministic tie-breaker (e.g. a monotonic id)."
      ],
      donts: [
        "Don't rely on <code>dropDuplicates()</code> when you need a specific row — it's arbitrary.",
        "Don't <code>GROUP BY</code> + <code>MAX(updated_at)</code> then rejoin — two passes vs one window.",
        "Don't leave ordering ties unbroken — the survivor becomes nondeterministic."
      ],
      followUps: [
        { q: "'Dedup on customer + timestamp, keep highest txn id.'",
          a: "Partition by <code>(customer_id, ts)</code>, order by <code>txn_id DESC</code>, take <code>rn = 1</code>." },
        { q: "'Just distinct whole rows.'",
          a: "<code>DISTINCT</code> / <code>dropDuplicates()</code> with no subset — no survivor choice needed." },
        { q: "'Apply a CDC feed to current state.'",
          a: "Dedup to latest per key, then <code>MERGE</code> (upsert deletes/updates/inserts)." }
      ]
    },

    // ============================================ Time-Series & Sessionization
    {
      id: "event-gaps",
      title: "Gaps between consecutive events",
      group: "Time-Series & Sessionization",
      difficulty: "Medium",
      aka: [
        "'days between orders'", "'time since last event'", "'longest gap per user'", "'inter-arrival time'"
      ],
      tells: [
        "The distance in time between each event and the <b>previous one</b> for the same entity.",
        "Words: <b>days between</b>, <b>time since last</b>, <b>gap</b>, <b>interval between</b>.",
        "Often followed by an aggregate: longest/average gap per entity."
      ],
      keyIdea:
        "<code>LAG</code> the previous timestamp over <code>partitionBy(entity).orderBy(time)</code>, subtract to get the gap (mind the unit — <code>DATEDIFF</code> for days, epoch subtraction for seconds), then aggregate the gaps.",
      approach: [
        "Window per entity ordered by time.",
        "Previous event time via <code>LAG</code>.",
        "Gap = current − previous in the right unit; first event's gap is null.",
        "Aggregate (max/avg) per entity if asked."
      ],
      code: {
        sql:
          "-- longest gap (in days) between consecutive orders, per customer\n" +
          "WITH g AS (\n" +
          "  SELECT customer_id, order_date,\n" +
          "         order_date - LAG(order_date) OVER (\n" +
          "           PARTITION BY customer_id ORDER BY order_date\n" +
          "         ) AS gap_days\n" +
          "  FROM orders\n" +
          ")\n" +
          "SELECT customer_id, MAX(gap_days) AS longest_gap\n" +
          "FROM g\n" +
          "GROUP BY customer_id;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w = Window.partitionBy('customer_id').orderBy('order_date')\n" +
          "\n" +
          "gaps = orders.withColumn('gap_days',\n" +
          "    F.datediff('order_date', F.lag('order_date').over(w)))\n" +
          "\n" +
          "longest = gaps.groupBy('customer_id').agg(F.max('gap_days').alias('longest_gap'))\n" +
          "longest.show()"
      },
      cost:
        "One ordered window (shuffle + sort by entity), then a cheap group-by on the gaps. <code>LAG</code> is a local look-back within the sorted partition.",
      dos: [
        "Pin the unit: <code>DATEDIFF</code> (days) vs epoch subtraction (seconds).",
        "Treat the first event's null gap deliberately (it has no predecessor).",
        "Add a tie-breaker if two events can share a timestamp."
      ],
      donts: [
        "Don't self-join on <code>date = prev_date</code> — breaks with irregular spacing.",
        "Don't mix units (minutes vs seconds vs days).",
        "Don't drop <code>PARTITION BY</code> — gaps would span different entities."
      ],
      followUps: [
        { q: "'Average gap per customer.'",
          a: "Swap <code>MAX</code> for <code>AVG</code> over the gaps." },
        { q: "'Customers with any gap over 90 days.'",
          a: "Filter <code>gap_days > 90</code> before/after the aggregate." },
        { q: "'This is one step from sessionization.'",
          a: "Yes — flag gaps over a threshold and running-sum the flag to get session ids." }
      ]
    },

    // ============================================ Gaps, Islands & Streaks ====
    {
      id: "consecutive-islands",
      title: "Consecutive runs / streaks (islands)",
      group: "Gaps, Islands & Streaks",
      difficulty: "Hard",
      aka: [
        "'longest login streak'", "'consecutive days'", "'runs of ...'", "'gaps and islands'"
      ],
      tells: [
        "Grouping <b>consecutive</b> rows (dates, ids) into runs — streaks, active spells.",
        "Words: <b>consecutive</b>, <b>streak</b>, <b>in a row</b>, <b>uninterrupted</b>.",
        "You must identify <i>which rows belong to the same run</i>, then measure it."
      ],
      keyIdea:
        "The <b>row_number difference</b> trick: for a dense sequence, <code>value − ROW_NUMBER()</code> (ordered) stays <b>constant</b> within a consecutive run and jumps at every gap. Group by that constant to get islands, then count/measure them.",
      approach: [
        "Dedup to one row per (entity, unit) so counts are clean.",
        "Window <code>partitionBy(entity).orderBy(unit)</code>; compute <code>ROW_NUMBER</code>.",
        "Group key = <code>unit − row_number</code> (as a date offset or integer) — constant within a run.",
        "Group by (entity, that key); the run length is the count; take the max for the longest streak."
      ],
      code: {
        sql:
          "-- longest streak of consecutive login days per user\n" +
          "WITH marked AS (\n" +
          "  SELECT user_id, login_date,\n" +
          "         login_date - (ROW_NUMBER() OVER (\n" +
          "           PARTITION BY user_id ORDER BY login_date\n" +
          "         )) * INTERVAL '1' DAY AS grp\n" +
          "  FROM (SELECT DISTINCT user_id, login_date FROM logins) d\n" +
          ")\n" +
          "SELECT user_id, MAX(cnt) AS longest_streak\n" +
          "FROM (\n" +
          "  SELECT user_id, grp, COUNT(*) AS cnt\n" +
          "  FROM marked GROUP BY user_id, grp\n" +
          ") s\n" +
          "GROUP BY user_id;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w = Window.partitionBy('user_id').orderBy('login_date')\n" +
          "\n" +
          "# distinct days, then date - row_number -> constant within a run\n" +
          "marked = (logins.select('user_id', 'login_date').distinct()\n" +
          "    .withColumn('grp', F.date_sub('login_date', F.row_number().over(w))))\n" +
          "\n" +
          "streaks = (marked.groupBy('user_id', 'grp').count()\n" +
          "    .groupBy('user_id').agg(F.max('count').alias('longest_streak')))\n" +
          "streaks.show()"
      },
      cost:
        "One ordered window (shuffle + sort) plus two light group-bys. The trick replaces an otherwise recursive/iterative walk with a single pass.",
      dos: [
        "Deduplicate the sequence first — duplicate days corrupt <code>ROW_NUMBER</code>.",
        "Match the offset unit to the sequence (days for dates, 1 for integers).",
        "Explain <i>why</i> value − row_number is constant within a run (both increase by 1 in step)."
      ],
      donts: [
        "Don't apply the trick to a sequence with duplicates — dedup first.",
        "Don't use <code>RANK</code>/<code>DENSE_RANK</code> here — ties break the 1-per-step assumption; use <code>ROW_NUMBER</code>.",
        "Don't self-join neighbors repeatedly to grow runs — O(n²)."
      ],
      followUps: [
        { q: "'Return the start and end of each streak.'",
          a: "Per (user, grp) take <code>MIN</code> and <code>MAX</code> of the date." },
        { q: "'Streaks of a condition (e.g. active spend), not just presence.'",
          a: "Filter to qualifying rows first, then apply the same island trick." },
        { q: "'Current active streak only.'",
          a: "Keep the run whose max date is the latest, and check it reaches today." }
      ]
    },

    {
      id: "missing-sequence-gaps",
      title: "Find gaps / missing values in a sequence",
      group: "Gaps, Islands & Streaks",
      difficulty: "Medium",
      aka: [
        "'missing invoice numbers'", "'holes in the dates'", "'skipped ids'", "'which days had no data'"
      ],
      tells: [
        "Detecting where a sequence <b>skips</b> — missing ids, absent dates.",
        "Words: <b>missing</b>, <b>gaps</b>, <b>holes</b>, <b>not present</b>, <b>skipped</b>.",
        "You care about what <i>isn't</i> there, so you compare each row to its neighbor (or to a full spine)."
      ],
      keyIdea:
        "Compare each row to the <b>next</b> with <code>LEAD</code>: wherever <code>next − current &gt; 1</code>, the gap spans <code>current+1 .. next−1</code>. For calendar gaps, build a complete <b>date spine</b> and left-anti-join the actual dates against it.",
      approach: [
        "Order the sequence (globally or per entity).",
        "<code>LEAD(id)</code> to see the next value.",
        "Keep rows where the jump &gt; 1; report <code>id+1</code> as gap start, <code>next−1</code> as gap end.",
        "For dates, generate the full range and left-anti-join to list every missing day."
      ],
      code: {
        sql:
          "-- gap ranges where ids skip\n" +
          "WITH s AS (\n" +
          "  SELECT id, LEAD(id) OVER (ORDER BY id) AS nxt FROM seq\n" +
          ")\n" +
          "SELECT id + 1 AS gap_start, nxt - 1 AS gap_end\n" +
          "FROM s\n" +
          "WHERE nxt - id > 1;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "w = Window.orderBy('id')\n" +
          "\n" +
          "gaps = (seq.withColumn('nxt', F.lead('id').over(w))\n" +
          "    .where(F.col('nxt') - F.col('id') > 1)\n" +
          "    .select((F.col('id') + 1).alias('gap_start'),\n" +
          "            (F.col('nxt') - 1).alias('gap_end')))\n" +
          "gaps.show()"
      },
      cost:
        "A global-order window forces <b>one partition</b> (no <code>PARTITION BY</code>) — fine for modest data, a bottleneck at scale. A date-spine + left-anti-join shuffles by date and scales better for calendar gaps.",
      dos: [
        "Use <code>LEAD</code> for neighbor comparison; report inclusive gap ranges.",
        "For missing <b>calendar days</b>, generate a spine (<code>sequence()</code> / a date table) and anti-join.",
        "Partition by entity when gaps are per-entity, to avoid a single huge partition."
      ],
      donts: [
        "Don't rely on <code>LEAD</code> across a global order at scale — it collapses to one partition.",
        "Don't confuse 'missing rows' with 'null values' — different problems.",
        "Don't assume ids are gapless — that's exactly what you're testing."
      ],
      followUps: [
        { q: "'List every missing day, not just ranges.'",
          a: "Generate the full date spine and <code>left_anti</code>-join the present dates." },
        { q: "'Gaps per account, not globally.'",
          a: "Add <code>PARTITION BY account</code> to the window." },
        { q: "'Count total missing values.'",
          a: "Sum <code>(nxt - id - 1)</code> across the gap rows." }
      ]
    },

    // ============================================ Reshaping & Pivots =========
    {
      id: "pivot-unpivot",
      title: "Pivot (long → wide) and unpivot (wide → long)",
      group: "Reshaping & Pivots",
      difficulty: "Medium",
      aka: [
        "'months as columns'", "'crosstab'", "'spread / gather'", "'transpose the categories'"
      ],
      tells: [
        "Turning a category column's <b>values into columns</b> (pivot), or columns back into rows (unpivot).",
        "Words: <b>pivot</b>, <b>crosstab</b>, <b>one column per month</b>, <b>wide format</b> — or <b>melt</b>/<b>unpivot</b> for the reverse.",
        "A reporting shape: rows × category matrix of an aggregate."
      ],
      keyIdea:
        "Pivot = group by the row key, <b>spread</b> a category column's values into columns, aggregating each cell. List the category values explicitly so the engine needs one pass. Unpivot = <code>stack</code>/<code>UNPIVOT</code> to fold columns back into (name, value) rows.",
      approach: [
        "Pick the row key, the column-source category, and the cell aggregate.",
        "Pivot on the category (list its values) with the aggregate.",
        "To reverse, <code>UNPIVOT</code> / <code>stack(n, 'c1', c1, ...)</code> into name/value rows.",
        "Handle empty cells (they come back null — coalesce if 0 is meant)."
      ],
      code: {
        sql:
          "-- long -> wide\n" +
          "SELECT * FROM (SELECT customer_id, month, amount FROM monthly)\n" +
          "PIVOT (SUM(amount) FOR month IN ('Jan','Feb','Mar'));\n" +
          "\n" +
          "-- wide -> long (unpivot)\n" +
          "SELECT customer_id, month, amount\n" +
          "FROM wide\n" +
          "UNPIVOT (amount FOR month IN (Jan, Feb, Mar));",
        spark:
          "from pyspark.sql import functions as F\n" +
          "\n" +
          "# long -> wide (list the values so Spark needs one pass)\n" +
          "wide = (monthly.groupBy('customer_id')\n" +
          "    .pivot('month', ['Jan', 'Feb', 'Mar'])\n" +
          "    .agg(F.sum('amount')))\n" +
          "\n" +
          "# wide -> long\n" +
          "long = wide.selectExpr('customer_id',\n" +
          "    \"stack(3, 'Jan', Jan, 'Feb', Feb, 'Mar', Mar) as (month, amount)\")"
      },
      cost:
        "A pivot is a group-by (one shuffle) plus a spread. If you <b>don't</b> list the pivot values, Spark runs an extra job to discover them — always pass the list. Unpivot is a narrow transform.",
      dos: [
        "Always list the pivot values — avoids the discovery pass and pins the schema.",
        "Coalesce null cells to 0 when absence means zero.",
        "Recognize a small fixed pivot is just conditional aggregation under the hood."
      ],
      donts: [
        "Don't pivot an <b>unbounded</b> category set into columns — the schema explodes.",
        "Don't let Spark auto-discover pivot values on huge data (extra shuffle/job).",
        "Don't forget empty combinations arrive as null, not 0."
      ],
      followUps: [
        { q: "'The categories aren't known ahead of time.'",
          a: "Collect distinct values first (a driver round-trip) or keep it long — dynamic wide schemas are fragile." },
        { q: "'Multiple aggregates per cell.'",
          a: "Pass several aggregates to <code>.agg()</code>; columns become <code>value_metric</code>." },
        { q: "'Isn't this the same as SUM(CASE WHEN)?'",
          a: "Yes — a fixed pivot compiles to exactly that conditional aggregation." }
      ]
    },

    {
      id: "explode-json",
      title: "Explode arrays & parse JSON (nested → rows)",
      group: "Reshaping & Pivots",
      difficulty: "Medium",
      aka: [
        "'one row per item'", "'flatten the array'", "'parse the JSON column'", "'unnest'"
      ],
      tells: [
        "A column holds an <b>array</b> or a <b>JSON string</b> and they want it flattened into rows/columns.",
        "Words: <b>explode</b>, <b>flatten</b>, <b>unnest</b>, <b>one row per element</b>, <b>parse JSON</b>.",
        "Nested/semi-structured data that must become tabular."
      ],
      keyIdea:
        "<code>explode</code> emits <b>one row per array element</b> (<code>explode_outer</code> keeps rows with empty/null arrays, as null). Parse JSON strings with <code>from_json</code> and an <b>explicit schema</b>, then dot-select the fields — don't regex JSON.",
      approach: [
        "Array → rows: <code>explode(col)</code> (or <code>explode_outer</code> to keep empties).",
        "JSON string → struct: <code>from_json(col, schema)</code> with a defined schema.",
        "Dot-select the struct fields into flat columns.",
        "For arrays of structs, explode then select nested fields."
      ],
      code: {
        sql:
          "-- flatten an array column into rows (Presto/Trino/BigQuery-style)\n" +
          "SELECT o.order_id, item\n" +
          "FROM orders o\n" +
          "CROSS JOIN UNNEST(o.item_ids) AS t(item);",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
          "\n" +
          "# array column -> one row per element\n" +
          "flat = orders.select('order_id', F.explode('item_ids').alias('item'))\n" +
          "\n" +
          "# JSON string -> struct -> columns (explicit schema)\n" +
          "schema = StructType([StructField('sku', StringType()),\n" +
          "                     StructField('qty', IntegerType())])\n" +
          "parsed = (raw.withColumn('j', F.from_json('payload', schema))\n" +
          "             .select('id', 'j.sku', 'j.qty'))"
      },
      cost:
        "<code>explode</code> is a narrow transform but <b>multiplies</b> row count (watch memory on big arrays). <code>from_json</code> with a schema is a codegen-fused parse; schema <b>inference</b> would trigger an extra pass over the data.",
      dos: [
        "Use <code>explode_outer</code> when rows with empty arrays must survive.",
        "Give <code>from_json</code> an explicit schema — predictable and fast.",
        "Select only the nested fields you need after exploding."
      ],
      donts: [
        "Don't <code>explode</code> into a UDF loop — the native function is far faster.",
        "Don't parse JSON with string/regex ops — use <code>from_json</code>/<code>get_json_object</code>.",
        "Don't ignore row multiplication — a huge array can blow up the stage."
      ],
      followUps: [
        { q: "'Keep the position/index of each element.'",
          a: "Use <code>posexplode</code> to get (pos, col)." },
        { q: "'Array of structs — pull two fields.'",
          a: "<code>explode</code> the array, then dot-select <code>col.field1</code>, <code>col.field2</code>." },
        { q: "'Schema varies row to row.'",
          a: "Parse with a superset schema (missing fields become null) or keep it as a map/variant." }
      ]
    },

    // ============================================ Data Quality & Nulls =======
    {
      id: "null-handling",
      title: "Null handling (fill, coalesce, null-safe, the traps)",
      group: "Data Quality & Nulls",
      difficulty: "Medium",
      aka: [
        "'replace missing values'", "'null-safe join'", "'why did my filter drop rows'", "'NOT IN returned nothing'"
      ],
      tells: [
        "Missing values that must be defaulted, or joins/filters behaving oddly around nulls.",
        "Words: <b>null</b>, <b>missing</b>, <b>default</b>, <b>N/A</b>, <b>unknown</b>.",
        "Symptoms: rows vanish after a filter, a <code>NOT IN</code> returns nothing, an average looks off."
      ],
      keyIdea:
        "Nulls <b>propagate</b> — any arithmetic or comparison with null is null (unknown), not false. Set defaults with <code>COALESCE</code>/<code>fillna</code>; <code>=</code> never matches null so use <code>IS NULL</code> / <code>eqNullSafe</code> (<code>&lt;=&gt;</code>); aggregates <b>skip</b> nulls; <code>NOT IN</code> with a null yields no rows.",
      approach: [
        "Decide per column: default it, drop it, or keep it as unknown.",
        "Default with <code>COALESCE</code>/<code>fillna</code>; join nullable keys with <code>eqNullSafe</code>.",
        "Filter with null-aware predicates (<code>IS [NOT] NULL</code>).",
        "Remember aggregates ignore nulls — that can be the intent or the bug."
      ],
      code: {
        sql:
          "SELECT\n" +
          "  COALESCE(discount, 0)  AS discount,         -- default nulls\n" +
          "  COUNT(amount)          AS non_null_amounts  -- aggregates skip nulls\n" +
          "FROM orders o\n" +
          "WHERE NOT EXISTS (                             -- null-safe anti-join\n" +
          "  SELECT 1 FROM blacklist b WHERE b.customer_id = o.customer_id\n" +
          ");",
        spark:
          "from pyspark.sql import functions as F\n" +
          "\n" +
          "clean = (orders\n" +
          "    .fillna({'discount': 0})                       # per-column defaults\n" +
          "    .withColumn('amount', F.coalesce('amount', F.lit(0))))\n" +
          "\n" +
          "# null-safe join key: nulls match nulls\n" +
          "j = a.join(b, a['k'].eqNullSafe(b['k']))\n" +
          "\n" +
          "# avg ignores nulls -> mean of PRESENT values (not treated as 0)\n" +
          "m = orders.agg(F.avg('amount'))"
      },
      cost:
        "All narrow transforms except joins. The real cost of getting nulls wrong is <b>silent wrong answers</b> — dropped rows, empty <code>NOT IN</code> results, means computed over the wrong denominator.",
      dos: [
        "Use <code>eqNullSafe</code>/<code>&lt;=&gt;</code> when a join key can be null and nulls should match.",
        "State whether a missing value means 0, unknown, or drop — they differ.",
        "Recall aggregates skip nulls; decide if that's the true average you want."
      ],
      donts: [
        "Don't compare to null with <code>=</code>/<code>&lt;&gt;</code> — use <code>IS NULL</code>.",
        "Don't use <code>NOT IN</code> against a nullable subquery — use <code>NOT EXISTS</code>/<code>left_anti</code>.",
        "Don't <code>fillna(0)</code> before an average unless zeros are truly meant — it skews the mean."
      ],
      followUps: [
        { q: "'Drop rows only if key columns are null.'",
          a: "<code>dropna(subset=[...])</code> — targeted, not whole-row." },
        { q: "'Fill differently per column.'",
          a: "Pass a dict to <code>fillna({col: value, ...})</code>." },
        { q: "'True average counting nulls as 0.'",
          a: "<code>SUM(x) / COUNT(*)</code> instead of <code>AVG(x)</code>." }
      ]
    },

    {
      id: "corrupt-dedup-schema",
      title: "Schema enforcement, corrupt records & most-complete dedup",
      group: "Data Quality & Nulls",
      difficulty: "Hard",
      aka: [
        "'handle bad rows on ingest'", "'enforce the schema'", "'quarantine corrupt records'", "'keep the cleanest row'"
      ],
      tells: [
        "Ingesting messy/semi-structured data where some rows are malformed or types drift.",
        "Words: <b>corrupt</b>, <b>bad records</b>, <b>enforce schema</b>, <b>quarantine</b>, <b>most complete</b>.",
        "A pipeline-robustness question, not a pure transformation."
      ],
      keyIdea:
        "Define an <b>explicit schema</b> (don't infer in production), read in <code>PERMISSIVE</code> mode capturing a <code>_corrupt_record</code> column, then <b>split</b> good vs bad (quarantine). When deduping, keep the <b>most complete</b> row per key by ordering on the null-count.",
      approach: [
        "Provide an explicit schema + <code>columnNameOfCorruptRecord</code>.",
        "Read <code>PERMISSIVE</code>; rows that don't parse land in the corrupt column.",
        "Split: good = corrupt is null; quarantine the rest for inspection.",
        "Dedup survivors by fewest nulls (most-complete) with <code>ROW_NUMBER</code>."
      ],
      code: {
        sql:
          "-- keep the MOST COMPLETE row per customer (fewest nulls)\n" +
          "SELECT * FROM (\n" +
          "  SELECT c.*,\n" +
          "         ROW_NUMBER() OVER (\n" +
          "           PARTITION BY customer_id\n" +
          "           ORDER BY (CASE WHEN email IS NULL THEN 1 ELSE 0 END)\n" +
          "                  + (CASE WHEN phone IS NULL THEN 1 ELSE 0 END)\n" +
          "         ) AS rn\n" +
          "  FROM customers c\n" +
          ") t\n" +
          "WHERE rn = 1;",
        spark:
          "from pyspark.sql import functions as F\n" +
          "from pyspark.sql.window import Window\n" +
          "\n" +
          "# enforce schema on read + capture corrupt rows\n" +
          "df = (spark.read.schema(explicit_schema)\n" +
          "      .option('mode', 'PERMISSIVE')\n" +
          "      .option('columnNameOfCorruptRecord', '_corrupt')\n" +
          "      .json(path))\n" +
          "good = df.where(F.col('_corrupt').isNull())\n" +
          "bad  = df.where(F.col('_corrupt').isNotNull())   # quarantine\n" +
          "\n" +
          "# most-complete row per key (fewest nulls)\n" +
          "nulls = sum((F.col(c).isNull()).cast('int') for c in ['email', 'phone', 'name'])\n" +
          "w = Window.partitionBy('customer_id').orderBy(nulls.asc())\n" +
          "canon = good.withColumn('rn', F.row_number().over(w)).where(F.col('rn') == 1)"
      },
      cost:
        "Reading with an explicit schema avoids the <b>inference pass</b> (a full extra scan) and is safer. The dedup is one windowed shuffle + sort per key. Quarantining is a cheap filter split.",
      dos: [
        "Always supply an explicit schema in production reads.",
        "Quarantine corrupt rows instead of silently dropping — you can inspect and reprocess.",
        "Dedup by completeness (null-count) when 'keep the best record' is the ask."
      ],
      donts: [
        "Don't infer schema in prod — it's a slow extra pass and drifts over time.",
        "Don't use <code>DROPMALFORMED</code> when you need to see the bad rows.",
        "Don't dedup arbitrarily when a 'most complete' rule is specified."
      ],
      followUps: [
        { q: "'Flag rows that fail a cast instead of dropping.'",
          a: "Cast to a temp column; where it's null but the source wasn't, flag a bad cast." },
        { q: "'Enforce not-null / range constraints.'",
          a: "Add validation columns (or a checks library) and route failures to quarantine." },
        { q: "'Then apply changes to the current table.'",
          a: "<code>MERGE</code> the cleaned, deduped batch into the target (upsert)." }
      ]
    }
  ]
};
