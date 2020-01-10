const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('genomicAlterationsIdentified', {
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
  geneVariant: {
    type: Sq.TEXT,
    allowNull: false,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_summary_genomic_alterations_identified',
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'pog_id', 'report_id', '"deletedAt"'],
      },
    },
  },
});
