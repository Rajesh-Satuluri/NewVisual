/* ============================================================
   Conceptual visualizer: elastic compute cost model.

   Models why cloud data compute is billed and tuned the way it is:
   separation of storage & compute, autoscaling, auto-termination,
   spot/interruptible nodes, and the cost of a single query. Values
   are illustrative relative figures, NOT prices. Conceptual only.
   Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  const bars = (vals) => `<div class="viz-row" style="align-items:flex-end">${vals.map(v =>
    `<div class="viz-col" style="gap:4px"><div class="viz-box ${v.cls || ''}" style="height:${v.h}px;min-width:46px;display:flex;align-items:flex-end;justify-content:center;padding:4px">${v.t}</div><small style="color:var(--text-muted)">${v.l}</small></div>`).join('')}</div>`;

  TV.Viz.register({
    id: 'compute-cost',
    title: 'Elastic compute cost model',
    subtitle: 'Why cloud data platforms bill and scale the way they do — and the handful of levers that decide whether a workload is cheap or ruinous. Figures are illustrative, not prices.',
    vendor: 'multi',
    tags: ['cost', 'finops', 'autoscaling', 'spot', 'serverless', 'auto-termination', 'storage compute separation', 'optimization', 'billing'],
    steps: [
      {
        title: 'Storage and compute are separate',
        caption: 'In a lakehouse/warehouse, data sits in cheap object storage; compute is a separate, elastic resource you spin up to query it. You pay a little, always, for storage — and a lot, only while compute runs. That split is the foundation of cost control.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">Object storage<small>cheap · always on</small></div>
            <div class="viz-box is-active">Compute<small>expensive · on demand</small></div>
          </div></div>`,
      },
      {
        title: 'Idle compute is pure waste',
        caption: 'A cluster left running with no queries still bills every second. The single most common cloud-data waste is idle compute — clusters nobody turned off. Cost ≈ nodes × time, regardless of whether work happened.',
        diagram: () => bars([{ t: '', h: 70, l: 'active', cls: 'is-active' }, { t: '$$', h: 70, l: 'idle!', cls: 'is-hot' }, { t: '', h: 70, l: 'idle!', cls: 'is-hot' }]),
      },
      {
        title: 'Auto-termination',
        caption: 'Setting a short idle timeout (auto-terminate after N minutes) eliminates most idle cost with no downside for interactive work. The cluster restarts on the next query. This one setting often cuts a dev bill substantially.',
        diagram: () => bars([{ t: '', h: 70, l: 'active', cls: 'is-active' }, { t: '', h: 24, l: 'idle 10m', cls: 'is-dim' }, { t: '✓', h: 14, l: 'off', cls: 'is-done' }]),
      },
      {
        title: 'Autoscaling to the workload',
        caption: 'Autoscaling adds nodes when queries queue and removes them when demand falls, so you pay for roughly the capacity you use instead of a fixed peak-sized cluster. Serverless takes this further — scale to zero between queries.',
        diagram: () => bars([{ t: '', h: 30, l: 'low', cls: 'is-done' }, { t: '', h: 64, l: 'peak', cls: 'is-active' }, { t: '', h: 24, l: 'low', cls: 'is-done' }]),
      },
      {
        title: 'Spot / interruptible nodes',
        caption: 'For fault-tolerant batch (not the driver, not latency-critical jobs), spot/interruptible nodes cost a fraction of on-demand — in exchange for possible reclamation. Great for large Spark jobs that can retry a lost task.',
        diagram: () => bars([{ t: '$$$', h: 70, l: 'on-demand', cls: 'is-hot' }, { t: '$', h: 24, l: 'spot', cls: 'is-done' }]),
      },
      {
        title: 'The cost of one query',
        caption: 'A query’s cost ≈ data scanned × compute rate. Everything that reduces bytes read — partition pruning, file compaction, columnar projection, caching — directly reduces cost. Efficient layout (see the storage-pruning visualizer) is FinOps.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">full scan 1 TB</div><span class="viz-arrow">→ prune →</span>
            <div class="viz-box is-done">read 8 GB</div>
          </div><span class="viz-tag viz-tag--narrow">~120× less scanned → ~120× cheaper</span></div>`,
      },
    ],
  });
})();
