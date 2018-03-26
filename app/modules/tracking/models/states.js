"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('tracking_state', {
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
    analysis_id: {
      type: Sq.INTEGER,
      references: {
        model: 'pog_analysis',
        key: 'id',
      }
    },
    group_id: {
      type: Sq.INTEGER,
      references: {
        model: 'userGroups',
        key: 'id'
      }
    },
    name: {
      type: Sq.STRING,
      allowNull: false
    },
    slug: {
      type: Sq.STRING,
      allowNull: false,
      validate: {
        is: {
          args: /^[A-z0-9-_]*$/,
          msg: 'The state slug name has invalid characters'
        },
        len: {
          args: [3,20],
          msg: 'The state slug name must be between 3 and 20 characters'
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
    status: {
      type: Sq.STRING
    },
    createdBy_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      }
    },
    startedAt: {
      type: Sq.DATE,
      allowNull: true
    },
    completedAt: {
      type: Sq.DATE,
      allowNull: true
    },
    jira: {
      type: Sq.JSONB,
      allowNull: true
    }
  },
  {
    tableName: 'pog_tracking_states',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['deletedAt']
        },
        include: [
          {as: 'analysis', model: sequelize.models.pog_analysis.scope('public')},
          {
            as: 'tasks',
            model: sequelize.models.tracking_state_task,
            order: [['ordinal','ASC']],
            include: [
              {as: 'assignedTo', model: sequelize.models.user.scope('public')},
              {as: 'checkins', model: sequelize.models.tracking_state_task_checkin, include:[{as: 'user', model: sequelize.models.user.scope('public')}], attributes: {exclude: ['id', 'task_id', 'deletedAt', 'user_id']}}
            ] // end tasks include
          } // end state tasks include
        ],
        order: [
          ['ordinal', 'ASC']
        ]
      },
      noTasks: {
        attributes: {
          exclude: ['deletedAt']
        },
        include: [
          {as: 'analysis', model: sequelize.models.pog_analysis.scope('public')},
        ],
        order: [
          ['ordinal', 'ASC']
        ]
      }
    }
  });
};

