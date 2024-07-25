const {models: {report, reportUser}} = require('../../../models');

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
    keyVariant: {
      type: 'string',
    },
    matchingThreshold: {
      type: 'string',
    },
  },
  required: [],
  additionalProperties: false,
};
