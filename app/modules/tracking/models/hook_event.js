"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('tracking_hook_event', {
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
      hook_id: {
        type: Sq.INTEGER,
        allowNull: false,
        references: {
          model: 'pog_tracking_hooks',
          key: 'id',
        }
      },
      state_id: {
        type: Sq.INTEGER,
        allowNull: false,
        references: {
          model: 'pog_tracking_states',
          key: 'id',
        }
      },
      task_id: {
        type: Sq.INTEGER,
        allowNull: true,
        references: {
          model: 'pog_tracking_state_tasks',
          key: 'id',
        }
      },
      log: {
        type: Sq.TEXT,
        allowNull: false
      },
      status: {
        type: Sq.STRING,
        allowNull: false
      }
    },
    {
      tableName: 'pog_tracking_hook_events',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      scopes: {
        public: {
          order:  [['ordinal', 'ASC']],
          attributes: {
            exclude: ['deletedAt', 'id', 'hook_id']
          },
          include: [
            { as: 'hook', model: sequelize.models.tracking_hook.scope('public') }
          ]
        }
      }
    });
};

