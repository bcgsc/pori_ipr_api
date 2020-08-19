const {JsonSchemaManager, JsonSchema7Strategy, OpenApi3Strategy} = require('@alt3/sequelize-to-json-schemas');
const {REPORT_EXCLUDE} = require('./exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

/**
 * Converts a Sequelize model into a draft-07 JSON schema or
 * an OpenAPI 3 schema
 *
 * @param {object} model - Sequelize model
 * @param {object} options - An object containing additional options for schema generation
 *
 * @param {boolean} options.jsonSchema - Whether to generate a json schema or an openApischema
 * @param {object} options.properties - Additional properties to add to the schema
 * @param {Array<string>} options.exclude - Fields of model to exclude from schema
 * @param {boolean} options.associations - Do you want to include the models associations
 * @param {Array<string>} options.excludeAssociations - List of associations to exclude
 * @param {boolean} options.nothingRequired - Whether nothing is required for this schema
 * @param {Array<string>} options.required - Fields that are required
 * @param {boolean} options.additionalProperties - Whether to allow additional properties or not
 *
 * @returns {object} - Returns a schema based on the given model
 */
const schemaGenerator = (model, {
  jsonSchema = true, properties = {}, exclude = REPORT_EXCLUDE, associations = false,
  excludeAssociations = [], nothingRequired = false, required = [], additionalProperties = false,
} = {}) => {
  // Get type of schema to generate
  const type = (jsonSchema) ? new JsonSchema7Strategy() : new OpenApi3Strategy();

  // Generate the schema
  const schema = schemaManager.generate(model, type, {
    exclude,
    excludeAssociations,
    associations,
  });

  // Update what's required
  if (nothingRequired) {
    schema.required = [];
  } else {
    schema.required = schema.required.concat(required);
  }

  // Update the schema's properties
  schema.properties = {
    ...schema.properties,
    ...properties,
  };

  schema.additionalProperties = additionalProperties;
  delete schema.$id;
  return schema;
};

module.exports = schemaGenerator;
