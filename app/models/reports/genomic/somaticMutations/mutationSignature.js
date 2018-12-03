const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('mutationSignature', {
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
  pog_report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  signature: {
    type: Sq.INTEGER,
  },
  pearson: {
    type: Sq.FLOAT,
  },
  nnls: {
    type: Sq.FLOAT,
  },
  associations: {
    type: Sq.TEXT,
  },
  features: {
    type: Sq.TEXT,
  },
  numCancerTypes: {
    type: Sq.INTEGER,
  },
  cancerTypes: {
    type: Sq.TEXT,
  },
}, {
  // Table Name
  tableName: 'pog_analysis_reports_somatic_mutations_mutation_signature',
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
