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

Object.assign(createSchema, passwordConditional(createSchema.required));

// Generate user update schema
const updateSchema = schemaGenerator(db.models.user, {
  baseUri: '/update', exclude: [...BASE_EXCLUDE, 'logoId', 'headerId'], nothingRequired: true,
});

const notificationUpdateSchema = schemaGenerator(db.models.user, {
  baseUri: '/update', exclude: [...BASE_EXCLUDE, 'logoId', 'headerId', 'firstName', 'email', 'lastName', 'username'], required: ['allowNotifications'],
});

module.exports = {
  createSchema,
  updateSchema,
  notificationUpdateSchema,
};
