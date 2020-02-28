const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('genomicEventsTherapeutic', {
    ...DEFAULT_COLUMNS,
    report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'reports',
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
    tableName: 'reports_summary_genomic_events_therapeutic',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'report_id', 'deletedAt'],
        },
      },
    },
  });
};
