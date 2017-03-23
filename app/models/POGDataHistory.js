"use strict";

module.exports = (sequelize, Sq) => {
  let POGDataHistory = sequelize.define('POGDataHistory', {
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
      pog_id: {
        type: Sq.INTEGER,
        unique: false,
        references: {
          model: 'POGs',
          key: 'id',
        }
      },
      type: {
        type: Sq.ENUM('change', 'remove', 'tag', 'create'),
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
      createdAt: 'createdAt',
      updatedAt: false,
    });
    
  return POGDataHistory;
};

