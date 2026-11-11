export default {
  id: "spark-shuffle",
  title: "Spark execution & the shuffle",
  icon: "🔀",
  chapter: 20,
  group: "Performance & quality",
  summary: "Spark splits a job into stages of parallel tasks. Narrow transformations (map, filter) stay within a partition; wide transformations (joins, groupBy) need a shuffle — redistributing data across the network so matching keys land together. The shuffle is the dominant cost in most distributed jobs, so performance tuning is largely shuffle avoidance.",
  widget: "de-shuffle",
  widgetIntro: "Spark builds a DAG of **stages**, each a set of parallel **tasks** over data partitions. A stage boundary appears wherever a **wide** transformation needs data from *other* partitions — a `groupBy`, `join`, or `distinct`. Crossing that boundary means a **shuffle**: every task writes its records out by key, and the next stage's tasks pull the records for their keys across the network.\n\nWatch a narrow stage (each task self-contained) hit a wide boundary and shuffle — records fly across partitions so matching keys converge. That all-to-all data movement is why the shuffle dominates job cost.",
  sections: [
    {
      title: "Stages, tasks, partitions",
      body: "Spark divides data into partitions and runs one task per partition in parallel. It groups transformations into stages separated by shuffle boundaries; within a stage, tasks run independently with no cross-talk. Parallelism = partition count; the cluster runs as many tasks concurrently as it has cores.",
      bullets: [
        "**Partition:** a chunk of the data; the unit of parallelism.",
        "**Task:** processes one partition; runs on one core.",
        "**Stage:** a group of tasks with no shuffle between them.",
      ],
    },
    {
      title: "Narrow vs wide transformations",
      body: "A **narrow** transformation (map, filter, select) produces each output partition from a single input partition — no data movement, no stage boundary. A **wide** transformation (groupByKey, join, distinct, repartition) needs records from many partitions to come together by key, which forces a shuffle and a new stage.",
      table: {
        head: ["", "Narrow", "Wide"],
        rows: [
          ["Examples", "map, filter, select", "join, groupBy, distinct"],
          ["Data movement", "None (in-partition)", "Shuffle across network"],
          ["Stage boundary", "No", "Yes"],
          ["Cost", "Cheap, parallel", "Expensive — the bottleneck"],
        ],
      },
    },
    {
      title: "What a shuffle actually does",
      body: "At a shuffle, every task of the upstream stage partitions its output by the shuffle key (hash), writes those partitions to local disk, and the downstream tasks fetch the pieces for their keys from every upstream task over the network. It's an all-to-all transfer plus disk IO plus serialization — the most expensive thing a Spark job does.",
      flow: ["stage 1 tasks", "write output by key (to disk)", "network fetch (all-to-all)", "stage 2 tasks"],
      rules: ["Shuffle = write-by-key + network fetch + disk IO — minimize it and you've tuned most of the job."],
    },
    {
      title: "Reducing and surviving shuffles",
      body: "You can't always avoid shuffles, but you can shrink them: filter and aggregate before the shuffle (less data to move), broadcast a small side of a join (no shuffle at all), pre-partition/bucket data on the join key (reuse the layout), and reduce instead of group (combine map-side). When a shuffle is unavoidable, watch for skew — one hot key sends a huge partition to one task, stalling the stage.",
      bullets: [
        "Push filters/aggregations before the shuffle to move less data.",
        "Broadcast the small table to eliminate a join shuffle.",
        "Pre-bucket on the join key so the shuffle is already done.",
        "Mitigate skew (hot keys) with salting or adaptive execution.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Almost every Spark performance problem is a shuffle problem — too much data moved, or moved unevenly.",
  deepDive: [
    {
      title: "Why the shuffle dominates",
      body: "Within a stage, work is embarrassingly parallel and scales with cores. The shuffle breaks that: it serializes records, writes them to disk, and moves them over the network between every pair of tasks — operations orders of magnitude slower than in-memory compute. So total job time is usually set by how much data crosses shuffle boundaries, not by the maps and filters.",
      stats: [
        { value: "narrow", label: "in-partition, no movement", tone: "green" },
        { value: "wide", label: "shuffle: all-to-all transfer", tone: "red" },
        { value: "disk + network", label: "the slow part", tone: "amber" },
        { value: "skew", label: "one hot key stalls a stage", tone: "accent" },
      ],
    },
    {
      title: "Skew and partition count",
      body: "Two shuffle killers: skew and bad partition counts. Skew — a disproportionately common key — dumps a giant partition on one task while others idle, so the stage waits on the straggler; fix with salting or Spark's adaptive query execution. Too few partitions underuse the cluster; too many create scheduling overhead and tiny shuffle files. Aim for partitions that keep every core busy without fragmenting.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Spark is stages of parallel tasks; the cost is the shuffle at wide-transformation boundaries. I minimize data crossing shuffles — filter early, broadcast small joins, pre-bucket on keys — and handle skew with salting/AQE. Tune the shuffle and you've tuned the job.\"" },
    },
  ],
  qa: [
    {
      q: "What is a shuffle in Spark and why is it expensive?",
      a: "A shuffle is the redistribution of data across the cluster that happens at a wide transformation (join, groupBy, distinct), so that records with the same key end up on the same task. Mechanically, every upstream task partitions its output by the shuffle key, writes it to local disk, and downstream tasks fetch their keys' data from every upstream task over the network. It's an all-to-all transfer plus serialization and disk IO — orders of magnitude slower than in-memory compute — so it usually dominates job runtime.",
      tip: "Define it as key-based redistribution and explain the write-by-key + network fetch + disk IO cost.",
    },
    {
      q: "What's the difference between a narrow and a wide transformation?",
      a: "A narrow transformation (map, filter, select) computes each output partition from a single input partition, so there's no data movement and no stage boundary — it's cheap and fully parallel. A wide transformation (join, groupByKey, distinct, repartition) needs data from many partitions to be brought together by key, which forces a shuffle and starts a new stage. Narrow = stays put; wide = shuffles. Knowing which operations are wide tells you where the cost is.",
      tip: "Narrow = per-partition/no movement, wide = cross-partition/shuffle; give examples of each.",
    },
    {
      q: "How do you reduce shuffle cost, and what is skew?",
      a: "Move less data across shuffles: filter and pre-aggregate before the shuffle, broadcast the small side of a join to avoid shuffling entirely, pre-partition/bucket data on the join key so the layout is reused, and combine map-side (reduce rather than group). Skew is when one key is far more common than others, so its partition is huge and lands on a single task that becomes a straggler while the rest idle — the stage waits on it. Fix skew by salting the hot key or enabling adaptive query execution, which splits skewed partitions automatically.",
      tip: "List the shuffle-reduction levers and define skew as a hot-key straggler, with salting/AQE as the fix.",
    },
  ],
  related: [],
};
