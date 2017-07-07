"use strict";

let User = require('./user');

module.exports = (sequelize, Sq) => {
  return sequelize.define('userGroup', {
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
    name: {
      type: Sq.STRING,
      allowNull: false,
    },
    owner_id: {
      type: Sq.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      }
    }
  },
  {
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        order: [['ordinal', 'ASC']],
        attributes: {
          exclude: ['deletedAt', 'id', 'owner_id']
        },
        include: [
          {as: 'owner', model: sequelize.models.user.scope('public')}
        ]
      }
    }
  });
};

