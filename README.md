### Integrated Pipeline Reports API
======================================

![Build Status](https://www.bcgsc.ca/bamboo/plugins/servlet/wittified/build-status/IPR-API)

The Integrated pipeline reports API manages data access to the IPR database on seqdevdb01.bcgsc.ca.
The API is responsible for providing all data for GSC genomic and probe reports, POG sample tracking, 
POG Biopsy tracking, Germline Small Mutation reports, and legacy Knowledgebase.

An integrated data synchronization application runs concurrently with the API in a separate process.
The sync-worker is responsible for regularly checking in with LIMS and BioApps to keep sample tracking
tasks up to date. 


#### Configuration
======================================

This repository contains configuration profiles for production, testing, and development environments. A profile will be
selected based on the NODE_ENV environment setting, or by explicitly calling --env [testing|production|development] when
initializing the server.



#### Install
======================================

After cloning the repository, the application's dependencies need to be installed:
```
npm install
```

This process can take between 1-5 minutes depending on caches, and connection speed. Once NPM has finished installing
all required dependencies, the server can be started with the following command:
```
NODE_ENV=[local|development|testing|production] npm start
```

If NPM is not available, the application server can be booted by executing through node directly:
```
NODE_ENV=[local|development|testing|production] node bin/www
```

If a new database installation is required:
```
npm run migrate --database.migrate --database.hardMigrate
```

WARNING: Using the `--database.hardMigrate` flag will overwrite any existing data in the database. This flag will not
execute in production mode.

To create *new* tables only, run with the `--database.migrate` flag only or `npm run migrate` with the appropriate
environment flag set.




#### Configuration
======================================

The application server expects to find a `.env.json` file in one of two places:

1. For local & development environments in the root folder: `./.env.json`
2. For production & testing, it expects to find it in a parent folder: `../persist/.env.json`


The format for the file declares a configuration by environment:
```
{
  "development": {
    "database": {
      "engine": "postgres",
      "migrate": false,
      "hardMigration": false,

      "postgres": {
        "hostname": "seqdevdb01.bcgsc.ca",
        "port": 5432,
        "username": "AzureDiamond",
        "password": "hunter2",
        "schema": "public",
        "database": "ipr-dev",
        "prefix": ""
      }
    }
  },

  "test": {
    "database": {
      "engine": "postgres",
      "migrate": false,
      "hardMigration": false,

      "postgres": {
        "hostname": "seqdevdb01.bcgsc.ca",
        "port": 5432,
        "username": "AzureDiamond",
        "password": "hunter2",
        "schema": "public",
        "database": "ipr-test",
        "prefix": ""
      }
    }
  },

  "local": {
    "database": {
      "engine": "postgres",
      "migrate": false,
      "hardMigration": false,

      "postgres": {
        "hostname": "seqdevdb01.bcgsc.ca",
        "port": 5432,
        "username": "AzureDiamond",
        "password": "hunter2",
        "schema": "public",
        "database": "ipr-dev",
        "prefix": ""
      }
    }
  }
}

```


##### Settings

* `database` - Defines the DB settings
* `engine` - The database engine/driver being used
* `migrate` - Default state for migration settings - Keep to false! When true, SequelizeJS attempts to create tables according to the loaded schema
* `hardMigrate` - When true, SequelizeJS will drop all tables and recreate based on the current loaded models.

* `postgres` - Settings for Postgres engine
* `hostname` - Hostname for the database server
* `port` - Port to connect to the DB on
* `username` - The username the application should be connecting with
* `password` - DB password for the nominated user account
* `schema` - PGSQL only; The schema the database is namespaced under
* `database` - Name of the database
* `prefix` - Not in use.




#### Process Manager
======================================

The production installation of IPR is run & managed by a [pm2](http://pm2.keymetrics.io/) instance on `iprweb01.bcgsc.ca`.
As of this writing, pm2 is instantiated by bpierce, and as a result, the processes it manages execute as bpierce.

To interact with pm2, ssh to iprweb01 and cd to `/var/www/ipr/api/[production|development]`. From here, running pm2 will list the running instances:

```
bpierce@iprweb01:/var/www/ipr/api/production$ pm2 list
┌────────────────────┬─────┬──────┬───────┬────────┬─────────┬────────┬─────┬───────────┬──────────┐
│ App name           │ id  │ mode │ pid   │ status │ restart │ uptime │ cpu │ mem       │ watching │
├────────────────────┼─────┼──────┼───────┼────────┼─────────┼────────┼─────┼───────────┼──────────┤
│ IPR-API            │ 101 │ fork │ 23409 │ online │ 0       │ 23h    │ 0%  │ 92.7 MB   │ disabled │
│ IPR-API-dev        │ 103 │ fork │ 24782 │ online │ 0       │ 23h    │ 0%  │ 79.3 MB   │ disabled │
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

`IPR-API` is the main, production application server running on 8001
`IPR-API-dev` is the development API server running on 8081
`IPR-API-syncWorker` is the synchronizer task that works to keep the tracking data in sync with LIMS and BioApps.
Note: It is exepcted for the syncWorker to have restarts - it's mean to fail-safe by crashing and restarting.

It is possible to use pm2 to actively monitor the console of the applications by using `pm2 monit`.

```
┌─ Process list ──────────────────────┐┌─ Global Logs ───────────────────────────────────────────────────────────────────────────┐
│[101] IPR-API        Mem:  88 MB     ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Retrieved     │
│[103] IPR-API-dev     Mem:  79 MB    ││ assembly results                                                                        │
│[102] IPR-API-syncWorker      Mem:   ││ IPR-API-syncWorker > 2018-01-05 14:22 -08:00: [2018-01-05 14:22:20][INFO] Checked in    │
│[ 0] pm2-logrotate     Mem:  91 MB   ││ assembly for 0 tasks.                                                                   │
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
It contacts the LIMS `/source` endpoint and collects all libraries associated with the POGID. Through a few more library endpoints, it uses
the protocol detail for each library to determine normal vs. tumour vs. transcriptome. It is assumed by the presence of an entry in LIMS
that pathology has passed.

###### LIMS Sequencing Sync
This task characterizes the sequencing state of pending POG cases in tracking. First POGs pending sequencing submission are queried against the
`/illumin_run` endpoint to see which have entries. If _any_ entry is existent, the "sequencing started" task is satisfied.

Next, sequencing completed status is checked for at the same endpoint. As are QC passed and Validation.

###### BioApps Sync
The tracking system seeks to answer four states/questions from BioApps:
1. Were early assumptions about libraries correct & what is the biop# in BioApps
2. Has symlinking been completed?
3. Is a merged BAM available?
4. Has assembly completed?

The `/patient` endpoints in BioApps satisfy (1.) - Comparators, biop#, libaries, disease details, and more are pulled from BioApps.
Symlinking completed requires checking to see if the total number of aligned libcores is equal to the number of target lane for each library.
Merged BAMs have their own endpoint, and are easy to check via this endpoint. The same is true for Assembly completed.





#### Structure
======================================

```
.
├── app                                 # Application files
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
│   │   │                               Isolated, independant application modules. Tracking, germline reports, biopsy/analysis, knowledgebase.
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
├── config                              # Configuration
│   └── file.json                       JSON formatted configuration files.
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