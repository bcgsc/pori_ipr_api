module.exports = (sequelize, Sq) => sequelize.define('userToken', {
  id: {
    type: Sq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  token: {
    type: Sq.UUID,
    unique: true,
    defaultValue: Sq.UUIDV4,
  },
  userAgent: {
    type: Sq.STRING,
    allowNull: false,
  },
  expiresAt: {
    type: Sq.DATE,
    allowNull: false,
  },
  permanentToken: {
    type: Sq.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
},
{
  // Automatically create createdAt, updatedAt, deletedAt
  timestamps: true,
  // Do not use soft-deletes - destroy the tokens!
  paranoid: false,
});
