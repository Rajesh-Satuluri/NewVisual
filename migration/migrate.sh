#!/usr/bin/env bash
#
# migrate.sh — Split the NewVisual + My-Projects monorepos into one repo per
# tool (hub-and-spoke), preserving each tool's real git history. LOSSLESS:
# the source repos are cloned read-only and NEVER modified.
#
# What it does, per line in tools.tsv:
#   1. `git subtree split` the tool's folder out of its source repo, keeping
#      only the commits that touched that folder (full history, rewritten to
#      a new root). Nothing outside the folder — so the 14 MB PDF and the
#      2.1 MB notebook at the repo roots are left behind automatically.
#   2. Add a `.nojekyll` marker (so GitHub Pages serves files/underscore paths
#      verbatim) as one commit on top.
#   3. Create the spoke repo (public) if it doesn't exist.
#   4. Push the split history to its `main`.
#   5. Enable GitHub Pages (deploy from branch `main`, path `/`).
#
# Re-runnable: existing repos are detected; use FORCE=1 to overwrite a spoke's
# main with a fresh split (only ever touches spokes, never the sources).
#
# PREREQUISITES (run on your own machine, not needed in CI):
#   - git >= 2.20
#   - GitHub CLI `gh`, authenticated:  gh auth login   (needs repo + admin scopes)
#   - Your account must own the target repos.
#
# USAGE:
#   ./migrate.sh                 # dry-run: print the plan, create nothing
#   ./migrate.sh --run           # do it
#   FORCE=1 ./migrate.sh --run   # also overwrite existing spokes' main
#   ./migrate.sh --run airflow-visualizer sql-visualizer   # only these tools
#
set -euo pipefail

# ---- config -----------------------------------------------------------------
OWNER="${OWNER:-Rajesh-Satuluri}"
NV_URL="${NV_URL:-https://github.com/${OWNER}/NewVisual.git}"
MP_URL="${MP_URL:-https://github.com/${OWNER}/My-Projects.git}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="${MANIFEST:-${SCRIPT_DIR}/tools.tsv}"
WORK="${WORK:-${SCRIPT_DIR}/.work}"        # scratch clones live here
DRY_RUN=1
ONLY=()

for arg in "$@"; do
  case "$arg" in
    --run) DRY_RUN=0 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,40p' "$0"; exit 0 ;;
    *) ONLY+=("$arg") ;;
  esac
done

say()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[err]\033[0m %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null || die "git not found"
if [ "$DRY_RUN" -eq 0 ]; then
  command -v gh >/dev/null || die "gh (GitHub CLI) not found — install it or run without --run for a dry run"
  gh auth status >/dev/null 2>&1 || die "gh not authenticated — run: gh auth login"
fi
[ -f "$MANIFEST" ] || die "manifest not found: $MANIFEST"

wants() {  # returns 0 if this repo_name should be processed
  [ ${#ONLY[@]} -eq 0 ] && return 0
  local r="$1"; for x in "${ONLY[@]}"; do [ "$x" = "$r" ] && return 0; done; return 1
}

# ---- fresh, full-history clones of the sources (read-only) -------------------
mkdir -p "$WORK"
clone_source() {
  local key="$1" url="$2"; local dir="$WORK/$key"
  if [ -d "$dir/.git" ]; then
    say "source $key already cloned — fetching latest"
    git -C "$dir" fetch --quiet origin || warn "fetch failed for $key (using existing)"
  else
    say "cloning source $key (full history) from $url"
    [ "$DRY_RUN" -eq 0 ] && git clone --quiet "$url" "$dir" || {
      [ "$DRY_RUN" -eq 1 ] && echo "   (dry-run: would clone $url -> $dir)"
    }
  fi
}
clone_source NewVisual   "$NV_URL"
clone_source My-Projects "$MP_URL"

src_dir() { case "$1" in NV) echo "$WORK/NewVisual";; MP) echo "$WORK/My-Projects";; *) die "unknown source '$1'";; esac; }

# ---- per-tool migration -----------------------------------------------------
migrate_one() {
  local repo="$1" source="$2" folder="$3"
  local sdir; sdir="$(src_dir "$source")"
  local target="https://github.com/${OWNER}/${repo}.git"

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "   PLAN  ${source}/${folder}  ->  ${OWNER}/${repo}  ->  https://${OWNER,,}.github.io/${repo}/"
    return 0
  fi

  [ -d "$sdir/$folder" ] || { warn "SKIP $repo — folder '$folder' not found in $source"; return 0; }

  say "[$repo] splitting history of '$folder' out of $source"
  git -C "$sdir" branch -D "_split_${repo}" >/dev/null 2>&1 || true
  local split_sha
  split_sha="$(git -C "$sdir" subtree split --prefix="$folder" HEAD)" \
    || die "[$repo] subtree split failed"

  # Stage the split on a working branch and add .nojekyll on top.
  git -C "$sdir" branch -f "_split_${repo}" "$split_sha" >/dev/null
  local wt="$WORK/_wt_${repo}"
  rm -rf "$wt"
  git -C "$sdir" worktree add --quiet "$wt" "_split_${repo}"
  if [ ! -f "$wt/.nojekyll" ]; then
    : > "$wt/.nojekyll"
    git -C "$wt" add .nojekyll
    git -C "$wt" -c user.name="migration" -c user.email="migration@local" \
      commit --quiet -m "chore: add .nojekyll for GitHub Pages"
  fi

  # Self-contain shared assets: several tools load `shared/backup-button.js`
  # (a file at the MONOREPO root, outside the tool folder) via a relative path.
  # After splitting it would 404, so copy it in and the spoke stands alone.
  if grep -rqIs "shared/backup-button" "$wt"; then
    if [ -f "$sdir/shared/backup-button.js" ]; then
      mkdir -p "$wt/shared"
      cp "$sdir/shared/backup-button.js" "$wt/shared/backup-button.js"
      git -C "$wt" add shared/backup-button.js
      git -C "$wt" -c user.name="migration" -c user.email="migration@local" \
        commit --quiet -m "chore: vendor shared/backup-button.js so the spoke is self-contained"
      say "[$repo] vendored shared/backup-button.js"
    else
      warn "[$repo] references shared/backup-button.js but no source copy found — backup button may 404"
    fi
  fi

  # Create the spoke repo if needed.
  if gh repo view "${OWNER}/${repo}" >/dev/null 2>&1; then
    say "[$repo] repo already exists"
  else
    say "[$repo] creating public repo"
    gh repo create "${OWNER}/${repo}" --public \
      -d "Interactive learning visualizer (split from monorepo, history preserved)." \
      >/dev/null
  fi

  # Push the split history to main.
  local pushflag=""
  [ "${FORCE:-0}" = "1" ] && pushflag="--force"
  say "[$repo] pushing history -> ${OWNER}/${repo}:main"
  git -C "$wt" push $pushflag "$target" "HEAD:refs/heads/main" \
    || die "[$repo] push failed (set FORCE=1 to overwrite an existing main)"

  # Enable Pages: deploy from branch main, root. Ignore 'already exists'.
  say "[$repo] enabling GitHub Pages (branch main, /)"
  gh api --method POST "repos/${OWNER}/${repo}/pages" \
      -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
    || gh api --method PUT "repos/${OWNER}/${repo}/pages" \
      -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
    || warn "[$repo] could not set Pages via API — enable manually: Settings > Pages > Deploy from branch: main /(root)"

  # Clean up the worktree (never touches the source's own tree).
  git -C "$sdir" worktree remove --force "$wt" >/dev/null 2>&1 || true
  git -C "$sdir" branch -D "_split_${repo}" >/dev/null 2>&1 || true

  echo "   DONE  https://${OWNER,,}.github.io/${repo}/"
}

say "Manifest: $MANIFEST"
[ "$DRY_RUN" -eq 1 ] && say "DRY RUN — nothing will be created. Re-run with --run to execute." || say "LIVE RUN"

count=0
while IFS=$'\t' read -r repo source folder group _rest; do
  [ -z "${repo:-}" ] && continue
  case "$repo" in \#*) continue;; esac
  wants "$repo" || continue
  migrate_one "$repo" "$source" "$folder"
  count=$((count+1))
done < <(grep -vE '^\s*(#|$)' "$MANIFEST")

say "Processed $count tool(s)."
if [ "$DRY_RUN" -eq 1 ]; then
  cat <<EOF

Next: review the plan above, then run for real:
    ./migrate.sh --run
Or migrate one tool at a time first (recommended for a pilot):
    ./migrate.sh --run airflow-visualizer

Your source repos (NewVisual, My-Projects) are left completely untouched.
EOF
fi
