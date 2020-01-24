const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('mutationSummaryv2', {
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
  comparator: {
    type: Sq.TEXT,
    defaultValue: null,
  },
  snv: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  snv_truncating: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  indels: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  indels_frameshift: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  sv: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  sv_expressed: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  snv_percentile: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  indel_percentile: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
  sv_percentile: {
    type: Sq.INTEGER,
    defaultValue: null,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_summary_mutation',
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'pog_id', 'report_id', 'deletedAt'],
      },
    },
  },
});
