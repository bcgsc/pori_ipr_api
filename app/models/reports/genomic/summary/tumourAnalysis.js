const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('tumourAnalysis', {
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
    allowNull: true,
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
  // Table Name
  tableName: 'pog_analysis_reports_summary_tumour_analysis',
  scopes: {
    public: {
      attributes: {
        exclude: ['deletedAt', 'report_id', 'id', 'pog_id'],
      },
    },
  },
});
