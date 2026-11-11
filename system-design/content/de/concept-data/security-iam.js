export default {
  id: "security-iam",
  title: "Security (IAM, RBAC, encryption)",
  icon: "🔐",
  chapter: 27,
  group: "Operations",
  summary: "Data platforms hold the most sensitive data a company has, so access is governed by least privilege: identities get roles, roles grant the minimum permissions, and fine-grained policies restrict rows and columns. Encryption protects data in transit and at rest, and every access is audited. The model is defense in depth — layered gates, not one wall.",
  widget: "de-iam",
  widgetIntro: "Access control is a series of **gates** a request passes through: first **authenticate** (who are you?), then **authorize** via the identity's **role** (is this role allowed this action?), then **fine-grained policy** — row-level security (which rows?) and column masking (which columns, masked or clear?). A request only reaches data if it clears every gate for its role.\n\nSwitch the requester's role and watch the same query clear or get denied at different gates — least privilege enforced layer by layer.",
  sections: [
    {
      title: "Least privilege via RBAC",
      body: "Don't grant permissions to people — grant them to **roles**, and assign identities to roles. A role bundles the minimum permissions its function needs (an analyst reads curated marts; an engineer writes pipelines; an admin manages access). Least privilege means each role can do exactly its job and no more, so a compromised or mistaken identity has a bounded blast radius.",
      bullets: [
        "**Identity → role → permissions:** manage access at the role level, not per person.",
        "**Least privilege:** grant the minimum each role needs.",
        "**Service accounts:** pipelines run as scoped identities too, not as a human.",
      ],
      rules: ["Grant to roles, not people; give each role the minimum it needs."],
    },
    {
      title: "Fine-grained access: rows and columns",
      body: "Table-level grants are often too coarse. **Row-level security** filters which rows a role sees (a regional analyst sees only their region). **Column-level security / masking** hides or masks sensitive columns (an analyst sees an email as `***@***`, not the raw value). Together they let many roles share one table safely, each seeing only what they're permitted.",
      flow: ["authenticate", "authorize (role)", "row-level filter", "column mask"],
    },
    {
      title: "Encryption and secrets",
      body: "Protect the data itself, not just access to it. Encrypt **in transit** (TLS everywhere) and **at rest** (storage-level encryption, managed keys), so intercepted or exfiltrated data is useless. Keep credentials in a **secrets manager**, never in code or configs, and rotate keys. These are table stakes — assume the perimeter will be breached and make the data worthless without keys.",
      bullets: [
        "**In transit:** TLS for every connection.",
        "**At rest:** encrypt storage; manage/rotate keys (KMS).",
        "**Secrets:** a vault/secrets manager, never hard-coded credentials.",
      ],
    },
    {
      title: "Defense in depth + audit",
      body: "No single control is trusted alone — layer them (network boundaries, IAM, row/column policy, encryption) so a failure of one doesn't expose data. And **audit everything**: log who accessed what, when, for compliance and incident forensics. Classification (tagging PII) ties into all of it, so policies and audits can target sensitive data specifically.",
      rules: ["Layer controls (defense in depth) and audit every access — one gate is never enough."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Platform security is least privilege, fine-grained policy, encryption, and audit — composed so no single failure is catastrophic.",
  deepDive: [
    {
      title: "Why roles and least privilege win",
      body: "Per-person grants are unmanageable and drift into over-permissioning. Roles make access reviewable ('what can the analyst role do?') and least privilege bounds the damage of any compromise. The same applies to pipelines: each runs as a scoped service account with only the buckets/tables it needs, so a leaked pipeline credential can't read the whole lake.",
      stats: [
        { value: "role-based", label: "grant to roles, assign identities", tone: "green" },
        { value: "least privilege", label: "minimum permissions each role", tone: "blue" },
        { value: "row + column", label: "fine-grained policy", tone: "accent" },
        { value: "encrypt + audit", label: "at rest/in transit, log all access", tone: "amber" },
      ],
    },
    {
      title: "Governance ties it together",
      body: "Security and governance interlock: data classification (which columns are PII) drives which column masks and row policies apply, lineage shows where sensitive data flows and who can see it, and audit logs prove compliance. A mature platform treats 'who can access this sensitive field, and everywhere it flows' as a question it can answer precisely — because classification, IAM, and lineage are joined up.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Least privilege via RBAC (identities → roles → minimum permissions, pipelines as scoped service accounts), fine-grained row-level and column-masking policy so roles share tables safely, encryption in transit and at rest with managed secrets, and audit on every access — layered so no single control failure exposes data.\"" },
    },
  ],
  qa: [
    {
      q: "How do you design access control for a data platform?",
      a: "With role-based access control and least privilege: grant permissions to roles (analyst, engineer, admin), assign identities — including pipeline service accounts — to roles, and give each role the minimum it needs. Add fine-grained policy on top: row-level security to filter which rows a role sees and column-level masking to hide sensitive fields, so many roles can share one table safely. Layer it with network boundaries and encryption (defense in depth), and audit every access. The principle is that a compromised identity should have a bounded blast radius.",
      tip: "RBAC + least privilege + row/column policy + encryption + audit, layered; grant to roles not people.",
    },
    {
      q: "What's the difference between row-level and column-level security?",
      a: "Row-level security filters which rows a role can see — e.g. a regional analyst only sees rows for their region — so the same table serves many roles with each seeing a different subset. Column-level security (masking) controls which columns, and whether their values are visible or masked — e.g. an analyst sees an email as ***@*** while a privileged role sees the raw value. Row-level is 'which records'; column-level is 'which fields, clear or masked'. Together they enable fine-grained sharing of one table instead of maintaining many filtered copies.",
      tip: "Row = which records; column = which fields (and masked vs clear). Both let one table safely serve many roles.",
    },
    {
      q: "What does defense in depth mean for a data platform?",
      a: "It means not trusting any single control — layering several so one failure doesn't expose data. Concretely: network boundaries limit reachability, IAM/RBAC enforces least-privilege access, row-level and column-masking policies restrict within tables, encryption in transit and at rest makes intercepted or exfiltrated data useless without keys, secrets live in a manager (never in code), and every access is audited. Classification of sensitive data targets these controls where they matter. Assume the perimeter can be breached and ensure the data is still protected behind multiple gates.",
      tip: "Layered controls (network + IAM + row/column + encryption + secrets + audit) so no single failure is catastrophic.",
    },
  ],
  related: [],
};
