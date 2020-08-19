const db = require('../../models');
const schemaGenerator = require('../schemaGenerator');

const schema = schemaGenerator(db.models.hlaTypes, {nothingRequired: true});

module.exports = schema;
