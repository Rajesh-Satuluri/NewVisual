# Deep-Dive Coverage Ledger

_Generated 2026-10-11 by tools/coverage-ledger.js — a structural audit of enrichment-field presence. It reports what content EXISTS; it does not claim any content has been independently verified, and all code examples in the banks are authored as illustrative, not tested._

## AWS — 18/18 full deep dives

| Service | Status | Missing fields |
|---|---|---|
| Amazon S3 (`s3`) | ✅ full | — |
| AWS Glue Data Catalog (`glue-catalog`) | ✅ full | — |
| AWS Glue ETL (`glue-etl`) | ✅ full | — |
| AWS Lake Formation (`lake-formation`) | ✅ full | — |
| Amazon EMR (`emr`) | ✅ full | — |
| Amazon Athena (`athena`) | ✅ full | — |
| Amazon Redshift (`redshift`) | ✅ full | — |
| Amazon Redshift Spectrum (`redshift-spectrum`) | ✅ full | — |
| Amazon Kinesis (`kinesis`) | ✅ full | — |
| Amazon MSK (`msk`) | ✅ full | — |
| AWS Step Functions (`step-functions`) | ✅ full | — |
| Amazon MWAA (`mwaa`) | ✅ full | — |
| AWS Lambda (`lambda`) | ✅ full | — |
| AWS DMS (`dms`) | ✅ full | — |
| AWS IAM (`iam`) | ✅ full | — |
| AWS KMS (`kms`) | ✅ full | — |
| Amazon CloudWatch (`cloudwatch`) | ✅ full | — |
| AWS CloudTrail (`cloudtrail`) | ✅ full | — |

## Azure — 13/13 full deep dives

| Service | Status | Missing fields |
|---|---|---|
| Azure Data Lake Storage Gen2 (`adls-gen2`) | ✅ full | — |
| Azure Blob Storage (`blob-storage`) | ✅ full | — |
| Azure Data Factory (`data-factory`) | ✅ full | — |
| Azure Event Hubs (`event-hubs`) | ✅ full | — |
| Azure Stream Analytics (`stream-analytics`) | ✅ full | — |
| Azure Synapse Analytics (`synapse-analytics`) | ✅ full | — |
| Synapse Serverless SQL Pool (`synapse-serverless`) | ✅ full | — |
| Azure SQL Database (`azure-sql`) | ✅ full | — |
| Azure Cosmos DB (`cosmos-db`) | ✅ full | — |
| Microsoft Purview (`purview`) | ✅ full | — |
| Microsoft Entra ID + RBAC (`entra-id`) | ✅ full | — |
| Azure Key Vault (`key-vault`) | ✅ full | — |
| Azure Monitor + Log Analytics (`azure-monitor`) | ✅ full | — |

## Databricks — 12/12 full deep dives

| Service | Status | Missing fields |
|---|---|---|
| Delta Lake (`delta-lake`) | ✅ full | — |
| Unity Catalog (`unity-catalog`) | ✅ full | — |
| Delta Live Tables (`delta-live-tables`) | ✅ full | — |
| Auto Loader (`auto-loader`) | ✅ full | — |
| Structured Streaming (`structured-streaming`) | ✅ full | — |
| Change Data Feed (`change-data-feed`) | ✅ full | — |
| Databricks Workflows (`workflows`) | ✅ full | — |
| Photon Engine (`photon`) | ✅ full | — |
| Clusters (All-Purpose / Job / Serverless) (`clusters`) | ✅ full | — |
| Databricks SQL (`databricks-sql`) | ✅ full | — |
| MLflow (`mlflow`) | ✅ full | — |
| Delta Sharing (`delta-sharing`) | ✅ full | — |

## Fabric — 14/14 full deep dives

| Service | Status | Missing fields |
|---|---|---|
| OneLake (`onelake`) | ✅ full | — |
| Fabric Lakehouse (`fabric-lakehouse`) | ✅ full | — |
| Fabric Warehouse (`fabric-warehouse`) | ✅ full | — |
| Dataflow Gen2 (`dataflow-gen2`) | ✅ full | — |
| Fabric Data Pipelines (`fabric-data-pipelines`) | ✅ full | — |
| Fabric Spark Notebooks (`fabric-spark`) | ✅ full | — |
| Eventstream (`eventstream`) | ✅ full | — |
| Eventhouse (KQL) (`eventhouse`) | ✅ full | — |
| Fabric Mirroring (`fabric-mirroring`) | ✅ full | — |
| Copy Job (`fabric-copy-job`) | ✅ full | — |
| Fabric SQL Database (`fabric-sql-db`) | ✅ full | — |
| Materialized Lake Views (`fabric-mlv`) | ✅ full | — |
| Fabric Monitoring Hub (`fabric-monitoring-hub`) | ✅ full | — |
| Fabric Deployment Pipelines & Git (ALM) (`fabric-deployment-pipelines`) | ✅ full | — |

## Summary

- **Full deep dives:** 57/57 services (100%).
- **Partial:** 0 services.

### Honest gap report

- No structural gaps: every service carries all baseline + core enrichment fields.

### Scope & caveats (what "full" does and does not mean)

- **"Full" = structural completeness only** — the service carries every baseline and core enrichment field. It does NOT mean the prose or code has been independently fact-checked against a live cloud run.
- **Code examples are illustrative** — authored to teach the shape of a solution, not executed against a cloud. The renderer labels them "Illustrative".
- **Cert mappings** reference official exam objectives as understood at authoring time; verify against the current official exam guide before relying on them.
- **No prices are hardcoded** — cost sections describe billing models and direct the reader to the official pricing page.
