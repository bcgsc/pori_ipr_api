"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('notification', {
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
      type: Sq.STRING,
      allowNull: true
    },
    source: {
      type: Sq.STRING,
      allowNull: false
    },
    user_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      }
    },
    email: {
      type: Sq.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    socket: {
      type: Sq.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    hipchat: {
      type: Sq.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    browser: {
      type: Sq.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    payload: {
      type: Sq.JSONB
    },
    viewed: {
      type: Sq.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    handled: {
      type: Sq.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    tableName: 'notifications',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['deletedAt', 'updatedAt', 'id']
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'user'}
        ],
        order: [
          ['createdAt','ASC']
        ]
      }
    }
  });
};

