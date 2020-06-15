/**
 * Schema for the germline report upload
 */
const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {BASE_EXCLUDE} = require('../exclude');
const variant = require('./variants');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schema = schemaManager.generate(
  db.models.germline_small_mutation, new JsonSchema7Strategy(), {
    exclude: [...BASE_EXCLUDE, 'biofx_assigned_id'],
    associations: false,
  }
);

schema.properties.rows = {
  type: 'array',
  items: variant,
};

schema.properties.project = {
  type: 'string',
};


schema.additionalProperties = false;

module.exports = schema;
