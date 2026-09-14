const db = require('../../../models');
const schemaGenerator = require('../../schemaGenerator');
const {REPORT_EXCLUDE} = require('../../exclude');

module.exports = (isJsonSchema) => {
  return schemaGenerator(db.models.genomicAlterationsIdentified, {
    isJsonSchema,
    properties: {
      variant: {
        type: 'string', description: 'the variant key linking this to one of the variant records',
      },
    },
    isSubSchema: true,
    nothingRequired: true,
    exclude: [...REPORT_EXCLUDE, 'variantId'],
  });
};
