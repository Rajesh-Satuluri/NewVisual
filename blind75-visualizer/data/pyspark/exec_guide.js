/*
 * data/pyspark/exec_guide.js — "Spark Execution — The Complete Journey".
 * A template-free, TEXT-ONLY long-form guide. Each chapter is a LEARN topic
 * carrying a `blocks` array (no card schema, no diagrams). Rendered by
 * js/execguide.js. Chapters 1-5 (iterations 1-3).
 */
window.LEARN.register("spark", "Spark Execution Guide", [

  /* ===================================================== CHAPTER 1 */
  {
    id: "exec-big-picture",
    title: "The Big Picture",
    tagline: "Before any detail: who are the players in a Spark job, and what actually happens when you press run?",
    estMinutes: 9,
    blocks: [
      { type: "prose", html: "Most people learn Spark as a bag of functions — <code>groupBy</code>, <code>join</code>, <code>withColumn</code> — without ever seeing the machine underneath. This guide fixes that. By the end you'll be able to answer the classic interview opener — <i>\"walk me through what happens when you run a Spark job\"</i> — start to finish, and you'll understand <i>why</i> Spark behaves the way it does when things get slow or crash." },
      { type: "prose", html: "This first chapter is the map. Every later chapter zooms into one part of it. Read this one slowly; the rest will click into place." },

      { type: "heading", level: 2, text: "The one-sentence story", id: "one-sentence" },
      { type: "prose", html: "<b>You submit a program; one coordinator process (the driver) turns your code into a plan; a cluster manager hands it a set of worker processes (executors); the work is chopped into small tasks that run in parallel on those workers; results are written out or returned.</b> That's it. Everything else is detail on those five moves." },
      { type: "analogy", kind: "analogy", html: "Think of a large restaurant kitchen. You (the customer) place an order. The <b>head chef</b> reads the whole order and plans the sequence of steps. The <b>line cooks</b> do the actual cooking, many dishes at once. A <b>kitchen manager</b> decides how many cooks you get and at which stations. Spark is that kitchen: the head chef is the <b>driver</b>, the cooks are <b>executors</b>, the manager is the <b>cluster manager</b>, and each small cooking step is a <b>task</b>." },

      { type: "heading", level: 2, text: "The cast of characters", id: "cast" },
      { type: "prose", html: "Five things do all the work in Spark. Learn these names now — the whole guide is about how they interact." },
      { type: "prose", html: "<b>1. The Driver.</b> A single JVM process that runs your <code>main()</code> program. It holds the <code>SparkSession</code>, turns your transformations into a plan, breaks that plan into units of work, and hands those units to the workers. It is the brain and the coordinator. If the driver dies, the whole job dies." },
      { type: "prose", html: "<b>2. The Cluster Manager.</b> The service that owns the cluster's machines and rents out slices of them (CPU + memory) called <b>containers</b>. It's YARN in most Hadoop shops, Kubernetes in cloud-native ones, or Spark's own standalone manager. The driver asks it \"give me N workers of this size\" and it grants containers." },
      { type: "prose", html: "<b>3. Executors.</b> JVM processes launched inside those containers, one or more per worker machine. Each executor has a fixed number of <b>CPU cores</b> (how many tasks it can run at once) and a fixed chunk of <b>memory</b>. Executors do the real computation and hold data in memory. They live for the whole application and are reused across many tasks." },
      { type: "prose", html: "<b>4. Partitions.</b> Your data is never one blob — it's split into many chunks called partitions (typically ~128 MB each). Partitions are the reason Spark can be parallel at all: different executors work on different partitions simultaneously." },
      { type: "prose", html: "<b>5. Tasks.</b> The atom of execution: one task does one stage's work on one partition. If your data has 200 partitions, that step runs as 200 tasks. Tasks are what the driver schedules onto executor cores." },
      { type: "keynumbers", items: [
        { num: "1", label: "driver per application" },
        { num: "N", label: "executors (you choose)" },
        { num: "~128 MB", label: "typical partition size" },
        { num: "1 task", label: "= 1 partition × 1 stage" }
      ] },

      { type: "heading", level: 2, text: "What happens when you press run", id: "what-happens" },
      { type: "prose", html: "Here is the whole journey at a glance. Each step is a full chapter later; for now just feel the shape of it." },
      { type: "steps", items: [
        "<b>Submit.</b> You run <code>spark-submit your_app.py</code>. It contacts the cluster manager and asks for resources.",
        "<b>Driver starts.</b> The driver process launches and creates the <code>SparkSession</code> — your handle to the whole cluster.",
        "<b>Build a plan (lazily).</b> As your code calls <code>read</code>, <code>filter</code>, <code>join</code>, etc., Spark does <i>not</i> run them. It just records them as a plan (a recipe). Nothing has computed yet.",
        "<b>An action triggers a job.</b> The moment you call something that needs a real answer — <code>count()</code>, <code>show()</code>, <code>write()</code> — Spark submits a <b>job</b> to actually run the recipe.",
        "<b>Optimize + split.</b> Spark's optimizer (Catalyst) rewrites the plan for speed, then splits the job into <b>stages</b> at every point data must be reshuffled across the network.",
        "<b>Run tasks.</b> Each stage becomes many <b>tasks</b> (one per partition) that the driver schedules onto executor cores. Executors crunch their partitions in parallel.",
        "<b>Shuffle between stages.</b> Where one stage needs data grouped differently than the last (e.g. a <code>groupBy</code>), executors exchange data over the network — the shuffle — and the next stage begins.",
        "<b>Return or write results.</b> The final stage writes output to storage, or sends a small result back to the driver. Then executors are released."
      ] },

      { type: "heading", level: 2, text: "Two ideas that explain almost everything", id: "two-ideas" },
      { type: "prose", html: "If you remember only two things from this guide, make it these — they explain most of Spark's surprises." },
      { type: "prose", html: "<b>Idea 1: Laziness.</b> Spark separates <i>describing</i> work from <i>doing</i> it. Transformations only build the plan; an <b>action</b> is what forces execution. This is why you can chain twenty operations cheaply — the cost lands all at once, when you ask for an answer. It's also why beginners are confused that \"nothing happened\" until a <code>show()</code>." },
      { type: "prose", html: "<b>Idea 2: The shuffle is the expensive thing.</b> Operations that keep each partition to itself (<code>filter</code>, <code>select</code>) are cheap and parallel. Operations that must bring related rows together across the cluster (<code>groupBy</code>, <code>join</code>, <code>distinct</code>, <code>orderBy</code>) force a <b>shuffle</b> — writing data to disk and moving it over the network. Almost every performance problem traces back to a shuffle." },
      { type: "why", kind: "why", html: "Nearly every tuning decision and interview answer comes back to these two: <i>when</i> does my code actually run (an action), and <i>how many shuffles</i> does it cause. Keep them in mind as you read on." },

      { type: "heading", level: 2, text: "Where the data lives", id: "where-data" },
      { type: "prose", html: "One more piece of the map: the data itself usually lives <i>outside</i> the executors — in cloud object storage (S3, ADLS, GCS) or HDFS. Executors <b>read</b> partitions in, compute, and <b>write</b> results back out. In modern setups, storage and compute are separate services: you spin up a cluster, it reads from S3, does the work, writes back to S3, and shuts down. The cluster is temporary; the data is permanent." },

      { type: "heading", level: 2, text: "Check yourself", id: "check" },
      { type: "qa", q: "What triggers Spark to actually run your code?", a: "An <b>action</b> (like <code>count</code>, <code>show</code>, <code>collect</code>, <code>write</code>). Transformations before it only build a plan — they compute nothing." },
      { type: "qa", q: "What is a task, in one line?", a: "One stage's work on one partition. Task count for a step = the number of partitions." },
      { type: "qa", q: "Which is the coordinator and which does the work — driver or executors?", a: "The <b>driver</b> coordinates (plans, schedules); the <b>executors</b> do the actual computation on partitions." },
      { type: "prose", html: "That's the whole machine in outline. Next we follow the very first step — what <code>spark-submit</code> does and how the cluster manager hands you a cluster." }
    ]
  },

  /* ===================================================== CHAPTER 2 */
  {
    id: "exec-submission",
    title: "Submission & the Cluster Manager",
    tagline: "How spark-submit turns your script into a running application with real machines behind it.",
    estMinutes: 10,
    blocks: [
      { type: "prose", html: "Every Spark job begins the same way: a submission. Understanding this step demystifies a lot of \"it works on my laptop but not on the cluster\" confusion, and it's where the client-vs-cluster interview question lives." },

      { type: "heading", level: 2, text: "spark-submit: the front door", id: "spark-submit" },
      { type: "prose", html: "You launch a Spark application with the <code>spark-submit</code> command from a machine that can reach the cluster — usually a <b>gateway</b> or <b>edge node</b>. You tell it three things: which cluster manager to use, how the driver should be deployed, and how many resources you want." },
      { type: "code", code: "spark-submit \\\n  --master yarn \\            # which cluster manager\n  --deploy-mode cluster \\    # where the driver runs\n  --num-executors 10 \\       # how many worker processes\n  --executor-cores 5 \\       # cores per worker\n  --executor-memory 19g \\    # memory per worker\n  your_app.py" },
      { type: "prose", html: "<code>--master</code> names the cluster manager (<code>yarn</code>, <code>k8s://...</code>, <code>spark://host:port</code> for standalone, or <code>local[*]</code> to run everything on one machine for testing). The resource flags are a request, not a guarantee — the cluster manager grants what it can." },

      { type: "heading", level: 2, text: "The cluster manager's job", id: "cluster-manager" },
      { type: "prose", html: "A cluster is a pool of machines, each with cores and memory. The <b>cluster manager</b> is the landlord: it tracks what's free and rents out slices called <b>containers</b>. Spark itself doesn't own the machines — it asks the manager for containers and runs its driver and executors inside them." },
      { type: "prose", html: "With <b>YARN</b> (the most common in Hadoop shops) the parts are:" },
      { type: "prose", html: "<b>ResourceManager (RM)</b> — the cluster-wide brain that decides who gets containers. <b>NodeManager (NM)</b> — one per worker machine; it launches and babysits the containers on that machine. <b>ApplicationMaster (AM)</b> — a per-application helper that negotiates with the RM for containers on your job's behalf." },
      { type: "analogy", kind: "analogy", html: "YARN is an office building. The <b>ResourceManager</b> is the building manager who assigns rooms. Each floor has a <b>NodeManager</b> (a floor supervisor) who unlocks and monitors the rooms on that floor. Your project gets an <b>ApplicationMaster</b> — a coordinator who phones the building manager to request more rooms as your team grows." },

      { type: "heading", level: 2, text: "The handshake, step by step", id: "handshake" },
      { type: "steps", items: [
        "<code>spark-submit</code> registers a new application with the ResourceManager.",
        "The RM allocates the <b>first</b> container and starts the ApplicationMaster in it.",
        "The AM asks the RM for executor containers (based on your <code>--num-executors</code> etc.).",
        "The RM grants containers; the relevant NodeManagers launch <b>executor</b> JVMs inside them.",
        "Each executor <b>registers back with the driver</b>, saying \"I'm alive, send me tasks.\"",
        "Now the driver has workers and can start scheduling tasks."
      ] },
      { type: "prose", html: "This is why a job sometimes sits for a few seconds doing \"nothing\" at the start — it's waiting for the cluster manager to grant containers and for executors to register." },

      { type: "heading", level: 2, text: "Client vs cluster mode", id: "client-vs-cluster" },
      { type: "prose", html: "The one knob that trips people up is <code>--deploy-mode</code>. It decides <b>where the driver runs</b> — and everything else follows from that." },
      { type: "prose", html: "<b>Client mode:</b> the driver runs in your <code>spark-submit</code> process on the gateway node, <i>outside</i> the cluster. Its logs stream to your terminal and you can interact with it. But if that process (or your laptop/SSH session) dies, the driver dies and the job fails. Use it for interactive work — <code>spark-shell</code>, notebooks, quick debugging." },
      { type: "prose", html: "<b>Cluster mode:</b> the driver runs <i>inside</i> the cluster, in a container alongside the ApplicationMaster. You can disconnect and the job keeps running; its logs go to the cluster's log system. Use it for production and scheduled jobs (Airflow, cron)." },
      { type: "trap", kind: "trap", html: "A very common production bug: running a long nightly batch in <b>client</b> mode from a gateway session. The session drops overnight, the driver dies, the job fails \"randomly.\" The fix is one flag: <code>--deploy-mode cluster</code>, so the driver lives in the cluster, not in your session." },
      { type: "interview", kind: "interview", html: "If asked \"client vs cluster mode?\", answer in one sentence: <i>\"It decides where the driver runs — client keeps it on the gateway (good for interactive, dies with your session); cluster puts it inside the cluster (good for production, survives disconnects).\"</i>" },

      { type: "heading", level: 2, text: "Check yourself", id: "check" },
      { type: "qa", q: "What does the cluster manager actually give Spark?", a: "Containers — bounded slices of (cores, memory) on worker machines — inside which the driver (cluster mode) and executors run." },
      { type: "qa", q: "In YARN, what are the RM, NM, and AM?", a: "ResourceManager grants containers cluster-wide; NodeManager launches/monitors containers on one machine; ApplicationMaster negotiates containers for your specific app." },
      { type: "qa", q: "Why might a job pause at the very start?", a: "It's waiting for the cluster manager to grant containers and for executors to register back with the driver." }
    ]
  },

  /* ===================================================== CHAPTER 3 */
  {
    id: "exec-driver",
    title: "The Driver",
    tagline: "The single process that plans, coordinates, and schedules everything — and why it's the one you can't lose.",
    estMinutes: 9,
    blocks: [
      { type: "prose", html: "The driver is the most important process in a Spark application and the least understood. It never touches most of your data — yet nothing happens without it. This chapter is about what it actually does." },

      { type: "heading", level: 2, text: "What the driver is", id: "what" },
      { type: "prose", html: "The driver is a single JVM process running your program's <code>main()</code>. When your code does <code>SparkSession.builder.getOrCreate()</code>, you're creating the driver's control object — the <code>SparkSession</code> (which wraps the older <code>SparkContext</code>). Every DataFrame you build, every plan, every scheduling decision lives here." },
      { type: "analogy", kind: "analogy", html: "The driver is an orchestra conductor. The conductor plays no instrument (touches little data), but reads the whole score, sets the tempo, and cues each section. Take the conductor away and a hundred skilled musicians fall into chaos. That's why losing the driver kills the job even though the executors are fine." },

      { type: "heading", level: 2, text: "What the driver does", id: "does" },
      { type: "prose", html: "The driver has four core responsibilities:" },
      { type: "prose", html: "<b>1. Builds the plan.</b> As you call transformations, the driver accumulates a logical plan (the recipe). Nothing runs yet." },
      { type: "prose", html: "<b>2. Optimizes and schedules.</b> When an action fires, the driver runs the Catalyst optimizer, splits the resulting plan into stages, and turns each stage into a set of tasks." },
      { type: "prose", html: "<b>3. Hands out tasks and tracks them.</b> The driver's schedulers assign tasks to executor cores, watch for completion, and re-send tasks that fail. It knows which executor holds which data and tries to send work to where the data already is (locality)." },
      { type: "prose", html: "<b>4. Collects results.</b> When you call <code>collect()</code> or <code>show()</code>, the driver gathers the returned rows into its own memory. This is where the danger is." },

      { type: "heading", level: 2, text: "The driver has memory too — and it can run out", id: "memory" },
      { type: "prose", html: "Because results come back to the driver, the driver has its own heap (<code>--driver-memory</code>). Small results are fine. But <code>collect()</code> or <code>toPandas()</code> on a huge DataFrame pulls <i>every</i> row into the driver's single JVM, which cannot spill to disk — so it crashes with an OutOfMemoryError on the driver, no matter how much executor memory you have." },
      { type: "code", code: "rows = huge_df.collect()     # BAD: all rows -> driver heap -> OOM\n\nhuge_df.write.parquet('/out')  # GOOD: stays distributed on executors\nsample = huge_df.take(20)      # GOOD: only a few rows to the driver" },
      { type: "trap", kind: "trap", html: "The most common driver crash is <code>collect()</code> (or <code>toPandas()</code>) on a large result. \"Add more executor memory\" won't help — the problem is the driver. Keep results distributed (<code>write</code>) or pull only a small sample (<code>take(n)</code>)." },

      { type: "heading", level: 2, text: "The driver is a single point of failure", id: "spof" },
      { type: "prose", html: "There is exactly one driver per application, and it holds all the coordination state. If it dies, the job cannot continue — the executors are just workers with no one directing them. (In cluster mode, YARN can retry the whole application; in client mode, a dropped session simply ends everything.) This is also why the driver's placement — client vs cluster mode from the last chapter — matters so much." },
      { type: "interview", kind: "interview", html: "A crisp summary to give: <i>\"The driver runs my main program and the SparkSession. It builds the plan, optimizes it, splits it into stages and tasks, schedules those onto executors, and collects results. It touches little data itself — but it's a single point of failure and it OOMs if I collect() a large result.\"</i>" },

      { type: "heading", level: 2, text: "Check yourself", id: "check" },
      { type: "qa", q: "The driver barely touches data — so why is it critical?", a: "It's the coordinator: it plans, schedules, tracks, and retries all the work. Without it, executors have no direction and the job dies." },
      { type: "qa", q: "Why does collect() on a big DataFrame crash the driver, not an executor?", a: "collect() moves every result row into the single driver JVM heap, which can't spill. Large results exhaust it — regardless of executor memory." },
      { type: "qa", q: "How do you get results out safely for large data?", a: "Write them out distributed (<code>df.write...</code>) or sample a few rows with <code>take(n)</code>/<code>show(n)</code>. Reserve <code>collect()</code> for genuinely small results." }
    ]
  },

  /* ===================================================== CHAPTER 4 */
  {
    id: "exec-lazy-lineage",
    title: "Lazy Evaluation & Lineage",
    tagline: "Why Spark does nothing when you write transformations — and how it remembers what to do.",
    estMinutes: 10,
    blocks: [
      { type: "prose", html: "This is the idea that confuses every Spark beginner and delights every optimizer: Spark is <b>lazy</b>. When you write a transformation, it doesn't run. It just writes down what you asked for. Understanding this explains half of Spark's behavior." },

      { type: "heading", level: 2, text: "Transformations only build a recipe", id: "recipe" },
      { type: "prose", html: "A DataFrame is not a table of data sitting in memory. It's a <b>description of how to compute</b> a table — a recipe. Every transformation you call returns a <i>new</i> recipe with one more step added; it computes nothing." },
      { type: "code", code: "df2 = (df.filter(F.col('amount') > 0)          # nothing runs\n         .withColumn('tax', F.col('amount') * 0.1)  # nothing runs\n         .select('country', 'amount', 'tax'))       # nothing runs\n\n# df2 is just a plan. No data has been read or computed yet." },
      { type: "analogy", kind: "analogy", html: "Writing transformations is like writing a shopping-and-cooking list. Listing \"buy tomatoes, chop them, simmer\" costs nothing and cooks no meal. Only when a guest actually asks to eat (an action) do you go shopping and start cooking — and having the whole list up front lets you plan the most efficient trip." },

      { type: "heading", level: 2, text: "Why laziness is a feature, not a quirk", id: "why-lazy" },
      { type: "prose", html: "Because Spark sees your <i>entire</i> pipeline before running anything, it can optimize across all of it: push a filter down so rows are dropped as they're read, prune columns you never use, reorder steps, and combine operations. An eager engine that ran each line immediately could never do this — it would already have read the data before learning you only needed two columns." },
      { type: "why", kind: "why", html: "Laziness is what makes Spark fast on big pipelines. It trades \"run each step now\" for \"see everything, then run the optimized whole.\" The cost is that beginners think their code did nothing — until an action reveals it all at once (including any error)." },

      { type: "heading", level: 2, text: "Lineage: the recipe is also a safety net", id: "lineage" },
      { type: "prose", html: "The chain of transformations Spark records is called the <b>lineage</b> (or the logical plan / DAG of dependencies). It's not just an optimization tool — it's how Spark achieves fault tolerance <i>without</i> copying data everywhere." },
      { type: "prose", html: "If an executor dies and a partition of data is lost, Spark doesn't need a backup copy. It looks at the lineage, sees exactly how that partition was produced from its parent data, and <b>recomputes just that partition</b>. The \"R\" in RDD stands for <b>Resilient</b> for this reason: resilience through re-computation from lineage, not replication." },
      { type: "analogy", kind: "analogy", html: "Lineage is like keeping the recipe rather than freezing a spare dish. If one plate is dropped, you don't need a duplicate in the freezer — you just re-cook that one plate from the written steps." },

      { type: "heading", level: 2, text: "Immutability: the rule that makes it safe", id: "immutability" },
      { type: "prose", html: "DataFrames are <b>immutable</b> — a transformation never changes the original, it returns a new one. This is what lets Spark build and reorder a plan safely, and it's why this is a classic bug:" },
      { type: "code", code: "df.withColumn('tax', F.col('amount') * 0.1)   # result thrown away!\ndf.select('tax')   # error: 'tax' doesn't exist on df\n\ndf = df.withColumn('tax', F.col('amount') * 0.1)  # reassign -> works" },
      { type: "trap", kind: "trap", html: "Forgetting to reassign the result of a transformation is a top beginner bug. <code>withColumn</code>, <code>filter</code>, <code>drop</code> all return a <i>new</i> DataFrame and leave the original untouched. There is no in-place mutation in Spark." },

      { type: "heading", level: 2, text: "You can see the recipe", id: "see" },
      { type: "prose", html: "You never have to guess what Spark will do — <code>df.explain()</code> prints the plan without running it. That's the ground truth for everything in this guide, and we devote a whole later chapter to reading it." },

      { type: "heading", level: 2, text: "Check yourself", id: "check" },
      { type: "qa", q: "What does a transformation actually do?", a: "It adds a step to the plan and returns a new DataFrame. It computes nothing until an action forces execution." },
      { type: "qa", q: "How does Spark recover a lost partition without a backup copy?", a: "It uses the lineage — the recorded steps that produced that partition — to recompute just that partition from its parents." },
      { type: "qa", q: "Why must you reassign df = df.filter(...)?", a: "DataFrames are immutable; the transformation returns a new one and leaves the original unchanged. Not reassigning throws the result away." }
    ]
  },

  /* ===================================================== CHAPTER 5 */
  {
    id: "exec-actions-vs-transformations",
    title: "Actions vs Transformations",
    tagline: "The single distinction that decides when your code runs — and how many times.",
    estMinutes: 9,
    blocks: [
      { type: "prose", html: "Now we make laziness precise. Spark operations come in exactly two kinds, and knowing which is which tells you exactly when work happens." },

      { type: "heading", level: 2, text: "The two kinds of operations", id: "two-kinds" },
      { type: "prose", html: "<b>Transformations</b> describe a new dataset from an existing one and are <b>lazy</b> — they only extend the plan. Examples: <code>select</code>, <code>filter</code>, <code>withColumn</code>, <code>groupBy</code>, <code>join</code>, <code>distinct</code>, <code>orderBy</code>, <code>repartition</code>." },
      { type: "prose", html: "<b>Actions</b> ask for an actual result and are <b>eager</b> — each one triggers a real job that runs the accumulated plan. Examples: <code>count</code>, <code>collect</code>, <code>show</code>, <code>take</code>, <code>write</code>, <code>foreach</code>, <code>toPandas</code>." },
      { type: "prose", html: "The rule: <b>one action = one job.</b> Transformations are free until an action cashes them in." },
      { type: "table", headers: ["Transformations (lazy)", "Actions (eager — trigger a job)"], rows: [
        ["select, filter, withColumn", "count, collect, take"],
        ["groupBy, agg, join", "show, first, head"],
        ["distinct, dropDuplicates", "write / save"],
        ["orderBy, repartition, coalesce", "foreach, toPandas"]
      ] },
      { type: "prose", html: "A quick tell: if the return type is another DataFrame, it's a transformation (lazy). If it returns a number, a list of rows, or writes files, it's an action (it ran)." },

      { type: "heading", level: 2, text: "Why this matters: accidental re-computation", id: "recompute" },
      { type: "prose", html: "Because each action re-runs the plan from the start, calling several actions on the same DataFrame re-reads and re-computes the source data every time. This is one of the most common causes of a slow job." },
      { type: "code", code: "df = spark.read.parquet('/big').filter(F.col('ok'))\n\nprint(df.count())   # job 1: reads + filters ALL of /big\nprint(df.count())   # job 2: reads + filters ALL of /big AGAIN\ndf.show(5)          # job 3: reads + filters yet again" },
      { type: "trap", kind: "trap", html: "A loop that calls an action each iteration (e.g. <code>count()</code> per category) re-scans the source every time — turning one read into dozens. Prefer a single set-based pass (one <code>groupBy</code>), or <b>cache</b> the DataFrame if you genuinely must reuse it across actions." },

      { type: "heading", level: 2, text: "Caching: pay once, reuse many times", id: "cache" },
      { type: "prose", html: "If you will run several actions on the same DataFrame, <code>cache()</code> (or <code>persist()</code>) tells Spark to keep the computed result in executor memory after the first action, so later actions skip the re-computation." },
      { type: "prose", html: "But caching is itself <b>lazy</b>: <code>cache()</code> marks the DataFrame; the <i>first action</i> computes it and fills the cache; <i>later actions</i> read from cache. So caching only pays off with two or more actions — caching something used once is pure waste." },
      { type: "code", code: "df = spark.read.parquet('/big').filter(F.col('ok'))\ndf.cache()          # marks for caching (nothing computed yet)\ndf.count()          # action 1: computes AND fills the cache\ndf.count()          # action 2: served from cache (fast)\ndf.unpersist()      # free the memory when done" },
      { type: "why", kind: "why", html: "The whole point of knowing actions from transformations is control over <i>when</i> and <i>how often</i> work happens. Fewer, well-placed actions — plus caching when you truly reuse — is often the biggest, cheapest speedup in a pipeline." },

      { type: "heading", level: 2, text: "Check yourself", id: "check" },
      { type: "qa", q: "How many jobs does one action create?", a: "Exactly one. One action = one job. (A few operations trigger small extra internal jobs, but the rule holds.)" },
      { type: "qa", q: "Why can calling count() twice be slow?", a: "Each action re-runs the whole plan from the source, so the data is read and filtered again every time. Cache the DataFrame if you reuse it across actions." },
      { type: "qa", q: "When does cache() actually store anything?", a: "On the first action after cache() — it's lazy. Later actions then read from the cache. Caching for a single action gains nothing." },
      { type: "prose", html: "You now understand <i>when</i> Spark runs. Next: <i>how</i> it makes that run fast — the Catalyst optimizer that rewrites your plan before a single task starts." }
    ]
  },

  /* ===================================================== CHAPTER 6 */
  {
    id: "exec-catalyst",
    title: "Catalyst & Tungsten",
    tagline: "How Spark rewrites the code you wrote into a faster plan you didn't — before any task runs.",
    estMinutes: 11,
    blocks: [
      { type: "prose", html: "When an action fires, Spark doesn't run your DataFrame code line by line. It first hands your plan to <b>Catalyst</b>, its query optimizer, which rewrites it into an equivalent but faster plan. Then <b>Tungsten</b> generates tight low-level code to execute it. This is why you rarely need to hand-optimize DataFrame code — and why one thing (a Python UDF) can quietly switch the optimizer off." },

      { type: "heading", level: 2, text: "You describe what; Catalyst decides how", id: "what-vs-how" },
      { type: "prose", html: "Your transformations say <i>what</i> result you want. Catalyst decides <i>how</i> to get it efficiently. Because Spark is lazy, Catalyst sees your <b>entire</b> pipeline at once and can rearrange it — something impossible if each line ran immediately." },
      { type: "analogy", kind: "analogy", html: "Catalyst is a travel agent. You say \"I want to visit these five cities.\" You don't specify the route. The agent reorders the stops, picks the cheapest flights, and drops legs you didn't actually need — delivering the same trip for far less. You stated the destinations (the what); the agent planned the route (the how)." },

      { type: "heading", level: 2, text: "The four stages of Catalyst", id: "four-stages" },
      { type: "prose", html: "Catalyst turns your code into runnable work in four steps. <code>df.explain(True)</code> prints all of them." },
      { type: "steps", items: [
        "<b>Parsed logical plan.</b> Your DataFrame/SQL is turned into a tree of operations — syntactically valid, but not yet checked against real tables/columns.",
        "<b>Analyzed logical plan.</b> Spark resolves column and table names against the catalog, checks types, and confirms everything exists. (This is where a typo'd column raises AnalysisException.)",
        "<b>Optimized logical plan.</b> The rule-based optimizer rewrites the tree: push filters down, prune unused columns, fold constants, simplify expressions, reorder joins. This is the big win.",
        "<b>Physical plan.</b> Spark turns the optimized logical plan into concrete operators (which join algorithm, where the shuffles go), estimates cost, and picks the plan to actually run."
      ] },

      { type: "heading", level: 2, text: "The two optimizations to know by name", id: "two-opts" },
      { type: "prose", html: "Two rewrites do most of the work and come up constantly in interviews:" },
      { type: "prose", html: "<b>Predicate pushdown.</b> A filter written at the end of your pipeline is moved <i>down</i> to the data source, so rows are discarded as they're read — often before they ever leave storage. Reading less data is the cheapest speedup there is." },
      { type: "prose", html: "<b>Column pruning.</b> If you only <code>select</code> two of thirty columns, Catalyst reads only those two from the file (in a columnar format like Parquet). The other 28 columns are never loaded." },
      { type: "code", code: "# You wrote the filter last, after the join:\n(orders.join(customers, 'customer_id')\n        .select('region', 'amount', 'name')\n        .filter(F.col('amount') > 100))\n\n# Catalyst runs it as:  read only needed columns  ->  filter amount>100 at\n# the orders scan  ->  join far fewer, thinner rows  ->  select.\n# Same answer, a fraction of the work." },
      { type: "why", kind: "why", html: "You don't reorder your code for speed — Catalyst does. What you control is whether your code is <i>optimizable</i>. Filters and derivations built from built-in functions are transparent to Catalyst; it can move and prune around them. That's the practical takeaway of this whole chapter." },

      { type: "heading", level: 2, text: "Tungsten: turning the plan into fast code", id: "tungsten" },
      { type: "prose", html: "Once Catalyst picks a physical plan, <b>Tungsten</b> makes it run fast on the CPU. Its two big moves: <b>whole-stage code generation</b> — Spark generates a single compact Java function for a whole chain of operators instead of interpreting each row through many function calls; and a <b>compact binary memory format</b> that avoids the overhead of Java objects and eases garbage collection. In <code>explain()</code> you'll see operators marked with a <code>*</code> or grouped in a <code>WholeStageCodegen</code> box — those were fused into generated code." },

      { type: "heading", level: 2, text: "The one thing that turns Catalyst off: Python UDFs", id: "udf-wall" },
      { type: "prose", html: "Catalyst can only optimize what it understands. A plain <b>Python UDF</b> is an opaque black box — Catalyst can't see inside it, so it won't push a filter past it and won't prune columns around it. Worse, each row is serialized from the JVM executor to a separate Python process and back. The result: a full scan and row-by-row overhead exactly where you wanted a fast, pushed-down filter." },
      { type: "trap", kind: "trap", html: "Filtering or deriving with a Python UDF silently disables pushdown and column pruning — in <code>explain()</code> you'll see a <code>BatchEvalPython</code> node and a scan with no <code>PushedFilters</code>. Prefer built-in <code>F.*</code> functions; if you truly need custom logic, a vectorized <code>pandas_udf</code> is far faster (though still not pushdown-friendly)." },
      { type: "interview", kind: "interview", html: "Strong one-liner: <i>\"Catalyst is Spark's optimizer — parse, analyze, optimize (pushdown + pruning), physical plan — and Tungsten codegens it. SQL and the DataFrame API compile to the same plan, so they're equally fast; the thing that breaks it is a Python UDF, which is opaque to Catalyst.\"</i>" },

      { type: "heading", level: 2, text: "Check yourself", id: "check" },
      { type: "qa", q: "What are Catalyst's four stages?", a: "Parsed logical plan → analyzed logical plan (names/types resolved) → optimized logical plan (pushdown, pruning, etc.) → physical plan (concrete operators + chosen join strategies)." },
      { type: "qa", q: "What do predicate pushdown and column pruning do?", a: "Pushdown moves filters to the data source so rows are dropped as they're read; pruning reads only the columns you actually use. Both mean reading far less data." },
      { type: "qa", q: "Why is a Python UDF bad for the optimizer?", a: "It's opaque — Catalyst can't push filters through it or prune around it, and each row is serialized to a Python worker. Prefer built-in F.* functions." }
    ]
  },

  /* ===================================================== CHAPTER 7 */
  {
    id: "exec-jobs-stages-tasks",
    title: "Jobs, Stages & Tasks",
    tagline: "How one action becomes a tree of work — and the vocabulary the Spark UI speaks.",
    estMinutes: 10,
    blocks: [
      { type: "prose", html: "When an action fires and Catalyst has produced a physical plan, Spark breaks the work into a three-level hierarchy: <b>job → stages → tasks</b>. This is the exact language of the Spark UI, and mapping your code to it turns \"my job is slow\" into \"stage 3 is the problem.\"" },

      { type: "heading", level: 2, text: "Job: one per action", id: "job" },
      { type: "prose", html: "A <b>job</b> is the unit triggered by a single action. Call <code>count()</code> — one job. Call <code>write()</code> — one job. All the lazy transformations leading up to it are packaged into that job. So the number of jobs roughly equals the number of actions you call." },

      { type: "heading", level: 2, text: "Stage: split at every shuffle", id: "stage" },
      { type: "prose", html: "A job is divided into <b>stages</b>, and the dividing line is always a <b>shuffle</b>. A run of operations that each partition can do on its own — <code>filter</code>, <code>select</code>, <code>withColumn</code> — is fused into one stage. The moment an operation needs data moved across the cluster (<code>groupBy</code>, <code>join</code>, <code>distinct</code>, <code>orderBy</code>, <code>repartition</code>), the current stage ends and a new one begins." },
      { type: "prose", html: "The simplest way to count stages: <b>count the shuffles and add one.</b> Two shuffles → three stages." },
      { type: "analogy", kind: "analogy", html: "A stage is a leg of a relay race. Within a leg, a runner sprints without interruption (narrow operations, no data movement). The baton handoff between legs — where everyone must regroup — is the shuffle. Each handoff starts a new leg." },

      { type: "heading", level: 2, text: "Task: one stage on one partition", id: "task" },
      { type: "prose", html: "A <b>task</b> is the smallest unit of execution: one stage's computation applied to <b>one partition</b>. If a stage's data has 200 partitions, that stage runs as 200 tasks. Tasks are what the driver actually schedules onto executor cores — this is where the parallelism happens." },
      { type: "prose", html: "Tasks in a stage run in parallel up to your total number of executor cores. If there are more tasks than cores, they run in <b>waves</b>: with 200 tasks and 40 cores, that's five waves of 40." },
      { type: "keynumbers", items: [
        { num: "1 action", label: "= 1 job" },
        { num: "shuffles + 1", label: "= number of stages" },
        { num: "1 partition", label: "= 1 task" },
        { num: "waves", label: "= tasks ÷ total cores" }
      ] },

      { type: "heading", level: 2, text: "A worked example", id: "example" },
      { type: "code", code: "df = (spark.read.parquet('/sales')       # stage 1 begins (read + narrow)\n        .filter(F.col('amount') > 0)      # narrow -> same stage\n        .withColumn('tax', F.col('amount')*0.1)  # narrow -> same stage\n        .groupBy('country').agg(F.sum('amount'))  # SHUFFLE -> stage 2\n        .orderBy('sum(amount)'))          # SHUFFLE -> stage 3\ndf.write.parquet('/out')                  # ACTION -> 1 job, 3 stages" },
      { type: "prose", html: "One action → one job. Two shuffles (the <code>groupBy</code> and the <code>orderBy</code>) → three stages. Stage 1 runs one task per input file split; stages 2 and 3 run one task per shuffle partition (200 by default). That's the whole tree." },

      { type: "heading", level: 2, text: "Reading the tree to diagnose problems", id: "diagnose" },
      { type: "prose", html: "Once you can map code to jobs/stages/tasks, the Spark UI becomes a diagnosis instead of noise:" },
      { type: "table", headers: ["Symptom in the UI", "What it usually means"], rows: [
        ["Far more jobs than you expected", "More actions than you think — e.g. an action inside a loop; cache or restructure"],
        ["One stage dominates the runtime", "Look at the shuffle that starts it — that's where the cost is"],
        ["199 tasks finish fast, 1 runs forever", "Data skew — one partition holds most of a key's rows"],
        ["Fewer tasks than cores", "Under-parallelized (too few partitions); cores sit idle"]
      ] },
      { type: "interview", kind: "interview", html: "If asked \"how does Spark decide stages?\" — <i>\"It cuts a new stage at every shuffle. Narrow operations fuse into one stage; each wide operation starts another. Stages = shuffles + 1, and each stage runs one task per partition.\"</i>" },

      { type: "heading", level: 2, text: "Check yourself", id: "check" },
      { type: "qa", q: "How many jobs does one action create?", a: "One. One action = one job." },
      { type: "qa", q: "How do you count the stages in a job?", a: "Count the shuffles and add one. Narrow ops fuse into a stage; each shuffle starts a new one." },
      { type: "qa", q: "A stage has 200 tasks but the cluster has 50 cores — what happens?", a: "The tasks run in 4 waves of 50. Task count is set by partitions; parallelism is capped by total cores." }
    ]
  },

  /* ===================================================== CHAPTER 8 */
  {
    id: "exec-partitions-tasks",
    title: "Partitions & Tasks",
    tagline: "The atom of parallelism — where partitions come from, and why the count decides your speed.",
    estMinutes: 10,
    blocks: [
      { type: "prose", html: "Partitions are the most important number in Spark that beginners never think about. One task runs per partition, so the partition count directly sets how parallel — or how single-threaded — your job is. This chapter is about where that count comes from and how to reason about it." },

      { type: "heading", level: 2, text: "What a partition is", id: "what" },
      { type: "prose", html: "A partition is a chunk of your data that lives together and is processed by one task on one core. A DataFrame with 200 partitions is 200 independent chunks that 200 tasks can crunch at once. No partitions, no parallelism — they are the reason Spark scales." },

      { type: "heading", level: 2, text: "Where the READ partition count comes from", id: "read-count" },
      { type: "prose", html: "When you read a file, Spark decides the initial partition count from the data size, not at random. For a large <b>splittable</b> file it targets chunks of about <code>spark.sql.files.maxPartitionBytes</code> — default <b>128 MB</b> (mirroring the HDFS block size). So a 1 GB Parquet file reads as roughly 8 partitions (1024 ÷ 128), and therefore 8 read tasks." },
      { type: "prose", html: "Two subtleties shape this. <b>Many small files</b> are <i>bin-packed</i> together (using <code>spark.sql.files.openCostInBytes</code>, default 4 MB, as the per-file cost) so you don't waste a whole task on a tiny file — thousands of small files become far fewer partitions. And a <b>non-splittable</b> file cannot be divided at all." },
      { type: "keynumbers", items: [
        { num: "128 MB", label: "maxPartitionBytes (read chunk)" },
        { num: "4 MB", label: "openCostInBytes (small-file packing)" },
        { num: "200", label: "shuffle partitions (default)" },
        { num: "1 : 1", label: "partition : task" }
      ] },

      { type: "heading", level: 2, text: "The single-core read trap", id: "trap" },
      { type: "prose", html: "Splittability is the catch that surprises people. Parquet, ORC, and plain (or bzip2) text can be split mid-file, so a big file becomes many partitions. But a single <b>gzipped</b> file — a <code>.csv.gz</code> — cannot be split. The whole file becomes <b>one partition and one task</b>, no matter how large. A 20 GB <code>.csv.gz</code> on a 100-core cluster reads on exactly one core." },
      { type: "trap", kind: "trap", html: "\"My huge job only uses one core.\" Almost always a single non-splittable file (a big <code>.csv.gz</code>). The fix: store as Parquet (splittable + columnar), or split the input into many files. This is one of the most common real-world Spark performance bugs." },

      { type: "heading", level: 2, text: "The other partition number: 200", id: "shuffle-200" },
      { type: "prose", html: "The read count is only the <i>start</i>. After any wide transformation, the partition count is reset to <code>spark.sql.shuffle.partitions</code> — default <b>200</b>. So a 1 GB file that read as 8 partitions becomes 200 partitions after a <code>groupBy</code>. Confusing the read count with the shuffle count is a classic misunderstanding — they're two different knobs." },
      { type: "code", code: "df = spark.read.parquet('/data/sales')   # ~8 partitions (1GB / 128MB)\ndf.rdd.getNumPartitions()                 # 8\ndf.groupBy('country').count().rdd.getNumPartitions()  # 200 (shuffle default)" },

      { type: "heading", level: 2, text: "Too few vs too many partitions", id: "tuning" },
      { type: "prose", html: "Partition count is a balance. <b>Too few</b> and you under-use the cluster (idle cores) and each task handles too much data (spills, or out-of-memory). <b>Too many</b> and the overhead of scheduling thousands of tiny tasks dominates the actual work. A good rule of thumb is partitions in the ~64–256 MB range, and enough of them to keep all your cores busy (often a small multiple of total cores). You reshape with <code>repartition</code> (a full shuffle, can increase or decrease, evens things out) or <code>coalesce</code> (no shuffle, can only decrease, may stay uneven)." },
      { type: "why", kind: "why", html: "Because task count equals partition count, tuning partitions <i>is</i> tuning parallelism. Most \"why is this slow / why did it OOM / why is one core busy\" questions are really partition-count questions in disguise." },

      { type: "heading", level: 2, text: "Check yourself", id: "check" },
      { type: "qa", q: "A splittable 2 GB Parquet file — roughly how many read partitions?", a: "About 16 (2048 MB ÷ 128 MB), so ~16 read tasks." },
      { type: "qa", q: "Why does a 10 GB .csv.gz read as one task?", a: "Gzip isn't splittable, so the whole file is one partition. Convert to Parquet (or split the file) to parallelize the read." },
      { type: "qa", q: "Where does the number 200 come from after a groupBy?", a: "That's spark.sql.shuffle.partitions, the post-shuffle default — a different setting from the read partitioning." }
    ]
  },

  /* ===================================================== CHAPTER 9 */
  {
    id: "exec-shuffle",
    title: "Narrow vs Wide & the Shuffle",
    tagline: "The single most expensive thing Spark does — what it is, why it costs so much, and how to do less of it.",
    estMinutes: 12,
    blocks: [
      { type: "prose", html: "If you understand the shuffle, you understand Spark performance. Almost every slow job, every out-of-memory error, and every tuning trick comes back to this one mechanism. It deserves its own chapter." },

      { type: "heading", level: 2, text: "Narrow vs wide transformations", id: "narrow-wide" },
      { type: "prose", html: "Every transformation is one of two kinds, based on how data must move." },
      { type: "prose", html: "<b>Narrow</b> transformations: each output partition depends on just <i>one</i> input partition. The work happens in place, on the partition where the data already is — no network movement. Examples: <code>filter</code>, <code>select</code>, <code>withColumn</code>, <code>map</code>. These are cheap and fully parallel, and they fuse together into a single stage." },
      { type: "prose", html: "<b>Wide</b> transformations: each output partition depends on <i>many</i> input partitions, because rows must be regrouped by a key. Rows with the same key may start out scattered across every partition and must be brought together. That regrouping — moving data across the network so related rows land together — is the <b>shuffle</b>. Examples: <code>groupBy</code>, <code>join</code>, <code>distinct</code>, <code>orderBy</code>, <code>repartition</code>." },
      { type: "analogy", kind: "analogy", html: "Imagine 50 people each holding a shuffled deck fragment, and you want all the hearts together, all the spades together, etc. Narrow work is \"everyone, discard your red cards\" — each person does it alone. A shuffle is \"everyone, physically walk your cards to the correct table by suit\" — a room-wide reorganization. That walking-around is slow, and it's exactly what Spark's shuffle does with data across machines." },

      { type: "heading", level: 2, text: "Why the shuffle is so expensive", id: "why-costly" },
      { type: "prose", html: "A shuffle is the costliest operation in Spark because it does the three slowest things a computer can do, all at once:" },
      { type: "steps", items: [
        "<b>Disk I/O.</b> Each task writes its data out to local disk as <i>shuffle files</i>, bucketed by destination — this is the \"shuffle write.\"",
        "<b>Serialization.</b> Data must be converted to bytes to travel, then converted back — CPU-expensive on both ends.",
        "<b>Network transfer.</b> Every executor fetches the buckets destined for it from every other executor — the \"shuffle read\" — moving data all across the cluster."
      ] },
      { type: "prose", html: "A narrow step touches data already in memory on the local partition. A shuffle writes to disk, serializes, ships over the network, and reads back — often 10–100× the cost. That's why the mental question for any Spark job is: <b>which of my operations shuffle, and can I do fewer or cheaper shuffles?</b>" },

      { type: "heading", level: 2, text: "How a shuffle actually works", id: "how" },
      { type: "prose", html: "Concretely: in the <b>map (write) side</b>, each task partitions its output by the target key (usually <code>hash(key) % numPartitions</code>) and writes one bucket per target partition to local disk. In the <b>reduce (read) side</b>, each task of the next stage fetches, from every map task, the one bucket meant for it — pulling all rows of its keys together — and then does the aggregation or join. The shuffle files on disk are the boundary between the two stages." },

      { type: "heading", level: 2, text: "The shuffle's evil twin: skew", id: "skew" },
      { type: "prose", html: "A shuffle assumes keys spread out reasonably evenly. When they don't — one key holds a huge share of the rows (a bot user, a null key, one giant customer) — all of that key's rows land in <b>one</b> partition, handled by <b>one</b> task. That task runs far longer than the rest (or runs out of memory), and the whole stage waits for it. This is <b>data skew</b>, and it's the usual cause of \"199 tasks finished, 1 is stuck.\"" },
      { type: "prose", html: "The common fixes: <b>salting</b> (add a random suffix to the hot key so its rows spread across many tasks, then combine), enabling <b>AQE skew join</b> (Spark splits the hot partition automatically at runtime), or filtering the pathological key out. Adding more executors does <i>not</i> help — the work is trapped in a single task." },

      { type: "heading", level: 2, text: "Doing fewer / cheaper shuffles", id: "reduce" },
      { type: "prose", html: "The highest-value performance moves all reduce shuffle cost:" },
      { type: "prose", html: "<b>Filter and select early.</b> Shrink the data <i>before</i> it hits a shuffle — fewer, thinner rows to move. (Catalyst tries to do this for you; don't fight it with UDFs.)" },
      { type: "prose", html: "<b>Broadcast the small side of a join.</b> If one table is small, Spark can copy it to every executor so the big table never shuffles at all — a <b>broadcast hash join</b> instead of a shuffle. This turns a wide join into a narrow one." },
      { type: "prose", html: "<b>Use combine-friendly aggregates.</b> Built-in aggregates (<code>sum</code>, <code>count</code>) pre-aggregate each partition <i>before</i> the shuffle (map-side combine), so only small partials cross the network — far cheaper than shuffling every raw row." },
      { type: "prose", html: "<b>Avoid needless wide steps.</b> Every <code>distinct</code>, <code>orderBy</code>, and <code>repartition</code> is a full shuffle — drop the ones you don't truly need." },
      { type: "trap", kind: "trap", html: "A common accidental shuffle: calling <code>repartition(n)</code> \"for more parallelism\" right before a small write, or an <code>orderBy</code> you don't actually need in the output. Each is a full shuffle with real cost — add them deliberately, not by habit." },
      { type: "interview", kind: "interview", html: "The instinct interviewers listen for: <i>\"Narrow stays on its partition; wide shuffles across the network — disk + serialize + network, the expensive part. I minimize shuffles: filter early, broadcast small join sides, use built-in aggregates for map-side combine, and watch for skew, where one key overloads a single task.\"</i>" },

      { type: "heading", level: 2, text: "Check yourself", id: "check" },
      { type: "qa", q: "What makes a transformation 'wide'?", a: "Its output partitions depend on many input partitions because rows must be regrouped by key — forcing a shuffle (groupBy, join, distinct, orderBy, repartition)." },
      { type: "qa", q: "Why is a shuffle so slow?", a: "It combines the three slowest operations: writing to disk, serializing/deserializing, and moving data over the network between all executors." },
      { type: "qa", q: "One task in a shuffle stage runs 10× longer than the rest — what and why?", a: "Data skew: one key holds most of the rows, so they all land in one partition/task. Fix by salting, AQE skew join, or removing the hot key — not by adding executors." }
    ]
  }

]);
