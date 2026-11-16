/* ============================================================
   Cloud DE Visualizer — Azure study enrichment.
   Authored level + pedagogical callouts merged onto the Azure
   service catalogue by _service-detail.js. Purely additive.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});
  TV.StudyEnrich = TV.StudyEnrich || {};

  TV.StudyEnrich.azure = {
    'adls-gen2': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'ADLS Gen2 is Blob Storage with a hierarchical namespace switched on — so you get real directories and POSIX-style ACLs, plus one endpoint that speaks both blob and file (dfs) semantics.' }],
        how: [{ kind: 'gotcha', body: 'The hierarchical namespace is a create-time choice and makes directory rename/delete atomic — the opposite of flat blob. Turning it on later is not a toggle, so it is an architecture decision, not a setting.' }],
      },
    },
    'blob-storage': {
      level: 'foundational',
      callouts: {
        what: [{ kind: 'analogy', body: 'Flat object storage like S3 — "folders" are just name prefixes. It is the cheap, durable substrate ADLS Gen2 is built on top of.' }],
        why: [{ kind: 'tip', body: 'Reach for plain Blob for backups, images, logs and "just put bytes somewhere cheap"; reach for ADLS Gen2 when analytics needs directories and fine-grained ACLs.' }],
      },
    },
    'data-factory': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'ADF is managed orchestration + ELT: pipelines move data from 100+ connectors and transform it with Mapping Data Flows (Spark under the hood) or by pushing compute down to the source.' }],
        how: [{ kind: 'interview', body: 'Know the cost model: Integration Runtime is what actually executes. Pipeline activities bill per run, Data Flows bill per cluster-hour — so "where does the compute happen" is the recurring ADF question.' }],
      },
    },
    'event-hubs': {
      level: 'core',
      callouts: {
        what: [{ kind: 'analogy', body: 'Azure’s Kinesis/Kafka: a big-data ingress that swallows millions of events/sec into partitioned, replayable logs. It even exposes a Kafka-compatible endpoint.' }],
        runtime: [{ kind: 'gotcha', body: 'Throughput and ordering are per partition, and the partition key fixes both. Consumer parallelism tops out at the partition count, so under-partitioning is a ceiling you cannot raise without a new hub.' }],
      },
    },
    'stream-analytics': {
      level: 'core',
      callouts: {
        why: [{ kind: 'insight', body: 'A serverless SQL engine over streams: you write windowed SQL (tumbling/hopping/sliding) against Event Hubs input and land results in seconds, with no cluster to run.' }],
        how: [{ kind: 'interview', body: 'Windowing is the whole topic. Be ready to contrast tumbling (fixed, non-overlapping) vs hopping (overlapping) vs sliding, and to mention watermarks/late-arrival handling.' }],
      },
    },
    'synapse-analytics': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Synapse bundles dedicated SQL pools (MPP warehouse), serverless SQL, and Spark pools under one workspace — one surface for warehousing and lake analytics.' }],
        how: [{ kind: 'gotcha', body: 'In a dedicated SQL pool, table distribution (hash / round-robin / replicate) governs performance. A bad hash key causes skew and data movement — the Synapse analogue of Redshift DISTKEY tuning.' }],
      },
    },
    'synapse-serverless': {
      level: 'advanced',
      callouts: {
        what: [{ kind: 'analogy', body: 'Azure’s Athena: query files on the lake in place with T-SQL (OPENROWSET), no data loaded, billed per byte processed.' }],
        how: [{ kind: 'interview', body: 'Same cost levers as any pay-per-scan engine: partition pruning, Parquet over CSV, and column projection. Mention that it has no storage of its own and reads straight from ADLS.' }],
      },
    },
    'azure-sql': {
      level: 'foundational',
      callouts: {
        why: [{ kind: 'insight', body: 'A managed OLTP database — great as a pipeline source or for serving curated marts, but it is row-store and single-node-ish, so it is not where you run big analytical scans.' }],
      },
    },
    'cosmos-db': {
      level: 'advanced',
      callouts: {
        how: [{ kind: 'gotcha', body: 'The partition key decides everything — even data distribution, hot-partition risk, and whether a query is single-partition (cheap) or cross-partition (RU-expensive). Choosing it well is the hardest Cosmos decision.' }],
        runtime: [{ kind: 'interview', body: 'Know the five consistency levels (strong → bounded staleness → session → consistent prefix → eventual) and that throughput is provisioned/billed in Request Units (RUs).' }],
      },
    },
    purview: {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Purview is the governance plane: an enterprise data map built by scanners that catalogs assets, classifies sensitive data, and tracks lineage across the estate.' }],
      },
    },
    'entra-id': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Entra ID (formerly Azure AD) is the identity backbone; RBAC grants roles at management-plane scope. For data-plane ACLs on the lake you still combine it with ADLS POSIX ACLs — two layers working together.' }],
        how: [{ kind: 'tip', body: 'Prefer managed identities over secrets: a service authenticating as its own identity removes stored credentials entirely — the pattern interviewers like to hear.' }],
      },
    },
    'key-vault': {
      level: 'foundational',
      callouts: {
        why: [{ kind: 'insight', body: 'Centralizes secrets, keys and certificates so pipelines reference a vault instead of embedding credentials. Pair it with managed identities and your jobs hold no secrets at all.' }],
      },
    },
    'azure-monitor': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Azure Monitor + Log Analytics is the observability plane: metrics, logs and alerts across services, queried with KQL — the place you watch pipeline health and set up alerting.' }],
      },
    },
    'azure-pipelines': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Azure Pipelines is CI/CD as code: a YAML file of stages → jobs → steps, versioned next to your app, run on agents, and gated by environments. For DE it is how ADF and Databricks changes promote safely to prod.' }],
        how: [{ kind: 'gotcha', body: 'The YAML pr: trigger works for GitHub/Bitbucket but is IGNORED for Azure Repos Git — there you configure PR validation through a branch policy’s Build Validation. This is the single most common Azure Pipelines interview gotcha.' }],
        security: [{ kind: 'interview', body: 'Secrets: secret variables are masked and NOT auto-injected — map them with env:. For Azure auth prefer a service connection using workload identity federation (OIDC, no stored secret) over a service-principal secret.' }],
        runtime: [{ kind: 'tip', body: 'Microsoft-hosted agents = clean VM per job, zero maintenance, capped minutes; self-hosted = persistent, private-network reach, warm caches, custom tooling. Cost is per parallel job, not per pipeline.' }],
      },
    },
    'azure-devops': {
      level: 'foundational',
      callouts: {
        what: [{ kind: 'insight', body: 'Azure DevOps is five services under one roof — Boards, Repos, Pipelines, Artifacts, Test Plans — sharing one org/project structure and one Entra-backed security model. Adopt any subset; they cross-link for traceability.' }],
        security: [{ kind: 'interview', body: 'Permissions inherit org → project → object and Deny wins. Grant via Entra-mapped groups (least privilege), and prefer Entra OAuth/managed identity over long-lived PATs for automation.' }],
      },
    },
    'azure-repos': {
      level: 'core',
      callouts: {
        what: [{ kind: 'analogy', body: 'Private GitHub-style Git hosting, but the value is branch policies: the enforced rules (reviewers, build validation, linked work items) that keep main releasable.' }],
        how: [{ kind: 'gotcha', body: 'PR-triggered CI on Azure Repos Git comes from a Build Validation branch policy — NOT a YAML pr: trigger (that only fires for GitHub/Bitbucket). Same gotcha as Azure Pipelines, from the repo side.' }],
      },
    },
    'azure-artifacts': {
      level: 'foundational',
      callouts: {
        what: [{ kind: 'insight', body: 'Package feeds for npm/NuGet/Maven/PyPI/Universal, with upstream sources that proxy + cache public registries (reproducible builds) and views (@local/@prerelease/@release) for promotion.' }],
        runtime: [{ kind: 'gotcha', body: 'Published versions are immutable — you cannot overwrite x.y.z, so CI must bump the version. Watch dependency confusion: namespace internal packages so a public name cannot shadow them.' }],
      },
    },
    'azure-boards-test': {
      level: 'foundational',
      callouts: {
        what: [{ kind: 'insight', body: 'Boards = Agile work tracking (work items, backlogs, sprints, WIQL queries) on a process (Basic/Agile/Scrum/CMMI); Test Plans = manual/exploratory test management. Together they bracket the lifecycle with traceability.' }],
        how: [{ kind: 'tip', body: 'Area paths = whose work it is; iteration paths = which sprint. Link work items to commits/PRs (#id) and builds to get the requirement → code → verification trail interviewers love.' }],
      },
    },
    'github-actions': {
      level: 'core',
      callouts: {
        what: [{ kind: 'analogy', body: 'GitHub’s event-driven CI/CD: YAML workflows in .github/workflows built from reusable Marketplace actions. The workflow file IS the pipeline — no separate pipeline object.' }],
        security: [{ kind: 'interview', body: 'Deploy to Azure with OIDC (azure/login + permissions: id-token: write) — short-lived token, no stored secret, the GitHub twin of Pipelines’ workload identity federation. Pin third-party actions to a commit SHA.' }],
        architecture: [{ kind: 'tip', body: 'Classic comparison answer: Actions = event-driven + Marketplace, GitHub-coupled; Azure Pipelines = integrated enterprise suite with tasks/templates + mature release governance; Jenkins = self-managed, plugin-heavy. Microsoft owns both of the first two and they converge.' }],
      },
    },
    'azure-service-bus': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'Enterprise message broker for discrete commands/transactions: queues (point-to-point) + topics/subscriptions (pub/sub), with sessions (FIFO), dead-letter, duplicate detection and PeekLock reliability.' }],
        architecture: [{ kind: 'interview', body: 'The must-know contrast: Service Bus = discrete messages, per-message ack, dead-letter/dedup/sessions (commands/transactions). Event Hubs = high-throughput replayable stream (telemetry). Kafka = open-source distributed log. Commands → Service Bus; event streams → Event Hubs/Kafka.' }],
        how: [{ kind: 'gotcha', body: 'Delivery is at-least-once, not exactly-once. PeekLock + Complete gives reliability; if the lock expires or Complete is missed, the message is redelivered — so make consumers idempotent and use duplicate detection.' }],
      },
    },
    'azure-containers': {
      level: 'core',
      callouts: {
        what: [{ kind: 'insight', body: 'The Azure container pattern: build a Docker image → store in Azure Container Registry (ACR) → run on AKS (managed Kubernetes), ACI (serverless single container) or Container Apps (serverless, scale-to-zero). For DE: reproducible ETL runtimes + self-hosted pipeline agents.' }],
        architecture: [{ kind: 'interview', body: 'AKS vs ACI vs Container Apps: AKS = full Kubernetes control for complex/large workloads (run a cluster); ACI = simplest serverless single container, fast start; Container Apps = serverless microservices/jobs with KEDA scale-to-zero. Match the target to the workload.' }],
        security: [{ kind: 'gotcha', body: 'Never bake secrets into an image — they persist in layers. Inject at runtime via Key Vault (CSI driver) and authenticate to ACR with a managed identity (AcrPull), not the admin account.' }],
      },
    },
  };
})();
