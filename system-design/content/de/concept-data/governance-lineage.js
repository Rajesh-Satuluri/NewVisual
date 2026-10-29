export default {
  id: "governance-lineage",
  title: "Data governance & lineage",
  icon: "🧬",
  chapter: 26,
  group: "Operations",
  summary: "As a platform grows, the hard problems become social: can people find trustworthy data, who owns it, and what breaks if it changes? Governance answers those with a catalog (discovery + ownership + definitions), lineage (how data flows source-to-report), and access/quality policy — turning a sprawl of tables into a navigable, accountable system.",
  widget: "de-lineage",
  widgetIntro: "**Lineage** is the map of how data flows: which sources feed which tables, which tables feed which reports — ideally down to the column. It answers the two questions that dominate a mature platform: **impact** ('if I change this source, what downstream breaks?') and **root cause** ('this dashboard is wrong — which upstream table caused it?').\n\nTrace a node and watch its lineage light up — everything upstream that feeds it and everything downstream that depends on it. That graph is what makes change and incident response tractable at scale.",
  sections: [
    {
      title: "Why governance becomes the bottleneck",
      body: "With ten tables, everyone knows what's what. With ten thousand, nobody does: analysts can't find the right table or tell if it's trustworthy, nobody knows who owns a dataset, and a schema change breaks reports nobody knew existed. Governance is the set of tools and practices that keep a large platform discoverable, accountable, and safe to change.",
      rules: ["Governance scales people's understanding of the data — the real bottleneck past a certain size."],
    },
    {
      title: "The data catalog",
      body: "A catalog is the searchable inventory of data assets: what tables/columns exist, their schemas, descriptions, owners, freshness, and usage. It's how people discover trustworthy data instead of DMing a colleague or copying a random table. Good catalogs surface ownership and documentation so a dataset is self-explaining.",
      bullets: [
        "**Discovery:** search tables/columns by name, description, tag.",
        "**Ownership:** who is responsible for each dataset.",
        "**Context:** definitions, freshness, popularity, quality status.",
      ],
    },
    {
      title: "Lineage: impact and root cause",
      body: "Lineage records the directed graph of data flow — table-level and, ideally, column-level. Downstream (descendants) lineage answers impact analysis: change or deprecate a source and see every report that depends on it, so you don't break things silently. Upstream (ancestors) lineage answers root-cause: a wrong metric is traced back through the transforms to the table that introduced the error.",
      flow: ["sources", "→ staging", "→ marts", "→ dashboards / models"],
      rules: ["Downstream lineage = impact of a change; upstream lineage = root cause of a bug."],
    },
    {
      title: "Policy: access, classification, compliance",
      body: "Governance also enforces rules: classify sensitive data (PII), control who can access what (tying into IAM/RBAC), and support compliance (retention, GDPR deletes, audit). Column-level classification plus lineage lets you answer 'where does this PII flow and who can see it' — a question regulators and security teams actually ask.",
      bullets: [
        "Classify PII/sensitive columns; mask or restrict them.",
        "Tie access to roles (RBAC) and audit who read what.",
        "Use lineage + classification for compliance (retention, deletion, audit).",
      ],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Catalog + lineage are infrastructure for trust and change — they make a big platform behave like a knowable one.",
  deepDive: [
    {
      title: "How lineage is captured",
      body: "Lineage is derived, not hand-maintained: parse SQL/transform code to extract table and column dependencies, integrate with the orchestrator and warehouse query logs, and build the graph automatically. Column-level lineage (this output column comes from these input columns through this expression) is the valuable, harder form — it makes impact and root-cause precise instead of table-coarse.",
      stats: [
        { value: "catalog", label: "discover + own + document", tone: "green" },
        { value: "downstream", label: "impact of a change", tone: "blue" },
        { value: "upstream", label: "root cause of a bug", tone: "accent" },
        { value: "column-level", label: "precise lineage, auto-derived", tone: "amber" },
      ],
    },
    {
      title: "Governance that enables, not blocks",
      body: "Heavy top-down governance that gatekeeps every change drives people to shadow data. The effective model is enablement: make the right thing easy — searchable catalog, automatic lineage, clear ownership, self-serve access with policy — so teams move fast and safely. Governance succeeds when it increases trust and velocity, not when it adds approval queues.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"At scale the bottleneck is people understanding the data. A catalog for discovery and ownership, automatic column-level lineage for impact and root-cause analysis, and classification tied to RBAC for access/compliance — enablement that makes trustworthy data easy to find and safe to change.\"" },
    },
  ],
  qa: [
    {
      q: "What is data lineage and why does it matter?",
      a: "Lineage is the directed graph of how data flows — which sources feed which tables and which tables feed which reports, ideally at column level. It matters for the two questions that dominate a mature platform: impact analysis (follow downstream lineage to see every report that depends on a table before you change or deprecate it, so you don't break things silently) and root-cause analysis (follow upstream lineage from a wrong metric back through the transforms to the table that introduced the error). It turns 'something's wrong somewhere' into a scoped, traceable problem.",
      tip: "Downstream = impact of change, upstream = root cause; mention column-level as the precise form.",
    },
    {
      q: "What does a data catalog provide?",
      a: "A catalog is the searchable inventory of data assets — tables, columns, schemas, descriptions, owners, freshness, and usage. It solves discovery (find the right, trustworthy table instead of asking around or copying a random one), ownership (know who's responsible for a dataset), and context (definitions, quality status, popularity). It's the entry point that makes a large platform navigable, so analysts build on trustworthy data rather than reinventing or misusing tables.",
      tip: "Discovery + ownership + context; it's how people find and trust data at scale.",
    },
    {
      q: "How do you govern a large platform without slowing everyone down?",
      a: "Favor enablement over gatekeeping. Heavy approval-queue governance pushes people to shadow data, so instead make the right thing easy: an automatically-maintained catalog and column-level lineage (derived by parsing transform code and query logs, not hand-curated), clear ownership, and self-serve access with policy and classification tied to RBAC. Governance should increase trust and velocity — discoverable, well-understood, safe-to-change data — not add friction. You measure success by whether teams move faster and more safely, not by how many controls exist.",
      tip: "Enablement, not gatekeeping: automatic catalog+lineage, clear ownership, self-serve-with-policy. Gatekeeping breeds shadow data.",
    },
  ],
  related: [],
};
