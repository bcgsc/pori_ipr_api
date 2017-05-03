"use strict";

module.exports = (sequelize, Sq) => {
  let userGroupMember = sequelize.define('userGroupMember', {
      id: {
        type: Sq.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sq.INTEGER,
        unique: false,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        }
      },
      group_id: {
        type: Sq.INTEGER,
        unique: false,
        allowNull: false,
        references: {
          model: 'userGroups',
          key: 'id',
        }
      }
    },
    {
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
    });

  return userGroupMember;
};

