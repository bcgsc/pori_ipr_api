"use strict";

module.exports = (sequelize, Sq) => {
  let POGDataHistoryTag = sequelize.define('POGDataHistoryTag', {
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
    user_id: {
      type: Sq.INTEGER,
      unique: false,
      references: {
        model: 'users',
        key: 'id',
      }
    },
    tag: {
      type: Sq.STRING,
      allowNull: false
    },
    history_id: {
      type: Sq.INTEGER,
      unique: false,
      references: {
        model: 'POGDataHistories',
        key: 'id',
      }
    },
  }, {
    // Automatically create createdAt
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return POGDataHistoryTag;
};

