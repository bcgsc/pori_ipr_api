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
        attributes: {
          exclude: ['deletedAt', 'id', 'analysis_id', 'assignedTo_id']
        },
      }
    }
  });
};

