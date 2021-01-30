#!/bin/bash

if [ "$DB_DUMP_LOCATION" = "" ];
then
    DB_DUMP_LOCATION="/tmp/psql_data/ipr_demodb.postgres.dump"
fi

if [ "$DATABASE_NAME" = "" ];
then
    DATABASE_NAME="ipr_demo"
fi

if [ "$SERVICE_USER" = "" ];
then
    SERVICE_USER="ipr_service"
fi

if [ "$TEMPLATE_NAME" = "" ];
then
    TEMPLATE_NAME="templateipr"
fi


echo "*** CREATING DATABASE ***"

export PGPASSWORD=$POSTGRES_PASSWORD
# create the required service role
psql -h localhost -c "CREATE ROLE $SERVICE_USER; ALTER ROLE ipr_service WITH NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD '$SERVICE_PASSWORD'"

# create the template database with the UUID extension
psql -h localhost -c "CREATE DATABASE $TEMPLATE_NAME OWNER $SERVICE_USER IS_TEMPLATE = true;"
psql -h localhost -c "GRANT CONNECT ON DATABASE $TEMPLATE_NAME TO PUBLIC; REVOKE TEMPORARY ON DATABASE $TEMPLATE_NAME FROM PUBLIC;"
psql -h localhost -d "$TEMPLATE_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# import dump
PGPASSWORD=$SERVICE_PASSWORD createdb -h localhost -U $SERVICE_USER -T $TEMPLATE_NAME $DATABASE_NAME
PGPASSWORD=$SERVICE_PASSWORD pg_restore -h localhost -n public --no-acl --no-owner -Fc "$DB_DUMP_LOCATION" -d "$DATABASE_NAME" -U $SERVICE_USER;


echo "*** DATABASE CREATED! ***"
