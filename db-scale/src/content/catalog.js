/* catalog.js — AUTO-GENERATED curriculum (133 concepts, 8 sections)
   Sourced from db-lab's concept registry. 'built' marks lessons that have a
   full Designed-to-Scale implementation; the rest are navigable placeholders. */
export const CATALOG = [
  {
    "n": "01",
    "name": "Foundations",
    "items": [
      {
        "slug": "what-is-dbms",
        "title": "What is a DBMS?",
        "icon": "🗄️",
        "built": true
      },
      {
        "slug": "why-databases",
        "title": "Why Databases?",
        "icon": "❓",
        "built": false
      },
      {
        "slug": "dbms-architecture",
        "title": "DBMS Architecture",
        "icon": "🏗️",
        "built": false
      },
      {
        "slug": "data-models",
        "title": "Data Models",
        "icon": "📐",
        "built": false
      },
      {
        "slug": "relational-model",
        "title": "Relational Model",
        "icon": "📊",
        "built": false
      },
      {
        "slug": "relational-algebra",
        "title": "Relational Algebra",
        "icon": "➕",
        "built": false
      },
      {
        "slug": "sql-relational-algebra",
        "title": "SQL → Relational Algebra",
        "icon": "🔗",
        "built": false
      },
      {
        "slug": "schema-constraints",
        "title": "Schema & Constraints",
        "icon": "🔒",
        "built": false
      },
      {
        "slug": "storage-hierarchy",
        "title": "Storage Hierarchy",
        "icon": "💾",
        "built": false
      }
    ]
  },
  {
    "n": "02",
    "name": "Query Engine",
    "items": [
      {
        "slug": "sql-parsing",
        "title": "SQL Parsing",
        "icon": "🔍",
        "built": false
      },
      {
        "slug": "parse-tree",
        "title": "Parse Tree",
        "icon": "🌳",
        "built": false
      },
      {
        "slug": "ast",
        "title": "AST",
        "icon": "🧬",
        "built": false
      },
      {
        "slug": "query-analysis",
        "title": "Query Analysis",
        "icon": "🔎",
        "built": false
      },
      {
        "slug": "logical-plan",
        "title": "Logical Plan",
        "icon": "📋",
        "built": false
      },
      {
        "slug": "physical-plan",
        "title": "Physical Plan",
        "icon": "⚙️",
        "built": false
      },
      {
        "slug": "query-optimization",
        "title": "Query Optimization",
        "icon": "🎯",
        "built": false
      },
      {
        "slug": "cost-based-optimization",
        "title": "Cost-Based Optimization",
        "icon": "💰",
        "built": false
      },
      {
        "slug": "table-scan",
        "title": "Table Scan",
        "icon": "🔄",
        "built": false
      },
      {
        "slug": "index-scan",
        "title": "Seq Scan vs Index Scan",
        "icon": "📑",
        "built": false
      },
      {
        "slug": "nested-loop-join",
        "title": "Nested Loop Join",
        "icon": "🔁",
        "built": false
      },
      {
        "slug": "hash-join",
        "title": "Join Algorithms",
        "icon": "🔗",
        "built": false
      },
      {
        "slug": "sort-merge-join",
        "title": "Sort-Merge Join",
        "icon": "🔀",
        "built": false
      },
      {
        "slug": "aggregation",
        "title": "Aggregation",
        "icon": "📈",
        "built": false
      },
      {
        "slug": "query-execution",
        "title": "Query Execution",
        "icon": "▶️",
        "built": false
      },
      {
        "slug": "query-plan-comparator",
        "title": "Query Plan Comparator",
        "icon": "⚖️",
        "built": false
      },
      {
        "slug": "explain-analyze",
        "title": "EXPLAIN ANALYZE",
        "icon": "🔍",
        "built": false
      },
      {
        "slug": "parallel-query",
        "title": "Parallel Query",
        "icon": "⚡",
        "built": false
      },
      {
        "slug": "query-statistics",
        "title": "Query Statistics",
        "icon": "📈",
        "built": false
      },
      {
        "slug": "cost-model",
        "title": "Cost Model",
        "icon": "💰",
        "built": false
      }
    ]
  },
  {
    "n": "03",
    "name": "Storage Engine",
    "items": [
      {
        "slug": "database-files",
        "title": "Database Files",
        "icon": "📁",
        "built": false
      },
      {
        "slug": "pages",
        "title": "Pages",
        "icon": "📄",
        "built": false
      },
      {
        "slug": "records-tuples",
        "title": "Records & Tuples",
        "icon": "📦",
        "built": false
      },
      {
        "slug": "slotted-pages",
        "title": "Slotted Pages",
        "icon": "🧩",
        "built": false
      },
      {
        "slug": "buffer-pool",
        "title": "Buffer Pool",
        "icon": "🏊",
        "built": false
      },
      {
        "slug": "buffer-pool-replacement",
        "title": "Buffer Pool Replacement",
        "icon": "♻️",
        "built": false
      },
      {
        "slug": "page-cache",
        "title": "Page Cache",
        "icon": "💭",
        "built": false
      },
      {
        "slug": "disk-io",
        "title": "Disk I/O",
        "icon": "💿",
        "built": false
      },
      {
        "slug": "sequential-vs-random-io",
        "title": "Sequential vs Random I/O",
        "icon": "⏩",
        "built": false
      },
      {
        "slug": "b-tree",
        "title": "B-Tree",
        "icon": "🌲",
        "built": false
      },
      {
        "slug": "b-plus-tree",
        "title": "B+ Tree",
        "icon": "🌳",
        "built": false
      },
      {
        "slug": "b-plus-tree-search",
        "title": "B+ Tree Search",
        "icon": "🔍",
        "built": false
      },
      {
        "slug": "b-plus-tree-insert",
        "title": "B+ Tree Insert",
        "icon": "➕",
        "built": false
      },
      {
        "slug": "b-plus-tree-delete",
        "title": "B+ Tree Delete",
        "icon": "➖",
        "built": false
      },
      {
        "slug": "b-plus-tree-root-split",
        "title": "B+ Tree Split",
        "icon": "✂️",
        "built": false
      },
      {
        "slug": "lsm-tree",
        "title": "LSM-Tree",
        "icon": "🪵",
        "built": true
      },
      {
        "slug": "memtable-wal",
        "title": "MemTable & WAL",
        "icon": "🧠",
        "built": false
      },
      {
        "slug": "sstable",
        "title": "SSTable",
        "icon": "🗄️",
        "built": false
      },
      {
        "slug": "bloom-filter",
        "title": "Bloom Filter",
        "icon": "🌸",
        "built": false
      },
      {
        "slug": "lsm-compaction",
        "title": "LSM Compaction",
        "icon": "🗜️",
        "built": false
      },
      {
        "slug": "index-types",
        "title": "Index Types",
        "icon": "🗂️",
        "built": false
      },
      {
        "slug": "connection-pooling",
        "title": "Connection Pooling",
        "icon": "🔌",
        "built": false
      }
    ]
  },
  {
    "n": "04",
    "name": "Transactions & Concurrency",
    "items": [
      {
        "slug": "transactions",
        "title": "ACID Transactions",
        "icon": "⚛️",
        "built": false
      },
      {
        "slug": "wal",
        "title": "Write-Ahead Log (WAL)",
        "icon": "📝",
        "built": false
      },
      {
        "slug": "mvcc",
        "title": "MVCC",
        "icon": "📸",
        "built": false
      },
      {
        "slug": "locking",
        "title": "Locking & Deadlocks",
        "icon": "🔐",
        "built": false
      },
      {
        "slug": "vacuum",
        "title": "VACUUM",
        "icon": "🧹",
        "built": false
      },
      {
        "slug": "isolation-levels",
        "title": "Isolation Levels",
        "icon": "📊",
        "built": false
      },
      {
        "slug": "crash-recovery",
        "title": "Crash Recovery",
        "icon": "💥",
        "built": false
      },
      {
        "slug": "checkpoints",
        "title": "Checkpoints",
        "icon": "📍",
        "built": false
      },
      {
        "slug": "wal-internals",
        "title": "WAL Internals",
        "icon": "🔬",
        "built": false
      }
    ]
  },
  {
    "n": "05",
    "name": "Distributed Systems",
    "items": [
      {
        "slug": "replication",
        "title": "Replication",
        "icon": "🔄",
        "built": false
      },
      {
        "slug": "partitioning",
        "title": "Partitioning",
        "icon": "🧩",
        "built": false
      },
      {
        "slug": "cap-theorem",
        "title": "CAP Theorem",
        "icon": "🎯",
        "built": false
      },
      {
        "slug": "two-phase-commit",
        "title": "Two-Phase Commit",
        "icon": "🤝",
        "built": false
      },
      {
        "slug": "consistent-hashing",
        "title": "Consistent Hashing",
        "icon": "⭕",
        "built": false
      },
      {
        "slug": "database-sharding",
        "title": "Database Sharding",
        "icon": "🗄️",
        "built": false
      },
      {
        "slug": "raft-consensus",
        "title": "Raft Consensus",
        "icon": "🗳️",
        "built": false
      },
      {
        "slug": "read-write-quorum",
        "title": "Read/Write Quorum",
        "icon": "🔢",
        "built": false
      },
      {
        "slug": "distributed-overview",
        "title": "Distributed DB",
        "icon": "🌐",
        "built": false
      },
      {
        "slug": "failure-modes",
        "title": "Nodes",
        "icon": "🖥️",
        "built": false
      },
      {
        "slug": "network-communication",
        "title": "Network Communication",
        "icon": "📡",
        "built": false
      },
      {
        "slug": "partial-failure",
        "title": "Partial Failure",
        "icon": "⚠️",
        "built": false
      },
      {
        "slug": "failure-detection",
        "title": "Failure Detection",
        "icon": "🔍",
        "built": false
      },
      {
        "slug": "heartbeats",
        "title": "Heartbeats",
        "icon": "💗",
        "built": false
      },
      {
        "slug": "leader-election",
        "title": "Leader Election",
        "icon": "👑",
        "built": false
      },
      {
        "slug": "multi-leader-replication",
        "title": "Multi-Leader Replication",
        "icon": "🔀",
        "built": false
      },
      {
        "slug": "synchronous-replication",
        "title": "Synchronous Replication",
        "icon": "🔄",
        "built": false
      },
      {
        "slug": "asynchronous-replication",
        "title": "Asynchronous Replication",
        "icon": "⏳",
        "built": false
      },
      {
        "slug": "quorum",
        "title": "Quorum",
        "icon": "🧮",
        "built": false
      },
      {
        "slug": "consistency",
        "title": "Consistency",
        "icon": "⚖️",
        "built": false
      },
      {
        "slug": "eventual-consistency",
        "title": "Eventual Consistency",
        "icon": "🌊",
        "built": false
      },
      {
        "slug": "strong-consistency",
        "title": "Strong Consistency",
        "icon": "💪",
        "built": false
      },
      {
        "slug": "read-repair",
        "title": "Read Repair",
        "icon": "🔧",
        "built": false
      },
      {
        "slug": "anti-entropy",
        "title": "Anti-Entropy",
        "icon": "🦠",
        "built": false
      },
      {
        "slug": "vertical-partitioning",
        "title": "Vertical Partitioning",
        "icon": "📚",
        "built": false
      },
      {
        "slug": "hash-partitioning",
        "title": "Hash Partitioning",
        "icon": "🔢",
        "built": false
      },
      {
        "slug": "range-partitioning",
        "title": "Range Partitioning",
        "icon": "📏",
        "built": false
      },
      {
        "slug": "virtual-nodes",
        "title": "Virtual Nodes",
        "icon": "🟣",
        "built": false
      },
      {
        "slug": "rebalancing",
        "title": "Rebalancing",
        "icon": "⚖️",
        "built": false
      },
      {
        "slug": "hot-partitions",
        "title": "Hot Partitions",
        "icon": "🔥",
        "built": false
      },
      {
        "slug": "distributed-transactions",
        "title": "Distributed Transactions",
        "icon": "🧾",
        "built": false
      },
      {
        "slug": "three-phase-commit",
        "title": "Three-Phase Commit",
        "icon": "3️⃣",
        "built": false
      },
      {
        "slug": "consensus",
        "title": "Consensus",
        "icon": "🏛️",
        "built": false
      },
      {
        "slug": "raft-concepts",
        "title": "Raft Concepts",
        "icon": "🐟",
        "built": false
      },
      {
        "slug": "network-partition",
        "title": "Network Partition",
        "icon": "🌩️",
        "built": false
      },
      {
        "slug": "split-brain",
        "title": "Split-Brain",
        "icon": "🧠",
        "built": false
      },
      {
        "slug": "distributed-recovery",
        "title": "Distributed Recovery",
        "icon": "🔄",
        "built": false
      }
    ]
  },
  {
    "n": "06",
    "name": "Data-Intensive (DDIA)",
    "items": [
      {
        "slug": "replication-models",
        "title": "Replication Models",
        "icon": "📖",
        "built": false
      },
      {
        "slug": "partitioning-strategies",
        "title": "Partitioning Strategies",
        "icon": "🗺️",
        "built": false
      },
      {
        "slug": "transactions-at-scale",
        "title": "Transactions at Scale",
        "icon": "💳",
        "built": false
      },
      {
        "slug": "consistency-and-consensus",
        "title": "Consistency & Consensus",
        "icon": "⚖️",
        "built": false
      },
      {
        "slug": "batch-processing",
        "title": "Batch Processing",
        "icon": "🏭",
        "built": false
      },
      {
        "slug": "stream-processing",
        "title": "Stream Processing",
        "icon": "🌊",
        "built": false
      },
      {
        "slug": "event-logs",
        "title": "Event Logs",
        "icon": "📜",
        "built": false
      },
      {
        "slug": "derived-data",
        "title": "Derived Data",
        "icon": "🔄",
        "built": false
      },
      {
        "slug": "data-integration",
        "title": "Data Integration",
        "icon": "🔗",
        "built": false
      },
      {
        "slug": "cdc",
        "title": "CDC",
        "icon": "🔄",
        "built": false
      },
      {
        "slug": "materialized-views",
        "title": "Materialized Views",
        "icon": "👁️",
        "built": false
      },
      {
        "slug": "dataflow-architecture",
        "title": "Dataflow Architecture",
        "icon": "🌊",
        "built": false
      },
      {
        "slug": "modern-data-systems",
        "title": "Modern Data Systems",
        "icon": "🚀",
        "built": false
      },
      {
        "slug": "oltp-cdc-kafka-stream-olap",
        "title": "OLTP→CDC→Kafka→OLAP",
        "icon": "🔗",
        "built": false
      }
    ]
  },
  {
    "n": "07",
    "name": "Interactive Labs",
    "items": [
      {
        "slug": "follow-the-query",
        "title": "Follow the Query",
        "icon": "🔍",
        "built": false
      },
      {
        "slug": "follow-the-write",
        "title": "Follow the Write",
        "icon": "✍️",
        "built": false
      },
      {
        "slug": "follow-the-transaction",
        "title": "Follow the Transaction",
        "icon": "💳",
        "built": false
      },
      {
        "slug": "crash-recovery-lab",
        "title": "Crash Recovery Lab",
        "icon": "💥",
        "built": false
      },
      {
        "slug": "bplus-tree-lab",
        "title": "B+ Tree Lab",
        "icon": "🌳",
        "built": false
      },
      {
        "slug": "lsm-lab",
        "title": "LSM Lab",
        "icon": "📚",
        "built": false
      },
      {
        "slug": "buffer-pool-lab",
        "title": "Buffer Pool Lab",
        "icon": "🏊",
        "built": false
      },
      {
        "slug": "query-optimizer-lab",
        "title": "Query Optimizer Lab",
        "icon": "🎯",
        "built": false
      },
      {
        "slug": "concurrency-lab",
        "title": "Concurrency Lab",
        "icon": "⚡",
        "built": false
      },
      {
        "slug": "replication-lab",
        "title": "Replication Lab",
        "icon": "🔁",
        "built": false
      },
      {
        "slug": "partitioning-lab",
        "title": "Partitioning Lab",
        "icon": "🗺️",
        "built": false
      },
      {
        "slug": "consensus-lab",
        "title": "Consensus Lab",
        "icon": "🗳️",
        "built": false
      },
      {
        "slug": "distributed-failure-lab",
        "title": "Distributed Failure Lab",
        "icon": "🌩️",
        "built": false
      },
      {
        "slug": "end-to-end-db-simulator",
        "title": "End-to-End DB Simulator",
        "icon": "🖥️",
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
        "slug": "db-internals-roadmap",
        "title": "DB Internals Roadmap",
        "icon": "🛣️",
        "built": false
      },
      {
        "slug": "book-concept-mapping",
        "title": "Book Concept Mapping",
        "icon": "📚",
        "built": false
      },
      {
        "slug": "cheat-sheet",
        "title": "Cheat Sheet",
        "icon": "📝",
        "built": false
      },
      {
        "slug": "interview-center",
        "title": "Interview Center",
        "icon": "💼",
        "built": false
      },
      {
        "slug": "mock-interview",
        "title": "Mock Interview",
        "icon": "🎤",
        "built": false
      },
      {
        "slug": "quiz",
        "title": "Quiz",
        "icon": "🧪",
        "built": false
      },
      {
        "slug": "glossary",
        "title": "Glossary",
        "icon": "📖",
        "built": false
      }
    ]
  }
];
export const TOTAL = 133;
export const BUILT_COUNT = 2;
