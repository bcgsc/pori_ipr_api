const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('history_tag', {
  id: {
    type: Sq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ident: {
    type: Sq.UUID,
    unique: true,
    defaultValue: Sq.UUIDV4,
  },
  pog_id: {
    type: Sq.INTEGER,
    unique: false,
    references: {
      model: 'POGs',
      key: 'id',
    },
  },
  report_id: {
    type: Sq.INTEGER,
    unique: false,
    references: {
      model: 'pog_analysis_reports',
      key: 'id',
    },
  },
  user_id: {
    type: Sq.INTEGER,
    unique: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  tag: {
    type: Sq.STRING,
    allowNull: false,
  },
  history_id: {
    type: Sq.INTEGER,
    unique: false,
    references: {
      model: 'pog_analysis_reports_histories',
      key: 'id',
    },
  },
}, {
  tableName: 'pog_analysis_reports_history_tags',
  // Automatically create createdAt
  createdAt: 'createdAt',
  updatedAt: false,
});
