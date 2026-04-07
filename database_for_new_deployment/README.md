# Creating a database dump for use with a new deployment

NB the process for doing this is almost exactly the same as for prepping the demo db.

> :warning: **BEFORE YOU START!** The demo reports in this db are created from a cleaned/stripped version of production data. Only reports under the PORI project are kept. If any changes have been made to these reports since the last dump then they must be manually reviewed by the developer creating the dump beforehand to double check nothing has been uploaded, edited or added that should not be included in public data (ex. identifiable or proprietary information).

These instructions assume you are using the BCGSC prod or dev ipr database.

First, you'll need to export some environment variables:

export IPR_SERVICE_PASSWORD=<ipr_service password>
export TEMP_DB_NAME=<eg newdb>
export DB_DUMP_LOCATION=<eg current_db.dump>
export DATABASE_HOSTNAME=<eg iprdevdb.bcgsc.ca>


## Create a dump of the production database (see migrationTools create).

```bash
PGPASSWORD="$IPR_SERVICE_PASSWORD" pg_dump -Fc -U ipr_service -h <HOSTNAME> -d <DATABASE_NAME> > new_demo.dump
```

## Reload and edit that db dump

Reload that data to the db in a separate database and pare it down to what is needed for a new deployment.

#### Create the empty temporary db for running the cleaning scripts on

```bash
PGPASSWORD="$IPR_SERVICE_PASSWORD" createdb -U ipr_service -T template0 "$TEMP_DB_NAME" -h iprdevdb.bcgsc.ca

PGPASSWORD="$IPR_SERVICE_PASSWORD" psql -U ipr_service -d postgres -h iprdevdb.bcgsc.ca -c "GRANT CONNECT ON DATABASE $TEMP_DB_NAME TO PUBLIC; REVOKE TEMPORARY ON DATABASE $TEMP_DB_NAME FROM PUBLIC;"
```

#### Run the restore script to load the data into the empty temporary db - but not the triggers

Cleaning the db requires triggers and constraints to be absent.

Note that any data added in this step could violate the temporarily suspended constraints, and if it does you won't be able to add them back. Be careful with any preparation scripts you run at this stage.

```bash
PGPASSWORD="$IPR_SERVICE_PASSWORD" pg_restore -n public --section=pre-data --section=data --no-acl --no-owner -Fc "$DB_DUMP_LOCATION" -d "$TEMP_DB_NAME" -U ipr_service -h iprdevdb.bcgsc.ca
```

#### Run the clean db script used for creating the demo; then run the prep db script to create the pori admin user

If necessary, run migrations.

```bash
PGPASSWORD="$IPR_SERVICE_PASSWORD" npx sequelize-cli db:migrate --url postgres://ipr_service@iprdevdb.bcgsc.ca:5432/${TEMP_DB_NAME}
```

Then, 1 - clean the db the same way you would when preparing the demo. This removes all reports except those in TEST and replaces all users with demo user. 2 - ensures the pori_admin user is created, the image tables are fully truncated, all sequences are reset to lowest possible value, and db is vaccuumed. These bash commands assume your working directory is the directory this readme is in.

```bash
node ../demo/clean_db_for_demo.js --database.name "$TEMP_DB_NAME" --database.hostname iprdevdb.bcgsc.ca --database.password "$IPR_SERVICE_PASSWORD"
node prep_db_for_new_deployment.js --database.name "$TEMP_DB_NAME" --database.hostname iprdevdb.bcgsc.ca --database.password "$IPR_SERVICE_PASSWORD"
```

Take a look in the db and make sure the users, user_groups, projects, permissions and templates tables look like you expect, and make sure there are no 'temporary' tables left in there.

#### Check the size of the cleaned database. This should be MUCH smaller than the original and is the one that will be included in the git repository.

NB the demo db is not more than 2 gb in the db and only 30m in the repo. This db should be significantly less because the image data has been removed. You can check its size with the following psql command:

```bash
PGPASSWORD="$IPR_SERVICE_PASSWORD" psql -U ipr_service -h iprdevdb.bcgsc.ca -d "$TEMP_DB_NAME" -c "SELECT pg_size_pretty( pg_database_size('$TEMP_DB_NAME'));"
```

#### Run the restore script again to load the triggers

```bash

PGPASSWORD="$IPR_SERVICE_PASSWORD" pg_restore -n public --section=post-data --no-acl --no-owner -Fc "$DB_DUMP_LOCATION" -d "$TEMP_DB_NAME" -U ipr_service -h iprdevdb.bcgsc.ca
```

Make sure you are not trying to add the fullsize db to the repo. If it's still showing you a fullsize db try running
vacuum and then rechecking the size.

## Create a dump of the newly cleaned database.

```bash
PGPASSWORD="$IPR_SERVICE_PASSWORD" pg_dump -Fc -U ipr_service -h "$DATABASE_HOSTNAME" -d "$TEMP_DB_NAME" > database_for_new_deployment/ipr_new_deployment.postgres.dump
```

git add this file to update the repo.
