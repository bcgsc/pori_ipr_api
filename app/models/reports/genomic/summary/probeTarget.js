const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('probeTarget', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  pog_report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  gene: {
    type: Sq.TEXT,
    allowNull: false,
  },
  variant: {
    type: Sq.TEXT,
    allowNull: false,
  },
  sample: {
    type: Sq.TEXT,
    allowNull: false,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_summary_probe_target',
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'pog_id', 'pog_report_id', 'deletedAt'],
      },
    },
  },
});
