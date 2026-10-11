# Route Migration Map

> Phase 0 audit deliverable. Verified against `script.js` and `data/registry.js`.
> The lab is hash-routed; no server redirects are needed because no pre-existing
> public route was removed — the ported apps keep their own internal routes.

## Lab routes (hash)

| Route | Resolves to | Notes |
|---|---|---|
| `#home` | `modules/home.js` | default |
| `#foundations`, `#f01`–`#f15` | `modules/foundations.js`, `modules/foundation.js` | |
| `#aws`, `#aws01`..`#aws20` | `modules/cloud.js`, `modules/cloud-module.js` | |
| `#azure`, `#azure01`..`#azure21` | same | |
| `#databricks`, `#databricks01`..`#databricks27` | same | |
| `#engines`, `#eng-graph\|compare\|trace\|break\|builder\|decide\|capacity` | `modules/engines.js` | |
| `#incident`, `#inc01`..`#inc12` | `modules/incident.js` | |
| `#sysdesign`, `#sd-*` | `modules/sysdesign.js` | |
| `#interview` | `modules/interview.js` | |
| `#dashboard`, `#paths`, `#glossary`, `#search` | respective modules | |

## Ported sub-app routes (preserved, unchanged)

| Section | URL | Internal routing |
|---|---|---|
| Kafka | `streaming/kafka/` (own `index.html`) | its original hash routes, byte-identical |
| Flink | `streaming/flink/` (own `index.html`) | its original hash routes, byte-identical |

Deep links into ported modules continue to work because the ported apps are
unchanged. The lab navigates to them via `section.url` in the registry.

## Compatibility

- Invalid routes fall back to `#home` (`byId(id) || byId('home')`).
- Browser refresh / back / forward: hash router re-renders from `location.hash`.
- No old lab route has been renamed; Phase 1+ only *adds* routes/links.
