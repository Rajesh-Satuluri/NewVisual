# Search Coverage Report

> Phase 0 baseline (pre-Phase-1). Regenerated for real as `buildCatalog()` grows.
> Verified against `data/catalog.js`.

## Indexed today (`buildCatalog()` sources)

| Source | Indexed? |
|---|---|
| Foundations (15) | ✅ |
| AWS / Azure / Databricks providers (68) | ✅ |
| Engine tools (7) | ✅ |
| Incidents (12) | ✅ |
| Interview questions (22) | ✅ |
| Glossary (41) | ✅ |

## NOT indexed → Phase 1 gap

| Source | Status |
|---|---|
| **Kafka lessons (22)** | ❌ not in catalog |
| **Flink lessons (20)** | ❌ not in catalog |

This fails Definition-of-Done item *"Global search covers every course."*
Phase 1 adds Kafka + Flink lesson entries (title, subtitle, deep-link into the
ported app) so a search for e.g. "consumer lag", "rebalancing", "savepoints"
opens the correct ported lesson. A coverage assertion will verify every intended
section contributes ≥1 indexed item.

## Target after Phase 1

All Learn courses (Foundations, Kafka, Flink, AWS, Azure, Databricks,
Comparisons) + Incidents + Interview + Glossary represented in the index.
