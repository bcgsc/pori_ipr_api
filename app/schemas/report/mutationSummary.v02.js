// const {JsonSchemaManager, JsonSchema7Strategy} = require('@alt3/sequelize-to-json-schemas');
// const db = require('../../models');
// const {REPORT_EXCLUDE} = require('../exclude');
// const schemaConfig = require('../../../config/schema');

// const schemaManager = new JsonSchemaManager();

// const schema = schemaManager.generate(db.models.mutationSummaryv2, new JsonSchema7Strategy(), {
//   exclude: REPORT_EXCLUDE,
//   associations: false,
// });

// schema.$schema = schemaConfig.version;

// module.exports = schema;

const schemaGenerator = require('./basicReportSchemaGenerator');
const db = require('../../models');

module.exports = schemaGenerator(db.models.mutationSummaryv2);
