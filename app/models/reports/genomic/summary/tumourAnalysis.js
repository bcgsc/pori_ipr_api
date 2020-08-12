const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  const tumourAnalysis = sequelize.define('tumourAnalysis', {
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
    tumourContent: {
      type: Sq.INTEGER,
      allowNull: false,
    },
    ploidy: {
      type: Sq.TEXT,
      allowNull: false,
    },
    normalExpressionComparator: {
      type: Sq.TEXT,
    },
    diseaseExpressionComparator: {
      type: Sq.TEXT,
    },
    subtyping: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    tcgaColor: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_summary_tumour_analysis',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });

  // set instance methods
  tumourAnalysis.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return tumourAnalysis;
};
