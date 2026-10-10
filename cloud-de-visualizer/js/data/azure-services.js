/* ============================================================
   Cloud DE Visualizer — Azure service catalogue (Block B).
   13 interview-critical Azure data services, each with six
   depth levels (What / Why / How / DE Use Case / Integrations /
   Runtime) plus key facts and interview Q&A. Consumed by
   _service-detail.js (renderer) and formats/azure.js (nav).
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const AZURE_SERVICES = [
    /* ── STORAGE ─────────────────────────────────────────── */
    {
      id: 'adls-gen2', name: 'Azure Data Lake Storage Gen2', category: 'storage',
      aka: 'ADLS Gen2 — Blob Storage with a hierarchical namespace',
      tagline: 'The default data lake on Azure: massively scalable object storage with real directories, POSIX ACLs, and one API surface for both blob and file semantics.',
      keyFacts: [
        { k: 'Built on', v: 'Azure Blob Storage' },
        { k: 'Key feature', v: 'Hierarchical Namespace (HNS)' },
        { k: 'Protocol', v: 'abfss:// (ABFS driver)' },
        { k: 'Security', v: 'RBAC + POSIX ACLs' },
      ],
      what: {
        lead: 'ADLS Gen2 is not a separate product — it is Azure Blob Storage with the Hierarchical Namespace feature turned on. That one flag adds true directories and file/folder-level permissions, turning cheap object storage into a lake that behaves like a filesystem.',
        bullets: [
          { h: 'Hierarchical Namespace (HNS)', d: 'Files are organized in real directories, so a rename or move of a folder is a single atomic metadata operation instead of copying every object.' },
          { h: 'Multi-protocol access', d: 'The same data is reachable through the Blob endpoint and the Data Lake (ABFS) endpoint — no data movement between "lake" and "blob".' },
          { h: 'Storage tiers', d: 'Hot / Cool / Cold / Archive tiers let you place cold history cheaply and hot working data fast, per blob or via lifecycle rules.' },
        ],
      },
      why: {
        lead: 'Analytics engines list and scan directories constantly. On flat blob storage a "directory rename" means copy-then-delete of millions of objects; HNS makes it O(1) and gives per-directory security the lake actually needs.',
        bullets: [
          { h: 'Atomic directory operations', d: 'Spark writes to a _temporary folder then renames it to commit. Flat blob makes that slow and non-atomic; HNS makes commit instant and safe.' },
          { h: 'Fine-grained security', d: 'POSIX ACLs on folders let you grant a team read on /bronze/orders without exposing /silver/pii.' },
          { h: 'Cost at scale', d: 'Object storage economics (pennies/GB) with tiering, versus paying warehouse rates to store raw data.' },
        ],
      },
      how: {
        lead: 'Data is addressed as abfss://<container>@<account>.dfs.core.windows.net/<path>. The ABFS driver talks to the DFS endpoint, which understands directories; the Blob endpoint sees the same bytes as flat objects.',
        bullets: [
          { h: 'Containers = filesystems', d: 'A storage account holds containers; with HNS each container is a filesystem root with a directory tree.' },
          { h: 'ACLs + RBAC combine', d: 'Azure RBAC grants coarse account/container roles; POSIX ACLs (read/write/execute) refine access down to individual folders and files.' },
          { h: 'Medallion layout', d: 'Conventionally organized as /bronze (raw), /silver (cleaned), /gold (curated) containers or folders.' },
        ],
        code: {
          lang: 'spark (abfss path)',
          text: "df = spark.read.parquet(\n  \"abfss://bronze@shopkart.dfs.core.windows.net/orders/\"\n)\ndf.write.format(\"delta\").save(\n  \"abfss://silver@shopkart.dfs.core.windows.net/orders/\"\n)",
        },
      },
      deUseCase: {
        lead: 'ADLS Gen2 is the storage foundation under almost every Azure pipeline — the landing zone for ingestion and the physical home of Bronze/Silver/Gold Delta tables.',
        bullets: [
          { h: 'Landing + medallion lake', d: 'ADF or Event Hubs Capture lands raw files in Bronze; Databricks/Synapse Spark refine into Silver and Gold on the same account.' },
          { h: 'External tables', d: 'Synapse Serverless SQL and Databricks Unity Catalog external locations point directly at ADLS paths — query in place, no load.' },
        ],
      },
      integrations: [
        { id: 'data-factory', label: 'Data Factory', note: 'ingests / lands files' },
        { id: 'synapse-serverless', label: 'Synapse Serverless SQL', note: 'query in place' },
        { id: 'event-hubs', label: 'Event Hubs Capture', note: 'streams → Parquet' },
        { id: 'purview', label: 'Microsoft Purview', note: 'scans & catalogs' },
        { label: 'Databricks (external location)', note: 'Unity Catalog governs the same paths' },
      ],
      runtime: {
        lead: 'At runtime the ABFS driver batches metadata calls and streams block ranges. Because HNS renames are metadata-only, Spark job commit is fast and atomic — the single biggest lake performance win over flat blob.',
        bullets: [
          { h: 'Throughput', d: 'Scales to many GB/s per account; parallel readers hit many blocks/objects at once.' },
          { h: 'Consistency', d: 'Strong read-after-write consistency — a file written is immediately readable, so pipelines do not need eventual-consistency workarounds.' },
          { h: 'Account scalability targets', d: 'A storage account has published request-rate and ingress/egress targets; exceeding them returns throttling (HTTP 503/500) until load drops — spread load across prefixes and use backoff.' },
        ],
      },
      architecture: {
        lead: 'ADLS Gen2 is Azure Blob Storage with a Hierarchical Namespace (HNS) overlay. The same stored bytes are reachable through two endpoints — the Blob endpoint (blob.core.windows.net, flat object view) and the Data Lake/DFS endpoint (dfs.core.windows.net, directory-aware, via the ABFS driver). HNS maintains a real directory tree in metadata, which is what makes folder operations atomic.',
        bullets: [
          { h: 'Hierarchical Namespace', d: 'HNS stores a true directory tree, so a rename/move/delete of a folder is a single atomic metadata transaction rather than copy-then-delete of every descendant object. This is the core architectural difference from flat blob.' },
          { h: 'Dual endpoints, one copy', d: 'Blob APIs and ABFS/DFS APIs operate on the same bytes. Tools that speak either protocol interoperate without data movement between "blob" and "lake".' },
          { h: 'Account → container → directory → file', d: 'A storage account hosts containers (filesystems); with HNS each is a directory-tree root. Partitioned analytics layouts (dt=…/) live as real directories, not just key prefixes.' },
          { h: 'Redundancy topology', d: 'Data is replicated per the account’s redundancy choice — LRS (one datacenter), ZRS (across zones), GRS/GZRS (secondary region async), RA-GRS (secondary readable) — trading cost for durability and DR reach.' },
        ],
      },
      security: {
        lead: 'ADLS Gen2 security layers Microsoft Entra ID identity, two coordinated authorization models (Azure RBAC and POSIX ACLs), network isolation, and encryption. The key subtlety interviewers probe: RBAC is evaluated first, and if it already grants data access at the container/account scope, POSIX ACLs are not even consulted.',
        bullets: [
          { h: 'RBAC then ACLs', d: 'Azure RBAC data-plane roles (Storage Blob Data Reader/Contributor/Owner) grant coarse access at account/container scope. If RBAC permits the operation, evaluation short-circuits; only when RBAC does not grant it are POSIX ACLs checked on the path. ACLs add fine-grained read/write/execute on directories and files.' },
          { h: 'ACL mechanics', d: 'Each file/dir has access ACLs; directories also have default ACLs that new children inherit at creation (existing children are not retroactively changed). There is a limit of 32 ACL entries per file/dir — so grant to Entra groups, not individual users, to stay under it and keep ACLs maintainable.' },
          { h: 'Identities & keys', d: 'Prefer Entra ID (users, groups, managed identities, service principals) over the account key or SAS tokens. The account key is a full-access secret — rotate it, store it in Key Vault, and disable account-key access where possible.' },
          { h: 'Network isolation', d: 'Private Endpoints bring the account into a VNet; the storage firewall + service endpoints restrict access to selected networks; "secure transfer required" enforces TLS.' },
          { h: 'Encryption at rest', d: 'All data is encrypted at rest with Microsoft-managed keys by default; customer-managed keys (CMK) in Key Vault add control/rotation, and infrastructure encryption adds a second layer for regulated workloads.' },
        ],
      },
      operations: {
        lead: 'ADLS Gen2 is fully managed, so operations centers on data-protection features (soft delete, versioning, change feed), lifecycle/tiering automation, redundancy/DR, and watching account-level throttling. Durability and availability are covered by the storage SLA for the chosen redundancy.',
        bullets: [
          { h: 'Data protection', d: 'Blob and container soft delete recover accidental deletes within a retention window; blob versioning keeps prior versions on overwrite; snapshots capture point-in-time copies; change feed gives an ordered log of changes for incremental processing.' },
          { h: 'Lifecycle & tiers', d: 'Lifecycle management policies move blobs Hot → Cool → Cold → Archive and expire them by age/last-access, automating cost control. Archive is offline and must be rehydrated (hours) before reading.' },
          { h: 'Redundancy & DR', d: 'GRS/RA-GRS replicate asynchronously to a secondary region; customer-managed failover promotes it. ZRS/GZRS protect against zone failure within a region.' },
          { h: 'Monitoring', d: 'Azure Monitor metrics (transactions, ingress/egress, latency, availability) and diagnostic/resource logs feed alerts; watch throttled-request and availability metrics to catch scalability-target breaches early.' },
        ],
      },
      cost: {
        lead: 'ADLS Gen2 bills on several independent dimensions: stored capacity (per GB-month, by access tier), transactions (per operation, priced higher on cooler tiers), data retrieval on cool/cold/archive, early-deletion charges, and egress bandwidth. For lakes, the small-files problem is a cost problem — millions of tiny files mean millions of billable operations. (Rates vary by region/tier — price against the official Azure Storage pricing page.)',
        bullets: [
          { h: 'Capacity by tier', d: 'Hot (cheapest transactions, priciest storage) → Cool → Cold → Archive (cheapest storage, highest retrieval cost + rehydration latency). Match the tier to access frequency.' },
          { h: 'Transactions & retrieval', d: 'Every read/write/list is a billed operation; cooler tiers cost more per transaction and add per-GB retrieval fees. Compaction cuts both scan time and operation count.' },
          { h: 'Early-deletion & egress', d: 'Cool/Cold/Archive have minimum-retention windows (deleting sooner incurs a charge). Cross-region/internet egress is billed — keep compute in the account’s region and use private endpoints.' },
          { h: 'Cost levers', d: 'Compact small files, lifecycle to colder tiers, expire old versions/snapshots, and store columnar/compressed data so engines scan (and transact) less.' },
        ],
      },
      walkthrough: {
        lead: 'How an authorized read of a file resolves end to end — the RBAC-then-ACL path that trips people up.',
        steps: [
          { h: 'Client addresses the DFS endpoint', d: 'Spark/ABFS issues a read for abfss://container@account.dfs.core.windows.net/silver/orders/part-0.parquet, presenting an Entra ID token (user, managed identity or service principal).' },
          { h: 'Authenticate the identity', d: 'The request is authenticated via Entra ID (or, less preferably, an account key / SAS). The caller’s security principal and group memberships are established.' },
          { h: 'RBAC check (first)', d: 'Azure evaluates data-plane RBAC role assignments at account/container scope. If a role like Storage Blob Data Reader already grants read, authorization succeeds immediately and ACLs are not consulted.' },
          { h: 'ACL check (only if RBAC did not grant)', d: 'If RBAC did not authorize it, POSIX ACLs are evaluated along the path: execute (x) is needed on every parent directory to traverse, and read (r) on the target file. A missing x on any ancestor denies the read even if the file ACL grants r.' },
          { h: 'Serve the bytes', d: 'On success the service streams the requested block ranges back; strong consistency means a just-written file is immediately readable.' },
        ],
        note: 'Simplified authorization model; the exact RBAC/ACL interaction and supported auth methods are defined in the Azure Storage access-control docs.',
      },
      examples: [{
        title: 'Governed medallion lake: team read on Bronze without exposing Silver PII',
        requirement: 'Give an analyst team read access to raw Bronze data but not the Silver PII folder, while an ingestion service principal writes Bronze — using groups so ACLs stay maintainable.',
        input: 'A storage account with HNS enabled and containers/folders: bronze/orders/, silver/pii/.',
        architecture: 'Entra groups (analysts, ingestors) → Azure RBAC at container scope + POSIX ACLs on folders → ADF/Databricks access via managed identity.',
        code: {
          lang: 'bash (azure cli, illustrative)',
          text: "# Grant analysts read on the bronze container via RBAC (coarse)\naz role assignment create \\\n  --assignee <analysts-group-object-id> \\\n  --role \"Storage Blob Data Reader\" \\\n  --scope \"$ACCOUNT_ID/blobServices/default/containers/bronze\"\n\n# Fine-grained: default ACL so NEW files under bronze/orders inherit r-x for analysts\naz storage fs access set-recursive \\\n  --acl \"default:group:<analysts-group>:r-x\" \\\n  --path orders --file-system bronze --account-name shopkart\n\n# Ingestors write bronze; NO grant on silver/pii at all",
        },
        steps: [
          'Create Entra groups and add members (never grant to individuals).',
          'Assign RBAC data roles at container scope for coarse access.',
          'Set access + default ACLs on the specific folders for fine-grained control.',
          'Grant the ingestion managed identity write on Bronze only.',
        ],
        output: 'Analysts can read Bronze (including new files, via default ACLs) but get authorization failures on silver/pii; the ingestion identity can write Bronze.',
        validation: 'As an analyst, read a Bronze file (succeeds) and a silver/pii file (denied); confirm a newly-written Bronze file is readable thanks to the default ACL.',
        errorHandling: 'A 403 on Bronze usually means a missing execute (x) ACL on a parent directory — grant traversal on ancestors. Keep under 32 ACL entries per item by using groups.',
        production: 'Prefer managed identities over keys/SAS; enable soft delete + versioning; add a Private Endpoint and firewall; audit access with diagnostic logs.',
        cleanup: 'Remove the role assignments and ACL entries, delete the groups if unused, and delete the containers/account to stop charges.',
      }],
      troubleshooting: [
        {
          symptom: 'A user or service principal gets HTTP 403 reading a file it "should" have access to, even though an ACL grants read on that file.',
          evidence: 'The file’s ACL shows r for the principal, but the read still fails; other files in the same tree may also fail; parent directories lack an execute entry for the principal.',
          causes: ['Missing execute (x) ACL on a parent directory in the path', 'Access granted only via an access ACL with no default ACL, so newly-created children were not covered', 'Expecting ACLs to apply when an RBAC assignment is actually the effective (or missing) grant'],
          investigation: ['List the ACLs along the full path, not just the target file', 'Check for x on every ancestor directory', 'Check RBAC role assignments at account/container scope to see the effective authorization'],
          rootCause: 'POSIX traversal requires execute on every parent directory; a missing x on an ancestor denies the read regardless of the file’s own read ACL.',
          remediation: ['Grant execute (x) to the principal/group on all parent directories in the path', 'Set default ACLs on directories so new children inherit the needed permissions', 'Or grant access via an appropriate RBAC data role at container scope if coarse access is acceptable'],
          validation: 'The principal reads the file successfully; newly-created files under the directory are also readable via inherited default ACLs.',
          prevention: 'Grant to Entra groups with both access and default ACLs set on directories; document the RBAC-then-ACL model so grants are placed at the right layer.',
        },
        {
          symptom: 'A high-throughput job intermittently fails or slows with HTTP 503 "ServerBusy"/throttling against the storage account.',
          evidence: 'Azure Monitor shows throttled-request and total-request spikes approaching the account’s scalability targets; errors cluster during peak fan-out.',
          causes: ['Request rate or ingress/egress exceeding the storage account scalability targets', 'Too many parallel small-file operations', 'No exponential backoff/jitter in the client'],
          investigation: ['Correlate 503s with the account’s request-rate and ingress/egress metrics', 'Check whether small files are inflating operation counts', 'Confirm the client/driver retry policy uses backoff with jitter'],
          rootCause: 'The workload exceeded the storage account’s published scalability targets, so the service throttled requests to protect the account.',
          remediation: ['Spread data/load across prefixes (and, for extreme scale, multiple accounts)', 'Compact small files to cut operation count', 'Enable exponential backoff with jitter; smooth/stagger bursts'],
          validation: 'Throttled-request metric returns to ~0 and job throughput stabilizes under the same load.',
          prevention: 'Design layouts that distribute load, keep files right-sized, and keep backoff-with-jitter on by default; monitor against scalability targets.',
        },
      ],
      certMapping: {
        lead: 'ADLS Gen2 is the Azure lake storage layer. The Synapse-era DP-203 (Azure Data Engineer Associate) that covered it was retired in 2025; the current Microsoft data-engineering credential, DP-700, is Fabric-focused and reaches ADLS primarily as an external/shortcut source.',
        items: [
          { label: 'DP-700 Fabric Data Engineer (Associate)', certId: 'ms-dp700', objectives: ['Ingest from / shortcut to ADLS Gen2 external locations', 'Secure external data (RBAC, identities)', 'Lake storage & medallion layout'] },
          'Legacy lineage: DP-203 (Azure Data Engineer Associate, Synapse-era) — retired 2025; covered ADLS Gen2 storage, security (RBAC + ACLs) and partitioning directly.',
        ],
      },
      interview: [
        { q: 'What is the difference between Blob Storage and ADLS Gen2?', a: 'ADLS Gen2 is Blob Storage with the Hierarchical Namespace enabled. That adds real directories (atomic folder rename/move), POSIX ACLs for folder-level security, and the ABFS/DFS endpoint — while keeping blob economics and multi-protocol access to the same bytes.' },
        { q: 'Why does the hierarchical namespace matter for Spark?', a: 'Spark commits output by writing to a temp directory then renaming it. On flat blob a rename is copy+delete of every object — slow and non-atomic. HNS makes the rename a single metadata operation, so job commit is fast and atomic.' },
        { q: 'How do you secure data in ADLS Gen2?', a: 'Two layers: Azure RBAC for coarse-grained roles at account/container scope, and POSIX ACLs (read/write/execute) on directories and files for fine-grained access — e.g. a team gets read on /bronze but not /silver/pii.' },
        { q: 'When both RBAC and ACLs exist, how is access decided?', a: 'RBAC is evaluated first. If a data-plane role assignment (e.g. Storage Blob Data Reader at the container) already grants the operation, authorization succeeds and ACLs are never consulted. ACLs only come into play when RBAC does not grant the access — and then you need execute on every parent directory plus read/write on the target. That ordering is why a correct file ACL can still 403 if an RBAC grant is broader than intended, or if a parent directory is missing execute.' },
        { q: 'A service principal with a read ACL on a file still gets 403 — why, and how do you fix it without over-granting?', a: 'Almost always a missing execute (x) on a parent directory: POSIX traversal needs x on every ancestor to reach the file. Fix it by granting x to the principal’s group on the parent directories (and set default ACLs so new children inherit), rather than handing out a broad container-level RBAC role. Granting to Entra groups also keeps you under the 32-entry-per-item ACL limit.' },
      ],
    },

    {
      id: 'blob-storage', name: 'Azure Blob Storage', category: 'storage',
      tagline: 'Azure’s core object store for unstructured data — the substrate ADLS Gen2 is built on, and the go-to for backups, images, logs and any "just put bytes somewhere cheap" need.',
      keyFacts: [
        { k: 'Model', v: 'Flat object store' },
        { k: 'Tiers', v: 'Hot / Cool / Cold / Archive' },
        { k: 'Redundancy', v: 'LRS / ZRS / GRS / RA-GRS' },
        { k: 'Access', v: 'REST, SAS, RBAC' },
      ],
      what: {
        lead: 'Blob Storage stores objects (blobs) in a flat container namespace. Without the hierarchical namespace there are no true folders — "paths" are just prefixes on object names.',
        bullets: [
          { h: 'Block / append / page blobs', d: 'Block blobs for files & streaming uploads, append blobs for logs, page blobs for random-access (VM disks).' },
          { h: 'Redundancy options', d: 'LRS (local), ZRS (zonal), GRS (geo), RA-GRS (geo + read replica) trade cost against durability and DR.' },
        ],
      },
      why: {
        lead: 'It is the cheapest, most durable place to keep large volumes of data on Azure, with lifecycle rules to tier data down automatically as it ages.',
        bullets: [
          { h: 'Elastic + cheap', d: 'Pennies per GB, effectively unlimited capacity, pay only for what you store and transfer.' },
          { h: 'Durable', d: 'Eleven 9s of durability with geo-redundant options for disaster recovery.' },
        ],
      },
      how: {
        lead: 'Clients address blobs as https://<account>.blob.core.windows.net/<container>/<name>. Access is granted via account keys, SAS tokens (scoped, time-limited) or Azure RBAC + Entra identities.',
        bullets: [
          { h: 'Lifecycle management', d: 'Rules auto-move blobs Hot → Cool → Archive after N days and delete expired data, cutting storage cost without code.' },
          { h: 'SAS tokens', d: 'Shared Access Signatures grant scoped, expiring URLs — the safe way to hand a partner temporary read on one container.' },
        ],
      },
      deUseCase: {
        lead: 'In a data platform Blob is the raw landing zone and archive tier. Enable HNS on it and it becomes ADLS Gen2 for analytics; leave it flat for backups, exports and file drops.',
        bullets: [
          { h: 'Ingestion drop zone', d: 'Partners and apps drop CSV/JSON/Parquet; ADF or Event Grid triggers pick them up.' },
          { h: 'Cold archive', d: 'Aged Parquet history tiered to Archive for cents, rehydrated only when needed.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'same service + HNS' },
        { id: 'data-factory', label: 'Data Factory', note: 'copy source/sink' },
        { id: 'event-hubs', label: 'Event Hubs Capture', note: 'writes Avro/Parquet here' },
      ],
      runtime: {
        lead: 'Blob operations are individual REST calls against a flat index. Listing a large "folder" scans by prefix across the whole container, which is why analytics workloads prefer HNS (ADLS Gen2).',
        bullets: [
          { h: 'Eventual list consistency', d: 'Recently created blobs are immediately readable, but large prefix listings can be slower than a real directory tree.' },
        ],
      },
      interview: [
        { q: 'When would you use plain Blob Storage vs ADLS Gen2?', a: 'Use ADLS Gen2 (HNS on) for analytics lakes that need directory semantics and folder ACLs. Use plain Blob for backups, media, exports, and simple app storage where you do not need atomic folder renames or POSIX ACLs. It is the same service — HNS is the switch.' },
        { q: 'What are storage tiers and why use them?', a: 'Hot/Cool/Cold/Archive tiers trade access cost for storage cost. Hot for active data, Archive for rarely-read history at the lowest price. Lifecycle rules move blobs down tiers automatically as they age.' },
      ],
    },

    /* ── INGESTION & ETL ─────────────────────────────────── */
    {
      id: 'data-factory', name: 'Azure Data Factory', category: 'ingest-etl',
      aka: 'ADF — cloud-native, serverless data integration',
      tagline: 'Azure’s managed orchestration and ETL/ELT service: pipelines that move data from 100+ sources, transform it with Mapping Data Flows or by pushing compute down to Spark/SQL, on a schedule or trigger.',
      keyFacts: [
        { k: 'Role', v: 'Orchestration + ELT' },
        { k: 'Move engine', v: 'Copy Activity (IR)' },
        { k: 'Transform', v: 'Mapping Data Flows (Spark)' },
        { k: 'Connectors', v: '100+ sources/sinks' },
      ],
      what: {
        lead: 'ADF is a serverless data-integration service. You build pipelines of activities — copy, transform, run a notebook, run a stored proc — and ADF schedules and monitors them. It is Azure’s answer to "how do I get data from A to B and orchestrate the steps".',
        bullets: [
          { h: 'Pipelines & activities', d: 'A pipeline is a DAG of activities: Copy, Data Flow, Databricks Notebook, Stored Procedure, Lookup, ForEach, If.' },
          { h: 'Integration Runtime (IR)', d: 'The compute that executes moves: Azure IR (cloud), Self-hosted IR (on-prem/VNet), Azure-SSIS IR (lift SSIS packages).' },
          { h: 'Mapping Data Flows', d: 'Visual, code-free transformations that ADF compiles to Spark and runs on a managed cluster — no Spark code required.' },
          { h: 'Triggers', d: 'Schedule, tumbling window (with dependencies & backfill), and event triggers (a blob arrives).' },
        ],
      },
      why: {
        lead: 'Teams need a managed, monitored way to orchestrate ingestion and transformation without running their own scheduler. ADF gives connectors, retry/alerting, and parameterized reusable pipelines out of the box.',
        bullets: [
          { h: 'ELT push-down', d: 'Rather than transform in ADF, it commonly orchestrates: copy raw to the lake, then invoke Databricks/Synapse to do the heavy transform where the data lives.' },
          { h: 'Hybrid connectivity', d: 'Self-hosted IR reaches on-prem SQL Server, Oracle, file shares behind a firewall — key for lift-and-shift.' },
          { h: 'Metadata-driven', d: 'Parameterized pipelines + a control table let one pipeline ingest hundreds of tables generically.' },
        ],
      },
      how: {
        lead: 'A pipeline references linked services (connection definitions) and datasets (shape/location). The Copy Activity streams data source→sink through an IR; Data Flows spin up a transient Spark cluster. Triggers fire pipelines; Monitor tracks runs.',
        bullets: [
          { h: 'Linked service + dataset', d: 'Linked service = the connection (an ADLS account, a SQL DB); dataset = the table/file within it. Reused across pipelines.' },
          { h: 'Tumbling window triggers', d: 'Fixed, non-overlapping time slices with dependency chains and automatic backfill of missed windows — ideal for incremental loads.' },
          { h: 'CI/CD', d: 'ADF integrates with Git; ARM templates promote pipelines dev → test → prod.' },
        ],
        code: {
          lang: 'pipeline (conceptual)',
          text: "Trigger (event: blob lands in /bronze)\n  -> Copy Activity: SQL on-prem  ->  ADLS /bronze/orders (Parquet)\n  -> Databricks Notebook: bronze -> silver (clean, dedupe)\n  -> Stored Proc: refresh Synapse gold table",
        },
      },
      deUseCase: {
        lead: 'ADF is the control plane of an Azure batch platform: it lands raw data into ADLS Bronze, then orchestrates the Spark/SQL jobs that build Silver and Gold, with retries, alerting and lineage.',
        bullets: [
          { h: 'Ingestion framework', d: 'Metadata-driven pipeline copies 300 on-prem tables nightly into Bronze, parameterized by a control table.' },
          { h: 'Orchestrating Databricks', d: 'ADF triggers Databricks notebooks/jobs and passes parameters; ADF owns scheduling, Databricks owns transformation.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'primary sink / lake' },
        { id: 'azure-sql', label: 'Azure SQL', note: 'source & sink' },
        { id: 'synapse-analytics', label: 'Synapse', note: 'load gold tables' },
        { id: 'key-vault', label: 'Key Vault', note: 'stores secrets' },
        { label: 'Databricks', note: 'Notebook activity' },
      ],
      architecture: {
        lead: 'ADF separates a control plane (the service that stores pipeline definitions, schedules triggers and records run history) from a data plane (the Integration Runtime that actually moves and transforms bytes). The control plane never touches your data — it only tells an IR what to do. Understanding which IR runs an activity explains most ADF behavior, networking and cost.',
        bullets: [
          { h: 'Integration Runtime types', d: 'Azure IR = fully-managed cloud compute for cloud-to-cloud copy and Data Flows; Self-hosted IR (SHIR) = an agent you install on a VM/on-prem box to reach private sources; Azure-SSIS IR = a managed cluster that runs lifted SSIS packages.' },
          { h: 'Copy Activity engine', d: 'A Copy Activity reads from a source connector, optionally serializes/compresses, and writes to a sink. On Azure IR it scales with Data Integration Units (DIUs); it can partition a large source and copy partitions in parallel (parallelCopies) to saturate bandwidth.' },
          { h: 'Mapping Data Flow = generated Spark', d: 'A visual Data Flow is compiled to Scala/Spark and executed on a transient, ADF-managed Databricks-style cluster. You never see the cluster; you pick a compute size and TTL. This is why Data Flows have a cold-start and bill in vCore-hours, unlike Copy.' },
          { h: 'Control flow vs data flow', d: 'Pipeline activities (ForEach, If, Until, Lookup, Set Variable, Execute Pipeline) are orchestration — they run on the service, not a cluster. Only Copy and Data Flow move real data. Mixing them up is the root of most cost surprises.' },
          { h: 'Managed VNet', d: 'An Azure IR can be provisioned inside an ADF-managed virtual network so that copies and Data Flows egress through managed private endpoints onto the Microsoft backbone instead of the public internet.' },
        ],
      },
      runtime: {
        lead: 'ADF is serverless — there is no cluster to keep running — but its activities have very different performance characteristics. Copy throughput is governed by DIUs and parallelism; Data Flow latency is dominated by Spark cluster cold-start plus the compute size you pick.',
        bullets: [
          { h: 'Parallel copy', d: 'Copy Activity partitions large sources and moves partitions in parallel; raising DIUs and parallelCopies increases throughput until the source, sink or network becomes the bottleneck.' },
          { h: 'Data Flow cold-start', d: 'Each Data Flow run warms a transient Spark cluster (minutes). Setting an Integration Runtime TTL keeps the cluster alive between sequential Data Flows so the warm-up is paid once, not per activity.' },
          { h: 'Staged copy & PolyBase/COPY', d: 'For loading Synapse/SQL, ADF can stage data in blob and use COPY/PolyBase for a bulk, set-based load that is far faster than row-by-row inserts.' },
          { h: 'Concurrency limits', d: 'Pipelines have concurrency settings and each IR has capacity; ForEach has a batchCount. Unbounded fan-out can throttle sources or exhaust IR capacity.' },
        ],
      },
      security: {
        lead: 'ADF authenticates to data stores without storing credentials in pipelines: the factory has a managed identity (Entra ID) that you grant RBAC roles, and secrets that must exist (e.g., SAS tokens) live in Key Vault and are referenced, never inlined. Network isolation is layered on with Managed VNet + private endpoints.',
        bullets: [
          { h: 'Managed identity', d: 'Every factory gets a system-assigned managed identity (and can add user-assigned ones). Grant it Storage Blob Data roles, SQL roles, etc., and ADF authenticates passwordlessly — no keys in linked services.' },
          { h: 'Key Vault linked service', d: 'Where a secret is unavoidable, store it in Azure Key Vault and reference it from the linked service, so secrets are rotated centrally and never appear in Git or ARM templates.' },
          { h: 'Managed VNet + managed private endpoints', d: 'Provision the Azure IR in a managed VNet and create managed private endpoints to data stores; traffic stays on the Microsoft backbone, public access can be disabled, and this guards against data exfiltration.' },
          { h: 'Encryption & CMK', d: 'Factory metadata is encrypted at rest with Microsoft-managed keys by default; customer-managed keys (CMK) in Key Vault can be enabled where regulatory compliance requires you to own the key.' },
          { h: 'RBAC on the factory', d: 'The Data Factory Contributor role and finer Entra roles control who can edit/publish pipelines; Git integration adds PR-based review before changes reach the live (published) factory.' },
        ],
      },
      operations: {
        lead: 'ADF is operated through its Monitor experience (pipeline/activity/trigger runs), Azure Monitor (metrics, logs, alerts) and Git-backed CI/CD. Reliability comes from built-in retries, tumbling-window dependencies with automatic backfill, and regional redundancy of the managed service.',
        bullets: [
          { h: 'Monitoring & alerting', d: 'The Monitor tab shows run status and lets you rerun from the point of failure; diagnostic settings ship run logs to Log Analytics, and Azure Monitor alerts fire on failed runs or SLA breaches.' },
          { h: 'Retry & error handling', d: 'Each activity has retry count + interval; pipelines model success/failure/completion/skip paths, so you can branch to compensation logic or alerting on failure.' },
          { h: 'Backfill & dependencies', d: 'Tumbling-window triggers track each time slice, honor inter-window dependencies, and automatically backfill missed windows — the backbone of reliable incremental loads.' },
          { h: 'CI/CD', d: 'The authoring UI commits to a Git repo (feature branches + PRs); publishing generates ARM templates that promote dev → test → prod, with Key Vault supplying per-environment secrets.' },
          { h: 'Availability', d: 'ADF is a regional managed service; Microsoft publishes an uptime SLA for activity-run scheduling (see the official SLA page). Self-hosted IR reliability is your responsibility — run 2+ nodes for high availability.' },
        ],
      },
      cost: {
        lead: 'ADF has no idle/base charge — you pay only for what runs, across three meters: orchestration (per activity run), data movement (DIU-hours for Copy on Azure IR), and data transformation (vCore-hours for Data Flows). Pipeline control-flow activities are cheap; Data Flows and large copies dominate the bill. (Rates vary by region/currency — always price against the official Azure pricing page.)',
        bullets: [
          { h: 'Orchestration', d: 'Billed per activity run (quoted per 1,000 runs). Lookups, Set Variable and ForEach iterations each count — a fan-out over thousands of items generates thousands of billable runs.' },
          { h: 'Data movement (Copy)', d: 'Billed in DIU-hours on Azure IR, prorated by execution time; more DIUs = faster but more DIU-hours. Self-hosted IR copy is billed per hour of the move.' },
          { h: 'Data transformation (Data Flows)', d: 'Billed in vCore-hours with an 8-vCore cluster minimum, prorated by the minute and rounded up. Cold-start time is billable, so TTL reuse and right-sizing the cluster matter.' },
          { h: 'Cost levers', d: 'Push heavy transforms down to Databricks/Synapse instead of Data Flows when it is cheaper; use TTL to amortize Data Flow warm-up; prefer set-based COPY loads; avoid needless per-row ForEach fan-out.' },
        ],
      },
      walkthrough: {
        lead: 'What happens when a scheduled incremental copy pipeline runs — from trigger to watermark update.',
        steps: [
          { h: 'Trigger fires', d: 'A schedule or tumbling-window trigger starts the pipeline run; a tumbling-window trigger passes the window start/end as parameters and tracks dependencies/backfill.' },
          { h: 'Lookup the watermark', d: 'A Lookup activity reads the last-processed watermark (max modified date / id) for the table from a control table.' },
          { h: 'Resolve the Integration Runtime', d: 'The activity binds to its IR: Azure IR for cloud-to-cloud, Self-hosted IR to reach an on-prem/VNet source, each using the linked service’s credentials (ideally from Key Vault / a managed identity).' },
          { h: 'Copy only new rows', d: 'The Copy activity issues a source query bounded by the watermark (WHERE modified > @lastWatermark AND modified <= @windowEnd) and moves the delta to the sink, parallelized by Data Integration Units (DIUs).' },
          { h: 'Transform (optional)', d: 'ADF either runs a Mapping Data Flow (Spark under the hood) or, more commonly for heavy logic, triggers a Databricks notebook activity to transform the landed data.' },
          { h: 'Update watermark & monitor', d: 'A final activity writes the new watermark back to the control table; run status, rows copied and duration surface in pipeline monitoring for alerting.' },
        ],
        note: 'Simplified run model; exact activity set depends on the pipeline design and IR choice.',
      },
      examples: [{
        title: 'Watermark-based incremental copy from on-prem SQL, then trigger Databricks',
        requirement: 'Each hour, pull only new/changed rows from an on-prem SQL table into ADLS, then kick off a Databricks transform — without re-copying history.',
        input: 'An on-prem SQL Server table with a reliable modified timestamp; a control table holding the last watermark.',
        architecture: 'Tumbling-window trigger → Lookup (watermark) → Copy (Self-hosted IR, on-prem SQL → ADLS Parquet) → Databricks notebook activity → Stored Proc (update watermark).',
        code: {
          lang: 'json (adf copy source query, illustrative)',
          text: "{\n  \"source\": {\n    \"type\": \"SqlServerSource\",\n    \"sqlReaderQuery\": \"SELECT * FROM dbo.orders WHERE modified > '@{activity('lkpWatermark').output.firstRow.wm}' AND modified <= '@{pipeline().parameters.windowEnd}'\"\n  },\n  \"sink\": { \"type\": \"ParquetSink\" }\n}\n-- then a Stored Procedure activity updates the control table with windowEnd",
        },
        steps: [
          'Install/register a Self-hosted IR on a host that can reach on-prem SQL.',
          'Lookup the last watermark from the control table.',
          'Copy only rows in (lastWatermark, windowEnd] to ADLS Parquet.',
          'Trigger the Databricks notebook, then update the watermark.',
        ],
        output: 'Hourly incremental Parquet in ADLS and a refreshed downstream table, with the control table advanced to the window end.',
        validation: 'Confirm rows copied equals source rows changed in the window; a re-run of the same window copies 0 new rows; check monitoring for success.',
        errorHandling: 'Bound the query by both lower and upper watermark so a late-running window cannot skip or double-copy; tumbling-window retries/backfill recover missed slices; secrets come from Key Vault.',
        production: 'Scale DIUs for throughput; keep the SHIR highly available (multi-node) and patched; alert on pipeline failures and on row-count anomalies.',
        cleanup: 'Disable the trigger, remove the pipeline/linked services, and decommission the SHIR host if no longer needed.',
      }],
      troubleshooting: [
        {
          symptom: 'A Copy activity against an on-prem source fails intermittently with connectivity/timeout errors, or throughput collapses at peak.',
          evidence: 'Errors reference the Self-hosted IR; failures correlate with a single SHIR node or network windows; SHIR CPU/queue is saturated in monitoring.',
          causes: ['Single-node SHIR saturated or offline', 'Firewall/network path to the source intermittently blocked', 'Too much concurrency for the SHIR/source to handle'],
          investigation: ['Check SHIR node health/CPU and whether it is single-node', 'Verify the network/firewall path from the SHIR host to the source', 'Review concurrent activity count against SHIR capacity'],
          rootCause: 'The Self-hosted IR (the compute bridging ADF to the on-prem source) is a bottleneck or single point of failure, so copies throttle or fail when it is saturated or unreachable.',
          remediation: ['Scale the SHIR to multiple nodes for HA and throughput', 'Fix/whitelist the network path and stabilize DNS/firewall', 'Cap pipeline concurrency to what the SHIR/source can sustain'],
          validation: 'Copies succeed consistently and throughput holds at peak with no single-node dependency.',
          prevention: 'Run a multi-node SHIR, monitor its health, and size concurrency to source/SHIR capacity.',
        },
        {
          symptom: 'An incremental pipeline silently skips some rows or double-loads others after a run overran or failed.',
          evidence: 'Row counts drift from the source; some windows are missing; the watermark advanced past data that had not been copied, or windows overlapped.',
          causes: ['Watermark updated before the copy actually succeeded', 'Source query bounded only by a lower watermark (no upper bound), so a long-running window grabs rows a later window re-reads', 'Non-monotonic / clock-skewed modified timestamps'],
          investigation: ['Check whether the watermark update is gated on copy success', 'Inspect the source query for both lower and upper bounds', 'Validate the modified column is monotonic and consistent'],
          rootCause: 'The watermark/window logic is not transactional with the copy, so a failure or overlap advances the watermark incorrectly — skipping or duplicating rows.',
          remediation: ['Update the watermark only after a confirmed successful copy', 'Bound the source query by both lower and upper watermark (window end)', 'Use tumbling-window triggers for deterministic, backfillable slices'],
          validation: 'Re-running or backfilling a window reconciles exactly to source counts with no gaps or duplicates.',
          prevention: 'Make watermark advancement depend on copy success and always bound windows on both ends; prefer tumbling-window triggers.',
        },
      ],
      certMapping: {
        lead: 'ADF appears across Azure data-engineering certifications as the orchestration/ingestion pillar.',
        items: [
          { label: 'DP-203 (retired) → DP-700 lineage', objectives: ['Ingest & transform data', 'Orchestrate & monitor pipelines'] },
          { label: 'DP-700 Fabric Data Engineer', certId: 'ms-dp700', objectives: ['Pipelines map to Fabric Data Factory pipelines', 'Incremental load & monitoring patterns carry over'] },
        ],
      },
      interview: [
        { q: 'What is an Integration Runtime in ADF?', a: 'The compute engine that executes activities. Azure IR runs fully-managed in the cloud for cloud-to-cloud moves and Data Flows; Self-hosted IR runs on a VM you control to reach on-prem or VNet sources; Azure-SSIS IR runs lifted SSIS packages.' },
        { q: 'ADF vs Databricks — how do they relate?', a: 'They are complementary. ADF is the orchestrator + connector layer (schedule, move, monitor); Databricks is the transformation engine. A common pattern is ADF lands raw data and triggers Databricks notebooks to do the Spark transformation. ADF Mapping Data Flows can transform too, but heavy logic usually goes to Databricks.' },
        { q: 'How do you do incremental loads in ADF?', a: 'Track a watermark (max modified date / id) per table in a control table; the pipeline reads the last watermark, copies only newer rows, then updates it. Tumbling-window triggers give fixed time slices with dependencies and automatic backfill for missed windows.' },
        { q: 'What is the difference between a linked service and a dataset?', a: 'A linked service is the connection definition (which storage account or database, plus auth). A dataset points at the specific object within it (a container/path or a table). Datasets reference linked services and are reused across pipelines.' },
      ],
    },

    /* ── STREAMING ───────────────────────────────────────── */
    {
      id: 'event-hubs', name: 'Azure Event Hubs', category: 'streaming',
      aka: 'Azure’s managed event-streaming platform (Kafka-compatible)',
      tagline: 'A big-data streaming ingress that swallows millions of events per second, buffers them in partitioned logs, and fans them out to many consumers — with a Kafka-protocol surface so Kafka clients work unchanged.',
      keyFacts: [
        { k: 'Model', v: 'Partitioned append log' },
        { k: 'Kafka', v: 'Wire-compatible endpoint' },
        { k: 'Retention', v: 'Hours → days (Standard)' },
        { k: 'Replay', v: 'By offset within retention' },
      ],
      what: {
        lead: 'Event Hubs is a distributed, partitioned commit log — conceptually Azure’s managed Kafka. Producers append events; the hub retains them for a window; consumers read at their own pace by tracking an offset. It decouples fast producers from slower downstream systems.',
        bullets: [
          { h: 'Partitions', d: 'A hub is split into partitions; each is an ordered, append-only log. Partition count sets the max parallelism of consumers.' },
          { h: 'Consumer groups', d: 'Each consumer group is an independent view (its own offsets) over the same stream — analytics and archival can read the same events separately.' },
          { h: 'Throughput/Processing Units', d: 'Capacity is provisioned in TUs (Standard) or PUs (Premium)/CUs (Dedicated); Auto-Inflate scales TUs up under load.' },
          { h: 'Capture', d: 'Event Hubs Capture automatically writes the stream to ADLS/Blob as Avro or Parquet on a size/time window — instant cheap archival.' },
        ],
      },
      why: {
        lead: 'When events arrive faster than any single consumer can process, you need a durable buffer that preserves order per key and lets many consumers read independently and replay. That is exactly the partitioned-log model.',
        bullets: [
          { h: 'Backpressure & decoupling', d: 'Producers never block on slow consumers; the log absorbs bursts and consumers catch up.' },
          { h: 'Replay', d: 'A consumer can rewind to an earlier offset to reprocess — essential for reprocessing after a bug fix.' },
          { h: 'Kafka without ops', d: 'Existing Kafka producers/consumers point at the Kafka endpoint and just work — no cluster to run.' },
        ],
      },
      how: {
        lead: 'A producer picks a partition (round-robin, or by partition key to keep a key ordered). Events land in that partition’s log with a monotonic offset. Consumers in a group lease partitions and checkpoint their offset so they can resume after a crash.',
        bullets: [
          { h: 'Partition key = ordering unit', d: 'All events with the same key (e.g. orderId) go to one partition, preserving their order; different keys spread for parallelism.' },
          { h: 'Offsets & checkpoints', d: 'Consumers record the last processed offset (checkpoint) so a restart resumes at the right place — at-least-once by default.' },
          { h: 'Capture to lake', d: 'Turn on Capture and every N minutes / MB the hub flushes a Parquet/Avro file to ADLS — Bronze arrives with zero code.' },
        ],
        code: {
          lang: 'concept',
          text: "producer.send(event, key=orderId)   # key -> one partition, ordered\n\nHub \"orders\"  [P0][P1][P2][P3]      # 4 ordered logs\n  consumer-group \"realtime\"  -> Stream Analytics\n  consumer-group \"archive\"   -> Capture -> ADLS /bronze (Parquet)",
        },
      },
      deUseCase: {
        lead: 'Event Hubs is the front door for real-time data on Azure: clickstream, IoT telemetry and app events land here, then split to a hot path (Stream Analytics / Databricks) and a cold path (Capture → ADLS Bronze).',
        bullets: [
          { h: 'Lambda ingress', d: 'One hub feeds both a streaming aggregator (hot) and Capture-to-lake (cold) via separate consumer groups.' },
          { h: 'Databricks Structured Streaming', d: 'Databricks reads Event Hubs (or its Kafka endpoint) directly into a streaming DataFrame for real-time Silver tables.' },
        ],
      },
      integrations: [
        { id: 'stream-analytics', label: 'Stream Analytics', note: 'real-time SQL over the stream' },
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'Capture target' },
        { label: 'Databricks Structured Streaming', note: 'reads via Kafka/EH connector' },
        { label: 'Kafka clients', note: 'Kafka-compatible endpoint' },
      ],
      runtime: {
        lead: 'Ordering is guaranteed only within a partition, never across the hub. Consumer parallelism is capped by partition count, and partition count is fixed at creation on Standard — so you size partitions for peak consumer parallelism up front.',
        bullets: [
          { h: 'At-least-once', d: 'Checkpointing after processing means a crash can reprocess a few events — downstream must be idempotent.' },
          { h: 'Partition count is a ceiling', d: 'You can add TUs for throughput, but you cannot exceed partition count in consumer parallelism; choose it for future peak.' },
          { h: 'Auto-Inflate', d: 'Standard tier can auto-scale throughput units upward under load (never down automatically).' },
        ],
      },
      architecture: {
        lead: 'Event Hubs is a managed partitioned commit log — Azure’s managed Kafka-model service. Producers append to partitions; consumers in consumer groups read independently by offset and checkpoint progress. Capacity is provisioned in throughput units (Standard), processing units (Premium) or capacity units (Dedicated); a Kafka endpoint makes Kafka clients work unchanged.',
        bullets: [
          { h: 'Partitions = ordering + parallelism', d: 'Each partition is an ordered append-only log; ordering holds only within a partition and partition count caps consumer parallelism. On Standard, partition count is fixed at creation — size for future peak.' },
          { h: 'Consumer groups & offsets', d: 'Each consumer group is an independent view with its own offsets; consumers lease partitions and checkpoint the last processed offset (to a Blob checkpoint store) for at-least-once resume.' },
          { h: 'Capacity & Auto-Inflate', d: 'TUs/PUs/CUs set ingress/egress capacity; Auto-Inflate scales TUs up under load (not down). Premium/Dedicated add isolation and higher limits.' },
          { h: 'Capture', d: 'Event Hubs Capture flushes the stream to ADLS/Blob as Avro/Parquet on a time/size window — a zero-code cold path to Bronze while the hot path consumes live.' },
        ],
      },
      security: {
        lead: 'Event Hubs authorizes via Microsoft Entra ID (RBAC data roles) or SAS, with network isolation and encryption at rest. Prefer Entra identities and data-plane roles over long-lived SAS keys.',
        bullets: [
          { h: 'Entra RBAC vs SAS', d: 'Azure Event Hubs Data Sender/Receiver roles grant least-privilege send/receive to Entra identities; SAS policies are the key-based alternative — scope and rotate them.' },
          { h: 'Network', d: 'Private endpoints and IP firewall keep the namespace off the public internet; service endpoints restrict to selected VNets.' },
          { h: 'Encryption', d: 'Encrypted at rest (customer-managed keys available on Premium/Dedicated) and TLS in transit.' },
          { h: 'Capture target access', d: 'Capture writes to ADLS/Blob using a managed identity/role — least-privilege the destination.' },
        ],
      },
      operations: {
        lead: 'Operating Event Hubs is capacity (TU/Auto-Inflate) and partition/consumer management, plus a healthy checkpoint store. Partition count being fixed on Standard is the key up-front decision.',
        bullets: [
          { h: 'Capacity scaling', d: 'Enable Auto-Inflate so TUs scale up under bursts; monitor throttled-request metrics to know when capacity is the limit.' },
          { h: 'Partition sizing up front', d: 'Standard partition count cannot change after creation; choose it for future peak consumer parallelism (Premium/Dedicated are more flexible).' },
          { h: 'Checkpoint store', d: 'Consumers checkpoint to Blob; a healthy, correctly-scoped checkpoint store is required for resume and balanced partition ownership.' },
          { h: 'Monitoring', d: 'Watch incoming vs outgoing throughput, throttled requests, and consumer lag (via checkpoint offset vs head) to catch capacity or consumer problems.' },
        ],
      },
      cost: {
        lead: 'Event Hubs bills by capacity tier — throughput units (Standard) / processing units (Premium) / capacity units (Dedicated) — plus ingress events, Capture, and extended retention. Levers are the right tier, Auto-Inflate bounds, and using Capture instead of custom archival. (Rates vary — price against the official Event Hubs pricing page.)',
        bullets: [
          { h: 'Capacity tier', d: 'Standard TUs for typical load; Premium/Dedicated for isolation and high scale. Match the tier to throughput and isolation needs.' },
          { h: 'Auto-Inflate bounds', d: 'Auto-Inflate scales TUs up (not down) — set a max so a burst does not inflate cost indefinitely.' },
          { h: 'Capture vs custom', d: 'Capture is a cheap, zero-code cold path; building a custom archival consumer usually costs more to run and maintain.' },
        ],
      },
      walkthrough: {
        lead: 'How an event flows through the hub to both a hot and a cold consumer.',
        steps: [
          { h: 'Produce with a key', d: 'The producer sends an event with a partition key; the key maps it to one partition (preserving order for that key), or round-robins if no key.' },
          { h: 'Append with an offset', d: 'The event is appended to the partition’s log with a monotonic offset and retained for the configured window.' },
          { h: 'Hot path consumes', d: 'A real-time consumer group (e.g. Databricks/Stream Analytics) leases partitions, reads events in order per partition, and checkpoints offsets.' },
          { h: 'Cold path via Capture', d: 'Independently, Capture flushes the same stream to ADLS/Blob as Parquet/Avro on a time/size window — no code, separate from the hot path.' },
          { h: 'Replay if needed', d: 'Within retention a consumer group can rewind to an earlier offset to reprocess after a fix — other groups are unaffected.' },
        ],
        note: 'Simplified; at-least-once delivery means downstream processing should be idempotent.',
      },
      examples: [{
        title: 'Lambda-architecture ingress: hot Databricks path + cold Capture-to-ADLS',
        requirement: 'Ingest high-volume telemetry once and serve both a real-time path and a durable raw lake copy, each independent.',
        input: 'Device/app events producing to an Event Hub keyed by device_id.',
        architecture: 'Producers → Event Hub (N partitions) → [consumer group realtime → Databricks Structured Streaming → Silver Delta] + [Capture → ADLS Bronze Parquet].',
        code: {
          lang: 'pyspark (eventhubs/kafka source, illustrative)',
          text: "df = (spark.readStream.format('kafka')  # EH Kafka endpoint\n  .option('kafka.bootstrap.servers', EH_KAFKA)\n  .option('subscribe','telemetry')\n  .option('startingOffsets','latest').load())\n# hot path: transform -> Silver Delta (checkpointed, idempotent upsert)\n# cold path: enable Event Hubs Capture -> ADLS Bronze (Parquet) — no code",
        },
        steps: [
          'Size partitions for peak consumer parallelism at hub creation.',
          'Add a realtime consumer group for Databricks Structured Streaming.',
          'Enable Capture to ADLS for the zero-code cold path.',
          'Make the hot-path write idempotent (at-least-once delivery).',
        ],
        output: 'A real-time Silver table and a durable raw Bronze lake copy, both fed from one hub via separate consumer groups.',
        validation: 'Confirm Capture files land in ADLS on schedule; hot-path counts match; replay a consumer group offset and verify reprocessing works.',
        errorHandling: 'At-least-once means the hot path must dedup/upsert idempotently; Capture isolates the cold path from hot-path failures.',
        production: 'Use Entra data roles; set Auto-Inflate with a max TU bound; monitor throttled requests and consumer lag; private-endpoint the namespace.',
        cleanup: 'Delete the hub/namespace and Capture config; remove the Databricks checkpoint and Bronze/Silver tables.',
      }],
      troubleshooting: [
        {
          symptom: 'Producers get throttled (ServerBusy) and one partition is far hotter than the rest during peaks.',
          evidence: 'Throttled-request metric rises; one partition’s incoming rate dominates; a low-cardinality partition key; TUs at their ceiling.',
          causes: ['Skewed partition key concentrating events on one partition', 'Throughput units exhausted (Auto-Inflate off or capped low)', 'Partition count too low for the aggregate rate'],
          investigation: ['Check per-partition incoming metrics for a hot partition', 'Review partition-key cardinality', 'Check TU usage / throttled-request metric and Auto-Inflate settings'],
          rootCause: 'Either capacity (TUs) is exhausted, or a skewed key overloads one partition while the hub has spare capacity — different fixes.',
          remediation: ['Enable/raise Auto-Inflate (or move to Premium) for genuine capacity limits', 'Choose a higher-cardinality partition key to spread load', 'For Standard, recreate the hub with more partitions if parallelism is the ceiling'],
          validation: 'Throttling stops and per-partition load evens out under the same traffic.',
          prevention: 'Pick a well-distributed partition key and size partitions/TUs for peak at creation; keep Auto-Inflate on with a sane max.',
        },
        {
          symptom: 'Consumers cannot keep up or process events twice, and adding consumers does not help.',
          evidence: 'Consumer lag grows; more consumers than partitions (extras idle); duplicates appear downstream after restarts.',
          causes: ['Consumer parallelism capped by partition count (too few partitions)', 'Slow per-event processing', 'At-least-once redelivery with non-idempotent downstream'],
          investigation: ['Compare consumer count to partition count', 'Measure per-event processing time / checkpoint frequency', 'Check downstream for idempotency on reprocessed events'],
          rootCause: 'Each partition is read by one consumer per group, so parallelism cannot exceed partition count; and at-least-once delivery duplicates on restart unless downstream is idempotent.',
          remediation: ['Increase partition count (plan at creation on Standard) to raise the parallelism ceiling', 'Speed up processing / checkpoint appropriately', 'Make the downstream write idempotent (dedup/upsert keys)'],
          validation: 'Lag drains with added (useful) consumers; reprocessing no longer duplicates.',
          prevention: 'Size partitions to future peak parallelism and design idempotent consumers given at-least-once delivery.',
        },
      ],
      certMapping: {
        lead: 'Event Hubs is the Azure streaming-ingress service; the Synapse-era DP-203 that covered it retired in 2025, and it feeds Fabric real-time (DP-700) scenarios.',
        items: [
          { label: 'DP-700 Fabric Data Engineer (real-time)', certId: 'ms-dp700', objectives: ['Ingest streams (Event Hubs → Fabric Eventstream/Databricks)', 'Partitions, consumer groups & ordering', 'Capture to the lake; at-least-once handling'] },
          'Legacy lineage: DP-203 (retired 2025) covered Event Hubs ingestion, partitions/consumer groups and Capture directly.',
        ],
      },
      interview: [
        { q: 'Event Hubs vs Kafka — what is the relationship?', a: 'Event Hubs is a managed partitioned-log service with the same core model as Kafka (partitions, consumer groups, offsets) and it exposes a Kafka-protocol endpoint so Kafka clients work unchanged. You get the Kafka programming model without running or patching a Kafka cluster.' },
        { q: 'How is ordering guaranteed in Event Hubs?', a: 'Only within a single partition. Send events that must stay ordered with the same partition key (e.g. orderId) so they land in one partition. Across partitions there is no global order — that is the trade for horizontal scale.' },
        { q: 'What is a consumer group?', a: 'An independent reader view over the whole hub with its own offset tracking. Multiple consumer groups let different downstreams (real-time analytics, archival, audit) each read the full stream at their own pace without interfering.' },
        { q: 'What is Event Hubs Capture?', a: 'A built-in feature that automatically writes the incoming stream to ADLS/Blob as Avro or Parquet on a time/size window — a zero-code cold path that lands raw events in the Bronze layer while the hot path consumes the same stream live.' },
      ],
    },

    {
      id: 'stream-analytics', name: 'Azure Stream Analytics', category: 'streaming',
      aka: 'ASA — serverless real-time SQL over streams',
      tagline: 'A managed, serverless engine that runs SQL-like queries continuously over streaming inputs (Event Hubs/IoT Hub), computing windowed aggregations and emitting results to sinks in seconds — no cluster to manage.',
      keyFacts: [
        { k: 'Language', v: 'Stream Analytics Query Language (SQL)' },
        { k: 'Inputs', v: 'Event Hubs, IoT Hub, Blob' },
        { k: 'Windows', v: 'Tumbling/Hopping/Sliding/Session' },
        { k: 'Scale unit', v: 'Streaming Units (SU)' },
      ],
      what: {
        lead: 'Stream Analytics lets you express real-time processing as SQL. You define inputs, a query with temporal windows, and outputs; ASA runs it 24/7, continuously ingesting, computing and emitting — fully serverless.',
        bullets: [
          { h: 'Temporal windows', d: 'Tumbling (fixed, non-overlapping), Hopping (overlapping), Sliding (event-driven), Session (gap-based) windows for time aggregations.' },
          { h: 'Built-in temporal joins', d: 'JOIN two streams within a time bound, or join a stream to reference data (a slowly-changing lookup blob).' },
          { h: 'Serverless SUs', d: 'Capacity is Streaming Units; you scale SUs, not VMs. No infrastructure to patch.' },
        ],
      },
      why: {
        lead: 'For many real-time use cases you do not want to write and operate Spark/Flink code. ASA gives windowed streaming analytics in familiar SQL with sub-second-to-seconds latency and automatic checkpointing.',
        bullets: [
          { h: 'Low-code real time', d: 'Analysts who know SQL can build dashboards-over-streams without distributed-systems expertise.' },
          { h: 'Exactly-once to some sinks', d: 'ASA checkpoints internally and can deliver exactly-once to selected outputs (e.g. SQL) — strong correctness with no manual state code.' },
        ],
      },
      how: {
        lead: 'ASA assigns event time from a timestamp field, buffers events to tolerate out-of-order arrival, applies the windowed query, and writes results to outputs. Watermarks and late-arrival tolerance are configuration, not code.',
        bullets: [
          { h: 'Event time + watermarks', d: 'TIMESTAMP BY chooses the event-time column; late-arrival and out-of-order windows bound how long ASA waits before closing a window.' },
          { h: 'Query parallelism', d: 'Partition-aligned queries (PARTITION BY, matching input partitions) scale linearly across SUs.' },
        ],
        code: {
          lang: 'Stream Analytics SQL',
          text: "SELECT category,\n       System.Timestamp() AS window_end,\n       COUNT(*) AS orders,\n       SUM(amount) AS revenue\nINTO   [powerbi-out]\nFROM   [eventhub-orders] TIMESTAMP BY event_time\nGROUP BY category, TumblingWindow(minute, 5)",
        },
      },
      deUseCase: {
        lead: 'ASA powers the hot path of a real-time platform: live KPIs, fraud/anomaly thresholds and IoT telemetry aggregation, reading from Event Hubs and pushing to Power BI, SQL or back to a hub.',
        bullets: [
          { h: 'Live dashboards', d: 'Event Hubs → ASA 5-minute tumbling revenue → Power BI streaming dataset.' },
          { h: 'Alerting', d: 'Threshold query over a sliding window emits to a hub/queue that triggers an alert function.' },
        ],
      },
      integrations: [
        { id: 'event-hubs', label: 'Event Hubs', note: 'primary input' },
        { id: 'azure-sql', label: 'Azure SQL', note: 'output sink' },
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'reference data / output' },
        { label: 'Power BI', note: 'real-time dashboard sink' },
      ],
      runtime: {
        lead: 'Throughput hinges on matching query partitioning to input partitions: an embarrassingly-parallel (partition-aligned) query scales linearly with SUs; a query that shuffles across partitions bottlenecks. Watermark/late-arrival settings trade latency against completeness.',
        bullets: [
          { h: 'SU utilization', d: 'The SU % metric is the health signal; sustained high utilization means add SUs or repartition the query.' },
          { h: 'Late & out-of-order', d: 'Configurable tolerance decides when a window is finalized — larger tolerance = more correct but higher latency.' },
        ],
      },
      architecture: {
        lead: 'Stream Analytics is a serverless streaming-SQL engine: you declare inputs, a windowed query (with event-time semantics), and outputs, and ASA runs it 24/7, checkpointing internally. Capacity is Streaming Units; throughput scales when the query is partition-aligned with the input.',
        bullets: [
          { h: 'Event-time + windows', d: 'TIMESTAMP BY sets event time; tumbling/hopping/sliding/session windows aggregate over time, with late-arrival and out-of-order tolerance deciding when a window finalizes.' },
          { h: 'Partition-aligned parallelism', d: 'A query that PARTITIONs BY the input’s partition key runs embarrassingly parallel and scales linearly with SUs; cross-partition shuffles bottleneck.' },
          { h: 'Inputs/outputs + reference data', d: 'Inputs: Event Hubs/IoT Hub/Blob; outputs: SQL, ADLS, Power BI, Event Hub, Cosmos, Synapse; reference data joins a slowly-changing lookup to the stream.' },
          { h: 'Checkpointing & restart', d: 'ASA checkpoints internally for fault tolerance and can deliver exactly-once to selected sinks; on restart you choose now / last-stopped / custom start time.' },
        ],
      },
      security: {
        lead: 'ASA uses managed identity to reach inputs/outputs, supports VNet isolation (dedicated cluster), and is governed by Entra — no keys in the query.',
        bullets: [
          { h: 'Managed identity', d: 'Authenticate to Event Hubs/ADLS/SQL via managed identity rather than connection strings where supported.' },
          { h: 'Network isolation', d: 'A Stream Analytics cluster can run in a VNet for private access to sources/sinks.' },
          { h: 'Least privilege', d: 'Scope the identity to the specific input/output resources.' },
        ],
      },
      operations: {
        lead: 'Operating ASA is watching SU utilization and input backlog, tuning parallelism and watermark tolerance, and choosing the right restart mode.',
        bullets: [
          { h: 'SU utilization', d: 'The SU% (and watermark-delay / backlogged-input-events) metrics are the health signals; sustained high utilization or backlog means add SUs or repartition the query.' },
          { h: 'Parallelism', d: 'Align the query partitioning with input partitions for linear scaling; a non-parallel query cannot use added SUs effectively.' },
          { h: 'Late/out-of-order', d: 'Tune tolerance to balance completeness vs latency; events beyond tolerance are dropped/adjusted per policy.' },
          { h: 'Restart modes', d: 'On restart, choose start-time (now / when last stopped / custom) carefully to avoid gaps or reprocessing.' },
        ],
      },
      cost: {
        lead: 'ASA bills Streaming-Unit-hours for the running job (plus a cluster cost if you use a dedicated VNet cluster). The lever is right-sizing SUs via partition-aligned queries so you do not over-provision. (Rates vary — price against the official Stream Analytics pricing page.)',
        bullets: [
          { h: 'SU-hours', d: 'A running job bills continuously for its SUs; size to sustained load, not peak-of-peaks.' },
          { h: 'Parallelism efficiency', d: 'A partition-aligned query uses SUs efficiently; a bottlenecked query wastes them.' },
          { h: 'Stop when idle', d: 'Stop jobs that do not need to run continuously to avoid idle SU cost.' },
        ],
      },
      walkthrough: {
        lead: 'How ASA turns a stream into a windowed result emitted to a sink.',
        steps: [
          { h: 'Ingest + assign event time', d: 'ASA reads events from the input (e.g. an Event Hub consumer group) and assigns event time via TIMESTAMP BY.' },
          { h: 'Buffer & reorder', d: 'Events are buffered up to the out-of-order/late tolerance so windows see events in event-time order.' },
          { h: 'Apply the windowed query', d: 'The SQL runs continuously; a tumbling window, say, aggregates each 5-minute bucket as it closes.' },
          { h: 'Emit to outputs', d: 'Results are written to the sinks (Power BI, SQL, ADLS…), with exactly-once to supported sinks via checkpoints.' },
          { h: 'Checkpoint', d: 'ASA checkpoints progress so a restart resumes without loss.' },
        ],
        note: 'Simplified; exact exactly-once semantics depend on the output sink.',
      },
      examples: [{
        title: 'Live 5-minute revenue to Power BI + SQL from Event Hubs',
        requirement: 'Compute per-category revenue every 5 minutes from an event stream and serve it to a live dashboard and a SQL table — no cluster.',
        input: 'Order events on an Event Hub with an event_time field.',
        architecture: 'Event Hub → ASA (tumbling 5-min, partition-aligned) → Power BI streaming dataset + Azure SQL.',
        code: {
          lang: 'stream analytics sql (illustrative)',
          text: "SELECT category, System.Timestamp() AS window_end,\n       SUM(amount) AS revenue, COUNT(*) AS orders\nINTO   [powerbi-out]\nFROM   [eventhub-orders] TIMESTAMP BY event_time PARTITION BY PartitionId\nGROUP BY category, PartitionId, TumblingWindow(minute, 5);",
        },
        steps: [
          'Define the Event Hub input (dedicated consumer group).',
          'Write a partition-aligned tumbling-window query.',
          'Add Power BI + SQL outputs.',
          'Size SUs to SU% utilization and backlog metrics.',
        ],
        output: 'A live revenue-by-category dashboard plus a SQL table, updated every 5 minutes, fully serverless.',
        validation: 'Confirm windows emit on schedule; SU% stays healthy; counts reconcile with source events for a window.',
        errorHandling: 'Tune late/out-of-order tolerance for completeness; choose the restart start-time to avoid gaps; exactly-once to SQL prevents dup rows.',
        production: 'Use a dedicated consumer group; partition-align for scale; managed identity for sinks; alarm on watermark delay/backlog.',
        cleanup: 'Stop/delete the ASA job and outputs; remove the consumer group.',
      }],
      troubleshooting: [
        {
          symptom: 'An ASA job cannot keep up — SU utilization is pinned high and input events back up.',
          evidence: 'SU% near 100%; backlogged-input-events and watermark-delay rising; the query is not partition-aligned.',
          causes: ['Query not partition-aligned, so added SUs do not help', 'Too few SUs for the load', 'A cross-partition operation forcing a non-parallel step'],
          investigation: ['Check SU%, backlog and watermark-delay metrics', 'Review whether the query PARTITIONs BY the input partition key', 'Identify non-parallel steps'],
          rootCause: 'The job is compute-bound and cannot scale because the query shuffles across partitions (not embarrassingly parallel) or is under-provisioned.',
          remediation: ['Rewrite the query partition-aligned (PARTITION BY matching input partitions)', 'Add SUs once the query is parallelizable', 'Avoid/isolate cross-partition operations'],
          validation: 'SU% drops with added SUs, backlog drains, and watermark delay returns to normal.',
          prevention: 'Design partition-aligned queries from the start and monitor SU%/backlog.',
        },
        {
          symptom: 'Aggregates are missing late events or windows look incomplete.',
          evidence: 'Events arriving slightly late are dropped; late-arrival/out-of-order tolerance is set very low; results differ from a batch recompute.',
          causes: ['Late-arrival tolerance too small for real data tardiness', 'Out-of-order tolerance too small', 'Wrong TIMESTAMP BY column (processing vs event time)'],
          investigation: ['Check the configured late/out-of-order tolerances vs actual data delay', 'Confirm TIMESTAMP BY uses the true event-time column', 'Compare against a batch recompute'],
          rootCause: 'Windows finalize before late events arrive because tolerance is too low (or event time is wrong), so those events are excluded.',
          remediation: ['Increase late-arrival / out-of-order tolerance to match real tardiness (accepting a bit more latency)', 'Use the correct event-time column in TIMESTAMP BY', 'Document the latency/completeness trade-off'],
          validation: 'Window results match the batch recompute within the chosen tolerance.',
          prevention: 'Set tolerances from measured data tardiness and always aggregate on true event time.',
        },
      ],
      certMapping: {
        lead: 'Stream Analytics is Azure’s serverless streaming-SQL engine; the Synapse-era DP-203 covered it, and it complements Fabric (DP-700) real-time scenarios.',
        items: [
          { label: 'DP-700 Fabric Data Engineer (real-time context)', certId: 'ms-dp700', objectives: ['Windowed streaming aggregation', 'Event-time & late-arrival handling', 'Serverless streaming vs code-first (Spark)'] },
          'Legacy lineage: DP-203 (retired 2025) covered Stream Analytics windows, event-time and outputs directly.',
        ],
      },
      interview: [
        { q: 'What window types does Stream Analytics support?', a: 'Tumbling (fixed non-overlapping), Hopping (fixed size, overlapping by a hop), Sliding (emits when events enter/leave the window), and Session (groups events separated by gaps). Tumbling is the default for periodic aggregations like "revenue per 5 minutes".' },
        { q: 'Stream Analytics vs Databricks Structured Streaming?', a: 'ASA is serverless, SQL-only, low-ops — great for standard windowed analytics and IoT with minimal code. Databricks Structured Streaming is code-first (Python/Scala), far more flexible (arbitrary transforms, ML, Delta sinks, complex state), and scales bigger, at the cost of running and tuning clusters. Choose ASA for simple SQL real-time; Databricks for rich or large pipelines.' },
        { q: 'How does ASA handle late-arriving events?', a: 'You set TIMESTAMP BY to use event time, plus late-arrival and out-of-order tolerance windows. ASA buffers up to that tolerance and reorders before finalizing a window, trading a bit of latency for correctness. Events beyond the tolerance are dropped or adjusted per policy.' },
      ],
    },

    /* ── ANALYTICS & WAREHOUSE ───────────────────────────── */
    {
      id: 'synapse-analytics', name: 'Azure Synapse Analytics', category: 'analytics',
      aka: 'formerly Azure SQL Data Warehouse (dedicated SQL pools)',
      tagline: 'An integrated analytics platform bringing together an MPP data warehouse (dedicated SQL pools), serverless SQL, Spark pools and pipelines under one Synapse Studio — Azure’s "warehouse + lake in one workspace" play.',
      keyFacts: [
        { k: 'DW engine', v: 'MPP (dedicated SQL pool)' },
        { k: 'Scale unit', v: 'DWU (Data Warehouse Units)' },
        { k: 'Distributions', v: '60 (hash/round-robin/replicate)' },
        { k: 'Also includes', v: 'Serverless SQL + Spark pools' },
      ],
      what: {
        lead: 'Synapse is an umbrella workspace. Its flagship is the dedicated SQL pool — a Massively Parallel Processing (MPP) warehouse that shards a table across 60 distributions and computes in parallel. It also bundles serverless SQL, Apache Spark pools and Synapse Pipelines (ADF engine).',
        bullets: [
          { h: 'MPP architecture', d: 'A control node plans the query and farms work to compute nodes; data is spread across 60 distributions so scans and joins run in parallel.' },
          { h: 'Distribution strategy', d: 'Tables are Hash-distributed (large facts, on a join key), Round-robin (staging), or Replicated (small dimensions copied to every node).' },
          { h: 'DWU scaling', d: 'Compute is provisioned in DWUs and can pause when idle to stop compute billing while storage persists.' },
        ],
      },
      why: {
        lead: 'Terabyte-to-petabyte SQL analytics need parallelism no single-box database can give. MPP splits the data and the work; getting the distribution key right is what makes joins avoid expensive data movement.',
        bullets: [
          { h: 'Parallel at scale', d: 'A star-schema join across billions of rows runs across 60 distributions at once instead of one engine.' },
          { h: 'Minimize data movement', d: 'Co-locating fact and dimension on the same hash key means the join happens locally per node — the core MPP tuning lever.' },
          { h: 'One workspace', d: 'Warehouse, lake queries, Spark and orchestration share security and Studio — less integration glue.' },
        ],
      },
      how: {
        lead: 'The control node compiles a distributed query plan; where a join needs matching rows on the same node, the engine performs data movement (shuffle/broadcast). Good distribution + partitioning + columnstore indexes minimize that movement.',
        bullets: [
          { h: 'Clustered columnstore', d: 'Fact tables use columnstore for compression and segment elimination; keep enough rows per partition to fill rowgroups.' },
          { h: 'Replicated dimensions', d: 'Small dims replicated to every distribution eliminate broadcast movement on joins.' },
          { h: 'Result-set caching + statistics', d: 'Up-to-date statistics let the optimizer choose movement-minimizing plans; caching serves repeat queries instantly.' },
        ],
        code: {
          lang: 'T-SQL (dedicated pool)',
          text: "CREATE TABLE fact_orders (\n  order_id BIGINT, customer_id BIGINT, amount DECIMAL(12,2), order_date DATE\n)\nWITH (\n  DISTRIBUTION = HASH(customer_id),   -- co-locate with dim_customer\n  CLUSTERED COLUMNSTORE INDEX,\n  PARTITION (order_date RANGE RIGHT FOR VALUES ('2026-01-01'))\n);",
        },
      },
      deUseCase: {
        lead: 'Synapse dedicated pools serve the Gold/serving layer: curated star schemas that BI tools query at scale. Synapse Pipelines land and shape data; Spark pools or Databricks build Silver; the SQL pool serves it.',
        bullets: [
          { h: 'Enterprise DW', d: 'Star schema of fact_orders + dimensions, hash-distributed for fast joins, powering Power BI at concurrency.' },
          { h: 'Lake + warehouse', d: 'Serverless SQL queries Parquet in ADLS directly; dedicated pool holds the curated marts.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'external tables / PolyBase' },
        { id: 'data-factory', label: 'Data Factory / Pipelines', note: 'load & orchestrate' },
        { id: 'synapse-serverless', label: 'Serverless SQL', note: 'same workspace' },
        { label: 'Power BI', note: 'BI serving layer' },
      ],
      runtime: {
        lead: 'The dominant runtime cost is data movement between distributions during joins and aggregations. A well-chosen hash key (matching join keys, high cardinality, even distribution) keeps joins local; a bad key causes skew and shuffles that dominate query time.',
        bullets: [
          { h: 'Data skew', d: 'A low-cardinality or lumpy hash key overloads a few distributions — the classic MPP performance bug.' },
          { h: 'Concurrency slots', d: 'DWU level sets memory and concurrency; resource classes govern how much memory each query gets.' },
          { h: 'Pause to save cost', d: 'Pausing a dedicated pool stops compute billing entirely while storage remains.' },
        ],
      },
      architecture: {
        lead: 'A Synapse dedicated SQL pool is an MPP warehouse: a control node parses and plans queries and distributes work; compute nodes execute over 60 data distributions. Table distribution + clustered columnstore + statistics decide how much data movement a join needs — the central performance model. (Synapse also bundles serverless SQL, Spark pools and Pipelines in one workspace.)',
        bullets: [
          { h: 'Control + 60 distributions', d: 'Every table is sharded across 60 distributions; the control node compiles a distributed plan and compute nodes run it in parallel across those shards.' },
          { h: 'Distribution styles', d: 'HASH (large facts on the join key — co-locate to avoid movement), ROUND_ROBIN (staging, even spread, no key), REPLICATE (small dimensions copied to every node to avoid broadcast).' },
          { h: 'Clustered columnstore', d: 'Fact tables use columnstore for compression + segment elimination; you need enough rows per partition per distribution (~1M+) to fill rowgroups, so over-partitioning hurts.' },
          { h: 'DWU scaling + pause', d: 'Compute is provisioned in DWUs (memory/concurrency) and can be paused to stop compute billing while storage persists.' },
        ],
      },
      security: {
        lead: 'Synapse security spans Entra ID/SQL authentication, in-database authorization (roles, column/row-level security, dynamic data masking), encryption (TDE), and network isolation (managed VNet, private endpoints). PolyBase/COPY use managed identity to reach ADLS.',
        bullets: [
          { h: 'Auth + authorization', d: 'Entra ID (preferred) or SQL logins authenticate; database roles and GRANTs authorize; column-level security, row-level security and dynamic data masking restrict sensitive data.' },
          { h: 'Encryption', d: 'Transparent Data Encryption protects data at rest; connections use TLS.' },
          { h: 'Network isolation', d: 'A managed VNet with private endpoints keeps the workspace off the public internet; firewall rules gate access.' },
          { h: 'Lake access via identity', d: 'COPY INTO / PolyBase / external tables reach ADLS using the workspace managed identity rather than embedded keys.' },
        ],
      },
      operations: {
        lead: 'Operating a dedicated pool is distribution/statistics tuning, workload management, pause/resume for cost, and columnstore health — monitored through DMVs.',
        bullets: [
          { h: 'Workload management', d: 'Resource classes / workload groups set the memory and concurrency each query gets; workload isolation reserves capacity for critical workloads (e.g. loads vs BI).' },
          { h: 'Statistics', d: 'Up-to-date statistics are essential for the optimizer to minimize data movement; create/update them on join and filter columns.' },
          { h: 'Pause/resume + scale', d: 'Pause to stop compute billing when idle; scale DWUs up for loads/peak and down after — storage persists across both.' },
          { h: 'Monitoring', d: 'DMVs (sys.dm_pdw_*) expose data-movement steps, skew, and rowgroup quality; restore points provide recovery.' },
        ],
      },
      cost: {
        lead: 'A dedicated pool bills DWU-hours while running (pausing stops compute billing entirely) plus storage; serverless SQL in the same workspace bills per TB scanned. The levers are pause/resume, right DWU sizing, and minimizing data movement/scan. (Rates vary — price against the official Synapse pricing page.)',
        bullets: [
          { h: 'Pause when idle', d: 'Compute billing stops on pause while storage remains — the biggest saving for non-24x7 warehouses.' },
          { h: 'Right DWU sizing', d: 'Scale up for heavy loads/peak BI and down afterward; DWU sets both performance and cost.' },
          { h: 'Movement = cost', d: 'Good distribution/statistics cut data movement and runtime; serverless charges per TB scanned, so partition/columnar the lake data it reads.' },
        ],
      },
      walkthrough: {
        lead: 'How a star-schema join executes across the MPP pool.',
        steps: [
          { h: 'Control node plans', d: 'The control node parses the SQL and, using statistics, builds a distributed plan — deciding where data movement is needed.' },
          { h: 'Distribute to compute nodes', d: 'The plan runs across the 60 distributions; each compute node works on its shards of the fact and dimensions.' },
          { h: 'Join locally or move data', d: 'If the fact is HASH-distributed on the join key and the dimension is REPLICATE (or same hash), the join is local; otherwise the engine shuffles/broadcasts rows (data movement) — the main cost.' },
          { h: 'Columnstore scan', d: 'Columnstore segment elimination skips rowgroups outside the filter (effective only if rowgroups are well-filled).' },
          { h: 'Aggregate & return', d: 'Partial aggregates compute per distribution, the control node merges them, and result-set caching may serve repeats instantly.' },
        ],
        note: 'Simplified MPP execution; EXPLAIN / sys.dm_pdw_* show the actual data-movement operations.',
      },
      examples: [{
        title: 'Load a hash-distributed star schema and tune away data movement',
        requirement: 'Build a Gold star schema in a dedicated pool that serves BI fast by keeping fact/dimension joins local and columnstore healthy.',
        input: 'Curated Parquet for a fact and dimensions in ADLS.',
        architecture: 'ADLS → COPY INTO → fact (HASH on join key, clustered columnstore, range-partitioned) + small dims (REPLICATE) → statistics → Power BI.',
        code: {
          lang: 'sql (dedicated pool, illustrative)',
          text: "CREATE TABLE fact_orders (order_id BIGINT, customer_id BIGINT, amount DECIMAL(12,2), order_date DATE)\nWITH (DISTRIBUTION = HASH(customer_id), CLUSTERED COLUMNSTORE INDEX,\n      PARTITION (order_date RANGE RIGHT FOR VALUES ('2025-01-01','2026-01-01')));\nCREATE TABLE dim_customer (customer_id BIGINT, segment VARCHAR(20))\nWITH (DISTRIBUTION = REPLICATE, CLUSTERED COLUMNSTORE INDEX);\n\nCOPY INTO fact_orders FROM 'https://acct.dfs.core.windows.net/gold/orders/'\n  WITH (FILE_TYPE='PARQUET');\nCREATE STATISTICS st_cust ON fact_orders(customer_id);",
        },
        steps: [
          'HASH-distribute the fact on the dominant join key; REPLICATE small dims.',
          'Use clustered columnstore and avoid over-partitioning (keep ~1M+ rows/partition/distribution).',
          'COPY INTO to bulk-load from ADLS.',
          'Create/update statistics on join and filter columns.',
        ],
        output: 'A star schema whose fact/dimension joins run locally with minimal data movement and healthy columnstore rowgroups.',
        validation: 'Check sys.dm_pdw_* for data-movement (SHUFFLE/BROADCAST) on the hot join and for distribution skew; confirm rowgroups are well-filled.',
        errorHandling: 'If the plan shows shuffles, revisit the hash key; if rowgroups are tiny, reduce partition granularity; load under a resource class with enough memory.',
        production: 'Use workload isolation to protect loads vs BI; pause the pool when idle; keep statistics fresh after big loads.',
        cleanup: 'DROP tables; delete restore points; pause or delete the pool to stop compute charges.',
      }],
      troubleshooting: [
        {
          symptom: 'A star-schema join is slow and worsens with scale, dominated by data movement.',
          evidence: 'sys.dm_pdw_* / the plan shows SHUFFLE_MOVE or BROADCAST_MOVE on the join; a few distributions hold most rows (skew).',
          causes: ['Fact not HASH-distributed on the join key (or wrong key) forcing shuffles', 'Large dimension not REPLICATE, causing broadcast', 'Low-cardinality/lumpy hash key causing skew'],
          investigation: ['Inspect the plan / DMVs for data-movement operations', 'Check per-distribution row counts for skew', 'Review distribution choices vs the dominant join'],
          rootCause: 'Joining rows are not co-located across distributions, so the engine moves data each query — or skew overloads a few distributions.',
          remediation: ['HASH-distribute the fact (and large joined table) on the join key', 'REPLICATE small dimensions to remove broadcast', 'Pick a high-cardinality, evenly-distributed hash key to avoid skew'],
          validation: 'The plan shows local joins with no shuffle/broadcast on the hot path; distributions even out; query time drops and scales.',
          prevention: 'Design distribution around the dominant join; keep statistics current; monitor skew.',
        },
        {
          symptom: 'Columnstore fact queries scan more than expected and compression is poor.',
          evidence: 'Rowgroup DMVs show many small/open rowgroups; the fact is heavily partitioned so each partition×distribution holds too few rows.',
          causes: ['Over-partitioning starving rowgroups (fewer than ~1M rows per partition per distribution)', 'Trickle loads creating small rowgroups', 'Missing columnstore maintenance'],
          investigation: ['Check rowgroup quality DMVs (sizes/open rowgroups)', 'Compute rows per partition per distribution', 'Review load pattern (batch vs trickle)'],
          rootCause: 'Columnstore needs well-filled rowgroups for segment elimination and compression; over-partitioning/trickle loads leave them under-filled.',
          remediation: ['Reduce partition granularity so each partition×distribution has ~1M+ rows', 'Load in larger batches; rebuild the columnstore index to compact rowgroups', 'Avoid tiny trickle inserts into the fact'],
          validation: 'Rowgroups fill up, compression improves, and scans skip more via segment elimination.',
          prevention: 'Size partitioning to the 60-distribution math and load in batches; maintain columnstore after heavy DML.',
        },
      ],
      certMapping: {
        lead: 'Synapse (dedicated SQL pool) was core to the retired DP-203; it remains widely used in enterprises and common in interviews, though Microsoft’s current data-engineering credential (DP-700) is Fabric-focused.',
        items: [
          'DP-203 (Azure Data Engineer Associate, Synapse-era) — retired 2025; covered dedicated-pool distribution, columnstore, loading and serverless SQL directly.',
          'Interview-relevant: MPP distribution/data-movement tuning is a frequent senior warehouse-design topic regardless of exam.',
        ],
      },
      interview: [
        { q: 'Explain distribution in a Synapse dedicated SQL pool.', a: 'Data is spread across 60 distributions. Hash distribution assigns rows by a column’s hash — use it for large fact tables on their join key so joins stay local. Round-robin spreads evenly with no key — good for staging. Replicated copies a small table to every node — good for dimensions. Matching fact and dimension on the same hash key avoids data movement, which is the main MPP tuning goal.' },
        { q: 'What causes slow queries in Synapse and how do you fix them?', a: 'Usually excessive data movement (shuffles/broadcasts) from a poor distribution key, or data skew from a lumpy hash key. Fixes: distribute facts on the join key, replicate small dimensions, keep statistics updated, use clustered columnstore with enough rows per partition, and avoid over-partitioning (which starves rowgroups).' },
        { q: 'Synapse dedicated pool vs serverless SQL pool?', a: 'Dedicated pool is provisioned MPP compute (DWUs) for a persistent, tuned warehouse — you pay for the pool and pause it when idle. Serverless SQL is on-demand, pay-per-TB-scanned querying of files in the lake with no infrastructure — great for ad-hoc lake queries and no curated storage. Same T-SQL surface, different cost/perf model.' },
        { q: 'How does Synapse relate to Databricks?', a: 'Overlapping but different centers of gravity. Synapse leads with a T-SQL MPP warehouse plus bundled Spark/serverless/pipelines. Databricks leads with best-in-class Spark + Delta Lakehouse and Unity Catalog. Many shops use Databricks for engineering/ML on the lake and Synapse (or Databricks SQL) as the SQL serving layer.' },
      ],
    },

    {
      id: 'synapse-serverless', name: 'Synapse Serverless SQL Pool', category: 'analytics',
      aka: 'SQL-on-demand — query the lake in place',
      tagline: 'A serverless, pay-per-query T-SQL engine that reads Parquet/CSV/JSON and Delta directly from ADLS with no data loading and no infrastructure — the "just SQL my lake files" tool, billed per TB scanned.',
      keyFacts: [
        { k: 'Model', v: 'Serverless, on-demand' },
        { k: 'Billing', v: 'Per TB of data processed' },
        { k: 'Reads', v: 'Parquet, CSV, JSON, Delta' },
        { k: 'State', v: 'No storage — query in place' },
      ],
      what: {
        lead: 'The serverless SQL pool is always available and provisioned per query. You point OPENROWSET or an external table at files in ADLS and run T-SQL; there is nothing to size, start or pause.',
        bullets: [
          { h: 'OPENROWSET / external tables', d: 'Read files ad-hoc with OPENROWSET, or define external tables + views for a stable schema over lake paths.' },
          { h: 'Schema-on-read', d: 'Structure is applied at query time; no ingestion step, so new files are queryable immediately.' },
          { h: 'Logical views', d: 'Wrap partitioned Parquet folders in views that expose a clean table to BI without moving data.' },
        ],
      },
      why: {
        lead: 'Loading data into a warehouse just to explore it is wasteful. Serverless SQL lets analysts query raw and curated lake files with familiar T-SQL and pay only for bytes scanned.',
        bullets: [
          { h: 'No infra, no idle cost', d: 'You never pay for a running pool — only per query, per TB scanned.' },
          { h: 'Fast lake exploration', d: 'Profile a new dataset the moment it lands in Bronze, no pipeline required.' },
        ],
      },
      how: {
        lead: 'The engine parses the query, prunes files using folder partitioning and Parquet column/row-group statistics, scans only needed columns, and streams results. Cost and speed both depend on scanning less.',
        bullets: [
          { h: 'Partition pruning', d: 'filepath()/filename() functions and folder structure (e.g. /year=2026/month=09) let the engine skip irrelevant files.' },
          { h: 'Columnar pushdown', d: 'Parquet lets it read only referenced columns and skip row groups via min/max stats — fewer TB scanned, lower bill.' },
        ],
        code: {
          lang: 'T-SQL (serverless)',
          text: "SELECT category, SUM(amount) AS revenue\nFROM OPENROWSET(\n  BULK 'https://shopkart.dfs.core.windows.net/silver/orders/**',\n  FORMAT = 'PARQUET'\n) AS rows\nWHERE rows.filepath(1) = '2026'   -- partition prune by folder\nGROUP BY category;",
        },
      },
      deUseCase: {
        lead: 'It is the ad-hoc and logical-serving layer over the lake: data profiling on Bronze, a SQL view layer over Silver/Gold Parquet for BI, and one-off exploration without touching a dedicated pool.',
        bullets: [
          { h: 'Logical data warehouse', d: 'Views over curated Parquet/Delta give BI a SQL surface with no ETL into a warehouse.' },
          { h: 'Data validation', d: 'Quick counts/quality checks on freshly landed files inside a pipeline.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'the data it queries' },
        { id: 'synapse-analytics', label: 'Synapse workspace', note: 'same Studio' },
        { label: 'Power BI', note: 'DirectQuery over views' },
      ],
      runtime: {
        lead: 'There is no cluster to tune — performance and cost are governed almost entirely by how much data each query scans. Partitioned folders, Parquet/Delta (not CSV), and selecting only needed columns are the levers.',
        bullets: [
          { h: 'Bill = bytes scanned', d: 'CSV forces full-row scans; Parquet/Delta enable pruning — the same query can cost 10× less on Parquet.' },
          { h: 'No caching of results', d: 'Each run re-scans; materialize hot results as a CETAS table if repeated.' },
        ],
      },
      interview: [
        { q: 'How is serverless SQL billed and how do you keep cost down?', a: 'Per terabyte of data processed by each query. Cut cost by scanning less: store data as Parquet/Delta (not CSV) for columnar pruning, partition folders so the engine can skip files, and select only the columns you need. A query touching one partition and three columns scans a fraction of the data.' },
        { q: 'When would you use serverless vs a dedicated SQL pool?', a: 'Serverless for ad-hoc exploration, data profiling, and a logical view layer over lake files with no infra and pay-per-query. Dedicated pool for a persistent, tuned, high-concurrency warehouse serving curated marts to many BI users, where predictable performance justifies provisioned MPP compute.' },
      ],
    },

    /* ── DATABASES ───────────────────────────────────────── */
    {
      id: 'azure-sql', name: 'Azure SQL Database', category: 'databases',
      aka: 'Managed (PaaS) SQL Server engine',
      tagline: 'A fully-managed relational database built on the SQL Server engine — the OLTP workhorse behind apps and a very common source for data pipelines, with automated HA, backups and patching.',
      keyFacts: [
        { k: 'Engine', v: 'SQL Server (PaaS)' },
        { k: 'Purchasing', v: 'vCore / DTU' },
        { k: 'HA', v: 'Built-in, 99.99% SLA' },
        { k: 'DE role', v: 'OLTP source / CDC' },
      ],
      what: {
        lead: 'Azure SQL Database is SQL Server delivered as a managed service: you get the T-SQL engine without managing the OS, patching or backups. It targets transactional (OLTP) app workloads.',
        bullets: [
          { h: 'Deployment options', d: 'Single database, Elastic Pool (shared resources across many DBs), or Managed Instance (near-100% SQL Server surface for lift-and-shift).' },
          { h: 'Purchasing models', d: 'vCore (choose cores/memory, Hyperscale for huge DBs) or DTU (bundled blended unit).' },
          { h: 'Serverless tier', d: 'Auto-pause/scale compute for spiky or dev workloads, billed per second of use.' },
        ],
      },
      why: {
        lead: 'Apps need a reliable transactional store; teams want the SQL Server engine without running it. For data engineers it is one of the most common upstream sources — and the place change data capture originates.',
        bullets: [
          { h: 'Managed HA & DR', d: 'Automatic backups, point-in-time restore, active geo-replication and a 99.99% SLA with no infra work.' },
          { h: 'Familiar & rich', d: 'Full T-SQL, stored procedures, and tooling that teams already know.' },
        ],
      },
      how: {
        lead: 'Behind the scenes it runs the SQL Server engine on Azure infrastructure with automated replicas for HA. Data engineers connect via ADF or Spark JDBC to extract, often incrementally via a watermark or CDC/Change Tracking.',
        bullets: [
          { h: 'Change Data Capture / Change Tracking', d: 'Surfaces inserts/updates/deletes so pipelines pull only what changed instead of full reloads.' },
          { h: 'Hyperscale', d: 'A storage architecture that decouples compute from a distributed page store, scaling to 100 TB with fast backups/restores.' },
        ],
      },
      deUseCase: {
        lead: 'In pipelines Azure SQL is typically the OLTP source: ADF or Databricks extracts incrementally into ADLS Bronze, or CDC feeds a near-real-time stream. It can also serve small curated marts.',
        bullets: [
          { h: 'CDC ingestion', d: 'Enable CDC; ADF/Databricks reads change tables and merges into a Delta Silver table.' },
          { h: 'Watermark extract', d: 'Nightly copy of rows where modified_date > last watermark into the lake.' },
        ],
      },
      integrations: [
        { id: 'data-factory', label: 'Data Factory', note: 'primary extract path' },
        { id: 'key-vault', label: 'Key Vault', note: 'connection secrets' },
        { id: 'stream-analytics', label: 'Stream Analytics', note: 'output sink' },
        { label: 'Databricks (JDBC)', note: 'read/write via spark.read.jdbc' },
      ],
      runtime: {
        lead: 'Tuned for many small transactional reads/writes with row-store indexes, not big analytical scans. Pulling huge volumes for analytics can pressure the OLTP workload — hence extracting to the lake for heavy processing.',
        bullets: [
          { h: 'OLTP, not OLAP', d: 'B-tree indexes and row storage favor point lookups; large aggregations belong in the lake/warehouse.' },
          { h: 'Read replicas', d: 'Offload reporting/extract reads to a geo/read replica to protect the primary’s transactional latency.' },
        ],
      },
      architecture: {
        lead: 'Azure SQL Database is the SQL Server engine delivered as PaaS, with automated HA replicas. For data engineering it is usually an OLTP source: a row-store transactional database you extract from incrementally (CDC/Change Tracking/watermark) rather than scan for analytics.',
        bullets: [
          { h: 'Deployment options', d: 'Single database, Elastic Pool (share resources across many DBs), or Managed Instance (near-full SQL Server surface for lift-and-shift).' },
          { h: 'Purchasing & tiers', d: 'vCore (incl. Hyperscale for up to ~100 TB with fast backup/restore) or DTU; a serverless tier auto-pauses/scales compute for spiky/dev workloads.' },
          { h: 'Built-in HA', d: 'Automatic replicas give a 99.99%+ SLA (zone-redundant higher); automated backups + point-in-time restore, active geo-replication and failover groups for DR.' },
          { h: 'Change feeds for DE', d: 'CDC and Change Tracking surface row-level changes so pipelines pull deltas, not full reloads.' },
        ],
      },
      security: {
        lead: 'Azure SQL layers Entra/SQL auth, network isolation, encryption (TDE/Always Encrypted), and fine-grained controls (RLS, dynamic data masking).',
        bullets: [
          { h: 'Auth', d: 'Microsoft Entra authentication (preferred, incl. managed identities for pipelines) or SQL logins; least-privilege database roles.' },
          { h: 'Network', d: 'Firewall rules + private endpoints keep access private; restrict public access.' },
          { h: 'Encryption', d: 'TDE encrypts at rest by default; Always Encrypted protects sensitive columns even from DBAs; TLS in transit.' },
          { h: 'Fine-grained', d: 'Row-level security and dynamic data masking restrict what each principal sees.' },
        ],
      },
      operations: {
        lead: 'For DE, operating Azure SQL as a source is protecting the OLTP primary during extracts, managing CDC retention, and right-sizing compute.',
        bullets: [
          { h: 'Protect the primary', d: 'Offload reporting/extract reads to a read replica (or geo-replica) so analytics pulls do not hurt transactional latency.' },
          { h: 'CDC/Change Tracking', d: 'Enable and monitor change-tracking retention so a delayed pipeline does not miss changes that aged out.' },
          { h: 'Scale & serverless', d: 'Scale vCores for load; serverless auto-pauses idle dev DBs; Hyperscale for very large DBs with fast restore.' },
          { h: 'Backups/DR', d: 'PITR + geo-replication/failover groups; test restores.' },
        ],
      },
      cost: {
        lead: 'Azure SQL bills by purchasing model: vCore (compute + storage, or serverless per-second) or DTU (bundled). The DE-relevant levers are serverless for spiky/dev, read replicas to offload extracts, and not over-provisioning the primary for analytics. (Rates vary — price against the official Azure SQL pricing page.)',
        bullets: [
          { h: 'vCore vs DTU vs serverless', d: 'vCore gives control (and Hyperscale); serverless auto-pauses idle; DTU is a simple bundle — match to workload shape.' },
          { h: 'Replicas', d: 'A read replica adds cost but protects the primary’s performance (and SLA) during heavy extracts.' },
          { h: 'Right-size', d: 'Don’t size the OLTP primary for analytical scans — extract to the lake instead.' },
        ],
      },
      walkthrough: {
        lead: 'How a CDC-based incremental extract from Azure SQL into the lake works.',
        steps: [
          { h: 'Enable change capture', d: 'Turn on CDC (or Change Tracking) on the source tables so inserts/updates/deletes are recorded with a change version.' },
          { h: 'Read the delta', d: 'ADF/Databricks reads the change tables since the last captured version (ideally from a read replica to spare the primary).' },
          { h: 'Land to Bronze', d: 'The changed rows (with operation type) are written to ADLS Bronze / a staging area.' },
          { h: 'MERGE to Silver', d: 'A Spark/SQL MERGE applies the changes idempotently into a Silver Delta table keyed on the PK.' },
          { h: 'Advance the marker', d: 'The pipeline records the last processed change version so the next run resumes incrementally.' },
        ],
        note: 'Simplified; exact mechanics depend on CDC vs Change Tracking vs watermark.',
      },
      examples: [{
        title: 'CDC from Azure SQL into a Silver Delta table via a read replica',
        requirement: 'Keep a Silver table current from an OLTP Azure SQL source without reloading or hurting the production database.',
        input: 'An OLTP table with CDC enabled; a read replica for extraction.',
        architecture: 'Azure SQL (CDC) → read replica → ADF/Databricks reads change tables → ADLS Bronze → MERGE → Silver Delta.',
        code: {
          lang: 'sql / pyspark (illustrative)',
          text: "-- enable CDC on the source\nEXEC sys.sp_cdc_enable_table @source_schema='dbo', @source_name='orders', @role_name=NULL;\n\n# pipeline reads cdc.dbo_orders_CT since last LSN (from the replica),\n# writes to Bronze, then MERGEs into silver.orders by order_id applying __$operation",
        },
        steps: [
          'Enable CDC on the source table(s).',
          'Point the extract at a read replica to protect the primary.',
          'Read changes since the last version into Bronze.',
          'MERGE into the Silver Delta table idempotently; advance the marker.',
        ],
        output: 'A continuously-current Silver table with minimal load on the OLTP primary and no full reloads.',
        validation: 'Counts reconcile with source changes; a re-run with no new changes merges 0 rows; the primary’s latency is unaffected.',
        errorHandling: 'Monitor CDC retention so a delayed pipeline does not miss aged-out changes; idempotent MERGE makes retries safe.',
        production: 'Extract from a replica; Entra/managed-identity auth; secrets in Key Vault; alarm on extract lag and CDC retention.',
        cleanup: 'Disable CDC and drop the pipeline/Silver table if decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'Analytics extracts slow down the production app — OLTP latency spikes during the nightly pull.',
          evidence: 'The primary’s CPU/IO spikes during the extract window; large table scans run against the primary.',
          causes: ['Heavy analytical reads hitting the OLTP primary', 'Full-table extracts instead of incremental', 'No read replica to offload to'],
          investigation: ['Correlate primary latency with the extract window', 'Check whether extracts are full vs incremental', 'See whether a read replica exists'],
          rootCause: 'An OLTP database is being used for analytical-scale reads, contending with transactional traffic.',
          remediation: ['Extract from a read/geo replica, not the primary', 'Switch to incremental (CDC/Change Tracking/watermark) extraction', 'Move heavy processing to the lake/warehouse'],
          validation: 'Primary latency stays flat during extracts; the pull reads only deltas.',
          prevention: 'Default to replica + incremental extraction for OLTP sources.',
        },
        {
          symptom: 'The incremental pipeline misses some changes or reprocesses rows.',
          evidence: 'Silver drifts from source; CDC changes aged out before the pipeline ran, or the watermark/version marker advanced incorrectly.',
          causes: ['CDC/Change Tracking retention shorter than the pipeline gap', 'Marker advanced before a successful load', 'Watermark bounded only on one side'],
          investigation: ['Check CDC retention vs pipeline frequency/outages', 'Confirm the marker advances only on success', 'Review watermark bounds'],
          rootCause: 'The change window or marker handling does not guarantee exactly-capturing the delta, so changes are skipped or duplicated.',
          remediation: ['Increase CDC/Change Tracking retention beyond the max pipeline gap', 'Advance the marker only after a confirmed load; bound watermarks on both ends', 'Make the MERGE idempotent'],
          validation: 'Backfilling a gap reconciles Silver exactly to source with no loss/dups.',
          prevention: 'Size change retention to outages and gate marker advancement on success.',
        },
      ],
      certMapping: {
        lead: 'Azure SQL is the common OLTP source in Azure data-engineering scenarios; DP-203 covered extracting from it, and it feeds Fabric (DP-700) ingestion/mirroring.',
        items: [
          { label: 'DP-700 Fabric Data Engineer (ingestion context)', certId: 'ms-dp700', objectives: ['Ingest from relational sources (CDC/mirroring)', 'Incremental extraction patterns', 'Protecting the source & secure connections'] },
          'Legacy lineage: DP-203 (retired 2025) covered incremental extraction, CDC and watermarks from Azure SQL.',
        ],
      },
      interview: [
        { q: 'How do you ingest from Azure SQL into a lake incrementally?', a: 'Prefer change-based extraction: enable CDC or Change Tracking to pull only inserted/updated/deleted rows, or use a watermark column (max modified_date/id) tracked per table. ADF or Databricks reads the delta and MERGEs it into a Delta Silver table, avoiding costly full reloads and reducing load on the OLTP primary.' },
        { q: 'Azure SQL Database vs Managed Instance vs Synapse?', a: 'Azure SQL Database is PaaS SQL Server for OLTP apps. Managed Instance gives near-full SQL Server surface (SQL Agent, cross-DB queries) for lift-and-shift. Synapse dedicated pool is an MPP analytical warehouse for OLAP. Rule of thumb: transactions → SQL Database/MI; large analytical scans → Synapse/Databricks.' },
      ],
    },

    {
      id: 'cosmos-db', name: 'Azure Cosmos DB', category: 'databases',
      aka: 'Globally-distributed, multi-model NoSQL',
      tagline: 'A turnkey globally-distributed NoSQL database with single-digit-millisecond latency, elastic partitioned scale, tunable consistency, and a Change Feed that makes it a natural streaming source for pipelines.',
      keyFacts: [
        { k: 'Model', v: 'NoSQL (multi-API)' },
        { k: 'Scale', v: 'Partition key + RU/s' },
        { k: 'Consistency', v: '5 levels (strong → eventual)' },
        { k: 'DE hook', v: 'Change Feed' },
      ],
      what: {
        lead: 'Cosmos DB is a managed NoSQL service that partitions data horizontally and can replicate it across regions. It offers multiple APIs (NoSQL/Core, MongoDB, Cassandra, Gremlin, Table) over one engine.',
        bullets: [
          { h: 'Partition key', d: 'Every container has a partition key that shards documents into logical partitions — choosing it well is the whole game for scale and cost.' },
          { h: 'Request Units (RU/s)', d: 'Throughput is provisioned/auto-scaled in RUs; every read/write costs RUs by size and complexity.' },
          { h: 'Five consistency levels', d: 'Strong, Bounded Staleness, Session, Consistent Prefix, Eventual — tune latency/availability vs freshness.' },
        ],
      },
      why: {
        lead: 'Global apps need low-latency reads/writes everywhere with elastic scale that relational DBs struggle to give. Cosmos delivers turnkey global distribution and predictable latency SLAs.',
        bullets: [
          { h: 'Global, low latency', d: 'Multi-region writes and <10ms reads/writes at the 99th percentile under SLA.' },
          { h: 'Elastic partitioned scale', d: 'Add RUs and partitions transparently as traffic grows.' },
          { h: 'Change Feed', d: 'An ordered, persistent log of changes per partition — a built-in event source for pipelines.' },
        ],
      },
      how: {
        lead: 'Documents route to a logical partition by partition key; logical partitions map to physical partitions the service scales automatically. Reads/writes debit RUs; hot or unbalanced keys cause throttling (429) and skew.',
        bullets: [
          { h: 'Avoid hot partitions', d: 'A high-cardinality, evenly-accessed partition key spreads load; a lumpy key overloads one physical partition.' },
          { h: 'Change Feed consumers', d: 'Azure Functions or Spark read the Change Feed to propagate changes downstream in near real time.' },
        ],
      },
      deUseCase: {
        lead: 'For data engineers Cosmos is both a source and a serving store: the Change Feed streams operational changes into the lake, and the Analytical Store (Synapse Link) enables HTAP analytics without touching the transactional side.',
        bullets: [
          { h: 'Change Feed → lake', d: 'A Function/Spark job tails the Change Feed and lands changes in Bronze for near-real-time analytics.' },
          { h: 'Azure Synapse Link', d: 'A no-ETL analytical column store over Cosmos data queried directly from Synapse — HTAP without ETL.' },
        ],
      },
      integrations: [
        { id: 'synapse-analytics', label: 'Synapse Link', note: 'HTAP analytical store' },
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'Change Feed landing' },
        { label: 'Azure Functions', note: 'Change Feed processor' },
      ],
      runtime: {
        lead: 'Everything is governed by RUs and the partition key. Under-provisioned RUs or a hot partition cause 429 throttling; cross-partition queries fan out and cost more RUs than a single-partition lookup.',
        bullets: [
          { h: '429 = throttled', d: 'Exceeding provisioned RU/s returns 429; SDKs retry with backoff, or you scale RUs / fix the key.' },
          { h: 'Single-partition reads are cheapest', d: 'Include the partition key in queries to hit one partition; cross-partition fan-out multiplies RU cost.' },
        ],
      },
      architecture: {
        lead: 'Cosmos DB is a globally-distributed, partitioned NoSQL engine. Documents route by partition key to logical partitions, which the service maps onto physical partitions it scales automatically. Throughput is Request Units; replication + a chosen consistency level govern freshness; the Change Feed is a persistent per-partition change log.',
        bullets: [
          { h: 'Partitions', d: 'Partition key → logical partition (max 20 GB) → physical partition. The key decides data and load distribution; it cannot be changed after creation, so it is the critical design choice.' },
          { h: 'RU/s throughput', d: 'Provisioned (manual), autoscale (to a max), or serverless; every read/write costs RUs by size/indexing/complexity. Exceeding RU/s returns 429.' },
          { h: 'Five consistency levels', d: 'Strong → Bounded Staleness → Session → Consistent Prefix → Eventual trade latency/availability vs freshness; multi-region writes add conflict resolution.' },
          { h: 'Change Feed + APIs', d: 'The Change Feed (latest-version, or all-versions-and-deletes) is a built-in event source; one engine exposes NoSQL/Mongo/Cassandra/Gremlin/Table APIs. TTL and tunable indexing policy control storage/RU cost.' },
        ],
      },
      security: {
        lead: 'Cosmos DB security is data-plane auth (Entra RBAC or keys), network isolation, and encryption; access is at the account/database/container level.',
        bullets: [
          { h: 'Auth', d: 'Prefer Microsoft Entra RBAC data-plane roles (and managed identities for pipelines) over primary/read-only keys; rotate keys if used.' },
          { h: 'Network', d: 'Private endpoints + IP firewall restrict access; disable public access where possible.' },
          { h: 'Encryption', d: 'Encrypted at rest (customer-managed keys available) and TLS in transit.' },
          { h: 'Scoping', d: 'Grant least-privilege at account/db/container; the Change-Feed consumer identity needs only read.' },
        ],
      },
      operations: {
        lead: 'Operating Cosmos is RU provisioning, partition-key health, indexing/TTL tuning, and multi-region conflict handling.',
        bullets: [
          { h: 'RU mode', d: 'Autoscale for variable load (10x range), manual for steady, serverless for spiky/dev; watch normalized RU consumption and 429 rate.' },
          { h: 'Hot partitions', d: 'Monitor per-partition RU/storage for skew; a hot partition throttles regardless of total RU/s — fix with a better key.' },
          { h: 'Indexing & TTL', d: 'Tune the indexing policy (exclude unqueried paths) to cut RU/storage; use TTL to expire old documents.' },
          { h: 'Multi-region', d: 'With multi-region writes, pick/implement a conflict-resolution policy; add read regions for low-latency global reads.' },
        ],
      },
      cost: {
        lead: 'Cosmos bills RU/s (provisioned/autoscale) or per-operation (serverless) plus storage, multiplied by regions for multi-region. The levers are partition-key/query efficiency (RUs per op), indexing policy, autoscale/serverless fit, and region count. (Rates vary — price against the official Cosmos pricing page.)',
        bullets: [
          { h: 'RU efficiency', d: 'Single-partition reads and lean queries cost far fewer RUs than cross-partition fan-out; indexing only queried paths cuts write RUs.' },
          { h: 'Autoscale/serverless', d: 'Autoscale avoids over-provisioning for variable load; serverless suits spiky/low-volume; manual is cheapest for steady high load.' },
          { h: 'Regions', d: 'Each additional region multiplies throughput cost — add only where latency/DR needs it.' },
        ],
      },
      walkthrough: {
        lead: 'How a write propagates and becomes a downstream event via the Change Feed.',
        steps: [
          { h: 'Route by partition key', d: 'A write is routed to the logical (then physical) partition for its partition-key value; it debits RUs.' },
          { h: 'Replicate per consistency', d: 'The write replicates within/across regions; the chosen consistency level decides when reads see it (e.g. Session guarantees your own writes).' },
          { h: 'Append to Change Feed', d: 'The change is appended to that partition’s Change Feed in order.' },
          { h: 'Consumer reads the feed', d: 'An Azure Function / Spark Change-Feed processor reads new changes per partition (checkpointing progress) in near real time.' },
          { h: 'Land / propagate', d: 'The consumer writes the change to ADLS Bronze (or triggers downstream logic); Synapse Link alternatively maintains an analytical store with no consumer code.' },
        ],
        note: 'Simplified; exact read-visibility depends on the consistency level and region topology.',
      },
      examples: [{
        title: 'Stream Cosmos changes to the lake via the Change Feed',
        requirement: 'Propagate operational document changes into the lake in near real time without impacting the transactional workload.',
        input: 'A Cosmos container (well-chosen partition key) receiving app writes.',
        architecture: 'Cosmos container → Change Feed → Azure Function/Spark processor → ADLS Bronze → MERGE → Silver (or use Synapse Link for HTAP).',
        code: {
          lang: 'text / python (illustrative)',
          text: "# Change Feed processor (Azure Function trigger) lands changes:\n#   for change in changes: write change (id, partitionKey, doc, _ts) to Bronze\n# Downstream MERGE into Silver keyed on id.\n# Alternative, no consumer code: enable Synapse Link analytical store\n#   -> query Cosmos data from Synapse with no ETL / no RU impact.",
        },
        steps: [
          'Confirm a high-cardinality, evenly-accessed partition key.',
          'Run a Change-Feed processor (Function/Spark) to read changes.',
          'Land changes to Bronze and MERGE into Silver by id.',
          'Or enable Synapse Link for no-ETL HTAP analytics.',
        ],
        output: 'Near-real-time operational data in the lake (or queryable via Synapse Link) with no load on the transactional path.',
        validation: 'Confirm changes appear downstream within seconds; counts reconcile; transactional RU usage is unaffected by analytics.',
        errorHandling: 'The processor checkpoints per partition for resumable, exactly-once-ish processing; Synapse Link isolates analytics from transactions.',
        production: 'Autoscale RU/s for variable load; monitor 429/hot partitions; Entra/managed-identity auth; TTL to manage storage.',
        cleanup: 'Stop the processor; disable Synapse Link / delete the container if decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'Requests get throttled (429) and one physical partition is far hotter than others, even though total RU/s seems ample.',
          evidence: '429 rate high; per-partition metrics show one partition near its RU/storage limit; a low-cardinality or lumpy partition key.',
          causes: ['Partition key concentrating load/data on one partition (hot partition)', 'Under-provisioned RU/s overall', 'A single dominant key value (e.g. one tenant)'],
          investigation: ['Check per-partition RU consumption and storage for skew', 'Review partition-key cardinality/access distribution', 'Compare total vs per-partition RU limits'],
          rootCause: 'RU/s is divided across physical partitions; a hot key saturates one partition regardless of total throughput.',
          remediation: ['Choose a higher-cardinality / evenly-accessed partition key (requires a new container + migration — the key is immutable)', 'Use a synthetic/composite key to spread a dominant value', 'Add RU/s only if the whole account is genuinely under-provisioned'],
          validation: 'Per-partition load evens out and 429s stop under the same traffic.',
          prevention: 'Design the partition key for even distribution up front (it cannot be changed later); monitor per-partition metrics.',
        },
        {
          symptom: 'Cosmos RU cost is unexpectedly high for modest traffic.',
          evidence: 'Queries fan out cross-partition (no partition key in the filter); the indexing policy indexes everything; large documents.',
          causes: ['Cross-partition queries multiplying RU cost', 'Default indexing of all paths inflating write RUs', 'Over-provisioned RU/s or too many regions'],
          investigation: ['Check whether hot queries include the partition key', 'Review the indexing policy vs actually-queried paths', 'Assess RU mode and region count'],
          rootCause: 'RUs per operation are high because queries fan out, writes index unused paths, or capacity/regions are over-provisioned.',
          remediation: ['Include the partition key in queries for single-partition reads', 'Trim the indexing policy to queried paths; consider autoscale/serverless', 'Reduce regions to those needed'],
          validation: 'RUs per operation and the bill drop for the same workload.',
          prevention: 'Design single-partition access paths, index only what you query, and match RU mode/regions to need.',
        },
      ],
      certMapping: {
        lead: 'Cosmos DB is the NoSQL source/serving store in Azure data scenarios; DP-203 covered its Change Feed/Synapse Link, and it feeds Fabric (DP-700) ingestion.',
        items: [
          { label: 'DP-700 Fabric Data Engineer (ingestion context)', certId: 'ms-dp700', objectives: ['Ingest NoSQL change data (Change Feed / mirroring)', 'Partitioning & throughput (RU) fundamentals', 'HTAP via analytical store'] },
          'Legacy lineage: DP-203 (retired 2025) covered Cosmos Change Feed and Azure Synapse Link for analytics.',
        ],
      },
      interview: [
        { q: 'Why is the partition key the most important design choice in Cosmos DB?', a: 'It determines how data and load are distributed. A high-cardinality key with even access spreads reads/writes across physical partitions for linear scale. A poor (low-cardinality or lumpy) key creates a hot partition that throttles (429) regardless of total provisioned RUs. You cannot change a container’s partition key later, so it must be right up front.' },
        { q: 'What are Request Units?', a: 'A normalized currency for throughput — each operation costs RUs based on payload size, indexing and complexity. You provision or auto-scale RU/s; exceeding them throttles requests. Cost/perf tuning in Cosmos is largely about minimizing RUs per operation (efficient queries, right indexes, single-partition reads).' },
        { q: 'How do you get Cosmos data into an analytics platform?', a: 'Two main ways: the Change Feed (an ordered per-partition change log) consumed by Functions/Spark to stream changes into the lake, or Azure Synapse Link, which maintains a separate analytical column store over the same data for HTAP queries from Synapse with no ETL and no impact on the transactional workload.' },
      ],
    },

    /* ── GOVERNANCE & SECURITY ───────────────────────────── */
    {
      id: 'purview', name: 'Microsoft Purview', category: 'governance',
      aka: 'formerly Azure Purview — unified data governance',
      tagline: 'A unified data-governance service that scans sources to build an enterprise data map: automated catalog, end-to-end lineage, classification of sensitive data, and a searchable glossary across cloud and on-prem.',
      keyFacts: [
        { k: 'Core', v: 'Data Map + Catalog' },
        { k: 'Discovers', v: 'Schema, lineage, PII' },
        { k: 'Scans', v: 'ADLS, SQL, Synapse, PowerBI+' },
        { k: 'Analog', v: 'Databricks Unity Catalog (partly)' },
      ],
      what: {
        lead: 'Purview registers data sources and scans them to populate a Data Map — a graph of assets, their schemas, classifications and lineage. On top sits a searchable catalog and business glossary so people can find and trust data.',
        bullets: [
          { h: 'Data Map', d: 'The metadata backbone: assets, schemas, relationships and lineage discovered by scans.' },
          { h: 'Classification', d: 'Built-in and custom classifiers detect sensitive data (emails, credit cards, national IDs) and tag it automatically.' },
          { h: 'Lineage', d: 'Captures how data flows through ADF/Synapse/Databricks so you can trace a column back to its source.' },
        ],
      },
      why: {
        lead: 'As data spreads across lakes, warehouses and pipelines, nobody can find or trust it and compliance can’t prove where PII lives. Purview gives one catalog, automated sensitivity labeling, and lineage for impact analysis.',
        bullets: [
          { h: 'Discoverability', d: 'A single search across all registered sources — analysts find the right dataset instead of re-deriving it.' },
          { h: 'Compliance', d: 'Automated PII classification and lineage answer "where is sensitive data and what feeds this report".' },
        ],
      },
      how: {
        lead: 'You register a source, configure a scan (with a managed or self-hosted integration runtime for private networks), and Purview crawls schemas, samples data to classify it, and stitches lineage from pipeline metadata.',
        bullets: [
          { h: 'Scan rulesets', d: 'Control what is scanned and which classifiers apply; schedule incremental scans as data changes.' },
          { h: 'Lineage from engines', d: 'ADF, Synapse and (via connectors) Databricks push operation metadata so Purview draws source→target lineage.' },
        ],
      },
      deUseCase: {
        lead: 'Purview is the governance layer over an Azure data estate: catalog the medallion lake, classify PII in Bronze/Silver, and expose lineage so a broken Gold table can be traced to its upstream source.',
        bullets: [
          { h: 'PII audit', d: 'Scan ADLS + SQL, auto-classify sensitive columns, report where regulated data lives.' },
          { h: 'Impact analysis', d: 'Before changing a source schema, use lineage to see every downstream table and report affected.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'scanned source' },
        { id: 'azure-sql', label: 'Azure SQL', note: 'scanned source' },
        { id: 'synapse-analytics', label: 'Synapse', note: 'source + lineage' },
        { id: 'data-factory', label: 'Data Factory', note: 'lineage emitter' },
        { label: 'Databricks / Unity Catalog', note: 'overlapping governance' },
      ],
      runtime: {
        lead: 'Scans are the main workload: classification samples data and can be I/O heavy, so schedule off-peak and use incremental scans. Lineage completeness depends on the source engines emitting operation metadata.',
        bullets: [
          { h: 'Scan cost', d: 'Billed by vCore-hours of scanning + Data Map capacity units; incremental scans keep it economical.' },
          { h: 'Private access', d: 'A self-hosted integration runtime lets scans reach sources inside a VNet or on-prem.' },
        ],
      },
      architecture: {
        lead: 'Purview’s core is the Data Map — a metadata graph of assets, schemas, classifications and lineage — populated by scans and organized into collections (a hierarchy that also scopes RBAC). A searchable Data Catalog and business glossary sit on top; information protection (sensitivity labels) and lineage from engines complete the picture.',
        bullets: [
          { h: 'Data Map + collections', d: 'Scanned assets live in the Data Map; collections form a hierarchy for organizing sources and delegating permissions (RBAC is applied at the collection level).' },
          { h: 'Scans & classifiers', d: 'A scan crawls a registered source’s schema and samples data; built-in and custom classifiers tag sensitive data (emails, cards, national IDs). Scans run via a managed VNet runtime or a self-hosted IR for private/on-prem sources.' },
          { h: 'Lineage', d: 'Engines (ADF, Synapse, and via connectors Databricks) emit operation metadata that Purview stitches into source→target lineage for impact analysis.' },
          { h: 'Catalog, glossary, labels', d: 'The catalog makes assets searchable; the glossary adds business terms; Microsoft Information Protection sensitivity labels classify and can travel with data.' },
        ],
      },
      security: {
        lead: 'Purview access is role-based through collections, scanning uses a managed identity with least-privilege read on sources, and scan credentials live in Key Vault. Private networking keeps scans off the public internet.',
        bullets: [
          { h: 'Collection-scoped roles', d: 'Data Reader / Data Curator / Data Source Admin / Collection Admin are granted at collection scope, so teams govern their own sources without account-wide access.' },
          { h: 'Scan identity', d: 'The Purview managed identity (or a credential in Key Vault) reads sources for scanning — grant it least-privilege read (e.g. Storage Blob Data Reader) on each source.' },
          { h: 'Private access', d: 'Managed VNet / self-hosted IR + private endpoints let scans reach VNet/on-prem sources without public exposure.' },
          { h: 'Sensitive-data governance', d: 'Classification + MIP sensitivity labels mark where regulated data lives, supporting compliance reporting.' },
        ],
      },
      operations: {
        lead: 'Operating Purview is scan scheduling, collection design, lineage coverage, and Data Map capacity — balancing freshness against scan cost.',
        bullets: [
          { h: 'Scan scheduling', d: 'Use incremental scans and off-peak schedules; full classification scans sample data and are I/O-heavy.' },
          { h: 'Collection design', d: 'Model collections to mirror org/domain ownership so RBAC and curation scale.' },
          { h: 'Lineage coverage', d: 'Lineage is only as complete as the engines that emit it — verify ADF/Synapse/Databricks lineage is flowing and fill gaps with manual/custom lineage where needed.' },
          { h: 'Capacity', d: 'The Data Map scales in capacity units with the number of assets; monitor and right-size as the estate grows.' },
        ],
      },
      cost: {
        lead: 'Purview bills Data Map capacity units (by asset volume/elastic usage) + scan vCore-hours + advanced features (resource sets, etc.). The levers are incremental scans, scoping classifiers, and right-sizing the Data Map. (Rates vary — price against the official Purview pricing page.)',
        bullets: [
          { h: 'Data Map capacity', d: 'Scales with the number of catalogued assets; prune/scope what you register to control it.' },
          { h: 'Scan vCore-hours', d: 'Classification sampling is the heavy cost — use incremental scans and targeted scan rulesets.' },
          { h: 'Scope classifiers', d: 'Apply only the classifiers you need; scanning everything with every classifier is the expensive default.' },
        ],
      },
      walkthrough: {
        lead: 'How a source goes from registration to a governed, lineage-connected catalog asset.',
        steps: [
          { h: 'Register the source', d: 'Add the source (e.g. an ADLS account, Azure SQL) to a collection and configure how Purview authenticates (managed identity / Key Vault credential).' },
          { h: 'Scan', d: 'A scan crawls schemas and samples data; a scan ruleset decides what is scanned and which classifiers apply, reaching private sources via managed VNet / SHIR.' },
          { h: 'Classify & map', d: 'Classifiers tag sensitive columns; assets, schemas and relationships land in the Data Map.' },
          { h: 'Stitch lineage', d: 'Operation metadata from ADF/Synapse/Databricks is stitched into source→target lineage for the scanned assets.' },
          { h: 'Discover & govern', d: 'Users search the catalog, apply glossary terms and sensitivity labels, and run impact analysis via lineage.' },
        ],
        note: 'Simplified; exact scan/lineage behavior depends on source type and engine lineage support.',
      },
      examples: [{
        title: 'Catalog + classify a medallion estate and enable impact analysis',
        requirement: 'Make the lake and SQL estate discoverable, prove where PII lives, and let engineers see downstream impact before a schema change.',
        input: 'ADLS Gen2 (medallion) and Azure SQL sources; ADF pipelines feeding the lake.',
        architecture: 'Register sources into collections → managed-identity scans (classify PII) → Data Map + catalog → ADF lineage → impact analysis.',
        code: {
          lang: 'text (setup outline, illustrative)',
          text: "1) Grant Purview MI: Storage Blob Data Reader on ADLS; db reader on SQL\n2) Register ADLS + SQL into a 'lake' collection\n3) Scan with a ruleset incl. PII classifiers (incremental, off-peak)\n4) Ensure ADF emits lineage -> source->target edges appear\n5) Search catalog; view lineage for impact analysis before changes",
        },
        steps: [
          'Grant the Purview managed identity least-privilege read on each source.',
          'Register sources into collections mirroring ownership.',
          'Run incremental classification scans off-peak.',
          'Verify ADF lineage flows, then use lineage for impact analysis.',
        ],
        output: 'A searchable catalog with PII classified and end-to-end lineage, so teams find data and assess change impact.',
        validation: 'Confirm sensitive columns are classified; search returns the expected assets; lineage shows the ADF source→target path.',
        errorHandling: 'If a scan cannot reach a private source, check the managed VNet/SHIR and the MI’s read grant; incomplete lineage usually means an engine is not emitting it.',
        production: 'Scope classifiers and use incremental scans for cost; design collections for delegated RBAC; monitor Data Map capacity.',
        cleanup: 'Remove scans/sources and the Purview account if decommissioning; revoke the MI grants.',
      }],
      troubleshooting: [
        {
          symptom: 'A scan fails or cannot connect to a source (especially a private/on-prem one).',
          evidence: 'Scan status shows connection/auth failure; the source is behind a VNet/firewall; the Purview managed identity lacks read on the source.',
          causes: ['No managed VNet runtime / self-hosted IR to reach a private source', 'Purview managed identity (or Key Vault credential) not granted read on the source', 'Firewall/network blocking the scan'],
          investigation: ['Read the scan failure detail', 'Check whether the source is private and which runtime the scan uses', 'Verify the MI’s role assignment on the source'],
          rootCause: 'The scanner cannot authenticate to or reach the source — missing runtime for private access or a missing read grant.',
          remediation: ['Use a managed VNet runtime or self-hosted IR for private/on-prem sources', 'Grant the Purview MI least-privilege read (e.g. Storage Blob Data Reader)', 'Open the required network path'],
          validation: 'The scan completes and populates assets/classifications for the source.',
          prevention: 'Set up the right runtime and MI grants when registering a source; test connectivity before scheduling scans.',
        },
        {
          symptom: 'Lineage is incomplete — some source→target relationships are missing in the catalog.',
          evidence: 'Assets are catalogued but lineage edges are absent for certain pipelines/engines; the engine does not emit lineage or a connector is missing.',
          causes: ['An engine in the flow does not emit lineage to Purview', 'Connector not configured for a source (e.g. custom/third-party)', 'Transformations outside supported engines break the chain'],
          investigation: ['Identify which hop is missing in the lineage graph', 'Check whether that engine supports/has lineage emission enabled', 'Review connector configuration'],
          rootCause: 'Purview draws lineage from engine-emitted metadata; any hop that does not emit it leaves a gap.',
          remediation: ['Enable lineage emission on supported engines (ADF/Synapse/Databricks connectors)', 'Add manual/custom lineage via the API for unsupported hops', 'Consolidate transforms onto engines that emit lineage where feasible'],
          validation: 'The lineage graph shows a complete source→target path for the flow.',
          prevention: 'Prefer lineage-emitting engines and verify coverage as pipelines are added.',
        },
      ],
      certMapping: {
        lead: 'Purview is Azure’s estate-wide governance/catalog service; the Synapse-era DP-203 touched it, and it complements Fabric (DP-700) governance.',
        items: [
          { label: 'DP-700 Fabric Data Engineer (governance context)', certId: 'ms-dp700', objectives: ['Cataloging & classification across the estate', 'Lineage & impact analysis', 'Sensitivity labels / compliance'] },
          'Legacy lineage: DP-203 (retired 2025) referenced Purview for cataloging, classification and lineage over the Azure estate.',
        ],
      },
      interview: [
        { q: 'What problem does Purview solve?', a: 'Discovery, trust and compliance across a sprawling data estate. It scans sources into a Data Map, auto-classifies sensitive data, and captures lineage — so people can find datasets, prove where PII lives, and trace a report back to source for impact analysis. It is the enterprise catalog/governance layer over lakes, warehouses and pipelines.' },
        { q: 'How does Purview relate to Databricks Unity Catalog?', a: 'They overlap on governance but operate at different layers. Unity Catalog is Databricks’ native governance — it enforces access control, lineage and auditing on data in Databricks. Purview is a broader estate-wide catalog that scans many sources (ADLS, SQL, Synapse, Power BI, on-prem) for discovery, classification and cross-system lineage. Enterprises often use Unity Catalog to govern the lakehouse and Purview to catalog everything, with connectors bridging them.' },
        { q: 'How does Purview build lineage?', a: 'Engines like ADF and Synapse emit operation metadata (which sources produced which targets) that Purview stitches into a source→target graph. Scans provide the assets and schemas; the pipeline metadata provides the edges. Coverage depends on each engine supporting lineage emission.' },
      ],
    },

    {
      id: 'entra-id', name: 'Microsoft Entra ID + RBAC', category: 'governance',
      aka: 'formerly Azure Active Directory (Azure AD)',
      tagline: 'Azure’s cloud identity and access backbone: Entra ID authenticates users and workloads (managed identities, service principals) and Azure RBAC authorizes what each identity can do on resources.',
      keyFacts: [
        { k: 'Entra ID', v: 'Authentication (who)' },
        { k: 'Azure RBAC', v: 'Authorization (what)' },
        { k: 'Workload identity', v: 'Managed Identity / SP' },
        { k: 'Extras', v: 'Conditional Access, PIM, MFA' },
      ],
      what: {
        lead: 'Entra ID is the identity provider — it verifies who a principal is (a user, group, service principal, or managed identity) and issues tokens. Azure RBAC then decides what that principal may do, by assigning roles at a scope.',
        bullets: [
          { h: 'Principals', d: 'Users, groups, service principals (app identities), and managed identities (Azure-managed credentials for resources).' },
          { h: 'RBAC = role + scope + principal', d: 'A role assignment grants a role (e.g. Storage Blob Data Reader) to a principal at a scope (subscription/RG/resource).' },
          { h: 'Managed identities', d: 'System- or user-assigned identities let a Data Factory or Databricks reach storage with no secrets in code.' },
        ],
      },
      why: {
        lead: 'Data platforms must control who and what can touch data, without scattering passwords. Entra + managed identities give passwordless, centrally-governed, auditable access — the foundation of least privilege.',
        bullets: [
          { h: 'No secrets', d: 'Managed identities remove connection-string passwords; the platform authenticates as itself.' },
          { h: 'Least privilege', d: 'RBAC roles scoped tightly (this container, read-only) limit blast radius.' },
          { h: 'Central policy', d: 'Conditional Access, MFA and PIM enforce security posture across every service at once.' },
        ],
      },
      how: {
        lead: 'A service authenticates to Entra as its managed identity, receives a token, and calls a resource; the resource checks Azure RBAC role assignments at the relevant scope to authorize. On ADLS, RBAC combines with POSIX ACLs for folder-level control.',
        bullets: [
          { h: 'Token flow', d: 'Identity → Entra issues OAuth token → resource validates token + evaluates RBAC.' },
          { h: 'Scope inheritance', d: 'Roles assigned at a higher scope (subscription) inherit down to resource groups and resources.' },
          { h: 'PIM & Conditional Access', d: 'Privileged Identity Management gives just-in-time elevation; Conditional Access gates by device, location, MFA.' },
        ],
      },
      deUseCase: {
        lead: 'Every secure Azure pipeline rests on this: Data Factory and Databricks use managed identities (granted Storage Blob Data roles) to read/write ADLS with no keys, and data-team access is governed by RBAC + ADLS ACLs.',
        bullets: [
          { h: 'Passwordless pipeline', d: 'ADF’s managed identity gets Storage Blob Data Contributor on the lake — no keys in linked services.' },
          { h: 'Team access model', d: 'Groups mapped to RBAC roles + folder ACLs implement least-privilege on Bronze/Silver/Gold.' },
        ],
      },
      integrations: [
        { id: 'adls-gen2', label: 'ADLS Gen2', note: 'RBAC + POSIX ACLs' },
        { id: 'key-vault', label: 'Key Vault', note: 'access policies / RBAC' },
        { id: 'data-factory', label: 'Data Factory', note: 'managed identity' },
        { label: 'Databricks', note: 'UC + Entra passthrough' },
      ],
      runtime: {
        lead: 'Authorization is evaluated on each request against RBAC assignments (and ACLs on ADLS); role changes can take a short time to propagate. Tokens are cached and refreshed by the SDK/managed-identity endpoint.',
        bullets: [
          { h: 'RBAC vs ACL on ADLS', d: 'RBAC gives coarse container/account roles; POSIX ACLs refine to folders/files — both are checked.' },
          { h: 'Propagation delay', d: 'New role assignments may take minutes to take effect due to caching.' },
        ],
      },
      interview: [
        { q: 'Difference between authentication and authorization on Azure, and which service does each?', a: 'Authentication (who you are) is handled by Microsoft Entra ID, which verifies the principal and issues a token. Authorization (what you can do) is Azure RBAC, which assigns roles to that principal at a scope. On ADLS, RBAC is combined with POSIX ACLs for fine-grained folder-level authorization.' },
        { q: 'What is a managed identity and why use it?', a: 'An Entra identity that Azure creates and rotates for a resource (like a Data Factory or VM), so the service can authenticate as itself with no stored credentials. You grant it RBAC roles (e.g. Storage Blob Data Reader) and it accesses resources passwordlessly — eliminating secrets in code and connection strings.' },
        { q: 'How do you implement least-privilege access to a data lake?', a: 'Map teams to Entra groups, assign narrowly-scoped RBAC roles (read-only, on a specific container) to those groups, and layer POSIX ACLs on ADLS folders so, say, /silver/pii is restricted. Use managed identities for services, PIM for just-in-time admin elevation, and Conditional Access/MFA for humans.' },
      ],
    },

    {
      id: 'key-vault', name: 'Azure Key Vault', category: 'governance',
      tagline: 'A managed secrets, keys and certificates store: pipelines fetch connection strings and keys from Key Vault at runtime instead of hardcoding them, with access governed by Entra and every access audited.',
      keyFacts: [
        { k: 'Stores', v: 'Secrets, keys, certificates' },
        { k: 'Access', v: 'Entra (RBAC / policies)' },
        { k: 'Backed by', v: 'Software / HSM' },
        { k: 'DE use', v: 'No secrets in code' },
      ],
      what: {
        lead: 'Key Vault centrally stores secrets (passwords, connection strings, tokens), cryptographic keys, and TLS certificates, and controls access to them via Entra identities. Services retrieve what they need at runtime.',
        bullets: [
          { h: 'Three object types', d: 'Secrets (arbitrary strings), Keys (for encrypt/sign, optionally HSM-backed), Certificates (managed lifecycle/renewal).' },
          { h: 'Entra-governed access', d: 'RBAC or access policies decide which identities can get/list/set each object; nothing is anonymous.' },
          { h: 'Versioning & soft-delete', d: 'Every secret is versioned; soft-delete/purge-protection guard against accidental loss.' },
        ],
      },
      why: {
        lead: 'Credentials in code, config files or pipeline definitions are a breach waiting to happen. Key Vault removes them from source, centralizes rotation, and audits every access.',
        bullets: [
          { h: 'No hardcoded secrets', d: 'Pipelines reference a Key Vault secret; the real value never lives in Git or a linked service.' },
          { h: 'Rotation & audit', d: 'Rotate a secret in one place; access logs feed compliance and incident response.' },
        ],
      },
      how: {
        lead: 'A service authenticates to Entra (usually via managed identity), which authorizes it against the vault’s RBAC/policies, then it reads the secret over TLS. ADF and Databricks integrate natively so secrets are referenced, never inlined.',
        bullets: [
          { h: 'ADF integration', d: 'Linked services pull passwords from a Key Vault reference instead of storing them.' },
          { h: 'Databricks secret scopes', d: 'A Key Vault-backed secret scope exposes secrets to notebooks via dbutils.secrets without revealing values.' },
        ],
      },
      deUseCase: {
        lead: 'Key Vault is the secrets backbone of every pipeline: database passwords, storage keys and API tokens live here and are referenced by ADF linked services and Databricks secret scopes at run time.',
        bullets: [
          { h: 'Pipeline credentials', d: 'ADF reads a source DB password from Key Vault; rotating it needs no pipeline change.' },
          { h: 'Databricks scopes', d: 'Notebooks read an API token via dbutils.secrets.get, keeping it out of code and logs.' },
        ],
      },
      integrations: [
        { id: 'entra-id', label: 'Entra ID', note: 'authorizes access' },
        { id: 'data-factory', label: 'Data Factory', note: 'secret references' },
        { id: 'azure-sql', label: 'Azure SQL', note: 'stored credentials' },
        { label: 'Databricks', note: 'KV-backed secret scope' },
      ],
      runtime: {
        lead: 'Secret reads are lightweight TLS calls; SDKs cache values to avoid per-operation fetches. Access is authorized per call against Entra and logged, so throttling limits and audit trails both apply.',
        bullets: [
          { h: 'Caching', d: 'Clients cache secrets for the run to avoid hitting vault throttling limits on hot paths.' },
          { h: 'Auditing', d: 'Every get/set is logged to Azure Monitor for compliance.' },
        ],
      },
      architecture: {
        lead: 'Key Vault is a managed store for three object types — secrets, keys, and certificates — fronted by Entra-governed access and TLS. Keys can be software- or HSM-backed; every object is versioned; soft-delete protects against loss. Services authenticate (ideally via managed identity) and read at runtime.',
        bullets: [
          { h: 'Three object types', d: 'Secrets (arbitrary strings), Keys (encrypt/sign, optionally HSM-backed), Certificates (with managed lifecycle/auto-renewal). Each is versioned.' },
          { h: 'Two access models', d: 'Azure RBAC (role assignments, the modern model) or legacy vault access policies — a vault uses one model; mixing expectations is the classic access bug.' },
          { h: 'Backing & tiers', d: 'Standard (software) or Premium (HSM-backed, FIPS 140-2 L2); Managed HSM offers dedicated FIPS L3 for stringent needs.' },
          { h: 'Protection', d: 'Soft-delete (recover deleted objects within a retention window) and purge protection (block permanent deletion) guard against accidental/malicious loss.' },
        ],
      },
      security: {
        lead: 'Key Vault is a security service, so its own access model is the crux: prefer managed identities + RBAC, lock down the network, and enable soft-delete/purge protection and logging.',
        bullets: [
          { h: 'Managed identity + least privilege', d: 'Services authenticate with a managed identity and get only the needed data-plane role (e.g. Key Vault Secrets User) — no app secrets to bootstrap.' },
          { h: 'RBAC vs access policies', d: 'Choose one model per vault; RBAC is recommended. A principal granted in the wrong model (or at the wrong plane — management vs data) gets access denied despite "having a role".' },
          { h: 'Network isolation', d: 'Private endpoints + firewall restrict the vault to selected networks; disable public access where possible.' },
          { h: 'Protection & audit', d: 'Soft-delete + purge protection prevent loss; diagnostic logs to Azure Monitor record every get/set for audit.' },
        ],
      },
      operations: {
        lead: 'Operating Key Vault is rotation, recovery (soft-delete), access-model hygiene, and respecting throttling limits on hot paths.',
        bullets: [
          { h: 'Rotation', d: 'Use key rotation policies and certificate auto-renewal; store secrets so rotating in one place needs no code/pipeline change (consumers reference, not copy).' },
          { h: 'Recovery', d: 'Soft-delete lets you recover a deleted secret/key within the retention window; purge protection stops even an admin from permanent early deletion.' },
          { h: 'Access-model hygiene', d: 'Standardize on RBAC; audit role assignments; avoid mixing access policies and RBAC assumptions across teams.' },
          { h: 'Throttling', d: 'Vaults have per-vault transaction limits; cache secrets in clients so hot paths do not hit 429 throttling.' },
        ],
      },
      cost: {
        lead: 'Key Vault bills per operation (get/set/list) and for premium/HSM keys (and Managed HSM has its own pool pricing). Cost is usually tiny — the main pitfall is uncached hot-path reads inflating operation counts (and risking throttling). (Rates vary — price against the official Key Vault pricing page.)',
        bullets: [
          { h: 'Per-operation', d: 'Each secret/key operation is billed; cache in clients to cut both cost and throttling on hot paths.' },
          { h: 'HSM premium', d: 'HSM-backed keys (Premium) and Managed HSM cost more than software keys — use them only where compliance requires.' },
          { h: 'Negligible vs risk', d: 'The cost is small; the real value is removing hardcoded secrets — optimize for security, not pennies.' },
        ],
      },
      walkthrough: {
        lead: 'How a pipeline reads a secret with a managed identity — no credentials in code.',
        steps: [
          { h: 'Acquire an Entra token', d: 'The service (ADF/Databricks/app) uses its managed identity to get an Entra token for the Key Vault resource — no bootstrap secret.' },
          { h: 'Authorize', d: 'Key Vault checks the identity against its access model (RBAC role like Key Vault Secrets User, or an access policy) for the requested operation.' },
          { h: 'Read over TLS', d: 'On success the secret value is returned over TLS; the value never appears in code, Git or (in Databricks) notebook output.' },
          { h: 'Cache', d: 'The client caches the value for the run so repeated use does not hit per-vault throttling.' },
          { h: 'Audit', d: 'The access is logged to Azure Monitor for compliance and incident response.' },
        ],
        note: 'Simplified; exact authorization depends on whether the vault uses RBAC or access policies.',
      },
      examples: [{
        title: 'Store DB credentials once; consume from ADF and Databricks via managed identity',
        requirement: 'Keep a source database password out of code and pipelines, rotate it in one place, and let both ADF and Databricks use it securely.',
        input: 'A database connection password; ADF and a Databricks workspace with managed identities.',
        architecture: 'Key Vault (secret) ← RBAC grants to ADF MI + Databricks → ADF linked service reference + Databricks KV-backed secret scope.',
        code: {
          lang: 'text / python (illustrative)',
          text: "# Grant data-plane role (RBAC model):\n#   Key Vault Secrets User -> ADF managed identity, Databricks\n\n# ADF: linked service references @Microsoft.KeyVault(SecretUri=...)\n# Databricks: KV-backed secret scope, then in a notebook:\npwd = dbutils.secrets.get(scope='kv', key='db-password')  # redacted in output",
        },
        steps: [
          'Store the password as a Key Vault secret (versioned).',
          'Grant the ADF and Databricks identities the Secrets User role (RBAC).',
          'Reference it from the ADF linked service and a Databricks KV-backed scope.',
          'Rotate the secret in Key Vault — consumers pick up the new version with no code change.',
        ],
        output: 'Both tools use the credential without it ever living in code/Git, and rotation is a single Key Vault operation.',
        validation: 'Confirm ADF connects and the Databricks read returns (redacted) the value; rotate and verify consumers still work; check access logs.',
        errorHandling: 'Access denied usually means the identity lacks the data-plane role (or the vault uses the other access model); soft-delete recovers an accidentally-deleted secret.',
        production: 'Use managed identities + RBAC, private endpoints, soft-delete + purge protection, and caching on hot paths; audit via Monitor.',
        cleanup: 'Remove role assignments and delete the secret/vault (mind purge protection) if decommissioning.',
      }],
      troubleshooting: [
        {
          symptom: 'A service with a Key Vault role still gets "Forbidden/AccessDenied" reading a secret.',
          evidence: 'The identity has a role but the vault uses the other access model, or the role is a management-plane role (not a data-plane one), or the wrong identity is used.',
          causes: ['Vault configured for access policies while you granted an RBAC role (or vice versa)', 'Granted a management-plane role (e.g. Contributor) instead of a data-plane role (Key Vault Secrets User)', 'Wrong managed identity / scope'],
          investigation: ['Check whether the vault uses RBAC or access policies', 'Verify the assigned role is a data-plane secrets role', 'Confirm which identity the service actually presents'],
          rootCause: 'Authorization is evaluated under the vault’s configured model and the data plane; a role in the wrong model or plane does not grant secret access.',
          remediation: ['Align the grant with the vault’s access model (prefer RBAC)', 'Assign the data-plane role (Key Vault Secrets User) to the correct identity', 'Fix the identity/scope the service uses'],
          validation: 'The service reads the secret successfully with least privilege.',
          prevention: 'Standardize on RBAC, grant data-plane roles to managed identities, and document the model per vault.',
        },
        {
          symptom: 'Under load, secret reads start failing with HTTP 429 (throttling).',
          evidence: 'A hot path fetches a secret on every operation; per-vault transaction limits are hit; errors clear when load drops.',
          causes: ['No client-side caching, so every operation calls the vault', 'Many instances fetching the same secret repeatedly', 'Tight loops reading secrets'],
          investigation: ['Check call volume to the vault vs the per-vault limits', 'Look for per-operation secret fetches in hot code', 'Confirm whether the SDK caches'],
          rootCause: 'Secret reads exceed the vault’s transaction limit because values are re-fetched instead of cached.',
          remediation: ['Cache secrets in the client for the run / a sensible TTL', 'Fetch once at startup rather than per operation', 'Spread/stagger load or split across vaults if genuinely high-scale'],
          validation: '429s stop and throughput recovers under the same load.',
          prevention: 'Cache secrets by default; never read Key Vault inside hot loops.',
        },
      ],
      certMapping: {
        lead: 'Key Vault is the secrets/keys governance service underpinning secure pipelines across Azure data certifications.',
        items: [
          { label: 'DP-700 Fabric Data Engineer (security context)', certId: 'ms-dp700', objectives: ['Secure credentials via Key Vault / connections', 'Managed identities over keys', 'Rotation & audit'] },
          'Legacy lineage: DP-203 (retired 2025) tested securing pipeline credentials with Key Vault (ADF references, Databricks secret scopes).',
        ],
      },
      interview: [
        { q: 'How do you keep secrets out of Databricks notebooks and ADF pipelines?', a: 'Store them in Key Vault and reference them. In Databricks, create a Key Vault-backed secret scope and read values with dbutils.secrets.get — the value is redacted in output and never in code. In ADF, linked services pull passwords from a Key Vault reference. Access is via managed identity, so no keys live in Git.' },
        { q: 'Why not just use storage account keys directly?', a: 'Account keys are long-lived, all-powerful, and easily leaked. Prefer managed identities + RBAC for passwordless access, and when a secret is unavoidable, store it in Key Vault so it is centrally rotated, access-controlled by Entra, versioned, and audited — never hardcoded.' },
      ],
    },

    /* ── MONITORING & OPS ────────────────────────────────── */
    {
      id: 'azure-monitor', name: 'Azure Monitor + Log Analytics', category: 'ops',
      tagline: 'Azure’s observability platform: Azure Monitor collects metrics and logs from every resource, Log Analytics stores and queries logs with KQL, and alerts/workbooks turn that telemetry into action.',
      keyFacts: [
        { k: 'Metrics', v: 'Numeric, near-real-time' },
        { k: 'Logs', v: 'Log Analytics workspace' },
        { k: 'Query', v: 'KQL (Kusto)' },
        { k: 'Act on it', v: 'Alerts, Workbooks' },
      ],
      what: {
        lead: 'Azure Monitor is the umbrella for telemetry. Metrics are lightweight numeric time-series; Logs are richer records sent to a Log Analytics workspace and queried with KQL. Application Insights extends it to app-level tracing.',
        bullets: [
          { h: 'Metrics vs Logs', d: 'Metrics: cheap, fast, numeric (CPU, throughput). Logs: detailed events/records in Log Analytics, queried with KQL.' },
          { h: 'Log Analytics + KQL', d: 'A workspace ingests diagnostic logs; the Kusto Query Language slices them for troubleshooting and dashboards.' },
          { h: 'Alerts & Workbooks', d: 'Metric/log alert rules fire actions (email, webhook, auto-scale); Workbooks build interactive reports.' },
        ],
      },
      why: {
        lead: 'You cannot operate pipelines you cannot see. Centralized metrics, logs and alerts let you detect failures, diagnose root cause, and prove SLAs across every Azure service from one place.',
        bullets: [
          { h: 'Single pane', d: 'ADF runs, Databricks clusters, storage throttling and SQL DTUs all land in one workspace.' },
          { h: 'Proactive alerting', d: 'Alert on a failed pipeline, a throttled storage account, or latency crossing a threshold before users notice.' },
        ],
      },
      how: {
        lead: 'Each resource emits platform metrics automatically and can route Diagnostic Settings (logs/metrics) to a Log Analytics workspace, Storage (archive) or Event Hubs (forward to a SIEM). KQL queries and alert rules run over the workspace.',
        bullets: [
          { h: 'Diagnostic settings', d: 'The switch that ships a resource’s logs to Log Analytics — without it, detailed logs are not retained.' },
          { h: 'KQL', d: 'Filter/aggregate/join logs: e.g. count failed ADF activities per pipeline over the last day.' },
        ],
        code: {
          lang: 'KQL',
          text: "ADFActivityRun\n| where Status == \"Failed\"\n| where TimeGenerated > ago(1d)\n| summarize failures = count() by PipelineName, ErrorMessage\n| order by failures desc",
        },
      },
      deUseCase: {
        lead: 'For data platforms, Monitor is the operations layer: alert on failed ADF pipelines, watch Databricks job/cluster health, catch storage throttling, and build a workbook showing pipeline SLAs and freshness.',
        bullets: [
          { h: 'Pipeline SLAs', d: 'Route ADF + Databricks logs to Log Analytics; a workbook tracks success rate and latency, alerts on breaches.' },
          { h: 'Cost/throttling watch', d: 'Alert when a storage account hits throttling or a SQL pool nears its DWU ceiling.' },
        ],
      },
      integrations: [
        { id: 'data-factory', label: 'Data Factory', note: 'run + activity logs' },
        { id: 'synapse-analytics', label: 'Synapse', note: 'pool metrics/logs' },
        { id: 'key-vault', label: 'Key Vault', note: 'access audit logs' },
        { label: 'Databricks', note: 'cluster/job diagnostics' },
      ],
      runtime: {
        lead: 'Log ingestion and retention are the cost drivers, so route only what you need and set retention deliberately. KQL queries run over the workspace’s indexed store; high-cardinality logs cost more to ingest and query.',
        bullets: [
          { h: 'Ingestion cost', d: 'Billed per GB ingested + retention; filter noisy logs at the diagnostic-setting level.' },
          { h: 'Metrics are cheap', d: 'Platform metrics are near-free and near-real-time; prefer them for high-frequency signals, logs for detail.' },
        ],
      },
      interview: [
        { q: 'Difference between metrics and logs in Azure Monitor?', a: 'Metrics are lightweight numeric time-series (CPU %, throughput) collected at high frequency and cheap to store — good for real-time health and auto-scale triggers. Logs are richer event/records sent to a Log Analytics workspace and queried with KQL — good for detailed troubleshooting and correlation. You alert on both, but pick metrics for high-frequency numeric signals and logs for detail.' },
        { q: 'How would you monitor a data pipeline built on ADF and Databricks?', a: 'Enable diagnostic settings on ADF and Databricks to ship run/activity and cluster/job logs to a Log Analytics workspace. Use KQL to track failed activities, durations and data volumes; build a Workbook for pipeline SLAs and freshness; and configure alert rules to fire on failures, latency breaches, or storage throttling so issues are caught before users report them.' },
      ],
    },
  ];

  TV.AzureServices = AZURE_SERVICES;
})();
