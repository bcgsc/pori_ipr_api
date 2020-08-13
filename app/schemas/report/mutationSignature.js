const schemaGenerator = require('./basicReportComponentSchemaGenerator');
const db = require('../../models');

module.exports = schemaGenerator(db.models.mutationSignature);
