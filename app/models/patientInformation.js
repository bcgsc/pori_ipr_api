const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('patientInformation', {
  id: {
    type: Sq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ident: {
    type: Sq.UUID,
    unique: false,
    defaultValue: Sq.UUIDV4,
  },
  dataVersion: {
    type: Sq.INTEGER,
    defaultValue: 0,
  },
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
  pog_report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
}, {
  // Table Name
  tableName: 'pog_patient_information',
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Use soft-deletes!
  paranoid: true,
  scopes: {
    public: {
      attributes: {exclude: ['id', 'deletedAt', 'pog_report_id', 'pog_id']},
    },
  },
});
