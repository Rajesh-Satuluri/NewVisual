export default {
  id: "small-file-compaction",
  title: "The small-file problem & compaction",
  icon: "🧩",
  chapter: 9,
  group: "Storage & table formats",
  summary: "Streaming ingestion and frequent writes produce millions of tiny files. Each file carries fixed overhead — listing, opening, metadata, a task to schedule — so a table of tiny files is slow and expensive to query no matter how little data it holds. Compaction merges them into right-sized files and restores performance.",
  widget: "de-compaction",
  widgetIntro: "Every file a query reads has **fixed costs**: the engine must list it, open it, read its footer, and schedule a task for it. With a few huge files that overhead is negligible; with a million tiny files it dominates, and the job spends its time on bookkeeping instead of data. This is the **small-file problem**.\n\nWatch streaming ingestion scatter tiny files, then run **compaction** to merge them into a handful of right-sized files — and see the scan overhead drop. It’s the single most common lake-maintenance task.",
  sections: [
    {
      title: "Where small files come from",
      body: "They're a natural by-product of how data lands. Streaming sinks commit every few seconds, each writing a small file. Over-partitioning scatters rows into many near-empty directories. Frequent CDC/upsert commits and per-event writes all add tiny files. Nobody creates them on purpose — they accumulate.",
      bullets: [
        "**Streaming:** a commit every N seconds → one small file each.",
        "**Over-partitioning:** too-granular keys → many tiny partition files.",
        "**Frequent upserts/CDC:** each commit writes small deltas.",
      ],
    },
    {
      title: "Why they're slow",
      body: "The cost of a query isn't just bytes — it's per-file overhead. Listing a directory of a million files is slow. Each file means a metadata read, an open, and a scheduled task; with files far below the ideal size, scheduling and I/O setup swamp the actual reading. Columnar benefits (row groups, compression) also shrink when files are tiny.",
      rules: ["Query cost ≈ bytes + (per-file overhead × file count) — tiny files blow up the second term."],
    },
    {
      title: "Right-sizing files",
      body: "The target is files large enough that per-file overhead is negligible but small enough for parallelism — commonly **~128MB to 1GB** each. Compaction rewrites many small files into fewer files of that size (and can sort/cluster them at the same time to help push-down).",
      flow: ["millions of tiny files", "compaction (rewrite)", "fewer ~128MB–1GB files"],
    },
    {
      title: "Compaction in practice",
      body: "On a table format (Delta/Iceberg/Hudi) compaction is a maintenance operation (e.g. `OPTIMIZE`, bin-packing, or auto-compaction) that atomically replaces small files with compacted ones — queries keep running against the old snapshot until the new commit lands. You schedule it periodically, or let the engine trigger it, trading write amplification for read speed.",
      bullets: [
        "Runs as an atomic commit — no downtime, readers unaffected mid-compaction.",
        "Often paired with sorting/clustering and snapshot expiry + vacuum.",
        "Trade-off: compaction rewrites data (write cost) to make reads cheap.",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Small files are the tax on low-latency ingestion. The design question is how to pay it: compact after the fact, or avoid creating them.",
  deepDive: [
    {
      title: "The streaming latency ↔ file size tension",
      body: "The fresher you want data, the more often you commit, and the smaller each file is. Very low-latency streaming inherently produces small files, so you either accept a compaction job behind it or batch the writes slightly (micro-batch) to make bigger files up front. There's no free lunch between freshness and file size.",
      stats: [
        { value: "~128MB–1GB", label: "target file size", tone: "green" },
        { value: "per-file", label: "list + open + task overhead", tone: "amber" },
        { value: "OPTIMIZE", label: "compaction / bin-packing", tone: "accent" },
        { value: "atomic", label: "commit swaps small → big", tone: "blue" },
      ],
    },
    {
      title: "Avoid, then compact",
      body: "Reduce creation first: right-size the partition grain, micro-batch streaming writes, and avoid partitioning by high-cardinality keys. Then run compaction for what's left. Pair it with snapshot expiry and vacuum so the old small files are actually reclaimed — compaction that never vacuums just doubles your storage.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Small files are per-file overhead × count. I right-size partitions and micro-batch to create fewer, then schedule compaction (OPTIMIZE) to bin-pack to ~128MB–1GB, with snapshot expiry + vacuum to reclaim the originals. Freshness vs file size is the real trade-off.\"" },
    },
  ],
  qa: [
    {
      q: "What is the small-file problem and why does it hurt?",
      a: "It's when a table is made of a huge number of tiny files. Query cost isn't only the bytes read — each file carries fixed overhead: directory listing, a metadata/footer read, opening the file, and scheduling a task for it. With millions of tiny files that overhead dominates, so the job spends its time on bookkeeping rather than data, and columnar advantages shrink because row groups and compression need reasonably sized files. The table is slow and expensive regardless of how little data it actually holds.",
      tip: "Frame cost as 'bytes + per-file overhead × file count' — tiny files explode the second term.",
    },
    {
      q: "Where do small files come from and how do you prevent them?",
      a: "Mainly from low-latency writes: streaming sinks committing every few seconds, frequent CDC/upsert commits, and over-partitioning on high-cardinality keys that scatters rows into near-empty directories. Prevention is right-sizing the partition grain, micro-batching streaming writes so each commit produces a bigger file, and not partitioning by things like user_id. Whatever small files remain, you clean up with compaction.",
      tip: "Name the three sources (streaming, frequent commits, over-partitioning) and the 'avoid then compact' strategy.",
    },
    {
      q: "What is compaction and how does it run without downtime?",
      a: "Compaction rewrites many small files into fewer right-sized files (commonly ~128MB–1GB), often sorting/clustering them at the same time. On a table format it runs as a maintenance operation (OPTIMIZE / bin-packing) that commits atomically: it stages the new compacted files, then swaps the metadata to a new snapshot, so queries keep reading the old snapshot until the instant the new one lands. You then expire old snapshots and vacuum to reclaim the original small files. It trades extra write work for much cheaper reads.",
      tip: "Stress the atomic commit (no downtime) plus pairing with vacuum to actually reclaim the small files.",
    },
  ],
  related: [],
};
