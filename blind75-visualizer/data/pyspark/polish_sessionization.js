/*
 * PySpark Interview Lab — P2 polish: more Sessionization / Cohort problems
 * (folded into "Cohort & Time-Series"). Deepens a thin, high-frequency area.
 */
(function () {
  var CAT = "Cohort & Time-Series";
  window.PYSPARK.register(CAT, [

    {
      id: "sessionize-inactivity-timeout",
      lc: 301,
      title: "Sessionize events by 30-min inactivity",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Sessionization", transformation: "Window", functions: "lag, unix_timestamp, sum over window" },
      description:
        "Given `events(user_id, ts)`, assign a **session id** per user: a new session starts whenever the gap since the previous event exceeds **30 minutes**.",
      examples: [
        { input: "u1: 10:00, 10:20, 11:05, 11:10", output: "sessions: {10:00,10:20}=1, {11:05,11:10}=2", reasoning: "Gap 10:20→11:05 is 45 min > 30 → new session; a cumulative sum of the new-session flag numbers them." }
      ],
      approaches: [
        {
          name: "lag gap → new-session flag → cumulative sum",
          whenToUse: "Any inactivity-timeout sessionization.",
          logic:
            "**What it asks.** Group each user's events into sessions split by >30-min gaps.\n\n" +
            "**Key Idea.** Per user ordered by time, compare each event to the previous with `lag`. If the gap > 30 min (or it's the first event), it **starts** a session — flag = 1. A running `sum` of that flag is the session id.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `w = Window.partitionBy('user_id').orderBy('ts')`.\n" +
            "2. `prev = lag('ts').over(w)`; `is_new = (ts - prev > 1800s) or prev is null`.\n" +
            "3. `session_id = sum(is_new).over(w rows unbounded preceding→current)`.\n\n" +
            "**Why it works.** Each boundary increments the running counter, so contiguous events share an id.\n\n" +
            "**Common Gotchas.**\n" +
            "- The first event's null gap must count as a new session.\n" +
            "- Use `unix_timestamp`/seconds for the threshold.\n\n" +
            "**Interview mindset.** 'lag gap → boundary flag → cumulative sum' is the sessionization template.",
          rcs:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import lag, unix_timestamp, when, col, sum as _sum, lit\n" +
            "w = Window.partitionBy('user_id').orderBy('ts')\n" +
            "gap = unix_timestamp('ts') - unix_timestamp(lag('ts').over(w))\n" +
            "flag = when(col('gap').isNull() | (col('gap') > 1800), 1).otherwise(0)\n" +
            "df2 = (events.withColumn('gap', gap).withColumn('is_new', flag)\n" +
            "       .withColumn('session_id',\n" +
            "           _sum('is_new').over(w.rowsBetween(Window.unboundedPreceding, 0))))",
          plain:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import lag, unix_timestamp, when, col, sum as _sum\n" +
            "w = Window.partitionBy('user_id').orderBy('ts')\n" +
            "gap = unix_timestamp('ts') - unix_timestamp(lag('ts').over(w))\n" +
            "df2 = (events.withColumn('is_new', when(gap.isNull() | (gap > 1800), 1).otherwise(0))\n" +
            "       .withColumn('session_id', _sum('is_new').over(w.rowsBetween(Window.unboundedPreceding, 0))))"
        }
      ],
      sparkInternals:
        "Two window passes over the same partition/order: `lag` reads the prior row, and the cumulative `sum` frames unboundedPreceding→currentRow. Both are wide (one shuffle by user_id); the ordering within a partition is what makes the running counter correct. Watch for skew on a hyperactive user.",
      sparkSql:
        "SELECT *, SUM(is_new) OVER (PARTITION BY user_id ORDER BY ts\n  ROWS UNBOUNDED PRECEDING) AS session_id\nFROM (SELECT *, CASE WHEN ts - LAG(ts) OVER w > interval 30 min\n        OR LAG(ts) OVER w IS NULL THEN 1 ELSE 0 END AS is_new FROM events\n      WINDOW w AS (PARTITION BY user_id ORDER BY ts)) t;",
      recognizeRecall: [
        "**Spot it:** \"split events into sessions by inactivity gap\".",
        "**Say it:** lag gap > threshold → flag → cumulative sum = session id.",
        "**Trap:** first event (null gap) counts as a new session."
      ]
    },

    {
      id: "session-duration-and-count",
      lc: 302,
      title: "Session duration and event count",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Sessionization rollup", transformation: "Wide (shuffle)", functions: "groupBy, min, max, count" },
      description:
        "Given events already tagged with `session_id`, produce per-session metrics: **start, end, duration (seconds), and event count**.",
      examples: [
        { input: "session s1: 10:00, 10:05, 10:20", output: "s1: start 10:00, end 10:20, duration 1200s, events 3", reasoning: "min/max of ts give the span; count gives events." }
      ],
      approaches: [
        {
          name: "groupBy session → min/max/count",
          whenToUse: "Rolling raw sessionized events up to session-level facts.",
          logic:
            "**What it asks.** One row per session with span, duration, and count.\n\n" +
            "**Key Idea.** After sessionization it's a plain aggregate: `groupBy(user_id, session_id)` then `min(ts)`, `max(ts)`, `count`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Group by user + session.\n" +
            "2. `min(ts)` start, `max(ts)` end, `count('*')` events.\n" +
            "3. `duration = unix(end) - unix(start)`.\n\n" +
            "**Why it works.** Session id already groups the contiguous events; standard aggregates summarize them.\n\n" +
            "**Common Gotchas.**\n" +
            "- Single-event sessions have duration 0 (start == end).\n" +
            "- Include user_id in the key so ids aren't merged across users.\n\n" +
            "**Interview mindset.** Sessionize once, then it's ordinary group-by rollups.",
          rcs:
            "from pyspark.sql.functions import min as _min, max as _max, count, unix_timestamp, col\n" +
            "sessions = (df2.groupBy('user_id', 'session_id').agg(\n" +
            "        _min('ts').alias('start'), _max('ts').alias('end'),\n" +
            "        count('*').alias('events'))\n" +
            "    .withColumn('duration_s', unix_timestamp('end') - unix_timestamp('start')))",
          plain:
            "from pyspark.sql.functions import min as _min, max as _max, count, unix_timestamp\n" +
            "sessions = (df2.groupBy('user_id','session_id').agg(\n" +
            "        _min('ts').alias('start'), _max('ts').alias('end'), count('*').alias('events'))\n" +
            "    .withColumn('duration_s', unix_timestamp('end') - unix_timestamp('start')))"
        }
      ],
      sparkInternals:
        "A single wide aggregate keyed by (user_id, session_id) with partial (map-side) aggregation for min/max/count — cheap and scalable. The duration is a narrow post-aggregate expression.",
      sparkSql:
        "SELECT user_id, session_id, MIN(ts) start, MAX(ts) end,\n  COUNT(*) events, UNIX_TIMESTAMP(MAX(ts))-UNIX_TIMESTAMP(MIN(ts)) duration_s\nFROM sessioned GROUP BY user_id, session_id;",
      recognizeRecall: [
        "**Spot it:** \"session length / #events per session\".",
        "**Say it:** groupBy(user,session) → min/max/count, then diff for duration.",
        "**Trap:** key on user+session; single-event sessions duration 0."
      ]
    },

    {
      id: "bounce-rate-single-event-sessions",
      lc: 303,
      title: "Bounce rate (single-event sessions)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Ratio metric", transformation: "Wide (shuffle)", functions: "count, avg, when" },
      description:
        "Compute the **bounce rate**: the fraction of sessions that contain exactly **one** event.",
      examples: [
        { input: "4 sessions, 3 have 1 event", output: "bounce_rate = 0.75", reasoning: "3 single-event sessions / 4 total sessions." }
      ],
      approaches: [
        {
          name: "Count events per session, then average a bounce flag",
          whenToUse: "Any 'share of groups meeting a size condition'.",
          logic:
            "**What it asks.** Proportion of sessions with a single event.\n\n" +
            "**Key Idea.** Reduce to one row per session with its event count, flag `count == 1`, then take the **mean of the flag** = bounce rate.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Per session: `count('*')` as events.\n" +
            "2. `bounce = (events == 1)` as 1/0.\n" +
            "3. `avg(bounce)` over all sessions.\n\n" +
            "**Why it works.** The mean of a 0/1 flag is exactly the fraction that are 1.\n\n" +
            "**Common Gotchas.**\n" +
            "- Average over *sessions*, not events, or you skew the denominator.\n" +
            "- Segment (device/day) with a groupBy if needed.\n\n" +
            "**Interview mindset.** 'mean of a boolean flag = a rate' is a reusable trick.",
          rcs:
            "from pyspark.sql.functions import count, avg, when, col\n" +
            "per_session = df2.groupBy('user_id', 'session_id').agg(count('*').alias('events'))\n" +
            "bounce = (per_session\n" +
            "    .withColumn('is_bounce', when(col('events') == 1, 1.0).otherwise(0.0))\n" +
            "    .agg(avg('is_bounce').alias('bounce_rate')))",
          plain:
            "from pyspark.sql.functions import count, avg, when, col\n" +
            "per_session = df2.groupBy('user_id','session_id').agg(count('*').alias('events'))\n" +
            "bounce = per_session.agg(avg(when(col('events')==1, 1.0).otherwise(0.0)).alias('bounce_rate'))"
        }
      ],
      sparkInternals:
        "Two aggregates: one wide group-by to collapse events to sessions, then a global (or segmented) average. The 0/1-mean idiom avoids a separate count-of-bounces / count-of-sessions division and its null pitfalls.",
      sparkSql:
        "SELECT AVG(CASE WHEN events = 1 THEN 1.0 ELSE 0.0 END) AS bounce_rate\nFROM (SELECT user_id, session_id, COUNT(*) events\n      FROM sessioned GROUP BY user_id, session_id) s;",
      recognizeRecall: [
        "**Spot it:** \"bounce rate / share of one-event sessions\".",
        "**Say it:** count per session → mean of (count==1) flag.",
        "**Trap:** average over sessions, not events."
      ]
    },

    {
      id: "first-touch-attribution",
      lc: 304,
      title: "First-touch attribution per session",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "First-in-group", transformation: "Window", functions: "row_number, first_value" },
      description:
        "For each session, attribute it to the **channel of its first event** (first-touch attribution). Return one row per session with that channel.",
      examples: [
        { input: "s1: (10:00, google),(10:05, email)", output: "s1 → google", reasoning: "The earliest event in the session is the first touch." }
      ],
      approaches: [
        {
          name: "row_number = 1 per session (ordered by ts)",
          whenToUse: "First/last-in-group selection.",
          logic:
            "**What it asks.** The channel of each session's earliest event.\n\n" +
            "**Key Idea.** Rank events within each session by time and keep `row_number == 1` — the classic first-per-group pattern.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `w = Window.partitionBy(user_id, session_id).orderBy('ts')`.\n" +
            "2. `rn = row_number().over(w)`.\n" +
            "3. Filter `rn == 1`, select the channel.\n\n" +
            "**Why it works.** row_number gives a strict 1..n order; the first row is the first touch.\n\n" +
            "**Common Gotchas.**\n" +
            "- Ties on ts: add a tiebreaker to the orderBy for determinism.\n" +
            "- Last-touch = order desc (or use last_value with the right frame).\n\n" +
            "**Interview mindset.** 'row_number()==1' is the go-to for first-in-group.",
          rcs:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import row_number, col\n" +
            "w = Window.partitionBy('user_id', 'session_id').orderBy('ts')\n" +
            "first_touch = (df2.withColumn('rn', row_number().over(w))\n" +
            "                  .filter(col('rn') == 1)\n" +
            "                  .select('user_id', 'session_id', col('channel').alias('first_channel')))",
          plain:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import row_number, col\n" +
            "w = Window.partitionBy('user_id','session_id').orderBy('ts')\n" +
            "first_touch = (df2.withColumn('rn', row_number().over(w)).filter(col('rn')==1)\n" +
            "                  .select('user_id','session_id', col('channel').alias('first_channel')))"
        }
      ],
      sparkInternals:
        "row_number is a wide window (shuffle by session key, sort by ts). Keeping rn==1 is a first-in-group selection; it's cheaper than a self-join to the per-session min(ts). For last-touch, reverse the order or use a properly framed last_value.",
      sparkSql:
        "SELECT user_id, session_id, channel AS first_channel FROM (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id, session_id ORDER BY ts) rn\n  FROM sessioned) t WHERE rn = 1;",
      recognizeRecall: [
        "**Spot it:** \"first/last touch, first event per session\".",
        "**Say it:** row_number() over (partition session order ts) == 1.",
        "**Trap:** add a tiebreaker for ties; last-touch = order desc."
      ]
    }

  ]);
})();
