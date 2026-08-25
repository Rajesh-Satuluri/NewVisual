# Blind 75 — Interactive DSA Study Lab

An interactive study tool for the **Blind 75** LeetCode problems. For every problem:

- **Problem Description** — a faithful paraphrase (not copyrighted LeetCode text), with constraints and notes
- **Examples** — 3–5 worked examples with step-by-step reasoning and ASCII visuals
- **Complete Logic in Plain English** — the derivation and intuition, not a line-by-line code translation
- **RCS Code** — Python with parallel explanatory comments (for revision)
- **Plain Python Code** — the same algorithm, clean, so you can read it yourself
- **Complexity**, **Pattern Recognition** and **Interview Recall** cues
- One or two **approaches** (naive → optimal) where the contrast is genuinely instructive

**Live:** https://rajesh-satuluri.github.io/NewVisual/blind75-visualizer/

## Study features

- Category sidebar with per-problem status (○ Not Started / ◐ Learning / ✓ Solved) and a progress bar
- Approach switcher + **RCS ↔ Plain Python** toggle, collapsible sections, copy button
- **Recall mode** — blur logic + code until you click to reveal (attempt first, then check)
- Fuzzy **search** (title, category, pattern, data structure, technique) and **filters** (difficulty, status, pattern, review queue)
- **Review queue**, per-problem **notes**, pattern-tag cross-linking
- **All-75 revision grid**, **export/import** progress as JSON, keyboard navigation
- Progress persists in `localStorage` (namespaced `blind75:`) — no backend

## Stack

Pure HTML + CSS + vanilla JS, no framework, no bundler — served directly from GitHub Pages.
Content is split into one data module per category under `data/`, loaded by a small app in `js/`.

Vendored libraries (in `js/vendor/`, `css/`):
- [Prism.js](https://prismjs.com/) 1.29.0 — syntax highlighting (MIT License)
- [Fuse.js](https://fusejs.io/) 7.0.0 — fuzzy search (Apache-2.0 License)

## Local development

```bash
cd blind75-visualizer
python3 -m http.server 8080
# open http://localhost:8080
```

## Keyboard shortcuts

`/` focus search · `j`/`k` or ↑/↓ prev/next problem · `r` RCS code · `p` plain code · `b` toggle recall mode · `1`/`2`/`3` set status · `Esc` close dialog
