# Scenario Integration Plan

> Phase 0 audit deliverable. Verified against `data/scenarios.js`.

## Two permanent scenarios

| | Scenario A | Scenario B |
|---|---|---|
| Name | Uber mobility | E-commerce |
| Entity | ride | order |
| Key field | `driver_id` | `order_id` |
| Canonical id | `R-4471` | `O-9001` |
| Shape | `.pipeline[]`, `.sampleEvent` | same |

Tokens `{ENTITY}` / `{KEY}` / `{ID}` are filled from the active scenario.

## Where scenarios already re-frame (verified live)

- Foundations modules (scenario-aware content).
- Cloud modules (AWS/Azure/Databricks "In your scenario" tab).
- Engines (trace, capacity, builder use the active pipeline).
- Incident Lab + System Design briefs use tokens.

## VERIFIED GAP → Phase 7 (I20/I26)

The global switcher does **not** re-frame examples **inside the ported Kafka /
Flink modules** (those are byte-identical preserved files). Both scenarios are
nonetheless represented across the lab (Kafka ships the e-commerce worked
example; Flink ships Uber R-4471). Phase 7 adds a clearly-labelled ADAPTED
overlay so the switcher can re-frame ported examples **without editing preserved
files** — sequenced last to keep preservation provable.

## Scenario validation (Phase 8 tests)

Switch A↔B and assert: active scenario changes; payloads/examples change;
simulation inputs change; underlying lesson text intact; switch-back restores;
no unrelated state corrupted.
