"use strict";

module.exports = (sequelize, Sq) => {
  let POG = sequelize.define('dataHistory', {
      id: {
        type: Sq.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      ident: {
        type: Sq.UUID,
        unique: true,
        defaultValue: Sq.UUIDV4
      },
      user: {
        type: Sq.INTEGER,
        unique: false,
        references: {
          model: 'users',
          key: 'id',
        }
      },
      note: {
        type: Sq.TEXT,
        allowNull: false,
      }
    }, {
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });
    
  return POG;
};

