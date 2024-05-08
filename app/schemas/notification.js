const db = require('../models');
const schemaGenerator = require('./schemaGenerator');
const {BASE_EXCLUDE} = require('./exclude');

const passwordConditional = (required) => {
  return {
    if: {
      properties: {type: {const: 'local'}},
    },
    then: {
      required: required.concat(['password']),
    },
  };
};

// Generate user create schema
const createSchema = schemaGenerator(db.models.user, {
  baseUri: '/create', exclude: [...BASE_EXCLUDE, 'logoId', 'headerId'],
});

module.exports = {
  createSchema,
};
