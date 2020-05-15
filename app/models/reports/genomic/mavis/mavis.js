const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('mavis', {
    ...DEFAULT_COLUMNS,
    product_id: {
      type: Sq.TEXT,
      allowNull: false,
    },
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    summary: {
      type: Sq.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_mavis_summary',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'product_id', 'deletedAt']},
      },
    },
  });
};
