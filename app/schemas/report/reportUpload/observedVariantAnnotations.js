const db = require('../../../models');
const schemaGenerator = require('../../schemaGenerator');
const {REPORT_EXCLUDE} = require('../../exclude');

module.exports = (isJsonSchema) => {
  return schemaGenerator(db.models.observedVariantAnnotations, {
    isJsonSchema,
    properties: {
      variant: {
        type: 'string', description: 'the variant key linking this to one of the variant records',
      },
      annotations: {type: 'object', description: 'json annotations'},
    },
    isSubSchema: true,
    exclude: [...REPORT_EXCLUDE, 'variantId'],
    required: ['variant'],
  });
};
