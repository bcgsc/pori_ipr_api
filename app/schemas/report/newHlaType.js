const db = require('../../models');
const schemaGenerator = require('./basicReportComponentSchemaGenerator');

module.exports = schemaGenerator(db.models.hlaTypes);
