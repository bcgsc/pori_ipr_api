const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../models');
const {BASE_EXCLUDE} = require('./exclude');
const schemaConfig = require('../../config/schema');

const schemaManager = new JsonSchemaManager();

// user specific excluded fields from model
const userExcludes = ['password', 'jiraToken', 'jiraXsrf', 'settings', 'access', 'lastLogin'];

const exclude = BASE_EXCLUDE.concat(userExcludes);

const schema = schemaManager.generate(db.models.user, new JsonSchema7Strategy(), {
  exclude,
  associations: false,
});

schema.$schema = schemaConfig.version;

module.exports = schema;
