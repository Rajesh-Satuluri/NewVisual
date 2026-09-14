/*
 * PySpark Interview Lab — P2 polish: more self-join problems
 * (folded into "Joins").
 */
(function () {
  var CAT = "Joins";
  window.PYSPARK.register(CAT, [

    {
      id: "employees-earning-more-than-manager",
      lc: 308,
      title: "Employees earning more than their manager",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Self join", transformation: "Join", functions: "alias, join" },
      description:
        "Given `emp(id, name, salary, manager_id)`, list employees whose `salary` is **greater than their manager's** salary.",
      examples: [
        { input: "Joe(70k, mgr Sam), Sam(60k)", output: "Joe", reasoning: "Self-join emp to itself on manager_id = manager's id, then compare salaries." }
      ],
      approaches: [
        {
          name: "Self-join on manager_id = manager.id",
          whenToUse: "Comparing a row to another row in the same table via a key.",
          logic:
            "**What it asks.** Employees out-earning their own manager.\n\n" +
            "**Key Idea.** Alias the table twice — `e` (employee) and `m` (manager) — join `e.manager_id == m.id`, then keep `e.salary > m.salary`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `e = emp.alias('e')`, `m = emp.alias('m')`.\n" +
            "2. `e.join(m, col('e.manager_id') == col('m.id'))`.\n" +
            "3. Filter `col('e.salary') > col('m.salary')`; select employee cols.\n\n" +
            "**Why it works.** The two aliases let one table play both roles so rows can be compared across the manager link.\n\n" +
            "**Common Gotchas.**\n" +
            "- Alias both sides or column references are ambiguous.\n" +
            "- Employees with null manager_id drop out of an inner join (usually intended).\n\n" +
            "**Interview mindset.** Self-join = two aliases of one table on the relating key.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "e = emp.alias('e'); m = emp.alias('m')\n" +
            "res = (e.join(m, col('e.manager_id') == col('m.id'))\n" +
            "        .filter(col('e.salary') > col('m.salary'))\n" +
            "        .select(col('e.name').alias('employee')))",
          plain:
            "from pyspark.sql.functions import col\n" +
            "e = emp.alias('e'); m = emp.alias('m')\n" +
            "res = (e.join(m, col('e.manager_id')==col('m.id'))\n" +
            "        .filter(col('e.salary') > col('m.salary'))\n" +
            "        .select(col('e.name').alias('employee')))"
        }
      ],
      sparkInternals:
        "A self-join is an ordinary join with both inputs being the same relation under different aliases; it shuffles by the join key (manager_id / id) unless one alias is small enough to broadcast. Aliasing disambiguates otherwise-identical column names.",
      sparkSql:
        "SELECT e.name AS employee\nFROM emp e JOIN emp m ON e.manager_id = m.id\nWHERE e.salary > m.salary;",
      recognizeRecall: [
        "**Spot it:** \"compare a row to a related row in the same table\".",
        "**Say it:** self-join two aliases on the relating key, then filter.",
        "**Trap:** alias both sides; inner join drops null-manager rows."
      ]
    },

    {
      id: "customer-pairs-same-product",
      lc: 309,
      title: "Customer pairs who bought the same product",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Self join for pairs", transformation: "Join", functions: "alias, join, distinct" },
      description:
        "From `purchases(customer_id, product_id)`, find **distinct pairs of customers** who bought the **same product** (each unordered pair once, no self-pairs).",
      examples: [
        { input: "p1 bought by {A,B,C}", output: "(A,B),(A,C),(B,C)", reasoning: "Self-join on product_id, keep a.customer < b.customer to dedupe and drop self-pairs." }
      ],
      approaches: [
        {
          name: "Self-join on product, keep a < b",
          whenToUse: "Generating unordered pairs sharing an attribute.",
          logic:
            "**What it asks.** Unordered customer pairs linked by a shared product.\n\n" +
            "**Key Idea.** Self-join on `product_id`; the join produces all ordered pairs. Keep `a.customer_id < b.customer_id` to emit each **unordered** pair once and exclude self-pairs.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Alias purchases as `a` and `b`.\n" +
            "2. Join on `a.product_id == b.product_id`.\n" +
            "3. Filter `a.customer_id < b.customer_id`; `distinct` the pairs.\n\n" +
            "**Why it works.** The `<` condition breaks the symmetry (A,B)==(B,A) and removes (A,A).\n\n" +
            "**Common Gotchas.**\n" +
            "- Without `a < b` you get duplicates and self-pairs.\n" +
            "- A hot product (bought by millions) makes this join explode — cap or sample.\n\n" +
            "**Interview mindset.** 'Self-join + a<b' is the pair-generation idiom.",
          rcs:
            "from pyspark.sql.functions import col\n" +
            "a = purchases.alias('a'); b = purchases.alias('b')\n" +
            "pairs = (a.join(b, col('a.product_id') == col('b.product_id'))\n" +
            "          .filter(col('a.customer_id') < col('b.customer_id'))\n" +
            "          .select(col('a.customer_id').alias('c1'), col('b.customer_id').alias('c2'))\n" +
            "          .distinct())",
          plain:
            "from pyspark.sql.functions import col\n" +
            "a = purchases.alias('a'); b = purchases.alias('b')\n" +
            "pairs = (a.join(b, col('a.product_id')==col('b.product_id'))\n" +
            "          .filter(col('a.customer_id') < col('b.customer_id'))\n" +
            "          .select(col('a.customer_id').alias('c1'), col('b.customer_id').alias('c2')).distinct())",
        }
      ],
      sparkInternals:
        "Self-join on product_id shuffles by that key; all customers of a product land together and the join emits the cross-product within each product. The `a < b` predicate is applied post-join. Beware skew: a product with N buyers generates ~N²/2 pairs, so a hot key can blow up — filter popular products or sample.",
      sparkSql:
        "SELECT DISTINCT a.customer_id c1, b.customer_id c2\nFROM purchases a JOIN purchases b ON a.product_id = b.product_id\nWHERE a.customer_id < b.customer_id;",
      recognizeRecall: [
        "**Spot it:** \"pairs of X sharing a Y\" (co-purchase, co-occurrence).",
        "**Say it:** self-join on shared key, keep a.id < b.id, distinct.",
        "**Trap:** a<b removes dupes/self-pairs; hot keys explode (N²)."
      ]
    }

  ]);
})();
