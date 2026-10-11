# Search Coverage Report

> Updated Phase 1 (2026-10-11). Verified by
> `node scripts/verify-search-coverage.mjs` → **ALL SEARCH COVERAGE OK ✅**
> (137 items indexed excl. async cloud providers; +68 cloud at runtime).

## Indexed today (`buildCatalog()` sources)

| Source | Indexed? |
|---|---|
| Foundations (15) | ✅ |
| AWS / Azure / Databricks providers (68) | ✅ |
| Engine tools (7) | ✅ |
| Incidents (12) | ✅ |
| Interview questions (22) | ✅ |
| Glossary (41) | ✅ |

## Phase 1 — CLOSED ✅

Kafka (26 incl. tools) and Flink (22 incl. tools) lessons are now indexed via
`data/ported-lessons.js` and deep-link into the ported SPAs at their own hash
routes (`kafka/#m08`, `flink/#m13b`, …). Each carries concept keywords (`kw`) so
interview-style queries resolve to the right lesson.

| Source | Indexed? | Deep-link |
|---|---|---|
| Kafka lessons (22 modules + 4 tools) | ✅ | `kafka/#<id>` |
| Flink lessons (20 modules + 2 tools) | ✅ | `flink/#<id>` |

### Verified query resolution (automated)

| Query | Resolves to |
|---|---|
| consumer lag | Glossary term (exact) ✓ |
| watermarks | Foundations lesson (exact) ✓ |
| rebalancing | Kafka › Consumer Groups ✓ |
| schema evolution | Kafka › Schema Registry ✓ |
| partition reassignment | Kafka › Partition Reassignment ✓ |
| savepoints | Flink › Savepoints ✓ |
| backpressure | Flink › Backpressure ✓ |
| checkpoint barriers | Flink › Checkpointing ✓ |

**DoD item "Global search covers every course" — met.** Every Learn course
(Foundations, Kafka, Flink, AWS, Azure, Databricks, Comparisons) plus Incidents,
Interview, and Glossary is represented in the index.
