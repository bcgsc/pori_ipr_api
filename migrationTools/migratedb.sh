#!/bin/bash

# Run the current migrations against specified DB
echo "Migrating against: $IPR_DATABASE_NAME"

parent_folder="migrations"

run_migration() {
  local migration_path=$1
  echo "$migration_path"
  npx sequelize-cli db:migrate --migrations-path "$migration_path" --url "postgres://$IPR_SERVICE_USER:$IPR_SERVICE_PASS@$IPR_DATABASE_SERVER/$IPR_DATABASE_NAME"
}

# Migrations must run oldest-first: legacy, then each released version in order, then
# anything still staged in latest. find(1) lists directories in filesystem order, which
# is not stable across machines, so the version folders are sorted explicitly.

# 1. legacy
if [ -d "$parent_folder/legacy" ]; then
  run_migration "$parent_folder/legacy"
fi

# 2. released versions, in version order
mapfile -t version_dirs < <(find "$parent_folder" -mindepth 1 -maxdepth 1 -type d \
  ! -name "legacy" ! -name "latest" | sort -V)

for dir in "${version_dirs[@]}"; do
  run_migration "$dir"
done

# 3. latest (unreleased); any batch subdirectories run before loose migrations
if [ -d "$parent_folder/latest" ]; then
  mapfile -t batch_dirs < <(find "$parent_folder/latest" -mindepth 1 -maxdepth 1 -type d | sort -V)

  for batch_dir in "${batch_dirs[@]}"; do
    run_migration "$batch_dir"
  done

  if [ -n "$(find "$parent_folder/latest" -maxdepth 1 -name '*.js' -type f)" ]; then
    run_migration "$parent_folder/latest"
  fi
fi
