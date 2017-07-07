"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('tracking_state_task_checkin', {
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
      task_id: {
        type: Sq.INTEGER,
        references: {
          model: 'pog_tracking_state_tasks',
          key: 'id',
        }
      },
      outcome: {
        type: Sq.TEXT,
        allowNull: true,
      },
      user_id: {
        type: Sq.INTEGER,
        references: {
          model: 'users',
          key: 'id',
        }
      }
    },
    {
      tableName: 'pog_tracking_state_task_checkins',
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          order:  [['createdAt', 'ASC']],
          attributes: {
            exclude: ['deletedAt', 'id', 'task_id', 'user_id']
          },
          include: [
            { as: 'user', model: sequelize.models.user.scope('public') }
          ]
        }
      }
    });
};

