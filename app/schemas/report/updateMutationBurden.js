const schemaGenerator = require('./basicReportComponentSchemaGenerator');
const db = require('../../models');

const schema = schemaGenerator(db.models.mutationBurden);
schema.required = [];
module.exports = schema;
