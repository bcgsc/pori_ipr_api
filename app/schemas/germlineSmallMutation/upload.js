/**
 * Schema for the germline report upload
 */
const db = require('../../models');
const schemaGenerator = require('../schemaGenerator');
const {BASE_EXCLUDE, GERMLINE_EXCLUDE} = require('../exclude');
const {UPLOAD_BASE_URI} = require('../../constants');

// Generate variants schema
const generateGermlimeUploadSchema = (isJsonSchema = true) => {
  const variantSchema = schemaGenerator(db.models.germline_small_mutation_variant, {
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
    path: {
      type: 'string',
    }
  };

  // Generate schema
  const schema = schemaGenerator(db.models.germline_small_mutation, {
    isJsonSchema, baseUri: UPLOAD_BASE_URI, exclude: [...BASE_EXCLUDE, 'biofx_assigned_id', 'source_version', 'source_path', 'exported'], properties,
  });

  return schema;
};

module.exports = generateGermlimeUploadSchema;
