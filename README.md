### Integrated Pipeline Reports API
======================================

![Build Status](https://www.bcgsc.ca/bamboo/plugins/servlet/wittified/build-status/IPR-API)

The Integrated pipeline reports API manages data access to the IPR database on seqdevdb01.bcgsc.ca.
The API is responsible for providing all data for GSC genomic, probe reports, and Germline Small Mutation reports.

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

If NPM is not available, the application server can be booted by executing through node directly:
```
NODE_ENV=[local|development|production] node bin/www
```

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
* Run: `npx sequelize-cli db:migrate` or

```bash
export PGPASSWORD='PASSWORD'
npx sequelize-cli db:migrate --url "postgres://ipr_service@iprdevdb:5432/ipr-sync-dev"
```

Sequelize Migration Docs: http://docs.sequelizejs.com/manual/migrations.html

##### Testing Migration Changes

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

To see the current list of databases

```bash
psql -l -U ipr_service -h iprdevdb.bcgsc.ca
```


#### Deployment
======================================

The deployment follows our standard web application stack set up (https://www.bcgsc.ca/wiki/display/DEVSU/Web+Applications+Server+Stack)
using PM2 and Bamboo


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
