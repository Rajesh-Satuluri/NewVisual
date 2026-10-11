# Architecture Audit — Streaming Engineering Master Lab

> **Purpose (I05).** Record the architecture the new `streaming/` lab inherits and
> must conform to, so it deploys as reliably as the existing tools and never risks
> them.

## 1. Monorepo shape

`NewVisual/` is a static monorepo of **independent vanilla-JS SPAs**, one per
directory, deployed together to GitHub Pages root. Existing tools (all protected,
must not be touched):

- `appliedai/`, `databricks/`, `dbt/`, `flink/`, `iceberg/`, `kafka/`, `snowflake/`

The new lab is an **8th sibling directory**, `streaming/`. It links from the root
`index.html` card grid (added in I81). Because each tool is a self-contained folder
with its own `script.js`, components, and data, adding `streaming/` is strictly
additive — it cannot change the routing, assets, or behavior of any existing tool.

## 2. Per-app architecture (shared idiom, not shared code)

- **No framework, no build step.** Pure ES modules loaded over `<script type="module">`.
  This is a hard constraint — it is why Pages deploys are zero-toolchain and reliable.
  The new lab keeps it.
- **Hash routing.** `window.addEventListener('hashchange', …)` dispatches to a route
  handler. Each screen is an ES module exporting `mount(container)` returning an
  optional cleanup fn.
- **Lazy loading + cache-busting.** Modules are dynamically `import()`-ed from a
  `LOADERS` map with a `?v=BUILD` query so deploys invalidate stale caches
  (Flink: `BUILD='20261009e'`). New lab adopts the same `?v=BUILD` discipline.
- **PAGE vs MODULE routes.** MODULE routes are auto-wired (`initTabs`, IQ,
  enhancements) by the router; PAGE routes are not and must self-wire
  (`initTabs(container)` inside `mount()`). This gotcha is carried into the new
  shell's documented contract.
- **Theming.** `data-theme="dark|light"` on `<html>`, CSS tokens, `color-mix`.
  Canvas backgrounds hardcoded `#0A0E1A` for theme-independent legibility.
- **Persistence.** `localStorage`, namespaced per app (`kafka-*`, Flink keys).
  New lab uses a dedicated `sml-*` namespace to avoid any collision (I13).

## 3. Deploy pipeline

- `.github/workflows/deploy.yml`: `on: push: branches:[main]` (+ manual
  `workflow_dispatch`). Checks out the repo, `configure-pages`, uploads the whole
  tree as the Pages artifact, deploys via `deploy-pages@v4`.
- **Implication:** nothing is live until it reaches `main`. Work on
  `claude/pensive-ramanujan-alwe61` persists but does not deploy. Publishing
  `streaming/` to `main` is the single outward-facing step and is gated on explicit
  user approval.
- **Verification constraint:** `github.io` is unreachable from the build container,
  so live verification is done via the GitHub deployments + contents API at the
  deployed SHA, plus local Playwright rendering — matching both prior builds.

## 4. New-lab architecture decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Directory | New `streaming/` sibling | Zero blast radius on existing tools |
| Framework | None (vanilla ES modules) | Conform to monorepo; reliable Pages deploy |
| Routing | Hash router + `LOADERS` map + `?v=BUILD` | Proven pattern in both apps |
| Components | One reconciled shared layer (I08) | Ends the kafka/flink drift |
| State | `sml-*` localStorage namespace | No collision with `kafka-*`/flink keys |
| Content registry | `data/registry.js` stable concept IDs | Enables cross-links, search, concept graph |
| Scenarios | Global switcher, data-driven (A Uber / B E-commerce) | Core product requirement |
| Accuracy | PyFlink + cloud facts validated vs official docs | Release requirement |

## 5. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Accidental edit to a protected tool | New lab lives only under `streaming/`; CI diff review before any `main` push |
| localStorage key collision | `sml-*` namespace (I13) |
| Stale browser cache after deploy | `?v=BUILD` cache-buster |
| Content loss during port | Preservation manifest (I03) + regression suite (I27) |
| Cloud facts drifting from reality | Per-curriculum accuracy pass (I38/I44/I51) against official docs |
