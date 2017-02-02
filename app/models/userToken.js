"use strict";

module.exports = (sequelize, Sq) => {
  let userToken = sequelize.define('userToken', {
      id: {
        type: Sq.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sq.INTEGER,
        references: {
          model: 'users',
          key: 'id',
        }
      },
      token: {
        type: Sq.UUID,
        unique: true,
        defaultValue: Sq.UUIDV4
      },
      userAgent: {
        type: Sq.STRING,
        allowNull: false
      },
      expiresAt: {
        type: Sq.DATE,
        allowNull: false,
      },
    }, {
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Do not use soft-deletes - destroy the tokens!
      paranoid: false,
    });
    
  return userToken;
};

