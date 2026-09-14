/*
 * PySpark Interview Lab — Bad-data & Read-config problems (folded into
 * "Nulls & Data Quality"). Handling malformed input, enforcing schemas, and
 * quarantining rejects — the ingestion-hardening skills DE rounds probe.
 */
(function () {
  var CAT = "Nulls & Data Quality";
  window.PYSPARK.register(CAT, [

    {
      id: "handle-corrupt-records-modes",
      lc: 294,
      title: "Handle corrupt records (mode + quarantine)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Bad-record handling", transformation: "Read", functions: "mode, PERMISSIVE, columnNameOfCorruptRecord" },
      description:
        "You ingest daily JSON where a few lines are malformed. Requirements: **don't fail the job**, but **keep the bad rows for an audit** instead of silently dropping them. Read the data so good rows parse and bad rows are quarantined.",
      examples: [
        { input: "1000 JSON lines, 7 malformed", output: "993 clean rows + 7 rows captured in a _corrupt_record column", reasoning: "PERMISSIVE mode nulls the unparseable fields and stashes the raw text so you can audit rejects." }
      ],
      approaches: [
        {
          name: "PERMISSIVE + _corrupt_record split",
          whenToUse: "Untrusted feeds where you must survive and audit bad rows.",
          logic:
            "**What it asks.** Parse good rows, keep bad ones for review, never fail.\n\n" +
            "**Key Idea.** The reader `mode` controls bad-row behavior: **PERMISSIVE** (default) nulls unparseable fields and, if you add a `columnNameOfCorruptRecord` column to the schema, stores the raw text there. **DROPMALFORMED** silently drops; **FAILFAST** throws.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Define the schema *plus* a string column (e.g. `_corrupt_record`).\n" +
            "2. Read with `mode='PERMISSIVE'` and `columnNameOfCorruptRecord='_corrupt_record'`.\n" +
            "3. Split: rejects = rows where `_corrupt_record` is not null; clean = the rest.\n\n" +
            "**Why it works.** Spark routes unparseable input into the corrupt column instead of failing, so you get both a clean set and an auditable reject set.\n\n" +
            "**Common Gotchas.**\n" +
            "- The corrupt column must be declared in the schema or it's dropped.\n" +
            "- Referencing only `_corrupt_record` can require a cache/checkpoint due to lazy parsing.\n\n" +
            "**Interview mindset.** Name the three modes and when each fits; quarantine beats drop for DQ.",
          rcs:
            "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
            "schema = StructType([\n" +
            "    StructField('id', IntegerType()), StructField('name', StringType()),\n" +
            "    StructField('_corrupt_record', StringType())])   # must be in schema\n" +
            "df = (spark.read.schema(schema)\n" +
            "        .option('mode', 'PERMISSIVE')\n" +
            "        .option('columnNameOfCorruptRecord', '_corrupt_record')\n" +
            "        .json('/landing/events'))\n" +
            "rejects = df.filter(df._corrupt_record.isNotNull())   # audit these\n" +
            "clean   = df.filter(df._corrupt_record.isNull()).drop('_corrupt_record')",
          plain:
            "df = (spark.read.schema(schema)\n" +
            "        .option('mode','PERMISSIVE')\n" +
            "        .option('columnNameOfCorruptRecord','_corrupt_record')\n" +
            "        .json('/landing/events'))\n" +
            "rejects = df.filter(df._corrupt_record.isNotNull())\n" +
            "clean   = df.filter(df._corrupt_record.isNull()).drop('_corrupt_record')"
        }
      ],
      sparkInternals:
        "The CSV/JSON parser applies `mode` per record: PERMISSIVE fills unparseable fields with null and writes the raw line to the corrupt column (if declared); DROPMALFORMED filters them during parse; FAILFAST raises on the first bad record. Because parsing is lazy, isolating only the corrupt column sometimes needs a cache/checkpoint so Spark re-reads consistently.",
      sparkSql:
        "-- No pure-SQL equivalent for parse modes; it's a reader option.\n-- After load: SELECT * FROM events WHERE _corrupt_record IS NOT NULL;",
      recognizeRecall: [
        "**Spot it:** \"survive malformed rows but keep them for audit\".",
        "**Say it:** PERMISSIVE + columnNameOfCorruptRecord, then split on it.",
        "**Trap:** declare the corrupt column in the schema; DROPMALFORMED loses evidence."
      ]
    },

    {
      id: "enforce-ddl-schema-on-read",
      lc: 295,
      title: "Enforce an explicit schema on read",
      difficulty: "Easy",
      category: CAT,
      meta: { pattern: "Schema enforcement", transformation: "Read", functions: "schema, StructType, DDL string" },
      description:
        "A CSV of `customer_id` (like `007123`), `signup_ts`, `balance` reads slowly and mangles types — IDs lose leading zeros, dates become strings. **Read it in one pass with correct, pinned types.**",
      examples: [
        { input: "customer_id '007123', signup_ts '2024-06-01', balance '12.50'", output: "id kept as string '007123'; ts as timestamp; balance as double — in a single read pass", reasoning: "An explicit schema avoids the inference pass and pins each column's type, preserving leading zeros." }
      ],
      approaches: [
        {
          name: "Explicit schema (DDL string or StructType)",
          whenToUse: "Any production read — never trust inferSchema.",
          logic:
            "**What it asks.** Read once, with deterministic types, preserving string-like IDs.\n\n" +
            "**Key Idea.** `inferSchema=True` makes an **extra full pass** and guesses (turning `007123` into an int, dropping zeros). An **explicit schema** reads in one pass and fixes every type.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write a DDL schema string (concise) or a `StructType`.\n" +
            "2. Pin `customer_id` to `string` to keep leading zeros; `signup_ts` to `timestamp`.\n" +
            "3. Pass `schema=...`; do **not** set `inferSchema`.\n\n" +
            "**Why it works.** With types declared, Spark parses directly — one pass, no guessing.\n\n" +
            "**Common Gotchas.**\n" +
            "- Numeric-looking keys/zip codes must be strings or they lose zeros.\n" +
            "- Timestamp parsing may need `timestampFormat`.\n\n" +
            "**Interview mindset.** 'Explicit schema = one pass + deterministic types.'",
          rcs:
            "schema = 'customer_id string, signup_ts timestamp, balance double'  # DDL string\n" +
            "df = (spark.read\n" +
            "        .option('header', True)\n" +
            "        .schema(schema)                 # no inferSchema -> single pass\n" +
            "        .csv('/landing/customers.csv'))\n" +
            "# customer_id keeps '007123'; signup_ts is a real timestamp.",
          plain:
            "schema = 'customer_id string, signup_ts timestamp, balance double'\n" +
            "df = spark.read.option('header', True).schema(schema).csv('/landing/customers.csv')"
        }
      ],
      sparkInternals:
        "inferSchema samples/scans the file to deduce types (an extra job) and applies heuristics that can misclassify. Supplying a schema skips inference entirely: the reader parses each field to the declared type in the same pass it reads bytes. DDL strings compile to the same StructType, so use whichever is more readable.",
      sparkSql:
        "-- DDL: CREATE TABLE customers (customer_id STRING, signup_ts TIMESTAMP, balance DOUBLE)\n--      USING csv OPTIONS (path '...', header 'true');",
      recognizeRecall: [
        "**Spot it:** \"IDs lost leading zeros / read is slow before work\".",
        "**Say it:** explicit schema (StructType/DDL) → one pass, pinned types.",
        "**Trap:** numeric-looking keys must be string; avoid inferSchema in prod."
      ]
    },

    {
      id: "quarantine-failed-casts",
      lc: 296,
      title: "Flag rows that fail a cast",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Data-quality audit", transformation: "Narrow", functions: "cast, isNull, isNotNull" },
      description:
        "A string `amount` column should be numeric, but some rows contain junk like `'N/A'`. Casting silently turns those into null. **Separate cleanly-cast rows from rows whose value failed to parse** (distinguishing a real null from a bad string).",
      examples: [
        { input: "amount = ['100', 'N/A', null, '50']", output: "clean: 100, (null stays null), 50 ; rejects: 'N/A'", reasoning: "cast('N/A') → null; a row is a reject only if the original was non-null but became null after cast." }
      ],
      approaches: [
        {
          name: "Cast + not-null-before / null-after test",
          whenToUse: "Validating a type conversion instead of trusting it.",
          logic:
            "**What it asks.** Catch values that failed to cast, without confusing them with genuine nulls.\n\n" +
            "**Key Idea.** An invalid `cast` returns **null, not an error** — so a botched conversion is invisible. A row *failed* the cast iff the original was **not null** but the cast result **is null**.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Add `amount_num = col('amount').cast('double')`.\n" +
            "2. rejects = `amount IS NOT NULL AND amount_num IS NULL`.\n" +
            "3. clean = everything else (keeps real nulls as null).\n\n" +
            "**Why it works.** The two-condition test isolates parse failures from legitimately missing data.\n\n" +
            "**Common Gotchas.**\n" +
            "- Just checking `amount_num IS NULL` also flags real nulls — wrong.\n" +
            "- `try_cast` (newer Spark) makes intent explicit but has the same null result.\n\n" +
            "**Interview mindset.** 'Casts fail silently to null; validate before trusting.'",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "d = df.withColumn('amount_num', col('amount').cast('double'))\n" +
            "rejects = d.filter(col('amount').isNotNull() & col('amount_num').isNull())\n" +
            "clean   = d.filter(~(col('amount').isNotNull() & col('amount_num').isNull()))\n" +
            "# inspect 'rejects' (e.g. 'N/A') before trusting the cast",
          plain:
            "from pyspark.sql.functions import col\n" +
            "d = df.withColumn('amount_num', col('amount').cast('double'))\n" +
            "rejects = d.filter(col('amount').isNotNull() & col('amount_num').isNull())\n" +
            "clean   = d.subtract(rejects)"
        }
      ],
      sparkInternals:
        "Spark's default `cast` follows SQL semantics: an unparseable value yields null rather than raising, so type errors don't surface. The not-null-before / null-after predicate is the standard way to audit conversions. Newer Spark adds `try_cast` (explicit) and ANSI mode (`spark.sql.ansi.enabled`) which instead *throws* on bad casts.",
      sparkSql:
        "SELECT * FROM (SELECT *, CAST(amount AS DOUBLE) amount_num FROM t)\nWHERE amount IS NOT NULL AND amount_num IS NULL;",
      recognizeRecall: [
        "**Spot it:** \"column went all/partly null after a cast\".",
        "**Say it:** reject = original not-null AND cast result null.",
        "**Trap:** casts fail silently to null; ANSI mode / try_cast change this."
      ]
    }

  ]);
})();
