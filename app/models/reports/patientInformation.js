const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const patientInformation = sequelize.define('patientInformation', {
    ...DEFAULT_COLUMNS,
    physician: {
      type: Sq.STRING,
      allowNull: false,
    },
    gender: {
      type: Sq.STRING,
      allowNull: true,
    },
    age: {
      type: Sq.STRING,
    },
    caseType: {
      type: Sq.STRING,
      allowNull: false,
    },
    diagnosis: {
      type: Sq.STRING,
    },
    reportDate: {
      type: Sq.STRING,
    },
    biopsySite: {
      type: Sq.STRING,
    },
    tumourSample: {
      type: Sq.STRING,
    },
    tumourProtocol: {
      type: Sq.STRING,
    },
    constitutionalSample: {
      type: Sq.STRING,
    },
    constitutionalProtocol: {
      type: Sq.STRING,
    },
    internalPancancerCohort: {
      type: Sq.TEXT,
      field: 'internal_pancancer_cohort',
    },
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      allowNull: false,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_patient_information',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
    },
  });

  // set instance methods
  patientInformation.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return patientInformation;
};
