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
    },

    // ─────────────── G4 · Transformations, Actions & RDD API ───────────────
    {
      id: "transformations-vs-actions",
      group: "Transformations, Actions & RDD API",
      q: "What is the difference between a transformation and an action?",
      difficulty: "Core",
      tags: ["transformation", "action", "lazy"],
      a:
        "<ul>" +
        "<li><b>Transformations</b> are <b>lazy</b> — they define a new RDD/DataFrame from an existing one but don't run. They just extend the DAG. Examples: <code>map</code>, <code>filter</code>, <code>flatMap</code>, <code>reduceByKey</code>, <code>join</code>.</li>" +
        "<li><b>Actions</b> <b>trigger execution</b> and return a value to the driver (or write to storage). Examples: <code>collect</code>, <code>count</code>, <code>first</code>, <code>take</code>, <code>saveAsTextFile</code>.</li>" +
        "</ul>" +
        "<p>Simple test: <b>if it returns another RDD/DataFrame it's a transformation; if it returns a concrete value or writes output, it's an action.</b> Nothing runs until an action fires.</p>"
    },
    {
      id: "narrow-vs-wide",
      group: "Transformations, Actions & RDD API",
      q: "Narrow vs wide transformations?",
      difficulty: "Core",
      tags: ["narrow", "wide", "shuffle", "stages"],
      a:
        "<ul>" +
        "<li><b>Narrow</b> — each input partition contributes to <b>exactly one</b> output partition; no data moves across the network. Examples: <code>map</code>, <code>filter</code>, <code>flatMap</code>, <code>union</code>. Fast, pipelined within a stage.</li>" +
        "<li><b>Wide</b> — output partitions depend on <b>many</b> input partitions, so Spark must <b>shuffle</b> data across executors. Examples: <code>groupByKey</code>, <code>reduceByKey</code>, <code>join</code>, <code>repartition</code>.</li>" +
        "</ul>" +
        "<p>This matters because <b>wide transformations create stage boundaries and are the expensive part</b> of a job — minimizing shuffles is most of Spark tuning.</p>"
    },
    {
      id: "spot-transformation-action",
      group: "Transformations, Actions & RDD API",
      q: "How do you tell if an operation is a transformation or an action in your code?",
      difficulty: "Common",
      tags: ["transformation", "action", "return-type"],
      a:
        "<p><b>Look at the return type.</b></p>" +
        "<ul>" +
        "<li>Returns another <b>RDD/DataFrame</b> → <b>transformation</b> (lazy). e.g. <code>df.filter(...)</code> gives a DataFrame.</li>" +
        "<li>Returns a <b>value</b> (int, list, row) or performs a <b>write</b> → <b>action</b> (eager). e.g. <code>df.count()</code> returns a number, <code>df.write...</code> produces output.</li>" +
        "</ul>" +
        "<p>Another tell: if calling it kicks off a job in the Spark UI, it was an action.</p>"
    },
    {
      id: "map-flatmap-filter",
      group: "Transformations, Actions & RDD API",
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
      lang: "python"
    },
    {
      id: "mappartitions",
      group: "Transformations, Actions & RDD API",
      q: "What is mapPartitions and when would you use it?",
      difficulty: "Common",
      tags: ["mappartitions", "performance", "initialization"],
      a:
        "<p><b><code>mapPartitions</code> is like <code>map</code>, but your function runs once per <i>partition</i> instead of once per <i>row</i></b> — it receives an iterator of the partition's rows.</p>" +
        "<p>Use it when you have <b>heavy per-call setup</b> that you don't want to repeat for every row — e.g. opening a DB connection, loading a model, or creating an API client <b>once per partition</b> and reusing it across all rows in that partition.</p>" +
        "<p><code>mapPartitionsWithIndex</code> is the same but also gives you the partition index.</p>"
    },
    {
      id: "bykey-ops",
      group: "Transformations, Actions & RDD API",
      q: "groupByKey vs reduceByKey vs aggregateByKey?",
      difficulty: "Core",
      tags: ["reducebykey", "groupbykey", "aggregatebykey", "shuffle"],
      a:
        "<p>All work on Pair RDDs, but they shuffle very differently:</p>" +
        "<ul>" +
        "<li><b>groupByKey</b> — shuffles <b>all</b> values for each key across the network, then groups. Expensive; risks OOM on hot keys.</li>" +
        "<li><b>reduceByKey</b> — combines values <b>locally first</b> (map-side combine) and only then shuffles partial results. Far less network traffic — prefer it.</li>" +
        "<li><b>aggregateByKey</b> — like reduceByKey but lets the <b>output type differ</b> from the input (e.g. build a (sum, count) tuple for an average).</li>" +
        "</ul>",
      tip: "The classic answer: <b>\"prefer reduceByKey over groupByKey\"</b> because reduceByKey combines on the map side and shuffles less. Interviewers wait for exactly that line."
    },
    {
      id: "rdd-set-ops",
      group: "Transformations, Actions & RDD API",
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
        "<p>Note: <code>union</code> keeps duplicates — chain <code>.distinct()</code> if you need a true set union.</p>"
    },
    {
      id: "rdd-joins",
      group: "Transformations, Actions & RDD API",
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
        "<p>All are wide transformations (they shuffle) unless a side is broadcast.</p>"
    },
    {
      id: "rdd-actions",
      group: "Transformations, Actions & RDD API",
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
        "</ul>"
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
        "<p><b>PySpark caveat:</b> the typed Dataset API is a <b>Scala/Java feature</b> — Python only has the DataFrame API (Python is dynamically typed), so in interviews say Datasets shine in Scala.</p>"
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
        "<p>Rule of thumb: <b>DataFrames for almost everything</b>, RDDs for low-level control, Datasets when you're in Scala and want type safety.</p>"
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
        "</ul>"
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
      lang: "python"
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
      lang: "python"
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
      lang: "python"
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
      lang: "python"
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
        "<p>Good partitioning keeps data balanced and co-locates keys, which minimizes shuffle and skew.</p>"
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
        "<p>Tuning Spark is largely about <b>reducing shuffles</b>: prefer reduceByKey over groupByKey, use broadcast joins, filter early, and partition wisely.</p>"
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
        "<li><b>persist(level)</b> — you pick the <b>storage level</b>: MEMORY_ONLY, MEMORY_AND_DISK, DISK_ONLY, and _SER (serialized) variants.</li>" +
        "<li><b>unpersist()</b> — evict it when you're done to free memory.</li>" +
        "</ul>" +
        "<p>Cache when a DataFrame is <b>reused across multiple actions</b>; caching something used once just wastes memory.</p>",
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
        "<p>In <b>PySpark</b> specifically, data crossing to Python is serialized with <b>Pickle</b> (default) or <b>Marshal</b> (faster, limited types).</p>"
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
        "<p>It helps with <b>hardware slowness</b>, but it does <b>not</b> fix data skew (both copies process the same huge partition) and it costs extra resources — so it's off by default in many setups.</p>"
    },
    {
      id: "oom",
      group: "Partitions, Shuffle & Performance",
      q: "Why do Out-Of-Memory (OOM) errors happen and how do you fix them?",
      difficulty: "Common",
      tags: ["oom", "memory", "skew", "collect"],
      a:
        "<p>OOM usually means too much data landed in one place. Common causes:</p>" +
        "<ul>" +
        "<li><b>collect()</b> pulling a large result to the driver — use <code>take</code>/<code>write</code> instead.</li>" +
        "<li><b>Data skew</b> — one huge partition on an executor (fix with salting).</li>" +
        "<li><b>groupByKey</b> / wide shuffles piling values on one key.</li>" +
        "<li><b>Under-provisioned memory</b> or too few partitions.</li>" +
        "</ul>" +
        "<p>Fixes: raise <code>--driver-memory</code>/<code>--executor-memory</code>, increase partitions, prefer reduceByKey, broadcast small tables, and avoid collect.</p>"
    },
    {
      id: "optimization-techniques",
      group: "Partitions, Shuffle & Performance",
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
        "</ul>"
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
        "<p><code>df.explain()</code> helps confirm the physical plan (join type, exchanges) matches what you expect.</p>"
    },

    // ─────────────────────────── G8 · Skew & Broadcast ───────────────────────────
    {
      id: "data-skew",
      group: "Skew & Broadcast",
      q: "What is data skew and why is it a problem?",
      difficulty: "Core",
      tags: ["skew", "partition", "performance"],
      a:
        "<p><b>Data skew is when data is unevenly distributed across partitions</b> — a few keys have far more rows than the rest, so one or two partitions become huge.</p>" +
        "<p>It's a problem because Spark's parallelism is per-partition: the whole stage waits on the one overloaded task (a <b>straggler</b>), while other executors sit idle. Severe skew also causes <b>spills and OOM</b> on the hot executor.</p>" +
        "<p>It usually shows up after a <b>shuffle</b> (join/groupBy) on a skewed key like a null, a default value, or a mega-customer.</p>"
    },
    {
      id: "salting",
      group: "Skew & Broadcast",
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
        "<p>Other options: a <b>broadcast join</b> (if one side is small) or Spark 3.x <b>AQE skew-join handling</b>, which splits skewed partitions automatically.</p>"
    },
    {
      id: "broadcast-join",
      group: "Skew & Broadcast",
      q: "What is a broadcast join and when should you use it?",
      difficulty: "Core",
      tags: ["broadcast-join", "join", "shuffle"],
      a:
        "<p><b>A broadcast (map-side) join ships a small table to every executor so the join happens locally — with no shuffle of the big table.</b></p>" +
        "<p>Use it when one side is <b>small enough to fit in memory</b> (default auto-broadcast threshold is 10 MB). It turns an expensive shuffle join into a cheap local lookup — one of the biggest wins for star-schema fact/dimension joins.</p>",
      code:
        "from pyspark.sql import functions as F\n" +
        "big.join(F.broadcast(small_dim), 'dim_id')   # no shuffle of `big`",
      lang: "python",
      tip: "Name the mechanism: broadcast join <b>avoids shuffling the large table</b> and also <b>sidesteps skew</b> on the join key. Threshold: <code>spark.sql.autoBroadcastJoinThreshold</code>."
    },
    {
      id: "broadcast-vs-accumulator",
      group: "Skew & Broadcast",
      q: "Broadcast variable vs Accumulator?",
      difficulty: "Core",
      tags: ["broadcast-variable", "accumulator", "shared-variables"],
      a:
        "<p>Two kinds of <b>shared variables</b>, opposite directions:</p>" +
        "<ul>" +
        "<li><b>Broadcast variable</b> — <b>read-only</b>, sent <b>driver → executors</b> once and cached on each node. Use it to share a large lookup/config efficiently (avoids re-shipping it per task).</li>" +
        "<li><b>Accumulator</b> — <b>write-only</b> from executors, aggregated back <b>executors → driver</b>. Use it for counters/sums (like MapReduce counters), e.g. counting bad records.</li>" +
        "</ul>",
      code:
        "b = spark.sparkContext.broadcast({'US': 1, 'IN': 2})   # read-only\n" +
        "acc = spark.sparkContext.accumulator(0)                # write-only counter",
      lang: "python"
    },
    {
      id: "shared-variables",
      group: "Skew & Broadcast",
      q: "What are shared variables in Spark?",
      difficulty: "Common",
      tags: ["shared-variables", "broadcast", "accumulator"],
      a:
        "<p>Normally each task gets its <i>own copy</i> of the variables it uses, and updates don't propagate back. <b>Shared variables solve the two cases where you need something cluster-wide:</b></p>" +
        "<ul>" +
        "<li><b>Broadcast variables</b> — efficiently give every node a <b>read-only</b> copy of a large value (e.g. a lookup table).</li>" +
        "<li><b>Accumulators</b> — safely <b>aggregate</b> values (sums, counts) from all tasks back to the driver.</li>" +
        "</ul>" +
        "<p>They exist precisely because ordinary closures can't share state across executors.</p>"
    }
  ]
};
