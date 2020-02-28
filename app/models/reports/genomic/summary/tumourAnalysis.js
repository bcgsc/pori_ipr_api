const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('tumourAnalysis', {
    ...DEFAULT_COLUMNS,
    report_id: {
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
    mutationSignature: {
      type: Sq.JSONB,
      defaultValue: [],
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_summary_tumour_analysis',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'report_id', 'deletedAt'],
        },
      },
    },
  });
};
