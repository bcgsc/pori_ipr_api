const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('summary_microbial', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    species: {
      type: Sq.TEXT,
    },
    integrationSite: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_summary_microbial',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });
};
