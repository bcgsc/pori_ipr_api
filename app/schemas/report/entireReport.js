const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
//const {BASE_EXCLUDE} = require('./exclude');
const schemaConfig = require('../../../config/schema');

const schemaManager = new JsonSchemaManager();

const schema = schemaManager.generate(db.models.analysis_report, new JsonSchema7Strategy(), {
  //exclude: BASE_EXCLUDE,
  associations: true,
  //includeAssociations: ['smallMutations'],
});

schema.$schema = schemaConfig.version;
schema.additionalProperties = false;

module.exports = schema;
