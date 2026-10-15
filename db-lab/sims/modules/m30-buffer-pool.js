/* ============================================================
   m30-buffer-pool.js — ⚡ Interactive Lab: Buffer Pool & Replacement.
   Renderer for sims/kernels/buffer-pool.mjs. Configure capacity and
   policy (LRU/FIFO/CLOCK) and drive page accesses; the frames, clock
   hand, hit/miss accounting and evictions are the kernel's real state.
   ============================================================ */
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { createBufferPool } from '../kernels/buffer-pool.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const src = (id) => (window.DBLab && window.DBLab.source && window.DBLab.source(id)) || null;

const WORKLOADS = {
  sequential: { label: 'Sequential 1–8', seq: [1, 2, 3, 4, 5, 6, 7, 8] },
  loop: { label: 'Looping 1–4 (thrash)', seq: [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4] },
  hot: { label: 'Hot set {1,2} + cold', seq: [1, 2, 1, 3, 1, 2, 4, 1, 2, 5, 1, 2] },
};

export function mount(host) {
  const shell = createModuleShell(host, {
    tag: '⚡ Interactive Lab · Storage Engine',
    title: 'Buffer Pool & Replacement Policies',
    subtitle: "Pick a capacity and a replacement policy, then drive page accesses. Frames, the CLOCK hand, hit/miss accounting and write-backs are the kernel's real state — compare LRU, FIFO and CLOCK on the same workload.",
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
  let capacity = 3, policy = 'LRU';
  let kernel = createBufferPool({ capacity: capacity, policy: policy });

  const root = document.createElement('div');
  root.className = 'bp-lab';
  panel.appendChild(root);

  function rebuild() { kernel = createBufferPool({ capacity: capacity, policy: policy }); render(); }
  function access(page, write) {
    try { kernel.dispatch({ type: 'access', page: page, write: !!write }); }
    catch (e) { return; }
    render();
  }

  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act;
    if (a === 'access' || a === 'accessW') {
      const v = Number(root.querySelector('#bp-page').value);
      if (!Number.isFinite(v)) return;
      access(v, a === 'accessW'); return;
    }
    if (a === 'runstr') {
      const toks = (root.querySelector('#bp-str').value.match(/\d+/g) || []).map(Number);
      toks.forEach((p) => { try { kernel.dispatch({ type: 'access', page: p }); } catch (e) {} });
      render(); return;
    }
    if (a === 'workload') {
      WORKLOADS[el.dataset.w].seq.forEach((p) => { try { kernel.dispatch({ type: 'access', page: p }); } catch (e) {} });
      render(); return;
    }
    if (a === 'reset') return rebuild();
  });
  root.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.id === 'bp-cap') { capacity = Number(el.value); rebuild(); }
    if (el.id === 'bp-pol') { policy = el.value; rebuild(); }
  });

  function render() { root.innerHTML = labHTML(kernel, capacity, policy); }
  render();
}

function labHTML(k, capacity, policy) {
  const s = k.state, m = k.metrics(), inv = k.invariants();
  const caps = [1, 2, 3, 4, 5, 6].map((c) => `<option value="${c}" ${c === capacity ? 'selected' : ''}>${c}</option>`).join('');
  const pols = ['LRU', 'FIFO', 'CLOCK'].map((p) => `<option ${p === policy ? 'selected' : ''}>${p}</option>`).join('');

  const frames = [];
  for (let i = 0; i < capacity; i++) {
    const f = s.frames[i];
    const isHand = policy === 'CLOCK' && s.frames.length > 0 && i === s.hand;
    if (!f) { frames.push(`<div class="bp-frame empty">${isHand ? '<span class="bp-hand">▸</span>' : ''}<span class="bp-slot">slot ${i}</span></div>`); continue; }
    const fresh = s.last && s.last.page === f.page && s.last.result;
    frames.push(`<div class="bp-frame ${f.dirty ? 'dirty' : ''} ${fresh === 'hit' ? 'hit' : fresh === 'miss' ? 'miss' : ''}">
      ${isHand ? '<span class="bp-hand">▸</span>' : ''}
      <span class="bp-pg">P${esc(f.page)}</span>
      <span class="bp-flags">${f.dirty ? '<b title="dirty">✎</b>' : ''}${policy === 'CLOCK' ? `<em title="reference bit">ref ${f.ref}</em>` : ''}</span>
    </div>`);
  }

  const last = s.last
    ? (s.last.result === 'hit'
        ? `<b class="bp-hit">HIT</b> on P${s.last.page}${s.last.write ? ' (write → dirty)' : ''}`
        : `<b class="bp-miss">MISS</b> on P${s.last.page}${s.last.evicted != null ? ` — evicted P${s.last.evicted}${s.last.wroteBack ? ' <span class="bp-wb">(dirty → write-back)</span>' : ''}` : ' — loaded into a free frame'}`)
    : 'Access a page to begin.';

  return `
  <div class="bp-controls">
    <div class="bp-row">
      <label class="bp-lbl">capacity</label><select id="bp-cap" class="bp-in">${caps}</select>
      <label class="bp-lbl">policy</label><select id="bp-pol" class="bp-in">${pols}</select>
      <span class="bp-sep"></span>
      <label class="bp-lbl">page</label><input id="bp-page" class="bp-in bp-num" type="number" value="1" />
      <button class="bp-btn bp-primary" data-act="access">Access</button>
      <button class="bp-btn" data-act="accessW">Access (write)</button>
      <button class="bp-btn" data-act="reset">Reset</button>
    </div>
    <div class="bp-row">
      <label class="bp-lbl">reference string</label>
      <input id="bp-str" class="bp-in bp-str" value="1 2 3 4 1 2 5 1 2 3 4 5" />
      <button class="bp-btn" data-act="runstr">Run</button>
      <span class="bp-sep"></span>
      ${Object.keys(WORKLOADS).map((w) => `<button class="bp-chip" data-act="workload" data-w="${w}">${esc(WORKLOADS[w].label)}</button>`).join('')}
    </div>
  </div>

  <div class="bp-frames">${frames.join('')}</div>

  <div class="bp-metrics">
    ${metric('Accesses', m.accesses)}
    ${metric('Hits', m.hits)}
    ${metric('Misses', m.misses)}
    ${metric('Hit rate', (m.hitRate * 100).toFixed(0) + '%')}
    ${metric('Evictions', m.evictions)}
    ${metric('Write-backs', m.writeBacks)}
  </div>

  <div class="bp-bar" title="hit ratio">
    <div class="bp-bar-fill" style="width:${(m.hitRate * 100).toFixed(1)}%"></div>
  </div>

  <div class="wal-invariants">
    ${inv.map((c) => `<span class="wal-inv ${c.ok ? 'ok' : 'bad'}" title="${esc(c.detail)}">${c.ok ? '✓' : '✗'} ${esc(c.name)}</span>`).join('')}
  </div>

  <div class="bp-explain"><span>${s.last && s.last.result === 'hit' ? '✅' : s.last ? '⬇' : '▸'}</span> ${last}. <span class="bp-note">${policyNote(policy)}</span></div>`;
}

function policyNote(p) {
  if (p === 'LRU') return 'LRU evicts the frame unused for the longest — a hit refreshes recency.';
  if (p === 'FIFO') return "FIFO evicts the oldest-loaded frame; a hit doesn't change its fate (watch for Bélády's anomaly).";
  return 'CLOCK approximates LRU with one reference bit per frame; the hand clears bits and evicts the first 0 it meets.';
}
function metric(l, v) { return `<div class="bp-metric"><div class="bp-metric-v">${esc(v)}</div><div class="bp-metric-l">${esc(l)}</div></div>`; }

function howHTML() {
  const cmu = src('cmu-15445');
  const cite = cmu ? ` <a class="wal-cite" href="${cmu.url}" target="_blank" rel="noopener">CMU 15-445↗</a>` : '';
  return `<div class="wal-how">
    <h3>What the buffer pool is</h3>
    <p>Disk pages are far slower than RAM, so the DBMS keeps a fixed set of page-sized <em>frames</em> in memory. A read that finds its page resident is a <b>hit</b>; otherwise a <b>miss</b> loads it, evicting a victim frame if the pool is full. The replacement policy chooses the victim.${cite}</p>
    <h3>Dirty pages & write-back</h3>
    <p>If a frame was written (dirty) and gets evicted, it must be written back to disk first — a real I/O cost the lab tracks separately. This is the <em>steal</em> side of the buffer policy you met in the WAL lab.</p>
    <h3>LRU vs FIFO vs CLOCK</h3>
    <ul>
      <li><b>LRU</b> — evict the least-recently-used; strong for workloads with temporal locality, but needs per-access bookkeeping.</li>
      <li><b>FIFO</b> — evict the oldest-loaded; cheap, but can suffer Bélády's anomaly (more frames → more misses). Try <em>Looping 1–4</em> at different capacities.</li>
      <li><b>CLOCK</b> — a reference bit approximates LRU at FIFO-like cost; most real engines use a CLOCK/LRU-K variant.</li>
    </ul>
    <h3>Try this</h3>
    <p>Run <em>Looping 1–4</em> with capacity 3 vs 4 under FIFO, then LRU. Watch the hit rate and the eviction count diverge.</p>
  </div>`;
}

const IQ = [
  { q: 'Why not just use the OS page cache instead of a DBMS buffer pool?',
    a: 'The DBMS knows access patterns (scans vs index probes), transaction boundaries, and which pages are dirty and must be written before the WAL permits — so it can make better eviction and flush decisions, pin pages, and coordinate with recovery. The OS cache is oblivious to all of that.',
    tip: 'Lead with "the DBMS has semantic knowledge the OS lacks" — pinning, dirty/WAL ordering, scan-resistance.' },
  { q: 'What is Bélády\'s anomaly and which policy exhibits it?',
    a: 'It is when increasing the number of frames increases the miss count. FIFO can exhibit it; stack algorithms like LRU provably cannot. The Looping workload in this lab can reproduce it.',
    tip: 'Name that LRU is a "stack algorithm" and is immune — that is the crisp distinction.' },
  { q: 'How does CLOCK approximate LRU so cheaply?',
    a: 'Each frame has a reference bit set on access. A circular "hand" scans frames: if the bit is 1 it clears it (a second chance) and moves on; the first frame with bit 0 is evicted. No per-access list reordering — just a bit flip — yet it preserves most of LRU\'s recency behaviour.',
    tip: 'Contrast the O(1) bit flip with LRU\'s list maintenance.' },
  { q: 'Why must a dirty page be written before it is evicted — and before that?',
    a: 'Evicting drops it from memory, so its changes would be lost unless flushed to disk. And by the write-ahead rule, the log records up to that page\'s last change must already be durable before the page itself is written. Eviction, write-back and WAL are coupled.',
    tip: 'Tie it back to WAL: log-before-page, then page-before-eviction.' },
];
