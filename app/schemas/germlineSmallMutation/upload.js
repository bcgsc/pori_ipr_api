/**
 * Schema for the germline report upload
 */
const db = require('../../models');
const schemaGenerator = require('../schemaGenerator');
const {BASE_EXCLUDE, GERMLINE_EXCLUDE} = require('../exclude');
const {UPLOAD_BASE_URI} = require('../../constants');

// Generate variants schema
const generateGermlimeUploadSchema = (isJsonSchema = true) => {
  const variantSchema = schemaGenerator(db.models.germlineSmallMutationVariant, {
    isJsonSchema, baseUri: UPLOAD_BASE_URI, exclude: GERMLINE_EXCLUDE,
  });

  // Set additional properties
  const properties = {
    rows: {
      type: 'array',
      items: variantSchema,
    },
    project: {
      type: 'string',
    },
    version: {
      type: 'string',
    },
    source: {
      type: 'string',
    },
  };

  // Generate schema
  const schema = schemaGenerator(db.models.germlineSmallMutation, {
    isJsonSchema,
    baseUri: UPLOAD_BASE_URI,
    exclude: [...BASE_EXCLUDE, 'biofxAssignedId', 'sourceVersion', 'sourcePath', 'exported'],
    properties,
    required: ['project', 'version', 'source'],
  });

  return schema;
};

module.exports = generateGermlimeUploadSchema;
