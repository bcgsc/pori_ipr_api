# Integrated Pipeline Reports (IPR) API

![centos build](https://www.bcgsc.ca/bamboo/plugins/servlet/wittified/build-status/IPR-API) ![build](https://github.com/bcgsc/pori_ipr_api/workflows/build/badge.svg?branch=master) [![codecov](https://codecov.io/gh/bcgsc/pori_ipr_api/branch/master/graph/badge.svg?token=9043E24BZR)](https://codecov.io/gh/bcgsc/pori_ipr_api) ![node versions](https://img.shields.io/badge/node-14%20%7C%2016-blue) [![postgres versions](https://img.shields.io/badge/postgres-11%20-blue)](https://www.orientdb.org/) [![DOI](https://zenodo.org/badge/322391719.svg)](https://zenodo.org/badge/latestdoi/322391719)


IPR is part of the [platform for oncogenomic reporting and interpretation](https://github.com/bcgsc/pori).

The Integrated pipeline reports API manages data access to the IPR database on iprdb01.bcgsc.ca.
The API is responsible for providing all data for GSC genomic, probe reports, and Germline Small Mutation reports.

## Installation

After cloning the repository, the application's dependencies need to be installed:

```bash
npm install
```

This process can take between 1-5 minutes depending on caches, and connection speed. Once NPM has finished installing
all required dependencies, the server can be started with the following command:

```bash
NODE_ENV=[local|development|production|staging|test] npm start
```

If NPM is not available, the application server can be booted by executing through node directly:

```bash
NODE_ENV=[local|development|production] node bin/www
```

## Configuration

This repository contains configuration profiles for production, testing, and development environments. A profile will be
selected based on the NODE_ENV environment setting, or by explicitly calling --env [production|development] when
initializing the server. The configuration values are set with defaults in `app/config.js`, which
can be overridden with environment variables.

Environment Variables are expected to be prefixed with `IPR_` and separated by underscores. For example,
to override the database hostname you might use the following

```bash
export IPR_DATABASE_HOSTNAME=someTestServerName
```

This would then be converted to

```json
{
  "database": {"hostname": "someTestServerName"}
}
```

Database settings and credentials can also be given via command line arguments which follow the pattern
of `--<section>.<setting>`. For Example

```bash
app.js --database.hostname someTestServerName
```

## Running Tests with Jest

Unit and Integration tests are run and written using Jest + Supertest with code coverage reports generated using Clover. Tests are configured to run using the `test` environment variable - this currently cannot be overridden.

To run unit tests, cd into the project root directory and run the command `npm run test_local`. Once completed, it should generate and print summaries for the tests and their coverage. The database user credentials and API user credentials must be set before tests can be run.

```bash
npm run test -- --database.password someDbPassword --testing.password someApiPassword
```

or with environment variables

```bash
export IPR_DATABASE_PASSWORD=someDbPassword
export IPR_TESTING_PASSWORD=someApiPassword
npm run test
```

Regarding destructions of prop records after tests (e.g.: afterAll(async () => {await db.models.report.destroy({where: {id: report.id}, force: true});})), "force: true" will not pass locally but will pass on GitHub tests. This property ensures that prop records are deleted after the tests finish running.

### Common problems
#### Cache:
While developing or running tests you might notice that changes that are done to the code are not being reflected in the API response. Or, you might notice that tests are returning not expected results. It might be worth checking if it's a cache issue.

In that case, you can comment out the cache code when testing manually. For unit tests, you can modify the query in order to avoid triggering the cache see [example](./test/routes/germlineSmallMutation/index.test.js?plain=1#L383).

## Generating JSDocs

Developer documentation is generated using the JSDoc library. To generate a local copy of the documentation, cd into the root of the project directory and run the command `npm run jsdoc`. This should automatically create documentation within folder named 'jsdoc' that can be viewed in a web browser.

## Coding Specifications

## Migrating Database Changes

> :warning: **WARNING:** Releases which include database migrations should also include an update of the demo db dump. See [instructions](./demo/README.md) on how to create and commit the new dump.

* Create a migration: `npx sequelize migration:create --name name_of_migration`
* Write up and down functions in your migration file
* According to your changes in migration file, change your Sequelize models manually
* Run: `npx sequelize-cli db:migrate` or

```bash
export IPR_SERVICE_PASS=<PASSWORD>
npx sequelize-cli db:migrate --url "postgres://ipr_service:$IPR_SERVICE_PASS@iprdevdb:5432/ipr-sync-dev"
```

Sequelize Migration Docs: http://docs.sequelizejs.com/manual/migrations.html

### Testing Migration Changes

To avoid breaking the standard development setup or having your migrations overwritten by the sync
crons. You can create a temporary copy of the database as follows

```bash
pg_dump -Fc -U ipr_service -h iprdevdb.bcgsc.ca -d ipr-sync-dev > ipr-sync-dev.dump
```

That creates the dump file. Then create the new temp database. Add temp or the ticket number to the db name to make it
obvious later that it can be deleted

```bash
createdb -U ipr_service -h iprdevdb.bcgsc.ca DEVSU-777-temp-ipr-sync-dev
```

This then needs to be restored as a new database.

**WARNING: DO NOT RESTORE TO THE PRODUCTION DB SERVER**

```bash
pg_restore -Fc -U ipr_service -h iprdevdb.bcgsc.ca ipr-sync-dev.dump -d DEVSU-777-temp-ipr-sync-dev
```

Finally connect to the newly created database

```bash
psql -h iprdevdb.bcgsc.ca -U ipr_service -d DEVSU-777-temp-ipr-sync-dev
```

Once you are done with testing, delete the temporary database

```bash
dropdb -U ipr_service -h iprdevdb.bcgsc.ca DEVSU-777-temp-ipr-sync-dev
```

## Database Insert Not Through API

When adding/inserting entries directly into a database table without using the API, be sure to update the primary key (id)
sequence by running this SQL command after the insert:

`SELECT setval('table_name_id_seq', (SELECT MAX(id) FROM "table_name"));`

Otherwise, you will get a unique constraint error when inserting via the API because Sequelize will try use an id
that is now taken.

## Adding new image types

Steps to add a new image type:
1. Open file app/routes/report/images.js
2. Add new object to IMAGES_CONFIG. Pattern will be the regex for the image key being uploaded
3. Open file app/constants.js
4. Add new entry to VALID_IMAGE_KEY_PATTERN based on the IMAGES_CONFIG pattern

## Process Manager

The production installation of IPR is run & managed by [pm2](http://pm2.keymetrics.io/)

To interact with pm2, ssh to the server and cd to `/var/www/ipr/api/[production]`. From here, run pm2 commands to get information about the application.

```text
<user>@<server>:/var/www/ipr/api/production$ pm2 list
┌────────────────────┬─────┬──────┬───────┬────────┬─────────┬────────┬─────┬───────────┬──────────┐
│ App name           │ id  │ mode │ pid   │ status │ restart │ uptime │ cpu │ mem       │ watching │
├────────────────────┼─────┼──────┼───────┼────────┼─────────┼────────┼─────┼───────────┼──────────┤
│ IPR-API            │ 101 │ fork │ 23409 │ online │ 0       │ 23h    │ 0%  │ 92.7 MB   │ disabled │
└────────────────────┴─────┴──────┴───────┴────────┴─────────┴────────┴─────┴───────────┴──────────┘
 Use `pm2 show <id|name>` to get more details about an app
```

It is possible to use pm2 to actively monitor the console of the applications by using `pm2 monit`.

Note: The pm2 daemon will sometimes launch a new instance of pm2 when running pm2 commands as opposed to accessing the currently running version of pm2. You can tell if there are multiple instances running by executing the command `ps aux | grep pm2`

```text
[<user>@<server> ~]$ ps aux | grep pm2
user  13787  0.1  1.2 952276 50004 ?        Ssl  Jul20   9:28 PM2 v3.0.0: God Daemon (/home/user/.pm2)
user  13800  0.1  1.5 1224456 61028 ?       Ssl  Jul20   9:49 node /home/user/.pm2/node_modules/pm2-logrotate/app.js
user  18162  0.0  0.0 103312   856 pts/0    S+   10:55   0:00 grep pm2
```

At any given time, there should only be three processes listed in this command: one for the daemon, one for the node pm2 instance, and one for the grep command. If there are additional instances running (usually in a pair of a daemon process and node process) you should execute the kill for any daemon instances that are not the most recent one. Note that the logs are streamed in from the most recently activated instance of pm2 - therefore, if you have multiple instances running off of the same port, the logs will only indicate that the API initialization has failed due to the port already being in use until you kill old instances and allow the newest one to connect.

It is also important to note that the issue mentioned above will sometimes cause the production API deployment to fail. Before deploying a new production build of the API, you should instantiate a new pm2 instance by running the following on the production API server and then killing any old pm2 instances:

```bash
cd /var/www/ipr/api/production

pm2 start current/pm2.config.js --env production
```

```text
┌─ Process list ──────────────────────┐┌─ Global Logs ───────────────────────────────────────────────────────────────────────────┐
│[101] IPR-API        Mem:  88 MB     ││ IPR-API > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Retrieved assembly       │
│                                     ││ results                                                                                 │
│                                     ││ IPR-API > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Querying DB for all      │
│                                     ││ tracking tasks with symlinks pending                                                    │
│                                     ││ IPR-API > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Tasks requiring symlink  │
│                                     ││ lookup 17                                                                               │
│                                     ││ IPR-API > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Starting query for       │
│                                     ││ retrieving library lane targets for 51 libraries                                        │
│                                     ││ IPR-API > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Target lanes determined  │
│                                     ││ for each library. Querying for aligned libcores                                         │
│                                     ││ IPR-API > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:21][INFO] Checked in symlinks for  │
│                                     ││ 0 tasks.                                                                                │
│                                     ││ IPR-API > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:21][INFO] Resulting in 7 disease   │
│                                     ││ libraries that have pathology information and need additional library                   │
│                                     ││ details to differentiate RNA vs DNA.                                                    │
└─────────────────────────────────────┘└─────────────────────────────────────────────────────────────────────────────────────────┘
┌─ Custom metrics ────────────────────┐┌─ Metadata ──────────────────────────────────────────────────────────────────────────────┐
│ Loop delay                  0.81ms  ││ App Name              IPR-API                                                           │
│                                     ││ Restarts              0                                                                 │
│                                     ││ Uptime                23h                                                               │
│                                     ││ Script path           /var/www/ipr/api/production/current/bin/www                       │
│                                     ││ Script args           N/A                                                               │
│                                     ││ Interpreter           node                                                              │
│                                     ││ Interpreter args      N/A                                                               │
└─────────────────────────────────────┘└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Structure

```text
.
├── app                                 # Application files
|   |
|   ├── config.js                       # Main configuration module which handles all ENV specific defaults
│   │
│   ├── api                             # API Interfaces
│   │                                   Factories for interacting with API services.
│   │
│   ├── libs                            # Libs
│   │                                   Application specific libraries
│   │
│   ├── middleware                      # Middleware
│   │                                   Location for all globally required middleware definitions.
│   │ 
│   ├── schemas                         # Schemas
│   │                                   Location for all globally required schema definitions.
│   │
│   ├── models                          # Models
│   │                                   Application DB models. Sequelizejs models describe table schemas.
│   │
│   └── routes                          # Routes
│       ├── dir                         Subdirectories contain .js files that return Express.router implementations that handle defined routes.
│       │                               Routes are namespaced into the Express route handler based on parent directory structure.
│       │
│       └── index.js                    Routing index file. Loads special routing files first, then recursively loads child folder structure
│                                       routes. Route namespaces are defined on their nested directory structure.
│
│
│
├── config                              # Config
│                                       Other configuration files
│
├── database                            # Databases
│                                       Local expression and disease data
│
├── package.json                        NodeJS package.json dependency and application definitions file.
│
├── pm2.config.js                       Configuration settings for running the app using PM2
│
├── Dockerfile                          Instructions for creating API docker image
│
├── Dockerfile.db                       Instructions for creating demo db docker image
│
├── bin                                 # Bin
│                                       Contains main application file. Run node server.js to initialize the API server
│
├── demo                                # Demo
│                                       Contains files related to the IPR demo
│
├── docs                                # Docs
│                                       Contains document related files
│
├── keys                                # Keys
│                                       Keycloak dev and production keys
│
├── test                                # Testing
│    ├── dir                            Files and directories of files used for testing
│    │
│    ├── graphkb.mock.js                Mock graphkb reponses used for testing
│    │
│    └── testData                       # Test Data
│                                       Files (images, json files, etc.) used by the test files for testing
│
├── migrations                          # Migrations
│                                       Contains files for updating db schemas and data
│ 
└── migrationTools                      # Migration Tools
                                        Contains files with functions to help with migrations
```

## Docker

The API image requires the DB image and the keycloak image to already have been build and running. If you
are setting up the entire platform, see the [full platform repository](https://github.com/bcgsc/pori)

To build the API image

```bash
docker build -t bcgsc/pori-ipr-api -f Dockerfile .
```

Then to start the container

```bash
docker run -e IPR_DATABASE_HOSTNAME=localhost \
  -e IPR_DATABASE_NAME=ipr_demo \
  -e IPR_DATABASE_PASSWORD=root \
  -e IPR_DATABASE_USERNAME=ipr_service \
  -e IPR_GRAPHKB_PASSWORD=ipr_graphkb_link \
  -e IPR_GRAPHKB_USERNAME=ipr_graphkb_link \
  -e IPR_GRAPHKB_URI='http://localhost:8080/api' \
  -e IPR_KEYCLOAK_KEYFILE=/keys/keycloak.key \
  -e IPR_KEYCLOAK_URI='http://localhost:8888/auth/realms/PORI/protocol/openid-connect/token' \
  --mount type=bind,source="$(pwd)"/keys,target=/keys \
  bcgsc/pori-ipr-api:latest
```
