const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const {REPORT_EXCLUDE} = require('../exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

/**
 * Converts a Sequelize model into a draft-07 JSON schema with
 * some report options set
 *
 * @param {object} model - Sequelize model
 * @returns {object} - Returns a schema based on the given model
 */
const schemaGenerator = (model) => {
  const schema = schemaManager.generate(model, new JsonSchema7Strategy(), {
    exclude: REPORT_EXCLUDE,
    associations: false,
  });

  schema.additionalProperties = false;
  return schema;
};

module.exports = schemaGenerator;
