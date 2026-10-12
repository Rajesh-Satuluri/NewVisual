# Design System — Cloud Data Engineering Visualizer

_The premium visual language the redesign converges on. Dark-first, light fully supported. Technical, calm, precise. Built on the existing 147 CSS custom properties — we extend and consolidate, we do not restart._

## 1. Design tokens (dark mode starting values)

These are the canonical names Phase 1 introduces/aligns in `:root`. Light mode redefines them under `:root[data-theme="light"]`.

| Token | Dark value | Role |
|---|---|---|
| `--app-bg` | `#0B1120` | Application background |
| `--sidebar-bg` | `#0E1728` | Sidebar / nav surface |
| `--surface` | `#111C2E` | Primary surface / card |
| `--surface-elevated` | `#162237` | Elevated surface / popover |
| `--border-subtle` | `#29374D` | Hairline borders (prefer over shadow) |
| `--text-primary` | `#F1F5F9` | Primary text |
| `--text-secondary` | `#A7B4C9` | Secondary / metadata |
| `--accent` | `#65AFFF` | Primary action accent |
| `--success` | `#34D399` | Success / mastered |
| `--warning` | `#FBBF24` | Warning / partial |
| `--error` | `#F87171` | Error / failed |

Existing format/brand accent tokens (azure/databricks/aws/fabric gradients) are preserved — they theme the active format and must not be flattened into the single accent.

## 2. Typography

- **Inter** (UI/body) + **JetBrains Mono** (code/technical identifiers), already self-hosted.
- Scale (rem): page title `1.75`, section heading `1.25`, card title `1.0625`, body `0.9375`, metadata `0.8125`, mono/code `0.875`.
- Line-height: body `1.6`, headings `1.25`. Readable measure: body max ~72ch.
- No oversized dashboard headings; restraint over decoration.

## 3. Spacing & layout

- Spacing scale (px): `4 · 8 · 12 · 16 · 24 · 32 · 48` as `--space-1..7`.
- Sidebar width `260` (collapsed `64`). Content max-width `1120`. Page padding `24` (mobile gutter `16`).
- One consistent grid; card padding `16–24`; grid gap `16`.

## 4. Primitive components (Phase 1 deliverables)

Buttons · icon buttons · inputs · search · select · tabs · breadcrumbs · cards · status indicators · badges · tooltips · popovers · modals · drawers · progress bar · progress ring · tables · code block (+copy) · empty state · loading skeleton · error state · confirm dialog · toast · diagram node · assessment question card.

**Required states per component:** default · hover · focus · active · disabled · loading · error (where applicable).

## 5. Icons

Single inline-SVG set (the stroke-based set already in `app.js`). No emoji/ad-hoc Unicode for primary navigation. Icons aid recognition, not decoration.

## 6. Accessibility baseline

Keyboard nav · visible focus rings · semantic headings · real button/link semantics · accessible names on icon-only buttons · WCAG-AA contrast on both themes · screen-reader feedback for async actions · `prefers-reduced-motion` honored · non-color status cues (icon/label, not color alone) · focus-trapped modals/drawers.

## 7. Migration policy

- New colors go through tokens; the ~566 inline JS hex literals are migrated opportunistically (brand SVGs may keep literal stops).
- Both themes stay functional after every change.
- Reusable primitives replace duplicated styling where practical — additive, never removing working markup wholesale.
