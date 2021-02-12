# Creating the Demo Database Dump

First create a dump of the production database (see migrationTools create).

```bash
pg_dump -Fc -U <USER> -h <HOSTNAME> -d <DATABASE_NAME> > new_demo.dump
```

Then restore this dump as a new database. If you are running a local postgres server for which you have root access, the easiest way to do this is using the restore script. You can ignore the password parameters for now since they will not be kept anyway

```bash
POSTGRES_USER=$USER DB_DUMP_LOCATION=new_demo.dump SERVICE_PASSWORD=root READONLY_PASSWORD=root bash demo/restore_iprdb_dump.sh
```

The next step is the run the node script to clean any non-public data from the dump. To run this clean efficiently, triggers should be disabled before clean. First connect to your newly created db and run the following

```sql
ALTER TABLE reports DISABLE TRIGGER ALL;
ALTER TABLE reports_genes DISABLE TRIGGER ALL;
ALTER TABLE germline_small_mutations DISABLE TRIGGER ALL;
```

Then run this script against the database copy that has been dumped. For example below the database dump was restored in a local version of the postgres server and run as follows

```bash
node demo/clean_db_for_demo.js --database.name ipr_demo --database.hostname localhost --database.password '' --graphkb.password ''
```

The triggers must now be re-enabled, connect to your db and run the following

```sql
ALTER TABLE reports ENABLE TRIGGER ALL;
ALTER TABLE reports_genes ENABLE TRIGGER ALL;
ALTER TABLE germline_small_mutations ENABLE TRIGGER ALL;
```

Note: If this was dumped from an older version, you may need to migrate the schema to ensure it is up to date first

```bash
npx sequelize-cli db:migrate --url postgres://${USER}@localhost:5432/ipr_demo
```

Finally you can create a dump of the newly cleaned database. This should be MUCH smaller than the original and is the one that will be included in the git repository

```bash
pg_dump -Fc -U $USER -h localhost -d ipr_demo > demo/ipr_demodb.postgres.dump
```
