/**
 * Schema for the germline report upload
 */
const db = require('../../models');
const schemaGenerator = require('../schemaGenerator');
const {BASE_EXCLUDE, GERMLINE_EXCLUDE} = require('../exclude');
const {UPLOAD_BASE_URI} = require('../../constants');

// Generate variants schema
const variantSchema = schemaGenerator(db.models.germline_small_mutation_variant, {
  baseUri: UPLOAD_BASE_URI, exclude: GERMLINE_EXCLUDE,
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
};

// Generate schema
const schema = schemaGenerator(db.models.germline_small_mutation, {
  baseUri: UPLOAD_BASE_URI, exclude: [...BASE_EXCLUDE, 'biofx_assigned_id'], properties,
});

module.exports = schema;
