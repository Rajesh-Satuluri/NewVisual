/* ============================================================
   Conceptual visualizer: streaming windows & watermarks.

   Models event-time windowing in a streaming engine (Structured
   Streaming / Flink-style): event time vs processing time, tumbling
   windows, watermarks, and how late data is handled. Conceptual only.
   Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  const ev = (t, cls) => `<div class="viz-box ${cls || ''}" style="min-width:52px">t=${t}</div>`;

  TV.Viz.register({
    id: 'streaming-windows',
    title: 'Streaming windows & watermarks',
    subtitle: 'How a stream processor groups unbounded events by event time, and how watermarks let it emit results without waiting forever for late data.',
    vendor: 'multi',
    tags: ['streaming', 'structured streaming', 'flink', 'event time', 'watermark', 'window', 'tumbling', 'late data', 'kafka'],
    steps: [
      {
        title: 'An unbounded stream of events',
        caption: 'A stream never ends, so you cannot "GROUP BY" the whole thing. Each event carries an event time (when it happened) which can differ from processing time (when the engine sees it) due to network and buffering delays.',
        diagram: `<div class="viz-col"><div class="viz-row">${ev(1, 'is-done') + ev(2, 'is-done') + ev(3, 'is-active') + ev(4) + ev(5)}</div>
          <small style="color:var(--text-muted)">events arrive continuously, roughly in event-time order</small></div>`,
      },
      {
        title: 'Tumbling windows by event time',
        caption: 'A tumbling window chops event time into fixed, non-overlapping buckets (e.g. 2-minute windows). Each event is assigned to a window by its event time, not when it arrived. Aggregates are computed per window.',
        diagram: `<div class="viz-col">
          <div class="viz-row">
            <div class="viz-box is-active">W[0–2)<small>e@t1, e@t2</small></div>
            <div class="viz-box is-active">W[2–4)<small>e@t3</small></div>
            <div class="viz-box is-dim">W[4–6)<small>…open</small></div>
          </div>
          <small style="color:var(--text-muted)">assignment is by event time → results are correct even if arrival is out of order</small></div>`,
      },
      {
        title: 'Out-of-order & late events',
        caption: 'An event with event time t=1 can arrive after events with t=3 (a delayed mobile client, a retried producer). Without a rule, the engine would have to keep every window open forever in case a late event shows up.',
        diagram: `<div class="viz-col"><div class="viz-row">${ev(3, 'is-done') + ev(4, 'is-done') + ev('1 (late!)', 'is-hot')}</div>
          <small style="color:var(--text-muted)">late arrival for an earlier window</small></div>`,
      },
      {
        title: 'The watermark',
        caption: 'A watermark is the engine’s estimate of "event time has advanced to at least X". It is max(event time seen) − allowed lateness. Windows whose end is below the watermark are considered complete and can emit + drop their state.',
        diagram: `<div class="viz-col">
          <div class="viz-box is-active">watermark = max(eventTime) − 2 min</div>
          <span class="viz-arrow">↓</span>
          <div class="viz-row">
            <div class="viz-box is-done">W[0–2) ✓ final</div>
            <div class="viz-box is-active">W[2–4) open</div>
          </div></div>`,
      },
      {
        title: 'Emit and drop state',
        caption: 'When the watermark passes a window’s end, the engine emits that window’s result and frees its state — bounding memory. Late events for a closed window are either dropped or routed to a side output, by configuration.',
        diagram: `<div class="viz-col">
          <div class="viz-row"><div class="viz-box is-done">W[0–2) emitted</div><span class="viz-arrow">→</span><div class="viz-box is-done">result row</div></div>
          <span class="viz-tag viz-tag--shuffle">late event past watermark → dropped / side output</span></div>`,
      },
      {
        title: 'The latency vs completeness trade-off',
        caption: 'A larger allowed-lateness (looser watermark) catches more late data but delays results and holds state longer. A tighter watermark emits sooner but may drop stragglers. Choosing it is the central tuning decision in event-time streaming.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">tight watermark<small>low latency · more drops</small></div>
            <div class="viz-box is-active">loose watermark<small>high completeness · more delay</small></div>
          </div></div>`,
      },
    ],
  });
})();
