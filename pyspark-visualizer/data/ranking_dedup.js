/*
 * PySpark Interview Lab — Ranking & Dedup (Medium)
 * Schema identical to DataFrame Basics (see data/dataframe_basics.js header).
 * Ranking (rank / dense_rank / row_number) and window-based dedup all
 * partitionBy a key, which triggers a WIDE (shuffle) transformation:
 * rows are shuffled by the partition key, then sorted within each partition.
 */
(function () {
  var CAT = "Ranking & Dedup";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q61
    {
      id: "second-highest-salary-company",
      lc: 61,
      title: "Second-highest salary in the entire company",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Nth-highest value (global)", transformation: "Wide (shuffle)", functions: "Window, dense_rank, over" },
      description:
        "Given an `employees` DataFrame (`employee_id`, `name`, `salary`), return the **second-highest salary** across the whole company as a single value. If several employees share the top salary, the second-highest is the next *distinct* salary below it — not merely the second row. Return null if there is no second distinct salary.",
      examples: [
        {
          input: "employees: (1, 'Asha', 150000), (2, 'Ravi', 150000), (3, 'Meera', 120000), (4, 'Dev', 90000)",
          output: "second-highest salary = 120000",
          reasoning: "Two employees tie at 150000 (the top distinct salary). The next distinct salary below it is 120000, so that is the second-highest — tied top rows do not count as two separate ranks."
        }
      ],
      approaches: [
        {
          name: "dense_rank over the full DataFrame, filter rank == 2",
          whenToUse: "Any 'Nth-highest value' where ties at a salary level must collapse to one rank.",
          logic:
            "**What it asks.** The second *distinct* salary from the top, counting a tied group of salaries as one level.\n\n" +
            "**Key Idea.** `dense_rank()` assigns 1 to the highest salary, 2 to the next distinct salary, and so on with **no gaps**, giving identical salaries the same rank. Rank the whole DataFrame (one partition) by salary descending, then keep `rank == 2`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build a window with **no** `partitionBy` (the whole company is one group): `w = Window.orderBy(col('salary').desc())`.\n" +
            "2. Add the rank: `withColumn('rnk', dense_rank().over(w))`.\n" +
            "3. Filter to the second level: `.filter(col('rnk') == 2)`.\n" +
            "4. Project the salary (all rows at rank 2 share it): `.select('salary').distinct()`.\n\n" +
            "**Why it works.** `dense_rank` gives the same rank to equal salaries and never skips a number, so rank 2 is always the second *distinct* salary — exactly the definition of second-highest.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `dense_rank`, not `row_number`: `row_number` would label the second *row* (a tied top earner) as 2 and return 150000, which is wrong.\n" +
            "- `rank` would leave a gap after ties (1, 1, 3, ...), so rank 2 could be empty; `dense_rank` (1, 1, 2, ...) is the correct choice for Nth-distinct.\n" +
            "- An unpartitioned window puts every row on **one** partition — fine for a single scalar answer but a shuffle-to-one hotspot on huge data (a `distinct().orderBy().limit(1).offset(1)` style query scales better).\n\n" +
            "**Interview mindset.** Say 'second-highest = second *distinct* value = `dense_rank == 2`', and explicitly contrast dense_rank (handles ties) with row_number (picks a single arbitrary row).",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, dense_rank\n" +
            "\n" +
            "w = Window.orderBy(col('salary').desc())            # whole company, highest first\n" +
            "\n" +
            "ranked = employees.withColumn(\n" +
            "    'rnk',\n" +
            "    dense_rank().over(w))                           # ties share a rank, no gaps\n" +
            "\n" +
            "result = (ranked\n" +
            "    .filter(col('rnk') == 2)                        # the 2nd distinct salary\n" +
            "    .select('salary')\n" +
            "    .distinct())                                    # collapse tied rows to one\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, dense_rank\n" +
            "\n" +
            "w = Window.orderBy(col('salary').desc())\n" +
            "\n" +
            "ranked = employees.withColumn(\n" +
            "    'rnk',\n" +
            "    dense_rank().over(w))\n" +
            "\n" +
            "result = (ranked\n" +
            "    .filter(col('rnk') == 2)\n" +
            "    .select('salary')\n" +
            "    .distinct())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A window with **no** `partitionBy` forces all rows into a **single** partition — Spark shuffles everything to one reducer, sorts by salary descending, then assigns `dense_rank`. That single-partition shuffle is the cost (and a scalability hazard on large inputs), so for a plain scalar answer the alternative `employees.select('salary').distinct().orderBy(col('salary').desc()).limit(2)` and take the last row avoids materializing a rank on every row. `dense_rank` vs `rank` differ only in gap behavior after ties; both are cheaper than a self-join approach.",
      sparkSql:
        "SELECT DISTINCT salary\n" +
        "FROM (\n" +
        "  SELECT salary,\n" +
        "         DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk\n" +
        "  FROM employees\n" +
        ") t\n" +
        "WHERE rnk = 2;",
      recognizeRecall: [
        "**Spot it:** 'second-highest', 'Nth-highest', 'runner-up salary' across the whole table.",
        "**Say it:** `dense_rank().over(Window.orderBy(col('salary').desc()))` then filter `== 2`; dense_rank handles ties.",
        "**Trap:** row_number returns a tied top row (wrong); rank leaves a gap that can empty out level 2 — use dense_rank."
      ]
    },

    // ------------------------------------------------------------------ Q62
    {
      id: "second-highest-salary-per-department",
      lc: 62,
      title: "Second-highest salary in every department",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Nth-highest per group", transformation: "Wide (shuffle)", functions: "Window, dense_rank, partitionBy, over" },
      description:
        "Given an `employees` DataFrame (`employee_id`, `name`, `department`, `salary`), return the **second-highest salary within each department**. As in the global case, ties at a salary level count as one rank, so the answer is the second *distinct* salary per department. Departments without a second distinct salary produce no row.",
      examples: [
        {
          input: "employees: (1,'Asha','Eng',150000), (2,'Ravi','Eng',150000), (3,'Meera','Eng',120000), (4,'Dev','Sales',90000), (5,'Nina','Sales',70000)",
          output: "Eng -> 120000 ; Sales -> 70000",
          reasoning: "In Eng, 150000 is the top distinct salary (a tie) and 120000 is the second distinct salary. In Sales, 90000 is top and 70000 is second."
        }
      ],
      approaches: [
        {
          name: "dense_rank over Window.partitionBy(department)",
          whenToUse: "Nth-highest value computed independently for each group/partition.",
          logic:
            "**What it asks.** The second distinct salary *per department*, ties collapsed within each department.\n\n" +
            "**Key Idea.** Add `partitionBy('department')` to the window so `dense_rank` restarts at 1 for every department, ranking salaries descending inside each one. Keep `rank == 2`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the partitioned window: `w = Window.partitionBy('department').orderBy(col('salary').desc())`.\n" +
            "2. Rank within each department: `withColumn('rnk', dense_rank().over(w))`.\n" +
            "3. Filter to the second level: `.filter(col('rnk') == 2)`.\n" +
            "4. Project department + salary (distinct to collapse tied rows).\n\n" +
            "**Why it works.** `partitionBy('department')` scopes the ranking to each department; `dense_rank` gives tied salaries the same rank with no gaps, so rank 2 is that department's second distinct salary.\n\n" +
            "**Common Gotchas.**\n" +
            "- The only change from the global version (Q61) is adding `partitionBy` — that is what turns 'one answer' into 'one answer per group'.\n" +
            "- Still use `dense_rank`, not `row_number`: a department with two employees tied at the top would wrongly report the top salary as 'second' under row_number.\n" +
            "- `rank` leaves gaps after a tie, so a department whose top salary is tied would have no rank-2 row at all — `dense_rank` avoids that.\n\n" +
            "**Interview mindset.** Emphasize the single lever — `partitionBy` — that converts a whole-table computation into a per-group one, and restate why dense_rank beats row_number when ties exist.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, dense_rank\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('department')                     # restart ranking per department\n" +
            "     .orderBy(col('salary').desc()))                # highest salary first\n" +
            "\n" +
            "ranked = employees.withColumn(\n" +
            "    'rnk',\n" +
            "    dense_rank().over(w))                           # ties share a rank, no gaps\n" +
            "\n" +
            "result = (ranked\n" +
            "    .filter(col('rnk') == 2)                        # 2nd distinct salary per dept\n" +
            "    .select('department', 'salary')\n" +
            "    .distinct())\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, dense_rank\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('department')\n" +
            "     .orderBy(col('salary').desc()))\n" +
            "\n" +
            "ranked = employees.withColumn(\n" +
            "    'rnk',\n" +
            "    dense_rank().over(w))\n" +
            "\n" +
            "result = (ranked\n" +
            "    .filter(col('rnk') == 2)\n" +
            "    .select('department', 'salary')\n" +
            "    .distinct())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**: Spark hash-shuffles rows by `department` so each department's rows land on one partition, then sorts them by salary descending and applies `dense_rank`. Unlike the global Q61 (single-partition hotspot), partitioning by department spreads work across reducers, so this scales with the number of departments — but a giant department (skew) becomes the straggler. `dense_rank` and `rank` share the same physical plan; they differ only in how they number rows after a tie (dense_rank: no gaps; rank: gaps).",
      sparkSql:
        "SELECT DISTINCT department, salary\n" +
        "FROM (\n" +
        "  SELECT department, salary,\n" +
        "         DENSE_RANK() OVER (\n" +
        "           PARTITION BY department ORDER BY salary DESC\n" +
        "         ) AS rnk\n" +
        "  FROM employees\n" +
        ") t\n" +
        "WHERE rnk = 2;",
      recognizeRecall: [
        "**Spot it:** 'second-highest per department', 'Nth value within each group'.",
        "**Say it:** `dense_rank().over(Window.partitionBy('department').orderBy(col('salary').desc()))`, filter `== 2`.",
        "**Trap:** the only difference from the global case is partitionBy; use dense_rank so tied top salaries don't masquerade as the runner-up."
      ]
    },

    // ------------------------------------------------------------------ Q63
    {
      id: "third-highest-salary-per-department",
      lc: 63,
      title: "Third-highest salary in every department",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Nth-highest per group", transformation: "Wide (shuffle)", functions: "Window, dense_rank, partitionBy, over" },
      description:
        "Given an `employees` DataFrame (`employee_id`, `name`, `department`, `salary`), return the **third-highest salary within each department** — the third *distinct* salary from the top of each department, ties collapsed. Departments with fewer than three distinct salaries yield no row.",
      examples: [
        {
          input: "employees: (1,'Asha','Eng',150000), (2,'Ravi','Eng',150000), (3,'Meera','Eng',120000), (4,'Dev','Eng',90000)",
          output: "Eng -> 90000",
          reasoning: "Distinct Eng salaries, high to low: 150000 (rank 1, tied), 120000 (rank 2), 90000 (rank 3). The third distinct salary is 90000."
        }
      ],
      approaches: [
        {
          name: "dense_rank per department, filter rank == 3",
          whenToUse: "The third-distinct (or any Nth-distinct) value per group; just change the constant.",
          logic:
            "**What it asks.** The third distinct salary per department, ties collapsed within each department.\n\n" +
            "**Key Idea.** Identical to Q62 but keep `dense_rank == 3`. `dense_rank` numbers distinct salary levels 1, 2, 3, ... with no gaps, so level 3 is precisely the third-highest distinct salary.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('department').orderBy(col('salary').desc())`.\n" +
            "2. `withColumn('rnk', dense_rank().over(w))`.\n" +
            "3. `.filter(col('rnk') == 3)`.\n" +
            "4. `.select('department', 'salary').distinct()`.\n\n" +
            "**Why it works.** Because `dense_rank` never skips a number even when earlier levels have ties, `rank == N` always corresponds to the Nth *distinct* value — so N = 3 gives the third-highest.\n\n" +
            "**Common Gotchas.**\n" +
            "- With `rank` (not dense_rank) two people tied at the top consume ranks 1 and 1, then the next salary jumps to rank 3 — so `rank == 3` could accidentally return the *second* distinct salary. Only `dense_rank` makes 'rank == 3' mean 'third distinct'.\n" +
            "- Departments with fewer than 3 distinct salaries simply have no rank-3 row; that's the correct empty result.\n" +
            "- The pattern generalizes: change the filter constant to get any Nth-highest.\n\n" +
            "**Interview mindset.** Point out that Nth-highest is a one-line change (the filter constant) once the dense_rank window is set up, and reiterate the ties argument for why dense_rank is mandatory here.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, dense_rank\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('department')                     # per department\n" +
            "     .orderBy(col('salary').desc()))                # highest first\n" +
            "\n" +
            "ranked = employees.withColumn(\n" +
            "    'rnk',\n" +
            "    dense_rank().over(w))                           # distinct salary levels, no gaps\n" +
            "\n" +
            "result = (ranked\n" +
            "    .filter(col('rnk') == 3)                        # 3rd distinct salary per dept\n" +
            "    .select('department', 'salary')\n" +
            "    .distinct())\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, dense_rank\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('department')\n" +
            "     .orderBy(col('salary').desc()))\n" +
            "\n" +
            "ranked = employees.withColumn(\n" +
            "    'rnk',\n" +
            "    dense_rank().over(w))\n" +
            "\n" +
            "result = (ranked\n" +
            "    .filter(col('rnk') == 3)\n" +
            "    .select('department', 'salary')\n" +
            "    .distinct())\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "Same **wide** profile as Q62: hash-shuffle by `department`, sort by salary descending per partition, assign `dense_rank`. The filter constant (3 here) is applied after the window and does not change the plan. The reason `dense_rank` is required rather than `rank` is purely semantic — after a tie, `rank` skips numbers so `rank == N` no longer means 'Nth distinct', while `dense_rank` guarantees it does. Skewed departments dominate runtime.",
      sparkSql:
        "SELECT DISTINCT department, salary\n" +
        "FROM (\n" +
        "  SELECT department, salary,\n" +
        "         DENSE_RANK() OVER (\n" +
        "           PARTITION BY department ORDER BY salary DESC\n" +
        "         ) AS rnk\n" +
        "  FROM employees\n" +
        ") t\n" +
        "WHERE rnk = 3;",
      recognizeRecall: [
        "**Spot it:** 'third-highest per group', and by extension any 'Nth-highest distinct value'.",
        "**Say it:** dense_rank over partitionBy(dept).orderBy(salary desc), filter `== 3`; change the constant for other N.",
        "**Trap:** with plain rank, ties skip numbers so `== 3` can return the 2nd distinct salary — dense_rank makes rank N == Nth distinct."
      ]
    },

    // ------------------------------------------------------------------ Q64
    {
      id: "rank-employees-by-salary-in-department",
      lc: 64,
      title: "Rank employees by salary within each department",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Ranking (rank vs dense_rank vs row_number)", transformation: "Wide (shuffle)", functions: "Window, rank, dense_rank, row_number" },
      description:
        "Given an `employees` DataFrame (`employee_id`, `name`, `department`, `salary`), assign each employee a salary rank **within their department** (highest salary = 1). The real lesson is choosing the right ranking function: `rank`, `dense_rank`, and `row_number` all number rows but behave differently when salaries **tie**.",
      examples: [
        {
          input: "Eng: (Asha,150000), (Ravi,150000), (Meera,120000), (Dev,90000)",
          output: "rank -> 1,1,3,4 ; dense_rank -> 1,1,2,3 ; row_number -> 1,2,3,4",
          reasoning: "Asha and Ravi tie at 150000: rank gives both 1 then SKIPS to 3; dense_rank gives both 1 then continues at 2 (no gap); row_number breaks the tie arbitrarily into 1 and 2."
        }
      ],
      approaches: [
        {
          name: "rank / dense_rank / row_number over the same window",
          whenToUse: "Any per-group ranking; pick the function by how ties must be treated.",
          logic:
            "**What it asks.** A per-department salary ranking, and a clear account of how the three ranking functions differ on ties.\n\n" +
            "**Key Idea.** All three use the same window `Window.partitionBy('department').orderBy(col('salary').desc())`. They diverge only on tied salaries:\n" +
            "- `rank()` — equal salaries get the **same** rank, and the next rank **skips** (1, 1, 3): 'Olympic' ranking.\n" +
            "- `dense_rank()` — equal salaries get the same rank, and the next rank does **not** skip (1, 1, 2): compact ranking.\n" +
            "- `row_number()` — every row gets a **unique** number regardless of ties (1, 2, 3, 4), broken arbitrarily unless the orderBy has a tie-breaker.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build one window `w = Window.partitionBy('department').orderBy(col('salary').desc())`.\n" +
            "2. Add all three columns from the same `w`: `rank().over(w)`, `dense_rank().over(w)`, `row_number().over(w)`.\n" +
            "3. Inspect how they differ on the tied rows.\n\n" +
            "**Why it works.** The window defines the group and the order; the function decides tie semantics. Reusing one window lets Spark compute them in a single window operator over one shuffle.\n\n" +
            "**Common Gotchas.**\n" +
            "- `row_number` is **non-deterministic** on ties unless you add a tie-breaker to `orderBy` (e.g. `employee_id`); rank/dense_rank are deterministic in the *value* they assign but tied rows are still in arbitrary order.\n" +
            "- Choose by intent: 'Nth-highest distinct value' -> dense_rank; 'competition placing with gaps' -> rank; 'exactly one row per position / dedup' -> row_number.\n" +
            "- All require an `orderBy`; without it the ranking is undefined.\n\n" +
            "**Interview mindset.** Be ready to recite the 1,1,3 vs 1,1,2 vs 1,2,3 example instantly — it's the single most common window-function interview question.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, rank, dense_rank, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('department')                     # rank within each department\n" +
            "     .orderBy(col('salary').desc()))                # highest salary first\n" +
            "\n" +
            "result = (employees\n" +
            "    .withColumn('rank', rank().over(w))             # ties tie, then SKIP: 1,1,3\n" +
            "    .withColumn('dense_rank', dense_rank().over(w)) # ties tie, no gap:  1,1,2\n" +
            "    .withColumn('row_number', row_number().over(w)))# always unique:     1,2,3\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, rank, dense_rank, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('department')\n" +
            "     .orderBy(col('salary').desc()))\n" +
            "\n" +
            "result = (employees\n" +
            "    .withColumn('rank', rank().over(w))\n" +
            "    .withColumn('dense_rank', dense_rank().over(w))\n" +
            "    .withColumn('row_number', row_number().over(w)))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**: hash-shuffle by `department`, sort by salary descending within each partition, then a single window operator can emit all three ranking columns in one pass because they share the same window spec. The three functions compile to nearly identical plans; the difference is only in the tie-handling logic applied during the sequential scan (rank: repeat-then-skip; dense_rank: repeat-no-skip; row_number: strictly increment). Skewed departments are the performance risk, as always with partitioned windows.",
      sparkSql:
        "SELECT employee_id, name, department, salary,\n" +
        "       RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rank,\n" +
        "       DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank,\n" +
        "       ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_number\n" +
        "FROM employees;",
      recognizeRecall: [
        "**Spot it:** 'rank within each group', or any question probing rank vs dense_rank vs row_number.",
        "**Say it:** same `partitionBy(dept).orderBy(salary desc)` window; rank=1,1,3 / dense_rank=1,1,2 / row_number=1,2,3.",
        "**Trap:** row_number is arbitrary on ties (add a tie-breaker); pick the function by how ties must behave."
      ]
    },

    // ------------------------------------------------------------------ Q65
    {
      id: "top-three-paid-per-department",
      lc: 65,
      title: "Top 3 highest-paid employees in every department",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Top-N per group", transformation: "Wide (shuffle)", functions: "Window, row_number, rank, partitionBy" },
      description:
        "Given an `employees` DataFrame (`employee_id`, `name`, `department`, `salary`), return the **top 3 highest-paid employees within each department**. The choice of ranking function decides how salary ties near the cutoff are handled: `row_number` guarantees exactly 3 rows per department; `rank`/`dense_rank` may return more when salaries tie.",
      examples: [
        {
          input: "Eng: (Asha,150000),(Ravi,140000),(Meera,140000),(Dev,120000),(Nina,100000)",
          output: "row_number top-3 -> Asha, Ravi, Meera (exactly 3) ; rank/dense_rank <= 3 -> Asha, Ravi, Meera, Dev? (depends: 150k=1, 140k=2, 140k=2, 120k=... )",
          reasoning: "row_number numbers 1..5 uniquely and keeps <=3, so exactly Asha/Ravi/Meera. With rank, the two 140000 both get rank 2, and 120000 gets rank 4 — so `rank <= 3` still returns just those three here, but a three-way tie at the boundary would let rank return more than 3."
        }
      ],
      approaches: [
        {
          name: "row_number per department, filter <= 3",
          whenToUse: "Top-N per group where you want at most (usually exactly) N rows per group.",
          logic:
            "**What it asks.** The three highest-paid employees in each department.\n\n" +
            "**Key Idea.** Number employees within each department by salary descending, then keep the first three. `row_number()` gives a strict 1, 2, 3, ... so `row_number <= 3` yields **exactly** three rows per department (ties broken arbitrarily or by a tie-breaker column).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('department').orderBy(col('salary').desc())` (add `col('employee_id')` as a deterministic tie-breaker).\n" +
            "2. `withColumn('rn', row_number().over(w))`.\n" +
            "3. `.filter(col('rn') <= 3)`.\n" +
            "4. Optionally `.drop('rn')`.\n\n" +
            "**Why it works.** `row_number` is strictly monotonic within the partition, so the first three rows are the three highest salaries; the `<= 3` filter selects them.\n\n" +
            "**Common Gotchas.**\n" +
            "- If the business rule is 'include everyone tied at 3rd place', use `rank() <= 3` (or `dense_rank() <= 3`) instead — those can return **more** than 3 rows when salaries tie at the boundary.\n" +
            "- `row_number` needs a tie-breaker in `orderBy` to be deterministic when salaries tie; otherwise which of the tied employees is kept is arbitrary.\n" +
            "- This is the canonical **Top-N per group** pattern; interviewers often want you to name the row_number-vs-rank trade-off explicitly.\n\n" +
            "**Interview mindset.** State the trade-off up front: row_number = exactly N (arbitrary on ties), rank/dense_rank <= N = include ties (possibly more than N). Then pick per the requirement.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('department')                     # top-N within each department\n" +
            "     .orderBy(col('salary').desc(),                 # highest salary first\n" +
            "              col('employee_id')))                  # deterministic tie-breaker\n" +
            "\n" +
            "result = (employees\n" +
            "    .withColumn('rn', row_number().over(w))         # strict 1,2,3,... per dept\n" +
            "    .filter(col('rn') <= 3)                         # keep the top 3\n" +
            "    .drop('rn'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('department')\n" +
            "     .orderBy(col('salary').desc(),\n" +
            "              col('employee_id')))\n" +
            "\n" +
            "result = (employees\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .filter(col('rn') <= 3)\n" +
            "    .drop('rn'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**: hash-shuffle by `department`, sort by salary descending (plus tie-breaker) within each partition, assign `row_number`, then filter. Spark can push the `rn <= 3` limit into the window operator's per-partition processing so it stops emitting rows past 3 — a Top-N optimization that avoids fully materializing every ranked row. `row_number` gives a fixed N per group; switching to `rank`/`dense_rank` changes the semantics to 'include ties' and can emit more rows. Skewed departments remain the straggler risk.",
      sparkSql:
        "SELECT employee_id, name, department, salary\n" +
        "FROM (\n" +
        "  SELECT employee_id, name, department, salary,\n" +
        "         ROW_NUMBER() OVER (\n" +
        "           PARTITION BY department ORDER BY salary DESC, employee_id\n" +
        "         ) AS rn\n" +
        "  FROM employees\n" +
        ") t\n" +
        "WHERE rn <= 3;",
      recognizeRecall: [
        "**Spot it:** 'top 3 per department', 'top-N in each group', 'highest N per category'.",
        "**Say it:** `row_number().over(partitionBy(dept).orderBy(salary desc))` then filter `<= 3` for exactly 3.",
        "**Trap:** use rank/dense_rank `<= N` if ties at the cutoff must all be kept; give row_number a tie-breaker for determinism."
      ]
    },

    // ------------------------------------------------------------------ Q68
    {
      id: "dedup-keep-latest-customer",
      lc: 68,
      title: "Remove duplicate customer records keeping the latest",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Dedup keep-latest per key", transformation: "Wide (shuffle)", functions: "Window, row_number, partitionBy, desc" },
      description:
        "Given a `customers` DataFrame (`customer_id`, `name`, `email`, `updated_at`) that contains **duplicate rows per customer**, keep exactly **one** record per `customer_id` — the one with the **latest** `updated_at`. Unlike `dropDuplicates` (which keeps an arbitrary row), this must deterministically keep the most recent version.",
      examples: [
        {
          input: "customers: (1,'Asha','a@x',2026-01-01), (1,'Asha','asha@x',2026-06-01), (2,'Ravi','r@x',2026-03-01)",
          output: "kept: (1,'Asha','asha@x',2026-06-01), (2,'Ravi','r@x',2026-03-01)",
          reasoning: "Customer 1 has two rows; the 2026-06-01 record is later, so it wins. Customer 2 has one row, kept as-is."
        }
      ],
      approaches: [
        {
          name: "row_number over partitionBy(key).orderBy(updated_at desc), keep rn == 1",
          whenToUse: "Deduping to a SPECIFIC winner per key (latest, highest, most recent) — not an arbitrary one.",
          logic:
            "**What it asks.** One row per customer, specifically the most recently updated one.\n\n" +
            "**Key Idea.** Partition by `customer_id`, order each partition by `updated_at` **descending** so the latest record is first, number rows with `row_number()`, and keep `rn == 1`. `row_number` (not rank/dense_rank) guarantees a **single** winner even if two rows share the same timestamp.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy(col('updated_at').desc())`.\n" +
            "2. `withColumn('rn', row_number().over(w))` — the latest record gets rn = 1.\n" +
            "3. `.filter(col('rn') == 1)`.\n" +
            "4. `.drop('rn')` to return the original schema.\n\n" +
            "**Why it works.** Ordering descending by `updated_at` puts the newest record at position 1; `row_number` assigns exactly one row the value 1 per customer, so the filter keeps precisely the latest record.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `row_number`, **not** `rank`/`dense_rank`: if two rows tie on `updated_at`, rank/dense_rank would both get rank 1 and you'd keep two rows — defeating the dedup. row_number always picks one.\n" +
            "- `.desc()` is essential; ascending would keep the *oldest* record.\n" +
            "- `dropDuplicates(['customer_id'])` keeps an **arbitrary** row and cannot express 'latest' — that's exactly why the window is needed here.\n" +
            "- If ties on `updated_at` are possible and the winner must be deterministic, add a tie-breaker to `orderBy` (see Q70).\n\n" +
            "**Interview mindset.** The headline is 'keep a *specific* row -> row_number window; keep *any* row -> dropDuplicates'. Say that distinction explicitly.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                    # one group per customer\n" +
            "     .orderBy(col('updated_at').desc()))            # latest record first\n" +
            "\n" +
            "result = (customers\n" +
            "    .withColumn('rn', row_number().over(w))         # newest row gets rn = 1\n" +
            "    .filter(col('rn') == 1)                         # keep only the latest\n" +
            "    .drop('rn'))                                    # restore original columns\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy(col('updated_at').desc()))\n" +
            "\n" +
            "result = (customers\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .filter(col('rn') == 1)\n" +
            "    .drop('rn'))\n" +
            "result.show()",
        }
      ],
      sparkInternals:
        "**Wide**: hash-shuffle by `customer_id` so each customer's duplicates land together, sort each partition by `updated_at` descending, assign `row_number`, keep rn = 1. This is deterministic where `dropDuplicates` is not: `dropDuplicates` also shuffles by the key but keeps whichever row it encounters first, so it cannot honor 'latest'. `row_number` is required over rank/dense_rank because only it guarantees a single rn = 1 per key when timestamps tie. Skewed customers (many duplicate rows) are the straggler risk.",
      sparkSql:
        "SELECT customer_id, name, email, updated_at\n" +
        "FROM (\n" +
        "  SELECT customer_id, name, email, updated_at,\n" +
        "         ROW_NUMBER() OVER (\n" +
        "           PARTITION BY customer_id ORDER BY updated_at DESC\n" +
        "         ) AS rn\n" +
        "  FROM customers\n" +
        ") t\n" +
        "WHERE rn = 1;",
      recognizeRecall: [
        "**Spot it:** 'remove duplicates keeping the latest/most recent/newest', 'one current record per key'.",
        "**Say it:** `row_number().over(partitionBy(key).orderBy(col('updated_at').desc()))`, keep `rn == 1`.",
        "**Trap:** rank/dense_rank keep all ties (two rows); dropDuplicates keeps an arbitrary row — only row_number keeps the specific latest one."
      ]
    },

    // ------------------------------------------------------------------ Q69
    {
      id: "latest-record-per-customer",
      lc: 69,
      title: "Latest record per customer by timestamp",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Latest row per key", transformation: "Wide (shuffle)", functions: "Window, row_number, partitionBy, desc" },
      description:
        "Given an `events` DataFrame (`customer_id`, `event_type`, `event_ts`) with many rows per customer, return, **for every customer, the single record with the latest `event_ts`**. This is the 'most recent event per user' pattern — the same row_number-keep-first idiom as keeping the latest deduplicated record.",
      examples: [
        {
          input: "events: (1,'login',2026-05-01 09:00), (1,'purchase',2026-05-03 12:00), (2,'login',2026-05-02 08:00)",
          output: "kept: (1,'purchase',2026-05-03 12:00), (2,'login',2026-05-02 08:00)",
          reasoning: "Customer 1's latest event is the 2026-05-03 purchase; customer 2 has only one event, which is trivially the latest."
        }
      ],
      approaches: [
        {
          name: "row_number over partitionBy(customer_id).orderBy(event_ts desc)",
          whenToUse: "'Most recent / latest / current record per key' selection.",
          logic:
            "**What it asks.** For each customer, the one row whose timestamp is the newest.\n\n" +
            "**Key Idea.** Exactly the Q68 idiom: partition by `customer_id`, order by the timestamp descending, `row_number()`, keep `rn == 1`. The only difference is framing — here the goal is 'select the latest event' rather than 'deduplicate', but the mechanics are identical.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy(col('event_ts').desc())`.\n" +
            "2. `withColumn('rn', row_number().over(w))`.\n" +
            "3. `.filter(col('rn') == 1)`.\n" +
            "4. `.drop('rn')`.\n\n" +
            "**Why it works.** Descending order by timestamp places the most recent event at position 1; `row_number` marks exactly that row per customer.\n\n" +
            "**Common Gotchas.**\n" +
            "- Same tie caution as Q68: if two events share the max timestamp, `row_number` still keeps one (arbitrary unless you add a tie-breaker); rank/dense_rank would keep both.\n" +
            "- Ascending order returns the *earliest* (first) event instead — a common sign-flip bug.\n" +
            "- For a very wide table, select only the needed columns before the window to shrink the shuffle.\n\n" +
            "**Interview mindset.** Recognize 'latest per key' and 'dedup keep latest' as the *same* row_number pattern; mention that a `groupBy(key).agg(max(ts))` alone gives the timestamp but not the whole row, which is why the window is preferred.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                    # per customer\n" +
            "     .orderBy(col('event_ts').desc()))              # newest event first\n" +
            "\n" +
            "result = (events\n" +
            "    .withColumn('rn', row_number().over(w))         # latest event gets rn = 1\n" +
            "    .filter(col('rn') == 1)                         # keep the most recent row\n" +
            "    .drop('rn'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy(col('event_ts').desc()))\n" +
            "\n" +
            "result = (events\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .filter(col('rn') == 1)\n" +
            "    .drop('rn'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**: shuffle by `customer_id`, sort each partition by `event_ts` descending, `row_number`, keep rn = 1 — identical execution to Q68. A common alternative, `groupBy('customer_id').agg(max('event_ts'))`, is a cheaper aggregation but only yields the max timestamp, not the accompanying columns; recovering the full row then needs a join back. The window computes the whole latest row in one shuffle, which is why it's the idiomatic choice. Skew on active customers is the cost driver.",
      sparkSql:
        "SELECT customer_id, event_type, event_ts\n" +
        "FROM (\n" +
        "  SELECT customer_id, event_type, event_ts,\n" +
        "         ROW_NUMBER() OVER (\n" +
        "           PARTITION BY customer_id ORDER BY event_ts DESC\n" +
        "         ) AS rn\n" +
        "  FROM events\n" +
        ") t\n" +
        "WHERE rn = 1;",
      recognizeRecall: [
        "**Spot it:** 'latest/most recent record per customer', 'current status per user', 'last event per key'.",
        "**Say it:** `row_number().over(partitionBy(key).orderBy(col('event_ts').desc()))`, keep `rn == 1`.",
        "**Trap:** groupBy+max gives only the timestamp (needs a join for the row); ascending order returns the earliest by mistake."
      ]
    },

    // ------------------------------------------------------------------ Q70
    {
      id: "dedup-tiebreak-highest-transaction-id",
      lc: 70,
      title: "Dedup same customer+timestamp keeping the highest transaction id",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Dedup with tie-breaker", transformation: "Wide (shuffle)", functions: "Window, row_number, partitionBy, desc" },
      description:
        "Given a `transactions` DataFrame (`transaction_id`, `customer_id`, `txn_ts`, `amount`) where a customer can have **multiple rows sharing the same timestamp**, keep one row per `customer_id` — the latest by `txn_ts`, and among rows tied on that timestamp, the one with the **highest `transaction_id`**. This is dedup with a deterministic tie-breaker.",
      examples: [
        {
          input: "transactions: (101,1,2026-07-01 10:00,50), (105,1,2026-07-01 10:00,50), (102,2,2026-06-01 09:00,30)",
          output: "kept: (105,1,2026-07-01 10:00,50), (102,2,2026-06-01 09:00,30)",
          reasoning: "Customer 1 has two rows at the same timestamp; the tie-breaker keeps transaction_id 105 (higher) over 101. Customer 2 has a single row."
        }
      ],
      approaches: [
        {
          name: "row_number with a multi-key orderBy (timestamp desc, then id desc)",
          whenToUse: "Deduping where the ordering key can tie and you need a deterministic single winner.",
          logic:
            "**What it asks.** One row per customer: latest timestamp, breaking timestamp ties by the largest transaction id.\n\n" +
            "**Key Idea.** Extend the Q68 dedup window with a **second orderBy key**. Order by `txn_ts` descending first, then `transaction_id` descending as the tie-breaker, so among rows sharing the max timestamp the highest id sorts to position 1. `row_number()` then keeps exactly that row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `w = Window.partitionBy('customer_id').orderBy(col('txn_ts').desc(), col('transaction_id').desc())`.\n" +
            "2. `withColumn('rn', row_number().over(w))`.\n" +
            "3. `.filter(col('rn') == 1)`.\n" +
            "4. `.drop('rn')`.\n\n" +
            "**Why it works.** The multi-key `orderBy` makes the sort *total* within each customer: primary key `txn_ts` desc selects the latest, and the secondary key `transaction_id` desc resolves any timestamp tie deterministically, so exactly one row lands at rn = 1.\n\n" +
            "**Common Gotchas.**\n" +
            "- Without the tie-breaker, `row_number` would still keep one row but **arbitrarily** among the tied timestamps — non-deterministic across runs. The second orderBy key is what makes it reproducible.\n" +
            "- Order of keys matters: `txn_ts` must come first (it's the primary rule), `transaction_id` second.\n" +
            "- Each key gets its own `.desc()`; forgetting `.desc()` on the tie-breaker would keep the *lowest* id instead.\n" +
            "- rank/dense_rank still won't help — with a total ordering there are no ties left, but they could re-tie if the tie-breaker were omitted; row_number is the safe dedup choice.\n\n" +
            "**Interview mindset.** Stress that a deterministic dedup needs a **total order** in the window: add tie-breaker columns to `orderBy` until the ordering is unambiguous.",
          rcs:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')                    # one group per customer\n" +
            "     .orderBy(col('txn_ts').desc(),                 # latest timestamp first...\n" +
            "              col('transaction_id').desc()))        # ...tie-break on highest id\n" +
            "\n" +
            "result = (transactions\n" +
            "    .withColumn('rn', row_number().over(w))         # single deterministic winner\n" +
            "    .filter(col('rn') == 1)                         # keep it\n" +
            "    .drop('rn'))\n" +
            "result.show()",
          plain:
            "from pyspark.sql.window import Window\n" +
            "from pyspark.sql.functions import col, row_number\n" +
            "\n" +
            "w = (Window\n" +
            "     .partitionBy('customer_id')\n" +
            "     .orderBy(col('txn_ts').desc(),\n" +
            "              col('transaction_id').desc()))\n" +
            "\n" +
            "result = (transactions\n" +
            "    .withColumn('rn', row_number().over(w))\n" +
            "    .filter(col('rn') == 1)\n" +
            "    .drop('rn'))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "**Wide**: hash-shuffle by `customer_id`, then sort each partition by the **composite** key (`txn_ts` desc, `transaction_id` desc). The multi-column sort establishes a total order per partition, so `row_number` produces a deterministic rn = 1. Adding the tie-breaker changes only the sort comparator, not the shuffle cost. Without it, the sort is only partial and the surviving row is implementation-dependent — a classic source of non-reproducible pipeline output. Skewed customers with many same-timestamp rows are the straggler risk.",
      sparkSql:
        "SELECT transaction_id, customer_id, txn_ts, amount\n" +
        "FROM (\n" +
        "  SELECT transaction_id, customer_id, txn_ts, amount,\n" +
        "         ROW_NUMBER() OVER (\n" +
        "           PARTITION BY customer_id\n" +
        "           ORDER BY txn_ts DESC, transaction_id DESC\n" +
        "         ) AS rn\n" +
        "  FROM transactions\n" +
        ") t\n" +
        "WHERE rn = 1;",
      recognizeRecall: [
        "**Spot it:** 'duplicates on the same key+timestamp', 'break ties by highest id', 'deterministic dedup'.",
        "**Say it:** `row_number().over(partitionBy(key).orderBy(col('txn_ts').desc(), col('transaction_id').desc()))`, keep `rn == 1`.",
        "**Trap:** omit the tie-breaker and the survivor is non-deterministic; every orderBy key needs its own `.desc()`."
      ]
    }

  ]);
})();
