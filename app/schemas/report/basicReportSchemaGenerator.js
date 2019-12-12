const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const {REPORT_EXCLUDE} = require('../exclude');
const schemaConfig = require('../../../config/schema');

const schemaManager = new JsonSchemaManager();

/**
 * Converts a Sequelize model into a draft-07 JSON schema with
 * some started report options set
 *
 * @param {object} model - Sequelize model
 * @returns {object} - Returns a schema for the given
 */
const schemaGenerator = (model) => {
  const schema = schemaManager.generate(model, new JsonSchema7Strategy(), {
    exclude: REPORT_EXCLUDE,
    associations: false,
  });

  schema.$schema = schemaConfig.version;
  return schema;
};

module.exports = schemaGenerator;
