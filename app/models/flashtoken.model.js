"use strict";

const moment = require('moment');

module.exports = (sequelize, Sq) => {
  return sequelize.define('flash_token', {
    id: {
      type: Sq.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    token: {
      type: Sq.UUID,
      unique: true,
      defaultValue: Sq.UUIDV4
    },
    user_id: {
      type: Sq.INTEGER,
      unique: false,
      references: {
        model: 'users',
        key: 'id',
      }
    },
    resource: {
      type: Sq.STRING
    }
  },
  {
    // Automatically create createdAt
    createdAt: 'createdAt',
    updatedAt: false,
  });
};

