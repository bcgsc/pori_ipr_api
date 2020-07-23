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

schema.additionalProperties = false;
schema.$id = '/therapeuticPostSchema.js';

module.exports = schema;
