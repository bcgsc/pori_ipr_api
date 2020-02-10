const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('imageData', {
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
  reportId: {
    field: 'report_id',
    type: Sq.INTEGER,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  format: {
    type: Sq.ENUM('PNG', 'JPG'),
    defaultValue: 'PNG',
  },
  filename: {
    type: Sq.TEXT,
    allowNull: false,
  },
  key: {
    type: Sq.TEXT,
    allowNull: false,
  },
  data: {
    type: Sq.TEXT,
    allowNull: false,
  },
},
{
  // Table Name
  tableName: 'pog_analysis_reports_image_data',
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
});
