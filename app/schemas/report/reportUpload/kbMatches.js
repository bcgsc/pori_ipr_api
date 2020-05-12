const db = require('../../../models');
const {generateReportSubSchema} = require('./util');

module.exports = generateReportSubSchema(
  db.models.kbMatches,
  {
    exclude: ['variantId'],
    properties: {
      variant: {
        type: 'string', description: 'the variant key linking this to one of the variant records',
      },
    },
    required: ['variant'],
  }
);
