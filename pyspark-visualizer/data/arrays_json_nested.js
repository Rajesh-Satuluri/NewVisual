/*
 * PySpark Interview Lab — Arrays, JSON & Nested (Medium)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * Array / JSON work splits into two performance profiles:
 *   - Per-row transforms (from_json, get_json_object, array_min/max, size,
 *     aggregate, array_contains) are NARROW — one row in, one row out, codegen-
 *     friendly, no shuffle.
 *   - explode / posexplode FAN OUT rows (still narrow per stage), but the
 *     groupBy/count that usually follows an explode is WIDE (shuffle by key).
 */
(function () {
  var CAT = "Arrays, JSON & Nested";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q111
    {
      id: "explode-product-array-count-purchases",
      lc: 111,
      title: "Explode an array of product IDs and count purchases per product",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Explode array + count per key", transformation: "Wide (shuffle)", functions: "explode, groupBy, count" },
      description:
        "Given an `orders` DataFrame (`order_id`, `product_ids`) where `product_ids` is an **array** of the product IDs bought in that order, compute how many times **each product** was purchased across all orders. Flatten the array so every product ID becomes its own row, then count occurrences per product.",
      examples: [
        {
          input: "orders: (1, ['A','B']), (2, ['A']), (3, ['B','C','A'])",
          output: "A -> 3 ; B -> 2 ; C -> 1",
          reasoning: "A appears in orders 1, 2 and 3 (3 times); B in orders 1 and 3 (2 times); C only in order 3 (1 time)."
        }
      ],
      approaches: [
        {
          name: "explode(product_ids) then groupBy + count",
          whenToUse: "Any 'count/aggregate the elements inside an array column' task.",
          logic:
            "**What it asks.** A per-product purchase count, where each order holds an array of the products it contains.\n\n" +
            "**Key Idea.** `explode(col('product_ids'))` turns one array row into **N rows**, one per element, so a normal `groupBy('product_id').count()` can then tally each product. Explode is the bridge from a nested array to flat, group-able rows.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Flatten the array: `withColumn('product_id', explode(col('product_ids')))`.\n" +
            "2. Group by the flattened element: `.groupBy('product_id')`.\n" +
            "3. Count: `.count()` (or `.agg(count('*').alias('purchase_count'))`).\n\n" +
            "**Why it works.** After explode, each product occurrence is a distinct row keyed by `product_id`, so counting rows per key is exactly the number of times the product was purchased.\n\n" +
            "**Common Gotchas.**\n" +
            "- `explode` **drops** rows whose array is null or empty; use `explode_outer` if an order with no products must still appear (as a null).\n" +
            "- Use `posexplode` if you also need each element's index within the array.\n" +
            "- Counting before exploding (e.g. `size`) counts products *per order*, not *per product* — explode first, then group.\n\n" +
            "**Interview mindset.** Say 'explode to flatten the array into rows, then groupBy + count like any normal aggregation'; mention explode vs explode_outer for empty arrays.",
          rcs:
            "from pyspark.sql.functions import col, explode, count\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('product_id', explode(col('product_ids')))  # one row per product\n" +
            "    .groupBy('product_id')                                  # tally each product\n" +
            "    .agg(count('*').alias('purchase_count')))               # times purchased\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, explode, count\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('product_id', explode(col('product_ids')))\n" +
            "    .groupBy('product_id')\n" +
            "    .agg(count('*').alias('purchase_count')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`explode` is a **narrow, generator** expression: it fans one input row into many output rows within the same partition, no shuffle. The cost lands on the following `groupBy('product_id').count()`, which is **wide** — Spark hash-shuffles the exploded rows by `product_id` so equal products meet on one reducer. `count` supports **map-side partial aggregation**, so each partition emits local subtotals before the shuffle, keeping shuffled data small (one partial count per product per partition). A single order with a huge array can inflate one partition post-explode; a product bought far more than others creates key skew in the aggregation.",
      sparkSql:
        "SELECT product_id, COUNT(*) AS purchase_count\n" +
        "FROM orders\n" +
        "LATERAL VIEW EXPLODE(product_ids) t AS product_id\n" +
        "GROUP BY product_id;",
      recognizeRecall: [
        "**Spot it:** 'array column of items', 'count each product/tag/id inside the array', 'how many times each element appears'.",
        "**Say it:** `explode(col('product_ids'))` to flatten, then `groupBy('product_id').count()`.",
        "**Trap:** explode drops empty/null arrays (use explode_outer); explode first, then group — don't size()-count per row."
      ]
    },

    // ------------------------------------------------------------------ Q112
    {
      id: "customers-who-bought-specific-product",
      lc: 112,
      title: "Find customers who purchased a specific product in an array column",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Membership test on array column", transformation: "Narrow (no shuffle)", functions: "array_contains, filter" },
      description:
        "Given a `purchases` DataFrame (`customer_id`, `product_ids`) where `product_ids` is an **array** of product IDs, return the customers who bought a **specific** product (say `'P100'`). Test each row's array for membership rather than exploding the whole table.",
      examples: [
        {
          input: "purchases: (c1, ['P100','P200']), (c2, ['P200']), (c3, ['P300','P100'])",
          output: "c1 and c3 (both contain P100) ; c2 excluded",
          reasoning: "c1 and c3 have P100 inside their product_ids array; c2 does not, so it is filtered out."
        }
      ],
      approaches: [
        {
          name: "array_contains(product_ids, 'P100') as a row filter",
          whenToUse: "Checking whether a single known value is present in an array column — no need to flatten.",
          logic:
            "**What it asks.** The customers whose purchase array includes a particular product ID.\n\n" +
            "**Key Idea.** `array_contains(col('product_ids'), 'P100')` returns a boolean per row — true when the array holds that element. Filtering on it keeps exactly the matching customers, with **no explode and no shuffle**.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Apply the membership predicate: `purchases.filter(array_contains(col('product_ids'), 'P100'))`.\n" +
            "2. Select the customers: `.select('customer_id').distinct()` if a customer can appear on multiple rows.\n\n" +
            "**Why it works.** `array_contains` scans the array in-place and yields a single boolean, so the whole operation is a per-row filter — far cheaper than exploding every element just to test one value.\n\n" +
            "**Common Gotchas.**\n" +
            "- Prefer `array_contains` over `explode(...).filter(col('product_id') == 'P100')`: exploding fans out every element (and needs a later distinct) when a direct membership test suffices.\n" +
            "- `array_contains` returns null when the array itself is null; wrap in `coalesce(..., lit(False))` if nulls must be treated as 'not present'.\n" +
            "- Add `.distinct()` if the same customer can have several purchase rows and you want them once.\n\n" +
            "**Interview mindset.** 'One known value inside an array = array_contains, a narrow filter'; contrast with explode (only needed when you must aggregate or transform the elements themselves).",
          rcs:
            "from pyspark.sql.functions import col, array_contains\n" +
            "\n" +
            "result = (purchases\n" +
            "    .filter(array_contains(col('product_ids'), 'P100'))  # array holds the product\n" +
            "    .select('customer_id')\n" +
            "    .distinct())                                         # one row per customer\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, array_contains\n" +
            "\n" +
            "result = (purchases\n" +
            "    .filter(array_contains(col('product_ids'), 'P100'))\n" +
            "    .select('customer_id')\n" +
            "    .distinct())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`array_contains` is a **narrow**, codegen-friendly expression evaluated per row — no data movement. The `filter` is pushed as early as the plan allows. The only wide step is the optional `distinct()`, which shuffles the surviving `customer_id`s to dedupe (skip it if rows are already unique per customer). Compared with the explode-then-filter alternative, this avoids materializing one row per array element and the extra distinct that explode would force, so it reads and shuffles dramatically less on wide arrays.",
      sparkSql:
        "SELECT DISTINCT customer_id\n" +
        "FROM purchases\n" +
        "WHERE ARRAY_CONTAINS(product_ids, 'P100');",
      recognizeRecall: [
        "**Spot it:** 'who bought product X', 'rows whose array contains value V', 'has tag/permission in a list'.",
        "**Say it:** `filter(array_contains(col('product_ids'), 'P100'))` — a narrow membership test, no explode.",
        "**Trap:** don't explode just to test one value; array_contains is null on null arrays; add distinct if customers repeat."
      ]
    },

    // ------------------------------------------------------------------ Q113
    {
      id: "array-row-sum-avg-min-max",
      lc: 113,
      title: "Per-row sum, average, minimum and maximum of an array of integers",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Array reductions per row", transformation: "Narrow (no shuffle)", functions: "aggregate, size, array_min, array_max" },
      description:
        "Given a `readings` DataFrame (`id`, `nums`) where `nums` is an **array of integers**, compute for each row the array's `sum`, `avg`, `min` and `max` — without exploding the array. Use the higher-order `aggregate` for the sum, `size` for the count (to derive the average), and the built-in `array_min` / `array_max`.",
      examples: [
        {
          input: "readings: (1, [10, 20, 30]), (2, [5, 15])",
          output: "row 1 -> sum 60, avg 20.0, min 10, max 30 ; row 2 -> sum 20, avg 10.0, min 5, max 15",
          reasoning: "Row 1: 10+20+30=60, 60/3=20.0, min 10, max 30. Row 2: 5+15=20, 20/2=10.0, min 5, max 15."
        }
      ],
      approaches: [
        {
          name: "aggregate for sum, size for avg, array_min / array_max",
          whenToUse: "Reducing each row's array to scalar statistics, keeping one row per input row.",
          logic:
            "**What it asks.** Four scalar statistics computed **within each row's array**, leaving the row count unchanged.\n\n" +
            "**Key Idea.** Use per-row array functions instead of explode+groupBy. `aggregate(arr, start, merge)` folds the array to a running total; `size(arr)` gives the element count so `sum / size` is the average; `array_min` and `array_max` return the smallest and largest elements directly.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sum with the higher-order function: `aggregate(col('nums'), lit(0), lambda acc, x: acc + x)`.\n" +
            "2. Count elements: `size(col('nums'))`.\n" +
            "3. Average: divide the sum by the size (cast so it is a float, not integer division).\n" +
            "4. Extremes: `array_min(col('nums'))` and `array_max(col('nums'))`.\n\n" +
            "**Why it works.** `aggregate` is a true fold over the array elements in one pass; `array_min`/`array_max` scan the array once each. All operate on the array in place, so the DataFrame keeps exactly one output row per input row.\n\n" +
            "**Common Gotchas.**\n" +
            "- Seed `aggregate` with `lit(0)` of the right numeric type; the accumulator type follows the start value, so an int start truncates a float sum.\n" +
            "- Compute the average as `sum / size` (cast to double); guard `size == 0` for empty arrays to avoid divide-by-zero.\n" +
            "- These are **not** the aggregate `sum/avg/min/max` you'd use after a groupBy — those collapse rows; here `aggregate`, `array_min`, `array_max` work *inside* one row.\n\n" +
            "**Interview mindset.** Name the higher-order function `aggregate` explicitly and contrast per-row array reductions with the explode+groupBy approach — the interviewer wants to see you avoid an unnecessary shuffle.",
          rcs:
            "from pyspark.sql.functions import col, aggregate, size, array_min, array_max, lit\n" +
            "\n" +
            "arr_sum = aggregate(col('nums'), lit(0), lambda acc, x: acc + x)  # fold to a total\n" +
            "\n" +
            "result = (readings\n" +
            "    .withColumn('sum', arr_sum)\n" +
            "    .withColumn('avg', arr_sum / size(col('nums')))              # total / element count\n" +
            "    .withColumn('min', array_min(col('nums')))                   # smallest element\n" +
            "    .withColumn('max', array_max(col('nums'))))                  # largest element\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, aggregate, size, array_min, array_max, lit\n" +
            "\n" +
            "arr_sum = aggregate(col('nums'), lit(0), lambda acc, x: acc + x)\n" +
            "\n" +
            "result = (readings\n" +
            "    .withColumn('sum', arr_sum)\n" +
            "    .withColumn('avg', arr_sum / size(col('nums')))\n" +
            "    .withColumn('min', array_min(col('nums')))\n" +
            "    .withColumn('max', array_max(col('nums'))))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Every step here is **narrow** — no shuffle, one row in and one row out. `aggregate`, `size`, `array_min`, and `array_max` are higher-order / built-in array expressions that Catalyst compiles to whole-stage codegen operating on Spark's internal `ArrayData` without materializing extra rows. This is the key contrast with the explode+groupBy route: that would fan out one row per element and then shuffle to regroup by `id`, whereas these per-row functions keep the data in place. Cost scales with total elements, but stays within each partition. Empty arrays make `array_min`/`array_max` return null and `size` return 0, so guard the average's division.",
      sparkSql:
        "SELECT id,\n" +
        "       AGGREGATE(nums, 0, (acc, x) -> acc + x) AS sum,\n" +
        "       AGGREGATE(nums, 0, (acc, x) -> acc + x) / SIZE(nums) AS avg,\n" +
        "       ARRAY_MIN(nums) AS min,\n" +
        "       ARRAY_MAX(nums) AS max\n" +
        "FROM readings;",
      recognizeRecall: [
        "**Spot it:** 'sum/avg/min/max of the array in each row', 'reduce an array column to scalars per row'.",
        "**Say it:** `aggregate(arr, lit(0), lambda acc,x: acc+x)` for sum, `/ size(arr)` for avg, `array_min` / `array_max` for extremes.",
        "**Trap:** these are per-row array functions (no shuffle), not post-groupBy aggregates; seed aggregate with the right type; guard empty arrays."
      ]
    },

    // ------------------------------------------------------------------ Q114
    {
      id: "explode-array-of-structs-extract-fields",
      lc: 114,
      title: "Explode an array of structs and extract individual fields",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Explode array of structs + dot access", transformation: "Wide (shuffle)", functions: "explode, col, struct field access" },
      description:
        "Given an `orders` DataFrame (`order_id`, `items`) where `items` is an **array of structs** each shaped `{product_id, quantity, price}`, produce one flat row per item with the struct's fields lifted into their own top-level columns. Explode the array, then reach into the struct with dot notation.",
      examples: [
        {
          input: "orders: (1, [{p:'A', q:2, pr:10.0}, {p:'B', q:1, pr:5.0}])",
          output: "(1,'A',2,10.0) ; (1,'B',1,5.0)",
          reasoning: "The single order's two-element struct array becomes two rows, each with product_id, quantity and price pulled out of the struct into flat columns."
        }
      ],
      approaches: [
        {
          name: "explode(items) then item.field for each struct field",
          whenToUse: "Flattening an array of structs (line items, events, nested records) into a tabular shape.",
          logic:
            "**What it asks.** A flat, one-row-per-item table built from an array of struct records nested inside each order.\n\n" +
            "**Key Idea.** `explode(col('items'))` gives one row per struct element; the exploded column is itself a **struct**, so `col('item.product_id')` (dot access) pulls each nested field out into its own column.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Explode the array of structs: `withColumn('item', explode(col('items')))`.\n" +
            "2. Project the struct fields with dot notation: `col('item.product_id')`, `col('item.quantity')`, `col('item.price')`.\n" +
            "3. Select `order_id` plus those extracted fields (alias each cleanly).\n\n" +
            "**Why it works.** Explode flattens the outer array into rows; each resulting `item` retains its struct type, and dot access resolves the named subfields at the schema level (no parsing needed — the struct is already typed).\n\n" +
            "**Common Gotchas.**\n" +
            "- Access nested fields with `col('item.product_id')` (or `col('item')['product_id']`), not string manipulation — the struct is already schema-typed.\n" +
            "- `explode` drops orders with a null/empty `items` array; use `explode_outer` to keep them.\n" +
            "- Use `posexplode` if the item's position within the order matters (e.g. a line number).\n\n" +
            "**Interview mindset.** 'explode the array of structs to one row each, then dot into the struct fields' — emphasize that no JSON parsing is involved because the array-of-structs is already a typed column.",
          rcs:
            "from pyspark.sql.functions import col, explode\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('item', explode(col('items')))          # one row per struct element\n" +
            "    .select(\n" +
            "        'order_id',\n" +
            "        col('item.product_id').alias('product_id'),     # dot into the struct\n" +
            "        col('item.quantity').alias('quantity'),\n" +
            "        col('item.price').alias('price')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, explode\n" +
            "\n" +
            "result = (orders\n" +
            "    .withColumn('item', explode(col('items')))\n" +
            "    .select(\n" +
            "        'order_id',\n" +
            "        col('item.product_id').alias('product_id'),\n" +
            "        col('item.quantity').alias('quantity'),\n" +
            "        col('item.price').alias('price')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`explode` is a **narrow generator** that fans one row into many within a partition — no shuffle by itself; the 'wide' label here flags the row **fan-out** that reshapes partition sizes and typically feeds a downstream shuffle (a groupBy or join on the flattened rows). Dot-access field extraction (`item.product_id`) is a pure **narrow** projection resolved against the struct schema in codegen — it reads only the referenced subfields, so column pruning can skip untouched struct fields on columnar sources. An order with a very large `items` array becomes a hotspot partition after explode. No parsing cost, unlike JSON — the struct is already typed.",
      sparkSql:
        "SELECT order_id,\n" +
        "       item.product_id AS product_id,\n" +
        "       item.quantity   AS quantity,\n" +
        "       item.price      AS price\n" +
        "FROM orders\n" +
        "LATERAL VIEW EXPLODE(items) t AS item;",
      recognizeRecall: [
        "**Spot it:** 'array of structs', 'nested line items / records', 'flatten one row per item with fields pulled out'.",
        "**Say it:** `explode(col('items'))` then `col('item.field')` dot access for each struct field.",
        "**Trap:** it's typed struct access, not JSON parsing; explode drops empty arrays (use explode_outer); posexplode for position."
      ]
    },

    // ------------------------------------------------------------------ Q115
    {
      id: "parse-json-string-to-struct",
      lc: 115,
      title: "Parse a JSON string column into a structured DataFrame",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Parse JSON string with schema", transformation: "Narrow (no shuffle)", functions: "from_json, StructType, schema_of_json" },
      description:
        "Given an `events` DataFrame (`event_id`, `payload`) where `payload` is a **JSON string** like `{\"user\":\"u1\",\"action\":\"click\",\"count\":3}`, parse it into a real typed struct and lift its fields into their own columns. Define a `StructType` schema and apply `from_json`.",
      examples: [
        {
          input: "events: (1, '{\"user\":\"u1\",\"action\":\"click\",\"count\":3}')",
          output: "(1, 'u1', 'click', 3)  with typed columns user:string, action:string, count:int",
          reasoning: "from_json parses the JSON string against the schema into a struct; selecting the struct's fields yields typed top-level columns."
        }
      ],
      approaches: [
        {
          name: "from_json with an explicit StructType schema",
          whenToUse: "A JSON string column whose shape you know and want as typed, queryable columns.",
          logic:
            "**What it asks.** Turn a column of JSON text into structured, typed columns.\n\n" +
            "**Key Idea.** `from_json(col('payload'), schema)` parses each JSON string into a **struct** using an explicit `StructType`; you then dot into (or `.select('parsed.*')`) to promote the fields to top-level columns with correct types.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Declare the schema: `StructType([StructField('user', StringType()), StructField('action', StringType()), StructField('count', IntegerType())])`.\n" +
            "2. Parse: `withColumn('parsed', from_json(col('payload'), schema))`.\n" +
            "3. Flatten: `.select('event_id', 'parsed.*')` to expand the struct fields.\n\n" +
            "**Why it works.** `from_json` reads each string once and materializes a typed struct matching the schema; `parsed.*` expands that struct into individual columns, giving a fully structured DataFrame.\n\n" +
            "**Common Gotchas.**\n" +
            "- An **explicit schema** is the robust choice: fields absent from the JSON come back null, and a mismatched value yields null (or a corrupt-record column) rather than crashing.\n" +
            "- Getting a type wrong (e.g. `count` as StringType) parses but leaves it unusably typed — match the JSON's real types.\n" +
            "- To avoid hand-writing the schema you can infer one with `schema_of_json(lit(sample_json))`, but a hard-coded schema is more predictable in production (see the alternative approach).\n" +
            "- `from_json` returns null for malformed JSON; check for nulls if input can be dirty.\n\n" +
            "**Interview mindset.** 'Define a StructType, apply from_json, then parsed.* to flatten' — and note that an explicit schema beats inference for stability in a pipeline.",
          rcs:
            "from pyspark.sql.functions import col, from_json\n" +
            "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
            "\n" +
            "schema = StructType([                                    # known JSON shape\n" +
            "    StructField('user', StringType()),\n" +
            "    StructField('action', StringType()),\n" +
            "    StructField('count', IntegerType())])\n" +
            "\n" +
            "result = (events\n" +
            "    .withColumn('parsed', from_json(col('payload'), schema))  # string -> struct\n" +
            "    .select('event_id', 'parsed.*'))                    # flatten struct fields\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, from_json\n" +
            "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
            "\n" +
            "schema = StructType([\n" +
            "    StructField('user', StringType()),\n" +
            "    StructField('action', StringType()),\n" +
            "    StructField('count', IntegerType())])\n" +
            "\n" +
            "result = (events\n" +
            "    .withColumn('parsed', from_json(col('payload'), schema))\n" +
            "    .select('event_id', 'parsed.*'))\n" +
            "result.show()"
        },
        {
          name: "schema_of_json to infer the schema, then from_json",
          whenToUse: "Exploratory parsing when the JSON shape is stable but you don't want to hand-write a StructType.",
          logic:
            "**What it asks.** Same goal — parse the JSON — but derive the schema automatically from a representative sample.\n\n" +
            "**Key Idea.** `schema_of_json(lit(sample))` inspects one representative JSON string and returns a schema expression, which you pass straight to `from_json`. Handy for exploration; less deterministic than an explicit schema in production.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Pick a representative row's JSON as a literal `sample`.\n" +
            "2. Infer: `inferred = schema_of_json(lit(sample))`.\n" +
            "3. Parse and flatten: `from_json(col('payload'), inferred)` then `.select('event_id', 'parsed.*')`.\n\n" +
            "**Why it works.** `schema_of_json` produces the same kind of schema `from_json` expects, so it slots in wherever an explicit `StructType` would go.\n\n" +
            "**Common Gotchas.**\n" +
            "- Inference reflects only the **sample** — a field missing from that sample won't appear, and numeric types may widen (long/double) unexpectedly.\n" +
            "- For stable pipelines prefer the explicit `StructType`; reserve inference for notebooks/exploration.\n\n" +
            "**Interview mindset.** Mention `schema_of_json` as the quick path, but say you'd pin an explicit schema for a production job.",
          rcs:
            "from pyspark.sql.functions import col, from_json, schema_of_json, lit\n" +
            "\n" +
            "sample = '{\"user\":\"u1\",\"action\":\"click\",\"count\":3}'    # representative row\n" +
            "inferred = schema_of_json(lit(sample))                  # derive schema from sample\n" +
            "\n" +
            "result = (events\n" +
            "    .withColumn('parsed', from_json(col('payload'), inferred))  # parse with inferred schema\n" +
            "    .select('event_id', 'parsed.*'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, from_json, schema_of_json, lit\n" +
            "\n" +
            "sample = '{\"user\":\"u1\",\"action\":\"click\",\"count\":3}'\n" +
            "inferred = schema_of_json(lit(sample))\n" +
            "\n" +
            "result = (events\n" +
            "    .withColumn('parsed', from_json(col('payload'), inferred))\n" +
            "    .select('event_id', 'parsed.*'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`from_json` is a **narrow**, per-row expression — no shuffle. Catalyst compiles it into whole-stage codegen backed by a streaming JSON parser (Jackson), so each string is parsed once into an internal struct; selecting `parsed.*` is a zero-copy projection over that struct. An **explicit schema** lets the parser read only the declared fields and skip the rest, which is faster and more stable than `schema_of_json` (inference requires an extra pass/sample and can pick surprising types). Malformed records become null (or populate a `columnNameOfCorruptRecord` column if configured) instead of failing the job. Because it's narrow, parsing parallelizes perfectly across partitions.",
      sparkSql:
        "SELECT event_id,\n" +
        "       parsed.user   AS user,\n" +
        "       parsed.action AS action,\n" +
        "       parsed.count  AS count\n" +
        "FROM (\n" +
        "  SELECT event_id,\n" +
        "         FROM_JSON(payload, 'user STRING, action STRING, count INT') AS parsed\n" +
        "  FROM events\n" +
        ") t;",
      recognizeRecall: [
        "**Spot it:** 'JSON string column', 'parse the payload into columns', 'stringified JSON to a struct'.",
        "**Say it:** define a `StructType`, `from_json(col('payload'), schema)`, then `select('parsed.*')` to flatten.",
        "**Trap:** prefer an explicit schema over schema_of_json for stability; malformed JSON parses to null; match the real field types."
      ]
    },

    // ------------------------------------------------------------------ Q116
    {
      id: "extract-nested-fields-from-json",
      lc: 116,
      title: "Extract nested fields from a JSON column",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Pull nested JSON fields", transformation: "Narrow (no shuffle)", functions: "from_json, get_json_object, dot access" },
      description:
        "Given a `logs` DataFrame (`log_id`, `body`) where `body` is a JSON string with **nested** objects like `{\"user\":{\"id\":\"u1\",\"geo\":{\"city\":\"NYC\"}},\"status\":200}`, pull out deep fields such as the user's city and the status code. Either parse the whole thing with a nested `from_json` schema and dot into it, or grab a single field cheaply with `get_json_object`.",
      examples: [
        {
          input: "logs: (1, '{\"user\":{\"id\":\"u1\",\"geo\":{\"city\":\"NYC\"}},\"status\":200}')",
          output: "(1, 'u1', 'NYC', 200)",
          reasoning: "user.id -> 'u1', user.geo.city -> 'NYC', status -> 200, each lifted from its nested position in the JSON."
        }
      ],
      approaches: [
        {
          name: "from_json with a nested schema, then dot-access deep fields",
          whenToUse: "You need several nested fields as typed columns — parse once, reuse the struct.",
          logic:
            "**What it asks.** Deeply nested values (e.g. `user.geo.city`) lifted into flat, typed columns.\n\n" +
            "**Key Idea.** Build a `StructType` that **mirrors the nesting** (a struct inside a struct), parse the whole body once with `from_json`, then reach any depth with chained dot access: `col('parsed.user.geo.city')`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Declare a nested schema: an outer struct with a `user` StructField that itself contains `id` and a nested `geo` struct with `city`, plus a top-level `status`.\n" +
            "2. Parse once: `withColumn('parsed', from_json(col('body'), schema))`.\n" +
            "3. Dot into the depths: `col('parsed.user.id')`, `col('parsed.user.geo.city')`, `col('parsed.status')`.\n\n" +
            "**Why it works.** `from_json` reconstructs the full nested struct in one parse; chained dot access resolves each level against the schema, so extracting many fields costs only one parse.\n\n" +
            "**Common Gotchas.**\n" +
            "- The schema must reflect the **nesting** exactly; a flat schema can't reach `user.geo.city`.\n" +
            "- For a **single** field, `get_json_object(col('body'), '$.user.geo.city')` avoids declaring a schema entirely (see the alternative) — but it returns a **string** and re-scans the JSON per call, so it's wasteful for many fields.\n" +
            "- Missing nested keys resolve to null rather than erroring.\n\n" +
            "**Interview mindset.** 'Parse once with a nested schema, then dot-access many fields' vs 'get_json_object for a quick one-off field' — state the trade-off (one parse + typed vs schema-free + string, re-parsed).",
          rcs:
            "from pyspark.sql.functions import col, from_json\n" +
            "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
            "\n" +
            "schema = StructType([                                    # mirror the JSON nesting\n" +
            "    StructField('user', StructType([\n" +
            "        StructField('id', StringType()),\n" +
            "        StructField('geo', StructType([\n" +
            "            StructField('city', StringType())]))])),\n" +
            "    StructField('status', IntegerType())])\n" +
            "\n" +
            "result = (logs\n" +
            "    .withColumn('parsed', from_json(col('body'), schema))    # parse once\n" +
            "    .select(\n" +
            "        'log_id',\n" +
            "        col('parsed.user.id').alias('user_id'),          # dot to any depth\n" +
            "        col('parsed.user.geo.city').alias('city'),\n" +
            "        col('parsed.status').alias('status')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, from_json\n" +
            "from pyspark.sql.types import StructType, StructField, StringType, IntegerType\n" +
            "\n" +
            "schema = StructType([\n" +
            "    StructField('user', StructType([\n" +
            "        StructField('id', StringType()),\n" +
            "        StructField('geo', StructType([\n" +
            "            StructField('city', StringType())]))])),\n" +
            "    StructField('status', IntegerType())])\n" +
            "\n" +
            "result = (logs\n" +
            "    .withColumn('parsed', from_json(col('body'), schema))\n" +
            "    .select(\n" +
            "        'log_id',\n" +
            "        col('parsed.user.id').alias('user_id'),\n" +
            "        col('parsed.user.geo.city').alias('city'),\n" +
            "        col('parsed.status').alias('status')))\n" +
            "result.show()"
        },
        {
          name: "get_json_object for a single deep field (no schema)",
          whenToUse: "Pulling one or two fields quickly without declaring a schema; values can stay strings.",
          logic:
            "**What it asks.** The same nested value, but grabbed directly without building a `StructType`.\n\n" +
            "**Key Idea.** `get_json_object(col('body'), '$.user.geo.city')` uses a **JSONPath** to extract one field from the raw JSON string, returning it as a string. No schema required.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write the JSONPath for each field: `'$.user.id'`, `'$.user.geo.city'`, `'$.status'`.\n" +
            "2. Extract: `withColumn('city', get_json_object(col('body'), '$.user.geo.city'))`.\n" +
            "3. Cast where a non-string type is needed: `get_json_object(...).cast('int')` for `status`.\n\n" +
            "**Why it works.** `get_json_object` parses the JSON on the fly and follows the JSONPath to the target, yielding that leaf value as text.\n\n" +
            "**Common Gotchas.**\n" +
            "- Every result is a **string** — cast explicitly for numeric/boolean fields.\n" +
            "- Each `get_json_object` call re-parses the JSON, so extracting many fields this way is far slower than one `from_json`.\n" +
            "- A missing path returns null.\n\n" +
            "**Interview mindset.** 'get_json_object = quick, schema-free, one field, string result'; escalate to `from_json` once you need several fields or real types.",
          rcs:
            "from pyspark.sql.functions import col, get_json_object\n" +
            "\n" +
            "result = (logs.select(\n" +
            "    'log_id',\n" +
            "    get_json_object(col('body'), '$.user.id').alias('user_id'),          # JSONPath extract\n" +
            "    get_json_object(col('body'), '$.user.geo.city').alias('city'),\n" +
            "    get_json_object(col('body'), '$.status').cast('int').alias('status')))  # cast string -> int\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, get_json_object\n" +
            "\n" +
            "result = (logs.select(\n" +
            "    'log_id',\n" +
            "    get_json_object(col('body'), '$.user.id').alias('user_id'),\n" +
            "    get_json_object(col('body'), '$.user.geo.city').alias('city'),\n" +
            "    get_json_object(col('body'), '$.status').cast('int').alias('status')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Both routes are **narrow**, per-row, no shuffle. `from_json` with a nested schema parses each record **once** into a typed struct; deep dot access (`parsed.user.geo.city`) is a codegen projection over that struct and can benefit from nested-column pruning (Spark reads only the referenced leaves). `get_json_object` is schema-free but **re-parses** the JSON string on every call and always returns a string, so pulling K fields means K parses per row — fine for one-off extraction, wasteful at scale. Rule of thumb: many fields or typed output -> one `from_json`; a single ad-hoc field -> `get_json_object`.",
      sparkSql:
        "SELECT log_id,\n" +
        "       GET_JSON_OBJECT(body, '$.user.id')       AS user_id,\n" +
        "       GET_JSON_OBJECT(body, '$.user.geo.city') AS city,\n" +
        "       CAST(GET_JSON_OBJECT(body, '$.status') AS INT) AS status\n" +
        "FROM logs;",
      recognizeRecall: [
        "**Spot it:** 'nested JSON', 'pull user.geo.city', 'deep field inside a JSON column'.",
        "**Say it:** nested `StructType` + `from_json` then `col('parsed.user.geo.city')`; or `get_json_object(body, '$.user.geo.city')` for one field.",
        "**Trap:** get_json_object returns strings and re-parses per call; from_json parses once and keeps types — schema must mirror the nesting."
      ]
    },

    // ------------------------------------------------------------------ Q117
    {
      id: "split-and-explode-csv-column",
      lc: 117,
      title: "Split a comma-separated column and explode into individual rows",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Split string to array + explode", transformation: "Wide (shuffle)", functions: "split, explode" },
      description:
        "Given a `users` DataFrame (`user_id`, `tags`) where `tags` is a **comma-separated string** like `'sports,music,tech'`, produce one row per individual tag. Split the string into an array on the delimiter, then explode that array into rows.",
      examples: [
        {
          input: "users: (1, 'sports,music'), (2, 'tech')",
          output: "(1,'sports'), (1,'music'), (2,'tech')",
          reasoning: "User 1's 'sports,music' splits into ['sports','music'] then explodes to two rows; user 2's single 'tech' becomes one row."
        }
      ],
      approaches: [
        {
          name: "split(tags, ',') then explode the resulting array",
          whenToUse: "A delimited string that must become one row per element (tags, CSV cells, multi-value fields).",
          logic:
            "**What it asks.** One row per tag, starting from a single comma-joined string per user.\n\n" +
            "**Key Idea.** Two steps: `split(col('tags'), ',')` converts the string into an **array** of tags, and `explode(...)` fans that array into one row per element.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Split on the delimiter: `split(col('tags'), ',')` -> an array column.\n" +
            "2. Explode it: `withColumn('tag', explode(split(col('tags'), ',')))`.\n" +
            "3. Select `user_id` and the exploded `tag`.\n\n" +
            "**Why it works.** `split` uses the delimiter to build an array; `explode` then flattens that array to rows, giving the desired one-row-per-tag shape.\n\n" +
            "**Common Gotchas.**\n" +
            "- `split`'s pattern is a **regex** — a literal `,` is fine, but a delimiter like `|` or `.` must be escaped (`'\\\\|'`, `'\\\\.'`).\n" +
            "- Trim whitespace (`trim`) if the CSV has `', '` gaps, or split on `',\\\\s*'`, so tags don't carry leading spaces.\n" +
            "- `explode` drops rows where the array is empty; an empty string splits to `['']` (a single empty tag) — filter those out if unwanted.\n\n" +
            "**Interview mindset.** 'split the delimited string into an array, then explode to rows' — call out that split takes a regex and mention trimming stray spaces.",
          rcs:
            "from pyspark.sql.functions import col, split, explode\n" +
            "\n" +
            "result = (users\n" +
            "    .withColumn('tag', explode(split(col('tags'), ',')))  # 'a,b' -> ['a','b'] -> rows\n" +
            "    .select('user_id', 'tag'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, split, explode\n" +
            "\n" +
            "result = (users\n" +
            "    .withColumn('tag', explode(split(col('tags'), ',')))\n" +
            "    .select('user_id', 'tag'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`split` is a **narrow** per-row expression (string -> array, in codegen). `explode` is a **narrow generator** that fans each row into many within its partition — no shuffle on its own; the 'wide' label flags the row **fan-out** and the fact that this pattern almost always precedes a shuffle (a groupBy/count or join on the exploded tags, e.g. Q118). Nothing crosses the network until that follow-on aggregation. A user with a very long tag string produces many rows on one partition (a potential post-explode hotspot). Remember `split` compiles its delimiter as a **regex**, so special characters need escaping.",
      sparkSql:
        "SELECT user_id, tag\n" +
        "FROM users\n" +
        "LATERAL VIEW EXPLODE(SPLIT(tags, ',')) t AS tag;",
      recognizeRecall: [
        "**Spot it:** 'comma-separated column', 'delimited string to rows', 'one row per tag/value'.",
        "**Say it:** `explode(split(col('tags'), ','))` — split to an array, then explode to rows.",
        "**Trap:** split's delimiter is a regex (escape `|`, `.`); trim spaces from ', ' gaps; empty string splits to a single '' element."
      ]
    },

    // ------------------------------------------------------------------ Q118
    {
      id: "most-common-item-in-array-column",
      lc: 118,
      title: "Find the most common item appearing in an array column",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Explode + count + top-1", transformation: "Wide (shuffle)", functions: "explode, groupBy, count, orderBy, limit" },
      description:
        "Given a `baskets` DataFrame (`basket_id`, `items`) where `items` is an **array** of product names, find the single **most frequently occurring** item across all baskets. Explode the arrays, count each item, and take the top one by frequency.",
      examples: [
        {
          input: "baskets: (1, ['milk','bread']), (2, ['milk','eggs']), (3, ['milk','bread'])",
          output: "milk (appears 3 times)",
          reasoning: "milk appears in all three baskets (3), bread in two (2), eggs in one (1); milk is the most common."
        }
      ],
      approaches: [
        {
          name: "explode, groupBy + count, orderBy desc, limit 1",
          whenToUse: "'Most frequent / top / mode' element inside an array column.",
          logic:
            "**What it asks.** The one item that occurs most often when all baskets' item arrays are pooled together.\n\n" +
            "**Key Idea.** `explode` flattens every array into one row per item, `groupBy('item').count()` tallies frequency, and `orderBy(count desc).limit(1)` picks the winner.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Flatten: `withColumn('item', explode(col('items')))`.\n" +
            "2. Count per item: `.groupBy('item').agg(count('*').alias('freq'))`.\n" +
            "3. Order by frequency descending and take the top: `.orderBy(col('freq').desc()).limit(1)`.\n\n" +
            "**Why it works.** After explode each item occurrence is a row; grouping and counting gives each item's total frequency, and sorting descending puts the mode first, which `limit(1)` returns.\n\n" +
            "**Common Gotchas.**\n" +
            "- Ties: `limit(1)` returns just one of several equally-frequent items arbitrarily. To keep all tied winners, rank with `dense_rank` and filter `== 1` instead.\n" +
            "- `explode` drops empty/null arrays (use `explode_outer` if those rows must be represented).\n" +
            "- `orderBy(...).limit(1)` triggers a global sort; for just the top element, Spark's top-N optimization keeps it cheap, but on huge data a `dense_rank` window or `max`-based approach can be considered.\n\n" +
            "**Interview mindset.** 'explode -> groupBy/count -> orderBy desc -> limit 1' is the frequency-mode pattern; volunteer the tie-handling caveat with dense_rank.",
          rcs:
            "from pyspark.sql.functions import col, explode, count\n" +
            "\n" +
            "result = (baskets\n" +
            "    .withColumn('item', explode(col('items')))          # one row per item\n" +
            "    .groupBy('item')\n" +
            "    .agg(count('*').alias('freq'))                      # frequency per item\n" +
            "    .orderBy(col('freq').desc())                        # most frequent first\n" +
            "    .limit(1))                                          # take the top item\n" +
            "result.show()",
          plain:
            "from pyspark.sql.functions import col, explode, count\n" +
            "\n" +
            "result = (baskets\n" +
            "    .withColumn('item', explode(col('items')))\n" +
            "    .groupBy('item')\n" +
            "    .agg(count('*').alias('freq'))\n" +
            "    .orderBy(col('freq').desc())\n" +
            "    .limit(1))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "`explode` fans out rows **narrowly** within each partition. The `groupBy('item').count()` is the first **wide** step — hash-shuffle by `item`, softened by map-side partial counts. The final `orderBy(col('freq').desc()).limit(1)` is a second **wide** step (a global sort / range-shuffle), but because it is a `limit`, Catalyst applies a **TakeOrderedAndProject** top-N optimization: each partition keeps only its local top row, then a tiny final merge picks the global maximum — so it does not fully sort all items. Key skew on a dominant item concentrates its counting on one reducer. For strict ties, swap `limit(1)` for a `dense_rank() == 1` filter to return every co-leader.",
      sparkSql:
        "SELECT item, COUNT(*) AS freq\n" +
        "FROM baskets\n" +
        "LATERAL VIEW EXPLODE(items) t AS item\n" +
        "GROUP BY item\n" +
        "ORDER BY freq DESC\n" +
        "LIMIT 1;",
      recognizeRecall: [
        "**Spot it:** 'most common item', 'most frequent value in an array', 'mode / top element across arrays'.",
        "**Say it:** `explode` the array, `groupBy(item).count()`, `orderBy(freq desc).limit(1)`.",
        "**Trap:** limit(1) breaks ties arbitrarily (use dense_rank==1 to keep all); explode drops empty arrays; top-N sort is optimized."
      ]
    }

  ]);
})();
