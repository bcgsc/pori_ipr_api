const db = require('../../models');
const schemaGenerator = require('../schemaGenerator');

module.exports = schemaGenerator(db.models.hlaTypes);
