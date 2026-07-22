#!/bin/bash
# Deploys PRODUCTION (signedby.ai) from whatever is checked out in THIS folder.
#
# Why this exists: on 2026-07-22 a `vercel deploy -m githubCommitRef=dev` was
# run while the terminal was still sitting in this (master) folder from a
# previous command. The -m flag only overrides Vercel's *label* for the
# deployment -- it does not change which files get uploaded. Result: master's
# centered homepage got deployed and mislabeled "dev", and Vercel aliased
# dev.signedby.ai to it, silently reverting the v20 two-column hero.
#
# This script cd's into its own folder first (so it doesn't matter what your
# shell's cwd was when you ran it), then refuses to run at all unless it's
# actually on the master branch, and shows you the exact commit before asking
# you to confirm.
set -e
cd "$(dirname "$0")"

branch=$(git branch --show-current)
sha=$(git rev-parse --short HEAD)
msg=$(git log -1 --pretty=%s)

if [ "$branch" != "master" ]; then
  echo "ABORT: this script deploys PRODUCTION and must be run from the 'master' branch."
  echo "This folder is currently on '$branch'. Nothing was deployed."
  exit 1
fi

echo "About to deploy PRODUCTION (signedby.ai)"
echo "  branch: $branch"
echo "  commit: $sha  $msg"
read -p "Continue? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Cancelled."
  exit 1
fi

vercel deploy --prod
