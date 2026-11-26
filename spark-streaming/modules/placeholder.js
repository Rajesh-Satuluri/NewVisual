// Shared placeholder for every planned-but-not-yet-built route.
// Reads the active route from the hash, looks up its nav metadata, and renders
// a themed "planned" page via the shared module shell so the full information
// architecture is navigable while content is filled in iteration by iteration.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { getNavItem, MODULES } from '../components/nav.js';

// Per-route planning blurbs: what each page will teach once built.
const PLAN = {
  m01: 'Why Structured Streaming exists — the unbounded-table mental model, how it supersedes the legacy DStream (RDD) API, and where it fits next to Flink and Kafka Streams.',
  m02: 'The core abstraction: a stream as an ever-growing input table, a query as an incremental view, and the result table that Spark maintains for you.',
  m03: 'Driver, executors, the micro-batch query planner, the state store, and the checkpoint/offset log — how the pieces fit at runtime.',
  m04: 'Streaming sources (Kafka, file, rate, socket), schema inference vs explicit schema, and starting offsets.',
  m05: 'The micro-batch execution model and every trigger: default, fixed-interval, availableNow, and once — with exact batch-planning semantics.',
  m06: 'Continuous processing mode: millisecond latency, its at-least-once guarantee, and what it cannot yet do.',
  m07: 'Event time vs processing time, why event time is the honest clock, and how late and out-of-order data arrive.',
  m08: 'Watermarks: the exact rule (max event time seen − delay), monotonicity, and how they bound state and drop late data.',
  m09: 'Tumbling, sliding, and session windows — how rows are assigned and when a window is finalized.',
  m10: 'Keyed stateful aggregations, the state store, and watermark-driven state eviction.',
  m11: 'Arbitrary stateful processing with flatMapGroupsWithState / mapGroupsWithState and timeouts.',
  m12: 'Output modes — append, update, complete — and the exact rows each emits per micro-batch.',
  m13: 'Deduplication with dropDuplicates and dropDuplicatesWithinWatermark.',
  m14: 'Sinks (Kafka, file, Delta, console, memory) and the foreachBatch escape hatch for idempotent writes.',
  m15: 'Checkpointing and the write-ahead offset/commit log that makes recovery deterministic.',
  m16: 'End-to-end fault tolerance and the conditions for exactly-once vs at-least-once.',
  m17: 'Stream–static joins and how the static side is re-read.',
  m18: 'Stream–stream joins with watermark + time-range constraints and state cleanup.',
  m19: 'Writing to a Delta Lake sink, MERGE/upserts via foreachBatch, and CDC output.',
  m20: 'Performance & tuning: the RocksDB state store, shuffle partitions, maxOffsetsPerTrigger, and state TTL.',
  m21: 'Monitoring: StreamingQueryProgress metrics and StreamingQueryListener.',
  m22: 'The ShopStream capstone — an end-to-end orders + clickstream pipeline tying every concept together.',
  dashboard: 'Your learning dashboard — progress, mastery analytics, and what to study next.',
  'learning-path': 'A guided "start here" path through the curriculum in the right order.',
  search: 'Global search across every module, config key, and glossary term.',
  'master-map': 'A single map of every Structured Streaming concept and how they connect.',
  comparison: 'Structured Streaming vs Flink vs Kafka Streams vs legacy DStreams — side by side.',
  glossary: 'Every term, defined — watermark, trigger, state store, offset log, and more.',
  cheatsheet: 'The one-page PySpark / Scala Structured Streaming cheat sheet.',
  'config-reference': 'Every important config key, what it does, and sane defaults.',
  'microbatch-lab': 'Interactive: feed records through a trigger and watch exactly how micro-batches are planned.',
  'watermark-lab': 'Interactive: drag event times and the watermark delay, and watch late data get dropped.',
  'output-mode-lab': 'Interactive: compare append vs update vs complete on the same windowed aggregation.',
  review: 'Spaced-repetition review of everything you have learned.',
  study: 'The study hub — notes, bookmarks, and interview-prep drills.',
};

export function mount(container) {
  const id = (location.hash || '').replace(/^#/, '').split(/[?&/]/)[0] || 'home';
  const item = getNavItem(id) || { title: 'Coming soon', icon: '🧭', group: 'Spark Structured Streaming' };
  const isModule = MODULES.some(m => m.id === id);
  const plan = PLAN[id] || 'This section is part of the planned curriculum and will be built in an upcoming iteration.';

  container.innerHTML = createModuleShell({
    tag: `${item.group}${isModule ? ` · ${item.num}` : ''}`,
    title: `${item.icon} ${item.title}`,
    subtitle: 'Planned — scaffolded and wired, content coming in an upcoming iteration.',
    tabs: [
      {
        id: 'about',
        label: 'What this will cover',
        content: `
          <div class="callout callout-info" style="margin-bottom:18px">
            <strong>🚧 Scaffold</strong> — the app shell, navigation, routing, theming and
            progress are live. This page is a placeholder so you can see the full
            structure now; the real content lands iteration by iteration.
          </div>
          <p style="font-size:16px;line-height:1.7;max-width:70ch">${plan}</p>
        `,
      },
      {
        id: 'depth',
        label: 'How it will be built',
        content: `
          <p style="font-size:15px;line-height:1.7;max-width:72ch">Every module is built at the
          same depth as the Kafka and Flink tools:</p>
          <ul style="font-size:15px;line-height:1.9;max-width:72ch">
            <li><strong>One running story</strong> — the <em>ShopStream</em> e-commerce
                orders + clickstream pipeline threads through every concept.</li>
            <li><strong>Verified code</strong> — real, runnable PySpark and Scala
                Structured Streaming snippets, with copy + in-place edit.</li>
            <li><strong>A real deterministic engine</strong> — the micro-batch /
                watermark / output-mode simulator (unit-tested in Node), the honest
                keystone that powers the interactive labs.</li>
            <li><strong>Interview surface</strong> — per-module Q&amp;A, quizzes,
                self-explain, decision drills, and incident labs.</li>
          </ul>
        `,
      },
    ],
  });

  initTabs(container);
  return null;
}
