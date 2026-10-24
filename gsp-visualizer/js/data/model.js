/* ============================================================
   GSP Visualizer — data model
   One namespace: window.GSP. All content is cloud-aware where it
   differs; `shared` keys mean "identical on Azure and AWS".
   This file holds no DOM logic — just the knowledge base.
   ============================================================ */
(function () {
  "use strict";
  var GSP = (window.GSP = window.GSP || {});

  /* ── The pipeline, left-to-right. `stage` drives the architecture
     diagram order; `group` drives the component sidebar. ──────── */
  GSP.components = [
    {
      id: "source",
      stage: 0,
      icon: "📥",
      accent: "var(--c-source)",
      name: { shared: "Source Systems" },
      tagline: "SFTP feeds & upstream extracts",
      purpose:
        "Upstream supply-chain systems drop files (or push through configured interfaces): demand forecasts, demand history, purchase schedules, stock-transfer schedules, ASN and inventory feeds.",
      responsibilities: [
        "Deliver header/detail datasets as a related pair (e.g. PULL forecast staged + active).",
        "Expose a readiness signal — completion marker, atomic rename, or size/row manifest.",
        "Carry a business date and (where available) a source record count."
      ],
      features: {
        azure: ["SFTP landing", "Scheduled extracts", "Interface files/payloads"],
        aws: ["AWS Transfer Family (managed SFTP)", "Scheduled extracts", "Interface files/payloads"]
      },
      gotchas: [
        "A scheduled pipeline is NOT proof a file arrived — check presence, name, completion and size first.",
        "A filename appearing is not proof the upload finished — require an atomic rename or a completion/manifest marker."
      ],
      io: { in: "Operational & planning source systems", out: "Raw files in the ingestion zone" },
      asBuilt: {
        tech: "SFTP incoming directories + the o9 mPower download connector",
        artifacts: [
          ["Standard_SFTP_Download_Files", "Generic SSIS package pulling feeds from the SFTP incoming directory"],
          ["Control_SFTP_Files / _Freq", "Tracks every file seen per batch tier — the arrival ledger"],
          ["In_Control_BatchFile", "Per-batch manifest of expected vs received files"],
          ["~17 In_Fact_* interfaces", "Demand, history, purchase, stock-transfer, ASN & requirement feeds"]
        ],
        note: "Feeds arrive as flat files over SFTP (and o9 mPower pulls); each lands into an In_Fact_* staging table. Arrival is proven by the Control_SFTP_Files ledger + batch-file manifest, not by a schedule firing."
      }
    },

    {
      id: "orchestration",
      stage: 1,
      icon: "🪂",
      accent: "var(--c-orch)",
      name: { shared: "Apache Airflow" },
      tagline: "Central orchestration — decides WHEN and IN WHAT ORDER",
      purpose:
        "Airflow evaluates the business calendar, checks readiness and prior-run status, triggers ingestion and Databricks jobs, waits for real completion, validates, then fans out to the operational and analytical branches. Identical role on both clouds.",
      responsibilities: [
        "Pick the batch: main planning, frequent refresh, PULL snapshot, reconciliation.",
        "Run readiness sensors before ingestion; block downstream until upstream truly finishes.",
        "Own retries, timeouts, pools/concurrency, alerts and recovery.",
        "Carry run context: business date, batch ID, scenario, feed config."
      ],
      features: {
        shared: [
          "DAGs & task dependencies",
          "Timetables / business calendar",
          "Sensors (file / external-job readiness)",
          "Operators (ingest, Databricks, Snowflake)",
          "Retries, timeouts, pools",
          "Callbacks & alert integrations"
        ]
      },
      dags: [
        ["gsp_main_planning_batch", "Primary weekly planning workflow"],
        ["gsp_frequent_asn_inventory", "Frequent operational updates (~hourly)"],
        ["gsp_pull_forecast_snapshot", "Staged/active forecast promotion"],
        ["gsp_o9_outbound_reconciliation", "Downstream outbound checks"],
        ["gsp_snowflake_analytics_load", "Analytical ingestion & reconciliation"]
      ],
      gotchas: [
        "A task that merely SUBMITS a job and immediately succeeds is not orchestration — wait for the real ADF/Databricks outcome.",
        "Frequent batch takes ~85 min against an hourly target → runs overlap. Start with max_active_runs=1, then choose queue / coalesce / skip.",
        "Unity Catalog is NOT the scheduler. It governs access; Airflow controls execution order."
      ],
      io: { in: "Calendar, sensors, run config", out: "Triggered & monitored tasks across the stack" },
      asBuilt: {
        tech: "SQL Server Agent jobs → SSIS master packages (the delivered system has no Airflow)",
        artifacts: [
          ["Master_FrequentBatch", "The ~85-min frequent batch (ASN / inventory / requirement refresh)"],
          ["Master_Daily · _Weekly · _Monthly · _Weekend", "The planning-cadence tiers"],
          ["Master_Expedite", "Off-cycle expedite run"],
          ["Schedule_Master_InboundPkg / _OutboundPkg", "Inbound and outbound sequencing wrappers"],
          ["GetVersionsBeforeBatch / AfterBatch", "Captures o9 plan versions around the run for rollback"]
        ],
        note: "Orchestration = SSIS master packages executed on a schedule by SQL Server Agent. Order and dependencies live inside the DTSX control flow; the frequent batch is guarded so a run can't stack on itself. Airflow is the cloud-target equivalent, not what shipped."
      }
    },

    {
      id: "ingestion",
      stage: 2,
      icon: "🔀",
      accent: "var(--c-ingest)",
      name: { azure: "Azure Data Factory", aws: "AWS Glue + Transfer Family" },
      tagline: "Reliable movement of source data into the lake",
      purpose:
        "Move source data into the raw/Bronze zone reliably and repeatably — connections, parameterized pipelines and copy activities. Keep heavy distributed business logic OUT of this layer; that belongs in Databricks.",
      responsibilities: [
        "Resolve connection to source + destination and copy into the raw zone.",
        "Reuse one parameterized pipeline across many feeds (feed name, path, business date).",
        "Capture copy metrics (rows, duration, status) and return status to Airflow."
      ],
      features: {
        azure: [
          "Linked services",
          "Datasets",
          "Copy Activity",
          "Integration Runtime",
          "Parameterized pipelines",
          "Pipeline monitoring"
        ],
        aws: [
          "Glue Data Catalog (metadata)",
          "Glue Crawlers (schema discovery)",
          "Glue ETL jobs (optional Spark)",
          "AWS Transfer Family (SFTP)",
          "S3 event notifications",
          "Glue connections & job params"
        ]
      },
      gotchas: [
        "Don't re-implement complex PySpark business rules here — use this layer for movement + ingestion-side checks only.",
        "On AWS, decide which catalog is authoritative per asset (Glue Data Catalog vs Databricks Unity Catalog) — don't duplicate rules in both Glue ETL and Databricks."
      ],
      example: {
        title: "Example parameterized ingestion (illustrative)",
        code:
          '{\n  "feed_name": "In_Fact_PurchaseSchedule_Extd",\n  "business_date": "2026-10-24",\n  "source_path": "/gsp/purchase_schedule/",\n  "target_path": "/bronze/gsp/purchase_schedule/"\n}'
      },
      io: { in: "Raw source files", out: "Bronze raw data + ingestion metadata" },
      asBuilt: {
        tech: "SSIS Data Flow + File System tasks loading flat files into SQL Server staging",
        artifacts: [
          ["Frequent_Batch_Interface", "Loads the frequent-tier inbound interfaces"],
          ["Dimension_Load", "Loads the Dim_* / Ref_* master data"],
          ["Fact_DemandHistory · Fact_DemandForecastInitial", "Per-feed fact load packages"],
          ["Standard_Download_From_SQL", "Reusable extract-to-file package for outbound"],
          ["Archive_Files / Move_Archive_files", "Moves processed files to the archive directory"]
        ],
        note: "Movement only — flat files become In_* rows via SSIS Data Flows. Business logic stays out of this layer (it lives in the stored procs). On the cloud this maps to ADF (Azure) or Glue + Transfer Family (AWS)."
      }
    },

    {
      id: "storage",
      stage: 3,
      icon: "🗄️",
      accent: "var(--c-store)",
      name: { azure: "ADLS Gen2", aws: "Amazon S3" },
      tagline: "Medallion storage: Bronze → Silver → Gold",
      purpose:
        "Durable object storage for raw, intermediate and curated data, organized into medallion layers plus quarantine and control zones. The lake is the backbone both clouds share.",
      responsibilities: [
        "Bronze: preserve ingested source + ingestion metadata (traceability, controlled reprocessing).",
        "Silver: validated, standardized, deduplicated data.",
        "Gold: consumer-ready datasets (o9 planning, frequent refresh, Snowflake analytics).",
        "Quarantine: isolate invalid records/files; Control: manifests, reconciliation, run metadata."
      ],
      features: {
        azure: ["Containers & directories", "Access controls / RBAC", "Managed identities", "Retention policies", "Encryption"],
        aws: ["Buckets & prefixes", "IAM & bucket policies", "Versioning", "Lifecycle policies", "KMS encryption", "Event notifications"]
      },
      layout: {
        azure: "abfss://gsp@<account>.dfs.core.windows.net/",
        aws: "s3://gsp-data-platform/",
        tree: ["bronze/", "silver/", "gold/ (o9_planning · frequent_refresh · snowflake_analytics)", "quarantine/", "control/ (manifests · reconciliation · run_metadata)"]
      },
      gotchas: [
        "A file's presence in Bronze is NOT proof the business batch completed.",
        "Gold does not automatically mean publishable — still validate output contract, counts, keys and rules."
      ],
      io: { in: "Copied source data; curated Delta writes", out: "Layered datasets for every consumer" },
      asBuilt: {
        tech: "A single SQL Server planning database (~3,800 tables) — the medallion equivalent lives in the table-naming convention",
        artifacts: [
          ["Ref_* / Dim_*", "Reference & master data (dimensions) — the conformed layer"],
          ["In_*", "Inbound landing straight from the feeds — the Bronze equivalent"],
          ["Stg_* / STG_*", "Staging & transform scratch — the Silver equivalent"],
          ["Out_* / Fact_Out_*", "Outbound, consumer-ready for o9 — the Gold equivalent"],
          ["Q_*", "Point-in-time snapshot / queue tables (e.g. Q_Dim_Item, Q_Fact_*)"],
          ["Control_* / CFU_*", "Batch-status control tables + Critical File Upload tracking"]
        ],
        note: "There is no object-store lake; the layers are SQL schemas/prefixes in one database. Re-platformed, In_/Stg_/Out_ become Bronze/Silver/Gold folders on ADLS Gen2 (Azure) or S3 (AWS)."
      }
    },

    {
      id: "processing",
      stage: 4,
      icon: "⚡",
      accent: "var(--c-proc)",
      name: { shared: "Databricks" },
      tagline: "PySpark — validation, dedup, joins, business rules",
      purpose:
        "The heavy distributed transformation engine. Reads Bronze, validates, quarantines bad records, deduplicates, standardizes, joins feeds, applies GSP business rules, aggregates to the output grain, and writes Silver/Gold Delta tables. Same role on both clouds.",
      responsibilities: [
        "Validate schema, types and mandatory fields; quarantine invalid records.",
        "Deduplicate on agreed keys + ordering rule (wrong key can drop a legitimate line).",
        "Join forecast / inventory / purchase-schedule / stock-transfer and apply supply-chain rules.",
        "Aggregate/reshape to the required grain; write curated Delta; reconcile counts & keys."
      ],
      features: {
        shared: ["Databricks / Lakeflow Jobs", "Notebooks & Python modules", "PySpark DataFrames", "Delta Lake writes", "Spark UI & query plans", "Job parameters"]
      },
      example: {
        title: "Validate + dedup (illustrative — keys must come from business rules)",
        code:
          'from pyspark.sql import functions as F\nfrom pyspark.sql.window import Window\n\ndf = spark.read.format("delta").load(bronze_path)\n\nvalid = df.filter(\n    F.col("Item_Number").isNotNull()\n    & F.col("Logistics_Center").isNotNull())\n\nw = (Window\n     .partitionBy("Item_Number", "Logistics_Center",\n                  "Expected_Available_Date")\n     .orderBy(F.col("Source_Updated_At").desc()))\n\ndedup = (valid\n    .withColumn("_rn", F.row_number().over(w))\n    .filter(F.col("_rn") == 1)\n    .drop("_rn"))'
      },
      gotchas: [
        "Don't promise Databricks auto-beats the old SSIS/SQL job — benchmark time, cost, correctness & reliability on a representative load (e.g. a 33M-row feed).",
        "Watch partition sizes, shuffle volume, skew and file sizes via the Spark UI."
      ],
      io: { in: "Bronze raw inputs", out: "Silver + consumer-specific Gold Delta tables" },
      asBuilt: {
        tech: "SSIS Data Flows + set-based T-SQL stored procedures (plus the o9 Solver)",
        artifacts: [
          ["Proc_Daily · Proc_Weekly · Proc_Monthly", "Cadence transform procs run by the master packages"],
          ["Proc_StatForecast", "Statistical-forecast processing"],
          ["SolverInput · SolverProc_Daily/_Weekly/_Monthly", "Builds Solver inputs and post-processes its output"],
          ["Demand_Realignment · Item_Rationalization · Part_Rationalization", "Core supply-planning business rules"]
        ],
        note: "Validation, dedup, joins and aggregation are done in T-SQL and SSIS against SQL Server — not PySpark. This is the layer that would move onto Databricks / Spark if re-platformed; the business rules are the thing to port, not the engine."
      }
    },

    {
      id: "delta",
      stage: 5,
      icon: "🔺",
      accent: "var(--c-delta)",
      name: { shared: "Delta Lake" },
      tagline: "ACID lakehouse tables + controlled MERGE",
      purpose:
        "Makes lakehouse writes transactional and supports incremental processing. ACID commits, schema enforcement/evolution, MERGE INTO, time travel. Format is identical on both clouds.",
      responsibilities: [
        "Commit writes atomically so readers never see partial data.",
        "Enforce schema; evolve it only when explicitly approved.",
        "MERGE on a stable unique business key with a defined policy for deletes, late and duplicate rows.",
        "Expose a committed version to downstream readers; allow controlled time travel."
      ],
      features: {
        shared: ["ACID transactions", "Schema enforcement", "Schema evolution", "MERGE INTO", "Time travel", "Partitioning & file management"]
      },
      example: {
        title: "MERGE (key is illustrative — needs a real unique business key)",
        code:
          "MERGE INTO silver.purchase_schedule AS t\nUSING staged_purchase_schedule AS s\n  ON t.Schedule_Line_ID = s.Schedule_Line_ID\nWHEN MATCHED THEN UPDATE SET *\nWHEN NOT MATCHED THEN INSERT *;"
      },
      gotchas: [
        "A Delta transaction does NOT make snapshot promotion + Snowflake load + o9 publish one atomic unit — coordinate those with batch IDs, manifests, commit markers and reconciliation."
      ],
      io: { in: "Validated DataFrames", out: "Committed, versioned lakehouse tables" },
      asBuilt: {
        tech: "SQL Server staging-swap + MERGE pattern (the delivered system has no Delta Lake)",
        artifacts: [
          ["Stg_* → Out_* swap", "Build in staging, then publish atomically into the outbound table"],
          ["Q_* snapshots", "Frozen point-in-time copies so readers see a consistent set"],
          ["In_Batch_Flag / Control_In_Tables", "Batch flags gating what downstream may read"],
          ["GetVersionsBeforeBatch", "o9 plan-version capture = the point-in-time rollback handle"]
        ],
        note: "Atomicity and 'time travel' are achieved with SQL transactions, table swaps, Q_ snapshots and o9 version capture rather than ACID lakehouse commits. Delta Lake is the cloud-target equivalent of this discipline."
      }
    },

    {
      id: "governance",
      stage: 6,
      icon: "🛡️",
      accent: "var(--c-gov)",
      name: { shared: "Unity Catalog" },
      tagline: "Govern & audit Databricks data assets",
      purpose:
        "Controls and audits access to supported Databricks assets — metastore, catalogs/schemas, grants, lineage and external locations. Used as the lakehouse governance layer on both clouds.",
      responsibilities: [
        "Authenticate the identity, then authorize against privileges before any read/write.",
        "Organize assets by domain + environment (e.g. gsp_dev / gsp_test / gsp_prod → bronze/silver/gold).",
        "Record lineage & audit for dependency tracing and investigations.",
        "Govern external storage via storage credentials + external locations."
      ],
      features: {
        shared: ["Metastore", "Catalogs & schemas", "Tables & views", "Privileges & grants", "Lineage & audit", "Storage credentials / external locations"]
      },
      gotchas: [
        "Unity Catalog is governance, NOT a scheduler and not a substitute for Airflow.",
        "On AWS, reconcile authority with the Glue Data Catalog so each asset has ONE authoritative catalog."
      ],
      io: { in: "User/service identity + access request", out: "Permitted, audited data access" },
      asBuilt: {
        tech: "SQL Server logins / roles / schemas + o9 role & IBPL data-security rules",
        artifacts: [
          ["SQL Server roles & schema grants", "Who can read/write each layer in the planning DB"],
          ["o9 Roles", "Role-based access inside the planning tenant"],
          ["IBPL 'Data Security' rule", "Row/scope-level data security enforced in o9"]
        ],
        note: "Governance is split: SQL Server permissions guard the database, and o9's roles + IBPL rules guard the planning model. Unity Catalog is the cloud-target equivalent for the lakehouse half."
      }
    },

    {
      id: "o9",
      stage: 7,
      icon: "🎯",
      accent: "var(--c-o9)",
      name: { shared: "o9 Solutions" },
      tagline: "Operational branch — publish & run planning",
      purpose:
        "Delivers validated planning data and coordinates the planning procedures. Publishing + verifying delivery + confirming the procedure succeeded — not just a file transfer. Same on both clouds (o9 is cloud-agnostic here).",
      responsibilities: [
        "Validate the interface contract, then create the interface file/payload.",
        "Publish via the configured interface (SFTP / API); check delivery + acknowledgement.",
        "Trigger or await the o9 procedure and confirm successful completion.",
        "Enable dependent outbound ONLY after prerequisites succeed; reconcile & close the batch."
      ],
      features: {
        shared: ["Interface contract validation", "Payload generation", "Configured publish (SFTP/API)", "Delivery acknowledgement", "Procedure trigger/monitor", "Dependent-outbound gating"]
      },
      gotchas: [
        "A successful file transfer is NOT proof the o9 planning procedure succeeded.",
        "PULL snapshot: promote staged header + detail TOGETHER — never activate a new header on an older detail.",
        "Frequent scenario is informational (not consumed by the solver) — keep it off the solver-dependent path.",
        "Replenishment handshake: Frequent → CWV copy then Frequent recreated from CWV is an explicit dependency, not an arbitrary copy.",
        "Hold demand/solver outbound until the weekly batch succeeds."
      ],
      io: { in: "Gold planning datasets", out: "Executed planning + operational outbound" },
      asBuilt: {
        tech: "o9 Solutions tenant integrated via the o9 mPower connector over SFTP",
        artifacts: [
          ["o9 mPower upload / download", "The integration channel between SQL Server and o9"],
          ["61 Dimensions · 5 Plans", "Item, Customer, Location/LC, Supplier, BOM, Bodid, Resource, PlanningVersion…"],
          ["~865 IBPL rule-groups · 25 Alerts", "The planning logic and exception alerting in-tenant"],
          ["CWV (Current Working Version)", "The active plan version in the replenishment handshake"],
          ["CFU_* + CriticalFileUpload_AfterSolver", "Critical files that must reach o9 after the Solver"],
          ["CriticalFilesBatchEndEmail", "Batch-end confirmation that critical files landed"]
        ],
        note: "o9 is the operational planning engine and Solver. Success is not 'file sent' — it's the critical files uploaded, the Solver run, and the plan version advanced. mPower + SFTP is the real transport; o9 itself is cloud-agnostic."
      }
    },

    {
      id: "snowflake",
      stage: 8,
      icon: "❄️",
      accent: "var(--c-snow)",
      name: { shared: "Snowflake" },
      tagline: "Analytical branch — facts, dimensions, KPIs",
      purpose:
        "The analytical warehouse, SEPARATE from o9's planning engine. Loads curated Gold via a storage integration + external stage, reconciles, models facts/dimensions, and serves SQL/BI. Same pattern on both clouds; only the stage source (ADLS vs S3) differs.",
      responsibilities: [
        "Databricks writes an approved export to the lake; Snowflake reads it via external stage + storage integration.",
        "COPY INTO staging → validate/schema checks → reconcile counts & keys.",
        "MERGE into fact/dimension tables; expose views, KPIs and BI models."
      ],
      features: {
        shared: ["Databases & schemas", "Virtual warehouses", "External stage + storage integration", "COPY INTO", "Staging tables", "Fact & dimension tables", "SQL views / KPIs", "Streams & Tasks (optional)", "Query history & resource monitors"]
      },
      model: [
        ["DIM_ITEM", "Item attributes & identifiers"],
        ["DIM_LOGISTICS_CENTER", "Location attributes"],
        ["DIM_DATE", "Calendar & reporting periods"],
        ["FACT_INVENTORY_SNAPSHOT", "Inventory qty by item/location/snapshot"],
        ["FACT_DEMAND_FORECAST", "Forecast qty by customer/item/location/period"],
        ["FACT_PURCHASE_SCHEDULE", "Scheduled inbound supply"],
        ["FACT_STOCK_TRANSFER", "Inter-location movements"]
      ],
      gotchas: [
        "Snowflake is NOT a replacement for o9's planning engine — it's a separate analytical consumption layer.",
        "Define ONE controlled ingestion contract — don't assume Delta tables are automatically native Snowflake tables."
      ],
      io: { in: "Curated Gold analytical export", out: "Queryable facts/dimensions, views, BI" },
      asBuilt: {
        tech: "Not in the delivered system — analytics today is served from SQL Server reporting + metrics outbound",
        artifacts: [
          ["Outbound_FilesSS_Metrics", "Supply-metrics extracts pushed out of the planning DB"],
          ["BatchStatistics · BatchEnd_Stats", "Run timing / volume statistics per batch"],
          ["Standard_BatchSummary · Standard_OutboundBatchSummary", "Batch summary reports"],
          ["Standard_DataTable_To_Email", "Tabular reports emailed to the business"]
        ],
        note: "There is no Snowflake in the as-built platform; reporting runs on SQL Server tables + emailed/extracted metrics. Snowflake is the cloud-target analytical layer this would move to — kept separate from o9, exactly as the operational/analytical split describes."
      }
    }
  ];

  /* ── As-built reality vs cloud target ────────────────────────── */
  GSP.asBuilt = {
    headline: "Delivered on SQL Server + SSIS, integrating with o9 Solutions over SFTP / mPower",
    stack: [
      ["Orchestration", "SQL Server Agent + SSIS master packages"],
      ["Ingestion", "SSIS Data Flow + File System tasks; o9 mPower"],
      ["Storage / layers", "One SQL Server DB (~3,800 tables) — In_/Stg_/Out_/Ref_/Q_/Control_/CFU_"],
      ["Processing", "Set-based T-SQL stored procs + SSIS; o9 Solver"],
      ["Transactional writes", "SQL transactions, Stg→Out swaps, Q_ snapshots, o9 version capture"],
      ["Planning platform", "o9 Solutions (mPower, IBPL rules, Plans, Solver)"],
      ["Analytics", "SQL Server reporting + metrics outbound (no Snowflake)"],
      ["Transport", "SFTP (inbound feeds + outbound files) & o9 mPower"]
    ],
    note:
      "This project was delivered on SQL Server + SSIS, integrating with o9 Solutions over SFTP and the o9 mPower connector. The Azure and AWS columns throughout this lab show how each piece maps if the same platform were rebuilt on that cloud — they are a re-platforming map, not what shipped. Live credentials, internal hostnames and client identifiers from the source project are deliberately excluded."
  };

  /* ── Real inbound interfaces (the feeds that start every batch) ─ */
  GSP.inboundInterfaces = [
    ["In_Fact_DemandForecastHeader", "Forecast header — PULL (moves with its detail)"],
    ["In_Fact_DemandForecastDetail", "Forecast detail — PULL (moves with its header)"],
    ["In_Fact_DemandForecastInitial", "Initial / customer forecast"],
    ["In_Fact_DemandHistoryCustomer", "Demand history by customer"],
    ["In_Fact_DemandHistoryLC", "Demand history by logistics center"],
    ["In_Fact_PurchaseSchedule_Extd", "Purchase schedule (extended)"],
    ["In_Fact_PurchaseAgreementLine", "Purchase agreement lines"],
    ["In_Fact_PurchaseRequisitionSchedule", "Purchase requisition schedule"],
    ["In_Fact_PurchaseScheduleColl", "Purchase schedule — collaboration"],
    ["In_Fact_StockTransferSchedule", "Stock-transfer schedule"],
    ["In_Fact_StockTransferAgreement", "Stock-transfer agreements"],
    ["In_Fact_InboundAsn", "Inbound ASN (advance shipping notice)"],
    ["In_Fact_InboundFilledRequirement", "Inbound filled requirements"],
    ["In_Fact_OutboundFilledRequire", "Outbound filled requirements"],
    ["In_Fact_OutboundOpenRequirement", "Outbound open requirements"],
    ["In_Fact_SupplierLCItem_P2", "Supplier × LC-item master"],
    ["In_Fact_LCItem_GSC", "LC-item (supply-chain) master"]
  ];

  /* ── Cross-cutting security & monitoring (rendered separately) ── */
  GSP.crosscutting = {
    azure: [
      ["Azure Key Vault", "Secrets & key storage"],
      ["Managed identities", "Service-to-service auth without secrets"],
      ["Azure Monitor", "Metrics, logs, alarms"],
      ["Activity / diagnostic logs", "Audit trail"]
    ],
    aws: [
      ["AWS IAM", "Who/what can access resources"],
      ["AWS KMS", "Encryption keys"],
      ["AWS Secrets Manager", "Secret storage & rotation"],
      ["Amazon CloudWatch", "Logs, metrics, alarms"],
      ["AWS CloudTrail", "API-activity audit"]
    ],
    note:
      "Cloud IAM alone does NOT replace authorization inside Databricks and Snowflake — configure identity, credential, network and access controls in those platforms too."
  };

  /* ── Azure ⇄ AWS capability map ──────────────────────────────── */
  // [capability, as-built (real), Azure target, AWS target]
  GSP.cloudMap = [
    ["Orchestration / scheduler", "SQL Server Agent + SSIS", "ADF triggers / Apache Airflow", "Apache Airflow / Step Functions"],
    ["ETL / movement", "SSIS Data Flow + File System tasks", "Azure Data Factory", "AWS Glue + Transfer Family + S3 notifications"],
    ["Transforms / business rules", "T-SQL stored procs + SSIS", "Azure Databricks (PySpark)", "Databricks on AWS (PySpark)"],
    ["Storage / layers", "SQL Server DB (In_/Stg_/Out_)", "ADLS Gen2 (Bronze/Silver/Gold)", "Amazon S3 (Bronze/Silver/Gold)"],
    ["Transactional writes", "Stg→Out swap · Q_ snapshots", "Delta Lake", "Delta Lake"],
    ["Governance", "SQL roles + o9 roles/IBPL", "Unity Catalog", "Unity Catalog"],
    ["Analytics warehouse", "SQL Server reporting + metrics", "Snowflake", "Snowflake"],
    ["Planning platform", "o9 Solutions (mPower)", "o9 Solutions", "o9 Solutions"],
    ["Transport", "SFTP + o9 mPower", "SFTP endpoint + ADF", "AWS Transfer Family"],
    ["Secrets", "SSIS/SQL config + project params", "Azure Key Vault", "AWS Secrets Manager"],
    ["Monitoring / alerting", "BatchStatistics + email/PagerDuty", "Azure Monitor", "Amazon CloudWatch"],
    ["Audit", "SQL + SSIS logging", "Azure activity / diagnostic logs", "AWS CloudTrail"]
  ];
  GSP.cloudMapNote =
    "The as-built system is SQL Server + SSIS + o9; the Azure and AWS columns are a re-platforming map, not what shipped. ADF has no clean one-to-one AWS equivalent — AWS blends Glue, Transfer Family and S3 notifications. o9 is cloud-agnostic and stays put.";

  /* ── The hard business cases (interview gold) ────────────────── */
  GSP.businessCases = [
    {
      id: "pull-snapshot",
      icon: "📸",
      title: "PULL forecast snapshot",
      hook: "Header and detail must move as one.",
      body: [
        "The PULL forecast arrives as a related pair — In_Fact_DemandForecastHeader and In_Fact_DemandForecastDetail — plus the initial/customer forecast (Fact_DemandForecastInitial). The process must preserve the header↔detail relationship.",
        "Validate both, apply the configured eligibility and holiday rules, freeze a consistent set via the Q_ snapshot tables, and promote them TOGETHER on the approved schedule."
      ],
      rule: "Never activate a new header while its matching detail is still on an older snapshot.",
      tag: "Consistency"
    },
    {
      id: "frequent-85",
      icon: "⏱️",
      title: "The 85-minute frequent batch",
      hook: "~85 min runtime vs an hourly target → overlap & backlog.",
      body: [
        "Master_FrequentBatch (ASN / inventory / requirement refresh via Frequent_Batch_Interface) takes ~85 minutes while the refresh target is roughly hourly — so runs can overlap or build a backlog.",
        "As built, SQL Server Agent + the master package guard against a run stacking on itself (the one-active-run rule); the Control_SFTP_Files_Freq ledger and In_Batch_Flag decide what the next run picks up. Then it's a business call whether overdue runs queue, coalesce or skip."
      ],
      rule: "Guard against overlapping runs (one active instance), then pick an explicit queue / coalesce / skip policy + freshness alerts — don't let runs silently pile up.",
      tag: "Concurrency"
    },
    {
      id: "replen-handshake",
      icon: "🤝",
      title: "Replenishment handshake",
      hook: "Solver ↔ Frequent ↔ CWV is an explicit dependency.",
      body: [
        "The Solver signals completion through flag/polling packages — SolverFile_Flag_Lock, SolverFile_Flag_Polling and SolverFile_JobStatus — and the replenishment files (Inbound_Replen_Files, ReplenishmentPlanning) are only processed once that handshake clears.",
        "After replenishment, Frequent updates are copied to the Current Working Version (CWV), and Frequent is recreated from CWV — an ordered dependency, not an arbitrary copy that could run at the wrong time."
      ],
      rule: "Gate the copy behind Solver + replenishment completion (the flag/polling handshake); recreate Frequent only after CWV is updated.",
      tag: "Dependency"
    },
    {
      id: "critical-files",
      icon: "📌",
      title: "Critical files & batch status",
      hook: "Some files are not optional — the plan is wrong without them.",
      body: [
        "A subset of outputs are tracked as Critical File Uploads (CFU_* tables + Control_Fact_CriticalFileUpload). CriticalFileUpload_AfterSolver pushes them once the Solver finishes, and CriticalFilesBatchEndEmail confirms they landed.",
        "The authoritative batch status lives in the Control_* tables (and BatchStatistics); BatchStatus_Alert / BatchAlertFrequentBatch raise exceptions, escalating to PagerDuty when a critical file is missing or late."
      ],
      rule: "A batch isn't done until every critical file is confirmed uploaded — track it in a control table, not in someone's memory.",
      tag: "Operability"
    },
    {
      id: "o9-vs-snow",
      icon: "🔀",
      title: "Why operational AND analytical?",
      hook: "o9 planning vs reporting/analytics consumption.",
      body: [
        "o9 = supply-chain planning & Solver execution; input is planning-ready interfaces over mPower/SFTP; success = critical files uploaded + Solver run + plan version advanced.",
        "The analytical side (today SQL Server reporting + metrics outbound; Snowflake as the cloud target) consumes curated datasets; success = ingestion + reconciliation + data availability.",
        "They have different completion criteria — an analytics delay must not block planning, or vice-versa, unless the business explicitly requires it."
      ],
      rule: "The analytical warehouse is not a replacement for o9's planning engine — it's a separate consumption layer.",
      tag: "Architecture"
    }
  ];

  /* ── Failure handling & monitoring ───────────────────────────── */
  GSP.recovery = {
    steps: [
      ["Capture", "Record task, run ID and error."],
      ["Transient?", "If yes, retry within configured limits."],
      ["Recovered?", "If yes, reconcile and resume downstream."],
      ["Root cause", "If not transient/recovered, alert support & diagnose."],
      ["Checkpoint", "Choose a safe checkpoint or controlled reprocess."],
      ["Validate", "Confirm data + business state before resuming."],
      ["Resume / Reset", "Resume if safe; full reset or escalate only when necessary."]
    ],
    metrics: [
      "Files expected vs received (Control_SFTP_Files / In_Control_BatchFile)",
      "Source / accepted / rejected record counts",
      "SSIS package duration & status (BatchStatistics, BatchEnd_Stats)",
      "Stored-proc runtime & row counts per transform step",
      "Stg→Out swap status & Q_ snapshot watermarks",
      "o9 mPower delivery + Solver status (SolverFile_JobStatus)",
      "Critical files uploaded vs required (Control_Fact_CriticalFileUpload)",
      "Data freshness, frequent-batch backlog, end-to-end duration"
    ],
    idempotency:
      "Use an idempotency strategy (batch flags, file-control ledgers, Stg→Out swaps, o9 version capture) so retrying a failed step never duplicates business data or publishes the same batch twice. GetVersionsBeforeBatch captures the o9 plan version so a bad run can be rolled back cleanly.",
    canonical:
      "Settle the authoritative batch-status record early — the Control_* tables that hold the canonical run, business date, feed status, row counts, critical-file status and recovery checkpoint. That is what lets the system tell a successful TASK (a package exited 0) apart from a successfully completed business BATCH."
  };

  /* ── Interview Q&A bank ──────────────────────────────────────── */
  GSP.interview = [
    { cat: "As-built", q: "Walk me through this project end to end.", a: "As delivered it runs on SQL Server + SSIS. SQL Server Agent fires SSIS master packages on a cadence — frequent (~85 min), daily, weekly, monthly, weekend. Feeds arrive over SFTP (and o9's mPower connector) and land in In_Fact_* staging tables, tracked by the Control_SFTP_Files ledger. Set-based T-SQL stored procedures and SSIS data flows validate, dedup, join and apply the supply-planning rules across In_ → Stg_ → Out_ tables. The Solver runs, replenishment completes via a flag/polling handshake, critical files (CFU_) are uploaded to o9 through mPower, and the plan version is advanced. Reporting/metrics are served from SQL Server. Everything is gated on the Control_ batch-status tables, not just on a package exiting 0." },
    { cat: "As-built", q: "What was the actual technology stack?", a: "SQL Server as the single planning database (~3,800 tables organized by naming convention — In_/Stg_/Out_/Ref_/Q_/Control_/CFU_), SSIS for ETL and orchestration, SQL Server Agent as the scheduler, SFTP + the o9 mPower connector for transport, and o9 Solutions as the planning engine and Solver. No Airflow, Databricks, Delta Lake or Snowflake — those are the cloud-target equivalents this lab maps each piece to." },
    { cat: "As-built", q: "How did you orchestrate without Airflow?", a: "SQL Server Agent jobs trigger SSIS master packages (Master_FrequentBatch, Master_Daily, _Weekly, _Monthly, _Weekend, _Expedite). The dependency graph lives inside each package's control flow; the frequent batch is guarded so a run can't stack on itself, and GetVersionsBeforeBatch/AfterBatch capture o9 plan versions around the run. The role is identical to an Airflow DAG — calendar, order, readiness, retries — just expressed in DTSX and SQL Agent." },
    { cat: "As-built", q: "What is o9 mPower and how did data reach o9?", a: "mPower is o9's integration connector. SSIS produces the planning-ready outbound files, and mPower (over SFTP) uploads them into the o9 tenant and pulls data back. The critical files are tracked explicitly (CFU_ / Control_Fact_CriticalFileUpload) and pushed after the Solver via CriticalFileUpload_AfterSolver, with CriticalFilesBatchEndEmail confirming arrival." },
    { cat: "As-built", q: "Without Delta time-travel, how did you get consistent snapshots and rollback?", a: "Q_ snapshot tables freeze a consistent set for readers; Stg_→Out_ swaps publish atomically; In_Batch_Flag / Control_In_Tables gate what downstream reads; and GetVersionsBeforeBatch captures the o9 plan version so a bad run can be rolled back. It's the same discipline Delta gives you — just built from SQL transactions, table swaps and version capture." },
    { cat: "Architecture", q: "Walk me through how this maps to a cloud re-platform.", a: "SSIS orchestration → Airflow; SSIS/T-SQL transforms → Databricks/PySpark; the SQL layers In_/Stg_/Out_ → Bronze/Silver/Gold on ADLS Gen2 (Azure) or S3 (AWS); Stg→Out swaps → Delta MERGE; SQL + o9 security → Unity Catalog + o9 roles; SQL reporting → Snowflake. o9 stays put (cloud-agnostic). The thing you port is the business rules in the stored procs, not the engine." },
    { cat: "Architecture", q: "Why split the output into an operational and an analytical branch?", a: "They have different consumers and success criteria. o9 is the planning engine — success means correct delivery AND the planning procedure completing. Snowflake is analytical — success means ingestion, reconciliation and data availability. Coupling them would let an analytics delay block planning (or vice-versa) with no business reason." },
    { cat: "Architecture", q: "Why Airflow when ADF/Glue can also schedule?", a: "Airflow is the single cross-service orchestrator: calendar logic, cross-system dependencies, readiness sensors, retries, pools and recovery across ADF/Glue, Databricks, o9 and Snowflake. ADF/Glue schedule their own jobs, but no single one of them sees the whole business batch." },
    { cat: "Orchestration", q: "How do you handle the frequent batch that runs ~85 min against an hourly cadence?", a: "Overlap is the risk. I start with max_active_runs=1 so runs can't stack, then choose an explicit policy — queue, coalesce the overdue runs, or skip to the latest — driven by whether stale-but-complete or fresh-but-partial is worse for the business. I add freshness and missed-refresh alerts rather than letting a backlog grow silently." },
    { cat: "Orchestration", q: "What's wrong with an Airflow task that submits a job and succeeds?", a: "It reports success before the work finishes, so downstream tasks start on incomplete data. The operator must wait for the real ADF/Databricks outcome (poll/deferrable sensor) and fail if that outcome fails." },
    { cat: "Orchestration", q: "How is the DAG set split up?", a: "Separate DAGs by cadence and purpose: main planning batch, frequent ASN/inventory refresh, PULL forecast snapshot, o9 outbound reconciliation, and Snowflake analytics load. That isolates failure blast-radius and lets each run on its own schedule and concurrency rules." },
    { cat: "Storage", q: "Explain the medallion layers here.", a: "Bronze preserves raw source + ingestion metadata for traceability and controlled reprocessing. Silver is validated, standardized, deduplicated. Gold is consumer-ready, with separate outputs for o9 planning, frequent refresh and Snowflake analytics. Plus a quarantine zone for bad records and a control zone for manifests, reconciliation and run metadata." },
    { cat: "Storage", q: "Does a file in Bronze mean the batch is done?", a: "No. Presence in Bronze only means a file landed. Batch completion is a business state tracked in the control zone / batch-status record — distinct from any single file or task succeeding." },
    { cat: "Processing", q: "How do you deduplicate a feed safely?", a: "Partition by the agreed business keys and order by a defined recency column (e.g. Source_Updated_At desc), keep row_number()==1. The key and ordering must come from the business rules — the wrong key silently drops legitimate schedule lines." },
    { cat: "Processing", q: "A feed is 33M rows and slow. What do you look at?", a: "Spark UI first: partition sizes, shuffle volume, skew, output file sizes and the join strategy. I'd check for skewed keys, right-size partitions, prefer broadcast where a side is small, and avoid tiny-file explosions. Then benchmark against the old SSIS/SQL runtime — I don't assume the cloud is automatically faster." },
    { cat: "Processing", q: "Why Databricks for transforms instead of ADF/Glue?", a: "Heavy distributed logic — validation, dedup, multi-feed joins, business rules, aggregation — belongs on Spark. ADF/Glue are for reliable movement and ingestion-side checks. Splitting them keeps one place for business logic and avoids duplicating rules in two engines." },
    { cat: "Delta", q: "What does Delta give you that plain Parquet doesn't?", a: "ACID commits (readers never see partial writes), schema enforcement/evolution, MERGE INTO for upserts on a business key, and time travel for inspection/recovery. It makes incremental processing reliable." },
    { cat: "Delta", q: "Is a Delta transaction enough to keep o9 and Snowflake consistent?", a: "No. A Delta commit is atomic for one table write. Snapshot promotion + Snowflake load + o9 publish are separate operations across systems — I coordinate them with batch IDs, manifests, explicit commit markers and reconciliation, not a single transaction." },
    { cat: "o9", q: "Is a successful file transfer to o9 enough to call the batch done?", a: "No — that only proves delivery. The o9 planning procedure must also run and succeed. I trigger/await the procedure, confirm completion, and only then enable dependent outbound." },
    { cat: "o9", q: "Explain the PULL forecast snapshot handling.", a: "Staged header and detail are a related pair. I validate both, apply eligibility and holiday rules, and promote them together on the approved schedule. Activating a new header on an older detail would corrupt the plan." },
    { cat: "o9", q: "What's the replenishment handshake?", a: "After replenishment processing, Frequent updates are copied to the Current Working Version (CWV), and Frequent is recreated from CWV. It's modeled as an explicit ordered dependency in Airflow, gated on replenishment completion — not a free-floating copy task." },
    { cat: "o9", q: "What is the frequent scenario and why keep it separate?", a: "It's informational and not consumed by the solver, so it stays off the solver-dependent path. Mixing it in risks feeding non-authoritative data into planning. Demand/solver outbound stays held until the weekly batch succeeds." },
    { cat: "Snowflake", q: "How does curated data get into Snowflake?", a: "Databricks writes an approved Gold export to the lake; Snowflake reads it through a storage integration + external stage; COPY INTO lands it in staging; schema/validation checks run; counts and keys are reconciled; then MERGE into fact/dimension tables; views and KPIs serve BI." },
    { cat: "Snowflake", q: "Could Snowflake replace o9?", a: "No. o9 is a planning/optimization engine that executes scenarios and procedures. Snowflake is an analytical warehouse for historical trends, KPIs and reporting. They're complementary consumers, not substitutes." },
    { cat: "Failure", q: "A task fails mid-batch — what happens?", a: "Capture task/run ID/error; retry if transient within limits. If it recovers, reconcile and resume. If not, alert, root-cause, pick a safe checkpoint or controlled reprocess, validate data + business state, then resume — full reset or escalation only when necessary. Dependent demand/solver outbound stays blocked until the weekly batch succeeds." },
    { cat: "Failure", q: "How do you avoid double-publishing a batch on retry?", a: "Idempotency: batch IDs, manifests and commit markers so re-running a step is a no-op if it already completed. Reconciliation confirms a step ran once and only once before enabling downstream." },
    { cat: "Failure", q: "What's the single most important design decision for operability?", a: "The authoritative batch-status record — one place holding the canonical run ID, business date, feed status, row counts, consumer status and recovery checkpoint. It's what lets Airflow distinguish a successful task from a successfully completed business batch." },
    { cat: "Cloud", q: "How would you port this from Azure to AWS?", a: "Storage ADLS Gen2 → S3; ingestion ADF → Glue + Transfer Family + S3 notifications; secrets Key Vault → Secrets Manager; encryption → KMS; monitoring Azure Monitor → CloudWatch; audit → CloudTrail. Databricks, Delta Lake, Unity Catalog, Airflow, Snowflake and o9 stay the same. The one that isn't one-to-one is ADF — AWS blends several services for ingestion." },
    { cat: "Cloud", q: "On AWS, Glue Data Catalog or Unity Catalog?", a: "Both can exist, but each asset needs ONE authoritative catalog. If Unity Catalog governs the lakehouse tables, Glue Catalog is fine for other AWS integrations — the team must define authority per asset so business rules and metadata aren't duplicated." },
    { cat: "Governance", q: "What does Unity Catalog actually do here?", a: "Authenticates identities and authorizes against grants before any read/write, organizes assets by domain/environment, and records lineage + audit. It's governance — not a scheduler, and not a substitute for Airflow's execution ordering." }
  ];

  /* ── Quiz ────────────────────────────────────────────────────── */
  GSP.quiz = [
    { q: "A task/package submits a job and immediately returns success. What's the flaw?", opts: ["Nothing — submission is enough", "Downstream starts before the job really finishes", "Jobs can't be triggered this way", "It will retry forever"], correct: 1 },
    { q: "A feed has landed in the In_ (Bronze) layer. What does that prove?", opts: ["The business batch completed", "o9 received the plan", "A file landed — nothing about batch completion", "Reporting is loaded"], correct: 2 },
    { q: "The frequent batch runs ~85 min against an hourly target. First control to apply?", opts: ["Run every 30 min", "A single active run + an explicit queue/coalesce/skip policy", "Disable retries", "Move it to reporting"], correct: 1 },
    { q: "A successful mPower/SFTP transfer to o9 means…", opts: ["The Solver run succeeded", "Delivery happened; the Solver & critical-file upload still must succeed", "The batch is closed", "Analytics can load now"], correct: 1 },
    { q: "Which is NOT guaranteed atomic by a single Delta transaction?", opts: ["One table write", "Snapshot promotion + Snowflake load + o9 publish together", "A MERGE into one table", "A schema-enforced append"], correct: 1 },
    { q: "Azure ADF maps most closely on AWS to…", opts: ["A single equivalent service", "Glue + Transfer Family + S3 notifications combined", "Snowflake", "Unity Catalog"], correct: 1 },
    { q: "PULL forecast snapshot rule:", opts: ["Promote header first, detail later", "Promote header + detail together", "Only promote the header", "Detail is optional"], correct: 1 },
    { q: "Why run both o9 and Snowflake?", opts: ["Redundancy of the same engine", "o9 plans; Snowflake serves analytics — different roles", "Snowflake replaces o9", "o9 replaces Snowflake"], correct: 1 },
    { q: "Safe dedup needs…", opts: ["Any random key", "The business key + a defined ordering column", "No key at all", "The first row seen"], correct: 1 },
    { q: "The most important operability artifact is…", opts: ["A bigger cluster", "The authoritative batch-status record", "More DAGs", "A second Snowflake warehouse"], correct: 1 }
  ];

  /* ── Glossary ────────────────────────────────────────────────── */
  GSP.glossary = [
    ["ADF", "Azure Data Factory — Azure's managed data-movement/ingestion service."],
    ["ADLS Gen2", "Azure Data Lake Storage Gen2 — hierarchical object storage on Azure."],
    ["ASN", "Advance Shipping Notice — inbound-shipment feed (In_Fact_InboundAsn)."],
    ["Batch ID", "Identifier tying every artifact of one business run together for reconciliation."],
    ["Bronze/Silver/Gold", "Medallion layers: raw → cleaned → consumer-ready. Here: In_ → Stg_ → Out_ SQL tables."],
    ["CFU", "Critical File Upload — outputs tracked as must-deliver (CFU_* / Control_Fact_CriticalFileUpload)."],
    ["Control_ tables", "SQL Server batch-status / file-tracking tables — the authoritative run record."],
    ["COPY INTO", "Snowflake command loading staged files into tables (cloud-target analytics)."],
    ["CWV", "Current Working Version — the active o9 plan version in the replenishment handshake."],
    ["DAG", "Directed Acyclic Graph — an Airflow workflow of tasks + dependencies (cloud-target orchestration)."],
    ["Delta Lake", "ACID table format over Parquet with MERGE and time travel (cloud-target of the Stg→Out swap)."],
    ["DTSX / SSIS", "SQL Server Integration Services package — the as-built ETL + orchestration unit."],
    ["IBPL", "o9's rule language — the in-tenant planning logic (incl. the Data Security rule)."],
    ["External stage", "Snowflake pointer to lake files, used with a storage integration."],
    ["GSP", "Global Supply Planning — the supply-chain domain of this project."],
    ["Glue", "AWS managed ETL + Data Catalog service."],
    ["Idempotency", "A step can be safely re-run without duplicating effects."],
    ["LC", "Logistics Center — a demand/inventory location (dimension)."],
    ["Master package", "An SSIS master (Master_FrequentBatch, _Daily, _Weekly…) orchestrating a cadence tier."],
    ["MERGE INTO", "Upsert: insert new rows, update matched rows on a key."],
    ["mPower", "o9's integration connector — moves files between SQL Server and the o9 tenant over SFTP."],
    ["o9 Solutions", "The supply-chain planning platform, Solver and IBPL rule engine."],
    ["PULL forecast", "A forecast process with staged + active header/detail (In_Fact_DemandForecast Header/Detail)."],
    ["Q_ tables", "Point-in-time snapshot / queue tables giving readers a consistent frozen set."],
    ["Quarantine", "Isolating invalid records/files for investigation instead of silently dropping them."],
    ["Solver", "o9's optimization engine; signals completion via SolverFile flag/polling packages."],
    ["SQL Server Agent", "The as-built scheduler that fires the SSIS master packages on a cadence."],
    ["Storage integration", "Secure Snowflake↔cloud-storage credential binding (cloud-target analytics)."],
    ["Transfer Family", "AWS managed SFTP backed by S3 (cloud-target of the SFTP ingest)."],
    ["Unity Catalog", "Databricks governance layer: catalogs, grants, lineage, audit (cloud-target)."],
    ["Watermark", "Processed-position marker enabling incremental loads."]
  ];
})();
