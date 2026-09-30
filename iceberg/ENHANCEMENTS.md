# Iceberg Visualizer — Enhancements Applied

This app was enhanced in 8 iterations following the SnowflakeViz enhancement
playbook. Everything is additive vanilla HTML/CSS/JS — no build step. Only
`iceberg-visualizer/` was touched (plus the shared deploy workflow's syntax gate).

**Live:** https://rajesh-satuluri.github.io/NewVisual/

## What was added

| Iter | Area | Highlights |
|---|---|---|
| 1 | Verification | `scripts/check-syntax.mjs` (node --check gate, also in CI) + `scripts/verify.mjs` (headless Chromium sweep). Fixed a metadata-explorer overflow. |
| 2 | Responsive & touch | `css/responsive.css`: off-canvas drawer + hamburger ≤1024px, `100dvh`, 44px touch targets, hover gating, `prefers-reduced-motion`. |
| 3 | Theme + PWA | Fixed the **broken light theme** (added `[data-theme=light]` tokens); no-flash head script; favicon/apple-touch/manifest; OG/Twitter image. |
| 4 | Event bus + routing | `app:navigate` CustomEvent; `#screen/step` deep links; last-screen resume. |
| 5 | UX power features | Command palette (⌘/Ctrl-K), progress meter + visited checkmarks, prev/next pager, swipe gestures, first-run tour, shared `IV.toast()`. |
| 6 | Content architecture | Per-screen `QuestionBank`; auto "Test Yourself" quiz w/ best-score; **Study Deck** (filterable aggregate); printable cheat sheet. |
| 7 | Navigation | Animated collapse (`grid-template-rows`), collapse/expand-all, persisted state, clearer labels. |
| 8 | Audit | Full sweep both themes × 3 widths + a11y spot-check. |

## Architecture conventions (keep these)

- **Global namespace:** `window.IcebergViz` (aliased `IV`).
- **Modules** self-register: `IV.modules['id'] = { id, title, group, render(container), destroy() }` and load via a `<script>` tag in `index.html`.
- **Nav registry** lives in `js/app.js` `NAV_GROUPS`; accessors: `IV.getScreens()`, `IV.getNavGroups()`, `IV.currentScreenId()`.
- **Feature decoupling:** features under `js/features/` listen for `document` event `app:navigate` (`{detail:{id}}`) and use the accessors above — add a feature by adding a listener, not by editing the router.
- **Design tokens:** all colors/spacing via CSS custom properties in `css/main.css`; light theme overrides `:root[data-theme="light"]`. New CSS goes in additive files loaded last: `responsive.css` → `enhancements.css` → `print.css` (media=print).
- **Content data:** `js/data/question-bank.js` (`IV.QuestionBank[screenId]`, `IV.collectQA(screenId)`); glossary/interview in `js/data/iceberg-concepts.js`.

### Adding a quiz to a screen
Add `IV.QuestionBank['<screenId>'] = [{ q, options, correct, explanation, difficulty }]`.
"Test Yourself" and the Study Deck pick it up automatically — no other wiring.

## Verifying locally

```bash
cd iceberg-visualizer
npm install                 # playwright (uses pre-installed Chromium)
node scripts/check-syntax.mjs   # node --check every JS file
node scripts/verify.mjs         # 29 screens × 2 themes × 3 viewports + feature/a11y checks
node scripts/gen-assets.mjs     # regenerate icons + OG image
```

`node_modules/` and `.verify-artifacts/` are gitignored. The deploy workflow
(`.github/workflows/deploy-pages.yml`) runs the syntax gate before publishing.
