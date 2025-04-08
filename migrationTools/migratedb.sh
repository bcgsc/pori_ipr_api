#!/bin/bash

# Run the current migrations against specified DB
export IPR_SERVICE_USER=$IPR_SERVICE_USER
export IPR_SERVICE_PASS=$IPR_SERVICE_PASS
export IPR_DATABASE_SERVER=$IPR_DATABASE_SERVER
export IPR_DATABASE_NAME=$IPR_DATABASE_NAME
echo "Migrating against: $IPR_DATABASE_NAME"
echo "Service user: $IPR_SERVICE_USER"
echo "Server: $IPR_DATABASE_SERVER"

parent_folder="migrations"

mapfile -t subdirs < <(find "$parent_folder" -mindepth 1 -maxdepth 1 -type d)

for dir in "${subdirs[@]}"; do
  echo "$dir"
  npx sequelize-cli db:migrate --migrations-path "$dir" --url "postgres://$IPR_SERVICE_USER:$IPR_SERVICE_PASS@$IPR_DATABASE_SERVER/$IPR_DATABASE_NAME"
done
