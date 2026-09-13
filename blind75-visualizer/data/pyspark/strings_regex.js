/*
 * PySpark Interview Lab — Strings & Regex
 * Schema identical to DataFrame Basics. String cleaning, extraction and regex
 * parsing — bread-and-butter DE work and a frequent interview probe.
 */
(function () {
  var CAT = "Strings & Regex";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q230
    {
      id: "extract-email-domain",
      lc: 230,
      title: "Extract the domain from an email column",
      difficulty: "Easy",
      category: CAT,
      meta: { pattern: "String split / regex extract", transformation: "Narrow", functions: "split, element_at, regexp_extract, col" },
      description:
        "Given `users` (`user_id`, `email`, `phone`, `bio`), add a `domain` column containing the part **after** the `@` in each `email` (e.g. `asha@acme.com` → `acme.com`). Show two ways: `split(email, '@')` then take the second element, or a single `regexp_extract`.",
      examples: [
        {
          input: "users: (1,'asha@acme.com'), (2,'ravi@corp.co.uk')",
          output: "(1,'acme.com'), (2,'corp.co.uk')",
          reasoning: "The domain is everything to the right of the single '@'. split yields ['asha','acme.com']; element 2 (1-based) is the domain."
        }
      ],
      approaches: [
        {
          name: "split on '@' + element_at (or regexp_extract fallback)",
          whenToUse: "Any 'grab the piece after/before a delimiter' task; regexp_extract when you want one call and validation baked in.",
          logic:
            "**What it asks.** From each email, isolate the domain — the substring following the `@`.\n\n" +
            "**Key Idea.** `split(col('email'), '@')` returns an array; `element_at(arr, 2)` grabs the second element (1-based, and negative indices count from the end). Equivalently `regexp_extract(email, '@(.+)$', 1)` captures group 1 = everything after the `@`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `split` the email on the literal `@`.\n" +
            "2. Take element 2 with `element_at` (or `.getItem(1)`, 0-based).\n" +
            "3. Alternatively call `regexp_extract` with a capture group to do it in one shot.\n" +
            "4. `withColumn('domain', ...)` and select.\n\n" +
            "**Why it works.** A valid email has exactly one `@`, so split produces a 2-element array; the tail is the domain. regexp_extract returns the captured group, or `''` when the pattern misses.\n\n" +
            "**Common Gotchas.**\n" +
            "- `split`'s first arg is a **regex**, so `@` is fine but a `.` delimiter must be escaped as `'\\\\.'`.\n" +
            "- `element_at` is **1-based**; `getItem`/`[]` is 0-based — don't mix them up.\n" +
            "- Malformed emails (no `@`) make `element_at(arr,2)` null and `regexp_extract` return `''`; decide which you want.\n\n" +
            "**Interview mindset.** Say it's a narrow, row-local op and that regexp_extract also lets you validate the shape in the same expression.",
          rcs:
            "from pyspark.sql.functions import col, split, element_at, regexp_extract\n" +
            "\n" +
            "# Option A: split then take the tail element (1-based).\n" +
            "domA = element_at(split(col('email'), '@'), 2)        # ['asha','acme.com'] -> 'acme.com'\n" +
            "\n" +
            "# Option B: one regex, group 1 = everything after the '@'.\n" +
            "domB = regexp_extract(col('email'), '@(.+)$', 1)      # capture group 1\n" +
            "\n" +
            "result = (users\n" +
            "    .withColumn('domain', domA))                      # narrow: no shuffle\n" +
            "result.select('user_id', 'email', 'domain').show(truncate=False)",
          plain:
            "from pyspark.sql.functions import col, split, element_at, regexp_extract\n" +
            "\n" +
            "result = users.withColumn('domain', element_at(split(col('email'), '@'), 2))\n" +
            "result.select('user_id', 'email', 'domain').show(truncate=False)"
        }
      ],
      sparkInternals:
        "This is a **narrow**, row-local transformation — no shuffle, fully pipelined inside a stage. `split` and `regexp_extract` compile a `java.util.regex.Pattern` once per task (not per row), so cost is dominated by the per-row match, not compilation. Prefer native `regexp_extract`/`split` over a Python UDF: a UDF serializes every row to the Python worker and back, breaking whole-stage codegen and typically running an order of magnitude slower. Because the pattern here is anchored and simple, the regex is cheap; catastrophic backtracking only bites on nested quantifiers.",
      sparkSql:
        "SELECT user_id, email,\n" +
        "       element_at(split(email, '@'), 2) AS domain\n" +
        "FROM users;",
      recognizeRecall: [
        "**Spot it:** \"get the part after/before a delimiter\" — email domain, path segment, file extension.",
        "**Say it:** `element_at(split(col('email'),'@'), 2)` or `regexp_extract(email, '@(.+)$', 1)`.",
        "**Trap:** `split`'s delimiter is a regex, and `element_at` is 1-based while `getItem` is 0-based."
      ]
    },

    // ------------------------------------------------------------------ Q231
    {
      id: "parse-web-log-regex",
      lc: 231,
      title: "Parse raw web-server log lines into fields",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Multi-field regex extract", transformation: "Narrow", functions: "regexp_extract, col, cast" },
      description:
        "Given `logs` (`line`) holding raw access-log strings like `127.0.0.1 - - [10/Oct/2026:13:55:36] \"GET /index.html HTTP/1.1\" 200`, extract `ip`, `timestamp`, `method`, `path`, and `status` into separate columns using `regexp_extract` with capture groups.",
      examples: [
        {
          input: "logs: '127.0.0.1 - - [10/Oct/2026:13:55:36] \"GET /index.html HTTP/1.1\" 200'",
          output: "ip='127.0.0.1', timestamp='10/Oct/2026:13:55:36', method='GET', path='/index.html', status=200",
          reasoning: "One regex with five capture groups pulls each field out of the fixed log grammar; status is cast to int."
        }
      ],
      approaches: [
        {
          name: "regexp_extract per field (shared grammar)",
          whenToUse: "Semi-structured text with a stable grammar: access logs, syslog, CSV-in-a-string, ID codes.",
          logic:
            "**What it asks.** Turn one opaque log string per row into typed columns.\n\n" +
            "**Key Idea.** Write a regex that mirrors the log grammar with a **capture group** per field, then call `regexp_extract(line, pattern, groupIndex)` once per column. Group 0 is the whole match; groups 1..n are your fields.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Anchor each field: `(\\\\S+)` for the ip, `\\\\[([^\\\\]]+)\\\\]` for the bracketed timestamp, `\"(\\\\S+) (\\\\S+) [^\"]+\"` for method+path inside the quotes, `(\\\\d{3})` for status.\n" +
            "2. Call `regexp_extract(col('line'), PAT, i)` for each group index.\n" +
            "3. `cast('int')` the status.\n" +
            "4. Drop the raw `line` if you no longer need it.\n\n" +
            "**Why it works.** The log format is fixed, so a single positional grammar matches every well-formed line and the group indices are stable.\n\n" +
            "**Common Gotchas.**\n" +
            "- In a JS string every regex backslash is doubled: `\\\\d`, `\\\\S`, `\\\\[`.\n" +
            "- A non-matching line yields `''` for **every** group — filter or flag those instead of trusting them.\n" +
            "- Escape the literal `[` `]` around the timestamp or the class is misread.\n" +
            "- Don't spin up five separate UDFs; native regexp_extract is codegen-friendly.\n\n" +
            "**Interview mindset.** Mention you'd keep the raw line for a dead-letter path and validate with a full-line anchor `^...$` in production.",
          rcs:
            "from pyspark.sql.functions import col, regexp_extract\n" +
            "\n" +
            "# One grammar; each field is a capture group.\n" +
            "PAT = r'^(\\S+) - - \\[([^\\]]+)\\] \"(\\S+) (\\S+) [^\"]+\" (\\d{3})'\n" +
            "\n" +
            "result = (logs\n" +
            "    .withColumn('ip',        regexp_extract(col('line'), PAT, 1))    # group 1\n" +
            "    .withColumn('timestamp', regexp_extract(col('line'), PAT, 2))    # group 2\n" +
            "    .withColumn('method',    regexp_extract(col('line'), PAT, 3))    # group 3\n" +
            "    .withColumn('path',      regexp_extract(col('line'), PAT, 4))    # group 4\n" +
            "    .withColumn('status',    regexp_extract(col('line'), PAT, 5).cast('int')))  # group 5 -> int\n" +
            "result.select('ip', 'timestamp', 'method', 'path', 'status').show(truncate=False)",
          plain:
            "from pyspark.sql.functions import col, regexp_extract\n" +
            "\n" +
            "PAT = r'^(\\S+) - - \\[([^\\]]+)\\] \"(\\S+) (\\S+) [^\"]+\" (\\d{3})'\n" +
            "\n" +
            "result = (logs\n" +
            "    .withColumn('ip',        regexp_extract(col('line'), PAT, 1))\n" +
            "    .withColumn('timestamp', regexp_extract(col('line'), PAT, 2))\n" +
            "    .withColumn('method',    regexp_extract(col('line'), PAT, 3))\n" +
            "    .withColumn('path',      regexp_extract(col('line'), PAT, 4))\n" +
            "    .withColumn('status',    regexp_extract(col('line'), PAT, 5).cast('int')))\n" +
            "result.select('ip', 'timestamp', 'method', 'path', 'status').show(truncate=False)"
        }
      ],
      sparkInternals:
        "All five `regexp_extract` calls are **narrow** and run in the same stage with no shuffle. Spark compiles each distinct pattern string to a `Pattern` once per task and reuses it across rows, so five calls with the **same** `PAT` still only compile once per task per distinct literal. The dominant cost is the per-row match; keep the regex anchored and avoid nested quantifiers to prevent backtracking blowups on hostile input. A Python UDF doing `re.match` would be far worse here — row-by-row serialization to the Python worker plus loss of whole-stage codegen — so native functions win. Casting status to int is a cheap column-level projection folded into the same operator.",
      sparkSql:
        "SELECT\n" +
        "  regexp_extract(line, '^(\\\\S+) - - .*', 1)                      AS ip,\n" +
        "  regexp_extract(line, '\\\\[([^\\\\]]+)\\\\]', 1)                  AS timestamp,\n" +
        "  regexp_extract(line, '\"(\\\\S+) (\\\\S+) [^\"]+\"', 1)           AS method,\n" +
        "  regexp_extract(line, '\"(\\\\S+) (\\\\S+) [^\"]+\"', 2)           AS path,\n" +
        "  CAST(regexp_extract(line, '(\\\\d{3})$', 1) AS INT)              AS status\n" +
        "FROM logs;",
      recognizeRecall: [
        "**Spot it:** one messy string per row with a fixed grammar you must split into typed columns.",
        "**Say it:** one shared regex + `regexp_extract(line, PAT, i)` per capture group; cast numerics.",
        "**Trap:** a non-matching line returns `''` for every group — flag or dead-letter it, don't trust silent blanks."
      ]
    },

    // ------------------------------------------------------------------ Q232
    {
      id: "mask-pii-last-four",
      lc: 232,
      title: "Mask PII, keeping only the last 4 digits",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Regex replace / masking", transformation: "Narrow", functions: "regexp_replace, concat, substring, col" },
      description:
        "Given `users` (`user_id`, `email`, `phone`, `bio`), mask each `phone` so only the **last 4 digits** survive, e.g. `4111-1111-1111-1234` → `************1234`. Use `regexp_replace` to turn every masked digit into `*` while preserving the tail.",
      examples: [
        {
          input: "users: (1,'4111111111111234'), (2,'5500 0000 0000 0004')",
          output: "(1,'************1234'), (2,'************0004')",
          reasoning: "All non-digit separators are stripped, then every digit except the final four is replaced by '*'."
        }
      ],
      approaches: [
        {
          name: "regexp_replace with a lookahead, or normalize + concat",
          whenToUse: "Redacting cards, phones, SSNs for logs/exports while keeping a human-recognizable suffix.",
          logic:
            "**What it asks.** Redact all but the last four digits of a number that may contain spaces or dashes.\n\n" +
            "**Key Idea.** First normalize: `regexp_replace(phone, '\\\\D', '')` drops every non-digit. Then either (a) a single `regexp_replace(clean, '\\\\d(?=\\\\d{4})', '*')` — replace any digit that still has 4 digits ahead of it — or (b) build it explicitly: `concat(repeat('*', len-4), substring(clean, -4, 4))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Strip separators with `regexp_replace(col('phone'), '\\\\D', '')`.\n" +
            "2. Mask with the lookahead pattern `\\\\d(?=\\\\d{4})` → `*` (Java regex supports lookahead).\n" +
            "3. Or compute length and `concat` a `*` run with the last-4 `substring`.\n" +
            "4. Store as `phone_masked`; never overwrite silently in a shared table.\n\n" +
            "**Why it works.** The lookahead `(?=\\\\d{4})` matches a digit only when exactly-or-more four digits follow, so the final four (which have <4 digits after them) are left intact.\n\n" +
            "**Common Gotchas.**\n" +
            "- `\\\\D`/`\\\\d` need doubled backslashes in a JS string.\n" +
            "- `regexp_replace` replaces **all** matches by default — that's what you want here.\n" +
            "- `substring` is **1-based**; a negative start counts from the end (`substring(s, -4, 4)`).\n" +
            "- Normalize first, or dashes/spaces throw off the count.\n\n" +
            "**Interview mindset.** Call out that masking is irreversible-by-design and should happen before data leaves a trust boundary; keep raw PII in a restricted column, not in logs.",
          rcs:
            "from pyspark.sql.functions import col, regexp_replace\n" +
            "\n" +
            "clean  = regexp_replace(col('phone'), r'\\D', '')          # keep digits only\n" +
            "masked = regexp_replace(clean, r'\\d(?=\\d{4})', '*')      # star any digit with >=4 digits after it\n" +
            "\n" +
            "result = users.withColumn('phone_masked', masked)         # narrow, row-local\n" +
            "result.select('user_id', 'phone', 'phone_masked').show(truncate=False)",
          plain:
            "from pyspark.sql.functions import col, regexp_replace\n" +
            "\n" +
            "clean  = regexp_replace(col('phone'), r'\\D', '')\n" +
            "masked = regexp_replace(clean, r'\\d(?=\\d{4})', '*')\n" +
            "\n" +
            "result = users.withColumn('phone_masked', masked)\n" +
            "result.select('user_id', 'phone', 'phone_masked').show(truncate=False)"
        }
      ],
      sparkInternals:
        "Masking is a **narrow** projection — no shuffle, pipelined in whole-stage codegen. `regexp_replace` compiles its `Pattern` once per task and applies it per row; the lookahead `(?=\\d{4})` is a zero-width assertion that is cheap on these short strings. Chaining two `regexp_replace` calls stays within one operator, so there is no extra pass over the data at the stage level. Avoid a masking UDF: it would serialize every value to Python and defeat codegen, and native regex is both faster and column-pruning-friendly. Keep the unmasked column out of any cached/persisted output that flows to logs.",
      sparkSql:
        "SELECT user_id, phone,\n" +
        "       regexp_replace(regexp_replace(phone, '\\\\D', ''), '\\\\d(?=\\\\d{4})', '*') AS phone_masked\n" +
        "FROM users;",
      recognizeRecall: [
        "**Spot it:** \"redact / mask all but the last N\" of a card, phone, or SSN.",
        "**Say it:** normalize with `regexp_replace(x,'\\\\D','')`, then mask with lookahead `\\\\d(?=\\\\d{4})` → `*`.",
        "**Trap:** count on the normalized digits, not the raw string with dashes/spaces; regexp_replace replaces every match."
      ]
    },

    // ------------------------------------------------------------------ Q233
    {
      id: "split-full-name-parts",
      lc: 233,
      title: "Split full_name into first and last name",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Split + array indexing", transformation: "Narrow", functions: "split, element_at, size, when, col" },
      description:
        "Given `customers` (`customer_id`, `name`, `city`, `registration_date`) where `name` is a full name like `Asha Rao` or `Maria de la Cruz`, derive `first_name` (first token) and `last_name` (last token), handling middle names gracefully by using `size` to find the final element.",
      examples: [
        {
          input: "customers: 'Asha Rao', 'Maria de la Cruz', 'Prince'",
          output: "('Asha','Rao'), ('Maria','Cruz'), ('Prince','Prince')",
          reasoning: "first token is element 1; last token is element size(parts). A single-token name maps both to itself."
        }
      ],
      approaches: [
        {
          name: "split on whitespace, index first & size-th element",
          whenToUse: "Any variable-length token list where you want the head and tail regardless of middle count.",
          logic:
            "**What it asks.** From a whitespace-separated name of unknown length, take the first and last tokens.\n\n" +
            "**Key Idea.** `parts = split(name, '\\\\s+')` yields an array of tokens. `element_at(parts, 1)` is the first; `element_at(parts, size(parts))` is the last — `size` makes it robust to 1, 2, or many tokens. `element_at` also accepts `-1` for the last element directly.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `trim` the name so leading/trailing spaces don't create empty tokens.\n" +
            "2. `split(col('name'), '\\\\s+')` (regex handles multiple spaces).\n" +
            "3. `first_name = element_at(parts, 1)`.\n" +
            "4. `last_name  = element_at(parts, size(parts))` (or `element_at(parts, -1)`).\n" +
            "5. Optionally `when(size(parts) == 1, ...)` to decide how a mononym behaves.\n\n" +
            "**Why it works.** Indexing by `size(parts)` always points at the final token no matter how many middle names exist, so a middle name is simply skipped.\n\n" +
            "**Common Gotchas.**\n" +
            "- Split on `'\\\\s+'`, not a single space, or double spaces yield empty strings.\n" +
            "- `element_at` is 1-based; index 0 throws.\n" +
            "- A one-token name makes first == last; decide if that's acceptable.\n" +
            "- Compound surnames (`de la Cruz`) still lose the particles with a pure last-token rule — say so.\n\n" +
            "**Interview mindset.** Names are messy; state your simplifying assumption (first token / last token) and where it breaks, rather than pretending regex solves onomastics.",
          rcs:
            "from pyspark.sql.functions import col, split, element_at, size, trim\n" +
            "\n" +
            "parts = split(trim(col('name')), r'\\s+')                 # ['Maria','de','la','Cruz']\n" +
            "\n" +
            "result = (customers\n" +
            "    .withColumn('first_name', element_at(parts, 1))       # first token\n" +
            "    .withColumn('last_name',  element_at(parts, size(parts))))  # size-th = last token\n" +
            "result.select('customer_id', 'name', 'first_name', 'last_name').show(truncate=False)",
          plain:
            "from pyspark.sql.functions import col, split, element_at, size, trim\n" +
            "\n" +
            "parts = split(trim(col('name')), r'\\s+')\n" +
            "\n" +
            "result = (customers\n" +
            "    .withColumn('first_name', element_at(parts, 1))\n" +
            "    .withColumn('last_name',  element_at(parts, size(parts))))\n" +
            "result.select('customer_id', 'name', 'first_name', 'last_name').show(truncate=False)"
        }
      ],
      sparkInternals:
        "Splitting and array indexing are **narrow**, row-local operations pipelined without a shuffle. `split` compiles its whitespace pattern once per task; `element_at` and `size` are simple array accessors evaluated in codegen, so the whole expression tree fuses into one stage. Because `size(parts)` is computed per row from the same array, there's no second pass over the data. A UDF here would be strictly worse — it breaks codegen and serializes rows to Python — so keep it in native column expressions. The result columns are cheap projections the optimizer can prune if downstream selects only some of them.",
      sparkSql:
        "SELECT customer_id, name,\n" +
        "       element_at(split(trim(name), '\\\\s+'), 1)                              AS first_name,\n" +
        "       element_at(split(trim(name), '\\\\s+'), size(split(trim(name), '\\\\s+'))) AS last_name\n" +
        "FROM customers;",
      recognizeRecall: [
        "**Spot it:** \"split X into first/last part\" where the number of middle tokens varies.",
        "**Say it:** `split` on `\\\\s+`, `element_at(parts,1)` for first, `element_at(parts, size(parts))` (or `-1`) for last.",
        "**Trap:** `element_at` is 1-based; split on `\\\\s+` not `' '`; compound surnames break a naive last-token rule."
      ]
    },

    // ------------------------------------------------------------------ Q234
    {
      id: "filter-rows-matching-regex",
      lc: 234,
      title: "Filter rows whose text matches a regex (valid email)",
      difficulty: "Easy",
      category: CAT,
      meta: { pattern: "Regex predicate filter", transformation: "Narrow", functions: "rlike, filter, col, lower" },
      description:
        "Given `users` (`user_id`, `email`, `phone`, `bio`), keep only rows whose `email` matches a valid email shape using `rlike` (regex predicate). Report both the valid rows and, as a contrast, the invalid ones with `~col(...).rlike(...)`.",
      examples: [
        {
          input: "users: 'asha@acme.com', 'not-an-email', 'ravi@corp.co.uk', 'bob@@x'",
          output: "valid: 'asha@acme.com', 'ravi@corp.co.uk'",
          reasoning: "rlike returns true when the pattern matches; only well-formed local@domain.tld strings pass, and the negation gives the reject list."
        }
      ],
      approaches: [
        {
          name: "rlike as a boolean filter predicate",
          whenToUse: "Row-level validation / pattern gating: valid emails, phone shapes, allow-list codes, keyword presence.",
          logic:
            "**What it asks.** Retain rows whose `email` looks like a real email, drop the rest.\n\n" +
            "**Key Idea.** `col('email').rlike(PATTERN)` is a boolean column; pass it straight to `filter`/`where`. `rlike` is a **partial** match (the pattern can match anywhere) unless you anchor with `^...$`, so anchor it for validation.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Write an anchored pattern: `^[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.-]+$`.\n" +
            "2. `users.filter(col('email').rlike(PAT))` for the keepers.\n" +
            "3. `users.filter(~col('email').rlike(PAT))` for the reject list.\n" +
            "4. Optionally `lower(email)` first if you want case-insensitive matching (or use `(?i)`).\n\n" +
            "**Why it works.** `rlike` compiles the Java regex and returns true/false per row; `filter` keeps rows where the predicate is true, exactly like a SQL `WHERE ... RLIKE`.\n\n" +
            "**Common Gotchas.**\n" +
            "- **Anchor** with `^` and `$` — unanchored, `'x asha@acme.com y'` would pass.\n" +
            "- Double the backslashes in a JS string: `\\\\w`, `\\\\.`.\n" +
            "- `rlike` on a `null` yields null → the row is dropped by `filter`; handle nulls if you need them.\n" +
            "- A perfect RFC-5322 email regex is monstrous; a pragmatic pattern is expected in interviews.\n\n" +
            "**Interview mindset.** Say `rlike` = SQL `RLIKE`/`REGEXP`, contrast with `like` (SQL wildcards `%`/`_`, not regex), and note you'd anchor for validation vs. leave open for 'contains'.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "PAT = r'^[\\w.+-]+@[\\w-]+\\.[\\w.-]+$'          # anchored email shape\n" +
            "\n" +
            "valid   = users.filter(col('email').rlike(PAT))   # keep matches\n" +
            "invalid = users.filter(~col('email').rlike(PAT))  # negate for rejects\n" +
            "valid.show(truncate=False)\n" +
            "invalid.show(truncate=False)",
          plain:
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "PAT = r'^[\\w.+-]+@[\\w-]+\\.[\\w.-]+$'\n" +
            "\n" +
            "valid   = users.filter(col('email').rlike(PAT))\n" +
            "invalid = users.filter(~col('email').rlike(PAT))\n" +
            "valid.show(truncate=False)\n" +
            "invalid.show(truncate=False)"
        }
      ],
      sparkInternals:
        "`rlike` is a **narrow** predicate evaluated per row with no shuffle, and as a filter it is pushed as early as possible by the optimizer (`PushDownPredicate`) so fewer rows flow downstream. The regex `Pattern` compiles once per task and is reused across rows, so a complex pattern's compile cost is amortized. It cannot be pushed into most file formats (regex predicates aren't columnar-pushdown-able the way `=`/range are), so it runs at scan time in the executor rather than skipping row groups. Anchoring keeps the match near O(n) in string length; avoid nested quantifiers that cause exponential backtracking on adversarial input. Native `rlike` beats a boolean-returning Python UDF, which would break codegen and disable predicate reordering.",
      sparkSql:
        "SELECT *\n" +
        "FROM users\n" +
        "WHERE email RLIKE '^[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.-]+$';",
      recognizeRecall: [
        "**Spot it:** \"keep/drop rows where the text looks like / matches a pattern\".",
        "**Say it:** `df.filter(col('c').rlike(PAT))`; `~` negates; `rlike` is regex, `like` is SQL wildcards.",
        "**Trap:** unanchored `rlike` is a partial match — add `^...$` for validation; nulls get dropped by filter."
      ]
    },

    // ------------------------------------------------------------------ Q235
    {
      id: "clean-standardize-text",
      lc: 235,
      title: "Clean and standardize free text",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Text normalization pipeline", transformation: "Narrow", functions: "trim, lower, regexp_replace, col" },
      description:
        "Given `users` (`user_id`, `email`, `phone`, `bio`), normalize the free-text `bio`: lowercase it, strip punctuation with `regexp_replace`, collapse runs of whitespace to a single space, and trim the ends — producing a clean, comparable token stream.",
      examples: [
        {
          input: "bio: '  Hello,  WORLD!!!   It\\'s   great...  '",
          output: "'hello world its great'",
          reasoning: "lower + remove non-alphanumeric/space + collapse multiple spaces + trim yields a canonical form."
        }
      ],
      approaches: [
        {
          name: "chained lower / regexp_replace / trim",
          whenToUse: "Pre-processing before tokenizing, joining on text, dedup, or feeding an NLP/ML pipeline.",
          logic:
            "**What it asks.** Produce a canonical, lowercased, punctuation-free, single-spaced version of a bio.\n\n" +
            "**Key Idea.** Compose narrow string ops in order: `lower` → `regexp_replace(x, '[^a-z0-9\\\\s]', '')` to drop punctuation → `regexp_replace(x, '\\\\s+', ' ')` to collapse whitespace → `trim`. Order matters: lowercase first so the punctuation class can stay `a-z`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `lower(col('bio'))`.\n" +
            "2. Strip non-alphanumeric, non-space chars: `regexp_replace(..., '[^a-z0-9\\\\s]', '')`.\n" +
            "3. Collapse whitespace runs: `regexp_replace(..., '\\\\s+', ' ')`.\n" +
            "4. `trim(...)` to remove the leading/trailing space left behind.\n" +
            "5. Store as `bio_clean`.\n\n" +
            "**Why it works.** Each step is a deterministic row-local rewrite; done in this order the result is idempotent — re-running it changes nothing.\n\n" +
            "**Common Gotchas.**\n" +
            "- Collapse whitespace **after** removing punctuation, or removed punctuation can leave double spaces.\n" +
            "- `trim` last, because collapsing can create an edge space.\n" +
            "- `\\\\s` and character classes need doubled backslashes in a JS string.\n" +
            "- A bare `[^a-z0-9 ]` (literal space) also works but `\\\\s` also catches tabs/newlines.\n" +
            "- Don't reach for a UDF; this is all native and codegen-friendly.\n\n" +
            "**Interview mindset.** Emphasize the ordering rationale and idempotency; mention Unicode/accents (`ç`, `é`) may need `translate`/normalization if the domain is multilingual.",
          rcs:
            "from pyspark.sql.functions import col, lower, regexp_replace, trim\n" +
            "\n" +
            "clean = lower(col('bio'))                                  # 1) casefold\n" +
            "clean = regexp_replace(clean, r'[^a-z0-9\\s]', '')         # 2) drop punctuation\n" +
            "clean = regexp_replace(clean, r'\\s+', ' ')                # 3) collapse spaces\n" +
            "clean = trim(clean)                                        # 4) trim ends\n" +
            "\n" +
            "result = users.withColumn('bio_clean', clean)             # narrow pipeline\n" +
            "result.select('user_id', 'bio', 'bio_clean').show(truncate=False)",
          plain:
            "from pyspark.sql.functions import col, lower, regexp_replace, trim\n" +
            "\n" +
            "clean = trim(regexp_replace(regexp_replace(lower(col('bio')), r'[^a-z0-9\\s]', ''), r'\\s+', ' '))\n" +
            "\n" +
            "result = users.withColumn('bio_clean', clean)\n" +
            "result.select('user_id', 'bio', 'bio_clean').show(truncate=False)"
        }
      ],
      sparkInternals:
        "The whole pipeline is **narrow** and fuses into a single whole-stage-codegen operator — no shuffle and one logical pass over each row. Each distinct `regexp_replace` pattern compiles a `Pattern` once per task; the two patterns here are simple linear-time matches so compile and match cost are negligible. Chaining the calls does not add data passes at the stage level — they nest as expressions in one Project. Native functions keep the operation vectorizable-in-spirit and codegen-eligible; a Python UDF normalizer would serialize every row to the Python worker and typically run 10x+ slower. If run before a wide op (groupBy/join on the cleaned text), doing the cleaning first shrinks/​canonicalizes keys and improves join hit rates.",
      sparkSql:
        "SELECT user_id, bio,\n" +
        "       trim(regexp_replace(regexp_replace(lower(bio), '[^a-z0-9\\\\s]', ''), '\\\\s+', ' ')) AS bio_clean\n" +
        "FROM users;",
      recognizeRecall: [
        "**Spot it:** \"clean up / standardize / normalize\" free text before joining, grouping, or tokenizing.",
        "**Say it:** `lower` → `regexp_replace` punctuation → `regexp_replace('\\\\s+',' ')` → `trim`, in that order.",
        "**Trap:** collapse whitespace AFTER stripping punctuation and `trim` last, or you leave stray double/edge spaces."
      ]
    },

    // ------------------------------------------------------------------ Q236
    {
      id: "word-count-per-row",
      lc: 236,
      title: "Word count / count a token per row",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Split + size counting", transformation: "Narrow", functions: "split, size, regexp_replace, trim, col" },
      description:
        "Given `users` (`user_id`, `email`, `phone`, `bio`), add `word_count` = number of words in each `bio`, and `the_count` = how many times the token `the` appears. Use `split` + `size` for words, and a normalize-then-count trick for the token.",
      examples: [
        {
          input: "bio: 'the cat sat on the mat'",
          output: "word_count=6, the_count=2",
          reasoning: "split on whitespace gives 6 tokens; counting occurrences of the standalone word 'the' gives 2."
        }
      ],
      approaches: [
        {
          name: "size(split(...)) for words; size-diff or regex for the token",
          whenToUse: "Per-row text metrics: word/char counts, keyword frequency, term presence scoring.",
          logic:
            "**What it asks.** Two per-row counts: total words, and occurrences of a specific token.\n\n" +
            "**Key Idea.** `size(split(trim(bio), '\\\\s+'))` counts words. For a token count, the classic trick is `size(split(bio, 'the')) - 1` (an array of N pieces has N-1 delimiters), but guard against substrings by matching a **word boundary** token with `regexp_replace` first, or by splitting on `'\\\\bthe\\\\b'`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `trim` then `split(bio, '\\\\s+')`; `size(...)` = word count.\n" +
            "2. For token count, split on the word-bounded token: `size(split(bio, '\\\\bthe\\\\b')) - 1`.\n" +
            "3. Guard the empty-string case: an empty bio splits to `['']`, size 1 → word_count 1, so `when(trim(bio)=='' , 0)`.\n" +
            "4. Add both as columns.\n\n" +
            "**Why it works.** Splitting on a delimiter that occurs k times yields k+1 pieces, so `size - 1` counts the delimiter. Word boundaries `\\\\b` stop `the` from matching inside `theory` or `bathe`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Empty/whitespace bio: `split('', '\\\\s+')` → `['']`, `size` = 1, not 0 — special-case it.\n" +
            "- Without `\\\\b`, `size(split(bio,'the'))-1` over-counts substrings (`theory`).\n" +
            "- Case: lower the text first if `The` should count.\n" +
            "- `\\\\s`, `\\\\b` need doubled backslashes in a JS string.\n\n" +
            "**Interview mindset.** Mention the split-and-count-delimiters trick explicitly — it's a well-known idiom — and note the boundary/empty-string caveats that separate a correct answer from a naive one.",
          rcs:
            "from pyspark.sql.functions import col, split, size, trim, lower, when\n" +
            "\n" +
            "b = lower(trim(col('bio')))                               # normalize case + edges\n" +
            "words = split(b, r'\\s+')                                  # token array\n" +
            "\n" +
            "word_count = when(b == '', 0).otherwise(size(words))      # empty bio -> 0, not 1\n" +
            "the_count  = size(split(b, r'\\bthe\\b')) - 1              # delimiters = occurrences\n" +
            "\n" +
            "result = (users\n" +
            "    .withColumn('word_count', word_count)\n" +
            "    .withColumn('the_count',  the_count))\n" +
            "result.select('user_id', 'bio', 'word_count', 'the_count').show(truncate=False)",
          plain:
            "from pyspark.sql.functions import col, split, size, trim, lower, when\n" +
            "\n" +
            "b = lower(trim(col('bio')))\n" +
            "words = split(b, r'\\s+')\n" +
            "\n" +
            "result = (users\n" +
            "    .withColumn('word_count', when(b == '', 0).otherwise(size(words)))\n" +
            "    .withColumn('the_count',  size(split(b, r'\\bthe\\b')) - 1))\n" +
            "result.select('user_id', 'bio', 'word_count', 'the_count').show(truncate=False)"
        }
      ],
      sparkInternals:
        "Both counts are **narrow**, row-local expressions with no shuffle, fused into one whole-stage-codegen Project. `split` compiles each pattern once per task; `size` is an O(1) array-length read, so per-row cost is one regex pass plus a length lookup. The `when/otherwise` guard is a branch folded into codegen, not a separate operator or pass. If you instead needed a **corpus-wide** top-word count you'd `explode` then `groupBy` — that turns wide (a shuffle) — but per-row counts stay narrow and cheap. Native split/size beat a tokenizing UDF, which would serialize rows to Python and disable codegen.",
      sparkSql:
        "SELECT user_id, bio,\n" +
        "       CASE WHEN trim(bio) = '' THEN 0\n" +
        "            ELSE size(split(trim(lower(bio)), '\\\\s+')) END          AS word_count,\n" +
        "       size(split(lower(bio), '\\\\bthe\\\\b')) - 1                    AS the_count\n" +
        "FROM users;",
      recognizeRecall: [
        "**Spot it:** \"how many words / how many times does X appear\" per row.",
        "**Say it:** `size(split(text,'\\\\s+'))` for words; `size(split(text, token)) - 1` counts occurrences.",
        "**Trap:** empty string splits to size 1 (guard it); use `\\\\b` boundaries so `the` doesn't match `theory`."
      ]
    },

    // ------------------------------------------------------------------ Q237
    {
      id: "extract-explode-top-hashtags",
      lc: 237,
      title: "Extract hashtags into an array, explode, count top",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Regex extract-all + explode + aggregate", transformation: "Wide (shuffle on explode+groupBy)", functions: "regexp_extract_all, split, filter, explode, lower, groupBy" },
      description:
        "Given `users` (`user_id`, `email`, `phone`, `bio`), pull every hashtag (`#word`) out of each `bio` into an array, then `explode` and `groupBy` to find the **top hashtags** across all rows. Show `regexp_extract_all` (Spark 3.1+) and a portable `split` + `filter` fallback for older Spark.",
      examples: [
        {
          input: "bios: 'love #spark and #Spark', 'learning #python #spark'",
          output: "top: #spark → 3, #python → 1",
          reasoning: "extract all #tokens per row, lowercase to merge #Spark/#spark, explode to one tag per row, then count per tag descending."
        }
      ],
      approaches: [
        {
          name: "regexp_extract_all (3.1+) or split+filter, then explode + groupBy",
          whenToUse: "Extracting many matches per row (hashtags, mentions, URLs, codes) and ranking them globally.",
          logic:
            "**What it asks.** From free text, collect all hashtags per row, then rank hashtags by total frequency.\n\n" +
            "**Key Idea.** `regexp_extract_all(bio, '(#\\\\w+)', 1)` returns an **array** of every match (Spark **3.1+**). Lowercase and `explode` the array to one tag per row, then `groupBy('tag').count()` ordered descending. On older Spark, replace extract-all with `filter(split(lower(bio), '\\\\s+'), x -> x.startswith('#'))`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `tags = regexp_extract_all(lower(col('bio')), '(#\\\\w+)', 1)` → array column.\n" +
            "2. (Fallback) `filter(split(lower(bio),'\\\\s+'), lambda x: x.startswith('#'))`.\n" +
            "3. `explode(tags)` → one row per hashtag (empty arrays drop out; use `explode_outer` to keep them as null).\n" +
            "4. `groupBy('tag').count().orderBy(desc('count'))`.\n\n" +
            "**Why it works.** extract-all captures group 1 for **every** non-overlapping match, so a row with three tags yields a 3-element array; explode fans it to rows so a normal groupBy can aggregate globally.\n\n" +
            "**Common Gotchas.**\n" +
            "- `regexp_extract_all` is **Spark 3.1+**; on 3.0/2.x use the split+filter fallback (or a UDF as last resort).\n" +
            "- Lowercase **before** grouping or `#Spark` and `#spark` count separately.\n" +
            "- `explode` **drops** rows with empty/null arrays — use `explode_outer` if you must keep them.\n" +
            "- explode + groupBy is a **wide** transformation (a shuffle), unlike the earlier row-local ops.\n" +
            "- Double backslashes: `\\\\w`, `\\\\s`.\n\n" +
            "**Interview mindset.** Flag the version gate on `regexp_extract_all` unprompted, and note that explode+groupBy introduces the shuffle — pre-filtering empty bios and lowercasing early keeps the shuffled volume down.",
          rcs:
            "from pyspark.sql.functions import col, regexp_extract_all, lower, explode, desc\n" +
            "\n" +
            "# Spark 3.1+: array of every '#word' match (group 1).\n" +
            "tags = regexp_extract_all(lower(col('bio')), r'(#\\w+)', 1)\n" +
            "\n" +
            "exploded = (users\n" +
            "    .withColumn('tag', explode(tags)))          # wide: one row per hashtag\n" +
            "\n" +
            "top = (exploded\n" +
            "    .groupBy('tag')                             # shuffle by tag\n" +
            "    .count()\n" +
            "    .orderBy(desc('count')))\n" +
            "top.show(truncate=False)\n" +
            "\n" +
            "# --- Pre-3.1 fallback: split then filter tokens starting with '#'.\n" +
            "# from pyspark.sql.functions import split, expr\n" +
            "# tags = expr(\"filter(split(lower(bio), '\\\\\\\\s+'), x -> x like '#%')\")\n",
          plain:
            "from pyspark.sql.functions import col, regexp_extract_all, lower, explode, desc\n" +
            "\n" +
            "tags = regexp_extract_all(lower(col('bio')), r'(#\\w+)', 1)\n" +
            "\n" +
            "top = (users\n" +
            "    .withColumn('tag', explode(tags))\n" +
            "    .groupBy('tag')\n" +
            "    .count()\n" +
            "    .orderBy(desc('count')))\n" +
            "top.show(truncate=False)"
        }
      ],
      sparkInternals:
        "The extraction (`regexp_extract_all`, `lower`) is **narrow**, but `explode` followed by `groupBy('tag').count()` makes the job **wide**: the groupBy hash-partitions by `tag`, forcing a shuffle. Partial `count` aggregation runs map-side before the exchange, so only per-partition partial counts cross the network — cheap for a small tag vocabulary. `regexp_extract_all` compiles its `Pattern` once per task and returns all non-overlapping matches; it is **Spark 3.1+**, so on older runtimes fall back to `split`+higher-order `filter` (which stay native) rather than a Python UDF that would serialize rows and break codegen. Lowercasing and filtering empty bios before the explode shrinks the shuffled row count. `orderBy(desc('count'))` adds a final range-partition sort stage.",
      sparkSql:
        "SELECT tag, count(*) AS cnt\n" +
        "FROM (\n" +
        "  SELECT explode(regexp_extract_all(lower(bio), '(#\\\\w+)', 1)) AS tag\n" +
        "  FROM users\n" +
        ")\n" +
        "GROUP BY tag\n" +
        "ORDER BY cnt DESC;",
      recognizeRecall: [
        "**Spot it:** \"extract all X (hashtags/mentions/urls) then find the most common\".",
        "**Say it:** `regexp_extract_all(text,'(#\\\\w+)',1)` → `explode` → `groupBy().count().orderBy(desc(...))`.",
        "**Trap:** `regexp_extract_all` is Spark 3.1+; explode drops empty arrays; lowercase before grouping, and explode+groupBy is a shuffle."
      ]
    }

  ]);
})();
