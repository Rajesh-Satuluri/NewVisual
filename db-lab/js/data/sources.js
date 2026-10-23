/* ============================================================
   sources.js — verification ledger (DBLab.sources).

   One record per important technical claim, with a traceable source,
   the engine/version it applies to, whether it is generic or
   implementation-specific, how it was verified, and the review date.
   The References component surfaces these in lessons. Loaded as a
   classic script (window.DBLab.sources), matching the rest of js/data.

   Record shape:
     { id, claim, url, section, engine, version, scope, verifiedBy, reviewed }
     scope:     "generic" (true of the technique) | "specific" (this engine)
     verifiedBy:"doc" | "paper" | "course" | "source" | "experiment"
     reviewed:  ISO date the claim was last checked against the source
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});

  DL.sources = [
    {
      id: "cmu-15445",
      claim: "Carnegie Mellon 15-445/645 Database Systems is the primary course reference for storage, indexing, query execution, concurrency control and recovery.",
      url: "https://15445.courses.cs.cmu.edu/",
      section: "Course schedule & lecture notes",
      engine: "—", version: "Fall 2024", scope: "generic",
      verifiedBy: "course", reviewed: "2026-10-15",
    },
    {
      id: "pg-mvcc",
      claim: "PostgreSQL implements MVCC: an UPDATE writes a new row version rather than overwriting in place, and each transaction reads from a snapshot — so readers never block writers and writers never block readers.",
      url: "https://www.postgresql.org/docs/current/mvcc-intro.html",
      section: "13.1 Introduction (Concurrency Control)",
      engine: "PostgreSQL", version: "current", scope: "specific",
      verifiedBy: "doc", reviewed: "2026-10-15",
    },
    {
      id: "pg-wal",
      claim: "PostgreSQL uses write-ahead logging: records describing a change are flushed to durable WAL before the modified data pages are written, so a committed transaction survives a crash via redo.",
      url: "https://www.postgresql.org/docs/current/wal-intro.html",
      section: "30.3 Write-Ahead Logging (WAL)",
      engine: "PostgreSQL", version: "current", scope: "specific",
      verifiedBy: "doc", reviewed: "2026-10-15",
    },
    {
      id: "pg-vacuum",
      claim: "Dead row versions from UPDATE/DELETE are reclaimed by VACUUM rather than immediately; a long-running transaction holds back the removable-row horizon and can prevent cleanup (bloat).",
      url: "https://www.postgresql.org/docs/current/routine-vacuuming.html",
      section: "25.1 Routine Vacuuming",
      engine: "PostgreSQL", version: "current", scope: "specific",
      verifiedBy: "doc", reviewed: "2026-10-15",
    },
    {
      id: "sqlite-fileformat",
      claim: "An SQLite database is a single file divided into fixed-size pages; page 1 begins with a 100-byte header, and each table or index is stored as a B-tree of pages.",
      url: "https://www.sqlite.org/fileformat.html",
      section: "1.2 The Database Header / 1.6 B-tree Pages",
      engine: "SQLite", version: "3.x", scope: "specific",
      verifiedBy: "doc", reviewed: "2026-10-15",
    },
    {
      id: "sqlite-wal",
      claim: "In WAL mode, SQLite appends committed frames to a -wal file and periodically checkpoints them back into the main database file rather than writing changes in place at commit.",
      url: "https://sqlite.org/walformat.html",
      section: "WAL File Format / Checkpointing",
      engine: "SQLite", version: "3.x", scope: "specific",
      verifiedBy: "doc", reviewed: "2026-10-15",
    },
    {
      id: "rocksdb-arch",
      claim: "RocksDB is an LSM-tree store: writes land in an in-memory MemTable plus a WAL, are flushed to immutable sorted SSTable files, and background compaction merges SSTables across levels.",
      url: "https://github.com/facebook/rocksdb/wiki/Rocksdb-Architecture-Guide",
      section: "Architecture overview",
      engine: "RocksDB", version: "wiki", scope: "specific",
      verifiedBy: "doc", reviewed: "2026-10-15",
    },
    {
      id: "lsm-bloom",
      claim: "LSM engines keep a Bloom filter per SSTable so a point lookup can skip files that certainly do not contain the key — Bloom filters have no false negatives and a tunable false-positive rate.",
      url: "https://github.com/facebook/rocksdb/wiki/RocksDB-Bloom-Filter",
      section: "Full Filter / false-positive rate",
      engine: "RocksDB", version: "wiki", scope: "specific",
      verifiedBy: "doc", reviewed: "2026-10-15",
    },
    {
      id: "raft",
      claim: "Raft elects at most one leader per term; clients write through the leader, which replicates log entries and marks an entry committed once it is stored on a majority of servers.",
      url: "https://raft.github.io/raft.pdf",
      section: "§5.2 Leader election / §5.3 Log replication",
      engine: "Raft (algorithm)", version: "extended paper", scope: "generic",
      verifiedBy: "paper", reviewed: "2026-10-15",
    },
    {
      id: "mit-6584",
      claim: "MIT 6.5840 Distributed Systems is the reference course for replication, consensus (Raft), fault tolerance and distributed transactions.",
      url: "https://pdos.csail.mit.edu/6.5840/",
      section: "Schedule & lecture notes",
      engine: "—", version: "2024", scope: "generic",
      verifiedBy: "course", reviewed: "2026-10-15",
    },
  ];

  /** Look up a source record by id (used by the References component). */
  DL.source = function (id) {
    var all = DL.sources || [];
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  };
})();
