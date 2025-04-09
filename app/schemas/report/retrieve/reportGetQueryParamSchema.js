const {models: {report, reportUser, kbMatches}} = require('../../../models');

module.exports = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: '/reports/get/params/report.json',
  title: 'Report GET params',
  type: 'object',
  properties: {
    paginated: {
      type: 'boolean',
    },
    limit: {
      type: 'integer',
    },
    offset: {
      type: 'integer',
    },
    sort: {
      type: 'array',
      items: {
        type: 'array',
        items: {
          anyOf: [
            {
              type: 'object',
            },
            {
              type: 'string',
              enum: [
                'asc', 'desc', 'patientId', 'biopsyName', 'state',
                'alternateIdentifier', 'diagnosis', 'physician', 'caseType',
              ],
            },
          ],
        },
      },
    },
    project: {
      type: 'string',
    },
    states: {
      type: 'array',
      items: {
        type: 'string',
        enum: report.rawAttributes.state.values,
      },
    },
    role: {
      type: 'string',
      enum: reportUser.rawAttributes.role.values,
    },
    searchText: {
      type: 'string',
    },
    searchParams: {
      type: 'string',
    },
    category: {
      type: 'string',
    },
    approvedTherapy: {
      type: 'boolean',
    },
    disease: {
      type: 'string',
    },
    relevance: {
      type: 'string',
    },
    context: {
      type: 'string',
    },
    status: {
      type: 'string',
    },
    reference: {
      type: 'string',
    },
    sample: {
      type: 'string',
    },
    evidenceLevel: {
      type: 'string',
    },
    matchedCancer: {
      type: 'boolean',
    },
    pmidRef: {
      type: 'string',
    },
    variantType: {
      type: 'string',
      enum: kbMatches.rawAttributes.variantType.values,
    },
  },
  required: [],
  additionalProperties: false,
};
