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
    }
  ]
};
