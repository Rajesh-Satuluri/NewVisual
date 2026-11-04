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
    'data-loading': [
      { q: 'Which ingestion pattern has NO files or stage anywhere in its path?', choices: ['Batch COPY INTO', 'Snowpipe auto-ingest', 'Snowpipe Streaming', 'Kafka connector (file-based mode)'], answer: 2, explain: 'Snowpipe Streaming writes rows directly through a channel using the SDK — there is no object storage or stage in the path.' },
      { q: 'How is a bulk COPY INTO load triggered?', choices: ['A cloud storage event', 'You run it — manually or from a scheduled Task (pull-based)', 'A Kafka offset commit', 'A Debezium snapshot'], answer: 1, explain: 'COPY INTO is pull-based: you execute it on a warehouse or let a Task run it. Snowpipe is the event-driven one.' },
      { q: 'How is Snowpipe compute billed?', choices: ['Against your warehouse credits', 'Serverless, per-second Snowflake-managed credits', 'A flat monthly fee', 'It is free'], answer: 1, explain: 'Snowpipe uses serverless Snowflake-managed compute billed per-second — it does not consume your virtual warehouse.' },
      { q: 'Why does the same file not get loaded twice by COPY/Snowpipe?', choices: ['A UNIQUE constraint', 'Load metadata tracks loaded file names/ETags', 'The result cache', 'A clustering key'], answer: 1, explain: 'Snowflake records each loaded file (name + ETag) in load metadata (~64 days) and skips it unless FORCE=TRUE.' },
      { q: 'What does Debezium-based CDC capture from a source database?', choices: ['Only full nightly snapshots', 'Row-level inserts, updates and deletes from the DB transaction log', 'Just schema changes', 'Query results'], answer: 1, explain: 'Debezium reads the database write-ahead/transaction log and emits row-level INSERT/UPDATE/DELETE change events.' },
    ],
    'loading-workshop': [
      { q: 'Where do an external stage\'s cloud credentials belong?', choices: ['Inline in the CREATE STAGE statement', 'In a STORAGE INTEGRATION object', 'In the file format', 'In a masking policy'], answer: 1, explain: 'Credentials live in a STORAGE INTEGRATION (role-based), never inline — the stage references the integration.' },
      { q: 'What does VALIDATION_MODE do on a COPY INTO?', choices: ['Loads only valid rows', 'Dry-runs the load and reports what would fail, loading nothing', 'Deletes bad files', 'Enables Time Travel'], answer: 1, explain: 'VALIDATION_MODE inspects files and returns the errors that would occur without actually loading any data.' },
      { q: 'What is the recommended compressed size per data file for bulk loading?', choices: ['Under 1 MB', 'Roughly 100–250 MB', '5–10 GB', 'Exactly 1 TB'], answer: 1, explain: 'About 100–250 MB compressed loads in parallel efficiently; tiny files add overhead and single huge files cannot parallelize.' },
      { q: 'What does STRIP_OUTER_ARRAY = TRUE do for a JSON file?', choices: ['Removes all nulls', 'Loads each element of the outer array as its own row', 'Flattens nested objects', 'Compresses the file'], answer: 1, explain: 'It unwraps a top-level JSON array so each element becomes one VARIANT row instead of a single giant row.' },
      { q: 'With ON_ERROR = SKIP_FILE, a parse error causes Snowflake to...', choices: ['Abort the whole statement', 'Skip the entire file containing the bad row', 'Load the bad row as NULL', 'Retry forever'], answer: 1, explain: 'SKIP_FILE skips any file that hits an error; CONTINUE loads good rows and skips bad ones; ABORT_STATEMENT fails the load.' },
    ],
    'loading-incremental': [
      { q: 'Blind-appending every change event without a key causes what on replay?', choices: ['Lost rows', 'Duplicate rows', 'Schema drift', 'Faster loads'], answer: 1, explain: 'With no key or dedup, re-delivered/replayed events each insert again — producing duplicates. MERGE or dedup fixes it.' },
      { q: 'Before a MERGE, why de-duplicate the source by key?', choices: ['To save storage', 'So each target key matches at most one source row (latest wins)', 'To enable clustering', 'MERGE requires sorted input'], answer: 1, explain: 'MERGE errors or is non-deterministic if one target row matches multiple source rows; keep the latest per key (max lsn/updated_at).' },
      { q: 'What is a watermark used for in incremental loading?', choices: ['Encrypting data', 'Selecting only rows changed since the last successful run', 'Masking columns', 'Sizing the warehouse'], answer: 1, explain: 'A high-water mark (e.g. max updated_at/lsn already processed) lets the next run pull only newer changes.' },
      { q: 'An idempotent load is one where...', choices: ['It runs only once ever', 're-running it produces the same final state (no duplicates)', 'It cannot fail', 'It needs no warehouse'], answer: 1, explain: 'Idempotency means safe retries: running the same batch again converges to the same result rather than double-applying it.' },
      { q: 'How do you apply deletes from a CDC stream in a MERGE?', choices: ['You cannot delete via MERGE', 'WHEN MATCHED AND change is a delete THEN DELETE', 'Drop and recreate the table', 'Use TRUNCATE each run'], answer: 1, explain: 'A MERGE can carry WHEN MATCHED ... THEN DELETE driven by the CDC operation flag to remove rows deleted upstream.' },
    ],
    'loading-recovery': [
      { q: 'A COPY reports a file loaded but 0 rows inserted. Most likely cause?', choices: ['Warehouse too small', 'Wrong file format / every row rejected', 'Time Travel expired', 'Clustering needed'], answer: 1, explain: 'A format mismatch (delimiter, header, type) can reject all rows — the file is "processed" but nothing lands. Check COPY_HISTORY / rejects.' },
      { q: 'Which is the right place to see which files failed and why?', choices: ['Result cache', 'COPY_HISTORY / VALIDATE() / rejected-record output', 'A masking policy', 'SHOW WAREHOUSES'], answer: 1, explain: 'COPY_HISTORY and VALIDATE() surface per-file status and error counts; rejected records show the offending rows.' },
      { q: 'What does reconciliation after a load verify?', choices: ['That the warehouse auto-suspended', 'Source vs target row counts (and checksums/control totals) match', 'That the share is live', 'That the cache is warm'], answer: 1, explain: 'Reconciliation compares expected vs loaded counts (and often amount/checksum totals) to prove completeness and correctness.' },
      { q: 'Duplicate rows appear after you retried a failed load. Likely cause?', choices: ['Pruning', 'FORCE=TRUE or a non-idempotent re-load', 'Auto-suspend', 'A secure view'], answer: 1, explain: 'Re-loading with FORCE=TRUE (or an append with no dedup) bypasses file dedup and re-inserts rows. Reload idempotently instead.' },
      { q: 'The safest recovery for a partially-completed batch load is to...', choices: ['Reload every file with FORCE=TRUE', 'Identify already-loaded files and reload only the missing ones (idempotent)', 'Truncate and start over blindly', 'Ignore it'], answer: 1, explain: 'Use load metadata to find what already landed and reprocess only the gap, so you neither duplicate nor lose rows.' },
    ],
  };

  window.CDWH = window.CDWH || {};
  window.CDWH.P.snowflake.quizBank = QuizBank;
})();
