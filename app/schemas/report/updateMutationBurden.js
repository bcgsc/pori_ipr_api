const schemaGenerator = require('../schemaGenerator');
const db = require('../../models');

const schema = schemaGenerator(db.models.mutationBurden, {nothingRequired: true});
module.exports = schema;
