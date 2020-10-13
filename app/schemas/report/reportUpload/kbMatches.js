const db = require('../../../models');
const schemaGenerator = require('../../schemaGenerator');
const {REPORT_EXCLUDE} = require('../../exclude');

module.exports = (jsonSchema) => {
  return schemaGenerator(db.models.kbMatches, {
    jsonSchema,
    properties: {
      variant: {
        type: 'string', description: 'the variant key linking this to one of the variant records',
      },
    },
    isSubSchema: true,
    exclude: [...REPORT_EXCLUDE, 'variantId'],
    required: ['variant'],
  });
};
