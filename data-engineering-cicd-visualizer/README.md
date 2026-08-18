# Data Engineering CI/CD — Interactive Visualizer

An interactive learning lab that teaches CI/CD for Data Engineers — beginner → intermediate → proficient — through one continuous business story: **RetailFlow's Daily Revenue Pipeline**, following a single code change from a developer's laptop to the 7 AM executive dashboard.

**Topic:** Data Engineering CI/CD & DevOps · **Namespace:** `DECICDViz` · **Recurring org:** RetailFlow

## Status

Scaffold complete (build iterations 1–3): the engine, routing, design system, full ROI-ordered navigation, and the recurring RetailFlow lens are live. Concept modules (Git, GitHub Actions, Terraform, Docker, dbt, …) land in later iterations; until then each route renders the engine's "coming soon" screen with correct titles and navigation.

## Stack

Pure HTML + CSS + vanilla JS — no bundler, no framework, no CDN. Reuses the architecture of the sibling `airflow-visualizer` (self-registering IIFE modules, hash router with lazy module loading, shared components, design tokens, a centrally-appended business lens) with an independent global namespace so the two apps never collide.

## Local development

```bash
cd data-engineering-cicd-visualizer
python3 -m http.server 8080
# Open http://localhost:8080
```

## Architecture

- `js/core/*` — router, animation engine, keyboard, tooltip
- `js/components/*` — arch-diagram, animation-controls, code-viewer, state-machine, timeline, data-engineering-lens
- `js/data/*` — `retailflow-data.js`, `cicd-concepts.js`
- `js/modules/*` — one self-registering module per route (added per build batch)
- `css/*` — shared design tokens + layout/components/animations
