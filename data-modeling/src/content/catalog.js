/* catalog.js — Data Modeling curriculum (93 concepts, 8 sections).
   Sibling course to db-scale; shares the Designed-to-Scale engine. 'built' marks
   lessons with a full implementation; the rest are navigable placeholders. */
export const CATALOG = [
  {
    "n": "01",
    "name": "Modeling Foundations",
    "items": [
      {
        "slug": "data-model-basics",
        "title": "Data Model Basics",
        "icon": "🎯",
        "built": true
      },
      {
        "slug": "conceptual-logical-physical",
        "title": "Conceptual · Logical · Physical",
        "icon": "🧱",
        "built": true
      },
      {
        "slug": "entities-attributes",
        "title": "Entities & Attributes",
        "icon": "🧩",
        "built": true
      },
      {
        "slug": "relationships-cardinality",
        "title": "Relationships & Cardinality",
        "icon": "🔗",
        "built": true
      },
      {
        "slug": "keys-identifiers",
        "title": "Keys & Identifiers",
        "icon": "🔑",
        "built": true
      },
      {
        "slug": "three-schema-architecture",
        "title": "Three-Schema Architecture",
        "icon": "🏛️",
        "built": true
      },
      {
        "slug": "modeling-notations",
        "title": "Modeling Notations",
        "icon": "✒️",
        "built": true
      },
      {
        "slug": "data-types-domains",
        "title": "Data Types & Domains",
        "icon": "🔤",
        "built": true
      },
      {
        "slug": "null-semantics",
        "title": "Null Semantics",
        "icon": "⬜",
        "built": true
      },
      {
        "slug": "business-rules",
        "title": "Business Rules & Constraints",
        "icon": "📜",
        "built": true
      },
      {
        "slug": "weak-strong-entities",
        "title": "Weak & Strong Entities",
        "icon": "🫥",
        "built": true
      },
      {
        "slug": "model-smells",
        "title": "Model Smells & Quality",
        "icon": "🧪",
        "built": true
      }
    ]
  },
  {
    "n": "02",
    "name": "ER & Relational Design",
    "items": [
      {
        "slug": "er-to-relational",
        "title": "ER → Relational Mapping",
        "icon": "🔁",
        "built": true
      },
      {
        "slug": "associative-entities",
        "title": "Associative Entities",
        "icon": "🧷",
        "built": true
      },
      {
        "slug": "supertype-subtype",
        "title": "Supertype / Subtype",
        "icon": "🧬",
        "built": true
      },
      {
        "slug": "functional-dependencies",
        "title": "Functional Dependencies",
        "icon": "➡️",
        "built": true
      },
      {
        "slug": "first-normal-form",
        "title": "First Normal Form (1NF)",
        "icon": "1️⃣",
        "built": true
      },
      {
        "slug": "second-normal-form",
        "title": "Second Normal Form (2NF)",
        "icon": "2️⃣",
        "built": true
      },
      {
        "slug": "third-normal-form",
        "title": "Third Normal Form (3NF)",
        "icon": "3️⃣",
        "built": true
      },
      {
        "slug": "bcnf",
        "title": "Boyce–Codd Normal Form",
        "icon": "🅱️",
        "built": false
      },
      {
        "slug": "higher-normal-forms",
        "title": "4NF & 5NF",
        "icon": "🔢",
        "built": false
      },
      {
        "slug": "denormalization",
        "title": "Denormalization Tradeoffs",
        "icon": "⚖️",
        "built": false
      },
      {
        "slug": "surrogate-natural-keys",
        "title": "Surrogate vs Natural Keys",
        "icon": "🆔",
        "built": false
      },
      {
        "slug": "referential-integrity",
        "title": "Referential Integrity",
        "icon": "🔒",
        "built": false
      },
      {
        "slug": "indexing-the-model",
        "title": "Indexing the Model",
        "icon": "🗂️",
        "built": false
      },
      {
        "slug": "constraints-triggers",
        "title": "Constraints & Triggers",
        "icon": "🧯",
        "built": false
      }
    ]
  },
  {
    "n": "03",
    "name": "Dimensional Modeling",
    "items": [
      {
        "slug": "oltp-vs-olap",
        "title": "OLTP vs OLAP",
        "icon": "🔀",
        "built": false
      },
      {
        "slug": "star-schema",
        "title": "Star Schema",
        "icon": "⭐",
        "built": true
      },
      {
        "slug": "snowflake-schema",
        "title": "Snowflake Schema",
        "icon": "❄️",
        "built": false
      },
      {
        "slug": "fact-tables",
        "title": "Fact Tables",
        "icon": "📊",
        "built": false
      },
      {
        "slug": "fact-table-types",
        "title": "Transaction · Periodic · Accumulating",
        "icon": "📈",
        "built": false
      },
      {
        "slug": "dimension-tables",
        "title": "Dimension Tables",
        "icon": "📁",
        "built": false
      },
      {
        "slug": "grain",
        "title": "Declaring the Grain",
        "icon": "🌾",
        "built": false
      },
      {
        "slug": "conformed-dimensions",
        "title": "Conformed Dimensions",
        "icon": "🧭",
        "built": false
      },
      {
        "slug": "scd-overview",
        "title": "Slowly-Changing Dimensions",
        "icon": "🕰️",
        "built": false
      },
      {
        "slug": "scd-types",
        "title": "SCD Types 0–6",
        "icon": "🔢",
        "built": false
      },
      {
        "slug": "degenerate-junk-dimensions",
        "title": "Degenerate & Junk Dimensions",
        "icon": "🎛️",
        "built": false
      },
      {
        "slug": "bridge-tables",
        "title": "Bridge Tables",
        "icon": "🌉",
        "built": false
      },
      {
        "slug": "role-playing-dimensions",
        "title": "Role-Playing Dimensions",
        "icon": "🎭",
        "built": false
      },
      {
        "slug": "bus-matrix",
        "title": "Kimball Bus Matrix",
        "icon": "🚌",
        "built": false
      },
      {
        "slug": "aggregate-tables",
        "title": "Aggregate Tables",
        "icon": "🧮",
        "built": false
      },
      {
        "slug": "factless-facts",
        "title": "Factless Fact Tables",
        "icon": "🫧",
        "built": false
      }
    ]
  },
  {
    "n": "04",
    "name": "NoSQL & Access-Pattern Modeling",
    "items": [
      {
        "slug": "query-first-design",
        "title": "Query-First Design",
        "icon": "❓",
        "built": false
      },
      {
        "slug": "document-modeling",
        "title": "Document Modeling",
        "icon": "📄",
        "built": false
      },
      {
        "slug": "embedding-vs-referencing",
        "title": "Embedding vs Referencing",
        "icon": "🪆",
        "built": false
      },
      {
        "slug": "key-value-modeling",
        "title": "Key-Value Modeling",
        "icon": "🗝️",
        "built": false
      },
      {
        "slug": "wide-column-modeling",
        "title": "Wide-Column Modeling",
        "icon": "🏛️",
        "built": false
      },
      {
        "slug": "partition-clustering-keys",
        "title": "Partition & Clustering Keys",
        "icon": "🧱",
        "built": false
      },
      {
        "slug": "single-table-design",
        "title": "Single-Table Design",
        "icon": "🍱",
        "built": false
      },
      {
        "slug": "secondary-indexes-nosql",
        "title": "Secondary Indexes (GSI/LSI)",
        "icon": "🗂️",
        "built": false
      },
      {
        "slug": "materialized-aggregates",
        "title": "Materialized Aggregates",
        "icon": "🧊",
        "built": false
      },
      {
        "slug": "write-vs-read-optimization",
        "title": "Write vs Read Optimization",
        "icon": "✍️",
        "built": false
      },
      {
        "slug": "polyglot-persistence",
        "title": "Polyglot Persistence",
        "icon": "🗣️",
        "built": false
      },
      {
        "slug": "hot-key-handling",
        "title": "Hot Keys & Write Sharding",
        "icon": "🔥",
        "built": false
      },
      {
        "slug": "time-series-modeling",
        "title": "Time-Series Modeling",
        "icon": "⏱️",
        "built": false
      }
    ]
  },
  {
    "n": "05",
    "name": "Graph & Semantic Models",
    "items": [
      {
        "slug": "property-graphs",
        "title": "Property Graphs",
        "icon": "🕸️",
        "built": false
      },
      {
        "slug": "nodes-edges-properties",
        "title": "Nodes · Edges · Properties",
        "icon": "🔵",
        "built": false
      },
      {
        "slug": "rdf-triples",
        "title": "RDF & Triples",
        "icon": "🔺",
        "built": false
      },
      {
        "slug": "relationships-first-class",
        "title": "Relationships as First-Class",
        "icon": "🔗",
        "built": false
      },
      {
        "slug": "graph-vs-relational",
        "title": "Graph vs Relational Traversal",
        "icon": "🧭",
        "built": false
      },
      {
        "slug": "ontologies",
        "title": "Ontologies & Taxonomies",
        "icon": "🧠",
        "built": false
      },
      {
        "slug": "semantic-layer",
        "title": "Semantic / Metrics Layer",
        "icon": "📐",
        "built": false
      },
      {
        "slug": "entity-resolution",
        "title": "Entity Resolution",
        "icon": "🧩",
        "built": false
      },
      {
        "slug": "knowledge-graphs",
        "title": "Knowledge Graphs",
        "icon": "🌐",
        "built": false
      },
      {
        "slug": "hierarchies-trees",
        "title": "Modeling Hierarchies & Trees",
        "icon": "🌳",
        "built": false
      }
    ]
  },
  {
    "n": "06",
    "name": "Evolution, Time & Scale",
    "items": [
      {
        "slug": "schema-migration",
        "title": "Schema Migration Patterns",
        "icon": "🚜",
        "built": false
      },
      {
        "slug": "expand-contract",
        "title": "Expand / Contract Migration",
        "icon": "↔️",
        "built": false
      },
      {
        "slug": "schema-compatibility",
        "title": "Backward / Forward Compatibility",
        "icon": "🔄",
        "built": false
      },
      {
        "slug": "schema-versioning",
        "title": "Schema Versioning & Registry",
        "icon": "🏷️",
        "built": false
      },
      {
        "slug": "temporal-tables",
        "title": "Temporal Tables",
        "icon": "⏳",
        "built": false
      },
      {
        "slug": "bitemporal-modeling",
        "title": "Bitemporal Modeling",
        "icon": "⌛",
        "built": false
      },
      {
        "slug": "event-modeling",
        "title": "Event / Append-Only Modeling",
        "icon": "📜",
        "built": false
      },
      {
        "slug": "data-vault",
        "title": "Data Vault",
        "icon": "🏦",
        "built": false
      },
      {
        "slug": "inmon-vs-kimball",
        "title": "Inmon vs Kimball",
        "icon": "🏗️",
        "built": false
      },
      {
        "slug": "medallion-architecture",
        "title": "Medallion Architecture",
        "icon": "🥇",
        "built": false
      },
      {
        "slug": "partitioning-for-scale",
        "title": "Partitioning for Scale",
        "icon": "🪓",
        "built": false
      },
      {
        "slug": "cdc-modeling",
        "title": "Change Data Capture Modeling",
        "icon": "🔁",
        "built": false
      }
    ]
  },
  {
    "n": "07",
    "name": "Interactive Labs",
    "items": [
      {
        "slug": "normalization-lab",
        "title": "Normalization Lab",
        "icon": "🧪",
        "built": true
      },
      {
        "slug": "scd-lab",
        "title": "Slowly-Changing Dimension Lab",
        "icon": "🕰️",
        "built": false
      },
      {
        "slug": "single-table-lab",
        "title": "Single-Table Design Lab",
        "icon": "🍱",
        "built": false
      },
      {
        "slug": "er-builder-lab",
        "title": "ER Builder Lab",
        "icon": "🧩",
        "built": false
      },
      {
        "slug": "star-schema-query-lab",
        "title": "Star-Schema Query Lab",
        "icon": "⭐",
        "built": false
      },
      {
        "slug": "schema-evolution-lab",
        "title": "Schema Evolution Lab",
        "icon": "🚜",
        "built": false
      },
      {
        "slug": "end-to-end-model-simulator",
        "title": "End-to-End Model Simulator",
        "icon": "🎛️",
        "built": false
      }
    ]
  },
  {
    "n": "08",
    "name": "Mastery & Review",
    "items": [
      {
        "slug": "concept-map",
        "title": "Concept Map",
        "icon": "🗺️",
        "built": false
      },
      {
        "slug": "modeling-roadmap",
        "title": "Data Modeling Roadmap",
        "icon": "🧭",
        "built": false
      },
      {
        "slug": "kimball-inmon-vault",
        "title": "Kimball · Inmon · Data Vault",
        "icon": "⚖️",
        "built": false
      },
      {
        "slug": "modeling-cheat-sheet",
        "title": "Cheat Sheet",
        "icon": "📝",
        "built": false
      },
      {
        "slug": "interview-center",
        "title": "Interview Center",
        "icon": "🎤",
        "built": false
      },
      {
        "slug": "mock-modeling-interview",
        "title": "Mock Modeling Interview",
        "icon": "🗣️",
        "built": false
      },
      {
        "slug": "modeling-quiz",
        "title": "Quiz",
        "icon": "❓",
        "built": false
      },
      {
        "slug": "modeling-glossary",
        "title": "Glossary",
        "icon": "📖",
        "built": false
      },
      {
        "slug": "normal-forms-reference",
        "title": "Normal Forms Reference",
        "icon": "🔢",
        "built": false
      }
    ]
  }
];

export const TOTAL = 93;
export const BUILT_COUNT = 21;
