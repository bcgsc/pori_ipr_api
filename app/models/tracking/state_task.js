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
      allowNull: false,
    },
    slug: {
      type: Sq.STRING,
      allowNull: false,
      validate: {
        is: {
          args: ["^[A-z0-9_-]+$", 'i'],
          msg: 'Only alphanumeric and underscores are allowed in the task slug'
        },
        len: {
          args: [3,50],
          msg: 'Task slug must be between 3 and 50 characters long'
        }
      }
    },
    description: {
      type: Sq.TEXT,
      allowNull: true
    },
    ordinal: {
      type: Sq.INTEGER,
      allowNull: false
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
      defaultValue: null,
      validate: {
        isIn: {
          args: [['pending', 'active', 'complete', 'pause', 'blocked']],
          msg: 'The specified task status is not valid. Allowed values: pending, active, complete, pause, blocked'
        }
      }
    },
    outcomeType: {
      type: Sq.STRING,
      allowNull: false,
      defaultValue: 'text'
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
        order:  'ordinal ASC',
        attributes: {
          exclude: ['deletedAt', 'id', 'analysis_id', 'assignedTo_id', 'state_id']
        },
        include: [
          { as: 'assignedTo', model: sequelize.models.user.scope('public') }
        ]
      }
    }
  });
};

