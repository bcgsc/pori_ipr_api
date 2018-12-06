const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('kb_history', {
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
  type: {
    type: Sq.ENUM('change', 'remove', 'create', 'status'),
    defaultValue: 'change',
  },
  table: {
    type: Sq.STRING,
    unique: false,
  },
  model: {
    type: Sq.STRING,
    unique: false,
  },
  entry: {
    type: Sq.STRING,
    unique: false,
  },
  previous: {
    type: Sq.TEXT,
    unique: false,
  },
  new: {
    type: Sq.TEXT,
    unique: false,
  },
  user_id: {
    type: Sq.INTEGER,
    unique: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  comment: {
    type: Sq.TEXT,
    allowNull: true,
  },
}, {
  // Automatically create createdAt, updatedAt, deletedAt
  createdAt: 'createdAt',
  // Don't create updatedAt
  updatedAt: false,
});
