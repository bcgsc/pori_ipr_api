const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('pog_project', {
  id: {
    type: Sq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  pog_id: {
    type: Sq.INTEGER,
    unique: false,
    allowNull: false,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  project_id: {
    type: Sq.INTEGER,
    unique: false,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id',
    },
  },
},
{
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Use soft-deletes!
  paranoid: true,
});
