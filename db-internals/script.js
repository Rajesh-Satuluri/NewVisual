import { MODULES, GROUP_ORDER, renderNav } from './components/nav.js';

// ── Persistence ────────────────────────────────────────────────────────────
const DONE_KEY = 'db-internals-done';
const done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || '[]'));

function saveDone() {
  localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
}

// ── Module loaders (lazy) ──────────────────────────────────────────────────
const LOADERS = {
  m01:  () => import('./modules/m01-what-is-dbms.js'),
  m02:  () => import('./modules/m02-why-databases.js'),
  m03:  () => import('./modules/m03-dbms-architecture.js'),
  m04:  () => import('./modules/m04-data-models.js'),
  m05:  () => import('./modules/m05-relational-model.js'),
  m06:  () => import('./modules/m06-relational-algebra.js'),
  m07:  () => import('./modules/m07-sql-relational-algebra.js'),
  m08:  () => import('./modules/m08-schema-constraints.js'),
  m09:  () => import('./modules/m09-storage-hierarchy.js'),
  m10:  () => import('./modules/m10-sql-parsing.js'),
  m11:  () => import('./modules/m11-parse-tree.js'),
  m12:  () => import('./modules/m12-ast.js'),
  m13:  () => import('./modules/m13-query-analysis.js'),
  m14:  () => import('./modules/m14-logical-plan.js'),
  m15:  () => import('./modules/m15-physical-plan.js'),
  m16:  () => import('./modules/m16-query-optimization.js'),
  m17:  () => import('./modules/m17-cost-based-optimization.js'),
  m18:  () => import('./modules/m18-table-scan.js'),
  m19:  () => import('./modules/m19-index-scan.js'),
  m20:  () => import('./modules/m20-nested-loop-join.js'),
  m21:  () => import('./modules/m21-hash-join.js'),
  m22:  () => import('./modules/m22-sort-merge-join.js'),
  m23:  () => import('./modules/m23-aggregation.js'),
  m24:  () => import('./modules/m24-query-execution.js'),
  m25:  () => import('./modules/m25-query-plan-comparator.js'),
  m26:  () => import('./modules/m26-database-files.js'),
  m27:  () => import('./modules/m27-pages.js'),
  m28:  () => import('./modules/m28-records-tuples.js'),
  m29:  () => import('./modules/m29-slotted-pages.js'),
  m30:  () => import('./modules/m30-buffer-pool.js'),
  m31:  () => import('./modules/m31-buffer-pool-replacement.js'),
  m32:  () => import('./modules/m32-page-cache.js'),
  m33:  () => import('./modules/m33-disk-io.js'),
  m34:  () => import('./modules/m34-sequential-vs-random-io.js'),
  m35:  () => import('./modules/m35-b-tree.js'),
  m36:  () => import('./modules/m36-b-plus-tree.js'),
  m37:  () => import('./modules/m37-b-plus-tree-search.js'),
  m38:  () => import('./modules/m38-b-plus-tree-insert.js'),
  m39:  () => import('./modules/m39-b-plus-tree-delete.js'),
  m40:  () => import('./modules/m40-b-plus-tree-root-split.js'),
  m41:  () => import('./modules/m41-lsm-tree.js'),
  m42:  () => import('./modules/m42-memtable-wal.js'),
  m43:  () => import('./modules/m43-sstable.js'),
  m44:  () => import('./modules/m44-bloom-filter.js'),
  m45:  () => import('./modules/m45-lsm-compaction.js'),
  m46:  () => import('./modules/m46-transactions.js'),
  m47:  () => import('./modules/m47-wal.js'),
  m48:  () => import('./modules/m48-mvcc.js'),
  m49:  () => import('./modules/m49-locking.js'),
  m50:  () => import('./modules/m50-vacuum.js'),
  m51:  () => import('./modules/m51-isolation-levels.js'),
  m52:  () => import('./modules/m52-index-types.js'),
  m53:  () => import('./modules/m53-crash-recovery.js'),
  m54:  () => import('./modules/m54-checkpoints.js'),
  m55:  () => import('./modules/m55-replication.js'),
  m56:  () => import('./modules/m56-connection-pooling.js'),
  m57:  () => import('./modules/m57-partitioning.js'),
  m58:  () => import('./modules/m58-explain-analyze.js'),
  m59:  () => import('./modules/m59-cap-theorem.js'),
  m60:  () => import('./modules/m60-two-phase-commit.js'),
  m61:  () => import('./modules/m61-consistent-hashing.js'),
  m62:  () => import('./modules/m62-database-sharding.js'),
  m63:  () => import('./modules/m63-raft-consensus.js'),
  m64:  () => import('./modules/m64-read-write-quorum.js'),
  m65:  () => import('./modules/m65-parallel-query.js'),
  m66:  () => import('./modules/m66-query-statistics.js'),
  m67:  () => import('./modules/m67-wal-internals.js'),
  m68:  () => import('./modules/m68-cost-model.js'),
  m69:  () => import('./modules/m69-distributed-overview.js'),
  m70:  () => import('./modules/m70-failure-modes.js'),
  m71:  () => import('./modules/m71-network-communication.js'),
  m72:  () => import('./modules/m72-eventual-consistency.js'),
  m73:  () => import('./modules/m73-failure-detection.js'),
  m74:  () => import('./modules/m74-heartbeats.js'),
  m75:  () => import('./modules/m75-leader-election.js'),
  m76:  () => import('./modules/m76-replication.js'),
  m77:  () => import('./modules/m77-synchronous-replication.js'),
  m78:  () => import('./modules/m78-asynchronous-replication.js'),
  m79:  () => import('./modules/m79-quorum.js'),
  m80:  () => import('./modules/m80-consistency.js'),
  m81:  () => import('./modules/m81-eventual-consistency.js'),
  m82:  () => import('./modules/m82-strong-consistency.js'),
  m83:  () => import('./modules/m83-read-repair.js'),
  m84:  () => import('./modules/m84-anti-entropy.js'),
  m85:  () => import('./modules/m85-partitioning.js'),
  m86:  () => import('./modules/m86-hash-partitioning.js'),
  m87:  () => import('./modules/m87-range-partitioning.js'),
  m88:  () => import('./modules/m88-consistent-hashing.js'),
  m89:  () => import('./modules/m89-rebalancing.js'),
  m90:  () => import('./modules/m90-hot-partitions.js'),
  m91:  () => import('./modules/m91-distributed-transactions.js'),
  m92:  () => import('./modules/m92-two-phase-commit.js'),
  m93:  () => import('./modules/m93-consensus.js'),
  m94:  () => import('./modules/m94-raft-concepts.js'),
  m95:  () => import('./modules/m95-network-partition.js'),
  m96:  () => import('./modules/m96-split-brain.js'),
  m97:  () => import('./modules/m97-distributed-recovery.js'),
  m98:  () => import('./modules/m98-replication-models.js'),
  m99:  () => import('./modules/m99-partitioning-strategies.js'),
  m100: () => import('./modules/m100-transactions-at-scale.js'),
  m101: () => import('./modules/m101-consistency-and-consensus.js'),
  m102: () => import('./modules/m102-batch-processing.js'),
  m103: () => import('./modules/m103-stream-processing.js'),
  m104: () => import('./modules/m104-event-logs.js'),
  m105: () => import('./modules/m105-derived-data.js'),
  m106: () => import('./modules/m106-data-integration.js'),
  m107: () => import('./modules/m107-cdc.js'),
  m108: () => import('./modules/m108-materialized-views.js'),
  m109: () => import('./modules/m109-dataflow-architecture.js'),
  m110: () => import('./modules/m110-modern-data-systems.js'),
  m111: () => import('./modules/m111-oltp-cdc-kafka-stream-olap.js'),
  m112: () => import('./modules/m112-follow-the-query.js'),
  m113: () => import('./modules/m113-follow-the-write.js'),
  m114: () => import('./modules/m114-follow-the-transaction.js'),
  m115: () => import('./modules/m115-crash-recovery-lab.js'),
  m116: () => import('./modules/m116-bplus-tree-lab.js'),
  m117: () => import('./modules/m117-lsm-lab.js'),
  m118: () => import('./modules/m118-buffer-pool-lab.js'),
  m119: () => import('./modules/m119-query-optimizer-lab.js'),
  m120: () => import('./modules/m120-concurrency-lab.js'),
  m121: () => import('./modules/m121-replication-lab.js'),
  m122: () => import('./modules/m122-partitioning-lab.js'),
  m123: () => import('./modules/m123-consensus-lab.js'),
  m124: () => import('./modules/m124-distributed-failure-lab.js'),
  m125: () => import('./modules/m125-end-to-end-db-simulator.js'),
  m126: () => import('./modules/m126-concept-map.js'),
  m127: () => import('./modules/m127-db-internals-roadmap.js'),
  m128: () => import('./modules/m128-book-concept-mapping.js'),
  m129: () => import('./modules/m129-cheat-sheet.js'),
  m130: () => import('./modules/m130-interview-center.js'),
  m131: () => import('./modules/m131-mock-interview.js'),
  m132: () => import('./modules/m132-quiz.js'),
  m133: () => import('./modules/m133-glossary.js'),
};

// ── UI references ──────────────────────────────────────────────────────────
const root       = document.getElementById('module-root');
const sidebar    = document.getElementById('sidebar');
const themeBtn   = document.getElementById('theme-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose  = document.getElementById('sidebar-close');
const markDoneBtn   = document.getElementById('mark-done');
const progressFill  = document.getElementById('progress-fill');
const progressText  = document.getElementById('progress-text');
const breadcrumbGroup = document.getElementById('breadcrumb-group');
const breadcrumbTitle = document.getElementById('breadcrumb-title');

let currentCleanup = null;
let currentId = null;

// ── Theme ──────────────────────────────────────────────────────────────────
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
let theme = localStorage.getItem('db-internals-theme') ||
            (prefersDark.matches ? 'dark' : 'light');

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('db-internals-theme', t);
}
applyTheme(theme);

themeBtn.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
});

// ── Sidebar toggle ─────────────────────────────────────────────────────────
sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
sidebarClose.addEventListener('click',  () => sidebar.classList.add('collapsed'));

// ── Progress bar ───────────────────────────────────────────────────────────
function updateProgress() {
  const pct = (done.size / MODULES.length) * 100;
  progressFill.style.width = pct + '%';
  progressText.textContent = `${done.size} / ${MODULES.length}`;
}

// ── Mark done ──────────────────────────────────────────────────────────────
markDoneBtn.addEventListener('click', () => {
  if (!currentId) return;
  if (done.has(currentId)) {
    done.delete(currentId);
  } else {
    done.add(currentId);
  }
  saveDone();
  updateProgress();
  renderNav(currentId, done);
  markDoneBtn.style.color = done.has(currentId) ? 'var(--green)' : '';
});

// ── Router ─────────────────────────────────────────────────────────────────
async function navigate(id) {
  if (!id || !LOADERS[id]) {
    showHome();
    return;
  }
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }

  currentId = id;
  root.innerHTML = '<div class="coming-soon"><div class="coming-soon-icon">⏳</div><p>Loading…</p></div>';

  const mod = MODULES.find(m => m.id === id);
  if (mod) {
    breadcrumbGroup.textContent = mod.group;
    breadcrumbTitle.textContent = mod.label;
    markDoneBtn.style.display = 'flex';
    markDoneBtn.style.color = done.has(id) ? 'var(--green)' : '';
  }

  try {
    const { mount } = await LOADERS[id]();
    root.innerHTML = '';
    const cleanup = mount(root);
    if (typeof cleanup === 'function') currentCleanup = cleanup;
  } catch (e) {
    root.innerHTML = `<div class="coming-soon">
      <div class="coming-soon-icon">⚠️</div>
      <h3>Module unavailable</h3>
      <p>${e.message}</p>
    </div>`;
  }

  renderNav(id, done);
  document.getElementById('module-canvas').scrollTo(0, 0);
}

function showHome() {
  currentId = null;
  markDoneBtn.style.display = 'none';
  breadcrumbGroup.textContent = 'DB Internals';
  breadcrumbTitle.textContent = 'Welcome';
  root.innerHTML = `
    <div class="module-page">
      <div class="module-hero" style="text-align:center;padding:64px 40px 56px">
        <div class="module-tag">Amazon Prime Day Edition</div>
        <h1 class="module-title" style="font-size:clamp(22px,4vw,40px);margin-bottom:14px">
          Database Internals<br>Visualizer
        </h1>
        <p class="module-subtitle" style="margin:0 auto;text-align:center">
          133 animated modules — from storage pages to distributed consensus —<br>
          told through one story: the <strong>Amazon Prime Day</strong> "Buy Now" click.
        </p>
      </div>

      <div class="stats-row" style="justify-content:center;padding:40px 40px 0">
        <div class="stat-box"><div class="stat-val">133</div><div class="stat-label">Modules</div></div>
        <div class="stat-box"><div class="stat-val">8</div><div class="stat-label">Groups</div></div>
        <div class="stat-box"><div class="stat-val">${done.size}</div><div class="stat-label">Completed</div></div>
      </div>

      <div class="info-grid" style="padding-top:32px">
        ${[
          ['🏗️','Foundations','What a DBMS is, relational algebra, storage hierarchy','m01'],
          ['🔍','Query Engine','SQL parsing, optimization, join strategies, execution','m10'],
          ['💾','Storage Engine','B+ Trees, LSM-trees, buffer pool, disk I/O','m26'],
          ['💳','Transactions','ACID, WAL, MVCC, isolation levels, deadlocks','m48'],
          ['🌐','Distributed','Replication, partitioning, consensus, Raft','m69'],
          ['📖','DDIA','Batch/stream processing, derived data, modern systems','m98'],
          ['🧪','Labs','Hands-on simulators for every major concept','m112'],
          ['🎓','Learning','Roadmap, cheat sheet, quiz, mock interview','m126'],
        ].map(([icon, title, desc, id]) => `
          <a href="#${id}" class="info-card" style="text-decoration:none;cursor:pointer">
            <div class="info-card-icon">${icon}</div>
            <div class="info-card-title">${title}</div>
            <div class="info-card-body">${desc}</div>
            <span class="info-card-tag">Explore →</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
  renderNav(null, done);
}

// ── Hash-based routing ─────────────────────────────────────────────────────
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  navigate(id || null);
});

// ── Init ───────────────────────────────────────────────────────────────────
updateProgress();
const initId = location.hash.slice(1);
navigate(initId || null);
