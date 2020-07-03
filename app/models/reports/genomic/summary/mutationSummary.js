const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  const mutationSummary = sequelize.define('mutationSummary', {
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
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_summary_mutation',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });

  // set instance methods
  mutationSummary.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return mutationSummary;
};
