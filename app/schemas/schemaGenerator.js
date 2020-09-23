const {JsonSchemaManager, JsonSchema7Strategy, OpenApi3Strategy} = require('@alt3/sequelize-to-json-schemas');
const {REPORT_EXCLUDE} = require('./exclude');

/**
 * Converts a Sequelize model into a draft-07 JSON schema or
 * an OpenAPI 3 schema
 *
 * @param {object} model - Sequelize model
 * @param {object} options - An object containing additional options for schema generation
 *
 * @param {string} options.baseUri - The base URI to use for schema
 * @param {boolean} options.jsonSchema - Whether to generate a json schema or an openApi schema
 * @param {object} options.properties - Additional properties to add to the schema
 * @param {Array<string>} options.include - Fields of model to only include in schema
 * @param {Array<string>} options.exclude - Fields of model to exclude from schema
 * @param {boolean} options.associations - Do you want to include the models associations
 * @param {Array<string>} options.includeAssociations - List of associations to include
 * @param {Array<string>} options.excludeAssociations - List of associations to exclude
 * @param {boolean} options.nothingRequired - Whether nothing is required for this schema
 * @param {Array<string>} options.required - Fields that are required
 * @param {boolean} options.isSubSchema - Whether the schema is a section of another schema
 * @param {boolean} options.additionalProperties - Whether to allow additional properties or not
 * @param {string} options.title - Add a title for the schema
 *
 * @returns {object} - Returns a schema based on the given model
 */
const schemaGenerator = (model, {
  baseUri = '/', jsonSchema = true, properties = {}, include = [], exclude = REPORT_EXCLUDE,
  associations = false, excludeAssociations = [], includeAssociations = [], nothingRequired = false,
  required = [], isSubSchema = false, additionalProperties = false, title = null,
} = {}) => {
  // Setup schemaManager
  const schemaManager = new JsonSchemaManager({
    baseUri,
    secureSchemaUri: false,
  });

  // Get type of schema to generate
  const type = (jsonSchema) ? new JsonSchema7Strategy() : new OpenApi3Strategy();

  // Generate the schema
  const schema = schemaManager.generate(model, type, {
    ...((title) ? {title} : {}),
    ...(include.length > 0 ? {include} : {exclude}),
    ...(includeAssociations.length > 0 ? {includeAssociations} : {excludeAssociations}),
    associations,
  });

  // Update what's required
  if (nothingRequired) {
    schema.required = [];
  } else {
    schema.required = (schema.required || []).concat(required);
  }

  // Update the schema's properties
  schema.properties = {
    ...schema.properties,
    ...properties,
  };

  // If sub-schema remove schema draft details
  if (isSubSchema) {
    delete schema.$schema;
  }

  schema.additionalProperties = additionalProperties;
  return schema;
};

module.exports = schemaGenerator;
