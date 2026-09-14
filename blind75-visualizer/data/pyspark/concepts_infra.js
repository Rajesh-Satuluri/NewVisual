/*
 * data/pyspark/concepts_infra.js — PySpark "Learn" Infrastructure & Deployment.
 * Registered into window.LEARN under the "spark" stack. Covers the physical /
 * cluster-execution half of a DE Spark interview (executor sizing first).
 * Teaching structure mirrors the Performance exemplars; the clusterSizing viz
 * makes the sizing arithmetic interactive.
 */
window.LEARN.register("spark", "Infrastructure & Deployment", [
  {
    id: "cluster-sizing-executors",
    title: "Cluster Sizing & Executor Config",
    difficulty: "Core",
    estMinutes: 13,
    relevance: 3,
    tagline: "\"You have a 6-node cluster, 16 cores and 64 GB each — how many executors, how many cores, how much memory do you ask for?\" This is arithmetic, not opinion, and interviewers expect the numbers.",

    whatIsIt: [
      "A Spark job runs as one <b>driver</b> plus many <b>executors</b> — JVM processes the cluster manager (YARN/Kubernetes) launches inside <b>containers</b> carved out of your worker nodes' cores and RAM. Sizing means turning \"N nodes × C cores × M GB\" into the three numbers you pass to <code>spark-submit</code>: <code>--num-executors</code>, <code>--executor-cores</code>, <code>--executor-memory</code>.",
      "First, <b>don't hand the whole node to Spark</b>. Reserve ~1 core and ~1 GB per node for the OS and the node manager daemon. So a 16-core / 64 GB node offers ~15 usable cores and ~63 usable GB.",
      "Then apply the <b>5-cores-per-executor rule of thumb</b>. One fat executor with all 15 cores chokes on HDFS/S3 I/O throughput and GC; 15 thin one-core executors waste memory on duplicated overhead and can't share broadcast data. ~5 cores per executor is the sweet spot for I/O concurrency. 15 usable cores ÷ 5 = <b>3 executors per node</b>.",
      "Finally split the memory. 63 usable GB ÷ 3 executors ≈ <b>21 GB per executor container</b> — but that container is not all heap. Spark sets aside <b>memoryOverhead = max(384 MB, 7% of executor memory)</b> for off-heap buffers, so the JVM <code>--executor-memory</code> heap is ~21 − 1.5 ≈ <b>19 GB</b>. Across 6 nodes that's 18 executors; <b>one executor slot funds the driver</b>, leaving <b>17 executors × 5 cores × ~19 GB</b>."
    ],

    showMe: {
      code:
        "# Cluster: 6 worker nodes, 16 cores + 64 GB each.\n" +
        "#\n" +
        "# 1) Reserve for OS + daemon:  16 - 1 = 15 usable cores | 64 - 1 = 63 usable GB\n" +
        "# 2) 5-core rule:              15 / 5 = 3 executors per node\n" +
        "# 3) Memory per executor:      63 / 3 = 21 GB container\n" +
        "#      overhead = max(384MB, 7% * 21GB = 1.47GB) = ~1.5 GB\n" +
        "#      heap     = 21 - 1.5 = ~19 GB   (--executor-memory)\n" +
        "# 4) Total executors:         3 * 6 = 18, minus 1 for the driver = 17\n" +
        "\n" +
        "spark-submit \\\n" +
        "  --num-executors 17 \\\n" +
        "  --executor-cores 5 \\\n" +
        "  --executor-memory 19g \\\n" +
        "  --conf spark.executor.memoryOverhead=1536 \\\n" +
        "  --driver-memory 19g \\\n" +
        "  your_app.py\n" +
        "\n" +
        "# Or let the cluster manage it (bounds instead of a fixed count):\n" +
        "#   --conf spark.dynamicAllocation.enabled=true\n" +
        "#   --conf spark.dynamicAllocation.minExecutors=2\n" +
        "#   --conf spark.dynamicAllocation.maxExecutors=17",
      viz: {
        type: "clusterSizing",
        data: { nodes: 6, cores: 16, ram: 64, reserve: true }
      },
      caption:
        "Step the cluster shape. Watch the 5-core rule carve each node into executor slots (greyed = OS reserve, dashed = idle cores that can't form another executor) and the RAM bar split into heap + overhead. The spark-submit line recomputes live — try 16 vs 15 cores to see cores stranded."
    },

    whyMatters:
      "<p>This is the single most-asked Spark <i>architecture</i> question, and it separates people who've only written DataFrame code from people who've run jobs on a cluster. The weak answer is \"I'd give it lots of memory.\" The strong answer walks the arithmetic and names the two rules of thumb.</p>" +
      "<ul>" +
      "<li><b>Reserve first</b> — never give 100% of a node to Spark; the OS and node-manager need headroom or containers get killed.</li>" +
      "<li><b>~5 cores/executor</b> — balances HDFS/S3 I/O throughput against per-executor overhead. This is the number interviewers listen for.</li>" +
      "<li><b>memoryOverhead is real</b> — request container = heap + max(384MB, 7%). Forgetting it is why jobs die with <code>Container killed by YARN for exceeding memory limits</code> even though the heap looked fine.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">16 cores/node, reserve 1 -> 15 usable\n15 / 5 cores  = 3 executors/node\n63 GB / 3     = 21 GB container -> ~19 GB heap + 1.5 GB overhead\n3 * 6 nodes   = 18 - 1 driver = 17 executors</pre>",

    recognize: [
      { q: "\"How many executors for this cluster?\"", think: "Reserve 1 core/node, divide usable cores by ~5, multiply by nodes, subtract 1 for the driver. Say the arithmetic out loud." },
      { q: "\"Why not one giant executor with all the cores?\"", think: "Too many cores per executor bottlenecks on I/O and GC (HDFS throughput drops past ~5); too few wastes memory on duplicated overhead and blocks broadcast sharing." },
      { q: "\"Container killed by YARN for exceeding memory limits.\"", think: "You forgot memoryOverhead. Request = heap + max(384MB, 7%). Raise spark.executor.memoryOverhead, don't just raise heap." },
      { q: "\"16 usable cores, 5-core executors — why is one core idle?\"", think: "16 / 5 = 3 executors (15 cores), 1 core stranded. Sizing rarely divides evenly; pick the shape that strands the fewest cores." },
      { q: "\"Fixed --num-executors or dynamic allocation?\"", think: "Dynamic allocation (min/max bounds) for shared/bursty clusters; a fixed count for predictable, latency-sensitive jobs that shouldn't wait for executors to ramp." }
    ],

    matchTags: ["executor", "cluster sizing", "num-executors", "executor-cores", "executor-memory",
                "memoryOverhead", "spark-submit", "5 cores", "fat executor", "thin executor",
                "driver", "yarn", "container", "dynamic allocation", "resource"],

    traps: [
      {
        bad: "--num-executors 6 --executor-cores 16 --executor-memory 63g   # one fat executor/node",
        good: "--num-executors 17 --executor-cores 5 --executor-memory 19g   # ~3/node, 5-core rule",
        why: "16 cores in one executor throttles on HDFS/S3 I/O and suffers long GC pauses; it also gives Spark no room to reserve for the OS. Three ~5-core executors per node parallelize I/O far better."
      },
      {
        bad: "--executor-memory 21g   # 'that's the 63/3 share'",
        good: "--executor-memory 19g --conf spark.executor.memoryOverhead=1536",
        why: "The 21 GB is the whole container. YARN must fit heap + overhead inside it; asking for 21 GB of heap leaves no room for the ~1.5 GB overhead and the container gets killed. Subtract overhead from the container to get the heap."
      },
      {
        bad: "--num-executors 18   # 3/node * 6 nodes",
        good: "--num-executors 17   # leave one executor slot's worth for the driver",
        why: "The driver also needs a container with cores and memory. If you claim every slot for executors, the driver competes for scraps (or, in cluster mode, can't be scheduled). Reserve roughly one executor's worth for it."
      }
    ],

    complexity: [
      { op: "usable cores/node", big_o: "cores − 1", note: "Reserve ~1 core per node for the OS and node-manager daemon before Spark gets any." },
      { op: "executors/node", big_o: "floor(usable / 5)", note: "The 5-cores-per-executor rule; leftover cores that can't form a full executor sit idle." },
      { op: "container mem/executor", big_o: "usable_ram / execs_per_node", note: "Split the node's usable RAM evenly across its executors — this is the container, not the heap." },
      { op: "memoryOverhead", big_o: "max(384MB, 7% * container)", note: "Off-heap reservation subtracted from the container to get the JVM heap; skip it and YARN kills the container." },
      { op: "total executors", big_o: "execs/node * nodes − 1", note: "One executor's worth of resources is reserved for the driver." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> On YARN the driver asks the ResourceManager for containers; each container is a bounded (cores, memory) slice on a node, and the NodeManager launches an executor JVM inside it. The container's memory budget is <code>spark.executor.memory</code> (heap) + <code>spark.executor.memoryOverhead</code> — YARN enforces the total, so exceeding it means <code>Container killed … exceeding memory limits</code>, not a JVM <code>OutOfMemoryError</code>.</p>" +
      "<p><b>Why 5 cores.</b> HDFS/S3 client throughput per executor plateaus and then degrades past roughly five concurrent read threads, and a single JVM's GC gets unwieldy with a very large heap. Five cores is the empirical balance point popularized by Cloudera's tuning guidance; it's a default, not a law — I/O-light, memory-heavy jobs sometimes go lower.</p>" +
      "<p><b>Dynamic allocation.</b> With <code>spark.dynamicAllocation.enabled</code> Spark scales executors between min and max based on pending tasks and releases idle ones (needs an external shuffle service or shuffle tracking). It's the norm on shared clusters; the sizing math above then defines your <i>max</i>, not a fixed count.</p>",

    challenge: {
      prompt:
        "You're given a 10-node cluster, each node with 32 cores and 128 GB RAM. Size the job: how many executors, cores each, and heap each — and what single spark-submit would you run? Show the arithmetic.",
      starter:
        "# 10 nodes x (32 cores, 128 GB). Reserve 1 core + 1 GB/node.\n" +
        "# usable/node = 31 cores, 127 GB. Now apply the 5-core rule...\n" +
        "spark-submit \\\n" +
        "  --num-executors ? --executor-cores ? --executor-memory ?g \\\n" +
        "  --conf spark.executor.memoryOverhead=? your_app.py",
      solution:
        "# 1) Reserve:        32 - 1 = 31 usable cores | 128 - 1 = 127 usable GB per node\n" +
        "# 2) 5-core rule:    floor(31 / 5) = 6 executors/node  (1 core stranded/node)\n" +
        "# 3) Mem/executor:   floor(127 / 6) = 21 GB container\n" +
        "#      overhead = max(384MB, 7% * 21 = 1.47GB) = ~1.5 GB\n" +
        "#      heap     = 21 - 1.5 = ~19 GB\n" +
        "# 4) Total:          6 * 10 = 60, minus 1 for the driver = 59 executors\n" +
        "\n" +
        "spark-submit \\\n" +
        "  --num-executors 59 \\\n" +
        "  --executor-cores 5 \\\n" +
        "  --executor-memory 19g \\\n" +
        "  --conf spark.executor.memoryOverhead=1536 \\\n" +
        "  --driver-memory 19g \\\n" +
        "  your_app.py\n" +
        "\n" +
        "# Note the 1 idle core/node (31 = 6*5 + 1) — sizing rarely divides evenly.\n" +
        "# On a shared cluster, express this as dynamicAllocation.maxExecutors=59 instead."
    }
  }
]);
