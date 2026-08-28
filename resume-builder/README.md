# Resume Builder

A master content **Library** plus multiple role-tailored **Resumes**, part of the
[NewVisual](../) monorepo. Pure HTML + CSS + vanilla JS, no framework, no build,
no backend.

Live: `https://rajesh-satuluri.github.io/NewVisual/resume-builder/`

## What it does

**Two tabs, one shared template.**

- **Library** — your master store of content, each item saved on its own:
  - Identity (name, role, contact details)
  - Multiple professional summaries
  - A pool of work experience, projects, skill categories, education, and awards
  - Edit an item once and every resume that uses it updates.

- **Resumes** — create as many role-tailored resumes as you like, all using the
  same template:
  - Pick which summary to use, and tick which experiences / projects / skills /
    education / awards to include
  - Reorder included items and reorder sections
  - Name each resume and tag it with a target role/company
  - **New / Duplicate / Delete** resumes

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
  library: {
    profile: { name, title, contacts[] },
    summaries[], skills[], experiences[], projects[], education[], awards[]
  },
  resumes: [
    { id, name, targetRole, summaryId,
      picks: { skills[], experiences[], projects[], education[], awards[] },
      sectionOrder[] }
  ],
  activeResumeId
}
```

An earlier single-resume save (`newvisual.resume.v1`) is migrated automatically:
its blocks seed the Library and one default resume is created that includes them.

## Files

```
resume-builder/
├── index.html      # app shell: tabs, editor panel, preview panel
├── css/styles.css  # UI + resume (screen) + print/PDF styles
└── js/app.js        # data model, migration, Library + Resumes UI, preview
```
