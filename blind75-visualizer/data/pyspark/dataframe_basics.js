/*
 * PySpark Interview Lab — DataFrame Basics (Easy, Q1–Q20)
 * =========================================================================
 * FORMAT REFERENCE for every other category file.
 *
 * Each file registers its problems on the global registry:
 *     window.PYSPARK.register("Category Name", [ ...problems ]);
 *
 * PROBLEM SCHEMA (all fields required unless marked optional):
 * {
 *   id:            "kebab-case-unique-id",
 *   lc:            1,                       // question number (Q#)
 *   title:         "Create a DataFrame from tuples",
 *   difficulty:    "Easy" | "Medium" | "Hard",
 *   category:      "DataFrame Basics",      // must match register() key
 *   link:          "https://…"  (optional — docs link, shown if present),
 *   meta: { pattern, transformation, functions },  // short strings: badges + search
 *   description:   "markdown — faithful PARAPHRASE of the prompt, never verbatim",
 *   constraints:   ["markdown line", ...]   // optional
 *   notes:         ["markdown line", ...]   // optional
 *   examples: [ { input, output, reasoning } ],   // 1–3, original sample data
 *   approaches: [                           // 1–2; add a 2nd ONLY for a real contrast
 *     { name, whenToUse, logic, rcs, plain } // rcs = commented; plain = clean, same code
 *   ],
 *   sparkInternals:  "markdown — shuffle vs narrow, partitioning, why it's cheap/costly",
 *   sparkSql:        "the Spark SQL equivalent (assumes a registered temp view)",
 *   recognizeRecall: ["merged cue: how to spot it + what to say in the interview", ...]
 * }
 *
 * LOGIC format (bold lead-ins, omit a section only if it truly doesn't apply):
 * **What it asks.** → **Key Idea.** → **Step-by-Step Approach.** (numbered) →
 * **Why it works.** → **Common Gotchas.** (bullets) → **Interview mindset.**
 * =========================================================================
 */
(function () {
  window.PYSPARK.register("DataFrame Basics", [

    // ------------------------------------------------------------------ Q1
    {
      id: "create-df-from-tuples",
      lc: 1,
      title: "Create a DataFrame from a list of tuples",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "DataFrame creation", transformation: "Narrow (no shuffle)", functions: "spark.createDataFrame" },
      description:
        "Create a PySpark DataFrame from an in-memory list of tuples containing `employee_id`, `name`, `department`, and `salary`. Pass the column names as a list so the DataFrame has meaningful headers instead of `_1, _2, _3, _4`.",
      notes: [
        "Types are **inferred** from the data when you only pass column names.",
        "Good for tests and small lookup tables — not for large data (the list lives on the driver first)."
      ],
      examples: [
        {
          input: "data = [(1, 'Asha', 'Engineering', 120000), (2, 'Ravi', 'Sales', 80000)]",
          output: "A 2-row DataFrame with columns employee_id, name, department, salary",
          reasoning: "createDataFrame parallelizes the driver list into a distributed DataFrame; the second argument names the columns positionally."
        }
      ],
      approaches: [
        {
          name: "createDataFrame with column names",
          whenToUse: "The everyday way to hand-build a small DataFrame for tests or constants.",
          logic:
            "**What it asks.** Turn a plain Python list of tuples into a distributed DataFrame with named columns.\n\n" +
            "**Key Idea.** `spark.createDataFrame(data, schema)` takes any list of rows plus a schema. When the schema is just a list of names, Spark **infers** each column's type by sampling the rows.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the list of tuples on the driver.\n" +
            "2. Build a parallel list of column names in the same order as the tuple fields.\n" +
            "3. Call `spark.createDataFrame(data, columns)`.\n" +
            "4. Call `.show()` / `.printSchema()` to confirm.\n\n" +
            "**Why it works.** Each tuple becomes a `Row`; Spark parallelizes them into partitions and attaches the inferred schema.\n\n" +
            "**Common Gotchas.**\n" +
            "- Column-name order must match tuple-field order.\n" +
            "- Inference can pick a wider type (e.g. all-null column → string); use an explicit schema when types matter.\n\n" +
            "**Interview mindset.** Mention that this is driver-side data and only appropriate for small inputs.",
          rcs:
            "from pyspark.sql import SparkSession\n" +
            "\n" +
            "spark = SparkSession.builder.getOrCreate()   # Reuse the active session.\n" +
            "\n" +
            "data = [                                     # Driver-side list of rows.\n" +
            "    (1, 'Asha', 'Engineering', 120000),\n" +
            "    (2, 'Ravi', 'Sales', 80000),\n" +
            "]\n" +
            "columns = ['employee_id', 'name', 'department', 'salary']  # Positional names.\n" +
            "\n" +
            "df = spark.createDataFrame(data, columns)    # Parallelize + infer types.\n" +
            "df.show()                                    # Action: prints the rows.",
          plain:
            "from pyspark.sql import SparkSession\n" +
            "\n" +
            "spark = SparkSession.builder.getOrCreate()\n" +
            "\n" +
            "data = [\n" +
            "    (1, 'Asha', 'Engineering', 120000),\n" +
            "    (2, 'Ravi', 'Sales', 80000),\n" +
            "]\n" +
            "columns = ['employee_id', 'name', 'department', 'salary']\n" +
            "\n" +
            "df = spark.createDataFrame(data, columns)\n" +
            "df.show()"
        }
      ],
      sparkInternals:
        "Creation from a local list is a **narrow** operation — no shuffle. Spark serializes the driver list and splits it across `spark.default.parallelism` partitions. Because the data starts on the driver, huge lists cause driver memory pressure; for real volume read from a source (Parquet/JDBC) instead. Type inference triggers a small scan of the rows, so an explicit schema (Q2) is both faster and safer.",
      sparkSql:
        "-- Spark SQL has no literal-tuple constructor as clean as the API, but you can:\n" +
        "SELECT * FROM VALUES\n" +
        "  (1, 'Asha', 'Engineering', 120000),\n" +
        "  (2, 'Ravi', 'Sales', 80000)\n" +
        "AS employees(employee_id, name, department, salary);",
      recognizeRecall: [
        "**Spot it:** any prompt that starts \"given this data…\" with an inline list — you must materialize a DataFrame first.",
        "**Say it:** `spark.createDataFrame(data, columns)`; types are inferred; it's driver-side so keep it small.",
        "**Trap:** forgetting the column-names argument leaves `_1.._4` headers."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "create-df-structtype",
      lc: 2,
      title: "Create a DataFrame with an explicit StructType schema",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "DataFrame creation", transformation: "Narrow (no shuffle)", functions: "StructType, StructField" },
      description:
        "Create a DataFrame using an **explicit** `StructType` schema instead of relying on type inference. Define each column's name, data type, and nullability, then pass the schema to `createDataFrame`.",
      notes: [
        "Explicit schemas skip the inference scan and guarantee the exact types you want.",
        "`nullable=True` lets a column hold nulls; `False` asserts it never does."
      ],
      examples: [
        {
          input: "schema = StructType([StructField('id', IntegerType()), StructField('salary', DoubleType())])",
          output: "DataFrame where id is int and salary is double — regardless of the sample rows",
          reasoning: "The declared types win; Spark does not sample the data to guess."
        }
      ],
      approaches: [
        {
          name: "StructType + StructField",
          whenToUse: "Whenever types matter (money as double, ids as int) or the data may be empty.",
          logic:
            "**What it asks.** Build a DataFrame whose column types are declared, not guessed.\n\n" +
            "**Key Idea.** A `StructType` is a list of `StructField(name, dataType, nullable)`. Passing it as the schema tells Spark exactly how to interpret each tuple position.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Import the types you need from `pyspark.sql.types`.\n" +
            "2. Build a `StructType([...])` with one `StructField` per column.\n" +
            "3. Pass `schema=` to `createDataFrame`.\n" +
            "4. `printSchema()` to verify.\n\n" +
            "**Why it works.** The declared schema is authoritative — no inference pass runs, and empty data still gets correct types.\n\n" +
            "**Common Gotchas.**\n" +
            "- Field order must match the tuple order.\n" +
            "- A value that doesn't fit its declared type becomes null (or errors) rather than being coerced silently.\n\n" +
            "**Interview mindset.** Say you prefer explicit schemas in production for stability and to avoid a costly inference scan on wide data.",
          rcs:
            "from pyspark.sql.types import StructType, StructField, IntegerType, StringType, DoubleType\n" +
            "\n" +
            "schema = StructType([                              # One StructField per column.\n" +
            "    StructField('employee_id', IntegerType(), False),  # not nullable\n" +
            "    StructField('name', StringType(), True),\n" +
            "    StructField('department', StringType(), True),\n" +
            "    StructField('salary', DoubleType(), True),\n" +
            "])\n" +
            "\n" +
            "data = [(1, 'Asha', 'Engineering', 120000.0)]\n" +
            "df = spark.createDataFrame(data, schema)          # Declared types win.\n" +
            "df.printSchema()",
          plain:
            "from pyspark.sql.types import StructType, StructField, IntegerType, StringType, DoubleType\n" +
            "\n" +
            "schema = StructType([\n" +
            "    StructField('employee_id', IntegerType(), False),\n" +
            "    StructField('name', StringType(), True),\n" +
            "    StructField('department', StringType(), True),\n" +
            "    StructField('salary', DoubleType(), True),\n" +
            "])\n" +
            "\n" +
            "data = [(1, 'Asha', 'Engineering', 120000.0)]\n" +
            "df = spark.createDataFrame(data, schema)\n" +
            "df.printSchema()"
        }
      ],
      sparkInternals:
        "An explicit schema removes the **inference scan** Spark otherwise runs to guess types — a real saving when reading wide files. In production, always pass a schema to readers (`spark.read.schema(...).csv/json`) so Spark doesn't read the file twice (once to infer, once to load). Schema is metadata only; declaring it is free and does not add a shuffle.",
      sparkSql:
        "-- Types come from the DDL string when creating a view/table:\n" +
        "CREATE OR REPLACE TEMP VIEW employees (\n" +
        "  employee_id INT, name STRING, department STRING, salary DOUBLE\n" +
        ") USING PARQUET OPTIONS (path 'employees.parquet');",
      recognizeRecall: [
        "**Spot it:** prompt says \"explicit schema\", \"define types\", or the data could be empty.",
        "**Say it:** `StructType([StructField(name, type, nullable), ...])`, pass as `schema=`.",
        "**Trap:** inference reads wide files twice — declaring the schema avoids that."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "select-columns",
      lc: 3,
      title: "Select specific columns from a DataFrame",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Projection", transformation: "Narrow (no shuffle)", functions: "select, col" },
      description:
        "From a wide DataFrame, return only the columns you need — e.g. keep `name` and `salary`, drop the rest. This is **projection** (column pruning).",
      examples: [
        {
          input: "df has [employee_id, name, department, salary]; select name, salary",
          output: "A DataFrame with just [name, salary]",
          reasoning: "select builds a new logical plan that projects only the requested columns."
        }
      ],
      approaches: [
        {
          name: "select by name / col()",
          whenToUse: "Any time you only need a subset of columns — do it early to prune I/O.",
          logic:
            "**What it asks.** Produce a DataFrame containing only the named columns.\n\n" +
            "**Key Idea.** `select` takes column expressions — string names or `col('x')` objects — and projects exactly those.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Decide the columns you need.\n" +
            "2. Call `df.select('name', 'salary')` or `df.select(col('name'), col('salary'))`.\n" +
            "3. Chain further transforms on the slimmer DataFrame.\n\n" +
            "**Why it works.** Projection is a narrow transformation — each row is trimmed independently, no data movement.\n\n" +
            "**Common Gotchas.**\n" +
            "- `col('x')` is needed when you want to apply expressions (alias, arithmetic); bare strings are fine for plain selection.\n" +
            "- Selecting early lets Spark's optimizer prune columns before joins/shuffles.\n\n" +
            "**Interview mindset.** Frame `select` as the first step of column pruning — cheaper joins and less shuffle downstream.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.select('name', 'salary')      # Project two columns by name.\n" +
            "# Equivalent, expression form (needed for alias/arithmetic):\n" +
            "result = df.select(col('name'), col('salary'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.select('name', 'salary')\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Projection is **narrow** — no shuffle. More importantly, the Catalyst optimizer pushes column pruning down to the scan, so on columnar formats (Parquet/ORC) Spark reads **only the selected columns' bytes** from disk. Selecting early is one of the cheapest, highest-impact optimizations (Q147, Q120).",
      sparkSql:
        "SELECT name, salary FROM employees;",
      recognizeRecall: [
        "**Spot it:** \"return only…\", \"keep columns…\", \"just name and salary\".",
        "**Say it:** `df.select(...)`; on Parquet it prunes columns at the scan.",
        "**Trap:** use `col()` when you need to alias or compute, not just name."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "filter-salary-gt",
      lc: 4,
      title: "Filter employees whose salary is greater than 100000",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Row filter (predicate)", transformation: "Narrow (no shuffle)", functions: "filter / where, col" },
      description:
        "Keep only the rows where `salary` exceeds 100000. `filter` and `where` are aliases — both apply a boolean predicate row-by-row.",
      examples: [
        {
          input: "salaries = [120000, 80000, 150000]",
          output: "rows with 120000 and 150000",
          reasoning: "The predicate salary > 100000 is evaluated independently per row."
        }
      ],
      approaches: [
        {
          name: "filter / where predicate",
          whenToUse: "Every row-level condition. Push filters as early as possible.",
          logic:
            "**What it asks.** Return the subset of rows satisfying `salary > 100000`.\n\n" +
            "**Key Idea.** A predicate is a `Column` of booleans; `filter` keeps rows where it is true.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write the condition: `col('salary') > 100000`.\n" +
            "2. Pass it to `df.filter(...)` (or `df.where(...)`).\n" +
            "3. Continue the pipeline on the reduced set.\n\n" +
            "**Why it works.** Filtering is narrow — each partition drops non-matching rows locally, no shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `col('salary') > 100000` or the SQL-string form `\"salary > 100000\"`; don't mix Python `and`/`or` with columns — use `&`/`|` with parentheses.\n" +
            "- Nulls fail the predicate and are dropped.\n\n" +
            "**Interview mindset.** Emphasize predicate pushdown: filtering before joins/aggregations shrinks the shuffle.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.filter(col('salary') > 100000)   # Keep high earners.\n" +
            "# where() is an exact alias:\n" +
            "result = df.where('salary > 100000')          # SQL-string form.\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.filter(col('salary') > 100000)\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`filter` is **narrow**. On columnar sources Catalyst applies **predicate pushdown** — the filter runs at the file scan (or even skips row groups via Parquet stats), so fewer bytes are read. Filtering early reduces every downstream shuffle. This is the workhorse of query optimization.",
      sparkSql:
        "SELECT * FROM employees WHERE salary > 100000;",
      recognizeRecall: [
        "**Spot it:** \"where…\", \"whose X is greater/less than…\", \"only rows that…\".",
        "**Say it:** `df.filter(col('salary') > 100000)`; filter early for pushdown.",
        "**Trap:** combine conditions with `&`/`|` and parentheses, never Python `and`/`or`."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "filter-dept-in",
      lc: 5,
      title: "Filter employees in Engineering or Data Science",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Membership filter", transformation: "Narrow (no shuffle)", functions: "isin, filter" },
      description:
        "Keep rows whose `department` is one of a set of values — here, `Engineering` or `Data Science`. Use `isin` for a clean membership test instead of chaining OR conditions.",
      examples: [
        {
          input: "departments = ['Engineering', 'Sales', 'Data Science']",
          output: "rows for Engineering and Data Science",
          reasoning: "isin(['Engineering', 'Data Science']) is true for those two rows."
        }
      ],
      approaches: [
        {
          name: "isin membership",
          whenToUse: "Matching a column against a fixed list of allowed values.",
          logic:
            "**What it asks.** Keep rows whose department is in a given set.\n\n" +
            "**Key Idea.** `col('department').isin('Engineering', 'Data Science')` returns a boolean column — cleaner than `(col==a) | (col==b)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. List the allowed values.\n" +
            "2. Build the predicate with `.isin(...)`.\n" +
            "3. Pass it to `filter`.\n\n" +
            "**Why it works.** Membership is evaluated per row; still a narrow transformation.\n\n" +
            "**Common Gotchas.**\n" +
            "- `isin` accepts either varargs or a single list — both work.\n" +
            "- Matching is case-sensitive; normalize with `lower()` if needed.\n\n" +
            "**Interview mindset.** Reach for `isin` to keep multi-value filters readable.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "wanted = ['Engineering', 'Data Science']\n" +
            "result = df.filter(col('department').isin(wanted))  # Membership test.\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "wanted = ['Engineering', 'Data Science']\n" +
            "result = df.filter(col('department').isin(wanted))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Still a **narrow** predicate with pushdown. `isin` compiles to an `IN` expression Catalyst can push to the scan. For very large value sets, a broadcast join against a small lookup DataFrame (Q141) can beat a giant `IN` list.",
      sparkSql:
        "SELECT * FROM employees WHERE department IN ('Engineering', 'Data Science');",
      recognizeRecall: [
        "**Spot it:** \"in either A or B\", \"one of these categories\", a fixed allow-list.",
        "**Say it:** `col('department').isin([...])` inside `filter`.",
        "**Trap:** case-sensitive — `lower()` both sides if the data is dirty."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "add-bonus-column",
      lc: 6,
      title: "Add a salary_after_bonus column (10% bonus)",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Derived column", transformation: "Narrow (no shuffle)", functions: "withColumn, col" },
      description:
        "Add a new column `salary_after_bonus` equal to `salary * 1.10` (a 10% bonus). `withColumn` adds or replaces a single column from an expression over existing columns.",
      examples: [
        {
          input: "salary = 100000",
          output: "salary_after_bonus = 110000.0",
          reasoning: "100000 * 1.10 = 110000, computed per row."
        }
      ],
      approaches: [
        {
          name: "withColumn expression",
          whenToUse: "Adding or overwriting one derived column from a formula.",
          logic:
            "**What it asks.** Append a computed column without dropping the originals.\n\n" +
            "**Key Idea.** `df.withColumn('new', <expr>)` returns a new DataFrame with the extra column; the expression is any `Column` computation.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write the formula: `col('salary') * 1.10`.\n" +
            "2. `df.withColumn('salary_after_bonus', formula)`.\n" +
            "3. Show / continue.\n\n" +
            "**Why it works.** The expression is applied row-wise — narrow, no shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- `withColumn` with an existing name **replaces** that column.\n" +
            "- Chaining many `withColumn` calls is fine but a single `select` with several expressions can be tidier for lots of new columns.\n\n" +
            "**Interview mindset.** Note that adding N columns is cleaner via one `select` than N `withColumn`s.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.withColumn(                       # Add a derived column.\n" +
            "    'salary_after_bonus',\n" +
            "    col('salary') * 1.10,                     # 10% bonus, computed per row.\n" +
            ")\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.withColumn('salary_after_bonus', col('salary') * 1.10)\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`withColumn` is **narrow**. Each call adds a projection node to the logical plan; Catalyst collapses adjacent projections, so a chain of `withColumn`s does not create extra stages. For many new columns prefer one `select(*exprs)` to keep the plan flat and readable.",
      sparkSql:
        "SELECT *, salary * 1.10 AS salary_after_bonus FROM employees;",
      recognizeRecall: [
        "**Spot it:** \"add a column\", \"create a new field\", \"compute X from Y\".",
        "**Say it:** `df.withColumn('name', expr)`; same-name replaces.",
        "**Trap:** many `withColumn`s → prefer a single `select` with all expressions."
      ]
    },

    // ------------------------------------------------------------------ Q7
    {
      id: "rename-columns",
      lc: 7,
      title: "Rename multiple columns",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Rename", transformation: "Narrow (no shuffle)", functions: "withColumnRenamed, toDF" },
      description:
        "Rename several columns at once — e.g. `name → employee_name`, `salary → base_salary`. Chain `withColumnRenamed`, or supply a whole new header list with `toDF`.",
      examples: [
        {
          input: "columns = [employee_id, name, salary]",
          output: "columns = [employee_id, employee_name, base_salary]",
          reasoning: "Each rename maps one old name to a new one; toDF replaces all names positionally."
        }
      ],
      approaches: [
        {
          name: "withColumnRenamed (chained)",
          whenToUse: "Renaming a handful of columns by name.",
          logic:
            "**What it asks.** Change the names of multiple columns.\n\n" +
            "**Key Idea.** `withColumnRenamed(old, new)` renames one column; chain it for several. `toDF(*names)` renames **all** columns positionally in one shot.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For a few renames, chain `withColumnRenamed` calls.\n" +
            "2. For a full rename, pass a complete name list to `toDF`.\n\n" +
            "**Why it works.** Renaming is metadata-only — no data touched, narrow.\n\n" +
            "**Common Gotchas.**\n" +
            "- `withColumnRenamed` on a non-existent name is a silent no-op.\n" +
            "- `toDF` requires **exactly** as many names as columns, in order.\n\n" +
            "**Interview mindset.** Show both; pick `toDF` for a full reheader, chaining for a couple.",
          rcs:
            "# Chained renames, one column at a time:\n" +
            "result = (df\n" +
            "    .withColumnRenamed('name', 'employee_name')\n" +
            "    .withColumnRenamed('salary', 'base_salary'))\n" +
            "\n" +
            "# Or replace ALL headers positionally:\n" +
            "result = df.toDF('employee_id', 'employee_name', 'base_salary')\n" +
            "result.show()",
          plain:
            "result = (df\n" +
            "    .withColumnRenamed('name', 'employee_name')\n" +
            "    .withColumnRenamed('salary', 'base_salary'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Renaming is pure **metadata** — no shuffle, no scan, effectively free. It only edits the schema attached to the logical plan. `toDF` is convenient but brittle: if the column count drifts, the positional mapping silently mislabels — prefer explicit `withColumnRenamed` when correctness matters.",
      sparkSql:
        "SELECT employee_id, name AS employee_name, salary AS base_salary FROM employees;",
      recognizeRecall: [
        "**Spot it:** \"rename\", \"alias columns\", \"change the header\".",
        "**Say it:** chain `withColumnRenamed`, or `toDF(*all_names)` for a full reheader.",
        "**Trap:** `toDF` needs the exact count/order; a wrong name in `withColumnRenamed` no-ops."
      ]
    },

    // ------------------------------------------------------------------ Q8
    {
      id: "drop-columns",
      lc: 8,
      title: "Drop unnecessary columns",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Projection (drop)", transformation: "Narrow (no shuffle)", functions: "drop" },
      description:
        "Remove one or more columns you no longer need with `drop`. It is the inverse of `select` and accepts several names at once.",
      examples: [
        {
          input: "columns = [id, name, ssn, salary]; drop ssn",
          output: "columns = [id, name, salary]",
          reasoning: "drop returns a new DataFrame without the named columns."
        }
      ],
      approaches: [
        {
          name: "drop by name",
          whenToUse: "When it's easier to name what to remove than what to keep.",
          logic:
            "**What it asks.** Return the DataFrame minus certain columns.\n\n" +
            "**Key Idea.** `df.drop('a', 'b')` projects away the listed columns.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. List the columns to remove.\n" +
            "2. Call `df.drop(*cols)`.\n\n" +
            "**Why it works.** Like `select`, it's a narrow projection.\n\n" +
            "**Common Gotchas.**\n" +
            "- Dropping a non-existent column is a **no-op**, not an error — typos pass silently.\n" +
            "- When keeping fewer columns than you drop, `select` reads clearer.\n\n" +
            "**Interview mindset.** Same pruning benefit as `select`; choose whichever expresses intent.",
          rcs:
            "result = df.drop('ssn', 'temp_flag')   # Remove sensitive / scratch columns.\n" +
            "result.show()",
          plain:
            "result = df.drop('ssn', 'temp_flag')\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`drop` is a **narrow** projection and enables the same column pruning at the scan as `select`. Because a missing name is silently ignored, it's safe to drop columns that may or may not exist — but that same leniency hides typos, so double-check names in tests.",
      sparkSql:
        "-- SQL has no DROP-column in SELECT; list the columns you keep:\n" +
        "SELECT id, name, salary FROM employees;",
      recognizeRecall: [
        "**Spot it:** \"remove columns\", \"drop the PII\", \"we don't need X\".",
        "**Say it:** `df.drop(*cols)`; inverse of select, same pruning.",
        "**Trap:** dropping an unknown column is silent — verify names."
      ]
    },

    // ------------------------------------------------------------------ Q9
    {
      id: "fill-null-salary",
      lc: 9,
      title: "Replace null salary values with 0",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Null handling", transformation: "Narrow (no shuffle)", functions: "fillna / na.fill" },
      description:
        "Replace nulls in the numeric `salary` column with `0`. `fillna` (alias `na.fill`) substitutes a default for nulls, optionally scoped to specific columns.",
      examples: [
        {
          input: "salary = [100000, null, 80000]",
          output: "salary = [100000, 0, 80000]",
          reasoning: "fillna(0, subset=['salary']) replaces only the null with 0."
        }
      ],
      approaches: [
        {
          name: "fillna with subset",
          whenToUse: "Giving numeric nulls a safe default before math/aggregation.",
          logic:
            "**What it asks.** Turn null salaries into 0.\n\n" +
            "**Key Idea.** `df.fillna(value, subset=[...])` replaces nulls **only** in the listed columns whose type matches the value.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Choose the fill value (`0`).\n" +
            "2. Scope it: `subset=['salary']` so other columns are untouched.\n" +
            "3. Call `df.fillna(0, subset=['salary'])`.\n\n" +
            "**Why it works.** Row-wise substitution — narrow.\n\n" +
            "**Common Gotchas.**\n" +
            "- Without a subset, `fillna(0)` fills every numeric column.\n" +
            "- The value's type must match the column (int/double for numbers, string for text).\n\n" +
            "**Interview mindset.** Mention that filling nulls before `sum/avg` avoids skewed results (nulls are ignored by aggregates but counts differ).",
          rcs:
            "result = df.fillna(0, subset=['salary'])   # Nulls in salary -> 0.\n" +
            "# na.fill is the same:\n" +
            "result = df.na.fill({'salary': 0})          # Dict form: per-column values.\n" +
            "result.show()",
          plain:
            "result = df.fillna(0, subset=['salary'])\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`fillna` is **narrow** (a per-row `coalesce`-style expression). It does not remove rows, so partition sizes are unchanged. Note aggregates like `avg` already **ignore** nulls — filling with 0 changes the average, so fill only when 0 is the correct business default.",
      sparkSql:
        "SELECT employee_id, name, department, COALESCE(salary, 0) AS salary FROM employees;",
      recognizeRecall: [
        "**Spot it:** \"replace nulls with…\", \"default missing values\".",
        "**Say it:** `df.fillna(0, subset=['salary'])` or `na.fill({'salary': 0})`.",
        "**Trap:** unscoped `fillna` hits all matching-type columns; filling changes averages."
      ]
    },

    // ------------------------------------------------------------------ Q10
    {
      id: "fill-null-department",
      lc: 10,
      title: "Replace null department values with \"Unknown\"",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Null handling", transformation: "Narrow (no shuffle)", functions: "fillna (string)" },
      description:
        "Replace nulls in the string column `department` with the literal `\"Unknown\"`. Same `fillna` idea as Q9, but with a string value scoped to a string column.",
      examples: [
        {
          input: "department = ['Sales', null, 'Engineering']",
          output: "department = ['Sales', 'Unknown', 'Engineering']",
          reasoning: "fillna('Unknown', subset=['department']) fills the missing category."
        }
      ],
      approaches: [
        {
          name: "fillna string",
          whenToUse: "Giving categorical nulls a labeled bucket so they group cleanly.",
          logic:
            "**What it asks.** Replace missing departments with a readable placeholder.\n\n" +
            "**Key Idea.** `fillna('Unknown', subset=['department'])` — a string value only affects string columns.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Pick the placeholder text.\n" +
            "2. Scope to the string column.\n" +
            "3. Call `fillna`.\n\n" +
            "**Why it works.** Per-row substitution, narrow.\n\n" +
            "**Common Gotchas.**\n" +
            "- A string fill silently skips numeric columns (type must match).\n" +
            "- Grouping later will now show an explicit `Unknown` bucket instead of a null group.\n\n" +
            "**Interview mindset.** Labeling nulls makes downstream `groupBy` results interpretable.",
          rcs:
            "result = df.fillna('Unknown', subset=['department'])  # Missing dept -> label.\n" +
            "result.show()",
          plain:
            "result = df.fillna('Unknown', subset=['department'])\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Identical execution profile to Q9 — **narrow**, no shuffle. The value's type gates which columns are affected, which is why a single `fillna` call can safely carry a dict of per-column defaults (`na.fill({'salary': 0, 'department': 'Unknown'})`) in one pass.",
      sparkSql:
        "SELECT employee_id, name, COALESCE(department, 'Unknown') AS department, salary FROM employees;",
      recognizeRecall: [
        "**Spot it:** \"unknown/other bucket\", \"replace missing category\".",
        "**Say it:** `fillna('Unknown', subset=['department'])`; combine numeric+string in one dict.",
        "**Trap:** the fill value's type decides which columns it touches."
      ]
    },

    // ------------------------------------------------------------------ Q11
    {
      id: "drop-null-customer",
      lc: 11,
      title: "Remove rows where customer_id is null",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Null handling", transformation: "Narrow (no shuffle)", functions: "dropna / na.drop" },
      description:
        "Drop rows missing a `customer_id`. `dropna(subset=['customer_id'])` removes rows where that key is null — essential before joins or grouping on the key.",
      examples: [
        {
          input: "customer_id = [1, null, 3]",
          output: "rows with 1 and 3",
          reasoning: "The middle row has a null key and is removed."
        }
      ],
      approaches: [
        {
          name: "dropna subset",
          whenToUse: "Discarding records that lack a required key.",
          logic:
            "**What it asks.** Keep only rows that have a `customer_id`.\n\n" +
            "**Key Idea.** `df.dropna(subset=['customer_id'])` drops rows where any listed column is null.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Identify the required column(s).\n" +
            "2. Call `dropna(subset=[...])`.\n\n" +
            "**Why it works.** Row-wise null test — narrow.\n\n" +
            "**Common Gotchas.**\n" +
            "- `how='any'` (default) drops if **any** subset column is null; `how='all'` needs them all null.\n" +
            "- Without a subset, `dropna()` drops rows with a null in **any** column — often too aggressive.\n\n" +
            "**Interview mindset.** Always scope with a subset; unscoped `dropna` can silently delete most of your data.",
          rcs:
            "result = df.dropna(subset=['customer_id'])   # Require a non-null key.\n" +
            "# na.drop is the same:\n" +
            "result = df.na.drop(subset=['customer_id'])\n" +
            "result.show()",
          plain:
            "result = df.dropna(subset=['customer_id'])\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`dropna` is a **narrow** filter (`IS NOT NULL`), pushdown-eligible. It shrinks partitions unevenly if nulls cluster, but adds no shuffle. Scoping matters: unscoped `dropna()` becomes `WHERE every_col IS NOT NULL`, which can wipe out valid rows that merely have an optional field missing.",
      sparkSql:
        "SELECT * FROM customers WHERE customer_id IS NOT NULL;",
      recognizeRecall: [
        "**Spot it:** \"remove rows missing…\", \"drop records without a key\".",
        "**Say it:** `df.dropna(subset=['customer_id'])`; default `how='any'`.",
        "**Trap:** unscoped `dropna()` drops a row if ANY column is null."
      ]
    },

    // ------------------------------------------------------------------ Q12
    {
      id: "dedup-customer",
      lc: 12,
      title: "Remove duplicate rows based on customer_id",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Deduplication", transformation: "Wide (shuffle)", functions: "dropDuplicates" },
      description:
        "Collapse rows so each `customer_id` appears once. `dropDuplicates(['customer_id'])` keeps one arbitrary row per key. (To keep a *specific* row — e.g. the latest — use a window; see Q68.)",
      examples: [
        {
          input: "customer_id = [1, 1, 2]",
          output: "one row for 1, one row for 2",
          reasoning: "Duplicate keys collapse to a single (arbitrary) row each."
        }
      ],
      approaches: [
        {
          name: "dropDuplicates on key",
          whenToUse: "De-duping on a subset of columns when any surviving row is acceptable.",
          logic:
            "**What it asks.** One row per `customer_id`.\n\n" +
            "**Key Idea.** `dropDuplicates(subset)` groups by the subset and keeps the first row it sees per group.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Choose the key columns.\n" +
            "2. Call `df.dropDuplicates(['customer_id'])`.\n\n" +
            "**Why it works.** Spark shuffles rows by the key so identical keys land together, then keeps one.\n\n" +
            "**Common Gotchas.**\n" +
            "- Which duplicate survives is **not deterministic** — don't rely on it for 'latest'.\n" +
            "- `distinct()` de-dupes on **all** columns; `dropDuplicates(subset)` on a chosen key.\n\n" +
            "**Interview mindset.** If the prompt says 'keep the latest/highest', pivot to a window `row_number` (Q68–Q70), not `dropDuplicates`.",
          rcs:
            "result = df.dropDuplicates(['customer_id'])   # One (arbitrary) row per key.\n" +
            "result.show()",
          plain:
            "result = df.dropDuplicates(['customer_id'])\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "This is **wide** — `dropDuplicates` on a key shuffles rows by that key (a hash partition) so duplicates meet, then keeps one per group. Cost scales with data volume and key skew. When you need the *specific* winner, `row_number()` over a window is the deterministic pattern and shuffles similarly but lets you order within the key.",
      sparkSql:
        "-- Keep one row per key (arbitrary):\n" +
        "SELECT * FROM (\n" +
        "  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY customer_id) AS rn\n" +
        "  FROM customers\n" +
        ") WHERE rn = 1;",
      recognizeRecall: [
        "**Spot it:** \"remove duplicates by key\", \"one row per customer\".",
        "**Say it:** `dropDuplicates(['customer_id'])` (wide/shuffle); `distinct()` = all columns.",
        "**Trap:** survivor is non-deterministic — use `row_number` for 'latest'."
      ]
    },

    // ------------------------------------------------------------------ Q13
    {
      id: "count-rows",
      lc: 13,
      title: "Count the total number of rows",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Action / count", transformation: "Wide (shuffle)", functions: "count" },
      description:
        "Return the total row count of a DataFrame with `df.count()` — an **action** that triggers execution and returns a single integer to the driver.",
      examples: [
        {
          input: "a 3-row DataFrame",
          output: "3",
          reasoning: "count() sums per-partition counts into one number."
        }
      ],
      approaches: [
        {
          name: "count()",
          whenToUse: "Sanity checks, row totals, before/after comparisons.",
          logic:
            "**What it asks.** How many rows are there?\n\n" +
            "**Key Idea.** `df.count()` is an action: it runs the whole plan and returns an `int`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build/transform the DataFrame.\n" +
            "2. Call `df.count()`.\n\n" +
            "**Why it works.** Each partition counts locally; the driver sums the partial counts.\n\n" +
            "**Common Gotchas.**\n" +
            "- `count()` re-executes the plan every call — `cache()` first if you'll count repeatedly.\n" +
            "- Unlike SQL `COUNT(col)`, `df.count()` counts rows including nulls.\n\n" +
            "**Interview mindset.** Distinguish transformations (lazy) from actions (`count`, `collect`, `show`) that trigger a job.",
          rcs:
            "n = df.count()          # Action: triggers a job, returns an int.\n" +
            "print(n)",
          plain:
            "n = df.count()\n" +
            "print(n)"
        }
      ],
      sparkInternals:
        "`count()` triggers a job with a final **shuffle/aggregate** to combine per-partition counts (small — only the partial sums move). It's an **action**, so it re-runs the upstream plan each time; if you count the same transformed DataFrame repeatedly, `cache()`/`persist()` it first (Q152) to avoid recomputation.",
      sparkSql:
        "SELECT COUNT(*) AS total_rows FROM customers;",
      recognizeRecall: [
        "**Spot it:** \"how many rows\", \"total count\".",
        "**Say it:** `df.count()` — an action; counts nulls too.",
        "**Trap:** repeated counts recompute — cache the DataFrame first."
      ]
    },

    // ------------------------------------------------------------------ Q14
    {
      id: "count-distinct-customers",
      lc: 14,
      title: "Count the number of distinct customers",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Distinct count", transformation: "Wide (shuffle)", functions: "distinct, countDistinct" },
      description:
        "Count unique `customer_id` values. Either `df.select('customer_id').distinct().count()`, or an aggregate `countDistinct('customer_id')`.",
      examples: [
        {
          input: "customer_id = [1, 1, 2, 3]",
          output: "3",
          reasoning: "Distinct ids are {1, 2, 3}."
        }
      ],
      approaches: [
        {
          name: "distinct().count() vs countDistinct()",
          whenToUse: "distinct+count for a single figure; countDistinct inside a wider agg.",
          logic:
            "**What it asks.** How many unique customers exist?\n\n" +
            "**Key Idea.** Two idioms: `select(key).distinct().count()`, or `agg(countDistinct(key))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Project the key column.\n" +
            "2. Either `.distinct().count()`, or `df.agg(countDistinct('customer_id'))`.\n\n" +
            "**Why it works.** Both shuffle by the key to find unique values, then count.\n\n" +
            "**Common Gotchas.**\n" +
            "- For huge cardinality, `approx_count_distinct` (HyperLogLog) is far cheaper if an estimate is acceptable.\n" +
            "- `countDistinct` fits naturally alongside other aggregates in one `agg`.\n\n" +
            "**Interview mindset.** Offer `approx_count_distinct` for scale when exactness isn't required.",
          rcs:
            "from pyspark.sql.functions import countDistinct\n" +
            "\n" +
            "n = df.select('customer_id').distinct().count()      # Idiom 1.\n" +
            "df.agg(countDistinct('customer_id').alias('n')).show()  # Idiom 2.",
          plain:
            "from pyspark.sql.functions import countDistinct\n" +
            "\n" +
            "n = df.select('customer_id').distinct().count()\n" +
            "df.agg(countDistinct('customer_id').alias('n')).show()"
        }
      ],
      sparkInternals:
        "Distinct counting is **wide**: rows shuffle by the key so duplicates collapse, then the uniques are counted. It's memory-heavy for high cardinality. `approx_count_distinct(col, rsd)` uses HyperLogLog to estimate within a target relative error with a fraction of the shuffle — the standard scale trick.",
      sparkSql:
        "SELECT COUNT(DISTINCT customer_id) AS distinct_customers FROM customers;",
      recognizeRecall: [
        "**Spot it:** \"how many unique/distinct…\".",
        "**Say it:** `distinct().count()` or `countDistinct`; `approx_count_distinct` at scale.",
        "**Trap:** exact distinct is a heavy shuffle for high-cardinality keys."
      ]
    },

    // ------------------------------------------------------------------ Q15
    {
      id: "string-to-date",
      lc: 15,
      title: "Convert a string column into a DateType",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Type cast / parsing", transformation: "Narrow (no shuffle)", functions: "to_date" },
      description:
        "Parse a string column like `'2026-08-26'` into a proper `DateType` using `to_date`, supplying the format when it isn't ISO. Proper date types enable date math and correct sorting.",
      examples: [
        {
          input: "order_date = '2026-08-26' (string)",
          output: "order_date = 2026-08-26 (date)",
          reasoning: "to_date parses the string with the given/ISO pattern into a DateType."
        }
      ],
      approaches: [
        {
          name: "to_date with format",
          whenToUse: "Whenever dates arrive as strings and you need date operations.",
          logic:
            "**What it asks.** Turn a date-looking string into an actual date column.\n\n" +
            "**Key Idea.** `to_date(col, fmt)` parses per the pattern; ISO `yyyy-MM-dd` needs no format.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Identify the incoming string pattern.\n" +
            "2. `withColumn('order_date', to_date(col('order_date'), 'yyyy-MM-dd'))`.\n" +
            "3. Verify with `printSchema`.\n\n" +
            "**Why it works.** Parsing is per-row — narrow.\n\n" +
            "**Common Gotchas.**\n" +
            "- Unparseable strings become **null** (they don't error) — check for nulls after.\n" +
            "- Use `to_timestamp` when there's a time component.\n\n" +
            "**Interview mindset.** Always pass the explicit format for non-ISO inputs to avoid surprises.",
          rcs:
            "from pyspark.sql.functions import to_date, col\n" +
            "\n" +
            "result = df.withColumn(                       # Replace string with a date.\n" +
            "    'order_date',\n" +
            "    to_date(col('order_date'), 'yyyy-MM-dd'),\n" +
            ")\n" +
            "result.printSchema()",
          plain:
            "from pyspark.sql.functions import to_date, col\n" +
            "\n" +
            "result = df.withColumn('order_date', to_date(col('order_date'), 'yyyy-MM-dd'))\n" +
            "result.printSchema()"
        }
      ],
      sparkInternals:
        "Parsing is a **narrow** per-row expression. The real win is downstream: a true `DateType` sorts chronologically and supports `datediff`, `months_between`, partition pruning on date columns, etc. Storing dates as strings breaks range filters and inflates storage — cast at ingestion.",
      sparkSql:
        "SELECT *, TO_DATE(order_date, 'yyyy-MM-dd') AS order_date_parsed FROM orders;",
      recognizeRecall: [
        "**Spot it:** \"convert string to date\", \"parse the date column\".",
        "**Say it:** `to_date(col, 'yyyy-MM-dd')`; `to_timestamp` if time is present.",
        "**Trap:** bad strings become null, not errors — validate after parsing."
      ]
    },

    // ------------------------------------------------------------------ Q16
    {
      id: "extract-date-parts",
      lc: 16,
      title: "Extract year, month, and day from a date",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Date parts", transformation: "Narrow (no shuffle)", functions: "year, month, dayofmonth" },
      description:
        "From a date/timestamp column, derive separate `year`, `month`, and `day` columns using the built-in `year`, `month`, and `dayofmonth` functions.",
      examples: [
        {
          input: "order_date = 2026-08-26",
          output: "year = 2026, month = 8, day = 26",
          reasoning: "Each function extracts one component from the date."
        }
      ],
      approaches: [
        {
          name: "year / month / dayofmonth",
          whenToUse: "Building calendar dimensions or partition columns from a date.",
          logic:
            "**What it asks.** Split a date into its numeric parts.\n\n" +
            "**Key Idea.** `year()`, `month()`, `dayofmonth()` each return an int column from a date.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Ensure the column is a date (Q15) — cast first if it's a string.\n" +
            "2. Add three columns via `select`/`withColumn`.\n\n" +
            "**Why it works.** Per-row extraction — narrow.\n\n" +
            "**Common Gotchas.**\n" +
            "- Running these on a **string** column implicitly parses it; explicit `to_date` first is safer.\n" +
            "- For partitioning, `year`+`month` columns enable partition pruning later (Q145–Q146).\n\n" +
            "**Interview mindset.** Tie this to partitioning: extracting year/month is how you build write-time partitions.",
          rcs:
            "from pyspark.sql.functions import year, month, dayofmonth, col\n" +
            "\n" +
            "result = (df\n" +
            "    .withColumn('year', year(col('order_date')))\n" +
            "    .withColumn('month', month(col('order_date')))\n" +
            "    .withColumn('day', dayofmonth(col('order_date'))))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import year, month, dayofmonth, col\n" +
            "\n" +
            "result = (df\n" +
            "    .withColumn('year', year(col('order_date')))\n" +
            "    .withColumn('month', month(col('order_date')))\n" +
            "    .withColumn('day', dayofmonth(col('order_date'))))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "All **narrow**. These derived integer columns are ideal partition keys: writing `partitionBy('year','month')` (Q145) creates a directory layout Spark can prune when queries filter on year/month, reading only the relevant folders. Extracting parts is the first step of that optimization.",
      sparkSql:
        "SELECT *, YEAR(order_date) AS year, MONTH(order_date) AS month, DAY(order_date) AS day FROM orders;",
      recognizeRecall: [
        "**Spot it:** \"break date into year/month/day\", \"monthly bucket\".",
        "**Say it:** `year()/month()/dayofmonth()`; cast to date first.",
        "**Trap:** these feed partition columns — think pruning downstream."
      ]
    },

    // ------------------------------------------------------------------ Q17
    {
      id: "sort-salary-desc",
      lc: 17,
      title: "Sort employees by salary descending",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Global sort", transformation: "Wide (shuffle)", functions: "orderBy, desc" },
      description:
        "Order the whole DataFrame by `salary` from highest to lowest with `orderBy(col('salary').desc())`.",
      examples: [
        {
          input: "salaries = [80000, 150000, 120000]",
          output: "150000, 120000, 80000",
          reasoning: "Descending order puts the largest first."
        }
      ],
      approaches: [
        {
          name: "orderBy desc",
          whenToUse: "Producing a globally ordered result (top-of-list reports).",
          logic:
            "**What it asks.** Return rows sorted by salary, largest first.\n\n" +
            "**Key Idea.** `df.orderBy(col('salary').desc())` (alias `sort`) produces a total ordering.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Pick the sort key and direction.\n" +
            "2. `orderBy(col('salary').desc())`; add tie-breakers as extra keys.\n\n" +
            "**Why it works.** A global sort range-partitions then sorts within partitions.\n\n" +
            "**Common Gotchas.**\n" +
            "- `orderBy` is a **full shuffle**; if you only want the top N, `df.orderBy(...).limit(N)` lets Spark optimize, or use a window per group.\n" +
            "- Nulls sort first/last — control with `desc_nulls_last()`.\n\n" +
            "**Interview mindset.** Flag that global sorts are expensive; prefer `limit` or per-group ranking when you don't need everything ordered.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.orderBy(col('salary').desc())    # Highest salary first.\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.orderBy(col('salary').desc())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A global `orderBy` is **wide**: Spark uses **range partitioning** (sampling the key to pick boundaries) so partitions are globally ordered, then sorts each locally. It's one of the pricier operations. `sortWithinPartitions` avoids the range shuffle when only per-partition order is needed, and `limit(N)` after a sort enables a cheaper top-N plan.",
      sparkSql:
        "SELECT * FROM employees ORDER BY salary DESC;",
      recognizeRecall: [
        "**Spot it:** \"sort by\", \"order descending\", \"ranked list\".",
        "**Say it:** `orderBy(col('salary').desc())`; it's a full shuffle.",
        "**Trap:** for top-N add `.limit(N)`; for per-group use a window, not a global sort."
      ]
    },

    // ------------------------------------------------------------------ Q18
    {
      id: "filter-between",
      lc: 18,
      title: "Filter orders where amount is between 100 and 500",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Range filter", transformation: "Narrow (no shuffle)", functions: "between, filter" },
      description:
        "Keep orders whose `order_amount` falls in the inclusive range [100, 500] using `col('order_amount').between(100, 500)`.",
      examples: [
        {
          input: "order_amount = [50, 250, 600]",
          output: "row with 250",
          reasoning: "between(100, 500) is inclusive, so only 250 qualifies."
        }
      ],
      approaches: [
        {
          name: "between (inclusive)",
          whenToUse: "Inclusive numeric or date ranges.",
          logic:
            "**What it asks.** Keep rows with amount in [100, 500].\n\n" +
            "**Key Idea.** `col('order_amount').between(100, 500)` is a readable inclusive-range predicate.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write `between(lo, hi)`.\n" +
            "2. Pass to `filter`.\n\n" +
            "**Why it works.** Row-wise predicate — narrow, pushdown-eligible.\n\n" +
            "**Common Gotchas.**\n" +
            "- `between` is **inclusive** on both ends; for exclusive bounds write `(c > lo) & (c < hi)`.\n" +
            "- Works for dates too.\n\n" +
            "**Interview mindset.** Prefer `between` for readability, but state that it's inclusive.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.filter(col('order_amount').between(100, 500))  # Inclusive range.\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "result = df.filter(col('order_amount').between(100, 500))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A range predicate is **narrow** and pushdown-friendly: on Parquet, min/max statistics per row group let Spark **skip** entire blocks outside [100, 500] without decoding them (data skipping). Range filters on sorted/clustered columns are especially cheap.",
      sparkSql:
        "SELECT * FROM orders WHERE order_amount BETWEEN 100 AND 500;",
      recognizeRecall: [
        "**Spot it:** \"between X and Y\", \"in the range\".",
        "**Say it:** `col('order_amount').between(100, 500)` — inclusive.",
        "**Trap:** need exclusive? spell out `>` and `<` yourself."
      ]
    },

    // ------------------------------------------------------------------ Q19
    {
      id: "order-category-when",
      lc: 19,
      title: "Bucket orders into Low / Medium / High",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "Conditional / CASE", transformation: "Narrow (no shuffle)", functions: "when, otherwise" },
      description:
        "Create `order_category`: `< 100 → Low`, `100–500 → Medium`, `> 500 → High`. Use chained `when(...).when(...).otherwise(...)` — PySpark's CASE expression.",
      examples: [
        {
          input: "order_amount = [50, 250, 900]",
          output: "['Low', 'Medium', 'High']",
          reasoning: "Each amount falls into exactly one bucket by the thresholds."
        }
      ],
      approaches: [
        {
          name: "when / otherwise chain",
          whenToUse: "Any multi-branch conditional derived column (CASE WHEN).",
          logic:
            "**What it asks.** Label each order by size band.\n\n" +
            "**Key Idea.** `when(cond, value)` chains into `.when(...)` and ends with `.otherwise(default)` — evaluated top-down, first match wins.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `when(col('order_amount') < 100, 'Low')`.\n" +
            "2. `.when(col('order_amount') <= 500, 'Medium')`.\n" +
            "3. `.otherwise('High')`.\n" +
            "4. Wrap in `withColumn('order_category', ...)`.\n\n" +
            "**Why it works.** Order matters: the second branch only fires for amounts ≥ 100 because the first already caught the rest. Narrow.\n\n" +
            "**Common Gotchas.**\n" +
            "- Without `otherwise`, unmatched rows get **null**.\n" +
            "- Mind boundary conditions (`<` vs `<=`) so 100 and 500 land where intended.\n\n" +
            "**Interview mindset.** Call it the DataFrame `CASE WHEN`; note that branch order encodes the ranges.",
          rcs:
            "from pyspark.sql.functions import when, col\n" +
            "\n" +
            "result = df.withColumn(\n" +
            "    'order_category',\n" +
            "    when(col('order_amount') < 100, 'Low')          # first match wins\n" +
            "    .when(col('order_amount') <= 500, 'Medium')     # 100..500\n" +
            "    .otherwise('High'),                             # > 500\n" +
            ")\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import when, col\n" +
            "\n" +
            "result = df.withColumn(\n" +
            "    'order_category',\n" +
            "    when(col('order_amount') < 100, 'Low')\n" +
            "    .when(col('order_amount') <= 500, 'Medium')\n" +
            "    .otherwise('High'),\n" +
            ")\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`when/otherwise` compiles to a Catalyst `CASE WHEN` — a **narrow**, vectorized expression with no shuffle and no Python overhead. This is the idiomatic, UDF-free way to branch (Q143–Q144): keep logic in built-in expressions so the optimizer and codegen can accelerate it.",
      sparkSql:
        "SELECT *,\n" +
        "  CASE WHEN order_amount < 100 THEN 'Low'\n" +
        "       WHEN order_amount <= 500 THEN 'Medium'\n" +
        "       ELSE 'High' END AS order_category\n" +
        "FROM orders;",
      recognizeRecall: [
        "**Spot it:** \"bucket/label into categories\", \"CASE WHEN\", tiered thresholds.",
        "**Say it:** `when(...).when(...).otherwise(...)`; first match wins.",
        "**Trap:** no `otherwise` → nulls; watch `<` vs `<=` at the boundaries."
      ]
    },

    // ------------------------------------------------------------------ Q20
    {
      id: "lower-trim-string",
      lc: 20,
      title: "Lowercase and trim a string column",
      difficulty: "Easy",
      category: "DataFrame Basics",
      meta: { pattern: "String cleaning", transformation: "Narrow (no shuffle)", functions: "lower, trim" },
      description:
        "Normalize a text column by removing leading/trailing spaces and converting to lowercase — `trim` then `lower`. Essential before grouping or joining on text keys.",
      examples: [
        {
          input: "name = '  Asha  '",
          output: "name = 'asha'",
          reasoning: "trim strips the spaces; lower converts to lowercase."
        }
      ],
      approaches: [
        {
          name: "lower(trim(col))",
          whenToUse: "Cleaning text keys so equal-but-messy values match.",
          logic:
            "**What it asks.** Standardize a string: no padding, all lowercase.\n\n" +
            "**Key Idea.** Compose built-ins: `lower(trim(col('name')))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `trim` to remove surrounding whitespace.\n" +
            "2. `lower` to normalize case.\n" +
            "3. Assign back via `withColumn`.\n\n" +
            "**Why it works.** Both are per-row string functions — narrow.\n\n" +
            "**Common Gotchas.**\n" +
            "- Interior double-spaces remain; use `regexp_replace` for those.\n" +
            "- Normalize **both** sides of a join key, or matches silently fail.\n\n" +
            "**Interview mindset.** Frame text normalization as a prerequisite for reliable joins/groupings.",
          rcs:
            "from pyspark.sql.functions import lower, trim, col\n" +
            "\n" +
            "result = df.withColumn(                       # Clean the key column.\n" +
            "    'name',\n" +
            "    lower(trim(col('name'))),                 # trim first, then lowercase.\n" +
            ")\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import lower, trim, col\n" +
            "\n" +
            "result = df.withColumn('name', lower(trim(col('name'))))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "String cleaning is **narrow** and codegen-friendly — no shuffle. Its impact shows up at the **next** shuffle: unnormalized keys create phantom distinct values, inflating group counts and breaking joins. Clean keys once, early, so downstream `groupBy`/`join` partition correctly.",
      sparkSql:
        "SELECT *, LOWER(TRIM(name)) AS name_clean FROM employees;",
      recognizeRecall: [
        "**Spot it:** \"normalize\", \"trim spaces\", \"case-insensitive match\".",
        "**Say it:** `lower(trim(col('name')))`; `regexp_replace` for inner spaces.",
        "**Trap:** normalize both join sides or keys won't match."
      ]
    }

  ]);
})();
