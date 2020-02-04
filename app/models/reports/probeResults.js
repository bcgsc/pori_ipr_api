const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('probeResults', {
    ...DEFAULT_COLUMNS,
    report_id: {
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
    tableName: 'pog_analysis_reports_probe_results',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'pog_id', 'report_id', 'deletedAt'],
        },
      },
    },
  });
};
