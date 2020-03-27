# create a new test database from ipr-sync-dev with the current branch as name

export PGPASSWORD=$IPR_SERVICE_PASS
TEMP_DB_NAME=$( git branch | grep '*' | cut -f 2 -d/ )
TEMP_DB_NAME="${TEMP_DB_NAME}"

HOST=iprdevdb.bcgsc.ca
USERNAME=ipr_service
SOURCE_DB=ipr-sync-dev
TEMPLTE_DB_NAME=templateipr
#SOURCE_DB=DEVSU-889-rename-alterations
echo "db to create: $TEMP_DB_NAME"

if [ -e $SOURCE_DB.dump ];
then
    echo "skipping dump. Dump exists $SOURCE_DB.dump"
else
    echo "dumping source db $SOURCE_DB"
    echo ">>> pg_dump -Fc -U $USERNAME -h $HOST -d $SOURCE_DB > $SOURCE_DB.dump"
    pg_dump -Fc -U $USERNAME -h $HOST -d $SOURCE_DB > $SOURCE_DB.dump
fi

echo "dropping existing db $TEMP_DB_NAME"
echo ">>> dropdb -U $USERNAME -h $HOST $TEMP_DB_NAME"
dropdb -U $USERNAME -h $HOST $TEMP_DB_NAME

echo "creating empty db $TEMP_DB_NAME"
echo ">>> createdb -U $USERNAME -T $TEMPLTE_DB_NAME -h $HOST $TEMP_DB_NAME"
createdb -U $USERNAME -T $TEMPLTE_DB_NAME -h $HOST $TEMP_DB_NAME

echo "restoring dump ($SOURCE_DB.dump) to new empty db ($TEMP_DB_NAME)"
echo ">>> pg_restore -Fc -U $USERNAME -h $HOST $SOURCE_DB.dump -d $TEMP_DB_NAME "
pg_restore -Fc -U $USERNAME -h $HOST $SOURCE_DB.dump  -d $TEMP_DB_NAME

echo "listing current db's"
echo ">>> psql -h $HOST -U $USERNAME -l"
psql -h $HOST -U $USERNAME -l

echo "connect to the new db"
echo ">>> psql -h $HOST -U $USERNAME -d $TEMP_DB_NAME"
psql -h $HOST -U $USERNAME -d $TEMP_DB_NAME
