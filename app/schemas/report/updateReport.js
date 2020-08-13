const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const {BASE_EXCLUDE} = require('../exclude');
const db = require('../../models');


const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schema = schemaManager.generate(db.models.analysis_report, new JsonSchema7Strategy(), {
  exclude: BASE_EXCLUDE,
  associations: false,
});

schema.additionalProperties = false;
schema.required = [];

module.exports = schema;
