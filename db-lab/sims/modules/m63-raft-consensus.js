/* ============================================================
   m63-raft-consensus.js — ⚡ Interactive Lab: Raft Consensus.
   Renderer for sims/kernels/replication.mjs. Elect a leader, append and
   replicate log entries, crash nodes and re-elect — watch committed
   entries survive as long as a quorum lives. Real kernel state throughout.
   ============================================================ */
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { createReplication } from '../kernels/replication.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const src = (id) => (window.DBLab && window.DBLab.source && window.DBLab.source(id)) || null;

export function mount(host) {
  const shell = createModuleShell(host, {
    tag: '⚡ Interactive Lab · Distributed',
    title: 'Raft Consensus & Replicated Log',
    subtitle: "Elect a leader, append commands, replicate to followers and commit on a quorum — then crash nodes and re-elect. Committed entries survive as long as a majority lives; lose quorum and progress stalls. The cluster state is the kernel's real state.",
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
  let kernel = createReplication({ nodes: 5 });
  let cmdSeq = 1;
  const root = document.createElement('div');
  root.className = 'raft-lab';
  panel.appendChild(root);

  function act(op) { try { kernel.dispatch(op); } catch (e) { flash(root, e.message); return; } render(); }

  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act;
    if (a === 'elect') return act({ type: 'elect', node: el.dataset.node });
    if (a === 'crash') return act({ type: 'crash', node: el.dataset.node });
    if (a === 'recover') return act({ type: 'recover', node: el.dataset.node });
    if (a === 'write') { act({ type: 'write', cmd: 'set' + cmdSeq }); cmdSeq++; return; }
    if (a === 'replicate') return act({ type: 'replicate' });
    if (a === 'reset') { kernel = createReplication({ nodes: 5 }); cmdSeq = 1; return render(); }
  });
  root.addEventListener('change', (ev) => { if (ev.target.id === 'raft-n') { kernel = createReplication({ nodes: Number(ev.target.value) }); cmdSeq = 1; render(); } });

  function render() { root.innerHTML = labHTML(kernel); }
  render();
}

function labHTML(k) {
  const s = k.state, m = k.metrics(), inv = k.invariants();
  const maxLen = Math.max(1, ...Object.keys(s.nodes).map((i) => s.nodes[i].log.length));

  const nodeCards = Object.keys(s.nodes).map((i) => {
    const nd = s.nodes[i];
    const isLeader = s.leader === i && nd.alive;
    const cells = [];
    for (let idx = 0; idx < maxLen; idx++) {
      const e = nd.log[idx];
      const committed = idx < nd.commitIndex;
      cells.push(`<span class="raft-le ${e ? (committed ? 'committed' : 'pending') : 'absent'}">${e ? esc(e.cmd) + '·t' + e.term : ''}</span>`);
    }
    return `<div class="raft-node ${nd.alive ? '' : 'crashed'} ${isLeader ? 'leader' : ''}">
      <div class="raft-node-h">
        <span class="raft-role">${!nd.alive ? '💀' : isLeader ? '👑' : nd.role === 'candidate' ? '🗳' : '•'} ${i}</span>
        <span class="raft-term">term ${nd.term}</span>
      </div>
      <div class="raft-log">${cells.join('') || '<span class="raft-empty">empty log</span>'}</div>
      <div class="raft-node-actions">
        ${nd.alive ? `<button class="raft-mini" data-act="elect" data-node="${i}">elect</button><button class="raft-mini danger" data-act="crash" data-node="${i}">crash</button>` : `<button class="raft-mini ok" data-act="recover" data-node="${i}">recover</button>`}
      </div>
    </div>`;
  }).join('');

  const nopt = [3, 5, 7].map((n) => `<option ${n === s.n ? 'selected' : ''}>${n}</option>`).join('');

  return `
  <div class="raft-controls">
    <div class="bp-row">
      <label class="bp-lbl">cluster</label><select id="raft-n" class="bp-in">${nopt}</select><span class="bp-lbl">nodes · quorum ${m.quorum}</span>
      <span class="bp-sep"></span>
      <button class="bp-btn bp-primary" data-act="write" ${s.leader ? '' : 'disabled'}>Client write</button>
      <button class="bp-btn" data-act="replicate" ${s.leader ? '' : 'disabled'}>Replicate →</button>
      <button class="bp-btn" data-act="reset">Reset</button>
    </div>
  </div>

  <div class="raft-status ${m.hasQuorum ? '' : 'noquorum'}">
    ${m.hasQuorum ? '● ' : '⚠ '}${m.alive}/${m.nodes} alive · leader ${esc(m.leader)} · term ${m.term} · committed ${m.committed}/${m.logLen}
    ${m.hasQuorum ? '' : ' — NO QUORUM: progress stalls until nodes recover'}
  </div>

  <div class="raft-nodes">${nodeCards}</div>

  <div class="bp-metrics">
    ${metric('Alive', m.alive + '/' + m.nodes)}
    ${metric('Quorum', m.quorum)}
    ${metric('Term', m.term)}
    ${metric('Leader', m.leader)}
    ${metric('Committed', m.committed)}
    ${metric('Log len', m.logLen)}
  </div>
  <div class="wal-invariants">${inv.map((c) => `<span class="wal-inv ${c.ok ? 'ok' : 'bad'}" title="${esc(c.detail)}">${c.ok ? '✓' : '✗'} ${esc(c.name)}</span>`).join('')}</div>
  <div class="bp-explain"><span>▸</span> ${esc(s.note)}</div>`;
}

function metric(l, v) { return `<div class="bp-metric"><div class="bp-metric-v">${esc(v)}</div><div class="bp-metric-l">${esc(l)}</div></div>`; }
function flash(root, msg) {
  let el = root.querySelector('.wal-flash');
  if (!el) { el = document.createElement('div'); el.className = 'wal-flash'; root.appendChild(el); }
  el.textContent = '⚠ ' + msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

function howHTML() {
  const raft = src('raft'), mit = src('mit-6584');
  const cite = (x, l) => x ? ` <a class="wal-cite" href="${x.url}" target="_blank" rel="noopener">${l}↗</a>` : '';
  return `<div class="wal-how">
    <h3>One leader per term</h3>
    <p>Raft divides time into terms. A follower that hears nothing becomes a candidate, bumps the term, and asks for votes. A node grants its vote only if the candidate's log is at least as up-to-date as its own — and each node votes once per term. A candidate that collects a majority becomes leader; otherwise the term ends with no leader and someone tries again.${cite(raft, 'Raft')}</p>
    <h3>Replicate, then commit on a majority</h3>
    <p>Clients send commands to the leader, which appends them to its log and replicates to followers. An entry is <b>committed</b> once it's stored on a majority — only then is it safe to apply, because any future leader must also hold it. Watch an entry go from pending to committed when replication reaches a quorum.</p>
    <h3>Why committed entries never disappear</h3>
    <p>A committed entry lives on a majority; a new leader needs votes from a majority; two majorities always overlap; and the up-to-date voting rule stops a node missing the entry from winning. So the new leader is guaranteed to have every committed entry. Crash the leader and a follower, then re-elect — the committed log survives.${cite(mit, 'MIT 6.5840')}</p>
    <h3>Safety vs liveness</h3>
    <p>Lose a majority (crash 3 of 5) and the cluster <em>cannot</em> elect a leader or commit — it correctly stops rather than risk inconsistency. That's the CAP trade: under a partition Raft keeps consistency and sacrifices availability.</p>
  </div>`;
}

const IQ = [
  { q: 'Why does a Raft entry need to be on a majority before it is committed?',
    a: 'Because leader election also requires a majority, and any two majorities intersect. If a committed entry is on a majority, every possible future leader shares at least one node that has it — and the up-to-date voting rule ensures that node won\'t elect a leader lacking it. Majority commit is what makes committed entries durable across leader changes.',
    tip: 'The quorum-intersection argument is the whole answer — say it explicitly.' },
  { q: 'What stops a stale node from being elected and erasing committed data?',
    a: 'The voting restriction: a server grants its vote only if the candidate\'s last log entry is at least as up-to-date (higher term, or same term and ≥ index) as its own. A node missing committed entries has a less up-to-date log, so the majority that holds those entries will refuse it — it cannot win.',
    tip: 'Name it the "up-to-date" / election restriction and tie it to log recency.' },
  { q: 'What happens to a Raft cluster of 5 when 3 nodes fail?',
    a: 'It loses quorum: no candidate can gather 3 votes, so no leader can be elected and no new entry can commit. The cluster halts progress (unavailable) but never commits conflicting state (consistent). Recovering one node restores quorum and progress resumes.',
    tip: 'Frame as the CAP choice: CP — sacrifice availability under partition, keep consistency.' },
  { q: 'How does the term number prevent split-brain / two leaders?',
    a: 'Terms are monotonically increasing and each node votes at most once per term, so at most one candidate can gather a majority in a term — at most one leader per term. A leader that sees a higher term immediately steps down to follower, so an old isolated leader can\'t keep committing once a newer term exists.',
    tip: 'Two facts: one vote per term → one leader per term; higher term seen → step down.' },
];
