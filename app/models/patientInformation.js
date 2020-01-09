const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('./base');

module.exports = sequelize => sequelize.define('patientInformation', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
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
  POGID: {
    type: Sq.STRING,
  },
  caseType: {
    type: Sq.STRING,
    allowNull: false,
  },
  tumourType: {
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
  report_id: {
    type: Sq.INTEGER,
    allowNull: false,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
}, {
  ...DEFAULT_OPTIONS,
  // Table Name
  tableName: 'pog_patient_information',
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'report_id', 'pog_id']},
    },
  },
});
