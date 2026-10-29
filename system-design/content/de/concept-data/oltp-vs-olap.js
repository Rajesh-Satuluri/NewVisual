export default {
  id: "oltp-vs-olap",
  title: "OLTP vs OLAP & data modeling",
  icon: "🧱",
  chapter: 4,
  group: "Foundations",
  summary: "Transactional systems (OLTP) and analytical systems (OLAP) have opposite access patterns, so they want opposite designs: normalized row-stores for fast single-record writes, denormalized column-stores for fast wide-column scans. Knowing which you're building drives every modeling choice.",
  widget: "de-row-vs-column",
  widgetIntro: "The split comes down to **how data is physically laid out**. A **row-store** keeps each record's fields together, so reading or writing one whole row is one cheap seek — perfect for OLTP point operations. A **column-store** keeps each column's values together, so an aggregate over one column reads only that column — perfect for OLAP scans.\n\nRun the same query against both layouts and watch the cells each one has to read. For `SUM(amount)` over millions of rows, columnar touches one column; row storage touches everything. That difference is why analytics lives in column-stores.",
  sections: [
    {
      title: "Two opposite workloads",
      body: "OLTP (online transaction processing) runs the business: many small, concurrent reads and writes of individual records — place an order, update a balance. OLAP (online analytical processing) answers questions about the business: a few huge queries scanning and aggregating millions of rows — revenue by region by month.",
      table: {
        head: ["", "OLTP", "OLAP"],
        rows: [
          ["Query", "Point read/write, few rows", "Scan + aggregate, millions of rows"],
          ["Columns touched", "Whole row (all columns)", "A few columns, all rows"],
          ["Writes", "Constant, single-row", "Bulk loads, append"],
          ["Metric that matters", "Latency, concurrency", "Throughput, scan cost"],
        ],
      },
    },
    {
      title: "Row-store vs column-store",
      body: "Storage layout follows the workload. A **row-store** writes all of a row's columns contiguously — one seek fetches a whole record, ideal for OLTP. A **column-store** writes each column's values contiguously — a scan reads only the columns a query needs, and similar values compress far better, ideal for OLAP.",
      bullets: [
        "**Row-store (OLTP):** whole-row reads/writes are cheap; a column aggregate must read every row.",
        "**Column-store (OLAP):** column scans are cheap and compress well; fetching one full row touches every column file.",
      ],
      rules: ["Row-store for whole-record access; column-store for wide scans over few columns."],
    },
    {
      title: "Normalize vs denormalize",
      body: "OLTP normalizes (3NF) to avoid update anomalies and keep writes small and consistent — each fact stored once. OLAP denormalizes (star schemas, wide tables) to avoid joins at query time and keep scans fast — redundancy is fine because the data is read-mostly and rebuilt by pipelines.",
      flow: ["OLTP: normalized, write-optimized", "ETL / ELT", "OLAP: denormalized, read-optimized"],
    },
    {
      title: "Why you don't run analytics on the OLTP database",
      body: "Big analytical scans on the production transactional database compete with live traffic for IO and locks, and row-storage makes those scans expensive anyway. So data is copied (via ETL/ELT or CDC) into a warehouse or lake built on columnar storage, where heavy queries run without touching — or slowing — the system of record.",
      rules: ["Keep analytics off the OLTP box: copy to a columnar warehouse/lake so scans don't fight live traffic."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The row-vs-column choice drives compression, vectorized execution, and why one physical model can't serve both workloads well.",
  deepDive: [
    {
      title: "Columnar is why analytics got cheap",
      body: "Storing a column together unlocks three wins at once: you read only the columns a query projects, each column compresses hard because neighbouring values are similar (run-length, dictionary encoding), and engines process columns in tight vectorized loops. Together these cut scan cost by an order of magnitude versus row storage.",
      stats: [
        { value: "projection", label: "read only needed columns", tone: "green" },
        { value: "compression", label: "similar values pack tightly", tone: "blue" },
        { value: "vectorized", label: "tight per-column loops", tone: "accent" },
        { value: "~10×+", label: "typical scan-cost win", tone: "amber" },
      ],
    },
    {
      title: "One model can't serve both",
      body: "A normalized row-store that's perfect for OLTP writes is slow for analytical scans, and a denormalized column-store that's perfect for OLAP scans is poor at single-row writes and updates. That's why modern stacks keep both: an OLTP system of record and a separate OLAP warehouse/lake, kept in sync by pipelines or CDC.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"OLTP: normalized row-store tuned for low-latency single-record writes. OLAP: denormalized column-store tuned for cheap wide scans. Different physics, so different systems, bridged by ELT/CDC.\"" },
    },
  ],
  qa: [
    {
      q: "What's the difference between OLTP and OLAP, and how does it change the design?",
      a: "OLTP handles many small concurrent reads/writes of individual records (run the business), so it wants a normalized row-store tuned for low-latency, high-concurrency single-row access. OLAP answers analytical questions by scanning and aggregating millions of rows over a few columns (understand the business), so it wants a denormalized column-store tuned for cheap scans and throughput. Opposite access patterns lead to opposite storage layouts, normalization choices, and even separate systems.",
      tip: "Contrast the access patterns first (point writes vs wide scans); the storage and normalization choices follow from that.",
    },
    {
      q: "Why are column-stores faster for analytics?",
      a: "An analytical query usually aggregates a few columns over many rows. A column-store keeps each column's values contiguous, so it reads only the projected columns instead of every field, those columns compress heavily because adjacent values are similar, and engines can scan them in vectorized loops. A row-store would have to read every row in full to get one column, so columnar typically cuts analytical scan cost by 10× or more.",
      tip: "Projection + compression + vectorization is the three-part answer; mention reading 'only the needed columns'.",
    },
    {
      q: "Why not just run analytics directly on the production (OLTP) database?",
      a: "Two reasons. Operationally, big analytical scans contend with live transactions for IO and locks, hurting the latency the business depends on. Physically, the OLTP database's row storage makes large column scans expensive regardless. So you replicate data into a columnar warehouse or lake — via batch ELT or CDC — where heavy queries run on read-optimized storage without touching the system of record.",
      tip: "Give both the contention reason and the row-vs-column storage reason — interviewers want both.",
    },
    {
      q: "When do you normalize vs denormalize?",
      a: "Normalize for OLTP: 3NF keeps each fact in one place, so writes are small and there are no update anomalies — correctness and write efficiency. Denormalize for OLAP: wide tables and star schemas avoid joins at query time so scans stay fast, and the redundancy is acceptable because the data is read-mostly and regenerated by pipelines. The rule of thumb: normalize where you write a lot and must stay consistent; denormalize where you read a lot and want speed.",
      tip: "'Normalize for writes/consistency, denormalize for reads/speed' is the one-liner — tie each to its workload.",
    },
  ],
  related: [],
};
