/*
 * data/rosetta.js — the "Rosetta Stone" dataset (M5.3): one common data task,
 * expressed in every dialect side by side. Powers both the cross-stack compare
 * view and the per-stack quick-reference (same data, filtered to one column).
 *
 * Conventions used in the snippets:
 *   SQL     — table orders(id, customer, region, amount, ts); ANSI + notes.
 *   pandas  — a DataFrame `df` (import pandas as pd).
 *   spark   — a DataFrame `df`; assumes `from pyspark.sql import functions as F, Window`.
 *   python  — plain rows: a list[dict] called `rows` (shown when it maps cleanly).
 *
 * window.ROSETTA.tasks: [{ id, group, task, note, code:{sql,pandas,spark,python?} }]
 */
window.ROSETTA = {
  groups: ["Filtering", "Shaping", "Aggregation", "Joins", "Windows", "Columns", "Text & Dates"],
  tasks: [
    // -------------------------------------------------- Filtering
    {
      id: "filter-rows", group: "Filtering", task: "Filter rows by a condition",
      note: "Keep rows where amount > 100.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE amount > 100;",
        pandas: "df[df['amount'] > 100]",
        spark: "df.filter(F.col('amount') > 100)",
        python: "[r for r in rows if r['amount'] > 100]"
      }
    },
    {
      id: "filter-multi", group: "Filtering", task: "Multiple conditions (AND / OR)",
      note: "region is 'US' AND amount > 100. Note pandas/Spark need & and parentheses.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE region = 'US' AND amount > 100;",
        pandas: "df[(df['region'] == 'US') & (df['amount'] > 100)]",
        spark: "df.filter((F.col('region') == 'US') & (F.col('amount') > 100))",
        python: "[r for r in rows if r['region'] == 'US' and r['amount'] > 100]"
      }
    },
    {
      id: "filter-in", group: "Filtering", task: "Membership (IN a set)",
      note: "region is one of a fixed list.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE region IN ('US', 'EU');",
        pandas: "df[df['region'].isin(['US', 'EU'])]",
        spark: "df.filter(F.col('region').isin('US', 'EU'))"
      }
    },
    // -------------------------------------------------- Shaping
    {
      id: "select-cols", group: "Shaping", task: "Select specific columns",
      note: "Project just customer and amount.",
      code: {
        sql: "SELECT customer, amount\nFROM orders;",
        pandas: "df[['customer', 'amount']]",
        spark: "df.select('customer', 'amount')",
        python: "[{'customer': r['customer'], 'amount': r['amount']} for r in rows]"
      }
    },
    {
      id: "sort", group: "Shaping", task: "Sort / order by",
      note: "Highest amount first.",
      code: {
        sql: "SELECT *\nFROM orders\nORDER BY amount DESC;",
        pandas: "df.sort_values('amount', ascending=False)",
        spark: "df.orderBy(F.col('amount').desc())",
        python: "sorted(rows, key=lambda r: r['amount'], reverse=True)"
      }
    },
    {
      id: "top-n", group: "Shaping", task: "Top-N rows",
      note: "The 5 largest by amount.",
      code: {
        sql: "SELECT *\nFROM orders\nORDER BY amount DESC\nLIMIT 5;",
        pandas: "df.nlargest(5, 'amount')",
        spark: "df.orderBy(F.col('amount').desc()).limit(5)",
        python: "sorted(rows, key=lambda r: r['amount'], reverse=True)[:5]"
      }
    },
    {
      id: "distinct", group: "Shaping", task: "Distinct values",
      note: "Unique regions.",
      code: {
        sql: "SELECT DISTINCT region\nFROM orders;",
        pandas: "df['region'].drop_duplicates()",
        spark: "df.select('region').distinct()",
        python: "set(r['region'] for r in rows)"
      }
    },
    // -------------------------------------------------- Aggregation
    {
      id: "groupby-sum", group: "Aggregation", task: "Group by + aggregate",
      note: "Total amount per region.",
      code: {
        sql: "SELECT region, SUM(amount) AS total\nFROM orders\nGROUP BY region;",
        pandas: "df.groupby('region')['amount'].sum()",
        spark: "df.groupBy('region').agg(F.sum('amount').alias('total'))"
      }
    },
    {
      id: "count-per-group", group: "Aggregation", task: "Count rows per group",
      note: "How many orders per region.",
      code: {
        sql: "SELECT region, COUNT(*) AS n\nFROM orders\nGROUP BY region;",
        pandas: "df.groupby('region').size()",
        spark: "df.groupBy('region').count()"
      }
    },
    {
      id: "having", group: "Aggregation", task: "Filter groups (HAVING)",
      note: "Only regions whose total exceeds 1000.",
      code: {
        sql: "SELECT region, SUM(amount) AS total\nFROM orders\nGROUP BY region\nHAVING SUM(amount) > 1000;",
        pandas: "g = df.groupby('region')['amount'].sum()\ng[g > 1000]",
        spark: "(df.groupBy('region')\n   .agg(F.sum('amount').alias('total'))\n   .filter(F.col('total') > 1000))"
      }
    },
    {
      id: "distinct-count", group: "Aggregation", task: "Count distinct",
      note: "Number of unique customers.",
      code: {
        sql: "SELECT COUNT(DISTINCT customer) AS n\nFROM orders;",
        pandas: "df['customer'].nunique()",
        spark: "df.select(F.countDistinct('customer')).show()"
      }
    },
    // -------------------------------------------------- Joins
    {
      id: "inner-join", group: "Joins", task: "Inner join two tables",
      note: "Match orders to customers on the customer key.",
      code: {
        sql: "SELECT *\nFROM orders o\nJOIN customers c ON o.customer = c.id;",
        pandas: "orders.merge(customers, left_on='customer', right_on='id')",
        spark: "orders.join(customers, orders.customer == customers.id, 'inner')"
      }
    },
    {
      id: "left-join", group: "Joins", task: "Left join (keep all left rows)",
      note: "All orders, customer info where it matches.",
      code: {
        sql: "SELECT *\nFROM orders o\nLEFT JOIN customers c ON o.customer = c.id;",
        pandas: "orders.merge(customers, left_on='customer', right_on='id', how='left')",
        spark: "orders.join(customers, orders.customer == customers.id, 'left')"
      }
    },
    // -------------------------------------------------- Windows
    {
      id: "row-number", group: "Windows", task: "Rank within a group (row_number)",
      note: "Number rows per region, biggest amount first.",
      code: {
        sql: "SELECT *,\n  ROW_NUMBER() OVER (\n    PARTITION BY region ORDER BY amount DESC) AS rn\nFROM orders;",
        pandas: "df['rn'] = (df.sort_values('amount', ascending=False)\n          .groupby('region').cumcount() + 1)",
        spark: "w = Window.partitionBy('region').orderBy(F.col('amount').desc())\ndf.withColumn('rn', F.row_number().over(w))"
      }
    },
    {
      id: "running-total", group: "Windows", task: "Running total",
      note: "Cumulative amount per region over time.",
      code: {
        sql: "SELECT *,\n  SUM(amount) OVER (\n    PARTITION BY region ORDER BY ts) AS run_total\nFROM orders;",
        pandas: "df['run_total'] = (df.sort_values('ts')\n          .groupby('region')['amount'].cumsum())",
        spark: "w = Window.partitionBy('region').orderBy('ts')\ndf.withColumn('run_total', F.sum('amount').over(w))"
      }
    },
    // -------------------------------------------------- Columns
    {
      id: "add-col", group: "Columns", task: "Add a computed column",
      note: "fee = 10% of amount.",
      code: {
        sql: "SELECT *, amount * 0.1 AS fee\nFROM orders;",
        pandas: "df.assign(fee=df['amount'] * 0.1)",
        spark: "df.withColumn('fee', F.col('amount') * 0.1)"
      }
    },
    {
      id: "case-when", group: "Columns", task: "Conditional column (CASE WHEN)",
      note: "Label each order big/small.",
      code: {
        sql: "SELECT *,\n  CASE WHEN amount > 100 THEN 'big'\n       ELSE 'small' END AS size\nFROM orders;",
        pandas: "import numpy as np\ndf['size'] = np.where(df['amount'] > 100, 'big', 'small')",
        spark: "df.withColumn('size',\n  F.when(F.col('amount') > 100, 'big').otherwise('small'))"
      }
    },
    {
      id: "rename", group: "Columns", task: "Rename a column",
      note: "amount → total.",
      code: {
        sql: "SELECT amount AS total\nFROM orders;",
        pandas: "df.rename(columns={'amount': 'total'})",
        spark: "df.withColumnRenamed('amount', 'total')"
      }
    },
    {
      id: "fillna", group: "Columns", task: "Replace nulls",
      note: "Missing amount → 0.",
      code: {
        sql: "SELECT COALESCE(amount, 0) AS amount\nFROM orders;",
        pandas: "df['amount'].fillna(0)",
        spark: "df.fillna({'amount': 0})"
      }
    },
    // -------------------------------------------------- Text & Dates
    {
      id: "str-contains", group: "Text & Dates", task: "String contains / LIKE",
      note: "customer contains 'acme'.",
      code: {
        sql: "SELECT *\nFROM orders\nWHERE customer LIKE '%acme%';",
        pandas: "df[df['customer'].str.contains('acme', na=False)]",
        spark: "df.filter(F.col('customer').contains('acme'))"
      }
    },
    {
      id: "date-part", group: "Text & Dates", task: "Extract a date part",
      note: "Year from the timestamp.",
      code: {
        sql: "SELECT EXTRACT(YEAR FROM ts) AS yr\nFROM orders;  -- or YEAR(ts)",
        pandas: "df['ts'].dt.year",
        spark: "df.withColumn('yr', F.year('ts'))"
      }
    },
    {
      id: "union", group: "Text & Dates", task: "Stack two tables (UNION)",
      note: "Append rows of b onto a (same columns).",
      code: {
        sql: "SELECT * FROM a\nUNION ALL\nSELECT * FROM b;",
        pandas: "pd.concat([a, b], ignore_index=True)",
        spark: "a.unionByName(b)"
      }
    }
  ]
};
