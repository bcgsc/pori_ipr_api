const db = require('../../../models');
const schemaGenerator = require('../../schemaGenerator');
const {REPORT_EXCLUDE} = require('../../exclude');

module.exports = (isJsonSchema) => {
  return schemaGenerator(db.models.kbMatches, {
    isJsonSchema,
    properties: {
      variant: {
        type: 'string', description: 'the variant key linking this to one of the variant records',
      },
      category: {type: 'string', description: 'legacy kbMatch loading'},
      approvedTherapy: {type: 'boolean', description: 'legacy kbMatch loading'},
      disease: {type: 'string', description: 'legacy kbMatch loading'},
      relevance: {type: 'string', description: 'legacy kbMatch loading'},
      context: {type: 'string', description: 'legacy kbMatch loading'},
      status: {type: 'string', description: 'legacy kbMatch loading'},
      reference: {type: 'string', description: 'legacy kbMatch loading'},
      sample: {type: 'string', description: 'legacy kbMatch loading'},
      evidenceLevel: {type: 'string', description: 'legacy kbMatch loading'},
      iprEvidenceLevel: {type: 'string', description: 'legacy kbMatch loading'},
      matchedCancer: {type: 'string', description: 'legacy kbMatch loading'},
      pmidRef: {type: 'string', description: 'legacy kbMatch loading'},
      kbStatementId: {type: 'string', description: 'legacy kbMatch loading'},
      kbData: {type: 'object', description: 'legacy kbMatch loading'},
      externalSource: {type: 'string', description: 'legacy kbMatch loading'},
      externalStatementId: {type: 'string', description: 'legacy kbMatch loading'},
      reviewStatus: {type: 'string', description: 'legacy kbMatch loading'},
    },
    isSubSchema: true,
    exclude: [...REPORT_EXCLUDE, 'variantId'],
    required: ['variant'],
  });
};
