"use strict";

const moment = require('moment');

module.exports = (sequelize, Sq) => {
  return sequelize.define('POGDataExport', {
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
    key: {
      type: Sq.STRING,
      unique: true,
      defaultValue: () => {
        return moment().format('YYYYMMDD-hmmssSS');
      }
    },
    log: {
      type: Sq.TEXT
    },
    result: {
      type: Sq.BOOLEAN,
      defaultValue: false
    }
  }, {
    // Automatically create createdAt
    createdAt: 'createdAt',
    updatedAt: false,
  });
};

