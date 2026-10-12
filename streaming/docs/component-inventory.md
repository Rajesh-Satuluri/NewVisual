# Component Inventory & Reuse Ledger — Streaming Engineering Master Lab

> **Purpose (I04).** Catalogue every reusable UI/logic component across `kafka/`
> and `flink/`, classify how much the two apps have diverged, and decide — per
> component — what the new `streaming/` shared layer adopts, merges, or builds
> fresh. This is the blueprint for the de-drifted shared component layer built in
> I08.
>
> **Headline finding:** the two apps **share seven component *names* but no shared
> code** — all seven have drifted independently. There is no common library today.
> The new lab therefore builds **one reconciled shared layer** (`streaming/components/`),
> picking the better implementation per component, rather than importing from either
> app. Source components stay untouched in place.

---

## 1. Component census

### 1.1 Kafka components (`kafka/components/`) — 13

| Component | Role | Disposition in new lab |
|-----------|------|------------------------|
| `canvas-primitives.js` | Shared canvas drawing helpers for simulators | **ADOPT** — Kafka-only, needed by every canvas sim |
| `module-shell.js` | `createModuleShell` / `initTabs` | **MERGE** (see §2) |
| `nav.js` | Sidebar nav tree | **REBUILD** — new 12-section IA (I09) |
| `command-palette.js` | ⌘K palette | **MERGE** |
| `quiz.js` | Quiz renderer | **MERGE** |
| `pager.js` | Prev/next pager | **MERGE** |
| `toast.js` | Toast notifications | **MERGE** |
| `tour.js` | First-visit guided tour | **MERGE** |
| `investigation-flow.js` | Incident investigation stepper | **ADOPT** → Incident Lab (I66) |
| `choose-approach.js` | "Choose an approach" decision UI | **ADOPT** → Decision Engine (I64) |
| `self-explain.js` | Self-explanation prompts | **ADOPT** — learning-science feature |
| `tiered-answer.js` | Progressive multi-tier answers | **ADOPT** → multi-level explanations (I77) |
| `keyboard.js` | Keyboard-shortcut handling | **ADOPT** — accessibility (I78) |

### 1.2 Flink components (`flink/components/`) — 8

| Component | Role | Disposition in new lab |
|-----------|------|------------------------|
| `module-shell.js` | `createModuleShell` / `initTabs` | **MERGE** (see §2) |
| `nav.js` | Sidebar nav tree | **REBUILD** |
| `command-palette.js` | ⌘K palette | **MERGE** |
| `quiz.js` | Quiz renderer | **MERGE** |
| `pager.js` | Prev/next pager | **MERGE** |
| `toast.js` | Toast notifications | **MERGE** |
| `tour.js` | First-visit guided tour | **MERGE** |
| `story-ui.js` | Ride-spine story primitives (`rideSpine`, `rideCallout`, `pyCode`, `scenarioCard`) | **ADOPT** — Flink-unique; generalize to scenario-agnostic story UI (I21) |

---

## 2. Drift analysis — the 7 same-named components

Every component that exists in both apps has **drifted** (none are byte-identical).
Severity drives the merge effort in I08.

| Component | Kafka bytes | Flink bytes | Differing lines | Drift severity | Merge strategy |
|-----------|-----------:|-----------:|----------------:|----------------|----------------|
| `module-shell.js` | 2,370 | 2,364 | 2 | **Trivial** | Diff the 2 lines; take union; single canonical shell |
| `toast.js` | 892 | 930 | 6 | **Trivial** | Take the richer (Flink) version |
| `pager.js` | 1,083 | 1,220 | 17 | **Low** | Reconcile; prefer Flink (larger/newer) |
| `tour.js` | 3,946 | 4,111 | 39 | **Moderate** | Reconcile selectors + copy |
| `quiz.js` | 4,157 | 4,381 | 44 | **Moderate** | Reconcile; ensure both quiz-bank shapes supported |
| `command-palette.js` | 4,135 | 3,726 | 60 | **Moderate** | Reconcile command registries |
| `nav.js` | 9,883 | 8,532 | 188 | **High (fork)** | **Rebuild** against new IA, not merge |

> **Why "merge" not "import from one app":** importing Kafka's shell would silently
> drop Flink's 2-line delta (and vice-versa). Each app's modules were written
> against *their* shell's exact contract. The new shell must satisfy **both**
> contracts so ported modules render unchanged — that is a reconciliation, verified
> by the preservation suite (I27), not a copy.

---

## 3. Reuse ledger — new-lab shared layer (`streaming/components/`)

Built in **I08** unless noted. Each entry names its source of truth.

| New component | Built from | Notes |
|---------------|-----------|-------|
| `module-shell.js` | merge(Kafka, Flink) | Canonical `createModuleShell` + `initTabs`; both contracts satisfied |
| `lesson-shell.js` | NEW | Wraps module-shell for non-Kafka/Flink curricula (Foundations, Cloud) |
| `code-block.js` | Flink `story-ui.pyCode` + generalize | Syntax-highlighted, copyable, language-tagged |
| `quiz.js` | merge | Supports both quiz-bank shapes |
| `toast.js` | Flink | Richer variant |
| `pager.js` | Flink | — |
| `tour.js` | merge | — |
| `command-palette.js` | merge | Registry extended for new sections |
| `canvas-primitives.js` | Kafka (adopt) | Drawing helpers for all simulators |
| `story-ui.js` | Flink (adopt + generalize) | Scenario-agnostic story spine (Uber *and* e-commerce) |
| `investigation-flow.js` | Kafka (adopt) | Incident Lab engine base (I66) |
| `choose-approach.js` | Kafka (adopt) | Decision Engine base (I64) |
| `tiered-answer.js` | Kafka (adopt) | Multi-level explanations (I77) |
| `self-explain.js` | Kafka (adopt) | Learning-science feature |
| `keyboard.js` | Kafka (adopt) | A11y shortcuts (I78) |
| `nav.js` | REBUILD | New 12-section IA + Cloud sub-tabs (I09) |
| `scenario-switcher.js` | NEW | Global Scenario A/B switch (I12) |

---

## 4. Summary

- **21 distinct components** across the two apps (13 Kafka + 8 Flink; 7 names
  overlap but all drifted).
- **7 to merge**, **8 to adopt as-is**, **1 to adopt-and-generalize** (`story-ui`),
  **1 to rebuild** (`nav`), **2 brand-new** (`lesson-shell`, `scenario-switcher`),
  plus `code-block` generalized from Flink's `pyCode`.
- **No source component is modified or moved** — the new lab references its own
  reconciled copies under `streaming/components/`.
- **Next:** I05 writes the four architecture/planning docs (architecture-audit,
  migration-plan, technical-accuracy-review, implementation-roadmap).
