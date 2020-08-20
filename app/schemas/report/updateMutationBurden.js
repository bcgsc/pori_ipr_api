const schemaGenerator = require('../schemaGenerator');
const db = require('../../models');
const {REPORT_UPDATE_BASE_URI} = require('../../constants');

const schema = schemaGenerator(db.models.mutationBurden, {baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true});
module.exports = schema;
