### Integrated Pipeline Reports API
======================================

![Build Status](https://www.bcgsc.ca/bamboo/plugins/servlet/wittified/build-status/IPR-API)

The Integrated pipeline reports API manages data access to the IPR database on seqdevdb01.bcgsc.ca.
The API is responsible for providing all data for GSC genomic and probe reports, POG sample tracking,
POG Biopsy tracking and Germline Small Mutation reports.

An integrated data synchronization application runs concurrently with the API in a separate process.
The sync-worker is responsible for regularly checking in with LIMS and BioApps to keep sample tracking
tasks up to date.

#### Installation
======================================

After cloning the repository, the application's dependencies need to be installed:
```
npm install
```

This process can take between 1-5 minutes depending on caches, and connection speed. Once NPM has finished installing
all required dependencies, the server can be started with the following command:
```
NODE_ENV=[local|development|production|staging|test] npm start
```

To start the synchronizer server, run the following command:
```
NODE_ENV=[local|development|production] npm run sync
```

If NPM is not available, the application server can be booted by executing through node directly:
```
NODE_ENV=[local|development|production] node bin/www
```

If a new database installation is required:
```
npm run migrate --database.migrate --database.hardMigrate
```

WARNING: Using the `--database.hardMigrate` flag will overwrite any existing data in the database. This flag will not
execute in production mode.

To create *new* tables only, run with the `--database.migrate` flag only or `npm run migrate` with the appropriate
environment flag set.

Please note that database migration will not execute alter statements (e.g. adding/editing columns on an existing table). These changes will need to be applied in the sequelize model as well as directly in the database itself to take effect.


#### Configuration
======================================

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


#### Running Tests with Mocha
======================================

Unit and Integration tests are run and written using Mocha + Chai with code coverage reports generated using Istanbul/NYC and Clover. Tests are configured to run using a local environment variable - this currently cannot be overridden.

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

#### Generating JSDocs
======================================

Developer documentation is generated using the JSDoc library. To generate a local copy of the documentation, cd into the root of the project directory and run the command `npm run jsdoc`. This should automatically create documentation within folder named 'jsdoc' that can be viewed in a web browser.

#### Migrating Database Changes
======================================

* Create a migration: `npx sequelize migration:create --name name_of_migratrion`
* Write up and down functions in your migration file
* According to your changes in migration file, change your Sequelize models manually
* Run: `npx sequelize-cli db:migrate` or `npx sequelize-cli db:migrate --url 'mysql://root:password@mysql_host.com/database_name'`

Sequelize Migration Docs: http://docs.sequelizejs.com/manual/migrations.html

#### Process Manager
======================================

The production installation of IPR is run & managed by a [pm2](http://pm2.keymetrics.io/) instance on `iprweb03.bcgsc.ca`. The test API is run off of iprweb01 and the development API is run off of iprdev01.

As of this writing, pm2 is instantiated by bpierce, and as a result, the processes it manages execute as bpierce.

To interact with pm2, ssh to iprweb03 and cd to `/var/www/ipr/api/[production]`. From here, running pm2 will list the running instances:

```
bpierce@iprweb01:/var/www/ipr/api/production$ pm2 list
┌────────────────────┬─────┬──────┬───────┬────────┬─────────┬────────┬─────┬───────────┬──────────┐
│ App name           │ id  │ mode │ pid   │ status │ restart │ uptime │ cpu │ mem       │ watching │
├────────────────────┼─────┼──────┼───────┼────────┼─────────┼────────┼─────┼───────────┼──────────┤
│ IPR-API            │ 101 │ fork │ 23409 │ online │ 0       │ 23h    │ 0%  │ 92.7 MB   │ disabled │
│ IPR-API-syncWorker │ 102 │ fork │ 23691 │ online │ 152     │ 9h     │ 0%  │ 62.5 MB   │ disabled │
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
`IPR-API-syncWorker` is the synchronizer task that works to keep the tracking data in sync with LIMS and BioApps on iprweb03.
`IPR-API-dev` is the development API server running on port 8081 on iprdev01.
`IPR-API-test` is the test API server running on port 8081 on iprweb01.
Note: It is exepcted for the syncWorker to have restarts - it's mean to fail-safe by crashing and restarting.

It is possible to use pm2 to actively monitor the console of the applications by using `pm2 monit`.

Note: The pm2 daemon will sometimes launch a new instance of pm2 when running pm2 commands as opposed to accessing the currently running version of pm2. You can tell if there are multiple instances running by executing the command `ps aux | grep pm2`
```
[nmartin@iprweb03 ~]$ ps aux | grep pm2
bpierce  13787  0.1  1.2 952276 50004 ?        Ssl  Jul20   9:28 PM2 v3.0.0: God Daemon (/home/bpierce/.pm2)
bpierce  13800  0.1  1.5 1224456 61028 ?       Ssl  Jul20   9:49 node /home/bpierce/.pm2/node_modules/pm2-logrotate/app.js
nmartin  18162  0.0  0.0 103312   856 pts/0    S+   10:55   0:00 grep pm2
```
At any given time, there should only be three processes listed in this command: one for the daemon, one for the node pm2 instance, and one for the grep command. If there are additional instances running (usually in a pair of a daemon process and node process) you should execute the kill command as bpierce for any daemon instances that are not the most recent one. Note that the logs are streamed in from the most recently activated instance of pm2 - therefore, if you have multiple instances running off of the same port, the logs will only indicate that the API initialization has failed due to the port already being in use until you kill old instances and allow the newest one to connect.

It is also important to note that the issue mentioned above will sometimes cause the production API deployment to fail. Before deploying a new production build of the API, you should instantiate a new pm2 instance by running the following on the production API server and then killing any old pm2 instances:
```
cd /var/www/ipr/api/production

pm2 start current/pm2.config.js --env production
```


```
┌─ Process list ──────────────────────┐┌─ Global Logs ───────────────────────────────────────────────────────────────────────────┐
│[101] IPR-API        Mem:  88 MB     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Retrieved     │
│[102] IPR-API-syncWorker      Mem:   ││ assembly results                                                                        │
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
In the above screenshot, the syncWorker task is busy running a job against LIMS API.


#### Synchronizer tasks
======================================

IPR's Tracking system has three primary synchronizer tasks:

1. LIMS Pathology Sync
2. LIMS Sequencing Sync
3. BioApps Sync

###### LIMS Pathology Sync
Attempts to retrieve pathology passed information, as well as library details for a POG. Effectively it starts with 1 data point: POGID.
It contacts the LIMS `/libraries/search` endpoint and collects all libraries associated with the POGID. Through a few more library endpoints, it uses
the protocol detail for each library to determine normal vs. tumour vs. transcriptome. It is assumed by the presence of an entry in LIMS
that pathology has passed.

###### LIMS Sequencing Sync
This task characterizes the sequencing state of pending POG cases in tracking. First POGs pending sequencing submission are queried against the
`/sequencer-runs/search` endpoint to see which have entries. If _any_ entry is existent, the "sequencing started" task is satisfied.

Next, sequencing completed status is checked for at the same endpoint. As are QC passed and Validation.

###### BioApps Sync
The tracking system seeks to answer four states/questions from BioApps:
1. Were early assumptions about libraries correct & what is the biop# in BioApps
2. Has symlinking been completed?
3. Is a merged BAM available?
4. Has assembly completed?

The `/patient_analysis` endpoints in BioApps satisfy (1.) - Comparators, biop#, libaries, disease details, and more are pulled from BioApps.
Symlinking completed requires checking to see if the total number of aligned libcores is equal to the number of target lane for each library.
Merged BAMs have their own endpoint, and are easy to check via this endpoint. The same is true for Assembly completed.





#### Structure
======================================

```
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
│   ├── exporters                       # Exporters
│   │                                   Libraries for exporting data from IPR to csv or tsv files.
│   │
│   │
│   ├── loaders                         # Loaders
│   │   ├── dir                         Subdirectories contain namespace'd loader files for scraping text files to be read into DB.
│   │   │
│   │   └── index.js                    All loaders are defined in the loaders/index.js file for inclusion in the POG loading process.
│   │
│   │
│   ├── middleware                      # Middleware
│   │                                   Location for all globally required middleware definitions.
│   │
│   ├── models                          # Models
│   │                                   Application DB models. Sequelizejs models describe table schemas. On load, system reads in schemas
│   │                                    and if --database.hardMigrate is defined on init, all current tables are dropped and redefined.
│   │
│   ├── migrations                      # Migrations
│   │                                   Special one-use functions used to migrate data, and models to updated schemas.
│   │
│   │
│   ├── modules                         # Modules
│   │   │                               Isolated, independant application modules. Tracking, germline reports, biopsy/analysis.
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
│   ├── routes                          # Routes
│   │   ├── dir                         Subdirectories contain .js files that return Express.router implementations that handle defined routes.
│   │   │                                Routes are namespaced into the Express route handler based on parent directory structure.
│   │   │
│   │   └── index.js                    Routing index file. Loads special routing files first, then recursively loads child folder structure
│   │                                    routes. Route namespaces are defined on their nested directory structure.
│   │
│   └── synchronizer                    # Synchronizer clock
│                                       Application library/function that supports cron-like repeating timed events for synchronizing
│                                        data with other API services.
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
└── test                                # Testing
    ├── exclude                         Folder exlcuded from recursively auto-loading test files.
    │
    ├── dir                             Directory containing namespace'd test definitions
    │
    └── tests.js                        Root test file, recursive test loader.
```
