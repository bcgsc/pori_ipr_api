const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('pathwayAnalysis', {
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
    original: {
      type: Sq.TEXT,
      allowNull: true,
    },
    pathway: {
      type: Sq.TEXT,
      allowNull: true,
    },
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_summary_pathway_analysis',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });
};
