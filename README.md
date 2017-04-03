### POG Reports API
======================================

This API will store and serve Genomic and (future) Probe report data pertaining to all BC Cancer Angecy POG cases.
Currently cases have to be loaded on an as-necessary basis. Future pipeline support will include automated triggering of
the loading process. The API is designed in conjunction with the POG Report WebApp client to render and display the
data. The API is backed by a Postgres 9.6 database currently hosted on iprweb01.bcgsc.ca. The API is available at
http://api-ipr.bcgsc.ca. Detailed endpoint documentation can be found at http://docs-ipr.bcgsc.ca.


#### Configuration
======================================

This repository contains configuration profiles for production, testing, and development environments. A profile will be
selected based on the NODE_ENV environment setting, or by explicitly calling --env [testing|production|development] when
initializing the server.


#### Install
======================================

After pulling or cloning down the repository, the server's dependencies need to be installed:
```
npm install
```

This process can take between 1-5 minutes depending on caches, and connection speed. Once NPM has finished installing
all required dependencies, the server can be started with the following command:
```
node server.js
```

If a new database installation is required:
```
node server.js --database.migrate --database.hardMigrate
```
--
WARNING: Using the `--database.hardMigrate` flag will overwrite any existing data in the database. This flag will not
execute in production mode.
--

#### Structure
======================================

```
.
├── app                                 # Application files
│   │
│   ├── libs                            # Application specific libraries
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
│   └── routes                          # Routes
│       ├── dir                         Subdirectories contain .js files that return Express.router implementations that handle defined routes.
│       │                                Routes are namespaced into the Express route handler based on parent directory structure.
│       │
│       └── index.js                    Routing index file. Loads special routing files first, then recursively loads child folder structure
│                                        routes. Route namespaces are defined on their nested directory structure.
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