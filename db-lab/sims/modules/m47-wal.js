/* ============================================================
   m47-wal.js — ⚡ Interactive Lab: Write-Ahead Logging & Crash Recovery.
   Renderer for the pure kernel in sims/kernels/wal.mjs. Every control
   dispatches a real op; the panels render the kernel's ACTUAL state
   (log, buffer vs disk, transactions, recovery passes). Nothing here
   is scripted — crash at any point and recovery recomputes live.
   ============================================================ */
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { createWal } from '../kernels/wal.mjs';

const PAGES = { A: 0, B: 0, C: 0 };

const PRESETS = {
  durability: {
    label: 'Durability (REDO)',
    hint: 'A committed txn whose page never reached disk is restored by REDO.',
    ops: [b('T1'), w('T1', 'A', 5), c('T1'), { type: 'crash' }],
  },
  atomicity: {
    label: 'Atomicity (UNDO)',
    hint: 'An uncommitted txn is rolled back by UNDO.',
    ops: [b('T1'), w('T1', 'A', 5), c('T1'), b('T2'), w('T2', 'B', 7), { type: 'crash' }],
  },
  steal: {
    label: 'Steal + UNDO',
    hint: 'A dirty page flushed to disk before commit is still undone after a crash.',
    ops: [b('T1'), w('T1', 'C', 9), { type: 'flushPage', page: 'C' }, { type: 'crash' }],
  },
  checkpoint: {
    label: 'Checkpoint + mixed',
    hint: 'A fuzzy checkpoint trims analysis; winners redone, losers undone.',
    ops: [b('T1'), w('T1', 'A', 1), c('T1'), { type: 'checkpoint' },
          b('T2'), w('T2', 'B', 2), b('T3'), w('T3', 'C', 3), c('T3'), { type: 'crash' }],
  },
};
function b(t) { return { type: 'begin', txn: t }; }
function w(t, p, v) { return { type: 'write', txn: t, page: p, value: v }; }
function c(t) { return { type: 'commit', txn: t }; }

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const src = (id) => (window.DBLab && window.DBLab.source && window.DBLab.source(id)) || null;

export function mount(host) {
  const shell = createModuleShell(host, {
    tag: '⚡ Interactive Lab · Transactions & Recovery',
    title: 'Write-Ahead Logging & Crash Recovery',
    subtitle: "Drive real transactions, crash the database at any point, and watch ARIES-style REDO + UNDO rebuild exactly the committed state. These panels render the kernel's actual state — nothing is scripted.",
    tabs: [{ id: 'lab', label: 'Lab' }, { id: 'how', label: 'How it works' }, { id: 'iq', label: 'Interview' }],
  });

  const teardown = initTabs(shell.tabs, shell.body, {
    lab: (panel) => mountLab(panel),
    how: (panel) => { panel.innerHTML = howHTML(); },
    iq: (panel) => { const iq = createIQSection(); panel.appendChild(iq.el); initIQ(iq, IQ); },
  });

  return { destroy() { if (typeof teardown === 'function') teardown(); } };
}

/* ── the interactive lab ──────────────────────────────────────────────────── */
function mountLab(panel) {
  let kernel = createWal({ pages: PAGES });
  let nextTxn = 1;

  const root = document.createElement('div');
  root.className = 'wal-lab';
  panel.appendChild(root);

  function act(op) {
    try { kernel.dispatch(op); }
    catch (e) { flash(root, e.message); return; }
    render();
  }

  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act;
    if (a === 'begin') { act({ type: 'begin', txn: 'T' + nextTxn }); nextTxn++; return; }
    if (a === 'write') {
      const t = root.querySelector('#wal-txn').value;
      const p = root.querySelector('#wal-page').value;
      const v = Number(root.querySelector('#wal-val').value);
      if (!t) return flash(root, 'Begin a transaction first.');
      act({ type: 'write', txn: t, page: p, value: v }); return;
    }
    if (a === 'flushPage') { act({ type: 'flushPage', page: root.querySelector('#wal-fpage').value }); return; }
    if (a === 'commit') return act({ type: 'commit', txn: el.dataset.txn });
    if (a === 'abort') return act({ type: 'abort', txn: el.dataset.txn });
    if (a === 'checkpoint') return act({ type: 'checkpoint' });
    if (a === 'flush') return act({ type: 'flush' });
    if (a === 'crash') return act({ type: 'crash' });
    if (a === 'recover') return act({ type: 'recover' });
    if (a === 'reset') { kernel.reset(); nextTxn = 1; return render(); }
    if (a === 'preset') {
      kernel.reset(); nextTxn = 1;
      const pr = PRESETS[el.dataset.preset];
      pr.ops.forEach((o) => { try { kernel.dispatch(o); } catch (e) {} });
      // keep nextTxn ahead of any Tn used by the preset
      pr.ops.forEach((o) => { if (o.txn) nextTxn = Math.max(nextTxn, Number(o.txn.slice(1)) + 1); });
      render();
    }
  });

  function render() { root.innerHTML = labHTML(kernel); }
  render();
}

/* ── rendering (pure: state → HTML) ───────────────────────────────────────── */
function labHTML(k) {
  const s = k.state, m = k.metrics(), inv = k.invariants();
  const active = s.pageIds; // page ids
  const activeTxns = Object.keys(s.txns).filter((t) => s.txns[t].status === 'active');

  return `
  <div class="wal-controls">
    <div class="wal-ctl-row">
      <button class="wal-btn" data-act="begin" ${s.phase !== 'running' ? 'disabled' : ''}>+ Begin txn</button>
      <span class="wal-sep"></span>
      <label class="wal-lbl">txn</label>
      <select id="wal-txn" class="wal-in" ${activeTxns.length ? '' : 'disabled'}>
        ${activeTxns.map((t) => `<option value="${t}">${t}</option>`).join('') || '<option>—</option>'}
      </select>
      <label class="wal-lbl">page</label>
      <select id="wal-page" class="wal-in">${active.map((p) => `<option>${p}</option>`).join('')}</select>
      <label class="wal-lbl">=</label>
      <input id="wal-val" class="wal-in wal-num" type="number" value="1" />
      <button class="wal-btn wal-primary" data-act="write" ${s.phase !== 'running' || !activeTxns.length ? 'disabled' : ''}>Write</button>
    </div>
    <div class="wal-ctl-row">
      <label class="wal-lbl">steal page</label>
      <select id="wal-fpage" class="wal-in">${active.map((p) => `<option>${p}</option>`).join('')}</select>
      <button class="wal-btn" data-act="flushPage" ${s.phase !== 'running' ? 'disabled' : ''}>Flush page → disk</button>
      <button class="wal-btn" data-act="flush" ${s.phase !== 'running' ? 'disabled' : ''}>Flush log</button>
      <button class="wal-btn" data-act="checkpoint" ${s.phase !== 'running' ? 'disabled' : ''}>Checkpoint</button>
      <span class="wal-sep"></span>
      <button class="wal-btn wal-danger" data-act="crash" ${s.phase !== 'running' ? 'disabled' : ''}>💥 Crash</button>
      <button class="wal-btn wal-recover" data-act="recover" ${s.phase !== 'crashed' ? 'disabled' : ''}>↻ Recover</button>
      <button class="wal-btn" data-act="reset">Reset</button>
    </div>
    <div class="wal-ctl-row wal-presets">
      <span class="wal-lbl">scenarios</span>
      ${Object.keys(PRESETS).map((id) => `<button class="wal-chip" data-act="preset" data-preset="${id}">${esc(PRESETS[id].label)}</button>`).join('')}
    </div>
  </div>

  <div class="wal-phase wal-phase--${s.phase}">${phaseLabel(s)}</div>

  <div class="wal-grid">
    ${logPanel(s)}
    <div class="wal-col">
      ${pagesPanel(s)}
      ${txnPanel(s, activeTxns)}
    </div>
  </div>

  ${s.recovery ? recoveryPanel(s) : ''}

  <div class="wal-metrics">
    ${metric('Log records', m.logRecords)}
    ${metric('Durable LSN', m.durableLSN)}
    ${metric('Dirty pages', m.dirtyPages)}
    ${metric('Committed', m.committedTxns)}
    ${metric('Redone', m.redone)}
    ${metric('Undone', m.undone)}
  </div>

  <div class="wal-invariants">
    ${inv.map((c) => `<span class="wal-inv ${c.ok ? 'ok' : 'bad'}" title="${esc(c.detail)}">${c.ok ? '✓' : '✗'} ${esc(c.name)}</span>`).join('')}
  </div>

  <div class="wal-explain"><span class="wal-explain-icon">${s.phase === 'crashed' ? '💥' : s.phase === 'recovered' ? '✅' : '▸'}</span> ${esc(s.note)}</div>

  <details class="wal-disc"><summary>Teaching model — what's simplified</summary>
    <ul>
      <li>Full-page values, not byte-level diffs.</li>
      <li>REDO replays the whole durable log (always correct); the checkpoint trims <em>analysis</em>, matching the idea of a recovery start point.</li>
      <li>Strict two-phase page locks are enforced — that's what makes blind UNDO safe.</li>
      <li>Steal + no-force buffer policy, like PostgreSQL/most engines.</li>
    </ul>
  </details>`;
}

function phaseLabel(s) {
  if (s.phase === 'running') return '● Running — build a transaction history, then crash it.';
  if (s.phase === 'crashed') return '💥 Crashed — buffer pool lost. Durable log kept to LSN ' + s.durableLSN + '. Run Recover.';
  const r = s.recovery;
  return '✅ Recovered — winners [' + (r.winners.join(', ') || '—') + '] redone, losers [' + (r.losers.join(', ') || '—') + '] undone.';
}

function logPanel(s) {
  const rows = s.log.map((r) => {
    const durable = r.lsn <= s.durableLSN;
    const detail = (r.type === 'update' || r.type === 'clr')
      ? `<span class="wal-pg">${r.page}</span> ${r.before !== undefined ? esc(r.before) + '→' : ''}${esc(r.after)}`
      : r.type === 'checkpoint'
        ? `active=[${(r.active || []).join(',')}] dirty=[${(r.dirty || []).join(',')}]`
        : '';
    return `<tr class="wal-lr wal-lr--${r.type} ${durable ? 'durable' : 'volatile'}">
      <td class="wal-lsn">${r.lsn}</td>
      <td><span class="wal-type wal-type--${r.type}">${r.type}${r.undoOf ? '·' + r.undoOf : ''}</span></td>
      <td class="wal-txncell">${r.txn || ''}</td>
      <td class="wal-detail">${detail}</td>
      <td class="wal-dur">${durable ? '🔒' : '…'}</td>
    </tr>`;
  }).join('');
  return `<div class="wal-panel wal-logpanel">
    <div class="wal-panel-h">Write-Ahead Log <span class="wal-hint">🔒 = durable · … = in memory</span></div>
    <table class="wal-logtbl"><tbody>${rows || '<tr><td class="wal-empty" colspan="5">Empty log.</td></tr>'}</tbody></table>
  </div>`;
}

function pagesPanel(s) {
  const cells = s.pageIds.map((p) => {
    const dirty = s.buffer[p] !== s.disk[p];
    const lock = s.locks[p];
    return `<div class="wal-page-card ${dirty ? 'dirty' : ''}">
      <div class="wal-page-id">${p}${lock ? `<span class="wal-lock" title="X-locked">🔒${lock}</span>` : ''}</div>
      <div class="wal-page-vals"><span class="wal-buf">buf ${esc(s.buffer[p])}</span><span class="wal-dsk">disk ${esc(s.disk[p])}</span></div>
    </div>`;
  }).join('');
  return `<div class="wal-panel"><div class="wal-panel-h">Pages <span class="wal-hint">buffer (volatile) vs disk (durable)</span></div><div class="wal-pages">${cells}</div></div>`;
}

function txnPanel(s, activeTxns) {
  const ids = Object.keys(s.txns);
  const rows = ids.map((t) => {
    const st = s.txns[t].status;
    const actions = st === 'active'
      ? `<button class="wal-mini wal-primary" data-act="commit" data-txn="${t}">commit</button><button class="wal-mini" data-act="abort" data-txn="${t}">abort</button>`
      : `<span class="wal-tstatus wal-tstatus--${st}">${st}</span>`;
    return `<div class="wal-txn-row"><span class="wal-txn-id">${t}</span>${actions}</div>`;
  }).join('');
  return `<div class="wal-panel"><div class="wal-panel-h">Transactions</div><div class="wal-txns">${rows || '<div class="wal-empty">No transactions yet.</div>'}</div></div>`;
}

function recoveryPanel(s) {
  const r = s.recovery;
  const redo = r.redo.map((x) => `<span class="wal-rr">LSN ${x.lsn}: ${x.page}=${esc(x.value)}${x.clr ? ' (clr)' : ''}</span>`).join('');
  const undo = r.undo.map((x) => `<span class="wal-rr undo">↩ undo LSN ${x.undoOf}: ${x.page}=${esc(x.value)}</span>`).join('');
  return `<div class="wal-panel wal-recpanel">
    <div class="wal-panel-h">Recovery — ANALYSIS → REDO → UNDO</div>
    <div class="wal-rec-line"><b>Analysis</b> from LSN ${r.startLSN}: winners <span class="wal-win">${r.winners.join(', ') || '—'}</span>, losers <span class="wal-lose">${r.losers.join(', ') || '—'}</span></div>
    <div class="wal-rec-line"><b>Redo</b> ${redo || '—'}</div>
    <div class="wal-rec-line"><b>Undo</b> ${undo || '—'}</div>
  </div>`;
}

function metric(label, val) {
  return `<div class="wal-metric"><div class="wal-metric-v">${esc(val)}</div><div class="wal-metric-l">${esc(label)}</div></div>`;
}

function flash(root, msg) {
  let el = root.querySelector('.wal-flash');
  if (!el) { el = document.createElement('div'); el.className = 'wal-flash'; root.appendChild(el); }
  el.textContent = '⚠ ' + msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ── "How it works" copy (sourced) ────────────────────────────────────────── */
function howHTML() {
  const pw = src('pg-wal'), cmu = src('cmu-15445');
  const cite = (x) => x ? ` <a class="wal-cite" href="${x.url}" target="_blank" rel="noopener">${esc(x.engine === '—' ? 'ref' : x.engine)}↗</a>` : '';
  return `<div class="wal-how">
    <h3>The write-ahead rule</h3>
    <p>Before any change reaches a data page on disk, the log record describing it must already be durable. A transaction's <code>COMMIT</code> returns only after its log is forced (fsync'd). That single rule buys both halves of recovery.${cite(pw)}</p>
    <h3>Steal + no-force</h3>
    <p><b>Steal:</b> the buffer pool may evict a dirty, uncommitted page to disk → recovery must be able to <b>UNDO</b>. <b>No-force:</b> a committed transaction's pages may still be only in the buffer at crash → recovery must be able to <b>REDO</b>. Try the <em>Steal + UNDO</em> scenario to see a flushed page get rolled back.</p>
    <h3>ARIES recovery, three passes</h3>
    <ol>
      <li><b>Analysis</b> — from the last checkpoint, rebuild which transactions were in-flight (losers) vs committed (winners), and which pages were dirty.</li>
      <li><b>Redo</b> — <em>repeat history</em>: replay every logged change (winners <em>and</em> losers) so the page state matches the instant of the crash.</li>
      <li><b>Undo</b> — roll back the losers in reverse LSN order, writing compensation log records (CLRs) so the undo is itself idempotent if we crash again mid-recovery.</li>
    </ol>
    <h3>Why UNDO is safe</h3>
    <p>Strict two-phase locking holds a page's exclusive lock until the transaction ends, so no committed transaction can have overwritten a loser's page after it. The lab enforces this — try writing the same page from two live transactions.${cite(cmu)}</p>
  </div>`;
}

const IQ = [
  { q: 'Why must the log be forced before a data page is written to disk?',
    a: "Otherwise a crash could leave a changed data page on disk with no log record to undo it — the database would be in a state no transaction produced, and recovery couldn't tell what to roll back. WAL guarantees every on-disk change is described by an already-durable log record.",
    tip: 'Name the rule precisely: log record durable *before* the corresponding data page — and commit returns only after its log is fsync\'d.' },
  { q: 'What do REDO and UNDO each fix, and why do you need both?',
    a: 'REDO re-applies committed changes that a no-force buffer policy left only in memory at crash (durability). UNDO rolls back uncommitted changes that a steal policy let reach disk (atomicity). Steal+no-force — the policy real engines use for performance — is exactly what makes both necessary.',
    tip: 'Map each pass to a buffer policy: no-force→REDO, steal→UNDO.' },
  { q: 'What is a CLR and why does ARIES write one during UNDO?',
    a: 'A Compensation Log Record records the undo of an update. It makes recovery idempotent: if the system crashes again during recovery, replaying up to the CLR (and its undoNext pointer) means each update is undone exactly once rather than re-undone.',
    tip: 'The keyword is idempotent recovery — CLRs stop repeated-undo during a crash-during-recovery.' },
  { q: 'How does a checkpoint speed up recovery?',
    a: 'A (fuzzy) checkpoint records the active transactions and dirty-page table, giving recovery a bounded starting point for the Analysis/Redo passes instead of scanning the whole log from the beginning. It bounds recovery time, not correctness.',
    tip: 'Stress that it bounds work, not correctness — redoing from earlier is always safe, just slower.' },
];
