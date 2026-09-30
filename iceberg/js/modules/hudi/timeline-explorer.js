/* Apache Hudi — Timeline Explorer (static interactive) */
(function () {
  'use strict';
  const TV = window.TableViz;

  const INSTANTS = [
    { t: '…090000', action: 'commit', state: 'completed', type: 'CoW write', color: 'green',
      detail: 'A Copy-on-Write commit. Base Parquet files were rewritten for the affected file groups. operationMetrics: 12 files written, 1.8M records upserted.' },
    { t: '…091500', action: 'deltacommit', state: 'completed', type: 'MoR log append', color: 'teal',
      detail: 'A Merge-on-Read deltacommit. Updates were appended as Avro log files against existing base files — cheap, fast ingest. 3 log files, 420K records.' },
    { t: '…093000', action: 'compaction', state: 'completed', type: 'table service', color: 'purple',
      detail: 'Scheduled + executed compaction. Log files were merged into new base Parquet files, producing fresh file slices. 3 file groups compacted.' },
    { t: '…094500', action: 'clean', state: 'completed', type: 'table service', color: 'orange',
      detail: 'Cleaning removed file slices older than the retention policy (keep last N commits), reclaiming storage while preserving enough history.' },
    { t: '…100000', action: 'deltacommit', state: 'inflight', type: 'MoR log append', color: 'teal',
      detail: 'An in-progress instant. It appears as inflight until the write completes and the timeline transitions it to completed — readers ignore inflight instants.' },
    { t: '…101500', action: 'rollback', state: 'completed', type: 'recovery', color: 'red',
      detail: 'A rollback that undid a failed write, using markers to identify and delete partial files so the table stays consistent.' },
  ];

  function render(container) {
    const s = document.createElement('style');
    if (!document.getElementById('htl-styles')) {
      s.id = 'htl-styles';
      s.textContent = `
.htl { height:100%; overflow-y:auto; padding:30px 32px 60px; }
.htl-wrap { max-width:960px; margin:0 auto; }
.htl-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 8px; }
.htl-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin:0 0 22px; max-width:820px; }
.htl-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.htl-list { display:flex; flex-direction:column; gap:8px; position:relative; }
.htl-item { display:flex; align-items:center; gap:12px; padding:11px 14px; border:1px solid var(--border-default); border-radius:10px; background:var(--bg-2); cursor:pointer; transition:border-color .12s, transform .12s; }
.htl-item:hover { transform:translateX(3px); }
.htl-item.active { border-color:var(--brand); background:var(--brand-glow); }
.htl-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.htl-dot.green{background:var(--green);} .htl-dot.teal{background:#2dd4bf;} .htl-dot.purple{background:var(--purple);} .htl-dot.orange{background:var(--orange);} .htl-dot.red{background:var(--red);}
.htl-t { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); }
.htl-act { font-size:13px; font-weight:700; color:var(--text-primary); }
.htl-state { margin-left:auto; font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; padding:2px 8px; border-radius:999px; }
.htl-state.completed { background:var(--green-subtle); color:var(--green); }
.htl-state.inflight { background:var(--yellow-subtle); color:var(--yellow); }
.htl-detail { border:1px solid var(--border-default); border-radius:12px; background:var(--bg-2); padding:18px; position:sticky; top:0; align-self:start; }
.htl-detail h3 { font-size:15px; font-weight:700; color:var(--text-primary); margin:0 0 4px; }
.htl-detail .htl-sub { font-family:var(--font-mono); font-size:11px; color:var(--brand); margin-bottom:12px; }
.htl-detail p { font-size:13px; color:var(--text-secondary); line-height:1.65; margin:0; }
.htl-meta { margin-top:14px; display:flex; gap:8px; flex-wrap:wrap; }
.htl-chip { font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:999px; background:var(--bg-3); color:var(--text-secondary); border:1px solid var(--border-default); }
@media (max-width:780px){ .htl-cols{ grid-template-columns:1fr; } .htl-detail{ position:static; } }
`;
      document.head.appendChild(s);
    }
    container.className = '';
    container.innerHTML = `
<div class="htl page-enter"><div class="htl-wrap">
  <h1 class="htl-h1">Timeline Explorer</h1>
  <p class="htl-lead">The <code>.hoodie</code> timeline is Hudi's source of truth — an ordered sequence of <em>instants</em>.
    Each instant has an action, a state, and a monotonic time. Click an instant to inspect it.</p>
  <div class="htl-cols">
    <div class="htl-list" id="htl-list">
      ${INSTANTS.map((it, i) => `
        <div class="htl-item${i === 0 ? ' active' : ''}" data-i="${i}">
          <span class="htl-dot ${it.color}"></span>
          <span class="htl-t">${it.t}</span>
          <span class="htl-act">${it.action}</span>
          <span class="htl-state ${it.state}">${it.state}</span>
        </div>`).join('')}
    </div>
    <div class="htl-detail" id="htl-detail"></div>
  </div>
</div></div>`;

    const detail = container.querySelector('#htl-detail');
    function show(i) {
      const it = INSTANTS[i];
      detail.innerHTML = `
        <h3>${it.action}</h3>
        <div class="htl-sub">${it.t}.${it.action} · ${it.state}</div>
        <p>${it.detail}</p>
        <div class="htl-meta">
          <span class="htl-chip">${it.type}</span>
          <span class="htl-chip">state: ${it.state}</span>
        </div>`;
    }
    show(0);
    container.querySelector('#htl-list').addEventListener('click', (e) => {
      const item = e.target.closest('.htl-item');
      if (!item) return;
      container.querySelectorAll('.htl-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      show(parseInt(item.dataset.i, 10));
    });
  }

  TV.registerModule('hudi', {
    id: 'timeline-explorer', title: 'Timeline', group: 'start', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
