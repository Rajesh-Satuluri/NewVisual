// Cheat-sheet — the whole mental model on printable quick-reference cards:
// CLI commands, key configs, delivery semantics, retention, and rules of thumb.

const CARDS = [
  {
    icon: '⌨️', title: 'Topic & CLI basics', m: 'm02',
    rows: [
      ['Create topic', 'kafka-topics --create --topic orders --partitions 6 --replication-factor 3'],
      ['List topics', 'kafka-topics --list --bootstrap-server localhost:9092'],
      ['Describe topic', 'kafka-topics --describe --topic orders'],
      ['Add partitions', 'kafka-topics --alter --topic orders --partitions 12'],
      ['Console produce', 'kafka-console-producer --topic orders'],
      ['Console consume', 'kafka-console-consumer --topic orders --from-beginning'],
    ],
  },
  {
    icon: '👥', title: 'Consumer groups & lag', m: 'm08',
    rows: [
      ['List groups', 'kafka-consumer-groups --list'],
      ['Describe (lag)', 'kafka-consumer-groups --describe --group billing'],
      ['Reset to earliest', 'kafka-consumer-groups --reset-offsets --to-earliest --topic orders --execute'],
      ['Reset to timestamp', '--reset-offsets --to-datetime 2024-01-15T00:00:00 --execute'],
      ['Watch lag', 'LAG = log-end-offset − current-offset'],
    ],
  },
  {
    icon: '⚡', title: 'Producer configs', m: 'm04',
    rows: [
      ['acks', '0 = fast/lossy · 1 = leader only · all = full durability'],
      ['enable.idempotence', 'true → no duplicates on retry (default in 3.x)'],
      ['linger.ms', 'wait to fill batches — higher = throughput, more latency'],
      ['batch.size', 'max bytes per partition batch (e.g. 32–64 KB)'],
      ['compression.type', 'lz4 / zstd / snappy — big network + disk win'],
      ['max.in.flight...', '≤5 with idempotence to preserve ordering'],
    ],
  },
  {
    icon: '📥', title: 'Consumer configs', m: 'm09',
    rows: [
      ['group.id', 'shared id → partitions divided across members'],
      ['enable.auto.commit', 'false for at-least-once with manual commits'],
      ['auto.offset.reset', 'earliest / latest / none (no committed offset)'],
      ['max.poll.records', 'batch size per poll() — tune for processing time'],
      ['max.poll.interval.ms', 'exceed it → member kicked, rebalance fires'],
      ['isolation.level', 'read_committed to honor transactions (EOS)'],
    ],
  },
  {
    icon: '🖥️', title: 'Broker & durability', m: 'm07',
    rows: [
      ['default.replication.factor', '3 for production (tolerates 2 failures)'],
      ['min.insync.replicas', '2 with RF=3 — the durability sweet spot'],
      ['unclean.leader.election', 'false — never elect a lagging replica (no data loss)'],
      ['num.partitions', 'default per topic; plan for peak parallelism'],
      ['log.retention.hours', 'time-based retention (default 168 = 7 days)'],
    ],
  },
  {
    icon: '🗑️', title: 'Retention & compaction', m: 'm10',
    rows: [
      ['cleanup.policy=delete', 'drop segments past retention.ms / retention.bytes'],
      ['cleanup.policy=compact', 'keep latest value per key (changelog)'],
      ['compact,delete', 'compact AND age out — common for changelogs'],
      ['segment.ms / .bytes', 'roll a new segment by time or size'],
      ['Tombstone', 'key + null value → deletes key after delete.retention.ms'],
    ],
  },
  {
    icon: '🛡️', title: 'Delivery semantics', m: 'm11', wide: true,
    table: {
      head: ['Guarantee', 'How', 'Trade-off'],
      body: [
        ['At-most-once', 'commit offset before processing', 'may lose records, never duplicate'],
        ['At-least-once', 'commit after processing (default)', 'never lose, may duplicate'],
        ['Exactly-once', 'idempotent producer + transactions, read_committed', 'no loss, no dupes; more overhead'],
      ],
    },
  },
  {
    icon: '📐', title: 'Rules of thumb', m: 'm17',
    rows: [
      ['Ordering', 'guaranteed only within a partition — key by entity id'],
      ['Parallelism', 'max consumers in a group = partition count'],
      ['Partition count', 'hard to reduce; over-provision a little, not 10×'],
      ['Hot partition', 'skewed keys → one partition saturates; re-key or salt'],
      ['Sizing', 'target ~throughput / per-partition throughput, round up'],
      ['Rebalance pain', 'use cooperative-sticky assignor to avoid stop-the-world'],
    ],
  },
];

export function mount(container) {
  const card = c => {
    const body = c.table
      ? `<div class="compare-table-wrap"><table class="compare-table cheat-table">
           <thead><tr>${c.table.head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
           <tbody>${c.table.body.map(r => `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
         </table></div>`
      : `<dl class="cheat-rows">${c.rows.map(([k, v]) =>
          `<div class="cheat-row"><dt>${k}</dt><dd><code>${v}</code></dd></div>`).join('')}</dl>`;
    return `
      <section class="cheat-card${c.wide ? ' cheat-card-wide' : ''}">
        <header class="cheat-card-head">
          <span class="cheat-card-icon">${c.icon}</span>
          <h3 class="cheat-card-title">${c.title}</h3>
          <a class="cheat-card-link" href="#${c.m}" title="Open module">↗</a>
        </header>
        ${body}
      </section>`;
  };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">📋 · Reference · Amazon Edition</div>
        <h1 class="module-title">Cheat Sheet</h1>
        <p class="module-subtitle">The whole Kafka mental model on one page — CLI, the configs that matter, delivery semantics, and rules of thumb. Print it (⌘/Ctrl-P) and keep it by the terminal.</p>
      </div>
      <div class="cheat-grid">
        ${CARDS.map(card).join('')}
      </div>
    </div>`;

  return () => {};
}
