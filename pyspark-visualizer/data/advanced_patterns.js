/*
 * PySpark Interview Lab — Advanced Patterns (Medium/Hard)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * These are specialized, production-shaped patterns that each teach a topic not
 * covered elsewhere: reshaping with pivot/unpivot, extracting structure from raw
 * text with regex, and the two pillars of a Lakehouse ingestion layer — SCD Type 2
 * history and incremental CDC upserts — plus a cohort-retention (D1/D7/D30) rollup.
 * Recurring cost themes: pivot needs a distinct-values pass then a shuffle; Delta
 * MERGE rewrites whole files (copy-on-write); dedupe-to-latest and self-joins are
 * shuffle-heavy, so reduce before you merge and partition to prune file scans.
 */
(function () {
  var CAT = "Advanced Patterns";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q201
    {
      id: "pivot-unpivot-monthly-sales",
      lc: 201,
      title: "Pivot monthly sales into columns, and unpivot back",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Reshape long <-> wide (pivot / unpivot)", transformation: "Wide (shuffle)", functions: "groupBy, pivot, agg, stack, selectExpr" },
      description:
        "Given a long `sales` DataFrame (`product_id`, `sale_month`, `revenue`) with one row per product per month, reshape it **wide** so there is one row per product and one column per month (`groupBy('product_id').pivot('sale_month').agg(sum(...))`). Then show the reverse: **unpivot** the wide table back to long form with `stack(...)` inside `selectExpr`. Pivot turns row values into columns (a crosstab); unpivot turns columns back into rows.",
      examples: [
        {
          input: "sales: (p1, 2026-01, 100), (p1, 2026-02, 140), (p2, 2026-01, 50)",
          output: "pivoted -> p1: {`2026-01`: 100, `2026-02`: 140}; p2: {`2026-01`: 50, `2026-02`: null}. unpivot -> back to (p1, 2026-01, 100), (p1, 2026-02, 140), (p2, 2026-01, 50) [null cells dropped].",
          reasoning: "pivot promotes each distinct sale_month into its own column filled by sum(revenue) per product; a product with no row for a month gets null there. stack(...) reverses it, emitting one (month, revenue) row per non-null column."
        }
      ],
      approaches: [
        {
          name: "groupBy(product).pivot(month).agg(sum(revenue)); reverse with stack() in selectExpr",
          whenToUse: "Building a crosstab / spreadsheet-style report (months, categories, statuses as columns), and the inverse when a wide feed must be normalized to long form for storage or joins.",
          logic:
            "**What it asks.** Turn month values into one column each per product (pivot), then reverse the wide table back to one row per product-month (unpivot).\n\n" +
            "**Key Idea.** `groupBy('product_id').pivot('sale_month').agg(_sum('revenue'))` groups by the row key, promotes each **distinct** value of the pivot column into its own output column, and fills each cell with the aggregate. Always list the pivot values explicitly — `pivot('sale_month', ['2026-01', '2026-02', ...])` — to skip Spark's extra distinct-scan and pin column order. To reverse, `stack(n, 'lbl1', col1, 'lbl2', col2, ...)` inside `selectExpr` emits `n` rows per input row, each a (label, value) pair — the inverse of pivot.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. (Pivot) Optionally list the months: `months = [r['sale_month'] for r in sales.select('sale_month').distinct().collect()]`.\n" +
            "2. Pivot: `wide = sales.groupBy('product_id').pivot('sale_month', months).agg(_sum('revenue'))`.\n" +
            "3. Fill absent cells if a zero is more meaningful than null: `wide = wide.na.fill(0)`.\n" +
            "4. (Unpivot) Build the `stack` expression naming each month column: `stack(2, '2026-01', `2026-01`, '2026-02', `2026-02`) as (sale_month, revenue)`.\n" +
            "5. Unpivot: `long = wide.selectExpr('product_id', expr)` then drop the null rows: `long.filter(col('revenue').isNotNull())`.\n\n" +
            "**Why it works.** Pivot is a grouped aggregation whose output schema is decided by the distinct pivot values; each becomes a column and the agg supplies the cell. `stack(n, ...)` is the algebraic inverse — it explodes n column pairs into n rows, so wrapping the month columns in a stack rebuilds the original long shape.\n\n" +
            "**Common Gotchas.**\n" +
            "- Always pass the explicit value list to `pivot(...)`; without it Spark runs a hidden `distinct` job first (an extra scan) and column order is nondeterministic.\n" +
            "- Month labels like `2026-01` are not valid bare identifiers — backtick-quote them everywhere (`selectExpr`, column refs).\n" +
            "- Missing combinations become **null** cells after pivot; `stack` re-emits them as null rows, so filter them out to get a faithful round-trip.\n" +
            "- `pivot` allows only **one** pivot column; to pivot on two dimensions, concatenate them into a single key first.\n\n" +
            "**Interview mindset.** Say 'pivot = groupBy + promote distinct values to columns; always list the values to avoid the distinct pass'. For the reverse, name `stack()` (or `melt`/`unpivot` in newer Spark) as the inverse and mention backticking the generated column names.",
          rcs:
            "from pyspark.sql.functions import col, sum as _sum\n" +
            "\n" +
            "# --- PIVOT: long -> wide (one column per month per product) ---\n" +
            "months = [r['sale_month'] for r in\n" +
            "          sales.select('sale_month').distinct().collect()]  # list values -> skip hidden distinct\n" +
            "\n" +
            "wide = (sales\n" +
            "    .groupBy('product_id')                                 # row key\n" +
            "    .pivot('sale_month', months)                           # promote each month to a column\n" +
            "    .agg(_sum('revenue')))                                 # cell = sum(revenue)\n" +
            "wide = wide.na.fill(0)                                      # absent product-month -> 0 (optional)\n" +
            "wide.show()\n" +
            "\n" +
            "# --- UNPIVOT: wide -> long (reverse with stack) ---\n" +
            "cols = [c for c in wide.columns if c != 'product_id']       # the month columns\n" +
            "pairs = ', '.join([\"'%s', `%s`\" % (c, c) for c in cols])   # 'label', `col`, ...\n" +
            "expr = 'stack(%d, %s) as (sale_month, revenue)' % (len(cols), pairs)\n" +
            "\n" +
            "long = (wide\n" +
            "    .selectExpr('product_id', expr)                        # explode columns back to rows\n" +
            "    .filter(col('revenue') != 0))                          # drop filled-empty cells\n" +
            "long.show()",
          plain:
            "from pyspark.sql.functions import col, sum as _sum\n" +
            "\n" +
            "months = [r['sale_month'] for r in\n" +
            "          sales.select('sale_month').distinct().collect()]\n" +
            "\n" +
            "wide = (sales\n" +
            "    .groupBy('product_id')\n" +
            "    .pivot('sale_month', months)\n" +
            "    .agg(_sum('revenue')))\n" +
            "wide = wide.na.fill(0)\n" +
            "wide.show()\n" +
            "\n" +
            "cols = [c for c in wide.columns if c != 'product_id']\n" +
            "pairs = ', '.join([\"'%s', `%s`\" % (c, c) for c in cols])\n" +
            "expr = 'stack(%d, %s) as (sale_month, revenue)' % (len(cols), pairs)\n" +
            "\n" +
            "long = (wide\n" +
            "    .selectExpr('product_id', expr)\n" +
            "    .filter(col('revenue') != 0))\n" +
            "long.show()"
        }
      ],
      sparkInternals:
        "`pivot` is a **two-pass** operation when you do not supply the value list: pass one runs a `distinct` (its own job with a shuffle) to discover the pivot values and fix the output schema; pass two is the actual `groupBy(...).pivot(...).agg(...)`, a **wide** hash aggregate — Spark hash-shuffles by `product_id` and computes one conditional aggregate per pivot value per group (essentially `sum(when(sale_month = v, revenue))` for each `v`). Supplying the explicit list collapses it to a **single** pass by skipping the distinct scan, and pins column order. A pivot with many distinct values produces very wide rows and many aggregate expressions, so cardinality of the pivot column is the cost driver. `stack` (unpivot) is the cheaper direction: it is a **narrow**, generator expression — each input row is expanded into `n` output rows in codegen, with no shuffle at all. The round-trip introduces null cells for absent combinations, which is why the reverse filters them out.",
      sparkSql:
        "-- PIVOT: long -> wide\n" +
        "SELECT * FROM (\n" +
        "  SELECT product_id, sale_month, revenue FROM sales\n" +
        ")\n" +
        "PIVOT (\n" +
        "  SUM(revenue) FOR sale_month IN ('2026-01' AS m_2026_01, '2026-02' AS m_2026_02)\n" +
        ");",
      recognizeRecall: [
        "**Spot it:** 'one column per month/category', 'crosstab', 'spreadsheet layout', or the reverse 'flatten these columns into rows'.",
        "**Say it:** `groupBy(key).pivot(col, [values]).agg(sum(...))` to widen; `stack(n, 'l', c, ...)` in `selectExpr` to unpivot back.",
        "**Trap:** always list the pivot values (else a hidden distinct pass); backtick month-named columns; absent cells become null on the round-trip."
      ]
    },

    // ------------------------------------------------------------------ Q202
    {
      id: "parse-logs-regexp-extract",
      lc: 202,
      title: "Parse raw log lines into fields with regexp_extract",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Extract structured fields from text (regex)", transformation: "Narrow (no shuffle)", functions: "regexp_extract, regexp_extract_all, split, col" },
      description:
        "Given a `logs` DataFrame with a single raw string column `line` holding Apache/Nginx-style access lines, extract `ip`, `event_ts`, `method`, `path`, and `status` into typed columns. Use `regexp_extract(line, pattern, group)` with one capture group per field. Mention `regexp_extract_all` (all matches of a repeating pattern) and `split` (a cheaper option when the format is a simple fixed delimiter).",
      examples: [
        {
          input: "line = '10.0.0.5 - - [02/Sep/2026:10:15:32 +0000] \"GET /home HTTP/1.1\" 200 512'",
          output: "ip=10.0.0.5, event_ts=02/Sep/2026:10:15:32, method=GET, path=/home, status=200",
          reasoning: "One regex with five capture groups pulls each field by group index: group 1 the IP, group 2 the bracketed timestamp, group 3 the verb, group 4 the path, group 5 the status code."
        }
      ],
      approaches: [
        {
          name: "one regexp_extract per field via capture-group index; split/regexp_extract_all as alternatives",
          whenToUse: "Turning semi-structured text (access logs, syslog, delimited exports, free-form ids) into typed columns without a UDF.",
          logic:
            "**What it asks.** Break each raw log line into `ip`, `event_ts`, `method`, `path`, and `status` columns.\n\n" +
            "**Key Idea.** Write one regular expression with a **capture group** `(...)` around each field, then call `regexp_extract(col('line'), pattern, g)` once per field, passing the group index `g`. `regexp_extract` returns the captured substring (or an empty string if the pattern does not match), so it is a pure per-row expression. For repeating tokens use `regexp_extract_all` (returns an array of all matches); for a simple fixed delimiter, `split(line, ' ')` is cheaper than a regex.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Design the pattern with a group per field: `^(\\\\S+) \\\\S+ \\\\S+ \\\\[([^\\\\]]+)\\\\] \"(\\\\S+) (\\\\S+) [^\"]*\" (\\\\d+)`.\n" +
            "2. Extract each field by index: `regexp_extract(col('line'), pat, 1)` for ip, `2` for event_ts, `3` method, `4` path, `5` status.\n" +
            "3. Cast where needed: `.cast('int')` on `status`.\n" +
            "4. Optionally parse the timestamp: `to_timestamp(col('event_ts'), 'dd/MMM/yyyy:HH:mm:ss')`.\n" +
            "5. Drop rows that failed to match (empty `ip`) to quarantine malformed lines.\n\n" +
            "**Why it works.** A single compiled regex scans each line once; each `regexp_extract` reads a different capture group from the same match, so all fields come from one consistent parse. Because it is a per-row expression, there is no shuffle and the work fuses into the scan stage via codegen.\n\n" +
            "**Common Gotchas.**\n" +
            "- In Python source, backslashes must be escaped (`\\\\S`, `\\\\d`) or use a raw string `r'...'`; Spark uses **Java** regex semantics, not Python's.\n" +
            "- Group index `0` returns the whole match; your fields start at `1`.\n" +
            "- A non-match returns an **empty string**, not null — filter on `!= ''` (or wrap in `nullif`) to detect failures.\n" +
            "- Greedy quantifiers can over-consume; prefer negated classes like `[^\\\"]*` / `[^\\\\]]+` for bracketed/quoted spans.\n" +
            "- Reach for `split` when the delimiter is fixed and unambiguous — it avoids regex backtracking cost.\n\n" +
            "**Interview mindset.** 'One regex, one capture group per field, `regexp_extract(line, pat, g)` per column'. Mention Java regex semantics, the empty-string-on-no-match trap, and `split`/`regexp_extract_all` as lighter or repeating-match alternatives.",
          rcs:
            "from pyspark.sql.functions import col, regexp_extract, to_timestamp\n" +
            "\n" +
            "# One pattern, one capture group per field (Java regex semantics).\n" +
            "pat = r'^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] \"(\\S+) (\\S+) [^\"]*\" (\\d+)'\n" +
            "\n" +
            "parsed = (logs\n" +
            "    .withColumn('ip',       regexp_extract(col('line'), pat, 1))   # group 1\n" +
            "    .withColumn('event_ts', regexp_extract(col('line'), pat, 2))   # bracketed ts\n" +
            "    .withColumn('method',   regexp_extract(col('line'), pat, 3))   # GET/POST/...\n" +
            "    .withColumn('path',     regexp_extract(col('line'), pat, 4))   # request path\n" +
            "    .withColumn('status',   regexp_extract(col('line'), pat, 5).cast('int')))\n" +
            "\n" +
            "# Optional: turn the bracketed string into a real timestamp.\n" +
            "parsed = parsed.withColumn('event_time',\n" +
            "    to_timestamp(col('event_ts'), 'dd/MMM/yyyy:HH:mm:ss'))\n" +
            "\n" +
            "# Quarantine lines that did not match (regexp_extract returns '' on no match).\n" +
            "clean = parsed.filter(col('ip') != '')\n" +
            "clean.show(truncate=False)\n" +
            "\n" +
            "# Alternatives:\n" +
            "#   from pyspark.sql.functions import split, regexp_extract_all\n" +
            "#   split(col('line'), ' ')                     # fixed-delimiter fields, cheaper than regex\n" +
            "#   regexp_extract_all(col('line'), r'(\\d+)', 1)  # array of every numeric token",
          plain:
            "from pyspark.sql.functions import col, regexp_extract, to_timestamp\n" +
            "\n" +
            "pat = r'^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] \"(\\S+) (\\S+) [^\"]*\" (\\d+)'\n" +
            "\n" +
            "parsed = (logs\n" +
            "    .withColumn('ip',       regexp_extract(col('line'), pat, 1))\n" +
            "    .withColumn('event_ts', regexp_extract(col('line'), pat, 2))\n" +
            "    .withColumn('method',   regexp_extract(col('line'), pat, 3))\n" +
            "    .withColumn('path',     regexp_extract(col('line'), pat, 4))\n" +
            "    .withColumn('status',   regexp_extract(col('line'), pat, 5).cast('int')))\n" +
            "\n" +
            "parsed = parsed.withColumn('event_time',\n" +
            "    to_timestamp(col('event_ts'), 'dd/MMM/yyyy:HH:mm:ss'))\n" +
            "\n" +
            "clean = parsed.filter(col('ip') != '')\n" +
            "clean.show(truncate=False)"
        }
      ],
      sparkInternals:
        "This is a **narrow** transformation — no shuffle. Each `regexp_extract` compiles its pattern to a `java.util.regex.Pattern` and is invoked per row inside the scan stage. Catalyst's whole-stage **codegen** fuses the five extractions plus the cast and `to_timestamp` into a single generated function over the `line` column, so the row is read once and parsed in one pass. The chief cost is the regex engine itself: catastrophic backtracking from greedy `.*` against long lines can dominate CPU, which is why negated character classes (`[^\"]*`, `[^\\]]+`) that cannot backtrack are preferred. `split` avoids the regex machinery entirely and is faster for fixed delimiters; `regexp_extract_all` returns an array (a single match pass that collects all occurrences) and pairs with `explode` if you need one row per match. Because the whole step is row-local, it also pushes down cleanly and parallelizes perfectly across partitions.",
      sparkSql:
        "SELECT\n" +
        "  regexp_extract(line, '^(\\\\S+) \\\\S+ \\\\S+ \\\\[([^\\\\]]+)\\\\] \"(\\\\S+) (\\\\S+) [^\"]*\" (\\\\d+)', 1) AS ip,\n" +
        "  regexp_extract(line, '^(\\\\S+) \\\\S+ \\\\S+ \\\\[([^\\\\]]+)\\\\] \"(\\\\S+) (\\\\S+) [^\"]*\" (\\\\d+)', 2) AS event_ts,\n" +
        "  regexp_extract(line, '^(\\\\S+) \\\\S+ \\\\S+ \\\\[([^\\\\]]+)\\\\] \"(\\\\S+) (\\\\S+) [^\"]*\" (\\\\d+)', 3) AS method,\n" +
        "  regexp_extract(line, '^(\\\\S+) \\\\S+ \\\\S+ \\\\[([^\\\\]]+)\\\\] \"(\\\\S+) (\\\\S+) [^\"]*\" (\\\\d+)', 4) AS path,\n" +
        "  CAST(regexp_extract(line, '^(\\\\S+) \\\\S+ \\\\S+ \\\\[([^\\\\]]+)\\\\] \"(\\\\S+) (\\\\S+) [^\"]*\" (\\\\d+)', 5) AS INT) AS status\n" +
        "FROM logs\n" +
        "WHERE line <> '';",
      recognizeRecall: [
        "**Spot it:** 'parse the log line', 'extract ip/status/path from raw text', 'pull fields out of a string column'.",
        "**Say it:** one regex with a capture group per field, `regexp_extract(col('line'), pat, g)` per column; `split` for fixed delimiters, `regexp_extract_all` for repeats.",
        "**Trap:** Java (not Python) regex, escape backslashes; no-match returns '' not null; avoid greedy `.*` (use negated classes)."
      ]
    },

    // ------------------------------------------------------------------ Q203
    {
      id: "scd-type-2-delta-merge",
      lc: 203,
      title: "SCD Type 2 dimension with Delta Lake MERGE",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Slowly Changing Dimension Type 2 (history)", transformation: "Wide (shuffle) + file rewrite", functions: "DeltaTable, merge, whenMatchedUpdate, whenNotMatchedInsert, union" },
      description:
        "Maintain a **Slowly Changing Dimension Type 2** `customers_dim` (columns `customer_id`, attributes, `effective_date`, `end_date`, `is_current`). Given a batch of incoming records, close the currently-active row for any customer whose attributes changed (set `end_date` and `is_current = false`) and insert a **new version** row marked current — preserving full history. Implement it with Delta Lake `MERGE INTO` via `DeltaTable.forName(...).merge(...)`, using the classic **two-step** (expire + insert) merge pattern.",
      examples: [
        {
          input: "dim has (c1, city=NYC, is_current=true). Incoming: (c1, city=LA). ",
          output: "After merge: (c1, NYC, end_date=today, is_current=false) AND a new (c1, LA, effective_date=today, end_date=null, is_current=true). c1 now has two history rows.",
          reasoning: "c1's city changed, so the active NYC row is expired (end-dated, is_current=false) and a fresh LA row is inserted as the current version. Unchanged customers are untouched; brand-new customers are inserted as a single current row."
        }
      ],
      approaches: [
        {
          name: "two-step MERGE: stage rows that force an insert, then merge to expire old + insert new",
          whenToUse: "Any dimension where you must keep a full audit trail of attribute changes over time (address, plan tier, segment) rather than overwriting.",
          logic:
            "**What it asks.** Keep every historical version of each customer: when an attribute changes, close the old row and open a new current one; leave unchanged and brand-new customers correct too.\n\n" +
            "**Key Idea.** A single `MERGE` cannot both **update** the old row and **insert** a new one for the same key in one pass, so use the **two-step staging trick**. Build a staged source that, for each *changed* incoming customer, contains that row **twice conceptually**: once with the existing `customer_id` as merge key (to expire the old version) and once with a **null** merge key (so it falls through to the insert branch). Then `MERGE` on `customer_id AND target.is_current`: `whenMatched` (attributes differ) expires the old row; `whenNotMatched` inserts the new current version.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Load the Delta target: `dim = DeltaTable.forName(spark, 'customers_dim')`.\n" +
            "2. Find genuinely-changed customers: join incoming to the current rows and keep those whose tracked attributes differ (`updates`).\n" +
            "3. Stage the insert-forcing rows: give those `updates` a null `mergeKey` (`staged_inserts`), and stage the plain incoming rows with `mergeKey = customer_id` for the expire branch; `union` them into `staged`.\n" +
            "4. Merge: `dim.alias('t').merge(staged.alias('s'), 't.customer_id = s.mergeKey AND t.is_current = true')`.\n" +
            "5. `whenMatchedUpdate` (attributes changed): set `end_date = current_date()`, `is_current = false` (expire).\n" +
            "6. `whenNotMatchedInsert`: insert the new version with `effective_date = current_date()`, `end_date = null`, `is_current = true`.\n" +
            "7. `.execute()`.\n\n" +
            "**Why it works.** The null `mergeKey` guarantees the new-version rows never match an existing row, so they take the insert path, while the real-keyed rows match the current row and take the expire path — accomplishing both sides of an SCD2 transition in one atomic `MERGE`. Restricting the match to `is_current = true` ensures only the live row is expired, leaving historical rows frozen.\n\n" +
            "**Common Gotchas.**\n" +
            "- Match on `is_current = true` (or `end_date IS NULL`) so you expire only the active version, not old history.\n" +
            "- Compare **only tracked attributes** to decide 'changed'; comparing metadata columns would flap every row.\n" +
            "- The two-step (null mergeKey) staging is required — a naive single update-and-insert on the same key is impossible in one MERGE.\n" +
            "- Deduplicate the source to **one row per key** before merging; a MERGE that matches multiple source rows to one target row throws.\n" +
            "- Effective/end date boundaries must not overlap (new `effective_date` = old `end_date`, or +1 day, per your convention).\n\n" +
            "**Interview mindset.** Say 'SCD2 = expire the current row and insert a new version; a single MERGE can't do both for one key, so stage the new version with a null merge key to force the insert branch'. Note the `is_current` match predicate and source dedupe.",
          rcs:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.functions import col, current_date, lit\n" +
            "\n" +
            "dim = DeltaTable.forName(spark, 'customers_dim')            # Delta target\n" +
            "current = dim.toDF().filter(col('is_current') == True)     # live versions only\n" +
            "\n" +
            "# 1) Which incoming customers actually changed a tracked attribute?\n" +
            "updates = (incoming.alias('i')\n" +
            "    .join(current.alias('c'), 'customer_id')\n" +
            "    .filter(col('i.city') != col('c.city'))                # tracked-attribute diff\n" +
            "    .select('i.*'))\n" +
            "\n" +
            "# 2) Stage: null mergeKey forces the INSERT branch (the new version),\n" +
            "#    real mergeKey drives the UPDATE branch (expire the old row).\n" +
            "staged_inserts = updates.withColumn('mergeKey', lit(None))\n" +
            "staged_keyed = incoming.withColumn('mergeKey', col('customer_id'))\n" +
            "staged = staged_keyed.unionByName(staged_inserts)\n" +
            "\n" +
            "# 3) One atomic MERGE does both sides of the SCD2 transition.\n" +
            "(dim.alias('t')\n" +
            "    .merge(staged.alias('s'),\n" +
            "           't.customer_id = s.mergeKey AND t.is_current = true')\n" +
            "    .whenMatchedUpdate(                                     # attribute changed -> expire\n" +
            "        condition='t.city <> s.city',\n" +
            "        set={'end_date': current_date(), 'is_current': lit(False)})\n" +
            "    .whenNotMatchedInsert(                                  # new version -> insert current\n" +
            "        values={'customer_id': 's.customer_id',\n" +
            "                'city': 's.city',\n" +
            "                'effective_date': current_date(),\n" +
            "                'end_date': lit(None),\n" +
            "                'is_current': lit(True)})\n" +
            "    .execute())",
          plain:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.functions import col, current_date, lit\n" +
            "\n" +
            "dim = DeltaTable.forName(spark, 'customers_dim')\n" +
            "current = dim.toDF().filter(col('is_current') == True)\n" +
            "\n" +
            "updates = (incoming.alias('i')\n" +
            "    .join(current.alias('c'), 'customer_id')\n" +
            "    .filter(col('i.city') != col('c.city'))\n" +
            "    .select('i.*'))\n" +
            "\n" +
            "staged_inserts = updates.withColumn('mergeKey', lit(None))\n" +
            "staged_keyed = incoming.withColumn('mergeKey', col('customer_id'))\n" +
            "staged = staged_keyed.unionByName(staged_inserts)\n" +
            "\n" +
            "(dim.alias('t')\n" +
            "    .merge(staged.alias('s'),\n" +
            "           't.customer_id = s.mergeKey AND t.is_current = true')\n" +
            "    .whenMatchedUpdate(\n" +
            "        condition='t.city <> s.city',\n" +
            "        set={'end_date': current_date(), 'is_current': lit(False)})\n" +
            "    .whenNotMatchedInsert(\n" +
            "        values={'customer_id': 's.customer_id',\n" +
            "                'city': 's.city',\n" +
            "                'effective_date': current_date(),\n" +
            "                'end_date': lit(None),\n" +
            "                'is_current': lit(True)})\n" +
            "    .execute())"
        }
      ],
      sparkInternals:
        "Delta `MERGE` runs in **two internal jobs**. Phase one is an **inner join** between source and target to find which target files contain matched rows — a **wide** shuffle keyed by the merge condition. Phase two re-reads exactly those **touched data files** and rewrites them: Delta is **copy-on-write**, so a matched file is rewritten in full (matched rows updated, unmatched rows copied through) as new Parquet files, and the old files are tombstoned in the transaction log. Nothing is edited in place. This means MERGE cost scales with the number of **files touched**, not rows changed — which is why partitioning the dimension (and adding the partition column to the merge predicate) lets Delta prune files and rewrite far fewer of them, and why `OPTIMIZE`/Z-ordering on the key pays off. The two-step staging doubles only the changed rows in the source (a small `union`), not the target. Restricting the match to `is_current = true` shrinks the join and keeps historical files from being rewritten. The whole MERGE commits atomically as one new table version (snapshot isolation).",
      sparkSql:
        "MERGE INTO customers_dim t\n" +
        "USING staged_source s\n" +
        "  ON t.customer_id = s.mergeKey AND t.is_current = true\n" +
        "WHEN MATCHED AND t.city <> s.city THEN\n" +
        "  UPDATE SET t.end_date = current_date(), t.is_current = false\n" +
        "WHEN NOT MATCHED THEN\n" +
        "  INSERT (customer_id, city, effective_date, end_date, is_current)\n" +
        "  VALUES (s.customer_id, s.city, current_date(), NULL, true);",
      recognizeRecall: [
        "**Spot it:** 'keep history of changes', 'SCD Type 2', 'effective/end date + is_current flag', 'audit trail of a dimension'.",
        "**Say it:** two-step MERGE — expire the current row (`is_current=false`, set `end_date`) and insert a new version; force the insert with a null `mergeKey`.",
        "**Trap:** match only `is_current=true`; compare tracked attributes only; dedupe source to one row per key; Delta rewrites whole files (copy-on-write)."
      ]
    },

    // ------------------------------------------------------------------ Q204
    {
      id: "incremental-load-cdc-merge",
      lc: 204,
      title: "Incremental load from a CDC feed (dedupe to latest + upsert)",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "CDC incremental upsert (I/U/D)", transformation: "Wide (shuffle) + file rewrite", functions: "Window, row_number, DeltaTable, merge, whenMatchedDelete, whenNotMatchedInsert" },
      description:
        "Given a **change-data-capture** feed `cdc` (`id`, columns, `op` in {`I`, `U`, `D`}, `change_ts`), apply only the **latest** change per key to a target table. First **dedupe to the latest change per id** with `row_number()` over `change_ts` desc, then **upsert**: inserts/updates write the row, `op = 'D'` deletes it. Show the batch apply with a Delta `MERGE` (matched-delete / matched-update / not-matched-insert) and note the full-outer-join fallback when Delta is unavailable.",
      examples: [
        {
          input: "cdc for id=7: (U, city=LA, 10:00), (U, city=SF, 10:05), (D, 10:09). target has (7, NYC).",
          output: "Latest change for id=7 is the D at 10:09, so id=7 is DELETED from target. The intermediate LA/SF updates are ignored.",
          reasoning: "row_number desc by change_ts keeps only the last event per id (the delete). The merge then applies that single net change: op='D' removes the row; had the latest been an I/U it would upsert the row's values."
        }
      ],
      approaches: [
        {
          name: "row_number() to keep the latest event per key, then Delta MERGE (delete on D, upsert otherwise)",
          whenToUse: "Applying a micro-batch of database change events (Debezium/DMS/Kafka CDC) to a target, where a key may have several events in one batch and only the net-latest matters.",
          logic:
            "**What it asks.** Collapse a batch of CDC events to one net change per key (the most recent), then apply it: delete when the latest op is a delete, otherwise insert-or-update.\n\n" +
            "**Key Idea.** Two stages. (1) **Dedupe to latest**: `row_number()` over `partitionBy('id').orderBy(change_ts.desc())` and keep `rn == 1` — the single newest event per id, so superseded intermediate updates vanish. (2) **Upsert**: a Delta `MERGE` on `id` with three branches — `whenMatchedDelete(op == 'D')`, `whenMatchedUpdate` (op is I/U), and `whenNotMatchedInsert` (op is I/U). A not-matched delete is simply ignored.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Rank events per key by recency: `w = Window.partitionBy('id').orderBy(col('change_ts').desc())`.\n" +
            "2. Keep the latest: `latest = cdc.withColumn('rn', row_number().over(w)).filter(col('rn') == 1).drop('rn')`.\n" +
            "3. Load the Delta target: `tgt = DeltaTable.forName(spark, 'target')`.\n" +
            "4. Merge on the key: `tgt.alias('t').merge(latest.alias('s'), 't.id = s.id')`.\n" +
            "5. `whenMatchedDelete(condition = \"s.op = 'D'\")` — apply deletes to existing rows.\n" +
            "6. `whenMatchedUpdateAll(condition = \"s.op <> 'D'\")` and `whenNotMatchedInsertAll(condition = \"s.op <> 'D'\")` — upsert the survivors.\n" +
            "7. `.execute()`. (Fallback without Delta: `target.join(latest, 'id', 'full_outer')` then `select` the source columns when present and op != 'D', else keep the target, filtering out deleted keys — an overwrite of the whole table.)\n\n" +
            "**Why it works.** Deduping first guarantees each key reaches the merge **once**, so the merge is well-defined (MERGE errors if multiple source rows match one target row) and only the net-latest intent is applied. The op flag routes each surviving key to delete vs upsert; ordering by `change_ts` desc makes 'latest' precise even with several events per key in the batch.\n\n" +
            "**Common Gotchas.**\n" +
            "- You **must** dedupe to one row per key before MERGE — otherwise 'cannot perform MERGE as multiple source rows matched'.\n" +
            "- Order by a real timestamp (add a sequence/LSN tiebreaker if two events share `change_ts`) so 'latest' is deterministic.\n" +
            "- A latest `op = 'D'` for a key **not** in the target is a no-op (nothing to delete) — do not insert it.\n" +
            "- Use `row_number` (strict) not `rank`, so exactly one event survives per key.\n" +
            "- The full-outer-join fallback rewrites the whole target; the Delta MERGE rewrites only touched files — prefer MERGE at scale.\n\n" +
            "**Interview mindset.** 'Dedupe to the latest event per key with a row_number window, then a three-branch MERGE: delete on D, upsert otherwise'. Stress the one-row-per-key requirement and the timestamp tiebreaker.",
          rcs:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "# 1) Collapse the batch to the LATEST event per key.\n" +
            "w = Window.partitionBy('id').orderBy(col('change_ts').desc())\n" +
            "latest = (cdc\n" +
            "    .withColumn('rn', row_number().over(w))                # newest event = rn 1\n" +
            "    .filter(col('rn') == 1)                                # one row per id\n" +
            "    .drop('rn'))\n" +
            "\n" +
            "# 2) Apply as a single upsert: delete on 'D', insert/update otherwise.\n" +
            "tgt = DeltaTable.forName(spark, 'target')\n" +
            "(tgt.alias('t')\n" +
            "    .merge(latest.alias('s'), 't.id = s.id')\n" +
            "    .whenMatchedDelete(condition=\"s.op = 'D'\")             # latest change is a delete\n" +
            "    .whenMatchedUpdateAll(condition=\"s.op <> 'D'\")         # existing key -> update\n" +
            "    .whenNotMatchedInsertAll(condition=\"s.op <> 'D'\")      # new key -> insert (skip stray D)\n" +
            "    .execute())\n" +
            "\n" +
            "# Fallback without Delta (full-outer-join, rewrites whole target):\n" +
            "# merged = (target.alias('t').join(latest.alias('s'), 'id', 'full_outer')\n" +
            "#     .filter(~((col('s.op') == 'D') & col('s.id').isNotNull()))  # drop deleted keys\n" +
            "#     .selectExpr('coalesce(s.id, t.id) as id',\n" +
            "#                 'coalesce(s.city, t.city) as city'))\n" +
            "# merged.write.mode('overwrite').saveAsTable('target')",
          plain:
            "from delta.tables import DeltaTable\n" +
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = Window.partitionBy('id').orderBy(col('change_ts').desc())\n" +
            "latest = (cdc\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .filter(col('rn') == 1)\n" +
            "    .drop('rn'))\n" +
            "\n" +
            "tgt = DeltaTable.forName(spark, 'target')\n" +
            "(tgt.alias('t')\n" +
            "    .merge(latest.alias('s'), 't.id = s.id')\n" +
            "    .whenMatchedDelete(condition=\"s.op = 'D'\")\n" +
            "    .whenMatchedUpdateAll(condition=\"s.op <> 'D'\")\n" +
            "    .whenNotMatchedInsertAll(condition=\"s.op <> 'D'\")\n" +
            "    .execute())"
        }
      ],
      sparkInternals:
        "Two cost centers. The **dedupe** is a **wide** window: Spark hash-shuffles the batch by `id` (`Exchange hashpartitioning(id)`) and sorts each partition by `change_ts` desc to assign `row_number`; skew on a hot key with thousands of events is the risk, though the batch is usually small relative to the target. The **MERGE** then runs Delta's two-phase apply: an inner join of `latest` against the target to locate matched **files** (another shuffle), then a **copy-on-write** rewrite of only those touched Parquet files (updated/kept rows re-emitted, deleted rows dropped) with the old files tombstoned in the log — so cost tracks files touched, and partitioning + adding the partition predicate to the merge condition prunes the rewrite. Because `latest` is one row per key, the join is well-formed and small; deduping first is what keeps the MERGE both correct and cheap. The full-outer-join fallback avoids Delta but must **rewrite the entire target** every batch — fine for small tables, quadratically wasteful for large ones.",
      sparkSql:
        "MERGE INTO target t\n" +
        "USING (\n" +
        "  SELECT * FROM (\n" +
        "    SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY change_ts DESC) AS rn\n" +
        "    FROM cdc\n" +
        "  ) WHERE rn = 1\n" +
        ") s\n" +
        "  ON t.id = s.id\n" +
        "WHEN MATCHED AND s.op = 'D' THEN DELETE\n" +
        "WHEN MATCHED AND s.op <> 'D' THEN UPDATE SET *\n" +
        "WHEN NOT MATCHED AND s.op <> 'D' THEN INSERT *;",
      recognizeRecall: [
        "**Spot it:** 'CDC feed', 'I/U/D op flag', 'apply the latest change per key', 'incremental / micro-batch upsert', 'Debezium/DMS'.",
        "**Say it:** `row_number()` desc on `change_ts` keep rn=1 to net each key, then a MERGE: delete on 'D', upsert otherwise.",
        "**Trap:** dedupe to one row per key first (else MERGE errors); timestamp tiebreaker for 'latest'; a stray 'D' on a missing key is a no-op."
      ]
    },

    // ------------------------------------------------------------------ Q205
    {
      id: "d1-d7-d30-retention-cohorts",
      lc: 205,
      title: "D1 / D7 / D30 retention by signup cohort",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Cohort retention (returned within N days)", transformation: "Wide (shuffle)", functions: "min, Window, datediff, countDistinct, when, self-join" },
      description:
        "From an `activity` DataFrame (`user_id`, `login_date`) of login/activity events, compute **D1, D7, and D30 retention**: for each user, whether they returned **within** 1, 7, and 30 days after their **first-seen** date. Then roll up per **cohort** (the first-seen date): cohort size and the D1/D7/D30 retained counts and rates. Uses a first-seen milestone, a day-offset from it, and conditional counting.",
      examples: [
        {
          input: "activity: u1 first-seen 2026-01-01, also active 2026-01-02 and 2026-01-20; u2 first-seen 2026-01-01, no later activity.",
          output: "cohort 2026-01-01: size 2; d1_retained 1 (u1 back within 1 day), d7_retained 1, d30_retained 1; rates 0.5/0.5/0.5. u2 retained on none.",
          reasoning: "u1's offsets from first-seen are 0,1,19 -> within 1 (yes), within 7 (yes), within 30 (yes). u2 has only day 0 -> retained on none. The cohort keyed by first-seen date aggregates these per-user flags into counts and rates."
        }
      ],
      approaches: [
        {
          name: "first-seen per user, day-offset of every later event, per-user retention flags, then cohort rollup",
          whenToUse: "Product/growth analytics: cohort retention curves, activation, 'came back within N days' questions.",
          logic:
            "**What it asks.** Per user, did they return within 1 / 7 / 30 days of first appearing; then per first-seen cohort, how many and what fraction did.\n\n" +
            "**Key Idea.** Three layers. (1) `first_seen` = `min('login_date')` per user (a window broadcast back onto each row, or a groupBy+join). (2) For every activity row compute `day_offset = datediff(login_date, first_seen)`; an offset `> 0` and `<= N` means the user returned within N days. (3) Per user, reduce those to boolean flags `d1_retained`, `retention_7d`, `retention_30d` with `max(when(...))`; finally `groupBy(first_seen)` to sum the flags into cohort counts and divide by cohort size for rates.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. First-seen per user: `w = Window.partitionBy('user_id')`, `a = activity.withColumn('first_seen', _min('login_date').over(w))`.\n" +
            "2. Day offset from first-seen: `a = a.withColumn('day_offset', datediff(col('login_date'), col('first_seen')))`.\n" +
            "3. Per-user retention flags (offset in (0, N]): `user_ret = a.groupBy('user_id', 'first_seen').agg(_max(when((col('day_offset') > 0) & (col('day_offset') <= 1), 1).otherwise(0)).alias('d1_retained'), ... <= 7 -> retention_7d, ... <= 30 -> retention_30d)`.\n" +
            "4. Cohort rollup: `cohort = user_ret.groupBy('first_seen').agg(_count('*').alias('cohort_size'), _sum('d1_retained').alias('d1_retained'), _sum('retention_7d').alias('retained_7d'), _sum('retention_30d').alias('retained_30d'))`.\n" +
            "5. Rates: `cohort.withColumn('d1_rate', _round(col('d1_retained') / col('cohort_size'), 4))` (repeat for 7d/30d).\n\n" +
            "**Why it works.** `min` over a user-partitioned window anchors every event to that user's first day; `datediff` converts each event to a day offset, so 'returned within N days' is just `0 < offset <= N`. `max(when(...))` collapses many events into one boolean per user (returned or not), and summing those booleans per cohort gives the retained count; dividing by the cohort's user count gives the rate. Requiring `offset > 0` excludes the first-day event itself so retention measures a genuine return.\n\n" +
            "**Common Gotchas.**\n" +
            "- Exclude the first-day event (`day_offset > 0`); otherwise every user trivially 'retains' on day 0.\n" +
            "- Decide **within N** (`<= N`, cumulative) vs **exactly on day N** (`= N`); D7 usually means 'returned by day 7'. Be explicit.\n" +
            "- Never start an identifier with a digit — use `d1_retained`, `retention_7d`, `retention_30d`, not `1d`/`7_day`.\n" +
            "- Count **distinct users** per cohort (or dedupe to one flag row per user) so multiple events don't inflate `cohort_size`.\n" +
            "- Nested `<=` windows are cumulative: a user retained at D1 is also retained at D7 and D30 — that is expected for 'within N'.\n\n" +
            "**Interview mindset.** 'Anchor each user to their first-seen day, compute day offsets, flag returned-within-N per user, then group by the cohort date and average the flags'. Call out the `offset > 0` exclusion and within-N vs exactly-N.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, datediff, when,\n" +
            "                                   min as _min, max as _max,\n" +
            "                                   sum as _sum, count as _count, round as _round)\n" +
            "\n" +
            "# 1) First-seen date per user, then each event's offset from it.\n" +
            "w = Window.partitionBy('user_id')\n" +
            "a = (activity\n" +
            "    .withColumn('first_seen', _min('login_date').over(w))\n" +
            "    .withColumn('day_offset', datediff(col('login_date'), col('first_seen'))))\n" +
            "\n" +
            "# 2) Per-user retention flags: returned within 1 / 7 / 30 days (offset > 0).\n" +
            "user_ret = (a.groupBy('user_id', 'first_seen')\n" +
            "    .agg(_max(when((col('day_offset') > 0) & (col('day_offset') <= 1), 1)\n" +
            "              .otherwise(0)).alias('d1_retained'),\n" +
            "         _max(when((col('day_offset') > 0) & (col('day_offset') <= 7), 1)\n" +
            "              .otherwise(0)).alias('retention_7d'),\n" +
            "         _max(when((col('day_offset') > 0) & (col('day_offset') <= 30), 1)\n" +
            "              .otherwise(0)).alias('retention_30d')))\n" +
            "\n" +
            "# 3) Cohort rollup by first-seen date: counts + rates.\n" +
            "cohort = (user_ret.groupBy('first_seen')\n" +
            "    .agg(_count('*').alias('cohort_size'),\n" +
            "         _sum('d1_retained').alias('d1_retained'),\n" +
            "         _sum('retention_7d').alias('retained_7d'),\n" +
            "         _sum('retention_30d').alias('retained_30d'))\n" +
            "    .withColumn('d1_rate',  _round(col('d1_retained') / col('cohort_size'), 4))\n" +
            "    .withColumn('d7_rate',  _round(col('retained_7d') / col('cohort_size'), 4))\n" +
            "    .withColumn('d30_rate', _round(col('retained_30d') / col('cohort_size'), 4)))\n" +
            "cohort.orderBy('first_seen').show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import (col, datediff, when,\n" +
            "                                   min as _min, max as _max,\n" +
            "                                   sum as _sum, count as _count, round as _round)\n" +
            "\n" +
            "w = Window.partitionBy('user_id')\n" +
            "a = (activity\n" +
            "    .withColumn('first_seen', _min('login_date').over(w))\n" +
            "    .withColumn('day_offset', datediff(col('login_date'), col('first_seen'))))\n" +
            "\n" +
            "user_ret = (a.groupBy('user_id', 'first_seen')\n" +
            "    .agg(_max(when((col('day_offset') > 0) & (col('day_offset') <= 1), 1)\n" +
            "              .otherwise(0)).alias('d1_retained'),\n" +
            "         _max(when((col('day_offset') > 0) & (col('day_offset') <= 7), 1)\n" +
            "              .otherwise(0)).alias('retention_7d'),\n" +
            "         _max(when((col('day_offset') > 0) & (col('day_offset') <= 30), 1)\n" +
            "              .otherwise(0)).alias('retention_30d')))\n" +
            "\n" +
            "cohort = (user_ret.groupBy('first_seen')\n" +
            "    .agg(_count('*').alias('cohort_size'),\n" +
            "         _sum('d1_retained').alias('d1_retained'),\n" +
            "         _sum('retention_7d').alias('retained_7d'),\n" +
            "         _sum('retention_30d').alias('retained_30d'))\n" +
            "    .withColumn('d1_rate',  _round(col('d1_retained') / col('cohort_size'), 4))\n" +
            "    .withColumn('d7_rate',  _round(col('retained_7d') / col('cohort_size'), 4))\n" +
            "    .withColumn('d30_rate', _round(col('retained_30d') / col('cohort_size'), 4)))\n" +
            "cohort.orderBy('first_seen').show()"
        }
      ],
      sparkInternals:
        "Three **wide** stages, all keyed by `user_id` then the cohort date. The `min('login_date').over(Window.partitionBy('user_id'))` shuffles by `user_id` (`Exchange hashpartitioning(user_id)`) and computes the first-seen value for the whole partition — no ordering needed, so it is a partition-wide aggregate broadcast back onto each row. `datediff` and the `when` flags are **narrow**, fused by codegen. The per-user `groupBy('user_id', 'first_seen').agg(max(when(...)))` is a second shuffle, but Catalyst can reuse the `user_id` partitioning from the window, often avoiding a fresh exchange. The final `groupBy('first_seen')` re-shuffles by cohort date (far fewer keys than users) with map-side partial sums, so it is cheap. The classic alternative — a **self-join** of activity to itself on `user_id` with a `datediff BETWEEN 1 AND N` predicate — is much costlier: it fans out each user's events quadratically before aggregating, so the min-window + conditional-count formulation is preferred. Skew on a hyperactive user (many events) is the main risk; partial aggregation of the flags blunts it.",
      sparkSql:
        "WITH first_seen AS (\n" +
        "  SELECT user_id, MIN(login_date) AS cohort_date\n" +
        "  FROM activity GROUP BY user_id\n" +
        "),\n" +
        "offsets AS (\n" +
        "  SELECT a.user_id, f.cohort_date,\n" +
        "         DATEDIFF(a.login_date, f.cohort_date) AS day_offset\n" +
        "  FROM activity a JOIN first_seen f ON a.user_id = f.user_id\n" +
        "),\n" +
        "user_ret AS (\n" +
        "  SELECT user_id, cohort_date,\n" +
        "         MAX(CASE WHEN day_offset BETWEEN 1 AND 1  THEN 1 ELSE 0 END) AS d1_retained,\n" +
        "         MAX(CASE WHEN day_offset BETWEEN 1 AND 7  THEN 1 ELSE 0 END) AS retention_7d,\n" +
        "         MAX(CASE WHEN day_offset BETWEEN 1 AND 30 THEN 1 ELSE 0 END) AS retention_30d\n" +
        "  FROM offsets GROUP BY user_id, cohort_date\n" +
        ")\n" +
        "SELECT cohort_date,\n" +
        "       COUNT(*) AS cohort_size,\n" +
        "       SUM(d1_retained)   AS d1_retained,\n" +
        "       SUM(retention_7d)  AS retained_7d,\n" +
        "       SUM(retention_30d) AS retained_30d,\n" +
        "       ROUND(SUM(d1_retained)  / COUNT(*), 4) AS d1_rate,\n" +
        "       ROUND(SUM(retention_7d) / COUNT(*), 4) AS d7_rate,\n" +
        "       ROUND(SUM(retention_30d)/ COUNT(*), 4) AS d30_rate\n" +
        "FROM user_ret\n" +
        "GROUP BY cohort_date\n" +
        "ORDER BY cohort_date;",
      recognizeRecall: [
        "**Spot it:** 'D1/D7/D30 retention', 'came back within N days', 'cohort retention curve', 'signup cohort activation'.",
        "**Say it:** first-seen per user via `min`, `datediff` offset, `max(when(0 < offset <= N))` per user, then `groupBy(cohort)` sum flags / size for rates.",
        "**Trap:** exclude day-0 (`offset > 0`); 'within N' (<=N) vs 'exactly N'; count distinct users per cohort; no digit-leading names (d1_retained, retention_7d)."
      ]
    }

  ]);
})();
