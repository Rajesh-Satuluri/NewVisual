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
 * Q0 pilot = 2 groups: "Spark Fundamentals" + "Lazy Eval, DAG, Lineage & Catalyst".
 */
window.PYSPARK_QA = {
  // Full 10-group order (only groups with items render as chips).
  groups: [
    "Spark Fundamentals",
    "Architecture & Execution",
    "RDD Deep-Dive",
    "Transformations, Actions & RDD API",
    "DataFrames, Datasets & Spark SQL",
    "Lazy Eval, DAG, Lineage & Catalyst",
    "Partitions, Shuffle & Performance",
    "Skew & Broadcast",
    "I/O, Formats & Data Quality",
    "Streaming, MLlib & Graph"
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
        "</ul>"
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
        "<p>Net: up to <b>~100x</b> faster in memory, <b>~10x</b> on disk.</p>"
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
        "</ul>"
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
        "</ul>"
    },

    // ─────────────── G6 · Lazy Eval, DAG, Lineage & Catalyst ───────────────
    {
      id: "lazy-evaluation",
      group: "Lazy Eval, DAG, Lineage & Catalyst",
      q: "What is lazy evaluation in Spark, and why does it help?",
      difficulty: "Core",
      tags: ["lazy", "transformation", "action", "optimization"],
      a:
        "<p><b>Lazy evaluation means Spark doesn't run a transformation the moment you write it — it just records it in a plan and waits until an action forces a result.</b></p>" +
        "<ul>" +
        "<li>Transformations (<code>select</code>, <code>filter</code>, <code>withColumn</code>, <code>join</code>) only <b>build up a DAG</b>; nothing computes yet.</li>" +
        "<li>An action (<code>show</code>, <code>count</code>, <code>collect</code>, <code>write</code>) is what <b>triggers the job</b>.</li>" +
        "</ul>" +
        "<p><b>Why it helps:</b> because Spark sees the <i>whole</i> pipeline before running, it can optimize across it — push filters down to the source, prune unused columns, and combine narrow steps into one pass. An eager, line-by-line engine can't do that.</p>",
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
      group: "Lazy Eval, DAG, Lineage & Catalyst",
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
      group: "Lazy Eval, DAG, Lineage & Catalyst",
      q: "What's the difference between a DAG and lineage?",
      difficulty: "Common",
      tags: ["dag", "lineage", "comparison"],
      a:
        "<p>They're related but not the same:</p>" +
        "<ul>" +
        "<li><b>DAG</b> — the <i>whole execution plan</i> of a job: all operations and their dependencies, used by the scheduler to plan and optimize stages and tasks.</li>" +
        "<li><b>Lineage</b> — the <i>recipe to rebuild a single RDD/DataFrame</i>: the exact chain of transformations that produced it, used for <b>fault recovery</b>.</li>" +
        "</ul>" +
        "<p>Simple framing: <b>DAG is about execution &amp; optimization; lineage is about recovery.</b> Lineage is essentially the ancestry recorded inside the DAG.</p>"
    },
    {
      id: "lineage-graph",
      group: "Lazy Eval, DAG, Lineage & Catalyst",
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
      group: "Lazy Eval, DAG, Lineage & Catalyst",
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
        "</ul>",
      tip: "Say the four phases and drop <b>\"predicate pushdown + column pruning\"</b> — those are the optimizations interviewers most want to hear named."
    },
    {
      id: "fault-tolerance",
      group: "Lazy Eval, DAG, Lineage & Catalyst",
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
        "</ul>"
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
        "<p>Flow: driver asks the cluster manager for executors, ships them your code, then sends tasks to run in parallel and collects results.</p>",
      tip: "Say the chain out loud: <b>Driver → Cluster Manager → Executors → Tasks (one per partition)</b>. That single sentence shows you understand how a job actually runs."
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
        "<li>Tracks metadata and cluster state, and <b>collects results</b> back.</li>" +
        "</ul>" +
        "<p>It's a single point of coordination — if the driver dies, the whole application dies, which is why in production it runs inside the cluster (cluster mode).</p>"
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
        "<p>One worker can host several executors, and each application gets its own executors (they aren't shared across apps). Executors live for the lifetime of the app.</p>"
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
      lang: "python"
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
      lang: "python"
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
        "<p>Practically: <b>use SparkSession</b> for everything today, and if you need the RDD-level context, grab it via <code>spark.sparkContext</code>.</p>"
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
        "</ul>"
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
      lang: "bash"
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
      lang: "bash"
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
        "<p>In PySpark these map to modules like <code>pyspark.sql</code>, <code>pyspark.streaming</code> and <code>pyspark.ml</code>.</p>"
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
        "<p>Key traits: in-memory, immutable, lazily evaluated, fault-tolerant. Downside: <b>no schema and no Catalyst optimizer</b>, so it's more verbose and slower than DataFrames for structured work.</p>"
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
        "</ul>"
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
      lang: "python"
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
        "<p>You rarely name these directly; know <b>Pair RDD</b> and that shuffles create ShuffledRDDs.</p>"
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
      lang: "python"
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
        "<p>The cost of RDDs: no schema, <b>no Catalyst optimizer</b>, and more boilerplate.</p>"
    }
  ]
};
