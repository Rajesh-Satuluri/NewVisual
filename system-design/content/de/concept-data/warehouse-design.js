export default {
  id: "warehouse-design",
  title: "Data warehouse design (star & snowflake)",
  icon: "🏢",
  chapter: 3,
  group: "Foundations",
  summary: "A warehouse models analytics as facts (measurable events like a sale) surrounded by dimensions (the who/what/when/where). The star schema — one fact table joined to denormalized dimension tables — is the default because it's simple and fast for the big aggregate queries BI runs.",
  widget: "de-star-schema",
  widgetIntro: "Dimensional modeling splits the world into **facts** and **dimensions**. A fact table holds the numeric measures of business events (quantity, amount) plus foreign keys; dimension tables hold the descriptive context (product, customer, date, store). Lay them out and the fact sits in the centre with dimensions radiating out — a **star**.\n\nRun a query and watch it join the fact to the dimensions it needs. Toggle to **snowflake** to see a dimension normalized into sub-tables — fewer redundant values, but more joins. The star's single-join-hop simplicity is why it dominates analytics.",
  sections: [
    {
      title: "Facts and dimensions",
      body: "The core idea of dimensional modeling (Kimball) is to separate the *measurements* of a business process from the *context* around them.",
      bullets: [
        "**Fact table:** one row per event (an order line, a page view). Holds numeric **measures** + foreign keys to dimensions. Tall and narrow, grows forever.",
        "**Dimension tables:** the descriptive context — product, customer, date, location. Short and wide, with human-readable attributes you filter and group by.",
      ],
      rules: ["Facts = the numbers you aggregate; dimensions = the things you slice and group by."],
    },
    {
      title: "The star schema",
      body: "Put the fact table in the centre and join each dimension directly to it with a foreign key. Dimensions are **denormalized** — a product dimension carries category and brand as plain columns rather than linking out to separate tables. Queries are a single join hop from fact to each dimension, which is simple to write and fast to run.",
      flow: ["date_dim", "→ fact_sales ←", "product_dim", "customer_dim", "store_dim"],
      body2: "A typical query: `SELECT SUM(amount) FROM fact_sales JOIN date_dim … JOIN product_dim … GROUP BY month, category`. The optimizer loves this shape (a 'star join').",
    },
    {
      title: "The snowflake schema",
      body: "A snowflake normalizes dimensions into sub-dimensions: product → category → department become separate tables instead of repeated columns. It saves storage and removes update anomalies, but every extra level is another join, so queries get more complex and often slower.",
      table: {
        head: ["", "Star", "Snowflake"],
        rows: [
          ["Dimensions", "Denormalized (flat)", "Normalized (sub-tables)"],
          ["Joins per query", "Few (1 hop)", "More (multi-hop)"],
          ["Storage", "Some redundancy", "Less redundancy"],
          ["Query speed / simplicity", "Faster, simpler", "Slower, more complex"],
        ],
      },
      body2: "Default to a star; snowflake only the dimensions where normalization genuinely pays (very large, highly repetitive dimensions).",
    },
    {
      title: "Grain: the first decision",
      body: "Before anything else, declare the **grain** — what one fact row represents (one order line? one daily snapshot?). Every measure and dimension must make sense at that grain. Getting the grain wrong (mixing order-level and line-level facts) produces double-counting that's painful to unwind later.",
      rules: ["Declare the grain first — one fact row = one ___ — and never mix grains in a table."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Dimensional modeling is mostly about three things done well: the grain, conformed dimensions, and how you handle dimensions that change over time.",
  deepDive: [
    {
      title: "Conformed dimensions",
      body: "A dimension is *conformed* when it's shared, with the same keys and meaning, across multiple fact tables (the same date_dim and product_dim used by sales, returns, and inventory facts). Conformed dimensions are what let you compare metrics across processes — they're the backbone of an enterprise warehouse.",
      callout: { tone: "key", label: "Why it matters:", body: "Without conformed dimensions, 'revenue by product' and 'returns by product' can't be joined — every team invents its own product list and the numbers never reconcile." },
    },
    {
      title: "Slowly changing dimensions (SCD)",
      body: "Dimension attributes change — a customer moves city, a product is recategorized. How you record that change is the SCD decision: overwrite (Type 1, keep only current), or add a new versioned row with effective dates (Type 2, keep full history). Type 2 is what lets you answer 'what category was this product in *at the time of the sale*', not just today.",
      steps: [
        { title: "Type 1 — overwrite", detail: "Keep only the current value; history is lost. Simple, for corrections." },
        { title: "Type 2 — new row + effective dates", detail: "Version the row; the fact points at the version valid at event time. Preserves history." },
      ],
      callout: { tone: "tip", label: "The senior framing:", body: "\"Star schema by default, grain declared up front, conformed dimensions across facts, and SCD Type 2 on the dimensions where history matters — simple joins, correct history.\"" },
    },
  ],
  qa: [
    {
      q: "Star vs snowflake — which do you choose and why?",
      a: "Default to a star: one fact table joined to denormalized dimension tables, so queries are a single join hop and run fast — exactly the shape BI aggregate queries and the optimizer's star-join handling want. Snowflake normalizes dimensions into sub-tables, saving storage and removing redundancy but adding joins and complexity. Reach for snowflake only on specific very large, highly repetitive dimensions where normalization clearly pays; otherwise the star's simplicity and speed win.",
      tip: "Lead with 'star by default for query simplicity/speed' and treat snowflake as a targeted optimization, not the norm.",
    },
    {
      q: "What is the 'grain' of a fact table and why declare it first?",
      a: "The grain is what a single fact row represents — one order line, one daily account balance, one sensor reading. You declare it first because every measure and dimension has to be valid at that grain; mixing grains (order-level totals in a line-level table) causes double-counting when you aggregate. A clear, consistent grain is the foundation everything else hangs off.",
      tip: "'One fact row = one ___' is the crisp way to state grain; tie it to avoiding double-counting.",
    },
    {
      q: "How do you handle a dimension attribute that changes over time?",
      a: "That's the slowly-changing-dimension decision. Type 1 overwrites the value, keeping only the current state (fine for corrections, loses history). Type 2 adds a new versioned dimension row with effective-from/to dates and a current flag, and facts reference the version valid at event time — so you can report on attributes as they were when the event happened. Use Type 2 where historical accuracy matters (e.g. which sales region a rep belonged to at sale time).",
      tip: "Name Type 1 vs Type 2 and the 'as-was vs as-is' distinction — that's the heart of the SCD question.",
    },
    {
      q: "What are conformed dimensions and why do they matter?",
      a: "A conformed dimension is one shared with identical keys and meaning across multiple fact tables — the same date and product dimensions used by sales, returns and inventory facts. They let you compare and combine metrics across business processes consistently; without them, each fact table has its own incompatible version of 'product' and cross-process reporting never reconciles. They're the integration backbone of a warehouse.",
      tip: "Frame them as the thing that makes cross-process metrics reconcile — that's their whole value.",
    },
  ],
  related: [],
};
