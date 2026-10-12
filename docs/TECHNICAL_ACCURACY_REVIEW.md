# Technical Accuracy Review

Tracks version-sensitivity and the honesty labels required by Rules 4 & 5 (distinguish simulated vs. real; don't present version/adapter-specific behavior as universal).

## Version baseline

Content targets **dbt Core (modern, 1.5+)** terminology unless a module states otherwise. Version/adapter-specific claims should carry a caveat. Reference anchor: official dbt docs (docs.getdbt.com).

## Honesty labels (Rule 5) — classification in use

| Label | Meaning | Where |
|---|---|---|
| Conceptual visualization | diagram/illustration, no execution | most module diagrams |
| Simulated execution | realistic but not from a real runtime | m18 compile, m24 run output, m33 run playback |
| Static validation | text/schema validity only | YAML lint (Iter 2) |
| **Actual execution** | genuinely runs | **SQL Coding Studio via DuckDB-WASM (Iter 1)** |

The Coding Studio is the one place that earns the "Actual execution" label — real SQL on a real in-browser engine. Every dbt-runtime view stays "Simulated" and links to the downloadable real dbt project (Iter 6) for true `dbt run`.

## Version/adapter-sensitive topics to keep caveated

| Topic | Caveat |
|---|---|
| Incremental strategies | `merge`/`delete+insert`/`insert_overwrite`/`microbatch` support varies by adapter (m21 already notes this) |
| `microbatch` | newer dbt; mark as version-gated |
| Unit tests | dbt 1.8+; note version |
| Model contracts / constraints | enforcement differs by warehouse (declared vs. enforced) |
| `QUALIFY` | Snowflake/BigQuery/Databricks; not Postgres/Redshift (interview bank notes this) |
| Clustering / Z-order / dist+sort keys | warehouse-native, not portable (m29) |
| Python models | adapter-dependent; experimental surface |

## Known honesty gaps closed / open

- ✅ DuckDB-WASM labeled "Actual execution"; SQL dialect is DuckDB — exercises note where warehouse SQL (Snowflake `QUALIFY`, BigQuery) differs.
- ✅ In-app "dbt run" output remains "Simulated execution".
- 🔵 Iter 6: ship pinned, runnable real dbt project so learners can verify real `dbt compile`/`run` locally.
- Open: adapter matrix (Iter 6) must cite support per-adapter and avoid cross-adapter inference.

## Accuracy checks automated

`tools/content-lint.mjs` guards structural integrity (ids, loaders, quiz indices, interview schema, stray hard-coded totals). Semantic accuracy is reviewed per wave against dbt docs; version caveats live in content.
