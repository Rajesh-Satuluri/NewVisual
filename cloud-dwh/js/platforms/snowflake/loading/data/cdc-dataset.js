/* ============================================================
   Incremental / CDC lab dataset (P0-C) — small, deterministic.
   A curated ORDERS table (business key order_id) fed by an initial
   snapshot and a series of change batches that deliberately include
   new rows, updates, a duplicate event, out-of-order changes, a
   delete, and a late-arriving change. Small enough to read row by
   row. Illustrative data only.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {}; viz.P.snowflake = viz.P.snowflake || {};

  // op: c=create, u=update, d=delete. lsn = source change sequence.
  const SNAPSHOT = [
    { event_id: 'e1', order_id: 1, customer_id: 'C10', status: 'NEW', amount: 100, updated_at: '2024-02-01 09:00', op: 'c', lsn: 1 },
    { event_id: 'e2', order_id: 2, customer_id: 'C11', status: 'NEW', amount: 50,  updated_at: '2024-02-01 09:05', op: 'c', lsn: 2 },
    { event_id: 'e3', order_id: 3, customer_id: 'C12', status: 'NEW', amount: 75,  updated_at: '2024-02-01 09:10', op: 'c', lsn: 3 },
  ];

  const BATCHES = [
    {
      id: 'b1', label: 'Batch 1 — new + update',
      note: 'A brand-new order (4) and an update to an existing one (1 → SHIPPED). The bread-and-butter incremental case.',
      events: [
        { event_id: 'e4', order_id: 4, customer_id: 'C13', status: 'NEW',     amount: 200, updated_at: '2024-02-01 09:20', op: 'c', lsn: 4 },
        { event_id: 'e5', order_id: 1, customer_id: 'C10', status: 'SHIPPED', amount: 100, updated_at: '2024-02-01 09:25', op: 'u', lsn: 5 },
      ],
    },
    {
      id: 'b2', label: 'Batch 2 — duplicate + out-of-order',
      note: 'Order 3 has two updates that arrive out of lsn order, plus a duplicate of one event. Correct result follows the highest lsn (PROCESSING), not arrival position.',
      events: [
        { event_id: 'e9', order_id: 3, customer_id: 'C12', status: 'PROCESSING', amount: 75, updated_at: '2024-02-01 09:50', op: 'u', lsn: 9 },
        { event_id: 'e8', order_id: 3, customer_id: 'C12', status: 'SHIPPED',    amount: 75, updated_at: '2024-02-01 09:45', op: 'u', lsn: 8 },
        { event_id: 'e8', order_id: 3, customer_id: 'C12', status: 'SHIPPED',    amount: 75, updated_at: '2024-02-01 09:45', op: 'u', lsn: 8 },
      ],
    },
    {
      id: 'b3', label: 'Batch 3 — delete',
      note: 'A CDC delete for order 4 (op=d). An insert/update-only MERGE will silently keep the row; only delete-aware logic removes it.',
      events: [
        { event_id: 'e10', order_id: 4, customer_id: 'C13', status: null, amount: null, updated_at: '2024-02-01 10:00', op: 'd', lsn: 10 },
      ],
    },
    {
      id: 'b4', label: 'Batch 4 — late-arriving',
      note: 'Order 2 changes to RETURNED with a real event time BEFORE the current timestamp watermark but a higher lsn. A timestamp-only watermark misses it; an lsn watermark catches it.',
      events: [
        { event_id: 'e11', order_id: 2, customer_id: 'C11', status: 'RETURNED', amount: 50, updated_at: '2024-02-01 08:00', op: 'u', lsn: 11 },
      ],
    },
  ];

  viz.P.snowflake.cdcDataset = {
    columns: ['order_id', 'customer_id', 'status', 'amount', 'updated_at', 'lsn'],
    snapshot: SNAPSHOT,
    batches: BATCHES,
    byId(id) { return this.batches.find(b => b.id === id); },
  };
})();
