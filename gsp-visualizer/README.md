# GSP Visualizer — Global Supply Planning Data Platform

An interactive walkthrough of a **Global Supply Planning (GSP)** data integration & analytics
platform, built for interview prep off a real project. It ingests supply-chain feeds
(demand forecasts, inventory, ASN, purchase & stock-transfer schedules), transforms them into
planning-ready datasets, publishes to **o9 Solutions**, and serves analytics from **Snowflake**.

**Live:** https://rajesh-satuluri.github.io/NewVisual/gsp-visualizer/

## What's inside

- **Azure ⇄ AWS toggle** — every component re-labels live (ADF↔Glue/Transfer Family,
  ADLS Gen2↔S3, Key Vault↔Secrets Manager, Azure Monitor↔CloudWatch …), plus a dedicated
  side-by-side mapping module.
- **Animated architecture diagram** — clickable nodes, orchestration band, and the
  operational/analytical fan-out.
- **End-to-end flow** — the 8 steps a batch takes, source files → o9 + Snowflake.
- **Component deep-dives** — responsibility, components, gotchas and example code for
  Airflow, ingestion, storage, Databricks, Delta Lake, Unity Catalog, o9 and Snowflake.
- **Medallion layers** — Bronze / Silver / Gold + quarantine + control.
- **The hard business cases** — PULL forecast snapshot, the 85-minute frequent batch,
  the replenishment handshake, and why o9 *and* Snowflake.
- **Failure & recovery** — monitoring metrics, the retry/recovery flow, idempotency, and
  the authoritative batch-status record.
- **Interview Q&A (25) + quiz (10) + glossary.**

## Stack

Pure HTML + CSS + vanilla JS. No bundler, no framework. Runs directly from GitHub Pages.

## Local development

```bash
cd gsp-visualizer
python3 -m http.server 8080
# open http://localhost:8080
```

## Note

This is a **proposed target architecture** based on the GSP process. Specific deployment and
integration mechanisms should be validated against the real environment. Service names, table
names and parameters shown are illustrative.
