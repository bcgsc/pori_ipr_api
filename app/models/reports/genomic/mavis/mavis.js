const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('mavis', {
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
  product_id: {
    type: Sq.TEXT,
    allowNull: false,
  },
  report_id: {
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  summary: {
    type: Sq.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  // Table Name
  tableName: 'pog_analysis_reports_mavis_summary',
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Use soft-deletes!
  paranoid: true,
});
