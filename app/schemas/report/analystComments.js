const schemaGenerator = require('../schemaGenerator');
const db = require('../../models');

module.exports = schemaGenerator(db.models.analystComments);
