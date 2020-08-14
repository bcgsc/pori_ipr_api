const db = require('../../models');
const schemaGenerator = require('./basicReportComponentSchemaGenerator');

const schema = schemaGenerator(db.models.hlaTypes);
schema.required = [];
schema.$id = '/updateHlaTypes.json';

module.exports = schema;
