const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('summary_microbial', {
  ...DEFAULT_COLUMNS,
  report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
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
  // Table Name
  tableName: 'pog_analysis_reports_summary_microbial',
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'report_id', 'deletedAt'],
      },
    },
  },
});
