# Creating the Demo Database Dump

> :warning: **BEFORE YOU START!** The demo dump is created from a cleaned/stripped version of the production database. Only reports under the PORI project are kept. If any changes have been made to these reports since the last dump then they must be manually reviewed by the developer creating the dump beforehand to double check nothing has been uploaded, edited or added that should not be included in public data (ex. identifiable or proprietary information).

First create a dump of the production database (see migrationTools create).

```bash
pg_dump -Fc -U <USER> -h <HOSTNAME> -d <DATABASE_NAME> > new_demo.dump
```

Next, restore the dump as a new database and run the node script to clean any non-public data
from the dump. There are two ways to do this, one of which requires superuser and one of which
doesn't.
If you are running a local postgres server for which you have root access, you have superuser,
and the easiest way to do this is using the restore script.

Finally you can create a dump of the newly cleaned database. This should be MUCH smaller than the
original and is the one that will be included in the git repository.

```bash
pg_dump -Fc -U $USER -h localhost -d ipr_demo > demo/ipr_demodb.postgres.dump
```


Whichever way you decide to do this, note that:

- You can ignore the password parameters for now since they will not be kept anyway.

- If the database was dumped from an older version, you may need to migrate the schema to ensure it is up to date first

```bash
npx sequelize-cli db:migrate --url postgres://${USER}@localhost:5432/ipr_demo
```

The middle step:

IF YOU HAVE SUPERUSER:
1) run the restore script,
2) alter the tables to disable triggers,
3) run the clean script,
4) re-enable the triggers.

```bash
POSTGRES_USER=$USER DB_DUMP_LOCATION=new_demo.dump SERVICE_PASSWORD=root READONLY_PASSWORD=root bash demo/restore_iprdb_dump.sh
```
```sql
ALTER TABLE reports DISABLE TRIGGER ALL;
ALTER TABLE reports_genes DISABLE TRIGGER ALL;
ALTER TABLE germline_small_mutations DISABLE TRIGGER ALL;
```
```bash
node demo/clean_db_for_demo.js --database.name ipr_demo2 --database.hostname localhost --database.password '' --graphkb.password ''
```
```sql
ALTER TABLE reports ENABLE TRIGGER ALL;
ALTER TABLE reports_genes ENABLE TRIGGER ALL;
ALTER TABLE germline_small_mutations ENABLE TRIGGER ALL;
```


IF YOU DON'T HAVE SUPERUSER:

1) run the restore script with the option to avoid loading triggers
2) run the clean script,
3) run the restore script again with the option to load triggers.

```bash
POSTGRES_USER=$USER DB_DUMP_LOCATION=new_demo.dump SERVICE_PASSWORD=root READONLY_PASSWORD=root TRIGGERS_OPTION=no_triggers bash demo/restore_iprdb_dump.sh
```
```bash
node demo/clean_db_for_demo.js --database.name ipr_demo2 --database.hostname localhost --database.password '' --graphkb.password ''
```
```bash
POSTGRES_USER=$USER DB_DUMP_LOCATION=new_demo.dump SERVICE_PASSWORD=root READONLY_PASSWORD=root TRIGGERS_OPTION=only_triggers bash demo/restore_iprdb_dump.sh
```
