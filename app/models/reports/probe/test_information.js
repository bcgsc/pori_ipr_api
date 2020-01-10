const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('probe_test_information', {
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
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
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
},
{
  // Table Name
  tableName: 'pog_analysis_reports_probe_test_information',
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  paranoid: true,
  scopes: {
    public: {
      attributes: {exclude: ['id', 'report_id', 'pog_id', 'deletedAt']},
    },
  },
});
