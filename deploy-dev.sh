#!/bin/bash
# Deploys the DEV preview (dev.signedby.ai) from whatever is checked out in
# THIS folder.
#
# Why this exists: on 2026-07-22 a `vercel deploy -m githubCommitRef=dev` was
# run while the terminal was still sitting in the master (signedby-app)
# folder from a previous command. The -m flag only overrides Vercel's
# *label* for the deployment -- it does not change which files get uploaded.
# Result: master's centered homepage got deployed and mislabeled "dev", and
# Vercel aliased dev.signedby.ai to it, silently reverting the v20
# two-column hero.
#
# This script cd's into its own folder first (so it doesn't matter what your
# shell's cwd was when you ran it), then refuses to run at all unless it's
# actually on the dev branch, and shows you the exact commit before asking
# you to confirm.
set -e
cd "$(dirname "$0")"

branch=$(git branch --show-current)
sha=$(git rev-parse --short HEAD)
msg=$(git log -1 --pretty=%s)

if [ "$branch" != "dev" ]; then
  echo "ABORT: this script deploys the DEV preview and must be run from the 'dev' branch."
  echo "This folder is currently on '$branch'. Nothing was deployed."
  exit 1
fi

echo "About to deploy DEV preview (dev.signedby.ai)"
echo "  branch: $branch"
echo "  commit: $sha  $msg"
read -p "Continue? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Cancelled."
  exit 1
fi

deploy_url=$(vercel deploy -m githubCommitRef=dev)
echo "Deployed: $deploy_url"

# Second, separate problem found 2026-07-22, after the wrong-directory bug
# above was already fixed: dev.signedby.ai has a *custom preview branch*
# configured (dev), and per Vercel's own docs (vercel.com/docs/cli/alias),
# a domain with a custom preview branch only auto-updates when the
# deployment comes through the Git Integration (a GitHub-triggered build).
# A CLI deploy -- even a correct one, from the right folder, with the right
# -m githubCommitRef=dev metadata -- does NOT move the domain alias on its
# own. Confirmed the hard way: three straight correct-content CLI deploys
# landed as unaliased Previews while dev.signedby.ai kept serving an old
# one. So point the domain at the new deployment explicitly, every time.
host=$(echo "$deploy_url" | sed -E 's#^https?://##')
echo "Pointing dev.signedby.ai at the new deployment..."
vercel alias set "$host" dev.signedby.ai
