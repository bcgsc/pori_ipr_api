#!/bin/bash

export PGPASSWORD=$POSTGRES_PASSWORD

echo "***CREATING PSQL SCHEMA WITH MIGRATION DATA ***"

echo $POSTGRES_USER
echo $DB_HOST
echo $DB_NAME

if [ "$SCHEMA_DUMP_LOCATION" = "" ];
then
    SCHEMA_DUMP_LOCATION="./ipr_schema.postgres.dump"
fi

echo $SCHEMA_DUMP_LOCATION

pg_dump -Fp -U $POSTGRES_USER -h $DB_HOST -d $DB_NAME --exclude-table-data '[a-z]*' -O -x > $SCHEMA_DUMP_LOCATION
