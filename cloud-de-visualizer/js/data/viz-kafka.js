/* ============================================================
   Conceptual visualizer: log partitions & consumer groups.

   Models a partitioned append-only log (Kafka / Event Hubs /
   Kinesis): how partitions give ordering + parallelism, how consumer
   groups share work by offset, and what rebalancing does. Conceptual
   only. Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  const partLog = (p, filled, label) => `<div class="viz-lane">
    <div class="viz-lane-h">Partition ${p}${label ? ' · ' + label : ''}</div>
    <div class="viz-row" style="justify-content:flex-start">${[0, 1, 2, 3, 4].map(i =>
      `<div class="viz-box ${i < filled ? 'is-done' : 'is-dim'}" style="min-width:34px;padding:7px 6px">${i}</div>`).join('')}</div>
  </div>`;

  TV.Viz.register({
    id: 'log-partitions',
    title: 'Log partitions & consumer groups',
    subtitle: 'How a partitioned commit log (Kafka, Event Hubs, Kinesis) delivers ordering, parallelism, and replayable consumption — and what a rebalance does.',
    vendor: 'multi',
    tags: ['kafka', 'event hubs', 'kinesis', 'partition', 'consumer group', 'offset', 'rebalance', 'streaming', 'ordering'],
    steps: [
      {
        title: 'A topic is an append-only log',
        caption: 'Producers append records to the end of a partition; each record gets a monotonically increasing offset. The log is durable and immutable — consumers read it, they do not remove from it.',
        diagram: `<div class="viz-col">${partLog(0, 4)}</div>`,
      },
      {
        title: 'Partitions give parallelism + ordering',
        caption: 'A topic is split into partitions. Records are assigned to a partition by key hash, so all records for a key land on one partition and keep their order. Different partitions can be read in parallel — partition count is the unit of consumer parallelism.',
        diagram: `<div class="viz-col">${partLog(0, 4, 'key=A,C')}${partLog(1, 3, 'key=B')}${partLog(2, 5, 'key=D')}</div>`,
      },
      {
        title: 'A consumer group shares the partitions',
        caption: 'Consumers in the same group divide the partitions between them — each partition is read by exactly one consumer in the group. Three partitions across two consumers → one reads two, the other reads one.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">Consumer 1<small>P0, P1</small></div>
            <div class="viz-box is-active">Consumer 2<small>P2</small></div>
          </div><small style="color:var(--text-muted)">max useful consumers in a group = partition count</small></div>`,
      },
      {
        title: 'Offsets track progress',
        caption: 'Each group commits the offset it has processed per partition. On restart it resumes from the committed offset — so consumption is replayable and resumable. Two different groups read the same log independently at their own offsets.',
        diagram: `<div class="viz-col">${partLog(0, 3, 'committed offset = 3')}
          <div class="viz-row"><div class="viz-box is-active">Group analytics @3</div><div class="viz-box is-active">Group archive @1</div></div></div>`,
      },
      {
        title: 'Rebalance when membership changes',
        caption: 'If a consumer joins, leaves, or dies, the group rebalances — partitions are reassigned across the surviving members. Processing briefly pauses during the rebalance; frequent rebalances (e.g. slow processing tripping the session timeout) are a common throughput problem.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">Consumer 2 lost</div><span class="viz-arrow">→</span>
            <div class="viz-box is-active">Consumer 1<small>now P0,P1,P2</small></div>
          </div><span class="viz-tag viz-tag--shuffle">rebalance — brief pause, offsets preserved</span></div>`,
      },
      {
        title: 'Backpressure & lag',
        caption: 'Consumer lag = latest offset − committed offset. Growing lag means consumption is slower than production: add partitions + consumers, speed up processing, or the stream falls behind. Lag is the single most important health metric for a streaming pipeline.',
        diagram: `<div class="viz-col">${partLog(0, 5, 'produced to 5')}
          <span class="viz-tag viz-tag--shuffle">lag = 5 − 3 = 2 records behind</span></div>`,
      },
    ],
  });
})();
