export default {
  id: "google-drive",
  title: "Design Google Drive",
  icon: "📁",
  chapter: 15,
  group: "Scale & media",
  summary: "Store, sync, and share files across a user's devices. The interesting parts are chunked/resumable upload, efficient sync of only what changed, block-level deduplication, and keeping file metadata separate from the file bytes.",
  sections: [
    {
      title: "Requirements",
      body: "Upload/download files, sync them across devices, share with others, and keep revision history — reliably and storage-efficiently.",
      bullets: [
        "Upload/download, with large files and flaky networks handled gracefully.",
        "Sync changes across a user's devices quickly.",
        "Sharing & permissions; file versioning.",
        "Storage efficiency (don't store the same bytes twice) and strong durability.",
      ],
    },
    {
      title: "Split metadata from blocks",
      body: "As with most storage systems, separate the two concerns. **Metadata** (file name, path, owner, permissions, version, list of block hashes) lives in a database. **File content** is split into **blocks** (e.g. 4 MB chunks) stored in object/blob storage, each addressed by a hash of its contents.",
      rules: ["Metadata DB (file → ordered list of block hashes) + blocks in object storage (hash-addressed)."],
      flow: ["File", "Split into blocks", "Hash each block", "Store blocks in blob storage", "Metadata = ordered block hashes"],
    },
    {
      title: "Chunked & resumable upload",
      body: "Large files over unreliable networks must upload in pieces. Split the file into blocks and upload each independently; if the connection drops, resume only the missing blocks instead of restarting. Blocks can upload in parallel, and the server assembles the file from the block list once all are present.",
    },
    {
      title: "Block-level deduplication & delta sync",
      body: "Because blocks are addressed by content hash, identical blocks are stored once — across versions and even across users. This gives two big wins:",
      bullets: [
        "**Dedup:** re-uploading a file that shares blocks with an existing one stores only the new blocks.",
        "**Delta sync:** when a file changes, only the changed blocks are uploaded/downloaded, not the whole file — crucial for large files edited slightly.",
      ],
      body2: "Editing one paragraph of a huge document transfers only the affected block(s).",
    },
    {
      title: "Sync across devices",
      body: "Each client watches for local changes and talks to a sync service. When a device makes a change, it uploads the new blocks and updates metadata; other devices learn of the change (via long-poll/WebSocket notification or polling) and download only the changed blocks. A per-file version/revision number orders changes and detects conflicts.",
      flow: ["Device A edits", "Upload changed blocks + bump version", "Notify other devices", "Device B pulls changed blocks"],
    },
    {
      title: "Conflicts, versioning & sharing",
      body: "Two devices editing offline can conflict; resolve with versioning — keep both versions (e.g. 'conflicted copy') or use last-write-wins with history so nothing is lost. Versioning falls out naturally from immutable, hash-addressed blocks (a version is just a different block list). Sharing is an access-control layer over metadata (who can read/write which files).",
    },
  ],
  qa: [
    {
      q: "How do you store files efficiently and sync only what changed?",
      a: "Split each file into fixed-size blocks and address each block by the hash of its contents; store blocks in object storage and keep an ordered list of block hashes in the metadata DB. Because blocks are content-addressed, identical blocks are stored once (dedup across versions and users). When a file changes, you diff the block lists and upload/download only the changed blocks — delta sync — so editing a small part of a large file transfers almost nothing.",
      tip: "Content-addressed blocks are the unlock: they give dedup and delta sync for free. That's the core insight.",
    },
    {
      q: "How do you handle uploading a large file over an unreliable connection?",
      a: "Chunked, resumable upload: split the file into blocks and upload each independently (and in parallel). Track which blocks the server already has, so a dropped connection resumes by sending only the missing blocks rather than restarting. Once all blocks are present, the server finalizes the file by recording the ordered block list in metadata.",
      tip: "Resumability by re-sending only missing blocks is the detail that shows you've thought about real-world flaky networks.",
    },
    {
      q: "How does sync work across a user's devices, and how do you handle conflicts?",
      a: "A sync service is the source of truth. When a device changes a file, it uploads changed blocks and bumps the file's version; other devices are notified (push via WebSocket/long-poll, or polling) and pull only the changed blocks. Conflicts (two devices editing the same version offline) are detected via the version number and resolved by keeping both versions ('conflicted copy') or last-write-wins with full history — immutable block lists make every version recoverable.",
      tip: "Versioning + 'keep both on conflict' avoids data loss; immutable hash-addressed blocks make history cheap.",
    },
    {
      q: "Why separate metadata from the file bytes?",
      a: "They have opposite characteristics. Metadata is small, highly structured, frequently queried and updated (names, paths, permissions, versions, block lists) — a database job. File bytes are large, immutable blobs best kept in object storage built for cheap, durable, high-throughput blob access. Splitting them lets each scale and be optimized independently, and lets metadata reference blocks by hash for dedup.",
      tip: "Same principle as YouTube/S3: structured metadata in a DB, big immutable bytes in blob storage.",
    },
  ],
  related: [
    "how-do-i-safely-backfill-data-in-production",
    "how-do-i-handle-read-your-own-writes-in-a-distributed-system",
    "how-do-i-reconcile-divergent-data-across-systems",
    "when-do-i-accept-eventual-consistency-vs-strict-consistency",
    "how-do-i-design-soft-delete-archival-and-retention",
  ],
};
