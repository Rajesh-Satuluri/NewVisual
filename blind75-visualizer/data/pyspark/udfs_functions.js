/*
 * PySpark Interview Lab — UDFs & Functions
 * When to use a UDF, when NOT to (Catalyst can't see inside a Python UDF), and
 * how to stay native with higher-order functions and pandas (vectorized) UDFs.
 */
(function () {
  var CAT = "UDFs & Functions";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q240
    {
      id: "basic-python-udf-salary-bands",
      lc: 240,
      title: "Write and apply a basic Python UDF to bucket salary into bands",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Python UDF", transformation: "Narrow (no codegen)", functions: "udf, StringType, withColumn" },
      description:
        "Given `employees` (`employee_id`, `name`, `department_id`, `manager_id`, `salary`), classify each employee into a **band**: `'low'` for salary `< 80000`, `'mid'` for `< 120000`, else `'high'`. Do it with a **Python UDF** — a plain Python function wrapped with `@udf(returnType=StringType())` and applied via `withColumn`. This is the baseline you will later rewrite natively (Q241).",
      examples: [
        {
          input: "employees: (1,'Asha',10,None,120000), (2,'Ravi',20,1,75000)",
          output: "(1,'Asha',...,120000,'high'), (2,'Ravi',...,75000,'low')",
          reasoning: "120000 is not < 120000 so it falls through to 'high'; 75000 < 80000 so it is 'low'. The Python function runs once per row."
        }
      ],
      approaches: [
        {
          name: "@udf(returnType=StringType()) applied with withColumn",
          whenToUse: "Genuinely custom per-row logic that has no native Spark equivalent (calling a Python library, complex branching). For simple threshold logic prefer native functions — see Q241.",
          logic:
            "**What it asks.** Map a numeric `salary` to a string label using arbitrary Python, then attach it as a new column.\n\n" +
            "**Key Idea.** A UDF is a Python function registered with Spark via `udf(fn, returnType)` (or the `@udf(...)` decorator). Spark calls it **once per row**, passing the column value(s) as Python objects and expecting a value of the declared `returnType` back.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write a plain Python function `band(salary)` returning a string.\n" +
            "2. Wrap it: `@udf(returnType=StringType())` (declaring the return type is required — Spark cannot infer it).\n" +
            "3. Apply it: `df.withColumn('band', band(col('salary')))`.\n" +
            "4. `.show()` to confirm.\n\n" +
            "**Why it works.** The decorator turns `band` into a `Column`-producing callable. At execution Spark serializes each row's `salary` to the Python worker, runs `band`, and pickles the string result back into the JVM column.\n\n" +
            "**Common Gotchas.**\n" +
            "- You **must** declare `returnType`; the default is `StringType()`, so a UDF that returns an int silently produces nulls if you forget.\n" +
            "- The function receives raw Python values, so `salary` may be `None` — an unguarded comparison throws (covered in Q246).\n" +
            "- A UDF is a black box to Catalyst: no predicate pushdown, no column pruning, no codegen. That is the whole reason Q241 exists.\n\n" +
            "**Interview mindset.** Show you *can* write a UDF, then immediately say \"...but I'd only reach for this if there were no native equivalent,\" and pivot to Q241.",
          rcs:
            "from pyspark.sql.functions import udf, col          # udf wrapper + col ref\n" +
            "from pyspark.sql.types import StringType             # declared return type\n" +
            "\n" +
            "@udf(returnType=StringType())                        # register as a String UDF\n" +
            "def band(salary):                                    # runs once PER ROW in Python\n" +
            "    if salary < 80000:                               # (assumes salary not None)\n" +
            "        return 'low'\n" +
            "    elif salary < 120000:\n" +
            "        return 'mid'\n" +
            "    return 'high'\n" +
            "\n" +
            "result = employees.withColumn('band', band(col('salary')))  # apply the UDF\n" +
            "result.show()                                        # action: serializes rows to Python",
          plain:
            "from pyspark.sql.functions import udf, col\n" +
            "from pyspark.sql.types import StringType\n" +
            "\n" +
            "@udf(returnType=StringType())\n" +
            "def band(salary):\n" +
            "    if salary < 80000:\n" +
            "        return 'low'\n" +
            "    elif salary < 120000:\n" +
            "        return 'mid'\n" +
            "    return 'high'\n" +
            "\n" +
            "result = employees.withColumn('band', band(col('salary')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A Python UDF is a **black box** to Catalyst: the optimizer cannot look inside it, so it blocks predicate pushdown and column pruning across it. At runtime Spark serializes each row's input to a Python worker process, runs the function, and pickles the result back into the JVM — that per-row (de)serialization is pure overhead. There is no whole-stage codegen for the UDF step, so the JVM's generated fast path is broken. The transformation itself is **narrow** (no shuffle), but it is far slower than a native column expression doing the same thing. This is exactly why the native rewrite in Q241 matters.",
      sparkSql:
        "-- Native SQL equivalent (no UDF needed):\n" +
        "SELECT *, CASE WHEN salary < 80000 THEN 'low'\n" +
        "               WHEN salary < 120000 THEN 'mid'\n" +
        "               ELSE 'high' END AS band\n" +
        "FROM employees;\n" +
        "-- To register the Python UDF for SQL use: spark.udf.register('band', band)",
      recognizeRecall: [
        "**Spot it:** \"apply a custom function to each row\" / logic that reads like ordinary Python (if/elif) on one column.",
        "**Say it:** wrap it with `@udf(returnType=...)`, apply with `withColumn` — but check for a native equivalent first.",
        "**Trap:** forgetting `returnType` (defaults to StringType) and unguarded `None` inputs both silently corrupt output."
      ]
    },

    // ------------------------------------------------------------------ Q241
    {
      id: "native-when-otherwise-vs-udf",
      lc: 241,
      title: "Rewrite the salary-band UDF with native F.when/otherwise (the anti-pattern fix)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Native column expression (UDF avoidance)", transformation: "Narrow (codegen)", functions: "when, otherwise, col" },
      description:
        "Take the salary-band logic from Q240 and rewrite it **without a UDF**, using native `F.when(...).otherwise(...)`. This is the single most important habit in this whole category: any UDF whose body is just comparisons, arithmetic, string ops, or conditionals should be a native column expression instead. Native expressions are **visible to Catalyst** (pushdown, pruning, codegen); a Python UDF is not.",
      examples: [
        {
          input: "employees: (1,'Asha',10,None,120000), (2,'Ravi',20,1,75000)",
          output: "(1,'Asha',...,120000,'high'), (2,'Ravi',...,75000,'low')",
          reasoning: "Identical output to the UDF version — but the whole chain stays in the JVM with codegen, so it is dramatically faster and optimizable, and it handles null salary safely (a null falls through every when and takes 'high' unless you guard it)."
        }
      ],
      approaches: [
        {
          name: "F.when(cond, val).when(...).otherwise(val)",
          whenToUse: "ALWAYS, when the logic is expressible with built-in functions. This should be your default; reach for a UDF only when no native path exists.",
          logic:
            "**What it asks.** Produce the exact same `band` column as Q240, but as a native Spark expression instead of a Python function.\n\n" +
            "**Key Idea.** `F.when(condition, value)` builds a `Column` that is evaluated by Catalyst-generated JVM code. Chain `.when(...)` for each branch and `.otherwise(...)` for the default — this is the direct analogue of `if/elif/else` (and of SQL `CASE WHEN`), but the optimizer can see and rewrite it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start the chain: `F.when(col('salary') < 80000, 'low')`.\n" +
            "2. Add the middle branch: `.when(col('salary') < 120000, 'mid')`.\n" +
            "3. Add the default: `.otherwise('high')`.\n" +
            "4. Attach it: `employees.withColumn('band', <that expression>)`.\n\n" +
            "**Why it works.** Each `when` compiles into a branch of generated bytecode inside whole-stage codegen — no row ever leaves the JVM, no pickling happens, and Catalyst can still push the `salary` filter down and prune unused columns because the expression is transparent.\n\n" +
            "**Common Gotchas.**\n" +
            "- A row that matches **no** `when` and has no `.otherwise(...)` yields **null**, not an error — add `otherwise` explicitly.\n" +
            "- `when` conditions are evaluated top-down like `elif`; order matters (put the tightest bound first).\n" +
            "- Null comparisons return null (not true), so a null `salary` skips every `when` and lands in `otherwise` — decide if that is what you want or guard with `col('salary').isNull()`.\n\n" +
            "**Interview mindset.** State the punchline out loud: \"Catalyst can optimize a native expression but treats a Python UDF as an opaque, non-codegen, per-row pickle boundary — so I default to `when/otherwise` and only write a UDF when there's truly no built-in.\"",
          rcs:
            "from pyspark.sql import functions as F              # native built-ins\n" +
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "band = (F.when(col('salary') < 80000,  'low')      # if salary < 80000\n" +
            "         .when(col('salary') < 120000, 'mid')      # elif salary < 120000\n" +
            "         .otherwise('high'))                        # else\n" +
            "\n" +
            "result = employees.withColumn('band', band)         # pure native column: codegen'd\n" +
            "result.show()                                       # no Python round-trip at all",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "band = (F.when(col('salary') < 80000,  'low')\n" +
            "         .when(col('salary') < 120000, 'mid')\n" +
            "         .otherwise('high'))\n" +
            "\n" +
            "result = employees.withColumn('band', band)\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "This is the whole point of the category. A native `when/otherwise` expression is part of Catalyst's logical plan, so the optimizer can reorder it, push filters through it, prune columns it does not touch, and fold it into **whole-stage codegen** — one tight JVM loop over the data. The Q240 UDF version can do none of that: it forces a per-row boundary that serializes each value to a Python worker (pickle out), runs interpreted Python, and pickles the result back. On real data the native version is typically several times faster and uses far less CPU and memory. Rule of thumb: if you can express it with built-ins, never write a UDF.",
      sparkSql:
        "SELECT *, CASE WHEN salary < 80000 THEN 'low'\n" +
        "               WHEN salary < 120000 THEN 'mid'\n" +
        "               ELSE 'high' END AS band\n" +
        "FROM employees;",
      recognizeRecall: [
        "**Spot it:** any UDF whose body is only comparisons, math, string ops, or if/elif — that is a native expression in disguise.",
        "**Say it:** replace it with `F.when(...).otherwise(...)` so Catalyst can codegen, push down, and prune; UDFs are opaque.",
        "**Trap:** dropping `.otherwise(...)` leaves nulls, and remember null comparisons are null (they fall through to otherwise)."
      ]
    },

    // ------------------------------------------------------------------ Q242
    {
      id: "udf-returning-struct-multiple-columns",
      lc: 242,
      title: "UDF returning a StructType to produce multiple columns at once",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Struct-returning UDF", transformation: "Narrow (no codegen)", functions: "udf, StructType, StructField, select" },
      description:
        "Sometimes one row's computation naturally yields **several** outputs. Instead of calling three separate UDFs (three Python round-trips), write **one** UDF that returns a `StructType`, then expand it into flat columns with `.select('out.*')`. Example: from `salary`, return a struct of `{band, annual_bonus, tax_bracket}` in a single pass.",
      examples: [
        {
          input: "employees: (2,'Ravi',20,1,75000)",
          output: "out.band='low', out.annual_bonus=7500, out.tax_bracket='B'  ->  select('out.*') flattens to columns band, annual_bonus, tax_bracket",
          reasoning: "The UDF runs ONCE per row and returns a Row/tuple matching the declared StructType; select('out.*') expands each struct field into its own top-level column."
        }
      ],
      approaches: [
        {
          name: "@udf(returnType=StructType([...])) then .select('out.*')",
          whenToUse: "One custom computation produces several related values and you want to avoid running the same Python logic (and its serialization cost) multiple times.",
          logic:
            "**What it asks.** Compute several derived values per employee in one Python call and land them as separate columns.\n\n" +
            "**Key Idea.** Declare the UDF's return type as a `StructType` listing each output field. The function returns a tuple (or `Row`) whose positions match the struct fields. Applying the UDF gives one **struct** column; `.select('structcol.*')` flattens the fields into individual columns.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Define the schema: `StructType([StructField('band', StringType()), StructField('annual_bonus', IntegerType()), StructField('tax_bracket', StringType())])`.\n" +
            "2. Write a function returning a tuple in that exact order.\n" +
            "3. Wrap: `udf(fn, that_schema)`.\n" +
            "4. Add the struct column: `df.withColumn('out', fn(col('salary')))`.\n" +
            "5. Flatten: `df.select('*', 'out.*').drop('out')` or `df.withColumn('out', ...).select('employee_id', 'out.*')`.\n\n" +
            "**Why it works.** A `StructType` is a first-class nested column; the UDF materializes one struct per row, and `out.*` is Spark's star-expansion of a struct's fields into columns.\n\n" +
            "**Common Gotchas.**\n" +
            "- The returned tuple's **order and types** must match the `StructField` list exactly, or you get nulls / cast errors.\n" +
            "- Return a tuple/`Row`, not a dict positionally — field names come from the schema, not the return value.\n" +
            "- It is still one opaque Python UDF (no codegen); the win is *one* round-trip instead of three, not zero.\n\n" +
            "**Interview mindset.** Frame it as batching custom outputs: \"if I truly need a UDF and it yields several values, I return a struct so I pay the Python-boundary cost once, then `select('out.*')`.\"",
          rcs:
            "from pyspark.sql.functions import udf, col\n" +
            "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
            "\n" +
            "schema = StructType([                               # declares 3 output fields\n" +
            "    StructField('band',         StringType()),\n" +
            "    StructField('annual_bonus', IntegerType()),\n" +
            "    StructField('tax_bracket',  StringType()),\n" +
            "])\n" +
            "\n" +
            "@udf(returnType=schema)                             # ONE struct-returning UDF\n" +
            "def enrich(salary):                                 # runs once per row\n" +
            "    band = 'low' if salary < 80000 else ('mid' if salary < 120000 else 'high')\n" +
            "    bonus = int(salary * 0.10)                      # 10% bonus\n" +
            "    bracket = 'A' if salary >= 120000 else ('B' if salary >= 80000 else 'C')\n" +
            "    return (band, bonus, bracket)                   # tuple order == schema order\n" +
            "\n" +
            "result = (employees\n" +
            "    .withColumn('out', enrich(col('salary')))      # struct column 'out'\n" +
            "    .select('employee_id', 'name', 'out.*'))       # expand struct into columns\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import udf, col\n" +
            "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
            "\n" +
            "schema = StructType([\n" +
            "    StructField('band',         StringType()),\n" +
            "    StructField('annual_bonus', IntegerType()),\n" +
            "    StructField('tax_bracket',  StringType()),\n" +
            "])\n" +
            "\n" +
            "@udf(returnType=schema)\n" +
            "def enrich(salary):\n" +
            "    band = 'low' if salary < 80000 else ('mid' if salary < 120000 else 'high')\n" +
            "    bonus = int(salary * 0.10)\n" +
            "    bracket = 'A' if salary >= 120000 else ('B' if salary >= 80000 else 'C')\n" +
            "    return (band, bonus, bracket)\n" +
            "\n" +
            "result = (employees\n" +
            "    .withColumn('out', enrich(col('salary')))\n" +
            "    .select('employee_id', 'name', 'out.*'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A struct-returning UDF is still a black box to Catalyst — no codegen, no pushdown across it, and each row still serializes to Python and back. What it saves is **fan-out cost**: computing three values in one Python call and one pickle round-trip instead of invoking three separate UDFs (three boundaries) over the same input. The output is a nested `StructType` column; `select('out.*')` is a cheap, purely logical star-expansion with no extra shuffle. If any of those three outputs could be expressed natively, you would still prefer native expressions — this pattern is for genuinely custom multi-output logic.",
      sparkSql:
        "-- Register then call, returning a struct, and expand with .*:\n" +
        "-- spark.udf.register('enrich', enrich)  (returnType carried from the Python def)\n" +
        "SELECT employee_id, name, out.*\n" +
        "FROM (SELECT employee_id, name, enrich(salary) AS out FROM employees);",
      recognizeRecall: [
        "**Spot it:** one custom per-row computation that yields several related fields at once.",
        "**Say it:** return a `StructType` from a single UDF, then `select('out.*')` to flatten — one Python round-trip, not many.",
        "**Trap:** the returned tuple's order/types must line up with the `StructField` list exactly, or fields come back null."
      ]
    },

    // ------------------------------------------------------------------ Q243
    {
      id: "pandas-udf-vectorized-arrow",
      lc: 243,
      title: "Vectorized pandas_udf (Series -> Series) for a numeric transform",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Vectorized (pandas) UDF", transformation: "Narrow (Arrow batches)", functions: "pandas_udf, DoubleType, pandas" },
      description:
        "When you truly need custom Python but a row-at-a-time UDF is too slow, use a **`pandas_udf`**. It receives a `pandas.Series` (a whole batch of values) and returns a `pandas.Series`, transferring data in **Apache Arrow** columnar batches instead of pickling one row at a time. Example: apply a numeric transform (a scaled log-style adjustment) to `order_amount`.",
      examples: [
        {
          input: "orders: (10, 1, 200.0), (11, 2, 50.0)",
          output: "(10, 1, 200.0, 46.05...), (11, 2, 50.0, 39.12...)  where adjusted = order_amount * 0.1 + ln(order_amount) * 10",
          reasoning: "The function gets a Series of all order_amounts in an Arrow batch, runs vectorized pandas/numpy math over the whole batch at once, and returns a Series of the same length — far fewer Python boundary crossings than a per-row UDF."
        }
      ],
      approaches: [
        {
          name: "@pandas_udf(DoubleType()) with Series -> Series",
          whenToUse: "Custom Python numeric/ML logic (numpy, scikit-learn scoring, custom math) over large data where a plain UDF's per-row overhead is the bottleneck.",
          logic:
            "**What it asks.** Apply custom numeric Python to a column, but vectorized over batches rather than one value at a time.\n\n" +
            "**Key Idea.** A **Scalar** `pandas_udf` is typed `Series -> Series`. Spark hands your function a `pandas.Series` holding a chunk of the column (an Arrow record batch), you run vectorized pandas/numpy operations, and you return a Series of the **same length**. Arrow moves the data columnarly, so the Python boundary is crossed once per batch, not once per row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `import pandas as pd` and `from pyspark.sql.functions import pandas_udf`.\n" +
            "2. Decorate with the return type: `@pandas_udf(DoubleType())`.\n" +
            "3. Write `def adjust(amount: pd.Series) -> pd.Series:` using vectorized ops (`amount * 0.1 + np.log(amount) * 10`).\n" +
            "4. Apply it exactly like any column function: `df.withColumn('adjusted', adjust(col('order_amount')))`.\n\n" +
            "**Why it works.** Arrow gives Spark and Python a shared columnar memory format, so a batch of values crosses the JVM<->Python boundary in one transfer with almost no per-row serialization. pandas/numpy then process the whole Series in optimized C loops.\n\n" +
            "**Common Gotchas.**\n" +
            "- The output Series **must** be the same length and order as the input — never reindex or drop rows.\n" +
            "- Requires PyArrow installed; batch size is tuned by `spark.sql.execution.arrow.maxRecordsPerBatch`.\n" +
            "- It is still not codegen and Catalyst still cannot see inside it — it only *amortizes* the boundary cost; a native expression still wins when one exists.\n\n" +
            "**Interview mindset.** Position it as the middle ground: \"native first; if I must run custom Python at scale, a `pandas_udf` with Arrow batching is far cheaper than a row-at-a-time UDF.\"",
          rcs:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "from pyspark.sql.functions import pandas_udf, col\n" +
            "from pyspark.sql.types import DoubleType\n" +
            "\n" +
            "@pandas_udf(DoubleType())                           # vectorized: Arrow batches\n" +
            "def adjust(amount: pd.Series) -> pd.Series:         # receives a whole Series\n" +
            "    return amount * 0.1 + np.log(amount) * 10       # vectorized numpy math\n" +
            "\n" +
            "result = orders.withColumn(                          # applied like any column fn\n" +
            "    'adjusted', adjust(col('order_amount')))\n" +
            "result.show()                                       # one Python crossing per batch",
          plain:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "from pyspark.sql.functions import pandas_udf, col\n" +
            "from pyspark.sql.types import DoubleType\n" +
            "\n" +
            "@pandas_udf(DoubleType())\n" +
            "def adjust(amount: pd.Series) -> pd.Series:\n" +
            "    return amount * 0.1 + np.log(amount) * 10\n" +
            "\n" +
            "result = orders.withColumn('adjusted', adjust(col('order_amount')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A `pandas_udf` is still opaque to Catalyst (no codegen, no pushdown across it), but it **amortizes** the Python boundary by transferring data as Apache Arrow columnar batches instead of pickling row by row. Each executor ships a batch of the column into Python once, pandas/numpy process the entire Series in vectorized C, and the result Series comes back in one Arrow transfer. This typically runs many times faster than an equivalent row-at-a-time UDF and is the right tool for heavy custom numeric or ML scoring. It is a **narrow** transformation. The output Series must preserve input length and order, and PyArrow must be installed; batch size is governed by `spark.sql.execution.arrow.maxRecordsPerBatch`.",
      sparkSql:
        "-- Register a pandas_udf for SQL, then call it like a built-in:\n" +
        "-- spark.udf.register('adjust', adjust)   # adjust is the @pandas_udf function\n" +
        "SELECT order_id, customer_id, order_amount, adjust(order_amount) AS adjusted\n" +
        "FROM orders;",
      recognizeRecall: [
        "**Spot it:** custom Python math/ML over large data where a plain UDF is the bottleneck.",
        "**Say it:** use a `pandas_udf` (Series->Series) so data moves in Arrow batches — vectorized, one crossing per batch.",
        "**Trap:** the returned Series must match input length/order, and it still isn't codegen — native beats it when possible."
      ]
    },

    // ------------------------------------------------------------------ Q244
    {
      id: "broadcast-dict-lookup-udf",
      lc: 244,
      title: "UDF with an external dict lookup, broadcast so it isn't shipped per task",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Broadcast variable in a UDF", transformation: "Narrow (no codegen)", functions: "udf, sc.broadcast, StringType" },
      description:
        "A UDF sometimes needs an external Python object — a lookup dict, a model, a config map. If you reference the raw dict directly, Spark serializes a **copy with every task**, wasting network and memory. Wrap it in `sc.broadcast(...)` so each executor gets **one** read-only copy, and read it inside the UDF via `.value`. Example: map `department_id` to a department name.",
      examples: [
        {
          input: "employees: (1,'Asha',10,None,120000); dept_map = {10:'Engineering', 20:'Sales'}",
          output: "(1,'Asha',10,...,'Engineering')",
          reasoning: "The UDF looks up department_id in the broadcast dict. Because dept_map is broadcast, it is shipped once per executor, not re-serialized into every task closure."
        }
      ],
      approaches: [
        {
          name: "sc.broadcast(dict) + UDF reading bc.value",
          whenToUse: "A UDF (or any closure) needs a sizable read-only Python object reused across many tasks — a lookup table, weights, or config too small to be a DataFrame join but too big to copy per task.",
          logic:
            "**What it asks.** Enrich each row from an in-memory Python dict, without shipping that dict once per task.\n\n" +
            "**Key Idea.** `bc = sc.broadcast(dept_map)` sends the dict to every executor **once** and caches it there. Inside the UDF you read `bc.value` — Spark does not re-serialize the dict into each task's closure, it just references the cached copy.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the dict on the driver: `dept_map = {10: 'Engineering', 20: 'Sales'}`.\n" +
            "2. Broadcast it: `bc = spark.sparkContext.broadcast(dept_map)`.\n" +
            "3. Write a UDF that reads `bc.value.get(dept_id, 'Unknown')`.\n" +
            "4. Apply: `df.withColumn('department', lookup(col('department_id')))`.\n\n" +
            "**Why it works.** A broadcast variable is a read-only, per-executor cached object distributed with an efficient (torrent-like) protocol. The UDF closure captures the small `Broadcast` handle, not the dict itself, so task serialization stays tiny.\n\n" +
            "**Common Gotchas.**\n" +
            "- Read `bc.value`, not the original dict variable — capturing the raw dict defeats the purpose and copies it per task.\n" +
            "- Broadcast variables are **read-only**; never mutate `bc.value` inside the UDF.\n" +
            "- For big lookups, a **broadcast join** (`df.join(broadcast(dim), ...)`) is usually better than a UDF — it stays native and codegen'd.\n\n" +
            "**Interview mindset.** Show you know the closure trap: \"referencing a large dict directly serializes it into every task; broadcasting sends it once per executor.\" Then note a broadcast *join* is often the even-better, UDF-free option.",
          rcs:
            "from pyspark.sql.functions import udf, col\n" +
            "from pyspark.sql.types import StringType\n" +
            "\n" +
            "dept_map = {10: 'Engineering', 20: 'Sales', 30: 'Finance'}   # driver-side dict\n" +
            "bc = spark.sparkContext.broadcast(dept_map)          # ship ONCE per executor\n" +
            "\n" +
            "@udf(returnType=StringType())\n" +
            "def lookup(dept_id):                                 # read the cached copy\n" +
            "    return bc.value.get(dept_id, 'Unknown')          # bc.value, not dept_map\n" +
            "\n" +
            "result = employees.withColumn(                       # apply the lookup UDF\n" +
            "    'department', lookup(col('department_id')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import udf, col\n" +
            "from pyspark.sql.types import StringType\n" +
            "\n" +
            "dept_map = {10: 'Engineering', 20: 'Sales', 30: 'Finance'}\n" +
            "bc = spark.sparkContext.broadcast(dept_map)\n" +
            "\n" +
            "@udf(returnType=StringType())\n" +
            "def lookup(dept_id):\n" +
            "    return bc.value.get(dept_id, 'Unknown')\n" +
            "\n" +
            "result = employees.withColumn('department', lookup(col('department_id')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Without broadcasting, any Python object a UDF references is captured in the task **closure** and serialized once per task — for a large dict over thousands of tasks that is huge, redundant network and memory cost. `sc.broadcast` distributes the object to each executor exactly once using an efficient peer-to-peer protocol and caches it read-only for all tasks on that executor; the closure then carries only a tiny handle. The UDF itself is still opaque to Catalyst (no codegen, per-row pickling of the *column* values remains). For larger reference data, a native **broadcast join** is usually superior — it avoids the UDF boundary entirely and stays in codegen. Broadcast variables must not be mutated.",
      sparkSql:
        "-- The idiomatic native equivalent is a broadcast join against a small dim table:\n" +
        "SELECT e.*, d.department_name AS department\n" +
        "FROM employees e\n" +
        "LEFT JOIN /*+ BROADCAST(d) */ departments d\n" +
        "  ON e.department_id = d.department_id;",
      recognizeRecall: [
        "**Spot it:** a UDF that reaches for an external dict / model / config shared across all rows.",
        "**Say it:** `sc.broadcast(obj)` and read `bc.value` inside the UDF so it ships once per executor, not per task.",
        "**Trap:** capturing the raw dict (not `bc.value`) re-serializes it per task; for big lookups prefer a broadcast join."
      ]
    },

    // ------------------------------------------------------------------ Q245
    {
      id: "higher-order-functions-array-column",
      lc: 245,
      title: "Higher-order functions on an array column without a UDF (transform/filter/aggregate)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Higher-order array functions", transformation: "Narrow (codegen)", functions: "transform, filter, aggregate, lit" },
      description:
        "Element-wise work on an `array<int>` column is a classic place people reach for a UDF — and they shouldn't. Native **higher-order functions** apply a lambda to array elements entirely inside Spark: `F.transform` (map), `F.filter` (keep matching), `F.aggregate` (fold to a scalar). Example on `df(id, nums array<int>)`: square each element, keep only positives, and sum them. **Note:** the `F.*` Python wrappers for these need **Spark 3.1+** (before that, use `expr('transform(...)')`).",
      examples: [
        {
          input: "df: (1, [1, -2, 3]), (2, [-5, 4])",
          output: "squared: (1,[1,4,9]),(2,[25,16]); positives kept from nums: (1,[1,3]),(2,[4]); sum of positives: (1,4),(2,4)",
          reasoning: "transform(nums, x -> x*x) maps each element; filter(nums, x -> x>0) keeps positives; aggregate(positives, 0, (acc,x)->acc+x) folds them to a single sum — all native, no UDF."
        }
      ],
      approaches: [
        {
          name: "F.transform / F.filter / F.aggregate with lambdas",
          whenToUse: "Any per-element or fold logic on an array column that built-in higher-order functions can express — which is most of it. Avoids a UDF entirely.",
          logic:
            "**What it asks.** Do map / filter / reduce on the elements of an array column using native functions instead of a UDF.\n\n" +
            "**Key Idea.** Higher-order functions take a **lambda** over array elements: `F.transform(arr, lambda x: x*x)` maps, `F.filter(arr, lambda x: x > 0)` keeps matches, and `F.aggregate(arr, F.lit(0), lambda acc, x: acc + x)` folds to a scalar with a start value. They run inside Spark's engine (codegen), so no Python boundary is crossed.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Square: `df.withColumn('squared', F.transform('nums', lambda x: x * x))`.\n" +
            "2. Keep positives: `.withColumn('pos', F.filter('nums', lambda x: x > 0))`.\n" +
            "3. Sum the positives: `.withColumn('pos_sum', F.aggregate('pos', F.lit(0), lambda acc, x: acc + x))`.\n" +
            "4. `.show()`; each stays a native column expression.\n\n" +
            "**Why it works.** These functions compile the lambda into a Catalyst expression evaluated element-wise in the JVM — the lambda is Spark `Column` code, not Python that runs per row. So you get array logic with full codegen and optimization.\n\n" +
            "**Common Gotchas.**\n" +
            "- The `F.transform` / `F.filter` / `F.aggregate` Python wrappers require **Spark 3.1+**; on older versions use `expr('transform(nums, x -> x*x)')` etc.\n" +
            "- The lambda operates on `Column` objects — use Spark ops (`x * x`, `x > 0`), not arbitrary Python that would need a UDF.\n" +
            "- `F.aggregate` needs an explicit **initial value** (`F.lit(0)`) whose type matches the accumulator.\n\n" +
            "**Interview mindset.** Say it plainly: \"array element logic almost never needs a UDF — `transform/filter/aggregate` keep it native and codegen'd.\" Mentioning the 3.1+ caveat signals real experience.",
          rcs:
            "from pyspark.sql import functions as F              # F.transform / filter / aggregate\n" +
            "\n" +
            "result = (df                                        # df has: id, nums array<int>\n" +
            "    .withColumn('squared',                          # map: square each element\n" +
            "        F.transform('nums', lambda x: x * x))       # (Spark 3.1+ for F.transform)\n" +
            "    .withColumn('pos',                              # filter: keep positives\n" +
            "        F.filter('nums', lambda x: x > 0))\n" +
            "    .withColumn('pos_sum',                          # aggregate: fold to a sum\n" +
            "        F.aggregate('pos', F.lit(0),                # start acc at 0\n" +
            "                    lambda acc, x: acc + x)))       # acc + element\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "result = (df\n" +
            "    .withColumn('squared', F.transform('nums', lambda x: x * x))\n" +
            "    .withColumn('pos', F.filter('nums', lambda x: x > 0))\n" +
            "    .withColumn('pos_sum', F.aggregate('pos', F.lit(0), lambda acc, x: acc + x)))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Higher-order functions keep array element logic **native**: the lambda is compiled into a Catalyst expression and evaluated inside whole-stage codegen, so there is no per-row Python pickling and the optimizer can still see the operation. This is dramatically cheaper than exploding the array, applying a UDF, and re-collecting, and cheaper than a UDF that loops in Python. The transformation is **narrow** — element-wise work stays within each row's partition, no shuffle. The `F.transform`/`F.filter`/`F.aggregate` Python wrappers arrived in **Spark 3.1**; the underlying SQL expressions (`transform`, `filter`, `aggregate`) exist earlier and are reachable via `expr(...)`. `aggregate` requires an initial value whose type matches the accumulator.",
      sparkSql:
        "SELECT id,\n" +
        "       transform(nums, x -> x * x)              AS squared,\n" +
        "       filter(nums, x -> x > 0)                 AS pos,\n" +
        "       aggregate(filter(nums, x -> x > 0), 0, (acc, x) -> acc + x) AS pos_sum\n" +
        "FROM df;",
      recognizeRecall: [
        "**Spot it:** \"for each element of the array...\" — map/filter/reduce over an array<...> column.",
        "**Say it:** use `F.transform` / `F.filter` / `F.aggregate` with lambdas — native, codegen'd, no UDF (Spark 3.1+).",
        "**Trap:** the F.* wrappers need Spark 3.1+ (else `expr('transform(...)')`), and `aggregate` needs an explicit start value."
      ]
    },

    // ------------------------------------------------------------------ Q246
    {
      id: "udf-breaks-pushdown-and-nulls",
      lc: 246,
      title: "How a UDF breaks filter pushdown and mishandles None",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "UDF optimization barrier + null safety", transformation: "Narrow (no codegen)", functions: "udf, filter, explain, when" },
      description:
        "Two failure modes that make interviewers wince. **(1) Pushdown:** filtering on a **UDF's output** stops Spark from pushing that filter down to the scan — it must read every row, run Python, then filter. Filtering on a **raw column** (or doing the UDF after the filter) lets the predicate push to the data source. **(2) Nulls:** a Python UDF receives `None` for null cells and will **throw** on an unguarded operation (e.g. `s.lower()` on `None`) — native functions propagate null safely instead.",
      examples: [
        {
          input: "events(user_id, event_type, event_time); is_click = udf(lambda t: t == 'click')",
          output: "events.filter(is_click(col('event_type'))) -> reads ALL rows, runs UDF, then filters (no pushdown). events.filter(col('event_type') == 'click') -> predicate pushed to scan. And upper_udf(None) -> AttributeError unless the UDF guards None.",
          reasoning: "Catalyst can push a native equality predicate into the file/JDBC scan; it cannot push a filter that depends on an opaque UDF's result, so it reads everything first. A UDF's Python body must explicitly handle None or it errors on the null row."
        }
      ],
      approaches: [
        {
          name: "Filter on native columns; guard None; verify with .explain()",
          whenToUse: "Any time a filter or predicate could be phrased natively, and any UDF whose input column may contain nulls.",
          logic:
            "**What it asks.** Show why a UDF-based filter is slow (no pushdown) and why a UDF crashes on nulls — and how to fix both.\n\n" +
            "**Key Idea.** Catalyst pushes predicates down to the data source only when it understands them. A native predicate like `col('event_type') == 'click'` pushes into the Parquet/JDBC scan (fewer rows read). A predicate built from a **UDF** is opaque, so Spark must scan everything, run Python on every row, then filter. Separately, a UDF is handed `None` for null inputs and must guard it (`if t is None: return ...`) or it raises.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Prefer the native filter: `events.filter(col('event_type') == 'click')` — check `events.filter(...).explain()` and look for `PushedFilters`.\n" +
            "2. If a UDF is unavoidable, apply the filter on raw columns **first**, then the UDF, so the scan is pruned before Python runs.\n" +
            "3. Make the UDF null-safe: handle `None` explicitly at the top of the function.\n" +
            "4. Better yet, replace the UDF with native functions (`F.when`, `F.upper`, etc.) which propagate null automatically.\n\n" +
            "**Why it works.** Pushdown depends on a transparent predicate; a native column comparison is transparent, a UDF result is not. Native functions follow SQL null semantics (null in -> null out) inside the JVM, so there is no Python exception to throw.\n\n" +
            "**Common Gotchas.**\n" +
            "- Wrapping a plain equality in a UDF (`udf(lambda t: t == 'click')`) is a pure pessimization — it kills pushdown for zero benefit.\n" +
            "- A UDF that does `s.lower()` throws `AttributeError` on a null row; the failure only appears when a null is present in the data.\n" +
            "- `.explain()` is your proof: `PushedFilters: [...]` present with the native filter, absent with the UDF filter.\n\n" +
            "**Interview mindset.** Two crisp sentences: \"A UDF is an optimization barrier — filtering on its output blocks pushdown, so I filter on raw columns or push the filter before the UDF. And a UDF must handle `None` explicitly, whereas native functions propagate null for free.\"",
          rcs:
            "from pyspark.sql.functions import udf, col\n" +
            "from pyspark.sql.types import BooleanType, StringType\n" +
            "\n" +
            "# (1) PUSHDOWN --------------------------------------------------------\n" +
            "is_click = udf(lambda t: t == 'click', BooleanType())\n" +
            "events.filter(is_click(col('event_type'))).explain()   # NO PushedFilters: scans all\n" +
            "events.filter(col('event_type') == 'click').explain()  # PushedFilters=[event_type=click]\n" +
            "\n" +
            "# (2) NULL SAFETY -----------------------------------------------------\n" +
            "@udf(returnType=StringType())\n" +
            "def up(s):                                             # events may have null event_type\n" +
            "    if s is None:                                      # MUST guard None explicitly\n" +
            "        return None                                    # else s.upper() -> AttributeError\n" +
            "    return s.upper()\n" +
            "\n" +
            "safe = events.withColumn('etype_up', up(col('event_type')))\n" +
            "safe.show()",
          plain:
            "from pyspark.sql.functions import udf, col\n" +
            "from pyspark.sql.types import BooleanType, StringType\n" +
            "\n" +
            "is_click = udf(lambda t: t == 'click', BooleanType())\n" +
            "events.filter(is_click(col('event_type'))).explain()\n" +
            "events.filter(col('event_type') == 'click').explain()\n" +
            "\n" +
            "@udf(returnType=StringType())\n" +
            "def up(s):\n" +
            "    if s is None:\n" +
            "        return None\n" +
            "    return s.upper()\n" +
            "\n" +
            "safe = events.withColumn('etype_up', up(col('event_type')))\n" +
            "safe.show()"
        }
      ],
      sparkInternals:
        "A Python UDF is an **optimization barrier**. Catalyst pushes predicates and prunes columns only through expressions it can reason about; a filter that depends on a UDF's output is opaque, so Spark cannot push it into the scan — it reads every row, serializes each to Python, runs the function, then filters, which defeats source-level pruning. `.explain()` shows `PushedFilters` populated for a native predicate and empty for the UDF one. Null handling differs too: native functions follow SQL semantics (null propagates automatically), but a Python UDF receives `None` and must guard it or raise. The remedy is to filter on raw columns (or apply the filter before the UDF) and to prefer native functions, which are transparent, codegen'd, and null-safe.",
      sparkSql:
        "-- Native predicate pushes into the scan (fast); a UDF predicate would not:\n" +
        "SELECT * FROM events WHERE event_type = 'click';\n" +
        "-- Native null-safe uppercase (no None to guard): upper(NULL) -> NULL automatically\n" +
        "SELECT user_id, upper(event_type) AS etype_up FROM events;",
      recognizeRecall: [
        "**Spot it:** a filter phrased through a UDF, or a UDF doing string/attr ops on a column that can be null.",
        "**Say it:** filter on raw columns (or before the UDF) to keep pushdown; UDFs must guard `None`, native functions don't.",
        "**Trap:** `.explain()` shows no `PushedFilters` for a UDF filter, and `s.upper()` throws on a null row — both are avoidable."
      ]
    }

  ]);
})();
