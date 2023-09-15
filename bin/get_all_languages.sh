#! /usr/bin/env bash

if ! command -v gh; then
  echo "Script requires gh CLI"
fi

REPOS="$(cat languages.json | jq -r .[].repo)"

mkdir -p "_languages"

for repo in $REPOS; do
    echo "$repo"
    gh repo clone "mongodb/$repo" "_languages/$repo" -- --recurse-submodules
done
