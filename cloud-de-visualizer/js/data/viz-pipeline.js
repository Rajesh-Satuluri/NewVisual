/* ============================================================
   Conceptual visualizer: medallion pipeline + orchestration DAG.

   Models a bronze → silver → gold lakehouse pipeline run by an
   orchestrator: task states, a failure + retry, and how downstream
   tasks wait on upstream success. Conceptual only. On TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  // nodes: ingest -> bronze -> silver -> {gold_sales, gold_marketing}
  function dag(state) {
    const box = (id, label, sub) => {
      const st = state[id] || 'pending';
      const cls = st === 'running' ? 'is-active' : st === 'done' ? 'is-done' : st === 'failed' ? 'is-hot' : 'is-dim';
      const tag = { pending: 'queued', running: 'running…', done: '✓ success', failed: '✗ failed', retry: '↻ retry' }[st] || st;
      return `<div class="viz-box ${cls}">${label}<small>${sub} · ${tag}</small></div>`;
    };
    return `<div class="viz-col">
      <div class="viz-row">
        ${box('ingest', 'Ingest', 'land raw')}
        <span class="viz-arrow">→</span>
        ${box('bronze', 'Bronze', 'raw as-is')}
        <span class="viz-arrow">→</span>
        ${box('silver', 'Silver', 'clean · conform')}
      </div>
      <span class="viz-arrow">↓</span>
      <div class="viz-row">
        ${box('gold_sales', 'Gold · Sales', 'aggregate')}
        ${box('gold_mktg', 'Gold · Marketing', 'aggregate')}
      </div>
    </div>`;
  }

  const S = (...done) => { const o = {}; done.forEach(d => o[d] = 'done'); return o; };

  TV.Viz.register({
    id: 'pipeline-dag',
    title: 'Pipeline run & orchestration DAG',
    subtitle: 'How a medallion (bronze → silver → gold) pipeline runs under an orchestrator — dependencies, task states, and a failure with retry.',
    vendor: 'multi',
    tags: ['pipeline', 'medallion', 'bronze', 'silver', 'gold', 'orchestration', 'dag', 'airflow', 'adf', 'workflows', 'retry'],
    steps: [
      {
        title: 'DAG defined, nothing running',
        caption: 'The pipeline is a directed acyclic graph of tasks. Edges are dependencies: a task starts only when all its upstream tasks have succeeded. At submit time every task is queued.',
        diagram: () => dag({}),
      },
      {
        title: 'Ingest runs',
        caption: 'The orchestrator starts tasks with no unmet dependencies. Ingest lands raw files into the bronze landing zone. Downstream tasks stay queued — they depend on it.',
        diagram: () => dag({ ingest: 'running' }),
      },
      {
        title: 'Bronze → Silver',
        caption: 'Bronze stores data as-is for replayability; Silver cleans, deduplicates, and conforms types. Each completes and unblocks the next. This is the linear spine of the pipeline.',
        diagram: () => dag(Object.assign(S('ingest', 'bronze'), { silver: 'running' })),
      },
      {
        title: 'A Gold task fails',
        caption: 'Silver succeeds and both Gold tasks start in parallel (they share an upstream, not each other). Gold · Marketing hits a transient error — a schema mismatch in a source extract. The orchestrator marks it failed.',
        diagram: () => dag(Object.assign(S('ingest', 'bronze', 'silver'), { gold_sales: 'running', gold_mktg: 'failed' })),
      },
      {
        title: 'Retry with backoff',
        caption: 'A configured retry policy re-runs only the failed task (and its downstream, if any) — not the whole pipeline. Idempotent writes (e.g. MERGE on a Delta key) make retries safe. Gold · Sales, unaffected, completes independently.',
        diagram: () => dag(Object.assign(S('ingest', 'bronze', 'silver', 'gold_sales'), { gold_mktg: 'retry' })),
      },
      {
        title: 'Run succeeds',
        caption: 'The retried task succeeds; all leaves are green, so the run is marked successful. Observability (per-task duration, row counts, data-quality checks) is what turns a green run into a trustworthy one.',
        diagram: () => dag(S('ingest', 'bronze', 'silver', 'gold_sales', 'gold_mktg')),
      },
    ],
  });
})();
