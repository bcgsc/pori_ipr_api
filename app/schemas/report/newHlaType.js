const db = require('../../models');
const schemaGenerator = require('../schemaGenerator');
const {REPORT_CREATE_BASE_URI} = require('../../constants');

module.exports = schemaGenerator(db.models.hlaTypes, {baseUri: REPORT_CREATE_BASE_URI});
