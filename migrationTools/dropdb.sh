# drop the test db

export PGPASSWORD=$IPR_SERVICE_PASS
TEMP_DB_NAME=$( git branch | grep '*' | cut -f 2 -d/ )
TEMP_DB_NAME="${TEMP_DB_NAME}"

HOST=iprdevdb.bcgsc.ca
USERNAME=ipr_service

echo "drop the test db"
echo ">>> dropdb -h $HOST -U $USERNAME $TEMP_DB_NAME"
dropdb -h $HOST -U $USERNAME $TEMP_DB_NAME
