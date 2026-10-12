# UI/UX Design System

> Phase 0 audit deliverable. Documents the tokens and shared components already
> in `styles.css` and `components/`. Verified against the tree.

## Design tokens (`:root` in `styles.css`)

- **Color:** `--bg`, `--bg2..4`, `--border`, `--text`, `--text2/3`, `--accent`,
  `--accent2`, `--accent-lo`, semantic `--ok`/`--warn`/`--err`.
- **Radius:** `--radius`.
- **Theme:** `data-theme="dark|light"` on `<html>`, tokens redefined per theme;
  no-flash inline script applies saved theme before first paint.
- **Canvas:** sim backgrounds hardcoded `#0A0E1A` (`CANVAS_BG` in `sim-ui.js`).

## Shared components

| Component | Source | Provides |
|---|---|---|
| Lesson shell | `components/lesson-shell.js` | `createLessonShell`, `initTabs`, `iqSection`, `flowDiagram`, `compareTable`, `codeBlock`, `keyPoints`, `callout`, `twoCol` |
| Sim UI | `components/sim-ui.js` | `setupCanvas`, `clear`, `roundRect`, color palette `C`, `metricsPanel`, `controlRow`, `btn`, `slider`, `legendRow` |
| Nav | `components/nav.js` | `renderNav`, `setActive`, `updateProgress` |
| Scenario switcher | `components/scenario-switcher.js` | `initScenarioSwitcher` |
| Module shell | `components/module-shell.js` | page header / breadcrumb helpers |

## Callout kinds

`callout(kind,…)` → `.lx-info` / `.lx-warn` / `.lx-ok` / `.lx-danger`.

## Accessibility baseline (Gate 8)

`:focus-visible` outlines, nav-item focus, `mark` highlight styling, canvas
`max-width`, `prefers-reduced-motion`, mobile control stacking at `max-width:560px`.
Further a11y verification is Phase 8.

## Shared chrome

Header action bar (`.header-actions.topbar-right`): scenario switcher, theme
toggle, plus shared **Backup**/**Home** pills (`../shared/backup-button.js`),
matching every sibling tool.

## Known UX gaps (later phases)

- Glossary is a flat list; knowledge-map graph is Phase 6.
- Lesson "explanation levels" (beginner/intermediate/advanced) exist only in the
  glossary depth toggle today; broader rollout is optional polish.
