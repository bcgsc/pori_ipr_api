const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const {BASE_EXCLUDE} = require('../../exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const REPORT_EXCLUDE = ['createdBy_id', ...BASE_EXCLUDE];

/**
 * generate the schema for a section of the report (intended to be used as part of a larger schema)
 *
 * @param {object} model the sequelize db model to use as the base for generating the schema
 * @param {object} additional these are schema properties to be added post-creation from the model
 * @param {object} additional.properties properties to add
 * @param {Array} additional.exclude relationships to exclude (in addition to the report relationships)
 * @param {Array} additional.required additional properties to be required
 *
 * @returns {object} the JSON schema portion to be added as part of a larger schema
 */
const generateReportSubSchema = (model, {properties = {}, exclude = [], required = []}) => {
  const schema = schemaManager.generate(model, new JsonSchema7Strategy(), {
    exclude: [...REPORT_EXCLUDE, ...exclude],
    associations: false,
  });

  schema.additionalProperties = false;
  schema.required = [...schema.required || [], ...required];
  schema.properties = {
    ...schema.properties,
    ...properties,
  };

  // remove association schema draft versions
  delete schema.$schema;
  return schema;
};


module.exports = {generateReportSubSchema};
