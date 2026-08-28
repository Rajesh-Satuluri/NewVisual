# Resume Builder

A block-based résumé builder, part of the [NewVisual](../) monorepo.
Pure HTML + CSS + vanilla JS, no framework, no build, no backend.

Live: `https://rajesh-satuluri.github.io/NewVisual/resume-builder/`

## What it does

- **Every block is editable.** Header (name, role, contact items), and every
  section below it. Section headings themselves are editable, and you can
  add / rename / reorder / delete sections and the items inside them.
- **Three section layouts:**
  - *Paragraph* — e.g. Professional Summary (supports `**bold**`).
  - *Labeled rows* — an editable side-heading + text, e.g. Technical Skills
    (`Programming & Data Processing: …`) and Awards.
  - *Entries* — title, date range, italic meta/tech line, and bullet points,
    e.g. Professional Experience, Projects, Education.
- **Add custom sections** (e.g. Certifications) with any layout.
- **Live A4 preview** that matches the résumé template exactly.
- **Download PDF** via the browser's print dialog → true vector,
  text-selectable, ATS-friendly PDF (choose "Save as PDF").
- **Import / Export JSON** to back up or move your résumé between machines.
- **Auto-save** to `localStorage` — your data never leaves your browser.

## Files

```
resume-builder/
├── index.html      # app shell (top bar, editor panel, preview panel)
├── css/styles.css  # UI + resume (screen) + print/PDF styles
└── js/app.js        # data model, sample resume, editor + preview render
```

## PDF export

The Download PDF button calls `window.print()`. A dedicated `@media print`
stylesheet hides the editor/toolbar and lays the résumé out on A4. In the
print dialog choose **Save as PDF** as the destination. Because the PDF is
generated from real text (not a screenshot), it stays crisp and parseable by
applicant-tracking systems.
