


export PGPASSWORD=$IPR_SERVICE_PASS
TEMP_DB_NAME=$( git branch | grep '*' | cut -f 2 -d/ )
TEMP_DB_NAME="${TEMP_DB_NAME}"

SOURCE_DB=ipr-sync-dev
echo $TEMP_DB_NAME

npx sequelize-cli db:migrate --url postgres://ipr_service@iprdevdb:5432/$TEMP_DB_NAME
