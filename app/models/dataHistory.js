"use strict";

module.exports = (sequelize, Sq) => {
  let dataHistory = sequelize.define('dataHistory', {
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
      type: {
        type: Sq.ENUM('change', 'version', 'tag'),
        defaultValue: 'change',
      },
      table: {
        type: Sq.STRING,
        unique: false,
      },
      entry: {
        type: Sq.STRING,
        unique: false,
      },
      previous: {
        type: Sq.TEXT,
        unique: false
      },
      new: {
        type: Sq.TEXT,
        unique: false
      },
      user_id: {
        type: Sq.INTEGER,
        unique: false,
        references: {
          model: 'users',
          key: 'id',
        }
      },
      comment: {
        type: Sq.TEXT,
        allowNull: true
      }
    }, {
      // Automatically create createdAt
      createdAt: true,
      updatedAt: false,
    });
    
  return dataHistory;
};

