"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('tracking_state_task', {
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
    state_id: {
      type: Sq.INTEGER,
      references: {
        model: 'pog_tracking_states',
        key: 'id',
      }
    },
    name: {
      type: Sq.STRING,
      allowNull: false
    },
    description: {
      type: Sq.TEXT,
      allowNull: true
    },
    assignedTo_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        keys: 'id'
      }
    },
    status: {
      type: Sq.STRING,
      defaultValue: null
    },
    outcome: {
      type: Sq.JSONB,
      allowNull: true
    },
    triggeredBy: {
      type: Sq.STRING,
      defaultValue: null,
      allowNull: true
    },
    checkIns: {
      type: Sq.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    checkInsTarget: {
      type: Sq.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    startedAt: {
      type: Sq.DATE
    },
    completedAt: {
      type: Sq.DATE
    }
  },
  {
    tableName: 'pog_tracking_state_tasks',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['deletedAt', 'id', 'analysis_id', 'assignedTo_id']
        },
      }
    }
  });
};

