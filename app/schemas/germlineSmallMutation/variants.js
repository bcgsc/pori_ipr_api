const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {BASE_EXCLUDE} = require('../exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schema = schemaManager.generate(
  db.models.germline_small_mutation_variant, new JsonSchema7Strategy(), {
    exclude: BASE_EXCLUDE,
    associations: false,
  }
);

module.exports = schema;
