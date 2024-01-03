#!/bin/bash
echo "*** CREATING DATABASE ***"

export PGPASSWORD=$POSTGRES_PASSWORD
# create the required service role
psql -U $POSTGRES_USER  -c "CREATE ROLE $SERVICE_USER; ALTER ROLE $SERVICE_USER WITH NOSUPERUSER INHERIT NOCREATEROLE CREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD '$SERVICE_PASSWORD'"

echo "creating template"

if [ "$TEMPLATE_NAME" = "" ];
then
    TEMPLATE_NAME="templateipr"
fi

if [ "$IPR_DATABASE_NAME" = "" ];
then
    IPR_DATABASE_NAME="ipr"
fi

if [ "$PORI_ADMIN_USER" = "" ];
then
    PORI_ADMIN_USER='pori_admin'
fi

if [ "$PORI_ADMIN_EMAIL" = "" ];
then
    PORI_ADMIN_EMAIL='elewis@bcgsc.ca'
fi



# create the template database with the UUID extension
psql -U $POSTGRES_USER -c "CREATE DATABASE $TEMPLATE_NAME OWNER $SERVICE_USER IS_TEMPLATE = true;"
psql -U $POSTGRES_USER -c "GRANT CONNECT ON DATABASE $TEMPLATE_NAME TO PUBLIC; REVOKE TEMPORARY ON DATABASE $TEMPLATE_NAME FROM PUBLIC;"
psql -U $POSTGRES_USER -d "$TEMPLATE_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# import dump
# PGPASSWORD=$SERVICE_PASSWORD createdb -U $SERVICE_USER -T $TEMPLATE_NAME $DATABASE_NAME
# PGPASSWORD=$SERVICE_PASSWORD pg_restore -U $SERVICE_USER -n public $SECTION --no-acl --no-owner -Fc "$DB_DUMP_LOCATION" -d "$DATABASE_NAME"

if [ "$SCHEMA_DUMP_LOCATION" = "" ];
then
    SCHEMA_DUMP_LOCATION="/tmp/psql_data/ipr_schema.postgres.sql"
fi

echo "createdb"
PGPASSWORD=$SERVICE_PASSWORD createdb -U $SERVICE_USER -T $TEMPLATE_NAME $IPR_DATABASE_NAME

echo "pg_restore"
# PGPASSWORD=$SERVICE_PASSWORD pg_restore -U $SERVICE_USER "$SCHEMA_DUMP_LOCATION" -d "$IPR_DATABASE_NAME"
PGPASSWORD=$SERVICE_PASSWORD psql -U $SERVICE_USER -f "$SCHEMA_DUMP_LOCATION" -d "$IPR_DATABASE_NAME"


echo "granting permissions to service user"
# create the RO user for demos
psql -U $POSTGRES_USER -c "GRANT CONNECT ON DATABASE $IPR_DATABASE_NAME TO $SERVICE_USER;"
psql -U $POSTGRES_USER -d $IPR_DATABASE_NAME -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $SERVICE_USER;"


echo "*** DATABASE CREATED! ***"

echo "*** adding pori_admin user ***"
psql -U $SERVICE_USER -d $IPR_DATABASE_NAME -c "INSERT INTO users (ident, username, \"firstName\", \"lastName\", email, created_at, updated_at) values (uuid_generate_v4(), 'pori_admin', '$PORI_ADMIN_USER', '$PORI_ADMIN_USER', '$PORI_ADMIN_EMAIL', now(), now());"

echo $PORI_ADMIN_USER
echo "*** adding admin group ***"
psql -U $SERVICE_USER -d $IPR_DATABASE_NAME -c "insert into user_groups (ident, name, owner_id, created_at, updated_at) values (uuid_generate_v4(), 'admin', (SELECT id from users where username = '$PORI_ADMIN_USER'), now(), now());"

echo "*** adding pori_admin user to admin group***"
psql -U $SERVICE_USER -d $IPR_DATABASE_NAME -c "insert into user_group_members (user_id, group_id, created_at, updated_at) values ((SELECT id from users where username = 'pori_admin'), (SELECT id from user_groups where name = 'admin'), now(), now());"