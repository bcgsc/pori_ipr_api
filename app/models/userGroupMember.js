"use strict";

module.exports = (sequelize, Sq) => {
  let userGroupMember = sequelize.define('userGroupMember', {
      user_id: {
        type: Sq.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        }
      },
      group_id: {
        type: Sq.INTEGER,
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

