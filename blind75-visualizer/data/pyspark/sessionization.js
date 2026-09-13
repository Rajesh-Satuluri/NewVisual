/*
 * PySpark Interview Lab — Sessionization (Cohort & Time-Series)
 * Gap-based sessions: the classic lag + cumulative-sum window pattern that turns
 * a raw event stream into sessions. Registers into "Cohort & Time-Series".
 */
(function () {
  var CAT = "Cohort & Time-Series";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q280
    {
      id: "sessionize-events-gap",
      lc: 280,
      title: "Sessionize an event stream with a 30-minute inactivity gap",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Lag gap flag + running sum (session id)", transformation: "Wide (shuffle)", functions: "Window, lag, unix_timestamp, when, sum" },
      description:
        "Given an `events` DataFrame (`user_id`, `event_type`, `event_time` as a timestamp), assign a `session_id` to every event so that a **gap of more than 30 minutes** between one user's consecutive events starts a new session. This is the canonical sessionization pattern: order each user's events by time, use `lag` to read the previous event's time, flag a row as a *new session* when the gap exceeds 1800 seconds (and when it is the user's first event), then take a **running sum** of that flag over the same window to number the sessions 1, 2, 3, ... per user.",
      examples: [
        {
          input: "user u1: events at 10:00, 10:20, 11:05, 11:10 (same day)",
          output: "session numbers 1, 1, 2, 2",
          reasoning: "10:00 is the first event -> new session 1. 10:20 is 20 min after (<= 30) -> same session 1. 11:05 is 45 min after 10:20 (> 30) -> new session 2. 11:10 is 5 min later -> same session 2. The running sum of the new-session flag (1,0,1,0) gives 1,1,2,2."
        }
      ],
      approaches: [
        {
          name: "lag the previous timestamp, flag gaps > 1800s, running sum the flag",
          whenToUse: "Turning a raw event stream into gap-based sessions per user (the core sessionization pattern).",
          logic:
            "**What it asks.** Group each user's events into sessions where any inactivity gap longer than 30 minutes cuts a new session, and label every event with its session number.\n\n" +
            "**Key Idea.** One window, `partitionBy('user_id').orderBy('event_time')`, does everything. `lag('event_time')` reads the previous event's time; the gap in seconds is `event_time.cast('long') - prev_time.cast('long')` (equivalently `unix_timestamp(event_time) - unix_timestamp(prev_time)`). A row is a **new session** when that gap is null (the user's first event) or greater than 1800. A **running sum** of that 0/1 flag over the same window numbers the sessions monotonically per user.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('user_id').orderBy('event_time')`.\n" +
            "2. Previous time: `prev_ts = lag('event_time').over(w)`.\n" +
            "3. Gap in seconds: `col('event_time').cast('long') - prev_ts.cast('long')` (null on the first event).\n" +
            "4. New-session flag: `when(prev_ts.isNull() | (gap > 1800), 1).otherwise(0)`.\n" +
            "5. Session number: `F.sum('is_new_session').over(w)` — an ordered sum, so its frame is `rowsBetween(unboundedPreceding, currentRow)` by default.\n\n" +
            "**Why it works.** The flag emits a 1 exactly at the start of each session (first event, or any event more than 30 minutes after the previous one) and a 0 otherwise. A cumulative sum of a series of 0s and 1s increments only at those session boundaries, so every event inside the same session shares the same running total — a perfect per-user session id.\n\n" +
            "**Common Gotchas.**\n" +
            "- The first event per user has a null `prev_ts` (no predecessor); you must treat that as the start of session 1, or the arithmetic yields null and the sum breaks. Handle it explicitly with `prev_ts.isNull()`.\n" +
            "- 30 minutes is **1800 seconds**; comparing raw timestamps or minutes is an off-by-unit bug. Cast both times to `long` (epoch seconds) and subtract.\n" +
            "- Use strict `> 1800` if 'more than 30 minutes' means a gap of exactly 30 minutes stays in the session; use `>=` only if the spec says otherwise.\n" +
            "- The session-numbering sum must use the **same ordered window**; an unordered sum would total the whole partition and give every row the same number.\n" +
            "- Add a deterministic tie-breaker to the `orderBy` (e.g. an event id) if two events can share a timestamp, so the ordering — and thus the boundaries — is stable.\n\n" +
            "**Interview mindset.** Say it as a three-move combo over ONE window: 'lag the previous time, flag a gap > 1800s (and the null first event) as a new session, running-sum the flag to number sessions'. Emphasize the first-event null and the 1800-second unit.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.window import Window\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')                              # one user's events together\n" +
            "     .orderBy('event_time'))                              # in chronological order\n" +
            "\n" +
            "prev_ts = F.lag('event_time').over(w)                     # previous event's timestamp (null on first)\n" +
            "\n" +
            "gap_secs = (F.col('event_time').cast('long')\n" +
            "            - prev_ts.cast('long'))                       # seconds since the previous event\n" +
            "\n" +
            "sessions = (events\n" +
            "    .withColumn('prev_ts', prev_ts)\n" +
            "    .withColumn(\n" +
            "        'is_new_session',\n" +
            "        F.when(prev_ts.isNull() | (gap_secs > 1800), 1)   # first event OR gap > 30 min (1800s)\n" +
            "         .otherwise(0))\n" +
            "    .withColumn(\n" +
            "        'session_id',\n" +
            "        F.sum('is_new_session').over(w)))                 # running sum -> 1,1,2,2,... per user\n" +
            "sessions.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.window import Window\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')\n" +
            "     .orderBy('event_time'))\n" +
            "\n" +
            "prev_ts = F.lag('event_time').over(w)\n" +
            "\n" +
            "gap_secs = (F.col('event_time').cast('long')\n" +
            "            - prev_ts.cast('long'))\n" +
            "\n" +
            "sessions = (events\n" +
            "    .withColumn('prev_ts', prev_ts)\n" +
            "    .withColumn(\n" +
            "        'is_new_session',\n" +
            "        F.when(prev_ts.isNull() | (gap_secs > 1800), 1)\n" +
            "         .otherwise(0))\n" +
            "    .withColumn(\n" +
            "        'session_id',\n" +
            "        F.sum('is_new_session').over(w)))\n" +
            "sessions.show()"
        }
      ],
      sparkInternals:
        "The entire pattern runs in ONE window partitioned by `user_id` and ordered by `event_time`, so Spark performs a single **wide** shuffle (hash by `user_id`, sort by `event_time` within each partition) and then makes one sequential pass. `lag` reads the previous event by looking back one row in that ordered partition; the cast-to-long subtraction and the `when` that builds the new-session flag are **narrow**, codegen-fused expressions on top of it. The running `sum` reuses the very same window spec, so it shares the shuffle and the sort — no second exchange — and as an ordered aggregate its frame defaults to `rowsBetween(Window.unboundedPreceding, Window.currentRow)`, which is exactly the cumulative behavior needed to number sessions. Partitioning by user keeps all of one user's events on a single partition, which is what makes both the lag and the running sum correct within that partition. The dominant cost and only real risk is skew: a hyper-active user forms one huge partition that must sort and scan on a single core.",
      sparkSql:
        "SELECT user_id, event_type, event_time,\n" +
        "       SUM(is_new_session) OVER (\n" +
        "         PARTITION BY user_id ORDER BY event_time\n" +
        "         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n" +
        "       ) AS session_id\n" +
        "FROM (\n" +
        "  SELECT user_id, event_type, event_time,\n" +
        "         CASE\n" +
        "           WHEN LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL\n" +
        "             THEN 1\n" +
        "           WHEN CAST(event_time AS BIGINT)\n" +
        "                - CAST(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS BIGINT) > 1800\n" +
        "             THEN 1\n" +
        "           ELSE 0\n" +
        "         END AS is_new_session\n" +
        "  FROM events\n" +
        ") t;",
      recognizeRecall: [
        "**Spot it:** 'sessionize', 'new session after 30 min of inactivity', 'gap-based sessions', 'assign a session id per user'.",
        "**Say it:** one window `partitionBy(user).orderBy(time)` — `lag` the previous time, flag `gap > 1800s` (and the null first event) as new, then `sum` that flag as a running total for the session id.",
        "**Trap:** the first event's lag is null (force it to start session 1); 30 min = 1800 seconds via cast-to-long; the numbering sum must be the SAME ordered window."
      ]
    },

    // ------------------------------------------------------------------ Q281
    {
      id: "sessions-per-user",
      lc: 281,
      title: "Count the number of sessions per user",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Sessionize then count distinct sessions", transformation: "Wide (shuffle)", functions: "Window, lag, sum, when, groupBy, max, countDistinct" },
      description:
        "Building on the sessionization pattern, count **how many sessions each user has**. Once every event carries a per-user `session_id` (from the lag + running-sum trick with a 30-minute gap), the session count for a user is simply the number of distinct session ids — and because the running sum numbers sessions 1, 2, 3, ... in order, the count equals the **maximum** session number per user (or `countDistinct('session_id')`).",
      examples: [
        {
          input: "user u1 events sessionized to session numbers 1,1,2,2,3 ; user u2 to 1,1",
          output: "u1 -> 3 sessions, u2 -> 1 session",
          reasoning: "u1's session ids reach a max of 3, so u1 had 3 sessions; u2's only reach 1, so u2 had a single session. The max session number equals the count because the running sum increments once per session."
        }
      ],
      approaches: [
        {
          name: "sessionize, then max(session_id) per user (== distinct session count)",
          whenToUse: "You already have gap-based session ids and need a per-user session tally.",
          logic:
            "**What it asks.** For each user, the total number of gap-based sessions.\n\n" +
            "**Key Idea.** Reuse the sessionization window to produce `session_id`, then reduce. Since the running sum assigns 1, 2, 3, ... increasing by 1 at each session start, the per-user **maximum** session id is exactly the number of sessions. `groupBy('user_id').agg(F.max('session_id'))` gives it; `F.countDistinct('session_id')` is the equivalent, more literal, form.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sessionize (same as the core problem): window `partitionBy('user_id').orderBy('event_time')`, `lag` the previous time, flag `gap > 1800s` or a null first event, running-`sum` the flag into `session_id`.\n" +
            "2. Reduce per user: `groupBy('user_id').agg(F.max('session_id').alias('num_sessions'))`.\n" +
            "3. (Alternative) `groupBy('user_id').agg(F.countDistinct('session_id').alias('num_sessions'))`.\n\n" +
            "**Why it works.** The running sum increments by exactly 1 at each new session boundary and stays flat inside a session, so the largest value it ever reaches per user is the count of session boundaries — i.e. the number of sessions. Counting distinct ids yields the same number without relying on the ids being contiguous.\n\n" +
            "**Common Gotchas.**\n" +
            "- `max(session_id)` only equals the count because session ids start at 1 and step by 1; if you ever build non-contiguous ids (e.g. a composite key), use `countDistinct` instead.\n" +
            "- Do not `countDistinct` the raw `session_id` across ALL users without grouping by `user_id`, or you will conflate different users' session numbers (both users have a session '1').\n" +
            "- Carry over the first-event and 1800-second handling from the sessionization step; a broken session_id propagates straight into the count.\n\n" +
            "**Interview mindset.** 'Sessionize first, then it's a one-line reduce.' Say the max equals the count because the running sum steps by 1 per session — and offer `countDistinct` as the safe general form.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.window import Window\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')                              # per user\n" +
            "     .orderBy('event_time'))                              # chronological\n" +
            "\n" +
            "prev_ts = F.lag('event_time').over(w)\n" +
            "gap_secs = F.col('event_time').cast('long') - prev_ts.cast('long')\n" +
            "\n" +
            "sessioned = events.withColumn(\n" +
            "    'session_id',\n" +
            "    F.sum(\n" +
            "        F.when(prev_ts.isNull() | (gap_secs > 1800), 1)   # new session at first event or gap > 30 min\n" +
            "         .otherwise(0)\n" +
            "    ).over(w))                                            # running sum -> per-user session number\n" +
            "\n" +
            "result = (sessioned\n" +
            "    .groupBy('user_id')\n" +
            "    .agg(F.max('session_id').alias('num_sessions')))      # max session number == session count\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.window import Window\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')\n" +
            "     .orderBy('event_time'))\n" +
            "\n" +
            "prev_ts = F.lag('event_time').over(w)\n" +
            "gap_secs = F.col('event_time').cast('long') - prev_ts.cast('long')\n" +
            "\n" +
            "sessioned = events.withColumn(\n" +
            "    'session_id',\n" +
            "    F.sum(\n" +
            "        F.when(prev_ts.isNull() | (gap_secs > 1800), 1)\n" +
            "         .otherwise(0)\n" +
            "    ).over(w))\n" +
            "\n" +
            "result = (sessioned\n" +
            "    .groupBy('user_id')\n" +
            "    .agg(F.max('session_id').alias('num_sessions')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Sessionization runs in ONE window partitioned by `user_id` and ordered by `event_time`: a single **wide** shuffle feeds both the `lag` and the running `sum` (which reuse the same spec and its default `rowsBetween(unboundedPreceding, currentRow)` frame), so numbering the sessions costs one exchange plus one sort. The follow-up `groupBy('user_id').agg(max(...))` is a second **wide** aggregation, but `max` supports **map-side partial aggregation**, so only one candidate per user per partition crosses the network. Because both the window and the groupBy are keyed by `user_id`, Catalyst can often reuse the same hash partitioning and avoid a redundant re-shuffle. `countDistinct('session_id')` is heavier than `max` (it must build per-group distinct sets), so prefer `max` when the ids are the contiguous running-sum kind. Skew on a hyper-active user is the main cost, dominating the single-partition sort in the window step.",
      sparkSql:
        "WITH sessioned AS (\n" +
        "  SELECT user_id,\n" +
        "         SUM(CASE\n" +
        "               WHEN LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL THEN 1\n" +
        "               WHEN CAST(event_time AS BIGINT)\n" +
        "                    - CAST(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS BIGINT) > 1800 THEN 1\n" +
        "               ELSE 0\n" +
        "             END) OVER (PARTITION BY user_id ORDER BY event_time) AS session_id\n" +
        "  FROM events\n" +
        ")\n" +
        "SELECT user_id, MAX(session_id) AS num_sessions\n" +
        "FROM sessioned\n" +
        "GROUP BY user_id;",
      recognizeRecall: [
        "**Spot it:** 'how many sessions per user', 'number of visits/sessions each user had', 'session count'.",
        "**Say it:** sessionize with the lag + running-sum trick, then `groupBy(user).agg(max(session_id))` (or `countDistinct`) — max equals the count because the sum steps by 1 per session.",
        "**Trap:** max == count only for contiguous 1-step ids; always group by user before counting so user A's session 1 is not merged with user B's."
      ]
    },

    // ------------------------------------------------------------------ Q282
    {
      id: "average-session-duration-per-user",
      lc: 282,
      title: "Average session duration per user",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Sessionize then two-stage duration aggregate", transformation: "Wide (shuffle)", functions: "Window, lag, sum, when, groupBy, min, max, avg" },
      description:
        "Building on the sessionization pattern, compute each user's **average session duration**. First sessionize the `events` stream (lag + running-sum with a 30-minute gap) so every event has a `session_id`; a single session's duration is `max(event_time) - min(event_time)` within that `(user_id, session_id)`; then average those per-session durations across each user's sessions.",
      examples: [
        {
          input: "u1 session 1: events 10:00,10:20 ; u1 session 2: events 11:05,11:35",
          output: "u1 -> avg 25 min (1500s)",
          reasoning: "Session 1 lasts 20 min (10:00->10:20), session 2 lasts 30 min (11:05->11:35). The average of 20 and 30 minutes is 25 minutes (1500 seconds)."
        }
      ],
      approaches: [
        {
          name: "sessionize, per-session (max - min) duration, then avg per user",
          whenToUse: "Measuring how long sessions last on average, per user — a two-stage aggregation on top of sessionization.",
          logic:
            "**What it asks.** For each user, the mean length (last event minus first event) of their gap-based sessions.\n\n" +
            "**Key Idea.** Duration is a two-stage rollup on top of sessionization. Stage 1: group by `(user_id, session_id)` and take `max(event_time) - min(event_time)` (in seconds via cast-to-long) as that session's duration. Stage 2: group by `user_id` and `avg` those durations.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sessionize: window `partitionBy('user_id').orderBy('event_time')`, `lag` the previous time, flag `gap > 1800s` or a null first event, running-`sum` into `session_id`.\n" +
            "2. Per-session span: `groupBy('user_id', 'session_id').agg((F.max('event_time').cast('long') - F.min('event_time').cast('long')).alias('duration_secs'))`.\n" +
            "3. Per-user average: `groupBy('user_id').agg(F.avg('duration_secs').alias('avg_session_secs'))`.\n\n" +
            "**Why it works.** Within one session all events share the same `session_id`, so `max(time) - min(time)` over that group is precisely the elapsed time from the first to the last event of the session. Averaging those per-session durations for a user gives the mean session length; the two groupBys keep the two levels (per session, then per user) cleanly separated.\n\n" +
            "**Common Gotchas.**\n" +
            "- Compute the span in a numeric unit: subtract `cast('long')` epoch seconds (or use `unix_timestamp`); subtracting raw timestamps does not give you a plain number of seconds.\n" +
            "- A single-event session has duration 0 (max == min). Decide whether those count in the average; including them pulls the mean down, which is usually correct but worth stating.\n" +
            "- Do not average across the wrong grain — you must reduce to one duration per session first, then average per user. Averaging event-level times is meaningless.\n" +
            "- Carry the first-event/1800-second handling from the sessionization step so session boundaries are right before you measure spans.\n\n" +
            "**Interview mindset.** 'Two group-bys: session span = max - min per (user, session), then avg per user.' Mention the seconds unit and how single-event (zero-length) sessions are treated.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.window import Window\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')                              # per user\n" +
            "     .orderBy('event_time'))                              # chronological\n" +
            "\n" +
            "prev_ts = F.lag('event_time').over(w)\n" +
            "gap_secs = F.col('event_time').cast('long') - prev_ts.cast('long')\n" +
            "\n" +
            "sessioned = events.withColumn(\n" +
            "    'session_id',\n" +
            "    F.sum(\n" +
            "        F.when(prev_ts.isNull() | (gap_secs > 1800), 1)   # new session boundary\n" +
            "         .otherwise(0)\n" +
            "    ).over(w))\n" +
            "\n" +
            "per_session = (sessioned\n" +
            "    .groupBy('user_id', 'session_id')                     # one row per session\n" +
            "    .agg((F.max('event_time').cast('long')\n" +
            "          - F.min('event_time').cast('long'))            # last - first event, in seconds\n" +
            "         .alias('duration_secs')))\n" +
            "\n" +
            "result = (per_session\n" +
            "    .groupBy('user_id')\n" +
            "    .agg(F.avg('duration_secs').alias('avg_session_secs')))  # mean session length per user\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.window import Window\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')\n" +
            "     .orderBy('event_time'))\n" +
            "\n" +
            "prev_ts = F.lag('event_time').over(w)\n" +
            "gap_secs = F.col('event_time').cast('long') - prev_ts.cast('long')\n" +
            "\n" +
            "sessioned = events.withColumn(\n" +
            "    'session_id',\n" +
            "    F.sum(\n" +
            "        F.when(prev_ts.isNull() | (gap_secs > 1800), 1)\n" +
            "         .otherwise(0)\n" +
            "    ).over(w))\n" +
            "\n" +
            "per_session = (sessioned\n" +
            "    .groupBy('user_id', 'session_id')\n" +
            "    .agg((F.max('event_time').cast('long')\n" +
            "          - F.min('event_time').cast('long'))\n" +
            "         .alias('duration_secs')))\n" +
            "\n" +
            "result = (per_session\n" +
            "    .groupBy('user_id')\n" +
            "    .agg(F.avg('duration_secs').alias('avg_session_secs')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The sessionization step is ONE window partitioned by `user_id` and ordered by `event_time`, so `lag` and the running `sum` share a single **wide** shuffle and sort (the ordered sum's default frame `rowsBetween(unboundedPreceding, currentRow)` gives the cumulative session id). Then two aggregations follow: `groupBy('user_id', 'session_id')` shuffles by the composite key to collapse each session to one `(max - min)` duration, and `groupBy('user_id')` averages those. Both `min`/`max` and `avg` (which carries a sum and a count) support **map-side partial aggregation**, so only compact partial results cross the network. Because everything is keyed on `user_id` (with `session_id` nested inside it), the composite-key shuffle already co-locates a user's sessions, and the final per-user average is a cheap re-aggregation. Skew on a heavy user dominates both the window sort and the first groupBy.",
      sparkSql:
        "WITH sessioned AS (\n" +
        "  SELECT user_id, event_time,\n" +
        "         SUM(CASE\n" +
        "               WHEN LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL THEN 1\n" +
        "               WHEN CAST(event_time AS BIGINT)\n" +
        "                    - CAST(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS BIGINT) > 1800 THEN 1\n" +
        "               ELSE 0\n" +
        "             END) OVER (PARTITION BY user_id ORDER BY event_time) AS session_id\n" +
        "  FROM events\n" +
        "),\n" +
        "per_session AS (\n" +
        "  SELECT user_id, session_id,\n" +
        "         CAST(MAX(event_time) AS BIGINT) - CAST(MIN(event_time) AS BIGINT) AS duration_secs\n" +
        "  FROM sessioned\n" +
        "  GROUP BY user_id, session_id\n" +
        ")\n" +
        "SELECT user_id, AVG(duration_secs) AS avg_session_secs\n" +
        "FROM per_session\n" +
        "GROUP BY user_id;",
      recognizeRecall: [
        "**Spot it:** 'average session length/duration per user', 'how long do sessions last on average', 'mean time on site per session'.",
        "**Say it:** sessionize, then two group-bys — `max(time)-min(time)` per `(user, session)` in seconds, then `avg` per user.",
        "**Trap:** subtract cast-to-long seconds (not raw timestamps); single-event sessions have duration 0 — decide whether they count in the mean."
      ]
    },

    // ------------------------------------------------------------------ Q283
    {
      id: "events-per-session-longest-session",
      lc: 283,
      title: "Events per session and each user's longest session by event count",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Sessionize then count per session + max per user", transformation: "Wide (shuffle)", functions: "Window, lag, sum, when, groupBy, count, max" },
      description:
        "Building on the sessionization pattern, compute the **number of events in each session**, and then, for each user, the **longest session by event count**. Sessionize the `events` stream (lag + running-sum with a 30-minute gap), count rows per `(user_id, session_id)` to get events-per-session, and take the `max` of those counts per user for the busiest session.",
      examples: [
        {
          input: "u1 sessions: session 1 has 2 events, session 2 has 5 events, session 3 has 1 event",
          output: "events per session -> 2, 5, 1 ; u1 longest session -> 5 events",
          reasoning: "Counting rows per session gives 2, 5 and 1. The user's longest session by event count is the one with 5 events, so the per-user max is 5."
        }
      ],
      approaches: [
        {
          name: "sessionize, count events per (user, session), then max count per user",
          whenToUse: "Measuring session weight by activity (event count) and finding each user's busiest session.",
          logic:
            "**What it asks.** How many events each session contains, and the largest such count per user.\n\n" +
            "**Key Idea.** Once events carry a `session_id`, events-per-session is a plain `count` grouped by `(user_id, session_id)`. The longest session per user is then the `max` of those counts grouped by `user_id`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sessionize: window `partitionBy('user_id').orderBy('event_time')`, `lag` the previous time, flag `gap > 1800s` or a null first event, running-`sum` into `session_id`.\n" +
            "2. Events per session: `session_counts = sessioned.groupBy('user_id', 'session_id').agg(F.count('*').alias('event_count'))`.\n" +
            "3. Longest session per user: `session_counts.groupBy('user_id').agg(F.max('event_count').alias('longest_session_events'))`.\n\n" +
            "**Why it works.** Every event in a session shares the same `session_id`, so counting rows per `(user_id, session_id)` is exactly the events-per-session figure. Taking the per-user `max` of those counts selects the session with the most activity — the longest by event count.\n\n" +
            "**Common Gotchas.**\n" +
            "- 'Longest' here means most events, not most elapsed time — a short-but-busy session can beat a long idle one. Be explicit about which 'longest' the question wants (event count vs duration).\n" +
            "- `count('*')` counts all rows including duplicates; use `countDistinct` on an event id only if the spec wants unique events.\n" +
            "- If you also need *which* session is longest (its id), keep `session_id` and use a rank/`row_number` over the counts instead of a bare `max`, or join the max back.\n" +
            "- Carry the first-event/1800-second handling from sessionization so the session grouping is correct before you count.\n\n" +
            "**Interview mindset.** 'Sessionize, count per (user, session), max per user.' Clarify 'longest = event count vs duration' up front, and note the rank variant if the interviewer also wants the winning session's id.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.window import Window\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')                              # per user\n" +
            "     .orderBy('event_time'))                              # chronological\n" +
            "\n" +
            "prev_ts = F.lag('event_time').over(w)\n" +
            "gap_secs = F.col('event_time').cast('long') - prev_ts.cast('long')\n" +
            "\n" +
            "sessioned = events.withColumn(\n" +
            "    'session_id',\n" +
            "    F.sum(\n" +
            "        F.when(prev_ts.isNull() | (gap_secs > 1800), 1)   # new session boundary\n" +
            "         .otherwise(0)\n" +
            "    ).over(w))\n" +
            "\n" +
            "session_counts = (sessioned\n" +
            "    .groupBy('user_id', 'session_id')                     # one row per session\n" +
            "    .agg(F.count('*').alias('event_count')))             # events in that session\n" +
            "\n" +
            "longest = (session_counts\n" +
            "    .groupBy('user_id')\n" +
            "    .agg(F.max('event_count').alias('longest_session_events')))  # busiest session per user\n" +
            "\n" +
            "session_counts.show()\n" +
            "longest.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.window import Window\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('user_id')\n" +
            "     .orderBy('event_time'))\n" +
            "\n" +
            "prev_ts = F.lag('event_time').over(w)\n" +
            "gap_secs = F.col('event_time').cast('long') - prev_ts.cast('long')\n" +
            "\n" +
            "sessioned = events.withColumn(\n" +
            "    'session_id',\n" +
            "    F.sum(\n" +
            "        F.when(prev_ts.isNull() | (gap_secs > 1800), 1)\n" +
            "         .otherwise(0)\n" +
            "    ).over(w))\n" +
            "\n" +
            "session_counts = (sessioned\n" +
            "    .groupBy('user_id', 'session_id')\n" +
            "    .agg(F.count('*').alias('event_count')))\n" +
            "\n" +
            "longest = (session_counts\n" +
            "    .groupBy('user_id')\n" +
            "    .agg(F.max('event_count').alias('longest_session_events')))\n" +
            "\n" +
            "session_counts.show()\n" +
            "longest.show()"
        }
      ],
      sparkInternals:
        "Sessionization is ONE window partitioned by `user_id` and ordered by `event_time`: `lag` and the running `sum` share a single **wide** shuffle and sort, and the ordered sum's default `rowsBetween(unboundedPreceding, currentRow)` frame yields the cumulative session id. The `groupBy('user_id', 'session_id').count()` is a **wide** composite-key aggregation, but `count` is a textbook **map-side partial** aggregate, so each partition emits per-session subtotals and only those cross the network. The follow-up `groupBy('user_id').agg(max(...))` re-aggregates the per-session counts; `max` is likewise partially aggregated, and since both group-bys lead with `user_id`, a user's sessions are already co-located, keeping the second exchange light. If you needed the winning session's id as well, you would add a `row_number`/`rank` window over the counts (another ordered window) rather than a bare `max`. A single hyper-active user is the skew hotspot in the window sort and the first groupBy.",
      sparkSql:
        "WITH sessioned AS (\n" +
        "  SELECT user_id,\n" +
        "         SUM(CASE\n" +
        "               WHEN LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) IS NULL THEN 1\n" +
        "               WHEN CAST(event_time AS BIGINT)\n" +
        "                    - CAST(LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS BIGINT) > 1800 THEN 1\n" +
        "               ELSE 0\n" +
        "             END) OVER (PARTITION BY user_id ORDER BY event_time) AS session_id\n" +
        "  FROM events\n" +
        "),\n" +
        "session_counts AS (\n" +
        "  SELECT user_id, session_id, COUNT(*) AS event_count\n" +
        "  FROM sessioned\n" +
        "  GROUP BY user_id, session_id\n" +
        ")\n" +
        "SELECT user_id, MAX(event_count) AS longest_session_events\n" +
        "FROM session_counts\n" +
        "GROUP BY user_id;",
      recognizeRecall: [
        "**Spot it:** 'events per session', 'busiest/longest session by number of events', 'most active session per user'.",
        "**Say it:** sessionize, `count('*')` per `(user, session)` for events-per-session, then `max` per user for the longest one.",
        "**Trap:** 'longest' by event count is not the same as by duration — clarify which; use a rank window if you also need the winning session's id."
      ]
    }

  ]);
})();
