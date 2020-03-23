# connect to the current test DB

export PGPASSWORD=$IPR_SERVICE_PASS
TEMP_DB_NAME=$( git branch | grep '*' | cut -f 2 -d/ )
TEMP_DB_NAME="${TEMP_DB_NAME}"

HOST=iprdevdb.bcgsc.ca
USERNAME=ipr_service

echo "connect to the new db"
echo ">>> psql -h $HOST -U $USERNAME -d $TEMP_DB_NAME"
psql -h $HOST -U $USERNAME -d $TEMP_DB_NAME
