/*
 * PySpark Interview Lab — Nulls & Data Quality
 * Null semantics are the #1 source of silent bugs: null-safe joins, how nulls
 * behave in counts/filters/aggregations, and cleaning strategies.
 */
(function () {
  var CAT = "Nulls & Data Quality";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q250
    {
      id: "null-safe-join-eqnullsafe",
      lc: 250,
      title: "Null-safe join on a key that contains nulls (eqNullSafe / <=>)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Null-safe equi-join", transformation: "Wide (shuffle)", functions: "join, Column.eqNullSafe, col" },
      description:
        "Join `customers` to `transactions` on `customer_id`, but the key is **nullable** on both sides and you want rows where `null` on the left matches `null` on the right. A normal equi-join uses `=`, and under SQL three-valued logic `null = null` is **UNKNOWN**, not true — so those rows silently drop. Use **`eqNullSafe`** (the `<=>` operator) so `null <=> null` evaluates to true.",
      examples: [
        {
          input: "customers: (1,'Mira'), (null,'Guest'); transactions: (900, 1, 50), (901, null, 30)",
          output: "(1,'Mira',900,50) and (null,'Guest',901,30)",
          reasoning: "With a plain `==` join the (null,'Guest') / (901,null) pair vanishes because null==null is UNKNOWN. `eqNullSafe` treats null==null as a match, so the Guest row survives."
        }
      ],
      approaches: [
        {
          name: "join on Column.eqNullSafe (the <=> operator)",
          whenToUse: "Your join key can be null on both sides and you want null to match null.",
          logic:
            "**What it asks.** Match rows across two tables on a key that may be null, where null should equal null.\n\n" +
            "**Key Idea.** Build the condition with `left['customer_id'].eqNullSafe(right['customer_id'])` instead of `==`. `eqNullSafe` (SQL `<=>`) is the null-safe equality: `null <=> null` is **true** and `null <=> 5` is **false** — never UNKNOWN.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Alias each side so the duplicated `customer_id` is addressable (`customers.alias('c')`, `transactions.alias('t')`).\n" +
            "2. Build `cond = col('c.customer_id').eqNullSafe(col('t.customer_id'))`.\n" +
            "3. `c.join(t, cond, how='inner')` (or the outer flavor you need).\n" +
            "4. `select` the columns you want; drop the duplicate key column.\n\n" +
            "**Why it works.** A plain `==` compiles to SQL `=`, whose result on a null operand is UNKNOWN, and the join keeps only rows where the condition is *true*. `eqNullSafe` compiles to `<=>`, which returns a real boolean for null operands, so null-keyed rows join.\n\n" +
            "**Common Gotchas.**\n" +
            "- You must join on the **expression** here, not `on='customer_id'` — the string form uses `=` and is not null-safe.\n" +
            "- Joining on an expression leaves **two** `customer_id` columns; alias and select to disambiguate.\n" +
            "- Do not 'fix' nulls by joining on `coalesce(key, lit(-1))` unless -1 is truly impossible in the data — pick a sentinel that cannot collide.\n\n" +
            "**Interview mindset.** Say it out loud: 'plain equality drops null==null because it's UNKNOWN; eqNullSafe / `<=>` is the null-safe join.'",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "c = customers.alias('c')\n" +
            "t = transactions.alias('t')\n" +
            "\n" +
            "cond = col('c.customer_id').eqNullSafe(          # null <=> null is TRUE\n" +
            "    col('t.customer_id'))                        # plain == would drop these\n" +
            "\n" +
            "result = c.join(t, cond, how='inner')            # join on the expression\n" +
            "result.select('c.customer_id', 'name', 'txn_id', 'amount').show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "c = customers.alias('c')\n" +
            "t = transactions.alias('t')\n" +
            "cond = col('c.customer_id').eqNullSafe(col('t.customer_id'))\n" +
            "result = c.join(t, cond, how='inner')\n" +
            "result.select('c.customer_id', 'name', 'txn_id', 'amount').show()"
        }
      ],
      sparkInternals:
        "This is a **wide** join — Spark hash-partitions both sides by the key so matching values (nulls included) land on the same partition, then merges. The difference from a normal join is purely the comparison operator: `=` follows SQL three-valued logic where `NULL = NULL` is UNKNOWN, and a join keeps a row only when its condition is *true*, so null-keyed rows are dropped. `eqNullSafe` compiles to `<=>`, which is total — it returns true for two nulls and false for null-vs-value — so those rows survive. Because you join on an expression rather than the string key, the output carries the key column from both sides; alias and project to avoid ambiguous-column errors.",
      sparkSql:
        "SELECT c.customer_id, c.name, t.txn_id, t.amount\n" +
        "FROM customers c JOIN transactions t\n" +
        "  ON c.customer_id <=> t.customer_id;   -- <=> is null-safe equality",
      recognizeRecall: [
        "**Spot it:** \"join key can be null\", \"null should match null\", missing rows after a join on a nullable key.",
        "**Say it:** `left.eqNullSafe(right)` / SQL `<=>`; join on the expression, not the string key.",
        "**Trap:** plain `==` / `=` makes null==null UNKNOWN, silently dropping those rows."
      ]
    },

    // ------------------------------------------------------------------ Q251
    {
      id: "count-vs-count-col-vs-countdistinct-nulls",
      lc: 251,
      title: "count(*) vs count(col) vs countDistinct with nulls (column profiling)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Data profiling / null-aware counts", transformation: "Wide (shuffle)", functions: "count, countDistinct, count('*'), col" },
      description:
        "Profile the `customers` table: for `email` (which has nulls) report the total row count, the number of **non-null** emails, and the number of **distinct** emails. The trap is that `count('*')` counts rows, `count('email')` counts only non-null values, and `countDistinct('email')` counts distinct non-null values — three different numbers from the same column. This 'count non-null per column' pattern is the backbone of data-quality profiling.",
      examples: [
        {
          input: "customers: (1,'Mira','NY','m@x.com'), (2,'Kabir','LA',null), (3,'Zoe','NY','m@x.com')",
          output: "total=3, non_null_email=2, distinct_email=1",
          reasoning: "`count('*')`=3 rows. `count('email')`=2 because Kabir's null is skipped. `countDistinct('email')`=1 because the two non-null emails are identical and nulls are ignored."
        }
      ],
      approaches: [
        {
          name: "one agg with count('*'), count(col), countDistinct(col)",
          whenToUse: "Profiling a column's completeness and cardinality, or explaining why counts disagree.",
          logic:
            "**What it asks.** Show, for one column, how many rows exist, how many have a value, and how many distinct values there are.\n\n" +
            "**Key Idea.** In a single `agg`, combine `count(lit(1))` (or `count('*')`) for rows, `count(col('email'))` for non-null values, and `countDistinct(col('email'))` for distinct non-null values. The gap between the first two is the **null count**; a large gap between rows and distinct signals duplication or low cardinality.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `from pyspark.sql.functions import count, countDistinct, col, lit`.\n" +
            "2. `agg(count(lit(1)).alias('total'), count('email').alias('non_null'), countDistinct('email').alias('distinct'))`.\n" +
            "3. Derive `null_count = total - non_null` and `null_pct` if you want a completeness score.\n" +
            "4. To profile *every* column at once, loop the columns and build a list of these three aggregates.\n\n" +
            "**Why it works.** `count(*)` counts rows regardless of content; `count(col)` is defined to skip nulls; `countDistinct` deduplicates and also skips nulls. Same column, three different definitions.\n\n" +
            "**Common Gotchas.**\n" +
            "- `count('email')` is NOT the row count — new joiners assume it is and undercount completeness.\n" +
            "- `countDistinct` ignores nulls, so a column that is entirely null returns 0 distinct, not 1.\n" +
            "- `countDistinct` triggers a shuffle and is exact (not `approx_count_distinct`); on huge data prefer `approx_count_distinct` if an estimate is acceptable.\n" +
            "- To count nulls directly use `count(when(col('email').isNull(), 1))` or `sum(col('email').isNull().cast('int'))`.\n\n" +
            "**Interview mindset.** 'count(*) counts rows, count(col) skips nulls, countDistinct skips nulls AND dedups — the differences ARE the data-quality signal.'",
          rcs:
            "from pyspark.sql.functions import count, countDistinct, col, lit\n" +
            "\n" +
            "result = customers.agg(\n" +
            "    count(lit(1)).alias('total'),            # every row\n" +
            "    count('email').alias('non_null_email'),  # non-null values only\n" +
            "    countDistinct('email').alias('distinct_email'),  # distinct non-null\n" +
            ")\n" +
            "# null_count = total - non_null_email\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import count, countDistinct, lit\n" +
            "\n" +
            "result = customers.agg(\n" +
            "    count(lit(1)).alias('total'),\n" +
            "    count('email').alias('non_null_email'),\n" +
            "    countDistinct('email').alias('distinct_email'),\n" +
            ")\n" +
            "result.show()"
        },
        {
          name: "profile every column (build aggregates in a loop)",
          whenToUse: "You want a completeness report across all columns at once.",
          logic:
            "**What it asks.** One row summarizing non-null counts for the whole table.\n\n" +
            "**Key Idea.** For each column name build `count(col(c)).alias(c)` and splat the list into a single `agg` — one pass, one shuffle, one summary row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `exprs = [count(col(c)).alias(c) for c in customers.columns]`.\n" +
            "2. `customers.agg(*exprs)`.\n" +
            "3. Compare each to the total row count to get a per-column completeness percentage.\n\n" +
            "**Why it works.** `count(col)` per column skips that column's nulls independently, so one aggregate row tells you how complete each field is.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `count(col(c))`, not `count('*')`, or every column reports the same total.\n" +
            "- For floats also guard NaN: `count(when(~isnan(col(c)) & col(c).isNotNull(), c))`.\n\n" +
            "**Interview mindset.** 'A completeness report is just count(col) per column against the row total.'",
          rcs:
            "from pyspark.sql.functions import count, col\n" +
            "\n" +
            "exprs = [count(col(c)).alias(c)              # non-null count per column\n" +
            "         for c in customers.columns]\n" +
            "profile = customers.agg(*exprs)             # one summary row\n" +
            "profile.show()",
          plain:
            "from pyspark.sql.functions import count, col\n" +
            "\n" +
            "exprs = [count(col(c)).alias(c) for c in customers.columns]\n" +
            "profile = customers.agg(*exprs)\n" +
            "profile.show()"
        }
      ],
      sparkInternals:
        "All of these are aggregations that shuffle partial counts to a final combine, but they differ in definition. `count(*)` counts rows and never looks at values; `count(col)` is specified to increment only for non-null values, so its gap from `count(*)` is exactly the null count. `countDistinct(col)` must deduplicate, which forces a shuffle of the distinct values and, like the others, ignores nulls — a fully-null column yields 0 distinct. Because `countDistinct` is exact it can be expensive on high-cardinality columns; `approx_count_distinct` uses HyperLogLog for a cheap estimate. Under SQL three-valued logic none of these count operators treat NULL as a value — that is precisely why the three numbers diverge and why they make a good profiling triad.",
      sparkSql:
        "SELECT count(*)              AS total,\n" +
        "       count(email)         AS non_null_email,\n" +
        "       count(DISTINCT email) AS distinct_email\n" +
        "FROM customers;",
      recognizeRecall: [
        "**Spot it:** \"how many have an email\", \"why don't these counts match\", column completeness / profiling.",
        "**Say it:** `count('*')`=rows, `count(col)`=non-null, `countDistinct(col)`=distinct non-null; null_count = total - count(col).",
        "**Trap:** `count(col)` and `countDistinct` silently skip nulls — a null-only column shows 0, not the row count."
      ]
    },

    // ------------------------------------------------------------------ Q252
    {
      id: "fill-nulls-per-column-fillna-coalesce",
      lc: 252,
      title: "Fill nulls sensibly per column (fillna / coalesce)",
      difficulty: "Easy",
      category: CAT,
      meta: { pattern: "Null imputation / cleaning", transformation: "Narrow (map)", functions: "fillna, na.fill, coalesce, when, lit" },
      description:
        "Clean `customers`: replace null `city` with `'unknown'`, and in `orders` replace null `order_amount` with `0`. Then show a smarter fallback: fill a null `email` from a backup column (or a computed default) using **`coalesce`**, which returns the first non-null argument. `fillna` is best for constant per-column defaults; `coalesce` is best for value-to-value fallbacks.",
      examples: [
        {
          input: "orders: (10,1,200),(11,2,null); customers: (1,'Mira',null,'m@x.com'),(2,'Kabir','LA',null)",
          output: "orders amounts -> 200, 0; customers cities -> 'unknown','LA'; email -> 'm@x.com', 'kabir@fallback'",
          reasoning: "fillna(0) turns the null amount into 0; fillna('unknown') fills the missing city; coalesce(email, fallback) supplies a computed email only where email was null."
        }
      ],
      approaches: [
        {
          name: "fillna with a per-column dict for constant defaults",
          whenToUse: "Each column has one sensible constant default (0 for numbers, 'unknown' for strings).",
          logic:
            "**What it asks.** Replace nulls with column-appropriate constants.\n\n" +
            "**Key Idea.** `df.fillna({'order_amount': 0, 'city': 'unknown'})` (alias `df.na.fill(...)`) fills each named column with its own default in one pass. A dict lets numeric and string columns get type-correct fills together.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Decide the default per column (0 for `order_amount`, `'unknown'` for `city`).\n" +
            "2. `df.fillna({'order_amount': 0, 'city': 'unknown'})`.\n" +
            "3. Or fill by type: `df.fillna(0)` fills all numeric nulls, `df.fillna('unknown')` fills all string nulls.\n\n" +
            "**Why it works.** `fillna` scans each targeted column and substitutes the constant wherever the value is null — a narrow, per-row map with no shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- A scalar `fillna(0)` only touches columns whose type **matches** the value's type — `fillna(0)` will not fill a string column, and `fillna('x')` will not fill a numeric one. Use a dict for mixed types.\n" +
            "- `fillna` does NOT replace NaN in the way you might expect for floats vs true nulls — check with `isnan` if floats are involved.\n" +
            "- `subset=` limits which columns a scalar fill touches.\n\n" +
            "**Interview mindset.** 'fillna with a dict = one constant per column; scalar fillna only fills type-matching columns.'",
          rcs:
            "orders_clean = orders.fillna({'order_amount': 0})   # null amount -> 0\n" +
            "cust_clean = customers.fillna({'city': 'unknown'})  # null city -> 'unknown'\n" +
            "# equivalent: customers.na.fill({'city': 'unknown'})\n" +
            "cust_clean.show()",
          plain:
            "orders_clean = orders.fillna({'order_amount': 0})\n" +
            "cust_clean = customers.fillna({'city': 'unknown'})\n" +
            "cust_clean.show()"
        },
        {
          name: "coalesce for value-to-value fallbacks",
          whenToUse: "The default is not a constant but another column or a computed expression.",
          logic:
            "**What it asks.** Fill null `email` from a fallback rather than a fixed constant.\n\n" +
            "**Key Idea.** `coalesce(col('email'), computed_fallback)` returns the first non-null argument per row — so a real email is kept and only nulls fall through to the fallback. You can chain many arguments: `coalesce(a, b, c, lit('n/a'))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the fallback expression (e.g. `concat(lower(col('name')), lit('@fallback'))`).\n" +
            "2. `withColumn('email', coalesce(col('email'), fallback))`.\n" +
            "3. Add a final `lit(...)` argument if the fallback itself could be null.\n\n" +
            "**Why it works.** `coalesce` evaluates its arguments left to right and returns the first that is non-null, which is exactly 'use the value if present, else the backup'.\n\n" +
            "**Common Gotchas.**\n" +
            "- `coalesce` returns null only if **all** arguments are null — end the chain with a `lit(...)` constant to guarantee non-null output.\n" +
            "- Use `coalesce`, not `when(col.isNull(), ...)`, when you have several ordered fallbacks — it's shorter and clearer.\n" +
            "- `coalesce` is null-aware but NOT NaN-aware for floats; combine with `nanvl`/`isnan` if NaN matters.\n\n" +
            "**Interview mindset.** 'coalesce = first non-null wins; fillna = constant per column. Reach for coalesce when the default is another value.'",
          rcs:
            "from pyspark.sql.functions import coalesce, col, concat, lower, lit\n" +
            "\n" +
            "fallback = concat(lower(col('name')), lit('@fallback'))\n" +
            "result = customers.withColumn(\n" +
            "    'email',\n" +
            "    coalesce(col('email'), fallback, lit('n/a')),  # first non-null wins\n" +
            ")\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import coalesce, col, concat, lower, lit\n" +
            "\n" +
            "fallback = concat(lower(col('name')), lit('@fallback'))\n" +
            "result = customers.withColumn('email', coalesce(col('email'), fallback, lit('n/a')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Both `fillna` and `coalesce` are **narrow** — a per-row map with no shuffle. `fillna`/`na.fill` is type-aware: a scalar fill only touches columns whose data type matches the fill value, which is why a dict is the safe way to fill numeric and string columns in one call. `coalesce` compiles to a short-circuiting expression that returns the first non-null argument, so it expresses ordered fallbacks and can chain a `lit(...)` at the end to guarantee a non-null result. Neither treats NaN as null — for floating-point columns a NaN survives `fillna(0)` and `coalesce` unless you also handle it with `isnan`/`nanvl`. Because these are cheap map operations, do your cleaning early so downstream aggregations and joins see consistent, non-null values.",
      sparkSql:
        "-- constant fills\n" +
        "SELECT customer_id, name, COALESCE(city, 'unknown') AS city,\n" +
        "       COALESCE(email, concat(lower(name),'@fallback'), 'n/a') AS email\n" +
        "FROM customers;",
      recognizeRecall: [
        "**Spot it:** \"replace missing X with a default\", \"use column B when A is null\", data cleaning.",
        "**Say it:** `fillna({col: const})` for constants; `coalesce(a, b, lit('n/a'))` for value fallbacks.",
        "**Trap:** scalar `fillna(0)` skips string columns (type mismatch); neither fillna nor coalesce fixes NaN floats."
      ]
    },

    // ------------------------------------------------------------------ Q253
    {
      id: "dropna-by-null-threshold",
      lc: 253,
      title: "Drop rows by null threshold (dropna how / thresh / subset)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Row filtering by completeness", transformation: "Narrow (map/filter)", functions: "dropna, na.drop (how, thresh, subset)" },
      description:
        "Filter `customers` by completeness. Show three modes of `dropna` (alias `na.drop`): `how='any'` drops a row if **any** field is null; `how='all'` drops only rows that are entirely null; and `thresh=N` keeps rows with at least **N non-null** fields. Use `subset=[...]` to restrict the null check to specific columns.",
      examples: [
        {
          input: "customers: (1,'Mira','NY','m@x.com'), (2,'Kabir',null,null), (3,null,null,null)",
          output: "thresh=2 keeps rows 1 and 2 (row 1 has 4 non-null, row 2 has 2); how='all' would keep 1 and 2, drop 3",
          reasoning: "Row 2 has 2 non-null fields, meeting thresh=2. Row 3 is all null (0 non-null) and fails thresh=2 and how='all'. how='any' would drop rows 2 and 3."
        }
      ],
      approaches: [
        {
          name: "dropna(thresh=N) to keep rows with at least N non-null fields",
          whenToUse: "You want 'reasonably complete' rows, not perfect ones — keep rows with enough real values.",
          logic:
            "**What it asks.** Keep rows that have at least N non-null columns.\n\n" +
            "**Key Idea.** `df.dropna(thresh=N)` counts the **non-null** fields in each row and keeps rows with count >= N. `thresh` overrides `how`. Combine with `subset=[...]` to count only within chosen columns.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Decide the minimum number of populated fields, N.\n" +
            "2. `df.dropna(thresh=N)` (optionally `subset=['city','email']` to check only those).\n" +
            "3. For 'must have these specific columns' use `how='any', subset=[...]` instead.\n\n" +
            "**Why it works.** `thresh` is a per-row non-null count filter — it evaluates each row independently, no shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- `thresh` is 'at least this many NON-null', not 'at most this many null' — a frequent off-by-reasoning bug.\n" +
            "- When `thresh` is set, `how` is **ignored**.\n" +
            "- `subset` changes which columns count toward the threshold; without it, all columns count.\n" +
            "- `dropna` treats null; for NaN floats confirm behavior with `isnan`.\n\n" +
            "**Interview mindset.** 'thresh = minimum non-null fields to keep the row; it wins over how.'",
          rcs:
            "clean = customers.dropna(thresh=2)          # keep rows with >= 2 non-null fields\n" +
            "# only check city & email toward the threshold:\n" +
            "# customers.dropna(thresh=2, subset=['city', 'email'])\n" +
            "clean.show()",
          plain:
            "clean = customers.dropna(thresh=2)\n" +
            "clean.show()"
        },
        {
          name: "dropna(how='any' | 'all', subset=...)",
          whenToUse: "You need complete rows (any) or only to drop entirely-empty rows (all), possibly scoped to key columns.",
          logic:
            "**What it asks.** Drop rows based on null presence, optionally within specific columns.\n\n" +
            "**Key Idea.** `how='any'` drops a row if any checked column is null (default); `how='all'` drops only rows where **every** checked column is null. `subset=[...]` limits the check to those columns — e.g. drop rows missing a required key.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `df.dropna(how='any', subset=['customer_id'])` to require a key.\n" +
            "2. `df.dropna(how='all')` to drop only fully-empty rows.\n" +
            "3. Default `df.dropna()` == `how='any'` across all columns (strictest).\n\n" +
            "**Why it works.** Each mode is a per-row predicate over the subset's null-ness — a narrow filter.\n\n" +
            "**Common Gotchas.**\n" +
            "- Bare `dropna()` defaults to `how='any'` over ALL columns — it can wipe out most of your data if any column is sparsely populated.\n" +
            "- `how='all'` almost never drops anything unless whole rows are empty.\n" +
            "- Always pass `subset` when you only care about specific required fields.\n\n" +
            "**Interview mindset.** 'any = drop if a checked col is null; all = drop only if every checked col is null; subset scopes the check.'",
          rcs:
            "# require a non-null key, ignore other nulls:\n" +
            "have_key = customers.dropna(how='any', subset=['customer_id'])\n" +
            "# drop only rows that are entirely empty:\n" +
            "not_empty = customers.dropna(how='all')\n" +
            "have_key.show()",
          plain:
            "have_key = customers.dropna(how='any', subset=['customer_id'])\n" +
            "not_empty = customers.dropna(how='all')\n" +
            "have_key.show()"
        }
      ],
      sparkInternals:
        "`dropna`/`na.drop` is a **narrow** row filter: each row is evaluated independently against its non-null count, so there is no shuffle and it pipelines with neighboring maps. `how='any'` keeps a row only if none of the checked columns are null; `how='all'` keeps a row unless every checked column is null; `thresh=N` keeps rows whose non-null count is at least N and **overrides** `how` when both are supplied. `subset` restricts which columns feed the null check, letting you enforce required keys without penalizing optional fields. Like the other `na` methods it acts on true nulls, not NaN, so floating-point NaN values pass through unless you handle them separately.",
      sparkSql:
        "-- thresh=2: at least 2 non-null among the four columns\n" +
        "SELECT * FROM customers\n" +
        "WHERE (CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END\n" +
        "     + CASE WHEN name        IS NOT NULL THEN 1 ELSE 0 END\n" +
        "     + CASE WHEN city        IS NOT NULL THEN 1 ELSE 0 END\n" +
        "     + CASE WHEN email       IS NOT NULL THEN 1 ELSE 0 END) >= 2;",
      recognizeRecall: [
        "**Spot it:** \"keep rows with at least N fields\", \"drop incomplete rows\", \"require a non-null key\".",
        "**Say it:** `dropna(thresh=N)` for min non-null; `dropna(how='any'|'all', subset=[...])` otherwise.",
        "**Trap:** bare `dropna()` = how='any' over ALL columns (can nuke your data); thresh overrides how."
      ]
    },

    // ------------------------------------------------------------------ Q254
    {
      id: "not-in-null-trap-vs-left-anti",
      lc: 254,
      title: "The NOT IN null trap vs left_anti / NOT EXISTS",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Anti-join / null-safe exclusion", transformation: "Wide (shuffle)", functions: "join (how='left_anti'), isin, filter" },
      description:
        "Find customers who have **no** transaction. The obvious `WHERE customer_id NOT IN (subquery)` is a trap: if the subquery returns even a single **null** `customer_id`, `NOT IN` collapses to UNKNOWN for every row and returns **ZERO** results. The null-safe fix is a `left_anti` join (equivalent to `NOT EXISTS`).",
      examples: [
        {
          input: "customers: (1,'Mira'),(2,'Kabir'),(3,'Zoe'); transactions customer_ids: 1, null",
          output: "left_anti -> (2,'Kabir'),(3,'Zoe'); NOT IN -> ZERO rows",
          reasoning: "The null in the transaction ids makes `customer_id NOT IN (1, null)` evaluate to UNKNOWN for 2 and 3 (they are not `IN`, but null makes the negation unknown), so NOT IN returns nothing. left_anti correctly returns the two unmatched customers."
        }
      ],
      approaches: [
        {
          name: "left_anti join (null-safe NOT EXISTS)",
          whenToUse: "Rows in A with no match in B, especially when B's key can be null.",
          logic:
            "**What it asks.** Customers with no matching transaction.\n\n" +
            "**Key Idea.** `customers.join(transactions, on='customer_id', how='left_anti')` keeps only left rows that found **no** match — this is `NOT EXISTS`, and it is immune to the null trap because it asks 'did a matching row exist?' rather than comparing against a value list.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Put the table you filter (`customers`) on the left.\n" +
            "2. `join(transactions, on='customer_id', how='left_anti')`.\n" +
            "3. Result is exactly the unmatched left rows.\n\n" +
            "**Why it works.** An anti-join emits a left row only when the join finds no matching right row. Existence is a boolean — there is no three-valued-logic UNKNOWN to swallow your rows.\n\n" +
            "**Common Gotchas.**\n" +
            "- Never use `NOT IN` against a subquery whose column can be null — it returns empty. If you must, filter the nulls out first (`WHERE x NOT IN (SELECT c FROM t WHERE c IS NOT NULL)`), but `left_anti` is cleaner.\n" +
            "- `left_anti` returns only left columns (no right columns), which is usually what you want.\n" +
            "- `IN` / `NOT IN` on a broadcastable Python list via `col.isin(...)` is fine — the trap is specifically a null inside the value set.\n\n" +
            "**Interview mindset.** 'left_anti is NOT EXISTS done right; NOT IN + a nullable subquery = zero rows, every time.'",
          rcs:
            "no_txn = customers.join(                 # left = who we filter\n" +
            "    transactions,\n" +
            "    on='customer_id',\n" +
            "    how='left_anti',                     # keep unmatched left rows only\n" +
            ")\n" +
            "no_txn.show()                            # null-safe, unlike NOT IN",
          plain:
            "no_txn = customers.join(transactions, on='customer_id', how='left_anti')\n" +
            "no_txn.show()"
        },
        {
          name: "why NOT IN breaks (and the manual fix)",
          whenToUse: "Explaining the trap or fixing legacy NOT IN code you can't rewrite as a join.",
          logic:
            "**What it asks.** Show why `NOT IN` with a nullable list returns nothing, and patch it.\n\n" +
            "**Key Idea.** `x NOT IN (1, null)` is `x <> 1 AND x <> null`, and `x <> null` is **UNKNOWN**, so the whole AND is at best UNKNOWN — never true — and every row is filtered out. Remove the null from the set before using NOT IN, or switch to left_anti.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If forced to use `isin`, build the exclusion list with nulls stripped.\n" +
            "2. `ids = [r[0] for r in transactions.select('customer_id').where(col('customer_id').isNotNull()).distinct().collect()]`.\n" +
            "3. `customers.where(~col('customer_id').isin(ids))`.\n" +
            "4. Prefer `left_anti` for anything non-trivial — collecting ids to the driver does not scale.\n\n" +
            "**Why it works.** Once the null is gone, `NOT IN` reduces to plain inequalities that evaluate true/false, so it behaves. But `left_anti` avoids the driver collect entirely.\n\n" +
            "**Common Gotchas.**\n" +
            "- `collect()` pulls the id list to the driver — dangerous on large sets; only viable for small dimension lists.\n" +
            "- `~col.isin(ids)` returns null for rows where the left column itself is null — decide whether those should be kept.\n\n" +
            "**Interview mindset.** 'NOT IN dies on a single null in the set because `x <> null` is UNKNOWN — strip nulls or use left_anti.'",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "# BROKEN if the subquery/list contains null:\n" +
            "# customers.where(~col('customer_id').isin(ids_with_null))  -> can drop everything\n" +
            "\n" +
            "ids = [r[0] for r in transactions\n" +
            "       .select('customer_id')\n" +
            "       .where(col('customer_id').isNotNull())   # strip nulls first!\n" +
            "       .distinct().collect()]\n" +
            "safe = customers.where(~col('customer_id').isin(ids))\n" +
            "safe.show()",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "ids = [r[0] for r in transactions.select('customer_id')\n" +
            "       .where(col('customer_id').isNotNull()).distinct().collect()]\n" +
            "safe = customers.where(~col('customer_id').isin(ids))\n" +
            "safe.show()"
        }
      ],
      sparkInternals:
        "A `left_anti` join is **wide** — Spark hash-partitions both sides by the key and emits a left row only when no matching right row is found, returning left columns only. It is null-safe because it tests row *existence*, a true boolean, rather than evaluating a value against a set. `NOT IN`, by contrast, expands to a conjunction of inequalities under SQL three-valued logic: any `x <> NULL` term is UNKNOWN, which poisons the whole predicate so no row can ever be true, and the result collapses to empty. Stripping nulls from the subquery restores correct behavior, but that requires knowing the trap exists — which is why interviewers love it. The manual `isin` fix also drags the id set to the driver via `collect`, so `left_anti` is both safer and more scalable.",
      sparkSql:
        "-- correct: NOT EXISTS (null-safe)\n" +
        "SELECT c.* FROM customers c\n" +
        "WHERE NOT EXISTS (SELECT 1 FROM transactions t\n" +
        "                  WHERE t.customer_id = c.customer_id);\n" +
        "-- equivalently: LEFT ANTI JOIN transactions ON c.customer_id = t.customer_id\n" +
        "-- BROKEN: ... WHERE c.customer_id NOT IN (SELECT customer_id FROM transactions);",
      recognizeRecall: [
        "**Spot it:** \"customers with no transaction\", \"not in the other table\", NOT IN returning zero rows.",
        "**Say it:** `how='left_anti'` = NOT EXISTS; it is null-safe.",
        "**Trap:** `NOT IN` with a nullable subquery/list returns ZERO rows because `x <> null` is UNKNOWN."
      ]
    },

    // ------------------------------------------------------------------ Q255
    {
      id: "null-handling-in-aggregations-avg",
      lc: 255,
      title: "Null handling in aggregations (avg ignores nulls; true average vs skip)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Null-aware aggregation", transformation: "Wide (shuffle)", functions: "avg, sum, count, coalesce, when, lit" },
      description:
        "Compute average `order_amount` per customer where some amounts are null. `avg` **ignores nulls**, so it equals `sum / count(non-null)`, NOT `sum / count(*)`. Show both interpretations: (a) the default `avg` that skips nulls, and (b) a 'treat null as 0' average using `coalesce(order_amount, 0)` so the null rows count toward the denominator.",
      examples: [
        {
          input: "orders for customer 1: 200, null, 100",
          output: "avg (skip nulls) = 150; avg treating null as 0 = 100",
          reasoning: "Default avg = (200+100)/2 = 150 because the null is skipped in both numerator and denominator. Treating null as 0 = (200+0+100)/3 = 100 because the null row now counts as a zero value over 3 rows."
        }
      ],
      approaches: [
        {
          name: "default avg (skips nulls) vs coalesce-to-0 average",
          whenToUse: "You must state whether a missing amount means 'unknown' (skip) or 'zero' (count it).",
          logic:
            "**What it asks.** Two averages that differ only in how nulls are treated.\n\n" +
            "**Key Idea.** `avg('order_amount')` = `sum(order_amount) / count(order_amount)` — both operands skip nulls, so nulls are simply absent. To count nulls as zeros, average `coalesce(col('order_amount'), lit(0))` so every row contributes and the denominator is the full row count.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Group by `customer_id`.\n" +
            "2. `avg('order_amount').alias('avg_skip_nulls')` — the null-ignoring average.\n" +
            "3. `avg(coalesce(col('order_amount'), lit(0))).alias('avg_null_as_zero')` — nulls become zeros.\n" +
            "4. Optionally add `sum('order_amount') / count(lit(1))` to show the same 'null as 0' result explicitly.\n\n" +
            "**Why it works.** SQL aggregate functions are defined to ignore nulls, so `avg`/`sum`/`count(col)` never see them; forcing nulls to a concrete 0 with `coalesce` puts them back into both the sum and the count.\n\n" +
            "**Common Gotchas.**\n" +
            "- `avg != sum / count('*')` when nulls exist — `avg = sum / count(col)`. Mixing these is a classic wrong answer.\n" +
            "- Deciding 'null = unknown' vs 'null = zero' is a **business** decision; state your assumption in the interview.\n" +
            "- `coalesce(amount, 0)` inside `avg` changes the denominator (all rows) — that is the whole point, but be explicit.\n\n" +
            "**Interview mindset.** 'avg ignores nulls, so it's sum over count of NON-null; if a missing value means zero, coalesce it first so it counts.'",
          rcs:
            "from pyspark.sql.functions import avg, coalesce, col, lit\n" +
            "\n" +
            "result = orders.groupBy('customer_id').agg(\n" +
            "    avg('order_amount').alias('avg_skip_nulls'),        # nulls ignored\n" +
            "    avg(coalesce(col('order_amount'), lit(0)))          # nulls -> 0, counted\n" +
            "        .alias('avg_null_as_zero'),\n" +
            ")\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import avg, coalesce, col, lit\n" +
            "\n" +
            "result = orders.groupBy('customer_id').agg(\n" +
            "    avg('order_amount').alias('avg_skip_nulls'),\n" +
            "    avg(coalesce(col('order_amount'), lit(0))).alias('avg_null_as_zero'),\n" +
            ")\n" +
            "result.show()"
        },
        {
          name: "prove it with sum, count(col), and count('*')",
          whenToUse: "Explaining exactly why the two averages differ.",
          logic:
            "**What it asks.** Show the arithmetic behind the two averages.\n\n" +
            "**Key Idea.** Emit `sum('order_amount')`, `count('order_amount')` (non-null count) and `count(lit(1))` (row count). Then `avg_skip = sum / count(col)` and `avg_zero = sum / count('*')`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `agg(sum('order_amount'), count('order_amount'), count(lit(1)))`.\n" +
            "2. Compute both ratios in `withColumn`.\n" +
            "3. Compare to the direct `avg` results — they match.\n\n" +
            "**Why it works.** `sum` ignores nulls in the numerator, so the only free choice is the denominator: non-null count (skip) or total rows (null-as-zero).\n\n" +
            "**Common Gotchas.**\n" +
            "- Divide-by-zero: if a group has zero non-null values, `count(col)` is 0 and `sum` is null — guard with `when(count(...) > 0, ...)`.\n" +
            "- `sum` of an all-null group is **null**, not 0.\n\n" +
            "**Interview mindset.** 'Same numerator (sum skips nulls); the two averages differ only in the denominator — non-null count vs total rows.'",
          rcs:
            "from pyspark.sql.functions import sum as _sum, count, col, lit\n" +
            "\n" +
            "prof = orders.groupBy('customer_id').agg(\n" +
            "    _sum('order_amount').alias('total'),          # skips nulls\n" +
            "    count('order_amount').alias('non_null_cnt'),  # denominator for avg\n" +
            "    count(lit(1)).alias('row_cnt'),               # denominator for null-as-0\n" +
            ")\n" +
            "prof = prof.withColumn('avg_skip', col('total') / col('non_null_cnt'))\n" +
            "prof = prof.withColumn('avg_zero', col('total') / col('row_cnt'))\n" +
            "prof.show()",
          plain:
            "from pyspark.sql.functions import sum as _sum, count, col, lit\n" +
            "\n" +
            "prof = orders.groupBy('customer_id').agg(\n" +
            "    _sum('order_amount').alias('total'),\n" +
            "    count('order_amount').alias('non_null_cnt'),\n" +
            "    count(lit(1)).alias('row_cnt'),\n" +
            ")\n" +
            "prof = prof.withColumn('avg_skip', col('total') / col('non_null_cnt'))\n" +
            "prof = prof.withColumn('avg_zero', col('total') / col('row_cnt'))\n" +
            "prof.show()",
        }
      ],
      sparkInternals:
        "Aggregations are **wide**: Spark computes partial aggregates per partition and shuffles them to a final combine keyed by the group. Every SQL aggregate here is null-ignoring by definition — `sum`, `count(col)` and `avg` never include a null, so `avg` is mathematically `sum / count(col)`, not `sum / count(*)`. That is why an average silently rises when nulls are present: the denominator shrinks to the non-null count. Forcing nulls to a concrete value with `coalesce(col, 0)` reinserts them into both sum (unchanged, since 0 adds nothing) and count (now full row count), yielding the 'treat missing as zero' average. Watch the empty-group edge: `sum` and `avg` over an all-null group return null, and `count(col)` returns 0, so guard divisions accordingly.",
      sparkSql:
        "SELECT customer_id,\n" +
        "       AVG(order_amount)                 AS avg_skip_nulls,   -- ignores nulls\n" +
        "       AVG(COALESCE(order_amount, 0))    AS avg_null_as_zero, -- nulls counted as 0\n" +
        "       SUM(order_amount) / COUNT(*)      AS same_as_null_as_zero\n" +
        "FROM orders GROUP BY customer_id;",
      recognizeRecall: [
        "**Spot it:** \"average is higher than expected\", \"does a missing amount mean 0 or unknown\", avg over sparse data.",
        "**Say it:** `avg` ignores nulls = `sum / count(col)`; `avg(coalesce(x,0))` counts nulls as zero.",
        "**Trap:** `avg != sum / count('*')` when nulls exist; sum/avg over an all-null group is null, not 0."
      ]
    },

    // ------------------------------------------------------------------ Q256
    {
      id: "dedup-keep-most-complete-record",
      lc: 256,
      title: "Deduplicate keeping the MOST COMPLETE record per key (fewest nulls)",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Window dedup by completeness score", transformation: "Wide (shuffle)", functions: "Window, row_number, when, col, isNull" },
      description:
        "`customers` has duplicate rows per `customer_id`, each partially filled. Keep exactly one row per `customer_id` — the **most complete** one (fewest nulls). Build a non-null-count score per row, then use a window partitioned by `customer_id` ordered by that score descending, and keep `row_number() == 1`.",
      examples: [
        {
          input: "id 1: ('Mira', null, 'm@x.com') and ('Mira', 'NY', null)",
          output: "keep ('Mira','NY',null) or ('Mira',null,'m@x.com') — whichever scores higher; tie -> tiebreaker",
          reasoning: "Each row has 2 non-null of the 3 optional fields, a tie; add a deterministic tiebreaker (e.g. prefer non-null email) so the pick is stable. If one row had all three fields, its score of 3 wins outright."
        }
      ],
      approaches: [
        {
          name: "completeness score + row_number window",
          whenToUse: "Duplicates per key where you want the richest surviving record, not just any/first.",
          logic:
            "**What it asks.** One row per key — the one with the fewest nulls.\n\n" +
            "**Key Idea.** Compute `score = sum of when(col.isNotNull(), 1)` across the optional columns, then rank rows within each `customer_id` by `score` descending using `row_number` over a `Window`, and keep rank 1. Add secondary `orderBy` keys as a deterministic tiebreaker.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the score: `score = sum([when(col(c).isNotNull(), 1).otherwise(0) for c in cols])`.\n" +
            "2. `w = Window.partitionBy('customer_id').orderBy(col('score').desc(), col('email').desc_nulls_last())`.\n" +
            "3. `withColumn('rn', row_number().over(w))`.\n" +
            "4. `filter(col('rn') == 1).drop('rn', 'score')`.\n\n" +
            "**Why it works.** `row_number` assigns 1 to the highest-scoring row per key; ordering by the non-null count puts the most complete record first. Deterministic tiebreakers make the result reproducible.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `row_number`, not `rank`/`dense_rank` — only `row_number` guarantees exactly one row per key even on ties.\n" +
            "- Order nulls in the tiebreaker explicitly with `desc_nulls_last()` / `asc_nulls_last()` so null sort position is not left to chance.\n" +
            "- Build the score from a real column list; `+`-ing `when(...)` expressions works because each yields 1/0.\n" +
            "- `dropDuplicates(['customer_id'])` does NOT do this — it keeps an arbitrary row, not the most complete one.\n\n" +
            "**Interview mindset.** 'Score each row by non-null count, then row_number over a window ordered by score desc — keep rank 1. dropDuplicates picks arbitrarily; this picks the best.'",
          rcs:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import col, when, row_number\n" +
            "\n" +
            "opt_cols = ['name', 'city', 'email']\n" +
            "score = sum(when(col(c).isNotNull(), 1)      # 1 per non-null field\n" +
            "            .otherwise(0) for c in opt_cols) # -> completeness score\n" +
            "\n" +
            "w = Window.partitionBy('customer_id').orderBy(\n" +
            "    col('score').desc(),                     # most complete first\n" +
            "    col('email').desc_nulls_last(),          # deterministic tiebreaker\n" +
            ")\n" +
            "result = (customers\n" +
            "    .withColumn('score', score)\n" +
            "    .withColumn('rn', row_number().over(w))  # exactly one #1 per key\n" +
            "    .filter(col('rn') == 1)\n" +
            "    .drop('rn', 'score'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql.functions import col, when, row_number\n" +
            "\n" +
            "opt_cols = ['name', 'city', 'email']\n" +
            "score = sum(when(col(c).isNotNull(), 1).otherwise(0) for c in opt_cols)\n" +
            "w = Window.partitionBy('customer_id').orderBy(col('score').desc(), col('email').desc_nulls_last())\n" +
            "result = (customers\n" +
            "    .withColumn('score', score)\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .filter(col('rn') == 1)\n" +
            "    .drop('rn', 'score'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A ranking window is **wide**: Spark hash-partitions rows by `customer_id` and sorts within each partition by the `orderBy` keys, then `row_number` numbers them 1..n so filtering to 1 keeps one row per key. The completeness score is a plain per-row expression — a sum of `when(col.isNotNull(), 1)` terms — computed before the window with no extra shuffle. Because null ordering is otherwise unspecified, spell out `desc_nulls_last()`/`asc_nulls_last()` in tiebreakers so the pick is deterministic across runs. Prefer `row_number` over `rank`/`dense_rank`, which can return multiple rows on ties and defeat the dedup. Skew on a hot key concentrates one partition's sort cost, so watch for a single `customer_id` dominating the data.",
      sparkSql:
        "WITH scored AS (\n" +
        "  SELECT *,\n" +
        "    (CASE WHEN name  IS NOT NULL THEN 1 ELSE 0 END\n" +
        "   + CASE WHEN city  IS NOT NULL THEN 1 ELSE 0 END\n" +
        "   + CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) AS score,\n" +
        "    ROW_NUMBER() OVER (PARTITION BY customer_id\n" +
        "      ORDER BY (CASE WHEN name IS NOT NULL THEN 1 ELSE 0 END\n" +
        "              + CASE WHEN city IS NOT NULL THEN 1 ELSE 0 END\n" +
        "              + CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) DESC,\n" +
        "               email DESC NULLS LAST) AS rn\n" +
        "  FROM customers)\n" +
        "SELECT customer_id, name, city, email FROM scored WHERE rn = 1;",
      recognizeRecall: [
        "**Spot it:** \"keep the most complete record\", \"one row per key, richest wins\", golden-record / master-data dedup.",
        "**Say it:** completeness score = sum of `when(col.isNotNull(),1)`; `row_number` over `partitionBy(key).orderBy(score.desc())`, keep rn==1.",
        "**Trap:** `dropDuplicates` picks arbitrarily; use `row_number` (not rank) and explicit `nulls_last` tiebreakers."
      ]
    }

  ]);
})();
