const db = require('../../models');
const schemaGenerator = require('../schemaGenerator');
const {REPORT_UPDATE_BASE_URI} = require('../../constants');

const schema = schemaGenerator(db.models.hlaTypes, {baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true});

module.exports = schema;
