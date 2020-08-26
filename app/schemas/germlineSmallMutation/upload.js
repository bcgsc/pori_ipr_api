/**
 * Schema for the germline report upload
 */
const db = require('../../models');
const schemaGenerator = require('../schemaGenerator');
const {BASE_EXCLUDE, GERMLINE_EXCLUDE} = require('../exclude');

const baseUri = '/germline/upload';

// Generate variants schema
const variantSchema = schemaGenerator(db.models.germline_small_mutation_variant, {
  baseUri, exclude: GERMLINE_EXCLUDE,
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
  baseUri, exclude: [...BASE_EXCLUDE, 'biofx_assigned_id'], properties,
});

module.exports = schema;
