/* ============================================================
   m41-lsm-tree.js — ⚡ Interactive Lab: LSM-Tree.
   Renderer for sims/kernels/lsm.mjs. Put/delete keys, watch the MemTable
   flush to L0 and compaction cascade down the levels; run point lookups
   to see Bloom filters skip SSTables. Real kernel state throughout.
   ============================================================ */
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { createLsm } from '../kernels/lsm.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const src = (id) => (window.DBLab && window.DBLab.source && window.DBLab.source(id)) || null;

export function mount(host) {
  const shell = createModuleShell(host, {
    tag: '⚡ Interactive Lab · Storage Engine',
    title: 'LSM-Tree: MemTable, SSTables & Compaction',
    subtitle: "Put and delete keys and watch the MemTable flush to L0, compaction merge runs downward, and Bloom filters skip SSTables on reads. The levels, versions and read/write/space amplification are the kernel's real state.",
    tabs: [{ id: 'lab', label: 'Lab' }, { id: 'how', label: 'How it works' }, { id: 'iq', label: 'Interview' }],
  });
  const teardown = initTabs(shell.tabs, shell.body, {
    lab: (panel) => mountLab(panel),
    how: (panel) => { panel.innerHTML = howHTML(); },
    iq: (panel) => { const iq = createIQSection(); panel.appendChild(iq.el); initIQ(iq, IQ); },
  });
  return { destroy() { if (typeof teardown === 'function') teardown(); } };
}

function mountLab(panel) {
  let kernel = createLsm({ memtableLimit: 4, fanout: 4, l0Limit: 4 });
  let autoKey = 1;
  const root = document.createElement('div');
  root.className = 'lsm-lab';
  panel.appendChild(root);

  function act(op) { try { kernel.dispatch(op); } catch (e) { return; } render(); }

  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act;
    const key = () => Number(root.querySelector('#lsm-key').value);
    const val = () => Number(root.querySelector('#lsm-val').value);
    if (a === 'put') return act({ type: 'put', key: key(), value: val() });
    if (a === 'delete') return act({ type: 'delete', key: key() });
    if (a === 'get') return act({ type: 'get', key: key() });
    if (a === 'putn') { for (let i = 0; i < 8; i++) { try { kernel.dispatch({ type: 'put', key: (autoKey % 16) + 1, value: autoKey * 7 % 100 }); } catch (e) {} autoKey++; } return render(); }
    if (a === 'flush') return act({ type: 'flush' });
    if (a === 'compact') return act({ type: 'compact' });
    if (a === 'reset') { kernel = createLsm({ memtableLimit: 4, fanout: 4, l0Limit: 4 }); autoKey = 1; return render(); }
  });

  function render() { root.innerHTML = labHTML(kernel); }
  render();
}

function labHTML(k) {
  const s = k.state, m = k.metrics(), inv = k.invariants();
  const memKeys = Object.keys(s.mem).map(Number).sort((a, b) => a - b);
  const memCells = memKeys.map((key) => `<span class="lsm-cell ${s.mem[key].tomb ? 'tomb' : ''}">${key}${s.mem[key].tomb ? '✗' : ':' + s.mem[key].value}</span>`).join('') || '<span class="lsm-empty">empty</span>';

  const lg = s.lastGet;
  const levelRows = s.levels.map((lv, n) => {
    if (!lv.length && n > 0) return '';
    const tables = lv.map((ss) => {
      const probed = lg && (lg.where === 'L' + n + ' #' + ss.id || lg.where === 'L0 #' + ss.id);
      return `<div class="lsm-sst ${probed ? 'probed' : ''}" title="keys ${ss.min}–${ss.max}, Bloom[${ss.bloom.length}]">
        <span class="lsm-sst-id">#${ss.id}</span>
        <span class="lsm-sst-keys">${ss.entries.map((e) => `<i class="${e.tomb ? 'tomb' : ''}">${e.key}</i>`).join('')}</span>
      </div>`;
    }).join('');
    return `<div class="lsm-level"><span class="lsm-level-tag">L${n}</span><div class="lsm-ssts">${tables || '<span class="lsm-empty">—</span>'}</div></div>`;
  }).join('');

  return `
  <div class="lsm-controls">
    <div class="bp-row">
      <label class="bp-lbl">key</label><input id="lsm-key" class="bp-in bp-num" type="number" value="7" />
      <label class="bp-lbl">=</label><input id="lsm-val" class="bp-in bp-num" type="number" value="42" />
      <button class="bp-btn bp-primary" data-act="put">Put</button>
      <button class="bp-btn" data-act="delete">Delete</button>
      <button class="bp-btn" data-act="get">Get</button>
      <button class="bp-btn" data-act="putn">+ Put 8 keys</button>
    </div>
    <div class="bp-row">
      <button class="bp-chip" data-act="flush">Flush MemTable</button>
      <button class="bp-chip" data-act="compact">Full compaction</button>
      <button class="bp-btn" data-act="reset">Reset</button>
      <span class="lsm-wal">WAL: ${s.wal} record(s) since flush</span>
    </div>
  </div>

  <div class="lsm-mem"><span class="lsm-level-tag mem">MemTable</span><div class="lsm-cells">${memCells}</div></div>
  <div class="lsm-tree">${levelRows}</div>

  <div class="bp-metrics">
    ${metric('SSTables', m.sstables)}
    ${metric('Levels', m.levels)}
    ${metric('Live keys', m.liveKeys)}
    ${metric('Read amp', m.readAmp)}
    ${metric('Write amp', m.writeAmp.toFixed(1) + '×')}
    ${metric('Space amp', m.spaceAmp.toFixed(1) + '×')}
  </div>
  <div class="wal-invariants">${inv.map((c) => `<span class="wal-inv ${c.ok ? 'ok' : 'bad'}" title="${esc(c.detail)}">${c.ok ? '✓' : '✗'} ${esc(c.name)}</span>`).join('')}</div>
  <div class="bp-explain"><span>${lg ? (lg.found ? '🔍' : '∅') : '▸'}</span> ${esc(s.note)}</div>`;
}

function metric(l, v) { return `<div class="bp-metric"><div class="bp-metric-v">${esc(v)}</div><div class="bp-metric-l">${esc(l)}</div></div>`; }

function howHTML() {
  const rocks = src('rocksdb-arch'), bloom = src('lsm-bloom');
  const cite = (x, l) => x ? ` <a class="wal-cite" href="${x.url}" target="_blank" rel="noopener">${l}↗</a>` : '';
  return `<div class="wal-how">
    <h3>Writes go to memory first</h3>
    <p>An LSM turns random writes into sequential ones. A write appends to a WAL (for durability) and updates a sorted in-memory <b>MemTable</b>. When the MemTable fills, it's flushed as an immutable, sorted <b>SSTable</b> at level 0 — one big sequential write, no in-place updates.${cite(rocks, 'RocksDB')}</p>
    <h3>Compaction merges runs downward</h3>
    <p>SSTables accumulate, so background <b>compaction</b> merges them into larger, sorted runs at deeper levels, discarding superseded versions and (at the bottom) tombstones. This is where an LSM spends its write I/O — the source of <em>write amplification</em>.</p>
    <h3>Reads check newest-first, Bloom filters help</h3>
    <p>A lookup checks the MemTable, then L0 newest→oldest, then each level. Every SSTable carries a <b>Bloom filter</b>, so a read skips files that certainly don't contain the key — turning many potential probes into a few. Run a Get for a missing key and watch the skip count.${cite(bloom, 'Bloom')}</p>
    <h3>The three amplifications</h3>
    <ul>
      <li><b>Write amp</b> — bytes written to storage ÷ bytes of user data (compaction rewrites).</li>
      <li><b>Read amp</b> — SSTables a lookup may touch (more levels → more probes; Bloom filters cut this).</li>
      <li><b>Space amp</b> — stored bytes ÷ live bytes (dead versions awaiting compaction).</li>
    </ul>
    <p>Leveling (this lab) favours read/space amp; tiering favours write amp. Every LSM picks a point on that triangle.</p>
  </div>`;
}

const IQ = [
  { q: 'Why do LSM-trees give better write throughput than a B+Tree?',
    a: 'Writes are batched in memory and flushed as large sequential SSTable writes, instead of updating B+Tree pages in place (random I/O, often read-modify-write). Sequential writes suit both disks and SSDs and avoid write-in-place amplification per update — at the cost of more complex reads and background compaction.',
    tip: 'Sequential vs in-place random I/O is the core point — then acknowledge the read/compaction trade.' },
  { q: 'What are the three amplification factors and how does compaction strategy trade them?',
    a: 'Write amp (bytes written ÷ user bytes), read amp (files touched per lookup), space amp (stored ÷ live bytes). Leveled compaction keeps few sorted runs per level → low read/space amp but high write amp; size-tiered keeps multiple runs → low write amp but higher read/space amp.',
    tip: 'Draw the triangle: you can optimize two, the third suffers.' },
  { q: 'What problem do Bloom filters solve in an LSM, and what is their cost?',
    a: 'Without them, a point lookup for a key not in a given SSTable still pays to probe it. A per-SSTable Bloom filter answers "definitely not present / maybe present" cheaply, so reads skip most files. Cost: a small amount of memory and a tunable false-positive rate (false positives waste a probe; there are never false negatives).',
    tip: 'Stress no false negatives, tunable false-positive rate.' },
  { q: 'How are deletes handled, and why can they hurt?',
    a: 'A delete writes a tombstone — a marker that shadows older versions — because SSTables are immutable. The key isn\'t actually freed until compaction reaches the bottom level and drops the tombstone. Until then, range scans and reads must carry tombstones, and a flood of deletes can bloat space and slow scans.',
    tip: 'Tombstones + delayed reclamation is the key insight.' },
];
