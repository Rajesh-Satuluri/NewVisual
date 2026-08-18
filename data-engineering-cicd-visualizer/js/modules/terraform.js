/* modules/terraform.js — Tier 2 · Terraform (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "terraform",
    title: "Terraform",
    tool: "--tool-terraform",
    icon: "🏗️",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "Infrastructure as Code — RetailFlow's storage accounts, Databricks clusters, and networks defined in files, reviewed in a PR, and applied the same way every time.",
    mentalImage: "INFRASTRUCTURE BLUEPRINT",

    flowTitle: "A change moving through Terraform",
    flow: ["Human clicks (drift)", "Terraform config", "desired state", "terraform plan", "review in PR", "terraform apply", "reconciled"],

    why: "When people create cloud resources by clicking in the portal, nobody knows what exists, why, or how to rebuild it. RetailFlow's storage and clusters drift silently until something breaks and there's no record of the \"right\" setup.",
    what: "Terraform is an <b>infrastructure-as-code</b> tool: you declare the resources you want in HCL, and Terraform makes the cloud match — creating, updating, or destroying to reach that desired state.",
    how: "You write config, Terraform compares it to <b>state</b> (what it last built) and reality, then <code>plan</code> shows the diff and <code>apply</code> executes it. The config is the single source of truth, reviewed like any other code.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Terraform is a <b>blueprint for your cloud</b>. Instead of clicking buttons in the Azure portal, you write down what you want — \"a storage account named <code>retailflowdata</code>\" — and Terraform builds exactly that." },
        { h: "plan then apply", body: "<code>terraform plan</code> is a <b>preview</b>: it shows what will be added, changed, or destroyed — no surprises. <code>terraform apply</code> actually makes the changes. You always look before you leap." },
        { h: "Declarative, not step-by-step", body: "You describe the <b>end state</b>, not the clicks. If the storage account already exists and matches, Terraform does nothing. If it drifted, Terraform fixes it back to the blueprint." }
      ],
      intermediate: [
        { h: "Providers, resources, variables, outputs", body: "A <b>provider</b> (<code>azurerm</code>) knows how to talk to a cloud. A <b>resource</b> is one thing (a storage account). <b>Variables</b> parameterize it (region, name); <b>outputs</b> expose values (the account's connection string) for other configs to use." },
        { h: "State & backends", body: "Terraform records what it built in a <b>state file</b>. Store it in a <b>remote backend</b> (an Azure blob container), not on a laptop, so the whole team shares one truth. <b>State locking</b> stops two applies from corrupting it at once." },
        { h: "Modules & drift", body: "A <b>module</b> is reusable config — one \"data-lake\" module used across dev/test/prod. <b>Drift</b> is when someone changes a resource by hand; <code>terraform plan</code> detects it and proposes putting it back." }
      ],
      proficient: [
        { h: "Workspaces & remote state", body: "<b>Workspaces</b> or separate state files isolate dev/test/prod so a prod apply can't touch dev. <b>Remote state</b> data sources let one config read another's outputs (the networking config exposes the subnet the Databricks config consumes)." },
        { h: "Plan-in-PR governance", body: "RetailFlow runs <code>terraform plan</code> in CI and posts the diff on the PR. A reviewer reads exactly what infra will change before anyone approves; <code>apply</code> only runs after merge, often behind a manual approval gate." },
        { h: "Trade-offs & safety", body: "Terraform is powerful and dangerous — a careless config change can show <code>destroy</code> on a production database. Guardrails: <code>prevent_destroy</code> lifecycle rules, plan review, least-privilege service principals, and never editing state by hand." }
      ]
    },

    micro: ["provider", "resource", "variable", "output", "module", "state", "backend", "plan", "apply",
      "destroy", "drift", "remote state", "state locking", "workspaces", "data source", "lifecycle", "HCL"],

    before: ["clicked in the portal", "nobody knows what exists", "can't rebuild it", "silent drift", "snowflake servers"],
    after: ["infra in version control", "plan previews every change", "reviewed in a PR", "drift detected", "reproducible rebuild"],

    failure: {
      title: "A Databricks cluster resize, reviewed before it lands",
      steps: ["edit cluster config in HCL", "open PR", "terraform plan runs", "\"2 to change\" shown", "human reviews the diff", "apply after approval"],
      explain: "Someone bumps the revenue job's Databricks cluster from 4 to 8 workers. <code>terraform plan</code> prints <b>Plan: 0 to add, 2 to change, 0 to destroy</b> right on the PR. A reviewer confirms it's a resize, not an accidental teardown, <b>before</b> apply touches production — the plan is the safety check."
    },

    whenNot: "Terraform manages long-lived infrastructure, not application data or fast-changing runtime state. Don't use it to insert rows, run pipelines, or manage per-request resources — and never store secrets in plaintext <code>.tf</code> files; pass them from a vault or environment.",

    story: {
      situation: "RetailFlow's revenue pipeline needs a dedicated storage account, <code>retailflowdata</code>, for its curated Parquet output.",
      problem: "Creating it by hand in the portal means it's undocumented, unrepeatable, and invisible to review.",
      decision: "The engineer defines the storage account in Terraform and opens a PR; CI runs <code>terraform plan</code> and posts the diff.",
      tool: "Terraform with a remote Azure backend and plan-in-PR.",
      result: "The team reviews exactly what infra changes, approves, and <code>apply</code> builds it identically in dev and prod — the config is the record.",
      remember: "If it isn't in the Terraform config, it doesn't officially exist — and <code>plan</code> tells you the truth before <code>apply</code> makes it real."
    },

    code: [{
      title: "main.tf — the curated-data storage account",
      lang: "hcl",
      code: "terraform {\n" +
            "  backend \"azurerm\" {\n" +
            "    resource_group_name  = \"retailflow-tfstate\"\n" +
            "    storage_account_name = \"retailflowtfstate\"\n" +
            "    container_name       = \"state\"\n" +
            "    key                  = \"data-lake.tfstate\"\n" +
            "  }\n" +
            "}\n" +
            "\n" +
            "provider \"azurerm\" {\n" +
            "  features {}\n" +
            "}\n" +
            "\n" +
            "resource \"azurerm_storage_account\" \"data\" {\n" +
            "  name                     = \"retailflowdata\"\n" +
            "  resource_group_name      = var.resource_group\n" +
            "  location                 = var.location\n" +
            "  account_tier             = \"Standard\"\n" +
            "  account_replication_type = \"ZRS\"\n" +
            "  is_hns_enabled           = true # Data Lake Gen2\n" +
            "}\n" +
            "\n" +
            "output \"data_lake_endpoint\" {\n" +
            "  value = azurerm_storage_account.data.primary_dfs_endpoint\n" +
            "}",
      highlights: [14, 15, 20]
    }],

    remember: "Declare the infrastructure you want; <code>plan</code> previews the diff, <code>apply</code> reconciles reality to the blueprint — the config, not the portal, is the source of truth.",

    retention: {
      question: "A RetailFlow engineer changes the revenue job's Databricks cluster in Terraform. How does the team confirm the change is safe before it hits production?",
      answer: "CI runs <code>terraform plan</code> and posts the diff on the PR — e.g. <b>Plan: 0 to add, 2 to change, 0 to destroy</b>. A reviewer reads exactly what will change before approving; <code>terraform apply</code> only runs after merge (often behind a manual approval)."
    }
  }));
})();
