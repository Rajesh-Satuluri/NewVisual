/*
 * PySpark Interview Lab — Self-Joins & Hierarchies (Joins)
 * Manager/employee chains, same-attribute pairs, and bounded hierarchy walks —
 * the join patterns candidates most often fumble. Registers into "Joins".
 */
(function () {
  var CAT = "Joins";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q270
    {
      id: "self-join-attach-manager-name",
      lc: 270,
      title: "Attach each employee's manager name via a self-join",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Self-join (manager chain)", transformation: "Wide (shuffle)", functions: "alias, join, col" },
      description:
        "Given `employees` (`employee_id`, `name`, `department_id`, `manager_id`, `salary`) where `manager_id` points at another row's `employee_id` (and is `null` for the CEO), return each employee's `name` next to their **manager's name**. The manager lives in the *same* table, so you join `employees` to itself. Because both sides carry identical column names, you must **alias** each side (`.alias('e')`, `.alias('m')`) and reference columns as `col('e.name')` / `col('m.name')`, otherwise every column reference is ambiguous. Use a **left** join so the CEO (no manager) is kept with a null manager.",
      examples: [
        {
          input: "employees: (1,'Ada',10,null,300), (2,'Ben',10,1,200), (3,'Cy',20,1,180)",
          output: "(Ada, null), (Ben, Ada), (Cy, Ada)",
          reasoning: "Ben.manager_id=1 matches employee_id=1 (Ada), so Ben's manager is Ada; Cy likewise. Ada has manager_id=null, so a left join keeps her with a null manager name."
        }
      ],
      approaches: [
        {
          name: "alias('e')/alias('m') + left join on e.manager_id == m.employee_id",
          whenToUse: "You need to relate each row to another row in the SAME table (employee -> its manager, order -> prior order, node -> parent).",
          logic:
            "**What it asks.** Put each employee's row beside the row of the person they report to, and print both names.\n\n" +
            "**Key Idea.** A self-join is just a join of a DataFrame with a second reference to itself. Give each reference a distinct **alias** so Spark can tell `e.name` (the employee) from `m.name` (the manager). The join key encodes the relationship: `col('e.manager_id') == col('m.employee_id')`. Keep it a **left** join anchored on `e` so employees with no manager (the CEO) are not dropped.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build two aliased handles onto the same DataFrame: `e = employees.alias('e')` and `m = employees.alias('m')`.\n" +
            "2. Join them on the relationship: `e.join(m, col('e.manager_id') == col('m.employee_id'), 'left')`.\n" +
            "3. Select the disambiguated columns: `col('e.name').alias('employee')`, `col('m.name').alias('manager')`.\n" +
            "4. (Optional) `col('m.name')` is null for the CEO; `coalesce(col('m.name'), lit('(none)'))` if you want a label.\n\n" +
            "**Why it works.** Aliasing gives the two logical copies separate names in the join's output schema, so `e.*` and `m.*` no longer collide. The equi-join condition wires each employee's `manager_id` to the matching employee's `employee_id`, which is exactly the reporting edge.\n\n" +
            "**Common Gotchas.**\n" +
            "- Without `.alias(...)` on BOTH sides, `col('name')` is ambiguous and Spark raises an AnalysisException.\n" +
            "- An inner join silently drops the CEO (their `manager_id` is null and matches nothing) — use `left`.\n" +
            "- Do not join on `employee_id == employee_id`; that maps everyone to themselves.\n" +
            "- `null == null` is not true in a join, so the CEO never self-matches — that is correct here.\n\n" +
            "**Interview mindset.** Say 'same table, two roles, so I alias each side and join manager_id to employee_id, left join to keep the top of the org'. Naming the alias step first signals you know the ambiguity trap.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "e = employees.alias('e')                                  # employee role\n" +
            "m = employees.alias('m')                                  # manager role (same table)\n" +
            "\n" +
            "result = (e\n" +
            "    .join(m, col('e.manager_id') == col('m.employee_id'),  # edge: my manager_id -> their employee_id\n" +
            "          'left')                                          # left keeps the CEO (null manager)\n" +
            "    .select(col('e.name').alias('employee'),               # disambiguate: e vs m\n" +
            "            col('m.name').alias('manager')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col\n" +
            "e = employees.alias('e'); m = employees.alias('m')\n" +
            "result = (e.join(m, col('e.manager_id') == col('m.employee_id'), 'left')\n" +
            "    .select(col('e.name').alias('employee'), col('m.name').alias('manager')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "A self-join reads the SAME DataFrame twice, so both sides start with identical column names; aliases (`.alias('e')`, `.alias('m')`) give them distinct namespaces so `col('e.name')` and `col('m.name')` are unambiguous. Mechanically this is a wide equi-join: Spark hash-partitions both copies by the join key (`manager_id` on one side, `employee_id` on the other) and shuffles them into co-located partitions. Because it is one physical table, a broadcast of the smaller side is often cheap — Spark may broadcast `m` when the employee table fits the broadcast threshold. The left join preserves rows on the `e` side whose `manager_id` finds no match (the CEO).",
      sparkSql:
        "SELECT e.name AS employee, m.name AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.employee_id;",
      recognizeRecall: [
        "**Spot it:** \"show each employee's manager\" — the manager is another row in the SAME table.",
        "**Say it:** alias both sides (e, m), left-join e.manager_id to m.employee_id, select col('e.name') and col('m.name').",
        "**Trap:** without aliases the column names collide and Spark throws ambiguous-reference; an inner join drops the CEO."
      ]
    },

    // ------------------------------------------------------------------ Q271
    {
      id: "self-join-earns-more-than-manager",
      lc: 271,
      title: "Employees who earn more than their manager",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Self-join + filter", transformation: "Wide (shuffle)", functions: "alias, join, col, filter" },
      description:
        "Using `employees` (`employee_id`, `name`, `department_id`, `manager_id`, `salary`), return the names of employees whose `salary` is strictly greater than their manager's `salary`. Self-join the table to itself on `col('e.manager_id') == col('m.employee_id')`, then keep rows where `col('e.salary') > col('m.salary')`. An **inner** join is right here — an employee with no manager cannot out-earn a manager who does not exist.",
      examples: [
        {
          input: "employees: (1,'Ada',10,null,300), (2,'Ben',10,1,320), (3,'Cy',10,1,180)",
          output: "(Ben)",
          reasoning: "Ben's manager is Ada (salary 300); Ben earns 320 > 300, so he qualifies. Cy earns 180 < 300, excluded. Ada has no manager, so she is not considered."
        }
      ],
      approaches: [
        {
          name: "inner self-join, then filter col('e.salary') > col('m.salary')",
          whenToUse: "You compare a numeric attribute of a row against the SAME attribute on a related row in the same table.",
          logic:
            "**What it asks.** Find each employee earning strictly more than the person they report to.\n\n" +
            "**Key Idea.** Bring the manager's row alongside the employee's row with a self-join, so both salaries sit in one row; then the comparison is a plain column-vs-column filter, `col('e.salary') > col('m.salary')`. Use an **inner** join because we only care about employees who actually have a manager to be compared with.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Alias the two roles: `e = employees.alias('e')`, `m = employees.alias('m')`.\n" +
            "2. Inner-join on the reporting edge: `e.join(m, col('e.manager_id') == col('m.employee_id'), 'inner')`.\n" +
            "3. Filter to the comparison: `.filter(col('e.salary') > col('m.salary'))`.\n" +
            "4. Select the employee's name (and optionally both salaries for context).\n\n" +
            "**Why it works.** After the join, each output row pairs one employee with exactly one manager, so `e.salary` and `m.salary` are two columns on the same row and can be compared directly. The inner join naturally excludes the CEO, who has nobody above to beat.\n\n" +
            "**Common Gotchas.**\n" +
            "- Alias both sides of the self-join or `col('salary')` is ambiguous.\n" +
            "- Use strict `>`, not `>=`, unless the prompt wants ties counted.\n" +
            "- A left join would surface the CEO with a null manager salary; `null` comparisons are false, so it would not break the filter, but inner is clearer intent.\n" +
            "- Compare `e.salary` to `m.salary`, not to `e`'s own — an easy transposition under pressure.\n\n" +
            "**Interview mindset.** Frame it as 'join the manager's row in, then it's a one-line filter'. Mention that the join direction (`e.manager_id -> m.employee_id`) decides which side is 'the manager'.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "e = employees.alias('e')                                  # the employee\n" +
            "m = employees.alias('m')                                  # their manager\n" +
            "\n" +
            "result = (e\n" +
            "    .join(m, col('e.manager_id') == col('m.employee_id'),  # attach manager row\n" +
            "          'inner')                                         # inner: must have a manager\n" +
            "    .filter(col('e.salary') > col('m.salary'))             # earns strictly more\n" +
            "    .select(col('e.name').alias('employee')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col\n" +
            "e = employees.alias('e'); m = employees.alias('m')\n" +
            "result = (e.join(m, col('e.manager_id') == col('m.employee_id'), 'inner')\n" +
            "    .filter(col('e.salary') > col('m.salary'))\n" +
            "    .select(col('e.name').alias('employee')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The engine reads `employees` twice under the aliases `e` and `m`; the aliases are the only reason `col('e.salary')` and `col('m.salary')` do not clash in the joined schema. This is a wide equi-join: both copies are shuffled and hash-partitioned by the join key so matching manager/employee rows land together. The `>` predicate is a post-join filter Spark pushes as high as it legally can, but it cannot be pushed below the shuffle because it references columns from both sides. If the table is small, Spark may broadcast `m`, replacing the shuffle with a broadcast hash join.",
      sparkSql:
        "SELECT e.name AS employee\nFROM employees e\nJOIN employees m ON e.manager_id = m.employee_id\nWHERE e.salary > m.salary;",
      recognizeRecall: [
        "**Spot it:** \"earns more than their manager\" — compare a row's value to a related row's value in the same table.",
        "**Say it:** inner self-join manager_id to employee_id, then filter col('e.salary') > col('m.salary').",
        "**Trap:** forgetting aliases makes salary ambiguous; comparing to the wrong side flips the result."
      ]
    },

    // ------------------------------------------------------------------ Q272
    {
      id: "self-join-same-department-pairs",
      lc: 272,
      title: "All employee pairs in the same department (no self-pairs, no duplicates)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Self-join (same-attribute pairs)", transformation: "Wide (shuffle)", functions: "alias, join, col" },
      description:
        "From `employees` (`employee_id`, `name`, `department_id`, `manager_id`, `salary`), produce every **unordered pair** of distinct employees who share a `department_id`. Self-join on equal department, but exclude self-pairs (an employee paired with themselves) and collapse the (A,B)/(B,A) duplicate by requiring `col('e1.employee_id') < col('e2.employee_id')`. That single strict-less-than condition kills both the self-pair (where ids are equal) and the mirror pair in one stroke.",
      examples: [
        {
          input: "employees: (1,'Ada',10,...), (2,'Ben',10,...), (3,'Cy',20,...)",
          output: "(Ada, Ben)",
          reasoning: "Ada and Ben are both in department 10, and 1 < 2, so the pair is emitted once. Cy is alone in department 20, so no pair. (Ben, Ada) is suppressed because 2 < 1 is false, and (Ada, Ada) is suppressed because 1 < 1 is false."
        }
      ],
      approaches: [
        {
          name: "self-join on department; condition e1.employee_id < e2.employee_id",
          whenToUse: "You need distinct unordered pairs of rows that share an attribute (co-workers, co-purchasers, friends-of-friends).",
          logic:
            "**What it asks.** List each unique two-person combination within a department, counting each pair once.\n\n" +
            "**Key Idea.** Join the table to itself where the shared attribute matches (`col('e1.department_id') == col('e2.department_id')`). A raw equality join gives every ordered pair including (x,x). Add `col('e1.employee_id') < col('e2.employee_id')` to the join condition: it drops self-pairs (equal ids fail `<`) and keeps only one of each mirror pair, turning ordered pairs into unordered ones.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Alias two copies: `e1 = employees.alias('e1')`, `e2 = employees.alias('e2')`.\n" +
            "2. Build the compound condition: same department AND `col('e1.employee_id') < col('e2.employee_id')`.\n" +
            "3. Inner-join on that condition.\n" +
            "4. Select the two names: `col('e1.name')`, `col('e2.name')` (and the department if useful).\n\n" +
            "**Why it works.** For any two distinct employees a and b in a department, exactly one of `a.id < b.id` or `b.id < a.id` is true, so each unordered pair survives once. When a == b the ids are equal and `<` is false, so no employee is paired with themselves.\n\n" +
            "**Common Gotchas.**\n" +
            "- Using `!=` instead of `<` removes self-pairs but STILL emits both (A,B) and (B,A) — you get duplicates.\n" +
            "- Put `<` inside the join condition (or a filter right after); either works, but it must apply to a stable, unique key like `employee_id`, not `name` (names can tie).\n" +
            "- Alias both sides — `department_id` and `name` exist on both.\n" +
            "- This join is quadratic within a department; a department of n people yields n*(n-1)/2 pairs, which can explode for large groups.\n\n" +
            "**Interview mindset.** Say 'self-join on the shared key, then `id1 < id2` to dedupe and drop self-pairs at once'. Flag the combinatorial blow-up for big groups — interviewers love the cost awareness.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "e1 = employees.alias('e1')                               # first of the pair\n" +
            "e2 = employees.alias('e2')                               # second of the pair\n" +
            "\n" +
            "cond = ((col('e1.department_id') == col('e2.department_id')) &  # same team\n" +
            "        (col('e1.employee_id') < col('e2.employee_id')))        # <: no self, no mirror\n" +
            "\n" +
            "result = (e1\n" +
            "    .join(e2, cond, 'inner')\n" +
            "    .select(col('e1.name').alias('emp_a'),\n" +
            "            col('e2.name').alias('emp_b')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col\n" +
            "e1 = employees.alias('e1'); e2 = employees.alias('e2')\n" +
            "cond = ((col('e1.department_id') == col('e2.department_id')) & (col('e1.employee_id') < col('e2.employee_id')))\n" +
            "result = (e1.join(e2, cond, 'inner')\n" +
            "    .select(col('e1.name').alias('emp_a'), col('e2.name').alias('emp_b')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The table is scanned twice as `e1` and `e2`; aliases keep `department_id`/`name` distinct across the two copies. Spark plans this as a wide equi-join on `department_id`, hash-partitioning both copies by department so all members of a department co-locate — which also means one huge department can skew a single partition. The `employee_id < employee_id` inequality is not an equi-join key, so Spark evaluates it as a join filter within each matched partition rather than as a partitioning key. Because output size grows with the square of a department's size, this self-join is a classic cardinality-explosion risk on skewed data.",
      sparkSql:
        "SELECT e1.name AS emp_a, e2.name AS emp_b\nFROM employees e1\nJOIN employees e2\n  ON e1.department_id = e2.department_id\n AND e1.employee_id < e2.employee_id;",
      recognizeRecall: [
        "**Spot it:** \"all pairs in the same X\" without duplicates — unordered same-attribute pairing.",
        "**Say it:** self-join on the shared column plus col('e1.id') < col('e2.id') to drop self-pairs and mirrors at once.",
        "**Trap:** using != still yields both (A,B) and (B,A); the strict < on a unique key is what dedupes."
      ]
    },

    // ------------------------------------------------------------------ Q273
    {
      id: "self-join-skip-level-manager",
      lc: 273,
      title: "Skip-level manager (employee -> manager -> manager's manager)",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Chained self-joins", transformation: "Wide (shuffle)", functions: "alias, join, col" },
      description:
        "For `employees` (`employee_id`, `name`, `department_id`, `manager_id`, `salary`), find each employee's **skip-level manager** — their manager's manager (two levels up). Chain two self-joins: employee `e` to their manager `m` (`e.manager_id = m.employee_id`), then `m` to the grand-manager `g` (`m.manager_id = g.employee_id`). Use **left** joins so employees near the top (whose manager is the CEO, or who are the CEO) are kept with a null skip-level manager.",
      examples: [
        {
          input: "employees: (1,'Ada',null), (2,'Ben',1), (3,'Cy',2)  [id,name,manager_id]",
          output: "(Cy, Ada), (Ben, null), (Ada, null)",
          reasoning: "Cy reports to Ben, Ben reports to Ada, so Cy's skip-level manager is Ada. Ben's manager is Ada whose manager is null, so Ben's skip-level is null. Ada is the CEO, so null."
        }
      ],
      approaches: [
        {
          name: "two chained left self-joins (e->m->g)",
          whenToUse: "You must walk a FIXED number of steps up a parent chain (grandparent, N-th ancestor for small known N).",
          logic:
            "**What it asks.** Reach two hops up the management chain and report the person there.\n\n" +
            "**Key Idea.** Each hop up the hierarchy is one self-join. To go two levels, chain two of them: join the employee to their manager, then join that manager to *their* manager. Three aliases (`e`, `m`, `g`) name the three roles; two `col('X.manager_id') == col('Y.employee_id')` conditions wire the chain. Left joins keep employees who run out of ancestors before two hops.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Alias three roles onto the same table: `e`, `m` (manager), `g` (grand-manager).\n" +
            "2. First hop: `e.join(m, col('e.manager_id') == col('m.employee_id'), 'left')`.\n" +
            "3. Second hop: `.join(g, col('m.manager_id') == col('g.employee_id'), 'left')`.\n" +
            "4. Select `col('e.name')` and `col('g.name').alias('skip_level_manager')`.\n\n" +
            "**Why it works.** The first join replaces the abstract `manager_id` with the manager's actual row, exposing that manager's OWN `manager_id`. The second join follows that pointer one more step, landing on the grand-manager. Composition of the two edges is the two-hop ancestor.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use LEFT joins throughout; an inner chain silently drops everyone within two levels of the top.\n" +
            "- The second condition must reference `m.manager_id` (the manager's manager), not `e.manager_id` again.\n" +
            "- All three copies need distinct aliases; `employee_id`, `manager_id`, `name` exist on each.\n" +
            "- This pattern only works for a KNOWN, small number of hops; arbitrary depth needs the iterative approach (see the level problem).\n\n" +
            "**Interview mindset.** Say 'each level up is one self-join, so N known levels = N chained joins; beyond that I'd iterate because Spark has no recursive CTE'. That sentence both solves this and sets up the hard version.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col\n" +
            "\n" +
            "e = employees.alias('e')                                  # employee\n" +
            "m = employees.alias('m')                                  # direct manager\n" +
            "g = employees.alias('g')                                  # manager's manager\n" +
            "\n" +
            "result = (e\n" +
            "    .join(m, col('e.manager_id') == col('m.employee_id'),  # hop 1: up to manager\n" +
            "          'left')\n" +
            "    .join(g, col('m.manager_id') == col('g.employee_id'),  # hop 2: up to grand-manager\n" +
            "          'left')\n" +
            "    .select(col('e.name').alias('employee'),\n" +
            "            col('g.name').alias('skip_level_manager')))\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col\n" +
            "e = employees.alias('e'); m = employees.alias('m'); g = employees.alias('g')\n" +
            "result = (e.join(m, col('e.manager_id') == col('m.employee_id'), 'left')\n" +
            "    .join(g, col('m.manager_id') == col('g.employee_id'), 'left')\n" +
            "    .select(col('e.name').alias('employee'), col('g.name').alias('skip_level_manager')))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "This reads `employees` three times under aliases `e`, `m`, `g`, each a wide equi-join in a chain; the aliases are what let `col('m.manager_id')` and `col('e.manager_id')` coexist unambiguously. Spark shuffles for each join stage, though it can often pipeline consecutive hash joins and, for a small employee table, broadcast the `m` and `g` copies to avoid the shuffles entirely. Each chained join is a fixed, statically-planned step — this is why fixed-depth ancestry is cheap but arbitrary depth is not: Spark has no native recursive CTE, so you cannot express 'join until stable' in one plan. For unknown depth you must instead iterate joins in driver code, materializing between rounds.",
      sparkSql:
        "SELECT e.name AS employee, g.name AS skip_level_manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.employee_id\nLEFT JOIN employees g ON m.manager_id = g.employee_id;",
      recognizeRecall: [
        "**Spot it:** \"manager's manager\" / \"two levels up\" — a fixed number of hops up a parent chain.",
        "**Say it:** chain one left self-join per level (e->m->g), wiring each hop's manager_id to the next employee_id.",
        "**Trap:** reusing e.manager_id in the second join, or using inner joins that drop everyone near the top."
      ]
    },

    // ------------------------------------------------------------------ Q274
    {
      id: "self-join-count-direct-reports",
      lc: 274,
      title: "Count direct reports per manager and flag managers vs individual contributors",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Self-join / groupBy on manager_id", transformation: "Wide (shuffle)", functions: "groupBy, count, join, when, col" },
      description:
        "From `employees` (`employee_id`, `name`, `department_id`, `manager_id`, `salary`), compute how many **direct reports** each employee has, and flag whether they are a `manager` (>=1 report) or an `individual_contributor` (0 reports). The report count is a `groupBy('manager_id').count()`; join it back to the employee list (left) so people with zero reports show up as 0, then derive the flag with `when(...)`.",
      examples: [
        {
          input: "employees: (1,'Ada',null), (2,'Ben',1), (3,'Cy',1), (4,'Di',2)  [id,name,manager_id]",
          output: "Ada: 2 (manager), Ben: 1 (manager), Cy: 0 (IC), Di: 0 (IC)",
          reasoning: "manager_id column has 1 twice (Ben, Cy) and 2 once (Di), so Ada has 2 reports, Ben has 1. Cy and Di appear as nobody's manager_id, so a left join gives them count 0 -> individual_contributor."
        }
      ],
      approaches: [
        {
          name: "groupBy('manager_id').count(), left-join back, when() to flag",
          whenToUse: "You need per-parent child counts and must retain parents (or all rows) that have zero children.",
          logic:
            "**What it asks.** For every employee, how many people report directly to them, and are they therefore a manager.\n\n" +
            "**Key Idea.** The number of direct reports of person X is simply how many rows have `manager_id == X`. So `groupBy('manager_id').count()` already gives the answer keyed by manager. The catch is that employees with NO reports never appear as a `manager_id`, so you left-join the counts back onto the full employee list and `coalesce` the missing count to 0. A `when(count >= 1, 'manager').otherwise('individual_contributor')` produces the flag.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Count reports per manager: `counts = employees.groupBy('manager_id').count().withColumnRenamed('count', 'direct_reports')`.\n" +
            "2. Left-join back onto everyone: `employees.alias('e').join(counts.alias('c'), col('e.employee_id') == col('c.manager_id'), 'left')`.\n" +
            "3. Fill nulls: `coalesce(col('c.direct_reports'), lit(0))`.\n" +
            "4. Flag: `when(col('direct_reports') >= 1, lit('manager')).otherwise(lit('individual_contributor'))`.\n\n" +
            "**Why it works.** Grouping by `manager_id` buckets every employee under the person they report to; the bucket size IS the direct-report count. Joining that aggregate back to the employee list re-attaches the count to each potential manager, and the left join plus coalesce restores the zeros the groupBy could not have produced.\n\n" +
            "**Common Gotchas.**\n" +
            "- `groupBy('manager_id')` will include a bucket for `manager_id = null` (the CEO's manager) — that counts the CEO's peers-with-no-manager, not anyone's reports; drop or ignore that null key.\n" +
            "- A plain groupBy alone omits zero-report employees entirely; the left-join-back is what includes them.\n" +
            "- Coalesce the count to 0 before comparing, or the flag on non-managers becomes null.\n" +
            "- Rename `count` promptly; the default column name collides easily.\n\n" +
            "**Interview mindset.** Say 'direct reports = count of rows grouped by manager_id, then left-join back so ICs show as 0'. Mention the null-manager_id bucket — spotting it shows you thought about the CEO edge.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col, when, coalesce, lit\n" +
            "\n" +
            "counts = (employees\n" +
            "    .groupBy('manager_id')                                # bucket by who they report to\n" +
            "    .count()                                              # bucket size = # direct reports\n" +
            "    .withColumnRenamed('count', 'direct_reports')\n" +
            "    .alias('c'))\n" +
            "\n" +
            "e = employees.alias('e')\n" +
            "result = (e\n" +
            "    .join(counts, col('e.employee_id') == col('c.manager_id'),  # attach count to the manager\n" +
            "          'left')                                          # left: keep zero-report employees\n" +
            "    .select(col('e.name'),\n" +
            "            coalesce(col('c.direct_reports'), lit(0)).alias('direct_reports'))\n" +
            "    .withColumn('role',\n" +
            "        when(col('direct_reports') >= 1, lit('manager'))   # >=1 report -> manager\n" +
            "         .otherwise(lit('individual_contributor'))))\n" +
            "result.show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col, when, coalesce, lit\n" +
            "counts = (employees.groupBy('manager_id').count().withColumnRenamed('count', 'direct_reports').alias('c'))\n" +
            "e = employees.alias('e')\n" +
            "result = (e.join(counts, col('e.employee_id') == col('c.manager_id'), 'left')\n" +
            "    .select(col('e.name'), coalesce(col('c.direct_reports'), lit(0)).alias('direct_reports'))\n" +
            "    .withColumn('role', when(col('direct_reports') >= 1, lit('manager')).otherwise(lit('individual_contributor'))))\n" +
            "result.show()"
        }
      ],
      sparkInternals:
        "The `groupBy('manager_id').count()` is a wide transformation: Spark partial-counts within each partition, then shuffles by `manager_id` to combine, which is far cheaper than a raw self-join because only the aggregate crosses the network. Joining the small counts table back to `employees` is another equi-join, but since `counts` is typically tiny Spark will usually broadcast it, avoiding a second shuffle. Aliasing (`e`, `c`) keeps `manager_id`/`employee_id` unambiguous across the two sides. Note the aggregate emits one bucket for `manager_id = null`; that null-keyed row is a groupBy artifact, not a real report count, so it is filtered or ignored downstream.",
      sparkSql:
        "SELECT e.name,\n       COALESCE(c.direct_reports, 0) AS direct_reports,\n       CASE WHEN COALESCE(c.direct_reports, 0) >= 1\n            THEN 'manager' ELSE 'individual_contributor' END AS role\nFROM employees e\nLEFT JOIN (\n    SELECT manager_id, COUNT(*) AS direct_reports\n    FROM employees GROUP BY manager_id\n) c ON e.employee_id = c.manager_id;",
      recognizeRecall: [
        "**Spot it:** \"how many report to each\" / \"managers vs ICs\" — per-parent child counts including zeros.",
        "**Say it:** groupBy('manager_id').count(), left-join back to all employees, coalesce to 0, when() to flag.",
        "**Trap:** groupBy alone drops zero-report people; and it emits a null-manager_id bucket for the CEO."
      ]
    },

    // ------------------------------------------------------------------ Q275
    {
      id: "iterative-join-hierarchy-level",
      lc: 275,
      title: "Compute each employee's level in the hierarchy via bounded iterative joins",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Iterative self-joins (bounded recursion)", transformation: "Wide (shuffle) x depth", functions: "alias, join, col, union, when" },
      description:
        "For `employees` (`employee_id`, `name`, `department_id`, `manager_id`, `salary`), compute each employee's **level** in the org, with the CEO (`manager_id is null`) at level 1, their direct reports at level 2, and so on. Spark has **no native recursive CTE**, so you cannot walk arbitrary depth in one query. Instead you either (a) chain a **bounded** number of self-joins if you know the max depth, or (b) run an **iterative** loop in driver code: seed the roots at level 1, then repeatedly join the not-yet-leveled employees to the already-leveled set (`col('e.manager_id') == col('leveled.employee_id')`), assigning `manager_level + 1`, until no new rows are assigned (iterate-until-stable).",
      examples: [
        {
          input: "employees: (1,'Ada',null), (2,'Ben',1), (3,'Cy',2)  [id,name,manager_id]",
          output: "Ada: 1, Ben: 2, Cy: 3",
          reasoning: "Ada has null manager_id -> level 1 (root). Ben reports to Ada (level 1) -> level 2. Cy reports to Ben (level 2) -> level 3. The loop stops after the round that levels Cy, because the next round assigns nobody new."
        }
      ],
      approaches: [
        {
          name: "iterate-until-stable: seed roots, join unleveled to leveled, +1 each round",
          whenToUse: "Arbitrary/unknown-depth hierarchy walks (org level, bill-of-materials depth, comment-thread depth) where a single fixed chain of joins will not do.",
          logic:
            "**What it asks.** Assign every employee a depth number counting from the CEO, over a chain of unknown length.\n\n" +
            "**Key Idea.** Recursion becomes ITERATION. Spark has no recursive CTE, so you simulate it: start with the roots (`manager_id is null`) at level 1, then in a loop join everyone still without a level to the set already leveled — if my manager has level k, I get level k+1. Each iteration peels off exactly one more layer of the tree. Stop when an iteration adds zero rows (the tree is exhausted), or cap the loop at a known maximum depth as a bounded self-join chain.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Seed: `leveled = employees.filter(col('manager_id').isNull()).withColumn('level', lit(1))`.\n" +
            "2. Loop: alias the leveled set as `p` (parents) and the full table as `e`.\n" +
            "3. Join unleveled employees to `p` on `col('e.manager_id') == col('p.employee_id')`, take `col('p.level') + 1` as their level.\n" +
            "4. `union` the newly-leveled rows into `leveled`; `cache()`/`checkpoint()` to break the growing lineage.\n" +
            "5. Repeat until the round produces no new rows (or until a fixed iteration cap for the bounded variant).\n\n" +
            "**Why it works.** Level is defined recursively (level = parent's level + 1), and each join round resolves exactly the employees whose parent became known in the previous round. Because every non-root has a unique path to a root, the layers are discovered one per iteration, so the number of rounds equals the tree's height.\n\n" +
            "**Common Gotchas.**\n" +
            "- There is NO recursive CTE in Spark SQL — do not write `WITH RECURSIVE`; it will not run. Iterate in driver code instead.\n" +
            "- Iterative joins pile up query lineage; `cache()` or `checkpoint()` each round or the plan grows until it stalls the driver.\n" +
            "- Always have a termination condition (no-new-rows OR a max-depth cap); a cycle in `manager_id` would otherwise loop forever.\n" +
            "- Re-alias each round; reusing stale aliases across iterations reintroduces ambiguous columns.\n" +
            "- Seed on `manager_id IS NULL` — an equality to null would match nothing.\n\n" +
            "**Interview mindset.** The headline sentence is 'Spark has no recursive CTE, so I iterate self-joins until the level set stops growing, checkpointing to cut lineage'. If they accept a known max depth, offer the simpler bounded chain of N joins as a cheaper alternative.",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col, lit\n" +
            "\n" +
            "# seed: roots (CEO) at level 1\n" +
            "leveled = (employees\n" +
            "    .filter(col('manager_id').isNull())                   # roots have null manager\n" +
            "    .select('employee_id', 'name', 'manager_id')\n" +
            "    .withColumn('level', lit(1)))\n" +
            "\n" +
            "remaining = employees.filter(col('manager_id').isNotNull())\n" +
            "\n" +
            "while True:\n" +
            "    p = leveled.alias('p')                                # already-leveled parents\n" +
            "    e = remaining.alias('e')                              # not-yet-leveled\n" +
            "    newly = (e\n" +
            "        .join(p, col('e.manager_id') == col('p.employee_id'),  # my parent is leveled\n" +
            "              'inner')\n" +
            "        .select(col('e.employee_id'), col('e.name'), col('e.manager_id'),\n" +
            "                (col('p.level') + 1).alias('level')))     # my level = parent + 1\n" +
            "    if newly.head(1) == []:                               # no new rows -> done\n" +
            "        break\n" +
            "    leveled = leveled.unionByName(newly).checkpoint()     # grow set, cut lineage\n" +
            "    done_ids = [r['employee_id'] for r in newly.select('employee_id').collect()]\n" +
            "    remaining = remaining.filter(~col('employee_id').isin(done_ids))\n" +
            "\n" +
            "leveled.select('name', 'level').show()",
          plain:
            "from pyspark.sql import functions as F\n" +
            "from pyspark.sql.functions import col, lit\n" +
            "leveled = (employees.filter(col('manager_id').isNull()).select('employee_id', 'name', 'manager_id').withColumn('level', lit(1)))\n" +
            "remaining = employees.filter(col('manager_id').isNotNull())\n" +
            "while True:\n" +
            "    p = leveled.alias('p'); e = remaining.alias('e')\n" +
            "    newly = (e.join(p, col('e.manager_id') == col('p.employee_id'), 'inner')\n" +
            "        .select(col('e.employee_id'), col('e.name'), col('e.manager_id'), (col('p.level') + 1).alias('level')))\n" +
            "    if newly.head(1) == []:\n" +
            "        break\n" +
            "    leveled = leveled.unionByName(newly).checkpoint()\n" +
            "    done_ids = [r['employee_id'] for r in newly.select('employee_id').collect()]\n" +
            "    remaining = remaining.filter(~col('employee_id').isin(done_ids))\n" +
            "leveled.select('name', 'level').show()"
        }
      ],
      sparkInternals:
        "Each loop iteration is one wide equi-join between the not-yet-leveled employees and the already-leveled set, hash-partitioned by the parent key — aliases `e`/`p` keep the shared columns distinct across the two references to the same underlying table. Crucially, Spark has NO recursive CTE, so depth cannot be expressed in a single plan; the driver-side loop is how arbitrary depth is walked, one tree layer per round. Because each round builds on the previous DataFrame, query lineage grows linearly with depth and will eventually blow up planning/driver memory — `checkpoint()` (or `cache()` plus an action) truncates that lineage by materializing the intermediate result. The loop must terminate on a no-new-rows condition or a max-depth cap; a cycle in `manager_id` would otherwise iterate forever. When the maximum depth is known and small, the cheaper equivalent is a fixed chain of N self-joins with no loop.",
      sparkSql:
        "-- Spark SQL has NO recursive CTE (no WITH RECURSIVE); emulate with a bounded chain\n-- or an iterative loop in driver code. Fixed-depth (up to 3 levels) example:\nSELECT e.name,\n       CASE WHEN e.manager_id IS NULL THEN 1\n            WHEN m.manager_id IS NULL THEN 2\n            ELSE 3 END AS level\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.employee_id;",
      recognizeRecall: [
        "**Spot it:** \"depth / level in a hierarchy\" of unknown height — the tell that recursion is needed.",
        "**Say it:** Spark has no recursive CTE, so seed the roots and iterate self-joins (parent level + 1) until no new rows, checkpointing each round.",
        "**Trap:** reaching for WITH RECURSIVE (unsupported), unbounded loops on cyclic data, and lineage growth without checkpoint()."
      ]
    }

  ]);
})();
