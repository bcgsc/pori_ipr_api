const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../../models');
const {REPORT_EXCLUDE} = require('../../exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schema = schemaManager.generate(db.models.tumourAnalysis, new JsonSchema7Strategy(), {
  exclude: REPORT_EXCLUDE,
  associations: false,
});

schema.$id = '/tumourAnalysisUpdate.js';
schema.required = [];

schema.additionalProperties = false;

module.exports = schema;
