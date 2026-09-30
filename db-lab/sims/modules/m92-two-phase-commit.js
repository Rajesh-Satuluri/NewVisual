import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'Phase 1 — Prepare',
    desc: 'Phase 1 (Voting): coordinator sends PREPARE to all participants. Each participant writes a prepare record to its WAL, acquires locks, and replies VOTE_YES or VOTE_NO. No commit yet — just a promise.',
    phase: 'prepare',
  },
  {
    label: 'All Vote YES — Commit',
    desc: 'Unanimous YES: coordinator writes COMMIT to its log and sends COMMIT to all. Participants apply changes, write commit record to WAL, and release locks. Transaction is durable on all nodes.',
    phase: 'commit',
  },
  {
    label: 'One Votes NO — Abort',
    desc: 'Any VOTE_NO triggers global abort. Coordinator sends ABORT to all participants. Each participant rolls back its prepared changes and releases locks. Atomicity guaranteed — all or nothing.',
    phase: 'abort',
  },
  {
    label: 'Coordinator Crash (Blocking)',
    desc: 'Critical flaw: coordinator crashes after PREPARE. P1 and P2 are stuck in PREPARED state — they hold locks but cannot decide. P3 does not know the transaction exists. This is the 2PC blocking problem. Locks are held until the coordinator recovers.',
    phase: 'crash',
  },
  {
    label: 'Recovery — Coordinator Restarts',
    desc: 'Recovery: coordinator restarts and consults its WAL. txn_id=42 has no COMMIT record, so it issues ABORT. Participants release their locks. Recovery is automatic but may take seconds to minutes — unacceptable for Prime Day\'s 100K tps.',
    phase: 'recover',
  },
  {
    label: '3PC & Modern Alternatives',
    desc: '3PC adds a PRE-COMMIT phase that eliminates blocking under crash failures (but not network partitions). In practice, systems use Raft-based consensus (etcd, CockroachDB) or Saga patterns instead of 2PC for distributed transactions.',
    phase: 'alternatives',
  },
];

// Layout constants (proportional, resolved in draw fn)
const COORD = { label: 'Coordinator', id: 'coord' };
const PARTICIPANTS = [
  { id: 'p1', label: 'P1\nNode A' },
  { id: 'p2', label: 'P2\nNode B' },
  { id: 'p3', label: 'P3\nNode C' },
];

function draw2PC(ctx, state, W, H) {
  const phase = state.phase || 'prepare';

  ctx.clearRect(0, 0, W, H);

  // ── helpers ──────────────────────────────────────────────────────────────
  function rr(x, y, bw, bh, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r);
    if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  }
  function txt(t, x, y, col, sz, align, bold) {
    ctx.fillStyle = col;
    ctx.font = `${bold ? '700 ' : ''}${sz || 11}px system-ui`;
    ctx.textAlign    = align || 'center';
    ctx.textBaseline = 'middle';
    const lines = t.split('\n');
    const lh = (sz || 11) + 3;
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh - (lines.length - 1) * lh / 2));
  }
  function arrow(fx, fy, tx, ty, col, lbl, dashed) {
    if (dashed) { ctx.setLineDash([5, 4]); }
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(ty - fy, tx - fx);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 9 * Math.cos(ang - 0.4), ty - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(tx - 9 * Math.cos(ang + 0.4), ty - 9 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    if (lbl) {
      const mx = (fx + tx) / 2;
      const my = (fy + ty) / 2;
      rr(mx - 40, my - 9, 80, 17, 3, '#0A0F1A', null);
      txt(lbl, mx, my, col, 8, 'center', true);
    }
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const BOX_W = 90, BOX_H = 30;
  const coordX = W / 2;
  const coordY = 38;
  const partYbase = coordY + 88;
  const partXs = [W * 0.18, W * 0.50, W * 0.82];
  const lifeBot = H - 50;

  // Draw coordinator
  function drawCoord(borderCol, labelExtra) {
    rr(coordX - BOX_W / 2, coordY, BOX_W, BOX_H, 5, borderCol + '22', borderCol, 2);
    txt(labelExtra ? `Coordinator\n${labelExtra}` : 'Coordinator', coordX, coordY + BOX_H / 2, borderCol, 9, 'center', true);
    // Lifeline
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(coordX, coordY + BOX_H); ctx.lineTo(coordX, lifeBot); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawParticipants(states) {
    // states: array of {col, badge} for P1, P2, P3
    PARTICIPANTS.forEach((p, i) => {
      const px = partXs[i];
      const s  = states[i] || { col: '#334155', badge: 'ACTIVE' };
      rr(px - BOX_W / 2, partYbase, BOX_W, BOX_H, 5, s.col + '22', s.col, 1.5);
      txt(p.label, px, partYbase + BOX_H / 2, s.col, 9, 'center', false);
      if (s.badge) {
        rr(px - 34, partYbase + BOX_H + 4, 68, 16, 3, s.col + '22', null);
        txt(s.badge, px, partYbase + BOX_H + 12, s.col, 7, 'center', true);
      }
      // Lifeline
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, partYbase + BOX_H); ctx.lineTo(px, lifeBot); ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  function wal(x, y, lines, col) {
    const lh = 11;
    const bh = 12 + lines.length * lh;
    rr(x, y, 104, bh, 4, '#0F172A', col, 1);
    txt('WAL', x + 52, y + 8, col, 8, 'center', true);
    lines.forEach((l, i) => txt(l, x + 52, y + 18 + i * lh, '#94A3B8', 7, 'center', false));
  }

  // ── PREPARE ───────────────────────────────────────────────────────────────
  if (phase === 'prepare') {
    txt('Phase 1 (Voting): Coordinator → PREPARE → All Participants', W / 2, 16, '#E2E8F0', 11, 'center', true);
    drawCoord('#A78BFA', 'txn_id=42  PREPARING');
    drawParticipants([
      { col: '#F59E0B', badge: 'ACTIVE' },
      { col: '#F59E0B', badge: 'ACTIVE' },
      { col: '#F59E0B', badge: 'ACTIVE' },
    ]);

    // PREPARE arrows coordinator → participants
    const aY = coordY + BOX_H + 12;
    partXs.forEach(px => {
      arrow(coordX, aY, px, partYbase - 6, '#A78BFA', 'PREPARE(42)');
    });

    // WALs for each participant (prepared)
    partXs.forEach((px, i) => {
      wal(px - 52, partYbase + BOX_H + 26, ['BEGIN txn=42', 'PREPARE rec written', 'locks acquired'], '#F59E0B');
    });

    txt('Each participant writes PREPARE to its WAL and acquires locks — but does NOT commit yet', W / 2, H - 18, '#64748B', 9, 'center', false);
  }

  // ── COMMIT ────────────────────────────────────────────────────────────────
  if (phase === 'commit') {
    txt('Phase 2 (Commit): Unanimous YES — Coordinator Sends COMMIT', W / 2, 16, '#E2E8F0', 11, 'center', true);
    drawCoord('#10B981', 'COMMIT  txn_id=42');
    drawParticipants([
      { col: '#10B981', badge: 'COMMITTED' },
      { col: '#10B981', badge: 'COMMITTED' },
      { col: '#10B981', badge: 'COMMITTED' },
    ]);

    // VOTE_YES back to coordinator
    const voteY = partYbase - 26;
    partXs.forEach(px => {
      arrow(px, voteY, coordX, coordY + BOX_H + 8, '#10B981', 'VOTE_YES');
    });

    // COMMIT down
    const commitY = coordY + BOX_H + 46;
    partXs.forEach(px => {
      arrow(coordX, commitY, px, partYbase - 6, '#10B981', 'COMMIT(42)');
    });

    // WALs
    partXs.forEach(px => {
      wal(px - 52, partYbase + BOX_H + 26, ['PREPARE txn=42', 'COMMIT txn=42', 'locks released'], '#10B981');
    });

    rr(W * 0.05, H - 36, W * 0.90, 22, 4, '#10B98111', '#10B981', 1.5);
    txt('Transaction durable on all nodes  |  All locks released  ✓', W / 2, H - 25, '#10B981', 9, 'center', true);
  }

  // ── ABORT ─────────────────────────────────────────────────────────────────
  if (phase === 'abort') {
    txt('Phase 2 (Abort): One VOTE_NO — Coordinator Sends ABORT to All', W / 2, 16, '#E2E8F0', 11, 'center', true);
    drawCoord('#EF4444', 'ABORT  txn_id=42');
    drawParticipants([
      { col: '#10B981', badge: 'VOTE_YES' },
      { col: '#EF4444', badge: 'VOTE_NO'  },
      { col: '#10B981', badge: 'VOTE_YES' },
    ]);

    // P2 VOTE_NO (red)
    arrow(partXs[1], partYbase - 26, coordX, coordY + BOX_H + 8, '#EF4444', 'VOTE_NO');

    // ABORT down to all
    const abortY = coordY + BOX_H + 48;
    partXs.forEach((px, i) => {
      arrow(coordX, abortY, px, partYbase - 6, '#EF4444', 'ABORT(42)');
    });

    // WALs
    partXs.forEach((px, i) => {
      wal(px - 52, partYbase + BOX_H + 26,
        i === 1
          ? ['PREPARE txn=42','VOTE_NO sent','ROLLBACK txn=42']
          : ['PREPARE txn=42','VOTE_YES sent','ROLLBACK txn=42'],
        '#EF4444');
    });

    rr(W * 0.05, H - 36, W * 0.90, 22, 4, '#EF444411', '#EF4444', 1.5);
    txt('Global abort — all participants roll back  |  Atomicity preserved: all-or-nothing  ✓', W / 2, H - 25, '#EF4444', 9, 'center', true);
  }

  // ── CRASH ─────────────────────────────────────────────────────────────────
  if (phase === 'crash') {
    txt('Blocking Problem: Coordinator Crashes After PREPARE', W / 2, 16, '#E2E8F0', 11, 'center', true);

    // Crashed coordinator (no lifeline drawn in body, just box)
    rr(coordX - BOX_W / 2, coordY, BOX_W, BOX_H, 5, '#EF444422', '#EF4444', 2);
    txt('Coordinator  [CRASH]', coordX, coordY + BOX_H / 2, '#EF4444', 9, 'center', true);
    // X mark
    ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(coordX - 12, coordY + 6);  ctx.lineTo(coordX + 12, coordY + 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(coordX + 12, coordY + 6);  ctx.lineTo(coordX - 12, coordY + 24); ctx.stroke();

    drawParticipants([
      { col: '#F59E0B', badge: 'PREPARED' },
      { col: '#F59E0B', badge: 'PREPARED' },
      { col: '#64748B', badge: 'ACTIVE'   },
    ]);

    // P1, P2 show locked state
    partXs.slice(0, 2).forEach(px => {
      rr(px - 36, partYbase + BOX_H + 26, 72, 18, 3, '#F59E0B22', '#F59E0B', 1);
      txt('locks held', px, partYbase + BOX_H + 35, '#F59E0B', 8, 'center', false);
    });

    // P3 — no knowledge
    rr(partXs[2] - 42, partYbase + BOX_H + 26, 84, 18, 3, '#1E293B', '#334155', 1);
    txt('no knowledge of txn', partXs[2], partYbase + BOX_H + 35, '#64748B', 7, 'center', false);

    // PREPARE arrows (dashed — already sent)
    ctx.setLineDash([4, 4]);
    partXs.slice(0, 2).forEach(px => {
      ctx.beginPath(); ctx.moveTo(coordX, coordY + BOX_H); ctx.lineTo(px, partYbase - 6);
      ctx.strokeStyle = '#A78BFA44'; ctx.lineWidth = 1; ctx.stroke();
    });
    ctx.setLineDash([]);

    // Timer
    rr(W * 0.35, partYbase + 72, W * 0.30, 22, 4, '#F59E0B11', '#F59E0B', 1.5);
    txt('waiting... cannot proceed', W * 0.50, partYbase + 83, '#F59E0B', 8, 'center', false);

    rr(W * 0.04, H - 44, W * 0.92, 30, 5, '#EF444411', '#EF4444', 1.5);
    txt('P1 & P2 hold database locks indefinitely — reads/writes to those rows block', W / 2, H - 32, '#EF4444', 9, 'center', true);
    txt('During Prime Day at 100K tps, every second of blocking is a flood of failed orders', W / 2, H - 18, '#EF4444', 8, 'center', false);
  }

  // ── RECOVER ───────────────────────────────────────────────────────────────
  if (phase === 'recover') {
    txt('Recovery: Coordinator Restarts, Reads WAL, Issues ABORT', W / 2, 16, '#E2E8F0', 11, 'center', true);

    drawCoord('#A78BFA', 'RESTARTED  reading WAL');
    drawParticipants([
      { col: '#10B981', badge: 'ABORTED' },
      { col: '#10B981', badge: 'ABORTED' },
      { col: '#64748B', badge: 'ACTIVE'  },
    ]);

    // WAL of coordinator
    wal(coordX - 52, coordY + BOX_H + 6, ['txn=42 PREPARE logged', '(no COMMIT record)', '→ decision: ABORT'], '#A78BFA');

    // ABORT arrows
    const ay = coordY + BOX_H + 58;
    partXs.forEach((px, i) => {
      arrow(coordX, ay, px, partYbase - 6, '#EF4444', 'ABORT(42)');
    });

    // WALs for P1, P2
    partXs.slice(0, 2).forEach(px => {
      wal(px - 52, partYbase + BOX_H + 26, ['PREPARE txn=42', 'received ABORT', 'ROLLBACK  locks freed'], '#10B981');
    });
    rr(partXs[2] - 52, partYbase + BOX_H + 26, 104, 36, 4, '#0F172A', '#334155', 1);
    txt('no action needed', partXs[2], partYbase + BOX_H + 44, '#64748B', 7, 'center', false);

    rr(W * 0.04, H - 44, W * 0.92, 30, 5, '#A78BFA11', '#A78BFA', 1.5);
    txt('Recovery is automatic — but recovery time may be seconds to minutes', W / 2, H - 32, '#A78BFA', 9, 'center', true);
    txt('At Prime Day scale (100K tps), even 10 seconds of blocking = 1M+ failed writes', W / 2, H - 18, '#EF4444', 8, 'center', false);
  }

  // ── ALTERNATIVES ──────────────────────────────────────────────────────────
  if (phase === 'alternatives') {
    txt('3PC & Modern Alternatives to 2PC', W / 2, 16, '#E2E8F0', 11, 'center', true);

    const items = [
      {
        title: '3PC (Three-Phase Commit)',
        lines: ['Adds PRE-COMMIT phase between PREPARE and COMMIT.', 'Allows participants to infer COMMIT if coordinator', 'crashes after PRE-COMMIT — eliminates blocking under', 'crash failures. Still blocks under network partition.'],
        col: '#A78BFA',
        x: W * 0.05, y: 44, w: W * 0.42, h: 96,
      },
      {
        title: 'Raft / Paxos Consensus',
        lines: ['Leader proposes, majority (quorum) of nodes ACK.', 'No single coordinator SPOF — any node can be leader.', 'Used in: etcd, CockroachDB, TiDB, Spanner.', 'Non-blocking under any single-node failure.'],
        col: '#10B981',
        mark: 'Recommended',
        x: W * 0.53, y: 44, w: W * 0.42, h: 96,
      },
      {
        title: 'Saga Pattern',
        lines: ['Local transactions + compensating actions.', 'No locks held across services. Eventual consistency.', 'Preferred for microservice architectures.', 'Used by: Amazon, Netflix, Uber Eats.'],
        col: '#F59E0B',
        mark: 'Recommended',
        x: W * 0.05, y: 156, w: W * 0.42, h: 96,
      },
      {
        title: 'XA Transactions',
        lines: ['SQL standard for distributed 2PC (ISO/IEC 10026).', 'Supported by MySQL, PostgreSQL, Oracle.', 'Same blocking failure mode as 2PC.', 'Rarely used in modern distributed systems.'],
        col: '#64748B',
        x: W * 0.53, y: 156, w: W * 0.42, h: 96,
      },
    ];

    items.forEach(item => {
      rr(item.x, item.y, item.w, item.h, 6, '#0F172A', item.col, 1.5);
      txt(item.title, item.x + item.w / 2, item.y + 14, item.col, 10, 'center', true);
      item.lines.forEach((l, i) => {
        txt(l, item.x + item.w / 2, item.y + 30 + i * 14, '#94A3B8', 8, 'center', false);
      });
      if (item.mark) {
        rr(item.x + item.w - 72, item.y + 4, 66, 16, 3, item.col + '33', item.col, 1);
        txt(item.mark, item.x + item.w - 39, item.y + 12, item.col, 7, 'center', true);
      }
    });

    // 3PC phase diagram
    const phases3 = ['PREPARE', 'PRE-COMMIT', 'COMMIT'];
    const pY = 268;
    const pSpan = (W * 0.42) / 3;
    phases3.forEach((p, i) => {
      const px = W * 0.05 + pSpan * i + pSpan / 2;
      const col = i === 1 ? '#A78BFA' : '#334155';
      rr(px - 34, pY, 68, 22, 4, col + '22', col, 1.5);
      txt(p, px, pY + 11, col, 7, 'center', true);
      if (i < 2) {
        ctx.beginPath(); ctx.moveTo(px + 34, pY + 11); ctx.lineTo(px + pSpan - 34, pY + 11);
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
      }
    });
    txt('3PC phases:', W * 0.05, pY - 12, '#A78BFA', 8, 'left', true);

    rr(W * 0.04, H - 40, W * 0.92, 26, 4, '#10B98111', '#10B981', 1.5);
    txt('Modern choice: Raft consensus for single-region databases, Saga pattern for microservices.', W / 2, H - 30, '#10B981', 9, 'center', true);
    txt('2PC is a legacy building block — understand it to explain why alternatives exist.', W / 2, H - 16, '#64748B', 8, 'center', false);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Two-Phase Commit — Protocol Deep Dive</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Phase 1: Voting','Coordinator sends PREPARE(txn_id) to all participants. Each participant: (1) acquires locks, (2) writes PREPARE record to WAL, (3) responds VOTE_YES or VOTE_NO. No data is committed. Participants promise to commit or abort on demand.','#A78BFA'],
      ['Phase 2: Decision','If all voted YES → coordinator writes COMMIT to its WAL and sends COMMIT to all. If any voted NO → coordinator sends ABORT. Participants execute the decision, write the outcome to WAL, and release locks. Coordinator\'s log record is the commit point.','#10B981'],
      ['The Blocking Problem','If coordinator crashes after Phase 1 but before Phase 2, participants are in PREPARED state indefinitely. They hold locks and cannot safely decide alone (they don\'t know if other participants voted YES or NO). This is the fundamental flaw of 2PC.','#EF4444'],
      ['WAL as the Source of Truth','Each node\'s Write-Ahead Log is authoritative. A coordinator that restarts checks its WAL: if it finds COMMIT for txn_id, it reissues COMMIT; if it finds only PREPARE (or nothing), it reissues ABORT. Participants do the same during recovery.','#F59E0B'],
      ['Presumed Abort Optimisation','Presumed Abort (PA) is an optimisation: if a coordinator crashes and has no COMMIT record in its WAL, it presumes the transaction aborted. This reduces WAL writes for the abort path — most production 2PC implementations use PA.','#06B6D4'],
      ['3PC vs 2PC','3PC adds a non-blocking phase: after collecting VOTE_YES, coordinator sends PRE-COMMIT to all before COMMIT. If coordinator crashes after PRE-COMMIT, participants can safely infer COMMIT (they know all others voted YES). Eliminates blocking under crash but not under partition.','#4F46E5'],
    ].map(([t,d,col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #10B981;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#34D399">CockroachDB & Spanner</strong> use a Raft-based consensus protocol (not 2PC) for distributed
    transactions. Each key range is managed by a Raft group. The Raft leader is the "coordinator". Because Raft is
    non-blocking under any single-node failure, there is no blocking problem. Google Spanner adds TrueTime to provide
    external consistency (serialisability across data centres) without a blocking coordinator.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Walk through the Two-Phase Commit protocol from coordinator to participant. What happens if the coordinator crashes between Phase 1 and Phase 2?',
      a: 'Phase 1 — coordinator sends PREPARE(txn_id) to all participants. Each participant acquires locks, writes a PREPARE record to its WAL, and replies VOTE_YES or VOTE_NO. Phase 2 — if all vote YES, coordinator writes COMMIT to its own WAL (the durability point) and sends COMMIT to all; participants commit, write to WAL, and release locks. If any vote NO, coordinator sends ABORT to all. Crash between phases: coordinator crashes after sending PREPARE but before writing COMMIT. Participants are stuck in PREPARED state — locks held, cannot commit or abort without coordinator direction. This is the 2PC blocking problem. Recovery: coordinator restarts, reads WAL, sees no COMMIT record for txn_id, issues ABORT to all participants.',
      tip: 'The critical durability point is when the coordinator writes COMMIT to its own WAL — not when it sends the message. That distinction often trips candidates.',
    },
    {
      q: 'Why is 2PC considered a blocking protocol? How does 3PC address this?',
      a: '2PC is blocking because a participant that voted VOTE_YES cannot safely decide without the coordinator: it does not know if all other participants also voted YES. So it must wait for the coordinator to recover. During that wait, all locks remain held. 3PC adds a PRE-COMMIT phase: coordinator sends PRE-COMMIT only after all participants vote YES. A participant that receives PRE-COMMIT knows all others voted YES. If the coordinator then crashes, participants can elect a new one and safely commit — because they know the global decision would have been COMMIT. 3PC eliminates blocking under crash failures but still blocks under network partitions (a partitioned participant cannot distinguish coordinator crash from network loss).',
    },
    {
      q: 'Why don\'t modern distributed databases like CockroachDB or Spanner use 2PC?',
      a: 'They use Raft-based consensus instead. Each key range (shard) is managed by a Raft group (typically 3–5 nodes). The Raft leader acts as the coordinator. Raft is non-blocking: if the leader fails, the remaining nodes elect a new leader via a quorum vote in sub-second time. There is no indefinite blocking. For cross-shard transactions, CockroachDB does use a variant of 2PC internally, but the coordinator role is held by the Raft leader of one shard — if that leader fails, Raft elects a new leader that can resume. The blocking window is bounded by Raft election timeout, typically 150–600ms — far better than 2PC recovery time.',
    },
    {
      q: 'What is the "presumed abort" optimisation in 2PC and how does it reduce WAL writes?',
      a: 'Without Presumed Abort: coordinator must write both PREPARE and ABORT records to its WAL for every transaction that aborts — to ensure recovery can determine the decision. With Presumed Abort (PA): the protocol presumes that if a coordinator\'s WAL has no COMMIT record for a txn_id, the transaction aborted. This means the coordinator does not need to write an ABORT record to its WAL — it is the default. Participants also do not need to acknowledge ABORT messages (the coordinator can forget the transaction). This saves 1–2 WAL writes per aborting transaction. Most production 2PC implementations (PostgreSQL XA, MySQL XA) use Presumed Abort.',
    },
  ]);
}

export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Two-Phase Commit Protocol',
    subtitle: 'Prepare then commit — classic cross-shard atomicity, its blocking failure mode, and modern alternatives.',
    tabs: [
      { id: 'anim',   label: 'Animation' },
      { id: 'detail', label: 'Details' },
      { id: 'iq',     label: 'Interview Q&A' },
    ],
  });

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:420px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const steps = STEPS.map((s, i) => ({
        label:    s.label,
        duration: 2600,
        mutate:   st => { st.phase = s.phase; st.stepIdx = i; },
      }));

      const engine = new SimulationEngine({
        initialState: { phase: 'prepare', stepIdx: 0 },
        steps,
        onRender: (state, cnv) => {
          const pr = window.devicePixelRatio || 1;
          cnv.width  = cnv.clientWidth  * pr;
          cnv.height = cnv.clientHeight * pr;
          const ctx  = cnv.getContext('2d');
          ctx.scale(pr, pr);
          draw2PC(ctx, state, cnv.clientWidth, cnv.clientHeight);
        },
      });

      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));

      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);

      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = STEPS[i].desc; });
      desc.textContent = STEPS[0].desc;
      return () => engine.destroy();
    },
    detail: renderDetail,
    iq:     renderIQ,
  });
  return null;
}
