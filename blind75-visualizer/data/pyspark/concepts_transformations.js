/*
 * data/pyspark/concepts_transformations.js — PySpark "Learn" topics.
 * Registered into window.LEARN under the "spark" stack. Content grounded in
 * Spark execution semantics; teaching structure mirrors the Python lab.
 * Siblings of "Narrow vs Wide (Shuffle)" in the same Transformations section.
 */
window.LEARN.register("spark", "Transformations", [
  {
    id: "groupby-aggregations",
    title: "GroupBy & Aggregations",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "groupBy().agg(...) is how you collapse millions of rows into per-key summaries — and Spark makes it cheap by adding up partial results before the shuffle.",

    whatIsIt: [
      "An <b>aggregation</b> reduces many rows to a few: total revenue per country, orders per customer, average latency per endpoint. In PySpark you express it as <code>df.groupBy(keys).agg(...)</code>, passing one or more aggregate functions from <code>pyspark.sql.functions</code> such as <code>F.sum</code>, <code>F.count</code>, <code>F.avg</code>, <code>F.min</code>, <code>F.max</code>.",
      "<code>groupBy</code> is a <b>wide</b> transformation: rows sharing a key must meet on one executor, so Spark inserts a <b>shuffle</b> (an <code>Exchange</code> in the plan). But it is a cheap wide step — Spark first does a <b>partial (map-side) aggregation</b> on each partition, so only one partial value per key travels the network instead of every raw row.",
      "<code>.agg(...)</code> takes multiple expressions at once and you can <code>.alias(...)</code> each output column. For reshaping one categorical column into many columns, <code>groupBy(...).pivot(col).agg(...)</code> produces a cross-tab; always list the pivot values explicitly when you know them, so Spark skips a scan to discover them."
    ],

    showMe: {
      code:
        "# One shuffle, several aggregates computed together\n" +
        "summary = (df.groupBy('country')\n" +
        "             .agg(F.sum('amount').alias('revenue'),\n" +
        "                  F.count('*').alias('orders'),\n" +
        "                  F.avg('amount').alias('avg_ticket'),\n" +
        "                  F.countDistinct('customer_id').alias('customers')))\n" +
        "\n" +
        "# Filter AFTER aggregating = the SQL HAVING clause\n" +
        "big = summary.filter(F.col('revenue') > 1_000_000)\n" +
        "\n" +
        "# Pivot: list the values so Spark doesn't scan to find them\n" +
        "by_month = (df.groupBy('country')\n" +
        "              .pivot('month', ['Jan', 'Feb', 'Mar'])\n" +
        "              .agg(F.sum('amount')))\n" +
        "\n" +
        "# The plan shows partial agg BEFORE the Exchange (shuffle)\n" +
        "summary.explain()\n" +
        "# +- HashAggregate(keys=[country])            <- final agg\n" +
        "#    +- Exchange hashpartitioning(country)    <- THE SHUFFLE\n" +
        "#       +- HashAggregate(keys=[country])      <- PARTIAL agg (map-side)",
      caption:
        "All four aggregates ride one shuffle. Note the two HashAggregate nodes around the single Exchange: Spark sums locally first (partial agg), then only the partial values are shuffled and combined."
    },

    whyMatters:
      "<p>Aggregations are the payload of most analytics and ETL jobs — the report, the rollup, the feature table. Getting them right is mostly about doing the reduction with as little data crossing the network as possible.</p>" +
      "<p>The instincts that pay off:</p>" +
      "<ul>" +
      "<li><b>Compute all aggregates in one <code>.agg(...)</code></b> — several sums/counts share a single shuffle instead of paying for one each.</li>" +
      "<li><b>Filter and select narrow columns before <code>groupBy</code></b> — shrink the rows and width that feed the shuffle.</li>" +
      "<li><b>Use built-in <code>F.*</code> functions, not a Python UDF</b> — only built-ins get the partial (map-side) aggregation that keeps the shuffle small.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">df.groupBy('k').agg(F.sum('v'))   # partial sums shuffled: cheap\n" +
      "df.groupBy('k').applyInPandas(udf)  # raw rows shuffled: expensive</pre>",

    recognize: [
      { q: "\"Revenue per country / orders per customer / daily active users.\"", think: "A groupBy + agg. Pick the keys, then one .agg(...) with every F.sum / F.count you need." },
      { q: "\"I need the equivalent of SQL HAVING.\"", think: "Aggregate first, then .filter() on the aggregated column — filtering after groupBy is HAVING." },
      { q: "\"Turn rows of (country, month, amount) into a country x month grid.\"", think: "groupBy('country').pivot('month', [values]).agg(F.sum('amount')). List the pivot values to avoid an extra scan." },
      { q: "\"My groupBy job is slow even though the result is tiny.\"", think: "Check for a Python UDF aggregate (no map-side combine) or too-wide input rows; filter/select before the groupBy." },
      { q: "\"Count of distinct users per group.\"", think: "F.countDistinct('user_id') inside agg, or approx_count_distinct for a fast approximate answer on huge data." }
    ],

    matchTags: ["groupby", "agg", "aggregation", "sum", "count", "avg", "pivot"],

    traps: [
      {
        bad: "df.groupBy('k').sum('a')\n... df.groupBy('k').avg('b')  # two separate shuffles",
        good: "df.groupBy('k').agg(F.sum('a'), F.avg('b'))  # one shuffle",
        why: "Each groupBy is its own wide step with its own shuffle. Ask for every aggregate in a single .agg(...) so they share one pass and one shuffle."
      },
      {
        bad: "df.groupBy('k').pivot('month').agg(F.sum('v'))  # scans to find month values",
        good: "df.groupBy('k').pivot('month', ['Jan','Feb','Mar']).agg(F.sum('v'))",
        why: "Without an explicit value list, pivot runs an extra distinct pass over the data to discover the columns. Supplying the values you already know skips that scan."
      },
      {
        bad: "df.groupBy('k').agg(my_python_udf('v'))  # no map-side combine",
        good: "df.groupBy('k').agg(F.sum('v'))            # partial aggregation kicks in",
        why: "Built-in aggregate functions get partial (map-side) aggregation, so only partial results shuffle. A generic Python UDF forces every raw row through the shuffle."
      }
    ],

    complexity: [
      { op: "groupBy + agg (built-in F.*)", big_o: "O(n) + shuffle", note: "Spark runs a partial aggregate on each partition first, so only one partial value per key crosses the shuffle rather than every raw row — the reason built-in aggregations are cheap wide steps." },
      { op: "multiple aggregates in one .agg(...)", big_o: "O(n) + 1 shuffle", note: "Any number of sums/counts/avgs computed in a single agg share the same shuffle, so adding aggregates is nearly free once you have paid for the one Exchange." },
      { op: "countDistinct in a groupBy", big_o: "O(n) + shuffle", note: "Distinct counting cannot fully combine map-side, so more data moves through the shuffle than a plain sum; approx_count_distinct trades exactness for a much smaller shuffle." },
      { op: "pivot with explicit values", big_o: "O(n) + shuffle", note: "One shuffle like an ordinary groupBy; omitting the value list adds a separate distinct scan before that shuffle to discover the pivot columns." },
      { op: "UDF aggregate (no partial agg)", big_o: "O(n) + heavy shuffle", note: "Without map-side combine every raw row is shuffled to its key before reduction, so the shuffle carries the full dataset instead of compact partial results." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A built-in aggregation runs in two halves around the shuffle. First a <b>partial (map-side) aggregate</b> reduces each partition locally — you see two <code>HashAggregate</code> nodes in <code>explain()</code>, one below the <code>Exchange</code> and one above. Only the per-partition partial values are shuffled, then the final aggregate combines them. This map-side combine is why <code>groupBy().agg()</code> on built-ins is a <i>cheap</i> wide step.</p>" +
      "<p>This mirrors the classic RDD intuition: <code>reduceByKey</code> combines on the map side before shuffling (like the partial agg here), whereas <code>groupByKey</code> ships every raw value across the network first. The DataFrame API always gives you the <code>reduceByKey</code>-style behavior for built-in aggregates — another reason to prefer <code>F.*</code> over UDFs.</p>" +
      "<p>The post-shuffle partition count comes from <code>spark.sql.shuffle.partitions</code> (default 200); with Adaptive Query Execution on, Spark coalesces the tiny partitions a small aggregate result produces.</p>",

    challenge: {
      prompt:
        "From an orders table with columns (customer_id, country, amount, status), produce one row per country with: total revenue, number of orders, number of distinct customers, and average order value — using a single shuffle. Only 'completed' orders should count.",
      starter:
        "orders \\\n" +
        "  .filter(???)              # keep only completed\n" +
        "  .groupBy(???)             # one row per country\n" +
        "  .agg(???)                 # revenue, orders, customers, avg ticket",
      solution:
        "result = (orders\n" +
        "          .filter(F.col('status') == 'completed')  # narrow: shrink first\n" +
        "          .groupBy('country')\n" +
        "          .agg(F.sum('amount').alias('revenue'),\n" +
        "               F.count('*').alias('orders'),\n" +
        "               F.countDistinct('customer_id').alias('customers'),\n" +
        "               F.avg('amount').alias('avg_ticket')))\n" +
        "# Filtering before groupBy shrinks the shuffle input; all four aggregates\n" +
        "# ride ONE shuffle because they are in a single .agg(...)."
    }
  },

  {
    id: "joins-broadcast",
    title: "Joins & Broadcast",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "A default join shuffles BOTH tables on the key; broadcasting the small side turns the join into a narrow, shuffle-free step for the big table.",

    whatIsIt: [
      "<code>df.join(other, on, how)</code> combines two DataFrames on a key. The <code>how</code> can be <code>'inner'</code> (default), <code>'left'</code>, <code>'right'</code>, <code>'outer'</code>, <code>'left_semi'</code>, or <code>'left_anti'</code>. Joining on a shared column name (<code>on='id'</code>) also de-duplicates the key column in the output.",
      "By default Spark runs a <b>sort-merge join</b>: it <b>shuffles both sides</b> on the join key so matching rows land on the same executor, sorts each side, then merges. Two shuffles' worth of data movement — expensive when either table is large.",
      "When one side is small, a <b>broadcast (map-side) join</b> avoids all of that: Spark copies the small table to every executor and joins in place, so the <b>big side is never shuffled</b>. Spark does this automatically when a side is under <code>spark.sql.autoBroadcastJoinThreshold</code> (default 10MB), or you can force it with <code>F.broadcast(small_df)</code>."
    ],

    showMe: {
      code:
        "# DEFAULT sort-merge join: BOTH sides shuffle on 'country_code'\n" +
        "joined = big_events.join(country_dim, 'country_code', 'left')\n" +
        "\n" +
        "# BROADCAST the small side: big_events is NOT shuffled\n" +
        "joined = big_events.join(F.broadcast(country_dim), 'country_code', 'left')\n" +
        "\n" +
        "# Joining on differently-named keys (keep both columns)\n" +
        "j2 = orders.join(users, orders.user_id == users.id, 'inner')\n" +
        "\n" +
        "# Confirm the strategy in the plan\n" +
        "joined.explain()\n" +
        "# BroadcastHashJoin [country_code], ...        <- no Exchange on big side\n" +
        "#  :- FileScan big_events\n" +
        "#  +- BroadcastExchange HashedRelationBroadcastMode(...)  <- small side only\n" +
        "#     +- FileScan country_dim",
      caption:
        "With F.broadcast the plan becomes a BroadcastHashJoin: only the small dimension gets a BroadcastExchange, and there is no Exchange (shuffle) on the big fact table at all."
    },

    whyMatters:
      "<p>Joins are where Spark jobs most often fall over — a fact table joined naively shuffles billions of rows, and a skewed key drags one task on for hours. The single most valuable join instinct is: <b>is one side small enough to broadcast?</b></p>" +
      "<ul>" +
      "<li><b>Broadcast dimension / lookup tables</b> — <code>F.broadcast(dim)</code> removes the big side's shuffle entirely, converting a wide join into a narrow one.</li>" +
      "<li><b>Filter and project before joining</b> — fewer, narrower rows on both sides means smaller shuffles (or a side that now fits the broadcast threshold).</li>" +
      "<li><b>Watch for skew</b> — one hot key (nulls, a default id) can hold most of the rows; salt the key or let AQE's skew-join handling split it.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">big.join(small, 'id')             # sort-merge: BOTH sides shuffle\n" +
      "big.join(F.broadcast(small), 'id')  # broadcast: big side stays put</pre>",

    recognize: [
      { q: "\"Join a huge fact table to a small lookup/dimension table.\"", think: "Broadcast the small side: big.join(F.broadcast(dim), 'key'). The big table is never shuffled." },
      { q: "\"One task in my join runs forever while the rest finish.\"", think: "Skew — a hot join key holds most rows. Salt the key, or enable AQE (spark.sql.adaptive.skewJoin.enabled)." },
      { q: "\"I only want rows of A that have (or don't have) a match in B.\"", think: "left_semi keeps matching rows of A (no B columns); left_anti keeps non-matching rows of A." },
      { q: "\"My broadcast join silently became a sort-merge join.\"", think: "The 'small' side grew past spark.sql.autoBroadcastJoinThreshold (10MB). Filter it down, raise the threshold, or accept the shuffle." },
      { q: "\"Duplicate key column after the join.\"", think: "Join with on='col' (string) to collapse the shared key; join on an equality expression keeps both columns." }
    ],

    matchTags: ["join", "broadcast", "inner join", "left join", "skew"],

    traps: [
      {
        bad: "big.join(small, 'id')                # sort-merge: both sides shuffle",
        good: "big.join(F.broadcast(small), 'id')   # broadcast: big side never shuffles",
        why: "A default join shuffles BOTH tables on the key. If one side fits in memory, broadcasting it eliminates the big table's shuffle entirely and makes the join a narrow, map-side step."
      },
      {
        bad: "F.broadcast(huge_df)                 # OOMs the driver / executors",
        good: "big.join(F.broadcast(small_dim), 'id')  # only broadcast a genuinely small side",
        why: "Broadcast copies the whole table to every executor via the driver. Broadcasting something that is not small blows up driver memory — it is a fix for the SMALL side only."
      },
      {
        bad: "a.join(b).filter(F.col('x') > 0)     # join first, then throw rows away",
        good: "a.filter(F.col('x') > 0).join(b)     # shrink before the shuffle",
        why: "Filtering before the join shrinks the data that feeds the shuffle. Push filters and column pruning ahead of any wide step, joins included."
      }
    ],

    complexity: [
      { op: "sort-merge join (default)", big_o: "O(n log n) + 2 shuffles", note: "Both sides are shuffled on the key and sorted before merging, so the network carries both full tables — the costliest common join and the default for two large inputs." },
      { op: "broadcast hash join", big_o: "O(n) + broadcast", note: "The small side is copied to every executor and the big side is scanned in place, so there is no shuffle of the big table at all — a wide join collapses to a narrow step." },
      { op: "join then filter", big_o: "O(n log n) + shuffle", note: "Filtering after the join still pays the full join shuffle on rows you discard; pushing the filter before the join shrinks the shuffle input." },
      { op: "skewed-key join", big_o: "O(n) + skewed shuffle", note: "A hot key sends most rows to one reduce task during the shuffle, so one task dominates runtime; salting or AQE skew-join splits that partition." },
      { op: "left_semi / left_anti join", big_o: "O(n) + shuffle", note: "Still a shuffle join on the key, but only the left side's columns survive, so less data is carried past the join than a full inner/outer join." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Spark picks the join strategy from size estimates. If a side's estimated size is below <code>spark.sql.autoBroadcastJoinThreshold</code> (default <code>10485760</code>, i.e. 10MB) it chooses a <b>BroadcastHashJoin</b>; otherwise a <b>SortMergeJoin</b> that shuffles and sorts both sides. Setting the threshold to <code>-1</code> disables auto-broadcast entirely.</p>" +
      "<p><code>F.broadcast(df)</code> is a hint that overrides the estimate and forces the broadcast — useful when Spark's stats undercount or overcount the small side. The small table is collected to the driver, then shipped to every executor as a <code>BroadcastExchange</code>; the big side keeps its partitions and joins locally, so no <code>Exchange</code> appears on it.</p>" +
      "<p>Adaptive Query Execution (Spark 3.x) can flip a planned sort-merge join to a broadcast join at runtime once it measures a side is actually small, and can split skewed partitions (<code>spark.sql.adaptive.skewJoin.enabled</code>) so one hot key no longer stalls a single task.</p>",

    challenge: {
      prompt:
        "You join a 2-billion-row clickstream to a 300-row campaign lookup on 'campaign_id', then keep only clicks from campaigns of type 'paid'. Write it so the clickstream is never shuffled, and say which join strategy the plan should show.",
      starter:
        "clicks \\\n" +
        "  .join(campaigns, 'campaign_id')   # which strategy? is clicks shuffled?\n" +
        "  .filter(???)                      # keep only paid campaigns\n" +
        "# how do you keep clicks off the shuffle?",
      solution:
        "result = (clicks\n" +
        "          .join(F.broadcast(campaigns.filter(F.col('type') == 'paid')),\n" +
        "                'campaign_id'))\n" +
        "# Filter the tiny lookup FIRST, then broadcast it: the 2B-row clickstream\n" +
        "# is never shuffled. explain() should show a BroadcastHashJoin with a\n" +
        "# BroadcastExchange only on the campaigns side and NO Exchange on clicks."
    }
  },

  {
    id: "window-functions-spark",
    title: "Window Functions",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "Window functions rank, number, and compute running totals WITHIN each group — without collapsing the rows the way groupBy does.",

    whatIsIt: [
      "A <b>window function</b> computes a value across a set of rows related to the current row, but keeps every row in the output. Unlike <code>groupBy</code>, which collapses a group to one row, a window lets you attach a per-group rank, row number, running total, or a value from a neighbouring row to each original row.",
      "You define the window with <code>Window.partitionBy(...)</code> (the groups) and usually <code>.orderBy(...)</code> (the order within each group), then apply a function <code>.over(w)</code>. Ranking uses <code>F.row_number()</code>, <code>F.rank()</code>, <code>F.dense_rank()</code>; offsets use <code>F.lag()</code> / <code>F.lead()</code>; running aggregates use <code>F.sum(...).over(w)</code>.",
      "Windows are a <b>wide</b> operation — Spark shuffles rows so each partition's group lands together, then sorts within the partition. The classic <b>top-N-per-group</b> pattern is: number rows with <code>row_number()</code> ordered by the metric, then <code>filter</code> the number &le; N."
    ],

    showMe: {
      code:
        "from pyspark.sql import Window\n" +
        "\n" +
        "# Rank orders within each customer by amount (highest first)\n" +
        "w = Window.partitionBy('customer_id').orderBy(F.col('amount').desc())\n" +
        "ranked = df.withColumn('rn', F.row_number().over(w))\n" +
        "\n" +
        "# Top 3 orders per customer\n" +
        "top3 = ranked.filter(F.col('rn') <= 3)\n" +
        "\n" +
        "# Running total: an EXPLICIT frame from start of partition to current row\n" +
        "wt = (Window.partitionBy('customer_id')\n" +
        "            .orderBy('order_date')\n" +
        "            .rowsBetween(Window.unboundedPreceding, Window.currentRow))\n" +
        "running = df.withColumn('cumulative', F.sum('amount').over(wt))\n" +
        "\n" +
        "# Compare each row to the previous one in the group\n" +
        "wl = Window.partitionBy('customer_id').orderBy('order_date')\n" +
        "delta = df.withColumn('prev', F.lag('amount', 1).over(wl)) \\\n" +
        "          .withColumn('change', F.col('amount') - F.col('prev'))",
      caption:
        "One partitionBy/orderBy window drives ranking, running totals, and lag/lead. For the running total the frame is stated explicitly with rowsBetween — see the trap below for why that matters."
    },

    whyMatters:
      "<p>Window functions answer a huge class of real questions in one pass: top-N per category, running / cumulative totals, month-over-month change, first and last event per user, deduplication by keeping the latest row. Doing these without windows usually means a self-join or a groupBy-then-join — more code and more shuffles.</p>" +
      "<ul>" +
      "<li><b>Top-N per group</b> = <code>row_number().over(partitionBy(g).orderBy(metric.desc()))</code> then filter &le; N.</li>" +
      "<li><b>Deduplicate keeping latest</b> = <code>row_number()</code> ordered by timestamp desc, keep <code>rn == 1</code>.</li>" +
      "<li><b>Running total</b> = <code>F.sum(x).over(w)</code> with an explicit row frame.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">w = Window.partitionBy('user').orderBy(F.col('ts').desc())\n" +
      "latest = df.withColumn('rn', F.row_number().over(w)).filter('rn = 1')</pre>",

    recognize: [
      { q: "\"Top 3 products per category / highest order per customer.\"", think: "row_number().over(partitionBy(category).orderBy(metric.desc())), then filter rn <= N." },
      { q: "\"Running / cumulative total over time.\"", think: "F.sum(x).over(partitionBy(...).orderBy(date).rowsBetween(unboundedPreceding, currentRow)) — state the frame." },
      { q: "\"Change vs the previous row (month-over-month, day-over-day).\"", think: "F.lag(x).over(partitionBy(...).orderBy(date)); subtract from the current value. F.lead looks forward." },
      { q: "\"Keep only the latest record per key (dedupe).\"", think: "row_number() ordered by timestamp desc, keep rn == 1 — a window is cleaner than a groupBy + join." },
      { q: "\"My running total includes rows it shouldn't / ties behave oddly.\"", think: "It's the frame. An orderBy window defaults to a RANGE frame; use rowsBetween for a true row-by-row cumulative sum." }
    ],

    matchTags: ["window", "over", "partitionby", "rank", "row_number", "lag", "lead", "running total"],

    traps: [
      {
        bad: "w = Window.partitionBy('u').orderBy('d')\n" +
             "F.sum('x').over(w)   # default RANGE frame, not what you expect",
        good: "w = Window.partitionBy('u').orderBy('d') \\\n" +
              "        .rowsBetween(Window.unboundedPreceding, Window.currentRow)\n" +
              "F.sum('x').over(w)   # true row-by-row running total",
        why: "An aggregate over a window WITH orderBy but NO explicit frame defaults to RANGE unboundedPreceding..currentRow. On ties (equal order values) RANGE lumps them into one bucket, so a running total can jump. State rowsBetween for a real cumulative sum."
      },
      {
        bad: "w = Window.partitionBy('u')  # no orderBy\n" +
             "F.row_number().over(w)       # ordering is nondeterministic",
        good: "w = Window.partitionBy('u').orderBy(F.col('ts').desc())\n" +
              "F.row_number().over(w)",
        why: "row_number / rank / lag / lead need a deterministic order. Without orderBy the numbering is arbitrary and changes run to run — always order the window for these functions."
      },
      {
        bad: "F.rank().over(w)   # leaves gaps after ties: 1,2,2,4",
        good: "F.dense_rank().over(w)   # no gaps: 1,2,2,3  (or row_number for unique)",
        why: "rank() skips numbers after ties; dense_rank() does not; row_number() forces a unique sequence with no ties. Pick the one that matches how you want ties handled."
      }
    ],

    complexity: [
      { op: "row_number / rank over a window", big_o: "O(n) + shuffle + sort", note: "Spark shuffles rows so each partitionBy group is co-located, then sorts within the partition by the orderBy — a wide step much like groupBy but keeping all rows." },
      { op: "running total (rowsBetween)", big_o: "O(n) + shuffle + sort", note: "Same shuffle-and-sort as ranking; the cumulative sum is then a single ordered pass over each group's rows on its executor." },
      { op: "lag / lead over a window", big_o: "O(n) + shuffle + sort", note: "Requires the group co-located and ordered by the shuffle and sort, after which reading the neighbouring row is local and cheap." },
      { op: "top-N-per-group (window + filter)", big_o: "O(n) + shuffle + sort", note: "One window shuffle plus a narrow filter on the row number; far cheaper than the self-join alternative, which would add another shuffle." },
      { op: "window with NO partitionBy", big_o: "O(n) + single-partition shuffle", note: "Every row shuffles to ONE partition so a single executor sorts the whole dataset — a serialization bottleneck; always partitionBy when you can." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A window with <code>partitionBy</code> plans as an <code>Exchange hashpartitioning(keys)</code> (the shuffle) followed by a <code>Sort</code> on the order columns, then a <code>Window</code> node. So a window function costs roughly one groupBy-style shuffle plus a sort — but unlike groupBy it emits every input row, not one per group.</p>" +
      "<p><b>The frame gotcha.</b> When you apply an aggregate (<code>F.sum</code>, <code>F.avg</code>) over a window that HAS an <code>orderBy</code> but you do not state a frame, Spark uses the default <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. RANGE groups rows with equal order values together, so ties can make a running total leap. Use <code>rowsBetween(Window.unboundedPreceding, Window.currentRow)</code> for a true per-row cumulative sum, and <code>rowsBetween</code>/<code>rangeBetween</code> deliberately for sliding windows.</p>" +
      "<p><b>Omitting partitionBy</b> is dangerous at scale: the window then has a single partition, so all rows shuffle to one executor to be sorted — a guaranteed bottleneck. Always partition by a key with enough distinct values to spread the work.</p>",

    challenge: {
      prompt:
        "From a sales table (store_id, sale_date, amount), for each store produce a running cumulative revenue ordered by date, AND the rank of each day's amount within the store (highest = 1). Make the running total tie-safe.",
      starter:
        "from pyspark.sql import Window\n" +
        "w_run = Window.partitionBy(???).orderBy(???)   # what frame?\n" +
        "w_rank = Window.partitionBy(???).orderBy(???)\n" +
        "sales \\\n" +
        "  .withColumn('cumulative', ???) \\\n" +
        "  .withColumn('day_rank', ???)",
      solution:
        "from pyspark.sql import Window\n" +
        "\n" +
        "w_run = (Window.partitionBy('store_id')\n" +
        "               .orderBy('sale_date')\n" +
        "               .rowsBetween(Window.unboundedPreceding, Window.currentRow))\n" +
        "w_rank = Window.partitionBy('store_id').orderBy(F.col('amount').desc())\n" +
        "\n" +
        "result = (sales\n" +
        "          .withColumn('cumulative', F.sum('amount').over(w_run))\n" +
        "          .withColumn('day_rank', F.rank().over(w_rank)))\n" +
        "# rowsBetween makes the running total tie-safe (row-by-row, not RANGE).\n" +
        "# Both windows partitionBy store_id, so the work spreads across executors."
    }
  }
]);
