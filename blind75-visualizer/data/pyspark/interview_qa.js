/*
 * data/pyspark/interview_qa.js — PySpark "Interview Q&A" bank.
 *
 * Rapid-fire, interview-ready theory answers (trendy-tech style): a crisp
 * one-line definition, a few high-signal bullets, a tiny analogy or interview
 * tip, and code where it earns its place. Read by js/interviewqa.js and shown
 * as a flashcard panel from PySpark Learn.
 *
 * Schema per item:
 *   { id, group, q, difficulty, tags:[], a (html), code?, lang?, tip? (html) }
 * Answers render via innerHTML (allow <b>,<code>,<i>,<ul>,<li>,<p>); code
 * renders via textContent through Prism.
 *
 * Q0 pilot = 2 groups: "Spark Fundamentals" + "Lazy Evaluation, DAG & Fault Tolerance".
 */
window.PYSPARK_QA = {
  // Full 10-group order (only groups with items render as chips).
  groups: [
    "Spark Fundamentals",
    "Architecture & Execution",
    "RDD Deep-Dive",
    "Transformations & Actions",
    "DataFrames, Datasets & Spark SQL",
    "Lazy Evaluation, DAG & Fault Tolerance",
    "Query Optimization",
    "Partitions, Shuffle & Performance",
    "Spark UI & Debugging",
    "Data Skew & Broadcast Joins",
    "I/O, Formats & Data Quality",
    "Streaming, MLlib & Graph",
    "Delta Lake, Lakehouse & Data Engineering",
    "Scenario-Based Questions"
  ],

  items: [
    // ─────────────────────────── G1 · Spark Fundamentals ───────────────────────────
    {
      id: "what-is-spark",
      group: "Spark Fundamentals",
      q: "What is Apache Spark?",
      difficulty: "Core",
      tags: ["spark", "basics", "definition"],
      a:
        "<p><b>Apache Spark is an open-source, distributed, in-memory compute engine for large-scale data processing.</b> You write your logic once, and Spark runs it in parallel across a cluster of machines with built-in fault tolerance.</p>" +
        "<ul>" +
        "<li><b>Unified engine</b> — one platform for batch, streaming, SQL, machine learning (MLlib) and graph (GraphX) workloads, so you don't stitch together separate tools.</li>" +
        "<li><b>In-memory</b> — it keeps intermediate data in RAM instead of writing to disk after every step, which is what makes it fast for iterative and interactive jobs.</li>" +
        "<li><b>Polyglot</b> — usable from Scala, Java, Python (PySpark), R and SQL.</li>" +
        "</ul>",
      tip: "One-liner to lead with: <i>\"Spark is a unified, in-memory, distributed processing engine.\"</i> Then expand on <i>unified</i> and <i>in-memory</i> — those two words carry the whole answer."
    },
    {
      id: "why-spark",
      group: "Spark Fundamentals",
      q: "Why was Spark developed / why use it over older tools?",
      difficulty: "Core",
      tags: ["spark", "mapreduce", "motivation"],
      a:
        "<p>Spark was built to fix the pain of <b>Hadoop MapReduce</b>: MapReduce writes every intermediate result to disk, so multi-stage and iterative jobs (ML, graph algorithms) were painfully slow — sometimes hours or days.</p>" +
        "<ul>" +
        "<li><b>Speed</b> — in-memory computation gives up to <b>~100x</b> in memory and <b>~10x</b> on disk vs MapReduce.</li>" +
        "<li><b>Ease of use</b> — high-level DataFrame / SQL APIs instead of hand-writing verbose Map and Reduce classes.</li>" +
        "<li><b>Beyond batch</b> — MapReduce only did batch; Spark adds streaming, interactive SQL and ML in one engine.</li>" +
        "<li><b>Scale</b> — RDBMS-style systems couldn't scale horizontally as data grew; Spark scales out across commodity nodes.</li>" +
        "</ul>",
      tip: "Lead with the <b>in-memory</b> contrast: MapReduce writes to disk between every stage; Spark keeps data in RAM and plans the whole DAG — that's the ~10–100x."
    },
    {
      id: "what-is-pyspark",
      group: "Spark Fundamentals",
      q: "What is PySpark? What are its characteristics and trade-offs?",
      difficulty: "Core",
      tags: ["pyspark", "python", "py4j"],
      a:
        "<p><b>PySpark is the Python API for Apache Spark</b> — it lets you drive the Scala/JVM Spark engine from Python. The bridge between Python and the JVM is a library called <b>Py4J</b>, which is why you need Java installed to run PySpark.</p>" +
        "<ul>" +
        "<li><b>Characteristics</b> — distributed &amp; in-memory, lazy evaluation, fault tolerant (via RDD lineage), supports real-time streaming, and runs anywhere (Standalone, YARN, Mesos, Kubernetes, cloud).</li>" +
        "<li><b>Pros</b> — Python's huge ecosystem + Spark's scale; easy to express ETL and analytics; open source.</li>" +
        "<li><b>Cons</b> — a bit slower than Scala (Python↔JVM serialization overhead), and it's memory-hungry so it needs decent hardware.</li>" +
        "</ul>",
      tip: "If asked <i>\"why is PySpark slower than Scala Spark?\"</i> — the answer is the <b>Py4J / serialization hop</b> between the Python process and the JVM, worst with Python UDFs."
    },
    {
      id: "spark-vs-mapreduce",
      group: "Spark Fundamentals",
      q: "How is Spark faster than / different from Hadoop MapReduce?",
      difficulty: "Core",
      tags: ["mapreduce", "hadoop", "comparison", "performance"],
      a:
        "<p>The headline difference is <b>where the data lives between stages</b>:</p>" +
        "<ul>" +
        "<li><b>Memory vs disk</b> — Spark keeps intermediate data in RAM; MapReduce reads/writes to disk after every Map and Reduce step. That disk I/O is the main reason MR is slow.</li>" +
        "<li><b>DAG vs rigid stages</b> — Spark builds a whole DAG and optimizes across it; MapReduce is locked into a fixed Map→Reduce shape, so complex logic needs many chained jobs.</li>" +
        "<li><b>Workload range</b> — Spark handles batch, streaming, SQL and ML; MapReduce is batch-only.</li>" +
        "<li><b>Scheduling</b> — Spark schedules its own tasks; MapReduce often needs external schedulers like Oozie.</li>" +
        "</ul>" +
        "<p>Net: up to <b>~100x</b> faster in memory, <b>~10x</b> on disk.</p>",
      tip: "If you give one word, give <b>in-memory</b> (no disk write between stages). The DAG optimizer is the strong second point."
    },
    {
      id: "pyspark-vs-pandas",
      group: "Spark Fundamentals",
      q: "Is PySpark faster than pandas? When would you use each?",
      difficulty: "Common",
      tags: ["pandas", "comparison", "scale"],
      a:
        "<p><b>It depends on data size — they solve different problems.</b></p>" +
        "<ul>" +
        "<li><b>pandas</b> runs on a <b>single machine, in one process</b>. It's faster and simpler for data that comfortably fits in one machine's memory (up to a few GB).</li>" +
        "<li><b>PySpark</b> runs <b>distributed across many machines</b> and processes in parallel, so it wins decisively once data is too big for one box — and it scales to TB/PB.</li>" +
        "</ul>" +
        "<p><b>Rule of thumb:</b> small data → pandas; big data or a cluster → PySpark. For a middle ground, the <i>pandas API on Spark</i> lets you write pandas-like code that runs distributed.</p>",
      tip: "Don't say \"PySpark is always faster.\" For a 10 MB CSV, pandas beats PySpark easily — Spark's cluster/scheduling overhead isn't worth it at small scale."
    },
    {
      id: "spark-languages",
      group: "Spark Fundamentals",
      q: "Which languages does Apache Spark support?",
      difficulty: "Core",
      tags: ["languages", "scala"],
      a:
        "<p>Spark offers first-class APIs in <b>Scala, Java, Python (PySpark), R</b>, and <b>SQL</b>.</p>" +
        "<ul>" +
        "<li>Spark itself is <b>written in Scala</b> and runs on the JVM, so Scala/Java are the most native.</li>" +
        "<li>Python and R talk to the JVM engine through bridges (Py4J for Python).</li>" +
        "<li>SQL is available via Spark SQL over DataFrames / temp views.</li>" +
        "</ul>",
      tip: "Note Spark is <b>written in Scala / runs on the JVM</b>; Python & R reach it through a bridge (Py4J for Python) — that framing explains PySpark's overhead."
    },
    {
      id: "spark-limitations",
      group: "Spark Fundamentals",
      q: "What are the limitations of Apache Spark?",
      difficulty: "Common",
      tags: ["limitations", "memory", "oltp"],
      a:
        "<p>Spark is powerful but not a silver bullet:</p>" +
        "<ul>" +
        "<li><b>Memory-hungry &amp; costly</b> — in-memory processing needs lots of RAM; clusters aren't cheap.</li>" +
        "<li><b>Not for OLTP</b> — it's built for analytics (OLAP), not row-level transactional inserts/updates.</li>" +
        "<li><b>Weak on small/tiny files</b> — the \"small files problem\" and per-task overhead hurt when data is tiny.</li>" +
        "<li><b>No built-in storage</b> — Spark only computes; it relies on external storage (HDFS, S3, etc.).</li>" +
        "<li><b>Security is thin</b> out of the box and usually handled by the surrounding platform (YARN, Kerberos, cloud IAM).</li>" +
        "</ul>",
      tip: "The two interviewers listen for: <b>no built-in storage</b> (it only computes) and <b>no true real-time</b> (Structured Streaming is micro-batch). Plus it's memory-hungry."
    },

    // ─────────────── G6 · Lazy Eval, DAG, Lineage & Catalyst ───────────────
    {
      id: "lazy-evaluation",
      group: "Lazy Evaluation, DAG & Fault Tolerance",
      q: "What is lazy evaluation in Spark, and why does it help?",
      difficulty: "Core",
      tags: ["lazy", "transformation", "action", "optimization"],
      a:
        "<p><b>Lazy evaluation means Spark doesn't run a transformation the moment you write it — it just records it in a plan and waits until an action forces a result.</b></p>" +
        "<ul>" +
        "<li>Transformations (<code>select</code>, <code>filter</code>, <code>withColumn</code>, <code>join</code>) only <b>build up a DAG</b>; nothing computes yet.</li>" +
        "<li>An action (<code>show</code>, <code>count</code>, <code>collect</code>, <code>write</code>) is what <b>triggers the job</b>.</li>" +
        "</ul>" +
        "<p><b>Why it helps:</b> because Spark sees the <i>whole</i> pipeline before running, it can optimize across it — push filters down to the source, prune unused columns, and combine narrow steps into one pass. An eager, line-by-line engine can't do that.</p>" +
        "<p><b>Two consequences worth naming</b> if they probe: (1) a <b>runtime error in a transformation surfaces only when the action runs</b>, not where you wrote the line — surprising when debugging; (2) without caching, each action <b>re-runs the whole lineage</b> from the source, so a DataFrame used by several actions is recomputed each time unless you <code>cache()</code> it. (Note: some operations like <code>printSchema</code> or reading with <code>inferSchema</code> do trigger a small eager job.)</p>",
      code:
        "df2 = (df.filter(F.col('amt') > 0)      # lazy - nothing runs\n" +
        "         .withColumn('tax', F.col('amt') * 0.1)\n" +
        "         .select('country', 'tax'))     # still lazy\n" +
        "\n" +
        "df2.show(5)   # ACTION -> Catalyst optimizes the plan, THEN it runs",
      lang: "python",
      tip: "Classic gotcha they test: <i>\"my cell returned instantly but show() hangs.\"</i> — transformations were lazy; all the real work landed on the action."
    },
    {
      id: "what-is-dag",
      group: "Lazy Evaluation, DAG & Fault Tolerance",
      q: "What is a DAG in Spark and why is it needed?",
      difficulty: "Core",
      tags: ["dag", "scheduler", "stages"],
      a:
        "<p><b>DAG = Directed Acyclic Graph</b> — Spark's internal map of your whole computation, where each node is an operation on data and edges show dependencies. <i>Directed</i> = flows one way; <i>Acyclic</i> = no loops.</p>" +
        "<ul>" +
        "<li>When an action fires, the <b>DAG Scheduler</b> turns the DAG into <b>stages</b> (split at shuffle boundaries) and stages into <b>tasks</b>.</li>" +
        "<li>Seeing the full graph lets Spark <b>optimize execution</b>: pipeline narrow operations, minimize shuffles, and schedule tasks efficiently.</li>" +
        "<li>It also underpins <b>fault recovery</b> — Spark knows exactly how to rebuild any piece.</li>" +
        "</ul>",
      tip: "Interviewers love the chain: <b>DAG → stages (cut at shuffles) → tasks (one per partition)</b>. Say that and you've shown you understand execution, not just the acronym."
    },
    {
      id: "dag-vs-lineage",
      group: "Lazy Evaluation, DAG & Fault Tolerance",
      q: "What's the difference between a DAG and lineage?",
      difficulty: "Common",
      tags: ["dag", "lineage", "comparison"],
      a:
        "<p>They're related but not the same:</p>" +
        "<ul>" +
        "<li><b>DAG</b> — the <i>whole execution plan</i> of a job: all operations and their dependencies, used by the scheduler to plan and optimize stages and tasks.</li>" +
        "<li><b>Lineage</b> — the <i>recipe to rebuild a single RDD/DataFrame</i>: the exact chain of transformations that produced it, used for <b>fault recovery</b>.</li>" +
        "</ul>" +
        "<p>Simple framing: <b>DAG is about execution &amp; optimization; lineage is about recovery.</b> Lineage is essentially the ancestry recorded inside the DAG.</p>",
      tip: "Crisp split: <b>DAG = how to run it</b> (stages/tasks, forward-looking); <b>lineage = how to rebuild it</b> (recover a lost partition, backward-looking)."
    },
    {
      id: "lineage-graph",
      group: "Lazy Evaluation, DAG & Fault Tolerance",
      q: "What is a lineage graph (RDD lineage)?",
      difficulty: "Core",
      tags: ["lineage", "fault-tolerance", "rdd"],
      a:
        "<p><b>Lineage is the logged sequence of transformations that created an RDD/DataFrame — it records the <i>steps</i>, not the data.</b> Because RDDs are immutable, every transformation makes a new RDD and appends a link to this chain.</p>" +
        "<ul>" +
        "<li>If a partition is <b>lost</b> (node failure), Spark replays only that partition's lineage to <b>recompute</b> it — no need to re-run everything or keep replicas.</li>" +
        "<li>This is exactly how Spark achieves <b>fault tolerance</b> cheaply.</li>" +
        "<li>Very long lineages get expensive to recompute — that's when you <code>cache()</code> or <b>checkpoint</b> to cut the chain.</li>" +
        "</ul>",
      tip: "Key phrase: <i>\"lineage stores the transformations, not the data.\"</i> That single line usually satisfies the follow-up on how fault tolerance works without replication."
    },
    {
      id: "catalyst-optimizer",
      group: "Query Optimization",
      q: "What is the Catalyst optimizer?",
      difficulty: "Common",
      tags: ["catalyst", "spark-sql", "optimization"],
      a:
        "<p><b>Catalyst is Spark SQL's query optimizer</b> — it takes your DataFrame/SQL code and rewrites it into an efficient physical execution plan. It's the reason DataFrames are faster than hand-written RDD code.</p>" +
        "<p>It works in <b>four phases</b>:</p>" +
        "<ul>" +
        "<li><b>Analysis</b> — resolve column names, tables and types against the catalog.</li>" +
        "<li><b>Logical optimization</b> — rule-based rewrites: predicate pushdown, column pruning, constant folding.</li>" +
        "<li><b>Physical planning</b> — generate multiple physical plans and pick the cheapest by <b>cost</b> (e.g. broadcast vs sort-merge join).</li>" +
        "<li><b>Code generation</b> — compile parts of the plan to JVM bytecode (Tungsten / whole-stage codegen) for speed.</li>" +
        "</ul>" +
        "<p><b>The plan artifacts to name</b> (what <code>explain(True)</code> prints): <b>unresolved logical plan → resolved (analyzed) logical plan → optimized logical plan → one or more physical plans → selected physical plan</b>. It mixes <b>rule-based</b> rewrites (always-true) with <b>cost-based</b> choices (join order/strategy from statistics).</p>" +
        "<p><b>Key caveat:</b> Catalyst only sees <b>DataFrame/Dataset/SQL</b> code — raw RDD operations are opaque to it, which is exactly why DataFrames outperform hand-written RDDs for structured work.</p>",
      tip: "Say the four phases and drop <b>\"predicate pushdown + column pruning\"</b> — those are the optimizations interviewers most want to hear named. If pushed, recite the plan chain (unresolved → analyzed → optimized → physical) and note Catalyst <i>can't</i> optimize RDD code."
    },
    {
      id: "fault-tolerance",
      group: "Lazy Evaluation, DAG & Fault Tolerance",
      q: "How does Spark achieve fault tolerance?",
      difficulty: "Core",
      tags: ["fault-tolerance", "lineage", "reliability"],
      a:
        "<p><b>Primarily through RDD lineage.</b> Spark doesn't replicate data to survive failures — it remembers <i>how</i> each partition was built, and recomputes any lost piece from its lineage.</p>" +
        "<ul>" +
        "<li>If a node dies, only the <b>lost partitions</b> are recomputed from their parent data — the rest of the job is untouched.</li>" +
        "<li>Immutability makes this safe: source data isn't mutated, so replays are deterministic.</li>" +
        "<li>For very long lineages or streaming, Spark adds <b>checkpointing</b> (persist to reliable storage) and a <b>Write-Ahead Log</b> so recovery doesn't replay from the very beginning.</li>" +
        "<li>The driver/cluster manager also reschedules failed tasks and can use <b>speculative execution</b> for stragglers.</li>" +
        "</ul>",
      tip: "The magic word is <b>lineage</b>: Spark recomputes only the lost partitions from the DAG — no data replication needed, unlike HDFS."
    },

    // ─────────────────────── G2 · Architecture & Execution ───────────────────────
    {
      id: "pyspark-architecture",
      group: "Architecture & Execution",
      q: "Explain the Spark / PySpark architecture.",
      difficulty: "Core",
      tags: ["architecture", "driver", "executor", "master-slave"],
      a:
        "<p>Spark runs a <b>master-slave</b> architecture with four moving parts:</p>" +
        "<ul>" +
        "<li><b>Driver</b> (master) — runs your <code>main()</code>, creates the SparkSession, builds the DAG and schedules work.</li>" +
        "<li><b>Cluster Manager</b> — allocates resources (YARN, Standalone, Mesos, K8s).</li>" +
        "<li><b>Executors</b> (on worker nodes) — JVM processes that actually run tasks and cache data in memory/disk.</li>" +
        "<li><b>Task</b> — the smallest unit of work, one per partition, sent to an executor.</li>" +
        "</ul>" +
        "<p><b>End-to-end flow when an action fires</b> (the deeper version interviewers want):</p>" +
        "<ul>" +
        "<li>The driver builds a <b>DAG</b> of your transformations; the <b>DAGScheduler</b> splits it into <b>stages at shuffle boundaries</b> and each stage into <b>tasks</b> (one per partition).</li>" +
        "<li>The <b>TaskScheduler</b> hands those tasks to executors via the cluster manager, respecting <b>data locality</b>.</li>" +
        "<li>Executors run the tasks on their partitions, cache/shuffle as needed, and report status back; the driver assembles the result.</li>" +
        "</ul>" +
        "<p>Hierarchy to recite: <b>Application → Jobs (one per action) → Stages (cut at shuffles) → Tasks (one per partition)</b>.</p>",
      tip: "Say the chain out loud: <b>Driver → Cluster Manager → Executors → Tasks</b>, then the scheduling detail — <b>DAGScheduler cuts stages at shuffles, TaskScheduler places tasks on executors by locality</b>. That second sentence is what separates a senior answer."
    },
    {
      id: "spark-driver",
      group: "Architecture & Execution",
      q: "What is the Spark Driver and what does it do?",
      difficulty: "Core",
      tags: ["driver", "scheduling", "dag"],
      a:
        "<p><b>The Driver is the master process that runs your application's <code>main()</code> and orchestrates everything.</b></p>" +
        "<ul>" +
        "<li>Creates the <b>SparkSession/SparkContext</b> — the entry point to the cluster.</li>" +
        "<li>Converts your code into a <b>DAG → stages → tasks</b> and schedules those tasks on executors.</li>" +
        "<li>Houses the two schedulers: the <b>DAGScheduler</b> (splits the DAG into stages at shuffle boundaries, handles stage retries) and the <b>TaskScheduler</b> (launches tasks on executors, handles task retries and speculation).</li>" +
        "<li>Tracks metadata, accumulator values and cluster state, hosts the <b>Spark UI</b> (port 4040), and <b>collects results</b> back.</li>" +
        "</ul>" +
        "<p>It's a single point of coordination — if the driver dies, the whole application dies, which is why in production it runs inside the cluster (cluster mode). Note it's also a bottleneck for <code>collect()</code>: pulling a big result to the driver OOMs it.</p>",
      tip: "Call it the <b>brain</b>: it holds SparkContext, builds the DAG, and schedules tasks. If the driver dies, the whole application dies."
    },
    {
      id: "worker-node",
      group: "Architecture & Execution",
      q: "What is a worker node vs an executor?",
      difficulty: "Common",
      tags: ["worker", "executor", "slave", "task"],
      a:
        "<ul>" +
        "<li><b>Worker node</b> — a machine in the cluster that provides CPU/RAM (a.k.a. “slave node” — the terms are used interchangeably).</li>" +
        "<li><b>Executor</b> — a JVM process launched <i>on</i> a worker for your specific application. It runs the actual tasks and keeps cached/shuffle data in memory or disk.</li>" +
        "</ul>" +
        "<p>One worker can host several executors, and each application gets its own executors (they aren't shared across apps). Executors live for the lifetime of the app.</p>",
      tip: "Don't conflate them: a <b>worker is a machine</b>; an <b>executor is a JVM process</b> on that machine that runs tasks. One worker can host several executors."
    },
    {
      id: "sparkcontext",
      group: "Architecture & Execution",
      q: "What is SparkContext?",
      difficulty: "Core",
      tags: ["sparkcontext", "rdd", "entry-point"],
      a:
        "<p><b>SparkContext is the original entry point to Spark (since 1.x)</b> — it's your connection to the cluster and is used to create RDDs, accumulators and broadcast variables.</p>" +
        "<ul>" +
        "<li>You can have <b>only one SparkContext per JVM</b>; call <code>stop()</code> before creating another.</li>" +
        "<li>In modern code it lives <i>inside</i> SparkSession — reach it via <code>spark.sparkContext</code>.</li>" +
        "</ul>",
      code:
        "from pyspark import SparkContext\n" +
        "sc = SparkContext('local', 'MyApp')\n" +
        "rdd = sc.parallelize([1, 2, 3])\n" +
        "sc.stop()   # must stop before making another",
      lang: "python",
      tip: "Frame it as the <b>original (pre-2.0) entry point</b> for RDDs and cluster connection — now reached via <code>spark.sparkContext</code>."
    },
    {
      id: "sparksession",
      group: "Architecture & Execution",
      q: "What is SparkSession?",
      difficulty: "Core",
      tags: ["sparksession", "dataframe", "entry-point"],
      a:
        "<p><b>SparkSession is the unified entry point introduced in Spark 2.0.</b> It merged the older <code>SQLContext</code>, <code>HiveContext</code> and <code>SparkContext</code> into one object so you have a single door to DataFrames, Datasets and SQL.</p>" +
        "<ul>" +
        "<li>Built with the <b>builder</b> pattern; <code>getOrCreate()</code> reuses an existing session or makes a new one.</li>" +
        "<li>Use it to read data, create DataFrames, and run <code>spark.sql(...)</code>.</li>" +
        "</ul>",
      code:
        "from pyspark.sql import SparkSession\n" +
        "spark = (SparkSession.builder\n" +
        "         .appName('MyApp')\n" +
        "         .master('local[*]')\n" +
        "         .getOrCreate())",
      lang: "python",
      tip: "Say it's the <b>single unified entry point since Spark 2.0</b> — it wraps the old SparkContext, SQLContext and HiveContext."
    },
    {
      id: "sparkcontext-vs-sparksession",
      group: "Architecture & Execution",
      q: "SparkContext vs SparkSession — what's the difference?",
      difficulty: "Common",
      tags: ["sparkcontext", "sparksession", "comparison"],
      a:
        "<ul>" +
        "<li><b>SparkContext</b> (Spark 1.x) — the low-level connection to the cluster, centered on <b>RDDs</b>, accumulators and broadcast variables.</li>" +
        "<li><b>SparkSession</b> (Spark 2.0+) — the <b>unified</b> entry point for DataFrames, Datasets and SQL; it wraps SparkContext plus the old SQL/Hive contexts.</li>" +
        "</ul>" +
        "<p>Practically: <b>use SparkSession</b> for everything today, and if you need the RDD-level context, grab it via <code>spark.sparkContext</code>.</p>",
      tip: "One line: since 2.0 you create a <b>SparkSession</b>, and it <i>contains</i> the SparkContext (<code>spark.sparkContext</code>). You rarely make a SparkContext directly anymore."
    },
    {
      id: "cluster-managers",
      group: "Architecture & Execution",
      q: "Which cluster managers does Spark support?",
      difficulty: "Common",
      tags: ["yarn", "kubernetes", "mesos", "standalone"],
      a:
        "<p>The cluster manager's job is to <b>allocate resources (CPU/RAM) across applications</b>. Spark supports:</p>" +
        "<ul>" +
        "<li><b>Standalone</b> — Spark's built-in manager, quick to set up.</li>" +
        "<li><b>YARN</b> — Hadoop's resource manager; the most common in production.</li>" +
        "<li><b>Mesos</b> — a general-purpose cluster manager (now less common).</li>" +
        "<li><b>Kubernetes</b> — container-orchestrated Spark, increasingly the modern default.</li>" +
        "<li><b>local</b> — not really a cluster; runs Spark on your laptop for dev/testing.</li>" +
        "</ul>",
      tip: "Add the nuance interviewers want: the manager only <b>allocates resources</b> — Spark still does its own task scheduling on top. YARN & Kubernetes are the common ones."
    },
    {
      id: "deploy-modes",
      group: "Architecture & Execution",
      q: "Cluster mode vs Client mode — what's the difference?",
      difficulty: "Common",
      tags: ["deploy-mode", "cluster", "client", "driver"],
      a:
        "<p>The difference is simply <b>where the Driver runs</b>:</p>" +
        "<ul>" +
        "<li><b>Cluster mode</b> — the driver runs <i>inside</i> the cluster (in an application master). The client can disconnect after submitting. This is the <b>production</b> choice.</li>" +
        "<li><b>Client mode</b> — the driver runs on the <i>machine you submit from</i>; executors still run in the cluster. Great for <b>interactive work and debugging</b> (notebooks, spark-shell).</li>" +
        "</ul>",
      code:
        "spark-submit --deploy-mode cluster app.py   # driver in cluster (prod)\n" +
        "spark-submit --deploy-mode client  app.py   # driver on your box (debug)",
      lang: "bash",
      tip: "The whole answer hinges on <b>where the driver runs</b>: <b>cluster</b> mode = driver on a worker (production); <b>client</b> mode = driver on your machine (dev / notebooks)."
    },
    {
      id: "spark-submit",
      group: "Architecture & Execution",
      q: "What is spark-submit?",
      difficulty: "Common",
      tags: ["spark-submit", "deployment", "cli"],
      a:
        "<p><b><code>spark-submit</code> is the command-line tool that launches a Spark application on a cluster.</b> You point it at your code and tell it how much resource to use.</p>" +
        "<ul>" +
        "<li><b><code>--master</code></b> — where to run (yarn, k8s, spark://host:7077, local[*]).</li>" +
        "<li><b><code>--deploy-mode</code></b> — cluster or client.</li>" +
        "<li><b>Resources</b> — <code>--driver-memory</code>, <code>--executor-memory</code>, <code>--executor-cores</code>, <code>--num-executors</code>.</li>" +
        "</ul>",
      code:
        "spark-submit \\\n" +
        "  --master yarn \\\n" +
        "  --deploy-mode cluster \\\n" +
        "  --executor-memory 4G --num-executors 10 \\\n" +
        "  my_job.py",
      lang: "bash",
      tip: "Know the key flags: <code>--master</code>, <code>--deploy-mode</code>, <code>--executor-memory</code>, <code>--num-executors</code>, <code>--conf</code> — they get asked as a follow-up."
    },
    {
      id: "spark-components",
      group: "Architecture & Execution",
      q: "What are the components of the Spark ecosystem?",
      difficulty: "Core",
      tags: ["components", "spark-sql", "mllib", "graphx", "streaming"],
      a:
        "<p>Spark is one engine with specialized libraries on top of a shared core:</p>" +
        "<ul>" +
        "<li><b>Spark Core</b> — the heart: task scheduling, memory management, fault recovery, and the RDD API.</li>" +
        "<li><b>Spark SQL</b> — structured data via DataFrames + SQL (with Catalyst).</li>" +
        "<li><b>Spark Streaming / Structured Streaming</b> — near-real-time processing.</li>" +
        "<li><b>MLlib</b> — scalable machine learning.</li>" +
        "<li><b>GraphX</b> — graph and graph-parallel computation.</li>" +
        "</ul>" +
        "<p>In PySpark these map to modules like <code>pyspark.sql</code>, <code>pyspark.streaming</code> and <code>pyspark.ml</code>.</p>",
      tip: "Frame it as <b>Spark Core at the base</b> with SQL, Structured Streaming, MLlib and GraphX layered on top — all sharing one engine and the Catalyst optimizer."
    },

    // ─────────────────────────── G3 · RDD Deep-Dive ───────────────────────────
    {
      id: "what-is-rdd",
      group: "RDD Deep-Dive",
      q: "What is an RDD?",
      difficulty: "Core",
      tags: ["rdd", "abstraction", "fault-tolerance"],
      a:
        "<p><b>RDD = Resilient Distributed Dataset</b> — Spark's original low-level abstraction: an <b>immutable, fault-tolerant, distributed</b> collection of elements partitioned across the cluster and operated on in parallel.</p>" +
        "<ul>" +
        "<li><b>Resilient</b> — rebuilds lost partitions from lineage.</li>" +
        "<li><b>Distributed</b> — split into partitions across nodes.</li>" +
        "<li><b>Dataset</b> — the records themselves.</li>" +
        "</ul>" +
        "<p><b>If they dig deeper, name the five internal properties</b> every RDD exposes (the classic follow-up):</p>" +
        "<ul>" +
        "<li><b>A list of partitions</b> (<code>getPartitions</code>) — how the data is split.</li>" +
        "<li><b>A compute function</b> (<code>compute</code>) — how to produce each partition.</li>" +
        "<li><b>Dependencies on parent RDDs</b> — the lineage, narrow or wide.</li>" +
        "<li><b>(Optional) a Partitioner</b> — hash/range, for key-value RDDs.</li>" +
        "<li><b>(Optional) preferred locations</b> — data-locality hints (e.g. HDFS block hosts) so tasks run near the data.</li>" +
        "</ul>" +
        "<p>Key traits: in-memory, immutable, lazily evaluated, fault-tolerant. Downside: <b>no schema and no Catalyst optimizer</b>, so it's more verbose and slower than DataFrames for structured work.</p>",
      tip: "The phrase to say: <b>immutable, partitioned, fault-tolerant (via lineage) distributed collection</b>. If they push further, the <b>five properties</b> (partitions, compute, dependencies, partitioner, preferred locations) is the answer they're fishing for."
    },
    {
      id: "rdd-immutable",
      group: "RDD Deep-Dive",
      q: "Why are RDDs immutable?",
      difficulty: "Common",
      tags: ["rdd", "immutability", "lineage"],
      a:
        "<p>Immutability is what makes RDDs safe and recoverable:</p>" +
        "<ul>" +
        "<li><b>Fault tolerance</b> — because inputs never change, Spark can deterministically <b>recompute</b> a lost partition from its lineage.</li>" +
        "<li><b>Safe parallelism</b> — many tasks can read the same data with no locks or race conditions.</li>" +
        "<li><b>Functional model</b> — every transformation returns a <i>new</i> RDD instead of mutating the old one.</li>" +
        "</ul>",
      tip: "Tie it back to two benefits: immutability is what makes <b>lineage-based recovery</b> possible and makes parallel reads <b>lock-free</b>."
    },
    {
      id: "create-rdd",
      group: "RDD Deep-Dive",
      q: "How do you create an RDD?",
      difficulty: "Common",
      tags: ["rdd", "parallelize", "textfile"],
      a:
        "<p>There are <b>three</b> ways:</p>" +
        "<ul>" +
        "<li><b>Parallelize</b> an existing in-memory collection.</li>" +
        "<li><b>Reference external storage</b> — read a file from HDFS, S3, local disk, etc.</li>" +
        "<li><b>Transform</b> an existing RDD (map, filter…) into a new one.</li>" +
        "</ul>",
      code:
        "rdd1 = sc.parallelize([1, 2, 3, 4])        # from a collection\n" +
        "rdd2 = sc.textFile('/data/file.txt')       # from storage\n" +
        "rdd3 = rdd1.map(lambda x: x * 2)           # from another RDD",
      lang: "python",
      tip: "Remember the <b>three</b> ways: <code>parallelize</code> a collection, read from storage (<code>textFile</code>), or transform an existing RDD."
    },
    {
      id: "rdd-types",
      group: "RDD Deep-Dive",
      q: "What are the types of RDD?",
      difficulty: "Deep",
      tags: ["rdd", "pairrdd", "types"],
      a:
        "<p>The one that matters in interviews is the <b>Pair RDD</b> (key-value RDD) — it unlocks all the by-key operations (<code>reduceByKey</code>, <code>groupByKey</code>, <code>join</code>, <code>aggregateByKey</code>).</p>" +
        "<p>Under the hood Spark also has internal specializations created as you work:</p>" +
        "<ul>" +
        "<li><b>HadoopRDD</b> — reading from HDFS.</li>" +
        "<li><b>ShuffledRDD</b> — produced by a shuffle.</li>" +
        "<li><b>ParallelCollectionRDD</b> — from <code>parallelize</code>.</li>" +
        "</ul>" +
        "<p>You rarely name these directly; know <b>Pair RDD</b> and that shuffles create ShuffledRDDs.</p>",
      tip: "The one that matters in practice is the <b>Pair RDD</b> (key–value) — it's what unlocks the <code>*ByKey</code> aggregation and join operations."
    },
    {
      id: "paired-rdd",
      group: "RDD Deep-Dive",
      q: "What is a Paired RDD?",
      difficulty: "Common",
      tags: ["pairrdd", "key-value", "aggregation"],
      a:
        "<p><b>A Paired RDD is an RDD whose elements are (key, value) tuples.</b> This key-value shape is what enables Spark's most useful distributed operations.</p>" +
        "<ul>" +
        "<li>By-key aggregation: <code>reduceByKey</code>, <code>aggregateByKey</code>, <code>groupByKey</code>.</li>" +
        "<li>Key-based joins: <code>join</code>, <code>leftOuterJoin</code>, <code>cogroup</code>.</li>" +
        "<li>Key ordering: <code>sortByKey</code>.</li>" +
        "</ul>" +
        "<p>Any of these that move data by key can trigger a <b>shuffle</b>.</p>",
      code:
        "pairs = sc.parallelize([('a', 1), ('b', 2), ('a', 3)])\n" +
        "pairs.reduceByKey(lambda x, y: x + y).collect()\n" +
        "# [('a', 4), ('b', 2)]",
      lang: "python",
      tip: "Call it the <b>aggregation workhorse</b>: a key–value RDD is what enables <code>reduceByKey</code>, <code>groupByKey</code>, <code>join</code> and <code>cogroup</code>."
    },
    {
      id: "when-use-rdd",
      group: "RDD Deep-Dive",
      q: "When should you use RDDs instead of DataFrames?",
      difficulty: "Common",
      tags: ["rdd", "dataframe", "when-to-use"],
      a:
        "<p><b>Default to DataFrames</b> — they get Catalyst optimization and are faster and shorter for structured data. Reach for RDDs only when you genuinely need low-level control:</p>" +
        "<ul>" +
        "<li>Truly <b>unstructured</b> data with no fixed schema.</li>" +
        "<li><b>Fine-grained control</b> over physical execution or <b>custom partitioning</b>.</li>" +
        "<li>Complex, non-tabular transformations that don't map to SQL/DataFrame ops.</li>" +
        "</ul>" +
        "<p>The cost of RDDs: no schema, <b>no Catalyst optimizer</b>, and more boilerplate.</p>",
      tip: "Be honest: <b>rarely today</b> — only for unstructured data, fine-grained control, or custom partitioning. Default to DataFrames so Catalyst can optimize."
    },

    // ─────────────── G4 · Transformations, Actions & RDD API ───────────────
    {
      id: "transformations-vs-actions",
      group: "Transformations & Actions",
      q: "What is the difference between a transformation and an action?",
      difficulty: "Core",
      tags: ["transformation", "action", "lazy"],
      a:
        "<ul>" +
        "<li><b>Transformations</b> are <b>lazy</b> — they define a new RDD/DataFrame from an existing one but don't run. They just extend the DAG. Examples: <code>map</code>, <code>filter</code>, <code>flatMap</code>, <code>reduceByKey</code>, <code>join</code>.</li>" +
        "<li><b>Actions</b> <b>trigger execution</b> and return a value to the driver (or write to storage). Examples: <code>collect</code>, <code>count</code>, <code>first</code>, <code>take</code>, <code>saveAsTextFile</code>.</li>" +
        "</ul>" +
        "<p>Simple test: <b>if it returns another RDD/DataFrame it's a transformation; if it returns a concrete value or writes output, it's an action.</b> Nothing runs until an action fires.</p>",
      tip: "One line: <b>transformations are lazy</b> and return a new RDD/DataFrame; <b>actions trigger the job</b> and return a value or write output."
    },
    {
      id: "narrow-vs-wide",
      group: "Transformations & Actions",
      q: "Narrow vs wide transformations?",
      difficulty: "Core",
      tags: ["narrow", "wide", "shuffle", "stages"],
      a:
        "<ul>" +
        "<li><b>Narrow</b> — each input partition contributes to <b>exactly one</b> output partition; no data moves across the network. Examples: <code>map</code>, <code>filter</code>, <code>flatMap</code>, <code>union</code>. Fast, pipelined within a stage.</li>" +
        "<li><b>Wide</b> — output partitions depend on <b>many</b> input partitions, so Spark must <b>shuffle</b> data across executors. Examples: <code>groupByKey</code>, <code>reduceByKey</code>, <code>join</code>, <code>distinct</code>, <code>repartition</code>.</li>" +
        "</ul>" +
        "<p>This matters because <b>wide transformations create stage boundaries and are the expensive part</b> of a job — minimizing shuffles is most of Spark tuning.</p>" +
        "<p><b>The mechanism to connect it to:</b> a run of narrow transformations is <b>pipelined into a single stage</b> — each task runs the whole chain (filter→map→…) on one partition in memory, with no network and no materialization between steps. A wide transformation forces an <b>Exchange (shuffle)</b>, which <i>ends one stage and starts the next</i>. So the technical definition is really about the <b>dependency type</b>: narrow = one parent partition per child (<code>OneToOneDependency</code>), wide = many parents per child (<code>ShuffleDependency</code>).</p>",
      tip: "The payoff sentence: <b>wide = shuffle = a new stage boundary</b>. Minimizing wide transformations is basically what Spark tuning <i>is</i>."
    },
    {
      id: "spot-transformation-action",
      group: "Transformations & Actions",
      q: "How do you tell if an operation is a transformation or an action in your code?",
      difficulty: "Common",
      tags: ["transformation", "action", "return-type"],
      a:
        "<p><b>Look at the return type.</b></p>" +
        "<ul>" +
        "<li>Returns another <b>RDD/DataFrame</b> → <b>transformation</b> (lazy). e.g. <code>df.filter(...)</code> gives a DataFrame.</li>" +
        "<li>Returns a <b>value</b> (int, list, row) or performs a <b>write</b> → <b>action</b> (eager). e.g. <code>df.count()</code> returns a number, <code>df.write...</code> produces output.</li>" +
        "</ul>" +
        "<p>Another tell: if calling it kicks off a job in the Spark UI, it was an action.</p>",
      tip: "Rule of thumb: look at the <b>return type</b> — returns a DataFrame/RDD → transformation (lazy); returns a value or writes → action (runs now)."
    },
    {
      id: "map-flatmap-filter",
      group: "Transformations & Actions",
      q: "map vs flatMap vs filter?",
      difficulty: "Core",
      tags: ["map", "flatmap", "filter"],
      a:
        "<ul>" +
        "<li><b>map</b> — one-to-one: applies a function to each element, returns exactly one output per input.</li>" +
        "<li><b>flatMap</b> — one-to-many: returns an iterable per element and <b>flattens</b> the results into a single collection (great for tokenizing/splitting).</li>" +
        "<li><b>filter</b> — keeps only elements where the predicate is true.</li>" +
        "</ul>" +
        "<p>All three are <b>narrow transformations</b>.</p>",
      code:
        "rdd = sc.parallelize(['a b', 'c'])\n" +
        "rdd.map(lambda s: s.split())      # [['a','b'], ['c']]\n" +
        "rdd.flatMap(lambda s: s.split())  # ['a', 'b', 'c']  <- flattened\n" +
        "rdd.filter(lambda s: 'a' in s)    # ['a b']",
      lang: "python",
      tip: "The distinction they probe: <code>map</code> emits exactly 1 row per input; <code>flatMap</code> can emit <b>0..N</b> (great for tokenizing/splitting)."
    },
    {
      id: "mappartitions",
      group: "Transformations & Actions",
      q: "What is mapPartitions and when would you use it?",
      difficulty: "Common",
      tags: ["mappartitions", "performance", "initialization"],
      a:
        "<p><b><code>mapPartitions</code> is like <code>map</code>, but your function runs once per <i>partition</i> instead of once per <i>row</i></b> — it receives an iterator of the partition's rows.</p>" +
        "<p>Use it when you have <b>heavy per-call setup</b> that you don't want to repeat for every row — e.g. opening a DB connection, loading a model, or creating an API client <b>once per partition</b> and reusing it across all rows in that partition.</p>" +
        "<p><code>mapPartitionsWithIndex</code> is the same but also gives you the partition index.</p>",
      tip: "Say when: <b>per-partition setup cost</b> — open a DB connection or load a model <i>once per partition</i> instead of once per row."
    },
    {
      id: "bykey-ops",
      group: "Transformations & Actions",
      q: "groupByKey vs reduceByKey vs aggregateByKey?",
      difficulty: "Core",
      tags: ["reducebykey", "groupbykey", "aggregatebykey", "shuffle"],
      a:
        "<p>All work on Pair RDDs, but they shuffle very differently:</p>" +
        "<ul>" +
        "<li><b>groupByKey</b> — shuffles <b>all</b> values for each key across the network, then groups. Expensive; risks OOM on hot keys.</li>" +
        "<li><b>reduceByKey</b> — combines values <b>locally first</b> (map-side combine) and only then shuffles partial results. Far less network traffic — prefer it.</li>" +
        "<li><b>aggregateByKey</b> — like reduceByKey but lets the <b>output type differ</b> from the input (e.g. build a (sum, count) tuple for an average); <code>combineByKey</code> is the most general form all three are built on.</li>" +
        "</ul>" +
        "<p><b>Why the difference is so large:</b> <code>reduceByKey</code> runs a <b>map-side combine (a mini-reduce in each partition before the shuffle)</b>, so only one partial value per key per partition crosses the network. <code>groupByKey</code> has <b>no combiner</b> — it ships <i>every</i> value for a key to the one reducer partition, so network traffic scales with total rows and a hot key can pile millions of values onto a single task and <b>OOM</b> it.</p>",
      tip: "The classic answer: <b>\"prefer reduceByKey over groupByKey\"</b> because reduceByKey does a <b>map-side combine</b> and shuffles only partial results. Interviewers wait for exactly that line — and for the OOM risk of groupByKey on a hot key."
    },
    {
      id: "rdd-set-ops",
      group: "Transformations & Actions",
      q: "Explain distinct, union, intersection and subtract.",
      difficulty: "Common",
      tags: ["distinct", "union", "intersection", "subtract"],
      a:
        "<ul>" +
        "<li><b>distinct()</b> — removes duplicate elements (needs a shuffle).</li>" +
        "<li><b>union()</b> — concatenates two RDDs into one (does <b>not</b> dedupe; narrow).</li>" +
        "<li><b>intersection()</b> — elements present in <b>both</b> RDDs (shuffle).</li>" +
        "<li><b>subtract()</b> — elements in the first RDD but <b>not</b> in the second (shuffle).</li>" +
        "</ul>" +
        "<p>Note: <code>union</code> keeps duplicates — chain <code>.distinct()</code> if you need a true set union.</p>",
      tip: "Note the shuffle cost: <code>distinct</code>, <code>intersection</code> and <code>subtract</code> all shuffle (wide); <code>union</code> doesn't — it just concatenates partitions."
    },
    {
      id: "rdd-joins",
      group: "Transformations & Actions",
      q: "What join operations do Pair RDDs support?",
      difficulty: "Common",
      tags: ["join", "outer-join", "cogroup"],
      a:
        "<p>On Pair RDDs (matched by key):</p>" +
        "<ul>" +
        "<li><b>join</b> — inner join: only keys present in both.</li>" +
        "<li><b>leftOuterJoin</b> — all keys from the left, <code>None</code> where the right has no match.</li>" +
        "<li><b>rightOuterJoin</b> — all keys from the right.</li>" +
        "<li><b>fullOuterJoin</b> — all keys from both sides.</li>" +
        "<li><b>cogroup</b> — groups values from two (or more) RDDs by key into iterables — the primitive the joins are built on.</li>" +
        "</ul>" +
        "<p>All are wide transformations (they shuffle) unless a side is broadcast.</p>",
      tip: "Pair RDDs support <code>join</code> plus <code>leftOuterJoin</code>/<code>rightOuterJoin</code>/<code>fullOuterJoin</code>, and <code>cogroup</code> for grouping both sides by key."
    },
    {
      id: "rdd-actions",
      group: "Transformations & Actions",
      q: "Name the common RDD actions and what they return.",
      difficulty: "Common",
      tags: ["actions", "collect", "reduce", "count"],
      a:
        "<ul>" +
        "<li><b>collect()</b> — brings the whole RDD to the driver (careful: OOM on big data).</li>" +
        "<li><b>count()</b> / <b>first()</b> / <b>take(n)</b> — size, first element, first n.</li>" +
        "<li><b>top(n)</b> / <b>takeOrdered(n)</b> — largest / smallest n.</li>" +
        "<li><b>reduce()</b> / <b>fold()</b> — aggregate with an associative function (fold takes a zero value).</li>" +
        "<li><b>countByKey()</b> / <b>countByValue()</b> / <b>lookup(key)</b> — key-based counts and value lookup.</li>" +
        "<li><b>saveAsTextFile()</b> — write output; <b>foreach()</b> — run a side effect per element.</li>" +
        "</ul>",
      tip: "The one they probe: <b>avoid <code>collect()</code> on large data</b> — it pulls everything to the driver and OOMs. Use <code>take()</code> / <code>show()</code> to peek."
    },

    // ─────────────── G5 · DataFrames, Datasets & Spark SQL ───────────────
    {
      id: "what-is-dataframe",
      group: "DataFrames, Datasets & Spark SQL",
      q: "What is a DataFrame and why use it?",
      difficulty: "Core",
      tags: ["dataframe", "schema", "catalyst"],
      a:
        "<p><b>A DataFrame is a distributed collection of rows organized into named, typed columns</b> — like a table in a relational database, but spread across the cluster and immutable.</p>" +
        "<p>Why prefer it over RDDs:</p>" +
        "<ul>" +
        "<li><b>Catalyst optimizer</b> — Spark rewrites your query for you (predicate pushdown, column pruning).</li>" +
        "<li><b>Schema-aware</b> — named columns and types enable SQL and validation.</li>" +
        "<li><b>Less code, more speed</b> — concise API plus Tungsten's efficient memory layout.</li>" +
        "</ul>",
      tip: "The selling point: a <b>distributed table with a schema</b> that Catalyst can optimize — that optimizer is <i>why</i> you prefer it over raw RDDs."
    },
    {
      id: "what-is-dataset",
      group: "DataFrames, Datasets & Spark SQL",
      q: "What is a Dataset and what are its advantages?",
      difficulty: "Common",
      tags: ["dataset", "type-safety", "tungsten"],
      a:
        "<p><b>A Dataset is a strongly-typed, object-oriented extension of the DataFrame</b> — you get compile-time type safety <i>and</i> Catalyst optimization. (A DataFrame is really <code>Dataset[Row]</code>.)</p>" +
        "<ul>" +
        "<li><b>Compile-time type safety</b> — catch column/type errors before running.</li>" +
        "<li><b>Catalyst + Tungsten</b> — still optimized and efficiently serialized.</li>" +
        "</ul>" +
        "<p><b>PySpark caveat:</b> the typed Dataset API is a <b>Scala/Java feature</b> — Python only has the DataFrame API (Python is dynamically typed), so in interviews say Datasets shine in Scala.</p>",
      tip: "The PySpark catch they love: there's <b>no true Dataset in Python</b> — it needs compile-time types, so it's Scala/Java only. In PySpark the DataFrame <i>is</i> <code>Dataset[Row]</code>."
    },
    {
      id: "rdd-vs-df-vs-ds",
      group: "DataFrames, Datasets & Spark SQL",
      q: "RDD vs DataFrame vs Dataset — how do they differ?",
      difficulty: "Core",
      tags: ["rdd", "dataframe", "dataset", "comparison"],
      a:
        "<ul>" +
        "<li><b>RDD</b> — low-level, <b>no schema</b>, no optimizer; full control but verbose and slower for structured data.</li>" +
        "<li><b>DataFrame</b> — schema + named columns; <b>Catalyst-optimized</b>; the everyday choice. No compile-time type safety.</li>" +
        "<li><b>Dataset</b> — DataFrame + <b>compile-time type safety</b> (Scala/Java only); slightly slower than DataFrame but safest.</li>" +
        "</ul>" +
        "<p>Rule of thumb: <b>DataFrames for almost everything</b>, RDDs for low-level control, Datasets when you're in Scala and want type safety.</p>",
      tip: "Three-line table: <b>RDD</b> = no optimizer; <b>DataFrame</b> = Catalyst, no compile-time types; <b>Dataset</b> = Catalyst + type safety (JVM only)."
    },
    {
      id: "why-df-faster",
      group: "DataFrames, Datasets & Spark SQL",
      q: "Why is a DataFrame faster than an RDD?",
      difficulty: "Common",
      tags: ["performance", "catalyst", "tungsten"],
      a:
        "<p>Because Spark understands the <b>structure and intent</b> of a DataFrame, it can optimize; with an RDD it only sees opaque Python/JVM functions.</p>" +
        "<ul>" +
        "<li><b>Catalyst optimizer</b> rewrites the query — predicate pushdown, column pruning, join reordering.</li>" +
        "<li><b>Tungsten</b> uses compact off-heap binary memory and whole-stage code generation.</li>" +
        "<li>In PySpark, DataFrame ops run in the <b>JVM</b> and avoid the Python-per-row serialization that RDDs/UDFs pay.</li>" +
        "</ul>",
      tip: "Two words carry it: <b>Catalyst</b> (optimizes the query plan) + <b>Tungsten</b> (compact binary, off-heap, whole-stage codegen)."
    },
    {
      id: "spark-schema",
      group: "DataFrames, Datasets & Spark SQL",
      q: "What is a schema in Spark and how do you define one?",
      difficulty: "Common",
      tags: ["schema", "structtype", "structfield"],
      a:
        "<p><b>A schema is the structure of a DataFrame — the column names, types, and nullability.</b> You can let Spark <b>infer</b> it or define it explicitly with <code>StructType</code> / <code>StructField</code>.</p>" +
        "<p><b>Define it explicitly in production</b> — inference scans data (slow) and can guess wrong types; an explicit schema is faster and safe.</p>",
      code:
        "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
        "schema = StructType([\n" +
        "    StructField('name', StringType(), True),\n" +
        "    StructField('age',  IntegerType(), True),\n" +
        "])\n" +
        "df = spark.read.schema(schema).csv('/data/people.csv')",
      lang: "python",
      tip: "In production, <b>define the schema explicitly with StructType</b> — <code>inferSchema</code> triggers a full extra data scan and can guess types wrong."
    },
    {
      id: "spark-sql",
      group: "DataFrames, Datasets & Spark SQL",
      q: "What is Spark SQL, and how do temp views and caching fit in?",
      difficulty: "Core",
      tags: ["spark-sql", "tempview", "cache"],
      a:
        "<p><b>Spark SQL is the module for structured data</b> — it powers the DataFrame API and lets you run actual SQL over your data, all through Catalyst.</p>" +
        "<ul>" +
        "<li><b>createOrReplaceTempView('t')</b> registers a DataFrame as a temporary table so you can query it with <code>spark.sql('SELECT ... FROM t')</code>.</li>" +
        "<li><b>Caching</b> — <code>spark.catalog.cacheTable('t')</code> (or <code>df.cache()</code>) keeps results in memory for reuse; <b>uncache</b> to free it.</li>" +
        "</ul>",
      code:
        "df.createOrReplaceTempView('sales')\n" +
        "top = spark.sql('''SELECT region, SUM(amt) AS total\n" +
        "                   FROM sales GROUP BY region''')",
      lang: "python",
      tip: "Know the scoping: <code>createOrReplaceTempView</code> is <b>session-scoped</b>; <code>createGlobalTempView</code> (in <code>global_temp</code>) survives across sessions."
    },
    {
      id: "groupby-agg",
      group: "DataFrames, Datasets & Spark SQL",
      q: "How does groupBy work on a DataFrame?",
      difficulty: "Common",
      tags: ["groupby", "aggregation", "agg"],
      a:
        "<p><b><code>groupBy</code> buckets rows by one or more columns, then you apply aggregate functions</b> to each group — <code>count</code>, <code>sum</code>, <code>avg</code>, <code>min</code>, <code>max</code>, or several at once via <code>agg</code>.</p>" +
        "<p>It's a <b>wide transformation</b> (it shuffles), but on DataFrames Spark does a map-side partial aggregation first, so it's efficient — no need to drop to <code>reduceByKey</code>.</p>",
      code:
        "from pyspark.sql import functions as F\n" +
        "(df.groupBy('region')\n" +
        "   .agg(F.sum('amt').alias('total'),\n" +
        "        F.countDistinct('cust').alias('customers')))",
      lang: "python",
      tip: "Flag that <code>groupBy</code> is a <b>wide (shuffle) operation</b>, and use <code>.agg()</code> when you need several aggregations at once."
    },
    {
      id: "pivot-unpivot",
      group: "DataFrames, Datasets & Spark SQL",
      q: "How do you pivot and unpivot a DataFrame?",
      difficulty: "Common",
      tags: ["pivot", "unpivot", "reshape"],
      a:
        "<ul>" +
        "<li><b>Pivot</b> — rotate <b>row values into columns</b>: <code>groupBy(...).pivot('col').agg(...)</code>. Great for turning months/categories into columns.</li>" +
        "<li><b>Unpivot</b> — the reverse, <b>columns back into rows</b>. There's no single method; use <code>stack(...)</code> in a <code>selectExpr</code> (or <code>melt</code> in newer versions).</li>" +
        "</ul>" +
        "<p><b>Tip:</b> always pass the explicit list of pivot values (<code>.pivot('month', ['Jan','Feb'])</code>) — it skips a scan to discover them and runs much faster.</p>",
      code:
        "# pivot\n" +
        "df.groupBy('product').pivot('month', ['Jan','Feb']).sum('amt')\n" +
        "# unpivot\n" +
        "df.selectExpr('product', \"stack(2, 'Jan', Jan, 'Feb', Feb) as (month, amt)\")",
      lang: "python",
      tip: "Performance note: <code>pivot</code> is expensive (it shuffles and needs the distinct values) — pass the value list to <code>pivot(col, values)</code> to skip the extra scan."
    },

    // ─────────────── G7 · Partitions, Shuffle & Performance ───────────────
    {
      id: "partitions-partitioners",
      group: "Partitions, Shuffle & Performance",
      q: "What are partitions and partitioners in Spark?",
      difficulty: "Common",
      tags: ["partition", "partitioner", "parallelism"],
      a:
        "<ul>" +
        "<li><b>Partition</b> — a logical chunk of the data. Partitions are the <b>unit of parallelism</b>: one task processes one partition, so more partitions = more parallel tasks (up to your core count).</li>" +
        "<li><b>Partitioner</b> — the rule that decides <i>which</i> key goes to <i>which</i> partition during a shuffle. The two built-ins are <b>HashPartitioner</b> (default, <code>hash(key) % n</code>) and <b>RangePartitioner</b> (for sorted/ranged data).</li>" +
        "</ul>" +
        "<p>Good partitioning keeps data balanced and co-locates keys, which minimizes shuffle and skew.</p>",
      tip: "Separate the two: a <b>partition</b> is the unit of parallelism; a <b>partitioner</b> (hash/range) decides <i>which key lands in which partition</i>."
    },
    {
      id: "default-partitions",
      group: "Partitions, Shuffle & Performance",
      q: "How many partitions does Spark create by default?",
      difficulty: "Common",
      tags: ["partition", "defaults", "shuffle-partitions"],
      a:
        "<ul>" +
        "<li><b>Reading files</b> — driven by the input: roughly one partition per <b>HDFS block</b> (~128 MB), or by the number of available cores for a parallelized collection.</li>" +
        "<li><b>After a shuffle</b> — controlled by <b><code>spark.sql.shuffle.partitions</code></b>, which defaults to <b>200</b>.</li>" +
        "</ul>" +
        "<p>That 200 default is a classic tuning trap: too high for small data (tiny wasteful tasks), too low for huge data. Set it to match your data size and cluster.</p>",
      tip: "A very common interview line: <i>\"the default 200 shuffle partitions is rarely right\"</i> — tune <code>spark.sql.shuffle.partitions</code> to your data. (AQE can auto-coalesce them in Spark 3.x.)"
    },
    {
      id: "repartition-vs-coalesce",
      group: "Partitions, Shuffle & Performance",
      q: "Repartition vs Coalesce — what's the difference?",
      difficulty: "Core",
      tags: ["repartition", "coalesce", "shuffle"],
      a:
        "<ul>" +
        "<li><b>repartition(n)</b> — can <b>increase or decrease</b> partitions; does a <b>full shuffle</b> to produce evenly balanced partitions. Wide transformation.</li>" +
        "<li><b>coalesce(n)</b> — only <b>decreases</b> partitions; avoids a full shuffle by <b>merging</b> existing partitions on the same node. Narrow, cheaper — but can leave partitions uneven.</li>" +
        "</ul>" +
        "<p>Rule: use <b>coalesce</b> to cut partitions cheaply (e.g. before writing fewer output files); use <b>repartition</b> when you need more partitions or evenly balanced ones (e.g. to fix skew).</p>",
      tip: "The trap they set: <i>\"how do you go from 200 to 10 output files cheaply?\"</i> → <b>coalesce(10)</b>, not repartition — coalesce skips the full shuffle."
    },
    {
      id: "shuffling",
      group: "Partitions, Shuffle & Performance",
      q: "What is shuffling in Spark and why is it expensive?",
      difficulty: "Core",
      tags: ["shuffle", "performance", "network"],
      a:
        "<p><b>A shuffle is Spark redistributing data across partitions/executors</b> so that related records (e.g. the same key) end up together. It's triggered by wide transformations: <code>groupByKey</code>, <code>reduceByKey</code>, <code>join</code>, <code>distinct</code>, <code>repartition</code>.</p>" +
        "<p>It's the most expensive thing Spark does because it involves <b>disk I/O, data serialization, and network transfer</b> between executors, plus it creates a <b>stage boundary</b>.</p>" +
        "<p><b>What actually happens under the hood</b> (the deep follow-up):</p>" +
        "<ul>" +
        "<li><b>Map (write) side</b> — each task in the upstream stage partitions its output by the target partitioner, sorts/spills it, and writes <b>shuffle files to local disk</b> (this is the <i>Shuffle Write</i> you see in the UI).</li>" +
        "<li><b>Reduce (read) side</b> — each task in the downstream stage <b>fetches its slice</b> of those files from every map output across the network (<i>Shuffle Read</i>), then merges them.</li>" +
        "<li>Spark uses a <b>sort-based shuffle manager</b>; if a task's data exceeds execution memory it <b>spills to disk</b>, which is why shuffle + skew so often causes spill and slowness.</li>" +
        "</ul>" +
        "<p>Tuning Spark is largely about <b>reducing shuffles</b>: prefer reduceByKey over groupByKey, use broadcast joins, filter early, and partition wisely.</p>",
      tip: "Name it the <b>single most expensive thing Spark does</b> (disk + network + serialization + a stage boundary) — so reducing shuffles is most of tuning."
    },
    {
      id: "cache-vs-persist",
      group: "Partitions, Shuffle & Performance",
      q: "Cache vs Persist (and unpersist)?",
      difficulty: "Core",
      tags: ["cache", "persist", "storage-level"],
      a:
        "<p>Both store a DataFrame/RDD so it isn't recomputed on every action — the difference is control over <i>where</i>:</p>" +
        "<ul>" +
        "<li><b>cache()</b> — shorthand for the default storage level (<code>MEMORY_AND_DISK</code> for DataFrames).</li>" +
        "<li><b>persist(level)</b> — you pick the <b>storage level</b>; the ones to know: <code>MEMORY_ONLY</code> (fast, recomputes what won't fit), <code>MEMORY_AND_DISK</code> (spills overflow to disk — the DataFrame default), <code>DISK_ONLY</code>, the <code>_SER</code> variants (serialized — smaller, more CPU; the default in Scala/Java RDDs is <code>MEMORY_ONLY</code>, in PySpark it's already serialized via pickle), and <code>_2</code> suffixes that <b>replicate</b> each partition on two nodes.</li>" +
        "<li><b>unpersist()</b> — evict it when you're done to free memory (it's blocking by default).</li>" +
        "</ul>" +
        "<p>Cache when a DataFrame is <b>reused across multiple actions</b>; caching something used once just wastes memory. Remember it <b>keeps lineage</b> — a lost cached partition is recomputed, not re-replicated (that's the difference from checkpointing).</p>",
      tip: "Remember: caching is lazy too — it only materializes on the <b>next action</b>. And <code>cache()</code> == <code>persist()</code> with the default level."
    },
    {
      id: "serialization",
      group: "Partitions, Shuffle & Performance",
      q: "Explain serialization in Spark — Java vs Kryo (and PySpark serializers).",
      difficulty: "Common",
      tags: ["serialization", "kryo", "tuning"],
      a:
        "<p><b>Serialization = turning objects into bytes</b> to send across the network (shuffles) or store them. It's a big performance lever because Spark moves a lot of data.</p>" +
        "<ul>" +
        "<li><b>Java serialization</b> — the default on the JVM: easy but slow and bulky.</li>" +
        "<li><b>Kryo</b> — up to ~10x faster and more compact; enable via <code>spark.serializer</code>. Preferred for RDD-heavy jobs.</li>" +
        "</ul>" +
        "<p>In <b>PySpark</b> specifically, data crossing to Python is serialized with <b>Pickle</b> (default) or <b>Marshal</b> (faster, limited types).</p>",
      tip: "The lever to mention: switch to <b>Kryo</b> (<code>spark.serializer</code>) — faster and more compact than default Java serialization; register your classes."
    },
    {
      id: "speculative-execution",
      group: "Partitions, Shuffle & Performance",
      q: "What is speculative execution?",
      difficulty: "Deep",
      tags: ["speculation", "stragglers", "tuning"],
      a:
        "<p><b>Speculative execution is Spark's defense against stragglers</b> — a few slow tasks (usually from a bad node or skew) that hold up a whole stage.</p>" +
        "<p>When enabled (<code>spark.speculation=true</code>), Spark detects tasks running much slower than their peers and <b>launches duplicate copies on other executors</b>. Whichever finishes first wins; the other is killed.</p>" +
        "<p>It helps with <b>hardware slowness</b>, but it does <b>not</b> fix data skew (both copies process the same huge partition) and it costs extra resources — so it's off by default in many setups.</p>",
      tip: "The trap: speculation helps with <b>flaky/slow hardware stragglers</b>, NOT with data skew — a re-launched skewed task just reprocesses the same huge partition."
    },
    {
      id: "oom",
      group: "Partitions, Shuffle & Performance",
      q: "Why do Out-Of-Memory (OOM) errors happen and how do you fix them?",
      difficulty: "Common",
      tags: ["oom", "memory", "skew", "collect"],
      a:
        "<p>OOM means too much data landed in one place — and the <b>first thing to pin down is <i>where</i></b>: the driver or an executor. They have different causes and fixes.</p>" +
        "<ul>" +
        "<li><b>Driver OOM</b> — pulling too much back to the driver: <code>collect()</code> / <code>toPandas()</code> on a big result, a huge broadcast, or too many partitions' worth of task metadata. Fix: don't collect (use <code>write</code>/<code>take</code>), lower the broadcast threshold, raise <code>--driver-memory</code>.</li>" +
        "<li><b>Executor heap OOM</b> — a single partition too big to hold: <b>data skew</b> (one hot key), wide shuffles like <code>groupByKey</code> piling values on one key, or exploding joins. Fix: more/smaller partitions, salting, <code>reduceByKey</code> over <code>groupByKey</code>, broadcast the small side.</li>" +
        "<li><b>Container killed by YARN/K8s</b> — off-heap/Python-worker memory blew the <code>spark.executor.memoryOverhead</code> limit, so the manager kills the container (not a JVM heap error). Fix: raise the overhead, not just heap.</li>" +
        "</ul>" +
        "<p>So the real answer is <b>diagnose driver vs executor vs overhead first</b>, then apply the matching fix — \"just add more memory\" is the weak answer.</p>",
      tip: "Don't say \"add more memory.\" First diagnose <b>where</b>: driver (collect/broadcast), executor heap (skew/wide shuffle), or container-overhead kill — each has a different fix."
    },
    {
      id: "optimization-techniques",
      group: "Query Optimization",
      q: "What are the main optimization techniques in Spark?",
      difficulty: "Core",
      tags: ["optimization", "tuning", "performance"],
      a:
        "<p>A quick checklist interviewers love:</p>" +
        "<ul>" +
        "<li><b>Cut shuffles</b> — reduceByKey over groupByKey; filter and select early (pushdown/pruning).</li>" +
        "<li><b>Broadcast joins</b> for small dimension tables.</li>" +
        "<li><b>Right partitioning</b> — tune <code>spark.sql.shuffle.partitions</code>; repartition to fix skew; coalesce before writing.</li>" +
        "<li><b>Cache</b> reused DataFrames; <b>Kryo</b> serialization.</li>" +
        "<li><b>Columnar formats</b> (Parquet) for compression + pushdown.</li>" +
        "<li><b>Handle skew</b> (salting) and enable <b>AQE</b> in Spark 3.x.</li>" +
        "</ul>",
      tip: "Structure the answer so it sounds senior: <b>cut shuffles → broadcast small joins → right-size partitions → cache reuse → columnar formats → handle skew → enable AQE</b>."
    },
    {
      id: "track-failed-jobs",
      group: "Partitions, Shuffle & Performance",
      q: "How do you debug or track a failed Spark job?",
      difficulty: "Deep",
      tags: ["debugging", "spark-ui", "logs"],
      a:
        "<p>Start from the <b>Spark UI</b> (or History Server) and drill down:</p>" +
        "<ul>" +
        "<li><b>Jobs → Stages → Tasks</b> — find the failed stage and read the exception on the failed task.</li>" +
        "<li>Look for <b>skew</b> (one task far slower/bigger than the rest) and <b>spills</b> to disk in stage metrics.</li>" +
        "<li>Check <b>executor logs</b> (and YARN/K8s logs) for the real stack trace — OOM, lost executor, serialization error.</li>" +
        "</ul>" +
        "<p><code>df.explain()</code> helps confirm the physical plan (join type, exchanges) matches what you expect.</p>",
      tip: "Walk the <b>Spark UI</b> path out loud: failed stage → failed task → its executor logs; a single long-running task screams <b>skew</b>, and watch for <b>spill</b>."
    },

    // ─────────────────────────── G8 · Skew & Broadcast ───────────────────────────
    {
      id: "data-skew",
      group: "Data Skew & Broadcast Joins",
      q: "What is data skew and why is it a problem?",
      difficulty: "Core",
      tags: ["skew", "partition", "performance"],
      a:
        "<p><b>Data skew is when data is unevenly distributed across partitions</b> — a few keys have far more rows than the rest, so one or two partitions become huge.</p>" +
        "<p>It's a problem because Spark's parallelism is per-partition: the whole stage waits on the one overloaded task (a <b>straggler</b>), while other executors sit idle. Severe skew also causes <b>spills and OOM</b> on the hot executor.</p>" +
        "<p>It usually shows up after a <b>shuffle</b> (join/groupBy) on a skewed key like a null, a default value, or a mega-customer.</p>",
      tip: "The diagnostic tell to mention: in a stage, <b>one task runs far longer than the rest</b> — that's a hot key. Fix with salting or AQE skew-join."
    },
    {
      id: "salting",
      group: "Data Skew & Broadcast Joins",
      q: "How do you mitigate skewed data (salting)?",
      difficulty: "Common",
      tags: ["salting", "skew", "join"],
      a:
        "<p><b>Salting spreads a hot key across many partitions by adding a random suffix to it.</b> Instead of every row for <code>key=X</code> landing in one partition, they split across <code>X_0 … X_n</code>, so the load is shared.</p>" +
        "<ul>" +
        "<li>Add a random salt (0..N) to the skewed key on the large side.</li>" +
        "<li><b>Explode</b> the small side across all salt values so matches still line up.</li>" +
        "<li>Join on the salted key, then drop the salt.</li>" +
        "</ul>" +
        "<p>Other options: a <b>broadcast join</b> (if one side is small) or Spark 3.x <b>AQE skew-join handling</b>, which splits skewed partitions automatically.</p>",
      tip: "Explain the mechanism: add a <b>random prefix to the hot key</b> to spread it across partitions, aggregate, then strip the salt and aggregate again (two-pass)."
    },
    {
      id: "broadcast-join",
      group: "Data Skew & Broadcast Joins",
      q: "What is a broadcast join and when should you use it?",
      difficulty: "Core",
      tags: ["broadcast-join", "join", "shuffle"],
      a:
        "<p><b>A broadcast (map-side) join ships a small table to every executor so the join happens locally — with no shuffle of the big table.</b></p>" +
        "<p><b>How it works:</b> the driver <b>collects the small side</b>, then broadcasts it (via an efficient torrent-style broadcast) so each executor holds a full copy as an in-memory hash map. The big table is then joined in place — each task probes the local map, so there's <b>no exchange/shuffle</b> and, as a bonus, <b>skew on the join key stops mattering</b> (no key redistribution happens).</p>" +
        "<p>Use it when one side is <b>small enough to fit in executor (and driver) memory</b> — the default auto-broadcast threshold is <b>10 MB</b> (<code>spark.sql.autoBroadcastJoinThreshold</code>; set <code>-1</code> to disable). It turns an expensive shuffle join into a cheap local lookup — one of the biggest wins for star-schema fact/dimension joins.</p>" +
        "<p><b>The caveat to volunteer:</b> broadcasting a side that's too big OOMs the driver (on collect) or the executors — so it's for genuinely small dimension tables only. AQE (Spark 3.x) can also switch a sort-merge join to broadcast at runtime once it sees the real size.</p>",
      code:
        "from pyspark.sql import functions as F\n" +
        "big.join(F.broadcast(small_dim), 'dim_id')   # no shuffle of `big`",
      lang: "python",
      tip: "Name the mechanism: broadcast join <b>avoids shuffling the large table</b> and also <b>sidesteps skew</b> on the join key. Threshold: <code>spark.sql.autoBroadcastJoinThreshold</code>."
    },
    {
      id: "broadcast-vs-accumulator",
      group: "Data Skew & Broadcast Joins",
      q: "Broadcast variable vs Accumulator?",
      difficulty: "Core",
      tags: ["broadcast-variable", "accumulator", "shared-variables"],
      a:
        "<p>Two kinds of <b>shared variables</b>, opposite directions:</p>" +
        "<ul>" +
        "<li><b>Broadcast variable</b> — <b>read-only</b>, sent <b>driver → executors</b> once and cached on each node. Use it to share a large lookup/config efficiently (avoids re-shipping it per task).</li>" +
        "<li><b>Accumulator</b> — <b>write-only</b> from executors, aggregated back <b>executors → driver</b>. Use it for counters/sums (like MapReduce counters), e.g. counting bad records.</li>" +
        "</ul>" +
        "<p><b>The accumulator gotcha to volunteer:</b> values are only <b>exactly-once inside actions</b>. If you update an accumulator inside a <b>transformation</b>, a task retry, stage recomputation, or speculative execution can run it more than once and <b>double-count</b> — so accumulators are reliable for debugging/metrics but not for correctness-critical totals unless done in an action.</p>",
      code:
        "b = spark.sparkContext.broadcast({'US': 1, 'IN': 2})   # read-only\n" +
        "acc = spark.sparkContext.accumulator(0)                # write-only counter",
      lang: "python",
      tip: "Clean contrast: <b>broadcast = read-only data pushed OUT to executors</b>; <b>accumulator = write-only metric sent BACK to the driver</b>. Deep follow-up: accumulators can <b>double-count on retries/speculation</b> inside transformations — exactly-once only inside actions."
    },
    {
      id: "shared-variables",
      group: "Data Skew & Broadcast Joins",
      q: "What are shared variables in Spark?",
      difficulty: "Common",
      tags: ["shared-variables", "broadcast", "accumulator"],
      a:
        "<p>Normally each task gets its <i>own copy</i> of the variables it uses, and updates don't propagate back. <b>Shared variables solve the two cases where you need something cluster-wide:</b></p>" +
        "<ul>" +
        "<li><b>Broadcast variables</b> — efficiently give every node a <b>read-only</b> copy of a large value (e.g. a lookup table).</li>" +
        "<li><b>Accumulators</b> — safely <b>aggregate</b> values (sums, counts) from all tasks back to the driver.</li>" +
        "</ul>" +
        "<p>They exist precisely because ordinary closures can't share state across executors.</p>",
      tip: "Two kinds, opposite directions: <b>broadcast</b> (read-only, driver → executors) and <b>accumulators</b> (write-only, executors → driver)."
    },

    // ─────────────── G9 · I/O, Formats & Data Quality ───────────────
    {
      id: "file-formats",
      group: "I/O, Formats & Data Quality",
      q: "Compare CSV, JSON, Parquet, ORC and Avro. Which do you pick?",
      difficulty: "Core",
      tags: ["parquet", "orc", "avro", "csv", "json"],
      a:
        "<ul>" +
        "<li><b>CSV</b> — simple, human-readable, <b>row</b>-based; no schema/types, bulky, weak on nested data.</li>" +
        "<li><b>JSON</b> — supports nesting, but verbose (repeats keys) and not very splittable.</li>" +
        "<li><b>Parquet</b> — <b>columnar</b>, compressed, stores schema + stats; enables column pruning &amp; predicate pushdown. The analytics default.</li>" +
        "<li><b>ORC</b> — columnar like Parquet, strong in the Hive/Hadoop world.</li>" +
        "<li><b>Avro</b> — <b>row</b>-based binary with rich schema evolution; great for streaming/write-heavy and Kafka.</li>" +
        "</ul>" +
        "<p><b>Rule:</b> Parquet/ORC for read-heavy analytics; Avro for row-by-row/streaming ingestion.</p>",
      tip: "The line they want: <b>\"Parquet is columnar, so Spark reads only the columns and row-groups it needs\"</b> — that's column pruning + predicate pushdown, the reason it's the analytics standard."
    },
    {
      id: "parquet-benefits",
      group: "I/O, Formats & Data Quality",
      q: "Why is Parquet so widely used with Spark?",
      difficulty: "Common",
      tags: ["parquet", "columnar", "compression"],
      a:
        "<p>Parquet fits how Spark reads analytical data:</p>" +
        "<ul>" +
        "<li><b>Columnar</b> — reads only the columns a query touches (column pruning), skipping the rest entirely.</li>" +
        "<li><b>Compression &amp; encoding</b> — similar values sit together, so it compresses far better than row formats.</li>" +
        "<li><b>Embedded schema + statistics</b> — min/max per row-group enable <b>predicate pushdown</b> (skip whole blocks).</li>" +
        "<li><b>Schema evolution</b> — add/rename columns over time.</li>" +
        "</ul>" +
        "<p>Net effect: less I/O, less network, faster jobs vs CSV/JSON.</p>",
      tip: "The four-word combo: <b>columnar + predicate pushdown + column pruning + compression</b> — Spark reads only the columns and rows it actually needs."
    },
    {
      id: "read-files",
      group: "I/O, Formats & Data Quality",
      q: "How do you read different file formats in PySpark?",
      difficulty: "Common",
      tags: ["read", "csv", "json", "parquet"],
      a:
        "<p>All reads go through <code>spark.read</code> with a format method (<code>csv</code>, <code>json</code>, <code>parquet</code>, <code>load</code>) plus options like <code>header</code> and <code>delimiter</code>.</p>" +
        "<p>In production, pass an explicit <b>schema</b> rather than <code>inferSchema=True</code>: inference triggers an extra pass over the data and can guess types wrong, whereas Parquet/ORC carry their schema for free.</p>",
      code:
        "df = spark.read.csv('f.csv', header=True, inferSchema=True)\n" +
        "df = spark.read.option('delimiter', '|').csv('f.txt')\n" +
        "df = spark.read.json('f.json')          # multiLine=True for pretty JSON\n" +
        "df = spark.read.parquet('f.parquet')    # schema comes for free\n" +
        "df = spark.read.format('avro').load('f.avro')",
      lang: "python",
      tip: "The general form is <code>spark.read.format(fmt).option(...).load(path)</code>, with shortcuts like <code>spark.read.parquet(...)</code>. Always set the schema for CSV/JSON in prod."
    },
    {
      id: "bad-data",
      group: "I/O, Formats & Data Quality",
      q: "How do you handle bad / corrupt records when reading data?",
      difficulty: "Core",
      tags: ["corrupt", "permissive", "dropmalformed", "failfast"],
      a:
        "<p>When a row doesn't match the schema, the reader's <b>mode</b> decides what happens:</p>" +
        "<ul>" +
        "<li><b>PERMISSIVE</b> (default) — keep going; nulls the bad fields and stashes the raw row in a <code>_corrupt_record</code> column.</li>" +
        "<li><b>DROPMALFORMED</b> — silently drop bad rows.</li>" +
        "<li><b>FAILFAST</b> — throw immediately on the first bad record.</li>" +
        "</ul>" +
        "<p>Best practice: read <b>PERMISSIVE</b> with a corrupt-record column, then <b>quarantine</b> the bad rows (write them elsewhere) and continue with the clean ones.</p>",
      code:
        "df = (spark.read.schema(schema)\n" +
        "      .option('mode', 'PERMISSIVE')\n" +
        "      .option('columnNameOfCorruptRecord', '_corrupt_record')\n" +
        "      .csv('data.csv'))\n" +
        "bad  = df.filter('_corrupt_record IS NOT NULL')   # quarantine\n" +
        "good = df.filter('_corrupt_record IS NULL')",
      lang: "python",
      tip: "Name the three read modes: <b>PERMISSIVE</b> (default — nulls + <code>_corrupt_record</code>), <b>DROPMALFORMED</b>, <b>FAILFAST</b>; mention <code>badRecordsPath</code> to quarantine bad rows."
    },
    {
      id: "remove-duplicates",
      group: "I/O, Formats & Data Quality",
      q: "How do you remove duplicate rows? distinct vs dropDuplicates?",
      difficulty: "Common",
      tags: ["distinct", "dropduplicates", "dedup"],
      a:
        "<ul>" +
        "<li><b>distinct()</b> — removes rows that are duplicates across <b>all</b> columns.</li>" +
        "<li><b>dropDuplicates([cols])</b> — removes duplicates based on a <b>subset</b> of columns (and with no args, behaves like distinct).</li>" +
        "</ul>" +
        "<p>Both shuffle. To keep a <b>specific</b> row per key (e.g. the latest), don't rely on dropDuplicates' arbitrary pick — use a window: <code>row_number()</code> over a partition ordered by timestamp, then filter <code>rn = 1</code>.</p>",
      code:
        "df.distinct()\n" +
        "df.dropDuplicates(['user_id'])          # arbitrary row per user\n" +
        "# keep latest deterministically:\n" +
        "w = Window.partitionBy('user_id').orderBy(F.col('ts').desc())\n" +
        "df.withColumn('rn', F.row_number().over(w)).filter('rn = 1')",
      lang: "python",
      tip: "The senior add-on: to keep the <b>latest</b> record per key, don't use <code>dropDuplicates</code> — use a window <code>row_number()</code> ordered by timestamp and keep rank 1."
    },
    {
      id: "withcolumn-transforms",
      group: "I/O, Formats & Data Quality",
      q: "What do withColumn, cast, withColumnRenamed and drop do?",
      difficulty: "Common",
      tags: ["withcolumn", "cast", "rename", "drop"],
      a:
        "<p>The everyday column-shaping toolkit (all return new DataFrames — immutability):</p>" +
        "<ul>" +
        "<li><b>withColumn(name, expr)</b> — add a new column or replace an existing one.</li>" +
        "<li><b>cast(type)</b> — change a column's data type (usually inside withColumn).</li>" +
        "<li><b>withColumnRenamed(old, new)</b> — rename a column.</li>" +
        "<li><b>drop(*cols)</b> — remove one or more columns.</li>" +
        "</ul>",
      code:
        "from pyspark.sql import functions as F\n" +
        "df = (df.withColumn('salary', F.col('salary').cast('int'))\n" +
        "        .withColumn('bonus', F.col('salary') * 0.1)\n" +
        "        .withColumnRenamed('dob', 'date_of_birth')\n" +
        "        .drop('temp_col'))",
      lang: "python",
      tip: "Performance gotcha to drop in: <b>never call <code>withColumn</code> in a loop</b> — it bloats the Catalyst plan; build a single <code>select()</code> with all columns instead."
    },
    {
      id: "null-filtering",
      group: "I/O, Formats & Data Quality",
      q: "How do you filter or handle NULL values in a DataFrame?",
      difficulty: "Common",
      tags: ["null", "isnull", "fillna", "dropna"],
      a:
        "<p>Nulls need explicit handling — comparisons with <code>=</code> never match null:</p>" +
        "<ul>" +
        "<li><b>Filter</b> — <code>df.filter(F.col('c').isNull())</code> / <code>isNotNull()</code>.</li>" +
        "<li><b>Drop</b> — <code>df.dropna(how='any', subset=[...])</code>.</li>" +
        "<li><b>Fill</b> — <code>df.fillna(0)</code> or <code>df.fillna({'city': 'NA'})</code>.</li>" +
        "<li><b>Replace-if-null</b> — <code>F.coalesce(c1, c2, lit(0))</code>.</li>" +
        "</ul>",
      tip: "Interview gotcha: <b>NULL is unknown, not a value</b>, so <code>col = NULL</code> is never true — you must use <code>isNull()</code> / <code>isNotNull()</code>. Same three-valued logic as SQL."
    },
    {
      id: "star-snowflake",
      group: "I/O, Formats & Data Quality",
      q: "Star schema vs Snowflake schema?",
      difficulty: "Common",
      tags: ["star-schema", "snowflake-schema", "modeling"],
      a:
        "<ul>" +
        "<li><b>Star schema</b> — one central <b>fact</b> table joined to <b>denormalized</b> dimension tables. Fewer joins, faster reads, some redundancy. (Bonus: dimensions are usually small → broadcast joins.)</li>" +
        "<li><b>Snowflake schema</b> — dimensions are <b>normalized</b> into sub-dimensions, so less redundancy but <b>more joins</b> and slower queries.</li>" +
        "</ul>" +
        "<p>Analytics/warehousing usually favors <b>star</b> for query performance; snowflake when storage and strict normalization matter more.</p>",
      tip: "One line: <b>star</b> = denormalized dimensions (fewer joins, faster BI); <b>snowflake</b> = normalized dimensions (less storage, more joins). Star wins for most analytics."
    },

    // ─────────────── G10 · Streaming, MLlib & Graph ───────────────
    {
      id: "spark-streaming",
      group: "Streaming, MLlib & Graph",
      q: "What is Spark Streaming (and Structured Streaming)?",
      difficulty: "Core",
      tags: ["streaming", "structured-streaming", "real-time"],
      a:
        "<p><b>Spark Streaming processes real-time data streams</b> using the same engine as batch.</p>" +
        "<ul>" +
        "<li><b>Legacy (DStreams)</b> — micro-batches the stream into a sequence of small RDDs processed on an interval.</li>" +
        "<li><b>Structured Streaming</b> (modern) — treats the stream as an <b>unbounded input table</b> that grows; every trigger runs your query on the new rows and updates a result table. You write normal DataFrame/SQL code and Spark runs it incrementally, with <b>event-time windows</b>, <b>watermarks</b> for late data, checkpointed state, and exactly-once sinks.</li>" +
        "</ul>" +
        "<p><b>The real-time caveat interviewers test:</b> Structured Streaming is <b>micro-batch by default</b> (latency ~100 ms–seconds), not per-event — so it's \"near real-time.\" There is a <b>continuous processing</b> mode for ~1 ms latency, but it's experimental with limited operations; for true per-event, sub-ms latency you'd reach for Flink. Also distinguish <b>processing time</b> (when Spark sees the row) from <b>event time</b> (when it actually happened) — event-time + watermarks is what makes windowed results correct under late/out-of-order data.</p>" +
        "<p>Say you'd use <b>Structured Streaming</b> today — DStreams are legacy.</p>",
      tip: "Say you'd use <b>Structured Streaming</b> today (DataFrame API, event-time, exactly-once) and that <b>DStreams are legacy</b> (RDD-based)."
    },
    {
      id: "dstream",
      group: "Streaming, MLlib & Graph",
      q: "What is a DStream?",
      difficulty: "Common",
      tags: ["dstream", "streaming", "micro-batch"],
      a:
        "<p><b>A DStream (Discretized Stream) is the core abstraction of legacy Spark Streaming — a continuous stream represented as a sequence of RDDs</b>, one per micro-batch interval.</p>" +
        "<p>Any operation on a DStream applies to each underlying RDD, so it inherits RDD semantics (transformations, fault tolerance via lineage). It's been largely superseded by Structured Streaming, but interviewers still ask the definition.</p>",
      tip: "Define it as a <b>sequence of RDDs over micro-batches</b> (legacy) — then add that in new work you'd reach for Structured Streaming instead."
    },
    {
      id: "dstream-transformations",
      group: "Streaming, MLlib & Graph",
      q: "What transformations are available on a DStream?",
      difficulty: "Deep",
      tags: ["dstream", "window", "updatestatebykey"],
      a:
        "<p>Two families:</p>" +
        "<ul>" +
        "<li><b>Stateless</b> — apply per micro-batch, no memory across batches: <code>map</code>, <code>flatMap</code>, <code>filter</code>, <code>reduceByKey</code>.</li>" +
        "<li><b>Stateful</b> — carry state across batches: <b>window ops</b> (<code>window</code>, <code>countByWindow</code>, <code>reduceByKeyAndWindow</code>) and <b>updateStateByKey</b> (running aggregates like a live total).</li>" +
        "</ul>" +
        "<p>Windowing is the key idea — computing over the last N seconds of data as it slides forward.</p>",
      tip: "Split them: <b>stateless</b> (<code>map</code>/<code>filter</code>) vs <b>stateful</b> (<code>window</code>, <code>updateStateByKey</code>/<code>mapWithState</code>) — stateful needs checkpointing."
    },
    {
      id: "streaming-sources",
      group: "Streaming, MLlib & Graph",
      q: "What are the input sources for Spark Streaming?",
      difficulty: "Common",
      tags: ["kafka", "sources", "socket"],
      a:
        "<p>Spark Streaming ingests from:</p>" +
        "<ul>" +
        "<li><b>Kafka</b> — by far the most common in production.</li>" +
        "<li><b>Kinesis</b>, <b>Flume</b> — other message/event systems.</li>" +
        "<li><b>Files</b> on HDFS/S3 — new files dropped into a directory.</li>" +
        "<li><b>Socket</b> (<code>socketTextStream</code>) — TCP text, mainly for demos/testing.</li>" +
        "</ul>" +
        "<p>Structured Streaming exposes the same via <code>spark.readStream.format('kafka')</code> etc.</p>",
      tip: "Say <b>Kafka is the production default</b>; files and sockets exist (sockets are test-only), plus cloud sources like Kinesis."
    },
    {
      id: "wal-streaming",
      group: "Streaming, MLlib & Graph",
      q: "What is the Write-Ahead Log (WAL) in Spark Streaming?",
      difficulty: "Deep",
      tags: ["wal", "fault-tolerance", "checkpoint"],
      a:
        "<p><b>The WAL is a fault-tolerance mechanism: received data is written to a durable log (e.g. HDFS) <i>before</i> it's processed.</b></p>" +
        "<p>If the driver or a receiver crashes, Spark replays the log on recovery so <b>no in-flight data is lost</b>. Combined with <b>checkpointing</b> (which saves streaming metadata and state), it gives streaming jobs their reliability guarantees.</p>",
      tip: "The point: the <b>WAL + checkpoint</b> is what lets a restarted driver recover in-flight data — it's how Spark reaches at-least-once (exactly-once with idempotent sinks)."
    },
    {
      id: "mllib",
      group: "Streaming, MLlib & Graph",
      q: "What is MLlib?",
      difficulty: "Common",
      tags: ["mllib", "machine-learning", "pipeline"],
      a:
        "<p><b>MLlib is Spark's scalable machine-learning library</b> — distributed algorithms that train on data too big for one machine.</p>" +
        "<ul>" +
        "<li>Algorithms: linear/logistic regression, decision trees, random forests, gradient-boosted trees, k-means, ALS (recommendations).</li>" +
        "<li>The modern <b>DataFrame-based API</b> (<code>pyspark.ml</code>) offers <b>Pipelines</b> — chain feature transformers + an estimator into one reusable flow.</li>" +
        "</ul>" +
        "<p>Note the split: <code>pyspark.ml</code> (DataFrame, current) vs <code>pyspark.mllib</code> (RDD, legacy).</p>",
      tip: "The modern-practice note: use the <b>DataFrame-based <code>spark.ml</code></b> (with Pipelines), not the legacy RDD-based <code>spark.mllib</code>."
    },
    {
      id: "graphx-pagerank",
      group: "Streaming, MLlib & Graph",
      q: "What are GraphX and PageRank in Spark?",
      difficulty: "Deep",
      tags: ["graphx", "pagerank", "graphframes"],
      a:
        "<ul>" +
        "<li><b>GraphX</b> — Spark's API for graphs and graph-parallel computation (vertices + edges), with built-in algorithms. In PySpark, the DataFrame-based <b>GraphFrames</b> package is the usual choice.</li>" +
        "<li><b>PageRank</b> — a classic graph algorithm that ranks nodes by the number and importance of links pointing to them (originally Google's page ranking). It's the standard example of an <b>iterative</b> graph computation Spark runs well because it keeps data in memory across iterations.</li>" +
        "</ul>",
      tip: "The PySpark catch: <b>GraphX is Scala-only</b> — from Python you'd use the <b>GraphFrames</b> package instead."
    },

    // ═══════════════ Added from LinkedIn interview-question sweep (2026-11) ═══════════════
    // ───────────── Technical cards into existing groups ─────────────
    {
      id: "tungsten-engine",
      group: "Query Optimization",
      q: "How does the Tungsten engine speed up execution in Spark?",
      difficulty: "Deep",
      tags: ["tungsten", "codegen", "performance"],
      a:
        "<p><b>Tungsten is Spark's execution-layer optimizer</b> — it kicks in <i>after</i> Catalyst has planned the query and rewrites <i>how</i> the work physically runs on the CPU and in memory.</p>" +
        "<ul>" +
        "<li><b>Off-heap, cache-aware memory</b> — stores rows in a compact binary format outside the JVM heap, so there's far less garbage-collection pressure and better CPU-cache locality.</li>" +
        "<li><b>Whole-Stage Code Generation (WSCG)</b> — collapses a whole chain of operators (filter → project → aggregate) into a single generated Java function, eliminating virtual function calls and intermediate row objects.</li>" +
        "<li><b>Vectorized readers</b> — Parquet/ORC are read a batch of columns at a time rather than row-by-row.</li>" +
        "</ul>" +
        "<p>Catalyst answers <i>\"what plan?\"</i>; Tungsten answers <i>\"run that plan as fast as the hardware allows.\"</i></p>",
      tip: "If asked \"Catalyst vs Tungsten\": Catalyst = logical/physical <b>plan optimization</b>; Tungsten = <b>memory + code-generation</b> on the chosen plan. They are two different stages, not competitors."
    },
    {
      id: "spark-memory-management",
      group: "Architecture & Execution",
      q: "Explain memory management in Spark.",
      difficulty: "Deep",
      tags: ["memory", "executor", "oom"],
      a:
        "<p>Each executor's JVM memory is split into regions controlled by the <b>Unified Memory Manager</b>:</p>" +
        "<ul>" +
        "<li><b>Execution memory</b> — scratch space for shuffles, joins, sorts and aggregations.</li>" +
        "<li><b>Storage memory</b> — cached/persisted DataFrames and broadcast data.</li>" +
        "<li><b>Unified pool</b> — execution and storage share one region and <i>borrow</i> from each other; execution can evict cached blocks under pressure, but cached blocks can't starve execution.</li>" +
        "<li><b>User memory</b> — your data structures, UDF state.</li>" +
        "<li><b>Reserved memory</b> — a fixed slice Spark keeps for itself.</li>" +
        "</ul>" +
        "<p>On top sits <b>off-heap</b> memory (Tungsten) plus <code>spark.executor.memoryOverhead</code> for non-JVM needs (Python workers, network buffers) — the overhead is the usual culprit in container-kill OOMs.</p>",
      tip: "Name the two that move: <b>execution</b> and <b>storage</b> share a unified pool. Then mention <b>memoryOverhead</b> — it's what gets your container killed by YARN/K8s even when heap looks fine."
    },
    {
      id: "bucketing-vs-partitioning",
      group: "Partitions, Shuffle & Performance",
      q: "How does bucketing differ from partitioning, and when would you use each?",
      difficulty: "Deep",
      tags: ["bucketing", "partitioning", "joins"],
      a:
        "<ul>" +
        "<li><b>Partitioning</b> (<code>partitionBy</code>) splits data into <b>separate directories/files by a column's value</b> (e.g. <code>year=2026/month=11/</code>). Great for <b>partition pruning</b> on low-cardinality filter columns — Spark reads only the folders it needs.</li>" +
        "<li><b>Bucketing</b> (<code>bucketBy</code>) hashes a column into a <b>fixed number of buckets</b> within each file set. Rows with the same key land in the same bucket number across tables.</li>" +
        "</ul>" +
        "<p><b>Why bucketing matters:</b> if two tables are bucketed on the same column into the same number of buckets, Spark can <b>join them without a shuffle</b> (a sort-merge join on co-located buckets). Bucketing also tames high-cardinality columns that would blow up as partitions.</p>",
      code:
        "orders.write.bucketBy(64, \"customer_id\").sortBy(\"customer_id\") \\\n" +
        "      .mode(\"overwrite\").saveAsTable(\"orders_bucketed\")\n" +
        "# A later join of two tables bucketed the same way on customer_id\n" +
        "# needs no shuffle exchange.",
      lang: "python",
      tip: "Rule of thumb: <b>partition</b> by a low-cardinality column you filter on (date, region); <b>bucket</b> by a high-cardinality column you repeatedly <b>join or aggregate</b> on (customer_id)."
    },
    {
      id: "tune-shuffle-partitions-aqe",
      group: "Query Optimization",
      q: "How do you tune shuffle partitions, and what does AQE do for you?",
      difficulty: "Deep",
      tags: ["shuffle", "aqe", "spark.sql.shuffle.partitions"],
      a:
        "<p><code>spark.sql.shuffle.partitions</code> (default <b>200</b>) sets how many partitions a shuffle produces. The default is rarely right:</p>" +
        "<ul>" +
        "<li><b>Too few</b> → huge partitions, spills to disk, OOM.</li>" +
        "<li><b>Too many</b> → tiny tasks, scheduler overhead, small-file output.</li>" +
        "<li>Manual rule of thumb: aim for partitions of <b>~128–200 MB</b> each; set the count ≈ total shuffle size ÷ target size.</li>" +
        "</ul>" +
        "<p><b>Adaptive Query Execution (AQE)</b> (on by default in Spark 3.2+) does this at runtime: it <b>coalesces</b> small post-shuffle partitions, <b>switches join strategies</b> (e.g. to broadcast) once it sees real sizes, and <b>splits skewed partitions</b> automatically — so you often don't hand-tune the number anymore.</p>",
      tip: "Modern answer: \"Turn on AQE and let it coalesce/skew-split; only hand-set <code>shuffle.partitions</code> for predictable, fixed-size batch jobs.\""
    },
    {
      id: "checkpoint-vs-cache",
      group: "Partitions, Shuffle & Performance",
      q: "How does checkpointing differ from caching?",
      difficulty: "Common",
      tags: ["checkpoint", "cache", "lineage"],
      a:
        "<ul>" +
        "<li><b>Caching / persist</b> keeps a DataFrame in <b>memory (or memory+disk)</b> for reuse, but <b>keeps the lineage</b>. If an executor dies, Spark recomputes the lost partitions from lineage. It's a performance hint and can be evicted.</li>" +
        "<li><b>Checkpointing</b> writes the data to <b>reliable storage (HDFS/DBFS/S3)</b> and <b>truncates the lineage</b> — Spark forgets how it was computed. It survives failures and breaks long/iterative DAGs that would otherwise be expensive to recompute or cause stack-overflow planning.</li>" +
        "</ul>" +
        "<p>In <b>Structured Streaming</b>, checkpointing is mandatory, not optional — it stores offsets and state so a restarted query resumes exactly where it left off.</p>",
      tip: "One line: \"Cache = fast reuse, lineage kept, can vanish. Checkpoint = durable, lineage cut, survives restarts.\" Streaming checkpoints are required for exactly-once recovery."
    },
    {
      id: "spark-join-strategies",
      group: "Query Optimization",
      q: "What are the join strategies in Spark and when is each chosen?",
      difficulty: "Deep",
      tags: ["joins", "broadcast", "sort-merge", "shuffle-hash"],
      a:
        "<ul>" +
        "<li><b>Broadcast Hash Join (BHJ)</b> — ships the <b>small</b> side to every executor; no shuffle of the big side. Chosen when one side is under <code>spark.sql.autoBroadcastJoinThreshold</code> (default 10 MB). Fastest when it applies.</li>" +
        "<li><b>Sort-Merge Join (SMJ)</b> — the default for two <b>large</b> tables: shuffle both by the key, sort, then merge. Scales but costs a full shuffle + sort.</li>" +
        "<li><b>Shuffle Hash Join (SHJ)</b> — shuffles both sides, builds a hash map on one; used when one side fits in memory but isn't small enough to broadcast and sorting isn't worth it.</li>" +
        "<li><b>Broadcast Nested Loop / Cartesian</b> — fallbacks for non-equi or cross joins; avoid on big data.</li>" +
        "</ul>" +
        "<p>Nudge the optimizer with hints: <code>broadcast(df)</code>, or <code>/*+ MERGE */</code>, <code>/*+ SHUFFLE_HASH */</code>.</p>",
      code:
        "from pyspark.sql.functions import broadcast\n" +
        "big.join(broadcast(small_dim), \"dim_id\")   # force a broadcast hash join",
      lang: "python",
      tip: "Lead with the decision rule: \"small side → broadcast; two big tables → sort-merge.\" Then mention AQE can flip to broadcast at runtime once it measures the real size."
    },
    {
      id: "watermarking-late-data",
      group: "Streaming, MLlib & Graph",
      q: "How does watermarking work in Structured Streaming (late / out-of-order data)?",
      difficulty: "Deep",
      tags: ["watermark", "streaming", "event-time", "late-data"],
      a:
        "<p>A <b>watermark</b> tells Spark how long to wait for late events before finalizing a window. It's defined on the <b>event-time</b> column as a threshold:</p>" +
        "<ul>" +
        "<li>Spark tracks the <b>max event time seen</b>; the watermark = max seen − threshold.</li>" +
        "<li>A window's state is kept until the watermark passes its end, then emitted and <b>dropped from state</b> — this is what bounds state so it doesn't grow forever.</li>" +
        "<li>Events arriving <b>older than the watermark are dropped</b> (too late to count).</li>" +
        "</ul>" +
        "<p>So the watermark is a trade-off: a longer threshold catches more late data but holds more state and adds latency.</p>",
      code:
        "from pyspark.sql.functions import window\n" +
        "( events\n" +
        "  .withWatermark(\"event_time\", \"10 minutes\")\n" +
        "  .groupBy(window(\"event_time\", \"5 minutes\"), \"user_id\")\n" +
        "  .count() )",
      lang: "python",
      tip: "Say it in one breath: \"Watermark = how late I'll still accept an event; it bounds streaming state and lets Spark finalize + evict old windows.\""
    },
    {
      id: "more-executors-slower",
      group: "Partitions, Shuffle & Performance",
      q: "Why can increasing executors make a PySpark job slower, not faster?",
      difficulty: "Deep",
      tags: ["executors", "parallelism", "shuffle", "skew"],
      a:
        "<p>More executors only help if there's <b>parallelizable work and balanced data</b>. Common reasons adding them backfires:</p>" +
        "<ul>" +
        "<li><b>Not enough partitions</b> — if the job has 50 partitions, executors beyond 50 sit idle while you still pay for them.</li>" +
        "<li><b>Data skew</b> — one hot key means one task runs for an hour while the rest finish in seconds; more executors can't split that single task.</li>" +
        "<li><b>More shuffle fan-out</b> — more executors = more network connections and shuffle blocks to exchange, which can dominate.</li>" +
        "<li><b>Small-file / tiny-task overhead</b> — scheduling and JVM startup cost swamps the actual compute.</li>" +
        "</ul>",
      tip: "The senior answer: \"Throughput is bounded by partitions and the <i>slowest</i> task, not by executor count. Fix skew and partitioning first; scaling out a skewed job just adds idle, billed executors.\""
    },
    {
      id: "small-file-problem-why",
      group: "I/O, Formats & Data Quality",
      q: "Why is the \"small file problem\" a problem, and why is it NOT really about file size?",
      difficulty: "Deep",
      tags: ["small-files", "metadata", "io"],
      a:
        "<p>The pain isn't bytes on disk — it's <b>per-file overhead</b>:</p>" +
        "<ul>" +
        "<li><b>Metadata & listing</b> — the driver must list and open thousands of files; on object stores (S3/ADLS) each open is a separate, latency-heavy request.</li>" +
        "<li><b>One task per file (roughly)</b> — millions of tiny tasks mean scheduling overhead dwarfs the real work.</li>" +
        "<li><b>Lost columnar efficiency</b> — Parquet's compression, encoding and predicate push-down work on row groups; tiny files never fill one, so you lose the format's advantages.</li>" +
        "</ul>" +
        "<p><b>Fixes:</b> <code>coalesce</code>/<code>repartition</code> before write, Delta <code>OPTIMIZE</code> (compaction), or Auto Loader + auto-compaction. Target ~128 MB–1 GB files.</p>",
      tip: "Nail the framing: \"It's a <b>metadata and task-count</b> problem, not a storage-size problem.\" That one sentence is the whole answer."
    },

    // ───────────── Delta Lake, Lakehouse & Data Engineering (new group) ─────────────
    {
      id: "what-is-delta-lake",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "What is Delta Lake and what problems does it solve?",
      difficulty: "Core",
      tags: ["delta", "lakehouse", "acid"],
      a:
        "<p><b>Delta Lake is an open storage layer that adds reliability to a data lake</b> — it sits on top of Parquet files and makes them behave like a transactional table.</p>" +
        "<ul>" +
        "<li><b>ACID transactions</b> on files in cloud storage — no more half-written tables from a failed job.</li>" +
        "<li><b>Schema enforcement & evolution</b> — rejects bad writes, or evolves the schema on purpose.</li>" +
        "<li><b>Time travel</b> — query or roll back to an earlier version.</li>" +
        "<li><b>Unified batch + streaming</b> — the same table is a streaming source and sink.</li>" +
        "<li><b>Upserts/deletes</b> via <code>MERGE</code>, <code>UPDATE</code>, <code>DELETE</code> — impossible on plain Parquet.</li>" +
        "</ul>" +
        "<p>It's what turns a raw \"data lake\" into a <b>lakehouse</b>.</p>",
      tip: "One line: \"Delta = Parquet + a transaction log that gives ACID, time travel, and MERGE on a data lake.\""
    },
    {
      id: "delta-acid-log",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "How does Delta Lake give ACID guarantees (the transaction log)?",
      difficulty: "Deep",
      tags: ["delta", "transaction-log", "concurrency"],
      a:
        "<p>Every Delta table has a <b><code>_delta_log</code></b> directory — an ordered set of JSON commit files (periodically checkpointed to Parquet) that is the <b>single source of truth</b> for which data files make up the table.</p>" +
        "<ul>" +
        "<li>A write doesn't mutate existing files; it adds new Parquet files and then <b>atomically commits</b> a log entry listing adds/removes.</li>" +
        "<li>Readers read the log first, so they only ever see files from <b>committed</b> versions — never a partial write.</li>" +
        "<li><b>Optimistic concurrency control</b> — concurrent writers check the latest log version at commit; if another commit landed first, the loser retries. This is how isolation is enforced.</li>" +
        "</ul>",
      tip: "The magic word is the <b>transaction log</b> (<code>_delta_log</code>). \"Atomic commit of a log entry + optimistic concurrency\" is the mechanism interviewers are listening for."
    },
    {
      id: "delta-time-travel",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "How do you use Delta time travel and versioning?",
      difficulty: "Common",
      tags: ["delta", "time-travel", "versioning"],
      a:
        "<p>Because the log records every version, you can read the table <b>as of</b> a past version or timestamp:</p>" +
        "<ul>" +
        "<li><b>Audit / reproducibility</b> — rerun yesterday's report on yesterday's data.</li>" +
        "<li><b>Rollback</b> — <code>RESTORE</code> a table to a good version after a bad load.</li>" +
        "<li><b>Debugging / diffs</b> — compare two versions to see what a job changed.</li>" +
        "</ul>" +
        "<p><code>VACUUM</code> eventually removes old files past the retention window, which limits how far back you can travel.</p>",
      code:
        "df = spark.read.format(\"delta\").option(\"versionAsOf\", 12).load(path)\n" +
        "# or: .option(\"timestampAsOf\", \"2026-11-01\")\n" +
        "spark.sql(\"RESTORE TABLE sales TO VERSION AS OF 12\")",
      lang: "python",
      tip: "Mention the catch: <b>VACUUM</b> deletes tombstoned files, so time travel only reaches back as far as your retention (default 7 days)."
    },
    {
      id: "delta-optimize-zorder-vacuum",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "What do OPTIMIZE, ZORDER and VACUUM do on a Delta table?",
      difficulty: "Common",
      tags: ["delta", "optimize", "zorder", "vacuum"],
      a:
        "<ul>" +
        "<li><b>OPTIMIZE</b> — <b>compacts</b> many small files into fewer right-sized ones (fixes the small-file problem on Delta).</li>" +
        "<li><b>ZORDER BY</b> — co-locates related data within files by one or more columns, so <b>data skipping</b> reads far fewer files for queries filtering on those columns.</li>" +
        "<li><b>VACUUM</b> — permanently deletes files no longer referenced by the log (past the retention period), reclaiming storage.</li>" +
        "</ul>",
      code:
        "spark.sql(\"OPTIMIZE events ZORDER BY (user_id, event_date)\")\n" +
        "spark.sql(\"VACUUM events RETAIN 168 HOURS\")  -- 7 days",
      lang: "python",
      tip: "Pairing to remember: <b>OPTIMIZE</b> fixes file count, <b>ZORDER</b> fixes read skipping, <b>VACUUM</b> reclaims space (and caps time travel)."
    },
    {
      id: "cdc-change-data-feed",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "How do you implement CDC (Change Data Capture) with PySpark / Delta?",
      difficulty: "Deep",
      tags: ["cdc", "merge", "change-data-feed"],
      a:
        "<p><b>CDC</b> captures inserts/updates/deletes from a source and applies them incrementally to a target — you never reload the whole table.</p>" +
        "<ul>" +
        "<li><b>Ingest changes</b> (from Debezium/Kafka, or a source's change feed) as a stream/batch of change rows with an operation flag.</li>" +
        "<li><b>Dedupe to the latest</b> change per key (window by key, newest timestamp).</li>" +
        "<li><b>Apply with <code>MERGE INTO</code></b> — matched+delete flag → delete, matched → update, not-matched → insert.</li>" +
        "<li>Delta's <b>Change Data Feed</b> (<code>enableChangeDataFeed</code>) lets <i>downstream</i> jobs read exactly what changed in <i>this</i> table too.</li>" +
        "</ul>" +
        "<p>Make it <b>idempotent</b> so re-running the same batch is safe.</p>",
      code:
        "(target.alias(\"t\").merge(latest.alias(\"s\"), \"t.id = s.id\")\n" +
        "   .whenMatchedDelete(condition=\"s.op = 'D'\")\n" +
        "   .whenMatchedUpdateAll()\n" +
        "   .whenNotMatchedInsertAll()\n" +
        "   .execute())",
      lang: "python",
      tip: "Two layers: <b>MERGE</b> applies CDC <i>into</i> a table; <b>Change Data Feed</b> exposes changes <i>out of</i> a Delta table to downstream consumers."
    },
    {
      id: "lake-warehouse-lakehouse",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "Data Lake vs Data Warehouse vs Lakehouse — when do you use each?",
      difficulty: "Core",
      tags: ["data-lake", "warehouse", "lakehouse"],
      a:
        "<ul>" +
        "<li><b>Data Warehouse</b> — structured, schema-on-write, optimized for BI/SQL analytics (Snowflake, Synapse, BigQuery). Great governance & performance; costly and rigid for raw/semi-structured data and ML.</li>" +
        "<li><b>Data Lake</b> — cheap object storage holding <b>any</b> format, schema-on-read (S3/ADLS). Flexible and ML-friendly; but without structure it drifts into a \"data swamp\" with no ACID or governance.</li>" +
        "<li><b>Lakehouse</b> — a warehouse-like layer (Delta/Iceberg/Hudi) <b>on top of</b> a lake: ACID, schema enforcement, BI performance <i>and</i> cheap open storage for ML. One copy of the data serves both.</li>" +
        "</ul>",
      tip: "The arc: \"Warehouse = structured but rigid; Lake = flexible but unmanaged; Lakehouse = the best of both via a transactional layer like Delta.\""
    },
    {
      id: "etl-vs-elt",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "What's the difference between ETL and ELT — when would you choose each?",
      difficulty: "Core",
      tags: ["etl", "elt", "pipeline"],
      a:
        "<ul>" +
        "<li><b>ETL</b> — Extract → <b>Transform</b> → Load. Clean/shape data <i>before</i> loading. Classic for on-prem warehouses with limited compute and strict pre-load governance.</li>" +
        "<li><b>ELT</b> — Extract → Load → <b>Transform</b>. Land raw data first (in a lake/warehouse), transform <i>in</i> the powerful target engine. The modern cloud default — elastic compute makes in-warehouse transforms cheap and you keep the raw data for reprocessing.</li>" +
        "</ul>" +
        "<p><b>Choose ELT</b> when the target (Spark/Snowflake/BigQuery) is powerful and you want raw data retained; <b>ETL</b> when you must not land sensitive/raw data, or the target can't transform at scale.</p>",
      tip: "Modern one-liner: \"Cloud pushed us from ETL to ELT — land raw, transform in-place with the lake/warehouse's own compute, keep raw for replay.\""
    },
    {
      id: "unity-catalog",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "What is Unity Catalog?",
      difficulty: "Common",
      tags: ["unity-catalog", "governance", "databricks"],
      a:
        "<p><b>Unity Catalog is Databricks' centralized governance layer</b> for data and AI assets across workspaces.</p>" +
        "<ul>" +
        "<li><b>Three-level namespace</b> — <code>catalog.schema.table</code> — one place to organize all tables, views, volumes and models.</li>" +
        "<li><b>Fine-grained access control</b> — grant/revoke at catalog/schema/table/column/row level with standard SQL <code>GRANT</code>.</li>" +
        "<li><b>Lineage & auditing</b> — automatic column-level lineage and audit logs across notebooks, jobs and dashboards.</li>" +
        "<li><b>Cross-workspace</b> — one metastore shared by many workspaces, plus data sharing (Delta Sharing).</li>" +
        "</ul>",
      tip: "Frame it as \"centralized governance + lineage + a three-level namespace for the lakehouse\" — that distinguishes it from the old per-workspace Hive metastore."
    },
    {
      id: "autoloader",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "What is Auto Loader in Databricks?",
      difficulty: "Common",
      tags: ["autoloader", "ingestion", "streaming"],
      a:
        "<p><b>Auto Loader incrementally ingests new files</b> from cloud storage as they arrive, without you tracking what's already processed.</p>" +
        "<ul>" +
        "<li>Uses the <code>cloudFiles</code> Structured Streaming source — <b>exactly-once</b>, checkpointed file tracking.</li>" +
        "<li>Scales to <b>millions of files</b> via file notifications (queue) instead of re-listing a directory.</li>" +
        "<li><b>Schema inference & evolution</b> built in — handles new columns in incoming files.</li>" +
        "</ul>" +
        "<p>It's the standard answer to \"how do I continuously load a landing folder into a Delta bronze table?\"</p>",
      code:
        "(spark.readStream.format(\"cloudFiles\")\n" +
        "   .option(\"cloudFiles.format\", \"json\")\n" +
        "   .option(\"cloudFiles.schemaLocation\", chk)\n" +
        "   .load(landing)\n" +
        "   .writeStream.option(\"checkpointLocation\", chk).table(\"bronze\"))",
      lang: "python",
      tip: "Key phrase: \"incremental, exactly-once file ingestion with schema evolution\" — and it beats re-listing because it can use cloud file-notification queues."
    },
    {
      id: "kafka-kinesis-pubsub",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "How do you decide between Kafka, Kinesis, or Pub/Sub for streaming ingestion?",
      difficulty: "Common",
      tags: ["kafka", "kinesis", "pubsub", "streaming"],
      a:
        "<ul>" +
        "<li><b>Apache Kafka</b> — open-source, cloud-agnostic, highest throughput and control, rich ecosystem (Connect, Streams). Cost: you run/operate it (or pay for Confluent/MSK). Pick it for multi-cloud, very high volume, or when you need log retention/replay semantics.</li>" +
        "<li><b>AWS Kinesis</b> — fully managed on AWS, tight IAM/Lambda/Firehose integration. Pick it when you're all-in on AWS and want minimal ops.</li>" +
        "<li><b>GCP Pub/Sub</b> — fully managed, global, auto-scaling, no partitions to size. Pick it on GCP for simple elastic pub/sub without capacity planning.</li>" +
        "</ul>" +
        "<p>Decision axes: <b>managed vs self-run</b>, <b>cloud lock-in</b>, <b>throughput/replay needs</b>, and <b>ops budget</b>.</p>",
      tip: "Answer with the trade-off, not a winner: \"Kafka for control/portability/replay; Kinesis or Pub/Sub when I want the cloud to run it for me.\""
    },
    {
      id: "hive-managed-vs-external",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "What is the difference between Hive external and managed tables?",
      difficulty: "Common",
      tags: ["hive", "managed", "external"],
      a:
        "<ul>" +
        "<li><b>Managed (internal) table</b> — the metastore owns both <b>metadata and data</b>. <code>DROP TABLE</code> deletes the underlying files too.</li>" +
        "<li><b>External table</b> — the metastore owns only the <b>metadata</b>; data lives at a path you point to (<code>LOCATION</code>). <code>DROP TABLE</code> removes the definition but <b>leaves the files</b>.</li>" +
        "</ul>" +
        "<p>Use <b>external</b> when data is shared with other tools/jobs or must survive table drops (most lake tables); <b>managed</b> for scratch/derived tables whose lifecycle you want tied to the table.</p>",
      tip: "The one-liner that always lands: \"Drop a <b>managed</b> table and the data is gone; drop an <b>external</b> table and only the metadata is gone.\""
    },
    {
      id: "data-quality-checks",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "What data-quality checks do you implement in pipelines?",
      difficulty: "Common",
      tags: ["data-quality", "validation", "expectations"],
      a:
        "<p>Validate on the way in, and fail loudly or quarantine:</p>" +
        "<ul>" +
        "<li><b>Completeness</b> — required columns not null; expected row counts / freshness (did today's data arrive?).</li>" +
        "<li><b>Uniqueness</b> — primary keys / no unexpected duplicates.</li>" +
        "<li><b>Validity</b> — types, ranges, enums, regex (emails, codes); referential integrity against dimensions.</li>" +
        "<li><b>Consistency</b> — totals reconcile, no negative amounts, schema matches contract.</li>" +
        "<li><b>Anomaly</b> — volume/stat drift vs history.</li>" +
        "</ul>" +
        "<p>Enforce with Delta <b>constraints</b>, DLT <b>expectations</b>, or Great Expectations — and route bad rows to a <b>quarantine</b> table rather than dropping them silently.</p>",
      tip: "Group them into buckets (completeness, uniqueness, validity, consistency, timeliness) — reciting categories reads far more senior than listing ad-hoc checks."
    },
    {
      id: "pipeline-reliability-monitoring",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "How do you ensure pipeline reliability and monitoring in production?",
      difficulty: "Common",
      tags: ["reliability", "monitoring", "idempotency", "sla"],
      a:
        "<ul>" +
        "<li><b>Idempotency & retries</b> — re-running a job produces the same result (MERGE/upsert, not blind append); use checkpoints for streaming.</li>" +
        "<li><b>Orchestration</b> — Airflow/ADF/DLT with dependencies, retries with backoff, and alerting on failure/SLA miss.</li>" +
        "<li><b>Observability</b> — structured logs, job metrics (duration, rows, shuffle), the Spark UI, and lineage.</li>" +
        "<li><b>Data-quality gates</b> — fail or quarantine on bad data before it reaches consumers.</li>" +
        "<li><b>Backfill & recovery</b> — a documented way to reprocess a date range; dead-letter/quarantine for bad records.</li>" +
        "<li><b>SLAs/SLOs</b> — freshness and completeness targets with paging when breached.</li>" +
        "</ul>",
      tip: "Lead with <b>idempotency</b> — it's the single word that signals you've run pipelines in production, because it's what makes retries and backfills safe."
    },
    {
      id: "batch-vs-streaming",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "Batch vs streaming pipelines — and what are Lambda and Kappa architectures?",
      difficulty: "Common",
      tags: ["batch", "streaming", "lambda", "kappa"],
      a:
        "<ul>" +
        "<li><b>Batch</b> — process bounded chunks on a schedule (nightly sales roll-up). Simple, cheap, high-throughput; latency is minutes-to-hours.</li>" +
        "<li><b>Streaming</b> — process unbounded events continuously (fraud alerts, live dashboards). Low latency; more complex (state, watermarks, exactly-once).</li>" +
        "</ul>" +
        "<p><b>Lambda architecture</b> runs <i>both</i> a batch layer (accurate, reprocessable) and a speed layer (fast, approximate), then merges them — powerful but you maintain two codebases. <b>Kappa architecture</b> drops the batch layer: <b>everything is a stream</b>, and you reprocess by replaying the log — simpler, enabled by tools like Kafka + Delta.</p>",
      tip: "Give an example for each (nightly report = batch; fraud detection = streaming), then name Lambda vs Kappa to show you know the reprocessing trade-off."
    },
    {
      id: "cloud-migration",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "How would you migrate large data (e.g. 10TB on-prem SQL → cloud) with minimal downtime?",
      difficulty: "Deep",
      tags: ["migration", "cdc", "downtime"],
      a:
        "<p>The pattern is <b>bulk load once, then catch up with CDC</b>:</p>" +
        "<ul>" +
        "<li><b>Bulk/initial load</b> — move the historical snapshot (export to Parquet; ship via a transfer service / direct connect for 10TB rather than the public internet).</li>" +
        "<li><b>Change Data Capture</b> — while the bulk load runs, capture ongoing changes (Debezium / native CDC) so nothing is missed.</li>" +
        "<li><b>Apply the delta</b> — replay captured changes onto the target until it's caught up and lag is near zero.</li>" +
        "<li><b>Validate</b> — row counts, checksums, reconciliation queries between source and target.</li>" +
        "<li><b>Cutover</b> — a short freeze, apply the final changes, switch applications over; keep the old system as fallback.</li>" +
        "</ul>",
      tip: "The phrase that wins this: \"<b>initial bulk load + CDC to catch up, then a short cutover</b>.\" That's how you get near-zero downtime on a big migration."
    },
    {
      id: "databricks-cost-optimization",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "How do you reduce Databricks / cloud data-platform cost?",
      difficulty: "Common",
      tags: ["cost", "databricks", "tuning"],
      a:
        "<ul>" +
        "<li><b>Right-size & autoscale clusters</b>; enable <b>auto-termination</b> so idle clusters don't bill.</li>" +
        "<li><b>Job clusters over all-purpose</b> for scheduled jobs; <b>spot/preemptible</b> instances for fault-tolerant work.</li>" +
        "<li><b>Photon</b> and newer instance types for better price/performance.</li>" +
        "<li><b>Fix the data layout</b> — OPTIMIZE/ZORDER + partition pruning so jobs scan less (less compute = less cost).</li>" +
        "<li><b>Avoid waste</b> — kill skew/spills, cache deliberately, don't over-provision shuffle partitions, prune columns early.</li>" +
        "<li><b>Tier storage</b> and VACUUM stale files; separate dev/prod budgets with tags & monitoring.</li>" +
        "</ul>",
      tip: "Best single lever to mention: <b>auto-termination + job clusters + spot</b> for compute, and <b>scan less data</b> (pruning/ZORDER) for the work itself."
    },
    {
      id: "data-lineage",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "How do you enable data lineage and impact analysis across many pipelines?",
      difficulty: "Deep",
      tags: ["lineage", "governance", "metadata"],
      a:
        "<p><b>Lineage</b> is the map of where data came from and where it flows — essential for debugging, audits, and \"if I change this column, what breaks?\" impact analysis.</p>" +
        "<ul>" +
        "<li><b>Automatic capture</b> — Unity Catalog (column-level), OpenLineage/Marquez, or Spark listeners emit lineage as jobs run, rather than hand-maintained diagrams.</li>" +
        "<li><b>A metadata/catalog store</b> (Unity Catalog, DataHub, Atlas, Amundsen) holds the graph and powers search + impact queries.</li>" +
        "<li><b>Consistent identifiers</b> — tables/columns keyed the same way across jobs so edges connect.</li>" +
        "<li><b>Impact analysis</b> — traverse downstream from a column to find every dependent table, dashboard and job before you change it.</li>" +
        "</ul>",
      tip: "Stress <b>automatic</b> lineage (captured at runtime) over manual docs — at 200+ pipelines, hand-drawn lineage is always stale."
    },
    {
      id: "role-of-data-engineer",
      group: "Delta Lake, Lakehouse & Data Engineering",
      q: "What is the role of a Data Engineer?",
      difficulty: "Core",
      tags: ["role", "fundamentals"],
      a:
        "<p><b>A Data Engineer builds and operates the systems that move data from source to a reliable, query-ready state</b> for analysts, data scientists and applications.</p>" +
        "<ul>" +
        "<li><b>Ingestion</b> — pull from databases, APIs, files, streams.</li>" +
        "<li><b>Transformation/modeling</b> — clean, join, and shape into warehouse/lakehouse models (star schema, SCDs).</li>" +
        "<li><b>Pipelines & orchestration</b> — scheduled, idempotent, monitored ETL/ELT.</li>" +
        "<li><b>Reliability & quality</b> — SLAs, data-quality checks, lineage, cost.</li>" +
        "<li><b>Enablement</b> — serve trustworthy data to BI, ML and stakeholders.</li>" +
        "</ul>" +
        "<p>Contrast: analysts <i>consume</i> data; data engineers <i>build the plumbing</i> that makes it available and trustworthy.</p>",
      tip: "One line: \"I make data <b>available, reliable and query-ready</b> — owning the pipeline from source to serving layer.\""
    },

    // ─────────────────── Batch A · product-interview theory gaps ───────────────────
    {
      id: "python-udf-performance",
      group: "DataFrames, Datasets & Spark SQL",
      q: "Why are Python UDFs slow, and how do pandas UDFs fix it?",
      difficulty: "Core",
      tags: ["udf", "pandas-udf", "arrow", "serialization"],
      a:
        "<p>A plain <b>Python UDF</b> is slow because it breaks out of Spark's optimized engine:</p>" +
        "<ul>" +
        "<li><b>It's a black box to Catalyst</b> — Spark can't optimize, push down, or codegen through it.</li>" +
        "<li><b>Row-by-row serialization across the JVM↔Python boundary</b> — every row is pickled, shipped to a Python worker, processed one at a time, and shipped back. That hop (via Py4J/pipe) is the real cost.</li>" +
        "</ul>" +
        "<p><b>pandas UDFs (vectorized UDFs)</b> fix it with <b>Apache Arrow</b>: data moves in <i>columnar batches</i> (no per-row pickling) and your function runs on a whole pandas <code>Series</code>/<code>DataFrame</code> at once — often 10–100x faster. Flavors: <code>pandas_udf</code> (Series→Series), <code>applyInPandas</code> (grouped), <code>mapInPandas</code> (iterator of batches).</p>" +
        "<p><b>Best of all: avoid UDFs entirely</b> when a built-in <code>pyspark.sql.functions</code> expression exists — those stay inside Catalyst/Tungsten and are always fastest.</p>",
      code:
        "from pyspark.sql.functions import pandas_udf\n" +
        "import pandas as pd\n\n" +
        "@pandas_udf('double')\n" +
        "def to_celsius(f: pd.Series) -> pd.Series:   # whole batch, Arrow-backed\n" +
        "    return (f - 32) * 5 / 9\n\n" +
        "df.withColumn('c', to_celsius('fahrenheit'))",
      lang: "python",
      tip: "The sentence they want: <b>\"prefer built-in functions; if I must use a UDF, use a pandas (Arrow) UDF to avoid per-row Python↔JVM serialization.\"</b>"
    },
    {
      id: "window-functions",
      group: "DataFrames, Datasets & Spark SQL",
      q: "What are window functions and when do you use them?",
      difficulty: "Core",
      tags: ["window", "row-number", "rank", "lag", "lead"],
      a:
        "<p><b>A window function computes a value across a set of rows related to the current row — without collapsing them into one row</b> (unlike <code>groupBy</code>, which reduces). You keep every row <i>and</i> get the aggregate/rank alongside it.</p>" +
        "<p>A window is defined by three parts:</p>" +
        "<ul>" +
        "<li><b>partitionBy</b> — the groups to compute within (e.g. per customer).</li>" +
        "<li><b>orderBy</b> — ordering inside each partition (needed for ranking & lag/lead).</li>" +
        "<li><b>frame</b> — the row range (<code>rowsBetween</code>/<code>rangeBetween</code>) for running totals / moving averages.</li>" +
        "</ul>" +
        "<p>Families: <b>ranking</b> (<code>row_number</code>, <code>rank</code>, <code>dense_rank</code>), <b>offset</b> (<code>lag</code>, <code>lead</code>), and <b>aggregate-over-window</b> (<code>sum</code>/<code>avg</code> over a frame).</p>",
      code:
        "from pyspark.sql import Window\n" +
        "from pyspark.sql import functions as F\n\n" +
        "w = Window.partitionBy('customer').orderBy(F.col('ts').desc())\n" +
        "latest = (df.withColumn('rn', F.row_number().over(w))\n" +
        "            .filter('rn = 1'))   # latest row per customer",
        lang: "python",
      tip: "The classic interview use: <b>dedupe / top-N per group</b> with <code>row_number().over(partitionBy(key).orderBy(ts.desc()))</code> then keep <code>rn = 1</code>. Know that <code>rank</code> leaves gaps, <code>dense_rank</code> doesn't."
    },
    {
      id: "reading-query-plan",
      group: "Query Optimization",
      q: "How do you read a query plan with explain()?",
      difficulty: "Deep",
      tags: ["explain", "query-plan", "exchange", "catalyst"],
      a:
        "<p><code>df.explain(True)</code> (or <code>explain('formatted')</code>) prints the stages Catalyst produced: <b>Parsed → Analyzed → Optimized logical plan → Physical plan</b>. You read the <b>physical plan bottom-up</b> (scan first, result last).</p>" +
        "<p>What to look for:</p>" +
        "<ul>" +
        "<li><b><code>Exchange</code></b> = a <b>shuffle</b>. Each one is a stage boundary and your biggest cost — count them.</li>" +
        "<li><b>Join type</b> — <code>BroadcastHashJoin</code> (good, no big shuffle) vs <code>SortMergeJoin</code> (shuffles both sides).</li>" +
        "<li><b><code>PushedFilters</code> / partition filters</b> at the scan — confirms predicate pushdown and partition pruning actually happened.</li>" +
        "<li><b><code>AdaptiveSparkPlan</code></b> — AQE is active; the final plan is chosen at runtime.</li>" +
        "<li><b>Column list at the scan</b> — confirms column pruning (only needed columns read).</li>" +
        "</ul>",
      code:
        "df.explain(True)        # all four plans\n" +
        "df.explain('formatted') # readable physical plan + per-node details\n" +
        "# scan the physical plan for: Exchange, SortMergeJoin, PushedFilters",
      lang: "python",
      tip: "When asked \"this job is slow, what do you check?\" — say <b>\"I'd read <code>explain()</code> and count the <code>Exchange</code> (shuffle) nodes and the join strategy\"</b>. That signals real hands-on tuning."
    },
    {
      id: "pushdown-pruning",
      group: "Query Optimization",
      q: "What are predicate pushdown, column pruning and partition pruning?",
      difficulty: "Core",
      tags: ["predicate-pushdown", "column-pruning", "partition-pruning", "dpp"],
      a:
        "<p>Three Catalyst optimizations that all mean the same thing — <b>read less data</b>:</p>" +
        "<ul>" +
        "<li><b>Column pruning</b> — if you only <code>select</code> 3 of 50 columns, Spark reads only those 3 from a columnar file (Parquet/ORC). You get it free by not using <code>select('*')</code>.</li>" +
        "<li><b>Predicate pushdown</b> — a <code>filter</code> is pushed down into the file reader (or the source DB), so matching happens at scan time and fewer rows are ever materialized.</li>" +
        "<li><b>Partition pruning</b> — if data is written partitioned by a column, a filter on that column skips whole directories without opening them.</li>" +
        "<li><b>Dynamic Partition Pruning (DPP, Spark 3+)</b> — in a star-schema join, the filtered dimension's keys prune the fact table's partitions <i>at runtime</i>.</li>" +
        "</ul>" +
        "<p>Why it's possible: <b>lazy evaluation</b> lets Catalyst see the filter/select <i>before</i> the scan runs and fold them into it.</p>",
      tip: "Two conditions to mention: pushdown/pruning work best with <b>columnar formats (Parquet/ORC)</b> and when you <b>filter on the partition column</b>. Wrapping a column in a UDF <i>kills</i> pushdown."
    },
    {
      id: "memory-overhead-yarn-kill",
      group: "Partitions, Shuffle & Performance",
      q: "What causes \"Container killed by YARN for exceeding memory limits\"?",
      difficulty: "Deep",
      tags: ["memoryoverhead", "yarn", "oom", "off-heap"],
      a:
        "<p>This is <b>not a JVM heap OOM</b> — it's the cluster manager (YARN/K8s) killing the whole container because the executor used more memory than it was granted. The culprit is almost always <b>off-heap memory</b>, which heap tuning doesn't cover.</p>" +
        "<p>An executor's container = <b>heap (<code>spark.executor.memory</code>) + overhead (<code>spark.executor.memoryOverhead</code>)</b>. The overhead holds: <b>PySpark Python worker processes</b>, netty shuffle/network buffers, and off-heap Tungsten memory. Heavy Python UDFs, large shuffles, or big broadcasts blow past it.</p>" +
        "<ul>" +
        "<li><b>Fix 1</b> — raise <code>spark.executor.memoryOverhead</code> (not just heap). For PySpark-heavy jobs, 15–25% of executor memory.</li>" +
        "<li><b>Fix 2</b> — reduce pressure: more/smaller partitions, fewer Python UDFs, lower broadcast size.</li>" +
        "</ul>",
      tip: "The giveaway phrase to catch: <b>\"killed by YARN\" / \"exceeding memory limits\" = overhead, not heap.</b> Saying \"I'd bump <code>memoryOverhead</code>, especially for PySpark Python workers\" lands this instantly."
    },
    {
      id: "streaming-output-modes",
      group: "Streaming, MLlib & Graph",
      q: "What are output modes and exactly-once semantics in Structured Streaming?",
      difficulty: "Deep",
      tags: ["output-modes", "exactly-once", "checkpoint", "foreachbatch"],
      a:
        "<p><b>Output modes</b> control what gets written to the sink each micro-batch:</p>" +
        "<ul>" +
        "<li><b>append</b> — only brand-new rows (default; for stateless or windowed-with-watermark queries).</li>" +
        "<li><b>update</b> — only rows whose aggregate changed this batch.</li>" +
        "<li><b>complete</b> — the entire result table every batch (only for aggregations; small results).</li>" +
        "</ul>" +
        "<p><b>Exactly-once</b> comes from two pieces working together:</p>" +
        "<ul>" +
        "<li><b>Checkpointing</b> — Spark records the processed input offsets + aggregation state to a durable checkpoint location, so a restart resumes exactly where it stopped (no reprocessing, no gaps).</li>" +
        "<li><b>Idempotent / transactional sinks</b> — replaying a batch must not duplicate output. File and Delta sinks are transactional; for custom sinks use <code>foreachBatch</code> with an idempotent upsert (MERGE on a batch id).</li>" +
        "</ul>",
      tip: "The exam answer: <b>exactly-once = replayable source (offsets) + checkpoint (state) + idempotent sink.</b> Miss any leg and you only get at-least-once. Never delete the checkpoint dir of a running query."
    },
    {
      id: "dynamic-allocation",
      group: "Architecture & Execution",
      q: "What is dynamic resource allocation in Spark?",
      difficulty: "Core",
      tags: ["dynamic-allocation", "executors", "autoscaling", "shuffle-service"],
      a:
        "<p><b>Dynamic allocation lets Spark add and remove executors at runtime based on the workload</b>, instead of holding a fixed number for the whole app. Idle executors are released; when tasks pile up, more are requested.</p>" +
        "<ul>" +
        "<li><b>Why</b> — a job's needs vary by stage (a huge shuffle stage vs a tiny final write); fixed executors either waste money when idle or bottleneck when busy.</li>" +
        "<li><b>Enable</b> — <code>spark.dynamicAllocation.enabled=true</code> with min/max/initial executor bounds.</li>" +
        "<li><b>Catch</b> — it needs an <b>external shuffle service</b> (or shuffle tracking) so shuffle files survive when an executor is removed; otherwise releasing an executor loses its shuffle output.</li>" +
        "</ul>",
      tip: "Great cost answer: <b>\"enable dynamic allocation so idle executors are released\"</b> — but immediately add the catch about needing the <b>external shuffle service</b>, which shows depth."
    },
    {
      id: "nondeterminism-recompute",
      group: "Lazy Evaluation, DAG & Fault Tolerance",
      q: "How can lazy recomputation cause non-deterministic results?",
      difficulty: "Deep",
      tags: ["non-determinism", "monotonically-increasing-id", "rand", "cache"],
      a:
        "<p>Because transformations are <b>lazy and recomputed from lineage</b>, a non-deterministic column can produce <i>different values each time Spark evaluates it</i> — and Spark may evaluate the same DataFrame more than once (once per action, or when recovering a lost partition).</p>" +
        "<ul>" +
        "<li><b><code>monotonically_increasing_id()</code></b> — unique but <i>not</i> consecutive, and depends on partitioning; a repartition or recompute can change the ids.</li>" +
        "<li><b><code>rand()</code> without a seed</b>, current-time functions — different on each evaluation.</li>" +
        "<li><b>Symptom</b> — you filter on such a column, then a later action recomputes it, and rows seem to \"move\" or counts don't match.</li>" +
        "</ul>" +
        "<p><b>Fix:</b> <b>materialize it</b> — <code>cache()</code> (then force with an action) or write to disk — so the value is computed once and frozen; or seed <code>rand(seed)</code> for reproducibility.</p>",
      code:
        "from pyspark.sql import functions as F\n" +
        "df2 = df.withColumn('id', F.monotonically_increasing_id())\n" +
        "df2.cache(); df2.count()   # freeze the ids before using them downstream",
      lang: "python",
      tip: "A strong senior signal: \"because Spark recomputes from lineage, I <b>cache or checkpoint before relying on non-deterministic columns</b> like <code>monotonically_increasing_id</code> or unseeded <code>rand</code>.\""
    },
    {
      id: "withcolumn-loop",
      group: "Query Optimization",
      q: "Why is calling withColumn in a loop a performance problem?",
      difficulty: "Deep",
      tags: ["withcolumn", "catalyst", "plan-bloat", "select"],
      a:
        "<p>Each <code>withColumn</code> returns a <b>new DataFrame with a new node added to the logical plan</b>. Call it hundreds of times in a loop and the Catalyst plan grows huge and deeply nested — analysis/optimization time explodes, and you can hit stack-overflow or multi-minute plan compilation <i>before a single row is processed</i>.</p>" +
        "<ul>" +
        "<li><b>It's a planning problem, not a runtime one</b> — the actual execution might be fine; it's Catalyst choking on the giant plan.</li>" +
        "<li><b>Fix</b> — build all the new columns in a <b>single <code>select()</code></b> (or one <code>withColumns({...})</code> in Spark 3.3+), so the plan gets one projection node instead of hundreds.</li>" +
        "</ul>",
      code:
        "# BAD: hundreds of plan nodes\n" +
        "for c in cols:\n" +
        "    df = df.withColumn(c, F.col(c).cast('double'))\n\n" +
        "# GOOD: one projection\n" +
        "df = df.select([F.col(c).cast('double').alias(c) for c in cols])",
      lang: "python",
      tip: "Name the root cause precisely: <b>\"it bloats the Catalyst plan (a node per call), so planning gets slow — I collapse it into one <code>select</code>.\"</b>"
    },
    {
      id: "write-partitioning",
      group: "I/O, Formats & Data Quality",
      q: "What does write.partitionBy do, and how does it relate to the small-file problem?",
      difficulty: "Core",
      tags: ["partitionby", "partition-pruning", "small-files", "write"],
      a:
        "<p><code>df.write.partitionBy('col')</code> writes data into a <b>directory per value</b> of that column (e.g. <code>/date=2026-01-01/</code>). The point is <b>partition pruning on read</b>: a later query filtering on that column skips every other directory.</p>" +
        "<p>But it's a balance, and over-partitioning backfires:</p>" +
        "<ul>" +
        "<li><b>Pick low-cardinality columns</b> (date, region) — partitioning on a high-cardinality column (user_id) makes millions of tiny directories.</li>" +
        "<li><b>The small-file problem</b> — each (partition × shuffle partition) can emit a tiny file; thousands of small files crush the driver with metadata and make reads slow. Fix by <code>repartition</code>-ing on the partition column (or AQE coalesce) before writing.</li>" +
        "<li><b>Don't confuse</b> <code>df.repartition(col)</code> (in-memory layout) with <code>df.write.partitionBy(col)</code> (on-disk directory layout) — a classic trap.</li>" +
        "</ul>",
      code:
        "(df.repartition('event_date')                 # avoid tiny files\n" +
        "   .write.partitionBy('event_date')           # directory per date\n" +
        "   .mode('overwrite').parquet('/lake/events'))",
      lang: "python",
      tip: "The nuance that scores: <b>partition on a low-cardinality column, and <code>repartition</code> before writing to avoid the small-file problem</b>. Call out that <code>repartition</code> ≠ <code>partitionBy</code>."
    },
    {
      id: "cost-based-optimization",
      group: "Query Optimization",
      q: "What is Cost-Based Optimization (CBO) and why do table statistics matter?",
      difficulty: "Deep",
      tags: ["cbo", "statistics", "analyze-table", "optimizer"],
      a:
        "<p>Catalyst has two layers of optimization. <b>Rule-based optimization (RBO)</b> always applies fixed rewrites (pushdown, pruning, constant folding). <b>Cost-Based Optimization (CBO)</b> goes further: it uses <b>statistics about your data</b> to choose between plans that RBO can't rank on its own.</p>" +
        "<ul>" +
        "<li><b>What stats</b> — row counts, distinct counts, min/max, null counts, and (with histograms) value distribution per column.</li>" +
        "<li><b>What CBO decides</b> — <b>join order</b> (which tables to join first so intermediate results stay small), whether a side is small enough to <b>broadcast</b>, and join strategy selection.</li>" +
        "<li><b>How you get stats</b> — run <code>ANALYZE TABLE t COMPUTE STATISTICS FOR COLUMNS ...</code>; enable with <code>spark.sql.cbo.enabled=true</code> (off by default).</li>" +
        "<li><b>Why it matters</b> — without stats the optimizer guesses sizes and can pick a bad join order or miss a broadcast, turning a fast query slow.</li>" +
        "</ul>" +
        "<p><b>AQE vs CBO:</b> CBO uses <i>pre-computed</i> stats at planning time; <b>AQE</b> re-optimizes at <i>runtime</i> using the actual sizes it observes — so AQE helps even when stats are stale or missing.</p>",
      tip: "The clean distinction to state: <b>RBO = always-true rewrites; CBO = stats-driven choices (join order, broadcast); AQE = runtime re-optimization from real sizes.</b> Mention <code>ANALYZE TABLE</code> to show you know how stats get there."
    },

    // ─────────────────────────── Spark UI & Debugging ───────────────────────────
    {
      id: "spark-ui-overview",
      group: "Spark UI & Debugging",
      q: "What is the Spark UI and what are its main tabs?",
      difficulty: "Core",
      tags: ["spark-ui", "monitoring", "debugging"],
      a:
        "<p>The <b>Spark UI is the web dashboard every Spark application exposes</b> (by default on the driver at <code>http://&lt;driver&gt;:4040</code>). It's your primary tool for understanding <i>what Spark actually did</i> — how your code was split into jobs/stages/tasks, where time and memory went, and why something is slow.</p>" +
        "<ul>" +
        "<li><b>Jobs</b> — one row per action (<code>count</code>, <code>write</code>, <code>collect</code>); shows duration and the stages it triggered.</li>" +
        "<li><b>Stages</b> — the real workhorse tab: per-stage task metrics, shuffle read/write, spill, and the task-time distribution that exposes skew.</li>" +
        "<li><b>SQL / DataFrame</b> — the query plan as a visual graph with row counts and per-operator metrics; where you read exchanges, scans and joins.</li>" +
        "<li><b>Executors</b> — one row per executor: cores, memory used, GC time, shuffle, and failed/dead executors.</li>" +
        "<li><b>Storage</b> — cached/persisted datasets, how much is in memory vs spilled to disk.</li>" +
        "<li><b>Environment</b> — all effective Spark configs (great for confirming a setting actually took).</li>" +
        "</ul>",
      tip: "Interviewers love \"which tab first?\" — answer <b>Stages for a slow job, SQL for a slow query, Executors for OOM/GC</b>. Naming the right starting tab signals real hands-on experience."
    },
    {
      id: "spark-ui-access-history-server",
      group: "Spark UI & Debugging",
      q: "How do you access the Spark UI while a job runs vs after it finishes?",
      difficulty: "Common",
      tags: ["spark-ui", "history-server", "4040", "event-log"],
      a:
        "<p><b>While the app is running</b> the live UI is served by the driver at <code>:4040</code> (4041, 4042… if multiple apps share a host). The catch: <b>it disappears the moment the application ends</b> — the driver JVM exits and takes the UI with it.</p>" +
        "<ul>" +
        "<li><b>Spark History Server</b> — to inspect a finished job you need event logs. Enable <code>spark.eventLog.enabled=true</code> and point <code>spark.eventLog.dir</code> at durable storage (HDFS/S3). The History Server replays those logs into the same UI after the fact.</li>" +
        "<li><b>On managed platforms</b> (Databricks, EMR, Glue) the UI / History Server is wired up for you and linked from the job or cluster page.</li>" +
        "<li><b>Common gotcha</b> — \"the UI is gone\" almost always means event logging wasn't enabled; you can't retro-fit it after the run has ended.</li>" +
        "</ul>",
      code:
        "spark.eventLog.enabled           true\n" +
        "spark.eventLog.dir               s3a://my-bucket/spark-logs\n" +
        "spark.history.fs.logDirectory    s3a://my-bucket/spark-logs",
      lang: "text",
      tip: "Say it crisply: <b>\":4040 is live and dies with the driver; the History Server replays event logs for post-mortem debugging.\"</b> Mentioning <code>spark.eventLog.enabled</code> shows you've actually set this up."
    },
    {
      id: "spark-ui-jobs-tab",
      group: "Spark UI & Debugging",
      q: "How do you read the Jobs tab, and what are the event timeline and DAG?",
      difficulty: "Core",
      tags: ["spark-ui", "jobs", "dag", "timeline"],
      a:
        "<p>The <b>Jobs tab lists one job per action</b> you triggered, each with its duration, the number of stages, and a progress bar of completed/total tasks. It's your first zoom level: which action is slow?</p>" +
        "<ul>" +
        "<li><b>Event timeline</b> — a horizontal timeline of when executors were added/removed and when each job ran. Big idle gaps or a single long job stand out immediately.</li>" +
        "<li><b>DAG visualization</b> — click a job to see its stages as a graph; the <b>boundaries between stages are shuffles</b>. More stages = more shuffles = more expensive.</li>" +
        "<li><b>Skipped stages</b> — a stage shown as \"skipped\" means its output was already available (from cache or a prior shuffle) and got reused — that's good, not an error.</li>" +
        "</ul>" +
        "<p>Use it to pick the costly job, then drill into its stages.</p>",
      tip: "A sharp observation: <b>\"each stage boundary in the DAG is a shuffle\"</b> — so counting stages is a quick proxy for how shuffle-heavy a job is. \"Skipped\" = reused output, not a failure."
    },
    {
      id: "spark-ui-stages-tab",
      group: "Spark UI & Debugging",
      q: "What does the Stages tab tell you, and how do you read the summary-metrics table?",
      difficulty: "Deep",
      tags: ["spark-ui", "stages", "tasks", "metrics", "percentiles"],
      a:
        "<p>The Stages tab is where most real debugging happens. Open a stage and you get a <b>summary-metrics table showing the Min, 25th, Median, 75th and Max</b> across all its tasks for each metric — the distribution, not just an average.</p>" +
        "<ul>" +
        "<li><b>Duration</b> — if Max ≫ Median, a few tasks are doing far more work: that's <b>skew</b>.</li>" +
        "<li><b>Shuffle Read / Shuffle Write</b> — bytes moved across the network; large values point to wide transformations you may be able to reduce or broadcast away.</li>" +
        "<li><b>Spill (Memory) / Spill (Disk)</b> — any non-zero spill means tasks ran out of execution memory and wrote to disk; a top cause of slowness.</li>" +
        "<li><b>GC Time</b> — time spent in garbage collection; high GC means memory pressure.</li>" +
        "<li><b>Scheduler Delay</b> — time a task waited to be scheduled; high values hint at too many tiny tasks or an overloaded driver.</li>" +
        "<li><b>Input Size / Records</b> — how much each task read; uneven input is skew at the source.</li>" +
        "</ul>",
      tip: "The percentile table is the whole game: <b>compare Max to Median</b>. A healthy stage has them close; a Max far above the Median is the single clearest skew signal in the UI."
    },
    {
      id: "spark-ui-detect-skew",
      group: "Spark UI & Debugging",
      q: "How do you detect data skew using the Spark UI?",
      difficulty: "Deep",
      tags: ["spark-ui", "skew", "stages", "stragglers"],
      a:
        "<p>Skew shows up as a <b>stage stuck on one or two straggler tasks</b> while everything else has finished. The UI makes it obvious in three places:</p>" +
        "<ul>" +
        "<li><b>Summary metrics</b> — in the stage's percentile table, <b>Max Duration and Max Shuffle Read are many times the Median</b>. That gap <i>is</i> the skew.</li>" +
        "<li><b>Task table / event timeline</b> — sort tasks by duration; a handful run for minutes while the rest took seconds. On the timeline you literally see most tasks finish and one long bar remain.</li>" +
        "<li><b>Records per task</b> — the straggler read far more input/shuffle records, usually because one join or group key dominates (a hot key, or a flood of null keys).</li>" +
        "</ul>" +
        "<p><b>Fixes once confirmed:</b> enable AQE skew join (<code>spark.sql.adaptive.skewJoin.enabled</code>), salt the hot key, or filter/handle null keys separately.</p>",
      tip: "Describe the picture: <b>\"the stage sits at 199/200 tasks done for minutes.\"</b> That one sentence tells the interviewer you've watched a real skewed job and know exactly what it looks like."
    },
    {
      id: "spark-ui-detect-spill",
      group: "Spark UI & Debugging",
      q: "How do you spot spill in the Spark UI, and what does it mean?",
      difficulty: "Deep",
      tags: ["spark-ui", "spill", "memory", "shuffle-partitions"],
      a:
        "<p><b>Spill</b> is Spark writing data out of execution memory onto local disk because a task's working set (a sort, aggregation, or shuffle) didn't fit in RAM. It's correctness-safe but slow — extra disk I/O and serialization.</p>" +
        "<ul>" +
        "<li><b>Where to see it</b> — the stage's summary-metrics table has <b>Spill (Memory)</b> and <b>Spill (Disk)</b> rows. Anything above zero means spilling; the disk number is the real on-disk volume written.</li>" +
        "<li><b>What causes it</b> — too much data per task (too few shuffle partitions), skew concentrating data on one task, or wide aggregations with little executor memory.</li>" +
        "<li><b>How to fix</b> — raise <code>spark.sql.shuffle.partitions</code> (or let AQE coalesce), reduce data per task, give executors more memory, or fix the underlying skew.</li>" +
        "</ul>",
      tip: "Make the cost concrete: <b>\"spill means we blew past execution memory and fell back to disk — so I raise shuffle partitions or cut data-per-task before just throwing more memory at it.\"</b>"
    },
    {
      id: "spark-ui-sql-tab",
      group: "Spark UI & Debugging",
      q: "How do you read the SQL / DataFrame tab and its query graph?",
      difficulty: "Deep",
      tags: ["spark-ui", "sql-tab", "query-plan", "exchange", "joins"],
      a:
        "<p>The SQL/DataFrame tab shows each query as a <b>visual plan graph of physical operators</b>, each annotated with live metrics — rows output, bytes read, time spent. It's how you connect your DataFrame code to what actually ran.</p>" +
        "<ul>" +
        "<li><b>Exchange nodes = shuffles</b> — each <code>Exchange</code> is a network shuffle; they're the expensive boundaries. Fewer/smaller exchanges is the optimization goal.</li>" +
        "<li><b>Scan nodes</b> — show <i>number of files read</i> and <i>rows</i>; here you confirm <b>partition pruning</b> and <b>predicate pushdown</b> happened (far fewer files/rows than the whole table).</li>" +
        "<li><b>Join nodes</b> — tell you the chosen strategy: <code>BroadcastHashJoin</code> (small side broadcast — good) vs <code>SortMergeJoin</code> (both sides shuffled — costly).</li>" +
        "<li><b>\"number of output rows\"</b> per node — a node emitting billions of rows mid-plan flags an exploding join or a missing filter.</li>" +
        "<li><b>AQE</b> — with AQE on, the final graph shows the <i>runtime-adjusted</i> plan (coalesced partitions, a join switched to broadcast).</li>" +
        "</ul>",
      tip: "Golden checks here: <b>look for a <code>SortMergeJoin</code> that should have been a <code>BroadcastHashJoin</code>, and confirm the scan pruned files.</b> Both are high-value wins you can read straight off the graph."
    },
    {
      id: "spark-ui-executors-tab",
      group: "Spark UI & Debugging",
      q: "What do you look for in the Executors tab?",
      difficulty: "Deep",
      tags: ["spark-ui", "executors", "gc", "memory", "oom"],
      a:
        "<p>The Executors tab has <b>one row per executor (plus the driver)</b>, giving the cluster's resource and health picture at a glance. It's the first stop for memory and GC problems.</p>" +
        "<ul>" +
        "<li><b>Task Time vs GC Time</b> — the key ratio. If GC Time is a large fraction of Task Time (say &gt;10–15%), executors are under memory pressure and thrashing.</li>" +
        "<li><b>Storage Memory</b> — how much of the memory fraction is used by cached data; near-full means cache eviction or spill.</li>" +
        "<li><b>Failed / dead executors</b> — a red flag for OOM kills (\"Container killed by YARN for exceeding memory limits\") or lost nodes; correlate with task failures.</li>" +
        "<li><b>Cores &amp; active tasks</b> — uneven active-task counts across executors can signal poor parallelism or locality waiting.</li>" +
        "<li><b>Shuffle Read/Write per executor</b> — one executor moving far more than the others is another skew tell.</li>" +
        "</ul>",
      tip: "Lead with the GC ratio: <b>\"high GC time relative to task time means memory pressure\"</b> — then mention dead executors as the fingerprint of OOM kills. That's the Executors-tab story in two lines."
    },
    {
      id: "spark-ui-storage-tab",
      group: "Spark UI & Debugging",
      q: "What does the Storage tab show, and when is it useful?",
      difficulty: "Core",
      tags: ["spark-ui", "storage", "cache", "persist"],
      a:
        "<p>The Storage tab lists every <b>RDD/DataFrame you've cached or persisted</b>, showing for each: the storage level, how many partitions are cached, the <b>fraction cached</b>, and size in memory vs on disk.</p>" +
        "<ul>" +
        "<li><b>Fraction cached &lt; 100%</b> — your dataset didn't fully fit; the uncached part is recomputed on every access, often erasing the benefit of caching.</li>" +
        "<li><b>Size in memory vs disk</b> — with <code>MEMORY_AND_DISK</code>, a large on-disk portion means memory was insufficient.</li>" +
        "<li><b>Nothing listed</b> — if you expected a cache but the tab is empty, your <code>cache()</code> never got an action to materialize it (cache is lazy).</li>" +
        "</ul>",
      tip: "The gotcha worth naming: <b>\"cache is lazy — it only appears in the Storage tab after an action materializes it, and a fraction below 100% means it's being partly recomputed.\"</b>"
    },
    {
      id: "spark-ui-debug-slow-job",
      group: "Spark UI & Debugging",
      q: "Walk me through debugging a slow Spark job using the UI.",
      difficulty: "Deep",
      tags: ["spark-ui", "debugging", "methodology", "performance"],
      a:
        "<p>A systematic top-down pass — this is the answer that wins the \"it's slow, what do you do?\" question:</p>" +
        "<ul>" +
        "<li><b>1. Jobs tab</b> — find which job/action actually dominates wall-clock time. Don't optimize blind.</li>" +
        "<li><b>2. Its stages</b> — open the slow job and find the longest stage; stage boundaries are shuffles, so a long stage right after an <code>Exchange</code> is often shuffle-bound.</li>" +
        "<li><b>3. Summary metrics</b> — read the percentile table: Max ≫ Median duration ⇒ <b>skew</b>; non-zero Spill ⇒ <b>memory pressure</b>; huge Shuffle Read ⇒ <b>too much data moved</b>.</li>" +
        "<li><b>4. SQL tab</b> — map the stage back to operators: a <code>SortMergeJoin</code> that should broadcast, a scan that didn't prune, an exploding-row join.</li>" +
        "<li><b>5. Executors tab</b> — rule out high GC / dead executors (memory) as the real bottleneck.</li>" +
        "<li><b>6. One hypothesis, one change</b> — broadcast the small side, raise/coalesce shuffle partitions, enable AQE skew join, or add a filter — then re-read the same metrics to confirm it helped.</li>" +
        "</ul>",
      tip: "Structure beats trivia here. Say <b>\"Jobs → Stages → summary metrics → SQL → Executors, then change one thing and re-measure.\"</b> A repeatable method is what senior interviewers are listening for."
    },
    {
      id: "spark-ui-diagnose-shuffle",
      group: "Spark UI & Debugging",
      q: "How do you diagnose shuffle problems in the Spark UI?",
      difficulty: "Deep",
      tags: ["spark-ui", "shuffle", "exchange", "partitions"],
      a:
        "<p>Shuffle is usually the most expensive thing a job does, and the UI exposes it from two angles:</p>" +
        "<ul>" +
        "<li><b>SQL tab</b> — count and size the <code>Exchange</code> nodes. Many large exchanges mean many wide transformations; the goal is to remove or shrink them (broadcast a join, pre-aggregate, repartition once instead of repeatedly).</li>" +
        "<li><b>Stages tab</b> — <b>Shuffle Write</b> on the producing stage and <b>Shuffle Read</b> on the consuming stage show the bytes crossing the network. Large shuffle read with spill means the receiving tasks can't hold their share.</li>" +
        "<li><b>Partition count</b> — if shuffle read is big and tasks spill, there are too few shuffle partitions (default 200); raise <code>spark.sql.shuffle.partitions</code> or rely on AQE coalesce. Thousands of millisecond tasks is the opposite problem.</li>" +
        "<li><b>Skewed shuffle</b> — one task's Shuffle Read dwarfing the rest is a skewed key sitting on the shuffle boundary.</li>" +
        "</ul>",
      tip: "Tie read↔write together: <b>\"Shuffle Write on the upstream stage equals Shuffle Read on the downstream one — that's the data crossing the network, and it's what I try to shrink first.\"</b>"
    },
    {
      id: "spark-ui-partitions-task-count",
      group: "Spark UI & Debugging",
      q: "How can the Spark UI reveal a bad partition count (too many tiny tasks or too few huge ones)?",
      difficulty: "Core",
      tags: ["spark-ui", "partitions", "tasks", "parallelism"],
      a:
        "<p>Partitioning problems are visible straight from the <b>task count and task durations</b> in the Stages tab:</p>" +
        "<ul>" +
        "<li><b>Too few partitions</b> — a stage has only a handful of long tasks that each process a lot of data and often <b>spill</b>; cluster cores sit idle. You're under-parallelized.</li>" +
        "<li><b>Too many partitions</b> — thousands of tasks each finishing in milliseconds, with <b>Scheduler Delay and task-launch overhead dominating</b> the useful work. The driver spends more time coordinating than the tasks spend computing.</li>" +
        "<li><b>The sweet spot</b> — tasks that run for a few hundred ms to a few seconds, roughly 2–3× the total cluster cores in count, with little spill and low scheduler delay.</li>" +
        "<li><b>On write</b> — a stage emitting far more output tasks than needed is the <b>small-file problem</b> in the making; coalesce/repartition before writing.</li>" +
        "</ul>",
      tip: "Give the heuristic: <b>\"tasks in the hundreds-of-ms-to-seconds range, ~2–3× core count.\"</b> Milliseconds everywhere = too many partitions; multi-minute tasks with spill = too few."
    },

    // ═══════════════ Scenario-Based Questions (2026-11) ═══════════════
    {
      id: "scenario-slow-stage",
      group: "Scenario-Based Questions",
      q: "Your Spark job is running very slowly and one stage takes far longer than the rest. How do you diagnose and fix it?",
      difficulty: "Deep",
      tags: ["scenario", "performance", "skew", "spark-ui", "tuning"],
      a:
        "<p><b>Diagnose with a method, don't guess.</b> A single stage dragging while the others fly is almost always <b>data skew</b>, but I confirm it in the Spark UI before touching any knob.</p>" +
        "<ul>" +
        "<li><b>1. Open the slow stage → Summary Metrics.</b> Compare the <b>Max</b> task duration (and Shuffle Read size) against the <b>75th percentile / Median</b>. A median of 2s and a max of 4min means a few tasks are doing almost all the work — textbook skew.</li>" +
        "<li><b>2. Event Timeline.</b> You'll literally see most tasks finish early while one or two bars run on alone. Those straggler tasks pin the whole stage (a stage ends only when its <i>last</i> task does).</li>" +
        "<li><b>3. Find the hot key.</b> Skew comes from one value owning a huge share of rows — a default/placeholder key, <code>NULL</code> that all hashes to one partition, or a mega-customer. A quick <code>groupBy(key).count().orderBy(desc)</code> exposes it.</li>" +
        "</ul>" +
        "<p><b>Then fix the actual cause:</b></p>" +
        "<ul>" +
        "<li><b>Skew join</b> → enable <b>AQE skew-join handling</b> (<code>spark.sql.adaptive.enabled</code> + <code>spark.sql.adaptive.skewJoin.enabled</code>) so Spark splits the big partition automatically; or <b>salt</b> the key manually (append a random suffix to spread the hot key across N partitions, replicate the small side N times).</li>" +
        "<li><b>Small dimension</b> → <b>broadcast join</b> so the skewed side is never shuffled at all.</li>" +
        "<li><b>NULL skew</b> → filter the nulls out before the join (or handle them separately) so they don't all collapse onto one task.</li>" +
        "<li><b>Not skew?</b> → check partition count (<code>spark.sql.shuffle.partitions</code>), spill to disk (high GC / disk-spill metrics), and the small-files problem on read.</li>" +
        "</ul>",
      code:
        "# Salting a skewed join key\n" +
        "from pyspark.sql import functions as F\n\n" +
        "N = 10  # salt buckets\n\n" +
        "fact_salted = fact.withColumn('salt', (F.rand() * N).cast('int'))\n\n" +
        "# replicate the small side across all salt buckets\n" +
        "dim_salted = (dim\n" +
        "    .withColumn('salt', F.explode(F.array([F.lit(i) for i in range(N)]))))\n\n" +
        "joined = fact_salted.join(dim_salted, ['key', 'salt'], 'inner')\n\n" +
        "# Or just let AQE do it:\n" +
        "spark.conf.set('spark.sql.adaptive.enabled', 'true')\n" +
        "spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true')",
      lang: "python",
      tip: "Lead with the <b>method</b>, not the fix: <i>\"I'd open the slow stage, compare max vs. median task time to confirm skew, find the hot key, then either salt it or let AQE split it.\"</i> Showing you measure before tuning is what separates senior answers."
    },
    {
      id: "scenario-big-small-join",
      group: "Scenario-Based Questions",
      q: "You need to join a 2 TB fact table with a 50 MB dimension table. How do you make it efficient?",
      difficulty: "Core",
      tags: ["scenario", "broadcast-join", "joins", "shuffle"],
      a:
        "<p><b>Broadcast the 50 MB side.</b> The whole trick is: never shuffle the 2 TB table. A normal join would trigger a <b>sort-merge join</b> — both sides hash-partitioned and shuffled across the network, which on 2 TB is brutal. A <b>broadcast (map-side) join</b> avoids that entirely.</p>" +
        "<ul>" +
        "<li><b>Mechanism</b> — the driver collects the 50 MB table, <b>torrent-broadcasts</b> a copy to every executor, and each executor builds a local hash table. The 2 TB fact table then streams through and probes that in-memory map <b>with zero shuffle</b>.</li>" +
        "<li><b>How to trigger it</b> — wrap the small side in <code>broadcast()</code>, or let Spark do it automatically: any table under <code>spark.sql.autoBroadcastJoinThreshold</code> (default <b>10 MB</b>) is broadcast. 50 MB is above the default, so either raise the threshold or hint it explicitly.</li>" +
        "<li><b>Confirm it worked</b> — the physical plan should show <code>BroadcastHashJoin</code>, not <code>SortMergeJoin</code>, and there's no <code>Exchange</code> on the fact side.</li>" +
        "</ul>" +
        "<p><b>Caveats:</b> broadcasting is bounded by driver and executor memory. Don't broadcast anything near a few hundred MB without care — the driver has to hold and ship it, and every executor holds a full copy, so an over-large broadcast causes driver OOM. AQE can also convert a join to broadcast at runtime once it sees the real size.</p>",
      code:
        "from pyspark.sql.functions import broadcast\n\n" +
        "# Explicit hint — forces the 50 MB dim to be broadcast\n" +
        "result = fact.join(broadcast(dim), 'dim_id', 'left')\n\n" +
        "# Or raise the auto-broadcast threshold (e.g. to 64 MB)\n" +
        "spark.conf.set('spark.sql.autoBroadcastJoinThreshold', 64 * 1024 * 1024)\n\n" +
        "result.explain()   # expect BroadcastHashJoin, no Exchange on fact side",
      lang: "python",
      tip: "Say the magic words: <b>\"broadcast join so the big table is never shuffled.\"</b> Then mention the <b>10 MB default threshold</b> and the <b>driver-OOM caveat</b> — that shows you know when <i>not</i> to broadcast."
    },
    {
      id: "scenario-oom",
      group: "Scenario-Based Questions",
      q: "Your job fails with OutOfMemoryError or 'executor lost'. Walk me through how you'd fix it.",
      difficulty: "Deep",
      tags: ["scenario", "oom", "memory", "tuning", "collect"],
      a:
        "<p><b>First: where is the OOM — driver or executor?</b> The fix is completely different, so I always locate it before changing config.</p>" +
        "<ul>" +
        "<li><b>Driver OOM</b> — almost always pulling too much data back to one JVM: <code>collect()</code>, <code>toPandas()</code>, or broadcasting a table that's too big. <b>Fix:</b> never collect a large result (write to storage instead), cap/shrink broadcasts, and bump <code>spark.driver.memory</code> only if the data genuinely must land on the driver.</li>" +
        "<li><b>Executor OOM</b> — a single task is handling more data than fits. Causes and fixes:" +
        "<ul>" +
        "<li><b>Skew</b> — one partition is huge → salt the key or enable AQE skew join.</li>" +
        "<li><b>Partitions too large</b> → increase <code>spark.sql.shuffle.partitions</code> so each task's slice shrinks.</li>" +
        "<li><b>Wide aggregation</b> — <code>groupByKey</code> ships every value → switch to <code>reduceByKey</code>/<code>aggregateByKey</code> (map-side combine) so far less data lands per task.</li>" +
        "<li><b>Overhead memory</b> — off-heap/shuffle buffers overflow → raise <code>spark.executor.memoryOverhead</code> (common cause of 'executor lost' / container killed by YARN).</li>" +
        "</ul></li>" +
        "</ul>" +
        "<p><b>Also check the Executors tab:</b> high GC time or repeated executor loss often means the real issue is memory pressure from spill, not raw compute. Raising memory blindly is the last resort — fixing skew / partitioning / the aggregation pattern usually solves it more cheaply.</p>",
      tip: "Open with the split: <b>\"Is it the driver or an executor?\"</b> Driver OOM → something collected everything to one node. Executor OOM → skew or too-big partitions. Diagnosing the location first is the senior move."
    },
    {
      id: "scenario-small-files",
      group: "Scenario-Based Questions",
      q: "Millions of tiny files are landing in your input path and jobs are crawling. What's the problem and how do you fix it?",
      difficulty: "Core",
      tags: ["scenario", "small-files", "io", "compaction", "partitions"],
      a:
        "<p>This is the classic <b>small-files problem</b>. Spark (and the metastore/driver) pays a fixed cost <i>per file</i>: listing them, opening them, and scheduling roughly <b>one task per file</b>. A million 10 KB files means a million tiny tasks — the driver drowns in scheduling and metadata overhead while almost no real work happens per task.</p>" +
        "<ul>" +
        "<li><b>Why it hurts</b> — slow file listing on object stores (S3/ADLS list calls are expensive), huge task counts with millisecond durations, and heavy driver memory from tracking all the partitions/files.</li>" +
        "</ul>" +
        "<p><b>Fixes — on read:</b></p>" +
        "<ul>" +
        "<li>Let Spark pack many small files into fewer partitions with <code>spark.sql.files.maxPartitionBytes</code> (e.g. 128 MB) and <code>openCostInBytes</code>, so one task reads many files instead of one-per-file.</li>" +
        "</ul>" +
        "<p><b>Fixes — on write (prevent it at the source):</b></p>" +
        "<ul>" +
        "<li><code>coalesce()</code> or <code>repartition()</code> before writing to produce fewer, larger output files (aim for ~128–256 MB each).</li>" +
        "<li>Run a periodic <b>compaction / bin-packing</b> job; on Delta Lake use <code>OPTIMIZE</code> (and <code>OPTIMIZE ... ZORDER BY</code>) to merge small files, or enable <b>auto-compaction / optimized writes</b>.</li>" +
        "<li>Tune partition granularity — don't over-partition the write (e.g. by a high-cardinality column) or you re-create the problem.</li>" +
        "</ul>",
      code:
        "# Read: coalesce many small files into 128 MB partitions\n" +
        "spark.conf.set('spark.sql.files.maxPartitionBytes', 128 * 1024 * 1024)\n\n" +
        "# Write: fewer, larger files\n" +
        "(df.repartition(50)          # ~50 output files instead of thousands\n" +
        "   .write.mode('overwrite')\n" +
        "   .parquet('/out/path'))\n\n" +
        "# Delta: compact existing small files\n" +
        "# OPTIMIZE delta.`/out/path` ZORDER BY (customer_id)",
      lang: "python",
      tip: "Name it as <b>\"the small-files problem — roughly one task per file, so the overhead swamps the work.\"</b> Then split your fix into <b>read-side</b> (maxPartitionBytes) and <b>write-side</b> (coalesce + OPTIMIZE/compaction)."
    },
    {
      id: "scenario-cdc-dedup",
      group: "Scenario-Based Questions",
      q: "A downstream team needs the deduplicated latest record per key from a CDC feed. How do you build it?",
      difficulty: "Deep",
      tags: ["scenario", "cdc", "dedup", "window", "merge", "delta"],
      a:
        "<p>CDC feeds contain multiple versions of the same primary key (insert, then updates). The goal is <b>one row per key — the most recent version</b>.</p>" +
        "<p><b>Batch / full rebuild — window function:</b></p>" +
        "<ul>" +
        "<li>Partition by the primary key, order by the event timestamp (and a tiebreaker like an operation sequence number) descending, number the rows, and keep <code>rn = 1</code>.</li>" +
        "<li>Prefer <code>row_number()</code> over <code>dropDuplicates()</code> here — <code>row_number()</code> lets you deterministically pick the <i>latest</i>; <code>dropDuplicates()</code> keeps an arbitrary row.</li>" +
        "<li>Handle deletes: if the latest op is a <code>DELETE</code>, drop the key from the output.</li>" +
        "</ul>" +
        "<p><b>Incremental / streaming — Delta MERGE (upsert):</b></p>" +
        "<ul>" +
        "<li>De-dupe the incoming micro-batch to one row per key first (same window trick), then <b>MERGE</b> into the target on the key: update when matched, insert when not, delete when the op is a delete.</li>" +
        "<li>Or consume <b>Delta Change Data Feed</b> to propagate only the changed rows downstream.</li>" +
        "</ul>",
      code:
        "from pyspark.sql import Window\n" +
        "from pyspark.sql import functions as F\n\n" +
        "# Latest record per key\n" +
        "w = Window.partitionBy('pk').orderBy(F.col('event_ts').desc(),\n" +
        "                                     F.col('op_seq').desc())\n\n" +
        "latest = (cdc_df\n" +
        "    .withColumn('rn', F.row_number().over(w))\n" +
        "    .filter(F.col('rn') == 1)\n" +
        "    .filter(F.col('op') != 'DELETE')   # drop deleted keys\n" +
        "    .drop('rn'))\n\n" +
        "# Incremental upsert into a Delta table\n" +
        "# target.alias('t').merge(latest.alias('s'), 't.pk = s.pk') \\\n" +
        "#   .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()",
      lang: "python",
      tip: "Two-part answer wins: <b>\"row_number() partitioned by key, ordered by timestamp desc, keep rn=1\"</b> for a rebuild, and <b>\"de-dupe the batch then Delta MERGE on the key\"</b> for incremental. Mention handling DELETEs — interviewers probe for it."
    },
    {
      id: "scenario-groupbykey-vs-reducebykey",
      group: "Scenario-Based Questions",
      q: "groupByKey vs reduceByKey — when would choosing the wrong one actually hurt you?",
      difficulty: "Core",
      tags: ["scenario", "rdd", "shuffle", "reducebykey", "groupbykey"],
      a:
        "<p>Both group data by key across the cluster, but <b>how much they shuffle is wildly different</b>, and that's where the wrong choice bites.</p>" +
        "<ul>" +
        "<li><b><code>groupByKey</code></b> — ships <b>every single value</b> for a key across the network to one reducer, <i>then</i> combines. No map-side combine. If one key is hot (say 100M values), all of them land on one task → massive shuffle and <b>executor OOM</b>.</li>" +
        "<li><b><code>reduceByKey</code> / <code>aggregateByKey</code></b> — do a <b>map-side combine first</b>: each partition pre-aggregates its own values locally, so only the partial results cross the network. Far less shuffle, far less memory, and resilient to hot keys.</li>" +
        "</ul>" +
        "<p><b>The rule:</b> for any associative/commutative aggregation (sum, count, max, averages via sum+count), always prefer <code>reduceByKey</code>/<code>aggregateByKey</code>. Reach for <code>groupByKey</code> only when you genuinely need the full list of values per key and can't express it as a reduce — and even then, consider whether the data volume per key is safe.</p>",
      code:
        "# BAD: ships all values, risks OOM on hot keys\n" +
        "rdd.groupByKey().mapValues(lambda vs: sum(vs))\n\n" +
        "# GOOD: map-side combine, only partial sums shuffle\n" +
        "rdd.reduceByKey(lambda a, b: a + b)\n\n" +
        "# Average without groupByKey: carry (sum, count)\n" +
        "(rdd.mapValues(lambda v: (v, 1))\n" +
        "    .reduceByKey(lambda a, b: (a[0] + b[0], a[1] + b[1]))\n" +
        "    .mapValues(lambda sc: sc[0] / sc[1]))",
      lang: "python",
      tip: "The one-liner: <b>\"reduceByKey combines on the map side, groupByKey shuffles every value — so groupByKey OOMs on hot keys.\"</b> Showing the (sum, count) average trick proves you can avoid groupByKey even for averages."
    },

    // ═══════════════ Scenario-Based Questions — batch 2 (2026-11) ═══════════════
    {
      id: "scenario-large-large-join",
      group: "Scenario-Based Questions",
      q: "Both sides of your join are large (say 500 GB × 800 GB) so broadcast won't work. How do you make it efficient?",
      difficulty: "Deep",
      tags: ["scenario", "joins", "sort-merge", "bucketing", "shuffle"],
      a:
        "<p>With two big tables you're in <b>sort-merge join</b> territory: Spark hash-partitions <i>both</i> sides on the join key, shuffles them, sorts each partition, then merges. The shuffle is unavoidable in the naive case — so the game is to <b>shrink it or pay it only once</b>.</p>" +
        "<ul>" +
        "<li><b>Bucketing</b> — the big win for <i>repeated</i> joins. Pre-write both tables <b>bucketed and sorted on the join key</b> with the same bucket count. Matching keys then already live in co-located buckets, so Spark can join <b>without a shuffle at all</b> (and without re-sorting). Great when the same tables are joined again and again.</li>" +
        "<li><b>Filter &amp; project first</b> — push down predicates and select only needed columns <i>before</i> the join so fewer bytes cross the network. Pre-aggregate if the grain allows it.</li>" +
        "<li><b>Right-size shuffle partitions</b> — with hundreds of GB, the default 200 partitions makes each task huge and spill-prone. Raise <code>spark.sql.shuffle.partitions</code> (or let AQE coalesce) so each task's slice fits in memory.</li>" +
        "<li><b>Handle skew too</b> — if a key is also hot, enable AQE skew join or salt it; otherwise one straggler task defines the whole join's runtime.</li>" +
        "<li><b>AQE</b> — leave it on: it can coalesce partitions and re-plan at runtime once it sees the real partition sizes.</li>" +
        "</ul>",
      code:
        "# Bucket both tables once, on the join key, same bucket count\n" +
        "(fact.write.bucketBy(256, 'cust_id').sortBy('cust_id')\n" +
        "     .mode('overwrite').saveAsTable('fact_bucketed'))\n" +
        "(dim.write.bucketBy(256, 'cust_id').sortBy('cust_id')\n" +
        "     .mode('overwrite').saveAsTable('dim_bucketed'))\n\n" +
        "# Now this join is shuffle-free\n" +
        "a = spark.table('fact_bucketed')\n" +
        "b = spark.table('dim_bucketed')\n" +
        "result = a.join(b, 'cust_id')\n\n" +
        "# Scale shuffle partitions for one-off big joins\n" +
        "spark.conf.set('spark.sql.shuffle.partitions', 2000)",
      lang: "python",
      tip: "If broadcast is off the table, the senior answer is <b>\"bucket both sides on the join key so the join is shuffle-free, and size shuffle partitions to the data.\"</b> Mention bucketing pays off for <i>repeated</i> joins — one-off joins just need partition tuning + AQE."
    },
    {
      id: "scenario-idempotent-incremental-etl",
      group: "Scenario-Based Questions",
      q: "Design an idempotent daily incremental ETL pipeline. What makes it safe to re-run?",
      difficulty: "Deep",
      tags: ["scenario", "etl", "incremental", "idempotent", "merge", "delta"],
      a:
        "<p>Two requirements drive the design: <b>only process new data</b> (incremental) and <b>re-running produces the same result</b> (idempotent — critical because jobs get retried after failures).</p>" +
        "<p><b>Incremental — read only what's new:</b></p>" +
        "<ul>" +
        "<li>Partition the source by a <b>load/event date</b> and read only the target day's partition (<b>partition pruning</b>) instead of scanning everything.</li>" +
        "<li>For streams/offsets, track the <b>last processed watermark</b> (a high-water timestamp or offset) and read strictly greater than it.</li>" +
        "</ul>" +
        "<p><b>Idempotent — re-run can't double-count:</b></p>" +
        "<ul>" +
        "<li><b>Partition overwrite</b> — write a day's output with <code>overwrite</code> scoped to that partition (<code>partitionOverwriteMode=dynamic</code>), so re-running the day replaces it rather than appending duplicates.</li>" +
        "<li><b>Or Delta MERGE</b> — upsert on the primary key; a replay updates existing rows in place instead of inserting copies.</li>" +
        "<li><b>Avoid blind <code>append</code></b> — appends are the classic source of duplicates on retry.</li>" +
        "</ul>" +
        "<p><b>Operational glue:</b> checkpoint/bookmark the last successful watermark only <i>after</i> a successful write, make each run atomic (write to staging → swap, or rely on Delta's transactional commit), and log the processed range for auditability.</p>",
      code:
        "# Process only yesterday's partition\n" +
        "day = '2026-11-18'\n" +
        "src = spark.read.parquet('/raw/events').where(f\"load_date = '{day}'\")\n\n" +
        "out = transform(src)\n\n" +
        "# Idempotent: dynamic partition overwrite replaces just that day\n" +
        "spark.conf.set('spark.sql.sources.partitionOverwriteMode', 'dynamic')\n" +
        "(out.write.mode('overwrite').partitionBy('load_date')\n" +
        "    .parquet('/warehouse/events'))\n\n" +
        "# Alternative: Delta upsert on key (also idempotent)\n" +
        "# tgt.merge(out, 'tgt.id = src.id') \\\n" +
        "#    .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()",
      lang: "python",
      tip: "The word interviewers want is <b>idempotent</b>: <i>\"I overwrite the target partition (or MERGE on the key) instead of appending, so a retry can't create duplicates.\"</i> Pair it with partition pruning for the <i>incremental</i> half."
    },
    {
      id: "scenario-schema-drift",
      group: "Scenario-Based Questions",
      q: "Incoming files keep changing schema — new columns appear, types shift. How do you handle schema drift?",
      difficulty: "Deep",
      tags: ["scenario", "schema", "drift", "mergeschema", "data-quality"],
      a:
        "<p>Schema drift is a data-engineering fact of life. The decision is <b>evolve vs. fail-loud</b>, and you usually want a bit of both.</p>" +
        "<p><b>Let the schema evolve (when new columns are expected):</b></p>" +
        "<ul>" +
        "<li><b>Parquet/Delta</b> — read with <code>mergeSchema=true</code> (or Delta <code>autoMerge</code> on write) so new columns are absorbed and old files just show <code>NULL</code> for them.</li>" +
        "<li>Delta enforces schema by default and rejects incompatible writes — you opt into evolution explicitly, which is safer than silent coercion.</li>" +
        "</ul>" +
        "<p><b>Control it (when you need stability):</b></p>" +
        "<ul>" +
        "<li><b>Declare an explicit schema</b> on read instead of inferring — new unexpected columns are ignored and types are pinned, so a supplier's change can't silently break downstream.</li>" +
        "<li><b>Quarantine bad records</b> — for JSON/CSV use <code>mode='PERMISSIVE'</code> with <code>columnNameOfCorruptRecord</code> (or <code>badRecordsPath</code>) to route malformed rows to a <b>dead-letter path</b> instead of failing the whole job or dropping data silently.</li>" +
        "</ul>" +
        "<p><b>Governance:</b> validate the incoming schema against a contract, alert on unexpected changes, and keep a DLQ so nothing is lost. <i>Fail-loud on breaking changes, evolve on additive ones.</i></p>",
      code:
        "# Delta: absorb new columns automatically\n" +
        "(df.write.format('delta').option('mergeSchema', 'true')\n" +
        "   .mode('append').save('/warehouse/events'))\n\n" +
        "# Explicit schema + corrupt-record capture for JSON\n" +
        "from pyspark.sql.types import StructType\n" +
        "schema = StructType.fromJson(contract)  # your declared contract\n" +
        "df = (spark.read.schema(schema)\n" +
        "      .option('mode', 'PERMISSIVE')\n" +
        "      .option('columnNameOfCorruptRecord', '_corrupt')\n" +
        "      .json('/raw/events'))\n\n" +
        "good = df.where('_corrupt is null')\n" +
        "bad  = df.where('_corrupt is not null')   # -> dead-letter path",
      lang: "python",
      tip: "Frame it as a policy: <b>\"evolve on additive changes (mergeSchema), fail-loud on breaking ones (explicit schema), and quarantine bad rows to a DLQ.\"</b> Mentioning the dead-letter path signals production experience."
    },
    {
      id: "scenario-streaming-late-exactly-once",
      group: "Scenario-Based Questions",
      q: "Your Structured Streaming job must handle late-arriving events with exactly-once output. How do you build it?",
      difficulty: "Deep",
      tags: ["scenario", "streaming", "watermark", "checkpoint", "exactly-once"],
      a:
        "<p>Three separate concerns, each with its own mechanism — interviewers want you to name them distinctly.</p>" +
        "<ul>" +
        "<li><b>Late data → watermarking.</b> <code>withWatermark('event_time', '2 hours')</code> tells Spark how late an event can be. It bounds how long windowed/aggregation state is kept, lets genuinely late events still update their window, and <b>drops stragglers older than the watermark</b> so state doesn't grow forever.</li>" +
        "<li><b>Recovery → checkpointing.</b> A <code>checkpointLocation</code> persists the source offsets and the aggregation state. After a crash, the job resumes from the last committed offset — no data loss, no reprocessing of already-committed batches.</li>" +
        "<li><b>Exactly-once → idempotent/transactional sink.</b> Spark gives exactly-once <i>end-to-end</i> only when the sink cooperates. Checkpointed offsets + a <b>transactional sink like Delta</b> (or the <code>foreachBatch</code> + idempotent upsert pattern) commit output and offsets atomically, so a replayed batch doesn't duplicate rows. A plain non-idempotent sink is only at-least-once.</li>" +
        "</ul>" +
        "<p><b>Output mode matters:</b> use <code>update</code>/<code>complete</code> for aggregations; <code>append</code> only emits a window once its watermark has passed (so results are final). Event-time (in the data) drives correctness, not processing-time (when Spark saw it).</p>",
      code:
        "from pyspark.sql import functions as F\n\n" +
        "agg = (events\n" +
        "   .withWatermark('event_time', '2 hours')          # bound lateness\n" +
        "   .groupBy(F.window('event_time', '10 minutes'), 'key')\n" +
        "   .count())\n\n" +
        "(agg.writeStream\n" +
        "   .format('delta')                                 # transactional sink\n" +
        "   .option('checkpointLocation', '/chk/agg')        # recovery + offsets\n" +
        "   .outputMode('append')                            # emit finalized windows\n" +
        "   .start('/warehouse/agg'))",
      lang: "python",
      tip: "Map each requirement to its tool out loud: <b>late → watermark, recovery → checkpoint, exactly-once → checkpoint + transactional sink (Delta).</b> Add that exactly-once is only end-to-end if the <i>sink</i> is idempotent — that nuance impresses."
    },
    {
      id: "scenario-works-small-fails-large",
      group: "Scenario-Based Questions",
      q: "The job runs fine on a 1 GB sample but is slow or fails on the full 1 TB. What scaled wrong?",
      difficulty: "Core",
      tags: ["scenario", "scaling", "tuning", "collect", "partitions"],
      a:
        "<p>This is the <b>'works in dev, dies in prod'</b> pattern. Things that are harmless at 1 GB become fatal at 1 TB — and they're almost always these:</p>" +
        "<ul>" +
        "<li><b>Driver-side collection</b> — <code>collect()</code>, <code>toPandas()</code>, <code>count()</code> in a loop. Fine on a sample, <b>driver OOM</b> on the full set. Keep data distributed; write to storage instead of pulling it back.</li>" +
        "<li><b>Fixed / default partition count</b> — <code>spark.sql.shuffle.partitions=200</code> means ~5 GB per task at 1 TB → spill and OOM. It needs to scale with the data (or let AQE coalesce).</li>" +
        "<li><b>Caching that no longer fits</b> — a <code>cache()</code> that sat in memory at 1 GB now evicts/spills constantly, so you pay recompute <i>and</i> disk. Re-check what's worth caching at scale.</li>" +
        "<li><b>Skew that was invisible small</b> — a hot key barely shows on a sample but dominates at full volume; one straggler task defines the runtime.</li>" +
        "<li><b>Python UDFs</b> — the per-row Python↔JVM hop is cheap on a sample, murderous on billions of rows. Replace with built-in functions or pandas/vectorized UDFs.</li>" +
        "<li><b>Small-files / wide scans</b> — full input has far more files/partitions than the sample; listing and scheduling overhead explodes.</li>" +
        "</ul>" +
        "<p><b>Approach:</b> read the Spark UI at full scale (spill, GC, task-time distribution), scale config <i>with</i> the data rather than hard-coding, and remove anything that funnels data through the driver.</p>",
      tip: "The headline causes: <b>collect()/toPandas() on the driver, a hard-coded shuffle-partition count, caching that no longer fits, and skew that only appears at scale.</b> Say you'd confirm in the UI rather than guess."
    },
    {
      id: "scenario-backfill",
      group: "Scenario-Based Questions",
      q: "You need to backfill 2 years of history without disrupting the live daily pipeline. How do you approach it?",
      difficulty: "Deep",
      tags: ["scenario", "backfill", "reprocessing", "partitions", "idempotent"],
      a:
        "<p>The two risks are <b>blowing up resources</b> (two years at once) and <b>colliding with the live pipeline</b>. Both are solved by controlled, partition-at-a-time reprocessing.</p>" +
        "<ul>" +
        "<li><b>Chunk by partition</b> — process <b>one day/month at a time</b> in a loop rather than loading 2 years into one job. This bounds memory and shuffle, and makes progress resumable (a failure retries just that chunk).</li>" +
        "<li><b>Cap parallelism / isolate resources</b> — run the backfill with a smaller/separate resource pool or lower concurrency so it doesn't starve the daily job of cluster capacity. Schedule it off-peak if sharing a cluster.</li>" +
        "<li><b>Reuse the exact transform logic</b> — call the same transformation code the daily job uses (parameterized by date) so backfilled data can't drift from live data.</li>" +
        "<li><b>Idempotent, non-disruptive writes</b> — write each partition with <b>dynamic partition overwrite</b> or <b>Delta MERGE</b>, so re-running a chunk is safe and you only touch the partitions being backfilled. Optionally write to a <b>staging table and atomically swap</b> so readers never see half-finished data.</li>" +
        "<li><b>Watch for schema differences</b> — 2-year-old data may predate current columns; handle with schema evolution / defaults.</li>" +
        "</ul>",
      code:
        "from datetime import date, timedelta\n\n" +
        "def daterange(start, end):\n" +
        "    d = start\n" +
        "    while d <= end:\n" +
        "        yield d; d += timedelta(days=1)\n\n" +
        "spark.conf.set('spark.sql.sources.partitionOverwriteMode', 'dynamic')\n\n" +
        "for d in daterange(date(2024,1,1), date(2025,12,31)):\n" +
        "    day = d.isoformat()\n" +
        "    src = spark.read.parquet('/raw/events').where(f\"load_date='{day}'\")\n" +
        "    out = transform(src)                       # SAME logic as daily job\n" +
        "    (out.write.mode('overwrite').partitionBy('load_date')\n" +
        "        .parquet('/warehouse/events'))         # overwrites only this day",
      lang: "python",
      tip: "Lead with <b>\"partition-at-a-time, idempotent overwrites, same transform code as the daily job, capped parallelism so it doesn't starve prod.\"</b> Reusing the live logic (no drift) is the detail interviewers reward."
    },
    {
      id: "scenario-scd-type2",
      group: "Scenario-Based Questions",
      q: "Build an SCD Type 2 dimension in Spark that tracks history with effective dates. How?",
      difficulty: "Deep",
      tags: ["scenario", "scd", "dimension", "merge", "delta", "history"],
      a:
        "<p><b>SCD Type 2</b> keeps full history: when an attribute changes, you don't overwrite the row — you <b>close the old version and insert a new one</b>. Each row carries <code>effective_from</code>, <code>effective_to</code>, and an <code>is_current</code> flag.</p>" +
        "<p><b>The logic per incoming batch:</b></p>" +
        "<ul>" +
        "<li><b>Unchanged keys</b> — do nothing.</li>" +
        "<li><b>Changed attributes</b> — mark the existing current row <code>is_current=false</code> and set its <code>effective_to</code> to now, <b>then</b> insert the new version as <code>is_current=true</code> with <code>effective_from=now</code> and open-ended <code>effective_to</code>.</li>" +
        "<li><b>Brand-new keys</b> — insert as current.</li>" +
        "</ul>" +
        "<p><b>In Delta this is a two-part MERGE</b> (a single MERGE can't both update the old and insert the new version for the same key, so the common pattern unions a 'force-insert' marker): close changed current rows, then insert the new versions. Use a hash of the tracked columns to detect real changes cheaply.</p>",
      code:
        "from delta.tables import DeltaTable\n" +
        "from pyspark.sql import functions as F\n\n" +
        "tgt = DeltaTable.forPath(spark, '/warehouse/dim_customer')\n" +
        "today = F.current_date()\n\n" +
        "# Rows whose tracked attrs changed must both close old + insert new.\n" +
        "# Trick: union them twice with a merge_key that is NULL for the insert row.\n" +
        "updates = (src.alias('s')\n" +
        "   .withColumn('merge_key', F.col('cust_id')))\n\n" +
        "insert_rows = (src.join(tgt.toDF().filter('is_current'), 'cust_id')\n" +
        "   .where('s.attrs_hash <> t.attrs_hash')          # changed only\n" +
        "   .select('s.*').withColumn('merge_key', F.lit(None)))\n\n" +
        "staged = updates.unionByName(insert_rows, allowMissingColumns=True)\n\n" +
        "(tgt.alias('t').merge(staged.alias('s'),\n" +
        "     't.cust_id = s.merge_key AND t.is_current = true')\n" +
        "   .whenMatchedUpdate(                               # close old version\n" +
        "       condition='t.attrs_hash <> s.attrs_hash',\n" +
        "       set={'is_current': F.lit(False), 'effective_to': today})\n" +
        "   .whenNotMatchedInsert(set={                       # open new version\n" +
        "       'cust_id': 's.cust_id', 'attrs_hash': 's.attrs_hash',\n" +
        "       'is_current': F.lit(True), 'effective_from': today,\n" +
        "       'effective_to': F.lit('9999-12-31')})\n" +
        "   .execute())",
      lang: "python",
      tip: "Name the columns — <b>effective_from / effective_to / is_current</b> — and the key insight: <b>\"you close the old row and insert a new one, so one change needs both an update and an insert\"</b> (hence the two-part / NULL-merge-key MERGE). An attrs hash to detect changes is the pro touch."
    }
  ]
};
