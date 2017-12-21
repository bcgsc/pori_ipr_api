"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('tracking_hook', {
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
      enabled: {
        type: Sq.BOOLEAN,
        defaultValue: true
      },
      state_name: {
        type: Sq.STRING,
        allowNull: false,
      },
      task_name: {
        type: Sq.STRING,
        allowNull: true,
      },
      status: {
        type: Sq.STRING,
        allowNull: false
      },
      name: {
        type: Sq.STRING,
        allowNull: false,
      },
      action: {
        type: Sq.STRING,
        allowNull: false,
      },
      target: {
        type: Sq.JSONB,
        allowNull: false,
      },
      payload: {
        type: Sq.JSONB,
        allowNull: true
      }
    },
    {
      tableName: 'pog_tracking_hooks',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          order:  [['name', 'ASC']],
          attributes: {
            exclude: ['deletedAt', 'id']
          }
        }
      }
    });
};

