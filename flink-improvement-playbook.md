# Learning-Tool Improvement Playbook

*A repeatable process for bringing a module-based learning/visualizer tool
(like `flink/`) up to the content + UI/UX standard of the reference tools
(`snowflake`, `airflow-visualizer`). Written from the Flink work so you can run
the same passes on another tool.*

---

## 0. What this tool's architecture looks like

Before changing anything, confirm the target tool follows the same shape. All
the tools here are the **same kind of app**:

- **Vanilla-JS ES-module SPA** — no framework, no build step.
- **Lazy module loading** via dynamic `import()`. Each learning module lives in
  `modules/<name>.js` and exports a `mount(container)` function that renders into
  a passed-in element and *optionally returns a cleanup function*.
- **Hash-based routing** — `#m01`, `#comparison`, etc. A central
  `onHashChange` handler in `script.js` maps the hash to a loader and swaps the
  mounted module.
- **Design tokens in CSS** — CSS custom properties (`--bg-card`, `--text-primary`,
  `--red`, …) defined on `:root`, re-defined under `[data-theme="light"]` /
  `[data-theme="dark"]` for theming.
- **Deployed via GitHub Pages** from `main` using
  `.github/workflows/deploy-pages.yml` (GitHub Actions, concurrency group
  `pages`, `cancel-in-progress: false`). **A push to `main` is the deploy
  trigger.**

If the other tool matches this, everything below transfers directly.

---

## 1. Analysis pass — find the *real* gaps

The lesson from Flink: **don't trust filenames or first impressions.**

- Flink's modules were named `mXX-placeholder.js`, which *looked* like empty
  stubs. They were not — they held real, rich content. **Verify actual rendered
  content before concluding anything is missing.**
- The real gaps were **UI/UX polish and structure**, not empty content.

### How to actually see the tool (egress to `*.github.io` is blocked)

You can't `WebFetch` the live GitHub Pages site from this environment. Instead:

1. Pull the current tool source from the repo (it's already in the working dir,
   or `git archive origin/main -- <tool>/ | tar -x` into scratch).
2. Serve it locally and drive it with headless Chromium (see §5).

### What to compare against the reference tools

Walk the reference tools (`snowflake`, `airflow-visualizer`) and list features
the target is missing. For Flink the missing **structural** features were:

| Feature | What it is |
|---|---|
| **Rich home/landing page** | Hero, stats strip, a "story" banner, curriculum grid with per-module blurbs, reference links — not just a bare module list. |
| **Comparison module** | "X vs Y vs Z" — feature matrix, when-to-use, interview Q&A. |
| **Glossary** | Searchable + category-filterable terms. |
| **Cheat-sheet** | Quick-reference cards (APIs / config / CLI). |
| **Master map** | End-to-end pipeline diagram with clickable nodes that deep-link into modules. |
| **Command palette** | Cmd/Ctrl-K fuzzy jump across everything. |

Deliver the analysis as a written list of concrete, buildable items — not vague
"improve the UI."

---

## 2. Fix the systemic CSS bug first (highest leverage)

This was the single biggest visible win on Flink and is likely present in any
sibling tool that was copy-adapted.

**Symptom:** modules reference CSS variables that were never defined, so
surfaces render transparent/broken (e.g. `var(--surface)`, `var(--text)` used in
modules but only `--bg-card`, `--text-primary` defined in `styles.css`).

**How to find it:**

```bash
# list every var() referenced in modules
grep -rhoE 'var\(--[a-z0-9-]+\)' <tool>/modules | sort -u
# list every var defined in the stylesheet
grep -oE '^\s*--[a-z0-9-]+:' <tool>/styles.css | sort -u
# the difference = undefined tokens
```

On Flink this surfaced **75 undefined-var references**. Fix by adding **aliases**
in `styles.css` (don't rename everything in every module):

```css
/* after the real token definitions */
--surface:  var(--bg-card);
--surface2: var(--bg-elevated);
--text:     var(--text-primary);
```

Do the same aliasing under each theme block if the aliased tokens differ per
theme. This one change restored multiple modules' surfaces at once.

---

## 3. Build the missing modules

Each new module is a file in `modules/` exporting `mount(container)`. Reuse the
existing shared helpers (Flink had `createModuleShell` — check what the target
tool provides and match its conventions exactly).

Modules built for Flink (use as templates):

- `home.js` — hero + stats strip + story banner + curriculum grid (a `BLURB` map
  keyed by module id) + reference links. **Make this the default route.**
- `comparison.js` — feature matrix, when-to-use table, interview Q&A.
- `glossary.js` — array of `TERMS`, live search box + category filter.
- `cheatsheet.js` — array of quick-reference `CARDS`.
- `master-map.js` — pipeline `STAGES` with clickable nodes using a
  `data-goto="<hash>"` attribute wired to navigation.

### Wire them into navigation

The nav/router needs to know about the new pages. On Flink:

- `components/nav.js` — export an `EXTRAS` array (the non-numbered pages) and a
  `HOME` entry; add `getNavItem(id)`; update `buildGroups()` to append synthetic
  groups for the extras.
- `script.js` — extend the `LOADERS` map (home + semantic module paths +
  reference pages); default `onHashChange` to `'home'`; build breadcrumbs via
  `getNavItem`; wire the brand/logo click to go home.
- `components/command-palette.js` — include the new items:
  `ITEMS = [...HOME, ...MODULES, ...EXTRAS]`.

### Rename placeholder files to semantic names

Flink's `mXX-placeholder.js` → `mXX-<topic>.js` (e.g.
`m02-streaming-fundamentals.js`). Use `git mv` so history is preserved, and
update the loader paths in `script.js` to match.

---

## 4. Inline-style cleanup (do it incrementally, safely)

Flink had ~634 inline `style="…"` attributes. Goal: extract the **repeated** ones
into a small shared utility/semantic CSS layer. **Do not** make single-use
classes for one-off styles — that just moves noise into CSS.

### The rule

- Convert a literal only if it repeats. On Flink, converting the repeated ones
  removed **205 inline styles (634 → 431)**; the remaining ~352 were genuine
  one-offs (nothing repeated more than 3×) and were **left inline on purpose**.
- **Never touch dynamic styles** — anything containing `${...}` interpolation.

### The safe transformer

`scratchpad/destyle.py` (in this session's scratchpad) does this correctly. Key
design points, because the naive version has a nasty bug:

- **Bug to avoid:** if you blindly append a `class` attribute, an element that
  already has `class="…"` *somewhere else in the tag* ends up with **two `class`
  attributes**, and the browser silently drops one. Caught this on Flink's m08.
- **The fix (tag-aware, two-pass):**
  1. Replace each exact `style="LITERAL"` with a sentinel token (`\x00cls\x00`).
  2. For every HTML tag, fold its sentinel tokens into that tag's **single**
     class attribute — merging with an existing `class` wherever it sits, or
     adding one if none exists.
- **Safety guard:** refuse to write the file if any `\x00` sentinel remains.
- Only exact full-attribute literals match, so dynamic `${}` styles are never
  touched.

Build a `MAP` of literal-style-string → class-name, longest/compound literals
first. The utility layer added to `styles.css` for Flink (a good starting set):

`.eyebrow`, `.eyebrow-10`, `.eyebrow-flow`, `.section-eyebrow`, `.prose`,
`.prose-sm`, `.card-title`, `.form-hint`, `.legend-row`, `.pill-box`,
`.t-sec/.t-muted/.t-pri/.t-red` (text colors), `.fs-11/12/125/14/28/36` (type
scale), `.p-20/.p-24`, `.mt-12/.mt-16`, `.mb-12/.mb-20`, `.gap-20`, `.flex-1`,
`.scroll-x`.

### Work in batches

Batch 1 = the few heaviest modules, verify (§5), commit. Batch 2 = the rest,
verify, commit. After each batch, **grep-sanity-check for double class
attributes**:

```bash
grep -nE '<[^>]*\bclass="[^"]*"[^>]*\bclass="' <tool>/modules/*.js
```

Must return nothing.

---

## 5. Verify headlessly before every deploy

Egress to the live site is blocked, so verify locally with Playwright + the
pre-installed Chromium. Copy `scratchpad/test-flink.mjs` and adjust `ROOT` and
the `routes` array.

**Environment gotchas (already solved):**

- Playwright is global CommonJS at `/opt/node22/lib/node_modules/playwright`.
  Import it as:
  ```js
  import pw from '/opt/node22/lib/node_modules/playwright/index.js';
  const { chromium } = pw;   // NOT: import { chromium } — that errors
  ```
- Launch with the pre-installed browser, don't download:
  ```js
  chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  ```
- `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` is already set. **Never run
  `playwright install`.**

**What the test does:** spins up a tiny static file server, loads each `#route`,
asserts the module **mounted** (canvas has real content, not "Coming Soon") and
that there were **zero console/page errors**, screenshots each route, and also
flips to `data-theme="light"` to catch theme regressions.

**Bar to clear before deploy:** every route mounts, **zero console errors**, in
**both light and dark**. On Flink this was 25 routes clean.

> Watch for pre-existing bugs while testing. Flink's m03 threw on load because it
> called `.click()` on an SVG `<g>` element (SVG elements have no `.click()` in
> Chromium). Fix: `el.dispatchEvent(new MouseEvent('click', { bubbles: true }))`.
> To confirm a bug is pre-existing, `git stash` your changes and re-run.

---

## 6. Commit, push, deploy

- Work on the designated feature branch; commit with clear messages.
- Push with `git push -u origin <branch>`; retry on network errors with
  exponential backoff (2s/4s/8s/16s).
- **Only open a PR if explicitly asked.**
- A merge to `main` triggers the Pages deploy workflow. Confirm success:
  - Find the workflow run for your merge commit
    (`mcp__github__actions_list` / `actions_get`), check
    `status: completed`, `conclusion: success`.
  - Confirm your commit is an ancestor of `origin/main` and grep `main` for a
    marker of your change (e.g. a new utility class, the bug-fix line).
- If a push is rejected non-fast-forward because `main` took a squash merge,
  `git push --force-with-lease` is safe *only* when the content is already merged
  and no one else is on the branch.
- Watch for concurrent changes from your other sessions landing on `main` at the
  same time — confirm your commit sits cleanly on top and both deployed.

---

## 7. Suggested order of operations for the next tool

1. Serve it locally + screenshot every route (baseline).
2. Run the undefined-CSS-var diff → add token aliases. Re-verify.
3. List missing structural features vs. the reference tools.
4. Build the missing modules (home first — it's the default route and biggest
   first-impression win).
5. Wire nav + router + command palette.
6. Rename any placeholder files to semantic names.
7. Incremental inline-style cleanup (repeated styles only), batch + verify.
8. Full headless verification (all routes, zero errors, light + dark).
9. Commit, push, confirm deploy is green.

---

## Appendix — reusable assets in this session's scratchpad

- `scratchpad/destyle.py` — the safe, tag-aware inline-style→class transformer.
- `scratchpad/test-flink.mjs` — headless route tester (serve + mount check +
  console-error check + screenshots + light-theme check).

Point `ROOT` / `sys.argv` file paths at the new tool's directory and they work
as-is.
