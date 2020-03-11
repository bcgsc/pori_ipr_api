/**
 * Schema for updating variants on germline reports
 */
const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schema = schemaManager.generate(
  db.models.germline_small_mutation_variant, new JsonSchema7Strategy(), {
    include: ['hidden', 'patient_history', 'family_history'],
    associations: false,
  }
);

module.exports = schema;
