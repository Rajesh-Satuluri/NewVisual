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
        "built": true
      },
      {
        "slug": "dbms-architecture",
        "title": "DBMS Architecture",
        "icon": "🏗️",
        "built": true
      },
      {
        "slug": "data-models",
        "title": "Data Models",
        "icon": "📐",
        "built": true
      },
      {
        "slug": "relational-model",
        "title": "Relational Model",
        "icon": "📊",
        "built": true
      },
      {
        "slug": "relational-algebra",
        "title": "Relational Algebra",
        "icon": "➕",
        "built": true
      },
      {
        "slug": "sql-relational-algebra",
        "title": "SQL → Relational Algebra",
        "icon": "🔗",
        "built": true
      },
      {
        "slug": "schema-constraints",
        "title": "Schema & Constraints",
        "icon": "🔒",
        "built": true
      },
      {
        "slug": "storage-hierarchy",
        "title": "Storage Hierarchy",
        "icon": "💾",
        "built": true
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
        "built": true
      },
      {
        "slug": "parse-tree",
        "title": "Parse Tree",
        "icon": "🌳",
        "built": true
      },
      {
        "slug": "ast",
        "title": "AST",
        "icon": "🧬",
        "built": true
      },
      {
        "slug": "query-analysis",
        "title": "Query Analysis",
        "icon": "🔎",
        "built": true
      },
      {
        "slug": "logical-plan",
        "title": "Logical Plan",
        "icon": "📋",
        "built": true
      },
      {
        "slug": "physical-plan",
        "title": "Physical Plan",
        "icon": "⚙️",
        "built": true
      },
      {
        "slug": "query-optimization",
        "title": "Query Optimization",
        "icon": "🎯",
        "built": true
      },
      {
        "slug": "cost-based-optimization",
        "title": "Cost-Based Optimization",
        "icon": "💰",
        "built": true
      },
      {
        "slug": "table-scan",
        "title": "Table Scan",
        "icon": "🔄",
        "built": true
      },
      {
        "slug": "index-scan",
        "title": "Seq Scan vs Index Scan",
        "icon": "📑",
        "built": true
      },
      {
        "slug": "nested-loop-join",
        "title": "Nested Loop Join",
        "icon": "🔁",
        "built": true
      },
      {
        "slug": "hash-join",
        "title": "Join Algorithms",
        "icon": "🔗",
        "built": true
      },
      {
        "slug": "sort-merge-join",
        "title": "Sort-Merge Join",
        "icon": "🔀",
        "built": true
      },
      {
        "slug": "aggregation",
        "title": "Aggregation",
        "icon": "📈",
        "built": true
      },
      {
        "slug": "query-execution",
        "title": "Query Execution",
        "icon": "▶️",
        "built": true
      },
      {
        "slug": "query-plan-comparator",
        "title": "Query Plan Comparator",
        "icon": "⚖️",
        "built": true
      },
      {
        "slug": "explain-analyze",
        "title": "EXPLAIN ANALYZE",
        "icon": "🔍",
        "built": true
      },
      {
        "slug": "parallel-query",
        "title": "Parallel Query",
        "icon": "⚡",
        "built": true
      },
      {
        "slug": "query-statistics",
        "title": "Query Statistics",
        "icon": "📈",
        "built": true
      },
      {
        "slug": "cost-model",
        "title": "Cost Model",
        "icon": "💰",
        "built": true
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
        "built": true
      },
      {
        "slug": "pages",
        "title": "Pages",
        "icon": "📄",
        "built": true
      },
      {
        "slug": "records-tuples",
        "title": "Records & Tuples",
        "icon": "📦",
        "built": true
      },
      {
        "slug": "slotted-pages",
        "title": "Slotted Pages",
        "icon": "🧩",
        "built": true
      },
      {
        "slug": "buffer-pool",
        "title": "Buffer Pool",
        "icon": "🏊",
        "built": true
      },
      {
        "slug": "buffer-pool-replacement",
        "title": "Buffer Pool Replacement",
        "icon": "♻️",
        "built": true
      },
      {
        "slug": "page-cache",
        "title": "Page Cache",
        "icon": "💭",
        "built": true
      },
      {
        "slug": "disk-io",
        "title": "Disk I/O",
        "icon": "💿",
        "built": true
      },
      {
        "slug": "sequential-vs-random-io",
        "title": "Sequential vs Random I/O",
        "icon": "⏩",
        "built": true
      },
      {
        "slug": "b-tree",
        "title": "B-Tree",
        "icon": "🌲",
        "built": true
      },
      {
        "slug": "b-plus-tree",
        "title": "B+ Tree",
        "icon": "🌳",
        "built": true
      },
      {
        "slug": "b-plus-tree-search",
        "title": "B+ Tree Search",
        "icon": "🔍",
        "built": true
      },
      {
        "slug": "b-plus-tree-insert",
        "title": "B+ Tree Insert",
        "icon": "➕",
        "built": true
      },
      {
        "slug": "b-plus-tree-delete",
        "title": "B+ Tree Delete",
        "icon": "➖",
        "built": true
      },
      {
        "slug": "b-plus-tree-root-split",
        "title": "B+ Tree Split",
        "icon": "✂️",
        "built": true
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
        "built": true
      },
      {
        "slug": "sstable",
        "title": "SSTable",
        "icon": "🗄️",
        "built": true
      },
      {
        "slug": "bloom-filter",
        "title": "Bloom Filter",
        "icon": "🌸",
        "built": true
      },
      {
        "slug": "lsm-compaction",
        "title": "LSM Compaction",
        "icon": "🗜️",
        "built": true
      },
      {
        "slug": "index-types",
        "title": "Index Types",
        "icon": "🗂️",
        "built": true
      },
      {
        "slug": "connection-pooling",
        "title": "Connection Pooling",
        "icon": "🔌",
        "built": true
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
        "built": true
      },
      {
        "slug": "wal",
        "title": "Write-Ahead Log (WAL)",
        "icon": "📝",
        "built": true
      },
      {
        "slug": "mvcc",
        "title": "MVCC",
        "icon": "📸",
        "built": true
      },
      {
        "slug": "locking",
        "title": "Locking & Deadlocks",
        "icon": "🔐",
        "built": true
      },
      {
        "slug": "vacuum",
        "title": "VACUUM",
        "icon": "🧹",
        "built": true
      },
      {
        "slug": "isolation-levels",
        "title": "Isolation Levels",
        "icon": "📊",
        "built": true
      },
      {
        "slug": "crash-recovery",
        "title": "Crash Recovery",
        "icon": "💥",
        "built": true
      },
      {
        "slug": "checkpoints",
        "title": "Checkpoints",
        "icon": "📍",
        "built": true
      },
      {
        "slug": "wal-internals",
        "title": "WAL Internals",
        "icon": "🔬",
        "built": true
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
        "built": true
      },
      {
        "slug": "partitioning",
        "title": "Partitioning",
        "icon": "🧩",
        "built": true
      },
      {
        "slug": "cap-theorem",
        "title": "CAP Theorem",
        "icon": "🎯",
        "built": true
      },
      {
        "slug": "two-phase-commit",
        "title": "Two-Phase Commit",
        "icon": "🤝",
        "built": true
      },
      {
        "slug": "consistent-hashing",
        "title": "Consistent Hashing",
        "icon": "⭕",
        "built": true
      },
      {
        "slug": "database-sharding",
        "title": "Database Sharding",
        "icon": "🗄️",
        "built": true
      },
      {
        "slug": "raft-consensus",
        "title": "Raft Consensus",
        "icon": "🗳️",
        "built": true
      },
      {
        "slug": "read-write-quorum",
        "title": "Read/Write Quorum",
        "icon": "🔢",
        "built": true
      },
      {
        "slug": "distributed-overview",
        "title": "Distributed DB",
        "icon": "🌐",
        "built": true
      },
      {
        "slug": "failure-modes",
        "title": "Nodes",
        "icon": "🖥️",
        "built": true
      },
      {
        "slug": "network-communication",
        "title": "Network Communication",
        "icon": "📡",
        "built": true
      },
      {
        "slug": "partial-failure",
        "title": "Partial Failure",
        "icon": "⚠️",
        "built": true
      },
      {
        "slug": "failure-detection",
        "title": "Failure Detection",
        "icon": "🔍",
        "built": true
      },
      {
        "slug": "heartbeats",
        "title": "Heartbeats",
        "icon": "💗",
        "built": true
      },
      {
        "slug": "leader-election",
        "title": "Leader Election",
        "icon": "👑",
        "built": true
      },
      {
        "slug": "multi-leader-replication",
        "title": "Multi-Leader Replication",
        "icon": "🔀",
        "built": true
      },
      {
        "slug": "synchronous-replication",
        "title": "Synchronous Replication",
        "icon": "🔄",
        "built": true
      },
      {
        "slug": "asynchronous-replication",
        "title": "Asynchronous Replication",
        "icon": "⏳",
        "built": true
      },
      {
        "slug": "quorum",
        "title": "Quorum",
        "icon": "🧮",
        "built": true
      },
      {
        "slug": "consistency",
        "title": "Consistency",
        "icon": "⚖️",
        "built": true
      },
      {
        "slug": "eventual-consistency",
        "title": "Eventual Consistency",
        "icon": "🌊",
        "built": true
      },
      {
        "slug": "strong-consistency",
        "title": "Strong Consistency",
        "icon": "💪",
        "built": true
      },
      {
        "slug": "read-repair",
        "title": "Read Repair",
        "icon": "🔧",
        "built": true
      },
      {
        "slug": "anti-entropy",
        "title": "Anti-Entropy",
        "icon": "🦠",
        "built": true
      },
      {
        "slug": "vertical-partitioning",
        "title": "Vertical Partitioning",
        "icon": "📚",
        "built": true
      },
      {
        "slug": "hash-partitioning",
        "title": "Hash Partitioning",
        "icon": "🔢",
        "built": true
      },
      {
        "slug": "range-partitioning",
        "title": "Range Partitioning",
        "icon": "📏",
        "built": true
      },
      {
        "slug": "virtual-nodes",
        "title": "Virtual Nodes",
        "icon": "🟣",
        "built": true
      },
      {
        "slug": "rebalancing",
        "title": "Rebalancing",
        "icon": "⚖️",
        "built": true
      },
      {
        "slug": "hot-partitions",
        "title": "Hot Partitions",
        "icon": "🔥",
        "built": true
      },
      {
        "slug": "distributed-transactions",
        "title": "Distributed Transactions",
        "icon": "🧾",
        "built": true
      },
      {
        "slug": "three-phase-commit",
        "title": "Three-Phase Commit",
        "icon": "3️⃣",
        "built": true
      },
      {
        "slug": "consensus",
        "title": "Consensus",
        "icon": "🏛️",
        "built": true
      },
      {
        "slug": "raft-concepts",
        "title": "Raft Concepts",
        "icon": "🐟",
        "built": true
      },
      {
        "slug": "network-partition",
        "title": "Network Partition",
        "icon": "🌩️",
        "built": true
      },
      {
        "slug": "split-brain",
        "title": "Split-Brain",
        "icon": "🧠",
        "built": true
      },
      {
        "slug": "distributed-recovery",
        "title": "Distributed Recovery",
        "icon": "🔄",
        "built": true
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
        "built": true
      },
      {
        "slug": "partitioning-strategies",
        "title": "Partitioning Strategies",
        "icon": "🗺️",
        "built": true
      },
      {
        "slug": "transactions-at-scale",
        "title": "Transactions at Scale",
        "icon": "💳",
        "built": true
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
export const BUILT_COUNT = 100;
