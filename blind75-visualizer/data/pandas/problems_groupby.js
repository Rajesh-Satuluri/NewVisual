/*
 * Pandas Interview Lab — GroupBy & Aggregation
 * =========================================================================
 * Follows the SCHEMA and LOGIC format defined in problems_selection.js.
 *
 * Registers on the global registry:
 *     window.PANDAS.register("GroupBy & Aggregation", [ ...problems ]);
 *
 * Every rcs (commented) / plain (clean) snippet is self-contained runnable
 * pandas that starts with `import pandas as pd` and prints output. Only stable
 * pandas 2.x core APIs are used (groupby, agg, transform, value_counts, size,
 * count, sort_values, head) so the code also runs under the browser's Pyodide
 * pandas. Every snippet and every claimed example output was executed before
 * commit.
 * =========================================================================
 */
(function () {
  window.PANDAS.register("GroupBy & Aggregation", [

    // ------------------------------------------------------------------ Q1
    {
      id: "groupby-single-mean",
      num: 1,
      title: "Average of a column per group",
      difficulty: "Easy",
      category: "GroupBy & Aggregation",
      importance: "essential",
      meta: { pattern: "Split-apply-combine", technique: "groupby + mean", functions: "DataFrame.groupby, Series.mean" },
      description:
        "Compute the mean `salary` for each `dept`. Group the rows by the key, pick the column to summarize, and apply an aggregate — the classic split-apply-combine.",
      notes: [
        "`df.groupby('dept')['salary'].mean()` returns a Series indexed by the group key.",
        "Selecting the column before the aggregate keeps the result a single Series instead of a wide frame."
      ],
      examples: [
        {
          input: "dept = ['Eng','Eng','Sales','Sales','Sales'], salary = [120,100,90,60,150]",
          output: "Eng 110.0, Sales 100.0",
          reasoning: "Eng averages (120+100)/2=110; Sales averages (90+60+150)/3=100."
        }
      ],
      approaches: [
        {
          name: "groupby(key)[col].mean()",
          whenToUse: "One summary number per group from a single column.",
          logic:
            "**What it asks.** Reduce each group of rows to one aggregate value.\n\n" +
            "**Key idea.** `groupby` splits the frame by the key; selecting a column and calling an aggregate applies it to each group and stitches the results back together.\n\n" +
            "**Step by step.**\n" +
            "1. Split: `df.groupby('dept')`.\n" +
            "2. Pick the column: `['salary']`.\n" +
            "3. Apply the aggregate: `.mean()`.\n\n" +
            "**Why it works.** The grouper builds an index of row labels per key, runs the reduction on each block in C, and returns a Series indexed by the distinct keys.\n\n" +
            "**Gotchas.**\n" +
            "- `mean` skips `NaN` by default, so nulls don't drag the average down.\n" +
            "- The group key becomes the index; add `as_index=False` (or `.reset_index()`) if you want it back as a column.\n\n" +
            "**Interview mindset.** Name the pattern out loud — 'split-apply-combine' — it's the mental model behind every groupby.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales', 'Sales'],\n" +
            "                   'salary': [120, 100, 90, 60, 150]})\n" +
            "result = df.groupby('dept')['salary'].mean()   # one mean per group\n" +
            "print(result)                                  # Series indexed by dept",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales', 'Sales'],\n" +
            "                   'salary': [120, 100, 90, 60, 150]})\n" +
            "print(df.groupby('dept')['salary'].mean())"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'average/total/count per group', 'for each category'.",
        "**Say it:** `df.groupby('key')['col'].mean()` — split-apply-combine.",
        "**Trap:** the key becomes the index; use `as_index=False` to keep it a column."
      ],
      commonMistakes: [
        "Aggregating the whole frame and getting an unwanted number for every column.",
        "Forgetting the key moves to the index and later failing to find it as a column."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "named-aggregation",
      num: 2,
      title: "Named aggregation into tidy columns",
      difficulty: "Easy",
      category: "GroupBy & Aggregation",
      importance: "essential",
      meta: { pattern: "Tidy summary table", technique: "agg(newcol=(col, func)) + as_index=False", functions: "DataFrameGroupBy.agg" },
      description:
        "Produce a clean summary table: one row per `dept` with an `avg_salary` and a `headcount` column. Use named aggregation — `agg(newname=('col', 'func'))` — plus `as_index=False` so the key stays a normal column.",
      notes: [
        "Each keyword names an output column and maps it to an (input column, function) tuple.",
        "`as_index=False` keeps the group key as a column instead of pushing it into the index."
      ],
      examples: [
        {
          input: "dept = ['Eng','Eng','Sales'], salary = [120,100,90]",
          output: "Eng avg_salary=110.0 headcount=2; Sales avg_salary=90.0 headcount=1",
          reasoning: "Eng has two salaries averaging 110; Sales has one salary of 90."
        }
      ],
      approaches: [
        {
          name: "agg(newcol=(col, func)) with as_index=False",
          whenToUse: "Building a readable summary frame with explicitly named result columns.",
          logic:
            "**What it asks.** Turn groups into a tidy table whose columns you name yourself.\n\n" +
            "**Key idea.** Named aggregation passes `output_name=('source_col', 'func')` pairs, so every result column has a clear name and no messy multi-level headers.\n\n" +
            "**Step by step.**\n" +
            "1. Group with `as_index=False` so the key stays a column.\n" +
            "2. Call `.agg(avg_salary=('salary', 'mean'), headcount=('salary', 'size'))`.\n" +
            "3. Read the result as a flat, one-row-per-group frame.\n\n" +
            "**Why it works.** Each keyword is a self-describing recipe; pandas runs each function on its column per group and assembles a flat frame with your chosen labels.\n\n" +
            "**Gotchas.**\n" +
            "- Use `'size'` for headcount (counts every row); `'count'` would skip nulls.\n" +
            "- Without `as_index=False` the key becomes the index — fine, but less tidy for reports.\n\n" +
            "**Interview mindset.** Reach for named aggregation whenever the output columns need clean, meaningful names.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales'],\n" +
            "                   'salary': [120, 100, 90]})\n" +
            "out = df.groupby('dept', as_index=False).agg(   # key stays a column\n" +
            "    avg_salary=('salary', 'mean'),              # name = (col, func)\n" +
            "    headcount=('salary', 'size'))\n" +
            "print(out)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales'],\n" +
            "                   'salary': [120, 100, 90]})\n" +
            "out = df.groupby('dept', as_index=False).agg(\n" +
            "    avg_salary=('salary', 'mean'),\n" +
            "    headcount=('salary', 'size'))\n" +
            "print(out)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'a table with columns named X and Y per group', report-style output.",
        "**Say it:** `df.groupby(k, as_index=False).agg(x=('c','mean'), n=('c','size'))`.",
        "**Trap:** use `size` for a true row count; `count` drops nulls."
      ],
      commonMistakes: [
        "Getting confusing multi-level column headers by not using named aggregation.",
        "Leaving the key in the index when a flat report frame was wanted."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "multi-aggregate-multi-column",
      num: 3,
      title: "Several aggregates over several columns",
      difficulty: "Medium",
      category: "GroupBy & Aggregation",
      importance: "common",
      meta: { pattern: "Multi-metric summary", technique: "agg with multiple named metrics", functions: "DataFrameGroupBy.agg" },
      description:
        "For each `dept`, compute the total and mean of `salary` and the maximum `age` in one pass. Named aggregation lets you mix multiple functions across multiple source columns.",
      notes: [
        "Named aggregation scales cleanly: add one keyword per metric you need.",
        "The alternative `agg({'salary': ['sum', 'mean'], 'age': 'max'})` produces harder-to-read multi-level columns."
      ],
      examples: [
        {
          input: "dept=['Eng','Eng','Sales','Sales'], salary=[120,100,90,60], age=[30,40,25,35]",
          output: "Eng: total=220 avg=110 max_age=40; Sales: total=150 avg=75 max_age=35",
          reasoning: "Eng salaries 120+100=220 (avg 110), ages max 40; Sales 90+60=150 (avg 75), ages max 35."
        }
      ],
      approaches: [
        {
          name: "one agg call, many named metrics",
          whenToUse: "Several summary numbers, possibly from different columns, in a single grouped pass.",
          logic:
            "**What it asks.** Return multiple aggregates spanning more than one column, grouped by a key.\n\n" +
            "**Key idea.** A single `.agg(...)` call can hold many `name=('col', 'func')` pairs, each drawing from whatever column it needs.\n\n" +
            "**Step by step.**\n" +
            "1. Group: `df.groupby('dept')`.\n" +
            "2. List each metric: `total_salary=('salary','sum')`, `avg_salary=('salary','mean')`, `max_age=('age','max')`.\n" +
            "3. One flat frame comes back, one column per metric.\n\n" +
            "**Why it works.** pandas evaluates every recipe per group in one traversal, so multiple metrics cost roughly one grouped scan, not several.\n\n" +
            "**Gotchas.**\n" +
            "- Two metrics may read the same column (sum and mean of `salary`) — that's fine.\n" +
            "- Prefer named aggregation over `agg({col: [funcs]})` to avoid multi-level column headers.\n\n" +
            "**Interview mindset.** Emphasize 'one grouped pass for all metrics' — it's both readable and efficient.",
          perfNote: "All named metrics share a single group traversal, cheaper than calling groupby once per metric.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "                   'salary': [120, 100, 90, 60],\n" +
            "                   'age': [30, 40, 25, 35]})\n" +
            "out = df.groupby('dept').agg(\n" +
            "    total_salary=('salary', 'sum'),   # each metric: name=(col, func)\n" +
            "    avg_salary=('salary', 'mean'),\n" +
            "    max_age=('age', 'max'))\n" +
            "print(out)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "                   'salary': [120, 100, 90, 60],\n" +
            "                   'age': [30, 40, 25, 35]})\n" +
            "out = df.groupby('dept').agg(\n" +
            "    total_salary=('salary', 'sum'),\n" +
            "    avg_salary=('salary', 'mean'),\n" +
            "    max_age=('age', 'max'))\n" +
            "print(out)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'sum and average of X and the max of Y per group'.",
        "**Say it:** one `.agg(a=('x','sum'), b=('x','mean'), c=('y','max'))` call.",
        "**Trap:** `agg({col:[funcs]})` gives multi-level columns — named agg stays flat."
      ],
      commonMistakes: [
        "Running a separate groupby per metric instead of one combined agg.",
        "Struggling with multi-index columns from the dict-of-lists form."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "groupby-transform-broadcast",
      num: 4,
      title: "Broadcast a group aggregate back to every row",
      difficulty: "Medium",
      category: "GroupBy & Aggregation",
      importance: "essential",
      meta: { pattern: "Broadcast within group", technique: "groupby().transform()", functions: "DataFrameGroupBy.transform" },
      description:
        "Add a column giving each row's `salary` as a fraction of its `dept` total. Use `transform`, which returns a result the same length as the input — so a per-group aggregate lines up with every original row. Contrast with `agg`, which collapses each group to one row.",
      notes: [
        "`agg` reduces each group to one row; `transform` returns one value per original row.",
        "`transform` preserves the original index, so the result assigns straight back as a new column."
      ],
      examples: [
        {
          input: "dept=['Eng','Eng','Sales','Sales'], salary=[120,80,90,60]",
          output: "dept_total = [200,200,150,150]; pct = [0.6,0.4,0.6,0.4]",
          reasoning: "Eng total 200 so 120/200=0.6 and 80/200=0.4; Sales total 150 so 90/150=0.6 and 60/150=0.4."
        }
      ],
      approaches: [
        {
          name: "transform vs agg",
          whenToUse: "When you need a group-level number attached to every row (ratios, shares, deviations from the group mean).",
          logic:
            "**What it asks.** Attach each group's total to its rows, then divide to get a within-group share.\n\n" +
            "**Key idea.** `transform` applies a group aggregate but returns a Series the same length as the frame, aligned to the original index — perfect for broadcasting back.\n\n" +
            "**Step by step.**\n" +
            "1. `df.groupby('dept')['salary'].transform('sum')` gives each row its group total.\n" +
            "2. Assign it: `df['dept_total'] = ...`.\n" +
            "3. Divide: `df['pct_of_dept'] = df['salary'] / df['dept_total']`.\n\n" +
            "**Why it works.** Unlike `agg` (one row per group), `transform` repeats the group result across every member row and keeps the index, so it slots straight into the frame.\n\n" +
            "**Gotchas.**\n" +
            "- Don't `agg` then `merge` back — `transform` does the broadcast in one step.\n" +
            "- The function must return a per-group scalar (broadcast) or an aligned series, not a reshaped result.\n\n" +
            "**Interview mindset.** The tell is 'compared to its group' — say 'transform to broadcast, not agg to collapse.'",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "                   'salary': [120, 80, 90, 60]})\n" +
            "df['dept_total'] = df.groupby('dept')['salary'].transform('sum')  # same length as df\n" +
            "df['pct_of_dept'] = df['salary'] / df['dept_total']               # within-group share\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "                   'salary': [120, 80, 90, 60]})\n" +
            "df['dept_total'] = df.groupby('dept')['salary'].transform('sum')\n" +
            "df['pct_of_dept'] = df['salary'] / df['dept_total']\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'share of group total', 'percent of category', 'vs the group average'.",
        "**Say it:** `df.groupby(k)[c].transform('sum')` returns one value per row.",
        "**Trap:** `agg` collapses groups; only `transform` keeps the row count for a broadcast."
      ],
      commonMistakes: [
        "Using `agg` then merging the totals back instead of a single `transform`.",
        "Expecting `transform` to shrink the frame — it always matches the input length."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "value-counts-size-count",
      num: 5,
      title: "value_counts vs size vs count",
      difficulty: "Easy",
      category: "GroupBy & Aggregation",
      importance: "common",
      meta: { pattern: "Counting rows", technique: "value_counts / size / count", functions: "Series.value_counts, GroupBy.size, GroupBy.count" },
      description:
        "Count how many rows fall in each `dept` three ways, and understand the difference. `value_counts` tallies a Series' values (sorted by frequency); groupby `size` counts every row per group **including** nulls; groupby `count` counts only **non-null** values in a column.",
      notes: [
        "`size` counts rows (nulls included); `count` counts non-null entries in the chosen column.",
        "`value_counts` returns counts sorted high-to-low and, by default, drops NaN."
      ],
      examples: [
        {
          input: "dept=['Eng','Eng','Sales','Sales','Sales'], bonus=[10, NaN, 5, NaN, 8]",
          output: "value_counts: Sales 3, Eng 2; size: Eng 2, Sales 3; bonus count: Eng 1, Sales 2",
          reasoning: "size counts all rows per dept; count skips the NaN bonuses, so Eng drops to 1 and Sales to 2."
        }
      ],
      approaches: [
        {
          name: "value_counts / size / count",
          whenToUse: "Frequency tables and row counts — pick size vs count based on how nulls should be treated.",
          logic:
            "**What it asks.** Tally rows per category, and distinguish counting rows from counting non-null values.\n\n" +
            "**Key idea.** `value_counts` is a one-shot frequency table on a Series; groupby `size` counts rows; groupby `count` counts non-null values per column.\n\n" +
            "**Step by step.**\n" +
            "1. `df['dept'].value_counts()` — frequencies, sorted descending.\n" +
            "2. `df.groupby('dept').size()` — rows per group, nulls included.\n" +
            "3. `df.groupby('dept')['bonus'].count()` — non-null bonuses per group.\n\n" +
            "**Why it works.** `size` measures group length; `count` measures presence of data, so wherever a column has nulls the two diverge.\n\n" +
            "**Gotchas.**\n" +
            "- `value_counts` sorts by frequency by default and drops NaN unless `dropna=False`.\n" +
            "- Choose `size` when you mean 'how many rows', `count` when you mean 'how many values are present'.\n\n" +
            "**Interview mindset.** State the null rule crisply: 'size counts rows, count counts non-nulls.'",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales', 'Sales'],\n" +
            "                   'bonus': [10, None, 5, None, 8]})\n" +
            "print(df['dept'].value_counts())          # frequency table, sorted\n" +
            "print(df.groupby('dept').size())          # rows per group (nulls counted)\n" +
            "print(df.groupby('dept')['bonus'].count())  # non-null bonuses only",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales', 'Sales'],\n" +
            "                   'bonus': [10, None, 5, None, 8]})\n" +
            "print(df['dept'].value_counts())\n" +
            "print(df.groupby('dept').size())\n" +
            "print(df.groupby('dept')['bonus'].count())"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'how many per category', 'frequency of each value', counting with possible nulls.",
        "**Say it:** `value_counts` for a quick tally; `size` for rows; `count` for non-nulls.",
        "**Trap:** `size` includes NaN rows, `count` excludes them — they differ when a column has nulls."
      ],
      commonMistakes: [
        "Using `count` when you meant total rows and silently dropping null-bearing rows.",
        "Forgetting `value_counts` drops NaN unless `dropna=False`."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "top-n-per-group",
      num: 6,
      title: "Top-N rows within each group",
      difficulty: "Hard",
      category: "GroupBy & Aggregation",
      importance: "common",
      meta: { pattern: "Per-group top-N", technique: "sort_values then groupby().head(N)", functions: "DataFrame.sort_values, DataFrameGroupBy.head" },
      description:
        "Return the 2 highest-paid employees **per** `dept`. Sort the whole frame by `salary` descending first, then `groupby('dept').head(2)` takes the first 2 rows of each already-ordered group.",
      notes: [
        "Order matters: sort **before** grouping so `head(N)` picks the largest, not arbitrary, rows.",
        "`groupby().head(N)` returns actual rows (unlike an aggregate), preserving all columns."
      ],
      examples: [
        {
          input: "dept=['Eng','Eng','Eng','Sales','Sales'], name=['A','B','C','D','E'], salary=[120,100,150,90,60]",
          output: "Eng: C(150), A(120); Sales: D(90), E(60)",
          reasoning: "After sorting by salary desc, each dept's first two rows are its top earners."
        }
      ],
      approaches: [
        {
          name: "sort_values then groupby().head(N)",
          whenToUse: "Selecting the best (or worst) N rows inside every group, keeping full rows.",
          logic:
            "**What it asks.** For each group, keep the N rows with the largest values — not one summary number, but the rows themselves.\n\n" +
            "**Key idea.** Sort globally by the ranking column, then `groupby(key).head(N)` slices the first N rows of each group in that sorted order.\n\n" +
            "**Step by step.**\n" +
            "1. `df.sort_values('salary', ascending=False)`.\n" +
            "2. `.groupby('dept')`.\n" +
            "3. `.head(2)` — the top 2 rows of each group.\n\n" +
            "**Why it works.** `groupby` preserves the order rows arrive in, so after a descending sort the first N rows of each group are exactly its largest. `head(N)` keeps whole rows, so every column comes along.\n\n" +
            "**Gotchas.**\n" +
            "- Sort first — grouping an unsorted frame makes `head(N)` return arbitrary rows.\n" +
            "- For the smallest N per group, sort ascending instead.\n" +
            "- `nlargest` gives a single global top-N; per-group needs this sort-then-head pattern.\n\n" +
            "**Interview mindset.** Say the recipe as one phrase: 'sort, group, head' — and stress the sort must come first.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "                   'name': ['A', 'B', 'C', 'D', 'E'],\n" +
            "                   'salary': [120, 100, 150, 90, 60]})\n" +
            "top2 = (df.sort_values('salary', ascending=False)  # sort FIRST\n" +
            "          .groupby('dept')\n" +
            "          .head(2))                                # top 2 rows per dept\n" +
            "print(top2)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "                   'name': ['A', 'B', 'C', 'D', 'E'],\n" +
            "                   'salary': [120, 100, 150, 90, 60]})\n" +
            "top2 = (df.sort_values('salary', ascending=False)\n" +
            "          .groupby('dept')\n" +
            "          .head(2))\n" +
            "print(top2)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'top 3 per category', 'highest N in each group', 'best per department'.",
        "**Say it:** `df.sort_values(c, ascending=False).groupby(k).head(N)`.",
        "**Trap:** sort before grouping, and remember `nlargest` is only a global top-N."
      ],
      commonMistakes: [
        "Calling `groupby().head(N)` without sorting first, getting arbitrary rows.",
        "Reaching for `nlargest` and getting one global top-N instead of one per group."
      ]
    },

    // ------------------------------------------------------------------ Q7
    {
      id: "groupby-multiple-keys",
      num: 7,
      title: "Group by multiple keys",
      difficulty: "Medium",
      category: "GroupBy & Aggregation",
      importance: "common",
      meta: { pattern: "Multi-key grouping", technique: "groupby([k1, k2])", functions: "DataFrame.groupby" },
      description:
        "Compute the mean `salary` for every `dept` and `level` combination. Pass a list of keys to `groupby`; the result is indexed by a MultiIndex, one entry per existing key combination.",
      notes: [
        "`groupby(['dept', 'level'])` groups by the unique pairs that actually appear in the data.",
        "The result carries a MultiIndex; `reset_index()` (or `as_index=False`) flattens it back to columns."
      ],
      examples: [
        {
          input: "dept=['Eng','Eng','Eng','Sales'], level=['jr','sr','jr','sr'], salary=[100,150,120,90]",
          output: "(Eng,jr)=110.0, (Eng,sr)=150.0, (Sales,sr)=90.0",
          reasoning: "Eng+jr averages (100+120)/2=110; the other combinations each have one row."
        }
      ],
      approaches: [
        {
          name: "groupby([k1, k2])",
          whenToUse: "Summaries broken down by more than one categorical dimension.",
          logic:
            "**What it asks.** Aggregate over combinations of two (or more) grouping columns.\n\n" +
            "**Key idea.** Passing a list of keys groups by their tuples, producing a result indexed by a MultiIndex of the combinations present.\n\n" +
            "**Step by step.**\n" +
            "1. `df.groupby(['dept', 'level'])`.\n" +
            "2. Pick the column and aggregate: `['salary'].mean()`.\n" +
            "3. Read rows as (dept, level) pairs; `reset_index()` to flatten if needed.\n\n" +
            "**Why it works.** The grouper keys on the tuple of column values, so each distinct combination becomes its own group — only combinations that occur appear.\n\n" +
            "**Gotchas.**\n" +
            "- Only observed combinations show up; absent pairs simply aren't there.\n" +
            "- The MultiIndex can surprise downstream code — flatten with `reset_index()` or `as_index=False`.\n\n" +
            "**Interview mindset.** Mention the MultiIndex result and how to flatten it — it shows you know what comes back.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Eng', 'Sales'],\n" +
            "                   'level': ['jr', 'sr', 'jr', 'sr'],\n" +
            "                   'salary': [100, 150, 120, 90]})\n" +
            "result = df.groupby(['dept', 'level'])['salary'].mean()  # keyed by (dept, level)\n" +
            "print(result)                                            # MultiIndex Series",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Eng', 'Sales'],\n" +
            "                   'level': ['jr', 'sr', 'jr', 'sr'],\n" +
            "                   'salary': [100, 150, 120, 90]})\n" +
            "print(df.groupby(['dept', 'level'])['salary'].mean())"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'by region and month', 'per department and level', two-dimensional breakdowns.",
        "**Say it:** `df.groupby(['k1', 'k2'])['c'].mean()` — one row per key combination.",
        "**Trap:** the result is a MultiIndex; flatten with `reset_index()` when needed."
      ],
      commonMistakes: [
        "Passing keys as separate arguments instead of one list.",
        "Being surprised by the MultiIndex and struggling to select from it."
      ]
    }

  ]);
})();
