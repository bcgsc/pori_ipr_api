# Creating a database dump for use with a new deployment

> :warning: **BEFORE YOU START!** The demo reports in this db are created from a cleaned/stripped version of production data. Only reports under the PORI project are kept. If any changes have been made to these reports since the last dump then they must be manually reviewed by the developer creating the dump beforehand to double check nothing has been uploaded, edited or added that should not be included in public data (ex. identifiable or proprietary information).

These instructions assume you are using the BCGSC prod or dev ipr database.

## create a dump of the production database (see migrationTools create).

```bash
pg_dump -Fc -U <USER> -h <HOSTNAME> -d <DATABASE_NAME> > new_demo.dump
```

## reload and edit that db dump

Reload that data to the db in a separate database and pare it down to what is needed for a new deployment.

export the following values to terminal (update these values as necessary):

export IPR_SERVICE_PASSWORD=
export IPR_SERVICE_USER=ipr_service
export TEMPLATE_NAME=templateipr
export TEMP_DB_NAME=newdeploymentdb
export DB_DUMP_LOCATION=
export DATABASE_HOSTNAME=


### create the empty db

```bash
PGPASSWORD=$IPR_SERVICE_PASSWORD createdb -U $IPR_SERVICE_USER -T $TEMPLATE_NAME $TEMP_DB_NAME
```

### run the restore script to load the data, but not the triggers (cleaning the db requires these triggers to be absent)

```bash
PGPASSWORD=$IPR_SERVICE_PASSWORD pg_restore -n public --section=pre-data --section=data --no-acl --no-owner -Fc "$DB_DUMP_LOCATION" -d $TEMP_DB_NAME -U $IPR_SERVICE_USER -h $DATABASE_HOSTNAME
```

### run the clean db script used for creating the demo; then run the prep db script to create the pori admin user

Note that if the database was dumped from an older version, you may need to migrate the schema to ensure it is up to date first.

```bash
PGPASSWORD=$IPR_SERVICE_PASSWORD npx sequelize-cli db:migrate --url postgres://${USER}@${HOST}:5432/${TEMP_DB_NAME}
```

Then:

```bash
node demo/clean_db_for_demo.js --database.name $TEMP_DB_NAME --database.hostname $DATABASE_HOSTNAME --database.password $IPR_DATABASE_PASSWORD
node database/prep_db_for_new_deployment.js --database.name $TEMP_DB_NAME --database.hostname $DATABASE_HOSTNAME --database.password $IPR_DATABASE_PASSWORD
```

### run the restore script again to load the triggers

```bash
PGPASSWORD=$IPR_SERVICE_PASSWORD pg_restore -n public --section=post-data --no-acl --no-owner -Fc "$DB_DUMP_LOCATION" -d $TEMP_DB_NAME -U $IPR_SERVICE_USER -h $DATABASE_HOSTNAME
```

### Check the size of the cleaned database. This should be MUCH smaller than the original and is the one that will be included in the git repository.

NB the demo db is not more than 2 gb in the db and only 30m in the repo. This db should be about the same. You can check its size with the psql command

```bash
SELECT pg_size_pretty( pg_database_size('<tempdbname>') );
```

Make sure you are not trying to add the fullsize db to the repo. If it's still showing you a fullsize db try running
vacuum and then rechecking the size.

## create a dump of the newly cleaned database.

```bash
pg_dump -Fc -U $USER -h $DATABASE_HOSTNAME -d $TEMP_DB_NAME > database/db_for_new_deployment/ipr_new_deployment.postgres.dump
```

git add this file to update the repo.
