# Integrated Pipeline Reports (IPR) API

![centos build](https://www.bcgsc.ca/bamboo/plugins/servlet/wittified/build-status/IPR-API) ![build](https://github.com/bcgsc/pori_ipr_api/workflows/build/badge.svg?branch=master) [![codecov](https://codecov.io/gh/bcgsc/pori_ipr_api/branch/master/graph/badge.svg?token=9043E24BZR)](https://codecov.io/gh/bcgsc/pori_ipr_api) ![node versions](https://img.shields.io/badge/node-10%20%7C%2012%20%7C%2014-blue) [![postgres versions](https://img.shields.io/badge/postgres-9.6%20-blue)](https://www.orientdb.org/)

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

Unit and Integration tests are run and written using Jest + Supertest with code coverage reports generated using Clover. Tests are configured to run using a local environment variable - this currently cannot be overridden.

To run unit tests, cd into the project root directory and run the command `npm test`. Once completed, it should generate and print summaries for the tests and their coverage. The database user credentials and API user credentials must be set before tests can be run

```bash
npm run test -- --database.password someDbPassword --testing.password someApiPassword
```

or with environment variables

```bash
export IPR_DATABASE_PASSWORD=someDbPassword
export IPR_TESTING_PASSWORD=someApiPassword
npm run test
```

## Generating JSDocs

Developer documentation is generated using the JSDoc library. To generate a local copy of the documentation, cd into the root of the project directory and run the command `npm run jsdoc`. This should automatically create documentation within folder named 'jsdoc' that can be viewed in a web browser.

## Coding Specifications

## Migrating Database Changes

* Create a migration: `npx sequelize migration:create --name name_of_migratrion`
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
createdb -U ipr_service -T templateipr -h iprdevdb.bcgsc.ca DEVSU-777-temp-ipr-sync-dev
```

This then needs to be restored as a new database.

**WARNING: DO NOT RESTORE TO THE PRODUCTION DB SERVER**

```bash
pg_restore -Fc -U ipr_service -T templateipr -h iprdevdb.bcgsc.ca ipr-sync-dev.dump -d DEVSU-777-temp-ipr-sync-dev
```

Finally connect to the newly created database

```bash
psql -h iprdevdb.bcgsc.ca -U ipr_service -d DEVSU-777-temp-ipr-sync-dev
```

Once you are done with testing, delete the temporary database

```bash
dropdb -U ipr_service -h iprdevdb.bcgsc.ca DEVSU-777-temp-ipr-sync-dev
```

## Migrations in Pull Requests

1. Create temp db for ticket (see the `Testing Migration Changes` section)
2. Point `DEFAULT_DB_NAME` varaible to your new temp db in `app/config.js`
3. Test migration and code changes on temp db
4. Once the code works, create a PR and wait for it to be approved
5. Update the migration date to be the latest migration by running `migrationTools/moveMigration.sh`
6. Run migration on `ipr-sync-dev` (helpful to mention you're running a migration on dev in IPR chat)
7. Point `DEFAULT_DB_NAME` variable back to the dev db
8. Wait for PR approval
9. Merge code changes into development branch
10. Delete the temp db you created

## Process Manager

The production installation of IPR is run & managed by a [pm2](http://pm2.keymetrics.io/) instance on `iprweb03.bcgsc.ca`. The test API is run off of iprweb01 and the development API is run off of iprdev01.

As of this writing, pm2 is instantiated by bpierce, and as a result, the processes it manages execute as bpierce.

To interact with pm2, ssh to iprweb03 and cd to `/var/www/ipr/api/[production]`. From here, running pm2 will list the running instances:

```text
bpierce@iprweb01:/var/www/ipr/api/production$ pm2 list
┌────────────────────┬─────┬──────┬───────┬────────┬─────────┬────────┬─────┬───────────┬──────────┐
│ App name           │ id  │ mode │ pid   │ status │ restart │ uptime │ cpu │ mem       │ watching │
├────────────────────┼─────┼──────┼───────┼────────┼─────────┼────────┼─────┼───────────┼──────────┤
│ IPR-API            │ 101 │ fork │ 23409 │ online │ 0       │ 23h    │ 0%  │ 92.7 MB   │ disabled │
└────────────────────┴─────┴──────┴───────┴────────┴─────────┴────────┴─────┴───────────┴──────────┘
 Module activated
┌───────────────┬─────────┬────────────┬────────┬─────────┬─────┬─────────────┐
│ Module        │ version │ target PID │ status │ restart │ cpu │ memory      │
├───────────────┼─────────┼────────────┼────────┼─────────┼─────┼─────────────┤
│ pm2-logrotate │ 2.2.0   │ N/A        │ online │ 5       │ 0%  │ 91.727 MB   │
└───────────────┴─────────┴────────────┴────────┴─────────┴─────┴─────────────┘
 Use `pm2 show <id|name>` to get more details about an app
```

`IPR-API` is the main, production application server running on port 8001 on iprweb03.
`IPR-API-dev` is the development API server running on port 8081 on iprdev01.
`IPR-API-test` is the test API server running on port 8081 on iprweb01.

It is possible to use pm2 to actively monitor the console of the applications by using `pm2 monit`.

Note: The pm2 daemon will sometimes launch a new instance of pm2 when running pm2 commands as opposed to accessing the currently running version of pm2. You can tell if there are multiple instances running by executing the command `ps aux | grep pm2`

```text
[nmartin@iprweb03 ~]$ ps aux | grep pm2
bpierce  13787  0.1  1.2 952276 50004 ?        Ssl  Jul20   9:28 PM2 v3.0.0: God Daemon (/home/bpierce/.pm2)
bpierce  13800  0.1  1.5 1224456 61028 ?       Ssl  Jul20   9:49 node /home/bpierce/.pm2/node_modules/pm2-logrotate/app.js
nmartin  18162  0.0  0.0 103312   856 pts/0    S+   10:55   0:00 grep pm2
```

At any given time, there should only be three processes listed in this command: one for the daemon, one for the node pm2 instance, and one for the grep command. If there are additional instances running (usually in a pair of a daemon process and node process) you should execute the kill command as bpierce for any daemon instances that are not the most recent one. Note that the logs are streamed in from the most recently activated instance of pm2 - therefore, if you have multiple instances running off of the same port, the logs will only indicate that the API initialization has failed due to the port already being in use until you kill old instances and allow the newest one to connect.

It is also important to note that the issue mentioned above will sometimes cause the production API deployment to fail. Before deploying a new production build of the API, you should instantiate a new pm2 instance by running the following on the production API server and then killing any old pm2 instances:

```bash
cd /var/www/ipr/api/production

pm2 start current/pm2.config.js --env production
```

```text
┌─ Process list ──────────────────────┐┌─ Global Logs ───────────────────────────────────────────────────────────────────────────┐
│[101] IPR-API        Mem:  88 MB     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Retrieved     │
│                                     ││ assembly results                                                                        │
│[ 0] pm2-logrotate     Mem:  91 MB   ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Checked in    │
│                                     ││ assembly for 0 tasks.                                                                   │
│                                     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Querying DB   │
│                                     ││ for all tracking tasks with symlinks pending                                            │
│                                     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Tasks         │
│                                     ││ requiring symlink lookup 17                                                             │
│                                     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Starting      │
│                                     ││ query for retrieving library lane targets for 51 libraries                              │
│                                     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Target        │
│                                     ││ lanes determined for each library. Querying for aligned libcores                        │
│                                     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:21][INFO] Checked in    │
│                                     ││ symlinks for 0 tasks.                                                                   │
│                                     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:21][INFO] Finished      │
│                                     ││ processing BioApps syncing.                                                             │
│                                     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:21][INFO] Found 7       │
│                                     ││ results from LIMS sample endpoint.                                                      │
│                                     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:21][INFO] Starting to   │
│                                     ││ process sample results.                                                                 │
│                                     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:21][INFO] Resulting     │
│                                     ││ in 7 disease libraries that have pathology information and need additional library      │
│                                     ││ details to differentiate RNA vs DNA.                                                    │
└─────────────────────────────────────┘└─────────────────────────────────────────────────────────────────────────────────────────┘
┌─ Custom metrics (http://bit.ly/code─┐┌─ Metadata ──────────────────────────────────────────────────────────────────────────────┐
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
│   ├── libs                            # Application specific libraries
│   │
│   ├── middleware                      # Middleware
│   │                                   Location for all globally required middleware definitions.
│   │
│   ├── models                          # Models
│   │                                   Application DB models. Sequelizejs models describe table schemas.
│   │
│   ├── modules                         # Modules
│   │   │                               Isolated, independant application modules. Germline reports, biopsy/analysis.
│   │   │                                Most logic for these modules is kept within the /module/ directory. There might be a few exceptions to this rule.
│   │   │
│   │   ├── module_a                      An individual model component. Each module has packing for exceptions, middleware, models, routing, and
│   │   │   │                            unique elements
│   │   │   │
│   │   │   ├── exceptions              Custom exceptions for the module
│   │   │   │
│   │   │   ├── middleware              Middleware definitions
│   │   │   │
│   │   │   ├── models                  Any DB schema models
│   │   │   │
│   │   │   ├── routing                 Routing & controllers for the module
│   │   │   │
│   │   │   ├── other                   Custom/one-off directories for special functions
│   │   │   │
│   │   │   ├── objectA.js               OOP or library for a given object/model in the module
│   │   │   ├── objectB.js               OOP or library for a given object/model in the module
│   │   │   └── objectC.js               OOP or library for a given object/model in the module
│   │   │
│   │   │
│   │   └── module_n
│   │
│   │
│   └── routes                          # Routes
│       ├── dir                         Subdirectories contain .js files that return Express.router implementations that handle defined routes.
│       │                                Routes are namespaced into the Express route handler based on parent directory structure.
│       │
│       └── index.js                    Routing index file. Loads special routing files first, then recursively loads child folder structure
│                                       routes. Route namespaces are defined on their nested directory structure.
│
│
│
├── config                              # Other Configuration files
│
├── database                            # Databases
│   ├── development.sqlite              Local development DB - not to be commited to source
│   └── tcga.json                       Local json TCGA definitions DB
│
├── lib                                 # Non-Application specific Libs
│
├── package.json                        NodeJS package.json dependency and application definitions file.
│
├── server.js                           Main application file. Run node server.js to initialize the API server
│
├── test                                # Testing
│    ├── exclude                        Folder exlcuded from recursively auto-loading test files.
│    │
│    ├── dir                            Directory containing namespace'd test definitions
│    │
│    └── tests.js                       Root test file, recursive test loader.
│
└── migrations                          # Migrations
                                        Special one-use functions used to migrate data, and models to updated schemas.
```

## Docker

The API image requires the DB image and the keycloak image to already been build and running. If you
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
