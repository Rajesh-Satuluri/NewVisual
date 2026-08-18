/* ============================================================
   interview-bank.js — conceptual Q&A, scenario/case questions,
   and quiz items. Each entry links to the module that proves it.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.SolverViz = window.SolverViz || {});

  NS.Interview = {
    // Conceptual Q&A (searchable accordion)
    concepts: [
      { group: "Foundations", q: "What is the o9 Solver?", ref: "what-is-solver",
        a: "A constraint-aware, graph-traversal planning engine inside o9 IBP that translates demand signals into supply decisions (STOs, Purchase Schedules, distribution quantities) across the whole multi-echelon network in one coherent solve. In CATMPN it runs daily, fully automated." },
      { group: "Foundations", q: "Where does the solver sit in the planning engine?", ref: "planning-engine-stack",
        a: "In the middle of a 3-layer stack: the rule engine stages inputs BEFORE the solve; the solver makes supply decisions; the rule engine derives exceptions, delivery metrics and pegging AFTER the solve." },
      { group: "Foundations", q: "Is it a cost-optimising LP solver?", ref: "objectives",
        a: "No. It is demand-fulfilment-first and constraint-respecting, using a priority-weighted heuristic. It fulfils demand as completely as possible within constraints — it does not minimise cost as a primary objective." },
      { group: "Foundations", q: "What are the solver's components?", ref: "solver-components",
        a: "A Consumption Solver (what leaves an upstream node), a Production Solver (what arrives at a downstream node), and a WIP component (intermediate states + infeasibility). They are coupled." },
      { group: "DRP", q: "What is DRP and how does demand propagate?", ref: "drp-overview",
        a: "Distribution Requirements Planning: demand propagates upward — L1 customer LC (SCS Fcst Qty) → L2 regional DC (DRP Independent Demand) → L3 central DC → L4 supplier (Purchase Schedule) — solved in one integrated pass." },
      { group: "Inputs", q: "What input categories does the solver read?", ref: "constraint-params",
        a: "Six: demand, inventory, in-flight (committed) supply, network topology (BILT/BOD graphs), constraint parameters (Min/Mult/lead time/freeze), and capacity. All staged by the rule engine before the solve." },
      { group: "Inputs", q: "Why must in-flight supply be an input?", ref: "supply-order-inputs",
        a: "So the solver nets committed supply (open POs, in-transit STOs, firmed orders) against the requirement and does not double-order." },
      { group: "Constraints", q: "What is the freeze window and which parameter does the solver read?", ref: "freeze-windows",
        a: "The period where plans can't change because operations are underway. Firm Fence Date defines it; the solver reads Activity Freeze Time Bucket Offset – BT(Solver) directly to know how many buckets are locked. Inside it, no auto-order — a shortage exception is raised." },
      { group: "Constraints", q: "Explain Min vs Mult and the order of operations.", ref: "quantity-constraints",
        a: "Compute net requirement, apply Dist Box Qty Min (order at least N boxes), then round up to a Dist Box Qty Mult (multiple). For Widget-A: 70 boxes needed, Min 50 ✓, Mult 50 → 100 boxes = 500 units." },
      { group: "Constraints", q: "Hard vs soft constraints — give examples.", ref: "capacity-constraints",
        a: "Hard (never violated): freeze, Min/Mult, network validity, priority. Soft (may be breached, then flagged): capacity — the solver plans the breach and raises an exception rather than failing silently." },
      { group: "Decisions", q: "Walk me through the net-requirement calculation.", ref: "net-requirements",
        a: "Net Requirement = max(0, SCS Fcst Qty − SCS Beginning on Hand + Safety Stock Final). For Widget-A: max(0, 400 − 200 + 150) = 350 units, then Min/Mult round to a 500-unit order (Dist Prod Qty)." },
      { group: "Decisions", q: "How does the solver decide WHEN to order?", ref: "timing-logic",
        a: "Back-schedules: Required Ship Date = Required Delivery Date − Dist Lead Time. If the ship date is in the Plan Zone it places a receipt on the nearest valid delivery day; if inside the freeze it raises a shortage exception." },
      { group: "Decisions", q: "How are shortages handled?", ref: "shortage-handling",
        a: "Six steps: detect, priority-based fulfilment, record Short Qty, update the Delivery Plan (tiered by horizon), root-cause via MaterialRootCause(Solver), and set Short Exception Indicators. Never hidden." },
      { group: "Decisions", q: "How is allocation decided when supply is short?", ref: "allocation",
        a: "By hierarchy: Priority Parts → SCHEDULE ORDER → COMMERCIAL → PULL, tie-broken by Demand Priority – CCtILO(D). Allocated Qty records the result per customer." },
      { group: "Decisions", q: "What is pegging and why does it matter?", ref: "pegging",
        a: "Consumption/Production pegging traces which supply units fulfil which demand units, giving an audit trail from customer demand back to the specific PO — supporting promise accuracy and the same graph drives shortage root-cause." },
      { group: "Outputs", q: "What outputs does the solver produce?", ref: "solver-outputs",
        a: "Four families: Replenishment/Purchase Schedule (Dist Prod Qty, Purchase Schedule Qty), Inventory Projection (SCS Ending on Hand, InvHealth), Delivery Plan (Met OnTime/Late/Short), and Exception signals (Short Exception, Line Down Date, Reschedule)." }
    ],

    // Scenario / case interview questions (each links to a Sim Lab scenario)
    scenarios: [
      { q: "Supplier X has a production holiday on the day Widget-A must ship. What does the solver do?", scen: "sup-holi",
        a: "It reads Dist Supplier Prod Holiday and shifts the ship to the nearest valid PRIOR working day. If lead-time slack exists, on-time delivery is preserved; otherwise it flags lateness/shortage." },
      { q: "A Widget-A order's required ship date lands inside the Firm Fence. Walk me through it.", scen: "freeze",
        a: "The solver will NOT create supply inside the freeze. It raises a Short Exception Indicator and alerts the planner, who must manually override. No new auto-order is generated." },
      { q: "Forecast for Widget-A suddenly spikes. How does the solver react?", scen: "spike",
        a: "Net requirement rises, so it generates a larger and/or expedited order. But if the lead time can't cover the spike in time, it flags a partial shortage for the uncovered portion." },
      { q: "Week-3 receipts exceed LC-Store-A's inbound capacity. What happens?", scen: "capacity",
        a: "Capacity is soft: the solver spreads receipts across multiple valid days to stay within the inbound box limit; if it still can't fit, it flags a shortage. It won't overload the LC." },
      { q: "Widget-A is dual-sourced and Supplier X is on holiday. What does the solver do?", scen: "failover",
        a: "The Dist Supplier Split Ratio redirects demand to the available source (Supplier Y), placing the order there so demand is still met on time." },
      { q: "A shortage appears in Week 12. How does the solver surface it and what would you check?", scen: "freeze",
        a: "Because the solver projects 740 days, the Week-12 shortage is visible today via Cumulative Total Short Qty (tiered by horizon) and Short Exception Indicators. Check root cause via MaterialRootCause — supplier delay, DC shortage, or demand spike — before acting." }
    ],

    // Quiz items (single correct index)
    quiz: [
      { q: "Widget-A: demand 400, on-hand 200, safety stock 150. Net requirement?", opts: ["250", "350", "400", "550"], correct: 1,
        why: "max(0, 400 − 200 + 150) = 350 units." },
      { q: "70 boxes needed, Min 50, Mult 50. Order quantity?", opts: ["50 boxes", "70 boxes", "100 boxes", "150 boxes"], correct: 2,
        why: "Above Min; round up to the next multiple of 50 → 100 boxes." },
      { q: "Which is a HARD constraint?", opts: ["Inbound capacity", "Freeze window", "Demonstrated capacity", "Outbound capacity"], correct: 1,
        why: "Freeze is hard — never violated. Capacity constraints are soft." },
      { q: "Required ship date is inside the freeze. The solver…", opts: ["Orders anyway", "Raises a shortage exception", "Ignores the demand", "Doubles the order"], correct: 1,
        why: "No auto-order inside the freeze; it raises a Short Exception and alerts the planner." },
      { q: "Allocation priority order (highest first)?", opts: ["PULL → COMMERCIAL → SCHEDULE ORDER", "COMMERCIAL → PULL → SCHEDULE ORDER", "Priority Part → SCHEDULE ORDER → COMMERCIAL → PULL", "Random"], correct: 2,
        why: "Priority Parts and SCHEDULE ORDER customers are filled first." },
      { q: "Which measure traces a shortage to its upstream origin?", opts: ["EOQ Final", "MaterialRootCause(Solver)", "Dist Box Qty Mult", "SCS Ending on Hand"], correct: 1,
        why: "MaterialRootCause(Solver) walks the graph back to the shortage source." },
      { q: "The solver's primary objective is…", opts: ["Minimise cost", "Demand fulfilment on time", "Maximise inventory", "Minimise orders"], correct: 1,
        why: "Demand-fulfilment-first, constraint-respecting — not cost minimisation." },
      { q: "DRP demand propagates…", opts: ["Downward supplier→customer", "Upward customer→supplier", "Sideways", "It doesn't propagate"], correct: 1,
        why: "L1 customer LC up to L4 supplier." }
    ]
  };
})();
