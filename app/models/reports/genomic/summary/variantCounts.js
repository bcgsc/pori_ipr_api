const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('variantCounts', {
    ...DEFAULT_COLUMNS,
    report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    smallMutations: {
      type: Sq.INTEGER,
      allowNull: false,
    },
    CNVs: {
      type: Sq.INTEGER,
      allowNull: false,
    },
    SVs: {
      type: Sq.INTEGER,
      allowNull: false,
    },
    expressionOutliers: {
      type: Sq.INTEGER,
      allowNull: false,
    },
    variantsUnknown: {
      type: Sq.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_summary_variant_counts',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'report_id', 'deletedAt'],
        },
      },
    },
  });
};
