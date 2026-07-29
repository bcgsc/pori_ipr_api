#!/bin/bash

# Run the current migrations against specified DB
echo "Migrating against: $IPR_DATABASE_NAME"

parent_folder="migrations"

run_migration() {
  local migration_path=$1
  echo "$migration_path"
  npx sequelize-cli db:migrate --migrations-path "$migration_path" --url "postgres://$IPR_SERVICE_USER:$IPR_SERVICE_PASS@$IPR_DATABASE_SERVER/$IPR_DATABASE_NAME"
}

# Handle latest migrations (check for batch subdirectories first)
if [ -d "$parent_folder/latest" ]; then
  latest_batches=$(find "$parent_folder/latest" -maxdepth 1 -type d ! -name "latest" | sort)
  if [ -n "$latest_batches" ]; then
    # Run batch migrations in order
    while IFS= read -r batch_dir; do
      run_migration "$batch_dir"
    done <<< "$latest_batches"
  fi
  # Also run non-batched migrations in latest (if any exist)
  if [ -n "$(find "$parent_folder/latest" -maxdepth 1 -name '*.js' -type f)" ]; then
    run_migration "$parent_folder/latest"
  fi
fi

# Handle other migration directories (legacy, etc.)
mapfile -t other_dirs < <(find "$parent_folder" -mindepth 1 -maxdepth 1 -type d ! -name "latest")

for dir in "${other_dirs[@]}"; do
  run_migration "$dir"
done
