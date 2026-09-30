import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── 2PC state machine data ─────────────────────────────────────────────────*/
// Coordinator sends PREPARE to all participants; waits for VOTE_YES/VOTE_NO;
// if all YES → COMMIT; if any NO → ABORT.
const PARTICIPANTS = ['Orders DB', 'Inventory DB', 'Payment DB'];

const TPC_STEPS = [
  {
    phase: 'begin',
    desc: 'BEGIN DISTRIBUTED TRANSACTION. Client sends a cross-service request: decrement inventory, charge payment, create order. The coordinator (gateway) opens a distributed transaction and assigns a global transaction ID (XID=7788).',
    coordinator: { state: 'begin', msg: 'BEGIN XID=7788' },
    participants: [
      { state: 'idle', vote: null, decided: null },
      { state: 'idle', vote: null, decided: null },
      { state: 'idle', vote: null, decided: null },
    ],
  },
  {
    phase: 'prepare',
    desc: 'Phase 1 — PREPARE. Coordinator sends PREPARE XID=7788 to all participants simultaneously. Each participant must: (1) acquire locks on all affected rows, (2) write a PREPARE record to its local WAL, (3) flush to disk — ensuring it can commit even if it crashes.',
    coordinator: { state: 'prepare', msg: 'PREPARE XID=7788 → all' },
    participants: [
      { state: 'preparing', vote: null, decided: null },
      { state: 'preparing', vote: null, decided: null },
      { state: 'preparing', vote: null, decided: null },
    ],
  },
  {
    phase: 'vote_yes',
    desc: 'All three participants vote YES. Each has locked its rows and durably written the PREPARE log record. They are now "in-doubt" — committed to commit IF the coordinator decides COMMIT, but not yet committed.',
    coordinator: { state: 'vote_collect', msg: 'Collecting votes…' },
    participants: [
      { state: 'prepared', vote: 'YES', decided: null },
      { state: 'prepared', vote: 'YES', decided: null },
      { state: 'prepared', vote: 'YES', decided: null },
    ],
  },
  {
    phase: 'commit',
    desc: 'Phase 2 — COMMIT. All votes are YES. Coordinator writes a COMMIT record to its own WAL (durable), then broadcasts COMMIT XID=7788 to all participants. This write is the single point of atomicity — if coordinator crashes here, it will re-send COMMIT on recovery.',
    coordinator: { state: 'commit', msg: 'COMMIT XID=7788 → all' },
    participants: [
      { state: 'committing', vote: 'YES', decided: null },
      { state: 'committing', vote: 'YES', decided: null },
      { state: 'committing', vote: 'YES', decided: null },
    ],
  },
  {
    phase: 'done',
    desc: 'All participants commit and send ACK. Each releases its locks and writes a COMMIT record to its own WAL. The transaction is globally committed. Coordinator receives all ACKs and marks XID=7788 complete.',
    coordinator: { state: 'done', msg: 'XID=7788 COMMITTED ✓' },
    participants: [
      { state: 'committed', vote: 'YES', decided: 'COMMIT' },
      { state: 'committed', vote: 'YES', decided: 'COMMIT' },
      { state: 'committed', vote: 'YES', decided: 'COMMIT' },
    ],
  },
  {
    phase: 'abort_vote',
    desc: 'FAILURE SCENARIO: Payment DB votes NO (insufficient funds). Even one NO vote forces a global ABORT. The coordinator must send ABORT to ALL participants — even those that voted YES must roll back.',
    coordinator: { state: 'vote_collect', msg: 'Got NO vote — must ABORT' },
    participants: [
      { state: 'prepared', vote: 'YES', decided: null },
      { state: 'prepared', vote: 'YES', decided: null },
      { state: 'prepared', vote: 'NO',  decided: null },
    ],
  },
  {
    phase: 'abort_done',
    desc: 'ABORT broadcast. Coordinator writes ABORT to WAL and sends ABORT XID=7788 to all participants. Orders DB and Inventory DB roll back their local changes and release locks — despite having voted YES. The in-doubt window is resolved.',
    coordinator: { state: 'abort', msg: 'ABORT XID=7788 → all' },
    participants: [
      { state: 'aborted', vote: 'YES', decided: 'ABORT' },
      { state: 'aborted', vote: 'YES', decided: 'ABORT' },
      { state: 'aborted', vote: 'NO',  decided: 'ABORT' },
    ],
  },
];

/* ── Canvas ─────────────────────────────────────────────────────────────────*/
const STATE_COLOR = {
  idle:       '#334155',
  preparing:  '#F59E0B',
  prepared:   '#818CF8',
  committing: '#10B981',
  committed:  '#10B981',
  aborted:    '#EF4444',
  blocked:    '#EF4444',
};

const COORD_COLOR = {
  begin:        '#64748B',
  prepare:      '#F59E0B',
  vote_collect: '#818CF8',
  commit:       '#10B981',
  done:         '#10B981',
  abort:        '#EF4444',
};

function drawTPC(ctx, stepIdx, w, h) {
  const step = TPC_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const coordX = w / 2, coordY = 50, coordW = 180, coordH = 44;
  const partW = 130, partH = 72;
  const partY = h - 110;
  const spacing = (w - 32) / 3;

  // ── Draw coordinator ──
  const cCol = COORD_COLOR[step.coordinator.state] || '#64748B';
  ctx.fillStyle = cCol + '22';
  ctx.strokeStyle = cCol;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(coordX - coordW / 2, coordY - coordH / 2, coordW, coordH, 6);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = cCol; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('COORDINATOR', coordX, coordY - 7);
  ctx.font = '8.5px monospace';
  ctx.fillText(step.coordinator.msg, coordX, coordY + 9);

  // Phase badge
  const phaseLabel = step.phase.replace(/_/g, ' ').toUpperCase();
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = cCol; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(coordX - 44, coordY + 18, 88, 16, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = cCol; ctx.font = '700 8px system-ui';
  ctx.fillText(phaseLabel, coordX, coordY + 29);

  // ── Draw participants and wires ──
  PARTICIPANTS.forEach((name, i) => {
    const px = 16 + i * spacing + spacing / 2;
    const p = step.participants[i];
    const col = STATE_COLOR[p.state] || '#334155';

    // Wire from coordinator to participant
    const wireColor = p.state === 'preparing' || p.state === 'committing' || p.state === 'aborted'
      ? (p.decided === 'ABORT' ? '#EF4444' : p.vote === 'NO' ? '#EF4444' : '#10B981')
      : (p.vote ? '#818CF8' : '#1E293B');
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = p.state === 'idle' ? 0.5 : 1.5;
    ctx.setLineDash(p.state === 'idle' ? [4, 4] : []);
    ctx.beginPath();
    ctx.moveTo(coordX, coordY + coordH / 2);
    ctx.lineTo(px, partY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Participant box
    ctx.fillStyle = col + '22';
    ctx.strokeStyle = col;
    ctx.lineWidth = p.state === 'prepared' || p.state === 'committed' ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(px - partW / 2, partY, partW, partH, 6);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = col; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(name, px, partY + 16);

    ctx.fillStyle = '#94A3B8'; ctx.font = '8px system-ui';
    ctx.fillText(p.state.toUpperCase(), px, partY + 30);

    if (p.vote !== null) {
      const vCol = p.vote === 'YES' ? '#10B981' : '#EF4444';
      ctx.fillStyle = vCol; ctx.font = '700 9px system-ui';
      ctx.fillText(`VOTE: ${p.vote}`, px, partY + 44);
    }

    if (p.decided !== null) {
      const dCol = p.decided === 'COMMIT' ? '#10B981' : '#EF4444';
      ctx.fillStyle = dCol; ctx.font = '700 9px system-ui';
      ctx.fillText(p.decided, px, partY + 58);
    }
  });

  // ── Timeline legend ──
  const phases = ['BEGIN', 'PREPARE', 'VOTE', 'COMMIT/ABORT', 'DONE'];
  const phaseColors = ['#64748B', '#F59E0B', '#818CF8', '#10B981', '#10B981'];
  const tw = (w - 32) / phases.length;
  phases.forEach((ph, i) => {
    const tx = 16 + i * tw + tw / 2;
    const ty = h - 20;
    const isActive = ph.toLowerCase().includes(step.phase.split('_')[0]);
    ctx.fillStyle = isActive ? phaseColors[i] : '#1E293B';
    ctx.strokeStyle = isActive ? phaseColors[i] : '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(tx - 46, ty - 10, 92, 16, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#0F172A' : '#475569';
    ctx.font = `${isActive ? '700' : '400'} 7.5px system-ui`; ctx.textAlign = 'center';
    ctx.fillText(ph, tx, ty + 3);
  });
  ctx.textAlign = 'left';
}

/* ── Protocol reference tab ─────────────────────────────────────────────────*/
function renderProtocolTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Two-Phase Commit Protocol</h3>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
    ${[
      { phase:'Phase 1: Prepare', color:'#F59E0B', steps:[
        'Coordinator sends PREPARE to all participants',
        'Each participant: acquire locks, write PREPARE to WAL, flush to disk',
        'Participant responds VOTE_YES (can commit) or VOTE_NO (must abort)',
        'Participant is now "in-doubt" — cannot unilaterally decide',
      ]},
      { phase:'Phase 2: Commit or Abort', color:'#10B981', steps:[
        'If all votes YES → coordinator writes COMMIT to its WAL (flush)',
        'Coordinator sends COMMIT to all participants',
        'Each participant commits, releases locks, sends ACK',
        'If any vote NO → coordinator writes ABORT, sends ABORT to all',
      ]},
    ].map(s => `
      <div style="border-left:3px solid ${s.color};padding-left:12px">
        <h4 style="margin:0 0 8px;color:${s.color};font-size:12px">${s.phase}</h4>
        ${s.steps.map(st => `<p style="margin:0 0 5px;font-size:11.5px">• ${st}</p>`).join('')}
      </div>
    `).join('')}
  </div>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Failure Scenarios</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Failure Point</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">What Happens</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Resolution</th></tr></thead>
    <tbody>
      ${[
        ['Participant crashes before PREPARE','Coordinator times out, ABORTs all','Participant recovers with no in-doubt record — safe to ignore'],
        ['Participant crashes after PREPARE (in-doubt)','Coordinator waits for ACK; retries','Participant recovers, finds PREPARE in WAL, asks coordinator for decision'],
        ['Coordinator crashes before writing COMMIT','All participants in-doubt indefinitely','Human intervention OR recovery protocol (e.g., Paxos-based coordinator)'],
        ['Coordinator crashes after writing COMMIT','Participants in-doubt until recovery','On coordinator restart: re-read WAL, re-send COMMIT to all'],
        ['Network partition during Phase 2','Participant never receives COMMIT','Coordinator retries COMMIT infinitely until participant responds'],
      ].map(([f,w,r]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#F59E0B;font-size:11px">${f}</td>
        <td style="padding:7px 10px;font-size:11px">${w}</td>
        <td style="padding:7px 10px;color:#10B981;font-size:11px">${r}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div style="background:#071C10;border:1px solid #065F46;border-radius:6px;padding:14px;font-size:12px">
    <strong style="color:#10B981">PostgreSQL 2PC:</strong> Use <code>PREPARE TRANSACTION 'gid'</code> and <code>COMMIT PREPARED 'gid'</code>. Prepared transactions appear in <code>pg_prepared_xacts</code>. They hold locks indefinitely — always have a recovery process that resolves in-doubt transactions, or they block other sessions forever.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is the "in-doubt" problem in two-phase commit, and why is it unavoidable?',
      a: `After a participant votes YES and writes PREPARE to its WAL, it enters the "in-doubt" state: it has promised it can commit, but it hasn't received the coordinator's decision yet. It cannot unilaterally decide — if it commits and the coordinator decided ABORT, that breaks atomicity; if it aborts and the coordinator decided COMMIT, same problem.<br><br>
The in-doubt window is the core vulnerability of 2PC. If the coordinator crashes after all participants have voted YES but before broadcasting the decision, all participants are blocked indefinitely holding locks, waiting for a coordinator that cannot respond. This is why 2PC is called a <strong>blocking protocol</strong> — it cannot make progress under certain failure combinations without external intervention (coordinator recovery, manual resolution, or a separate consensus protocol like Paxos for the coordinator itself).`,
    },
    {
      q: 'How does PostgreSQL implement prepared transactions, and what are the operational risks?',
      a: `PostgreSQL supports 2PC via <code>PREPARE TRANSACTION 'global_id'</code> which durably saves the transaction state (acquired locks, WAL records) to <code>pg_twophase/</code> on disk. The transaction's XID is no longer associated with the backend — it appears in <code>pg_prepared_xacts</code> and persists across server restarts.<br><br>
Operational risks: (1) <strong>Indefinite lock holding</strong> — a prepared transaction holds row-level and table-level locks until resolved with <code>COMMIT PREPARED</code> or <code>ROLLBACK PREPARED</code>. If the coordinator application crashes and no recovery process cleans it up, those locks block other queries forever. (2) <strong>VACUUM blocking</strong> — prepared transactions have a snapshot, preventing VACUUM from reclaiming dead tuples created before the PREPARE. (3) <code>max_prepared_transactions</code> (default 0 in PostgreSQL) must be set > 0 to enable 2PC. If not set, <code>PREPARE TRANSACTION</code> fails.`,
    },
    {
      q: 'Why do modern distributed systems avoid two-phase commit in favor of sagas or eventual consistency?',
      a: `2PC has three fundamental production problems: (1) <strong>Latency</strong>: two round trips (prepare + commit) across geographically distributed services add 50–200ms per transaction even on fast networks. (2) <strong>Availability</strong>: 2PC requires ALL participants to be reachable — one unavailable service blocks the entire transaction, violating availability guarantees that a distributed system normally provides. (3) <strong>Blocking under failure</strong>: coordinator crash during Phase 2 leaves participants holding locks indefinitely.<br><br>
Sagas decompose a distributed transaction into a sequence of local transactions, each with a compensating transaction (undo action). If step 3 fails, steps 1 and 2 are compensated (rolled back logically, not atomically). This trades strict atomicity for availability and latency — acceptable for many business operations (order cancellation compensates order creation) but not for financial transfers requiring strict ACID. The choice depends on whether the business domain allows compensating actions to express the "undo."`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Two-Phase Commit',
    subtitle: 'Coordinator–participant protocol for atomic distributed transactions — prepare, vote, commit, and the in-doubt problem',
    tabs: [
      { id:'anim',     label:'2PC Walkthrough' },
      { id:'protocol', label:'Protocol Reference' },
      { id:'iq',       label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = TPC_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawTPC(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = TPC_STEPS[i].desc; });
      desc.textContent = TPC_STEPS[0].desc;
      return () => engine.destroy();
    },
    protocol: renderProtocolTab,
    iq: renderIQ,
  });
  return null;
}
