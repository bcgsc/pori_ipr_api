const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});



module.exports = {};
