#!/usr/bin/env bash
#
# deploy.sh — ship the current work branch to `main`, which triggers the
# GitHub Pages deploy workflow (.github/workflows/deploy.yml).
#
# Usage:
#   scripts/deploy.sh                 # deploy the default work branch
#   scripts/deploy.sh <branch-name>   # deploy a specific branch
#
# What it does:
#   1. Fetches the latest main and the work branch from origin.
#   2. Resets local main to origin/main and merges the work branch into it.
#   3. Pushes main (the Pages workflow runs on push to main).
#   4. Returns you to the work branch.
#
# Safe to re-run: content already on main merges cleanly as a no-op.
# If a merge conflict occurs, it stops and tells you — resolve, then re-run.

set -euo pipefail

DEFAULT_BRANCH="claude/blind-75-study-tool-3v12in"
WORK_BRANCH="${1:-$DEFAULT_BRANCH}"

# Run from the repo root regardless of where this is invoked.
cd "$(git rev-parse --show-toplevel)"

echo "→ Deploying '$WORK_BRANCH' to main…"

# Refuse to deploy with a dirty tree — commit or stash first.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ You have uncommitted changes. Commit or stash them, then re-run." >&2
  exit 1
fi

git fetch origin main "$WORK_BRANCH"

# Rebuild local main from origin, merge the work branch in.
git checkout -B main origin/main
if ! git merge --no-edit "origin/$WORK_BRANCH"; then
  echo "✗ Merge conflict. Resolve it, commit, then: git push origin main" >&2
  exit 1
fi

# Nothing new? Say so and stop (no empty deploy).
if git diff --quiet origin/main..HEAD; then
  echo "✓ main is already up to date — nothing to deploy."
  git checkout "$WORK_BRANCH"
  exit 0
fi

git push origin main
git checkout "$WORK_BRANCH"

echo "✓ Pushed to main. Pages deploy is running:"
echo "  https://github.com/Rajesh-Satuluri/NewVisual/actions/workflows/deploy.yml"
echo "  Live: https://rajesh-satuluri.github.io/NewVisual/blind75-visualizer/"
