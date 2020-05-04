const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('mutationSummary', {
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
    mutationSignature: {
      type: Sq.JSONB,
      defaultValue: [],
    },
    totalSNV: {
      type: Sq.TEXT,
    },
    totalIndel: {
      type: Sq.TEXT,
    },
    totalSV: {
      type: Sq.TEXT,
    },
    snvPercentileTCGA: {
      type: Sq.INTEGER,
    },
    snvPercentileDisease: {
      type: Sq.TEXT,
    },
    indelPercentileTCGA: {
      type: Sq.INTEGER,
    },
    indelPercentileDisease: {
      type: Sq.TEXT,
    },
    svPercentilePOG: {
      type: Sq.INTEGER,
    },
    snvPercentileTCGACategory: {
      type: Sq.TEXT,
    },
    snvPercentileDiseaseCategory: {
      type: Sq.TEXT,
    },
    indelPercentileTCGACategory: {
      type: Sq.TEXT,
    },
    indelPercentileDiseaseCategory: {
      type: Sq.TEXT,
    },
    svPercentilePOGCategory: {
      type: Sq.TEXT,
    },
    snvReportCategory: {
      type: Sq.TEXT,
    },
    indelReportCategory: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_summary_mutation_summary',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });
};
