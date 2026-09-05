/*
 * Pandas Interview Lab — Merge & Join
 * =========================================================================
 * Follows the SCHEMA and LOGIC format defined in problems_selection.js.
 * Registers on the global registry:
 *     window.PANDAS.register("Merge & Join", [ ...problems ]);
 *
 * Every rcs/plain snippet is self-contained runnable pandas (starts with
 * `import pandas as pd`) and prints its output. Only stable pandas 2.x core
 * merge/join APIs are used (merge, join, how=, on/left_on/right_on, indicator,
 * validate, suffixes) so the code also runs under Pyodide pandas. Every snippet
 * and claimed output was executed against pandas before commit.
 * =========================================================================
 */
(function () {
  window.PANDAS.register("Merge & Join", [

    // ------------------------------------------------------------------ Q1
    {
      id: "inner-merge-on-key",
      num: 1,
      title: "Inner merge two frames on a key",
      difficulty: "Easy",
      category: "Merge & Join",
      importance: "essential",
      meta: { pattern: "Inner join", technique: "pd.merge on a shared key", functions: "pd.merge, on=, how='inner'" },
      description:
        "Combine two DataFrames on a shared column — attach each employee's department name by matching `dept_id`. `pd.merge(a, b, on='dept_id')` defaults to an **inner** join: only keys present in *both* frames survive. This is SQL's `INNER JOIN`.",
      notes: [
        "The default `how` is `'inner'`, so unmatched keys on either side are dropped.",
        "`on=` needs the column to exist with the same name in both frames; otherwise use `left_on`/`right_on`."
      ],
      examples: [
        {
          input: "employees dept_id=[10,20,99]; depts dept_id=[10,20,30]",
          output: "only the rows for dept_id 10 and 20",
          reasoning: "99 has no match in depts and 30 has no employee, so both drop under an inner join."
        }
      ],
      approaches: [
        {
          name: "pd.merge(..., on=key)",
          whenToUse: "Joining two tables on a common key when you only want matched rows.",
          logic:
            "**What it asks.** Bring columns from a second frame onto the first by matching a shared key.\n\n" +
            "**Key idea.** `pd.merge` aligns rows where the key values are equal; the default inner join keeps only keys found in both.\n\n" +
            "**Step by step.**\n" +
            "1. Identify the shared key column (`dept_id`).\n" +
            "2. `pd.merge(employees, depts, on='dept_id')`.\n" +
            "3. The result has the union of columns for matched rows only.\n\n" +
            "**Why it works.** Merge builds a hash of the key and pairs matching rows, so an unmatched key on either side yields no output row.\n\n" +
            "**Gotchas.**\n" +
            "- Silent row loss: an inner join quietly drops non-matching rows — check row counts if that surprises you.\n" +
            "- Key dtypes must match (int vs string `'10'` will not join).\n\n" +
            "**Interview mindset.** Name it: 'inner join on `dept_id`', and say which rows you expect to disappear.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "employees = pd.DataFrame({'emp_id': [1, 2, 3],\n" +
            "                          'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                          'dept_id': [10, 20, 99]})\n" +
            "depts = pd.DataFrame({'dept_id': [10, 20, 30],\n" +
            "                      'dept': ['Eng', 'Sales', 'Data']})\n" +
            "out = pd.merge(employees, depts, on='dept_id')   # how='inner' by default\n" +
            "print(out)                                        # 99 and 30 have no match -> dropped",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "employees = pd.DataFrame({'emp_id': [1, 2, 3],\n" +
            "                          'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                          'dept_id': [10, 20, 99]})\n" +
            "depts = pd.DataFrame({'dept_id': [10, 20, 30],\n" +
            "                      'dept': ['Eng', 'Sales', 'Data']})\n" +
            "print(pd.merge(employees, depts, on='dept_id'))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'join', 'look up X for each row', 'combine on a common id'.",
        "**Say it:** `pd.merge(a, b, on='key')` — inner join by default.",
        "**Trap:** inner join silently drops unmatched keys; verify row counts."
      ],
      commonMistakes: [
        "Assuming all left rows survive — the default is inner, not left.",
        "Mismatched key dtypes (int vs string) producing an empty or partial join."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "left-merge-keep-all-left",
      num: 2,
      title: "Left merge keeping every left row",
      difficulty: "Easy",
      category: "Merge & Join",
      importance: "essential",
      meta: { pattern: "Left join", technique: "how='left'", functions: "pd.merge, how='left'" },
      description:
        "Keep **all** rows from the left frame and pull in matching columns from the right, filling `NaN` where no match exists. `pd.merge(a, b, on=key, how='left')` is SQL's `LEFT JOIN` — the go-to for enriching a table without losing any of its rows.",
      notes: [
        "Unmatched left rows keep their data; the right-side columns become `NaN`.",
        "Right-side integer columns are promoted to float because `NaN` needs a float dtype."
      ],
      examples: [
        {
          input: "employees dept_id=[10,20,99]; depts dept_id=[10,20,30]",
          output: "all 3 employees; dept is NaN for the 99 row",
          reasoning: "A left join keeps every left row; the unmatched 99 gets NaN for the right columns."
        }
      ],
      approaches: [
        {
          name: "pd.merge(..., how='left')",
          whenToUse: "Enriching a primary table with optional lookups while preserving all its rows.",
          logic:
            "**What it asks.** Attach reference data to every row of the main table, even rows with no match.\n\n" +
            "**Key idea.** `how='left'` keeps all left rows; right columns are filled with `NaN` where the key is absent.\n\n" +
            "**Step by step.**\n" +
            "1. Put the table you must keep in full on the left.\n" +
            "2. `pd.merge(employees, depts, on='dept_id', how='left')`.\n" +
            "3. Inspect the `NaN`s to find unmatched keys.\n\n" +
            "**Why it works.** Left join emits one output row per left row, joining right values when the key matches and `NaN` when it does not.\n\n" +
            "**Gotchas.**\n" +
            "- Integer right columns become float once `NaN` appears — cast back with `Int64` if you need nullable ints.\n" +
            "- If the right key is not unique, a left join can still multiply rows (see many-to-many).\n\n" +
            "**Interview mindset.** 'Left join to keep all employees' signals you thought about row preservation.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "employees = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                          'dept_id': [10, 20, 99]})\n" +
            "depts = pd.DataFrame({'dept_id': [10, 20, 30],\n" +
            "                      'dept': ['Eng', 'Sales', 'Data']})\n" +
            "out = pd.merge(employees, depts, on='dept_id', how='left')  # keep all left rows\n" +
            "print(out)                                                   # dept is NaN for dept_id 99",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "employees = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                          'dept_id': [10, 20, 99]})\n" +
            "depts = pd.DataFrame({'dept_id': [10, 20, 30],\n" +
            "                      'dept': ['Eng', 'Sales', 'Data']})\n" +
            "print(pd.merge(employees, depts, on='dept_id', how='left'))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'keep every row of the main table', 'enrich with a lookup', 'fill missing as blank'.",
        "**Say it:** `pd.merge(a, b, on='key', how='left')` — LEFT JOIN.",
        "**Trap:** int columns turn float once NaN appears; use Int64 for nullable ints."
      ],
      commonMistakes: [
        "Using the default inner join and silently losing unmatched left rows.",
        "Being surprised that a non-unique right key still inflates the row count."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "merge-differently-named-columns",
      num: 3,
      title: "Merge on differently-named columns",
      difficulty: "Easy",
      category: "Merge & Join",
      importance: "common",
      meta: { pattern: "Key rename join", technique: "left_on / right_on", functions: "pd.merge, left_on=, right_on=" },
      description:
        "The join columns have different names in each frame — orders store the customer as `cust`, while the customer table calls it `id`. Use `left_on='cust', right_on='id'` instead of `on=`. This is `JOIN ... ON orders.cust = customers.id` in SQL.",
      notes: [
        "`left_on`/`right_on` map two differently-named columns onto each other.",
        "Both key columns are kept in the result; drop the redundant one afterward if you like."
      ],
      examples: [
        {
          input: "orders cust=[101,102,101]; customers id=[101,102]",
          output: "each order joined to its customer name; both cust and id columns present",
          reasoning: "left_on/right_on match cust to id even though the names differ."
        }
      ],
      approaches: [
        {
          name: "left_on / right_on",
          whenToUse: "Joining when the same entity is named differently in each table.",
          logic:
            "**What it asks.** Join two frames whose key columns have different names.\n\n" +
            "**Key idea.** `left_on` and `right_on` tell merge which column on each side to match, replacing `on=`.\n\n" +
            "**Step by step.**\n" +
            "1. Identify the key column on each side (`cust` vs `id`).\n" +
            "2. `pd.merge(orders, customers, left_on='cust', right_on='id')`.\n" +
            "3. Optionally `drop(columns='id')` to remove the duplicate key.\n\n" +
            "**Why it works.** Merge matches values from the named columns; it does not require the labels to agree.\n\n" +
            "**Gotchas.**\n" +
            "- Both key columns survive in the output, so you often end up with a redundant column.\n" +
            "- Renaming one column to match and using `on=` is an equivalent alternative.\n\n" +
            "**Interview mindset.** Reach for `left_on`/`right_on` the moment the keys are named differently.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "orders = pd.DataFrame({'order_id': [1, 2, 3], 'cust': [101, 102, 101]})\n" +
            "customers = pd.DataFrame({'id': [101, 102], 'name': ['Asha', 'Ravi']})\n" +
            "out = pd.merge(orders, customers, left_on='cust', right_on='id')  # keys named differently\n" +
            "print(out)                                                        # both cust and id remain",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "orders = pd.DataFrame({'order_id': [1, 2, 3], 'cust': [101, 102, 101]})\n" +
            "customers = pd.DataFrame({'id': [101, 102], 'name': ['Asha', 'Ravi']})\n" +
            "print(pd.merge(orders, customers, left_on='cust', right_on='id'))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'join on X = Y' where the two columns have different names.",
        "**Say it:** `pd.merge(a, b, left_on='cust', right_on='id')`.",
        "**Trap:** both key columns stay in the result; drop the extra if unwanted."
      ],
      commonMistakes: [
        "Trying `on=` when the columns are named differently (raises KeyError).",
        "Forgetting to drop the now-redundant duplicate key column."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "indicator-find-unmatched",
      num: 4,
      title: "Detect unmatched rows with indicator=True",
      difficulty: "Medium",
      category: "Merge & Join",
      importance: "common",
      meta: { pattern: "Anti-join / audit", technique: "indicator column", functions: "pd.merge, how='outer', indicator=True" },
      description:
        "Find which keys exist only on one side. An outer merge with `indicator=True` adds a `_merge` column tagging each row as `left_only`, `right_only`, or `both` — then filter it. Selecting `left_only` gives you a SQL-style **anti-join** (rows in A with no match in B).",
      notes: [
        "`indicator=True` adds a categorical `_merge` column with three labels.",
        "`how='outer'` keeps rows from both sides so you can see every mismatch at once."
      ],
      examples: [
        {
          input: "left key=[a,b,c]; right key=[b,c,d]",
          output: "_merge tags: a=left_only, b/c=both, d=right_only; filtering left_only returns a",
          reasoning: "Only 'a' is present on the left and absent on the right."
        }
      ],
      approaches: [
        {
          name: "outer merge + indicator",
          whenToUse: "Auditing a join, or implementing an anti-join to find rows with no match.",
          logic:
            "**What it asks.** Identify which keys failed to match, on which side.\n\n" +
            "**Key idea.** `indicator=True` records each row's origin in a `_merge` column; filtering it isolates unmatched rows.\n\n" +
            "**Step by step.**\n" +
            "1. `pd.merge(left, right, on='key', how='outer', indicator=True)`.\n" +
            "2. Read the `_merge` column: `left_only`, `right_only`, `both`.\n" +
            "3. Filter, e.g. `out[out['_merge'] == 'left_only']` for an anti-join.\n\n" +
            "**Why it works.** The outer join keeps every key from both sides, and the indicator labels tell you where each came from.\n\n" +
            "**Gotchas.**\n" +
            "- `_merge` is a Categorical — compare against the exact string labels.\n" +
            "- Use `how='left'` with the indicator if you only care about unmatched left rows.\n\n" +
            "**Interview mindset.** 'Outer merge with `indicator=True`' is the crisp way to describe an anti-join in pandas.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "left = pd.DataFrame({'key': ['a', 'b', 'c'], 'lval': [1, 2, 3]})\n" +
            "right = pd.DataFrame({'key': ['b', 'c', 'd'], 'rval': [20, 30, 40]})\n" +
            "m = pd.merge(left, right, on='key', how='outer', indicator=True)  # tag row origin\n" +
            "print(m)\n" +
            "print(m[m['_merge'] == 'left_only'])                             # anti-join: in left only",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "left = pd.DataFrame({'key': ['a', 'b', 'c'], 'lval': [1, 2, 3]})\n" +
            "right = pd.DataFrame({'key': ['b', 'c', 'd'], 'rval': [20, 30, 40]})\n" +
            "m = pd.merge(left, right, on='key', how='outer', indicator=True)\n" +
            "print(m)\n" +
            "print(m[m['_merge'] == 'left_only'])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'which rows didn't match', 'anti-join', 'find records missing from B'.",
        "**Say it:** `merge(..., how='outer', indicator=True)` then filter `_merge`.",
        "**Trap:** `_merge` is a Categorical; match the exact labels left_only/right_only/both."
      ],
      commonMistakes: [
        "Doing an inner join then wondering where the unmatched rows went.",
        "Comparing `_merge` to a typo'd label and silently getting no rows."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "many-to-many-validate",
      num: 5,
      title: "Guard a many-to-many merge with validate=",
      difficulty: "Hard",
      category: "Merge & Join",
      importance: "common",
      meta: { pattern: "Cardinality guard", technique: "row blow-up + validate", functions: "pd.merge, validate='one_to_one'" },
      description:
        "When the key is duplicated on **both** sides, merge produces the Cartesian product of the matches — a row **blow-up**. Two orders and two contacts for the same customer yield four rows, not two. Pass `validate='one_to_one'` (or `'one_to_many'`, `'many_to_one'`) so pandas raises a `MergeError` when the real cardinality differs from what you expect.",
      notes: [
        "A key repeated on both sides multiplies rows: n left matches x m right matches.",
        "`validate=` checks key uniqueness before merging: `'1:1'`, `'1:m'`, `'m:1'`, `'m:m'`."
      ],
      examples: [
        {
          input: "orders cust_id=[1,1,2]; contacts cust_id=[1,1,2]",
          output: "5 rows (cust 1: 2x2=4 combinations, cust 2: 1); validate='one_to_one' raises MergeError",
          reasoning: "cust_id 1 repeats on both sides, so its matches form a 2x2 cross-product."
        }
      ],
      approaches: [
        {
          name: "expose the blow-up, then validate",
          whenToUse: "Any merge where you assume the key is unique — validate makes that assumption fail loudly.",
          logic:
            "**What it asks.** Understand why a merge inflated the row count, and catch it automatically.\n\n" +
            "**Key idea.** Duplicate keys on both sides create a cross-product; `validate=` asserts the cardinality you intended and errors otherwise.\n\n" +
            "**Step by step.**\n" +
            "1. Merge normally and notice the row count grew unexpectedly.\n" +
            "2. Trace it to a key duplicated on both sides (a many-to-many).\n" +
            "3. Re-run with `validate='one_to_one'` to have pandas raise `MergeError` on the bad cardinality.\n\n" +
            "**Why it works.** Merge pairs *every* matching left row with *every* matching right row; `validate` pre-checks key uniqueness so a wrong assumption fails fast instead of corrupting downstream sums.\n\n" +
            "**Gotchas.**\n" +
            "- The blow-up is silent — an inflated join quietly double-counts in later aggregations.\n" +
            "- Choose the validate string that matches intent: `'1:1'`, `'1:m'`, `'m:1'`, or `'m:m'` to allow it.\n\n" +
            "**Interview mindset.** Say 'I add `validate=` to assert cardinality' — it shows you defend against silent join bugs.",
          perfNote: "A many-to-many join can explode memory; validate fails early before materializing a huge frame.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "orders = pd.DataFrame({'cust_id': [1, 1, 2], 'amount': [10, 20, 30]})\n" +
            "contacts = pd.DataFrame({'cust_id': [1, 1, 2], 'phone': ['x', 'y', 'z']})\n" +
            "blown = pd.merge(orders, contacts, on='cust_id')      # cust 1 -> 2x2 = 4 rows\n" +
            "print(blown)\n" +
            "print('rows after merge:', len(blown))               # 5, not 3\n" +
            "try:\n" +
            "    pd.merge(orders, contacts, on='cust_id', validate='one_to_one')  # assert 1:1\n" +
            "except pd.errors.MergeError as e:\n" +
            "    print('validate caught:', type(e).__name__)        # MergeError",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "orders = pd.DataFrame({'cust_id': [1, 1, 2], 'amount': [10, 20, 30]})\n" +
            "contacts = pd.DataFrame({'cust_id': [1, 1, 2], 'phone': ['x', 'y', 'z']})\n" +
            "blown = pd.merge(orders, contacts, on='cust_id')\n" +
            "print(blown)\n" +
            "print('rows after merge:', len(blown))\n" +
            "try:\n" +
            "    pd.merge(orders, contacts, on='cust_id', validate='one_to_one')\n" +
            "except pd.errors.MergeError as e:\n" +
            "    print('validate caught:', type(e).__name__)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'row count exploded after a join', 'double-counted totals', duplicated keys.",
        "**Say it:** duplicated keys both sides -> cross-product; add `validate='1:1'` to assert.",
        "**Trap:** the blow-up is silent and inflates later sums/averages."
      ],
      commonMistakes: [
        "Assuming a key is unique and summing an inflated join (double-counting).",
        "Not using `validate=` to catch the wrong cardinality at merge time."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "index-based-join",
      num: 6,
      title: "Join two frames on their index",
      difficulty: "Easy",
      category: "Merge & Join",
      importance: "common",
      meta: { pattern: "Index join", technique: "DataFrame.join", functions: "df.join, how=" },
      description:
        "When both frames are indexed by the same key, `df.join(other)` aligns them on the **index** — no `on=` needed. It is a convenient shorthand for `merge(..., left_index=True, right_index=True)` and defaults to a **left** join. This is a `JOIN` on the index rather than a column.",
      notes: [
        "`df.join` matches on the index by default; `merge` matches on columns by default.",
        "`join` defaults to `how='left'`; pass `how='inner'`/`'outer'` to change it."
      ],
      examples: [
        {
          input: "left indexed [1,2] with name; right indexed [1,2] with dept",
          output: "one frame with name and dept aligned by index",
          reasoning: "join lines rows up by matching index labels, not a column."
        }
      ],
      approaches: [
        {
          name: "df.join(other)",
          whenToUse: "Both frames already keyed by the same index — the natural, terse choice.",
          logic:
            "**What it asks.** Combine two frames that share an index into one.\n\n" +
            "**Key idea.** `df.join` aligns on the index automatically and, by default, keeps all left rows.\n\n" +
            "**Step by step.**\n" +
            "1. Ensure both frames are indexed by the join key (`set_index` if needed).\n" +
            "2. `left.join(right)`.\n" +
            "3. Change breadth with `how='inner'`/`'outer'`.\n\n" +
            "**Why it works.** `join` is `merge` with `left_index=True, right_index=True` baked in, so index labels line the rows up.\n\n" +
            "**Gotchas.**\n" +
            "- Overlapping column names require `lsuffix`/`rsuffix` or `join` raises.\n" +
            "- `join` defaults to a **left** join, unlike `merge`'s inner default.\n\n" +
            "**Interview mindset.** 'They share an index, so I use `join`' reads as idiomatic pandas.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "left = pd.DataFrame({'name': ['Asha', 'Ravi']}, index=[1, 2])\n" +
            "right = pd.DataFrame({'dept': ['Eng', 'Sales']}, index=[1, 2])\n" +
            "out = left.join(right)      # align on the index; how='left' by default\n" +
            "print(out)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "left = pd.DataFrame({'name': ['Asha', 'Ravi']}, index=[1, 2])\n" +
            "right = pd.DataFrame({'dept': ['Eng', 'Sales']}, index=[1, 2])\n" +
            "print(left.join(right))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** both frames keyed by the same index, 'attach columns by index'.",
        "**Say it:** `left.join(right)` — index alignment, left join by default.",
        "**Trap:** join defaults to left (merge defaults to inner); overlaps need lsuffix/rsuffix."
      ],
      commonMistakes: [
        "Expecting `join` to match on a column (it uses the index unless you pass `on=`).",
        "Hitting a column-overlap error because you didn't set lsuffix/rsuffix."
      ]
    },

    // ------------------------------------------------------------------ Q7
    {
      id: "merge-suffixes-overlap",
      num: 7,
      title: "Disambiguate overlapping columns with suffixes",
      difficulty: "Medium",
      category: "Merge & Join",
      importance: "common",
      meta: { pattern: "Column collision", technique: "suffixes=", functions: "pd.merge, suffixes=('_x','_y')" },
      description:
        "Both frames have a non-key column of the same name (`score`). Merge keeps both and, by default, renames them `score_x` and `score_y`. Pass `suffixes=('_q1', '_q2')` for meaningful names. This mirrors how SQL requires aliasing columns that appear in both joined tables.",
      notes: [
        "Overlapping non-key columns are suffixed `_x`/`_y` by default.",
        "`suffixes=(left, right)` sets the tags; use it to keep the result readable."
      ],
      examples: [
        {
          input: "q1 id/score; q2 id/score merged on id, suffixes=('_q1','_q2')",
          output: "columns id, score_q1, score_q2",
          reasoning: "The shared 'score' name collides, so each side is tagged with its suffix."
        }
      ],
      approaches: [
        {
          name: "suffixes on merge",
          whenToUse: "Any merge where both frames carry a non-key column of the same name.",
          logic:
            "**What it asks.** Merge two frames that share a non-key column name without losing either.\n\n" +
            "**Key idea.** Merge disambiguates the collision by appending suffixes; `suffixes=` lets you choose meaningful ones.\n\n" +
            "**Step by step.**\n" +
            "1. Merge on the key: `pd.merge(q1, q2, on='id')`.\n" +
            "2. Notice `score` appears twice, defaulting to `score_x`/`score_y`.\n" +
            "3. Pass `suffixes=('_q1', '_q2')` for clear labels.\n\n" +
            "**Why it works.** Only the key is coalesced; other shared names would clash, so merge renames both sides with the suffixes.\n\n" +
            "**Gotchas.**\n" +
            "- The key column is *not* suffixed — only the overlapping non-key columns are.\n" +
            "- Default `_x`/`_y` are easy to mix up later; set explicit suffixes on real data.\n\n" +
            "**Interview mindset.** 'I set `suffixes` so the two `score` columns stay self-describing' shows attention to output clarity.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "q1 = pd.DataFrame({'id': [1, 2], 'score': [10, 20]})\n" +
            "q2 = pd.DataFrame({'id': [1, 2], 'score': [15, 25]})\n" +
            "out = pd.merge(q1, q2, on='id', suffixes=('_q1', '_q2'))  # rename the clashing 'score'\n" +
            "print(out)                                                # id, score_q1, score_q2",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "q1 = pd.DataFrame({'id': [1, 2], 'score': [10, 20]})\n" +
            "q2 = pd.DataFrame({'id': [1, 2], 'score': [15, 25]})\n" +
            "print(pd.merge(q1, q2, on='id', suffixes=('_q1', '_q2')))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** both tables have a same-named non-key column ('score' in both).",
        "**Say it:** `pd.merge(a, b, on='id', suffixes=('_q1','_q2'))`.",
        "**Trap:** default `_x`/`_y` are ambiguous; the key itself is never suffixed."
      ],
      commonMistakes: [
        "Living with the default `_x`/`_y` and confusing the two columns downstream.",
        "Expecting the key column to be suffixed too (only non-key overlaps are)."
      ]
    }

  ]);
})();
