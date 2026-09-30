/* ============================================================
   Quiz Bank — per-module multiple-choice questions.
   Keyed by module id. { q, choices, answer(index), explain }
   ============================================================ */

(function () {
  'use strict';

  const QuizBank = {
    intro: [
      { q: 'What is Snowflake\'s core architectural innovation?', choices: ['Storing data in rows', 'Separation of storage and compute', 'Using GPUs for queries', 'On-premise clustering'], answer: 1, explain: 'Storage lives in cloud object storage; compute is independent, ephemeral warehouses — each scales separately.' },
      { q: 'Which is NOT a benefit of separating storage and compute?', choices: ['Per-second billing', 'Workload isolation', 'Automatic SQL writing', 'Independent scaling'], answer: 2, explain: 'Snowflake does not write your SQL; the other three are direct benefits of the separation.' },
      { q: 'Why can multiple teams query the same data without contention?', choices: ['Row locking', 'Each team uses its own virtual warehouse', 'Data is duplicated per team', 'Queries run one at a time'], answer: 1, explain: 'Warehouses share storage but never share compute, so one team\'s load never affects another.' },
    ],
    architecture: [
      { q: 'How many layers make up Snowflake\'s architecture?', choices: ['One', 'Two', 'Three', 'Five'], answer: 2, explain: 'Cloud Services, Virtual Warehouses (compute), and centralized Storage.' },
      { q: 'Which layer contains the query optimizer and metadata?', choices: ['Storage', 'Virtual Warehouses', 'Cloud Services', 'Local disk'], answer: 2, explain: 'Cloud Services is the always-on "brain": optimizer, metadata, auth, transactions, RBAC.' },
      { q: 'Where is table data physically stored?', choices: ['Inside the warehouse nodes', 'Cloud object storage (S3/Blob/GCS)', 'The optimizer', 'The result cache'], answer: 1, explain: 'Data is columnar micro-partitions in cloud object storage, separate from compute.' },
    ],
    storage: [
      { q: 'What is the typical compressed size of a micro-partition?', choices: ['1–5 KB', '50–500 MB', '5–10 GB', '1 TB'], answer: 1, explain: 'Micro-partitions are ~50–500 MB compressed, created automatically on ingest.' },
      { q: 'How does Snowflake prune partitions?', choices: ['User-defined PARTITION BY', 'Per-partition min/max metadata', 'Full table scan', 'Manual indexes'], answer: 1, explain: 'It compares WHERE predicates to automatically-collected min/max metadata and skips non-matching partitions.' },
      { q: 'Why is columnar storage good for analytics?', choices: ['It reads whole rows fast', 'Reads only needed columns and compresses well', 'It avoids all I/O', 'It stores JSON only'], answer: 1, explain: 'Analytics touch few columns across many rows; columnar reads only those columns and compresses similar values.' },
    ],
    compute: [
      { q: 'Going from a Medium to a Large warehouse...', choices: ['Halves the credits/hour', 'Doubles the credits/hour and compute', 'Adds more clusters', 'Changes storage cost'], answer: 1, explain: 'Each T-shirt size up doubles both compute power and credits/hour.' },
      { q: 'When should you use a multi-cluster warehouse?', choices: ['For a single slow query', 'For high concurrency (many users at once)', 'To reduce storage', 'To enable Time Travel'], answer: 1, explain: 'Multi-cluster scales OUT for concurrency; size UP for single-query speed.' },
      { q: 'What does auto-suspend do?', choices: ['Deletes data', 'Stops billing compute when idle', 'Disables the account', 'Clears storage'], answer: 1, explain: 'It suspends the warehouse after an idle period so you stop paying; only the local cache is lost.' },
    ],
    caching: [
      { q: 'How long does the result cache persist?', choices: ['1 hour', '24 hours', '7 days', 'Forever'], answer: 1, explain: 'Result cache lives 24 hours in Cloud Services and serves identical queries instantly.' },
      { q: 'What happens to local disk (SSD) cache when a warehouse suspends?', choices: ['It persists', 'It is evicted', 'It moves to S3', 'It becomes result cache'], answer: 1, explain: 'The SSD cache is tied to the running warehouse and is lost on suspend.' },
    ],
    'semi-structured': [
      { q: 'Which type holds arbitrary JSON in Snowflake?', choices: ['STRING', 'VARIANT', 'BLOB', 'JSONB'], answer: 1, explain: 'VARIANT is the universal semi-structured container.' },
      { q: 'How do you turn an array into one row per element?', choices: ['UNNEST()', 'LATERAL FLATTEN()', 'EXPLODE()', 'SPLIT()'], answer: 1, explain: 'LATERAL FLATTEN(input => arr) expands array elements into rows.' },
      { q: 'What does v:device.os::STRING do?', choices: ['Creates a column', 'Reads a nested key and casts it', 'Deletes a key', 'Flattens an array'], answer: 1, explain: 'The : and . walk into the VARIANT; ::STRING casts the untyped value.' },
    ],
    'data-engineering': [
      { q: 'What tracks row-level changes for CDC?', choices: ['A Task', 'A Stream', 'A Stage', 'A View'], answer: 1, explain: 'A Stream is a change-tracking cursor; a Task runs SQL on a schedule to process it.' },
      { q: 'What makes Dynamic Tables different from Tasks?', choices: ['They are manual', 'You declare the result + TARGET_LAG; refresh is automatic', 'They cannot be queried', 'They only load CSV'], answer: 1, explain: 'Dynamic Tables are declarative — Snowflake handles the incremental refresh to meet TARGET_LAG.' },
      { q: 'Which gives sub-second, file-less ingestion?', choices: ['COPY INTO', 'Snowpipe (file-based)', 'Snowpipe Streaming', 'External tables'], answer: 2, explain: 'Snowpipe Streaming writes rows directly via channels with sub-second latency.' },
    ],
    'cost-performance': [
      { q: 'Best first step before optimizing a slow query?', choices: ['Resize to 4XL', 'Read the Query Profile', 'Add more clusters', 'Drop the table'], answer: 1, explain: 'The profile shows bytes scanned, spilling, and row explosions — diagnose before changing anything.' },
      { q: 'A resource monitor can...', choices: ['Speed up queries', 'Cap credit spend and suspend warehouses', 'Add clusters', 'Cache results'], answer: 1, explain: 'Resource monitors enforce a credit budget with NOTIFY/SUSPEND triggers.' },
      { q: '"Bytes spilled to storage" in a profile usually means...', choices: ['Great pruning', 'Warehouse is too small for the query', 'Result cache hit', 'Network error'], answer: 1, explain: 'Spilling means the query exceeded memory — size the warehouse up.' },
    ],
    rbac: [
      { q: 'In Snowflake RBAC, privileges are granted to...', choices: ['Users directly', 'Roles', 'Warehouses', 'Databases'], answer: 1, explain: 'Privileges go to roles; roles are granted to users and to other roles.' },
      { q: 'Custom roles should generally roll up to...', choices: ['PUBLIC', 'SYSADMIN', 'ORGADMIN', 'No one'], answer: 1, explain: 'Granting custom roles to SYSADMIN keeps object management visible to admins.' },
      { q: 'Which role should NOT be used for daily work?', choices: ['A custom analytics role', 'ACCOUNTADMIN', 'A read-only role', 'PUBLIC'], answer: 1, explain: 'ACCOUNTADMIN is the most powerful role and should be used sparingly.' },
    ],
    security: [
      { q: 'A masking policy...', choices: ['Deletes sensitive columns', 'Returns altered values based on role', 'Encrypts the disk', 'Blocks logins'], answer: 1, explain: 'Masking policies dynamically transform column output depending on the querying role.' },
      { q: 'Which restricts which ROWS a role can see?', choices: ['Masking policy', 'Row access policy', 'Resource monitor', 'Warehouse'], answer: 1, explain: 'Row access policies filter rows per role/context; masking transforms column values.' },
    ],
    governance: [
      { q: 'The scalable way to protect many sensitive columns is...', choices: ['One policy per column', 'Tag-based masking (policy bound to a tag)', 'Dropping columns', 'Manual review'], answer: 1, explain: 'Bind a masking policy to a tag once; every tagged column is protected automatically.' },
      { q: 'Which view shows who read which columns?', choices: ['QUERY_HISTORY', 'ACCESS_HISTORY', 'LOGIN_HISTORY', 'COPY_HISTORY'], answer: 1, explain: 'ACCOUNT_USAGE.ACCESS_HISTORY is the column-level audit backbone.' },
    ],
    'data-sharing': [
      { q: 'Secure Data Sharing moves how much data to the consumer?', choices: ['A full copy', 'None — zero-copy, queried in place', 'Only metadata files', 'A nightly export'], answer: 1, explain: 'Consumers query the provider\'s micro-partitions live with their own compute; nothing is copied.' },
      { q: 'How do you share with someone NOT on Snowflake?', choices: ['Email a CSV', 'A Reader Account', 'A masking policy', 'A resource monitor'], answer: 1, explain: 'Providers create managed Reader Accounts for non-Snowflake consumers.' },
    ],
    advanced: [
      { q: 'Zero-Copy Clone initially costs...', choices: ['Double storage', 'Nothing until data diverges', 'One full credit', 'The same as the source'], answer: 1, explain: 'Clones share micro-partitions; you only pay for changes made after cloning.' },
      { q: 'After the Time Travel window, data goes to...', choices: ['Deletion', 'Fail-Safe (7 days, Support-only)', 'The result cache', 'An external stage'], answer: 1, explain: 'Fail-Safe is a non-queryable 7-day recovery period handled by Snowflake Support.' },
    ],
    'business-continuity': [
      { q: 'What protects against a full REGION outage?', choices: ['Time Travel', 'Fail-Safe', 'Cross-region replication + failover', 'Result cache'], answer: 2, explain: 'Only replication to another region/cloud plus failover survives losing a whole region.' },
      { q: 'Client Redirect lets you...', choices: ['Cache results', 'Point clients at the current primary without reconfig', 'Mask columns', 'Resize warehouses'], answer: 1, explain: 'A connection URL follows whichever account is primary, so failover needs no app change.' },
    ],
    comparison: [
      { q: 'A signature Snowflake strength vs peers is...', choices: ['Only runs on AWS', 'Native zero-copy data sharing', 'No SQL support', 'Requires Spark'], answer: 1, explain: 'Live, zero-copy sharing across accounts/clouds plus the Marketplace is a Snowflake hallmark.' },
      { q: 'Which tool leads for ML/lakehouse-first workloads?', choices: ['Redshift', 'BigQuery', 'Databricks', 'SnowSQL'], answer: 2, explain: 'Databricks centers on Spark/ML on a lakehouse; Snowflake leads for multi-team SQL analytics + sharing.' },
    ],
    apps: [
      { q: 'Streamlit in Snowflake runs...', choices: ['On your laptop only', 'Inside Snowflake next to the data', 'On a separate web server', 'In the browser only'], answer: 1, explain: 'The app executes within Snowflake on a warehouse, governed by the same RBAC — no data egress.' },
      { q: 'What packages data + logic into a distributable app?', choices: ['A Task', 'The Native Apps Framework', 'A masking policy', 'A stage'], answer: 1, explain: 'Native Apps bundle procs/Streamlit/models for install and monetization via the Marketplace.' },
    ],
  };

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.QuizBank = QuizBank;
})();
