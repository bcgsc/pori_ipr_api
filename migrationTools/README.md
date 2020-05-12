# Migration Tools

This folder is meant for helper methods and scripts to ensure consistency in writing migrations

- [Scripts](#scripts)
  - [Create a Test DB](#create-a-test-db)
  - [Bump Migration Files](#bump-migration-files)
  - [Migrate Test DB](#migrate-test-db)
  - [Connect Test DB](#connect-test-db)
  - [Drop the Test DB](#drop-the-test-db)

## Scripts

The scripts below all use `ipr_service` user and password. The password should be set with
an environment variable `IPR_SERVICE_PASS`

### Create a Test DB

create a new test database from ipr-sync-dev with the current branch as name

```bash
bash migrationTools/createdb.sh
```

### Bump Migration Files

rename some migration files to have the latest timestamps so they are applied after all current migrations

```bash
bash migrationTools/moveMigration.sh "DEVSU-XXX-grep-condition"
```

### Migrate Test DB

Run the current migrations against the test DB

```bash
bash migrationTools/migratedb.sh
```

### Connect Test DB

connect to the current test DB

```bash
bash migrationTools/connectdb.sh
```

### Drop the Test DB

drop the current test DB

```bash
bash migrationTools/dropdb.sh
```
