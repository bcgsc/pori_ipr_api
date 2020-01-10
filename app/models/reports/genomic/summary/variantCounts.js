const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('variantCounts', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
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
  // Table Name
  tableName: 'pog_analysis_reports_summary_variant_counts',
});
