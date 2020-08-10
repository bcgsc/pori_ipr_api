const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  const genomicAlterations = sequelize.define('genomicAlterationsIdentified', {
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
    geneVariant: {
      type: Sq.TEXT,
      allowNull: false,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_summary_genomic_alterations_identified',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });

  // set instance methods
  genomicAlterations.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return genomicAlterations;
};
