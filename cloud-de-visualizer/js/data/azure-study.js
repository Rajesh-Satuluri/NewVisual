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
  };
})();
