/* ============================================================
   Conceptual visualizer: RBAC vs ABAC access evaluation.

   Models how a request is authorized under role-based access
   control (roles → permissions) versus attribute-based access
   control (policies evaluated over subject/resource/context
   attributes), and why the two are usually combined. Conceptual
   only — not connected to any real IAM system. Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  TV.Viz.register({
    id: 'access-rbac-abac',
    title: 'Access control: RBAC vs ABAC',
    subtitle: 'How an authorization decision is reached under role-based access control versus attribute-based access control — and why mature platforms layer the two rather than choosing one.',
    vendor: 'multi',
    tags: ['rbac', 'abac', 'authorization', 'iam', 'roles', 'policy', 'attributes', 'least privilege', 'access control', 'security', 'governance'],
    steps: [
      {
        title: 'Every access is a decision',
        caption: 'A subject (user, service, token) asks to perform an action on a resource. Before the data is touched, an authorization layer must return allow or deny. How that decision is computed is the whole difference between RBAC and ABAC.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">subject<small>analyst@corp</small></div>
            <span class="viz-arrow">→ read →</span>
            <div class="viz-box">resource<small>sales.orders</small></div></div>
          <span class="viz-tag">decision needed: allow / deny</span></div>`,
      },
      {
        title: 'RBAC: permissions bundled into roles',
        caption: 'Role-based access control groups permissions into roles and assigns roles to subjects. You reason about a small number of roles, not thousands of individual grants. The check is simple: does the subject hold a role that includes this permission?',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">analyst</div><span class="viz-arrow">→</span>
            <div class="viz-box is-done">role: Reader</div><span class="viz-arrow">→</span>
            <div class="viz-box is-done">read on sales.*</div></div>
          <span class="viz-tag viz-tag--narrow">holds role → permission granted</span></div>`,
      },
      {
        title: 'RBAC hits the combinatorial wall',
        caption: 'When access must depend on more than identity — region, data classification, time of day, ownership — RBAC answers by minting ever more roles (Reader-EU, Reader-EU-PII, Reader-EU-PII-BusinessHours). This "role explosion" is the classic reason teams reach for attributes.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">Reader-EU</div><div class="viz-box is-hot">Reader-EU-PII</div>
            <div class="viz-box is-hot">Reader-US-Finance</div><div class="viz-box is-hot">…hundreds more</div></div>
          <span class="viz-tag viz-tag--shuffle">role explosion</span></div>`,
      },
      {
        title: 'ABAC: evaluate a policy over attributes',
        caption: 'Attribute-based access control writes the rule once as a policy over attributes of the subject, resource, action, and context. No new role per combination — the same policy covers every case because it reads the attributes at request time.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">subject<small>dept=Sales, region=EU</small></div>
            <div class="viz-box">resource<small>region=EU, class=internal</small></div>
            <div class="viz-box">context<small>time=14:00</small></div></div>
          <span class="viz-tag">policy: allow if subject.region == resource.region AND class != restricted</span></div>`,
      },
      {
        title: 'The policy decision point',
        caption: 'At request time a policy decision point gathers the attributes and evaluates every applicable rule. Here subject.region (EU) equals resource.region (EU) and the class is internal, not restricted — so the policy allows. Change one attribute and the same policy denies, with no role change.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">region match ✓</div>
            <div class="viz-box is-done">class internal ✓</div>
            <span class="viz-arrow">→</span>
            <div class="viz-box is-done">ALLOW</div></div>
          <span class="viz-tag viz-tag--narrow">one policy, every combination</span></div>`,
      },
      {
        title: 'In practice: RBAC + ABAC together',
        caption: 'Real platforms layer them: coarse RBAC roles decide broad capability, then ABAC policies (row/column filters, tag-based conditions, purpose limits) narrow it. RBAC answers "what can this role do"; ABAC answers "but only for which rows, right now." Least privilege comes from using both deliberately.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">RBAC: role Reader<small>broad capability</small></div>
            <span class="viz-arrow">then</span>
            <div class="viz-box is-active">ABAC: region + tag filter<small>narrows to allowed rows</small></div></div>
          <span class="viz-tag viz-tag--narrow">defense in depth → least privilege</span></div>`,
      },
    ],
  });
})();
