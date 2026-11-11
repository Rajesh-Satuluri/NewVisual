export default {
  id: "ecommerce-analytics",
  title: "Design an e-commerce analytics platform",
  icon: "🛒",
  chapter: 30,
  group: "End-to-end platforms",
  summary: "Integrate orders, inventory, and user behavior from operational systems into a warehouse that powers BI, operational dashboards, and recommendations. The core challenge is unifying many sources with different shapes and freshness needs into one consistent, dimensional model without hammering the production databases.",
  widget: "de-ecommerce",
  widgetIntro: "An e-commerce platform's data lives in several operational systems — an orders database, an inventory service, and a clickstream of browsing behavior. Analytics needs them **joined and conformed** in one place. The pattern: pull transactional data via **CDC** (no load on production), stream behavioral events, land everything in the lake, and model it into a **star schema** (a sales fact surrounded by product/customer/time dimensions) that BI and recommendations read.\n\nWatch the sources flow in through their ingestion methods, converge into the warehouse's dimensional model, and fan out to the consumers.",
  sections: [
    {
      title: "Requirements",
      body: "Give the business one trustworthy view across orders, inventory, and behavior — without impacting the stores that run the business.",
      bullets: [
        "Unify orders, inventory, and clickstream into one model.",
        "Don't load the production OLTP databases with analytics.",
        "Serve BI (revenue, margin), ops dashboards, and recommendations.",
        "Keep dimensions consistent (one definition of product/customer).",
      ],
    },
    {
      title: "Ingesting the sources",
      body: "Each source gets the right ingestion method. The **orders/inventory databases** are captured with CDC — tail the commit log so analytics never queries production. **Clickstream** arrives as a streaming event feed. Reference data (product catalog) may be a periodic batch extract. All land in the lake's raw layer.",
      table: {
        head: ["Source", "Ingestion", "Why"],
        rows: [
          ["Orders DB (OLTP)", "CDC", "Near-real-time, zero load on production"],
          ["Inventory", "CDC / events", "Track stock changes continuously"],
          ["Clickstream", "Streaming (Kafka)", "High-volume behavioral events"],
          ["Product catalog", "Batch extract", "Slowly-changing reference data"],
        ],
      },
    },
    {
      title: "Modeling: the star schema",
      body: "In the warehouse, model a **sales fact** (one row per order line: quantity, price, discount, foreign keys) surrounded by conformed **dimensions** — product, customer, date, store. Slowly-changing dimensions (SCD Type 2) preserve history, so you can report what a product's category or a customer's segment was *at the time of the sale*, not just today.",
      flow: ["raw (lake)", "clean & conform (Silver)", "star schema: fact_sales + dims (Gold)", "BI · recs"],
      rules: ["A conformed star schema with SCD Type 2 dimensions is the unifying analytical model."],
    },
    {
      title: "Serving the consumers",
      body: "The curated model feeds several consumers from one source of truth: BI dashboards (revenue, margin, inventory turns), operational dashboards (today's orders, low-stock alerts), and a recommendation pipeline (feature tables from behavior + purchases). Because they all read conformed dimensions, their numbers reconcile — 'revenue by product' matches across every report.",
      bullets: [
        "BI: aggregate Gold tables for revenue/margin/retention.",
        "Ops: fresher tables for live order and inventory monitoring.",
        "Recommendations: feature tables joining behavior + purchase history.",
      ],
    },
    {
      title: "The hard parts",
      body: "Unifying identity (same customer across web/app/guest checkout), handling the OLTP→OLAP impedance (normalized sources → denormalized star), keeping dimensions conformed across teams, and reconciling that the warehouse's order totals match the source system. CDC + a dimensional model + reconciliation is the backbone.",
      rules: ["Conform dimensions, resolve identity, and reconcile totals against source — or every report disagrees."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "E-commerce analytics is the canonical warehouse-integration problem: many sources, one conformed model, zero production impact.",
  deepDive: [
    {
      title: "CDC keeps production safe",
      body: "Running analytical queries on the orders database would slow checkout. CDC sidesteps this entirely: it reads the database's commit log, so the warehouse stays in near-real-time sync while the production database sees no analytical load at all. It also captures deletes and updates (cancelled orders, address changes) that a nightly SELECT-based extract would miss or stress the DB to get.",
      stats: [
        { value: "CDC", label: "sync without loading production", tone: "green" },
        { value: "star schema", label: "fact + conformed dimensions", tone: "blue" },
        { value: "SCD Type 2", label: "history: as-was, not just as-is", tone: "accent" },
        { value: "reconcile", label: "warehouse totals = source", tone: "amber" },
      ],
    },
    {
      title: "One model, many consumers",
      body: "The payoff of a conformed dimensional model is that BI, ops, and recommendations all build on the same definitions, so metrics reconcile and new consumers plug in without re-integrating sources. The cost is the modeling discipline — declaring grain, conforming dimensions, choosing SCD types, resolving identity — which is exactly the data-warehouse-design work, applied to a real product.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"CDC the OLTP sources (no production load), stream clickstream, land raw in the lake, and model a conformed star schema with SCD Type 2 so BI, ops, and recs share one truth. Resolve customer identity, and reconcile warehouse totals against source. Many sources in, one dimensional model out.\"" },
    },
  ],
  qa: [
    {
      q: "How do you integrate e-commerce sources without impacting production?",
      a: "Capture the operational databases (orders, inventory) with CDC — reading their commit logs rather than querying them — so the warehouse stays in near-real-time sync while production sees no analytical load, and deletes/updates like cancellations are captured correctly. Ingest high-volume clickstream as a streaming feed, and pull slowly-changing reference data (product catalog) as periodic batch. Everything lands in the lake's raw layer, then is cleaned, conformed, and modeled. The key is CDC for the transactional sources: zero production impact with fresh data.",
      tip: "CDC for OLTP (no production load), streaming for clickstream, batch for reference data; land raw then model.",
    },
    {
      q: "How do you model the data for analytics?",
      a: "As a conformed star schema: a sales fact table at order-line grain (quantity, price, discount, plus foreign keys) surrounded by dimension tables for product, customer, date, and store, cleaned and conformed from the raw sources. Use SCD Type 2 on dimensions where history matters, so you can report attributes as they were at the time of the sale (a product's category then, not now). Conformed dimensions mean every consumer — BI, ops, recommendations — shares the same definitions, so their metrics reconcile. It's dimensional modeling applied to the product's real sources.",
      tip: "Star schema: sales fact at order-line grain + conformed product/customer/date dims, SCD Type 2 for history.",
    },
    {
      q: "How do you make sure the warehouse numbers are trustworthy?",
      a: "Reconcile and conform. Run reconciliation that independently compares warehouse totals (order counts, revenue sums per day) against the source systems, alerting on drift so you catch missed CDC events or dedup gaps before they reach a report. Conform dimensions so there's a single definition of product and customer across all facts, and resolve identity (the same customer across web, app, and guest checkout) so behavior and purchases join correctly. Dedupe at-least-once CDC/stream data by key. Without reconciliation and conformed dimensions, each report computes a different 'revenue by product' and trust collapses.",
      tip: "Reconcile totals vs source + conform dimensions + resolve identity + dedupe; otherwise reports disagree.",
    },
  ],
  related: [],
};
