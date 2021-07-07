const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../base');

module.exports = (sequelize, Sq) => {
  const probeTestInformation = sequelize.define('probe_test_information', {
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
    kbVersion: {
      type: Sq.TEXT,
      allowNull: false,
    },
    snpProbe: {
      type: Sq.TEXT,
      allowNull: false,
    },
    snpGenes: {
      type: Sq.TEXT,
      allowNull: false,
    },
    snpVars: {
      type: Sq.TEXT,
      allowNull: false,
    },
    fusionProbe: {
      type: Sq.TEXT,
      allowNull: false,
    },
    fusionGenes: {
      type: Sq.TEXT,
      allowNull: false,
    },
    fusionVars: {
      type: Sq.TEXT,
      allowNull: false,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_probe_test_information',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
    },
  });

  // set instance methods
  probeTestInformation.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return probeTestInformation;
};
