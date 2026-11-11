export default {
  id: "etl-vs-elt",
  title: "Batch ETL vs ELT",
  icon: "🔄",
  chapter: 10,
  group: "Ingestion & pipelines",
  summary: "ETL transforms data on separate compute before loading it; ELT loads raw data into the warehouse/lake first and transforms it there with SQL. Cheap, elastic cloud warehouses flipped the default to ELT: load everything raw, keep it, and transform in place.",
  widget: "de-etl-vs-elt",
  widgetIntro: "The only difference is **where the transform runs**. In **ETL**, a separate processing engine cleans and reshapes data *before* it lands, so only modelled data enters the warehouse — but raw detail is lost and the transform tier is a bottleneck. In **ELT**, raw data is loaded *first* and transformed *inside* the warehouse with SQL, so you keep the raw copy and scale transforms on the warehouse's own elastic compute.\n\nWatch the same source flow down both paths and note where the transform box sits — and that ELT keeps a raw landing copy the ETL path never had.",
  sections: [
    {
      title: "Where the T happens",
      body: "Both move data from sources to an analytics store; they differ on when transformation occurs.",
      table: {
        head: ["", "ETL", "ELT"],
        rows: [
          ["Order", "Extract → Transform → Load", "Extract → Load → Transform"],
          ["Transform runs on", "Separate engine (before load)", "Inside the warehouse/lake (SQL)"],
          ["Raw data kept?", "Usually not", "Yes — raw landing retained"],
          ["Scales with", "The ETL tier", "The warehouse's elastic compute"],
        ],
      },
    },
    {
      title: "Why ELT became the default",
      body: "Cloud warehouses and lakehouses made storage cheap and compute elastic, so there's no reason to discard raw data or run a separate transform cluster. Load everything raw, keep it forever, and transform with SQL that scales on demand. New requirements can re-derive from the retained raw data — no re-extraction from source.",
      bullets: [
        "Cheap storage → keep raw data instead of throwing it away.",
        "Elastic warehouse compute → transform in place, scale on demand.",
        "SQL transforms (e.g. dbt) → version-controlled, testable, in-warehouse.",
      ],
      rules: ["Default to ELT in the cloud: load raw, keep it, transform in SQL where the data already lives."],
    },
    {
      title: "When ETL still makes sense",
      body: "Transform-before-load still wins in specific cases: you must not land sensitive data unmasked (PII tokenization before storage), the source is huge and you only need a small slice, or heavy non-SQL processing fits a dedicated engine better. Compliance and data-minimization often force a transform step before the data ever lands.",
      bullets: [
        "**PII / compliance:** mask or tokenize before data is stored.",
        "**Pre-filtering:** drop 99% at the edge when you only need a slice.",
        "**Complex processing:** heavy non-SQL logic on a dedicated engine.",
      ],
    },
    {
      title: "ELT and the medallion",
      body: "ELT maps naturally onto layered refinement: the raw load is Bronze, the in-warehouse transforms produce Silver and Gold. Tools like dbt make the T a DAG of tested SQL models over the loaded raw data — which is why ELT + a table format + a transformation framework is the modern default stack.",
      flow: ["Extract", "Load raw (Bronze)", "Transform in SQL (Silver/Gold)"],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "The shift to ELT is really a shift in what you optimize for: reproducibility and flexibility over up-front tidiness.",
  deepDive: [
    {
      title: "Raw retention is the real win",
      body: "Keeping the raw load means every downstream table is a re-derivable function of data you still have. Change a business rule, fix a bug, or add a metric and you reprocess from raw — no begging the source system for history it may no longer hold. ETL's transform-before-load discards that safety net.",
      stats: [
        { value: "raw kept", label: "re-derive any model later", tone: "green" },
        { value: "in-warehouse", label: "transform where data lives", tone: "blue" },
        { value: "SQL / dbt", label: "tested, versioned transforms", tone: "accent" },
        { value: "elastic", label: "scale T on demand", tone: "amber" },
      ],
    },
    {
      title: "The cost trade",
      body: "ELT pushes transform cost onto warehouse compute, which you pay per query — a poorly written transform can be expensive. ETL front-loads cost on a separate tier and lands less data. The modern answer manages ELT cost with incremental models, materialization choices, and partition pruning rather than reverting to ETL.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"ELT by default: load raw into the lake/warehouse, keep it, and transform with tested SQL — reproducible and flexible. Reach back for ETL only when compliance, data minimization, or heavy non-SQL processing forces transforming before the data lands.\"" },
    },
  ],
  qa: [
    {
      q: "What's the difference between ETL and ELT, and why did ELT win?",
      a: "ETL transforms data on a separate engine before loading, so only modeled data lands and raw detail is discarded. ELT loads raw data into the warehouse/lake first and transforms it there with SQL. ELT became the default because cloud storage is cheap (so keep raw) and warehouse compute is elastic (so transform in place and scale on demand), and because keeping raw data lets you re-derive any downstream table when rules change. ETL survives mainly for compliance/PII and heavy pre-filtering.",
      tip: "Lead with 'where the T runs' and then 'cheap storage + elastic compute + raw retention' as why ELT won.",
    },
    {
      q: "When would you still choose ETL?",
      a: "When data can't or shouldn't land raw. The big one is compliance: mask or tokenize PII before it's stored, or drop regulated fields at the edge. Also when the source is huge but you need a small slice (pre-filter before loading to save storage/compute), or when the transformation is heavy non-SQL work better suited to a dedicated engine than to warehouse SQL. Outside those, ELT is preferred.",
      tip: "PII/compliance is the headline reason; pre-filtering and specialized compute are the others.",
    },
    {
      q: "Why is keeping the raw data (ELT) valuable?",
      a: "Because every downstream table becomes a re-derivable function of data you still have. When a business rule changes, a transform bug is found, or a new metric is needed, you reprocess from the retained raw load instead of re-extracting history the source may no longer keep. It also enables schema-on-read exploration and debugging by bisecting raw → cleaned → curated. ETL's transform-before-load throws that safety net away.",
      tip: "'Re-derive anything from retained raw' is the core value — tie it to changing rules and fixing bugs.",
    },
  ],
  related: [],
};
