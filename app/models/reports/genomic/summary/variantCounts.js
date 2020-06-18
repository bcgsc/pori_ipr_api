const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  const variantCounts = sequelize.define('variantCounts', {
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
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_summary_variant_counts',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });

  // set instance methods
  variantCounts.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return variantCounts;
};
