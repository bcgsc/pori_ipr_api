/**
 * Schema for the therapeutic targets POST and PUT endpoints
 */
const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {REPORT_EXCLUDE} = require('../exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schema = schemaManager.generate(
  db.models.therapeuticTarget, new JsonSchema7Strategy(), {
    exclude: [...REPORT_EXCLUDE],
    associations: false,
  }
);

// Remove all default options from object
Object.values(schema.properties).forEach((property) => {
  delete property.default;
});

schema.additionalProperties = false;
schema.required = [];
schema.$id = '/therapeuticUpdateSchema.js';

module.exports = schema;
