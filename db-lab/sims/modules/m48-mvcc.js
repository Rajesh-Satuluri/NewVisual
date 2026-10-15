/* ============================================================
   m48-mvcc.js — ⚡ Interactive Lab: MVCC & Snapshot Isolation.
   Renderer for sims/kernels/mvcc.mjs. Run concurrent transactions,
   watch version chains (xmin/xmax) grow, and highlight exactly what
   each transaction's snapshot can see. Real kernel state throughout.
   ============================================================ */
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { createMvcc, visibleSet } from '../kernels/mvcc.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const src = (id) => (window.DBLab && window.DBLab.source && window.DBLab.source(id)) || null;

const SEED = { A: 1, B: 2, C: 3 };

const PRESETS = {
  repeatable: { label: 'Repeatable read', ops: [B('T1'), B('T2'), U('T2', 'A', 99), C('T2'), R('T1', 'A')] },
  conflict: { label: 'Write-write conflict', ops: [B('T1'), B('T2'), U('T1', 'A', 10), U('T2', 'A', 20)] },
  dead: { label: 'Dead tuple → VACUUM', ops: [B('T1'), U('T1', 'A', 5), C('T1')] },
};
function B(t) { return { type: 'begin', txn: t }; }
function U(t, k, v) { return { type: 'update', txn: t, key: k, value: v }; }
function R(t, k) { return { type: 'read', txn: t, key: k }; }
function C(t) { return { type: 'commit', txn: t }; }

export function mount(host) {
  const shell = createModuleShell(host, {
    tag: '⚡ Interactive Lab · Transactions',
    title: 'MVCC & Snapshot Isolation',
    subtitle: "Run concurrent transactions and watch row versions (xmin/xmax) accumulate. Pick a 'viewer' transaction to highlight exactly what its snapshot sees — readers never block writers, and the version chain is the kernel's real state.",
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
  let kernel = createMvcc({ seed: SEED });
  let nextT = 1, viewer = null;

  const root = document.createElement('div');
  root.className = 'mvcc-lab';
  panel.appendChild(root);

  function act(op) {
    try { kernel.dispatch(op); }
    catch (e) { flash(root, e.message); return; }
    render();
  }
  function activeLabels() { return Object.keys(kernel.state.txns).map(Number).filter((x) => x !== 0 && kernel.state.txns[x].status === 'active').map((x) => kernel.state.txns[x].label); }

  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act;
    if (a === 'begin') { act(B('T' + nextT)); nextT++; return; }
    const t = () => root.querySelector('#mv-txn') && root.querySelector('#mv-txn').value;
    const key = () => root.querySelector('#mv-key').value;
    const val = () => Number(root.querySelector('#mv-val').value);
    if (a === 'read') return act(R(t(), key()));
    if (a === 'update') return act(U(t(), key(), val()));
    if (a === 'delete') return act({ type: 'delete', txn: t(), key: key() });
    if (a === 'commit') return act(C(el.dataset.txn));
    if (a === 'abort') return act({ type: 'abort', txn: el.dataset.txn });
    if (a === 'reset') { kernel = createMvcc({ seed: SEED }); nextT = 1; viewer = null; return render(); }
    if (a === 'preset') {
      kernel = createMvcc({ seed: SEED }); nextT = 1; viewer = null;
      PRESETS[el.dataset.preset].ops.forEach((o) => { try { kernel.dispatch(o); } catch (e) {} });
      PRESETS[el.dataset.preset].ops.forEach((o) => { if (o.txn) nextT = Math.max(nextT, Number(o.txn.slice(1)) + 1); });
      render();
    }
  });
  root.addEventListener('change', (ev) => { if (ev.target.id === 'mv-viewer') { viewer = ev.target.value || null; render(); } });

  function render() {
    const labels = activeLabels();
    if (viewer && labels.indexOf(viewer) === -1) viewer = null;
    root.innerHTML = labHTML(kernel, labels, viewer);
  }
  render();
}

function labHTML(k, activeLabels, viewer) {
  const s = k.state, m = k.metrics(), inv = k.invariants();
  const vis = viewer ? new Set(visibleSet(k, viewer)) : null;
  const keys = Object.keys(SEED);

  const txnOptions = activeLabels.map((l) => `<option>${l}</option>`).join('') || '<option value="">—</option>';
  const viewerOptions = '<option value="">(none)</option>' + activeLabels.map((l) => `<option ${l === viewer ? 'selected' : ''}>${l}</option>`).join('');

  // version table, grouped by key
  const rows = s.tuples.map((v) => {
    const deadGlobal = v.xmax != null && s.txns[v.xmax] && s.txns[v.xmax].status === 'committed';
    const isVis = vis && vis.has(v.id);
    const xminT = s.txns[v.xmin], xmaxT = v.xmax != null ? s.txns[v.xmax] : null;
    return `<tr class="mv-ver ${deadGlobal ? 'dead' : ''} ${isVis ? 'vis' : ''}">
      <td class="mv-k">${esc(v.key)}</td>
      <td class="mv-val">${esc(v.value)}</td>
      <td class="mv-x">${v.xmin}${xminT && xminT.label ? '<span class="mv-lab">' + esc(xminT.label) + '</span>' : v.xmin === 0 ? '<span class="mv-lab">init</span>' : ''}</td>
      <td class="mv-x">${v.xmax == null ? '—' : v.xmax + (xmaxT && xmaxT.label ? '<span class="mv-lab">' + esc(xmaxT.label) + '</span>' : '')}</td>
      <td class="mv-flag">${deadGlobal ? '<span class="mv-dead">dead</span>' : '<span class="mv-live">live</span>'}${viewer && isVis ? ' <span class="mv-see">👁 ' + esc(viewer) + '</span>' : ''}</td>
    </tr>`;
  }).join('');

  const txnRows = Object.keys(s.txns).map(Number).filter((x) => x !== 0).map((x) => {
    const T = s.txns[x];
    const actions = T.status === 'active'
      ? `<button class="wal-mini wal-primary" data-act="commit" data-txn="${T.label}">commit</button><button class="wal-mini" data-act="abort" data-txn="${T.label}">abort</button>`
      : `<span class="wal-tstatus wal-tstatus--${T.status === 'committed' ? 'committed' : 'aborted'}">${T.status}</span>`;
    return `<div class="mv-txn"><span class="mv-txn-id">${esc(T.label)}</span><span class="mv-snap">xid ${x} · snap&lt;${T.snapshot.xmax}${T.snapshot.active.length ? ', skip [' + T.snapshot.active.join(',') + ']' : ''}&gt;</span>${actions}</div>`;
  }).join('');

  return `
  <div class="mvcc-controls">
    <div class="bp-row">
      <button class="bp-btn bp-primary" data-act="begin">+ Begin txn</button>
      <span class="bp-sep"></span>
      <label class="bp-lbl">txn</label><select id="mv-txn" class="bp-in">${txnOptions}</select>
      <label class="bp-lbl">key</label><select id="mv-key" class="bp-in">${keys.map((x) => `<option>${x}</option>`).join('')}</select>
      <label class="bp-lbl">=</label><input id="mv-val" class="bp-in bp-num" type="number" value="42" />
      <button class="bp-btn" data-act="read">Read</button>
      <button class="bp-btn" data-act="update">Update</button>
      <button class="bp-btn" data-act="delete">Delete</button>
      <button class="bp-btn" data-act="reset">Reset</button>
    </div>
    <div class="bp-row">
      <label class="bp-lbl">highlight what</label><select id="mv-viewer" class="bp-in">${viewerOptions}</select><span class="bp-lbl">sees</span>
      <span class="bp-sep"></span>
      ${Object.keys(PRESETS).map((id) => `<button class="bp-chip" data-act="preset" data-preset="${id}">${esc(PRESETS[id].label)}</button>`).join('')}
    </div>
  </div>

  <div class="mv-grid">
    <div class="wal-panel">
      <div class="wal-panel-h">Version chains <span class="wal-hint">${viewer ? '👁 highlighting what ' + esc(viewer) + ' sees' : 'pick a viewer to highlight visibility'}</span></div>
      <table class="mv-table"><thead><tr><th>key</th><th>value</th><th>xmin</th><th>xmax</th><th>state</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="wal-panel"><div class="wal-panel-h">Transactions</div><div class="mv-txns">${txnRows || '<div class="wal-empty">Begin a transaction.</div>'}</div></div>
  </div>

  <div class="bp-metrics">
    ${metric('Versions', m.versions)}
    ${metric('Live', m.liveVersions)}
    ${metric('Dead (VACUUM)', m.deadVersions)}
    ${metric('Active', m.activeTxns)}
    ${metric('Committed', m.committedTxns)}
    ${metric('Aborted', m.abortedTxns)}
  </div>
  <div class="wal-invariants">${inv.map((c) => `<span class="wal-inv ${c.ok ? 'ok' : 'bad'}" title="${esc(c.detail)}">${c.ok ? '✓' : '✗'} ${esc(c.name)}</span>`).join('')}</div>
  <div class="bp-explain"><span>▸</span> ${esc(s.note)}${s.lastRead ? ` <span class="mv-lastread">Last read: ${esc(s.lastRead.label)} saw ${esc(s.lastRead.key)} = ${s.lastRead.found ? esc(s.lastRead.value) : '∅'}.</span>` : ''}</div>`;
}

function metric(l, v) { return `<div class="bp-metric"><div class="bp-metric-v">${esc(v)}</div><div class="bp-metric-l">${esc(l)}</div></div>`; }
function flash(root, msg) {
  let el = root.querySelector('.wal-flash');
  if (!el) { el = document.createElement('div'); el.className = 'wal-flash'; root.appendChild(el); }
  el.textContent = '⚠ ' + msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

function howHTML() {
  const pg = src('pg-mvcc'), vac = src('pg-vacuum');
  const cite = (x, l) => x ? ` <a class="wal-cite" href="${x.url}" target="_blank" rel="noopener">${l}↗</a>` : '';
  return `<div class="wal-how">
    <h3>One row, many versions</h3>
    <p>Instead of overwriting, an UPDATE writes a <em>new</em> version of the row and stamps the old one as superseded. Each version carries <code>xmin</code> (the transaction that created it) and <code>xmax</code> (the transaction that replaced or deleted it). Readers pick the version their snapshot can see — so a read never waits for a writer.${cite(pg, 'PostgreSQL')}</p>
    <h3>Snapshots & visibility</h3>
    <p>At BEGIN a transaction captures a snapshot: the set of transactions still in progress and the next xid. A version is visible if its creator committed before the snapshot and its deleter hasn't (from the snapshot's point of view). Pick a viewer in the lab and watch rows light up.</p>
    <h3>First-updater-wins</h3>
    <p>Two transactions that update the same row concurrently conflict: the first to write holds it; the second gets a serialization failure (try the <em>Write-write conflict</em> scenario). This is how snapshot isolation prevents lost updates without read locks.</p>
    <h3>Dead tuples & VACUUM</h3>
    <p>A superseded version whose deleter has committed is <em>dead</em> — invisible to everyone, but still on the page until VACUUM reclaims it. Long-running transactions hold back that cleanup and cause bloat.${cite(vac, 'VACUUM')}</p>
  </div>`;
}

const IQ = [
  { q: 'How does MVCC let readers avoid blocking writers (and vice-versa)?',
    a: 'Writers create new row versions instead of overwriting, so a reader can keep reading the old version its snapshot sees while a writer produces a new one. Reads consult version visibility, not locks, so neither side waits on the other. Only writer-writer pairs on the same row conflict.',
    tip: 'The crisp line: "writes create versions, reads pick a version" — so only write/write on the same row contends.' },
  { q: 'What do xmin and xmax mean, and how is visibility decided?',
    a: 'xmin is the xid that created a version; xmax is the xid that deleted or superseded it. A version is visible to a transaction if its xmin committed before the transaction\'s snapshot and its xmax has not (from that snapshot\'s view). The snapshot records which transactions were in-flight at begin.',
    tip: 'Mention the snapshot = {in-progress xids, xid horizon} captured at begin.' },
  { q: 'Why does MVCC need VACUUM, and what makes it fall behind?',
    a: 'Dead versions (superseded, with a committed xmax) stay on the page until reclaimed; VACUUM removes them and frees space. A long-running transaction keeps an old snapshot alive, so versions it might still need cannot be removed — the dead-tuple horizon stalls and the table bloats.',
    tip: 'Name the culprit: a long-lived snapshot pins the removable-row horizon.' },
  { q: 'How does snapshot isolation differ from serializable, and what anomaly can it still allow?',
    a: 'SI gives each transaction a consistent snapshot and first-updater-wins on direct write conflicts, but it can still permit write skew — two transactions each read an overlapping set and update disjoint rows, together violating a constraint neither saw break. Serializable (e.g., SSI) adds conflict detection to rule that out.',
    tip: 'Name write skew specifically — that is the classic SI gap.' },
];
