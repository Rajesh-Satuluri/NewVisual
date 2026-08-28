# Resume Builder

A master content **Library** plus multiple role-tailored **Resumes**, part of the
[NewVisual](../) monorepo. Pure HTML + CSS + vanilla JS, no framework, no build,
no backend.

Live: `https://rajesh-satuluri.github.io/NewVisual/resume-builder/`

## What it does

**Two tabs, one shared template.**

- **Resumes** — create as many resumes as you like, each a self-contained
  document you edit directly:
  - Pick a resume from the chips at the top, then edit **all of its content**
    — header, summary, skills, experience, projects, education, awards, and any
    custom section — right there. Every wording change is per-resume.
  - Reorder sections, change a section's layout, add custom sections.
  - **New / Duplicate / Delete** resumes; name each and tag it with a target
    role/company.
  - **Add from Library** to pull saved material into the current resume, or
    **★ Save to Library** to file a section away for reuse.

- **Library** — your personal document store. Keep all your material here
  (multiple summaries, jobs, projects, skills, education, awards) for reference
  and reuse. Editing the Library never changes a resume; use **＋ To resume**
  (or **Add from Library** inside a resume) to copy an item in.

**Shared output for the active resume:**

- Live A4 preview that matches the template exactly
- Strict **one page**: a live "1 page / over 1 page" badge, and when a resume
  overflows the *Add to resume* checkboxes are disabled until it fits
- **Download PDF** via the browser print dialog — vector, text-selectable,
  ATS-friendly, with no browser header/footer (`@page { margin: 0 }`)
- Distinct company + role lines per entry (ATS scores role titles)
- **Import / Export** all data (library + every resume) as one JSON file
- **Auto-save** to `localStorage` — your data never leaves your browser

## Data model

```
{
  library: { summaries[], skills[], experiences[], projects[], education[], awards[] },
  resumes: [
    { id, name, targetRole,
      profile: { name, title, contacts[] },
      sections: [ { id, title, type, text | items[] } ] }   // self-contained
  ],
  activeResumeId
}
```

Each resume owns its full content (`profile` + `sections`), so edits are
per-resume. The Library is a separate reference pool. Older saves are migrated
automatically: `newvisual.resume.v1` (single flat resume) and
`newvisual.resumedata.v2` (library + include-based resumes) both convert into
self-contained resumes plus a reference Library.

## Files

```
resume-builder/
├── index.html      # app shell: tabs, editor panel, preview panel
├── css/styles.css  # UI + resume (screen) + print/PDF styles
└── js/app.js        # data model, migration, Library + Resumes UI, preview
```
