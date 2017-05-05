"use strict";

module.exports = (sequelize, Sq) => {
  let aclGroup = sequelize.define('userGroup', {
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
      name: {
        type: Sq.STRING,
        allowNull: false,
      },
      owner_id: {
        type: Sq.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
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

  return aclGroup;
};

