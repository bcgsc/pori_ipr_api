"use strict";

module.exports = (sequelize, Sq) => {
  return sequelize.define('tracking_state_definition', {
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
      unique: true,
      validate: {
        is: {
          args: ["^[A-z0-9_-]+$", 'i'],
          msg: 'Only alphanumeric and underscores are allowed in the state slug'
        },
        len: {
          args: [3,40],
          msg: 'State slug must be between 3 and 40 characters long'
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
    tasks: {
      type: Sq.JSON,
      allowNull: true
    },
    jira: {
      type: Sq.JSON,
      allowNull: true
    },
    hidden: {
      type: Sq.BOOLEAN,
      defaultValue: false
    }
  },
  {
    tableName: 'pog_tracking_state_definitions',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        order: [['ordinal', 'ASC']],
        attributes: {
          exclude: ['deletedAt', 'group_id']
        },
        include: [
          {as: 'group', model: sequelize.models.userGroup.scope('public')}
        ]
      }
    }
  });
};

