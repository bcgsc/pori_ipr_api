const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = sequelize => sequelize.define('genomicEventsTherapeutic', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  reportId: {
    name: 'reportId',
    field: 'report_id',
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  reportType: {
    type: Sq.ENUM('genomic', 'probe'),
    defaultValue: 'genomic',
  },
  genomicEvent: {
    type: Sq.TEXT,
    allowNull: false,
  },
  approvedThisCancerType: {
    type: Sq.TEXT,
    allowNull: true,
  },
  approvedOtherCancerType: {
    type: Sq.TEXT,
    allowNull: true,
  },
  emergingPreclinicalEvidence: {
    type: Sq.TEXT,
    allowNull: true,
  },
  comments: {
    type: Sq.TEXT,
    allowNull: true,
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_analysis_reports_summary_genomic_events_therapeutic',
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'pog_id', 'reportId', 'deletedAt'],
      },
    },
  },
});
