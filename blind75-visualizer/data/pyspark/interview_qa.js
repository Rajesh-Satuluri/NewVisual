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
    }
  ]
};
