export default {
  id: "multi-tenant-analytics",
  title: "Design a multi-tenant analytics platform",
  icon: "🏘️",
  chapter: 33,
  group: "End-to-end platforms",
  summary: "Serve analytics to many customers (tenants) from one platform without their data or compute leaking into each other. The central tensions are isolation (a tenant must never see another's data) versus efficiency (sharing infrastructure to keep costs down), plus the noisy-neighbor problem where one heavy tenant degrades everyone else.",
  widget: "de-multitenant",
  widgetIntro: "Multi-tenancy is a spectrum between **isolation** and **sharing**. Full isolation (a separate database/pipeline per tenant) is the safest but most expensive; full sharing (one table with a `tenant_id` column) is cheapest but risks leaks and noisy neighbors. Most platforms pick a middle ground — a shared table with enforced **row-level security** on `tenant_id`, or a schema/partition per tenant — plus **resource isolation** so one tenant's heavy query can't starve the rest.\n\nWatch tenants' data flow into a shared platform where every query is scoped to its tenant, and a resource quota keeps a noisy neighbor from degrading others.",
  sections: [
    {
      title: "Requirements",
      body: "One platform, many customers, with hard guarantees that they stay separate — in data and in performance — while keeping per-tenant cost low enough to be a viable business.",
      bullets: [
        "**Data isolation:** a tenant can never read another tenant's data.",
        "**Performance isolation:** one tenant's load can't degrade others (noisy neighbor).",
        "**Cost efficiency:** share infrastructure; don't run N full stacks.",
        "**Per-tenant needs:** custom schemas, SLAs, data residency for some.",
      ],
    },
    {
      title: "The isolation spectrum",
      body: "Tenancy models trade isolation against efficiency. Pick per the trust and compliance needs of your tenants.",
      table: {
        head: ["Model", "Isolation", "Efficiency"],
        rows: [
          ["Database/pipeline per tenant", "Strongest (physical)", "Lowest (N stacks)"],
          ["Schema / partition per tenant", "Strong (logical)", "Medium"],
          ["Shared table + tenant_id + RLS", "Policy-enforced", "Highest (one table)"],
        ],
      },
      body2: "Many platforms blend them: pooled (shared) for small tenants, siloed (dedicated) for large or regulated ones — a 'pool + silo' hybrid.",
    },
    {
      title: "Enforcing data isolation",
      body: "In a shared model, every row carries a `tenant_id` and **row-level security** automatically filters every query to the current tenant — isolation enforced by the platform, not by each query remembering a `WHERE tenant_id = ?`. That's the critical point: isolation must be enforced centrally and by default, because a single forgotten filter is a cross-tenant data leak.",
      flow: ["query (tenant A)", "RLS injects tenant_id = A", "scan only A's rows", "return A's data"],
      rules: ["Enforce tenant isolation centrally (RLS/policy), never by trusting each query to filter itself."],
    },
    {
      title: "The noisy-neighbor problem",
      body: "Shared compute means one tenant running a huge query can consume the cluster and slow everyone else. Mitigate with resource isolation: per-tenant quotas/limits, separate compute pools or warehouses for heavy tenants, queue fairness, and rate limiting. The goal is that a tenant's experience depends only on their own load, not their neighbors'.",
      bullets: [
        "Per-tenant resource quotas and query limits.",
        "Dedicated compute pools for heavy/premium tenants.",
        "Fair scheduling / queuing so no tenant monopolizes resources.",
      ],
    },
    {
      title: "Operational concerns",
      body: "Multi-tenancy also complicates the boring parts: per-tenant usage metering and cost attribution (who to bill), per-tenant data deletion (offboarding, GDPR) which is far easier with isolation, schema evolution across tenants, and noisy-neighbor-aware monitoring. Governance (lineage, access, residency) must be tenant-aware throughout.",
      rules: ["Metering, deletion, and monitoring must all be tenant-aware — multi-tenancy touches every operational surface."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Multi-tenancy is the isolation-vs-efficiency trade-off applied to data and compute, with leaks and noisy neighbors as the failure modes.",
  deepDive: [
    {
      title: "Isolation vs efficiency is the core dial",
      body: "Everything flows from where you sit on the pooled↔siloed spectrum. Pooled (shared table + RLS) maximizes efficiency and minimizes per-tenant cost but concentrates the risk of leaks and noisy neighbors, so isolation must be enforced rigorously. Siloed (dedicated resources) minimizes risk but multiplies cost and operational overhead. The pool-plus-silo hybrid — pool the many small tenants, silo the few large/regulated ones — is the common pragmatic answer.",
      stats: [
        { value: "tenant_id + RLS", label: "enforced isolation in a shared table", tone: "green" },
        { value: "pooled", label: "efficient, risk concentrated", tone: "blue" },
        { value: "siloed", label: "isolated, costly", tone: "amber" },
        { value: "quotas", label: "tame the noisy neighbor", tone: "accent" },
      ],
    },
    {
      title: "A leak is catastrophic",
      body: "In multi-tenancy, a single cross-tenant data leak can end the business, so isolation gets defense in depth: enforce it at the data layer (RLS/policy, not ad-hoc WHERE clauses), verify with tests that queries can't escape their tenant, and in high-trust cases fall back to physical isolation. The asymmetry — efficiency saves money, a leak is existential — is why mature platforms err toward stronger isolation for anything sensitive.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Place tenants on the pooled↔siloed spectrum by trust and scale — shared table with enforced row-level security for the many small ones, dedicated resources for large/regulated ones. Enforce isolation centrally (never trust per-query filters), add per-tenant quotas to stop noisy neighbors, and make metering, deletion, and monitoring tenant-aware. Efficiency saves money; a leak is existential, so err toward isolation.\"" },
    },
  ],
  qa: [
    {
      q: "What are the models for multi-tenant data isolation, and how do you choose?",
      a: "They sit on an isolation-vs-efficiency spectrum: a database/pipeline per tenant (strongest, physical isolation but you run N full stacks — costly), a schema or partition per tenant (strong logical isolation, medium efficiency), or a shared table with a tenant_id column and row-level security (highest efficiency, isolation enforced by policy). Choose per tenant trust, compliance, and scale — and most platforms blend them: pool many small tenants in a shared model for efficiency, silo large or regulated tenants in dedicated resources. The 'pool plus silo' hybrid balances cost against isolation.",
      tip: "Per-tenant DB → schema/partition → shared+tenant_id+RLS, trading isolation for efficiency; pool-plus-silo is the common hybrid.",
    },
    {
      q: "How do you guarantee one tenant never sees another's data?",
      a: "Enforce isolation centrally and by default, not by trusting each query. In a shared model, every row carries a tenant_id and row-level security automatically injects the tenant filter into every query, so a developer can't forget a WHERE clause and leak data. Back it with tests that verify queries can't escape their tenant, least-privilege access, and — for high-trust or regulated tenants — stronger physical isolation (dedicated schema/database). The key principle is that a single forgotten filter is a catastrophic cross-tenant leak, so isolation must be enforced at the platform/data layer, defense in depth, rather than left to application code.",
      tip: "Central RLS/policy enforcement by default (not ad-hoc WHERE clauses), tested, with physical isolation for high-trust tenants.",
    },
    {
      q: "What is the noisy-neighbor problem and how do you solve it?",
      a: "When tenants share compute, one tenant running a heavy query can monopolize the cluster and degrade everyone else's performance — a tenant's experience depends on their neighbors' load, which is unacceptable. You solve it with performance isolation: per-tenant resource quotas and query limits, dedicated compute pools or warehouses for heavy/premium tenants, and fair scheduling/queuing so no tenant starves the others. The goal is that each tenant's performance depends only on their own usage. It's the compute-side analog of data isolation, and just as important to a credible multi-tenant SLA.",
      tip: "Noisy neighbor = shared compute contention; fix with per-tenant quotas, dedicated pools for heavy tenants, fair scheduling.",
    },
  ],
  related: [],
};
