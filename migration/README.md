# Hub-and-spoke migration kit

Splits the **NewVisual** and **My-Projects** monorepos into **one repo per tool**
(22 spokes) plus **one hub home page**, so deploying any tool can never affect
another — and gives you a single front door that links to every tool.

```
rajesh-satuluri.github.io   ← the hub (this folder's hub/index.html)
        ├── airflow-visualizer/          ┐
        ├── sql-visualizer/              │ each an independent repo,
        ├── kafka-visualizer/            │ its own GitHub Pages site,
        └── … 22 spokes total            ┘ deploys on its own
```

## Why this is lossless

- Your **`NewVisual` and `My-Projects` repos are never modified**. The script
  clones them read-only. They remain complete archives of everything, including
  the full history and the large files (14 MB PDF, 2.1 MB notebook).
- Each spoke is created with **`git subtree split`**, which carries that folder's
  **real commit history** into the new repo (verified: e.g. `airflow-visualizer`
  keeps all its commits, with `index.html` at the repo root).
- The big files sit at the *repo roots*, outside any tool folder, so the spokes
  come out **automatically clean** — no bloat is copied forward.
- Re-runnable and additive: nothing is deleted anywhere. Rollback = just delete a
  spoke repo; the source is untouched.

## Files

| File | What it is |
|------|-----------|
| `tools.tsv` | The manifest: one line per tool → new repo name, source repo, folder. **Edit repo names here** before running if you want different names. |
| `migrate.sh` | The migration script (dry-run by default). |
| `hub/index.html` | The hub home page for the `rajesh-satuluri.github.io` repo. Links all 22 tools. |
| `hub/.nojekyll` | Tells Pages to serve files verbatim (no Jekyll). |

## Prerequisites (run on your own machine)

The Claude session that generated this kit can push to `NewVisual` but is **not
permitted to create new repositories**, so the repo-creating step is run by you.
It needs:

1. **Git** ≥ 2.20 (for `git subtree`).
2. **GitHub CLI** [`gh`](https://cli.github.com/), authenticated as the owner:
   ```bash
   gh auth login          # choose GitHub.com, HTTPS, authenticate
   gh auth status         # confirm you're logged in as Rajesh-Satuluri
   ```
   > Alternatively, let Claude do it: reconnect the Claude GitHub App with
   > repo-creation (Administration) access at https://claude.ai/connect-github,
   > then Claude can run this same script for you.

## Run it

```bash
cd migration

# 1. See the plan — creates nothing:
./migrate.sh

# 2. PILOT one tool first (recommended), verify it works end-to-end:
./migrate.sh --run airflow-visualizer
#   → visit https://rajesh-satuluri.github.io/airflow-visualizer/ (Pages can take ~1 min)

# 3. When happy, do the rest:
./migrate.sh --run
```

Useful flags:

- `./migrate.sh --run sql-visualizer kafka-visualizer` — only specific tools.
- `FORCE=1 ./migrate.sh --run airflow-visualizer` — overwrite an existing spoke's
  `main` with a fresh split (only ever touches spokes, never the sources).

## Publish the hub

Create the **user site** repo (served at the clean root
`https://rajesh-satuluri.github.io/`) and push the hub page into it:

```bash
cd migration/hub
git init -b main
git add .
git commit -m "Add hub landing page linking all tool sites"
gh repo create rajesh-satuluri.github.io --public --source=. --push
gh api --method POST repos/Rajesh-Satuluri/rajesh-satuluri.github.io/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

Then open **https://rajesh-satuluri.github.io/** — the hub, linking every tool.

## After migrating — the two source repos

They keep working exactly as before, so there's no rush. Once every spoke is live
and verified, you can, at your leisure:

- **Archive** `NewVisual` and `My-Projects` (GitHub → Settings → Archive) so they
  stay as read-only history but signal "moved to spokes"; **or**
- Replace each one's `index.html` with a redirect to the hub; **or**
- Leave them as-is.

Nothing here requires deleting them, and deleting is never necessary to complete
the migration.

## Special case: `de-shorts`

`My-Projects/de-shorts` is **not** a static-root site — it's a **Vite/TypeScript**
app with a build step (`package.json`, `vite.config.ts`, `src/`). It's excluded
from the manifest on purpose. To ship it as its own spoke, it needs a build step
(a small GitHub Actions workflow that runs `npm ci && npm run build` and publishes
`dist/`). Ask and this kit can add that workflow to a `de-shorts` spoke.

## Shared code (`NewVisual/shared/backup-button.js`)

Seven NewVisual tools load `shared/backup-button.js` via a **relative path**
(`shared/...`). That file lives at the *monorepo* root, so after splitting, those
tools would 404 on it. **The script handles this automatically**: during the
split, if a spoke references `shared/backup-button.js`, the script copies that
6 KB file into the spoke's `shared/` folder (as an extra commit) so every spoke
is fully self-contained. Affected tools: `data-engineering-cicd-visualizer`,
`o9-solver-visualizer`, `resume-builder`, `spotify-azure-de-visualizer`,
`blind75-visualizer`, `supply-demand-qa`, `airflow-visualizer`.
