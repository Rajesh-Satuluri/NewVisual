import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'The Problem: Partial Failure',
    desc: 'Distributed transaction problem: Order placed, inventory reserved, but payment fails. We have a partial write across 2 databases. There\'s no global ROLLBACK in microservices — each service has its own DB.',
    phase: 'problem',
  },
  {
    label: '2PC Approach',
    desc: 'Two-Phase Commit (2PC): a coordinator sends PREPARE to all participants, waits for unanimous YES, then sends COMMIT. If any say NO, it sends ABORT. Guarantees atomicity — but the coordinator is a single point of failure.',
    phase: '2pc',
  },
  {
    label: '2PC Failure Mode',
    desc: '2PC blocking problem: if the coordinator crashes after PREPARE, participants are stuck. They\'ve locked resources but don\'t know to commit or abort. They CANNOT release locks until the coordinator recovers. During Prime Day, this stalls thousands of orders.',
    phase: '2pc_fail',
  },
  {
    label: 'Saga Pattern',
    desc: 'The Saga pattern: instead of distributed locks, each step is a local transaction with a compensating action. On failure, sagas execute compensating transactions in reverse order. Eventual consistency — no locks held across services.',
    phase: 'saga',
  },
  {
    label: 'Outbox + Event Sourcing',
    desc: 'Outbox pattern: atomically write the domain event to an outbox table in the same DB transaction as the state change. A relay process streams outbox events to Kafka. Downstream services apply events idempotently. Zero distributed locking required.',
    phase: 'outbox',
  },
];

const SERVICES = [
  { id: 'order',   label: 'Order\nService',    x: 0.12 },
  { id: 'inv',     label: 'Inventory\nService', x: 0.37 },
  { id: 'pay',     label: 'Payment\nService',   x: 0.62 },
  { id: 'notify',  label: 'Notification\nSvc',  x: 0.87 },
];

function drawSeq(ctx, state, W, H) {
  const phase = state.phase || 'problem';

  ctx.clearRect(0, 0, W, H);

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
    // word-wrap for \n
    const lines = t.split('\n');
    const lh = (sz || 11) + 3;
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh - (lines.length - 1) * lh / 2));
  }
  function horizArrow(fx, fy, tx, ty, col, lbl, dashed, crossed) {
    if (dashed) { ctx.setLineDash([5, 4]); }
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
    ctx.strokeStyle = col; ctx.lineWidth = crossed ? 2 : 1.5; ctx.stroke();
    ctx.setLineDash([]);
    // arrowhead
    const ang = Math.atan2(ty - fy, tx - fx);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 9 * Math.cos(ang - 0.4), ty - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(tx - 9 * Math.cos(ang + 0.4), ty - 9 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    if (lbl) {
      const mx = (fx + tx) / 2;
      const my = (fy + ty) / 2;
      rr(mx - 36, my - 9, 72, 17, 3, '#0A0F1A', null);
      txt(lbl, mx, my, col, 8, 'center', true);
    }
    // red X cross-out
    if (crossed) {
      const mx = (fx + tx) / 2;
      const my = (fy + ty) / 2;
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(mx - 9, my - 7); ctx.lineTo(mx + 9, my + 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + 9, my - 7); ctx.lineTo(mx - 9, my + 7); ctx.stroke();
    }
  }

  // --- Lifeline rendering (used in problem, 2pc, 2pc_fail phases) ---
  function drawLifelines(svcList, topY, dbotY) {
    svcList.forEach(s => {
      const sx = s.x * W;
      // Box
      const bw = 80, bh = 34;
      rr(sx - bw / 2, topY, bw, bh, 5, '#0F172A', '#334155', 1.5);
      txt(s.label, sx, topY + bh / 2, '#CBD5E1', 9, 'center', false);
      // Lifeline
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, topY + bh); ctx.lineTo(sx, dbotY); ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  const headerY   = 14;
  const boxTopY   = 38;
  const lifeBot   = H - 30;

  // ─── PROBLEM phase ────────────────────────────────────────────────────────
  if (phase === 'problem') {
    txt('Partial Failure — No Global Rollback in Microservices', W / 2, headerY, '#E2E8F0', 11, 'center', true);
    const svcs = SERVICES.slice(0, 3);
    drawLifelines(svcs, boxTopY, lifeBot);

    const y1 = 110, y2 = 155, y3 = 200;
    // Order → Inventory: reserve ✓
    horizArrow(svcs[0].x * W + 40, y1, svcs[1].x * W - 40, y1, '#10B981', 'reserve(100 units)');
    horizArrow(svcs[1].x * W - 40, y1 + 18, svcs[0].x * W + 40, y1 + 18, '#10B981', 'OK ✓', false);

    // Order → Payment: charge ✗
    horizArrow(svcs[0].x * W + 40, y2, svcs[2].x * W - 40, y2, '#EF4444', 'charge($49.99)', false, false);
    horizArrow(svcs[2].x * W - 40, y2 + 20, svcs[0].x * W + 40, y2 + 20, '#EF4444', 'FAILED ✗', false, true);

    // STUCK badge on inventory
    rr(svcs[1].x * W - 34, y3 - 12, 68, 20, 4, '#EF444422', '#EF4444', 1.5);
    txt('STUCK', svcs[1].x * W, y3 - 2, '#EF4444', 9, 'center', true);
    txt('reserved 100 units', svcs[1].x * W, y3 + 16, '#64748B', 8, 'center', false);
    txt('but order failed', svcs[1].x * W, y3 + 28, '#64748B', 8, 'center', false);

    // Inconsistency note
    rr(W * 0.04, H - 68, W * 0.92, 36, 5, '#EF444411', '#EF4444', 1.5);
    txt('Inconsistent state: Inventory DB shows "reserved", Order DB shows "failed"', W / 2, H - 58, '#EF4444', 9, 'center', true);
    txt('Each service owns its DB — there is no global ROLLBACK', W / 2, H - 44, '#EF4444', 8, 'center', false);
  }

  // ─── 2PC phase ────────────────────────────────────────────────────────────
  if (phase === '2pc') {
    txt('Two-Phase Commit — Coordinator Orchestrates Atomicity', W / 2, headerY, '#E2E8F0', 11, 'center', true);
    // Coordinator box top-center
    const cx2 = W / 2;
    const cy2  = boxTopY;
    rr(cx2 - 52, cy2, 104, 28, 5, '#4F46E522', '#4F46E5', 2);
    txt('Coordinator', cx2, cy2 + 14, '#818CF8', 10, 'center', true);

    const svcs = SERVICES.slice(0, 3);
    const partY = boxTopY + 60;
    svcs.forEach(s => {
      rr(s.x * W - 38, partY, 76, 26, 5, '#0F172A', '#334155', 1.5);
      txt(s.label, s.x * W, partY + 13, '#CBD5E1', 8, 'center', false);
      // Lifeline
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x * W, partY + 26); ctx.lineTo(s.x * W, lifeBot); ctx.stroke();
      ctx.setLineDash([]);
    });

    const p1Y = partY + 50;
    const p2Y = partY + 100;

    // PREPARE arrows coordinator → participants
    svcs.forEach(s => {
      horizArrow(cx2, p1Y, s.x * W, p1Y + (s.x < 0.5 ? 10 : -10), '#A78BFA', 'PREPARE', true);
    });
    // Vote YES arrows participants → coordinator
    svcs.forEach(s => {
      horizArrow(s.x * W, p2Y + (s.x < 0.5 ? -10 : 10), cx2, p2Y, '#10B981', 'VOTE_YES');
    });

    // COMMIT arrows
    const p3Y = p2Y + 42;
    svcs.forEach(s => {
      horizArrow(cx2, p3Y, s.x * W, p3Y + (s.x < 0.5 ? 10 : -10), '#10B981', 'COMMIT', false);
    });

    // Phase labels
    rr(W * 0.04, p1Y - 12, 68, 18, 4, '#A78BFA22', '#A78BFA', 1);
    txt('Phase 1: Vote', W * 0.04 + 34, p1Y - 3, '#A78BFA', 8, 'center', true);
    rr(W * 0.04, p3Y - 12, 68, 18, 4, '#10B98122', '#10B981', 1);
    txt('Phase 2: Commit', W * 0.04 + 34, p3Y - 3, '#10B981', 8, 'center', true);
  }

  // ─── 2PC FAIL phase ───────────────────────────────────────────────────────
  if (phase === '2pc_fail') {
    txt('2PC Failure — Coordinator Crash After PREPARE', W / 2, headerY, '#E2E8F0', 11, 'center', true);
    const cx2 = W / 2;
    const cy2  = boxTopY;

    // Crashed coordinator
    rr(cx2 - 52, cy2, 104, 28, 5, '#EF444422', '#EF4444', 2);
    txt('Coordinator  CRASH', cx2, cy2 + 14, '#EF4444', 10, 'center', true);

    const svcs = SERVICES.slice(0, 3);
    const partY = boxTopY + 60;
    svcs.forEach((s, i) => {
      const col = i === 2 ? '#64748B' : '#F59E0B';
      rr(s.x * W - 38, partY, 76, 26, 5, col + '22', col, 1.5);
      txt(s.label, s.x * W, partY + 7, col, 8, 'center', false);
      const badge = i === 2 ? 'ACTIVE' : 'PREPARED';
      txt(badge, s.x * W, partY + 18, col, 7, 'center', true);
      // Lifeline
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x * W, partY + 26); ctx.lineTo(s.x * W, lifeBot); ctx.stroke();
      ctx.setLineDash([]);
    });

    const py = partY + 50;
    svcs.slice(0, 2).forEach(s => {
      rr(s.x * W - 34, py, 68, 18, 3, '#F59E0B22', '#F59E0B', 1);
      txt('locks held', s.x * W, py + 9, '#F59E0B', 8, 'center', false);
    });

    // Timer icon
    rr(cx2 - 44, cy2 + 44, 88, 24, 4, '#EF444411', '#EF4444', 1.5);
    txt('waiting for coordinator...', cx2, cy2 + 56, '#EF4444', 8, 'center', false);

    // Summary
    rr(W * 0.04, H - 68, W * 0.92, 40, 5, '#F59E0B11', '#F59E0B', 1.5);
    txt('Blocking problem: P0 & P1 hold locks but cannot commit or abort', W / 2, H - 57, '#F59E0B', 9, 'center', true);
    txt('Resources stay locked until coordinator recovers — stalls Prime Day orders', W / 2, H - 42, '#F59E0B', 8, 'center', false);
  }

  // ─── SAGA phase ───────────────────────────────────────────────────────────
  if (phase === 'saga') {
    txt('Saga Pattern — Local Transactions + Compensating Actions', W / 2, headerY, '#E2E8F0', 11, 'center', true);

    const steps2 = [
      { lbl:'T1: Reserve\nInventory', comp:'C1: Release\nInventory', col:'#10B981' },
      { lbl:'T2: Charge\nPayment',    comp:'C2: Refund',              col:'#EF4444', fail:true },
      { lbl:'T3: Confirm\nOrder',     comp:'C3: Cancel\nOrder',       col:'#64748B' },
    ];
    const stepW = (W - 60) / 3;
    const ty2 = 52;
    const cy2 = ty2 + 54;
    const compY = H - 90;

    steps2.forEach((s, i) => {
      const sx = 30 + stepW * i + stepW / 2;
      const col = s.fail ? '#EF4444' : (i === 2 ? '#334155' : '#10B981');

      // Transaction box
      rr(sx - 44, ty2, 88, 36, 5, col + '22', col, 1.5);
      txt(s.lbl, sx, ty2 + 18, col, 9, 'center', false);

      // Success/fail marker
      if (!s.fail && i !== 2) {
        txt('✓ OK', sx, ty2 + 46, '#10B981', 8, 'center', false);
      } else if (s.fail) {
        txt('✗ FAIL', sx, ty2 + 46, '#EF4444', 9, 'center', true);
      } else {
        txt('(skipped)', sx, ty2 + 46, '#64748B', 8, 'center', false);
      }

      // Compensating transaction box
      const cCol = i === 2 ? '#334155' : (s.fail ? '#EF4444' : '#A78BFA');
      rr(sx - 44, compY, 88, 36, 5, cCol + '22', cCol, 1.5);
      txt(s.comp, sx, compY + 18, cCol, 9, 'center', false);
      if (i === 0) { txt('← triggered', sx, compY + 46, '#A78BFA', 8, 'center', false); }

      // Arrow T→C for executed compensations
      if (i <= 1) {
        ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(sx, ty2 + 88);
        ctx.lineTo(sx, compY - 4);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Flow arrows forward
    [0, 1].forEach(i => {
      const x1 = 30 + stepW * i + stepW / 2 + 44;
      const x2 = 30 + stepW * (i + 1) + stepW / 2 - 44;
      const ay = ty2 + 18;
      ctx.beginPath(); ctx.moveTo(x1, ay); ctx.lineTo(x2, ay);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
      const ang = Math.atan2(0, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, ay);
      ctx.lineTo(x2 - 7 * Math.cos(ang - 0.4), ay - 7 * Math.sin(ang - 0.4));
      ctx.lineTo(x2 - 7 * Math.cos(ang + 0.4), ay - 7 * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fillStyle = '#334155'; ctx.fill();
    });

    // T2 fail annotation
    const fx = 30 + stepW * 1 + stepW / 2;
    rr(fx - 46, H - 40, 92, 20, 4, '#EF444411', '#EF4444', 1.5);
    txt('triggers C1 → C2', fx, H - 30, '#EF4444', 8, 'center', false);

    txt('No distributed locks  |  Eventual consistency  |  Each service owns its DB', W / 2, H - 10, '#64748B', 8, 'center', false);
  }

  // ─── OUTBOX phase ─────────────────────────────────────────────────────────
  if (phase === 'outbox') {
    txt('Outbox Pattern — Atomic Write + Reliable Event Delivery', W / 2, headerY, '#E2E8F0', 11, 'center', true);

    // Order DB with outbox table
    const dbX = W * 0.08, dbY = 46, dbW = 180, dbH = 120;
    rr(dbX, dbY, dbW, dbH, 6, '#0F172A', '#4F46E5', 2);
    txt('Order DB', dbX + dbW / 2, dbY + 14, '#4F46E5', 10, 'center', true);

    rr(dbX + 8, dbY + 26, dbW - 16, 28, 4, '#4F46E522', '#4F46E5', 1);
    txt('orders table', dbX + dbW / 2, dbY + 36, '#CBD5E1', 8, 'center', false);
    txt('status=CREATED', dbX + dbW / 2, dbY + 48, '#94A3B8', 7, 'center', false);

    rr(dbX + 8, dbY + 62, dbW - 16, 46, 4, '#10B98122', '#10B981', 1.5);
    txt('outbox table', dbX + dbW / 2, dbY + 74, '#10B981', 8, 'center', true);
    txt('event: ORDER_CREATED', dbX + dbW / 2, dbY + 86, '#94A3B8', 7, 'center', false);
    txt('{ orderId, amount, items }', dbX + dbW / 2, dbY + 97, '#94A3B8', 7, 'center', false);

    // Single tx bracket
    rr(dbX + 8, dbY + 22, 6, 68, 2, '#A78BFA', null);
    txt('1 local', dbX + 4, dbY + 56, '#A78BFA', 7, 'center', false);
    txt('txn', dbX + 4, dbY + 64, '#A78BFA', 7, 'center', false);

    // Relay process
    const relX = W * 0.42, relY = dbY + 40;
    rr(relX, relY, 100, 30, 5, '#0F172A', '#F59E0B', 1.5);
    txt('Outbox Relay', relX + 50, relY + 11, '#F59E0B', 9, 'center', true);
    txt('polls / CDC', relX + 50, relY + 22, '#64748B', 7, 'center', false);

    // Relay → Kafka arrow
    const kafX = W * 0.66, kafY = relY;
    const arrowX1 = relX + 100, arrowX2 = kafX;
    ctx.beginPath(); ctx.moveTo(arrowX1, relY + 15); ctx.lineTo(arrowX2, kafY + 15);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1.5; ctx.stroke();
    const ang2 = Math.atan2(0, arrowX2 - arrowX1);
    ctx.beginPath();
    ctx.moveTo(arrowX2, kafY + 15);
    ctx.lineTo(arrowX2 - 8 * Math.cos(ang2 - 0.4), kafY + 15 - 8 * Math.sin(ang2 - 0.4));
    ctx.lineTo(arrowX2 - 8 * Math.cos(ang2 + 0.4), kafY + 15 - 8 * Math.sin(ang2 + 0.4));
    ctx.closePath(); ctx.fillStyle = '#F59E0B'; ctx.fill();

    // Kafka
    rr(kafX, kafY, 90, 30, 5, '#0F172A', '#06B6D4', 1.5);
    txt('Kafka Topic', kafX + 45, kafY + 10, '#06B6D4', 9, 'center', true);
    txt('ORDER_EVENTS', kafX + 45, kafY + 21, '#94A3B8', 7, 'center', false);

    // Downstream consumers
    const consumers = [
      { lbl:'Inventory\nService', col:'#10B981' },
      { lbl:'Payment\nService',   col:'#A78BFA' },
      { lbl:'Notification\nSvc',  col:'#F59E0B' },
    ];
    const conY = kafY + 70;
    const cSpacing = W * 0.30 / 3;
    consumers.forEach((c, i) => {
      const cx2 = kafX + 15 + i * 90;
      rr(cx2 - 36, conY, 72, 28, 5, '#0F172A', c.col, 1.5);
      txt(c.lbl, cx2, conY + 14, c.col, 8, 'center', false);
      // Arrow from Kafka
      ctx.beginPath(); ctx.moveTo(kafX + 15 + i * 90, kafY + 30); ctx.lineTo(kafX + 15 + i * 90, conY);
      ctx.strokeStyle = c.col; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke();
      ctx.setLineDash([]);
    });

    // DB → relay arrow
    ctx.beginPath(); ctx.moveTo(dbX + dbW, dbY + 80); ctx.lineTo(relX, relY + 15);
    ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.5; ctx.stroke();

    // Note
    rr(W * 0.04, H - 48, W * 0.92, 38, 5, '#10B98111', '#10B981', 1.5);
    txt('Atomicity via single local transaction — outbox event published only if domain write succeeds', W / 2, H - 37, '#10B981', 9, 'center', true);
    txt('Downstream services apply events idempotently  |  Zero distributed locking', W / 2, H - 23, '#10B981', 8, 'center', false);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Distributed Transactions — Patterns & Trade-offs</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Why Distributed Txns Are Hard','Each microservice owns its own database. There is no shared lock manager, no shared undo log, and no global ROLLBACK. Network calls can fail at any point — including after one service commits but before another starts.','#EF4444'],
      ['2PC (Two-Phase Commit)','Coordinator collects VOTE_YES from all participants before sending COMMIT. Guarantees atomicity but: coordinator is a single point of failure; participants hold locks during the vote window; network partition during Phase 2 leaves participants blocking indefinitely.','#4F46E5'],
      ['Saga Pattern','Sequence of local transactions. On failure, execute compensating transactions in reverse. No distributed locks. Achieves eventual consistency. Complexity: compensating actions must be idempotent and must handle partial state (e.g., refunding a charge that\'s already partially processed).','#10B981'],
      ['Outbox Pattern','Write domain state + outbox event in a single ACID local transaction. A CDC relay (Debezium) or polling process reads the outbox and publishes to a message broker. Guarantees at-least-once delivery. Downstream services must be idempotent.','#F59E0B'],
      ['Saga Choreography vs Orchestration','Choreography: each service emits events and others react — fully decentralised, harder to trace. Orchestration: a central Saga orchestrator issues commands and awaits events — easier to reason about but adds a coordinator component (similar risk to 2PC coordinator).','#A78BFA'],
      ['Idempotency Keys','Critical for all at-least-once delivery patterns. Each operation carries a unique idempotency key. The consumer checks if the key was already processed before executing. Prevents double-charges, double-inventory-reservations during retries.','#06B6D4'],
    ].map(([t,d,col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">Amazon Orders architecture</strong> uses the Saga pattern with the Outbox to handle
    the Order → Inventory → Payment → Fulfilment chain. Each service has its own DB (DynamoDB or Aurora).
    Events flow through Amazon EventBridge. Each downstream service processes events idempotently using the
    order ID as an idempotency key stored in a deduplicate table with a TTL of 48 hours.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'An order is placed. Inventory is reserved. Payment fails. How do you handle this in a microservices architecture?',
      a: 'Use the Saga pattern with compensating transactions. Step 1: Order Service starts the saga. Step 2: it publishes a ReserveInventory command. Step 3: Inventory Service reserves stock and publishes InventoryReserved. Step 4: Order Service publishes ChargePayment. Step 5: Payment Service fails and publishes PaymentFailed. Step 6: the saga orchestrator (or choreography listener) publishes ReleaseInventory. Step 7: Inventory Service executes the compensating transaction — releases the reserved stock. The compensation must be idempotent: if ReleaseInventory is received twice, the second call is a no-op.',
      tip: 'Always mention idempotency of compensating transactions. That\'s the detail that separates senior answers.',
    },
    {
      q: 'Explain the Outbox pattern. Why is it needed if we already have Kafka?',
      a: 'Without the Outbox, you face a dual-write problem: you must write to your DB and publish to Kafka. If the DB commit succeeds but the Kafka publish fails (or vice versa), your state and your events diverge. The Outbox solves this by making both writes part of a single local ACID transaction: the domain row and an outbox row are committed together. A relay process (Debezium CDC or a polling job) then reads confirmed outbox rows and publishes to Kafka. The relay can retry safely because publishing to Kafka is idempotent (with exactly-once semantics or idempotency keys on the consumer side).',
    },
    {
      q: 'When would you choose 2PC over the Saga pattern?',
      a: '2PC is appropriate when: (1) you control all participants and can afford a blocking protocol (e.g., intra-cluster operations within a single RDBMS cluster), (2) the transaction is short-lived (milliseconds, not seconds), (3) you need strict serializability rather than eventual consistency. 2PC is inappropriate for microservices with independent databases because coordinator failure blocks all participants and because the lock-holding window across a network call is too long. For Prime Day at 100K tps, a 2PC coordinator crash would be catastrophic — Sagas are the right choice.',
    },
    {
      q: 'What is the difference between choreography and orchestration in Sagas?',
      a: 'Choreography: each service publishes events and subscribes to events from other services. No central coordinator. Pros: fully decentralised, no single point of failure. Cons: the overall flow is implicit and hard to visualise or debug; circular event chains can form. Orchestration: a Saga Orchestrator (a dedicated service or workflow engine like AWS Step Functions) issues explicit commands to each service and awaits their replies. Pros: the flow is explicit, easy to monitor, and easy to add steps. Cons: the orchestrator is an additional component that can fail. For complex flows with many steps and branches, orchestration is usually preferred.',
    },
  ]);
}

export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Distributed Transactions & Sagas',
    subtitle: 'Coordinate an atomic operation across multiple services — 2PC, Sagas, and the Outbox pattern.',
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
        initialState: { phase: 'problem', stepIdx: 0 },
        steps,
        onRender: (state, cnv) => {
          const pr = window.devicePixelRatio || 1;
          cnv.width  = cnv.clientWidth  * pr;
          cnv.height = cnv.clientHeight * pr;
          const ctx  = cnv.getContext('2d');
          ctx.scale(pr, pr);
          drawSeq(ctx, state, cnv.clientWidth, cnv.clientHeight);
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
