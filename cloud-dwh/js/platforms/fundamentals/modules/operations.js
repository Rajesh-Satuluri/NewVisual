/* Fundamentals · Operations group — governance & security, and cost
   models & tuning. Authored for the shared FundKit. */
(function () {
  'use strict';
  const Kit = window.CDWH && window.CDWH.FundKit;
  if (!Kit) return;

  Kit.registerAll({

    /* ─────────────────── Governance & security ─────────────────── */
    'fund-governance': {
      eyebrow: '🛡️ Operations',
      title: 'Governance & security',
      lead: 'A warehouse concentrates an organization\'s most sensitive data in one place, so controlling <strong>who can see and do what</strong> is essential. The building blocks are universal: role-based access control, fine-grained row/column security, masking, and a governance layer for cataloging, lineage, and classification.',
      sections: [
        { h: 'RBAC and least privilege', p:
          '<p>Rather than granting permissions to each user, you grant them to <strong>roles</strong> ("analyst", "finance", "etl_loader") and assign users to roles. Roles can inherit from one another to form a hierarchy. The guiding principle is <strong>least privilege</strong>: every role gets the minimum access it needs and no more, which limits blast radius if an account is compromised.</p>' },
        { h: 'Fine-grained: row, column, and masking', p:
          '<p>Table-level grants are often too coarse. <strong>Row-level security (RLS)</strong> filters which rows a user sees (e.g. a regional manager sees only their region). <strong>Column-level security (CLS)</strong> hides whole columns. <strong>Dynamic data masking</strong> shows a transformed value — <code>***-**-1234</code> instead of a full SSN — based on the viewer\'s role, so the same query returns different detail to different people.</p>' },
        { h: 'The governance layer', p:
          '<p>Beyond access control, governance answers "what data do we have, where did it come from, and is it sensitive?" — a <strong>catalog</strong> of datasets, <strong>lineage</strong> tracing how tables were derived, <strong>classification</strong> and sensitivity labels, and <strong>audit</strong> logs. Encryption at rest and in transit is table stakes everywhere.</p>' },
      ],
      diagramTitle: '🎬 One query, filtered by who is asking',
      stage: { caption: 'The same query returns different data depending on the viewer\'s role',
        groups: [
          { id: 'users', label: 'Users in roles', nodes: [ { id: 'admin', label: 'Admin role' }, { id: 'region', label: 'Regional analyst' }, { id: 'support', label: 'Support agent' } ], connectorAfter: 'same SQL, different results' },
          { id: 'policy', label: 'Security policies', sub: 'RBAC · RLS · CLS · masking', nodes: [ { id: 'rbac', label: 'Role check' }, { id: 'rls', label: 'Row filter' }, { id: 'mask', label: 'Column mask' } ], connectorAfter: 'enforced at query time' },
          { id: 'data', label: 'Governed table', nodes: [ { id: 'tbl', label: 'Sensitive data' } ], connectorAfter: 'cataloged & audited' },
          { id: 'gov', label: 'Governance layer', nodes: [ { id: 'lineage', label: 'Catalog · lineage · labels · audit' } ] },
        ] },
      steps: [
        { label: 'Roles', title: 'Access is granted to roles', on: { spot: ['users'], flow: ['admin', 'region', 'support'] },
          body: 'Users belong to roles with least-privilege grants. The admin, a regional analyst, and a support agent run the <strong>same</strong> query but should not see the same data.',
          facts: ['Grant to roles, not users', 'Roles form a hierarchy', 'Least privilege by default'] },
        { label: 'Row security', title: 'RLS filters the rows', on: { spot: ['policy'], flow: ['rbac', 'rls'], conn: ['users'] },
          body: 'A row-level policy restricts the regional analyst to their region automatically — no change to their SQL, enforced by the engine.',
          facts: ['Rows filtered by policy', 'Transparent to the query', 'E.g. region = user\'s region'] },
        { label: 'Masking', title: 'Masking transforms columns', on: { spot: ['policy'], flow: ['mask'], dim: ['rbac', 'rls'] },
          body: 'The support agent sees emails and card numbers masked (<code>***-1234</code>), while admins see full values — same column, role-based detail.',
          facts: ['Dynamic data masking', 'CLS can hide whole columns', 'Based on the viewer\'s role'] },
        { label: 'Governed data', title: 'Policies enforced on the data', on: { spot: ['data'], flow: ['tbl'], conn: ['policy'] },
          body: 'All of this is enforced centrally on the table at query time, over encrypted storage — there is no way around it by querying differently.',
          facts: ['Enforced at query time', 'Encrypted at rest & in transit', 'No bypass path'] },
        { label: 'Govern', title: 'Catalog, lineage & audit', on: { spot: ['gov'], flow: ['lineage'], conn: ['data'] },
          body: 'A governance layer tracks what the data is, where it came from, how sensitive it is, and who accessed it — the backbone of compliance.',
          facts: ['Catalog + lineage', 'Classification & labels', 'Audit for compliance'] },
      ],
      map: {
        intro: 'RLS, CLS, and masking are available on all three; the surrounding governance platform is the differentiator.',
        sf: { term: 'RBAC + policies / Horizon', points: ['Role hierarchy; row access & masking policies', 'Tag-based masking via object tagging', 'Horizon: classification, lineage, data quality'] },
        rs: { term: 'IAM/RBAC + Lake Formation', points: ['AWS IAM + database roles', 'Row- & column-level security', 'Lake Formation for fine-grained lake grants; KMS'] },
        fb: { term: 'Roles + Purview', points: ['RLS, CLS, dynamic data masking', 'Workspace roles + OneLake security', 'Microsoft Purview: catalog, lineage, sensitivity labels'] },
      },
      takeaway: 'Lock data down with <b>RBAC + least privilege</b>, then add <b>RLS / CLS / masking</b> so the same query reveals different detail by role. All three provide these; the governance platform differs — Snowflake <b>Horizon</b>, AWS <b>Lake Formation</b>, Microsoft <b>Purview</b>.',
      compare: 'cmp-governance', compareLabel: 'Governance & Security',
      docs: [
        { label: 'Snowflake: Access control', url: 'https://docs.snowflake.com/en/user-guide/security-access-control-overview' },
        { label: 'AWS: Redshift security', url: 'https://docs.aws.amazon.com/redshift/latest/dg/r_Database_objects.html' },
        { label: 'Fabric: Security overview', url: 'https://learn.microsoft.com/en-us/fabric/security/security-overview' },
      ],
    },

    /* ─────────────────── Cost models & tuning ─────────────────── */
    'fund-cost': {
      eyebrow: '🛡️ Operations',
      title: 'Cost models & tuning',
      lead: 'Cloud warehouses are powerful and can get expensive fast, because you\'re usually paying for <strong>compute by the second</strong>. Understanding what you actually pay for — and the handful of levers that cut it — is what separates a sustainable deployment from a runaway bill.',
      sections: [
        { h: 'What you pay for', p:
          '<p>Thanks to decoupling, <strong>compute and storage are billed separately</strong>. Storage is cheap and roughly linear. Compute is the big, variable cost: you pay for engine power × time it runs. The exact unit differs — credits, node-hours, RPU-seconds, capacity units — but the principle is the same: <strong>idle or oversized compute is wasted money</strong>.</p>' },
        { h: 'The main levers', p:
          '<p><strong>Auto-suspend</strong>: turn compute off the moment it\'s idle so you never pay for an engine doing nothing. <strong>Right-size</strong>: a bigger engine costs more per second but may finish faster — measure, don\'t guess. <strong>Read less data</strong>: everything from earlier (columnar, pruning, good distribution, caching) directly lowers cost, because less work = less compute time. <strong>Isolate & schedule</strong>: separate workloads so one can\'t inflate another, and batch non-urgent jobs into off-peak windows.</p>' },
        { h: 'Watch and attribute', p:
          '<p>You can\'t control what you can\'t see. Monitor spend per warehouse/workload/query, set budgets and alerts, and attribute cost back to teams. A single badly-written query scanning a whole fact table repeatedly can dominate a bill — observability is how you catch it.</p>' },
      ],
      diagramTitle: '🎬 Turning a big bill into a small one',
      stage: { caption: 'Same workload, same answers — far less compute time',
        groups: [
          { id: 'waste', label: 'Wasteful setup', sub: 'high cost', nodes: [
            { id: 'idle', label: 'Engine left on, idle' }, { id: 'over', label: 'Oversized for the job' }, { id: 'scan', label: 'Full-table scans' } ], connectorAfter: 'apply the levers' },
          { id: 'levers', label: 'Cost levers', nodes: [
            { id: 'suspend', label: 'Auto-suspend idle' }, { id: 'size', label: 'Right-size' }, { id: 'less', label: 'Read less (prune/cache)' } ], connectorAfter: 'result' },
          { id: 'lean', label: 'Lean setup', sub: 'same results, lower cost', nodes: [ { id: 'cheap', label: 'Minimal compute-seconds' } ], connectorAfter: 'watch it' },
          { id: 'obs', label: 'Observability', nodes: [ { id: 'mon', label: 'Monitor · budget · attribute' } ] },
        ] },
      steps: [
        { label: 'Waste', title: 'Where the money leaks', on: { spot: ['waste'], flow: ['idle', 'over', 'scan'] },
          body: 'Three classic leaks: an engine left running while idle, an engine bigger than the job needs, and queries that scan whole tables unnecessarily. All burn compute-seconds.',
          facts: ['Idle compute still bills', 'Oversizing wastes per-second cost', 'Full scans = more compute time'] },
        { label: 'Suspend', title: 'Auto-suspend when idle', on: { spot: ['levers'], flow: ['suspend'], conn: ['waste'] },
          body: 'Configure compute to turn off the moment it goes idle and resume on the next query. You stop paying for nothing — usually the single biggest saving.',
          facts: ['Pay only while running', 'Resume on demand', 'Biggest easy win'] },
        { label: 'Right-size', title: 'Match engine to the job', on: { spot: ['levers'], flow: ['size'], dim: ['suspend', 'less'] },
          body: 'Bigger costs more per second but can finish sooner; smaller is cheaper if latency allows. Measure the trade-off per workload instead of defaulting large.',
          facts: ['Size per workload', 'Faster-but-pricier can net cheaper', 'Measure, don\'t guess'] },
        { label: 'Read less', title: 'Less data scanned = less cost', on: { spot: ['levers'], flow: ['less'], dim: ['suspend', 'size'] },
          body: 'Columnar, pruning, good distribution, and caching all reduce the bytes a query processes — which directly reduces compute time and therefore cost. Performance tuning <em>is</em> cost tuning.',
          facts: ['Prune + cluster to skip data', 'Reuse results via caching', 'Perf tuning = cost tuning'] },
        { label: 'Observe', title: 'Monitor, budget, attribute', on: { spot: ['obs'], flow: ['mon'], conn: ['lean'] },
          body: 'Track spend per workload and query, alert on budgets, and attribute cost to teams so a runaway query gets caught early.',
          facts: ['Per-workload/query visibility', 'Budgets + alerts', 'Attribute cost to owners'] },
      ],
      map: {
        intro: 'Compute and storage are billed separately everywhere; the compute unit — and how you cap it — differs.',
        sf: { term: 'Per-second credits', points: ['Credits = warehouse size × seconds running', 'Auto-suspend/resume; per-second billing (60s min)', 'Resource monitors cap and alert on spend'] },
        rs: { term: 'Node-hours or RPU-seconds', points: ['Provisioned: RA3 node-hours + managed storage', 'Serverless: RPU-seconds (pay per query runtime)', 'Pause provisioned clusters to stop compute cost'] },
        fb: { term: 'Capacity (CUs)', points: ['Buy a capacity (F-SKU) measured in CUs', 'All workloads share it; bursting + smoothing', 'Pause the capacity to stop compute charges'] },
      },
      takeaway: 'You mostly pay for <b>compute × time</b>, billed separately from cheap storage. The levers are the same everywhere: <b>auto-suspend</b> idle compute, <b>right-size</b> by measurement, and <b>read less data</b> (so all the performance work doubles as cost work) — then <b>monitor</b> spend. Units differ: credits, node-hours/RPU-seconds, or capacity CUs.',
      compare: 'cmp-ecosystem', compareLabel: 'Ecosystem & Cost',
      docs: [
        { label: 'Snowflake: Cost & credits', url: 'https://docs.snowflake.com/en/user-guide/cost-understanding-overall' },
        { label: 'AWS: Redshift pricing model', url: 'https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-billing.html' },
        { label: 'Fabric: Capacity & licenses', url: 'https://learn.microsoft.com/en-us/fabric/enterprise/licenses' },
      ],
    },

  });
})();
