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
  },

  {
    id: "hdfs-cloud-storage",
    title: "HDFS & Cloud Storage",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "Before Spark reads a byte, the data is already split, replicated, and scattered across machines. \"Explain HDFS\" and \"why 128 MB blocks?\" are interview staples — and knowing how object stores differ is what modern DE rounds actually probe.",

    whatIsIt: [
      "<b>HDFS</b> (Hadoop Distributed File System) stores one logical file as many fixed-size <b>blocks</b> — <b>128 MB</b> by default — scattered across the <b>DataNodes</b> of a cluster. A 640 MB file becomes 5 blocks; a 1 GB file becomes 8. Splitting is what lets a file bigger than any single disk exist, and what lets many machines read different blocks <b>in parallel</b>.",
      "Each block is <b>replicated</b> (default factor <b>3</b>) onto different DataNodes, placed with <b>rack awareness</b>: one replica on the writer's rack, the other two on a <i>second</i> rack. That survives a single disk, a single node, and even a whole-rack outage, while keeping most replica traffic within a rack.",
      "The <b>NameNode</b> is the brain: it holds the metadata — which blocks make up each file and which DataNodes hold each replica — entirely in memory. DataNodes send it heartbeats and block reports. If a DataNode dies, the NameNode notices the under-replicated blocks and tells healthy nodes to <b>re-replicate</b> until the factor is restored. (The NameNode is the classic single point of failure, mitigated by a standby NameNode in HA setups.)",
      "<b>Why 128 MB?</b> Blocks that are too small explode the NameNode's metadata (one entry per block) and spawn too many tiny tasks; blocks too large hurt parallelism and recovery. 128 MB also makes HDFS seek time negligible against transfer time. It's why Spark's default read partition size mirrors the block size — <b>one block ≈ one input partition ≈ one task</b>."
    ],

    showMe: {
      code:
        "# A 640 MB file in HDFS = ceil(640 / 128) = 5 blocks, each replicated 3x.\n" +
        "hdfs dfs -put sales.csv /data/sales/          # write: split + replicate\n" +
        "hdfs fsck /data/sales/sales.csv -files -blocks -locations\n" +
        "#  Total blocks: 5   |  default replication: 3\n" +
        "#  blk_0  ->  DataNode N1 (rack1), N4 (rack2), N5 (rack2)\n" +
        "#  blk_1  ->  DataNode N2 (rack1), N5 (rack2), N6 (rack2)   ... etc\n" +
        "\n" +
        "# In Spark, that block layout becomes the read parallelism:\n" +
        "df = spark.read.csv('/data/sales/sales.csv', header=True)\n" +
        "df.rdd.getNumPartitions()      # ~5  (one input partition per 128MB block)\n" +
        "\n" +
        "# --- On the cloud, the same read targets an OBJECT STORE, not HDFS ---\n" +
        "df = spark.read.parquet('s3://bucket/sales/')   # or abfss:// , gs://\n" +
        "# No blocks, no DataNodes, no rack awareness, no data locality:\n" +
        "# storage is a separate service; compute reads over the network.",
      viz: {
        type: "hdfsBlocks",
        data: { fileMB: 640, rf: 3 }
      },
      caption:
        "Step the file size to watch it split into 128 MB blocks. Click a block to see its 3 replicas placed across two racks. Click a DataNode to fail it — the NameNode spawns a fresh replica elsewhere to restore 3× (fault tolerance in action)."
    },

    whyMatters:
      "<p>\"Explain HDFS\" and \"why 128 MB?\" are among the most common opening Big-Data questions, and the follow-up — \"how is it different in the cloud?\" — is where modern DE interviews go. The strong answer connects the storage layout to Spark behavior you can see.</p>" +
      "<ul>" +
      "<li><b>Block ≈ partition ≈ task.</b> The 128 MB block is why a 1 GB file reads as ~8 partitions — storage layout dictates read parallelism.</li>" +
      "<li><b>Replication = fault tolerance.</b> 3× across racks is what makes a node or rack failure a non-event; the NameNode re-replicates automatically.</li>" +
      "<li><b>Cloud object stores are different.</b> S3 / ADLS Gen2 / GCS have no blocks, no rack awareness, and no data locality — compute and storage are decoupled, so you scale them independently but read over the network (and pay for list/get calls). This decoupling is the whole basis of the lakehouse.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">HDFS:  data lives ON the compute nodes -> data locality, blocks, RF=3, rack-aware\nS3:    data lives in a separate service -> elastic, cheap, but no locality; read over network\nSpark read partitions: HDFS ~ block size (128MB) | S3 ~ spark.sql.files.maxPartitionBytes</pre>",

    recognize: [
      { q: "\"Why 128 MB blocks and not 4 KB like a normal FS?\"", think: "Fewer, larger blocks keep NameNode metadata small and make seek time negligible vs transfer; too small = metadata blowup + too many tasks." },
      { q: "\"A DataNode died — did we lose data?\"", think: "No. Each block has 3 replicas across racks; the NameNode detects under-replication and re-replicates to a healthy node automatically." },
      { q: "\"Why does my 1 GB file read as ~8 Spark partitions?\"", think: "1 GB / 128 MB block ≈ 8. One block maps to roughly one input partition and one read task." },
      { q: "\"What's the NameNode and why is it a bottleneck?\"", think: "It holds all file/block metadata in memory. Millions of tiny files blow up its heap — the 'small files problem'. It's also the classic SPOF (mitigated by HA standby)." },
      { q: "\"How is S3/ADLS different from HDFS?\"", think: "Object store: no blocks, no rack awareness, no data locality; storage decoupled from compute, read over the network. Great elasticity, but locality-based tuning doesn't apply." }
    ],

    matchTags: ["hdfs", "block", "128mb", "replication", "rack awareness", "namenode", "datanode",
                "fault tolerance", "re-replication", "data locality", "s3", "adls", "gcs",
                "object store", "small files", "distributed storage"],

    traps: [
      {
        bad: "millions of 1 KB files written to HDFS   # one block + metadata entry each",
        good: "compact into fewer large files (~128MB+)  # or use a columnar format",
        why: "Every file/block is a metadata entry in the NameNode's heap and a separate task on read. Millions of tiny files exhaust NameNode memory and cripple job planning — the classic 'small files problem'."
      },
      {
        bad: "# assuming S3 gives HDFS-style data locality and rack awareness",
        good: "# treat S3 as remote: tune maxPartitionBytes, minimize list/get, use columnar",
        why: "Object stores have no data locality — compute reads over the network. Locality-based reasoning (and rack awareness) simply doesn't apply; you tune read partition size and I/O calls instead."
      },
      {
        bad: "hdfs dfs -setrep 1 /critical/data   # 'save space' by dropping replication",
        good: "keep RF=3 for important data       # replication IS the fault tolerance",
        why: "Replication factor 1 means a single disk or node failure permanently loses those blocks — there's nothing to re-replicate from. RF is your durability; only lower it for scratch/derived data you can recompute."
      }
    ],

    complexity: [
      { op: "blocks per file", big_o: "ceil(size / 128MB)", note: "Fixed-size split; the last block is partial. Drives read parallelism in Spark." },
      { op: "storage cost", big_o: "size × RF", note: "Replication factor 3 means 3× raw storage — the price of durability on HDFS." },
      { op: "NameNode metadata", big_o: "O(files + blocks)", note: "All held in memory; millions of small files exhaust its heap (small-files problem)." },
      { op: "node failure recovery", big_o: "O(blocks on node)", note: "NameNode re-replicates each under-replicated block from a surviving replica — automatic, no data loss at RF≥2." },
      { op: "cloud object read", big_o: "O(bytes) over network", note: "No locality; throughput bounded by network + list/get call overhead, not local disk." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> On write, the HDFS client asks the NameNode where to put each block; the NameNode returns a rack-aware pipeline of DataNodes, and the client streams the block through that pipeline (node 1 → node 2 → node 3) so replication happens as the data flows. The NameNode never touches file data — only metadata.</p>" +
      "<p><b>Default placement.</b> Replica 1 goes to the writer's node (or a random node if the writer is off-cluster), replica 2 to a node on a <i>different</i> rack, replica 3 to another node on that same second rack. This balances durability (survive a rack) against cost (only one cross-rack hop).</p>" +
      "<p><b>Cloud reality.</b> Most production Spark now reads Parquet/Delta from S3/ADLS/GCS, not HDFS. Those are object stores: flat key-value namespaces with no blocks, no NameNode, and strong-read-after-write consistency (since 2020 on S3). You lose data locality but gain independent scaling of storage and compute — the architecture the lakehouse is built on.</p>",

    challenge: {
      prompt:
        "A teammate says: \"To save storage cost I set replication factor to 1 on our raw HDFS landing zone, and I also write each incoming event as its own JSON file — about 4 million a day.\" Name the two serious problems and the fix for each.",
      starter:
        "hdfs dfs -setrep 1 /landing/raw            # 'saves 3x storage'\n" +
        "# + 4,000,000 tiny JSON files/day written under /landing/raw/\n" +
        "# what breaks? how do you fix each?",
      solution:
        "# Problem 1 — RF=1 destroys fault tolerance.\n" +
        "#   With one replica, a single dead disk/node PERMANENTLY loses those blocks;\n" +
        "#   there is nothing to re-replicate from. Raw landing data is often\n" +
        "#   irreplaceable. Fix: keep RF=3 (or >=2) on data you can't recompute;\n" +
        "#   only lower RF for derived/scratch data.\n" +
        "hdfs dfs -setrep 3 /landing/raw\n" +
        "\n" +
        "# Problem 2 — 4M tiny files/day = the small-files problem.\n" +
        "#   Each file is >=1 block + a NameNode metadata entry (RAM) and becomes a\n" +
        "#   separate read task -> NameNode heap pressure + terrible Spark planning.\n" +
        "#   Fix: batch/compact incoming events into fewer large files (~128MB+),\n" +
        "#   ideally a columnar format (Parquet), e.g. a periodic compaction job:\n" +
        "spark.read.json('/landing/raw/dt=2024-06-01/') \\\n" +
        "     .repartition(8) \\\n" +
        "     .write.mode('overwrite').parquet('/curated/events/dt=2024-06-01/')"
    }
  },

  {
    id: "deploy-modes-spark-submit",
    title: "Deploy Modes & spark-submit",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "\"What's the difference between client and cluster mode?\" hinges on one thing: WHERE the driver runs. Get that, and the rest — logs, disconnects, which to use — follows.",

    whatIsIt: [
      "You launch a Spark job with <code>spark-submit</code> from a <b>gateway / edge node</b>. It talks to the cluster manager (YARN's <b>ResourceManager</b>, or Kubernetes) which allocates <b>containers</b> on worker nodes and starts an <b>ApplicationMaster</b> (AM) plus the <b>executors</b>.",
      "The one thing <code>--deploy-mode</code> decides is <b>where the driver JVM runs</b>. In <b>client mode</b> the driver runs in the spark-submit process <b>on the gateway node</b> (outside the cluster); the AM only negotiates resources. In <b>cluster mode</b> the driver runs <b>inside the cluster</b>, co-located with the AM in a container.",
      "That placement drives everything else. <b>Client:</b> driver logs stream to your terminal and you can interact — but if that process (or your laptop) dies, the driver dies and the job fails. <b>Cluster:</b> spark-submit can exit and you can disconnect; the driver lives in YARN, its logs go to the cluster's log aggregation, and the job runs to completion on its own.",
      "So the rule of thumb: <b>client mode</b> for interactive work — <code>spark-shell</code>, notebooks, ad-hoc debugging where you want live output. <b>cluster mode</b> for <b>production and scheduled jobs</b> (Airflow, cron, Oozie) that must survive a disconnected client. (<code>--master local[*]</code> is a third option: everything in one JVM on your machine, for tests.)"
    ],

    showMe: {
      code:
        "# CLIENT mode — driver on the gateway; logs in your terminal; dies if you do.\n" +
        "spark-submit \\\n" +
        "  --master yarn \\\n" +
        "  --deploy-mode client \\\n" +
        "  --num-executors 10 --executor-cores 5 --executor-memory 19g \\\n" +
        "  app.py\n" +
        "\n" +
        "# CLUSTER mode — driver runs INSIDE YARN; submit can exit; for production.\n" +
        "spark-submit \\\n" +
        "  --master yarn \\\n" +
        "  --deploy-mode cluster \\\n" +
        "  --driver-memory 19g \\\n" +
        "  --num-executors 10 --executor-cores 5 --executor-memory 19g \\\n" +
        "  app.py\n" +
        "\n" +
        "# Local — one JVM on your machine, N worker threads. For unit tests.\n" +
        "spark-submit --master 'local[*]' app.py",
      viz: {
        type: "deployMode",
        data: { mode: "client" }
      },
      caption:
        "Toggle client vs cluster and watch the Driver move. In client mode it sits on the gateway node (outside the cluster); in cluster mode it runs in a container as the ApplicationMaster. The spark-submit line and the implications update with it."
    },

    whyMatters:
      "<p>This is a guaranteed interview question and a real operational choice. The crisp answer is one sentence — \"the deploy mode decides where the driver runs\" — followed by the consequences.</p>" +
      "<ul>" +
      "<li><b>Client</b> — driver on the gateway, live logs, interactive; the submitting process must stay alive. Great for <code>spark-shell</code>/notebooks, risky for long batch jobs.</li>" +
      "<li><b>Cluster</b> — driver in the cluster as the AM; survives a disconnected client; logs via YARN aggregation. The default for production and scheduled pipelines.</li>" +
      "<li><b>Gotcha</b> — in client mode the driver's network must reach every executor; a firewalled laptop or a driver too small for a big <code>collect()</code> is a common failure.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">--deploy-mode client   -> driver on gateway   -> logs in terminal, dies with client\n--deploy-mode cluster  -> driver in cluster   -> survives disconnect, YARN logs\n--master local[*]      -> driver+executors in one JVM on your machine</pre>",

    recognize: [
      { q: "\"Client vs cluster mode — the difference?\"", think: "Where the driver runs. Client: on the gateway, outside the cluster. Cluster: inside the cluster as the ApplicationMaster." },
      { q: "\"My scheduled job dies when I close my laptop.\"", think: "You're in client mode — the driver is your laptop's process. Use --deploy-mode cluster so the driver lives in YARN." },
      { q: "\"Where are my driver logs?\"", think: "Client: streaming to your terminal. Cluster: in YARN log aggregation (yarn logs -applicationId ...) — not on your screen." },
      { q: "\"Notebook / spark-shell — which mode?\"", think: "Client (it's implicit). You need the driver local to get an interactive REPL and live output." },
      { q: "\"Airflow triggers a nightly Spark batch — which mode?\"", think: "Cluster. The submitting process shouldn't have to stay attached for hours; the driver belongs in the cluster." }
    ],

    matchTags: ["deploy mode", "client mode", "cluster mode", "spark-submit", "driver", "yarn",
                "applicationmaster", "resourcemanager", "gateway", "edge node", "--master",
                "local", "production", "scheduled"],

    traps: [
      {
        bad: "# nightly Airflow job: spark-submit --deploy-mode client ...",
        good: "spark-submit --deploy-mode cluster ...   # driver survives in YARN",
        why: "In client mode the driver is the submitting process; if Airflow's worker recycles or the connection drops, the driver — and the whole job — dies. Production/scheduled jobs run in cluster mode."
      },
      {
        bad: "# cluster mode, then tailing your terminal for driver output",
        good: "yarn logs -applicationId application_XXXX   # fetch aggregated logs",
        why: "In cluster mode the driver runs on some worker node, not your terminal. Its stdout/stderr go to YARN log aggregation; expecting them on your screen just looks like the job is silent."
      },
      {
        bad: "# client mode from a firewalled laptop to a remote cluster",
        good: "# use cluster mode (or a gateway node) so the driver is near the executors",
        why: "In client mode the driver must open connections to every executor. A laptop behind NAT/firewall often can't be reached back by executors, so the job hangs or fails to launch tasks."
      }
    ],

    complexity: [
      { op: "driver location", big_o: "client: gateway | cluster: in-cluster", note: "The single knob --deploy-mode controls; everything else is a consequence." },
      { op: "survives client disconnect", big_o: "client: no | cluster: yes", note: "Cluster-mode driver lives in YARN and is decoupled from the submitting process." },
      { op: "log destination", big_o: "client: terminal | cluster: YARN", note: "Cluster-mode logs need yarn logs / the RM UI to retrieve." },
      { op: "driver<->executor network", big_o: "client: gateway must reach execs", note: "Client mode needs full connectivity from the gateway; firewalls break it." },
      { op: "startup latency", big_o: "client: lower | cluster: +1 hop", note: "Cluster mode adds the step of shipping and launching the driver in a container." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> On YARN, spark-submit registers an application with the ResourceManager, which launches the ApplicationMaster in the first container. In <b>cluster</b> mode that AM container <i>is</i> the driver — it runs your <code>main()</code> and requests executor containers. In <b>client</b> mode the AM is a thin proxy that only negotiates resources; your driver runs back in the spark-submit process and the AM relays container requests to it.</p>" +
      "<p><b>Kubernetes</b> follows the same idea: cluster mode runs the driver in a driver Pod; the driver Pod then creates executor Pods. There's no true client mode inside the cluster, though you can run the driver outside it.</p>" +
      "<p><b>Sizing note.</b> Cluster mode makes <code>--driver-memory</code> and driver cores real cluster resources you must budget (the driver takes a container). In client mode the driver uses the gateway's RAM — which is why a big <code>collect()</code> in client mode can OOM the gateway rather than a cluster node.</p>",

    challenge: {
      prompt:
        "A data scientist runs a 3-hour training job by opening a terminal on the gateway, launching spark-submit, and leaving it overnight. Twice a week it fails around the 2-hour mark with no useful error, always when they've gone home. What's almost certainly happening, and what's the one-flag fix (plus where to read logs afterward)?",
      starter:
        "spark-submit --master yarn --deploy-mode client train.py\n" +
        "# runs fine when watched; dies overnight ~2h in. why? one-flag fix?",
      solution:
        "# Diagnosis: client mode -> the driver IS the spark-submit process on the\n" +
        "# gateway. Overnight the SSH session / gateway recycles / network drops,\n" +
        "# the process is killed, and with it the driver and the whole job. It only\n" +
        "# 'works when watched' because the session stays alive.\n" +
        "\n" +
        "# One-flag fix: run the driver inside the cluster so it's decoupled from\n" +
        "# the client session.\n" +
        "spark-submit --master yarn --deploy-mode cluster train.py\n" +
        "\n" +
        "# Now the driver survives a disconnected client. Read its logs via YARN:\n" +
        "#   yarn logs -applicationId application_XXXX_YYYY\n" +
        "# (or the ResourceManager UI). Also budget --driver-memory: in cluster\n" +
        "# mode the driver takes a real container, not the gateway's RAM.\n" +
        "# For interactive dev, keep client mode but use tmux/nohup to survive drops."
    }
  },

  {
    id: "file-formats-compression",
    title: "File Formats & Compression",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "\"Why Parquet over CSV?\" and \"snappy or gzip?\" are asked constantly. The answers come down to columnar layout + splittability — and both change how much data Spark actually reads.",

    whatIsIt: [
      "<b>Row formats</b> (CSV, JSON) store every column of a row together, then the next row. To read one column you must read every row in full, and there are no statistics to skip anything — every query is a <b>full scan</b>. They're human-readable and fine for ingestion, bad for analytics.",
      "<b>Columnar formats</b> (<b>Parquet</b>, ORC) store each column's values together. A Parquet file is a series of <b>row groups</b> (~128 MB); each row group holds one <b>column chunk</b> per column; each chunk is split into <b>pages</b>. Crucially, each column chunk carries <b>min/max statistics</b>.",
      "That layout unlocks two big wins Spark uses automatically: <b>column pruning</b> — read only the columns your query <code>select</code>s — and <b>predicate pushdown / row-group skipping</b> — use the min/max stats to skip whole row groups that can't match a <code>WHERE</code>. A query touching 2 of 20 columns over data where the filter matches one row group can read a tiny fraction of the file.",
      "<b>Compression</b> layers on top. <b>Snappy</b> (Parquet's default) is fast to decompress with modest ratio — the right default for query engines. <b>Gzip</b> compresses smaller but is slower and CPU-heavy. Two subtleties: Parquet compresses <i>per column chunk</i> (so columnar + snappy compounds), and <b>splittability</b> matters for row formats — a gzipped CSV is <b>not splittable</b>, so a 10 GB .csv.gz becomes ONE partition and one task. bzip2 is splittable but slow; snappy-in-Parquet stays splittable because the container handles splitting."
    ],

    showMe: {
      code:
        "# Same query, three storage choices — watch how much gets read.\n" +
        "spark.read.csv('/data/sales.csv', header=True) \\\n" +
        "  .select('country', 'amount').filter('amount > 500')   # FULL SCAN: reads all cols, all rows\n" +
        "\n" +
        "spark.read.parquet('/data/sales_parquet/') \\\n" +
        "  .select('country', 'amount').filter('amount > 500')\n" +
        "  # column pruning: reads only country + amount chunks\n" +
        "  # row-group skipping: skips row groups whose amount max <= 500\n" +
        "\n" +
        "# Write Parquet with an explicit codec (snappy is the default):\n" +
        "df.write.option('compression', 'snappy').parquet('/out/')\n" +
        "\n" +
        "# ANTI-PATTERN: a single gzipped CSV is NOT splittable ->\n" +
        "spark.read.csv('/data/huge.csv.gz')          # 10GB -> 1 partition -> 1 task\n" +
        "spark.read.parquet('/data/huge_parquet/')    # splittable -> many tasks",
      viz: {
        type: "parquetLayout",
        data: {}
      },
      caption:
        "Pick the columns to SELECT and a WHERE filter. In Columnar mode, unselected columns dim (column pruning) and row groups whose min/max can't match the filter are skipped — watch the \"scanned %\" drop. Flip to Row format and it jumps back to a full scan."
    },

    whyMatters:
      "<p>Storage format is the cheapest performance win in data engineering, and interviewers use it to check whether you understand <i>why</i>, not just \"Parquet good.\"</p>" +
      "<ul>" +
      "<li><b>Columnar = less I/O</b> — column pruning + row-group skipping mean a query reads a fraction of the bytes. This is the single biggest reason analytics uses Parquet/ORC.</li>" +
      "<li><b>Snappy is the default for a reason</b> — query engines decompress constantly, so fast decompression beats a smaller file. Use gzip only when storage/transfer cost dominates and reads are rare.</li>" +
      "<li><b>Splittability decides parallelism</b> — a non-splittable gzipped text file is a single task no matter how big. Parquet stays splittable; that's a common \"why is my job single-threaded?\" answer.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">CSV/JSON  : row-major, no stats            -> full scan, splittable (plain)\nParquet   : columnar + min/max + snappy    -> prune cols, skip row groups, splittable\n.csv.gz   : gzip is NOT splittable          -> 10GB = 1 partition = 1 task (trap)</pre>",

    recognize: [
      { q: "\"Why Parquet over CSV for analytics?\"", think: "Columnar layout enables column pruning + row-group skipping (min/max stats) + better compression per column — a query reads far fewer bytes." },
      { q: "\"snappy or gzip?\"", think: "Snappy by default: fast decompression for repeated reads. Gzip only when storage/egress cost dominates and the data is read rarely." },
      { q: "\"My 8 GB .csv.gz reads as one task — why?\"", think: "Gzip isn't splittable, so the whole file is one partition. Convert to Parquet (or bzip2) so it can be split across tasks." },
      { q: "\"How does predicate pushdown work on Parquet?\"", think: "Each row group's column chunk stores min/max; Spark skips any row group whose stats can't satisfy the filter without reading its pages." },
      { q: "\"Does column pruning help a SELECT * ?\"", think: "No — you asked for every column. Pruning only pays off when you select a subset; another reason to avoid SELECT * on wide tables." }
    ],

    matchTags: ["parquet", "orc", "csv", "json", "columnar", "row format", "compression", "snappy",
                "gzip", "bzip2", "splittable", "row group", "column chunk", "predicate pushdown",
                "column pruning", "min max", "file format"],

    traps: [
      {
        bad: "df.write.csv('/out/big')                      # analytics table as CSV",
        good: "df.write.parquet('/out/big')                 # columnar + stats + snappy",
        why: "CSV forces a full scan on every query (no pruning, no stats) and compresses worse. For anything queried repeatedly, Parquet reads a fraction of the bytes and stores smaller."
      },
      {
        bad: "spark.read.csv('/data/events.csv.gz')         # one 12GB gzip file",
        good: "spark.read.parquet('/data/events_parquet/')  # splittable, many tasks",
        why: "Gzip is not splittable, so a single large .csv.gz is read by exactly one task regardless of cluster size. Use Parquet (splittable) or, if you must stay text, bzip2 (splittable but slow)."
      },
      {
        bad: "df.write.option('compression','gzip').parquet('/hot/')   # frequently queried",
        good: "df.write.parquet('/hot/')                                # snappy default",
        why: "Gzip's smaller files cost more CPU to decompress on every read. For hot, frequently scanned data, snappy's fast decompression wins overall; save gzip for cold archives."
      }
    ],

    complexity: [
      { op: "read 1 column (columnar)", big_o: "O(1 column)", note: "Column pruning reads only the chunks for selected columns — the rest is never touched." },
      { op: "read 1 column (row format)", big_o: "O(all columns)", note: "Rows interleave columns, so extracting one still reads the whole row — a full scan." },
      { op: "filtered scan (Parquet)", big_o: "O(surviving row groups)", note: "min/max stats skip row groups that can't match; only survivors are read." },
      { op: "snappy decompress", big_o: "fast, modest ratio", note: "Default for query engines: CPU-cheap on every read; slightly larger files than gzip." },
      { op: "gzip .csv (whole file)", big_o: "1 partition (not splittable)", note: "Non-splittable codecs force the entire file into a single task — a parallelism killer." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A Parquet file ends with a <b>footer</b> holding the schema and, per row group, per-column-chunk metadata including min/max/null counts and page offsets. Spark reads the footer first, prunes columns from the requested schema, and evaluates pushed-down predicates against the stats to decide which row groups (and, with page indexes, which pages) to read — so much of the file is skipped before any data pages are fetched.</p>" +
      "<p><b>Encodings before compression.</b> Within a column chunk Parquet applies <b>dictionary encoding</b>, <b>run-length / bit-packing</b>, and <b>delta encoding</b> first (columnar data is highly repetitive), then the codec (snappy/gzip/zstd) on top. That's why columnar files compress far better than the same data row-wise.</p>" +
      "<p><b>Modern default.</b> Parquet + snappy is the de-facto lake format; <b>zstd</b> is increasingly used for a better ratio at snappy-like speed. Delta/Iceberg/Hudi wrap Parquet with a transaction log but keep the same columnar data files underneath.</p>",

    challenge: {
      prompt:
        "An hourly pipeline lands data as one large gzipped CSV per hour (~9 GB each) in S3, and a dashboard query does SELECT country, SUM(amount) ... WHERE event_date = '2024-06-01'. Analysts complain the query is slow and 'only uses one core'. Name the two format problems and the target layout that fixes both.",
      starter:
        "# landing: s3://bucket/raw/2024-06-01-14.csv.gz   (~9 GB, gzip)\n" +
        "# query:   SELECT country, SUM(amount) WHERE event_date = '2024-06-01'\n" +
        "# slow + single-core. why? what layout fixes it?",
      solution:
        "# Problem 1 — gzip CSV is NOT splittable: each 9 GB file = 1 partition = 1\n" +
        "#   task, so the read can't parallelize ('only uses one core').\n" +
        "# Problem 2 — CSV is row-major with no stats: the query must full-scan every\n" +
        "#   column of every row even though it needs only country + amount and one date.\n" +
        "\n" +
        "# Fix: convert to PARTITIONED PARQUET (snappy). Columnar -> prune to\n" +
        "# country+amount + skip row groups via min/max; splittable -> many tasks;\n" +
        "# partitionBy(event_date) -> the WHERE prunes whole directories (partition\n" +
        "# pruning) before any file is opened.\n" +
        "(spark.read.csv('s3://bucket/raw/2024-06-01-14.csv.gz', header=True)\n" +
        "   .write.mode('append')\n" +
        "   .partitionBy('event_date')\n" +
        "   .parquet('s3://bucket/curated/events/'))\n" +
        "# Now: SELECT country, SUM(amount) ... WHERE event_date='2024-06-01'\n" +
        "#  -> reads only that date's directory, only 2 columns, only matching row groups."
    }
  }
]);
