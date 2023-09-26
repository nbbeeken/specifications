#! /usr/bin/env sh

set +o errexit
set +o xtrace

if ! command -v gh; then echo "Script requires gh" && exit 1; fi

REPOS='mongo-c-driver
mongo-cxx-driver
mongo-csharp-driver
mongo-go-driver
mongo-java-driver
mongo-php-driver
mongo-python-driver
mongo-ruby-driver
mongo-rust-driver
node-mongodb-native
'

mkdir -p "languages"

printf '%s' "$REPOS" | while IFS='' read -r repo
do
  echo "$repo"
  rm -rf "languages/$repo"
  gh repo clone "mongodb/$repo" "languages/$repo" -- --recurse-submodules
done
